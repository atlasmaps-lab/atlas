/* Atlas charts: SVG charts with no libraries. Every function returns an SVG string; charts are interactive once on the page:
 *  - lines and areas: a crosshair follows the pointer and shows the exact year (x) and value (y) of every series
 *  - scatter: the nearest point is picked out with lines to both axes and its exact x and y
 *  - bars, histogram bins, pie slices, heat-map cells, ranked bars: exact values on hover
 * Series: { name, colour, pts: [[x, y], ...] } where x is a year (decimals allowed, e.g. 2020.5 for July).
 * Precise charts: line, area, bars, slope, ranked, pie, band, multiples, dual, spark, histogram, scatter, heat, coef, profile.
 * Story views (experimental): dye, scale, orbits, tree.
 */
(function () {
  "use strict";
  const esc = t => String(t == null ? "" : t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const PALETTE = ["#3b78b5", "#d55e00", "#009e73", "#cc79a7", "#e69f00", "#56b4e9", "#7a5195", "#999933", "#882255", "#44aa99"];
  const colourOf = (s, i) => s.colour || PALETTE[i % PALETTE.length];
  const REG = {}; let seq = 0;
  function nice(lo, hi, n) {
    if (!isFinite(lo) || !isFinite(hi)) return [0, 1, [0, 1]];
    if (lo === hi) { lo -= Math.abs(lo) * 0.1 || 1; hi += Math.abs(hi) * 0.1 || 1; }
    const raw = (hi - lo) / (n || 4), mag = Math.pow(10, Math.floor(Math.log10(raw))), step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= raw);
    const a = Math.floor(lo / step) * step, b = Math.ceil(hi / step) * step, t = [];
    for (let v = a; v <= b + step / 2; v += step) t.push(+v.toFixed(10));
    return [a, b, t];
  }
  const compact = v => { const a = Math.abs(v); return a >= 1e12 ? (v / 1e12).toFixed(1) + "tn" : a >= 1e9 ? (v / 1e9).toFixed(1) + "bn" : a >= 1e6 ? (v / 1e6).toFixed(1) + "m" : a >= 1e4 ? Math.round(v / 1e3) + "k" : a >= 100 ? Math.round(v) : +(+v).toFixed(2); };
  const yearLab = x => { const y = Math.floor(x + 1e-6), m = Math.round((x - y) * 12); return m ? new Date(y, m, 1).toLocaleDateString("en-GB", { month: "short", year: "numeric" }) : String(y); };
  function frame(o, xs, ys) {
    const W = o.w || 640, H = o.h || 320, L = o.left || 58, R = o.right || 18, T = 14, B = o.xtitle ? 40 : 30;
    const [x0, x1] = [Math.min(...xs), Math.max(...xs)];
    let [y0, y1, yt] = nice(Math.min(...ys, o.zero ? 0 : Infinity), Math.max(...ys, o.zero ? 0 : -Infinity), 4);
    const sx = x => L + (x1 > x0 ? (x - x0) / (x1 - x0) : 0.5) * (W - L - R), sy = y => H - B - (y1 > y0 ? (y - y0) / (y1 - y0) : 0.5) * (H - T - B);
    const span = x1 - x0, step = span > 40 ? 10 : span > 16 ? 5 : span > 6 ? 2 : 1;
    let axes = yt.map(t => `<line class="g" x1="${L}" x2="${W - R}" y1="${sy(t)}" y2="${sy(t)}"/><text x="${L - 6}" y="${sy(t) + 3}" text-anchor="end">${esc((o.yfmt || compact)(t))}</text>`).join("");
    if (!o.noX) for (let x = Math.ceil(x0 / step) * step; x <= x1; x += step) axes += `<text x="${sx(x)}" y="${H - B + 16}" text-anchor="middle">${Math.round(x)}</text>`;
    if (o.mid != null && o.mid > y0 && o.mid < y1) axes += `<line class="mid" x1="${L}" x2="${W - R}" y1="${sy(o.mid)}" y2="${sy(o.mid)}"/>`;
    if (o.now != null && o.now >= x0 && o.now <= x1) axes += `<line class="now" x1="${sx(o.now)}" x2="${sx(o.now)}" y1="${T}" y2="${H - B}"/>`;
    if (o.xtitle) axes += `<text x="${(L + W - R) / 2}" y="${H - 4}" text-anchor="middle" class="b">${esc(o.xtitle)}</text>`;
    if (o.ytitle) axes += `<text transform="translate(12 ${(T + H - B) / 2}) rotate(-90)" text-anchor="middle" class="b">${esc(o.ytitle)}</text>`;
    return { W, H, L, R, T, B, sx, sy, axes, x0, x1, y0, y1 };
  }
  function svg(W, H, body, cls, meta) {
    const id = "c" + (++seq); if (meta) REG[id] = meta;
    if (seq % 200 === 0) Object.keys(REG).forEach(k => { if (!document.querySelector(`[data-cid="${k}"]`)) delete REG[k]; });
    return `<svg class="ach ${cls || ""}" viewBox="0 0 ${W} ${H}" role="img" data-cid="${id}">${body}<g class="hov"></g></svg>`;
  }
  const legend = series => series.length > 1 ? `<div class="aleg">${series.map((s, i) => `<span><i style="background:${colourOf(s, i)}"></i>${esc(s.name)}</span>`).join("")}</div>` : "";
  const empty = msg => `<div class="aempty">${esc(msg || "No values to draw for this choice.")}</div>`;
  const allPts = series => series.flatMap(s => s.pts.filter(p => p[1] != null && isFinite(p[1])));
  const tip = t => `data-tip="${esc(t)}"`;

  function line(series, o, filled) {
    o = o || {}; const pts = allPts(series); if (!pts.length) return empty();
    const f = frame(o, pts.map(p => p[0]), pts.map(p => p[1]));
    const paths = series.map((s, i) => {
      const c = colourOf(s, i); let d = "", started = false, area = "";
      s.pts.forEach(p => { if (p[1] == null || !isFinite(p[1])) { started = false; return; } d += (started ? "L" : "M") + f.sx(p[0]).toFixed(1) + " " + f.sy(p[1]).toFixed(1); started = true; });
      if (filled) { const okp = s.pts.filter(p => p[1] != null); if (okp.length) area = `<path d="M${f.sx(okp[0][0])} ${f.sy(Math.max(f.y0, 0))}${okp.map(p => `L${f.sx(p[0]).toFixed(1)} ${f.sy(p[1]).toFixed(1)}`).join("")}L${f.sx(okp[okp.length - 1][0])} ${f.sy(Math.max(f.y0, 0))}Z" fill="${c}" opacity="${series.length > 1 ? .18 : .28}"/>`; }
      const last = s.pts.filter(p => p[1] != null).slice(-1)[0];
      const dots = s.pts.length <= 40 ? s.pts.filter(p => p[1] != null).map(p => `<circle cx="${f.sx(p[0]).toFixed(1)}" cy="${f.sy(p[1]).toFixed(1)}" r="2.2" fill="${c}"/>`).join("") : "";
      return area + `<path d="${d}" fill="none" stroke="${c}" stroke-width="2.2" stroke-linejoin="round"/>` + dots + (last && series.length > 1 && series.length <= 6 ? `<text class="end" x="${Math.min(f.W - 4, f.sx(last[0]) + 4)}" y="${f.sy(last[1]) + 3}" fill="${c}">${esc(String(s.name).slice(0, 14))}</text>` : "");
    }).join("");
    return svg(f.W, f.H, f.axes + `<rect class="hit" x="${f.L}" y="${f.T}" width="${f.W - f.L - f.R}" height="${f.H - f.T - f.B}"/>` + paths, "", { kind: "xy", series: series.map((s, i) => ({ name: s.name, colour: colourOf(s, i), pts: s.pts })), f: { L: f.L, R: f.R, T: f.T, B: f.B, W: f.W, H: f.H, x0: f.x0, x1: f.x1, y0: f.y0, y1: f.y1 }, vfmt: o.vfmt, xlab: o.xlab || yearLab }) + legend(series);
  }
  function bars(series, o) {
    o = o || {}; const pts = allPts(series); if (!pts.length) return empty();
    const xs = [...new Set(pts.map(p => Math.floor(p[0])))].sort((a, b) => a - b).slice(-30);
    const f = frame(Object.assign({ zero: true }, o), [xs[0] - 0.5, xs[xs.length - 1] + 0.5], pts.map(p => p[1]));
    const slot = (f.sx(xs[0] + 1) - f.sx(xs[0])) * 0.8, bw = slot / series.length;
    const body = series.map((s, i) => xs.map(x => { const p = s.pts.filter(q => Math.floor(q[0]) === x && q[1] != null).slice(-1)[0]; if (!p) return ""; const y = f.sy(p[1]), y0 = f.sy(Math.max(0, f.y0)); return `<rect class="bar" ${tip(`${s.name} · ${x}: ${o.vfmt ? o.vfmt(p[1]) : p[1]}`)} x="${(f.sx(x) - slot / 2 + i * bw).toFixed(1)}" y="${Math.min(y, y0).toFixed(1)}" width="${Math.max(1, bw - 1).toFixed(1)}" height="${Math.max(0.5, Math.abs(y0 - y)).toFixed(1)}" fill="${colourOf(s, i)}"/>`; }).join("")).join("");
    return svg(f.W, f.H, f.axes + body) + legend(series);
  }
  function histogram(bins, o) { // bins: [{lo, hi, n}]; marks: [{v, label, colour}]
    o = o || {}; if (!bins.length) return empty();
    const W = o.w || 640, H = o.h || 280, L = 46, R = 14, T = 14, B = 40, lo = bins[0].lo, hi = bins[bins.length - 1].hi, [, y1, yt] = nice(0, Math.max(...bins.map(b => b.n)), 4);
    const sx = v => L + (v - lo) / ((hi - lo) || 1) * (W - L - R), sy = v => H - B - v / (y1 || 1) * (H - T - B), f = o.vfmt || compact;
    let body = yt.map(t => `<line class="g" x1="${L}" x2="${W - R}" y1="${sy(t)}" y2="${sy(t)}"/><text x="${L - 6}" y="${sy(t) + 3}" text-anchor="end">${t}</text>`).join("");
    body += bins.map(b => `<rect class="bar" ${tip(`${f(b.lo)} to ${f(b.hi)}: ${b.n} ${o.unit || "areas"}`)} x="${sx(b.lo) + 0.5}" y="${sy(b.n)}" width="${Math.max(1, sx(b.hi) - sx(b.lo) - 1)}" height="${H - B - sy(b.n)}" fill="${o.colour || "#3b78b5"}" opacity=".8"/>`).join("");
    [0, .25, .5, .75, 1].forEach(t => { const v = lo + (hi - lo) * t; body += `<text x="${sx(v)}" y="${H - B + 14}" text-anchor="middle">${esc(f(v))}</text>`; });
    (o.marks || []).forEach(m => { body += `<line x1="${sx(m.v)}" x2="${sx(m.v)}" y1="${T}" y2="${H - B}" stroke="${m.colour || "#1f2a2e"}" stroke-width="1.6" stroke-dasharray="${m.dash || "4 3"}"/><text x="${sx(m.v) + 3}" y="${T + 9}" class="b" fill="${m.colour || "#1f2a2e"}">${esc(m.label)}</text>`; });
    if (o.xtitle) body += `<text x="${(L + W - R) / 2}" y="${H - 6}" text-anchor="middle" class="b">${esc(o.xtitle)}</text>`;
    return svg(W, H, body);
  }
  function scatter(points, o) { // points: [{x, y, label, colour, hl}]; o.fit: {slope, intercept}; o.logx / o.logy
    o = o || {}; points = points.filter(p => p.x != null && p.y != null && isFinite(p.x) && isFinite(p.y)); if (points.length < 2) return empty("Not enough places have both values.");
    const tx = v => o.logx ? Math.log10(v) : v, ty = v => o.logy ? Math.log10(v) : v;
    const W = o.w || 640, H = o.h || 380, L = 64, R = 16, T = 14, B = 44, xs = points.map(p => tx(p.x)), ys = points.map(p => ty(p.y));
    const [x0, x1, xt] = nice(Math.min(...xs), Math.max(...xs), 5), [y0, y1, yt] = nice(Math.min(...ys), Math.max(...ys), 4);
    const sx = v => L + (tx(v) - x0) / ((x1 - x0) || 1) * (W - L - R), sy = v => H - B - (ty(v) - y0) / ((y1 - y0) || 1) * (H - T - B), fx = o.xfmt || compact, fy = o.yfmt || compact, back = (t, lg) => lg ? Math.pow(10, t) : t;
    let body = yt.map(t => `<line class="g" x1="${L}" x2="${W - R}" y1="${H - B - (t - y0) / ((y1 - y0) || 1) * (H - T - B)}" y2="${H - B - (t - y0) / ((y1 - y0) || 1) * (H - T - B)}"/><text x="${L - 6}" y="${H - B - (t - y0) / ((y1 - y0) || 1) * (H - T - B) + 3}" text-anchor="end">${esc(fy(back(t, o.logy)))}</text>`).join("");
    body += xt.map(t => `<line class="g" y1="${T}" y2="${H - B}" x1="${L + (t - x0) / ((x1 - x0) || 1) * (W - L - R)}" x2="${L + (t - x0) / ((x1 - x0) || 1) * (W - L - R)}"/><text y="${H - B + 15}" x="${L + (t - x0) / ((x1 - x0) || 1) * (W - L - R)}" text-anchor="middle">${esc(fx(back(t, o.logx)))}</text>`).join("");
    if (o.fit) { // a straight line in the data's own units: on log axes it bends, so sample it and keep it inside the plot
      const segs = []; let cur = [];
      for (let i = 0; i <= 80; i++) { const xv = back(x0 + (x1 - x0) * i / 80, o.logx), yv = o.fit.intercept + o.fit.slope * xv, ok = isFinite(yv) && (!o.logy || yv > 0) && ty(yv) >= y0 && ty(yv) <= y1;
        if (ok) cur.push(`${sx(xv).toFixed(1)} ${sy(yv).toFixed(1)}`); else if (cur.length) { segs.push(cur); cur = []; } }
      if (cur.length) segs.push(cur);
      body += segs.filter(sg => sg.length > 1).map(sg => `<path class="fit" fill="none" d="M${sg.join("L")}"/>`).join(""); }
    const mk = points.map(p => ({ x: sx(p.x), y: sy(p.y), p }));
    body += mk.filter(m => !m.p.hl).map(m => `<circle class="pt0" cx="${m.x.toFixed(1)}" cy="${m.y.toFixed(1)}" r="${o.r || 3}" fill="${m.p.colour || "#8a979b"}"/>`).join("");
    body += mk.filter(m => m.p.hl).map(m => `<circle class="pt1" cx="${m.x.toFixed(1)}" cy="${m.y.toFixed(1)}" r="5.5" fill="${m.p.colour || "#3b78b5"}"/><text class="lbl" x="${(m.x + 8).toFixed(1)}" y="${(m.y + 4).toFixed(1)}">${esc(m.p.label)}</text>`).join("");
    body += `<text x="${(L + W - R) / 2}" y="${H - 6}" text-anchor="middle" class="b">${esc(o.xtitle || "")}${o.logx ? " (log scale)" : ""}</text><text transform="translate(14 ${(T + H - B) / 2}) rotate(-90)" text-anchor="middle" class="b">${esc(o.ytitle || "")}${o.logy ? " (log scale)" : ""}</text>`;
    return svg(W, H, body + `<rect class="hit" x="${L}" y="${T}" width="${W - L - R}" height="${H - T - B}"/>`, "", { kind: "scatter", pts: mk.map(m => ({ x: m.x, y: m.y, label: m.p.label, vx: m.p.x, vy: m.p.y })), L, T, B, R, W, H, fx: o.xfmt || compact, fy: o.yfmt || compact, xtitle: o.xtitle, ytitle: o.ytitle, code: points.map(p => p.code) });
  }
  function heat(R, labels, o) { // a matrix of correlations, -1..1; o.rows gives row labels when it isn't square (e.g. PCA loadings)
    o = o || {}; const k = labels.length, rows = o.rows || labels, m = rows.length, sq = !o.rows; if (!k || !m) return empty();
    const cell = Math.max(26, Math.min(70, Math.floor(((o.w || 640) - 170) / k))), L = 170, T = 10, W = L + cell * k + 10, H = T + cell * m + 110;
    const col = r => { if (r == null || !isFinite(r)) return "#eee"; const t = Math.min(1, Math.abs(r)); const a = r > 0 ? [33, 102, 172] : [178, 24, 43]; return `rgb(${Math.round(247 + (a[0] - 247) * t)},${Math.round(247 + (a[1] - 247) * t)},${Math.round(247 + (a[2] - 247) * t)})`; };
    let body = rows.map((l, i) => `<text x="${L - 6}" y="${T + i * cell + cell / 2 + 4}" text-anchor="end">${esc(String(l).slice(0, 26))}</text>`).join("") +
      labels.map((l, j) => `<text transform="translate(${L + j * cell + cell / 2} ${T + m * cell + 8}) rotate(50)">${esc(String(l).slice(0, 22))}</text>`).join("");
    for (let i = 0; i < m; i++) for (let j = 0; j < k; j++) { const r = R[i] ? R[i][j] : null, P = o.p && o.p[i] && o.p[i][j], diag = sq && i === j;
      body += `<rect class="cell" ${tip(diag ? labels[i] : `${rows[i]} × ${labels[j]}: ${r == null ? "—" : (o.label || "r") + " = " + r.toFixed(2)}${o.n ? ` (n = ${o.n[i][j]})` : ""}${P != null ? ` · ${P < 0.001 ? "p < 0.001" : "p = " + P.toFixed(3)}` : ""}`)} x="${L + j * cell}" y="${T + i * cell}" width="${cell - 1}" height="${cell - 1}" fill="${diag ? "var(--chip,#eee)" : col(r)}"/>`;
      if (!diag && r != null && cell >= 30) body += `<text x="${L + j * cell + cell / 2}" y="${T + i * cell + cell / 2 + 4}" text-anchor="middle" style="pointer-events:none" fill="${Math.abs(r) > .55 ? "#fff" : "#1f2a2e"}">${r.toFixed(2)}${P != null && P < 0.05 ? "*" : ""}</text>`; }
    return svg(W, H, body, "heat");
  }
  function coef(items, o) { // items: [{name, v, lo, hi, colour}] horizontal bars with intervals
    o = o || {}; items = items.filter(d => d.v != null && isFinite(d.v)); if (!items.length) return empty();
    const W = o.w || 640, rh = 26, L = 190, R = 70, H = items.length * rh + 30, vs = items.flatMap(d => [d.v, d.lo ?? d.v, d.hi ?? d.v, 0]), lo = Math.min(...vs), hi = Math.max(...vs), sx = v => L + (v - lo) / ((hi - lo) || 1) * (W - L - R), f = o.vfmt || (v => (+v).toFixed(2));
    let body = `<line class="mid" x1="${sx(0)}" x2="${sx(0)}" y1="4" y2="${H - 20}"/>`;
    items.forEach((d, i) => { const y = i * rh + 10; body += `<text x="${L - 8}" y="${y + 12}" text-anchor="end">${esc(String(d.name).slice(0, 30))}</text><rect class="bar" ${tip(`${d.name}: ${f(d.v)}${d.lo != null ? ` (95% range ${f(d.lo)} to ${f(d.hi)})` : ""}${d.note ? " · " + d.note : ""}`)} x="${Math.min(sx(0), sx(d.v))}" y="${y + 2}" width="${Math.max(1, Math.abs(sx(d.v) - sx(0)))}" height="${rh - 10}" rx="3" fill="${d.colour || (d.v >= 0 ? "#3b78b5" : "#c0392b")}" opacity="${d.faint ? .35 : .9}"/>` + (d.lo != null ? `<line x1="${sx(d.lo)}" x2="${sx(d.hi)}" y1="${y + rh / 2 - 2}" y2="${y + rh / 2 - 2}" stroke="var(--ink,#333)" stroke-width="1.4"/>` : "") + `<text x="${Math.max(sx(0), sx(d.v), d.hi != null ? sx(d.hi) : 0) + 6}" y="${y + 12}">${esc(f(d.v))}</text>`; });
    if (o.xtitle) body += `<text x="${(L + W - R) / 2}" y="${H - 4}" text-anchor="middle" class="b">${esc(o.xtitle)}</text>`;
    return svg(W, H, body);
  }
  function profile(groups, labels, o) { // groups: [{name, colour, values (z-scores per label), size}] — parallel lines
    o = o || {}; if (!groups.length) return empty();
    const W = o.w || 640, H = o.h || 300, L = 40, R = 20, T = 14, B = 70, k = labels.length, vs = groups.flatMap(g => g.values), m = Math.max(1.5, ...vs.map(Math.abs));
    const sx = i => L + i / Math.max(1, k - 1) * (W - L - R), sy = v => T + (m - v) / (2 * m) * (H - T - B);
    let body = [-1, 0, 1].map(v => `<line class="${v ? "g" : "mid"}" x1="${L}" x2="${W - R}" y1="${sy(v)}" y2="${sy(v)}"/><text x="${L - 6}" y="${sy(v) + 3}" text-anchor="end">${v > 0 ? "+" : ""}${v}</text>`).join("");
    body += labels.map((l, i) => `<line class="g" x1="${sx(i)}" x2="${sx(i)}" y1="${T}" y2="${H - B}"/><text transform="translate(${sx(i)} ${H - B + 10}) rotate(35)">${esc(String(l).slice(0, 24))}</text>`).join("");
    groups.forEach(g => { body += `<path d="${g.values.map((v, i) => (i ? "L" : "M") + sx(i) + " " + sy(v)).join("")}" fill="none" stroke="${g.colour}" stroke-width="2.6"/>` + g.values.map((v, i) => `<circle class="bar" ${tip(`${g.name}: ${labels[i]} ${v >= 0 ? "+" : ""}${v.toFixed(2)} standard deviations from average`)} cx="${sx(i)}" cy="${sy(v)}" r="4.5" fill="${g.colour}"/>`).join(""); });
    return svg(W, H, body) + `<div class="aleg">${groups.map(g => `<span><i style="background:${g.colour}"></i>${esc(g.name)}${g.size != null ? ` (${g.size})` : ""}</span>`).join("")}</div>`;
  }
  function slope(series, o) {
    o = o || {}; const ends = series.map(s => { const okp = s.pts.filter(p => p[1] != null); return okp.length ? [okp[0], okp[okp.length - 1]] : null; });
    const vals = ends.flatMap(e => e ? [e[0][1], e[1][1]] : []); if (!vals.length) return empty();
    const W = o.w || 640, H = o.h || 320, L = 170, R = 170, T = 24, B = 20; const [y0, y1] = nice(Math.min(...vals), Math.max(...vals), 4);
    const sy = v => H - B - (v - y0) / ((y1 - y0) || 1) * (H - T - B), xa = L, xb = W - R;
    const a = ends.find(Boolean)[0][0], b = ends.find(Boolean)[1][0];
    let body = `<line class="g" x1="${xa}" x2="${xa}" y1="${T}" y2="${H - B}"/><line class="g" x1="${xb}" x2="${xb}" y1="${T}" y2="${H - B}"/><text x="${xa}" y="14" text-anchor="middle">${Math.floor(a)}</text><text x="${xb}" y="14" text-anchor="middle">${Math.floor(b)}</text>`;
    series.forEach((s, i) => { const e = ends[i]; if (!e) return; const c = colourOf(s, i), f = o.vfmt || compact, ch = e[0][1] ? (e[1][1] / e[0][1] - 1) * 100 : null; body += `<line class="bar" ${tip(`${s.name}: ${f(e[0][1])} → ${f(e[1][1])}${ch != null ? ` (${ch > 0 ? "+" : ""}${ch.toFixed(1)}%)` : ""}`)} x1="${xa}" x2="${xb}" y1="${sy(e[0][1])}" y2="${sy(e[1][1])}" stroke="${c}" stroke-width="3"/><circle cx="${xa}" cy="${sy(e[0][1])}" r="4" fill="${c}"/><circle cx="${xb}" cy="${sy(e[1][1])}" r="4" fill="${c}"/><text x="${xa - 8}" y="${sy(e[0][1]) + 4}" text-anchor="end">${esc(String(s.name).slice(0, 16))} ${esc(f(e[0][1]))}</text><text x="${xb + 8}" y="${sy(e[1][1]) + 4}">${esc(f(e[1][1]))} ${esc(String(s.name).slice(0, 16))}</text>`; });
    return svg(W, H, body);
  }
  function ranked(items, o) {
    o = o || {}; items = items.filter(d => d.v != null).sort((a, b) => b.v - a.v); if (!items.length) return empty();
    const W = o.w || 640, rh = 24, L = 170, R = 70, H = items.length * rh + 16, lo = Math.min(0, ...items.map(d => d.v)), hi = Math.max(0, ...items.map(d => d.v));
    const sx = v => L + (v - lo) / ((hi - lo) || 1) * (W - L - R);
    return svg(W, H, items.map((d, i) => `<text x="${L - 8}" y="${i * rh + 20}" text-anchor="end">${esc(String(d.name).slice(0, 24))}</text><rect class="bar" ${tip(`${i + 1}. ${d.name}: ${o.vfmt ? o.vfmt(d.v) : d.v}`)} x="${Math.min(sx(0), sx(d.v))}" y="${i * rh + 8}" width="${Math.max(1, Math.abs(sx(d.v) - sx(0)))}" height="${rh - 8}" rx="3" fill="${d.colour || PALETTE[0]}"/><text x="${Math.max(sx(0), sx(d.v)) + 6}" y="${i * rh + 20}">${esc((o.vfmt || compact)(d.v))}</text>`).join(""));
  }
  function pie(parts, o) {
    o = o || {}; parts = parts.filter(p => p.v > 0); const tot = parts.reduce((a, p) => a + p.v, 0); if (!tot) return empty();
    const W = o.w || 640, H = o.h || 300, cx = Math.min(W / 2 - 110, 160), cy = H / 2, r = Math.min(cy - 16, 120), ri = r * 0.58; let a = -Math.PI / 2;
    const arcs = parts.map((p, i) => { const b = a + p.v / tot * Math.PI * 2, big = b - a > Math.PI ? 1 : 0, c = p.colour || PALETTE[i % 10]; const pt = (ang, rr) => `${(cx + rr * Math.cos(ang)).toFixed(1)} ${(cy + rr * Math.sin(ang)).toFixed(1)}`;
      const d = parts.length === 1 ? `M${pt(-Math.PI / 2, r)}A${r} ${r} 0 1 1 ${pt(-Math.PI / 2 - 0.0001, r)}L${pt(-Math.PI / 2 - 0.0001, ri)}A${ri} ${ri} 0 1 0 ${pt(-Math.PI / 2, ri)}Z` : `M${pt(a, r)}A${r} ${r} 0 ${big} 1 ${pt(b, r)}L${pt(b, ri)}A${ri} ${ri} 0 ${big} 0 ${pt(a, ri)}Z`;
      a = b; return `<path class="bar" ${tip(`${p.name}: ${o.vfmt ? o.vfmt(p.v) : p.v} (${Math.round(p.v / tot * 100)}%)`)} d="${d}" fill="${c}" stroke="var(--solid,#fff)" stroke-width="1.5"/>`; }).join("");
    const lx = cx + r + 30, keys = parts.slice().sort((x, y) => y.v - x.v).slice(0, 10).map((p, i) => `<rect x="${lx}" y="${30 + i * 22}" width="12" height="12" rx="2" fill="${p.colour || PALETTE[parts.indexOf(p) % 10]}"/><text x="${lx + 18}" y="${40 + i * 22}">${esc(String(p.name).slice(0, 26))} · ${Math.round(p.v / tot * 100)}%</text>`).join("");
    return svg(W, H, arcs + `<text x="${cx}" y="${cy + 4}" text-anchor="middle" class="big">${esc(o.centre || "")}</text>` + keys);
  }
  function band(rows, o) {
    o = o || {}; if (!rows.length) return empty();
    const ys = rows.flatMap(r => r.cells.map(c => c[0])), x0 = Math.min(...ys), x1 = Math.max(...ys) + 1, W = o.w || 640, L = 150, R = 14, rh = 26, H = rows.length * rh + 30;
    const sx = x => L + (x - x0) / ((x1 - x0) || 1) * (W - L - R);
    let body = rows.map((r, i) => `<text x="${L - 8}" y="${i * rh + 19}" text-anchor="end">${esc(String(r.name).slice(0, 20))}</text>` + r.cells.map(c => `<rect class="bar" ${tip(`${r.name} · ${c[0]}: ${c[2] || "—"}`)} x="${sx(c[0]).toFixed(1)}" y="${i * rh + 4}" width="${(sx(c[0] + 1) - sx(c[0]) + 0.5).toFixed(1)}" height="${rh - 6}" fill="${c[1] || "var(--chip,#eee)"}"/>`).join("")).join("");
    const step = x1 - x0 > 30 ? 10 : 5; for (let x = Math.ceil(x0 / step) * step; x < x1; x += step) body += `<text x="${sx(x)}" y="${H - 6}" text-anchor="middle">${x}</text>`;
    return svg(W, H, body);
  }
  function multiples(specs) { return `<div class="amult">${specs.map(s => `<figure><figcaption>${esc(s.title)}</figcaption>${s.svg}</figure>`).join("")}</div>`; }
  function dual(a, b, o) {
    o = o || {}; const pa = allPts(a.series), pb = allPts(b.series); if (!pa.length || !pb.length) return empty("Both metrics need values over the same years.");
    const W = o.w || 640, H = o.h || 320, L = 58, R = 58, T = 14, B = 30, xs = pa.concat(pb).map(p => p[0]), x0 = Math.min(...xs), x1 = Math.max(...xs);
    const [a0, a1, at] = nice(Math.min(...pa.map(p => p[1])), Math.max(...pa.map(p => p[1])), 4), [b0, b1, bt] = nice(Math.min(...pb.map(p => p[1])), Math.max(...pb.map(p => p[1])), 4);
    const sx = x => L + (x - x0) / ((x1 - x0) || 1) * (W - L - R), sa = v => H - B - (v - a0) / ((a1 - a0) || 1) * (H - T - B), sb = v => H - B - (v - b0) / ((b1 - b0) || 1) * (H - T - B);
    let body = at.map(t => `<line class="g" x1="${L}" x2="${W - R}" y1="${sa(t)}" y2="${sa(t)}"/><text x="${L - 6}" y="${sa(t) + 3}" text-anchor="end" fill="#3b78b5">${esc((a.fmt || compact)(t))}</text>`).join("") + bt.map(t => `<text x="${W - R + 6}" y="${sb(t) + 3}" fill="#d55e00">${esc((b.fmt || compact)(t))}</text>`).join("");
    const step = x1 - x0 > 30 ? 10 : x1 - x0 > 12 ? 5 : 2; for (let x = Math.ceil(x0 / step) * step; x <= x1; x += step) body += `<text x="${sx(x)}" y="${H - 10}" text-anchor="middle">${Math.round(x)}</text>`;
    const path = (s, sc) => { let d = "", st = false; s.pts.forEach(p => { if (p[1] == null) { st = false; return; } d += (st ? "L" : "M") + sx(p[0]).toFixed(1) + " " + sc(p[1]).toFixed(1); st = true; }); return d; };
    a.series.forEach((s, i) => { body += `<path d="${path(s, sa)}" fill="none" stroke="${s.colour || PALETTE[i]}" stroke-width="2.2"/>`; });
    b.series.forEach((s, i) => { body += `<path d="${path(s, sb)}" fill="none" stroke="${s.colour || PALETTE[i]}" stroke-width="2.2" stroke-dasharray="6 4"/>`; });
    const series = a.series.map(s => ({ name: s.name + " · " + a.label, colour: s.colour, pts: s.pts, fmt: a.fmt })).concat(b.series.map(s => ({ name: s.name + " · " + b.label, colour: s.colour, pts: s.pts, fmt: b.fmt })));
    return svg(W, H, `<rect class="hit" x="${L}" y="${T}" width="${W - L - R}" height="${H - T - B}"/>` + body, "", { kind: "xy", series, dual: true, f: { L, R, T, B, W, H, x0, x1, y0: a0, y1: a1 }, xlab: o.xlab || yearLab }) + `<div class="aleg"><span><i style="background:#3b78b5"></i>${esc(a.label)} (left axis, solid)</span><span><i style="background:#d55e00"></i>${esc(b.label)} (right axis, dashed)</span></div>`;
  }
  function spark(pts, o) {
    o = o || {}; const okp = pts.filter(p => p[1] != null && isFinite(p[1])); if (okp.length < 2) return "";
    const W = o.w || 92, H = o.h || 22, xs = okp.map(p => p[0]), ys = okp.map(p => p[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const sx = x => 1 + (x - x0) / ((x1 - x0) || 1) * (W - 2), sy = y => H - 2 - (y - y0) / ((y1 - y0) || 1) * (H - 4);
    const d = okp.map((p, i) => (i ? "L" : "M") + sx(p[0]).toFixed(1) + " " + sy(p[1]).toFixed(1)).join(""), last = okp[okp.length - 1];
    const now = o.now != null && o.now >= x0 && o.now <= x1 ? `<line x1="${sx(o.now)}" x2="${sx(o.now)}" y1="0" y2="${H}" stroke="currentColor" stroke-opacity=".35" stroke-dasharray="2 2"/>` : "";
    return `<svg class="spark" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true">${now}<path d="${d}" fill="none" stroke="${o.colour || "currentColor"}" stroke-width="1.5"/><circle cx="${sx(last[0])}" cy="${sy(last[1])}" r="1.8" fill="${o.colour || "currentColor"}"/></svg>`;
  }
  function sparkBand(cells, o) {
    if (cells.length < 2) return ""; const W = (o && o.w) || 92, H = 10, x0 = cells[0][0], x1 = cells[cells.length - 1][0] + 1, sx = x => (x - x0) / ((x1 - x0) || 1) * W;
    return `<svg class="spark" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true">${cells.map(c => `<rect x="${sx(c[0]).toFixed(1)}" y="0" width="${(sx(c[0] + 1) - sx(c[0]) + .4).toFixed(1)}" height="${H}" fill="${c[1] || "transparent"}"/>`).join("")}</svg>`;
  }

  // ---------- story views ----------
  function dye(items, o) {
    o = o || {}; items = items.filter(d => d.v != null); if (!items.length) return empty();
    const max = o.max || Math.max(...items.map(d => d.v)), min = Math.min(0, ...items.map(d => d.v)), n = items.length, W = o.w || 640, gw = Math.min(90, (W - 40) / n - 18), H = 260;
    const body = items.map((d, i) => {
      const t = (d.v - min) / ((max - min) || 1), x = 30 + i * ((W - 40) / n), top = 50, bot = 210, lvl = bot - (bot - top - 10) * (0.15 + 0.85 * t), c = d.colour || "#3b78b5", id = "dg" + i + Math.random().toString(36).slice(2, 6);
      return `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c}" stop-opacity="${(0.25 + 0.7 * t).toFixed(2)}"/><stop offset="1" stop-color="${c}" stop-opacity="${(0.45 + 0.55 * t).toFixed(2)}"/></linearGradient></defs>
        <path d="M${x} ${top} L${x + 6} ${bot} Q${x + gw / 2} ${bot + 10} ${x + gw - 6} ${bot} L${x + gw} ${top}" fill="rgba(170,211,223,.18)" stroke="var(--ink-3,#999)" stroke-width="1.5"/>
        <path class="bar" ${tip(`${d.name}: ${o.vfmt ? o.vfmt(d.v) : d.v}`)} d="M${x + 6 * (lvl - top) / (bot - top) + 1} ${lvl} L${x + gw - 6 * (lvl - top) / (bot - top) - 1} ${lvl} L${x + gw - 6} ${bot} Q${x + gw / 2} ${bot + 10} ${x + 6} ${bot} Z" fill="url(#${id})"/>
        <text x="${x + gw / 2}" y="${lvl - 8}" text-anchor="middle" class="b">${esc((o.vfmt || compact)(d.v))}</text><text x="${x + gw / 2}" y="${bot + 30}" text-anchor="middle">${esc(String(d.name).slice(0, 14))}</text>`;
    }).join("");
    return svg(W, H + 10, body, "story") + `<div class="anote">Each glass is a place. The water rises and the dye deepens with the value.</div>`;
  }
  function scale(a, b, o) {
    o = o || {}; if (a.v == null || b.v == null) return empty("Choose exactly two places with values.");
    const W = o.w || 640, H = 280, cx = W / 2, tot = Math.abs(a.v) + Math.abs(b.v) || 1, tilt = Math.max(-22, Math.min(22, (b.v - a.v) / tot * 40)), rad = tilt * Math.PI / 180, arm = Math.min(220, W / 2 - 70);
    const ax = cx - arm * Math.cos(rad), ay = 90 - arm * Math.sin(rad), bx = cx + arm * Math.cos(rad), by = 90 + arm * Math.sin(rad);
    const pan = (x, y, d, c) => `<line x1="${x}" y1="${y}" x2="${x - 40}" y2="${y + 70}" stroke="var(--ink-3,#999)"/><line x1="${x}" y1="${y}" x2="${x + 40}" y2="${y + 70}" stroke="var(--ink-3,#999)"/><path class="bar" ${tip(`${d.name}: ${o.vfmt ? o.vfmt(d.v) : d.v}`)} d="M${x - 48} ${y + 70} Q${x} ${y + 100} ${x + 48} ${y + 70} Z" fill="${c}" opacity=".85"/><text x="${x}" y="${y + 120}" text-anchor="middle" class="b">${esc(d.name)}</text><text x="${x}" y="${y + 136}" text-anchor="middle">${esc((o.vfmt || compact)(d.v))}</text>`;
    return svg(W, H, `<path d="M${cx - 40} 260 L${cx + 40} 260 L${cx} 90 Z" fill="var(--chip,#eee)" stroke="var(--ink-3,#999)"/><line x1="${ax}" y1="${ay}" x2="${bx}" y2="${by}" stroke="var(--ink,#333)" stroke-width="4" stroke-linecap="round"/><circle cx="${cx}" cy="90" r="7" fill="var(--ink,#333)"/>${pan(ax, ay, a, a.colour || "#3b78b5")}${pan(bx, by, b, b.colour || "#d55e00")}`, "story") + `<div class="anote">The heavier side drops: ${esc(a.v >= b.v ? a.name : b.name)} is ${esc(a.v && b.v ? (Math.max(a.v, b.v) / Math.min(a.v, b.v)).toFixed(2) : "—")}× the other.</div>`;
  }
  function orbits(items, o) {
    o = o || {}; items = items.filter(d => d.v != null); if (!items.length) return empty();
    const W = o.w || 640, H = 340, cx = W / 2, cy = H / 2, avg = o.avg != null ? o.avg : items.reduce((a, d) => a + d.v, 0) / items.length;
    const dev = items.map(d => Math.abs(d.v - avg)), md = Math.max(...dev) || 1, rmax = Math.min(cx, cy) - 30, smax = Math.max(...items.map(d => d.size || 1));
    let body = [0.33, 0.66, 1].map(f => `<circle cx="${cx}" cy="${cy}" r="${rmax * f}" fill="none" stroke="var(--rule,#ddd)" stroke-dasharray="3 4"/>`).join("") + `<circle cx="${cx}" cy="${cy}" r="14" fill="#f2c94c"/><text x="${cx}" y="${cy + 30}" text-anchor="middle">${esc(o.centreLabel || "average")} ${esc((o.vfmt || compact)(avg))}</text>`;
    items.forEach((d, i) => { const r = 24 + (rmax - 24) * dev[i] / md, ang = (i / items.length) * Math.PI * 2 - Math.PI / 2 + (d.v < avg ? Math.PI / items.length : 0), x = cx + r * Math.cos(ang), y = cy + r * Math.sin(ang), s = 5 + 12 * Math.sqrt((d.size || 1) / smax);
      body += `<g class="orbit" style="--d:${(3 + (i % 5) * 0.6).toFixed(1)}s"><circle class="bar" ${tip(`${d.name}: ${(o.vfmt || compact)(d.v)} (${d.v >= avg ? "above" : "below"} the centre)`)} cx="${x}" cy="${y}" r="${s}" fill="${d.colour || PALETTE[i % 10]}" stroke="#fff" stroke-width="1.5"/><text x="${x}" y="${y - s - 4}" text-anchor="middle">${esc(String(d.name).slice(0, 14))}</text></g>`; });
    return svg(W, H, body, "story") + `<div class="anote">The sun is the typical (median) value. Planets further out are further from typical (in either direction); bigger planets have more people.</div>`;
  }
  function tree(branches, o) {
    o = o || {}; if (!branches.length) return empty();
    const W = o.w || 640, H = 360, bx = W / 2, by = H - 20, n = branches.length;
    let body = `<path d="M${bx - 10} ${by} Q${bx - 4} ${by - 80} ${bx} ${by - 120} Q${bx + 4} ${by - 80} ${bx + 10} ${by} Z" fill="#7a5c3a"/>`;
    branches.forEach((b, i) => {
      const ang = -Math.PI / 2 + (i - (n - 1) / 2) * (Math.PI * 0.8 / Math.max(1, n - 1)), len = 120 + (i % 2) * 30, ex = bx + len * Math.cos(ang), ey = by - 120 + len * Math.sin(ang);
      body += `<path d="M${bx} ${by - 110} Q${(bx + ex) / 2} ${(by - 120 + ey) / 2 - 20} ${ex} ${ey}" stroke="#7a5c3a" stroke-width="${Math.max(2, 7 - n * 0.3)}" fill="none" stroke-linecap="round"/><text x="${ex}" y="${ey + (ang < -Math.PI / 2 ? -40 : 46)}" text-anchor="middle" class="b">${esc(String(b.name).slice(0, 18))}</text>`;
      const sm = Math.max(1, ...b.leaves.map(l => l.size || 1));
      b.leaves.forEach((l, j) => { const a2 = ang + (j - (b.leaves.length - 1) / 2) * 0.22, rr = 18 + (j % 3) * 10, lx = ex + rr * Math.cos(a2), ly = ey + rr * Math.sin(a2), s = 4 + 7 * Math.sqrt((l.size || 1) / sm);
        body += `<ellipse class="bar" ${tip(`${l.name}: ${l.label || l.v}`)} cx="${lx}" cy="${ly}" rx="${s}" ry="${s * 0.62}" transform="rotate(${(a2 * 180 / Math.PI).toFixed(0)} ${lx} ${ly})" fill="${l.colour || "#5a9a4a"}" stroke="rgba(0,0,0,.15)"/>`; });
    });
    return svg(W, H, body, "story") + `<div class="anote">Branches are areas; each leaf is a smaller area inside it. Leaf colour is the value, leaf size is population.</div>`;
  }

  // ---------- interaction: one tooltip, one handler for every chart on the page ----------
  let tipEl = null, hlEl = null;
  function showTip(html, e) {
    if (!tipEl) { tipEl = document.createElement("div"); tipEl.id = "ach-tip"; document.body.appendChild(tipEl); }
    tipEl.innerHTML = html; tipEl.hidden = false;
    const w = tipEl.offsetWidth, h = tipEl.offsetHeight; let x = e.clientX + 14, y = e.clientY + 14;
    if (x + w > innerWidth - 6) x = e.clientX - w - 14; if (y + h > innerHeight - 6) y = e.clientY - h - 14;
    tipEl.style.left = x + "px"; tipEl.style.top = y + "px";
  }
  function hideTip(svgEl) { if (tipEl) tipEl.hidden = true; if (hlEl) { hlEl.classList.remove("hl"); hlEl = null; } if (svgEl) { const g = svgEl.querySelector(".hov"); if (g) g.innerHTML = ""; } }
  let lastSvg = null;
  document.addEventListener("mousemove", e => {
    const s = e.target.closest && e.target.closest("svg.ach");
    if (lastSvg && lastSvg !== s) hideTip(lastSvg);
    lastSvg = s; if (!s) return;
    const el = e.target.closest("[data-tip]");
    if (hlEl && hlEl !== el) { hlEl.classList.remove("hl"); hlEl = null; }
    if (el) { el.classList.add("hl"); hlEl = el; showTip(esc(el.getAttribute("data-tip")).replace(/ · /g, "<br>"), e); return; }
    const meta = REG[s.dataset.cid], g = s.querySelector(".hov"); if (!meta || !g) { if (tipEl) tipEl.hidden = true; return; }
    const pt = s.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; const loc = pt.matrixTransform(s.getScreenCTM().inverse());
    if (meta.kind === "xy") {
      const f = meta.f, x = f.x0 + (loc.x - f.L) / (f.W - f.L - f.R) * (f.x1 - f.x0);
      let best = null; meta.series.forEach(se => se.pts.forEach(p => { if (p[1] == null) return; const d = Math.abs(p[0] - x); if (!best || d < best.d) best = { d, x: p[0] }; }));
      if (!best || loc.x < f.L - 4 || loc.x > f.W - f.R + 4) { g.innerHTML = ""; if (tipEl) tipEl.hidden = true; return; }
      const sx = v => f.L + (f.x1 > f.x0 ? (v - f.x0) / (f.x1 - f.x0) : .5) * (f.W - f.L - f.R), sy = v => f.H - f.B - (f.y1 > f.y0 ? (v - f.y0) / (f.y1 - f.y0) : .5) * (f.H - f.T - f.B);
      const rows = meta.series.map(se => { const p = se.pts.find(q => Math.abs(q[0] - best.x) < 1e-6); return p && p[1] != null ? { se, v: p[1] } : null; }).filter(Boolean);
      const X = sx(best.x);
      g.innerHTML = `<line class="cross" x1="${X}" x2="${X}" y1="${f.T}" y2="${f.H - f.B}"/>` + (!meta.dual ? rows.map(r => `<circle cx="${X}" cy="${sy(r.v)}" r="4.2" fill="${r.se.colour}" stroke="#fff" stroke-width="1.5"/>`).join("") + (rows.length === 1 ? `<line class="cross" x1="${f.L}" x2="${X}" y1="${sy(rows[0].v)}" y2="${sy(rows[0].v)}"/>` : "") : "");
      showTip(`<b>${esc(meta.xlab(best.x))}</b>` + rows.sort((a, b) => b.v - a.v).map(r => `<div><i style="background:${r.se.colour}"></i>${esc(r.se.name)}: <b>${esc((r.se.fmt || meta.vfmt || compact)(r.v))}</b></div>`).join(""), e);
      return;
    }
    if (meta.kind === "scatter") {
      let best = null; meta.pts.forEach(p => { const d = Math.hypot(p.x - loc.x, p.y - loc.y); if (!best || d < best.d) best = { d, p }; });
      if (!best || best.d > 14) { g.innerHTML = ""; if (tipEl) tipEl.hidden = true; return; }
      const p = best.p; g.innerHTML = `<line class="cross" x1="${meta.L}" x2="${p.x}" y1="${p.y}" y2="${p.y}"/><line class="cross" x1="${p.x}" x2="${p.x}" y1="${p.y}" y2="${meta.H - meta.B}"/><circle cx="${p.x}" cy="${p.y}" r="7" fill="none" stroke="#1f2a2e" stroke-width="2"/>`;
      showTip(`<b>${esc(p.label || "")}</b><div>${esc(meta.xtitle || "x")}: <b>${esc(meta.fx(p.vx))}</b></div><div>${esc(meta.ytitle || "y")}: <b>${esc(meta.fy(p.vy))}</b></div>`, e);
    }
  });
  document.addEventListener("mouseleave", () => hideTip(lastSvg), true);

  window.AtlasCharts = { line, area: (s, o) => line(s, o, true), bars, slope, ranked, pie, band, multiples, dual, spark, sparkBand, histogram, scatter, heat, coef, profile, dye, scale, orbits, tree, PALETTE, compact, REG };
})();
