/* Atlas statistics: plain functions, no libraries. Every result says how many cases it used.
 *  describe(values)            n, mean, sd, quartiles, skew, kurtosis, outliers (1.5 × IQR)
 *  histogram(values)           bins chosen by the Freedman–Diaconis rule
 *  pearson / spearman / kendall(x, y) with two-sided p-values
 *  regress(x, y)               straight line: slope, intercept, R², 95% interval for the slope, residuals
 *  multiple(y, X, names)       multiple regression: coefficients, standard errors, p-values, R², adjusted R², residuals
 *  corrMatrix(cols) / partial(cols)   every pair's correlation, and each pair's correlation holding the others fixed
 *  pca(cols)                   principal components: which metrics move together, and each case's score
 *  kmeans(cols, k) / bestK     groups of similar cases across many metrics (k chosen by silhouette)
 *  mahalanobis(cols)           how unusual each case is across all metrics at once
 *  moran(values, nbrs)         spatial autocorrelation (do similar values cluster in space?) and local hot/cold spots
 *  lagged(a, b, maxLag)        correlation of two time series at different lags
 */
(function () {
  "use strict";
  const sum = a => a.reduce((s, v) => s + v, 0), mean = a => a.length ? sum(a) / a.length : NaN;
  const sd = a => { const m = mean(a); return Math.sqrt(sum(a.map(v => (v - m) ** 2)) / Math.max(1, a.length - 1)); };
  const q = (s, p) => { if (!s.length) return NaN; const i = (s.length - 1) * p, lo = Math.floor(i), hi = Math.ceil(i); return s[lo] + (s[hi] - s[lo]) * (i - lo); };
  const ok = v => v != null && isFinite(v);
  function pairs(x, y) { const a = [], b = [], idx = []; for (let i = 0; i < x.length; i++) if (ok(x[i]) && ok(y[i])) { a.push(+x[i]); b.push(+y[i]); idx.push(i); } return [a, b, idx]; }

  // ---------- distributions of probability (for p-values) ----------
  function lgamma(z) { const g = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5]; let x = z, y = z, t = x + 5.5; t -= (x + 0.5) * Math.log(t); let s = 1.000000000190015; for (const c of g) s += c / ++y; return -t + Math.log(2.5066282746310005 * s / x); }
  function betacf(a, b, x) { let qab = a + b, qap = a + 1, qam = a - 1, c = 1, d = 1 - qab * x / qap; if (Math.abs(d) < 1e-30) d = 1e-30; d = 1 / d; let h = d;
    for (let m = 1; m <= 200; m++) { const m2 = 2 * m; let aa = m * (b - m) * x / ((qam + m2) * (a + m2)); d = 1 + aa * d; if (Math.abs(d) < 1e-30) d = 1e-30; c = 1 + aa / c; if (Math.abs(c) < 1e-30) c = 1e-30; d = 1 / d; h *= d * c;
      aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2)); d = 1 + aa * d; if (Math.abs(d) < 1e-30) d = 1e-30; c = 1 + aa / c; if (Math.abs(c) < 1e-30) c = 1e-30; d = 1 / d; const del = d * c; h *= del; if (Math.abs(del - 1) < 3e-7) break; }
    return h; }
  function ibeta(x, a, b) { if (x <= 0) return 0; if (x >= 1) return 1; const bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x)); return x < (a + 1) / (a + b + 2) ? bt * betacf(a, b, x) / a : 1 - bt * betacf(b, a, 1 - x) / b; }
  const tP = (t, df) => df > 0 ? ibeta(df / (df + t * t), df / 2, 0.5) : NaN;                     // two-sided p for a t statistic
  const fP = (f, d1, d2) => ibeta(d2 / (d2 + d1 * f), d2 / 2, d1 / 2);                            // upper tail of F
  function gammaP(a, x) { if (x <= 0) return 0; if (x < a + 1) { let s = 1 / a, t = s; for (let n = 1; n < 300; n++) { t *= x / (a + n); s += t; if (t < s * 1e-10) break; } return s * Math.exp(-x + a * Math.log(x) - lgamma(a)); }
    let b = x + 1 - a, c = 1e30, d = 1 / b, h = d; for (let i = 1; i < 300; i++) { const an = -i * (i - a); b += 2; d = an * d + b; if (Math.abs(d) < 1e-30) d = 1e-30; c = b + an / c; if (Math.abs(c) < 1e-30) c = 1e-30; d = 1 / d; const del = d * c; h *= del; if (Math.abs(del - 1) < 1e-10) break; } return 1 - Math.exp(-x + a * Math.log(x) - lgamma(a)) * h; }
  const chiP = (x, df) => 1 - gammaP(df / 2, x / 2);
  const normP = z => { const t = 1 / (1 + 0.2316419 * Math.abs(z)), d = 0.3989423 * Math.exp(-z * z / 2), p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return 2 * p; };

  // ---------- one variable ----------
  function describe(values) {
    const v = values.filter(ok).map(Number).sort((a, b) => a - b), n = v.length; if (!n) return { n: 0 };
    const m = mean(v), s = sd(v), q1 = q(v, .25), q3 = q(v, .75), iqr = q3 - q1;
    const skew = n > 2 && s ? sum(v.map(x => ((x - m) / s) ** 3)) * n / ((n - 1) * (n - 2)) : 0;
    const kurt = n > 3 && s ? sum(v.map(x => ((x - m) / s) ** 4)) / n - 3 : 0;
    const lo = q1 - 1.5 * iqr, hi = q3 + 1.5 * iqr;
    return { n, mean: m, sd: s, min: v[0], q1, median: q(v, .5), q3, max: v[n - 1], iqr, skew, kurt, cv: m ? s / Math.abs(m) : NaN, lowFence: lo, highFence: hi, outliersLow: v.filter(x => x < lo).length, outliersHigh: v.filter(x => x > hi).length, sorted: v };
  }
  function histogram(values, bins) {
    const d = describe(values); if (!d.n) return [];
    let k = bins; if (!k) { const w = 2 * d.iqr / Math.cbrt(d.n); k = w > 0 ? Math.ceil((d.max - d.min) / w) : 10; k = Math.max(5, Math.min(40, k)); }
    const w = (d.max - d.min) / k || 1, out = Array.from({ length: k }, (_, i) => ({ lo: d.min + i * w, hi: d.min + (i + 1) * w, n: 0 }));
    d.sorted.forEach(x => { out[Math.min(k - 1, Math.floor((x - d.min) / w))].n++; }); return out;
  }

  // ---------- two variables ----------
  function pearson(x, y) { const [a, b] = pairs(x, y), n = a.length; if (n < 3) return { r: null, n }; const ma = mean(a), mb = mean(b); let s = 0, da = 0, db = 0; for (let i = 0; i < n; i++) { s += (a[i] - ma) * (b[i] - mb); da += (a[i] - ma) ** 2; db += (b[i] - mb) ** 2; } const r = da && db ? s / Math.sqrt(da * db) : null; return { r, n, p: r == null ? null : rP(r, n) }; }
  const rP = (r, n) => Math.abs(r) >= 1 ? 0 : tP(r * Math.sqrt((n - 2) / (1 - r * r)), n - 2);
  function ranks(v) { const idx = v.map((x, i) => [x, i]).sort((p, q2) => p[0] - q2[0]), r = new Array(v.length); for (let i = 0; i < idx.length;) { let j = i; while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++; for (let k = i; k <= j; k++) r[idx[k][1]] = (i + j) / 2 + 1; i = j + 1; } return r; }
  function spearman(x, y) { const [a, b] = pairs(x, y); if (a.length < 3) return { r: null, n: a.length }; const res = pearson(ranks(a), ranks(b)); return { r: res.r, n: a.length, p: res.p }; }
  function kendall(x, y) { // tau-b
    let [a, b] = pairs(x, y), n = a.length; if (n < 3) return { r: null, n };
    if (n > 600) { const step = Math.ceil(n / 600); a = a.filter((_, i) => i % step === 0); b = b.filter((_, i) => i % step === 0); n = a.length; }
    let c = 0, d = 0, ta = 0, tb = 0; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { const s1 = Math.sign(a[i] - a[j]), s2 = Math.sign(b[i] - b[j]); if (!s1 && !s2) continue; if (!s1) ta++; else if (!s2) tb++; else if (s1 === s2) c++; else d++; }
    const tau = (c - d) / Math.sqrt((c + d + ta) * (c + d + tb)), z = 3 * tau * Math.sqrt(n * (n - 1)) / Math.sqrt(2 * (2 * n + 5));
    return { r: isFinite(tau) ? tau : null, n, p: normP(z) };
  }
  function regress(x, y) {
    const [a, b, idx] = pairs(x, y), n = a.length; if (n < 3) return { n };
    const ma = mean(a), mb = mean(b); let sxy = 0, sxx = 0; for (let i = 0; i < n; i++) { sxy += (a[i] - ma) * (b[i] - mb); sxx += (a[i] - ma) ** 2; }
    const slope = sxx ? sxy / sxx : 0, intercept = mb - slope * ma, fitted = a.map(v => intercept + slope * v), resid = b.map((v, i) => v - fitted[i]);
    const sse = sum(resid.map(e => e * e)), sst = sum(b.map(v => (v - mb) ** 2)), se = Math.sqrt(sse / (n - 2) / (sxx || 1)), t = se ? slope / se : 0, tcrit = n > 30 ? 1.96 : [12.71, 4.30, 3.18, 2.78, 2.57, 2.45, 2.36, 2.31, 2.26, 2.23, 2.20, 2.18, 2.16, 2.14, 2.13, 2.12, 2.11, 2.10, 2.09, 2.09, 2.08, 2.07, 2.07, 2.06, 2.06, 2.06, 2.05, 2.05][Math.min(27, n - 3)];
    const residuals = new Array(x.length).fill(null); idx.forEach((k, i) => { residuals[k] = resid[i]; });
    return { n, slope, intercept, r2: sst ? 1 - sse / sst : 0, se, p: tP(t, n - 2), lo: slope - tcrit * se, hi: slope + tcrit * se, residuals, rmse: Math.sqrt(sse / n) };
  }

  // ---------- matrices ----------
  function inverse(A) { const n = A.length, M = A.map((r, i) => [...r, ...Array.from({ length: n }, (_, j) => +(i === j))]);
    for (let c = 0; c < n; c++) { let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r; if (Math.abs(M[p][c]) < 1e-12) return null; [M[c], M[p]] = [M[p], M[c]]; const d = M[c][c]; for (let j = 0; j < 2 * n; j++) M[c][j] /= d; for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c]; for (let j = 0; j < 2 * n; j++) M[r][j] -= f * M[c][j]; } }
    return M.map(r => r.slice(n)); }
  function complete(cols) { // keep cases with a value in every column (listwise)
    const n = cols[0].length, keep = []; for (let i = 0; i < n; i++) if (cols.every(c => ok(c[i]))) keep.push(i);
    return { idx: keep, cols: cols.map(c => keep.map(i => +c[i])) };
  }
  function standardize(cols) { return cols.map(c => { const m = mean(c), s = sd(c) || 1; return c.map(v => (v - m) / s); }); }
  function corrMatrix(cols, method) { const k = cols.length, R = Array.from({ length: k }, () => new Array(k).fill(1)), N = Array.from({ length: k }, () => new Array(k).fill(0));
    for (let i = 0; i < k; i++) for (let j = i + 1; j < k; j++) { const r = (method === "spearman" ? spearman : pearson)(cols[i], cols[j]); R[i][j] = R[j][i] = r.r; N[i][j] = N[j][i] = r.n; } return { R, N }; }
  function partial(cols) { const c = complete(cols), k = cols.length; if (c.idx.length < k + 3) return { n: c.idx.length, R: null };
    const R = corrMatrix(c.cols).R, inv = inverse(R); if (!inv) return { n: c.idx.length, R: null, singular: true };
    const P = R.map((row, i) => row.map((_, j) => i === j ? 1 : -inv[i][j] / Math.sqrt(inv[i][i] * inv[j][j]))); return { n: c.idx.length, R: P, p: P.map(row => row.map(r => rP(r, c.idx.length - k + 2))) }; }
  function multiple(y, X) { // y: values; X: array of predictor columns
    const c = complete([y, ...X]), n = c.idx.length, k = X.length; if (n < k + 3) return { n, error: "Too few areas with every value." };
    const Y = c.cols[0], D = c.idx.map((_, i) => [1, ...c.cols.slice(1).map(col => col[i])]);
    const XtX = Array.from({ length: k + 1 }, (_, a) => Array.from({ length: k + 1 }, (_, b) => sum(D.map(r => r[a] * r[b])))), inv = inverse(XtX);
    if (!inv) return { n, error: "Two or more predictors carry the same information (perfectly correlated)." };
    const XtY = Array.from({ length: k + 1 }, (_, a) => sum(D.map((r, i) => r[a] * Y[i]))), beta = inv.map(row => sum(row.map((v, j) => v * XtY[j])));
    const fit = D.map(r => sum(r.map((v, j) => v * beta[j]))), res = Y.map((v, i) => v - fit[i]), sse = sum(res.map(e => e * e)), my = mean(Y), sst = sum(Y.map(v => (v - my) ** 2));
    const s2 = sse / (n - k - 1), se = inv.map((row, i) => Math.sqrt(Math.max(0, row[i] * s2))), t = beta.map((b, i) => se[i] ? b / se[i] : 0);
    const r2 = sst ? 1 - sse / sst : 0, adj = 1 - (1 - r2) * (n - 1) / (n - k - 1), F = (r2 / k) / ((1 - r2) / (n - k - 1));
    // standardised coefficients: comparable across predictors in different units
    const sy = sd(Y), std = beta.slice(1).map((b, i) => b * sd(c.cols[i + 1]) / (sy || 1));
    const residuals = new Array(y.length).fill(null); c.idx.forEach((k2, i) => { residuals[k2] = res[i]; });
    return { n, k, beta, se, t, p: t.map(v => tP(v, n - k - 1)), r2, adj, F, pF: fP(F, k, n - k - 1), std, residuals, fitted: fit };
  }
  function eigen(A) { // Jacobi rotation for a symmetric matrix
    const n = A.length, a = A.map(r => r.slice()), V = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => +(i === j)));
    for (let sweep = 0; sweep < 100; sweep++) { let off = 0; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) off += a[i][j] ** 2; if (off < 1e-12) break;
      for (let p = 0; p < n; p++) for (let q2 = p + 1; q2 < n; q2++) { if (Math.abs(a[p][q2]) < 1e-14) continue; const th = (a[q2][q2] - a[p][p]) / (2 * a[p][q2]), t = Math.sign(th || 1) / (Math.abs(th) + Math.sqrt(th * th + 1)), c = 1 / Math.sqrt(t * t + 1), s = t * c;
        for (let k = 0; k < n; k++) { const akp = a[k][p], akq = a[k][q2]; a[k][p] = c * akp - s * akq; a[k][q2] = s * akp + c * akq; }
        for (let k = 0; k < n; k++) { const apk = a[p][k], aqk = a[q2][k]; a[p][k] = c * apk - s * aqk; a[q2][k] = s * apk + c * aqk; }
        for (let k = 0; k < n; k++) { const vkp = V[k][p], vkq = V[k][q2]; V[k][p] = c * vkp - s * vkq; V[k][q2] = s * vkp + c * vkq; } } }
    const order = a.map((r, i) => [r[i], i]).sort((x, y) => y[0] - x[0]);
    return { values: order.map(o => o[0]), vectors: order.map(o => V.map(row => row[o[1]])) };
  }
  function pca(cols) {
    const c = complete(cols), k = cols.length; if (c.idx.length < k + 3) return { n: c.idx.length, error: "Too few areas with every value." };
    const Z = standardize(c.cols), R = corrMatrix(Z).R, { values, vectors } = eigen(R), tot = sum(values);
    vectors.forEach(v => { const big = v.reduce((m, x) => Math.abs(x) > Math.abs(m) ? x : m, 0); if (big < 0) v.forEach((x, i) => { v[i] = -x; }); }); // sign: largest loading positive
    const loadings = vectors.map((v, i) => v.map(x => x * Math.sqrt(Math.max(0, values[i]))));
    const scores = c.idx.map((_, r) => vectors.map(v => sum(v.map((w, j) => w * Z[j][r]))));
    const full = new Array(cols[0].length).fill(null); c.idx.forEach((k2, i) => { full[k2] = scores[i]; });
    return { n: c.idx.length, values, explained: values.map(v => v / tot), loadings, scores: full };
  }
  function kmeans(cols, k, seed) {
    const c = complete(cols); const n = c.idx.length; if (n < k * 2) return { n, error: "Too few areas for that many groups." };
    const Z = standardize(c.cols), pts = c.idx.map((_, i) => Z.map(col => col[i])), d2 = (a, b) => sum(a.map((v, i) => (v - b[i]) ** 2));
    let s = seed || 7; const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    const cent = [pts[Math.floor(rnd() * n)]]; while (cent.length < k) { const ds = pts.map(p => Math.min(...cent.map(cc => d2(p, cc)))), tot = sum(ds); let r = rnd() * tot, i = 0; while ((r -= ds[i]) > 0 && i < n - 1) i++; cent.push(pts[i]); }
    let lab = new Array(n).fill(0);
    for (let it = 0; it < 100; it++) { let moved = 0; pts.forEach((p, i) => { let b = 0, bd = Infinity; cent.forEach((cc, j) => { const dd = d2(p, cc); if (dd < bd) { bd = dd; b = j; } }); if (lab[i] !== b) { lab[i] = b; moved++; } });
      for (let j = 0; j < k; j++) { const m = pts.filter((_, i) => lab[i] === j); if (m.length) cent[j] = m[0].map((_, d) => mean(m.map(p => p[d]))); } if (!moved) break; }
    const sil = silhouette(pts, lab, k), full = new Array(cols[0].length).fill(null); c.idx.forEach((k2, i) => { full[k2] = lab[i]; });
    const sizes = Array.from({ length: k }, (_, j) => lab.filter(l => l === j).length);
    return { n, k, labels: full, centres: cent, sizes, silhouette: sil };
  }
  function silhouette(pts, lab, k) { const n = pts.length, step = Math.max(1, Math.floor(n / 300)), d = (a, b) => Math.sqrt(a.reduce((s2, v, i) => s2 + (v - b[i]) ** 2, 0)); let tot = 0, cnt = 0;
    for (let i = 0; i < n; i += step) { const own = [], other = Array.from({ length: k }, () => []); for (let j = 0; j < n; j += step) { if (i === j) continue; (lab[j] === lab[i] ? own : other[lab[j]]).push(d(pts[i], pts[j])); }
      const a = own.length ? mean(own) : 0, b = Math.min(...other.filter((o, j) => j !== lab[i] && o.length).map(mean)); if (isFinite(b)) { tot += (b - a) / Math.max(a, b); cnt++; } } return cnt ? tot / cnt : 0; }
  function bestK(cols, kmin, kmax) { let best = null; for (let k = kmin || 2; k <= (kmax || 6); k++) { const r = kmeans(cols, k); if (r.error) break; if (!best || r.silhouette > best.silhouette + 0.02) best = r; } return best; }
  function mahalanobis(cols) {
    const c = complete(cols), k = cols.length; if (c.idx.length < k + 3) return { n: c.idx.length, error: "Too few areas with every value." };
    const ms = c.cols.map(mean), C = Array.from({ length: k }, (_, a) => Array.from({ length: k }, (_, b) => sum(c.cols[a].map((v, i) => (v - ms[a]) * (c.cols[b][i] - ms[b]))) / (c.idx.length - 1))), inv = inverse(C);
    if (!inv) return { n: c.idx.length, error: "Two or more metrics carry the same information." };
    const D = c.idx.map((_, i) => { const dv = c.cols.map((col, a) => col[i] - ms[a]); return Math.sqrt(Math.max(0, sum(dv.map((x, a) => x * sum(dv.map((y2, b) => inv[a][b] * y2)))))); });
    const full = new Array(cols[0].length).fill(null), p = new Array(cols[0].length).fill(null); c.idx.forEach((k2, i) => { full[k2] = D[i]; p[k2] = chiP(D[i] * D[i], k); });
    return { n: c.idx.length, k, d: full, p };
  }
  function moran(values, nbrs, perms) { // nbrs: neighbour indices per case (each row weighted equally); significance by random permutation
    perms = perms || 199;
    const idx = values.map((v, i) => ok(v) ? i : -1).filter(i => i >= 0), n = idx.length; if (n < 8) return { n };
    const m = mean(idx.map(i => values[i])), z = values.map(v => ok(v) ? v - m : null), ss = sum(idx.map(i => z[i] ** 2)) || 1;
    const nb = values.map((_, i) => (nbrs[i] || []).filter(j => z[j] != null));
    const Iof = zz => { let t = 0; idx.forEach(i => { if (!nb[i].length) return; let l = 0; nb[i].forEach(j => { l += zz[j]; }); t += zz[i] * l / nb[i].length; }); return t / ss; };
    const I = Iof(z);
    let s0 = 11; const rnd = () => { s0 = (s0 * 16807) % 2147483647; return s0 / 2147483647; };
    const pool = idx.map(i => z[i]), zz = z.slice(); let ge = 0;
    for (let p2 = 0; p2 < perms; p2++) { for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; } idx.forEach((k, i) => { zz[k] = pool[i]; }); if (Iof(zz) >= I) ge++; }
    const pGlobal = (ge + 1) / (perms + 1);
    // local: each area against shuffled neighbours (conditional permutation), 99 draws
    const s2 = ss / n, cat = new Array(values.length).fill(null), local = new Array(values.length).fill(null);
    idx.forEach(i => { const k = nb[i].length; if (!k) return; const lag = mean(nb[i].map(j => z[j])), Ii = z[i] / s2 * lag; let more = 0;
      for (let d = 0; d < 99; d++) { let l = 0; for (let t = 0; t < k; t++) { let j; do { j = idx[Math.floor(rnd() * n)]; } while (j === i); l += z[j]; } if (Math.abs(z[i] / s2 * l / k) >= Math.abs(Ii)) more++; }
      const p2 = (more + 1) / 100; local[i] = { I: Ii, lag, p: p2 };
      cat[i] = p2 > 0.05 ? "none" : z[i] > 0 && lag > 0 ? "HH" : z[i] < 0 && lag < 0 ? "LL" : z[i] > 0 ? "HL" : "LH"; });
    return { n, I, expected: -1 / (n - 1), p: pGlobal, local, cat };
  }
  function lagged(a, b, maxLag) { // a, b: aligned arrays (e.g. by year); positive lag = b follows a
    const out = []; for (let L = -maxLag; L <= maxLag; L++) { const x = [], y = []; for (let i = 0; i < a.length; i++) { const j = i + L; if (j < 0 || j >= b.length) continue; x.push(a[i]); y.push(b[j]); } const r = pearson(x, y); out.push({ lag: L, r: r.r, n: r.n, p: r.p }); } return out;
  }
  function strength(r) { if (r == null || !isFinite(r)) return "not enough data"; const a = Math.abs(r); return (a < 0.1 ? "no real" : a < 0.3 ? "a weak" : a < 0.5 ? "a moderate" : a < 0.7 ? "a strong" : "a very strong") + (a < 0.1 ? "" : r > 0 ? " positive" : " negative") + " link"; }
  const pText = p => p == null || !isFinite(p) ? "" : p < 0.001 ? "p < 0.001" : "p = " + p.toFixed(3);
  const sig = p => p != null && p < 0.05;
  window.AtlasStats = { mean, sd, describe, histogram, pearson, spearman, kendall, regress, multiple, corrMatrix, partial, pca, kmeans, bestK, mahalanobis, moran, lagged, standardize, complete, strength, pText, sig, ranks };
})();
