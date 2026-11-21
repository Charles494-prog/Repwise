// RepWise "Add food" flow: Catalog · My meals · Recent · Plate. Every log goes through the plate.
// All macro math comes from foods.js (FOODDB). Entries are stored as
// [name, kcal, protein, carbs, fat, fiber, meta] so every existing screen keeps working.
(function () {
  const F = window.FOODDB;
  S.myMeals ??= []; S.oilPref ??= {};
  const AF = { screen: 'search' };
  const r1 = v => Math.round(v * 10) / 10;
  const fmt = t => `P ${Math.round(t.p)} · C ${Math.round(t.c)} · F ${Math.round(t.f)} · fiber ${Math.round(t.fib)} g`;
  const haptic = () => { try { vib(10); } catch (e) {} };
  // "3 eggs" when the grams are whole pieces, otherwise "150 g"
  const amtLabel = (ing, g) => { const n = ing.pc && g / ing.pc.g; return n && Math.abs(n - Math.round(n)) < 0.01 ? `${Math.round(n)} ${ing.pc.label}${Math.round(n) !== 1 ? 's' : ''}` : `${r1(g)} g`; };
  const breaded = items => items.some(i => ['flour', 'breadcrumbs', 'wrapper', 'cornstarch'].includes(i.id));

  document.head.insertAdjacentHTML('beforeend', `<style>
  #sheet.af{height:92vh;max-height:92vh;padding:8px 0 0;display:flex;flex-direction:column;overflow:hidden}
  #sheet.af .grab{margin:0 auto 8px}
  .afscr{flex:1;overflow-y:auto;padding:0 var(--s2) calc(96px + env(safe-area-inset-bottom));animation:afIn .22s cubic-bezier(.2,.8,.2,1)}
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
  .afli:active{opacity:.55}.afli b{flex:1;font-size:var(--fs-body);font-weight:600}.afli span{font-size:var(--fs-label);color:var(--ink-2);text-align:right;white-space:nowrap}
  .afli.create b{color:var(--ink);font-weight:700}
  .chips{display:flex;gap:8px;overflow-x:auto;padding:2px 0 4px;margin:0 calc(-1 * var(--s2));padding-left:var(--s2);padding-right:var(--s2);scrollbar-width:none}
  .chips::-webkit-scrollbar{display:none}
  .chips button{flex:none;border:1px solid var(--line);background:var(--surface);color:var(--ink);border-radius:var(--r-pill);padding:8px 14px;font-size:var(--fs-label);font-weight:600;cursor:pointer;white-space:nowrap}
  .chips button.on{background:var(--ink);border-color:var(--ink);color:#fff}
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
  .afing{position:relative;overflow:hidden;border-bottom:1px solid var(--line)}
  .afing .row2{position:relative;z-index:1;display:flex;align-items:center;gap:var(--s2);padding:14px 0;background:var(--surface);transition:transform .2s}
  .afing .row2 b{flex:1;font-weight:600}.afing .gbtn{border:none;background:var(--fill);border-radius:var(--r-pill);padding:6px 12px;font-weight:600;font-size:var(--fs-label);color:var(--ink);font-variant-numeric:tabular-nums}
  .afing .afkc{width:64px;text-align:right;color:var(--ink-2);font-size:var(--fs-label);font-variant-numeric:tabular-nums}
  .afing .del{display:none;position:absolute;right:0;top:0;height:52px;width:88px;background:var(--accent);color:#fff;border:none;font-weight:700}
  .afedit{padding:0 0 14px}.afedit .chips{margin-top:var(--s1)}
  .afnote{font-size:13px;color:var(--ink-2);margin-top:6px;line-height:1.4}
  </style>`);
  document.head.insertAdjacentHTML('beforeend', `<style>
  .afsrc{font-size:var(--fs-caption);color:var(--ink-3);font-weight:500;margin-left:6px}
  .afstar{background:none;border:none;padding:4px 0 4px 10px;color:var(--ink-3);cursor:pointer;line-height:0}.afstar.on{color:var(--ink)}
  .afstar svg{width:20px;height:20px}
  .afli .nm{flex:1;min-width:0}.afli .nm b{display:block}.afli .nm small{font-size:var(--fs-caption);color:var(--ink-2)}
  .plbar{position:absolute;left:0;right:0;bottom:0;display:flex;align-items:center;gap:var(--s2);padding:12px var(--s2) calc(12px + env(safe-area-inset-bottom));background:var(--ink);color:#fff;cursor:pointer}
  .plbar .t{flex:1}.plbar .t b{display:block;font-size:var(--fs-body)}.plbar .t small{opacity:.7;font-size:var(--fs-caption)}
  .plbar button{background:#fff;color:var(--ink);border:none;border-radius:var(--r-pill);padding:10px 18px;font-weight:700}
  .afprim{display:flex;gap:var(--s2);align-items:center}.afprim .btn{flex:1}
  .afmiss{background:var(--fill);border-radius:10px}
  .afmiss input::placeholder{color:var(--accent)}
  </style>`);

  // ---------- favorites / my meals storage ----------
  S.favs ??= []; S.dontAsk ??= [];
  S.myMeals.forEach((m, i) => { m.id ??= 'm' + Date.now().toString(36) + i; });
  const isFav = k => S.favs.includes(k);
  window.afFav = (k, ev) => { if (ev) ev.stopPropagation(); S.favs = isFav(k) ? S.favs.filter(x => x !== k) : [...S.favs, k]; save(); haptic(); const b = ev && ev.currentTarget; if (b) { b.classList.toggle('on', isFav(k)); b.innerHTML = starSvg(isFav(k)); } else show(); };
  const starSvg = on => `<svg viewBox="0 0 24 24" fill="${on ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/></svg>`;
  const star = k => `<button class="afstar${isFav(k) ? ' on' : ''}" aria-label="Favorite" onclick="afFav('${k}',event)">${starSvg(isFav(k))}</button>`;
  const myById = id => S.myMeals.find(m => m.id === id);
  const EMPTY = { kcal: null, p: null, c: null, f: null, fib: null };
  // My meal totals = ingredients + manual "extra" (fields may be null = missing)
  function myTotals(m) { const t = F.round(F.sumItems(m.items || [])), x = m.extra || {}; const o = {}; for (const k of ['kcal', 'p', 'c', 'f', 'sat', 'fib']) o[k] = (t[k] || 0) + (x[k] || 0); return o; }
  const missingOf = m => { const x = m.extra; if (!x) return []; return ['p', 'c', 'f', 'fib'].filter(k => x[k] == null).map(k => ({ p: 'protein', c: 'carbs', f: 'fat', fib: 'fiber' })[k]); };
  const newId = () => 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

  // ---------- plate ----------
  AF.plate ??= [];
  const plateTotals = () => AF.plate.reduce((t, it) => F.add(t, F.mul(it.totals, it.mult)), F.round(F.sumItems([])));
  function addToPlate(item) { AF.plate.push({ mult: 1, ...item }); haptic(); toast(`Added ${esc(item.name)} to plate`); AF.q = ''; go('search', 'back'); }

  // ---------- index ----------
  function index() {
    const out = [];
    for (const m of S.myMeals) { const t = myTotals(m); out.push({ type: 'my', key: 'my:' + m.id, id: m.id, name: m.name, alt: 'my meal', kcal: Math.round(t.kcal), serving: '1 serving', src: 'My meal', incomplete: missingOf(m).length > 0 }); }
    for (const d of F.DISHES) { const o = dishDefaults(d), t = dishTotals(d, d.variants[0].id, null, 1, o).totals;
      out.push({ type: 'dish', key: 'dish:' + d.id, id: d.id, name: d.name, alt: d.alt + ' ' + d.variants.map(v => v.name + ' ' + v.alt).join(' '), kcal: t.kcal, serving: d.serving, src: 'Catalog' }); }
    for (const ing of Object.values(F.ING)) { const g = ing.pc ? ing.pc.g : 100;
      out.push({ type: 'ing', key: 'ing:' + ing.id, id: ing.id, name: ing.name, alt: ing.alt, group: ing.group, kcal: Math.round(ing.per100.kcal * g / 100), serving: ing.pc ? `1 ${ing.pc.label}` : '100 g', src: 'Catalog' }); }
    return out;
  }
  function row(e, label) {
    const open = e.type === 'dish' ? `afOpenDish('${e.id}')` : e.type === 'my' ? `afOpenMy('${e.id}')` : e.type === 'recent' ? `afRelog(${e.i})` : `afOpenIng('${e.id}')`;
    return `<div class="afli" style="align-items:center" onclick="${open}"><div class="nm"><b>${escT(e.name)}${label ? `<span class="afsrc">${e.src}</span>` : ''}</b><small>${e.kcal} kcal · ${e.serving}${e.incomplete ? ' · incomplete' : ''}</small></div>${e.key ? star(e.key) : ''}</div>`;
  }

  // ---------- render ----------
  function show(dir) {
    const sh = $('#sheet'); sh.classList.add('af');
    const html = ({ search: scrSearch, dish: scrDish, builder: scrBuilder, ing: scrIng, item: scrItem, my: scrMy, plate: scrPlate })[AF.screen]();
    const k = html.indexOf('<div class="afbar">'), body = k >= 0 ? html.slice(0, k) : html;
    let bar = k >= 0 ? html.slice(k) : '';
    if (AF.screen === 'search' && AF.plate.length) { const t = plateTotals(); bar = `<div class="plbar" onclick="afGo('plate')"><div class="t"><b>Plate · ${AF.plate.length} item${AF.plate.length > 1 ? 's' : ''} · ${Math.round(t.kcal)} kcal</b><small>Tap to review</small></div><button onclick="event.stopPropagation();afLogPlate()">Log</button></div>`; }
    sh.innerHTML = `<div class="grab"></div><div class="afscr${dir === 'back' ? ' back' : ''}">${body}</div>${bar}`;
    if (AF.screen === 'search' || AF.screen === 'ing') { const i = $('#afq'); i.value = AF.q || ''; afSearch(i.value); if (!AF.plate.length || AF.screen === 'ing') setTimeout(() => i.focus(), 60); }
  }
  const go = (s, dir) => { AF.screen = s; show(dir); };
  window.afGo = s => go(s);
  const backIc = () => ic('aup').replace('<svg', '<svg style="transform:rotate(-90deg)"');
  const head = (title, back, extra = '') => `<div class="afhead">${back ? `<button class="afback" aria-label="Back" onclick="${back}">${backIc()}</button>` : ''}<span class="t-label">${title}</span>${extra}<button class="afback" aria-label="Close" onclick="closeSheet()">${ic('x')}</button></div>`;

  // ---------- search ----------
  function scrSearch() {
    return `${head('Add food', null, `<button class="aflink" style="text-decoration:none;padding:6px 8px" onclick="afCreate('')">Create meal</button>`)}
    <div class="afsearch">${ic('search')}<input id="afq" placeholder="Search food, dish or my meals" autocomplete="off" oninput="afSearch(this.value)"></div>
    <div id="afres"></div>`;
  }
  function recentList() {
    const seen = new Set(), out = [];
    for (const d of Object.keys(S.food).sort().reverse()) for (const x of [...S.food[d]].reverse()) { if (seen.has(x[0]) || out.length >= 8) continue; seen.add(x[0]); out.push(x); }
    AF.recent = out; return out.map((x, i) => ({ type: 'recent', i, name: x[0], kcal: x[1], serving: 'last logged', src: 'Recent' }));
  }
  window.afSearch = q => {
    AF.q = q; const box = $('#afres'); if (!box) return;
    if (AF.screen === 'ing') {
      const all = index().filter(e => e.type === 'ing');
      if (!q.trim()) { const G = [['meat', 'Meat & fish'], ['veg', 'Vegetables'], ['fruit', 'Fruit'], ['carb', 'Rice & carbs'], ['oil', 'Oils & sauces'], ['other', 'Other']];
        box.innerHTML = G.map(([g, l]) => `<div class="afgroup">${l}</div>${all.filter(e => e.group === g).map(e => `<div class="afli" onclick="afPickIng('${e.id}')"><b>${escT(e.name)}</b><span>${e.kcal} kcal · ${e.serving}</span></div>`).join('')}`).join(''); return; }
      const res = F.search(q, all).slice(0, 30);
      box.innerHTML = res.map(e => `<div class="afli" onclick="afPickIng('${e.id}')"><b>${escT(e.name)}</b><span>${e.kcal} kcal · ${e.serving}</span></div>`).join('') || `<div class="afnote" style="padding:14px 0">No ingredient matches “${esc(q)}”.</div>`;
      return;
    }
    const all = index(), rec = recentList();
    if (!q.trim()) {
      const favs = all.filter(e => isFav(e.key)), mine = all.filter(e => e.type === 'my');
      box.innerHTML = (favs.length ? `<div class="afgroup">Favorites</div>${favs.map(e => row(e, true)).join('')}` : '')
        + (mine.length ? `<div class="afgroup">My meals</div>${mine.map(e => row(e)).join('')}` : '')
        + (rec.length ? `<div class="afgroup">Recent</div>${rec.map(e => row(e)).join('')}` : '')
        + (!favs.length && !mine.length && !rec.length ? `<div class="afnote" style="padding:var(--s3) 0">Search the catalog — 50+ Filipino dishes and 130 ingredients. Star anything you eat often.</div>` : '');
      return;
    }
    let res = F.search(q, [...all, ...rec]);
    const rank = e => (e.type === 'my' ? 2 : 0) + (isFav(e.key) ? 1 : 0);
    res = res.map((e, i) => ({ e, i })).sort((a, b) => rank(b.e) - rank(a.e) || a.i - b.i).map(x => x.e).slice(0, 30);
    box.innerHTML = res.map(e => row(e, true)).join('') + `<div class="afli create" onclick="afCreate(AF.q)"><b>Create “${esc(q.trim())}”</b><span>${ic('plus')}</span></div>`;
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
  const logNow = fn => `<button class="aflink" style="text-decoration:none;white-space:nowrap" onclick="${fn}">Log now</button>`;
  const infoBtn = msg => `<button class="pg-i" aria-label="Info" onclick="afInfo('${msg}')">i</button>`;
  window.afInfo = k => { const T = { recipe: ['About this dish', 'Calories come from a typical home recipe (grams of each ingredient per serving) using USDA FoodData Central values. Filipino ingredients use the closest USDA equivalent until FNRI PhilFCT values are added. Restaurant and carinderia portions can be bigger and oilier — use Adjust ingredients to match yours.'] }[k]; const keep = AF.screen; openSheet(`<h3 class="t-title">${T[0]}</h3><p class="t-body" style="margin:var(--s2) 0">${T[1]}</p><button class="btn sec2" onclick="closeSheet();setTimeout(()=>{$('#sheet').classList.add('show');$('#sheetbg').classList.add('show');AF.screen='${keep}';AF_show()},420)">Back</button>`); };
  function scrDish() {
    const d = AF.d, v = d.variants.find(x => x.id === AF.v) || d.variants[0], { totals: t } = current();
    return `${head(d.name, "afBack('search')", star('dish:' + d.id) + infoBtn('recipe'))}
    ${d.variants.length > 1 ? `<div class="chips">${d.variants.map(x => `<button class="${x.id === v.id ? 'on' : ''}" onclick="afVar('${x.id}')">${x.name}</button>`).join('')}</div>` : ''}
    ${v.cuts ? `<div class="chips" style="margin-top:8px">${Object.keys(v.cuts).map(c => `<button class="${(AF.cut || Object.keys(v.cuts)[0]) === c ? 'on' : ''}" onclick="afCut('${c.replace(/'/g, "\\'")}')">${c}</button>`).join('')}</div>` : ''}
    ${heroBlock(t, AF.n === 1 ? d.serving : `${AF.n} × ${d.serving}`)}
    <div class="afrow"><span>Servings</span><span class="afstep"><button onclick="afN(-0.5)">−</button><b>${AF.n}</b><button onclick="afN(0.5)">+</button></span></div>
    ${cookingBlock()}${fatLine(t)}
    <button class="aflink" onclick="afToBuilder()">Adjust ingredients</button>
    ${primary(t, 'Add to plate', 'afDishToPlate()', logNow('afDishToPlate(true)'))}`;
  }
  window.afBack = s => go(s, 'back');
  window.afVar = id => { AF.v = id; AF.cut = null; haptic(); show(); };
  window.afCut = c => { AF.cut = c; haptic(); show(); };
  window.afN = d => { AF.n = Math.max(0.5, Math.min(10, AF.n + d)); haptic(); show(); };
  const dishName = () => { const d = AF.d, v = d.variants.find(x => x.id === AF.v); return d.variants.length > 1 ? `${d.name} (${v.name}${AF.cut ? ', ' + AF.cut : ''})` : d.name; };
  window.afDishToPlate = now => { const { meal, totals } = current(); const it = { name: dishName() + (AF.n !== 1 ? ` ×${AF.n}` : ''), totals, meta: { kind: 'dish', dish: AF.d.id, variant: AF.v, cut: AF.cut, servings: AF.n, method: AF.method, oilType: AF.oilType, oilAmt: AF.oilAmt, items: meal.items, sat: totals.sat } };
    if (now) return logItems([{ ...it, mult: 1 }], false); addToPlate(it); };
  window.afToBuilder = () => { Object.assign(AF, { items: F.dishItems(AF.d, AF.v, AF.cut, AF.n), name: 'My ' + dishName().replace(/^./, c => c.toLowerCase()), editMy: null, extra: null, manual: false, override: null, edit: -1, from: 'dish', adjustedFrom: dishName(), origItems: JSON.stringify(F.dishItems(AF.d, AF.v, AF.cut, AF.n)) }); go('builder'); };

  // ---------- single catalog ingredient ----------
  window.afOpenIng = id => { const ing = F.ING[id]; Object.assign(AF, { ingId: id, g: ing.pc ? ing.pc.g : 100, method: 'raw', oilType: 'none', oilAmt: null, manual: false, override: null, extra: null }); AF.items = [{ id, g: AF.g }]; go('item'); };
  function scrItem() {
    const ing = F.ING[AF.ingId]; AF.items = [{ id: AF.ingId, g: AF.g }]; const { totals: t } = current();
    const q = [50, 100, 150, 200].map(g => `<button class="${AF.g === g ? 'on' : ''}" onclick="afItemG(${g})">${g} g</button>`).join('') + (ing.pc ? [1, 2, 3].map(n => `<button class="${AF.g === ing.pc.g * n ? 'on' : ''}" onclick="afItemG(${ing.pc.g * n})">${n} ${ing.pc.label}${n > 1 ? 's' : ''}</button>`).join('') : '');
    return `${head(ing.name, "afBack('search')", star('ing:' + ing.id))}
    ${heroBlock(t, amtLabel(ing, AF.g) === `${r1(AF.g)} g` ? `${r1(AF.g)} g` : `${amtLabel(ing, AF.g)} · ${r1(AF.g)} g`)}
    <div class="afrow"><span>Amount</span><span class="afstep"><button onclick="afItemG(AF.g-10)">−</button><b>${r1(AF.g)} g</b><button onclick="afItemG(AF.g+10)">+</button></span></div>
    <div class="chips" style="margin-top:var(--s1)">${q}</div>
    ${['meat', 'veg', 'carb'].includes(ing.group) ? cookingBlock() : ''}${fatLine(t)}
    <div class="afnote" style="margin-top:var(--s2)">Per 100 g: ${ing.per100.kcal} kcal · ${ing.src}</div>
    ${primary(t, 'Add to plate', 'afIngToPlate()', logNow('afIngToPlate(true)'))}`;
  }
  window.afItemG = g => { AF.g = Math.max(1, r1(g)); haptic(); show(); };
  window.afIngToPlate = now => { const ing = F.ING[AF.ingId], { meal, totals } = current(), it = { name: ing.name, ing: { id: ing.id, g: AF.g }, totals, meta: { kind: 'custom', ing: { id: ing.id, g: AF.g }, items: meal.items, method: AF.method, oilType: AF.oilType, oilAmt: AF.oilAmt, sat: totals.sat } };
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
  const nextName = () => { let n = 1; while (S.myMeals.some(m => m.name === `Custom meal #${n}`)) n++; return `Custom meal #${n}`; };
  function scrBuilder() {
    const { meal, totals: t } = current(), editing = AF.editMy != null;
    const rows = meal.items.map((it, i) => { const ing = F.ING[it.id], k = Math.round(ing.per100.kcal * it.g / 100);
      if (it.oil) return `<div class="afing"><div class="row2"><b>${ing.name}</b><span class="gbtn" style="background:none">${r1(it.g)} g</span><span class="afkc">${k}</span></div></div>`;
      const open = AF.edit === i;
      return `<div class="afing" ontouchstart="afTS(event)" ontouchmove="afTM(event)" ontouchend="afTE(event,${i})"><button class="del" onclick="afDel(${i})">Delete</button><div class="row2"><b>${ing.name}</b><button class="gbtn" onclick="afEdit(${i})">${r1(it.g)} g</button><span class="afkc">${k}</span></div>
        ${open ? `<div class="afedit" style="background:var(--surface);position:relative"><div class="afrow" style="border:none;padding:4px 0"><span class="afstep"><button onclick="afG(${i},-10)">−</button><b>${r1(it.g)} g</b><button onclick="afG(${i},10)">+</button></span><span class="t-caption">${fmt(F.scale(ing.per100, it.g))}</span></div>
        <div class="chips">${[50, 100, 150, 200].map(g => `<button onclick="afSetG(${i},${g})">${g} g</button>`).join('')}${ing.pc ? `<button onclick="afSetG(${i},${ing.pc.g})">1 ${ing.pc.label}</button><button onclick="afSetG(${i},${ing.pc.g * 2})">2 ${ing.pc.label}s</button>` : ''}</div></div>` : ''}</div>`; }).join('');
    const ex = AF.extra, exRow = ex ? `<div class="afing"><div class="row2"><b>Other (entered by hand)</b><button class="gbtn" onclick="afExtraEdit()">edit</button><span class="afkc">${Math.round(ex.kcal || 0)}</span></div></div>` : '';
    const manual = AF.manual ? manualFields() : '';
    return `${head(editing ? 'Edit my meal' : AF.adjustedFrom ? 'Adjust ingredients' : 'Create meal', AF.from === 'dish' ? "afBack('dish')" : AF.from === 'my' ? "afBack('my')" : "afBack('search')")}
    <div class="afsticky"><div class="t-display num" id="afk" style="font-size:40px">${Math.round(t.kcal)}</div><div class="t-caption num" id="afm">${fmt(t)}</div></div>
    <div class="afrow"><span>Name</span><input style="width:62%" value="${esc(AF.name || '')}" placeholder="Meal name" oninput="AF.name=this.value"></div>
    ${AF.adjustedFrom ? `<div class="afnote">A copy of ${esc(AF.adjustedFrom)}. The catalog dish stays the same.</div>` : ''}
    ${manual || `<div class="afsec">Ingredients</div>${rows}${exRow}${!rows && !exRow ? '<div class="afnote" style="padding:8px 0">Add the first ingredient, or enter the totals by hand.</div>' : ''}
    <button class="aflink" style="text-decoration:none;display:flex;align-items:center;gap:8px" onclick="afAddIng()">${ic('plus')} Add ingredient</button>
    ${!rows && !exRow ? `<button class="aflink" onclick="afManual()">Enter totals by hand</button>` : ''}
    ${meal.items.some(i => !i.oil) ? cookingBlock() + fatLine(t) : ''}`}
    ${editing ? primary(t, 'Save changes', 'afSaveMy()') : primary(t, 'Add to plate', 'afBuilderToPlate()', logNow('afBuilderToPlate(true)'))}
    ${!editing && !AF.manual ? '' : ''}`;
  }
  function manualFields() {
    const o = AF.override, f = (k, l) => `<div class="afrow${o[k] == null && k !== 'kcal' ? ' afmiss' : ''}"><span>${l}</span><input type="number" inputmode="decimal" value="${o[k] ?? ''}" placeholder="${k === 'kcal' ? '0' : 'missing'}" oninput="AF_ov('${k}',this.value)"></div>`;
    return `<div class="afsec">Totals per serving</div>${f('kcal', 'Calories')}${f('p', 'Protein g')}${f('c', 'Carbs g')}${f('f', 'Fat g')}${f('fib', 'Fiber g')}<div class="afnote">Leave a field empty if you don't know it — the meal is marked incomplete until you fill it.</div>`;
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

  // ---------- My meals ----------
  window.afOpenMy = id => { AF.myId = id; AF.portion = 1; go('my'); };
  function scrMy() {
    const m = myById(AF.myId); if (!m) return go('search');
    const t = F.mul(myTotals(m), AF.portion), miss = missingOf(m);
    return `${head('My meal', "afBack('search')", star('my:' + m.id))}
    <div class="t-title" style="margin-top:var(--s1)">${escT(m.name)}</div>
    ${heroBlock(t, AF.portion === 1 ? '1 serving' : `${AF.portion} servings`)}
    ${miss.length ? `<div class="afnote" style="text-align:center">Incomplete · missing ${miss.join(', ')} · <button class="aflink" style="padding:0" onclick="afEditMy()">Fill in</button></div>` : ''}
    <div class="afsec">Portion</div><div class="chips">${[0.5, 1, 1.5, 2].map(p => `<button class="${AF.portion === p ? 'on' : ''}" onclick="AF.portion=${p};AF_show()">${p === 0.5 ? '½' : p === 1.5 ? '1½' : p}×</button>`).join('')}</div>
    ${(m.items || []).length || m.extra ? `<div class="afsec">Ingredients</div>${(m.items || []).map(it => `<div class="afrow"><span style="font-weight:500">${F.ING[it.id]?.name || it.id}</span><span class="v num">${r1(it.g * AF.portion)} g</span></div>`).join('')}${m.extra ? `<div class="afrow"><span style="font-weight:500">Entered by hand</span><span class="v num">${Math.round((m.extra.kcal || 0) * AF.portion)} kcal</span></div>` : ''}` : ''}
    <div style="display:flex;flex-wrap:wrap;gap:0 var(--s3);margin-top:var(--s2)">
      <button class="aflink" onclick="afAdjustMy()">Adjust before logging</button><button class="aflink" onclick="afEditMy()">Edit</button>
      <button class="aflink" onclick="afDupMy('${m.id}')">Duplicate</button><button class="aflink" onclick="afDelMy('${m.id}')">Delete</button></div>
    ${primary(t, 'Log', 'afLogMy()', `<button class="aflink" style="text-decoration:none;white-space:nowrap" onclick="afMyToPlate()">Add to plate</button>`)}`;
  }
  const myToItem = (m, portion) => ({ name: m.name + (portion !== 1 ? ` ×${portion}` : ''), totals: myTotals(m), mult: portion, meta: { kind: 'my', myId: m.id, items: JSON.parse(JSON.stringify(m.items || [])), extra: m.extra || null, method: m.method, oilType: m.oilType, oilAmt: m.oilAmt, sat: myTotals(m).sat } });
  window.afLogMy = () => logItems([myToItem(myById(AF.myId), AF.portion)], false);
  window.afMyToPlate = () => { const it = myToItem(myById(AF.myId), AF.portion); AF.plate.push(it); haptic(); toast(`Added ${esc(it.name)} to plate`); AF.q = ''; go('search', 'back'); };
  function loadMyIntoBuilder(m, asCopy) { Object.assign(AF, { items: JSON.parse(JSON.stringify(m.items || [])).map(it => ({ id: it.id, g: r1(it.g * (asCopy ? AF.portion : 1)) })), extra: m.extra ? { ...m.extra } : null, name: m.name, method: m.method || 'raw', oilType: m.oilType || 'none', oilAmt: m.oilAmt || null, manual: false, override: null, edit: -1, from: 'my', adjustedFrom: null, editMy: asCopy ? null : m.id }); go('builder'); }
  window.afAdjustMy = () => loadMyIntoBuilder(myById(AF.myId), true);
  window.afEditMy = () => { const m = myById(AF.myId); loadMyIntoBuilder(m, false); if (m.extra && missingOf(m).length && !(m.items || []).length) { AF.manual = true; AF.override = { ...m.extra }; AF.extra = null; show(); } };
  window.afSaveMy = () => { const m = myById(AF.editMy), s = builderSnapshot(), name = (AF.name || '').trim(); if (!name) return toast('Give your meal a name');
    Object.assign(m, { name, items: s.items, extra: s.extra, method: s.method, oilType: s.oilType, oilAmt: s.oilAmt }); save(); haptic(); toast('Saved. Past logs stay as they were.'); AF.myId = m.id; go('my', 'back'); };
  window.afDupMy = id => { const m = myById(id), c = JSON.parse(JSON.stringify(m)); c.id = newId(); c.name = m.name + ' (copy)'; S.myMeals.push(c); save(); toast('Duplicated'); AF.myId = c.id; show(); };
  window.afDelMy = id => { const m = myById(id); if (!confirm(`Delete “${m.name}” from My meals?\n\nPast logs aren't affected.`)) return; S.myMeals = S.myMeals.filter(x => x.id !== id); S.favs = S.favs.filter(k => k !== 'my:' + id); save(); toast('Deleted'); if (AF.screen === 'my') go('search', 'back'); else render(); };

  // ---------- plate ----------
  function scrPlate() {
    const t = plateTotals();
    const multL = p => `${p === 0.5 ? '½' : p === 1.5 ? '1½' : p}×`;
    const rows = AF.plate.map((it, i) => { const ing = it.ing && F.ING[it.ing.id], g = ing && r1(it.ing.g * it.mult);
      const chips = ing ? (ing.pc ? [1, 2, 3, 4, 6].map(n => n * ing.pc.g) : [50, 100, 150, 200, 300]).map(x => `<button class="${Math.abs(g - x) < 0.05 ? 'on' : ''}" onclick="afPlAmt(${i},${x})">${amtLabel(ing, x)}</button>`).join('')
        : [0.5, 1, 1.5, 2, 3].map(p => `<button class="${it.mult === p ? 'on' : ''}" onclick="afPlMult(${i},${p})">${multL(p)}</button>`).join('');
      const step = ing ? `<div class="afrow" style="border:none;padding:4px 0"><span class="afstep"><button onclick="afPlAmt(${i},${g}-${ing.pc ? ing.pc.g : 10})">−</button><b>${amtLabel(ing, g)}</b><button onclick="afPlAmt(${i},${g}+${ing.pc ? ing.pc.g : 10})">+</button></span><span class="t-caption num">${r1(g)} g</span></div>` : '';
      return `<div class="afing" ontouchstart="afTS(event)" ontouchmove="afTM(event)" ontouchend="afTE(event,${i})"><button class="del" onclick="afPlDel(${i})">Remove</button><div class="row2"><b>${escT(it.name)}</b><button class="gbtn" onclick="afPlEdit(${i})">${ing ? amtLabel(ing, g) : multL(it.mult)}</button><span class="afkc">${Math.round(it.totals.kcal * it.mult)}</span></div>
      ${AF.plEdit === i ? `<div class="afedit" style="position:relative;background:var(--surface)">${step}<div class="chips">${chips}</div></div>` : ''}</div>`; }).join('');
    return `${head('Plate', "afBack('search')")}
    <div class="afsticky"><div class="t-display num" style="font-size:40px">${Math.round(t.kcal)}<span class="t-label muted" style="letter-spacing:0"> kcal</span></div><div class="t-caption num">${fmt(t)}</div></div>
    ${rows || '<div class="afnote">Your plate is empty.</div>'}
    <button class="aflink" style="text-decoration:none;display:flex;align-items:center;gap:8px" onclick="afBack('search')">${ic('plus')} Add more</button>
    ${AF.plate.length ? '<div class="afnote">Tap an amount to change it · swipe left to remove.</div>' : ''}
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
    if (!items.length) return;
    if (!fastOK()) { if (fromPlate) AF.plate.unshift(...items); return; }
    let kcal = 0;
    for (const it of items) { const t = F.mul(it.totals, it.mult || 1); kcal += t.kcal;
      const ing = it.ing && F.ING[it.ing.id];
      (S.food[viewDate] ??= []).push([ing ? `${it.name} (${amtLabel(ing, r1(it.ing.g * (it.mult || 1)))})` : it.name + (it.mult && it.mult !== 1 && it.meta?.kind !== 'my' ? ` ×${it.mult}` : ''), Math.round(t.kcal), Math.round(t.p), r1(t.c), r1(t.f), r1(t.fib), { ...it.meta, mult: it.mult || 1 }]); }
    save(); render(); xpFly(`+${Math.round(kcal)} kcal`);
    const name = items.length === 1 ? items[0].name : `${items.length} items`, s = sig(items);
    const isMine = items.length === 1 && items[0].meta?.kind === 'my';
    const exists = S.myMeals.some(m => sig([{ name: m.name }]) === s) || S.myMeals.some(m => m.combo === s);
    const ask = !isMine && !exists && !S.dontAsk.includes(s) && (items.length >= 2 || items[0].adjusted);
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
      <p class="t-label muted" style="margin:6px 0 var(--s2)">Save it as a meal so next time it's one tap?</p>
      <div class="afrow"><span>Name</span><input id="spn" style="width:65%" value="${esc(def)}"></div>
      ${miss.length ? `<div class="afsec">Fill in now or later</div>${miss.map(({ i, k }, n) => `<div class="afrow afmiss"><span style="font-weight:500">Missing ${L[k]} for “${esc(i.name)}”</span><input type="number" inputmode="decimal" placeholder="g" data-n="${n}"></div>`).join('')}<div class="afnote">Saving without them marks the meal incomplete.</div>` : ''}
      <button class="btn" style="margin-top:var(--s3)" onclick="afSavePlate()">Save meal</button>
      <div style="display:flex;justify-content:space-between;margin-top:var(--s1)"><button class="aflink" style="text-decoration:none" onclick="afSkipSave(false)">Not now</button><button class="aflink" style="text-decoration:none;color:var(--ink-2)" onclick="afSkipSave(true)">Don't ask again for this</button></div>`;
    AF.pending.miss = miss;
  }
  window.afSavePlate = () => {
    const P = AF.pending, name = $('#spn').value.trim() || nextName();
    document.querySelectorAll('#sheet [data-n]').forEach(inp => { if (inp.value !== '') { const { i, k } = P.miss[+inp.dataset.n]; i.draft.extra[k] = +inp.value; } });
    const items = [], extra = { kcal: 0, p: 0, c: 0, f: 0, sat: 0, fib: 0 }; let hasExtra = false;
    for (const it of P.items) { const m = it.mult || 1, src = it.draft || (it.meta?.kind === 'my' ? { items: it.meta.items, extra: it.meta.extra } : { items: (it.meta?.items || []).filter(x => !x.oil).concat((it.meta?.items || []).filter(x => x.oil)) });
      (src.items || []).forEach(x => items.push({ id: x.id, g: r1(x.g * m), ...(x.oil ? { oil: true } : {}) }));
      if (src.extra) { hasExtra = true; for (const k of Object.keys(extra)) extra[k] = extra[k] == null || src.extra[k] == null ? (k === 'kcal' ? extra[k] + (src.extra[k] || 0) * m : null) : extra[k] + src.extra[k] * m; } }
    S.myMeals.push({ id: newId(), name, items, extra: hasExtra ? extra : null, method: 'raw', oilType: 'none', oilAmt: null, combo: P.s }); S.dontAsk.push(P.s); save(); haptic();
    toast(`Saved “${esc(name)}” to My meals`); closeSheet(); setTimeout(P.after, 400); AF.pending = null;
  };
  window.afSkipSave = forever => { const P = AF.pending; if (forever) { S.dontAsk.push(P.s); save(); } closeSheet(); setTimeout(P.after, 400); AF.pending = null; };
  window.afRelog = i => { const x = AF.recent[i], m = x[6] || {}; const t = { kcal: x[1], p: x[2], c: x[3] || 0, f: x[4] || 0, sat: m.sat || 0, fib: x[5] || 0 }, mult = m.mult || 1;
    const ing = m.ing && F.ING[m.ing.id];
    AF.plate.push({ name: ing ? ing.name : x[0].replace(/ ×[\d.]+$/, ''), ...(ing ? { ing: m.ing } : {}), totals: F.mul(t, 1 / mult), mult, meta: m }); haptic(); toast(`Added ${esc(x[0])} to plate`); show(); };

  // ---------- My meals management page ----------
  V.mymeals = () => `<div class="top">${backBtn()}<h1>My meals</h1><button class="aflink" style="text-decoration:none" onclick="foodSheet();afCreate('')">New</button></div>
    ${S.myMeals.length ? `<div class="plist">${S.myMeals.map(m => { const t = myTotals(m), miss = missingOf(m); return `<div class="li" style="cursor:pointer" onclick="foodSheet();afOpenMy('${m.id}')"><div style="flex:1;min-width:0"><b>${escT(m.name)}</b><small>${Math.round(t.kcal)} kcal · P ${Math.round(t.p)} g${miss.length ? ' · incomplete' : ''}</small></div>${star('my:' + m.id)}</div>`; }).join('')}</div>`
    : `<div class="empty">No meals yet. Build one from Add food → Create meal, or save a plate after logging it.</div>`}`;

  // ---------- entry ----------
  window.foodSheet = (pre = {}) => {
    $('#sheet').classList.add('show'); $('#sheetbg').classList.add('show');
    if (pre.name) { Object.assign(AF, { items: [], name: pre.name, method: 'raw', oilType: 'none', oilAmt: null, manual: true, override: { kcal: pre.kcal ?? '', p: pre.protein ?? null, c: pre.carbs ?? null, f: pre.fat ?? null, fib: pre.fiber ?? null }, extra: null, editMy: null, edit: -1, from: 'search', adjustedFrom: null }); go('builder'); return; }
    AF.q = ''; go('search');
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
