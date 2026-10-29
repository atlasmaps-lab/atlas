/* Atlas Economic (1.8, light): a place dashboard, rankings and a growth decomposition, from the data Atlas has
 * (GDP, GDP per head, real growth, population; national and council debt). GDHI, jobs and earnings: not available yet.
 */
(function () {
  "use strict";
  const pct = v => v == null || !isFinite(v) ? "—" : (v >= 0 ? "+" : "") + v.toFixed(1) + "%";
  const placeOf = ctx => ctx.focused || ctx.sel[0] || ctx.UKC;
  function dashboard(ctx, el) {
    const c = placeOf(ctx), ids = ["gdp", "gdp_per_head", "gdp_growth", "population"].filter(id => ctx.M[id]);
    el.innerHTML = `<h4>${ctx.esc(ctx.nameOf(c))}</h4><p class="ap-note">Click an area on the map to change place. Values on ${ctx.esc(ctx.longDate(ctx.date))}.</p>
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
  function missing(ctx, el) { el.innerHTML = `<p>Not available yet in Atlas Economic:</p><ul><li>Household income (GDHI) by place</li><li>Jobs, employment rate and earnings</li><li>Productivity per hour worked</li></ul><p class="ap-note">None of these is loaded; they are the next sources to add (ONS, Open Government Licence).</p>`; }
  window.AtlasApps && AtlasApps.register({
    id: "economic", name: "Atlas Economic", perspective: "economic", accent: "#13876b", dataNeeds: ["ATLAS_SERIES"],
    init(ctx) { ctx.mapOnly(["gdp_per_head"]); ctx.openPanel("dashboard"); },
    panels: [{ id: "dashboard", title: "Place dashboard", live: true, render: dashboard }, { id: "rankings", title: "Rankings", live: true, render: rankings }, { id: "missing", title: "Not available yet", render: missing }],
    tools: [{ id: "decomp", title: "Growth decomposition", live: true, render: decomp }],
  });
})();
