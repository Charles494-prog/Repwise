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
  assert.equal(s.schemaVersion, 2);
  assert.deepEqual(s.food['2026-01-01'][0], ['Rice', 205, 4]); assert.equal(s.food['2026-01-01'].length, 2); assert.deepEqual(s.food['2026-01-01'][1][6], { kind: 'x' });
  assert.ok(!('bad-key' in s.food)); assert.deepEqual(s.weights.map(w => w[0]), [1, 3]);
  assert.ok(s.myMeals[0].id && Array.isArray(s.myMeals[0].items)); assert.ok(Array.isArray(s.bp)); assert.ok(!Array.isArray(s.sleep));
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
