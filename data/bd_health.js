/* Atlas 0.9: Health breakdowns: what people die of, and at what age (deaths registered in England and Wales, the latest
 * three years). Specs read by app.js (window.ATLAS_BREAKDOWNS); numbers from data/health_deaths.js (pipeline/fetch_health.py). */
(function () {
  "use strict";
  const D = window.ATLAS_DEATHS; if (!D) return;
  const CH_COL = { A: "#8ab17d", B: "#8ab17d", C: "#9b2226", D: "#ae2012", E: "#ee9b00", F: "#6d597a", G: "#355070", H: "#90be6d", I: "#c9184a", J: "#277da1", K: "#ca6702", L: "#b5838d",
    M: "#adb5bd", N: "#0a9396", O: "#ffafcc", P: "#ffc8dd", Q: "#cdb4db", R: "#adb5bd", U: "#495057", V: "#343a40", W: "#343a40", X: "#343a40", Y: "#343a40" };
  const col = c => CH_COL[(c || "?")[0]] || "#999";
  const LV = ["council", "region", "nation", "country"], yrs = D.years.join("–");
  const pick = (T, code, H) => H.level(code) === "council" || H.level(code) === "region" || /^[EW]92/.test(code) ? T.v[code] || null : code === H.UKC() ? T.v.K04000001 || sumAll(T) : null;
  const sumAll = T => { const o = {}; for (const g in T.v) if (/^E92|^W92/.test(g)) for (const k in T.v[g]) o[k] = (o[k] || 0) + T.v[g][k]; return Object.keys(o).length ? o : null; };
  const valid = code => /^(S|N)/.test(code) ? "England and Wales only (Scotland and Northern Ireland register deaths separately)" : null;
  const out = window.ATLAS_BREAKDOWNS = window.ATLAS_BREAKDOWNS || [];
  const common = { p: "health", group: "What people die of", unit: "deaths", levels: LV, valid, scopeName: c => c === "K02000001" ? "England and Wales" : null, base: () => "K02000001", baseName: "England and Wales", yr: () => yrs, source: D.source };
  out.push(Object.assign({}, common, { id: "hd_cause", label: "Deaths by cause (main groups)", cats: () => Object.keys(D.ch.names), name: k => D.ch.names[k][1], colour: k => col(D.ch.names[k][0]),
    of: (c, d, H) => pick(D.ch, c, H), how: `Deaths registered ${yrs} by underlying cause, grouped into ICD-10 chapters`, desc: "What people died of here: cancer, heart and circulatory disease, dementia and others" }));
  out.push(Object.assign({}, common, { id: "hd_detail", label: "Deaths by cause (detailed)", cats: () => Object.keys(D.bl.names), name: k => `${D.bl.names[k][1]} (${D.bl.names[k][0]})`, colour: k => col(D.bl.names[k][0]),
    of: (c, d, H) => pick(D.bl, c, H), defPick: Object.keys(D.bl.names).find(k => D.bl.names[k][0] === "C33-C34") || undefined,
    how: `Deaths registered ${yrs} by underlying cause, in about 230 ICD-10 blocks (for example C33-C34 lung cancer, I20-I25 ischaemic heart disease, F00-F03 dementia)`, desc: "Causes of death in detail: about 230 conditions" }));
  out.push(Object.assign({}, common, { id: "hd_age", label: "Deaths by age", cats: () => Object.keys(D.age.names), name: k => D.age.names[k], colour: k => `hsl(${350 - +k * 7}, 55%, ${30 + +k * 2.5}%)`,
    of: (c, d, H) => pick(D.age, c, H), defPick: "15", how: `Deaths registered ${yrs} by age at death`, desc: "At what age people died here (more young deaths point to avoidable causes)" }));
})();
