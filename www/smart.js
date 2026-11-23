// RepWise "smart" layer: weekly schedule with rest days & cardio, split switching per week,
// volume warnings, fasting-break analysis, Learn articles, notifications, and the daily dashboard.

const DOW=d=>(new Date(d).getDay()+6)%7; // Monday = 0
const monday=(d=new Date())=>{const x=new Date(d);x.setHours(12,0,0,0);x.setDate(x.getDate()-DOW(x));return iso(x)};
const dayOfWeek=i=>{const x=new Date(S.week.mon+'T12:00');x.setDate(x.getDate()+i);return x};
const WD=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

// ================= WEEKLY SCHEDULE =================
// Allowed training days per week for each style, and the default.
const FREQ={ppl:[3,6,6],ul:[2,4,4],full:[2,4,3],bro:[4,5,4],arnold:[3,6,6],rotation:[3,6,5]};
// Training days spread so rest days fall in between (Mon = index 0).
const PATTERN={2:[1,0,0,1,0,0,0],3:[1,0,1,0,1,0,0],4:[1,1,0,1,1,0,0],5:[1,1,1,0,1,1,0],6:[1,1,1,1,1,1,0]};
S.trainDays??={};
function buildWeek(mon,split){const cp=S.plan?.pat?.some(Boolean)&&S.plan.pat,[lo,hi,def]=FREQ[split]||[1,6,3],n=cp?cp.filter(Boolean).length:Math.min(hi,Math.max(lo,S.trainDays[split]||def)),pat=cp?[...cp]:PATTERN[n],days=SPLITS[split].days,queue=[];
 for(let i=0;i<n;i++)queue.push(days[i%days.length]);
 // Cardio: 3 sessions on a cut, otherwise 2 — placed on rest days first, then training days.
 const want=S.profile.goal.includes('cut')?3:2,rest=[0,1,2,3,4,5,6].filter(i=>!pat[i]),train=[2,4,0,5,1,3,6].filter(i=>pat[i]);
 const cardio=[...rest,...train].slice(0,want).sort((a,b)=>a-b);
 return{mon,split,n,pat,queue,cardio,notes:[]}}
function ensureWeek(){const mon=monday();if(!S.week||S.week.mon!==mon){if(S.nextSplit&&SPLITS[S.nextSplit]){S.split=S.nextSplit}delete S.nextSplit;S.week=buildWeek(mon,S.split);save()}reconcileCardio();return S.week}
let weekWorkouts=()=>S.workouts.filter(w=>iso(w.ts)>=S.week.mon&&S.week.queue.includes(w.prog));
let doneCount=()=>Math.min(S.week.queue.length,weekWorkouts().length);
let weekDone=()=>doneCount()>=S.week.queue.length;
// What is planned for a given date: workout (with program), rest, or done-for-the-week.
function dayPlan(d=today()){const W=ensureWeek(),i=DOW(d+'T12:00'),trained=S.workouts.filter(w=>iso(w.ts)===d&&W.queue.includes(w.prog));
 if(d<W.mon)return{type:'past'};
 if(trained.length)return{type:'workout',prog:trained[0].prog,done:true};
 if(d===today()&&weekDone())return{type:'rest',why:'week'};
 if(!W.pat[i])return{type:'rest',why:'rest'};
 if(d<today())return{type:'missed'};
 return{type:'workout',prog:W.queue[doneCount()]||W.queue.at(-1),done:false}}
function todaysProg(){const p=dayPlan();if(p.prog)return p.prog;ensureWeek();return S.week.queue[doneCount()]||S.week.queue[0]}

// ================= CARDIO (rescheduled, never skipped) =================
// A "grueling" session = 20+ sets, or a leg day with 15+ sets. Cardio after one is moved to a later day.
function grueling(d){return S.workouts.filter(w=>iso(w.ts)===d).some(w=>w.sets.length>=20||(['legs','lower'].includes(w.prog)&&w.sets.length>=15))}
function cardioDone(d){return S.runs.some(r=>iso(r.ts)===d&&(r.time>=600||r.dist>=1500))||(S.steps[d]||0)>=10000}
function reconcileCardio(){const W=S.week;if(!W)return;const ti=DOW(Date.now()),moved=[];
 W.cardio=W.cardio.map(c=>{const d=iso(dayOfWeek(c)),y=iso(dayOfWeek(c-1));if(cardioDone(d))return c;
  const missed=c<ti,tired=c===ti&&(grueling(d)||grueling(y));if(!missed&&!tired)return c;
  for(let j=Math.max(c,ti)+1;j<7;j++)if(!W.cardio.includes(j)&&!moved.includes(j)){moved.push(j);W.notes.push(`${missed?'Missed':'Tough session'} — cardio moved ${WD[c]} → ${WD[j]}`);return j}
  return c}).sort((a,b)=>a-b);
 W.notes=[...new Set(W.notes)].slice(-4);if(moved.length)save()}
let cardioToday=(d=today())=>S.week&&d>=S.week.mon&&S.week.cardio.includes(DOW(d+'T12:00'));

// ================= START-WORKOUT RULES =================
const _startW=startW;
startW=function(k){const W=ensureWeek(),inSplit=W.queue.includes(k),p=dayPlan();
 if(inSplit&&weekDone())return toast(`✅ All ${W.n} sessions done this week. Recovery is when muscle grows — try a walk, or a Free/Home workout.`);
 if(inSplit&&S.workouts.some(w=>iso(w.ts)===today()&&W.queue.includes(w.prog))&&!confirm('You already trained today. Two hard sessions in one day slows recovery. Start anyway?'))return;
 if(inSplit&&p.type==='rest'&&!confirm('😴 Today is a planned rest day.\n\nMuscles repair and grow between sessions — protein synthesis stays raised for ~24–48 h after training.\n\nTrain anyway? (It will count as your next session.)'))return;
 _startW(k);if(S.active){S.active.planned=S.active.list.length;save()}};

// ================= VOLUME WARNINGS =================
// Research: per-muscle gains per session flatten after ~6–10 hard sets; weekly ~10–20 sets per muscle is the
// productive range. Extra exercises mostly add fatigue. (Schoenfeld et al., 2017, J Sports Sci; Pelland et al., 2024)
const _useEx=useEx;
useEx=function(e){const a=S.active;if(a&&!window._swap){const n=a.list.length;
 if(n>=Math.max(6,a.planned||0)&&!confirm(`You're adding exercise #${n+1}${a.planned?` (your plan had ${a.planned})`:''}.\n\n🔬 What science says:\n• Muscle growth per session levels off after ~6–10 hard sets per muscle — more mostly adds fatigue\n• ~10–20 hard sets per muscle per WEEK is the productive range\n• Long sessions (60–90+ min) raise injury risk as form breaks down\n• Extra volume today can hurt your next session's performance\n\nAdd it anyway?`))return closeSheet()}
 _useEx(e)};
const _addSet=addSet;
addSet=function(){_addSet();const a=S.active;if(!a||!a.sets.length)return;const ex=a.sets.at(-1).ex;a.warned??={};
 for(const m of EX[ex][0]){const n=a.sets.filter(s=>EX[s.ex]&&EX[s.ex][0].includes(m)).length;
  if(n===11&&!a.warned[m]){a.warned[m]=1;save();setTimeout(()=>toast(`🧪 ${n} sets for <b>${m}</b> today — past ~10, extra sets add little growth and a lot of fatigue. Consider moving on.`),2400)}}};

// ================= ROUTINES (split switching: now or from next Monday) =================
V.splits=()=>{const W=ensureWeek(),dc=doneCount(),locked=dc>0,[lo,hi,def]=FREQ[S.nextSplit||S.split],n=S.trainDays[S.nextSplit||S.split]||def;
 return`<div class="top">${backBtn()}<h1>Workout style</h1><span></span></div>
 <div class="card"><b>This week: ${SPLITS[W.split].name}</b><br><small class="muted">${dc}/${W.n} sessions done${S.nextSplit?` · next week: <b>${SPLITS[S.nextSplit].name}</b>`:''}</small>
 <p class="t-caption" style="margin-top:8px">Your workout style sets the weekly schedule. To train something else just for today, use <b>Change today's workout</b> on the Train tab.${locked||DOW(Date.now())?' Changing style mid-week? You choose whether it starts now or next Monday.':''}</p></div>
 ${Object.entries(SPLITS).map(([k,sp])=>{const on=(S.nextSplit||S.split)===k;return`<div class="opt ${on?'on':''}" onclick="pickSplit('${k}')"><span class="e">${PROGS[sp.days[0]].e}</span><div><b>${sp.name}</b><small>${sp.d}<br>${sp.days.map(d=>PROGS[d].name).join(' → ')} · ${FREQ[k][0]}–${FREQ[k][1]} days/wk</small></div></div>`}).join('')}
 <div class="sec">📅 Training days per week</div><div class="flex" style="gap:6px">${Array.from({length:hi-lo+1},(_,i)=>lo+i).map(x=>`<button class="btn sm ${x===n?'':'sec2'}" style="flex:1" onclick="setDays(${x})">${x}</button>`).join('')}</div>
 <p class="muted" style="margin-top:6px">Rest days are placed in between automatically. ${locked?'Changes apply next week.':''}</p>
 ${sciCard(['📅','Which split is best?','When total weekly sets are equal, splits build similar muscle. Training each muscle at least 2×/week has a small edge — pick the one you will actually stick to.','Schoenfeld et al., 2016 & 2019 meta-analyses, Sports Med'])}`};
// Mid-week (a session done, or not Monday) the user picks: rebuild the rest of this week now, or start next Monday.
function pickSplit(k){if(!SPLITS[k])return;
 if(k===S.split){if(S.nextSplit){delete S.nextSplit;save();render();return toast('Keeping your current workout style')}return toast('That is already your workout style')}
 if(doneCount()===0&&DOW(Date.now())===0)return applySplitNow(k);
 openSheet(`<h3 class="t-title">Switch to ${esc(SPLITS[k].name)}?</h3><p class="t-caption" style="margin:4px 0 var(--s2)">You're part-way through this week${doneCount()?` (${doneCount()} session${doneCount()>1?'s':''} done)`:''}. When should the new routine start?</p>
  <button class="btn" onclick="closeSheet();applySplitNow('${k}')">Apply now (rebuild the rest of this week)</button>
  <button class="btn sec2" style="margin-top:var(--s1)" onclick="closeSheet();splitNextWeek('${k}')">Start next week (from Monday)</button>
  <p class="t-caption" style="margin-top:var(--s1)">Days you've already trained stay as they are.</p>`)}
function splitNextWeek(k){S.nextSplit=k;save();render();toast(`🗓️ ${SPLITS[k].name} starts next Monday`)}
// Rebuild today (if not trained yet) and the days after it with the new routine, starting from its first session.
function applySplitNow(k){const old=S.week,ti=DOW(Date.now());S.split=k;delete S.nextSplit;const W=buildWeek(monday(),k);
 if(old&&old.mon===W.mon&&old.days&&(doneCount()>0||ti>0)){const done=i=>S.workouts.some(w=>iso(w.ts)===iso(dayOfWeek(i))&&(w.sets||[]).length),start=done(ti)?ti+1:ti,days=SPLITS[k].days;let q=0;
  W.days=W.pat.map((v,i)=>i<start?old.days[i]:v?{prog:days[q++%days.length],st:'planned'}:null);
  W.pat=W.days.map(x=>x?1:0);W.n=Math.max(1,W.days.filter((x,i)=>x&&(i>=start||done(i)||x.st==='covered')).length);
  Object.assign(W,{cardio:old.cardio,notes:[...(old.notes||[]),`Workout style changed to ${SPLITS[k].name}`].slice(-4),seen:old.seen||{}})}
 S.week=W;save();render();toast(`🗓️ ${SPLITS[k].name} — ${ti?'the rest of this week is rebuilt':"this week's plan is ready"}`)}
function setDays(x){const k=S.nextSplit||S.split;S.trainDays[k]=x;if(doneCount()===0&&!S.nextSplit)S.week=buildWeek(monday(),S.split);save();render()}

// ================= FASTING: warn + analyse what eating does now =================
fastOK=function(){if(!S.fast.on||viewDate!==today())return true;const s=fastState();if(s.open)return true;
 const w=fastWin(),hin=w.h-s.left,st=[...FAST_HRS].reverse().find(x=>x[0]<=hin);
 if(!confirm(`⏳ Your eating window isn't open yet (${S.fast.proto}). It opens in ${dur(s.left)} at ${hh(w.st)}.\n\nYou're ${dur(hin)} into your fast — stage: ${st[2]}.\n\nAre you sure you want to eat now?`))return false;
 S.fastLog??=[];S.fastLog.push([Date.now(),+hin.toFixed(1)]);save();
 const got=hin>=16?'You still reached ketone production — good work.':hin>=12?'You reached the fat-burning switch (~12 h).':'This was a short fast — mostly digestion and glycogen use.';
 setTimeout(()=>openSheet(`<h3 style="font-size:20px">🧬 What just happened in your body</h3>
  <div class="tip">⏱️ Fast ended at <b>${dur(hin)}</b> (goal ${w.h} h). ${got}</div>
  <div class="tip">📈 Eating raises <b>blood sugar and insulin</b>. Insulin tells fat cells to stop releasing fat, so <b>fat burning slows</b> and ketone production stops within a few hours.</div>
  <div class="tip">♻️ Fasting-linked processes (like autophagy) wind down once you're fed.</div>
  <div class="tip">✅ It's not a failure: total calories for the day matter most for fat loss. Make this meal protein-rich and get back on schedule — your window opens at ${hh(w.st)}.</div>
  <small class="muted">📚 de Cabo & Mattson, 2019, NEJM; Lowe et al., 2020, JAMA Intern Med</small>`),400);
 return true};

// ================= LEARN (articles) =================
const ARTICLES=[
 ['🔥','How fat loss actually works',3,[['Energy balance','You lose fat when you burn more energy than you eat. Your maintenance (TDEE) = resting metabolism + daily movement + exercise + digesting food. Eat below it and your body uses stored fat to make up the gap.'],['Why 7,700 kcal ≈ 1 kg','1 kg of body fat stores roughly 7,700 kcal. A 500 kcal daily deficit ≈ 0.5 kg per week. Early weeks drop faster because of water and glycogen.'],['Keep the muscle','Lift weights and eat 1.6–2.2 g/kg protein. Then most of the weight you lose comes from fat, not muscle.']],'Hall et al., 2011, Lancet; Helms et al., 2014, JISSN'],
 ['📈','Progressive overload, explained',3,[['The core rule','Muscles adapt to what you ask of them. To keep growing you must gradually ask for more: one more rep, a bit more weight, or better form/range at the same load.'],['Rep ranges','Anything from ~5 to ~30 reps builds muscle if sets are taken close to failure. Heavier work (1–5 reps) builds the most maximal strength.'],['Bad days are normal','Strength goes up in waves. If you go backwards, sleep, food and stress are usually the reason — just beat your last session again.']],'Schoenfeld et al., 2017 & 2021, J Strength Cond Res; Plotkin et al., 2022, PeerJ'],
 ['🏋️','Do I need cardio if I lift?',3,[['Different jobs','Lifting builds muscle and strength. Cardio trains your heart, lungs and blood vessels — and lowers the risk of heart disease and early death in ways lifting alone does not fully cover.'],['How much','Guidelines: 150–300 min of moderate cardio (brisk walking counts) or 75–150 min vigorous per week, plus 2+ strength days.'],['Will cardio kill gains?','Not at sensible doses. Moderate cardio barely affects muscle growth; keep hard leg cardio away from leg days if possible. That\'s why RepWise moves cardio after a grueling session instead of skipping it.']],'WHO 2020 guidelines; Schumann et al., 2022, Sports Med (concurrent training)'],
 ['🥩','Protein: how much and when',2,[['Daily target','1.6 g/kg of bodyweight captures most of the benefit for muscle; up to 2.2 g/kg is useful when dieting.'],['Spread it out','3–5 meals with ~0.4 g/kg each. A protein-rich meal before bed helps overnight repair.'],['Best sources','Chicken, fish, eggs, Greek yogurt, lean beef, tofu, lentils, whey. Animal and soy proteins are rich in leucine, the amino acid that switches on muscle building.']],'Morton et al., 2018, BJSM; Schoenfeld & Aragon, 2018, JISSN'],
 ['😴','Sleep & rest days: where gains happen',2,[['Growth happens in recovery','Training is the signal; recovery is when muscle is rebuilt. Muscle protein synthesis stays elevated for 24–48 h after a session.'],['Sleep is a supplement','Under 6 h of sleep lowers testosterone, raises hunger hormones and makes you lose more muscle while dieting.'],['Rest days','1–2 full rest days a week with light walking keep you fresh and reduce injury risk.']],'Nedeltcheva et al., 2010, Ann Intern Med; Dattilo et al., 2011, Med Hypotheses'],
 ['💧','Water: why it matters for training',2,[['Performance','Losing just 2% of bodyweight in water lowers strength, endurance and focus.'],['How much','About 30–35 ml per kg per day, more on hot days or when you sweat a lot. Pale yellow urine = you\'re on track.'],['Appetite','Drinking 500 ml of water before meals helped dieters eat less and lose more weight in trials.']],'Judelson et al., 2007, Sports Med; Dennis et al., 2010, Obesity'],
];
V.learn=()=>`<div class="top">${backBtn()}<h1>Learn</h1><span></span></div><p class="muted" style="margin-bottom:12px">Short, science-backed reads.</p>
 <div class="list stagger">${ARTICLES.map(([e,t,m],i)=>`<div class="row" onclick="push('article',${i})"><div class="tile" style="background:${PASTEL[i%8]}">${e}</div><div class="rbody"><b>${t}</b><small>${m} min read</small></div><span class="chev">›</span></div>`).join('')}</div>
 <div class="sec">More</div><div class="list">
 <div class="row" onclick="push('science')"><div class="tile" style="background:#e0f2fe">🔬</div><div class="rbody"><b>Science library</b><small>${SCIENCE.length} quick research tips</small></div><span class="chev">›</span></div>
 <div class="row" onclick="push('foodsci')"><div class="tile" style="background:#dcfce7">🥗</div><div class="rbody"><b>Smart foods</b><small>Vitamins & what they do</small></div><span class="chev">›</span></div>
 <div class="row" onclick="push('fasting')"><div class="tile" style="background:#ede9fe">⏳</div><div class="rbody"><b>Fasting hour by hour</b><small>What happens in your body</small></div><span class="chev">›</span></div></div>`;
V.article=i=>{const [e,t,m,secs,src]=ARTICLES[i];return`<div class="top">${backBtn()}<span></span><span></span></div><div style="font-size:60px;text-align:center">${e}</div><h1 style="text-align:center">${t}</h1><p class="muted" style="text-align:center">${m} min read</p>
 ${secs.map(([h,b])=>`<div class="card"><b style="font-size:17px">${h}</b><p style="line-height:1.55;margin-top:6px">${b}</p></div>`).join('')}<p class="muted">📚 ${src}</p>`};

// ================= NOTIFICATIONS =================
S.notif??={water:true,food:true,workout:true,fast:true,weigh:false};
const LN=()=>window.Capacitor?.Plugins?.LocalNotifications;
async function schedNotifs(){const L=LN();if(!L||!S.profile)return;
 try{const p=await L.checkPermissions();if(p.display!=='granted'){const r=await L.requestPermissions();if(r.display!=='granted')return}
  const pend=await L.getPending();if(pend.notifications.length)await L.cancel({notifications:pend.notifications.map(n=>({id:n.id}))});
  const N=[],at=(dayOff,h,m)=>{const t=new Date();t.setDate(t.getDate()+dayOff);t.setHours(h,m,0,0);return t},add=(id,t,title,body,go)=>{if(t>new Date())N.push({id,title,body,schedule:{at:t,allowWhileIdle:true},extra:{go}})};
  const t=targets(),F=S.fast.on&&S.notif.fast?fastWin():null;ensureWeek();
  for(let d=0;d<7;d++){const date=iso(at(d,12,0)),b=1000+d*20;
   if(F){add(b,at(d,Math.floor(F.st),0),'🍽️ Eating window open',`Your ${S.fast.proto} window is open until ${hh(F.en)}. Start with protein!`,'meals');
    const close=at(d,Math.floor(F.st),0);close.setHours(close.getHours()+F.eat);
    add(b+1,new Date(close-36e5),'⏰ 1 hour left to eat',`Window closes at ${hh(F.en)}. Get your protein in.`,'meals');
    add(b+2,close,'⏳ Fast started',`Window closed. Next meal at ${hh(F.st)}. Water, black coffee & plain tea are fine.`,'fasting')}
   if(S.notif.food&&!F)[[8,0,'🍳 Breakfast'],[12,30,'🥗 Lunch'],[19,0,'🍽️ Dinner']].forEach(([h,m,l],i)=>add(b+3+i,at(d,h,m),`${l} time`,`Log it to stay on your ${t.kcal} kcal plan.`,'meals'));
   if(S.notif.water)[9,11,13,15,17,19].forEach((h,i)=>add(b+6+i,at(d,h,0),'💧 Drink some water',`Aim for ${t.water.toLocaleString()} ml today. A glass now keeps you on track.`,'plan'));
   if(S.notif.workout){const p=dayPlan(date);const c=cardioToday(date);
    if(p.type==='workout'&&!p.done)add(b+12,at(d,17,0),`💪 Today: ${PROGS[p.prog].name}`,`${PROGS[p.prog].sub}. Beat last session for bonus XP!`,'workouts');
    else if(p.type==='rest')add(b+12,at(d,17,0),'😴 Rest day','Recovery is where muscle grows. A light walk is a great idea.','plan');
    if(c)add(b+13,at(d,p.type==='workout'?8:17,30),'🏃 Cardio day','20–30 min of cardio is on today\'s plan (a brisk walk counts).','run')}
   if(S.notif.weigh)add(b+14,at(d,7,30),'⚖️ Weigh-in','Morning, after the bathroom, before eating.','plan')}
  if(N.length)await L.schedule({notifications:N})}catch(e){console.warn('notif',e)}}
function schedFast(){schedNotifs()}
try{LN()?.addListener('localNotificationActionPerformed',a=>{const g=a.notification?.extra?.go;if(g){viewDate=today();if(['fasting'].includes(g)){stack=[];push(g)}else go(g)}})}catch(e){}
document.addEventListener('resume',schedNotifs);document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedNotifs()});
V.notifs=()=>{const row=(k,e,t,s)=>`<div class="row" onclick="S.notif.${k}=!S.notif.${k};save();schedNotifs();render()"><span style="font-size:22px">${e}</span><div class="rbody"><b>${t}</b><small>${s}</small></div><span class="chip" style="background:${S.notif[k]?'var(--good)':'#e5e5ec'};color:${S.notif[k]?'#fff':'inherit'}">${S.notif[k]?'ON':'OFF'}</span></div>`;
 return`<div class="top">${backBtn()}<h1>Reminders</h1><span></span></div><p class="muted" style="margin-bottom:12px">Notifications arrive even when you're in another app.${LN()?'':' (Only available in the Android app.)'}</p>
 <div class="list">${row('fast','⏳','Fasting window','When your eating window opens, 1 h before it closes, and when it closes')}${row('food','🍽️','Meals','Breakfast, lunch & dinner logging (off while fasting mode is on)')}${row('water','💧','Water','Every 2 hours, 9am–7pm')}${row('workout','💪','Workout & cardio','What\'s on today\'s plan, rest days, and deadlines to make up a missed workout')}${row('weigh','⚖️','Weigh-in','Every morning at 7:30')}</div>`};

// ================= DASHBOARD (Plan tab) =================
function weekStrip(){const W=ensureWeek(),ti=DOW(Date.now());let q=0;const done=weekWorkouts();
 return`<div style="display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px;margin:8px 0 4px">${WD.map((n,i)=>{const d=iso(dayOfWeek(i)),wk=S.workouts.find(w=>iso(w.ts)===d&&W.queue.includes(w.prog));
  let ic,lbl;if(wk){ic='✅';lbl=PROGS[wk.prog].name.split(' ')[0]}
  else if(!W.pat[i]){ic='😴';lbl='Rest'}
  else if(i<ti){ic='⚪';lbl='Missed'}
  else{const ahead=[...Array(i-ti).keys()].map(x=>x+ti).filter(j=>W.pat[j]&&!(j===ti&&S.workouts.some(w=>iso(w.ts)===today()&&W.queue.includes(w.prog)))).length,pr=W.queue[done.length+ahead];
   if(pr){ic=PROGS[pr].e;lbl=PROGS[pr].name.split(' ')[0]}else{ic='😴';lbl='Rest'}}
  return`<div style="text-align:center;padding:6px 2px;border-radius:12px;background:${i===ti?'#fff0f3':'#fff'};border:${i===ti?'2px solid var(--acc)':'1px solid var(--line)'}"><small style="font-weight:800;font-size:10px" class="muted">${n}</small><div style="font-size:18px">${ic}</div><small style="font-size:9px;font-weight:700;display:block;overflow:hidden;white-space:nowrap">${lbl}</small>${W.cardio.includes(i)?`<small style="font-size:10px">${cardioDone(d)?'✅':'🏃'}</small>`:''}</div>`}).join('')}</div>
 ${W.notes.length?W.notes.map(n=>`<small class="muted" style="display:block">🔁 ${n}</small>`).join(''):''}`}
V.plan=()=>{const t=targets(),d=viewDate,isT=d===today(),f=dayFood(d),k=sum(f,1),L=level(),W=ensureWeek();
 const p=dayPlan(d),water=S.water[d]||0,steps=S.steps[d]||0,qs=questList().filter(q=>q.i<q.steps.length),wIn=S.weights.some(w=>iso(w[0])===d),dd=new Date(d+'T12:00');
 const cReq=cardioToday(d),cDone=cardioDone(d),wk=S.workouts.filter(w=>iso(w.ts)===d);
 const wrow=p.type==='workout'?row({done:p.done,e:PROGS[p.prog].e,bg:PROGS[p.prog].bg,t:p.done?'Workout done 💪':`Workout: ${PROGS[p.prog].name}`,s:p.done?`+${wk.reduce((s,w)=>s+w.xp,0)} XP earned`:`${PROGS[p.prog].sub} · session ${doneCount()+1}/${W.n} this week`,on:p.done?"go('workouts')":`push('prog','${p.prog}')`})
  :p.type==='missed'?row({done:false,e:'⚪',bg:'#f3f3f7',t:'Missed session',s:'No worries — the plan carries it to your next training day.',on:"go('workouts')"}):p.type==='rest'?row({done:true,e:'😴',bg:'#e0e7ff',t:p.why==='week'?`Week complete (${W.n}/${W.n}) 🎉`:'Rest day',s:'Muscles grow while you recover. Light walk recommended.',on:"push('article',4)"}):'';
 const sec=(t,sub)=>`<div class="sec" style="display:flex;justify-content:space-between;align-items:baseline">${t}<small class="muted" style="font-weight:700">${sub||''}</small></div>`;
 return`<p class="muted" style="padding-top:18px;margin-bottom:-14px">Hi, ${esc(S.profile.name||'champ')} 👋</p><div class="top"><h1>Today</h1><div class="flex" style="flex:none"><span class="chip">⚡ ${streak()}</span><span class="chip" onclick="push('levelinfo')">Lv ${L.lvl}</span></div></div>
 <div class="datenav"><button class="iconbtn" onclick="shiftDay(-1)">‹</button><div><b>${isT?'Today':dd.toLocaleDateString(undefined,{weekday:'long'})}</b><small>${dd.toLocaleDateString(undefined,{weekday:'long',month:'short',day:'numeric'})}</small></div><button class="iconbtn" style="opacity:${isT?.3:1}" onclick="shiftDay(1)">›</button></div>
 ${isT?fastCard():''}
 ${sec('✅ Must do','Required')}<div class="list stagger">
 ${row({done:k>=t.kcal*.85&&k<=t.kcal*1.05,e:'🥗',bg:'#dcfce7',t:'Food',s:`${k.toLocaleString()} of ${t.kcal.toLocaleString()} kcal · ${sum(f,2)}/${t.protein} g protein`,p:k/t.kcal,on:"go('meals')"})}
 ${row({done:water>=t.water,e:'💧',bg:'#e0f2fe',t:'Water',s:`${water.toLocaleString()} of ${t.water.toLocaleString()} ml`,p:water/t.water,on:'addWater(250)',right:`<button class="btn sm" onclick="event.stopPropagation();addWater(250)">+250</button>`})}
 ${wrow}
 ${cReq?row({done:cDone,e:'🏃',bg:'#fce7f3',t:'Cardio (required today)',s:cDone?'Done — heart says thanks ❤️':'20–30 min run/walk or 10,000 steps',on:"go('run')"}):''}</div>
 ${sec('🌿 Optional')}<div class="list">
 ${cReq?'':row({done:steps>=t.steps,e:'👟',bg:'#fce7f3',t:'Walk',s:`${steps.toLocaleString()} of ${t.steps.toLocaleString()} steps`,p:steps/t.steps,on:"go('run')"})}
 ${row({done:wIn,e:'⚖️',bg:'#ede9fe',t:'Weigh-in',s:wIn?`${S.weights.filter(w=>iso(w[0])===d).at(-1)[1]} kg logged`:'Track your progress',on:'weighIn()'})}</div>
 ${sec(`🗓️ This week · ${SPLITS[W.split].name}`,`<span onclick="push('splits')" style="color:var(--acc);cursor:pointer">Change</span>`)}<div class="card" style="padding:10px">${weekStrip()}</div>
 ${qs.length?`${sec('🏆 Long-term quests','No rush — keep training')}<div class="list">${qs.map(q=>`<div class="row" onclick="push('quest','${q.id}')"><div class="tile" style="background:#fef3c7">${q.icon}</div><div class="rbody"><b>${escT(q.name)}</b><small>Next: ${esc(stepLbl(q.steps[q.i]))} · ${q.i}/${q.steps.length}</small><div class="prog"><i style="width:${q.i/q.steps.length*100}%"></i></div></div><span class="chev">›</span></div>`).join('')}</div>`:''}
 ${sec('📚 Learn','<span onclick="push(\'learn\')" style="color:var(--acc);cursor:pointer">See all</span>')}
 ${(()=>{const a=ARTICLES[dayIdx()%ARTICLES.length],i=ARTICLES.indexOf(a);return`<div class="row card" style="margin:0" onclick="push('article',${i})"><div class="tile" style="background:#fff7ed">${a[0]}</div><div class="rbody"><b>${a[1]}</b><small>Article of the day · ${a[2]} min</small></div><span class="chev">›</span></div>`})()}
 ${sciCard(SCIENCE[dayIdx()%SCIENCE.length],'🔬 Science tip of the day')}
 <div class="sec">💡 Tips for you</div>${tips().slice(0,3).map(x=>`<div class="tip">${x}</div>`).join('')}`};

// Settings additions: Learn + Reminders rows.
const _settings=V.settings;
V.settings=()=>_settings().replace('<div class="row" onclick="push(\'science\')">',`<div class="row" onclick="push('notifs')"><span style="font-size:22px">🔔</span><div class="rbody"><b>Reminders</b><small>Water, meals, fasting, workouts, after-meal walks</small></div><span class="chev">›</span></div>
 <div class="row" onclick="push('learn')"><span style="font-size:22px">📚</span><div class="rbody"><b>Learn</b><small>${ARTICLES.length} articles + science library</small></div><span class="chev">›</span></div>
 <div class="row" onclick="push('science')">`);

// Re-schedule reminders after things that change the plan.
const _finishW=finishW;finishW=function(){_finishW();reconcileCardio();save();schedNotifs()};

if(S.profile)ensureWeek();
schedNotifs();
render('fade');
