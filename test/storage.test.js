const test = require('node:test'), assert = require('node:assert/strict');
const R = require('../www/storage.js');
const mem = init => { const m = new Map(Object.entries(init || {})); return { getItem: k => m.has(k) ? m.get(k) : null, setItem: (k, v) => m.set(k, String(v)), keys: () => [...m.keys()] }; };

test('fresh install: missing key → empty state at current schema', () => {
  const r = R.load(mem()); assert.equal(r.status, 'ok'); assert.equal(r.fresh, true); assert.equal(r.state.schemaVersion, R.CURRENT);
});
test('corrupt JSON keeps a copy and recovers from the last good daily copy', () => {
  const ls = mem({ gq: '{"profile":{"name":"x"', gq_last: JSON.stringify({ day: '2026-11-20', data: { profile: { name: 'Saved' }, food: {} } }) });
  const r = R.load(ls); assert.equal(r.status, 'recovered:2026-11-20'); assert.equal(r.state.profile.name, 'Saved');
  assert.ok(ls.keys().some(k => k.startsWith('gq_corrupt_')), 'raw copy kept');
});
test('corrupt JSON without a backup → empty state, never throws', () => {
  for (const raw of ['{', 'undefined', '[1,2]', '"str"', '42']) { const r = R.load(mem({ gq: raw })); assert.ok(r.state && typeof r.state === 'object'); assert.equal(r.state.schemaVersion, R.CURRENT); }
});
test('v1 → v2 migration normalises old shapes', () => {
  const s = R.migrate({ food: { '2026-01-01': [['Rice', '205', 4], 'junk', ['Egg', 72, 6, 0.4, 5, 0, { kind: 'x' }]], 'bad-key': [] }, weights: [[3, 80], [1, 81], [2, 0]], myMeals: [{ name: 'A' }], bp: {}, sleep: [] });
  assert.equal(s.schemaVersion, R.CURRENT);
  assert.deepEqual(s.food['2026-01-01'][0], ['Rice', 205, 4]); assert.equal(s.food['2026-01-01'].length, 2); assert.deepEqual(s.food['2026-01-01'][1][6], { kind: 'x' });
  assert.ok(!('bad-key' in s.food)); assert.deepEqual(s.weights.map(w => w[0]), [1, 3]);
  assert.ok(s.myDishes[0].id && Array.isArray(s.myDishes[0].items)); assert.ok(Array.isArray(s.bp)); assert.ok(!Array.isArray(s.sleep));
});
test('migration is idempotent at current version', () => { const s = R.migrate({ schemaVersion: R.CURRENT, food: { x: 1 } }); assert.deepEqual(s.food, { x: 1 }); });
test('snapshot writes one last-good copy per day and records lastBackup', async () => {
  const ls = mem(), s = { a: 1 }; assert.equal(await R.snapshot(s, ls, {}), true); assert.equal(await R.snapshot(s, ls, {}), false);
  assert.equal(JSON.parse(ls.getItem('gq_last')).data.a, 1); assert.ok(s.lastBackup);
});
test('snapshot prunes native backups to the newest 7', async () => {
  const files = new Map(['2026-01-01', '2026-01-02', '2026-01-03', '2026-01-04', '2026-01-05', '2026-01-06', '2026-01-07', '2026-01-08'].map(d => [`repwise-${d}.json`, '{}']));
  const FS = { writeFile: async ({ path }) => files.set(path.split('/')[1], 'x'), readdir: async () => ({ files: [...files.keys()].map(name => ({ name })) }), deleteFile: async ({ path }) => files.delete(path.split('/')[1]) };
  await R.snapshot({}, mem(), { Filesystem: FS }); assert.equal(files.size, 7); assert.ok(!files.has('repwise-2026-01-01.json'));
});
test('snapshot skips the in-localStorage copy for very large histories (relies on file backups)', async () => {
  const big = { blob: 'x'.repeat(2e6) }, ls = mem({ gq_last: '{"day":"old","data":{}}' }); ls.removeItem = k => ls.setItem(k, '');
  await R.snapshot(big, ls, {}); assert.equal(ls.getItem('gq_last'), '');
});

test('v2 → v3: custom meals become Dishes (nothing lost), custom exercises get targets, groups start empty', () => {
  const meals = [{ id: 'm1', name: 'Adobo', items: [{ id: 'soy_sauce', g: 15 }, { id: 'chicken_breast', g: 150 }], extra: null, method: 'braise' }, { id: 'm2', name: 'Rice & egg', items: [{ id: 'rice_white', g: 158 }], combo: 'Egg + Rice' }];
  const s = R.migrate({ schemaVersion: 2, myMeals: JSON.parse(JSON.stringify(meals)), favs: ['my:m1', 'dish:adobo'], customEx: { 'Band Pushdown': [['Triceps'], ['Triceps', 'Shoulders'], '⬇️'], junk: 5 },
    food: { '2026-11-20': [['Adobo', 400, 30, 10, 20, 1, { kind: 'my', myId: 'm1', mult: 1 }]] } });
  assert.equal(s.schemaVersion, R.CURRENT);
  assert.deepEqual(s.myDishes, meals); assert.deepEqual(s.myMeals, []);
  assert.deepEqual(s.favs, ['my:m1', 'dish:adobo']); assert.equal(s.food['2026-11-20'][0][6].myId, 'm1');
  assert.deepEqual(s.customEx['Band Pushdown'], [['Triceps'], ['Shoulders'], '⬇️', { t: [{ m: 'Triceps', r: 'p' }, { m: 'Shoulders', r: 's' }] }]);
  assert.ok(!('junk' in s.customEx)); assert.deepEqual(s.exGroups, []); assert.deepEqual(s.customExDel, {});
});
test('upgrading keeps an untouched copy of the old data', () => {
  const raw = JSON.stringify({ schemaVersion: 2, myMeals: [{ id: 'a', name: 'X', items: [] }] }), ls = mem({ gq: raw });
  const r = R.load(ls); assert.equal(r.state.myDishes[0].name, 'X'); assert.equal(ls.getItem('gq_pre_v' + R.CURRENT), raw);
  const ls2 = mem({ gq: JSON.stringify(r.state) }); R.load(ls2); assert.equal(ls2.getItem('gq_pre_v' + R.CURRENT), null);
  // a copy left by an earlier upgrade is replaced, not kept next to the new one
  const ls3 = mem({ gq: JSON.stringify({ schemaVersion: 3 }), gq_pre_v3: 'old' }); ls3.removeItem = k => ls3.setItem(k, ''); R.load(ls3); assert.equal(ls3.getItem('gq_pre_v3'), '');
});

test('v3 → v4: fasting "restart" state is dropped and old breaks are re-checked against the window', () => {
  const day = (h, m, d = 23) => new Date(2026, 10, d, h, m).getTime();
  const s = R.migrate({ schemaVersion: 3, fast: { on: true, proto: '16:8', start: 12, reset: day(21, 0, 22) }, fastLog: [[day(12, 57), 15.9], [day(21, 0, 22), 1]] });
  assert.equal(s.schemaVersion, 4); assert.ok(!('reset' in s.fast)); assert.equal(s.fast.grace, 60); assert.equal(s.fast.lateInsight, true);
  assert.deepEqual(s.fastLog.map(x => x.out), [false, true]);
});
