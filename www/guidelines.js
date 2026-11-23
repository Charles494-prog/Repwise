// RepWise Ultra-Health guidelines: every limit and recommended intake the app uses, in ONE place, with its source.
// Pure data (UMD) — read by health.js (the rules) and the app; unit-tested in test/health.test.js.
// To adjust a number, change it here; the source line next to it says where it comes from.
(function (root) {
  'use strict';
  const G = {
    version: '2026-11',
    disclaimer: 'Ultra-Health Mode gives general wellness guidance, not medical advice. It does not diagnose or treat any condition. ' +
      'Talk to your doctor before changing your diet if you have a health condition, take medicine, are pregnant or breastfeeding.',

    // Daily calories the % limits are based on: your RepWise calorie target (Mifflin–St Jeor × activity ± goal).
    energy: { source: 'Mifflin et al., 1990, Am J Clin Nutr (same formula as the app calorie target)' },

    // ---------- Daily limits ----------
    // pctKcal limits: grams = calories × pct ÷ kcalPerG. "strict" values apply when readings say so (see tighten).
    limits: {
      sugar: { label: 'Added sugar', unit: 'g', pctKcal: 0.10, strictPctKcal: 0.05, kcalPerG: 4, capBySex: { m: 36, f: 25 },
        source: 'WHO Guideline: Sugars intake for adults and children (2015) — under 10% of calories, ideally under 5%; AHA (Johnson et al., 2009, Circulation) — at most 36 g/day for men, 25 g/day for women. The lower of the two is used.' },
      sat: { label: 'Saturated fat', unit: 'g', pctKcal: 0.10, strictPctKcal: 0.06, kcalPerG: 9,
        source: 'WHO Guideline: Saturated fatty acid and trans-fatty acid intake (2023) — under 10% of calories; DASH eating plan (NHLBI) and AHA/ACC 2013 lifestyle guideline — 5–6% of calories when blood pressure or LDL needs lowering.' },
      fat: { label: 'Total fat', unit: 'g', pctKcal: 0.30, strictPctKcal: 0.27, kcalPerG: 9,
        source: 'WHO Healthy diet fact sheet (2020) — total fat at most 30% of calories; DASH eating plan (NHLBI) — 27% of calories.' },
      sodium: { label: 'Sodium', unit: 'mg', mg: 2000, strictMg: 1500,
        source: 'WHO Guideline: Sodium intake for adults and children (2012) — under 2,000 mg/day (5 g salt); AHA — ideally at most 1,500 mg/day, especially with high blood pressure (Whelton et al., 2018, Hypertension).' },
      chol: { label: 'Cholesterol', unit: 'mg', mg: 300, strictMg: 200,
        source: 'AHA / NCEP ATP III — under 300 mg/day, under 200 mg/day with diabetes or high LDL (TLC diet). The US Dietary Guidelines 2020–2025 dropped the number but advise eating as little as possible.' },
    },

    // ---------- When readings tighten the limits ----------
    tighten: {
      bp: { last: 5, min: 3, sys: 130, dia: 80, // average of the last 5 readings in stage 1 or higher
        sets: { sodium: 'strict', sat: 'strict', fat: 'strict' },
        source: 'AHA/ACC 2017 blood pressure guideline (stage 1 = 130–139 or 80–89); DASH-Sodium trial (Sacks et al., 2001, NEJM).' },
      glucose: { last: 5, min: 2, fasting: 100, after: 140, // average fasting (or 2 h after meal) readings in the prediabetes range or higher
        sets: { sugar: 'strict' }, diabetesSets: { sugar: 'strict', chol: 'strict' },
        source: 'ADA Standards of Care 2024 — fasting 100–125 mg/dL or 2 h 140–199 mg/dL = prediabetes range, 126+ / 200+ = diabetes range; WHO 2015 (added sugar under 5% of calories).' },
      carbNote: 'Carbs: no single ideal amount — fill half the plate with vegetables, choose brown rice, oats, monggo and other high-fiber carbs, and keep white rice to about 1 cup a meal (ADA Standards of Care 2024, section 5).',
    },

    // ---------- Hydration & sleep (Ultra-Health extras) ----------
    water: { bonusPct: 0.15, source: 'EFSA 2010 adequate water intake (2.5 L men / 2.0 L women from all sources). The +15% in Ultra-Health Mode is a RepWise choice for hot climates and training days.' },
    sleep: { min: 7, max: 9, source: 'AASM / Sleep Research Society consensus (Watson et al., 2015, Sleep) — adults need 7–9 h.' },

    // ---------- Recommended intakes (deficiency check) ----------
    // Per sex: [[age below, amount], ...]. perKg = amount per kg of body weight.
    intakes: {
      fib: { label: 'Fiber', unit: 'g', m: [[51, 38], [200, 30]], f: [[51, 25], [200, 21]], source: 'IOM Dietary Reference Intakes 2005 (adequate intake)' },
      p: { label: 'Protein', unit: 'g', perKg: 0.8, source: 'IOM Dietary Reference Intakes 2005 (RDA, the minimum — your training target is higher)' },
      k: { label: 'Potassium', unit: 'mg', m: [[200, 3400]], f: [[200, 2600]], source: 'NASEM 2019 (adequate intake)' },
      ca: { label: 'Calcium', unit: 'mg', m: [[71, 1000], [200, 1200]], f: [[51, 1000], [200, 1200]], source: 'IOM 2011 (RDA)' },
      fe: { label: 'Iron', unit: 'mg', m: [[200, 8]], f: [[51, 18], [200, 8]], source: 'IOM 2001 (RDA)' },
      mg: { label: 'Magnesium', unit: 'mg', m: [[31, 400], [200, 420]], f: [[31, 310], [200, 320]], source: 'IOM 1997 (RDA)' },
      zn: { label: 'Zinc', unit: 'mg', m: [[200, 11]], f: [[200, 8]], source: 'IOM 2001 (RDA)' },
      va: { label: 'Vitamin A', unit: 'µg', m: [[200, 900]], f: [[200, 700]], source: 'IOM 2001 (RDA)' },
      vc: { label: 'Vitamin C', unit: 'mg', m: [[200, 90]], f: [[200, 75]], source: 'IOM 2000 (RDA)' },
      vd: { label: 'Vitamin D', unit: 'µg', m: [[71, 15], [200, 20]], f: [[71, 15], [200, 20]], source: 'IOM 2011 (RDA)' },
      b12: { label: 'Vitamin B12', unit: 'µg', m: [[200, 2.4]], f: [[200, 2.4]], source: 'IOM 1998 (RDA)' },
      fol: { label: 'Folate', unit: 'µg', m: [[200, 400]], f: [[200, 400]], source: 'IOM 1998 (RDA)' },
    },
    // A nutrient is "consistently low" when it is under lowPct of the recommended intake on at least daysPct of logged days.
    deficiency: { minDays: 5, window: 14, lowPct: 0.7, daysPct: 0.7 },

    // ---------- When to see a doctor ----------
    doctor: { bpUrgent: [180, 120], bpSee: [140, 90], gluFasting: 126, gluAny: 200, gluLow: 70, gluVeryLow: 54,
      source: 'AHA/ACC 2017 (180/120 = hypertensive crisis; stage 2 needs a medical review); ADA Standards of Care 2024 (fasting 126+ or any 200+ mg/dL; under 54 mg/dL = serious low).' },
    // Trend warnings: over a limit on at least `days` of the last 7 logged days; readings rising by at least these amounts.
    trends: { days: 3, of: 7, bpRise: 5, gluRise: 7 },
  };
  // Recommended intake of nutrient k for a profile ({sex, age, weight}).
  G.intake = (k, p) => { const r = G.intakes[k]; if (!r) return null; if (r.perKg) return Math.round(r.perKg * (p.weight || 70));
    const rows = r[p.sex === 'f' ? 'f' : 'm'], age = p.age || 30; for (const [below, v] of rows) if (age < below) return v; return rows[rows.length - 1][1]; };
  root.RWGuide = G;
  if (typeof module !== 'undefined' && module.exports) module.exports = G;
})(typeof window !== 'undefined' ? window : globalThis);
