/* Atlas 0.9: Economic breakdowns (what each place's economy is made of). Specs read by app.js (window.ATLAS_BREAKDOWNS);
 * the numbers come from data/industry.js (pipeline/fetch_industry.py): ONS regional GVA by industry and BRES. */
(function () {
  "use strict";
  const I = window.ATLAS_INDUSTRY; if (!I) return;
  // SIC 2007 sections: a colour for each, so industries in the same section look alike
  const SEC = [["A", 1, 3, "#6a994e"], ["B", 5, 9, "#7f5539"], ["C", 10, 33, "#e76f51"], ["D", 35, 35, "#f4a261"], ["E", 36, 39, "#2a9d8f"], ["F", 41, 43, "#bc6c25"], ["G", 45, 47, "#e9c46a"],
    ["H", 49, 53, "#457b9d"], ["I", 55, 56, "#d62828"], ["J", 58, 63, "#7209b7"], ["K", 64, 66, "#1d3557"], ["L", 68, 68, "#8d99ae"], ["M", 69, 75, "#4361ee"], ["N", 77, 82, "#4cc9f0"],
    ["O", 84, 84, "#6c757d"], ["P", 85, 85, "#2b9348"], ["Q", 86, 88, "#c9184a"], ["R", 90, 93, "#ff8fab"], ["S", 94, 96, "#adb5bd"], ["T", 97, 98, "#ced4da"], ["U", 99, 99, "#ced4da"]];
  const firstNum = k => { const m = String(k).match(/\((\d+)/) || String(k).match(/^(\d+)/); return m ? +m[1] : null; };
  const secOf = k => { const n = firstNum(k); return n == null ? null : SEC.find(s => n >= s[1] && n <= s[2]); };
  const shade = (hex, k) => { const n = firstNum(k) || 0, f = ((n * 37) % 5 - 2) * 0.07; const c = parseInt(hex.slice(1), 16), ch = s => Math.max(0, Math.min(255, Math.round(((c >> s) & 255) * (1 + f)))); return "#" + [16, 8, 0].map(s => ch(s).toString(16).padStart(2, "0")).join(""); };
  const colour = k => { const s = secOf(k); return s ? shade(s[3], k) : "#999"; };
  const LV = ["council", "region", "nation", "country"];
  const out = window.ATLAS_BREAKDOWNS = window.ATLAS_BREAKDOWNS || [];
  if (I.gva && I.gva.v) {
    const N = I.gva.names, cats = Object.keys(N);
    out.push({ id: "eco_gva", p: "economic", group: "What the economy is made of", label: "Output by industry", unit: "£", levels: LV, sumUp: true,
      cats: () => cats, name: k => N[k] || k, colour, fmtV: v => "£" + (v >= 1000 ? (v / 1000).toFixed(v >= 10000 ? 0 : 1) + "bn" : Math.round(v) + "m"),
      of: (code, d, H) => H.level(code) === "council" ? I.gva.v[code] || null : null, yr: () => I.gva.year,
      source: I.sources.gva + " (OGL v3.0)", how: `Gross value added (£ million, current prices, ${I.gva.year}) by industry; regions, nations and the UK add up their councils`,
      desc: "What the area's economy produces, industry by industry (gross value added)" });
    out.push({ id: "eco_gva_grow", p: "economic", group: "What the economy is made of", label: `Growth by industry since ${I.gva.y0}`, unit: "£", levels: LV, sumUp: true,
      cats: () => cats, name: k => N[k] || k, colour, fmtV: v => (v >= 0 ? "+£" : "−£") + Math.abs(Math.round(v)) + "m",
      of: (code, d, H) => { if (H.level(code) !== "council") return null; const a = I.gva.v[code], b = I.gva.v0[code]; if (!a || !b) return null; const o = {}; for (const k in a) if (b[k] != null && a[k] > b[k]) o[k] = a[k] - b[k]; return o; },
      source: I.sources.gva + " (OGL v3.0)", how: `Industries that grew, by how much their output rose from ${I.gva.y0} to ${I.gva.year} (current prices, so including inflation)`,
      desc: "Where the area's growth came from: the industries that added most output" });
  }
  if (I.jobs && I.jobs.v) {
    const N = I.jobs.names, cats = Object.keys(N);
    out.push({ id: "eco_jobs", p: "economic", group: "What the economy is made of", label: "Jobs by industry", unit: "jobs", levels: LV, sumUp: true,
      cats: () => cats, name: k => `${k} ${N[k]}`, colour: k => colour(k),
      of: (code, d, H) => H.level(code) === "council" ? I.jobs.v[code] || null : null, yr: () => I.jobs.year,
      source: I.sources.jobs + " (OGL v3.0)", how: `Employment (employees and working owners) by 2-digit SIC 2007 industry, ${I.jobs.year}. Great Britain only; figures are rounded by ONS`,
      desc: "Who employs people here: 88 industries", nmText: { ward: "Published for councils" } });
  }
})();
