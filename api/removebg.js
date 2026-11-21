async function hapusBackground() {
  const fileInput = document.getElementById('rmbgInput');
  const statusEl = document.getElementById('rmbgStatus');
  const btnEl = document.getElementById('btnHapusBg');

  if (!fileInput.files || !fileInput.files[0]) {
    toast('Pilih foto terlebih dahulu!');
    return;
  }

  const formData = new FormData();
  formData.append('image_file', fileInput.files[0]);
  formData.append('size', 'auto');

  btnEl.disabled = true;
  btnEl.innerText = '⏳ Memproses...';
  statusEl.innerText = 'Status: Mengirim foto lewat server Vercel...';

  try {
    const response = await fetch('/api/removebg', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      let errMsg = `HTTP ${response.status}`;
      try {
        const errJson = await response.json();
        errMsg = errJson.errors?.[0]?.title || errJson.error || errMsg;
      } catch (_) {}
      throw new Error(errMsg);
    }

    const blob = await response.blob();
    if (hasilRmbgUrl) URL.revokeObjectURL(hasilRmbgUrl);
    hasilRmbgUrl = URL.createObjectURL(blob);

    const hasilImg = document.getElementById('rmbgHasil');
    hasilImg.src = hasilRmbgUrl;
    hasilImg.style.display = 'block';
    document.getElementById('btnDownloadRmbg').style.display = 'block';
    statusEl.innerText = 'Status: Berhasil! Background terhapus ✅';
  } catch (err) {
    statusEl.innerText = `Status: Gagal (${err.message})`;
  } finally {
    btnEl.disabled = false;
    btnEl.innerText = '✨ Hapus Background Sekarang';
  }
}
