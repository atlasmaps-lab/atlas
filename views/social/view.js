/* Atlas Social (1.8, light): population, change over time, density and age, from the data Atlas has.
 * A population pyramid needs age bands by place, which aren't loaded: "Not available yet".
 */
(function () {
  "use strict";
  const placeOf = ctx => ctx.focused || ctx.sel[0] || ctx.UKC;
  function people(ctx, el) {
    const c = placeOf(ctx), ids = ["population", "pop_change", "density", "average_age"].filter(id => ctx.M[id]);
    el.innerHTML = `<h4>${ctx.esc(ctx.nameOf(c))}</h4><p class="ap-note">Click an area on the map to change place.</p>
      <table class="itab">${ids.map(id => { const m = ctx.M[id], r = m.get(c, ctx.date), pts = m.temporal === "static" ? [] : ctx.seriesOf(m, c, 1998, +ctx.today.slice(0, 4)); return `<tr><th>${ctx.esc(m.label)}</th><td>${r && r.v != null ? ctx.esc(r.text) : "No data"}${r && r.yr ? ` <small>(${ctx.esc(r.yr)})</small>` : ""}${pts.length ? "<br>" + ctx.CH.spark(pts, { w: 160, h: 22, colour: "#d0701c" }) : ""}</td></tr>`; }).join("")}</table>
      <div class="ap-row"><button class="btn sm" data-schart>Chart population over time</button></div>`;
    el.onclick = e => { if (e.target.closest("[data-schart]")) ctx.openChart({ metrics: ["population"], places: [c] }); };
  }
  function change(ctx, el) {
    const lv = ctx.level === "ward" ? "council" : ctx.level, m = ctx.M.pop_change, rows = m ? ctx.allCodesAt(lv).map(c => [c, m.get(c, ctx.date)]).filter(x => x[1] && x[1].v != null).sort((a, b) => b[1].v - a[1].v) : [];
    const li = x => `<tr data-code="${x[0]}"><th>${ctx.esc(ctx.nameOf(x[0]))}</th><td class="num">${ctx.esc(x[1].text)}</td></tr>`;
    el.innerHTML = rows.length ? `<p class="ap-note">${ctx.esc(m.desc || "")}, ${ctx.esc((ctx.PLURAL_L[lv] || lv).toLowerCase())}.</p><h4>Growing fastest</h4><table class="cmp">${rows.slice(0, 10).map(li).join("")}</table><h4>Shrinking or growing slowest</h4><table class="cmp">${rows.slice(-10).map(li).join("")}</table>` : `<p class="ap-note">No population change for this boundary set on this date.</p>`;
  }
  function pyramid(ctx, el) { el.innerHTML = `<p><b>Population pyramid: not available yet.</b> It needs the number of people in each age band for each place; Atlas has only the average age. ONS publishes single-year-of-age estimates (Open Government Licence), the source to add next.</p>`; }
  window.AtlasApps && AtlasApps.register({
    id: "social", name: "Atlas Social", perspective: "social", accent: "#d0701c", dataNeeds: ["ATLAS_SERIES"],
    init(ctx) { ctx.mapOnly(["population"]); ctx.openPanel("people"); },
    panels: [{ id: "people", title: "People in a place", live: true, render: people }, { id: "change", title: "Population change", live: true, render: change }, { id: "pyramid", title: "Population pyramid", render: pyramid }],
  });
})();
