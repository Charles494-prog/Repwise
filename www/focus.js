// RepWise "today's focus": pick what to train today (Push, Pull, Legs or specific muscle areas) and get an
// exercise list that covers every chosen area. Pure functions (UMD) so the rules are unit-tested in Node;
// the app layer (weekplan.js) supplies equipment, the exercise catalogue and the workout in progress.
//
// Picking a muscle covers the WHOLE muscle: every head / region (same split as SUBM in exercises.js) gets at
// least one exercise that suits the user's equipment. Covering every region wins over the session-length cap.
// Routines (PPL, Arnold, Daily Rotation…) are never options here: they live in the Workout style screen.
(function (root) {
  'use strict';
  // Muscle areas, in display order. parent = the app's muscle (XP, ranks, weekly balance).
  // regions = [key, label] — keys match SUBM sub-muscles of the parent.
  const AREAS = [
    { id: 'chest', label: 'Chest', group: 'Push', parent: 'Chest', regions: [['upper', 'Upper chest'], ['mid', 'Mid chest'], ['lower', 'Lower chest']] },
    { id: 'delts_front', label: 'Front delts', group: 'Push', parent: 'Shoulders', regions: [['front', 'Front delt']] },
    { id: 'delts_side', label: 'Side delts', group: 'Push', parent: 'Shoulders', regions: [['side', 'Side delt']] },
    { id: 'triceps', label: 'Triceps', group: 'Push', parent: 'Triceps', regions: [['long', 'Long head'], ['lateral', 'Lateral head'], ['medial', 'Medial head']] },
    { id: 'back', label: 'Back', group: 'Pull', parent: 'Back', regions: [['upper', 'Mid & upper back'], ['lower', 'Lower back']] },
    { id: 'lats', label: 'Lats', group: 'Pull', parent: 'Back', regions: [['lats', 'Lats']] },
    { id: 'traps', label: 'Traps', group: 'Pull', parent: 'Back', regions: [['upper', 'Traps']] },
    { id: 'delts_rear', label: 'Rear delts', group: 'Pull', parent: 'Shoulders', regions: [['rear', 'Rear delt']] },
    { id: 'biceps', label: 'Biceps', group: 'Pull', parent: 'Biceps', regions: [['long', 'Long head'], ['short', 'Short head'], ['brachialis', 'Brachialis']] },
    { id: 'forearms', label: 'Forearms', group: 'Pull', parent: 'Forearms', regions: [['flexors', 'Flexors (grip)'], ['extensors', 'Extensors']] },
    { id: 'quads', label: 'Quads', group: 'Legs', parent: 'Quads', regions: [['vl', 'Outer quad'], ['vm', 'Inner quad'], ['rf', 'Rectus femoris']] },
    { id: 'hamstrings', label: 'Hamstrings', group: 'Legs', parent: 'Hamstrings', regions: [['inner', 'Inner hamstrings'], ['bf', 'Outer (biceps femoris)']] },
    { id: 'glutes', label: 'Glutes', group: 'Legs', parent: 'Glutes', regions: [['max', 'Glute max'], ['med', 'Glute med']] },
    { id: 'calves', label: 'Calves', group: 'Legs', parent: 'Calves', regions: [['gastro', 'Gastrocnemius'], ['soleus', 'Soleus']] },
    { id: 'core', label: 'Abs / core', group: 'Other', parent: 'Core', regions: [['abs', 'Abs'], ['obliques', 'Obliques'], ['deep', 'Deep core']] },
  ];
  const GROUPS = ['Push', 'Pull', 'Legs', 'Other'];
  const AREA = Object.fromEntries(AREAS.map(a => [a.id, a]));
  const PRESETS = {
    push: { label: 'Push', areas: ['chest', 'delts_front', 'delts_side', 'triceps'] },
    pull: { label: 'Pull', areas: ['back', 'lats', 'delts_rear', 'biceps'] },
    legs: { label: 'Legs', areas: ['quads', 'hamstrings', 'glutes', 'calves'] },
  };
  // Extra exercises (beyond one per region) are capped per area: big areas 3, small ones 2.
  const MAXPER = { chest: 3, back: 3, lats: 3, quads: 3, hamstrings: 3, glutes: 3, triceps: 3, biceps: 3, core: 3 };

  // Exercises per region, best first (compound before isolation): [name, tier, compound?]
  // Tiers match the app's equipment families: m machine/cable · b barbell · d dumbbell · bar pull-up/dip bar · h home.
  const CAND = {
    chest: {
      upper: [['Incline Bench Press', 'b', 1], ['Incline Machine Press', 'm', 1], ['Incline Dumbbell Press', 'd', 1], ['Incline Smith Press', 'm', 1], ['Decline Push-up', 'h', 1], ['Low-to-High Cable Fly', 'm'], ['Incline Dumbbell Fly', 'd']],
      mid: [['Bench Press', 'b', 1], ['Chest Press Machine', 'm', 1], ['Dumbbell Bench Press', 'd', 1], ['Push-up', 'h', 1], ['Pec Deck', 'm'], ['Cable Crossover', 'm'], ['Chest Fly', 'd'], ['Wide Push-up', 'h']],
      lower: [['Dips', 'bar', 1], ['Decline Bench Press', 'b', 1], ['Assisted Dip Machine', 'm', 1], ['Decline Dumbbell Press', 'd', 1], ['High-to-Low Cable Fly', 'm'], ['Incline Push-up', 'h', 1]],
    },
    delts_front: { front: [['Overhead Press', 'b', 1], ['Shoulder Press Machine', 'm', 1], ['Seated Dumbbell Press', 'd', 1], ['Arnold Press', 'd', 1], ['Pike Push-up', 'h', 1], ['Landmine Press', 'b', 1], ['Front Raise', 'd'], ['Cable Front Raise', 'm'], ['Bottle Front Raise', 'h']] },
    delts_side: { side: [['Lateral Raise', 'd'], ['Cable Lateral Raise', 'm'], ['Machine Lateral Raise', 'm'], ['Seated Lateral Raise', 'd'], ['Cable Upright Row', 'm'], ['Bottle Lateral Raise', 'h']] },
    triceps: {
      long: [['Overhead Cable Extension', 'm'], ['Overhead Dumbbell Extension', 'd'], ['Skull Crusher', 'b'], ['Overhead Backpack Extension', 'h']],
      lateral: [['Rope Pushdown', 'm'], ['Tricep Pushdown', 'm'], ['Dips', 'bar', 1], ['Close-grip Bench Press', 'b', 1], ['Dumbbell Kickback', 'd'], ['Diamond Push-up', 'h', 1]],
      medial: [['Reverse-grip Pushdown', 'm'], ['Close-grip Bench Press', 'b', 1], ['Close-grip Dumbbell Press', 'd', 1], ['Bench Dip', 'h']],
    },
    back: {
      upper: [['Barbell Row', 'b', 1], ['Seated Cable Row', 'm', 1], ['Chest-supported Row', 'm', 1], ['Dumbbell Row', 'd', 1], ['T-Bar Row', 'b', 1], ['Incline Dumbbell Row', 'd', 1], ['Single-arm Cable Row', 'm', 1], ['Australian Row', 'h', 1], ['Doorway Row', 'h', 1]],
      lower: [['Back Extension', 'm'], ['Good Morning', 'b', 1], ['Dumbbell Deadlift', 'd', 1], ['Superman Hold (sec)', 'h']],
    },
    lats: { lats: [['Pull-up', 'bar', 1], ['Lat Pulldown', 'm', 1], ['Chin-up', 'bar', 1], ['Neutral-grip Pull-up', 'bar', 1], ['Close-grip Lat Pulldown', 'm', 1], ['Straight-arm Pulldown', 'm'], ['Dumbbell Pullover', 'd'], ['Towel Lat Pulldown', 'h']] },
    traps: { upper: [['Barbell Shrug', 'b'], ['Dumbbell Shrug', 'd'], ['Cable Shrug', 'm'], ["Farmer's Walk (sec)", 'd'], ['Backpack Shrug', 'h']] },
    delts_rear: { rear: [['Face Pull', 'm'], ['Reverse Pec Deck', 'm'], ['Rear Delt Fly', 'd'], ['Prone Y-T-W', 'h'], ['Band Pull-apart', 'h']] },
    biceps: {
      long: [['Incline Dumbbell Curl', 'd'], ['Bayesian Cable Curl', 'm'], ['Seated Dumbbell Curl', 'd'], ['Chin-up', 'bar', 1], ['Backpack Drag Curl', 'h']],
      short: [['Preacher Curl', 'b'], ['Machine Preacher Curl', 'm'], ['Barbell Curl', 'b'], ['Cable Curl', 'm'], ['Concentration Curl', 'd'], ['Spider Curl', 'd'], ['Dumbbell Curl', 'd'], ['Backpack Curl', 'h']],
      brachialis: [['Hammer Curl', 'd'], ['Rope Hammer Curl', 'm'], ['Reverse Curl', 'b'], ['Backpack Hammer Curl', 'h']],
    },
    forearms: {
      flexors: [['Wrist Curl', 'd'], ['Cable Wrist Curl', 'm'], ["Farmer's Walk (sec)", 'd'], ['Dead Hang (sec)', 'bar'], ['Backpack Wrist Curl', 'h']],
      extensors: [['Reverse Curl', 'b'], ['Reverse Wrist Curl', 'd'], ['Cable Reverse Curl', 'm'], ['Backpack Reverse Wrist Curl', 'h']],
    },
    quads: {
      vl: [['Squat', 'b', 1], ['Leg Press', 'm', 1], ['Hack Squat', 'm', 1], ['Goblet Squat', 'd', 1], ['Bodyweight Squat', 'h', 1]],
      vm: [['Bulgarian Split Squat', 'd', 1], ['Front Squat', 'b', 1], ['Single-leg Leg Press', 'm', 1], ['Walking Lunge', 'd', 1], ['Step-up', 'd', 1], ['Lunge', 'h', 1], ['Reverse Lunge', 'h', 1]],
      rf: [['Leg Extension', 'm'], ['Sissy Squat', 'h']],
    },
    hamstrings: {
      inner: [['Romanian Deadlift', 'b', 1], ['Dumbbell RDL', 'd', 1], ['Good Morning', 'b', 1], ['Single-leg RDL', 'h', 1], ['Nordic Curl', 'h']],
      bf: [['Seated Leg Curl', 'm'], ['Lying Leg Curl', 'm'], ['Leg Curl', 'm'], ['Dumbbell Leg Curl', 'd'], ['Sliding Leg Curl', 'h'], ['Nordic Curl', 'h']],
    },
    glutes: {
      max: [['Hip Thrust', 'b', 1], ['Hip Thrust Machine', 'm', 1], ['Dumbbell Hip Thrust', 'd', 1], ['Cable Pull-through', 'm'], ['Glute Bridge', 'h'], ['Single-leg Glute Bridge', 'h']],
      med: [['Hip Abduction Machine', 'm'], ['Cable Hip Abduction', 'm'], ['Cable Kickback', 'm'], ['Side-lying Hip Abduction', 'h']],
    },
    calves: {
      gastro: [['Calf Raise Machine', 'm'], ['Calf Raise', 'b'], ['Dumbbell Calf Raise', 'd'], ['Leg Press Calf Raise', 'm'], ['Single-leg Calf Raise', 'h']],
      soleus: [['Seated Calf Raise', 'm'], ['Dumbbell Seated Calf Raise', 'd'], ['Bent-knee Calf Raise', 'h']],
    },
    core: {
      abs: [['Cable Crunch', 'm'], ['Hanging Leg Raise', 'bar'], ['Ab Wheel Rollout', 'h'], ['Crunch', 'h'], ['Lying Leg Raise', 'h']],
      obliques: [['Pallof Press', 'm'], ['Cable Woodchop', 'm'], ['Bicycle Crunch', 'h'], ['Russian Twist', 'h'], ['Side Plank (sec)', 'h']],
      deep: [['Dead Bug', 'h'], ['Plank Hold (sec)', 'h'], ['Hollow Hold (sec)', 'h']],
    },
  };
  // Exercises that also train another region well (so one exercise can cover two regions and sessions stay short).
  const ALSO = {
    'Dips': ['chest.lower', 'triceps.lateral'], 'Assisted Dip Machine': ['triceps.lateral'], 'Close-grip Bench Press': ['triceps.lateral', 'triceps.medial'],
    'Diamond Push-up': ['triceps.medial'], 'Chin-up': ['lats.lats', 'biceps.long'], 'Squat': ['quads.vm'], 'Leg Press': ['quads.vm'], 'Hack Squat': ['quads.vm'],
    'Goblet Squat': ['quads.vm'], 'Front Squat': ['quads.rf'], 'Bulgarian Split Squat': ['glutes.max'], 'Romanian Deadlift': ['glutes.max'],
    'Dumbbell RDL': ['glutes.max'], 'Nordic Curl': ['hamstrings.inner', 'hamstrings.bf'], 'Good Morning': ['back.lower', 'hamstrings.inner'],
    "Farmer's Walk (sec)": ['traps.upper', 'forearms.flexors'], 'Reverse Curl': ['biceps.brachialis', 'forearms.extensors'],
    'Ab Wheel Rollout': ['core.deep'], 'Hanging Leg Raise': ['core.deep'], 'Bicycle Crunch': ['core.abs'],
  };
  // Exercises this feature adds so every region has an option at every equipment level:
  // [name, primary, secondary, emoji, equipment family, tier]
  const NEW_EX = [
    ['Front Raise', ['Shoulders'], [], '🙌', 'Front raise', 'd'],
    ['Cable Front Raise', ['Shoulders'], [], '🙌', 'Front raise', 'm'],
    ['Bottle Front Raise', ['Shoulders'], [], '🙌', 'Front raise', 'h'],
    ['Cable Shrug', ['Back'], [], '🔝', 'Traps', 'm'],
    ['Backpack Shrug', ['Back'], [], '🎒', 'Traps', 'h'],
    ['Towel Lat Pulldown', ['Back'], ['Biceps'], '⬇️', 'Vertical pull', 'h'],
    ['Doorway Row', ['Back'], ['Biceps', 'Forearms'], '🚪', 'Row', 'h'],
    ['Decline Dumbbell Press', ['Chest'], ['Triceps'], '💪', 'Decline press', 'd'],
    ['High-to-Low Cable Fly', ['Chest'], [], '🦋', 'Decline press', 'm'],
    ['Overhead Backpack Extension', ['Triceps'], [], '🎒', 'Overhead triceps', 'h'],
    ['Reverse-grip Pushdown', ['Triceps'], [], '⬇️', 'Triceps', 'm'],
    ['Close-grip Dumbbell Press', ['Triceps', 'Chest'], [], '💪', 'Triceps', 'd'],
    ['Backpack Drag Curl', ['Biceps'], ['Forearms'], '🎒', 'Biceps curl', 'h'],
    ['Rope Hammer Curl', ['Biceps'], ['Forearms'], '🔨', 'Hammer curl', 'm'],
    ['Backpack Hammer Curl', ['Biceps'], ['Forearms'], '🎒', 'Hammer curl', 'h'],
    ['Wrist Curl', ['Forearms'], [], '🤲', 'Forearms', 'd'],
    ['Cable Wrist Curl', ['Forearms'], [], '🤲', 'Forearms', 'm'],
    ['Backpack Wrist Curl', ['Forearms'], [], '🎒', 'Forearms', 'h'],
    ['Reverse Wrist Curl', ['Forearms'], [], '🤲', 'Forearm extensors', 'd'],
    ['Cable Reverse Curl', ['Forearms'], ['Biceps'], '🤲', 'Forearm extensors', 'm'],
    ['Backpack Reverse Wrist Curl', ['Forearms'], [], '🎒', 'Forearm extensors', 'h'],
    ['Cable Hip Abduction', ['Glutes'], [], '🦵', 'Glute med', 'm'],
    ['Side-lying Hip Abduction', ['Glutes'], [], '🦵', 'Glute med', 'h'],
    ['Dumbbell Seated Calf Raise', ['Calves'], [], '🦶', 'Seated calves', 'd'],
    ['Bent-knee Calf Raise', ['Calves'], [], '🦶', 'Seated calves', 'h'],
    ['Cable Woodchop', ['Core'], [], '🪓', 'Core', 'm'],
  ];

  // Lookups built from CAND / ALSO.
  const TIER_OF = {}, COMPOUND = new Set(), REG_OF = {}, CURATED = {};
  for (const a in CAND) for (const r in CAND[a]) for (const [n, t, c] of CAND[a][r]) {
    TIER_OF[n] ??= t; if (c) COMPOUND.add(n);
    (REG_OF[n] ??= []).includes(a + '.' + r) || REG_OF[n].push(a + '.' + r);
    (CURATED[n] ??= []).includes(a) || CURATED[n].push(a);
  }
  for (const n in ALSO) for (const k of ALSO[n]) { (REG_OF[n] ??= []).includes(k) || REG_OF[n].push(k); const a = k.split('.')[0]; (CURATED[n] ??= []).includes(a) || CURATED[n].push(a); }

  // Custom exercise targets (SUBM keys, e.g. 'Biceps.long') → focus regions.
  const PARENT_AREA = { Chest: ['chest'], Back: ['back'], Shoulders: ['delts_front', 'delts_side', 'delts_rear'], Biceps: ['biceps'], Triceps: ['triceps'], Forearms: ['forearms'], Quads: ['quads'], Hamstrings: ['hamstrings'], Glutes: ['glutes'], Calves: ['calves'], Core: ['core'] };
  const SUB_REG = { 'Shoulders.front': ['delts_front.front'], 'Shoulders.side': ['delts_side.side'], 'Shoulders.rear': ['delts_rear.rear'], 'Back.lats': ['lats.lats'], 'Back.upper': ['back.upper', 'traps.upper'], 'Back.lower': ['back.lower'] };
  function targetRegs(m) {
    if (SUB_REG[m]) return SUB_REG[m];
    const [p, s] = String(m).split('.'); if (!s) return [];
    return (PARENT_AREA[p] || []).filter(a => AREA[a].regions.some(r => r[0] === s)).map(a => a + '.' + s);
  }
  // Name rules for built-ins not listed above (variants added elsewhere in the app).
  const RULES = [[/shrug/i, 'traps'], [/pull-?up|pulldown|chin-up|pullover|muscle-up/i, 'lats'], [/row\b/i, 'back'], [/lateral raise|upright row/i, 'delts_side'],
    [/face pull|rear delt|reverse pec|pull-apart|y-t-w|reverse fly/i, 'delts_rear'], [/front raise|overhead press|shoulder press|arnold|pike|handstand|dumbbell press$|barbell press$|landmine/i, 'delts_front']];
  const uniq = a => [...new Set(a)];
  const primaryTargets = def => def && def[3] && Array.isArray(def[3].t) ? def[3].t.filter(x => x.r === 'p') : [];
  // Regions ('area.region') an exercise covers. def = the app's EX entry [primary, secondary, emoji, meta?].
  function regionsOf(name, def) {
    const t = primaryTargets(def);
    if (t.length) return uniq(t.flatMap(x => targetRegs(x.m)));
    return (REG_OF[name] || []).slice();
  }
  // Areas an exercise trains as a primary mover.
  function areasOf(name, def) {
    const t = primaryTargets(def);
    if (t.length) return uniq(t.flatMap(x => { const r = targetRegs(x.m); return r.length ? r.map(k => k.split('.')[0]) : (PARENT_AREA[String(x.m).split('.')[0]] || []); }));
    if (CURATED[name]) return CURATED[name].slice();
    const hit = RULES.filter(([re]) => re.test(name)).map(([, a]) => a);
    if (hit.length) return uniq(hit);
    return uniq(((def && def[0]) || []).flatMap(m => PARENT_AREA[m] || []));
  }
  // Same rule as the app's avail(): gym has everything, dumbbells adds d, a pull-up bar adds bar, home is always fine.
  const availFor = (equip, bar) => t => !t || equip === 'gym' || t === 'h' || (t === 'd' && equip === 'dumbbell') || (t === 'bar' && !!bar);
  const valid = areas => uniq((areas || []).filter(a => AREA[a])).sort((a, b) => AREAS.indexOf(AREA[a]) - AREAS.indexOf(AREA[b]));
  const regionKeys = areas => valid(areas).flatMap(a => AREA[a].regions.map(([r]) => a + '.' + r));
  const regionLabel = k => { const [a, r] = k.split('.'), A = AREA[a], R = A && A.regions.find(x => x[0] === r); return !A || !R ? k : A.regions.length > 1 ? `${A.label} · ${R[1].toLowerCase()}` : A.label; };

  // ['quads.vl','quads.vm','glutes.max'] → "Quads · outer quad, inner quad + Glutes · glute max"
  const regionsLabel = ks => uniq(ks.map(k => k.split('.')[0])).map(a => { const A = AREA[a]; if (!A) return a; if (A.regions.length < 2) return A.label;
    return `${A.label} · ${ks.filter(k => k.startsWith(a + '.')).map(k => (A.regions.find(r => r[0] === k.split('.')[1]) || [, k])[1].toLowerCase()).join(', ')}`; }).join(' + ');
  // Exercise plan for the chosen areas: [{ex, regions:[keys it covers], label}], every region covered.
  // opts: avail(tier) → bool · has(name) → bool (exists in the catalogue) · count (session length cap)
  //       keep: exercises already logged (kept first) · defs: EX map (for keep / custom mapping) · custom: [names]
  function buildPlan(areas, opts = {}) {
    const A = valid(areas), avail = opts.avail || availFor(opts.equip || 'gym', opts.bar), has = opts.has || (() => true), defs = opts.defs || {};
    const want = regionKeys(A), wantSet = new Set(want), done = new Set(), per = Object.fromEntries(A.map(a => [a, 0]));
    const out = [], info = {}, keep = uniq(opts.keep || []);
    const regs = n => regionsOf(n, defs[n]).filter(k => wantSet.has(k));
    const take = (n, why) => { out.push(n); const r = regs(n); info[n] = r.length ? r : why ? [why] : [];
      for (const k of r) done.add(k);
      const as = info[n].length ? uniq(info[n].map(k => k.split('.')[0])) : areasOf(n, defs[n]);
      for (const a of as) if (a in per) per[a]++; };
    for (const e of keep) take(e);
    const custom = (opts.custom || []).filter(n => has(n));
    const pool = k => { const [a, r] = k.split('.');
      return uniq([...((CAND[a] && CAND[a][r]) || []).filter(([n, t]) => avail(t) && has(n)).map(([n]) => n), ...custom.filter(n => regionsOf(n, defs[n]).includes(k))]).filter(n => !out.includes(n)); };
    // 1) every region of every chosen area gets an exercise. Among the top 3 options prefer one that covers
    //    several still-open regions (e.g. Dips = lower chest + triceps lateral head).
    for (const k of want) {
      if (done.has(k)) continue;
      const opt = pool(k).slice(0, 3); if (!opt.length) continue;
      const score = n => regs(n).filter(x => !done.has(x)).length;
      take(opt.reduce((b, n) => score(n) > score(b) ? n : b, opt[0]), k);
    }
    // 2) fill up to the session cap, round-robin over the areas and their regions
    const cap = Math.max(opts.count || 6, out.length);
    for (let round = 1, grew = true; out.length < cap && grew; round++) { grew = false;
      for (const a of A) { if (out.length >= cap) break; if (per[a] > round || per[a] >= Math.max(MAXPER[a] || 2, AREA[a].regions.length)) continue;
        const ks = AREA[a].regions.map(([r]) => a + '.' + r), k = ks.find(x => pool(x).length);
        if (k) { take(pool(k)[0], k); grew = true; } } }
    const fresh = out.slice(keep.length), isC = n => COMPOUND.has(n) ? 0 : 1;
    const order = [...keep, ...fresh.map((n, i) => [n, i]).sort((x, y) => isC(x[0]) - isC(y[0]) || x[1] - y[1]).map(x => x[0])];
    return order.map(ex => ({ ex, regions: info[ex], label: regionsLabel(info[ex]) }));
  }
  const buildList = (areas, opts) => buildPlan(areas, opts).map(x => x.ex);
  // Regions of the chosen areas that no exercise in the plan covers (empty = whole muscle covered).
  const missing = (areas, plan) => { const c = new Set(plan.flatMap(x => x.regions)); return regionKeys(areas).filter(k => !c.has(k)); };
  // Parent muscles for the chosen areas.
  const parents = areas => uniq(valid(areas).map(a => AREA[a].parent));
  // "Push", "Push + Biceps", "Biceps + Side delts", "Chest + Back + Lats +2"
  function label(areas) {
    const A = valid(areas); let rest = A.slice(), parts = [];
    for (const [, p] of Object.entries(PRESETS)) if (p.areas.every(a => rest.includes(a))) { parts.push(p.label); rest = rest.filter(a => !p.areas.includes(a)); }
    parts = [...parts, ...rest.map(a => AREA[a].label)];
    return parts.length > 3 ? parts.slice(0, 3).join(' + ') + ` +${parts.length - 3}` : parts.join(' + ');
  }
  const presetOf = areas => { const A = valid(areas).join(); return Object.keys(PRESETS).find(k => valid(PRESETS[k].areas).join() === A) || null; };
  // Everything the picker may show: three presets, then every area. Never routines or program days.
  const pickerOptions = () => [...Object.entries(PRESETS).map(([id, p]) => ({ type: 'preset', id, label: p.label, areas: p.areas.slice() })),
    ...AREAS.map(a => ({ type: 'area', id: a.id, label: a.label, group: a.group }))];
  // Program key for a focus (kept in workout history so old sessions keep their name).
  const key = areas => 'f_' + valid(areas).join('+');
  const fromKey = k => typeof k === 'string' && k.startsWith('f_') ? valid(k.slice(2).split('+')) : null;

  const API = { AREAS, AREA, GROUPS, PRESETS, CAND, ALSO, NEW_EX, TIER_OF, REG_OF, areasOf, regionsOf, regionKeys, regionLabel, regionsLabel, availFor, valid, buildPlan, buildList, missing, parents, label, presetOf, pickerOptions, key, fromKey };
  root.RWFocus = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
