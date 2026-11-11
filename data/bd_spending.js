/* Atlas 0.10: Public spending breakdowns. Specs read by app.js (window.ATLAS_BREAKDOWNS); numbers from data/spending.js
 * (pipeline/fetch_spending.py): HM Treasury Country and Regional Analysis (regions and nations) and MHCLG revenue outturn
 * (English councils, with a population share of the county's spending in two-tier areas). */
(function () {
  "use strict";
  const S = window.ATLAS_SPEND; if (!S) return;
  const out = window.ATLAS_BREAKDOWNS = window.ATLAS_BREAKDOWNS || [];
  const FN_COL = { "General public services": "#6c757d", "Defence": "#495057", "Public order and safety": "#355070", "Economic affairs": "#e09f3e", "Environment protection": "#2a9d8f",
    "Housing and community amenities": "#bc6c25", "Health": "#c9184a", "Recreation, culture and religion": "#9d4edd", "Education": "#2b9348", "Social protection": "#1d4e89" };
  const col = k => FN_COL[String(k).split(":")[0]] || "#888";
  const m = v => "£" + (v >= 1000 ? (v / 1000).toFixed(v >= 10000 ? 0 : 1) + "bn" : Math.round(v) + "m");
  const RLV = ["region", "nation", "country"], RNM = { council: "Published for regions and nations: see Council spending by service", ward: "Published for regions and nations" };
  const C = S.cra;
  if (C && C.fn) {
    const last = C.years[C.years.length - 1], sumRegions = (pick, code) => { const o = {}; Object.keys(C.tot).filter(k => code === "K02000001" || (code === "E92000001" && k.startsWith("E12"))).forEach(k => { const x = pick(k) || {}; for (const c in x) o[c] = (o[c] || 0) + x[c]; }); return Object.keys(o).length ? o : null; };
    const fnOf = (code, d) => { const fy = C.years.filter(y => +y.slice(0, 4) + "-10-01" <= d).pop() || last; const pick = k => (C.fn[k] || {})[fy]; return C.fn[code] ? pick(code) : sumRegions(pick, code); };
    out.push({ id: "spd_fn", p: "economic", group: "Public spending", label: "Public spending by function", unit: "£", fmtV: m, levels: RLV, nmText: RNM, temporal: "annual", span: () => [+C.years[0].slice(0, 4) + "-10-01", "2099-01-01"],
      cats: () => Object.keys(FN_COL), name: k => k, colour: col, of: (code, d) => fnOf(code, d), yr: (c, d) => C.years.filter(y => +y.slice(0, 4) + "-10-01" <= (d || "2099")).pop() || last,
      source: S.sources.cra + " (OGL v3.0)", how: "Identifiable public spending (£ million, current prices) by UN function (COFOG); the UK and England add up their regions",
      desc: "What government spends here, by purpose: social protection, health, education, transport and more", defPick: "Health" });
    out.push({ id: "spd_sub", p: "economic", group: "Public spending", label: "Public spending in detail", unit: "£", fmtV: m, levels: RLV, nmText: RNM,
      cats: () => [...new Set(Object.values(C.sub).flatMap(o => Object.keys(o)))], name: k => k, colour: col,
      of: code => C.sub[code] || sumRegions(k => C.sub[k], code), yr: () => last, source: S.sources.cra + " (OGL v3.0)",
      how: `Identifiable public spending in ${last} by sub-function (for example social protection: old age, family and children, sickness and disability, housing)`, desc: "Spending broken into about 60 purposes" });
    out.push({ id: "spd_dept", p: "economic", group: "Public spending", label: "Public spending by department", unit: "£", fmtV: m, levels: ["region", "nation"], nmText: RNM,
      cats: () => [...new Set(Object.values(C.dept).flatMap(o => Object.keys(o)))], name: k => k, colour: (k => { let h = 0; for (const c of k) h = (h * 31 + c.charCodeAt(0)) % 360; return `hsl(${h},45%,45%)`; }),
      of: code => C.dept[code] || null, yr: () => last, source: S.sources.cra + " (OGL v3.0)", how: `Identifiable spending in ${last} by the department (or devolved government) that spends it; the 15 largest in each area`,
      desc: "Who spends the money here: departments, devolved governments and councils" });
  }
  const L = S.la;
  if (L && L.v) {
    const cats = L.services.map((_, i) => String(i)), SCOL = ["#2b9348", "#e09f3e", "#c9184a", "#9b2226", "#bc6c25", "#9d4edd", "#2a9d8f", "#6c757d", "#355070", "#e76f51", "#457b9d", "#8d99ae", "#adb5bd"];
    out.push({ id: "spd_council", p: "economic", group: "Public spending", label: "Council spending by service", unit: "£", fmtV: m, levels: ["council", "region", "nation"], sumUp: true,
      valid: code => /^(S|W|N)/.test(code) ? "England only for now" : null, nmText: { ward: "Published for councils" },
      cats: () => cats, name: k => L.services[+k].replace(/ services$/i, ""), colour: k => SCOL[+k % SCOL.length],
      of: (code, d, H) => { if (H.level(code) !== "council" || !window.AtlasCouncilSpend) return null; const r = window.AtlasCouncilSpend(code); if (!r) return null; const o = {}; r.v.forEach((v, i) => { if (v > 0) o[String(i)] = v; }); return o; },
      yr: () => L.year, source: S.sources.la + " (OGL v3.0)", how: `Net current expenditure by service, ${L.year}; districts in two-tier areas include a population share of their county's spending (education, social care, highways)`,
      desc: "What councils spend on residents: social care, education, roads, housing, waste and more", defPick: "2" });
  }
})();
