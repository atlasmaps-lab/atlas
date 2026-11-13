/* Atlas Transport (0.12) · getting from A to B, on the map:
 *   Paths        footpaths, cycleways, bridleways and steps at street zoom (OpenStreetMap via Overpass), each clickable
 *   Trails       click a waymarked walking or cycling route (Waymarked Trails) for its name, network, length and website
 *   15-minute    what everyday needs (GP, pharmacy, school, food shop, park, post office, library, dentist, bus stop or
 *                station, sport, café) are within 15 minutes on foot, by bike and by public transport from a point
 *   Draw a route click the map to add points, drag them to adjust: driving, cycling or walking through every point,
 *                with distance, time and the climb
 * Services (free, no key, one request per action, cached for the session): Overpass (OpenStreetMap; a mirror if the
 * main server is busy), Valhalla (FOSSGIS), Transitous, Waymarked Trails. Map data © OpenStreetMap contributors.
 */
(function () {
  "use strict";
  const VALHALLA = "https://valhalla1.openstreetmap.de", OVERPASS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"];
  const esc = t => String(t == null ? "" : t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const FC = f => ({ type: "FeatureCollection", features: f || [] });
  const km = (a, b) => { const R = 6371, t = Math.PI / 180, dl = (b[1] - a[1]) * t, dg = (b[0] - a[0]) * t, x = Math.sin(dl / 2) ** 2 + Math.cos(a[1] * t) * Math.cos(b[1] * t) * Math.sin(dg / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); };
  const inRing = (pt, rg) => { let c = false; for (let i = 0, k = rg.length - 1; i < rg.length; k = i++) { const [xi, yi] = rg[i], [xk, yk] = rg[k]; if ((yi > pt[1]) !== (yk > pt[1]) && pt[0] < (xk - xi) * (pt[1] - yi) / (yk - yi) + xi) c = !c; } return c; };
  let ctx = null;
  // ---------- Overpass: one request per action, cached, with a mirror ----------
  const OPC = new Map();
  async function overpass(q) {
    if (OPC.has(q)) return OPC.get(q);
    let last = null;
    for (const u of OVERPASS) {
      try {
        const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 25000);
        const r = await fetch(u, { method: "POST", body: "data=" + encodeURIComponent(q), headers: { "Content-Type": "application/x-www-form-urlencoded" }, signal: ctl.signal }); clearTimeout(t);
        if (!r.ok) { last = new Error("HTTP " + r.status); continue; }
        const j = await r.json(); OPC.set(q, j); return j;
      } catch (e) { last = e; }
    }
    throw last || new Error("Overpass didn't answer");
  }
  function layers() {
    const m = ctx.map; if (m.getSource("mv-paths")) return; const before = m.getLayer("poi-sym") ? "poi-sym" : undefined;
    m.addSource("mv-paths", { type: "geojson", data: FC() });
    m.addLayer({ id: "mv-paths-line", type: "line", source: "mv-paths", minzoom: 14.5, layout: { "line-cap": "round", "line-join": "round" }, paint: {
      "line-color": ["match", ["get", "k"], "cycleway", "#2e8b57", "bridleway", "#8a5a1d", "steps", "#b03a2e", "track", "#9c7a3c", "#7b4fa6"],
      "line-width": ["interpolate", ["linear"], ["zoom"], 14.5, 1.6, 17, 3.6], "line-opacity": 0.9 } }, before);
    m.addSource("mv-15", { type: "geojson", data: FC() }); m.addSource("mv-15pt", { type: "geojson", data: FC() });
    m.addLayer({ id: "mv-15-fill", type: "fill", source: "mv-15", paint: { "fill-color": ["get", "c"], "fill-opacity": 0.12 } }, before);
    m.addLayer({ id: "mv-15-line", type: "line", source: "mv-15", paint: { "line-color": ["get", "c"], "line-width": 2, "line-opacity": 0.8 } }, before);
    m.addLayer({ id: "mv-15-pt", type: "circle", source: "mv-15pt", paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 11, 3, 16, 6], "circle-color": ["get", "c"], "circle-stroke-color": "#fff", "circle-stroke-width": 1.2, "circle-opacity": ["case", ["==", ["get", "in"], 1], 1, 0.35] } });
    m.addSource("mv-draw", { type: "geojson", data: FC() });
    m.addLayer({ id: "mv-draw-case", type: "line", source: "mv-draw", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#fff", "line-width": 8, "line-opacity": 0.9 } }, before);
    m.addLayer({ id: "mv-draw-line", type: "line", source: "mv-draw", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": ["get", "c"], "line-width": 5 } }, before);
    m.addSource("mv-reach", { type: "geojson", data: FC() });
    m.addLayer({ id: "mv-reach-line", type: "line", source: "mv-reach", layout: { "line-cap": "round" }, paint: { "line-color": ["get", "c"], "line-width": 2.5, "line-opacity": 0.75 } }, before);
    m.on("moveend", pathsInView);
    ctx.registerPick && ctx.registerPick({ id: "mv-paths", layers: ["mv-paths-line"], pad: 4, priority: 23, hover: f => `<div class="poi-h"><b>${esc(f.properties.n || KIND[f.properties.k] || "Path")}</b><div class="poi-sub">${esc(KIND[f.properties.k] || "Path")}${f.properties.surface ? " · " + esc(f.properties.surface) : ""} · click for more</div></div>`, open: f => AtlasCard.open(pathCard(f.properties)) });
    ctx.registerPick && ctx.registerPick({ id: "mv-15pt", layers: ["mv-15-pt"], pad: 4, priority: 8, hover: f => `<div class="poi-h"><b>${esc(f.properties.n || NEED[f.properties.need] && NEED[f.properties.need][0])}</b><div class="poi-sub">${esc((NEED[f.properties.need] || [""])[0])}</div></div>`, open: f => AtlasCard.open(amenityCard(f.properties)) });
  }
  // ---------- paths at street zoom ----------
  const KIND = { footway: "Footpath", path: "Path", cycleway: "Cycleway", bridleway: "Bridleway", steps: "Steps", pedestrian: "Pedestrian street", track: "Track" };
  const P = { on: true, last: "", t: 0 };
  function pathsInView() {
    const m = ctx.map; if (!P.on || m.getZoom() < 14.5) return; clearTimeout(P.t);
    P.t = setTimeout(async () => {
      const b = m.getBounds(), r = v => Math.round(v * 100) / 100, s = r(b.getSouth() - 0.005), w = r(b.getWest() - 0.005), n = r(b.getNorth() + 0.005), e = r(b.getEast() + 0.005);
      if (n - s > 0.06 || e - w > 0.1) return; const key = [s, w, n, e].join(); if (key === P.last) return; P.last = key;
      try {
        const j = await overpass(`[out:json][timeout:20];way["highway"~"^(footway|cycleway|path|bridleway|steps|pedestrian|track)$"](${s},${w},${n},${e});out geom tags 4000;`);
        const fs = (j.elements || []).filter(x => x.geometry).map(x => { const t = x.tags || {}; return { type: "Feature", properties: { id: x.id, k: t.highway, n: t.name || "", surface: t.surface || "", lit: t.lit || "", seg: t.segregated || "", bike: t.bicycle || "", foot: t.foot || "", ref: t.ref || "", acc: t.access || "", desig: t.designation || "" }, geometry: { type: "LineString", coordinates: x.geometry.map(p => [p.lon, p.lat]) } }; });
        if (m.getSource("mv-paths")) m.getSource("mv-paths").setData(FC(fs));
      } catch (err) { /* busy server: paths just don't show this time */ }
    }, 600);
  }
  function pathCard(p) {
    const yes = v => v === "yes" || v === "designated" ? "yes" : v === "no" ? "no" : v || "not recorded";
    return { app: "Transport", title: p.n || KIND[p.k] || "Path", figs: [{ v: KIND[p.k] || p.k, l: "kind" }, { v: p.surface || "—", l: "surface" }, { v: yes(p.lit), l: "lit at night" }], items: [
      { k: KIND[p.k] || "Path", h: `${p.n ? `<b>${esc(p.n)}</b>: ` : ""}${esc(KIND[p.k] || "Path")}${p.desig ? ` (${esc(p.desig.replace(/_/g, " "))})` : ""}`, open: true,
        more: `<table class="itab"><tr><th>Bikes</th><td>${esc(yes(p.k === "cycleway" ? p.bike || "yes" : p.bike))}</td></tr><tr><th>On foot</th><td>${esc(yes(p.foot || (p.k === "footway" ? "yes" : "")))}</td></tr><tr><th>Bikes and walkers kept apart</th><td>${esc(yes(p.seg))}</td></tr><tr><th>Surface</th><td>${esc(p.surface || "not recorded")}</td></tr><tr><th>Lit</th><td>${esc(yes(p.lit))}</td></tr>${p.acc ? `<tr><th>Access</th><td>${esc(p.acc)}</td></tr>` : ""}</table>` },
      { k: "Where it comes from", h: "OpenStreetMap, as mapped by volunteers", url: `https://www.openstreetmap.org/way/${p.id}`, urlLabel: "On OpenStreetMap", more: "<p>What's recorded can be out of date; a right of way isn't always shown.</p>" }], source: "OpenStreetMap", when: "" };
  }
  // ---------- waymarked routes: click the trail overlay ----------
  const GROUP = { INT: "International", NAT: "National", REG: "Regional", LOC: "Local" };
  const merc = (lon, lat) => [lon * 20037508.34 / 180, Math.log(Math.tan((90 + lat) * Math.PI / 360)) * 6378137];
  async function trailsAt(ll, kinds) {
    const pt = ctx.map.project(ll), a = ctx.map.unproject([pt.x - 12, pt.y + 12]), b = ctx.map.unproject([pt.x + 12, pt.y - 12]), A = merc(a.lng, a.lat), Bm = merc(b.lng, b.lat), bb = [A[0], A[1], Bm[0], Bm[1]].map(Math.round).join(",");
    const out = [];
    for (const k of kinds) {
      try { const j = await fetch(`https://${k}.waymarkedtrails.org/api/v1/list/by_area?bbox=${bb}&limit=6`).then(r => r.json()); (j.results || []).forEach(x => out.push(Object.assign({ kind: k }, x))); } catch (e) { /* skip */ }
    }
    return out;
  }
  async function trailCard(list) {
    const det = await Promise.all(list.slice(0, 5).map(x => fetch(`https://${x.kind}.waymarkedtrails.org/api/v1/details/relation/${x.id}`).then(r => r.ok ? r.json() : x).catch(() => x)));
    const km2 = d => d.official_length ? Math.round(d.official_length / 1000) : d.route && d.route.length ? Math.round(d.route.length / 1000) : null;
    return { app: "Transport", title: list.length === 1 ? (list[0].name || "Waymarked route") : `${list.length} waymarked routes here`, items: det.map((d, i) => ({ k: `${d.kind === "cycling" || list[i].kind === "cycling" ? "Cycle route" : "Walking route"} · ${GROUP[d.group] || d.group || ""}`, h: `<b>${esc(d.name || "Unnamed route")}</b>${d.ref ? ` (${esc(d.ref)})` : ""}${km2(d) ? `, ${km2(d)} km` : ""}`, open: i === 0,
      more: `${d.tags && d.tags.operator ? `<p>Looked after by ${esc(d.tags.operator)}.</p>` : ""}${d.url ? `<p><a href="${esc(d.url)}" target="_blank" rel="noopener">Route website ↗</a></p>` : ""}`, url: `https://${list[i].kind}.waymarkedtrails.org/#route?type=relation&id=${d.id}`, urlLabel: "Map of the whole route" })), source: "Waymarked Trails, OpenStreetMap", when: "" };
  }
  // ---------- 15-minute city ----------
  const NEED = { gp: ["GP surgery", "#c0392b", 'nwr["amenity"~"^(doctors|clinic)$"]'], pharmacy: ["Pharmacy", "#16a085", 'nwr["amenity"="pharmacy"]'], school: ["School", "#2b6cb0", 'nwr["amenity"="school"]'],
    food: ["Food shop", "#d68910", 'nwr["shop"~"^(supermarket|greengrocer|convenience)$"]'], park: ["Park or playground", "#2e8b57", 'nwr["leisure"~"^(park|playground)$"]'], post: ["Post office", "#a93226", 'nwr["amenity"="post_office"]'],
    library: ["Library", "#7b4fa6", 'nwr["amenity"="library"]'], dentist: ["Dentist", "#5d6d7e", 'nwr["amenity"="dentist"]'], transit: ["Bus stop or station", "#1d5590", 'node["highway"="bus_stop"];nwr["railway"~"^(station|halt)$"]'],
    sport: ["Sport or leisure centre", "#ca6f1e", 'nwr["leisure"~"^(sports_centre|fitness_centre|swimming_pool)$"]'], cafe: ["Café or pub", "#8e6c3a", 'nwr["amenity"~"^(cafe|pub)$"]'] };
  const MODES15 = [["pedestrian", "Walk", "#7b4fa6"], ["bicycle", "Cycle", "#2e8b57"], ["transit", "Public transport", "#d63a2f"]];
  const F = { from: null, busy: false, res: null, show: "pedestrian", err: "" };
  async function area15(mode, from) {
    if (mode !== "transit") {
      const body = { locations: [{ lat: from.lat, lon: from.lon }], costing: mode, contours: [{ time: 15 }], polygons: true, denoise: 0.3 };
      const j = await fetch(`${VALHALLA}/isochrone?json=${encodeURIComponent(JSON.stringify(body))}`).then(r => { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); });
      const g = (j.features || [])[0]; if (!g) return null; const rings = g.geometry.type === "Polygon" ? [g.geometry.coordinates[0]] : g.geometry.coordinates.map(p => p[0]);
      return { rings, feats: [{ type: "Feature", properties: { c: (MODES15.find(x => x[0] === mode) || [])[2], mode }, geometry: g.geometry }] };
    }
    const when = new Date(); when.setMinutes(Math.ceil(when.getMinutes() / 15) * 15, 0, 0);
    const j = await fetch(`https://api.transitous.org/api/v1/one-to-all?one=${from.lat},${from.lon}&maxTravelTime=15&time=${encodeURIComponent(when.toISOString())}`).then(r => { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); });
    const pts = (j.all || []).map(x => ({ lon: x.place.lon, lat: x.place.lat, left: 15 - x.duration })).filter(p => p.left > 0).slice(0, 1500);
    pts.push({ lon: from.lon, lat: from.lat, left: 15 });   // walking from the start counts too
    const circle = p => { const r = Math.min(15, p.left) * 80 / 111320, cs = []; for (let k = 0; k <= 16; k++) { const a = k / 16 * 2 * Math.PI; cs.push([p.lon + r * Math.cos(a) / Math.cos(p.lat * Math.PI / 180), p.lat + r * Math.sin(a)]); } return cs; };
    const rings = pts.map(circle);
    return { rings, feats: rings.map(rg => ({ type: "Feature", properties: { c: "#d63a2f", mode: "transit" }, geometry: { type: "Polygon", coordinates: [rg] } })) };
  }
  async function run15(from) {
    F.from = from; F.busy = true; F.err = ""; F.res = null; draw15();
    try {
      const areas = {}; for (const [m] of MODES15) { try { areas[m] = await area15(m, from); } catch (e) { areas[m] = null; } }
      let b = [from.lon, from.lat, from.lon, from.lat]; Object.values(areas).filter(Boolean).forEach(a => a.rings.forEach(r => r.forEach(([x, y]) => { b = [Math.min(b[0], x), Math.min(b[1], y), Math.max(b[2], x), Math.max(b[3], y)]; })));
      const bb = `${b[1].toFixed(4)},${b[0].toFixed(4)},${b[3].toFixed(4)},${b[2].toFixed(4)}`;
      const q = `[out:json][timeout:25];(${Object.values(NEED).map(n => n[2].split(";").map(x => `${x}(${bb});`).join("")).join("")});out center tags 6000;`;
      const j = await overpass(q);
      const things = (j.elements || []).map(x => { const t = x.tags || {}, ll = x.center ? [x.center.lon, x.center.lat] : [x.lon, x.lat]; const need = Object.keys(NEED).find(k => matchNeed(k, t)); return need && ll[0] != null ? { need, ll, n: t.name || "", t } : null; }).filter(Boolean);
      const inArea = (a, ll) => a && a.rings.some(rg => inRing(ll, rg));
      const res = {}; Object.keys(NEED).forEach(k => { res[k] = {}; MODES15.forEach(([m]) => { const hit = things.filter(x => x.need === k && inArea(areas[m], x.ll)); res[k][m] = { n: hit.length, near: hit.length ? Math.min(...hit.map(x => km(x.ll, [from.lon, from.lat]))) : null }; }); });
      F.res = { areas, things, res };
    } catch (e) { F.err = "The map data service (Overpass) didn't answer. It's a free service; try again in a moment."; }
    F.busy = false; draw15();
  }
  function matchNeed(k, t) {
    switch (k) {
      case "gp": return /^(doctors|clinic)$/.test(t.amenity || ""); case "pharmacy": return t.amenity === "pharmacy"; case "school": return t.amenity === "school";
      case "food": return /^(supermarket|greengrocer|convenience)$/.test(t.shop || ""); case "park": return /^(park|playground)$/.test(t.leisure || ""); case "post": return t.amenity === "post_office";
      case "library": return t.amenity === "library"; case "dentist": return t.amenity === "dentist"; case "transit": return t.highway === "bus_stop" || /^(station|halt)$/.test(t.railway || "");
      case "sport": return /^(sports_centre|fitness_centre|swimming_pool)$/.test(t.leisure || ""); case "cafe": return /^(cafe|pub)$/.test(t.amenity || "");
    }
    return false;
  }
  function draw15() {
    layers(); const m = ctx.map, R = F.res, sel = F.show;
    m.getSource("mv-15").setData(FC(R && R.areas[sel] ? R.areas[sel].feats : []));
    const a = R && R.areas[sel];
    m.getSource("mv-15pt").setData(FC(R ? R.things.map(x => ({ type: "Feature", properties: { need: x.need, c: NEED[x.need][1], n: x.n, in: a && a.rings.some(rg => inRing(x.ll, rg)) ? 1 : 0, oh: x.t.opening_hours || "", web: x.t.website || "", tag: x.t.amenity || x.t.shop || x.t.leisure || x.t.railway || x.t.highway || "" }, geometry: { type: "Point", coordinates: x.ll } })) : []));
    if (F.el) panel15(F.el);
  }
  const score = m => F.res ? Object.keys(NEED).filter(k => F.res.res[k][m].n > 0).length : 0;
  function panel15(el) {
    F.el = el; const R = F.res, N = Object.keys(NEED).length;
    el.innerHTML = `<p class="ap-note ap-keep">What everyday needs are within 15 minutes of a place: on foot, by bike, and by public transport (with the walk at each end).</p>
      <div class="tr-pl"><span class="tr-dot from"></span><input data-trq="fifteen" placeholder="A station, town or address" value="${esc((F.from || {}).label || "")}" autocomplete="off"><button class="btn sm" data-trpick="fifteen" title="Choose a point on the map">◎</button><ul class="tr-hits" data-trhits="fifteen" hidden></ul></div>
      ${F.busy ? `<p class="ap-note">Working out the 15-minute areas and what's inside them…</p>` : F.err ? `<p class="ap-note">${esc(F.err)}</p>` : ""}
      ${R ? `<div class="tr-head mv-scores">${MODES15.map(([m, l]) => `<div><span class="tr-k">${l}</span><b>${score(m)} of ${N}</b></div>`).join("")}</div>
        <div class="tr-modes">${MODES15.map(([m, l, c]) => `<button class="${F.show === m ? "on" : ""}" data-mv15="${m}" style="--c:${c}">Show ${l.toLowerCase()} area</button>`).join("")}</div>
        <table class="mo-tab mv-15t"><thead><tr><th>Need</th>${MODES15.map(([, l]) => `<th class="num">${l}</th>`).join("")}<th class="num">Nearest</th></tr></thead><tbody>
        ${Object.keys(NEED).map(k => { const r = R.res[k], near = Math.min(...MODES15.map(([m]) => r[m].near == null ? 99 : r[m].near)); return `<tr><td><i class="sw" style="background:${NEED[k][1]}"></i>${esc(NEED[k][0])}</td>${MODES15.map(([m]) => `<td class="num" data-v="${r[m].n}">${r[m].n ? `✓ ${r[m].n}` : `<span class="mv-no">✗</span>`}</td>`).join("")}<td class="num" data-v="${near}">${near < 99 ? `${near.toFixed(1)} km` : "—"}</td></tr>`; }).join("")}</tbody></table>
        <div class="ap-row"><button class="btn sm primary" data-mv15card>Open as a card</button></div>` : `<p class="ap-note">Choose a place to start.</p>`}
      <p class="tr-src">Areas: Valhalla (walking, cycling) and Transitous (timetables, leaving now-ish; walking at about 5 km/h for the minutes left). Places: OpenStreetMap via Overpass: what volunteers have mapped, so a missing ✓ can mean a missing map entry.</p>`;
  }
  function card15() {
    const R = F.res; if (!R) return null; const N = Object.keys(NEED).length, V = AtlasCard.viz;
    return { app: "Transport", title: `15-minute city: ${F.from.label}`, figs: MODES15.map(([m, l]) => ({ v: `${score(m)} of ${N}`, l: `needs on ${l === "Walk" ? "foot" : l === "Cycle" ? "a bike" : "public transport"}` })), items: MODES15.map(([m, l, c], i) => {
      const have = Object.keys(NEED).filter(k => R.res[k][m].n > 0), miss = Object.keys(NEED).filter(k => !R.res[k][m].n);
      return { k: `${l} · 15 minutes`, h: `<b>${have.length} of ${N}</b> everyday needs${miss.length ? `; missing: ${esc(miss.map(k => NEED[k][0].toLowerCase()).join(", "))}` : ": all of them"}`, viz: V.bars(Object.keys(NEED).map(k => ({ v: Math.max(0.3, Math.min(10, R.res[k][m].n)), c: R.res[k][m].n ? NEED[k][1] : "#ccc", n: NEED[k][0] }))), open: i === 0,
        more: `<table class="mo-tab"><thead><tr><th>Need</th><th class="num">Within 15 min</th><th class="num">Nearest</th></tr></thead><tbody>${Object.keys(NEED).map(k => `<tr><td>${esc(NEED[k][0])}</td><td class="num">${R.res[k][m].n}</td><td class="num">${R.res[k][m].near != null ? R.res[k][m].near.toFixed(1) + " km" : "—"}</td></tr>`).join("")}</tbody></table>` }; }),
      source: "Valhalla, Transitous, OpenStreetMap", when: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) };
  }
  function amenityCard(p) {
    return { app: "Transport", title: p.n || NEED[p.need][0], items: [{ k: NEED[p.need][0], h: `<b>${esc(p.n || NEED[p.need][0])}</b>${p.in ? " · within 15 minutes" : ""}`, open: true, more: `${p.oh ? `<p>Opening hours: ${esc(p.oh)}</p>` : ""}${p.web ? `<p><a href="${esc(p.web)}" target="_blank" rel="noopener">Website ↗</a></p>` : ""}<p>Mapped on OpenStreetMap as ${esc(String(p.tag).replace(/_/g, " "))}.</p>` }], source: "OpenStreetMap", when: "" };
  }
  // ---------- draw a route ----------
  const DR = { mode: "bicycle", pts: [], drawing: false, res: null, markers: [] };
  const DMODES = [["auto", "Drive", "#1d5590"], ["bicycle", "Cycle", "#2e8b57"], ["pedestrian", "Walk", "#7b4fa6"]];
  function markers() {
    DR.markers.forEach(mk => mk.remove()); DR.markers = [];
    if (!window.maplibregl) return;
    DR.pts.forEach((p, i) => { const el = document.createElement("div"); el.className = "mv-wp"; el.textContent = i + 1; const mk = new maplibregl.Marker({ element: el, draggable: true }).setLngLat([p.lon, p.lat]).addTo(ctx.map);
      mk.on("dragend", () => { const ll = mk.getLngLat(); DR.pts[i] = { lon: ll.lng, lat: ll.lat }; routeDraw(); }); DR.markers.push(mk); });
  }
  async function routeDraw() {
    markers(); layers();
    if (DR.pts.length < 2) { DR.res = null; ctx.map.getSource("mv-draw").setData(FC()); if (DR.el) panelDraw(DR.el); return; }
    const body = { locations: DR.pts.map((p, i) => ({ lat: p.lat, lon: p.lon, type: i === 0 || i === DR.pts.length - 1 ? "break" : "through" })), costing: DR.mode, directions_options: { units: "kilometers" } };
    DR.busy = true; if (DR.el) panelDraw(DR.el);
    try {
      const j = await fetch(`${VALHALLA}/route?json=${encodeURIComponent(JSON.stringify(body))}`).then(r => { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); });
      const coords = j.trip.legs.flatMap(l => decode6(l.shape)), col = (DMODES.find(x => x[0] === DR.mode) || [])[2];
      ctx.map.getSource("mv-draw").setData(FC([{ type: "Feature", properties: { c: col }, geometry: { type: "LineString", coordinates: coords } }]));
      DR.res = { km: j.trip.summary.length, s: j.trip.summary.time, climb: null, coords };
      // the climb: heights along the route (Valhalla's height service), summed where the road goes up
      try { const step = Math.max(1, Math.floor(coords.length / 300)), sh = coords.filter((_, i) => i % step === 0).map(([lon, lat]) => ({ lat, lon }));
        const h = await fetch(`${VALHALLA}/height?json=${encodeURIComponent(JSON.stringify({ shape: sh, range: false }))}`).then(r => r.json()); const hs = h.height || [];
        let up = 0; for (let i = 1; i < hs.length; i++) if (hs[i] != null && hs[i - 1] != null && hs[i] > hs[i - 1]) up += hs[i] - hs[i - 1]; DR.res.climb = Math.round(up); } catch (e) { /* no heights: no climb */ }
    } catch (e) { DR.res = { err: "The routing service didn't answer; try again in a moment." }; }
    DR.busy = false; if (DR.el) panelDraw(DR.el);
  }
  function decode6(str) { const f = 1e6, out = []; let i = 0, lat = 0, lon = 0; while (i < str.length) { for (const k of [0, 1]) { let b, sh = 0, r = 0; do { b = str.charCodeAt(i++) - 63; r |= (b & 31) << sh; sh += 5; } while (b >= 32); const d = r & 1 ? ~(r >> 1) : r >> 1; if (k === 0) lat += d; else lon += d; } out.push([lon / f, lat / f]); } return out; }
  const dur = s => { s = Math.round(s / 60); return s < 60 ? s + " min" : Math.floor(s / 60) + " h " + (s % 60 ? (s % 60) + " min" : ""); };
  function panelDraw(el) {
    DR.el = el; const r = DR.res;
    el.innerHTML = `<p class="ap-note ap-keep">Draw your own route: ${DR.drawing ? "<b>click the map to add points</b>" : "press Start, then click the map to add points"}; drag a numbered point to move it. The route follows roads and paths for the way you travel.</p>
      <div class="tr-modes">${DMODES.map(([k, l, c]) => `<button class="${DR.mode === k ? "on" : ""}" data-mvdmode="${k}" style="--c:${c}">${l}</button>`).join("")}</div>
      <div class="ap-row"><button class="btn sm ${DR.drawing ? "" : "primary"}" data-mvdraw>${DR.drawing ? "Stop adding points" : "Start: click the map"}</button><button class="btn sm" data-mvundo ${DR.pts.length ? "" : "disabled"}>Undo last point</button><button class="btn sm" data-mvclear ${DR.pts.length ? "" : "disabled"}>Clear</button></div>
      ${DR.busy ? `<p class="ap-note">Routing…</p>` : r && r.err ? `<p class="ap-note">${esc(r.err)}</p>` : r ? `<div class="tr-head"><div><span class="tr-k">Distance</span><b>${r.km < 10 ? r.km.toFixed(1) : Math.round(r.km)} km</b></div><div><span class="tr-k">Time</span><b>${dur(r.s)}</b></div><div><span class="tr-k">Climb</span><b>${r.climb != null ? r.climb + " m" : "—"}</b></div></div>
        <div class="ap-row"><button class="btn sm primary" data-mvdcard>Open as a card</button></div>` : `<p class="ap-note">${DR.pts.length} point${DR.pts.length === 1 ? "" : "s"} so far.</p>`}
      <p class="tr-src">Routing and heights: Valhalla (FOSSGIS). Map data © OpenStreetMap contributors.</p>`;
  }
  function drawCard() {
    const r = DR.res; if (!r || r.err) return null; const ml = (DMODES.find(x => x[0] === DR.mode) || [])[1];
    return { app: "Transport", title: `Drawn route · ${ml}`, figs: [{ v: `${r.km < 10 ? r.km.toFixed(1) : Math.round(r.km)} km`, l: "distance" }, { v: dur(r.s), l: "time" }, { v: r.climb != null ? r.climb + " m" : "—", l: "climb" }], items: [
      { k: `${ml} · ${DR.pts.length} points`, h: `<b>${r.km.toFixed(1)} km</b> in about ${dur(r.s)}${r.climb != null ? `, climbing ${r.climb} m` : ""}`, viz: AtlasCard.viz.spark(r.coords.filter((_, i) => i % Math.max(1, Math.floor(r.coords.length / 60)) === 0).map((c, i) => [i, c[1]])), open: true,
        more: `<p>Through ${DR.pts.map((p, i) => `point ${i + 1} (${p.lat.toFixed(4)}, ${p.lon.toFixed(4)})`).join(", ")}.</p>` }], source: "Valhalla, OpenStreetMap", when: "" };
  }
  // ---------- events ----------
  function bind(c) {
    if (bind.done) return; bind.done = true; ctx = c; const m = ctx.map;
    const go = () => { try { layers(); pathsInView(); } catch (e) { m.once("idle", go); } }; go();
    m.on("styledata", () => { if (!m.getSource("mv-paths")) { try { layers(); P.last = ""; pathsInView(); draw15(); } catch (e) { /* next time */ } } });
    m.on("click", async e => {
      if (DR.drawing) { DR.pts.push({ lon: e.lngLat.lng, lat: e.lngLat.lat }); routeDraw(); return; }
      if (window.__mvPick) { const which = window.__mvPick; window.__mvPick = null; if (which === "fifteen") run15({ label: `${e.lngLat.lat.toFixed(4)}, ${e.lngLat.lng.toFixed(4)}`, lon: e.lngLat.lng, lat: e.lngLat.lat }); return; }
      const kinds = ["hiking", "cycling"].filter(k => m.getLayer("tr-wm-" + k) && m.getLayoutProperty("tr-wm-" + k, "visibility") === "visible"); if (!kinds.length) return;
      const hit = m.queryRenderedFeatures(ctx.pbox ? ctx.pbox(e, 4) : e.point).some(f => /^(poi-sym|stops-pt|mv-|tr-pts|rivers|net-|env-)/.test(f.layer.id)); if (hit) return;
      const list = await trailsAt(e.lngLat, kinds); if (list.length) AtlasCard.open(trailCard(list));
    });
    document.addEventListener("click", e => {
      const t = e.target.closest && e.target.closest("[data-mv15],[data-mv15card],[data-mvdmode],[data-mvdraw],[data-mvundo],[data-mvclear],[data-mvdcard],[data-mvpaths]"); if (!t) return; const d = t.dataset;
      if (d.mv15) { F.show = d.mv15; draw15(); }
      else if (t.hasAttribute("data-mv15card")) { const s = card15(); if (s) AtlasCard.open(s); }
      else if (d.mvdmode) { DR.mode = d.mvdmode; routeDraw(); }
      else if (t.hasAttribute("data-mvdraw")) { DR.drawing = !DR.drawing; ctx.map.getCanvas().style.cursor = DR.drawing ? "crosshair" : ""; if (DR.el) panelDraw(DR.el); if (DR.drawing) ctx.toast("Click the map to add points; drag a point to move it."); }
      else if (t.hasAttribute("data-mvundo")) { DR.pts.pop(); routeDraw(); }
      else if (t.hasAttribute("data-mvclear")) { DR.pts = []; routeDraw(); }
      else if (t.hasAttribute("data-mvdcard")) { const s = drawCard(); if (s) AtlasCard.open(s); }
    });
    document.addEventListener("change", e => { const p = e.target.closest && e.target.closest("[data-mvpaths]"); if (p) { P.on = p.checked; if (m.getLayer("mv-paths-line")) m.setLayoutProperty("mv-paths-line", "visibility", P.on ? "visible" : "none"); if (P.on) { P.last = ""; pathsInView(); } } });
  }
  window.AtlasMove = { bind, fifteen: (c, el) => { bind(c); panel15(el); }, run15, draw: (c, el) => { bind(c); panelDraw(el); }, overpass, get paths() { return P; }, get F() { return F; }, get DR() { return DR; } };
})();
