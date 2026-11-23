// Overall rank: config, tier boundaries, daily score, anti-gaming and the demotion policy.
const test = require('node:test'), assert = require('node:assert/strict');
const RC = require('../www/rankconfig.js'), R = require('../www/rankscore.js');
const iso = t => { const d = new Date(t); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const day0 = new Date(2026, 0, 5, 18).getTime(), D = n => day0 + n * 864e5;
const wk = (n, opts = {}) => ({ ts: D(n), end: D(n) + 50 * 6e4, prog: 'push', sets: Array.from({ length: opts.sets ?? 9 }, (_, i) => ({ ex: 'E' + (i % 3), w: opts.w ?? 50, r: opts.r ?? 8, pr: !!opts.pr && i < 3 })) });
const food = (n, k = 2) => ({ [iso(D(n))]: Array.from({ length: k }, (_, i) => ['Meal ' + i, 600, 40, 60, 20, 5]) });

test('ladder: 10 ranks matching the muscle ranks, 3 tiers each except Arnold (28 steps), thresholds strictly increasing', () => {
  const S = RC.steps(); assert.equal(S.length, 28);
  assert.deepEqual(RC.CONFIG.ladder.map(r => r.name), ['Iron', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Master', 'Grandmaster', 'Legend', 'Arnold']);
  assert.deepEqual(S.slice(0, 4).map(s => s.name), ['Iron III', 'Iron II', 'Iron I', 'Bronze III']);
  assert.equal(S.at(-1).name, 'Arnold'); assert.equal(S.at(-2).name, 'Legend I');
  for (let i = 1; i < S.length; i++) assert.ok(S[i].start > S[i - 1].start);
  assert.equal(Math.abs(Object.values(RC.CONFIG.weights).reduce((a, b) => a + b, 0) - 1) < 1e-9, true);
});

test('tier boundaries: exactly at a threshold is the new tier, one point below is the old one', () => {
  const S = RC.steps();
  for (const i of [1, 3, 9, 27]) { assert.equal(R.stepOf(S[i].start, S), i); assert.equal(R.stepOf(S[i].start - 1, S), i - 1); }
  assert.equal(R.stepOf(1e9, S), 27); assert.equal(R.stepOf(0, S), 0);
});

test('daily score: weights apply; fasting weight is shared out when fasting is off; capped at 100', () => {
  const full = { consistency: 1, overload: 1, fasting: 1, logging: 1, streak: 1 };
  assert.equal(R.score(full), 100);
  assert.equal(R.score({ ...full, fasting: null }), 100);
  assert.equal(R.score({ consistency: 1, overload: 0, fasting: null, logging: 0, streak: 0 }), Math.round(0.35 / 0.9 * 1000) / 10);
  assert.equal(R.score({ consistency: 0, overload: 0, fasting: 0, logging: 1, streak: 0 }), 20);
});

test('a consistent month (4 workouts/week + food logged daily) climbs out of Iron; doing nothing stays at Iron III', () => {
  const workouts = [], f = {}; for (let n = 0; n < 30; n++) { if ([0, 1, 3, 4].includes(n % 7)) workouts.push(wk(n, { pr: n % 2 === 0 })); Object.assign(f, food(n)); }
  const r = R.compute({ workouts, food: f, perWeek: 4, kcalTarget: 2000, start: iso(D(0)), today: iso(D(29)) });
  assert.ok(r.step >= 3, `step ${r.step} ${r.points}`); assert.ok(r.history.some(h => h.event === 'up'));
  assert.ok(r.breakdown.consistency.avg >= 90 && r.breakdown.logging.avg === 100);
  const none = R.compute({ workouts: [], food: {}, perWeek: 4, start: iso(D(0)), today: iso(D(29)) });
  assert.equal(none.step, 0); assert.equal(none.points, 0);
});

test('hard to game: implausible, too-short and duplicate workouts and junk food logs do not count; daily cap holds', () => {
  const P = RC.CONFIG.plausible;
  const bad = [wk(0, { sets: 2 }), { ...wk(1), end: D(1) + 3 * 6e4 }, wk(2, { w: 900 }), wk(3), { ...wk(3), ts: D(3) + 30000 }];
  const v = R.validWorkouts(bad, P); assert.equal(v.length, 1); assert.equal(v[0].ts, D(3));
  assert.equal(R.validFood([['x', 9000, 1], ['a', 500, 30], ['a', 500, 30], 'junk'], P).length, 1);
  // 100 workouts on one day still give at most 100 points that day
  const spam = Array.from({ length: 100 }, (_, i) => ({ ...wk(0), ts: D(0) + i * 3e5 }));
  const r = R.compute({ workouts: spam, food: food(0, 5), perWeek: 1, start: iso(D(0)), today: iso(D(0)) });
  assert.ok(r.points <= RC.CONFIG.dailyCap);
});

test('demotion: no instant drop; 14 low days in a row (after the 14-day window) drop exactly one tier', () => {
  const S = RC.steps(), cfg = RC.CONFIG;
  const good = Array.from({ length: 40 }, (_, i) => ({ date: 'g' + i, score: 90, c: {} }));
  const up = R.run(good); assert.ok(up.step >= 3);
  const lowFew = R.run([...good, ...Array.from({ length: 20 }, (_, i) => ({ date: 'l' + i, score: 0, c: {} }))]);
  assert.ok(!lowFew.history.some(h => h.event === 'down'), 'avg needs to fall below the line first, then 14 days of grace');
  const lowMany = R.run([...good, ...Array.from({ length: 60 }, (_, i) => ({ date: 'l' + i, score: 0, c: {} }))]);
  const downs = lowMany.history.filter(h => h.event === 'down'); assert.ok(downs.length >= 1);
  const firstDown = downs[0], before = lowMany.history.filter(h => h.event === 'up').at(-1).step;
  assert.equal(firstDown.step, before - cfg.demotion.dropTiers); assert.equal(lowMany.steps[firstDown.step].name, S[firstDown.step].name);
  // a single bad day never demotes
  const blip = R.run([...good, { date: 'x', score: 0, c: {} }, ...good]); assert.ok(!blip.history.some(h => h.event === 'down'));
});
