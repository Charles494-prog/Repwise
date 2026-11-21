// RepWise training layer: setup-built schedule, plan reveal, rest gate, timed-set timer, deload,
// per-exercise history with a progression graph, and session details. Loaded last.

// ================= TIMED SETS: "0kg × 30 sec" / "5kg × 1 min" =================
const fmtSec=r=>r<60?`${r} sec`:r%60?`${Math.floor(r/60)} min ${r%60} s`:`${r/60} min`;
const setTxt=(ex,s)=>`${s.w}kg × ${isTimed(ex)?fmtSec(s.r):s.r}`;

// ================= SCHEDULE BUILT FROM SETUP =================
// 5-day option: every muscle twice a week.
SPLITS.pplul={name:'Push / Pull / Legs + Upper / Lower',days:['push','pull','legs','upper','lower'],d:'5 days/week. Every muscle trained 2×/week.'};
FREQ.pplul=[5,5,5];
const SESS_EX={30:4,45:5,60:6,90:8};
// Pick n training days out of the free ones, keeping hard days apart (fewest back-to-back days, never 3 in a row if avoidable).
function spreadDays(n,off=[]){const free=[0,1,2,3,4,5,6].filter(i=>!off.includes(i));n=Math.max(1,Math.min(n,free.length));
 let best=null,bs=1e9;const pick=(from,cur)=>{if(cur.length===n){const p=[0,0,0,0,0,0,0];cur.forEach(i=>p[i]=1);let s=0;
   for(let i=0;i<7;i++){if(p[i]&&p[(i+1)%7])s+=1;if(p[i]&&p[(i+1)%7]&&p[(i+2)%7])s+=5}if(s<bs){bs=s;best=p}return}
  for(let k=from;k<free.length;k++)pick(k+1,[...cur,free[k]])};pick(0,[]);return best||[1,0,1,0,1,0,0]}
// Split choice: training frequency 2×/week per muscle where possible; harder splits only for experienced lifters.
function autoPlan(d){const off=d.offDays||[],want=Math.min(6,+d.days||3),free=7-off.length,n=Math.max(1,Math.min(want,free)),exp=d.exp||'beginner';
 const split=n<=2?'full':n===3?(exp==='advanced'?'ppl':'full'):n===4?'ul':n===5?(exp==='beginner'?'ul':'pplul'):(exp==='beginner'?'ul':exp==='advanced'&&d.goal==='bulk'?'arnold':'ppl');
 const why={full:'Full body each session — every muscle 2–3× a week, the best fit for your days.',ul:'Upper / Lower — each muscle twice a week with time to recover.',ppl:'Push / Pull / Legs — more volume per muscle for an experienced lifter.',pplul:'PPL + Upper / Lower — every muscle twice a week across 5 days.',arnold:'Arnold split — high volume for building muscle.'}[split];
 return{split,n,pat:spreadDays(n,off),off,exp,len:+d.sessLen||60,why,capped:want>free}}
const planWeek=P=>{const days=SPLITS[P.split].days;let q=0;return P.pat.map(v=>v?days[q++%days.length]:null)};

{const i=OBSTEPS.findIndex(s=>s.k==='days');
 Object.assign(OBSTEPS[i],{s:'Be honest — consistency beats a perfect plan. We pick the program that fits.',o:[[2,'2️⃣','2 days'],[3,'3️⃣','3 days'],[4,'4️⃣','4 days'],[5,'5️⃣','5 days'],[6,'6️⃣','6 days'],[7,'7️⃣','Every day','6 lifting days + 1 recovery day']]});
 OBSTEPS.splice(i+1,0,
 {k:'offDays',q:"Any days you can't train?",s:'Work, class, family — tap the days that are off-limits. We schedule around them.',custom:1},
 {k:'exp',q:'How long have you been lifting?',s:'Sets the program and how fast we add weight.',o:[['beginner','🌱','New to it','Under 6 months'],['intermediate','💪','Some experience','6 months – 2 years'],['advanced','🔥','Experienced','2+ years of steady training']]},
 {k:'sessLen',q:'How long can a session be?',s:'We fit the number of exercises to your time.',o:[[30,'⏱️','30 min','4 exercises'],[45,'⏱️','45 min','5 exercises'],[60,'⏱️','60 min','6 exercises'],[90,'⏱️','90 min','Up to 8 exercises']]},
 {k:'equip',q:'Where do you train?',s:'We pick exercises for your equipment.',o:[['gym','🏢','Full gym','Machines, barbells, dumbbells'],['dumbbell','💪','Dumbbells only','At home or a small gym'],['home','🏠','No equipment','Bodyweight at home']]})}
function togOff(i,el){const o=OB.d.offDays=(OB.d.offDays||[]).includes(i)?OB.d.offDays.filter(x=>x!==i):[...(OB.d.offDays||[]),i];el.classList.toggle('on');vib(8);
 const b=$('#offgo');if(b)b.textContent=o.length?`Continue · ${7-o.length} days free`:'No blocked days';if(o.length>=7){OB.d.offDays=o.slice(0,6);el.classList.remove('on');toast('Keep at least one day free')}}
const _onbT=V.onboard;V.onboard=()=>{
 if(OB.active&&OB.step>=OBSTEPS.length)return planReveal();
 const s=OBSTEPS[OB.step];if(!s?.custom)return _onbT();const st=OB.step,off=OB.d.offDays||[];
 return`<div class="ob"><div class="flex" style="flex:none"><button class="iconbtn" style="flex:none" onclick="OB.step--;render('pop')">‹</button><div class="obbar" style="margin:0"><i style="width:${(st+1)/OBSTEPS.length*100}%"></i></div><span class="muted" style="flex:none">${st+1}/${OBSTEPS.length}</span></div>
 <div style="margin-top:26px"><h2>${s.q}</h2><p class="muted">${s.s}</p></div>
 <div class="offdays">${WD.map((n,i)=>`<button class="${off.includes(i)?'on':''}" onclick="togOff(${i},this)"><b>${n}</b><small>${off.includes(i)?'Busy':'Free'}</small></button>`).join('')}</div>
 <p class="t-caption" style="text-align:center;margin-top:var(--s2)">You picked ${OB.d.days>=7?'6':OB.d.days||3} training days. If fewer days are free, we fit the plan to them.</p>
 <div style="flex:1"></div><button class="btn" id="offgo" onclick="OB.d.offDays=OB.d.offDays||[];OB.step++;render('push')">${off.length?`Continue · ${7-off.length} days free`:'No blocked days'}</button></div>`};

// Plan reveal (replaces the timed loading screen): shows the actual week, then the user starts it.
function planReveal(){const d=OB.d,P=autoPlan(d),wk=planWeek(P),bmr=10*d.weight+6.25*d.height-5*d.age+(d.sex==='m'?5:-161),adj=d.deficit!=null?-d.deficit:{cut:-500,slowcut:-250,maintain:0,bulk:300}[d.goal]||0;
 const kcal=Math.round(bmr*(d.activity||1.375)+adj),prot=Math.round(d.weight*(d.goal==='bulk'?1.8:2)),eq=(EQUIPS[d.equip||S.equip]||EQUIPS.gym)[1];
 return`<div class="ob plrev"><div style="margin-top:var(--s3)"><div class="t-caption" style="text-transform:uppercase;letter-spacing:.08em;font-weight:700">Your plan</div><h2 style="margin-top:4px">${SPLITS[P.split].name}</h2><p class="muted">${P.why}</p></div>
 <div class="plweek">${WD.map((n,i)=>`<div class="${wk[i]?'tr':''}${P.off.includes(i)?' off':''}"><small>${n}</small><b>${wk[i]?esc(PROGS[wk[i]].name.replace(/ (Day|Body)$/,'')):P.off.includes(i)?'Busy':'Rest'}</b></div>`).join('')}</div>
 ${P.capped?`<p class="t-caption" style="margin-top:6px">Only ${7-P.off.length} days are free, so it's a ${P.n}-day plan.</p>`:''}
 <div class="plstats"><div><b>${P.n}</b><small>days / week</small></div><div><b>${P.len}</b><small>min · ${SESS_EX[P.len]} exercises</small></div><div><b>${kcal.toLocaleString()}</b><small>kcal / day</small></div><div><b>${prot}</b><small>g protein</small></div></div>
 <p class="t-caption" style="margin-top:var(--s2)">Exercises picked for: ${esc(eq.toLowerCase())}. You can swap any exercise or change the days later in Train → This week → Change.</p>
 <div style="flex:1"></div><button class="btn" onclick="finishOB()">Start my plan</button></div>`}
const _fobT=finishOB;finishOB=function(){if(!OB.active)return;const d=OB.d,P=d.days?autoPlan(d):null;
 if(d.equip){S.equip=d.equip}['offDays','exp','sessLen','equip'].forEach(k=>delete d[k]);_fobT();if(!S.profile)return;
 if(P){S.split=P.split;delete S.nextSplit;S.trainDays[P.split]=P.n;S.plan={pat:P.pat,off:P.off,exp:P.exp,len:P.len};S.rotEq=P.exp!=='beginner';
  ['offDays','exp','sessLen','equip'].forEach(k=>delete S.profile[k]);S.week=null;ensureWeek();save();render()}};
// Session length caps the exercises per workout.
const _plT=planList;planList=function(k){const L=_plT(k),c=SESS_EX[S.plan?.len];return c?L.slice(0,c):L};
// Changing the day count on the Workout style page re-spreads around the blocked days.
const _sdT=setDays;setDays=function(x){if(S.plan){S.plan.pat=spreadDays(x,S.plan.off||[]);if(doneCount()===0&&!S.nextSplit)S.week=null}_sdT(x);ensureWeek();render()};
function rebuildPlan(){startOB();OB.step=OBSTEPS.findIndex(s=>s.k==='days');render('push')}
function togTrainDay(i){const W=ensureWeek(),p=[...(S.plan?.pat||W.pat)];p[i]=p[i]?0:1;if(!p.some(Boolean))return toast('Keep at least one training day');
 S.plan={...(S.plan||{}),pat:p};S.trainDays[S.split]=p.filter(Boolean).length;if(doneCount()===0)S.week=null;save();ensureWeek();render()}
const _splT=V.splits;V.splits=()=>{const p=S.plan?.pat||ensureWeek().pat;return _splT().replace('<div class="top">',`<div class="top">`)
 .replace(/(<\/h1>[\s\S]*?<\/div>)/,`$1<button class="btn" style="margin:var(--s1) 0" onclick="rebuildPlan()">Rebuild my plan for me</button><div class="sec">Training days</div><div class="offdays sm">${WD.map((n,i)=>`<button class="${p[i]?'on':''}" onclick="togTrainDay(${i})"><b>${n}</b><small>${p[i]?'Train':'Rest'}</small></button>`).join('')}</div><p class="t-caption" style="margin-top:6px">Tap a day to train or rest on it. Changes apply now if you haven't trained this week, otherwise next week.</p>`)};

// ================= REST GATE: no new set or exercise until the rest timer ends or is skipped =================
const resting=()=>!!S.active&&restEnd>Date.now();
function restBlock(){if(!resting())return false;toast('Resting — tap <b>Skip</b> on the timer to go early');vib(30);const el=$('#rest');if(el){el.classList.remove('nudge');void el.offsetWidth;el.classList.add('nudge')}return true}
const _trT=tickRest;tickRest=function(){_trT();document.body.classList.toggle('resting',resting())};
const _mvT=mv;mv=function(d){if(restBlock())return;_mvT(d)};
const _ueT=useEx;useEx=function(e){if(!window._swap&&restBlock()){closeSheet();return}_ueT(e)};
const _pkT=pickEx;pickEx=function(swap){if(!swap&&restBlock())return;_pkT(swap)};

// ================= TIMED SETS: one Start, Stop logs =================
// Start is locked while the clock runs; reaching the target buzzes and keeps counting; only Stop logs the time held.
timerStart=function(){if(tmr.on||restBlock())return;const ex=S.active.list[S.active.idx],t=+$('#pr').value||sugg(ex).r;S.goalReps[ex]=t;save();
 tmr={on:true,target:t,start:Date.now()+3000,i:null,hit:false};vib(20);tmr.i=setInterval(timerTick,100);timerTick();tmrUI()};
timerTick=function(){const el=$('#tmr');if(!el||!S.active){clearInterval(tmr.i);tmr.on=false;return}const now=Date.now(),tv=el.querySelector('.tv'),tl=el.querySelector('.tl'),bar=el.querySelector('.bar i');
 if(now<tmr.start){tv.textContent=Math.ceil((tmr.start-now)/1000);tl.textContent='Get ready';return}
 const e=(now-tmr.start)/1000,left=tmr.target-e;
 if(left>0){tv.textContent=Math.ceil(left)+'s';tl.textContent='Hold';bar.style.width=Math.min(100,e/tmr.target*100)+'%'}
 else{if(!tmr.hit){tmr.hit=true;vib([200,100,200])}tv.textContent='+'+Math.floor(-left)+'s';tl.textContent='Target hit — keep going or tap Stop';bar.style.width='100%'}};
timerStop=function(){if(!tmr.on)return;clearInterval(tmr.i);tmr.on=false;const e=Math.round((Date.now()-tmr.start)/1000);vib(40);
 if(e<1){toast('Stopped during the countdown — nothing logged');render();return}$('#pr').value=e;addSet()};
function tmrUI(){const el=$('#tmr');if(!el)return;const [go,stop]=el.querySelectorAll('.btn');
 if(go){go.disabled=tmr.on;go.style.opacity=tmr.on?.4:'';go.lastChild.textContent=tmr.on?' Running…':' Start timer'}
 if(stop){stop.classList.toggle('sec2',!tmr.on)}
 const cap=el.querySelector('.t-caption');if(cap)cap.textContent='3-second countdown, then hold. Tap Stop to log the time you held.';
 if(!tmr.on){const v=+$('#pr')?.value;if(v)el.querySelector('.tv').textContent=v+'s'}}
const _stpT=stp;stp=function(id,d){_stpT(id,d);if(id==='pr')tmrUI()};
const _asT=addSet;addSet=function(){if(tmr.on)return toast('Timer running — tap <b>Stop</b> to log');if(restBlock())return;_asT()};

// ================= DELOAD =================
function deloadSheet(){const on=S.active?.deload;openSheet(`<h3 class="t-title">What is a deload?</h3>
 <p class="t-body" style="margin:var(--s2) 0">A <b>planned easy session</b>: about <b>60% of your usual weights</b>, stopping 3–4 reps before failure. It lets joints, tendons and your nervous system recover so you come back stronger.</p>
 <div class="tip">Use one every 4–8 weeks of hard training, or when your lifts stall and you feel beat up.</div>
 <div class="tip">While it's on, target weights drop to ~60%, and these sets won't lower your next suggestions or count against PRs.</div>
 <button class="btn" style="margin-top:var(--s2)" onclick="S.active.deload=${!on};save();closeSheet();render();toast('${on?'Deload off':'Deload on — light weights today'}')">${on?'Turn deload off':'Make this a deload session'}</button>
 <button class="btn sec2" style="margin-top:var(--s1)" onclick="closeSheet()">Not now</button>`)}
const _sgT=sugg;sugg=function(ex){const s=_sgT(ex);if(!S.active?.deload||!s.w)return s;const w=Math.max(0,Math.round(s.w*.6/2.5)*2.5);
 return{...s,w,text:`Deload: <b>${w} kg × ${s.r}</b> — about 60% of normal. Stop 3–4 reps short of failure.`}};
// Next session's targets come from the last normal session, not the deload.
const _lsT=lastSets;lastSets=function(ex){for(let i=S.workouts.length-1;i>=0;i--){if(S.workouts[i].deload)continue;const ss=S.workouts[i].sets.filter(s=>s.ex===ex);if(ss.length)return ss}return _lsT(ex)};

// ================= EXERCISE HISTORY: every set + progression graph =================
// Session score = Σ weight × reps (bodyweight sets count their reps / seconds).
const sessScore=ss=>ss.reduce((t,s)=>t+(s.w>0?s.w:1)*s.r,0);
function exSessions(ex){return S.workouts.map(w=>({w,ss:w.sets.filter(s=>s.ex===ex)})).filter(x=>x.ss.length)}
function progChart(pts){if(pts.length<2)return'<p class="t-caption" style="text-align:center;padding:var(--s2) 0">Log this exercise in another session to see your progression line.</p>';
 const W=320,H=150,L=34,R=12,T=18,B=22,ys=pts.map(p=>p.y),lo=Math.min(...ys),hi=Math.max(...ys),pad=(hi-lo)*.15||hi*.1||1,y0=Math.max(0,lo-pad),y1=hi+pad;
 const X=i=>L+(W-L-R)*(pts.length===1?.5:i/(pts.length-1)),Y=v=>T+(H-T-B)*(1-(v-y0)/(y1-y0)),f=v=>v>=1e4?Math.round(v/1e3)+'k':Math.round(v);
 const line=pts.map((p,i)=>`${X(i).toFixed(1)},${Y(p.y).toFixed(1)}`).join(' '),lbl=i=>new Date(pts[i].t).toLocaleDateString(undefined,{month:'short',day:'numeric'});
 const ticks=[...new Set([0,Math.floor((pts.length-1)/2),pts.length-1])];
 return`<svg viewBox="0 0 ${W} ${H}" style="width:100%;display:block" role="img" aria-label="Progression">
 ${[y0,(y0+y1)/2,y1].map(v=>`<line x1="${L}" x2="${W-R}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line)"/><text x="${L-6}" y="${Y(v)+3}" font-size="9" text-anchor="end" fill="var(--ink-3)">${f(v)}</text>`).join('')}
 <polygon points="${X(0)},${H-B} ${line} ${X(pts.length-1)},${H-B}" fill="var(--accent)" opacity=".08"/>
 <polyline points="${line}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
 ${pts.map((p,i)=>`<circle cx="${X(i)}" cy="${Y(p.y)}" r="${i===pts.length-1?4.5:3}" fill="${i===pts.length-1?'var(--accent)':'var(--surface)'}" stroke="var(--accent)" stroke-width="2"/>`).join('')}
 <text x="${X(pts.length-1)}" y="${Y(pts.at(-1).y)-9}" font-size="11" font-weight="700" text-anchor="${pts.length>1?'end':'middle'}" fill="var(--ink)">${f(pts.at(-1).y)}</text>
 ${ticks.map(i=>`<text x="${X(i)}" y="${H-6}" font-size="9" text-anchor="${i===0?'start':i===pts.length-1?'end':'middle'}" fill="var(--ink-3)">${lbl(i)}</text>`).join('')}</svg>`}
V.exhist=ex=>{const S2=exSessions(ex),all=S2.flatMap(x=>x.ss),b=bestSet(ex),tm=isTimed(ex);
 const pts=S2.map(x=>({t:x.w.ts,y:sessScore(x.ss)})),first=pts[0]?.y,last=pts.at(-1)?.y,ch=pts.length>1&&first?Math.round((last-first)/first*100):null;
 return`<div class="top">${backBtn()}<h1 style="font-size:22px;flex:1;margin-left:var(--s1)">${escT(ex)}</h1><span></span></div>
 <div class="exstats"><div><small>Best set</small><b>${b?setTxt(ex,b):'—'}</b></div><div><small>${tm?'Longest':'e1RM'}</small><b>${b?tm?fmtSec(Math.max(...all.map(s=>s.r))):Math.round(e1rm(b.w,b.r))+' kg':'—'}</b></div><div><small>Sets</small><b>${all.length}</b></div><div><small>Sessions</small><b>${S2.length}</b></div></div>
 <div class="sec">Progression${ch!=null?`<small style="color:${ch>=0?'var(--ok)':'var(--accent)'}">${ch>=0?'+':''}${ch}% since first</small>`:''}</div>
 <div class="card">${progChart(pts)}<p class="t-caption" style="margin-top:6px">Score per session = weight × ${tm?'seconds':'reps'}, added up over all sets${all.some(s=>!s.w)?' (bodyweight sets count their '+(tm?'seconds':'reps')+')':''}.</p></div>
 <div class="sec">All sets</div>
 ${S2.slice().reverse().map(({w,ss})=>`<div class="list" style="margin-bottom:var(--s1)"><div class="row" onclick="push('wkdetail',${w.ts})"><div class="rbody"><b>${new Date(w.ts).toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric',year:'numeric'})}</b><small>${esc((PROGS[w.prog]||PROGS.free).name)}${w.deload?' · deload':''} · score ${Math.round(sessScore(ss)).toLocaleString()}</small></div><span class="chev">›</span></div>
  ${ss.map((s,i)=>`<div class="setline"><span class="muted">Set ${i+1}</span><b>${setTxt(ex,s)}</b><span class="muted">${s.rir!=null?`RIR ${s.rir===4?'4+':s.rir}`:''}${s.pr?' · PR':''}</span></div>`).join('')}</div>`).join('')||'<div class="empty">No sets logged yet.</div>'}
 <div style="height:var(--s4)"></div>`};

// ================= SESSION DETAIL: exactly what you did =================
V.wkdetail=ts=>{const w=S.workouts.find(x=>x.ts===ts);if(!w)return`<div class="top">${backBtn()}<span></span></div><div class="empty">Workout not found.</div>`;
 const P=PROGS[w.prog]||PROGS.free,order=[...new Set(w.sets.map(s=>s.ex))],vol=w.sets.reduce((t,s)=>t+s.w*s.r,0),dur=w.end?Math.round((w.end-w.ts)/6e4):null;
 return`<div class="top">${backBtn()}<h1 style="font-size:22px;flex:1;margin-left:var(--s1)">${esc(P.name)}</h1><span></span></div>
 <p class="muted" style="margin-top:-6px">${new Date(w.ts).toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'})} · ${new Date(w.ts).toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'})}${dur?` · ${dur} min`:''}${w.deload?' · deload':''}</p>
 <div class="exstats"><div><small>Sets</small><b>${w.sets.length}</b></div><div><small>Volume</small><b>${Math.round(vol).toLocaleString()} kg</b></div><div><small>PRs</small><b>${w.prs||0}</b></div><div><small>XP</small><b>+${w.xp}</b></div></div>
 ${order.map(ex=>{const ss=w.sets.filter(s=>s.ex===ex);return`<div class="list" style="margin-top:var(--s2)"><div class="row" data-e="${esc(ex)}" onclick="push('exhist',this.dataset.e)"><div class="rbody"><b>${escT(ex)}</b><small>${ss.length} set${ss.length>1?'s':''} · tap for full history</small></div><span class="chev">›</span></div>
  ${ss.map((s,i)=>`<div class="setline"><span class="muted">Set ${i+1}</span><b>${setTxt(ex,s)}</b><span class="muted">${s.rir!=null?`RIR ${s.rir===4?'4+':s.rir}`:''}${s.pr?' · PR':''}</span></div>`).join('')}</div>`}).join('')}
 <div style="height:var(--s4)"></div>`};
const _fwT=finishW;finishW=function(){const a=S.active;_fwT();const w=S.workouts.at(-1);if(a&&w&&w.ts===a.ts&&!w.end){w.end=Date.now();save()}document.body.classList.remove('resting')};

// Wire rows on the Train screens (built by older layers) to the new pages.
function secList(txt){const h=[...document.querySelectorAll('#app .sec,#app .hdr')].find(s=>s.textContent.includes(txt));return h?.nextElementSibling}
function wireTrain(){
 const pr=secList('Personal Records');pr?.querySelectorAll('.row').forEach(r=>{const n=r.querySelector('.rbody b')?.textContent;if(!n||!EX[n])return;r.style.cursor='pointer';r.onclick=()=>push('exhist',n);
  const b=bestSet(n),v=r.querySelector(':scope>b');if(b&&v)v.textContent=setTxt(n,b);if(isTimed(n)){const sm=r.querySelector('.rbody small');if(sm)sm.textContent='Longest hold '+fmtSec(Math.max(...exSessions(n).flatMap(x=>x.ss).map(s=>s.r)))}});
 document.querySelectorAll('#app details.row').forEach(d=>{const n=d.querySelector('.rbody b')?.textContent,sm=d.querySelector('summary');if(!n||!sm)return;
  sm.onclick=e=>{e.preventDefault();push('exhist',n)};const c=sm.querySelector('.chev');if(c)c.textContent='›'});
 const hist=secList('History'),recent=S.workouts.slice(-8).reverse();hist?.querySelectorAll('.row').forEach((r,i)=>{const w=recent[i];if(!w)return;r.style.cursor='pointer';r.onclick=()=>push('wkdetail',w.ts)})}
const _rdT=render;render=function(...a){const x=_rdT.apply(this,a);try{wireTrain();if($('#tmr')){tmrUI();$('#pr')?.addEventListener('input',tmrUI)}document.body.classList.toggle('resting',resting())}catch(e){console.error(e)}return x};

document.head.insertAdjacentHTML('beforeend',`<style>
.offdays{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px;margin-top:var(--s3)}
.offdays button{border:1px solid var(--line);background:var(--surface);border-radius:12px;padding:12px 0;color:var(--ink);cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:2px}
.offdays button b{font-size:13px}.offdays button small{font-size:10px;color:var(--ink-2)}
.offdays button.on{background:var(--ink);border-color:var(--ink);color:#fff}.offdays button.on small{color:#fffb}
.offdays.sm{margin-top:var(--s1)}
.plweek{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px;margin-top:var(--s3)}
.plweek div{border-radius:10px;background:var(--fill);padding:10px 2px;text-align:center;min-width:0}
.plweek small{display:block;font-size:10px;color:var(--ink-2);font-weight:600}.plweek b{display:block;font-size:10px;margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--ink-3)}
.plweek .tr{background:var(--ink)}.plweek .tr small{color:#fffa}.plweek .tr b{color:#fff}.plweek .off b{color:var(--accent)}
.plstats,.exstats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:var(--s2)}
.plstats div,.exstats div{background:var(--surface);border-radius:var(--r-card);padding:12px}
.plstats b,.exstats b{display:block;font-size:18px;font-weight:800;font-variant-numeric:tabular-nums}.plstats small,.exstats small{font-size:12px;color:var(--ink-2)}
.exstats small{display:block;margin-bottom:2px}
.setline{display:grid;grid-template-columns:52px 1fr auto;gap:8px;align-items:center;padding:10px 14px;border-top:1px solid var(--line);font-variant-numeric:tabular-nums;font-size:14px}
body.resting #app button[onclick^="addSet"],body.resting #app button[onclick^="mv(1)"],body.resting #app button[onclick*="timerStart"],body.resting #app button[onclick^="pickEx()"]{opacity:.4}
#rest.nudge{animation:restNudge .4s}
@keyframes restNudge{0%,100%{transform:none}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}
</style>`);
if(typeof render==='function')render();
