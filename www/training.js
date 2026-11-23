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
// Fasting: the user picks when the eating window opens (it used to default to noon for everyone).
{const i=OBSTEPS.findIndex(s=>s.k==='fastProto');if(i>=0)OBSTEPS.splice(i+1,0,{k:'fastStart',q:'When should your eating window open?',s:'Pick what fits your day. Noon means skipping breakfast; an earlier window is a bit better for blood sugar.',
 get o(){const f=FASTS.find(x=>x[0]===OB.d.fastProto),eat=24-(f?f[1]:16);return[6,8,10,12,14,16,18].map(h=>[h,h<11?'☕':'⏱️',hh(h),`Eat ${hh(h)} – ${hh((h+eat)%24)}`])}})}
const fastOff=()=>!OB.d.fastProto||OB.d.fastProto==='off';
function togOff(i,el){const o=OB.d.offDays=(OB.d.offDays||[]).includes(i)?OB.d.offDays.filter(x=>x!==i):[...(OB.d.offDays||[]),i];el.classList.toggle('on');vib(8);
 const b=$('#offgo');if(b)b.textContent=o.length?`Continue · ${7-o.length} days free`:'No blocked days';if(o.length>=7){OB.d.offDays=o.slice(0,6);el.classList.remove('on');toast('Keep at least one day free')}}
// the deficit step preselects the default for the chosen goal, so switching cut → bulk never keeps the old deficit
const _startOBT=startOB;startOB=function(){OB._defGoal=S.profile?.goal;_startOBT()};
const _onbT=V.onboard;V.onboard=()=>{
 // skip the window-start question when fasting is off, in whichever direction the user is moving
 if(OBSTEPS[OB.step]?.k==='fastStart'&&fastOff())OB.step+=(OB._last??0)>OB.step?-1:1;OB._last=OB.step;
 if(OBSTEPS[OB.step]?.k==='deficit'&&OB._defGoal!==OB.d.goal){OB._defGoal=OB.d.goal;const v={cut:500,slowcut:250,maintain:0,bulk:-300}[OB.d.goal];if(v!=null)OB.d.deficit=v}
 if(OB.d.fastStart==null&&OBSTEPS[OB.step]?.k==='fastStart')OB.d.fastStart=S.fast.start;
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
 ${fastOff()?'':(()=>{const f=FASTS.find(x=>x[0]===d.fastProto),st=d.fastStart??S.fast.start;return`<div class="plstats" style="grid-template-columns:1fr"><div><b>${hh(st)} – ${hh((st+24-f[1])%24)}</b><small>eating window · ${d.fastProto} fasting</small></div></div>`})()}
 <p class="t-caption" style="margin-top:var(--s2)">Exercises picked for: ${esc(eq.toLowerCase())}. You can swap any exercise or change the days later in Train → This week → Change.</p>
 <div style="flex:1"></div><button class="btn" onclick="finishOB()">Start my plan</button></div>`}
const _fobT=finishOB;finishOB=function(){if(!OB.active)return;const d=OB.d,P=d.days?autoPlan(d):null,fs=fastOff()?null:d.fastStart;
 if(d.equip){S.equip=d.equip}['offDays','exp','sessLen','equip','fastStart'].forEach(k=>delete d[k]);_fobT();if(!S.profile)return;
 delete S.profile.fastStart;if(fs!=null){S.fast.start=fs;delete S.fast.reset;save();try{schedFast()}catch(e){}try{schedNotifs()}catch(e){}}
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

// ================= RANK BADGES (Neon set) + RANK-UP POP-UPS =================
// New ranks — overall, each muscle and cardio — are queued and shown together in one "Congratulations" pop-up
// after the workout or activity, never in the middle of one. They can be turned off in Settings.
S.rankPop??=true;S.rankQ??=[];
const RANK_IMG=i=>`img/ranks/${RANKS[Math.floor(i/3)][0].toLowerCase()}.png`,MUS_IMG=m=>`img/muscles/${m.toLowerCase()}.png`;
const rankName=i=>RANKS[Math.floor(i/3)][0]+' '+DIVS[i%3];
window.rankBadge=(i,size=24)=>`<img src="${RANK_IMG(i)}" width="${size}" height="${size}" alt="${RANKS[Math.floor(i/3)][0]}" style="flex:none;display:block;object-fit:contain">`;
function rankSnap(){const o={};for(const m of MUSCLES)o[m]=rankOf(S.xp[m]||0).idx;o.Cardio=rankOf(S.cardioXp||0).idx;return o}
S.rankSeenM??=rankSnap(); // first run: today's ranks count as already seen
window.rankQueueUpdate=function(){const now=rankSnap();for(const k in now){const was=S.rankSeenM[k]??now[k];if(now[k]>was){S.rankQ=S.rankQ.filter(x=>x.k!==k);S.rankQ.push({k,i:now[k]})}S.rankSeenM[k]=Math.max(was,now[k])}
 const o=orank();if(o.i>(S.rankSeen??0)&&!S.rankQ.some(x=>x.k==='overall'&&x.i===o.i)){S.rankQ=S.rankQ.filter(x=>x.k!=='overall');S.rankQ.push({k:'overall',i:o.i})}
 if(S.rankQ.length)setTimeout(showRankQueue,600)};
let rqOpen=false;
function rankQDone(off){const o=S.rankQ.find(x=>x.k==='overall');if(o)S.rankSeen=Math.max(S.rankSeen??0,o.i);S.rankQ=[];if(off)S.rankPop=false;save()}
function showRankQueue(){if(rqOpen||!S.rankQ.length)return;if(!S.rankPop)return rankQDone();
 if(S.active||(typeof RUN!=='undefined'&&RUN)||OB.active||document.querySelector('.w-over'))return;
 rqOpen=true;const Q=S.rankQ.slice().sort((a,b)=>(b.k==='overall')-(a.k==='overall')||b.i-a.i),top=Q[0],label=x=>x.k==='overall'?'Overall rank':`${x.k} rank`;
 const el=document.createElement('div');el.className='w-over rq';el.setAttribute('role','dialog');
 el.innerHTML=`<div class="rq-badge"><img src="${RANK_IMG(top.i)}" alt=""></div><div class="t-caption rq-k">Congratulations!</div><div class="t-display rq-t">You reached ${rankName(top.i)}</div><p class="muted">${label(top)}</p>
  ${Q.length>1?`<div class="rq-list">${Q.slice(1).map(x=>`<div class="rq-row">${x.k==='overall'?rankBadge(x.i,40):`<img src="${MUS_IMG(x.k)}" alt="" width="40" height="40">`}<b>${x.k==='overall'?'Overall':x.k}</b><span>${rankName(x.i)}</span>${rankBadge(x.i,32)}</div>`).join('')}</div>`:''}
  <button class="btn" style="margin-top:var(--s3);width:100%">Nice!</button><button class="aflink rq-off" style="margin-top:var(--s1)">Turn off rank-up pop-ups</button><small class="t-caption">You can turn them back on in Settings.</small>`;
 const close=off=>{rankQDone(off);el.remove();rqOpen=false;if(off)toast('Rank-up pop-ups off — turn them on in Settings');if(S.lossQ)setTimeout(showLossPop,400)};
 el.querySelector('.btn').onclick=()=>close(false);el.querySelector('.rq-off').onclick=()=>close(true);document.body.appendChild(el);vib([20,40,60])}
window.showRankQueue=showRankQueue;
const _setRQ=V.settings;V.settings=()=>_setRQ().replace(/(<div class="row" onclick="push\('transfer'\)">)/,`<div class="row" style="cursor:default"><div class="rbody"><b>Rank-up pop-ups</b><small>Celebrate new ranks after a workout or activity</small></div><button class="sw ${S.rankPop?'on':''}" role="switch" aria-checked="${S.rankPop}" aria-label="Rank-up pop-ups" onclick="S.rankPop=!S.rankPop;save();render()"><i></i></button></div>$1`);

// ================= MISSED WORKOUTS: make it up within 2 days, or lose a little XP =================
// Muscle size and strength hold up well for 2–3 weeks without training and come back fast after a break
// (Bosquet et al., 2013; McMaster et al., 2013; Psilander et al., 2019), so losing is much slower than gaining:
// one missed session costs the muscles that day trains 5% of what they earn in an average session.
// Misses in a row cost more each time — 1×, 1.5×, 2×, 2.5× … up to 5× (linear, not exponential); any workout resets it.
// A whole month off costs about one session's worth, so a single workout wins it back.
// Losing enough XP can demote a rank; the next time the app opens, a pop-up shows what was lost.
S.missed??={};S.missedFrom??=today(); // only sessions planned after this update count — no retroactive penalties
const missMult=n=>Math.min(5,1+.5*(n-1));
// how many misses in a row this one is: earlier misses since the last workout before it, plus itself
function missN(d){const lastW=S.workouts.reduce((a,w)=>{const x=iso(w.ts);return x<d&&x>a?x:a},'');
 return 1+Object.entries(S.missed).filter(([k,e])=>k<d&&k>lastW&&(e.st==='lost'||e.st==='open')).length}
// Like ranked games: a loss only empties the current rank down to 0 XP; a muscle already at 0 in its rank gets demoted.
// XP a muscle earns in an average session, from its last 6 sessions (primary sets count fully, secondary half — like grantXP)
function sessGain(m){const g=w=>(w.sets||[]).reduce((t,s)=>{const e=EX[s.ex];return t+(!e?0:e[0].includes(m)?s.xp||0:e[1].includes(m)?(s.xp||0)/2:0)},0);
 const v=S.workouts.map(g).filter(x=>x>0).slice(-6);return v.length?v.reduce((a,b)=>a+b,0)/v.length:200}
function missCost(prog,n){const o={},f=missMult(n);for(const m of (PROGS[prog]?.m||[])){const xp=S.xp[m]||0,r=rankOf(xp),c=Math.min(Math.max(1,Math.round(sessGain(m)*.05*f)),xp),x=r.cur>0?Math.min(c,r.cur):r.idx>0?c:0;if(x>0)o[m]=x}return o}
const missTxt=xp=>Object.entries(xp).map(([m,x])=>`${m} −${x}`).join(', ');
const missDemotes=xp=>Object.entries(xp).filter(([m,x])=>rankOf((S.xp[m]||0)-x).idx<rankOf(S.xp[m]||0).idx).map(([m])=>m);
function missedScan(){if(!S.profile||!S.week||!window.__planReady)return;const W=ensureWeek(),ti=DOW(Date.now()),td=today(),ov=xpTotal(),was={...S.xp};let lost=[];
 for(let i=0;i<ti;i++){const d=iso(dayOfWeek(i));if(S.missed[d]||d<S.missedFrom||(S.startDate&&d<S.startDate))continue;if(dayPlan(d).type!=='missed')continue;
  const prog=W.days?.[i]?.prog||W.queue[W.pat.slice(0,i).filter(Boolean).length]||W.queue.at(-1);if(!prog)continue;const due=new Date(d+'T12:00');due.setDate(due.getDate()+2);S.missed[d]={prog,due:iso(due),st:'open'}}
 for(const [d,e] of Object.entries(S.missed).sort(([a],[b])=>a<b?-1:1)){if(e.st!=='open')continue;
  if(S.workouts.some(w=>iso(w.ts)>d&&iso(w.ts)<=e.due&&(w.prog===e.prog||(typeof madeUp==='function'&&madeUp(w,e.prog))))){e.st='done';continue}
  if(td>e.due){e.n=missN(d);e.xp=missCost(e.prog,e.n);e.st='lost';for(const [m,x] of Object.entries(e.xp))S.xp[m]-=x;
   if(Object.keys(e.xp).length)lost.push([d,e])}}
 for(const x of Object.keys(S.missed))if(x<iso(Date.now()-60*864e5))delete S.missed[x];
 if(lost.length){lossQueue(lost,was,ov);save();setTimeout(showLossPop,900)}
 const sig=Object.entries(S.missed).map(([k,e])=>k+e.st).join();if(sig!==missedScan.sig){missedScan.sig=sig;schedNotifs()}}
// Losses wait in S.lossQ until the user sees them (survives closing the app before the pop-up shows).
S.lossQ??=null;
function lossQueue(lost,was,ov){const q=S.lossQ||{items:[],before:{},ov};
 for(const [,e] of lost)for(const m in e.xp)if(!(m in q.before))q.before[m]=was[m]||0;
 q.items.push(...lost.map(([d,e])=>({d,prog:e.prog,n:e.n,xp:e.xp})));S.lossQ=q;
 // after a demotion, reaching the rank again is celebrated again
 for(const m in q.before){const now=rankOf(S.xp[m]||0).idx;if(S.rankSeenM&&S.rankSeenM[m]>now)S.rankSeenM[m]=now}
 const o=orank().i;if((S.rankSeen??0)>o)S.rankSeen=o}
// Ranked-game style result screen: each muscle's badge and XP bar draining, −XP, and DEMOTED when a rank drops.
function showLossPop(){const q=S.lossQ;if(!q||S.active||(typeof RUN!=='undefined'&&RUN)||OB.active||document.querySelector('.w-over'))return;
 const R=r=>({i:r.idx??r.i,cur:r.cur,need:r.need}),pct=r=>Math.max(0,Math.min(100,r.cur/r.need*100));
 const rows=[{k:'Overall',a:R(orank(q.ov)),b:R(orank()),x:q.ov-xpTotal()},...Object.keys(q.before).map(m=>({k:m,a:R(rankOf(q.before[m])),b:R(rankOf(S.xp[m]||0)),x:q.before[m]-(S.xp[m]||0)}))].filter(r=>r.x>0);
 const dem=rows.filter(r=>r.b.i<r.a.i),top=dem[0],last=q.items.at(-1),next=missMult(last.n+1),zero=rows.filter(r=>r.k!=='Overall'&&r.b.cur===0&&r.b.i>0).map(r=>r.k);
 const day=d=>new Date(d+'T12:00').toLocaleDateString(undefined,{weekday:'short'}),miss=q.items.map(it=>`${(PROGS[it.prog]||{}).name} (${day(it.d)})`).join(', ');
 const el=document.createElement('div');el.className='w-over rq lq';el.setAttribute('role','dialog');
 el.innerHTML=`<div class="rq-badge lq-badge">${top?`<img src="${RANK_IMG(top.b.i)}" alt="">`:`<img src="${RANK_IMG(rows[0]?.b.i||0)}" alt="">`}</div>
  <div class="t-caption rq-k">${top?'Demoted':'Missed workouts'}</div><div class="t-display rq-t">${top?(()=>{const dm=dem.filter(r=>r.k!=='Overall').map(r=>r.k);return dm.length>2?`${dm.length} muscles were demoted`:dm.length?`${dm.join(' & ')} dropped to ${rankName(dem.find(r=>r.k!=='Overall').b.i)}`:`Overall rank dropped to ${rankName(top.b.i)}`})():'You\'ve lost some progress'}</div>
  <p class="muted">${top?'You\'ve lost some progress. ':''}Not made up within 2 days: ${miss}.</p>
  <div class="rq-list">${rows.map((r,j)=>`<div class="lq-row">${r.k==='Overall'?rankBadge(r.b.i,40):`<img src="${MUS_IMG(r.k)}" alt="" width="40" height="40">`}
   <div><b>${r.k}</b> ${r.b.i<r.a.i?`<span class="lq-dem">DEMOTED</span>`:''}<small>${r.b.i<r.a.i?`${rankName(r.a.i)} → ${rankName(r.b.i)}`:rankName(r.b.i)}</small><div class="lq-bar"><i data-j="${j}" style="width:${pct(r.a)}%"></i></div></div>
   <span class="lq-x">−${Math.round(r.x)} XP</span></div>`).join('')}</div>
  <div class="lq-tips">${zero.length?`<span>🚨 <b>${zero.join(', ')}</b> ${zero.length>1?'are':'is'} at 0 XP in ${zero.length>1?'their':'its'} rank — miss another ${(PROGS[last.prog]||{}).name} and ${zero.length>1?'they get':'it gets'} demoted.</span>`:''}<span>⚠️ Misses in a row cost more — the next one costs <b>${next}×</b>.</span><span>💪 Any workout resets it. Make up a missed workout within 2 days to keep your XP.</span>${dem.length?'<span>🏅 Climb back up — getting a rank back is celebrated again.</span>':''}</div>
  <button class="btn" style="margin-top:var(--s3);width:100%">Get back on track</button><button class="aflink lq-later" style="margin-top:var(--s1)">Close</button>`;
 const close=g=>{S.lossQ=null;save();el.remove();if(g){stack=[];go('train')}if(S.rankQ?.length)setTimeout(showRankQueue,400)};
 el.querySelector('.btn').onclick=()=>close(true);el.querySelector('.lq-later').onclick=()=>close(false);document.body.appendChild(el);vib([60,40,60]);
 // drain each bar; a demoted bar empties, then refills to where the lower rank stands
 setTimeout(()=>rows.forEach((r,j)=>{const b=el.querySelector(`[data-j="${j}"]`);if(!b)return;if(r.b.i<r.a.i){b.style.width='0%';setTimeout(()=>{b.style.transition='none';b.style.width='100%';b.offsetWidth;b.style.transition='';b.style.width=pct(r.b)+'%'},750)}else b.style.width=pct(r.b)+'%'}),450)}
function missedCard(){const open=Object.entries(S.missed).filter(([,e])=>e.st==='open'&&today()<=e.due);if(!open.length)return'';
 return open.map(([d,e])=>{const n=missN(d),cost=missCost(e.prog,n),c=missTxt(cost),dm=missDemotes(cost);return`<div class="mw-card"><div><b>Missed ${(PROGS[e.prog]||{}).name} · ${new Date(d+'T12:00').toLocaleDateString(undefined,{weekday:'short'})}</b><small>Do it by ${new Date(e.due+'T12:00').toLocaleDateString(undefined,{weekday:'long'})} to keep your XP${c?` — skipping costs ${c} XP`:''}${n>1?` (${missMult(n)}×, ${n} missed in a row)`:''}.${dm.length?` <b class="mw-warn">⚠️ ${dm.join(', ')} would be demoted.</b>`:''}</small></div><button class="btn sm" onclick="startW('${e.prog}')">Do it now</button></div>`}).join('')}
// Phone notifications (Workout & cardio reminders): the evening before the deadline, the deadline morning, and the morning after if XP was lost.
const _snMW=schedNotifs;schedNotifs=async function(){await _snMW();const L=LN();if(!L||!S.profile||!S.notif.workout)return;
 try{if((await L.checkPermissions()).display!=='granted')return;const N=[],td=today(),at=(d,h)=>{const t=new Date(d+'T12:00');t.setHours(h,0,0,0);return t},shift=(d,k)=>{const t=new Date(d+'T12:00');t.setDate(t.getDate()+k);return iso(t)};
  Object.entries(S.missed).filter(([,e])=>e.st==='open'&&e.due>=td).sort(([a],[b])=>a<b?-1:1).slice(0,6).forEach(([d,e],i)=>{const name=(PROGS[e.prog]||{}).name,n=missN(d),c=missTxt(missCost(e.prog,n)),add=(id,t,title,body)=>{if(t>new Date())N.push({id,title,body,schedule:{at:t,allowWhileIdle:true},extra:{go:'plan'}})};
   add(1300+i,at(shift(e.due,-1),19),`⏳ Make up ${name}`,`You missed it — do it by tomorrow to keep your XP.`);
   const dm=missDemotes(missCost(e.prog,n));
   add(1310+i,at(e.due,9),`⚠️ Last day to make up ${name}`,c?`Skip it and you lose ${c} XP${n>1?` (${missMult(n)}× — ${n} missed in a row)`:''}.${dm.length?` ${dm.join(', ')} would be demoted!`:''}`:'Do it today to stay on track.');
   if(c)add(1320+i,at(shift(e.due,1),8),`📉 XP lost: ${name}`,`${c} XP. Misses in a row cost more — any workout today resets it.`)});
  if(N.length)await L.schedule({notifications:N})}catch(e){console.warn('missed notif',e)}};
const _planMW=V.plan;V.plan=()=>{try{missedScan();if(S.lossQ)setTimeout(showLossPop,900)}catch(e){console.error(e)}const h=_planMW(),c=missedCard();if(!c)return h;const k=h.indexOf('<div class="sec');return k>0?h.slice(0,k)+c+h.slice(k):c+h};

// ================= BODY FAT: never show an impossible tape result =================
// The US Navy tape formula can go negative (or absurdly high) when the waist is measured too high, too tight or in
// inches. Then fall back to the BMI/build estimate and say why, instead of showing "-10%".
const BF_OK=v=>v>=3&&v<=65;
const _bfT=bodyFat;bodyFat=function(){const r=_bfT();if(!r||BF_OK(r.bf)||!/Navy/.test(r.method||''))return r;const p=S.profile,w=p.waist;p.waist=null;const e=_bfT();p.waist=w;
 return{...e,badTape:true,method:'Estimated — your waist/neck numbers give an impossible result, so they were ignored. Re-measure in cm: waist at the navel, neck just below the Adam’s apple.'}};
// One-time cleanup: drop impossible values already saved, and undo a body-fat goal they falsely "reached".
if(S.bfLog?.some(x=>!BF_OK(x[1]))){S.bfLog=S.bfLog.filter(x=>BF_OK(x[1]));if(S.goals?.bf?.done&&bodyFat()&&bodyFat().bf>S.goals.bf.target)S.goals.bf.done=null;save()}
const _smT=saveMeas2;saveMeas2=function(){const w=+$('#mw2')?.value,n=+$('#mn2')?.value;
 if(w&&(w<45||w>200))return toast('Waist looks off — measure at the navel, in cm (e.g. 85)');if(n&&(n<20||n>70))return toast('Neck looks off — measure just below the Adam’s apple, in cm (e.g. 38)');
 if(w&&n&&w-n<15)return toast('Waist should be well bigger than neck — measure the waist at the navel, in cm');_smT()};
measSheet=measSheet2;

// ================= BODYWEIGHT EXERCISES: reps, not weights =================
// Push-ups, pull-ups, dips, planks… have no weight to pick. First time: as many clean reps as you can, about 10;
// after that: beat your best reps. Muscle grows across roughly 6–30 reps when sets end near failure, so 10 is a
// middle target, not a magic number (Schoenfeld et al., 2017 & 2021).
const BW_RX=/push-up|pull-up|chin-up|muscle-up|\bdips?\b|bench dip|plank|crunch|leg raise|burpee|pistol|handstand|l-sit|dead bug|superman|glute bridge|australian row|bodyweight|sit-up|mountain climber|jumping jack|hollow/i;
const isBW=ex=>BW_RX.test(ex)||['h','bar'].includes(typeof tierOf==='function'?tierOf(ex):null);
const _sgBW=sugg;sugg=function(ex){const s=_sgBW(ex);if(!isBW(ex)||isTimed(ex))return s;const ls=lastSets(ex);
 if(!ls)return{...s,w:0,r:10,text:'First time! Do as many clean reps as you can, stopping 1–2 reps before failure — about <b>10</b> is a good start.'};
 const added=Math.max(0,...ls.map(x=>x.w||0));if(added)return s;
 if(/kg ×/.test(s.text)){const best=Math.max(...ls.map(x=>x.r));
  return best>=25?{...s,w:0,r:best,text:`Last time ${best} reps. That's a lot — make it harder: lower in 3 seconds, or try a harder version (Alternatives).`}
   :{...s,w:0,r:best+1,text:`Last time ${best} reps. Beat it: <b>${best+1} reps</b>.`}}
 return s};
// The weight box becomes optional added weight (vest, backpack) for bodyweight moves.
const _plBW=V.player;V.player=()=>{let h=_plBW();const a=S.active;if(a&&isBW(a.list[a.idx])&&!isTimed(a.list[a.idx]))h=h.replace(/>Weight \(kg\)</,'>Added weight (kg) · optional<');return h};

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
function wireRanks(){document.querySelectorAll('#app .stat').forEach(st=>{const m=st.querySelector('small')?.textContent?.trim();if(!MUSCLES.includes(m)||st.querySelector('.mr-ic'))return;
 st.classList.add('mr-card');st.insertAdjacentHTML('afterbegin',`<img class="mr-ic" src="${MUS_IMG(m)}" alt=""><span class="mr-b">${rankBadge(rankOf(S.xp[m]||0).idx,28)}</span>`)})}
function wireTrain(){wireRanks();if(S.rankQ?.length&&!S.active&&!(typeof RUN!=='undefined'&&RUN))setTimeout(showRankQueue,700);
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
.offdays button.on{background:var(--ink);border-color:var(--ink);color:var(--surface)}.offdays button.on small{color:var(--on-accent)}
.offdays.sm{margin-top:var(--s1)}
.plweek{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px;margin-top:var(--s3)}
.plweek div{border-radius:10px;background:var(--fill);padding:10px 2px;text-align:center;min-width:0}
.plweek small{display:block;font-size:10px;color:var(--ink-2);font-weight:600}.plweek b{display:block;font-size:10px;margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--ink-3)}
.plweek .tr{background:var(--ink)}.plweek .tr small{color:var(--on-accent)}.plweek .tr b{color:var(--on-accent)}.plweek .off b{color:var(--accent)}
.plstats,.exstats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:var(--s2)}
.plstats div,.exstats div{background:var(--surface);border-radius:var(--r-card);padding:12px}
.plstats b,.exstats b{display:block;font-size:18px;font-weight:800;font-variant-numeric:tabular-nums}.plstats small,.exstats small{font-size:12px;color:var(--ink-2)}
.exstats small{display:block;margin-bottom:2px}
.rq{text-align:center}.rq-badge img{width:150px;height:150px;object-fit:contain;filter:drop-shadow(0 8px 24px var(--shadow-c));animation:rqIn .6s cubic-bezier(.2,1.4,.4,1)}
.rq-k{margin-top:var(--s2);text-transform:uppercase;letter-spacing:.1em;font-weight:800;color:var(--accent)}.rq-t{font-size:30px;margin-top:6px}
.rq-list{width:100%;margin-top:var(--s2);display:grid;gap:6px}.rq-row{display:flex;align-items:center;gap:10px;background:var(--fill);border-radius:12px;padding:6px 10px;text-align:left}.rq-row b{flex:1}.rq-row span{color:var(--ink-2);font-size:14px}
@keyframes rqIn{from{transform:scale(.3) rotate(-12deg);opacity:0}to{transform:none;opacity:1}}
.mr-card{position:relative;padding-left:62px!important;padding-right:12px!important;min-height:76px}.mr-ic{position:absolute;left:8px;top:50%;transform:translateY(-50%);width:48px;height:48px;object-fit:contain}.mr-b{position:absolute;right:6px;top:6px}
.mw-card{display:flex;align-items:center;gap:12px;background:color-mix(in srgb,var(--warn) 14%,var(--surface));border-radius:14px;padding:12px 14px;margin-top:var(--s2)}.mw-card>div{flex:1}.mw-card b{display:block}.mw-card small{color:var(--warn);font-size:13px}.mw-card .mw-warn{display:inline;color:var(--accent)}
.lq{justify-content:flex-start;overflow-y:auto;padding-top:max(var(--s3),env(safe-area-inset-top));padding-bottom:max(var(--s3),env(safe-area-inset-bottom))}.lq>:first-child{margin-top:auto}.lq>:last-child{margin-bottom:auto}
.lq .rq-k{color:var(--accent)}.lq-badge img{width:112px;height:112px;animation:lqDrop .8s ease both}.lq .rq-t{font-size:26px}
.lq-row{display:grid;grid-template-columns:40px 1fr auto;gap:10px;align-items:center;background:var(--fill);border-radius:12px;padding:8px 10px;text-align:left}
.lq-row small{display:block;color:var(--ink-2);font-size:13px}.lq-bar{height:6px;border-radius:3px;background:var(--shadow-c);margin-top:6px;overflow:hidden}.lq-bar i{display:block;height:100%;background:var(--accent);transition:width .7s ease}
.lq-x{color:var(--accent);font-weight:800;font-variant-numeric:tabular-nums;font-size:14px}
.lq-dem{display:inline-block;background:var(--accent);color:var(--on-accent);font-size:10px;font-weight:800;letter-spacing:.06em;padding:2px 6px;border-radius:6px;margin-left:4px;vertical-align:2px}
.lq-tips{width:100%;text-align:left;margin-top:var(--s2);background:color-mix(in srgb,var(--warn) 14%,var(--surface));color:var(--warn);border-radius:12px;padding:10px 12px;font-size:14px;display:grid;gap:6px}
@keyframes lqDrop{0%{transform:translateY(-24px) scale(1.15);opacity:0}55%{transform:translateY(4px);opacity:1}70%{transform:translateX(-6px) rotate(-3deg)}85%{transform:translateX(6px) rotate(3deg)}100%{transform:none}}
.setline{display:grid;grid-template-columns:52px 1fr auto;gap:8px;align-items:center;padding:10px 14px;border-top:1px solid var(--line);font-variant-numeric:tabular-nums;font-size:14px}
body.resting #app button[onclick^="addSet"],body.resting #app button[onclick^="mv(1)"],body.resting #app button[onclick*="timerStart"],body.resting #app button[onclick^="pickEx()"]{opacity:.4}
#rest.nudge{animation:restNudge .4s}
@keyframes restNudge{0%,100%{transform:none}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}
</style>`);
// Pop-up queue (popups.js): rank-up / loss screens wait for an open sheet or overlay to close instead of stacking on it.
if(window.Pop){const _srq=showRankQueue;showRankQueue=function(){if(S.rankQ?.length&&Pop.busy())return Pop.show('rank',showRankQueue);return _srq()};window.showRankQueue=showRankQueue;
 const _slp=showLossPop;showLossPop=function(){if(S.lossQ&&Pop.busy())return Pop.show('loss',showLossPop);return _slp()}}
if(typeof render==='function')render();
