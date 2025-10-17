(function(){
  if (window.__SELLER_LICENSE_GATE__) return;
  window.__SELLER_LICENSE_GATE__ = true;

  function ensureStyles(){
    if(document.getElementById('seller-license-gate-style')) return;
    const style = document.createElement('style');
    style.id = 'seller-license-gate-style';
    style.textContent = `
      .seller-license-overlay{position:fixed;inset:0;z-index:9999;padding:2rem;display:flex;align-items:center;justify-content:center;background:rgba(3,7,18,0.94);backdrop-filter:blur(18px);transition:opacity .3s ease, visibility .3s ease;}
      .seller-license-overlay[data-hidden="true"]{opacity:0;pointer-events:none;visibility:hidden;}
      .seller-license-overlay__panel{max-width:32rem;width:100%;background:rgba(15,23,42,0.82);border:1px solid rgba(148,163,184,0.2);border-radius:1.75rem;padding:2.5rem;box-shadow:0 35px 80px -35px rgba(34,211,238,0.35);text-align:center;color:#e2e8f0;font-family:'Plus Jakarta Sans',system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;}
      .seller-license-overlay__title{font-size:1.65rem;font-weight:700;margin-bottom:0.75rem;line-height:1.3;}
      .seller-license-overlay__desc{font-size:0.95rem;color:rgba(226,232,240,0.75);margin-bottom:1.75rem;}
      .seller-license-overlay__actions{display:flex;flex-direction:column;gap:0.75rem;}
      .seller-license-overlay__primary{display:inline-flex;justify-content:center;align-items:center;padding:0.85rem 1.25rem;border-radius:9999px;background:linear-gradient(120deg,#22d3ee,#38bdf8);color:#020617;font-weight:600;text-decoration:none;}
      .seller-license-overlay__secondary{display:inline-flex;justify-content:center;align-items:center;padding:0.85rem 1.25rem;border-radius:9999px;border:1px solid rgba(148,163,184,0.3);color:rgba(226,232,240,0.85);font-weight:500;text-decoration:none;}
      .seller-license-overlay__badge{display:inline-flex;align-items:center;gap:0.5rem;font-size:0.7rem;font-weight:600;text-transform:uppercase;letter-spacing:0.18em;color:#38bdf8;background:rgba(8,47,73,0.6);border:1px solid rgba(56,189,248,0.35);border-radius:9999px;padding:0.35rem 0.9rem;margin-bottom:1.5rem;}
    `;
    document.head.appendChild(style);
  }

  function createOverlay(){
    ensureStyles();
    const overlay = document.createElement('div');
    overlay.className = 'seller-license-overlay';
    overlay.setAttribute('data-hidden', 'true');
    overlay.innerHTML = `
      <div class="seller-license-overlay__panel">
        <div class="seller-license-overlay__badge">Lisensi diperlukan</div>
        <div class="seller-license-overlay__title">Aktifkan lisensi untuk membuka kalkulator</div>
        <p class="seller-license-overlay__desc">Halaman ini terkunci sampai Anda memasukkan kode lisensi yang valid. Kembali ke beranda untuk mengaktifkan atau masukkan kode baru jika masa aktif sudah habis.</p>
        <div class="seller-license-overlay__actions">
          <a class="seller-license-overlay__primary" href="../index.html#lisensi">Aktifkan Lisensi</a>
          <a class="seller-license-overlay__secondary" href="../index.html">← Kembali ke Beranda</a>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    return overlay;
  }

  function init(){
    if(!window.SellerLicense){
      console.warn('SellerLicense belum dimuat. Pastikan assets/license.js diload sebelum license-gate.');
      return;
    }
    const overlay = createOverlay();

    function update(active){
      if(active){
        overlay.setAttribute('data-hidden', 'true');
      }else{
        overlay.removeAttribute('data-hidden');
      }
    }

    document.addEventListener('seller-license-status', function(evt){
      const {active} = evt.detail || {};
      update(!!active);
    });

    update(!!SellerLicense.isActive());
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  }else{
    init();
  }
})();
