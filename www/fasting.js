// RepWise fasting rules (UMD, unit-tested): is a meal inside the eating window?
// The window is fixed by your settings: it opens at `start` (hours, e.g. 12 or 12.5) and stays open for `eatH` hours.
// Both ends count as inside (eating at the exact closing minute is fine). Windows may cross midnight.
(function (root) {
  'use strict';
  const DAY = 1440;
  const eatHours = proto => 24 - (parseInt(String(proto).split(':')[0], 10) || 16);
  const minsOfDay = t => { const d = new Date(t); return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60; };
  // classify(time, start, eatH, graceMin) →
  //   inside:  { inWindow: true, minsAfterOpen, minsToClose, late }   (late = broke the fast more than graceMin after opening)
  //   outside: { inWindow: false, side: 'before' | 'after', minsUntilOpen, minsAfterClose }
  function classify(t, start, eatH, graceMin = 60) {
    const len = Math.round(eatH * 60), into = ((minsOfDay(t) - start * 60) % DAY + DAY) % DAY;
    if (into <= len + 1e-9) return { inWindow: true, minsAfterOpen: into, minsToClose: len - into, late: into > graceMin };
    const minsAfterClose = into - len, minsUntilOpen = DAY - into;
    return { inWindow: false, side: minsUntilOpen <= minsAfterClose ? 'before' : 'after', minsUntilOpen, minsAfterClose };
  }
  // Only true out-of-window logs from the last 7 days count.
  const weekCount = (log, now) => (log || []).filter(x => x && x.out && x.ts > now - 7 * 864e5 && x.ts <= now).length;
  // Suggest moving the window toward when you actually eat: median miss, rounded to 30 min, at most 3 h.
  // Returns the new start hour, or null when the misses don't point one way.
  function suggestStart(log, now, start, eatH) {
    const offs = (log || []).filter(x => x && x.out && x.ts > now - 14 * 864e5).map(x => { const c = classify(x.ts, start, eatH); return c.inWindow ? 0 : c.side === 'after' ? c.minsAfterClose : -c.minsUntilOpen; }).filter(Boolean).sort((a, b) => a - b);
    if (offs.length < 2) return null; const med = offs[Math.floor(offs.length / 2)];
    const same = offs.filter(o => Math.sign(o) === Math.sign(med)).length / offs.length; if (same < 0.6) return null;
    const shift = Math.max(-180, Math.min(180, Math.round(med / 30) * 30)); if (!shift) return null;
    return ((start * 60 + shift) / 60 % 24 + 24) % 24;
  }
  // Old logs were [ts, hoursIntoFast] and included false breaks; re-check each against the window.
  function migrateLog(log, start, eatH) { return (log || []).map(x => { if (x && !Array.isArray(x) && typeof x === 'object') return x;
    const ts = Array.isArray(x) ? +x[0] : +x; if (!ts) return null; const c = classify(ts, start, eatH); return { ts, out: !c.inWindow, side: c.side || null }; }).filter(Boolean); }
  const API = { eatHours, minsOfDay, classify, weekCount, suggestStart, migrateLog };
  root.RWFast = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
