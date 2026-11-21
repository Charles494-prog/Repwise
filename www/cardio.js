// RepWise cardio: location permission, maps (Leaflet, minimal street tiles), automatic steps on/off,
// steps counted once (an activity's steps are part of the daily total), run/walk intervals, route planning, cardio XP + rank.

// ================= MAPS =================
// One tile config and one makeMap() for every map in the app. CARTO Positron ("light_all") needs a free key
// (carto.com/basemaps/apikey, non-commercial: 5M tiles/month, credit must stay visible). Until a key is set we fall
// back to the standard OSM tiles, greyed out with CSS so the red route still stands out. (⁠ keeps the icon swapper off ©.)
const TILES={key:'',url:'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png?key={key}',subdomains:'abcd',maxZoom:20,
 attribution:'⁠© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors ⁠© <a href="https://carto.com/attribution/">CARTO</a>',
 fallback:{url:'https://tile.openstreetmap.org/{z}/{x}/{y}.png',maxZoom:19,attribution:'⁠© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}};
// Maps survive re-renders: each one is cached by key and its element is moved into the new placeholder.
const MAPS={};
function mapEl(key,h=200){return`<div class="cmap" data-map="${key}" style="height:${h}px"></div>`}
function dropMap(k){try{MAPS[k]?.ro?.disconnect();MAPS[k]?.map.remove()}catch(e){}delete MAPS[k]}
// Layers bottom → top: plan (a planned route, dashed), line (the GPS track, red), extra (start / current / end dots).
function makeMap(el,o={}){const map=L.map(el,{zoomControl:false,attributionControl:true,dragging:o.interactive!==false,touchZoom:o.interactive!==false,doubleClickZoom:o.interactive!==false,scrollWheelZoom:false,boxZoom:false,keyboard:false});
 map.attributionControl.setPrefix(false);const t=TILES.key?TILES:TILES.fallback;
 L.tileLayer(t.url,{key:TILES.key,subdomains:TILES.subdomains,maxZoom:t.maxZoom,attribution:t.attribution,detectRetina:false}).addTo(map);if(!TILES.key)el.classList.add('cmap-fb');
 const m={el,map,plan:L.layerGroup().addTo(map),line:L.polyline([],{color:'#e3262f',weight:5,lineCap:'round',lineJoin:'round'}).addTo(map),extra:L.layerGroup().addTo(map),fit:false,pauseUntil:0};
 // Size can be 0 while a screen or sheet animates in: re-measure whenever the element actually gets a size.
 if(window.ResizeObserver){m.ro=new ResizeObserver(()=>{if(el.offsetWidth&&el.offsetHeight)map.invalidateSize({pan:false})});m.ro.observe(el)}
 if(o.onUser)['pointerdown','touchstart','wheel'].forEach(ev=>el.addEventListener(ev,()=>o.onUser(m),{passive:true}));
 map.setView(o.center||LOC.pos||[14.5995,120.9842],o.zoom||13);return m}
function mountMaps(){if(!window.L)return;document.querySelectorAll('#app [data-map]').forEach(ph=>{const key=ph.dataset.map;let m=MAPS[key];
 if(m&&m.el!==ph){m.el.style.height=ph.style.height;ph.replaceWith(m.el)}
 if(!m)m=MAPS[key]=makeMap(ph,key==='live'?{zoom:17,onUser:followPause}:{zoom:key==='today'?16:13});
 drawMap(key,m);requestAnimationFrame(()=>m.el.offsetWidth&&m.map.invalidateSize({pan:false}))})}
const dotOn=(m,p,c,r=7)=>L.circleMarker(p,{radius:r,color:'#fff',weight:3,fillColor:c,fillOpacity:1,interactive:false}).addTo(m.extra);
function drawMap(key,m){const runs=key==='today'?S.runs.filter(r=>iso(r.ts)===today()):[],pts=key==='live'?(RUN?.pts||[]):key.startsWith('run:')?(S.runs.find(r=>String(r.ts)===key.slice(4))?.pts||[]):[];
 m.extra.clearLayers();
 if(key==='today'){runs.forEach(r=>{if(r.pts.length>1)L.polyline(r.pts,{color:'#e3262f',weight:4,opacity:.8,interactive:false}).addTo(m.extra)});
  if(LOC.pos){dotOn(m,LOC.pos,'#2563eb',8);if(!m.fit){m.map.setView(LOC.pos,16);m.fit=true}}return}
 if(key==='plan')return drawPicker(m);
 const plan=key==='live'?RUN?.plan:S.runs.find(r=>String(r.ts)===key.slice(4))?.plan;
 if(plan&&!m.planOn){L.polyline(plan.pts,{color:'#2563eb',weight:5,opacity:.45,dashArray:'8 10',interactive:false}).addTo(m.plan);m.planOn=true}
 m.line.setLatLngs(pts);if(!pts.length){if(plan&&!m.fit){m.map.fitBounds(L.latLngBounds(plan.pts),{padding:[24,24]});m.fit=key!=='live'}else if(LOC.pos&&!m.fit)m.map.setView(LOC.pos,16);return}
 dotOn(m,pts[0],'#16a34a');dotOn(m,pts.at(-1),key==='live'?'#2563eb':'#e3262f',8);
 if(key==='live')follow(m,pts.at(-1));
 else if(!m.fit&&pts.length>1){m.map.fitBounds(plan?m.line.getBounds().extend(L.latLngBounds(plan.pts)):m.line.getBounds(),{padding:[24,24]});m.fit=true}}
// Route picker: every suggestion drawn; the selected one on top and thicker. Tapping a line selects its card.
function drawPicker(m){m.plan.clearLayers();const R=ROUTES;if(LOC.pos)dotOn(m,LOC.pos,'#16a34a');
 R.list.forEach((r,i)=>{if(i===R.sel)return;L.polyline(r.pts,{color:ROUTE_COL[i%5],weight:4,opacity:.55}).on('click',()=>pickRoute(i)).addTo(m.plan)});
 const s=R.list[R.sel];if(s){L.polyline(s.pts,{color:ROUTE_COL[R.sel%5],weight:7,opacity:.95}).on('click',()=>pickRoute(R.sel)).addTo(m.plan);if(R.kind==='oneway')dotOn(m,s.pts.at(-1),'#e3262f')}
 if(R.list.length&&m.fitBatch!==R.batch){m.map.fitBounds(L.latLngBounds(R.list.flatMap(r=>r.pts)),{padding:[20,20]});m.fitBatch=R.batch}else if(!R.list.length&&LOC.pos&&!m.fit){m.map.setView(LOC.pos,15);m.fit=true}}
// Live follow: centre once, then only pan when the dot nears the edge. A drag / pinch pauses following for 10 s.
function follow(m,p){if(!m.fit){m.map.setView(p,17,{animate:false});m.fit=true;return}if(Date.now()<m.pauseUntil)return;
 const b=m.map.getBounds(),la=b.getNorth()-b.getSouth(),lo=b.getEast()-b.getWest(),inner=L.latLngBounds([b.getSouth()+la*.2,b.getWest()+lo*.2],[b.getNorth()-la*.2,b.getEast()-lo*.2]);
 if(!inner.contains(p))m.map.panTo(p,{animate:true,duration:.5})}
function followPause(m){m.pauseUntil=Date.now()+10000;$('#recenter')?.classList.add('show');clearTimeout(m.rcT);m.rcT=setTimeout(()=>{$('#recenter')?.classList.remove('show');const p=RUN?.pts.at(-1);if(p)follow(m,p)},10050)}
function recenter(){const m=MAPS.live,p=RUN?.pts.at(-1)||LOC.pos;if(!m)return;m.pauseUntil=0;clearTimeout(m.rcT);$('#recenter')?.classList.remove('show');if(p)m.map.setView(p,Math.max(m.map.getZoom(),16),{animate:true})}

// ================= LOCATION PERMISSION =================
const LOC={state:'unknown',pos:null};
async function locState(){try{const p=await navigator.permissions.query({name:'geolocation'});LOC.state=p.state;p.onchange=()=>{LOC.state=p.state;if(tab==='train'&&trainSub==='run')render()}}catch(e){}}
function askLocation(quiet){if(!navigator.geolocation)return quiet||toast('Location is not available on this phone');
 navigator.geolocation.getCurrentPosition(p=>{LOC.pos=[p.coords.latitude,p.coords.longitude];LOC.state='granted';if(!quiet)toast('📍 Location on — your runs will be mapped');if(tab==='train'&&trainSub==='run')render()},
  e=>{if(e.code===1){LOC.state='denied';if(!quiet)toast('📍 Location blocked — allow it in phone Settings → Apps → RepWise → Permissions')}if(tab==='train'&&trainSub==='run')render()},{enableHighAccuracy:true,timeout:20000,maximumAge:60000})}
locState();
function locCard(){if(LOC.state==='granted')return'';
 return`<div class="cd-loc"><div><b>📍 ${LOC.state==='denied'?'Location is blocked':'Allow location for cardio'}</b><small>${LOC.state==='denied'?'Turn it on in phone Settings → Apps → RepWise → Permissions → Location.':'Needed to map your runs and walks and measure distance. Your routes stay on your phone.'}</small></div>${LOC.state==='denied'?'':`<button class="btn sm" onclick="askLocation()">Allow</button>`}</div>`}

// ================= AUTOMATIC STEPS: on/off; an activity's steps are part of the daily total, never on top of it =================
S.autoSteps??=true;S.actSteps??={};
const chipOK=()=>!!SSP()&&stepSt.available&&stepSt.granted;
async function chipRead(){try{return chipOK()?(await SSP().read()).total:null}catch(e){return null}}
// Re-read the step chip without counting: used while automatic steps are off, so those steps never land later.
async function stepBaseline(){const t=await chipRead();if(t==null)return;S.ss={raw:t,day:today(),at:Date.now()};save()}
// Syncs run one after another: two overlapping reads could otherwise apply an older counter value last.
let syncQ=Promise.resolve();const _syncC=syncSteps;syncSteps=function(){return syncQ=syncQ.then(async()=>{if(!S.autoSteps)return stepBaseline();await _syncC();stepXP()}).catch(e=>console.error(e))};
function setAutoSteps(on){S.autoSteps=on;save();if(on){stepBaseline().then(()=>toast('👟 Automatic steps on'))}else toast('Automatic steps off');render()}
// Activity steps on chip phones = the chip's change between start and finish (a drop means the phone rebooted mid-run).
// One read at a time (a timer tick and Finish can overlap); daily steps sync from the same readings.
async function chipTick(R=RUN){if(!R?.chip)return;if(R.chipP)return R.chipP;R.chipP=(async()=>{if(S.autoSteps)await syncSteps();const t=await chipRead();if(t!=null){R.chip.acc+=t>=R.chip.last?t-R.chip.last:t;R.chip.last=t;R.steps=R.chip.acc}})();
 try{await R.chipP}finally{R.chipP=null}}
stepBox=function(){const hw=stepSt.available&&stepSt.granted,last=S.ss?.at;
 if(hw)return`<div class="cd-toggle"><div><b>Automatic steps</b><small>${S.autoSteps?`All day, even with the app closed${RUN?' · includes your activity':''}${last?` · synced ${new Date(last).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})}`:''}`:'Off — no steps are being counted'}</small></div><button class="sw ${S.autoSteps?'on':''}" role="switch" aria-checked="${S.autoSteps}" aria-label="Automatic steps" onclick="setAutoSteps(${!S.autoSteps})"><i></i></button></div>`;
 if(stepSt.available)return`<button class="btn" onclick="enableSteps()">👟 Turn on automatic steps</button><p class="t-caption" style="margin-top:8px">Uses your phone's step-counter chip. Asks for "Physical activity" permission once.</p>`;
 return`<div class="cd-toggle"><div><b>Count steps with the app open</b><small>This phone has no step-counter chip, so steps only count while RepWise is on screen.</small></div><button class="sw ${pedo.on?'on':''}" role="switch" aria-checked="${pedo.on}" aria-label="Count steps" onclick="${pedo.on?'stopPedo()':'startPedo()'};render()"><i></i></button></div>`};
const _enC=enableSteps;enableSteps=async function(){S.autoSteps=true;await _enC()};

// ================= CARDIO XP + RANK (same curve as muscles; beating your last effort pays more) =================
S.cardioXp??=0;S.stepXp??={};
const LEGS=['Quads','Hamstrings','Glutes','Calves'];
function giveCardio(xp,legShare=.5){S.cardioXp+=xp;LEGS.forEach(m=>S.xp[m]+=Math.round(xp*legShare));S.xp.Core+=Math.round(xp*.15)}
// Steps: 5 XP per 1,000; one-time bonus for beating yesterday (overload) and your best day (PR).
// Activity XP already pays for steps taken during an activity, so step XP and both bonuses use steps outside activities.
const netSteps=d=>Math.max(0,(S.steps[d]||0)-(S.actSteps[d]||0)-(RUN&&d===today()?RUN.steps:0));
function stepXP(){const d=today(),n=netSteps(d),g=S.stepXp[d]??={k:0,ov:0,pr:0},k=Math.floor(n/1000);if(k>g.k){giveCardio((k-g.k)*5,.4);g.k=k}
 const y=new Date();y.setDate(y.getDate()-1);const yn=netSteps(iso(y)),best=Math.max(0,...Object.keys(S.steps).filter(x=>x!==d).map(netSteps));
 if(!g.ov&&yn>=2000&&n>yn){g.ov=1;giveCardio(25,.4);toast('📈 More steps than yesterday — +25 cardio XP')}
 if(!g.pr&&best>=3000&&n>best){g.pr=1;giveCardio(50,.4);toast('🏅 Best step day ever — +50 cardio XP')}
 for(const x of Object.keys(S.stepXp))if(x<iso(Date.now()-30*864e5))delete S.stepXp[x];save()}
function runXP(r){const base=Math.round(r.d.run/1000*60+r.d.walk/1000*30+r.time/60),prev=S.runs.filter(x=>x!==r&&x.ts<r.ts),last=prev.at(-1),pc=x=>x.dist>=500?x.time/x.dist:Infinity;
 const pr=prev.length&&(r.dist>Math.max(...prev.map(x=>x.dist))||(r.dist>=1000&&pc(r)<Math.min(...prev.filter(x=>x.dist>=1000).map(pc)))),ov=!pr&&last&&(r.dist>last.dist||pc(r)<pc(last));
 return{xp:Math.round(base*(pr?2:ov?1.5:1)),pr,ov}}
function cardioRank(){const r=rankOf(S.cardioXp);return`<div class="cd-rank" onclick="push('cardiorank')"><div class="cd-rk-top">${typeof rankBadge==='function'?rankBadge(r.idx,40):''}<div style="flex:1"><small>Cardio rank</small><b style="color:${r.color}">${r.name}</b></div><span class="chev">›</span></div>
 <div class="bar" style="margin-top:10px"><i style="width:${r.cur/r.need*100}%;background:${r.color}"></i></div><small class="num">${r.cur.toLocaleString()} / ${r.need.toLocaleString()} XP · beat your last run or yesterday's steps for bonus XP</small></div>`}
V.cardiorank=()=>{const r=rankOf(S.cardioXp);return`<div class="top">${backBtn()}<h1 style="font-size:22px;flex:1;margin-left:var(--s1)">Cardio rank</h1><span></span></div>
 ${cardioRank().replace(' onclick="push(\'cardiorank\')"','').replace('<span class="chev">›</span>','')}
 <div class="sec">How you earn cardio XP</div><div class="list">
 <div class="row" style="cursor:default"><div class="rbody"><b>Activity</b><small>60 XP per km run, 30 per km walked, +1 per minute</small></div></div>
 <div class="row" style="cursor:default"><div class="rbody"><b>Progressive overload · 1.5×</b><small>Go farther or faster than your last activity</small></div></div>
 <div class="row" style="cursor:default"><div class="rbody"><b>Personal record · 2×</b><small>Your longest distance, or fastest pace over 1 km</small></div></div>
 <div class="row" style="cursor:default"><div class="rbody"><b>Daily steps</b><small>5 XP per 1,000 outside activities · +25 for beating yesterday · +50 for your best day</small></div></div></div>
 <div class="sec">Muscles it trains</div><p class="t-body muted">Cardio also gives XP to your <b>quads, hamstrings, glutes and calves</b> (half of each activity's XP) and a little to your <b>core</b>, so it moves your leg ranks too.</p>`};

// ================= INTERVALS: run : walk formats =================
const FORMATS=[['free','Free','Switch run / walk yourself',0,0,0],['1:1','1 : 1','1 min run · 1 min walk',60,60,15],['2:1','2 : 1','2 min run · 1 min walk',120,60,10],['3:1','3 : 1','3 min run · 1 min walk',180,60,8],['3:2','3 : 2','3 min run · 2 min walk',180,120,6],['5:1','5 : 1','5 min run · 1 min walk',300,60,5],['custom','Custom','Set your own run, walk and rounds',120,60,8]];
let IVS={f:'1:1',run:60,walk:60,rounds:15,warm:true};
// Goal: free (as before), a distance, or a time turned into a distance at the user's usual pace; then loop or one way.
let GOAL={g:'free',dist:5000,time:1800,kind:'loop'};
const runFrac=()=>IVS.f==='free'?1:IVS.run/(IVS.run+IVS.walk);
const goalMeters=()=>GOAL.g==='distance'?GOAL.dist:RWRoutes.timeToMeters(GOAL.time,RWRoutes.paces(S.runs),runFrac());
function goalBox(){const g=GOAL.g,P=RWRoutes.paces(S.runs);
 const seg=`<div class="cd-seg">${[['free','Free'],['distance','Distance'],['time','Time']].map(([k,l])=>`<button class="${g===k?'on':''}" onclick="goalSet('g','${k}')">${l}</button>`).join('')}</div>`;
 if(g==='free')return seg;
 const isD=g==='distance',v=isD?GOAL.dist:GOAL.time,k=isD?'dist':'time',step=isD?500:300;
 const chips=(isD?[1000,3000,5000,10000]:[900,1800,2700,3600]).map(x=>`<button class="${v===x?'on':''}" onclick="goalSet('${k}',${x})">${isD?x/1000+' km':x/60+' min'}</button>`).join('');
 return`${seg}<div class="chips" style="margin-top:var(--s1)">${chips}</div>
 <div class="afrow"><span>${isD?'Distance':'Time'}</span><span class="afstep"><button onclick="goalSet('${k}',${v-step})">−</button><b>${isD?(v/1000).toFixed(1)+' km':v/60+' min'}</b><button onclick="goalSet('${k}',${v+step})">+</button></span></div>
 ${isD?'':`<p class="t-caption" id="goalest">≈ ${(goalMeters()/1000).toFixed(1)} km at ${P.fromHistory?'your usual pace':runFrac()===1?'a typical jog pace (6:30 /km)':'typical jog (6:30 /km) and walk (11:00 /km) paces'}</p>`}
 <div class="afsec">Route</div><div class="cd-fmts">${[['loop','Loop','start and finish here, different streets back'],['oneway','One way','end somewhere else, plan your own way back']].map(([x,n,d])=>`<button class="${GOAL.kind===x?'on':''}" onclick="goalSet('kind','${x}')"><b>${n}</b><small>${d.replace(/^./,c=>c.toUpperCase())}</small></button>`).join('')}</div>`}
function goalSet(k,v){if(k==='dist')v=Math.max(500,Math.min(42000,v));if(k==='time')v=Math.max(300,Math.min(14400,v));GOAL[k]=v;$('#sheet').innerHTML='<div class="grab"></div>'+ivSheet()}
function startActivity(){if(LOC.state==='denied')return toast('📍 Location is blocked — allow it in phone Settings → Apps → RepWise → Permissions');openSheet(ivSheet())}
function ivSheet(){const f=IVS.f,cus=f==='custom',total=f==='free'?0:Math.round(((IVS.run+IVS.walk)*IVS.rounds+(IVS.warm?300:0))/60);
 const step=(k,l,d,unit,min,max)=>`<div class="afrow"><span>${l}</span><span class="afstep"><button onclick="ivSet('${k}',${-d},${min},${max})">−</button><b>${k==='rounds'?IVS[k]:IVS[k]/60}${unit}</b><button onclick="ivSet('${k}',${d},${min},${max})">+</button></span></div>`;
 return`<h3 class="t-title">Start activity</h3>
 <div class="afsec">Goal</div>${goalBox()}
 <div class="afsec">Format</div><p class="t-caption" style="margin:-4px 0 var(--s1)">Intervals switch between run and walk for you with a buzz.</p>
 <div class="cd-fmts">${FORMATS.map(([k,n,d])=>`<button class="${f===k?'on':''}" onclick="ivPick('${k}')"><b>${n}</b><small>${d}</small></button>`).join('')}</div>
 ${f==='free'?'':`${cus?step('run','Run',30,' min',30,1800)+step('walk','Walk / rest',30,' min',30,900):''}${step('rounds','Rounds',1,'',1,40)}
  <div class="afrow"><span>5 min warm-up walk</span><button class="sw ${IVS.warm?'on':''}" role="switch" aria-checked="${IVS.warm}" onclick="IVS.warm=!IVS.warm;$('#sheet').innerHTML='<div class=&quot;grab&quot;></div>'+ivSheet()"><i></i></button></div>
  <p class="t-caption" style="margin-top:6px">${IVS.rounds} × (${IVS.run/60} min run + ${IVS.walk/60} min walk)${IVS.warm?' + warm-up':''} · about ${total} min</p>`}
 <p class="t-caption" style="margin-top:var(--s1)">Steps you take during the activity count toward your daily steps too.</p>
 ${GOAL.g==='free'?`<button class="btn" style="margin-top:var(--s2)" onclick="goActivity()">Start</button>`:`<button class="btn" style="margin-top:var(--s2)" onclick="openRoutes()">Find routes</button><button class="btn sec2" style="margin-top:var(--s1)" onclick="goActivity()">Start without a route</button>`}`}
function ivPick(k){const F=FORMATS.find(x=>x[0]===k);IVS.f=k;if(k!=='custom'&&k!=='free'){IVS.run=F[3];IVS.walk=F[4];IVS.rounds=F[5]}$('#sheet').innerHTML='<div class="grab"></div>'+ivSheet()}
function ivSet(k,d,min,max){IVS[k]=Math.max(min,Math.min(max,IVS[k]+d));$('#sheet').innerHTML='<div class="grab"></div>'+ivSheet()}
async function goActivity(plan){closeSheet();await syncSteps();const c0=await chipRead();
 const free=IVS.f==='free',ph=[];if(!free){if(IVS.warm)ph.push(['walk',300,'Warm-up']);for(let i=1;i<=IVS.rounds;i++){ph.push(['run',IVS.run,`Round ${i}/${IVS.rounds}`]);ph.push(['walk',IVS.walk,`Round ${i}/${IVS.rounds}`])}}
 startRun(free?'run':ph[0][0]);if(!RUN)return;if(c0!=null)RUN.chip={start:c0,last:c0,acc:0};if(plan)setPlan(plan);RUN.uiT=setInterval(()=>{liveStats();if(RUN?.chip&&Math.floor(RUN.el)%10===0)chipTick()},1000);
 if(free)return;let t=0;RUN.iv={f:IVS.f,ph:ph.map(([m,s,l])=>({m,s,l,end:t+=s})),i:0,done:false};RUN.ivT=setInterval(ivTick,500)}
// ================= PLAN A ROUTE =================
let ROUTES={list:[],sel:0,busy:false,msg:'',meters:0,kind:'loop',batch:0};
const routeTime=r=>RWRoutes.metersToSecs(r.meters,RWRoutes.paces(S.runs),runFrac());
const ROUTE_ERR={nokey:'Route planning isn’t set up yet (no OpenRouteService key).',rate:'Too many route requests right now — try again in a minute.',offline:'You’re offline — start without a route.',key:'The route service rejected the key.',none:'No routes found around here.',noloc:'Still finding your location — try again in a moment.'};
function openRoutes(){ROUTES={list:[],sel:0,busy:false,msg:'',meters:goalMeters(),kind:GOAL.kind,batch:0};closeSheet();push('routepick');
 if(!LOC.pos){askLocation(true);ROUTES.busy=true;let n=0;const w=setInterval(()=>{if(LOC.pos||++n>40){clearInterval(w);ROUTES.busy=false;if(LOC.pos)loadRoutes(false);else{ROUTES.msg=ROUTE_ERR.noloc;render()}}},250);render();return}
 loadRoutes(false)}
async function loadRoutes(fresh){if(ROUTES.busy&&fresh)return;ROUTES.busy=true;ROUTES.msg='';render();
 try{if(navigator.onLine===false)throw Object.assign(new Error(),{code:'offline'});
  const list=await RWRoutes.suggestRoutes({start:LOC.pos,meters:ROUTES.meters,kind:ROUTES.kind,n:3,fresh});
  ROUTES.list=list;ROUTES.sel=0;ROUTES.batch++;ROUTES.msg=!list.length?ROUTE_ERR.none:list.length<3?`Only ${list.length} different route${list.length>1?'s':''} found around here.`:''}
 catch(e){ROUTES.msg=ROUTE_ERR[e.code]||(e instanceof TypeError?ROUTE_ERR.offline:'Couldn’t plan routes right now.');if(fresh===false)ROUTES.list=[]}
 ROUTES.busy=false;if(stack.at(-1)?.[0]==='routepick')render()}
function pickRoute(i){ROUTES.sel=i;document.querySelectorAll('.cd-route').forEach((c,k)=>c.classList.toggle('on',k===i));const m=MAPS.plan;if(m)drawMap('plan',m)}
const ROUTE_COL=['#2563eb','#0d9488','#9333ea','#ea580c','#64748b'];
V.routepick=()=>{const R=ROUTES,lbl=r=>Math.abs(r.off)>0.1?` — a bit ${r.off>0?'long':'short'}`:'';
 return`<div class="top">${backBtn()}<h1 style="font-size:22px;flex:1;margin-left:var(--s1)">Pick a route</h1><span></span></div>
 <p class="muted" style="margin-top:-6px">${R.kind==='loop'?'Loop':'One way'} · about ${(R.meters/1000).toFixed(1)} km</p>
 <div class="cd-mapwrap" style="margin-top:var(--s1)">${mapEl('plan',300)}${R.busy&&!R.list.length?'<div class="cd-mapmsg">Finding routes…</div>':''}</div>
 ${R.msg?`<p class="t-caption" id="routemsg" style="margin-top:var(--s1)">${R.msg}</p>`:''}
 <div class="cd-routes">${R.list.map((r,i)=>`<button class="cd-route${i===R.sel?' on':''}" onclick="pickRoute(${i})"><i style="background:${ROUTE_COL[i%5]}"></i><span><b>${(r.meters/1000).toFixed(2)} km${lbl(r)}</b><small>≈ ${fmtT(routeTime(r))}${r.ascent!=null?` · ↑ ${Math.round(r.ascent)} m`:''}</small></span></button>`).join('')}</div>
 <button class="btn" style="margin-top:var(--s2)" ${R.list.length&&!R.busy?'':'disabled'} onclick="startWithRoute()">Start with this route</button>
 <div class="flex" style="gap:8px;margin-top:var(--s1)"><button class="btn sec2" id="reroll" style="flex:1" ${R.busy?'disabled':''} onclick="loadRoutes(true)">${R.busy&&R.list.length?'Finding new routes…':'Reroll'}</button><button class="btn sec2" style="flex:1" onclick="stack=[];goActivity()">Start without a route</button></div>`};
function startWithRoute(){const r=ROUTES.list[ROUTES.sel];if(!r)return;stack=[];goActivity({goal:GOAL.g,target:GOAL.g==='distance'?GOAL.dist:GOAL.time,meters:ROUTES.meters,kind:ROUTES.kind,pts:r.pts,len:Math.round(r.meters)})}
// Live progress along the planned route: nearest point (searched forward so loops don't jump to the finish) and off-route timer.
function setPlan(p){const cum=[0];for(let i=1;i<p.pts.length;i++)cum.push(cum[i-1]+hav(p.pts[i-1],p.pts[i]));RUN.plan=p;RUN.planCum=cum;RUN.planIdx=0;RUN.offSince=null;RUN.offDist=0}
function segDist(p,a,b){const k=Math.cos(p[0]*Math.PI/180),x=(q)=>[(q[1]-p[1])*k*111320,(q[0]-p[0])*111320],A=x(a),B=x(b),dx=B[0]-A[0],dy=B[1]-A[1],t=Math.max(0,Math.min(1,dx||dy?-(A[0]*dx+A[1]*dy)/(dx*dx+dy*dy):0));return Math.hypot(A[0]+t*dx,A[1]+t*dy)}
function planTrack(){const R=RUN,P=R?.plan,p=R?.pts.at(-1);if(!P||!p)return;let best=Infinity,bi=R.planIdx;
 for(let i=Math.max(0,R.planIdx-5);i<Math.min(P.pts.length,R.planIdx+80);i++){const d=hav(p,P.pts[i]);if(d<best){best=d;bi=i}}if(best<80)R.planIdx=Math.max(R.planIdx,bi);
 let off=Infinity;for(let i=1;i<P.pts.length;i++)off=Math.min(off,segDist(p,P.pts[i-1],P.pts[i]));R.offDist=off;if(off>50){R.offSince??=Date.now()}else R.offSince=null}
const planLeft=()=>RUN?.plan?Math.max(0,(RUN.planCum.at(-1)-RUN.planCum[RUN.planIdx])/1000):0;
const offRoute=()=>!!RUN?.offSince&&Date.now()-RUN.offSince>=20000;
// Chip phones count activity steps from the chip, so the accelerometer isn't started for them. On phones without
// a chip the accelerometer counts each step once into the day and once into the activity, and stops after the
// activity if the activity started it.
const _srC=startRun;startRun=function(type){const was=pedo.on;if(chipOK())pedo.on=true;_srC(type);if(chipOK())pedo.on=was;else if(RUN)RUN.pedoMine=!was};
// GPS fixes update the map and numbers in place; no full re-render (that rebuilt the whole screen every fix).
gpsFix=function(p){if(!RUN||RUN.paused)return;const c=[p.coords.latitude,p.coords.longitude],acc=p.coords.accuracy;RUN.lastFix=Date.now();RUN.acc=Math.round(acc);
 if(acc>35){if(!RUN.pts.length){RUN.pts.push(c);RUN.gap=true}return liveUpdate()}
 const l=RUN.pts.at(-1);if(l&&!RUN.gap){const d=hav(l,c);if(d<3)return liveStats();RUN.dist+=d;RUN.d[RUN.mode]+=d}RUN.gap=false;RUN.pts.push(c);liveUpdate()};
function liveUpdate(){planTrack();if(stack.at(-1)?.[0]!=='runlive')return;const m=MAPS.live;if(m)drawMap('live',m);if(RUN.pts.length)$('#livemsg')?.remove();liveStats()}
function liveStats(){const R=RUN;if(!R||stack.at(-1)?.[0]!=='runlive')return;const set=(id,v)=>{const e=$('#'+id);if(e&&e.textContent!==String(v))e.textContent=v};
 set('ldist',(R.dist/1000).toFixed(2));set('lpace',pace(R.el,R.dist));set('lkcal',actKcal(R));set('lrun',(R.d.run/1000).toFixed(2));set('lwalk',(R.d.walk/1000).toFixed(2));set('lsteps',R.steps);
 set('lgps',`● ${R.paused?'Paused':R.acc?`GPS ±${R.acc} m`:'Finding GPS…'}`);
 if(R.plan){set('lplan',`${planLeft().toFixed(2)} km to go`);$('#loff')?.classList.toggle('show',offRoute())}}
function say(t){try{const u=new SpeechSynthesisUtterance(t);u.rate=1.05;speechSynthesis.cancel();speechSynthesis.speak(u)}catch(e){}}
function ivTick(){const R=RUN;if(!R?.iv){clearInterval(R?.ivT);return}const I=R.iv,t=R.el;if(I.done)return;
 let i=I.ph.findIndex(p=>t<p.end);if(i<0){I.done=true;vib([300,100,300,100,300]);say('Intervals complete. Great work.');toast('🏆 Intervals done — keep going or tap Finish');ivPaint();return}
 if(i!==I.i){I.i=i;const p=I.ph[i];if(R.mode!==p.m){if(R.paused){R.mode=p.m;R.segs.push(R.pts.length)}else setMode(p.m)}vib(p.m==='run'?[400,120,400]:[250]);say(p.m==='run'?'Run':'Walk')}ivPaint()}
function ivBox(){const I=RUN?.iv;if(!I)return'';if(I.done)return`<div class="cd-iv done"><b>🏆 Intervals complete</b><small>${I.ph.filter(p=>p.l!=='Warm-up').length/2} rounds done · keep going or Finish</small></div>`;
 const p=I.ph[I.i],start=p.end-p.s,left=Math.max(0,Math.ceil(p.end-RUN.el)),nx=I.ph[I.i+1];
 return`<div class="cd-iv ${p.m}" id="ivbox"><div class="cd-iv-row"><b>${p.m==='run'?'🏃 RUN':'🚶 WALK'}</b><span class="num" id="ivleft">${fmtT(left)}</span></div><small>${p.l}${nx?` · next: ${nx.m==='run'?'run':'walk'} ${fmtT(nx.s)}`:' · last one!'}</small>
 <div class="bar" style="margin-top:8px;background:#ffffff33"><i id="ivbar" style="width:${Math.min(100,(RUN.el-start)/p.s*100)}%;background:#fff"></i></div></div>`}
function ivPaint(){const b=$('#ivbox');if(!b||RUN?.iv?.done){if(RUN?.iv&&stack.at(-1)?.[0]==='runlive')render();return}const p=RUN.iv.ph[RUN.iv.i],left=Math.max(0,Math.ceil(p.end-RUN.el));
 if(!b.classList.contains(p.m))return render();$('#ivleft').textContent=fmtT(left);$('#ivbar').style.width=Math.min(100,(RUN.el-(p.end-p.s))/p.s*100)+'%'}

// ================= LIVE ACTIVITY SCREEN =================
V.runlive=()=>{const R=RUN;if(!R)return V.run();const on=m=>m==='pause'?R.paused:!R.paused&&R.mode===m;
 const b=(m,e,l)=>`<button class="btn ${on(m)?'':'sec2'}" style="flex:1;padding:16px 4px;font-size:15px" onclick="setMode('${m}')">${e}<br>${l}</button>`;
 return`<div class="top"><span class="chip">${R.paused?'⏸ Paused':R.mode==='run'?'🏃 Running':'🚶 Walking'}</span><span class="chip" id="lgps" style="color:${R.paused?'var(--warn)':'var(--good)'}">● ${R.paused?'Paused':R.acc?`GPS ±${R.acc} m`:'Finding GPS…'}</span></div>
 ${ivBox()}
 ${R.plan?`<div class="cd-plan"><b id="lplan">${planLeft().toFixed(2)} km to go</b><span class="cd-off${offRoute()?' show':''}" id="loff">Off route</span></div>`:''}
 <div class="cd-mapwrap">${mapEl('live',260)}${R.pts.length?'':'<div class="cd-mapmsg" id="livemsg">📡 Finding your location… outside is best</div>'}<button class="cd-recenter${MAPS.live&&Date.now()<MAPS.live.pauseUntil?' show':''}" id="recenter" aria-label="Recenter map" onclick="recenter()">📍</button></div>
 <div class="card" style="margin-top:12px;text-align:center"><div class="muted">Distance</div><div class="big" style="font-size:54px" id="ldist">${(R.dist/1000).toFixed(2)}</div><div class="muted">km</div>
 <div class="runstats"><div><b id="rtime">${fmtT(R.el)}</b><small>TIME</small></div><div><b id="lpace">${pace(R.el,R.dist)}</b><small>PACE /KM</small></div><div><b id="lkcal">${actKcal(R)}</b><small>KCAL</small></div></div>
 <div class="runstats" style="margin:0"><div><b style="font-size:18px" id="lrun">${(R.d.run/1000).toFixed(2)}</b><small>RUN KM</small></div><div><b style="font-size:18px" id="lwalk">${(R.d.walk/1000).toFixed(2)}</b><small>WALK KM</small></div><div><b style="font-size:18px" id="lsteps">${R.steps}</b><small>STEPS</small></div></div></div>
 <div class="flex" style="gap:8px">${b('run','🏃','Run')}${b('walk','🚶','Walk')}${b('pause',R.paused?'🏃':'⏸',R.paused?'Resume':'Pause')}</div>
 <button class="btn" style="margin-top:10px;background:#111" onclick="stopRun()">■ Finish</button>
 <p class="t-caption" style="text-align:center;margin-top:10px">${R.iv?'Intervals switch run / walk for you. Tap Run or Walk to override.':'Tired? Tap Walk. Ready again? Tap Run.'} Keep the app open while tracking.</p>`};

// Finish: save the activity, award cardio + leg XP with overload / PR bonus. Its steps stay in the daily total
// (counted by automatic steps or the accelerometer) and are recorded as activity steps so step XP skips them.
stopRun=async function(){const R=RUN;if(!R)return;navigator.geolocation.clearWatch(R.watch);clearInterval(R.timer);clearInterval(R.ivT);clearInterval(R.uiT);
 if(R.chip){await R.chipP;await chipTick(R)}if(R.pedoMine&&pedo.on)stopPedo();
 if(R.dist<20&&!confirm('Very short activity. Save anyway?')){RUN=null;dropMap('live');syncSteps();go('train');return}
 RUN=null;dropMap('live');const type=R.d.run>20&&R.d.walk>20?'mix':R.d.run>=R.d.walk?'run':'walk',kcal=actKcal(R),d=today();
 const r={type,ts:R.ts,pts:R.pts,dist:Math.round(R.dist),time:Math.round(R.el),steps:R.steps,d:{run:Math.round(R.d.run),walk:Math.round(R.d.walk)},t:{run:Math.round(R.t.run),walk:Math.round(R.t.walk)},kcal,...(R.iv?{fmt:R.iv.f}:{}),...(R.plan?{plan:{goal:R.plan.goal,target:R.plan.target,kind:R.plan.kind,pts:R.plan.pts,len:R.plan.len}}:{})};
 // Automatic steps off: the activity's chip steps still belong in today's total.
 if(R.chip&&!S.autoSteps)S.steps[d]=(S.steps[d]||0)+R.steps;S.actSteps[d]=(S.actSteps[d]||0)+R.steps;
 for(const x of Object.keys(S.actSteps))if(x<iso(Date.now()-60*864e5))delete S.actSteps[x];
 const {xp,pr,ov}=runXP(r);r.xp=xp;S.runs.push(r);S.burn??={};S.burn[d]=(S.burn[d]||0)+kcal;giveCardio(xp);
 const rq=R.d.run>0?checkQuests('Run (km)',R.d.run/1000):[];save();await syncSteps();if(rq.length)setTimeout(()=>toast(rq.join('<br>')),3000);
 stack=[];tab='train';trainSub='run';render('up');confetti();toast(`${(r.dist/1000).toFixed(2)} km · ${kcal} kcal · +${xp} cardio XP${pr?' · 🏅 PR 2×':ov?' · 📈 overload 1.5×':''} · legs trained`)};

// ================= CARDIO SCREEN =================
V.run=()=>{const t=targets(),st=S.steps[today()]||0,km=st*0.00076,kc=Math.round(km*0.6*S.profile.weight),tot=S.runs.reduce((s,r)=>s+r.dist,0),act=Math.min(st,st-netSteps(today()));
 if(LOC.state!=='granted'&&!S.locAsked){S.locAsked=1;save();setTimeout(()=>askLocation(true),300)}else if(LOC.state==='granted'&&!LOC.pos)setTimeout(()=>askLocation(true),300);
 return`<div class="top"><h1>Cardio</h1><span class="chip">👟 ${(tot/1000).toFixed(1)} km total</span></div>
 ${locCard()}${cardioRank()}
 <div class="sec">Automatic steps<small>whole day</small></div>
 <div class="card" style="text-align:center">${ring(st/t.steps,'#e3262f',`<div class="big" id="stepnow">${st.toLocaleString()}</div><div class="muted">of ${t.steps.toLocaleString()} steps</div>`)}
 ${act>0?`<p class="t-caption" id="stepact">Includes ${act.toLocaleString()} steps from activities</p>`:''}
 <div class="runstats"><div><b>${km.toFixed(2)}</b><small>KM</small></div><div><b>${kc}</b><small>KCAL</small></div><div><b>${Math.floor(netSteps(today())/1000)*5}</b><small>STEP XP TODAY</small></div></div>
 <div style="text-align:left">${stepBox()}</div>
 <div class="cd-mapwrap" style="margin-top:12px">${mapEl('today',180)}${LOC.pos?'':'<div class="cd-mapmsg">📍 Allow location to see where you are</div>'}</div>
 <p class="t-caption" style="text-align:left;margin-top:8px">Counts every step of your day — class, work, errands — even when you're not thinking about it. No GPS, so it doesn't draw a route; today's activities show on the map.</p></div>
 <div class="sec">Activity<small>dedicated cardio</small></div>
 <div class="card"><p class="t-body" style="margin-bottom:12px">A run or walk you start on purpose. GPS maps your route, and interval formats like <b>1:1</b> or <b>3:1</b> switch run / walk for you.</p>
 <button class="btn" onclick="${RUN?"push('runlive')":'startActivity()'}">${RUN?'⏱ Back to your activity':'Start activity'}</button>
 <p class="t-caption" style="margin-top:8px">Steps during an activity still count toward your daily total.</p></div>
 <div class="sec">Steps this week</div><div class="card">${chart(...weekSteps(),{color:'#e3262f'})}</div>
 <div class="sec">Recent activities</div>${S.runs.slice(-10).reverse().map(r=>`<div class="card cd-act" style="padding:0;overflow:hidden" onclick="push('actdetail',${r.ts})">${actHead(r)}</div>`).join('')||'<div class="empty">No runs or walks yet. Tap Start activity when you head out.</div>'}`};
// List rows use the static SVG preview; a real (interactive) map only on the single-activity screen.
function actHead(r,map){return`${map?mapEl('run:'+r.ts,260):`<div class="map" style="height:150px;border-radius:0">${routeSVG(r.pts)}</div>`}<div style="padding:14px"><b>${runLbl(r)}</b>${r.fmt?` <span class="pg-chip">${r.fmt}</span>`:''} <span class="muted">· ${new Date(r.ts).toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'})}</span>${r.xp?` <span class="muted">· +${r.xp} XP</span>`:''}<div class="runstats" style="margin:8px 0 0"><div><b>${(r.dist/1000).toFixed(2)}</b><small>KM</small></div><div><b>${pace(r.time,r.dist)}</b><small>/KM</small></div><div><b>${fmtT(r.time)}</b><small>TIME</small></div><div><b>${runKcal(r)}</b><small>KCAL</small></div></div></div>`}
V.actdetail=ts=>{const r=S.runs.find(x=>x.ts===ts);if(!r)return`<div class="top">${backBtn()}<span></span></div><div class="empty">Activity not found.</div>`;
 return`<div class="top">${backBtn()}<h1 style="font-size:22px;flex:1;margin-left:var(--s1)">${new Date(r.ts).toLocaleDateString(undefined,{weekday:'long',month:'short',day:'numeric'})}</h1><span></span></div>
 <div class="card" style="padding:0;overflow:hidden">${r.pts.length>1?actHead(r,true):actHead(r)}</div>
 <div class="card"><div class="runstats" style="margin:0"><div><b>${(r.d?.run/1000||0).toFixed(2)}</b><small>RUN KM</small></div><div><b>${(r.d?.walk/1000||0).toFixed(2)}</b><small>WALK KM</small></div><div><b>${(r.steps||0).toLocaleString()}</b><small>STEPS</small></div></div>
 <p class="t-caption" style="margin-top:8px">These steps are part of that day's step total.</p></div>
 ${r.plan?`<div class="card" id="planvs"><b>Planned vs actual</b><p class="t-body" style="margin-top:4px">${r.plan.kind==='loop'?'Loop':'One way'} · ${(r.plan.len/1000).toFixed(2)} km planned · ${(r.dist/1000).toFixed(2)} km done (${r.dist>=r.plan.len?'+':''}${((r.dist-r.plan.len)/1000).toFixed(2)} km)</p><p class="t-caption">Goal: ${r.plan.goal==='time'?`${Math.round(r.plan.target/60)} min`:`${(r.plan.target/1000).toFixed(1)} km`}. Dashed line on the map = planned route.</p></div>`:''}`};

const _rdC=render;render=function(...a){const x=_rdC.apply(this,a);try{mountMaps()}catch(e){console.error(e)}return x};

document.head.insertAdjacentHTML('beforeend',`<style>
.cmap{width:100%;border-radius:14px;overflow:hidden;background:#eef0f3;z-index:0}
.cmap-fb .leaflet-tile-pane{filter:grayscale(1) brightness(1.08) contrast(.85)}
.cmap .leaflet-control-attribution{font-size:9px;background:#ffffffcc}
.cd-recenter{position:absolute;right:10px;bottom:28px;z-index:600;width:40px;height:40px;border-radius:50%;border:none;background:#fff;box-shadow:0 2px 8px #0003;font-size:18px;display:none;cursor:pointer}.cd-recenter.show{display:grid;place-items:center}
.cd-act{cursor:pointer}.cd-act:active{opacity:.8}
.cd-seg{display:flex;background:var(--fill);border-radius:var(--r-pill);padding:3px}.cd-seg button{flex:1;border:none;background:none;border-radius:var(--r-pill);padding:8px 0;font-weight:600;color:var(--ink-2);cursor:pointer}.cd-seg button.on{background:var(--surface);color:var(--ink);box-shadow:0 1px 3px #15151f1a}
.cd-routes{display:grid;gap:8px;margin-top:var(--s2)}.cd-route{display:flex;align-items:center;gap:12px;text-align:left;border:1.5px solid var(--line);background:var(--surface);border-radius:12px;padding:12px;cursor:pointer;color:var(--ink)}
.cd-route i{width:14px;height:14px;border-radius:50%;flex:none}.cd-route b{display:block;font-size:16px}.cd-route small{color:var(--ink-2);font-size:13px}.cd-route.on{border-color:var(--ink);box-shadow:0 0 0 1px var(--ink)}
.cd-plan{display:flex;align-items:center;justify-content:space-between;background:var(--surface);border-radius:14px;padding:10px 14px;margin-bottom:12px;box-shadow:0 1px 2px #15151f0d}.cd-plan b{font-size:18px;font-variant-numeric:tabular-nums}
.cd-off{display:none;background:#fef3c7;color:#92400e;font-weight:700;font-size:13px;padding:4px 10px;border-radius:999px}.cd-off.show{display:inline-block}
.btn[disabled]{opacity:.45;pointer-events:none}
.cd-mapwrap{position:relative}.cd-mapmsg{position:absolute;inset:0;display:grid;place-items:center;text-align:center;padding:16px;color:var(--ink-2);font-weight:600;font-size:14px;pointer-events:none;z-index:500}
.cd-loc{display:flex;align-items:center;gap:12px;background:#eff6ff;border-radius:14px;padding:14px;margin:var(--s2) 0}.cd-loc>div{flex:1}.cd-loc b{display:block}.cd-loc small{color:var(--ink-2);font-size:13px}
.cd-rank{background:var(--surface);border-radius:16px;padding:14px;margin-top:var(--s2);cursor:pointer;box-shadow:0 1px 2px #15151f0d,0 6px 20px #15151f0a}
.cd-rk-top{display:flex;align-items:center;gap:12px}.cd-rank small{color:var(--ink-2);font-size:12px}.cd-rank b{display:block;font-size:18px}
.cd-toggle,.cd-state{display:flex;align-items:center;gap:12px;padding:12px 0 0;margin-top:12px;border-top:1px solid var(--line)}.cd-toggle>div,.cd-state{flex:1}.cd-state{flex-direction:column;align-items:flex-start;gap:2px}
.cd-toggle b,.cd-state b{display:block;font-size:15px}.cd-toggle small,.cd-state small{color:var(--ink-2);font-size:13px}
.sw{flex:none;width:52px;height:32px;border-radius:16px;border:none;background:#d4d4dc;position:relative;cursor:pointer;transition:background .2s}.sw i{position:absolute;top:3px;left:3px;width:26px;height:26px;border-radius:50%;background:#fff;box-shadow:0 1px 3px #0003;transition:transform .2s}
.sw.on{background:var(--ok)}.sw.on i{transform:translateX(20px)}
.cd-fmts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-bottom:var(--s1)}
.cd-fmts button{text-align:left;border:1.5px solid var(--line);background:var(--surface);border-radius:12px;padding:10px 12px;cursor:pointer;color:var(--ink)}.cd-fmts b{display:block;font-size:17px}.cd-fmts small{font-size:12px;color:var(--ink-2)}
.cd-fmts button.on{border-color:var(--ink);background:var(--ink);color:#fff}.cd-fmts button.on small{color:#fffb}
.cd-iv{border-radius:16px;padding:14px 16px;color:#fff;margin-bottom:12px;background:#16a34a}.cd-iv.run{background:linear-gradient(135deg,#e3262f,#f97316)}.cd-iv.done{background:var(--ink)}
.cd-iv-row{display:flex;justify-content:space-between;align-items:baseline}.cd-iv b{font-size:20px;font-weight:900}.cd-iv-row span{font-size:30px;font-weight:900}.cd-iv small{opacity:.9;font-size:13px;display:block}
</style>`);
