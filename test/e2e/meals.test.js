// Ingredient → Dish → Meal: custom meals migrate to Dishes, Meals combine dishes and foods, one-tap logging, the Log / + Plate flow.
const test = require('node:test'), assert = require('node:assert/strict');
const { launch, baseState } = require('./harness');
let p;
test.before(async () => { p = await launch(); });
test.after(async () => { await p.close(); });
const ready = () => p.eval(`for(let i=0;i<50&&typeof foodSheet!=='function';i++)await new Promise(r=>setTimeout(r,50));return true`);
const td = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const ADOBO = { id: 'm1', name: 'My adobo', items: [{ id: 'soy_sauce', g: 15 }, { id: 'sugar', g: 5 }, { id: 'chicken_breast', g: 150 }], extra: null, method: 'raw', oilType: 'none', oilAmt: null };

test('old custom meals open as Dishes: same name, ingredients, favourite and past logs', async () => {
  await p.open({ state: baseState({ myMeals: [ADOBO], favs: ['my:m1'], food: { [td()]: [['My adobo', 300, 40, 5, 6, 0, { kind: 'my', myId: 'm1', mult: 1 }]] } }) }); await ready();
  const r = await p.eval(`foodSheet();afSearch('');const start=$('#afres').innerText;stack=[];push('mymeals');const page=$('#app').innerText;
    return {dishes:S.myDishes.map(d=>d.name),meals:S.myMeals.length,start,page,ver:S.schemaVersion,fav:S.favs,backup:!!localStorage.getItem('gq_pre_v4')}`);
  assert.deepEqual(r.dishes, ['My adobo']); assert.equal(r.meals, 0); assert.equal(r.ver, 4); assert.deepEqual(r.fav, ['my:m1']); assert.ok(r.backup);
  assert.match(r.start, /My dishes/); assert.match(r.start, /Create dish/); assert.match(r.start, /Create meal/);
  assert.match(r.page, /Dishes/); assert.match(r.page, /My adobo/);
  assert.deepEqual(p.errors, []);
});

test('meal: "My breakfast" = my adobo + catalog rice + whey; adjust servings and log everything in one tap', async () => {
  await p.open({ state: baseState({ myMeals: [ADOBO] }) }); await ready();
  const r = await p.eval(`foodSheet();afNewMeal('My breakfast');afGo('mealpick');afSearch('');const pick=$('#afres').innerText;
    afMealAdd('my','m1');afGo('mealpick');afMealAdd('ing','rice_white');afGo('mealpick');afMealAdd('ing','whey');afSaveMeal();
    const m=S.myMeals[0];const shown=$('#sheet').innerText;
    afMealN(0,1);afMealN(1,-1);const n0=AF.meal.items[0].mult;
    const before=(S.food[viewDate]||[]).length;afLogMeal();const L=S.food[viewDate].slice(before);
    return {items:m.items.map(i=>i.k+':'+i.id),pick:/Mine/.test(pick)&&/My adobo/.test(pick),shown,n0,logged:L.map(x=>x[0]),tags:L.map(x=>x[6].meal),prompt:!!$('#spn')}`);
  assert.deepEqual(r.items, ['my:m1', 'ing:rice_white', 'ing:whey']);
  assert.ok(r.pick); assert.match(r.shown, /Log meal/); assert.match(r.shown, /My adobo/);
  assert.equal(r.n0, 1.5); assert.equal(r.logged.length, 3); assert.match(r.logged[0], /My adobo ×1.5/);
  assert.deepEqual(r.tags, ['My breakfast', 'My breakfast', 'My breakfast']); assert.equal(r.prompt, false);
  assert.deepEqual(p.errors, []);
});

test('meal: mixes catalog dishes and custom items; editing a dish updates the meal; deleting a dish removes it from meals', async () => {
  await p.open({ state: baseState({ myMeals: [ADOBO] }) }); await ready();
  const r = await p.eval(`foodSheet();afNewMeal('Lunch');afMealAdd('dish','adobo');afDishToMeal();afMealAdd('my','m1');afSaveMeal();const k0=Math.round(AF.meal.items.reduce((k,i)=>k+i.totals.kcal*i.mult,0));
    S.myDishes[0].items.push({id:'rice_white',g:158});save();afOpenMeal(S.myMeals[0].id);const k1=Math.round(AF.meal.items.reduce((k,i)=>k+i.totals.kcal*i.mult,0));
    afOpenMy('m1');afDelMy('m1');return {k0,k1,left:S.myMeals[0].items.map(i=>i.k)}`);
  assert.ok(r.k1 > r.k0 + 150); assert.deepEqual(r.left, ['dish']);
  assert.deepEqual(p.errors, []);
});

test('saving a plate of several items creates a Meal that points at the dishes and foods', async () => {
  await p.open({ state: baseState({ myMeals: [ADOBO] }) }); await ready();
  const r = await p.eval(`foodSheet();afOpenDish('adobo');afDishToPlate();afOpenIng('egg');afIngToPlate();afOpenMy('m1');afMyToPlate();afLogPlate();const ask=$('#sheet').innerText;$('#spn').value='Big lunch';afSavePlate();
    const m=S.myMeals.find(x=>x.name==='Big lunch');return {ask,items:m&&m.items.map(i=>i.k+':'+i.id),dishes:S.myDishes.length}`);
  assert.match(r.ask, /Save it as a meal/); assert.deepEqual(r.items, ['dish:adobo', 'ing:egg', 'my:m1']); assert.equal(r.dishes, 1);
  assert.deepEqual(p.errors, []);
});

test('log flow: one big Log button and a small plate button with a count; Log logs just this item', async () => {
  await p.open({ state: baseState() }); await ready();
  const r = await p.eval(`foodSheet();afOpenDish('adobo');const b=[...document.querySelectorAll('#sheet .afbar button')].map(x=>x.getAttribute('aria-label')||x.textContent.trim());
    afDishToPlate();afOpenIng('egg');const note=$('#sheet .afplnote')?.textContent||'',count=$('#sheet .afplus i')?.textContent;
    const before=(S.food[viewDate]||[]).length;afIngToPlate(true);return {b,note,count,logged:S.food[viewDate].length-before,plate:AF.plate.length}`);
  assert.equal(r.b.length, 2); assert.match(r.b[0], /^Log · \d+ kcal$/); assert.equal(r.b[1], 'Add to plate');
  assert.match(r.note, /Plate: 1 item waiting/); assert.equal(r.count, '1'); assert.equal(r.logged, 1); assert.equal(r.plate, 1);
  assert.deepEqual(p.errors, []);
});
