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
  // 0.10.1: data/economy.js keeps public sector net borrowing with ONS's surplus sign (negative = the government
  // borrowed). Shown as borrowing, positive means borrowed, so "−£24.5bn" under "net borrowing" can't read as a surplus.
  const E = () => { const D = window.ATLAS_ECONOMY; if (D && D.ind && D.ind.psnb && !D.ind.psnb._flipped) {
    const p = D.ind.psnb, neg = p.pts.filter(x => x[1] < 0).length; if (neg > p.pts.length / 2) { p.pts = p.pts.map(([a, v]) => [a, v == null ? v : -v]); p.good = "down"; } p._flipped = true; } return D; };
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

  // ---------- 0.10.1: a story for every indicator, and for each Economic panel ----------
  const MEANS = {
    gdp_q: "How fast the whole economy grew in the quarter: the value of everything produced, after inflation.",
    gdp_y: "The economy's growth over a whole calendar year, after inflation.",
    gdp_m: "The monthly estimate of output, as an index (2022 = 100): the earliest sign of which way the economy is moving.",
    retail: "How much shops sold by volume (after price changes): a quick read on how households are spending.",
    cpi: "How much prices in the shops rose on a year earlier. The Bank of England aims to keep it at 2%.",
    cpih: "Inflation including owner-occupiers' housing costs: ONS's lead measure of prices.",
    core: "Inflation without energy, food, alcohol and tobacco, which swing with world prices: the underlying pace of price rises.",
    services: "Price rises for services (rents, travel, hairdressers…), driven mostly by wages: the measure the Bank of England watches most closely.",
    unemp: "The share of people who want work and are looking for it but don't have it.",
    emp: "The share of 16 to 64 year olds in work.",
    inact: "The share of 16 to 64 year olds neither working nor looking for work: students, carers, the long-term sick, early retirees.",
    vac: "Jobs employers are trying to fill: a sign of how tight the labour market is.",
    pay: "How much average weekly pay rose on a year earlier, before inflation.",
    realpay: "Pay growth after inflation: whether pay is buying more or less than a year earlier.",
    psnb: "How much more the public sector spent than it raised in the month.",
    trade: "Exports minus imports of goods and services in the month.",
    bankrate: "The interest rate the Bank of England sets to steer inflation towards 2%.",
    sonia: "The rate banks pay to borrow overnight from each other: Bank Rate as it is actually traded.",
    gilt5: "What the government pays to borrow for five years: where markets expect interest rates to be.",
    gilt10: "What the government pays to borrow for ten years: the benchmark for long-term borrowing costs.",
    eri: "Sterling against a basket of trading partners' currencies.",
    usd: "How many US dollars one pound buys.",
    eur: "How many euros one pound buys.",
    mort2: "The typical rate on a new two-year fixed mortgage with a 25% deposit.",
  };
  const TRUST = {
    Growth: "First estimates are often revised as more surveys and tax data come in; quarterly figures can move by 0.1–0.2 points.",
    Prices: "Measured from around 180,000 prices each month; rarely revised.",
    Jobs: "From the Labour Force Survey, whose response rates have fallen sharply; ONS advises care until the transformed survey replaces it. Three-month averages.",
    Pay: "Average weekly earnings from employers' payrolls (three-month averages); real pay uses CPIH.",
    "Public finances": "Early figures are revised, often by billions, as tax receipts and council data arrive.",
    Trade: "Monthly trade is volatile (precious metals especially) and often revised; look at the trend over several months.",
    "Rates and sterling": "Market rates from the Bank of England's database, as at the date shown; they change every day.",
  };
  const back = (s, years) => { const pts = s.pts, last = pts[pts.length - 1], x = xOf(last[0]) - years; let best = null; pts.forEach(p => { if (p[1] != null && Math.abs(xOf(p[0]) - x) < 0.09 && (!best || Math.abs(xOf(p[0]) - x) < Math.abs(xOf(best[0]) - x))) best = p; }); return best; };
  function since(s) {   // "the highest since March 2024" / "the lowest in the series"
    const pts = s.pts.filter(p => p[1] != null), n = pts.length; if (n < 6) return "";
    const v = pts[n - 1][1]; let i = n - 2; const hi = pts.slice(0, n - 1).every(p => p[1] <= v), lo = pts.slice(0, n - 1).every(p => p[1] >= v);
    if (hi || lo) return `the ${hi ? "highest" : "lowest"} in Atlas's series (since ${periodName(pts[0][0], s.lfs)})`;
    const up = v > pts[n - 2][1]; while (i >= 0 && (up ? pts[i][1] < v : pts[i][1] > v)) i--;
    return i < n - 7 && i >= 0 ? `the ${up ? "highest" : "lowest"} since ${periodName(pts[i][0], s.lfs)}` : "";
  }
  const say = (v, u) => u === "%" ? fmtV(v, u) : u === "£m" ? "£" + (Math.abs(v) / 1000).toFixed(1) + "bn" : u === "k" ? Math.round(v).toLocaleString("en-GB") + ",000" : v.toFixed(Math.abs(v) < 10 ? 2 : 1);
  function indStory(ctx, id, short) {
    const s = E().ind[id]; if (!s || !s.pts.length) return "";
    const pts = s.pts.filter(p => p[1] != null), last = pts[pts.length - 1], prev = pts[pts.length - 2], yr = back(s, 1);
    const per = periodName(last[0], s.lfs), u = s.unit, v = last[1];
    let lead;
    if (id === "psnb") lead = v >= 0 ? `The public sector borrowed ${say(v, u)} in ${per}` : `The public sector ran a surplus of ${say(-v, u)} in ${per}`;
    else if (id === "trade") lead = `The UK ${v < 0 ? "imported" : "exported"} ${say(Math.abs(v), u)} more than it ${v < 0 ? "exported" : "imported"} in ${per}`;
    else lead = `${s.label.replace(/\s*\(.*\)$/, "")} was ${say(v, u)} in ${per}`;
    const bits = [];
    if (prev) { const d = v - prev[1]; bits.push(Math.abs(d) < 1e-9 ? `unchanged on ${periodName(prev[0], s.lfs)}` : `${d > 0 ? "up" : "down"} from ${say(id === "psnb" || id === "trade" ? prev[1] : prev[1], u)}${u === "%" ? "" : ""} in ${periodName(prev[0], s.lfs)}`); }
    const sn = since(s); if (sn) bits.push(sn);
    let txt = `${lead}${bits.length ? ", " + bits.join(", ") : ""}.`;
    if (yr && yr !== prev && !short) txt += ` A year earlier it was ${say(yr[1], u)}.`;
    if (id === "cpi" && !short) txt += v > 2 ? ` That is ${(v - 2).toFixed(1)} points above the Bank of England's 2% target.` : v < 2 ? ` That is below the Bank of England's 2% target.` : " That is on the 2% target.";
    if (id === "realpay" && !short) txt += v >= 0 ? " Pay is rising faster than prices." : " Prices are rising faster than pay.";
    if (s.next && !short) txt += ` Next figures: ${s.next}.`;
    if (short) return txt;
    return `<div class="nv"><p class="nv-story">${ctx.esc(txt)}</p>${MEANS[id] ? `<p class="nv-means"><b>What it tells us.</b> ${ctx.esc(MEANS[id])}</p>` : ""}${TRUST[s.grp] ? `<p class="nv-trust"><b>How far to trust it.</b> ${ctx.esc(TRUST[s.grp])}</p>` : ""}</div>`;
  }
  function overview(ctx) {   // the Indicators panel's own story: the economy in four numbers
    const I = E().ind, L = id => I[id] && I[id].pts.filter(p => p[1] != null).slice(-1)[0];
    const g = L("gdp_q"), c = L("cpi"), un = L("unemp"), rp = L("realpay"), br = L("bankrate");
    const parts = [];
    if (g) parts.push(`The economy grew ${fmtV(g[1], "%")} in ${periodName(g[0])}`);
    if (c) parts.push(`prices rose ${fmtV(c[1], "%")} on a year earlier in ${periodName(c[0])}${c[1] > 2 ? `, above the 2% target` : ""}`);
    const first = parts.length ? parts.join(" and ") + "." : "";
    const more = [];
    if (un) more.push(`Unemployment was ${fmtV(un[1], "%")} (${periodName(un[0], true)})`);
    if (rp) more.push(`pay ${rp[1] >= 0 ? "grew" : "fell"} ${fmtV(Math.abs(rp[1]), "%")} after inflation`);
    if (br) more.push(`Bank Rate stands at ${fmtV(br[1], "%")}`);
    return `<div class="nv"><p class="nv-story">${ctx.esc(first)} ${ctx.esc(more.join("; "))}.</p><p class="nv-means"><b>What it tells us.</b> The UK's headline figures, as published: whether the economy is growing, how fast prices are rising, how many people are in work and whether pay is keeping up.</p><p class="nv-trust"><b>How far to trust it.</b> ${ctx.esc(TRUST.Growth)} ${ctx.esc(TRUST.Jobs)}</p></div>`;
  }
  const sinceShort = s => { const t = since(s); return t ? t.charAt(0).toUpperCase() + t.slice(1).replace(/^(The (?:highest|lowest)) in Atlas's series \(since (.*)\)$/, "$1 in the series (from $2)") : ""; };
  function tile(ctx, id) {
    const s = E().ind[id]; if (!s || !s.pts.length) return "";
    const n = s.pts.length, last = s.pts[n - 1], prev = s.pts[n - 2] || [null, null];
    const pts = s.pts.slice(-36).map(p => [xOf(p[0]), p[1]]);
    return `<button class="ec-tile" data-ecchart="${id}" title="Chart it"><div class="ec-lab">${ctx.esc(s.label)}</div><div class="ec-val">${fmtV(last[1], s.unit)}</div>
      <div class="ec-chg ${tone(s, last[1], prev[1])}">${chg(last[1], prev[1], s.unit)}</div>${ctx.CH.spark(pts, { w: 120, h: 26 })}
      <div class="ec-per">${ctx.esc(periodName(last[0], s.lfs))}${s.next ? ` · next ${ctx.esc(s.next)}` : ""}</div><div class="ec-story">${ctx.esc(sinceShort(s))}</div></button>`;
  }
  function indicators(ctx, el) {
    const D = E(); if (!D) { el.innerHTML = `<p class="ap-note">The indicators file isn't loaded (data/economy.js).</p>`; return; }
    const groups = {}; Object.entries(D.ind).forEach(([id, s]) => { if (s.grp !== "Rates and sterling") (groups[s.grp] = groups[s.grp] || []).push(id); });
    el.innerHTML = `${overview(ctx)}<p class="ap-note">The UK's headline figures, as published (seasonally adjusted where ONS publishes it so). ▲▼ against the previous period; green and red say which way is good, where that's clear. Labour market figures are three-month averages. Click a tile for its chart.</p>
      ${Object.entries(groups).map(([g, ids]) => `<h4>${ctx.esc(g)}</h4><div class="ec-grid">${ids.map(id => tile(ctx, id)).join("")}</div>`).join("")}
      <p class="ec-src">ONS time series (OGL); Bank of England. Built ${ctx.esc(D.built)}. The Labour Force Survey has had low response rates; ONS advises care with its figures until the transformed survey replaces it.</p>`;
  }
  function rates(ctx, el) {
    const D = E(); if (!D) { el.innerHTML = `<p class="ap-note">The rates file isn't loaded.</p>`; return; }
    const ids = Object.keys(D.ind).filter(id => D.ind[id].grp === "Rates and sterling");
    const g10 = D.ind.gilt10, g5 = D.ind.gilt5, br = D.ind.bankrate;
    const curve = g10 && g5 && br ? `<p>Gilt curve today: Bank Rate <b>${fmtV(br.pts[br.pts.length - 1][1], "%")}</b> · 5 years <b>${fmtV(g5.pts[g5.pts.length - 1][1], "%")}</b> · 10 years <b>${fmtV(g10.pts[g10.pts.length - 1][1], "%")}</b> (10y − 5y: ${((g10.pts[g10.pts.length - 1][1] - g5.pts[g5.pts.length - 1][1]) * 100).toFixed(0)} bp)</p>` : "";
    const L = id => D.ind[id] && D.ind[id].pts.filter(p => p[1] != null).slice(-1)[0], Y = id => D.ind[id] && back(D.ind[id], 1);
    const b = L("bankrate"), g = L("gilt10"), u = L("usd"), uy = Y("usd"), m = L("mort2"), my = Y("mort2");
    const rs = [b && `Bank Rate is ${fmtV(b[1], "%")} (set ${periodName(b[0])})`, g && `the government pays ${fmtV(g[1], "%")} to borrow for ten years`].filter(Boolean).join(", and ") + ".";
    const rs2 = [m && `A two-year fixed mortgage costs about ${fmtV(m[1], "%")}${my ? `, against ${fmtV(my[1], "%")} a year earlier` : ""}`, u && `a pound buys $${u[1].toFixed(2)}${uy ? ` ($${uy[1].toFixed(2)} a year ago)` : ""}`].filter(Boolean).join("; ");
    const story = `<div class="nv"><p class="nv-story">${ctx.esc(rs + (rs2 ? " " + rs2 + "." : ""))}</p><p class="nv-means"><b>What it tells us.</b> The price of money: what the Bank of England charges, what markets expect it to charge, what households pay on mortgages, and what the pound is worth abroad. A 10-year yield above the 5-year means markets want more to lend for longer.</p><p class="nv-trust"><b>How far to trust it.</b> ${ctx.esc(TRUST["Rates and sterling"])}</p></div>`;
    el.innerHTML = `${story}${curve}<div class="ec-grid">${ids.map(id => tile(ctx, id)).join("")}</div><p class="ec-src">Bank of England database (yields are nominal zero-coupon; sterling rates are daily spot). Built ${ctx.esc(D.built)}.</p>`;
  }
  function forecasts(ctx, el) {
    const D = E(), C = D && D.consensus; if (!C) { el.innerHTML = `<p class="ap-note">The forecast comparison isn't loaded.</p>`; return; }
    const out = (name, year) => {   // the outturn so far, where Atlas has it
      const q = name.match(/Quarterly GDP (\d{4} Q\d)/); if (q) { const p = (D.ind.gdp_q.pts.find(x => x[0] === q[1]) || [])[1]; return p != null ? p : null; }
      if (name === "GDP") { const p = (D.ind.gdp_y.pts.find(x => x[0] === year) || [])[1]; return p != null ? p : null; }
      return null;
    };
    const rowsFor = year => Object.entries(C.years[year] || {}).filter(([n]) => /GDP|CPI|Unemployment|earnings|disposable|Employment|Bank|consumption|investment/i.test(n));
    const yrs = Object.keys(C.years).sort(), y0 = yrs.find(y => +y >= new Date(ctx.today || Date.now()).getFullYear()) || yrs[0], row = n => (C.years[y0] || {})[Object.keys(C.years[y0] || {}).find(k => k.startsWith(n))];
    const gd = row("GDP"), cp = row("CPI"), ue = row("Unemployment");
    const fs = [gd && gd.med != null && `Independent forecasters expect the economy to grow ${gd.med.toFixed(1)}% in ${y0} (median; range ${gd.lo != null ? gd.lo.toFixed(1) + " to " + gd.hi.toFixed(1) : "–"}%)${gd.obr != null ? `, against ${gd.obr.toFixed(1)}% from the OBR` : ""}`, cp && cp.med != null && `inflation of ${cp.med.toFixed(1)}% at the end of the year`, ue && ue.med != null && `unemployment of ${ue.med.toFixed(1)}%`].filter(Boolean);
    const story = fs.length ? `<div class="nv"><p class="nv-story">${ctx.esc(fs.join(", "))}.</p><p class="nv-means"><b>What it tells us.</b> What the people paid to forecast the economy expect, how much they disagree (the range), and how the official forecaster compares. Once a year is over, the surprise column shows how far the outturn landed from the median.</p><p class="nv-trust"><b>How far to trust it.</b> Forecasts are often wrong by a point or more of growth; the range is a better guide than the middle. Forecasters report at different dates in the month.</p></div>` : "";
    el.innerHTML = `${story}<p class="ap-note">What independent forecasters expect, from HM Treasury's <a href="${ctx.esc(C.url)}" target="_blank" rel="noopener">comparison for ${ctx.esc(C.asof)}</a>, with the OBR's latest. Growth is the % change on the year before (quarterly: on the quarter before); CPI and earnings are Q4 on a year earlier; unemployment is the Q4 rate. When the outturn is published Atlas shows the surprise: outturn minus the median forecast.</p>
      ${Object.keys(C.years).sort().map(y => `<h4>${y}</h4><div class="tscroll"><table class="mo-tab ec-fc"><thead><tr><th></th><th class="num">Average</th><th class="num">Median</th><th class="num">Range</th><th class="num">OBR</th><th class="num">Outturn</th><th class="num">Surprise</th></tr></thead>${rowsFor(y).map(([n, v]) => { const o = out(n, y), s = o != null && v.med != null ? o - v.med : null;
        return `<tr><td>${ctx.esc(n.replace(/\s*\(.*$/, ""))}</td><td class="num">${v.avg != null ? v.avg.toFixed(1) : "—"}</td><td class="num">${v.med != null ? v.med.toFixed(1) : "—"}</td><td class="num">${v.lo != null ? v.lo.toFixed(1) + " to " + v.hi.toFixed(1) : "—"}</td><td class="num">${v.obr != null ? v.obr.toFixed(1) : "—"}</td><td class="num">${o != null ? o.toFixed(1) : ""}</td><td class="num ${s == null ? "" : s >= 0 ? "good" : "bad"}">${s != null ? (s >= 0 ? "+" : "−") + Math.abs(s).toFixed(1) : ""}</td></tr>`; }).join("")}</table></div>`).join("")}
      <p class="ec-src">HM Treasury, Forecasts for the UK economy (OGL). Forecasters report at different dates in the month; the OBR's is from its last full forecast.</p>`;
  }
  function calendar(ctx, el) {
    const CX = window.ATLAS_CONTEXT || {}, up = (CX.upcoming || []).filter(u => (u.pp || []).includes("economic") || /GDP|inflation|labour market|earnings|retail|trade|public sector finances|productivity|business/i.test(u.t)).slice(0, 40);
    const D = E(), next = D ? Object.values(D.ind).filter(s => s.next).map(s => [s.next, s.label]) : [];
    const soon = [...new Map(next.map(n => [n[0] + n[1], n])).values()].sort((a, b) => new Date(a[0]) - new Date(b[0]));
    const GRP = { Growth: "GDP", Prices: "inflation", Jobs: "jobs", Pay: "pay", "Public finances": "public finances", Trade: "trade" };
    const byDay = {}; Object.values(D ? D.ind : {}).filter(x => x.next).forEach(x => { const g = GRP[x.grp] || x.grp.toLowerCase(); const a = byDay[x.next] = byDay[x.next] || []; if (!a.includes(g)) a.push(g); });
    const days = Object.keys(byDay).sort((a, b) => new Date(a) - new Date(b)).slice(0, 4);
    const list = a => a.length > 1 ? a.slice(0, -1).join(", ") + " and " + a[a.length - 1] : a[0];
    const story = days.length ? `<div class="nv"><p class="nv-story">${ctx.esc(days.map((d, i) => `${i ? "" : "The next figures: "}${list(byDay[d])} on ${d.replace(/ \d{4}$/, "")}`).join("; "))}.</p><p class="nv-means"><b>What it tells us.</b> When the numbers on the Indicators tab will change. GDP, the labour market and inflation usually come out in the same few days each month.</p><p class="nv-trust"><b>How far to trust it.</b> Dates are ONS's pre-announced release calendar, which occasionally moves a release by a few days.</p></div>` : "";
    el.innerHTML = `${story}<p class="ap-note">Coming releases that move the economic figures (ONS release calendar).</p>${next.length ? `<h4>Next updates to the dashboard</h4><table class="mo-tab">${[...new Map(next.map(n => [n[0] + n[1], n])).values()].sort((a, b) => new Date(a[0]) - new Date(b[0])).map(([d, l]) => `<tr><td><small>${ctx.esc(d)}</small></td><td>${ctx.esc(l)}</td></tr>`).join("")}</table>` : ""}
      <h4>ONS calendar</h4><table class="mo-tab">${up.map(u => `<tr><td><small>${ctx.esc(ctx.shortDate(u.d))}</small></td><td><a href="${ctx.esc(u.u)}" target="_blank" rel="noopener">${ctx.esc(u.t)}</a></td></tr>`).join("") || `<tr><td>Nothing in the next two months.</td></tr>`}</table>`;
  }
  function regions(ctx, el) {
    const regs = ctx.allCodesAt("region"), m1 = ctx.M.gdp_per_head, m2 = ctx.M.gdp_growth;
    if (!m1) { el.innerHTML = `<p class="ap-note">Regional GDP isn't loaded.</p>`; return; }
    const it = regs.concat(["S92000003", "W92000004", "N92000002"]).map(c => ({ c, name: ctx.nameOf(c), v: (m1.get(c, ctx.date) || {}).v, g: m2 ? (m2.get(c, ctx.date) || {}).v : null, yr: (m1.get(c, ctx.date) || {}).yr })).filter(x => x.v != null);
    const uk = (m1.get(ctx.UKC, ctx.date) || {}).v;
    const srt = it.slice().sort((a, b) => b.v - a.v), hi = srt[0], lo = srt[srt.length - 1], gs = it.filter(x => x.g != null).sort((a, b) => b.g - a.g);
    const f = v => m1.fmt ? m1.fmt(v) : "£" + Math.round(v).toLocaleString("en-GB");
    const story = hi && lo ? `<div class="nv"><p class="nv-story">${ctx.esc(`${hi.name} produced ${f(hi.v)} per person${hi.yr ? ` in ${hi.yr}` : ""}, ${(hi.v / lo.v).toFixed(1)} times as much as ${lo.name} (${f(lo.v)})${uk ? `; the UK average was ${f(uk)}` : ""}.${gs.length ? ` ${gs[0].name} grew fastest (${gs[0].g.toFixed(1)}%), ${gs[gs.length - 1].name} slowest (${gs[gs.length - 1].g.toFixed(1)}%).` : ""}`)}</p><p class="nv-means"><b>What it tells us.</b> How much each part of the UK produces for each person who lives there: a measure of productivity and of the regional divide.</p><p class="nv-trust"><b>How far to trust it.</b> GDP is counted where people work, but divided by those who live there, so places with many commuters coming in (London most of all) look richer per head than their residents are. Regional figures come two years behind.</p></div>` : "";
    el.innerHTML = `${story}<p class="ap-note">GDP per head by English region and the devolved nations${it[0] && it[0].yr ? ` (${ctx.esc(it[0].yr)})` : ""}${uk ? `; UK ${ctx.esc(m1.fmt ? m1.fmt(uk) : uk)}` : ""}. The gap between London and the rest is the UK's widest regional productivity gap in the OECD.</p>
      ${ctx.CH.ranked(it.map(x => ({ name: x.name, v: x.v })), { w: 440, fmt: v => "£" + Math.round(v / 1000) + "k" })}
      ${m2 ? `<h4>Real growth</h4>${ctx.CH.ranked(it.filter(x => x.g != null).map(x => ({ name: x.name, v: x.g })), { w: 440, fmt: v => v.toFixed(1) + "%" })}` : ""}
      <div class="ap-row"><button class="btn sm" data-ecmap="gdp_per_head">GDP per head on the map</button><button class="btn sm" data-ecmap="gdp_growth">Growth on the map</button></div>`;
  }
  function openChart(ctx, id) {
    const s = E().ind[id]; if (!s) return;
    const pts = s.pts.map(p => [xOf(p[0]), p[1]]);
    const w = ctx.WM.make({ type: "ec-chart", title: s.label, html: `${indStory(ctx, id)}<div class="ec-chartwrap">${ctx.CH.line([{ name: s.label, colour: "#13876b", pts }], { w: 520, h: 260, fmt: v => fmtV(v, s.unit) })}</div><p class="ec-src">${ctx.esc(s.src)} · <a href="${ctx.esc(s.url)}" target="_blank" rel="noopener">source</a>${s.next ? ` · next release ${ctx.esc(s.next)}` : ""}</p>`, cascade: true, min: { w: 360, h: 240 }, def: () => ({ x: innerWidth - 600 - 76, y: 90, w: 580, h: 380 }) });
    ctx.WM.open(w.el);
  }
  let bound = false;
  function bind(ctx) { if (bound) return; bound = true;
    document.addEventListener("click", e => { const t = e.target.closest && e.target.closest("[data-ecchart],[data-ecmap]"); if (!t) return;
      if (t.dataset.ecchart) openChart(ctx, t.dataset.ecchart); else if (t.dataset.ecmap) { ctx.mapOnly([t.dataset.ecmap]); ctx.setLevel("region"); } }); }
  const wrap = f => (ctx, el) => { bind(ctx); f(ctx, el); };
  window.AtlasEcon = { indicators: wrap(indicators), rates: wrap(rates), forecasts: wrap(forecasts), calendar: wrap(calendar), regions: wrap(regions), xOf, periodName };
})();
