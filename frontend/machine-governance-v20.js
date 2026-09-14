/* BMJ OEE approved machine-alias adapter v20 */
(()=>{
 const baseApi=api;
 const norm=v=>String(v||'').trim().toUpperCase().replace(/[^A-Z0-9]/g,'');
 const clean=v=>String(v||'').trim().toUpperCase().replace(/[^A-Z0-9_.-]/g,'').slice(0,64);
 function cfg(){if(!window.DG16)return null;const c=DG16.read(DG16.keys.machines);return DG16.approved(c)&&Array.isArray(c.items)&&c.items.length?c:null;}
 function canonical(raw,c=cfg()){if(!c)return clean(raw);const n=norm(raw);for(const row of c.items){for(const code of [row?.canonical,...(Array.isArray(row?.aliases)?row.aliases:[])])if(norm(code)===n)return clean(row.canonical);}return clean(raw);}
 api=async function(path,method='GET',data){const value=await baseApi(path,method,data),c=cfg();if(!c||method!=='GET'||!String(path).startsWith('/shopfloor/plans')||!Array.isArray(value))return value;return value.map(row=>{try{const p=JSON.parse(row.payload||'{}'),original=p.machine,canon=canonical(original,c);if(canon&&canon!==clean(original)){p.source_machine=original;p.machine=canon;}return {...row,payload:JSON.stringify(p)};}catch{return row;}});};
 window.OEEMachineGovernanceV20={canonical,config:cfg};
})();
