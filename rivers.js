/* Atlas 0.12 · rivers (core). Rivers and canals drawn as rivers, not blobs, with more detail as you zoom:
 *   below zoom 10   the main rivers of Great Britain (data/rivers/main.js, about 0.8 MB, simplified to ~150 m)
 *   from zoom 10    every watercourse, loaded 20 km square by square as they come into view (data/rivers/<x>_<y>.js)
 * Width grows with the zoom and with the length of the named river a stretch belongs to (the Thames is drawn wider than
 * a brook); canals are a steady line, tidal reaches a little paler, lines through lakes dashed. Click any river for its
 * card: its name and form, how long it is, recorded floods nearby (when Atlas Environment's floods are loaded) and links.
 *   AtlasRivers.show(ctx)  draw them (Atlas Environment and Atlas Resilience call this); AtlasRivers.hide()
 */
(function () {
  "use strict";
  let ctx = null, map = null, IDX = null, on = false;
  const loaded = new Map(), loading = new Set(), FC = () => ({ type: "FeatureCollection", features: [] });
  const FORM = { r: "River or stream", c: "Canal", t: "Tidal river", l: "Line through a lake" };
  const esc = t => String(t == null ? "" : t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  function unpack(lines) { return lines.map(flat => { const out = []; let x = 0, y = 0; for (let i = 0; i < flat.length; i += 2) { x += flat[i]; y += flat[i + 1]; out.push([x / 1e5, y / 1e5]); } return out; }); }
  const feats = data => data.lines.map(([p, ls]) => ({ type: "Feature", properties: p, geometry: ls.length === 1 ? { type: "LineString", coordinates: unpack(ls)[0] } : { type: "MultiLineString", coordinates: unpack(ls) } }));
  let rq = 0;   // squares arrive in bursts: redraw once per burst, not once per square
  window.ATLAS_RIVERS_LOADED = (key, data) => { loaded.set(key, feats(data)); loading.delete(key); clearTimeout(rq); rq = setTimeout(refresh, 150); };
  const script = src => { const s = document.createElement("script"); s.src = src; s.onerror = () => { loading.delete(src); }; document.head.appendChild(s); };
  function refresh() {
    if (!map || !map.getSource("rivers-main")) return;
    if (loaded.has("main")) map.getSource("rivers-main").setData({ type: "FeatureCollection", features: loaded.get("main") });
    const fs = []; loaded.forEach((v, k) => { if (k !== "main") fs.push(...v); });
    map.getSource("rivers-hi").setData({ type: "FeatureCollection", features: fs });
  }
  function inView() { // load the squares in view from zoom 10
    if (!on || !IDX || map.getZoom() < 10) return;
    const b = map.getBounds(), w = b.getWest(), e = b.getEast(), s = b.getSouth(), n = b.getNorth();
    IDX.squares.filter(q => q[3] >= w && q[1] <= e && q[4] >= s && q[2] <= n).slice(0, 40).forEach(q => { if (loaded.has(q[0]) || loading.has(q[0])) return; loading.add(q[0]); script(`data/rivers/${q[0]}.js?v=1`); });
  }
  // how wide: by zoom, and by the length of the named watercourse (k, km)
  const width = base => ["interpolate", ["exponential", 1.6], ["zoom"], 5, ["*", base, 0.35], 9, ["*", base, 0.9], 12, ["*", base, 1.8], 15, ["*", base, 3.2]];
  const size = ["case", ["==", ["get", "f"], "c"], 1.1, [">=", ["get", "k"], 150], 2.6, [">=", ["get", "k"], 60], 1.9, [">=", ["get", "k"], 25], 1.4, [">", ["get", "k"], 0], 1, 0.7];
  function addLayers() {
    if (map.getSource("rivers-main")) return;
    const before = ["poi-sym", "stops-pt"].find(id => map.getLayer(id));
    map.addSource("rivers-main", { type: "geojson", data: FC() }); map.addSource("rivers-hi", { type: "geojson", data: FC() });
    const paint = { "line-color": ["match", ["get", "f"], "c", "#3f7fb8", "t", "#5d9cc9", "#2f86c7"], "line-width": width(size), "line-opacity": ["match", ["get", "f"], "l", 0.45, 0.9] };
    map.addLayer({ id: "rivers-main-line", type: "line", source: "rivers-main", maxzoom: 10, layout: { "line-cap": "round", "line-join": "round", visibility: "none" }, paint }, before);
    map.addLayer({ id: "rivers-hi-line", type: "line", source: "rivers-hi", minzoom: 10, filter: ["!=", ["get", "f"], "l"], layout: { "line-cap": "round", "line-join": "round", visibility: "none" }, paint }, before);
    map.addLayer({ id: "rivers-hi-lake", type: "line", source: "rivers-hi", minzoom: 10, filter: ["==", ["get", "f"], "l"], layout: { visibility: "none" }, paint: Object.assign({}, paint, { "line-dasharray": [2, 2] }) }, before);
    map.on("moveend", inView);
    map.on("styledata", () => { if (on && !map.getSource("rivers-main")) { addLayers(); setVis(); refresh(); } });
  }
  const setVis = () => ["rivers-main-line", "rivers-hi-line", "rivers-hi-lake"].forEach(id => map.getLayer(id) && map.setLayoutProperty(id, "visibility", on ? "visible" : "none"));
  function show(c) {
    ctx = c || ctx || window.AtlasCtx; map = ctx && ctx.map; if (!map) return;
    on = true; const go = () => { try { addLayers(); setVis(); refresh(); inView(); } catch (e) { map.once("idle", go); } };   // the style may still be loading
    go();
    if (!loaded.has("main") && !loading.has("main")) { loading.add("main"); script("data/rivers/main.js?v=1"); }
    if (!IDX) { if (window.ATLAS_RIVERS_INDEX) IDX = window.ATLAS_RIVERS_INDEX; else { const s = document.createElement("script"); s.src = "data/rivers/index.js?v=1"; s.onload = () => { IDX = window.ATLAS_RIVERS_INDEX; inView(); }; document.head.appendChild(s); } }
    if (window.AtlasShape) AtlasShape.register("river", riverShape);
    if (ctx.registerPick && !show.picked) { show.picked = 1;
      ctx.registerPick({ id: "rivers", layers: ["rivers-main-line", "rivers-hi-line", "rivers-hi-lake"], pad: 5, priority: 25,
        hover: f => `<div class="poi-h"><b>${esc(f.properties.n || "Unnamed watercourse")}</b><div class="poi-sub">${esc(FORM[f.properties.f] || "River")} · click for more</div></div>`,
        open: (f, e) => openCard(f.properties, e.lngLat) }); }
  }
  function hide() { on = false; if (map) setVis(); }
  function openCard(p, ll) {
    if (!window.AtlasCard) return; const V = AtlasCard.viz, name = p.n || "Unnamed watercourse";
    const fl = window.AtlasEnv && AtlasEnv.floodsNear ? AtlasEnv.floodsNear(ll.lng, ll.lat, 3) : null;
    const items = [{ k: FORM[p.f] || "River", h: p.n ? `<b>${esc(name)}</b>${p.k ? `: about ${p.k.toLocaleString("en-GB")} km of named channel in Great Britain` : ""}` : "A small watercourse with no name on the map", viz: V.big(p.k ? `${p.k} km` : "—", p.k ? "named length" : ""), open: true,
      more: `<p>${p.f === "c" ? "A canal: built, with locks and towpaths; its level is managed, so it floods less than a river but can overtop or breach." : p.f === "t" ? "A tidal reach: the water level rises and falls with the sea twice a day, so it floods from high tides and storm surges as well as from rain." : p.f === "l" ? "A line through a lake or reservoir, joining the rivers that flow in and out." : "A river or stream: it rises after heavy rain, and can burst its banks onto the floodplain beside it."}</p>${p.k >= 25 && p.f !== "c" ? `<p>Named rivers often share a name (there are several River Avons); the length counts every stretch with this name.</p>` : ""}` }];
    if (fl) items.push({ k: "Recorded floods within 3 km", h: fl.n ? `<b>${fl.n}</b> recorded flood${fl.n === 1 ? "" : "s"}${fl.last ? `, the latest in ${fl.last}` : ""}` : "No recorded floods within 3 km", viz: V.big(String(fl.n), fl.n === 1 ? "flood" : "floods"),
      more: fl.list && fl.list.length ? `<table class="mo-tab"><thead><tr><th>Flood</th><th class="num">Year</th><th class="num">Hectares</th></tr></thead><tbody>${fl.list.slice(0, 12).map(x => `<tr><td>${esc(x.n)}</td><td class="num">${x.y || ""}</td><td class="num">${x.ha != null ? Math.round(x.ha).toLocaleString("en-GB") : ""}</td></tr>`).join("")}</tbody></table>` : "", map: { fn: "env-floods" } });
    items.push({ k: "Where it comes from", h: "Ordnance Survey, OS Open Rivers", url: p.n ? `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(name)}` : null, urlLabel: "Look it up", more: "<p>Every watercourse in Great Britain as a network of lines (OGL v3.0; contains OS data © Crown copyright). Northern Ireland's rivers aren't in it yet.</p>" });
    AtlasCard.open({ app: "Environment", title: name, shape: p.r ? "river:" + p.r : null, items, source: "OS Open Rivers", when: "", links: [{ label: "OS Open Rivers", url: "https://www.ordnancesurvey.co.uk/products/os-open-rivers" }] });
  }
  // 0.12: a river in its own right: every stretch with its id (the main file has whole rivers; small ones come from the
  // squares loaded around you), and, while Atlas Environment is open, the recorded floods along it up to the year shown
  function riverShape(r) {
    r = +r; const all = []; loaded.forEach(v => v.forEach(f => { if (f.properties.r === r) all.push(f); }));
    const main = (loaded.get("main") || []).filter(f => f.properties.r === r), lines = main.length ? main : all; if (!lines.length) return null;
    const p = lines[0].properties, c = "#1f6fb4", base = lines.map(f => ({ type: "Feature", properties: { _c: c }, geometry: f.geometry }));
    const env = window.AtlasEnv && AtlasEnv.D && AtlasEnv.D.floods;
    return { title: p.n || "Watercourse", kind: "river", colour: c, note: `${FORM[p.f] || "River"}${p.k ? `, about ${p.k} km` : ""}`, features: base,
      live: env ? () => base.concat(AtlasEnv.floodsAlong(base, 1).map(f => ({ type: "Feature", properties: { _c: "#7b4fa6", _fo: 0.35 }, geometry: f.geometry }))) : null,
      liveNote: env ? () => `with the recorded floods within 1 km of it up to ${AtlasEnv.year}` : null };
  }
  if (window.AtlasShape) AtlasShape.register("river", riverShape);
  window.AtlasRivers = { show, hide, riverShape, get on() { return on; }, openCard };
})();
