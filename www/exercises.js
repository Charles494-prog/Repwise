// RepWise custom exercises (muscle targets with sub-muscles, primary / secondary) and exercise groups.
// Custom exercises keep the built-in shape EX[name] = [primary parents, secondary parents, emoji] so every
// existing screen (routines, logging, history, XP, ranks) keeps working; the 4th slot holds the exact targets.
// Sub-muscles roll up to their parent muscle for XP, ranks, weekly balance and recovery.

// ================= MUSCLE CATALOGUE =================
const SUBM={
 Chest:[['upper','Upper chest'],['mid','Mid chest'],['lower','Lower chest']],
 Back:[['lats','Lats'],['upper','Upper back & traps'],['lower','Lower back']],
 Shoulders:[['front','Front delt'],['side','Side delt'],['rear','Rear delt']],
 Biceps:[['long','Long head'],['short','Short head'],['brachialis','Brachialis']],
 Triceps:[['long','Long head'],['lateral','Lateral head'],['medial','Medial head']],
 Forearms:[['flexors','Flexors (grip)'],['extensors','Extensors']],
 Quads:[['rf','Rectus femoris'],['vl','Outer quad'],['vm','Inner quad (teardrop)']],
 Hamstrings:[['bf','Outer (biceps femoris)'],['inner','Inner hamstrings']],
 Glutes:[['max','Glute max'],['med','Glute med']],
 Calves:[['gastro','Gastrocnemius'],['soleus','Soleus']],
 Core:[['abs','Abs'],['obliques','Obliques'],['deep','Deep core']],
};
const muscleOf=t=>String(t).split('.')[0];
const targetLabel=t=>{const [m,s]=String(t).split('.');if(!s)return m;const x=(SUBM[m]||[]).find(y=>y[0]===s);return x?`${m} (${x[1].toLowerCase()})`:m};
// [{m:'Triceps.long',r:'p'},{m:'Forearms',r:'s'}] → [['Triceps'],['Forearms']] (primary wins over secondary)
function exParents(t){const pri=[...new Set(t.filter(x=>x.r==='p').map(x=>muscleOf(x.m)))],sec=[...new Set(t.filter(x=>x.r==='s').map(x=>muscleOf(x.m)))].filter(m=>!pri.includes(m));return[pri,sec]}
const exTargets=e=>{const d=EX[e];if(!d)return[];if(d[3]?.t?.length)return d[3].t;return[...d[0].map(m=>({m,r:'p'})),...d[1].map(m=>({m,r:'s'}))]};
const isMyEx=e=>!!S.customEx[e];
const exHidden=e=>!!S.customExDel[e]&&!S.customEx[e];

// ================= CUSTOM EXERCISE EDITOR (sheet) =================
const EX_EMOJI=['💪','🏋️','🤸','⬇️','🦵','🔥','🎯','🧗','🚣','🙌','🦶','⏱️','🔨','🦋'];
let EXED=null;
function exEditor(name,ret){const d=name&&S.customEx[name],t={};
 if(d)for(const x of exTargets(name))t[x.m]=x.r;
 EXED={orig:d?name:null,name:d?name:'',emoji:d?d[2]:'💪',t,open:{},ret:ret||(S.active?'use':'list')};
 for(const k in t)if(k.includes('.'))EXED.open[muscleOf(k)]=1;
 exDraw()}
function exSync(){const i=$('#exn');if(i&&EXED)EXED.name=i.value}
// Tap: none → primary → secondary → none. A whole muscle and its heads are exclusive.
function exTog(k){exSync();const t=EXED.t,nx={undefined:'p',p:'s',s:undefined}[t[k]];
 const m=muscleOf(k);if(k.includes('.'))delete t[m];else for(const x of Object.keys(t))if(x.startsWith(m+'.'))delete t[x];
 if(nx)t[k]=nx;else delete t[k];vib(8);exDraw()}
function exOpen(m){exSync();EXED.open[m]=!EXED.open[m];exDraw()}
function exEmoji(e){exSync();EXED.emoji=e;exDraw()}
function exDraw(){const E=EXED,t=E.t,st=k=>t[k]==='p'?' st-p':t[k]==='s'?' st-s':'',tag=k=>t[k]==='p'?'<em>Primary</em>':t[k]==='s'?'<em>Secondary</em>':'';
 const subOn=m=>Object.keys(t).filter(x=>x.startsWith(m+'.'));
 const list=Object.entries(t).map(([m,r])=>({m,r})),[pri,sec]=exParents(list);
 const sum=r=>list.filter(x=>x.r===r).map(x=>targetLabel(x.m)).join(', ')||'—';
 openSheet(`<h3 class="t-title">${E.orig?'Edit exercise':'New exercise'}</h3>
 <input id="exn" placeholder="Name, e.g. Band Overhead Extension" maxlength="40" value="${esc(E.name)}" style="margin-top:var(--s1)">
 <div class="exemo">${EX_EMOJI.map(e=>`<button class="${E.emoji===e?'on':''}" onclick="exEmoji('${e}')">${e}</button>`).join('')}</div>
 <div class="afsec">Target muscles</div>
 <p class="t-caption" style="margin:-4px 0 var(--s1)">Tap once for <b>primary</b> (full XP), twice for <b>secondary</b> (half XP), again to clear. Tap ▾ to pick a specific head.</p>
 <div class="exms">${MUSCLES.map(m=>{const so=subOn(m);return`<div class="exm"><div class="exm-r"><button class="exm-t${st(m)}${so.length?' st-sub':''}" onclick="exTog('${m}')"><b>${m}</b>${tag(m)||(so.length?`<em>${so.length} head${so.length>1?'s':''}</em>`:'')}</button>${SUBM[m]?`<button class="exm-x${E.open[m]?' on':''}" aria-label="Heads of ${m}" onclick="exOpen('${m}')">▾</button>`:''}</div>
  ${E.open[m]&&SUBM[m]?`<div class="exm-s">${SUBM[m].map(([k,l])=>`<button class="${st(m+'.'+k).trim()}" onclick="exTog('${m}.${k}')">${l}${tag(m+'.'+k)}</button>`).join('')}</div>`:''}</div>`}).join('')}</div>
 <div class="exsum"><div><small>Primary</small><b>${esc(sum('p'))}</b></div><div><small>Secondary</small><b>${esc(sum('s'))}</b></div></div>
 ${pri.length?`<p class="t-caption">Counts toward ${pri.join(', ')}${sec.length?` (and half for ${sec.join(', ')})`:''} — ranks, weekly balance and recovery.</p>`:''}
 <button class="btn" style="margin-top:var(--s2)" onclick="exSave()">${E.orig?'Save changes':E.ret==='use'?'Create & add':'Create exercise'}</button>
 ${E.orig?`<button class="btn sec2" style="margin-top:var(--s1);color:var(--accent)" onclick="exDelete()">Delete exercise</button>`:''}`);
 $('#sheet').classList.add('exsheet')}
function exSave(){exSync();const E=EXED,n=(E.name||'').trim().replace(/\s+/g,' ');
 if(!n)return toast('Enter a name');
 if(EX[n]&&!S.customEx[n]&&!S.customExDel[n])return toast('A built-in exercise already has that name');
 if(n!==E.orig&&S.customEx[n])return toast('You already have an exercise with that name');
 const t=Object.entries(E.t).map(([m,r])=>({m,r})),[pri,sec]=exParents(t);if(!pri.length)return toast('Pick at least one primary muscle');
 if(E.orig&&E.orig!==n)renameEx(E.orig,n);
 const def=[pri,sec,E.emoji,{...(S.customEx[n]?.[3]||{}),t}];S.customEx[n]=def;EX[n]=def;delete S.customExDel[n];save();
 toast(E.orig?`Saved ${esc(n)}`:`✨ ${esc(n)} created`);const ret=E.ret;EXED=null;
 if(ret==='use'&&S.active)return useEx(n);closeSheet();render()}
// A new name follows the exercise everywhere: history, the current workout, swaps, groups and quests.
function renameEx(a,b){const sw=x=>x===a?b:x;
 for(const w of S.workouts)for(const s of w.sets||[])if(s.ex===a)s.ex=b;
 if(S.active){S.active.list=S.active.list.map(sw);for(const s of S.active.sets)if(s.ex===a)s.ex=b}
 for(const k of Object.keys(S.subs)){if(S.subs[k]===a)S.subs[k]=b;if(k===a){S.subs[b]=S.subs[a];delete S.subs[a]}}
 if(S.goalReps&&a in S.goalReps){S.goalReps[b]=S.goalReps[a];delete S.goalReps[a]}
 for(const g of S.exGroups)g.ex=g.ex.map(sw);for(const c of S.custom||[])if(c.ex===a)c.ex=b;
 for(const k in S.ext||{})for(const st of S.ext[k]||[])if(Array.isArray(st)&&st[0]===a){st[0]=b;if(typeof st[2]==='string')st[2]=st[2].split(a).join(b)}
 delete S.customEx[a];delete EX[a]}
// Deleting hides it from the pickers and groups; past workouts keep it, so history and PRs stay intact.
function exDelete(){const n=EXED.orig;if(!confirm(`Delete “${n}”?\n\nIt's removed from the exercise list and your groups. Workouts you already logged keep it in your history.`))return;
 S.customExDel[n]=S.customEx[n];delete S.customEx[n];for(const g of S.exGroups)g.ex=g.ex.filter(e=>e!==n);
 for(const k of Object.keys(S.subs))if(S.subs[k]===n)delete S.subs[k];save();EXED=null;closeSheet();render();toast(`Deleted ${esc(n)}`)}
newExSheet=()=>exEditor(null,S.active?'use':'list');

// ================= EXERCISE GROUPS =================
// S.exGroups = [{id, name, e, ex:[names]}]. Each group is also a program ('g_<id>') so it can be started,
// swapped in for a day, or added to a session. Deleted groups stay as hidden programs so old workouts still show their name.
S.exGroups??=[];S.customExDel??={};
const GKEY=g=>'g_'+g.id,groupOf=k=>S.exGroups.find(g=>GKEY(g)===k);
const liveGroups=()=>S.exGroups.filter(g=>!g.deleted);
function groupMuscles(ex){const o={};for(const e of ex){const d=EX[e];if(!d)continue;d[0].forEach(m=>o[m]=Math.max(o[m]||0,1));d[1].forEach(m=>o[m]=Math.max(o[m]||0,.5))}return o}
// Older screens print program names without escaping, so group names never carry HTML characters.
const cleanName=n=>String(n||'').replace(/[<>"'`\\]/g,'').trim();
function regGroup(g){g.name=cleanName(g.name)||'My group';PROGS[GKEY(g)]={name:g.name,e:g.e||'🧩',bg:'var(--tile-7)',group:g.id,
 get sub(){const m=Object.entries(groupMuscles(g.ex)).filter(([,v])=>v===1).map(([k])=>k);return m.length?m.join(', '):'My group'},
 get ex(){return g.ex.filter(e=>EX[e])},get m(){return Object.entries(groupMuscles(g.ex)).filter(([,v])=>v===1).map(([k])=>k)}}}
S.exGroups.forEach(regGroup);
// Groups run exactly as built: no equipment swaps, no session-length cap.
const _plG=planList;planList=function(k){return PROGS[k]?.group?PROGS[k].ex.slice():_plG(k)};
const _progG=V.prog;V.prog=k=>{let h=_progG(k);if(!PROGS[k]?.group)return h;
 h=h.replace(/<div class="sec">Where are you training\?<\/div>[\s\S]*?(?=<div class="list|<p class="muted"|<div class="sticky)/,'');
 return h.replace('<div class="sticky">',`<button class="btn sec2" style="margin-top:var(--s2)" onclick="push('groupedit','${PROGS[k].group}')">Edit group</button><div class="sticky">`)};

let GRP=null;
V.groupedit=id=>{const g=S.exGroups.find(x=>x.id===id);if(!GRP||GRP._for!==(id||'new'))GRP={_for:id||'new',id:g?.id||null,name:g?.name||'',e:g?.e||'🧩',ex:g?[...g.ex]:[]};
 const mus=groupMuscles(GRP.ex),pri=Object.keys(mus).filter(m=>mus[m]===1),sec=Object.keys(mus).filter(m=>mus[m]<1);
 return`<div class="top">${backBtn()}<h1 style="font-size:22px;flex:1;margin-left:var(--s1)">${GRP.id?'Edit group':'New group'}</h1><span></span></div>
 <input id="grn" placeholder="Name, e.g. Home Arms Day" maxlength="40" value="${esc(GRP.name)}" oninput="GRP.name=this.value">
 <div class="exemo">${['🧩','🏠','💪','🏋️','🦵','🔥','⚡','🎯'].map(e=>`<button class="${GRP.e===e?'on':''}" onclick="GRP.e='${e}';render()">${e}</button>`).join('')}</div>
 <div class="sec">Exercises <small>${GRP.ex.length}</small></div>
 ${GRP.ex.length?`<div class="list">${GRP.ex.map((e,i)=>`<div class="row" style="cursor:default"><span style="font-size:22px">${EX[e]?.[2]||'💪'}</span><div class="rbody"><b>${escT(e)}</b><small>${esc((EX[e]?.[0]||[]).join(', '))}</small></div>
  <span class="grp-act"><button aria-label="Move up" ${i?'':'disabled'} onclick="grpMove(${i},-1)">↑</button><button aria-label="Move down" ${i<GRP.ex.length-1?'':'disabled'} onclick="grpMove(${i},1)">↓</button><button aria-label="Remove" onclick="GRP.ex.splice(${i},1);render()">✕</button></span></div>`).join('')}</div>`:'<div class="empty">No exercises yet.</div>'}
 <button class="btn sec2" style="margin-top:var(--s1)" onclick="grpPick()">+ Add exercises</button>
 ${GRP.ex.length?`<p class="t-caption" style="margin-top:var(--s1)">Trains <b>${pri.join(', ')||'—'}</b>${sec.length?` · secondary: ${sec.join(', ')}`:''}</p>`:''}
 <button class="btn" style="margin-top:var(--s2)" onclick="grpSave()">${GRP.id?'Save group':'Create group'}</button>
 ${GRP.id?`<button class="btn sec2" style="margin-top:var(--s1);color:var(--accent)" onclick="grpDelete()">Delete group</button>`:''}<div style="height:var(--s4)"></div>`};
function grpMove(i,d){const a=GRP.ex;[a[i],a[i+d]]=[a[i+d],a[i]];render()}
function grpPick(){const all=Object.keys(EX).filter(e=>!exHidden(e)&&!/\(km\)$/.test(e)).sort((a,b)=>isMyEx(b)-isMyEx(a)||a.localeCompare(b));
 openSheet(`<h3 class="t-title">Add exercises</h3><input placeholder="🔍 Search" oninput="document.querySelectorAll('#sheet .gprow').forEach(r=>r.style.display=r.dataset.n.includes(this.value.toLowerCase())?'':'none')">
 <div class="row" onclick="closeSheet();setTimeout(()=>exEditor(null,'group'),300)"><div class="tile" style="background:var(--tile-6);width:40px;height:40px;font-size:20px">➕</div><div class="rbody"><b>Create custom exercise</b><small>When it isn't in the list</small></div></div>
 ${all.map(e=>`<label class="row gprow" data-n="${esc(e.toLowerCase())}"><span style="font-size:22px">${EX[e][2]}</span><div class="rbody"><b>${escT(e)}</b><small>${esc(EX[e][0].join(', '))}${isMyEx(e)?' · custom':''}</small></div><input type="checkbox" style="width:22px;height:22px;margin:0" data-e="${esc(e)}" ${GRP.ex.includes(e)?'checked':''} onchange="grpTog(this.dataset.e,this.checked)"></label>`).join('')}
 <div class="sticky" style="position:sticky;bottom:0"><button class="btn" onclick="closeSheet();render()">Done</button></div>`)}
function grpTog(e,on){GRP.ex=on?[...new Set([...GRP.ex,e])]:GRP.ex.filter(x=>x!==e);render()}
function grpSave(){const n=cleanName(GRP.name);if(!n)return toast('Give the group a name');if(!GRP.ex.length)return toast('Add at least one exercise');
 let g=S.exGroups.find(x=>x.id===GRP.id);if(g)Object.assign(g,{name:n,e:GRP.e,ex:[...GRP.ex]});else{g={id:Date.now().toString(36)+Math.random().toString(36).slice(2,5),name:n,e:GRP.e,ex:[...GRP.ex]};S.exGroups.push(g)}
 regGroup(g);save();GRP=null;toast(`🧩 ${esc(n)} saved`);back()}
function grpDelete(){const g=S.exGroups.find(x=>x.id===GRP.id);if(!g||!confirm(`Delete the group “${g.name}”?\n\nThe exercises themselves stay. Past workouts keep their history.`))return;
 g.deleted=true;save();GRP=null;toast('Group deleted');stack=stack.filter(([v,a])=>!(v==='prog'&&a[0]===GKEY(g))&&v!=='groupedit');render('pop')}
// When an exercise is created from the group picker, add it to the group being edited.
const _exSaveG=exSave;exSave=function(){const was=EXED?.ret,n=($('#exn')?.value||'').trim().replace(/\s+/g,' ');_exSaveG();if(was==='group'&&GRP&&S.customEx[n]&&!GRP.ex.includes(n)){GRP.ex.push(n);render()}};

// Add a whole group to the workout in progress.
function addGroupToActive(id){const g=S.exGroups.find(x=>x.id===id),a=S.active;if(!g||!a)return;const add=g.ex.filter(e=>EX[e]&&!a.list.includes(e));
 if(!add.length){closeSheet();return toast('Those exercises are already in this workout')}
 const first=a.list.length;a.list.push(...add);a.idx=first;save();closeSheet();render('push');toast(`🧩 Added ${add.length} exercise${add.length>1?'s':''} from ${esc(g.name)}`)}

// ================= PICKER: hide deleted exercises, offer groups =================
const _pkG=pickEx;pickEx=function(swap){_pkG(swap);if(!$('#sheet').classList.contains('show'))return;
 document.querySelectorAll('#sheet .exrow').forEach(r=>{if(exHidden(r.dataset.e))r.remove()});
 const G=liveGroups();if(swap||!S.active||!G.length)return;const cr=[...document.querySelectorAll('#sheet .row')].find(r=>/newExSheet/.test(r.getAttribute('onclick')||''));
 cr?.insertAdjacentHTML('afterend',`<div class="afsec" style="margin-top:var(--s1)">My groups</div>${G.map(g=>`<div class="row" onclick="addGroupToActive('${g.id}')"><span style="font-size:22px">${g.e||'🧩'}</span><div class="rbody"><b>${escT(g.name)}</b><small>Add all ${g.ex.length} · ${esc(PROGS[GKEY(g)].sub)}</small></div><span class="chip">+ Add</span></div>`).join('')}<div class="afsec">All exercises</div>`)};

// Custom exercises show their exact targets in the workout player.
const _plyG=V.player;V.player=()=>{let h=_plyG();const a=S.active;if(!a)return h;const ex=a.list[a.idx],d=EX[ex];if(!d||!d[3]?.t)return h;
 const t=d[3].t,txt=t.filter(x=>x.r==='p').map(x=>targetLabel(x.m)).join(', ')+(t.some(x=>x.r==='s')?` · secondary: ${t.filter(x=>x.r==='s').map(x=>targetLabel(x.m)).join(', ')}`:'');
 return h.replace(`<p class="muted">${d[0].join(', ')}</p>`,`<p class="muted">${esc(txt)}</p>`)};

// ================= LIBRARY PAGE: My exercises & groups =================
V.mylib=()=>{const mine=Object.keys(S.customEx).sort(),G=liveGroups();
 const tsum=e=>{const t=exTargets(e);return t.filter(x=>x.r==='p').map(x=>targetLabel(x.m)).join(', ')+(t.some(x=>x.r==='s')?` · 2°: ${t.filter(x=>x.r==='s').map(x=>targetLabel(x.m)).join(', ')}`:'')};
 return`<div class="top">${backBtn()}<h1 style="font-size:22px;flex:1;margin-left:var(--s1)">My exercises & groups</h1><span></span></div>
 <div class="sec">Groups <small onclick="GRP=null;push('groupedit',null)" style="cursor:pointer;color:var(--accent)">+ New</small></div>
 ${G.length?`<div class="list">${G.map(g=>`<div class="row" onclick="push('prog','${GKEY(g)}')"><span style="font-size:24px">${g.e||'🧩'}</span><div class="rbody"><b>${escT(g.name)}</b><small>${g.ex.length} exercise${g.ex.length>1?'s':''} · ${esc(PROGS[GKEY(g)].sub)}</small></div><span class="chev">›</span></div>`).join('')}</div>`
  :`<div class="empty">Group exercises you do together, like “Home Arms Day”. Start a group as a workout, or swap it in for today's session.</div>`}
 <div class="sec">My exercises <small onclick="exEditor(null,'list')" style="cursor:pointer;color:var(--accent)">+ New</small></div>
 ${mine.length?`<div class="list">${mine.map(e=>`<div class="row" data-e="${esc(e)}" onclick="exEditor(this.dataset.e,'list')"><span style="font-size:24px">${EX[e][2]}</span><div class="rbody"><b>${escT(e)}</b><small>${esc(tsum(e))}</small></div><span class="chev">›</span></div>`).join('')}</div>`
  :`<div class="empty">Create exercises that aren't in the list and choose exactly which muscles they train.</div>`}<div style="height:var(--s4)"></div>`};
const _wkG=V.workouts;V.workouts=()=>{const h=_wkG(),G=liveGroups(),k='<div class="sec">History</div>';
 const card=`<div class="sec">My groups <small onclick="push('mylib')" style="cursor:pointer;color:var(--accent)">Manage</small></div><div class="list">${G.map(g=>`<div class="row" onclick="push('prog','${GKEY(g)}')"><div class="tile" style="background:var(--tile-7)">${g.e||'🧩'}</div><div class="rbody"><b>${escT(g.name)}</b><small>${g.ex.length} exercises · ${esc(PROGS[GKEY(g)].sub)}</small></div><span class="chev">›</span></div>`).join('')}
  <div class="row" onclick="push('mylib')"><div class="tile" style="background:var(--tile-6)">➕</div><div class="rbody"><b>${G.length?'Exercises & groups':'Create a group or exercise'}</b><small>${Object.keys(S.customEx).length} custom exercise${Object.keys(S.customEx).length===1?'':'s'} · ${G.length} group${G.length===1?'':'s'}</small></div><span class="chev">›</span></div></div>`;
 return h.includes(k)?h.replace(k,card+k):h+card};

document.head.insertAdjacentHTML('beforeend',`<style>
.exemo{display:flex;flex-wrap:wrap;gap:6px;margin-top:var(--s1)}.exemo button{width:40px;height:40px;border-radius:10px;border:1.5px solid var(--line);background:var(--surface);font-size:20px;cursor:pointer}.exemo button.on{border-color:var(--ink);background:var(--fill)}
.exms{display:grid;gap:6px}.exm-r{display:flex;gap:6px}.exm-t{flex:1;display:flex;justify-content:space-between;align-items:center;border:1.5px solid var(--line);background:var(--surface);color:var(--ink);border-radius:12px;padding:10px 12px;cursor:pointer;text-align:left;font-size:15px}
.exm-t em,.exm-s em{font-style:normal;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;border-radius:6px;padding:2px 6px}
.exm-t.st-p,.exm-s .st-p{background:var(--ink);border-color:var(--ink);color:var(--surface)}.st-p em{background:var(--surface)}
.exm-t.st-s,.exm-s .st-s{background:color-mix(in srgb,var(--accent-2) 14%,var(--surface));border-color:var(--accent-2);color:var(--accent-2)}.st-s em{background:var(--accent-2)}
.exm-t.st-sub{border-color:var(--ink);border-style:dashed}.exm-t.st-sub em{background:var(--fill);color:var(--ink-2)}
.exm-x{width:44px;flex:none;border:1.5px solid var(--line);background:var(--surface);border-radius:12px;cursor:pointer;color:var(--ink-2);font-size:16px}.exm-x.on{transform:rotate(180deg)}
.exm-s{display:flex;flex-wrap:wrap;gap:6px;padding:6px 0 4px 10px}.exm-s button{display:flex;gap:6px;align-items:center;border:1.5px solid var(--line);background:var(--surface);color:var(--ink);border-radius:999px;padding:7px 12px;font-size:13px;cursor:pointer}
.exsum{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:var(--s2) 0 var(--s1)}.exsum div{background:var(--fill);border-radius:12px;padding:10px}.exsum small{display:block;font-size:12px;color:var(--ink-2)}.exsum b{font-size:14px}
.grp-act{display:flex;gap:4px;flex:none}.grp-act button{width:34px;height:34px;border-radius:10px;border:1px solid var(--line);background:var(--surface);cursor:pointer;color:var(--ink)}.grp-act button:disabled{opacity:.3}
</style>`);
if(typeof render==='function')render();
