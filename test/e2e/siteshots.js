// Screenshots of the newest features for the RepWise website (390×844 @2x, like the existing assets/screens).
// Run: CHROME=/path/to/chrome node test/e2e/siteshots.js <output dir>
const path = require('node:path'), fs = require('node:fs');
const { launch, baseState, sleep } = require('./harness');
const OUT = process.argv[2] || path.join(__dirname, '..', '..', 'docs', 'site');
const D = '2026-11-23';
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const p = await launch(), now = new Date(`${D}T10:00:00`).getTime(), day = 864e5;
  const shot = async (name, code, wait = 500) => { await p.eval(`closeSheet();stack=[];${code};return 1`); await sleep(wait); await p.shot(path.join(OUT, name + '.png')); console.log('✓', name); };
  try {
    const base = { planFrom: '2026-11-01', missedFrom: '2099-01-01', split: 'ppl', ui: { mode: 'light' },
      workouts: [1, 2, 3, 5].map(i => ({ ts: now - day * i, prog: ['push', 'pull', 'legs'][i % 3], sets: [{ ex: 'Bench Press', w: 60, r: 8, xp: 10 }, { ex: 'Squat', w: 80, r: 5, xp: 12 }], xp: 22, prs: 0 })) };
    // 1. Change today's workout: Biceps + Triceps picked, every head covered
    await p.open({ state: baseState(base), clock: `${D}T10:00:00` });
    await shot('focus', `go('plan');changeToday();focTog('biceps');focTog('triceps');document.querySelector('#sheet .fc-prev')?.scrollIntoView({block:'center'})`, 700);
    // 2. Ultra-Health: out-of-window warning at 11 PM with health context + bedtime tip
    await p.open({ state: baseState({ ...base, ultra: { on: true, ack: 1 }, fast: { on: true, proto: '16:8', start: 12 } }), clock: `${D}T23:00:00` });
    await shot('ultra-fast', `foodSheet();afOpenIng('egg');afIngToPlate(true)`, 900);
    // 3. Ultra-Health dashboard with readings
    const bp = [1, 2, 3, 4, 5].map(i => [now - i * day, 134, 86, 70]), glu = [1, 2, 3].map(i => [now - i * day, 104, 'fasting']);
    const food = { [D]: [['Chicken adobo', 520, 32, 12, 30, 1, { kind: 'dish', items: [{ id: 'chicken_thigh', g: 200 }, { id: 'soy_sauce', g: 15 }, { id: 'vinegar', g: 15 }] }], ['Rice', 260, 5, 57, 0.5, 1, { items: [{ id: 'rice_white', g: 200 }] }]] };
    await p.open({ state: baseState({ ...base, ultra: { on: true, ack: 1 }, bp, glu, food }), clock: `${D}T13:00:00` });
    await shot('ultra', `push('ultra')`, 600);
    await shot('ultra-nutrition', `go('meals')`, 600);
    // 4. Rank themes: gallery + Today in a high-rank dark theme
    await p.open({ state: baseState({ ...base, ui: { mode: 'dark', devThemes: true, previewRank: 'diamond' } }), clock: `${D}T10:00:00` });
    await shot('themes', `go('plan')`, 700);
    await shot('rank-gallery', `push('rankgallery')`, 700);
    if (p.errors.length) console.error('page errors:', p.errors);
  } finally { await p.close(); }
})();
