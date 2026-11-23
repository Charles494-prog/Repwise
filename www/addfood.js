// RepWise "Add food" flow: Catalog · My meals · My dishes · Recent · Plate. Every log goes through the plate.
// All macro math comes from foods.js (FOODDB). Entries are stored as
// [name, kcal, protein, carbs, fat, fiber, meta] so every existing screen keeps working.
(function () {
  const F = window.FOODDB;
  S.myDishes ??= []; S.myMeals ??= []; S.oilPref ??= {};
  const AF = { screen: 'search' };
  const r1 = v => Math.round(v * 10) / 10;
  const fmt = t => `P ${Math.round(t.p)} · C ${Math.round(t.c)} · F ${Math.round(t.f)} · fiber ${Math.round(t.fib)} g`;
  const haptic = () => { try { vib(10); } catch (e) {} };
  // "3 eggs" when the grams are whole pieces, otherwise "150 g"
  const unitOf = ing => (ing && ing.unit) || 'g';
  const amtLabel = (ing, g) => { const n = ing.pc && g / ing.pc.g; return n && Math.abs(n - Math.round(n)) < 0.01 ? `${Math.round(n)} ${ing.pc.label}${Math.round(n) !== 1 ? 's' : ''}` : `${r1(g)} ${unitOf(ing)}`; };
  const breaded = items => items.some(i => ['flour', 'breadcrumbs', 'wrapper', 'cornstarch'].includes(i.id));

  document.head.insertAdjacentHTML('beforeend', `<style>
  #sheet.af{height:92vh;max-height:92vh;height:min(92dvh,calc(100dvh - env(safe-area-inset-top) - 12px));max-height:calc(100dvh - env(safe-area-inset-top) - 12px);padding:8px 0 0;display:flex;flex-direction:column;overflow:hidden}
  #sheet.af .grab{margin:0 auto 8px}
  .afscr{flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;padding:0 var(--s2) calc(96px + env(safe-area-inset-bottom));animation:afIn .22s cubic-bezier(.2,.8,.2,1)}
  .afscr.back{animation:afBack .22s cubic-bezier(.2,.8,.2,1)}
    .afing.sw .del{display:block}
  @keyframes afIn{from{opacity:0;transform:translateX(24px)}to{opacity:1;transform:none}}
  @keyframes afBack{from{opacity:0;transform:translateX(-24px)}to{opacity:1;transform:none}}
  .afhead{display:flex;align-items:center;gap:var(--s1);min-height:36px;margin-bottom:var(--s1)}
  .afhead .t-label{flex:1}.afback{background:none;border:none;padding:6px;margin-left:-6px;color:var(--ink);cursor:pointer}.afback .ic{width:22px;height:22px}
  .afsearch{display:flex;align-items:center;gap:10px;background:var(--fill);border-radius:14px;padding:0 14px;height:52px}
  .afsearch input{flex:1;border:none!important;background:none!important;font-size:18px;font-weight:600;padding:0!important;margin:0!important;outline:none;box-shadow:none!important;color:var(--ink)}
  .afsearch .ic{width:20px;height:20px;color:var(--ink-2)}.afsearch label{display:flex;cursor:pointer;color:var(--ink)}
  .afgroup{font-size:var(--fs-label);font-weight:600;color:var(--ink-2);margin:var(--s3) 0 2px}
  .afli{display:flex;align-items:baseline;gap:var(--s2);padding:14px 0;border-bottom:1px solid var(--line);cursor:pointer}
  .afli:active{opacity:.55}.afli b{flex:1;min-width:0;overflow-wrap:anywhere;font-size:var(--fs-body);font-weight:600}.afli span{font-size:var(--fs-label);color:var(--ink-2);text-align:right;white-space:nowrap}
  .afli.create b{color:var(--ink);font-weight:700}
  .chips{display:flex;gap:8px;overflow-x:auto;padding:2px 0 4px;margin:0 calc(-1 * var(--s2));padding-left:var(--s2);padding-right:var(--s2);scrollbar-width:none}
  .chips::-webkit-scrollbar{display:none}
  .chips button{flex:none;border:1px solid var(--line);background:var(--surface);color:var(--ink);border-radius:var(--r-pill);padding:8px 14px;font-size:var(--fs-label);font-weight:600;cursor:pointer;white-space:nowrap}
  .chips button.on{background:var(--ink);border-color:var(--ink);color:var(--surface)}
  .afrow{display:flex;align-items:center;justify-content:space-between;gap:var(--s2);padding:14px 0;border-bottom:1px solid var(--line);font-size:var(--fs-body)}
  .afrow>span:first-child{font-weight:600}.afrow .v{color:var(--ink-2);font-weight:500}
  .afrow input{border:none!important;background:none!important;text-align:right;font-size:var(--fs-body);font-weight:600;width:110px;padding:0!important;margin:0!important;box-shadow:none!important;outline:none;color:var(--ink)}
  .afstep{display:flex;align-items:center;gap:var(--s2)}.afstep button{width:34px;height:34px;border-radius:50%;border:1px solid var(--line);background:var(--surface);font-size:18px;font-weight:700;color:var(--ink);cursor:pointer}
  .afstep b{min-width:28px;text-align:center;font-variant-numeric:tabular-nums}
  .afsec{font-size:var(--fs-label);font-weight:600;color:var(--ink-2);margin:var(--s3) 0 var(--s1)}
  .afhero{text-align:center;margin:var(--s2) 0 var(--s1)}
  .afsticky{position:sticky;top:-1px;background:var(--surface);z-index:2;padding:var(--s1) 0 var(--s2);border-bottom:1px solid var(--line);margin-bottom:var(--s1)}
  .afbar{position:absolute;left:0;right:0;bottom:0;padding:var(--s2) var(--s2) calc(var(--s2) + env(safe-area-inset-bottom));background:linear-gradient(transparent,var(--surface) 30%)}
  .aflink{background:none;border:none;color:var(--ink);font-weight:600;font-size:var(--fs-label);padding:10px 0;cursor:pointer;text-decoration:underline;text-underline-offset:3px}
  .afchg{display:inline;padding:0;margin:0;font-size:12px;text-decoration:underline}.afing{position:relative;overflow:hidden;border-bottom:1px solid var(--line)}
  .afing .row2{position:relative;z-index:1;display:flex;align-items:center;gap:var(--s2);padding:14px 0;background:var(--surface);transition:transform .2s}
  .afing .row2 b{flex:1;font-weight:600}.afing .gbtn{border:none;background:var(--fill);border-radius:var(--r-pill);padding:6px 12px;font-weight:600;font-size:var(--fs-label);color:var(--ink);font-variant-numeric:tabular-nums}
  .afing .afkc{width:64px;text-align:right;color:var(--ink-2);font-size:var(--fs-label);font-variant-numeric:tabular-nums}
  .afing .del{display:none;position:absolute;right:0;top:0;height:52px;width:88px;background:var(--accent);color:var(--on-accent);border:none;font-weight:700}
  .afedit{padding:0 0 14px}.afedit .chips{margin-top:var(--s1)}
  .afnote{font-size:13px;color:var(--ink-2);margin-top:6px;line-height:1.4}
  .afacts{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:var(--s2)}.afacts button{display:flex;flex-direction:column;align-items:flex-start;gap:4px;text-align:left;border:1.5px solid var(--line);background:var(--surface);border-radius:16px;padding:14px;cursor:pointer;color:var(--ink)}
  .afacts button:active{background:var(--fill)}.afacts b{font-size:16px}.afacts small{font-size:12px;color:var(--ink-2);line-height:1.3}.afacts .ai{width:36px;height:36px;border-radius:12px;background:var(--accent-soft);color:var(--accent);display:grid;place-items:center;margin-bottom:4px}.afacts .ai .ic{width:20px;height:20px}
  .afcats{flex-wrap:wrap;margin:0;padding:0}.afcats button{margin:0}
  .afempty{display:flex;flex-direction:column;align-items:center;text-align:center;gap:6px;padding:var(--s4) var(--s2);color:var(--ink-2);font-size:14px}.afempty .ic{width:32px;height:32px;color:var(--ink-3)}.afempty b{color:var(--ink);font-size:15px}
  .afbrowse-h{display:flex;align-items:center;gap:var(--s1);margin:var(--s2) 0 var(--s1)}.afbrowse-h b{flex:1;font-size:17px}
  .afact{display:flex;gap:4px;flex:none}.afact button{width:34px;height:34px;border-radius:50%;border:1px solid var(--line);background:var(--surface);color:var(--ink-2);display:grid;place-items:center;cursor:pointer;font-size:14px}.afact button.on{background:var(--ink);color:var(--surface);border-color:var(--ink)}.afact .ic{width:16px;height:16px}
  .afing .afkc{width:44px}
  </style>`);
  document.head.insertAdjacentHTML('beforeend', `<style>
  .afsrc{font-size:var(--fs-caption);color:var(--ink-3);font-weight:500;margin-left:6px}
  .afstar{background:none;border:none;padding:4px 0 4px 10px;color:var(--ink-3);cursor:pointer;line-height:0}.afstar.on{color:var(--ink)}
  .afstar svg{width:20px;height:20px}
  .afli .nm{flex:1;min-width:0;overflow-wrap:anywhere}.afli .nm b{display:block}.afli .nm small{font-size:var(--fs-caption);color:var(--ink-2)}
  .plbar{position:absolute;left:0;right:0;bottom:0;display:flex;align-items:center;gap:var(--s2);padding:12px var(--s2) calc(12px + env(safe-area-inset-bottom));background:var(--ink);color:var(--surface);cursor:pointer}
  .plbar .t{flex:1}.plbar .t b{display:block;font-size:var(--fs-body)}.plbar .t small{opacity:.7;font-size:var(--fs-caption)}
  .plbar button{background:var(--surface);color:var(--ink);border:none;border-radius:var(--r-pill);padding:10px 18px;font-weight:700}
  .afprim{display:flex;gap:var(--s2);align-items:center}.afprim .btn{flex:1}
  .afprim2{display:flex;gap:10px;align-items:stretch}.afprim2 .btn{flex:1}
  .afplus{position:relative;flex:none;width:58px;border-radius:16px;border:1.5px solid var(--line);background:var(--surface);color:var(--ink);display:flex;align-items:center;justify-content:center;cursor:pointer}
  .afplus svg{width:26px;height:26px}.afplus b{position:absolute;left:9px;top:5px;font-size:16px;line-height:1}
  .afplus i{position:absolute;top:-6px;right:-6px;min-width:20px;height:20px;border-radius:10px;background:var(--accent);color:var(--on-accent);font-style:normal;font-size:12px;font-weight:800;display:flex;align-items:center;justify-content:center;padding:0 5px}
  .afplnote{display:block;width:100%;background:var(--fill);border:none;border-radius:12px;padding:8px 12px;margin-bottom:8px;text-align:left;font-weight:600;font-size:var(--fs-label);color:var(--ink);cursor:pointer}
  .afmiss{background:var(--fill);border-radius:10px}
  .afmiss input::placeholder{color:var(--accent)}
  .afgrid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:var(--s1)}
  .affield{display:flex;flex-direction:column;gap:4px;margin-top:var(--s1)}.afgrid .affield{margin-top:0}.affield.full{grid-column:1/-1}
  .affield>span:first-child{font-size:var(--fs-label);font-weight:600;color:var(--ink-2)}
  .affield .in{display:flex;align-items:center;gap:6px;border:1.5px solid var(--line);border-radius:12px;background:var(--surface);padding:0 12px;height:48px;cursor:text}
  .affield .in:focus-within{border-color:var(--ink)}.affield.miss .in{border-color:var(--accent);background:var(--accent-soft)}
  .affield .in input{flex:1;min-width:0;border:none!important;background:none!important;font-size:17px;font-weight:600;padding:0!important;margin:0!important;outline:none;box-shadow:none!important;color:var(--ink)}
  .affield .in em{font-style:normal;color:var(--ink-3);font-size:14px;font-weight:600}
  .afseg{display:flex;background:var(--fill);border-radius:var(--r-pill);padding:3px;margin-top:var(--s1)}.afseg button{flex:1;border:none;background:none;border-radius:var(--r-pill);padding:8px 0;font-weight:600;color:var(--ink-2);cursor:pointer}.afseg button.on{background:var(--surface);color:var(--ink);box-shadow:0 1px 3px var(--shadow-c)}
  .afmore{margin-top:var(--s2);border-top:1px solid var(--line);padding-top:var(--s1)}.afmore summary{font-weight:700;cursor:pointer;padding:8px 0}
  .afwarn{background:color-mix(in srgb,var(--warn) 14%,var(--surface));color:var(--warn);border-radius:10px;padding:8px 10px}
  .afmicro{display:grid;grid-template-columns:1fr 1fr;gap:6px 12px;margin-top:var(--s1)}.afmicro div{display:flex;justify-content:space-between;font-size:14px;border-bottom:1px solid var(--line);padding:6px 0}.afmicro b{font-variant-numeric:tabular-nums}
  </style>`);

  // ---------- favorites / my meals storage ----------
  S.favs ??= []; S.dontAsk ??= [];
  S.myDishes.forEach((m, i) => { m.id ??= 'm' + Date.now().toString(36) + i; });
  const isFav = k => S.favs.includes(k);
  window.afFav = (k, ev) => { if (ev) ev.stopPropagation(); S.favs = isFav(k) ? S.favs.filter(x => x !== k) : [...S.favs, k]; save(); haptic(); const b = ev && ev.currentTarget; if (b) { b.classList.toggle('on', isFav(k)); b.innerHTML = starSvg(isFav(k)); } else show(); };
  const starSvg = on => `<svg viewBox="0 0 24 24" fill="${on ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/></svg>`;
  const star = k => `<button class="afstar${isFav(k) ? ' on' : ''}" aria-label="Favorite" onclick="afFav('${k}',event)">${starSvg(isFav(k))}</button>`;
  const myById = id => S.myDishes.find(m => m.id === id);
  const EMPTY = { kcal: null, p: null, c: null, f: null, fib: null };
  // My meal totals = ingredients + manual "extra" (fields may be null = missing)
  function myTotals(m) { const t = F.round(F.sumItems(m.items || [])), x = m.extra || {}; const o = {}; for (const k of ['kcal', 'p', 'c', 'f', 'sat', 'fib']) o[k] = (t[k] || 0) + (x[k] || 0); return o; }
  const missingOf = m => { const x = m.extra; if (!x) return []; return ['p', 'c', 'f', 'fib'].filter(k => x[k] == null).map(k => ({ p: 'protein', c: 'carbs', f: 'fat', fib: 'fiber' })[k]); };
  const newId = () => 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

  // ---------- custom ingredients (S.myIngredients) ----------
  // Saved as entered (per 100 g/ml or per serving); registered into F.ING as per-100 values. Blank = unknown (null), not 0.
  S.myIngredients ??= [];
  const MACRO_X = [['sugar', 'Sugar', 'g']];
  const MICROS = [['na', 'Sodium', 'mg'], ['k', 'Potassium', 'mg'], ['chol', 'Cholesterol', 'mg'], ['ca', 'Calcium', 'mg'], ['fe', 'Iron', 'mg'], ['mg', 'Magnesium', 'mg'], ['zn', 'Zinc', 'mg'], ['va', 'Vitamin A', 'µg'], ['vc', 'Vitamin C', 'mg'], ['vd', 'Vitamin D', 'µg'], ['ve', 'Vitamin E', 'mg'], ['vk', 'Vitamin K', 'µg'], ['b6', 'Vitamin B6', 'mg'], ['b12', 'Vitamin B12', 'µg'], ['fol', 'Folate', 'µg']];
  const NUT_KEYS = ['kcal', 'p', 'c', 'f', 'sat', 'fib', 'sugar', ...MICROS.map(x => x[0])];
  const blank = v => v == null || v === '' || Number.isNaN(+v);
  function regIng(m) { const k = m.ref === 'serving' && m.size > 0 ? 100 / m.size : 1, per = {}; for (const key of NUT_KEYS) per[key] = blank(m.vals?.[key]) ? null : +m.vals[key] * k;
    F.ING['my_' + m.id] = { id: 'my_' + m.id, name: m.name, alt: 'my ingredient custom ' + m.name, group: 'mine', per100: per, src: 'My ingredient', scan: !!m.barcode, pc: m.ref === 'serving' && m.size > 0 ? { g: m.size, label: 'serving' } : null, unit: m.unit || 'g', mine: m.id }; }
  S.myIngredients.forEach(regIng);
  // Extra nutrients (sugar + micronutrients) for a list of items; partial = some ingredients have no data for it.
  function nutrientList(items) { const out = [];
    for (const [k, l, u] of [...MACRO_X, ...MICROS]) { let v = 0, known = 0, missing = 0; for (const it of items) { if (it.oil) continue; const ing = F.ING[it.id]; if (!ing) continue; const x = ing.per100[k]; if (x == null) missing++; else { known++; v += x * it.g / 100; } }
      if (known) out.push({ k, l, u, v: v >= 10 ? Math.round(v) : r1(v), partial: missing > 0 }); }
    return out; }
  const nutrientBlock = items => { const L = nutrientList(items); if (!L.length) return '';
    return `<div class="afsec">Sugar, vitamins & minerals</div><div class="afmicro">${L.map(x => `<div><span>${x.l}</span><b>${x.partial ? '≥ ' : ''}${x.v} ${x.u}</b></div>`).join('')}</div>${L.some(x => x.partial) ? '<div class="afnote">≥ means some ingredients have no data for it, so the real amount is at least this.</div>' : ''}`; };
  const fld = (k, label, unit, val, cls = '', on = 'AF_ci') => `<label class="affield ${cls}"><span>${label}</span><span class="in"><input type="number" inputmode="decimal" value="${val ?? ''}" placeholder="—" oninput="${on}('${k}',this.value)">${unit ? `<em>${unit}</em>` : ''}</span></label>`;
  function ciWarn() { const v = AF.ci.vals, kcal = +v.kcal || 0, have = ['p', 'c', 'f'].filter(k => !blank(v[k])); if (!kcal || !have.length) return '';
    const est = 4 * (+v.p || 0) + 4 * (+v.c || 0) + 9 * (+v.f || 0);
    if (est > kcal * 1.25 + 20) return `<div class="afwarn">Protein, carbs and fat add up to about ${Math.round(est)} kcal — more than the ${kcal} kcal you entered. Worth a double-check (you can still save).</div>`;
    if (have.length === 3 && est < kcal * 0.6 - 20) return `<div class="afwarn">Protein, carbs and fat only add up to about ${Math.round(est)} kcal of the ${kcal} kcal you entered. Worth a double-check (you can still save).</div>`;
    return ''; }
  window.afNewIng = (name, ret) => { AF.ci = { id: null, name: (name || '').trim(), ref: '100g', size: null, unit: 'g', vals: {}, ret: ret || AF.screen }; go('mying'); };
  // Pre-filled form from a barcode / label scan (aifood.js): the user reviews, then saves (barcode kept for next time).
  window.afPrefillIng = rec => { AF.ci = { id: null, name: rec.name || '', ref: rec.ref || '100g', size: rec.size || null, unit: 'g', vals: { ...(rec.vals || {}) }, barcode: rec.barcode || null, ret: 'search' }; go('mying'); };
  window.afEditIng = id => { const m = S.myIngredients.find(x => x.id === id); AF.ci = { ...JSON.parse(JSON.stringify(m)), ret: 'item' }; go('mying'); };
  window.AF_ci = (k, v) => { if (k === 'size') AF.ci.size = blank(v) ? null : +v; else AF.ci.vals[k] = blank(v) ? null : +v; const w = $('#ciwarn'); if (w) w.innerHTML = ciWarn(); };
  window.AF_ciSet = (k, v) => { AF.ci[k] = v; show(); };
  function scrMyIng() { const c = AF.ci, v = c.vals, per = c.ref === 'serving' ? `one serving${c.size ? ` (${c.size} ${c.unit})` : ''}` : `100 ${c.unit}`;
    const back = c.ret === 'ing' ? 'ing' : c.ret === 'item' ? 'item' : 'search';
    return `${head(c.id ? 'Edit ingredient' : 'Custom ingredient', `afBack('${back}')`)}
    <label class="affield full"><span>Name</span><span class="in"><input id="ciname" value="${esc(c.name)}" placeholder="e.g. Mom's pandesal" oninput="AF.ci.name=this.value"></span></label>
    <div class="afsec">Nutrition label is for</div><div class="afseg">${[['100g', `100 ${c.unit}`], ['serving', 'One serving']].map(([k, l]) => `<button class="${c.ref === k ? 'on' : ''}" onclick="AF_ciSet('ref','${k}')">${l}</button>`).join('')}</div>
    <div class="afgrid">${c.ref === 'serving' ? fld('size', 'Serving size', c.unit, c.size) : ''}<div class="affield${c.ref === 'serving' ? '' : ' full'}"><span>Measured in</span><div class="afseg" style="margin:0">${['g', 'ml'].map(u => `<button class="${c.unit === u ? 'on' : ''}" onclick="AF_ciSet('unit','${u}')">${u}</button>`).join('')}</div></div></div>
    <div class="afsec">Per ${per}</div><div class="afgrid">${fld('kcal', 'Calories *', 'kcal', v.kcal, 'full')}${fld('p', 'Protein', 'g', v.p)}${fld('c', 'Carbs', 'g', v.c)}${fld('f', 'Fat', 'g', v.f)}${fld('sat', 'Saturated fat', 'g', v.sat)}${fld('fib', 'Fibre', 'g', v.fib)}${fld('sugar', 'Sugar', 'g', v.sugar)}</div>
    <div id="ciwarn" style="margin-top:var(--s1)">${ciWarn()}</div>
    <details class="afmore"${MICROS.some(([k]) => !blank(v[k])) ? ' open' : ''}><summary>Vitamins & minerals (optional)</summary><div class="afgrid">${MICROS.map(([k, l, u]) => fld(k, l, u, v[k])).join('')}</div></details>
    <div class="afnote">Only the name and calories are needed. Leave anything you don't know blank — blank means unknown, not zero.</div>
    <div class="afbar"><div class="afprim"><button class="btn" onclick="afSaveIng()">${c.id ? 'Save changes' : 'Save ingredient'}</button></div></div>`; }
  window.afSaveIng = () => { const c = AF.ci, name = (c.name || '').trim();
    if (!name) return toast('Give your ingredient a name'); if (blank(c.vals.kcal)) return toast('Enter the calories'); if (c.ref === 'serving' && !(c.size > 0)) return toast('Enter the serving size');
    const rec = { id: c.id || newId(), name, ref: c.ref, size: c.ref === 'serving' ? c.size : null, unit: c.unit, vals: { ...c.vals }, ...(c.barcode ? { barcode: String(c.barcode) } : {}) };
    if (c.id) Object.assign(S.myIngredients.find(x => x.id === c.id), rec); else S.myIngredients.push(rec);
    regIng(rec); save(); haptic(); toast(c.id ? 'Ingredient saved' : `Saved “${esc(name)}” to My ingredients`);
    if (c.ret === 'ing') return afPickIng('my_' + rec.id); afOpenIng('my_' + rec.id); };
  window.afDupIng = id => { const m = S.myIngredients.find(x => x.id === id), c = JSON.parse(JSON.stringify(m)); c.id = newId(); c.name = m.name + ' (copy)'; S.myIngredients.push(c); regIng(c); save(); toast('Duplicated'); afOpenIng('my_' + c.id); };
  window.afDelIng = id => { const m = S.myIngredients.find(x => x.id === id), used = S.myDishes.filter(x => (x.items || []).some(i => i.id === 'my_' + id)).length;
    if (!confirm(`Delete “${m.name}” from My ingredients?${used ? `\n\nIt's used in ${used} saved meal${used > 1 ? 's' : ''}; those meals will no longer count it.` : ''}\n\nPast logs aren't affected.`)) return;
    S.myIngredients = S.myIngredients.filter(x => x.id !== id); delete F.ING['my_' + id]; S.favs = S.favs.filter(k => k !== 'ing:my_' + id); save(); toast('Deleted'); AF.q = ''; go('search', 'back'); };

  // ---------- plate ----------
  AF.plate ??= [];
  const plateTotals = () => AF.plate.reduce((t, it) => F.add(t, F.mul(it.totals, it.mult)), F.round(F.sumItems([])));
  function addToPlate(item) { AF.plate.push({ mult: 1, ...item }); haptic(); toast(`On the plate (${AF.plate.length}) — add more, then tap Log`); AF.q = ''; go('search', 'back'); }

  // ---------- index ----------
  function index() {
    const out = [];
    for (const m of S.myMeals) { const its = mealPlate(m); out.push({ type: 'meal', key: 'meal:' + m.id, id: m.id, name: m.name, alt: 'my meal ' + its.map(i => i.name).join(' '), kcal: Math.round(its.reduce((k, i) => k + i.totals.kcal * i.mult, 0)), serving: `${m.items.length} item${m.items.length === 1 ? '' : 's'}`, src: 'My meal' }); }
    for (const m of S.myDishes) { const t = myTotals(m); out.push({ type: 'my', key: 'my:' + m.id, id: m.id, name: m.name, alt: 'my dish', kcal: Math.round(t.kcal), serving: '1 serving', src: 'My dish', incomplete: missingOf(m).length > 0 }); }
    for (const d of F.DISHES) { const o = dishDefaults(d), t = dishTotals(d, d.variants[0].id, null, 1, o).totals;
      out.push({ type: 'dish', key: 'dish:' + d.id, id: d.id, name: d.name, alt: d.alt + ' ' + d.variants.map(v => v.name + ' ' + v.alt).join(' '), kcal: t.kcal, serving: d.serving, src: 'Catalog' }); }
    for (const ing of Object.values(F.ING)) { const g = ing.pc ? ing.pc.g : 100;
      out.push({ type: 'ing', key: 'ing:' + ing.id, id: ing.id, name: ing.name, alt: ing.alt, group: ing.group, kcal: Math.round(ing.per100.kcal * g / 100), serving: ing.pc ? `1 ${ing.pc.label}${ing.mine ? ` (${r1(ing.pc.g)} ${unitOf(ing)})` : ''}` : `100 ${unitOf(ing)}`, src: ing.mine ? 'My ingredient' : 'Catalog' }); }
    return out;
  }
  function row(e, label) {
    const open = e.type === 'meal' ? `afOpenMeal('${e.id}')` : e.type === 'dish' ? `afOpenDish('${e.id}')` : e.type === 'my' ? `afOpenMy('${e.id}')` : e.type === 'recent' ? `afRelog(${e.i})` : `afOpenIng('${e.id}')`;
    return `<div class="afli" style="align-items:center" onclick="${open}"><div class="nm"><b>${escT(e.name)}${label ? `<span class="afsrc">${e.src}</span>` : ''}</b><small>${e.kcal} kcal · ${e.serving}${e.incomplete ? ' · incomplete' : ''}</small></div>${e.key ? star(e.key) : ''}</div>`;
  }

  // ---------- render ----------
  function show(dir) {
    const sh = $('#sheet'); sh.classList.add('af');
    const html = ({ search: scrSearch, dish: scrDish, builder: scrBuilder, ing: scrIng, item: scrItem, my: scrMy, plate: scrPlate, mying: scrMyIng, meal: scrMeal, mealed: scrMealEd, mealpick: scrMealPick })[AF.screen]();
    const k = html.indexOf('<div class="afbar">'), body = k >= 0 ? html.slice(0, k) : html;
    let bar = k >= 0 ? html.slice(k) : '';
    if (AF.screen === 'search' && AF.plate.length) { const t = plateTotals(); bar = `<div class="plbar" onclick="afGo('plate')"><div class="t"><b>Plate · ${AF.plate.length} item${AF.plate.length > 1 ? 's' : ''} · ${Math.round(t.kcal)} kcal</b><small>Tap to review</small></div><button onclick="event.stopPropagation();afLogPlate()">Log</button></div>`; }
    sh.innerHTML = `<div class="grab"></div><div class="afscr${dir === 'back' ? ' back' : ''}">${body}</div>${bar}`;
    if (AF.screen === 'search' || AF.screen === 'ing' || AF.screen === 'mealpick') { const i = $('#afq'); i.value = AF.q || ''; afSearch(i.value); if (!AF.plate.length || AF.screen === 'ing') setTimeout(() => i.focus(), 60); }
  }
  const go = (s, dir) => { AF.screen = s; show(dir); };
  window.afGo = s => go(s);
  const backIc = () => ic('aup').replace('<svg', '<svg style="transform:rotate(-90deg)"');
  const head = (title, back, extra = '') => `<div class="afhead">${back ? `<button class="afback" aria-label="Back" onclick="${back}">${backIc()}</button>` : ''}<span class="t-label">${title}</span>${extra}<button class="afback" aria-label="Close" onclick="closeSheet()">${ic('x')}</button></div>`;

  // ---------- search ----------
  function scrSearch() {
    return `${head('Add food', null)}
    <div class="afsearch">${ic('search')}<input id="afq" placeholder="Search food, dishes or my meals" autocomplete="off" oninput="afSearch(this.value)"></div>
    ${window.aiFoodBar ? aiFoodBar() : ''}
    <div id="afres"></div>`;
  }
  function recentList() {
    const seen = new Set(), out = [];
    for (const d of Object.keys(S.food).sort().reverse()) for (const x of [...S.food[d]].reverse()) { if (seen.has(x[0]) || out.length >= 8) continue; seen.add(x[0]); out.push(x); }
    AF.recent = out; return out.map((x, i) => ({ type: 'recent', i, name: x[0], kcal: x[1], serving: 'last logged', src: 'Recent' }));
  }
  const BROWSE = [['dish', 'Filipino dishes'], ['meat', 'Meat & fish'], ['veg', 'Vegetables'], ['fruit', 'Fruit'], ['carb', 'Rice & carbs'], ['oil', 'Oils & sauces'], ['other', 'Other']];
  window.afBrowse = g => { AF.browse = g; afSearch(''); const sc = document.querySelector('.afscr'); if (sc) sc.scrollTop = 0; };
  window.afSearch = q => { if (q && q.trim()) AF.browse = null;
    AF.q = q; const box = $('#afres'); if (!box) return;
    if (AF.screen === 'ing') {
      const all = index().filter(e => e.type === 'ing');
      const mk = `<div class="afli create" onclick="afNewIng(AF.q,'ing')"><b>${q.trim() ? `Create ingredient “${esc(q.trim())}”` : 'New custom ingredient'}</b><span>${ic('plus')}</span></div>`;
      if (!q.trim()) { const G = [['mine', 'My ingredients'], ['meat', 'Meat & fish'], ['veg', 'Vegetables'], ['fruit', 'Fruit'], ['carb', 'Rice & carbs'], ['oil', 'Oils & sauces'], ['other', 'Other']];
        box.innerHTML = mk + G.filter(([g]) => all.some(e => e.group === g)).map(([g, l]) => `<div class="afgroup">${l}</div>${all.filter(e => e.group === g).map(e => `<div class="afli" onclick="afPickIng('${e.id}')"><b>${escT(e.name)}</b><span>${e.kcal} kcal · ${e.serving}</span></div>`).join('')}`).join(''); return; }
      const res = F.search(q, all).slice(0, 30);
      box.innerHTML = (res.map(e => `<div class="afli" onclick="afPickIng('${e.id}')"><b>${escT(e.name)}${e.src === 'My ingredient' ? '<span class="afsrc">My ingredient</span>' : ''}</b><span>${e.kcal} kcal · ${e.serving}</span></div>`).join('') || `<div class="afnote" style="padding:14px 0">No ingredient matches “${esc(q)}”.</div>`) + mk;
      return;
    }
    const all = index(), rec = recentList();
    if (!q.trim()) {
      const favs = all.filter(e => isFav(e.key)), meals = all.filter(e => e.type === 'meal'), mine = all.filter(e => e.type === 'my'), myIng = all.filter(e => e.src === 'My ingredient');
      // Start screen: two clear actions, browse by category, then your own foods.
      if (AF.browse) { const B = BROWSE.find(b => b[0] === AF.browse), list = AF.browse === 'dish' ? all.filter(e => e.type === 'dish') : all.filter(e => e.type === 'ing' && e.group === AF.browse);
        box.innerHTML = `<div class="afbrowse-h"><button class="aflink" style="text-decoration:none" onclick="afBrowse(null)">‹ All</button><b>${B[1]}</b><span class="t-caption">${list.length}</span></div>${list.sort((a, b) => a.name.localeCompare(b.name)).map(e => row(e)).join('')}`; return; }
      box.innerHTML = `<div class="afacts"><button onclick="afNewIng('','search')"><span class="ai">${ic('plus')}</span><b>Custom ingredient</b><small>Add one from its nutrition label</small></button><button onclick="afCreate('')"><span class="ai">${ic('clip')}</span><b>Create dish</b><small>A recipe from ingredients, e.g. adobo</small></button><button onclick="afNewMeal('')"><span class="ai">${ic('plus')}</span><b>Create meal</b><small>Dishes & foods you eat together</small></button></div>
        <div class="afgroup">Browse</div><div class="chips afcats">${BROWSE.map(([k, l]) => `<button onclick="afBrowse('${k}')">${l}</button>`).join('')}</div>`
        + (favs.length ? `<div class="afgroup">Favorites</div>${favs.map(e => row(e, true)).join('')}` : '')
        + (meals.length ? `<div class="afgroup">My meals</div>${meals.map(e => row(e)).join('')}` : '')
        + (mine.length ? `<div class="afgroup">My dishes</div>${mine.map(e => row(e)).join('')}` : '')
        + (myIng.length ? `<div class="afgroup">My ingredients</div>${myIng.map(e => row(e)).join('')}` : '')
        + (rec.length ? `<div class="afgroup">Recent</div>${rec.map(e => row(e)).join('')}` : '')
        + (!favs.length && !mine.length && !meals.length && !rec.length ? `<div class="afempty">${ic('search')}<b>Search 50+ Filipino dishes and 130 ingredients</b><span>or browse above. Tap ☆ on anything you eat often and it shows up here.</span></div>` : '');
      return;
    }
    let res = F.search(q, [...all, ...rec]);
    const rank = e => (e.type === 'meal' || e.type === 'my' || e.src === 'My ingredient' ? 2 : 0) + (isFav(e.key) ? 1 : 0);
    res = res.map((e, i) => ({ e, i })).sort((a, b) => rank(b.e) - rank(a.e) || a.i - b.i).map(x => x.e).slice(0, 30);
    box.innerHTML = res.map(e => row(e, true)).join('') + `<div class="afli create" onclick="afNewIng(AF.q,'search')"><b>Create ingredient “${esc(q.trim())}”</b><span>${ic('plus')}</span></div><div class="afli create" onclick="afCreate(AF.q)"><b>Create dish “${esc(q.trim())}”</b><span>${ic('plus')}</span></div><div class="afli create" onclick="afNewMeal(AF.q)"><b>Create meal “${esc(q.trim())}”</b><span>${ic('plus')}</span></div>`;
  };

  // ---------- dish (catalog) ----------
  function dishDefaults(d) { const m = d.method, pref = S.oilPref[m], def = F.METHOD_DEFAULT[m]; return { method: m, oilType: pref ? pref.type : def.type, oilAmt: pref ? pref.amt : (d.oil || def.amt) }; }
  function dishTotals(d, v, cut, n, o) { const items = F.dishItems(d, v, cut, n); return F.buildMeal(items, o.method, o.oilType, o.oilAmt, { breaded: breaded(items) }); }
  window.afOpenDish = (id, preset) => { const d = F.DISHES.find(x => x.id === id); AF.d = d; Object.assign(AF, { v: d.variants[0].id, cut: null, n: 1, override: null, manual: false }, dishDefaults(d), preset || {}); go('dish'); };
  function current() {
    const items = AF.screen === 'dish' ? F.dishItems(AF.d, AF.v, AF.cut, AF.n) : AF.items;
    const meal = F.buildMeal(items, AF.method, AF.oilType, AF.oilAmt, { breaded: breaded(items), g: AF.oilG });
    if (AF.manual && AF.override) { const o = AF.override, t = {}; for (const k of ['kcal', 'p', 'c', 'f', 'sat', 'fib']) t[k] = o[k] ?? 0; return { meal, totals: t }; }
    if (AF.extra) { const t = { ...meal.totals }; for (const k of ['kcal', 'p', 'c', 'f', 'sat', 'fib']) t[k] = (t[k] || 0) + (AF.extra[k] || 0); return { meal, totals: t }; }
    return { meal, totals: meal.totals };
  }
  function refreshTotals() { const t = current().totals, k = $('#afk'), m = $('#afm'); if (k) k.textContent = Math.round(t.kcal); if (m) m.textContent = fmt(t); document.querySelectorAll('[data-kc]').forEach(b => b.textContent = b.dataset.kc.replace('#', Math.round(t.kcal))); }
  const heroBlock = (t, sub) => `<div class="afhero"><div class="t-display num" id="afk">${Math.round(t.kcal)}</div><div class="t-label muted">kcal${sub ? ' · ' + sub : ''}</div><div class="t-caption num" id="afm" style="margin-top:6px">${fmt(t)}</div></div>`;
  const fatLine = t => t.f > 0 ? `<div class="afnote">Fat ${r1(t.f)} g · saturated ${r1(t.sat)} g · unsaturated ${r1(Math.max(0, t.f - t.sat))} g</div>` : '';
  const primary = (t, label, fn, second) => `<div class="afbar"><div class="afprim"><button class="btn" data-kc="${label} · # kcal" onclick="${fn}">${label} · ${Math.round(t.kcal)} kcal</button>${second || ''}</div></div>`;
  // Log flow: one clear action (Log) plus a small plate button for building multi-item meals.
  // The plate count shows on the button; when something is already on the plate, a line links to it.
  const plateIc = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="13" r="7.5"/><circle cx="12" cy="13" r="4"/></svg>`;
  const logBar = (t, logFn, plateFn, label = 'Log') => `<div class="afbar">${AF.plate.length ? `<button class="afplnote" onclick="afGo('plate')">Plate: ${AF.plate.length} item${AF.plate.length > 1 ? 's' : ''} waiting · ${Math.round(plateTotals().kcal)} kcal ›</button>` : ''}<div class="afprim2"><button class="btn" data-kc="${label} · # kcal" onclick="${logFn}">${label} · ${Math.round(t.kcal)} kcal</button>${plateFn ? `<button class="afplus" aria-label="Add to plate" title="Add to plate" onclick="${plateFn}"><b>+</b>${plateIc}${AF.plate.length ? `<i>${AF.plate.length}</i>` : ''}</button>` : ''}</div></div>`;
  const infoBtn = msg => `<button class="pg-i" aria-label="Info" onclick="afInfo('${msg}')">i</button>`;
  window.afInfo = k => { const T = { recipe: ['About this dish', 'Calories come from a typical home recipe (grams of each ingredient per serving) using USDA FoodData Central values. Filipino ingredients use the closest USDA equivalent until FNRI PhilFCT values are added. Restaurant and carinderia portions can be bigger and oilier — use Adjust ingredients to match yours.'] }[k]; const keep = AF.screen; openSheet(`<h3 class="t-title">${T[0]}</h3><p class="t-body" style="margin:var(--s2) 0">${T[1]}</p><button class="btn sec2" onclick="closeSheet();setTimeout(()=>{$('#sheet').classList.add('show');$('#sheetbg').classList.add('show');AF.screen='${keep}';AF_show()},420)">Back</button>`); };
  function scrDish() {
    const d = AF.d, v = d.variants.find(x => x.id === AF.v) || d.variants[0], { totals: t } = current();
    const md = AF.mealDish;
    return `${head(d.name, md ? (md.idx == null ? "AF.mealDish=null;afBack('mealpick')" : "AF.mealDish=null;afBack('mealed')") : "afBack('search')", star('dish:' + d.id) + infoBtn('recipe'))}
    ${d.variants.length > 1 ? `<div class="chips">${d.variants.map(x => `<button class="${x.id === v.id ? 'on' : ''}" onclick="afVar('${x.id}')">${x.name}</button>`).join('')}</div>` : ''}
    ${v.cuts ? `<div class="chips" style="margin-top:8px">${Object.keys(v.cuts).map(c => `<button class="${(AF.cut || Object.keys(v.cuts)[0]) === c ? 'on' : ''}" onclick="afCut('${c.replace(/'/g, "\\'")}')">${c}</button>`).join('')}</div>` : ''}
    ${heroBlock(t, AF.n === 1 ? d.serving : `${AF.n} × ${d.serving}`)}
    <div class="afrow"><span>Servings</span><span class="afstep"><button onclick="afN(-0.5)">−</button><b>${AF.n}</b><button onclick="afN(0.5)">+</button></span></div>
    ${cookingBlock()}${fatLine(t)}
    ${md ? `<p class="afnote">Choose the version, servings and how it's cooked. This is saved in your meal.</p>${primary(t, md.idx == null ? 'Add to meal' : 'Update meal', 'afDishToMeal()')}`
      : `<button class="aflink" onclick="afToBuilder()">Adjust ingredients</button>${logBar(t, 'afDishToPlate(true)', 'afDishToPlate()')}`}`;
  }
  window.afBack = s => go(s, 'back');
  window.afVar = id => { AF.v = id; AF.cut = null; haptic(); show(); };
  window.afCut = c => { AF.cut = c; haptic(); show(); };
  window.afN = d => { AF.n = Math.max(0.5, Math.min(10, AF.n + d)); haptic(); show(); };
  const dishName = () => { const d = AF.d, v = d.variants.find(x => x.id === AF.v); return d.variants.length > 1 ? `${d.name} (${v.name}${AF.cut ? ', ' + AF.cut : ''})` : d.name; };
  window.afDishToPlate = now => { const { meal, totals } = current(); const it = { name: dishName() + (AF.n !== 1 ? ` ×${AF.n}` : ''), totals, meta: { kind: 'dish', dish: AF.d.id, variant: AF.v, cut: AF.cut, servings: AF.n, method: AF.method, oilType: AF.oilType, oilAmt: AF.oilAmt, ...(AF.oilAmt === 'custom' ? { oilG: AF.oilG } : {}), items: meal.items, sat: totals.sat } };
    if (now) return logItems([{ ...it, mult: 1 }], false); addToPlate(it); };
  window.afToBuilder = () => { Object.assign(AF, { items: F.dishItems(AF.d, AF.v, AF.cut, AF.n), name: 'My ' + dishName().replace(/^./, c => c.toLowerCase()), editMy: null, extra: null, manual: false, override: null, edit: -1, from: 'dish', adjustedFrom: dishName(), origItems: JSON.stringify(F.dishItems(AF.d, AF.v, AF.cut, AF.n)) }); go('builder'); };

  // ---------- single catalog ingredient ----------
  window.afOpenIng = id => { const ing = F.ING[id]; Object.assign(AF, { ingId: id, g: ing.pc ? ing.pc.g : 100, method: 'raw', oilType: 'none', oilAmt: null, manual: false, override: null, extra: null }); AF.items = [{ id, g: AF.g }]; go('item'); };
  function scrItem() {
    const ing = F.ING[AF.ingId]; AF.items = [{ id: AF.ingId, g: AF.g }]; const { totals: t } = current();
    const u = unitOf(ing), q = [50, 100, 150, 200].map(g => `<button class="${AF.g === g ? 'on' : ''}" onclick="afItemG(${g})">${g} ${u}</button>`).join('') + (ing.pc ? [1, 2, 3].map(n => `<button class="${AF.g === ing.pc.g * n ? 'on' : ''}" onclick="afItemG(${ing.pc.g * n})">${n} ${ing.pc.label}${n > 1 ? 's' : ''}</button>`).join('') : '');
    return `${head(ing.name, "afBack('search')", star('ing:' + ing.id))}
    ${heroBlock(t, amtLabel(ing, AF.g) === `${r1(AF.g)} ${u}` ? `${r1(AF.g)} ${u}` : `${amtLabel(ing, AF.g)} · ${r1(AF.g)} ${u}`)}
    <div class="afrow"><span>Amount</span><span class="afstep"><button onclick="afItemG(AF.g-10)">−</button><b>${r1(AF.g)} ${u}</b><button onclick="afItemG(AF.g+10)">+</button></span></div>
    <div class="chips" style="margin-top:var(--s1)">${q}</div>
    ${['meat', 'veg', 'carb'].includes(ing.group) ? cookingBlock() : ''}${fatLine(t)}
    ${nutrientBlock(AF.items)}
    <div class="afnote" style="margin-top:var(--s2)">Per 100 ${u}: ${Math.round(ing.per100.kcal)} kcal · ${ing.src}${ing.mine && ['p', 'c', 'f', 'sat', 'fib'].some(k => ing.per100[k] == null) ? ` · ${['p', 'c', 'f', 'sat', 'fib'].filter(k => ing.per100[k] == null).map(k => ({ p: 'protein', c: 'carbs', f: 'fat', sat: 'saturated fat', fib: 'fibre' })[k]).join(', ')} unknown (shown as 0)` : ''}</div>
    ${ing.mine ? `<div style="display:flex;flex-wrap:wrap;gap:0 var(--s3)"><button class="aflink" onclick="afEditIng('${ing.mine}')">Edit</button><button class="aflink" onclick="afDupIng('${ing.mine}')">Duplicate</button><button class="aflink" onclick="afDelIng('${ing.mine}')">Delete</button></div>` : ''}
    ${logBar(t, 'afIngToPlate(true)', 'afIngToPlate()')}`;
  }
  window.afItemG = g => { AF.g = Math.max(1, r1(g)); haptic(); show(); };
  window.afIngToPlate = now => { const ing = F.ING[AF.ingId], { meal, totals } = current(), it = { name: ing.name, ing: { id: ing.id, g: AF.g }, totals, meta: { kind: 'custom', ing: { id: ing.id, g: AF.g }, items: meal.items, method: AF.method, oilType: AF.oilType, oilAmt: AF.oilAmt, ...(AF.oilAmt === 'custom' ? { oilG: AF.oilG } : {}), sat: totals.sat } };
    if (now) return logItems([{ ...it, mult: 1 }], false); addToPlate(it); };

  // ---------- cooking / oil / manual ----------
  function cookingBlock() {
    const m = AF.method, amts = m === 'deep' ? F.OIL_AMTS.filter(a => a[0] === 'absorb') : F.OIL_AMTS.filter(a => a[0] !== 'absorb' && (m !== 'air' || ['spray_l', 'spray_h', 'tsp'].includes(a[0])));
    const isOlive = ['oil_olive', 'oil_evoo'].includes(AF.oilType);
    return `<div class="afsec">Cooking</div><div class="chips">${F.METHODS.map(([k, l]) => `<button class="${m === k ? 'on' : ''}" onclick="afMethod('${k}')">${l}</button>`).join('')}</div>
    ${F.usesOil(m) ? `<div class="afsec">Oil</div><div class="chips">${F.OIL_TYPES.map(([k, l]) => `<button class="${AF.oilType === k ? 'on' : ''}" onclick="afOil('type','${k}')">${l}</button>`).join('')}</div>
      ${AF.oilType !== 'none' ? `<div class="chips" style="margin-top:8px">${amts.map(([k, l]) => `<button class="${AF.oilAmt === k ? 'on' : ''}" onclick="afOil('amt','${k}')">${l}</button>`).join('')}<button class="${AF.oilAmt === 'custom' ? 'on' : ''}" onclick="afOil('amt','custom')">Custom</button></div>
      ${AF.oilAmt === 'custom' ? `<div class="afrow"><span>Oil amount</span><span><input type="number" inputmode="decimal" value="${AF.oilG || ''}" placeholder="0" oninput="AF_oilG(this.value)"> g</span></div>` : ''}
      ${isOlive ? '<div class="afnote">Mostly unsaturated fat. Same calories per gram as other oils.</div>' : AF.oilType === 'oil_coconut' || AF.oilType === 'butter' ? '<div class="afnote">Mostly saturated fat.</div>' : ''}` : ''}` : ''}`;
  }
  window.afMethod = k => { AF.method = k; const pref = S.oilPref[k], def = F.METHOD_DEFAULT[k]; AF.oilType = pref ? pref.type : def.type; AF.oilAmt = pref ? pref.amt : (k === AF.d?.method && AF.d?.oil) || def.amt; haptic(); show(); };
  window.afOil = (what, k) => { if (what === 'type') { AF.oilType = k; if (k !== 'none' && !AF.oilAmt) AF.oilAmt = F.METHOD_DEFAULT[AF.method].amt || 'tsp'; } else AF.oilAmt = k; S.oilPref[AF.method] = { type: AF.oilType, amt: AF.oilAmt }; save(); haptic(); show(); };
  window.AF_oilG = v => { AF.oilG = +v || 0; refreshTotals(); };
  window.AF_show = () => show();

  // ---------- builder (copies, new meals, editing My meals) ----------
  window.afCreate = name => { Object.assign(AF, { items: [], name: (name || '').trim() || nextName(), method: 'raw', oilType: 'none', oilAmt: null, manual: false, override: null, extra: null, editMy: null, edit: -1, from: 'search', adjustedFrom: null }); go('builder'); };
  const nextName = () => { let n = 1; while (S.myDishes.some(m => m.name === `Custom dish #${n}`)) n++; return `Custom dish #${n}`; };
  const rowAct = (edit, del, open) => `<span class="afact"><button class="${open ? 'on' : ''}" aria-label="Edit amount" onclick="${edit}">✏️</button><button aria-label="Remove" onclick="${del}">${ic('x')}</button></span>`;
  function scrBuilder() {
    const { meal, totals: t } = current(), editing = AF.editMy != null;
    const rows = meal.items.map((it, i) => { const ing = F.ING[it.id], k = Math.round(ing.per100.kcal * it.g / 100);
      if (it.oil) return `<div class="afing"><div class="row2"><b>${ing.name}</b><span class="gbtn" style="background:none">${r1(it.g)} ${unitOf(ing)}</span><span class="afkc">${k}</span></div></div>`;
      const open = AF.edit === i;
      return `<div class="afing"><div class="row2"><b>${escT(ing.name)}</b><button class="gbtn" onclick="afEdit(${i})">${r1(it.g)} ${unitOf(ing)}</button><span class="afkc">${k}</span>${rowAct(`afEdit(${i})`, `afDel(${i})`, open)}</div>
        ${open ? `<div class="afedit" style="background:var(--surface);position:relative"><div class="afrow" style="border:none;padding:4px 0"><span class="afstep"><button onclick="afG(${i},-10)">−</button><b>${r1(it.g)} ${unitOf(ing)}</b><button onclick="afG(${i},10)">+</button></span><span class="t-caption">${fmt(F.scale(ing.per100, it.g))}</span></div>
        <div class="chips">${[50, 100, 150, 200].map(g => `<button onclick="afSetG(${i},${g})">${g} g</button>`).join('')}${ing.pc ? `<button onclick="afSetG(${i},${ing.pc.g})">1 ${ing.pc.label}</button><button onclick="afSetG(${i},${ing.pc.g * 2})">2 ${ing.pc.label}s</button>` : ''}</div></div>` : ''}</div>`; }).join('');
    const ex = AF.extra, exRow = ex ? `<div class="afing"><div class="row2"><b>Other (entered by hand)</b><button class="gbtn" onclick="afExtraEdit()">edit</button><span class="afkc">${Math.round(ex.kcal || 0)}</span></div></div>` : '';
    const manual = AF.manual ? manualFields() : '';
    return `${head(editing ? 'Edit my dish' : AF.adjustedFrom ? 'Adjust ingredients' : 'Create dish', AF.from === 'dish' ? "afBack('dish')" : AF.from === 'my' ? "afBack('my')" : "afBack('search')")}
    <div class="afsticky"><div class="t-display num" id="afk" style="font-size:40px">${Math.round(t.kcal)}</div><div class="t-caption num" id="afm">${fmt(t)}</div></div>
    <label class="affield full"><span>Dish name</span><span class="in"><input value="${esc(AF.name || '')}" placeholder="Any name, e.g. Chicken adobo" oninput="AF.name=this.value"></span></label>
    ${AF.adjustedFrom ? `<div class="afnote">A copy of ${esc(AF.adjustedFrom)}. The catalog dish stays the same.</div>` : ''}
    ${manual || `<div class="afsec">Ingredients</div>${rows}${exRow}${!rows && !exRow ? '<div class="afnote" style="padding:8px 0">Add the first ingredient, or enter the totals by hand.</div>' : ''}
    <button class="aflink" style="text-decoration:none;display:flex;align-items:center;gap:8px" onclick="afAddIng()">${ic('plus')} Add ingredient</button>
    ${!rows && !exRow ? `<button class="aflink" onclick="afManual()">Enter totals by hand</button>` : ''}
    ${meal.items.some(i => !i.oil) ? cookingBlock() + fatLine(t) + nutrientBlock(meal.items) : ''}`}
    ${editing ? primary(t, 'Save changes', 'afSaveMy()') : logBar(t, 'afBuilderToPlate(true)', 'afBuilderToPlate()')}
    ${!editing && !AF.manual ? '' : ''}`;
  }
  function manualFields() {
    const o = AF.override, f = (k, l, u, cls = '') => fld(k, l, u, o[k], cls + (o[k] == null && k !== 'kcal' ? ' miss' : ''), 'AF_ov');
    return `<div class="afsec">Totals per serving</div><div class="afgrid">${f('kcal', 'Calories', 'kcal', 'full')}${f('p', 'Protein', 'g')}${f('c', 'Carbs', 'g')}${f('f', 'Fat', 'g')}${f('fib', 'Fibre', 'g')}</div><div class="afnote">Leave a field empty if you don't know it — the meal is marked incomplete until you fill it.</div>`;
  }
  window.afManual = () => { AF.manual = true; AF.override = { ...EMPTY, kcal: '' }; show(); };
  window.AF_ov = (k, v) => { AF.override[k] = v === '' ? null : +v; refreshTotals(); };
  window.afExtraEdit = () => { AF.manual = true; AF.override = { ...AF.extra }; AF.extra = null; show(); };
  window.afAddIng = () => { AF.q = ''; go('ing'); };
  window.afPickIng = id => { const ing = F.ING[id]; AF.items.push({ id, g: ing.pc ? ing.pc.g : 100 }); AF.edit = AF.items.length - 1; haptic(); go('builder', 'back'); };
  window.afEdit = i => { AF.edit = AF.edit === i ? -1 : i; show(); };
  window.afG = (i, d) => { AF.items[i].g = Math.max(1, r1(AF.items[i].g + d)); haptic(); show(); };
  window.afSetG = (i, g) => { AF.items[i].g = g; haptic(); show(); };
  window.afDel = i => { const gone = AF.items.splice(i, 1)[0]; AF.edit = -1; haptic(); show(); toast(`Removed ${F.ING[gone.id].name}`); };
  let tx = 0, dx = 0;
  window.afTS = e => { tx = e.touches[0].clientX; dx = 0; };
  window.afTM = e => { dx = Math.min(0, e.touches[0].clientX - tx); if (dx < -10) e.currentTarget.classList.add('sw'); const r = e.currentTarget.querySelector('.row2'); if (r) r.style.transform = `translateX(${Math.max(dx, -88)}px)`; };
  window.afTE = e => { const r = e.currentTarget.querySelector('.row2'); if (!r) return; r.style.transform = dx < -70 ? 'translateX(-88px)' : ''; if (dx >= -70) e.currentTarget.classList.remove('sw'); };
  function builderSnapshot() {
    const { meal, totals } = current(), items = meal.items.filter(i => !i.oil);
    const extra = AF.manual ? { ...AF.override, kcal: +AF.override.kcal || 0, sat: 0 } : AF.extra;
    return { items, extra, method: AF.method, oilType: AF.oilType, oilAmt: AF.oilAmt, totals, allItems: meal.items };
  }
  window.afBuilderToPlate = now => {
    const s = builderSnapshot(), name = (AF.name || '').trim() || nextName();
    if (!s.totals.kcal) return toast('Add an ingredient or enter calories');
    const adjusted = AF.adjustedFrom && JSON.stringify(AF.items) !== AF.origItems;
    const it = { name, totals: s.totals, adjusted: adjusted || (!AF.adjustedFrom && AF.from !== 'my'), draft: { items: s.items, extra: s.extra, method: s.method, oilType: s.oilType, oilAmt: s.oilAmt }, meta: { kind: 'custom', items: s.allItems, method: s.method, oilType: s.oilType, oilAmt: s.oilAmt, sat: s.totals.sat || 0, manual: AF.manual } };
    if (now) return logItems([{ ...it, mult: 1 }], true); addToPlate(it);
  };

  function scrIng() { return `${head('Add ingredient', "afBack('builder')")}<div class="afsearch">${ic('search')}<input id="afq" placeholder="Search ingredients" autocomplete="off" oninput="afSearch(this.value)"></div><div id="afres"></div>`; }

  // ---------- My dishes (a recipe made of ingredients; stored in S.myDishes) ----------
  window.afOpenMy = id => { AF.myId = id; AF.portion = 1; go('my'); };
  function scrMy() {
    const m = myById(AF.myId); if (!m) return go('search');
    const t = F.mul(myTotals(m), AF.portion), miss = missingOf(m);
    return `${head('My dish', "afBack('search')", star('my:' + m.id))}
    <div class="t-title" style="margin-top:var(--s1)">${escT(m.name)}</div>
    ${heroBlock(t, AF.portion === 1 ? '1 serving' : `${AF.portion} servings`)}
    ${miss.length ? `<div class="afnote" style="text-align:center">Incomplete · missing ${miss.join(', ')} · <button class="aflink" style="padding:0" onclick="afEditMy()">Fill in</button></div>` : ''}
    <div class="afsec">Portion</div><div class="chips">${[0.5, 1, 1.5, 2].map(p => `<button class="${AF.portion === p ? 'on' : ''}" onclick="AF.portion=${p};AF_show()">${p === 0.5 ? '½' : p === 1.5 ? '1½' : p}×</button>`).join('')}</div>
    ${(m.items || []).length || m.extra ? `<div class="afsec">Ingredients</div>${(m.items || []).map(it => `<div class="afrow"><span style="font-weight:500">${F.ING[it.id]?.name || it.id}</span><span class="v num">${r1(it.g * AF.portion)} g</span></div>`).join('')}${m.extra ? `<div class="afrow"><span style="font-weight:500">Entered by hand</span><span class="v num">${Math.round((m.extra.kcal || 0) * AF.portion)} kcal</span></div>` : ''}` : ''}
    <div style="display:flex;flex-wrap:wrap;gap:0 var(--s3);margin-top:var(--s2)">
      <button class="aflink" onclick="afAdjustMy()">Adjust before logging</button><button class="aflink" onclick="afEditMy()">Edit</button>
      <button class="aflink" onclick="afDupMy('${m.id}')">Duplicate</button><button class="aflink" onclick="afDelMy('${m.id}')">Delete</button></div>
    ${logBar(t, 'afLogMy()', 'afMyToPlate()')}`;
  }
  const myToItem = (m, portion) => ({ name: m.name + (portion !== 1 ? ` ×${portion}` : ''), totals: myTotals(m), mult: portion, meta: { kind: 'my', myId: m.id, items: JSON.parse(JSON.stringify(m.items || [])), extra: m.extra || null, method: m.method, oilType: m.oilType, oilAmt: m.oilAmt, sat: myTotals(m).sat } });
  window.afLogMy = () => logItems([myToItem(myById(AF.myId), AF.portion)], false);
  window.afMyToPlate = () => { addToPlate(myToItem(myById(AF.myId), AF.portion)); };
  function loadMyIntoBuilder(m, asCopy) { Object.assign(AF, { items: JSON.parse(JSON.stringify(m.items || [])).map(it => ({ id: it.id, g: r1(it.g * (asCopy ? AF.portion : 1)) })), extra: m.extra ? { ...m.extra } : null, name: m.name, method: m.method || 'raw', oilType: m.oilType || 'none', oilAmt: m.oilAmt || null, manual: false, override: null, edit: -1, from: 'my', adjustedFrom: null, editMy: asCopy ? null : m.id }); go('builder'); }
  window.afAdjustMy = () => loadMyIntoBuilder(myById(AF.myId), true);
  window.afEditMy = () => { const m = myById(AF.myId); loadMyIntoBuilder(m, false); if (m.extra && missingOf(m).length && !(m.items || []).length) { AF.manual = true; AF.override = { ...m.extra }; AF.extra = null; show(); } };
  window.afSaveMy = () => { const m = myById(AF.editMy), s = builderSnapshot(), name = (AF.name || '').trim(); if (!name) return toast('Give your dish a name');
    Object.assign(m, { name, items: s.items, extra: s.extra, method: s.method, oilType: s.oilType, oilAmt: s.oilAmt }); save(); haptic(); toast('Saved. Past logs stay as they were.'); AF.myId = m.id; go('my', 'back'); };
  window.afDupMy = id => { const m = myById(id), c = JSON.parse(JSON.stringify(m)); c.id = newId(); c.name = m.name + ' (copy)'; S.myDishes.push(c); save(); toast('Duplicated'); AF.myId = c.id; show(); };
  window.afDelMy = id => { const m = myById(id); const inMeals = S.myMeals.filter(x => x.items.some(i => i.k === 'my' && i.id === id)); if (!confirm(`Delete the dish “${m.name}”?${inMeals.length ? `\n\nIt's also removed from: ${inMeals.map(x => x.name).join(', ')}.` : ''}\n\nPast logs aren't affected.`)) return; inMeals.forEach(x => x.items = x.items.filter(i => !(i.k === 'my' && i.id === id))); S.myDishes = S.myDishes.filter(x => x.id !== id); S.favs = S.favs.filter(k => k !== 'my:' + id); save(); toast('Deleted'); if (AF.screen === 'my') go('search', 'back'); else render(); };

  // ---------- plate ----------
  function scrPlate() {
    const t = plateTotals();
    const multL = p => `${p === 0.5 ? '½' : p === 1.5 ? '1½' : p}×`;
    const rows = AF.plate.map((it, i) => { const ing = it.ing && F.ING[it.ing.id], g = ing && r1(it.ing.g * it.mult);
      const chips = ing ? (ing.pc ? [1, 2, 3, 4, 6].map(n => n * ing.pc.g) : [50, 100, 150, 200, 300]).map(x => `<button class="${Math.abs(g - x) < 0.05 ? 'on' : ''}" onclick="afPlAmt(${i},${x})">${amtLabel(ing, x)}</button>`).join('')
        : [0.5, 1, 1.5, 2, 3].map(p => `<button class="${it.mult === p ? 'on' : ''}" onclick="afPlMult(${i},${p})">${multL(p)}</button>`).join('');
      const step = ing ? `<div class="afrow" style="border:none;padding:4px 0"><span class="afstep"><button onclick="afPlAmt(${i},${g}-${ing.pc ? ing.pc.g : 10})">−</button><b>${amtLabel(ing, g)}</b><button onclick="afPlAmt(${i},${g}+${ing.pc ? ing.pc.g : 10})">+</button></span><span class="t-caption num">${r1(g)} g</span></div>` : '';
      return `<div class="afing"><div class="row2"><b>${escT(it.name)}</b><button class="gbtn" onclick="afPlEdit(${i})">${ing ? amtLabel(ing, g) : multL(it.mult)}</button><span class="afkc">${Math.round(it.totals.kcal * it.mult)}</span>${rowAct(`afPlEdit(${i})`, `afPlDel(${i})`, AF.plEdit === i)}</div>
      ${AF.plEdit === i ? `<div class="afedit" style="position:relative;background:var(--surface)">${step}<div class="chips">${chips}</div></div>` : ''}</div>`; }).join('');
    return `${head('Plate', "afBack('search')")}
    <div class="afsticky"><div class="t-display num" style="font-size:40px">${Math.round(t.kcal)}<span class="t-label muted" style="letter-spacing:0"> kcal</span></div><div class="t-caption num">${fmt(t)}</div></div>
    ${rows || '<div class="afnote">Your plate is empty.</div>'}
    <button class="aflink" style="text-decoration:none;display:flex;align-items:center;gap:8px" onclick="afBack('search')">${ic('plus')} Add more</button>
    ${AF.plate.length ? '<div class="afnote">Tap ✎ or the amount to change it · × to remove.</div>' : ''}
    ${AF.plate.length ? primary(t, 'Log plate', 'afLogPlate()') : ''}`;
  }
  window.afPlEdit = i => { AF.plEdit = AF.plEdit === i ? -1 : i; show(); };
  window.afPlMult = (i, p) => { AF.plate[i].mult = p; haptic(); show(); };
  window.afPlAmt = (i, g) => { const it = AF.plate[i]; it.mult = Math.max(1, r1(g)) / it.ing.g; haptic(); show(); };
  window.afPlDel = i => { const gone = AF.plate.splice(i, 1)[0]; AF.plEdit = -1; haptic(); toast(`Removed ${esc(gone.name)}`); AF.plate.length ? show() : go('search', 'back'); };
  window.afLogPlate = () => { if (!AF.plate.length) return; const items = AF.plate.splice(0); AF.plEdit = -1; logItems(items, true); };

  // ---------- logging + save-as-meal prompt ----------
  const sig = items => items.map(i => i.name.replace(/ ×[\d.]+$/, '')).sort().join(' + ');
  window.__afLog = items => logItems(items, false);
  function logItems(items, fromPlate) {
    const noAsk = AF.noAsk; AF.noAsk = false;
    if (!items.length) return;
    // window.foodGate (ultra.js): Ultra-Health's hard limits (sugar, fats, sodium, cholesterol) can stop the log before the fasting check.
    // retry: a gate that asks first (Ultra-Health sodium entry, "Eat now / Wait") logs the same items once answered.
    const retry = () => { if (fromPlate) AF.plate.splice(0, items.length); AF.noAsk = noAsk; logItems(items, fromPlate); };
    if ((window.foodGate && !window.foodGate(items, retry)) || !fastOK(retry)) { if (fromPlate) AF.plate.unshift(...items); return; }
    let kcal = 0;
    for (const it of items) { const t = F.mul(it.totals, it.mult || 1); kcal += t.kcal;
      const ing = it.ing && F.ING[it.ing.id];
      (S.food[viewDate] ??= []).push([ing ? `${it.name} (${amtLabel(ing, r1(it.ing.g * (it.mult || 1)))})` : it.name + (it.mult && it.mult !== 1 && it.meta?.kind !== 'my' ? ` ×${it.mult}` : ''), Math.round(t.kcal), Math.round(t.p), r1(t.c), r1(t.f), r1(t.fib), { ...it.meta, mult: it.mult || 1 }]); }
    save(); render(); xpFly(`+${Math.round(kcal)} kcal`);
    const name = items.length === 1 ? items[0].name : `${items.length} items`, s = sig(items);
    const isMine = items.length === 1 && items[0].meta?.kind === 'my';
    const exists = S.myDishes.some(m => sig([{ name: m.name }]) === s) || S.myDishes.some(m => m.combo === s) || S.myMeals.some(m => m.combo === s || sig([{ name: m.name }]) === s);
    const ask = !noAsk && !isMine && !exists && !S.dontAsk.includes(s) && (items.length >= 2 || items[0].adjusted);
    const after = () => { if (viewDate === today()) afterMeal(name, Math.round(kcal)); else closeSheet(); };
    if (ask) { AF.pending = { items, s, after }; savePrompt(); } else { closeSheet(); setTimeout(after, 350); }
  }
  function savePrompt() {
    const { items } = AF.pending, names = items.map(i => i.name.replace(/ ×[\d.]+$/, '').replace(/ \(\d[\d.]* [^)]*\)$/, '').replace(/, (cooked|unsweetened|ripe|raw)$/i, ''));
    const def = names.length === 1 ? names[0] : names.slice(0, -1).join(', ') + ' & ' + names.at(-1);
    const miss = items.filter(i => i.draft?.extra).flatMap(i => ['p', 'c', 'f', 'fib'].filter(k => i.draft.extra[k] == null).map(k => ({ i, k })));
    const L = { p: 'protein', c: 'carbs', f: 'fat', fib: 'fiber' };
    $('#sheet').classList.remove('af'); $('#sheet').classList.add('show'); $('#sheetbg').classList.add('show');
    $('#sheet').innerHTML = `<div class="grab"></div><h3 class="t-title">${items.length > 1 ? 'New combination' : 'You adjusted this dish'}</h3>
      <p class="t-label muted" style="margin:6px 0 var(--s2)">${items.length > 1 ? 'Save it as a meal so next time it’s one tap?' : 'Save it as one of your dishes?'}</p>
      <div class="afrow"><span>Name</span><input id="spn" style="width:65%" value="${esc(def)}"></div>
      ${miss.length ? `<div class="afsec">Fill in now or later</div>${miss.map(({ i, k }, n) => `<div class="afrow afmiss"><span style="font-weight:500">Missing ${L[k]} for “${esc(i.name)}”</span><input type="number" inputmode="decimal" placeholder="g" data-n="${n}"></div>`).join('')}<div class="afnote">Saving without them marks the meal incomplete.</div>` : ''}
      <button class="btn" style="margin-top:var(--s3)" onclick="afSavePlate()">${items.length > 1 ? 'Save meal' : 'Save dish'}</button>
      <div style="display:flex;justify-content:space-between;margin-top:var(--s1)"><button class="aflink" style="text-decoration:none" onclick="afSkipSave(false)">Not now</button><button class="aflink" style="text-decoration:none;color:var(--ink-2)" onclick="afSkipSave(true)">Don't ask again for this</button></div>`;
    AF.pending.miss = miss;
  }
  window.afSavePlate = () => {
    const P = AF.pending, name = $('#spn').value.trim() || nextName();
    if (P.items.length > 1) return savePlateAsMeal(P, name);
    document.querySelectorAll('#sheet [data-n]').forEach(inp => { if (inp.value !== '') { const { i, k } = P.miss[+inp.dataset.n]; i.draft.extra[k] = +inp.value; } });
    const items = [], extra = { kcal: 0, p: 0, c: 0, f: 0, sat: 0, fib: 0 }; let hasExtra = false;
    for (const it of P.items) { const m = it.mult || 1, src = it.draft || (it.meta?.kind === 'my' ? { items: it.meta.items, extra: it.meta.extra } : { items: (it.meta?.items || []).filter(x => !x.oil).concat((it.meta?.items || []).filter(x => x.oil)) });
      (src.items || []).forEach(x => items.push({ id: x.id, g: r1(x.g * m), ...(x.oil ? { oil: true } : {}) }));
      if (src.extra) { hasExtra = true; for (const k of Object.keys(extra)) extra[k] = extra[k] == null || src.extra[k] == null ? (k === 'kcal' ? extra[k] + (src.extra[k] || 0) * m : null) : extra[k] + src.extra[k] * m; } }
    S.myDishes.push({ id: newId(), name, items, extra: hasExtra ? extra : null, method: 'raw', oilType: 'none', oilAmt: null, combo: P.s }); S.dontAsk.push(P.s); save(); haptic();
    toast(`Saved “${esc(name)}” to My dishes`); closeSheet(); setTimeout(P.after, 400); AF.pending = null;
  };
  window.afSkipSave = forever => { const P = AF.pending; if (forever) { S.dontAsk.push(P.s); save(); } closeSheet(); setTimeout(P.after, 400); AF.pending = null; };
  window.afRelog = i => { const x = AF.recent[i], m = x[6] || {}; const t = { kcal: x[1], p: x[2], c: x[3] || 0, f: x[4] || 0, sat: m.sat || 0, fib: x[5] || 0 }, mult = m.mult || 1;
    const ing = m.ing && F.ING[m.ing.id];
    AF.plate.push({ name: ing ? ing.name : x[0].replace(/ ×[\d.]+$/, ''), ...(ing ? { ing: m.ing } : {}), totals: F.mul(t, 1 / mult), mult, meta: m }); haptic(); toast(`Added ${esc(x[0])} to plate`); show(); };

  // ---------- Meals: a saved combination of dishes and / or foods you eat together ----------
  // S.myMeals = [{ id, name, items: [{k:'dish', id, v, cut, n} | {k:'my', id, n} | {k:'ing', id, g}] }]
  // Items are references (catalog dish, your dish, or an ingredient), so editing a dish updates every meal that uses it.
  const mealById = id => S.myMeals.find(m => m.id === id);
  function refToItem(x) {
    if (x.k === 'dish') { const d = F.DISHES.find(y => y.id === x.id); if (!d) return null; const v = (d.variants.find(y => y.id === x.v) || d.variants[0]), o = x.method ? { method: x.method, oilType: x.oilType || 'none', oilAmt: x.oilAmt || null } : dishDefaults(d), its = F.dishItems(d, v.id, x.cut || null, 1), m = F.buildMeal(its, o.method, o.oilType, o.oilAmt, { breaded: breaded(its), g: x.oilG });
      return { name: d.variants.length > 1 ? `${d.name} (${v.name}${x.cut ? ', ' + x.cut : ''})` : d.name, totals: m.totals, mult: x.n || 1, ref: x, meta: { kind: 'dish', dish: d.id, variant: v.id, cut: x.cut || null, servings: 1, method: o.method, oilType: o.oilType, oilAmt: o.oilAmt, items: m.items, sat: m.totals.sat } }; }
    if (x.k === 'my') { const d = myById(x.id); if (!d) return null; return { ...myToItem(d, 1), name: d.name, mult: x.n || 1, ref: x }; }
    if (x.k === 'ing') { const ing = F.ING[x.id]; if (!ing) return null; const its = [{ id: ing.id, g: x.g }], mth = x.method || 'raw', ot = x.oilType || 'none', oa = x.oilAmt || null, m = F.buildMeal(its, mth, ot, oa, { g: x.oilG });
      return { name: ing.name, ing: { id: ing.id, g: x.g }, totals: m.totals, mult: 1, ref: x, meta: { kind: 'custom', ing: { id: ing.id, g: x.g }, items: m.items, method: mth, oilType: ot, oilAmt: oa, sat: m.totals.sat } }; }
    return null;
  }
  const mealPlate = m => (m.items || []).map(refToItem).filter(Boolean);
  const itemAmt = it => it.ing ? amtLabel(F.ING[it.ing.id], r1(it.ing.g * it.mult)) : `${it.mult === 0.5 ? '½' : it.mult % 1 === 0.5 ? Math.floor(it.mult) + '½' : it.mult} serving${it.mult > 1 ? 's' : ''}`;
  const itemStep = it => it.ing ? (F.ING[it.ing.id].pc ? F.ING[it.ing.id].pc.g : 10) / it.ing.g : 0.5;
  const sumPlate = its => its.reduce((t, it) => F.add(t, F.mul(it.totals, it.mult)), F.round(F.sumItems([])));
  // Servings row shared by the meal screen and the meal editor.
  const mealRow = (it, i, fnStep, fnDel, sub) => `<div class="afing"><div class="row2"><div style="flex:1;min-width:0"><b style="display:block">${escT(it.name)}</b><small class="t-caption">${sub || ''}</small></div>
    <span class="afstep"><button aria-label="Less" onclick="${fnStep}(${i},-1)">−</button><b style="min-width:74px;font-size:13px">${itemAmt(it)}</b><button aria-label="More" onclick="${fnStep}(${i},1)">+</button></span>
    <span class="afkc">${Math.round(it.totals.kcal * it.mult)}</span><span class="afact"><button aria-label="Remove" onclick="${fnDel}(${i})">${ic('x')}</button></span></div></div>`;
  const kindLbl = it => it.ref?.k === 'dish' ? 'Dish' : it.ref?.k === 'my' ? 'My dish' : 'Food';

  // Open: every item with its own servings, adjust for today, log all in one tap.
  window.afOpenMeal = id => { const m = mealById(id); if (!m) return; AF.meal = { id, items: mealPlate(m) }; go('meal'); };
  function scrMeal() {
    const m = mealById(AF.meal.id); if (!m) return scrSearch(); const its = AF.meal.items, t = sumPlate(its), missing = m.items.length - mealPlate(m).length;
    return `${head('My meal', "afBack('search')", star('meal:' + m.id))}
    <div class="t-title" style="margin-top:var(--s1)">${escT(m.name)}</div>
    ${heroBlock(t, `${its.length} item${its.length === 1 ? '' : 's'}`)}
    <div class="afsec">Adjust servings for this time</div>
    ${its.map((it, i) => mealRow(it, i, 'afMealN', 'afMealSkip', kindLbl(it))).join('') || '<div class="afnote">Everything is skipped — tap Reset to bring the items back.</div>'}
    ${missing ? `<div class="afnote">${missing} item${missing > 1 ? 's were' : ' was'} deleted and left out.</div>` : ''}
    <div style="display:flex;flex-wrap:wrap;gap:0 var(--s3);margin-top:var(--s1)"><button class="aflink" onclick="afOpenMeal('${m.id}')">Reset</button><button class="aflink" onclick="afEditMeal('${m.id}')">Edit meal</button><button class="aflink" onclick="afDelMeal('${m.id}')">Delete</button></div>
    ${its.length ? logBar(t, 'afLogMeal()', 'afMealToPlate()', 'Log meal') : ''}`;
  }
  window.afMealN = (i, d) => { const it = AF.meal.items[i]; it.mult = Math.max(itemStep(it), r1((it.mult + d * itemStep(it)) * 100) / 100); haptic(); show(); };
  window.afMealSkip = i => { const gone = AF.meal.items.splice(i, 1)[0]; haptic(); toast(`Skipped ${esc(gone.name)} this time`); show(); };
  // Each item is logged as its own entry (so it can be edited or removed later), tagged with the meal's name.
  const forLog = (its, meal) => its.map(it => ({ ...it, name: it.meta?.kind === 'my' && it.mult !== 1 ? `${it.name} ×${it.mult}` : it.name, meta: { ...it.meta, meal } }));
  window.afLogMeal = () => { const m = mealById(AF.meal.id), its = AF.meal.items; if (!its.length) return; AF.noAsk = true; logItems(forLog(its, m.name), false); };
  window.afMealToPlate = () => { const its = AF.meal.items; AF.plate.push(...its.map(it => ({ ...it }))); haptic(); toast(`On the plate (${AF.plate.length}) — add more, then tap Log`); AF.q = ''; go('search', 'back'); };
  window.afDelMeal = id => { const m = mealById(id); if (!confirm(`Delete the meal “${m.name}”?\n\nThe dishes and foods in it stay. Past logs aren't affected.`)) return; S.myMeals = S.myMeals.filter(x => x.id !== id); S.favs = S.favs.filter(k => k !== 'meal:' + id); save(); toast('Meal deleted'); AF.q = ''; go('search', 'back'); };

  // Editor: name + items (catalog dishes, your dishes and foods) with default servings.
  window.afNewMeal = name => { AF.mealDish = null; AF.med = { id: null, name: (name || '').trim(), items: [] }; go('mealed'); };
  window.afEditMeal = id => { AF.mealDish = null; const m = mealById(id); AF.med = { id, name: m.name, items: JSON.parse(JSON.stringify(m.items)) }; go('mealed'); };
  function scrMealEd() {
    const E = AF.med, its = E.items.map(refToItem), t = sumPlate(its.filter(Boolean));
    return `${head(E.id ? 'Edit meal' : 'Create meal', E.id ? "afBack('meal')" : "afBack('search')")}
    <div class="afsticky"><div class="t-display num" style="font-size:40px">${Math.round(t.kcal)}<span class="t-label muted" style="letter-spacing:0"> kcal</span></div><div class="t-caption num">${fmt(t)}</div></div>
    <label class="affield full"><span>Meal name</span><span class="in"><input value="${esc(E.name)}" placeholder="e.g. My breakfast" oninput="AF.med.name=this.value"></span></label>
    <div class="afnote">A meal is the dishes and foods you usually eat together, e.g. adobo + rice + whey. Log it in one tap and adjust each item's servings first.</div>
    <div class="afsec">In this meal</div>
    ${its.map((it, i) => it ? mealRow(it, i, 'afMedN', 'afMedDel', kindLbl(it) + (it.ref?.k === 'dish' ? ` · <button class="aflink afchg" onclick="afMedEdit(${i})">Change</button>` : '')) : '').join('') || '<div class="afnote" style="padding:8px 0">Add the first dish or food.</div>'}
    <button class="aflink" style="text-decoration:none;display:flex;align-items:center;gap:8px" onclick="AF.q='';afGo('mealpick')">${ic('plus')} Add dish or food</button>
    ${primary(t, E.id ? 'Save meal' : 'Create meal', 'afSaveMeal()')}`;
  }
  window.afMedN = (i, d) => { const x = AF.med.items[i], it = refToItem(x), st = itemStep(it); if (x.k === 'ing') x.g = Math.max(1, r1(x.g * Math.max(st, it.mult + d * st))); else x.n = Math.max(0.5, (x.n || 1) + d * 0.5); haptic(); show(); };
  window.afMedDel = i => { AF.med.items.splice(i, 1); haptic(); show(); };
  window.afMedEdit = i => { const x = AF.med.items[i]; if (!x || x.k !== 'dish') return; AF.mealDish = { idx: i };
    afOpenDish(x.id, { v: x.v || F.DISHES.find(d => d.id === x.id).variants[0].id, cut: x.cut || null, n: x.n || 1, ...(x.method ? { method: x.method, oilType: x.oilType || 'none', oilAmt: x.oilAmt || null, ...(x.oilG ? { oilG: x.oilG } : {}) } : {}) }); };
  // Save the dish screen's choices into the meal (new item, or replace the one being changed).
  window.afDishToMeal = () => { const md = AF.mealDish; if (!md || !AF.med) return;
    const ref = { k: 'dish', id: AF.d.id, v: AF.v, cut: AF.cut || null, n: AF.n, method: AF.method, oilType: AF.oilType, oilAmt: AF.oilAmt, ...(AF.oilAmt === 'custom' && AF.oilG ? { oilG: AF.oilG } : {}) };
    if (md.idx == null) AF.med.items.push(ref); else AF.med.items[md.idx] = ref;
    AF.mealDish = null; haptic(); go('mealed', 'back'); };
  function scrMealPick() {
    return `${head('Add to meal', "afBack('mealed')")}<div class="afsearch">${ic('search')}<input id="afq" placeholder="Search dishes, my dishes or foods" autocomplete="off" oninput="afSearch(this.value)"></div><div id="afres"></div>`;
  }
  // Search results while picking items for a meal (meals themselves and recents are left out).
  const pickRows = list => list.map(e => `<div class="afli" style="align-items:center" onclick="afMealAdd('${e.type}','${e.id}')"><div class="nm"><b>${escT(e.name)}<span class="afsrc">${e.src}</span></b><small>${e.kcal} kcal · ${e.serving}</small></div><span>${ic('plus')}</span></div>`).join('');
  const _afSearch = window.afSearch; window.afSearch = q => { if (AF.screen !== 'mealpick') return _afSearch(q); AF.q = q; const box = $('#afres'); if (!box) return;
    const all = index().filter(e => e.type !== 'meal'), mine = all.filter(e => e.type === 'my' || e.src === 'My ingredient');
    box.innerHTML = q.trim() ? (pickRows(F.search(q, all).slice(0, 30)) || `<div class="afnote" style="padding:14px 0">Nothing matches “${esc(q)}”.</div>`)
      : (mine.length ? `<div class="afgroup">Mine</div>${pickRows(mine)}` : '') + `<div class="afgroup">Filipino dishes</div>${pickRows(all.filter(e => e.type === 'dish').sort((a, b) => a.name.localeCompare(b.name)))}`; };
  window.afMealAdd = (type, id) => { const ing = type === 'ing' && F.ING[id];
    if (type === 'dish') { AF.mealDish = { idx: null }; return afOpenDish(id); }
    AF.med.items.push(type === 'dish' ? { k: 'dish', id, n: 1 } : type === 'my' ? { k: 'my', id, n: 1 } : { k: 'ing', id, g: ing.pc ? ing.pc.g : 100 }); haptic(); go('mealed', 'back'); };
  window.afSaveMeal = () => { const E = AF.med, name = (E.name || '').trim(); if (!name) return toast('Give your meal a name'); if (!E.items.length) return toast('Add at least one dish or food');
    let m = E.id && mealById(E.id); if (m) Object.assign(m, { name, items: E.items }); else { m = { id: newId(), name, items: E.items }; S.myMeals.push(m); }
    save(); haptic(); toast(`Saved “${esc(name)}” to My meals`); afOpenMeal(m.id); };

  // Saving a plate of several items makes a Meal. Items with no catalog / dish / food behind them
  // (an adjusted dish, a hand-built recipe, an old log) are saved as your own dish first.
  function savePlateAsMeal(P, name) {
    document.querySelectorAll('#sheet [data-n]').forEach(inp => { if (inp.value !== '') { const { i, k } = P.miss[+inp.dataset.n]; i.draft.extra[k] = +inp.value; } });
    const refs = [];
    for (const it of P.items) { const mult = it.mult || 1, mt = it.meta || {};
      if (it.ref) { refs.push(it.ref.k === 'ing' ? { ...it.ref, g: r1(it.ref.g * mult) } : { ...it.ref, n: mult }); continue; }
      // Dishes always keep how they were cooked (boiled included); foods only when not plain raw. Custom oil keeps its grams.
      const cookAll = mt.method ? { method: mt.method, oilType: mt.oilType || 'none', oilAmt: mt.oilAmt || null, ...(mt.oilAmt === 'custom' && mt.oilG ? { oilG: mt.oilG } : {}) } : {};
      const cook = mt.method && (mt.method !== 'raw' || (mt.oilType && mt.oilType !== 'none')) ? cookAll : {};
      if (mt.kind === 'dish' && !it.adjusted && !it.draft) { refs.push({ k: 'dish', id: mt.dish, v: mt.variant, cut: mt.cut || null, n: (mt.servings || 1) * mult, ...cookAll }); continue; }
      if (mt.kind === 'my' && mt.myId && myById(mt.myId)) { refs.push({ k: 'my', id: mt.myId, n: mult }); continue; }
      if (it.ing && !it.draft) { refs.push({ k: 'ing', id: it.ing.id, g: r1(it.ing.g * mult), ...cook }); continue; }
      const src = it.draft || (mt.kind === 'my' ? { items: mt.items || [], extra: mt.extra || null, method: mt.method, oilType: mt.oilType, oilAmt: mt.oilAmt } : null) || { items: (mt.items || []).filter(x => !x.oil), extra: mt.manual ? { kcal: it.totals.kcal, p: it.totals.p, c: it.totals.c, f: it.totals.f, fib: it.totals.fib, sat: it.totals.sat || 0 } : null, method: mt.method, oilType: mt.oilType, oilAmt: mt.oilAmt };
      const items = (src.items || []).map(x => ({ id: x.id, g: r1(x.g) })), extra = !items.length && !src.extra ? { kcal: it.totals.kcal, p: it.totals.p, c: it.totals.c, f: it.totals.f, fib: it.totals.fib, sat: it.totals.sat || 0 } : src.extra || null;
      const d = { id: newId(), name: it.name.replace(/ ×[\d.]+$/, '').replace(/ \(\d[\d.]* [^)]*\)$/, ''), items, extra, method: src.method || 'raw', oilType: src.oilType || 'none', oilAmt: src.oilAmt || null };
      S.myDishes.push(d); refs.push({ k: 'my', id: d.id, n: mult }); }
    S.myMeals.push({ id: newId(), name, items: refs, combo: P.s }); S.dontAsk.push(P.s); save(); haptic();
    toast(`Saved “${esc(name)}” to My meals`); closeSheet(); setTimeout(P.after, 400); AF.pending = null;
  }

  // ---------- My meals & dishes page ----------
  V.mymeals = () => `<div class="top">${backBtn()}<h1>My meals</h1><span></span></div>
    <div class="sec">Meals <small onclick="foodSheet();afNewMeal('')" style="cursor:pointer;color:var(--accent)">+ New</small></div>
    ${S.myMeals.length ? `<div class="plist">${S.myMeals.map(m => { const its = mealPlate(m), t = sumPlate(its); return `<div class="li" style="cursor:pointer" onclick="foodSheet();afOpenMeal('${m.id}')"><div style="flex:1;min-width:0"><b>${escT(m.name)}</b><small>${Math.round(t.kcal)} kcal · ${esc(its.map(i => i.name).join(' + '))}</small></div>${star('meal:' + m.id)}</div>`; }).join('')}</div>`
    : `<div class="empty">A meal is what you eat together, e.g. “My breakfast” = adobo + rice + whey. Log it in one tap.</div>`}
    <div class="sec">Dishes <small onclick="foodSheet();afCreate('')" style="cursor:pointer;color:var(--accent)">+ New</small></div>
    ${S.myDishes.length ? `<div class="plist">${S.myDishes.map(m => { const t = myTotals(m), miss = missingOf(m); return `<div class="li" style="cursor:pointer" onclick="foodSheet();afOpenMy('${m.id}')"><div style="flex:1;min-width:0"><b>${escT(m.name)}</b><small>${Math.round(t.kcal)} kcal · P ${Math.round(t.p)} g${miss.length ? ' · incomplete' : ''}</small></div>${star('my:' + m.id)}</div>`; }).join('')}</div>`
    : `<div class="empty">A dish is a recipe made of ingredients, e.g. adobo with soy sauce, sugar and chicken. Create one when it isn't in the catalog.</div>`}<div style="height:var(--s4)"></div>`;

  // ---------- entry ----------
  window.foodSheet = (pre = {}) => {
    $('#sheet').classList.add('show'); $('#sheetbg').classList.add('show');
    if (pre.name) { Object.assign(AF, { items: [], name: pre.name, method: 'raw', oilType: 'none', oilAmt: null, manual: true, override: { kcal: pre.kcal ?? '', p: pre.protein ?? null, c: pre.carbs ?? null, f: pre.fat ?? null, fib: pre.fiber ?? null }, extra: null, editMy: null, edit: -1, from: 'search', adjustedFrom: null }); go('builder'); return; }
    AF.q = ''; AF.browse = null; AF.mealDish = null; go('search');
  };
  const _close = closeSheet; window.closeSheet = function () { _close(); setTimeout(() => { const sh = $('#sheet'); if (!sh.classList.contains('show')) sh.classList.remove('af'); }, 400); };
  window.AF = AF;
  // Nutrition quick actions: Add food · My meals · Nutrients · Supplements (Smart foods moves into Nutrients)
  const _m = V.meals; V.meals = () => _m().replace(/<button onclick="push\('foodsci'\)">[\s\S]*?<\/button>/, `<button onclick="push('mymeals')">${ic('clip')}My meals</button>`);
  const _n = V.nutrition; V.nutrition = () => _n() + `<div class="hdr">More</div><div class="plist"><div class="li" style="cursor:pointer" onclick="push('foodsci')"><div style="flex:1"><b>Smart foods</b><small>Science-backed picks and what each nutrient does</small></div></div></div><div style="height:var(--s4)"></div>`;
})();
// Any normal sheet opened after the food flow gets the standard sheet layout back.
(function(){const _os=openSheet;window.openSheet=function(h){$('#sheet').classList.remove('af');_os(h)}})();
// Hooks for other screens (meal suggestions): log items directly, or open a pre-filled builder copy.
(function(){
  window.afLogItemsExt = items => { if (window.AF) window.AF.plate ??= []; window.__afLog(items); };
  window.afOpenBuilderWith = (name, items, method, oilType, oilAmt) => { foodSheet(); Object.assign(AF, { items: items.map(i => ({ id: i.id, g: i.g })), name, method: method || 'raw', oilType: oilType || 'none', oilAmt: oilAmt || null, manual: false, override: null, extra: null, editMy: null, edit: -1, from: 'search', adjustedFrom: null }); AF.screen = 'builder'; AF_show(); };
})();
