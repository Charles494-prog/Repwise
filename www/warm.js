// RepWise "warm" layer (loaded last): overall rank (XP from every muscle + meals + streaks), rank screen,
// rank-up moment, +XP toast, workout summary, English/Taglish coach voice, friendlier copy and empty
// states, calmer plan-generation screen, softer feel. Never resets XP: existing totals carry over.
(function () {
  // ================= LANGUAGE =================
  const lang = () => (OB.active && OB.d.lang) || S.profile?.lang || 'en';
  const T = window.T = (en, tl) => (lang() === 'tl' && tl != null ? tl : en);
  window.setLang = l => { if (S.profile) S.profile.lang = l; save(); render(); };
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fmt = n => Math.round(n).toLocaleString('en-US');

  // ================= STYLE =================
  document.head.insertAdjacentHTML('beforeend', `<style>
  :root{--r-card:16px}
  .row{padding:16px}.plist .li{padding:16px 0}
  .anim-fade{animation:fade .2s ease}.anim-push{animation:push .22s cubic-bezier(.2,.8,.2,1)}.anim-pop{animation:popback .22s cubic-bezier(.2,.8,.2,1)}.anim-up{animation:up .25s cubic-bezier(.2,.8,.2,1)}
  .w-greet{padding-top:18px;margin-bottom:-14px;color:var(--ink-2);font-size:var(--fs-label);font-weight:600}
  .rk-line{display:flex;align-items:center;gap:10px;width:100%;background:none;border:none;padding:2px 0 8px;font:inherit;color:var(--ink);cursor:pointer;text-align:left}
  .rk-line .rk-t{flex:1;font-size:var(--fs-label);color:var(--ink-2)}.rk-line .rk-t b{color:var(--ink);font-weight:700}
  .rk-line .chev{font-size:18px}
  .bar.thin{height:3px;margin-bottom:var(--s2)}
  .rk-hero{text-align:center;padding:var(--s2) 0 var(--s1)}
  .rk-hero .rk-name{font-size:30px;font-weight:800;letter-spacing:-.02em;margin-top:var(--s1)}
  .rk-lad{display:flex;align-items:center;gap:var(--s2);padding:12px 0;border-bottom:1px solid var(--line)}
  .rk-lad.lock{opacity:.4}.rk-lad b{font-weight:600}.rk-lad small{margin-left:auto;color:var(--ink-2);font-size:var(--fs-caption)}
  .rk-lad.cur b{font-weight:800}
  .rk-pill{display:flex;align-items:center;gap:6px;margin-top:4px;font-size:var(--fs-label);font-weight:600;color:var(--ink-2)}
  #xpt{position:fixed;left:50%;bottom:calc(88px + env(safe-area-inset-bottom));transform:translate(-50%,12px);background:var(--ink);color:var(--on-accent);border-radius:var(--r-pill);padding:9px 16px;font-size:var(--fs-label);font-weight:700;opacity:0;pointer-events:none;transition:opacity .2s,transform .2s;z-index:45;white-space:nowrap}
  body.full #xpt{bottom:calc(24px + env(safe-area-inset-bottom))}
  #xpt.show{opacity:1;transform:translate(-50%,0)}
  .w-over{position:fixed;inset:0;z-index:60;background:var(--bg);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:var(--s4);animation:wfade .25s ease}
  .w-over .w-badge{animation:wpop .5s cubic-bezier(.2,1.4,.4,1) both;position:relative}
  .w-over .w-badge::after{content:"";position:absolute;inset:-14px;border-radius:50%;border:2px solid var(--line);animation:wring 1.2s ease-out .2s both}
  .w-over .btn{max-width:320px;margin-top:var(--s4)}
  @keyframes wfade{from{opacity:0}to{opacity:1}}
  @keyframes wpop{from{opacity:0;transform:scale(.7)}to{opacity:1;transform:none}}
  @keyframes wring{from{opacity:1;transform:scale(.8)}to{opacity:0;transform:scale(1.25)}}
  .setrow.pr-hit{animation:prhit .7s ease}
  @keyframes prhit{0%{background:transparent}25%{background:var(--accent-soft);transform:scale(1.02)}100%{background:transparent;transform:none}}
  .w-empty{display:flex;flex-direction:column;align-items:center;text-align:center;gap:10px;padding:var(--s3) var(--s2);color:var(--ink-2);font-size:var(--fs-label);line-height:1.4;white-space:normal}
  .w-empty svg{width:56px;height:56px;stroke:var(--ink-3);fill:none;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round}
  .sm-hero{text-align:center;padding:var(--s5) 0 var(--s2)}
  .sm-hero h1{font-size:28px;font-weight:800;letter-spacing:-.02em}
  .sm-hero p{color:var(--ink-2);margin-top:var(--s1);font-size:var(--fs-body)}
  .sm-stats{display:grid;grid-template-columns:1fr 1fr;gap:var(--s3) var(--s2);margin:var(--s3) 0;text-align:center}
  .sm-stats b{display:block;font-size:26px;font-weight:800;font-variant-numeric:tabular-nums}.sm-stats small{color:var(--ink-2);font-size:var(--fs-caption);font-weight:600}
  .sm-pr{color:var(--accent);font-size:var(--fs-caption);font-weight:800;margin-left:6px}
  .w-load{justify-content:center;align-items:center;text-align:center;padding:var(--s4) var(--s2)}
  .w-steps{display:flex;flex-direction:column;gap:10px;align-items:flex-start;margin:0 auto;width:max-content;max-width:100%;text-align:left;font-size:var(--fs-label)}
  .w-st{display:flex;align-items:center;gap:8px;color:var(--ink-3);transition:color .2s}
  .w-st i{width:16px;height:16px;display:inline-grid;place-items:center;font-style:normal}
  .w-st.done{color:var(--ink)}.w-st.cur{color:var(--ink-2)}
  .w-st.done i::before{content:"";width:10px;height:6px;border-left:2px solid var(--ink);border-bottom:2px solid var(--ink);transform:rotate(-45deg) translate(1px,-1px)}
  .w-st.cur i::before{content:"";width:5px;height:5px;border-radius:50%;background:var(--ink-3)}
  .w-line{height:2px;background:var(--fill);border-radius:1px;overflow:hidden;width:180px;margin:0 auto var(--s4)}
  .w-line>i{display:block;height:100%;background:var(--accent);width:0;transition:width .6s ease}
  .w-tip{margin-top:var(--s5);max-width:320px}
  .w-tip p{font-size:var(--fs-title);font-weight:700;line-height:1.35;letter-spacing:-.01em;transition:opacity .3s}
  @media (prefers-reduced-motion: reduce){*,*::before,*::after{animation:none!important;transition:none!important}}
  </style>`);

  // ================= RANK BADGES (SVG) =================
  // Shield outline in the rank colour, soft tint inside, 1–3 pips for the division; Master+ get a star.
  window.rankBadge = function (i, size = 24) {
    const t = Math.floor(i / 3), c = RANKS[t][1], pips = i % 3 + 1, sw = size < 30 ? 2.2 : 1.6;
    const px = pips === 1 ? [20] : pips === 2 ? [16, 24] : [13, 20, 27];
    return `<svg width="${size}" height="${size}" viewBox="0 0 40 40" aria-hidden="true" style="flex:none;display:block"><path d="M20 3 34 8v11c0 9-6 15-14 18C12 34 6 28 6 19V8z" fill="${c}" fill-opacity=".16" stroke="${c}" stroke-width="${sw}" stroke-linejoin="round"/>${t >= 6 ? `<path d="M20 10l1.8 3.6 4 .6-2.9 2.8.7 4L20 19.1 16.4 21l.7-4-2.9-2.8 4-.6z" fill="${c}"/>` : `<path d="M14 15l6-3 6 3" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`}${px.map(x => `<circle cx="${x}" cy="27" r="2" fill="${c}"/>`).join('')}</svg>`;
  };

  // ================= OVERALL RANK =================
  S.xpB ??= 0; S.xpLog ??= []; S.xpMeal ??= {}; S.firsts ??= {};
  const xpTotal = window.xpTotal = () => MUSCLES.reduce((s, m) => s + (+S.xp[m] || 0), 0) + (+S.xpB || 0);
  const otier = i => rankStep(1000, i); // overall adds up 10 muscles, so ×10 keeps it in step with the average muscle rank
  const rname = i => RANKS[Math.floor(i / 3)][0] + ' ' + DIVS[i % 3];
  const MAXI = RANKS.length * 3 - 1;
  const orank = window.orank = (x = xpTotal()) => { let i = 0; while (x >= otier(i) && i < MAXI) { x -= otier(i); i++; }
    return { i, name: rname(i), cur: x, need: otier(i), next: i < MAXI ? rname(i + 1) : null }; };
  const startOf = i => { let s = 0; for (let k = 0; k < i; k++) s += otier(k); return s; };
  // Existing accounts: everything earned so far counts, nothing is re-celebrated.
  function initXP() { if (S.xpLast != null) return; S.xpLast = xpTotal(); S.rankSeen = orank().i;
    if (Object.values(S.food).some(d => d.length)) S.firsts.meal = 1;
    if (S.startDate && (Date.now() - new Date(S.startDate + 'T12:00')) / 864e5 >= 7) S.firsts.week = 1; }
  if (S.profile) initXP();

  function logXP(x, k, l) { const e = S.xpLog.slice(0, 20).find(e => e.k === k);
    if (e) { e.x += x; e.t = Date.now(); e.l = l; } else S.xpLog.unshift({ t: Date.now(), x, k, l }); S.xpLog.length = Math.min(S.xpLog.length, 40); }
  let runN = S.runs.length, rankTimer = null;
  // Runs inside save() (via checkGoals): awards meal/streak XP, logs every XP change, detects rank-ups.
  function tick() {
    if (!S.profile) return; initXP(); const d = today();
    const n = Math.min(3, (S.food[d] || []).length), got = S.xpMeal[d] || 0;
    if (n > got) { const v = 10 * (n - got); S.xpB += v; S.xpLast += v; S.xpMeal[d] = n; logXP(v, 'm:' + d, T('Logged meals', 'Nag-log ng meals')); }
    for (const k of Object.keys(S.xpMeal)) if (k < iso(Date.now() - 14 * 864e5)) delete S.xpMeal[k];
    const st = streak(), active = S.workouts.some(w => iso(w.ts) === d) || (S.food[d] || []).length;
    if (st >= 2 && active && S.xpStreak !== d) { S.xpStreak = d; const v = 10 * Math.min(st, 7); S.xpB += v; S.xpLast += v; logXP(v, 's:' + d, T(`${st} days in a row`, `${st} araw nang tuloy-tuloy`)); }
    const tot = xpTotal(), delta = tot - S.xpLast;
    if (delta > 0) {
      if (S.active) logXP(delta, 'w:' + S.active.ts, (PROGS[S.active.prog] || PROGS.free).name);
      else if (S.runs.length > runN) logXP(delta, 'r:' + (S.runs.at(-1)?.ts || d), T('Finished a run or walk', 'Tapos ang run o walk'));
      else logXP(delta, 'o:' + d, T('Training', 'Training'));
    }
    runN = S.runs.length; S.xpLast = tot;
    if (!S.firsts.meal && Object.values(S.food).some(x => x.length)) { S.firsts.meal = 1; setTimeout(() => toast(T('First meal logged. That’s how it starts.', 'Unang meal, naka-log na. Ganyan nagsisimula.')), 700); }
    if (window.rankQueueUpdate) window.rankQueueUpdate(); else if (orank().i > (S.rankSeen ?? 0) && !S.active && !rankTimer) rankTimer = setTimeout(showRankUp, 450);
  }
  const _cg = checkGoals; checkGoals = function () { try { _cg(); } catch (e) {} try { tick(); } catch (e) { console.error(e); } };

  // ---------- rank-up moment (once per new division, dismissible) ----------
  const COACH_UP = [['Every rep got you here. Keep stacking them.', 'Lahat ng reps mo, nagbunga. Tuloy lang.'], ['Consistency looks good on you.', 'Bagay sa’yo ang consistency.'], ['Quiet work, real results.', 'Tahimik na trabaho, totoong resulta.']];
  function showRankUp() {
    rankTimer = null; if (S.active || document.querySelector('.w-over')) return; const r = orank(); if (r.i <= (S.rankSeen ?? 0)) return;
    const line = COACH_UP[r.i % COACH_UP.length], el = document.createElement('div'); el.className = 'w-over'; el.setAttribute('role', 'dialog');
    el.innerHTML = `<div class="w-badge">${rankBadge(r.i, 112)}</div><div class="t-caption" style="margin-top:var(--s3);text-transform:uppercase;letter-spacing:.08em;font-weight:700">${T('New rank', 'Bagong rank')}</div><div class="t-display" style="font-size:36px;margin-top:6px">${r.name}</div><p class="muted" style="margin-top:var(--s1);max-width:280px">${T(...line)}</p><button class="btn">${T('Nice', 'Sige!')}</button>`;
    el.querySelector('.btn').onclick = () => { S.rankSeen = r.i; save(); el.remove(); };
    document.body.appendChild(el); vib([20, 40, 60]); window.__rankUpShown = (window.__rankUpShown || 0) + 1;
  }
  window.showRankUp = showRankUp;

  // ---------- +XP toast (bottom, brief) ----------
  window.xpToast = function (t) { let e = $('#xpt'); if (!e) { e = document.createElement('div'); e.id = 'xpt'; document.body.appendChild(e); }
    e.textContent = t; e.classList.add('show'); clearTimeout(e._t); e._t = setTimeout(() => e.classList.remove('show'), 1800); vib(15); };

  // ================= CELEBRATIONS: one per action =================
  confetti = function () {};
  const _as = addSet; addSet = function () { const a = S.active, n = a?.sets.length; _as();
    if (!a || a.sets.length === n) return; const s = a.sets.at(-1);
    if (s.pr) { const rows = document.querySelectorAll('.setrow'); rows[rows.length - 1]?.classList.add('pr-hit'); vib([15, 40, 25]);
      setTimeout(() => toast(T(`New PR · ${s.w ? s.w + ' kg × ' : ''}${s.r}`, `Bagong PR · ${s.w ? s.w + ' kg × ' : ''}${s.r}`)), 220); } };
  const _fw = finishW; finishW = function () { const a = S.active; _fw(); $('#toast')?.classList.remove('show'); if (!a || S.active || !S.workouts.length || S.workouts.at(-1).ts !== a.ts) return;
    const e = S.xpLog.find(e => e.k === 'w:' + a.ts), nm = (PROGS[a.prog] || PROGS.free).name;
    if (e) { e.l = T(`Finished ${nm}`, `Tapos ang ${nm}`); save(); }
    if (orank().i <= (S.rankSeen ?? 0)) setTimeout(() => xpToast(`+${fmt(e ? e.x : a.xp)} XP · ${T('Workout done', 'Tapos ang workout')}`), 500); };
  const _cq = checkQuests; checkQuests = function (...args) { const m = _cq(...args);
    if (m.length && !S.active) { const x = m.reduce((s, t) => s + (+(/\+(\d+) XP/.exec(t) || [])[1] || 0), 0); if (x) setTimeout(() => xpToast(`+${x} XP · ${T('Quest checkpoint', 'Quest checkpoint')}`), 600); }
    return m; };

  // ================= WORKOUT SUMMARY =================
  V.summary = a => {
    const mins = Math.max(1, Math.round((Date.now() - a.ts) / 6e4)), vol = a.sets.reduce((s, x) => s + x.w * x.r, 0), reps = a.sets.reduce((s, x) => s + x.r, 0);
    const e = S.xpLog.find(e => e.k === 'w:' + a.ts), xp = e ? e.x : a.xp, prs = a.sets.filter(s => s.pr);
    const line = prs.length ? T(`${prs.length > 1 ? prs.length + ' new PRs' : 'A new PR'} today. That’s real progress.`, `${prs.length > 1 ? prs.length + ' bagong PR' : 'May bagong PR'} ka today. Totoong progress ’yan.`)
      : vol > 0 ? T(`Solid session. You lifted ${fmt(vol)} kg total.`, `Solid na session. ${fmt(vol)} kg total ang nabuhat mo.`)
      : T(`Solid session. ${reps} reps done.`, `Solid na session. ${reps} reps, tapos.`);
    return `<div class="sm-hero"><h1>${T('Workout done', 'Tapos ang workout')}</h1><p>${line}</p></div>
    <div class="sm-stats"><div><b>${vol ? fmt(vol) : reps}</b><small>${vol ? T('kg lifted', 'kg nabuhat') : 'reps'}</small></div><div><b>+${fmt(xp)}</b><small>XP</small></div><div><b>${a.sets.length}</b><small>sets</small></div><div><b>${mins}</b><small>min</small></div></div>
    ${prs.length ? `<div class="sec">${T('Personal records', 'Personal records')}</div><div class="plist">${prs.map(s => `<div class="li"><div style="flex:1"><b>${escT(s.ex)}</b><small>${s.w ? s.w + ' kg × ' : ''}${s.r}</small></div><span class="sm-pr">PR</span></div>`).join('')}</div>` : ''}
    ${a.ups.length ? `<div class="sec">${T('Muscle ranks up', 'Umakyat ang muscle ranks')}</div><div class="plist">${a.ups.map(u => `<div class="li"><span>${esc(u)}</span></div>`).join('')}</div>` : ''}
    ${a.qs.length ? `<div class="sec">Quests</div><div class="plist">${a.qs.map(u => `<div class="li"><span>${u}</span></div>`).join('')}</div>` : ''}
    <div class="sticky" style="bottom:16px"><button class="btn" onclick="stack=[];go('plan')">${T('Done', 'Sige')}</button></div>`;
  };

  // ================= RANK SCREEN =================
  const ago = t => { const m = Math.round((Date.now() - t) / 6e4); return m < 60 ? T(`${Math.max(1, m)} min ago`, `${Math.max(1, m)} min ago`) : m < 1440 ? T(`${Math.round(m / 60)} h ago`, `${Math.round(m / 60)} oras na`) : new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); };
  V.rank = () => {
    const r = orank(), L = level(), qs = questList().filter(q => q.i < q.steps.length), tot = xpTotal();
    return `<div class="top">${backBtn()}<span></span><span></span></div>
    <div class="rk-hero"><div style="display:inline-block">${rankBadge(r.i, 96)}</div><div class="rk-name">${r.name}</div><p class="muted">${T('Level', 'Level')} ${L.lvl} · ${fmt(tot)} XP</p></div>
    ${r.next ? `<div class="bar" style="margin-top:var(--s2)"><i style="width:${r.cur / r.need * 100}%"></i></div><p class="t-caption" style="margin-top:6px;text-align:center">${T(`${fmt(r.need - r.cur)} XP to ${r.next}`, `${fmt(r.need - r.cur)} XP pa bago ${r.next}`)}</p>` : `<p class="muted" style="text-align:center">${T('Top of the ladder. Legend.', 'Pinakamataas na. Legend ka na.')}</p>`}
    <div class="sec">${T('Recent XP', 'Recent XP')}</div>${S.xpLog.length ? `<div class="plist">${S.xpLog.slice(0, 8).map(e => `<div class="li"><div style="flex:1"><b>+${fmt(e.x)} XP · ${esc(e.l)}</b></div><small>${ago(e.t)}</small></div>`).join('')}</div>` : `<div class="w-empty">${ART.bolt}<span>${T('Your XP shows up here. Log a meal or a set to start.', 'Dito lalabas ang XP mo. Mag-log ng meal o set para magsimula.')}</span></div>`}
    <div class="sec">${T('Active quests', 'Active quests')}<small onclick="stack=[];trainSub='challenges';go('train')" style="cursor:pointer">${T('All', 'Lahat')} ›</small></div>${qs.length ? `<div class="plist">${qs.map(q => `<div class="li" onclick="push('quest','${q.id}')" style="cursor:pointer"><div style="flex:1"><b>${escT(q.name)}</b><small>${T('Next', 'Next')}: ${stepLbl(q.steps[q.i])}</small><div class="bar" style="margin-top:6px"><i style="width:${q.i / q.steps.length * 100}%"></i></div></div></div>`).join('')}</div>` : `<div class="w-empty">${ART.flag}<span>${T('No quests yet. Pick one and earn bonus XP.', 'Wala pang quest. Pumili ka para may bonus XP.')}</span></div>`}
    <div class="sec">${T('Rank ladder', 'Rank ladder')}</div><div class="plist">${RANKS.map(([n], t) => { const i0 = t * 3, cur = Math.floor(r.i / 3) === t; return `<div class="rk-lad ${cur ? 'cur' : ''} ${t > Math.floor(r.i / 3) ? 'lock' : ''}">${rankBadge(cur ? r.i : i0 + 2 <= r.i ? i0 + 2 : i0, 28)}<b>${n}</b><small>${t ? fmt(startOf(i0)) + ' XP' : T('Start', 'Simula')}</small></div>`; }).join('')}</div>
    <p class="t-caption" style="margin:var(--s2) 0 var(--s4)">${T('XP comes from sets (PRs and beating last session earn more), quests, runs, logging meals and keeping a streak. Each muscle also has its own rank under Train → Quests.', 'May XP sa bawat set (mas malaki kapag PR o tinalo mo ang last session), quests, runs, pag-log ng meals at streak. May sariling rank din bawat muscle sa Train → Quests.')}</p>`;
  };
  const rankLine = () => { const r = orank(); return `<button class="rk-line" onclick="push('rank')" aria-label="${T('Your rank', 'Rank mo')}">${rankBadge(r.i, 22)}<span class="rk-t"><b>${r.name}</b>${r.next ? ` · ${T(`${fmt(r.need - r.cur)} XP to ${r.next}`, `${fmt(r.need - r.cur)} XP pa bago ${r.next}`)}` : ''}</span><span class="chev">›</span></button><div class="bar thin"><i style="width:${r.next ? r.cur / r.need * 100 : 100}%"></i></div>`; };

  // ================= TODAY: greeting, streak, rank line =================
  const greet = () => { const h = new Date().getHours(), n = esc(S.profile.name || 'champ');
    return h < 5 ? T(`Up late, ${n}`, `Puyat ah, ${n}`) : h < 12 ? T(`Morning, ${n}`, `Magandang umaga, ${n}`) : h < 18 ? T(`Afternoon, ${n}`, `Magandang hapon, ${n}`) : T(`Evening, ${n}`, `Magandang gabi, ${n}`); };
  const _plan = V.plan; V.plan = () => {
    let h = _plan(); const st = streak();
    h = h.replace(/<p class="muted" style="padding-top:18px;margin-bottom:-14px">Hi, [\s\S]*?<\/p>/, `<p class="w-greet">${greet()}${st >= 2 ? ` · ${T(`${st} days in a row`, `${st} araw nang tuloy-tuloy`)}` : ''}</p>`)
      .replace(/<div class="flex" style="flex:none"><span class="chip">⚡[\s\S]*?Lv \d+<\/span><\/div>/, '')
      .replace('<div class="top"><h1>Today</h1></div>', `<div class="top"><h1>${T('Today', 'Ngayon')}</h1></div>${rankLine()}`);
    if (!S.firsts.week && S.startDate && (Date.now() - new Date(S.startDate + 'T12:00')) / 864e5 >= 7) { S.firsts.week = 1; save(); setTimeout(() => toast(T('One week in. That’s the hardest one, done.', 'Isang linggo na! Pinakamahirap ’yon, tapos na.')), 600); }
    return h;
  };

  // ================= PROFILE: badge + level next to the name =================
  const _more = V.more; V.more = () => { const r = orank(), L = level();
    return _more().replace('<h1>More</h1>', `<h1>${T('Profile', 'Profile')}</h1>`)
      .replace(/<div class="card flex"><div class="tile" style="background:var(--accent-soft);flex:none">[^<]*<\/div><div><b style="font-size:18px">Level \d+ athlete<\/b>/,
        `<div class="card flex" onclick="push('rank')" style="cursor:pointer"><div class="tile" style="background:var(--fill);flex:none">${rankBadge(r.i, 40)}</div><div><b style="font-size:18px">${escT(S.profile.name || 'You')}</b><span class="rk-pill">${r.name} · Level ${L.lvl}</span>`); };

  // ================= TRAIN → QUESTS: entry to the rank screen =================
  const _ch = V.challenges; V.challenges = () => { const r = orank();
    const row = `<div class="list" style="margin-bottom:var(--s2)"><div class="row" onclick="push('rank')">${rankBadge(r.i, 36)}<div class="rbody"><b>${r.name}</b><small>${r.next ? T(`${fmt(r.need - r.cur)} XP to ${r.next}`, `${fmt(r.need - r.cur)} XP pa bago ${r.next}`) : 'Legend'}</small><div class="bar thin" style="margin:8px 0 0"><i style="width:${r.cur / r.need * 100}%"></i></div></div><span class="chev">›</span></div></div>`;
    const h = _ch(); return /^\s*<div class="top">[\s\S]*?<\/div>/.test(h) ? h.replace(/^(\s*<div class="top">[\s\S]*?<\/div>)/, '$1' + row) : row + h; };

  // ================= SETTINGS: language =================
  const _set = V.settings; V.settings = () => { const l = lang(), h = _set(), i = h.indexOf('<div class="sec"');
    const blk = `<div class="sec">${T('Coach language', 'Wika ng coach')}</div><div class="seg"><button class="${l === 'en' ? 'on' : ''}" onclick="setLang('en')">English</button><button class="${l === 'tl' ? 'on' : ''}" onclick="setLang('tl')">Taglish</button></div>`;
    return i < 0 ? h + blk : h.slice(0, i) + blk + h.slice(i); };

  // ================= EMPTY-STATE ART + FRIENDLIER COPY =================
  const svg = d => `<svg viewBox="0 0 64 64" aria-hidden="true">${d}</svg>`;
  const ART = {
    plate: svg('<circle cx="32" cy="34" r="18"/><circle cx="32" cy="34" r="11"/><path d="M8 14v12a4 4 0 0 0 4 4v20M12 14v10M16 14v12a4 4 0 0 1-4 4M54 14c-4 2-5 8-5 14h5v22"/>'),
    tape: svg('<path d="M10 24h44v16H10z"/><path d="M18 24v6M26 24v8M34 24v6M42 24v8M50 24v6"/><path d="M14 46c6 6 30 6 36 0"/>'),
    dumbbell: svg('<path d="M14 22v20M50 22v20M8 27v10M56 27v10M14 32h36M8 27h6M8 37h6M50 27h6M50 37h6"/><path d="M22 50h20" opacity=".5"/>'),
    shoe: svg('<path d="M10 40c0-8 4-18 10-18 3 0 4 4 8 5l12 4c8 2 14 5 14 11v4H10z"/><path d="M10 44h44M24 30l3 4M30 32l3 4"/>'),
    bolt: svg('<path d="M35 8 16 36h14l-3 20 21-30H34z"/>'),
    flag: svg('<path d="M18 56V10M18 12h26l-6 9 6 9H18"/>'),
  };
  const E = (art, en, tl) => () => `<div class="w-empty">${ART[art]}<span>${T(en, tl)}</span></div>`;
  const NOTHING = E('plate', 'Nothing logged yet. What did you have?', 'Wala pang naka-log. Ano kinain mo?');
  const MEAS = E('tape', 'Want a better body fat estimate? Add your waist and neck.', 'Gusto mo ng mas tamang body fat estimate? I-add ang waist at neck mo.');
  const COPY = [
    ['No meals logged yet.', NOTHING], ['No meals logged yet', NOTHING], ['Nothing logged yet 🍽️', NOTHING],
    ['No measurements yet — tap 📏 above', MEAS], ['<span>No measurements yet</span>', () => `<span>${MEAS()}</span>`],
    ['No workouts yet — start one above!', E('dumbbell', 'No workouts yet. Your first one is right above.', 'Wala pang workout. Nasa taas lang ang una mo.')],
    ['No runs or walks yet. Tap Run or Walk to track one with GPS 📡', E('shoe', 'No runs or walks yet. Tap Run or Walk when you head out.', 'Wala pang run o walk. I-tap ang Run o Walk pag lalabas ka na.')],
    ['No meals yet. Build one from Add food → Create meal, or save a plate after logging it.', E('plate', 'No saved meals yet. Log a plate once, then save it here for one-tap logging.', 'Wala pang saved meal. Mag-log ng plate, tapos i-save para isang tap na lang next time.')],
    ['No sets yet. 3–4 sets is the sweet spot.', () => T('No sets yet. 3–4 sets is the sweet spot.', 'Wala pang set. 3–4 sets ang sweet spot.')],
    ['No weight goal yet', () => T('No weight goal yet. Want to set one?', 'Wala pang weight goal. Set natin?')],
    ['No backups yet — the first one is made today.', () => T('No backups yet. The first one happens today.', 'Wala pang backup. Mamaya ang una.')],
  ];
  const RX = [
    [/(\d+) kcal over target\. A 30–45 min walk burns ~150–250 kcal 👟/, (_, n) => T(`You’re ${n} kcal over today. Tomorrow’s a new day. A 30–45 min walk helps if you feel like it.`, `${n} kcal over ka today. Bukas, panibagong araw. Pwede ring mag-walk ng 30–45 min kung gusto mo.`)],
  ];
  const TOASTS = {
    "🤔 Couldn't recognize that — enter it manually": () => T('Couldn’t read that one. Mind typing it in?', 'Hindi ko nabasa. Pwede i-type mo na lang?'),
    '⚠️ Storage is full — export a backup in Settings': () => T('That didn’t save — storage is full. Export a backup in Settings?', 'Hindi na-save, puno na ang storage. Mag-export ng backup sa Settings?'),
    'Enter a name': () => T('Type your name first', 'I-type muna pangalan mo'), 'Enter reps': () => T('How many reps?', 'Ilang reps?'),
    'Invalid code': () => T('That code didn’t work. Check it and try again?', 'Hindi gumana ’yung code. Check mo ulit?'),
    'Couldn’t read that backup': () => T('That backup didn’t open. Try another one?', 'Hindi nabuksan ’yung backup. Subukan ang iba?'),
    'Plan updated ✅': () => T('Plan updated. Nice.', 'Updated na ang plan mo.'),
  };
  const warmCopy = h => { if (typeof h !== 'string') return h; for (const [a, b] of COPY) if (h.includes(a)) h = h.split(a).join(b()); for (const [r, f] of RX) h = h.replace(r, f); return h; };
  for (const k of Object.keys(V)) { const f = V[k]; V[k] = (...a) => warmCopy(f(...a)); }
  const _os = openSheet; openSheet = h => _os(warmCopy(h));
  const _toast = toast; toast = t => _toast(TOASTS[t] ? TOASTS[t]() : /Something went wrong/i.test(t) ? T('That didn’t save. Try again?', 'Hindi na-save. Ulitin natin?') : t);

  // ================= ONBOARDING: language first, Taglish voice =================
  OBSTEPS.unshift({ k: 'lang', q: 'Hi! Which language feels right?', s: 'You can change this later in Settings.', o: [['en', 'EN', 'English', 'Clear and simple'], ['tl', 'TL', 'Taglish', 'Kwentuhan lang, parang text']] });
  const TL = {
    name: ['Ano’ng itatawag namin sa’yo?', 'Pangalan at workout data lang ang naka-save, dito lang sa phone mo.'],
    goal: ['Ano’ng main goal mo ngayon?', 'Dito natin ibabase ang plan mo.'],
    sex: ['Male or female?', 'Para makuha natin ang metabolism mo.'],
    age: ['Ilang taon ka na?', ''], height: ['Gaano ka katangkad?', ''], weight: ['Ilang kilo ka ngayon?', ''],
    build: ['Alin ang pinakamalapit sa’yo?', 'Para ma-estimate natin ang body fat mo.'],
    dreamWeight: ['Next weight checkpoint mo', 'Realistic at malapit lang, mga 8–12 weeks. Pag naabot mo, set ulit tayo ng bago.'],
    dreamBF: ['Next body fat checkpoint mo', 'Realistic ang ~1–3% kada 8–12 weeks. Abutin, tapos set ulit.'],
    activity: ['Gaano ka ka-active?', ''],
    days: ['Ilang araw kada linggo ka pwedeng mag-train?', 'Be honest lang. Mas mahalaga ang consistency kaysa perfect na plan.'],
    startDay: ['Kailan mo gustong magsimula?', 'Walang “missed” bago ang start date mo.'],
    deficit: ['Gaano mo gustong i-push?', 'Daily calorie deficit (o surplus) mo. Pwede mo palitan sa Progress → Plan.'],
    fastProto: ['Intermittent fasting?', 'Optional. Ire-remind ka namin pag bukas at sarado na ang eating window mo.'],
    focus: ['Pili ka ng quests', 'Kahit ilan. Pwede mo dagdagan o palitan anytime.'],
  };
  const DAYLINE = { 2: 'Sige, 2 days a week. Sulitin natin bawat session.', 3: 'Sige, 3 days a week. Sulitin natin bawat session.', 4: 'Ayos, 4 days.', 5: '5 days? Game.', 6: '6 days, seryoso ka ah.', 7: 'Araw-araw? Bigyan ka namin ng 1 recovery day.' };
  const _onb = V.onboard; V.onboard = () => {
    if (OB.step >= OBSTEPS.length && OB.active) return loadingView();
    let h = _onb(); const s = OBSTEPS[OB.step];
    if (lang() === 'tl' && s && TL[s.k]) { const [q, sub] = TL[s.k]; h = h.replace(`<h2>${s.q}</h2>`, `<h2>${q}</h2>`); if (s.s && sub) h = h.replace(`<p class="muted">${s.s}</p>`, `<p class="muted">${sub}</p>`); }
    if (lang() === 'tl') { h = h.split('>Continue<').join('>Tuloy<').replace('placeholder="Your name"', 'placeholder="Pangalan mo"').replace('>Skip for now<', '>Skip muna<');
      const prev = OBSTEPS[OB.step - 1]; if (prev?.k === 'days' && OB.d.days && DAYLINE[OB.d.days]) h = h.replace('<div style="margin-top:26px">', `<p class="muted" style="margin-top:18px">${DAYLINE[OB.d.days]}</p><div style="margin-top:14px">`); }
    return h;
  };

  // ================= PLAN GENERATION: calm, short, real steps =================
  const TIPS = {
    cut: [['Protein keeps you full longer. Aim for some at every meal.', 'Busog ka nang matagal sa protein. Lagyan mo bawat meal.'], ['Lose fat slowly and you keep the muscle.', 'Dahan-dahan lang ang fat loss para hindi mawala ang muscle.'], ['Veggies first fills you up for very few calories.', 'Unahin ang gulay. Nakakabusog, konti lang ang calories.']],
    bulk: [['Eat a little more than you burn, then lift heavy.', 'Kumain nang konti pang higit sa nasusunog mo, tapos buhat nang mabigat.'], ['Add a rep or a little weight each week.', 'Dagdag ng isang rep o konting bigat kada linggo.']],
    maintain: [['Lift, eat enough protein, and the scale can stay put.', 'Buhat, sapat na protein, kahit hindi gumalaw ang timbang.'], ['Sleep is when your muscles actually grow.', 'Habang tulog ka lumalaki ang muscles mo.']],
    home: [['Slow reps make bodyweight moves much harder.', 'Bagalan ang reps, mas mahirap at mas effective ang bodyweight.'], ['A backpack with books is a fine dumbbell.', 'Pwedeng dumbbell ang backpack na may libro.']],
    gym: [['Beat last session by one rep. That’s progress.', 'Talunin ang last session kahit isang rep. Progress na ’yan.']],
    any: [['Consistency beats a perfect plan.', 'Mas mahalaga ang consistency kaysa perfect na plan.'], ['Water first thing in the morning is an easy win.', 'Tubig agad pagkagising. Madaling panalo.']],
  };
  let lt = [];
  function loadingView() {
    const d = OB.d, bmr = 10 * d.weight + 6.25 * d.height - 5 * d.age + (d.sex === 'm' ? 5 : -161), adj = d.deficit != null ? -d.deficit : { cut: -500, slowcut: -250, maintain: 0, bulk: 300 }[d.goal] || 0;
    const kcal = Math.round(bmr * (d.activity || 1.375) + adj), days = d.days ? ({ 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 6 })[d.days] : (S.trainDays?.[S.split] || 3), eq = ((typeof EQUIPS !== 'undefined' && EQUIPS[S.equip]) || [, 'your setup'])[1].toLowerCase();
    const steps = [[T('Calculating your calories…', 'Kinakalkula ang calories mo…'), T(`Calories: ${fmt(kcal)} a day`, `Calories: ${fmt(kcal)} kada araw`)],
      [T(`Building your ${days}-day split…`, `Binubuo ang ${days}-day split mo…`), T(`${days}-day split ready`, `Ready na ang ${days}-day split`)],
      [T('Picking exercises for your equipment…', 'Pumipili ng exercises para sa equipment mo…'), T(`Exercises for ${eq}`, `Exercises para sa ${eq}`)],
      [T('Done.', 'Tapos na.'), T('Done.', 'Tapos na.')]];
    const pool = [...(TIPS[d.goal === 'slowcut' ? 'cut' : d.goal] || []), ...(S.equip === 'home' ? TIPS.home : TIPS.gym), ...TIPS.any].map(x => T(...x));
    const red = reduced(); window.__loadSteps = steps.map(s => s[0]);
    if (!lt.length) setTimeout(runLoad, 0);
    return `<div class="ob w-load" data-load><div style="flex:1"></div><div class="w-line"><i id="wln"></i></div><div class="w-steps">${steps.map((s, i) => `<div class="w-st ${red ? 'done' : i ? '' : 'cur'}" data-a="${esc(s[0])}" data-b="${esc(s[1])}"><i></i><span>${red ? s[1] : s[0]}</span></div>`).join('')}</div>
    <div class="w-tip"><div class="t-caption" style="text-transform:uppercase;letter-spacing:.08em;font-weight:700">${T('Tip', 'Alam mo ba?')}</div><p id="wtip" style="margin-top:var(--s1)" data-pool="${esc(JSON.stringify(pool))}">${esc(pool[0])}</p></div><div style="flex:1.3"></div></div>`;
  }
  function runLoad() {
    const red = reduced(), at = [650, 1350, 2050, 2600], end = red ? 1600 : 3200; let tipI = 0;
    const set = k => { const els = document.querySelectorAll('.w-st'); els.forEach((e, i) => { e.className = 'w-st ' + (i < k ? 'done' : i === k ? 'cur' : ''); e.querySelector('span').textContent = i < k ? e.dataset.b : e.dataset.a; }); const l = $('#wln'); if (l) l.style.width = (k / els.length * 100) + '%'; };
    if (!red) { lt.push(setTimeout(() => set(0), 30)); at.forEach((t, k) => lt.push(setTimeout(() => set(k + 1), t)));
      lt.push(setTimeout(() => { const p = $('#wtip'); if (!p) return; const pool = JSON.parse(p.dataset.pool); if (pool.length < 2) return; p.style.opacity = 0; setTimeout(() => { tipI = 1; p.textContent = pool[tipI]; p.style.opacity = 1; }, 300); }, 1600)); }
    else { const l = $('#wln'); if (l) l.style.width = '100%'; }
    lt.push(setTimeout(() => { lt.forEach(clearTimeout); lt = []; if (OB.active && OB.step >= OBSTEPS.length) finishOB(); }, end));
  }

  // ================= HAPTICS on main actions =================
  document.addEventListener('click', e => { if (e.target.closest('.btn,nav button,.opt,.rk-line')) vib(8); }, true);

  if (typeof render === 'function') render();
})();
