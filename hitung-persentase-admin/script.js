(function () {
  const el = {
    form: document.getElementById('adminForm'),
    hargaJual: document.getElementById('hargaJual'),
    biayaAdmin: document.getElementById('biayaAdmin'),
    hitung: document.getElementById('hitungButton'),
    reset: document.getElementById('resetButton'),
    status: document.getElementById('statusMessage'),
    wrapper: document.getElementById('resultWrapper'),
    subtotal: document.getElementById('resultSubtotal'),
    fee: document.getElementById('resultFee'),
    net: document.getElementById('resultNet'),
    percent: document.getElementById('resultPercent'),
    category: document.getElementById('resultCategory'),
  };

  const fmtRp = n => 'Rp ' + (isNaN(n) ? 0 : Math.round(n)).toLocaleString('id-ID');

  const toNumber = v => {
    if (v == null) return 0;
    const s = String(v).replace(/[^\d.-]/g, '');
    const n = Number(s);
    return isNaN(n) ? 0 : n;
  };

  function guessKategori(p) {
    const near = (x, y, tol = 0.25) => Math.abs(x - y) <= tol;
    if (near(p, 5.75)) return 'Perkiraan: Kategori C (Elektronik)';
    if (near(p, 8.0)) return 'Perkiraan: Kategori A/B (Fashion & Umum)';
    return 'Persentase berbeda — cek kembali aturan kategori toko Anda.';
  }

  function showError(msg) {
    el.status.textContent = msg;
    el.wrapper.classList.add('hidden');
  }

  function render({ harga, admin, persen, danaDiterima }) {
    el.status.textContent = '';
    el.wrapper.classList.remove('hidden');
    el.subtotal.textContent = fmtRp(harga);
    el.fee.textContent = fmtRp(admin);
    el.net.textContent = fmtRp(danaDiterima);
    el.percent.textContent = `${persen.toFixed(2)}%`;
    el.category.textContent = guessKategori(persen);
  }

  function hitung() {
    const harga = toNumber(el.hargaJual.value);
    const admin = toNumber(el.biayaAdmin.value);

    if (harga <= 0) {
      showError('Subtotal pesanan wajib diisi dengan benar.');
      return;
    }
    if (admin < 0) {
      showError('Biaya admin tidak boleh negatif.');
      return;
    }

    const persen = (admin / harga) * 100;
    const danaDiterima = harga - admin;

    render({ harga, admin, persen, danaDiterima });
  }

  el.hitung.addEventListener('click', hitung);
  el.reset.addEventListener('click', () => {
    el.wrapper.classList.add('hidden');
    el.status.textContent = '';
  });

  el.form.addEventListener('submit', e => {
    e.preventDefault();
    hitung();
  });
})();
