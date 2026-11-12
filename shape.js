/* Atlas 0.12 · features as shapes in their own right (core). Zoom in and click a river, a flood, a stretch of coast, a
 * National Park or a ferry route, and its card offers:
 *   Show its whole shape     the whole feature outlined on the map (the whole River Tyne, not the bit you clicked),
 *                            drawn over the map without touching the area tiles
 *   Shape to the workspace   the feature as its own tile in the workspace, with its boundary
 * Features that change over time redraw as the time moves: a river carries the recorded floods along it up to the year
 * on Atlas Environment's timeline, a stretch of coast shows the land lost by the epoch chosen, a park is dashed before it
 * was designated. Views register how to find a feature's shape:  AtlasShape.register(kind, id => spec)
 *   spec = { title, kind, colour, features: [GeoJSON], live: () => [GeoJSON] (optional, re-run as time moves), note }
 */
(function () {
  "use strict";
  let ctx = null, cur = null; const RES = {};
  const esc = t => String(t == null ? "" : t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const FC = f => ({ type: "FeatureCollection", features: f || [] });
  function layers() {
    const m = ctx.map; if (m.getSource("shape-sel")) return;
    m.addSource("shape-sel", { type: "geojson", data: FC() });
    m.addLayer({ id: "shape-sel-fill", type: "fill", source: "shape-sel", filter: ["==", ["geometry-type"], "Polygon"], paint: { "fill-color": ["coalesce", ["get", "_c"], "#d0701c"], "fill-opacity": ["coalesce", ["get", "_fo"], 0.18] } });
    m.addLayer({ id: "shape-sel-halo", type: "line", source: "shape-sel", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#ffffff", "line-width": ["interpolate", ["linear"], ["zoom"], 5, 4, 12, 9], "line-opacity": 0.85 } });
    m.addLayer({ id: "shape-sel-line", type: "line", source: "shape-sel", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": ["coalesce", ["get", "_c"], "#d0701c"], "line-width": ["interpolate", ["linear"], ["zoom"], 5, 2, 12, 4.5] } });
    m.on("styledata", () => { if (cur && !m.getSource("shape-sel")) { try { layers(); paint(false); } catch (e) { /* next time */ } } });
  }
  const featsOf = spec => { try { return (spec.live ? spec.live() : spec.features) || []; } catch (e) { console.error(e); return spec.features || []; } };
  function bbox(fs) { let b = [180, 90, -180, -90]; const walk = c => { if (typeof c[0] === "number") { b = [Math.min(b[0], c[0]), Math.min(b[1], c[1]), Math.max(b[2], c[0]), Math.max(b[3], c[1])]; } else c.forEach(walk); }; fs.forEach(f => walk(f.geometry.coordinates)); return b; }
  function paint(fit) {
    if (!cur) return; try { layers(); } catch (e) { ctx.map.once("idle", () => paint(fit)); return; }
    const fs = featsOf(cur); ctx.map.getSource("shape-sel").setData(FC(fs));
    if (fit && fs.length) { const b = bbox(fs); ctx.map.fitBounds([[b[0], b[1]], [b[2], b[3]]], { padding: { top: 100, bottom: 100, left: 80, right: 480 }, duration: 900, maxZoom: 14 }); }
    renderBadge();
  }
  function renderBadge() { // a small label on the map saying what's outlined, with a way to clear it
    let el = document.getElementById("shape-badge"); if (!cur) { if (el) el.hidden = true; return; }
    if (!el) { el = document.createElement("div"); el.id = "shape-badge"; el.className = "shape-badge"; document.body.appendChild(el); el.addEventListener("click", e => { if (e.target.closest("[data-shclear]")) clear(); if (e.target.closest("[data-shws]")) toWS(cur); }); }
    el.hidden = false; el.innerHTML = `<i style="background:${esc(cur.colour || "#d0701c")}"></i><b>${esc(cur.title)}</b>${cur.live ? `<small>${esc(cur.liveNote ? cur.liveNote() : "changes with the time")}</small>` : ""}<button type="button" data-shws title="Send this shape to the workspace">To workspace</button><button type="button" data-shclear aria-label="Clear the outline">×</button>`;
  }
  function show(spec) { cur = spec; paint(true); }
  function clear() { cur = null; if (ctx.map.getSource("shape-sel")) ctx.map.getSource("shape-sel").setData(FC()); renderBadge(); }
  function refresh() { if (cur && cur.live) paint(false); }   // called when the time moves
  function simplify(fs, max) { // keep the workspace light: thin each line to at most max points
    const thin = c => typeof c[0][0] === "number" ? (c.length > max ? c.filter((_, i) => i % Math.ceil(c.length / max) === 0 || i === c.length - 1) : c) : c.map(thin);
    return fs.map(f => ({ type: "Feature", properties: { _c: f.properties._c, _fo: f.properties._fo }, geometry: { type: f.geometry.type, coordinates: thin(f.geometry.coordinates) } }));
  }
  function toWS(spec) {
    const fs = simplify(featsOf(spec), 400);
    ctx.sendToWS({ type: "shape", title: spec.title, shape: { features: fs, colour: spec.colour || "#d0701c", note: [spec.note, spec.liveNote ? spec.liveNote() : ""].filter(Boolean).join(" · ") }, w: 440, h: 380 });
  }
  // the workspace tile: the shape on its own, projected to fit, lines and areas in their colours
  function svg(shape, w, h) {
    const fs = shape.features || []; if (!fs.length) return `<div class="aempty">No shape to draw.</div>`;
    const b = bbox(fs), k = Math.cos((b[1] + b[3]) / 2 * Math.PI / 180), sx = (b[2] - b[0]) * k || 1e-3, sy = (b[3] - b[1]) || 1e-3, s = Math.min((w - 20) / sx, (h - 20) / sy), ox = (w - sx * s) / 2, oy = (h - sy * s) / 2;
    const P = ([x, y]) => `${(ox + (x - b[0]) * k * s).toFixed(1)} ${(oy + (b[3] - y) * s).toFixed(1)}`;
    const path = g => g.type === "LineString" ? "M" + g.coordinates.map(P).join("L") : g.type === "MultiLineString" ? g.coordinates.map(l => "M" + l.map(P).join("L")).join("") : g.type === "Polygon" ? g.coordinates.map(r => "M" + r.map(P).join("L") + "Z").join("") : g.type === "MultiPolygon" ? g.coordinates.map(p => p.map(r => "M" + r.map(P).join("L") + "Z").join("")).join("") : "";
    const kmw = (b[2] - b[0]) * k * 111.3;
    return `<svg class="tile shape-tile" viewBox="0 0 ${w} ${h}">${fs.map(f => { const poly = /Polygon/.test(f.geometry.type), c = f.properties._c || shape.colour; return `<path d="${path(f.geometry)}" fill="${poly ? c : "none"}" fill-opacity="${poly ? (f.properties._fo != null ? f.properties._fo + 0.15 : 0.3) : 0}" stroke="${c}" stroke-width="${poly ? 1.2 : 2.2}" stroke-linejoin="round" stroke-linecap="round" fill-rule="evenodd"/>`; }).join("")}
      <text x="${w - 10}" y="${h - 8}" text-anchor="end" class="shape-scale">${kmw >= 10 ? Math.round(kmw) : kmw.toFixed(1)} km across</text></svg>${shape.note ? `<div class="wsmeta">${esc(shape.note)}</div>` : ""}`;
  }
  function register(kind, fn) { RES[kind] = fn; }
  async function byKey(key, act) { const [kind, ...rest] = String(key).split(":"), fn = RES[kind]; if (!fn) return; const spec = await fn(rest.join(":")); if (!spec) { ctx.toast && ctx.toast("That shape isn't loaded."); return; } if (act === "ws") toWS(spec); else show(spec); }
  function init(c) {
    ctx = c;
    document.addEventListener("click", e => { const b = e.target.closest && e.target.closest("[data-shape]"); if (!b) return; e.preventDefault(); e.stopPropagation(); byKey(b.dataset.shape, b.dataset.shapeAct); }, true);
    if (ctx.onDate) ctx.onDate(refresh);
    document.addEventListener("keydown", e => { if (e.key === "Escape" && cur && !document.querySelector(".fwin:not([hidden])")) clear(); });
  }
  // buttons a card puts under its title bar for a feature that has a shape
  const buttons = key => `<div class="pc-shape"><button type="button" data-shape="${esc(key)}">Show its whole shape</button><button type="button" data-shape="${esc(key)}" data-shape-act="ws">Shape to the workspace</button></div>`;
  window.AtlasShape = { init, register, show, clear, refresh, toWS, svg, byKey, buttons, get current() { return cur; } };
})();
