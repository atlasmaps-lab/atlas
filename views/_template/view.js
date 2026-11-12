/* Atlas <Name>: <one line on what this view is for>.
 * Copy this folder to views/<id>/, rename below, and add a line for it in views/views.js.
 * Talk to the core only through ctx (see docs/perspective-apps.md): ctx.M (metrics), ctx.sel, ctx.focused,
 * ctx.date, ctx.nameOf, ctx.openPanel, ctx.openChart, ctx.mapOnly, ctx.esc, ctx.CH (charts) and the rest.
 * 0.11: a panel's heading in the bar drops down a menu. Give the panel `menu: (ctx, B) => ({ sections: [...] })`, or put
 * the menus in views/<id>/menu.js (see views/politics/menu.js); B (menu.js) builds rows and figures from metrics,
 * breakdowns and series. Without one, Atlas builds a menu from the panel's `map.metrics` and their groups. Forms and
 * tools: `menu: false` (they open straight away).
 */
(function () {
  "use strict";
  function hello(ctx, el) {
    const c = ctx.focused || ctx.sel[0] || ctx.UKC;
    el.innerHTML = `<h4>${ctx.esc(ctx.nameOf(c))}</h4><p class="ap-note">Click an area on the map to change place.</p>`;
  }
  window.AtlasApps && AtlasApps.register({
    id: "myview", name: "Atlas My View", perspective: "social",   // perspective: one of the ids in PERSPECTIVES (app.js)
    accent: "#4a4f55", dataNeeds: [],                             // window globals that must be loaded, e.g. "ATLAS_SERIES"
    init(ctx) { ctx.openPanel("hello"); },                        // the default layout when the view first opens
    panels: [{ id: "hello", title: "Hello", live: true, render: hello }],
    tools: [],
  });
})();
