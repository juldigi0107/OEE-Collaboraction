import fs from 'node:fs';
const index=fs.readFileSync('frontend/index.html','utf8');
const release=fs.readFileSync('frontend/release-v10.js','utf8');
const field=fs.readFileSync('frontend/field-display-v8.js','utf8');
const checks=[
  ['release CSS aktif',index.includes('release-v10.css')],
  ['release JS aktif',index.includes('release-v10.js')],
  ['governance route tersedia',release.includes("view==='governance'")&&release.includes('Tata Kelola & Readiness')],
  ['source registry business-facing',release.includes('Pusat Data & Dokumen')&&release.includes('Register sumber')],
  ['data-quality presentation',release.includes("quality=function()")&&release.includes('Kualitas Data')],
  ['infrastructure readiness',release.includes('RELEASE_READINESS.infrastructure')&&release.includes('LAN network')&&release.includes('Power / UPS')],
  ['barcode readiness + scanner',release.includes('Barcode scanner')&&release.includes('barcodePlanScan')],
  ['data owner + approval baseline',release.includes('RELEASE_READINESS.data_owners')&&release.includes('Final Report')],
  ['terminology baseline',release.includes('RELEASE_READINESS.terminology')&&release.includes("UPDT:'Unplanned Downtime'")],
  ['machine trigger/integration status',release.includes('Machine trigger')&&release.includes('ODIN / SAP')],
  ['exact field-machine filtering',release.includes("path==='/realtime/overview'")&&release.includes('filter(m=>normalize(m.code)===code)')],
  ['published display gate before paint',release.includes("layout?.status==='published'")],
  ['published display runtime guard',field.includes("layout.status==='published'")||field.includes("layout.status!=='published'")],
  ['no prototype language in release bundle',!/\b(prototype|mockup|dummy|lorem ipsum)\b/i.test(release)]
];
const failed=checks.filter(([,ok])=>!ok);
if(failed.length){for(const [name] of failed)console.error('FAIL:',name);process.exit(1);}
console.log(`Release v10 validation OK — ${checks.length} blueprint/release guards checked.`);
