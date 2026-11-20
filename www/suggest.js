// RepWise: "Suggested for the rest of today" — goal-aware meal ideas that fit remaining calories & protein.
// Deficit: protein-dense, high-volume, lighter cooking, smaller rice. Surplus: calorie-dense add-ons, more meals.
// Maintain: balanced, close to the remaining target. Uses the user's own meals/frequent foods first.
(function () {
  const F = window.FOODDB;
  const SLOTS = { breakfast: [5, 10, 0.25], lunch: [10, 15, 0.35], dinner: [15, 21, 0.3], snack: [0, 24, 0.1] };
  const BREAKFAST = ['silog', 'oatmeal', 'lugaw', 'champorado', 'tortang_talong', 'cereal_bowl', 'pb_sandwich'];
  const SNACK_ING = ['banana', 'apple', 'mango', 'guava', 'papaya', 'egg', 'saba', 'kamote', 'peanuts', 'almonds', 'tofu_silken'];
  const NO_RICE = ['pares', 'batchoy', 'lomi', 'mami', 'sotanghon', 'instant', 'burger', 'fries', 'pizza_d', 'pb_sandwich', 'cereal_bowl', 'milktea', 'coffee_drink', 'leche_flan', 'bibingka', 'maja', 'ube_halaya', 'kwekkwek', 'fishballs', 'isaw', 'bbq', 'kinilaw', 'rice', 'silog', 'pancit', 'spaghetti_ph', 'lugaw', 'champorado', 'sopas', 'oatmeal', 'turon', 'banana_cue', 'kamote_cue', 'taho', 'halohalo', 'siopao', 'lumpia', 'siomai', 'embutido'];
  const TREATS = ['leche_flan', 'bibingka', 'maja', 'ube_halaya', 'milktea', 'fries', 'pizza_d', 'burger', 'instant', 'kwekkwek', 'fishballs', 'turon', 'banana_cue', 'kamote_cue', 'halohalo', 'champorado', 'crispy_pata', 'lechon_kawali'];
  const SOUPS = ['sinigang', 'tinola', 'nilaga', 'paksiw', 'monggo', 'pinakbet', 'chopsuey', 'ginataan', 'grilled_fish', 'ensaladang_talong'];

  function goalMode() { const g = S.profile.goal; return g === 'bulk' ? 'surplus' : g === 'maintain' ? 'maintain' : 'deficit'; }
  function remaining() {
    const t = targets(), d = today(), f = dayFood(d), burn = (S.burn || {})[d] || 0;
    return { kcal: t.kcal + burn - sum(f, 1), p: t.protein - sum(f, 2), eaten: sum(f, 1), target: t.kcal + burn };
  }
  function slotsLeft(h, mode) {
    const eatenByName = dayFood(today()).length;
    let s = h < 5 ? ['snack'] : h < 10 ? ['breakfast', 'lunch', 'dinner', 'snack'] : h < 15 ? ['lunch', 'dinner', 'snack'] : h < 20 ? ['dinner', 'snack'] : ['snack'];
    if (mode === 'surplus' && h < 20) s = [...s.filter(x => x !== 'snack'), 'snack', 'snack'];
    if (h < 10 && eatenByName > 0) s = s.filter(x => x !== 'breakfast');
    return s;
  }
  // Dish candidate with the variant/method that suits the goal (+ rice portion for mains)
  function dishCand(d, mode) {
    let best = null;
    for (const v of d.variants) {
      let method = d.method, oilType, oilAmt;
      if (mode === 'deficit' && (method === 'deep' || method === 'pan')) { method = method === 'deep' ? 'air' : 'pan'; }
      const def = F.METHOD_DEFAULT[method]; oilType = def.type; oilAmt = mode === 'deficit' ? (method === 'air' ? 'spray_l' : method === 'pan' ? 'tsp' : def.amt) : (d.oil || def.amt);
      if (mode === 'surplus' && method === 'pan') oilAmt = 'tbsp';
      let items = F.dishItems(d, v.id, v.cuts ? (mode === 'deficit' ? Object.keys(v.cuts).at(-1) : null) : null, 1);
      const rice = NO_RICE.includes(d.id) || BREAKFAST.includes(d.id) ? 0 : mode === 'deficit' ? 79 : mode === 'surplus' ? 237 : 158;
      if (rice) items = [...items, { id: mode === 'deficit' ? 'rice_brown' : 'rice_white', g: rice }];
      const m = F.buildMeal(items, method, oilType, oilAmt);
      const pd = m.totals.p / Math.max(1, m.totals.kcal);
      if (!best || (mode === 'deficit' ? pd > best.pd : mode === 'surplus' ? m.totals.kcal > best.t.kcal : pd > best.pd)) {
        const cut = v.cuts && mode === 'deficit' ? Object.keys(v.cuts).at(-1) : null;
        const riceTxt = rice ? ` + ${rice === 79 ? '½ cup brown rice' : rice === 237 ? '1½ cups rice' : '1 cup rice'}` : '';
        best = { pd, t: m.totals, items: m.items, method, oilType, oilAmt, name: (d.variants.length > 1 ? `${d.name} (${v.name.replace(/ \(.*\)/, '')}${cut ? ', ' + cut.toLowerCase() : ''})` : d.name) + riceTxt, how: method === 'air' && d.method !== 'air' ? 'air-fried instead of fried' : method === 'grill' ? 'grilled' : '', id: d.id };
      }
    }
    return { kind: 'catalog', dish: d.id, ...best, soup: SOUPS.includes(d.id), treat: TREATS.includes(d.id), breakfast: BREAKFAST.includes(d.id) };
  }
  function ingCand(id, g, mode) {
    const ing = F.ING[id], gg = g || (ing.pc ? ing.pc.g : 100), t = F.round(F.scale(ing.per100, gg));
    return { kind: 'catalog', name: ing.name + (ing.pc && gg === ing.pc.g ? '' : ` (${gg} g)`), t, items: [{ id, g: gg }], method: 'raw', oilType: 'none', oilAmt: null, snack: true, pd: t.p / Math.max(1, t.kcal) };
  }
  function shake() { const items = [{ id: 'milk', g: 300 }, { id: 'banana', g: 118 }, { id: 'peanut_butter', g: 32 }, { id: 'oats_rolled', g: 40 }]; const t = F.round(F.sumItems(items)); return { kind: 'catalog', name: 'Homemade shake (milk, banana, peanut butter, oats)', t, items, method: 'raw', oilType: 'none', oilAmt: null, snack: true, liquid: true, pd: t.p / t.kcal }; }
  function combo(name, items, tag) { const t = F.round(F.sumItems(items)); return { kind: 'catalog', name, t, items, method: 'raw', oilType: 'none', oilAmt: null, [tag]: true, pd: t.p / Math.max(1, t.kcal) }; }
  function combos() { return [
    combo('2 boiled eggs + 1 pandesal', [{ id: 'egg', g: 100 }, { id: 'pandesal', g: 30 }], 'breakfast'),
    combo('Greek yogurt + banana', [{ id: 'greek_yogurt', g: 170 }, { id: 'banana', g: 118 }], 'snack'),
    combo('Peanut butter toast (2 slices wheat)', [{ id: 'bread_wheat', g: 56 }, { id: 'peanut_butter', g: 32 }], 'snack'),
    combo('Tuna + 1 cup rice + cucumber', [{ id: 'tuna_can', g: 130 }, { id: 'rice_white', g: 158 }, { id: 'cucumber', g: 100 }], 'lunchish'),
    combo('Oatmeal with milk & banana', [{ id: 'oats_rolled', g: 40 }, { id: 'milk', g: 200 }, { id: 'banana', g: 118 }], 'breakfast')]; }
  function userCands() {
    const out = [];
    for (const m of S.myMeals || []) { const t = F.round(F.sumItems(m.items || [])); if (m.extra) for (const k of ['kcal', 'p', 'c', 'f', 'fib']) t[k] += m.extra[k] || 0; if (t.kcal) out.push({ kind: 'my', myId: m.id, name: m.name, t, mine: true, pd: t.p / t.kcal }); }
    const cutoff = iso(Date.now() - 30 * 864e5), cnt = {};
    for (const d of Object.keys(S.food)) if (d >= cutoff) for (const x of S.food[d]) { const k = x[0]; cnt[k] = cnt[k] || { n: 0, x }; cnt[k].n++; }
    Object.values(cnt).filter(c => c.n >= 2 && !out.some(o => o.name === c.x[0])).forEach(c => { const x = c.x; out.push({ kind: 'recent', name: x[0], t: { kcal: x[1], p: x[2], c: x[3] || 0, f: x[4] || 0, fib: x[5] || 0, sat: x[6]?.sat || 0 }, meta: x[6] || {}, mine: true, pd: x[2] / Math.max(1, x[1]) }); });
    return out;
  }
  function score(c, slot, budget, mode, pLeft) {
    const k = c.t.kcal, fit = 1 - Math.min(1.5, Math.abs(k - budget) / Math.max(150, budget));
    let s = fit * 3 + (c.mine ? 1.2 : 0);
    if (mode === 'deficit') { if (k > budget * 1.15 + 60) return -9; s += c.pd * 40 + (c.soup ? 0.8 : 0) + Math.min(1, (c.t.fib || 0) / 6) - (c.treat ? 3 : 0); }
    if (mode === 'surplus') { if (k < budget * 0.6) s -= 1.5; s += Math.min(1.5, k / 500) + (c.liquid ? 0.6 : 0) + (pLeft > 0 ? c.pd * 15 : 0); }
    if (mode === 'maintain') { if (k > budget * 1.3) return -9; s += c.pd * 25 - (c.treat ? 1 : 0); }
    if (slot === 'breakfast') s += c.breakfast ? 3 : c.snack ? -1 : -2.5;
    if (slot === 'snack') s += c.snack ? 1.5 : c.breakfast ? -1 : -2;
    if (slot === 'lunch' || slot === 'dinner') s += c.snack ? -2 : c.breakfast ? -0.5 : 0.5;
    return s;
  }
  function suggest() {
    const mode = goalMode(), r = remaining(), h = new Date().getHours();
    if (viewDate !== today()) return null;
    if (mode !== 'surplus' && r.kcal <= 60) return { mode, r, done: true, picks: [ingCand('green_tea', 240), ingCand('cucumber', 150), { ...dishCand(F.DISHES.find(d => d.id === 'ensaladang_talong'), mode), name: 'Ensaladang talong' }].map(c => ({ c, slot: 'If you\'re still hungry' })) };
    const slots = slotsLeft(h, mode), w = slots.map(s => SLOTS[s][2]), W = w.reduce((a, b) => a + b, 0);
    const pool = [...userCands(), ...F.DISHES.map(d => dishCand(d, mode)), ...SNACK_ING.map(id => ingCand(id, null, mode)), ...combos(), ...(mode === 'surplus' ? [shake()] : [])];
    const picks = [], used = new Set();
    slots.forEach((slot, i) => {
      const budget = Math.max(80, r.kcal * w[i] / W);
      const best = pool.filter(c => !used.has(c.name)).map(c => ({ c, s: score(c, slot, budget, mode, r.p) })).sort((a, b) => b.s - a.s)[0];
      if (best && best.s > -5) { used.add(best.c.name); picks.push({ c: best.c, slot: slot[0].toUpperCase() + slot.slice(1) }); }
    });
    return { mode, r, picks: picks.slice(0, h < 10 ? 4 : 3) };
  }

  function section() {
    const S2 = suggest(); if (!S2 || !S2.picks.length) return '';
    const { mode, r } = S2; window.__sg = S2.picks;
    const head = S2.done ? `You've reached today's target${r.kcal < 0 ? ` (${Math.abs(Math.round(r.kcal))} kcal over)` : ''}. If you're still hungry, these barely count:`
      : mode === 'surplus' ? `${Math.round(r.kcal).toLocaleString()} kcal and ${Math.max(0, Math.round(r.p))} g protein to go. Easy ways to get there:`
      : `${Math.round(r.kcal).toLocaleString()} kcal and ${Math.max(0, Math.round(r.p))} g protein left${mode === 'deficit' ? ' — filling, high-protein picks' : ''}:`;
    const late = mode === 'surplus' && new Date().getHours() >= 19 && r.kcal > 700 ? `<div class="t-caption" style="margin-top:4px">It's late and you're far from your target — liquid calories like a shake are the easiest way to close the gap.</div>` : '';
    return `<div class="hdr">Suggested for the rest of today</div><div class="t-caption" style="margin-bottom:var(--s1)">${head}</div>${late}
      <div class="plist">${S2.picks.map(({ c, slot }, i) => `<div class="li" style="cursor:pointer" onclick="sgOpen(${i})"><div style="flex:1;min-width:0"><small>${slot}${c.mine ? ' · yours' : ''}${c.how ? ' · ' + c.how : ''}</small><b>${esc(c.name)}</b><small class="num">${Math.round(c.t.kcal)} kcal · ${Math.round(c.t.p)} g protein</small></div><button class="pg-link" style="text-decoration:none;padding:8px 0 8px 12px" onclick="event.stopPropagation();sgLog(${i})">Log</button></div>`).join('')}</div>`;
  }
  window.sgLog = i => { const { c } = window.__sg[i];
    const meta = c.kind === 'my' ? { kind: 'my', myId: c.myId, sat: c.t.sat } : c.kind === 'recent' ? c.meta : { kind: 'custom', items: c.items, method: c.method, oilType: c.oilType, oilAmt: c.oilAmt, sat: c.t.sat, suggested: true };
    afLogItemsExt([{ name: c.name, totals: c.t, mult: 1, meta }]); };
  window.sgOpen = i => { const { c } = window.__sg[i];
    if (c.kind === 'my') { foodSheet(); afOpenMy(c.myId); return; }
    if (c.items) return afOpenBuilderWith(c.name, c.items.filter(x => !x.oil), c.method, c.oilType, c.oilAmt);
    sgLog(i); };
  const _m = V.meals; V.meals = () => { const h = _m(), sec = section(), k = '<div class="hdr">Logged'; return sec && h.includes(k) ? h.replace(k, sec + k) : h; };
  window.__suggest = suggest;
})();
