// Ultra-Health rules: personal limits (and why they tighten), the hard added-sugar block, nutrient gaps, trends.
const test = require('node:test'), assert = require('node:assert/strict');
const G = require('../www/guidelines.js'), H = require('../www/health.js'), F = require('../www/foods.js');
const man = { sex: 'm', age: 30, height: 180, weight: 90, activity: 1.375, goal: 'cut', deficit: 500 };
const woman = { sex: 'f', age: 55, height: 160, weight: 60, activity: 1.2, goal: 'maintain' };
const DAY = 864e5, T0 = new Date(2026, 10, 23, 8).getTime();
const bp = (...r) => r.map(([s, d], i) => [T0 - (r.length - i) * DAY, s, d, 70]);
const glu = (ctx, ...v) => v.map((x, i) => [T0 - (v.length - i) * DAY, x, ctx]);

test('every limit and intake in the config cites a source', () => {
  for (const k of Object.keys(G.limits)) assert.match(G.limits[k].source, /WHO|AHA|ADA|DASH|NCEP/, k);
  for (const k of Object.keys(G.intakes)) assert.ok(G.intakes[k].source.length > 5, k);
  assert.ok(G.tighten.bp.source && G.tighten.glucose.source && G.doctor.source && G.water.source);
});

test('base limits come from calories and sex: WHO % of energy, capped by the AHA sugar limit', () => {
  const L = H.limits(man, {});
  assert.equal(L.kcal, 2085);                                        // same as the app's calorie target
  assert.equal(L.sugar.value, 36);                                   // 10% = 52 g, AHA cap for men = 36 g
  assert.equal(L.sat.value, Math.round(2085 * 0.10 / 9));            // 23 g
  assert.equal(L.fat.value, Math.round(2085 * 0.30 / 9));            // 70 g
  assert.equal(L.sodium.value, 2000); assert.equal(L.chol.value, 300);
  assert.deepEqual(L.reasons, []); assert.equal(L.sugar.why, null);
  const W = H.limits(woman, {}, { kcal: 1500 });
  assert.equal(W.kcal, 1500); assert.equal(W.sugar.value, 25);       // AHA cap for women
  assert.equal(W.sat.value, 17);
  // a small calorie target lowers the % limits below the cap
  assert.equal(H.limits(woman, {}, { kcal: 900 }).sugar.value, 23);
});

test('BP: last 5 readings averaging stage 1 lower sodium to 1,500 mg and say why', () => {
  const L = H.limits(man, { bp: bp([110, 70], [134, 86], [136, 84], [130, 88], [138, 85], [132, 87]) });
  assert.equal(L.sodium.value, 1500); assert.equal(L.sodium.strict, true);
  assert.equal(L.sodium.why, 'Sodium limit lowered to 1,500 mg because your last 5 BP readings averaged 134/86 (high, stage 1).');
  assert.equal(L.sat.value, Math.round(2085 * 0.06 / 9));            // DASH 6%
  assert.equal(L.fat.value, Math.round(2085 * 0.27 / 9));
  assert.equal(L.sugar.value, 36);                                   // BP alone doesn't change sugar
  assert.deepEqual(L.reasons.map(r => r.key), ['sodium', 'sat', 'fat']);
});

test('BP: normal / elevated averages or too few readings change nothing', () => {
  assert.equal(H.limits(man, { bp: bp([118, 76], [122, 78], [124, 77], [121, 75], [119, 79]) }).sodium.value, 2000);   // elevated is not stage 1
  assert.equal(H.limits(man, { bp: bp([140, 90], [142, 92]) }).sodium.value, 2000);                                  // only 2 readings
  // only the last 5 count: old high readings followed by 5 normal ones
  assert.equal(H.limits(man, { bp: bp([150, 95], [150, 95], [115, 75], [116, 74], [114, 72], [118, 76], [112, 70]) }).sodium.strict, false);
});

test('glucose: prediabetes-range fasting average tightens added sugar to 5% and adds carb guidance', () => {
  const L = H.limits(man, { glu: glu('fasting', 104, 110, 112) });
  assert.equal(L.sugar.value, Math.round(2085 * 0.05 / 4));          // 26 g
  assert.match(L.sugar.why, /^Added sugar limit lowered to 26 g \(5% of calories\) because your last 3 fasting glucose readings averaged 109 mg\/dL \(prediabetes range\)\.$/);
  assert.equal(L.chol.value, 300);                                   // cholesterol only for the diabetes range
  assert.equal(L.notes.length, 1); assert.match(L.notes[0], /Carbs/);
  const D = H.limits(man, { glu: glu('fasting', 130, 135) });
  assert.equal(D.chol.value, 200); assert.match(D.chol.why, /diabetes range/);
  // after-meal readings count too; random readings don't
  assert.equal(H.limits(man, { glu: glu('after', 150, 160) }).sugar.strict, true);
  assert.equal(H.limits(man, { glu: glu('random', 150, 160) }).sugar.strict, false);
  assert.equal(H.limits(man, { glu: glu('fasting', 90, 95, 92) }).sugar.strict, false);
});

test('sugar block: blocks only when the new food pushes the day over the limit, and says by how much', () => {
  assert.deepEqual(H.sugarBlock(30, 11, 36), { block: true, total: 41, over: 5, left: 6, add: 11 });
  assert.equal(H.sugarBlock(30, 6, 36).block, false);                // exactly at the limit is allowed
  assert.equal(H.sugarBlock(0, 36, 36).block, false);
  assert.equal(H.sugarBlock(0, 37, 36).over, 1);
  assert.equal(H.sugarBlock(40, 0, 36).block, false);                // sugar-free food is never blocked, even when over
  assert.equal(H.sugarBlock(40, 1, 36).block, true);
});

test('entry nutrients: sat fat from ingredients, sodium/cholesterol marked unknown when data is missing', () => {
  const adobo = ['Adobo', 400, 30, 10, 20, 1, { kind: 'dish', items: [{ id: 'pork_belly', g: 150 }, { id: 'soy_sauce', g: 15 }, { id: 'sugar', g: 2 }], mult: 2 }];
  const e = H.entryNutrients(adobo, F.ING);
  assert.equal(Math.round(e.sat), Math.round(2 * 150 * 19.3 / 100));
  assert.equal(Math.round(e.na), Math.round(2 * (150 * 32 + 15 * 5490) / 100));
  assert.equal(e.naKnown, true); assert.equal(e.sugar, 4);
  const plain = H.entryNutrients(['Quick add', 300, 10], F.ING);
  assert.equal(plain.naKnown, false); assert.equal(plain.cholKnown, false);
  const day = H.dayTotals([adobo, ['Quick add', 300, 10], ['Kangkong', 20, 2, 3, 0, 2, { items: [{ id: 'kangkong', g: 100 }] }]], F.ING);
  assert.equal(day.naPartial, true); assert.equal(day.n, 3);
  assert.equal(H.entryNutrients(['Kangkong', 20, 2, 3, 0, 2, { items: [{ id: 'kangkong', g: 100 }] }], F.ING).chol, 0);   // plants: no cholesterol
});

test('deficiencies: needs 5 logged days; flags fiber that is low most days; says what has no data', () => {
  const d = (fib, p = 150) => H.dayTotals([['Food', 2000, p, 200, 60, fib, { items: [{ id: 'rice_white', g: 300 }] }]], F.ING);
  assert.equal(H.deficiencies([d(10), d(10), d(10)], man).enough, false);
  const r = H.deficiencies([d(10), d(12), d(40), d(9), d(11), d(14), d(8)], man);
  assert.equal(r.enough, true); assert.equal(r.days, 7);
  const fib = r.low.find(x => x.k === 'fib');
  assert.ok(fib); assert.equal(fib.rec, 38); assert.equal(fib.lowDays, 6); assert.equal(fib.incomplete, false);
  assert.ok(!r.low.some(x => x.k === 'p'));
  assert.ok(r.noData.includes('Potassium') && r.noData.includes('Iron'));
  // fiber low only on some days isn't "consistent"
  assert.ok(!H.deficiencies([d(10), d(40), d(40), d(40), d(10), d(40)], man).low.some(x => x.k === 'fib'));
  // older women: lower fiber target
  assert.equal(G.intake('fib', woman), 21); assert.equal(G.intake('fe', { sex: 'f', age: 30 }), 18); assert.equal(G.intake('p', man), 72);
});

test('deficiencies: own ingredients with micronutrients are judged; partly-known data is marked incomplete', () => {
  const db = { ...F.ING, my_k: { id: 'my_k', group: 'mine', per100: { kcal: 100, sat: 0, k: 100 } } };
  const day = items => H.dayTotals([['Food', 2000, 150, 200, 60, 40, { items }]], db);
  const r = H.deficiencies(Array.from({ length: 6 }, () => day([{ id: 'my_k', g: 500 }])), man);
  const k = r.low.find(x => x.k === 'k'); assert.ok(k); assert.equal(k.avg, 500); assert.equal(k.incomplete, false);
  assert.ok(!r.noData.includes('Potassium'));
});

test('trends: repeated high sugar / sat fat, rising BP and readings that need a doctor', () => {
  const L = H.limits(man, {});
  const day = (sugar, sat) => ({ n: 2, sugar, sat, na: 1000 });
  const w = H.trends([day(50, 30), day(10, 10), day(45, 30), day(60, 5), day(5, 30)], {}, L, T0);
  assert.deepEqual(w.map(x => x.key), ['sugar', 'sat']);
  assert.match(w[0].text, /over your 36 g limit on 3 of your last 5 logged days/);
  const r = H.trends([], { bp: bp([120, 78], [122, 80], [121, 79], [135, 85], [138, 86], [140, 88]) }, L, T0);
  assert.ok(r.some(x => x.key === 'bpRise'));
  const doc = H.trends([], { bp: bp([150, 95], [148, 92], [152, 96]), glu: glu('fasting', 130, 128) }, L, T0);
  assert.deepEqual(doc.filter(x => x.level === 'doctor').map(x => x.key), ['bpSee', 'gluSee']);
  const crisis = H.trends([], { bp: bp([185, 100]) }, L, T0);
  assert.equal(crisis[0].level, 'urgent');
  assert.deepEqual(H.trends([day(10, 10)], { bp: bp([118, 76]) }, L, T0), []);
});

test('suggestions: Filipino foods for a gap that fit what is left; supplements carry general info; sugar swaps', () => {
  const f = H.foodSuggestions(['fib'], { sat: 5, sodium: 500, chol: 50, sugar: 0 }, F.ING);
  assert.ok(f.length >= 2 && f.every(x => x.for === 'fib'));
  assert.ok(f.some(x => /malunggay|monggo|saba/i.test(x.name)));
  // no room for cholesterol: eggs are left out of protein ideas
  assert.ok(!H.foodSuggestions(['p'], { chol: 10 }, F.ING).some(x => /egg/i.test(x.name)));
  assert.equal(H.supplements(['vd', 'fib'])[0].name, 'Vitamin D3');
  assert.match(H.swaps([{ meta: { items: [{ id: 'softdrink', g: 330 }] } }])[0], /Water/);
  assert.ok(H.swaps([]).length >= 2);
});
