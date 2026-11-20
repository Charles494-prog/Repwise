// RepWise features: custom deficit, science foods, intermittent fasting, exercise form guides.
// Loaded after the main script; re-renders once at the end.

// ================= CUSTOM DEFICIT =================
// What happens in the body at each deficit size (shown live as you slide).
function deficitInfo(d){const t=targets(),kcal=t.tdee-d,kg=(d*7/7700),pct=kg/S.profile.weight*100,floor=S.profile.sex==='m'?1500:1200;
 let lvl,color,tip,src;
 if(d<=0){lvl='Maintenance';color='#3b82f6';tip='No deficit: weight stays stable. Great for building muscle and recomposition if you lift and eat enough protein.';src='Barakat et al., 2020, Strength Cond J (body recomposition)'}
 else if(d<=300){lvl='Gentle';color='#22c55e';tip='A small deficit is the easiest to stick to and keeps almost all of your muscle, energy and gym performance. Slower, but very sustainable.';src='Helms et al., 2014, J Int Soc Sports Nutr'}
 else if(d<=600){lvl='Moderate · sweet spot';color='#22c55e';tip='About 0.5 kg per week. Research shows this pace preserves lean mass well when you lift and eat 1.6–2.2 g/kg protein. Hunger is manageable.';src='Garthe et al., 2011, Int J Sport Nutr Exerc Metab'}
 else if(d<=1000){lvl='Aggressive';color='#f59e0b';tip='Faster results (~0.6–0.9 kg/week), but it gets tougher: more hunger, lower energy in the gym, and a higher risk of losing some muscle. Keep protein high (2.2 g/kg), lift heavy and sleep 7–9 h.';src='Helms et al., 2014; Murphy & Koehler, 2022, Scand J Med Sci Sports'}
 else if(d<=1500){lvl='Very aggressive';color='#f97316';tip='Your body adapts: metabolism slows (adaptive thermogenesis), hunger hormones like ghrelin rise and leptin falls. More of the weight lost can be muscle. Best kept short (a few weeks) with a diet break after.';src='Rosenbaum & Leibel, 2010, Int J Obes; Trexler et al., 2014, JISSN'}
 else{lvl='Extreme';color='#ef4444';tip='Above ~1500 kcal/day deficit, studies show large muscle loss, fatigue, hair thinning, hormone disruption (testosterone/estrogen, thyroid), gallstone risk, and a strong rebound. Only safe under medical supervision.';src='Weinsier et al., 2000 (gallstones); Hall & Kahan, 2018, Med Clin North Am'}
 return{lvl,color,tip,src,kcal,kg,pct,floor,risky:d>1000||kcal<floor||pct>1}}

function deficitSheet(){const t=targets(),cur=-t.adj;openSheet(`<h3 style="font-size:20px">Daily deficit 🔥</h3><p class="muted">Maintenance: <b>${t.tdee} kcal</b>. Slide to choose how much less you eat each day.</p>
 <div style="text-align:center;margin:10px 0"><b id="dfv" style="font-size:40px;font-weight:900">${cur}</b> <span class="muted">kcal/day</span></div>
 <input id="dfr" type="range" min="0" max="2500" step="50" value="${Math.max(0,cur)}" style="width:100%;padding:0;accent-color:var(--acc)" oninput="updDeficit()">
 <div id="dfinfo"></div>
 <button class="btn" style="margin-top:10px" onclick="saveDeficit()">Save deficit</button>
 ${S.profile.deficit!=null?`<button class="btn sec2" style="margin-top:8px" onclick="delete S.profile.deficit;save();closeSheet();render();toast('Back to your goal default')">Reset to goal default</button>`:''}`);updDeficit()}
function updDeficit(){const d=+$('#dfr').value,i=deficitInfo(d);$('#dfv').textContent=d;$('#dfv').style.color=i.color;
 $('#dfinfo').innerHTML=`<div class="grid2" style="margin:8px 0"><div class="stat"><small>You eat</small><b>${i.kcal}</b></div><div class="stat"><small>Est. loss / week</small><b>${i.kg.toFixed(2)} kg</b></div></div>
 <div class="tip" style="border-left:4px solid ${i.color}"><b style="color:${i.color}">🤖 ${i.lvl}</b><br>${i.tip}<br><small class="muted">📚 ${i.src}</small></div>
 ${i.kcal<i.floor?`<div class="tip" style="background:#fee2e2">⚠️ ${i.kcal} kcal is below the common minimum of ${i.floor} kcal/day — hard to get enough vitamins, minerals and protein.</div>`:''}
 ${i.pct>1?`<div class="tip" style="background:#fee2e2">⚠️ That's ${i.pct.toFixed(1)}% of your bodyweight per week — above the 0.5–1% range shown to protect muscle.</div>`:''}`}
function saveDeficit(){const d=+$('#dfr').value,i=deficitInfo(d);
 if(i.risky&&!confirm(`Are you sure? A ${d} kcal deficit (${i.kcal} kcal/day) is ${i.lvl.toLowerCase()}.\n\nWhat it does to your body:\n• Faster muscle loss (more of the weight lost is muscle, not fat)\n• Metabolism slows and hunger hormones rise\n• Low energy, poor sleep & weaker workouts\n• Risk of nutrient gaps, hormone disruption and gallstones\n• Higher chance of rebound weight gain\n\nYou can still choose it — press OK to continue.`))return;
 S.profile.deficit=d;save();closeSheet();render();toast(`🔥 Deficit set to ${d} kcal`)}

// ================= SCIENCE FOODS =================
// [name, emoji, kcal, protein, why, [[nutrient, what it does], ...], source]
const SFOODS=[
 ['Salmon (100g)','🐟',208,20,'High-quality protein + omega-3 fats.',[['Omega-3 (EPA/DHA)','Lowers triglycerides, reduces inflammation and helps keep heart rhythm steady — linked to lower risk of heart disease.'],['Vitamin D','Helps absorb calcium for strong bones; supports immune function and muscle strength.'],['Vitamin B12','Needed to make red blood cells and keep nerves healthy; fights tiredness.'],['Selenium','Antioxidant that protects cells and supports thyroid (metabolism) function.']],'Mozaffarian & Wu, 2011, J Am Coll Cardiol; AHA scientific statement 2018'],
 ['Chicken breast (100g)','🍗',165,31,'Very low calorie, very high protein — the cutting classic.',[['Protein (31 g)','Builds and repairs muscle and keeps you full longer than carbs or fat.'],['Niacin (B3)','Helps turn food into energy.'],['Vitamin B6','Supports protein metabolism and brain chemicals like serotonin.'],['Phosphorus','Builds bones and teeth with calcium.']],'Morton et al., 2018, Br J Sports Med; Leidy et al., 2015, Am J Clin Nutr (satiety)'],
 ['Eggs (2 large)','🥚',144,12,'Cheap complete protein with almost every vitamin.',[['Choline','Builds cell membranes and the memory neurotransmitter acetylcholine.'],['Lutein & zeaxanthin','Collect in the eye and protect against age-related vision loss.'],['Vitamin B12','Red blood cells and nerve health.'],['Leucine','The amino acid that "switches on" muscle building.']],'Wallace & Fulgoni, 2017, Nutrients'],
 ['Greek yogurt (170g)','🥛',100,17,'High protein, gut-friendly snack.',[['Probiotics','Live cultures that support a healthy gut microbiome and digestion.'],['Calcium','Strong bones and normal muscle contraction.'],['Casein protein','Slow-digesting — keeps muscle fed for hours (great before bed).']],'Snijders et al., 2015, J Nutr (pre-sleep protein)'],
 ['Tuna (1 can)','🐟',120,26,'Lean protein, very low calorie.',[['Protein (26 g)','Muscle repair and fullness.'],['Omega-3','Heart and brain health.'],['Selenium','Antioxidant protection.']],'USDA FoodData Central'],
 ['Spinach (1 cup cooked)','🥬',41,5,'Huge nutrients for almost no calories.',[['Iron','Carries oxygen in your blood — low iron = fatigue.'],['Vitamin K','Needed for blood clotting and bone strength.'],['Folate','Helps make DNA and new cells.'],['Nitrates','Widen blood vessels, can lower blood pressure and improve exercise efficiency.']],'Jones, 2014, Sports Med (dietary nitrate)'],
 ['Oats (1/2 cup dry)','🥣',150,5,'Slow-release carbs that lower cholesterol.',[['Beta-glucan fibre','Lowers LDL ("bad") cholesterol and keeps blood sugar steady.'],['Magnesium','Over 300 body reactions incl. muscle and nerve function and sleep.'],['Manganese','Bone formation and metabolism.']],'Whitehead et al., 2014, Am J Clin Nutr (meta-analysis)'],
 ['Sweet potato (medium)','🍠',110,2,'Filling carb packed with vitamin A.',[['Beta-carotene → Vitamin A','Healthy vision, skin and immune system.'],['Fibre','Feeds gut bacteria and keeps you full.'],['Potassium','Balances fluids and helps control blood pressure.']],'USDA FoodData Central'],
 ['Banana','🍌',105,1,'Quick pre-workout fuel.',[['Potassium','Muscle contraction and fluid balance; counters high blood pressure.'],['Vitamin B6','Energy metabolism.'],['Fast carbs','Top up muscle glycogen for better training.']],'Nieman et al., 2012, PLoS One (bananas vs sports drink)'],
 ['Berries (1 cup)','🫐',85,1,'Low calorie, high antioxidant.',[['Vitamin C','Builds collagen (skin, tendons), boosts immunity and iron absorption.'],['Anthocyanins','Antioxidants linked with better blood pressure and brain aging.'],['Fibre','Fullness and gut health.']],'Cassidy et al., 2013, Circulation'],
 ['Almonds (28g)','🌰',164,6,'Healthy fats — portion carefully, calorie dense.',[['Vitamin E','Antioxidant protecting cells from damage.'],['Magnesium','Muscle, nerve and blood sugar control.'],['Monounsaturated fat','Improves cholesterol profile — heart protective.']],'Kalita et al., 2018, PLoS One'],
 ['Lentils (1 cup cooked)','🫘',230,18,'Plant protein + tons of fibre.',[['Fibre (15 g)','Fullness, steady blood sugar, lower cholesterol.'],['Folate','DNA and cell building.'],['Iron','Oxygen transport.']],'Kim et al., 2016, Obesity (pulses & weight loss)'],
 ['Broccoli (1 cup)','🥦',55,4,'Volume food: eat a lot, few calories.',[['Vitamin C','Immunity and collagen.'],['Vitamin K','Bone health and clotting.'],['Sulforaphane','Plant compound that activates the body\'s own antioxidant defences.']],'Houghton, 2019, Oxid Med Cell Longev'],
 ['Lean beef (100g)','🥩',200,26,'Protein + the best source of creatine and zinc.',[['Zinc','Immune function, wound healing and testosterone production.'],['Heme iron','The most easily absorbed iron.'],['Creatine','Naturally boosts strength and power.'],['Vitamin B12','Energy and nerves.']],'USDA FoodData Central'],
 ['Cottage cheese (1/2 cup)','🧀',90,12,'Cheap slow protein, low calorie.',[['Casein','Slow-digesting protein for overnight muscle repair.'],['Calcium','Bones and muscles.'],['Phosphorus','Bones and energy (ATP).']],'Res et al., 2012, Med Sci Sports Exerc'],
];
V.foodsci=()=>`<div class="top">${backBtn()}<h1>Smart foods</h1><span></span></div><p class="muted" style="margin-bottom:12px">Science-backed picks — what they give you and what each nutrient does for your body.</p>
 <div class="stagger">${SFOODS.map(([n,e,k,p,why,nut,src],i)=>`<div class="card"><div class="flex"><span style="font-size:36px;flex:none">${e}</span><div style="flex:1"><b style="font-size:17px">${n}</b><br><small class="muted">${k} kcal · ${p} g protein</small></div><button class="btn sm" onclick="logSFood(${i})">+ Log</button></div>
 <p style="font-size:14px;margin:8px 0;font-weight:700">${why}</p>${nut.map(([a,b])=>`<div class="tip" style="margin:6px 0"><b>${a}</b> — ${b}</div>`).join('')}<small class="muted">📚 ${src}</small></div>`).join('')}</div>`;
function logSFood(i){const f=SFOODS[i];if(!fastOK())return;(S.food[viewDate]??=[]).push([f[0],f[2],f[3]]);save();toast(`${f[1]} ${f[0]} logged`);xpFly(`+${f[2]} kcal`)}

// ================= INTERMITTENT FASTING =================
// [id, fastHours, label, who it suits, benefits]
const FASTS=[
 ['12:12',12,'Beginner','Easiest start — basically no late-night snacking.'],
 ['14:10',14,'Easy','Gentle step up; good for most people.'],
 ['16:8',16,'Most popular','Leangains style. Most studied daily protocol.'],
 ['18:6',18,'Advanced','Longer fast, shorter window.'],
 ['20:4',20,'Warrior','Very short window — hard to hit protein.'],
 ['23:1',23,'OMAD','One meal a day. Not recommended for muscle gain.'],
];
const FAST_SCI=[
 ['🔥','Fewer calories, naturally','A shorter eating window makes most people eat less without counting. Weight loss is similar to normal dieting at the same calories — fasting is a tool, not magic.','Lowe et al., 2020, JAMA Intern Med; de Cabo & Mattson, 2019, NEJM'],
 ['🩸','Insulin sensitivity','After ~12 h without food insulin drops, and the body gets better at handling blood sugar.','Sutton et al., 2018, Cell Metab (early time-restricted eating)'],
 ['⚡','Metabolic switch','After 12–36 h of fasting the liver runs low on glycogen and the body shifts to burning more fat and making ketones.','Anton et al., 2018, Obesity'],
 ['♻️','Cellular cleanup (autophagy)','Fasting activates autophagy — cells recycle damaged parts. Strong in animal studies; human evidence is still early.','Mizushima & Levine, 2010; de Cabo & Mattson, 2019, NEJM'],
 ['❤️','Heart markers','Can lower blood pressure, LDL cholesterol and triglycerides, mostly via weight loss.','Patterson & Sears, 2017, Annu Rev Nutr'],
 ['💪','Keep your muscle','Lift weights and still hit your protein inside the window — 16:8 with training kept muscle in trained men.','Moro et al., 2016, J Transl Med'],
 ['⚠️','Who should skip it','Not advised if pregnant/breastfeeding, under 18, diabetic on medication, or with a history of eating disorders. Water, black coffee and plain tea are fine while fasting.','Expert consensus'],
];
S.fast??={on:false,proto:'16:8',start:12};
function fastWin(){const F=S.fast,h=FASTS.find(f=>f[0]===F.proto)[1],eat=24-h,st=F.start,en=(st+eat)%24;return{h,eat,st,en}}
function fastState(now=new Date()){const {eat,st}=fastWin(),hr=now.getHours()+now.getMinutes()/60,into=((hr-st)%24+24)%24,open=into<eat;
 const left=open?eat-into:24-into;return{open,left}}
const hh=h=>{const H=Math.floor(h)%24,M=Math.round((h%1)*60);return new Date(2000,0,1,H,M).toLocaleTimeString([],{hour:'numeric',minute:M?'2-digit':undefined})};
const dur=h=>`${Math.floor(h)}h ${String(Math.round((h%1)*60)).padStart(2,'0')}m`;
function fastOK(){if(!S.fast.on||viewDate!==today())return true;const s=fastState();if(s.open)return true;
 return confirm(`⏳ You're fasting right now (${S.fast.proto}). Your eating window opens in ${dur(s.left)} at ${hh(fastWin().st)}.\n\nLog this food anyway?`)}
function fastCard(){if(!S.fast.on)return'';const s=fastState(),w=fastWin(),p=s.open?1-s.left/w.eat:1-s.left/w.h;
 return`<div class="card" onclick="push('fasting')" style="cursor:pointer;background:${s.open?'linear-gradient(135deg,#dcfce7,#f0fdf4)':'linear-gradient(135deg,#ede9fe,#f5f3ff)'}"><div class="flex"><span style="font-size:34px;flex:none">${s.open?'🍽️':'⏳'}</span><div style="flex:1"><b>${s.open?'Eating window open':'Fasting'} · ${S.fast.proto}</b><br><small class="muted">${s.open?`Closes in ${dur(s.left)} (${hh(w.en)})`:`You can eat in ${dur(s.left)} (${hh(w.st)})`}</small><div class="prog"><i style="width:${Math.min(100,p*100)}%;background:${s.open?'#22c55e':'#a855f7'}"></i></div></div></div></div>`}
V.fasting=()=>{const F=S.fast,w=fastWin();return`<div class="top">${backBtn()}<h1>Fasting</h1><span></span></div>
 ${fastCard()}
 <div class="card flex"><div style="flex:1"><b>Intermittent fasting mode</b><br><small class="muted">Reminders when your window opens & closes</small></div><button class="btn sm ${F.on?'':'sec2'}" onclick="togFast()">${F.on?'ON':'OFF'}</button></div>
 <div class="sec">⏱️ Choose your protocol (fast : eat)</div>
 ${FASTS.map(([id,h,lbl,d])=>`<div class="opt ${F.proto===id?'on':''}" onclick="S.fast.proto='${id}';save();schedFast();render()"><span class="e" style="font-size:16px;font-weight:900;min-width:52px">${id}</span><div><b>${lbl}</b><small>${h} h fasting · ${24-h} h eating · ${d}</small></div></div>`).join('')}
 <div class="sec">🍽️ Eating window starts at</div><div class="card"><select onchange="S.fast.start=+this.value;save();schedFast();render()">${Array.from({length:24},(_,i)=>`<option value="${i}" ${i===F.start?'selected':''}>${hh(i)}</option>`).join('')}</select>
 <p class="muted" style="margin-top:8px">Eat <b>${hh(w.st)} – ${hh(w.en)}</b>, fast the other ${w.h} hours. Tip: an earlier window (e.g. 8am–4pm) showed better blood sugar results than a late one.</p></div>
 <div class="sec">⏳ Hour by hour: what happens in your body</div>${fastTimeline()}
 <div class="sec">🔬 What fasting does to your body</div><div class="stagger">${FAST_SCI.map(s=>sciCard(s)).join('')}</div>`};
function togFast(){S.fast.on=!S.fast.on;save();schedFast();render();toast(S.fast.on?`⏳ ${S.fast.proto} fasting on`:'Fasting mode off');
 if(S.fast.on&&window.Notification&&Notification.permission==='default')Notification.requestPermission()}
// Reminders: native local notifications if the Capacitor plugin exists, else in-app timers while the app is open.
let fastT=[];
async function schedFast(){fastT.forEach(clearTimeout);fastT=[];const LN=window.Capacitor?.Plugins?.LocalNotifications;
 if(LN){try{await LN.cancel({notifications:[{id:701},{id:702}]})}catch(e){}}
 if(!S.fast.on)return;const w=fastWin(),msgs=[[701,w.st,'🍽️ Eating window open',`Your ${S.fast.proto} window is open until ${hh(w.en)}. Prioritise protein!`],[702,w.en,'⏳ Fast started',`Eating window closed. Next meal at ${hh(w.st)}. Water, black coffee & tea are fine.`]];
 if(LN){try{await LN.requestPermissions();await LN.schedule({notifications:msgs.map(([id,h,title,body])=>({id,title,body,schedule:{on:{hour:Math.floor(h)%24,minute:0},repeats:true}}))});return}catch(e){}}
 msgs.forEach(([,h,title,body])=>{const n=new Date(),t=new Date();t.setHours(Math.floor(h)%24,0,0,0);if(t<=n)t.setDate(t.getDate()+1);
  fastT.push(setTimeout(()=>{toast(`<b>${title}</b><br>${body}`);vib([60,60,60]);try{if(window.Notification&&Notification.permission==='granted')new Notification(title,{body})}catch(e){}schedFast();render()},t-n))})}

// ================= EXERCISE FORM GUIDES =================
// [visual cue lines (shown as a "key positions" strip), dos, don'ts]
const FORM={
 'Push-up':[['🧍 Plank: hands under shoulders','⬇️ Lower: elbows ~45°, chest to fist height','⬆️ Press: body moves as one plank'],['Squeeze glutes & brace abs — straight line head to heels','Elbows at about 45° from your body','Full range: chest close to the floor'],['Hips sagging or piking up','Elbows flared out to 90° (shoulder strain)','Half reps / head poking forward']],
 'Bench Press':[['🛏️ Shoulder blades pinched, feet planted','⬇️ Bar to lower chest, forearms vertical','⬆️ Press up and slightly back over shoulders'],['Retract & depress shoulder blades','Touch lower chest every rep, control the descent','Use a spotter or safety bars when going heavy'],['Bouncing the bar off your chest','Butt lifting off the bench','Flaring elbows to 90°']],
 'Squat':[['🧍 Feet shoulder-width, toes slightly out','⬇️ Sit between your heels, knees track over toes','⬆️ Drive up through mid-foot, chest proud'],['Brace your core (big breath) before each rep','Hip crease at or below knee if mobility allows','Knees follow the direction of your toes'],['Knees caving inward','Heels lifting off the floor','Rounding the lower back at the bottom']],
 'Deadlift':[['🧍 Bar over mid-foot, shins close','🤲 Hinge, flat back, lats tight','⬆️ Push the floor away, hips & shoulders rise together'],['Keep the bar touching your legs all the way','Neutral spine, chest up, lats "squeezing oranges in your armpits"','Lock out by squeezing glutes'],['Rounded back','Jerking the bar off the floor','Leaning back / hyperextending at the top']],
 'Romanian Deadlift':[['🧍 Soft knees','↘️ Push hips BACK, bar slides down thighs','⬆️ Stand by driving hips forward'],['Feel the stretch in your hamstrings','Flat back the whole time','Stop when your hips stop moving back'],['Squatting it down (bending knees a lot)','Rounding the back to reach lower','Bar drifting away from legs']],
 'Pull-up':[['🐒 Dead hang, shoulders active','⬆️ Pull elbows down to ribs','🎯 Chin over the bar, then lower slowly'],['Start each rep from a full hang','Think "elbows to back pockets"','Control the way down (2–3 s)'],['Kipping / swinging for reps','Half reps (not fully extending)','Shrugging shoulders to ears']],
 'Overhead Press':[['🧍 Bar on front delts, glutes tight','⬆️ Press straight up, move head back','🙌 Head through at lockout'],['Squeeze glutes and abs — no leaning back','Bar path in a straight line','Full lockout overhead'],['Big lower-back arch','Pressing the bar forward around the face','Using leg drive (that\'s a push press)']],
 'Barbell Row':[['🤲 Hinge to ~45°, flat back','⬆️ Pull bar to lower ribs','⬇️ Lower under control'],['Lead with the elbows','Squeeze shoulder blades at the top','Keep torso angle fixed'],['Standing up as you row (body English)','Rounded back','Jerking the weight']],
 'Plank Hold (sec)':[['🧍 Elbows under shoulders','📏 Straight line head–heels','😤 Breathe while braced'],['Squeeze glutes and pull ribs down','Push the floor away with forearms','Quality over time — stop when form breaks'],['Hips sagging','Butt high in the air','Holding your breath']],
 'Lunge':[['🧍 Tall posture','⬇️ Step & drop back knee toward floor','⬆️ Push through front heel'],['Front knee tracks over toes','Torso upright, core tight','Both knees ~90° at the bottom'],['Front knee caving in','Too short a step (heel lifts)','Slamming back knee into the floor']],
 'Dips':[['💪 Locked out, shoulders down','⬇️ Lean slightly forward, lower to ~90°','⬆️ Press to lockout'],['Shoulders down and back','Controlled depth to about 90° elbows','Lean forward for chest, upright for triceps'],['Dropping too deep with shoulders rolled forward','Shrugging','Swinging legs for momentum']],
 'Hip Thrust':[['🪑 Upper back on bench, bar on hips','⬆️ Drive hips up, chin tucked','⏸️ Pause & squeeze at the top'],['Shins vertical at the top','Ribs down, posterior pelvic tilt at lockout','Pad the bar'],['Over-arching the lower back','Pushing through toes','Rushing the top squeeze']],
};
const FORM_DEF=[['🎯 Set up stable & braced','🐢 Lower under control (2–3 s)','💥 Lift with intent'],['Full range of motion you can control','Brace your core before every rep','Leave 0–3 reps in the tank'],['Using momentum to swing the weight','Sacrificing form for more weight','Holding your breath for long sets']];
function formSheet(ex){const f=FORM[ex]||FORM_DEF;openSheet(`<h3 style="font-size:20px">${esc(ex)} — form</h3>${FORM[ex]?'':'<p class="muted">General lifting cues</p>'}
 <div class="grid2" style="grid-template-columns:repeat(3,1fr);gap:6px;margin:10px 0">${f[0].map((c,i)=>`<div class="stat" style="padding:10px 6px;text-align:center"><small>Step ${i+1}</small><div style="font-size:13px;font-weight:700;margin-top:4px;line-height:1.3">${c}</div></div>`).join('')}</div>
 <div class="sec">✅ Do</div>${f[1].map(x=>`<div class="tip" style="background:#dcfce7">✅ ${x}</div>`).join('')}
 <div class="sec">❌ Don't</div>${f[2].map(x=>`<div class="tip" style="background:#fee2e2">❌ ${x}</div>`).join('')}
 <small class="muted">📚 Cues from NSCA Essentials of Strength Training & Conditioning, 4th ed.</small>`)}

// ================= WORKOUT STYLES (SPLITS) =================
Object.assign(EX,{'Band-assisted Pull-up':[['Back'],['Biceps'],'🧗'],'Wall Push-up':[['Chest'],['Triceps'],'🤸'],'Goblet Squat':[['Quads','Glutes'],['Core'],'🦵'],'Glute Bridge':[['Glutes'],['Hamstrings'],'🍑'],'Arnold Press':[['Shoulders'],['Triceps'],'🙌'],'Bench Dip':[['Triceps'],['Chest'],'⬇️'],'Dead Bug':[['Core'],[],'🐞']});
Object.assign(EX,S.customEx);
Object.assign(PROGS,{
 chest:{name:'Chest & Triceps',sub:'Bro split day',e:'🏋️',bg:'#ffe4e6',ex:['Bench Press','Incline Dumbbell Press','Chest Fly','Dips','Tricep Pushdown','Skull Crusher'],m:['Chest','Triceps']},
 backbi:{name:'Back & Biceps',sub:'Bro split day',e:'🧗',bg:'#e0f2fe',ex:['Pull-up','Barbell Row','Seated Cable Row','Barbell Curl','Hammer Curl'],m:['Back','Biceps']},
 shoulders:{name:'Shoulders & Abs',sub:'Bro split day',e:'🙌',bg:'#fef3c7',ex:['Overhead Press','Lateral Raise','Face Pull','Hanging Leg Raise','Plank Hold (sec)'],m:['Shoulders','Core']},
 upper:{name:'Upper Body',sub:'Chest, back, shoulders, arms',e:'💪',bg:'#ede9fe',ex:['Bench Press','Barbell Row','Overhead Press','Lat Pulldown','Barbell Curl','Tricep Pushdown'],m:['Chest','Back','Shoulders','Biceps','Triceps']},
 lower:{name:'Lower Body',sub:'Quads, hamstrings, glutes, calves',e:'🦵',bg:'#dcfce7',ex:['Squat','Romanian Deadlift','Leg Press','Leg Curl','Calf Raise','Hanging Leg Raise'],m:['Quads','Hamstrings','Glutes','Calves','Core']},
 arnchest:{name:'Chest & Back',sub:'Arnold split',e:'🦍',bg:'#ffe4e6',ex:['Bench Press','Pull-up','Incline Dumbbell Press','Barbell Row','Chest Fly'],m:['Chest','Back']},
 arnshar:{name:'Shoulders & Arms',sub:'Arnold split',e:'💪',bg:'#fef3c7',ex:['Overhead Press','Lateral Raise','Barbell Curl','Skull Crusher','Hammer Curl','Tricep Pushdown'],m:['Shoulders','Biceps','Triceps']},
});
// Rotation: one exercise per muscle group, variations rotate every day.
const ROT={Chest:['Bench Press','Push-up','Incline Dumbbell Press','Dips'],Back:['Pull-up','Barbell Row','Lat Pulldown','Seated Cable Row'],Shoulders:['Overhead Press','Lateral Raise','Arnold Press','Face Pull'],Biceps:['Barbell Curl','Hammer Curl','Chin-up'],Triceps:['Tricep Pushdown','Skull Crusher','Bench Dip'],Quads:['Squat','Leg Press','Lunge','Goblet Squat'],Hamstrings:['Romanian Deadlift','Leg Curl'],Glutes:['Hip Thrust','Glute Bridge'],Calves:['Calf Raise'],Core:['Hanging Leg Raise','Plank Hold (sec)','Crunch','Dead Bug']};
PROGS.rotation={name:'Daily Rotation',sub:'1 exercise per muscle, changes daily',e:'🔄',bg:'#ccfbf1',m:MUSCLES,get ex(){return MUSCLES.map(m=>ROT[m][dayIdx()%ROT[m].length])}};
const SPLITS={
 ppl:{name:'Push / Pull / Legs',days:['push','pull','legs'],d:'3 or 6 days/week. Each muscle trained by movement pattern.'},
 ul:{name:'Upper / Lower',days:['upper','lower'],d:'4 days/week. Hits every muscle 2×/week — great for beginners & intermediates.'},
 full:{name:'Full Body',days:['full'],d:'2–3 days/week. Best when time is short; every muscle each session.'},
 bro:{name:'Bro Split',days:['chest','backbi','shoulders','legs'],d:'Chest & tris, back & bis, shoulders & abs, legs. High volume per session, each muscle ~1×/week.'},
 arnold:{name:'Arnold Split',days:['arnchest','arnshar','legs'],d:'Chest & back, shoulders & arms, legs. Run it twice a week (6 days).'},
 rotation:{name:'Daily Rotation',days:['rotation'],d:'Every muscle group gets 1 exercise each day; the exercise rotates daily. Short, frequent sessions.'},
};
S.split=SPLITS[S.split]?S.split:'ppl';S.subs??={};
V.splits=()=>`<div class="top">${backBtn()}<h1>Workout style</h1><span></span></div>
 ${Object.entries(SPLITS).map(([k,sp])=>`<div class="opt ${S.split===k?'on':''}" onclick="S.split='${k}';save();render();toast('🗓️ ${sp.name}')"><span class="e">${PROGS[sp.days[0]].e}</span><div><b>${sp.name}</b><small>${sp.d}<br>${sp.days.map(d=>PROGS[d].name).join(' → ')}</small></div></div>`).join('')}
 ${sciCard(['📅','Which split is best?','When total weekly sets are equal, splits build similar muscle. Training each muscle at least 2×/week has a small edge — pick the one you will actually stick to.','Schoenfeld et al., 2016 & 2019 meta-analyses, Sports Med'])}`;

// ================= "I CAN'T DO THIS YET" → EASIER PROGRESSIONS =================
const EASIER={
 'Pull-up':[['Negative Pull-up','Jump up, lower over 3–5 s — builds the strength for the pull'],['Band-assisted Pull-up','Band under knee/foot takes off bodyweight'],['Lat Pulldown','Same muscles, any weight you need'],['Australian Row','Feet on the floor, pull chest to a low bar'],['Dead Hang (sec)','Build grip & shoulder strength first']],
 'Chin-up':[['Negative Pull-up','Slow lowering builds the strength'],['Band-assisted Pull-up','Band reduces your bodyweight'],['Lat Pulldown','Underhand grip mimics the chin-up']],
 'Muscle-up':[['Explosive Pull-up','Pull the bar to your chest'],['Straight Bar Dip','Train the top half'],['Pull-up','Build to 10+ strict first']],
 'Push-up':[['Incline Push-up','Hands on a bench/table — higher = easier'],['Knee Push-up','Shorter lever, same pattern'],['Wall Push-up','Easiest starting point']],
 'Dips':[['Bench Dip','Feet on floor, hands on bench'],['Straight Bar Dip','Shorter range'],['Tricep Pushdown','Same muscles with a cable']],
 'Pistol Squat':[['Goblet Squat','Two legs, weight in front'],['Lunge','Single-leg strength']],
 'Squat':[['Goblet Squat','Hold a dumbbell at chest — easier to stay upright'],['Leg Press','Machine support'],['Glute Bridge','If knees hurt']],
 'Deadlift':[['Romanian Deadlift','Lighter hinge to learn the pattern'],['Hip Thrust','Glutes without back load'],['Glute Bridge','Bodyweight start']],
 'Hanging Leg Raise':[['Dead Bug','Floor core control'],['Crunch','Simple start'],['Plank Hold (sec)','Bracing strength']],
 'Bench Press':[['Push-up','Bodyweight press'],['Incline Push-up','Even easier'],['Incline Dumbbell Press','Lighter dumbbells']],
 'Overhead Press':[['Arnold Press','Seated dumbbells'],['Pike Push-up','Bodyweight option'],['Lateral Raise','Light shoulder work']],
 'Handstand (sec)':[['Wall Handstand (sec)','Use the wall'],['Pike Push-up','Build overhead strength']],
 'L-sit (sec)':[['Hanging Leg Raise','Hip flexor strength'],['Plank Hold (sec)','Core bracing']],
};
function cantDo(){const ex=S.active.list[S.active.idx],orig=Object.keys(S.subs).find(k=>S.subs[k]===ex),alts=[...(EASIER[ex]||[]),...(typeof equivs==='function'?equivs(ex).filter(x=>x[0]!==ex&&avail(x[1])&&!(EASIER[ex]||[]).some(z=>z[0]===x[0])).map(x=>[x[0],TIER[x[1]][1]+' equivalent']):[])].filter(([e])=>EX[e]);
 openSheet(`<h3 style="font-size:20px">Can't do ${esc(ex)} yet?</h3><p class="muted">No problem — everyone starts somewhere. Pick an easier version that trains the same muscles. Log it, and we'll keep suggesting it until you're ready.</p>
 ${alts.length?alts.map(([e,why])=>`<div class="opt" onclick="useAlt(this.dataset.o,this.dataset.e)" data-o="${esc(ex)}" data-e="${esc(e)}"><span class="e">${EX[e][2]}</span><div><b>${esc(e)}</b><small>${why}</small></div></div>`).join(''):'<div class="tip">Lower the weight by 20–30% or use fewer reps with perfect form — that is still progress.</div>'}
 ${orig?`<button class="btn sec2" style="margin-top:8px" data-o="${esc(orig)}" onclick="delete S.subs[this.dataset.o];window._swap=true;useEx(this.dataset.o);toast('💪 Back to the full version!')">I'm ready for ${esc(orig)} now</button>`:''}
 ${ex==='Pull-up'&&!('muscleup' in S.quests)?`<button class="btn" style="margin-top:8px" onclick="S.quests.muscleup=0;save();closeSheet();toast('🦅 Pull-up quest started — follow the checkpoints!')">🦅 Start the step-by-step Pull-up quest</button>`:''}`)}
function useAlt(orig,e){S.subs[orig]=e;window._swap=true;useEx(e);toast(`Swapped to ${esc(e)} — we'll use it in place of ${esc(orig)} until you're ready 💪`)}

// ================= EQUIPMENT TIERS & EQUIVALENTS =================
// Tiers: m=machine/cable, b=barbell, d=dumbbell, bar=pull-up/dip bar, h=home/bodyweight.
// Each family = same movement & muscles; listed in suggestion order (machine → barbell → dumbbell → bar → home).
Object.assign(EX,{
 'Chest Press Machine':[['Chest'],['Triceps','Shoulders'],'🏋️'],'Dumbbell Bench Press':[['Chest'],['Triceps','Shoulders'],'🏋️'],'Pec Deck':[['Chest'],[],'🦋'],'Cable Crossover':[['Chest'],[],'🦋'],'Wide Push-up':[['Chest'],['Shoulders'],'🤸'],'Decline Push-up':[['Chest','Shoulders'],['Triceps'],'🤸'],'Incline Machine Press':[['Chest'],['Shoulders','Triceps'],'🏋️'],
 'Dumbbell Row':[['Back'],['Biceps'],'🚣'],'Dumbbell Pullover':[['Back'],['Chest'],'🏋️'],'Superman Hold (sec)':[['Back'],['Glutes'],'🦸'],
 'Shoulder Press Machine':[['Shoulders'],['Triceps'],'🙌'],'Cable Lateral Raise':[['Shoulders'],[],'🕊️'],'Bottle Lateral Raise':[['Shoulders'],[],'🕊️'],'Rear Delt Fly':[['Shoulders'],['Back'],'🎯'],'Prone Y-T-W':[['Shoulders'],['Back'],'🎯'],
 'Cable Curl':[['Biceps'],[],'💪'],'Dumbbell Curl':[['Biceps'],[],'💪'],'Backpack Curl':[['Biceps'],[],'🎒'],'Overhead Dumbbell Extension':[['Triceps'],[],'💪'],'Diamond Push-up':[['Triceps','Chest'],[],'💎'],'Assisted Dip Machine':[['Triceps','Chest'],[],'⬇️'],
 'Bodyweight Squat':[['Quads','Glutes'],['Core'],'🦵'],'Bulgarian Split Squat':[['Quads','Glutes'],[],'🦵'],'Dumbbell Lunge':[['Quads','Glutes'],[],'🚶'],'Hack Squat':[['Quads','Glutes'],[],'🦵'],
 'Dumbbell RDL':[['Hamstrings','Glutes'],['Back'],'🏋️'],'Single-leg RDL':[['Hamstrings','Glutes'],['Core'],'🦩'],'Dumbbell Deadlift':[['Back','Hamstrings','Glutes'],['Core'],'🏋️'],'Back Extension':[['Back','Hamstrings','Glutes'],[],'🦸'],
 'Dumbbell Leg Curl':[['Hamstrings'],[],'🦵'],'Sliding Leg Curl':[['Hamstrings'],['Glutes'],'🧦'],'Hip Thrust Machine':[['Glutes'],['Hamstrings'],'🍑'],'Dumbbell Hip Thrust':[['Glutes'],['Hamstrings'],'🍑'],
 'Calf Raise Machine':[['Calves'],[],'🦶'],'Dumbbell Calf Raise':[['Calves'],[],'🦶'],'Single-leg Calf Raise':[['Calves'],[],'🦶'],'Cable Crunch':[['Core'],[],'🔥'],'Lying Leg Raise':[['Core'],[],'🧘'],
});
Object.assign(EX,S.customEx);
const FAM=[
 ['Horizontal press',[['Chest Press Machine','m'],['Bench Press','b'],['Dumbbell Bench Press','d'],['Push-up','h'],['Knee Push-up','h']]],
 ['Incline press',[['Incline Machine Press','m'],['Incline Dumbbell Press','d'],['Decline Push-up','h']]],
 ['Chest fly',[['Pec Deck','m'],['Cable Crossover','m'],['Chest Fly','d'],['Wide Push-up','h']]],
 ['Vertical pull',[['Lat Pulldown','m'],['Dumbbell Pullover','d'],['Pull-up','bar'],['Chin-up','bar'],['Australian Row','h'],['Superman Hold (sec)','h']]],
 ['Row',[['Seated Cable Row','m'],['Barbell Row','b'],['Dumbbell Row','d'],['Australian Row','h'],['Superman Hold (sec)','h']]],
 ['Overhead press',[['Shoulder Press Machine','m'],['Overhead Press','b'],['Arnold Press','d'],['Pike Push-up','h']]],
 ['Lateral raise',[['Cable Lateral Raise','m'],['Lateral Raise','d'],['Bottle Lateral Raise','h']]],
 ['Rear delt',[['Face Pull','m'],['Rear Delt Fly','d'],['Prone Y-T-W','h']]],
 ['Biceps curl',[['Cable Curl','m'],['Barbell Curl','b'],['Dumbbell Curl','d'],['Hammer Curl','d'],['Backpack Curl','h']]],
 ['Triceps',[['Tricep Pushdown','m'],['Skull Crusher','b'],['Overhead Dumbbell Extension','d'],['Diamond Push-up','h'],['Bench Dip','h']]],
 ['Dip',[['Assisted Dip Machine','m'],['Dips','bar'],['Bench Dip','h']]],
 ['Squat',[['Leg Press','m'],['Hack Squat','m'],['Squat','b'],['Goblet Squat','d'],['Bodyweight Squat','h']]],
 ['Single-leg / quads',[['Leg Extension','m'],['Bulgarian Split Squat','d'],['Dumbbell Lunge','d'],['Lunge','h']]],
 ['Hip hinge',[['Back Extension','m'],['Romanian Deadlift','b'],['Dumbbell RDL','d'],['Single-leg RDL','h']]],
 ['Deadlift',[['Deadlift','b'],['Dumbbell Deadlift','d'],['Single-leg RDL','h']]],
 ['Leg curl',[['Leg Curl','m'],['Dumbbell Leg Curl','d'],['Sliding Leg Curl','h']]],
 ['Glutes',[['Hip Thrust Machine','m'],['Hip Thrust','b'],['Dumbbell Hip Thrust','d'],['Glute Bridge','h']]],
 ['Calves',[['Calf Raise Machine','m'],['Calf Raise','b'],['Dumbbell Calf Raise','d'],['Single-leg Calf Raise','h']]],
 ['Core',[['Cable Crunch','m'],['Hanging Leg Raise','bar'],['Lying Leg Raise','h'],['Crunch','h'],['Plank Hold (sec)','h'],['Dead Bug','h']]],
];
const TIER={m:['🏢','Machine / cable'],b:['🏋️','Barbell'],d:['💪','Dumbbell'],bar:['🧗','Pull-up / dip bar'],h:['🏠','Home / bodyweight']};
const FAM_OF={};FAM.forEach((f,i)=>f[1].forEach(([e,t])=>{(FAM_OF[e]??=[]).push(i)}));
const tierOf=e=>{for(const i of FAM_OF[e]||[])return FAM[i][1].find(x=>x[0]===e)[1];return null};
S.equip??="gym";S.bar??=false;S.rotEq??=true;
const EQUIPS={gym:['🏢','Full gym'],dumbbell:['💪','Dumbbells only'],home:['🏠','Home / no equipment']};
function avail(t){return !t||S.equip==='gym'||t==='h'||(t==='d'&&S.equip==='dumbbell')||(t==='bar'&&S.bar)}
function equivs(e){const i=(FAM_OF[e]||[])[0];return i==null?[]:FAM[i][1].filter(x=>EX[x[0]])}
// Best available version of an exercise; with rotation on, cycles through available equivalents day by day.
function bestFor(e){const fam=equivs(e);if(!fam.length)return e;const ok=fam.filter(x=>avail(x[1]));if(!ok.length)return e;
 if(S.rotEq){const j=ok.findIndex(x=>x[0]===e);return ok[((j<0?0:j)+dayIdx())%ok.length][0]}
 return avail(tierOf(e))?e:ok[0][0]}
function planList(k){const P=PROGS[k],out=[];P.ex.forEach(e=>{const s=S.subs[e]&&EX[S.subs[e]]?S.subs[e]:e;let x=k==='home'?s:bestFor(s);
 if(out.includes(x))x=equivs(s).map(y=>y[0]).find(y=>avail(tierOf(y))&&!out.includes(y));if(x)out.push(x)});return out}
function equipBar(){return`<div class="flex" style="gap:6px;margin:10px 0">${Object.entries(EQUIPS).map(([k,[e,l]])=>`<button class="btn sm ${S.equip===k?'':'sec2'}" style="flex:1;padding:8px 4px;font-size:12px" onclick="S.equip='${k}';save();render()">${e} ${l}</button>`).join('')}</div>
 <div class="flex" style="gap:6px"><button class="btn sm ${S.bar?'':'sec2'}" style="flex:1;font-size:12px" onclick="S.bar=!S.bar;save();render()">🧗 I have a pull-up bar ${S.bar?'✓':''}</button><button class="btn sm ${S.rotEq?'':'sec2'}" style="flex:1;font-size:12px" onclick="S.rotEq=!S.rotEq;save();render();toast(S.rotEq?'🔄 Exercises rotate to an equivalent each day':'Rotation off')">🔄 Rotate equivalents ${S.rotEq?'✓':''}</button></div>`}
V.prog=k=>{const P=PROGS[k],L=P.ex.length?planList(k):[];
 return`<div class="top">${backBtn()}<span></span><span></span></div>
 <div class="card" style="background:${P.bg};text-align:center;box-shadow:none"><div style="font-size:70px;animation:bounce .5s">${P.e}</div><h1 style="font-size:26px">${P.name}</h1><p class="muted">${P.sub}</p></div>
 ${k!=='home'&&k!=='free'?`<div class="sec">Where are you training?</div>${equipBar()}`:''}
 ${L.length?`<div class="list stagger" style="margin-top:12px">${L.map((e,i)=>{const s=sugg(e),b=bestSet(e),o=P.ex[i],t=tierOf(e);return`<div class="row" onclick="altSheet(this.dataset.e,null)" data-e="${esc(e)}"><div class="tile" style="background:${PASTEL[i%8]};width:48px;height:48px;font-size:24px">${EX[e][2]}</div><div class="rbody"><b>${esc(e)}</b><small>${t?TIER[t][0]+' ':''}${e!==o?`replaces ${esc(o)} · `:''}${b?`Best ${b.w}kg × ${b.r} · Target ${s.w}kg × ${s.r}`:'3–4 sets · 8–12 reps'}</small></div><span class="chev">⇄</span></div>`}).join('')}</div>`:'<p class="muted" style="text-align:center">Add any exercise once you start.</p>'}
 <div class="sticky"><button class="btn" onclick="startW('${k}')">${S.active?'Restart with this workout':'Start Workout'}</button></div>`};
function startW(k){if(S.active&&S.active.sets.length&&!confirm('Discard current workout?'))return;const P=PROGS[k];
 S.active={ts:Date.now(),prog:k,list:P.ex.length?planList(k):['Push-up'],idx:0,sets:[],xp:0,prs:0,ups:[],qs:[]};save();stack=[];push('player')}
// Alternatives sheet: equivalents grouped by equipment tier (machine → dumbbell → home), plus easier versions.
function altSheet(ex,inW=true){const fam=equivs(ex),ez=(EASIER[ex]||[]).filter(([e])=>EX[e]),act=inW&&S.active;
 const row=(e,sub,t)=>`<div class="opt" style="opacity:${avail(t)?1:.45}" data-e="${esc(e)}" onclick="${act?'window._swap=true;useEx(this.dataset.e)':"formSheet(this.dataset.e)"}"><span class="e">${EX[e][2]}</span><div><b>${esc(e)}${e===ex?' · current':''}</b><small>${sub}${avail(t)?'':' · not available with your equipment'}</small></div></div>`;
 openSheet(`<h3 style="font-size:20px">Alternatives for ${esc(ex)}</h3><p class="muted">Same movement, same muscles. Ordered machine → barbell → dumbbell → home.</p>
 ${act&&fam.length>1?`<button class="btn" style="margin:8px 0" onclick="rotateEq()">🔄 Rotate to next equivalent</button>`:''}
 ${fam.length?['m','b','d','bar','h'].map(t=>{const xs=fam.filter(x=>x[1]===t);return xs.length?`<div class="sec" style="margin-top:12px">${TIER[t][0]} ${TIER[t][1]}</div>`+xs.map(([e])=>row(e,EX[e][0].join(', '),t)).join(''):''}).join(''):'<p class="muted">No mapped equivalents — use the full list.</p>'}
 ${ez.length?`<div class="sec" style="margin-top:12px">😓 Easier versions</div>${ez.map(([e,w])=>row(e,w,tierOf(e))).join('')}`:''}
 ${act?`<button class="btn sec2" style="margin-top:10px" onclick="pickEx(1)">🔍 Browse all exercises</button>`:''}`)}
function rotateEq(){const a=S.active,ex=a.list[a.idx],ok=equivs(ex).filter(x=>avail(x[1])&&x[0]!==ex);if(!ok.length)return toast('No other equivalents for your equipment');
 const fam=equivs(ex).map(x=>x[0]),j=fam.indexOf(ex),nx=fam.slice(j+1).concat(fam.slice(0,j)).find(e=>ok.some(o=>o[0]===e));window._swap=true;useEx(nx);toast(`🔄 ${esc(nx)}`)}

// ================= ONE ACTIVITY, TOGGLE RUN / WALK / PAUSE =================
// Calories from distance & mode (net cost of transport): running ≈ 1.0 kcal/kg/km, walking ≈ 0.6 kcal/kg/km
// at any speed, so a km run burns much more than a km walked. Ref: Margaria 1963; Wilkin et al., 2012, J Strength Cond Res.
const KPK={run:1.0,walk:0.6};
const actKcal=R=>Math.round(S.profile.weight*(R.d.run/1000*KPK.run+R.d.walk/1000*KPK.walk));
function startRun(type='run'){if(!navigator.geolocation)return toast('GPS not available');
 RUN={type,mode:type,ts:Date.now(),pts:[],dist:0,steps:0,paused:false,el:0,lastTick:Date.now(),d:{run:0,walk:0},t:{run:0,walk:0},segs:[]};
 if(!pedo.on)startPedo();
 RUN.watch=navigator.geolocation.watchPosition(p=>{if(!RUN||RUN.paused)return;const c=[p.coords.latitude,p.coords.longitude];if(p.coords.accuracy>35)return;
  const l=RUN.pts.at(-1);if(l&&!RUN.gap){const d=hav(l,c);if(d<3)return;RUN.dist+=d;RUN.d[RUN.mode]+=d}RUN.gap=false;RUN.pts.push(c);if(stack.at(-1)?.[0]==='runlive')render()},e=>toast('📡 GPS: '+e.message),{enableHighAccuracy:true,maximumAge:0,timeout:20000});
 RUN.timer=setInterval(()=>{const dt=(Date.now()-RUN.lastTick)/1000;if(!RUN.paused){RUN.el+=dt;RUN.t[RUN.mode]+=dt}RUN.lastTick=Date.now();const e=$('#rtime');if(e)e.textContent=fmtT(RUN.el)},1000);stack=[];push('runlive')}
function setMode(m){const R=RUN;if(m==='pause'){R.paused=!R.paused;if(!R.paused)R.gap=true}else{if(R.paused)R.gap=true;R.paused=false;if(R.mode!==m){R.mode=m;R.segs.push(R.pts.length)}}vib(25);render()}
V.runlive=()=>{const R=RUN;if(!R)return V.run();const b=(m,e,l,c)=>`<button class="btn ${(m==='pause'?R.paused:!R.paused&&R.mode===m)?'':'sec2'}" style="flex:1;padding:18px 4px;font-size:16px;${c&&!(m==='pause'?R.paused:!R.paused&&R.mode===m)?'':c||''}" onclick="setMode('${m}')">${e}<br>${l}</button>`;
 return`<div class="top"><span class="chip">${R.paused?'⏸ Paused':R.mode==='run'?'🏃 Running':'🚶 Walking'}</span><span class="chip" style="color:${R.paused?'var(--warn)':'var(--good)'}">● ${R.paused?'Paused':'Live'}</span></div>
 <div class="map">${routeSVG(R.pts,true)}</div>
 <div class="card" style="margin-top:14px;text-align:center"><div class="muted">Distance</div><div class="big" style="font-size:58px">${(R.dist/1000).toFixed(2)}</div><div class="muted">km</div>
 <div class="runstats"><div><b id="rtime">${fmtT(R.el)}</b><small>TIME</small></div><div><b>${pace(R.el,R.dist)}</b><small>PACE /KM</small></div><div><b>${actKcal(R)}</b><small>KCAL</small></div></div>
 <div class="runstats" style="margin:0"><div><b style="font-size:18px">${(R.d.run/1000).toFixed(2)}</b><small>🏃 RUN KM</small></div><div><b style="font-size:18px">${(R.d.walk/1000).toFixed(2)}</b><small>🚶 WALK KM</small></div><div><b style="font-size:18px">${R.steps}</b><small>STEPS</small></div></div></div>
 <div class="flex" style="gap:8px">${b('run','🏃','Run')}${b('walk','🚶','Walk','background:linear-gradient(135deg,#22c55e,#14b8a6)')}${b('pause',R.paused?'▶':'⏸',R.paused?'Resume':'Pause')}</div>
 <button class="btn" style="margin-top:10px;background:#111" onclick="stopRun()">■ Finish</button>
 <p class="muted" style="text-align:center;margin-top:10px">Tired? Tap Walk. Ready again? Tap Run. Stopped? Pause. Keep the app open while tracking.</p>`};
function stopRun(){const R=RUN;navigator.geolocation.clearWatch(R.watch);clearInterval(R.timer);RUN=null;
 if(R.dist<20&&!confirm('Very short activity. Save anyway?')){go('run');return}
 const type=R.d.run>20&&R.d.walk>20?'mix':R.d.run>=R.d.walk?'run':'walk',kcal=actKcal(R);
 const r={type,ts:R.ts,pts:R.pts,dist:Math.round(R.dist),time:Math.round(R.el),steps:R.steps,d:{run:Math.round(R.d.run),walk:Math.round(R.d.walk)},t:{run:Math.round(R.t.run),walk:Math.round(R.t.walk)},kcal};S.runs.push(r);
 S.burn??={};S.burn[today()]=(S.burn[today()]||0)+kcal;
 const xp=Math.round(R.d.run/1000*60+R.d.walk/1000*30);['Quads','Hamstrings','Calves','Glutes'].forEach(m=>S.xp[m]+=Math.round(xp/2));
 const rq=R.d.run>0?checkQuests('Run (km)',R.d.run/1000):[];save();if(rq.length)setTimeout(()=>toast(rq.join('<br>')),3000);
 stack=[];tab='run';render('up');confetti();toast(`${(r.dist/1000).toFixed(2)} km · 🔥 ${kcal} kcal burned · +${xp} leg XP`)}
const runLbl=r=>r.type==='mix'?`🏃🚶 Run/Walk · ${(r.d.run/1000).toFixed(1)} run + ${(r.d.walk/1000).toFixed(1)} walk km`:r.type==='run'?'🏃 Run':'🚶 Walk';
const runKcal=r=>r.kcal??Math.round(S.profile.weight*r.dist/1000*KPK[r.type==='run'?'run':'walk']);

// ================= CALORIE BALANCE CHART (trading style) =================
// Each day = eaten − (maintenance + tracked activity). 0 in the middle; deficit days drop below in green,
// surplus days rise above in red. A line shows the running total like a price chart.
function balanceChart(days=14){const t=targets(),B=S.burn||{},v=[];for(let i=days-1;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);const k=sum(dayFood(iso(d)),1);
 v.push({d,bal:k?k-(t.tdee+(B[iso(d)]||0)):null})}
 const logged=v.filter(x=>x.bal!=null);if(!logged.length)return'<p class="muted" style="text-align:center;padding:20px 0">Log meals to see your daily calorie balance 🌱</p>';
 const W=320,H=200,mid=H/2,max=Math.max(300,...logged.map(x=>Math.abs(x.bal))),sc=(mid-18)/max,bw=W/days;let run=0;const pts=[];
 const bars=v.map((x,i)=>{const cx=i*bw+bw/2;if(x.bal==null)return`<circle cx="${cx}" cy="${mid}" r="2" fill="#d4d4dc"/>`;run+=x.bal;pts.push([cx,run]);const h=Math.abs(x.bal)*sc,y=x.bal<0?mid:mid-h,c=x.bal<0?'#22c55e':'#ef4444';
  return`<rect x="${cx-bw*.32}" y="${y}" width="${bw*.64}" height="${Math.max(2,h)}" rx="3" fill="${c}"><title>${x.d.toLocaleDateString()}: ${x.bal>0?'+':''}${x.bal} kcal</title></rect>`}).join('');
 const rmax=Math.max(1,...pts.map(p=>Math.abs(p[1]))),line=pts.map(([x,r],i)=>`${i?'L':'M'}${x},${mid-r/rmax*(mid-18)}`).join(' ');
 const lbl=v.map((x,i)=>i%2===days%2?`<text x="${i*bw+bw/2}" y="${H+14}" font-size="10" text-anchor="middle" fill="#8d8da0">${x.d.getDate()}</text>`:'').join('');
 const tot=logged.reduce((s,x)=>s+x.bal,0),def=logged.filter(x=>x.bal<0).length;
 return`<svg viewBox="0 -4 ${W} ${H+22}" style="width:100%">
 <rect x="0" y="0" width="${W}" height="${mid}" fill="#fef2f2"/><rect x="0" y="${mid}" width="${W}" height="${mid}" fill="#f0fdf4"/>
 <text x="4" y="12" font-size="10" fill="#ef4444" font-weight="700">▲ SURPLUS +${max}</text><text x="4" y="${H-4}" font-size="10" fill="#16a34a" font-weight="700">▼ DEFICIT −${max}</text>
 <line x1="0" x2="${W}" y1="${mid}" y2="${mid}" stroke="#1c1c28" stroke-width="1.2" stroke-dasharray="4 3"/><text x="${W-4}" y="${mid-4}" font-size="10" text-anchor="end" fill="#1c1c28" font-weight="800">0</text>
 ${bars}${pts.length>1?`<path d="${line}" fill="none" stroke="#f59e0b" stroke-width="2"/>`:''}${lbl}</svg>
 <div class="flex" style="gap:10px;font-size:12px;color:var(--muted);justify-content:center"><span>🟩 Deficit day</span><span>🟥 Surplus day</span><span style="color:#f59e0b">━ Running total</span></div>
 <p class="muted" style="margin-top:6px">${def}/${logged.length} days in deficit · net <b style="color:${tot<0?'var(--good)':'var(--acc)'}">${tot>0?'+':''}${tot.toLocaleString()} kcal</b> ${tot<0?`≈ <b>${(-tot/7700).toFixed(2)} kg</b> of fat lost 🎉`:'— above maintenance'}</p>`}

// Hour-by-hour fasting timeline (approximate; timing varies with your last meal, activity and body).
const FAST_HRS=[
 [0,'🍽️','Fed state','Blood sugar and insulin rise as you digest your last meal. Your body stores energy as glycogen and fat.'],
 [2,'📈','Digesting','Insulin is still elevated. Nutrients from your meal are being absorbed and used.'],
 [4,'📉','Blood sugar settles','Blood sugar returns to baseline. Insulin starts to fall.'],
 [6,'🔄','Post-absorptive','Digestion is mostly done. Your liver starts releasing stored glycogen to keep blood sugar steady.'],
 [8,'⚡','Glycogen in use','The liver keeps breaking down glycogen. Fat burning starts to increase slowly.'],
 [10,'😋','Hunger wave','Ghrelin (the hunger hormone) often peaks around your usual mealtimes — it passes in ~20 min. Drink water.'],
 [12,'🔥','Metabolic switch begins','Insulin is low and liver glycogen is running down. The body shifts toward burning more fat for fuel.'],
 [14,'💧','Fat burning ramps up','More fat is released from fat cells (lipolysis) and used for energy.'],
 [16,'🧪','Ketones rising','The liver starts turning fat into ketones — an alternative fuel for the brain and muscles. The classic 16:8 point.'],
 [18,'🧠','Ketosis (light)','Ketone levels rise further. Many people report steady energy and focus once adapted.'],
 [20,'📈','Growth hormone up','Growth hormone increases during fasting, which helps protect muscle and mobilise fat.'],
 [24,'♻️','Autophagy increasing','Glycogen is largely used up. Cellular cleanup (autophagy) is thought to increase — strong in animal studies, still being researched in humans.'],
 [36,'🔬','Deeper ketosis','Fat and ketones are the main fuel. Extended fasts like this should be occasional.'],
 [48,'⚠️','Extended fast','Growth hormone is much higher, but the risk of muscle loss, dizziness and electrolyte issues rises. Talk to a doctor before fasting this long.'],
];
function fastTimeline(){const w=fastWin(),st=fastState(),cur=S.fast.on&&!st.open?w.h-st.left:-1,g=w.h;
 return`<div style="display:flex;gap:10px;overflow-x:auto;scroll-snap-type:x mandatory;padding:4px 2px 12px;margin:0 -2px" id="ftl">${FAST_HRS.map(([h,e,t,d],i)=>{const nx=(FAST_HRS[i+1]||[999])[0],now=cur>=h&&cur<nx,goal=h<=g&&g<nx,past=cur>=nx;
  return`<div style="flex:0 0 72%;scroll-snap-align:start;background:${now?'linear-gradient(135deg,#ede9fe,#faf5ff)':'#fff'};border:2px solid ${now?'#a855f7':goal?'#22c55e':'transparent'};border-radius:18px;padding:14px;box-shadow:0 2px 12px #0000000a;opacity:${past?.6:1}" ${now?'data-now':''}>
  <div class="flex" style="justify-content:space-between"><b style="font-size:26px;font-weight:900;color:${h>=48?'#ef4444':'#a855f7'}">${h}h${h>=48?'+':''}</b><span style="font-size:30px">${e}</span></div>
  <b>${t}</b>${now?' <span class="badge" style="background:#a855f7;color:#fff">YOU ARE HERE</span>':''}${goal?' <span class="badge" style="background:#22c55e;color:#fff">YOUR ${S.fast.proto} GOAL</span>':''}
  <p style="font-size:13px;line-height:1.45;margin-top:6px">${d}</p></div>`}).join('')}</div>
 <div style="height:6px;background:#eee;border-radius:3px;position:relative;margin:-4px 4px 4px"><i style="position:absolute;left:0;top:0;bottom:0;border-radius:3px;background:linear-gradient(90deg,#a855f7,#22c55e);width:${Math.min(100,Math.max(0,cur)/48*100)}%"></i></div>
 <p class="muted" style="font-size:12px">← Swipe through the hours → ${cur>=0?`You're <b>${dur(cur)}</b> into your fast.`:''} Timings are approximate and vary person to person. 📚 Anton et al., 2018, Obesity; de Cabo & Mattson, 2019, NEJM; Ho et al., 1988, J Clin Invest (GH)</p>`}

window.afterRender=()=>{const n=document.querySelector('#ftl [data-now]');if(n)n.parentNode.scrollLeft=n.offsetLeft-n.parentNode.offsetLeft-8};
setInterval(()=>{if(S.fast.on&&(tab==='plan'&&!stack.length||stack.at(-1)?.[0]==='fasting')&&!$('#sheet').classList.contains('show'))render()},60000);
// initial render happens in smart.js
