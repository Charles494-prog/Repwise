// Every rank theme, in dark and light, must pass WCAG AA contrast for text; tokens are complete.
const test = require('node:test'), assert = require('node:assert/strict');
const T = require('../www/themes.js'), RC = require('../www/rankconfig.js');
const KEYS = ['bg', 'surface', 'fill', 'ink', 'ink2', 'ink3', 'line', 'accent', 'onAccent', 'accent2', 'ok', 'warn', 'danger'];

test('one theme per rank in the ladder, each with dark + light palettes and complete tokens', () => {
  assert.deepEqual(T.ORDER, RC.CONFIG.ladder.map(r => r.id));
  for (const id of T.ORDER) for (const m of ['dark', 'light']) { const c = T.THEMES[id][m]; for (const k of KEYS) assert.match(c[k], /^#[0-9a-f]{6}$/i, `${id}.${m}.${k}`); }
});

test('WCAG AA: body text, secondary text and accent buttons ≥ 4.5:1; hints ≥ 3:1 — every theme, both modes', () => {
  const fails = [];
  for (const id of T.ORDER) for (const m of ['dark', 'light']) { const c = T.THEMES[id][m], chk = (a, b, min, what) => { const r = T.contrast(c[a], c[b]); if (r < min) fails.push(`${id}/${m} ${what} ${r.toFixed(2)}`); };
    for (const bg of ['bg', 'surface']) { chk('ink', bg, 4.5, `ink on ${bg}`); chk('ink2', bg, 4.5, `ink2 on ${bg}`); chk('ink3', bg, 3, `ink3 on ${bg}`); chk('accent', bg, 3, `accent on ${bg}`); }
    chk('ink', 'fill', 4.5, 'ink on fill'); chk('onAccent', 'accent', 4.5, 'onAccent on accent');
    for (const s of ['ok', 'danger', 'warn']) chk(s, 'surface', 3, `${s} on surface`); }
  assert.deepEqual(fails, []);
});

test('higher ranks never have fewer effects than lower ones', () => {
  const e = T.ORDER.map(id => T.THEMES[id].effects); for (let i = 1; i < e.length; i++) assert.ok(e[i] >= e[i - 1]);
  assert.equal(T.THEMES.arnold.font.transform, 'uppercase');
});
