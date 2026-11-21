// RepWise cardio: location permission, real maps (Leaflet + OpenStreetMap), automatic steps on/off,
// steps and activity never running at the same time, run/walk interval formats, and cardio XP + rank.

// ================= MAPS =================
// Maps survive re-renders: each one is cached by key and its element is moved into the new placeholder.
const MAPS={};
function mapEl(key,h=200){return`<div class="cmap" data-map="${key}" style="height:${h}px"></div>`}
function dropMap(k){try{MAPS[k]?.map.remove()}catch(e){}delete MAPS[k]}
function mountMaps(){if(!window.L)return;document.querySelectorAll('#app [data-map]').forEach(ph=>{const key=ph.dataset.map;let m=MAPS[key];
 if(m&&m.el!==ph){m.el.style.height=ph.style.height;ph.replaceWith(m.el)}
 if(!m){const map=L.map(ph,{zoomControl:false,attributionControl:true,dragging:key!=='mini',scrollWheelZoom:false,tap:false});
  map.attributionControl.setPrefix('<a href="https://leafletjs.com">Leaflet</a>');L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(map);
  m=MAPS[key]={el:ph,map,line:L.polyline([],{color:'#e3262f',weight:5,lineCap:'round',lineJoin:'round'}).addTo(map),extra:L.layerGroup().addTo(map),fit:false};map.setView([14.5995,120.9842],13)}
 drawMap(key,m);setTimeout(()=>m.map.invalidateSize(),0)})}
function drawMap(key,m){const runs=key==='today'?S.runs.filter(r=>iso(r.ts)===today()):[],pts=key==='live'?(RUN?.pts||[]):key.startsWith('run:')?(S.runs.find(r=>String(r.ts)===key.slice(4))?.pts||[]):[];
 m.extra.clearLayers();const dot=(p,c,r=7)=>L.circleMarker(p,{radius:r,color:'#fff',weight:3,fillColor:c,fillOpacity:1}).addTo(m.extra);
 if(key==='today'){runs.forEach(r=>{if(r.pts.length>1)L.polyline(r.pts,{color:'#e3262f',weight:4,opacity:.8}).addTo(m.extra)});
  if(LOC.pos){dot(LOC.pos,'#2563eb',8);if(!m.fit){m.map.setView(LOC.pos,16);m.fit=true}}return}
 m.line.setLatLngs(pts);if(!pts.length){if(LOC.pos&&!m.fit)m.map.setView(LOC.pos,16);return}
 dot(pts[0],'#16a34a');dot(pts.at(-1),key==='live'?'#2563eb':'#e3262f',8);
 if(key==='live')m.map.setView(pts.at(-1),Math.max(m.map.getZoom(),17),{animate:true});
 else if(!m.fit&&pts.length>1){m.map.fitBounds(m.line.getBounds(),{padding:[24,24]});m.fit=true}}

// ================= LOCATION PERMISSION =================
const LOC={state:'unknown',pos:null};
async function locState(){try{const p=await navigator.permissions.query({name:'geolocation'});LOC.state=p.state;p.onchange=()=>{LOC.state=p.state;if(tab==='train'&&trainSub==='run')render()}}catch(e){}}
function askLocation(quiet){if(!navigator.geolocation)return quiet||toast('Location is not available on this phone');
 navigator.geolocation.getCurrentPosition(p=>{LOC.pos=[p.coords.latitude,p.coords.longitude];LOC.state='granted';if(!quiet)toast('📍 Location on — your runs will be mapped');if(tab==='train'&&trainSub==='run')render()},
  e=>{if(e.code===1){LOC.state='denied';if(!quiet)toast('📍 Location blocked — allow it in phone Settings → Apps → RepWise → Permissions')}if(tab==='train'&&trainSub==='run')render()},{enableHighAccuracy:true,timeout:20000,maximumAge:60000})}
locState();
function locCard(){if(LOC.state==='granted')return'';
 return`<div class="cd-loc"><div><b>📍 ${LOC.state==='denied'?'Location is blocked':'Allow location for cardio'}</b><small>${LOC.state==='denied'?'Turn it on in phone Settings → Apps → RepWise → Permissions → Location.':'Needed to map your runs and walks and measure distance. Your routes stay on your phone.'}</small></div>${LOC.state==='denied'?'':`<button class="btn sm" onclick="askLocation()">Allow</button>`}</div>`}

// ================= AUTOMATIC STEPS: on/off, and paused during an activity =================
S.autoSteps??=true;
// Re-read the step chip without counting: used while steps are off or an activity is running, so those steps
// never land in daily steps later (the activity already counts them).
async function stepBaseline(){const P=SSP();if(!P||!stepSt.available||!stepSt.granted)return;try{const {total}=await P.read();S.ss={raw:total,day:today(),at:Date.now()};save()}catch(e){}}
const _syncC=syncSteps;syncSteps=async function(){if(!S.autoSteps||RUN)return stepBaseline();await _syncC();stepXP()};
function setAutoSteps(on){if(on&&RUN)return toast('Finish your activity first — only one can track at a time');S.autoSteps=on;save();
 if(on){stepBaseline().then(()=>toast('👟 Automatic steps on'))}else toast('Automatic steps off');render()}
stepBox=function(){const hw=stepSt.available&&stepSt.granted,last=S.ss?.at;
 if(RUN)return`<div class="cd-state"><b>⏸ Paused while your activity runs</b><small>Your activity is counting these steps. Automatic steps turn back on when you finish.</small></div>`;
 if(hw)return`<div class="cd-toggle"><div><b>Automatic steps</b><small>${S.autoSteps?`All day, even with the app closed${last?` · synced ${new Date(last).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})}`:''}`:'Off — no steps are being counted'}</small></div><button class="sw ${S.autoSteps?'on':''}" role="switch" aria-checked="${S.autoSteps}" aria-label="Automatic steps" onclick="setAutoSteps(${!S.autoSteps})"><i></i></button></div>`;
 if(stepSt.available)return`<button class="btn" onclick="enableSteps()">👟 Turn on automatic steps</button><p class="t-caption" style="margin-top:8px">Uses your phone's step-counter chip. Asks for "Physical activity" permission once.</p>`;
 return`<div class="cd-toggle"><div><b>Count steps with the app open</b><small>This phone has no step-counter chip, so steps only count while RepWise is on screen.</small></div><button class="sw ${pedo.on?'on':''}" role="switch" aria-checked="${pedo.on}" aria-label="Count steps" onclick="${pedo.on?'stopPedo()':'startPedo()'};render()"><i></i></button></div>`};
const _enC=enableSteps;enableSteps=async function(){S.autoSteps=true;await _enC()};

// ================= CARDIO XP + RANK (same curve as muscles; beating your last effort pays more) =================
S.cardioXp??=0;S.stepXp??={};
const LEGS=['Quads','Hamstrings','Glutes','Calves'];
function giveCardio(xp,legShare=.5){S.cardioXp+=xp;LEGS.forEach(m=>S.xp[m]+=Math.round(xp*legShare));S.xp.Core+=Math.round(xp*.15)}
// Steps: 5 XP per 1,000; one-time bonus for beating yesterday (overload) and your best day (PR).
function stepXP(){const d=today(),n=S.steps[d]||0,g=S.stepXp[d]??={k:0,ov:0,pr:0},k=Math.floor(n/1000);if(k>g.k){giveCardio((k-g.k)*5,.4);g.k=k}
 const y=new Date();y.setDate(y.getDate()-1);const yn=S.steps[iso(y)]||0,best=Math.max(0,...Object.entries(S.steps).filter(([x])=>x!==d).map(([,v])=>v));
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
 <div class="row" style="cursor:default"><div class="rbody"><b>Daily steps</b><small>5 XP per 1,000 · +25 for beating yesterday · +50 for your best day</small></div></div></div>
 <div class="sec">Muscles it trains</div><p class="t-body muted">Cardio also gives XP to your <b>quads, hamstrings, glutes and calves</b> (half of each activity's XP) and a little to your <b>core</b>, so it moves your leg ranks too.</p>`};

// ================= INTERVALS: run : walk formats =================
const FORMATS=[['free','Free','Switch run / walk yourself',0,0,0],['1:1','1 : 1','1 min run · 1 min walk',60,60,15],['2:1','2 : 1','2 min run · 1 min walk',120,60,10],['3:1','3 : 1','3 min run · 1 min walk',180,60,8],['3:2','3 : 2','3 min run · 2 min walk',180,120,6],['5:1','5 : 1','5 min run · 1 min walk',300,60,5],['custom','Custom','Set your own run, walk and rounds',120,60,8]];
let IVS={f:'1:1',run:60,walk:60,rounds:15,warm:true};
function startActivity(){if(LOC.state==='denied')return toast('📍 Location is blocked — allow it in phone Settings → Apps → RepWise → Permissions');openSheet(ivSheet())}
function ivSheet(){const f=IVS.f,cus=f==='custom',total=f==='free'?0:Math.round(((IVS.run+IVS.walk)*IVS.rounds+(IVS.warm?300:0))/60);
 const step=(k,l,d,unit,min,max)=>`<div class="afrow"><span>${l}</span><span class="afstep"><button onclick="ivSet('${k}',${-d},${min},${max})">−</button><b>${k==='rounds'?IVS[k]:IVS[k]/60}${unit}</b><button onclick="ivSet('${k}',${d},${min},${max})">+</button></span></div>`;
 return`<h3 class="t-title">Start activity</h3><p class="t-caption" style="margin:4px 0 var(--s2)">Pick a format. Intervals switch between run and walk for you with a buzz.</p>
 <div class="cd-fmts">${FORMATS.map(([k,n,d])=>`<button class="${f===k?'on':''}" onclick="ivPick('${k}')"><b>${n}</b><small>${d}</small></button>`).join('')}</div>
 ${f==='free'?'':`${cus?step('run','Run',30,' min',30,1800)+step('walk','Walk / rest',30,' min',30,900):''}${step('rounds','Rounds',1,'',1,40)}
  <div class="afrow"><span>5 min warm-up walk</span><button class="sw ${IVS.warm?'on':''}" role="switch" aria-checked="${IVS.warm}" onclick="IVS.warm=!IVS.warm;$('#sheet').innerHTML='<div class=&quot;grab&quot;></div>'+ivSheet()"><i></i></button></div>
  <p class="t-caption" style="margin-top:6px">${IVS.rounds} × (${IVS.run/60} min run + ${IVS.walk/60} min walk)${IVS.warm?' + warm-up':''} · about ${total} min</p>`}
 ${S.autoSteps&&stepSt.granted?'<p class="t-caption" style="margin-top:var(--s1)">Automatic steps pause during the activity and turn back on when you finish.</p>':''}
 <button class="btn" style="margin-top:var(--s2)" onclick="goActivity()">Start</button>`}
function ivPick(k){const F=FORMATS.find(x=>x[0]===k);IVS.f=k;if(k!=='custom'&&k!=='free'){IVS.run=F[3];IVS.walk=F[4];IVS.rounds=F[5]}$('#sheet').innerHTML='<div class="grab"></div>'+ivSheet()}
function ivSet(k,d,min,max){IVS[k]=Math.max(min,Math.min(max,IVS[k]+d));$('#sheet').innerHTML='<div class="grab"></div>'+ivSheet()}
async function goActivity(){closeSheet();if(S.autoSteps)await syncSteps();await stepBaseline();
 const free=IVS.f==='free',ph=[];if(!free){if(IVS.warm)ph.push(['walk',300,'Warm-up']);for(let i=1;i<=IVS.rounds;i++){ph.push(['run',IVS.run,`Round ${i}/${IVS.rounds}`]);ph.push(['walk',IVS.walk,`Round ${i}/${IVS.rounds}`])}}
 startRun(free?'run':ph[0][0]);if(free)return;let t=0;RUN.iv={f:IVS.f,ph:ph.map(([m,s,l])=>({m,s,l,end:t+=s})),i:0,done:false};RUN.ivT=setInterval(ivTick,500)}
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
 return`<div class="top"><span class="chip">${R.paused?'⏸ Paused':R.mode==='run'?'🏃 Running':'🚶 Walking'}</span><span class="chip" style="color:${R.paused?'var(--warn)':'var(--good)'}">● ${R.paused?'Paused':R.acc?`GPS ±${R.acc} m`:'Finding GPS…'}</span></div>
 ${ivBox()}
 <div class="cd-mapwrap">${mapEl('live',260)}${R.pts.length?'':'<div class="cd-mapmsg">📡 Finding your location… outside is best</div>'}</div>
 <div class="card" style="margin-top:12px;text-align:center"><div class="muted">Distance</div><div class="big" style="font-size:54px">${(R.dist/1000).toFixed(2)}</div><div class="muted">km</div>
 <div class="runstats"><div><b id="rtime">${fmtT(R.el)}</b><small>TIME</small></div><div><b>${pace(R.el,R.dist)}</b><small>PACE /KM</small></div><div><b>${actKcal(R)}</b><small>KCAL</small></div></div>
 <div class="runstats" style="margin:0"><div><b style="font-size:18px">${(R.d.run/1000).toFixed(2)}</b><small>RUN KM</small></div><div><b style="font-size:18px">${(R.d.walk/1000).toFixed(2)}</b><small>WALK KM</small></div><div><b style="font-size:18px">${R.steps}</b><small>STEPS</small></div></div></div>
 <div class="flex" style="gap:8px">${b('run','🏃','Run')}${b('walk','🚶','Walk')}${b('pause',R.paused?'🏃':'⏸',R.paused?'Resume':'Pause')}</div>
 <button class="btn" style="margin-top:10px;background:#111" onclick="stopRun()">■ Finish</button>
 <p class="t-caption" style="text-align:center;margin-top:10px">${R.iv?'Intervals switch run / walk for you. Tap Run or Walk to override.':'Tired? Tap Walk. Ready again? Tap Run.'} Keep the app open while tracking.</p>`};

// Finish: save the activity, award cardio + leg XP with overload / PR bonus, then hand counting back to automatic steps.
stopRun=function(){const R=RUN;navigator.geolocation.clearWatch(R.watch);clearInterval(R.timer);clearInterval(R.ivT);
 if(R.dist<20&&!confirm('Very short activity. Save anyway?')){RUN=null;stepBaseline();dropMap('live');go('train');return}
 RUN=null;dropMap('live');const type=R.d.run>20&&R.d.walk>20?'mix':R.d.run>=R.d.walk?'run':'walk',kcal=actKcal(R);
 const r={type,ts:R.ts,pts:R.pts,dist:Math.round(R.dist),time:Math.round(R.el),steps:R.steps,d:{run:Math.round(R.d.run),walk:Math.round(R.d.walk)},t:{run:Math.round(R.t.run),walk:Math.round(R.t.walk)},kcal,...(R.iv?{fmt:R.iv.f}:{})};
 const {xp,pr,ov}=runXP(r);r.xp=xp;S.runs.push(r);S.burn??={};S.burn[today()]=(S.burn[today()]||0)+kcal;giveCardio(xp);
 const rq=R.d.run>0?checkQuests('Run (km)',R.d.run/1000):[];save();stepBaseline();if(rq.length)setTimeout(()=>toast(rq.join('<br>')),3000);
 stack=[];tab='train';trainSub='run';render('up');confetti();toast(`${(r.dist/1000).toFixed(2)} km · ${kcal} kcal · +${xp} cardio XP${pr?' · 🏅 PR 2×':ov?' · 📈 overload 1.5×':''} · legs trained`)};

// ================= CARDIO SCREEN =================
V.run=()=>{const t=targets(),st=S.steps[today()]||0,km=st*0.00076,kc=Math.round(km*0.6*S.profile.weight),tot=S.runs.reduce((s,r)=>s+r.dist,0);
 if(LOC.state!=='granted'&&!S.locAsked){S.locAsked=1;save();setTimeout(()=>askLocation(true),300)}else if(LOC.state==='granted'&&!LOC.pos)setTimeout(()=>askLocation(true),300);
 return`<div class="top"><h1>Cardio</h1><span class="chip">👟 ${(tot/1000).toFixed(1)} km total</span></div>
 ${locCard()}${cardioRank()}
 <div class="sec">Automatic steps<small>whole day</small></div>
 <div class="card" style="text-align:center">${ring(st/t.steps,'#e3262f',`<div class="big" id="stepnow">${st.toLocaleString()}</div><div class="muted">of ${t.steps.toLocaleString()} steps</div>`)}
 <div class="runstats"><div><b>${km.toFixed(2)}</b><small>KM</small></div><div><b>${kc}</b><small>KCAL</small></div><div><b>${Math.floor(st/1000)*5}</b><small>XP TODAY</small></div></div>
 <div style="text-align:left">${stepBox()}</div>
 <div class="cd-mapwrap" style="margin-top:12px">${mapEl('today',180)}${LOC.pos?'':'<div class="cd-mapmsg">📍 Allow location to see where you are</div>'}</div>
 <p class="t-caption" style="text-align:left;margin-top:8px">Counts every step of your day — class, work, errands — even when you're not thinking about it. No GPS, so it doesn't draw a route; today's activities show on the map.</p></div>
 <div class="sec">Activity<small>dedicated cardio</small></div>
 <div class="card"><p class="t-body" style="margin-bottom:12px">A run or walk you start on purpose. GPS maps your route, and interval formats like <b>1:1</b> or <b>3:1</b> switch run / walk for you.</p>
 <button class="btn" onclick="${RUN?"push('runlive')":'startActivity()'}">${RUN?'⏱ Back to your activity':'Start activity'}</button>
 <p class="t-caption" style="margin-top:8px">Only one tracks at a time: automatic steps pause during an activity.</p></div>
 <div class="sec">Steps this week</div><div class="card">${chart(...weekSteps(),{color:'#e3262f'})}</div>
 <div class="sec">Recent activities</div>${S.runs.slice(-10).reverse().map((r,i)=>`<div class="card" style="padding:0;overflow:hidden">${i<3&&r.pts.length>1?mapEl('run:'+r.ts,150):`<div class="map" style="height:150px;border-radius:0">${routeSVG(r.pts)}</div>`}<div style="padding:14px"><b>${runLbl(r)}</b>${r.fmt?` <span class="pg-chip">${r.fmt}</span>`:''} <span class="muted">· ${new Date(r.ts).toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'})}</span>${r.xp?` <span class="muted">· +${r.xp} XP</span>`:''}<div class="runstats" style="margin:8px 0 0"><div><b>${(r.dist/1000).toFixed(2)}</b><small>KM</small></div><div><b>${pace(r.time,r.dist)}</b><small>/KM</small></div><div><b>${fmtT(r.time)}</b><small>TIME</small></div><div><b>${runKcal(r)}</b><small>KCAL</small></div></div></div></div>`).join('')||'<div class="empty">No runs or walks yet. Tap Start activity when you head out.</div>'}`};

const _rdC=render;render=function(...a){const x=_rdC.apply(this,a);try{mountMaps()}catch(e){console.error(e)}return x};

document.head.insertAdjacentHTML('beforeend',`<style>
.cmap{width:100%;border-radius:14px;overflow:hidden;background:#e8ecf1;z-index:0}
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
