// Regression tests for bugs found in the QA pass. Run: npm run test:e2e
const test = require('node:test'), assert = require('node:assert/strict');
const { launch, baseState } = require('./harness');
const td = (d = new Date()) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const NAMES = ["Lola's adobo", '"Big" breakfast', '<b id="xss">test</b>', 'Tom & Jerry', '🍗 chicken', 'x'.repeat(120)];
let p;
test.before(async () => { p = await launch(); });
test.after(async () => { await p.close(); });

test('escaping: hostile names render as text on every screen that shows names', async () => {
  await p.open({ state: baseState({ food: { [td()]: NAMES.map((n, i) => [n, 100 + i, 10, 5, 3, 1]) }, myMeals: NAMES.map((n, i) => ({ id: 'm' + i, name: n, items: [{ id: 'rice_white', g: 100 }] })), favs: ['my:m0', 'my:m2'],
    customEx: { [NAMES[2]]: [['Chest'], [], '💪'], [NAMES[0]]: [['Back'], [], '💪'] }, workouts: [{ ts: Date.now() - 864e5, prog: 'free', sets: [{ ex: NAMES[2], w: 20, r: 10, xp: 5 }, { ex: NAMES[0], w: 10, r: 8, xp: 5 }], xp: 10, prs: 0 }] }) });
  const bad = await p.eval(`const out=[];const chk=n=>{if(document.querySelector('#xss'))out.push('XSS in '+n);if(/&amp;|&#39;|&quot;|&lt;/.test(document.body.innerText))out.push('double-escaped in '+n)};
    const v=[['meals',()=>{stack=[];go('meals')}],['train',()=>{stack=[];trainSub='workouts';go('train')}],['plan',()=>{stack=[];go('plan')}],['mymeals',()=>{stack=[];push('mymeals')}],['search',()=>foodSheet()],['search typed',()=>afSearch('a')],
      ['my meal',()=>afOpenMy('m2')],['plate',()=>{afGo('search');afSearch('');afRelog(0);afRelog(2);afGo('plate')}],['save prompt',()=>afLogPlate()],['caltrack',()=>{closeSheet();stack=[];push('caltrack')}],
      ['player',()=>{S.active=null;startW('free');useEx(${JSON.stringify(NAMES[2])});render()}],['summary',()=>{addSet&&($('#pw').value=10,$('#pr').value=5,addSet());finishW()}]];
    for(const [n,f] of v){try{f();chk(n)}catch(e){out.push(n+' THROW '+e.message)}}return out`);
  assert.deepEqual(bad, []); assert.deepEqual(p.errors, []);
});

test('storage: corrupted JSON does not blank the app', async () => {
  await p.open({ raw: '{"profile":{"name":"x"' });
  assert.ok((await p.eval("return document.querySelector('#app').innerText.length")) > 20); assert.deepEqual(p.errors, []);
});
test('storage: corrupted JSON recovers the last good daily copy', async () => {
  await p.open({ raw: '{bad' });
  await p.eval(`localStorage.setItem('gq_last',JSON.stringify({day:'2026-01-02',data:${JSON.stringify(baseState())}}));localStorage.setItem('gq','{bad')`); await p.reload();
  assert.equal(await p.eval('return S.profile.name'), 'Tester');
});
test('old data: 3-field food entries and missing keys work on every screen', async () => {
  await p.open({ state: { profile: { name: 'Old', goal: 'cut', sex: 'm', age: 30, height: 180, weight: 90, build: 'average', activity: 1.375 }, food: { [td()]: [['Rice', 205, 4], ['Egg', 72, 6]] }, workouts: [], weights: [[Date.now() - 864e5, 90]] } });
  const bad = await p.eval(`const r=[];for(const [n,f] of [['plan',()=>go('plan')],['meals',()=>go('meals')],['train',()=>go('train')],['body',()=>go('body')],['more',()=>go('more')],['search',()=>{foodSheet();afSearch('')}],['caltrack',()=>{closeSheet();push('caltrack')}],['nutrition',()=>push('nutrition')],['sleep',()=>push('sleep')]]){try{f();if(/undefined|NaN/.test(document.body.innerText))r.push(n)}catch(e){r.push(n+' '+e.message)}}return r`);
  assert.deepEqual(bad, []); assert.equal(await p.eval('return S.schemaVersion'), 2);
});
test('render: builder keeps its scroll position when editing an ingredient', async () => {
  await p.open({ state: baseState() });
  const [a, b] = await p.eval(`foodSheet();afOpenDish('karekare');afToBuilder();const s=document.querySelector('.afscr');s.scrollTop=400;const a=s.scrollTop;afEdit(5);return [a,document.querySelector('.afscr').scrollTop]`);
  assert.equal(b, a);
});
test('render: a focused input keeps focus and caret through a re-render', async () => {
  await p.open({ state: baseState() });
  const r = await p.eval(`stack=[];push('settings');const i=document.createElement('input');i.id='probe';document.querySelector('#app').appendChild(i);i.focus();i.value='hello';i.setSelectionRange(2,2);
    const _v=V.settings;V.settings=()=>_v()+'<input id="probe">';render();V.settings=_v;const e=document.activeElement;return [e.id,e.selectionStart]`);
  assert.equal(r[0], 'probe');
});

test('injection anchors: every string anchor used to extend a view is found', async () => {
  await p.open({ state: baseState({ food: { [td()]: [['Rice', 205, 4, 45, 0.4, 0.6, { kind: 'custom', items: [{ id: 'rice_white', g: 158 }] }]] }, fast: { on: true, proto: '16:8', start: 12 } }) });
  await p.eval("localStorage.setItem('rwDev','1')"); await p.reload();
  const miss = await p.eval(`const v=[()=>{stack=[];go('plan')},()=>{stack=[];go('meals')},()=>{stack=[];trainSub='workouts';go('train')},()=>{trainSub='run';go('train')},()=>{trainSub='challenges';go('train')},()=>{stack=[];go('body')},()=>{stack=[];go('more')},
    ()=>push('settings'),()=>push('learn'),()=>push('nutrition'),()=>push('supps'),()=>push('sleep'),()=>push('fasting'),()=>push('prog','push'),()=>{S.active=null;startW('push');render()},()=>{stack=[];go('meals');foodSheet();afOpenDish('adobo')},
    ()=>{closeSheet();startOB();for(let i=0;i<OBSTEPS.length;i++){OB.step=i;render()}OB.active=false;stack=[];go('plan')},()=>{stack=[];push('result')}];
    for(const f of v)f();localStorage.removeItem('rwDev');return window.__anchorMiss`);
  assert.deepEqual(miss, []);
});

test('dates: logging at 23:59 / 00:01 / across year and month ends lands on the local day', async () => {
  for (const [clock, tz, day] of [['2026-12-31T23:59:00+08:00', 'Asia/Manila', '2026-12-31'], ['2027-01-01T00:01:00+08:00', 'Asia/Manila', '2027-01-01'], ['2027-02-28T23:59:30+08:00', 'Asia/Manila', '2027-02-28'], ['2027-01-01T00:30:00+08:00', 'America/New_York', '2026-12-31']]) {
    await p.open({ state: baseState(), clock, tz });
    const r = await p.eval(`foodSheet();afOpenIng('banana');afIngToPlate(true);closeSheet();for(const t of ['plan','meals','body','train'])go(t);push('caltrack');return [today(),Object.keys(S.food).filter(k=>S.food[k].length)]`);
    assert.equal(r[0], day); assert.deepEqual(r[1], [day]); assert.deepEqual(p.errors, []);
  }
});
test('dates: app left open past midnight moves "today" forward instead of logging into yesterday', async () => {
  await p.open({ state: baseState() });
  const r = await p.eval(`const y=(()=>{const d=new Date();d.setDate(d.getDate()-1);return iso(d)})();viewDate=y;__setLastToday(y);__dayTick();return viewDate===today()`);
  assert.equal(r, true);
});

test('emoji replacer: user-entered emoji stay as typed; app emoji still become icons', async () => {
  await p.open({ state: baseState({ food: { [td()]: [['🍗 chicken', 300, 30]] }, myMeals: [{ id: 'm1', name: '🥗 salad 1️⃣', items: [{ id: 'lettuce', g: 100 }] }] }) });
  const r = await p.eval(`go('meals');await new Promise(r=>setTimeout(r,200));const row=[...document.querySelectorAll('.plist .li b')].find(b=>b.textContent.includes('chicken'));
    foodSheet();await new Promise(r=>setTimeout(r,200));const my=[...document.querySelectorAll('.afli b')].find(b=>b.textContent.includes('salad'));
    return {food:row.textContent.replace(/\\u2060/g,''),foodSvg:!!row.querySelector('svg'),my:my.textContent.replace(/\\u2060/g,'').trim(),appIcons:document.querySelectorAll('#app svg.ic').length}`);
  assert.equal(r.food, '🍗 chicken'); assert.equal(r.foodSvg, false); assert.ok(r.my.startsWith('🥗 salad 1️⃣'), r.my); assert.ok(r.appIcons > 0);
});
test('emoji replacer: cost on a 600-row list stays small', async () => {
  await p.open({ state: baseState() });
  const ms = await p.eval(`const html=Array.from({length:600},(_, i)=>'<div class="row">🍽️ Item '+i+' 🔥 '+i+'</div>').join('');const t=performance.now();document.querySelector('#app').innerHTML=html;await new Promise(r=>setTimeout(r,0));return performance.now()-t`);
  assert.ok(ms < 250, `${ms} ms`);
});

test('storage: 2-year history loads and renders within budget', async () => {
  await p.open({ state: baseState() });
  await p.eval(`const D=864e5,now=Date.now(),s=JSON.parse(localStorage.getItem('gq'));s.food={};s.workouts=[];s.weights=[];
    for(let i=730;i>=0;i--){const d=iso(now-i*D);s.food[d]=Array.from({length:5},(_,k)=>['Adobo '+k,354,22,5,27,0.3,{kind:'dish',dish:'adobo',variant:'chicken',items:[{id:'chicken_thigh_skin',g:130},{id:'oil_veg',g:4.5,oil:true}],mult:1}]);s.weights.push([now-i*D,90-i*0.01]);if(i%2===0)s.workouts.push({ts:now-i*D,prog:'push',sets:Array.from({length:20},()=>({ex:'Bench Press',w:60,r:8,xp:12})),xp:240,prs:0})}
    localStorage.setItem('gq',JSON.stringify(s));localStorage.removeItem('gq_last')`);
  await p.reload();
  const r = await p.eval(`const t=f=>{const a=performance.now();f();return performance.now()-a};const o={kb:localStorage.getItem('gq').length/1024};for(const v of ['plan','meals','train','body'])o[v]=t(()=>{stack=[];go(v)});o.caltrack=t(()=>push('caltrack'));o.save=t(()=>save());o.rows=document.querySelectorAll('#app .list .row').length;return o`);
  for (const k of ['plan', 'meals', 'train', 'body', 'caltrack', 'save']) assert.ok(r[k] < 400, `${k} ${r[k]} ms`);
  assert.ok(r.rows <= 93, 'calorie track list is paged'); assert.deepEqual(p.errors, []);
});
