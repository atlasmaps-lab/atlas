/* Atlas Environment (0.9.1): zones where the environment is changing, on a timeline from the past into official
 * projections. Its own layers on the map (not the area boundaries or metrics): recorded floods, coastal erosion
 * forecasts, hot summer days, wildfire burnt areas, and National Parks and Ramsar wetlands by the year they were
 * designated. Data: data/envzones/*.js (pipeline/build_envzones.py), each loaded the first time it is needed.
 * Talks to the core only through ctx (ctx.map for its own layers, as Atlas Transport does).
 */
(function () {
  "use strict";
  const V = "1200", P = "env-";
  const FILE = { floods: "floods", coast: "coast", heat: "heat", cons: "conservation", fire: "fire" };
  const D = {}, WAIT = {};
  const SRC_COL = { river: "#1f6fb4", sea: "#11888f", surface: "#7b4fa6", ground: "#8a6a3b", other: "#6b7480" };
  const SRC_NAME = { river: "River", sea: "Sea", surface: "Surface water and drains", ground: "Groundwater", other: "Other or unknown" };
  const NAT = { E: "England", W: "Wales", S: "Scotland", NI: "Northern Ireland" };
  const HEAT_RAMP = [0, "rgba(255,240,200,0)", 0.5, "#fff1c1", 2, "#fdd17f", 5, "#f99d4b", 10, "#e8592b", 20, "#b8202b", 40, "#6b0f2a"];
  const S = { mine: null, year: null, fut: null, heat: "b01", heatPicked: false, on: window.ATLAS_LEGACY_OPEN ? { floods: true, coast: true, heat: false, cons: true, fire: true } : { floods: false, coast: false, heat: false, cons: false, fire: false }, playing: null };
  let CTX = null, TODAY_Y = 2026, ELS = {};

  // ---------- data: each theme loads once, when first needed ----------
  window.ATLAS_ENVZ_LOADED = (theme, data) => {
    const key = Object.keys(FILE).find(k => FILE[k] === theme); if (!key) return;
    if (data.packed) data.features = data.features.map(unpack);
    D[key] = data; (WAIT[key] || []).forEach(f => f(data)); delete WAIT[key];
  };
  function unpack([props, polys]) {
    const rings = polys.map(poly => poly.map(flat => { const out = []; let x = 0, y = 0; for (let i = 0; i < flat.length; i += 2) { x += flat[i]; y += flat[i + 1]; out.push([x / 1e4, y / 1e4]); } return out; }));
    return { type: "Feature", properties: props, geometry: rings.length === 1 ? { type: "Polygon", coordinates: rings[0] } : { type: "MultiPolygon", coordinates: rings } };
  }
  // 0.12: the detailed tier (about 5 m), loaded 0.25-degree square by square when zoomed in (pipeline/build_envzones_detail.py)
  const DET = { floods: new Map(), coast: new Map(), cons: new Map() }, DETZ = { floods: 11, coast: 12, cons: 10 }, detLoading = new Set();
  let DIDX = null;
  const unpack5 = ([props, polys]) => { const rings = polys.map(poly => poly.map(flat => { const out = []; let x = 0, y = 0; for (let i = 0; i < flat.length; i += 2) { x += flat[i]; y += flat[i + 1]; out.push([x / 1e5, y / 1e5]); } return out; })); return { type: "Feature", properties: props, geometry: rings.length === 1 ? { type: "Polygon", coordinates: rings[0] } : { type: "MultiPolygon", coordinates: rings } }; };
  const detQ = {};   // squares arrive in bursts: redraw each theme once per burst
  window.ATLAS_ENVZ_DETAIL = (theme, key, data) => { DET[theme].set(key, data.features.map(unpack5)); detLoading.delete(theme + key); clearTimeout(detQ[theme]);
    detQ[theme] = setTimeout(() => { const m = CTX && CTX.map, src = m && m.getSource(P + theme + "-hi"); if (src) src.setData({ type: "FeatureCollection", features: [...DET[theme].values()].flat() }); }, 150); };
  function detailInView() {
    const m = CTX && CTX.map; if (!m) return;
    if (!DIDX) { if (window.ATLAS_ENVZ_DETAIL_INDEX) DIDX = window.ATLAS_ENVZ_DETAIL_INDEX; else { if (!detLoading.has("idx")) { detLoading.add("idx"); const s = document.createElement("script"); s.src = `data/envzones/detail/index.js?v=${V}`; s.onload = () => { DIDX = window.ATLAS_ENVZ_DETAIL_INDEX; detailInView(); }; document.head.appendChild(s); } return; } }
    const b = m.getBounds(), z = m.getZoom(), q = DIDX.q;
    Object.keys(DET).forEach(theme => {
      if (!S.on[theme] || z < DETZ[theme] || !m.getSource(P + theme + "-hi")) return;
      (DIDX.themes[theme] || []).filter(t => t[1] + q >= b.getWest() && t[1] <= b.getEast() && t[2] + q >= b.getSouth() && t[2] <= b.getNorth()).slice(0, 24).forEach(t => {
        if (DET[theme].has(t[0]) || detLoading.has(theme + t[0])) return; detLoading.add(theme + t[0]);
        const s = document.createElement("script"); s.src = `data/envzones/detail/${theme}_${t[0]}.js?v=${V}`; s.onerror = () => detLoading.delete(theme + t[0]); document.head.appendChild(s); });
    });
  }
  function load(key) {
    if (D[key]) return Promise.resolve(D[key]);
    return new Promise((res, rej) => {
      const first = !WAIT[key]; (WAIT[key] = WAIT[key] || []).push(res);
      if (!first) return;
      const s = document.createElement("script"); s.src = `data/envzones/${FILE[key]}.js?v=${V}`;
      s.onerror = () => { delete WAIT[key]; rej(new Error(`data/envzones/${FILE[key]}.js is missing: run python3 pipeline/build_envzones.py`)); };
      document.head.appendChild(s);
    });
  }
  const ringsOf = g => g.type === "Polygon" ? [g.coordinates[0]] : g.coordinates.map(p => p[0]);
  function bboxOf(g) { let b = [180, 90, -180, -90]; ringsOf(g).forEach(r => r.forEach(([x, y]) => { b = [Math.min(b[0], x), Math.min(b[1], y), Math.max(b[2], x), Math.max(b[3], y)]; })); return b; }
  function centre(g) { const b = bboxOf(g); return [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2]; }

  // ---------- where we are on the timeline ----------
  const Y = () => S.fut ? TODAY_Y : S.year;                     // the year past layers show up to
  const heatIdx = () => { const st = D.heat ? D.heat.steps.map(s => s[0]) : ["b81", "b01"]; const k = S.heatPicked ? S.heat : (S.fut ? "g20" : S.year <= 2000 ? "b81" : "b01"); return Math.max(0, st.indexOf(k)); };
  const heatKey = () => (D.heat ? D.heat.steps[heatIdx()] : ["b01", "2001–2020"]);
  const fmt = n => n == null ? "–" : n.toLocaleString("en-GB", { maximumFractionDigits: n < 10 ? 1 : 0 });

  // ---------- the map ----------
  function before(m) { const l = (m.getStyle().layers || []).find(x => x.type === "symbol"); return m.getLayer("poi-sym") ? "poi-sym" : l && l.id; }
  function ensure(key) {
    const m = CTX && CTX.map; if (!m || !D[key] || m.getSource(P + key)) return;
    const b = before(m);
    if (key === "floods") {
      const pts = D.floods.features.map(f => ({ type: "Feature", properties: f.properties, geometry: { type: "Point", coordinates: centre(f.geometry) } }));
      const ha = {}; D.floods.events.forEach(e => { ha[e.id] = e.ha; }); pts.forEach(p => { p.properties.ha = ha[p.properties.ev] || 1; });
      m.addSource(P + "floods", { type: "geojson", data: { type: "FeatureCollection", features: D.floods.features } });
      m.addSource(P + "floods-pt", { type: "geojson", data: { type: "FeatureCollection", features: pts } });
      m.addLayer({ id: P + "floods-heat", type: "heatmap", source: P + "floods-pt", maxzoom: 11, paint: {
        "heatmap-weight": ["interpolate", ["linear"], ["ln", ["+", 1, ["get", "ha"]]], 0, 0.15, 8, 1],
        "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 5, 0.6, 10, 1.4],
        "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 5, 6, 8, 14, 11, 22],
        "heatmap-color": ["interpolate", ["linear"], ["heatmap-density"], 0, "rgba(31,111,180,0)", 0.2, "rgba(120,180,230,.55)", 0.45, "rgba(31,111,180,.75)", 0.7, "rgba(18,60,140,.85)", 1, "rgba(10,25,80,.92)"],
        "heatmap-opacity": ["interpolate", ["linear"], ["zoom"], 8.5, 0.9, 11, 0] } }, b);
      m.addLayer({ id: P + "floods-fill", type: "fill", source: P + "floods", minzoom: 8, paint: { "fill-color": ["match", ["get", "s"], "river", SRC_COL.river, "sea", SRC_COL.sea, "surface", SRC_COL.surface, "ground", SRC_COL.ground, SRC_COL.other], "fill-opacity": 0.55 } }, b);
      m.addLayer({ id: P + "floods-line", type: "line", source: P + "floods", minzoom: 10, maxzoom: 11, paint: { "line-color": "#0b3d6e", "line-width": 0.6, "line-opacity": 0.6 } }, b);
      m.setLayerZoomRange(P + "floods-fill", 8, 11);
      m.addSource(P + "floods-hi", { type: "geojson", data: { type: "FeatureCollection", features: [...DET.floods.values()].flat() } });
      m.addLayer({ id: P + "floods-hi-fill", type: "fill", source: P + "floods-hi", minzoom: 11, paint: { "fill-color": ["match", ["get", "s"], "river", SRC_COL.river, "sea", SRC_COL.sea, "surface", SRC_COL.surface, "ground", SRC_COL.ground, SRC_COL.other], "fill-opacity": 0.5 } }, b);
      m.addLayer({ id: P + "floods-hi-line", type: "line", source: P + "floods-hi", minzoom: 11, paint: { "line-color": "#0b3d6e", "line-width": 0.7, "line-opacity": 0.55 } }, b);
    }
    if (key === "coast") {
      m.addSource(P + "coast", { type: "geojson", data: { type: "FeatureCollection", features: D.coast.features } });
      m.addLayer({ id: P + "coast-fill", type: "fill", source: P + "coast", paint: { "fill-color": ["case", ["==", ["get", "e"], 2055], "#c0392b", "#f08a5d"], "fill-opacity": 0.6 } }, b);
      m.addLayer({ id: P + "coast-line", type: "line", source: P + "coast", maxzoom: 12, paint: { "line-color": ["case", ["==", ["get", "e"], 2055], "#8e1f14", "#c0392b"], "line-width": ["interpolate", ["linear"], ["zoom"], 5, 2.5, 10, 1.2], "line-opacity": 0.9 } }, b);
      m.setLayerZoomRange(P + "coast-fill", 0, 12);
      m.addSource(P + "coast-hi", { type: "geojson", data: { type: "FeatureCollection", features: [...DET.coast.values()].flat() } });
      m.addLayer({ id: P + "coast-hi-fill", type: "fill", source: P + "coast-hi", minzoom: 12, paint: { "fill-color": ["case", ["==", ["get", "e"], 2055], "#c0392b", "#f08a5d"], "fill-opacity": 0.6 } }, b);
      m.addLayer({ id: P + "coast-hi-line", type: "line", source: P + "coast-hi", minzoom: 12, paint: { "line-color": ["case", ["==", ["get", "e"], 2055], "#8e1f14", "#c0392b"], "line-width": 1, "line-opacity": 0.9 } }, b);
    }
    if (key === "heat") {
      m.addSource(P + "heat", { type: "geojson", data: { type: "FeatureCollection", features: D.heat.features } });
      m.addLayer({ id: P + "heat-fill", type: "fill", source: P + "heat", paint: { "fill-color": ["interpolate", ["linear"], ["coalesce", ["at", 0, ["get", "v"]], 0], ...HEAT_RAMP], "fill-opacity": 0.62, "fill-antialias": false } }, m.getLayer(P + "floods-heat") ? P + "floods-heat" : b);
    }
    if (key === "cons") {
      m.addSource(P + "cons", { type: "geojson", data: { type: "FeatureCollection", features: D.cons.features } });
      m.addLayer({ id: P + "cons-fill", type: "fill", source: P + "cons", paint: { "fill-color": ["case", ["==", ["get", "k"], "np"], "#4f772d", "#2a9d8f"], "fill-opacity": ["case", ["==", ["get", "k"], "np"], 0.16, 0.3] } }, b);
      m.setLayerZoomRange(P + "cons-fill", 0, 10);
      m.addSource(P + "cons-hi", { type: "geojson", data: { type: "FeatureCollection", features: [...DET.cons.values()].flat() } });
      m.addLayer({ id: P + "cons-hi-fill", type: "fill", source: P + "cons-hi", minzoom: 10, paint: { "fill-color": ["case", ["==", ["get", "k"], "np"], "#4f772d", "#2a9d8f"], "fill-opacity": ["case", ["==", ["get", "k"], "np"], 0.16, 0.3] } }, b);
      m.addLayer({ id: P + "cons-hi-line", type: "line", source: P + "cons-hi", minzoom: 10, paint: { "line-color": ["case", ["==", ["get", "k"], "np"], "#31572c", "#1d6f66"], "line-width": ["case", ["==", ["get", "k"], "np"], 1.8, 1] } }, b);
      m.addLayer({ id: P + "cons-line", type: "line", source: P + "cons", maxzoom: 10, paint: { "line-color": ["case", ["==", ["get", "k"], "np"], "#31572c", "#1d6f66"], "line-width": ["case", ["==", ["get", "k"], "np"], 1.8, 1], "line-dasharray": ["case", ["==", ["get", "y"], null], ["literal", [2, 1.5]], ["literal", [1, 0]]] } }, b);
    }
    if (key === "fire") {
      m.addSource(P + "fire", { type: "geojson", data: { type: "FeatureCollection", features: D.fire.features } });
      m.addLayer({ id: P + "fire-fill", type: "fill", source: P + "fire", paint: { "fill-color": "#e85d04", "fill-opacity": 0.75 } }, b);
      m.addLayer({ id: P + "fire-pt", type: "circle", source: P + "fire", maxzoom: 9, paint: { "circle-radius": 4, "circle-color": "#e85d04", "circle-stroke-color": "#fff", "circle-stroke-width": 1 } }, b);
    }
    bindClicks(key);
  }
  const LAYERS = { floods: ["floods-heat", "floods-fill", "floods-line", "floods-hi-fill", "floods-hi-line"], coast: ["coast-fill", "coast-line", "coast-hi-fill", "coast-hi-line"], heat: ["heat-fill"], cons: ["cons-fill", "cons-line", "cons-hi-fill", "cons-hi-line"], fire: ["fire-fill", "fire-pt"] };
  function shown(key) { return S.on[key] && (key === "coast" ? (!!S.fut || S.year >= TODAY_Y) : key === "fire" ? Y() >= 2026 : true); }   // coast: today ("under threat") and the future
  function apply() {
    const m = CTX && CTX.map; if (!m) return;
    Object.keys(LAYERS).forEach(key => {
      if (S.on[key] && !D[key]) { load(key).then(() => { ensure(key); apply(); renderAll(); }).catch(e => CTX.toast(e.message)); return; }
      if (!D[key]) return; ensure(key);
      LAYERS[key].forEach(id => m.getLayer(P + id) && m.setLayoutProperty(P + id, "visibility", shown(key) ? "visible" : "none"));
    });
    const y = Y();
    const past = ["<=", ["get", "y"], y];
    ["floods-heat", "floods-fill", "floods-line", "floods-hi-fill", "floods-hi-line"].forEach(id => m.getLayer(P + id) && m.setFilter(P + id, past));
    ["floods-fill", "floods-hi-fill"].forEach(id => m.getLayer(P + id) && m.setPaintProperty(P + id, "fill-opacity", ["interpolate", ["linear"], ["-", y, ["get", "y"]], 0, 0.8, 5, 0.55, 25, 0.3]));
    ["coast-fill", "coast-line", "coast-hi-fill", "coast-hi-line"].forEach(id => m.getLayer(P + id) && m.setFilter(P + id, ["<=", ["get", "e"], S.fut || 2105]));   // today: every stretch under threat
    if (m.getLayer(P + "heat-fill")) m.setPaintProperty(P + "heat-fill", "fill-color", ["interpolate", ["linear"], ["coalesce", ["at", heatIdx(), ["get", "v"]], 0], ...HEAT_RAMP]);
    const cons = ["any", ["==", ["get", "y"], null], ["<=", ["get", "y"], y]];
    ["cons-fill", "cons-line", "cons-hi-fill", "cons-hi-line"].forEach(id => m.getLayer(P + id) && m.setFilter(P + id, cons));
    detailInView();
    if (window.AtlasShape) AtlasShape.refresh();   // a shape on the map follows the timeline
  }
  // 0.12: zones open a card (not a popup) through the core's click registry, so a click on a zone never also focuses the
  // area under it. Each card says what matters about what you clicked.
  let bound = {};
  const PICK = { floods: [P + "floods-fill", P + "floods-line", P + "floods-hi-fill"], coast: [P + "coast-fill", P + "coast-line", P + "coast-hi-fill"], heat: [P + "heat-fill"], cons: [P + "cons-fill", P + "cons-line", P + "cons-hi-fill"], fire: [P + "fire-fill", P + "fire-pt"] };
  const PRIO = { fire: 31, coast: 32, floods: 33, cons: 35, heat: 38 };
  function bindClicks(key) {
    if (bound[key] || !CTX.registerPick) return; bound[key] = true;
    CTX.registerPick({ id: "env-" + key, layers: PICK[key], pad: 2, priority: PRIO[key], hover: f => hoverHTML(key, f), open: (f, e) => card(key, f, e.lngLat) });
  }
  const SMP = { "hold the line": "Defences are kept where they are: the coast is held, at a cost, and the forecast assumes they're maintained.", "managed realignment": "The coastline is allowed to move back in a planned way, often creating new marsh or beach, with defences set further inland.", "no active intervention": "No new defences are planned: the coast is left to erode naturally.", "advance the line": "New defences are built seaward of the present line." };
  const smpSay = pol => { const k = String(pol || "").toLowerCase(); const hit = Object.keys(SMP).find(x => k.includes(x)); return hit ? SMP[hit] : ""; };
  function hoverHTML(key, f) {
    const p = f.properties, e = CTX.esc;
    if (key === "floods") { const ev = (D.floods.events || []).find(x => x.id === p.ev) || {}; return `<div class="poi-h"><b>${e(ev.n || "Recorded flood")}</b><div class="poi-sub">${e(String(ev.d || p.y || "").slice(0, 4))} · ${e(SRC_NAME[p.s] || "")} · click for more</div></div>`; }
    if (key === "coast") return `<div class="poi-h"><b>Coastal erosion by ${p.e}</b><div class="poi-sub">${typeof p.d === "number" ? `up to ${fmt(p.d)} m lost` : e(p.d || "")} · click for more</div></div>`;
    if (key === "cons") return `<div class="poi-h"><b>${e(p.n)}</b><div class="poi-sub">${p.k === "np" ? "National Park" : "Ramsar wetland"} · click for more</div></div>`;
    if (key === "fire") return `<div class="poi-h"><b>Wildfire burnt area</b><div class="poi-sub">${e(longDate(p.d))} · click for more</div></div>`;
    return "";
  }
  const kmBetween = (a, b) => { const R = 6371, t = Math.PI / 180, dl = (b[1] - a[1]) * t, dg = (b[0] - a[0]) * t, x = Math.sin(dl / 2) ** 2 + Math.cos(a[1] * t) * Math.cos(b[1] * t) * Math.sin(dg / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); };
  let FCEN = null;
  function floodsNear(lon, lat, km) { // events with an outline within km of a point (centres of outlines), newest first
    if (!D.floods) return null; if (!FCEN) FCEN = D.floods.features.map(f => [centre(f.geometry), f.properties.ev]);
    const ids = new Set(FCEN.filter(([c]) => kmBetween(c, [lon, lat]) <= km).map(x => x[1])), byId = new Map((D.floods.events || []).map(x => [x.id, x]));
    const list = [...ids].map(id => byId.get(id)).filter(Boolean).map(x => ({ n: x.n || "Recorded flood", y: String(x.d || "").slice(0, 4), ha: x.ha, d: x.d })).sort((a, b) => String(b.d).localeCompare(String(a.d)));
    return { n: list.length, last: list[0] ? list[0].y : null, list };
  }
  function card(key, f, at) {
    if (!window.AtlasCard) return; const p = f.properties, e = CTX.esc, V = AtlasCard.viz; let spec;
    if (key === "floods") {
      const ev = (D.floods.events || []).find(x => x.id === p.ev) || {}, near = floodsNear(at.lng, at.lat, 3), others = near ? near.list.filter(x => x.n !== ev.n) : [];
      spec = { title: ev.n || "Recorded flood", shape: "flood:" + p.ev, figs: [{ v: String(ev.d || p.y || "").slice(0, 4), l: longDate(ev.d) }, { v: fmt(ev.ha) + " ha", l: "flooded" }, { v: SRC_NAME[p.s] || "—", l: "source of the water" }], items: [
        { k: `Recorded flood · ${NAT[ev.nat] || ""}`, h: `${e(SRC_NAME[p.s] || "Water")} flooding on ${e(longDate(ev.d))}, about <b>${fmt(ev.ha)} ha</b>`, viz: V.big(fmt(ev.ha), "hectares"), open: true,
          more: `<p>${p.s === "river" ? "A river burst its banks onto the land beside it." : p.s === "sea" ? "The sea came over or through the defences, usually in a storm surge at high tide." : p.s === "surface" ? "Heavy rain that couldn't drain away fast enough, from roads, drains and fields." : p.s === "ground" ? "Water rising up from the ground after a long wet spell." : "The source isn't recorded."}${ev.k > 1 ? ` The outline joins ${ev.k} recorded patches of this flood.` : ""}</p>` },
        { k: "Other floods recorded within 3 km", h: others.length ? `<b>${others.length}</b> other flood${others.length === 1 ? "" : "s"}, the latest in ${e(others[0].y)}` : "No other floods recorded within 3 km", viz: V.big(String(others.length), "others"),
          more: others.length ? `<table class="mo-tab"><thead><tr><th>Flood</th><th class="num">Year</th><th class="num">Hectares</th></tr></thead><tbody>${others.slice(0, 15).map(x => `<tr><td>${e(x.n)}</td><td class="num">${e(x.y)}</td><td class="num">${fmt(x.ha)}</td></tr>`).join("")}</tbody></table>` : "" },
        { k: "Where it comes from", h: ev.nat === "W" ? "Natural Resources Wales, Historic Flood Map" : "Environment Agency, Recorded Flood Outlines", url: ev.nat === "W" ? "https://datamap.gov.wales/layers/inspire-nrw:NRW_HISTORIC_FLOODMAP" : "https://www.data.gov.uk/dataset/16e32c53-35a6-4d54-a111-ca09031eaaaf/recorded-flood-outlines", urlLabel: "Dataset", more: "<p>Outlines of floods the agencies recorded; a place with no outline may still have flooded. Shapes are simplified for the map.</p>" }] };
    } else if (key === "coast") {
      const say = smpSay(p.pol);
      spec = { title: `Coastal erosion by ${p.e}`, shape: p.smp ? "coast:" + p.smp : null, figs: [{ v: typeof p.d === "number" ? `${fmt(p.d)} m` : "—", l: "land lost, at most" }, { v: String(p.e), l: "by" }, { v: p.pol || "—", l: "shoreline plan" }], items: [
        { k: "What could be lost", h: typeof p.d === "number" ? `Up to <b>${fmt(p.d)} m</b> of land could be lost here by ${p.e}` : e(p.d || "Land could be lost here"), viz: V.big(typeof p.d === "number" ? `${fmt(p.d)} m` : "—", `by ${p.e}`), open: true,
          more: "<p>The forecast assumes the shoreline management plan is carried out, and a higher central estimate of sea-level rise. The shaded strip is the land between today's cliff or shore and where it's forecast to be.</p>" },
        { k: "The plan for this coast", h: e(p.pol || "No policy recorded"), more: `<p>${e(say || "")}</p>${p.smp ? `<p>Shoreline management plan: ${e(p.smp)}.</p>` : ""}` },
        { k: "Where it comes from", h: "Environment Agency, National Coastal Erosion Risk Mapping 2024", url: "https://www.gov.uk/government/publications/national-coastal-erosion-risk-mapping-ncerm", urlLabel: "About NCERM" }] };
    } else if (key === "heat") {
      const v = typeof p.v === "string" ? JSON.parse(p.v) : p.v, st = D.heat.steps;
      spec = { title: "Hot summer days", figs: [{ v: fmt(v[heatIdx()]), l: `days over 30 °C, ${st[heatIdx()][1]}` }, { v: fmt(v[0]), l: st[0][1] }, { v: fmt(v[v.length - 1]), l: st[st.length - 1][1] }], items: [
        { k: "Days above 30 °C a year, here", h: `<b>${fmt(v[heatIdx()])}</b> a year (${e(st[heatIdx()][1])}), against ${fmt(v[0])} in ${e(st[0][1])}`, viz: V.bars(v.map((x, i) => ({ v: x || 0.01, c: i === heatIdx() ? "#b8202b" : "#f99d4b", n: st[i][1] }))), open: true,
          more: `<table class="mo-tab"><thead><tr><th>Period or warming</th><th class="num">Days a year</th></tr></thead><tbody>${st.map((s2, i) => `<tr><td>${e(s2[1])}</td><td class="num">${fmt(v[i])}</td></tr>`).join("")}</tbody></table><p>Heat above 30 °C strains health (older people, those with heart and lung conditions), rail lines, roads and power.</p>` },
        { k: "Where it comes from", h: "Met Office, UKCP18 projections (12 km squares, median)", url: "https://climatedataportal.metoffice.gov.uk/", urlLabel: "Climate Data Portal" }] };
    } else if (key === "cons") {
      spec = { title: p.n, shape: "park:" + p.n, figs: [{ v: p.k === "np" ? "National Park" : "Ramsar site", l: NAT[p.nat] || "" }, { v: p.y ? String(p.y) : "—", l: "designated" }], items: [
        { k: p.k === "np" ? "National Park" : "Wetland of international importance (Ramsar)", h: `<b>${e(p.n)}</b>${p.y ? `, designated in ${p.y}` : ""}`, open: true,
          more: p.k === "np" ? "<p>Protected for its landscape, wildlife and heritage, and for people to enjoy; planning is controlled by its own authority. People live and work inside it.</p>" : "<p>A wetland listed under the Ramsar Convention for its birds, plants or habitats; protected in planning and managed for conservation.</p>" },
        { k: "Read more", h: e(p.n), url: `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(p.n)}`, urlLabel: "Look it up" }] };
    } else if (key === "fire") {
      spec = { title: "Wildfire burnt area", figs: [{ v: fmt(p.ha) + " ha", l: "burnt" }, { v: String(p.d || "").slice(0, 4), l: longDate(p.d) }], items: [
        { k: "Seen by satellite", h: `About <b>${fmt(p.ha)} ha</b> burnt, seen on ${e(longDate(p.d))}`, open: true, more: "<p>Moorland and heath fires are most common in dry springs and summers; they threaten homes nearby, water supplies and peat that stores carbon.</p>" }] };
    }
    const R = window.AtlasResilience;   // 0.12: what the authorities are saying, on flood and coast cards
    if (spec && R && R.authItem && (key === "floods" || key === "coast")) { const ev = key === "floods" ? ((D.floods.events || []).find(x => x.id === p.ev) || {}) : null; spec.items.splice(spec.items.length - 1, 0, R.authItem(key === "floods" ? "flood " + String(ev.n || "").replace(/\s*\d{4}.*$/, "").split(/[,(]/)[0] : "coastal erosion " + (p.smp || ""), at)); }
    if (spec) AtlasCard.open(Object.assign({ app: "Environment", source: "Atlas Environment", when: "" }, spec));
    if (spec && R && R.fill) setTimeout(() => R.fill(), 50);
  }
  function longDate(d) { try { return CTX.longDate(d); } catch (e) { return d; } }
  function fly(g) { const b = bboxOf(g); CTX.map.fitBounds([[b[0], b[1]], [b[2], b[3]]], { padding: 80, maxZoom: 13, duration: 900 }); }

  // ---------- panels ----------
  function renderAll() { Object.entries(ELS).forEach(([id, el]) => { if (el && el.isConnected && PANELS[id]) PANELS[id](CTX, el); }); }
  function setYear(y) { S.fut = null; S.year = y; apply(); renderAll(); }
  function setFut(f) { S.fut = f; stopPlay(); apply(); renderAll(); }
  function stopPlay() { if (S.playing) { clearInterval(S.playing); S.playing = null; } }
  function play() {
    if (S.playing) { stopPlay(); renderAll(); return; }
    S.fut = null; if (S.year >= TODAY_Y) S.year = 1945;
    S.playing = setInterval(() => { if (S.year >= TODAY_Y) { stopPlay(); renderAll(); return; } S.year += 1; apply(); renderAll(); }, 450);
    renderAll();
  }

  // The timeline is a fixed frame (the slider is never redrawn, so it can be dragged) and a body that updates.
  function timeline(ctx, el) {
    ELS.timeline = el;
    if (!el.querySelector(".env-tl")) {
      el.innerHTML = `
      <div class="env-tl">
        <div class="env-when"><button class="env-play" data-envplay></button><b class="env-year"></b><span class="env-mode"></span></div>
        <input type="range" class="env-range" data-envyear min="1945" max="${TODAY_Y}" step="1" aria-label="Year">
        <div class="env-ticks"><span>1945</span><span>1970</span><span>2000</span><span>Today</span></div>
        <div class="env-future"><span>Future</span>${[2055, 2105].map(f => `<button data-envfut="${f}">By ${f}</button>`).join("")}</div>
      </div><div class="env-tl-body"></div>`;
      let raf = 0;
      el.oninput = ev => { if (!ev.target.matches("[data-envyear]")) return; stopPlay(); S.fut = null; S.year = +ev.target.value;
        cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { apply(); timelineBody(ctx, el); Object.keys(ELS).forEach(k => k !== "timeline" && ELS[k] && ELS[k].isConnected && PANELS[k](ctx, ELS[k])); }); };
      el.onclick = ev => {
        const t = ev.target;
        if (t.closest("[data-envplay]")) play();
        const f = t.closest("[data-envfut]"); if (f) setFut(S.fut === +f.dataset.envfut ? null : +f.dataset.envfut);
        const h = t.closest("[data-envheat]"); if (h) { S.heat = h.dataset.envheat; S.heatPicked = true; apply(); renderAll(); }
        if (t.closest("[data-envheatauto]")) { ev.preventDefault(); S.heatPicked = false; apply(); renderAll(); }
        if (t.closest("[data-envsources]")) { ev.preventDefault(); ctx.openPanel("sources"); }
      };
      el.onchange = ev => { const c = ev.target.closest("[data-envon]"); if (c) { S.on[c.dataset.envon] = c.checked; S.mine = Object.assign({}, S.on); apply(); renderAll(); } };
    }
    const y = Y(), r = el.querySelector(".env-range");
    el.querySelector(".env-play").textContent = S.playing ? "❚❚" : "▶"; el.querySelector(".env-play").title = S.playing ? "Pause" : "Play the years";
    el.querySelector(".env-year").textContent = S.fut ? "By " + S.fut : y;
    el.querySelector(".env-mode").textContent = S.fut ? "forecast" : y === TODAY_Y ? "today" : "recorded";
    if (document.activeElement !== r || S.playing) r.value = y;
    r.style.opacity = S.fut ? ".45" : "";
    el.querySelectorAll("[data-envfut]").forEach(b => b.classList.toggle("on", S.fut === +b.dataset.envfut));
    timelineBody(ctx, el);
  }
  function timelineBody(ctx, el) {
    const e = ctx.esc, y = Y(), hs = D.heat ? D.heat.steps : [["b81", "1981–2000"], ["b01", "2001–2020"], ["g15", "+1.5 °C"], ["g20", "+2 °C"], ["g25", "+2.5 °C"], ["g30", "+3 °C"], ["g40", "+4 °C"]];
    const fl = D.floods, upTo = fl ? fl.events.filter(x => +x.d.slice(0, 4) <= y) : [], inYear = fl ? fl.events.filter(x => +x.d.slice(0, 4) === y) : [];
    const recent = fl ? fl.events.filter(x => { const yy = +x.d.slice(0, 4); return yy <= y && yy > y - 10; }) : [];
    const cons = D.cons ? D.cons.features.filter(f => f.properties.y && f.properties.y <= y) : [];
    el.querySelector(".env-tl-body").innerHTML = `
      <div class="env-layers">${[["floods", "Floods (recorded)", "#1f6fb4"], ["coast", "Coastal erosion (forecast)", "#c0392b"], ["heat", "Hot summer days", "#e8592b"], ["cons", "National Parks and Ramsar wetlands", "#4f772d"], ["fire", "Wildfire (satellite, 2026)", "#e85d04"]]
        .map(([k, l, c]) => `<label style="--c:${c}"><input type="checkbox" data-envon="${k}" ${S.on[k] ? "checked" : ""}><i></i>${l}${S.on[k] && !D[k] ? " <small>loading…</small>" : ""}</label>`).join("")}</div>
      ${S.on.heat ? `<div class="env-heat"><span>Heat at</span>${hs.map((s, i) => `<button class="${i === heatIdx() ? "on" : ""}" data-envheat="${s[0]}">${e(s[1])}</button>`).join("")}
        <p class="ap-note">The last five are levels of global warming above 1850–1900, not dates: the Met Office doesn't tie them to years. Current international policies point to about 2.4–2.8 °C. ${S.heatPicked ? `<a href="#" data-envheatauto>Follow the timeline</a>` : "Following the timeline (pick a level to fix it)."}</p></div>` : ""}
      <div class="env-sum">
        ${S.on.floods ? `<p><b>${fmt(upTo.length)}</b> floods recorded up to ${y}${S.fut ? "" : `, <b>${fmt(inYear.length)}</b> in ${y}`}; <b>${fmt(recent.length)}</b> in the ten years to ${y}.</p>` : ""}
        ${S.on.coast ? `<p>${S.fut ? `Coastline forecast to erode by <b>${S.fut}</b>${S.fut === 2105 ? " (red: by 2055, orange: 2055–2105)" : ""}.` : y >= TODAY_Y ? "Coast under threat today: land forecast to erode by 2055 (red) and by 2105 (orange)." : "Coastal erosion shows from <b>today</b> on (it is a forecast, so not in past years)."}</p>` : ""}
        ${S.on.cons ? `<p><b>${cons.filter(f => f.properties.k === "np").length}</b> National Parks and <b>${cons.filter(f => f.properties.k === "ramsar").length}</b> dated Ramsar wetlands designated by ${y}; other Ramsar sites are dashed (protected today, date not in the open data).</p>` : ""}
        ${S.on.heat ? `<p>Heat: <b>${e(heatKey()[1])}</b>${D.heat ? `, UK average ${fmt(avgHeat(heatIdx()))} days above 30 °C a year` : ""}.</p>` : ""}
      </div>
      ${S.on.floods ? `<div class="env-key">${Object.keys(SRC_COL).map(k => `<span><i style="background:${SRC_COL[k]}"></i>${SRC_NAME[k]}</span>`).join("")}</div><p class="ap-note">Zoomed out, recorded floods show as hot zones (darker = more and larger floods); zoom in for each outline. Brighter outlines are more recent.</p>` : ""}
      <p class="ap-note">Coverage: floods for England and Wales; coastal erosion for England and Wales; heat for the whole UK; protected areas for all four nations. See <a href="#" data-envsources>Sources</a>.</p>`;
  }
  function avgHeat(i) { const v = D.heat.features.map(f => f.properties.v[i]).filter(x => x != null); return v.reduce((a, b) => a + b, 0) / (v.length || 1); }

  function bars(rows, w = 300, h = 90, col = "#1f6fb4", mark) {
    // 0.13.1: a time series as designed: neutral bars, the highest year green, the lowest red, the year on the bar outlined
    const max = Math.max(1, ...rows.map(r => r[1])), bw = w / rows.length; let hi = 0, lo = 0; rows.forEach((r, i) => { if (r[1] > rows[hi][1]) hi = i; if (r[1] < rows[lo][1]) lo = i; });
    return `<svg class="env-bars" viewBox="0 0 ${w} ${h + 14}" preserveAspectRatio="none">${rows.map((r, i) => `<rect x="${i * bw}" y="${h - r[1] / max * h}" width="${Math.max(1, bw - 1)}" height="${Math.max(r[1] ? 1 : 0, r[1] / max * h)}" fill="${i === hi ? "var(--up, #1f8a4c)" : i === lo && rows[lo][1] < rows[hi][1] ? "var(--down, #c0392b)" : "var(--ink-3, #8a969b)"}"${mark != null && r[0] === mark ? ` stroke="var(--app, #2e7d4f)" stroke-width="1.5"` : ""}><title>${r[0]}: ${fmt(r[1])}</title></rect>`).join("")}
      <text x="0" y="${h + 12}" font-size="10" fill="currentColor">${rows[0] ? rows[0][0] : ""}</text><text x="${w}" y="${h + 12}" font-size="10" text-anchor="end" fill="currentColor">${rows.length ? rows[rows.length - 1][0] : ""}</text></svg>`;
  }
  function needs(key, ctx, el, fn) {
    if (D[key]) return fn();
    el.innerHTML = `<p class="ap-note">Loading…</p>`;
    load(key).then(() => { ensure(key); apply(); fn(); }).catch(e => { el.innerHTML = `<p class="ap-warn">${ctx.esc(e.message)}</p>`; });
  }

  function floods(ctx, el) {
    ELS.floods = el;
    needs("floods", ctx, el, () => {
      const e = ctx.esc, y = Y(), ev = D.floods.events, byYear = {};
      ev.forEach(x => { const yy = +x.d.slice(0, 4); if (yy >= 1945) byYear[yy] = (byYear[yy] || 0) + 1; });
      const rows = []; for (let k = 1945; k <= TODAY_Y; k++) rows.push([k, byYear[k] || 0]);
      const top = ev.filter(x => +x.d.slice(0, 4) <= y).sort((a, b) => b.ha - a.ha).slice(0, 12);
      el.innerHTML = `<p class="ap-note">Every flood the Environment Agency (England) and Natural Resources Wales have recorded, by the year it started. Recording has improved over time, so recent decades have more records partly because more floods were mapped.</p>
        <h4>Floods recorded each year</h4>${bars(rows, 300, 90, "#7fb0dd", y)}
        <h4>Largest floods up to ${y}</h4>
        <ol class="env-list">${top.map(x => `<li><button data-envfl="${e(x.id)}">${e(x.n)}</button> <small>${e(longDate(x.d))} · ${fmt(x.ha)} ha · ${NAT[x.nat]}</small></li>`).join("")}</ol>
        <p class="ap-note">Not shown: Scotland (SEPA doesn't publish recorded flood outlines as open data) and Northern Ireland (no open national record found).</p>`;
      el.onclick = ev2 => { const b = ev2.target.closest("[data-envfl]"); if (!b) return; const f = D.floods.features.find(x => x.properties.ev === b.dataset.envfl); if (f) { S.on.floods = true; apply(); fly(f.geometry); } };
    });
  }

  function coast(ctx, el) {
    ELS.coast = el;
    needs("coast", ctx, el, () => {
      const e = ctx.esc, fs = D.coast.features, eng = fs.filter(f => typeof f.properties.d === "number");
      const by = ep => eng.filter(f => f.properties.e === ep);
      const worst = by(2105).slice().sort((a, b) => b.properties.d - a.properties.d).slice(0, 12);
      el.innerHTML = `<p class="ap-note">How far the land is forecast to retreat, frontage by frontage, if the shoreline management plans are carried out and sea level rises along the higher central allowance (UKCP18). Distances add up over time.</p>
        <div class="ap-row"><button class="${S.fut === 2055 ? "on" : ""}" data-envfut="2055">Show by 2055</button><button class="${S.fut === 2105 ? "on" : ""}" data-envfut="2105">Show by 2105</button></div>
        <table class="env-tab"><tr><th></th><th>By 2055</th><th>By 2105</th></tr>
          <tr><td>Stretches of coast at risk (England)</td><td>${fmt(by(2055).length)}</td><td>${fmt(by(2105).length)}</td></tr>
          <tr><td>Furthest retreat (England)</td><td>${fmt(Math.max(0, ...by(2055).map(f => f.properties.d)))} m</td><td>${fmt(Math.max(0, ...by(2105).map(f => f.properties.d)))} m</td></tr>
          <tr><td>Stretches at risk (Wales)</td><td>${fmt(fs.filter(f => f.properties.e === 2055 && typeof f.properties.d !== "number").length)}</td><td>${fmt(fs.filter(f => f.properties.e === 2105 && typeof f.properties.d !== "number").length)}</td></tr></table>
        <h4>Greatest retreat by 2105 (England)</h4>
        <ol class="env-list">${worst.map((f, i) => `<li><button data-envco="${i}">${e(f.properties.smp || "Frontage")}</button> <small>${fmt(f.properties.d)} m · ${e(f.properties.pol || "")}</small></li>`).join("")}</ol>
        <p class="ap-note">Not shown: Scotland (Dynamic Coast publishes its 2050 forecast region by region; a later addition) and Northern Ireland (no open national forecast).</p>`;
      el.onclick = ev => {
        const f = ev.target.closest("[data-envfut]"); if (f) { S.on.coast = true; setFut(+f.dataset.envfut); return; }
        const b = ev.target.closest("[data-envco]"); if (b) { S.on.coast = true; setFut(2105); fly(worst[+b.dataset.envco].geometry); }
      };
    });
  }

  function heat(ctx, el) {
    ELS.heat = el;
    needs("heat", ctx, el, () => {
      const e = ctx.esc, st = D.heat.steps, i = heatIdx();
      const rows = st.map((s, k) => [s[1], avgHeat(k)]);
      const hottest = D.heat.features.map(f => [f, f.properties.v[i]]).filter(x => x[1] != null).sort((a, b) => b[1] - a[1]).slice(0, 8);
      el.innerHTML = `<p class="ap-note">Days a year when the temperature goes above 30 °C, on a 12 km grid, from the Met Office's UK climate projections (UKCP18, median of 12 model runs). The baselines are 1981–2000 and 2001–2020; the rest are levels of global warming.</p>
        <table class="env-tab">${rows.map((r, k) => `<tr class="${k === i ? "on" : ""}"><td><button data-envheat="${st[k][0]}">${e(r[0])}</button></td><td>${fmt(r[1])} days</td><td><span class="env-bar" style="width:${Math.round(r[1] / Math.max(...rows.map(x => x[1])) * 100)}%"></span></td></tr>`).join("")}</table>
        <h4>Hottest squares at ${e(st[i][1])}</h4>
        <ol class="env-list">${hottest.map(([f, v], k) => `<li><button data-envht="${k}">${fmt(v)} days</button> <small>near ${centre(f.geometry).map(x => x.toFixed(2)).join(", ")}</small></li>`).join("")}</ol>`;
      el.onclick = ev => {
        const h = ev.target.closest("[data-envheat]"); if (h) { S.on.heat = true; S.heat = h.dataset.envheat; S.heatPicked = true; apply(); renderAll(); return; }
        const b = ev.target.closest("[data-envht]"); if (b) { S.on.heat = true; apply(); fly(hottest[+b.dataset.envht][0].geometry); }
      };
    });
  }

  function conservation(ctx, el) {
    ELS.conservation = el;
    needs("cons", ctx, el, () => {
      const e = ctx.esc, fs = D.cons.features, np = fs.filter(f => f.properties.k === "np").sort((a, b) => (a.properties.y || 9999) - (b.properties.y || 9999));
      const ram = fs.filter(f => f.properties.k === "ramsar"), byNat = {}; ram.forEach(f => { byNat[f.properties.nat] = (byNat[f.properties.nat] || 0) + 1; });
      el.innerHTML = `<p class="ap-note">Areas protected for their landscape and wildlife. Each appears on the timeline in the year it was designated.</p>
        <h4>National Parks</h4><ol class="env-list">${np.map((f, i) => `<li><button data-envnp="${i}">${e(f.properties.n)}</button> <small>${f.properties.y || "–"} · ${NAT[f.properties.nat]}</small></li>`).join("")}</ol>
        <p class="ap-note">Northern Ireland has no National Parks.</p>
        <h4>Ramsar wetlands of international importance</h4>
        <table class="env-tab">${Object.keys(NAT).map(k => `<tr><td>${NAT[k]}</td><td>${fmt(byNat[k] || 0)} sites</td></tr>`).join("")}</table>
        <p class="ap-note">Designation dates are in the open boundary data for Wales only; the other sites show dashed as "protected today".</p>`;
      el.onclick = ev => { const b = ev.target.closest("[data-envnp]"); if (b) { S.on.cons = true; apply(); fly(np[+b.dataset.envnp].geometry); } };
    });
  }

  function sources(ctx, el) {
    ELS.sources = el;
    const row = (t, en, wa, sc, ni) => `<tr><td>${t}</td>${[en, wa, sc, ni].map(x => `<td class="${x === "–" ? "gap" : ""}">${x}</td>`).join("")}</tr>`;
    el.innerHTML = `<table class="env-tab env-cov"><tr><th></th><th>England</th><th>Wales</th><th>Scotland</th><th>N. Ireland</th></tr>
        ${row("Floods, recorded", "Environment Agency", "Natural Resources Wales", "–", "–")}
        ${row("Coastal erosion to 2055 and 2105", "Environment Agency (NCERM 2024)", "Natural Resources Wales (NCERM)", "–", "–")}
        ${row("Hot summer days", "Met Office", "Met Office", "Met Office", "Met Office")}
        ${row("Wildfire, satellite", "–", "–", "SEPA (2026)", "–")}
        ${row("National Parks", "Natural England", "Natural Resources Wales", "Scottish Government", "none exist")}
        ${row("Ramsar wetlands", "Natural England", "Natural Resources Wales", "NatureScot", "DAERA")}</table>
      <p class="ap-note">"–" means no open national dataset was found, not that nothing has happened there. All data is under the Open Government Licence v3.0. Rebuild with <code>python3 pipeline/fetch_envzones.py</code> and <code>python3 pipeline/build_envzones.py</code>.</p>
      <p class="ap-note">Planned: Scotland's coastal erosion (Dynamic Coast), future flood risk with climate change, SSSIs, and coastal realignment projects (OMReg, once ABPmer agrees to reuse).</p>`;
  }

  // 0.9.2: header tabs. Floods, Coast, Heat and Conservation each show only their own layer; Timeline shows your choice.
  function only(ctx, key) {
    bind(ctx); if (!S.mine) S.mine = Object.assign({}, S.on);
    Object.keys(S.on).forEach(k => { S.on[k] = k === key; });
    if (key === "coast" && !S.fut) S.year = TODAY_Y;   // erosion is a forecast: show it from today
    stopPlay(); apply(); renderAll();
  }
  function mine(ctx) { bind(ctx); if (S.mine) Object.assign(S.on, S.mine); apply(); renderAll(); }

  // 0.11: Climate & air: the area measures (emissions, renewables, recycling, air quality, electric cars) for the place in focus
  const CLIMATE = [["Greenhouse gas emissions", "Emissions"], ["Renewable electricity", "Renewable power"], ["Waste and recycling", "Waste and recycling"], ["Air quality", "Air quality"], ["Electric vehicles", "Electric cars"]];
  function climate(ctx, el) {
    const code = ctx.focused && ctx.P[ctx.focused] ? ctx.focused : ctx.UKC, esc = ctx.esc;
    const v = (id, c) => { const r = ctx.value(id, c); return r && r.v != null && !r.nm ? (r.text || (ctx.M[id].fmt ? ctx.M[id].fmt(r.v) : r.v)) : "—"; };
    el.innerHTML = `<p class="ap-note">${esc(code === ctx.UKC ? "The UK" : ctx.nameOf(code))}${code === ctx.UKC ? "" : " against the UK"}. Click a measure to map it; click a council on the map to see it here.</p>` +
      CLIMATE.map(([g, l]) => { const ms = ctx.METRICS.filter(m => m.group === g && m.p === "environment"); return ms.length ? `<h4>${esc(l)}</h4><table class="mo-tab"><tr><th></th><th class="num">Here</th>${code === ctx.UKC ? "" : `<th class="num">UK</th>`}</tr>${ms.map(m => `<tr class="clk" data-envm="${m.id}"><td>${esc(m.label)}</td><td class="num">${esc(v(m.id, code))}</td>${code === ctx.UKC ? "" : `<td class="num">${esc(v(m.id, ctx.UKC))}</td>`}</tr>`).join("")}</table>` : ""; }).join("") +
      `<p class="ap-note">Sources: DESNZ, Defra, DfT and OHID (Open Government Licence).</p>`;
    el.onclick = e => { const r = e.target.closest("[data-envm]"); if (r) ctx.mapOnly([r.dataset.envm]); };
  }
  const PANELS = { timeline, floods, coast, heat, conservation, sources };
  function bind(ctx) {
    if (CTX) return; CTX = ctx;
    if (window.AtlasRivers) AtlasRivers.show(ctx);   // 0.12: rivers drawn as rivers, more detail as you zoom
    regShapes();
    if (ctx.map) ctx.map.on("moveend", detailInView);
    TODAY_Y = +String(ctx.today || "2026").slice(0, 4) || 2026; if (S.year == null) S.year = TODAY_Y;
    const m = ctx.map; if (!m) return;
    m.on("styledata", () => { Object.keys(FILE).forEach(k => { if (D[k] && !m.getSource(P + k)) { bound[k] = false; ensure(k); } }); apply(); });
  }

  // 0.12: features as shapes (shape.js): a flood event, a stretch of coast, a park; each redraws as the timeline moves
  function floodsAlong(lines, kmMax) { // flood outlines with their centre within kmMax of a river, up to the year shown
    if (!D.floods) return []; const pts = []; lines.forEach(f => { const g = f.geometry, ls = g.type === "LineString" ? [g.coordinates] : g.coordinates; ls.forEach(l => l.forEach((c, i) => { if (i % 3 === 0) pts.push(c); })); });
    if (!pts.length) return []; let b = [180, 90, -180, -90]; pts.forEach(([x, y]) => { b = [Math.min(b[0], x), Math.min(b[1], y), Math.max(b[2], x), Math.max(b[3], y)]; }); const pad = kmMax / 70;
    if (!FCEN) FCEN = D.floods.features.map(f => [centre(f.geometry), f.properties.ev]);
    return D.floods.features.filter((f, i) => { const c = FCEN[i][0]; if (f.properties.y > Y() || c[0] < b[0] - pad || c[0] > b[2] + pad || c[1] < b[1] - pad || c[1] > b[3] + pad) return false; return pts.some(p => kmBetween(p, c) <= kmMax); });
  }
  const shapeFeats = (theme, pred) => { const lo = (D[theme] ? D[theme].features : []).filter(pred), hi = DET[theme] ? [...DET[theme].values()].flat().filter(pred) : []; return hi.length ? hi : lo; };
  function regShapes() {   // called when the view starts (shape.js loads after the views)
    if (!window.AtlasShape || regShapes.done) return; regShapes.done = true;
    AtlasShape.register("flood", ev => { const ft = shapeFeats("floods", f => f.properties.ev === ev); if (!ft.length) return null; const e = (D.floods.events || []).find(x => x.id === ev) || {};
      return { title: e.n || "Recorded flood", kind: "flood", colour: SRC_COL[ft[0].properties.s] || SRC_COL.other, note: `${longDate(e.d)} · ${fmt(e.ha)} ha`, features: ft.map(f => ({ type: "Feature", properties: { _c: SRC_COL[f.properties.s] || SRC_COL.other, _fo: 0.35 }, geometry: f.geometry })) }; });
    AtlasShape.register("coast", smp => { const ft = shapeFeats("coast", f => f.properties.smp === smp); if (!ft.length) return null;
      const pick = () => ft.filter(f => f.properties.e <= (S.fut || 2105));
      return { title: `Coastal erosion: ${smp}`, kind: "coast", colour: "#c0392b", note: "Land forecast to be lost", features: pick().map(f => ({ type: "Feature", properties: { _c: f.properties.e === 2055 ? "#c0392b" : "#f08a5d", _fo: 0.45 }, geometry: f.geometry })),
        live: () => pick().map(f => ({ type: "Feature", properties: { _c: f.properties.e === 2055 ? "#c0392b" : "#f08a5d", _fo: 0.45 }, geometry: f.geometry })), liveNote: () => S.fut ? `by ${S.fut}` : "by 2055 (dark) and 2105 (light)" }; });
    AtlasShape.register("park", n => { const ft = shapeFeats("cons", f => f.properties.n === n); if (!ft.length) return null; const p0 = ft[0].properties, c = p0.k === "np" ? "#31572c" : "#1d6f66";
      const draw = () => ft.map(f => ({ type: "Feature", properties: { _c: !f.properties.y || f.properties.y <= Y() ? c : "#9aa5ab", _fo: !f.properties.y || f.properties.y <= Y() ? 0.25 : 0.06 }, geometry: f.geometry }));
      return { title: n, kind: "park", colour: c, note: `${p0.k === "np" ? "National Park" : "Ramsar wetland"}${p0.y ? `, designated ${p0.y}` : ""}`, features: draw(), live: draw, liveNote: () => p0.y && p0.y > Y() ? `not yet designated in ${Y()} (grey)` : `in ${Y()}` }; });
  }
  window.AtlasEnv = { floodsNear: (lon, lat, km) => floodsNear(lon, lat, km), floodsAlong, load: k => load(k), bind: c => bind(c), setOn: o => { Object.assign(S.on, o); apply(); },   // 0.12: Atlas Resilience draws the hazards through these
    get D() { return D; }, get year() { return Y(); } };
  window.AtlasApps && AtlasApps.register({
    id: "environment", name: "Atlas Environment", perspective: "environment", accent: "#4f772d", dataNeeds: [], rivers: true,
    init(ctx) { bind(ctx); ctx.mapOnly([]); ctx.view([-3.2, 54.6], 5.3); apply(); ctx.openPanel("timeline"); },
    panels: [
      { id: "timeline", map: ctx => mine(ctx), title: "Timeline", blurb: "Zones on a timeline, from recorded history into official forecasts", render: (ctx, el) => { bind(ctx); timeline(ctx, el); }, min: { w: 380, h: 440 } },
      { id: "floods", map: ctx => only(ctx, "floods"), title: "Floods", blurb: "Every recorded flood in England and Wales", render: (ctx, el) => { bind(ctx); floods(ctx, el); }, min: { w: 360, h: 380 } },
      { id: "coast", map: ctx => only(ctx, "coast"), title: "Coast", blurb: "Coastal erosion forecast to 2055 and 2105", render: (ctx, el) => { bind(ctx); coast(ctx, el); }, min: { w: 360, h: 380 } },
      { id: "heat", map: ctx => only(ctx, "heat"), title: "Heat", blurb: "Hot summer days, today and as the world warms", render: (ctx, el) => { bind(ctx); heat(ctx, el); }, min: { w: 360, h: 380 } },
      { id: "conservation", map: ctx => only(ctx, "cons"), title: "Conservation", blurb: "National Parks and Ramsar wetlands by year designated", render: (ctx, el) => { bind(ctx); conservation(ctx, el); }, min: { w: 360, h: 380 } },
      { id: "climate", map: { level: "council", metrics: ["env_ghg_pc"] }, title: "Climate & air", blurb: "Emissions, renewable power, recycling, air quality and electric cars for the place in focus", live: true, render: climate, min: { w: 420, h: 380 },
        menu: (ctx, B) => ({ lede: "How each place is doing on emissions, clean power, waste, air and electric cars, with the trend and what moved it.", sections: CLIMATE.map(([g, l]) => B.group(g, "environment", { label: l })).concat([{ label: "The full panel", items: [B.panel("climate", "Open Climate & air", "Every measure for the place in focus")] }]).filter(Boolean) }) },
      { id: "sources", title: "Sources", blurb: "Where the zones come from, nation by nation", render: (ctx, el) => { bind(ctx); sources(ctx, el); }, min: { w: 420, h: 300 } },
    ],
    tools: [],
  });
})();
