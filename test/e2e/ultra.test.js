// Ultra-Health Mode + Modes: disclaimer once, dashboard, hard added-sugar block, off-switch, Modes card and screen.
const test = require('node:test'), assert = require('node:assert/strict');
const { launch, baseState } = require('./harness');
let p;
test.before(async () => { p = await launch(); });
test.after(async () => { await p.close(); });
const D = '2026-11-23', clock = `${D}T13:00:00`, wait = ms => `await new Promise(r=>setTimeout(r,${ms}));`;
const ready = () => p.eval(`for(let i=0;i<50&&(typeof foodSheet!=='function'||!V.ultra||!V.modes);i++)await new Promise(r=>setTimeout(r,50));return true`);
// 30 g of added sugar already today (male limit 36 g)
const sweet = { [D]: [['Champorado', 300, 5, 60, 3, 2, { kind: 'custom', items: [{ id: 'sugar', g: 30 }], mult: 1 }]] };

test('turning it on shows the disclaimer once; the dashboard renders limits, readings and the reminder', async () => {
  await p.open({ state: baseState({ food: sweet, bp: [1, 2, 3, 4, 5].map(i => [Date.now() - i * 864e5, 134, 86, 70]) }), clock });
  await ready();
  const r = await p.eval(`stack=[];push('ultra');const off=$('#app').innerText;
    toggleUltra();const sheet1=$('#sheet').innerText,on1=S.ultra.on;
    ultraAccept();${wait(300)}const on2=S.ultra.on;const dash=$('#app').innerText;
    toggleUltra(false);closeSheet();${wait(400)}toggleUltra(true);const sheet3=$('#sheet').classList.contains('show')?$('#sheet').innerText:'';
    return {off,sheet1,on1,on2,dash,sheet3,on3:S.ultra.on,water:targets().water}`);
  assert.match(r.off, /What it does/); assert.match(r.off, /not medical advice/);
  assert.match(r.sheet1, /general wellness guidance, not medical advice/i); assert.equal(r.on1, false);
  assert.equal(r.on2, true);
  assert.match(r.dash, /Today: limits vs intake/); assert.match(r.dash, /Added sugar\s*30 \/ 36 g/);
  assert.match(r.dash, /Sodium limit lowered to 1,500 mg because your last 5 BP readings averaged 134\/86/);
  assert.match(r.dash, /General wellness guidance, not medical advice/);
  assert.match(r.dash, /Nutrient gaps/); assert.match(r.dash, /Blood pressure/);
  assert.doesNotMatch(r.sheet3, /not medical advice/);               // disclaimer only the first time
  assert.equal(r.on3, true); assert.equal(r.water, 3750);             // 3,250 ml + 15%
  assert.deepEqual(p.errors, []);
});

test('a sugary log is blocked with the over-amount and the off-switch hint; logging works again when the mode is off', async () => {
  await p.open({ state: baseState({ food: sweet, ultra: { on: true, ack: 1 } }), clock });
  await ready();
  const r = await p.eval(`foodSheet();afOpenIng('softdrink');afIngToPlate(true);${wait(300)}
    const sheet=$('#sheet').innerText,n1=S.food['${D}'].length;closeSheet();${wait(400)}
    foodSheet();afOpenIng('egg');afIngToPlate(true);${wait(500)}const n2=S.food['${D}'].length;closeSheet();${wait(400)}
    stack=[];go('meals');${wait(100)}const meals=$('#app').innerText;
    toggleUltra(false);foodSheet();afOpenIng('softdrink');afIngToPlate(true);${wait(500)}
    return {meals,sheet,n1,n2,n3:S.food['${D}'].length,last:S.food['${D}'].at(-1)[0]}`);
  assert.match(r.sheet, /Not logged/); assert.match(r.sheet, /adds ~11 g/); assert.match(r.sheet, /41 g of 36 g/); assert.match(r.sheet, /5 g over/);
  assert.match(r.sheet, /Turning Ultra-Health Mode off removes this block/);
  assert.match(r.sheet, /Water, sparkling water or unsweetened green tea/);
  assert.match(r.meals, /Added sugar ~\d+ g of 36 g limit/); assert.match(r.meals, /Ultra-Health: Sugar \d+\/36 g/);
  assert.equal(r.n1, 1);                                              // blocked
  assert.equal(r.n2, 2);                                              // a sugar-free food still logs
  assert.equal(r.n3, 3); assert.match(r.last, /Soft drink/);          // mode off: no block
  assert.deepEqual(p.errors, []);
});

test('Modes card on home and Modes screen from Settings list every mode with its state', async () => {
  await p.open({ state: baseState({ fast: { on: true, proto: '16:8', start: 12 } }), clock });
  await ready();
  const r = await p.eval(`stack=[];go('plan');${wait(100)}const card=document.querySelector('.md-card');const home=card?card.innerText:'';
    const rows=[...card.querySelectorAll('.md-row')].map(x=>x.dataset.mode);
    card.querySelector('[data-mode="rank"] .sw').click();const rank=S.rankPop;
    push('settings');const set=$('#app').innerText;
    [...document.querySelectorAll('#app .row')].find(x=>x.innerText.includes('Modes & features')).click();${wait(100)}
    const scr=$('#app').innerText,modes=[...document.querySelectorAll('#app .md-row')].map(x=>x.dataset.mode).filter(Boolean);
    document.querySelector('#app [data-mode="ultra"] .sw').click();const disc=$('#sheet').innerText;
    return {home,rows,rank,set,scr,modes,disc}`);
  assert.match(r.home, /Modes/); assert.match(r.home, /Ultra-Health Mode/); assert.match(r.home, /Intermittent fasting/);
  assert.deepEqual(r.rows, ['ultra', 'fast', 'balance', 'rank', 'rot', 'notif']);
  assert.equal(r.rank, false);                                         // the switch calls the existing toggle
  assert.match(r.set, /Modes & features/); assert.match(r.set, /Ultra-Health Mode\s*Off/);
  assert.match(r.scr, /Modes & features/); assert.match(r.scr, /Rotate equivalent exercises/); assert.match(r.scr, /Equipment/);
  for (const m of ['ultra', 'fast', 'late', 'balance', 'rank', 'rot', 'deload', 'steps', 'routes', 'notif', 'lang', 'ai']) assert.ok(r.modes.includes(m), m);
  assert.match(r.disc, /not medical advice/);
  assert.deepEqual(p.errors, []);
});
