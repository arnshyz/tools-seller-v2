(function(){
  const $ = sel => document.querySelector(sel);
  const numberInputs = () => document.querySelectorAll('[data-format="number"]');

  const el = {
    dasar: $('#biayaProduksi'),
    gaji: $('#gajiKaryawan'),
    lain: $('#biayaLainnya'),
    qty: $('#jumlahProduk'),
    hitung: $('#hitungButton'),
    reset: $('#resetButton'),
    box: $('#hasil'),
    total: $('#totalBiaya'),
    outQty: $('#outJumlah'),
    hpp: $('#hppPerUnit'),
    rDasar: $('#rBiayaDasar'),
    rGaji: $('#rGaji'),
    rLain: $('#rLain')
  };

  const toNumber = v => {
    if (v == null) return 0;
    const s = String(v).replace(/[\s.,](?=\d)/g, '');
    const n = Number(s);
    return isNaN(n) ? 0 : n;
  };
  const fmtRp = n => 'Rp ' + (Math.round(n)||0).toLocaleString('id-ID');

  function compute(){
    const dasar = toNumber(el.dasar.value);
    const gaji = toNumber(el.gaji.value);
    const lain = toNumber(el.lain.value);
    const qty = Math.max(1, Number(el.qty.value||1));

    const total = dasar + gaji + lain;
    const hpp = total / qty;

    return { dasar, gaji, lain, qty, total, hpp };
  }

  function render(x){
    el.box.classList.remove('hidden');
    el.total.textContent = fmtRp(x.total);
    el.outQty.textContent = `${x.qty.toLocaleString('id-ID')} unit`;
    el.hpp.textContent = fmtRp(x.hpp);
    el.rDasar.textContent = fmtRp(x.dasar);
    el.rGaji.textContent = fmtRp(x.gaji);
    el.rLain.textContent = fmtRp(x.lain);
  }

  function validate(){
    if (toNumber(el.dasar.value) < 0) return 'Biaya dasar tidak boleh negatif.';
    if (toNumber(el.gaji.value) < 0) return 'Gaji tidak boleh negatif.';
    if (toNumber(el.lain.value) < 0) return 'Biaya lainnya tidak boleh negatif.';
    if (Number(el.qty.value||0) < 1) return 'Jumlah produk minimal 1.';
    return null;
  }

  el.hitung.addEventListener('click', () => {
    const err = validate();
    if (err){ alert(err); return; }
    render(compute());
  });
  el.reset.addEventListener('click', () => {
    document.getElementById('hppForm').reset();
    el.box.classList.add('hidden');
  });

  numberInputs().forEach(inp => {
    inp.addEventListener('blur', () => {
      const n = toNumber(inp.value);
      inp.value = n ? n.toLocaleString('id-ID') : '';
    });
  });
})();
