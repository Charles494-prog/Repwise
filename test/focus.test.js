// Today's focus: presets and muscle areas, whole-muscle (every head / region) coverage, equipment, and what the picker may show.
const test = require('node:test'), assert = require('node:assert/strict');
const F = require('../www/focus.js');

const EQUIP = [['gym', false], ['dumbbell', false], ['dumbbell', true], ['home', false], ['home', true]];
const ALL = F.AREAS.map(a => a.id);

test('the area list is complete and grouped under Push / Pull / Legs / Other', () => {
  assert.deepEqual(ALL.slice().sort(), ['back', 'biceps', 'calves', 'chest', 'core', 'delts_front', 'delts_rear', 'delts_side', 'forearms', 'glutes', 'hamstrings', 'lats', 'quads', 'traps', 'triceps']);
  for (const a of F.AREAS) assert.ok(F.GROUPS.includes(a.group), a.id);
  assert.deepEqual(F.AREAS.filter(a => a.group === 'Push').map(a => a.id), ['chest', 'delts_front', 'delts_side', 'triceps']);
  assert.deepEqual(F.AREAS.filter(a => a.group === 'Pull').map(a => a.id), ['back', 'lats', 'traps', 'delts_rear', 'biceps', 'forearms']);
  assert.deepEqual(F.AREAS.filter(a => a.group === 'Legs').map(a => a.id), ['quads', 'hamstrings', 'glutes', 'calves']);
  assert.deepEqual(F.AREAS.filter(a => a.group === 'Other').map(a => a.id), ['core']);
});

test('regions match the SUBM heads: biceps, triceps, chest, delts, back, legs, core, forearms', () => {
  const R = id => F.AREA[id].regions.map(r => r[0]);
  assert.deepEqual(R('biceps'), ['long', 'short', 'brachialis']);
  assert.deepEqual(R('triceps'), ['long', 'lateral', 'medial']);
  assert.deepEqual(R('chest'), ['upper', 'mid', 'lower']);
  assert.deepEqual([R('delts_front'), R('delts_side'), R('delts_rear')], [['front'], ['side'], ['rear']]);
  assert.deepEqual([R('back'), R('lats'), R('traps')], [['upper', 'lower'], ['lats'], ['upper']]);
  assert.deepEqual(R('glutes'), ['max', 'med']); assert.deepEqual(R('calves'), ['gastro', 'soleus']);
  assert.deepEqual(R('core'), ['abs', 'obliques', 'deep']); assert.deepEqual(R('forearms'), ['flexors', 'extensors']);
  assert.deepEqual(R('quads'), ['vl', 'vm', 'rf']); assert.deepEqual(R('hamstrings'), ['inner', 'bf']);
});

test('every region has an exercise at every equipment level, and each pick suits the equipment', () => {
  for (const [equip, bar] of EQUIP) {
    const ok = F.availFor(equip, bar);
    for (const a of F.AREAS) {
      const P = F.buildPlan([a.id], { equip, bar, count: 1 });
      assert.deepEqual(F.missing([a.id], P), [], `${a.id} @ ${equip}${bar ? '+bar' : ''}: ${P.map(x => x.ex)}`);
      for (const x of P) { assert.ok(ok(F.TIER_OF[x.ex]), `${x.ex} not available @ ${equip}`); assert.ok(F.areasOf(x.ex).includes(a.id), `${x.ex} does not train ${a.id}`); }
    }
  }
});

test('picking a muscle covers the whole muscle: biceps → long + short + brachialis, triceps → all three heads', () => {
  for (const [equip, bar] of EQUIP) {
    const bi = F.buildPlan(['biceps'], { equip, bar, count: 1 }), tri = F.buildPlan(['triceps'], { equip, bar, count: 1 });
    assert.deepEqual([...new Set(bi.flatMap(x => x.regions))].sort(), ['biceps.brachialis', 'biceps.long', 'biceps.short'], equip);
    assert.deepEqual([...new Set(tri.flatMap(x => x.regions))].sort(), ['triceps.lateral', 'triceps.long', 'triceps.medial'], equip);
  }
  const bi = F.buildList(['biceps'], { equip: 'gym' });
  assert.ok(bi.includes('Hammer Curl') && bi.includes('Incline Dumbbell Curl') && bi.includes('Preacher Curl'), bi.join());
});

test('covering every region beats the session cap; the cap still limits extras', () => {
  const P = F.buildPlan(ALL, { equip: 'gym', count: 4 });
  assert.deepEqual(F.missing(ALL, P), []);
  assert.ok(P.length > 4);
  assert.equal(new Set(P.map(x => x.ex)).size, P.length, 'no duplicates');
  // one region only: the cap fills with extras but stops at the per-area maximum
  assert.equal(F.buildList(['delts_side'], { equip: 'gym', count: 8 }).length, 2);
  assert.equal(F.buildList(['delts_side'], { equip: 'gym', count: 1 }).length, 1);
});

test('one exercise can cover two regions so presets stay a normal session length', () => {
  for (const [equip, bar] of EQUIP) for (const k of Object.keys(F.PRESETS)) {
    const P = F.buildPlan(F.PRESETS[k].areas, { equip, bar, count: 6 });
    assert.deepEqual(F.missing(F.PRESETS[k].areas, P), [], `${k} @ ${equip}`);
    assert.ok(P.length <= 8, `${k} @ ${equip}: ${P.length} exercises`);
  }
  const push = F.buildPlan(F.PRESETS.push.areas, { equip: 'gym' });
  assert.deepEqual(push.find(x => x.ex === 'Dips').regions, ['chest.lower', 'triceps.lateral']);
});

test('the preview label names the region(s) each exercise covers', () => {
  const P = F.buildPlan(['quads', 'glutes'], { equip: 'gym' });
  assert.equal(P.find(x => x.ex === 'Squat').label, 'Quads · outer quad, inner quad');
  assert.equal(P.find(x => x.ex === 'Hip Abduction Machine').label, 'Glutes · glute med');
  assert.equal(F.buildPlan(['delts_side'], {})[0].label, 'Side delts');
});

test('exercise → area mapping: delts by head, lats vs rows, traps, abs, forearms; custom targets by sub-muscle', () => {
  const is = (e, a) => assert.ok(F.areasOf(e).includes(a), `${e} → ${a} (got ${F.areasOf(e)})`);
  is('Lateral Raise', 'delts_side'); is('Overhead Press', 'delts_front'); is('Arnold Press', 'delts_front'); is('Front Raise', 'delts_front');
  is('Face Pull', 'delts_rear'); is('Rear Delt Fly', 'delts_rear'); is('Prone Y-T-W', 'delts_rear');
  is('Lat Pulldown', 'lats'); is('Pull-up', 'lats'); is('Chin-up', 'lats'); is('Dumbbell Pullover', 'lats');
  is('Barbell Row', 'back'); is('Seated Cable Row', 'back');
  is('Barbell Shrug', 'traps'); is('Dumbbell Shrug', 'traps'); is('Backpack Shrug', 'traps');
  is('Crunch', 'core'); is('Plank Hold (sec)', 'core'); is('Hanging Leg Raise', 'core');
  is('Wrist Curl', 'forearms'); is('Reverse Curl', 'forearms');
  is('Pendlay Row', 'back'); is('Machine Lateral Raise', 'delts_side'); is('Neutral-grip Pull-up', 'lats');
  assert.deepEqual(F.areasOf('Mystery Curl', [['Biceps'], []]), ['biceps']);
  assert.deepEqual(F.areasOf('Band Y Raise', [['Shoulders'], [], '🎯', { t: [{ m: 'Shoulders.side', r: 'p' }, { m: 'Back', r: 's' }] }]), ['delts_side']);
  assert.deepEqual(F.regionsOf('Rope Thing', [['Triceps'], [], '💪', { t: [{ m: 'Triceps.long', r: 'p' }] }]), ['triceps.long']);
  assert.deepEqual(F.areasOf('Lat Thing', [['Back'], [], '💪', { t: [{ m: 'Back.lats', r: 'p' }] }]), ['lats']);
  // a custom exercise that targets a head can fill that region
  const defs = { 'My Curl': [['Biceps'], [], '💪', { t: [{ m: 'Biceps.brachialis', r: 'p' }] }] };
  const P = F.buildPlan(['biceps'], { equip: 'gym', defs, custom: ['My Curl'], has: n => n !== 'Hammer Curl' && n !== 'Rope Hammer Curl' && n !== 'Reverse Curl' && n !== 'Backpack Hammer Curl' });
  assert.ok(P.some(x => x.ex === 'My Curl' && x.regions.includes('biceps.brachialis')), P.map(x => x.ex).join());
});

test('presets: Push / Pull / Legs map to their areas', () => {
  assert.deepEqual(F.PRESETS.push.areas, ['chest', 'delts_front', 'delts_side', 'triceps']);
  assert.deepEqual(F.PRESETS.pull.areas, ['back', 'lats', 'delts_rear', 'biceps']);
  assert.deepEqual(F.PRESETS.legs.areas, ['quads', 'hamstrings', 'glutes', 'calves']);
  for (const k of Object.keys(F.PRESETS)) assert.equal(F.presetOf(F.PRESETS[k].areas), k);
  const push = F.buildList(F.PRESETS.push.areas, { equip: 'gym' });
  assert.ok(push.includes('Bench Press') && push.includes('Lateral Raise') && push.includes('Overhead Press'), push.join());
});

test('multi-select: biceps + side delts gives curls and lateral raises, nothing else', () => {
  const L = F.buildList(['biceps', 'delts_side'], { equip: 'gym' });
  assert.ok(L.some(e => /Curl/.test(e)), L.join()); assert.ok(L.some(e => /Lateral Raise/.test(e)), L.join());
  for (const e of L) assert.ok(F.areasOf(e).some(a => ['biceps', 'delts_side'].includes(a)), e);
  assert.equal(F.label(['delts_side', 'biceps']), 'Side delts + Biceps');
  assert.equal(F.label(['chest', 'delts_front', 'delts_side', 'triceps', 'biceps']), 'Push + Biceps');
  assert.deepEqual(F.parents(['biceps', 'delts_side', 'delts_rear']), ['Shoulders', 'Biceps']);
});

test('equipment: dumbbells only and home never get machine or barbell picks', () => {
  for (const [equip, bar] of [['dumbbell', false], ['home', false]]) {
    const ok = F.availFor(equip, bar);
    for (const e of F.buildList(ALL, { equip, bar, count: 40 })) assert.ok(ok(F.TIER_OF[e]), `${e} @ ${equip}`);
  }
  assert.equal(F.buildList(['lats'], { equip: 'home', bar: true, count: 1 })[0], 'Pull-up');
  assert.equal(F.buildList(['lats'], { equip: 'home', bar: false, count: 1 })[0], 'Towel Lat Pulldown');
  assert.equal(F.buildList(['traps'], { equip: 'dumbbell', count: 1 })[0], 'Dumbbell Shrug');
});

test('already-logged exercises stay first, count toward their regions, and are not repeated', () => {
  const L = F.buildList(F.PRESETS.push.areas, { equip: 'gym', keep: ['Barbell Curl', 'Bench Press'], count: 6 });
  assert.deepEqual(L.slice(0, 2), ['Barbell Curl', 'Bench Press']);
  assert.equal(L.filter(e => e === 'Bench Press').length, 1);
  assert.ok(!L.includes('Chest Press Machine') || L.indexOf('Chest Press Machine') > 1);
  assert.deepEqual(F.missing(F.PRESETS.push.areas, F.buildPlan(F.PRESETS.push.areas, { equip: 'gym', keep: ['Bench Press'] })), []);
  // only exercises that exist in the catalogue are used
  assert.ok(!F.buildList(['delts_front'], { equip: 'gym', has: n => n !== 'Overhead Press' }).includes('Overhead Press'));
});

test('the picker lists only Push / Pull / Legs presets and muscle areas — never routines', () => {
  const opts = F.pickerOptions();
  assert.ok(opts.every(o => o.type === 'preset' || o.type === 'area'));
  assert.deepEqual(opts.filter(o => o.type === 'preset').map(o => o.label), ['Push', 'Pull', 'Legs']);
  assert.equal(opts.filter(o => o.type === 'area').length, F.AREAS.length);
  const routineWords = /rotation|arnold|split|ppl|upper|lower|full body|bro|home|free/i;
  for (const o of opts) assert.ok(!routineWords.test(o.label) && !routineWords.test(o.id), o.label);
});

test('program keys round-trip so old workouts keep their focus name', () => {
  const k = F.key(['delts_side', 'biceps']);
  assert.equal(k, 'f_delts_side+biceps');
  assert.deepEqual(F.fromKey(k), ['delts_side', 'biceps']);
  assert.equal(F.fromKey('pull'), null);
  assert.deepEqual(F.fromKey('f_nope+biceps'), ['biceps']);
});
