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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const publicKey = process.env.ILOVEAPI_PUBLIC_KEY;
  const secretKey = process.env.ILOVEAPI_SECRET_KEY;
  if (!publicKey || !secretKey) {
    return res.status(500).json({ error: 'ILOVEAPI_PUBLIC_KEY / ILOVEAPI_SECRET_KEY belum diatur di Vercel' });
  }

  try {
    const contentType = req.headers['content-type'] || '';
    const match = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
    if (!match) {
      return res.status(400).json({ error: 'Multipart boundary tidak ditemukan' });
    }
    const boundary = match[1] || match[2];
    const rawBody = await readRawBody(req);

    // Ekstrak file & tool dari multipart/form-data
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

    if (!fileBuffer || !fileBuffer.length) {
      return res.status(400).json({ error: 'File gambar tidak ditemukan' });
    }

    // 1. Auth token iLoveAPI
    const authRes = await fetch('https://api.ilovepdf.com/v1/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ public_key: publicKey }),
    });
    const authData = await authRes.json();
    if (!authRes.ok || !authData.token) {
      return res.status(502).json({ error: 'Gagal auth iLoveAPI', detail: authData });
    }
    const token = authData.token;

    // 2. Start task (GET /start/{tool} atau /v1/start/{tool})
    const startRes = await fetch(`https://api.ilovepdf.com/v1/start/${tool}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const startData = await startRes.json();
    if (!startRes.ok || !startData.server || !startData.task) {
      return res.status(502).json({ error: 'Gagal start task iLoveAPI', detail: startData });
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
    const uploadData = await uploadRes.json();
    if (!uploadRes.ok || !uploadData.server_filename) {
      return res.status(502).json({ error: 'Gagal upload ke iLoveAPI', detail: uploadData });
    }

    // 4. Process task
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
      return res.status(502).json({ error: 'Gagal proses iLoveAPI', detail: pErr });
    }

    // 5. Download hasil
    const dlRes = await fetch(`https://${server}/v1/download/${task}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!dlRes.ok) {
      const dErr = await dlRes.text();
      return res.status(502).json({ error: 'Gagal download hasil iLoveAPI', detail: dErr });
    }

    const outBuf = Buffer.from(await dlRes.arrayBuffer());
    const outType = dlRes.headers.get('content-type') || 'image/png';
    res.setHeader('Content-Type', outType);
    return res.status(200).send(outBuf);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Terjadi kesalahan pada server' });
  }
}
