// Route suggestion helpers and the provider wrapper (OpenRouteService mocked).
const test = require('node:test'), assert = require('node:assert/strict');
const R = require('../www/routes.js');
const start = [14.5547, 121.0244];
const circle = (L, th) => { const r = L / 2 / Math.PI, c = R.destPoint(start, th, r); return Array.from({ length: 73 }, (_, i) => R.destPoint(c, th + 180 + i * 5, r)); };
const outBack = L => { const out = Array.from({ length: 21 }, (_, i) => R.destPoint(start, 40, i * L / 40)); return [...out, ...out.slice(0, -1).reverse()]; };
const fc = (pts, ascent = 10) => ({ ok: true, status: 200, json: async () => ({ features: [{ geometry: { coordinates: pts.map(p => [p[1], p[0], 5]) }, properties: { summary: { distance: R.routeLen(pts), duration: R.routeLen(pts) / 1.4 }, ascent } }] }) });
// Mock ORS: loops are circles whose direction depends on the seed (every 6th seed is an out-and-back, every 5th comes back 25% long);
// one-way routes go to the requested point with a detour so they're ~1.33× the straight line.
function mockFetch(opts = {}) { const calls = []; const f = async (url, init) => { const b = JSON.parse(init.body); calls.push(b);
  if (opts.status) return { ok: false, status: opts.status, json: async () => ({}) };
  if (b.options?.round_trip) { const { length, seed } = b.options.round_trip; if (opts.valid != null && calls.length > opts.valid) return fc(outBack(length));
    if (seed % 6 === 0) return fc(outBack(length)); return fc(circle(length * (seed % 5 === 1 ? 1.25 : 1), (seed * 47) % 360)); }
  const [a, d] = b.coordinates.map(c => [c[1], c[0]]), mid = R.destPoint(a, R.bearingOf(a, d) + 41.4, R.hav(a, d) / 2 / Math.cos(41.4 * Math.PI / 180)); return fc([a, mid, d]); };
  f.calls = calls; return f; }
const reset = () => { R.config.key = 'test'; R._state.session = {}; R._state.cache = {}; };

test('geometry: out-and-back detection and overlap', () => {
  assert.ok(R.outBackRatio(outBack(4000)) > 0.9); assert.ok(R.outBackRatio(circle(4000, 0)) < 0.05);
  assert.ok(R.overlap(circle(4000, 0), circle(4000, 0)) > 0.95); assert.ok(R.overlap(circle(4000, 0), circle(4000, 150)) < 0.2);
  assert.ok(Math.abs(R.routeLen(circle(5000, 30)) - 5000) < 50);
});

test('time → distance uses average run / walk pace from activities ≥ 1 km, else 6:30 jog and 11:00 walk', () => {
  const none = R.paces([]); assert.equal(none.run, 390); assert.equal(none.walk, 660); assert.equal(none.fromHistory, false);
  assert.equal(R.timeToMeters(1800, none, 1), 4615); // 30 min jog at 6:30 /km
  assert.equal(R.timeToMeters(1800, none, 0), 2727); // 30 min walk at 11:00 /km
  const runs = [{ dist: 5000, d: { run: 5000, walk: 0 }, t: { run: 1500, walk: 0 } }, { dist: 800, d: { run: 800, walk: 0 }, t: { run: 100, walk: 0 } }, { dist: 3000, d: { run: 1000, walk: 2000 }, t: { run: 300, walk: 1200 } }];
  const p = R.paces(runs); assert.equal(p.run, 300); assert.equal(p.walk, 600); assert.ok(p.fromHistory); // the 800 m activity is ignored
  assert.equal(R.timeToMeters(1800, p, 1), 6000); assert.equal(R.timeToMeters(1800, p, 0.5), 4500);
  assert.equal(R.metersToSecs(6000, p, 1), 1800);
});

test('loop: at least 3 suggestions within ±10%, out-and-backs rejected, long routes rescaled', async () => {
  reset(); const f = mockFetch(); const out = await R.suggestRoutes({ start, meters: 5000, kind: 'loop', n: 3, fetch: f });
  assert.ok(out.length >= 3); for (const r of out) { assert.ok(Math.abs(r.off) <= 0.10, `off ${r.off}`); assert.ok(R.outBackRatio(r.pts) <= 0.4); }
  assert.ok(f.calls.length <= R.config.maxCalls);
  for (let i = 0; i < out.length; i++) for (let j = i + 1; j < out.length; j++) assert.ok(R.overlap(out[i].pts, out[j].pts) <= 0.7);
});

test('reroll: always new routes, never one already shown (no cache reuse)', async () => {
  reset(); const f = mockFetch(); const a = await R.suggestRoutes({ start, meters: 5000, kind: 'loop', fetch: f });
  const again = await R.suggestRoutes({ start, meters: 5000, kind: 'loop', fetch: f }); assert.equal(again, a); // same request = cached
  const b = await R.suggestRoutes({ start, meters: 5000, kind: 'loop', fresh: true, fetch: f }), c = await R.suggestRoutes({ start, meters: 5000, kind: 'loop', fresh: true, fetch: f });
  assert.ok(b.length >= 3 && c.length >= 3);
  for (const x of [...b, ...c]) for (const y of a) assert.ok(R.overlap(x.pts, y.pts) <= 0.7);
  for (const x of c) for (const y of b) assert.ok(R.overlap(x.pts, y.pts) <= 0.7);
  assert.equal(new Set([...a, ...b, ...c].map(r => r.seed)).size, a.length + b.length + c.length);
});

test('fallback: fewer than 3 valid routes returns what exists (within the call cap)', async () => {
  reset(); const f = mockFetch({ valid: 2 }); const out = await R.suggestRoutes({ start, meters: 5000, kind: 'loop', fetch: f });
  assert.ok(out.length >= 1 && out.length < 3); assert.ok(f.calls.length <= R.config.maxCalls);
});

test('one way: ≥ 3 routes near the target in clearly different directions; rerolls rotate bearings', async () => {
  reset(); const f = mockFetch(); const a = await R.suggestRoutes({ start, meters: 3000, kind: 'oneway', fetch: f });
  assert.ok(a.length >= 3); for (const r of a) assert.ok(Math.abs(r.off) <= 0.2);
  for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) { const d = Math.abs(a[i].bearing - a[j].bearing); assert.ok(Math.min(d, 360 - d) >= 45); }
  const b = await R.suggestRoutes({ start, meters: 3000, kind: 'oneway', fresh: true, fetch: f });
  assert.ok(b.length >= 3); for (const x of b) for (const y of a) assert.ok(R.overlap(x.pts, y.pts) <= 0.7);
});

test('errors: no key, rate limit and bad key surface a code', async () => {
  reset(); R.config.key = ''; await assert.rejects(R.suggestRoutes({ start, meters: 5000, kind: 'loop', fetch: mockFetch() }), e => e.code === 'nokey');
  reset(); await assert.rejects(R.suggestRoutes({ start, meters: 5000, kind: 'loop', fetch: mockFetch({ status: 429 }) }), e => e.code === 'rate');
  reset(); await assert.rejects(R.suggestRoutes({ start, meters: 5000, kind: 'loop', fetch: mockFetch({ status: 403 }) }), e => e.code === 'key');
});
