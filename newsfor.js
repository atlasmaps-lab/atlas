/* Atlas 0.13: news about one thing (a menu section, a row in it). Ranks the daily feed (data/news.js: GOV.UK, Parliament,
   BBC News, The Guardian, Sky News) by how strongly each story is about the thing, newer first among equals, and adds a
   live GOV.UK search (open API, Open Government Licence). Every story keeps its source's name and links to the original.
   AtlasNews.find({ strong: ["Access"], context: ["Political money", "Markets"] }) -> Promise<[{ t, u, s, d, x, i, score }]> */
(function () {
  const STOP = new Set("the and for with from who what where how this that here more over all its our you are was were has have had into than then them they their about other others overview each per head by on of in to a an at as is it or not new open see we us buys buy got get biggest largest top total uk".split(" "));
  // a few section names say little on their own: what they are about, in the words news uses
  const HINTS = { access: ["lobbying", "lobbyist", "lobbyists", "met ministers"], donors: ["donations", "donor"], donations: ["donations", "donor"], contracts: ["contracts", "procurement"], money: ["donations"],
    exports: ["exports"], imports: ["imports", "tariffs"], partners: ["trade deal"], trade: ["trade"], investment: ["investment"], income: ["investment"], companies: ["companies", "FTSE"],
    listed: ["FTSE", "shares"], ftse: ["FTSE"], house: ["house prices"], rents: ["rent", "renters"], homes: ["housing"], inflation: ["inflation"], prices: ["prices"], unemployment: ["unemployment", "jobs"],
    jobs: ["jobs"], pay: ["wages", "pay"], gdp: ["economy", "growth"], growth: ["growth"], spending: ["spending"], borrowing: ["borrowing", "debt"], debt: ["debt"], rates: ["interest rates"], sterling: ["pound"],
    floods: ["flood", "flooding"], flood: ["flooding"], coast: ["coastal", "erosion"], heat: ["heatwave"], emissions: ["emissions", "climate"], climate: ["climate"], air: ["air pollution"], nature: ["nature", "wildlife"],
    elections: ["election"], election: ["election"], councils: ["council"], seats: ["MPs"], protests: ["protest"], integrity: ["standards", "ethics"], deprivation: ["poverty"], health: ["NHS"],
    deaths: ["deaths"], transport: ["transport"], stations: ["rail", "stations"], migration: ["migration"], census: ["census"], benefits: ["benefits", "welfare"] };
  const GENERIC = new Set("partners partner product products place places share shares rate rates region regions people area areas level levels change changes value values number index average".split(" "));
  const words = s => String(s || "").replace(/\(.*?\)/g, " ").split(/[^A-Za-z0-9£%'-]+/).map(w => w.replace(/^'+|'+$/g, "")).filter(w => w.length >= 3 && !STOP.has(w.toLowerCase()));
  const rx = w => new RegExp("(^|[^a-z])" + w.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/s$/, "") + "(s|es|ing|ed)?([^a-z]|$)", "i");
  function terms(q) {
    const T = [], seen = new Set(), add = (w, wt) => { const k = w.toLowerCase(); if (seen.has(k)) return; seen.add(k); T.push({ w, wt, re: rx(w) }); };
    (q.strong || []).forEach((s, i) => { const ws = words(s); if (ws.length > 1) add(ws.join(" "), 5 - i); ws.forEach(w => { const hs = HINTS[w.toLowerCase()] || [], vague = GENERIC.has(w.toLowerCase()) || (hs.length && !hs.some(h => h.toLowerCase() === w.toLowerCase())); add(w, vague ? 1 : 3 - Math.min(i, 1)); hs.forEach(h => add(h, 2.5)); }); });
    (q.context || []).forEach(s => words(s).forEach(w => { add(w, 1); (HINTS[w.toLowerCase()] || []).forEach(h => add(h, 0.7)); }));
    return T;
  }
  const today = () => Date.now();
  function score(it, T) {
    let s = 0, strong = 0; const ti = it.t || "", tx = it.x || "";
    T.forEach(t => { const h = t.re.test(ti) ? 2 : t.re.test(tx) ? 1 : 0; if (h) { s += t.wt * h; if (t.wt >= 2) strong++; } });
    if (!strong) s *= 0.35;   // only context words: much weaker
    const age = Math.max(0, (today() - Date.parse(it.d)) / 864e5) || 0;
    return s * (1 + 0.6 * Math.exp(-age / 21));
  }
  const cache = new Map();
  function govuk(q, T) {
    const strong = (q.strong || []).map(s => words(s).join(" ")).filter(Boolean), ctx = (q.context || []).slice(0, 1).map(s => words(s).join(" "));
    const hints = [...new Set(strong.join(" ").split(" ").flatMap(w => HINTS[w.toLowerCase()] || []))];
    const query = [...strong, ...hints, ...ctx].join(" ").trim(); if (!query) return Promise.resolve([]);
    const from = new Date(today() - 540 * 864e5).toISOString().slice(0, 10);
    const url = "https://www.gov.uk/api/search.json?" + new URLSearchParams({ q: query, count: "12", filter_content_store_document_type: "news_story", filter_public_timestamp: "from:" + from, fields: "title,link,description,public_timestamp,organisations,image_url" });
    return fetch(url).then(r => r.ok ? r.json() : { results: [] }).then(j => (j.results || []).map((r, i) => ({ t: r.title, u: "https://www.gov.uk" + r.link, d: (r.public_timestamp || "").slice(0, 10), x: r.description || "",
      s: "GOV.UK" + ((r.organisations || [])[0] && r.organisations[0].title ? " · " + r.organisations[0].title : ""), i: r.image_url || "", rank: i }))).catch(() => []);
  }
  function find(q) {
    const key = JSON.stringify(q); if (cache.has(key)) return cache.get(key);
    const T = terms(q), N = window.ATLAS_NEWS, local = N && N.items ? N.items : [];
    const p = govuk(q, T).then(live => {
      const seen = new Set(), all = [];
      live.concat(local).forEach(it => { if (!it.u || seen.has(it.u)) return; seen.add(it.u); const base = score(it, T), sc = base + (base > 0 && it.rank != null ? Math.max(0, 1.5 - it.rank * 0.3) : 0); if (base >= 0.5) all.push(Object.assign({}, it, { score: sc })); });
      all.sort((a, b) => b.score - a.score || (b.d > a.d ? 1 : -1));
      // the lead story carries a picture: the most relevant one that has one, unless that is much less relevant than the best
      const pi = all.findIndex(x => x.i); if (pi > 0 && all[pi].score >= all[0].score * 0.7) all.unshift(all.splice(pi, 1)[0]);
      return all;
    });
    cache.set(key, p); return p;
  }
  window.AtlasNews = { find, terms, score };
})();
