// Eating-window rules: only meals outside the window warn; late starts are a separate gentle insight.
const test = require('node:test'), assert = require('node:assert/strict');
const F = require('../www/fasting.js');
const at = (h, m = 0, day = 23) => new Date(2026, 10, day, h, m).getTime();

test('12:00 – 20:00 window (16:8): open, before, 57 min after, close, after close', () => {
  const s = 12, e = F.eatHours('16:8'); assert.equal(e, 8);
  assert.equal(F.classify(at(12, 0), s, e).inWindow, true);                 // exactly at open
  const before = F.classify(at(11, 59), s, e);                             // 1 minute before open
  assert.equal(before.inWindow, false); assert.equal(before.side, 'before'); assert.equal(Math.round(before.minsUntilOpen), 1);
  const c = F.classify(at(12, 57), s, e);                                  // the reported case
  assert.equal(c.inWindow, true); assert.equal(c.late, false); assert.equal(Math.round(c.minsAfterOpen), 57);
  assert.equal(F.classify(at(20, 0), s, e).inWindow, true);                 // at close
  const after = F.classify(at(20, 1), s, e);                               // 1 minute after close
  assert.equal(after.inWindow, false); assert.equal(after.side, 'after'); assert.equal(Math.round(after.minsAfterClose), 1);
});

test('late-start insight uses the grace period (default 60 min)', () => {
  assert.equal(F.classify(at(12, 57), 12, 8).late, false);
  assert.equal(F.classify(at(13, 1), 12, 8).late, true);
  assert.equal(F.classify(at(13, 1), 12, 8, 90).late, false);
});

test('windows that cross midnight (20:00 – 04:00)', () => {
  const s = 20, e = 8;
  assert.equal(F.classify(at(23, 30), s, e).inWindow, true);
  assert.equal(F.classify(at(0, 30), s, e).inWindow, true);
  assert.equal(F.classify(at(4, 0), s, e).inWindow, true);
  const a = F.classify(at(4, 1), s, e); assert.equal(a.inWindow, false); assert.equal(a.side, 'after');
  const b = F.classify(at(19, 59), s, e); assert.equal(b.inWindow, false); assert.equal(b.side, 'before');
  assert.equal(F.classify(at(20, 0), s, e).inWindow, true);
});

test('weekly count only counts true out-of-window logs in the last 7 days', () => {
  const now = at(12, 57), log = [{ ts: at(9, 0), out: true }, { ts: at(12, 30), out: false }, { ts: at(21, 0, 20), out: true }, { ts: at(21, 0, 10), out: true }];
  assert.equal(F.weekCount(log, now), 2);
});

test('old logs are re-checked: false "breaks" inside the window no longer count', () => {
  const log = F.migrateLog([[at(12, 57), 15.9], [at(21, 30, 22), 1.5], [at(12, 10, 21), 15.2]], 12, 8);
  assert.deepEqual(log.map(x => x.out), [false, true, false]);
  assert.equal(F.weekCount(log, at(13, 0)), 1);
});

test('suggests shifting the window toward when you actually eat', () => {
  const late = [21, 21, 22].map((h, i) => ({ ts: at(h, 0, 20 + i), out: true }));
  assert.equal(F.suggestStart(late, at(13, 0), 12, 8), 13); // misses ~1 h after an 8 pm close → "shift to 1 PM?"
  const early = [10, 11, 10].map((h, i) => ({ ts: at(h, 30, 20 + i), out: true }));
  assert.equal(F.suggestStart(early, at(13, 0), 12, 8), 10.5); // usually ~90 min early → 10:30 AM
  assert.equal(F.suggestStart([{ ts: at(21, 0), out: true }], at(22, 0), 12, 8), null);
});
