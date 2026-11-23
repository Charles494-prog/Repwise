// Ultra-Health follow-up: health-context fasting warning (Eat now / Wait), bedtime tip, late-meal window shift with
// morning notice + notification, healthiest-fasting nudges, sodium entry for unknown foods, Nutrition badge, Progress card.
const test = require('node:test'), assert = require('node:assert/strict');
const { launch, baseState } = require('./harness');
let p;
test.before(async () => { p = await launch(); });
test.after(async () => { await p.close(); });
const wait = ms => `await new Promise(r=>setTimeout(r,${ms}));`;
const ready = () => p.eval(`for(let i=0;i<50&&(typeof foodSheet!=='function'||!V.ultra||typeof ultraShift!=='function');i++)await new Promise(r=>setTimeout(r,50));return true`);
const FAST = { on: true, proto: '16:8', start: 12 };
const st = (over = {}) => baseState({ ultra: { on: true, ack: 1 }, fast: FAST, ...over });
const logEgg = `foodSheet();afOpenIng('egg');afIngToPlate(true);${wait(500)}`;
const NOTIF = `const N=[];window.Capacitor={Plugins:{LocalNotifications:{checkPermissions:async()=>({display:'granted'}),requestPermissions:async()=>({display:'granted'}),getPending:async()=>({notifications:[]}),cancel:async()=>{},schedule:async o=>N.push(...o.notifications),addListener(){}}}};`;

test('outside the window: warning with health context; Wait does not log, Eat now logs and counts', async () => {
  await p.open({ state: st(), clock: '2026-11-23T09:00:00' });
  await ready();
  const r = await p.eval(`${logEgg}const sheet=$('#sheet').innerText,n0=(S.food[today()]||[]).length;ulWait();${wait(400)}
    ${logEgg}ulEatNow();${wait(600)}return {sheet,n0,n1:(S.food[today()]||[]).length,out:S.fastLog.filter(x=>x.out).length,meals:S.mealTs.length}`);
  assert.match(r.sheet, /Still fasting — your window opens in 3 h/); assert.match(r.sheet, /It opens at 12:00 PM/);
  assert.match(r.sheet, /You're low on protein today so far/); assert.match(r.sheet, /Eat now/); assert.match(r.sheet, /Wait/);
  assert.equal(r.n0, 0); assert.equal(r.n1, 1); assert.equal(r.out, 1); assert.equal(r.meals, 1);
  assert.deepEqual(p.errors, []);
});

test('a late meal shifts tomorrow: warning says so, notification next morning, Today notice, eating before the new opening warns', async () => {
  await p.open({ state: st(), clock: '2026-11-23T23:00:00' });
  await ready();
  const a = await p.eval(`${NOTIF}${logEgg}const sheet=$('#sheet').innerText;ulEatNow();${wait(900)}
    const n=N.filter(x=>x.id===2290).map(x=>({t:x.title,b:x.body,h:new Date(x.schedule.at).getHours(),d:new Date(x.schedule.at).getDate()}));delete window.Capacitor;
    return {sheet,n,mealTs:S.mealTs,fastLog:S.fastLog}`);
  assert.match(a.sheet, /Your eating window has closed/); assert.match(a.sheet, /tomorrow's window opens at 3:00 PM \(16 h after this meal\) instead of 12:00 PM/);
  assert.match(a.sheet, /Close to bedtime/);
  assert.equal(a.n.length, 1); assert.match(a.n[0].t, /opens at 3:00 PM today/); assert.match(a.n[0].b, /You ate at 11:00 PM/); assert.equal(a.n[0].h, 8); assert.equal(a.n[0].d, 24);
  // next morning
  await p.open({ state: st({ mealTs: a.mealTs, fastLog: a.fastLog }), clock: '2026-11-24T13:00:00' });
  await ready();
  const b = await p.eval(`stack=[];go('plan');${wait(100)}const today=$('#ulshift')?.innerText||'';${logEgg}const sheet=$('#sheet').innerText;ulEatNow();${wait(600)}
    return {today,sheet,out:S.fastLog.filter(x=>x.out).length,shifted:S.fastLog.at(-1).shifted}`);
  assert.match(b.today, /Today your window opens at 3:00 PM/); assert.match(b.today, /You ate at 11:00 PM/); assert.match(b.today, /still closes at 8:00 PM/);
  assert.match(b.sheet, /Your window opens at 3:00 PM today/); assert.match(b.sheet, /You ate at 11:00 PM/);
  assert.equal(b.out, 2); assert.equal(b.shifted, true);
  // the day after: back to normal (no chain reaction from the 1 PM meal)
  const mealTs = await p.eval(`return S.mealTs`), log = await p.eval(`return S.fastLog`);
  await p.open({ state: st({ mealTs, fastLog: log }), clock: '2026-11-25T12:30:00' });
  await ready();
  const c = await p.eval(`stack=[];go('plan');${wait(100)}const notice=!!$('#ulshift');${logEgg}return {notice,n:(S.food[today()]||[]).length,sheet:$('#sheet').classList.contains('show')?$('#sheet').innerText:''}`);
  assert.equal(c.notice, false); assert.equal(c.n, 1); assert.doesNotMatch(c.sheet, /window/i);
  assert.deepEqual(p.errors, []);
});

test('no shift when Ultra-Health is off: the same late meal only uses the normal fasting warning', async () => {
  await p.open({ state: st({ ultra: { on: false, ack: 1 }, mealTs: [new Date('2026-11-23T23:00:00').getTime()] }), clock: '2026-11-24T13:00:00' });
  await ready();
  const r = await p.eval(`stack=[];go('plan');${wait(100)}const notice=!!$('#ulshift');${logEgg}return {notice,n:(S.food[today()]||[]).length,shift:ultraShift()}`);
  assert.equal(r.notice, false); assert.equal(r.n, 1); assert.equal(r.shift, null);
  assert.deepEqual(p.errors, []);
});

test('bedtime: a full meal inside the window gets the light-snack tip; a small snack does not; the tip can be turned off', async () => {
  await p.open({ state: st({ fast: { on: true, proto: '14:10', start: 12, lateInsight: false }, sleepTime: 23 }), clock: '2026-11-23T21:00:00' });
  await ready();
  const meal = `{name:'Rice meal',totals:{kcal:600,p:12,c:130,f:2,fib:2},mult:1,meta:{kind:'dish',items:[{id:'rice_white',g:460}]}}`;
  const r = await p.eval(`__afLog([${meal}]);${wait(400)}
    const big=$('#sheet').classList.contains('show')?$('#sheet').innerText:'',n0=(S.food[today()]||[]).length;ulBedLog();${wait(600)}const n1=(S.food[today()]||[]).length;closeSheet();${wait(300)}
    ${logEgg}const small=$('#ulbed')?1:0,n2=(S.food[today()]||[]).length;return {big,n0,n1,n2,small}`);
  assert.match(r.big, /A lighter option before bed\?/); assert.match(r.big, /stay up about 2–3 hours/); assert.match(r.big, /Crispim/); assert.equal(r.n0, 0); assert.equal(r.n1, 1);
  assert.equal(r.small, 0); assert.equal(r.n2, r.n1 + 1);
  const off = await p.eval(`stack=[];push('ultra');${wait(100)}const set=$('#ulfastset')?.innerText||'';S.ultra.bedTip=false;save();return {set}`);
  assert.match(off.set, /Bedtime[\s\S]*11 PM/); assert.match(off.set, /Bedtime snack tip/); assert.match(off.set, /Late-meal window shift notice/);
  assert.deepEqual(p.errors, []);
});

test('healthiest-fasting nudges show on Fasting and Ultra-Health (suggestions, with source)', async () => {
  await p.open({ state: st({ sleepTime: 22 }), clock: '2026-11-23T13:00:00' });
  await ready();
  const r = await p.eval(`stack=[];push('fasting');${wait(100)}const f=$('#app').innerText;stack=[];push('ultra');${wait(100)}return {f,u:$('#app').innerText,start:S.fast.start}`);
  assert.match(r.f, /Healthiest fasting/); assert.match(r.f, /Try an earlier window/); assert.match(r.f, /Finish eating ~3 h before bed/); assert.match(r.f, /Sutton et al\., 2018/);
  assert.match(r.u, /Healthiest fasting/); assert.equal(r.start, 12, 'never changes the window by itself');
  assert.deepEqual(p.errors, []);
});

test('sodium: Ultra-Health ON needs a value for a custom ingredient (remembered); OFF logs without it', async () => {
  const ing = { id: 'x1', name: 'Mystery chips', ref: '100g', size: null, unit: 'g', vals: { kcal: 500, p: 5, c: 60, f: 25 } };
  await p.open({ state: st({ fast: { on: false, proto: '16:8', start: 12 }, myIngredients: [ing] }), clock: '2026-11-23T13:00:00' });
  await ready();
  const r = await p.eval(`foodSheet();afOpenIng('my_x1');afIngToPlate(true);${wait(500)}const ask=$('#sheet').innerText,n0=(S.food[today()]||[]).length;
    naSave();const n1=(S.food[today()]||[]).length;$('#nasheet [data-na="0"]').value='600';naSave();${wait(600)}
    const n2=(S.food[today()]||[]).length,saved=S.myIngredients[0].vals.na,per=FOODDB.ING.my_x1.per100.na;closeSheet();${wait(300)}
    foodSheet();afOpenIng('my_x1');afIngToPlate(true);${wait(500)}const n3=(S.food[today()]||[]).length,again=!!$('#nasheet');
    return {ask,n0,n1,n2,n3,saved,per,again}`);
  assert.match(r.ask, /Add sodium to log this/); assert.match(r.ask, /Mystery chips — sodium per 100 g/);
  assert.equal(r.n0, 0); assert.equal(r.n1, 0, 'empty value is not accepted'); assert.equal(r.n2, 1);
  assert.equal(r.saved, 600); assert.equal(r.per, 600); assert.equal(r.n3, 2); assert.equal(r.again, false);
  // Ultra-Health off: no question
  const ing2 = { id: 'x2', name: 'Other chips', ref: '100g', unit: 'g', vals: { kcal: 500 } };
  await p.open({ state: st({ ultra: { on: false, ack: 1 }, fast: { on: false, proto: '16:8', start: 12 }, myIngredients: [ing2] }), clock: '2026-11-23T13:00:00' });
  await ready();
  const o = await p.eval(`foodSheet();afOpenIng('my_x2');afIngToPlate(true);${wait(500)}return {n:(S.food[today()]||[]).length,ask:!!$('#nasheet')}`);
  assert.equal(o.n, 1); assert.equal(o.ask, false);
  assert.deepEqual(p.errors, []);
});

test('Nutrition badge is green / amber / red; Progress shows elevated BP and glucose with a suggestion', async () => {
  const D = '2026-11-23', now = new Date(`${D}T13:00:00`).getTime();
  const bp = [1, 2, 3, 4, 5].map(i => [now - i * 864e5, 134, 86, 70]), glu = [1, 2, 3].map(i => [now - i * 864e5, 108, 'fasting']);
  await p.open({ state: st({ fast: { on: false, proto: '16:8', start: 12 }, bp, glu }), clock: `${D}T13:00:00` });
  await ready();
  const r = await p.eval(`const out={};stack=[];go('meals');${wait(100)}out.g=$('#ulbadge')?.className;
    S.food[today()]=[['Salty',500,10,50,10,0,{items:[{id:'soy_sauce',g:24}]}]];save();render();${wait(100)}out.a=$('#ulbadge')?.className;
    S.food[today()].push(['Salty 2',100,1,1,1,0,{items:[{id:'patis',g:20}]}]);save();render();${wait(100)}out.r=$('#ulbadge')?.className;
    $('#ulbadge').click();${wait(100)}out.nav=$('#app').innerText.includes('Today: limits vs intake');
    stack=[];go('body');${wait(150)}out.body=$('#ulbody')?.innerText||'';toggleUltra(false);stack=[];go('body');${wait(100)}out.off=!!$('#ulbody');go('meals');out.offBadge=!!$('#ulbadge');return out`);
  assert.match(r.g, /green/); assert.match(r.a, /amber/); assert.match(r.r, /red/); assert.ok(r.nav);
  assert.match(r.body, /Blood pressure 134\/86/); assert.match(r.body, /talk to your doctor/); assert.match(r.body, /Fasting blood sugar 108 mg\/dL/); assert.match(r.body, /prediabetes range/);
  assert.equal(r.off, false); assert.equal(r.offBadge, false);
  assert.deepEqual(p.errors, []);
});
