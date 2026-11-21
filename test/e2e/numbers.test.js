// Calorie, protein, water and body-fat numbers. The landing page calculator (RepWise-Landing-Page/test/site.test.js) pins the same values.
const test = require('node:test'), assert = require('node:assert/strict');
const { launch, baseState } = require('./harness');
let p;
test.before(async () => { p = await launch(); });
test.after(async () => { await p.close(); });

const ME = { sex: 'm', age: 25, height: 170, weight: 75, activity: 1.375, goal: 'cut', build: 'average', deficit: null, waist: null, neck: null, hip: null };
const run = (profiles, expr) => p.eval(`return ${JSON.stringify(profiles)}.map(pr=>{S.profile=Object.assign({},S.profile,pr);return ${expr}})`);

test('targets: Mifflin-St Jeor × activity, goal adjustment, protein 2 / 1.8 g per kg, water 35 ml per kg', async () => {
  await p.open({ state: baseState() });
  const r = await run([ME, { ...ME, goal: 'bulk' }, { ...ME, goal: 'maintain' }, { ...ME, sex: 'f', goal: 'maintain' }, { ...ME, goal: 'slowcut' }, { ...ME, deficit: 750 }],
    `(t=>[t.bmr,t.tdee,t.kcal,t.protein,t.water,t.steps])(targets())`);
  assert.deepEqual(r[0], [1693, 2327, 1827, 150, 2750, 10000]);
  assert.deepEqual(r[1].slice(2, 4), [2627, 135]);
  assert.equal(r[2][2], 2327);
  assert.deepEqual(r[3].slice(0, 3), [1527, 2099, 2099]);
  assert.equal(r[4][2], 2077);
  assert.equal(r[5][2], 1577, 'a custom deficit wins over the goal preset');
  assert.deepEqual(p.errors, []);
});

test('body fat: estimate from BMI, age, sex and build until the tape is used', async () => {
  await p.open({ state: baseState() });
  const r = await run([ME, { ...ME, build: 'lean' }, { ...ME, build: 'heavy' }, { ...ME, build: null }],
    `(b=>[+b.bf.toFixed(1),/Estimated/.test(b.method)])(bodyFat())`);
  assert.deepEqual(r, [[20.7, true], [16.7, true], [26.7, true], [20.7, true]]);
  assert.deepEqual(p.errors, []);
});

test('body fat: US Navy tape method for men (waist + neck) and women (waist + neck + hips)', async () => {
  await p.open({ state: baseState() });
  const r = await run([{ ...ME, waist: 85, neck: 38 }, { ...ME, sex: 'f', waist: 75, neck: 32 }, { ...ME, sex: 'f', waist: 75, neck: 32, hip: 98 }],
    `(b=>[+b.bf.toFixed(1),/Navy/.test(b.method)])(bodyFat())`);
  assert.deepEqual(r[0], [17.8, true]);
  assert.equal(r[1][1], false, 'women without hips fall back to the estimate');
  assert.deepEqual(r[2], [27.6, true]);
  assert.deepEqual(p.errors, []);
});

test('body fat: impossible tape results fall back to the estimate, never negative or absurd', async () => {
  await p.open({ state: baseState() });
  const r = await run([{ ...ME, waist: 50, neck: 45 }, { ...ME, waist: 200, neck: 30 }],
    `(b=>[+b.bf.toFixed(1),/Navy/.test(b.method)])(bodyFat())`);
  for (const [bf, navy] of r) { assert.equal(navy, false); assert.equal(bf, 20.7); }
  assert.deepEqual(p.errors, []);
});

test('body fat: the Progress screen shows the number without errors for estimate and tape', async () => {
  for (const pr of [ME, { ...ME, waist: 85, neck: 38 }]) {
    const st = baseState(); st.profile = Object.assign({}, st.profile, pr);
    await p.open({ state: st });
    const txt = await p.eval(`go('body');return document.body.innerText`);
    assert.match(txt, /body fat/i);
    assert.doesNotMatch(txt, /NaN|undefined|Infinity/);
  }
  assert.deepEqual(p.errors, []);
});

test('setup: changing the goal preselects that goal\'s deficit; keeping the goal keeps a custom deficit', async () => {
  const st = baseState(); st.profile = Object.assign({}, st.profile, { goal: 'cut', deficit: 750 });
  await p.open({ state: st });
  const r = await p.eval(`const at=k=>{OB.step=OBSTEPS.findIndex(s=>s.k===k);render();return OB.d.deficit};
    startOB();const kept=at('deficit');
    startOB();OB.d.goal='bulk';const bulk=at('deficit');OB.d.deficit=-300;
    OB.d.goal='maintain';const toned=at('deficit');
    return {kept,bulk,toned,kcal:(()=>{OB.d.goal='bulk';at('deficit');OB.step=OBSTEPS.length;render();finishOB();return targets().kcal-targets().tdee})()}`);
  assert.equal(r.kept, 750);
  assert.equal(r.bulk, -300);
  assert.equal(r.toned, 0);
  assert.equal(r.kcal, 300, 'a bulk ends up in a surplus');
  assert.deepEqual(p.errors, []);
});
