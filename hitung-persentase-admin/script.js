<!-- script.js -->
(function () {
  const el = {
    form: document.getElementById('adminForm'),
    hargaJual: document.getElementById('hargaJual'),
    biayaAdmin: document.getElementById('biayaAdmin'),
    hasil: document.getElementById('hasil'),
    hitung: document.getElementById('hitungButton'),
    reset: document.getElementById('resetButton'),
  };

  // Format Rp
  const fmtRp = n =>
    'Rp ' + (isNaN(n) ? 0 : Math.round(n)).toLocaleString('id-ID');

  // Ambil angka dari input teks (hapus titik/koma/spasi)
  const toNumber = v => {
    if (v == null) return 0;
    const s = String(v).replace(/[^\d.-]/g, '');
    const n = Number(s);
    return isNaN(n) ? 0 : n;
  };

  // Taksir kategori umum Shopee berdasarkan persen admin
  function guessKategori(p) {
    // toleransi ±0.25%
    const near = (x, y, tol = 0.25) => Math.abs(x - y) <= tol;
    if (near(p, 5.75)) return 'Kategori C ~ 5.75%';
    if (near(p, 8.0)) return 'Kategori A/B ~ 8%';
    return 'Manual/Variatif';
  }

  function render({ harga, admin, persen, danaDiterima }) {
    const kelas = `
      .result-card{border:1px solid #dee2e6;border-radius:.5rem;padding:1rem;background:#fff}
      .row-line{display:flex;justify-content:space-between;margin:.25rem 0}
      .muted{color:#6c757d;font-size:.9rem}
      @media (prefers-color-scheme: dark){
        .result-card{background:#121212;border-color:#2a2a2a;color:#e6e6e6}
        .muted{color:#a0a0a0}
      }
    `;
    el.hasil.innerHTML = `
      <style>${kelas}</style>
      <div class="result-card">
        <div class="row-line"><span>Subtotal (Harga Jual)</span><strong>${fmtRp(harga)}</strong></div>
        <div class="row-line"><span>Fees & Charges (Biaya Admin)</span><strong>${fmtRp(admin)}</strong></div>
        <hr/>
        <div class="row-line"><span>Persentase Admin</span><strong>${persen.toFixed(2)}%</strong></div>
        <div class="muted">${guessKategori(persen)}</div>
        <hr/>
        <div class="row-line"><span>Dana Diterima Penjual</span><strong>${fmtRp(danaDiterima)}</strong></div>
      </div>
    `;
  }

  function hitung() {
    const harga = toNumber(el.hargaJual.value);
    const admin = toNumber(el.biayaAdmin.value);

    if (harga <= 0 || admin < 0) {
      el.hasil.innerHTML =
        '<div class="alert alert-warning">Input tidak valid.</div>';
      return;
    }

    const persen = (admin / harga) * 100;
    const danaDiterima = harga - admin;

    render({ harga, admin, persen, danaDiterima });
  }

  // Event
  el.hitung.addEventListener('click', hitung);
  el.reset.addEventListener('click', () => (el.hasil.innerHTML = ''));

  // Enter untuk hitung
  el.form.addEventListener('submit', e => {
    e.preventDefault();
    hitung();
  });
})();
