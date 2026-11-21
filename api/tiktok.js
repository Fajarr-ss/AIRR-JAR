export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const apiKey = process.env.TIKWM_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'TIKWM_API_KEY belum diatur di Vercel.' });
  }

  try {
    let body = req.body;
    if (!body || typeof body === 'string') {
      const chunks = [];
      for await (const chunk of req) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      const raw = Buffer.concat(chunks).toString('utf8');
      body = raw ? JSON.parse(raw) : {};
    }

    const url = (body.url || '').trim();
    if (!url) {
      return res.status(400).json({ error: 'Link TikTok wajib diisi.' });
    }

    // Sesuaikan URL & cara kirim key sesuai dokumentasi key TikWM kamu
    const apiUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}&hd=1`;
    const upstream = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'X-Api-Key': apiKey
      }
    });

    const rawText = await upstream.text();
    let data;
    try {
      data = JSON.parse(rawText);
    } catch (_) {
      return res.status(502).json({
        error: 'Respons upstream bukan JSON valid',
        status: upstream.status,
        preview: rawText.slice(0, 200)
      });
    }

    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: data.msg || data.error || `HTTP ${upstream.status}` });
    }

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: 'Terjadi kesalahan server', detail: err.message });
  }
}
