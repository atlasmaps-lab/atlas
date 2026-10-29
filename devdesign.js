/* Atlas 1.8 · the Design panel, for developers only (open index.html?dev; ATLAS menu → Design, or Ctrl/Cmd+Shift+D).
 * Changes anything about Atlas's look, live:
 *   Settings   every CSS setting (colours, shadows, fonts…) in light and dark mode
 *   Elements   pick anything on screen and change its CSS (background, border, rounding, spacing, type, size, shadow…)
 *   Palettes   parties, causes, alignments, perspective colours and ramps, map boundary colours, charts, clusters, no data
 *   Map        every map layer's paint (Atlas's layers and the basemap's)
 *   CSS        the CSS this produces, plus any extra CSS you write
 * Edits stay in this browser until you save: "Save to the atlas folder" writes theme.js (or download it and put it in the
 * atlas folder), which everyone then sees once it's committed.
 */
(function () {
  "use strict";
  if (!window.AtlasTheme || !AtlasTheme.dev) return;
  const KEY = "atlas-dev-theme";
  const esc = t => String(t == null ? "" : t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const clone = o => JSON.parse(JSON.stringify(o || {}));
  const blank = () => ({ tokens: { light: {}, dark: {} }, rules: [], extra: "", palettes: {}, map: {} });
  let T = Object.assign(blank(), clone(AtlasTheme.theme)), history = [], win = null, tab = "settings", picked = null, pickSel = null;
  const H = () => window.AtlasDesignHooks;
  function commit(fn, refreshPal) {
    history.push(JSON.stringify(T)); if (history.length > 100) history.shift();
    fn(); AtlasTheme.theme = T; try { localStorage.setItem(KEY, JSON.stringify(T)); } catch (e) {}
    if (refreshPal) { clearTimeout(commit.t); commit.t = setTimeout(() => { H().applyPalettes(T.palettes); H().refresh(); }, 150); }
    status();
  }
  const sameAsSaved = () => JSON.stringify(Object.assign(blank(), AtlasTheme.saved)) === JSON.stringify(T);
  function status() { if (!win) return; const s = win.el.querySelector(".dd-status"); if (s) s.innerHTML = sameAsSaved() ? "Matches theme.js" : "<b>Unsaved</b>: only in this browser until you save"; }

  // ---------- colours ----------
  const toHex = v => { v = String(v || "").trim(); if (/^#[0-9a-f]{6}$/i.test(v)) return v; if (/^#[0-9a-f]{3}$/i.test(v)) return "#" + v.slice(1).split("").map(c => c + c).join(""); const m = v.match(/^rgba?\(\s*(\d+)[ ,]+(\d+)[ ,]+(\d+)(?:[ ,/]+([\d.]+))?\s*\)$/i); if (m && (m[4] == null || +m[4] === 1)) return "#" + [m[1], m[2], m[3]].map(x => (+x).toString(16).padStart(2, "0")).join(""); return null; };
  const isColourish = v => !!toHex(v) || /^(rgba?|hsla?)\(/i.test(String(v || "").trim());
  const colourInput = (val, attrs) => { const hx = toHex(val); return `<span class="dd-col">${hx ? `<input type="color" value="${hx}" ${attrs} data-pick>` : `<i class="dd-sw" style="background:${esc(val)}"></i>`}<input type="text" value="${esc(val)}" ${attrs}></span>`; };

  // ---------- Settings: every CSS custom property in :root (light) and :root[data-mode="dark"] ----------
  function rootTokens() {
    const out = { light: {}, dark: {} };
    for (const sh of document.styleSheets) { let rules; try { rules = sh.cssRules; } catch (e) { continue; } if (!rules || (sh.ownerNode && sh.ownerNode.id === "atlas-theme")) continue;
      for (const r of rules) { if (!r.style) continue; const which = r.selectorText === ":root" ? "light" : r.selectorText === ':root[data-mode="dark"]' ? "dark" : null; if (!which) continue;
        for (let i = 0; i < r.style.length; i++) { const k = r.style[i]; if (k.startsWith("--")) out[which][k] = r.style.getPropertyValue(k).trim(); } } }
    return out;
  }
  function settingsHTML() {
    const base = rootTokens(), mode = H().mode === "dark" ? "dark" : "light";
    const row = (m, k) => { const v = T.tokens[m][k] != null ? T.tokens[m][k] : base[m][k] != null ? base[m][k] : base.light[k], ch = T.tokens[m][k] != null;
      return `<div class="dd-row${ch ? " ch" : ""}"><label title="${esc(k)}">${esc(k.replace(/^--/, ""))}</label>${isColourish(v) ? colourInput(v, `data-tok="${m}|${k}"`) : `<input type="text" value="${esc(v)}" data-tok="${m}|${k}">`}${ch ? `<button class="dd-x" data-untok="${m}|${k}" title="Back to Atlas's value">↺</button>` : ""}</div>`; };
    const keys = [...new Set([...Object.keys(base.light), ...Object.keys(T.tokens.light)])];
    const dkeys = [...new Set([...Object.keys(base.dark), ...Object.keys(T.tokens.dark)])];
    return `<p class="dd-note">Atlas's design settings: every panel, border, text colour, shadow and font comes from these. You're seeing <b>${mode}</b> mode (ATLAS menu → Display to switch).</p>
      <h4>Light mode</h4>${keys.map(k => row("light", k)).join("")}<h4>Dark mode <small>(only the settings that differ)</small></h4>${dkeys.map(k => row("dark", k)).join("")}
      <div class="dd-row"><input type="text" placeholder="--new-setting" data-newtok><button class="btn sm" data-addtok>Add a setting</button></div>`;
  }

  // ---------- Elements: pick anything and change its CSS ----------
  const PROPS = [["Box", ["background", "background-color", "color", "opacity", "border", "border-color", "border-width", "border-radius", "box-shadow", "backdrop-filter"]],
    ["Spacing & size", ["padding", "margin", "gap", "width", "height", "min-width", "max-width", "min-height", "max-height"]],
    ["Text", ["font-family", "font-size", "font-weight", "font-style", "line-height", "letter-spacing", "text-transform", "text-align", "text-decoration"]],
    ["Layout & behaviour", ["display", "position", "top", "right", "bottom", "left", "z-index", "overflow", "cursor", "transform", "transition", "filter", "visibility"]]];
  const STATE_CLASSES = /^(on|wm|fwin|wm-top|wm-pulse|dragging|maxed|shrunk|sel|open|ch|hidden|nudge|focused|grouped)$/;
  function candidates(el) {
    const out = [], cls = [...el.classList].filter(c => !STATE_CLASSES.test(c)), tag = el.tagName.toLowerCase();
    if (el.id) out.push("#" + el.id);
    if (cls.length > 1) out.push("." + cls.join("."));
    cls.forEach(c => out.push("." + c));
    const anc = el.parentElement && el.parentElement.closest("[id]");
    if (anc && anc.id !== "map") out.push(`#${anc.id} ${cls.length ? "." + cls[0] : tag}`);
    out.push((cls.length ? tag + "." + cls[0] : tag));
    return [...new Set(out)].map(sel => { let n = 0; try { n = document.querySelectorAll(sel).length; } catch (e) {} return { sel, n }; }).filter(x => x.n);
  }
  function elementsHTML() {
    const rules = T.rules.map((r, i) => `<div class="dd-rule"><code>${esc(r.sel)}</code> <small>${Object.keys(r.props).length} change${Object.keys(r.props).length === 1 ? "" : "s"}</small><button class="btn sm" data-editrule="${i}">Edit</button><button class="dd-x" data-delrule="${i}" title="Remove this rule">×</button></div>`).join("");
    let ed = `<p class="dd-note">Press <b>Pick</b>, then click anything in Atlas (a bar, box, button, label). Choose which elements the change should apply to, then edit.</p>`;
    if (pickSel) {
      const sample = (() => { try { return document.querySelector(pickSel); } catch (e) { return null; } })(), cs = sample ? getComputedStyle(sample) : null, rule = T.rules.find(r => r.sel === pickSel) || { props: {} };
      ed = `${picked ? `<div class="dd-row"><label>Apply to</label><select data-selpick>${candidates(picked).map(c => `<option value="${esc(c.sel)}" ${c.sel === pickSel ? "selected" : ""}>${esc(c.sel)} (${c.n})</option>`).join("")}</select></div>` : ""}
        <div class="dd-row"><label>Selector</label><input type="text" value="${esc(pickSel)}" data-selfree title="Any CSS selector"></div>
        ${PROPS.map(([g, ps]) => `<details ${g === "Box" || g === "Text" ? "open" : ""}><summary>${g}</summary>${ps.map(p => { const v = rule.props[p] != null ? rule.props[p] : cs ? cs.getPropertyValue(p) : "", ch = rule.props[p] != null;
          return `<div class="dd-row${ch ? " ch" : ""}"><label>${p}</label>${/color|background$/.test(p) && isColourish(v) ? colourInput(v, `data-prop="${p}"`) : `<input type="text" value="${esc(v)}" data-prop="${p}">`}${ch ? `<button class="dd-x" data-unprop="${p}" title="Remove this change">↺</button>` : ""}</div>`; }).join("")}</details>`).join("")}
        <div class="dd-row"><input type="text" placeholder="any other property" data-otherk style="flex:1"><input type="text" placeholder="value" data-otherv style="flex:1"><button class="btn sm" data-otheradd>Set</button></div>
        <label class="dd-ck"><input type="checkbox" data-imp ${rule.important === false ? "" : "checked"}>Win over everything (!important)</label>`;
    }
    return `<div class="dd-bar"><button class="btn primary" data-pick>Pick an element</button>${pickSel ? `<button class="btn" data-pickdone>Done</button>` : ""}</div>${ed}<h4>Your element rules</h4>${rules || `<p class="dd-note">None yet.</p>`}`;
  }
  let picking = false, hl = null;
  function startPick() {
    picking = true; document.body.classList.add("dd-picking");
    hl = hl || Object.assign(document.createElement("div"), { className: "dd-hl" }); document.body.appendChild(hl);
    const tip = Object.assign(document.createElement("div"), { className: "dd-tip" }); document.body.appendChild(tip);
    const over = e => { const t = e.target; if (!t || win.el.contains(t) || t === hl || t === tip) return; const r = t.getBoundingClientRect(); Object.assign(hl.style, { left: r.left + "px", top: r.top + "px", width: r.width + "px", height: r.height + "px", display: "block" });
      tip.textContent = (candidates(t)[0] || { sel: t.tagName.toLowerCase() }).sel; Object.assign(tip.style, { left: Math.min(innerWidth - 220, r.left) + "px", top: Math.max(0, r.top - 22) + "px", display: "block" }); };
    const stop = () => { picking = false; document.body.classList.remove("dd-picking"); hl.style.display = "none"; tip.remove(); document.removeEventListener("mouseover", over, true); document.removeEventListener("click", click, true); document.removeEventListener("keydown", key, true); };
    const click = e => { if (win.el.contains(e.target)) return; e.preventDefault(); e.stopPropagation(); picked = e.target; pickSel = (candidates(picked)[0] || { sel: picked.tagName.toLowerCase() }).sel; stop(); render(); };
    const key = e => { if (e.key === "Escape") { e.stopPropagation(); stop(); } };
    document.addEventListener("mouseover", over, true); document.addEventListener("click", click, true); document.addEventListener("keydown", key, true);
  }
  function setProp(p, v) { commit(() => { let r = T.rules.find(x => x.sel === pickSel); if (!r) { r = { sel: pickSel, props: {} }; T.rules.push(r); } if (v === "" || v == null) delete r.props[p]; else r.props[p] = v; if (!Object.keys(r.props).length) T.rules = T.rules.filter(x => x !== r); }); }

  // ---------- Palettes ----------
  function palettesHTML() {
    const D = H().defaults, P = T.palettes, val = (path, d) => { let o = P; for (const k of path) { if (o == null) return d; o = o[k]; } return o != null ? o : d; };
    const c = (path, d, label) => `<div class="dd-row${val(path, null) != null ? " ch" : ""}"><label>${esc(label)}</label>${colourInput(val(path, d), `data-pal='${esc(JSON.stringify(path))}'`)}${val(path, null) != null ? `<button class="dd-x" data-unpal='${esc(JSON.stringify(path))}' title="Back to Atlas's colour">↺</button>` : ""}</div>`;
    const list = (key, label, names) => `<details><summary>${label}</summary>${(Array.isArray(D[key]) ? D[key].map((d, i) => [i, d]) : Object.entries(D[key])).map(([k, d]) => c([key, String(k)], d, names ? names(k) : String(k))).join("")}</details>`;
    const q = (win && win.el.querySelector("[data-partyq]") || {}).value || "";
    const parties = Object.entries(D.party).filter(([k]) => !q || (H().partyName(k) + k).toLowerCase().includes(q.toLowerCase())).sort((a, b) => H().partyName(a[0]).localeCompare(H().partyName(b[0])));
    return `<p class="dd-note">Colours Atlas uses for data: they repaint the map, the key, cards and charts.</p>
      ${c(["nodata"], D.nodata, "No data (grey)")}
      <details open><summary>Perspectives (colour, light-to-dark ramp, app header)</summary>${Object.entries(D.per).map(([id, d]) => `<div class="dd-sub">${esc(H().PERSPECTIVES.find(p => p.id === id).name)}</div>${c(["per", id, "hue"], d.hue, "colour")}${d.ramp ? d.ramp.map((r, i) => c(["per", id, "ramp", String(i)], r, "ramp " + (i + 1))).join("") : ""}${d.bar ? c(["per", id, "bar", "0"], d.bar[0], "app header (light)") + c(["per", id, "bar", "1"], d.bar[1], "app header (dark)") : ""}`).join("")}</details>
      <details><summary>Parties</summary><div class="dd-row"><input type="text" placeholder="Find a party…" data-partyq value="${esc(q)}"></div>${parties.slice(0, 80).map(([k, d]) => c(["party", k], d, H().partyName(k))).join("")}${parties.length > 80 ? `<p class="dd-note">${parties.length - 80} more: type to find them.</p>` : ""}</details>
      ${list("cause", "Protest causes")}${list("align", "Organisers' alignment")}${list("div", "Two-sided scale (low → high)", i => ["lowest", "low", "middle", "high", "highest"][i])}
      <details><summary>Boundaries and highlights (by map mode)</summary>${Object.entries(D.over).map(([m, o]) => `<div class="dd-sub">${esc(m)}</div>${Object.entries(o).map(([k, d]) => c(["over", m, k], d, k)).join("")}`).join("")}</details>
      ${list("sector", "Company sectors")}${list("chart", "Chart series", i => "series " + (+i + 1))}${list("cluster", "Analyse: cluster groups", i => "group " + (+i + 1))}${list("hot", "Analyse: hot and cold spots")}`;
  }
  function setPal(path, v) {
    commit(() => {
      const D = H().defaults; let def = D; for (const k of path) def = def == null ? null : def[k];
      let o = T.palettes; for (let i = 0; i < path.length - 1; i++) { const k = path[i]; if (o[k] == null) o[k] = /^\d+$/.test(path[i + 1]) && Array.isArray(def) ? [] : {}; o = o[k]; }
      const last = path[path.length - 1]; if (v == null || v === def) delete o[last]; else o[last] = v;
    }, true);
  }

  // ---------- Map layers ----------
  const PAINT = { fill: ["fill-color", "fill-opacity", "fill-outline-color", "fill-pattern"], line: ["line-color", "line-width", "line-opacity", "line-dasharray", "line-blur"], circle: ["circle-color", "circle-radius", "circle-opacity", "circle-stroke-color", "circle-stroke-width", "circle-stroke-opacity", "circle-blur"],
    symbol: ["text-color", "text-halo-color", "text-halo-width", "text-opacity", "icon-opacity"], background: ["background-color", "background-opacity"], raster: ["raster-opacity", "raster-saturation", "raster-contrast", "raster-brightness-min", "raster-brightness-max"],
    heatmap: ["heatmap-opacity", "heatmap-radius", "heatmap-intensity", "heatmap-color"], hillshade: ["hillshade-exaggeration", "hillshade-shadow-color", "hillshade-highlight-color"], "fill-extrusion": ["fill-extrusion-color", "fill-extrusion-opacity"] };
  const ATLAS_LAYER = /^(pf|pdt|pes|pd|pb|pr|focus|group|tool|zone|co|grid)-|-(fill|line|sel)$|^(land)$/;
  function mapHTML() {
    const m = H().map, ls = (m.getStyle() || { layers: [] }).layers, q = (win && win.el.querySelector("[data-layq]") || {}).value || "";
    const show = ls.filter(l => !q || l.id.toLowerCase().includes(q.toLowerCase()));
    const row = l => `<details ${T.map[l.id] || show.length <= 6 ? "open" : ""}><summary>${esc(l.id)} <small>${l.type}${T.map[l.id] ? " · changed" : ""}</small></summary>${(PAINT[l.type] || []).map(p => { let v; try { v = m.getPaintProperty(l.id, p); } catch (e) {} const s = v == null ? "" : typeof v === "string" ? v : JSON.stringify(v), ch = T.map[l.id] && T.map[l.id][p] != null;
      return `<div class="dd-row${ch ? " ch" : ""}"><label>${p}</label>${typeof v === "string" && isColourish(v) ? colourInput(v, `data-lay="${esc(l.id)}|${p}"`) : `<input type="text" value="${esc(s)}" placeholder="default" data-lay="${esc(l.id)}|${p}">`}${ch ? `<button class="dd-x" data-unlay="${esc(l.id)}|${p}" title="Remove this change (reload to see Atlas's value)">↺</button>` : ""}</div>`; }).join("")}</details>`;
    const atlas = show.filter(l => ATLAS_LAYER.test(l.id)), basemap = show.filter(l => !ATLAS_LAYER.test(l.id));
    return `<p class="dd-note">Every layer on the map. Values can be numbers, colours or MapLibre expressions (JSON). Some Atlas layers are coloured per area from the data: change those under Palettes.</p><div class="dd-row"><input type="text" placeholder="Filter layers…" data-layq value="${esc(q)}"></div>
      <h4>Atlas's layers (${atlas.length})</h4>${atlas.map(row).join("")}<h4>Basemap (${basemap.length})</h4>${basemap.length > 60 && !q ? `<p class="dd-note">${basemap.length} layers: type in the filter (e.g. “road”, “water”, “label”).</p>` : basemap.map(row).join("")}`;
  }
  function setLay(id, p, raw) {
    let v = raw; if (/^[\[{]|^-?\d+(\.\d+)?$|^(true|false)$/.test(String(raw).trim())) { try { v = JSON.parse(raw); } catch (e) { H().toast("That isn't valid JSON."); return; } }
    try { H().map.setPaintProperty(id, p, v === "" ? undefined : v); } catch (e) { H().toast("MapLibre refused that value: " + e.message); return; }
    commit(() => { T.map[id] = T.map[id] || {}; if (v === "") delete T.map[id][p]; else T.map[id][p] = v; if (!Object.keys(T.map[id]).length) delete T.map[id]; });
  }

  function cssHTML() {
    return `<p class="dd-note">The CSS your changes make (it goes after Atlas's own styles, so it wins). Add anything else below: it's applied as you type.</p>
      <h4>Generated</h4><textarea readonly rows="10" class="dd-code">${esc(AtlasTheme.css(Object.assign({}, T, { extra: "" })))}</textarea>
      <h4>Extra CSS</h4><textarea rows="12" class="dd-code" data-extra spellcheck="false" placeholder=".appbar { border-radius: 14px; }">${esc(T.extra)}</textarea>`;
  }

  // ---------- the window ----------
  const TABS = [["settings", "Settings"], ["elements", "Elements"], ["palettes", "Palettes"], ["map", "Map"], ["css", "CSS"]];
  function render() {
    if (!win) return;
    const body = { settings: settingsHTML, elements: elementsHTML, palettes: palettesHTML, map: mapHTML, css: cssHTML }[tab]();
    const keep = document.activeElement && win.el.contains(document.activeElement) ? document.activeElement.getAttribute("data-partyq") != null ? "[data-partyq]" : document.activeElement.getAttribute("data-layq") != null ? "[data-layq]" : null : null;
    const opened = new Set([...win.el.querySelectorAll(".dd-body details[open] > summary")].map(x => x.textContent)), sameTab = win.el.dataset.tab === tab;
    win.setBody(`<div class="dd-tabs">${TABS.map(([k, l]) => `<button class="${k === tab ? "on" : ""}" data-tab="${k}">${l}</button>`).join("")}</div><div class="dd-body">${body}</div>
      <div class="dd-foot"><span class="dd-status"></span><div class="dd-acts"><button class="btn primary" data-save title="Write theme.js into the atlas folder (Chrome/Edge)">Save to the atlas folder…</button><button class="btn" data-dl>Download theme.js</button><button class="btn" data-copycss>Copy CSS</button><button class="btn" data-undo ${history.length ? "" : "disabled"}>Undo</button><button class="btn" data-revert title="Throw away unsaved changes">Back to theme.js</button><button class="btn" data-zero title="Atlas's built-in look (nothing overridden)">Atlas default</button></div></div>`);
    if (sameTab) win.el.querySelectorAll(".dd-body details > summary").forEach(x => { if (opened.has(x.textContent)) x.parentNode.open = true; });   // keep open sections open
    win.el.dataset.tab = tab;
    if (keep) { const k = win.el.querySelector(keep); if (k) { k.focus(); k.setSelectionRange(k.value.length, k.value.length); } }
    status();
  }
  const themeFile = () => `// Atlas design overrides, written by the Design panel (open index.html?dev, then ATLAS menu → Design, or Ctrl/Cmd+Shift+D).\n// Everyone sees what's saved here; commit it like any other change. Empty means Atlas's built-in look.\nwindow.ATLAS_THEME = ${JSON.stringify(T, null, 1)};\n`;
  async function save() {
    if (!window.showDirectoryPicker) { H().download(new Blob([themeFile()], { type: "text/javascript" }), "theme.js"); H().toast("This browser can't write to folders: theme.js was downloaded. Put it in the atlas folder (replacing the old one), then commit."); return; }
    try {
      const dir = await window.showDirectoryPicker({ id: "atlas-folder", mode: "readwrite" });
      try { await dir.getFileHandle("index.html"); } catch (e) { H().toast("That folder has no index.html: choose the atlas folder itself."); return; }
      const fh = await dir.getFileHandle("theme.js", { create: true }), w = await fh.createWritable(); await w.write(themeFile()); await w.close();
      AtlasTheme.saved = clone(T); try { localStorage.removeItem(KEY); } catch (e) {} status();
      H().toast("Saved theme.js in the atlas folder. Commit it in GitHub Desktop to share it.");
    } catch (e) { if (e.name !== "AbortError") H().toast("Couldn't save: " + e.message); }
  }
  function load(t) { T = Object.assign(blank(), clone(t)); AtlasTheme.theme = T; try { localStorage.setItem(KEY, JSON.stringify(T)); } catch (e) {} H().applyPalettes(T.palettes); H().refresh(); render(); }
  function open() {
    if (!H()) return;
    if (!win) {
      win = H().WM.make({ type: "dev-design", title: "Design (developers)", dispose: false, min: { w: 380, h: 320 }, def: () => ({ x: innerWidth - 460 - 16, y: 56, w: 460, h: Math.round(innerHeight * 0.82) }) });
      win.el.classList.add("dd-win");
      win.el.addEventListener("click", e => {
        const b = e.target.closest("button"); if (!b) return; const d = b.dataset;
        if (d.tab) { tab = d.tab; render(); }
        else if (b.hasAttribute("data-pick")) startPick();
        else if (b.hasAttribute("data-pickdone")) { picked = null; pickSel = null; render(); }
        else if (d.editrule != null) { picked = null; pickSel = T.rules[+d.editrule].sel; render(); }
        else if (d.delrule != null) { commit(() => { T.rules.splice(+d.delrule, 1); }); render(); }
        else if (d.untok) { const [m, k] = d.untok.split("|"); commit(() => { delete T.tokens[m][k]; }); render(); }
        else if (b.hasAttribute("data-addtok")) { const k = win.el.querySelector("[data-newtok]").value.trim(); if (/^--[\w-]+$/.test(k)) { commit(() => { T.tokens.light[k] = "initial"; }); render(); } }
        else if (d.unprop) { setProp(d.unprop, ""); render(); }
        else if (b.hasAttribute("data-otheradd")) { const k = win.el.querySelector("[data-otherk]").value.trim(), v = win.el.querySelector("[data-otherv]").value.trim(); if (k) { setProp(k, v); render(); } }
        else if (d.unpal) { setPal(JSON.parse(d.unpal), null); render(); }
        else if (d.unlay) { const [id, p] = d.unlay.split("|"); commit(() => { if (T.map[id]) { delete T.map[id][p]; if (!Object.keys(T.map[id]).length) delete T.map[id]; } }); render(); H().toast("Change removed; reload the page to see Atlas's own value for that layer."); }
        else if (b.hasAttribute("data-save")) save();
        else if (b.hasAttribute("data-dl")) H().download(new Blob([themeFile()], { type: "text/javascript" }), "theme.js");
        else if (b.hasAttribute("data-copycss")) H().copy(AtlasTheme.css(T), "the CSS");
        else if (b.hasAttribute("data-undo")) { const prev = history.pop(); if (prev) load(JSON.parse(prev)); }
        else if (b.hasAttribute("data-revert")) { if (confirm("Throw away the changes you haven't saved?")) { history.push(JSON.stringify(T)); load(AtlasTheme.saved); } }
        else if (b.hasAttribute("data-zero")) { if (confirm("Go back to Atlas's built-in look? (Undo can bring your changes back; theme.js isn't touched until you save.)")) { history.push(JSON.stringify(T)); load(blank()); location.reload(); } }
      });
      const onEdit = (e, final) => {
        const t = e.target, d = t.dataset, v = t.value;
        if (d.tok) { const [m, k] = d.tok.split("|"); commit(() => { T.tokens[m][k] = v; }); }
        else if (d.prop) setProp(d.prop, v);
        else if (d.pal) setPal(JSON.parse(d.pal), v);
        else if (d.lay && final) { const [id, p] = d.lay.split("|"); setLay(id, p, v); }
        else if (t.matches("[data-extra]")) commit(() => { T.extra = v; });
        else if (t.matches("[data-selfree]") && final) { pickSel = v.trim() || pickSel; render(); return; }
        else return;
        if (d.pick != null) { const txt = t.parentNode.querySelector('input[type="text"]'); if (txt) txt.value = v; }   // keep the text box in step with the colour picker
      };
      win.el.addEventListener("input", e => { if (e.target.matches("[data-partyq],[data-layq]")) { render(); return; } if (e.target.type === "color" || e.target.matches("[data-extra],[data-tok],[data-prop],[data-pal]")) onEdit(e, false); });
      win.el.addEventListener("change", e => {
        if (e.target.matches("[data-selpick]")) { pickSel = e.target.value; render(); return; }
        if (e.target.matches("[data-imp]")) { commit(() => { const r = T.rules.find(x => x.sel === pickSel); if (r) r.important = e.target.checked; }); return; }
        onEdit(e, true); const row = e.target.closest(".dd-row"); if (row) row.classList.add("ch");   // no redraw here: it would swallow the click that ended the edit
      });
    }
    H().WM.open(win.el); render();
  }
  document.addEventListener("keydown", e => { if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "d") { e.preventDefault(); open(); } });
  window.addEventListener("storage", e => { if (e.key === KEY && e.newValue) { T = Object.assign(blank(), JSON.parse(e.newValue)); if (win && !win.el.hidden) render(); } });
  window.AtlasDesign = { open, get theme() { return T; } };
  // the panel's own look (kept apart from theme overrides)
  const st = document.createElement("style"); st.textContent = `
    .dd-win .wm-body { padding: 0; display: flex; flex-direction: column; } .dd-tabs { display: flex; gap: 2px; padding: 6px 8px 0; border-bottom: 1px solid #ddd; flex: none; }
    .dd-tabs button { border: 1px solid transparent; border-bottom: 0; background: none; padding: 5px 10px; border-radius: 6px 6px 0 0; font: 12.5px system-ui, sans-serif; color: #555; }
    .dd-tabs button.on { background: #fff; border-color: #ddd; color: #111; font-weight: 600; margin-bottom: -1px; }
    .dd-body { flex: 1; overflow: auto; padding: 8px 12px 16px; font: 12px system-ui, sans-serif; } .dd-body h4 { margin: 12px 0 4px; font-size: 12.5px; } .dd-note { color: #777; margin: 4px 0 8px; line-height: 1.4; }
    .dd-row { display: flex; gap: 6px; align-items: center; padding: 2px 0; } .dd-row > label { width: 150px; flex: none; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #444; font-family: ui-monospace, Menlo, monospace; font-size: 11px; }
    .dd-row.ch > label { color: #b45f06; font-weight: 600; } .dd-row input[type=text], .dd-row select { flex: 1; min-width: 0; border: 1px solid #ccc; border-radius: 4px; padding: 3px 5px; font: 11.5px ui-monospace, Menlo, monospace; background: #fff; color: #111; }
    .dd-col { display: flex; gap: 4px; flex: 1; min-width: 0; align-items: center; } .dd-col input[type=color] { width: 28px; height: 22px; padding: 0; border: 1px solid #ccc; border-radius: 4px; flex: none; } .dd-sw { width: 26px; height: 20px; border: 1px solid #ccc; border-radius: 4px; flex: none; }
    .dd-x { border: 0; background: none; color: #999; cursor: pointer; font-size: 14px; padding: 0 3px; } .dd-x:hover { color: #b45f06; }
    .dd-body details { border-top: 1px solid #eee; padding: 3px 0; } .dd-body summary { cursor: pointer; font-weight: 600; padding: 3px 0; } .dd-body summary small { color: #999; font-weight: 400; }
    .dd-sub { margin: 6px 0 2px; font-weight: 600; color: #555; } .dd-rule { display: flex; gap: 6px; align-items: center; padding: 3px 0; } .dd-rule code { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .dd-code { width: 100%; box-sizing: border-box; font: 11.5px ui-monospace, Menlo, monospace; border: 1px solid #ccc; border-radius: 4px; padding: 6px; background: #fafafa; color: #111; }
    .dd-bar { display: flex; gap: 6px; margin: 2px 0 6px; } .dd-ck { display: flex; gap: 6px; align-items: center; margin-top: 6px; }
    .dd-foot { flex: none; border-top: 1px solid #ddd; padding: 6px 10px; display: grid; gap: 6px; font: 11.5px system-ui, sans-serif; background: #fafafa; } .dd-acts { display: flex; flex-wrap: wrap; gap: 4px; } .dd-status b { color: #b45f06; }
    .dd-hl { position: fixed; z-index: 99998; pointer-events: none; border: 2px solid #e8590c; background: rgba(232,89,12,.08); border-radius: 2px; display: none; }
    .dd-tip { position: fixed; z-index: 99999; pointer-events: none; background: #222; color: #fff; font: 11px ui-monospace, Menlo, monospace; padding: 2px 6px; border-radius: 3px; display: none; max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    body.dd-picking, body.dd-picking * { cursor: crosshair !important; }`;
  document.head.appendChild(st);
})();
