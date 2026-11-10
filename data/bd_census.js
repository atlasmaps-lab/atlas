/* Atlas 0.9: Social breakdowns from Census 2021 (England and Wales), every category. Specs read by app.js
 * (window.ATLAS_BREAKDOWNS); the numbers come from data/census.js and, for wards, data/census_wards/<topic>.js (loaded
 * when a ward-level map needs them). Built by pipeline/fetch_census_profiles.py. */
(function () {
  "use strict";
  const C = window.ATLAS_CENSUS; if (!C) return;
  const PAL = ["#264653", "#2a9d8f", "#8ab17d", "#e9c46a", "#f4a261", "#e76f51", "#9b2226", "#6d597a", "#b56576", "#355070", "#90be6d", "#43aa8b", "#577590", "#f9844a", "#f8961e", "#277da1", "#4d908e", "#ffb703", "#8338ec"];
  const GROUP = { ethnic: "Who lives here (Census 2021)", religion: "Who lives here (Census 2021)", language: "Who lives here (Census 2021)", english: "Who lives here (Census 2021)", birth: "Who lives here (Census 2021)", age: "Who lives here (Census 2021)",
    nssec: "Work and class (Census 2021)", occupation: "Work and class (Census 2021)", activity: "Work and class (Census 2021)", quals: "Work and class (Census 2021)", tenure: "Homes (Census 2021)", households: "Homes (Census 2021)" };
  const loading = {};
  function wards(tid) {
    const W = window.ATLAS_CENSUS_W && window.ATLAS_CENSUS_W[tid]; if (W) return W;
    if (!loading[tid]) { loading[tid] = 1; const s = document.createElement("script"); s.src = "data/census_wards/" + tid + ".js?v=" + C.built; s.onload = () => window.AtlasRepaint && window.AtlasRepaint(); document.head.appendChild(s); }
    return null;
  }
  const obj = (cats, arr) => { if (!arr) return null; const o = {}; cats.forEach((k, i) => { if (arr[i]) o[k] = arr[i]; }); return o; };
  const out = window.ATLAS_BREAKDOWNS = window.ATLAS_BREAKDOWNS || [];
  Object.entries(C.topics).forEach(([tid, t]) => {
    const cats = t.cats.map((_, i) => String(i)), hasW = t.wards > 0;
    out.push({ id: "cen_" + tid, p: "social", group: GROUP[tid] || "Census 2021", label: t.label, unit: t.unit, levels: hasW ? ["ward", "council", "region", "nation", "country"] : ["council", "region", "nation", "country"],
      nmText: hasW ? undefined : { ward: "Published for councils here (wards aren't in this table)" }, sumUp: true,
      valid: code => /^(S|N)/.test(code) ? "England and Wales only (Scotland and Northern Ireland run their own censuses)" : null,
      cats: () => cats, name: k => t.cats[+k], colour: k => PAL[+k % PAL.length], defPick: "0",
      of: (code, d, H) => {
        const lv = H.level(code);
        if (lv === "council") return obj(cats, t.v[code]);
        if (lv === "ward") { const W = wards(tid); return W ? obj(cats, W[code]) : null; }
        if (code === H.UKC()) return obj(cats, t.a.K04000001);
        return t.a[code] ? obj(cats, t.a[code]) : null;
      },
      scopeName: code => code === "K02000001" ? "England and Wales" : null, base: () => "K02000001", baseName: "England and Wales",
      yr: () => "2021", source: C.source, how: `Census 2021, ${t.label.toLowerCase()} (${t.ds}), counts of ${t.unit}`, desc: `${t.label}: every category the Census publishes, with the numbers` });
  });
})();
