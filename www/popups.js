// RepWise pop-up queue: one pop-up at a time. Bottom sheets (#sheet.show) and full-screen overlays (.w-over)
// never stack — a pop-up that arrives while another is showing waits, then opens when the current one closes.
//   Pop.show(id, openFn, {priority})  → runs openFn now when nothing is showing, otherwise queues it (deduped by id)
//   Pop.busy()                         → true while a sheet or overlay is on screen
// Loaded right after core.js so every later layer can use it. Closing is detected by watching the DOM (the sheet's
// "show" class and .w-over removal), so it works no matter which layer wraps closeSheet.
(function () {
  const q = [];
  let timer = null;
  const busy = () => !!document.querySelector('#sheet.show, .w-over');
  function run(x) { try { x.fn(); } catch (e) { console.error('popup', x.id, e); } if (!busy()) kick(); }
  function next() { timer = null; if (!q.length || busy()) return; run(q.shift()); }
  // Wait for the closing sheet to slide away (and for any follow-up the closer opens itself) before showing the next.
  function kick(ms = 450) { if (!q.length) return; clearTimeout(timer); timer = setTimeout(next, ms); }
  function show(id, fn, opt = {}) {
    if (!busy()) { run({ id, fn }); return true; }
    if (!q.some(x => x.id === id)) { q.push({ id, fn, pr: opt.priority || 0 }); q.sort((a, b) => b.pr - a.pr); }
    return false;
  }
  let was = false;
  const watch = () => { const b = busy(); if (was && !b) kick(); was = b; };
  // .w-over overlays are appended straight to <body>; the sheet toggles its "show" class.
  const start = () => { was = busy(); const mo = new MutationObserver(watch), sh = document.getElementById('sheet');
    mo.observe(document.body, { childList: true }); if (sh) mo.observe(sh, { attributes: true, attributeFilter: ['class'] }); };
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
  window.Pop = { show, busy, queued: () => q.map(x => x.id), clear: id => { for (let i = q.length - 1; i >= 0; i--) if (!id || q[i].id === id) q.splice(i, 1); } };
})();
