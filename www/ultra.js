// RepWise Ultra-Health Mode (off by default). Rules: health.js (RWHealth); numbers + sources: guidelines.js (RWGuide).
// Turning it on (after a one-time disclaimer):
//  - personal daily limits for added sugar, saturated fat, total fat, sodium and cholesterol, tightened by BP / glucose readings
//  - hard limits: a food that would push the day over the sugar, saturated fat, total fat, sodium or cholesterol limit is not logged
//  - water target +15%, extra hydration reminders and a bedtime reminder
//  - nutrient gaps over 14 days, food + supplement ideas, health-trend warnings — all on the Ultra-Health screen (V.ultra)
(function () {
  const H = window.RWHealth, G = window.RWGuide, DB = () => (window.FOODDB && window.FOODDB.ING) || {};
  S.ultra = { on: false, ack: false, water: true, sleep: true, ...(S.ultra || {}) };
  const uOn = () => !!(S.ultra.on && S.profile);
  window.ultraOn = uOn;
  const readings = () => ({ bp: S.bp || [], glu: S.glu || [] });
  const fmtN = v => Math.round(v).toLocaleString('en-US');

  // ---------- stricter hydration target ----------
  const _tU = targets;
  targets = function () { const t = _tU(); if (t && uOn()) { t.waterBase = t.water; t.water = Math.round(t.water * (1 + G.water.bonusPct) / 250) * 250; } return t; };
  const ultraLimits = () => H.limits(S.profile, readings(), { kcal: _tU()?.kcal });
  window.ultraLimits = ultraLimits;
  const dayT = d => H.dayTotals(dayFood(d), DB());
  // Logged days in the last n days (oldest → newest); today included only when asked.
  function lastDays(n, withToday) { const out = []; for (let i = n - (withToday ? 1 : 0); i >= (withToday ? 0 : 1); i--) { const x = new Date(); x.setDate(x.getDate() - i); const d = iso(x), t = dayT(d); if (t.n) out.push({ date: d, ...t }); } return out; }

  // ---------- on / off with a one-time disclaimer ----------
  const WHAT = ['Personal daily limits for added sugar, saturated fat, total fat, sodium and cholesterol (WHO, AHA, ADA), tightened by your blood pressure and glucose readings — with the reason shown',
    'Hard limits: a food that would put you over today’s added sugar, saturated fat, total fat, sodium or cholesterol limit isn’t logged',
    'Water target +15%, extra hydration reminders and a bedtime reminder',
    'Nutrient gaps over 14 days, Filipino food ideas, supplement info and health-trend warnings'];
  window.toggleUltra = on => { on = on ?? !S.ultra.on; if (on && !S.ultra.ack) return ultraDisclaimer();
    S.ultra.on = on; save(); try { schedNotifs(); } catch (e) {} render(); toast(on ? '🛡️ Ultra-Health Mode on' : 'Ultra-Health Mode off'); };
  function ultraDisclaimer() { $('#sheet').classList.remove('af');
    openSheet(`<h3 class="t-title">Before you turn on Ultra-Health Mode</h3>
    <p class="t-body ul-disc" style="margin:var(--s1) 0">${esc(G.disclaimer)}</p>
    <div class="afsec">What changes</div>${WHAT.map(w => `<div class="tip">${esc(w)}</div>`).join('')}
    <button class="btn" style="margin-top:var(--s2)" onclick="ultraAccept()">I understand — turn it on</button>
    <button class="btn sec2" style="margin-top:var(--s1)" onclick="closeSheet()">Not now</button>`); }
  window.ultraDisclaimer = ultraDisclaimer;
  window.ultraAccept = () => { S.ultra.ack = Date.now(); save(); closeSheet(); toggleUltra(true); };

  // ---------- logging gate: hard limits for sugar, saturated fat, total fat, sodium and cholesterol ----------
  const toEntry = it => { const m = it.mult || 1, t = window.FOODDB.mul(it.totals || {}, m); return [it.name, Math.round(t.kcal), Math.round(t.p), t.c, t.f, t.fib, { ...(it.meta || {}), mult: m }]; };
  // Every limit is a hard limit in Ultra-Health Mode: a food that would put today over the WHO / AHA / ADA-based limit for
  // added sugar, saturated fat, total fat, sodium or cholesterol is not logged. Trivial amounts (e.g. 0.2 g fat in a
  // vegetable) never block, so you can still eat vegetables and drink water after reaching a limit.
  const TRIVIAL = { sugar: 1, sat: 0.5, fat: 1, sodium: 50, chol: 10 };
  const LIM_LABEL = { sugar: ['Added sugar', 'g'], sat: ['Saturated fat', 'g'], fat: ['Total fat', 'g'], sodium: ['Sodium', 'mg'], chol: ['Cholesterol', 'mg'] };
  // Sugar on the label of a scanned packaged product counts toward the added-sugar limit.
  const scanSugar = entries => (entries || []).reduce((g, x) => { const m = x[6]?.mult || 1; for (const it of x[6]?.items || []) { const ing = DB()[it.id]; if (ing && ing.scan && ing.per100.sugar != null) g += ing.per100.sugar * (+it.g || 0) / 100 * m; } return g; }, 0);
  function overLimits(items) {
    const L = ultraLimits(), entries = items.map(toEntry), was = dayT(viewDate), plus = H.dayTotals(entries, DB());
    const cur = { sugar: RWCore.addedSugar(dayFood(viewDate)) + scanSugar(dayFood(viewDate)), sat: was.sat, fat: was.f, sodium: was.na, chol: was.chol };
    const add = { sugar: RWCore.addedSugar(entries) + scanSugar(entries), sat: plus.sat, fat: plus.f, sodium: plus.na, chol: plus.chol };
    const lim = { sugar: L.sugar, sat: L.sat, fat: L.fat, sodium: L.sodium, chol: L.chol };
    return Object.keys(lim).filter(k => add[k] >= TRIVIAL[k] && cur[k] + add[k] > lim[k].value)
      .map(k => ({ k, label: LIM_LABEL[k][0], unit: LIM_LABEL[k][1], now: Math.round(cur[k]), add: Math.round(add[k]), total: Math.round(cur[k] + add[k]), limit: lim[k].value, over: Math.round(cur[k] + add[k] - lim[k].value), why: lim[k].why }));
  }
  window.ultraOverLimits = overLimits;
  window.foodGate = items => {
    if (!uOn() || !items || !items.length) return true;
    const over = overLimits(items);
    if (over.length) { showBlock(over, items); return false; }
    return true;
  };
  const SWAPS_BY = {
    sat: ['Grilled, steamed or boiled instead of fried', 'Chicken breast, fish or tokwa instead of liempo, chicharon or longganisa', 'Skip the skin and visible fat'],
    fat: ['Less oil: air-fry, grill or bake', 'Steamed rice instead of fried rice', 'Fresh fruit instead of chips or pastries'],
    sodium: ['Less soy sauce, patis and bagoong; use calamansi, vinegar or garlic for flavour', 'Fresh meat instead of tocino, tapa, hotdog or corned beef', 'Skip instant noodles and the seasoning packet'],
    chol: ['Egg whites instead of whole eggs', 'Fish or chicken breast instead of liver, shrimp or squid', 'Tokwa or monggo for protein'],
  };
  function showBlock(over, items) { $('#sheet').classList.remove('af');
    const names = over.map(o => o.label.toLowerCase()), title = names.length > 1 ? names.slice(0, -1).join(', ') + ' and ' + names.at(-1) : names[0];
    const swaps = [...new Set(over.flatMap(o => o.k === 'sugar' ? H.swaps(items) : SWAPS_BY[o.k]))].slice(0, 4);
    openSheet(`<div class="ul-block"><h3 class="t-title">Not logged — this goes over your ${esc(title)} limit</h3>
    ${over.map(o => `<div class="ul-brow"><b>${esc(o.label)}</b><span>+${fmtN(o.add)} ${o.unit} → <b>${fmtN(o.total)} of ${fmtN(o.limit)} ${o.unit}</b> · <b class="ul-over">${fmtN(o.over)} ${o.unit} over</b></span>${o.why ? `<small class="ul-why">↓ ${esc(o.why)}</small>` : ''}</div>`).join('')}
    <div class="afsec">Healthier ideas</div>${swaps.map(x => `<div class="tip">${esc(x)}</div>`).join('')}
    <p class="t-body ul-offhint" style="margin-top:var(--s2)"><b>Ultra-Health Mode is on.</b> Turn off Ultra-Health Mode to eat more of this food.</p>
    <button class="btn" style="margin-top:var(--s2)" onclick="closeSheet();foodSheet()">Pick something else</button>
    <button class="btn sec2" style="margin-top:var(--s1)" onclick="closeSheet();push('ultra')">Ultra-Health settings</button></div>`); }

  // ---------- dashboard ----------
  const LVL = { urgent: ['🚨', 'ul-w urgent'], doctor: ['🩺', 'ul-w doc'], warn: ['⚠️', 'ul-w'], info: ['ℹ️', 'ul-w info'] };
  function limitRow(x, val, partial) { const p = Math.min(1, val / x.value), over = val > x.value;
    return `<div class="ul-lim"><div class="ul-lim-h"><b>${x.label}</b><span class="num${over ? ' ul-over' : ''}">${partial ? '≥' : ''}${fmtN(val)} / ${fmtN(x.value)} ${x.unit}</span></div>
    <div class="prog"><i style="width:${p * 100}%;${over ? 'background:var(--warn)' : ''}"></i></div>${x.why ? `<small class="ul-why">↓ ${esc(x.why)}</small>` : ''}</div>`; }
  function readingsCard(L) { const bp = L.bp, gf = L.glu?.fasting, ga = L.glu?.after, sb = (S.bp || []).at(-1), sg = (S.glu || []).at(-1);
    return `<div class="card">
    <div class="afrow"><span>Blood pressure<small class="t-caption" style="display:block;font-weight:400">${bp ? `Last ${bp.n} average ${bp.sys}/${bp.dia} · ${esc(bp.cat[0])}` : 'No readings yet'}${sb ? ` · latest ${sb[1]}/${sb[2]}` : ''}</small></span><button class="btn sm sec2" onclick="bpSheet()">Add</button></div>
    <div class="afrow"><span>Blood sugar<small class="t-caption" style="display:block;font-weight:400">${gf ? `Fasting average ${gf.v} mg/dL (${gf.n})` : 'No fasting readings yet'}${ga ? ` · after meals ${ga.v} mg/dL` : ''}${sg ? ` · latest ${sg[1]}` : ''}</small></span><button class="btn sm sec2" onclick="gluSheet()">Add</button></div>
    <p class="t-caption">Limits tighten automatically when your last 5 BP readings average 130/80 or higher, or your fasting glucose averages 100 mg/dL or higher.</p></div>`; }
  V.ultra = () => { const on = uOn(), sw = `<button class="sw ${on ? 'on' : ''}" role="switch" aria-checked="${on}" aria-label="Ultra-Health Mode" onclick="toggleUltra()"><i></i></button>`;
    const head = `<div class="top">${backBtn()}<h1 style="font-size:22px;flex:1;margin-left:var(--s1)">Ultra-Health</h1><span></span></div>
    <div class="card"><div class="afrow" style="border:none"><span><b>Ultra-Health Mode</b><small class="t-caption" style="display:block;font-weight:400">${on ? 'On' : 'Off'} · stricter, personal limits from your health readings</small></span>${sw}</div></div>
    <p class="t-caption ul-reminder">🛈 General wellness guidance, not medical advice. Talk to your doctor about any health condition.</p>`;
    if (!on) return head + `<div class="sec">What it does</div>${WHAT.map(w => `<div class="tip">${esc(w)}</div>`).join('')}<button class="btn" style="margin-top:var(--s2)" onclick="toggleUltra(true)">Turn on Ultra-Health Mode</button>`;
    const L = ultraLimits(), d = today(), t = dayT(d), tg = targets();
    const warns = H.trends(lastDays(7, true), readings(), L), defs = H.deficiencies(lastDays(14, false), S.profile), lowKeys = defs.low.map(x => x.k);
    const left = { sugar: Math.max(0, L.sugar.value - t.sugar), sat: Math.max(0, L.sat.value - t.sat), sodium: Math.max(0, L.sodium.value - t.na), chol: Math.max(0, L.chol.value - t.chol) };
    const foods = H.foodSuggestions(lowKeys, left, DB()), supps = H.supplements(lowKeys);
    return head + `
    ${warns.length ? `<div class="sec">Health warnings</div>${warns.map(w => `<div class="${LVL[w.level][1]}">${LVL[w.level][0]} ${esc(w.text)}</div>`).join('')}` : ''}
    <div class="sec">Today: limits vs intake</div><div class="card">
     ${limitRow(L.sugar, t.sugar, false)}${limitRow(L.sat, t.sat, t.satPartial)}${limitRow(L.sodium, t.na, t.naPartial)}${limitRow(L.fat, t.f, false)}${limitRow(L.chol, t.chol, t.cholPartial)}
     <p class="t-caption">Every limit is a hard limit: a food that would go over isn't logged (tiny amounts, like the fat in vegetables, never block). ≥ = some foods have no data for it, so the real amount is at least this. Salt added while cooking isn't counted.</p>
     ${L.notes.map(n => `<div class="tip">${esc(n)}</div>`).join('')}</div>
    <div class="sec">Blood pressure & sugar trends</div>${readingsCard(L)}
    <div class="sec">Nutrient gaps · last 14 days</div><div class="card">
     ${!defs.enough ? `<p class="t-body">Log food on at least ${G.deficiency.minDays} days to check for gaps (${defs.days} so far, today not counted).</p>`
      : defs.low.length ? defs.low.map(x => `<div class="afrow"><span>${x.label}<small class="t-caption" style="display:block;font-weight:400">Low on ${x.lowDays} of ${defs.days} days${x.incomplete ? ' · data incomplete' : ''}</small></span><b class="num">${x.avg} / ${x.rec} ${x.unit}</b></div>`).join('')
      : `<p class="t-body">No consistent gaps in fiber or protein over ${defs.days} logged days ✅</p>`}
     ${defs.noData.length ? `<p class="t-caption" style="margin-top:var(--s1)">Can't check yet: ${esc(defs.noData.join(', ').toLowerCase())} — the built-in foods have no data for these. Foods you add as your own ingredients with these values are included.</p>` : ''}</div>
    ${foods.length ? `<div class="sec">Foods that fill the gaps</div><div class="card">${foods.map(f => `<div class="tip">🥬 ${esc(f.name)} <small class="muted">· ${esc(G.intakes[f.for].label.toLowerCase())}</small></div>`).join('')}<p class="t-caption">Picked to fit what's left of today's sugar, saturated fat, sodium and cholesterol limits.</p></div>` : ''}
    ${supps.length ? `<div class="sec">Supplements to ask about</div><div class="card">${supps.map(s => `<div class="tip"><b>${esc(s.name)}</b> — ${esc(s.info)}</div>`).join('')}<p class="t-caption ul-supp">General information only. Check with your doctor or pharmacist before starting any supplement, especially if you take medicine.</p></div>` : ''}
    <div class="sec">Hydration & sleep</div><div class="card">
     <div class="afrow"><span>Water target<small class="t-caption" style="display:block;font-weight:400">+15% in Ultra-Health (was ${fmtN(tg.waterBase || tg.water)} ml) · ${fmtN(S.water[d] || 0)} ml today</small></span><b class="num">${fmtN(tg.water)} ml</b></div>
     <div class="afrow"><span>Hydration reminders<small class="t-caption" style="display:block;font-weight:400">Every 2 hours, 8am–8pm</small></span><button class="sw ${S.ultra.water ? 'on' : ''}" role="switch" aria-checked="${S.ultra.water}" aria-label="Hydration reminders" onclick="S.ultra.water=!S.ultra.water;save();schedNotifs();render()"><i></i></button></div>
     <div class="afrow"><span>Bedtime reminder<small class="t-caption" style="display:block;font-weight:400">9:30 pm wind-down for ${G.sleep.min}–${G.sleep.max} h of sleep${S.sleep?.[d] ? ` · last night ${S.sleep[d]} h` : ''}</small></span><button class="sw ${S.ultra.sleep ? 'on' : ''}" role="switch" aria-checked="${S.ultra.sleep}" aria-label="Bedtime reminder" onclick="S.ultra.sleep=!S.ultra.sleep;save();schedNotifs();render()"><i></i></button></div></div>
    <details class="ul-src"><summary>Where these numbers come from</summary>${['sugar', 'sat', 'fat', 'sodium', 'chol'].map(k => `<p class="t-caption"><b>${G.limits[k].label}:</b> ${esc(G.limits[k].source)}</p>`).join('')}
     <p class="t-caption"><b>Tightening:</b> ${esc(G.tighten.bp.source)} ${esc(G.tighten.glucose.source)}</p><p class="t-caption"><b>Sodium & cholesterol in foods:</b> ${esc(H.NUT_SRC)}</p><p class="t-caption"><b>When to see a doctor:</b> ${esc(G.doctor.source)}</p></details>
    <div style="height:var(--s4)"></div>`; };
  // One-line summary for the Modes card / Meals.
  window.ultraSummary = () => { if (!uOn()) return ''; const L = ultraLimits(), t = dayT(today());
    return `Sugar ${t.sugar}/${L.sugar.value} g · sat fat ${Math.round(t.sat)}/${L.sat.value} g · sodium ${t.naPartial ? '≥' : ''}${fmtN(t.na)}/${fmtN(L.sodium.value)} mg`; };

  // ---------- Meals: the added-sugar line uses the Ultra limit, plus a link to the dashboard ----------
  const _mU = V.meals; V.meals = () => { const h = _mU(); if (!uOn()) return h; const L = ultraLimits(), g = RWCore.addedSugar(dayFood(viewDate)), lim = L.sugar.value;
    return h.replace(/<span>Added sugar ~\d+ g of \d+ g limit<\/span><span style="[^"]*">[^<]*<\/span><\/div>/, `<span>Added sugar ~${g} g of ${lim} g limit 🛡️</span><span style="${g >= lim ? 'color:var(--accent);font-weight:600' : ''}">${g >= lim ? 'At limit' : g > lim * 0.7 ? 'Close' : 'OK'}</span></div><div class="t-caption num ul-meals" style="margin-top:4px;cursor:pointer" onclick="push('ultra')">Ultra-Health: ${esc(ultraSummary())} ›</div>`); };

  // ---------- reminders: hydration + bedtime (ids 2200–2299) ----------
  const _snU = schedNotifs;
  schedNotifs = async function () { await _snU(); const L = LN(); if (!L || !S.profile || !uOn() || (!S.ultra.water && !S.ultra.sleep)) return;
    try { const N = [], tg = targets(), at = (d, h, m) => { const x = new Date(); x.setDate(x.getDate() + d); x.setHours(h, m, 0, 0); return x; };
      const add = (id, t, title, body, go) => { if (t > new Date()) N.push({ id, title, body, schedule: { at: t, allowWhileIdle: true }, extra: { go } }); };
      for (let d = 0; d < 7; d++) { const b = 2200 + d * 10;
        if (S.ultra.water) [8, 10, 12, 14, 16, 18, 20].forEach((h, i) => add(b + i, at(d, h, 0), '💧 Ultra-Health: water break', `A glass now — your target is ${tg.water.toLocaleString()} ml today.`, 'plan'));
        if (S.ultra.sleep) add(b + 7, at(d, 21, 30), '🌙 Time to wind down', `Screens off soon — ${G.sleep.min}–${G.sleep.max} h of sleep helps blood pressure, blood sugar and recovery.`, 'plan'); }
      if (N.length) await L.schedule({ notifications: N }); } catch (e) { console.warn('ultra notif', e); } };
  const _nU = V.notifs; V.notifs = () => { const h = _nU(); if (!uOn()) return h;
    return h + `<div class="sec">🛡️ Ultra-Health</div><div class="list">
     <div class="row" onclick="S.ultra.water=!S.ultra.water;save();schedNotifs();render()"><span style="font-size:22px">💧</span><div class="rbody"><b>Extra hydration</b><small>Every 2 hours, 8am–8pm</small></div><span class="chip" style="background:${S.ultra.water ? 'var(--good)' : 'var(--fill)'};color:${S.ultra.water ? 'var(--on-accent)' : 'inherit'}">${S.ultra.water ? 'ON' : 'OFF'}</span></div>
     <div class="row" onclick="S.ultra.sleep=!S.ultra.sleep;save();schedNotifs();render()"><span style="font-size:22px">🌙</span><div class="rbody"><b>Bedtime</b><small>Wind-down reminder at 9:30 pm</small></div><span class="chip" style="background:${S.ultra.sleep ? 'var(--good)' : 'var(--fill)'};color:${S.ultra.sleep ? 'var(--on-accent)' : 'inherit'}">${S.ultra.sleep ? 'ON' : 'OFF'}</span></div></div>`; };

  document.head.insertAdjacentHTML('beforeend', `<style>
  .ul-reminder{margin:var(--s1) 0 0;padding:8px 12px;border-radius:12px;background:var(--fill)}
  .ul-lim{margin-bottom:12px}.ul-lim-h{display:flex;justify-content:space-between;gap:8px;font-size:14px}.ul-lim .prog{margin-top:6px}
  .ul-brow{display:grid;gap:2px;padding:10px 0;border-bottom:1px solid var(--line);font-size:14px}.ul-brow:last-of-type{border-bottom:none}
  .ul-why{display:block;font-size:12px;color:var(--warn);margin-top:4px}.ul-over{color:var(--warn);font-weight:700}
  .ul-w{background:color-mix(in srgb,var(--warn) 14%,var(--surface));color:var(--warn);border-radius:12px;padding:10px 12px;margin-top:8px;font-size:14px;line-height:1.45}.ul-w.doc{background:color-mix(in srgb,var(--accent-2) 14%,var(--surface));color:var(--accent-2)}.ul-w.urgent{background:var(--accent-soft);color:var(--accent);font-weight:600}.ul-w.info{background:var(--fill);color:var(--ink)}
  .ul-src{margin-top:var(--s2)}.ul-src summary{font-size:13px;color:var(--ink-2);cursor:pointer}.ul-src p{margin-top:6px}
  </style>`);
  if (typeof render === 'function') render();
})();
