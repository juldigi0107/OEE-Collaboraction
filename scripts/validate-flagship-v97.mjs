import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const index=read('frontend/index.html');
const css=read('frontend/flagship-finish-v97.css');
const js=read('frontend/flagship-finish-v97.js');
const checks=[
 ['v97 css active',index.includes('flagship-finish-v97.css?v=20260917-1')],
 ['v97 js active',index.includes('flagship-finish-v97.js?v=20260917-1')],
 ['v97 is last visual css',index.lastIndexOf('flagship-finish-v97.css')>index.lastIndexOf('flagship-master-v96-intelligence.css')],
 ['v97 is last visual runtime',index.lastIndexOf('flagship-finish-v97.js')>index.lastIndexOf('flagship-master-v96.js')],
 ['no flagship flash on boot',index.includes('flagship-master-v96 flagship-v97')],
 ['fluid typography',css.includes('font-size:clamp(1.65rem,2.35vw,2.9rem)')&&css.includes('--v97-control:clamp(44px,3.35vw,50px)')],
 ['light control contrast',css.includes('background:#fff!important;color:#102f44!important')],
 ['dark surface contrast',css.includes('[data-v97-tone="dark"]')&&css.includes('color:#f2faff!important')],
 ['responsive dialog authority',css.includes('max-height:min(92dvh,980px)')&&css.includes('.dialogbody')&&css.includes('position:sticky')],
 ['mobile iOS input size',css.includes('font-size:16px!important')&&css.includes('env(safe-area-inset-bottom)')],
 ['dynamic grids',css.includes('repeat(auto-fit,minmax(min(100%,clamp(190px,18vw,270px)),1fr))')],
 ['container adaptation',css.includes('@container (max-width:560px)')],
 ['reduced motion respected',css.includes('@media(prefers-reduced-motion:reduce)')],
 ['runtime contrast ratio',js.includes('ratio(fg,bg)')&&js.includes('v97ContrastFix')&&js.includes('min=large?3:4.5')],
 ['runtime alpha background blend',js.includes('blend=(fg,bg)')&&js.includes('backgroundFor(el)')],
 ['runtime collision guard',js.includes('collisionGuard')&&js.includes('scrollWidth>el.clientWidth+3')&&js.includes('v97-reflow')],
 ['runtime viewport adaptation',js.includes("w<560?'phone':w<900?'tablet':w<1500?'desktop':'wide'")&&js.includes('v97Pointer')],
 ['runtime observes dynamic DOM',js.includes('MutationObserver')&&js.includes('ResizeObserver')],
 ['table density tracked',js.includes('v97Density')&&js.includes("cols>=12?'ultra':cols>=8?'dense':'normal'")],
 ['no prototype language',!/\b(prototype|mockup|dummy|lorem ipsum|data demo)\b/i.test(css+'\n'+js)]
];
const failed=checks.filter(([,ok])=>!ok);
if(failed.length){for(const [name] of failed)console.error('FAIL:',name);process.exit(1);}
console.log(`Flagship Finish v97 validation OK — ${checks.length} adaptive visual, contrast, collision and mobile guards checked.`);
