// Smart rescheduling (recovery time, coverage, moving sessions) and weekly muscle balance warnings.
const test = require('node:test'), assert = require('node:assert/strict');
const P = require('../www/schedule.js');

const M = { legs: ['Quads', 'Hamstrings', 'Glutes', 'Calves', 'Core'], push: ['Chest', 'Shoulders', 'Triceps'], pull: ['Back', 'Biceps'],
  arnchest: ['Chest', 'Back'], arnshar: ['Shoulders', 'Biceps', 'Triceps'], arms: ['Biceps', 'Triceps'], upper: ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps'], lower: ['Quads', 'Hamstrings', 'Glutes', 'Calves', 'Core'] };
const musc = k => M[k] || [];
const day = prog => ({ prog, st: 'planned' });
const EX = { 'Barbell Curl': [['Biceps'], ['Forearms']], 'Tricep Pushdown': [['Triceps'], []], 'Barbell Row': [['Back'], ['Biceps', 'Forearms']], 'Squat': [['Quads', 'Glutes'], ['Core']], 'Lateral Raise': [['Shoulders'], []] };
const sets = (ex, n) => Array.from({ length: n }, () => ({ ex, w: 10, r: 10 }));

test('muscles actually trained: primary sets count 1, secondary ½; trained at ≥ 2 effective sets', () => {
  const s = [...sets('Barbell Curl', 3), ...sets('Barbell Row', 2)];
  assert.deepEqual(P.muscleSets(s, EX), { Biceps: 4, Forearms: 2.5, Back: 2 });
  assert.deepEqual(P.trained(s, EX).sort(), ['Back', 'Biceps', 'Forearms']);
  assert.deepEqual(P.trained(sets('Barbell Row', 3), EX), ['Back']); // biceps only 1.5 effective sets → not trained
});

test('your example: Monday Legs → did Biceps + Triceps at home. Legs moves to the next day that fits; Thursday arms are covered', () => {
  // Arnold-style week: Mon Legs, Tue Chest & Back, Wed rest, Thu Shoulders & Arms, Fri Legs? no — Fri rest, Sat Chest & Back, Sun rest
  const days = [day('legs'), day('arnchest'), null, day('arms'), null, day('arnchest'), null];
  const r = P.reschedule({ days, ti: 0, did: ['Biceps', 'Triceps'], musc, recoveryH: 48 });
  assert.equal(r.days[3].st, 'covered');
  assert.deepEqual(r.changes.find(c => c.type === 'covered'), { type: 'covered', day: 3, prog: 'arms', by: ['Biceps', 'Triceps'] });
  // Wed (2) is free and ≥ 48 h from any other legs session → Legs moves there.
  assert.deepEqual(r.changes.find(c => c.type === 'moved'), { type: 'moved', prog: 'legs', from: 0, to: 2 });
  assert.equal(r.days[2].prog, 'legs'); assert.equal(r.days[2].st, 'moved'); assert.equal(r.days[0].st, 'skipped');
});

test('partial coverage adjusts the later day instead: shoulders & arms keeps shoulders, drops arms', () => {
  const days = [day('legs'), day('arnchest'), null, day('arnshar'), null, null, null];
  const r = P.reschedule({ days, ti: 0, did: ['Biceps', 'Triceps'], musc });
  assert.equal(r.days[3].st, 'planned'); assert.deepEqual(r.days[3].drop, ['Biceps', 'Triceps']);
  assert.deepEqual(r.changes.find(c => c.type === 'adjusted'), { type: 'adjusted', day: 3, prog: 'arnshar', drop: ['Biceps', 'Triceps'], left: ['Shoulders'] });
  assert.deepEqual(P.slotMuscles(r.days[3], musc), ['Shoulders']);
});

test('PPL: arms at home cover triceps on Push and biceps on Pull (each muscle only its next session)', () => {
  const days = [day('legs'), day('push'), day('pull'), null, day('legs'), day('push'), day('pull')];
  const r = P.reschedule({ days, ti: 0, did: ['Biceps', 'Triceps'], musc });
  assert.deepEqual(r.days[1].drop, ['Triceps']); assert.deepEqual(r.days[2].drop, ['Biceps']);
  assert.equal(r.days[5].drop, undefined); assert.equal(r.days[6].drop, undefined);
});

test('recovery: a moved session never lands within the recovery window of the same muscles', () => {
  // Legs again on Fri (4): Wed (2) is only 48 h before it — fine at 48 h, not at 72 h.
  const days = [day('legs'), day('push'), null, day('pull'), day('legs'), null, null];
  const a = P.reschedule({ days, ti: 0, did: ['Biceps', 'Triceps'], musc, recoveryH: 48 });
  assert.equal(a.changes.find(c => c.type === 'moved').to, 2);
  const b = P.reschedule({ days, ti: 0, did: ['Biceps', 'Triceps'], musc, recoveryH: 72 });
  // 72 h: Wed is 2 days from Fri, Sat/Sun are 1–2 days after Fri → nothing fits; Fri's legs already covers the week.
  const u = b.changes.find(c => c.type === 'unplaced'); assert.ok(u); assert.equal(u.prog, 'legs');
  for (const j of [2, 5, 6]) assert.ok(P.shortestGap(j, M.legs, b.days, [], musc) < 72);
});

test('recovery counts what you trained before this week and today', () => {
  // Trained legs last Sunday (day -1). Mon was Push but you did legs-free arms; moving Push to Tue would be fine,
  // but history says chest was trained on Sun too (day -1) → with 72 h, Tue (1) is too close; Wed (2) works.
  const days = [day('push'), null, null, day('legs'), null, null, null];
  const r = P.reschedule({ days, ti: 0, did: ['Biceps'], history: [{ day: -1, muscles: ['Chest'] }], musc, recoveryH: 72 });
  assert.equal(r.changes.find(c => c.type === 'moved').to, 2);
});

test('doing what was planned (or most of it) changes nothing', () => {
  const days = [day('push'), day('pull'), null, day('legs'), null, null, null];
  assert.deepEqual(P.reschedule({ days, ti: 0, did: ['Chest', 'Shoulders', 'Triceps'], musc }).changes, []);
  assert.deepEqual(P.reschedule({ days, ti: 0, did: ['Chest', 'Shoulders'], musc }).changes, []); // 2 of 3
});

test('training on a rest day: no session moves, later sessions with those muscles are covered / adjusted', () => {
  const days = [day('push'), null, day('pull'), null, day('legs'), null, null];
  const r = P.reschedule({ days, ti: 1, did: ['Back', 'Biceps'], musc });
  assert.equal(r.days[2].st, 'covered'); assert.ok(!r.changes.some(c => c.type === 'moved' || c.type === 'unplaced'));
});

test('no free day that fits → the user is asked: drop it, put it on a day anyway, or swap', () => {
  const days = [day('legs'), day('push'), day('pull'), day('legs'), day('push'), day('pull'), null];
  const r = P.reschedule({ days, ti: 0, did: ['Biceps', 'Triceps'], musc, recoveryH: 96 }); // Sun is only 72 h after Thu's legs
  const u = r.changes.find(c => c.type === 'unplaced'); assert.ok(u);
  assert.equal(typeof u.anyway, 'number'); assert.ok(Array.isArray(u.swaps));
  const drop = P.place(r.days, u, 'drop', [], musc); assert.deepEqual(drop.changes, [{ type: 'dropped', prog: 'legs', from: 0 }]);
  const any = P.place(r.days, u, { anyway: u.anyway }, [], musc); assert.equal(any.days[u.anyway].prog, 'legs'); assert.ok(any.changes[0].tight);
});

test('missed day (no workout at all) moves to the next day that fits', () => {
  const days = [day('legs'), null, day('push'), null, day('pull'), null, null];
  const r = P.missed({ days, di: 0, after: 1, musc }); // it's Tuesday now
  assert.deepEqual(r.changes, [{ type: 'moved', prog: 'legs', from: 0, to: 3, missed: true }]); // Tue would be today; Wed has push… legs → Thu (3)? Wed (2) is taken
  assert.equal(r.days[0].st, 'skipped');
});

test('manual move: only to a free day', () => {
  const days = [day('legs'), null, day('push'), null, null, null, null];
  assert.equal(P.moveSession(days, 0, 2), null);
  const d = P.moveSession(days, 0, 3); assert.equal(d[3].prog, 'legs'); assert.equal(d[0], null);
});

test('weekly balance: sessions and sets per muscle; warns at the 4th biceps session (3 already) and past 20 sets', () => {
  const wk = [{ sets: sets('Barbell Curl', 3) }, { sets: [...sets('Barbell Row', 4)] }, { sets: sets('Barbell Curl', 1) }, { sets: sets('Barbell Curl', 4) }];
  const L = P.weekLoad(wk, EX);
  assert.equal(L.Biceps.sessions, 3); // 3, 4×½=2, (1 = not a session), 4
  assert.equal(L.Biceps.sets, 3 + 2 + 1 + 4);
  assert.deepEqual(P.warnings(L, ['Biceps', 'Triceps']), [{ m: 'Biceps', kind: 'freq', sessions: 3, sets: 10 }]);
  assert.deepEqual(P.warnings(L, ['Biceps'], { maxFreq: 5 }), []);
  assert.deepEqual(P.warnings(L, ['Biceps'], { maxFreq: 5, maxSets: 12 }, { Biceps: 4 }), [{ m: 'Biceps', kind: 'sets', sessions: 3, sets: 10 }]);
});

test('missed-muscle reminder lists only planned muscles, with legs grouped', () => {
  const L = P.weekLoad([{ sets: sets('Barbell Curl', 3) }], EX);
  const nt = P.notTrained(L, ['Chest', 'Back', 'Biceps', 'Quads', 'Hamstrings', 'Glutes', 'Calves']);
  assert.deepEqual(nt, ['Chest', 'Back', 'Quads', 'Hamstrings', 'Glutes', 'Calves']);
  assert.deepEqual(P.friendly(nt), ['chest', 'back', 'legs']);
});

test('review fixes: a session moved twice still points at its original day', () => {
  const days = [{ prog: 'legs', st: 'skipped', missed: true }, null, { prog: 'legs', st: 'moved', from: 0 }, null, null, null, null];
  const d = P.moveSession(days, 2, 4); assert.equal(d[4].from, 0); assert.equal(d[2], null);
});

test('review fixes: a stale or past choice for an unplaced session changes nothing; swaps never land before today', () => {
  const days = [{ prog: 'push', st: 'skipped', missed: true }, null, null, { prog: 'legs', st: 'planned' }, null, null, { prog: 'arnshar', st: 'planned' }];
  const c = { type: 'unplaced', prog: 'push', from: 0, after: 2 };
  assert.deepEqual(P.place(days, c, { swap: 4 }, [], musc).changes, []);   // Fri isn't a planned session
  assert.deepEqual(P.place(days, c, { anyway: 1 }, [], musc).changes, []); // Tue is in the past
  assert.deepEqual(P.place(days, c, { anyway: 3 }, [], musc).changes, []); // Thu is taken
  const r = P.place(days, c, { swap: 6 }, [], musc);
  for (const ch of r.changes) assert.ok(ch.to > 2, JSON.stringify(ch));
});
