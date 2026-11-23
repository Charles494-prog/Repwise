// Fixes from device testing: choosing a dish's version when building a meal, the muscle-parts card on focus workouts,
// research-based rest times, and the sticky action button's backdrop.
const test = require('node:test'), assert = require('node:assert/strict');
const { launch, baseState } = require('./harness');
let p;
test.before(async () => { p = await launch(); });
test.after(async () => { await p.close(); });
const D = '2026-11-23', clock = `${D}T10:00:00`, wait = ms => `await new Promise(r=>setTimeout(r,${ms}));`;

test('create meal → add adobo: the dish screen opens so you choose chicken / pork / kangkong; "Change" edits it later', async () => {
  await p.open({ state: baseState(), clock });
  const r = await p.eval(`foodSheet();afNewMeal('Lunch');${wait(200)}afGo('mealpick');${wait(200)}
    const d=FOODDB.DISHES.find(x=>x.id==='adobo')||FOODDB.DISHES.find(x=>x.variants.length>1);afMealAdd('dish',d.id);${wait(300)}
    const screen=AF.screen,chips=[...document.querySelectorAll('#sheet .chips button')].map(b=>b.innerText.trim()),btn=$('#sheet .afbar .btn')?.innerText||'';
    const want=d.variants[1];afVar(want.id);${wait(150)}afDishToMeal();${wait(300)}
    const after={screen:AF.screen,item:AF.med.items[0],txt:$('#sheet').innerText};
    afMedEdit(0);${wait(250)}const editBtn=$('#sheet .afbar .btn')?.innerText||'';afVar(d.variants[0].id);afDishToMeal();${wait(300)}
    return {dish:d.name,variants:d.variants.map(v=>v.name),want:want.id,screen,chips,btn,after,editBtn,edited:AF.med.items[0],count:AF.med.items.length}`);
  assert.equal(r.screen, 'dish', 'picking a dish opens its set-up screen');
  for (const v of r.variants) assert.ok(r.chips.includes(v), `variant chip ${v}`);
  assert.match(r.btn, /Add to meal/);
  assert.equal(r.after.screen, 'mealed'); assert.equal(r.after.item.v, r.want, 'chosen variant saved, not the first one');
  assert.match(r.after.txt, /Change/); assert.match(r.editBtn, /Update meal/);
  assert.notEqual(r.edited.v, r.want); assert.equal(r.count, 1, 'Change replaces the item, it does not add another');
  assert.deepEqual(p.errors, []);
});

test('Muscle parts covered on a Biceps + Triceps focus only judges biceps and triceps (no "Chest 0/3")', async () => {
  await p.open({ state: baseState({ planFrom: '2026-11-01', missedFrom: '2099-01-01', split: 'ppl' }), clock });
  const r = await p.eval(`S.todayFocus={date:'${D}',areas:['triceps','biceps']};const k=regFocus(['triceps','biceps']);stack=[];push('prog',k);${wait(200)}return $('#app').innerText`);
  assert.match(r, /Muscle parts covered/); assert.match(r, /Triceps/); assert.match(r, /Biceps/);
  assert.doesNotMatch(r, /Chest \d\/3/); assert.doesNotMatch(r, /Chest · Upper/);
  assert.deepEqual(p.errors, []);
});

test('rest times: ~3 min heavy lower-body, 2:30 other compounds, 1:30 isolation; shown on the plan; your own settings still win', async () => {
  await p.open({ state: baseState(), clock });
  const r = await p.eval(`const t=['Squat','Romanian Deadlift','Bench Press','Barbell Row','Barbell Curl','Lateral Raise'].map(restFor);
    stack=[];push('prog','push');${wait(150)}const plan=$('#app').innerText;S.restSec={i:60};const own=restFor('Barbell Curl');delete S.restSec;return {t,plan,own}`);
  assert.deepEqual(r.t, [180, 180, 150, 150, 90, 90]);
  assert.match(r.plan, /rest 2:30/); assert.match(r.plan, /rest 1:30/);
  assert.equal(r.own, 60);
  assert.deepEqual(p.errors, []);
});

test('the sticky "Restart / Start" button has a solid backdrop so card text never shows underneath', async () => {
  await p.open({ state: baseState(), clock });
  const r = await p.eval(`stack=[];push('prog','pull');${wait(200)}const s=document.querySelector('.sticky');return s?getComputedStyle(s).backgroundImage:''`);
  assert.match(r, /linear-gradient/);
  assert.deepEqual(p.errors, []);
});
