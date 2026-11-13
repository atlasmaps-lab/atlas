/* Atlas Resilience (0.12): planning for, responding to and understanding emergencies, environmental and health. Built
 * for emergency planners first (local resilience forums, council emergency planning, health protection), with a simple
 * public view on top. Names are a first version to build on.
 *   Prepare     hazards on the map (recorded floods, coastal erosion, hot days, wildfire, air pollution) over who is most
 *               vulnerable (a vulnerability index whose parts are always shown: older people, people living alone, poor
 *               health, disability, fuel poverty, deprivation, child poverty)
 *   Respond     live flood warnings and alerts from the Environment Agency (England), each with what's inside it:
 *               homes, people (estimated), older and unwell residents, hospitals, care homes, schools, GPs, stations;
 *               a situation report as a card (workspace, print)
 *   Understand  past floods over time; disease: COVID-19 for the place in focus, flu and measles for England (UKHSA)
 *   Near me     for the public: is there a warning near a place, its flood history, and how to prepare
 * Live services (no key, CORS open, cached, fail plainly): Environment Agency flood monitoring (OGL), UKHSA data
 * dashboard API (OGL), OpenStreetMap via Overpass. Wording: risk and exposure are estimates, not forecasts of harm.
 */
(function () {
  "use strict";
  const EA = "https://environment.data.gov.uk/flood-monitoring", UKHSA = "https://api.ukhsa-dashboard.data.gov.uk/themes/infectious_disease/sub_themes";
  const SEV = { 1: ["Severe flood warning", "#7f0000"], 2: ["Flood warning", "#d7301f"], 3: ["Flood alert", "#f39c12"], 4: ["No longer in force", "#9aa5ab"] };
  const esc = t => String(t == null ? "" : t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const FC = f => ({ type: "FeatureCollection", features: f || [] });
  const inRing = (pt, rg) => { let c = false; for (let i = 0, k = rg.length - 1; i < rg.length; k = i++) { const [xi, yi] = rg[i], [xk, yk] = rg[k]; if ((yi > pt[1]) !== (yk > pt[1]) && pt[0] < (xk - xi) * (pt[1] - yi) / (yk - yi) + xi) c = !c; } return c; };
  const ringsOf = g => g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : [];
  const inGeom = (pt, g) => ringsOf(g).some(p => inRing(pt, p[0]) && !p.slice(1).some(h => inRing(pt, h)));
  function areaKm2(g) { let a = 0; ringsOf(g).forEach(p => p.forEach((r, i) => { let s = 0; const lat0 = r[0][1] * Math.PI / 180; for (let k = 0; k < r.length - 1; k++) s += (r[k][0] * r[k + 1][1] - r[k + 1][0] * r[k][1]); a += (i ? -1 : 1) * Math.abs(s) / 2 * 111.32 * 111.32 * Math.cos(lat0); })); return Math.abs(a); }
  function bboxOf(g) { let b = [180, 90, -180, -90]; ringsOf(g).forEach(p => p[0].forEach(([x, y]) => { b = [Math.min(b[0], x), Math.min(b[1], y), Math.max(b[2], x), Math.max(b[3], y)]; })); return b; }
  let ctx = null;
  const fmtInt = n => n == null ? "—" : Math.round(n).toLocaleString("en-GB");
  const pct = v => v == null ? "—" : v.toFixed(1) + "%";

  // ---------- What the authorities are saying (0.12) ----------
  // Official warning services (links: the Met Office and Flood Forecasting Centre feeds don't allow browsers to read them)
  // and the latest news stories and press releases from the agencies responsible, from GOV.UK's search API (open to
  // browsers). Shown wherever alerts are: Prepare, Respond, each warning's card, Understand (disease) and Near me.
  const OFFICIAL = {
    flood: [["Flood warnings in force (Environment Agency)", "https://check-for-flooding.service.gov.uk/alerts-and-warnings"], ["5-day flood risk (Flood Forecasting Centre)", "https://check-for-flooding.service.gov.uk/"], ["Wales: flood warnings (Natural Resources Wales)", "https://flood-warning.naturalresources.wales/"], ["Scotland: flood updates (SEPA)", "https://floodline.sepa.org.uk/floodupdates/"], ["Northern Ireland: flooding (NI Direct)", "https://www.nidirect.gov.uk/articles/flooding"]],
    weather: [["Weather warnings (Met Office)", "https://www.metoffice.gov.uk/weather/warnings-and-advice/uk-warnings"], ["Heat and cold health alerts (UKHSA)", "https://ukhsa-dashboard.data.gov.uk/weather-health-alerts"]],
    disease: [["UKHSA data dashboard", "https://ukhsa-dashboard.data.gov.uk/"], ["Measles: guidance and data (UKHSA)", "https://www.gov.uk/government/collections/measles-guidance-data-and-analysis"], ["Flu and COVID-19 surveillance reports (UKHSA)", "https://www.gov.uk/government/statistics/national-flu-and-covid-19-surveillance-reports-2025-to-2026-season"]],
    plan: [["Local resilience forums: contacts", "https://www.gov.uk/guidance/local-resilience-forums-contact-details"], ["Prepare for emergencies (GOV.UK)", "https://prepare.campaign.gov.uk/"], ["National Risk Register", "https://www.gov.uk/government/publications/national-risk-register-2025"]] };
  const ORGS = ["environment-agency", "uk-health-security-agency", "met-office", "department-for-environment-food-rural-affairs", "cabinet-office"];
  const REL = new Map();
  function releases(q, n) {   // newest first; [] if GOV.UK doesn't answer
    const key = q + "|" + (n || 5); if (REL.has(key)) return REL.get(key);
    const u = "https://www.gov.uk/api/search.json?" + [["q", q], ...ORGS.map(o => ["filter_organisations[]", o]), ["filter_content_purpose_supergroup", "news_and_communications"], ["order", "-public_timestamp"], ["count", 12],
      ...["title", "link", "public_timestamp", "organisations", "description", "content_store_document_type"].map(f => ["fields[]", f])].map(([k, v]) => encodeURIComponent(k) + "=" + encodeURIComponent(v)).join("&");
    const pr = fetch(u).then(r => { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); }).then(j => (j.results || [])
      .filter(r => /news_story|press_release|government_response|official_statement|speech/.test(r.content_store_document_type || "news_story"))
      .slice(0, n || 5).map(r => ({ t: r.title, u: "https://www.gov.uk" + r.link, d: String(r.public_timestamp || "").slice(0, 10), o: ((r.organisations || [])[0] || {}).acronym || ((r.organisations || [])[0] || {}).title || "", x: r.description || "",
        k: /press_release/.test(r.content_store_document_type) ? "Press release" : "News" }))).catch(() => { REL.delete(key); return []; });
    REL.set(key, pr); return pr;
  }
  const dmy = d => d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "";
  const relHTML = (L, none) => L.length ? `<ul class="res-news" data-nosort>${L.map(r => `<li><a href="${esc(r.u)}" target="_blank" rel="noopener">${esc(r.t)} ↗</a><small>${esc(dmy(r.d))} · ${esc([r.o, r.k].filter(Boolean).join(" · "))}</small></li>`).join("")}</ul>` : `<p class="ap-note ap-keep">${none || "No recent releases found."}</p>`;
  const offHTML = (...ks) => `<ul class="res-links" data-nosort>${ks.flatMap(k => OFFICIAL[k]).map(([t, u]) => `<li><a href="${esc(u)}" target="_blank" rel="noopener">${esc(t)} ↗</a></li>`).join("")}</ul>`;
  // a placeholder filled when GOV.UK answers: <div data-resrel="q|n">
  const relSlot = (q, n) => `<div class="res-rel" data-resrel="${esc(q + "|" + (n || 5))}"><p class="ap-note ap-keep">Asking GOV.UK for the latest releases…</p></div>`;
  function fillRel(el) { el.querySelectorAll("[data-resrel]").forEach(x => { const [q, n] = x.dataset.resrel.split("|"); releases(q, +n).then(L => { if (x.isConnected) x.innerHTML = relHTML(L); }); }); }
  async function mergedReleases(qs, n) { const all = (await Promise.all(qs.map(q => releases(q, n)))).flat(), seen = new Set(); return all.filter(r => !seen.has(r.u) && seen.add(r.u)).sort((a, b) => b.d.localeCompare(a.d)).slice(0, n); }

  // ---------- Prepare: who is most vulnerable (councils) ----------
  // Each part is the council's percentile among councils with the figure (0 = least, 100 = most); the index is their
  // average when at least four parts are known. The parts are always shown with it.
  const PARTS = [
    ["old", "Aged 65 and over", "Share of residents aged 65 or over (Census 2021)", c => bdShare("cen_age", c, n => /Aged (6[5-9]|[7-9]\d)|85 years and over/.test(n))],
    ["alone", "Living alone, 66 and over", "Households of one person aged 66 or over (Census 2021)", c => bdShare("cen_households", c, n => /^One-person household: Aged 66/.test(n))],
    ["health", "Bad or very bad health", "Census 2021", c => val("c_bad_health", c)],
    ["disab", "Disabled, day-to-day activities limited a lot", "Census 2021", c => val("c_disabled_lot", c)],
    ["fuel", "Fuel poverty", "Households in fuel poverty (DESNZ)", c => val("fuel_poverty", c)],
    ["depr", "Deprivation", "Index of Multiple Deprivation 2025 score (England)", c => val("imd_score", c)],
    ["child", "Child poverty", "Children in low-income families, after housing costs (DWP)", c => val("child_poverty", c)]];
  const val = (id, c) => { const r = ctx.value(id, c); return r && r.v != null && !r.nm && isFinite(r.v) ? r.v : null; };
  function bdShare(id, c, pick) { const s = ctx.bd.spec(id), d = ctx.bd.of(id, c); if (!s || !d) return null; let t = 0, k = 0; Object.entries(d).forEach(([cat, v]) => { t += v; if (pick(s.name(cat))) k += v; }); return t ? 100 * k / t : null; }
  let VUL = null;
  function vulnerability() {
    if (VUL) return VUL; const codes = ctx.allCodesAt("council"), raw = {}, pc = {};
    PARTS.forEach(([k, , , f]) => { const vs = codes.map(c => [c, f(c)]).filter(x => x[1] != null).sort((a, b) => a[1] - b[1]); raw[k] = Object.fromEntries(vs); pc[k] = Object.fromEntries(vs.map(([c], i) => [c, vs.length > 1 ? 100 * i / (vs.length - 1) : 50])); });
    const idx = {}; codes.forEach(c => { const ps = PARTS.map(([k]) => pc[k][c]).filter(v => v != null); if (ps.length >= 4) idx[c] = ps.reduce((a, b) => a + b, 0) / ps.length; });
    return (VUL = { raw, pc, idx, n: Object.keys(idx).length });
  }
  function defineMetrics() {
    if (defineMetrics.done || !ctx.defineMetric) return; defineMetrics.done = true;
    ctx.defineMetric({ id: "res_vuln", p: "resilience", group: "Vulnerability", label: "Vulnerability (combined)", scale: "interval", nature: "rate", temporal: "static", levels: ["council"], fmt: v => v.toFixed(0),
      desc: "How vulnerable a council's residents are, on average across seven parts (older people, living alone, poor health, disability, fuel poverty, deprivation, child poverty): 0 = least of all councils, 100 = most. The parts are always shown with it.",
      how: "Each part is the council's percentile among councils with that figure; the index is the average of the parts known (at least four).", source: "Atlas, from Census 2021, DESNZ, MHCLG and DWP figures",
      get: c => { const V = vulnerability(), v = V.idx[c]; return v == null ? null : { v, text: `${v.toFixed(0)} of 100`, yr: "2021–2025" }; } });
    PARTS.forEach(([k, label, src]) => ctx.defineMetric({ id: "res_" + k, p: "resilience", group: "Vulnerability: the parts", label, scale: "ratio", nature: "share", temporal: "static", levels: ["council"], fmt: v => v.toFixed(1) + "%", desc: src, source: src,
      get: c => { const v = vulnerability().raw[k][c]; return v == null ? null : { v, text: (k === "depr" ? v.toFixed(1) : v.toFixed(1) + "%"), yr: "latest" }; } }));
  }
  function prepare(c, el) {
    bind(c); const code = ctx.focused && ctx.P[ctx.focused] && ctx.P[ctx.focused].level === "council" ? ctx.focused : null, V = vulnerability(), H = HAZ;
    const rank = code && V.idx[code] != null ? Object.values(V.idx).filter(v => v > V.idx[code]).length + 1 : null;
    const top = code ? PARTS.map(([k, l]) => [l, V.pc[k][code], V.raw[k][code]]).filter(x => x[1] != null).sort((a, b) => b[1] - a[1]) : [];
    el.innerHTML = `${code ? `<div class="nv"><p class="nv-story">${esc(ctx.nameOf(code))} ranks <b>${rank} of ${V.n}</b> councils for vulnerability (${V.idx[code].toFixed(0)} of 100)${top[0] ? `, highest on ${esc(top[0][0].toLowerCase())}${top[1] ? ` and ${esc(top[1][0].toLowerCase())}` : ""}` : ""}.</p></div>` : `<div class="nv"><p class="nv-story">Who would be hit hardest when something goes wrong: the vulnerability index across ${V.n} councils, with the hazards on top.</p></div>`}
      <h4 class="ed-open">Hazards on the map</h4><div class="res-haz">${[["floods", "Recorded floods"], ["coast", "Coastal erosion"], ["heat", "Hot summer days"], ["fire", "Wildfire"], ["rivers", "Rivers"]].map(([k, l]) => `<label class="ck"><input type="checkbox" data-reshaz="${k}" ${H[k] ? "checked" : ""}> ${l}</label>`).join("")}</div>
      <div class="ap-row"><button class="btn sm" data-resmap="res_vuln">Vulnerability on the map</button><button class="btn sm" data-resmap="env_no2">Air pollution (NO2)</button><button class="btn sm" data-resmap="care_beds">Care home beds</button></div>
      <h4 class="ed-open">What the authorities are saying</h4>${offHTML("flood", "weather")}<p class="ap-note ap-keep">Latest from the Environment Agency, Met Office, UKHSA, Defra and the Cabinet Office${code ? ` (about ${esc(ctx.nameOf(code))} first)` : ""}:</p><div class="res-rel" data-resprep><p class="ap-note ap-keep">Asking GOV.UK…</p></div>
      <h4 class="ed-open">The parts${code ? `: ${esc(ctx.nameOf(code))}` : ""}</h4>
      ${code ? `<table class="mo-tab"><thead><tr><th>Part</th><th class="num">Here</th><th class="num">Percentile</th></tr></thead><tbody>${PARTS.map(([k, l]) => `<tr><td><button class="linkish" data-resmap="res_${k}">${esc(l)}</button></td><td class="num" data-v="${V.raw[k][code] ?? ""}">${V.raw[k][code] == null ? "—" : k === "depr" ? V.raw[k][code].toFixed(1) : pct(V.raw[k][code])}</td><td class="num" data-v="${V.pc[k][code] ?? ""}">${V.pc[k][code] == null ? "—" : V.pc[k][code].toFixed(0)}</td></tr>`).join("")}</tbody></table>`
        : `<p class="ap-note ap-keep">Click a council on the map for its parts.</p>`}
      <h4>Most vulnerable councils</h4><table class="mo-tab"><thead><tr><th>Council</th><th class="num">Index</th></tr></thead><tbody>${Object.entries(V.idx).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([cc, v]) => `<tr><td><button class="linkish" data-resgo="${cc}">${esc(ctx.nameOf(cc))}</button></td><td class="num" data-v="${v}">${v.toFixed(0)}</td></tr>`).join("")}</tbody></table>
      <p class="ap-note">The index ranks councils against each other; it isn't a measure of harm. Parts known for fewer councils (deprivation is England only) count only where they exist. Sources: Census 2021 (ONS), DESNZ fuel poverty, MHCLG Indices of Deprivation 2025, DWP children in low-income families.</p>`;
    const hz = Object.keys(HAZ).filter(k => HAZ[k] && k !== "rivers").map(k => ({ floods: "flood", coast: "coastal erosion", heat: "heatwave", fire: "wildfire" }[k])), qs = (hz.length ? hz : ["flood", "heatwave", "storm"]);
    const slot = el.querySelector("[data-resprep]"); (code ? Promise.all([mergedReleases(qs.map(q => q + " " + ctx.nameOf(code)), 3), mergedReleases(qs, 6)]).then(([a, b]) => [...a, ...b.filter(r => !a.some(x => x.u === r.u))].slice(0, 6)) : mergedReleases(qs, 6))
      .then(L => { if (slot.isConnected) slot.innerHTML = relHTML(L); });
  }
  const HAZ = { floods: false, coast: false, heat: false, fire: false, rivers: true };
  function applyHaz() {
    const E = window.AtlasEnv; if (!E || !E.setOn) return; E.bind(ctx); E.setOn({ floods: HAZ.floods, coast: HAZ.coast, heat: HAZ.heat, fire: HAZ.fire, cons: false });
    if (window.AtlasRivers) HAZ.rivers ? AtlasRivers.show(ctx) : AtlasRivers.hide();
  }

  // ---------- Respond: live flood warnings ----------
  const W = { list: null, polys: new Map(), at: null, err: "", busy: false };
  async function loadWarnings(force) {
    if (W.busy || (!force && W.at && Date.now() - W.at < 15 * 60e3)) return; W.busy = true; W.err = "";
    try {
      const j = await fetch(`${EA}/id/floods`).then(r => { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); });
      W.list = (j.items || []).filter(x => x.severityLevel && x.severityLevel < 4).sort((a, b) => a.severityLevel - b.severityLevel || String(b.timeRaised).localeCompare(String(a.timeRaised)));
      W.at = Date.now();
      for (const w of W.list.slice(0, 60)) {
        const id = w.floodAreaID || (w.floodArea || {}).notation; if (!id || W.polys.has(id)) continue;
        try { const g = await fetch(`${EA}/id/floodAreas/${encodeURIComponent(id)}/polygon`).then(r => r.json()); const f = (g.features || [])[0]; if (f) W.polys.set(id, f.geometry); } catch (e) { /* that one's shape didn't come */ }
      }
    } catch (e) { W.err = "The Environment Agency's live feed didn't answer. Try again in a moment."; }
    W.busy = false; drawWarnings(); if (W.el) respond(ctx, W.el);
  }
  function drawWarnings() {
    const m = ctx.map; layers();
    m.getSource("res-warn").setData(FC((W.list || []).map(w => { const id = w.floodAreaID, g = W.polys.get(id); return g ? { type: "Feature", properties: { id, sev: w.severityLevel, c: SEV[w.severityLevel][1], n: w.description }, geometry: g } : null; }).filter(Boolean)));
  }
  function layers() {
    const m = ctx.map; if (m.getSource("res-warn")) return; const before = m.getLayer("poi-sym") ? "poi-sym" : undefined;
    m.addSource("res-warn", { type: "geojson", data: FC() }); m.addSource("res-fac", { type: "geojson", data: FC() });
    m.addLayer({ id: "res-warn-fill", type: "fill", source: "res-warn", paint: { "fill-color": ["get", "c"], "fill-opacity": 0.32 } }, before);
    m.addLayer({ id: "res-warn-line", type: "line", source: "res-warn", paint: { "line-color": ["get", "c"], "line-width": ["interpolate", ["linear"], ["zoom"], 6, 1, 12, 2.5] } }, before);
    m.addLayer({ id: "res-fac-pt", type: "circle", source: "res-fac", paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 9, 3, 15, 7], "circle-color": ["get", "c"], "circle-stroke-color": "#fff", "circle-stroke-width": 1.4 } });
    ctx.registerPick && ctx.registerPick({ id: "res-warn", layers: ["res-warn-fill", "res-warn-line"], pad: 2, priority: 29, hover: f => `<div class="poi-h"><b>${esc(SEV[f.properties.sev][0])}</b><div class="poi-sub">${esc(f.properties.n)} · click for what's inside</div></div>`, open: f => openWarning(f.properties.id) });
    ctx.registerPick && ctx.registerPick({ id: "res-fac", layers: ["res-fac-pt"], pad: 4, priority: 9, hover: f => `<div class="poi-h"><b>${esc(f.properties.n || FAC[f.properties.k][0])}</b><div class="poi-sub">${esc(FAC[f.properties.k][0])}</div></div>`, open: f => AtlasCard.open({ app: "Resilience", title: f.properties.n || FAC[f.properties.k][0], items: [{ k: FAC[f.properties.k][0], h: `<b>${esc(f.properties.n || FAC[f.properties.k][0])}</b>`, open: true, more: "<p>As mapped on OpenStreetMap; check with the service before relying on it.</p>" }], source: "OpenStreetMap", when: "" }) });
    m.on("styledata", () => { if (!m.getSource("res-warn")) { try { layers(); drawWarnings(); } catch (e) { /* next time */ } } });
  }
  function respond(c, el) {
    bind(c); W.el = el; loadWarnings(false);
    const L = W.list || [], n = k => L.filter(w => w.severityLevel === k).length;
    el.innerHTML = `<div class="nv"><p class="nv-story">${W.list ? `${n(1) ? `<b>${n(1)} severe flood warning${n(1) > 1 ? "s" : ""}</b>, ` : ""}<b>${n(2)}</b> flood warning${n(2) === 1 ? "" : "s"} and <b>${n(3)}</b> flood alert${n(3) === 1 ? "" : "s"} are in force in England now.` : W.busy ? "Reading the Environment Agency's live warnings…" : ""}</p></div>
      ${W.err ? `<p class="ap-note ap-keep">${esc(W.err)}</p>` : ""}
      <div class="tr-head"><div><span class="tr-k">Severe warnings</span><b>${n(1)}</b></div><div><span class="tr-k">Warnings</span><b>${n(2)}</b></div><div><span class="tr-k">Alerts</span><b>${n(3)}</b></div></div>
      <div class="ap-row"><button class="btn sm" data-resrefresh>Refresh now</button>${W.at ? `<small class="muted">Updated ${new Date(W.at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</small>` : ""}</div>
      <h4 class="ed-open">In force now</h4>${L.length ? `<table class="mo-tab res-wt"><thead><tr><th>Level</th><th>Area</th><th>County</th><th class="num">Raised</th></tr></thead><tbody>${L.map(w => `<tr class="clk" data-reswarn="${esc(w.floodAreaID)}"><td data-v="${4 - w.severityLevel}"><i class="sw" style="background:${SEV[w.severityLevel][1]}"></i>${esc(SEV[w.severityLevel][0])}</td><td>${esc(w.description)}</td><td>${esc((w.floodArea || {}).county || "")}</td><td class="num">${esc(String(w.timeRaised || "").slice(0, 16).replace("T", " "))}</td></tr>`).join("")}</tbody></table>` : `<p class="ap-note ap-keep">${W.list ? "No flood warnings or alerts are in force." : ""}</p>`}
      <h4 class="ed-open">What the authorities are saying</h4>${relSlot("flood warning", 5)}${offHTML("flood", "weather")}
      <p class="ap-note">Environment Agency real-time flood monitoring (OGL v3.0; "This uses Environment Agency flood and river level data from the real-time data API (Beta)"). England only: Wales (NRW), Scotland (SEPA) and Northern Ireland publish their own. Click a warning for what's inside it and a situation report.</p>`;
    fillRel(el);
  }
  // what's inside an area: homes and facilities (OpenStreetMap), people (estimated from the council's density)
  const FAC = { hospital: ["Hospital", "#c0392b"], care: ["Care home", "#8e44ad"], school: ["School or nursery", "#2b6cb0"], gp: ["GP surgery or clinic", "#16a085"], fire: ["Fire station", "#e67e22"], police: ["Police station", "#34495e"], pharmacy: ["Pharmacy", "#27ae60"], station: ["Railway station", "#1d5590"] };
  const PLUR = { hospital: "Hospitals", care: "Care homes", school: "Schools or nurseries", gp: "GP surgeries or clinics", fire: "Fire stations", police: "Police stations", pharmacy: "Pharmacies", station: "Railway stations" };
  const facOf = t => t.amenity === "hospital" ? "hospital" : t.amenity === "nursing_home" || /nursing_home|assisted_living|group_home/.test(t.social_facility || "") ? "care" : /^(school|kindergarten|college)$/.test(t.amenity || "") ? "school" : /^(doctors|clinic)$/.test(t.amenity || "") ? "gp" : t.amenity === "fire_station" ? "fire" : t.amenity === "police" ? "police" : t.amenity === "pharmacy" ? "pharmacy" : /^(station|halt)$/.test(t.railway || "") ? "station" : null;
  async function exposure(g) {
    const b = bboxOf(g), km2 = areaKm2(g), out = { km2, fac: {}, list: [], homes: null };
    const ctr = [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2], councils = ctx.allCodesAt("council").filter(c => ctx.P[c].pt).map(c => [c, Math.hypot(ctx.P[c].pt[0] - ctr[0], ctx.P[c].pt[1] - ctr[1])]).sort((a, b) => a[1] - b[1]).slice(0, 1).map(x => x[0]);
    out.council = councils[0]; const dens = out.council ? val("density", out.council) : null; out.people = dens ? dens * km2 : null;
    const V = vulnerability(); if (out.council) { out.old = V.raw.old[out.council]; out.bad = V.raw.health[out.council]; out.vul = V.idx[out.council]; }
    // Overpass inside the area itself (its largest parts, simplified), not its bounding box: flood alert areas can follow a
    // whole river valley. Homes are counted on the server ("out count"), so a big area doesn't download every building.
    const parts = ringsOf(g).map(p => p[0]).sort((a, b) => b.length - a.length).slice(0, 8).map(r => { const k = Math.max(1, Math.ceil(r.length / 120)); return r.filter((_, i) => i % k === 0); })
      .map(r => `poly:"${r.map(([x, y]) => `${y.toFixed(5)} ${x.toFixed(5)}`).join(" ")}"`);
    const each = (sel) => parts.map(p => sel.replace(/\$P/g, p)).join("");
    try {
      const OP = window.AtlasMove ? AtlasMove.overpass : null; if (!OP) throw new Error("no Overpass helper");
      const q = `[out:json][timeout:25];(${each('nwr["amenity"~"^(hospital|nursing_home|school|kindergarten|college|doctors|clinic|fire_station|police|pharmacy)$"]($P);nwr["social_facility"~"nursing_home|assisted_living|group_home"]($P);nwr["railway"~"^(station|halt)$"]($P);')});out center tags 600;(${each('way["building"~"^(house|residential|apartments|detached|semidetached_house|terrace|bungalow)$"]($P);')});out count;`;
      const j = await Promise.race([OP(q), new Promise((_, no) => setTimeout(() => no(new Error("slow")), 30000))]);
      (j.elements || []).forEach(x => { if (x.type === "count") { out.homes = +((x.tags || {}).total || 0); return; }
        const ll = x.center ? [x.center.lon, x.center.lat] : [x.lon, x.lat]; if (ll[0] == null || !inGeom(ll, g)) return; const t = x.tags || {}, k = facOf(t); if (!k) return; out.fac[k] = (out.fac[k] || 0) + 1; out.list.push({ k, n: t.name || "", ll }); });
    } catch (e) { out.err = "OpenStreetMap (Overpass) didn't answer in time, so homes and facilities aren't counted. Try the warning again in a minute."; }
    return out;
  }
  async function openWarning(id) {
    const w = (W.list || []).find(x => x.floodAreaID === id), g = W.polys.get(id); if (!w || !g) return;
    const b = bboxOf(g); ctx.map.fitBounds([[b[0], b[1]], [b[2], b[3]]], { padding: { top: 120, bottom: 80, left: 80, right: 480 }, duration: 900, maxZoom: 14 });
    const county = String((w.floodArea || {}).county || "").split(",")[0].trim(), river = (w.floodArea || {}).riverOrSea || "";
    const news = mergedReleases(["flood " + (river || county || w.description), ...(county ? ["flood " + county] : [])], 5).then(L => L.length ? L : releases("flood warning", 4));
    AtlasCard.open(Promise.all([exposure(g), news]).then(([x, L]) => { x.news = L; ctx.map.getSource("res-fac") && ctx.map.getSource("res-fac").setData(FC(x.list.map(f => ({ type: "Feature", properties: { k: f.k, n: f.n, c: FAC[f.k][1] }, geometry: { type: "Point", coordinates: f.ll } })))); return sitrep(w, x); }));
  }
  function sitrep(w, x) {
    const V = AtlasCard.viz, sev = SEV[w.severityLevel], facs = Object.entries(x.fac).sort((a, b) => b[1] - a[1]);
    return { app: "Resilience", title: `Situation report: ${w.description}`, figs: [{ v: sev[0], l: `raised ${String(w.timeRaised || "").slice(0, 16).replace("T", " ")}` }, { v: x.homes != null ? fmtInt(x.homes) : "—", l: "homes mapped inside" }, { v: x.people != null ? "≈ " + fmtInt(x.people) : "—", l: "people, at the council's density" }],
      items: [
        { k: `${sev[0]} · ${(w.floodArea || {}).county || ""}`, h: `<b>${esc(w.description)}</b>${(w.floodArea || {}).riverOrSea ? ` (${esc(w.floodArea.riverOrSea)})` : ""}`, viz: V.big(sev[0].replace("Flood ", ""), w.isTidal ? "tidal" : "river"), open: true,
          more: `<blockquote class="res-msg"><b>What the Environment Agency says</b>${w.timeMessageChanged ? ` <small>updated ${esc(String(w.timeMessageChanged).slice(0, 16).replace("T", " "))}</small>` : ""}<br>${esc(String(w.message || "No message with this warning.").replace(/\s+/g, " "))}</blockquote><p><a href="https://check-for-flooding.service.gov.uk/target-area/${encodeURIComponent(w.floodAreaID)}" target="_blank" rel="noopener">The warning on GOV.UK ↗</a> · <a href="https://www.gov.uk/sign-up-for-flood-warnings" target="_blank" rel="noopener">Sign up for warnings ↗</a> · Floodline 0345 988 1188</p>` },
        { k: "Latest releases", h: (x.news || []).length ? `<a href="${esc(x.news[0].u)}" target="_blank" rel="noopener">${esc(x.news[0].t)} ↗</a> <small class="muted">${esc(dmy(x.news[0].d))}</small>` : "No recent releases found", more: relHTML(x.news || []) + offHTML("weather") },
        { k: "Who is inside (estimated)", h: x.people != null ? `About <b>${fmtInt(x.people)}</b> people${x.old != null ? `, of whom about ${fmtInt(x.people * x.old / 100)} aged 65 or over` : ""}` : "Not estimated", viz: V.big(x.km2 < 10 ? x.km2.toFixed(1) : fmtInt(x.km2), "km²"),
          more: `<p>The area covers ${x.km2.toFixed(1)} km². People are estimated at the average density of ${esc(ctx.nameOf(x.council) || "the council")}; flood areas are often less built up than the council as a whole, so this can overstate. ${x.homes != null ? `OpenStreetMap shows ${fmtInt(x.homes)} homes inside (where buildings are mapped).` : ""}</p>${x.bad != null ? `<p>In ${esc(ctx.nameOf(x.council))}, ${pct(x.old)} of residents are 65 or over and ${pct(x.bad)} are in bad or very bad health; its vulnerability index is ${x.vul != null ? x.vul.toFixed(0) + " of 100" : "not known"}.</p>` : ""}` },
        { k: "Facilities inside the area", h: facs.length ? facs.map(([k, n]) => `${n} ${esc((n > 1 ? PLUR[k] : FAC[k][0]).toLowerCase())}`).join(", ") : x.err ? esc(x.err) : "None mapped inside", viz: V.bars(facs.map(([k, n]) => ({ v: n, c: FAC[k][1], n: FAC[k][0] }))),
          more: x.list.length ? `<table class="mo-tab"><thead><tr><th>Facility</th><th>Kind</th></tr></thead><tbody>${x.list.slice(0, 40).map(f => `<tr><td>${esc(f.n || "Unnamed")}</td><td>${esc(FAC[f.k][0])}</td></tr>`).join("")}</tbody></table>` : "" },
        { k: "What to do", h: "Check the Environment Agency's advice and your local resilience forum's plan", url: "https://check-for-flooding.service.gov.uk/", urlLabel: "Check for flooding",
          more: `<p><a href="https://www.gov.uk/guidance/local-resilience-forums-contact-details" target="_blank" rel="noopener">Local resilience forums: contacts ↗</a> · <a href="https://prepare.campaign.gov.uk/" target="_blank" rel="noopener">Prepare (GOV.UK) ↗</a></p>` },
        { k: "Where it comes from", h: "Environment Agency real-time flood monitoring; OpenStreetMap; ONS and Atlas for people", url: `https://check-for-flooding.service.gov.uk/target-area/${encodeURIComponent(w.floodAreaID)}`, urlLabel: "This warning" }],
      source: "Environment Agency (live)", when: new Date().toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) };
  }

  // ---------- Understand: past floods and disease ----------
  const U = { cache: new Map() };
  async function ukhsa(path, n) {
    if (U.cache.has(path)) return U.cache.get(path);
    const j = await fetch(`${UKHSA}/${path}?page_size=${n || 365}`).then(r => { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); });
    let rows = j.results || []; if (j.count > rows.length) { const last = Math.ceil(j.count / (n || 365)); const k = await fetch(`${UKHSA}/${path}?page_size=${n || 365}&page=${last}`).then(r => r.json()).catch(() => null); if (k && k.results) rows = rows.concat(k.results); }
    const pts = rows.filter(r => r.metric_value != null).map(r => [new Date(r.date).getTime(), r.metric_value, r.date]).sort((a, b) => a[0] - b[0]); U.cache.set(path, pts); return pts;
  }
  function understand(c, el) {
    bind(c); U.el = el; const code = ctx.focused && ctx.P[ctx.focused] && ctx.P[ctx.focused].level === "council" ? ctx.focused : null, E = window.AtlasEnv, ev = E && E.D.floods ? E.D.floods.events : null;
    const byYear = {}; (ev || []).forEach(e => { const y = +String(e.d).slice(0, 4); if (y >= 1946) byYear[y] = (byYear[y] || 0) + 1; });
    const pts = Object.keys(byYear).map(y => [+y, byYear[y]]);
    el.innerHTML = `<div class="nv"><p class="nv-story">What has happened before, and what is circulating now${code ? ` in ${esc(ctx.nameOf(code))}` : ""}.</p></div>
      <h4 class="ed-open">Recorded floods, year by year</h4>${pts.length ? `<div class="pc-chart">${ctx.CH.bars([{ name: "Recorded floods", colour: "#1f6fb4", pts }], { w: 420, h: 160 })}</div><p class="ap-note ap-keep">England and Wales, from the flood outlines in Atlas Environment.</p>` : `<p class="ap-note ap-keep">Loading the flood record…</p>`}
      <h4>Disease: COVID-19${code ? ` in ${esc(ctx.nameOf(code))}` : " (choose a council)"}</h4><div data-resdis="covid">${code ? "<p class='ap-note ap-keep'>Asking UKHSA…</p>" : ""}</div>
      <h4>Disease: flu and measles in England</h4><div data-resdis="eng"><p class="ap-note ap-keep">Asking UKHSA…</p></div>
      <h4 class="ed-open">What UKHSA is saying</h4>${relSlot("measles OR flu OR COVID-19 OR outbreak", 6)}${offHTML("disease", "weather")}
      <p class="ap-note">UKHSA data dashboard API (OGL v3.0). Measles and flu are published for England and its regions, not councils; COVID-19 deaths by week come from ONS death registrations.</p>`;
    fillRel(el);
    if (!pts.length && E) E.load("floods").then(() => understand(c, el)).catch(() => {});
    const put = (k, h) => { const x = el.querySelector(`[data-resdis="${k}"]`); if (x) x.innerHTML = h; };
    const line = (s, f) => s.length ? `<div class="pc-chart">${ctx.CH.line([{ name: f, colour: "#c0392b", pts: s.map(p => [new Date(p[2]).getFullYear() + new Date(p[2]).getMonth() / 12 + new Date(p[2]).getDate() / 365, p[1]]) }], { w: 420, h: 160 })}</div>` : "<p class='ap-note ap-keep'>No figures.</p>";
    if (code) ukhsa(`respiratory/topics/COVID-19/geography_types/Lower%20Tier%20Local%20Authority/geographies/${encodeURIComponent(ctx.nameOf(code))}/metrics/COVID-19_deaths_ONSByWeek`).then(s => put("covid", `${line(s, "Deaths a week")}<p class="ap-note ap-keep">${s.length ? `${fmtInt(s.reduce((a, p) => a + p[1], 0))} deaths with COVID-19 on the certificate since ${s[0][2].slice(0, 4)}; the latest week: ${s[s.length - 1][1]} (${s[s.length - 1][2]}).` : ""}</p>`)).catch(() => put("covid", "<p class='ap-note ap-keep'>UKHSA didn't answer for this council (names must match UKHSA's).</p>"));
    Promise.all([ukhsa("respiratory/topics/Influenza/geography_types/Nation/geographies/England/metrics/influenza_testing_positivityByWeek", 200).catch(() => []), ukhsa("vaccine_preventable/topics/Measles/geography_types/Nation/geographies/England/metrics/measles_cases_casesByOnsetWeek", 200).catch(() => [])])
      .then(([flu, mea]) => put("eng", `<p class="ap-note ap-keep">Flu: share of tests positive, by week${flu.length ? ` (latest ${flu[flu.length - 1][1]}%)` : ""}</p>${line(flu.slice(-104), "Flu positivity (%)")}<p class="ap-note ap-keep">Measles: cases by week of onset${mea.length ? ` (${fmtInt(mea.slice(-52).reduce((a, p) => a + p[1], 0))} in the last year)` : ""}</p>${line(mea.slice(-156), "Measles cases a week")}`));
  }

  // ---------- Near me (public) ----------
  const NM = { place: null };
  function nearme(c, el) {
    bind(c); NM.el = el; loadWarnings(false); const p = NM.place;
    let near = []; if (p && W.list) near = W.list.map(w => { const g = W.polys.get(w.floodAreaID); if (!g) return null; const b = bboxOf(g), cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2, d = Math.hypot((cx - p.lon) * 111 * Math.cos(p.lat * Math.PI / 180), (cy - p.lat) * 111); return { w, d, inside: inGeom([p.lon, p.lat], g) }; }).filter(x => x && (x.inside || x.d <= 15)).sort((a, b) => (b.inside - a.inside) || a.d - b.d);
    const hist = p && window.AtlasEnv && AtlasEnv.floodsNear ? AtlasEnv.floodsNear(p.lon, p.lat, 2) : null;
    el.innerHTML = `<p class="ap-note ap-keep">Is there a flood warning near you, and has it flooded nearby before?</p>
      <div class="tr-pl"><span class="tr-dot from"></span><input data-resq placeholder="A town, postcode or address" value="${esc((p || {}).label || "")}" autocomplete="off"><button class="btn sm" data-resgoq>Check</button></div>
      ${p ? `<div class="nv"><p class="nv-story">${near.some(x => x.inside) ? `<b>${esc(p.label)} is inside a ${esc(SEV[near.find(x => x.inside).w.severityLevel][0].toLowerCase())} area now.</b>` : near.length ? `No warning covers ${esc(p.label)}, but ${near.length} ${near.length === 1 ? "is" : "are"} in force within 15 km.` : `No flood warnings or alerts are in force within 15 km of ${esc(p.label)}.`}${hist ? ` ${hist.n ? `${hist.n} flood${hist.n === 1 ? " has" : "s have"} been recorded within 2 km${hist.last ? `, the latest in ${hist.last}` : ""}.` : "No floods are recorded within 2 km."}` : ""}</p></div>
        ${near.length ? `<table class="mo-tab"><thead><tr><th>Warning</th><th>Area</th><th class="num">km</th></tr></thead><tbody>${near.map(x => `<tr class="clk" data-reswarn="${esc(x.w.floodAreaID)}"><td><i class="sw" style="background:${SEV[x.w.severityLevel][1]}"></i>${esc(SEV[x.w.severityLevel][0])}</td><td>${esc(x.w.description)}</td><td class="num" data-v="${x.d}">${x.inside ? "here" : x.d.toFixed(1)}</td></tr>`).join("")}</tbody></table>` : ""}` : ""}
      ${near.length ? `<h4 class="ed-open">What the Environment Agency says</h4>${near.slice(0, 3).map(x => `<blockquote class="res-msg"><b>${esc(x.w.description)}</b><br>${esc(String(x.w.message || "No message with this warning.").replace(/\s+/g, " ").slice(0, 600))}<br><a href="https://check-for-flooding.service.gov.uk/target-area/${encodeURIComponent(x.w.floodAreaID)}" target="_blank" rel="noopener">Read it on GOV.UK ↗</a></blockquote>`).join("")}` : ""}
      ${p ? `<h4>Latest releases</h4>${relSlot("flood " + p.label, 4)}` : ""}
      <h4 class="ed-open">How to prepare</h4><ul class="res-links" data-nosort><li><a href="https://www.gov.uk/sign-up-for-flood-warnings" target="_blank" rel="noopener">Sign up for flood warnings (free) ↗</a></li><li><a href="https://check-long-term-flood-risk.service.gov.uk/" target="_blank" rel="noopener">Check your long-term flood risk ↗</a></li><li><a href="https://prepare.campaign.gov.uk/" target="_blank" rel="noopener">Prepare for emergencies (GOV.UK) ↗</a></li><li><a href="https://www.metoffice.gov.uk/weather/warnings-and-advice/uk-warnings" target="_blank" rel="noopener">Met Office weather warnings ↗</a></li></ul>
      <p class="ap-note">Live warnings: Environment Agency (England). Flood history: recorded flood outlines (England and Wales). In an emergency call 999.</p>`;
    fillRel(el);
  }
  async function findPlace(q) {
    const own = ctx.searchNames(q.toLowerCase()).filter(c => ctx.P[c].pt)[0]; if (own) return { label: ctx.nameOf(own), lon: ctx.P[own].pt[0], lat: ctx.P[own].pt[1] };
    try { const r = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=1&lang=en&countrycode=GB`).then(r => r.json()); const f = (r.features || [])[0]; if (f) return { label: f.properties.name || q, lon: f.geometry.coordinates[0], lat: f.geometry.coordinates[1] }; } catch (e) { /* no answer */ }
    return null;
  }

  // ---------- wiring ----------
  function bind(c) {
    if (ctx) return; ctx = c; defineMetrics();
    const go = () => { try { layers(); drawWarnings(); applyHaz(); } catch (e) { ctx.map.once("idle", go); } }; go();
    setInterval(() => { if (!document.hidden) loadWarnings(false); }, 15 * 60e3);
    document.addEventListener("change", e => { const t = e.target.closest && e.target.closest("[data-reshaz]"); if (t) { HAZ[t.dataset.reshaz] = t.checked; applyHaz(); } });
    document.addEventListener("click", async e => {
      const t = e.target.closest && e.target.closest("[data-resmap],[data-resgo],[data-reswarn],[data-resrefresh],[data-resgoq]"); if (!t) return; const d = t.dataset;
      if (d.resmap) { if (ctx.M[d.resmap]) { ctx.setLevel("council"); ctx.mapOnly([d.resmap]); } }
      else if (d.resgo) ctx.focus(d.resgo);
      else if (d.reswarn) openWarning(d.reswarn);
      else if (t.hasAttribute("data-resrefresh")) loadWarnings(true);
      else if (t.hasAttribute("data-resgoq")) { const q = (t.parentNode.querySelector("[data-resq]") || {}).value || ""; if (!q.trim()) return; NM.place = await findPlace(q.trim()); if (NM.place) ctx.map.flyTo({ center: [NM.place.lon, NM.place.lat], zoom: 11, duration: 900 }); if (NM.el) nearme(ctx, NM.el); }
    });
    document.addEventListener("keydown", e => { const q = e.target.closest && e.target.closest("[data-resq]"); if (q && e.key === "Enter") { e.preventDefault(); q.parentNode.querySelector("[data-resgoq]").click(); } });
  }
  // a card item for other views' cards (Environment's floods and coast, rivers): any live warning here, the latest
  // releases (filled once the card is on screen, with fill()) and the official warning services
  function authItem(q, at, kinds) {
    const here = at && W.list ? W.list.filter(w => { const g = W.polys.get(w.floodAreaID); return g && inGeom([at.lng, at.lat], g); }) : [];
    return { k: "What the authorities are saying", h: here.length ? `<b>${esc(SEV[here[0].severityLevel][0])} in force here now:</b> ${esc(here[0].description)}` : "Latest releases and official warnings",
      more: `${here.map(w => `<blockquote class="res-msg"><b>What the Environment Agency says</b><br>${esc(String(w.message || "").replace(/\s+/g, " ").slice(0, 600))}<br><a href="https://check-for-flooding.service.gov.uk/target-area/${encodeURIComponent(w.floodAreaID)}" target="_blank" rel="noopener">The warning on GOV.UK ↗</a></blockquote>`).join("")}${relSlot(q, 4)}${offHTML(...(kinds || ["flood", "weather"]))}` };
  }
  window.AtlasResilience = { vulnerability: () => vulnerability(), releases, OFFICIAL, authItem, fill: root => fillRel(root || document), get W() { return W; }, exposure, sitrep, openWarning, loadWarnings };
  window.AtlasApps && AtlasApps.register({
    id: "resilience", name: "Atlas Resilience", perspective: "resilience", accent: "#b45309", dataNeeds: [], rivers: true,
    blurb: "Planning for, responding to and understanding emergencies: floods, coast, heat, wildfire, air and disease",
    onBoot(ctx) { bind(ctx); },
    init(ctx) { bind(ctx); ctx.setLevel("council"); ctx.mapOnly(["res_vuln"]); ctx.openPanel("respond"); },
    panels: [
      { id: "prepare", title: "Prepare", map: { level: "council", metrics: ["res_vuln"] }, blurb: "Hazards over who is most vulnerable", live: true, render: prepare, min: { w: 440, h: 420 },
        menu: (c, B) => ({ sections: [B.group("Vulnerability", "resilience", { label: "Vulnerability" }), B.group("Vulnerability: the parts", "resilience", { label: "Its parts" }), B.group("Air quality", "environment", { label: "Air pollution" }), { label: "The full panel", items: [B.panel("prepare", "Open Prepare", "Hazards and vulnerability")] }].filter(Boolean) }) },
      { id: "respond", title: "Respond", menu: false, blurb: "Live flood warnings and what's inside them", live: true, render: respond, min: { w: 460, h: 420 } },
      { id: "understand", title: "Understand", menu: false, blurb: "Past floods and disease now", live: true, render: understand, min: { w: 460, h: 420 } },
      { id: "nearme", title: "Near me", menu: false, blurb: "Is there a warning near you?", render: nearme, min: { w: 400, h: 380 } },
    ],
    tools: [],
  });
})();
