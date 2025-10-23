diff --git a/assets/license.js b/assets/license.js
index e24c1688426896d287b32f6a94e0a1ec8a34a779..9dac5244cd2ca671f75d63b9f4c6440c9880d9c3 100644
--- a/assets/license.js
+++ b/assets/license.js
@@ -1,35 +1,119 @@
 // Minimal client-side license module dengan penyimpanan localStorage.
 (function(){
   const LS_ACTIVE_KEY = 'seller_license_active_code';
   const LS_ACTIVE_META_KEY = 'seller_license_active_meta';
   const LS_CATALOG_KEY = 'seller_license_catalog';
   const LS_USED_CODES_KEY = 'seller_license_used_codes';
   const LS_TRIAL_USED_KEY = 'seller_license_trial_consumed';
+  const LS_DEVICE_ID_KEY = 'seller_license_device_id';
+  const LS_CLAIM_REGISTRY_KEY = 'seller_license_claim_registry';
   const PUBLIC_TRIAL_CODES = Object.freeze([]);
+  const DAY_MS = 24 * 60 * 60 * 1000;
+  const YEAR_MS = 365 * DAY_MS;
   const TRIAL_DURATION_MS = 1 * 60 * 1000; // 1 menit
-  const DEFAULT_CODES = Object.freeze([]);
+  const DEFAULT_LICENSE_DEFINITIONS = Object.freeze({
+    'LUBISPRO-2025': Object.freeze({
+      code: 'LUBISPRO-2025',
+      label: 'Lisensi Pro Tahunan',
+      badgeLabel: 'Pro 1 Tahun',
+      durationLabel: '1 Tahun',
+      durationMs: YEAR_MS,
+      type: 'paid'
+    })
+  });
const DEFAULT_LICENSE_DEFINITIONS = Object.freeze({
+    'COBADULU-2025': Object.freeze({
+      code: 'COBADULU-2025',
+      label: 'Lisensi COBA',
+      badgeLabel: 'COBA 1 Hari',
+      durationLabel: '1 Hari',
+      durationMs: DAY_MS,
+      type: 'paid'
+    })
+  });
+  const DEFAULT_CODES = Object.freeze(Object.keys(DEFAULT_LICENSE_DEFINITIONS));
+
+  function safeParseJson(value, fallback){
+    if(!value) return fallback;
+    try{
+      const parsed = JSON.parse(value);
+      if(parsed && typeof parsed === 'object') return parsed;
+      return fallback;
+    }catch(e){
+      return fallback;
+    }
+  }
+
+  function readClaimRegistry(){
+    try{
+      const raw = localStorage.getItem(LS_CLAIM_REGISTRY_KEY);
+      return safeParseJson(raw, {});
+    }catch(e){
+      return {};
+    }
+  }
+
+  function writeClaimRegistry(map){
+    try{
+      localStorage.setItem(LS_CLAIM_REGISTRY_KEY, JSON.stringify(map));
+    }catch(e){
+      // abaikan kegagalan penyimpanan
+    }
+  }
+
+  function upsertClaimRecord(code, record){
+    if(!code || !record) return;
+    const claims = readClaimRegistry();
+    claims[String(code)] = record;
+    writeClaimRegistry(claims);
+  }
+
+  function getClaimRecord(code){
+    if(!code) return null;
+    const claims = readClaimRegistry();
+    const record = claims[String(code)];
+    return record && typeof record === 'object' ? record : null;
+  }
+
+  function resolveDeviceId(){
+    try{
+      let deviceId = localStorage.getItem(LS_DEVICE_ID_KEY);
+      if(deviceId) return deviceId;
+      deviceId = `dev-${Math.random().toString(36).slice(2,10)}${Date.now().toString(36)}`;
+      localStorage.setItem(LS_DEVICE_ID_KEY, deviceId);
+      return deviceId;
+    }catch(e){
+      return 'unknown-device';
+    }
+  }
+
+  function clearActiveState(){
+    try{
+      localStorage.removeItem(LS_ACTIVE_KEY);
+      localStorage.removeItem(LS_ACTIVE_META_KEY);
+    }catch(e){
+      // abaikan kegagalan pembersihan
+    }
+  }
+
+  function dispatch(active, state){
+    const baseState = active ? (state || readActiveState() || null) : null;
+    const detail = buildStatusDetail(baseState);
+    document.dispatchEvent(new CustomEvent('seller-license-status', { detail }));
+    return detail;
+  }
 
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
@@ -85,77 +169,87 @@
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
-    const activatedAt = Date.now();
+    const activatedAt = baseTimestamp;
     localStorage.setItem(LS_ACTIVE_META_KEY, JSON.stringify({code, activatedAt}));
+    upsertClaimRecord(code, { deviceId, claimedAt: activatedAt });
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
 
+  function getLicenseDefinition(code){
+    const normalized = normalize(code);
+    if(!normalized) return null;
+    if(Object.prototype.hasOwnProperty.call(DEFAULT_LICENSE_DEFINITIONS, normalized)){
+      return DEFAULT_LICENSE_DEFINITIONS[normalized];
+    }
+    return null;
+  }
+
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
