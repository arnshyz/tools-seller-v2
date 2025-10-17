// Minimal client-side license module with localStorage.
(function(){
  const LS_ACTIVE_KEY = 'seller_license_active_code';
  const LS_CATALOG_KEY = 'seller_license_catalog';
  const DEFAULT_CODES = ['SELLER-TRIAL-7','SELLER TOOLS PRO 2025','SELLERPRO-2025'];

  function getCatalog(){
    try{
      const raw = localStorage.getItem(LS_CATALOG_KEY);
      if(!raw) return [...DEFAULT_CODES];
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? Array.from(new Set([...DEFAULT_CODES, ...arr])) : [...DEFAULT_CODES];
    }catch(e){ return [...DEFAULT_CODES]; }
  }
  function setCatalog(list){
    try{
      const uniq = Array.from(new Set((list||[]).filter(Boolean).map(String)));
      localStorage.setItem(LS_CATALOG_KEY, JSON.stringify(uniq));
      return true;
    }catch(e){ return false; }
  }
  function normalize(s){ return String(s||'').trim(); }
  function dispatch(active, code){
    document.dispatchEvent(new CustomEvent('seller-license-status',{detail:{active, code}}));
  }

  const api = {
    activate(code){
      const c = normalize(code);
      if(!c) return {ok:false, message:'Masukkan kode lisensi.'};
      if(!getCatalog().includes(c)) return {ok:false, message:'Kode lisensi tidak dikenal.'};
      localStorage.setItem(LS_ACTIVE_KEY, c);
      dispatch(true, c);
      return {ok:true, code:c};
    },
    deactivate(){
      localStorage.removeItem(LS_ACTIVE_KEY);
      dispatch(false, null);
      return {ok:true};
    },
    isActive(){ return !!localStorage.getItem(LS_ACTIVE_KEY); },
    getCode(){ return localStorage.getItem(LS_ACTIVE_KEY) || null; },
    importCatalog(input, opts){
      try{
        let list=[];
        if(typeof input==='string'){
          const t = input.trim();
          if(!t) return {ok:false, message:'Katalog kosong.'};
          if(t.startsWith('[')) list = JSON.parse(t);
          else list = t.split(/[\n,]+/).map(s=>s.trim()).filter(Boolean);
        }else if(Array.isArray(input)){ list=input; }
        else return {ok:false, message:'Format katalog tidak didukung.'};
        const current = getCatalog().filter(c => !DEFAULT_CODES.includes(c));
        const mode = (opts&&opts.mode)||'merge';
        const next = mode==='replace' ? list : Array.from(new Set([...current, ...list]));
        if(!setCatalog(next)) return {ok:false, message:'Gagal menyimpan katalog.'};
        return {ok:true, total:getCatalog().length};
      }catch(e){ return {ok:false, message:'Gagal mengurai katalog.'}; }
    }
  };
  window.SellerLicense = api;
  dispatch(api.isActive(), api.getCode());
})();