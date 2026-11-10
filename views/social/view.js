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
  // 0.8: what a social policy researcher reads first about a place: deprivation, by domain (IMD 2025, England)
  function deprivation(ctx, el) {
    const c = ctx.focused && ctx.P[ctx.focused] && ctx.P[ctx.focused].level === "council" ? ctx.focused : null;
    const doms = [["imd_income", "Income"], ["imd_employment", "Employment"], ["imd_education", "Education and skills"], ["imd_health", "Health and disability"], ["imd_crime", "Crime"], ["imd_barriers", "Barriers to housing and services"], ["imd_living", "Living environment"]].filter(([id]) => ctx.M[id]);
    if (!ctx.M.imd_decile) { el.innerHTML = `<p class="ap-note">The deprivation index isn't loaded (data/economy.js).</p>`; return; }
    if (!c) { el.innerHTML = `<p>Click a council in England on the map to see how deprived it is, overall and on each of the seven domains (English Indices of Deprivation 2025).</p><div class="ap-row"><button class="btn sm" data-sdmap="imd_decile">Deprivation decile on the map</button><button class="btn sm" data-sdmap="imd_share10">Share of neighbourhoods in the most deprived 10%</button></div>`; }
    else {
      const d = ctx.M.imd_decile.get(c, ctx.date), sh = ctx.M.imd_share10.get(c, ctx.date), n = 296;
      el.innerHTML = `<h4>${ctx.esc(ctx.nameOf(c))}</h4>${d && d.v ? `<p>Overall: <b>${ctx.esc(d.text)}</b>${sh && sh.v != null ? ` · ${ctx.esc(sh.text)} of its neighbourhoods are among England's most deprived 10%` : ""}.</p>` : `<p class="ap-note">${ctx.esc((d && d.text) || "Not in the index")}.</p>`}
        ${d && d.v ? ctx.CH.ranked(doms.map(([id, l]) => { const r = ctx.M[id].get(c, ctx.date); return { name: l, v: r && r.v ? n + 1 - r.v : null }; }).filter(x => x.v), { w: 440, fmt: v => "rank " + (n + 1 - v) }) : ""}
        <p class="ap-note">Longer bar = more deprived on that domain (rank 1 of ${n} is England's most deprived council). Each domain is on the map under Social → Deprivation.</p>
        <div class="ap-row"><button class="btn sm" data-sdmap="imd_decile">Deprivation decile on the map</button></div>`;
    }
    el.onclick = e => { const b = e.target.closest("[data-sdmap]"); if (b) { ctx.setLevel("council"); ctx.mapOnly([b.dataset.sdmap]); } };
  }
  // 0.8: Atlas Social is a social layer on the map (social.js, store.js); the statistics are kept under Statistics
  const SP = id => window.AtlasSocial ? AtlasSocial.panel(id) : (ctx, el) => { el.innerHTML = "<p class='ap-note'>Atlas Social didn't load.</p>"; };
  const dev = !!(window.AtlasTheme && AtlasTheme.dev);
  window.AtlasApps && AtlasApps.register({
    id: "social", name: "Atlas Social", perspective: "social", accent: "#d0701c", dataNeeds: ["ATLAS_SERIES"],
    init(ctx) { ctx.openPanel("feed"); },
    panels: [
      { id: "feed", title: "Feed", render: SP("feed"), min: { w: 380, h: 420 } },
      { id: "post", title: "Post", render: SP("post"), min: { w: 360, h: 380 } },
      { id: "events", title: "Events", render: SP("events"), min: { w: 380, h: 380 } },
      { id: "market", title: "Marketplace", render: SP("market"), min: { w: 400, h: 420 } },
      { id: "messages", title: "Messages", render: SP("messages"), min: { w: 420, h: 360 } },
      { id: "profile", title: "Profile & safety", render: SP("profile"), min: { w: 380, h: 420 } },
      ...(dev ? [{ id: "moderation", title: "Moderation", blurb: "Developers only: reports waiting for a decision", render: SP("moderation") }] : []),
      { id: "people", title: "Statistics", blurb: "Population, change, density and age for the place in focus", live: true, render: people },
      { id: "deprivation", title: "Deprivation", blurb: "English Indices of Deprivation 2025, overall and by domain", live: true, render: deprivation, min: { w: 480, h: 380 } },
      { id: "change", title: "Population change", live: true, render: change },
      { id: "census", title: "Census profile", blurb: "Every Census 2021 category for the place in focus, against its region and England and Wales", live: true, render: (ctx, el) => window.AtlasProfile ? AtlasProfile.panel(["cen_ethnic", "cen_religion", "cen_birth", "cen_language", "cen_english", "cen_age", "cen_nssec", "cen_occupation", "cen_activity", "cen_quals", "cen_tenure", "cen_households"], { what: "Category" })(ctx, el) : (el.innerHTML = "<p class='ap-note'>Not loaded.</p>"), min: { w: 560, h: 420 } },
    ],
    tools: [{ id: "pyramid", title: "Population pyramid", render: pyramid }],
  });
})();
