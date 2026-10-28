/* Atlas Health (0.7.1): the Health perspective as its own app (index.html#app=health), on the health data added in
 * 0.6.x (OHID Fingertips for councils and regions in England, Census 2021 for every ward and constituency in England
 * and Wales). It opens on a map, not a blank screen: women's life expectancy by council, and a place profile.
 */
(function () {
  "use strict";
  const ACC = "#c2364b";
  const placeOf = ctx => ctx.focused || ctx.sel[0] || "E92000001";
  // the place profile: [metric, which way is better]
  const PROFILE = [
    ["Life expectancy", [["le_f", 1], ["le_m", 1], ["hle_f", 1], ["hle_m", 1]]],
    ["Early deaths", [["u75_all", -1], ["u75_prev", -1], ["u75_cvd", -1], ["u75_cancer", -1], ["infant_mort", -1]]],
    ["Lifestyle", [["adult_obese", -1], ["y6_obese", -1], ["smoking", -1], ["inactive", -1]]],
    ["Conditions and wellbeing", [["diabetes", -1], ["dep_anx", -1], ["high_anxiety", -1]]],
    ["Census 2021", [["c_bad_health", -1], ["c_disabled", -1], ["c_carers", 0]]],
  ];
  const valuesAt = (ctx, id, lv) => { const m = ctx.M[id]; if (!m) return []; return ctx.allCodesAt(lv).map(c => { const r = m.get(c, ctx.date); return r && r.v != null && !r.nm ? [c, r.v, r] : null; }).filter(Boolean); };
  function rankOf(ctx, id, code, better) {
    const lv = ctx.P[code] && ctx.P[code].level; if (!lv || !["council", "constituency", "region", "ward"].includes(lv)) return "";
    const all = valuesAt(ctx, id, lv); if (all.length < 5) return "";
    all.sort((a, b) => better >= 0 ? b[1] - a[1] : a[1] - b[1]); const i = all.findIndex(x => x[0] === code); if (i < 0) return "";
    return `${i + 1} of ${all.length}`;
  }
  function overview(ctx, el) {
    const c = placeOf(ctx), eng = "E92000001";
    const rows = PROFILE.map(([g, ms]) => {
      const lines = ms.filter(([id]) => ctx.M[id]).map(([id, better]) => {
        const m = ctx.M[id], r = m.get(c, ctx.date), e = c !== eng ? m.get(eng, ctx.date) : null;
        if (!r || r.v == null || r.nm) return "";
        const diff = e && e.v != null ? r.v - e.v : null, good = diff == null || !better ? "" : (diff * better > 0 ? "good" : diff * better < 0 ? "bad" : "");
        const pts = m.temporal === "static" ? [] : ctx.seriesOf(m, c, 2000, +ctx.today.slice(0, 4));
        return `<tr><th><button class="lnk" data-hmap="${id}" title="Put it on the map">${ctx.esc(m.label)}</button></th><td class="num">${ctx.esc(r.text)}${r.yr ? ` <small>(${ctx.esc(String(r.yr))})</small>` : ""}</td>
          <td class="num ${good}">${e && e.v != null ? ctx.esc(e.text) : ""}</td><td><small>${ctx.esc(rankOf(ctx, id, c, better))}</small></td><td>${pts.length > 2 ? ctx.CH.spark(pts, { w: 90, h: 18, colour: ACC }) : ""}</td></tr>`;
      }).join("");
      return lines ? `<tr class="hgrp"><th colspan="5">${ctx.esc(g)}</th></tr>${lines}` : "";
    }).join("");
    el.innerHTML = `<h4>${ctx.esc(ctx.nameOf(c))}</h4><p class="ap-note">Click a council, ward or constituency on the map to change place. Green or red: better or worse than England. Rank: 1 = best.</p>
      ${rows ? `<div class="tscroll"><table class="cmp htab"><thead><tr><th></th><th>${ctx.esc(ctx.nameOf(c))}</th><th>England</th><th>Rank</th><th>Trend</th></tr></thead><tbody>${rows}</tbody></table></div>` : `<p class="ap-note">No health figures for ${ctx.esc(ctx.nameOf(c))}. Most health indicators cover councils and regions in England; Census 2021 health covers every ward and constituency in England and Wales. Scotland and Northern Ireland publish their own (not loaded yet).</p>`}
      <div class="ap-row"><button class="btn sm" data-hchart>Chart life expectancy here and in England</button><button class="btn sm" data-hcmp>Compare with nearby councils</button></div>
      <p class="ap-note">Sources: Office for Health Improvement and Disparities (Fingertips) and ONS Census 2021, Open Government Licence v3.0. ⓘ next to each metric in the menu explains how it's measured.</p>`;
    el.onclick = e => {
      const b = e.target.closest("[data-hmap]"); if (b) { const id = b.dataset.hmap; ctx.setLevel(id.startsWith("c_") && ctx.level === "ward" ? "ward" : ctx.level === "ward" && !id.startsWith("c_") ? "council" : ctx.level); ctx.mapOnly([id]); return; }
      if (e.target.closest("[data-hchart]")) ctx.openChart({ metrics: ["le_f"], places: [c, eng].filter((x, i, a) => a.indexOf(x) === i) });
      if (e.target.closest("[data-hcmp]")) { const reg = ctx.parentOf(c), near = ctx.allCodesAt("council").filter(x => ctx.parentOf(x) === reg).slice(0, 15); ctx.openCmpWith([c, ...near.filter(x => x !== c)]); }
    };
  }
  const RK = { id: "le_f" };
  function rankings(ctx, el) {
    const ids = ["le_f", "le_m", "hle_f", "hle_m", "u75_all", "u75_prev", "infant_mort", "adult_obese", "y6_obese", "smoking", "inactive", "diabetes", "c_bad_health", "c_disabled"].filter(id => ctx.M[id]);
    const better = { le_f: 1, le_m: 1, hle_f: 1, hle_m: 1 }[RK.id] || -1, lv = RK.id.startsWith("c_") && ["ward", "constituency"].includes(ctx.level) ? ctx.level : "council";
    const all = valuesAt(ctx, RK.id, lv).sort((a, b) => better > 0 ? b[1] - a[1] : a[1] - b[1]);
    const li = (x, i) => `<tr class="clk" data-code="${x[0]}"><td class="num">${i + 1}</td><th>${ctx.esc(ctx.nameOf(x[0]))}</th><td class="num">${ctx.esc(x[2].text)}</td></tr>`;
    const gap = all.length > 10 ? `${ctx.esc(all[0][2].text)} in ${ctx.esc(ctx.nameOf(all[0][0]))} against ${ctx.esc(all[all.length - 1][2].text)} in ${ctx.esc(ctx.nameOf(all[all.length - 1][0]))}` : "";
    el.innerHTML = `<div class="ap-row"><select data-rk>${ids.map(id => `<option value="${id}" ${RK.id === id ? "selected" : ""}>${ctx.esc(ctx.M[id].label)}</option>`).join("")}</select><button class="btn sm" data-rkmap>Show on the map</button></div>
      ${all.length ? `<p class="ap-note">${all.length} ${ctx.esc((ctx.PLURAL_L[lv] || lv).toLowerCase())}. The gap: ${gap}.</p>
      <h4>Best</h4><table class="cmp">${all.slice(0, 10).map(li).join("")}</table><h4>Worst</h4><table class="cmp">${all.slice(-10).map((x, j) => li(x, all.length - 10 + j)).join("")}</table>` : `<p class="ap-note">No values for these areas on this date.</p>`}`;
    el.onchange = e => { if (e.target.matches("[data-rk]")) { RK.id = e.target.value; rankings(ctx, el); } };
    el.onclick = e => { if (e.target.closest("[data-rkmap]")) { ctx.setLevel(lv); ctx.mapOnly([RK.id]); } const t = e.target.closest("[data-code]"); if (t) ctx.focus(t.dataset.code); };
  }
  function local(ctx, el) {
    el.innerHTML = `<p>Census 2021 health and care figures are added up for every ward and 2024 constituency in England and Wales, so you can see differences inside a council.</p>
      <div class="ap-row">${[["c_bad_health", "Bad health"], ["c_disabled", "Disability"], ["c_carers", "Unpaid carers"], ["c_carers50", "Carers, 50+ hours"]].map(([id, l]) => `<button class="btn sm" data-lw="${id}">${l} by ward</button>`).join("")}</div>
      <div class="ap-row">${[["c_bad_health", "Bad health"], ["c_disabled", "Disability"]].map(([id, l]) => `<button class="btn sm" data-lp="${id}">${l} by constituency</button>`).join("")}<button class="btn sm" data-lo>Childhood obesity by ward</button></div>
      <p class="ap-note">Ward childhood obesity is OHID's 3-year combined figure (National Child Measurement Programme).</p>`;
    el.onclick = e => { const w = e.target.closest("[data-lw]"); if (w) { ctx.setLevel("ward"); ctx.mapOnly([w.dataset.lw]); } const p = e.target.closest("[data-lp]"); if (p) { ctx.setLevel("constituency"); ctx.mapOnly([p.dataset.lp]); } if (e.target.closest("[data-lo]")) { ctx.setLevel("ward"); ctx.mapOnly(["y6_obese"]); } };
  }
  window.AtlasApps && AtlasApps.register({
    id: "health", name: "Atlas Health", perspective: "health", accent: ACC, dataNeeds: ["ATLAS_EXTRA"],
    init(ctx) { ctx.setLevel("council"); ctx.mapOnly(["le_f"]); ctx.openPanel("overview"); },
    panels: [{ id: "overview", title: "Place profile", live: true, render: overview, min: { w: 440, h: 320 } }, { id: "rankings", title: "Rankings", live: true, render: rankings, min: { w: 380, h: 320 } }, { id: "local", title: "Wards and seats", render: local }],
  });
})();
