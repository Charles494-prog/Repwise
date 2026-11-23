// Today's focus (Change today's workout) and the Workout style screen: focus is for today only, styles change now or next week.
const test = require('node:test'), assert = require('node:assert/strict');
const { launch, baseState } = require('./harness');
let p;
test.before(async () => { p = await launch(); });
test.after(async () => { await p.close(); });
// Mon 23 Nov 2026 is a Monday.
const MON = '2026-11-23', TUE = '2026-11-24', WED = '2026-11-25', at = (d, h = 10) => `${d}T${String(h).padStart(2, '0')}:00:00`;
const ts = (d, h = 10) => new Date(at(d, h)).getTime();
const st = (over = {}) => baseState({ planFrom: '2026-11-01', missedFrom: '2099-01-01', split: 'ppl', ...over });
// Mon Pull, Tue Push, Wed rest, Thu Legs, Fri Pull, Sat Push, Sun rest
const WEEK = `S.week=buildWeek(monday(),'ppl');S.week.days=[{prog:'pull',st:'planned'},{prog:'push',st:'planned'},null,{prog:'legs',st:'planned'},{prog:'pull',st:'planned'},{prog:'push',st:'planned'},null];S.week.pat=S.week.days.map(x=>x?1:0);S.week.n=5;S.week.queue=['pull','push','legs','pull','push'];save();`;
const doSets = (n = 3) => `for(let i=0;i<${n};i++){$('#pw').value=8;$('#pr').value=10;restEnd=0;BAL_OK=true;addSet()}`;
const AREAS = ['Chest', 'Front delts', 'Side delts', 'Triceps', 'Back', 'Lats', 'Traps', 'Rear delts', 'Biceps', 'Forearms', 'Quads', 'Hamstrings', 'Glutes', 'Calves', 'Abs / core'];

test('every exercise the focus picker can use exists in the app', async () => {
  await p.open({ state: st(), clock: at(MON) });
  const r = await p.eval(`return Object.values(RWFocus.CAND).flatMap(o=>Object.values(o).flat()).map(x=>x[0]).filter(n=>!EX[n])`);
  assert.deepEqual(r, []);
  assert.deepEqual(p.errors, []);
});

test('Pull day: the picker shows Push / Pull / Legs and every muscle area (planned one marked), no routines; switching to Push just works', async () => {
  await p.open({ state: st(), clock: at(MON) });
  const r = await p.eval(`${WEEK}let asked=0;window.confirm=()=>{asked++;return false};const before=JSON.stringify(S.week.days);
    stack=[];go('workouts');const link=/Change today's workout/.test($('#app').innerText);changeToday();
    const txt=$('#sheet').innerText,presets=[...document.querySelectorAll('#sheet [data-preset]')].map(b=>b.innerText.replace(/\\s+/g,' ')),areas=[...document.querySelectorAll('#sheet [data-area]')].map(b=>b.innerText.trim());
    focPreset('push');const prev=$('#sheet .fc-prev').innerText;focGo();
    const a=S.active;return {link,txt,presets,areas,prev,asked,prog:a&&a.prog,list:a&&a.list,name:a&&PROGS[a.prog].name,split:S.split,next:S.nextSplit||null,same:JSON.stringify(S.week.days)===before,
      tue:dayPlan('${TUE}').prog,today:todaysProg(),focus:S.todayFocus}`);
  assert.ok(r.link);
  assert.equal(r.presets.length, 3); assert.match(r.presets[0], /^Push/); assert.match(r.presets[1], /^Pull planned today/); assert.match(r.presets[2], /^Legs/);
  assert.deepEqual(r.areas, AREAS);
  for (const bad of ['Daily Rotation', 'Arnold', 'Chest & Back', 'Upper Body', 'Bro Split', 'My groups', 'Fitness at Home']) assert.ok(!r.txt.includes(bad), bad);
  assert.match(r.txt, /Planned today: Pull Day/);
  assert.match(r.prev, /Bench Press/); assert.match(r.prev, /Lateral Raise/); assert.match(r.prev, /Chest · upper chest/); assert.match(r.prev, /Triceps · long head/); assert.match(r.prev, /Every part of each muscle is covered/);
  assert.equal(r.asked, 0, 'nothing should block or ask'); assert.equal(r.prog, 'f_chest+delts_front+delts_side+triceps');
  assert.ok(r.list.includes('Bench Press') && r.list.includes('Overhead Press') && r.list.includes('Lateral Raise') && r.list.includes('Dips') && r.list.includes('Overhead Cable Extension'), r.list.join());
  assert.equal(r.name, 'Focus: Push');
  assert.equal(r.split, 'ppl'); assert.equal(r.next, null); assert.ok(r.same, 'picking a focus does not change the week before the workout');
  assert.doesNotMatch(r.txt, /Keep as planned|Adjust around/);
  assert.equal(r.tue, 'push'); assert.equal(r.today, r.prog); assert.deepEqual(r.focus, { date: MON, areas: ['chest', 'delts_front', 'delts_side', 'triceps'] });
  // finishing reschedules automatically (Pull was skipped for Push): the routine itself stays PPL
  const f = await p.eval(`${doSets(3)};restEnd=0;mv(1);${doSets(3)};restEnd=0;mv(1);${doSets(3)};restEnd=0;mv(1);${doSets(3)};finishW();
    return {log:S.week.log.length,days:S.week.days.map(x=>x&&x.prog+':'+x.st),done:dayPlan(),hist:PROGS[S.workouts.at(-1).prog].name,split:S.split}`);
  assert.ok(f.log >= 1); assert.equal(f.days[0], 'pull:skipped'); assert.ok(f.days.some(x => x === 'pull:moved'), f.days.join());
  assert.equal(f.done.done, true); assert.equal(f.hist, 'Focus: Push'); assert.equal(f.split, 'ppl');
  assert.deepEqual(p.errors, []);
});

test('tomorrow is back on the routine: yesterday\'s focus is ignored and old focus workouts keep their name', async () => {
  const w = { ts: ts(MON), prog: 'f_biceps+delts_side', sets: [{ ex: 'Barbell Curl', w: 20, r: 10, xp: 10 }], xp: 10, prs: 0 };
  await p.open({ state: st({ todayFocus: { date: MON, areas: ['biceps', 'delts_side'] }, workouts: [w] }), clock: at(TUE) });
  const r = await p.eval(`${WEEK}return {plan:dayPlan(),today:todaysProg(),focus:S.todayFocus||null,name:PROGS['f_biceps+delts_side'].name}`);
  assert.equal(r.plan.prog, 'push'); assert.ok(!r.plan.focus); assert.equal(r.today, 'push'); assert.equal(r.focus, null);
  assert.equal(r.name, 'Focus: Side delts + Biceps');
  assert.deepEqual(p.errors, []);
});

test('multi-select biceps + side delts generates curls and lateral raises', async () => {
  await p.open({ state: st(), clock: at(MON) });
  const r = await p.eval(`${WEEK}changeToday();focTog('biceps');focTog('delts_side');const on=[...document.querySelectorAll('#sheet [data-area].on')].map(b=>b.dataset.area),btn=$('#focgo').innerText,prev=$('#sheet .fc-prev').innerText;
    focGo();return {on,btn,prev,list:S.active.list,m:PROGS[S.active.prog].m}`);
  assert.deepEqual(r.on.sort(), ['biceps', 'delts_side']); assert.match(r.btn, /Start Side delts \+ Biceps/);
  assert.match(r.prev, /Curl/); assert.match(r.prev, /Lateral Raise/);
  assert.ok(r.list.some(e => /Curl/.test(e)) && r.list.some(e => /Lateral Raise/.test(e)), r.list.join());
  assert.deepEqual(r.m, ['Shoulders', 'Biceps']);
  assert.deepEqual(p.errors, []);
});

test('changing focus mid-workout keeps the logged exercise and its sets first, then the new focus', async () => {
  await p.open({ state: st(), clock: at(MON) });
  const r = await p.eval(`${WEEK}BAL_OK=true;startW('pull');const first=S.active.list[0],t0=S.active.ts;${doSets(2)};const xp=S.active.xp;
    changeToday();const btn=$('#focgo').innerText;focPreset('push');const prev=$('#sheet .fc-prev').innerText;focGo();
    const a=S.active;return {first,btn,prev,list:a.list,idx:a.idx,sets:a.sets.length,setsEx:a.sets.map(s=>s.ex),same:a.ts===t0,xp:a.xp===xp,prog:a.prog,cur:$('#app').innerText.includes(a.list[a.idx])}`);
  assert.match(r.btn, /Update today's workout/);
  assert.match(r.prev, new RegExp(r.first + '.*logged'));
  assert.equal(r.list[0], r.first); assert.equal(r.idx, 1); assert.equal(r.sets, 2); assert.ok(r.setsEx.every(e => e === r.first));
  assert.ok(r.same); assert.ok(r.xp); assert.equal(r.prog, 'f_chest+delts_front+delts_side+triceps');
  assert.ok(r.list.includes('Bench Press')); assert.ok(r.cur);
  assert.deepEqual(p.errors, []);
});

test('the rest of the week adjusts automatically: Push planned Monday, Legs done instead → Legs counts for Monday and Push moves to the next suitable day', async () => {
  await p.open({ state: st(), clock: at(MON) });
  // Mon Push, Tue Pull, Wed rest, Thu Legs, Fri Push, Sat Pull, Sun rest
  const W2 = `S.week=buildWeek(monday(),'ppl');S.week.days=['push','pull',null,'legs','push','pull',null].map(k=>k&&{prog:k,st:'planned'});S.week.pat=S.week.days.map(x=>x?1:0);S.week.n=5;save();`;
  const r = await p.eval(`${W2}changeToday();focPreset('legs');const prev=$('#sheet').innerText;focGo();
    for(let j=0;j<S.active.list.length;j++){${doSets(3)};restEnd=0;if(j<S.active.list.length-1)mv(1)}finishW();
    return {prev,days:S.week.days.map(x=>x&&x.prog+':'+x.st),lines:S.week.log.at(-1)&&S.week.log.at(-1).lines,mon:dayPlan(),split:S.split}`);
  assert.match(r.prev, /What changes in your week/); assert.match(r.prev, /Push moved Mon/);
  assert.equal(r.days[0], 'push:skipped'); assert.ok(r.days.includes('push:moved'), r.days.join()); assert.ok(r.days.filter(x => x && x.startsWith('legs')).length >= 1, r.days.join());
  assert.ok(r.lines.some(l => /Push moved Mon/.test(l)), r.lines.join('|')); assert.equal(r.mon.done, true); assert.equal(r.split, 'ppl');
  assert.deepEqual(p.errors, []);
});

test('arms trained today: later Push / Pull sessions drop the arm exercises but keep chest / back', async () => {
  await p.open({ state: st(), clock: at(MON) });
  const W2 = `S.week=buildWeek(monday(),'ppl');S.week.days=['push',null,'pull',null,'legs',null,null].map(k=>k&&{prog:k,st:'planned'});S.week.pat=S.week.days.map(x=>x?1:0);S.week.n=3;save();`;
  const r = await p.eval(`${W2}changeToday();focTog('biceps');focTog('forearms');focTog('triceps');focGo();
    for(let j=0;j<S.active.list.length;j++){${doSets(3)};restEnd=0;if(j<S.active.list.length-1)mv(1)}finishW();return {days:S.week.days}`);
  assert.equal(r.days[2].prog, 'pull'); assert.ok(r.days[2].drop.includes('Biceps'), JSON.stringify(r.days[2])); assert.ok(!r.days[2].drop.includes('Back'));
  assert.deepEqual(p.errors, []);
});

test('Workout style: changing style mid-week asks now vs next week; both paths work; Monday with nothing done applies directly', async () => {
  const w = { ts: ts(MON), prog: 'pull', sets: [{ ex: 'Pull-up', w: 0, r: 8, xp: 10 }, { ex: 'Pull-up', w: 0, r: 8, xp: 10 }], xp: 20, prs: 0 };
  // Apply now (Wednesday, Monday done)
  await p.open({ state: st({ workouts: [w] }), clock: at(WED) });
  const a = await p.eval(`${WEEK}stack=[];push('splits');const title=$('#app').innerText;const mon=JSON.stringify(S.week.days[0]);pickSplit('ul');const q=$('#sheet').innerText;
    [...document.querySelectorAll('#sheet .btn')].find(b=>/Apply now/.test(b.innerText)).click();
    return {title,q,split:S.split,next:S.nextSplit||null,mon0:JSON.stringify(S.week.days[0])===mon,rest:S.week.days.slice(2).map(x=>x&&x.prog),wsplit:S.week.split}`);
  assert.match(a.title, /Workout style/); assert.match(a.q, /Apply now \(rebuild the rest of this week\)/); assert.match(a.q, /Start next week \(from Monday\)/);
  assert.equal(a.split, 'ul'); assert.equal(a.next, null); assert.ok(a.mon0, 'Monday stays as trained'); assert.equal(a.wsplit, 'ul');
  assert.ok(a.rest.filter(Boolean).every(k => ['upper', 'lower'].includes(k)), a.rest.join()); assert.equal(a.rest.find(Boolean), 'upper');
  // Start next week
  await p.open({ state: st({ workouts: [w] }), clock: at(WED) });
  const b = await p.eval(`${WEEK}render();const before=JSON.stringify(S.week.days);pickSplit('ul');[...document.querySelectorAll('#sheet .btn')].find(b=>/Start next week/.test(b.innerText)).click();
    return {split:S.split,next:S.nextSplit,same:JSON.stringify(S.week.days)===before,nextMon:dayPlan('2026-11-30').prog}`);
  assert.equal(b.split, 'ppl'); assert.equal(b.next, 'ul'); assert.ok(b.same); assert.equal(b.nextMon, 'upper');
  // Monday, nothing done: applied directly, no question
  await p.open({ state: st(), clock: at(MON) });
  const c = await p.eval(`${WEEK}pickSplit('ul');return {sheet:$('#sheet').classList.contains('show'),split:S.split,mon:S.week.days[0]&&S.week.days[0].prog}`);
  assert.equal(c.sheet, false); assert.equal(c.split, 'ul'); assert.equal(c.mon, 'upper');
  assert.deepEqual(p.errors, []);
});

test('whole muscle: picking Biceps covers long head, short head and brachialis (home too); the preview names each region', async () => {
  await p.open({ state: st({ equip: 'home' }), clock: at(MON) });
  const r = await p.eval(`${WEEK}S.equip='home';S.bar=false;changeToday();focTog('biceps');const prev=$('#sheet .fc-prev').innerText;focGo();return {prev,list:S.active.list}`);
  assert.match(r.prev, /Biceps · long head/); assert.match(r.prev, /Biceps · short head/); assert.match(r.prev, /Biceps · brachialis/);
  assert.deepEqual(r.list.slice().sort(), ['Backpack Curl', 'Backpack Drag Curl', 'Backpack Hammer Curl']);
  assert.deepEqual(p.errors, []);
});

test('My groups sit at the bottom of the picker and can be used for today; they stay on Train → My groups', async () => {
  const g = { id: 'g1', name: 'Arm blast', e: '💥', ex: ['Barbell Curl', 'Tricep Pushdown'] };
  await p.open({ state: st({ exGroups: [g] }), clock: at(MON) });
  const r = await p.eval(`${WEEK}changeToday();const sheet=$('#sheet'),html=sheet.innerHTML,my=html.indexOf('My groups'),last=html.lastIndexOf('data-area=');
    const row=sheet.querySelector('[data-group="g1"]');const txt=row&&row.innerText;row.click();
    const a=S.active;stack=[];go('workouts');return {my,last,txt,prog:a&&a.prog,list:a&&a.list,train:$('#app').innerText.includes('Arm blast')}`);
  assert.ok(r.my > r.last, 'My groups comes after every muscle area'); assert.match(r.txt, /Arm blast/);
  assert.equal(r.prog, 'g_g1'); assert.deepEqual(r.list, ['Barbell Curl', 'Tricep Pushdown']); assert.ok(r.train);
  assert.deepEqual(p.errors, []);
});
