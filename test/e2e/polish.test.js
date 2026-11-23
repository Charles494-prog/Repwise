// Mobile polish audit: visits every reachable screen at small / standard / large phone sizes, light + dark, normal + large
// (130%) text, with a simulated notch + home indicator, and checks for horizontal overflow, clipped text, small tap
// targets, content under the safe areas, low-contrast text and onclick handlers that call undefined functions.
// Run with POLISH_REPORT=1 to print every finding. Screenshots: POLISH_SHOTS=1 writes docs/polish/*.png.
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { launch, baseState, sleep } = require('./harness');
const td = (d = new Date()) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const REPORT = !!process.env.POLISH_REPORT, SHOTS = !!process.env.POLISH_SHOTS;
const SAFE = { top: 47, bottom: 34, left: 0, right: 0 };
let p;
test.before(async () => { p = await launch(); });
test.after(async () => { await p.close(); });

// A lived-in profile so lists, charts and history have content.
function richState() {
  const now = Date.now(), day = 864e5;
  const workouts = Array.from({ length: 6 }, (_, i) => ({ ts: now - day * (i + 1), prog: ['push', 'pull', 'legs'][i % 3], sets: [{ ex: 'Bench Press', w: 60 + i, r: 8, xp: 10 }, { ex: 'Squat', w: 80, r: 5, xp: 12 }, { ex: 'Overhead Press', w: 40, r: 8, xp: 8 }], xp: 30, prs: i % 2, dur: 3000 }));
  // same shape the app saves (cardio.js / features.js)
  const run = (ts, type, dist, time) => ({ type, ts, pts: [], dist, time, steps: Math.round(dist * 1.3), d: { run: type === 'run' ? dist : 0, walk: type === 'walk' ? dist : 0 }, t: { run: type === 'run' ? time : 0, walk: type === 'walk' ? time : 0 }, kcal: Math.round(dist / 15) });
  const runs = [run(now - day * 2, 'run', 5200, 1700), run(now - day * 4, 'walk', 3100, 1300)];
  return baseState({ food: { [td()]: [['Chicken adobo with garlic rice and a long descriptive name', 650, 40, 60, 20, 3], ['Banana', 105, 1, 27, 0.4, 3]] },
    weights: [[now - day * 20, 92], [now - day * 10, 91], [now - day * 3, 90]], workouts, runs, water: { [td()]: 750 }, steps: { [td()]: 6400 },
    myMeals: [{ id: 'm1', name: 'Overnight oats with whey', items: [{ id: 'rice_white', g: 100 }] }], quests: { pushup: 2 },
    customEx: { 'Cable Crossover Superlongname Variation': [['Chest'], [], '💪'] } });
}

// [name, code to show the screen]. Code runs in the page; each starts from a clean stack.
const SCREENS = [
  ['today', "go('plan')"], ['discover', "go('discover')"], ['train', "trainSub='workouts';go('train')"], ['train-run', "trainSub='run';go('train')"], ['train-quests', "trainSub='challenges';go('train')"],
  ['meals', "go('meals')"], ['progress', "go('body')"], ['profile', "go('more')"],
  ...['settings', 'notifs', 'fasting', 'splits', 'balance', 'appearance', 'rank', 'rankgallery', 'modes', 'ultra', 'mylib', 'mymeals', 'learn', 'nutrition', 'supps', 'sleep',
    'caltrack', 'science', 'privacy', 'license', 'transfer', 'levelinfo', 'cardiorank', 'hyper', 'foodsci', 'anatomy', 'weekedit', 'routepick'].map(v => [v, `push('${v}')`]),
  ['prog', "push('prog','push')"], ['quest', "push('quest','pushup')"], ['article', "push('article',0)"], ['exhist', "push('exhist','Bench Press')"],
  ['wkdetail', "push('wkdetail',S.workouts[0].ts)"], ['actdetail', "push('actdetail',S.runs[0].ts)"], ['groupedit', "push('groupedit',null)"],
  ['sheet:addfood', "go('meals');foodSheet()"], ['sheet:dish', "go('meals');foodSheet();afOpenDish('adobo')"], ['sheet:measure', "go('body');measSheet&&measSheet()"],
  ['player', "S.active=null;startW('push');render()"],
];
const MAIN = new Set(['today', 'discover', 'train', 'train-run', 'train-quests', 'meals', 'progress', 'profile', 'settings', 'notifs', 'sheet:addfood', 'player']);

// In-page audit. Returns findings for the current screen.
const AUDIT = String.raw`
window.__scaleFonts=k=>{document.querySelectorAll('[data-pf]').forEach(e=>{e.style.removeProperty('font-size');if(e.dataset.pf!=='-')e.style.fontSize=e.dataset.pf;delete e.dataset.pf});
 const els=[...document.querySelectorAll('body *')],s=els.map(e=>parseFloat(getComputedStyle(e).fontSize));els.forEach((e,i)=>{if(!s[i])return;e.dataset.pf=e.style.fontSize||'-';e.style.setProperty('font-size',(s[i]*k).toFixed(2)+'px','important')})};
window.__audit=function(){
 const W=innerWidth,H=innerHeight,out={overflow:[],clip:[],tap:[],safe:[],contrast:[],onclick:[]};
 const d=e=>{const c=typeof e.className==='string'&&e.className.trim()?'.'+e.className.trim().split(/\s+/).slice(0,2).join('.'):'';return e.tagName.toLowerCase()+(e.id?'#'+e.id:'')+c+' "'+(e.innerText||e.value||e.getAttribute('aria-label')||'').trim().replace(/\s+/g,' ').slice(0,30)+'"'};
 const shown=e=>{for(let x=e;x&&x!==document.documentElement;x=x.parentElement){const cs=getComputedStyle(x);if(cs.display==='none'||cs.visibility==='hidden'||+cs.opacity<.05)return false}return true};
 const all=[...document.querySelectorAll('#app *, #sheet.show *, .w-over *, nav *, nav, #sheet.show, .w-over')].filter(e=>!e.closest('svg,.leaflet-container')||e.matches('svg'));
 const box=new Map();for(const e of all){const r=e.getBoundingClientRect();if(r.width>=1&&r.height>=1)box.set(e,r)}
 const vis=all.filter(e=>box.has(e)&&shown(e));
 const ownText=e=>[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim());
 // 1. horizontal overflow: page scrolls sideways, or content pokes past the edge without a scrolling ancestor.
 const sw=Math.max(document.documentElement.scrollWidth,document.body.scrollWidth);if(sw>W+1)out.overflow.push('page scrollWidth '+sw);
 for(const e of vis){const r=box.get(e);if(r.right<=W+1&&r.left>=-1)continue;let a=e.parentElement,inScroll=false;
  for(;a&&a!==document.body;a=a.parentElement){const o=getComputedStyle(a).overflowX;if(o!=='visible'){inScroll=o==='auto'||o==='scroll';if(!inScroll){const ar=a.getBoundingClientRect();if(ar.right<=W+1&&ar.left>=-1){inScroll=true}}break}}
  if(!inScroll&&getComputedStyle(e).position!=='fixed')out.overflow.push(d(e)+' ['+Math.round(r.left)+'..'+Math.round(r.right)+']')}
 // 2. clipped text: overflow hidden/clip with content larger than the box and no ellipsis / line clamp.
 for(const e of vis){const cs=getComputedStyle(e);if(!(e.innerText||'').trim())continue;if(/^(INPUT|SELECT|TEXTAREA)$/.test(e.tagName))continue;
  const hx=cs.overflowX==='hidden'||cs.overflowX==='clip',hy=cs.overflowY==='hidden'||cs.overflowY==='clip';
  if(hx&&cs.textOverflow!=='ellipsis'&&e.scrollWidth>e.clientWidth+1)out.clip.push('x '+d(e)+' '+e.scrollWidth+'>'+e.clientWidth);
  else if(hy&&cs.webkitLineClamp==='none'&&e.scrollHeight>e.clientHeight+1&&e.clientHeight>0)out.clip.push('y '+d(e)+' '+e.scrollHeight+'>'+e.clientHeight);
  else if(!hx&&cs.whiteSpace==='nowrap'&&ownText(e)&&cs.display!=='inline'&&e.scrollWidth>e.clientWidth+1)out.clip.push('spill '+d(e)+' '+e.scrollWidth+'>'+e.clientWidth)}
 // 3. tap targets under 44×44 (effective hit area includes an absolutely positioned ::before/::after that extends past the box).
 const TAP='button,[onclick],a[href],select,summary,[role=button],[role=switch],input:not([type=hidden]),label[for]';
 for(const e of vis){if(!e.matches(TAP))continue;if(e.disabled)continue;const cs=getComputedStyle(e);
  if(e.matches('input')&&e.closest('label'))continue;
  if(cs.display==='inline'&&e.parentElement&&(e.parentElement.innerText||'').trim().length>(e.innerText||'').trim().length+8)continue; // inline text link in a sentence
  const r=box.get(e);let t=0,b=0,l=0,rt=0;
  for(const ps of ['::before','::after']){const pc=getComputedStyle(e,ps);if(pc.content==='none'||pc.position!=='absolute')continue;
   t=Math.max(t,-parseFloat(pc.top)||0);b=Math.max(b,-parseFloat(pc.bottom)||0);l=Math.max(l,-parseFloat(pc.left)||0);rt=Math.max(rt,-parseFloat(pc.right)||0)}
  const w=r.width+l+rt,h=r.height+t+b;if(w<43.5||h<43.5)out.tap.push(d(e)+' '+Math.round(w)+'x'+Math.round(h))}
 // 4. safe areas: text / controls under the notch (top band, at rest) or home indicator (fixed/sticky only), when not covered.
 const ST=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--audit-st'))||0,SB=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--audit-sb'))||0;
 if(ST||SB)for(const e of vis){if(!(ownText(e)||e.matches(TAP)||e.matches('svg')))continue;const r=box.get(e);
  let fixed=false;for(let a=e;a&&a!==document.body;a=a.parentElement){const ps=getComputedStyle(a).position;if(ps==='fixed'||ps==='sticky'){fixed=true;break}}
  const inTop=r.top<ST-1&&r.bottom>0,inBot=fixed&&r.bottom>H-SB+1&&r.top<H;if(!inTop&&!inBot)continue;
  const y=inTop?Math.max(1,r.top+1):Math.min(H-1,r.bottom-1),x=Math.min(W-1,Math.max(1,r.left+r.width/2)),top=document.elementFromPoint(x,y);
  if(top&&(top===e||e.contains(top)))out.safe.push((inTop?'top ':'bottom ')+d(e))}
 // 5. contrast of own text against the composited background (skips text over gradients / images).
 const P=s=>{let m=s.match(/rgba?\(([^)]+)\)/);if(m){const v=m[1].split(/[ ,\/]+/).filter(Boolean).map(Number);return [v[0],v[1],v[2],v[3]??1]}
  m=s.match(/color\(srgb ([^)]+)\)/);if(m){const v=m[1].split(/[ \/]+/).filter(Boolean).map(Number);return [v[0]*255,v[1]*255,v[2]*255,v[3]??1]}return null};
 const L=c=>{const f=x=>{x/=255;return x<=.03928?x/12.92:Math.pow((x+.055)/1.055,2.4)};return .2126*f(c[0])+.7152*f(c[1])+.0722*f(c[2])};
 const over=(top,bot)=>[0,1,2].map(i=>top[i]*top[3]+bot[i]*(1-top[3])).concat(1);
 for(const e of vis){if(!ownText(e))continue;let dim=false;for(let a=e;a&&a!==document.body;a=a.parentElement){const o=a.style&&a.style.opacity;if(o!==''&&o!=null&&+o<=0.5){dim=true;break}}if(dim||e.closest('[disabled],[aria-disabled=true]'))continue; /* inactive controls are exempt (WCAG 1.4.3) */const cs=getComputedStyle(e);let fg=P(cs.color);if(!fg)continue;const layers=[];let unknown=false,op=1;
  for(let a=e;a;a=a.parentElement){const ac=getComputedStyle(a);op*=+ac.opacity;if(ac.backgroundImage!=='none'){unknown=true;break}const bg=P(ac.backgroundColor);if(bg&&bg[3]>0){layers.push(bg);if(bg[3]>=.99)break}}
  if(unknown)continue;let bg=[255,255,255,1];for(let i=layers.length-1;i>=0;i--)bg=over(layers[i],bg);
  fg=over([fg[0],fg[1],fg[2],fg[3]*op],bg);const l1=L(fg),l2=L(bg),cr=(Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05);
  const px=parseFloat(cs.fontSize),big=px>=24||(px>=18.6&&+cs.fontWeight>=700),need=big?3:4.5;
  if(cr<need-.05)out.contrast.push(d(e)+' '+cr.toFixed(2)+'<'+need)}
 // 6. onclick handlers calling functions that do not exist.
 const KW=new Set(['if','for','while','return','function','typeof','new','switch','catch','void','await','delete','in','of','else']);
 for(const e of document.querySelectorAll('[onclick],[oninput],[onchange]')){for(const at of ['onclick','oninput','onchange']){const s=(e.getAttribute(at)||'').replace(/'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"/g,"''");if(!s)continue;
  for(const m of s.matchAll(/(^|[^.\w$])([A-Za-z_$][\w$]*)\s*\(/g)){const n=m[2];if(KW.has(n))continue;let t;try{t=(0,eval)('typeof '+n)}catch(_){t='err'}if(t!=='function')out.onclick.push(n+' in '+d(e))}}}
 for(const k in out)out[k]=[...new Set(out[k])];return out};`;

async function setup({ w, h, dark, font }) {
  await p.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 2, mobile: true });
  await p.send('Emulation.setSafeAreaInsetsOverride', { insets: SAFE }).catch(() => {});
  await p.open({ state: richState() });
  await p.eval(`${AUDIT};S.ui.mode='${dark ? 'dark' : 'light'}';THEME_ON=null;applyTheme();document.documentElement.style.setProperty('--audit-st','${SAFE.top}px');document.documentElement.style.setProperty('--audit-sb','${SAFE.bottom}px');
    window.__polishFont=${font};return 1`);
}
async function visit(code) {
  return p.eval(`try{closeSheet();document.querySelectorAll('.w-over').forEach(e=>e.remove());if(S.active&&!${JSON.stringify(code)}.includes('startW')){S.active=null}stack=[];${code}}catch(e){return {error:e.message}}
    await new Promise(r=>setTimeout(r,450));scrollTo(0,0);if(window.__polishFont!==1)__scaleFonts(window.__polishFont);await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));return __audit()`);
}

const CONFIGS = [
  { w: 320, h: 568, dark: false, font: 1 }, { w: 320, h: 568, dark: true, font: 1 }, { w: 320, h: 568, dark: false, font: 1.3 },
  { w: 390, h: 844, dark: false, font: 1 }, { w: 390, h: 844, dark: true, font: 1.3 }, { w: 430, h: 932, dark: true, font: 1.3 },
];
const RESULTS = [];
for (const c of CONFIGS.filter((_, i) => !process.env.POLISH_ONLY || process.env.POLISH_ONLY.split(',').includes(String(i)))) {
  const tag = `${c.w}x${c.h} ${c.dark ? 'dark' : 'light'} ${Math.round(c.font * 100)}%`;
  test(`audit ${tag}`, async () => {
    await setup(c);
    const errs = [];
    for (const [name, code] of SCREENS) {
      const r = await visit(code);
      if (r.error) { errs.push(name + ': ' + r.error); continue; }
      RESULTS.push({ tag, name, c, r });
    }
    assert.deepEqual(errs, []); assert.deepEqual(p.errors, []);
  });
}

test('report + thresholds', () => {
  const cats = ['overflow', 'clip', 'tap', 'safe', 'contrast', 'onclick'], tot = Object.fromEntries(cats.map(k => [k, 0]));
  for (const x of RESULTS) for (const k of cats) tot[k] += x.r[k].length;
  if (REPORT) {
    for (const x of RESULTS) { const f = cats.filter(k => x.r[k].length); if (f.length) console.log(`\n[${x.tag}] ${x.name}\n` + f.map(k => `  ${k}: ` + x.r[k].join('\n      ')).join('\n')); }
    console.log('\nTOTALS', JSON.stringify(tot));
  }
  const at = (pred, k) => RESULTS.filter(pred).flatMap(x => x.r[k].map(f => `${x.tag} ${x.name}: ${f}`));
  // Thresholds: none of these may regress.
  assert.deepEqual(at(x => true, 'overflow'), [], 'no horizontal overflow on any screen');
  assert.deepEqual(at(x => true, 'clip'), [], 'no clipped text');
  assert.deepEqual(at(x => true, 'tap'), [], 'tap targets at least 44×44');
  assert.deepEqual(at(x => true, 'safe'), [], 'nothing under the notch / home indicator');
  assert.deepEqual(at(x => x.c.dark && MAIN.has(x.name), 'contrast'), [], 'dark-mode contrast on main screens');
  assert.deepEqual(at(x => true, 'onclick'), [], 'every onclick calls a defined function');
});

test('screenshots', { skip: !SHOTS }, async () => {
  const dir = path.join(__dirname, '..', '..', 'docs', 'polish'); fs.mkdirSync(dir, { recursive: true });
  const shots = [['today', "go('plan')"], ['train', "trainSub='workouts';go('train')"], ['meals', "go('meals')"], ['settings', "push('settings')"]];
  for (const c of [{ w: 320, h: 568, dark: false, font: 1 }, { w: 320, h: 568, dark: true, font: 1 }, { w: 430, h: 932, dark: true, font: 1.3 }]) {
    await setup(c);
    for (const [n, code] of shots) { await visit(code); await sleep(100); await p.shot(path.join(dir, `${n}-${c.w}-${c.dark ? 'dark' : 'light'}${c.font > 1 ? '-130' : ''}.png`)); }
  }
});
