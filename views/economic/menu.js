/* Atlas Economic (0.11) · the bar's dropdown menus (see menu.js).
 * Indicators splits the headline releases into Growth, Prices, Jobs, Pay, Public finances and trade, and Rates and
 * sterling; each indicator opens a card with the latest figure, the trend chart marked with what plausibly moved it,
 * what it measures, and the next release. Spending, Industries, Regions and Forecasts have their own categories.
 */
(function () {
  "use strict";
  const reg = window.AtlasMenus = window.AtlasMenus || {}; const M = reg.economic = reg.economic || {};
  const E = () => window.ATLAS_ECONOMY;
  const fmtV = (v, u) => v == null ? "—" : u === "%" ? (Math.abs(v) < 10 ? v.toFixed(1) : v.toFixed(0)) + "%" : u === "£m" ? (v < 0 ? "−" : "") + "£" + (Math.abs(v) / 1000).toFixed(1) + "bn" : u === "k" ? Math.round(v).toLocaleString("en-GB") + "k" : v.toFixed(Math.abs(v) < 10 ? 2 : 1);
  const TOPICS = { Growth: ["growth"], Prices: ["prices", "energy"], Jobs: ["labour"], Pay: ["pay", "prices"], "Public finances": ["finances"], Trade: ["trade", "sterling"], "Rates and sterling": ["rates", "sterling"] };
  // what each indicator measures, and how far to trust it (plain words)
  const MEANS = {
    gdp_q: ["How much the economy grew on the previous three months, after taking out price rises.", "First estimates are revised as more data arrive; a change of 0.1 or 0.2 points is common."],
    gdp_y: ["How much the economy grew over a calendar year, after taking out price rises.", "The longest series Atlas holds; revised for years as new data and methods arrive."],
    gdp_m: ["Output each month, as an index where 2022 averages 100.", "Monthly figures are volatile (strikes, weather, bank holidays): look at three-month changes."],
    retail: ["How much shops sold, after taking out price changes.", "Sensitive to the timing of holidays and sales; revised often."],
    cpi: ["How much consumer prices rose over the past twelve months.", "The Bank of England's target measure (2%); it leaves out owner-occupiers' housing costs."],
    cpih: ["Consumer prices including owner-occupiers' housing costs.", "ONS's lead measure; housing costs are estimated from rents."],
    core: ["Inflation without energy, food, alcohol and tobacco, whose prices swing most.", "A guide to underlying price pressure, not to what households pay."],
    services: ["Inflation in services (rents, restaurants, travel, insurance), driven mostly by wages.", "Watched closely by the Bank as a sign of home-grown inflation."],
    unemp: ["The share of people aged 16 and over who are out of work and looking for work.", "From the Labour Force Survey, whose low response rates make recent figures less reliable."],
    emp: ["The share of people aged 16 to 64 in work.", "From the Labour Force Survey; treat small changes with care."],
    inact: ["The share of people aged 16 to 64 neither in work nor looking for it (students, carers, long-term sick, retired).", "From the Labour Force Survey; long-term sickness has driven the rise since 2020."],
    vac: ["Job vacancies across the economy, in thousands.", "A survey of businesses; a good early sign of how tight the labour market is."],
    pay: ["How much average weekly pay rose on a year earlier, including bonuses.", "Averages shift when the mix of jobs changes, as in 2020 when low-paid jobs were furloughed."],
    realpay: ["Pay growth after taking out price rises: whether pay buys more or less than a year ago.", "Uses CPIH; negative means pay is falling behind prices."],
    psnb: ["How much more the public sector spent than it raised in the month.", "First estimates are revised, often by billions; months with tax deadlines (January, July) look better."],
    trade: ["Exports minus imports of goods and services in the month.", "Precious metals trading swings it wildly; ONS publishes it with and without."],
    bankrate: ["The Bank of England's interest rate, set to keep inflation near 2%.", "Sets the cost of borrowing across the economy, with a lag of a year or more."],
    sonia: ["The overnight rate banks pay to borrow sterling from each other.", "Tracks Bank Rate closely; the benchmark for most sterling loans."],
    gilt5: ["What the government pays to borrow for five years.", "Moves with expectations of Bank Rate; drives fixed mortgage rates."],
    gilt10: ["What the government pays to borrow for ten years.", "Reflects expected rates, inflation and investors' confidence in the public finances."],
    eri: ["The pound against a basket of trading partners' currencies (January 2005 = 100).", "A fall makes imports dearer and exports cheaper."],
    usd: ["US dollars per pound.", "Daily spot rate; swings with interest rates and news."],
    eur: ["Euros per pound.", "Daily spot rate; swings with interest rates and news."],
    mort2: ["The average two-year fixed mortgage rate for a 25% deposit.", "Quoted rates on new loans, not what existing borrowers pay."],
  };
  function card(ctx, B, id) {
    const s = E().ind[id], Ec = window.AtlasEcon; if (!s || !Ec) return null;
    const lab = {}; const pts = s.pts.map(p => { const x = Ec.xOf(p[0]); lab[x.toFixed(4)] = Ec.periodName(p[0], s.lfs); return [x, p[1]]; });
    return B.series({ title: s.label, app: "Economic", pts, unit: s.unit, fmt: v => fmtV(v, s.unit), topics: TOPICS[s.grp] || [], period: x => lab[x.toFixed(4)] || String(Math.floor(x)),
      src: s.src, url: s.url, next: s.next, means: (MEANS[id] || [])[0], trust: (MEANS[id] || [])[1] });
  }
  function tile(ctx, B, id) {
    const s = E().ind[id]; if (!s || !s.pts.length) return null; const n = s.pts.length, a = s.pts[n - 1][1], b = n > 1 ? s.pts[n - 2][1] : null, d = b == null ? null : a - b;
    const chg = d == null ? "" : Math.abs(d) < 1e-9 ? "unchanged" : `${d > 0 ? "▲" : "▼"} ${s.unit === "%" ? Math.abs(d).toFixed(1) + " pt" : s.unit === "£m" ? "£" + (Math.abs(d) / 1000).toFixed(1) + "bn" : s.unit === "k" ? Math.abs(Math.round(d)) + "k" : Math.abs(d).toFixed(2)}`;
    return { label: s.label.replace(/\s*\(.*\)$/, ""), value: fmtV(a, s.unit), chg, tone: d && s.good ? ((s.good === "up") === (d > 0) ? "good" : "bad") : "", card: () => card(ctx, B, id) };
  }
  function item(ctx, B, id) {
    const s = E().ind[id]; if (!s || !s.pts.length) return null; const last = s.pts[s.pts.length - 1];
    return { label: s.label, sub: `${fmtV(last[1], s.unit)} · ${window.AtlasEcon ? AtlasEcon.periodName(last[0], s.lfs) : last[0]}`, card: () => card(ctx, B, id) };
  }
  const grp = (ctx, B, g, label, note) => { const ids = Object.keys(E().ind).filter(id => E().ind[id].grp === g); if (!ids.length) return null; return { label: label || g, note, items: ids.map(id => item(ctx, B, id)).filter(Boolean), figures: ids.slice(0, 6).map(id => tile(ctx, B, id)).filter(Boolean), figTitle: "Latest" }; };
  M.indicators = (ctx, B) => {
    if (!E()) return null; const both = ids => ids.filter(id => E().ind[id]);
    const pf = both(["psnb", "trade"]);
    return { lede: "The UK's headline figures as published, each with its trend and what plausibly moved it.", sections: [
      grp(ctx, B, "Growth", "Growth", "Output and spending: is the economy growing?"),
      grp(ctx, B, "Prices", "Prices", "Inflation: how fast prices are rising."),
      grp(ctx, B, "Jobs", "Jobs", "Who's in work, who's looking, and how many jobs are open."),
      grp(ctx, B, "Pay", "Pay", "Pay growth, before and after inflation."),
      pf.length ? { label: "Public finances and trade", note: "Borrowing and the trade balance, month by month.", items: pf.map(id => item(ctx, B, id)).filter(Boolean), figures: pf.map(id => tile(ctx, B, id)).filter(Boolean), figTitle: "Latest" } : null,
      grp(ctx, B, "Rates and sterling", "Rates and sterling", "Interest rates, gilt yields, mortgages and the pound."),
      { label: "Regions", note: "Output per person and growth for every region and council.", items: [B.metric("gdp_per_head"), B.metric("gdp_growth"), B.metric("gdp"), B.panel("regions", "Regions compared", "GDP per head and growth, region by region")].filter(Boolean), figures: ["gdp_per_head", "gdp_growth"].map(id => B.fig(id, { good: "up" })).filter(Boolean) },
      { label: "Forecasts and calendar", note: "What forecasters expect, and when the next figures come out.", items: [B.panel("forecasts", "Forecasts vs outturn", "Independent forecasters and the OBR"), B.panel("calendar", "Release calendar", "Coming ONS releases")], figures: forecastFigs(ctx) },
    ].filter(Boolean) };
  };
  function forecastFigs(ctx) {
    const C = E() && E().consensus; if (!C) return [];
    const y = Object.keys(C.years).sort().find(k => +k >= +ctx.today.slice(0, 4)) || Object.keys(C.years).sort().pop(), row = C.years[y] || {};
    return Object.entries(row).filter(([n]) => /^GDP$|^CPI|Unemployment/.test(n)).slice(0, 3).map(([n, v]) => ({ label: `${n.replace(/\s*\(.*$/, "")} ${y}`, value: v.med != null ? v.med.toFixed(1) + "%" : "—", chg: v.lo != null ? `range ${v.lo.toFixed(1)} to ${v.hi.toFixed(1)}` : "", fn: null, card: () => ({ app: "Economic", title: `${n.replace(/\s*\(.*$/, "")}: forecasts for ${y}`, items: [{ k: `Median of independent forecasters · ${C.asof}`, h: `<b>${v.med != null ? v.med.toFixed(1) + "%" : "—"}</b>${v.obr != null ? `; the OBR expects ${v.obr.toFixed(1)}%` : ""}`, viz: AtlasCard.viz.big(v.med != null ? v.med.toFixed(1) + "%" : "—", "median"), open: true, more: `<p>The average forecast is ${v.avg != null ? v.avg.toFixed(1) + "%" : "—"}; the range runs from ${v.lo != null ? v.lo.toFixed(1) : "—"} to ${v.hi != null ? v.hi.toFixed(1) : "—"}%.</p>` }, { k: "Where it comes from", h: "HM Treasury, Forecasts for the UK economy", url: C.url, urlLabel: "Source" }], source: "HM Treasury", when: C.asof, panel: "forecasts" }) }));
  }
  M.rates = (ctx, B) => E() ? { sections: [grp(ctx, B, "Rates and sterling", "Rates and sterling")] } : null;
  M.forecasts = (ctx, B) => ({ sections: [{ label: "Forecasts", items: [B.panel("forecasts", "Open Forecasts vs outturn", "Independent forecasters and the OBR, against what was published")], figures: forecastFigs(ctx) }] });
  M.spending = (ctx, B) => ({ lede: "Where public money goes: the UK by function, regions and nations per person, councils by service.", sections: [
    B.group("Public spending", "economic", { label: "Per person", note: "Spending that can be traced to people living in each place." }),
    B.bd("spd_fn", { label: "By function" }), B.bd("spd_sub", { label: "By sub-function" }), B.bd("spd_dept", { label: "By department" }), B.bd("spd_council", { label: "Councils by service" }),
    B.group("Government debt", "economic", { label: "Debt and borrowing" }),
    { label: "The full panel", items: [B.panel("spending", "Open Public spending", "The UK by function, regions per person, your council by service")] }].filter(Boolean) });
  M.industries = (ctx, B) => ({ sections: [B.bd("eco_gva", { label: "Output by industry" }), B.bd("eco_jobs", { label: "Jobs by industry" }), B.bd("eco_gva_grow", { label: "Fastest-growing" }), { label: "The full panel", items: [B.panel("industries", "Open Industries", "Every industry against the region and the UK")] }].filter(Boolean) });
  M.regions = (ctx, B) => {
    const m = ctx.M.gdp_per_head; if (!m) return null;
    const regs = ctx.allCodesAt("region").concat(["S92000003", "W92000004", "N92000002"]).map(c => { try { const r = m.get(c, ctx.date); return r && r.v != null ? { c, r } : null; } catch (e) { return null; } }).filter(Boolean).sort((a, b) => b.r.v - a.r.v);
    return { sections: [{ label: "Output per person", note: "GDP per head by region and nation, highest first.", items: regs.map(x => ({ label: ctx.nameOf(x.c), sub: x.r.text || String(x.r.v), card: () => AtlasCard.metric("gdp_per_head", x.c), map: { metrics: ["gdp_per_head"], level: "region", focus: x.c } })), figures: regs.slice(0, 4).map(x => ({ label: ctx.nameOf(x.c), value: x.r.text || String(x.r.v), chg: "", card: () => AtlasCard.metric("gdp_per_head", x.c), map: { metrics: ["gdp_per_head"], level: "region" } })), figTitle: "Highest" },
      B.group("Output & growth", "economic", { label: "Growth and size" }), { label: "The full panel", items: [B.panel("regions", "Open Regions", "GVA per head and growth by region")] }].filter(Boolean) };
  };
  window.AtlasEconMenu = { card: (ctx, id) => card(ctx, AtlasMenu.B, id) };
})();
