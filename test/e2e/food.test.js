// Add food: custom ingredients (per 100 g or per serving, g or ml, optional micronutrients), used in search, plate and meals.
const test = require('node:test'), assert = require('node:assert/strict');
const { launch, baseState, sleep } = require('./harness');
let p;
test.before(async () => { p = await launch(); });
test.after(async () => { await p.close(); });
const ready = async () => { for (let k = 0; k < 40 && !(await p.eval("return typeof afNewIng==='function'")); k++) await sleep(150); };

test('custom ingredient: create per serving with micros; it shows in search as My ingredient and logs the right amount', async () => {
  await p.open({ state: baseState() }); await ready();
  const r = await p.eval(`stack=[];go('meals');foodSheet();afSearch('pandesal');const create=/Create ingredient “pandesal”/.test($('#afres').textContent);
    afNewIng('Mom pandesal','search');AF_ciSet('ref','serving');AF_ci('size','38');AF_ci('kcal','110');AF_ci('p','3.4');AF_ci('c','20');AF_ci('f','2');AF_ci('na','190');AF_ci('vc','');
    const fields=[...document.querySelectorAll('.affield input')].map(i=>i.getBoundingClientRect().width),wide=Math.min(...fields)>120;afSaveIng();
    const ing=FOODDB.ING['my_'+S.myIngredients[0].id],item=$('#sheet').innerText;afIngToPlate(true);const e=S.food[today()].at(-1);
    foodSheet();afSearch('mom');const row=$('#afres').innerText;
    return {create,wide,per100:Math.round(ing.per100.kcal),na100:Math.round(ing.per100.na),vc:ing.per100.vc,item,logged:[e[1],e[2]],row,saved:JSON.parse(localStorage.getItem('gq')).myIngredients.length}`);
  assert.ok(r.create); assert.ok(r.wide); assert.equal(r.per100, 289); assert.equal(r.na100, 500); assert.equal(r.vc, null);
  assert.match(r.item, /Sodium\s*190 mg/); assert.match(r.item, /1 serving/); assert.deepEqual(r.logged, [110, 3]); assert.match(r.row, /My ingredient/); assert.equal(r.saved, 1);
  assert.deepEqual(p.errors, []);
});

test('custom ingredient: warns when macros don’t match calories but still saves; name and calories required; ml unit', async () => {
  await p.open({ state: baseState() }); await ready();
  const r = await p.eval(`foodSheet();afNewIng('','search');afSaveIng();const noName=!S.myIngredients.length;AF.ci.name='Protein shake';AF_ciSet('unit','ml');afSaveIng();const noKcal=!S.myIngredients.length;
    AF_ci('kcal','100');AF_ci('p','40');AF_ci('c','20');const warn=$('#ciwarn').textContent;afSaveIng();const ing=FOODDB.ING['my_'+S.myIngredients[0].id];
    return {noName,noKcal,warn,unit:ing.unit,serving:/100 ml/.test($('#sheet').innerText),fat:ing.per100.f}`);
  assert.ok(r.noName); assert.ok(r.noKcal); assert.match(r.warn, /add up to about 240 kcal/); assert.equal(r.unit, 'ml'); assert.ok(r.serving); assert.equal(r.fat, null);
  assert.deepEqual(p.errors, []);
});

test('custom meal: free-text name, custom + catalogue ingredients, live totals with partial micronutrients; saved meal logs in one tap', async () => {
  await p.open({ state: baseState({ myIngredients: [{ id: 'x1', name: 'Kalamansi juice', ref: '100g', size: null, unit: 'ml', vals: { kcal: 30, c: 7, vc: 30, na: 2 } }] }) }); await ready();
  const r = await p.eval(`foodSheet();afCreate('My_Usual_meal_Breast_Chicken');afAddIng();afSearch('');const listed=/My ingredients/.test($('#afres').textContent);
    afPickIng('my_x1');afSetG(0,200);afAddIng();afPickIng('chicken_breast');const txt=$('#sheet').innerText;afBuilderToPlate();afLogPlate();afSavePlate&&$('#spn')&&afSavePlate();
    const m=S.myMeals.find(x=>/Kalamansi|My_Usual/.test(x.name));return {listed,txt,name:AF.name,meal:!!m,items:m&&m.items.map(i=>i.id)}`);
  assert.ok(r.listed); assert.match(r.txt, /200 ml/); assert.match(r.txt, /Vitamin C\s*≥ 60 mg/); assert.match(r.txt, /≥ means some ingredients have no data/);
  assert.deepEqual(p.errors, []);
});

test('custom ingredient: edit, duplicate and delete', async () => {
  await p.open({ state: baseState({ myIngredients: [{ id: 'x1', name: 'Ube jam', ref: '100g', size: null, unit: 'g', vals: { kcal: 250 } }] }) }); await ready();
  const r = await p.eval(`foodSheet();afOpenIng('my_x1');afEditIng('x1');AF_ci('kcal','260');afSaveIng();const edited=FOODDB.ING.my_x1.per100.kcal;
    afDupIng('x1');const dup=S.myIngredients.length;const copy=S.myIngredients[1].id;afDelIng(copy);return {edited,dup,after:S.myIngredients.length,gone:!FOODDB.ING['my_'+copy]}`);
  assert.equal(r.edited, 260); assert.equal(r.dup, 2); assert.equal(r.after, 1); assert.ok(r.gone);
  assert.deepEqual(p.errors, []);
});
