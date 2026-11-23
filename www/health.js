// RepWise Ultra-Health rules (pure, UMD, unit-tested in test/health.test.js).
// Numbers and sources live in guidelines.js; this file turns them into personal limits, the added-sugar block,
// nutrient-gap detection, trend warnings and food / supplement suggestions.
(function (root) {
  'use strict';
  const G = root.RWGuide || (typeof require === 'function' ? require('./guidelines.js') : null);
  const Core = root.RWCore || (typeof require === 'function' ? require('./core.js') : null);
  const r0 = v => Math.round(v), r1 = v => Math.round(v * 10) / 10;
  const avg = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0;

  // Calories the % limits are based on (same formula as the app's calorie target).
  function energy(p) {
    if (!p || !p.weight) return 2000;
    const bmr = 10 * p.weight + 6.25 * (p.height || 170) - 5 * (p.age || 30) + (p.sex === 'f' ? -161 : 5);
    const adj = p.deficit != null ? -p.deficit : ({ cut: -500, slowcut: -250, maintain: 0, bulk: 300 })[p.goal] || 0;
    return Math.max(1200, Math.round(bmr * (p.activity || 1.375) + adj));
  }

  // ---------- readings ----------
  // Average of the last n blood-pressure readings ([ts, sys, dia, pulse]).
  function bpAvg(bp, n) { const L = (bp || []).slice().sort((a, b) => a[0] - b[0]).slice(-(n || G.tighten.bp.last)); if (!L.length) return null;
    return { sys: r0(avg(L.map(x => x[1]))), dia: r0(avg(L.map(x => x[2]))), n: L.length }; }
  // Average of the last n glucose readings of one context ('fasting' | 'after').
  function gluAvg(glu, ctx, n) { const L = (glu || []).filter(x => x[2] === ctx).sort((a, b) => a[0] - b[0]).slice(-(n || G.tighten.glucose.last)); if (!L.length) return null;
    return { v: r0(avg(L.map(x => x[1]))), n: L.length, ctx }; }

  // ---------- personal limits ----------
  // limits(profile, {bp, glu}, {kcal}) → { kcal, sugar, sat, fat, sodium, chol, reasons[], notes[], bp, glu }
  // Each limit: { key, label, unit, value, base, strict (bool), why (string|null), source }.
  function limits(profile, readings, opts) {
    const p = profile || {}, R = readings || {}, kcal = (opts && opts.kcal) || energy(p), L = G.limits;
    const pct = (k, strict) => { const d = L[k]; return r0(kcal * (strict ? d.strictPctKcal : d.pctKcal) / d.kcalPerG); };
    const cap = L.sugar.capBySex[p.sex === 'f' ? 'f' : 'm'];
    const base = { sugar: Math.min(cap, pct('sugar')), sat: pct('sat'), fat: pct('fat'), sodium: L.sodium.mg, chol: L.chol.mg };
    const strictVal = { sugar: Math.min(cap, pct('sugar', true)), sat: pct('sat', true), fat: pct('fat', true), sodium: L.sodium.strictMg, chol: L.chol.strictMg };
    const out = { kcal, reasons: [], notes: [], bp: null, glu: null };
    for (const k of Object.keys(base)) out[k] = { key: k, label: L[k].label, unit: L[k].unit, value: base[k], base: base[k], strict: false, why: null, source: L[k].source };
    const tight = (k, why) => { const x = out[k]; if (x.strict) return; x.strict = true; x.value = Math.min(x.value, strictVal[k]); x.why = why; out.reasons.push({ key: k, text: why }); };
    // Blood pressure: average of the last 5 readings in stage 1 or higher.
    const T = G.tighten, b = bpAvg(R.bp, T.bp.last);
    if (b) { out.bp = { ...b, cat: Core.bpCat(b.sys, b.dia) };
      if (b.n >= T.bp.min && (b.sys >= T.bp.sys || b.dia >= T.bp.dia)) {
        const lbl = `your last ${b.n} BP readings averaged ${b.sys}/${b.dia} (${out.bp.cat[0].replace(/ —.*/, '').replace(/^High \((stage \d)\)$/, 'high, $1').toLowerCase()})`;
        tight('sodium', `Sodium limit lowered to ${strictVal.sodium.toLocaleString('en-US')} mg because ${lbl}.`);
        tight('sat', `Saturated fat limit lowered to ${strictVal.sat} g (6% of calories, DASH) because ${lbl}.`);
        tight('fat', `Total fat limit lowered to ${strictVal.fat} g (27% of calories, DASH) because ${lbl}.`);
      } }
    // Glucose: average fasting (or 2 h after meal) readings in the prediabetes range or higher.
    const gf = gluAvg(R.glu, 'fasting', T.glucose.last), ga = gluAvg(R.glu, 'after', T.glucose.last);
    const hit = [gf && gf.n >= T.glucose.min && gf.v >= T.glucose.fasting ? gf : null, ga && ga.n >= T.glucose.min && ga.v >= T.glucose.after ? ga : null].filter(Boolean);
    if (gf || ga) out.glu = { fasting: gf, after: ga };
    if (hit.length) { const g = hit[0], cat = Core.gluCat(g.v, g.ctx), dia = cat[1] >= 2;
      const lbl = `your last ${g.n} ${g.ctx === 'fasting' ? 'fasting' : 'after-meal'} glucose readings averaged ${g.v} mg/dL (${cat[0].toLowerCase()})`;
      out.glu.cat = cat;
      tight('sugar', `Added sugar limit lowered to ${strictVal.sugar} g (5% of calories) because ${lbl}.`);
      if (dia) tight('chol', `Cholesterol limit lowered to ${strictVal.chol} mg because ${lbl}.`);
      out.notes.push(T.carbNote); }
    return out;
  }

  // ---------- hard added-sugar limit ----------
  // Logging `add` grams on a day that already has `todayAdded` grams: blocked when it would go over `limit`.
  function sugarBlock(todayAdded, add, limit) {
    const now = Math.max(0, Math.round(todayAdded || 0)), a = Math.max(0, Math.round(add || 0)), total = now + a;
    return { block: a > 0 && total > limit, total, over: Math.max(0, total - limit), left: Math.max(0, limit - now), add: a };
  }

  // ---------- nutrients per food entry ----------
  // Sodium and cholesterol per 100 g for built-in foods (the food catalogue has no micronutrients).
  // USDA FoodData Central typical values, rounded; anything not listed counts as unknown (totals show "≥").
  const NA = { soy_sauce: 5490, patis: 7850, bagoong: 7000, oyster_sauce: 2730, tomato_sauce: 470, banana_ketchup: 900, mayonnaise: 640, peanut_butter: 430,
    butter: 640, cheese: 650, tapa: 1000, tocino: 800, longganisa: 1200, hotdog: 1090, corned_beef: 900, luncheon_meat: 1370, chicharon: 1820, tuyo: 3000,
    sardines: 410, tuna_can: 250, instant_noodles: 1700, fishball: 600, pandesal: 480, bread_white: 480, bread_wheat: 450, burger_bun: 470, pizza: 600, french_fries: 210,
    cereal: 730, egg: 140, egg_yolk: 50, egg_white: 170, quail_egg: 140, milk: 43, evap_milk: 106, condensed_milk: 127, greek_yogurt: 36, cottage_cheese: 360,
    chicken_breast: 45, chicken_thigh: 95, chicken_thigh_skin: 85, pork_lean: 60, pork_belly: 32, beef_lean: 55, bangus: 70, tilapia: 52, galunggong: 60, shrimp: 120, squid: 44,
    rice_white: 1, rice_brown: 1, rice_glutinous: 4, oats_rolled: 2, oats_steel: 2, potato: 6, kamote: 55, sugar: 1, honey: 4, softdrink: 4, coffee: 2, green_tea: 1,
    oil_veg: 0, oil_olive: 0, oil_evoo: 0, oil_coconut: 0, vinegar: 2, stevia: 0, whey: 200 };
  const CHOL = { egg: 372, egg_yolk: 1085, egg_white: 0, quail_egg: 844, chicken_liver: 345, pork_liver: 301, shrimp: 189, squid: 233, chicken_breast: 73, chicken_thigh: 94,
    chicken_thigh_skin: 95, chicken_wing: 111, chicken_intestine: 150, pork_belly: 72, pork_lean: 70, pork_loin: 70, pork_ground: 72, pork_ribs: 80, beef_lean: 64, beef_ground: 71,
    beef_chuck: 75, beef_shank: 65, oxtail: 100, bone_marrow: 160, bangus: 52, tilapia: 50, galunggong: 60, tuna_can: 36, sardines: 61, hotdog: 60, corned_beef: 86, luncheon_meat: 72,
    butter: 215, cheese: 105, milk: 10, evap_milk: 29, condensed_milk: 34, greek_yogurt: 5, cottage_cheese: 17, ice_cream: 44, mayonnaise: 42, whey: 50,
    oil_veg: 0, oil_olive: 0, oil_evoo: 0, oil_coconut: 0, soy_sauce: 0, patis: 0, vinegar: 0, sugar: 0, honey: 0, softdrink: 0, coffee: 0, green_tea: 0, stevia: 0 };
  const PLANT = new Set(['veg', 'fruit']); // plant foods have no cholesterol
  const MICRO = ['k', 'ca', 'fe', 'mg', 'zn', 'va', 'vc', 'vd', 'b12', 'fol'];
  const NUT_SRC = 'USDA FoodData Central typical values (rounded) for built-in foods; your own ingredients use what you entered.';
  // entryNutrients([name,kcal,p,c,f,fib,meta], db) → totals; *Known = false when some part of the entry has no data.
  function entryNutrients(x, db) {
    db = db || {}; const m = (x && x[6]) || {}, mult = m.mult || 1, items = Array.isArray(m.items) ? m.items : [];
    const o = { kcal: +x[1] || 0, p: +x[2] || 0, c: +x[3] || 0, f: +x[4] || 0, fib: +x[5] || 0, sugar: Core.addedSugar([x]), sat: 0, satKnown: true, na: 0, naKnown: true, chol: 0, cholKnown: true, micro: {}, microKnown: {} };
    for (const k of MICRO) { o.micro[k] = 0; o.microKnown[k] = items.length > 0; }
    if (!items.length) { if (typeof m.sat === 'number') o.sat = m.sat * mult; else o.satKnown = false; o.naKnown = o.cholKnown = false; return o; }
    for (const it of items) { const ing = db[it.id], g = (+it.g || 0) * mult / 100, per = (ing && ing.per100) || {};
      if (ing && per.sat != null) o.sat += per.sat * g; else o.satKnown = false;
      if (per.na != null) o.na += per.na * g; else if (NA[it.id] != null) o.na += NA[it.id] * g; else o.naKnown = false;
      if (per.chol != null) o.chol += per.chol * g; else if (CHOL[it.id] != null) o.chol += CHOL[it.id] * g; else if (ing && PLANT.has(ing.group)) { /* 0 */ } else o.cholKnown = false;
      for (const k of MICRO) { if (per[k] != null) o.micro[k] += per[k] * g; else o.microKnown[k] = false; } }
    return o;
  }
  // Totals for a whole day; *Partial = at least one entry had no data, so the real amount is at least the total.
  function dayTotals(entries, db) {
    const t = { n: 0, kcal: 0, p: 0, c: 0, f: 0, fib: 0, sugar: 0, sat: 0, na: 0, chol: 0, satPartial: false, naPartial: false, cholPartial: false, micro: {}, microPartial: {} };
    for (const k of MICRO) { t.micro[k] = 0; t.microPartial[k] = false; }
    for (const x of entries || []) { const e = entryNutrients(x, db); t.n++;
      for (const k of ['kcal', 'p', 'c', 'f', 'fib', 'sugar', 'sat', 'na', 'chol']) t[k] += e[k];
      if (!e.satKnown) t.satPartial = true; if (!e.naKnown) t.naPartial = true; if (!e.cholKnown) t.cholPartial = true;
      for (const k of MICRO) { t.micro[k] += e.micro[k]; if (!e.microKnown[k]) t.microPartial[k] = true; } }
    for (const k of ['c', 'f', 'fib', 'sat']) t[k] = r1(t[k]); for (const k of ['kcal', 'p', 'sugar', 'na', 'chol']) t[k] = r0(t[k]);
    return t;
  }

  // ---------- nutrient gaps (7–14 days) ----------
  // days: dayTotals of each logged day (oldest → newest). Returns { days, enough, low[], noData[] }.
  //  low: { k, label, unit, avg, rec, lowDays, incomplete } — consistently under 70% of the recommended intake.
  //  noData: nutrients we can't judge because most foods have no data for them.
  function deficiencies(days, profile) {
    const D = G.deficiency, list = (days || []).filter(d => d && d.n > 0).slice(-D.window), p = profile || {};
    const out = { days: list.length, enough: list.length >= D.minDays, low: [], noData: [] };
    if (!out.enough) return out;
    const judge = (k, vals, incomplete) => { const rec = G.intake(k, p); if (!rec) return;
      const lowDays = vals.filter(v => v < rec * D.lowPct).length;
      if (lowDays >= Math.ceil(list.length * D.daysPct)) out.low.push({ k, label: G.intakes[k].label, unit: G.intakes[k].unit, avg: r1(avg(vals)), rec, lowDays, incomplete }); };
    judge('fib', list.map(d => d.fib), false);
    judge('p', list.map(d => d.p), false);
    for (const k of MICRO) { const known = list.filter(d => !d.microPartial[k]).length, vals = list.map(d => d.micro[k]);
      if (known >= Math.ceil(list.length * 0.8)) { judge(k, vals, known < list.length); continue; }
      // Mostly missing data: fine if even the known part already meets the target on most days, otherwise we can't tell.
      const rec = G.intake(k, p);
      if (vals.filter(v => v >= rec * D.lowPct).length >= Math.ceil(list.length * D.daysPct)) continue;
      out.noData.push(G.intakes[k].label); }
    return out;
  }

  // ---------- trend warnings ----------
  // days: [{date, ...dayTotals}] logged days (oldest → newest); lim: limits(). Returns [{level, key, text}]
  // level: 'info' | 'warn' | 'doctor' | 'urgent'.
  function trends(days, readings, lim, now) {
    const T = G.trends, Dr = G.doctor, out = [], last = (days || []).filter(d => d && d.n > 0).slice(-T.of), R = readings || {};
    now = now || Date.now();
    const overDays = k => last.filter(d => d[k] > lim[k].value).length;
    const s = overDays('sugar'); if (s >= T.days) out.push({ level: 'warn', key: 'sugar', text: `Added sugar was over your ${lim.sugar.value} g limit on ${s} of your last ${last.length} logged days. Regularly high added sugar raises the risk of weight gain, type 2 diabetes and heart disease.` });
    const sf = overDays('sat'); if (sf >= T.days) out.push({ level: 'warn', key: 'sat', text: `Saturated fat was over your ${lim.sat.value} g limit on ${sf} of your last ${last.length} logged days. Over time this raises LDL cholesterol and heart-disease risk.` });
    const na = last.filter(d => d.na > lim.sodium.value).length; if (na >= T.days) out.push({ level: 'warn', key: 'sodium', text: `Sodium was over your ${lim.sodium.value.toLocaleString('en-US')} mg limit on at least ${na} of your last ${last.length} logged days. A lot of sodium raises blood pressure.` });
    // Rising readings: last 3 vs the 3 before.
    const bp = (R.bp || []).slice().sort((a, b) => a[0] - b[0]);
    if (bp.length >= 6) { const a = avg(bp.slice(-3).map(x => x[1])), b = avg(bp.slice(-6, -3).map(x => x[1]));
      if (a - b >= T.bpRise) out.push({ level: 'warn', key: 'bpRise', text: `Your blood pressure is rising: the last 3 readings averaged ${r0(a)} systolic, up from ${r0(b)}.` }); }
    const gf = (R.glu || []).filter(x => x[2] === 'fasting').sort((a, b) => a[0] - b[0]);
    if (gf.length >= 6) { const a = avg(gf.slice(-3).map(x => x[1])), b = avg(gf.slice(-6, -3).map(x => x[1]));
      if (a - b >= T.gluRise) out.push({ level: 'warn', key: 'gluRise', text: `Your fasting blood sugar is rising: the last 3 readings averaged ${r0(a)} mg/dL, up from ${r0(b)}.` }); }
    // Readings that guidelines say need a doctor (last 30 days).
    const recent = x => x[0] > now - 30 * 864e5;
    const bpR = bp.filter(recent), crisis = bpR.find(x => x[1] >= Dr.bpUrgent[0] || x[2] >= Dr.bpUrgent[1]);
    if (crisis) out.unshift({ level: 'urgent', key: 'bpCrisis', text: `A reading of ${crisis[1]}/${crisis[2]} is in the hypertensive-crisis range. If you have chest pain, shortness of breath, weakness or trouble speaking, get emergency care now; otherwise re-check in 5 minutes and contact a doctor today.` });
    const ba = bpAvg(bpR, 5);
    if (ba && ba.n >= 3 && (ba.sys >= Dr.bpSee[0] || ba.dia >= Dr.bpSee[1])) out.push({ level: 'doctor', key: 'bpSee', text: `Your recent blood pressure averages ${ba.sys}/${ba.dia} (high, stage 2). Guidelines recommend seeing a doctor about readings in this range.` });
    const gR = (R.glu || []).filter(recent), gfa = gluAvg(gR, 'fasting', 5), hiAny = gR.find(x => x[1] >= Dr.gluAny);
    if ((gfa && gfa.n >= 2 && gfa.v >= Dr.gluFasting) || hiAny) out.push({ level: 'doctor', key: 'gluSee', text: `${hiAny ? `A blood sugar of ${hiAny[1]} mg/dL` : `Your fasting blood sugar averages ${gfa.v} mg/dL`} is in the diabetes range. Only a doctor can diagnose diabetes — please book a check-up and an HbA1c test.` });
    const lows = gR.filter(x => x[1] < Dr.gluLow), vlow = gR.find(x => x[1] < Dr.gluVeryLow);
    if (vlow || lows.length >= 2) out.push({ level: 'doctor', key: 'gluLow', text: `${vlow ? `A reading of ${vlow[1]} mg/dL is seriously low` : `${lows.length} low readings (under 70 mg/dL) this month`}. Talk to a doctor, especially if you take medicine for blood sugar.` });
    return out;
  }

  // ---------- suggestions ----------
  // Foods (Filipino where possible) that add a nutrient. serving g; ids are FOODDB ingredients.
  const FOODS = {
    fib: [['Malunggay (in tinola or monggo)', 'malunggay', 50], ['Ginisang monggo', 'monggo_dry', 50], ['Boiled saba', 'saba', 120], ['Kamote, boiled', 'kamote', 150], ['Guava (bayabas)', 'guava', 100], ['Oatmeal', 'oats_rolled', 40], ['Brown rice instead of white', 'rice_brown', 160], ['Chia seeds in water or yogurt', 'chia', 15]],
    p: [['Tokwa (firm tofu)', 'tofu', 150], ['Grilled bangus', 'bangus', 120], ['Eggs', 'egg', 100], ['Chicken breast (inihaw)', 'chicken_breast', 120], ['Tuna in water', 'tuna_can', 100], ['Greek yogurt, plain', 'greek_yogurt', 170]],
    k: [['Boiled saba', 'saba', 120], ['Kamote, boiled', 'kamote', 150], ['Buko juice (no sugar added)', 'buko_juice', 250], ['Ginisang monggo', 'monggo_dry', 50], ['Kangkong', 'kangkong', 100]],
    ca: [['Malunggay', 'malunggay', 50], ['Tokwa (firm tofu)', 'tofu', 150], ['Milk', 'milk', 250], ['Pechay', 'pechay', 100], ['Sardines (with bones)', 'sardines', 100]],
    fe: [['Ginisang monggo', 'monggo_dry', 50], ['Kangkong', 'kangkong', 100], ['Malunggay', 'malunggay', 50], ['Tokwa (firm tofu)', 'tofu', 150]],
    mg: [['Ginisang monggo', 'monggo_dry', 50], ['Peanuts (unsalted)', 'peanuts', 30], ['Brown rice', 'rice_brown', 160], ['Almonds', 'almonds', 30]],
    zn: [['Lean beef', 'beef_lean', 100], ['Peanuts (unsalted)', 'peanuts', 30], ['Tokwa', 'tofu', 150]],
    va: [['Kalabasa', 'kalabasa', 100], ['Carrots', 'carrot', 80], ['Malunggay', 'malunggay', 50], ['Kamote', 'kamote', 150]],
    vc: [['Guava (bayabas)', 'guava', 100], ['Papaya', 'papaya', 150], ['Calamansi / dalandan', 'orange', 130], ['Malunggay', 'malunggay', 50]],
    vd: [['Bangus or galunggong', 'bangus', 120], ['Sardines', 'sardines', 100], ['Eggs', 'egg', 100]],
    b12: [['Eggs', 'egg', 100], ['Bangus', 'bangus', 120], ['Milk', 'milk', 250], ['Sardines', 'sardines', 100]],
    fol: [['Ginisang monggo', 'monggo_dry', 50], ['Malunggay', 'malunggay', 50], ['Kangkong', 'kangkong', 100], ['Avocado', 'avocado', 100]],
  };
  // Foods for the gaps that still fit today's remaining limits ({sugar, sat, sodium, chol} left).
  function foodSuggestions(lowKeys, left, db) {
    db = db || {}; const out = [], seen = new Set(), L = left || {};
    for (const k of lowKeys || []) for (const [name, id, g] of FOODS[k] || []) { if (seen.has(name)) continue;
      const e = entryNutrients([name, 0, 0, 0, 0, 0, { items: [{ id, g }] }], db);
      if (L.sat != null && e.sat > L.sat) continue; if (L.sodium != null && e.na > L.sodium) continue; if (L.chol != null && e.chol > L.chol) continue; if (L.sugar != null && e.sugar > L.sugar) continue;
      seen.add(name); out.push({ name, for: k, g }); if (out.filter(x => x.for === k).length >= 3) break; }
    return out;
  }
  // Supplements with general info; always shown with "check with your doctor or pharmacist".
  const SUPP = {
    vd: ['Vitamin D3', '600–1,000 IU (15–25 µg) a day is a common dose. Most useful if you are rarely in the sun.'],
    fe: ['Iron', 'Only if a blood test shows low iron — too much iron is harmful. Take with vitamin C, away from coffee and tea.'],
    ca: ['Calcium', '500–600 mg at a time, with food. Food sources first; too much can cause constipation or kidney stones.'],
    b12: ['Vitamin B12', '2.4 µg a day covers the need; common if you eat little meat, fish, eggs or dairy, or take metformin.'],
    mg: ['Magnesium', '200–350 mg a day from supplements is the safe upper level; may loosen stools.'],
    fib: ['Psyllium fiber', '5–10 g a day in a big glass of water helps fill a fiber gap. Start low to avoid bloating.'],
    p: ['Whey or soy protein', 'A scoop (20–30 g protein) helps when meals fall short. Food first.'],
    zn: ['Zinc', '8–11 mg a day; high doses over 40 mg a day block copper absorption.'],
    fol: ['Folic acid', '400 µg a day — especially important if you could become pregnant.'],
    k: null, va: null, vc: ['Vitamin C', '75–90 mg a day; food (guava, papaya, calamansi) covers this easily.'],
  };
  const supplements = lowKeys => (lowKeys || []).map(k => SUPP[k] ? { k, name: SUPP[k][0], info: SUPP[k][1] } : null).filter(Boolean);
  // Lower-sugar swaps for the sweet ingredients in a list of items ({meta:{items}} or entries).
  const SWAPS = { sugar: 'Stevia instead of sugar (same sweetness, no added sugar)', softdrink: 'Water, sparkling water or unsweetened green tea instead of soft drink', coffee_3in1: 'Black coffee with milk and stevia instead of 3-in-1',
    green_tea_sweet: 'Unsweetened green tea', condensed_milk: 'Evaporated milk (no added sugar) instead of condensed milk', honey: 'Stevia, or half the honey', ice_cream: 'Frozen mango or saba slices', banana_ketchup: 'Tomato or vinegar dip instead of banana ketchup', cocoa_tablea: 'Champorado with half the sugar, sweetened with stevia' };
  function swaps(itemsOrEntries) { const ids = new Set(); for (const it of itemsOrEntries || []) { const m = it.meta || it[6] || {}; for (const x of m.items || []) if (SWAPS[x.id]) ids.add(x.id); }
    const L = [...ids].map(id => SWAPS[id]); return L.length ? L : ['Fresh fruit (papaya, mango, banana) instead of sweets', 'Water or unsweetened tea instead of sweet drinks', 'Ask for "less sugar" or "no sugar" on milk tea and coffee']; }

  const API = { energy, bpAvg, gluAvg, limits, sugarBlock, entryNutrients, dayTotals, deficiencies, trends, foodSuggestions, supplements, swaps, NA, CHOL, MICRO, NUT_SRC, FOODS };
  root.RWHealth = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
