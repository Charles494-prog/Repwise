// RepWise OVERALL rank — the one config file for the ladder, tiers, score formula, anti-gaming caps and demotion.
// Edit names, weights or thresholds here; nothing else hardcodes them. (Per-muscle XP ranks are separate.)
(function (root) {
  'use strict';
  const CONFIG = {
    // Lowest → highest. Every rank has tiers III, II, I except a `single` top rank.
    ladder: [
      { id: 'iron', name: 'Iron' }, { id: 'bronze', name: 'Bronze' }, { id: 'silver', name: 'Silver' }, { id: 'gold', name: 'Gold' },
      { id: 'platinum', name: 'Platinum' }, { id: 'diamond', name: 'Diamond' }, { id: 'master', name: 'Master' }, { id: 'grandmaster', name: 'Grandmaster' },
      { id: 'legend', name: 'Legend' }, { id: 'arnold', name: 'Arnold', single: true },
    ],
    tiers: ['III', 'II', 'I'],
    // Daily score (0–100) = 100 × Σ weight × component (each component 0–1). Weights sum to 1.
    // If fasting mode is off, its weight is shared out among the others in proportion.
    weights: { consistency: 0.35, overload: 0.20, fasting: 0.10, logging: 0.20, streak: 0.15 },
    // What each component means (shown on "What moves my rank").
    explain: {
      consistency: 'Workouts done vs. planned over the last 7 days',
      overload: 'Beating last time on your lifts (heavier or more reps) over the last 14 days',
      fasting: 'Days with no meals outside your eating window (only when fasting mode is on)',
      logging: 'Days you logged your food (2+ entries or most of your calories)',
      streak: 'Days in a row you trained or logged, up to 14',
    },
    dailyCap: 100,          // points per day can never exceed this — no grinding
    // Same names as the per-muscle ranks. Points needed to START each step (Iron III … Legend I, then Arnold); steps grow 12% each.
    // At ~60 points a day: Bronze in ~2 weeks, Gold in ~2.5 months, Diamond in ~6 months, Master ~9 months, Arnold in ~2 years.
    stepGrowth: 1.12, firstStep: 260,
    // Anti-gaming: logs that don't count.
    plausible: { minSets: 3, minMinutes: 10, maxKg: 400, maxReps: 100, maxKcalEntry: 4000, dupWorkoutMs: 120000 },
    // Demotion: never instant. If the 14-day average daily score stays below `minAvg` for `graceDays` days
    // in a row, drop ONE tier (to the start of the tier below) and start counting again.
    demotion: { graceDays: 14, window: 14, minAvg: 20, dropTiers: 1 },
  };
  // Derived: list of steps [{rank, tier, name, start}] (27 tiered steps + Arnold).
  function steps(cfg = CONFIG) { const out = []; let start = 0, size = cfg.firstStep;
    for (const r of cfg.ladder) { const tiers = r.single ? [''] : cfg.tiers;
      for (const t of tiers) { out.push({ rank: r.id, tier: t, name: r.name + (t ? ' ' + t : ''), start: Math.round(start) }); start += size; size *= cfg.stepGrowth; } }
    return out; }
  const API = { CONFIG, steps };
  root.RWRankConfig = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
