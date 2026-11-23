// RepWise week planning: muscles actually trained, smart rescheduling with recovery time, and weekly muscle balance.
// Pure functions (UMD) so the rules are unit-tested in Node; the app layer (weekplan.js) supplies the data.
//
// A week is 7 day slots (Mon = 0). A slot is null (rest) or { prog, st, drop?, from?, orig? }:
//   st: 'planned' | 'moved' (put here by a reschedule) | 'covered' (its muscles were already trained) | 'skipped' (dropped this week)
//   drop: muscles already trained earlier this week; their exercises are left out of that day's workout.
(function (root) {
  'use strict';
  const DEFAULTS = { recoveryH: 48, maxFreq: 3, maxSets: 20, thr: 2, warn: true };

  // Effective sets per muscle: a primary set counts 1, a secondary set ½ (the same weighting as XP).
  function muscleSets(sets, EX) { const o = {}; for (const s of sets || []) { const d = EX[s.ex]; if (!d) continue;
    for (const m of d[0]) o[m] = (o[m] || 0) + 1; for (const m of d[1]) if (!d[0].includes(m)) o[m] = (o[m] || 0) + 0.5; } return o; }
  // A muscle counts as trained in a session at `thr` or more effective sets (default 2).
  const trained = (sets, EX, thr = DEFAULTS.thr) => Object.entries(muscleSets(sets, EX)).filter(([, v]) => v >= thr).map(([m]) => m);

  const active = x => x && (x.st === 'planned' || x.st === 'moved');
  const slotMuscles = (x, musc) => active(x) ? musc(x.prog).filter(m => !(x.drop || []).includes(m)) : [];
  const clone = days => days.map(x => x && { ...x, drop: x.drop ? [...x.drop] : undefined });

  // Hours between same-muscle sessions if `muscles` were trained on day j, given what's done (history) and planned.
  // history: [{ day, muscles }] with day relative to this Monday (negative = last week).
  function shortestGap(j, muscles, days, history, musc, skip = -1) { let min = Infinity;
    const ev = [...history, ...days.map((x, k) => k === j || k === skip ? null : { day: k, muscles: slotMuscles(x, musc) }).filter(Boolean)];
    for (const e of ev) if (e.muscles.some(m => muscles.includes(m))) min = Math.min(min, Math.abs(j - e.day) * 24);
    return min; }
  const fits = (j, muscles, days, history, musc, recoveryH, skip) => shortestGap(j, muscles, days, history, musc, skip) >= recoveryH;

  // Earliest free day after `after` (a rest day or a day freed by coverage) that respects recovery for every muscle.
  function findSlot(prog, after, days, history, musc, recoveryH) { const mus = musc(prog);
    for (let j = after + 1; j < 7; j++) if ((!days[j] || days[j].st === 'covered' || days[j].st === 'skipped') && fits(j, mus, days, history, musc, recoveryH)) return j;
    return -1; }
  // When nothing fits: the best free day anyway (longest gap) and planned days it could swap with (both still fit).
  function options(prog, after, days, history, musc, recoveryH) { const mus = musc(prog); let anyway = -1, best = -1;
    for (let j = after + 1; j < 7; j++) if (!days[j] || !active(days[j])) { const g = shortestGap(j, mus, days, history, musc); if (g > best) { best = g; anyway = j; } }
    const swaps = [];
    for (let j = after + 1; j < 7; j++) { if (!active(days[j]) || days[j].prog === prog) continue;
      const t = clone(days); t[j] = { prog, st: 'moved' }; const other = days[j], hereOk = fits(j, mus, t, history, musc, recoveryH);
      // the swapped-out session goes to the next free day that fits, if any
      const k = hereOk ? findSlot(other.prog, after, t, history, musc, recoveryH) : -1; if (k >= 0) swaps.push({ day: j, prog: other.prog, to: k }); }
    return { anyway, gapH: best, swaps }; }

  // Called after a workout on day `ti` that wasn't what the plan said (or on a rest day).
  //   did: what was trained (muscles that reached the threshold); plannedDone: true if it matched the plan.
  // Returns { days, changes } — changes: moved / covered / adjusted / unplaced (needs the user's choice).
  function reschedule({ days, ti, did, history = [], musc, recoveryH = DEFAULTS.recoveryH }) {
    const out = clone(days), changes = [], today = days[ti], plan = active(today) ? today : null, planM = plan ? slotMuscles(plan, musc) : [];
    const didSet = new Set(did);
    // Matching the plan (most of its muscles trained) needs no changes.
    const missedM = planM.filter(m => !didSet.has(m));
    if (plan && missedM.length <= planM.length / 2) return { days: out, changes };
    // 1) Coverage: each muscle trained today that wasn't planned stands in for its NEXT planned session this week.
    for (const m of did) { if (planM.includes(m)) continue;
      for (let j = ti + 1; j < 7; j++) { const x = out[j]; if (!active(x)) continue; if (slotMuscles(x, musc).includes(m)) { (x.drop ??= []).push(m); break; } } }
    for (let j = ti + 1; j < 7; j++) { const x = out[j], was = days[j]; if (!x || !active(was) || !x.drop || x.drop.length === (was.drop || []).length) continue;
      const left = musc(x.prog).filter(m => !x.drop.includes(m)), newly = x.drop.filter(m => !(was.drop || []).includes(m));
      if (!left.length) { x.st = 'covered'; changes.push({ type: 'covered', day: j, prog: x.prog, by: newly }); }
      else changes.push({ type: 'adjusted', day: j, prog: x.prog, drop: newly, left }); }
    // 2) Today's planned session wasn't done: it moves to the next sensible day.
    if (plan) { out[ti] = { ...plan, st: 'skipped', replaced: true };
      const hist = [...history, { day: ti, muscles: did }], j = findSlot(plan.prog, ti, out, hist, musc, recoveryH);
      if (j >= 0) { out[j] = { prog: plan.prog, st: 'moved', from: ti, ...(plan.drop?.length ? { drop: [...plan.drop] } : {}), ...(out[j] ? { over: out[j].prog } : {}) }; changes.push({ type: 'moved', prog: plan.prog, from: ti, to: j }); }
      else changes.push({ type: 'unplaced', prog: plan.prog, from: ti, after: ti, ...options(plan.prog, ti, out, hist, musc, recoveryH) }); }
    return { days: out, changes };
  }
  // A planned day that passed with no workout: move it like a replaced day, without any coverage.
  function missed({ days, di, after, history = [], musc, recoveryH = DEFAULTS.recoveryH }) {
    const out = clone(days), x = days[di]; if (!active(x)) return { days: out, changes: [] };
    out[di] = { ...x, st: 'skipped', missed: true };
    const j = findSlot(x.prog, Math.max(di, after), out, history, musc, recoveryH);
    if (j >= 0) { out[j] = { prog: x.prog, st: 'moved', from: di, ...(x.drop?.length ? { drop: [...x.drop] } : {}) }; return { days: out, changes: [{ type: 'moved', prog: x.prog, from: di, to: j, missed: true }] }; }
    return { days: out, changes: [{ type: 'unplaced', prog: x.prog, from: di, missed: true, after: Math.max(di, after), ...options(x.prog, Math.max(di, after), out, history, musc, recoveryH) }] };
  }
  // Apply the user's choice for an unplaced session: 'drop' | {anyway: day} | {swap: day}.
  function place(days, change, choice, history, musc, recoveryH = DEFAULTS.recoveryH) { const out = clone(days), p = change.prog, after = Math.max(change.from, change.after ?? change.from);
    if (choice === 'drop') return { days: out, changes: [{ type: 'dropped', prog: p, from: change.from }] };
    if (choice.anyway != null) { if (active(out[choice.anyway]) || choice.anyway <= after) return { days: clone(days), changes: [] }; out[choice.anyway] = { prog: p, st: 'moved', from: change.from, ...(out[choice.anyway] ? { over: out[choice.anyway].prog } : {}) }; return { days: out, changes: [{ type: 'moved', prog: p, from: change.from, to: choice.anyway, tight: true }] }; }
    if (choice.swap != null) { const j = choice.swap, other = out[j]; if (!active(other) || j <= after) return { days: clone(days), changes: [] }; out[j] = { prog: p, st: 'moved', from: change.from };
      const k = findSlot(other.prog, after, out, history, musc, recoveryH); if (k < 0) return { days: clone(days), changes: [] };
      out[k] = { prog: other.prog, st: 'moved', from: j }; return { days: out, changes: [{ type: 'moved', prog: p, from: change.from, to: j }, { type: 'moved', prog: other.prog, from: j, to: k }] }; }
    return { days: out, changes: [] };
  }
  // Move one planned session by hand (edit). Returns null if the target isn't free.
  function moveSession(days, from, to) { if (!active(days[from]) || from === to || active(days[to])) return null; const out = clone(days), orig = out[from].st === 'moved' && out[from].from != null ? out[from].from : from;
    out[to] = { ...out[from], st: 'moved', from: orig }; out[from] = null; return out; }

  // ---------- weekly balance ----------
  // load: { muscle: { sessions, sets } } from this week's workouts (a session counts for a muscle at ≥ thr effective sets).
  function weekLoad(workouts, EX, thr = DEFAULTS.thr) { const o = {};
    for (const w of workouts) { const ms = muscleSets(w.sets, EX); for (const [m, v] of Object.entries(ms)) { const x = o[m] ??= { sessions: 0, sets: 0 }; x.sets += v; if (v >= thr) x.sessions++; } }
    return o; }
  // Warnings for training `muscles` (with `addSets` effective sets each) now; empty = fine.
  function warnings(load, muscles, cfg = {}, addSets = {}) { const c = { ...DEFAULTS, ...cfg }, out = [];
    for (const m of muscles) { const x = load[m] || { sessions: 0, sets: 0 };
      if (x.sessions >= c.maxFreq) out.push({ m, kind: 'freq', sessions: x.sessions, sets: x.sets });
      else if (x.sets + (addSets[m] || 0) > c.maxSets) out.push({ m, kind: 'sets', sessions: x.sessions, sets: x.sets }); }
    return out; }
  // Muscles in this week's plan that haven't been trained yet.
  const notTrained = (load, planned) => planned.filter(m => !(load[m]?.sessions > 0));
  // "Quads, Hamstrings, Glutes" → "legs" etc. for friendlier reminders.
  function friendly(list) { const L = list.map(m => m.toLowerCase()), has = a => a.every(x => L.includes(x)); let out = [...L];
    if (has(['quads', 'hamstrings', 'glutes'])) { out = out.filter(x => !['quads', 'hamstrings', 'glutes', 'calves'].includes(x)); out.push('legs'); }
    return out; }

  const API = { DEFAULTS, muscleSets, trained, active, slotMuscles, shortestGap, findSlot, options, reschedule, missed, place, moveSession, weekLoad, warnings, notTrained, friendly };
  root.RWPlan = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
