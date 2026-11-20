// Run: node --test test/
const test = require('node:test'), assert = require('node:assert/strict');
const F = require('../www/foods.js');
const near = (a, b, tol = 0.05) => assert.ok(Math.abs(a - b) <= tol, `${a} ≈ ${b}`);

test('scale: per-100 g values scale linearly', () => {
  const t = F.scale({ kcal: 200, p: 10, c: 20, f: 5, sat: 1, fib: 2 }, 150);
  assert.deepEqual(t, { kcal: 300, p: 15, c: 30, f: 7.5, sat: 1.5, fib: 3 });
  assert.equal(F.scale({ kcal: 200 }, 0).kcal, 0);
});
test('sumItems: adds ingredients', () => {
  const t = F.sumItems([{ id: 'rice_white', g: 100 }, { id: 'egg', g: 50 }]);
  near(t.kcal, 130 + 71.5); near(t.p, 2.7 + 6.3);
});
test('oils: same calories per gram regardless of type; only fat quality differs', () => {
  const v = F.scale(F.ING.oil_veg.per100, 13.5), o = F.scale(F.ING.oil_olive.per100, 13.5), e = F.scale(F.ING.oil_evoo.per100, 13.5), c = F.scale(F.ING.oil_coconut.per100, 13.5);
  near(v.kcal, 119.3, 0.1); assert.equal(v.kcal, o.kcal); assert.equal(o.kcal, e.kcal); assert.equal(v.kcal, c.kcal);
  assert.ok(c.sat > o.sat && o.sat > v.sat);
  assert.ok(F.fatQuality(o).mostlyUnsat); assert.ok(!F.fatQuality(c).mostlyUnsat);
});
test('oilGrams: amounts, absorption and no-oil methods', () => {
  assert.equal(F.oilGrams('pan', 'tbsp', 200), 13.5);
  assert.equal(F.oilGrams('air', 'spray_l', 200), 1);
  assert.equal(F.oilGrams('deep', 'absorb', 150), 15);
  assert.equal(F.oilGrams('deep', 'absorb', 150, { breaded: true }), 18);
  assert.equal(F.oilGrams('raw', 'tbsp', 200), 0);
  assert.equal(F.oilGrams('pan', 'custom', 0, { g: 7 }), 7);
});
test('dishItems: variants, cuts and servings come from the recipe', () => {
  const adobo = F.DISHES.find(d => d.id === 'adobo');
  const pork = F.dishItems(adobo, 'pork'), lean = F.dishItems(adobo, 'pork', 'Lean (kasim)'), two = F.dishItems(adobo, 'pork', null, 2);
  assert.ok(pork.some(i => i.id === 'pork_belly' && i.g === 100));
  assert.ok(lean.some(i => i.id === 'pork_lean') && !lean.some(i => i.id === 'pork_belly'));
  assert.equal(two.find(i => i.id === 'pork_belly').g, 200);
  assert.ok(F.sumItems(lean).kcal < F.sumItems(pork).kcal, 'lean cut has fewer calories');
});
test('buildMeal: oil is its own line and adds exactly its macros', () => {
  const items = F.dishItems(F.DISHES.find(d => d.id === 'adobo'), 'chicken');
  const none = F.buildMeal(items, 'pan', 'none', null), tbsp = F.buildMeal(items, 'pan', 'oil_olive', 'tbsp');
  const oil = tbsp.items.find(i => i.oil); assert.equal(oil.id, 'oil_olive'); assert.equal(oil.g, 13.5);
  near(tbsp.totals.kcal - none.totals.kcal, 119, 1); near(tbsp.totals.f - none.totals.f, 13.5, 0.1);
  const again = F.buildMeal(tbsp.items, 'pan', 'oil_olive', 'tbsp');
  assert.equal(again.items.filter(i => i.oil).length, 1, 'oil never double-counted');
});
test('every dish and variant only references known ingredients', () => {
  for (const d of F.DISHES) for (const v of d.variants) {
    for (const it of F.dishItems(d, v.id)) assert.ok(F.ING[it.id], `${d.id}/${v.id} → ${it.id}`);
    if (v.cuts) for (const id of Object.values(v.cuts)) assert.ok(F.ING[id], `${d.id} cut → ${id}`);
  }
  assert.ok(F.DISHES.length >= 40, `${F.DISHES.length} dishes`);
});
test('search: fuzzy, partial, Filipino and English names', () => {
  const entries = [...F.DISHES.map(d => ({ name: d.name, alt: d.alt + ' ' + d.variants.map(v => v.name + ' ' + v.alt).join(' ') })), ...Object.values(F.ING)];
  const top = q => F.search(q, entries)[0]?.name;
  assert.equal(top('bico'), 'Bicol Express');
  assert.equal(top('adob'), 'Adobo');
  assert.equal(top('sinig'), 'Sinigang');
  assert.ok(F.search('manok', entries).some(e => e.name === 'Tinola'));
  assert.ok(F.search('chicken', entries).some(e => e.name === 'Adobo'));
  assert.ok(F.search('liempo', entries).some(e => e.name === 'Pork belly'));
  assert.equal(F.search('', entries).length, 0);
  assert.equal(F.search('zzzzqx', entries).length, 0);
});
test('search: a strong match hides weak fuzzy noise', () => {
  const entries = [...F.DISHES.map(d => ({ name: d.name, alt: d.alt })), ...Object.values(F.ING)];
  const r = F.search('bico', entries).map(e => e.name);
  assert.equal(r[0], 'Bicol Express'); assert.ok(!r.includes('Adobo') && !r.includes('Goat (kambing)'));
});
