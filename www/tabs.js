// RepWise tabs: Today is only today's to-do list; everything else from the old Today screen lives in a new Discover tab.
//   Today:    greeting, date, fasting timer (when on), Must do, Optional, "Change today's workout"
//   Discover: overall rank, Modes, muscle balance, this week's plan, Learn (article + science tip), Tips for you
// Many layers inject into V.plan by matching its HTML, so the full screen is still built the same way and then split here.
(function () {
  if (typeof V === 'undefined' || !V.plan) return;
  TABS.splice(TABS.findIndex(t => t[0] === 'more'), 0, ['discover', 'Discover']);
  ICONS.discover = '<circle cx="12" cy="12" r="10"/><path d="m16.24 7.76-2.12 6.36-6.36 2.12 2.12-6.36z"/>';

  const MOVE_SEC = /^(This week|Learn|Tips for you)/;           // these sections and everything after them in their block
  const MOVE_CLS = ['rk-card', 'md-card', 'wp-balc'];            // rank card, Modes card, muscle balance card
  function split(html) {
    const t = document.createElement('template'); t.innerHTML = html;
    const today = [], disc = []; let moving = false;
    for (const e of [...t.content.childNodes]) {
      if (e.nodeType !== 1) { (moving ? disc : today).push(e); continue; }
      if (e.classList.contains('sec')) moving = MOVE_SEC.test((e.textContent || '').replace(/^[^A-Za-z]+/u, ''));   // headings start with an emoji in the raw HTML
      (moving || MOVE_CLS.some(c => e.classList.contains(c)) ? disc : today).push(e);
    }
    const out = list => list.map(n => n.nodeType === 1 ? n.outerHTML : n.nodeType === 3 ? n.textContent : '').join('');
    return { today: out(today), disc: out(disc) };
  }
  const _plan = V.plan;
  window.fullPlanHtml = () => _plan();
  V.plan = (...a) => { const h = _plan(...a); if (!S.profile) return h;
    return split(h).today; };
  V.discover = () => {
    if (!S.profile) return `<div class="top"><h1>Discover</h1></div><p class="muted">Finish setting up your plan first.</p>`;
    const vd = viewDate; viewDate = today(); let h; try { h = _plan(); } finally { viewDate = vd; }
    return `<div class="top"><h1>Discover</h1></div><p class="t-caption tb-sub">Your rank, modes, this week's plan, and something new to learn every day.</p>${split(h).disc}`;
  };
  document.head.insertAdjacentHTML('beforeend', `<style>
  .tb-sub{margin:-4px 0 var(--s2);color:var(--ink-2)}
  </style>`);
  if (typeof drawNav === 'function') drawNav();
  if (typeof render === 'function') render();
})();
