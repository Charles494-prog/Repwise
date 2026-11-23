// RepWise overall rank engine (pure, unit-tested). Input: plain data (workouts, food, fasting log, plan); output:
// points, current step, progress to next, per-component breakdown and a rank history (ups and downs).
(function (root) {
  'use strict';
  const RC = root.RWRankConfig || (typeof require === 'function' ? require('./rankconfig.js') : null);
  const iso = t => { const d = new Date(t); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const addDays = (d, n) => { const x = new Date(d + 'T12:00'); x.setDate(x.getDate() + n); return iso(x); };

  // Anti-gaming filters ------------------------------------------------------------------
  function validWorkouts(workouts, P) { const out = [];
    for (const w of [...(workouts || [])].sort((a, b) => a.ts - b.ts)) {
      const sets = (w.sets || []).filter(s => s && s.r > 0 && s.r <= P.maxReps && (s.w || 0) <= P.maxKg && (s.w || 0) >= 0);
      if (sets.length < P.minSets) continue;
      if (w.end && (w.end - w.ts) / 6e4 < P.minMinutes) continue;
      if (out.length && w.ts - out[out.length - 1].ts < P.dupWorkoutMs) continue; // duplicate
      out.push({ ...w, sets }); }
    return out; }
  function validFood(entries, P) { const seen = new Set(), out = [];
    for (const x of entries || []) { if (!Array.isArray(x) || !(x[1] > 0) || x[1] > P.maxKcalEntry) continue;
      const k = x[0] + '|' + x[1]; if (seen.has(k)) continue; seen.add(k); out.push(x); }
    return out; }

  // Daily components -----------------------------------------------------------------------
  // data: { workouts, food:{date:[entries]}, fastOn, fastLog:[{ts,out}], perWeek (planned sessions/week), kcalTarget, start (iso), today (iso) }
  function daily(data, cfg = RC.CONFIG) {
    const P = cfg.plausible, W = validWorkouts(data.workouts, P), byDay = {};
    for (const w of W) (byDay[iso(w.ts)] ??= []).push(w);
    const outDays = new Set((data.fastLog || []).filter(x => x && x.out).map(x => iso(x.ts)));
    const days = [], perWeek = Math.max(1, data.perWeek || 3), kcal = data.kcalTarget || 2000;
    const start = data.start || (W[0] ? iso(W[0].ts) : data.today), active = d => (byDay[d] || []).length > 0 || validFood((data.food || {})[d], P).length > 0;
    let streak = 0;
    for (let d = start; d <= data.today; d = addDays(d, 1)) {
      let done7 = 0, ov = 0, ex = 0; for (let k = 0; k < 7; k++) done7 += (byDay[addDays(d, -k)] || []).length;
      for (let k = 0; k < 14; k++) for (const w of byDay[addDays(d, -k)] || []) { const names = new Set(w.sets.map(s => s.ex)); ex += names.size; ov += new Set(w.sets.filter(s => s.pr || s.ov).map(s => s.ex)).size; }
      const f = validFood((data.food || {})[d], P), fk = f.reduce((s, x) => s + x[1], 0);
      streak = active(d) ? streak + 1 : 0;
      const c = {
        consistency: Math.min(1, done7 / perWeek),
        overload: ex ? Math.min(1, ov / ex * 2) : 0,          // beating half your exercises counts as full marks
        fasting: data.fastOn ? (f.length ? (outDays.has(d) ? 0.3 : 1) : 0) : null,
        logging: f.length >= 2 || fk >= kcal * 0.6 ? 1 : f.length ? 0.5 : 0,
        streak: Math.min(1, streak / 14),
      };
      days.push({ date: d, c, score: score(c, cfg) }); }
    return days; }
  function score(c, cfg = RC.CONFIG) { const w = { ...cfg.weights }; if (c.fasting == null) delete w.fasting;
    const tot = Object.values(w).reduce((a, b) => a + b, 0); let s = 0; for (const k in w) s += (w[k] / tot) * (c[k] || 0);
    return Math.min(cfg.dailyCap, Math.round(s * 100 * 10) / 10); }

  // Rank over time, with the demotion policy ------------------------------------------------
  const stepOf = (pts, S) => { let i = 0; while (i + 1 < S.length && pts >= S[i + 1].start) i++; return i; };
  function run(days, cfg = RC.CONFIG) { const S = RC.steps(cfg), D = cfg.demotion, hist = []; let pts = 0, low = 0, step = 0;
    days.forEach((x, i) => { pts += Math.min(cfg.dailyCap, x.score);
      const win = days.slice(Math.max(0, i - D.window + 1), i + 1), avg = win.reduce((s, y) => s + y.score, 0) / win.length;
      low = win.length >= D.window && avg < D.minAvg ? low + 1 : 0;
      let ns = stepOf(pts, S);
      if (low >= D.graceDays && ns > 0) { ns = Math.max(0, ns - D.dropTiers); pts = S[ns].start; low = 0; hist.push({ date: x.date, step: ns, name: S[ns].name, event: 'down' }); }
      else if (ns > step) hist.push({ date: x.date, step: ns, name: S[ns].name, event: 'up' });
      step = ns; });
    const cur = S[step], next = S[step + 1] || null;
    return { points: Math.round(pts), step, rank: cur, next, progress: next ? (pts - cur.start) / (next.start - cur.start) : 1, toNext: next ? Math.ceil(next.start - pts) : 0, history: hist, steps: S, lowDays: low }; }
  // Breakdown for "What moves my rank": average of each component over the last 14 days (0–100) and its weight.
  function breakdown(days, cfg = RC.CONFIG) { const last = days.slice(-14), out = {};
    for (const k of Object.keys(cfg.weights)) { const v = last.map(d => d.c[k]).filter(x => x != null);
      out[k] = { weight: cfg.weights[k], avg: v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length * 100) : null, explain: cfg.explain[k] }; }
    return out; }
  function compute(data, cfg = RC.CONFIG) { const days = daily(data, cfg), r = run(days, cfg);
    return { ...r, days, breakdown: breakdown(days, cfg), today: days.length ? days[days.length - 1].score : 0 }; }

  const API = { validWorkouts, validFood, daily, score, run, breakdown, compute, stepOf };
  root.RWRank = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
