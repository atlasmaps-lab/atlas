// Atlas 1.7: coverage of the political metrics, computed in the app itself.
// Open index.html?debug, wait for the map, paste this into the browser console, and copy the printed text into
// pipeline/reports/coverage_politics.txt (then run python3 pipeline/validate_politics.py).
(async () => {
  for (const k of ["2010", "1997"]) { const s = document.createElement("script"); s.src = "data/constituencies_" + k + ".js"; document.body.appendChild(s); }
  await new Promise(r => setTimeout(r, 4000));
  const D = window.AtlasDebug, P = D.P;
  const old = ["control", "tenure", "turnover", "ruler", "party", "protest_events", "protest_count", "protest_rate", "protest_largest", "protest_people", "protest_cause", "protest_align", "protest_parties"];
  const ms = D.METRICS.filter(m => m.p === "political" && !old.includes(m.id) && m.nature !== "text");
  const GE = ["1997-05-02", "2001-06-08", "2005-05-06", "2010-05-07", "2015-05-08", "2017-06-09", "2019-12-13", "2024-07-05"], NOW = new Date().toISOString().slice(0, 10);
  const lines = [];
  for (const m of ms) for (const L of ["nation", "region", "council", "constituency"]) {
    const dates = m.temporal === "election" && !m.id.startsWith("eu_") ? GE.concat([NOW]) : [NOW], cells = []; let names = "";
    for (const d of dates) {
      const codes = Object.keys(P).filter(c => P[c].level === L && (!P[c].from || P[c].from <= d) && (!P[c].to || d < P[c].to));
      let v = 0, e = 0, miss = 0, nm = 0; const mn = [];
      for (const c of codes) { const r = m.get(c, d); if (r && r.nm) nm++; else if (r && r.v != null) { v++; if (r.est) e++; } else { miss++; if (mn.length < 6) mn.push(P[c].name); } }
      if (codes.length) cells.push(`${d.slice(0, 4)}:${codes.length},${v},${e},${miss},${nm}`); if (!names && mn.length) names = mn.join(";");
    }
    lines.push(`${m.id}|${L}|${cells.join(" ")}|${names}`);
  }
  console.log(lines.join("\n"));
})();
