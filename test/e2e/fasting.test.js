// Fasting window in the app: no warning inside the window, supportive notes outside it, old false breaks cleaned up.
const test = require('node:test'), assert = require('node:assert/strict');
const { launch, baseState } = require('./harness');
let p;
test.before(async () => { p = await launch(); });
test.after(async () => { await p.close(); });
const D = '2026-11-23', at = (h, m = 0, d = D) => `${d}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
const ts = (h, m, d) => new Date(at(h, m, d)).getTime();
const fast = { on: true, proto: '16:8', start: 12 };
const ready = () => p.eval(`for(let i=0;i<50&&typeof foodSheet!=='function';i++)await new Promise(r=>setTimeout(r,50));return true`);

test('the reported case: 12:57 with a 12:00 window logs with no warning and no "Nth time this week"', async () => {
  // yesterday's 9 pm meal used to "restart" the fast until 1 pm today
  await p.open({ state: baseState({ fast: { ...fast, reset: ts(21, 0, '2026-11-22') }, fastLog: [[ts(21, 0, '2026-11-22'), 9], [ts(12, 50, '2026-11-22'), 15.8], [ts(12, 40, '2026-11-21'), 15.6], [ts(12, 30, '2026-11-20'), 15.5]] }), clock: at(12, 57), autoDialogs: false,
    inject: `window.__asked=[];window.confirm=m=>{window.__asked.push(m);return true}` });
  await ready();
  const r = await p.eval(`foodSheet();afOpenIng('egg');afIngToPlate(true);await new Promise(r=>setTimeout(r,700));
    return {asked:window.__asked.length,sheet:$('#sheet').innerText,open:fastState().open,log:S.fastLog.map(x=>x.out),reset:'reset' in S.fast,n:RWFast.weekCount(S.fastLog,Date.now())}`);
  assert.equal(r.asked, 0); assert.equal(r.open, true); assert.equal(r.reset, false);
  assert.doesNotMatch(r.sheet, /time this week|outside your window/);
  assert.deepEqual(r.log, [true, false, false, false]); assert.equal(r.n, 1);
  assert.deepEqual(p.errors, []);
});

test('outside the window: asks once, then a supportive note; at 3+ this week it offers to shift the window', async () => {
  const log = [21, 21].map((h, i) => ({ ts: ts(h, 30, `2026-11-2${i + 1}`), out: true, side: 'after' }));
  await p.open({ state: baseState({ fast, fastLog: log }), clock: at(21, 15), autoDialogs: false, inject: `window.__asked=[];window.confirm=m=>{window.__asked.push(m);return true}` });
  await ready();
  const r = await p.eval(`foodSheet();afOpenIng('egg');afIngToPlate(true);await new Promise(r=>setTimeout(r,800));return {asked:window.__asked,sheet:$('#sheet').innerText}`);
  assert.equal(r.asked.length, 1); assert.match(r.asked[0], /closed at 8/);
  assert.match(r.sheet, /3 meals outside your window this week/); assert.match(r.sheet, /Shift my window to 1:30/);
  assert.doesNotMatch(r.sheet, /Please stop/);
  assert.deepEqual(p.errors, []);
});

test('late start inside the window: optional gentle insight after the grace period, once a day; can be turned off', async () => {
  await p.open({ state: baseState({ fast }), clock: at(13, 20), autoDialogs: false, inject: `window.__asked=[];window.confirm=m=>{window.__asked.push(m);return true}` });
  await ready();
  const r = await p.eval(`foodSheet();afOpenIng('egg');afIngToPlate(true);await new Promise(r=>setTimeout(r,800));const s1=$('#sheet').innerText;closeSheet();
    S.fast.lateInsight=false;S.fast.lateSeen=null;foodSheet();afOpenIng('banana');afIngToPlate(true);await new Promise(r=>setTimeout(r,800));
    return {asked:window.__asked.length,s1,s2:$('#sheet').innerText,out:S.fastLog.length}`);
  assert.equal(r.asked, 0); assert.equal(r.out, 0);
  assert.match(r.s1, /You broke your fast at/); assert.match(r.s1, /1 h 20 min after your window opened/);
  assert.doesNotMatch(r.s2, /You broke your fast/);
  assert.deepEqual(p.errors, []);
});
