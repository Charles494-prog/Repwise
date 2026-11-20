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
