// RepWise v2 extras: exercise variants (incline/decline, seated/standing, grips), health tracker
// (blood pressure + blood sugar), added-sugar tracking, and more supplements.
(function () {
  // ---------- 1. Exercise variants ----------
  // [name, primary, secondary, icon, family, tier]  tier: m machine/cable · b barbell · d dumbbell · bar · h home
  const NEW = [
    ['Smith Machine Bench Press', ['Chest'], ['Triceps', 'Shoulders'], '🏋️', 'Horizontal press', 'm'],
    ['Decline Bench Press', ['Chest'], ['Triceps'], '🏋️', 'Horizontal press', 'b'],
    ['Close-grip Bench Press', ['Triceps', 'Chest'], ['Shoulders'], '🏋️', 'Triceps', 'b'],
    ['Dumbbell Floor Press', ['Chest'], ['Triceps'], '💪', 'Horizontal press', 'd'],
    ['Incline Bench Press', ['Chest'], ['Shoulders', 'Triceps'], '🏋️', 'Incline press', 'b'],
    ['Incline Smith Press', ['Chest'], ['Shoulders', 'Triceps'], '🏋️', 'Incline press', 'm'],
    ['Incline Dumbbell Fly', ['Chest'], ['Shoulders'], '🦋', 'Chest fly', 'd'],
    ['Low-to-High Cable Fly', ['Chest'], ['Shoulders'], '🦋', 'Chest fly', 'm'],
    ['Close-grip Lat Pulldown', ['Back'], ['Biceps'], '⬇️', 'Vertical pull', 'm'],
    ['Straight-arm Pulldown', ['Back'], [], '⬇️', 'Vertical pull', 'm'],
    ['Neutral-grip Pull-up', ['Back'], ['Biceps'], '🧗', 'Vertical pull', 'bar'],
    ['T-Bar Row', ['Back'], ['Biceps'], '🚣', 'Row', 'b'],
    ['Pendlay Row', ['Back'], ['Biceps'], '🚣', 'Row', 'b'],
    ['Chest-supported Row', ['Back'], ['Biceps', 'Shoulders'], '🚣', 'Row', 'm'],
    ['Single-arm Cable Row', ['Back'], ['Biceps'], '🚣', 'Row', 'm'],
    ['Incline Dumbbell Row', ['Back'], ['Biceps', 'Shoulders'], '🚣', 'Row', 'd'],
    ['Seated Dumbbell Press', ['Shoulders'], ['Triceps'], '🙌', 'Overhead press', 'd'],
    ['Standing Dumbbell Press', ['Shoulders'], ['Triceps', 'Core'], '🙌', 'Overhead press', 'd'],
    ['Seated Barbell Press', ['Shoulders'], ['Triceps'], '🙌', 'Overhead press', 'b'],
    ['Landmine Press', ['Shoulders', 'Chest'], ['Triceps'], '🙌', 'Overhead press', 'b'],
    ['Seated Lateral Raise', ['Shoulders'], [], '🕊️', 'Lateral raise', 'd'],
    ['Machine Lateral Raise', ['Shoulders'], [], '🕊️', 'Lateral raise', 'm'],
    ['Cable Upright Row', ['Shoulders'], ['Back'], '🕊️', 'Lateral raise', 'm'],
    ['Reverse Pec Deck', ['Shoulders'], ['Back'], '🎯', 'Rear delt', 'm'],
    ['Band Pull-apart', ['Shoulders'], ['Back'], '🎯', 'Rear delt', 'h'],
    ['Incline Dumbbell Curl', ['Biceps'], [], '💪', 'Biceps curl', 'd'],
    ['Seated Dumbbell Curl', ['Biceps'], [], '💪', 'Biceps curl', 'd'],
    ['EZ-bar Curl', ['Biceps'], [], '💪', 'Biceps curl', 'b'],
    ['Preacher Curl', ['Biceps'], [], '💪', 'Biceps curl', 'b'],
    ['Machine Preacher Curl', ['Biceps'], [], '💪', 'Biceps curl', 'm'],
    ['Bayesian Cable Curl', ['Biceps'], [], '💪', 'Biceps curl', 'm'],
    ['Concentration Curl', ['Biceps'], [], '💪', 'Biceps curl', 'd'],
    ['Spider Curl', ['Biceps'], [], '💪', 'Biceps curl', 'd'],
    ['Reverse Curl', ['Biceps'], [], '🔨', 'Biceps curl', 'b'],
    ['Rope Pushdown', ['Triceps'], [], '⬇️', 'Triceps', 'm'],
    ['Overhead Cable Extension', ['Triceps'], [], '🙆', 'Triceps', 'm'],
    ['Overhead Tricep Extension', ['Triceps'], [], '🙆', 'Triceps', 'd'],
    ['Dumbbell Kickback', ['Triceps'], [], '💪', 'Triceps', 'd'],
    ['Front Squat', ['Quads', 'Glutes'], ['Core'], '🦵', 'Squat', 'b'],
    ['Smith Machine Squat', ['Quads', 'Glutes'], [], '🦵', 'Squat', 'm'],
    ['Box Squat', ['Quads', 'Glutes'], ['Hamstrings'], '🦵', 'Squat', 'b'],
    ['Sumo Squat', ['Quads', 'Glutes'], [], '🦵', 'Squat', 'd'],
    ['Jump Squat', ['Quads', 'Glutes'], ['Calves'], '🦵', 'Squat', 'h'],
    ['Walking Lunge', ['Quads', 'Glutes'], ['Hamstrings'], '🚶', 'Single-leg / quads', 'd'],
    ['Reverse Lunge', ['Quads', 'Glutes'], [], '🚶', 'Single-leg / quads', 'h'],
    ['Step-up', ['Quads', 'Glutes'], [], '🚶', 'Single-leg / quads', 'd'],
    ['Sissy Squat', ['Quads'], [], '🦵', 'Single-leg / quads', 'h'],
    ['Single-leg Leg Press', ['Quads', 'Glutes'], [], '🦵', 'Single-leg / quads', 'm'],
    ['Good Morning', ['Hamstrings', 'Back'], ['Glutes'], '🏋️', 'Hip hinge', 'b'],
    ['Cable Pull-through', ['Glutes', 'Hamstrings'], [], '🍑', 'Hip hinge', 'm'],
    ['Kettlebell Swing', ['Glutes', 'Hamstrings'], ['Core'], '🏋️', 'Hip hinge', 'd'],
    ['Sumo Deadlift', ['Back', 'Glutes', 'Hamstrings'], ['Quads'], '🏋️', 'Deadlift', 'b'],
    ['Trap Bar Deadlift', ['Back', 'Quads', 'Glutes'], ['Hamstrings'], '🏋️', 'Deadlift', 'b'],
    ['Seated Leg Curl', ['Hamstrings'], [], '🦵', 'Leg curl', 'm'],
    ['Lying Leg Curl', ['Hamstrings'], [], '🦵', 'Leg curl', 'm'],
    ['Nordic Curl', ['Hamstrings'], [], '🦵', 'Leg curl', 'h'],
    ['Cable Kickback', ['Glutes'], [], '🍑', 'Glutes', 'm'],
    ['Hip Abduction Machine', ['Glutes'], [], '🍑', 'Glutes', 'm'],
    ['Single-leg Glute Bridge', ['Glutes'], ['Hamstrings'], '🍑', 'Glutes', 'h'],
    ['Seated Calf Raise', ['Calves'], [], '🦶', 'Calves', 'm'],
    ['Leg Press Calf Raise', ['Calves'], [], '🦶', 'Calves', 'm'],
    ['Ab Wheel Rollout', ['Core'], ['Shoulders'], '🔥', 'Core', 'h'],
    ['Russian Twist', ['Core'], [], '🔥', 'Core', 'h'],
    ['Bicycle Crunch', ['Core'], [], '🔥', 'Core', 'h'],
    ['Side Plank (sec)', ['Core'], [], '⏱️', 'Core', 'h'],
    ['Hollow Hold (sec)', ['Core'], [], '⏱️', 'Core', 'h'],
    ['Pallof Press', ['Core'], [], '🔥', 'Core', 'm'],
    ['Barbell Shrug', ['Back'], [], '🏋️', 'Traps', 'b'],
    ['Dumbbell Shrug', ['Back'], [], '💪', 'Traps', 'd'],
    ["Farmer's Walk (sec)", ['Back', 'Core'], ['Calves'], '⏱️', 'Traps', 'd'],
  ];
  for (const [n, p, s, e, fam, tier] of NEW) {
    if (!EX[n]) EX[n] = [p, s, e];
    let i = FAM.findIndex(f => f[0] === fam);
    if (i < 0) { FAM.push([fam, []]); i = FAM.length - 1; }
    if (!FAM[i][1].some(x => x[0] === n)) { FAM[i][1].push([n, tier]); (FAM_OF[n] ??= []).push(i); }
  }
  // Generated plans rotate through these equivalents by default (same movement, new angle each session).
  if (!S.rotMig) { S.rotEq = true; S.rotMig = 1; save(); }
  // Rotation picks gym-appropriate equivalents (no bodyweight/knee versions when you have equipment).
  // Main lifts and head-specific picks stay fixed so progression and muscle-part coverage are kept.
  const KEEP = new Set(['Bench Press', 'Squat', 'Deadlift', 'Romanian Deadlift', 'Overhead Press', 'Barbell Row', 'Pull-up', 'Hammer Curl', 'Incline Dumbbell Curl', 'Overhead Tricep Extension', 'Hip Thrust']);
  bestFor = function (e) { const fam = equivs(e); if (!fam.length) return e; const ok = fam.filter(x => avail(x[1]) && (S.equip === 'home' || x[1] !== 'h' || (tierOf(e) === 'h'))).filter(x => !/^Knee /.test(x[0]));
    if (!ok.length) return e; if (S.rotEq && !KEEP.has(e)) { const j = ok.findIndex(x => x[0] === e); return ok[((j < 0 ? 0 : j) + dayIdx()) % ok.length][0]; } return avail(tierOf(e)) ? e : ok[0][0]; };
  // Muscle-part rules for the new names
  if (typeof HRULES !== 'undefined') HRULES.push([/bayesian|seated dumbbell curl/i, 'Biceps', 'Long head'], [/reverse curl/i, 'Biceps', 'Brachialis & brachioradialis'], [/rope pushdown/i, 'Triceps', 'Lateral head'], [/overhead cable/i, 'Triceps', 'Long head'], [/pull-through|swing/i, 'Glutes', 'Gluteus maximus'], [/abduction|kickback/i, 'Glutes', 'Gluteus medius'], [/shrug|farmer/i, 'Back', 'Upper back & traps (thickness)'], [/pec deck|reverse pec|pull-apart/i, 'Shoulders', 'Rear delt'], [/straight-arm/i, 'Back', 'Lats (width)'], [/side plank|twist|pallof|bicycle|hollow/i, 'Core', 'Deep core & obliques'], [/rollout/i, 'Core', 'Rectus abdominis']);

  // ---------- 2. Health tracker: blood pressure + blood sugar ----------
  S.bp ??= []; S.glu ??= [];   // bp: [ts, sys, dia, pulse]; glu: [ts, mg/dL, context]
  const bpCat = RWCore.bpCat, gluCat = RWCore.gluCat;
  const CTX = [['fasting', 'Fasting'], ['after', '2 h after a meal'], ['random', 'Random']];
  window.bpSheet = () => openSheet(`<h3 class="t-title">Blood pressure</h3><p class="t-caption" style="margin:4px 0 var(--s2)">Sit quietly for 5 minutes, arm at heart level, no caffeine for 30 minutes.</p>
    <div class="afrow"><span>Systolic (top)</span><input id="bps" type="number" inputmode="numeric" placeholder="120" style="width:90px"></div>
    <div class="afrow"><span>Diastolic (bottom)</span><input id="bpd" type="number" inputmode="numeric" placeholder="80" style="width:90px"></div>
    <div class="afrow"><span>Pulse <small class="muted">optional</small></span><input id="bpp" type="number" inputmode="numeric" placeholder="70" style="width:90px"></div>
    <button class="btn" style="margin-top:var(--s3)" onclick="saveBP()">Save</button>`);
  window.saveBP = () => { const s = +$('#bps').value, d = +$('#bpd').value, p = +$('#bpp').value || null; if (s < 60 || s > 260 || d < 30 || d > 160 || d >= s) return toast('Check the numbers'); S.bp.push([Date.now(), s, d, p]); save(); closeSheet(); render(); const c = bpCat(s, d); toast(`${s}/${d} · ${c[0]}`); if (c[1] === 3) setTimeout(() => alert('Blood pressure this high can be an emergency. If you have chest pain, shortness of breath, vision changes or weakness, call emergency services now.'), 400); };
  window.gluSheet = () => { window._gc = 'fasting'; openSheet(`<h3 class="t-title">Blood sugar</h3><p class="t-caption" style="margin:4px 0 var(--s2)">From a glucometer or CGM.</p>
    <div class="afrow"><span>Reading</span><span><input id="glv" type="number" inputmode="decimal" placeholder="95" style="width:80px"> mg/dL</span></div>
    <div class="afsec">When?</div><div class="chips" id="glc">${CTX.map(([k, l], i) => `<button class="${i ? '' : 'on'}" onclick="_gc='${k}';document.querySelectorAll('#glc button').forEach(b=>b.classList.toggle('on',b===this))">${l}</button>`).join('')}</div>
    <p class="t-caption" style="margin-top:var(--s1)">Using mmol/L? Multiply by 18 (e.g. 5.5 mmol/L = 99 mg/dL).</p>
    <button class="btn" style="margin-top:var(--s3)" onclick="saveGlu()">Save</button>`); };
  window.saveGlu = () => { let v = +$('#glv').value; if (v > 0 && v < 35) v = Math.round(v * 18); if (v < 20 || v > 600) return toast('Check the number'); S.glu.push([Date.now(), v, _gc]); save(); closeSheet(); render(); const c = gluCat(v, _gc); toast(`${v} mg/dL · ${c[0]}`); if (v < 70) setTimeout(() => alert('Low blood sugar: take 15 g of fast sugar (½ cup juice or soft drink, 3–4 candies), wait 15 minutes and re-check.'), 400); };
  const fmtD = ts => new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  function spark(vals, lo, hi) { if (vals.length < 3) return ''; const W = 340, H = 44, a = Math.min(lo, ...vals), b = Math.max(hi, ...vals), X = i => 4 + i / (vals.length - 1) * (W - 8), Y = v => 4 + (b - v) / (b - a || 1) * (H - 8);
    return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;margin-top:6px"><rect x="0" y="${Y(hi)}" width="${W}" height="${Math.max(0, Y(lo) - Y(hi))}" fill="var(--fill)"/><path d="${vals.map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ')}" fill="none" stroke="var(--ink)" stroke-width="2"/></svg>`; }
  function healthSection() {
    const b = S.bp.at(-1), g = S.glu.at(-1);
    const bpRow = b ? (() => { const c = bpCat(b[1], b[2]); const avg = S.bp.slice(-7), as = Math.round(avg.reduce((s, x) => s + x[1], 0) / avg.length), ad = Math.round(avg.reduce((s, x) => s + x[2], 0) / avg.length);
      return `<div class="pg-line" style="cursor:pointer" onclick="bpSheet()"><span>Blood pressure <small>${fmtD(b[0])}${S.bp.length > 1 ? ` · avg ${as}/${ad}` : ''}</small></span><span class="v">${b[1]}/${b[2]} <small style="${c[1] >= 2 ? 'color:var(--accent);font-weight:600' : ''}">${c[0]}</small></span></div>${spark(S.bp.slice(-20).map(x => x[1]), 90, 120)}`; })()
      : `<div class="pg-line" style="cursor:pointer" onclick="bpSheet()"><span>Blood pressure</span><span class="v" style="font-weight:600">Add</span></div>`;
    const gRow = g ? (() => { const c = gluCat(g[1], g[2]); return `<div class="pg-line" style="cursor:pointer" onclick="gluSheet()"><span>Blood sugar <small>${fmtD(g[0])} · ${CTX.find(x => x[0] === g[2])[1].toLowerCase()}</small></span><span class="v">${g[1]} <small>mg/dL</small> <small style="${c[1] >= 2 ? 'color:var(--accent);font-weight:600' : ''}">${c[0]}</small></span></div>${spark(S.glu.slice(-20).map(x => x[1]), 70, 140)}`; })()
      : `<div class="pg-line" style="cursor:pointer" onclick="gluSheet()"><span>Blood sugar</span><span class="v" style="font-weight:600">Add</span></div>`;
    return `<div class="pg-hdr"><span>Health</span><button class="pg-i" aria-label="About" onclick="healthInfo()">i</button></div>${bpRow}${gRow}
      <div class="t-caption" style="margin-top:6px">Tap a row to add a reading. Shaded band = healthy range.</div>`;
  }
  window.healthInfo = () => openSheet(`<h3 class="t-title">Blood pressure & blood sugar</h3>
    <p class="t-body" style="margin:var(--s2) 0"><b>Blood pressure</b> (AHA 2017): normal under 120/80 · elevated 120–129 · high stage 1 130–139 or 80–89 · stage 2 140+ or 90+. Losing weight, walking daily, less salt and more potassium (fruit, vegetables) each lower it by several points.</p>
    <p class="t-body"><b>Blood sugar</b> (ADA): fasting 70–99 mg/dL normal, 100–125 prediabetes range, 126+ diabetes range. Two hours after a meal, under 140 is normal. Walking after meals, fiber and protein first, and fewer sugary drinks all lower spikes.</p>
    <p class="t-caption" style="margin-top:var(--s2)">One reading isn't a diagnosis — trends matter. Talk to a doctor about repeated high readings. Whelton et al., 2018, Hypertension; ADA Standards of Care 2024.</p>`);
  const _body = V.body; V.body = () => { const h = _body(), k = '<div class="pg-hdr">Measurements</div>', k2 = '<div class="pg-hdr"><span>Measurements</span>'; const i = h.indexOf(k) >= 0 ? h.indexOf(k) : h.indexOf(k2); return i >= 0 ? h.slice(0, i) + healthSection() + h.slice(i) : h + healthSection(); };

  // ---------- 3. Added sugar today (AHA limit: 36 g men / 25 g women) ----------
  const addedSugar = d => RWCore.addedSugar(dayFood(d));
  window.addedSugar = addedSugar;
  const _m = V.meals; V.meals = () => { const h = _m(), lim = S.profile.sex === 'f' ? 25 : 36, g = addedSugar(viewDate); if (!dayFood(viewDate).length) return h;
    const line = `<div class="t-caption num" style="margin-top:var(--s1);display:flex;justify-content:space-between;cursor:pointer" onclick="sugarInfo()"><span>Added sugar ~${g} g of ${lim} g limit</span><span style="${g > lim ? 'color:var(--accent);font-weight:600' : ''}">${g > lim ? 'Over' : g > lim * 0.7 ? 'Close' : 'OK'}</span></div>`;
    return h.replace('<div style="margin-top:var(--s2)"><div class="t-caption" style="display:flex;justify-content:space-between"><span>Vitamins', line + '<div style="margin-top:var(--s2)"><div class="t-caption" style="display:flex;justify-content:space-between"><span>Vitamins'); };
  window.sugarInfo = () => openSheet(`<h3 class="t-title">Added sugar</h3><p class="t-body" style="margin:var(--s2) 0">The AHA recommends at most <b>${S.profile.sex === 'f' ? '25 g (6 tsp)' : '36 g (9 tsp)'}</b> of added sugar a day. Sugar in whole fruit and plain milk doesn't count. One 330 ml soft drink is ~35 g; a regular milk tea ~25–40 g.</p>
    <p class="t-body">Easy swaps: <b>stevia</b> in coffee and tea (zero calories, doesn't raise blood sugar), water or unsweetened green tea instead of soft drinks, "less sugar" on milk tea.</p>
    <p class="t-caption" style="margin-top:var(--s2)">Estimated from sweet ingredients in what you logged. Johnson et al., 2009, Circulation (AHA).</p>`);

  // ---------- 4. More supplements (stevia, dark chocolate) + clearer caffeine ----------
  if (typeof SUPPS !== 'undefined') {
    const caf = SUPPS.find(s => s[0] === 'Caffeine'); if (caf) { caf[4] = 'The best-proven legal performance booster: more strength, endurance and focus, less perceived effort. It also blunts appetite for a few hours. A cup of brewed coffee has ~95 mg. Avoid after 2 pm — it can cut deep sleep even if you fall asleep fine.'; caf[3] = '3–6 mg per kg, 30–60 min before training (e.g. 200–400 mg). Max ~400 mg/day.'; }
    if (!SUPPS.some(s => s[0].startsWith('Stevia'))) SUPPS.push(['Stevia (sugar replacement)', '🌿', 'A', 'Replace sugar 1:1 by sweetness (a pinch/1 packet ≈ 2 tsp sugar)', 'Zero calories and doesn\'t raise blood sugar or insulin — swapping it for sugar in coffee, tea and shakes removes all that added sugar. Considered safe by WHO/FDA at normal intakes.', 'Ashwell, 2015, Nutr Today; JECFA/WHO ADI 4 mg/kg', 'stevia', ['cut', 'slowcut', 'maintain', 'bulk']]);
    if (!SUPPS.some(s => s[0].startsWith('Dark chocolate'))) SUPPS.push(['Dark chocolate (70–85%)', '🍫', 'B', '10–20 g (1–2 squares) a day as a treat', 'Cocoa flavanols improve blood-vessel function and can lower blood pressure by a few points; also a good source of magnesium, iron and fiber. It\'s still ~60 kcal per 10 g square, so keep it small. Higher % = less sugar.', 'Ried et al., 2017, Cochrane Review; Grassi et al., 2005, Hypertension', 'dark chocolate 85', ['maintain', 'bulk', 'cut', 'slowcut']]);
  }
})();
