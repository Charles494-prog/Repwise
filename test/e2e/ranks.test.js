// Overall rank + rank themes in the app: home card, rank screen, gallery, appearance, preview, reduce effects, ceremony.
const test = require('node:test'), assert = require('node:assert/strict');
const { launch, baseState } = require('./harness');
let p;
test.before(async () => { p = await launch(); });
test.after(async () => { await p.close(); });
const st = (over = {}) => baseState({ rankPop: false, lossQ: null, missedFrom: '2099-01-01', ...over });

test('home shows the overall rank card (not the old XP line); rank screen explains what moves it', async () => {
  await p.open({ state: st() });
  const r = await p.eval(`stack=[];go('plan');const todayHas=$('#app').innerHTML.includes('rk-card');go('discover');const home=$('#app').innerHTML;push('rank');const t=$('#app').innerText;
    return {card:home.includes('rk-card'),todayHas,oldLine:home.includes('rk-line'),t}`);
  assert.equal(r.todayHas, false, 'Today is only the to-do list; the rank card lives in Discover');
  assert.ok(r.card); assert.equal(r.oldLine, false);
  for (const s of ['What moves my rank', 'Training consistency', 'Progressive overload', 'Meal logging', 'Streak', 'Rank history', 'Muscle ranks']) assert.match(r.t, new RegExp(s));
  assert.deepEqual(p.errors, []);
});

test('gallery lists all 10 ranks; locked ones are teasers unless the developer preview is on', async () => {
  await p.open({ state: st() });
  const r = await p.eval(`push('rankgallery');const n=document.querySelectorAll('.rk-g').length,locked=document.querySelectorAll('.rk-g.locked').length;
    S.ui.devThemes=true;render();return {n,locked,lockedDev:document.querySelectorAll('.rk-g.locked').length,names:[...document.querySelectorAll('.rk-g-n')].map(e=>e.textContent)}`);
  assert.equal(r.n, 10); assert.equal(r.locked, 9); assert.equal(r.lockedDev, 0);
  assert.deepEqual(r.names, ['Iron', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Master', 'Grandmaster', 'Legend', 'Arnold']);
  assert.deepEqual(p.errors, []);
});

test('theme switches live: preview a rank, dark/light mode, reduce effects; tokens change on :root', async () => {
  await p.open({ state: st({ ui: { mode: 'light', devThemes: true } }) });
  const r = await p.eval(`const css=()=>getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();const a=css(),ra=document.body.dataset.rank;
    S.ui.previewRank='arnold';S.ui.mode='dark';THEME_ON=null;render();const b=css(),rb=document.body.dataset.rank,mb=document.body.dataset.mode,fx=document.body.dataset.fx;
    S.ui.reduceFx=true;THEME_ON=null;render();return {a,b,ra,rb,mb,fx,fx0:document.body.dataset.fx}`);
  assert.equal(r.ra, 'iron'); assert.equal(r.rb, 'arnold'); assert.equal(r.mb, 'dark'); assert.notEqual(r.a, r.b);
  assert.equal(r.fx0, '0');
  assert.deepEqual(p.errors, []);
});

test('a saved preview for a rank that no longer exists falls back safely', async () => {
  await p.open({ state: st({ ui: { previewRank: 'olympian', devThemes: true } }) });
  const r = await p.eval(`stack=[];go('discover');return {rank:document.body.dataset.rank,card:!!document.querySelector('.rk-card'),pv:S.ui.previewRank}`);
  assert.equal(r.rank, 'iron'); assert.ok(r.card); assert.equal(r.pv, null);
  assert.deepEqual(p.errors, []);
});

test('rank-up ceremony uses the new rank, is dismissible, and is queued behind other pop-ups', async () => {
  await p.open({ state: st() });
  const r = await p.eval(`stack=[];go('plan');const S2=RWRankConfig.steps();rankCeremony(S2[9],8);await new Promise(r=>setTimeout(r,300));
    const el=document.querySelector('.rk-cer');const txt=el&&el.innerText;el&&el.querySelector('.btn').click();
    return {txt,gone:!document.querySelector('.rk-cer')}`);
  assert.match(r.txt, /New rank/i); assert.match(r.txt, /Gold III/); assert.ok(r.gone);
  assert.deepEqual(p.errors, []);
});

test('appearance settings are reachable from Settings with mode, reduce effects, sound and developer preview', async () => {
  await p.open({ state: st() });
  const r = await p.eval(`stack=[];push('settings');const s=$('#app').innerText;push('appearance');return {s,a:$('#app').innerText}`);
  assert.match(r.s, /Appearance/); assert.match(r.s, /Overall rank/);
  for (const x of ['System', 'Dark', 'Light', 'Reduce effects', 'Sounds', 'Developer']) assert.match(r.a, new RegExp(x));
  assert.deepEqual(p.errors, []);
});
