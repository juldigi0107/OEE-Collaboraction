import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const index=read('frontend/index.html');
const css=read('frontend/flagship-finish-v97.css');
const spectrum=read('frontend/flagship-spectrum-v98.css');
const routes=read('frontend/flagship-spectrum-v98-routes.css');
const pages=read('frontend/flagship-pages-v91.js');
const js=read('frontend/flagship-finish-v97.js');
const checks=[
 ['v97 css active',index.includes('flagship-finish-v97.css?v=20260917-1')],
 ['v97 js active',index.includes('flagship-finish-v97.js?v=20260917-1')],
 ['v98 spectrum active',index.includes('flagship-spectrum-v98.css?v=20260917-1')],
 ['v98 route spectrum active',index.includes('flagship-spectrum-v98-routes.css?v=20260917-1')],
 ['v98 spectrum follows v97',index.lastIndexOf('flagship-spectrum-v98.css')>index.lastIndexOf('flagship-finish-v97.css')],
 ['v98 route spectrum is final visual authority',index.lastIndexOf('flagship-spectrum-v98-routes.css')>index.lastIndexOf('flagship-spectrum-v98.css')],
 ['v97 is last visual runtime',index.lastIndexOf('flagship-finish-v97.js')>index.lastIndexOf('flagship-master-v96.js')],
 ['no flagship flash on boot',index.includes('flagship-master-v96 flagship-v97')],
 ['fluid typography',css.includes('font-size:clamp(1.65rem,2.35vw,2.9rem)')&&css.includes('--v97-control:clamp(44px,3.35vw,50px)')],
 ['v98 fluid object scale',spectrum.includes('--v98-pad-page:clamp(')&&spectrum.includes('--v98-title:clamp(')&&spectrum.includes('--v98-control-h:clamp(')],
 ['light control contrast',css.includes('background:#fff!important;color:#102f44!important')],
 ['dark surface contrast',css.includes('[data-v97-tone="dark"]')&&css.includes('color:#f2faff!important')],
 ['v98 explicit light and dark contracts',spectrum.includes('Explicit light-surface contract')&&spectrum.includes('Explicit dark-surface contract')&&spectrum.includes('--v98-dark-text:#f4fbff')],
 ['semantic state contrast pairs',spectrum.includes('--v98-success-bg')&&spectrum.includes('--v98-warning-bg')&&spectrum.includes('--v98-danger-bg')&&spectrum.includes('.release-status.ok')],
 ['dark navigation exempt from light buttons',spectrum.includes('.sidebar button.nav{background:transparent!important')&&spectrum.includes('.sidebar button.nav.active')],
 ['responsive dialog authority',css.includes('max-height:min(92dvh,980px)')&&spectrum.includes('dialog:has(.tablewrap)')&&spectrum.includes('max-height:calc(100dvh - 12px)')],
 ['mobile iOS input size',css.includes('font-size:16px!important')&&css.includes('env(safe-area-inset-bottom)')],
 ['dynamic grids',css.includes('repeat(auto-fit,minmax(min(100%,clamp(190px,18vw,270px)),1fr))')&&spectrum.includes('repeat(auto-fit,minmax(min(100%,clamp(220px,19vw,310px)),1fr))')],
 ['container adaptation',css.includes('@container (max-width:560px)')],
 ['coarse pointer adaptation',spectrum.includes('@media(pointer:coarse)')&&spectrum.includes('min-height:48px!important')],
 ['short viewport adaptation',spectrum.includes('@media(max-height:700px)')],
 ['reduced motion respected',css.includes('@media(prefers-reduced-motion:reduce)')&&spectrum.includes('@media(prefers-reduced-motion:reduce)')],
 ['runtime contrast ratio',js.includes('ratio(fg,bg)')&&js.includes('v97ContrastFix')&&js.includes('min=large?3:4.5')],
 ['runtime alpha background blend',js.includes('blend=(fg,bg)')&&js.includes('backgroundFor(el)')],
 ['runtime gradient background audit',js.includes('function gradientTone')&&js.includes('style.backgroundImage')],
 ['runtime deep text coverage',js.includes('li,summary,caption,dt,dd')&&js.includes('.home-hero-v4')&&js.includes('.login-hero')],
 ['runtime collision guard',js.includes('collisionGuard')&&js.includes('scrollWidth>el.clientWidth+3')&&js.includes('v97-reflow')],
 ['runtime viewport adaptation',js.includes("w<560?'phone':w<900?'tablet':w<1500?'desktop':'wide'")&&js.includes('v97Pointer')],
 ['runtime observes dynamic DOM once',js.includes('MutationObserver')&&js.includes('ResizeObserver')&&!spectrum.includes('MutationObserver')&&!routes.includes('MutationObserver')],
 ['table density tracked',js.includes('v97Density')&&js.includes("cols>=12?'ultra':cols>=8?'dense':'normal'")],
 ['deep page components covered',spectrum.includes('.oc31-section')&&spectrum.includes('.v37-display-overview')&&spectrum.includes('.v42-display-readiness')&&spectrum.includes('.de5-stage')],
 ['route-aware accent authority',routes.includes('--v98-route:var(--f91-accent')&&routes.includes('button.primary')&&routes.includes('.flagship-routebar')],
 ['Patrol flagship route identity',pages.includes("patrol:['Field Reliability'")&&routes.includes('[data-ui-view="patrol"]')&&routes.includes('.v94-filters')],
 ['fluid deep-page grids',routes.includes('.v36-dept-summary')&&routes.includes('.v37-approval-aging')&&routes.includes('.ic30-flow')&&routes.includes('repeat(auto-fit,minmax')],
 ['HMI deep responsive guard',routes.includes('[data-ui-view="shopfloor"]')&&routes.includes('.v36-hmi-context')&&routes.includes('overflow-wrap:anywhere')],
 ['no prototype language',!/\b(prototype|mockup|dummy|lorem ipsum|data demo)\b/i.test(css+'\n'+spectrum+'\n'+routes+'\n'+pages+'\n'+js)]
];
const failed=checks.filter(([,ok])=>!ok);
if(failed.length){for(const [name] of failed)console.error('FAIL:',name);process.exit(1);}
console.log(`Flagship visual validation OK — ${checks.length} adaptive visual, contrast, route, collision, deep-page and mobile guards checked.`);
