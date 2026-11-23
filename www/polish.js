// RepWise mobile polish (loaded last). Found by test/e2e/polish.test.js at 320×568, 390×844 and 430×932, light + dark,
// normal + 130% text, with a notch and home indicator:
//  - tap targets: every control gets at least a 44×44 hit area (an invisible ::after around small buttons, so the
//    layout doesn't change); the bottom nav is 44 px tall
//  - dark-mode contrast: icon buttons, nav labels, "+ Add food", weight-trend chip, chevrons
//  - safe areas: the add-food list stops above the home indicator
(function () {
  document.head.insertAdjacentHTML('beforeend', `<style id="rw-polish">
  nav button{min-height:44px;color:var(--ink-2)}nav button.on{color:var(--ink)}
  .iconbtn{color:var(--ink)}
  .chev{color:var(--ink-2)}
  .lg-add{color:var(--surface)}
  .pg-trend.ok{background:color-mix(in srgb,var(--ok) 16%,var(--surface));color:var(--ink)}
  .pg-trend.bad{background:color-mix(in srgb,var(--accent) 16%,var(--surface));color:var(--ink)}
  #sheet.af .afscr{margin-bottom:env(safe-area-inset-bottom);padding-bottom:96px}
  #pw,#pr,#afq,.afsearch input{min-height:44px}
  .rw-inl{display:inline-block}
  /* sticky action buttons (e.g. "Restart with this workout") sit on a fade of the page background, so text never shows underneath */
  .sticky{padding-top:22px;padding-bottom:6px;background:linear-gradient(to bottom,transparent,var(--bg) 42%);z-index:5}
  /* dark mode: accent-coloured text links ("Change", "See all", "Manage") are lightened to stay readable */
  /* (inline styles are re-serialised with a space after the colon once polish.js adds variables, so match both forms) */
  body[data-mode=dark] [onclick]:is([style*="color:var(--acc)"],[style*="color: var(--acc)"],[style*="color:var(--accent)"],[style*="color: var(--accent)"]):not([style*="background"]){color:color-mix(in srgb,var(--accent) 60%,var(--ink))!important}
  /* white text on --ink (which is light in dark mode) → surface colour */
  :is(button,a,span,b):is([style*="background:var(--ink)"],[style*="background: var(--ink)"]){color:var(--surface)!important}
  :is([style*="background:var(--good)"],[style*="background: var(--good)"]):is([style*="color:var(--on-accent)"],[style*="color: var(--on-accent)"]){color:var(--bg)!important}
  /* the tempo coach card is a dark card in light mode; in dark mode it becomes a tinted surface card */
  body[data-mode=dark] .coach.t{background:linear-gradient(135deg,color-mix(in srgb,var(--accent-2) 28%,var(--surface)),var(--surface));color:var(--ink-2)}
  body[data-mode=dark] .coach.t b{color:var(--ink)}body[data-mode=dark] .coach.t .ci{background:var(--fill)}
  body[data-mode=dark] .coach.t .tempo span{background:var(--fill);color:var(--ink-2)}
  /* buttons without a colour of their own used the browser default (black) */
  :where(#app,#sheet) button:where(:not([class]),[class="rw-hit"]){color:var(--ink)}
  body[data-mode=dark] .chip{color:var(--ink)}
  body[data-mode=dark] :is([style*="background:var(--accent-2)"],[style*="background: var(--accent-2)"]):is([style*="color:var(--on-accent)"],[style*="color: var(--on-accent)"]){color:var(--bg)!important}
  .pg-est{background:transparent}
  /* long uppercase muscle names in the 2-column rank cards (320 px + large text) */
  .mr-card small{hyphens:auto;overflow-wrap:anywhere}
  .rw-hit{position:relative}
  .rw-hit::after{content:'';position:absolute;top:calc(var(--hy,0px) * -1);bottom:calc(var(--hy,0px) * -1);left:calc(var(--hx,0px) * -1);right:calc(var(--hx,0px) * -1)}
  </style>`);

  // Small controls: grow the hit area with ::after (skipped when the element already uses ::after or is inline text).
  const TAP = 'button,[onclick],a[href],select,summary,[role=button],[role=switch],label[for]';
  function grow(root) {
    const els = (root || document).querySelectorAll(TAP);
    for (const e of els) {
      const r = e.getBoundingClientRect(); if (!r.width || !r.height) continue;
      if (e.classList.contains('rw-hit') && e.dataset.hitW === Math.round(r.width) + 'x' + Math.round(r.height)) continue;
      if (r.width >= 44 && r.height >= 44) { if (e.classList.contains('rw-hit')) e.classList.remove('rw-hit'); continue; }
      const cs = getComputedStyle(e);
      if (/^(INPUT|SELECT|TEXTAREA)$/.test(e.tagName)) continue;
      // inline links inside a sentence stay as they are; a standalone inline control ("See all", "Change") becomes a box
      if (cs.display === 'inline') { const pt = (e.parentElement?.innerText || '').trim().length, me = (e.innerText || '').trim().length; if (pt > me + 8) continue; e.classList.add('rw-inl'); }
      if (!e.classList.contains('rw-hit') && getComputedStyle(e, '::after').content !== 'none') continue;
      if (cs.position !== 'static' && cs.position !== 'relative' && !e.classList.contains('rw-hit')) continue;
      e.classList.add('rw-hit'); e.dataset.hitW = Math.round(r.width) + 'x' + Math.round(r.height);
      const hx = Math.max(0, Math.ceil((46 - r.width) / 2)) + 'px', hy = Math.max(0, Math.ceil((46 - r.height) / 2)) + 'px';
      if (e.style.getPropertyValue('--hx') !== hx) e.style.setProperty('--hx', hx);
      if (e.style.getPropertyValue('--hy') !== hy) e.style.setProperty('--hy', hy);
    }
  }
  window.rwGrowTaps = grow;
  let queued = false;
  const run = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; try { grow(); } catch (e) { console.warn('polish', e); } }); };
  new MutationObserver(run).observe(document.body, { childList: true, subtree: true });
  // font-size / layout changes made through inline styles (e.g. larger text) — re-measure; grow() only writes when a value changes
  new MutationObserver(ms => { if (ms.some(m => m.target.dataset?.pf !== undefined || m.attributeName === 'style' && !m.target.classList?.contains('rw-hit'))) run(); }).observe(document.body, { attributes: true, attributeFilter: ['style'], subtree: true });
  addEventListener('resize', run);
  run();
})();
