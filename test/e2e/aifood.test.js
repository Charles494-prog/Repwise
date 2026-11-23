// AI food logging: greyed out without a key (with the explanation), key sheet, snap a meal (editable card → normal log,
// Ultra-Health limits still apply), scan a barcode (saved product → Open Food Facts → label read by the AI), remembered barcodes.
// Network is stubbed: no real Anthropic or Open Food Facts calls.
const test = require('node:test'), assert = require('node:assert/strict');
const { launch, baseState } = require('./harness');
let p;
test.before(async () => { p = await launch(); });
test.after(async () => { await p.close(); });
const D = '2026-11-23', clock = `${D}T13:00:00`, wait = ms => `await new Promise(r=>setTimeout(r,${ms}));`;
const ready = () => p.eval(`for(let i=0;i<50&&(typeof aiFoodBar!=='function'||typeof foodSheet!=='function');i++)await new Promise(r=>setTimeout(r,50));return true`);
const BLOB = `await new Promise(r=>{const c=document.createElement('canvas');c.width=40;c.height=40;c.getContext('2d').fillRect(0,0,20,20);c.toBlob(r,'image/jpeg')})`;
// fetch stub: Claude replies with `claude`, Open Food Facts with `off` (or 404); every call is recorded in window.__calls
const stub = (claude, off) => `window.__calls=[];window.fetch=async(u,o)=>{__calls.push(String(u));
  if(String(u).includes('api.anthropic.com'))return new Response(JSON.stringify({content:[{type:'text',text:JSON.stringify(${JSON.stringify(claude)})}]}),{status:200});
  if(String(u).includes('openfoodfacts'))return ${off ? `new Response(JSON.stringify(${JSON.stringify(off)}),{status:200})` : `new Response('{}',{status:404})`};
  return new Response('{}',{status:404})};`;

test('without an API key both buttons are greyed out with "You need an AI model for this"; the key sheet turns them on', async () => {
  await p.open({ state: baseState(), clock });
  await ready();
  const r = await p.eval(`foodSheet();${wait(200)}const meal=$('#aimeal'),scan=$('#aiscan'),txt=$('#sheet').innerText;
    const off=[meal.className,scan.className,meal.getAttribute('aria-disabled')];meal.click();${wait(200)}const need=$('#sheet').innerText;
    stack=[];push('settings');${wait(100)}const set=$('#app').innerText;aiKeySheet();$('#aikeyin').value='sk-ant-test';aiKeySave();${wait(200)}
    foodSheet();${wait(200)}return {off,txt,need,set,key:S.apiKey,on:$('#aimeal').className,dis:$('#aimeal').getAttribute('aria-disabled')}`);
  assert.match(r.off[0], /off/); assert.match(r.off[1], /off/); assert.equal(r.off[2], 'true');
  assert.match(r.txt, /You need an AI model for this/); assert.match(r.need, /You need an AI model for this/);
  assert.match(r.set, /AI photo key\s*Not set · needed for photo and barcode logging/);
  assert.equal(r.key, 'sk-ant-test'); assert.doesNotMatch(r.on, /off/); assert.equal(r.dis, null);
  assert.deepEqual(p.errors, []);
});

test('snap a meal: AI estimate → editable card → logged with sodium and added sugar; key never leaves the phone except to Anthropic', async () => {
  await p.open({ state: baseState({ apiKey: 'sk-ant-test' }), clock });
  await ready();
  const claude = { recognized: true, name: 'Chicken adobo with rice', portion: '1 plate, about 400 g', kcal: 650, protein: 38, carbs: 70, fat: 22, satFat: 6, fiber: 2, addedSugar: 4, sodiumMg: 1100 };
  const r = await p.eval(`${stub(claude)}const b=${BLOB};await aiMealFromBlob(b);${wait(200)}const card=$('#sheet').innerText;
    document.querySelector('#aimealcard [data-ai="kcal"]').value='600';aiMealLog();${wait(700)}
    const e=S.food['${D}'].at(-1);return {card,calls:__calls,e}`);
  assert.match(r.card, /Looks like Chicken adobo with rice/); assert.match(r.card, /AI estimate — check the numbers/);
  assert.equal(r.calls.length, 1); assert.match(r.calls[0], /api\.anthropic\.com/);
  assert.equal(r.e[0], 'Chicken adobo with rice'); assert.equal(r.e[1], 600); assert.equal(r.e[6].na, 1100); assert.equal(r.e[6].addedSugar, 4); assert.equal(r.e[6].kind, 'ai');
  assert.deepEqual(p.errors, []);
});

test('Ultra-Health still applies to AI meals: a salty estimate over the sodium limit is blocked', async () => {
  await p.open({ state: baseState({ apiKey: 'sk-ant-test', ultra: { on: true, ack: 1 } }), clock });
  await ready();
  const claude = { recognized: true, name: 'Instant noodles', portion: '1 pack', kcal: 450, protein: 9, carbs: 60, fat: 18, satFat: 8, fiber: 2, addedSugar: 2, sodiumMg: 2600 };
  const r = await p.eval(`${stub(claude)}await aiMealFromBlob(${BLOB});${wait(200)}aiMealLog();${wait(500)}return {sheet:$('#sheet').innerText,n:(S.food['${D}']||[]).length}`);
  assert.match(r.sheet, /Not logged — this goes over your sodium limit/); assert.equal(r.n, 0);
  assert.deepEqual(p.errors, []);
});

test('scan: phone reads the barcode → Open Food Facts → pre-filled form → saved with the barcode; the next scan is instant and offline', async () => {
  await p.open({ state: baseState({ apiKey: 'sk-ant-test' }), clock });
  await ready();
  const off = { status: 1, product: { product_name: 'Crackers', brands: 'SkyFlakes', nutriments: { 'energy-kcal_100g': 440, proteins_100g: 9, carbohydrates_100g: 70, fat_100g: 14, 'saturated-fat_100g': 6, fiber_100g: 2, sugars_100g: 6, sodium_100g: 0.6 } } };
  const r = await p.eval(`${stub({ barcode: null }, off)}window.BarcodeDetector=class{async detect(){return [{rawValue:'4800016644290'}]}};
    await aiScanFromBlob(${BLOB});${wait(800)}const form=$('#ciname').value+' | '+[...document.querySelectorAll('#sheet input[type=number]')].map(i=>i.value).filter(Boolean).join(','),calls1=[...__calls];afSaveIng();${wait(400)}
    const rec=S.myIngredients[0];__calls=[];await aiScanFromBlob(${BLOB});${wait(800)}
    return {form,calls1,rec,calls2:__calls,item:$('#sheet').innerText}`);
  assert.match(r.form, /SkyFlakes Crackers \| 440,9,70,14,6,2,6,600/); assert.ok(r.calls1.some(u => u.includes('openfoodfacts')), 'looked up on Open Food Facts');
  assert.ok(!r.calls1.some(u => u.includes('anthropic')), 'no AI call needed when the barcode is found');
  assert.equal(r.rec.barcode, '4800016644290'); assert.equal(r.rec.vals.kcal, 440); assert.equal(r.rec.vals.na, 600);
  assert.deepEqual(r.calls2, [], 'second scan of the same product: no network at all'); assert.match(r.item, /SkyFlakes Crackers/);
  assert.deepEqual(p.errors, []);
});

test('scan: no barcode on the phone and not on Open Food Facts → the AI reads the nutrition label into the form', async () => {
  await p.open({ state: baseState({ apiKey: 'sk-ant-test' }), clock });
  await ready();
  const claude = { barcode: '123', name: 'Ube Polvoron', brand: 'Lola', label: { per: 'serving', servingG: 30, kcal: 150, protein: 2, carbs: 20, fat: 7, satFat: 4, fiber: 0, sugar: 12, sodiumMg: 40 } };
  const r = await p.eval(`${stub(claude, null)}delete window.BarcodeDetector;await aiScanFromBlob(${BLOB});${wait(800)}
    return {form:$('#ciname').value+' | '+$('#sheet').innerText,calls:__calls,serving:[...document.querySelectorAll('#sheet .afseg button.on')].map(b=>b.innerText)}`);
  assert.match(r.form, /Lola Ube Polvoron/); assert.match(r.form, /Per one serving \(30 g\)/); assert.ok(r.calls.some(u => u.includes('anthropic')));
  assert.ok(r.serving.some(t => /serving/i.test(t)), 'label values are per serving');
  assert.deepEqual(p.errors, []);
});
