/* Atlas 1.8 · applies theme.js: CSS settings (tokens), element rules and extra CSS go into one <style>, after Atlas's own
 * styles so they win. Palettes and map layers are applied by app.js (they need the map). A developer's unsaved edits
 * (localStorage, only with ?dev) take the place of theme.js in their own browser.
 */
(function () {
  "use strict";
  const block = (sel, o, imp) => { const e = Object.entries(o || {}).filter(([, v]) => v !== "" && v != null); return e.length ? `${sel} { ${e.map(([k, v]) => `${k}: ${v}${imp && !/!important/.test(v) ? " !important" : ""};`).join(" ")} }\n` : ""; };
  function css(t) {
    t = t || {}; const tk = t.tokens || {};
    return block(":root", tk.light) + block(':root[data-mode="dark"]', tk.dark) + (t.rules || []).filter(r => r.sel).map(r => block(r.sel, r.props, r.important !== false)).join("") + (t.extra || "");
  }
  let dev = false;
  try { const q = new URLSearchParams(location.search); if (q.has("dev")) localStorage.setItem("atlas-dev", q.get("dev") === "0" ? "0" : "1"); dev = localStorage.getItem("atlas-dev") === "1"; } catch (e) {}
  let theme = window.ATLAS_THEME || {};
  if (dev) { try { const s = localStorage.getItem("atlas-dev-theme"); if (s) theme = JSON.parse(s); } catch (e) {} }
  const el = document.createElement("style"); el.id = "atlas-theme"; el.textContent = css(theme);
  (document.head || document.documentElement).appendChild(el);
  window.AtlasTheme = { css, dev, get theme() { return theme; }, set theme(t) { theme = t; el.textContent = css(t); }, saved: window.ATLAS_THEME || {} };
})();
