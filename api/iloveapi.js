export const config = {
  api: {
    bodyParser: false,
  },
};

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function parseMultipart(rawBody, contentType) {
  const match = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  if (!match) return null;
  const boundary = match[1] || match[2];
  const boundaryBuf = Buffer.from(`--${boundary}`);

  let fileBuffer = null;
  let fileName = 'image.png';
  let mimeType = 'image/png';
  let tool = 'removebackgroundimage';

  let pos = 0;
  while (pos < rawBody.length) {
    const start = rawBody.indexOf(boundaryBuf, pos);
    if (start === -1) break;
    const partStart = start + boundaryBuf.length;
    const next = rawBody.indexOf(boundaryBuf, partStart);
    if (next === -1) break;
    const part = rawBody.subarray(partStart, next);
    pos = next;

    const headerEnd = part.indexOf(Buffer.from('\r\n\r\n'));
    if (headerEnd === -1) continue;
    const headersText = part.subarray(0, headerEnd).toString('utf8');
    let bodyPart = part.subarray(headerEnd + 4);
    if (bodyPart.subarray(bodyPart.length - 2).equals(Buffer.from('\r\n'))) {
      bodyPart = bodyPart.subarray(0, bodyPart.length - 2);
    }

    const nameMatch = headersText.match(/name="([^"]+)"/i);
    const fieldName = nameMatch ? nameMatch[1] : '';
    const fnMatch = headersText.match(/filename="([^"]+)"/i);

    if (fnMatch) {
      fileName = fnMatch[1];
      fileBuffer = bodyPart;
      const ctMatch = headersText.match(/Content-Type:\s*([^\r\n]+)/i);
      if (ctMatch) mimeType = ctMatch[1].trim();
    } else if (fieldName === 'tool') {
      const val = bodyPart.toString('utf8').trim();
      if (val) tool = val;
    }
  }

  return { fileBuffer, fileName, mimeType, tool };
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const publicKey = (process.env.ILOVEAPI_PUBLIC_KEY || '').trim();
    const secretKey = (process.env.ILOVEAPI_SECRET_KEY || '').trim();

    if (!publicKey || !secretKey) {
      return res.status(500).json({
        error: 'ILOVEAPI_PUBLIC_KEY / ILOVEAPI_SECRET_KEY belum diatur di Vercel',
      });
    }

    const rawBody = await readRawBody(req);
    const parsed = parseMultipart(rawBody, req.headers['content-type'] || '');
    if (!parsed || !parsed.fileBuffer || !parsed.fileBuffer.length) {
      return res.status(400).json({ error: 'File gambar tidak terbaca' });
    }

    const { fileBuffer, fileName, mimeType, tool } = parsed;

    // 1. Auth
    const authRes = await fetch('https://api.ilovepdf.com/v1/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ public_key: publicKey }),
    });
    const authText = await authRes.text();
    let authData = {};
    try { authData = JSON.parse(authText); } catch (_) {}

    if (!authRes.ok || !authData.token) {
      return res.status(502).json({
        error: 'Auth iLoveAPI gagal',
        detail: authData.error || authText.slice(0, 150),
      });
    }

    const token = authData.token;

    // 2. Start task
    const startRes = await fetch(`https://api.ilovepdf.com/v1/start/${tool}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const startText = await startRes.text();
    let startData = {};
    try { startData = JSON.parse(startText); } catch (_) {}

    if (!startRes.ok || !startData.server || !startData.task) {
      return res.status(502).json({
        error: 'Start task iLoveAPI gagal',
        detail: startData.error || startText.slice(0, 150),
      });
    }

    const { server, task } = startData;

    // 3. Upload file
    const uploadFd = new FormData();
    uploadFd.append('task', task);
    uploadFd.append('file', new Blob([fileBuffer], { type: mimeType }), fileName);

    const uploadRes = await fetch(`https://${server}/v1/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: uploadFd,
    });
    const uploadText = await uploadRes.text();
    let uploadData = {};
    try { uploadData = JSON.parse(uploadText); } catch (_) {}

    if (!uploadRes.ok || !uploadData.server_filename) {
      return res.status(502).json({
        error: 'Upload ke iLoveAPI gagal',
        detail: uploadData.error || uploadText.slice(0, 150),
      });
    }

    // 4. Process
    const processRes = await fetch(`https://${server}/v1/process`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        task,
        tool,
        files: [{ server_filename: uploadData.server_filename, filename: fileName }],
      }),
    });

    if (!processRes.ok) {
      const pErr = await processRes.text();
      return res.status(502).json({
        error: 'Proses iLoveAPI gagal',
        detail: pErr.slice(0, 150),
      });
    }

    // 5. Download hasil
    const dlRes = await fetch(`https://${server}/v1/download/${task}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!dlRes.ok) {
      const dErr = await dlRes.text();
      return res.status(502).json({
        error: 'Download hasil iLoveAPI gagal',
        detail: dErr.slice(0, 150),
      });
    }

    const outBuf = Buffer.from(await dlRes.arrayBuffer());
    const outType = dlRes.headers.get('content-type') || 'image/png';
    res.setHeader('Content-Type', outType);
    return res.status(200).send(outBuf);
  } catch (err) {
    return res.status(500).json({
      error: err?.message || 'Internal Server Error',
    });
  }
}
