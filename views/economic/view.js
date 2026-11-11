/* Atlas Economic (1.8, light): a place dashboard, rankings and a growth decomposition, from the data Atlas has
 * (GDP, GDP per head, real growth, population; national and council debt). GDHI, jobs and earnings: not available yet.
 */
(function () {
  "use strict";
  const pct = v => v == null || !isFinite(v) ? "—" : (v >= 0 ? "+" : "") + v.toFixed(1) + "%";
  const placeOf = ctx => ctx.focused || ctx.sel[0] || ctx.UKC;
  function dashboard(ctx, el) {
    const c = placeOf(ctx), ids = ["gdp", "gdp_per_head", "gdp_growth", "population"].filter(id => ctx.M[id]);
    el.innerHTML = `${ctx.story ? ctx.story("gdp_per_head", c) : ""}<h4>${ctx.esc(ctx.nameOf(c))}</h4><p class="ap-note">Click an area on the map to change place. Values on ${ctx.esc(ctx.longDate(ctx.date))}.</p>
      <table class="itab">${ids.map(id => { const m = ctx.M[id], r = m.get(c, ctx.date), pts = ctx.seriesOf(m, c, 1998, +ctx.today.slice(0, 4)); return `<tr><th>${ctx.esc(m.label)}</th><td>${r && r.v != null ? ctx.esc(r.text) : "No data"}${r && r.yr ? ` <small>(${ctx.esc(r.yr)})</small>` : ""}<br>${ctx.CH.spark(pts, { w: 160, h: 22, colour: "#13876b" })}</td></tr>`; }).join("")}</table>
      <div class="ap-row"><button class="btn sm" data-echart>Chart GDP per head over time</button><button class="btn sm" data-eopen="decomp">Growth decomposition</button></div>`;
    el.onclick = e => { if (e.target.closest("[data-echart]")) ctx.openChart({ metrics: ["gdp_per_head"], places: [c] }); const o = e.target.closest("[data-eopen]"); if (o) ctx.openPanel(o.dataset.eopen); };
  }
  const RK = { id: "gdp_per_head" };
  function rankings(ctx, el) {
    const lv = ctx.level === "ward" ? "council" : ctx.level, m = ctx.M[RK.id], rows = ctx.allCodesAt(lv).map(c => [c, m.get(c, ctx.date)]).filter(x => x[1] && x[1].v != null).sort((a, b) => b[1].v - a[1].v);
    const li = (x, i) => `<tr data-code="${x[0]}"><td class="num">${i + 1}</td><th>${ctx.esc(ctx.nameOf(x[0]))}</th><td class="num">${ctx.esc(x[1].text)}</td></tr>`;
    el.innerHTML = `<div class="ap-row"><select data-rk>${["gdp_per_head", "gdp", "gdp_growth", "psnd_ph", "la_borrow_ph"].filter(id => ctx.M[id]).map(id => `<option value="${id}" ${RK.id === id ? "selected" : ""}>${ctx.esc(ctx.M[id].label)}</option>`).join("")}</select><span class="ap-note">${rows.length} ${ctx.esc((ctx.PLURAL_L[lv] || lv).toLowerCase())}</span></div>
      ${rows.length ? `<h4>Highest</h4><table class="cmp">${rows.slice(0, 10).map(li).join("")}</table><h4>Lowest</h4><table class="cmp">${rows.slice(-10).map((x, j) => li(x, rows.length - 10 + j)).join("")}</table>` : `<p class="ap-note">No data for this boundary set on this date.</p>`}`;
    el.onchange = e => { if (e.target.matches("[data-rk]")) { RK.id = e.target.value; rankings(ctx, el); } };
  }
  const DC = { y0: 2010, y1: null };
  function decomp(ctx, el) {
    const c = placeOf(ctx), g = ctx.M.gdp, p = ctx.M.population; DC.y1 = DC.y1 || +((ctx.metricSpan("gdp") || ["", "2024"])[1].slice(0, 4));
    const at = (m, y) => { const r = m.get(c, y + "-07-01"); return r && r.v != null && (!r.yr || String(r.yr).startsWith(String(y))) ? r.v : null; };
    const G0 = at(g, DC.y0), G1 = at(g, DC.y1), P0 = at(p, DC.y0), P1 = at(p, DC.y1), n = DC.y1 - DC.y0;
    let body = `<p class="ap-note">Not enough data for ${ctx.esc(ctx.nameOf(c))} in those years.</p>`;
    if (G0 && G1 && P0 && P1 && n > 0) {
      const lg = Math.log(G1 / G0), lp = Math.log(P1 / P0), lh = lg - lp, ann = x => (Math.exp(x / n) - 1) * 100;
      body = `<table class="itab"><tr><th>GDP growth (current prices)</th><td><b>${pct(ann(lg))}</b> a year</td></tr><tr><th>…from more people</th><td>${pct(ann(lp))} a year (${(100 * lp / lg).toFixed(0)}% of it)</td></tr><tr><th>…from more output per person</th><td>${pct(ann(lh))} a year (${(100 * lh / lg).toFixed(0)}% of it)</td></tr></table>
        <p class="ap-note">Growth in GDP = growth in population + growth in GDP per head, exactly when measured in logs (shown here as yearly rates). Current prices include inflation; Atlas's real growth metric is “Real GDP growth”.</p>`;
    }
    el.innerHTML = `<h4>${ctx.esc(ctx.nameOf(c))}</h4><div class="ap-row">From <input type="number" data-dc="y0" value="${DC.y0}" style="width:70px"> to <input type="number" data-dc="y1" value="${DC.y1}" style="width:70px"></div>${body}`;
    el.onchange = e => { const k = e.target.dataset.dc; if (k) { DC[k] = +e.target.value; decomp(ctx, el); } };
  }
  function missing(ctx, el) { el.innerHTML = `<p>Not available yet in Atlas Economic:</p><ul><li>Household income (GDHI) by place</li><li>Jobs, employment rate and earnings by place (the UK figures are in Indicators)</li><li>Productivity per hour worked</li></ul><p class="ap-note">None of these is loaded; they are the next sources to add (ONS, Open Government Licence).</p>`; }
  // 0.8: the top bar follows what an economist tracks: the headline indicators, forecasts against outturn, the regions,
  // the release calendar, then the place view and rankings (econ.js holds the shared panels)
  const EC = id => (ctx, el) => window.AtlasEcon ? AtlasEcon[id](ctx, el) : (el.innerHTML = "<p class='ap-note'>The economic panels didn't load.</p>");
  // 0.10.1: Commuting opens with its story (Census 2021): the UK picture, or the chosen council's
  function commuteStory(ctx, CM, c) {
    const f = n => Math.round(n).toLocaleString("en-GB"), e = ctx.esc, codes = Object.keys(CM.out);
    const inn = k => (CM.in[k] || {}).n || 0, out = k => (CM.out[k] || {}).n || 0, net = k => inn(k) - out(k);
    const res = k => out(k) + (CM.within[k] || 0) + (CM.home[k] || 0);
    const trust = `<p class="nv-trust"><b>How far to trust it.</b> Census 2021 counted where people worked on 21 March 2021, during a lockdown, so home working is far higher and travel lower than in a normal year. Only each council's largest flows are listed. England and Wales only (Scotland's census was a year later, Northern Ireland's is published separately).</p>`;
    const means = `<p class="nv-means"><b>What it tells us.</b> Which places draw workers in and which send them out: job centres against commuter towns, and how far labour markets cross council borders.</p>`;
    if (!c) {
      const tot = codes.reduce((t, k) => t + out(k), 0), byNet = codes.slice().sort((a, b) => net(b) - net(a));
      const hm = codes.reduce((t, k) => t + (CM.home[k] || 0), 0), all = codes.reduce((t, k) => t + res(k), 0);
      const top = byNet.slice(0, 3), bot = byNet.slice(-3).reverse();
      return `<div class="nv"><p class="nv-story">${f(tot)} people in England and Wales worked in a different council from the one they lived in on Census day 2021. ${e(ctx.nameOf(top[0]))} drew the most workers in, ${f(net(top[0]))} more than left it each day, followed by ${top.slice(1).map(k => `${e(ctx.nameOf(k))} (${f(net(k))})`).join(" and ")}; the biggest commuter areas, sending out more than they took in, were ${bot.map(k => `${e(ctx.nameOf(k))} (${f(-net(k))})`).join(", ")}. ${hm ? `${f(hm / all * 100)}% of working residents worked mainly from home.` : ""}</p>${means}${trust}</div><p class="ap-note">Moving dots on the map travel the way more people commute; more dots means more commuters either way. Click a council for its own flows.</p>`;
    }
    const n = net(c), r = res(c), tops = (CM.out[c].top || [])[0], topi = ((CM.in[c] || {}).top || [])[0];
    return `<div class="nv"><p class="nv-story">${e(ctx.nameOf(c))} ${n >= 0 ? `drew in ${f(n)} more workers than it sent out` : `sent out ${f(-n)} more workers than it took in`} on Census day 2021: ${f(inn(c))} came in to work and ${f(out(c))} of its ${f(r)} working residents worked elsewhere${tops ? `, most of them in ${e(ctx.nameOf(tops[0]))} (${f(tops[1])})` : ""}. ${topi ? `The most workers came in from ${e(ctx.nameOf(topi[0]))} (${f(topi[1])}). ` : ""}${r && CM.home[c] ? `${f(CM.home[c] / r * 100)}% worked mainly from home.` : ""}</p>${means}${trust}</div>`;
  }

  window.AtlasApps && AtlasApps.register({
    id: "economic", name: "Atlas Economic", perspective: "economic", accent: "#13876b", dataNeeds: ["ATLAS_SERIES"],
    init(ctx) { ctx.mapOnly(["gdp_per_head"]); ctx.openPanel("indicators"); },
    panels: [
      // 0.9: what the economy here is made of, industry by industry, and where people commute
      { id: "spending", map: { level: "region", metrics: ["spend_ph"] }, title: "Public spending", blurb: "Where public money goes: the UK by function, regions and nations per person, and your council by service", live: true, render: (ctx, el) => window.AtlasSpending ? AtlasSpending.panel(ctx, el) : (el.innerHTML = "<p class='ap-note'>Not loaded.</p>"), min: { w: 480, h: 420 } },
      { id: "industries", map: {"level": "council", "metrics": ["eco_gva_top"]}, title: "Industries", blurb: "Output and jobs by industry, against the region and the UK; the fastest-growing industries", live: true, render: (ctx, el) => window.AtlasProfile ? AtlasProfile.panel(["eco_gva", "eco_jobs", "eco_gva_grow"], { what: "Industry" })(ctx, el) : (el.innerHTML = "<p class='ap-note'>Not loaded.</p>"), min: { w: 560, h: 420 } },
      { id: "commuting", map: {"level": "council", "metrics": ["commute_net"]}, title: "Commuting", blurb: "Where people here work, and where workers here live (Census 2021)", live: true, render: (ctx, el) => { const on = ctx.mapped ? ctx.mapped() : []; if (!on.includes("commute_lines")) ctx.mapOnly(on.concat(["commute_lines"])); const c = ctx.focused; const I = window.ATLAS_INDUSTRY, CM = I && I.commute; if (!CM) { el.innerHTML = "<p class='ap-note'>Not loaded.</p>"; return; }
        if (!c || !CM.out[c]) { el.innerHTML = commuteStory(ctx, CM); return; }
        const t = (L, d) => `<table class="tr-t"><thead><tr><th>${d}</th><th class="num">People</th></tr></thead><tbody>${L.map(([k, n]) => `<tr><td class="tr-n">${ctx.esc(ctx.nameOf(k))}</td><td class="num">${n.toLocaleString("en-GB")}</td></tr>`).join("")}</tbody></table>`;
        el.innerHTML = commuteStory(ctx, CM, c) + `<h4>${ctx.esc(ctx.nameOf(c))}</h4><p class="ap-note">${(CM.within[c] || 0).toLocaleString("en-GB")} live and work here; ${(CM.out[c].n).toLocaleString("en-GB")} go out to work; ${((CM.in[c] || {}).n || 0).toLocaleString("en-GB")} come in${CM.home[c] ? `; ${CM.home[c].toLocaleString("en-GB")} worked mainly from home` : ""} (Census day 2021, in lockdown).</p><div class="tr-two"><div>${t(CM.out[c].top, "Works in")}</div><div>${t((CM.in[c] || {}).top || [], "Lives in")}</div></div>`; }, min: { w: 460, h: 360 } },
      { id: "indicators", map: {"level": "council", "metrics": ["gdp_per_head"]}, title: "Indicators", blurb: "GDP, inflation, jobs, pay, public finances and trade: latest, trend and next release", render: EC("indicators"), min: { w: 520, h: 420 } },
      { id: "forecasts", title: "Forecasts vs outturn", blurb: "Independent forecasters and the OBR, against what was published", render: EC("forecasts"), min: { w: 520, h: 380 } },
      { id: "regions", map: {"level": "region", "metrics": ["gdp_per_head"]}, title: "Regions", blurb: "GVA per head and growth by region", render: EC("regions"), min: { w: 480, h: 380 } },
      { id: "calendar", title: "Release calendar", render: EC("calendar"), min: { w: 440, h: 360 } },
      { id: "rates", title: "Rates & sterling", render: EC("rates"), min: { w: 480, h: 320 } },
      { id: "dashboard", map: {"level": "council", "metrics": ["gdp_per_head"]}, title: "Place dashboard", live: true, render: dashboard },
      { id: "rankings", map: {"level": "council", "metrics": ["gdp_per_head"]}, title: "Rankings", live: true, render: rankings },
    ],
    tools: [{ id: "decomp", map: {"level": "council", "metrics": ["gdp_growth"]}, title: "Growth decomposition", live: true, render: decomp }, { id: "missing", title: "Not available yet", render: missing }],
  });
})();
