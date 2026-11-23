// Smart rescheduling in the app (stored week, coverage, moving, undo, missed days), balance warnings, and the nutrition screen layout.
const test = require('node:test'), assert = require('node:assert/strict');
const { launch, baseState } = require('./harness');
let p;
test.before(async () => { p = await launch(); });
test.after(async () => { await p.close(); });
// Mon 23 Nov 2026 is a Monday.
const MON = '2026-11-23', at = (d, h = 10) => `${d}T${String(h).padStart(2, '0')}:00:00`;
const ts = (d, h = 10) => new Date(at(d, h)).getTime();
const st = (over = {}) => baseState({ planFrom: '2026-11-01', missedFrom: '2099-01-01', split: 'arnold', ...over });
// Mon Legs, Tue Chest & Back, Wed rest, Thu Shoulders & Arms, Fri rest, Sat Chest & Back, Sun rest
const WEEK = `S.week=buildWeek(monday(),'arnold');S.week.days=[{prog:'legs',st:'planned'},{prog:'arnchest',st:'planned'},null,{prog:'arnshar',st:'planned'},null,{prog:'arnchest',st:'planned'},null];S.week.pat=S.week.days.map(x=>x?1:0);S.week.n=4;save();`;
const ARMS = `S.exGroups=[{id:'ha',name:'Home Arms Day',e:'🏠',ex:['Dumbbell Curl','Overhead Dumbbell Extension']}];regGroup(S.exGroups[0]);`;
const doSets = (n = 3) => `for(let i=0;i<${n};i++){$('#pw').value=8;$('#pr').value=12;restEnd=0;BAL_OK=true;addSet()}`;

test('your example: Monday Legs → Home Arms Day instead. Legs moves to Wednesday, Thursday drops arms, summary shows it; Undo restores', async () => {
  await p.open({ state: st(), clock: at(MON) });
  const r = await p.eval(`${WEEK}${ARMS}BAL_OK=true;startW('g_ha');${doSets()};restEnd=0;mv(1);${doSets()};finishW();
    const sum=$('#app').innerText,W=S.week;const res={sum,d2:W.days[2],d3:W.days[3],d0:W.days[0].st,lines:W.log.at(-1).lines};
    stack=[];go('plan');res.strip=$('.wp-strip').innerText.replace(/\\s+/g,' ');res.card=$('#app').innerText.includes('Muscle balance this week');
    undoChange(W.log.at(-1).id);res.after=JSON.stringify(S.week.days);return res`);
  assert.equal(r.d2.prog, 'legs'); assert.equal(r.d2.st, 'moved'); assert.equal(r.d2.from, 0); assert.equal(r.d0, 'skipped');
  assert.deepEqual(r.d3.drop, ['Biceps', 'Triceps']);
  assert.deepEqual(r.lines, ['Thu\'s Shoulders & Arms now just Shoulders (Biceps & Triceps already trained)', 'Legs moved Mon → Wednesday']);
  assert.match(r.sum, /Plan updated/); assert.match(r.sum, /Legs moved Mon → Wednesday/);
  assert.match(r.strip, /Legs/); assert.ok(r.card);
  assert.equal(r.after, JSON.stringify([{ prog: 'legs', st: 'planned' }, { prog: 'arnchest', st: 'planned' }, null, { prog: 'arnshar', st: 'planned' }, null, { prog: 'arnchest', st: 'planned' }, null]));
  assert.deepEqual(p.errors, []);
});

test('Thursday then leaves out the arm exercises; doing the planned workout changes nothing', async () => {
  await p.open({ state: st({ planFrom: '2026-11-26' }), clock: at('2026-11-26') });
  const r = await p.eval(`${WEEK}S.week.days[3].drop=['Biceps','Triceps'];save();const plan=dayPlan();BAL_OK=true;startW('arnshar');const list=[...S.active.list];
    ${doSets()};finishW();return {plan,list,log:S.week.log.length,arms:list.some(e=>EX[e][0].every(m=>['Biceps','Triceps'].includes(m)))}`);
  assert.equal(r.plan.prog, 'arnshar'); assert.deepEqual(r.plan.drop, ['Biceps', 'Triceps']);
  assert.equal(r.arms, false); assert.ok(r.list.length >= 1); assert.equal(r.log, 0);
  assert.deepEqual(p.errors, []);
});

test('a missed day moves to the next free day that respects recovery (no XP penalty for it)', async () => {
  await p.open({ state: st(), clock: at('2026-11-25') }); // Wednesday, nothing done Mon / Tue
  const r = await p.eval(`${WEEK}const W=ensureWeek();return {days:W.days.map(x=>x&&(x.prog+':'+x.st)),lines:W.log.map(e=>e.lines.join('|')),plan:dayPlan('${MON}')}`);
  // Mon legs → Wed (today, free, 48 h from nothing); Tue chest & back → Thu? Thu has arms → Fri (free; Sat chest & back is only 24 h later → no) → Sun? 24 h after Sat → no → asks
  assert.equal(r.days[2], 'legs:moved'); assert.equal(r.days[0], 'legs:skipped');
  assert.deepEqual(r.plan, { type: 'rest', why: 'moved', to: 2 });
  assert.ok(r.lines.some(l => /Legs moved Mon → Wednesday/.test(l)));
  assert.deepEqual(p.errors, []);
});

test('when nothing fits, the app asks: do it anyway / swap / skip', async () => {
  await p.open({ state: st({ balance: { recoveryH: 96 } }), clock: at(MON) });
  // Mon Legs, Tue C&B, Wed S&A, Thu Legs, Fri C&B, Sat S&A, Sun rest: Sun is only 72 h after Thursday's legs
  const FULL = `S.week=buildWeek(monday(),'arnold');S.week.days=['legs','arnchest','arnshar','legs','arnchest','arnshar',null].map(k=>k&&{prog:k,st:'planned'});S.week.pat=S.week.days.map(x=>x?1:0);S.week.n=6;save();`;
  const r = await p.eval(`${FULL}${ARMS}BAL_OK=true;startW('g_ha');${doSets()};restEnd=0;mv(1);${doSets()};finishW();const sum=$('#app').innerText,pend=S.week.pending.length;
    placePending('drop');return {sum,pend,left:S.week.pending.length,last:S.week.log.at(-1).lines}`);
  assert.equal(r.pend, 1); assert.match(r.sum, /Where should Legs go\?/); assert.match(r.sum, /Skip it this week/);
  assert.equal(r.left, 0); assert.deepEqual(r.last, ['Legs skipped this week']);
  assert.deepEqual(p.errors, []);
});

test('change today\'s workout: sheet lists groups and splits with a preview of what changes', async () => {
  await p.open({ state: st(), clock: at(MON) });
  const r = await p.eval(`${WEEK}${ARMS}stack=[];go('plan');const btn=!!$('.wp-change');changeToday();const list=$('#sheet').innerText;swapPick('g_ha');const prev=$('#sheet').innerText;return {btn,list,prev}`);
  assert.ok(r.btn); assert.match(r.list, /My groups/); assert.match(r.list, /Home Arms Day/); assert.match(r.list, /Leg Day · planned/);
  assert.match(r.prev, /What changes in your week/); assert.match(r.prev, /Legs moved Mon → Wednesday/); assert.match(r.prev, /Start Home Arms Day/);
  assert.deepEqual(p.errors, []);
});

test('week editor: move a session by hand (with a recovery warning marker) and skip one', async () => {
  await p.open({ state: st(), clock: at(MON) });
  const r = await p.eval(`${WEEK}push('weekedit');dayMenu(1);const menu=$('#sheet').innerText;moveDay(1,2);const a=S.week.days[2]&&S.week.days[2].prog;skipDay(3);return {menu,a,d3:S.week.days[3].st,log:S.week.log.length}`);
  assert.match(r.menu, /Move to/); assert.equal(r.a, 'arnchest'); assert.equal(r.d3, 'skipped'); assert.equal(r.log, 2);
  assert.deepEqual(p.errors, []);
});

test('balance: 3 biceps sessions this week → "trained biceps 3 times… Are you sure?" with what you haven\'t trained; never blocks', async () => {
  const W = d => ({ ts: ts(d), prog: 'free', sets: Array.from({ length: 3 }, () => ({ ex: 'Dumbbell Curl', w: 8, r: 10, xp: 10 })), xp: 30, prs: 0 });
  await p.open({ state: st({ workouts: [W(MON), W('2026-11-24'), W('2026-11-25')] }), clock: at('2026-11-26') });
  const r = await p.eval(`${WEEK}${ARMS}S.active=null;startW('g_ha');const q=$('#sheet').innerText,started=!!S.active;
    $('#sheet .btn').click();const now=!!S.active;return {q,started,now}`);
  assert.match(r.q, /You've trained biceps 3 times this week\. Are you sure\?/);
  assert.match(r.q, /You still haven't trained: .*chest.*legs/);
  assert.equal(r.started, false); assert.equal(r.now, true);
  // first set of a biceps exercise during a different workout also asks once
  const s = await p.eval(`S.active=null;BAL_OK=true;startW('free');useEx('Hammer Curl');$('#pw').value=10;$('#pr').value=10;restEnd=0;addSet();const asked=$('#sheet').classList.contains('show')&&/biceps 3 times/.test($('#sheet').innerText);
    const n0=S.active.sets.length;$('#sheet .btn').click();const n1=S.active.sets.length;restEnd=0;addSet();return {asked,n0,n1,n2:S.active.sets.length}`);
  assert.ok(s.asked); assert.equal(s.n0, 0); assert.equal(s.n1, 1); assert.equal(s.n2, 2);
  assert.deepEqual(p.errors, []);
});

test('balance settings: limits and recovery time are editable; defaults 48 h · 3 sessions · 20 sets', async () => {
  await p.open({ state: st(), clock: at(MON) });
  const r = await p.eval(`stack=[];push('settings');const row=$('#app').innerText.includes('Training balance');push('balance');const pg=$('#app').innerText;balSet('recoveryH',12,24,96);balSet('maxFreq',-1,1,7);return {row,pg,b:S.balance}`);
  assert.ok(r.row); assert.match(r.pg, /48 h/); assert.match(r.pg, /3×/); assert.match(r.pg, /20/);
  assert.equal(r.b.recoveryH, 60); assert.equal(r.b.maxFreq, 2);
  assert.deepEqual(p.errors, []);
});

test('nutrition screen: logged foods come first; suggestions are a small chip under them that opens and can be hidden', async () => {
  await p.open({ state: baseState({ food: { [MON]: [['Rice', 205, 4, 45, 0, 1]] } }), clock: at(MON, 9) });
  const r = await p.eval(`stack=[];go('meals');const h=$('#app').innerHTML,iL=h.indexOf('Logged'),iW=h.indexOf('>Water<'),iS=h.indexOf('sgchip'),iQ=h.indexOf('class="qa"');
    const chip=$('.sgchip'),closed=chip&&!chip.open,txt=chip&&chip.querySelector('summary').innerText;
    chip.open=true;const body=$('.sgbody').innerText.length>20;$('.sg-x').click();const hidden=!$('.sgchip')&&!!$('.sg-show');
    return {iL,iW,iS,iQ,closed,txt,body,hidden,add:!!$('.lg-add')}`);
  assert.ok(r.iL > 0 && r.iL < r.iW && r.iL < r.iQ, JSON.stringify(r)); assert.ok(r.iS > r.iL);
  assert.ok(r.closed); assert.match(r.txt, /idea/); assert.ok(r.body); assert.ok(r.hidden); assert.ok(r.add);
  assert.deepEqual(p.errors, []);
});

test('review fixes: undoing a placement brings the "where should it go?" choice back; today is never offered once it has a workout', async () => {
  await p.open({ state: st({ balance: { recoveryH: 96 } }), clock: at(MON) });
  const r = await p.eval(`S.week=buildWeek(monday(),'arnold');S.week.days=['legs','arnchest','arnshar','legs','arnchest','arnshar',null].map(k=>k&&{prog:k,st:'planned'});S.week.pat=S.week.days.map(x=>x?1:0);S.week.n=6;save();${ARMS}
    BAL_OK=true;startW('g_ha');${doSets()};restEnd=0;mv(1);${doSets()};finishW();const c=S.week.pending[0];pendingCard();
    const offeredToday=c.anyway===0;placePending('drop');undoChange(S.week.log.at(-1).id);return {offeredToday,pend:S.week.pending.length,prog:S.week.pending[0]&&S.week.pending[0].prog}`);
  assert.equal(r.offeredToday, false); assert.equal(r.pend, 1); assert.equal(r.prog, 'legs');
  assert.deepEqual(p.errors, []);
});

test('review fixes: a meal saved from a boiled dish stays boiled', async () => {
  await p.open({ state: baseState() });
  const r = await p.eval(`for(let i=0;i<50&&typeof foodSheet!=='function';i++)await new Promise(r=>setTimeout(r,50));
    foodSheet();afOpenDish('adobo');afMethod('raw');const k0=Math.round(AF_show()||0);afDishToPlate();afOpenIng('egg');afIngToPlate();afLogPlate();$('#spn').value='Boiled lunch';afSavePlate();
    const m=S.myMeals.find(x=>x.name==='Boiled lunch'),ref=m.items[0];return {ref}`);
  assert.equal(r.ref.method, 'raw'); assert.equal(r.ref.oilType, 'none');
  assert.deepEqual(p.errors, []);
});
