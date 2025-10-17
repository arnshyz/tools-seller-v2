// Minimal client-side license module dengan penyimpanan localStorage.
(function(){
  const LS_ACTIVE_KEY = 'seller_license_active_code';
  const LS_ACTIVE_META_KEY = 'seller_license_active_meta';
  const LS_CATALOG_KEY = 'seller_license_catalog';
  const LS_USED_CODES_KEY = 'seller_license_used_codes';
  const LS_TRIAL_USED_KEY = 'seller_license_trial_consumed';

  const MS = {
    MINUTE: 60 * 1000,
    DAY: 24 * 60 * 60 * 1000
  };

  const TRIAL_CODE = 'COBADULU';
  const TRIAL_DURATION_MS = 1 * MS.MINUTE; // 1 menit

  const LICENSE_VARIANTS = [
    {
      code: TRIAL_CODE,
      type: 'trial',
      label: 'Trial 1 Menit',
      badgeLabel: 'Trial Aktif',
      durationLabel: '1 Menit',
      durationMs: TRIAL_DURATION_MS,
      default: true
    },
    {
      code: 'AKAY-7HARI',
      type: 'paid',
      label: 'Lisensi 7 Hari',
      badgeLabel: 'Aktif (7 Hari)',
      durationLabel: '7 Hari',
      durationMs: 7 * MS.DAY,
      default: true
    },
    {
      code: 'AKAY-1BULAN',
      type: 'paid',
      label: 'Lisensi 1 Bulan',
      badgeLabel: 'Aktif (1 Bulan)',
      durationLabel: '1 Bulan',
      durationMs: 30 * MS.DAY,
      default: true
    },
    {
      code: 'AKAY-6BULAN',
      type: 'paid',
      label: 'Lisensi 6 Bulan',
      badgeLabel: 'Aktif (6 Bulan)',
      durationLabel: '6 Bulan',
      durationMs: 180 * MS.DAY,
      default: true
    },
    {
      code: 'AKAY-1TAHUN',
      type: 'paid',
      label: 'Lisensi 1 Tahun',
      badgeLabel: 'Aktif (1 Tahun)',
      durationLabel: '1 Tahun',
      durationMs: 365 * MS.DAY,
      default: true
    },
    {
      code: 'SELLER TOOLS PRO 2025',
      type: 'paid',
      label: 'Lisensi Premium 2025',
      badgeLabel: 'Aktif',
      durationLabel: null,
      durationMs: null,
      default: true
    },
    {
      code: 'SELLERPRO-2025',
      type: 'paid',
      label: 'Lisensi Pro 2025',
      badgeLabel: 'Aktif',
      durationLabel: null,
      durationMs: null,
      default: true
    },
    {
      code: 'SELLER-TRIAL-7',
      type: 'trial',
      label: 'Trial 7 Hari',
      badgeLabel: 'Trial Aktif',
      durationLabel: '7 Hari',
      durationMs: 7 * MS.DAY,
      default: false
    }
  ];

  const LICENSE_DEFINITIONS = LICENSE_VARIANTS.reduce((acc, def) => {
    acc[def.code] = def;
    return acc;
  }, {});

  const DEFAULT_CODES = LICENSE_VARIANTS.filter(def => def.default).map(def => def.code);
  const LEGACY_TRIAL_CODES = LICENSE_VARIANTS.filter(def => def.type === 'trial' && !def.default).map(def => def.code);

  function getLicenseDefinition(code){
    if(!code) return null;
    return LICENSE_DEFINITIONS[String(code)] || null;
  }

  function isTrialCode(code){
    const def = getLicenseDefinition(code);
    if(def) return def.type === 'trial';
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

  function clearActiveState(){
    localStorage.removeItem(LS_ACTIVE_KEY);
    localStorage.removeItem(LS_ACTIVE_META_KEY);
  }

  function readActiveState(){
    const code = localStorage.getItem(LS_ACTIVE_KEY);
    if(!code) return null;

    let activatedAt = null;
    let metaPayload = null;
    try {
      const raw = localStorage.getItem(LS_ACTIVE_META_KEY);
      if(raw){
        const meta = JSON.parse(raw);
        if(meta && meta.code === code){
          if(typeof meta.activatedAt === 'number'){
            activatedAt = meta.activatedAt;
          }
          metaPayload = meta;
        }
      }
    } catch(e) {
      // abaikan parsing error dan perlakukan seperti tanpa metadata
    }

    markCodeUsed(code);
    const def = getLicenseDefinition(code);

    if(isTrialCode(code) && !hasUsedTrial()){
      markTrialUsed();
    }

    const needsActivationTimestamp = def && typeof def.durationMs === 'number' && def.durationMs > 0;

    if(needsActivationTimestamp && !activatedAt){
      activatedAt = Date.now();
      const nextMeta = Object.assign({}, metaPayload || {}, {code, activatedAt});
      localStorage.setItem(LS_ACTIVE_META_KEY, JSON.stringify(nextMeta));
    }

    if(needsActivationTimestamp && activatedAt){
      const expiresAt = activatedAt + def.durationMs;
      if(Date.now() >= expiresAt){
        clearActiveState();
        return null;
      }
    }

    return {code, activatedAt};
  }

  function persistActiveState(code){
    const activatedAt = Date.now();
    localStorage.setItem(LS_ACTIVE_KEY, code);
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

  function buildStatusDetail(state){
    if(!state){
      return {
        active:false,
        code:null,
        activatedAt:null,
        expiresAt:null,
        remainingMs:0,
        isTrial:false,
        planLabel:null,
        badgeLabel:null,
        durationLabel:null
      };
    }
    const {code, activatedAt} = state;
    const def = getLicenseDefinition(code);
    const trial = isTrialCode(code);
    let expiresAt = null;
    let remainingMs = null;
    if(def && typeof def.durationMs === 'number' && def.durationMs > 0 && activatedAt){
      expiresAt = activatedAt + def.durationMs;
      remainingMs = Math.max(0, expiresAt - Date.now());
    }
    return {
      active:true,
      code,
      activatedAt:activatedAt || null,
      expiresAt,
      remainingMs,
      isTrial:trial,
      planLabel: def ? def.label : null,
      badgeLabel: def ? def.badgeLabel : null,
      durationLabel: def ? def.durationLabel : null
    };
  }

  function evaluateState(){
    return readActiveState();
  }

  function broadcastStatus(){
    const detail = buildStatusDetail(evaluateState());
    document.dispatchEvent(new CustomEvent('seller-license-status',{detail}));
    return detail;
  }

  const api = {
    activate(code){
      const c = normalize(code);
      if(!c) return {ok:false, message:'Masukkan kode lisensi.'};
      const current = evaluateState();
      if(current && current.code === c){
        const detail = broadcastStatus();
        return {ok:true, code:c, detail};
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
      const detail = broadcastStatus();
      return {ok:true, code:c, detail};
    },
    deactivate(){
      clearActiveState();
      const detail = broadcastStatus();
      return {ok:true, detail};
    },
    isActive(){
      return buildStatusDetail(evaluateState()).active;
    },
    getCode(){
      return buildStatusDetail(evaluateState()).code;
    },
    getStatusDetail(){
      return buildStatusDetail(evaluateState());
    },
    refreshStatus(){
      return broadcastStatus();
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
  broadcastStatus();
})();
