// RepWise Ultra-Health follow-up (everything here is active only when Ultra-Health Mode is ON).
//  1. Eating outside the window still warns, now with health context and "Eat now / Wait".
//  2. Within 3 h of bedtime (S.sleepTime, default 11 PM): suggest a light high-protein snack; after a full meal, stay up ~2–3 h.
//  3. A late meal (after the normal close) shifts the NEXT window's opening to max(normal open, meal + fasting hours), next
//     day only, with a morning notice + notification. Eating before the shifted opening warns and counts. No chain reaction.
//  4. Healthiest-fasting nudges (earlier window, nothing ~3 h before bed, consistent times) — suggestions, never forced.
//  5. Sodium: a food with unknown sodium can't be logged until the user enters it (remembered for custom ingredients).
//  6. "🛡 Ultra-Health" badge on Nutrition (green / amber / red) and an elevated BP / glucose card on Progress.
// Rules: fasting.js (RWFast.lateShift / ultraCheck / nearBed / nudges). Sodium data: foods.js (FOODDB.NA).
(function () {
  const RF = window.RWFast, H = window.RWHealth, FD = () => window.FOODDB;
  S.sleepTime ??= 23; S.mealTs ??= [];
  S.ultra.shiftNote ??= true; S.ultra.bedTip ??= true;
  const uOn = () => typeof ultraOn === 'function' && ultraOn();
  const fastActive = () => uOn() && !!S.fast?.on;
  const eatH = () => RF.eatHours(S.fast.proto), fastH = () => 24 - eatH();
  const clock = t => new Date(t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const hmT = m => { m = Math.round(m); const h = Math.floor(m / 60), r = m % 60; return h ? `${h} h${r ? ` ${r} min` : ''}` : `${r} min`; };
  const SRC = {
    bed: 'Crispim et al., 2011, J Clin Sleep Med (late eating and sleep quality); Res et al., 2012 & Snijders et al., 2015 (protein before sleep supports overnight muscle repair).',
    sutton: 'Sutton et al., 2018, Cell Metabolism — early time-restricted eating improved insulin sensitivity and blood pressure.',
  };

  // ---------- meal times (food entries have no time of day) ----------
  function recordMeal() { if (viewDate !== today()) return; S.mealTs.push(Date.now()); S.mealTs = S.mealTs.filter(t => t > Date.now() - 30 * 864e5); }
  const firstMeals = () => { const by = {}; for (const t of S.mealTs) { const d = iso(t); if (t > Date.now() - 14 * 864e5 && (!by[d] || t < by[d])) by[d] = t; } return Object.values(by); };
  // Nutrients that were low this week (needs 5 logged days), else today's protein when it's well under target.
  function lowNow() { const list = []; for (let i = 7; i >= 1; i--) { const x = new Date(); x.setDate(x.getDate() - i); const f = dayFood(iso(x)); if (f.length) list.push(H.dayTotals(f, FD().ING)); }
    const d = H.deficiencies(list, S.profile); if (d.enough) return { when: 'this week', what: d.low.map(x => x.label.toLowerCase()) };
    const t = targets(), p = sum(dayFood(today()), 2); return t && p < (t.protein || t.p || 0) * 0.5 ? { when: 'today so far', what: ['protein'] } : { when: '', what: [] }; }
  const join = a => a.length > 1 ? a.slice(0, -1).join(', ') + ' and ' + a.at(-1) : a[0] || '';

  // ---------- sodium gate (5) ----------
  let GATE_KCAL = 0;
  function naMissing(items) { const out = [], seen = new Set(), DB = FD().ING;
    for (const it of items) { const m = it.meta || {}, subs = Array.isArray(m.items) ? m.items : it.ing ? [{ id: it.ing.id, g: it.ing.g }] : [];
      if (!subs.length) { if (typeof m.na !== 'number') out.push({ type: 'item', it }); continue; }
      for (const s of subs) { const ing = DB[s.id]; if (ing && ing.per100.na != null) continue;
        if (ing && ing.mine) { if (!seen.has(ing.mine)) { seen.add(ing.mine); out.push({ type: 'ing', id: ing.mine, name: ing.name }); } }
        else if (!seen.has('it:' + it.name)) { seen.add('it:' + it.name); out.push({ type: 'item', it }); } } }
    return out; }
  let NA_ASK = null;
  function naSheet(miss, retry) { NA_ASK = { miss, retry }; $('#sheet').classList.remove('af');
    openSheet(`<div id="nasheet"><h3 class="t-title">Add sodium to log this</h3>
    <p class="t-body" style="margin:var(--s1) 0">Ultra-Health Mode tracks your sodium limit, so foods without a sodium value need one first. Check the nutrition label (it's listed as sodium, in mg).</p>
    ${miss.map((x, i) => { const rec = x.type === 'ing' ? S.myIngredients.find(r => r.id === x.id) : null, per = rec ? (rec.ref === 'serving' && rec.size ? `per serving (${rec.size} ${rec.unit || 'g'})` : `per 100 ${rec.unit || 'g'}`) : 'in the amount you are logging';
      return `<label class="affield full"><span>${esc(x.type === 'ing' ? x.name : x.it.name)} — sodium ${per}</span><span class="in"><input type="number" inputmode="decimal" min="0" data-na="${i}" placeholder="mg"><em>mg</em></span></label>`; }).join('')}
    <p class="t-caption" style="margin-top:var(--s1)">${miss.some(x => x.type === 'ing') ? 'Saved to your ingredient, so you only enter it once. ' : ''}Ultra-Health off? Sodium is optional.</p>
    <button class="btn" style="margin-top:var(--s2)" onclick="naSave()">Save and log</button>
    <button class="btn sec2" style="margin-top:var(--s1)" onclick="closeSheet()">Cancel</button></div>`); }
  window.naSave = () => { if (!NA_ASK) return; const { miss, retry } = NA_ASK, vals = miss.map((_, i) => $(`#nasheet [data-na="${i}"]`)?.value);
    if (vals.some(v => v === '' || v == null || Number.isNaN(+v) || +v < 0)) return toast('Enter the sodium (mg) for each food');
    miss.forEach((x, i) => { const v = +vals[i];
      if (x.type === 'ing') { const rec = S.myIngredients.find(r => r.id === x.id); if (!rec) return; rec.vals = { ...(rec.vals || {}), na: v };
        const ing = FD().ING['my_' + x.id]; if (ing) ing.per100.na = rec.ref === 'serving' && rec.size > 0 ? v * 100 / rec.size : v; }
      else x.it.meta = { ...(x.it.meta || {}), na: v / (x.it.mult || 1) }; });
    NA_ASK = null; save(); closeSheet(); retry(); };
  const _fg = window.foodGate;
  window.foodGate = (items, retry) => { GATE_KCAL = (items || []).reduce((a, it) => a + (it.totals?.kcal || 0) * (it.mult || 1), 0);
    if (uOn() && items && items.length) { const miss = naMissing(items); if (miss.length) { if (retry) naSheet(miss, retry); else toast('Ultra-Health: add the sodium for this food first'); return false; } }
    return _fg ? _fg(items, retry) : true; };
  // The superfoods list logged straight into the day; with Ultra-Health on it goes through the same gates.
  if (typeof logSFood === 'function') { const _ls = logSFood;
    logSFood = function (i) { if (!uOn() || typeof window.__afLog !== 'function') return _ls(i); const f = SFOODS[i];
      window.__afLog([{ name: f[0], totals: { kcal: f[2], p: f[3], c: 0, f: 0, fib: 0 }, mult: 1, meta: { kind: 'quick' } }]); }; }

  // ---------- eating window (1–3) ----------
  let FAST_PASS = false, BED_PASS = false;
  function countOut(c) { S.fastLog.push({ ts: Date.now(), out: true, side: c.reason === 'after' ? 'after' : 'before', shifted: c.reason === 'shifted' || undefined });
    S.fastLog = S.fastLog.filter(x => x.ts > Date.now() - 60 * 864e5); }
  function bedHtml() { return `<div class="ul-bed"><b>🌙 Close to bedtime (${hh(S.sleepTime)})</b>
    <p class="t-caption" style="margin-top:4px">A light, high-protein snack is easier on sleep and blood sugar: Greek yogurt, a boiled egg, tokwa or a glass of milk. If you eat a full meal, try to stay up about 2–3 hours before lying down.</p>
    <small class="ul-cite">${esc(SRC.bed)}</small></div>`; }
  function warnText(c) { const fh = fastH();
    if (c.reason === 'shifted') return [`Your window opens at ${clock(c.opensAt)} today`, `You ate at ${clock(c.meal)}, so today's window opens ${fh} h after that meal — in ${hmT(c.minsUntilOpen)}. Eating now counts as outside your window.`];
    if (c.reason === 'before') return [`Still fasting — your window opens in ${hmT(c.minsUntilOpen)}`, `It opens at ${clock(c.opensAt)}${c.meal ? ` (moved later because you ate at ${clock(c.meal)})` : ''}. Eating now counts as outside your window.`];
    const next = RF.lateShift([...S.mealTs, Date.now()], Date.now(), S.fast.start, eatH());
    return [`Your eating window has closed`, `It closed at ${hh((S.fast.start + eatH()) % 24)}. If you eat now, tomorrow's window opens at ${clock(next.open)} (${fh} h after this meal) instead of ${clock(next.normalOpen)}.`]; }
  function showWarn(c, retry, bed) { const [title, body] = warnText(c), low = lowNow(); $('#sheet').classList.remove('af');
    openSheet(`<div id="ulfast"><h3 class="t-title">${esc(title)}</h3><p class="t-body" style="margin:var(--s1) 0">${esc(body)}</p>
    ${low.what.length ? `<div class="tip">You're low on ${esc(join(low.what))} ${low.when}. If you do eat, make it count: lean protein and vegetables.</div>` : ''}
    ${bed.near && S.ultra.bedTip ? bedHtml() : ''}
    <button class="btn" style="margin-top:var(--s2)" onclick="ulEatNow()">Eat now</button>
    <button class="btn sec2" style="margin-top:var(--s1)" onclick="ulWait()">Wait</button>
    <p class="t-caption" style="margin-top:var(--s1)">Ultra-Health Mode is on. Fasting settings are in Profile → Fasting.</p></div>`);
    ULW = { c, retry }; }
  let ULW = null;
  window.ulEatNow = () => { if (!ULW) return; const { c, retry } = ULW; ULW = null; countOut(c); FAST_PASS = true; BED_PASS = true; closeSheet(); retry();
    if (c.reason === 'after') try { schedNotifs(); } catch (e) {} };
  window.ulWait = () => { ULW = null; closeSheet(); toast('Good call — your window opens soon'); };
  function bedSheet(retry) { $('#sheet').classList.remove('af');
    openSheet(`<div id="ulbed"><h3 class="t-title">A lighter option before bed?</h3>${bedHtml()}
    <button class="btn" style="margin-top:var(--s2)" onclick="ulBedLog()">Log it anyway</button>
    <button class="btn sec2" style="margin-top:var(--s1)" onclick="closeSheet();foodSheet()">Pick a light snack</button>
    <button class="aflink" onclick="S.ultra.bedTip=false;save();ulBedLog();toast('Bedtime tips off — turn them on in Ultra-Health')">Don't show bedtime tips</button></div>`);
    ULB = retry; }
  let ULB = null;
  window.ulBedLog = () => { const r = ULB; ULB = null; BED_PASS = true; closeSheet(); if (r) r(); };
  const _fo = fastOK;
  fastOK = function (retry) {
    if (viewDate !== today()) return _fo(retry);
    if (!fastActive()) { const ok = _fo(retry); if (ok) recordMeal(); return ok; }
    const now = Date.now(), bed = RF.nearBed(now, S.sleepTime);
    if (FAST_PASS) { FAST_PASS = false; BED_PASS = false; recordMeal(); save(); return true; }
    const c = RF.ultraCheck(S.mealTs, now, S.fast.start, eatH());
    if (c.ok) { if (bed.near && S.ultra.bedTip && retry && !BED_PASS && GATE_KCAL >= 300) { bedSheet(retry); return false; }
      BED_PASS = false; const ok = _fo(retry); if (ok) recordMeal(); return ok; }
    if (!retry) { const [t, b] = warnText(c); if (!confirm(`${t}\n\n${b}\n\nEat now?`)) return false; countOut(c); recordMeal(); save(); if (c.reason === 'after') try { schedNotifs(); } catch (e) {} return true; }
    showWarn(c, retry, bed); return false;
  };
  window.ultraShift = () => fastActive() ? RF.lateShift(S.mealTs, Date.now(), S.fast.start, eatH()) : null;

  // ---------- Today: morning notice about a shifted window ----------
  function afterTop(h, add) { const i = h.indexOf('<div class="top"'); if (i < 0) return add + h; let d = 0, j = i;
    const re = /<\/?div\b[^>]*>/g; re.lastIndex = i; let m; while ((m = re.exec(h))) { d += m[0][1] === '/' ? -1 : 1; if (!d) { j = re.lastIndex; break; } }
    return h.slice(0, j) + add + h.slice(j); }
  const _plan = V.plan; V.plan = (...a) => { const h = _plan(...a); if (!fastActive() || viewDate !== today() || !S.ultra.shiftNote) return h;
    const sh = ultraShift(); if (!sh || !sh.shifted || Date.now() >= sh.open) return h;
    return afterTop(h, `<div class="ul-shift" id="ulshift">⏳ <b>Today your window opens at ${clock(sh.open)}</b><small>You ate at ${clock(sh.meal)}, so it opens ${fastH()} h after that meal instead of ${clock(sh.normalOpen)}. It still closes at ${clock(sh.close)}. Tomorrow is back to normal.</small></div>`); };
  // Notification the morning after a late meal (id 2290).
  const _sn = schedNotifs;
  schedNotifs = async function () { await _sn(); const L = typeof LN === 'function' ? LN() : null; if (!L || !fastActive() || !S.ultra.shiftNote) return;
    try { const sh = RF.lateShift(S.mealTs, Date.now(), S.fast.start, eatH()); if (!sh.shifted) return;
      const at = new Date(sh.open); at.setHours(8, 0, 0, 0); if (+at >= sh.open) at.setTime(sh.open - 30 * 6e4); if (+at <= Date.now()) return;
      await L.schedule({ notifications: [{ id: 2290, title: `⏳ Your eating window opens at ${clock(sh.open)} today`, body: `You ate at ${clock(sh.meal)}, so today your window opens at ${clock(sh.open)} (${fastH()} h later). It still closes at ${clock(sh.close)}.`, schedule: { at, allowWhileIdle: true }, extra: { go: 'plan' } }] }); }
    catch (e) { console.warn('ultra shift notif', e); } };

  // ---------- healthiest fasting nudges (4) ----------
  const NUDGE = {
    earlier: ['🌅 Try an earlier window', 'Opening your eating window earlier in the day (for example 8–10 AM) tends to be better for blood sugar and blood pressure than eating late.'],
    bed: ['🌙 Finish eating ~3 h before bed', `Your window closes less than 3 h before your bedtime (${hh(S.sleepTime)}). Closing it earlier helps sleep and overnight blood sugar.`],
    consistent: ['📅 Keep a steady schedule', 'Your first meal time has varied a lot over the last two weeks. Eating at similar times each day makes fasting easier and steadier.'],
  };
  function nudgeCard() { const n = RF.nudges({ start: S.fast.start, eatH: eatH(), sleepH: S.sleepTime, firstMeals: firstMeals() });
    return `<div class="card ul-nudge"><b>Healthiest fasting</b>${n.length ? n.map(k => `<div class="tip"><b>${NUDGE[k][0]}</b><br>${esc(k === 'bed' ? `Your window closes less than 3 h before your bedtime (${hh(S.sleepTime)}). Closing it earlier helps sleep and overnight blood sugar.` : NUDGE[k][1])}</div>`).join('')
      : '<p class="t-body" style="margin-top:4px">✅ Your window is early, ends well before bed and your timing is steady.</p>'}
      <small class="ul-cite">Suggestions only — your window stays as you set it. ${esc(SRC.sutton)}</small></div>`; }
  const _vf = V.fasting; V.fasting = (...a) => { const h = _vf(...a); if (!fastActive()) return h; const k = '<div class="sec">🔔 Notes while fasting';
    const add = `<div class="sec">🛡️ Ultra-Health</div>${nudgeCard()}`; return h.includes(k) ? h.replace(k, add + k) : h + add; };

  // ---------- Ultra-Health screen: fasting settings ----------
  const sw = (on, label, code) => `<button class="sw ${on ? 'on' : ''}" role="switch" aria-checked="${on}" aria-label="${label}" onclick="${code};save();render()"><i></i></button>`;
  const _vu = V.ultra; V.ultra = (...a) => { const h = _vu(...a); if (!uOn()) return h; const k = '<div class="sec">Hydration & sleep</div>';
    const card = `<div class="sec">Fasting & bedtime</div><div class="card" id="ulfastset">
     <div class="afrow"><span>Bedtime<small class="t-caption" style="display:block;font-weight:400">Used for the late-meal tips</small></span><span class="afstep"><button aria-label="Earlier bedtime" onclick="S.sleepTime=(S.sleepTime+23.5)%24;save();render()">−</button><b>${hh(S.sleepTime)}</b><button aria-label="Later bedtime" onclick="S.sleepTime=(S.sleepTime+0.5)%24;save();render()">+</button></span></div>
     <div class="afrow"><span>Late-meal window shift notice<small class="t-caption" style="display:block;font-weight:400">After a meal past your window's close, the next window opens ${S.fast?.on ? fastH() : 16} h after it — with a morning notice</small></span>${sw(S.ultra.shiftNote, 'Late-meal window shift notice', 'S.ultra.shiftNote=!S.ultra.shiftNote')}</div>
     <div class="afrow"><span>Bedtime snack tip<small class="t-caption" style="display:block;font-weight:400">Within 3 h of bedtime, suggests a light high-protein snack</small></span>${sw(S.ultra.bedTip, 'Bedtime snack tip', 'S.ultra.bedTip=!S.ultra.bedTip')}</div>
     ${S.fast?.on ? '' : '<p class="t-caption">Turn on intermittent fasting to use the eating-window rules.</p>'}</div>${S.fast?.on ? nudgeCard() : ''}`;
    return h.includes(k) ? h.replace(k, card + k) : h + card; };

  // ---------- Nutrition badge + Progress indicator (6) ----------
  function ultraStatus(d = viewDate) { const L = ultraLimits(), t = H.dayTotals(dayFood(d), FD().ING);
    const r = [t.sugar / L.sugar.value, t.sat / L.sat.value, t.na / L.sodium.value, t.f / L.fat.value, t.chol / L.chol.value].map(x => x || 0), m = Math.max(...r);
    return m > 1 || t.sugar >= L.sugar.value ? 'red' : m >= 0.8 ? 'amber' : 'green'; }
  window.ultraStatus = ultraStatus;
  const BADGE = { green: 'Within your limits', amber: 'Close to a limit', red: 'Over a limit today' };
  const _vm = V.meals; V.meals = (...a) => { const h = _vm(...a); if (!uOn()) return h; const st = ultraStatus();
    return h.replace(/(<h1>Nutrition<\/h1>)/, `$1<button class="ul-badge ${st}" id="ulbadge" aria-label="Ultra-Health: ${BADGE[st]}" onclick="push('ultra')">🛡 Ultra-Health</button>`); };
  function bodyCard() { const L = ultraLimits(), bp = L.bp, g = L.glu?.fasting, out = [];
    if (bp && (bp.sys >= 120 || bp.dia >= 80)) out.push(`<div class="tip"><b>Blood pressure ${bp.sys}/${bp.dia}</b> (average of ${bp.n}) · ${esc(bp.cat[0])}<br>Keep sodium under your ${L.sodium.value.toLocaleString('en-US')} mg limit, walk 10–15 min after meals and recheck in a week.${bp.sys >= 130 || bp.dia >= 80 ? ' If it stays at 130/80 or higher, talk to your doctor.' : ''}</div>`);
    if (g && g.v >= 100) out.push(`<div class="tip"><b>Fasting blood sugar ${g.v} mg/dL</b> (average of ${g.n})<br>${g.v >= 126 ? 'This is in the diabetes range — please see your doctor.' : 'This is in the prediabetes range (100–125).'} Cut added sugar, walk after meals and ask your doctor about an HbA1c test.</div>`);
    return out.length ? `<div class="card ul-body" id="ulbody"><b>🛡 Ultra-Health: readings to watch</b>${out.join('')}<small class="ul-cite">General wellness guidance, not medical advice.</small></div>` : ''; }
  const _vb = V.body; V.body = (...a) => { const h = _vb(...a); if (!uOn()) return h; const c = bodyCard(); return c ? afterTop(h, c) : h; };

  document.head.insertAdjacentHTML('beforeend', `<style>
  .ul-shift{display:block;background:var(--fill);border-radius:14px;padding:12px 14px;margin:0 0 var(--s2);font-size:14px;line-height:1.45}.ul-shift small{display:block;color:var(--ink-2);margin-top:4px}
  .ul-bed{background:var(--fill);border-radius:12px;padding:10px 12px;margin-top:var(--s1);font-size:14px}
  .ul-cite{display:block;color:var(--ink-2);font-size:11px;margin-top:6px;line-height:1.4}
  .ul-nudge .tip{margin-top:8px}.ul-body{margin-bottom:var(--s2)}.ul-body .tip{margin-top:8px}
  .ul-badge{margin-left:auto;margin-right:8px;min-height:44px;padding:0 12px;border-radius:999px;border:none;font-weight:700;font-size:13px;cursor:pointer;color:var(--ink)}
  .ul-badge.green{background:color-mix(in srgb,var(--good,#16a34a) 22%,var(--surface))}.ul-badge.amber{background:color-mix(in srgb,#f59e0b 28%,var(--surface))}.ul-badge.red{background:color-mix(in srgb,var(--accent,#e11d48) 26%,var(--surface))}
  </style>`);
  if (typeof render === 'function') render();
})();
