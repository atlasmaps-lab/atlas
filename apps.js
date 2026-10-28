/* Atlas 1.8 · perspective apps: one perspective as its own app (index.html#app=markets), on the shared core.
 * A module in apps/ registers itself; app.js opens it and hands it a ctx (the only door into the core):
 *
 *   AtlasApps.register({ id, name, perspective, accent, blurb, dataNeeds: [window globals], init(ctx),
 *                        panels: [{ id, title, live, render(ctx, el) }], tools: [...same...] })
 *
 * Rule: a fix every view needs goes in the core (app.js and friends); a feature only one app needs stays in its module.
 */
(function () {
  "use strict";
  const apps = {};
  window.AtlasApps = {
    register(def) { apps[def.id] = Object.assign({ panels: [], tools: [], dataNeeds: [] }, def); },
    get: id => apps[id] || null,
    list: () => Object.values(apps),
    ready: def => def.dataNeeds.every(k => window[k]),
  };
})();
