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

// ---------- Plan a route (OpenRouteService mocked in the page) ----------
// Loops are circles whose direction depends on the seed (every 6th seed is an out-and-back); window.__orsValid limits
// how many valid loops exist. One-way routes go to the requested point with a detour (~1.33× the straight line).
const ORS = `(()=>{const R=6371e3,rad=x=>x*Math.PI/180,deg=x=>x*180/Math.PI;
 const dest=(p,b,m)=>{const d=m/R,br=rad(b),la=rad(p[0]),lo=rad(p[1]),la2=Math.asin(Math.sin(la)*Math.cos(d)+Math.cos(la)*Math.sin(d)*Math.cos(br));return[deg(la2),deg(lo+Math.atan2(Math.sin(br)*Math.sin(d)*Math.cos(la),Math.cos(d)-Math.sin(la)*Math.sin(la2)))]};
 const hav=(a,b)=>{const dl=rad(b[0]-a[0]),dn=rad(b[1]-a[1]),h=Math.sin(dl/2)**2+Math.cos(rad(a[0]))*Math.cos(rad(b[0]))*Math.sin(dn/2)**2;return 2*R*Math.asin(Math.sqrt(h))};
 const len=p=>p.reduce((s,q,i)=>i?s+hav(p[i-1],q):0,0),brg=(a,b)=>{const y=Math.sin(rad(b[1]-a[1]))*Math.cos(rad(b[0])),x=Math.cos(rad(a[0]))*Math.sin(rad(b[0]))-Math.sin(rad(a[0]))*Math.cos(rad(b[0]))*Math.cos(rad(b[1]-a[1]));return(deg(Math.atan2(y,x))+360)%360};
 const fc=p=>({ok:true,status:200,json:async()=>({features:[{geometry:{coordinates:p.map(q=>[q[1],q[0],5])},properties:{summary:{distance:len(p),duration:len(p)/1.4},ascent:12}}]})});
 window.__orsCalls=0;window.__orsValid=Infinity;const real=window.fetch;
 window.fetch=async(url,init)=>{if(!String(url).includes('openrouteservice'))return real(url,init);window.__orsCalls++;await new Promise(r=>setTimeout(r,20));const b=JSON.parse(init.body);
  if(b.options&&b.options.round_trip){const{length:L,seed}=b.options.round_trip,s=[b.coordinates[0][1],b.coordinates[0][0]];
   const ob=()=>{const o=Array.from({length:21},(_,i)=>dest(s,40,i*L/40));return[...o,...o.slice(0,-1).reverse()]};
   if(window.__orsCalls>window.__orsValid||seed%6===0)return fc(ob());const th=(seed*47)%360,r=L/2/Math.PI,c=dest(s,th,r);return fc(Array.from({length:73},(_,i)=>dest(c,th+180+i*5,r)))}
  const[a,d]=b.coordinates.map(c=>[c[1],c[0]]);return fc([a,dest(a,brg(a,d)+41.4,hav(a,d)/2/Math.cos(rad(41.4))),d])}})();`;
const ROUTE_SETUP = `S.orsKey='test-key-0123456789abcdef';RWRoutes.config.key=S.orsKey;RWRoutes._state.session={};RWRoutes._state.cache={};LOC.pos=[14.5547,121.0244];LOC.state='granted';`;

test('plan a route: time goal shows the distance estimate from the usual pace; loop gives ≥ 3 suggestions on the map', async () => {
  const runs = [{ type: 'run', ts: Date.now() - 864e5, pts: [], dist: 5000, time: 1500, d: { run: 5000, walk: 0 }, t: { run: 1500, walk: 0 } }];
  await p.open({ state: baseState({ runs }), inject: GEO + ORS }); await ready();
  const r = await p.eval(`${ROUTE_SETUP}startActivity();goalSet('g','time');ivPick('free');goalSet('time',1800);const est=$('#goalest').textContent;goalSet('kind','loop');
    const btn=[...document.querySelectorAll('#sheet .btn')].map(b=>b.textContent);openRoutes();for(let k=0;k<60&&(ROUTES.busy||!ROUTES.list.length);k++)${wait(50)}
    const cards=document.querySelectorAll('.cd-route').length,lines=Object.values(MAPS.plan.plan._layers).length,meters=ROUTES.meters;
    pickRoute(2);const sel=document.querySelectorAll('.cd-route')[2].classList.contains('on');
    const other=Object.values(MAPS.plan.plan._layers).find(l=>l.getLatLngs().length&&l.options.weight===4);other.fire('click');const tapped=ROUTES.sel!==2&&document.querySelectorAll('.cd-route.on').length===1;
    return {est,btn,cards,lines,meters,sel,tapped,calls:window.__orsCalls}`);
  assert.match(r.est, /≈ 6\.0 km at your usual pace/); assert.equal(r.meters, 6000); assert.ok(r.btn.includes('Find routes')); assert.ok(r.btn.includes('Start without a route'));
  assert.ok(r.cards >= 3); assert.ok(r.lines >= 3); assert.ok(r.sel); assert.ok(r.tapped); assert.ok(r.calls <= 12);
  assert.deepEqual(p.errors, []);
});

test('plan a route: Reroll disables while fetching and returns ≥ 3 routes not shown before', async () => {
  await p.open({ state: baseState(), inject: GEO + ORS }); await ready();
  const r = await p.eval(`${ROUTE_SETUP}startActivity();goalSet('g','distance');goalSet('dist',5000);openRoutes();for(let k=0;k<60&&(ROUTES.busy||!ROUTES.list.length);k++)${wait(50)}
    const first=ROUTES.list.slice();const pr=loadRoutes(true);${wait(10)}const dis=$('#reroll').disabled,txt=$('#reroll').textContent;await pr;
    const second=ROUTES.list.slice();const ov=Math.max(0,...second.flatMap(a=>first.map(b=>RWRoutes.overlap(a.pts,b.pts))));
    return {n1:first.length,n2:second.length,dis,txt,ov,cards:document.querySelectorAll('.cd-route').length}`);
  assert.ok(r.n1 >= 3); assert.ok(r.n2 >= 3); assert.ok(r.dis); assert.match(r.txt, /Finding new routes/); assert.ok(r.ov <= 0.7); assert.equal(r.cards, r.n2);
  assert.deepEqual(p.errors, []);
});

test('plan a route: fewer than 3 valid routes shows what exists with a one-line note; errors offer starting without a route', async () => {
  await p.open({ state: baseState(), inject: GEO + ORS }); await ready();
  const r = await p.eval(`${ROUTE_SETUP}window.__orsValid=2;startActivity();goalSet('g','distance');openRoutes();for(let k=0;k<80&&(ROUTES.busy||!ROUTES.list.length);k++)${wait(50)}
    const few={n:ROUTES.list.length,msg:($('#routemsg')||{}).textContent};
    return {few,escape:[...document.querySelectorAll('.btn')].some(b=>/Start without a route/.test(b.textContent))}`);
  assert.ok(r.few.n >= 1 && r.few.n < 3); assert.match(r.few.msg, /Only \d different routes? found/); assert.ok(r.escape);
  assert.deepEqual(p.errors, []);
});

test('plan a route: live map draws the dashed plan, shows km to go and Off route; the plan is saved with planned vs actual', async () => {
  await p.open({ state: baseState(), inject: GEO + ORS }); await ready();
  const r = await p.eval(`${ROUTE_SETUP}startActivity();goalSet('g','distance');goalSet('dist',3000);ivPick('1:1');openRoutes();for(let k=0;k<60&&(ROUTES.busy||!ROUTES.list.length);k++)${wait(50)}
    startWithRoute();for(let k=0;k<40&&!RUN?.plan;k++)${wait(50)}${wait(800)}const live=MAPS.live,planLayers=Object.values(live.plan._layers),dash=planLayers[0]?.options.dashArray,iv=!!RUN.iv;
    const left=$('#lplan').textContent;RUN.pts.push([14.70,121.20]);planTrack();RUN.offSince=Date.now()-21000;liveStats();const off=$('#loff').classList.contains('show');
    RUN.el=900;await stopRun();const run=S.runs.at(-1);push('actdetail',run.ts);${wait(200)}
    return {dash,iv,left,off,plan:run.plan&&{kind:run.plan.kind,goal:run.plan.goal,target:run.plan.target,pts:run.plan.pts.length>10},vs:($('#planvs')||{}).textContent,detailPlan:Object.values(MAPS['run:'+run.ts].plan._layers).length}`);
  assert.equal(r.dash, '8 10'); assert.ok(r.iv); assert.match(r.left, /km to go/); assert.ok(r.off);
  assert.deepEqual(r.plan, { kind: 'loop', goal: 'distance', target: 3000, pts: true }); assert.match(r.vs, /Planned vs actual/); assert.match(r.vs, /km planned/); assert.equal(r.detailPlan, 1);
  assert.deepEqual(p.errors, []);
});

test('plan a route: no key → one-time setup (opt-in); saving a key finds routes; a rejected key asks again; key can be removed', async () => {
  await p.open({ state: baseState(), inject: GEO + ORS }); await ready();
  const r = await p.eval(`LOC.pos=[14.5547,121.0244];LOC.state='granted';RWRoutes._state.session={};RWRoutes._state.cache={};startActivity();goalSet('g','distance');
    const hint=/one-time setup/.test($('#sheet').textContent);openRoutes();${wait(100)}const setup=!!$('.cd-key'),calls0=window.__orsCalls,escape=[...document.querySelectorAll('.btn')].some(b=>/Start without a route/.test(b.textContent));
    $('#orskey').value='short';saveOrsKey();const stillSetup=!!$('.cd-key');
    $('#orskey').value='my-own-key-0123456789abcdef';saveOrsKey();for(let k=0;k<60&&(ROUTES.busy||!ROUTES.list.length);k++)${wait(50)}
    const found=ROUTES.list.length,saved=S.orsKey,stored=JSON.parse(localStorage.getItem('gq')).orsKey;
    const real=window.fetch;window.fetch=async()=>({ok:false,status:403,json:async()=>({})});await loadRoutes(true);window.fetch=real;const rejected={setup:!!$('.cd-key'),msg:($('#routemsg')||{}).textContent};
    removeOrsKey();return {hint,setup,calls0,escape,stillSetup,found,saved,stored,rejected,removed:S.orsKey===''&&RWRoutes.config.key===''&&!!$('.cd-key')}`);
  assert.ok(r.hint); assert.ok(r.setup); assert.equal(r.calls0, 0); assert.ok(r.escape); assert.ok(r.stillSetup);
  assert.ok(r.found >= 3); assert.equal(r.saved, 'my-own-key-0123456789abcdef'); assert.equal(r.stored, r.saved);
  assert.ok(r.rejected.setup); assert.match(r.rejected.msg, /didn’t work/); assert.ok(r.removed);
  assert.deepEqual(p.errors, []);
});

test('route suggestions are optional: maps and activities work without a key; Cardio has a setup row with step-by-step instructions', async () => {
  await p.open({ state: baseState(), inject: GEO }); await ready();
  const r = await p.eval(`trainSub='run';go('train');${wait(300)}const row=[...document.querySelectorAll('.cd-toggle')].find(x=>/Route suggestions/.test(x.textContent));
    const off=/Off · optional/.test(row.textContent),maps=document.querySelectorAll('.leaflet-container').length;row.click();${wait(100)}
    const steps=document.querySelectorAll('.cd-key ol li').length,link=!!document.querySelector('.cd-key a[href="https://account.heigit.org"]'),noStart=![...document.querySelectorAll('.btn')].some(b=>/Start without a route/.test(b.textContent));
    $('#orskey').value='my-own-key-0123456789abcdef';saveOrsKey();${wait(100)}const back=trainSub==='run'&&!stack.length,on=/On · uses your own/.test(document.body.textContent);
    ivPick('free');await goActivity();${wait(400)}const live=!!MAPS.live;await stopRun();return {off,maps,steps,link,noStart,back,on,live}`);
  assert.ok(r.off); assert.ok(r.maps >= 1); assert.equal(r.steps, 4); assert.ok(r.link); assert.ok(r.noStart); assert.ok(r.back); assert.ok(r.on); assert.ok(r.live);
  assert.deepEqual(p.errors, []);
});
