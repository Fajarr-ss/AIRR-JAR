xport default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const apiKey = process.env.REMOVE_BG_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'REMOVE_BG_API_KEY belum diatur di Vercel.' });
  }

  try {
    // Kumpulkan raw body stream dari request masuk
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const rawBody = Buffer.concat(chunks);

    const contentType = req.headers['content-type'];
    if (!contentType || !contentType.includes('multipart/form-data')) {
      return res.status(400).json({ error: 'Content-Type harus multipart/form-data.' });
    }

    const upstreamRes = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: {
        'X-Api-Key': apiKey,
        'Content-Type': contentType
      },
      body: rawBody
    });

    const arrayBuffer = await upstreamRes.arrayBuffer();
    const outputBuffer = Buffer.from(arrayBuffer);

    if (!upstreamRes.ok) {
      res.status(upstreamRes.status);
      res.setHeader('Content-Type', upstreamRes.headers.get('content-type') || 'application/json');
      return res.send(outputBuffer);
    }

    res.status(200);
    res.setHeader('Content-Type', upstreamRes.headers.get('content-type') || 'image/png');
    return res.send(outputBuffer);
  } catch (err) {
    return res.status(500).json({ error: 'Gagal memproses ke Remove.bg', detail: err.message });
  }
}
