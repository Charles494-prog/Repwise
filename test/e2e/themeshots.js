// Screenshots of Today, Train and Nutrition in every rank theme, light + dark → docs/themes/<rank>-<mode>-<screen>.png
// Run: CHROME=/path/to/chrome node test/e2e/themeshots.js
const fs = require('node:fs'), path = require('node:path');
const { launch, baseState, sleep } = require('./harness');
const OUT = path.join(__dirname, '..', '..', 'docs', 'themes');
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const p = await launch(), now = Date.now(), day = 864e5;
  try {
    const state = baseState({ ui: { mode: 'light', devThemes: true }, workouts: [1, 2, 3].map(i => ({ ts: now - day * i, prog: ['push', 'pull', 'legs'][i % 3], sets: [{ ex: 'Bench Press', w: 60, r: 8, xp: 10 }], xp: 10, prs: 0 })),
      food: { [new Date().toISOString().slice(0, 10)]: [['Chicken adobo with rice', 650, 40, 60, 20, 3], ['Banana', 105, 1, 27, 0.4, 3]] }, water: {}, steps: {} });
    await p.open({ state });
    const ids = await p.eval('return RT.ORDER');
    const screens = [['today', "go('plan')"], ['train', "trainSub='workouts';go('train')"], ['nutrition', "go('meals')"]];
    let n = 0;
    for (const id of ids) for (const mode of ['light', 'dark']) {
      await p.eval(`S.ui.previewRank='${id}';S.ui.mode='${mode}';THEME_ON=null;applyTheme(true);return 1`);
      for (const [name, code] of screens) {
        await p.eval(`closeSheet();stack=[];${code};scrollTo(0,0);return 1`); await sleep(350);
        await p.shot(path.join(OUT, `${id}-${mode}-${name}.png`)); n++;
      }
    }
    if (p.errors.length) console.error('page errors:', p.errors);
    console.log(`${n} screenshots in docs/themes`);
  } finally { await p.close(); }
})();
