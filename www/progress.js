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
  .pg-hdr{display:flex;align-items:center;justify-content:space-between;font-size:17px;font-weight:700;margin:var(--s5) 0 var(--s1)}
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
      const left = Math.abs(cur - g.target), pct = Math.max(0, Math.min(100, (g.start - cur) / ((g.start - g.target) || 1) * 100));
      line = `Goal ${g.target} kg · ${left.toFixed(1)} kg to go${eta?.date ? ` · est. ${fmtD(eta.date, true)}` : ''}`;
      bar = `<div class="bar" style="margin-top:var(--s2)"><i style="width:${pct}%"></i></div><div class="t-caption num" style="display:flex;justify-content:space-between;margin-top:6px"><span>${g.start} kg</span><span>${g.target} kg</span></div>`;
    } else if (g?.done) line = `Goal ${g.target} kg reached`;
    const trend = prev != null && n7 ? cur - prev : null;
    return `<div class="pg-hero"><div class="t-label muted">${n7 >= 2 ? '7-day average' : 'Current weight'}</div>
      <div class="t-display num" style="font-size:52px">${cur.toFixed(1)}<span class="t-title muted" style="font-weight:600"> kg</span></div>
      <div class="t-label muted" style="margin-top:4px">${line}${!g || g.done ? ` · <button class="pg-link" style="padding:0" onclick="goalSheet('weight')">Set goal</button>` : ''}</div>
      ${trend != null ? `<div class="t-label num" style="margin-top:6px">${trend > 0 ? '+' : trend < 0 ? '−' : ''}${Math.abs(trend).toFixed(1)} kg this week</div>` : ''}
      ${bar}</div>`;
  }

  function weightChart() {
    const span = { week: 7, month: 30, year: 365, all: 1e5 }[range], from = Date.now() - span * D;
    const pts = S.weights.filter(x => x[0] >= from);
    const seg = `<div class="seg" style="margin-top:var(--s1)">${[['week', 'Week'], ['month', 'Month'], ['year', 'Year'], ['all', 'All']].map(([k, l]) => `<button class="${range === k ? 'on' : ''}" onclick="pgRange('${k}')">${l}</button>`).join('')}</div>`;
    if (S.weights.length < 3) return `<div class="pg-hdr">Weight</div><div class="pg-empty"><span>Log your weight for 3 days to see your trend</span><button onclick="weighIn()">Log weight</button></div>`;
    if (pts.length < 2) return `<div class="pg-hdr">Weight</div>${seg}<div class="pg-empty"><span>Not enough weigh-ins in this range</span><button onclick="pgRange('all')">Show all</button></div>`;
    const W = 340, H = 130, pad = 6, g0 = S.goals?.weight && !S.goals.weight.done ? S.goals.weight.target : null;
    const t0 = pts[0][0], t1 = Math.max(pts.at(-1)[0], t0 + D), pv = pts.map(p => p[1]), spanV = Math.max(...pv) - Math.min(...pv), near = g0 != null && Math.min(...pv.map(v => Math.abs(v - g0))) <= Math.max(2, spanV * 1.5), g = near ? g0 : null, vals = [...pv, ...(g ? [g] : [])];
    const lo = Math.min(...vals) - 0.5, hi = Math.max(...vals) + 0.5, X = t => pad + (t - t0) / (t1 - t0) * (W - pad * 2), Y = v => pad + (hi - v) / (hi - lo) * (H - pad * 2);
    const avg = pts.map(p => [p[0], avgAt(p[0])]).filter(p => p[1] != null);
    const path = avg.map((p, i) => `${i ? 'L' : 'M'}${X(p[0]).toFixed(1)},${Y(p[1]).toFixed(1)}`).join(' ');
    const dots = pts.map(p => `<circle cx="${X(p[0]).toFixed(1)}" cy="${Y(p[1]).toFixed(1)}" r="2.6" fill="var(--ink-3)"/>`).join('');
    const goal = g ? `<line x1="0" x2="${W}" y1="${Y(g)}" y2="${Y(g)}" stroke="var(--ink-2)" stroke-dasharray="4 4" stroke-width="1"/><text x="${W - 2}" y="${Y(g) - 5}" text-anchor="end" font-size="10" fill="var(--ink-2)">Goal ${g}</text>` : '';
    const ch = pts.at(-1)[1] - pts[0][1], far = g0 != null && !near ? `<div class="t-caption" style="text-align:right">Goal ${g0} kg is ${Math.abs(pts.at(-1)[1] - g0).toFixed(1)} kg ${g0 < pts.at(-1)[1] ? 'below' : 'above'} this range</div>` : '';
    return `<div class="pg-hdr">Weight</div>${seg}
      <svg viewBox="0 0 ${W} ${H + 16}" style="width:100%;margin-top:var(--s1)">${goal}${dots}<path d="${path}" fill="none" stroke="var(--ink)" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>
      <text x="${pad}" y="${H + 14}" font-size="10" fill="var(--ink-3)">${fmtD(new Date(t0))}</text><text x="${W - pad}" y="${H + 14}" text-anchor="end" font-size="10" fill="var(--ink-3)">${fmtD(new Date(t1))}</text></svg>
      <div class="t-caption num" style="display:flex;justify-content:space-between"><span>Dots: daily weigh-ins · line: 7-day average</span><span>${ch > 0 ? '+' : ch < 0 ? '−' : ''}${Math.abs(ch).toFixed(1)} kg</span></div>${far}`;
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
      <div class="pg-line"><span>Body fat</span><span class="v">${b.bf.toFixed(1)}%${est ? `<button class="pg-est" onclick="pgInfo('bf')">est.</button>` : ''}</span></div>
      <div class="pg-line"><span>Lean mass</span><span class="v">${lean.toFixed(1)} kg</span></div>
      <div class="pg-line"><span>Fat mass</span><span class="v">${(p.weight - lean).toFixed(1)} kg</span></div>
      <div class="pg-line"><span>BMI</span><span class="v">${b.bmi.toFixed(1)} <small>${b.bmi < 18.5 ? 'underweight' : b.bmi < 25 ? 'healthy' : b.bmi < 30 ? 'overweight' : 'obese'}</small></span></div>
      ${est ? `<button class="pg-link" onclick="measSheet()">Add waist & neck for a better estimate</button>` : ''}${chart}`;
  }

  function goals() {
    const e = goalETA(), G = S.goals || {}, rows = e.map(x => `<div class="pg-line"><span>${x.k === 'weight' ? 'Weight' : 'Body fat'} <small>${x.k === 'weight' ? current().toFixed(1) : x.cur} → ${x.target}${x.unit === '%' ? '%' : ' kg'}</small></span><span class="v" style="font-weight:500;text-align:right">${x.date ? `${fmtD(x.date, true)} <small>· ~${x.wk} wk</small>` : `<small>${x.why}</small>`}</span></div>`).join('');
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
