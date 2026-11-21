export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
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

    const apiUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}&hd=1`;
    const upstream = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    });

    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: `Gagal menghubungi TikWM (HTTP ${upstream.status})` });
    }

    const json = await upstream.json();
    if (json.code !== 0 || !json.data) {
      return res.status(400).json({ error: json.msg || 'Data video TikTok tidak ditemukan.' });
    }

    const d = json.data;
    return res.status(200).json({
      title: d.title || 'Video TikTok',
      cover: d.cover || '',
      author: d.author?.nickname || d.author?.unique_id || 'Kreator TikTok',
      play: d.play || '',
      hdplay: d.hdplay || d.play || '',
      music: d.music || ''
    });
  } catch (err) {
    return res.status(500).json({ error: 'Terjadi kesalahan server', detail: err.message });
  }
}
