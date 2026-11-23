// RepWise rank themes in the app: the theme provider (tokens → CSS variables, live, with a short transition),
// per-rank surface styles, appearance settings (mode, reduce effects, sound, dev preview) and the overall-rank
// screens: home progress card, "What moves my rank", rank history, gallery and the rank-up ceremony.
const RT=window.RWThemes,RRK=window.RWRank,RCF=window.RWRankConfig;
S.ui={mode:'system',reduceFx:false,sound:false,previewRank:null,...(S.ui||{})};
// A preview saved for a rank that's no longer on the ladder (e.g. after renaming ranks) is dropped.
if(S.ui.previewRank&&!RT.THEMES[S.ui.previewRank])S.ui.previewRank=null;

// ================= OVERALL RANK (from the score engine) =================
let RK_MEMO=null;
function overallRank(){if(!S.profile)return null;const key=[today(),S.workouts.length,Object.keys(S.food).length,(S.food[today()]||[]).length,S.fast?.on,(S.fastLog||[]).length,S.week?.n].join('|');
 if(RK_MEMO&&RK_MEMO.key===key)return RK_MEMO.r;
 const first=[S.profile.setTs,...S.workouts.map(w=>w.ts)].filter(Boolean).sort((a,b)=>a-b)[0]||Date.now(),start=iso(Math.max(first,Date.now()-730*864e5));
 const r=RRK.compute({workouts:S.workouts,food:S.food,fastOn:!!S.fast?.on,fastLog:S.fastLog||[],perWeek:S.week?.n||S.trainDays?.[S.split]||3,kcalTarget:targets()?.kcal||2000,start,today:today()});
 RK_MEMO={key,r};return r}
const rankId=()=>{const id=S.ui.previewRank||overallRank()?.rank.rank;return RT.THEMES[id]?id:'iron'};
const RANK_NAME=id=>(RCF.CONFIG.ladder.find(r=>r.id===id)||{}).name||id;

// ================= THEME PROVIDER =================
const sysDark=()=>window.matchMedia?.('(prefers-color-scheme: dark)').matches;
const themeMode=()=>S.ui.mode==='system'?(sysDark()?'dark':'light'):S.ui.mode;
// Heavy effects only when allowed: not reduced (setting or OS), effects level, and a capable device.
const fxLevel=id=>{const t=RT.THEMES[id]||RT.THEMES.iron;if(S.ui.reduceFx||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return 0;const mem=navigator.deviceMemory||4,cpu=navigator.hardwareConcurrency||4;return Math.min(t.effects,mem<3||cpu<4?1:3)};
let THEME_ON=null;
function applyTheme(anim){const id=rankId(),mode=themeMode(),key=id+mode+S.ui.reduceFx;if(THEME_ON===key)return;const first=THEME_ON==null;THEME_ON=key;
 const root=document.documentElement,v=RT.vars(id,mode);if(anim&&!first&&fxLevel(id)>0){root.classList.add('th-anim');setTimeout(()=>root.classList.remove('th-anim'),450)}
 for(const k in v)root.style.setProperty(k,v[k]);
 document.body.dataset.rank=id;document.body.dataset.mode=mode;document.body.dataset.fx=String(fxLevel(id));
 document.querySelector('meta[name=theme-color]')?.setAttribute('content',v['--bg'])}
window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener?.('change',()=>{if(S.ui.mode==='system'){THEME_ON=null;applyTheme(true)}});
// Haptics follow the theme; sound is off unless turned on (a short synthesized chime, no files).
function themeHaptic(){try{vib(RT.THEMES[rankId()].haptic)}catch(e){}}
function themeChime(big){if(!S.ui.sound)return;try{const A=new (window.AudioContext||window.webkitAudioContext)(),now=A.currentTime;(big?[523,659,784,1047]:[659,880]).forEach((f,i)=>{const o=A.createOscillator(),g=A.createGain();o.frequency.value=f;o.type='triangle';g.gain.setValueAtTime(0,now+i*.12);g.gain.linearRampToValueAtTime(.12,now+i*.12+.02);g.gain.exponentialRampToValueAtTime(.001,now+i*.12+.5);o.connect(g).connect(A.destination);o.start(now+i*.12);o.stop(now+i*.12+.55)})}catch(e){}}

// ================= BADGES (original art; Olympian has no image so it's drawn) =================
// Badges reuse the rank art in img/ranks (the same images as the per-muscle ranks).
const ovBadge=(id,s=40)=>`<img src="img/ranks/${id}.png" width="${s}" height="${s}" alt="${RANK_NAME(id)}" style="object-fit:contain;display:block">`;

// ================= HOME: progress to the next rank =================
function rankCard(){const r=overallRank();if(!r)return'';const id=r.rank.rank,n=r.next;
 return`<div class="rk-card" onclick="push('rank')" role="button" aria-label="Overall rank ${esc(r.rank.name)}">${ovBadge(id,52)}<div class="rk-body"><small>Overall rank</small><b class="rk-name">${esc(r.rank.name)}</b>
 <div class="rk-bar"><i style="width:${Math.round(r.progress*100)}%"></i></div><small>${n?`${r.toNext.toLocaleString()} pts to ${esc(n.name)} · today +${Math.round(r.today)}`:'Top rank — keep it'}</small></div><span class="chev">›</span></div>`}

// ================= RANK SCREEN: progress · what moves it · history =================
V.rank=()=>{const r=overallRank(),b=r.breakdown,W=RCF.CONFIG.weights,lbl={consistency:'Training consistency',overload:'Progressive overload',fasting:'Fasting adherence',logging:'Meal logging',streak:'Streak'};
 return`<div class="top">${backBtn()}<h1 style="font-size:22px;flex:1;margin-left:var(--s1)">Overall rank</h1><span></span></div>
 <div class="rk-hero">${ovBadge(r.rank.rank,120)}<div class="t-display rk-big">${esc(r.rank.name)}</div><p class="muted">${r.points.toLocaleString()} points${r.next?` · ${r.toNext.toLocaleString()} to ${esc(r.next.name)}`:''}</p><div class="rk-bar big"><i style="width:${Math.round(r.progress*100)}%"></i></div></div>
 <div class="sec">What moves my rank</div><div class="card">${Object.keys(W).map(k=>{const x=b[k];return`<div class="rk-row"><div><b>${lbl[k]}</b><small>${esc(x.explain)}</small></div><span class="rk-pct">${x.avg==null?'off':x.avg+'%'}<small>${Math.round(W[k]*100)}% weight</small></span></div><div class="rk-mini"><i style="width:${x.avg||0}%"></i></div>`}).join('')}
 <p class="t-caption" style="margin-top:var(--s1)">Each day scores up to ${RCF.CONFIG.dailyCap} points from these, averaged over the last 7–14 days. Today: <b>${Math.round(r.today)}</b>. Duplicate or implausible logs don't count.</p></div>
 ${r.lowDays?`<div class="tip">⚠️ Your 14-day average is low. ${RCF.CONFIG.demotion.graceDays-r.lowDays} more low days and you drop one tier — any good day resets this.</div>`:''}
 <div class="sec">Rank history</div>${r.history.length?`<div class="rk-tl">${r.history.slice().reverse().map(h=>`<div class="rk-ev ${h.event}"><i></i><div><b>${h.event==='up'?'Reached':'Dropped to'} ${esc(h.name)}</b><small>${new Date(h.date+'T12:00').toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})}</small></div></div>`).join('')}</div>`:'<div class="empty">Your rank-ups will show here.</div>'}
 <button class="btn sec2" style="margin-top:var(--s2)" onclick="push('rankgallery')">See every rank's look</button><div style="height:var(--s4)"></div>`};

// ================= GALLERY: preview every rank's look (locked ranks as teasers) =================
V.rankgallery=()=>{const cur=RT.ORDER.indexOf(overallRank()?.rank.rank||'iron'),mode=themeMode();
 return`<div class="top">${backBtn()}<h1 style="font-size:22px;flex:1;margin-left:var(--s1)">Ranks</h1><span></span></div><p class="muted" style="margin-top:-6px">Each rank changes the whole app's look. The higher you climb, the richer it gets.</p>
 ${RT.ORDER.map((id,i)=>{const t=RT.THEMES[id],v=RT.vars(id,mode),st=Object.entries(v).map(([k,x])=>`${k}:${x}`).join(';'),locked=i>cur&&!S.ui.devThemes;
  return`<div class="rk-g ${locked?'locked':''}" data-rank="${id}" style="${st}"><div class="rk-g-in">${ovBadge(id,56)}<div style="flex:1;min-width:0"><b class="rk-g-n">${t.name}</b><small>${esc(t.look)}</small>
  <div class="rk-g-mock"><span class="rk-g-btn">Start</span><span class="rk-g-chip">+120 XP</span><div class="rk-bar"><i style="width:${40+i*7}%"></i></div></div></div></div>
  ${locked?`<div class="rk-lock">🔒 Reach ${t.name} to unlock</div>`:i===cur?'<div class="rk-here">Your rank</div>':''}
  ${S.ui.devThemes?`<button class="btn sm sec2" onclick="S.ui.previewRank='${id}';save();THEME_ON=null;applyTheme(true);render()">Preview</button>`:''}</div>`}).join('')}<div style="height:var(--s4)"></div>`};

// ================= RANK-UP CEREMONY (themed; richer for higher ranks) =================
S.ovSeen??=null;
function checkOverallRankUp(){const r=overallRank();if(!r)return;if(S.ovSeen==null){S.ovSeen=r.step;save();return}
 if(r.step>S.ovSeen&&!S.active&&!document.querySelector('.w-over')){const from=S.ovSeen;S.ovSeen=r.step;save();rankCeremony(r.rank,from)}else if(r.step<S.ovSeen){S.ovSeen=r.step;save()}}
function rankCeremony(step,from){const id=step.rank,lvl=fxLevel(id),open=()=>{THEME_ON=null;applyTheme(true);const el=document.createElement('div');el.className=`w-over rk-cer fx${lvl}`;el.dataset.rank=id;el.setAttribute('role','dialog');
 el.innerHTML=`${lvl>=2?'<div class="rk-beams" aria-hidden="true"></div>':''}${lvl>=3?`<div class="rk-sparks" aria-hidden="true">${'<i></i>'.repeat(18)}</div>`:''}
  <div class="rk-cer-badge">${ovBadge(id,170)}</div><div class="t-caption rk-cer-k">New rank</div><div class="t-display rk-cer-t">${esc(step.name)}</div>
  <p class="muted">${esc(RT.THEMES[id].look)}</p><button class="btn" style="margin-top:var(--s3);width:100%;max-width:320px">Let's go</button>`;
 el.querySelector('.btn').onclick=()=>{el.remove();render()};document.body.appendChild(el);themeHaptic();themeChime(lvl>=2)};
 if(window.Pop)Pop.show('rankup',open);else open()}
window.rankCeremony=rankCeremony;
// The old XP-based "overall" pop-up would compete with this ladder; per-muscle rank-ups stay.
const _rquT=window.rankQueueUpdate;if(_rquT)window.rankQueueUpdate=function(){_rquT();S.rankQ=(S.rankQ||[]).filter(x=>x.k!=='overall')};

// ================= APPEARANCE SETTINGS =================
V.appearance=()=>{const U=S.ui,seg=(k,opts)=>`<div class="cd-seg">${opts.map(([v,l])=>`<button class="${U[k]===v?'on':''}" onclick="S.ui.${k}='${v}';save();THEME_ON=null;applyTheme(true);render()">${l}</button>`).join('')}</div>`,sw=(k,l,s)=>`<div class="afrow"><span>${l}<small class="t-caption" style="display:block;font-weight:400">${s}</small></span><button class="sw ${U[k]?'on':''}" role="switch" aria-checked="${!!U[k]}" aria-label="${l}" onclick="S.ui.${k}=!S.ui.${k};save();THEME_ON=null;applyTheme(true);render()"><i></i></button></div>`;
 return`<div class="top">${backBtn()}<h1 style="font-size:22px;flex:1;margin-left:var(--s1)">Appearance</h1><span></span></div>
 <div class="card"><b>Theme: ${RANK_NAME(rankId())}</b><p class="t-caption" style="margin-top:4px">Your overall rank sets the app's look. Climb to unlock richer themes.</p></div>
 <div class="sec">Mode</div>${seg('mode',[['system','System'],['dark','Dark'],['light','Light']])}
 <div class="card" style="margin-top:var(--s2)">${sw('reduceFx','Reduce effects','Turns off animation, glow, shimmer and particles')}${sw('sound','Sounds','A short chime on rank-ups (off by default)')}</div>
 <details style="margin-top:var(--s2)"><summary class="t-caption">Developer</summary><div class="card">${sw('devThemes','Preview every rank','Unlocks previews in the Ranks gallery without earning them')}
 ${U.devThemes?`<div class="afsec">Preview theme</div><div class="chips">${RT.ORDER.map(id=>`<button class="${U.previewRank===id?'on':''}" onclick="S.ui.previewRank=${U.previewRank===id?'null':`'${id}'`};save();THEME_ON=null;applyTheme(true);render()">${RT.THEMES[id].name}</button>`).join('')}</div><button class="btn sm sec2" style="margin-top:var(--s1)" onclick="rankCeremony(RWRankConfig.steps().find(s=>s.rank===rankId()),0)">Play rank-up ceremony</button>`:''}</div></details>`};
const _setTh=V.settings;V.settings=()=>_setTh().replace(/(<div class="row" onclick="push\('notifs'\)">)/,`<div class="row" onclick="push('appearance')"><span style="font-size:22px">🎨</span><div class="rbody"><b>Appearance</b><small>Rank theme, dark mode, reduce effects</small></div><span class="chev">›</span></div><div class="row" onclick="push('rank')"><span style="font-size:22px">🏅</span><div class="rbody"><b>Overall rank</b><small>Progress, what moves it, history, all ranks</small></div><span class="chev">›</span></div>$1`);
// Home: the rank card goes right under the greeting.
const _planTh=V.plan;V.plan=()=>{const h=_planTh();if(viewDate!==today()||!S.profile)return h;const k=h.indexOf('<div class="datenav">');return k>=0?h.slice(0,k)+rankCard()+h.slice(k):rankCard()+h};
// Every render keeps the theme in sync with the rank and checks for a rank-up.
const _rdTh=render;render=function(...a){applyTheme(true);const x=_rdTh.apply(this,a);try{if(!S.active&&stack.at(-1)?.[0]!=='player')setTimeout(checkOverallRankUp,800)}catch(e){}return x};

document.head.insertAdjacentHTML('beforeend',`<style>
html.th-anim body,html.th-anim .card,html.th-anim .list,html.th-anim .row,html.th-anim .btn,html.th-anim #nav{transition:background-color .4s ease,color .4s ease,border-color .4s ease}
.t-display,.top h1{font-family:var(--font-display);text-transform:var(--tt-display);letter-spacing:var(--ls-display)}
.rk-card{display:flex;align-items:center;gap:12px;background:var(--surface);border:1px solid var(--line);border-radius:var(--r-card);padding:12px 14px;margin:6px 0 10px;cursor:pointer;min-height:44px}
.rk-body{flex:1;min-width:0}.rk-body small{display:block;color:var(--ink-2);font-size:12px}.rk-name{display:block;font-size:18px;font-family:var(--font-display);text-transform:var(--tt-display)}
.rk-bar{height:8px;border-radius:4px;background:var(--fill);overflow:hidden;margin:6px 0 4px}.rk-bar i{display:block;height:100%;background:var(--accent);border-radius:4px}.rk-bar.big{height:12px;margin:var(--s2) auto 0;max-width:360px}
.rk-hero{text-align:center;padding:var(--s2) 0}.rk-hero img,.rk-hero svg{margin:0 auto}.rk-big{margin-top:var(--s1)}
.rk-row{display:flex;justify-content:space-between;gap:12px;align-items:center;padding-top:12px}.rk-row small{display:block;color:var(--ink-2);font-size:12px}.rk-pct{text-align:right;font-weight:800;font-variant-numeric:tabular-nums}.rk-pct small{font-weight:500}
.rk-mini{height:6px;border-radius:3px;background:var(--fill);margin-top:6px;overflow:hidden}.rk-mini i{display:block;height:100%;background:var(--accent)}
.rk-tl{display:grid;gap:0;border-left:2px solid var(--line);margin-left:8px;padding-left:16px}.rk-ev{position:relative;padding:8px 0}.rk-ev i{position:absolute;left:-23px;top:13px;width:12px;height:12px;border-radius:50%;background:var(--accent)}.rk-ev.down i{background:var(--danger)}.rk-ev small{display:block;color:var(--ink-2);font-size:12px}
.rk-g{background:var(--bg);color:var(--ink);border:1px solid var(--line);border-radius:var(--r-card);padding:14px;margin-top:12px;position:relative;overflow:hidden}
.rk-g-in{display:flex;gap:12px;align-items:flex-start}.rk-g small{display:block;color:var(--ink-2);font-size:13px;margin-top:2px}.rk-g-n{font-family:var(--font-display);text-transform:var(--tt-display);font-size:20px}
.rk-g-mock{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:10px;background:var(--surface);border-radius:var(--r-card);padding:10px}.rk-g-mock .rk-bar{flex:1 1 100%}
.rk-g-btn{background:var(--accent);color:var(--on-accent);border-radius:var(--r-btn);padding:6px 14px;font-weight:800;font-size:13px}.rk-g-chip{background:var(--fill);color:var(--ink);border-radius:var(--r-chip);padding:4px 10px;font-size:12px;font-weight:700}
.rk-g.locked .rk-g-in{filter:blur(2px) saturate(.6);opacity:.7}.rk-lock,.rk-here{margin-top:10px;font-weight:700;font-size:13px}.rk-here{color:var(--accent)}
.rk-cer{text-align:center;overflow:hidden}.rk-cer-badge{position:relative;z-index:1;animation:rkPop .7s cubic-bezier(.2,1.4,.4,1) both}.rk-cer-k{margin-top:var(--s2);text-transform:uppercase;letter-spacing:.14em;font-weight:800;color:var(--accent)}
.rk-cer-t{font-size:40px;margin-top:6px;position:relative;z-index:1}.rk-cer p{position:relative;z-index:1;max-width:340px}
.rk-beams{position:absolute;inset:-20%;background:conic-gradient(from 200deg at 50% -10%,transparent 0deg,color-mix(in srgb,var(--accent) 22%,transparent) 8deg,transparent 16deg,transparent 30deg,color-mix(in srgb,var(--accent) 16%,transparent) 38deg,transparent 46deg);animation:rkSway 6s ease-in-out infinite alternate;pointer-events:none}
.rk-sparks i{position:absolute;width:6px;height:6px;border-radius:50%;background:var(--accent);opacity:0;animation:rkSpark 2.4s ease-out infinite}
${[...Array(18)].map((_,i)=>`.rk-sparks i:nth-child(${i+1}){left:${(i*53)%100}%;top:${20+(i*37)%60}%;animation-delay:${(i%6)*.35}s}`).join('')}
@keyframes rkPop{from{transform:scale(.3) rotate(-10deg);opacity:0}to{transform:none;opacity:1}}@keyframes rkSway{to{transform:rotate(8deg)}}@keyframes rkSpark{0%{opacity:0;transform:scale(.2)}30%{opacity:1}100%{opacity:0;transform:translateY(-40px) scale(1.2)}}

/* ---------- per-rank surfaces (layouts identical; only the visual language changes) ---------- */
body[data-rank=master] .card,body[data-rank=master] .list,body[data-rank=master] .rk-card{border:1px solid color-mix(in srgb,var(--accent) 35%,transparent);box-shadow:0 0 0 1px color-mix(in srgb,var(--accent) 8%,transparent),0 10px 30px color-mix(in srgb,var(--accent) 12%,transparent);background-image:linear-gradient(150deg,color-mix(in srgb,var(--accent) 9%,transparent),transparent 45%)}
body[data-rank=master][data-fx="3"] .rk-card img,body[data-rank=master][data-fx="3"] .rk-hero img{filter:drop-shadow(0 0 12px color-mix(in srgb,var(--accent) 55%,transparent))}
body[data-rank=master] .t-display,body[data-rank=master] .top h1{background:linear-gradient(100deg,var(--ink) 20%,var(--accent-2) 50%,var(--ink) 80%);-webkit-background-clip:text;background-clip:text;color:transparent}
body[data-rank=grandmaster] .card,body[data-rank=grandmaster] .list,body[data-rank=grandmaster] .rk-card{border:1px solid color-mix(in srgb,var(--accent) 30%,var(--line));box-shadow:inset 0 -2px 0 color-mix(in srgb,var(--accent) 45%,transparent),0 12px 30px color-mix(in srgb,var(--bg) 70%,transparent);background-image:radial-gradient(120% 60% at 50% 120%,color-mix(in srgb,var(--accent) 16%,transparent),transparent 60%)}
body[data-rank=grandmaster] .btn:not(.sec2),body[data-rank=grandmaster] .rk-bar i{background:linear-gradient(90deg,var(--accent),var(--accent-2))}
body[data-rank=grandmaster][data-fx="3"] #app::before{content:"";position:fixed;inset:auto -20% -20% -20%;height:50vh;background:radial-gradient(closest-side,color-mix(in srgb,var(--accent) 14%,transparent),transparent);pointer-events:none;z-index:0;animation:rkSway 7s ease-in-out infinite alternate}
body[data-rank=iron] .card,body[data-rank=iron] .list,body[data-rank=iron] .rk-card{background-image:radial-gradient(circle at 9px 9px,var(--ink-3) 1.6px,transparent 2.2px),radial-gradient(circle at calc(100% - 9px) 9px,var(--ink-3) 1.6px,transparent 2.2px),radial-gradient(circle at 9px calc(100% - 9px),var(--ink-3) 1.6px,transparent 2.2px),radial-gradient(circle at calc(100% - 9px) calc(100% - 9px),var(--ink-3) 1.6px,transparent 2.2px),repeating-linear-gradient(90deg,color-mix(in srgb,var(--ink) 3%,transparent) 0 1px,transparent 1px 3px);border:1px solid var(--line)}
body[data-rank=bronze] .card,body[data-rank=bronze] .list,body[data-rank=bronze] .rk-card{box-shadow:inset 0 1px 0 color-mix(in srgb,var(--ink) 10%,transparent),inset 0 -2px 0 color-mix(in srgb,var(--bg) 60%,transparent),0 2px 8px color-mix(in srgb,var(--bg) 60%,transparent);background-image:radial-gradient(120% 80% at 90% 0%,color-mix(in srgb,var(--accent-2) 10%,transparent),transparent 60%)}
body[data-rank=bronze] .btn:not(.sec2),body[data-rank=bronze] .rk-bar i{background:linear-gradient(135deg,var(--accent),var(--accent-2))}
body[data-rank=silver] .card,body[data-rank=silver] .list,body[data-rank=silver] .rk-card{border:1px solid var(--line);background-image:linear-gradient(115deg,transparent 30%,color-mix(in srgb,var(--ink) 6%,transparent) 45%,transparent 60%);background-attachment:fixed}
body[data-rank=gold] .t-display,body[data-rank=gold] .top h1,body[data-rank=gold] .rk-name{background:linear-gradient(100deg,var(--accent) 10%,var(--accent-2) 45%,var(--accent) 80%);-webkit-background-clip:text;background-clip:text;color:transparent}
body[data-rank=gold] .card,body[data-rank=gold] .list,body[data-rank=gold] .rk-card{box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--accent) 40%,transparent),inset 0 0 0 4px var(--surface),inset 0 0 0 5px color-mix(in srgb,var(--accent) 18%,transparent)}
body[data-rank=gold][data-fx="2"] .t-display,body[data-rank=gold][data-fx="3"] .t-display{background-size:200% 100%;animation:rkShim 5s linear infinite}
@keyframes rkShim{to{background-position:-200% 0}}
body[data-rank=platinum] .card,body[data-rank=platinum] .list,body[data-rank=platinum] .rk-card{background:color-mix(in srgb,var(--surface) 78%,transparent);border:1px solid color-mix(in srgb,var(--accent) 35%,transparent);box-shadow:0 0 0 1px color-mix(in srgb,var(--accent) 10%,transparent),0 8px 30px color-mix(in srgb,var(--bg) 50%,transparent)}
body[data-rank=platinum][data-fx="2"] .card,body[data-rank=platinum][data-fx="3"] .card{-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px)}
body[data-rank=platinum]{background-image:linear-gradient(160deg,var(--bg),color-mix(in srgb,var(--accent) 8%,var(--bg)))}
body[data-rank=diamond] .card,body[data-rank=diamond] .rk-card{clip-path:polygon(14px 0,100% 0,100% calc(100% - 14px),calc(100% - 14px) 100%,0 100%,0 14px);background-image:linear-gradient(135deg,color-mix(in srgb,var(--accent) 10%,transparent),transparent 35%,color-mix(in srgb,var(--accent-2) 10%,transparent) 70%,transparent)}
body[data-rank=diamond] .list{border:1px solid color-mix(in srgb,var(--accent) 30%,transparent)}
body[data-rank=diamond][data-fx="3"] .rk-card img,body[data-rank=diamond][data-fx="3"] .rk-hero img{filter:drop-shadow(0 0 10px color-mix(in srgb,var(--accent) 60%,transparent))}
body[data-rank=legend] .card,body[data-rank=legend] .list,body[data-rank=legend] .rk-card{background-image:linear-gradient(115deg,transparent 0 40%,color-mix(in srgb,var(--ink-3) 8%,transparent) 41%,transparent 43%),linear-gradient(35deg,transparent 0 62%,color-mix(in srgb,var(--ink-3) 6%,transparent) 63%,transparent 64%);border:1px solid color-mix(in srgb,var(--accent) 30%,var(--line))}
body[data-rank=legend][data-fx="3"] #app::before{content:"";position:fixed;left:50%;top:-30vh;width:120vw;height:90vh;transform:translateX(-50%);background:radial-gradient(closest-side,color-mix(in srgb,var(--accent) 14%,transparent),transparent);pointer-events:none;z-index:0}
body[data-rank=legend] .top h1::after{content:" \\2766";color:var(--accent);font-size:.6em;vertical-align:.2em}
body[data-rank=arnold] .t-display{font-size:calc(var(--fs-display) * 1.2)}
body[data-rank=arnold] .card,body[data-rank=arnold] .list,body[data-rank=arnold] .rk-card{border:2px solid color-mix(in srgb,var(--accent) 35%,var(--line));box-shadow:inset 0 2px 0 color-mix(in srgb,var(--accent) 25%,transparent),inset 0 -3px 0 color-mix(in srgb,var(--bg) 80%,transparent),0 10px 30px color-mix(in srgb,var(--bg) 80%,transparent)}
body[data-rank=arnold] .btn:not(.sec2){background:linear-gradient(180deg,var(--accent-2),color-mix(in srgb,var(--accent-2) 70%,var(--bg)));color:var(--ink);text-transform:uppercase;letter-spacing:.06em;font-family:var(--font-display);border:1px solid color-mix(in srgb,var(--accent) 40%,transparent)}
body[data-rank=arnold] .rk-bar i,body[data-rank=arnold] .bar i{background:repeating-linear-gradient(90deg,var(--accent) 0 16px,color-mix(in srgb,var(--accent) 45%,var(--bg)) 16px 20px)}
body[data-rank=arnold][data-fx="3"] #app::before{content:"";position:fixed;inset:-10% -30% auto;height:80vh;background:conic-gradient(from 160deg at 50% 0%,transparent 0 12deg,color-mix(in srgb,var(--accent) 10%,transparent) 18deg,transparent 26deg 34deg,color-mix(in srgb,var(--accent) 8%,transparent) 40deg,transparent 48deg);pointer-events:none;z-index:0;animation:rkSway 9s ease-in-out infinite alternate}
#app>*{position:relative;z-index:1}
/* icon tiles: pastel squares only work on light themes; in dark mode they take the theme's fill with an accent icon */
.tile{color:var(--ink)}.tile .ic,.tile svg{color:inherit;stroke:currentColor}
body[data-mode=dark] .tile{background:var(--fill)!important;color:var(--accent)}
body[data-mode=dark] .check{border-color:var(--ink-3)}
nav button.on{color:var(--accent)}
body[data-fx="0"] *,body[data-fx="0"] *::before,body[data-fx="0"] *::after{animation:none!important;transition:none!important}
body[data-fx="0"] .card,body[data-fx="0"] .list{-webkit-backdrop-filter:none!important;backdrop-filter:none!important}
</style>`);
applyTheme(false);
if(typeof render==='function')render();
