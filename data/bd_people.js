/* Atlas 0.10: Social breakdowns for housing and migration. Specs read by app.js (window.ATLAS_BREAKDOWNS); numbers from
 * data/people.js (pipeline/fetch_people.py): MHCLG table 100, Home Office asylum support and resettlement by council. */
(function () {
  "use strict";
  const P = window.ATLAS_PEOPLE; if (!P) return;
  const out = window.ATLAS_BREAKDOWNS = window.ATLAS_BREAKDOWNS || [];
  const H = P.housing || {}, A = P.asylum || {};
  if (H.stock) out.push({ id: "ppl_tenure_stock", p: "social", group: "Social housing", label: "Homes by owner", unit: "homes", levels: ["council", "region", "nation"], sumUp: true,
    valid: c => /^(S|W|N)/.test(c) ? "England only for now" : null, cats: () => ["0", "1", "2", "3"], name: k => (H.stock_cols || [])[+k] || k, colour: k => ["#b5651d", "#d4a017", "#8d99ae", "#457b9d"][+k],
    of: (code, d, X) => { if (X.level(code) !== "council") return null; const v = H.stock[code]; if (!v) return null; const o = {}; v.forEach((x, i) => { if (x) o[String(i)] = x; }); return o; },
    yr: () => H.stock_year, source: P.sources.housing + " (OGL v3.0)", how: `Dwellings by who owns them, ${H.stock_year} (MHCLG table 100)`, desc: "Who owns the homes here: the council, housing associations, other public bodies or private owners and landlords", defPick: "0" });
  const cats = o => [...new Set(Object.values(o || {}).flatMap(x => Object.keys(x)))];
  const PAL = ["#264653", "#2a9d8f", "#e9c46a", "#f4a261", "#e76f51", "#6d597a", "#b56576", "#355070"];
  if (A.support) out.push({ id: "ppl_asylum_acc", p: "social", group: "Migration", label: "Asylum support by accommodation", unit: "people", levels: ["council", "region", "nation", "country"], sumUp: true,
    cats: () => cats(A.support), name: k => k, colour: k => PAL[cats(A.support).indexOf(k) % PAL.length], of: (code, d, X) => X.level(code) === "council" ? A.support[code] || null : null,
    yr: () => A.support_date, source: P.sources.asylum + " (OGL v3.0)", how: `People on asylum support on ${A.support_date}, by the kind of accommodation (hotels, dispersed housing, initial accommodation) or subsistence only`, desc: "Where people seeking asylum are housed" });
  if (A.resettle) out.push({ id: "ppl_resettle", p: "social", group: "Migration", label: "Refugees resettled, by scheme", unit: "people", levels: ["council", "region", "nation", "country"], sumUp: true,
    cats: () => cats(A.resettle), name: k => k, colour: k => PAL[cats(A.resettle).indexOf(k) % PAL.length], of: (code, d, X) => X.level(code) === "council" ? A.resettle[code] || null : null,
    source: P.sources.asylum + " (OGL v3.0)", how: "People resettled since 2014 by scheme", desc: "Which resettlement schemes brought people here" });
})();
