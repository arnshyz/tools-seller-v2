(function(){
  const $ = s => document.querySelector(s);

  const el = {
    sales: $('#salesFromAds'),
    sold: $('#productsSold'),
    ad: $('#totalAdCost'),
    adminPct: $('#adminFeePercentage'),
    hpp: $('#productCost'),
    calc: $('#calculateButton'),
    reset: $('#resetButton'),
    resultBox: $('#result'),
    roas: $('#roasValue'),
    profitTotal: $('#totalProfitLoss'),
    profitPerProd: $('#profitPerProduct'),
    conclusion: $('#conclusion')
  };

  const toNumber = v => {
    if (v == null) return 0;
    const s = String(v).replace(/[\s.,](?=\d)/g, '');
    const n = Number(s);
    return isNaN(n) ? 0 : n;
  };

  const fmtRp = n => 'Rp ' + (Math.round(n)||0).toLocaleString('id-ID');

  function compute(){
    const sales = toNumber(el.sales.value);
    const sold = Math.max(0, Number(el.sold.value||0));
    const ad = toNumber(el.ad.value);
    const adminPct = Math.max(0, Number(el.adminPct.value||0));
    const hpp = toNumber(el.hpp.value);

    const adminFee = sales * (adminPct/100);
    const netSales = sales - adminFee;
    const totalHPP = hpp * sold;
    const profit = netSales - ad - totalHPP;
    const roas = ad > 0 ? (sales / ad) : Infinity;
    const profitPer = sold > 0 ? (profit / sold) : 0;

    return { sales, sold, ad, adminPct, adminFee, netSales, totalHPP, profit, roas, profitPer };
  }

  function conclusionText(p){
    if (!isFinite(p.roas)) return 'ROAS tak terhingga (biaya iklan = 0).';
    if (p.roas < 1) return 'Rugi. Pendapatan dari iklan lebih kecil dibanding biaya yang dikeluarkan.';
    if (p.profit < 0) return 'Masih rugi. Evaluasi biaya admin, HPP, atau kurangi spend iklan.';
    if (p.roas < 2) return 'Profit tipis. Optimalkan konversi atau negosiasikan biaya iklan.';
    return 'Profit sehat! Pertahankan optimasi dan jaga efisiensi ads.';
  }

  function render(p){
    el.resultBox.classList.remove('hidden');
    el.roas.textContent = 'ROAS: ' + (isFinite(p.roas) ? p.roas.toFixed(2) : '∞');
    el.profitTotal.textContent = fmtRp(p.profit);
    el.profitPerProd.textContent = fmtRp(p.profitPer);
    el.conclusion.textContent = conclusionText(p);
    el.profitTotal.title = [
      'Penjualan dari Iklan: ' + fmtRp(p.sales),
      'Biaya Admin (' + p.adminPct.toFixed(2) + '%): ' + fmtRp(p.adminFee),
      'Biaya Iklan: ' + fmtRp(p.ad),
      'Total HPP: ' + fmtRp(p.totalHPP)
    ].join('\n');
  }

  function validate(){
    const sales = toNumber(el.sales.value);
    const ad = toNumber(el.ad.value);
    if (sales < 0 || ad < 0) return 'Nilai tidak boleh negatif.';
    return null;
  }

  el.calc.addEventListener('click', () => {
    const err = validate();
    if (err){ alert(err); return; }
    render(compute());
  });

  el.reset.addEventListener('click', () => {
    document.getElementById('profitLossForm').reset();
    el.resultBox.classList.add('hidden');
  });

  document.querySelectorAll('[data-format="number"]').forEach(inp => {
    inp.addEventListener('blur', () => {
      const s = toNumber(inp.value);
      inp.value = s ? s.toLocaleString('id-ID') : '';
    });
  });
})();
