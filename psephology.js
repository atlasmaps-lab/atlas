/* Atlas psephology: the election calculations, as a plug-in (Vision.md point 4: special metrics bring their own calculation).
 * Pure functions on vote counts; no knowledge of the map. Shares are proportions (0-1) unless a name says "pts" (percentage points).
 *
 *   tally(cands)              [[party, votes], ...] -> { total, list: [[party, votes, share]] sorted by votes, by: {party: votes} }
 *   enp(shares)               effective number of parties, 1 / sum(share^2)                         (Laakso & Taagepera 1979)
 *   pedersen(now, before, group)  volatility: 1/2 * sum |share now - share before|, in points      (Pedersen 1979)
 *   butler(now, before, a, b) swing: ((a now - a before) - (b now - b before)) / 2, in points; + = towards a
 *   steed(now, before, a, b)  two-party swing: change in a / (a + b), in points
 *   gallagher(rows)           disproportionality: sqrt(1/2 * sum (vote% - seat%)^2)                  (Gallagher 1991)
 *   majority(list, valid)     winner minus runner-up, votes and % of valid votes
 *   toFlip(majorityVotes)     floor(majority / 2) + 1
 *   wasted(list, valid)       votes for losing candidates + winner's votes beyond runner-up + 1, as a share of valid votes
 *   ideology(rows)            { centre, polarisation, covered } from [{share, x}] (x = 0-10 left-right; Dalton 2008 index)
 *   tests()                   hand-worked examples; each returns { name, got, want, ok }
 */
(function () {
  "use strict";
  function tally(cands) {
    const by = {}; let total = 0;
    cands.forEach(([p, v]) => { if (v == null) return; by[p] = (by[p] || 0) + v; total += v; });
    const list = Object.entries(by).map(([p, v]) => [p, v, total ? v / total : 0]).sort((a, b) => b[1] - a[1]);
    return { total, list, by };
  }
  const enp = shares => { const s = shares.reduce((a, x) => a + x * x, 0); return s ? 1 / s : null; };
  // now, before: {party: share 0-1}; group(party) -> the label used in both elections (e.g. small parties -> "oth")
  function pedersen(now, before, group) {
    const g = group || (p => p), A = {}, B = {};
    Object.entries(now).forEach(([p, s]) => { const k = g(p); A[k] = (A[k] || 0) + s; });
    Object.entries(before).forEach(([p, s]) => { const k = g(p); B[k] = (B[k] || 0) + s; });
    const keys = new Set([...Object.keys(A), ...Object.keys(B)]);
    let t = 0; keys.forEach(k => { t += Math.abs((A[k] || 0) - (B[k] || 0)); });
    return 50 * t;
  }
  const butler = (now, before, a, b) => 100 * (((now[a] || 0) - (before[a] || 0)) - ((now[b] || 0) - (before[b] || 0))) / 2;
  function steed(now, before, a, b) {
    const n = (now[a] || 0) + (now[b] || 0), o = (before[a] || 0) + (before[b] || 0);
    if (!n || !o) return null;
    return 100 * ((now[a] || 0) / n - (before[a] || 0) / o);
  }
  // rows: [{ votes: share 0-1, seats: share 0-1 }], one per party (all parties, including those with no seats)
  const gallagher = rows => Math.sqrt(rows.reduce((a, r) => a + Math.pow(100 * (r.votes - r.seats), 2), 0) / 2);
  function majority(list, valid) {
    if (!list.length) return null;
    const m = list[0][1] - (list[1] ? list[1][1] : 0);
    return { votes: m, pct: valid ? 100 * m / valid : null };
  }
  const toFlip = m => Math.floor(m / 2) + 1;
  function wasted(list, valid) {
    if (!list.length || !valid) return null;
    const losing = list.slice(1).reduce((a, x) => a + x[1], 0), surplus = list[0][1] - (list[1] ? list[1][1] : 0) - 1;
    return { votes: losing + Math.max(0, surplus), pct: 100 * (losing + Math.max(0, surplus)) / valid };
  }
  // rows: [{ share (0-1, of all votes), x (0-10) }] for parties with a score; renormalised over the scored parties
  function ideology(rows) {
    const scored = rows.filter(r => r.x != null && isFinite(r.x));
    const covered = scored.reduce((a, r) => a + r.share, 0);
    if (!covered) return { centre: null, polarisation: null, covered: 0 };
    const v = scored.map(r => ({ w: r.share / covered, x: r.x }));
    const centre = v.reduce((a, r) => a + r.w * r.x, 0);
    const polarisation = Math.sqrt(v.reduce((a, r) => a + r.w * Math.pow((r.x - centre) / 5, 2), 0));
    return { centre, polarisation, covered };
  }
  // hand-worked examples (also checked, the same way, by pipeline/validate_politics.py)
  function tests() {
    const near = (a, b, e) => a != null && Math.abs(a - b) < (e || 1e-9), out = [];
    const t = (name, got, want, e) => out.push({ name, got, want, ok: near(got, want, e) });
    // a three-party seat: A 50, B 30, C 20 (shares) -> ENP = 1 / (.25 + .09 + .04) = 2.6316
    t("ENP, three parties 50/30/20", enp([0.5, 0.3, 0.2]), 1 / 0.38);
    // before A 40 B 40 C 20, now A 50 B 30 C 20: Pedersen = (10 + 10 + 0) / 2 = 10 points
    t("Pedersen 40/40/20 -> 50/30/20", pedersen({ A: .5, B: .3, C: .2 }, { A: .4, B: .4, C: .2 }), 10);
    // Butler A vs B: ((50 - 40) - (30 - 40)) / 2 = 10 points towards A
    t("Butler A-B", butler({ A: .5, B: .3 }, { A: .4, B: .4 }, "A", "B"), 10);
    // Steed A vs B: 50/80 - 40/80 = 62.5% - 50% = 12.5 points
    t("Steed A-B", steed({ A: .5, B: .3 }, { A: .4, B: .4 }, "A", "B"), 12.5);
    // Gallagher: votes 50/30/20, seats 60/40/0 -> sqrt((100 + 100 + 400) / 2) = sqrt(300) = 17.3205
    t("Gallagher 50/30/20 v 60/40/0", gallagher([{ votes: .5, seats: .6 }, { votes: .3, seats: .4 }, { votes: .2, seats: 0 }]), Math.sqrt(300));
    // majority: 5000 v 3000 of 10000 valid -> 2000 votes, 20%; to flip: 1001; wasted: (3000 + 2000) + (2000 - 1) = 6999 -> 69.99%
    const L = [["A", 5000], ["B", 3000], ["C", 2000]];
    t("Majority (votes)", majority(L, 10000).votes, 2000); t("Majority (%)", majority(L, 10000).pct, 20);
    t("Votes to flip", toFlip(2000), 1001); t("Wasted votes (%)", wasted(L, 10000).pct, 69.99);
    // ideology: A 50% at 3, B 50% at 7 -> centre 5, polarisation sqrt(.5*(.4)^2 + .5*(.4)^2) = 0.4
    const I = ideology([{ share: .5, x: 3 }, { share: .5, x: 7 }]);
    t("Ideology centre", I.centre, 5); t("Dalton polarisation", I.polarisation, 0.4);
    return out;
  }
  window.AtlasPseph = { tally, enp, pedersen, butler, steed, gallagher, majority, toFlip, wasted, ideology, tests };
})();
