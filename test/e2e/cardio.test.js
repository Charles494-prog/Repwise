// Cardio: location prompt, shared map helper, live map without full re-renders, follow / recenter, interval formats,
// steps counted once (activity steps are a subset of the daily total), step XP without activity steps, cardio XP.
const test = require('node:test'), assert = require('node:assert/strict');
const { launch, baseState, sleep } = require('./harness');
const GEO = `(()=>{let i=0;const pos=()=>({coords:{latitude:14.5547+i*0.0002,longitude:121.0244+i*0.0001,accuracy:8},timestamp:Date.now()});
 navigator.geolocation.getCurrentPosition=ok=>setTimeout(()=>ok(pos()),30);
 navigator.geolocation.watchPosition=ok=>setInterval(()=>{i++;ok(pos())},200);navigator.geolocation.clearWatch=t=>clearInterval(t);
 navigator.permissions.query=async()=>({state:'prompt',onchange:null});})();`;
// A phone with a step-counter chip: window.__chip is the counter value (steps since boot).
const CHIP = `window.__chip=1000;window.Capacitor={Plugins:{StepSensor:{status:async()=>({available:true,granted:true}),request:async()=>({available:true,granted:true}),read:async()=>({total:window.__chip,ts:Date.now()})}}};`;
let p;
test.before(async () => { p = await launch(); });
test.after(async () => { await p.close(); });
const ready = async () => { for (let k = 0; k < 40 && !(await p.eval('return typeof V!=="undefined"&&!!V.train&&!!window.L&&typeof startActivity==="function"')); k++) await sleep(150); };
const wait = ms => `await new Promise(r=>setTimeout(r,${ms}));`;

test('cardio screen: asks for location once, shows maps, steps switch, no manual steps', async () => {
  await p.open({ state: baseState(), inject: GEO }); await ready();
  const r = await p.eval(`trainSub='run';go('train');${wait(500)}render();
    return {asked:S.locAsked,pos:!!LOC.pos,map:document.querySelectorAll('.leaflet-container').length,manual:/manually/i.test(document.body.innerText),rank:!!document.querySelector('.cd-rank'),oneAtATime:/only one/i.test(document.body.innerText)}`);
  assert.equal(r.asked, 1); assert.ok(r.pos); assert.ok(r.map >= 1); assert.equal(r.manual, false); assert.ok(r.rank); assert.equal(r.oneAtATime, false);
  assert.deepEqual(p.errors, []);
});

test('maps: one shared helper and tile config; plan layer under the track; recent activities use static previews', async () => {
  const now = Date.now(), pts = [[14.55, 121.02], [14.551, 121.021], [14.552, 121.023]];
  await p.open({ state: baseState({ runs: [1, 2, 3, 4].map(i => ({ type: 'run', ts: now - i * 864e5, pts, dist: 1500, time: 600, d: { run: 1500, walk: 0 }, t: { run: 600, walk: 0 } })) }), inject: GEO }); await ready();
  const r = await p.eval(`trainSub='run';go('train');${wait(300)}const today=MAPS.today,leafInList=document.querySelectorAll('.cd-act .leaflet-container').length,svgInList=document.querySelectorAll('.cd-act svg').length;
    const order=[...today.map._layers?Object.values(today.map._layers):[]].map(l=>l===today.plan?'plan':l===today.line?'line':l===today.extra?'extra':null).filter(Boolean);
    push('actdetail',S.runs[0].ts);${wait(300)}const detail=document.querySelectorAll('.leaflet-container').length,dm=MAPS['run:'+S.runs[0].ts];
    return {tiles:typeof TILES.url==='string'&&!!TILES.attribution,plan:!!today.plan,order,leafInList,svgInList,detail,detailLine:dm.line.getLatLngs().length,ro:!!today.ro,fb:today.el.classList.contains('cmap-fb')===!TILES.key}`);
  assert.ok(r.tiles); assert.ok(r.plan); assert.deepEqual(r.order, ['plan', 'line', 'extra']);
  assert.equal(r.leafInList, 0); assert.ok(r.svgInList >= 4); assert.ok(r.detail >= 1); assert.equal(r.detailLine, 3); assert.ok(r.ro); assert.ok(r.fb);
  assert.deepEqual(p.errors, []);
});

test('live map: GPS fixes update the map and numbers in place without re-rendering; dragging pauses follow and shows recenter', async () => {
  await p.open({ state: baseState(), inject: GEO }); await ready();
  const r = await p.eval(`ivPick('free');await goActivity();${wait(400)}let renders=0;const _r=render;render=function(...a){renders++;return _r.apply(this,a)};
    ${wait(1500)}const pts=RUN.pts.length,dist=$('#ldist').textContent,line=MAPS.live.line.getLatLngs().length,plan=!!MAPS.live.plan;
    MAPS.live.el.dispatchEvent(new Event('pointerdown'));const paused=MAPS.live.pauseUntil>Date.now(),shown=$('#recenter').classList.contains('show');
    recenter();const resumed=MAPS.live.pauseUntil===0&&!$('#recenter').classList.contains('show');render=_r;await stopRun();
    return {renders,pts,dist,line,plan,paused,shown,resumed}`);
  assert.equal(r.renders, 0); assert.ok(r.pts >= 4); assert.equal(r.line, r.pts); assert.notEqual(r.dist, '0.00'); assert.ok(r.plan);
  assert.ok(r.paused); assert.ok(r.shown); assert.ok(r.resumed);
  assert.deepEqual(p.errors, []);
});

test('intervals: 3:1 switches run/walk on schedule; a manual tap holds until the next interval', async () => {
  await p.open({ state: baseState(), inject: GEO }); await ready();
  const r = await p.eval(`startActivity();ivPick('3:1');await goActivity();const a=[RUN.mode,RUN.iv.ph.length];RUN.el=301;ivTick();a.push(RUN.mode);
    setMode('walk');RUN.el=303;ivTick();a.push(RUN.mode);RUN.el=481;ivTick();a.push(RUN.mode);RUN.el=541;ivTick();a.push(RUN.mode);await stopRun();return a`);
  assert.deepEqual(r, ['walk', 17, 'run', 'walk', 'walk', 'run']);
  assert.deepEqual(p.errors, []);
});

test('chip phone: daily steps keep counting during an activity; activity steps = chip delta (survives a reboot); no accelerometer', async () => {
  await p.open({ state: baseState({ steps: {} }), inject: GEO + CHIP }); await ready();
  const r = await p.eval(`for(let k=0;k<50&&!chipOK();k++)${wait(50)}${wait(300)}await syncSteps();const base=S.steps[today()]||0;ivPick('free');await goActivity();const pedoOn=pedo.on;
    window.__chip=1400;await chipTick();window.__chip=150;await chipTick();window.__chip=300;RUN.el=600;
    const c0=S.cardioXp,q0=S.xp.Quads;await stopRun();const run=S.runs.at(-1);
    return {base,pedoOn,steps:run.steps,day:S.steps[today()],act:S.actSteps[today()],cardio:S.cardioXp-c0,quads:S.xp.Quads-q0,xp:run.xp,box:/Automatic steps/.test(stepBox())}`);
  // 1000 → 1400 (+400), reboot to 150 (+150), → 300 (+150) = 700 activity steps, all inside the day's total.
  assert.equal(r.base, 0); assert.equal(r.pedoOn, false); assert.equal(r.steps, 700); assert.equal(r.act, 700); assert.equal(r.day, 700);
  assert.ok(r.cardio > 0); assert.ok(r.quads > 0); assert.equal(r.xp, r.cardio); assert.ok(r.box);
  assert.deepEqual(p.errors, []);
});

test('no-chip phone: each accelerometer step lands once in the day and once in the activity; pedometer stops after', async () => {
  await p.open({ state: baseState({ steps: {} }), inject: GEO }); await ready();
  const r = await p.eval(`ivPick('free');await goActivity();${wait(150)}const started=pedo.on;const ev=z=>({accelerationIncludingGravity:{x:0,y:0,z}});
    for(let i=0;i<5;i++){pedo.last=0;stepDetect(ev(14));stepDetect(ev(2))}const during=[S.steps[today()],RUN.steps];RUN.el=300;await stopRun();
    return {started,during,after:S.steps[today()],act:S.actSteps[today()],stopped:!pedo.on}`);
  assert.ok(r.started); assert.deepEqual(r.during, [5, 5]); assert.equal(r.after, 5); assert.equal(r.act, 5); assert.ok(r.stopped);
  assert.deepEqual(p.errors, []);
});

test('step XP skips activity steps, and the yesterday / best-day bonuses use the same definition', async () => {
  const y = new Date(Date.now() - 864e5), yd = y.getFullYear() + '-' + String(y.getMonth() + 1).padStart(2, '0') + '-' + String(y.getDate()).padStart(2, '0');
  await p.open({ state: baseState({ steps: { [yd]: 6000 }, actSteps: { [yd]: 3000 } }), inject: GEO }); await ready();
  const r = await p.eval(`const d=today();S.steps[d]=5200;S.actSteps[d]=2000;const c0=S.cardioXp;stepXP();const g=S.stepXp[d];
    trainSub='run';go('train');return {k:g.k,ov:g.ov,pr:g.pr,xp:S.cardioXp-c0,includes:($('#stepact')||{}).textContent,ring:$('#stepnow').textContent}`);
  // Today: 5,200 total, 2,000 from an activity → 3,200 count (3 × 5 XP). Yesterday: 6,000 − 3,000 = 3,000, so today beats it (+25)
  // and is also the best day (+50), even though yesterday's raw total (6,000) is higher.
  assert.equal(r.k, 3); assert.equal(r.ov, 1); assert.equal(r.pr, 1); assert.equal(r.xp, 15 + 25 + 50);
  assert.match(r.includes, /2,000 steps from activities/); assert.equal(r.ring.replace(/,/g, ''), '5200');
  assert.deepEqual(p.errors, []);
});

test('progressive overload: going farther than last time pays 1.5×, a new best pays 2×; steps earn XP per 1,000', async () => {
  await p.open({ state: baseState({ runs: [{ type: 'run', ts: Date.now() - 2 * 864e5, pts: [], dist: 3000, time: 1200, d: { run: 3000, walk: 0 }, t: { run: 1200, walk: 0 } }, { type: 'run', ts: Date.now() - 864e5, pts: [], dist: 2000, time: 900, d: { run: 2000, walk: 0 }, t: { run: 900, walk: 0 } }] }), inject: GEO }); await ready();
  const r = await p.eval(`const mk=d=>({type:'run',ts:Date.now(),pts:[],dist:d,time:d*0.45,d:{run:d,walk:0},t:{run:d*0.45,walk:0}});
    const ov=runXP(mk(2500)),pr=runXP(mk(3500));S.steps[today()]=3400;stepXP();return {ov:ov.ov,pr:pr.pr,k:S.stepXp[today()].k,auto:(setAutoSteps(false),S.autoSteps)}`);
  assert.ok(r.ov); assert.ok(r.pr); assert.equal(r.k, 3); assert.equal(r.auto, false);
  assert.deepEqual(p.errors, []);
});
