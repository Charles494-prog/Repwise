// RepWise AI food logging (needs the user's own Anthropic API key; nothing here works or is clickable without it):
//  - "Snap a meal": a photo of a plate → Claude estimates name, calories, macros, added sugar and sodium → an editable
//    card → logged through the normal flow (Ultra-Health hard limits and the fasting check still apply)
//  - "Scan barcode / label": a photo of a barcode or nutrition label → 1) a product you scanned before (offline, free)
//    2) the phone's own barcode reader where available 3) Open Food Facts (free) 4) Claude reads the barcode / label.
//    The result opens the custom-ingredient form pre-filled for review and is saved with its barcode, so the next scan
//    of that product is instant and offline.
// Without a key both buttons are greyed out with an explanation and a way to add a key.
(function () {
  const MODEL = 'claude-sonnet-5-5';
  const hasKey = () => !!S.apiKey;
  const num = v => (v == null || v === '' || Number.isNaN(+v)) ? null : +v;

  // ---------- key sheet (replaces the old prompt) ----------
  window.aiKeySheet = () => { $('#sheet').classList.remove('af');
    openSheet(`<div id="aikey"><h3 class="t-title">AI food logging</h3>
    <p class="t-body" style="margin:var(--s1) 0">Snap a meal or scan a barcode / nutrition label and an AI model fills in the food for you. RepWise uses <b>your own Anthropic API key</b>: photos go straight from this phone to Anthropic, and each photo costs about a cent on your Anthropic account.</p>
    <label class="affield full"><span>Anthropic API key</span><span class="in"><input id="aikeyin" type="password" autocomplete="off" placeholder="sk-ant-…" value="${esc(S.apiKey || '')}"></span></label>
    <p class="t-caption" style="margin-top:var(--s1)">Get one at console.anthropic.com → API keys. It's stored only on this phone and is never included in backups.</p>
    <button class="btn" style="margin-top:var(--s2)" onclick="aiKeySave()">Save key</button>
    ${S.apiKey ? '<button class="btn sec2" style="margin-top:var(--s1)" onclick="aiKeySave(true)">Remove key</button>' : ''}
    <button class="btn sec2" style="margin-top:var(--s1)" onclick="closeSheet()">Cancel</button></div>`); };
  window.aiKeySave = remove => { const v = remove ? '' : ($('#aikeyin')?.value || '').trim();
    if (!remove && !v) return toast('Paste your API key first');
    S.apiKey = v || null; save(); closeSheet(); render(); toast(v ? 'AI food logging is on' : 'API key removed'); };

  // ---------- buttons in Add food ----------
  const CAM = 'M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3zM12 10a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z';
  const BAR = 'M3 5v14M7 5v14M10 5v14M14 5v14M17 5v14M21 5v14M3 5h2M19 5h2M3 19h2M19 19h2';
  const svg = d => `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
  window.aiFoodBar = () => { const on = hasKey();
    const b = (id, icon, t, sub, fn) => `<button class="ai-btn${on ? '' : ' off'}" id="${id}" ${on ? `onclick="${fn}"` : `aria-disabled="true" onclick="aiNeedKey()"`}>${svg(icon)}<span><b>${t}</b><small>${sub}</small></span></button>`;
    return `<div class="ai-bar">${b('aimeal', CAM, 'Snap a meal', 'AI estimates it', "aiPick('meal')")}${b('aiscan', BAR, 'Scan barcode', 'or nutrition label', "aiPick('scan')")}</div>
    ${on ? '' : '<p class="ai-need">You need an AI model for this. Add your Anthropic API key to turn on photo and barcode logging. <button class="aflink" onclick="aiKeySheet()">Add API key</button></p>'}`; };
  window.aiNeedKey = () => { $('#sheet').classList.remove('af');
    openSheet(`<h3 class="t-title">You need an AI model for this</h3><p class="t-body" style="margin:var(--s1) 0">Photo and barcode logging use an AI model to read your food. Add your own Anthropic API key in Settings → AI photo key to turn them on.</p>
    <button class="btn" style="margin-top:var(--s2)" onclick="aiKeySheet()">Add API key</button><button class="btn sec2" style="margin-top:var(--s1)" onclick="closeSheet();foodSheet()">Back to Add food</button>`); };
  // Camera through a file input (Capacitor shows camera / gallery on Android and iPhone).
  window.aiPick = kind => { if (!hasKey()) return aiNeedKey(); const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*'; inp.setAttribute('capture', 'environment'); inp.style.display = 'none';
    inp.onchange = () => { const f = inp.files && inp.files[0]; inp.remove(); if (f) (kind === 'meal' ? aiMealFromBlob : aiScanFromBlob)(f); };
    document.body.appendChild(inp); inp.click(); };

  // ---------- helpers ----------
  const toB64 = blob => new Promise((res, rej) => { const img = new Image(); img.onload = () => { const c = document.createElement('canvas'), s = Math.min(1, 1280 / Math.max(img.width, img.height));
    c.width = Math.round(img.width * s); c.height = Math.round(img.height * s); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(img.src); res(c.toDataURL('image/jpeg', .85).split(',')[1]); };
    img.onerror = () => rej(new Error('That image could not be read')); img.src = URL.createObjectURL(blob); });
  async function askClaude(b64, prompt) {
    const res = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': S.apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
      body: JSON.stringify({ model: MODEL, max_tokens: 800, messages: [{ role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: b64 } }, { type: 'text', text: prompt }] }] }) });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { if (res.status === 401) { S.apiKey = null; save(); throw new Error('Your API key was not accepted — add it again in Settings'); } throw new Error(j.error?.message || ('AI request failed (' + res.status + ')')); }
    const t = (j.content || []).map(c => c.text || '').join(''), m = t.match(/\{[\s\S]*\}/); if (!m) throw new Error('The AI reply could not be read');
    return JSON.parse(m[0]);
  }
  const busy = msg => { $('#sheet').classList.remove('af'); openSheet(`<div class="ai-busy"><div class="loader"></div><b>${msg}</b><small>Using your Anthropic API key</small></div>`); };
  const fail = e => { closeSheet(); toast('AI: ' + esc(e.message || String(e))); setTimeout(() => foodSheet(), 350); };

  // ---------- snap a meal ----------
  const MEAL_PROMPT = 'You are a nutrition assistant. Identify the food in this photo (Filipino dishes are common) and estimate the portion shown. Reply ONLY with JSON: {"recognized":true|false,"name":"short description","portion":"e.g. 1 plate, about 350 g","kcal":number,"protein":number,"carbs":number,"fat":number,"satFat":number,"fiber":number,"addedSugar":number,"sodiumMg":number}. Grams for macros, milligrams for sodium. If it is not food or unclear, set recognized false.';
  let AIM = null;
  window.aiMealFromBlob = async blob => { busy('Looking at your meal…');
    try { const d = await askClaude(await toB64(blob), MEAL_PROMPT); if (!d.recognized) throw new Error("Couldn't recognise food in that photo — try again or search instead"); AIM = d; aiMealCard(); }
    catch (e) { fail(e); } };
  window.aiMealCard = () => { const d = AIM, f = (k, l, u) => `<label class="affield"><span>${l}</span><span class="in"><input type="number" inputmode="decimal" data-ai="${k}" value="${d[k] ?? ''}">${u ? `<em>${u}</em>` : ''}</span></label>`;
    openSheet(`<div id="aimealcard"><h3 class="t-title">Looks like ${esc(d.name)}</h3><p class="t-caption" style="margin:4px 0 var(--s2)">${esc(d.portion || '')} · AI estimate — check the numbers and adjust before logging.</p>
    <label class="affield full"><span>Name</span><span class="in"><input data-ai="name" value="${esc(d.name)}"></span></label>
    <div class="afgrid">${f('kcal', 'Calories', 'kcal')}${f('protein', 'Protein', 'g')}${f('carbs', 'Carbs', 'g')}${f('fat', 'Fat', 'g')}${f('satFat', 'Saturated fat', 'g')}${f('fiber', 'Fibre', 'g')}${f('addedSugar', 'Added sugar', 'g')}${f('sodiumMg', 'Sodium', 'mg')}</div>
    <button class="btn" style="margin-top:var(--s2)" onclick="aiMealLog()">Log it</button><button class="btn sec2" style="margin-top:var(--s1)" onclick="closeSheet();foodSheet()">Cancel</button></div>`); };
  window.aiMealLog = () => { const v = {}; document.querySelectorAll('#aimealcard [data-ai]').forEach(i => { v[i.dataset.ai] = i.dataset.ai === 'name' ? i.value.trim() : num(i.value); });
    if (!v.name || !(v.kcal > 0)) return toast('Enter a name and the calories');
    const item = { name: v.name, totals: { kcal: v.kcal, p: v.protein || 0, c: v.carbs || 0, f: v.fat || 0, fib: v.fiber || 0 }, mult: 1,
      meta: { kind: 'ai', ...(v.satFat != null ? { sat: v.satFat } : {}), ...(v.sodiumMg != null ? { na: v.sodiumMg } : {}), ...(v.addedSugar != null ? { addedSugar: v.addedSugar } : {}) } };
    closeSheet(); window.__afLog([item]); };

  // ---------- scan a barcode / nutrition label ----------
  const SCAN_PROMPT = 'Read this photo of a packaged food. Reply ONLY with JSON: {"barcode":"digits or null","name":"product name or null","brand":"brand or null","label":null or {"per":"serving"|"100g","servingG":number|null,"kcal":number,"protein":number|null,"carbs":number|null,"fat":number|null,"satFat":number|null,"fiber":number|null,"sugar":number|null,"sodiumMg":number|null}}. Fill "label" only from a nutrition facts panel you can actually read in the photo; never guess label numbers.';
  async function localBarcode(blob) { try { if (!('BarcodeDetector' in window)) return null; const det = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'] });
    const r = await det.detect(await createImageBitmap(blob)); return r[0]?.rawValue || null; } catch (e) { return null; } }
  async function offLookup(code) { try { const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=product_name,brands,nutriments,serving_quantity`);
    if (!r.ok) return null; const j = await r.json(); if (j.status !== 1 || !j.product) return null; const p = j.product, n = p.nutriments || {}, g = k => num(n[k + '_100g']);
    if (g('energy-kcal') == null) return null;
    return { name: [p.brands && p.brands.split(',')[0], p.product_name].filter(Boolean).join(' ') || 'Scanned product', ref: '100g', size: null,
      vals: { kcal: g('energy-kcal'), p: g('proteins'), c: g('carbohydrates'), f: g('fat'), sat: g('saturated-fat'), fib: g('fiber'), sugar: g('sugars'), na: g('sodium') != null ? Math.round(g('sodium') * 1000) : null }, src: 'Open Food Facts' }; }
    catch (e) { return null; } }
  const known = code => code && (S.myIngredients || []).find(r => r.barcode === String(code));
  function openKnown(rec) { closeSheet(); setTimeout(() => { foodSheet(); afOpenIng('my_' + rec.id); toast(`Scanned: ${esc(rec.name)}`); }, 300); }
  function openForm(rec, code, note) { closeSheet(); setTimeout(() => { foodSheet(); afPrefillIng({ ...rec, barcode: code || null }); toast(note); }, 300); }
  window.aiScanFromBlob = async blob => { busy('Reading the barcode…');
    try {
      let code = await localBarcode(blob);
      if (known(code)) return openKnown(known(code));
      let off = code ? await offLookup(code) : null;
      if (off) return openForm(off, code, 'Found on Open Food Facts — check and save');
      const d = await askClaude(await toB64(blob), SCAN_PROMPT);
      code = code || (d.barcode && String(d.barcode).replace(/\D/g, '')) || null;
      if (known(code)) return openKnown(known(code));
      if (code && !off) off = await offLookup(code);
      if (off) return openForm(off, code, 'Found on Open Food Facts — check and save');
      const L = d.label, name = [d.brand, d.name].filter(Boolean).join(' ') || 'Scanned product';
      if (L && num(L.kcal) != null) return openForm({ name, ref: L.per === 'serving' && num(L.servingG) ? 'serving' : '100g', size: L.per === 'serving' ? num(L.servingG) : null,
        vals: { kcal: num(L.kcal), p: num(L.protein), c: num(L.carbs), f: num(L.fat), sat: num(L.satFat), fib: num(L.fiber), sugar: num(L.sugar), na: num(L.sodiumMg) } }, code, 'Read from the label — check and save');
      return openForm({ name, ref: '100g', size: null, vals: {} }, code, code ? 'Not in Open Food Facts — photograph the nutrition label, or enter it once' : "Couldn't read a barcode — enter the label once and it's saved");
    } catch (e) { fail(e); } };

  // ---------- Settings: the key row opens the sheet ----------
  const _vs = V.settings; V.settings = (...a) => _vs(...a).replace(`S.apiKey=prompt('Anthropic API key',S.apiKey||'')||null;save();toast('Saved')`, 'aiKeySheet()')
    .replace(/(<b>AI photo key<\/b><small>)(Set ✓|Not set)/, (m0, a1, st) => a1 + (st === 'Not set' ? 'Not set · needed for photo and barcode logging' : 'Set ✓ · photo and barcode logging on'));

  document.head.insertAdjacentHTML('beforeend', `<style>
  .ai-bar{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:var(--s1) 0 var(--s1)}
  .ai-btn{display:flex;align-items:center;gap:10px;min-height:56px;padding:10px 12px;border-radius:14px;border:1.5px solid var(--line);background:var(--surface);color:var(--ink);text-align:left;cursor:pointer}
  .ai-btn svg{flex:none;color:var(--accent)}.ai-btn b{display:block;font-size:14px}.ai-btn small{display:block;font-size:12px;color:var(--ink-2)}
  .ai-btn.off{opacity:.45;filter:grayscale(1);cursor:not-allowed}.ai-btn.off svg{color:var(--ink-2)}
  .ai-need{font-size:13px;color:var(--ink-2);margin:0 0 var(--s1);line-height:1.45}.ai-need .aflink{display:inline;padding:0;margin-left:4px}
  .ai-busy{display:grid;place-items:center;gap:8px;padding:var(--s3) 0;text-align:center}.ai-busy .loader{width:46px;height:46px;border-width:5px}.ai-busy small{color:var(--ink-2)}
  </style>`);
})();
