// RepWise Progress screen (redesign): hero → weight chart → body composition → goals → measurements.
// Neutral UI; accent only on the hero progress fill. Explanations live in info sheets.
(function () {
  document.head.insertAdjacentHTML('beforeend', `<style>
  .pg-hero{margin-top:var(--s2)}
  .pg-line{display:flex;justify-content:space-between;align-items:baseline;padding:14px 0;border-bottom:1px solid var(--line);font-size:var(--fs-body)}
  .pg-line>span:first-child{font-weight:600}.pg-line .v{font-variant-numeric:tabular-nums;font-weight:600}
  .pg-line small{color:var(--ink-2);font-size:var(--fs-label);font-weight:500}
  .pg-est{margin-left:6px;font-size:var(--fs-caption);font-weight:600;color:var(--ink-2);border:1px solid var(--line);border-radius:var(--r-pill);padding:1px 7px;cursor:pointer}
  .pg-link{background:none;border:none;padding:10px 0;color:var(--ink);font-weight:600;font-size:var(--fs-label);cursor:pointer;text-decoration:underline;text-underline-offset:3px}
  .pg-empty{display:flex;justify-content:space-between;align-items:center;min-height:48px;color:var(--ink-2);font-size:var(--fs-label);border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
  .pg-empty button{background:none;border:none;font-weight:700;color:var(--ink);font-size:var(--fs-label);padding:8px 0;cursor:pointer}
  .pg-i{background:none;border:1px solid var(--line);border-radius:50%;width:22px;height:22px;font-size:12px;font-weight:700;color:var(--ink-2);cursor:pointer;margin-left:6px;line-height:1}
  .pg-hdr{display:flex;align-items:center;justify-content:space-between;font-size:17px;font-weight:700;margin:var(--s4) 0 var(--s1)}
  .pg-card{background:var(--surface);border-radius:16px;padding:4px var(--s2) 12px;box-shadow:0 1px 2px #15151f0d,0 6px 20px #15151f0a}
  .pg-card .pg-line:last-of-type{border-bottom:none}
  .pg-card .pg-empty{border:none;flex-direction:column;justify-content:center;gap:var(--s1);padding:var(--s2) 0 var(--s1);text-align:center}
  .pg-card .pg-empty button{background:var(--ink);color:#fff;border-radius:var(--r-pill);padding:9px 20px}
  .pg-heroc{margin-top:var(--s2);border-radius:20px;padding:20px;color:#fff;background:radial-gradient(120% 100% at 100% 0%,#5b1218 0%,#15151f 62%);box-shadow:0 12px 30px #15151f40}
  .pg-hl{font-size:13px;font-weight:600;color:#ffffffa8}
  .pg-hn{display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-top:4px}.pg-hn .num{font-size:52px;font-weight:800;letter-spacing:-.03em;line-height:1}.pg-hn small{font-size:20px;color:#ffffffa8;font-weight:600}
  .pg-trend{margin-left:auto;align-self:center;font-size:13px;font-weight:700;padding:5px 10px;border-radius:var(--r-pill);background:#ffffff1f;white-space:nowrap}
  .pg-trend.ok{background:#16a34a40;color:#86efac}.pg-trend.bad{background:#e3262f40;color:#fca5a5}
  .pg-hg{margin-top:10px;font-size:14px;color:#ffffffc0}.pg-hg .pg-link{color:#fff}
  .pg-hbar{height:10px;border-radius:5px;background:#ffffff1f;margin-top:16px;overflow:hidden}.pg-hbar i{display:block;height:100%;border-radius:5px;background:linear-gradient(90deg,#e3262f,#ff6b6b)}
  .pg-hscale{display:flex;justify-content:space-between;font-size:12px;color:#ffffff99;margin-top:6px;font-variant-numeric:tabular-nums}
  .pg-hstats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:16px;padding-top:14px;border-top:1px solid #ffffff1a}
  .pg-hstats b{display:block;font-size:16px;font-weight:800;font-variant-numeric:tabular-nums}.pg-hstats small{font-size:11px;color:#ffffff99}
  .pg-tiles{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:12px 0 4px}
  .pg-tiles>div{background:var(--fill);border-radius:12px;padding:12px}
  .pg-tiles small{display:block;font-size:12px;color:var(--ink-2);font-weight:600;margin-bottom:2px}.pg-tiles b{font-size:22px;font-weight:800;font-variant-numeric:tabular-nums}
  .pg-chip{display:inline-block;margin-left:6px;font-size:11px;font-weight:700;padding:2px 8px;border-radius:var(--r-pill);background:var(--surface);color:var(--ink-2);vertical-align:middle}
  .pg-chip.ok{background:#dcfce7;color:#15803d}.pg-chip.warn{background:#fef3c7;color:#b45309}.pg-chip.bad{background:#fee2e2;color:#b91c1c}
  .pg-cbar{display:flex;height:12px;border-radius:6px;overflow:hidden;margin-top:14px;gap:2px}.pg-cbar .lean{background:var(--ink)}.pg-cbar .fat{background:#f59e0b}
  .pg-clegend{display:flex;justify-content:space-between;font-size:13px;margin-top:8px;color:var(--ink-2)}.pg-clegend i{display:inline-block;width:8px;height:8px;border-radius:2px;margin-right:6px}
  .pg-gbar{height:6px;border-radius:3px;background:var(--fill);margin:-4px 0 12px;overflow:hidden}.pg-gbar i{display:block;height:100%;border-radius:3px;background:var(--ok)}
  .pg-legend{display:flex;gap:14px;align-items:center;font-size:12px;color:var(--ink-2)}.pg-legend i{display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--ink-3);margin-right:5px;vertical-align:1px}.pg-legend i.ln{width:14px;height:3px;border-radius:2px;background:var(--accent)}
  </style>`);
  let range = 'month';
  const D = 864e5, fmtD = (d, y) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', ...(y ? { year: 'numeric' } : {}) });
  const mean = a => a.reduce((s, v) => s + v, 0) / a.length;
  function avgAt(ts) { const w = S.weights.filter(x => x[0] <= ts && x[0] > ts - 7 * D).map(x => x[1]); return w.length ? mean(w) : null; }
  function current() { const a = avgAt(Date.now()); return a ?? S.weights.at(-1)?.[1] ?? S.profile.weight; }

  function hero() {
    const g = S.goals?.weight, cur = current(), prev = avgAt(Date.now() - 7 * D), eta = goalETA().find(x => x.k === 'weight');
    const n7 = S.weights.filter(x => x[0] > Date.now() - 7 * D).length;
    let line = 'No weight goal yet', bar = '';
    if (g && !g.done) {
      const left = Math.abs(cur - g.target), pct = Math.max(0, Math.min(100, (g.start - cur) / ((g.start - g.target) || 1) * 100)), moved = cur - g.start;
      line = `Goal ${g.target} kg`;
      bar = `<div class="pg-hbar"><i style="width:${pct}%"></i></div><div class="pg-hscale"><span>${g.start} kg</span><span>${Math.round(pct)}% there</span><span>${g.target} kg</span></div>
        <div class="pg-hstats"><div><b>${moved > 0 ? '+' : moved < 0 ? '−' : ''}${Math.abs(moved).toFixed(1)} kg</b><small>since start</small></div><div><b>${left.toFixed(1)} kg</b><small>to go</small></div><div><b>${eta?.date ? eta.date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : '—'}</b><small>est. finish</small></div></div>`;
    } else if (g?.done) line = `Goal ${g.target} kg reached`;
    const trend = prev != null && n7 ? cur - prev : null, good = trend == null || !trend || !g || g.done ? null : (trend < 0) === !!g.down;
    return `<div class="pg-heroc"><div class="pg-hl">${n7 >= 2 ? '7-day average' : 'Current weight'}</div>
      <div class="pg-hn"><span class="num">${cur.toFixed(1)}</span><small>kg</small>${trend != null ? `<span class="pg-trend ${good === true ? 'ok' : good === false ? 'bad' : ''}">${trend > 0 ? '▲' : trend < 0 ? '▼' : '•'} ${Math.abs(trend).toFixed(1)} kg this week</span>` : ''}</div>
      <div class="pg-hg">${line}${!g || g.done ? ` · <button class="pg-link" style="padding:0" onclick="goalSheet('weight')">Set goal</button>` : ''}</div>
      ${bar}</div>`;
  }

  function weightChart() {
    const span = { week: 7, month: 30, year: 365, all: 1e5 }[range], from = Date.now() - span * D;
    const pts = S.weights.filter(x => x[0] >= from);
    const seg = `<div class="seg" style="margin-top:var(--s1)">${[['week', 'Week'], ['month', 'Month'], ['year', 'Year'], ['all', 'All']].map(([k, l]) => `<button class="${range === k ? 'on' : ''}" onclick="pgRange('${k}')">${l}</button>`).join('')}</div>`;
    if (S.weights.length < 3) return `<div class="pg-hdr">Weight</div><div class="pg-empty"><span>Log your weight for 3 days to see your trend</span><button onclick="weighIn()">Log weight</button></div>`;
    if (pts.length < 2) return `<div class="pg-hdr">Weight</div>${seg}<div class="pg-empty"><span>Not enough weigh-ins in this range</span><button onclick="pgRange('all')">Show all</button></div>`;
    const W = 340, H = 150, pad = 6, L = 34, B = 20, g0 = S.goals?.weight && !S.goals.weight.done ? S.goals.weight.target : null;
    const t0 = pts[0][0], t1 = Math.max(pts.at(-1)[0], t0 + D), pv = pts.map(p => p[1]), spanV = Math.max(...pv) - Math.min(...pv), near = g0 != null && Math.min(...pv.map(v => Math.abs(v - g0))) <= Math.max(2, spanV * 1.5), g = near ? g0 : null, vals = [...pv, ...(g ? [g] : [])];
    const lo = Math.floor(Math.min(...vals) - 0.5), hi = Math.ceil(Math.max(...vals) + 0.5), X = t => L + (t - t0) / (t1 - t0) * (W - L - pad * 2), Y = v => pad + (hi - v) / (hi - lo) * (H - B - pad);
    const avg = pts.map(p => [p[0], avgAt(p[0])]).filter(p => p[1] != null);
    const path = avg.map((p, i) => `${i ? 'L' : 'M'}${X(p[0]).toFixed(1)},${Y(p[1]).toFixed(1)}`).join(' ');
    const dots = pts.map(p => `<circle cx="${X(p[0]).toFixed(1)}" cy="${Y(p[1]).toFixed(1)}" r="2.4" fill="var(--ink-3)" opacity=".7"/>`).join('');
    const goal = g ? `<line x1="${L}" x2="${W - pad}" y1="${Y(g)}" y2="${Y(g)}" stroke="var(--ok)" stroke-dasharray="5 4" stroke-width="1.5"/><text x="${W - pad}" y="${Y(g) - 5}" text-anchor="end" font-size="10" font-weight="700" fill="var(--ok)">Goal ${g}</text>` : '';
    const grid = [hi, (hi + lo) / 2, lo].map(v => `<line x1="${L}" x2="${W - pad}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line)"/><text x="${L - 6}" y="${Y(v) + 3}" text-anchor="end" font-size="10" fill="var(--ink-3)">${+v.toFixed(1)}</text>`).join('');
    const la = avg.at(-1), area = avg.length > 1 ? `<path d="${path} L${X(la[0]).toFixed(1)},${H - B} L${X(avg[0][0]).toFixed(1)},${H - B}Z" fill="url(#pgGrad)"/>` : '';
    const lastDot = la ? `<circle cx="${X(la[0])}" cy="${Y(la[1])}" r="5" fill="var(--accent)" stroke="var(--surface)" stroke-width="2.5"/><text x="${X(la[0]) - 8}" y="${Y(la[1]) - 10}" text-anchor="end" font-size="11" font-weight="800" fill="var(--ink)">${la[1].toFixed(1)}</text>` : '';
    const ch = pts.at(-1)[1] - pts[0][1], far = g0 != null && !near ? `<div class="t-caption" style="text-align:right">Goal ${g0} kg is ${Math.abs(pts.at(-1)[1] - g0).toFixed(1)} kg ${g0 < pts.at(-1)[1] ? 'below' : 'above'} this range</div>` : '';
    return `<div class="pg-hdr">Weight</div>${seg}
      <svg viewBox="0 0 ${W} ${H}" style="width:100%;margin-top:var(--s1);overflow:visible"><defs><linearGradient id="pgGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--accent)" stop-opacity=".22"/><stop offset="1" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs>${grid}${area}${goal}${dots}<path d="${path}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>${lastDot}
      <text x="${L}" y="${H - 4}" font-size="10" fill="var(--ink-3)">${fmtD(new Date(t0))}</text><text x="${W - pad}" y="${H - 4}" text-anchor="end" font-size="10" fill="var(--ink-3)">${fmtD(new Date(t1))}</text></svg>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px"><span class="pg-legend"><span><i></i>Weigh-ins</span><span><i class="ln"></i>7-day avg</span></span><b class="num" style="font-size:14px;color:${g0 == null || !ch ? 'var(--ink)' : (ch < 0) === (g0 < pts[0][1]) ? 'var(--ok)' : 'var(--accent)'}">${ch > 0 ? '+' : ch < 0 ? '−' : ''}${Math.abs(ch).toFixed(1)} kg</b></div>${far}`;
  }

  function composition() {
    const p = S.profile, b = bodyFat(), lean = p.weight * (1 - b.bf / 100), est = !(p.waist && p.neck && (p.sex === 'm' || p.hip));
    const bl = S.bfLog || [];
    let chart = '';
    if (bl.length >= 3) {
      const W = 340, H = 48, v = bl.slice(-30), lo = Math.min(...v.map(x => x[1])) - .2, hi = Math.max(...v.map(x => x[1])) + .2, t0 = v[0][0], t1 = Math.max(v.at(-1)[0], t0 + D);
      const X = t => 4 + (t - t0) / (t1 - t0) * (W - 8), Y = y => 4 + (hi - y) / (hi - lo) * (H - 8);
      const dv = v.at(-1)[1] - v[0][1];chart = `<div class="t-label" style="display:flex;justify-content:space-between;margin-top:var(--s3)"><span>Body fat trend</span><span class="muted num">${dv > 0 ? '+' : dv < 0 ? '−' : ''}${Math.abs(dv).toFixed(1)}% since ${fmtD(new Date(v[0][0]))}</span></div><svg viewBox="0 0 ${W} ${H}" style="width:100%;margin-top:var(--s1)"><path d="${v.map((x, i) => `${i ? 'L' : 'M'}${X(x[0]).toFixed(1)},${Y(x[1]).toFixed(1)}`).join(' ')}" fill="none" stroke="var(--ink)" stroke-width="2"/></svg>`;
    }
    return `<div class="pg-hdr">Body composition</div>
      <div class="pg-cbar"><i class="lean" style="width:${100 - b.bf}%"></i><i class="fat" style="width:${b.bf}%"></i></div>
      <div class="pg-clegend num"><span><i style="background:var(--ink)"></i>Lean ${lean.toFixed(1)} kg</span><span><i style="background:#f59e0b"></i>Fat ${(p.weight - lean).toFixed(1)} kg</span></div>
      <div class="pg-tiles"><div><small>Body fat</small><b>${b.bf.toFixed(1)}%</b>${est ? `<button class="pg-est" onclick="pgInfo('bf')">est.</button>` : ''}</div>
      <div><small>BMI</small><b>${b.bmi.toFixed(1)}</b>${(([l, c]) => `<span class="pg-chip ${c}">${l}</span>`)(b.bmi < 18.5 ? ['underweight', 'warn'] : b.bmi < 25 ? ['healthy', 'ok'] : b.bmi < 30 ? ['overweight', 'warn'] : ['obese', 'bad'])}</div></div>
      ${est ? `<button class="pg-link" onclick="measSheet()">Add waist & neck for a better estimate</button>` : ''}${chart}`;
  }

  function goals() {
    const e = goalETA(), G = S.goals || {}, gpct = x => { const st = G[x.k]?.start, c = x.k === 'weight' ? current() : +x.cur; return st == null || st === x.target ? 0 : Math.max(0, Math.min(100, (st - c) / (st - x.target) * 100)); };
    const rows = e.map(x => `<div class="pg-line"><span>${x.k === 'weight' ? 'Weight' : 'Body fat'} <small>${x.k === 'weight' ? current().toFixed(1) : x.cur} → ${x.target}${x.unit === '%' ? '%' : ' kg'}</small></span><span class="v" style="font-weight:500;text-align:right">${x.date ? `${fmtD(x.date, true)} <small>· ~${x.wk} wk</small>` : `<small>${x.why}</small>`}</span></div><div class="pg-gbar"><i style="width:${gpct(x)}%"></i></div>`).join('');
    const unset = Object.keys(GOALDEF).filter(k => !G[k] || G[k].done).map(k => `<div class="pg-line" style="cursor:pointer" onclick="goalSheet('${k}')"><span>${G[k]?.done ? `${k === 'weight' ? 'Weight' : 'Body fat'} goal reached` : `Set a ${k === 'weight' ? 'weight' : 'body fat'} goal`}</span><span class="v">+</span></div>`).join('');
    if (!rows && !unset) return '';
    return `<div class="pg-hdr"><span>Goals</span><button class="pg-i" aria-label="About estimates" onclick="pgInfo('eta')">i</button></div>${rows}${unset}
      ${rows ? '<div class="t-caption" style="margin-top:6px">Estimate based on your plan.</div>' : ''}`;
  }

  function measurements() {
    const L = S.measLog || [];
    if (!L.length) return `<div class="pg-hdr">Measurements</div><div class="pg-empty"><span>No measurements yet</span><button onclick="measSheet()">Add</button></div>`;
    const first = L[0], last = L.at(-1), row = (l, i) => last[i] ? `<div class="pg-line"><span>${l}</span><span class="v">${last[i]} cm${L.length > 1 && first[i] ? ` <small>${last[i] - first[i] > 0 ? '+' : last[i] - first[i] < 0 ? '−' : ''}${Math.abs(last[i] - first[i]).toFixed(1)}</small>` : ''}</span></div>` : '';
    return `<div class="pg-hdr"><span>Measurements</span><button class="pg-link" style="text-decoration:none" onclick="measSheet()">Add</button></div>
      ${row('Waist', 1)}${row('Neck', 2)}${row('Hips', 3)}<div class="t-caption" style="margin-top:6px">Latest ${fmtD(new Date(last[0]))}${L.length > 1 ? ` · change since ${fmtD(new Date(first[0]))}` : ''}</div>`;
  }

  window.pgRange = k => { range = k; render(); };
  // Each section (header + its rows) becomes one card; done on the DOM so sections added by other layers are included.
  function cardify() { if (tab !== 'body' || stack.length) return; document.querySelectorAll('#app .pg-hdr').forEach(h => { if (h.nextElementSibling?.classList.contains('pg-card')) return; const c = document.createElement('div'); c.className = 'pg-card'; let n = h.nextElementSibling;
    while (n && !n.classList.contains('pg-hdr') && !n.style.height) { const nx = n.nextElementSibling; c.appendChild(n); n = nx; } if (c.children.length) h.after(c); }); }
  const _rd = render; render = function (...a) { const x = _rd.apply(this, a); try { cardify(); } catch (e) { console.error(e); } return x; };
  window.pgInfo = k => {
    if (k === 'bf') return openSheet(`<h3 class="t-title">How body fat is estimated</h3>
      <p class="t-body" style="margin:var(--s2) 0">Without tape measurements, body fat is estimated from your BMI, age, sex and the build you picked. It's accurate to about ±5%, it only changes when your weight changes, and it can't tell fat from muscle — so lifters often read too high.</p>
      <p class="t-body">Add your <b>waist</b> (at the navel) and <b>neck</b> (below the Adam's apple)${S.profile.sex === 'f' ? ' and <b>hips</b>' : ''} and RepWise switches to the US Navy tape method (±3%), which tracks fat loss even when the scale doesn't move.</p>
      <p class="t-caption" style="margin-top:var(--s2)">Deurenberg et al., 1991, Br J Nutr (BMI method); Hodgdon & Beckett, 1984, Naval Health Research Center (tape method)</p>
      <button class="btn" style="margin-top:var(--s3)" onclick="closeSheet();measSheet()">Add measurements</button>`);
    openSheet(`<h3 class="t-title">About these estimates</h3>
      <p class="t-body" style="margin:var(--s2) 0">Dates assume you eat your calorie target (${targets().kcal} kcal) every day. Each week your maintenance is recalculated from your new weight, so progress slows as you get lighter. 1 kg of fat ≈ 7,700 kcal. Body fat dates assume you keep your muscle by lifting and eating enough protein.</p>
      <p class="t-body">Water, glycogen, hormones and real intake can shift the date by a few weeks either way. Your 7-day average weight is the honest trend.</p>
      <p class="t-caption" style="margin-top:var(--s2)">Hall et al., 2011, Lancet</p>`);
  };

  V.body = () => `<div class="top"><h1>Progress</h1>${S.weights.length >= 3 ? `<button class="pg-link" style="text-decoration:none;font-size:var(--fs-body)" onclick="weighIn()">Log weight</button>` : ''}</div>
    ${hero()}${weightChart()}${composition()}${goals()}${measurements()}<div style="height:var(--s4)"></div>`;
})();
