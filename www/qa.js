// RepWise QA hardening layer (loaded last): render stability, injection checks, back button,
// backup UI, notification de-duplication. No new features.
(function () {
  // ---------- 1. Recovery notice after a damaged save ----------
  const st = window.__loadStatus || 'ok';
  // Native: no last-good copy available → try the newest dated file backup.
  if (st === 'corrupt' && window.Capacitor?.Plugins?.Filesystem) RWStore.listBackups().then(async l => { if (!l.length) return; try { const d = RWStore.migrate(await RWStore.readBackup(l[0])); localStorage.setItem('gq', JSON.stringify(d)); sessionStorage.rwRecovered = l[0]; location.reload(); } catch (e) {} });
  if (sessionStorage.rwRecovered) { const f = sessionStorage.rwRecovered; delete sessionStorage.rwRecovered; setTimeout(() => toast(`Your saved data was damaged — restored from backup ${f.replace('repwise-', '').replace('.json', '')}`), 600); }
  if (st !== 'ok') setTimeout(() => toast(st.startsWith('recovered') ? `Your saved data was damaged — restored from ${st.split(':')[1]} backup` : 'Your saved data couldn’t be read. A copy was kept; you can restore a backup in Settings.'), 600);

  // ---------- 2. Keep focus, caret and scroll across re-renders ----------
  function capture(root) {
    const a = document.activeElement, keep = { y: window.scrollY, inner: [...root.querySelectorAll('.afscr')].map(e => e.scrollTop) };
    if (a && root.contains(a) && (a.id || a.dataset.k) && /INPUT|TEXTAREA|SELECT/.test(a.tagName)) { keep.focus = a.id ? '#' + a.id : `[data-k="${a.dataset.k}"]`; try { keep.sel = [a.selectionStart, a.selectionEnd]; } catch (e) {} keep.val = a.value; }
    return keep;
  }
  function restore(root, k, sameScreen) {
    if (k.focus) { const el = root.querySelector(k.focus); if (el) { el.focus({ preventScroll: true }); try { if (k.sel && el.value === k.val) el.setSelectionRange(...k.sel); } catch (e) {} } }
    if (sameScreen) { [...root.querySelectorAll('.afscr')].forEach((e, i) => { if (k.inner[i] != null) e.scrollTop = k.inner[i]; }); }
  }
  const _render = render;
  window.render = render = function (anim) {
    const app = $('#app'), key = (stack.length ? stack.at(-1)[0] : tab) + '|' + (typeof trainSub !== 'undefined' ? trainSub : '');
    const k = capture(app), same = key === render._last;
    _render(anim); render._last = key;
    restore(app, k, same); if (same && !anim) window.scrollTo(0, k.y);
  };
  // Add-food sheet: same-screen refreshes keep the sheet's scroll position and focused field.
  if (window.AF_show) {
    const sheet = $('#sheet'), _show = window.AF_show;
    window.AF_show = () => { const k = capture(sheet), scr = AF.screen; _show(); restore(sheet, k, scr === AF.screen); };
    // internal re-renders go through show(); patch the common entry points that refresh in place
    for (const fn of ['afEdit', 'afG', 'afSetG', 'afDel', 'afVar', 'afCut', 'afN', 'afMethod', 'afOil', 'afItemG', 'afPlEdit', 'afPlMult', 'afManual']) {
      const orig = window[fn]; if (typeof orig !== 'function') continue;
      window[fn] = function (...a) { const k = capture(sheet), scr = AF.screen; const r = orig.apply(this, a); restore(sheet, k, scr === AF.screen); return r; };
    }
  }

  // ---------- 3. Android hardware back: sheet → stack → Today → double-press to exit ----------
  const App = window.Capacitor?.Plugins?.App; let lastBack = 0;
  window.handleBack = function () {
    const sh = $('#sheet');
    if (sh && sh.classList.contains('show')) { if (window.AF && sh.classList.contains('af') && AF.screen && AF.screen !== 'search') { const up = { dish: 'search', item: 'search', my: 'search', plate: 'search', builder: AF.from === 'dish' ? 'dish' : AF.from === 'my' ? 'my' : 'search', ing: 'builder' }[AF.screen] || 'search'; afBack(up); } else closeSheet(); return 'sheet'; }
    if (typeof OB !== 'undefined' && OB.active && S.profile) { if (OB.step > 0) { OB.step--; render('pop'); } else if (window.exitOB) exitOB(); return 'onboarding'; }
    if (stack.length) { back(); return 'pop'; }
    if (tab !== 'plan') { go('plan'); return 'today'; }
    if (Date.now() - lastBack < 2000) { App?.exitApp?.(); return 'exit'; }
    lastBack = Date.now(); toast('Press back again to exit'); return 'arm';
  };
  if (App?.addListener) App.addListener('backButton', () => window.handleBack());
  else document.addEventListener('backbutton', e => { e.preventDefault(); window.handleBack(); });

  // ---------- 4. Settings: last backup + restore ----------
  const _set = V.settings;
  V.settings = () => _set().replace('<div class="row" onclick="push(\'transfer\')">', `<div class="row" onclick="backupSheet()"><span style="font-size:22px">💾</span><div class="rbody"><b>Automatic backups</b><small>Last backup: ${S.lastBackup ? new Date(S.lastBackup).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'not yet'} · keeps 7 days</small></div><span class="chev">›</span></div><div class="row" onclick="push('transfer')">`);
  window.backupSheet = async () => {
    const list = await RWStore.listBackups();
    openSheet(`<h3 class="t-title">Automatic backups</h3><p class="t-caption" style="margin:6px 0 var(--s2)">A copy of your data is saved on this phone once a day. The newest 7 are kept.</p>
      ${list.length ? `<div class="plist">${list.map(n => `<div class="li"><div style="flex:1"><b>${esc(n.replace('repwise-', '').replace('.json', ''))}</b></div><button class="pg-link" style="text-decoration:none" data-file="${esc(n)}" onclick="restoreBackup(this.dataset.file)">Restore</button></div>`).join('')}</div>` : `<div class="empty">${window.Capacitor?.Plugins?.Filesystem ? 'No backups yet — the first one is made today.' : 'Daily file backups run in the Android app.'}</div>`}`);
  };
  window.restoreBackup = async name => {
    if (!confirm(`Restore the backup from ${name.replace('repwise-', '').replace('.json', '')}?\n\nEverything logged after it will be replaced.`)) return;
    try { const data = RWStore.migrate(await RWStore.readBackup(name)); localStorage.setItem('gq', JSON.stringify(data)); location.reload(); } catch (e) { toast('Couldn’t read that backup'); }
  };
})();

// ---------- 5. Dev mode: report HTML-injection anchors that aren't found ----------
// Views are extended by string-injecting markup at known anchors. If an anchor changes, the feature
// silently vanishes. With localStorage.rwDev='1' (or ?dev), a missing anchor logs a visible error.
(function () {
  if (!(localStorage.getItem('rwDev') === '1' || /[?&]dev\b/.test(location.search))) return;
  const R = String.prototype.replace; window.__anchorMiss = [];
  String.prototype.replace = function (a, b) {
    if (typeof a === 'string' && a.length > 12 && a[0] === '<' && !this.includes(a)) { const msg = 'Injection anchor not found: ' + a.slice(0, 80); window.__anchorMiss.push(msg); console.error(msg); }
    return R.call(this, a, b);
  };
})();

// ---------- 6. Day rollover while the app stays open ----------
// viewDate is set at launch; if the app is left open (or resumed) after midnight it kept logging into
// yesterday. When the calendar day changes, a view that was on "today" moves to the new today.
(function () {
  let lastToday = today();
  window.__dayTick = function () {
    const t = today(); if (t === lastToday) return false;
    const wasToday = viewDate === lastToday; lastToday = t;
    if (wasToday) viewDate = t;
    try { ensureWeek(); } catch (e) {}
    render(); return true;
  };
  window.__setLastToday = d => { lastToday = d; };
  document.addEventListener('visibilitychange', () => { if (!document.hidden) window.__dayTick(); });
  setInterval(() => { if (!document.hidden) window.__dayTick(); }, 30000);
})();
