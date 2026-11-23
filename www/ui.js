// RepWise redesigned screens (built only from theme.css tokens). Loaded last.
document.head.insertAdjacentHTML('beforeend','<link rel="stylesheet" href="theme.css">');

// ---------- Meals ----------
function heroRing(p,inner,size=212){const r=104,c=2*Math.PI*r,off=c*(1-Math.min(1,Math.max(0,p)));
 return`<div style="position:relative;width:${size}px;height:${size}px;margin:0 auto"><svg viewBox="0 0 232 232" style="width:100%;transform:rotate(-90deg)"><circle cx="116" cy="116" r="${r}" fill="none" stroke="var(--fill)" stroke-width="8"/>${p>0?`<circle cx="116" cy="116" r="${r}" fill="none" stroke="var(--accent)" stroke-width="8" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c}"><animate attributeName="stroke-dashoffset" from="${c}" to="${off}" dur="1s" fill="freeze" calcMode="spline" keySplines=".2 .8 .2 1" keyTimes="0;1"/></circle>`:''}</svg><div style="position:absolute;inset:0;display:grid;place-content:center;text-align:center">${inner}</div></div>`}
function mealsTrack(){const days=rangeDays(trackRange);
 const monthly=trackRange==='year'||(trackRange==='all'&&days.length>60),map=new Map();days.forEach(x=>{const k=monthly?x.d.slice(0,7):x.d;map.set(k,(map.get(k)||0)+x.bal)});
 const v=[...map].map(([k,bal])=>({k,bal})),W=320,H=150,n=v.length,bw=W/Math.max(n,7);let run=0;const cum=v.map(x=>run+=x.bal),tot=cum.at(-1)||0;
 const max=Math.max(200,...v.map(x=>Math.abs(x.bal))),mid=H/2,sc=(mid-8)/max;
 const bars=v.map((x,i)=>{const cx=i*bw+bw/2,h=Math.max(2,Math.abs(x.bal)*sc),y=x.bal<0?mid:mid-h;return`<rect x="${cx-bw*.28}" y="${y}" width="${bw*.56}" height="${h}" rx="2" fill="${x.bal<0?'var(--ink)':'var(--accent)'}"/>`}).join('');
 const lab=k=>monthly?new Date(k+'-15T12:00').toLocaleDateString(undefined,{month:'short'}):trackRange==='week'?new Date(k+'T12:00').toLocaleDateString(undefined,{weekday:'narrow'}):new Date(k+'T12:00').getDate();
 const step=Math.ceil(n/7),lbl=v.map((x,i)=>i%step===0?`<text x="${i*bw+bw/2}" y="${H+14}" font-size="10" text-anchor="middle" fill="var(--ink-3)">${lab(x.k)}</text>`:'').join('');
 const label=tot<0?'deficit':tot>0?'surplus':'even';
 return`<div class="seg">${[['week','Week'],['month','Month'],['year','Year'],['all','All']].map(([k,l])=>`<button class="${trackRange===k?'on':''}" onclick="trackRange='${k}';render()">${l}</button>`).join('')}</div>
 <div class="t-display" style="font-size:36px">${fmtK(tot)} <span class="t-label muted" style="letter-spacing:0">kcal ${label}</span></div>
 <div class="t-caption" style="margin-top:4px">${tot<0?`About ${(-tot/7700).toFixed(2)} kg of fat · `:''}${days.filter(x=>x.bal<0).length} of ${days.length} days in deficit</div>
 <svg viewBox="0 -4 ${W} ${H+22}" style="width:100%;margin-top:var(--s2)"><line x1="0" x2="${W}" y1="${mid}" y2="${mid}" stroke="var(--line)"/>${bars}${lbl}</svg>
 <div class="t-caption" style="display:flex;gap:var(--s2);margin-top:4px"><span><i style="display:inline-block;width:8px;height:8px;border-radius:2px;background:var(--ink);margin-right:6px"></i>Deficit</span><span><i style="display:inline-block;width:8px;height:8px;border-radius:2px;background:var(--accent);margin-right:6px"></i>Surplus</span><span style="margin-left:auto;cursor:pointer;color:var(--ink);font-weight:600" onclick="push('caltrack')">Every day</span></div>`}
V.meals=()=>{const t=targets(),d=viewDate,f=dayFood(d),k=sum(f,1),p=sum(f,2),burn=(S.burn||{})[d]||0,left=t.kcal+burn-k,over=left<0,plan=-t.adj;
 const dl=d===today()?'Today':new Date(d+'T12:00').toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'});
 const line=[`Target ${t.kcal.toLocaleString()}`,`Eaten ${k.toLocaleString()}`,k?`${t.tdee+burn-k>=0?'Deficit so far':'Surplus so far'} ${Math.abs(t.tdee+burn-k).toLocaleString()}`:`${plan>=0?'Planned deficit':'Planned surplus'} ${Math.abs(plan).toLocaleString()}`].join(' · ');
 return`<div class="top"><h1>Nutrition</h1><span class="chip">${dl}</span></div>
 <div style="text-align:center;margin-top:var(--s1)">${heroRing(k/(t.kcal+burn),`<div class="t-display" data-count="${Math.abs(left)}">0</div><div class="t-label muted" style="margin-top:2px">${over?'kcal over':'kcal left'}</div>`)}
 <div class="t-caption" style="margin-top:var(--s2)">${line}</div>${burn?`<div class="t-caption" style="margin-top:2px">Includes ${burn.toLocaleString()} kcal from tracked activity</div>`:''}</div>
 <div style="margin-top:var(--s3)"><div style="display:flex;justify-content:space-between;margin-bottom:6px"><span class="t-label">Protein</span><span class="t-label muted num">${p} / ${t.protein} g</span></div><div class="bar"><i style="width:${Math.min(100,p/t.protein*100)}%"></i></div></div>
 <div class="qa"><button onclick="foodSheet()">${ic('search')}Add food</button><button onclick="push('nutrition')">${ic('flask')}Nutrients</button><button onclick="push('foodsci')">${ic('leaf')}Smart foods</button><button onclick="push('supps')">${ic('pill')}Supplements</button></div>
 <div id="aiout"></div>
 <!--logged--><div class="hdr">Logged${f.length?`<small class="num">${k.toLocaleString()} kcal</small>`:''}</div>
 ${f.length?`<div class="plist">${f.map((x,i)=>`<div class="li"><div style="flex:1;min-width:0"><b>${escT(x[0])}</b><small>${x[2]} g protein</small></div><span class="t-label num">${x[1]}</span><button class="x" aria-label="Remove" onclick="S.food[viewDate].splice(${i},1);save();render()">${ic('x')}</button></div>`).join('')}</div>`:'<div class="empty">No meals logged yet.</div>'}<!--/logged-->
 ${balDays().length>=2?`<div class="hdr">Calorie balance</div>${mealsTrack()}`:''}
 <div style="height:var(--s4)"></div>`};

// ---------- Timed sets (built-in timer) + guided progression for reps you can't hit yet ----------
const isTimed=e=>/\(sec\)/.test(e);
S.goalReps??={};
const _sugg15=sugg;sugg=function(ex){const ls=lastSets(ex),g=S.goalReps[ex];
 if(!ls){const r=isTimed(ex)?30:10;return{w:0,r,text:isTimed(ex)?`First time! Hold for <b>${r} s</b> with good form.`:_sugg15(ex).text}}
 const bw=ls.every(s=>!s.w),best=Math.max(...ls.map(s=>s.r));
 if(bw&&g&&best<g){const next=Math.min(g,best+(isTimed(ex)?5:1));return{w:0,r:next,text:`Building up to <b>${g}${isTimed(ex)?' s':''}</b>. Last best ${best}${isTimed(ex)?' s':''} — today aim for <b>${next}${isTimed(ex)?' s':''}</b> per set.`}}
 if(isTimed(ex)){const b=Math.max(...ls.map(s=>s.r));return{w:0,r:b+5,text:`Last best ${b} s. Today: <b>${b+5} s</b>.`}}
 return _sugg15(ex)};
let tmr={on:false,start:0,target:0,i:null};
function timerStart(){const ex=S.active.list[S.active.idx];tmr={on:true,target:+$('#pr').value||sugg(ex).r,start:Date.now()+3000,i:null};vib(20);tmr.i=setInterval(timerTick,100);timerTick()}
function timerTick(){const el=$('#tmr');if(!el||!S.active){clearInterval(tmr.i);tmr.on=false;return}const now=Date.now();
 if(now<tmr.start){el.querySelector('.tv').textContent=Math.ceil((tmr.start-now)/1000);el.querySelector('.tl').textContent='Get ready';return}
 const e=(now-tmr.start)/1000,left=Math.max(0,tmr.target-e);el.querySelector('.tv').textContent=Math.ceil(left)+'s';el.querySelector('.tl').textContent='Hold';el.querySelector('i').style.width=Math.min(100,e/tmr.target*100)+'%';
 if(left<=0)timerStop(true)}
function timerStop(done){if(!tmr.on)return;clearInterval(tmr.i);tmr.on=false;const e=Math.max(0,Math.round((Date.now()-tmr.start)/1000));vib(done?[200,100,200]:40);
 $('#pr').value=done?tmr.target:Math.min(e,tmr.target);addSet()}
const _pl15=V.player;V.player=()=>{let h=_pl15();const a=S.active;if(!a)return h;const ex=a.list[a.idx];
 if(!S.goalReps[ex]&&!lastSets(ex))S.goalReps[ex]=sugg(ex).r;
 if(isTimed(ex))h=h.replace(/<button class="btn" onclick="addSet\(\)">/,`<div id="tmr" style="text-align:center;margin:var(--s2) 0"><div class="t-label muted tl">Timer</div><div class="t-display tv">${sugg(ex).r}s</div><div class="bar" style="margin:var(--s1) 0 var(--s2)"><i style="width:0"></i></div>
  <div style="display:flex;gap:var(--s1)"><button class="btn" style="flex:2" onclick="tmr.on?timerStop(false):timerStart()">${ic('timer')} Start timer</button><button class="btn sec2" style="flex:1" onclick="timerStop(false)">Stop</button></div><div class="t-caption" style="margin-top:6px">3-second countdown, then it logs the set automatically. Stop early to log the time you held.</div></div><button class="btn sec2" onclick="addSet()">`);
 const short=a.short&&a.short.ex===ex?a.short:null;
 if(short)h=h.replace('<div class="grid2" style="margin:12px 0">',`<div class="coach q"><span class="ci">🎯</span><span class="ct">Finish the set in mini-sets</span>You did <b>${short.did}</b> of ${short.goal}. Rest 15–20 s, then do as many clean ${isTimed(ex)?'seconds':'reps'} as you can until you reach <b>${short.goal}</b> total (${short.left} to go). This "rest-pause" method builds the same strength.${EASIER[ex]?.length?`<br>Or switch to <b>${EASIER[ex][0][0]}</b> for now — <span style="text-decoration:underline;cursor:pointer" onclick="cantDo()">see easier versions</span>.`:''}
  <button class="btn sm" style="margin-top:8px" onclick="restEnd=Date.now()+15000;restTot=15;clearInterval(restI);restI=setInterval(tickRest,250);tickRest()">${ic('timer')} 15 s mini-rest</button></div><div class="grid2" style="margin:12px 0">`);
 return h};
const _as15=addSet;addSet=function(){const a=S.active,n=a?.sets.length;_as15();if(!a||a.sets.length===n)return;const s=a.sets.at(-1),g=S.goalReps[s.ex]||0;
 if(!s.w&&g&&s.r<g){const prev=a.short&&a.short.ex===s.ex?a.short:null,did=(prev?prev.did:0)+s.r;
  if(did<g){a.short={ex:s.ex,goal:g,did,left:g-did}}else{a.short=null;setTimeout(()=>toast(`Done — ${g}${isTimed(s.ex)?' s':''} total. Next session we'll aim for more in one go.`),400)}
  if(!prev&&s.r<=Math.ceil(g*.3)&&EASIER[s.ex]?.length)setTimeout(()=>toast(`Tough one — try ${EASIER[s.ex][0][0]} to build up to ${g}`),900)}
 else a.short=null;save();render()};

// ---------- 5 tabs: Today · Train · Nutrition · Progress · Profile ----------
TABS.splice(0,TABS.length,['plan','Today'],['train','Train'],['meals','Nutrition'],['body','Progress'],['more','Profile']);
ICONS.train=ICONS.workouts;ICONS.profile=ICONS.more='<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6"/>';
drawNav=function(){$('#nav').innerHTML=TABS.map(([k,l])=>`<button class="${tab===k&&!stack.length?'on':''}" onclick="go('${k}')"><svg viewBox="0 0 24 24">${ICONS[k]}</svg><span>${l}</span></button>`).join('')};
let trainSub='workouts';
const TRAIN_SUBS=[['workouts','Gym'],['run','Cardio'],['challenges','Quests']];
const _go16=go;go=function(t){if(TRAIN_SUBS.some(x=>x[0]===t)){trainSub=t;t='train'}_go16(t)};
V.train=()=>{const h=V[trainSub]().replace(/^\s*<div class="top">[\s\S]*?<\/div>/,'');
 return`<div class="top"><h1>Train</h1></div><div class="seg">${TRAIN_SUBS.map(([k,l])=>`<button class="${trainSub===k?'on':''}" onclick="trainSub='${k}';render()">${l}</button>`).join('')}</div>${h}`};
if(['workouts','run','challenges'].includes(tab)){trainSub=tab;tab='train'}

// ---------- Sleep quality: one unbroken block + waking naturally beats broken sleep ----------
S.sleepQ??={};
const CONT=[['One unbroken block','Slept straight through'],['Woke up 1–2×','Brief wake-ups'],['Broken (3+ times)','Restless night'],['Split into sessions','Night + naps / two blocks']];
function sleepScore(d){const h=S.sleep[d],q=S.sleepQ[d]||{};if(!h)return null;let s=Math.max(0,100-Math.abs(8-h)*14);s-=[0,8,22,18][q.cont??0];if(q.wake==='alarm')s-=8;return Math.round(Math.max(0,Math.min(100,s)))}
sleepSheet=function(){const d=viewDate,v=S.sleep[d]||7.5,q=S.sleepQ[d]||{cont:0,wake:'natural'};window._sq={...q};
 openSheet(`<h3 class="t-title">Last night's sleep</h3>
 <div style="text-align:center;margin:var(--s2) 0"><span class="t-display" id="slv">${v}</span><span class="t-label muted"> hours</span></div><input type="range" id="slr" min="3" max="12" step="0.5" value="${v}" style="width:100%" oninput="$('#slv').textContent=this.value">
 <div class="hdr" style="margin-top:var(--s3)!important">Was it one block?</div><div class="seg" style="flex-wrap:wrap;border-radius:var(--r-card)" id="sqc">${CONT.map(([l],i)=>`<button style="flex:1 1 45%;border-radius:10px" class="${q.cont===i?'on':''}" onclick="_sq.cont=${i};document.querySelectorAll('#sqc button').forEach((b,j)=>b.classList.toggle('on',j===${i}))">${l}</button>`).join('')}</div>
 <div class="hdr" style="margin-top:var(--s2)!important">How did you wake up?</div><div class="seg" id="sqw">${[['natural','On my own'],['alarm','Alarm']].map(([k,l])=>`<button class="${q.wake===k?'on':''}" onclick="_sq.wake='${k}';document.querySelectorAll('#sqw button').forEach(b=>b.classList.toggle('on',b.textContent==='${l}'))">${l}</button>`).join('')}</div>
 <p class="t-caption" style="margin:var(--s1) 0 var(--s2)">One long, unbroken sleep that ends on its own is the most restorative.</p>
 <button class="btn" onclick="S.sleep[viewDate]=+$('#slr').value;S.sleepQ[viewDate]=_sq;save();closeSheet();render();toast('Sleep score '+sleepScore(viewDate)+'/100')">Save</button>
 <div class="t-label" style="text-align:center;margin-top:var(--s2);cursor:pointer" onclick="closeSheet();push('sleep')">Why sleep matters</div>`)};
const _plan16=V.plan;V.plan=()=>{let h=_plan16();const d=viewDate,sc=sleepScore(d),q=S.sleepQ[d];if(sc==null)return h;
 return h.replace(/(<b>Sleep<\/b><small>)[^<]*/,`$1${S.sleep[d]} h · ${CONT[q?.cont??0][0].toLowerCase()}${q?.wake==='alarm'?' · alarm':' · woke naturally'} · score ${sc}`)};
const _sleep16=V.sleep;V.sleep=()=>{const sc=sleepScore(today())??sleepScore(iso(new Date(Date.now()-864e5)));
 return _sleep16().replace('<div class="sec">Why it\'s part of your plan</div>',`${sc!=null?`<div style="margin-top:var(--s3)"><div class="t-label muted">Latest sleep score</div><div class="t-display">${sc}<span class="t-label muted">/100</span></div></div>`:''}
 <div class="hdr">One long sleep beats broken sleep</div>
 <div class="plist">
 <div class="li"><div><b>Sleep runs in ~90-minute cycles</b><small>Deep sleep (muscle repair, growth hormone) comes early; REM (memory, mood) comes late. Waking up repeatedly restarts cycles, so you get less of both — even with the same total hours.</small></div></div>
 <div class="li"><div><b>Broken sleep hurts like short sleep</b><small>Being woken during the night lowered mood and energy more than simply sleeping less, and fragmented sleep reduces insulin sensitivity. <span style="color:var(--ink-3)">Finan et al., 2015, Sleep; Stamatakis & Punjabi, 2010, Chest</span></small></div></div>
 <div class="li"><div><b>Waking on your own is a good sign</b><small>It usually means you finished a cycle and slept enough. Alarms often cut into deep sleep and cause grogginess (sleep inertia) for up to 30 minutes. <span style="color:var(--ink-3)">Tassi & Muzet, 2000, Sleep Med Rev</span></small></div></div>
 <div class="li"><div><b>Split sleep is a backup, not a plan</b><small>A night plus a nap can cover the hours, but one consolidated night is better for recovery. Keep naps under 30 min, before 3 pm.</small></div></div></div>
 <div class="sec">Why it's part of your plan</div>`)};

// Post-meal habits with sources (the walk one feeds the after-meal pop-up).
const POSTMEAL=[
 ['walk','Walk 10–15 minutes','Muscles pull sugar out of the blood while they work. A short walk within 30 min of eating cuts the blood-sugar spike by up to ~30% — better than one long walk at another time.','Buffey et al., 2022, Sports Med; Reynolds et al., 2016, Diabetologia'],
 ['drop','Drink a glass of water','Helps digestion and fullness, and most people under-drink. Water with meals doesn\'t "dilute" digestion.','Dennis et al., 2010, Obesity'],
 ['leaf','Next time: veggies & protein first','Eating vegetables and protein before carbs lowered the glucose spike by ~37% and insulin by ~50% — same meal, different order.','Shukla et al., 2015, Diabetes Care'],
 ['timer','Wait 20 min before seconds','Fullness hormones (GLP-1, PYY) take 15–20 min to rise. Most "still hungry" feelings fade.','De Graaf et al., 2004, Am J Clin Nutr'],
 ['chair','Stay upright for 2–3 hours','Lying down soon after eating raises reflux risk and can disturb sleep.','Fujiwara et al., 2005, Am J Gastroenterol'],
];
// ---------- After a meal: one focused pop-up — a brisk 10-minute walk ----------
// Shows once per logged meal (today only), waits its turn in the pop-up queue (popups.js) and can be turned off in
// Settings › Reminders. Water quick-add lives on the Nutrition screen's water bar, so this stays about the walk.
S.notif.walkPop??=true;
const WALK_NID=2100;let walkLast=null,walkT=null;
function afterMeal(name,k){if(viewDate!==today()||S.notif.walkPop===false)return;
 const d=today(),f=dayFood(d);if(!f.length)return;
 const key=`${f.length-1}#${f.at(-1)[0]}`;if(S.walkSeen?.d!==d)S.walkSeen={d,k:[]};
 if(S.walkSeen.k.includes(key))return;S.walkSeen.k.push(key);save();
 walkLast={name,k};Pop.show('walk',walkPop)}
function walkPop(){const m=walkLast;walkLast=null;if(!m||S.notif.walkPop===false||(typeof RUN!=='undefined'&&RUN))return;
 const [,,why,src]=POSTMEAL[0];
 openSheet(`<div class="wp" role="dialog" aria-label="After-meal walk"><div class="t-caption">${m.k.toLocaleString()} kcal logged</div><h3 class="t-title" style="margin:4px 0 var(--s1)">Nice — ${esc(m.name)} logged</h3>
 <p class="t-body">A brisk 10-minute walk now blunts the blood-sugar spike from this meal.</p>
 <p class="t-caption" style="margin-top:6px">${why} <span style="color:var(--ink-3)">${src}</span></p>
 <div class="wp-acts"><button class="btn wp-start" onclick="walkStart()">${ic('walk')} Start walk</button><button class="btn sec2 wp-later" onclick="walkLater()">Remind me in 10 min</button></div>
 <div class="wp-foot"><button class="aflink wp-dismiss" onclick="closeSheet()">Dismiss</button><button class="aflink wp-off" onclick="walkPopOff()">Don't show these</button></div></div>`)}
function walkStart(){closeSheet();startRun('walk')}
function walkPopOff(){S.notif.walkPop=false;save();closeSheet();toast('After-meal walk pop-ups off — turn them back on in Settings › Reminders')}
// "Remind me in 10 min": a local notification (works with the app closed) + an in-app timer while it's open.
async function schedWalkRemind(){const L=LN(),R=S.walkRemind;if(!L||!R||R.at<=Date.now())return;
 try{const p=await L.checkPermissions();if(p.display!=='granted'&&(await L.requestPermissions()).display!=='granted')return;
  await L.schedule({notifications:[{id:WALK_NID,title:'Time for your walk',body:'A brisk 10 minutes now blunts the blood-sugar spike from your meal.',schedule:{at:new Date(R.at),allowWhileIdle:true},extra:{go:'meals',walk:true}}]})}catch(e){console.warn('walk-notif',e)}}
function walkTimer(){clearTimeout(walkT);walkT=null;const R=S.walkRemind;if(R&&R.at>Date.now())walkT=setTimeout(walkDue,R.at-Date.now())}
function walkLater(){closeSheet();S.walkRemind={at:Date.now()+600000,id:WALK_NID};save();schedWalkRemind();walkTimer();toast('We\'ll remind you in 10 minutes')}
function walkDue(){const R=S.walkRemind;if(!R)return;
 if(document.visibilityState==='hidden')return; // app in the background:the notification takes over
 S.walkRemind=null;save();try{LN()?.cancel({notifications:[{id:R.id}]})}catch(e){}
 Pop.show('walkdue',()=>openSheet(`<div class="wp" role="dialog" aria-label="Walk reminder"><h3 class="t-title" style="margin-bottom:var(--s1)">Time for your 10-minute walk</h3>
 <p class="t-body">A brisk walk now still blunts the blood-sugar spike from your meal.</p>
 <div class="wp-acts"><button class="btn wp-start" onclick="walkStart()">${ic('walk')} Start walk</button></div>
 <div class="wp-foot"><button class="aflink wp-dismiss" onclick="closeSheet()">Dismiss</button></div></div>`))}
// Coming back to the app after the reminder already fired as a notification: don't show it twice.
document.addEventListener('visibilitychange',()=>{const R=S.walkRemind;if(document.visibilityState!=='visible'||!R)return;if(R.at<=Date.now()){S.walkRemind=null;save()}else walkTimer()});
if(S.walkRemind&&S.walkRemind.at<=Date.now())S.walkRemind=null;walkTimer();
// (Tapping the notification opens the Nutrition tab through smart.js's single deep-link listener: extra.go='meals'.)
// Full reschedules cancel every pending notification — put a pending walk reminder back afterwards.
const _snWalk=schedNotifs;schedNotifs=async function(){await _snWalk();await schedWalkRemind()};
document.head.insertAdjacentHTML('beforeend',`<style>
.wp .wp-acts{display:flex;flex-direction:column;gap:var(--s1);margin-top:var(--s3)}.wp .wp-start{display:flex;align-items:center;justify-content:center;gap:8px}
.wp .wp-foot{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:var(--s1);margin-top:var(--s1)}.wp .wp-off{color:var(--ink-2);text-decoration:none}
</style>`);
// Settings › Reminders: the after-meal walk pop-up toggle
const _vnWalk=V.notifs;V.notifs=()=>_vnWalk()+`<div class="sec">In the app</div><div class="list"><div class="row" id="walkpop-row" onclick="S.notif.walkPop=!S.notif.walkPop;save();render()"><span style="font-size:22px">🚶</span><div class="rbody"><b>After-meal walk pop-up</b><small>After you log a meal: start a brisk 10-minute walk, or get reminded in 10 min</small></div><span class="chip" style="background:${S.notif.walkPop?'var(--good)':'var(--fill)'};color:${S.notif.walkPop?'var(--on-accent)':'inherit'}">${S.notif.walkPop?'ON':'OFF'}</span></div></div>`;
const _af17=addFood;addFood=function(){const n=$('#fn')?.value.trim(),before=dayFood(viewDate).length;_af17();const f=dayFood(viewDate);if(f.length>before&&viewDate===today()){const x=f.at(-1);setTimeout(()=>afterMeal(x[0],x[1]),350)}};
// Water lives on the Nutrition screen too (slim bar + quick add), right under protein
const _meals17=V.meals;V.meals=()=>{const t=targets(),w=S.water[viewDate]||0;
 return _meals17().replace('<div class="qa">',`<div style="margin-top:var(--s2)"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><span class="t-label">Water</span><span class="t-label muted num">${w.toLocaleString()} / ${t.water.toLocaleString()} ml <button onclick="addWater(250)" style="margin-left:8px;border:1px solid var(--line);background:var(--surface);border-radius:var(--r-pill);padding:3px 10px;font-weight:600;color:var(--ink)">+250</button></span></div><div class="bar"><i style="width:${Math.min(100,w/t.water*100)}%;background:var(--ink)"></i></div></div><div class="qa">`)};

// ---------- License / terms of use ----------
V.license=()=>`<div class="top">${backBtn()}<h1>License</h1><span></span></div>
 <div class="t-title" style="margin-top:var(--s1)">Free to use. Not for profit.</div>
 <p class="t-body muted" style="margin-top:var(--s1)">RepWise is free for everyone, forever. You may not make money from it.</p>
 <div class="hdr">You can</div>
 <div class="plist"><div class="li"><span>${ic('check')}</span><div><b>Use it for free</b><small>Every feature, no ads, no subscription.</small></div></div>
 <div class="li"><span>${ic('check')}</span><div><b>Share it</b><small>Give the app or its code to friends, gyms, schools, clubs.</small></div></div>
 <div class="li"><span>${ic('check')}</span><div><b>Read and change the code</b><small>Study it, modify it, build on it for personal or non-profit use.</small></div></div></div>
 <div class="hdr">You can't</div>
 <div class="plist"><div class="li"><span>${ic('x')}</span><div><b>Sell it</b><small>Or sell copies, modified versions or parts of the code.</small></div></div>
 <div class="li"><span>${ic('x')}</span><div><b>Charge for it</b><small>No paywalls, subscriptions or paid features built on RepWise.</small></div></div>
 <div class="li"><span>${ic('x')}</span><div><b>Monetize it</b><small>No ads, sponsorships or using it in a paid product or service.</small></div></div></div>
 <p class="t-caption" style="margin-top:var(--s3)">Licensed under the PolyForm Noncommercial License 1.0.0. If you share or modify RepWise, keep this notice and credit the original. Want to use it commercially? Ask for permission first.</p>
 <p class="t-caption" style="margin-top:var(--s1)">© 2026 Charles Andrei Galvan · RepWise</p>
 <div style="height:var(--s4)"></div>`;
const _set18=V.settings;V.settings=()=>_set18().replace(/(<div class="row" onclick="push\('transfer'\)">)/,`<div class="row" onclick="push('license')"><span style="font-size:22px">📜</span><div class="rbody"><b>License</b><small>Free to use · not for profit</small></div><span class="chev">›</span></div>$1`);

// ---------- Redo plan: a way out ----------
function exitOB(){const changed=JSON.stringify(OB.d)!==OB.snap;if(changed&&!confirm('Leave without saving? Your current plan stays the same.'))return;OB.active=false;OB.step=0;OB.d={};clearInterval(slT);slT=null;render('pop');toast('Plan unchanged')}
const _sob19=startOB;startOB=function(){_sob19();OB.snap=JSON.stringify(OB.d)};
const _onb19=V.onboard;V.onboard=()=>{let h=_onb19();if(!S.profile||OB.step>=OBSTEPS.length)return h;
 return h.replace(/(<span class="muted" style="flex:none">\d+\/\d+<\/span>)/,`$1<button class="iconbtn" style="flex:none;margin-left:6px" aria-label="Exit without saving" onclick="exitOB()">${ic('x')}</button>`)};

// ---------- Food logging with full macros ----------
// [kcal, protein, carbs, fat, fiber] per serving (USDA FoodData Central / PH FCT typical values)
const FOODMAC={
 'Rice, white (1 cup cooked)':[205,4,45,0.4,0.6],'Rice, brown (1 cup cooked)':[218,5,46,1.6,3.5],'Oats (½ cup dry)':[150,5,27,2.5,4],'Bread slice, white':[80,3,15,1,0.8],'Bread slice, whole wheat':[80,4,14,1,2],
 'Sweet potato / kamote (medium)':[110,2,26,0.1,4],'Potato with skin (medium)':[160,4,37,0.2,4],'Pandesal (1 pc)':[90,3,17,1,0.6],
 'Chicken breast (100 g)':[165,31,0,3.6,0],'Egg (1 large)':[72,6,0.4,5,0],'Tuna can (in water)':[120,26,0,1,0],'Beef, lean (100 g)':[250,26,0,15,0],'Pork adobo (1 cup)':[450,30,6,34,0.5],
 'Bangus / milkfish (100 g)':[190,26,0,9,0],'Galunggong (100 g)':[150,22,0,6,0],'Sardines in tomato (1 can)':[200,20,4,11,0],'Tofu (100 g)':[145,16,3,9,2],'Monggo, cooked (1 cup)':[210,14,38,1,15],
 'Whey scoop':[120,24,3,1.5,0],'Greek yogurt (170 g)':[100,17,6,0.7,0],'Milk (1 cup)':[150,8,12,8,0],'Peanut butter (1 tbsp)':[95,4,3,8,1],'Almonds (28 g)':[165,6,6,14,3.5],
 'Banana':[105,1.3,27,0.4,3],'Apple (medium)':[95,0.5,25,0.3,4.4],'Orange':[62,1.2,15,0.2,3],'Mango (1 cup)':[100,1.4,25,0.6,2.6],'Guava / bayabas':[37,1.4,8,0.5,3],'Papaya (1 cup)':[62,0.7,16,0.4,2.5],
 'Broccoli (1 cup)':[31,2.5,6,0.3,2.4],'Malunggay leaves (1 cup)':[19,2,3,0.4,0.6],'Pechay / bok choy (1 cup cooked)':[20,2.7,3,0.3,1.7],'Mixed salad (2 cups)':[20,1.5,4,0.2,2],'Avocado (½)':[160,2,9,15,7],
 'Olive oil (1 tbsp)':[120,0,0,14,0],'Green tea (1 cup)':[2,0,0,0,0],'Coffee, black':[2,0.3,0,0,0],'Softdrink (330 ml)':[140,0,39,0,0]};
Object.keys(FOODS).forEach(k=>{if(!Object.keys(FOODMAC).some(x=>x.toLowerCase().startsWith(k.toLowerCase().split(' (')[0])))FOODMAC[k]=[FOODS[k][0],FOODS[k][1],null,null,null]});
foodSheet=function(pre={}){openSheet(`<h3 class="t-title" style="margin-bottom:var(--s2)">Add food</h3>
 <select id="fq" onchange="pickFood(this.value)"><option value="">Quick pick (fills everything)…</option>${Object.keys(FOODMAC).sort().map(x=>`<option>${x}</option>`).join('')}</select>
 <input id="fn" placeholder="Food name" value="${esc(pre.name||'')}">
 <div class="flex"><div style="flex:2"><small class="t-caption">Calories</small><input id="fk" type="number" inputmode="decimal" placeholder="kcal" oninput="updCook()" value="${pre.kcal??''}"></div><div style="flex:1"><small class="t-caption">Servings</small><input id="fx" type="number" step="0.5" value="1" oninput="updCook()"></div></div>
 <div class="flex"><div style="flex:1"><small class="t-caption">Protein g</small><input id="fp" type="number" inputmode="decimal" value="${pre.protein??''}"></div><div style="flex:1"><small class="t-caption">Carbs g</small><input id="fc2" type="number" inputmode="decimal" placeholder="optional"></div><div style="flex:1"><small class="t-caption">Fat g</small><input id="ff" type="number" inputmode="decimal" placeholder="optional"></div><div style="flex:1"><small class="t-caption">Fiber g</small><input id="ffb" type="number" inputmode="decimal" placeholder="optional"></div></div>
 <small class="t-caption">How was it cooked?</small><select id="fc" onchange="updCook()">${COOK.map(([n,m],i)=>`<option value="${i}">${n}${m>1?` (+${Math.round((m-1)*100)}%)`:''}</option>`).join('')}</select>
 <p class="t-caption" id="fcv" style="margin:6px 0 0"></p>
 <p class="t-caption" style="margin-top:6px">Only name and calories are required. Macros are per serving.</p>
 <button class="btn" style="margin-top:var(--s2)" onclick="addFood()">Add</button>`);updCook()};
function pickFood(n){const v=FOODMAC[n];if(!v)return;$('#fn').value=n;$('#fk').value=v[0];$('#fp').value=v[1];$('#fc2').value=v[2]??'';$('#ff').value=v[3]??'';$('#ffb').value=v[4]??'';updCook()}
addFood=function(){const n=$('#fn').value.trim(),x=+$('#fx').value||1,c=COOK[+$('#fc').value],base=(+$('#fk').value||0)*x,k=Math.round(base*c[1]),num=id=>$(id).value===''?null:+$(id).value*x;
 if(!n||!k)return toast('Enter name and calories');if(!fastOK())return;
 const p=Math.round(num('#fp')||0),cb=num('#fc2'),ft0=num('#ff'),fb=num('#ffb'),oil=(k-base)/9,ft=ft0==null?(c[1]>1?oil:null):ft0+oil;
 const nm=(x!==1?`${n} ×${x}`:n)+(c[1]>1?` (${c[0].split(' ')[0].toLowerCase()})`:''),r1=v=>v==null?null:Math.round(v*10)/10;
 (S.food[viewDate]??=[]).push([nm,k,p,r1(cb),r1(ft),r1(fb)]);save();closeSheet();render();xpFly(`+${k} kcal`);if(viewDate===today())setTimeout(()=>afterMeal(nm,k),350)};
// Nutrition screen: show carbs/fat/fiber eaten when macros are logged, and per-item macros in the list
const msum=(f,i)=>f.reduce((s,x)=>s+(x[i]||0),0);
const _meals20=V.meals;V.meals=()=>{const f=dayFood(viewDate),m=macroT();let h=_meals20();
 if(f.some(x=>x[3]!=null||x[4]!=null))h=h.replace('<div style="margin-top:var(--s2)"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><span class="t-label">Water',`<div class="t-caption num" style="margin-top:var(--s1);display:flex;justify-content:space-between"><span>Carbs ${Math.round(msum(f,3))}/${m.carb} g</span><span>Fat ${Math.round(msum(f,4))}/${m.fat} g</span><span>Fiber ${Math.round(msum(f,5))}/${m.fiber} g</span></div><div style="margin-top:var(--s2)"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><span class="t-label">Water`);
 f.forEach(x=>{if(x[3]!=null||x[4]!=null)h=h.replace(`<b>${escT(x[0])}</b><small>${x[2]} g protein</small>`,`<b>${escT(x[0])}</b><small>P ${x[2]} · C ${x[3]??'–'} · F ${x[4]??'–'}${x[5]?` · fiber ${x[5]}`:''} g</small>`)});return h};

// ---------- Popular "extras": what the science actually says ----------
const EXTRAS=[
 ['Green tea','Works, small effect','Catechins (EGCG) + caffeine raise fat burning slightly — roughly 70–100 kcal/day, and less if you already drink coffee. Good swap for sugary drinks.','Hursel et al., 2009, Int J Obes'],
 ['Apple cider vinegar','Works, small effect','1–2 tbsp diluted in water before a carb-heavy meal can lower the blood-sugar rise and help fullness. Weight loss is small (~1–2 kg over 12 weeks). Always dilute — it erodes teeth and irritates the throat.','Johnston et al., 2004, Diabetes Care; Kondo et al., 2009, Biosci Biotechnol Biochem'],
 ['Black coffee','Works','Caffeine improves training performance and blunts appetite for a few hours. Skip after 2 pm to protect sleep.','Grgic et al., 2019, Br J Sports Med'],
 ['Chia & flax seeds','Works','Fiber and omega-3 (ALA). 1–2 tbsp adds 5–10 g fiber and keeps you full.','Ullah et al., 2016, J Food Sci Technol'],
 ['Cinnamon','Mixed','Some studies show slightly lower fasting blood sugar, others none. Fine as flavor, not as treatment.','Allen et al., 2013, Ann Fam Med'],
 ['Lemon water','Myth (as a fat burner)','No detox or fat-burning effect — but it\'s hydration with flavor and a little vitamin C, so it\'s still a good habit.','No supporting trials'],
 ['Detox teas & cleanses','Myth','Your liver and kidneys already detox. Most "detox" teas are laxatives — weight lost is water and comes right back.','Klein & Kiat, 2015, J Hum Nutr Diet'],
];
const _nut20=V.nutrition;V.nutrition=()=>_nut20().replace('<div class="sec">❤️ Heart-health plate</div>',`<div class="hdr">Green tea, vinegar & co.</div><p class="t-caption" style="margin-bottom:var(--s1)">Popular extras, checked against the research. None replace a calorie deficit — they help a little at the edges.</p>
 <div class="plist">${EXTRAS.map(([n,v,b,s])=>`<details class="li" style="display:block"><summary style="display:flex;justify-content:space-between;align-items:center;list-style:none;cursor:pointer"><b>${n}</b><span class="t-caption" style="color:${v.startsWith('Myth')?'var(--accent)':v==='Mixed'?'var(--ink-2)':'var(--ok)'};font-weight:600">${v}</span></summary><small style="display:block;margin-top:6px">${b} <span style="color:var(--ink-3)">${s}</span></small></details>`).join('')}</div>
 <div class="sec">❤️ Heart-health plate</div>`);

// ---------- More Filipino foods + clearer oats ----------
delete FOODMAC['Oats (½ cup dry)'];delete FOODMAC['Oats (1/2 cup dry)'];
Object.assign(FOODMAC,{
 'Oats, rolled / old-fashioned (½ cup dry)':[150,5,27,2.5,4],'Oats, steel-cut (¼ cup dry)':[170,6,29,3,5],'Oats, instant flavored packet':[160,4,32,2,3],
 'Sinangag / garlic rice (1 cup)':[290,5,48,8,0.8],'Lugaw / arroz caldo (1 bowl)':[250,12,38,5,1],'Champorado (1 bowl)':[320,6,60,7,3],'Puto (1 pc)':[90,2,18,1,0.3],'Suman (1 pc)':[180,3,38,2,1],
 'Chicken adobo (1 cup)':[380,32,5,25,0.3],'Chicken tinola (1 bowl)':[220,25,8,9,1.5],'Sinigang na baboy (1 bowl)':[300,22,10,19,2],'Sinigang na hipon (1 bowl)':[180,20,10,6,2],'Nilagang baka (1 bowl)':[350,30,12,20,2],
 'Bulalo (1 bowl)':[480,35,10,34,1.5],'Kare-kare (1 cup)':[480,30,12,35,3],'Bicol express (1 cup)':[520,22,8,45,2],'Lechon kawali (100 g)':[500,25,0,44,0],'Crispy pata (100 g)':[540,24,0,48,0],
 'Sisig (1 cup)':[450,25,6,36,0.5],'Tapa (100 g)':[230,25,5,12,0],'Tocino (100 g)':[330,18,25,18,0],'Longganisa (2 pcs)':[280,12,10,21,0],'Fried chicken (1 thigh)':[310,23,9,20,0.4],
 'Inihaw na liempo (100 g)':[450,22,0,40,0],'Chicken inasal (1 leg quarter)':[350,32,3,23,0],'Inihaw na bangus (½ fish)':[300,38,0,16,0],'Daing na bangus (½ fish)':[330,36,0,20,0],'Tuyo (3 pcs)':[150,24,0,6,0],
 'Pinakbet (1 cup)':[150,6,14,8,4],'Ginisang monggo (1 cup)':[240,15,30,7,10],'Laing (1 cup)':[300,6,12,26,6],'Chopsuey (1 cup)':[180,12,14,9,4],'Ginataang kalabasa (1 cup)':[220,5,20,14,4],'Ensaladang talong (1 cup)':[90,2,10,5,4],
 'Pancit canton (1 cup)':[350,12,48,12,2],'Pancit bihon (1 cup)':[300,10,52,6,1.5],'Spaghetti, Filipino style (1 cup)':[400,14,56,13,2],'Lumpiang shanghai (5 pcs)':[300,12,20,19,1],'Lumpiang sariwa (1 pc)':[180,6,24,7,3],
 'Siopao asado (1 pc)':[330,12,50,9,2],'Siomai (4 pcs)':[200,12,12,11,0.5],'Turon (1 pc)':[220,2,36,8,2],'Banana cue (1 stick)':[270,1.5,52,8,3],'Kamote cue (1 stick)':[250,2,46,8,4],
 'Halo-halo (1 glass)':[400,7,78,8,3],'Taho (1 cup)':[200,8,36,3,1],'Balut (1 pc)':[190,14,2,14,0],'Kwek-kwek (5 pcs)':[300,12,20,19,0.5],'Fishball (10 pcs)':[180,8,22,7,0.5],
 'Saging na saba, boiled (1 pc)':[110,1,29,0.3,2.3],'Mais / boiled corn (1 cob)':[150,5,32,2,4],'Kalamansi juice (1 glass, sweetened)':[100,0.2,26,0,0.3],'Buko juice (1 glass)':[45,1.7,9,0.5,2.6]});
CARBS.splice(0,1,['Rolled or steel-cut oats','🥣','The healthy kinds — 4–5 g fiber per serving and slow energy. Skip sugary instant flavored packets.']);

// ---------- Confirm before deleting a meal ----------
function delFood(i){const x=dayFood(viewDate)[i];if(!x)return;if(!confirm(`Delete "${x[0]}" (${x[1]} kcal)?\n\nThis can't be undone.`))return;S.food[viewDate].splice(i,1);save();render();toast('Meal deleted')}
const _meals21=V.meals;V.meals=()=>_meals21().replace(/onclick="S\.food\[viewDate\]\.splice\((\d+),1\);save\(\);render\(\)"/g,'onclick="delFood($1)"');

// ---------- Fasting: eating outside the window restarts the fast; 3rd break this week gets a firm nudge ----------
const _fs21=fastState;fastState=function(now=new Date()){const R=S.fast.reset,w=fastWin();if(R){const h=(now-R)/36e5;if(h<w.h)return{open:false,left:w.h-h,restarted:true};if(h<w.h+w.eat)return{open:true,left:w.h+w.eat-h,restarted:true};delete S.fast.reset;save()}return _fs21(now)};
fastOK=function(){if(!S.fast.on||viewDate!==today())return true;const s=fastState();if(s.open)return true;
 const w=fastWin(),hin=Math.max(0,w.h-s.left),wk=(S.fastLog||[]).filter(x=>x[0]>Date.now()-7*864e5).length+1;
 if(!confirm(`Your eating window isn't open yet (${S.fast.proto}). You're ${dur(hin)} into your fast.\n\nIf you eat now, your fast restarts from this meal.\n\nEat anyway?`))return false;
 S.fastLog??=[];S.fastLog.push([Date.now(),+hin.toFixed(1)]);S.fast.reset=Date.now();save();
 const next=new Date(Date.now()+w.h*36e5);
 setTimeout(()=>openSheet(wk>=3?`<h3 class="t-title" style="color:var(--accent)">This is the ${wk===3?'third':wk+'th'} time this week</h3><p class="t-body" style="margin:var(--s1) 0 var(--s2)">You ate outside your eating window ${wk} times in 7 days. Please stop — or switch to an easier window you can actually keep. Consistency beats a hard plan you keep breaking.</p>
  <div class="plist"><div class="li"><div><b>Fast restarted</b><small>Next eating window opens ${next.toLocaleTimeString([],{weekday:'short',hour:'numeric',minute:'2-digit'})}.</small></div></div></div>
  <button class="btn" style="margin-top:var(--s3)" onclick="closeSheet();push('fasting')">Pick an easier window</button><div class="t-label" style="text-align:center;margin-top:var(--s2);cursor:pointer" onclick="closeSheet()">I'll stick with it</div>`
 :`<h3 class="t-title">Fast restarted</h3><p class="t-caption" style="margin-top:4px">You were ${dur(hin)} into a ${w.h} h fast. Break ${wk} of 3 this week.</p>
  <div class="plist" style="margin-top:var(--s2)"><div class="li"><div><b>What happens now</b><small>Eating raises blood sugar and insulin, which pauses fat release and ketone production for a few hours.</small></div></div>
  <div class="li"><div><b>Your new window</b><small>Next eating window opens ${next.toLocaleTimeString([],{weekday:'short',hour:'numeric',minute:'2-digit'})}, then your normal schedule resumes.</small></div></div>
  <div class="li"><div><b>Not a failure</b><small>Total calories matter most for fat loss. Make this meal protein-rich. <span style="color:var(--ink-3)">Lowe et al., 2020, JAMA Intern Med</span></small></div></div></div>
  <div class="t-label" style="text-align:center;margin-top:var(--s3);cursor:pointer" onclick="closeSheet()">OK</div>`),400);
 return true};

// ---------- Fasting break: one combined sheet + notifications follow the restarted fast ----------
let _fb=null;
fastOK=function(){if(!S.fast.on||viewDate!==today())return true;const s=fastState();if(s.open)return true;
 const w=fastWin(),hin=Math.max(0,w.h-s.left),wk=(S.fastLog||[]).filter(x=>x[0]>Date.now()-7*864e5).length+1;
 if(!confirm(`Your eating window isn't open yet (${S.fast.proto}). You're ${dur(hin)} into your fast.\n\nIf you eat now, your fast restarts from this meal.\n\nEat anyway?`))return false;
 S.fastLog??=[];S.fastLog.push([Date.now(),+hin.toFixed(1)]);S.fast.reset=Date.now();save();_fb={wk,hin,h:w.h,next:new Date(Date.now()+w.h*36e5)};schedNotifs();return true};
function fastBreakBlock(){if(!_fb)return'';const {wk,hin,h,next}=_fb,nt=next.toLocaleTimeString([],{weekday:'short',hour:'numeric',minute:'2-digit'});_fb=null;
 return wk>=3?`<div style="border-left:3px solid var(--accent);padding:2px 0 2px var(--s2);margin-bottom:var(--s3)"><div class="t-title" style="color:var(--accent)">This is the ${wk===3?'third':wk+'th'} time this week</div><p class="t-label" style="margin:6px 0">You ate outside your eating window ${wk} times in 7 days. Please stop — or switch to an easier window you can actually keep.</p><div class="t-caption">Fast restarted · next window opens ${nt}</div><button class="btn sec2" style="margin-top:var(--s2);padding:10px" onclick="closeSheet();push('fasting')">Pick an easier window</button></div>`
 :`<div style="border-left:3px solid var(--ink);padding:2px 0 2px var(--s2);margin-bottom:var(--s3)"><div class="t-label">Fast restarted · break ${wk} of 3 this week</div><div class="t-caption" style="margin-top:4px">You were ${dur(hin)} into a ${h} h fast. Next eating window opens ${nt}, then your normal schedule resumes. Total calories still matter most — not a failure.</div></div>`}
// A fasting note replaces the after-meal walk pop-up for that meal (one pop-up per meal, through the queue).
const _am22=afterMeal;afterMeal=function(name,k){const top=fastBreakBlock();if(!top)return _am22(name,k);Pop.show('fast',()=>openSheet(`${top}<button class="btn sec2" onclick="closeSheet()">OK</button>`))};
// notifications: replace today's scheduled fasting reminders with ones based on the restarted fast
const _sn22=schedNotifs;schedNotifs=async function(){await _sn22();const L=LN(),R=S.fast.reset;if(!L||!R||!S.fast.on||!S.notif.fast)return;
 try{const w=fastWin(),open=new Date(R+w.h*36e5),close=new Date(open.getTime()+w.eat*36e5),end=close.getTime()+36e5;
  const pend=(await L.getPending()).notifications,ids=new Set([...Array(7)].flatMap((_,d)=>[1000+d*20,1001+d*20,1002+d*20]));
  const drop=pend.filter(n=>ids.has(n.id)&&new Date(n.schedule?.at||0).getTime()<=end).map(n=>({id:n.id}));if(drop.length)await L.cancel({notifications:drop});
  const N=[[1900,open,'Eating window open',`Your fast restarted after your last meal. Window open until ${close.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})}.`,'meals'],[1901,new Date(close-36e5),'1 hour left to eat','Get your protein in before the window closes.','meals'],[1902,close,'Fast started','Back on your normal schedule after this fast. Water, black coffee & plain tea are fine.','fasting']]
   .filter(x=>x[1]>new Date()).map(([id,at,title,body,go])=>({id,title,body,schedule:{at,allowWhileIdle:true},extra:{go}}));
  if(N.length)await L.schedule({notifications:N})}catch(e){console.warn('notif-reset',e)}};

// ---------- Nutrition hero: secondary macros + vitamins eaten today ----------
document.head.insertAdjacentHTML('beforeend',`<style>
.mac{display:grid;grid-template-columns:repeat(3,1fr);gap:var(--s2);margin-top:var(--s2)}
.mac .t-caption{display:flex;justify-content:space-between}.mac .bar{height:3px;margin-top:5px}.mac .bar>i{background:var(--ink-2)}
.vit{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}.vit span{font-size:var(--fs-caption);font-weight:600;color:var(--ink);background:var(--fill);border-radius:var(--r-pill);padding:4px 10px}
</style>`);
const _meals23=V.meals;V.meals=()=>{let h=_meals23();const f=dayFood(viewDate),m=macroT(),names=f.map(x=>x[0]).join(' ');
 h=h.replace(/<div class="t-caption num" style="margin-top:var\(--s1\);display:flex;justify-content:space-between"><span>Carbs[\s\S]*?<\/div>(?=<div style="margin-top:var\(--s2\)"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><span class="t-label">Water)/,'');
 const mac=(l,v,t)=>`<div><div class="t-caption"><span>${l}</span><span class="num">${Math.round(v)}/${t} g</span></div><div class="bar"><i style="width:${Math.min(100,v/t*100)}%"></i></div></div>`;
 const VM=MICROS.filter(x=>x[0]!=='Fiber'),got=VM.filter(x=>x[7].test(names)).map(x=>x[0]);
 const vit=f.length?`<div style="margin-top:var(--s2)"><div class="t-caption" style="display:flex;justify-content:space-between"><span>Vitamins & minerals today</span><span style="color:var(--ink);font-weight:600;cursor:pointer" onclick="push('nutrition')">${got.length}/${VM.length} · see missing</span></div>${got.length?`<div class="vit">${got.map(n=>`<span>${n}</span>`).join('')}</div>`:`<div class="t-caption" style="margin-top:4px;color:var(--ink-3)">None detected yet — add fruit, vegetables or fish.</div>`}</div>`:'';
 return h.replace('<div style="margin-top:var(--s2)"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><span class="t-label">Water',`<div class="mac">${mac('Carbs',msum(f,3),m.carb)}${mac('Fat',msum(f,4),m.fat)}${mac('Fiber',msum(f,5),m.fiber)}</div>${vit}<div style="margin-top:var(--s2)"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><span class="t-label">Water`)};
