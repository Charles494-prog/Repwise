// RepWise route suggestions (UMD: used by the app and by Node unit tests).
// One provider function: suggestRoutes({start, meters, kind, n, exclude}) → [{pts, meters, secs, ascent, seed, off}].
// Provider: OpenRouteService foot-walking (free plan ≈ 2,000 directions/day, 40/min; round trips up to 100 km).
(function (root) {
  'use strict';
  const config = { provider: 'ors', key: '', base: 'https://api.openrouteservice.org/v2/directions/', profile: 'foot-walking', maxCalls: 12 };

  // ---------- geometry ----------
  const rad = x => x * Math.PI / 180, deg = x => x * 180 / Math.PI;
  function hav(a, b) { const R = 6371e3, dl = rad(b[0] - a[0]), dn = rad(b[1] - a[1]), h = Math.sin(dl / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dn / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); }
  function destPoint(p, bearing, m) { const R = 6371e3, d = m / R, b = rad(bearing), la = rad(p[0]), lo = rad(p[1]);
    const la2 = Math.asin(Math.sin(la) * Math.cos(d) + Math.cos(la) * Math.sin(d) * Math.cos(b)), lo2 = lo + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(la), Math.cos(d) - Math.sin(la) * Math.sin(la2));
    return [deg(la2), deg(lo2)]; }
  function bearingOf(a, b) { const y = Math.sin(rad(b[1] - a[1])) * Math.cos(rad(b[0])), x = Math.cos(rad(a[0])) * Math.sin(rad(b[0])) - Math.sin(rad(a[0])) * Math.cos(rad(b[0])) * Math.cos(rad(b[1] - a[1])); return (deg(Math.atan2(y, x)) + 360) % 360; }
  const routeLen = pts => pts.reduce((s, p, i) => i ? s + hav(pts[i - 1], p) : 0, 0);
  // Resample to ~step m and snap to a ~step-sized grid so different vertex spacing still compares.
  function cells(pts, step = 25) { const out = []; let carry = 0; const k = step / 111320;
    const push = p => { const c = Math.round(p[0] / k) + ':' + Math.round(p[1] / (k / Math.cos(rad(p[0])))); if (out.at(-1) !== c) out.push(c); };
    if (pts.length) push(pts[0]);
    for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i], d = hav(a, b); let t = step - carry;
      while (t <= d) { const f = t / d; push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]); t += step; } carry = (carry + d) % step; }
    if (pts.length > 1) push(pts.at(-1)); return out; }
  // Share of segments that are also walked in the opposite direction (out-and-back = close to 1).
  function outBackRatio(pts) { const c = cells(pts), e = new Set(); for (let i = 1; i < c.length; i++) e.add(c[i - 1] + '>' + c[i]);
    let back = 0; for (const x of e) { const [a, b] = x.split('>'); if (e.has(b + '>' + a)) back++; } return e.size ? back / e.size : 0; }
  // Share of route a's cells that route b also passes through.
  function overlap(a, b) { const ca = new Set(cells(a, 30)), cb = new Set(cells(b, 30)); let n = 0; for (const x of ca) if (cb.has(x)) n++; return ca.size ? n / ca.size : 0; }
  const sessionKey = (start, meters, kind) => `${start[0].toFixed(3)},${start[1].toFixed(3)}|${Math.round(meters / 100) * 100}|${kind}`;

  // ---------- pace / time → distance ----------
  // Average pace (s/km) from activities of ≥1 km; run and walk portions separately. Falls back to 6:30 jog / 11:00 walk.
  function paces(runs = []) { let rd = 0, rt = 0, wd = 0, wt = 0;
    for (const r of runs) { if (!(r.dist >= 1000)) continue; if (r.d?.run > 0 && r.t?.run > 0) { rd += r.d.run; rt += r.t.run; } if (r.d?.walk > 0 && r.t?.walk > 0) { wd += r.d.walk; wt += r.t.walk; } }
    return { run: rd >= 1000 ? rt / rd * 1000 : 390, walk: wd >= 1000 ? wt / wd * 1000 : 660, fromHistory: rd >= 1000 || wd >= 1000 }; }
  // runFrac = share of the time spent running (1 = all jog, 0 = all walk, 0.5 = 1:1 intervals).
  function timeToMeters(secs, p, runFrac = 1) { return Math.round(secs * (runFrac / p.run + (1 - runFrac) / p.walk) * 1000); }
  function metersToSecs(m, p, runFrac = 1) { return Math.round(m / 1000 / (runFrac / p.run + (1 - runFrac) / p.walk)); }

  // ---------- OpenRouteService ----------
  async function ors(body, f) { const r = await f(config.base + config.profile + '/geojson', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/geo+json', Authorization: config.key }, body: JSON.stringify({ ...body, elevation: true, instructions: false }) });
    if (r.status === 429) throw Object.assign(new Error('rate'), { code: 'rate' });
    if (r.status === 401 || r.status === 403) throw Object.assign(new Error('key'), { code: 'key' });
    if (!r.ok) { if (r.status === 404 || r.status === 400) return null; throw Object.assign(new Error('http ' + r.status), { code: 'http' }); }
    const j = await r.json(), ft = j.features?.[0]; if (!ft) return null;
    return { pts: ft.geometry.coordinates.map(c => [c[1], c[0]]), meters: ft.properties.summary?.distance ?? routeLen(ft.geometry.coordinates.map(c => [c[1], c[0]])), secs: ft.properties.summary?.duration || 0, ascent: ft.properties.ascent ?? null }; }

  // ---------- suggestions ----------
  const S = { session: {}, cache: {} };
  async function suggestRoutes({ start, meters, kind, n = 3, exclude = [], fresh = false, fetch: f = root.fetch?.bind(root) }) {
    if (!config.key) throw Object.assign(new Error('nokey'), { code: 'nokey' });
    const key = sessionKey(start, meters, kind), ses = S.session[key] ??= { seeds: new Set(), rot: 0, shown: [] };
    if (!fresh && S.cache[key]) return S.cache[key];
    const seen = [...ses.shown, ...exclude], out = [], tols = [0.10, 0.15, 0.20]; let calls = 0, lastErr = null;
    const distinct = r => !seen.some(s => overlap(r.pts, s) > 0.7 || overlap(s, r.pts) > 0.7) && !out.some(o => overlap(r.pts, o.pts) > 0.7 || overlap(o.pts, r.pts) > 0.7);
    const call = async body => { calls++; try { return await ors(body, f); } catch (e) { lastErr = e; if (e.code === 'rate' || e.code === 'key') throw e; return null; } };
    const off = m => Math.abs(m - meters) / meters, cands = [];
    if (kind === 'loop') {
      let seed = 1 + Math.floor(Math.random() * 1e5);
      while (calls < config.maxCalls && out.length < n) {
        while (ses.seeds.has(seed)) seed++; ses.seeds.add(seed);
        let len = meters, r = await call({ coordinates: [[start[1], start[0]]], options: { round_trip: { length: len, points: 4 + (seed % 3), seed } } });
        if (r && off(r.meters) > 0.10 && calls < config.maxCalls) { len = Math.round(len * meters / r.meters); const r2 = await call({ coordinates: [[start[1], start[0]]], options: { round_trip: { length: len, points: 4 + (seed % 3), seed } } }); if (r2 && off(r2.meters) < off(r.meters)) r = r2; }
        if (!r || outBackRatio(r.pts) > 0.4 || !distinct(r)) continue;
        r.seed = seed; cands.push(r); const t = tols[Math.min(2, Math.floor(calls / 5))]; if (off(r.meters) <= t) { r.off = off(r.meters); out.push(r); }
      }
    } else {
      // Each batch rotates the 8 bearings by 17° and varies the distance factor, so every Reroll asks for new destinations.
      const rot = ses.rot++, fac = [0.75, 0.7, 0.8][rot % 3], bearings = Array.from({ length: 8 }, (_, i) => (i * 45 + rot * 17) % 360);
      for (const b of bearings) { if (calls >= config.maxCalls) break; const seedKey = 'b' + Math.round(b) + '@' + fac; if (ses.seeds.has(seedKey)) continue; ses.seeds.add(seedKey);
        let sl = meters * fac, r = await call({ coordinates: [[start[1], start[0]], (d => [d[1], d[0]])(destPoint(start, b, sl))] });
        if (r && off(r.meters) > 0.10 && calls < config.maxCalls) { sl *= meters / r.meters; const r2 = await call({ coordinates: [[start[1], start[0]], (d => [d[1], d[0]])(destPoint(start, b, sl))] }); if (r2 && off(r2.meters) < off(r.meters)) r = r2; }
        if (!r || !distinct(r)) continue; r.seed = seedKey; r.bearing = bearingOf(start, r.pts.at(-1)); r.off = off(r.meters); cands.push(r); }
      // Closest to target first, then keep clearly different directions (≥ 45° apart).
      for (const tol of tols) for (const r of cands.filter(r => r.off <= tol).sort((a, b) => a.off - b.off)) {
        if (out.length >= Math.max(n, 3) || out.includes(r)) continue; if (out.some(o => Math.min(Math.abs(o.bearing - r.bearing), 360 - Math.abs(o.bearing - r.bearing)) < 45)) continue; out.push(r); }
    }
    // Loosen step by step: anything within ±20% that isn't already in.
    if (out.length < n) for (const r of cands.sort((a, b) => off(a.meters) - off(b.meters))) if (out.length < n && !out.includes(r) && off(r.meters) <= 0.20) { r.off = off(r.meters); out.push(r); }
    for (const r of out) { r.off = (r.meters - meters) / meters; ses.shown.push(r.pts); }
    if (!out.length && lastErr) throw lastErr;
    if (!fresh) S.cache[key] = out; return out; }

  const API = { config, hav, destPoint, bearingOf, routeLen, cells, outBackRatio, overlap, sessionKey, paces, timeToMeters, metersToSecs, suggestRoutes, _state: S };
  if (typeof module === 'object' && module.exports) module.exports = API; else root.RWRoutes = API;
})(typeof self !== 'undefined' ? self : this);
