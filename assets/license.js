// Minimal client-side license module dengan penyimpanan localStorage.
(function(){
  const LS_ACTIVE_KEY = 'seller_license_active_code';
  const LS_ACTIVE_META_KEY = 'seller_license_active_meta';
  const LS_CATALOG_KEY = 'seller_license_catalog';
  const LS_USED_CODES_KEY = 'seller_license_used_codes';
  const LS_TRIAL_USED_KEY = 'seller_license_trial_consumed';
  const PUBLIC_TRIAL_CODES = Object.freeze([]);
  const TRIAL_DURATION_MS = 1 * 60 * 1000; // 1 menit
  const DEFAULT_CODES = Object.freeze([]);

  function maskLicenseCode(code){
    if(!code) return '';
    const normalized = String(code).trim();
    if(!normalized) return '';
    if(normalized.length <= 4) return normalized;
    return normalized.replace(/.(?=.{4})/g, '•');
  }

  function isTrialCode(code){
    const normalized = String(code || '').trim();
    if(!normalized) return false;
    const def = getLicenseDefinition(normalized);
    if(def) return def.type === 'trial';
    return PUBLIC_TRIAL_CODES.includes(normalized);
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
    const deviceId = resolveDeviceId();
    const claim = getClaimRecord(code);
    const baseTimestamp = claim && claim.deviceId === deviceId && typeof claim.claimedAt === 'number'
      ? claim.claimedAt
      : Date.now();
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
      if(!raw) return Array.from(DEFAULT_CODES);
      const arr = JSON.parse(raw);
      return Array.isArray(arr)
        ? Array.from(new Set([...DEFAULT_CODES, ...arr]))
        : Array.from(DEFAULT_CODES);
    }catch(e){ return Array.from(DEFAULT_CODES); }
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
        maskedCode:'',
        activatedAt:null,
        expiresAt:null,
        remainingMs:0,
        isTrial:false,
        planLabel:null,
        badgeLabel:null,
        durationLabel:null,
        claimedDeviceId:null,
        claimedAt:null,
        isClaimOwner:false
      };
    }
    const {code, activatedAt} = state;
    const def = getLicenseDefinition(code);
    const trial = isTrialCode(code);
    const claimRecord = getClaimRecord(code);
    let expiresAt = null;
    let remainingMs = null;
    if(def && typeof def.durationMs === 'number' && def.durationMs > 0 && activatedAt){
      expiresAt = activatedAt + def.durationMs;
      remainingMs = Math.max(0, expiresAt - Date.now());
    }
    return {
      active:true,
      code,
      maskedCode: maskLicenseCode(code),
      activatedAt:activatedAt || null,
      expiresAt,
      remainingMs,
      isTrial:trial,
      planLabel: def ? def.label : null,
      badgeLabel: def ? def.badgeLabel : null,
      durationLabel: def ? def.durationLabel : null,
      claimedDeviceId: claimRecord ? claimRecord.deviceId : null,
      claimedAt: claimRecord ? claimRecord.claimedAt : null,
      isClaimOwner: !!(claimRecord && claimRecord.deviceId === resolveDeviceId())
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
        return {ok:true, code:c, maskedCode: maskLicenseCode(c), detail};
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
      return {ok:true, code:c, maskedCode: maskLicenseCode(c), detail};
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
    getDeviceId(){
      return resolveDeviceId();
    },
    getClaimInfo(inputCode){
      const detail = buildStatusDetail(evaluateState());
      const targetCode = normalize(inputCode) || detail.code || null;
      if(!targetCode) return null;
      const record = getClaimRecord(targetCode);
      if(!record) return null;
      return {
        code: targetCode,
        deviceId: record.deviceId,
        claimedAt: record.claimedAt,
        isCurrentDevice: record.deviceId === resolveDeviceId()
      };
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
