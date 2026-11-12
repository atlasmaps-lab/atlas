/* Atlas Economic (0.8) · what an economist tracks, from data/economy.js (pipeline/fetch_economy.py):
 *   indicators   the headline releases (GDP, prices, jobs, pay, public finances, trade) with the latest value, the
 *                change, a trend line and the next release date; click a tile for its chart
 *   forecasts    HM Treasury's monthly comparison of independent forecasts (average, median, range) and the OBR's,
 *                set against the outturn so far: the "surprise" is outturn minus the median forecast
 *   calendar     the coming ONS releases that move these numbers (data/context.js)
 *   rates        Bank Rate, SONIA, gilt yields, sterling and mortgage rates (Bank of England); also in Atlas Markets
 *   regions      GVA per head and growth by region (the map's own metrics)
 * Shared as window.AtlasEcon so Atlas Markets can use the rates panel.
 */
(function () {
  "use strict";
  const E = () => window.ATLAS_ECONOMY;
  const MON = { JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5, JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11 }, MNAME = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const QN = { 1: "Jan–Mar", 2: "Apr–Jun", 3: "Jul–Sep", 4: "Oct–Dec" };
  function xOf(p) { const s = String(p); let m;   // a period label -> decimal year, for charts
    if ((m = s.match(/^(\d{4}) Q(\d)$/))) return +m[1] + (+m[2] - 1) / 4 + 0.125;
    if ((m = s.match(/^(\d{4}) ([A-Z]{3})$/))) return +m[1] + MON[m[2]] / 12 + 1 / 24;
    if ((m = s.match(/^(\d{4})-(\d\d)-(\d\d)$/))) return +m[1] + (+m[2] - 1) / 12 + (+m[3]) / 365;
    return +s + 0.5; }
  function periodName(p, lfs) { const s = String(p); let m;
    if ((m = s.match(/^(\d{4}) Q(\d)$/))) return `${QN[m[2]]} ${m[1]}`;
    if ((m = s.match(/^(\d{4}) ([A-Z]{3})$/))) { const k = MON[m[2]]; return lfs ? `${MNAME[(k + 10) % 12].slice(0, 3)}–${MNAME[k].slice(0, 3)} ${m[1]}` : `${MNAME[k]} ${m[1]}`; }
    if ((m = s.match(/^(\d{4})-(\d\d)-(\d\d)$/))) return new Date(s + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    return s; }
  const fmtV = (v, u) => v == null ? "—" : u === "%" ? (Math.abs(v) < 10 ? v.toFixed(1) : v.toFixed(0)) + "%" : u === "£m" ? (v < 0 ? "−" : "") + "£" + (Math.abs(v) / 1000).toFixed(1) + "bn" : u === "k" ? Math.round(v).toLocaleString("en-GB") + "k" : v.toFixed(Math.abs(v) < 10 ? 2 : 1);
  const chg = (a, b, u) => { if (a == null || b == null) return ""; const d = a - b; if (Math.abs(d) < 1e-9) return "unchanged"; return (d > 0 ? "▲ " : "▼ ") + (u === "%" ? Math.abs(d).toFixed(1) + " pt" : u === "£m" ? "£" + (Math.abs(d) / 1000).toFixed(1) + "bn" : u === "k" ? Math.abs(Math.round(d)) + "k" : Math.abs(d).toFixed(2)); };
  const tone = (s, a, b) => { if (a == null || b == null || !s.good) return ""; const up = a > b; return (s.good === "up") === up ? "good" : "bad"; };

  function tile(ctx, id) {
    const s = E().ind[id]; if (!s || !s.pts.length) return "";
    const n = s.pts.length, last = s.pts[n - 1], prev = s.pts[n - 2] || [null, null];
    const pts = s.pts.slice(-36).map(p => [xOf(p[0]), p[1]]);
    return `<button class="ec-tile" data-ecchart="${id}" title="Chart it"><div class="ec-lab">${ctx.esc(s.label)}</div><div class="ec-val">${fmtV(last[1], s.unit)}</div>
      <div class="ec-chg ${tone(s, last[1], prev[1])}">${chg(last[1], prev[1], s.unit)}</div>${ctx.CH.spark(pts, { w: 120, h: 26 })}
      <div class="ec-per">${ctx.esc(periodName(last[0], s.lfs))}${s.next ? ` · next ${ctx.esc(s.next)}` : ""}</div></button>`;
  }
  function indicators(ctx, el) {
    const D = E(); if (!D) { el.innerHTML = `<p class="ap-note">The indicators file isn't loaded (data/economy.js).</p>`; return; }
    const groups = {}; Object.entries(D.ind).forEach(([id, s]) => { if (s.grp !== "Rates and sterling") (groups[s.grp] = groups[s.grp] || []).push(id); });
    el.innerHTML = `<p class="ap-note">The UK's headline figures, as published (seasonally adjusted where ONS publishes it so). ▲▼ against the previous period; green and red say which way is good, where that's clear. Labour market figures are three-month averages. Click a tile for its chart.</p>
      ${Object.entries(groups).map(([g, ids]) => `<h4>${ctx.esc(g)}</h4><div class="ec-grid">${ids.map(id => tile(ctx, id)).join("")}</div>`).join("")}
      <p class="ec-src">ONS time series (OGL); Bank of England. Built ${ctx.esc(D.built)}. The Labour Force Survey has had low response rates; ONS advises care with its figures until the transformed survey replaces it.</p>`;
  }
  function rates(ctx, el) {
    const D = E(); if (!D) { el.innerHTML = `<p class="ap-note">The rates file isn't loaded.</p>`; return; }
    const ids = Object.keys(D.ind).filter(id => D.ind[id].grp === "Rates and sterling");
    const g10 = D.ind.gilt10, g5 = D.ind.gilt5, br = D.ind.bankrate;
    const curve = g10 && g5 && br ? `<p>Gilt curve today: Bank Rate <b>${fmtV(br.pts[br.pts.length - 1][1], "%")}</b> · 5 years <b>${fmtV(g5.pts[g5.pts.length - 1][1], "%")}</b> · 10 years <b>${fmtV(g10.pts[g10.pts.length - 1][1], "%")}</b> (10y − 5y: ${((g10.pts[g10.pts.length - 1][1] - g5.pts[g5.pts.length - 1][1]) * 100).toFixed(0)} bp)</p>` : "";
    el.innerHTML = `${curve}<div class="ec-grid">${ids.map(id => tile(ctx, id)).join("")}</div><p class="ec-src">Bank of England database (yields are nominal zero-coupon; sterling rates are daily spot). Built ${ctx.esc(D.built)}.</p>`;
  }
  function forecasts(ctx, el) {
    const D = E(), C = D && D.consensus; if (!C) { el.innerHTML = `<p class="ap-note">The forecast comparison isn't loaded.</p>`; return; }
    const out = (name, year) => {   // the outturn so far, where Atlas has it
      const q = name.match(/Quarterly GDP (\d{4} Q\d)/); if (q) { const p = (D.ind.gdp_q.pts.find(x => x[0] === q[1]) || [])[1]; return p != null ? p : null; }
      if (name === "GDP") { const p = (D.ind.gdp_y.pts.find(x => x[0] === year) || [])[1]; return p != null ? p : null; }
      return null;
    };
    const rowsFor = year => Object.entries(C.years[year] || {}).filter(([n]) => /GDP|CPI|Unemployment|earnings|disposable|Employment|Bank|consumption|investment/i.test(n));
    el.innerHTML = `<p class="ap-note">What independent forecasters expect, from HM Treasury's <a href="${ctx.esc(C.url)}" target="_blank" rel="noopener">comparison for ${ctx.esc(C.asof)}</a>, with the OBR's latest. Growth is the % change on the year before (quarterly: on the quarter before); CPI and earnings are Q4 on a year earlier; unemployment is the Q4 rate. When the outturn is published Atlas shows the surprise: outturn minus the median forecast.</p>
      ${Object.keys(C.years).sort().map(y => `<h4>${y}</h4><div class="tscroll"><table class="mo-tab ec-fc"><thead><tr><th></th><th class="num">Average</th><th class="num">Median</th><th class="num">Range</th><th class="num">OBR</th><th class="num">Outturn</th><th class="num">Surprise</th></tr></thead>${rowsFor(y).map(([n, v]) => { const o = out(n, y), s = o != null && v.med != null ? o - v.med : null;
        return `<tr><td>${ctx.esc(n.replace(/\s*\(.*$/, ""))}</td><td class="num">${v.avg != null ? v.avg.toFixed(1) : "—"}</td><td class="num">${v.med != null ? v.med.toFixed(1) : "—"}</td><td class="num">${v.lo != null ? v.lo.toFixed(1) + " to " + v.hi.toFixed(1) : "—"}</td><td class="num">${v.obr != null ? v.obr.toFixed(1) : "—"}</td><td class="num">${o != null ? o.toFixed(1) : ""}</td><td class="num ${s == null ? "" : s >= 0 ? "good" : "bad"}">${s != null ? (s >= 0 ? "+" : "−") + Math.abs(s).toFixed(1) : ""}</td></tr>`; }).join("")}</table></div>`).join("")}
      <p class="ec-src">HM Treasury, Forecasts for the UK economy (OGL). Forecasters report at different dates in the month; the OBR's is from its last full forecast.</p>`;
  }
  function calendar(ctx, el) {
    const CX = window.ATLAS_CONTEXT || {}, up = (CX.upcoming || []).filter(u => (u.pp || []).includes("economic") || /GDP|inflation|labour market|earnings|retail|trade|public sector finances|productivity|business/i.test(u.t)).slice(0, 40);
    const D = E(), next = D ? Object.values(D.ind).filter(s => s.next).map(s => [s.next, s.label]) : [];
    el.innerHTML = `<p class="ap-note">Coming releases that move the economic figures (ONS release calendar).</p>${next.length ? `<h4>Next updates to the dashboard</h4><table class="mo-tab">${[...new Map(next.map(n => [n[0] + n[1], n])).values()].sort((a, b) => new Date(a[0]) - new Date(b[0])).map(([d, l]) => `<tr><td><small>${ctx.esc(d)}</small></td><td>${ctx.esc(l)}</td></tr>`).join("")}</table>` : ""}
      <h4>ONS calendar</h4><table class="mo-tab">${up.map(u => `<tr><td><small>${ctx.esc(ctx.shortDate(u.d))}</small></td><td><a href="${ctx.esc(u.u)}" target="_blank" rel="noopener">${ctx.esc(u.t)}</a></td></tr>`).join("") || `<tr><td>Nothing in the next two months.</td></tr>`}</table>`;
  }
  function regions(ctx, el) {
    const regs = ctx.allCodesAt("region"), m1 = ctx.M.gdp_per_head, m2 = ctx.M.gdp_growth;
    if (!m1) { el.innerHTML = `<p class="ap-note">Regional GDP isn't loaded.</p>`; return; }
    const it = regs.concat(["S92000003", "W92000004", "N92000002"]).map(c => ({ c, name: ctx.nameOf(c), v: (m1.get(c, ctx.date) || {}).v, g: m2 ? (m2.get(c, ctx.date) || {}).v : null, yr: (m1.get(c, ctx.date) || {}).yr })).filter(x => x.v != null);
    const uk = (m1.get(ctx.UKC, ctx.date) || {}).v;
    el.innerHTML = `<p class="ap-note">GDP per head by English region and the devolved nations${it[0] && it[0].yr ? ` (${ctx.esc(it[0].yr)})` : ""}${uk ? `; UK ${ctx.esc(m1.fmt ? m1.fmt(uk) : uk)}` : ""}. The gap between London and the rest is the UK's widest regional productivity gap in the OECD.</p>
      ${ctx.CH.ranked(it.map(x => ({ name: x.name, v: x.v })), { w: 440, fmt: v => "£" + Math.round(v / 1000) + "k" })}
      ${m2 ? `<h4>Real growth</h4>${ctx.CH.ranked(it.filter(x => x.g != null).map(x => ({ name: x.name, v: x.g })), { w: 440, fmt: v => v.toFixed(1) + "%" })}` : ""}
      <div class="ap-row"><button class="btn sm" data-ecmap="gdp_per_head">GDP per head on the map</button><button class="btn sm" data-ecmap="gdp_growth">Growth on the map</button></div>`;
  }
  function openChart(ctx, id) {
    const s = E().ind[id]; if (!s) return;
    const pts = s.pts.map(p => [xOf(p[0]), p[1]]);
    const w = ctx.WM.make({ type: "ec-chart", title: s.label, html: `<div class="ec-chartwrap">${ctx.CH.line([{ name: s.label, colour: "#13876b", pts }], { w: 520, h: 260, fmt: v => fmtV(v, s.unit) })}</div><p class="ec-src">${ctx.esc(s.src)} · <a href="${ctx.esc(s.url)}" target="_blank" rel="noopener">source</a>${s.next ? ` · next release ${ctx.esc(s.next)}` : ""}</p>`, cascade: true, min: { w: 360, h: 240 }, def: () => ({ x: innerWidth - 600 - 76, y: 90, w: 580, h: 380 }) });
    ctx.WM.open(w.el);
  }
  let bound = false;
  function bind(ctx) { if (bound) return; bound = true;
    document.addEventListener("click", e => { const t = e.target.closest && e.target.closest("[data-ecchart],[data-ecmap]"); if (!t) return;
      if (t.dataset.ecchart) { const sp = window.AtlasEconMenu && window.AtlasCard ? AtlasEconMenu.card(ctx, t.dataset.ecchart) : null; if (sp) AtlasCard.open(sp); else openChart(ctx, t.dataset.ecchart); }   /* 0.11: the indicator's card (latest, trend, why it moved) */ else if (t.dataset.ecmap) { ctx.mapOnly([t.dataset.ecmap]); ctx.setLevel("region"); } }); }
  const wrap = f => (ctx, el) => { bind(ctx); f(ctx, el); };
  window.AtlasEcon = { indicators: wrap(indicators), rates: wrap(rates), forecasts: wrap(forecasts), calendar: wrap(calendar), regions: wrap(regions), xOf, periodName };
})();
