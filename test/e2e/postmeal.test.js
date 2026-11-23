// After-meal walk pop-up: once per meal, queued behind other pop-ups, can be turned off; "Remind me in 10 min";
// the old inline "Just ate?" caption is gone; the meal-ideas chip wraps instead of clipping.
const test = require('node:test'), assert = require('node:assert/strict');
const { launch, baseState } = require('./harness');
let p;
test.before(async () => { p = await launch(); });
test.after(async () => { await p.close(); });
const td = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const wait = ms => `await new Promise(r=>setTimeout(r,${ms}));`;
// Log one food the way the meal-ideas "Log" button does (add-food logItems → afterMeal after 350 ms).
const LOG = (name = 'Banana', kcal = 105) => `afLogItemsExt([{name:'${name}',totals:{kcal:${kcal},p:1,c:27,f:0,fib:3,sat:0},mult:1,meta:{kind:'custom'}}]);`;
const POP = `(()=>{const w=$('#sheet.show .wp');return w?{txt:w.innerText,btns:[...w.querySelectorAll('button')].map(b=>b.innerText.trim())}:null})()`;

test('logging a meal today shows the walk pop-up once, with Start walk / Remind me in 10 min / Dismiss', async () => {
  await p.open({ state: baseState() });
  const r = await p.eval(`stack=[];go('meals');let opens=0;const _o=openSheet;openSheet=h=>{if(/class="wp"/.test(h))opens++;_o(h)};
    ${LOG()}${wait(700)}const first=${POP};
    $('#sheet .wp-dismiss').click();${wait(500)}
    afterMeal('Banana',105);render();go('meals');${wait(700)}const again=${POP};
    ${LOG('Rice', 205)}${wait(700)}const second=${POP};closeSheet();
    return {first,again,second,opens,seen:S.walkSeen}`);
  assert.ok(r.first, 'pop-up shown'); assert.match(r.first.txt, /Nice — Banana logged/); assert.match(r.first.txt, /10-minute walk/);
  for (const b of ['Start walk', 'Remind me in 10 min', 'Dismiss']) assert.ok(r.first.btns.includes(b), b);
  assert.ok(r.first.btns.includes("Don't show these"));
  assert.equal(r.again, null, 'same entry does not show again');
  assert.ok(r.second, 'a new meal shows it again'); assert.match(r.second.txt, /Rice/);
  assert.equal(r.opens, 2); assert.equal(r.seen.d, td()); assert.equal(r.seen.k.length, 2);
  assert.deepEqual(p.errors, []);
});

test('Start walk closes the pop-up and starts a walk', async () => {
  await p.open({ state: baseState() });
  const r = await p.eval(`let started=null;startRun=t=>{started=t};${LOG()}${wait(700)}$('#sheet .wp-start').click();return {started,open:!!$('#sheet.show')}`);
  assert.equal(r.started, 'walk'); assert.equal(r.open, false);
});

test('no pop-up for a past day, or when turned off in Settings › Reminders', async () => {
  await p.open({ state: baseState() });
  const r = await p.eval(`const y=(()=>{const d=new Date();d.setDate(d.getDate()-1);return iso(d)})();viewDate=y;${LOG()}${wait(700)}const past=${POP};viewDate=today();closeSheet();${wait(450)}
    stack=[];push('settings');const settingsRow=/Reminders/.test($('#app').innerText);push('notifs');const row=$('#walkpop-row');const label=row&&row.innerText;row.click();
    const off=S.notif.walkPop;const label2=$('#walkpop-row').innerText;
    ${LOG()}${wait(700)}const after=${POP};return {past,settingsRow,label,off,label2,after}`);
  assert.equal(r.past, null); assert.ok(r.settingsRow);
  assert.match(r.label, /After-meal walk pop-up/); assert.match(r.label, /ON/);
  assert.equal(r.off, false); assert.match(r.label2, /OFF/); assert.equal(r.after, null);
  assert.deepEqual(p.errors, []);
});

test('"Don\'t show these" turns it off', async () => {
  await p.open({ state: baseState() });
  const r = await p.eval(`${LOG()}${wait(700)}$('#sheet .wp-off').click();${wait(450)}const off=S.notif.walkPop;${LOG('Egg', 70)}${wait(700)}return {off,pop:${POP}}`);
  assert.equal(r.off, false); assert.equal(r.pop, null);
});

test('queue: the walk pop-up waits for another sheet or a rank-up overlay instead of stacking', async () => {
  await p.open({ state: baseState({ food: { [td()]: [['Rice', 205, 4]] } }) });
  const r = await p.eval(`openSheet('<p id="other">Other sheet</p>');afterMeal('Rice',205);${wait(500)}
    const whileOther={other:!!$('#sheet.show #other'),wp:!!$('#sheet .wp'),q:Pop.queued()};
    closeSheet();${wait(700)}const afterOther=!!$('#sheet.show .wp');closeSheet();${wait(500)}
    S.food[today()].push(['Egg',70,6]);S.rankPop=true;S.rankQ=[{k:'overall',i:1}];showRankQueue();const over=!!$('.w-over');
    afterMeal('Egg',70);${wait(500)}const whileRank={wp:!!$('#sheet.show'),q:Pop.queued()};
    $('.w-over .btn').click();${wait(800)}const afterRank={wp:!!$('#sheet.show .wp'),over:!!$('.w-over')};
    S.rankQ=[{k:'overall',i:2}];showRankQueue();const rankWhileSheet=!!$('.w-over');closeSheet();${wait(800)}const rankAfter=!!$('.w-over');$('.w-over .btn')?.click();
    return {whileOther,afterOther,over,whileRank,afterRank,rankWhileSheet,rankAfter}`);
  assert.deepEqual(r.whileOther, { other: true, wp: false, q: ['walk'] });
  assert.equal(r.afterOther, true);
  assert.equal(r.over, true); assert.deepEqual(r.whileRank, { wp: false, q: ['walk'] });
  assert.deepEqual(r.afterRank, { wp: true, over: false });
  assert.equal(r.rankWhileSheet, false, 'rank overlay waits for the walk pop-up'); assert.equal(r.rankAfter, true);
  assert.deepEqual(p.errors, []);
});

test('queue: a fasting note replaces the walk pop-up for that meal', async () => {
  await p.open({ state: baseState() });
  const r = await p.eval(`FAST_NOTE={kind:'late',mins:90};${LOG()}${wait(700)}return {fast:/You broke your fast/.test($('#sheet.show')?.innerText||''),wp:!!$('#sheet .wp'),q:Pop.queued()}`);
  assert.deepEqual(r, { fast: true, wp: false, q: [] });
});

test('Remind me in 10 min schedules a local notification and an in-app fallback', async () => {
  const inject = `window.__ln=[];window.Capacitor={Plugins:{LocalNotifications:{checkPermissions:async()=>({display:'granted'}),requestPermissions:async()=>({display:'granted'}),
    getPending:async()=>({notifications:[]}),cancel:async o=>{window.__ln.push(['cancel',o.notifications.map(n=>n.id)])},schedule:async o=>{window.__ln.push(['schedule',o.notifications.map(n=>({id:n.id,at:+new Date(n.schedule.at),title:n.title}))])},addListener:()=>{}}}};`;
  await p.open({ state: baseState(), inject });
  const r = await p.eval(`${LOG()}${wait(700)}window.__ln.length=0;const t0=Date.now();$('#sheet .wp-later').click();${wait(200)}
    const sch=window.__ln.filter(x=>x[0]==='schedule').flatMap(x=>x[1]).filter(n=>n.id>=2100&&n.id<2200);
    const rem=S.walkRemind&&{id:S.walkRemind.id,dt:S.walkRemind.at-t0};
    await schedNotifs();const kept=window.__ln.filter(x=>x[0]==='schedule').flatMap(x=>x[1]).filter(n=>n.id===2100).length;
    walkDue();${wait(300)}const due=$('#sheet.show .wp')?.innerText||'';const cancelled=window.__ln.some(x=>x[0]==='cancel'&&x[1].includes(2100));
    return {sch,rem,kept,due,cancelled,cleared:S.walkRemind}`);
  assert.equal(r.sch.length, 1); assert.equal(r.sch[0].id, 2100); assert.match(r.sch[0].title, /walk/i);
  assert.equal(r.rem.id, 2100); assert.ok(Math.abs(r.rem.dt - 600000) < 2000, String(r.rem.dt));
  assert.ok(r.kept >= 2, 're-added after a full reschedule');
  assert.match(r.due, /Time for your 10-minute walk/); assert.ok(r.cancelled); assert.equal(r.cleared, null);
  assert.deepEqual(p.errors, []);
});

test('Meals screen: no inline "Just ate?" caption; the meal-ideas chip wraps and has no fixed height', async () => {
  await p.open({ state: baseState({ food: { [td()]: [['Rice', 205, 4]] }, sgOpen: td() }) });
  const r = await p.eval(`stack=[];go('meals');${wait(200)}const chip=$('.sgchip');if(!chip)return {chip:false};chip.open=true;
    const span=chip.querySelector('summary span'),body=chip.querySelector('.sgbody'),cs=getComputedStyle(span),bs=getComputedStyle(body);
    const rows=[...body.querySelectorAll('.li')].map(li=>{const r=li.getBoundingClientRect(),b=li.querySelector('button').getBoundingClientRect(),c=chip.getBoundingClientRect();return b.right<=c.right+0.5&&r.right<=c.right+0.5});
    span.textContent='💡 '+'Supercalifragilistic '.repeat(8);const sr=span.getBoundingClientRect(),ch=chip.getBoundingClientRect();
    return {chip:true,justAte:/Just ate\\?/.test($('#app').innerText),ws:cs.whiteSpace,minW:cs.minWidth,h:bs.height===body.scrollHeight+'px'||bs.maxHeight==='none',maxH:bs.maxHeight,ov:bs.overflow,
      rows,spanFits:sr.right<=ch.right+0.5,walkInChip:/walk/i.test(chip.innerText)}`);
  assert.ok(r.chip, 'chip rendered'); assert.equal(r.justAte, false);
  assert.notEqual(r.ws, 'nowrap'); assert.equal(r.minW, '0px'); assert.equal(r.maxH, 'none'); assert.equal(r.ov, 'visible');
  assert.ok(r.rows.length > 0 && r.rows.every(Boolean), 'rows and Log buttons stay inside the chip');
  assert.ok(r.spanFits, 'long summary wraps inside the chip'); assert.equal(r.walkInChip, false);
});

test('sheets fit the dynamic viewport; sticky add-food bars keep the bottom safe-area inset', async () => {
  await p.open({ state: baseState() });
  const r = await p.eval(`foodSheet();afOpenIng('banana');${wait(700)}const sh=$('#sheet'),h=sh.getBoundingClientRect().height,bar=$('#sheet .afbar');
    const css=[...document.querySelectorAll('style')].map(s=>s.textContent).join('\\n');
    return {h,vh:innerHeight,top:sh.getBoundingClientRect().top,bar:!!bar,barIn:bar?bar.getBoundingClientRect().bottom<=innerHeight+0.5:true,
      dvh:/#sheet\\.af\\{[^}]*100dvh - env\\(safe-area-inset-top\\)/.test(css)&&/#sheet\\{[^}]*100dvh - env\\(safe-area-inset-top\\)/.test(css),afbarSafe:/\\.afbar\\{[^}]*env\\(safe-area-inset-bottom\\)/.test(css)}`);
  assert.ok(r.h <= r.vh - 12 + 0.5, `${r.h} vs ${r.vh}`); assert.ok(r.top >= 11.5); assert.ok(r.barIn);
  assert.ok(r.dvh); assert.ok(r.afbarSafe);
});
