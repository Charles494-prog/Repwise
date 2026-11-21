// RepWise: setup-time deficit & fasting, cooking-method calories, supplements, Body Calorie Track.

// ================= SETUP: deficit + fasting asked once in onboarding =================
{const i=OBSTEPS.findIndex(s=>s.k==='focus');OBSTEPS.splice(i,0,
 {k:'deficit',q:'How hard do you want to push?',s:'Your daily calorie deficit (or surplus). You can change it later in Progress → Plan.',o:[[-300,'💪','Lean bulk','+300 kcal surplus · build muscle'],[0,'⚖️','Maintenance','Recomp · weight stays stable'],[250,'🌿','Gentle · −250','~0.25 kg/week · easiest to stick to'],[500,'🔥','Moderate · −500','~0.5 kg/week · recommended'],[750,'⚡','Aggressive · −750','~0.7 kg/week · harder'],[1000,'🚀','Very aggressive · −1000','~1 kg/week · short-term only']]},
 {k:'fastProto',q:'Intermittent fasting?',s:'Optional. We remind you when your eating window opens and closes.',o:[['off','🍽️','No fasting','Eat whenever'],...FASTS.slice(0,4).map(([id,h,l,d])=>[id,'⏳',`${id} · ${l}`,d])]})}
const _startOB2=startOB;startOB=function(){_startOB2();OB.d.fastProto=S.fast.on?S.fast.proto:'off';if(S.profile?.deficit==null&&S.profile)OB.d.deficit=-targets().adj;render()};
const _finishOB2=finishOB;finishOB=function(){if(!OB.active)return;const f=OB.d.fastProto;delete OB.d.fastProto;
 if(f){S.fast.on=f!=='off';if(f!=='off')S.fast.proto=f}_finishOB2();delete S.profile.fastProto;save();try{schedFast()}catch(e){}};

// ================= COOKING METHOD =================
// Multipliers on the plain/raw-prepared calories (added oil/batter absorbed during cooking).
const COOK=[['Raw / boiled / steamed',1],['Grilled / baked / roasted',1.05],['Air-fried',1.1],['Stir-fried (little oil)',1.2],['Pan-fried / sautéed',1.35],['Breaded & fried',1.5],['Deep-fried',1.7]];
foodSheet=function(pre={}){openSheet(`<h3 style="font-size:20px">Add food</h3>
 <select onchange="const v=FOODS[this.value];if(v){$('#fn').value=this.value;$('#fk').value=v[0];$('#fp').value=v[1];updCook()}"><option value="">Quick pick…</option>${Object.keys(FOODS).map(x=>`<option>${x}</option>`).join('')}</select>
 <input id="fn" placeholder="Food name" value="${esc(pre.name||'')}"><div class="flex"><input id="fk" type="number" placeholder="kcal" oninput="updCook()" value="${pre.kcal??''}"><input id="fp" type="number" placeholder="protein g" value="${pre.protein??''}"><input id="fx" type="number" value="1" step="0.5" placeholder="servings" oninput="updCook()"></div>
 <small class="muted">🍳 How was it cooked?</small><select id="fc" onchange="updCook()">${COOK.map(([n,m],i)=>`<option value="${i}">${n}${m>1?` (+${Math.round((m-1)*100)}%)`:''}</option>`).join('')}</select>
 <p class="muted" id="fcv" style="margin:6px 0 0"></p>
 <button class="btn" style="margin-top:10px" onclick="addFood()">Add</button>`);updCook()};
function updCook(){const el=$('#fcv');if(!el)return;const c=COOK[+$('#fc').value],k=Math.round((+$('#fk').value||0)*(+$('#fx').value||1)*c[1]);const af=Math.round(k/c[1]*1.1),save=k-af;
 el.innerHTML=k?`Total: <b>${k} kcal</b>${c[1]>1?` · cooking oil adds ~${Math.round(k-k/c[1])} kcal`:''}${c[1]>1.1&&save>15?`<br>💡 <i>Suggestion:</i> air-frying, grilling or baking this would be ~${af} kcal (save ~${save}). Your call — log it however you cooked it.`:c[1]<=1.05?'<br>✅ Smart choice — boiling, steaming, grilling and baking keep calories low and protein intact.':''}`:'<small>💡 Healthiest methods: steam, boil, grill, bake, air-fry. Use a spray or 1 tsp of oil instead of pouring.</small>'}
addFood=function(){const n=$('#fn').value.trim(),x=+$('#fx').value||1,c=COOK[+$('#fc').value],k=Math.round((+$('#fk').value||0)*x*c[1]),p=Math.round((+$('#fp').value||0)*x);if(!n||!k)return toast('Enter name and kcal');if(!fastOK())return;
 const nm=(x!==1?`${n} ×${x}`:n)+(c[1]>1?` (${c[0].split(' ')[0].toLowerCase()})`:'');(S.food[viewDate]??=[]).push([nm,k,p]);save();closeSheet();render();xpFly(`+${k} kcal`)};

// ================= SUPPLEMENTS =================
// [name, emoji, evidence tier, dose, why, source, iHerb search, goals it suits]
const SUPPS=[
 ['Creatine monohydrate','⚡','A',  '3–5 g/day, any time, no loading needed','The most researched sports supplement. More strength, power and muscle; also supports brain function. Safe long term in healthy people.','Kreider et al., 2017, JISSN position stand','creatine monohydrate',['cut','slowcut','maintain','bulk']],
 ['Whey / plant protein','🥛','A',  '20–40 g when you can\'t hit protein from food','Just food in powder form — makes hitting 1.6–2.2 g/kg protein easy, which protects muscle in a deficit.','Morton et al., 2018, Br J Sports Med','whey protein isolate',['cut','slowcut','maintain','bulk']],
 ['Vitamin D3','☀️','B',  '1,000–2,000 IU/day with a meal (get tested)','Most indoor people are low. Supports bones, immunity, mood and muscle function.','Holick, 2007, NEJM','vitamin d3 2000 iu',['cut','slowcut','maintain','bulk']],
 ['Omega-3 fish oil','🐟','B',  '1–2 g EPA+DHA/day','Heart health, lowers triglycerides and inflammation; may ease muscle soreness.','Philpott et al., 2019, Res Sports Med','omega 3 fish oil',['cut','slowcut','maintain','bulk']],
 ['Caffeine','☕','A',  '3–6 mg/kg, 30–60 min pre-workout (not after 2pm)','Boosts strength, endurance and focus, and slightly blunts hunger — useful in a deficit.','Guest et al., 2021, JISSN position stand','caffeine pills 200mg',['cut','slowcut','maintain','bulk']],
 ['Magnesium glycinate','🌙','B',  '200–400 mg in the evening','Many people are low. Supports sleep quality, muscle cramps and recovery.','Abbasi et al., 2012, J Res Med Sci','magnesium glycinate',['cut','slowcut','maintain','bulk']],
 ['Electrolytes (sodium, potassium)','💧','B',  'During long fasts, sweaty sessions or low-carb days','Prevents headaches, dizziness and cramps — especially while fasting.','Shirreffs & Sawka, 2011, J Sports Sci','electrolyte powder sugar free',['cut','slowcut','fast']],
 ['Psyllium husk fibre','🌾','B',  '5–10 g/day with lots of water','Keeps you full on fewer calories and improves digestion and cholesterol.','Jovanovski et al., 2018, Am J Clin Nutr','psyllium husk',['cut','slowcut']],
 ['Multivitamin','💊','C',  '1/day as insurance','Covers gaps when calories are low. Not needed if you eat varied whole foods.','Ward, 2014, Nutr J','multivitamin',['cut','slowcut']],
 ['Beta-alanine','🔥','B',  '3–6 g/day (tingling is harmless)','Helps sets in the 1–4 minute range — high-rep work and conditioning.','Trexler et al., 2015, JISSN position stand','beta alanine',['maintain','bulk']],
];
const STIER={A:['Strong evidence','#22c55e'],B:['Good evidence','#3b82f6'],C:['Situational','#f59e0b']};
const iherb=q=>{const u='https://www.iherb.com/search?kw='+encodeURIComponent(q);try{window.Capacitor?.Plugins?.Browser?.open({url:u})||window.open(u,'_blank')}catch(e){window.open(u,'_blank')}};
V.supps=()=>{const g=S.profile.goal,mine=SUPPS.filter(s=>s[7].includes(g)||(S.fast.on&&s[7].includes('fast'))),rest=SUPPS.filter(s=>!mine.includes(s));
 const card=([n,e,t,dose,why,src,q])=>`<div class="card"><div class="flex"><span style="font-size:30px;flex:none">${e}</span><div style="flex:1"><b>${n}</b><br><span class="badge" style="background:${STIER[t][1]}22;color:${STIER[t][1]}">${STIER[t][0]}</span></div></div>
 <p style="margin:8px 0 4px">${why}</p><small class="muted">💊 ${dose}<br>📚 ${src}</small><button class="btn sec2 sm" style="margin-top:8px;width:100%" onclick="iherb('${q}')">🛒 Find on iHerb</button></div>`;
 return`<div class="top">${backBtn()}<h1>Supplements</h1><span></span></div>
 <p class="muted">Suggested for <b>${({cut:'losing fat',slowcut:'slow fat loss',maintain:'toning',bulk:'building muscle'})[g]}</b>${S.fast.on?' + fasting':''}. Food, sleep and training come first — supplements add the last few %.</p>
 <div class="sec">⭐ Recommended for you</div><div class="stagger">${mine.map(card).join('')}</div>
 ${rest.length?`<div class="sec">Also worth knowing</div>${rest.map(card).join('')}`:''}
 <p class="muted" style="font-size:12px;margin-top:12px">Not medical advice. Check with a doctor if you take medication, are pregnant, or have a health condition. Pick third-party tested brands (NSF / Informed Sport).</p>`};

// ================= BODY CALORIE TRACK =================
// Per logged day: eaten − (maintenance + tracked activity). Surplus = +, deficit = −. Running total.
let trackRange='week';
function balDays(){const t=targets(),B=S.burn||{};return Object.keys(S.food).filter(d=>sum(dayFood(d),1)>0).sort().map(d=>({d,bal:sum(dayFood(d),1)-(t.tdee+(B[d]||0))}))}
function rangeDays(r){const all=balDays();if(r==='all')return all;const n={week:7,month:30,year:365}[r],c=new Date();c.setDate(c.getDate()-n+1);const from=iso(c);return all.filter(x=>x.d>=from)}
const fmtK=n=>(n>0?'+':n<0?'−':'')+Math.abs(Math.round(n)).toLocaleString();
function trackChart(r=trackRange){const days=rangeDays(r);if(!days.length)return'<p class="muted" style="text-align:center;padding:20px 0">Log meals to start your calorie track 🌱</p>';
 // buckets: daily for week/month (and short all-time), monthly for year/long all-time
 const monthly=r==='year'||(r==='all'&&days.length>60);const map=new Map();
 days.forEach(x=>{const k=monthly?x.d.slice(0,7):x.d;map.set(k,(map.get(k)||0)+x.bal)});
 const v=[...map].map(([k,bal])=>({k,bal})),W=320,H=180,n=v.length,bw=W/Math.max(n,7);let run=0;
 const cum=v.map(x=>run+=x.bal),max=Math.max(200,...v.map(x=>Math.abs(x.bal)),...cum.map(Math.abs)),mid=H/2,sc=(mid-14)/max;
 const bars=v.map((x,i)=>{const cx=i*bw+bw/2,h=Math.abs(x.bal)*sc,y=x.bal<0?mid:mid-h;return`<rect x="${cx-bw*.32}" y="${y}" width="${bw*.64}" height="${Math.max(2,h)}" rx="2" fill="${x.bal<0?'#22c55e':'#ef4444'}"/>`}).join('');
 const line=cum.map((c,i)=>`${i?'L':'M'}${i*bw+bw/2},${mid-c*sc}`).join(' ');
 const lab=k=>monthly?new Date(k+'-15T12:00').toLocaleDateString(undefined,{month:'short'}):r==='week'?new Date(k+'T12:00').toLocaleDateString(undefined,{weekday:'short'}):new Date(k+'T12:00').getDate();
 const step=Math.ceil(n/8),lbl=v.map((x,i)=>i%step===0?`<text x="${i*bw+bw/2}" y="${H+13}" font-size="10" text-anchor="middle" fill="#8d8da0">${lab(x.k)}</text>`:'').join('');
 const tot=cum.at(-1),def=days.filter(x=>x.bal<0).length;
 return`<div style="text-align:center"><small class="muted">${({week:'This week',month:'This month',year:'This year',all:'All time'})[r]} total</small>
 <div class="big" style="font-size:38px;color:${tot<0?'var(--good)':'#ef4444'}">${fmtK(tot)} kcal</div><b style="color:${tot<0?'var(--good)':'#ef4444'}">${tot<0?'Deficit':tot>0?'Surplus':'Even'}</b>${tot<0?` <span class="muted">≈ ${(-tot/7700).toFixed(2)} kg fat burned 🔥</span>`:''}</div>
 <svg viewBox="0 -4 ${W} ${H+20}" style="width:100%;margin-top:8px"><line x1="0" x2="${W}" y1="${mid}" y2="${mid}" stroke="#c4c4d0" stroke-dasharray="4 3"/>
 ${bars}${n>1?`<path d="${line}" fill="none" stroke="#f59e0b" stroke-width="2.2"/>`:''}${lbl}</svg>
 <div class="flex" style="gap:10px;font-size:12px;color:var(--muted);justify-content:center"><span>🟩 Deficit</span><span>🟥 Surplus</span><span style="color:#f59e0b">━ Running total</span></div>
 <p class="muted" style="text-align:center;margin:6px 0 0">${def}/${days.length} days in deficit</p>`}
const rangeTabs=(fn)=>`<div class="flex" style="gap:6px;margin-bottom:10px">${[['week','Week'],['month','Month'],['year','Year'],['all','All time']].map(([k,l])=>`<button class="btn sm ${trackRange===k?'':'sec2'}" style="flex:1;padding:8px 0" onclick="trackRange='${k}';${fn}">${l}</button>`).join('')}</div>`;
V.caltrack=()=>{const all=balDays();let run=0;const rows=all.map((x,i)=>{run+=x.bal;return{...x,i:i+1,run}}).reverse(),tot=run;
 return`<div class="top">${backBtn()}<h1>Body Calorie Track</h1><span></span></div>
 <div class="card">${rangeTabs('render()')}${trackChart()}</div>
 <div class="card" style="text-align:center;background:linear-gradient(135deg,#dcfce7,#f0fdf4)"><small class="muted">ALL-TIME TOTAL</small><div class="big" style="font-size:34px;color:${tot<0?'var(--good)':'#ef4444'}">${fmtK(tot)} kcal</div><b>${tot<0?'Deficit':tot>0?'Surplus':'Even'}</b>${tot<0?`<p class="muted" style="margin:4px 0 0">≈ ${(-tot/7700).toFixed(2)} kg of fat · keep raising it! 🚀</p>`:''}</div>
 <div class="sec">Every day logged</div><div class="list">${rows.slice(0,window.__ctAll?1e9:90).map(x=>`<div class="row" style="cursor:default"><div class="rbody"><b>Day ${x.i}</b><small>${new Date(x.d+'T12:00').toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'})} · total ${fmtK(x.run)}</small></div><b style="color:${x.bal<0?'var(--good)':'#ef4444'}">${fmtK(x.bal)} kcal</b><small class="muted" style="margin-left:6px;min-width:52px">${x.bal<0?'Deficit':'Surplus'}</small></div>`).join('')||'<div class="row muted">No meals logged yet</div>'}
 ${rows.length>90&&!window.__ctAll?`<div class="row" onclick="window.__ctAll=1;render()"><div class="rbody"><b>Show all ${rows.length} days</b></div></div>`:''}${rows.length>90&&!window.__ctAll?`<div class="row" onclick="window.__ctAll=1;render()"><div class="rbody"><b>Show all ${rows.length} days</b></div></div>`:''}${rows.length?`<div class="row" style="cursor:default;background:#f7f7fb"><div class="rbody"><b>Total</b></div><b style="color:${tot<0?'var(--good)':'#ef4444'}">${fmtK(tot)} kcal</b><small class="muted" style="margin-left:6px;min-width:52px">${tot<0?'Deficit':'Surplus'}</small></div>`:''}</div>`};

// ================= DREAM GOAL SAFETY WARNINGS =================
// Live warning while choosing dream weight / body fat; confirm before accepting a risky target.
function dreamRisk(k,v){const d=OB.d,m=d.sex!=='f';
 if(k==='dreamWeight'&&d.height){const b=v/Math.pow(d.height/100,2),lo=(18.5*Math.pow(d.height/100,2)).toFixed(1),hi=(24.9*Math.pow(d.height/100,2)).toFixed(1);
  if(b<17)return['danger',`BMI ${b.toFixed(1)} — severely underweight`,`Below BMI 17 raises the risk of bone loss, anaemia, a weakened immune system, hormone disruption (lost periods, low testosterone) and heart rhythm problems. Healthy range for your height: ${lo}–${hi} kg.`,'WHO BMI classification; Flegal et al., 2013, JAMA'];
  if(b<18.5)return['warn',`BMI ${b.toFixed(1)} — underweight`,`Below 18.5 is linked to higher mortality, weaker bones and lower immunity. Healthy range for your height: ${lo}–${hi} kg.`,'Aune et al., 2016, BMJ (BMI & mortality meta-analysis)'];
  if(b>=30)return['danger',`BMI ${b.toFixed(1)} — obese range`,`A target above BMI 30 is linked to higher risk of type 2 diabetes, heart disease, high blood pressure and joint problems. Healthy range for your height: ${lo}–${hi} kg (muscular lifters can sit a bit higher).`,'Aune et al., 2016, BMJ; WHO'];
  if(b>=25)return['warn',`BMI ${b.toFixed(1)} — overweight range`,`Fine if it's mostly muscle, but if it's fat, health risks start rising above BMI 25. Healthy range: ${lo}–${hi} kg.`,'WHO BMI classification'];
  if(d.weight&&Math.abs(v-d.weight)/d.weight>.25)return['warn','Very big change',`That's over 25% of your body weight. Doable, but plan for it slowly (0.5–1% per week) to keep muscle and avoid rebound.`,'Helms et al., 2014, JISSN']}
 if(k==='dreamBF'){const ess=m?5:13,low=m?8:16,hi=m?25:32;
  if(v<ess)return['danger',`${v}% is below essential fat`,`${m?'Men':'Women'} need about ${m?'3–5':'10–13'}% just to survive — fat protects organs and makes hormones. Going this low causes organ stress, heart problems and severe hormone shutdown. Even stage bodybuilders only hold it for days.`,'Rossow et al., 2013, IJSPP (natural bodybuilder case study); ACE body fat chart'];
  if(v<low)return['warn',`${v}% is contest-lean`,`Below ~${low}% is very hard to maintain: low energy, poor sleep, low libido, ${m?'testosterone drops':'periods can stop (RED-S)'}, constant hunger. Healthy & athletic: ${m?'10–18':'18–25'}%.`,'Mountjoy et al., 2018, Br J Sports Med (RED-S); Fagerberg, 2018, IJSNEM'];
  if(v>hi)return['danger',`${v}% is in the obese range`,`Above ~${hi}% body fat raises the risk of insulin resistance, diabetes, heart disease and fatty liver. Healthy: ${m?'10–20':'18–28'}%.`,'Gallagher et al., 2000, Am J Clin Nutr (healthy body fat ranges)']}
 return null}
function riskCard(r){if(!r)return'<p class="muted" style="margin-top:14px">✅ Healthy, realistic target.</p>';const [lvl,t,body,src]=r,c=lvl==='danger'?'#ef4444':'#f59e0b';
 return`<div class="card" style="margin-top:14px;text-align:left;border:2px solid ${c};background:${c}11"><b style="color:${c}">${lvl==='danger'?'⛔':'⚠️'} ${t}</b><p style="margin:6px 0 4px">${body}</p><small class="muted">📚 ${src}</small></div>`}
const _onb3=V.onboard;V.onboard=()=>{let h=_onb3();const s=OBSTEPS[OB.step];if(s&&['dreamWeight','dreamBF'].includes(s.k))h=h.replace('<div style="flex:1"></div><button class="btn" onclick="obNum()">',`<div id="dreamw">${riskCard(dreamRisk(s.k,+(OB.d[s.k]??s.n[0])))}</div><div style="flex:1"></div><button class="btn" onclick="obNum()">`);return h};
const _updBmi3=updBmi;updBmi=function(){_updBmi3();const s=OBSTEPS[OB.step],el=$('#dreamw'),i=$('#obn');if(el&&i&&s)el.innerHTML=riskCard(dreamRisk(s.k,+i.value))};
const _obNum3=obNum;obNum=function(){const s=OBSTEPS[OB.step],r=dreamRisk(s.k,+$('#obn').value);
 if(r&&r[0]==='danger'&&!confirm(`${r[1]}\n\n${r[2]}\n\nSource: ${r[3]}\n\nKeep this target anyway?`))return;_obNum3()};

// ================= GOAL DATE ESTIMATE =================
// Week-by-week simulation: you eat your fixed calorie target while maintenance shrinks/grows with your weight
// (Mifflin-St Jeor × activity). 7,700 kcal ≈ 1 kg. Assumes lean mass is kept (lifting + protein), so all change is fat.
function goalETA(){const p=S.profile,t=targets(),G=S.goals||{},b=bodyFat();if(!p||!t)return[];
 const tdee=w=>(10*w+6.25*p.height-5*p.age+(p.sex==='m'?5:-161))*p.activity,lean=p.weight*(1-b.bf/100),out=[];
 const sim=(reached)=>{let w=p.weight;for(let wk=1;wk<=520;wk++){const dw=(t.kcal-tdee(w))*7/7700;if(Math.abs(dw)<.01)return null;w+=dw;if(reached(w,dw))return wk}return null};
 const add=(k,label,unit,target,cur,wk,why)=>out.push({k,label,unit,target,cur,wk,why,date:wk?new Date(Date.now()+wk*7*864e5):null});
 const gw=G.weight&&!G.weight.done?G.weight:null,gb=G.bf&&!G.bf.done?G.bf:null;
 if(gw){const down=gw.target<p.weight;add('weight','Dream weight','kg',gw.target,p.weight,(down?t.adj<0:t.adj>0)?sim(w=>down?w<=gw.target:w>=gw.target):null,
  t.adj===0?'Your plan is at maintenance, so weight won\'t move. Set a deficit to get a date.':`Your plan is a ${t.adj>0?'surplus':'deficit'} but this goal needs the opposite.`)}
 if(gb){const tw=lean/(1-gb.target/100),down=gb.target<b.bf;add('bf','Dream body fat','%',gb.target,+b.bf.toFixed(1),down&&t.adj<0?sim(w=>w<=tw):null,
  down?'Body fat drops only in a deficit. Set one to get a date.':'Raising body fat isn\'t timed — focus on lean bulking.')}
 return out}
function etaCard(){const e=goalETA();if(!e.length)return'';const t=targets();
 return`<div class="card"><h3 style="margin-top:0">📅 When you'll reach your goals</h3><p class="muted" style="margin-top:-4px">If you follow your plan: ${t.kcal} kcal/day, workouts & protein.</p>
 ${e.map(x=>`<div class="row" style="cursor:default"><div class="rbody"><b>${x.label}: ${x.cur} → ${x.target} ${x.unit}</b><small>${x.wk?`~${x.wk} weeks (${(x.wk/4.35).toFixed(1)} months)`:x.why}</small></div>${x.date?`<b style="color:var(--acc);text-align:right">${x.date.toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})}</b>`:''}</div>`).join('')}
 <small class="muted">Estimate only — water, hormones and real intake shift it by a few weeks. Progress slows as you get lighter because your maintenance drops. 📚 Hall et al., 2011, Lancet</small></div>`}
const _res4=V.result;V.result=()=>_res4().replace('<div class="sticky">',etaCard()+'<div class="sticky">');
const _gc4=goalCard;goalCard=()=>_gc4()+etaCard();

// ================= ELEGANT SET COACHING + HYPERTROPHY GUIDE =================
document.head.insertAdjacentHTML('beforeend',`<style>
.coach{position:relative;border-radius:18px;padding:14px 16px 14px 56px;margin:10px 0;background:linear-gradient(135deg,#fff7ed,#fff1f2);box-shadow:0 2px 10px #e3262f14;font-size:14px;line-height:1.45}
.coach .ci{position:absolute;left:12px;top:12px;width:34px;height:34px;border-radius:11px;display:grid;place-content:center;font-size:18px;background:#fff;box-shadow:0 1px 4px #0001}
.coach .ct{display:block;font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--acc);margin-bottom:2px}
.coach.q{background:linear-gradient(135deg,#fef9c3,#fef3c7)}.coach.q .ct{color:#b45309}
.coach.t{background:linear-gradient(135deg,#ede9fe,#eff6ff)}.coach.t .ct{color:#6d28d9}
.tempo{display:flex;gap:6px;margin-top:8px}.tempo span{flex:1;text-align:center;background:#fff;border-radius:10px;padding:6px 2px;font-size:11px;color:var(--muted)}.tempo b{display:block;font-size:16px;color:#1c1c28}
</style>`);
const SET_TIPS=[
 ['🐢','Control the negative','Lower the weight in 2–3 seconds. The lowering (eccentric) part builds as much muscle as the lift — don\'t just drop it.'],
 ['🎯','Stop 1–3 reps short of failure','The last few hard reps drive growth. Leaving 1–3 in the tank gives nearly the same gains with less fatigue.'],
 ['📏','Full range of motion','A deep stretch at the bottom grows muscle more than half reps. Go as deep as your joints allow with good form.'],
 ['🧠','Feel the target muscle','Think about the muscle squeezing, not just moving the weight. Mind-muscle focus adds measurable activation.'],
 ['⏸️','Rest 2–3 minutes','Longer rests between heavy sets let you lift more total volume — and volume builds muscle.'],
 ['🫁','Breathe & brace','Breathe in and brace your core before each rep, breathe out as you finish it.'],
];
const _pl5=V.player;V.player=()=>{let h=_pl5();if(!S.active)return h;const i=(S.active.idx+S.active.sets.length)%SET_TIPS.length,[e,t,b]=SET_TIPS[i];
 h=h.replace(/<div class="tip">([\s\S]*?)<\/div>(?=\$\{|<div class="tip" style="background:#fef3c7">|\s*<div class="grid2")/,(m,x)=>`<div class="coach"><span class="ci">🤖</span><span class="ct">Coach · this set</span>${x}</div>`)
  .replace(/<div class="tip" style="background:#fef3c7">([\s\S]*?)<\/div>/g,(m,x)=>`<div class="coach q"><span class="ci">⚔️</span><span class="ct">Quest checkpoint</span>${x.replace(/^⚔️\s*/,'')}</div>`);
 return h.replace('<div class="grid2" style="margin:12px 0">',`<div class="coach t"><span class="ci">${e}</span><span class="ct">${t}</span>${b}<div class="tempo"><span><b>2–3s</b>lower</span><span><b>0–1s</b>pause</span><span><b>1s</b>lift</span></div><small style="display:block;margin-top:8px;color:#6d28d9;font-weight:700;cursor:pointer" onclick="push('hyper')">What is hypertrophy? ›</small></div><div class="grid2" style="margin:12px 0">`)};
const HYPER=[
 ['💪','What is hypertrophy?','Hypertrophy means your muscle fibres get <b>bigger</b>. Hard training damages and stresses fibres; while you rest and eat protein, your body rebuilds them thicker and stronger than before.','Schoenfeld, 2010, J Strength Cond Res'],
 ['⚙️','The 3 triggers','<b>Mechanical tension</b> (heavy load through a full range) is the main driver. <b>Metabolic stress</b> (the burn/pump) and <b>muscle damage</b> help a little. Tension near failure matters most.','Schoenfeld, 2010; Wackerhage et al., 2019, J Appl Physiol'],
 ['⬇️','Why the negatives matter','Every rep has two parts: the <b>concentric</b> (lifting) and the <b>eccentric</b> (lowering — the "negative"). Muscles are ~30% stronger lowering, and eccentric work creates high tension that drives growth. Controlling the negative in 2–3 s builds as much or more muscle than the lift itself — dropping the weight wastes half the rep.','Roig et al., 2009, Br J Sports Med; Schoenfeld et al., 2017, J Strength Cond Res'],
 ['🔢','Reps & sets','Anything from <b>6–30 reps</b> builds muscle if you get close to failure. Aim for <b>10–20 hard sets per muscle per week</b>, split over 2+ sessions.','Schoenfeld et al., 2017 & 2019, Sports Med'],
 ['📈','Progressive overload','Do a little more over time: +1 rep, +2.5 kg, or an extra set. RepWise gives 2× XP when you beat last session.','Plotkin et al., 2022, PeerJ'],
 ['🍗','Fuel & recovery','<b>1.6–2.2 g/kg protein</b> per day and <b>7–9 h sleep</b>. Muscle grows between workouts, not during them.','Morton et al., 2018, Br J Sports Med; Dattilo et al., 2011, Med Hypotheses'],
];
V.hyper=()=>`<div class="top">${backBtn()}<h1>Hypertrophy</h1><span></span></div><p class="muted" style="margin-bottom:10px">How muscle actually grows — and why the lowering part of every rep counts.</p>
 <div class="stagger">${HYPER.map(([e,t,b,s])=>`<div class="coach t"><span class="ci">${e}</span><span class="ct">${t}</span>${b}<small class="muted" style="display:block;margin-top:6px">📚 ${s}</small></div>`).join('')}</div>
 <div class="card"><b>One perfect rep</b><div class="tempo"><span><b>2–3s</b>lower (negative)</span><span><b>0–1s</b>stretch pause</span><span><b>1s</b>lift hard</span><span><b>0s</b>no lockout rest</span></div></div>`;
const _lrn5=V.learn;if(_lrn5)V.learn=(...a)=>_lrn5(...a).replace(`<div class="row" onclick="push('fasting')">`,`<div class="row" onclick="push('hyper')"><div class="tile" style="background:#ede9fe">💪</div><div class="rbody"><b>Hypertrophy & negatives</b><small>How muscle grows, rep by rep</small></div><span class="chev">›</span></div><div class="row" onclick="push('fasting')">`);

// ================= REALISTIC SHORT-TERM CHECKPOINTS =================
{const w=OBSTEPS.find(s=>s.k==='dreamWeight'),b=OBSTEPS.find(s=>s.k==='dreamBF');
 w.q='Your next weight checkpoint';w.s='Keep it realistic and short term — about 8–12 weeks away. When you hit it, you set the next one. Small wins add up to your dream body.';
 b.q='Your next body fat checkpoint';b.s='Realistic is ~1–3% per 8–12 weeks of fat loss. Reach it, then set the next.'}
function obBF(){const d=OB.d;if(!d.height||!d.weight)return null;const bmi=d.weight/Math.pow(d.height/100,2);return Math.max(4,1.2*bmi+0.23*(d.age||25)-10.8*(d.sex!=='f'?1:0)-5.4+({lean:-4,athletic:-2,average:0,soft:3,heavy:6}[d.build||'average']))}
function suggestCP(k){const d=OB.d,dir={cut:-1,slowcut:-1,maintain:0,bulk:1}[d.goal]??-1;const r5=x=>Math.round(x*2)/2;
 if(k==='dreamWeight')return r5(d.weight*(1+dir*(d.goal==='slowcut'?.025:.05)))||d.weight; // ~0.25–0.5%/wk × 10 wk
 const bf=obBF();return bf?r5(Math.max(d.sex!=='f'?8:16,bf-(dir<0?(d.goal==='slowcut'?1.5:3):d.goal==='bulk'?-1:1))):null}
const _dr6=dreamRisk;dreamRisk=function(k,v){const r=_dr6(k,v);if(r)return r;const d=OB.d;
 if(k==='dreamWeight'&&d.weight&&Math.abs(v-d.weight)/d.weight>.1)return['warn','That\'s a long-term goal',`A ${Math.abs(v-d.weight).toFixed(1)} kg change takes ${Math.round(Math.abs(v-d.weight)/(d.weight*.0075))}+ weeks. Set a closer checkpoint (~${suggestCP(k)} kg) — hitting small targets keeps you motivated, and you can raise it after.`,'Helms et al., 2014, JISSN (0.5–1% bodyweight/week)'];
 const bf=obBF();if(k==='dreamBF'&&bf&&Math.abs(v-bf)>5)return['warn','That\'s a long-term goal',`You're around ${bf.toFixed(1)}% now. ${Math.abs(v-bf).toFixed(1)}% is several months of work. Try ~${suggestCP(k)}% as your next checkpoint.`,'Expert consensus; Helms et al., 2014'];return null};
const _onb6=V.onboard;V.onboard=()=>{const s=OBSTEPS[OB.step];if(s&&['dreamWeight','dreamBF'].includes(s.k)&&OB.d[s.k]==null){const c=suggestCP(s.k);if(c)OB.d[s.k]=c}
 let h=_onb6();if(s&&['dreamWeight','dreamBF'].includes(s.k)){const c=suggestCP(s.k),u=s.k==='dreamWeight'?'kg':'%',bf=obBF();
  h=h.replace('<div id="dreamw">',`<div class="coach t" style="margin-top:14px;text-align:left"><span class="ci">🎯</span><span class="ct">Suggested 10-week checkpoint</span>${s.k==='dreamBF'&&bf?`You're about <b>${bf.toFixed(1)}%</b> now. `:''}<b>${c} ${u}</b> fits your plan. <small style="color:#6d28d9;font-weight:700;cursor:pointer" onclick="$('#obn').value=${c};updBmi()">Use it ›</small></div><div id="dreamw">`)}return h};

// ================= HOW BODY FAT IS TRACKED =================
const _gc6=goalCard;goalCard=()=>{const g=S.goals?.bf,p=S.profile,tape=p.waist&&p.neck&&(p.sex==='m'||p.hip),old=p.measTs&&Date.now()-p.measTs>14*864e5;
 const box=g&&!g.done?`<div class="coach t"><span class="ci">📏</span><span class="ct">How your body fat is tracked</span>${tape?`Using your <b>tape measurements</b> (US Navy method, ±3%). Re-measure every 2 weeks${old?' — <b>due now</b>':''}.`:`Right now it's <b>estimated from your weight</b> (BMI, age & build, ±5%) — so it only drops when the scale drops and can't tell fat from muscle. Add <b>waist & neck</b> measurements for a real reading.`}
 <button class="btn sm" style="margin-top:8px;width:100%" onclick="measSheet()">📏 ${tape?'Update measurements':'Add measurements'}</button></div>`:'';
 const h=_gc6(),k='<div class="card"><h3 style="margin-top:0">📅';return h.includes(k)?h.replace(k,box+k):h+box};

// ================= GOAL REVEAL (after setup) =================
document.head.insertAdjacentHTML('beforeend',`<style>
@keyframes rvIn{from{opacity:0;transform:translateY(24px) scale(.98);filter:blur(6px)}to{opacity:1;transform:none;filter:none}}
@keyframes rvDate{0%{opacity:0;transform:scale(.7);filter:blur(10px);letter-spacing:.2em}100%{opacity:1;transform:none;filter:none;letter-spacing:-.01em}}
@keyframes caret{50%{opacity:0}}@keyframes shine{from{background-position:-200% 0}to{background-position:200% 0}}
.rv{opacity:0;animation:rvIn .7s cubic-bezier(.2,.8,.2,1) forwards}
.hero{border-radius:26px;padding:26px 20px;text-align:center;color:#fff;background:linear-gradient(135deg,#e3262f,#b3121b 55%,#7a0c12);box-shadow:0 12px 30px #e3262f40;overflow:hidden;position:relative}
.hero:after{content:'';position:absolute;inset:0;background:linear-gradient(110deg,transparent 30%,#fff3 50%,transparent 70%);background-size:200% 100%;animation:shine 3.5s ease-in-out 2.6s infinite}
.tw{min-height:44px;font-size:16px;font-weight:600;opacity:.95}.tw.typing:after{content:'';display:inline-block;width:2px;height:1.1em;background:#fff;margin-left:2px;vertical-align:-3px;animation:caret .8s steps(1) infinite}
.rvdate{font-size:34px;font-weight:900;margin:6px 0 2px;opacity:0}.rvdate.go{animation:rvDate .9s cubic-bezier(.2,.8,.2,1) forwards}
.track{position:relative;height:10px;border-radius:5px;background:#f0f0f5;margin:16px 4px 8px}.track i{position:absolute;inset:0 auto 0 0;width:0;border-radius:5px;background:linear-gradient(90deg,#e3262f,#7a0c12);transition:width 1.6s cubic-bezier(.2,.8,.2,1)}
.track b{position:absolute;top:50%;left:0;width:22px;height:22px;margin:-11px 0 0 -11px;border-radius:50%;background:#fff;border:4px solid #e3262f;box-shadow:0 2px 8px #0002;transition:left 1.6s cubic-bezier(.2,.8,.2,1)}
</style>`);
function cnt(el,to,dec=0,ms=1400){const st=performance.now(),from=+(el.dataset.from||0);const f=t=>{const p=Math.min(1,(t-st)/ms),e=1-Math.pow(1-p,4);el.textContent=(from+(to-from)*e).toFixed(dec).replace(/\B(?=(\d{3})+(?!\d))/g,',');if(p<1)requestAnimationFrame(f)};requestAnimationFrame(f)}
function typeTo(el,txt,cb,sp=34){el.classList.add('typing');let i=0;const f=()=>{if(!document.body.contains(el))return;el.textContent=txt.slice(0,++i);if(i<txt.length)setTimeout(f,sp);else{el.classList.remove('typing');cb&&cb()}};f()}
function revealHero(){const e=goalETA(),dated=e.filter(x=>x.date),last=dated.sort((a,b)=>b.wk-a.wk)[0];
 setTimeout(()=>{const tw=$('#rvtw');if(!tw)return;
  typeTo(tw,last?'You will achieve your goals by approximately':'Your plan is ready. Set a deficit to get a goal date.',()=>{if(!last)return;const d=$('#rvdate');d.classList.add('go');vib&&vib(15);
   setTimeout(()=>{const w=$('#rvwk');if(w)cnt(w,last.wk,0,1200);document.querySelectorAll('.track').forEach(t=>{t.querySelector('i').style.width=t.dataset.p+'%';t.querySelector('b').style.left=t.dataset.p+'%'});
    document.querySelectorAll('[data-to]').forEach(x=>cnt(x,+x.dataset.to,+(x.dataset.dec||0)))},500)})},350)}
const _res7=V.result;V.result=()=>{const e=goalETA(),dated=e.filter(x=>x.date),last=[...dated].sort((a,b)=>b.wk-a.wk)[0];setTimeout(revealHero,0);
 const hero=`<div class="hero rv"><div style="font-size:40px">🎯</div><div class="tw" id="rvtw"></div>
  ${last?`<div class="rvdate" id="rvdate">${last.date.toLocaleDateString(undefined,{month:'long',day:'numeric',year:'numeric'})}</div><div style="opacity:.9">in <b id="rvwk" style="font-size:20px">0</b> weeks if you follow your plan</div>`:''}</div>
  ${e.map((x,i)=>`<div class="card rv" style="animation-delay:${2.6+i*.2}s"><div class="flex" style="justify-content:space-between"><b>${x.label}</b><span class="chip">${x.date?x.date.toLocaleDateString(undefined,{month:'short',day:'numeric'}):'—'}</span></div>
   <div class="track" data-p="100"><i></i><b></b></div><div class="flex" style="justify-content:space-between"><small class="muted">Now <b data-from="${x.cur}" data-to="${x.cur}" data-dec="1">${x.cur}</b> ${x.unit}</small><small><b data-from="${x.cur}" data-to="${x.target}" data-dec="1" style="color:var(--acc);font-size:16px">${x.cur}</b> ${x.unit} 🏁</small></div>
   ${x.wk?'':`<small class="muted">${x.why}</small>`}</div>`).join('')}`;
 return _res7().replace(etaCard(),'').replace('<div class="card stagger"',hero+'<div class="card stagger rv" style="animation-delay:'+(2.8+e.length*.2)+'s"')}

// ================= FIX: body-fat step — measure in setup, no "obese" alarm for a step down =================
const _obBF8=obBF;obBF=function(){const d=OB.d,l=Math.log10;if(d.waist&&d.neck&&d.height&&(d.sex!=='f'||d.hip))return d.sex!=='f'?495/(1.0324-0.19077*l(d.waist-d.neck)+0.15456*l(d.height))-450:495/(1.29579-0.35004*l(d.waist+d.hip-d.neck)+0.221*l(d.height))-450;return _obBF8()};
const _dr8=dreamRisk;dreamRisk=function(k,v){const r=_dr8(k,v),bf=obBF();
 if(k==='dreamBF'&&r&&r[1].includes('obese')&&bf&&v<bf)return['ok','Good first step',`Going from ${bf.toFixed(1)}% to ${v}% is a solid, realistic checkpoint. It's still above the healthy range (${OB.d.sex!=='f'?'10–20':'18–28'}%), so after this you'll set the next one lower.`,'Gallagher et al., 2000, Am J Clin Nutr'];return r};
const _rc8=riskCard;riskCard=function(r){if(r&&r[0]==='ok')return`<div class="card" style="margin-top:14px;text-align:left;border:2px solid #22c55e;background:#22c55e11"><b style="color:#16a34a">✅ ${r[1]}</b><p style="margin:6px 0 4px">${r[2]}</p><small class="muted">📚 ${r[3]}</small></div>`;return _rc8(r)};
function obMeas(){const d=OB.d;openSheet(`<h3 style="font-size:20px">Measure for accuracy 📏</h3><p class="muted">The guess from weight & build can be off by ±5%, especially if you're muscular. A tape measure gets within ±3%.</p>
 <small class="muted">Waist at navel (cm)</small><input id="ow" type="number" step="0.5" value="${d.waist||''}"><small class="muted">Neck below Adam's apple (cm)</small><input id="on" type="number" step="0.5" value="${d.neck||''}">${d.sex==='f'?`<small class="muted">Hip at widest (cm)</small><input id="oh" type="number" step="0.5" value="${d.hip||''}">`:''}
 <button class="btn" style="margin-top:10px" onclick="OB.d.waist=+$('#ow').value||0;OB.d.neck=+$('#on').value||0;${d.sex==='f'?"OB.d.hip=+$('#oh').value||0;":''}if(OB.d.waist&&OB.d.neck&&OB.d.waist<=OB.d.neck){OB.d.waist=0;return toast('Waist must be bigger than neck')}OB.d.dreamBF=null;closeSheet();render()">Use my measurements</button>`)}
const _onb8=V.onboard;V.onboard=()=>{let h=_onb8();const s=OBSTEPS[OB.step];if(s?.k==='dreamBF'){const m=OB.d.waist&&OB.d.neck;
 h=h.replace('<div id="dreamw">',`<button class="btn sec2 sm" style="margin-top:10px;width:100%" onclick="obMeas()">📏 ${m?`Measured (waist ${OB.d.waist}, neck ${OB.d.neck}) · edit`:'Not sure? Measure waist & neck for accuracy'}</button><div id="dreamw">`)}return h};

// ================= CHECK-INS (weight, measurements, height) + LIVE PROGRESS =================
// Schedule: weight weekly, tape measurements every 14 days, height every 6 months (<21 y) or yearly.
S.bfLog??=[];
function lastW(){return S.weights.at(-1)?.[0]||0}
function dueList(){const p=S.profile,now=Date.now(),D=864e5,out=[];if(!p)return out;
 if(now-lastW()>=7*D)out.push('weight');
 if(now-(p.measTs||p.setTs||0)>=14*D)out.push('meas');
 if(now-(p.heightTs||p.setTs||0)>=(p.age<21?182:365)*D)out.push('height');
 return out}
function checkIn(all){const p=S.profile,due=all?['weight','meas','height']:dueList(),f=(id,l,v,h='')=>`<small class="muted">${l}</small><input id="${id}" type="number" step="0.1" inputmode="decimal" value="${v||''}" placeholder="${h}">`;
 openSheet(`<h3 style="font-size:20px">Check-in 📋</h3><p class="muted">Keeps your calories, body fat and goal dates accurate. Measure in the morning, before eating.</p>
 ${due.includes('weight')?f('ciw','⚖️ Weight (kg)',p.weight):''}
 ${due.includes('meas')?`${f('ciwa','📏 Waist at navel (cm)',p.waist,'optional')}${f('cin','📏 Neck below Adam\'s apple (cm)',p.neck,'optional')}${p.sex==='f'?f('cih','📏 Hip at widest (cm)',p.hip,'optional'):''}`:''}
 ${due.includes('height')?f('cihe','📐 Height (cm)',p.height):''}
 <button class="btn" style="margin-top:12px" onclick="saveCheckIn()">Save check-in</button>${all?'':`<button class="btn sec2" style="margin-top:8px" onclick="S.profile.snooze=Date.now();save();closeSheet();render()">Remind me tomorrow</button>`}`)}
function saveCheckIn(){const p=S.profile,v=id=>+($('#'+id)?.value||0),now=Date.now(),before=bodyFat().bf;
 const w=v('ciw');if(w){if(w<30||w>250)return toast('Weight looks off');S.weights.push([now,w]);p.weight=w}
 if($('#ciwa')){const wa=v('ciwa'),n=v('cin');if(wa&&n){if(wa<=n)return toast('Waist must be bigger than neck');p.waist=wa;p.neck=n;if($('#cih'))p.hip=v('cih')}p.measTs=now}
 const h=v('cihe');if($('#cihe')){if(h&&(h<120||h>230))return toast('Height looks off');if(h)p.height=h;p.heightTs=now}
 const bf=+bodyFat().bf.toFixed(1);S.bfLog.push([now,bf]);delete p.snooze;checkGoals();save();closeSheet();render();
 const d=bf-before;toast(`✅ Checked in · body fat ${bf}%${Math.abs(d)>=.1?` (${d>0?'+':''}${d.toFixed(1)})`:''} · plan updated`)}
// existing quick weigh-in also feeds body-fat history
const _sw9=saveWeight;saveWeight=function(){_sw9();S.bfLog.push([Date.now(),+bodyFat().bf.toFixed(1)]);save()};
const _fob9=finishOB;finishOB=function(){const first=!S.profile;_fob9();if(S.profile){const n=Date.now();S.profile.setTs??=n;if(OB.d.waist)S.profile.measTs=n;S.profile.heightTs??=n;if(first||!S.bfLog.length)S.bfLog.push([n,+bodyFat().bf.toFixed(1)]);save()}};

function liveProgress(){const G=S.goals||{},p=S.profile,t=targets(),eta=goalETA(),rows=[];
 for(const k of ['weight','bf']){const g=G[k];if(!g||g.done)continue;const cur=+GOALDEF[k].cur().toFixed(1),u=GOALDEF[k].unit,tot=g.target-g.start,pct=Math.max(0,Math.min(100,tot?(cur-g.start)/tot*100:0)),wks=Math.max(1,(Date.now()-g.set)/6048e5);
  // expected change from plan so far vs actual
  let status='';if(k==='weight'&&t.adj!==0&&(Date.now()-g.set)>6048e5){const exp=Math.abs(t.adj)*7/7700*wks,act=g.down?g.start-cur:cur-g.start,r=act/exp;
   status=r>=1.1?'<span class="chip" style="background:#dcfce7;color:#16a34a">🚀 Ahead</span>':r>=.8?'<span class="chip" style="background:#dbeafe;color:#2563eb">✅ On track</span>':'<span class="chip" style="background:#fef3c7;color:#b45309">⏳ Behind</span>'}
  const e=eta.find(x=>x.k===k),diff=cur-g.start;
  rows.push(`<div style="margin:10px 0 4px"><div class="flex" style="justify-content:space-between"><b>${GOALDEF[k].label}</b>${status}</div>
   <div class="track" data-p="${pct.toFixed(1)}"><i></i><b></b></div>
   <div class="flex" style="justify-content:space-between;font-size:13px"><span class="muted">Start ${g.start}</span><span><b data-from="${g.start}" data-to="${cur}" data-dec="1" style="font-size:18px">${g.start}</b> ${u} <small class="muted">(${diff>0?'+':''}${diff.toFixed(1)})</small></span><span class="muted">🏁 ${g.target}</span></div>
   <small class="muted"><b data-to="${pct.toFixed(0)}">0</b>% done${e?.date?` · ETA ${e.date.toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})}`:''}</small></div>`)}
 if(!rows.length)return'';
 const due=dueList(),snz=p.snooze&&Date.now()-p.snooze<864e5;
 return`${due.length&&!snz?`<div class="coach q" style="cursor:pointer" onclick="checkIn()"><span class="ci">📋</span><span class="ct">Check-in due</span>Time to update your ${due.map(x=>({weight:'weight',meas:'measurements',height:'height'})[x]).join(', ')} — keeps your plan accurate. <b>Tap to check in ›</b></div>`:''}
 <div class="card" style="padding:14px 16px"><div class="flex" style="justify-content:space-between"><h3 style="margin:0">📈 Live progress</h3><small style="color:var(--acc);font-weight:700;cursor:pointer" onclick="checkIn(1)">Update ›</small></div>${rows.join('')}</div>`}
function animTracks(){requestAnimationFrame(()=>setTimeout(()=>{document.querySelectorAll('.track[data-p]:not(.done)').forEach(t=>{t.classList.add('done');t.querySelector('i').style.width=t.dataset.p+'%';t.querySelector('b').style.left=t.dataset.p+'%'});
 document.querySelectorAll('[data-to]:not(.cdone)').forEach(x=>{if(x.closest('.hero')||x.closest('.rv'))return;x.classList.add('cdone');cnt(x,+x.dataset.to,+(x.dataset.dec||0))})},80))}
const _ar9=window.afterRender;window.afterRender=function(){_ar9&&_ar9();if(!$('#rvtw'))animTracks()};
const _plan9=V.plan;V.plan=()=>{const h=_plan9();if(viewDate!==today())return h;const k='<div class="sec" style="display:flex;justify-content:space-between;align-items:baseline">✅ Must do';return h.includes(k)?h.replace(k,liveProgress()+k):liveProgress()+h};
// Progress tab: body-fat history chart + check-in row in settings
// (body-fat history moved to the Progress screen)
const _set9=V.settings;V.settings=()=>_set9().replace('<div class="row" onclick="measSheet()">',`<div class="row" onclick="checkIn(1)"><span style="font-size:22px">📋</span><div class="rbody"><b>Check-in</b><small>Update weight, measurements & height</small></div><span class="chev">›</span></div><div class="row" onclick="measSheet()">`);

// ================= MUSCLE HEADS / REGIONS =================
// Muscles have parts that respond differently to joint angle & stretch. Training each part = fuller development.
const HEADS={
 Biceps:{src:'Oliveira et al., 2009 (incline vs preacher EMG); Pedrosa et al., 2023, Eur J Sport Sci (stretched-position training)',p:[
  ['Long head','Outer "peak". Most stretched with arms behind the body.','Incline Dumbbell Curl, Chin-up'],
  ['Short head','Inner thickness. Works hardest with arms in front.','Preacher Curl, Barbell Curl'],
  ['Brachialis & brachioradialis','Under the biceps + forearm; pushes the biceps up and widens the arm. Neutral grip.','Hammer Curl']]},
 Triceps:{src:'Maeo et al., 2023, Eur J Sport Sci (overhead extensions grew triceps ~40% more than pushdowns)',p:[
  ['Long head','Biggest part (back of arm). Only fully stretched with arms overhead.','Overhead Tricep Extension, Skull Crusher'],
  ['Lateral head','Outer "horseshoe". Heavy pressing & pushdowns.','Tricep Pushdown, Dips'],
  ['Medial head','Deep, works in every extension, especially lockout.','Tricep Pushdown, Bench Press']]},
 Chest:{src:'Trebs et al., 2010, J Strength Cond Res; Chaves et al., 2024 (incline vs flat)',p:[
  ['Upper (clavicular)','Upper chest; responds to 30–45° incline.','Incline Dumbbell Press, Low-to-High Cable Fly'],
  ['Middle (sternal)','Main bulk of the chest. Flat pressing & flyes.','Bench Press, Chest Fly, Push-up'],
  ['Lower (costal)','Lower edge; decline angle or dips.','Dips']]},
 Shoulders:{src:'Campos et al., 2020, J Strength Cond Res (deltoid EMG); Schoenfeld et al., 2020',p:[
  ['Front delt','Already hit hard by all pressing.','Overhead Press, Bench Press'],
  ['Side delt','Creates shoulder width. Needs direct raises.','Lateral Raise'],
  ['Rear delt','Back of shoulder; posture & balance. Often neglected.','Face Pull, Rear Delt Fly']]},
 Back:{src:'Lehman et al., 2004, J Chiropr Med; Youdas et al., 2010, J Strength Cond Res',p:[
  ['Lats (width)','V-taper. Vertical pulling, elbows down to hips.','Pull-up, Lat Pulldown, Chin-up'],
  ['Upper back & traps (thickness)','Rhomboids, mid/lower traps. Horizontal rows, squeeze blades.','Barbell Row, Seated Cable Row, Face Pull'],
  ['Lower back (erectors)','Spine support. Hinges.','Deadlift, Romanian Deadlift']]},
 Quads:{src:'Kubo et al., 2019, Eur J Appl Physiol (deep squats); Pedrosa et al., 2022 (leg extension, rectus femoris)',p:[
  ['Vastus (3 heads)','Bulk of the thigh. Deep knee bending.','Squat, Leg Press, Lunge'],
  ['Rectus femoris','Crosses the hip too; squats barely grow it — needs leg extensions.','Leg Extension']]},
 Hamstrings:{src:'Maeo et al., 2021, Med Sci Sports Exerc (seated vs lying leg curl); Bourne et al., 2017',p:[
  ['Hip-hinge function','Stretched under load when you hinge.','Romanian Deadlift, Deadlift'],
  ['Knee-flexion function','Curling; seated curls grow them more than lying.','Leg Curl']]},
 Glutes:{src:'Plotkin et al., 2023 (hip thrust vs squat); Contreras et al., 2015, J Appl Biomech',p:[
  ['Gluteus maximus','Main glute; deep squats/lunges + thrusts.','Hip Thrust, Squat, Lunge'],
  ['Gluteus medius','Side glute; hip stability & width.','Lunge, Pistol Squat']]},
 Calves:{src:'Kinoshita et al., 2023 (gastrocnemius vs soleus); Cibulka et al., 2017',p:[
  ['Gastrocnemius','Visible diamond calf; trained with straight knees.','Calf Raise'],
  ['Soleus','Under it; only fully works with bent knees.','Seated Calf Raise']]},
 Core:{src:'Escamilla et al., 2006, J Orthop Sports Phys Ther',p:[
  ['Rectus abdominis','The "six-pack". Spinal flexion.','Crunch, Hanging Leg Raise'],
  ['Deep core & obliques','Bracing, anti-rotation, stability.','Plank Hold (sec), L-sit (sec)']]},
};
Object.assign(EX,{'Incline Dumbbell Curl':[['Biceps'],[],'💪'],'Preacher Curl':[['Biceps'],[],'💪'],'Overhead Tricep Extension':[['Triceps'],[],'🙆'],'Seated Calf Raise':[['Calves'],[],'🦶'],'Low-to-High Cable Fly':[['Chest'],['Shoulders'],'🦋']});
if(!EX['Rear Delt Fly'])EX['Rear Delt Fly']=[['Shoulders'],['Back'],'🕊️'];
if(!PROGS.pull.ex.includes('Incline Dumbbell Curl'))PROGS.pull.ex.splice(PROGS.pull.ex.indexOf('Hammer Curl'),0,'Incline Dumbbell Curl');
if(!PROGS.push.ex.includes('Overhead Tricep Extension'))PROGS.push.ex.push('Overhead Tricep Extension');
// exercise → heads, by name rules (covers dumbbell/cable/home variants too)
const HRULES=[[/incline.*curl|chin-up|drag curl/i,'Biceps','Long head'],[/preacher|concentration|spider|barbell curl|cable curl|^curl|dumbbell curl|backpack curl/i,'Biceps','Short head'],[/hammer|reverse curl/i,'Biceps','Brachialis & brachioradialis'],[/dumbbell curl|cable curl|backpack curl/i,'Biceps','Long head'],
 [/overhead.*ext|skull|french/i,'Triceps','Long head'],[/pushdown|dip|close.?grip|diamond|kickback/i,'Triceps','Lateral head'],[/pushdown|bench|push-up|kickback/i,'Triceps','Medial head'],
 [/incline.*(press|push)|low-to-high|incline fly/i,'Chest','Upper (clavicular)'],[/bench press|^push-up|knee push|chest fly|machine chest|dumbbell press|floor press|pec deck/i,'Chest','Middle (sternal)'],[/dip|decline/i,'Chest','Lower (costal)'],
 [/overhead press|shoulder press|pike|handstand|arnold/i,'Shoulders','Front delt'],[/lateral raise|upright/i,'Shoulders','Side delt'],[/face pull|rear delt|reverse fly/i,'Shoulders','Rear delt'],
 [/pull-up|pulldown|chin-up|muscle-up|dead hang/i,'Back','Lats (width)'],[/row|face pull|scapular/i,'Back','Upper back & traps (thickness)'],[/deadlift|back extension|good morning/i,'Back','Lower back (erectors)'],
 [/squat|leg press|lunge|split|step-up/i,'Quads','Vastus (3 heads)'],[/leg extension|sissy/i,'Quads','Rectus femoris'],
 [/romanian|deadlift|good morning/i,'Hamstrings','Hip-hinge function'],[/leg curl|nordic/i,'Hamstrings','Knee-flexion function'],
 [/hip thrust|glute bridge|squat|lunge|split/i,'Glutes','Gluteus maximus'],[/lunge|pistol|split|abduct/i,'Glutes','Gluteus medius'],
 [/seated calf/i,'Calves','Soleus'],[/^(?!seated).*calf raise/i,'Calves','Gastrocnemius'],
 [/crunch|leg raise|sit-up/i,'Core','Rectus abdominis'],[/plank|l-sit|dead bug|pallof|wheel/i,'Core','Deep core & obliques']];
const headsOf=e=>{const o=[];HRULES.forEach(([re,m,h])=>{if(re.test(e)&&!o.some(x=>x[0]===m&&x[1]===h))o.push([m,h])});return o};
function coverage(list){const ms=[...new Set(list.flatMap(e=>EX[e]?.[0]||[]))].filter(m=>HEADS[m]),hit=list.flatMap(headsOf);
 return ms.map(m=>({m,parts:HEADS[m].p.map(([h,d,best])=>({h,d,best,on:hit.some(x=>x[0]===m&&x[1]===h)}))}))}
function coverageCard(list){const c=coverage(list);if(!c.length)return'';const miss=c.flatMap(x=>x.parts.filter(p=>!p.on).map(p=>({...p,m:x.m})));
 return`<div class="sec">🎯 Muscle parts covered</div><div class="card">${c.map(x=>`<div style="margin:6px 0"><b>${x.m}</b> <small class="muted">${x.parts.filter(p=>p.on).length}/${x.parts.length}</small><div class="flex" style="gap:6px;flex-wrap:wrap;margin-top:4px">${x.parts.map(p=>`<span class="chip" style="${p.on?'background:#dcfce7;color:#16a34a':'background:#f3f3f7;color:#8d8da0'}">${p.on?'✓':'○'} ${p.h}</span>`).join('')}</div></div>`).join('')}
 ${miss.length?`<div class="coach q" style="margin-top:10px"><span class="ci">💡</span><span class="ct">Missing parts</span>${miss.slice(0,3).map(p=>`<b>${p.m} · ${p.h}</b>: add ${p.best.split(',')[0]}`).join('<br>')}</div>`:'<p class="muted" style="margin:8px 0 0">✅ Every part of every muscle is trained.</p>'}
 <small style="display:block;margin-top:8px;color:var(--acc);font-weight:700;cursor:pointer" onclick="push('anatomy')">Why muscle parts matter ›</small></div>`}
const _prog10=V.prog;V.prog=k=>{const h=_prog10(k),P=PROGS[k];if(!P.ex.length)return h;const L=planList(k);return h.replace('<div class="sticky">',coverageCard(L)+'<div class="sticky">')};
const _pl10=V.player;V.player=()=>{const h=_pl10();if(!S.active)return h;const ex=S.active.list[S.active.idx],hs=headsOf(ex);if(!hs.length)return h;
 return h.replace('<div class="grid2" style="margin:12px 0">',`<div class="coach"><span class="ci">🎯</span><span class="ct">Muscle parts this hits</span>${hs.map(([m,p])=>{const d=HEADS[m].p.find(x=>x[0]===p);return`<b>${m} · ${p}</b> <small class="muted">— ${d[1]}</small>`}).join('<br>')}</div><div class="grid2" style="margin:12px 0">`)};
V.anatomy=()=>`<div class="top">${backBtn()}<h1>Muscle parts</h1><span></span></div>
 <p class="muted" style="margin-bottom:10px">Most muscles have several heads or regions. Each one is stretched and loaded best at a different joint angle — so one exercise rarely grows the whole muscle. Studies show regional growth differs by exercise: e.g. overhead extensions grew the triceps ~40% more than pushdowns, and leg extensions grow the rectus femoris that squats miss.</p>
 <div class="stagger">${Object.entries(HEADS).map(([m,{src,p}])=>`<div class="card"><h3 style="margin:0 0 6px">${m}</h3>${p.map(([h,d,b])=>`<div class="coach t" style="margin:8px 0"><span class="ci">🎯</span><span class="ct">${h}</span>${d}<br><small><b>Best:</b> ${b}</small></div>`).join('')}<small class="muted">📚 ${src}</small></div>`).join('')}</div>`;
const _lrn10=V.learn;V.learn=(...a)=>_lrn10(...a).replace(`<div class="row" onclick="push('hyper')">`,`<div class="row" onclick="push('anatomy')"><div class="tile" style="background:#dcfce7">🎯</div><div class="rbody"><b>Muscle parts & heads</b><small>Train every head of every muscle</small></div><span class="chev">›</span></div><div class="row" onclick="push('hyper')">`);

// ================= THEME: matches the RepWise logo (charcoal · signal red · silver) =================
document.head.insertAdjacentHTML('beforeend',`<style>
nav{background:#15151f;border-top:none;box-shadow:0 -6px 20px #15151f22}nav button{color:#6e6e7c}nav button.on{color:#ff3b43}
.opt.on{background:#fdeced}.chip{color:#15151f}
.coach{background:linear-gradient(135deg,#f7f7f9,#ececf0);box-shadow:0 2px 10px #15151f0d}.coach .ct{color:#e3262f}
.coach.t{background:linear-gradient(135deg,#15151f,#262633);color:#ececf0}.coach.t .ct{color:#ff4d55}.coach.t .muted,.coach.t small{color:#a8a8b6!important}.coach.t b{color:#fff}.coach.t .ci{background:#2c2c3a;box-shadow:none}
.coach.t .tempo span{background:#262633;color:#a8a8b6}.coach.t .tempo b{color:#fff}
.coach.q{background:linear-gradient(135deg,#fdeced,#fbe0e2)}.coach.q .ct{color:#b3121b}
.hero{background:radial-gradient(120% 90% at 50% 0%,#3a0f14 0%,#15151f 65%);box-shadow:0 14px 34px #15151f55}.hero .rvdate{color:#fff}.hero b{color:#ff4d55}
.track{background:#e6e6ea}.track i{background:linear-gradient(90deg,#e3262f,#ff5a60)}.track b{border-color:#e3262f}
.top h1{letter-spacing:-.02em}
.loader{border-color:#e6e6ea;border-top-color:#e3262f}
</style>`);

// ================= ALL-TIME EXERCISE TOTALS (collapsed per exercise) =================
function lifetime(){const m={};S.workouts.forEach(w=>w.sets.forEach(s=>{const x=m[s.ex]??={reps:0,sets:0,vol:0,best:null,days:new Set(),last:0};x.reps+=s.r;x.sets++;x.vol+=s.w*s.r;x.days.add(iso(w.ts));x.last=Math.max(x.last,w.ts);
 if(!x.best||s.w>x.best.w||(s.w===x.best.w&&s.r>x.best.r))x.best=s}));return Object.entries(m).sort((a,b)=>b[1].reps-a[1].reps)}
function lifetimeCard(){const L=lifetime();if(!L.length)return'';const tr=L.reduce((s,[,x])=>s+x.reps,0),ts=L.reduce((s,[,x])=>s+x.sets,0),tv=L.reduce((s,[,x])=>s+x.vol,0);
 return`<div class="sec">🏆 All-time totals</div><div class="grid2" style="grid-template-columns:repeat(3,1fr);margin-bottom:10px"><div class="stat"><small>Reps</small><b data-count="${tr}">0</b></div><div class="stat"><small>Sets</small><b data-count="${ts}">0</b></div><div class="stat"><small>Tonnes</small><b>${(tv/1000).toFixed(1)}</b></div></div>
 <div class="list">${L.map(([e,x])=>`<details class="row" style="display:block;cursor:pointer"><summary style="display:flex;align-items:center;gap:12px;list-style:none"><span style="font-size:24px">${EX[e]?.[2]||'🏋️'}</span><div class="rbody"><b>${escT(e)}</b><small>${x.sets} sets · ${x.days.size} session${x.days.size>1?'s':''}</small></div><b style="color:var(--acc);font-size:18px">${x.reps.toLocaleString()}×</b><span class="chev">▾</span></summary>
 <div class="grid2" style="grid-template-columns:repeat(3,1fr);gap:6px;margin-top:10px"><div class="stat" style="padding:8px"><small>Best set</small><b style="font-size:15px">${x.best.w?x.best.w+'kg × ':''}${x.best.r}</b></div><div class="stat" style="padding:8px"><small>Volume</small><b style="font-size:15px">${x.vol?Math.round(x.vol).toLocaleString()+' kg':'—'}</b></div><div class="stat" style="padding:8px"><small>Last</small><b style="font-size:15px">${new Date(x.last).toLocaleDateString(undefined,{month:'short',day:'numeric'})}</b></div></div></details>`).join('')}</div>`}
const _wk11=V.workouts;V.workouts=()=>{const h=_wk11(),k='<div class="sec">History</div>';return h.includes(k)?h.replace(k,lifetimeCard()+k):h+lifetimeCard()};

// ================= GYM-LOGGER TOOLS: previous numbers, RIR, rest timer, plates & warm-up, deload =================
document.head.insertAdjacentHTML('beforeend',`<style>
#rest{position:fixed;left:12px;right:12px;bottom:calc(14px + env(safe-area-inset-bottom));z-index:30;background:#15151f;color:#fff;border-radius:20px;padding:12px 14px;display:flex;align-items:center;gap:10px;box-shadow:0 10px 30px #0005;animation:up .35s cubic-bezier(.2,.8,.2,1)}
#rest .rt{font-size:28px;font-weight:900;font-variant-numeric:tabular-nums;min-width:74px}#rest button{background:#2c2c3a;color:#fff;border:none;border-radius:12px;padding:8px 10px;font-weight:800}
#rest .rb{position:absolute;left:14px;right:14px;bottom:6px;height:3px;border-radius:2px;background:#2c2c3a;overflow:hidden}#rest .rb i{display:block;height:100%;background:#e3262f;transition:width 1s linear}
.rir{display:flex;gap:6px;margin:4px 0 10px}.rir button{flex:1;border:2px solid var(--line);background:#fff;border-radius:12px;padding:8px 0;font-weight:800;color:var(--txt)}.rir button.on{border-color:var(--acc);background:#fdeced;color:var(--acc)}
</style>`);
const COMPOUND=/squat|deadlift|bench|press|row|pull-up|chin-up|dip|lunge|thrust/i;
let restEnd=0,restTot=0,restI=null;
function startRest(ex){restTot=S.restSec?.[COMPOUND.test(ex)?'c':'i']||(COMPOUND.test(ex)?150:90);restEnd=Date.now()+restTot*1000;clearInterval(restI);restI=setInterval(tickRest,250);tickRest()}
function tickRest(){let el=$('#rest');const left=Math.ceil((restEnd-Date.now())/1000);if(!S.active||left<=-1){clearInterval(restI);el?.remove();if(left<=-1&&S.active){vib&&vib([200,100,200]);toast('⏰ Rest over — next set!')}return}
 if(!el){document.body.insertAdjacentHTML('beforeend','<div id="rest"></div>');el=$('#rest')}
 el.innerHTML=`<span style="font-size:20px">⏱️</span><div class="rt">${Math.floor(Math.max(0,left)/60)}:${String(Math.max(0,left)%60).padStart(2,'0')}</div><small style="flex:1;color:#a8a8b6">Rest</small><button onclick="restEnd-=15000">−15</button><button onclick="restEnd+=15000;restTot+=15">+15</button><button onclick="restEnd=Date.now()-1000;tickRest()">Skip</button><div class="rb"><i style="width:${Math.max(0,left)/restTot*100}%"></i></div>`}
let curRIR=null;
const _as11=addSet;addSet=function(){const a=S.active,n=a?.sets.length;_as11();if(a&&a.sets.length>n){const s=a.sets.at(-1);if(curRIR!=null)s.rir=curRIR;if(a.deload)s.deload=1;save();startRest(s.ex);render()}curRIR=null};
const _fw11=finishW;finishW=function(){const dl=S.active?.deload;clearInterval(restI);$('#rest')?.remove();_fw11();if(dl&&S.workouts.length){S.workouts.at(-1).deload=1;save()}};
function prevSets(ex){for(let i=S.workouts.length-1;i>=0;i--){const ss=S.workouts[i].sets.filter(s=>s.ex===ex);if(ss.length)return{ts:S.workouts[i].ts,ss}}return null}
function plateSheet(){const ex=S.active.list[S.active.idx],w=+($('#pw')?.value)||sugg(ex).w||20,bar=20,P=[25,20,15,10,5,2.5,1.25];let side=(w-bar)/2;const pl=[];if(side>0)P.forEach(p=>{while(side>=p-1e-9){pl.push(p);side-=p}});
 const r5=x=>Math.max(bar,Math.round(x/2.5)*2.5),wu=[[0,10,'Empty bar'],[.4,8,''],[.6,5,''],[.8,3,''],[.9,1,'Optional']].filter(([f])=>f===0||r5(w*f)>bar&&r5(w*f)<w);
 openSheet(`<h3 style="font-size:20px">Plates & warm-up 🧮</h3><p class="muted">Working weight <b>${w} kg</b> on a ${bar} kg bar.</p>
 <div class="sec">Each side</div><div class="flex" style="flex-wrap:wrap;gap:6px">${pl.length?pl.map(p=>`<span class="chip" style="background:#15151f;color:#fff;min-width:${30+p*2}px;justify-content:center">${p}</span>`).join(''):'<span class="muted">Just the bar</span>'}${side>0.01?`<span class="muted">+ ${(side).toFixed(2)} kg can't be made</span>`:''}</div>
 <div class="sec">Warm-up sets</div><div class="list">${wu.map(([f,r,n])=>`<div class="row" style="cursor:default"><div class="rbody"><b>${f?r5(w*f):bar} kg × ${r}</b><small>${n||Math.round(f*100)+'% of working weight'}</small></div></div>`).join('')}</div>
 <small class="muted">Warm-ups ramp up load with fewer reps so you're ready without getting tired. 📚 Ribeiro et al., 2014, J Strength Cond Res</small>`)}
const _pl11=V.player;V.player=()=>{let h=_pl11();const a=S.active;if(!a)return h;const ex=a.list[a.idx],pv=prevSets(ex),done=a.sets.filter(s=>s.ex===ex).length;
 const prev=pv?`<div class="coach"><span class="ci">🕘</span><span class="ct">Last time · ${new Date(pv.ts).toLocaleDateString(undefined,{month:'short',day:'numeric'})}</span><div class="flex" style="flex-wrap:wrap;gap:6px;margin-top:4px">${pv.ss.map((s,i)=>`<span class="chip" style="${i===done?'background:#15151f;color:#fff':''}">${i+1}: ${s.w?s.w+'×':''}${s.r}${s.rir!=null?` @${s.rir}`:''}</span>`).join('')}</div></div>`:'';
 const rir=`<div class="lbl">Reps left in the tank (RIR)</div><div class="rir">${[0,1,2,3,'4+'].map((v,i)=>`<button class="${curRIR===i?'on':''}" onclick="curRIR=curRIR===${i}?null:${i};this.parentNode.querySelectorAll('button').forEach((b,j)=>b.classList.toggle('on',curRIR===j))">${v}</button>`).join('')}</div>`;
 h=h.replace('<div class="grid2" style="margin:12px 0">',prev+'<div class="grid2" style="margin:12px 0">').replace(/<button class="btn" onclick="addSet\(\)">/,rir+'<button class="btn" onclick="addSet()">')
  .replace('<button class="btn sm sec2" onclick="cantDo()">',`<button class="btn sm sec2" onclick="plateSheet()">🧮 Plates</button><button class="btn sm ${a.deload?'':'sec2'}" onclick="deloadSheet()">🪶 Deload</button><button class="btn sm sec2" onclick="cantDo()">`);
 return h.replace(/(Set \d+: [^<]*?)(<\/span>)/g,(m,a1,b)=>m)};
// show RIR & deload in set rows/history
const _pl11b=V.player;V.player=()=>{const a=S.active;let h=_pl11b();if(!a)return h;const mine=a.sets.filter(s=>s.ex===a.list[a.idx]);mine.forEach((s,i)=>{if(s.rir!=null)h=h.replace(`Set ${i+1}: ${s.w}kg × ${s.r} `,`Set ${i+1}: ${s.w}kg × ${s.r} <small class="muted">@${s.rir===4?'4+':s.rir} RIR</small> `)});return h};

// ================= BODY TAB: weight & body composition =================
ICONS.body='<path d="M16 16l3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1ZM2 16l3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1ZM7 21h10M12 3v18M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>';
document.head.insertAdjacentHTML('beforeend','<style>nav button{font-size:10px}</style>');
S.measLog??=[];
let bodyRange='month';
function inRange(ts,r){if(r==='all')return true;return ts>=Date.now()-({week:7,month:30,year:365})[r]*864e5}
function bodyRangeTabs(){return`<div class="flex" style="gap:6px;margin-bottom:10px">${[['week','Week'],['month','Month'],['year','Year'],['all','All']].map(([k,l])=>`<button class="btn sm ${bodyRange===k?'':'sec2'}" style="flex:1;padding:8px 0" onclick="bodyRange='${k}';render()">${l}</button>`).join('')}</div>`}
function dayLbl(ts){const d=new Date(ts);return bodyRange==='week'?d.toLocaleDateString(undefined,{weekday:'short'}):bodyRange==='year'||bodyRange==='all'?d.toLocaleDateString(undefined,{month:'short',day:'numeric'}):d.getDate()}
function avg7(){const now=Date.now(),a=S.weights.filter(w=>w[0]>now-7*864e5).map(w=>w[1]),b=S.weights.filter(w=>w[0]<=now-7*864e5&&w[0]>now-14*864e5).map(w=>w[1]),m=x=>x.reduce((s,v)=>s+v,0)/x.length;return[a.length?m(a):null,b.length?m(b):null]}
function measSheet2(){const p=S.profile;openSheet(`<h3 style="font-size:20px">Log measurements 📏</h3><p class="muted">Optional — log as often as daily. Same time each day (morning, relaxed, tape snug not tight) for the most accurate body fat.</p>
 <small class="muted">Waist at navel (cm)</small><input id="mw2" type="number" step="0.1" inputmode="decimal" value="${p.waist||''}"><small class="muted">Neck below Adam's apple (cm)</small><input id="mn2" type="number" step="0.1" inputmode="decimal" value="${p.neck||''}">${p.sex==='f'?`<small class="muted">Hip at widest (cm)</small><input id="mh2" type="number" step="0.1" inputmode="decimal" value="${p.hip||''}">`:''}
 <button class="btn" style="margin-top:10px" onclick="saveMeas2()">Save</button>`)}
function saveMeas2(){const p=S.profile,w=+$('#mw2').value,n=+$('#mn2').value,h=+($('#mh2')?.value||0);if(!w||!n)return toast('Enter waist and neck');if(w<=n)return toast('Waist must be bigger than neck');if(p.sex==='f'&&!h)return toast('Enter hip');
 const before=bodyFat().bf;p.waist=w;p.neck=n;if(h)p.hip=h;p.measTs=Date.now();const bf=+bodyFat().bf.toFixed(1);S.measLog.push([Date.now(),w,n,h||null]);S.bfLog.push([Date.now(),bf]);checkGoals();save();closeSheet();render();
 const d=bf-before;toast(`📏 Saved · body fat ${bf}%${Math.abs(d)>=.1?` (${d>0?'+':''}${d.toFixed(1)})`:''}`)}
measSheet=measSheet2;
V.body=()=>{const p=S.profile,b=bodyFat(),lean=p.weight*(1-b.bf/100),ws=S.weights.filter(w=>inRange(w[0],bodyRange)),bl=S.bfLog.filter(x=>inRange(x[0],bodyRange)),[a7,p7]=avg7(),wIn=S.weights.some(w=>iso(w[0])===today()),mIn=S.measLog.some(m=>iso(m[0])===today()),ml=S.measLog.slice(-6).reverse();
 return`<div class="top"><h1>Body</h1><span class="chip">${p.weight} kg</span></div>
 <div class="grid2"><button class="btn${wIn?' sec2':''}" onclick="weighIn()">⚖️ ${wIn?'Weight logged ✓':'Log weight'}</button><button class="btn sec2" onclick="measSheet()">📏 ${mIn?'Measured ✓':'Measurements'}</button></div>
 <p class="muted" style="font-size:12px;margin:6px 2px 0">Daily logging is optional — more entries = more accurate body fat & goal tracking.</p>
 ${liveProgress().replace(/<div class="coach q"[\s\S]*?<\/div>\s*(?=<div class="card")/,'')}
 ${goalCard()}
 <div class="sec">🧬 Body composition</div><div class="grid2 stagger"><div class="stat"><small>Body fat</small><b data-count="${b.bf.toFixed(1)}" data-dec="1">0</b><small style="text-transform:none">${bfLabel(b.bf,p.sex)}</small></div><div class="stat"><small>Lean mass</small><b>${lean.toFixed(1)} kg</b></div><div class="stat"><small>Fat mass</small><b>${(p.weight-lean).toFixed(1)} kg</b></div><div class="stat"><small>BMI</small><b>${b.bmi.toFixed(1)}</b></div></div>
 <p class="muted" style="margin-top:8px">${b.method}</p>
 <div class="sec">⚖️ Weight</div><div class="card">${bodyRangeTabs()}${chart(ws.map(w=>w[1]),ws.map(w=>dayLbl(w[0])),{type:'line',color:'#e3262f',emoji:ws.length>1&&ws.at(-1)[1]<ws[0][1]?'📉':'⚖️'})}
 ${ws.length>1?`<p class="muted">${(ws.at(-1)[1]-ws[0][1]>0?'+':'')}${(ws.at(-1)[1]-ws[0][1]).toFixed(1)} kg in this range</p>`:''}
 ${a7?`<div class="coach" style="margin-top:8px"><span class="ci">📊</span><span class="ct">7-day average</span><b>${a7.toFixed(1)} kg</b>${p7?` · ${a7-p7<=0?'▼':'▲'} ${Math.abs(a7-p7).toFixed(1)} kg vs last week`:''}<br><small class="muted">Daily weight swings 1–2 kg from water & food — the weekly average is the real trend.</small></div>`:''}</div>
 <div class="sec">🧬 Body fat</div><div class="card">${chart(bl.map(x=>x[1]),bl.map(x=>dayLbl(x[0])),{type:'line',color:'#f97316',emoji:'🧬'})}${bl.length>1?`<p class="muted">${(bl.at(-1)[1]-bl[0][1]>0?'+':'')}${(bl.at(-1)[1]-bl[0][1]).toFixed(1)}% in this range</p>`:''}</div>
 <div class="sec">📏 Measurements</div><div class="list">${ml.map(m=>`<div class="row" style="cursor:default"><div class="rbody"><b>${new Date(m[0]).toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'})}</b><small>Waist ${m[1]} · Neck ${m[2]}${m[3]?` · Hip ${m[3]}`:''} cm</small></div></div>`).join('')||'<div class="row muted" style="cursor:default">No measurements yet — tap 📏 above</div>'}</div>
 <div style="height:16px"></div>`};
// Strength chart lives in Workouts now
const _wk12=V.workouts;V.workouts=()=>{const h=_wk12(),k='<div class="sec">🏆 All-time totals</div>';return h.includes(k)?h.replace(k,strengthCard()+k):h+strengthCard()};
// weigh-in from Body tab always logs for today
const _wi12=weighIn;weighIn=function(){if(tab==='body'&&!stack.length)viewDate=today();_wi12()};

// ================= AUTOMATIC STEPS (Android hardware step counter) =================
// The chip counts total steps since reboot, in the background, ignoring vehicle motion.
// We read it whenever the app is open/resumed and add the difference since the last reading to today.
const SSP=()=>window.Capacitor?.Plugins?.StepSensor;let stepSt={available:false,granted:false,checked:false};
async function stepStatus(){const P=SSP();if(!P){stepSt={available:false,granted:false,checked:true};return}try{stepSt={...await P.status(),checked:true}}catch(e){stepSt.checked=true}}
async function syncSteps(){const P=SSP();if(!P||!stepSt.available||!stepSt.granted)return;try{const {total}=await P.read(),d=today();
 if(!S.ss){S.ss={raw:total,day:d,at:Date.now()};save();return}
 const delta=total>=S.ss.raw?total-S.ss.raw:total; // smaller = phone rebooted, counter restarted at 0
 if(delta>0&&delta<60000){S.steps[d]=(S.steps[d]||0)+delta}S.ss={raw:total,day:d,at:Date.now()};save();
 const el=$('#stepnow');if(el&&tab==='run'&&!stack.length)render()}catch(e){}}
async function enableSteps(){const P=SSP();if(!P)return toast('Only available in the Android app');try{stepSt={...await P.request(),checked:true}}catch(e){}
 if(stepSt.granted){if(pedo.on)stopPedo();await syncSteps();toast('👟 Automatic steps on — counted all day, even with the app closed')}else toast('Permission needed: allow "Physical activity" in app settings');render()}
// While the hardware sensor is on, the old motion-sensor counter no longer adds daily steps (avoids double counting / car bumps).
const _sd13=stepDetect;stepDetect=function(e){if(stepSt.granted&&stepSt.available){const b=S.steps[today()];_sd13(e);S.steps[today()]=b}else _sd13(e)};
(async()=>{await stepStatus();if(stepSt.granted&&stepSt.available){if(pedo.on)stopPedo();S.pedoOn=false;await syncSteps()}if(tab==='run')render()})();
document.addEventListener('visibilitychange',()=>{if(!document.hidden)syncSteps()});
setInterval(()=>{if(!document.hidden)syncSteps()},30000);

function stepBox(){const auto=stepSt.available&&stepSt.granted,last=S.ss?.at;
 if(auto)return`<div class="coach" style="text-align:left"><span class="ci">✅</span><span class="ct">Automatic steps · on</span>Counted by your phone's built-in step sensor — all day, even when RepWise is closed. Car, jeep & bus rides are ignored.${last?`<br><small class="muted">Last synced ${new Date(last).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'})} · updates when you open the app</small>`:''}</div>
  <button class="btn sec2" style="margin-top:8px" onclick="addStepsManual()">✏️ Add steps manually</button>`;
 if(stepSt.available)return`<button class="btn" onclick="enableSteps()">👟 Turn on automatic steps</button><p class="muted" style="margin-top:8px">Uses your phone's step-counter chip (same as Google Fit). Asks for "Physical activity" permission once.</p>
  <button class="btn sec2" style="margin-top:8px" onclick="addStepsManual()">✏️ Enter steps manually</button>`;
 return`${pedo.on?`<button class="btn sec2" onclick="stopPedo()">⏸ Pause step counter</button><p class="muted" style="margin-top:8px">Counting only while the app is open. Pause it during rides — bumps can count as steps.</p>`:`<button class="btn sec2" onclick="startPedo()">▶ Count steps with the app open</button><p class="muted" style="margin-top:8px">This phone has no step-counter chip, so steps only count while RepWise is open on screen.</p>`}
  <button class="btn sec2" style="margin-top:8px" onclick="addStepsManual()">✏️ Enter steps manually</button>`}
function actExplain(){return`<div class="sec">Steps vs. Activity — what's the difference?</div>
 <div class="grid2" style="margin-bottom:12px"><div class="card" style="margin:0;padding:14px"><div style="font-size:26px">👟</div><b>Daily steps</b><p class="muted" style="font-size:13px;margin-top:4px">Your <b>whole day</b> of walking — class, work, errands. Runs automatically in the background. No GPS, no battery drain.</p><small><b>Counts toward:</b> step goal · cardio at 10,000</small></div>
 <div class="card" style="margin:0;padding:14px"><div style="font-size:26px">🏃</div><b>Activity</b><p class="muted" style="font-size:13px;margin-top:4px">One <b>workout</b> you start and stop — a run or walk. Tracks your GPS route, distance, pace, time & calories.</p><small><b>Counts toward:</b> cardio · leg XP · run quests · extra food calories</small></div></div>
 <div class="coach" style="margin-bottom:12px"><span class="ci">💡</span><span class="ct">Which one do I use?</span>Leave <b>daily steps</b> on and forget about it. Tap <b>Start activity</b> only when you go out on purpose to run or walk, so it's saved as a workout with a map.</div>`}

// ================= START DATE + TRAINING FREQUENCY (setup) =================
{const i=OBSTEPS.findIndex(s=>s.k==='deficit');OBSTEPS.splice(i,0,
 {k:'days',q:'How many days a week can you train?',s:'Be honest — consistency beats a perfect plan. We pick the split that science says fits best.',o:[[2,'2️⃣','2 days','Full body · minimum effective dose'],[3,'3️⃣','3 days','Full body · great for beginners'],[4,'4️⃣','4 days','Upper / Lower · each muscle 2×/week'],[5,'5️⃣','5 days','Push / Pull / Legs + extra'],[6,'6️⃣','6 days','Push / Pull / Legs ×2 · advanced'],[7,'7️⃣','Every day','We\'ll give you 6 lifting days + 1 active recovery']]},
 {k:'startDay',q:'When do you want to start?',s:'Nothing counts as "missed" before your start date.',o:[['today','⚡','Today','Start right now'],['tomorrow','🌅','Tomorrow','Fresh start in the morning'],['monday','🗓️','Next Monday','Begin with a full week']]})}
const DAYSPLIT={2:['full',2],3:['full',3],4:['ul',4],5:['ppl',5],6:['ppl',6],7:['ppl',6]};
function startISO(k){const d=new Date();d.setHours(12,0,0,0);if(k==='tomorrow')d.setDate(d.getDate()+1);if(k==='monday')d.setDate(d.getDate()+((8-d.getDay())%7||7));return iso(d)}
const _onb14=V.onboard;V.onboard=()=>{let h=_onb14();const s=OBSTEPS[OB.step];
 if(s?.k==='days'){const v=OB.d.days;h=h.replace(/(<\/div>)$/,`<div class="coach t" style="margin-top:6px"><span class="ci">🔬</span><span class="ct">What science says</span>Training each muscle <b>2× per week</b> grows more muscle than 1×, and <b>3–5 days</b> is the sweet spot for most people. Muscles grow while you <b>rest</b> — 7 hard days in a row raises injury risk and stalls progress, so "every day" gets 1 active-recovery day (walk, mobility).<small style="display:block;margin-top:6px">📚 Schoenfeld et al., 2016, Sports Med; Grgic et al., 2018, Sports Med</small></div>$1`)}
 if(s?.k==='startDay'){h=h.replace(/(<\/div>)$/,`<p class="muted" style="text-align:center;margin-top:10px">Setting this up at night? Pick <b>Tomorrow</b> so today isn't marked as missed.</p>$1`)}
 return h};
const _fob14=finishOB;finishOB=function(){if(!OB.active)return;const d=OB.d,days=d.days,sd=d.startDay;delete d.days;delete d.startDay;
 _fob14();if(!S.profile)return;if(sd){S.startDate=startISO(sd)}S.startDate??=iso(S.weights[0]?.[0]||Date.now());
 if(days){const [sp,n]=DAYSPLIT[days];S.split=sp;delete S.nextSplit;S.trainDays[sp]=n;S.profile.wantDays=days}
 delete S.profile.days;delete S.profile.startDay;S.week=null;ensureWeek();save();render()};
// Existing accounts: start = first weigh-in day
if(S.profile&&!S.startDate)S.startDate=iso(S.weights[0]?.[0]||Date.now());
// Week plan: no training/cardio before the start date
const _bw14=buildWeek;buildWeek=function(mon,split){const W=_bw14(mon,split),st=S.startDate;if(!st)return W;
 const end=(()=>{const x=new Date(mon+'T12:00');x.setDate(x.getDate()+6);return iso(x)})();if(st<=mon)return W;
 if(st>end){W.pat=[0,0,0,0,0,0,0];W.queue=[];W.cardio=[];W.n=0;W.pre=1;return W}
 const k=DOW(st+'T12:00');W.pat=W.pat.map((v,i)=>i<k?0:v);W.cardio=W.cardio.filter(i=>i>=k);
 let avail=W.pat.reduce((a,b)=>a+b,0);if(!avail){W.pat[k]=1;avail=1}W.queue=W.queue.slice(0,avail);W.n=W.queue.length;W.notes.push(`Started ${new Date(st+'T12:00').toLocaleDateString(undefined,{weekday:'long'})} — a shorter first week.`);return W};
if(S.week&&S.startDate&&S.startDate>S.week.mon){S.week=null}
const _ws14=weekStrip;weekStrip=function(){let h=_ws14();const st=S.startDate;if(!st)return h;WD.forEach((n,i)=>{const d=iso(dayOfWeek(i));if(d<st)h=h.replace(`${n}</small><div style="font-size:18px">⚪</div><small style="font-size:9px;font-weight:700;display:block;overflow:hidden;white-space:nowrap">Missed`,`${n}</small><div style="font-size:18px;opacity:.35">·</div><small style="font-size:9px;font-weight:700;display:block;overflow:hidden;white-space:nowrap;opacity:.5">—`).replace(`${n}</small><div style="font-size:18px">😴</div><small style="font-size:9px;font-weight:700;display:block;overflow:hidden;white-space:nowrap">Rest`,`${n}</small><div style="font-size:18px;opacity:.35">·</div><small style="font-size:9px;font-weight:700;display:block;overflow:hidden;white-space:nowrap;opacity:.5">—`)});return h};
// Can't browse to days before the account/plan started
const _sh14=shiftDay;shiftDay=function(n){const d=new Date(viewDate+'T12:00');d.setDate(d.getDate()+n);const first=[S.startDate,iso(S.weights[0]?.[0]||Date.now())].filter(Boolean).sort()[0];if(n<0&&iso(d)<first)return toast(`📅 Your journey started ${new Date(first+'T12:00').toLocaleDateString(undefined,{month:'short',day:'numeric'})}`);_sh14(n)};
const _plan14=V.plan;V.plan=()=>{const st=S.startDate;
 if(st&&today()<st){const d=new Date(st+'T12:00'),days=Math.round((d-new Date(today()+'T12:00'))/864e5);
  return`<div class="top"><div><small class="muted">Hi, ${esc(S.profile.name)} 👋</small><h1>Get ready</h1></div></div>
  <div class="hero rv" style="animation-delay:0s"><div style="font-size:40px">🗓️</div><div style="opacity:.9">Your plan starts</div><div class="rvdate go" style="opacity:1">${d.toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'})}</div><div style="opacity:.9">in <b>${days}</b> day${days>1?'s':''} · ${SPLITS[S.split].name}, ${S.trainDays[S.split]} days/week</div></div>
  <div class="sec">Before day one</div><div class="coach"><span class="ci">😴</span><span class="ct">Tonight</span>Get 7–9 hours of sleep — you'll lift more and stay fuller tomorrow.</div><div class="coach"><span class="ci">🛒</span><span class="ct">Stock up</span>Protein you like, oats/potatoes, fruit & veg. See <b style="color:var(--acc);cursor:pointer" onclick="push('nutrition')">Nutrition guide ›</b></div><div class="coach"><span class="ci">📏</span><span class="ct">Baseline</span>Log weight & waist/neck in the morning for an accurate start. <b style="color:var(--acc);cursor:pointer" onclick="go('body')">Body ›</b></div>
  <button class="btn sec2" style="margin-top:12px" onclick="S.startDate=today();S.week=null;save();render('fade')">⚡ Actually, start today</button>`}
 return _plan14()};

// ================= NUTRITION GUIDE (macros, better carbs, micronutrients, heart health) =================
const MICROS=[
 // [name, emoji, men, women, unit, why, sources, keywords that count as covered, heart]
 ['Fiber','🌾',38,25,'g','Keeps you full, feeds gut bacteria, lowers LDL cholesterol & blood pressure. Each +7 g/day ≈ 9% lower heart-disease risk.','Oats, lentils, beans, chia, berries, broccoli, whole-grain bread',/oat|lentil|bean|chia|berr|broccoli|whole|apple|pear|sweet potato|quinoa|vegetable|salad|monggo|munggo/i,1],
 ['Potassium','🍌',3400,2600,'mg','Balances sodium and lowers blood pressure.','Banana, potato with skin, beans, spinach, coconut water, yogurt',/banana|potato|bean|spinach|coconut|yogurt|avocado|kamote/i,1],
 ['Omega-3 (EPA/DHA)','🐟',1.6,1.1,'g','Lowers triglycerides and inflammation; supports heart rhythm.','Salmon, sardines, mackerel (galunggong, tamban), tuna, walnuts, chia',/salmon|sardin|mackerel|tuna|fish|walnut|chia|galunggong|bangus|tamban|isda/i,1],
 ['Magnesium','🥜',420,320,'mg','Muscle & nerve function, sleep, blood-sugar control.','Pumpkin seeds, almonds, spinach, dark chocolate, black beans',/seed|almond|spinach|chocolate|bean|nut|cashew/i,1],
 ['Vitamin C','🍊',90,75,'mg','Collagen for joints & skin, immunity, iron absorption, protects blood vessels.','Guava, bell pepper, calamansi, orange, papaya, broccoli, kiwi',/guava|pepper|calamansi|orange|papaya|broccoli|kiwi|strawberr|mango|bayabas/i,1],
 ['Vitamin A','🥕',900,700,'µg','Vision, immunity, skin.','Sweet potato, carrot, malunggay, squash, spinach, eggs',/sweet potato|carrot|malunggay|squash|kalabasa|spinach|egg|kamote/i,0],
 ['Vitamin D','☀️',15,15,'µg','Bones, muscle function, immunity. Most indoor people are low.','Sunlight 10–20 min, fatty fish, egg yolks, fortified milk',/salmon|sardin|egg|milk|mackerel|tuna/i,0],
 ['Vitamin K','🥬',120,90,'µg','Blood clotting and keeps calcium in bones, not arteries.','Kale, spinach, malunggay, broccoli, kangkong',/kale|spinach|malunggay|broccoli|kangkong|pechay|lettuce|cabbage/i,1],
 ['Folate','🫘',400,400,'µg','Makes red blood cells; lowers homocysteine (a heart-risk marker).','Lentils, chickpeas, spinach, asparagus, avocado',/lentil|chickpea|spinach|asparagus|avocado|bean|monggo/i,1],
 ['Iron','🥩',8,18,'mg','Carries oxygen to muscles — low iron = tired workouts.','Beef, liver, clams, lentils, spinach (+ vitamin C)',/beef|liver|clam|lentil|spinach|tahong|pork/i,0],
 ['Calcium','🥛',1000,1000,'mg','Bones, muscle contraction.','Milk, yogurt, cheese, tofu, sardines with bones',/milk|yogurt|cheese|tofu|sardin|whey/i,0],
];
const CARBS=[['Oats','🥣','4 g fiber per ½ cup, beta-glucan lowers cholesterol, slow energy'],['Sweet potato / kamote','🍠','Vitamin A + fiber, lower glycemic than white potato'],['Lentils & beans (monggo)','🫘','Carbs + protein + fiber in one'],['Quinoa','🌾','Complete protein, 5 g fiber per cup'],['Brown / red / black rice','🍚','3× the fiber of white rice, more magnesium'],['Fruit (berries, banana, apple)','🍓','Fiber, vitamin C, potassium'],['Whole-grain bread & pasta','🍞','More fiber & B vitamins than white'],['Potatoes with skin','🥔','Very filling per calorie, potassium']];
function macroT(){const t=targets(),p=S.profile,fat=Math.max(Math.round(p.weight*.7),Math.round(t.kcal*.27/9)),carb=Math.max(50,Math.round((t.kcal-t.protein*4-fat*9)/4)),fiber=Math.round(t.kcal/1000*14);return{kcal:t.kcal,protein:t.protein,fat,carb,fiber}}
V.nutrition=()=>{const m=macroT(),f=S.profile.sex==='f',names=dayFood(today()).map(x=>x[0]).join(' '),got=MICROS.filter(x=>x[7].test(names)),miss=MICROS.filter(x=>!x[7].test(names));
 const bar=(l,v,c,u='g')=>`<div style="flex:1;text-align:center"><div style="height:70px;display:flex;align-items:flex-end;justify-content:center"><i style="display:block;width:26px;border-radius:8px 8px 4px 4px;background:${c};height:${Math.min(70,v/(m.carb)*70)}px"></i></div><b style="display:block;margin-top:6px">${v}${u}</b><small class="muted">${l}</small></div>`;
 return`<div class="top">${backBtn()}<h1>Nutrition</h1><span></span></div>
 <div class="hero" style="text-align:left;padding:20px"><small style="opacity:.8;letter-spacing:.1em">YOUR DAILY FUEL</small><div style="font-size:30px;font-weight:900">${m.kcal.toLocaleString()} kcal</div><div class="flex" style="gap:8px;margin-top:10px">${bar('Protein',m.protein,'#ff4d55')}${bar('Carbs',m.carb,'#f59e0b')}${bar('Fat',m.fat,'#a8a8b6')}${bar('Fiber',m.fiber,'#22c55e')}</div></div>
 <p class="muted" style="font-size:12px;margin:8px 2px">Protein 1.6–2.2 g/kg · fat ≥0.6 g/kg for hormones · carbs fill the rest & fuel training · fiber 14 g per 1,000 kcal. 📚 Jäger et al., 2017, JISSN; IOM Dietary Reference Intakes</p>
 <div class="sec">🍠 Smarter carbs</div><p class="muted" style="margin:-4px 2px 8px">White rice isn't bad — it's great right after training. But for most meals these give more fiber, vitamins and fullness per calorie.</p>
 <div style="display:flex;gap:10px;overflow-x:auto;padding:2px 2px 10px;scroll-snap-type:x mandatory">${CARBS.map(([n,e,w])=>`<div style="flex:0 0 150px;scroll-snap-align:start;background:#fff;border-radius:18px;padding:14px;box-shadow:0 2px 12px #0000000a"><div style="font-size:30px">${e}</div><b style="font-size:14px">${n}</b><p class="muted" style="font-size:12px;margin-top:4px">${w}</p></div>`).join('')}</div>
 <div class="sec">❤️ Today's micronutrient check</div>
 <div class="card"><div class="flex" style="justify-content:space-between"><b>${got.length}/${MICROS.length} covered by what you logged</b><span class="chip" style="background:${got.length>=8?'#dcfce7':got.length>=5?'#fef3c7':'#fdeced'}">${got.length>=8?'Great':got.length>=5?'Okay':'Low'}</span></div>
 <div class="prog" style="height:8px"><i style="width:${got.length/MICROS.length*100}%"></i></div>
 <div class="flex" style="flex-wrap:wrap;gap:6px;margin-top:10px">${got.map(x=>`<span class="chip" style="background:#dcfce7;color:#16a34a">✓ ${x[0]}</span>`).join('')}</div>
 <small class="muted" style="display:block;margin-top:8px">Estimated from food names you logged today — a rough guide, not lab-accurate.</small></div>
 ${miss.length?`<div class="sec">💡 What you're missing today</div>${miss.map(([n,e,mm,ww,u,why,src,,heart])=>`<details class="card" style="padding:14px 16px"><summary style="display:flex;align-items:center;gap:12px;list-style:none;cursor:pointer"><span style="font-size:26px">${e}</span><div style="flex:1"><b>${n}</b>${heart?' <span class="chip" style="background:#fdeced;color:#e3262f;padding:2px 8px;font-size:11px">❤️ heart</span>':''}<br><small class="muted">Target ${f?ww:mm} ${u}/day</small></div><span class="chev">▾</span></summary><p style="margin:10px 0 6px">${why}</p><div class="coach" style="margin:6px 0 0"><span class="ci">🛒</span><span class="ct">Get it from</span>${src}</div></details>`).join('')}`:''}
 <div class="sec">❤️ Heart-health plate</div><div class="coach t"><span class="ci">🫀</span><span class="ct">Every meal</span>½ plate vegetables & fruit · ¼ lean protein · ¼ smart carbs · a thumb of healthy fat (olive oil, nuts, avocado). Fish 2×/week, keep salt under 2,300 mg and limit processed meats & sugary drinks.<small style="display:block;margin-top:6px">📚 AHA 2021 Dietary Guidance; Reynolds et al., 2019, Lancet (fiber)</small></div>`};
const _meals14=V.meals;V.meals=()=>_meals14().replace(`<button class="btn sec2" onclick="push('foodsci')">🥗 Smart foods</button>`,`<button class="btn sec2" onclick="push('nutrition')">🧬 Nutrition</button>`).replace(`<div class="sec">Logged</div>`,`<button class="btn sec2" style="margin-top:10px" onclick="push('foodsci')">🥗 Smart foods</button><div class="sec">Logged</div>`);

// ================= SLEEP =================
S.sleep??={};
function sleepSheet(){const v=S.sleep[viewDate]||7.5;openSheet(`<h3 style="font-size:20px">How did you sleep? 😴</h3><p class="muted">Hours of actual sleep last night.</p>
 <div style="text-align:center;font-size:48px;font-weight:900;margin:10px 0" id="slv">${v} h</div><input type="range" id="slr" min="3" max="12" step="0.5" value="${v}" style="width:100%" oninput="$('#slv').textContent=this.value+' h'">
 <button class="btn" style="margin-top:14px" onclick="S.sleep[viewDate]=+$('#slr').value;save();closeSheet();render();toast(S.sleep[viewDate]>=7?'😴 Recovered — great for muscle & hunger':'⚠️ Under 7 h — aim for an earlier night')">Save</button>
 <small class="muted" style="display:block;margin-top:10px;cursor:pointer;color:var(--acc);font-weight:700" onclick="closeSheet();push('sleep')">Why sleep matters ›</small>`)}
V.sleep=()=>{const days=[...Array(7)].map((_,i)=>{const d=new Date();d.setDate(d.getDate()-6+i);return iso(d)}),vals=days.map(d=>S.sleep[d]||0),got=vals.filter(Boolean),avg=got.length?got.reduce((a,b)=>a+b,0)/got.length:0;
 return`<div class="top">${backBtn()}<h1>Sleep</h1><span></span></div>
 <div class="hero" style="padding:22px"><div style="font-size:38px">🌙</div><div style="opacity:.85">7-day average</div><div style="font-size:40px;font-weight:900">${avg?avg.toFixed(1)+' h':'—'}</div><div style="opacity:.85">${avg>=7?'In the recovery zone ✅':avg?'Below the 7–9 h target':'Log your sleep on the Plan tab'}</div>
 <div class="flex" style="gap:6px;align-items:flex-end;height:70px;margin-top:12px">${vals.map((v,i)=>`<div style="flex:1;text-align:center"><i style="display:block;border-radius:6px;background:${v>=7?'#ff4d55':'#55556a'};height:${v/12*60}px;min-height:3px"></i><small style="font-size:10px;opacity:.7">${WD[DOW(days[i]+'T12:00')][0]}</small></div>`).join('')}</div></div>
 <div class="sec">Why it's part of your plan</div>
 ${[['⚖️','Fat loss','Dieters sleeping 5.5 h lost 55% less fat and 60% more muscle than at 8.5 h — same calories.','Nedeltcheva et al., 2010, Ann Intern Med'],['💪','Muscle growth','One night of sleep loss cut muscle protein synthesis by 18% and dropped testosterone.','Lamon et al., 2021, Physiol Rep'],['🍩','Hunger','Short sleep raises ghrelin (hunger) and lowers leptin (fullness) — people eat ~300 kcal more the next day.','Spiegel et al., 2004, Ann Intern Med; Al Khatib et al., 2017, Eur J Clin Nutr'],['🏋️','Performance','Under-slept lifters do fewer reps and feel workouts are harder.','Knowles et al., 2018, J Sci Med Sport'],['🫀','Heart','Regular <6 h sleep is linked to higher blood pressure and heart-disease risk.','Cappuccio et al., 2011, Eur Heart J']].map(([e,t,b,s])=>`<div class="coach t"><span class="ci">${e}</span><span class="ct">${t}</span>${b}<small style="display:block;margin-top:6px">📚 ${s}</small></div>`).join('')}
 <div class="sec">Better sleep tonight</div><div class="coach"><span class="ci">✅</span><span class="ct">Simple habits</span>Same bed & wake time daily · no caffeine after 2 pm · dark, cool room (~18–20 °C) · screens off 30–60 min before bed · big meals 2–3 h before sleep.</div>`};
const _plan14b=V.plan;V.plan=()=>{let h=_plan14b();if(S.startDate&&today()<S.startDate)return h;const sl=S.sleep[viewDate];
 const row=`<div class="row" onclick="sleepSheet()"><div class="tile" style="background:#e0e7ff">😴</div><div class="rbody"><b>Sleep</b><small>${sl?`${sl} h logged${sl<7?' · aim for 7–9 h':' · recovered ✅'}`:'7–9 h · muscles grow while you sleep'}</small><div class="prog"><i style="width:${Math.min(100,(sl||0)/8*100)}%"></i></div></div><span class="chev">›</span></div>`;
 // put sleep first in the Optional list
 return h.replace(/(🌿 Optional[\s\S]*?<div class="list">)/,`$1${row}`)};

// ================= LESS REDUNDANCY + DISTINCT SECTIONS =================
// Plan: keep only the check-in reminder (full progress lives in Body). Body: compact goals instead of repeating them.
liveProgressPlan=()=>{const due=dueList(),p=S.profile,snz=p.snooze&&Date.now()-p.snooze<864e5;return due.length&&!snz&&(S.goals?.weight||S.goals?.bf)?`<div class="coach q" style="cursor:pointer" onclick="checkIn()"><span class="ci">📋</span><span class="ct">Check-in due</span>Update your ${due.map(x=>({weight:'weight',meas:'measurements',height:'height'})[x]).join(', ')} to keep your plan accurate. <b>Tap ›</b></div>`:''};
var liveProgressPlan;
const _plan14c=V.plan;V.plan=()=>{const lp=liveProgress();let h=_plan14c();return lp&&h.includes(lp)?h.replace(lp,liveProgressPlan()):h};
function goalsCompact(){const G=S.goals||{};const rows=Object.keys(GOALDEF).filter(k=>!G[k]||G[k].done).map(k=>`<div class="row" onclick="goalSheet('${k}')"><span style="font-size:22px">🎯</span><div class="rbody"><b>${G[k]?.done?`${GOALDEF[k].label} reached! 🏆`:`Set a ${GOALDEF[k].label.toLowerCase()}`}</b><small>${G[k]?.done?'Set your next checkpoint':'Short-term checkpoint, 8–12 weeks'}</small></div><span class="chip">➕</span></div>`).join('');
 const h=goalCard(),i=h.indexOf('<div class="coach t"><span class="ci">📏</span>');return(rows?`<div class="list">${rows}</div>`:'')+(i>=0?h.slice(i):'')}
const _body14=V.body;V.body=()=>_body14().replace(goalCard(),goalsCompact());
// (section header styling moved to theme.css)
