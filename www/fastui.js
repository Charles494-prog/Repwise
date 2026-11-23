// RepWise fasting layer: warnings only for meals logged OUTSIDE the eating window you set.
// Bug fixed here: eating outside the window used to "restart" the fast for a full fasting period, so the next day's
// meal inside the real window (e.g. 12:57 with a 12:00 window) was treated as another break and counted again.
// Now the window is always the one in your settings; late starts are an optional, gentle insight.
const RF=window.RWFast;
S.fast.grace??=60;S.fast.lateInsight??=true;delete S.fast.reset;
S.fastLog=RF.migrateLog(S.fastLog,S.fast.start,RF.eatHours(S.fast.proto));
const fastNow=()=>RF.classify(Date.now(),S.fast.start,RF.eatHours(S.fast.proto),S.fast.grace);
// Timer state for the fasting card / notifications: always from the configured window.
fastState=function(now=new Date()){const c=RF.classify(now,S.fast.start,RF.eatHours(S.fast.proto),S.fast.grace);
 return c.inWindow?{open:true,left:c.minsToClose/60}:{open:false,left:c.minsUntilOpen/60}};
const hmTxt=m=>{m=Math.round(m);const h=Math.floor(m/60),r=m%60;return h?`${h} h${r?` ${r} min`:''}`:`${r} min`};
// A supportive note waits until the meal is logged, then shows once (through the pop-up queue when it exists).
let FAST_NOTE=null;
fastOK=function(){if(!S.fast.on||viewDate!==today())return true;const c=fastNow(),w=fastWin();
 if(c.inWindow){if(S.fast.lateInsight&&c.late&&S.fast.lateSeen!==today()){S.fast.lateSeen=today();FAST_NOTE={kind:'late',mins:c.minsAfterOpen}}return true}
 const msg=c.side==='before'?`Your eating window opens at ${hh(w.st)} — in ${hmTxt(c.minsUntilOpen)}.`:`Your eating window closed at ${hh(w.en)} — ${hmTxt(c.minsAfterClose)} ago.`;
 if(!confirm(`${msg}\n\nLog this meal anyway? It'll count as eating outside your window.`))return false;
 S.fastLog.push({ts:Date.now(),out:true,side:c.side});S.fastLog=S.fastLog.filter(x=>x.ts>Date.now()-60*864e5);save();
 const n=RF.weekCount(S.fastLog,Date.now());FAST_NOTE={kind:'out',n,side:c.side};return true};
function fastNoteHtml(N){const w=fastWin(),sug=RF.suggestStart(S.fastLog,Date.now(),S.fast.start,RF.eatHours(S.fast.proto));
 const shift=sug!=null&&sug!==S.fast.start?`<button class="btn" style="margin-top:var(--s2)" onclick="fastShift(${sug})">Shift my window to ${hh(sug)}</button>`:'';
 if(N.kind==='late')return`<h3 class="t-title">You broke your fast at ${new Date().toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})}</h3>
  <p class="t-body" style="margin:var(--s1) 0">That's ${hmTxt(N.mins)} after your window opened — still inside it, so it's all good. Just a heads-up in case your day runs later than your plan.</p>
  <p class="t-caption">Turn these notes off or change the ${S.fast.grace}-minute grace period in Fasting settings.</p>
  <button class="btn sec2" style="margin-top:var(--s2)" onclick="closeSheet()">OK</button><button class="aflink" onclick="closeSheet();push('fasting')">Fasting settings</button>`;
 const head=N.n>=3?`${N.n} meals outside your window this week`:`Logged outside your window`;
 const body=N.n>=3?`No stress — it happens. If your days usually run ${N.side==='after'?'late':'early'}, a window that fits them is easier to keep than one you keep fighting.`
  :`Your window is ${hh(w.st)} – ${hh(w.en)}. One meal outside it doesn't undo your progress — total calories still matter most.`;
 return`<h3 class="t-title">${head}</h3><p class="t-body" style="margin:var(--s1) 0">${body}</p>${shift?`<p class="t-caption">Based on when you've been eating lately.</p>${shift}`:''}
  <button class="btn sec2" style="margin-top:var(--s1)" onclick="closeSheet()">${shift?'Keep my window':'OK'}</button>`}
function fastShift(h){S.fast.start=h;save();try{schedFast()}catch(e){}closeSheet();render();toast(`Eating window now starts at ${hh(h)}`)}
// After the meal is logged: the note replaces the old "fast restarted" sheet.
function showFastNote(){if(!FAST_NOTE)return;const N=FAST_NOTE;FAST_NOTE=null;const html=fastNoteHtml(N);
 if(window.Pop)Pop.show('fast',()=>openSheet(html));else setTimeout(()=>openSheet(html),400)}
const _amF=afterMeal;afterMeal=function(...a){if(FAST_NOTE)return showFastNote();return _amF(...a)};
// Fasting settings: half-hour start times, late-start insight toggle and grace period.
const _vfF=V.fasting;V.fasting=()=>{const F=S.fast;let h=_vfF();
 h=h.replace(/<select onchange="S\.fast\.start=\+this\.value;save\(\);schedFast\(\);render\(\)">[\s\S]*?<\/select>/,`<select onchange="S.fast.start=+this.value;save();schedFast();render()">${Array.from({length:48},(_,i)=>i/2).map(v=>`<option value="${v}" ${v===F.start?'selected':''}>${hh(v)}</option>`).join('')}</select>`);
 const n=RF.weekCount(S.fastLog,Date.now());
 const card=`<div class="sec">🔔 Notes while fasting</div><div class="card">
  <div class="afrow"><span>Late-start insight<small class="t-caption" style="display:block;font-weight:400">A gentle note when you break your fast more than ${F.grace} min after your window opens. Never a warning.</small></span><button class="sw ${F.lateInsight?'on':''}" role="switch" aria-checked="${F.lateInsight}" aria-label="Late-start insight" onclick="S.fast.lateInsight=!S.fast.lateInsight;save();render()"><i></i></button></div>
  <div class="afrow"><span>Grace period</span><span class="afstep"><button aria-label="Shorter" onclick="S.fast.grace=Math.max(15,S.fast.grace-15);save();render()">−</button><b>${F.grace} min</b><button aria-label="Longer" onclick="S.fast.grace=Math.min(240,S.fast.grace+15);save();render()">+</button></span></div>
  <p class="t-caption" style="margin-top:var(--s1)">Only meals logged before your window opens or after it closes count as outside it${n?` — ${n} this week`:''}.</p></div>`;
 const k='<div class="sec">⏳ Hour by hour';return h.includes(k)?h.replace(k,card+k):h+card};
