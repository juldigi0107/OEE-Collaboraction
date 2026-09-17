import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const index=read('frontend/index.html');
const css=read('frontend/flagship-master-v96.css');
const js=read('frontend/flagship-master-v96.js');
const checks=[
 ['v96 assets active',index.includes('flagship-master-v96.css')&&index.includes('flagship-master-v96.js')],
 ['v96 loaded after patrol',index.indexOf('flagship-master-v96.css')>index.indexOf('patrol-v94.css')&&index.indexOf('flagship-master-v96.js')>index.indexOf('patrol-v94.js')],
 ['fluid scale tokens',css.includes('--v96-r:clamp(')&&css.includes('--v96-pad:clamp(')&&css.includes('--v96-md:clamp(')],
 ['contrast light authority',css.includes('Contrast authority — light surfaces')&&css.includes('color:var(--v96-text)!important')],
 ['contrast dark authority',css.includes('Contrast authority — dark surfaces')&&css.includes('color:#f3faff!important')],
 ['semantic state contrast',css.includes('.release-status.ok')&&css.includes('.release-status.warn')&&css.includes('.release-status.danger')],
 ['dynamic grids',css.includes('repeat(auto-fit,minmax(min(100%,210px),1fr))')],
 ['fluid flagship controls',css.includes('input:not([type=checkbox])')&&css.includes('min-height:clamp(43px')&&css.includes('button,.button,a.button')],
 ['deep dialog treatment',css.includes('Dialogs / deepest states')&&css.includes('dialog::backdrop')&&css.includes('.dialogbody')],
 ['HMI and field display treatment',css.includes('HMI / realtime / field display')&&css.includes('#fieldDisplay .display-widget')&&css.includes('.run-hero')],
 ['governance admin patrol depth',css.includes('Governance / admin / UAT / source / patrol depth')&&css.includes('.v94-intro')&&css.includes('.oc31-rule-grid')],
 ['compact tables become card rows',css.includes('No horizontal-scroll data presentation on compact screens')&&css.includes('table[data-v93-table="1"] td::before')],
 ['runtime applies master class',js.includes("document.body.classList.add('flagship-master-v96')")],
 ['runtime density adapts viewport',js.includes('data-v96-density')||js.includes('dataset.v96Density')],
 ['runtime labels table cells',js.includes('td.dataset.label=heads[i]')],
 ['runtime contrast audit',js.includes('contrastAudit')&&js.includes('ratio(fg,bg)>=4.5')],
 ['runtime overflow audit',js.includes('overflowAudit')&&js.includes('v96-overflow-safe')],
 ['reduced motion respected',css.includes('@media(prefers-reduced-motion:reduce)')],
 ['no prototype wording',!/\b(prototype|mockup|dummy|lorem ipsum|data demo)\b/i.test(css+'\n'+js)]
];
const failed=checks.filter(([,ok])=>!ok);
if(failed.length){for(const [name] of failed)console.error('FAIL:',name);process.exit(1);}
console.log(`Flagship v96 validation OK — ${checks.length} visual, contrast, responsive, and depth guards checked.`);
