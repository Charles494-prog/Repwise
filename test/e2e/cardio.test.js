// Cardio: location prompt, maps, automatic steps on/off and paused during an activity, interval formats, cardio XP.
const test = require('node:test'), assert = require('node:assert/strict');
const { launch, baseState, sleep } = require('./harness');
const GEO = `(()=>{let i=0;const pos=()=>({coords:{latitude:14.5547+i*0.0002,longitude:121.0244+i*0.0001,accuracy:8},timestamp:Date.now()});
 navigator.geolocation.getCurrentPosition=ok=>setTimeout(()=>ok(pos()),30);
 navigator.geolocation.watchPosition=ok=>setInterval(()=>{i++;ok(pos())},200);navigator.geolocation.clearWatch=t=>clearInterval(t);
 navigator.permissions.query=async()=>({state:'prompt',onchange:null});})();`;
let p;
test.before(async () => { p = await launch(); });
test.after(async () => { await p.close(); });
const ready = async () => { for (let k = 0; k < 40 && !(await p.eval('return typeof V!=="undefined"&&!!V.train&&!!window.L&&typeof startActivity==="function"')); k++) await sleep(150); };

test('cardio screen: asks for location once, shows maps, steps switch, no manual steps', async () => {
  await p.open({ state: baseState(), inject: GEO }); await ready();
  const r = await p.eval(`trainSub='run';go('train');await new Promise(r=>setTimeout(r,500));render();
    return {asked:S.locAsked,pos:!!LOC.pos,map:document.querySelectorAll('.leaflet-container').length,manual:/manually/i.test(document.body.innerText),rank:!!document.querySelector('.cd-rank')}`);
  assert.equal(r.asked, 1); assert.ok(r.pos); assert.ok(r.map >= 1); assert.equal(r.manual, false); assert.ok(r.rank);
  assert.deepEqual(p.errors, []);
});

test('intervals: 3:1 switches run/walk on schedule; a manual tap holds until the next interval', async () => {
  await p.open({ state: baseState(), inject: GEO }); await ready();
  const r = await p.eval(`startActivity();ivPick('3:1');await goActivity();const a=[RUN.mode,RUN.iv.ph.length];RUN.el=301;ivTick();a.push(RUN.mode);
    setMode('walk');RUN.el=303;ivTick();a.push(RUN.mode);RUN.el=481;ivTick();a.push(RUN.mode);RUN.el=541;ivTick();a.push(RUN.mode);stopRun();return a`);
  assert.deepEqual(r, ['walk', 17, 'run', 'walk', 'walk', 'run']);
  assert.deepEqual(p.errors, []);
});

test('one at a time: automatic steps pause during an activity; finishing awards cardio + leg XP', async () => {
  await p.open({ state: baseState(), inject: GEO }); await ready();
  const r = await p.eval(`ivPick('free');await goActivity();const paused=/Paused while your activity/.test(stepBox());setAutoSteps(true);const still=S.autoSteps;
    await new Promise(r=>setTimeout(r,1200));const c0=S.cardioXp,q0=S.xp.Quads;RUN.el=600;stopRun();
    return {paused,running:!!RUN,cardio:S.cardioXp-c0,quads:S.xp.Quads-q0,xp:S.runs.at(-1).xp,back:/Automatic steps|Count steps/.test(stepBox())}`);
  assert.ok(r.paused); assert.equal(r.running, false); assert.ok(r.cardio > 0); assert.ok(r.quads > 0); assert.equal(r.xp, r.cardio); assert.ok(r.back);
  assert.deepEqual(p.errors, []);
});

test('progressive overload: going farther than last time pays 1.5×, a new best pays 2×; steps earn XP per 1,000', async () => {
  await p.open({ state: baseState({ runs: [{ type: 'run', ts: Date.now() - 2 * 864e5, pts: [], dist: 3000, time: 1200, d: { run: 3000, walk: 0 }, t: { run: 1200, walk: 0 } }, { type: 'run', ts: Date.now() - 864e5, pts: [], dist: 2000, time: 900, d: { run: 2000, walk: 0 }, t: { run: 900, walk: 0 } }] }), inject: GEO }); await ready();
  const r = await p.eval(`const mk=d=>({type:'run',ts:Date.now(),pts:[],dist:d,time:d*0.45,d:{run:d,walk:0},t:{run:d*0.45,walk:0}});
    const ov=runXP(mk(2500)),pr=runXP(mk(3500));S.steps[today()]=3400;stepXP();return {ov:ov.ov,pr:pr.pr,k:S.stepXp[today()].k,auto:(setAutoSteps(false),S.autoSteps)}`);
  assert.ok(r.ov); assert.ok(r.pr); assert.equal(r.k, 3); assert.equal(r.auto, false);
  assert.deepEqual(p.errors, []);
});
