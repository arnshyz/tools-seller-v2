// Minimal client-side license module with localStorage.
(function(){
  const LS_ACTIVE_KEY = 'seller_license_active_code';
  const LS_ACTIVE_META_KEY = 'seller_license_active_meta';
  const LS_CATALOG_KEY = 'seller_license_catalog';
  const LS_USED_CODES_KEY = 'seller_license_used_codes';
  const LS_TRIAL_USED_KEY = 'seller_license_trial_consumed';
  const TRIAL_CODE = 'SELLER-TRIAL-1';
  const LEGACY_TRIAL_CODES = ['SELLER-TRIAL-7'];
  const TRIAL_DURATION_MS = 24 * 60 * 60 * 1000; // 1 hari
  const DEFAULT_CODES = [TRIAL_CODE,'SELLER TOOLS PRO 2025','SELLERPRO-2025'];

  function isTrialCode(code){
    return [TRIAL_CODE, ...LEGACY_TRIAL_CODES].includes(code);
  }

  function getUsedCodes(){
    try{
      const raw = localStorage.getItem(LS_USED_CODES_KEY);
      if(!raw) return new Set();
      const arr = JSON.parse(raw);
      if(!Array.isArray(arr)) return new Set();
      return new Set(arr.map(String));
    }catch(e){ return new Set(); }
  }

  function persistUsedCodes(set){
    try{
      const arr = Array.from(set);
      localStorage.setItem(LS_USED_CODES_KEY, JSON.stringify(arr));
    }catch(e){ /* abaikan */ }
  }

  function markCodeUsed(code){
    if(!code) return;
    const used = getUsedCodes();
    if(!used.has(code)){
      used.add(code);
      persistUsedCodes(used);
    }
  }

  function hasUsedTrial(){
    return localStorage.getItem(LS_TRIAL_USED_KEY) === '1';
  }

  function markTrialUsed(){
    localStorage.setItem(LS_TRIAL_USED_KEY, '1');
  }

  function readActiveState(){
    const code = localStorage.getItem(LS_ACTIVE_KEY);
    if(!code) return null;

    let activatedAt = null;
    try {
      const raw = localStorage.getItem(LS_ACTIVE_META_KEY);
      if(raw){
        const meta = JSON.parse(raw);
        if(meta && meta.code === code && typeof meta.activatedAt === 'number'){
          activatedAt = meta.activatedAt;
        }
      }
    } catch(e) {
      // abaikan parsing error dan perlakukan seperti tanpa metadata
    }

    markCodeUsed(code);
    if(isTrialCode(code)){
      if(!hasUsedTrial()){
        markTrialUsed();
      }
      if(!activatedAt){
        activatedAt = Date.now();
        localStorage.setItem(LS_ACTIVE_META_KEY, JSON.stringify({code, activatedAt}));
      }
      if(Date.now() - activatedAt > TRIAL_DURATION_MS){
        localStorage.removeItem(LS_ACTIVE_KEY);
        localStorage.removeItem(LS_ACTIVE_META_KEY);
        dispatch(false, null);
        return null;
      }
    }

    return {code, activatedAt};
  }

  function persistActiveState(code){
    localStorage.setItem(LS_ACTIVE_KEY, code);
    const activatedAt = Date.now();
    localStorage.setItem(LS_ACTIVE_META_KEY, JSON.stringify({code, activatedAt}));
    markCodeUsed(code);
    if(isTrialCode(code)){
      markTrialUsed();
    }
  }

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

  function clearActiveState(){
    localStorage.removeItem(LS_ACTIVE_KEY);
    localStorage.removeItem(LS_ACTIVE_META_KEY);
  }

  function evaluateState(){
    return readActiveState();
  }

  const api = {
    activate(code){
      const c = normalize(code);
      if(!c) return {ok:false, message:'Masukkan kode lisensi.'};
      const current = evaluateState();
      if(current && current.code === c){
        return {ok:true, code:c};
      }
      if(!getCatalog().includes(c)) return {ok:false, message:'Kode lisensi tidak dikenal.'};
      if(isTrialCode(c)){
        if(hasUsedTrial()){
          return {ok:false, message:'Lisensi trial sudah pernah digunakan di perangkat ini.'};
        }
      }else{
        const used = getUsedCodes();
        if(used.has(c)){
          return {ok:false, message:'Kode lisensi ini sudah pernah digunakan di perangkat ini.'};
        }
      }
      persistActiveState(c);
      dispatch(true, c);
      return {ok:true, code:c};
    },
    deactivate(){
      clearActiveState();
      dispatch(false, null);
      return {ok:true};
    },
    isActive(){
      return !!evaluateState();
    },
    getCode(){
      const state = evaluateState();
      return state ? state.code : null;
    },
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