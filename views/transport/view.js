/* Atlas Transport (0.8): getting around the UK, and the data a transport planner works with.
 *   Directions   from A to B by car, bike, on foot, hiking, or public transport (rail, Tube, tram, bus, ferry);
 *                alternatives, time and distance, every step, drawn on the map
 *   Reach        everywhere you can get to in 15–60 minutes (an isochrone), and who lives there
 *   Trails       hiking and cycling routes (Waymarked Trails, from OpenStreetMap), and planning a hike
 *   Hubs         the busiest stations, airports and ports, with their trends; bus and tram stops at street zoom
 *   Planner data the transport metrics on the map (rail journeys, stations, airports, ports, bus stop coverage)
 * Services (free, no key, used only when you ask): Valhalla on the FOSSGIS servers (openstreetmap.de) for roads,
 * cycling and walking; Transitous (MOTIS) for public transport; Photon (komoot) for addresses, suggested as you type. Fair-use limits apply: Atlas
 * sends one request per action and only the newest address search. Map data © OpenStreetMap contributors.
 */
(function () {
  "use strict";
  const VALHALLA = "https://valhalla1.openstreetmap.de", TRANSITOUS = "https://api.transitous.org/api/v5/plan", PHOTON = "https://photon.komoot.io/api/";
  const MODES = [["auto", "Drive", "#1d5590"], ["bicycle", "Cycle", "#2e8b57"], ["pedestrian", "Walk", "#7b4fa6"], ["hike", "Hike", "#8a5a1d"], ["transit", "Public transport", "#d63a2f"]];
  const S = { from: null, to: null, mode: "transit", when: "", res: null, sel: 0, busy: false, err: "", iso: { from: null, mode: "pedestrian", mins: 30 }, trails: { hiking: false, cycling: false } };
  const fmtDur = s => { s = Math.round(s / 60); return s < 60 ? s + " min" : Math.floor(s / 60) + " h " + (s % 60 ? (s % 60) + " min" : ""); };
  const fmtKm = km => km < 10 ? km.toFixed(1) + " km" : Math.round(km) + " km";
  const hhmm = t => { try { return new Date(t).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }); } catch (e) { return ""; } };

  const tooLight = hex => { const n = parseInt(String(hex).slice(0, 6), 16); if (isNaN(n)) return true; return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) > 200; };   // some operators give white
  function decode(str, precision) { // Google encoded polyline (precision 5 or 6)
    const f = Math.pow(10, precision || 6), out = []; let i = 0, lat = 0, lon = 0;
    while (i < str.length) { for (const k of [0, 1]) { let b, sh = 0, r = 0; do { b = str.charCodeAt(i++) - 63; r |= (b & 31) << sh; sh += 5; } while (b >= 32); const d = r & 1 ? ~(r >> 1) : r >> 1; if (k === 0) lat += d; else lon += d; } out.push([lon / f, lat / f]); }
    return out;
  }

  // ---------- map overlay ----------
  function ensureLayers(ctx) {
    const m = ctx.map; if (!m || m.getSource("tr-route")) return;
    const before = m.getLayer("poi-sym") ? "poi-sym" : undefined;
    m.addSource("tr-iso", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    m.addLayer({ id: "tr-iso-fill", type: "fill", source: "tr-iso", paint: { "fill-color": ["get", "c"], "fill-opacity": 0.16 } }, before);
    m.addLayer({ id: "tr-iso-line", type: "line", source: "tr-iso", paint: { "line-color": ["get", "c"], "line-width": 2, "line-opacity": 0.8 } }, before);
    m.addSource("tr-route", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    m.addLayer({ id: "tr-route-case", type: "line", source: "tr-route", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#ffffff", "line-width": ["case", ["==", ["get", "sel"], 1], 8, 5], "line-opacity": ["case", ["==", ["get", "sel"], 1], 0.95, 0.6] } }, before);
    m.addLayer({ id: "tr-route-line", type: "line", source: "tr-route", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": ["get", "c"], "line-width": ["case", ["==", ["get", "sel"], 1], 5, 3], "line-opacity": ["case", ["==", ["get", "sel"], 1], 1, 0.45],
      "line-dasharray": ["case", ["==", ["get", "walk"], 1], ["literal", [1, 1.6]], ["literal", [1, 0]]] } }, before);
    m.addSource("tr-pts", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    m.addLayer({ id: "tr-pts", type: "circle", source: "tr-pts", paint: { "circle-radius": 7, "circle-color": ["get", "c"], "circle-stroke-color": "#ffffff", "circle-stroke-width": 2.5 } });
    ["hiking", "cycling"].forEach(k => { m.addSource("tr-wm-" + k, { type: "raster", tiles: [`https://tile.waymarkedtrails.org/${k}/{z}/{x}/{y}.png`], tileSize: 256, maxzoom: 17, attribution: "Trails: © waymarkedtrails.org, OpenStreetMap contributors (CC BY-SA)" });
      m.addLayer({ id: "tr-wm-" + k, type: "raster", source: "tr-wm-" + k, layout: { visibility: "none" }, paint: { "raster-opacity": 0.85 } }, before); });
  }
  const setData = (ctx, id, feats) => { ensureLayers(ctx); const s = ctx.map.getSource(id); if (s) s.setData({ type: "FeatureCollection", features: feats }); };
  function drawEnds(ctx) { setData(ctx, "tr-pts", [S.from && { c: "#2e8b57", p: S.from }, S.to && { c: "#c0392b", p: S.to }].filter(Boolean).map(x => ({ type: "Feature", properties: { c: x.c }, geometry: { type: "Point", coordinates: [x.p.lon, x.p.lat] } }))); }
  function drawRoutes(ctx) {
    const r = S.res; if (!r) { setData(ctx, "tr-route", []); return; }
    const feats = [];
    r.options.forEach((o, i) => o.legs.forEach(l => feats.push({ type: "Feature", properties: { c: l.colour || o.colour, sel: i === S.sel ? 1 : 0, walk: l.walk ? 1 : 0 }, geometry: { type: "LineString", coordinates: l.coords } })));
    feats.sort((a, b) => a.properties.sel - b.properties.sel); setData(ctx, "tr-route", feats);
    const o = r.options[S.sel]; if (!o) return;
    let b = [180, 90, -180, -90]; o.legs.forEach(l => l.coords.forEach(([x, y]) => { b = [Math.min(b[0], x), Math.min(b[1], y), Math.max(b[2], x), Math.max(b[3], y)]; }));
    if (b[0] < 180) ctx.map.fitBounds([[b[0], b[1]], [b[2], b[3]]], { padding: { top: 120, bottom: 120, left: 80, right: 520 }, duration: 900, maxZoom: 15 });
  }

  // ---------- places: Atlas's own places and hubs first, then addresses (Photon) ----------
  // 0.8.2.1: addresses come from Photon (photon.komoot.io), an OpenStreetMap geocoder built for search-as-you-type.
  // Nominatim's usage policy forbids that, so it is no longer used. To stay within Photon's fair use: suggestions wait
  // until typing pauses, only the newest search is kept (older ones are cancelled), results are limited to the UK, and
  // each search's answer is remembered for the session so it is never asked twice.
  const addrCache = new Map();
  let addrCtl = null;
  async function findAddresses(q) {
    const key = q.toLowerCase();
    if (addrCache.has(key)) return addrCache.get(key);
    if (addrCtl) addrCtl.abort();
    const ctl = addrCtl = new AbortController(), out = [];
    try {
      const r = await fetch(`${PHOTON}?q=${encodeURIComponent(q)}&limit=5&lang=en&countrycode=GB`, { signal: ctl.signal }).then(r => r.json());
      (r.features || []).forEach(f => {
        const p = f.properties || {}, [lon, lat] = f.geometry.coordinates;
        const street = [p.housenumber, p.street].filter(Boolean).join(" ");
        const label = p.name || street || p.city || p.postcode || q;
        const sub = [p.name && street, p.district || p.city || p.county, p.postcode].filter(Boolean).filter((x, i, a) => a.indexOf(x) === i && x !== label).join(", ");
        out.push({ label, sub, lon, lat });
      });
      addrCache.set(key, out);
    } catch (e) { if (ctl.signal.aborted) return null; }   // null: a newer search replaced this one
    if (addrCtl === ctl) addrCtl = null;
    return out;
  }
  async function findPlaces(ctx, q, addresses) {
    const out = [], ql = q.toLowerCase();
    (ctx.POI ? ctx.POI.items : []).filter(i => i.n.toLowerCase().includes(ql)).sort((a, b) => (b.v || 0) - (a.v || 0)).slice(0, 4).forEach(i => out.push({ label: i.n, sub: ({ station: "Station", airport: "Airport", port: "Port", finance: "Financial centre" })[i.k], lon: i.lon, lat: i.lat }));
    ctx.searchNames(ql).filter(c => ctx.P[c].pt).slice(0, 3).forEach(c => out.push({ label: ctx.nameOf(c), sub: ctx.LABEL[ctx.P[c].level], lon: ctx.P[c].pt[0], lat: ctx.P[c].pt[1] }));
    if (addresses && q.length >= 3) out.push(...await findAddresses(q));
    return out;
  }

  // ---------- routing ----------
  async function route(ctx) {
    if (!S.from || !S.to) return;
    S.busy = true; S.err = ""; S.res = null; S.sel = 0; rerender(ctx);
    try { S.res = S.mode === "transit" ? await transit() : await valhalla(); if (!S.res.options.length) S.err = "No route found."; }
    catch (e) { S.err = "The routing service didn't answer (" + (e.message || e) + "). It's a free service with fair-use limits; try again in a moment."; }
    S.busy = false; rerender(ctx); drawRoutes(ctx);
  }
  async function valhalla() {
    const hike = S.mode === "hike", costing = hike ? "pedestrian" : S.mode;
    const body = { locations: [{ lat: S.from.lat, lon: S.from.lon }, { lat: S.to.lat, lon: S.to.lon }], costing, alternates: 2, directions_options: { units: "kilometers", language: "en-GB" },
      costing_options: hike ? { pedestrian: { use_hills: 1, max_hiking_difficulty: 6, use_tracks: 1 } } : S.mode === "bicycle" ? { bicycle: { use_roads: 0.3, bicycle_type: "Hybrid" } } : {} };
    const j = await fetch(`${VALHALLA}/route?json=${encodeURIComponent(JSON.stringify(body))}`).then(r => { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); });
    const trips = [j.trip, ...((j.alternates || []).map(a => a.trip))].filter(Boolean), col = (MODES.find(m => m[0] === S.mode) || [])[2];
    return { kind: "road", options: trips.map(t => ({ dur: t.summary.time, km: t.summary.length, colour: col, legs: t.legs.map(l => ({ coords: decode(l.shape, 6) })),
      steps: t.legs.flatMap(l => l.maneuvers.map(m => ({ t: m.instruction, km: m.length, s: m.time }))) })) };
  }
  async function transit() {
    const when = S.when ? new Date(S.when).toISOString() : new Date().toISOString();
    const j = await fetch(`${TRANSITOUS}?fromPlace=${S.from.lat},${S.from.lon}&toPlace=${S.to.lat},${S.to.lon}&time=${encodeURIComponent(when)}`).then(r => { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); });
    const MODE_COL = { WALK: "#6b7378", BUS: "#d63a2f", COACH: "#a83226", TRAM: "#7b4fa6", SUBWAY: "#1d5590", METRO: "#1d5590", RAIL: "#1d5590", REGIONAL_RAIL: "#1d5590", LONG_DISTANCE: "#0b3d6b", HIGHSPEED_RAIL: "#0b3d6b", FERRY: "#0f6b7a", BIKE: "#2e8b57" };
    return { kind: "transit", options: (j.itineraries || []).slice(0, 5).map(it => ({ dur: it.duration, start: it.startTime, end: it.endTime, transfers: it.transfers,
      legs: it.legs.map(l => ({ mode: l.mode, line: l.routeShortName || "", agency: l.agencyName || "", head: l.headsign || "", from: l.from.name, to: l.to.name, start: l.startTime, end: l.endTime, dur: l.duration, walk: l.mode === "WALK" ? 1 : 0,
        colour: l.routeColor && l.mode !== "WALK" && !tooLight(l.routeColor) ? "#" + l.routeColor : MODE_COL[l.mode] || "#444", coords: l.legGeometry ? decode(l.legGeometry.points, l.legGeometry.precision || 6) : [[l.from.lon, l.from.lat], [l.to.lon, l.to.lat]] })) })) };
  }

  // ---------- panels ----------
  let PANEL = null;
  const placeBox = (ctx, which) => `<div class="tr-pl"><span class="tr-dot ${which}"></span><input data-trq="${which}" placeholder="${which === "from" ? "From: a station, town or address" : "To"}" value="${ctx.esc((S[which] || {}).label || "")}" autocomplete="off"><button class="btn sm" data-trpick="${which}" title="Click the map to choose">Map</button><ul class="tr-hits" data-trhits="${which}" hidden></ul></div>`;
  function directions(ctx, el) {
    PANEL = { ctx, el };
    const r = S.res, o = r && r.options[S.sel];
    el.innerHTML = `${placeBox(ctx, "from")}${placeBox(ctx, "to")}<div class="ap-row"><button class="btn sm" data-trswap title="Swap">⇅ Swap</button>${S.mode === "transit" ? `<label class="tr-when">Leave at <input type="datetime-local" data-trwhen value="${ctx.esc(S.when)}"></label>` : ""}</div>
      <div class="tr-modes">${MODES.map(([k, l, c]) => `<button class="${S.mode === k ? "on" : ""}" data-trmode="${k}" style="--c:${c}">${l}</button>`).join("")}</div>
      ${S.busy ? `<p class="ap-note">Finding routes…</p>` : S.err ? `<p class="ap-note">${ctx.esc(S.err)}</p>` : ""}
      ${r ? `<div class="tr-opts">${r.options.map((x, i) => `<button class="tr-opt ${i === S.sel ? "on" : ""}" data-tropt="${i}"><b>${fmtDur(x.dur)}</b>${x.km ? ` · ${fmtKm(x.km)}` : ""}${x.start ? ` · ${hhmm(x.start)}–${hhmm(x.end)}` : ""}${r.kind === "transit" ? `<span class="tr-legs">${x.legs.filter(l => !l.walk).map(l => `<i style="background:${l.colour}">${ctx.esc(l.line || l.mode.toLowerCase().replace("_", " "))}</i>`).join("›")}</span>` : ""}</button>`).join("")}</div>
        ${o ? r.kind === "transit" ? `<ol class="tr-steps">${o.legs.map(l => `<li><span class="tr-sw" style="background:${l.colour}"></span><b>${hhmm(l.start)}</b> ${l.walk ? `Walk to ${ctx.esc(l.to)} <small>(${fmtDur(l.dur)})</small>` : `${ctx.esc(l.agency ? l.agency + " " : "")}<b>${ctx.esc(l.line)}</b>${l.head ? ` towards ${ctx.esc(l.head)}` : ""}: ${ctx.esc(l.from)} → ${ctx.esc(l.to)} <small>(${fmtDur(l.dur)})</small>`}</li>`).join("")}<li><b>${hhmm(o.end)}</b> Arrive</li></ol>`
          : `<ol class="tr-steps">${o.steps.map(s => `<li>${ctx.esc(s.t)} <small>${s.km ? fmtKm(s.km) : ""}</small></li>`).join("")}</ol>` : ""}` : `<p class="ap-note">Choose a start and an end. Public transport covers rail, Tube, tram, bus and ferry timetables across Great Britain (Transitous, from the operators' open data); roads, cycling, walking and hiking use OpenStreetMap (Valhalla).</p>`}
      <p class="tr-src">Routing: Valhalla (FOSSGIS, openstreetmap.de) and Transitous (MOTIS), free services with fair-use limits. Map data © OpenStreetMap contributors. Timetables can differ from what runs on the day; check with the operator.</p>`;
  }
  function reach(ctx, el) {
    const I = S.iso;
    el.innerHTML = `<p class="ap-note">Everywhere you can reach from a point within a time, and the places inside it.</p>${`<div class="tr-pl"><span class="tr-dot from"></span><input data-trq="iso" placeholder="From: a station, town or address" value="${ctx.esc((I.from || {}).label || "")}" autocomplete="off"><button class="btn sm" data-trpick="iso">Map</button><ul class="tr-hits" data-trhits="iso" hidden></ul></div>`}
      <div class="tr-modes">${[["auto", "Car", "#1d5590"], ["transit", "Train and public transport", "#d63a2f"], ["bicycle", "Cycle", "#2e8b57"], ["pedestrian", "Walk", "#7b4fa6"]].map(([k, l, c]) => `<button class="${I.mode === k ? "on" : ""}" data-trimode="${k}" style="--c:${c}">${l}</button>`).join("")}</div>
      <div class="ap-row">${[15, 30, 45, 60].map(m => `<button class="btn sm ${I.mins === m ? "primary" : ""}" data-trmins="${m}">${m} min</button>`).join("")}</div>
      <div data-trisoout>${I.out || ""}</div><p class="tr-src">Isochrones: Valhalla (FOSSGIS). Places are counted when their centre is inside the area.</p>`;
  }
  async function runIso(ctx) {
    const I = S.iso; if (!I.from) return; ensureLayers(ctx);
    const body = { locations: [{ lat: I.from.lat, lon: I.from.lon }], costing: I.mode, contours: [{ time: I.mins }], polygons: true, denoise: 0.3 };
    I.out = `<p class="ap-note">Working it out…</p>`; if (PANEL && PANEL.isoEl) reach(ctx, PANEL.isoEl);
    if (I.mode === "transit") return reachTransit(ctx);
    try {
      const j = await fetch(`${VALHALLA}/isochrone?json=${encodeURIComponent(JSON.stringify(body))}`).then(r => r.json());
      const col = (MODES.find(m => m[0] === I.mode) || [])[2]; (j.features || []).forEach(f => { f.properties = { c: col }; });
      setData(ctx, "tr-iso", j.features || []);
      const poly = (j.features || [])[0]; const ring = poly && (poly.geometry.type === "Polygon" ? poly.geometry.coordinates[0] : poly.geometry.coordinates[0][0]);
      const inside = (pt, rg) => { let c = false; for (let i = 0, k = rg.length - 1; i < rg.length; k = i++) { const [xi, yi] = rg[i], [xk, yk] = rg[k]; if ((yi > pt[1]) !== (yk > pt[1]) && pt[0] < (xk - xi) * (pt[1] - yi) / (yk - yi) + xi) c = !c; } return c; };
      const lv = "council";
      const codes = ring ? Object.keys(ctx.P).filter(c => ctx.P[c].level === lv && ctx.P[c].pt && inside(ctx.P[c].pt, ring)) : [];
      const pop = codes.reduce((s, c) => s + (((ctx.value("population", c) || {}).v) || 0), 0);
      const hubs = ring && ctx.POI ? ctx.POI.items.filter(i => i.k !== "finance" && inside([i.lon, i.lat], ring)).sort((a, b) => (b.v || 0) - (a.v || 0)).slice(0, 8) : [];
      I.out = ring ? `<p><b>${codes.length}</b> councils have their centre within ${I.mins} minutes${pop ? ` (about <b>${ctx.fmtBig(pop)}</b> people)` : ""}.</p>${codes.length ? `<p class="ap-note">${codes.slice(0, 24).map(c => ctx.esc(ctx.nameOf(c))).join(", ")}${codes.length > 24 ? "…" : ""}</p><button class="btn sm" data-trisosel>Select them on the map</button>` : ""}
        ${hubs.length ? `<h4>Stations, airports and ports within reach</h4><ul class="tr-hubs">${hubs.map(i => `<li><button class="linkish" data-trpoi="${i.id}">${ctx.esc(i.n)}</button></li>`).join("")}</ul>` : ""}` : `<p class="ap-note">No area came back.</p>`;
      I.codes = codes;
      ctx.map.fitBounds(bboxOf(ring), { padding: 80, duration: 900 });
    } catch (e) { I.out = `<p class="ap-note">The isochrone service didn't answer. Try again in a moment.</p>`; }
    if (PANEL && PANEL.isoEl) reach(ctx, PANEL.isoEl);
  }
  // 0.8.1: by train (and any public transport): every stop reachable within the time (Transitous "one to all"), plus the
  // walk from it with the minutes left (at most 15), drawn as soft circles; a council counts if its centre is inside one
  async function reachTransit(ctx) {
    const I = S.iso, when = new Date(); when.setMinutes(Math.ceil(when.getMinutes() / 15) * 15, 0, 0);
    try {
      const j = await fetch(`https://api.transitous.org/api/v1/one-to-all?one=${I.from.lat},${I.from.lon}&maxTravelTime=${I.mins}&time=${encodeURIComponent(when.toISOString())}`).then(r => r.json());
      const seen = new Map(); (j.all || []).forEach(x => { const k = x.place.lat.toFixed(3) + "," + x.place.lon.toFixed(3), left = I.mins - x.duration; if (left > 0 && (!seen.has(k) || seen.get(k).left < left)) seen.set(k, { lon: x.place.lon, lat: x.place.lat, left, name: x.place.name, rail: (x.place.modes || []).some(m => /RAIL|SUBWAY|METRO|HIGHSPEED/.test(m)) }); });
      const pts = [...seen.values()].sort((a, b) => b.left - a.left).slice(0, 4000), m = left => Math.min(15, left) * 80;   // metres walked at ~5 km/h
      const circle = p => { const r = m(p.left) / 111320, cs = []; for (let k = 0; k <= 16; k++) { const a = k / 16 * 2 * Math.PI; cs.push([p.lon + r * Math.cos(a) / Math.cos(p.lat * Math.PI / 180), p.lat + r * Math.sin(a)]); } return cs; };
      setData(ctx, "tr-iso", pts.map(p => ({ type: "Feature", properties: { c: "#d63a2f" }, geometry: { type: "Polygon", coordinates: [circle(p)] } })));
      const km = (a, b) => Math.hypot((a[0] - b[0]) * 111.3 * Math.cos(a[1] * Math.PI / 180), (a[1] - b[1]) * 111.3);
      const codes = Object.keys(ctx.P).filter(c => ctx.P[c].level === "council" && ctx.P[c].pt && pts.some(p => km(ctx.P[c].pt, [p.lon, p.lat]) * 1000 < m(p.left)));
      const pop = codes.reduce((s, c) => s + (((ctx.value("population", c) || {}).v) || 0), 0), stations = pts.filter(p => p.rail).length;
      I.codes = codes;
      I.out = `<p><b>${seen.size.toLocaleString("en-GB")}</b> stops reachable within ${I.mins} minutes (${stations} by rail, Tube or tram), leaving now-ish; <b>${codes.length}</b> councils have their centre within walking distance of one${pop ? ` (about <b>${ctx.fmtBig(pop)}</b> people)` : ""}.</p>${codes.length ? `<p class="ap-note">${codes.slice(0, 24).map(c => ctx.esc(ctx.nameOf(c))).join(", ")}${codes.length > 24 ? "…" : ""}</p><button class="btn sm" data-trisosel>Select them on the map</button>` : ""}
        <p class="tr-src">Timetables: Transitous (MOTIS). Walking at about 5 km/h for the minutes left, up to 15.</p>`;
      let b = [180, 90, -180, -90]; pts.forEach(p => { b = [Math.min(b[0], p.lon), Math.min(b[1], p.lat), Math.max(b[2], p.lon), Math.max(b[3], p.lat)]; });
      if (pts.length) ctx.map.fitBounds([[b[0], b[1]], [b[2], b[3]]], { padding: 80, duration: 900, maxZoom: 12 });
    } catch (e) { I.out = `<p class="ap-note">The public transport service didn't answer. Try again in a moment.</p>`; }
    if (PANEL && PANEL.isoEl) reach(ctx, PANEL.isoEl);
  }
  const bboxOf = ring => { let b = [180, 90, -180, -90]; (ring || []).forEach(([x, y]) => { b = [Math.min(b[0], x), Math.min(b[1], y), Math.max(b[2], x), Math.max(b[3], y)]; }); return [[b[0], b[1]], [b[2], b[3]]]; };
  function trails(ctx, el) {
    el.innerHTML = `<p>Waymarked hiking and cycling routes across the UK, from National Trails and the National Cycle Network to local paths (OpenStreetMap, via Waymarked Trails).</p>
      <label class="ck"><input type="checkbox" data-trtrail="hiking" ${S.trails.hiking ? "checked" : ""}> Hiking and walking routes</label><label class="ck"><input type="checkbox" data-trtrail="cycling" ${S.trails.cycling ? "checked" : ""}> Cycle routes</label>
      <p class="ap-note">Plan a walk along them with <b>Hike</b> in Directions: it prefers paths and tracks and accepts hills. Zoom in for the route names.</p>
      <p class="tr-src">Trail maps © waymarkedtrails.org and OpenStreetMap contributors (CC BY-SA). Shown as an overlay; not every right of way is waymarked.</p>`;
  }
  function hubs(ctx, el) {
    const P = ctx.POI; if (!P) { el.innerHTML = `<p class="ap-note">The hubs file isn't loaded.</p>`; return; }
    const top = k => P.items.filter(i => i.k === k).sort((a, b) => (b.v || 0) - (a.v || 0)).slice(0, k === "station" ? 25 : 15);
    const tab = (k, unit) => `<table class="mo-tab">${top(k).map((i, n) => `<tr><td>${n + 1}. <button class="linkish" data-trpoi="${i.id}">${ctx.esc(i.n)}</button></td><td class="num">${ctx.fmtBig(i.v)}</td><td>${ctx.CH.spark((() => { const y0 = i.s ? i.s[0] : 0; return (i.s || []).slice(1).map((v, j) => [y0 + j, v]); })(), { w: 70, h: 16 })}</td></tr>`).join("")}</table><p class="tr-src">${ctx.esc(unit)}. ${ctx.esc(P.sources[k])}.</p>`;
    el.innerHTML = `<div class="tr-tabs">${[["station", "Stations"], ["airport", "Airports"], ["port", "Ports"]].map(([k, l]) => `<button class="${(hubs.k || "station") === k ? "on" : ""}" data-trhub="${k}">${l}</button>`).join("")}</div>${tab(hubs.k || "station", P.units[hubs.k || "station"])}
      <p class="ap-note">Bus, tram and ferry stops appear on the map from street zoom; click one for its details (live arrivals in London).</p>`;
  }
  function planner(ctx, el) {
    const has = id => ctx.M[id];
    const rows = [["rail_usage", "Rail journeys", "Entries and exits at the area's stations (ORR)"], ["rail_stations", "Railway stations", "How many stations"], ["air_pax", "Airport passengers", "Terminal passengers (CAA)"], ["port_freight", "Port freight", "Tonnes handled (DfT)"], ["bus_stops", "Bus and coach stops", "NaPTAN"], ["bus_stop_density", "Bus stop coverage", "Stops per km²"]].filter(r => has(r[0]));
    const nets = [["inf_rail", "Railways"], ["inf_roads", "Motorways and A roads"], ["inf_ferry", "Ferry routes"], ["inf_freight", "Freight routes from ports"], ["inf_power", "Electricity transmission lines"]].filter(r => has(r[0]));
    el.innerHTML = `<h4>Networks, drawn as their routes</h4><ul class="tr-plan">${nets.map(([id, l]) => `<li><button class="btn sm" data-trmap="${id}">${ctx.isMapped(id) ? "✓ " : ""}${l}</button> <small>${ctx.esc(ctx.M[id].desc || "")}</small></li>`).join("")}</ul>
      <h4>Figures by place</h4><p class="ap-note">The transport figures on the map, by council (and added up for regions and nations).</p><ul class="tr-plan">${rows.map(([id, l, d]) => `<li><button class="btn sm" data-trmap="${id}">${ctx.isMapped(id) ? "✓ " : ""}${l}</button> <small>${ctx.esc(d)}</small> <button class="linkish" data-trinfo="${id}">ⓘ</button></li>`).join("")}</ul>
      <p class="ap-note">Coming next: road traffic counts (DfT), road casualties (STATS19), journey times to services (DfT connectivity), how people get to work (Census 2021).</p>`;
  }

  // ---------- events (one handler on the document: panels re-render) ----------
  let pickFor = null, qT = 0;
  function bind(ctx) {
    if (bind.done) return; bind.done = true;
    // Show suggestions under a place box: Atlas's own places straight away, then addresses (from 3 letters) once
    // typing pauses. Enter searches at once instead of waiting for the pause.
    async function showHits(q) {
      const ul = q.parentNode.querySelector(".tr-hits"), v = q.value.trim();
      if (v.length < 2) { ul.hidden = true; return; }
      const draw = (hits, busy) => {
        ul._hits = hits;
        const rows = hits.map((h, i) => `<li data-trhit="${i}">${ctx.esc(h.label)} <small>${ctx.esc(h.sub || "")}</small></li>`).join("");
        ul.innerHTML = rows + (busy ? `<li class="none">Looking up addresses…</li>` : "") || `<li class="none">Nothing found</li>`; ul.hidden = false;
      };
      const own = await findPlaces(ctx, v, false);
      if (q.value.trim() !== v) return;
      if (v.length < 3) { draw(own); return; }
      draw(own, true);
      const addr = await findAddresses(v);
      if (addr === null || q.value.trim() !== v) return;   // replaced by a newer search, or the text changed while we waited
      draw(own.concat(addr));
    }
    document.addEventListener("input", e => {
      const q = e.target.closest && e.target.closest("[data-trq]"); if (!q) return;
      clearTimeout(qT); qT = setTimeout(() => showHits(q), 300);
    });
    document.addEventListener("keydown", e => {
      if (e.key !== "Enter" || e.isComposing) return;   // not while an input method (e.g. Vietnamese or Chinese) is composing
      const q = e.target.closest && e.target.closest("[data-trq]"); if (!q) return;
      e.preventDefault(); clearTimeout(qT); showHits(q);
    });
    document.addEventListener("mousedown", e => {
      const li = e.target.closest && e.target.closest("[data-trhit]"); if (!li) return;
      e.preventDefault(); const ul = li.closest(".tr-hits"), h = ul._hits[+li.dataset.trhit], which = ul.dataset.trhits; ul.hidden = true;
      if (which === "iso") { S.iso.from = h; runIso(ctx); } else { S[which] = h; drawEnds(ctx); if (S.from && S.to) route(ctx); else rerender(ctx); }
    });
    document.addEventListener("click", e => {
      const t = e.target.closest && e.target.closest("[data-trmode],[data-tropt],[data-trswap],[data-trpick],[data-trimode],[data-trmins],[data-trisosel],[data-trpoi],[data-trhub],[data-trmap],[data-trinfo]"); if (!t) return;
      const d = t.dataset;
      if (d.trmode) { S.mode = d.trmode; if (S.from && S.to) route(ctx); else rerender(ctx); }
      else if (d.tropt != null) { S.sel = +d.tropt; rerender(ctx); drawRoutes(ctx); }
      else if (t.hasAttribute("data-trswap")) { [S.from, S.to] = [S.to, S.from]; drawEnds(ctx); if (S.from && S.to) route(ctx); else rerender(ctx); }
      else if (d.trpick) { pickFor = d.trpick; ctx.map.getCanvas().style.cursor = "crosshair"; ctx.toast("Click the map to choose the " + (pickFor === "iso" ? "starting point" : pickFor === "from" ? "start" : "end") + "."); }
      else if (d.trimode) { S.iso.mode = d.trimode; runIso(ctx); }
      else if (d.trmins) { S.iso.mins = +d.trmins; runIso(ctx); }
      else if (t.hasAttribute("data-trisosel")) { ctx.select(S.iso.codes || []); }
      else if (d.trpoi) { const i = ctx.POI.items.find(x => x.id === d.trpoi); if (i) { ctx.map.flyTo({ center: [i.lon, i.lat], zoom: Math.max(ctx.map.getZoom(), 12), duration: 1000 }); ctx.openPoiCard(i.id); } }
      else if (d.trhub) { hubs.k = d.trhub; if (PANEL && PANEL.hubEl) hubs(ctx, PANEL.hubEl); }
      else if (d.trmap) { ctx.mapAdd(d.trmap); setTimeout(() => PANEL && PANEL.planEl && planner(ctx, PANEL.planEl), 200); }
      else if (d.trinfo) ctx.openInfo(d.trinfo);
    });
    document.addEventListener("change", e => {
      const tr = e.target.closest && e.target.closest("[data-trtrail]"); if (tr) { ensureLayers(ctx); S.trails[tr.dataset.trtrail] = tr.checked; ctx.map.setLayoutProperty("tr-wm-" + tr.dataset.trtrail, "visibility", tr.checked ? "visible" : "none"); return; }
      if (e.target.matches && e.target.matches("[data-trwhen]")) { S.when = e.target.value; if (S.from && S.to) route(ctx); }
    });
    ctx.map.on("click", ev => {
      if (!pickFor) return;
      const p = { label: `${ev.lngLat.lat.toFixed(4)}, ${ev.lngLat.lng.toFixed(4)}`, lon: ev.lngLat.lng, lat: ev.lngLat.lat };
      ctx.map.getCanvas().style.cursor = "";
      if (pickFor === "iso") { S.iso.from = p; pickFor = null; runIso(ctx); return; }
      S[pickFor] = p; pickFor = null; drawEnds(ctx); if (S.from && S.to) route(ctx); else rerender(ctx);
    });
  }
  function rerender(ctx) { if (PANEL && PANEL.el && document.body.contains(PANEL.el)) directions(ctx, PANEL.el); }

  window.AtlasApps && AtlasApps.register({
    id: "transport", name: "Atlas Transport", perspective: "transport", accent: "#1d5590", dataNeeds: ["ATLAS_POI"],
    init(ctx) { bind(ctx); ctx.openPanel("directions"); },
    panels: [
      { id: "directions", title: "Directions", render: (ctx, el) => { bind(ctx); PANEL = Object.assign(PANEL || {}, { ctx, el }); directions(ctx, el); }, min: { w: 380, h: 420 } },
      { id: "reach", title: "Reach", blurb: "Everywhere you can get to within a time", render: (ctx, el) => { bind(ctx); PANEL = Object.assign(PANEL || {}, { isoEl: el }); reach(ctx, el); }, min: { w: 360, h: 320 } },
      { id: "trails", title: "Trails", render: (ctx, el) => { bind(ctx); trails(ctx, el); } },
      { id: "hubs", map: {"level": "council", "metrics": ["rail_usage"]}, title: "Stations & hubs", tabs: [["station", "Stations"], ["airport", "Airports"], ["port", "Ports"]], setTab: k => { hubs.k = k; }, render: (ctx, el) => { bind(ctx); PANEL = Object.assign(PANEL || {}, { hubEl: el }); hubs(ctx, el); }, min: { w: 380, h: 360 } },
      { id: "planner", map: {"metrics": ["inf_rail", "inf_roads"]}, title: "Planner data", render: (ctx, el) => { bind(ctx); PANEL = Object.assign(PANEL || {}, { planEl: el }); planner(ctx, el); } },
    ],
    tools: [],
  });
})();
