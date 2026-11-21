const test = require('node:test'), assert = require('node:assert/strict');
const C = require('../www/core.js');
const at = s => new Date(s).getTime();

test('steps: first install only sets a baseline', () => { const r = C.stepAttribution(null, 5000, at('2026-11-21T10:00')); assert.deepEqual(r.add, {}); assert.equal(r.next.raw, 5000); });
test('steps: normal delta goes to today', () => { const r = C.stepAttribution({ raw: 1000, at: at('2026-11-21T08:00') }, 1800, at('2026-11-21T09:00')); assert.deepEqual(r.add, { '2026-11-21': 800 }); });
test('steps: reboot (counter went down) counts steps since reboot', () => { const r = C.stepAttribution({ raw: 9000, at: at('2026-11-21T08:00') }, 300, at('2026-11-21T09:00')); assert.deepEqual(r.add, { '2026-11-21': 300 }); });
test('steps: app killed for a day spreads steps across both days, not all today', () => {
  const r = C.stepAttribution({ raw: 0, at: at('2026-11-20T12:00') }, 12000, at('2026-11-21T12:00'));
  assert.deepEqual(r.add, { '2026-11-20': 6000, '2026-11-21': 6000 });
});
test('steps: two readings in the same millisecond still count', () => { const t = at('2026-11-21T09:00'); assert.deepEqual(C.stepAttribution({ raw: 150, at: t }, 300, t).add, { '2026-11-21': 150 }); });
test('steps: no change and implausible jumps', () => {
  assert.deepEqual(C.stepAttribution({ raw: 500, at: 1 }, 500, 2).add, {});
  assert.equal(C.stepAttribution({ raw: 0, at: at('2026-11-21T08:00') }, 500000, at('2026-11-21T09:00')).add['2026-11-21'], 60000);
});
test('BP categories (AHA 2017)', () => {
  assert.equal(C.bpCat(115, 75)[0], 'Normal'); assert.equal(C.bpCat(125, 79)[0], 'Elevated'); assert.equal(C.bpCat(132, 70)[0], 'High (stage 1)');
  assert.equal(C.bpCat(118, 85)[0], 'High (stage 1)'); assert.equal(C.bpCat(141, 80)[0], 'High (stage 2)'); assert.equal(C.bpCat(185, 100)[1], 3); assert.equal(C.bpCat(85, 55)[0], 'Low');
});
test('glucose categories (ADA)', () => {
  assert.equal(C.gluCat(95, 'fasting')[0], 'Normal'); assert.equal(C.gluCat(110, 'fasting')[0], 'Prediabetes range'); assert.equal(C.gluCat(130, 'fasting')[0], 'Diabetes range');
  assert.equal(C.gluCat(130, 'after')[0], 'Normal'); assert.equal(C.gluCat(150, 'after')[0], 'Prediabetes range'); assert.equal(C.gluCat(210, 'after')[0], 'Diabetes range'); assert.equal(C.gluCat(60, 'random')[0], 'Low');
});
test('added sugar from logged ingredients, multipliers and name fallback', () => {
  assert.equal(C.addedSugar([['Milk tea', 241, 3, 40, 3, 0, { items: [{ id: 'sugar', g: 25 }, { id: 'milk', g: 100 }], mult: 2 }]]), 50);
  assert.equal(C.addedSugar([['Coke', 140, 0, 39, 0, 0]]), 31); assert.equal(C.addedSugar([['Rice', 205, 4, 45, 0, 0]]), 0); assert.equal(C.addedSugar([]), 0);
});
test('e1RM (Epley)', () => { assert.equal(Math.round(C.e1rm(100, 5)), 117); assert.equal(C.e1rm(0, 20), 0); });
