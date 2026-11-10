/* Atlas Environment (0.9.1): zones where the environment is changing, on a timeline from the past into official
 * projections. Its own layers on the map (not the area boundaries or metrics): recorded floods, coastal erosion
 * forecasts, hot summer days, wildfire burnt areas, and National Parks and Ramsar wetlands by the year they were
 * designated. Data: data/envzones/*.js (pipeline/build_envzones.py), each loaded the first time it is needed.
 * Talks to the core only through ctx (ctx.map for its own layers, as Atlas Transport does).
 */
(function () {
  "use strict";
  const V = "0910", P = "env-";
  const FILE = { floods: "floods", coast: "coast", heat: "heat", cons: "conservation", fire: "fire" };
  const D = {}, WAIT = {};
  const SRC_COL = { river: "#1f6fb4", sea: "#11888f", surface: "#7b4fa6", ground: "#8a6a3b", other: "#6b7480" };
  const SRC_NAME = { river: "River", sea: "Sea", surface: "Surface water and drains", ground: "Groundwater", other: "Other or unknown" };
  const NAT = { E: "England", W: "Wales", S: "Scotland", NI: "Northern Ireland" };
  const HEAT_RAMP = [0, "rgba(255,240,200,0)", 0.5, "#fff1c1", 2, "#fdd17f", 5, "#f99d4b", 10, "#e8592b", 20, "#b8202b", 40, "#6b0f2a"];
  const S = { year: null, fut: null, heat: "b01", heatPicked: false, on: { floods: true, coast: true, heat: false, cons: true, fire: true }, playing: null };
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
      m.addLayer({ id: P + "floods-line", type: "line", source: P + "floods", minzoom: 10, paint: { "line-color": "#0b3d6e", "line-width": 0.6, "line-opacity": 0.6 } }, b);
    }
    if (key === "coast") {
      m.addSource(P + "coast", { type: "geojson", data: { type: "FeatureCollection", features: D.coast.features } });
      m.addLayer({ id: P + "coast-fill", type: "fill", source: P + "coast", paint: { "fill-color": ["case", ["==", ["get", "e"], 2055], "#c0392b", "#f08a5d"], "fill-opacity": 0.6 } }, b);
      m.addLayer({ id: P + "coast-line", type: "line", source: P + "coast", paint: { "line-color": ["case", ["==", ["get", "e"], 2055], "#8e1f14", "#c0392b"], "line-width": ["interpolate", ["linear"], ["zoom"], 5, 2.5, 10, 1.2], "line-opacity": 0.9 } }, b);
    }
    if (key === "heat") {
      m.addSource(P + "heat", { type: "geojson", data: { type: "FeatureCollection", features: D.heat.features } });
      m.addLayer({ id: P + "heat-fill", type: "fill", source: P + "heat", paint: { "fill-color": ["interpolate", ["linear"], ["coalesce", ["at", 0, ["get", "v"]], 0], ...HEAT_RAMP], "fill-opacity": 0.62, "fill-antialias": false } }, m.getLayer(P + "floods-heat") ? P + "floods-heat" : b);
    }
    if (key === "cons") {
      m.addSource(P + "cons", { type: "geojson", data: { type: "FeatureCollection", features: D.cons.features } });
      m.addLayer({ id: P + "cons-fill", type: "fill", source: P + "cons", paint: { "fill-color": ["case", ["==", ["get", "k"], "np"], "#4f772d", "#2a9d8f"], "fill-opacity": ["case", ["==", ["get", "k"], "np"], 0.16, 0.3] } }, b);
      m.addLayer({ id: P + "cons-line", type: "line", source: P + "cons", paint: { "line-color": ["case", ["==", ["get", "k"], "np"], "#31572c", "#1d6f66"], "line-width": ["case", ["==", ["get", "k"], "np"], 1.8, 1], "line-dasharray": ["case", ["==", ["get", "y"], null], ["literal", [2, 1.5]], ["literal", [1, 0]]] } }, b);
    }
    if (key === "fire") {
      m.addSource(P + "fire", { type: "geojson", data: { type: "FeatureCollection", features: D.fire.features } });
      m.addLayer({ id: P + "fire-fill", type: "fill", source: P + "fire", paint: { "fill-color": "#e85d04", "fill-opacity": 0.75 } }, b);
      m.addLayer({ id: P + "fire-pt", type: "circle", source: P + "fire", maxzoom: 9, paint: { "circle-radius": 4, "circle-color": "#e85d04", "circle-stroke-color": "#fff", "circle-stroke-width": 1 } }, b);
    }
    bindClicks(key);
  }
  const LAYERS = { floods: ["floods-heat", "floods-fill", "floods-line"], coast: ["coast-fill", "coast-line"], heat: ["heat-fill"], cons: ["cons-fill", "cons-line"], fire: ["fire-fill", "fire-pt"] };
  function shown(key) { return S.on[key] && (key === "coast" ? !!S.fut : key === "fire" ? Y() >= 2026 : true); }
  function apply() {
    const m = CTX && CTX.map; if (!m) return;
    Object.keys(LAYERS).forEach(key => {
      if (S.on[key] && !D[key]) { load(key).then(() => { ensure(key); apply(); renderAll(); }).catch(e => CTX.toast(e.message)); return; }
      if (!D[key]) return; ensure(key);
      LAYERS[key].forEach(id => m.getLayer(P + id) && m.setLayoutProperty(P + id, "visibility", shown(key) ? "visible" : "none"));
    });
    const y = Y();
    const past = ["<=", ["get", "y"], y];
    ["floods-heat", "floods-fill", "floods-line"].forEach(id => m.getLayer(P + id) && m.setFilter(P + id, past));
    if (m.getLayer(P + "floods-fill")) m.setPaintProperty(P + "floods-fill", "fill-opacity", ["interpolate", ["linear"], ["-", y, ["get", "y"]], 0, 0.8, 5, 0.55, 25, 0.3]);
    if (m.getLayer(P + "coast-fill")) ["coast-fill", "coast-line"].forEach(id => m.setFilter(P + id, ["<=", ["get", "e"], S.fut || 0]));
    if (m.getLayer(P + "heat-fill")) m.setPaintProperty(P + "heat-fill", "fill-color", ["interpolate", ["linear"], ["coalesce", ["at", heatIdx(), ["get", "v"]], 0], ...HEAT_RAMP]);
    const cons = ["any", ["==", ["get", "y"], null], ["<=", ["get", "y"], y]];
    ["cons-fill", "cons-line"].forEach(id => m.getLayer(P + id) && m.setFilter(P + id, cons));
  }
  let bound = {};
  function bindClicks(key) {
    if (bound[key]) return; bound[key] = true;
    const m = CTX.map, ids = { floods: P + "floods-fill", coast: P + "coast-fill", heat: P + "heat-fill", cons: P + "cons-fill", fire: P + "fire-fill" };
    m.on("click", ids[key], ev => { const f = ev.features && ev.features[0]; if (f) popup(key, f, ev.lngLat); ev.originalEvent && (ev.originalEvent._envHandled = true); });
    m.on("mouseenter", ids[key], () => { m.getCanvas().style.cursor = "pointer"; });
    m.on("mouseleave", ids[key], () => { m.getCanvas().style.cursor = ""; });
  }
  let POP = null;
  function popup(key, f, at) {
    if (!window.maplibregl) return;
    const p = f.properties, e = CTX.esc;
    let h = "";
    if (key === "floods") {
      const ev = (D.floods.events || []).find(x => x.id === p.ev) || {};
      h = `<b>${e(ev.n || "Recorded flood")}</b><br>${e(longDate(ev.d))} · ${e(SRC_NAME[p.s] || p.s)}<br>${fmt(ev.ha)} ha flooded${ev.k > 1 ? ` (${ev.k} outlines)` : ""} · ${NAT[ev.nat] || ""}`;
    } else if (key === "coast") {
      h = `<b>Coastal erosion by ${p.e}</b><br>${typeof p.d === "number" ? `Up to ${fmt(p.d)} m of land lost` : e(p.d || "")}<br><small>${e(p.smp || "")}${p.pol ? " · policy: " + e(p.pol) : ""}</small><br><small>Forecast with shoreline management plans delivered (higher central sea level rise)</small>`;
    } else if (key === "heat") {
      const v = typeof p.v === "string" ? JSON.parse(p.v) : p.v;
      h = `<b>Days above 30 °C a year</b><table class="env-mini">${D.heat.steps.map((s, i) => `<tr class="${i === heatIdx() ? "on" : ""}"><td>${e(s[1])}</td><td>${fmt(v[i])}</td></tr>`).join("")}</table><small>12 km square, UKCP18 median</small>`;
    } else if (key === "cons") {
      h = `<b>${e(p.n)}</b><br>${p.k === "np" ? "National Park" : "Ramsar wetland of international importance"} · ${NAT[p.nat] || ""}<br>${p.y ? "Designated " + p.y : "Designation date not published in the open boundary data"}`;
    } else if (key === "fire") {
      h = `<b>Wildfire burnt area</b><br>Seen by satellite on ${e(longDate(p.d))}<br>${fmt(p.ha)} ha`;
    }
    if (POP) POP.remove();
    POP = new maplibregl.Popup({ closeButton: true, maxWidth: "280px", className: "env-pop" }).setLngLat(at).setHTML(h).addTo(CTX.map);
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

  function timeline(ctx, el) {
    ELS.timeline = el; const e = ctx.esc, y = Y(), hs = D.heat ? D.heat.steps : [["b81", "1981–2000"], ["b01", "2001–2020"], ["g15", "+1.5 °C"], ["g20", "+2 °C"], ["g25", "+2.5 °C"], ["g30", "+3 °C"], ["g40", "+4 °C"]];
    const fl = D.floods, upTo = fl ? fl.events.filter(x => +x.d.slice(0, 4) <= y) : [], inYear = fl ? fl.events.filter(x => +x.d.slice(0, 4) === y) : [];
    const recent = fl ? fl.events.filter(x => { const yy = +x.d.slice(0, 4); return yy <= y && yy > y - 10; }) : [];
    const cons = D.cons ? D.cons.features.filter(f => f.properties.y && f.properties.y <= y) : [];
    el.innerHTML = `
      <div class="env-tl">
        <div class="env-when"><button class="env-play" data-envplay title="${S.playing ? "Pause" : "Play the years"}">${S.playing ? "❚❚" : "▶"}</button>
          <b class="env-year">${S.fut ? "By " + S.fut : y}</b><span class="env-mode">${S.fut ? "forecast" : y === TODAY_Y ? "today" : "recorded"}</span></div>
        <input type="range" class="env-range" data-envyear min="1945" max="${TODAY_Y}" step="1" value="${y}" aria-label="Year" ${S.fut ? 'style="opacity:.45"' : ""}>
        <div class="env-ticks"><span>1945</span><span>1970</span><span>2000</span><span>Today</span></div>
        <div class="env-future"><span>Future</span>${[2055, 2105].map(f => `<button class="${S.fut === f ? "on" : ""}" data-envfut="${f}">By ${f}</button>`).join("")}</div>
      </div>
      <div class="env-layers">${[["floods", "Floods (recorded)", "#1f6fb4"], ["coast", "Coastal erosion (forecast)", "#c0392b"], ["heat", "Hot summer days", "#e8592b"], ["cons", "National Parks and Ramsar wetlands", "#4f772d"], ["fire", "Wildfire (satellite, 2026)", "#e85d04"]]
        .map(([k, l, c]) => `<label style="--c:${c}"><input type="checkbox" data-envon="${k}" ${S.on[k] ? "checked" : ""}><i></i>${l}${S.on[k] && !D[k] ? " <small>loading…</small>" : ""}</label>`).join("")}</div>
      ${S.on.heat ? `<div class="env-heat"><span>Heat at</span>${hs.map((s, i) => `<button class="${i === heatIdx() ? "on" : ""}" data-envheat="${s[0]}">${e(s[1])}</button>`).join("")}
        <p class="ap-note">The last five are levels of global warming above 1850–1900, not dates: the Met Office doesn't tie them to years. Current international policies point to about 2.4–2.8 °C. ${S.heatPicked ? `<a href="#" data-envheatauto>Follow the timeline</a>` : "Following the timeline (pick a level to fix it)."}</p></div>` : ""}
      <div class="env-sum">
        ${S.on.floods ? `<p><b>${fmt(upTo.length)}</b> floods recorded up to ${y}${S.fut ? "" : `, <b>${fmt(inYear.length)}</b> in ${y}`}; <b>${fmt(recent.length)}</b> in the ten years to ${y}.</p>` : ""}
        ${S.on.coast ? `<p>${S.fut ? `Coastline forecast to erode by <b>${S.fut}</b>${S.fut === 2105 ? " (red: by 2055, orange: 2055–2105)" : ""}.` : "Coastal erosion forecasts show under <b>Future</b>."}</p>` : ""}
        ${S.on.cons ? `<p><b>${cons.filter(f => f.properties.k === "np").length}</b> National Parks and <b>${cons.filter(f => f.properties.k === "ramsar").length}</b> dated Ramsar wetlands designated by ${y}; other Ramsar sites are dashed (protected today, date not in the open data).</p>` : ""}
        ${S.on.heat ? `<p>Heat: <b>${e(heatKey()[1])}</b>${D.heat ? `, UK average ${fmt(avgHeat(heatIdx()))} days above 30 °C a year` : ""}.</p>` : ""}
      </div>
      ${S.on.floods ? `<div class="env-key">${Object.keys(SRC_COL).map(k => `<span><i style="background:${SRC_COL[k]}"></i>${SRC_NAME[k]}</span>`).join("")}</div><p class="ap-note">Zoomed out, recorded floods show as hot zones (darker = more and larger floods); zoom in for each outline. Brighter outlines are more recent.</p>` : ""}
      <p class="ap-note">Coverage: floods for England and Wales; coastal erosion for England and Wales; heat for the whole UK; protected areas for all four nations. See <a href="#" data-envsources>Sources</a>.</p>`;
    el.oninput = ev => { if (ev.target.matches("[data-envyear]")) { stopPlay(); setYear(+ev.target.value); } };
    el.onclick = ev => {
      const t = ev.target;
      if (t.closest("[data-envplay]")) play();
      const f = t.closest("[data-envfut]"); if (f) setFut(S.fut === +f.dataset.envfut ? null : +f.dataset.envfut);
      const h = t.closest("[data-envheat]"); if (h) { S.heat = h.dataset.envheat; S.heatPicked = true; apply(); renderAll(); }
      if (t.closest("[data-envheatauto]")) { ev.preventDefault(); S.heatPicked = false; apply(); renderAll(); }
      if (t.closest("[data-envsources]")) { ev.preventDefault(); ctx.openPanel("sources"); }
    };
    el.onchange = ev => { const c = ev.target.closest("[data-envon]"); if (c) { S.on[c.dataset.envon] = c.checked; apply(); renderAll(); } };
  }
  function avgHeat(i) { const v = D.heat.features.map(f => f.properties.v[i]).filter(x => x != null); return v.reduce((a, b) => a + b, 0) / (v.length || 1); }

  function bars(rows, w = 300, h = 90, col = "#1f6fb4", mark) {
    const max = Math.max(1, ...rows.map(r => r[1])), bw = w / rows.length;
    return `<svg class="env-bars" viewBox="0 0 ${w} ${h + 14}" preserveAspectRatio="none">${rows.map((r, i) => `<rect x="${i * bw}" y="${h - r[1] / max * h}" width="${Math.max(1, bw - 1)}" height="${r[1] / max * h}" fill="${mark != null && r[0] === mark ? "#0b3d6e" : col}"><title>${r[0]}: ${fmt(r[1])}</title></rect>`).join("")}
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

  const PANELS = { timeline, floods, coast, heat, conservation, sources };
  function bind(ctx) {
    if (CTX) return; CTX = ctx;
    TODAY_Y = +String(ctx.today || "2026").slice(0, 4) || 2026; if (S.year == null) S.year = TODAY_Y;
    const m = ctx.map; if (!m) return;
    m.on("styledata", () => { Object.keys(FILE).forEach(k => { if (D[k] && !m.getSource(P + k)) { bound[k] = false; ensure(k); } }); apply(); });
  }

  window.AtlasApps && AtlasApps.register({
    id: "environment", name: "Atlas Environment", perspective: "environment", accent: "#4f772d", dataNeeds: [],
    init(ctx) { bind(ctx); ctx.mapOnly([]); ctx.view([-3.2, 54.6], 5.3); apply(); ctx.openPanel("timeline"); },
    panels: [
      { id: "timeline", title: "Timeline", blurb: "Zones on a timeline, from recorded history into official forecasts", render: (ctx, el) => { bind(ctx); timeline(ctx, el); }, min: { w: 380, h: 440 } },
      { id: "floods", title: "Floods", blurb: "Every recorded flood in England and Wales", render: (ctx, el) => { bind(ctx); floods(ctx, el); }, min: { w: 360, h: 380 } },
      { id: "coast", title: "Coast", blurb: "Coastal erosion forecast to 2055 and 2105", render: (ctx, el) => { bind(ctx); coast(ctx, el); }, min: { w: 360, h: 380 } },
      { id: "heat", title: "Heat", blurb: "Hot summer days, today and as the world warms", render: (ctx, el) => { bind(ctx); heat(ctx, el); }, min: { w: 360, h: 380 } },
      { id: "conservation", title: "Conservation", blurb: "National Parks and Ramsar wetlands by year designated", render: (ctx, el) => { bind(ctx); conservation(ctx, el); }, min: { w: 360, h: 380 } },
      { id: "sources", title: "Sources", blurb: "Where the zones come from, nation by nation", render: (ctx, el) => { bind(ctx); sources(ctx, el); }, min: { w: 420, h: 300 } },
    ],
    tools: [],
  });
})();
