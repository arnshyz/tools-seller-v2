// Minimal client-side license module dengan penyimpanan localStorage.
(function(){
  const LS_ACTIVE_KEY = 'seller_license_active_code';
  const LS_ACTIVE_META_KEY = 'seller_license_active_meta';
  const LS_CATALOG_KEY = 'seller_license_catalog';
  const LS_USED_CODES_KEY = 'seller_license_used_codes';
  const LS_TRIAL_USED_KEY = 'seller_license_trial_consumed';
  const LS_DEVICE_ID_KEY = 'seller_license_device_id';
  const LS_DEVICE_MAC_KEY = 'seller_license_device_mac';
  const LS_CLAIM_REGISTRY_KEY = 'seller_license_claim_registry';

  const MS = {
    MINUTE: 60 * 1000,
    DAY: 24 * 60 * 60 * 1000
  };

  const TRIAL_CODE = 'COBADULU';
  const TRIAL_DURATION_MS = 1 * MS.MINUTE; // 1 menit

  let deviceIdCache = null;
  let deviceMacCache;
  let fingerprintCache = null;
  let claimRegistryCache = null;

  function hashString(input){
    let hash = 0x811c9dc5;
    for(let i=0;i<input.length;i++){
      hash ^= input.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return 'd' + (hash >>> 0).toString(16);
  }

  function generateDeviceFingerprint(){
    const nav = typeof navigator !== 'undefined' ? navigator : {};
    const screenData = typeof screen !== 'undefined' ? screen : {};
    let timezone = '';
    try{
      const options = Intl.DateTimeFormat().resolvedOptions();
      timezone = options && options.timeZone ? options.timeZone : '';
    }catch(e){ /* abaikan */ }
    const base = [
      nav.userAgent || '',
      nav.language || '',
      String(screenData.colorDepth || ''),
      String(screenData.width || ''),
      String(screenData.height || ''),
      String(timezone || ''),
      String(new Date().getTimezoneOffset())
    ].join('::');
    let randomSegment = '';
    try{
      if(window.crypto && window.crypto.getRandomValues){
        const buffer = new Uint32Array(2);
        window.crypto.getRandomValues(buffer);
        randomSegment = buffer.join('-');
      }else{
        randomSegment = String(Math.random());
      }
    }catch(e){
      randomSegment = `${Math.random()}-${Date.now()}`;
    }
    return hashString(`${base}::${randomSegment}`);
  }

  function ensureFingerprintId(){
    if(fingerprintCache) return fingerprintCache;
    try{
      const stored = localStorage.getItem(LS_DEVICE_ID_KEY);
      if(stored){
        fingerprintCache = stored;
        return stored;
      }
    }catch(e){ /* abaikan */ }
    const generated = generateDeviceFingerprint();
    try{
      localStorage.setItem(LS_DEVICE_ID_KEY, generated);
    }catch(e){ /* abaikan */ }
    fingerprintCache = generated;
    return generated;
  }

  function normalizeMacAddress(value){
    if(!value) return null;
    let cleaned = String(value).trim().toUpperCase();
    if(!cleaned) return null;
    cleaned = cleaned.replace(/[^0-9A-F]/g, '');
    if(cleaned.length !== 12) return null;
    const pairs = cleaned.match(/.{1,2}/g);
    if(!pairs || pairs.length !== 6) return null;
    return pairs.join(':');
  }

  function readStoredMac(){
    if(deviceMacCache !== undefined) return deviceMacCache;
    try{
      const raw = localStorage.getItem(LS_DEVICE_MAC_KEY);
      if(raw){
        deviceMacCache = raw;
        return raw;
      }
    }catch(e){ /* abaikan */ }
    deviceMacCache = null;
    return null;
  }

  function persistDeviceMac(mac){
    deviceMacCache = mac || null;
    try{
      if(mac){
        localStorage.setItem(LS_DEVICE_MAC_KEY, mac);
      }else{
        localStorage.removeItem(LS_DEVICE_MAC_KEY);
      }
    }catch(e){ /* abaikan */ }
    deviceIdCache = null;
  }

  function computeDeviceId(){
    const mac = readStoredMac();
    if(mac){
      return `mac-${hashString(`mac::${mac}`)}`;
    }
    return ensureFingerprintId();
  }

  function resolveDeviceId(){
    if(deviceIdCache) return deviceIdCache;
    const id = computeDeviceId();
    deviceIdCache = id;
    return id;
  }

  function readClaimRegistry(){
    if(claimRegistryCache) return claimRegistryCache;
    let map = {};
    try{
      const raw = localStorage.getItem(LS_CLAIM_REGISTRY_KEY);
      if(raw){
        const parsed = JSON.parse(raw);
        if(parsed && typeof parsed === 'object'){
          map = parsed;
        }
      }
    }catch(e){ map = {}; }
    claimRegistryCache = map;
    return map;
  }

  function writeClaimRegistry(map){
    claimRegistryCache = map;
    try{
      localStorage.setItem(LS_CLAIM_REGISTRY_KEY, JSON.stringify(map));
    }catch(e){ /* abaikan */ }
  }

  function getClaimRecord(code){
    if(!code) return null;
    const registry = readClaimRegistry();
    const record = registry[String(code)];
    if(record && typeof record === 'object'){
      return {
        deviceId: record.deviceId || null,
        claimedAt: typeof record.claimedAt === 'number' ? record.claimedAt : null,
        mac: record.mac || null
      };
    }
    return null;
  }

  function persistClaimRecord(code, deviceId){
    if(!code || !deviceId) return;
    const registry = Object.assign({}, readClaimRegistry());
    const existing = registry[String(code)];
    if(existing && existing.deviceId === deviceId) return;
    registry[String(code)] = {deviceId, claimedAt: Date.now(), mac: readStoredMac() || null};
    writeClaimRegistry(registry);
  }

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

    const claimRecord = getClaimRecord(code);
    const deviceId = resolveDeviceId();
    if(claimRecord && claimRecord.deviceId && claimRecord.deviceId !== deviceId){
      clearActiveState();
      return null;
    }

    if(isTrialCode(code) && !hasUsedTrial()){
      markTrialUsed();
    }

    if(!claimRecord || claimRecord.deviceId !== deviceId){
      persistClaimRecord(code, deviceId);
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
    persistClaimRecord(code, resolveDeviceId());
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
        durationLabel:null,
        claimedDeviceId:null,
        claimedAt:null,
        claimedMac:null,
        registeredMac: readStoredMac(),
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
      activatedAt:activatedAt || null,
      expiresAt,
      remainingMs,
      isTrial:trial,
      planLabel: def ? def.label : null,
      badgeLabel: def ? def.badgeLabel : null,
      durationLabel: def ? def.durationLabel : null,
      claimedDeviceId: claimRecord ? claimRecord.deviceId : null,
      claimedAt: claimRecord ? claimRecord.claimedAt : null,
      claimedMac: claimRecord ? claimRecord.mac : null,
      registeredMac: readStoredMac(),
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
        return {ok:true, code:c, detail};
      }
      if(!getCatalog().includes(c)) return {ok:false, message:'Kode lisensi tidak dikenal.'};
      const mac = readStoredMac();
      if(!mac){
        return {ok:false, message:'Masukkan MAC address perangkat sebelum mengaktifkan lisensi.'};
      }
      const deviceId = resolveDeviceId();
      const claim = getClaimRecord(c);
      if(claim && claim.deviceId && claim.deviceId !== deviceId){
        const macInfo = claim.mac ? ` (tercatat pada MAC ${claim.mac})` : '';
        return {ok:false, message:`Kode lisensi ini sudah diklaim di perangkat lain${macInfo}.`};
      }
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
    getDeviceId(){
      return resolveDeviceId();
    },
    getDeviceMac(){
      return readStoredMac();
    },
    setDeviceMac(value){
      const normalized = normalizeMacAddress(value);
      if(!normalized){
        return {ok:false, message:'Format MAC address tidak valid. Gunakan format XX:XX:XX:XX:XX:XX.'};
      }
      const currentMac = readStoredMac();
      if(currentMac === normalized){
        deviceIdCache = null;
        const detail = broadcastStatus();
        return {ok:true, mac: normalized, detail};
      }
      const previousMac = currentMac || null;
      persistDeviceMac(normalized);
      const currentState = evaluateState();
      let detail = null;
      if(currentState && currentState.code){
        const claim = getClaimRecord(currentState.code);
        const deviceId = resolveDeviceId();
        if(claim && claim.deviceId && claim.deviceId !== deviceId){
          persistDeviceMac(previousMac);
          deviceIdCache = null;
          detail = broadcastStatus();
          return {ok:false, message:'MAC address berbeda dengan data klaim lisensi sebelumnya. Menggunakan MAC sebelumnya.', detail};
        }
        persistClaimRecord(currentState.code, deviceId);
      }
      detail = broadcastStatus();
      return {ok:true, mac: normalized, detail};
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
        claimedMac: record.mac || null,
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
