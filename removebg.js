async function hapusBackground() {
  const fileInput = document.getElementById('rmbgInput');
  const statusEl = document.getElementById('rmbgStatus');
  const btnEl = document.getElementById('btnHapusBg');

  if (!fileInput || !fileInput.files || !fileInput.files[0]) {
    if (typeof toast === 'function') toast('Pilih foto terlebih dahulu!');
    return;
  }

  const formData = new FormData();
  formData.append('image_file', fileInput.files[0]);
  formData.append('size', 'auto');

  btnEl.disabled = true;
  btnEl.innerText = '⏳ Memproses...';
  if (statusEl) statusEl.innerText = 'Status: Mengirim foto lewat server Vercel...';

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
    if (typeof hasilRmbgUrl !== 'undefined' && hasilRmbgUrl) {
      URL.revokeObjectURL(hasilRmbgUrl);
    }
    hasilRmbgUrl = URL.createObjectURL(blob);

    const hasilImg = document.getElementById('rmbgHasil');
    if (hasilImg) {
      hasilImg.src = hasilRmbgUrl;
      hasilImg.style.display = 'block';
    }

    const dlBtn = document.getElementById('btnDownloadRmbg');
    if (dlBtn) dlBtn.style.display = 'block';

    if (statusEl) statusEl.innerText = 'Status: Berhasil! Background terhapus ✅';
    if (typeof toast === 'function') toast('Background berhasil dihapus!');
  } catch (err) {
    if (statusEl) statusEl.innerText = `Status: Gagal (${err.message})`;
    if (typeof toast === 'function') toast(`Gagal: ${err.message}`);
  } finally {
    btnEl.disabled = false;
    btnEl.innerText = '✨ Hapus Background Sekarang';
  }
}
