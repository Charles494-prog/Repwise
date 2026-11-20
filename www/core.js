// RepWise pure helpers shared by the app and Node unit tests (UMD).
(function (root) {
  'use strict';
  const iso = t => { const x = new Date(t); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
  const midnight = t => { const x = new Date(t); x.setHours(0, 0, 0, 0); return x.getTime(); };
  // Hardware step counter → per-day steps.
  // prev: {raw, at} from the last reading (or null on first install); total: counter now (steps since boot).
  // Returns {add: {day: steps}, next: {raw, at, day}}.
  //  - first reading: baseline only (we can't know what happened before install)
  //  - counter went down: the phone rebooted, so `total` steps happened since the reboot
  //  - long gaps (app killed): steps are spread over the elapsed time, day by day, instead of all landing today
  //  - implausible jumps are capped at 60,000 steps per day
  function stepAttribution(prev, total, now) {
    const next = { raw: total, at: now, day: iso(now) };
    if (!prev || prev.raw == null || !prev.at) return { add: {}, next };
    let delta = total >= prev.raw ? total - prev.raw : total;
    if (delta <= 0) return { add: {}, next };
    const add = {}, span = Math.max(1, now - prev.at);
    let t = prev.at;
    while (t < now) {
      const end = Math.min(now, midnight(t) + 864e5 + 1 * 0), seg = Math.min(now, end) - t, day = iso(t);
      add[day] = (add[day] || 0) + delta * seg / span;
      t = Math.min(now, end);
      if (seg <= 0) break;
    }
    for (const d of Object.keys(add)) add[d] = Math.min(60000, Math.round(add[d]));
    return { add, next };
  }
  // Blood pressure (AHA/ACC 2017) and glucose (ADA) categories → [label, severity 0-3]
  function bpCat(s, d) { return s >= 180 || d >= 120 ? ['Hypertensive crisis — get medical help now', 3] : s >= 140 || d >= 90 ? ['High (stage 2)', 2] : s >= 130 || d >= 80 ? ['High (stage 1)', 1] : s >= 120 ? ['Elevated', 1] : s < 90 || d < 60 ? ['Low', 1] : ['Normal', 0]; }
  function gluCat(v, c) {
    if (v < 70) return ['Low', 1];
    if (c === 'fasting') return v < 100 ? ['Normal', 0] : v < 126 ? ['Prediabetes range', 1] : ['Diabetes range', 2];
    if (c === 'after') return v < 140 ? ['Normal', 0] : v < 200 ? ['Prediabetes range', 1] : ['Diabetes range', 2];
    return v < 140 ? ['Normal', 0] : v < 200 ? ['High', 1] : ['Very high', 2];
  }
  // Added sugar (g) for a list of food entries; ingredient ids → fraction that is added sugar.
  const SUGARY = { sugar: 1, honey: 0.82, condensed_milk: 0.54, banana_ketchup: 0.2, softdrink: 0.106, green_tea_sweet: 0.075, coffee_3in1: 0.5, ice_cream: 0.21, cocoa_tablea: 0.1 };
  function addedSugar(entries) { let g = 0; for (const x of entries || []) { const items = x[6]?.items || [], m = x[6]?.mult || 1; for (const it of items) if (SUGARY[it.id]) g += it.g * SUGARY[it.id] * m; if (!items.length && /soft ?drink|coke|soda|juice|milk ?tea|halo/i.test(x[0])) g += (x[3] || 0) * 0.8; } return Math.round(g); }
  const e1rm = (w, r) => w * (1 + r / 30);   // Epley (same formula as the app)
  const API = { iso, midnight, stepAttribution, bpCat, gluCat, addedSugar, SUGARY, e1rm };
  root.RWCore = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
