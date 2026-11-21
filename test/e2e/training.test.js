// Training layer: setup-built schedule, rest gate, timed sets, deload, plate amounts, rank curve.
const test = require('node:test'), assert = require('node:assert/strict');
const { launch, baseState } = require('./harness');
let p;
test.before(async () => { p = await launch(); });
test.after(async () => { await p.close(); });

test('planner: schedules around blocked days and picks the split from days + experience', async () => {
  await p.open({ state: baseState() });
  const r = await p.eval(`return [autoPlan({days:6,offDays:[2,6],exp:'intermediate'}),autoPlan({days:3,exp:'beginner'}),autoPlan({days:4,offDays:[0,1,2,3,4],exp:'advanced'})]`);
  assert.equal(r[0].split, 'pplul'); assert.equal(r[0].n, 5); assert.equal(r[0].pat[2] + r[0].pat[6], 0); assert.ok(r[0].capped);
  assert.equal(r[1].split, 'full'); assert.deepEqual(r[1].pat, [1, 0, 1, 0, 1, 0, 0]);
  assert.equal(r[2].n, 2); assert.equal(r[2].split, 'full');
  assert.deepEqual(p.errors, []);
});

test('planner: finishing setup applies the plan to the week and caps exercises by session length', async () => {
  await p.open({ state: baseState() });
  const r = await p.eval(`startOB();Object.assign(OB.d,{days:4,offDays:[0],exp:'intermediate',sessLen:30,equip:'dumbbell'});OB.step=OBSTEPS.length;render();finishOB();
    return {split:S.split,pat:S.plan.pat,off:S.plan.pat[0],equip:S.equip,len:planList('upper').length}`);
  assert.equal(r.split, 'ul'); assert.equal(r.off, 0); assert.equal(r.pat.filter(Boolean).length, 4); assert.equal(r.equip, 'dumbbell'); assert.ok(r.len <= 4);
  assert.deepEqual(p.errors, []);
});

test('rest gate: no new set or next exercise until rest ends or Skip', async () => {
  await p.open({ state: baseState() });
  const r = await p.eval(`S.active=null;startW('push');$('#pw').value=20;$('#pr').value=8;addSet();addSet();mv(1);const blocked=[S.active.sets.length,S.active.idx];
    restEnd=Date.now()-1000;tickRest();mv(1);return {blocked,after:S.active.idx}`);
  assert.deepEqual(r.blocked, [1, 0]); assert.equal(r.after, 1);
  assert.deepEqual(p.errors, []);
});

test('timed sets: display follows the chosen time, Start locks, Stop logs the time held against that goal', async () => {
  await p.open({ state: baseState() });
  const r = await p.eval(`S.active=null;startW('free');useEx('Plank Hold (sec)');$('#pr').value=60;stp('pr',0);const tv=$('#tmr .tv').textContent;
    timerStart();const locked=$('#tmr .btn').disabled;timerStart();tmr.start=Date.now()-14000;timerStop();const s=S.active.sets.at(-1);
    return {tv,locked,r:s.r,short:S.active.short,n:S.active.sets.length}`);
  assert.equal(r.tv, '60s'); assert.ok(r.locked); assert.equal(r.n, 1); assert.equal(r.r, 14); assert.equal(r.short.goal, 60); assert.equal(r.short.left, 46);
  assert.deepEqual(p.errors, []);
});

test('deload: ~60% targets, and the next session ignores deload sets', async () => {
  const now = Date.now();
  await p.open({ state: baseState({ workouts: [{ ts: now - 864e5 * 7, prog: 'push', sets: [{ ex: 'Bench Press', w: 50, r: 8, xp: 5 }], xp: 5, prs: 0 }, { ts: now - 864e5, prog: 'push', deload: 1, sets: [{ ex: 'Bench Press', w: 30, r: 8, xp: 5 }], xp: 5, prs: 0 }] }) });
  const r = await p.eval(`const last=lastSets('Bench Press')[0].w;S.active=null;startW('push');S.active.deload=true;return {last,w:sugg('Bench Press').w,normal:(S.active.deload=false,sugg('Bench Press').w)}`);
  assert.equal(r.last, 50); assert.ok(r.w <= r.normal * 0.65);
  assert.deepEqual(p.errors, []);
});

test('plate: "3 eggs" shows as 3 eggs on the plate and logs one 150 g portion, not 3×', async () => {
  await p.open({ state: baseState() });
  const r = await p.eval(`foodSheet();afOpenIng('egg');afItemG(F_EGG=FOODDB.ING.egg.pc.g*3);afIngToPlate();afGo('plate');const btn=document.querySelector('.afing .gbtn').textContent;
    const kcal=Math.round(AF.plate[0].totals.kcal*AF.plate[0].mult);afPlEdit(0);afPlAmt(0,FOODDB.ING.egg.pc.g*2);const two=document.querySelector('.afing .gbtn').textContent;afLogPlate();const e=S.food[today()].at(-1);return {btn,kcal,two,name:e[0]}`);
  assert.equal(r.btn, '3 eggs'); assert.equal(r.two, '2 eggs'); assert.match(r.name, /\(2 eggs\)$/);
  assert.deepEqual(p.errors, []);
});

test('ranks: Iron is quick, each tier costs more, Arnold is the final rank', async () => {
  await p.open({ state: baseState() });
  const r = await p.eval(`return {first:tierXP(0),grow:[tierXP(3)/tierXP(2),tierXP(27)/tierXP(26)],last:RANKS.at(-1)[0],top:rankOf(1e9).name}`);
  assert.ok(r.first <= 150); assert.ok(r.grow[1] > r.grow[0]); assert.equal(r.last, 'Arnold'); assert.equal(r.top, 'Arnold I');
  assert.deepEqual(p.errors, []);
});

test('history: exercise page lists every set; session page shows what was done; timed sets read as time', async () => {
  const now = Date.now();
  await p.open({ state: baseState({ workouts: [{ ts: now - 864e5, prog: 'push', sets: [{ ex: 'Bench Press', w: 10, r: 10, xp: 5 }, { ex: 'Plank Hold (sec)', w: 0, r: 60, xp: 5 }], xp: 10, prs: 0 }] }) });
  const r = await p.eval(`stack=[];push('exhist','Bench Press');const ex=document.querySelector('#app').innerText;push('wkdetail',S.workouts[0].ts);const wk=document.querySelector('#app').innerText;return {ex,wk}`);
  assert.match(r.ex, /10kg × 10/); assert.match(r.wk, /Bench Press/); assert.match(r.wk, /0kg × 1 min/);
  assert.deepEqual(p.errors, []);
});

test('fasting: setup asks when the eating window opens, and skips the question when fasting is off', async () => {
  await p.open({ state: baseState() });
  const r = await p.eval(`startOB();const i=OBSTEPS.findIndex(s=>s.k==='fastStart');OB.d.fastProto='off';OB.step=i;render();const skipped=OBSTEPS[OB.step].k;
    OB.step=i+1;render();OB.step=i;render();const back=OBSTEPS[OB.step].k;
    OB.d.fastProto='18:6';OB.step=i;OB._last=i-1;render();const shown=document.querySelector('#app').innerText;
    OB.d.fastStart=18;OB.step=OBSTEPS.length;render();finishOB();
    const at=h=>{const d=new Date();d.setHours(h,35,0,0);return fastState(d).open};return {skipped,back,shown,start:S.fast.start,on:S.fast.on,night:at(22),evening:at(19)}`);
  assert.equal(r.skipped, 'focus'); assert.equal(r.back, 'fastProto'); assert.match(r.shown, /eating window open/i); assert.match(r.shown, /Eat 12 PM – 6 PM/);
  assert.equal(r.start, 18); assert.ok(r.on); assert.equal(r.evening, true); assert.equal(r.night, true);
  assert.deepEqual(p.errors, []);
});

test('bodyweight exercises: no "pick a weight", about 10 reps first time, then beat your reps; weight box is optional added weight', async () => {
  const now = Date.now();
  await p.open({ state: baseState() });
  const r = await p.eval(`const first=sugg('Push-up').text,bench=sugg('Bench Press').text;S.workouts.push({ts:${now}-864e5,prog:'free',sets:[{ex:'Push-up',w:0,r:12,xp:5},{ex:'Push-up',w:0,r:10,xp:5}],xp:10,prs:0});
    const next=sugg('Push-up');S.active=null;startW('free');useEx('Push-up');const label=/Added weight \(kg\) · optional/.test(document.body.innerText);return {first,bench,next,label}`);
  assert.doesNotMatch(r.first, /weight/i); assert.match(r.first, /about <b>10<\/b>/); assert.match(r.bench, /Pick a weight/);
  assert.match(r.next.text, /Last time 12 reps\. Beat it: <b>13 reps<\/b>/); assert.equal(r.next.w, 0); assert.ok(r.label);
  assert.deepEqual(p.errors, []);
});
