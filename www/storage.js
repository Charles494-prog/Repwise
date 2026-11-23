// RepWise storage: safe load (corruption recovery), schema versioning + migrations, daily snapshots.
// UMD so the migrations can be unit-tested in Node.
(function (root) {
  'use strict';
  const KEY = 'gq', LAST = 'gq_last', CURRENT = 3, LAST_MAX = 1.8e6;
  const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
  const num = v => (typeof v === 'number' && isFinite(v) ? v : +v || 0);

  // Each migration takes a state at version n and returns it at n+1. Never throws on odd data.
  const MIGRATIONS = {
    // v1 → v2: normalise shapes written by older builds.
    1: s => {
      if (!isObj(s.food)) s.food = {};
      for (const d of Object.keys(s.food)) {
        if (!Array.isArray(s.food[d]) || !/^\d{4}-\d{2}-\d{2}$/.test(d)) { delete s.food[d]; continue; }
        s.food[d] = s.food[d].filter(Array.isArray).map(x => { const o = [String(x[0] ?? 'Food'), num(x[1]), num(x[2])]; for (let i = 3; i < 6; i++) if (x[i] != null) o[i] = num(x[i]); if (isObj(x[6])) o[6] = x[6]; return o; });
      }
      if (!Array.isArray(s.weights)) s.weights = [];
      s.weights = s.weights.filter(w => Array.isArray(w) && num(w[1]) > 0).map(w => [num(w[0]), num(w[1])]).sort((a, b) => a[0] - b[0]);
      if (Array.isArray(s.myMeals)) s.myMeals.forEach((m, i) => { if (!m.id) m.id = 'm' + i + '_' + Date.now().toString(36); if (!Array.isArray(m.items)) m.items = []; });
      for (const k of ['workouts', 'runs', 'bfLog', 'measLog', 'bp', 'glu', 'favs', 'dontAsk', 'myMeals']) if (s[k] != null && !Array.isArray(s[k])) s[k] = [];
      for (const k of ['water', 'steps', 'sleep', 'sleepQ', 'burn', 'goals', 'quests']) if (s[k] != null && !isObj(s[k])) s[k] = {};
      return s;
    },
    // v2 → v3: custom exercises get muscle targets (with sub-muscles), exercise groups,
    // and "custom meals" (which were really single dishes) become Dishes; Meals are a new combination type.
    2: s => {
      if (!isObj(s.customEx)) s.customEx = {};
      for (const [n, d] of Object.entries(s.customEx)) {
        if (!Array.isArray(d)) { delete s.customEx[n]; continue; }
        const pri = Array.isArray(d[0]) ? d[0].map(String) : [], sec = (Array.isArray(d[1]) ? d[1].map(String) : []).filter(m => !pri.includes(m));
        const meta = isObj(d[3]) ? d[3] : {};
        if (!Array.isArray(meta.t)) meta.t = [...pri.map(m => ({ m, r: 'p' })), ...sec.map(m => ({ m, r: 's' }))];
        s.customEx[n] = [pri, sec, typeof d[2] === 'string' ? d[2] : '💪', meta];
      }
      if (!isObj(s.customExDel)) s.customExDel = {};
      if (!Array.isArray(s.exGroups)) s.exGroups = [];
      // Every existing custom meal becomes a Dish: same id, name, ingredients and extras, so favourites
      // ('my:<id>'), past food logs (meta.myId) and suggestions keep pointing at it.
      const old = Array.isArray(s.myMeals) ? s.myMeals : [];
      s.myDishes = [...(Array.isArray(s.myDishes) ? s.myDishes : []), ...old.filter(isObj)];
      s.myMeals = [];
      return s;
    },
  };
  function migrate(s) {
    if (!isObj(s)) return { schemaVersion: CURRENT };
    let v = num(s.schemaVersion) || 1;
    while (v < CURRENT) { s = MIGRATIONS[v](s) || s; v++; }
    s.schemaVersion = CURRENT; return s;
  }

  // Load: parse → migrate. On corrupt JSON keep the raw copy and fall back to the last good daily copy.
  function load(ls) {
    ls = ls || root.localStorage; const raw = ls.getItem(KEY); let s = null, status = 'ok';
    try { s = JSON.parse(raw || 'null'); if (s !== null && !isObj(s)) throw new Error('not an object'); }
    catch (e) {
      try { ls.setItem('gq_corrupt_' + Date.now(), String(raw)); } catch (_) {}
      status = 'corrupt'; s = null;
      try { const last = JSON.parse(ls.getItem(LAST) || 'null'); if (last && isObj(last.data)) { s = last.data; status = 'recovered:' + last.day; } } catch (_) {}
    }
    // Before upgrading the data model, keep the untouched data once (skipped for huge histories; daily file backups cover those).
    // Only when it fits next to the data and the daily copy (≈ 3 copies ≤ 4.5M chars); it's removed after 14 days.
    if (s && (num(s.schemaVersion) || 1) < CURRENT && raw && raw.length * 3 < 4.5e6) { try { ls.setItem('gq_pre_v' + CURRENT, raw); s.preCopyAt = Date.now(); } catch (_) {} }
    return { state: migrate(s || {}), status, fresh: !s };
  }

  // Once per day: keep a last-good copy in localStorage and (native) a dated file, pruned to 7.
  async function snapshot(s, ls, P) {
    ls = ls || root.localStorage; P = P || root.Capacitor?.Plugins;
    const d = new Date(), day = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    let last = null; try { last = JSON.parse(ls.getItem(LAST) || 'null'); } catch (_) {}
    try { if (!s.preCopyAt && ls.getItem('gq_pre_v' + CURRENT) != null) s.preCopyAt = Date.now(); } catch (_) {}
    if (s.preCopyAt && Date.now() - s.preCopyAt > 14 * 864e5) { try { ls.removeItem && ls.removeItem('gq_pre_v' + CURRENT); } catch (_) {} delete s.preCopyAt; }
    if (last && last.day === day) return false;
    const json = JSON.stringify(s);
    // The last-good copy doubles storage use; past ~1.8M chars (≈ several years of logs) rely on file backups.
    try { if (json.length < LAST_MAX) ls.setItem(LAST, JSON.stringify({ day, ts: Date.now(), data: s })); else ls.removeItem && ls.removeItem(LAST); } catch (_) { try { ls.removeItem && ls.removeItem(LAST); } catch (e) {} }
    s.lastBackup = Date.now();
    const FS = P?.Filesystem; if (!FS) return true;
    try {
      await FS.writeFile({ path: `backups/repwise-${day}.json`, data: json, directory: 'DATA', encoding: 'utf8', recursive: true });
      const list = (await FS.readdir({ path: 'backups', directory: 'DATA' })).files.map(f => f.name || f).filter(n => /^repwise-\d{4}-\d{2}-\d{2}\.json$/.test(n)).sort();
      for (const old of list.slice(0, Math.max(0, list.length - 7))) await FS.deleteFile({ path: `backups/${old}`, directory: 'DATA' });
    } catch (e) { console.warn('backup', e); }
    return true;
  }
  async function listBackups(P) { const FS = (P || root.Capacitor?.Plugins)?.Filesystem; if (!FS) return []; try { return (await FS.readdir({ path: 'backups', directory: 'DATA' })).files.map(f => f.name || f).filter(n => n.endsWith('.json')).sort().reverse(); } catch (e) { return []; } }
  async function readBackup(name, P) { const FS = (P || root.Capacitor?.Plugins).Filesystem; const r = await FS.readFile({ path: `backups/${name}`, directory: 'DATA', encoding: 'utf8' }); return JSON.parse(r.data); }

  const API = { KEY, CURRENT, MIGRATIONS, migrate, load, snapshot, listBackups, readBackup };
  root.RWStore = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
