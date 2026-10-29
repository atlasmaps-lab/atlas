/* Atlas views: one folder per view (views/<id>/), each owned by one person.
 *
 * This list is the only shared file a view ever needs: add a line here to add a view, or list a new
 * file inside your own view's folder. Everything else for a view lives in its folder:
 *
 *   views/politics/
 *     view.js     registers the view (AtlasApps.register) and holds its panels and tools
 *     view.css    styles for this view only: loaded only when this view is open, so it can't change the others
 *     README.md   what the view does, who owns it, what's planned
 *     test_*.py   browser tests for this view (tests/run_all.py runs them too)
 *     ...         any extra scripts or data the view needs (list them in "js" below)
 *
 * Scripts ("js") load in every tab, because Atlas Multi lists every view; keep them to AtlasApps.register and
 * the functions it uses. Styles ("css") load only in that view's own tab.
 * To start a new view, copy views/_template/ and add a line below. See CONTRIBUTING.md, "Views".
 */
(function () {
  "use strict";
  const VIEWS = {
    politics: { owner: "", js: ["view.js"], css: ["view.css"] },
    economic: { owner: "", js: ["view.js"], css: ["view.css"] },
    social:   { owner: "", js: ["view.js"], css: ["view.css"] },
    health:   { owner: "", js: ["view.js"], css: ["view.css"] },
    markets:  { owner: "", js: ["view.js"], css: ["view.css"] },
  };
  const V = "0712";   // bump with the ?v= numbers in index.html so browsers fetch fresh copies

  window.ATLAS_VIEWS = VIEWS;
  const m = location.hash.match(/app=([a-z]+)/), open = m && VIEWS[m[1]] ? m[1] : null;
  const src = (id, f) => `views/${id}/${f}?v=${V}`;
  // document.write while the page is still loading keeps the order: every view registers before app.js starts
  Object.keys(VIEWS).forEach(id => (VIEWS[id].js || []).forEach(f => document.write(`<script src="${src(id, f)}"><\/script>`)));
  if (open) (VIEWS[open].css || []).forEach(f => document.write(`<link rel="stylesheet" href="${src(open, f)}" data-view="${open}">`));
})();
