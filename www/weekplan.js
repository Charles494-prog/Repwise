// RepWise week plan layer: a stored day-by-day plan, smart rescheduling when you train something else
// (or miss a day), a change log with undo / edit, and weekly muscle-balance warnings.
// The rules live in schedule.js (RWPlan, unit-tested); this file wires them to the app.
const RP=window.RWPlan;
S.balance={...RP.DEFAULTS,...(S.balance||{})};
S.planFrom??=today(); // days before this update are never rescheduled
const musc=k=>(PROGS[k]?.m||[]).filter(m=>MUSCLES.includes(m));
const progName=k=>(PROGS[k]||PROGS.free).name;
const shortName=k=>progName(k).replace(/^Leg Day$/,'Legs').replace(/ (Day|Body|Workout)$/,'');
const dayIdx7=d=>Math.round((new Date(d+'T12:00')-new Date(S.week.mon+'T12:00'))/864e5);
const trainedIn=w=>RP.trained(w.sets,EX,S.balance.thr);
// a workout made up for a missed day if it trained most of that day's muscles
function madeUp(w,prog){const m=musc(prog),t=trainedIn(w);return m.length>0&&m.filter(x=>t.includes(x)).length>=Math.ceil(m.length/2)}
const dayWorkouts=d=>S.workouts.filter(w=>iso(w.ts)===d&&(w.sets||[]).length);

// ================= STORED DAYS =================
const _bwP=buildWeek;buildWeek=function(mon,split){const W=_bwP(mon,split);let q=0;W.days=W.pat.map(v=>v?{prog:W.queue[q++],st:'planned'}:null);W.log=[];W.pending=[];return W};
// Weeks made before this update: keep what's done, give the remaining training days the remaining sessions in order.
function deriveDays(W){const left=[...W.queue],days=W.pat.map(()=>null);
 W.pat.forEach((v,i)=>{if(!v)return;const d=iso(dayOfWeek(i)),w=S.workouts.find(x=>iso(x.ts)===d&&left.includes(x.prog));if(w){days[i]={prog:w.prog,st:'planned'};left.splice(left.indexOf(w.prog),1)}});
 W.pat.forEach((v,i)=>{if(v&&!days[i]&&left.length)days[i]={prog:left.shift(),st:'planned'}});W.days=days;W.log??=[];W.pending??=[]}
const _ewP=ensureWeek;ensureWeek=function(){const W=_ewP();if(!W.days){deriveDays(W);save()}W.log??=[];W.pending??=[];if(!ensureWeek.busy){ensureWeek.busy=1;try{autoMissed(W)}finally{ensureWeek.busy=0}}return W};
// History for recovery checks: last 8 days of workouts as {day relative to this Monday, muscles}.
function planHistory(exceptTs){const from=iso(new Date(S.week.mon+'T12:00').getTime()-8*864e5);return S.workouts.filter(w=>w.ts!==exceptTs&&iso(w.ts)>=from).map(w=>({day:dayIdx7(iso(w.ts)),muscles:trainedIn(w)}))}

// Planned days that passed with no workout move to the next day that fits (once per day).
function autoMissed(W){const ti=DOW(Date.now());let changed=false;
 W.seen??={};for(let i=0;i<ti;i++){const x=W.days[i],d=iso(dayOfWeek(i));if(W.seen[i]||!RP.active(x)||d<S.planFrom||(S.startDate&&d<S.startDate)||dayWorkouts(d).length||S.missed?.[d])continue;W.seen[i]=1;
  const before=JSON.stringify(W.days),r=RP.missed({days:W.days,di:i,after:slotDone(ti)?ti:ti-1,history:planHistory(),musc,recoveryH:S.balance.recoveryH});
  W.days=r.days;logChange(W,before,r.changes,`Missed ${WD[i]}`);changed=true}
 if(changed)save()}

// ================= WHAT IS PLANNED / DONE =================
weekWorkouts=()=>S.workouts.filter(w=>iso(w.ts)>=S.week.mon&&(w.sets||[]).length);
const slotDone=i=>dayWorkouts(iso(dayOfWeek(i))).length>0;
doneCount=()=>{const W=S.week;let n=0;W.days.forEach((x,i)=>{if(x&&(x.st==='covered'||(x.st!=='skipped'&&slotDone(i))))n++});return Math.min(W.n,n+W.days.filter((x,i)=>(!x||x.st==='skipped')&&slotDone(i)).length)};
weekDone=()=>doneCount()>=S.week.n;
const nextWeek=()=>buildWeek(iso(new Date(S.week.mon+'T12:00').getTime()+7*864e5),SPLITS[S.nextSplit]?S.nextSplit:S.split);
const _ctP=cardioToday;cardioToday=(d=today())=>S.week&&d>=S.week.mon&&dayIdx7(d)>=7?nextWeek().cardio.includes(DOW(d+'T12:00')):_ctP(d);
dayPlan=function(d=today()){const W=ensureWeek(),i=DOW(d+'T12:00'),wk=dayWorkouts(d);
 if(d<W.mon)return{type:'past'};
 if(dayIdx7(d)>=7){const x=nextWeek().days[i];return x?{type:'workout',prog:x.prog,done:false,drop:[]}:{type:'rest',why:'rest'}}
 if(wk.length)return{type:'workout',prog:wk[0].prog,done:true};
 if(d===today()&&weekDone())return{type:'rest',why:'week'};
 const x=W.days[i];if(!x)return{type:'rest',why:'rest'};
 if(x.st==='covered')return{type:'rest',why:'covered',prog:x.prog};
 if(x.st==='skipped'){const to=W.days.findIndex(y=>y?.st==='moved'&&y.from===i);return to>=0?{type:'rest',why:'moved',to}:x.missed&&d<today()?{type:'missed'}:{type:'rest',why:'skipped'}}
 if(d<today())return{type:'missed'};
 return{type:'workout',prog:x.prog,done:false,drop:x.drop||[]}};
todaysProg=function(){const p=dayPlan();if(p.prog&&p.type==='workout')return p.prog;const W=ensureWeek(),ti=DOW(Date.now()),n=W.days.find((x,i)=>i>=ti&&RP.active(x));return n?.prog||W.queue[0]};

// Starting the planned workout leaves out exercises for muscles already trained earlier this week.
const _swDrop=startW;startW=function(k){_swDrop(k);const a=S.active,p=dayPlan();if(!a||p.type!=='workout'||p.prog!==k||!p.drop?.length)return;
 const keep=a.list.filter(e=>!(EX[e]&&EX[e][0].every(m=>p.drop.includes(m))));if(keep.length&&keep.length<a.list.length){a.list=keep;a.planned=keep.length;a.idx=0;save();render();toast(`Left out ${p.drop.join(' & ')} — already trained this week`)}};

// ================= AFTER A WORKOUT: RESCHEDULE =================
const WDL=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
function changeText(c){switch(c.type){
 case'moved':return`${shortName(c.prog)} moved ${WD[c.from]} → ${WDL[c.to]}${c.tight?' (less than your recovery time)':''}`;
 case'covered':return`${WD[c.day]}'s ${shortName(c.prog)} covered — ${c.by.join(' & ')} already trained`;
 case'adjusted':return`${WD[c.day]}'s ${shortName(c.prog)} now just ${c.left.join(', ')} (${c.drop.join(' & ')} already trained)`;
 case'unplaced':return`${shortName(c.prog)} from ${WD[c.from]} needs a new day`;
 case'dropped':return`${shortName(c.prog)} skipped this week`}return''}
function logChange(W,before,changes,why,pendBefore){const real=changes.filter(c=>c.type!=='unplaced'),pend=pendBefore??JSON.stringify(W.pending);
 for(const c of changes.filter(c=>c.type==='unplaced'))W.pending.push(c);
 if(!real.length&&!changes.length)return null;
 const e={id:Date.now().toString(36)+Math.random().toString(36).slice(2,4),ts:Date.now(),why,lines:changes.map(changeText),before,pend};W.log.push(e);W.log=W.log.slice(-12);return e}
const _fwP=finishW;finishW=function(){const a=S.active;S.planNote=null;_fwP();const w=S.workouts.at(-1);if(!a||!w||w.ts!==a.ts)return;try{afterWorkout(w);if(stack.at(-1)?.[0]==='summary')render()}catch(e){console.error(e)}};
function afterWorkout(w){const W=ensureWeek(),d=iso(w.ts);if(d<W.mon)return;const ti=dayIdx7(d),x=W.days[ti],did=trainedIn(w);
 if(x&&x.prog===w.prog&&RP.active(x))return; // did what was planned
 const before=JSON.stringify(W.days),r=RP.reschedule({days:W.days,ti,did,history:planHistory(w.ts),musc,recoveryH:S.balance.recoveryH});
 if(!r.changes.length)return;W.days=r.days;const e=logChange(W,before,r.changes,`${WD[ti]}: ${progName(w.prog)}${x&&RP.active(x)?` instead of ${shortName(x.prog)}`:''}`);
 save();if(e)S.planNote=e.id;try{schedNotifs()}catch(_){}}
// Undo restores the week exactly as it was before that change.
function undoChange(id){const W=ensureWeek(),i=W.log.findIndex(e=>e.id===id);if(i<0)return;const e=W.log[i];W.days=JSON.parse(e.before);W.log.splice(i);W.pending=JSON.parse(e.pend||'[]');
 save();render();toast('Change undone — your week is back to how it was')}

// ================= SHOW WHAT CHANGED =================
function changeCard(e,big){if(!e)return'';const latest=ensureWeek().log.at(-1)===e;
 return`<div class="wp-ch${big?' big':''}"><div class="wp-ch-h"><b>📅 Plan updated</b><small>${esc(e.why)}</small></div>${e.lines.map(l=>`<div class="wp-ch-l">• ${esc(l)}</div>`).join('')}
 <div class="wp-ch-a">${latest?`<button class="btn sm sec2" onclick="undoChange('${e.id}')">Undo</button>`:''}<button class="btn sm sec2" onclick="push('weekedit')">Edit week</button></div></div>`}
// The workout summary shows the change right away.
const _sumP=V.summary;V.summary=a=>{const h=_sumP(a),W=S.week,e=W?.log?.find(x=>x.id===S.planNote),pend=W?.pending?.length;if(!e&&!pend)return h;
 const k='<div class="sticky"';const card=(e?changeCard(e,true):'')+(pend?pendingCard():'');return h.includes(k)?h.replace(k,card+k):h+card};

// A session that didn't fit anywhere: ask.
function pendingCard(){const W=ensureWeek(),c=W.pending[0];if(!c)return'';
 const ti0=DOW(Date.now()),aft=Math.max(c.from,c.after??c.from,slotDone(ti0)?ti0:ti0-1);Object.assign(c,RP.options(c.prog,aft,W.days,planHistory(),musc,S.balance.recoveryH),{after:aft});
 return`<div class="wp-ch big warn"><div class="wp-ch-h"><b>⚠️ Where should ${esc(shortName(c.prog))} go?</b><small>No free day this week is ${S.balance.recoveryH} h away from your other ${esc(musc(c.prog).slice(0,3).join(', ').toLowerCase())} sessions.</small></div>
 <div class="wp-opts">${c.anyway>=0?`<button class="btn sm" onclick="placePending({anyway:${c.anyway}})">Do it ${WDL[c.anyway]} anyway</button>`:''}
 ${(c.swaps||[]).slice(0,2).map(s=>`<button class="btn sm sec2" onclick="placePending({swap:${s.day}})">Swap with ${WD[s.day]}'s ${esc(shortName(s.prog))}</button>`).join('')}
 <button class="btn sm sec2" onclick="placePending('drop')">Skip it this week</button></div></div>`}
function placePending(choice){const W=ensureWeek(),pendBefore=JSON.stringify(W.pending),c=W.pending.shift();if(!c)return;const before=JSON.stringify(W.days),r=RP.place(W.days,c,choice,planHistory(),musc,S.balance.recoveryH);
 if(!r.changes.length){W.pending.unshift(c);render();return toast('That day isn’t free any more — pick again')}
 W.days=r.days;const e=logChange(W,before,r.changes,`${shortName(c.prog)} from ${WD[c.from]}`,pendBefore);if(e)S.planNote=e.id;save();render();toast(r.changes.map(changeText).join(' · '))}

// ================= CHANGE TODAY'S WORKOUT =================
function swapOptions(){const seen=new Set(),out=[];
 for(const g of S.exGroups.filter(g=>!g.deleted))out.push(['g_'+g.id,'My groups']);
 for(const sp of Object.values(SPLITS))for(const k of sp.days)if(!seen.has(k)){seen.add(k);out.push([k,'Workouts'])}
 out.push(['home','Other'],['free','Other']);return out}
// What would change if you trained k today (previewed with the program's muscles).
function previewSwap(k){const W=ensureWeek(),ti=DOW(Date.now()),x=W.days[ti];if(x?.prog===k)return[];
 return RP.reschedule({days:W.days,ti,did:k==='free'?[]:musc(k),history:planHistory(),musc,recoveryH:S.balance.recoveryH}).changes.map(changeText)}
function changeToday(){const W=ensureWeek(),p=dayPlan(),L=weekLoad();let grp='';
 openSheet(`<h3 class="t-title">Change today's workout</h3><p class="t-caption" style="margin:4px 0 var(--s1)">${p.type==='workout'&&!p.done?`Planned: <b>${esc(progName(p.prog))}</b>. `:''}Pick what you'll actually do — the rest of the week adjusts after you finish, based on the muscles you train.</p>
 ${swapOptions().map(([k,g])=>{const P=PROGS[k];if(!P)return'';const wn=RP.warnings(L,musc(k),S.balance),head=g!==grp?`<div class="afsec">${g}</div>`:'';grp=g;
  return`${head}<div class="row" onclick="swapPick('${k}')"><div class="tile" style="background:${P.bg};width:42px;height:42px;font-size:20px">${P.e}</div><div class="rbody"><b>${escT(P.name)}${p.prog===k&&!p.done?' · planned':''}</b><small>${esc(P.sub||'')}${wn.length?` · <span class="wp-warn">⚠️ ${wn.map(x=>x.m).join(', ')} ${wn[0].kind==='freq'?`${wn[0].sessions}× this week`:'high volume'}</span>`:''}</small></div><span class="chev">›</span></div>`}).join('')}`)}
function swapPick(k){const ch=previewSwap(k),wn=RP.warnings(weekLoad(),musc(k),S.balance),P=PROGS[k];
 openSheet(`<h3 class="t-title">${esc(P.name)} today?</h3>
 ${ch.length?`<div class="wp-ch"><div class="wp-ch-h"><b>📅 What changes in your week</b><small>Applied after you finish — you can undo it.</small></div>${ch.map(l=>`<div class="wp-ch-l">• ${esc(l)}</div>`).join('')}</div>`:'<p class="t-caption" style="margin-top:var(--s1)">Nothing else in your week needs to change.</p>'}
 ${wn.length?balanceBox(wn):''}
 <button class="btn" style="margin-top:var(--s2)" onclick="closeSheet();BAL_OK=true;startW('${k}')">Start ${esc(P.name)}</button>
 <button class="btn sec2" style="margin-top:var(--s1)" onclick="changeToday()">Pick something else</button>`)}

// ================= WEEK EDITOR =================
V.weekedit=()=>{const W=ensureWeek(),ti=DOW(Date.now());
 const st=(x,i)=>{const d=iso(dayOfWeek(i)),wk=dayWorkouts(d);if(wk.length)return`✅ ${esc(progName(wk[0].prog))}`;if(!x)return'Rest';
  return{planned:esc(progName(x.prog))+(x.drop?.length?` <small>(no ${x.drop.join(', ').toLowerCase()})</small>`:''),moved:`↪ ${esc(progName(x.prog))} <small>from ${WD[x.from]}</small>`,covered:`<s>${esc(shortName(x.prog))}</s> <small>covered</small>`,skipped:x.replaced||x.missed?`<s>${esc(shortName(x.prog))}</s> <small>${W.days.some(y=>y?.from===i&&y.st==='moved')?'moved':'skipped'}</small>`:`<s>${esc(shortName(x.prog))}</s> <small>skipped</small>`}[x.st]||''};
 return`<div class="top">${backBtn()}<h1 style="font-size:22px;flex:1;margin-left:var(--s1)">This week</h1><span></span></div>
 ${W.pending.length?pendingCard():''}
 <div class="list">${W.days.map((x,i)=>`<div class="row${i===ti?' wp-today':''}" onclick="${i>=ti&&RP.active(x)&&!slotDone(i)?`dayMenu(${i})`:''}"><div class="rbody"><b>${WDL[i]}${i===ti?' · today':''}</b><small>${st(x,i)}</small></div>${i>=ti&&RP.active(x)&&!slotDone(i)?'<span class="chev">›</span>':''}</div>`).join('')}</div>
 <p class="t-caption" style="margin-top:var(--s1)">Tap a session to move it or skip it. Sessions are kept at least ${S.balance.recoveryH} h apart for the same muscles when the app reschedules (change it in Settings → Training balance).</p>
 ${W.log.length?`<div class="sec">Changes this week</div>${W.log.slice().reverse().map(e=>changeCard(e)).join('')}`:''}<div style="height:var(--s4)"></div>`};
function dayMenu(i){const W=ensureWeek(),x=W.days[i],ti=DOW(Date.now()),free=[...Array(7).keys()].filter(j=>j>=ti&&j!==i&&!RP.active(W.days[j])&&!slotDone(j));
 openSheet(`<h3 class="t-title">${esc(progName(x.prog))} · ${WDL[i]}</h3><div class="afsec">Move to</div>
 <div class="chips">${free.map(j=>{const g=RP.shortestGap(j,musc(x.prog),W.days,planHistory(),musc,i);return`<button onclick="moveDay(${i},${j})">${WD[j]}${g<S.balance.recoveryH?' ⚠️':''}</button>`}).join('')||'<span class="t-caption">No free day left this week.</span>'}</div>
 <p class="t-caption">⚠️ = less than ${S.balance.recoveryH} h from another session for the same muscles.</p>
 <button class="btn sec2" style="margin-top:var(--s2)" onclick="skipDay(${i})">Skip it this week</button>`)}
function moveDay(i,j){const W=ensureWeek(),before=JSON.stringify(W.days),d=RP.moveSession(W.days,i,j);if(!d)return;W.days=d;logChange(W,before,[{type:'moved',prog:d[j].prog,from:i,to:j}],'Edited by you');save();closeSheet();render()}
function skipDay(i){const W=ensureWeek(),before=JSON.stringify(W.days),p=W.days[i].prog;W.days[i]={...W.days[i],st:'skipped'};logChange(W,before,[{type:'dropped',prog:p,from:i}],'Edited by you');save();closeSheet();render()}

// ================= WEEK STRIP (Plan tab) =================
weekStrip=function(){const W=ensureWeek(),ti=DOW(Date.now());
 return`<div class="wp-strip">${WD.map((n,i)=>{const d=iso(dayOfWeek(i)),wk=dayWorkouts(d),x=W.days[i];let ic,lbl,cls='';
  if(wk.length){ic='✅';lbl=shortName(wk[0].prog)}
  else if(!x){ic='😴';lbl='Rest'}
  else if(x.st==='covered'){ic='☑️';lbl='Covered';cls=' cov'}
  else if(x.st==='skipped'){ic=W.days.some(y=>y?.st==='moved'&&y.from===i)?'↪':'⏭️';lbl=W.days.some(y=>y?.st==='moved'&&y.from===i)?'Moved':i<ti?'Missed':'Skipped';cls=' off'}
  else if(i<ti){ic='⚪';lbl='Missed'}
  else{ic=PROGS[x.prog]?.e||'💪';lbl=shortName(x.prog);if(x.st==='moved')cls=' mv';if(x.drop?.length)cls+=' adj'}
  return`<div class="wp-d${i===ti?' today':''}${cls}" onclick="push('weekedit')"><small>${n}</small><div>${ic}</div><b>${esc(lbl)}</b>${W.cardio.includes(i)?`<i>${cardioDone(d)?'✅':'🏃'}</i>`:''}</div>`}).join('')}</div>
 ${W.pending.length?`<button class="wp-pend" onclick="push('weekedit')">⚠️ ${esc(shortName(W.pending[0].prog))} needs a new day — tap to choose</button>`:''}
 ${W.log.length?`<div class="wp-last" onclick="push('weekedit')">🔁 ${esc(W.log.at(-1).lines.join(' · '))} <u>Undo / edit</u></div>`:''}
 ${W.notes.length?W.notes.map(n=>`<small class="muted" style="display:block">🔁 ${n}</small>`).join(''):''}`};

// ================= WEEKLY MUSCLE BALANCE =================
const weekLoad=(exceptTs)=>{ensureWeek();return RP.weekLoad(weekWorkouts().filter(w=>w.ts!==exceptTs),EX,S.balance.thr)};
const plannedMuscles=()=>{const W=ensureWeek(),s=new Set();W.days.forEach(x=>x&&musc(x.prog).forEach(m=>s.add(m)));weekWorkouts().forEach(w=>musc(w.prog).forEach(m=>s.add(m)));return MUSCLES.filter(m=>s.has(m))};
function balanceBox(wn,missing){const L=wn.map(x=>x.kind==='freq'?`You've trained <b>${x.m.toLowerCase()}</b> ${x.sessions} times this week.`:`<b>${x.m}</b> is at ${Math.round(x.sets)} sets this week (your limit is ${S.balance.maxSets}).`);
 const miss=missing??RP.friendly(RP.notTrained(weekLoad(),plannedMuscles()));
 return`<div class="wp-bal">${L.map(l=>`<div>⚠️ ${l}</div>`).join('')}<small>More sessions add fatigue and slow recovery; ~2 sessions and 10–20 hard sets per muscle a week is the productive range.</small>${miss.length?`<div class="wp-miss">You still haven't trained: <b>${esc(miss.join(', '))}</b> this week.</div>`:''}</div>`}
let BAL_OK=false;
// Starting a workout: warn (never block) if it hits a muscle you've already trained a lot this week.
const _swBal=startW;startW=function(k){if(BAL_OK||!S.balance.warn||!PROGS[k]){const ok=BAL_OK,was=S.active?.ts;BAL_OK=false;_swBal(k);if(ok&&S.active&&S.active.ts!==was){S.active.balOk=[...new Set([...(S.active.balOk||[]),...musc(k)])];save()}return}
 const wn=RP.warnings(weekLoad(),musc(k),S.balance);if(!wn.length)return _swBal(k);
 openSheet(`<h3 class="t-title">${wn[0].kind==='freq'?`You've trained ${esc(wn[0].m.toLowerCase())} ${wn[0].sessions} times this week. Are you sure?`:`${esc(wn[0].m)} already has a lot of sets this week. Are you sure?`}</h3>${balanceBox(wn)}
  <button class="btn" style="margin-top:var(--s2)" onclick="closeSheet();BAL_OK=true;startW('${k}')">Train anyway</button>
  <button class="btn sec2" style="margin-top:var(--s1)" onclick="changeToday()">Pick something else</button>`)};
// First set of an exercise: same check for the muscles it trains (once per muscle per workout).
const _asBal=addSet;addSet=function(){const a=S.active;if(!a||!S.balance.warn||BAL_OK){BAL_OK=false;return _asBal()}const ex=a.list[a.idx];
 if(a.sets.some(s=>s.ex===ex)||!EX[ex])return _asBal();a.balOk??=[];const ms=EX[ex][0].filter(m=>!a.balOk.includes(m));
 const wn=RP.warnings(weekLoad(a.ts),ms,S.balance,RP.muscleSets(a.sets,EX));a.balOk.push(...EX[ex][0]);if(!wn.length)return _asBal();save();
 openSheet(`<h3 class="t-title">${wn[0].kind==='freq'?`You've trained ${esc(wn[0].m.toLowerCase())} ${wn[0].sessions} times this week. Are you sure?`:`${esc(wn[0].m)} is past ${S.balance.maxSets} sets this week. Are you sure?`}</h3>${balanceBox(wn)}
  <button class="btn" style="margin-top:var(--s2)" onclick="closeSheet();BAL_OK=true;addSet()">Log it anyway</button>
  <button class="btn sec2" style="margin-top:var(--s1)" onclick="closeSheet();pickEx(1)">Swap the exercise</button>`)};
// Plan tab: muscles left this week + anything overdone.
function balanceCard(){if(!S.week)return'';const L=weekLoad(),pm=plannedMuscles(),miss=RP.friendly(RP.notTrained(L,pm)),over=MUSCLES.filter(m=>(L[m]?.sessions||0)>=S.balance.maxFreq);
 const bars=pm.map(m=>{const s=L[m]?.sessions||0;return`<div class="wp-mb"><span>${m}</span><i>${[...Array(Math.max(S.balance.maxFreq,s))].map((_,j)=>`<b class="${j<s?(j>=S.balance.maxFreq-1&&s>=S.balance.maxFreq?'hi':'on'):''}"></b>`).join('')}</i></div>`}).join('');
 return`<div class="card wp-balc"><div class="wp-ch-h"><b>💪 Muscle balance this week</b><small onclick="push('balance')" style="cursor:pointer;color:var(--accent)">Settings</small></div>
 ${miss.length?`<div class="wp-miss">You still haven't trained: <b>${esc(miss.join(', '))}</b></div>`:'<div class="wp-miss ok">Every muscle in your plan has been trained ✅</div>'}
 ${over.length?`<div class="wp-warn" style="margin-top:6px">⚠️ ${over.join(', ')}: ${S.balance.maxFreq}+ sessions already</div>`:''}
 <details><summary>Sessions per muscle</summary>${bars}</details></div>`}
const _planP=V.plan;V.plan=()=>{let h=_planP();if(viewDate!==today()||!S.profile)return h;
 // today's workout row gets a "Change" action
 const p=dayPlan();if(p.type==='workout'&&!p.done)h=h.replace(/(<div class="sec"[^>]*>🗓️ This week)/,`<button class="btn sec2 wp-change" onclick="changeToday()">🔄 Can't do ${esc(shortName(p.prog))} today? Change it</button>$1`);
 else if(p.type==='rest'&&p.why==='covered')h=h.replace('>Rest day<','>Covered — already trained this week<');
 else if(p.type==='rest'&&p.why==='moved')h=h.replace('>Rest day<',`>Moved to ${WDL[p.to]}<`);
 const k=h.indexOf('<div class="sec" style="display:flex;justify-content:space-between;align-items:baseline">🗓️ This week');return k>=0?h.slice(0,k)+balanceCard()+h.slice(k):h+balanceCard()};
// Workouts tab: "Change today's workout" next to the recommendation.
const _wkP=V.workouts;V.workouts=()=>_wkP().replace('<p class="muted" style="margin-bottom:6px">Recommended today</p>',`<div class="flex" style="justify-content:space-between;align-items:baseline;margin-bottom:6px"><p class="muted" style="margin:0">Recommended today</p><button class="aflink" style="padding:0" onclick="changeToday()">Change today's workout</button></div>`);

// ================= SETTINGS: training balance =================
V.balance=()=>{const B=S.balance,st=(k,l,sub,step,min,max,u)=>`<div class="afrow"><span>${l}<small class="t-caption" style="display:block;font-weight:400">${sub}</small></span><span class="afstep"><button onclick="balSet('${k}',${-step},${min},${max})">−</button><b>${B[k]}${u}</b><button onclick="balSet('${k}',${step},${min},${max})">+</button></span></div>`;
 return`<div class="top">${backBtn()}<h1 style="font-size:22px;flex:1;margin-left:var(--s1)">Training balance</h1><span></span></div>
 <div class="card">${st('recoveryH','Recovery time','Minimum time between sessions for the same muscle when the app reschedules',12,24,96,' h')}
 ${st('maxFreq','Sessions per muscle a week','Warn when a workout would go past this',1,1,7,'×')}
 ${st('maxSets','Sets per muscle a week','Warn past this many hard sets (secondary sets count half)',2,6,40,'')}
 <div class="afrow"><span>Balance warnings<small class="t-caption" style="display:block;font-weight:400">Ask before training an overworked muscle. Never blocks.</small></span><button class="sw ${B.warn?'on':''}" role="switch" aria-checked="${B.warn}" onclick="S.balance.warn=!S.balance.warn;save();render()"><i></i></button></div></div>
 <p class="t-caption">Defaults: 48 h, 3 sessions, 20 sets — about twice a week and 10–20 hard sets per muscle is what research supports (Schoenfeld et al., 2016–2019).</p>
 <button class="btn sec2" onclick="S.balance={...RP.DEFAULTS};save();render();toast('Back to defaults')">Reset to defaults</button>`};
function balSet(k,d,min,max){S.balance[k]=Math.max(min,Math.min(max,S.balance[k]+d));save();render()}
const _setP=V.settings;V.settings=()=>_setP().replace(/(<div class="row" onclick="push\('notifs'\)">)/,`<div class="row" onclick="push('balance')"><span style="font-size:22px">⚖️</span><div class="rbody"><b>Training balance</b><small>Recovery time · weekly limits per muscle</small></div><span class="chev">›</span></div>$1`);

document.head.insertAdjacentHTML('beforeend',`<style>
.wp-strip{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px;margin:8px 0 4px}
.wp-d{text-align:center;padding:6px 2px;border-radius:12px;background:var(--surface);border:1px solid var(--line);cursor:pointer;min-width:0}.wp-d.today{border:2px solid var(--accent)}
.wp-d small{font-weight:800;font-size:10px;color:var(--ink-2)}.wp-d div{font-size:18px}.wp-d b{font-size:9px;font-weight:700;display:block;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}.wp-d i{font-style:normal;font-size:10px}
.wp-d.cov,.wp-d.off{opacity:.6}.wp-d.cov b,.wp-d.off b{text-decoration:line-through}.wp-d.mv{background:#eef2ff}.wp-d.adj b::after{content:' *'}
.wp-last{font-size:13px;color:var(--ink-2);margin-top:6px;cursor:pointer}.wp-last u{color:var(--accent);font-weight:700}
.wp-pend{width:100%;margin-top:6px;border:none;border-radius:10px;background:#fff7ed;color:#9a3412;font-weight:700;padding:8px 10px;text-align:left;cursor:pointer}
.wp-ch{background:#eef2ff;border-radius:14px;padding:12px 14px;margin-top:var(--s2);text-align:left}.wp-ch.warn{background:#fff7ed}.wp-ch-h{display:flex;justify-content:space-between;gap:8px;align-items:baseline;flex-wrap:wrap}.wp-ch-h small{color:var(--ink-2);font-size:12px}
.wp-ch-l{font-size:14px;margin-top:4px}.wp-ch-a,.wp-opts{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
.wp-bal{background:#fff7ed;color:#9a3412;border-radius:12px;padding:10px 12px;margin-top:var(--s2);display:grid;gap:6px;font-size:14px}.wp-bal small{font-size:12px;opacity:.85}
.wp-miss{font-size:14px;margin-top:6px}.wp-miss.ok{color:var(--ink-2)}.wp-warn{color:#c2410c;font-weight:700}
.wp-change{width:100%;margin-top:var(--s1)}
.wp-balc details{margin-top:8px}.wp-balc summary{font-size:13px;color:var(--ink-2);cursor:pointer}
.wp-mb{display:flex;align-items:center;gap:8px;font-size:13px;margin-top:6px}.wp-mb span{width:88px}.wp-mb i{display:flex;gap:3px}.wp-mb b{width:18px;height:8px;border-radius:4px;background:var(--fill)}.wp-mb b.on{background:var(--ink)}.wp-mb b.hi{background:#ea580c}
.wp-today{background:#fff0f3}
</style>`);
window.__planReady=true;
if(S.profile){try{ensureWeek()}catch(e){console.error(e)}}
if(typeof render==='function')render();
