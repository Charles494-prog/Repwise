// RepWise Modes: one place to see and switch every special mode / feature toggle.
//  - a compact "Modes" card on the home (Plan) screen
//  - Settings → "Modes & features" (V.modes) with every toggle, a one-line description and its on/off state
// Each entry calls the toggle that already exists in its own layer; nothing is re-implemented here.
(function () {
  const hwSteps = () => typeof stepSt !== 'undefined' && stepSt.available && stepSt.granted;
  const notifOn = () => Object.keys(S.notif || {}).filter(k => S.notif[k]).length;
  // [id, icon, name, description, state() → true/false/string, toggle (onclick) | null, open (onclick) | null, onHome]
  const MODES = () => [
    ['ultra', '🛡️', 'Ultra-Health Mode', 'Personal sugar, fat & sodium limits from your BP and glucose, a hard added-sugar cap, nutrient gaps and health warnings.', () => !!S.ultra?.on, 'toggleUltra()', "push('ultra')", 1],
    ['fast', '⏳', 'Intermittent fasting', 'Eating-window timer, window reminders and notes for meals outside your window.', () => !!S.fast?.on, 'togFast()', "push('fasting')", 1],
    ['balance', '⚖️', 'Balance warnings', 'Asks before you train a muscle you’ve already worked hard this week. Never blocks.', () => !!S.balance?.warn, 'S.balance.warn=!S.balance.warn;save();render()', "push('balance')", 1],
    ['rank', '🏅', 'Rank-up pop-ups', 'Celebrates a new rank after a workout or activity.', () => !!S.rankPop, 'S.rankPop=!S.rankPop;save();render()', null, 1],
    ['rot', '🔄', 'Rotate equivalent exercises', 'Swaps in an equivalent exercise each session (same movement, new angle); main lifts stay fixed.', () => !!S.rotEq, "S.rotEq=!S.rotEq;save();render();toast(S.rotEq?'🔄 Exercises rotate to an equivalent each day':'Rotation off')", null, 1],
    ['notif', '🔔', 'Reminders', 'Water, meals, fasting window, workouts and weigh-ins.', () => `${notifOn()} of ${Object.keys(S.notif || {}).length} on`, null, "push('notifs')", 1],
    ['late', '🌤️', 'Late-start insight', 'A gentle note when you break your fast long after your window opens (fasting only).', () => !!S.fast?.lateInsight, 'S.fast.lateInsight=!S.fast.lateInsight;save();render()', "push('fasting')", 0],
    ['steps', '👟', 'Step counting', 'Counts your steps all day for the Walk goal and step XP.', () => hwSteps() ? !!S.autoSteps : !!(typeof pedo !== 'undefined' && pedo.on), "if(typeof stepSt!=='undefined'&&stepSt.available&&stepSt.granted)setAutoSteps(!S.autoSteps);else{pedo.on?stopPedo():startPedo()}render()", null, 0],
    ['deload', '🪶', 'Deload', 'One light session (~60% weights) to recover. Switch it on from the workout screen during a workout.', () => S.active ? (S.active.deload ? 'On (this workout)' : 'Off (this workout)') : 'Per workout', null, "S.active?deloadSheet():toast('Start a workout, then tap Deload on the workout screen')", 0],
    ['lang', '🗣️', 'Coach language', 'English or Taglish coach voice.', () => S.profile?.lang === 'tl' ? 'Taglish' : 'English', "setLang(S.profile?.lang==='tl'?'en':'tl')", null, 0],
    ['routes', '🗺️', 'Route suggestions', 'Suggests running and walking loops near you (needs your own free key).', () => !!S.orsKey, null, 'routeKeyScreen()', 0],
    ['ai', '🤖', 'AI food photos', 'Log a meal from a photo using your own Anthropic API key.', () => !!S.apiKey, null, "push('settings')", 0],
  ];
  const chip = st => typeof st === 'string' ? `<span class="md-st">${esc(st)}</span>` : `<span class="md-st ${st ? 'on' : ''}">${st ? 'On' : 'Off'}</span>`;
  const sw = (on, js, name) => `<button class="sw ${on ? 'on' : ''}" role="switch" aria-checked="${on}" aria-label="${name}" onclick="event.stopPropagation();${js}"><i></i></button>`;
  window.MODES = MODES;

  // ---------- home card ----------
  function modesCard() { const L = MODES().filter(m => m[7]);
    return `<div class="card md-card"><div class="md-h"><b>🎛️ Modes</b><small onclick="push('modes')">All modes ›</small></div>
    ${L.map(([id, e, n, desc, st, tog, open]) => { const s = st(), sub = id === 'ultra' && s && window.ultraSummary ? ultraSummary() : desc;
      return `<div class="md-row" data-mode="${id}" ${open ? `onclick="${open}"` : tog ? `onclick="${tog}"` : ''}><span class="md-e">${e}</span><div class="md-b"><b>${n}</b><small>${esc(sub)}</small></div>${typeof s === 'string' || !tog ? chip(s) : sw(s, tog, n)}</div>`; }).join('')}</div>`; }
  window.modesCard = modesCard;
  const _pM = V.plan; V.plan = () => { const h = _pM(); if (!S.profile || viewDate !== today()) return h;
    const k = h.indexOf('🌿 Optional'), i = k >= 0 ? h.lastIndexOf('<div class="sec"', k) : -1;
    return i >= 0 ? h.slice(0, i) + modesCard() + h.slice(i) : h + modesCard(); };

  // ---------- Modes screen ----------
  V.modes = () => { const all = MODES();
    const row = ([id, e, n, desc, st, tog, open]) => { const s = st();
      const act = open || (tog && typeof s === 'string' ? tog : '');
      return `<div class="md-row big" data-mode="${id}" ${act ? `onclick="${act}"` : 'style="cursor:default"'}><span class="md-e">${e}</span><div class="md-b"><b>${n}</b><small>${esc(desc)}</small></div>${tog && typeof s !== 'string' ? sw(s, tog, n) : chip(s)}${act ? '<span class="chev">›</span>' : ''}</div>`; };
    return `<div class="top">${backBtn()}<h1 style="font-size:22px;flex:1;margin-left:var(--s1)">Modes & features</h1><span></span></div>
    <p class="t-caption" style="margin:0 0 var(--s2)">Every special mode in RepWise in one place. Tap a switch to turn it on or off, or the row for its settings.</p>
    <div class="sec">Health & food</div><div class="card md-list">${all.filter(m => ['ultra', 'fast', 'late'].includes(m[0])).map(row).join('')}</div>
    <div class="sec">Training</div><div class="card md-list">${all.filter(m => ['balance', 'rank', 'rot', 'deload'].includes(m[0])).map(row).join('')}
     <div class="md-row big" style="cursor:default;display:block"><div class="md-b"><b>🏢 Equipment</b><small>Exercises are picked for what you have.</small></div>${typeof equipBar === 'function' ? equipBar() : ''}</div></div>
    <div class="sec">Activity & app</div><div class="card md-list">${all.filter(m => ['steps', 'routes', 'notif', 'lang', 'ai'].includes(m[0])).map(row).join('')}</div>
    <div style="height:var(--s4)"></div>`; };

  // ---------- Settings rows ----------
  const _sM = V.settings; V.settings = () => { const h = _sM(), k = h.indexOf('<div class="row" onclick="push(\'fasting\')">'), on = MODES().filter(m => m[4]() === true).length;
    const rows = `<div class="row" onclick="push('modes')"><span style="font-size:22px">🎛️</span><div class="rbody"><b>Modes & features</b><small>${on} on · Ultra-Health, fasting, warnings, pop-ups and more</small></div><span class="chev">›</span></div>
     <div class="row" onclick="push('ultra')"><span style="font-size:22px">🛡️</span><div class="rbody"><b>Ultra-Health Mode</b><small>${S.ultra?.on ? 'On' : 'Off'} · strict limits, sugar cap, health warnings</small></div><span class="chev">›</span></div>`;
    return k >= 0 ? h.slice(0, k) + rows + h.slice(k) : h + `<div class="list">${rows}</div>`; };

  document.head.insertAdjacentHTML('beforeend', `<style>
  .md-card{padding:10px 14px}.md-h{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:4px}.md-h small{color:var(--accent);font-weight:700;cursor:pointer}
  .md-row{display:flex;align-items:center;gap:10px;padding:8px 0;border-top:1px solid var(--line);cursor:pointer;min-width:0}.md-h+.md-row,.md-list>.md-row:first-child{border-top:none}
  .md-e{font-size:20px;flex:none;width:26px;text-align:center}.md-b{flex:1;min-width:0}.md-b b{display:block;font-size:14px}.md-b small{display:block;font-size:12px;color:var(--ink-2);line-height:1.35}
  .md-card .md-b small{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.md-row .sw{transform:scale(.85)}
  .md-st{flex:none;font-size:12px;font-weight:700;padding:3px 8px;border-radius:999px;background:var(--fill);color:var(--ink-2)}.md-st.on{background:var(--ok,#16a34a);color:#fff}
  .md-row.big{padding:12px 0}.md-list{padding:4px 14px}
  </style>`);
  if (typeof render === 'function') render();
})();
