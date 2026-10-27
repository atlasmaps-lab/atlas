/* Atlas engine: decides which calculations and which visual encodings suit each metric.
 *
 * Every metric declares what kind of data it is:
 *   scale     nominal (categories) | ordinal (ordered categories) | interval | ratio (true zero)
 *   nature    category | count | amount | rate | share | duration | change | event | text
 *   temporal  state (holds until it changes) | annual (one value per year) | event (dated happenings) | static |
 *             election (a result holds from its polling day until the next election or by-election in that area)
 *   mid       a meaningful midpoint (e.g. 0 for growth), which makes the scale diverging
 *   weight    the metric to weight by when combining areas (e.g. population for a per-head rate)
 * From that, the engine answers:
 *   aggregate(m)        how to combine councils into regions and nations
 *   classify(m, values) how to cut values into colour classes (and why)
 *   channels(m)         which visual channels can show it, best first
 *   plan(metrics)       one combined encoding for several metrics at once
 *   relate(a, b)        which statistic and chart compare two metrics
 *   timeOps(m)          which operations over time make sense
 *   derive(m)           extra metrics worth computing (per head, change over time)
 * Each answer carries a plain-English reason so the interface can say why it chose it.
 */
(function () {
  "use strict";
  const NUMERIC = new Set(["interval", "ratio"]);
  const isNum = m => NUMERIC.has(m.scale);
  const isCat = m => m.scale === "nominal" && m.nature !== "text" && m.nature !== "event" && m.nature !== "site";

  // ---------- describing a set of values ----------
  function profile(values) {
    const v = values.filter(x => x != null && isFinite(x)).sort((a, b) => a - b);
    const n = v.length;
    if (!n) return { n: 0 };
    const mean = v.reduce((a, b) => a + b, 0) / n;
    const sd = Math.sqrt(v.reduce((a, b) => a + (b - mean) ** 2, 0) / n) || 0;
    const q = p => v[Math.min(n - 1, Math.floor(p * n))];
    const skew = sd ? v.reduce((a, b) => a + ((b - mean) / sd) ** 3, 0) / n : 0;
    return { n, min: v[0], max: v[n - 1], mean, sd, median: q(0.5), q1: q(0.25), q3: q(0.75), skew,
      zeros: v.filter(x => x === 0).length, positive: v[0] > 0, distinct: new Set(v).size, sorted: v };
  }

  // ---------- combining areas ----------
  function aggregate(m) {
    switch (m.nature) {
      case "count": case "amount": return { fn: "sum", why: `${m.label} is a total, so larger areas add up their councils.` };
      case "rate": case "share": return m.weight
        ? { fn: "ratio", why: `${m.label} is a rate, so it is recalculated from the summed totals, not averaged.` }
        : { fn: "wmean", why: `${m.label} is a rate, so councils are averaged (weighted by population where known).` };
      case "duration": return { fn: "mean", why: `${m.label} is a length of time, so councils are averaged.` };
      case "change": return { fn: "recompute", why: `${m.label} is a change, so it is recalculated from the larger area's own totals.` };
      case "category": return { fn: "mode", why: `${m.label} is a category, so the larger area shows the most common one, with its share.` };
      case "event": return { fn: "collect", why: `${m.label} are dated events, so a larger area collects every event inside it.` };
      default: return { fn: "none", why: `${m.label} is text, so it is not combined.` };
    }
  }

  // ---------- cutting values into classes ----------
  function niceRound(x) { if (!x) return 0; const p = Math.pow(10, Math.floor(Math.log10(Math.abs(x))) - 1); return Math.round(x / p) * p; }
  function classify(m, values, k) {
    k = k || 5;
    const p = profile(values);
    if (!p.n) return { method: "none", breaks: [], why: "No values to classify." };
    if (m.breaks && k === 5) return { method: "fixed", breaks: m.breaks, why: "Fixed steps, so colours mean the same thing on every date." };
    if (m.mid != null && p.min < m.mid && p.max > m.mid) {
      const span = Math.max(m.mid - p.min, p.max - m.mid), lo = m.mid - span, step = (2 * span) / k;
      // diverging: symmetrical around the midpoint so "above" and "below" read equally strongly
      const tight = Math.max(Math.abs(p.q1 - m.mid), Math.abs(p.q3 - m.mid)) * 1.6 || span;
      const s = Math.min(span, tight), b = []; for (let i = 1; i < k; i++) b.push(niceRound(m.mid - s + (2 * s) * i / k));
      return { method: "diverging", breaks: b, mid: m.mid, why: `Values fall either side of ${m.mid}, so colours diverge from a neutral middle.` };
    }
    const p05 = p.sorted[Math.floor(0.05 * (p.n - 1))], p95 = p.sorted[Math.floor(0.95 * (p.n - 1))];
    if (p.positive && p95 / p05 > 20 && p.skew > 2) {   // judged on the middle 90%, so one extreme area can't force a log scale
      const lo = Math.log10(p.min), hi = Math.log10(p.max), b = [];
      for (let i = 1; i < k; i++) b.push(niceRound(Math.pow(10, lo + (hi - lo) * i / k)));
      return { method: "log", breaks: b, why: "A few areas are far larger than the rest, so classes grow by multiples (log scale)." };
    }
    if (Math.abs(p.skew) > 0.8 || p.distinct < k * 3) {
      const b = []; for (let i = 1; i < k; i++) b.push(p.sorted[Math.floor(i * p.n / k)]);
      const outl = p95 && (p.max > p95 * 3 || (p05 > 0 && p.min < p05 / 3));
      return { method: "quantile", breaks: [...new Set(b)], why: outl ? "A few extreme areas would wash out the rest, so each colour holds about the same number of areas (quantiles)." : "Values are bunched, so each colour holds about the same number of areas (quantiles)." };
    }
    const b = []; for (let i = 1; i < k; i++) b.push(niceRound(p.min + (p.max - p.min) * i / k));
    return { method: "equal", breaks: b, why: "Values are spread evenly, so each colour covers an equal range." };
  }
  const classOf = (v, br) => { let c = 0; while (c < br.length && v >= br[c]) c++; return c; };

  // ---------- visual channels ----------
  // hue: fill colour by category · shade: fill light→dark · grid: 2-D colour grid with another metric ·
  // diverge: two-sided fill · badge: small marker at each area's centre · dots: dot pattern sized by value · size: circles ·
  // points: one mark per event · heat: density of events · alpha: opacity
  function channels(m) {
    if (m.nature === "text") return [];
    if (m.nature === "site") return [{ ch: "sites", score: 1, why: "Each one is a fixed place (e.g. a headquarters), so it is a point sized by its value." }];
    if (m.nature === "event") return [{ ch: "points", score: 1, why: "Each event is a dated place, so it is a point that appears and fades with time." }, { ch: "heat", score: 0.8, why: "Many overlapping events read best as a density surface." }];
    if (isCat(m)) return [{ ch: "hue", score: 1, why: "Categories have no order, so they get distinct colours." }, { ch: "badge", score: 0.7, why: "A second category can be a small marker at the centre of each area." }];
    if (m.scale === "ordinal") return [{ ch: "shade", score: 1 }, { ch: "dots", score: 0.6 }];
    const out = [];
    if (m.mid != null) out.push({ ch: "diverge", score: 1, why: "It has a meaningful middle, so it gets a two-sided colour scale." });
    if (m.nature === "count" || m.nature === "amount") {
      out.push({ ch: "size", score: 1, why: "It is a total, so bigger areas naturally have more; circles show size without colouring area." });
      out.push({ ch: "shade", score: 0.45, why: "Shading totals can mislead because large areas dominate; prefer a per-head version." });
      out.push({ ch: "dots", score: 0.5 });
    } else {
      out.push({ ch: "shade", score: 0.95, why: "It is a rate, so it can be compared area by area as light to dark." });
      out.push({ ch: "grid", score: 0.9, why: "Two rates can share one colour grid (bivariate)." });
      out.push({ ch: "dots", score: 0.7, why: "A dot pattern shows a second value without hiding the fill colour." });
      out.push({ ch: "size", score: 0.35 });
    }
    return out;
  }

  // one encoding for several metrics; each channel holds at most one metric
  function plan(metrics, prefs) {
    prefs = prefs || {};
    const P = { hue: null, shade: null, grid: null, diverge: null, badge: null, dots: null, size: null, points: null, heat: null, sites: null, notes: [] };
    const take = (ch, m, why) => { P[ch] = m; P.notes.push({ id: m.id, ch, why }); };
    const free = ch => !P[ch];
    const want = (m, ch) => prefs[m.id] === ch;
    const cats = metrics.filter(isCat), nums = metrics.filter(isNum), evs = metrics.filter(m => m.nature === "event");
    // user choices first, when the channel suits the metric
    metrics.forEach(m => { const ch = prefs[m.id]; if (ch && channels(m).some(c => c.ch === ch) && free(ch)) take(ch, m, "Chosen by you."); });
    const placed = m => P.notes.some(n => n.id === m.id);
    cats.filter(m => !placed(m)).forEach(m => {
      if (free("hue")) take("hue", m, `${m.label} is a category, so it sets the fill colour.`);
      else if (free("badge")) take("badge", m, `${m.label} is a second category, so it is a small marker at the centre of each area; where marker and fill differ, the two disagree.`);
    });
    metrics.filter(m => m.nature === "site" && !placed(m)).forEach(m => { if (free("sites")) take("sites", m, channels(m)[0].why); });
    evs.filter(m => !placed(m)).forEach(m => { if (free("points")) take("points", m, channels(m)[0].why); else if (free("heat")) take("heat", m, channels(m)[1].why); });
    nums.filter(m => !placed(m)).sort((a, b) => (channels(b)[0] || {}).score - (channels(a)[0] || {}).score).forEach(m => {
      const best = channels(m).map(c => c.ch);
      const fillTaken = P.shade || P.diverge || P.grid;
      if ((m.nature === "count" || m.nature === "amount") && free("size")) return take("size", m, channels(m).find(c => c.ch === "size").why);
      if (P.hue && !P.shade && best.includes("shade")) return take("shade", m, `${P.hue.label} sets the colour, so ${m.label} sets how light or dark it is (value by lightness).`);
      if (!P.hue && !fillTaken && m.mid != null) return take("diverge", m, channels(m)[0].why);
      if (!P.hue && !fillTaken && best.includes("shade")) return take("shade", m, channels(m).find(c => c.ch === "shade").why);
      if (!P.hue && P.shade && !P.grid && P.shade.nature !== "count" && best.includes("grid")) return take("grid", m, `${P.shade.label} and ${m.label} are both rates, so they share one colour grid (bivariate).`);
      if (free("dots") && best.includes("dots")) return take("dots", m, `The fill is in use, so ${m.label} is shown as dots: bigger dots mean higher values. Dots keep their contrast over any colour.`);
      if (free("size")) return take("size", m, `${m.label} is shown as circles because the fill and dots are already in use.`);
      P.notes.push({ id: m.id, ch: null, why: `No free channel left for ${m.label}. Turn another layer off, or compare it on the comparison page.` });
    });
    if (P.grid && prefs.__gridOff) { P.dots = P.dots || P.grid; P.grid = null; }
    resolveFill(P, prefs, metrics);
    return P;
  }

  // The area fill can only show one of these: a category (hue), a category with lightness (hue + shade), a colour grid
  // (grid + a partner rate on shade), lightness alone (shade) or a two-sided colour (diverge). Other mixes used to leave
  // a metric listed as "on the map" but invisible. This moves metrics until every one of them is actually drawn.
  function resolveFill(P, prefs, metrics) {
    const note = m => P.notes.find(n => n.id === m.id);
    const move = (m, from, to, why) => { if (from && P[from] === m) P[from] = null; if (to) P[to] = m; const n = note(m); if (n) { n.ch = to; n.why = why; } else P.notes.push({ id: m.id, ch: to, why }); };
    const OUT = { badge: "a centre marker", dots: "dots", size: "circles" };
    const rehome = (m, from, reason) => { // find another channel for a metric pushed out of the fill
      const ch = channels(m).map(c => c.ch).find(c => OUT[c] && !P[c]);
      if (ch) move(m, from, ch, `${reason}, so ${m.label} is shown as ${OUT[ch]}.`);
      else move(m, from, null, `No free channel left for ${m.label} (${reason.toLowerCase()}). Turn another layer off, or compare it on the comparison page.`);
    };
    const pinnedElsewhere = m => prefs[m.id] && prefs[m.id] !== "grid" && prefs[m.id] !== "shade";
    if (P.grid && !P.shade) {
      // a colour grid needs a second rate for its other axis: borrow one that the person hasn't placed themselves
      const partner = metrics.find(m => m !== P.grid && isNum(m) && m.nature !== "count" && m.nature !== "amount" && channels(m).some(c => c.ch === "grid") && !pinnedElsewhere(m));
      if (partner) move(partner, ["dots", "size", "diverge"].find(ch => P[ch] === partner), "shade", `${partner.label} is the other axis of the colour grid with ${P.grid.label}.`);
      else { const g = P.grid; P.grid = null; if (!P.shade) move(g, null, "shade", `A colour grid needs two rates. With only one available, ${g.label} is shown as lightness. Set another rate to "colour grid" or "lightness" to pair them.`); else rehome(g, null, "A colour grid needs a second rate"); }
    }
    if (P.grid) {
      // a grid and a category can't both colour the fill: the category becomes a marker
      if (P.hue) rehome(P.hue, "hue", "The colour grid uses the fill");
      if (P.diverge) rehome(P.diverge, "diverge", "The colour grid uses the fill");
    }
    // a two-sided colour can't share the fill with a category or lightness
    if (P.diverge && (P.hue || P.shade)) rehome(P.diverge, "diverge", P.hue ? `${P.hue.label} colours the fill` : `${P.shade.label} uses the fill`);
  }

  // ---------- comparing two metrics ----------
  function relate(a, b) {
    if (a.nature === "text" || b.nature === "text") return { method: "none", why: "Text can be listed side by side but not measured against something else." };
    if (isCat(a) && isCat(b)) return { method: "crosstab", stat: "cramersV", why: "Both are categories, so the engine counts how often each pair occurs (a cross-tab) and measures the link with Cramér's V (0 = none, 1 = perfect)." };
    if (isCat(a) || isCat(b)) return { method: "groups", stat: "eta2", cat: isCat(a) ? a : b, num: isCat(a) ? b : a, why: "One is a category and one is a number, so the engine compares the number across each category (medians and spread) and reports how much the categories explain (η²)." };
    return { method: "scatter", stat: "both", why: "Both are numbers, so the engine plots one against the other. It reports Pearson's r (straight-line link) and Spearman's ρ (link in ranks, robust to outliers)." };
  }
  function pearson(xs, ys) { const n = xs.length; if (n < 3) return null; const mx = xs.reduce((a, b) => a + b, 0) / n, my = ys.reduce((a, b) => a + b, 0) / n; let s = 0, a = 0, b = 0; for (let i = 0; i < n; i++) { s += (xs[i] - mx) * (ys[i] - my); a += (xs[i] - mx) ** 2; b += (ys[i] - my) ** 2; } return a && b ? s / Math.sqrt(a * b) : null; }
  function ranks(v) { const idx = v.map((x, i) => [x, i]).sort((p, q) => p[0] - q[0]); const r = new Array(v.length); for (let i = 0; i < idx.length;) { let j = i; while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++; for (let k = i; k <= j; k++) r[idx[k][1]] = (i + j) / 2 + 1; i = j + 1; } return r; }
  function spearman(xs, ys) { return pearson(ranks(xs), ranks(ys)); }
  function cramersV(pairs) {
    const A = [...new Set(pairs.map(p => p[0]))], B = [...new Set(pairs.map(p => p[1]))], n = pairs.length;
    if (A.length < 2 || B.length < 2) return null;
    const t = {}, ra = {}, rb = {}; pairs.forEach(([x, y]) => { t[x + "|" + y] = (t[x + "|" + y] || 0) + 1; ra[x] = (ra[x] || 0) + 1; rb[y] = (rb[y] || 0) + 1; });
    let chi = 0; A.forEach(x => B.forEach(y => { const e = ra[x] * rb[y] / n; chi += ((t[x + "|" + y] || 0) - e) ** 2 / e; }));
    return Math.sqrt(chi / (n * (Math.min(A.length, B.length) - 1)));
  }
  function eta2(groups) { // groups: {cat: [values]}
    const all = [].concat(...Object.values(groups)); if (all.length < 3) return null;
    const m = all.reduce((a, b) => a + b, 0) / all.length; let ssb = 0, sst = 0;
    Object.values(groups).forEach(g => { if (!g.length) return; const gm = g.reduce((a, b) => a + b, 0) / g.length; ssb += g.length * (gm - m) ** 2; });
    all.forEach(v => { sst += (v - m) ** 2; }); return sst ? ssb / sst : null;
  }
  function strength(r) { if (r == null) return "too few areas to say"; const a = Math.abs(r); return a < 0.1 ? "no real link" : a < 0.3 ? "a weak link" : a < 0.5 ? "a moderate link" : a < 0.7 ? "a strong link" : "a very strong link"; }

  // ---------- time ----------
  function timeOps(m) {
    switch (m.temporal) {
      case "state": return [{ op: "at", label: "Value on the date" }, { op: "since", label: "Time since it last changed" }, { op: "changes", label: "Number of changes in a window" }];
      case "annual": return [{ op: "at", label: "Value in that year" }, { op: "change", label: "Change over N years" }, { op: "growth", label: "Growth (% per year)" }];
      case "election": return [{ op: "at", label: "Latest election on or before the date" }, { op: "change", label: "Change since the previous election" }];
      case "event": return [{ op: "window", label: "Events in a window before the date" }, { op: "cumulative", label: "All events up to the date" }, { op: "rate", label: "Events per 100,000 people" }];
      default: return [{ op: "at", label: "Single snapshot (no history loaded)" }];
    }
  }
  function derive(m) {
    const out = [];
    if ((m.nature === "count" || m.nature === "amount") && m.temporal !== "event") out.push({ kind: "perHead", why: `${m.label} per person, so small and large areas compare fairly.` });
    if (m.temporal === "annual" && isNum(m)) out.push({ kind: "change", why: `Change in ${m.label} over time, to see which areas are rising or falling.` });
    if (m.nature === "event") out.push({ kind: "rate", why: `${m.label} per 100,000 people, so busy big cities don't dominate.` });
    return out;
  }

  // ---------- which chart styles suit a choice of metrics and places ----------
  // Simple styles come first; story views are experimental and only for one number metric.
  function chartStyles(metrics, nPlaces) {
    const nums = metrics.filter(isNum), cats = metrics.filter(isCat), timed = metrics.some(m => m.temporal !== "static");
    const one = metrics.length === 1, m = metrics[0] || {};
    const S = (id, label, ok, why, story) => ({ id, label, ok: !!ok, why, story: !!story });
    const out = [
      S("line", "Line", one && isNum(m) && timed, "Change over time for each place: the simplest way to see trends."),
      S("area", "Area", one && isNum(m) && timed && nPlaces <= 4, "Like a line, shaded underneath; best for one or a few places."),
      S("bars", "Bars by year", one && isNum(m) && timed && nPlaces <= 6, "One bar per year: good for totals and counts."),
      S("slope", "Start vs end", one && isNum(m) && timed && nPlaces >= 2, "Who rose and who fell between the first and last year."),
      S("ranked", "Ranked", one && isNum(m) && nPlaces >= 2, "Places in order on the date shown."),
      S("band", "Timeline", one && isCat(m) && timed, "The category each place had, year by year."),
      S("pie", "Shares (donut)", one && (isCat(m) || m.nature === "count" || m.nature === "amount") && (isCat(m) || nPlaces >= 2), isCat(m) ? "How the places split between categories on the date shown." : "Each place's share of the total on the date shown."),
      S("dual", "Two axes", metrics.length === 2 && nums.length === 2 && timed && nPlaces <= 3, "Two different metrics over time, each on its own scale."),
      S("multiples", "Small charts", metrics.length >= 2 && timed, "One small chart per metric in the same frame, so different units don't clash."),
      S("dye", "Dye in water", one && isNum(m) && nPlaces >= 2 && nPlaces <= 10, "Story view: glasses that fill and darken with the value.", true),
      S("scale", "Balance", one && isNum(m) && nPlaces === 2, "Story view: a balance; the heavier place drops.", true),
      S("orbits", "Orbits", one && isNum(m) && nPlaces >= 3, "Story view: places orbit the average; further out means less typical.", true),
      S("tree", "Tree", one && (isNum(m) || isCat(m)), "Story view: branches are areas, leaves the smaller areas inside them.", true),
    ];
    out.forEach(o => { if (!o.ok) o.why = (metrics.length ? "" : "Choose a metric first. ") + o.why; });
    const firstOk = out.find(o => o.ok && !o.story);
    return { styles: out, best: firstOk ? firstOk.id : (out.find(o => o.ok) || {}).id };
  }

  window.AtlasEngine = { chartStyles, profile, aggregate, classify, classOf, channels, plan, relate, pearson, spearman, cramersV, eta2, strength, timeOps, derive, isNum, isCat };
})();
