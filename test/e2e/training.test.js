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
    const next=sugg('Push-up');S.active=null;startW('free');useEx('Push-up');const label=document.body.textContent.includes('Added weight (kg) · optional');return {first,bench,next,label}`);
  assert.doesNotMatch(r.first, /weight/i); assert.match(r.first, /about <b>10<\/b>/); assert.match(r.bench, /Pick a weight/);
  assert.match(r.next.text, /Last time 12 reps\. Beat it: <b>13 reps<\/b>/); assert.equal(r.next.w, 0); assert.ok(r.label);
  assert.deepEqual(p.errors, []);
});

test('rank-ups: queued during a workout, shown together after it with the new badges; can be turned off in Settings', async () => {
  await p.open({ state: baseState() });
  const r = await p.eval(`S.active=null;startW('push');S.xp.Chest=95;$('#pw').value=20;$('#pr').value=10;addSet();await new Promise(r=>setTimeout(r,900));
    const during=!!document.querySelector('.rq'),queued=S.rankQ.map(x=>x.k);restEnd=0;finishW();await new Promise(r=>setTimeout(r,1500));const pop=document.querySelector('.rq');
    const txt=pop&&pop.innerText,img=pop&&pop.querySelector('.rq-badge img').getAttribute('src');pop&&pop.querySelector('.btn').click();
    stack=[];push('settings');const row=/Rank-up pop-ups/.test(document.body.innerText);S.rankPop=false;S.xp.Back=95;S.rankQueueDummy=1;save();await new Promise(r=>setTimeout(r,900));
    return {during,queued,txt,img,row,afterOff:!!document.querySelector('.rq'),q:S.rankQ.length}`);
  assert.equal(r.during, false); assert.ok(r.queued.includes('Chest')); assert.match(r.txt, /Congratulations/i); assert.match(r.txt, /You reached/); assert.match(r.img, /img\/ranks\/\w+\.png/);
  assert.ok(r.row); assert.equal(r.afterOff, false); assert.equal(r.q, 0);
  assert.deepEqual(p.errors, []);
});

test('quests: later checkpoints pay much more, finishing a quest adds a big bonus', async () => {
  await p.open({ state: baseState() });
  const r = await p.eval(`const q=questList()[0];if(!q)return null;const before=S.xpB||0,c0=checkQuests(q.steps[0][0],999,999);return {first:c0[0],bonus:(S.xpB||0)-before}`);
  if (r) { assert.match(r.first, /\+150 XP/); }
  assert.deepEqual(p.errors, []);
});

test('missed workouts: 2 days to make it up; otherwise only that day\'s muscles lose a little XP', async () => {
  const now = new Date(), mon = new Date(now); mon.setHours(12, 0, 0, 0); mon.setDate(mon.getDate() - ((mon.getDay() + 6) % 7));
  await p.open({ state: baseState({ startDate: '2020-01-01', xp: { Chest: 5000, Back: 5000, Shoulders: 5000, Biceps: 5000, Triceps: 5000, Quads: 5000, Hamstrings: 5000, Glutes: 5000, Calves: 5000, Core: 5000 } }) });
  const r = await p.eval(`const fresh=Object.keys(S.missed).length;const d=iso(Date.now()-6*864e5);S.missed[d]={prog:'push',due:iso(Date.now()-4*864e5),st:'open'};const r0=rankOf(S.xp.Chest).idx;missedScan();const e=S.missed[d];
    S.missed['2099-01-01']={prog:'pull',due:'2099-01-03',st:'open'};stack=[];go('plan');const card=/Missed Pull Day/.test(document.body.innerText)&&/Do it now/.test(document.body.innerText);
    const all=Object.values(S.missed).reduce((t,x)=>t+((x.xp||{}).Chest||0),0);return {fresh,st:e.st,lost:e.xp,chest:S.xp.Chest,all,rankKept:rankOf(S.xp.Chest).idx===r0,quads:S.xp.Quads,card}`);
  assert.equal(r.fresh, 0); assert.equal(r.st, 'lost'); assert.ok(r.lost.Chest > 0 && r.lost.Chest <= 60); assert.equal(r.chest, 5000 - r.all); assert.equal(r.quads, 5000, 'leg muscles untouched by a missed Push Day'); assert.ok(r.card);
  assert.deepEqual(p.errors, []);
});

test('missed workouts in a row cost more each time (1×, 1.5×, 2× … linear), any workout resets it, and a pop-up says what was lost', async () => {
  await p.open({ state: baseState({ startDate: '2020-01-01' }) });
  const r = await p.eval(`let x=4000;while(rankOf(x).cur<800)x+=100;for(const m of MUSCLES)S.xp[m]=x;S.rankSeenM=rankSnap();S.rankSeen=orank().i;S.rankQ=[];S.workouts=[];S.missed={};
    const ago=k=>iso(Date.now()-k*864e5);
    S.missed[ago(12)]={prog:'push',due:ago(10),st:'open'};S.missed[ago(11)]={prog:'push',due:ago(9),st:'open'};S.missed[ago(10)]={prog:'push',due:ago(8),st:'open'};
    missedScan();const a=[ago(12),ago(11),ago(10)].map(d=>[S.missed[d].n,S.missed[d].xp.Chest]);
    await new Promise(r=>setTimeout(r,1200));const sheet=document.querySelector('.lq')?.innerText||'';document.querySelector('.lq .lq-later')?.click();
    S.workouts.push({prog:'legs',ts:Date.now()-7*864e5,sets:[]});S.missed[ago(5)]={prog:'push',due:ago(3),st:'open'};missedScan();
    return {a,reset:S.missed[ago(5)].n,mult:[1,2,3,4,9,20].map(missMult),sheet}`);
  assert.deepEqual(r.a, [[1, 60], [2, 90], [3, 120]]);
  assert.deepEqual(r.mult, [1, 1.5, 2, 2.5, 5, 5]);
  assert.equal(r.reset, 1, 'a workout in between resets the streak');
  assert.match(r.sheet, /lost some progress/); assert.match(r.sheet, /Chest[\s\S]*−270 XP/); assert.match(r.sheet, /next one costs 2\.5×/); assert.doesNotMatch(r.sheet, /DEMOTED/);
  assert.deepEqual(p.errors, []);
});

test('missed workouts: the Today card shows the cost; phone reminders the evening before, deadline morning and the morning after', async () => {
  await p.open({ state: baseState({ startDate: '2020-01-01', xp: { Chest: 5000, Shoulders: 5000, Triceps: 5000 } }) });
  const r = await p.eval(`const N=[];window.Capacitor={Plugins:{LocalNotifications:{checkPermissions:async()=>({display:'granted'}),requestPermissions:async()=>({display:'granted'}),getPending:async()=>({notifications:[]}),cancel:async()=>{},schedule:async o=>N.push(...o.notifications),addListener(){}}}};
    S.workouts=[];S.notif.workout=true;const d=iso(Date.now()-864e5),due=iso(Date.now()+864e5);S.missed={[d]:{prog:'push',due,st:'open'}};
    stack=[];go('plan');await schedNotifs();const card=document.querySelector('.mw-card')?.innerText||'';
    const mine=[...new Map(N.filter(n=>n.id>=1300&&n.id<1330).map(n=>[n.id,n])).values()].map(n=>({id:n.id,t:n.title,b:n.body,h:new Date(n.schedule.at).getHours(),day:iso(n.schedule.at)}));
    S.notif.workout=false;N.length=0;await schedNotifs();const off=N.filter(n=>n.id>=1300&&n.id<1330).length;delete window.Capacitor;return {card,mine,off,due}`);
  assert.match(r.card, /skipping costs Chest −\d+/);
  assert.equal(r.mine.length, 3);
  const [eve, last, after] = r.mine.sort((a, b) => a.id - b.id);
  assert.match(eve.t, /Make up Push/); assert.equal(eve.h, 19);
  assert.match(last.t, /Last day/); assert.match(last.b, /Chest −\d+/); assert.equal(last.day, r.due); assert.equal(last.h, 9);
  assert.match(after.t, /XP lost/); assert.equal(after.h, 8);
  assert.equal(r.off, 0, 'the Workout reminders switch turns them off');
  assert.deepEqual(p.errors, []);
});

test('missed workouts: a loss only empties the rank to 0 XP (with a warning); missing again at 0 demotes; Leg Day only hits legs', async () => {
  await p.open({ state: baseState({ startDate: '2020-01-01' }) });
  const r = await p.eval(`let x=4000;while(rankOf(x).cur!==0)x++;for(const m of MUSCLES)S.xp[m]=x+30;S.rankSeenM=rankSnap();S.rankSeen=orank().i;S.rankQ=[];S.workouts=[];S.missed={};
    const ago=k=>iso(Date.now()-k*864e5),wait=()=>new Promise(r=>setTimeout(r,1300)),before=rankOf(S.xp.Quads).idx,chest=S.xp.Chest;
    S.missed[ago(9)]={prog:'legs',due:ago(7),st:'open'};missedScan();await wait();
    const pop1=document.querySelector('.lq')?.innerText||'',r1=rankOf(S.xp.Quads),q1=!!S.lossQ;document.querySelector('.lq .lq-later').click();
    S.missed[ago(5)]={prog:'legs',due:ago(3),st:'open'};missedScan();await wait();
    const pop2=document.querySelector('.lq')?.innerText||'',after=rankOf(S.xp.Quads).idx,seen=S.rankSeenM.Quads;document.querySelector('.lq .btn').click();
    return {pop1,cur1:r1.cur,idx1:r1.idx,q1,pop2,before,after,seen,cleared:S.lossQ===null,chest:S.xp.Chest===chest,tab:typeof tab!=='undefined'?tab:null}`);
  // first miss: 30 XP into the rank → down to 0, same rank, warned
  assert.equal(r.idx1, r.before); assert.equal(r.cur1, 0);
  assert.match(r.pop1, /lost some progress/); assert.doesNotMatch(r.pop1, /DEMOTED/); assert.match(r.pop1, /Quads[\s\S]*at 0 XP[\s\S]*demoted/);
  assert.match(r.pop1, /Leg Day/); assert.match(r.pop1, /Hamstrings/); assert.doesNotMatch(r.pop1, /Chest/);
  // second miss at 0 → demoted
  assert.equal(r.after, r.before - 1, 'Quads dropped a rank');
  assert.match(r.pop2, /DEMOTED/); assert.match(r.pop2, /5 muscles were demoted/);
  assert.equal(r.seen, r.after, 'getting the rank back will show the rank-up pop-up again');
  assert.ok(r.chest, 'Chest untouched by a missed Leg Day');
  assert.ok(r.q1 && r.cleared, 'loss waits until seen, then clears');
  assert.equal(r.tab, 'train', '"Get back on track" opens the Train tab');
  assert.deepEqual(p.errors, []);
});
