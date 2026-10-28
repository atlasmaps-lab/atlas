/* Atlas Markets (1.8): the Markets perspective as its own app (index.html#app=markets).
 * Market overview, company cards, a screener with a watchlist, valuation calculators (DCF, trading comparables, dividend
 * discount, returns) and head offices by place. Prices and market values appear only when a lawful source is loaded:
 * the public site has none (see pipeline/sources/prices_licence.md). Calculators are illustrative, not investment advice.
 */
(function () {
  "use strict";
  const NOT_ADVICE = `<p class="ap-warn">Illustrative only, not investment advice. Every input is yours unless it says where it came from.</p>`;
  const f2 = v => v == null || !isFinite(v) ? "—" : Math.abs(v) >= 1e9 ? "£" + (v / 1e9).toFixed(2) + " bn" : Math.abs(v) >= 1e6 ? "£" + (v / 1e6).toFixed(1) + " m" : "£" + Math.round(v).toLocaleString("en-GB");
  const pc = v => v == null || !isFinite(v) ? "—" : (v * 100).toFixed(1) + "%";
  const num = (el, k) => { const x = el.querySelector(`[data-k="${k}"]`); return x ? parseFloat(String(x.value).replace(/[,£%\s]/g, "")) : NaN; };
  const field = (k, label, v, hint) => `<label for="mk-${k}">${label}</label><input id="mk-${k}" data-k="${k}" value="${v}" inputmode="decimal" ${hint ? `title="${hint}"` : ""}>`;
  const formula = (title, body) => `<details class="ap-note"><summary>ⓘ ${title}</summary>${body}</details>`;
  const prices = ctx => window.ATLAS_PRICES || (ctx.MK && ctx.MK.index && ctx.MK.index.length ? { local: true } : null);
  const cos = ctx => (ctx.MK ? ctx.MK.companies : []).map((c, i) => Object.assign({ i }, c));
  const empN = c => { const m = String(c.emp || "").replace(/,/g, "").match(/\d+/); return m ? +m[0] : null; };
  const ret12 = c => { const px = c.px || []; if (px.length < 13) return null; return px[px.length - 1][1] / px[px.length - 13][1] - 1; };
  const median = a => { const s = a.filter(v => isFinite(v)).sort((x, y) => x - y); return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : NaN; };
  const quant = (a, q) => { const s = a.filter(v => isFinite(v)).sort((x, y) => x - y); if (!s.length) return NaN; const i = (s.length - 1) * q, lo = Math.floor(i); return s[lo] + (s[Math.ceil(i)] - s[lo]) * (i - lo); };

  function overview(ctx, el) {
    const P = prices(ctx), all = cos(ctx), byG = {};
    all.forEach(c => { byG[c.grp] = byG[c.grp] || []; byG[c.grp].push(c); });
    const groups = Object.entries(byG).sort((a, b) => b[1].length - a[1].length);
    let top = "";
    if (P && P.local) {
      const idx = ctx.MK.index, last = idx[idx.length - 1], yr = idx.length > 12 ? idx[idx.length - 13] : idx[0];
      const rs = all.map(c => [c, ret12(c)]).filter(x => x[1] != null).sort((a, b) => b[1] - a[1]);
      top = `<div class="ap-row"><span class="ap-big">${last[1].toLocaleString("en-GB", { maximumFractionDigits: 0 })}</span><span>FTSE 100, ${ctx.esc(last[0])} · ${pc(last[1] / yr[1] - 1)} over 12 months</span></div>
        <p class="ap-note">Prices as of ${ctx.esc(last[0])}, monthly closes from your own computer's price file (not in the public site).</p>
        <h4>Sectors, 12 months (average of companies)</h4><div class="mk-heat">${groups.map(([g, cs]) => { const v = median(cs.map(ret12).filter(x => x != null)); const col = !isFinite(v) ? "#ddd" : v >= 0 ? `rgba(46,139,87,${Math.min(0.85, 0.2 + v * 2)})` : `rgba(192,57,43,${Math.min(0.85, 0.2 - v * 2)})`; return `<span style="background:${col}" title="${ctx.esc(g)}: ${pc(v)}">${ctx.esc(g)}<b>${pc(v)}</b></span>`; }).join("")}</div>
        <h4>Top risers and fallers (12 months)</h4><div class="mk-two"><ol>${rs.slice(0, 5).map(([c, v]) => `<li>${ctx.esc(c.n)} <b>${pc(v)}</b></li>`).join("")}</ol><ol>${rs.slice(-5).reverse().map(([c, v]) => `<li>${ctx.esc(c.n)} <b>${pc(v)}</b></li>`).join("")}</ol></div>`;
    } else {
      top = `<div class="ap-warn"><b>Prices: not available in the public site.</b> FTSE 100 levels, sector performance and risers and fallers need end-of-day prices. Real-time London Stock Exchange data is licensed, Yahoo Finance's terms don't allow republishing, and the free price services found all forbid public display on their free tiers. The scheduled price update is built and switched off until a provider whose licence allows public display is chosen (pipeline/sources/prices_licence.md).</div>`;
    }
    el.innerHTML = top + `<h4>FTSE 100 head offices in London, by sector</h4><div class="seatbar">${groups.map(([g, cs]) => `<i style="flex:${cs.length};background:${(ctx.MK.groups.find(x => x[0] === g) || [0, "#999"])[1]}" title="${ctx.esc(g)}: ${cs.length}"></i>`).join("")}</div>
      <ul class="mk-leg">${groups.map(([g, cs]) => `<li><i class="sw" style="background:${(ctx.MK.groups.find(x => x[0] === g) || [0, "#999"])[1]}"></i>${ctx.esc(g)} <b>${cs.length}</b></li>`).join("")}</ul>
      <div class="ap-row"><button class="btn sm" data-mkmap>Show head offices on the map</button><button class="btn sm" data-mkopen="companies">Companies and screener</button></div>
      <p class="ap-note">${all.length} of the FTSE 100 have London head offices in the data; ${(ctx.MK.outside || []).length} are headquartered elsewhere. ${ctx.esc(ctx.MK.sources)}</p>`;
    el.onclick = e => { if (e.target.closest("[data-mkmap]")) { ctx.mapOnly(["market_sites", "market_count"]); ctx.view([-0.11, 51.513], 11.3); } const o = e.target.closest("[data-mkopen]"); if (o) ctx.openPanel(o.dataset.mkopen); };
  }

  const W = { sector: "", where: "", size: "", watch: false };
  function companies(ctx, el) {
    const all = cos(ctx), watch = new Set(ctx.store.get("atlas-18-watch", [])), P = prices(ctx);
    const groups = [...new Set(all.map(c => c.grp))].sort(), places = [...new Set(all.map(c => c.zone || c.council).filter(Boolean))].sort((a, b) => ctx.nameOf(a).localeCompare(ctx.nameOf(b)));
    const rows = all.filter(c => (!W.sector || c.grp === W.sector) && (!W.where || c.zone === W.where || c.council === W.where) && (!W.watch || watch.has(c.t))
      && (!W.size || (W.size === "big" ? (empN(c) || 0) >= 10000 : W.size === "mid" ? (empN(c) || 0) >= 1000 && (empN(c) || 0) < 10000 : empN(c) != null && empN(c) < 1000)));
    el.innerHTML = `<div class="ap-row"><select data-w="sector"><option value="">All sectors</option>${groups.map(g => `<option ${W.sector === g ? "selected" : ""}>${ctx.esc(g)}</option>`).join("")}</select>
        <select data-w="where"><option value="">Anywhere in London</option>${places.map(p => `<option value="${p}" ${W.where === p ? "selected" : ""}>${ctx.esc(ctx.nameOf(p))}</option>`).join("")}</select>
        <select data-w="size" title="Size by employees (market value isn't in the public data)"><option value="">Any size</option><option value="big" ${W.size === "big" ? "selected" : ""}>10,000+ staff</option><option value="mid" ${W.size === "mid" ? "selected" : ""}>1,000–9,999</option><option value="small" ${W.size === "small" ? "selected" : ""}>under 1,000</option></select>
        <label class="ck"><input type="checkbox" data-w="watch" ${W.watch ? "checked" : ""}>Watchlist only</label></div>
      ${P ? "" : `<p class="ap-note">Performance and market value filters need prices, which aren't in the public site.</p>`}
      <div class="tscroll"><table class="cmp mk-t"><thead><tr><th>★</th><th>Company</th><th>Sector</th><th>Where</th><th>Staff</th>${P ? "<th>12 months</th>" : ""}</tr></thead><tbody>
      ${rows.map(c => `<tr data-co="${c.i}"><td><button class="mk-star${watch.has(c.t) ? " on" : ""}" data-star="${c.t}" title="${watch.has(c.t) ? "Remove from" : "Add to"} the watchlist">${watch.has(c.t) ? "★" : "☆"}</button></td><td>${ctx.esc(c.n)}</td><td>${ctx.esc(c.grp)}</td><td>${ctx.esc(c.zone ? ctx.nameOf(c.zone) : c.council ? ctx.nameOf(c.council) : "—")}</td><td data-v="${empN(c) || ""}">${ctx.esc(c.emp || "—")}</td>${P ? `<td data-v="${ret12(c) ?? ""}">${pc(ret12(c))}</td>` : ""}</tr>`).join("")}</tbody></table></div>
      <div class="ap-row"><button class="btn sm" data-mkchart ${P ? "" : `disabled title="Comparing companies on one chart needs prices, which aren't in the public site"`}>Chart the watchlist</button><button class="btn sm" data-mkws>Send this list to the workspace</button><span class="ap-note">${rows.length} companies · click a row for its card</span></div>`;
    el.onchange = e => { const k = e.target.dataset.w; if (k) { W[k] = e.target.type === "checkbox" ? e.target.checked : e.target.value; companies(ctx, el); } };
    el.onclick = e => {
      const st = e.target.closest("[data-star]"); if (st) { const t = st.dataset.star; watch.has(t) ? watch.delete(t) : watch.add(t); ctx.store.set("atlas-18-watch", [...watch]); companies(ctx, el); return; }
      if (e.target.closest("[data-mkchart]")) { const ids = all.filter(c => watch.has(c.t)).map(c => c.i); if (ids.length) ctx.openChart({ companies: ids }); else ctx.toast("Star some companies first."); return; }
      if (e.target.closest("[data-mkws]")) { ctx.sendToWS({ type: "note", title: `Companies: ${rows.length}`, html: `<ul>${rows.map(c => `<li>${ctx.esc(c.n)} · ${ctx.esc(c.grp)} · ${ctx.esc(c.zone ? ctx.nameOf(c.zone) : "")}</li>`).join("")}</ul>`, w: 360, h: 320 }); return; }
      const tr = e.target.closest("tr[data-co]"); if (tr) companyCard(ctx, +tr.dataset.co);
    };
  }
  const RATIOS = [["P/E", "Share price ÷ earnings per share (or market value ÷ net profit)."], ["EV/EBITDA", "Enterprise value (market value + net debt) ÷ earnings before interest, tax, depreciation and amortisation."],
    ["Dividend yield", "Dividends per share over the last year ÷ share price."], ["Net debt/EBITDA", "(Borrowings − cash) ÷ EBITDA: how many years of earnings would repay the debt."]];
  function companyCard(ctx, i) {
    const c = ctx.MK.companies[i], P = prices(ctx), pts = (c.px || []).map(p => [+p[0].slice(0, 4) + (+p[0].slice(5, 7) - 1) / 12, p[1]]);
    const w = ctx.WM.make({ type: "company", title: c.n, cascade: true, def: () => ({ x: innerWidth - 420 - 16, y: 90, w: 420, h: Math.min(620, innerHeight - 120) }) });
    const span = { "1M": 1 / 12, "1Y": 1, "5Y": 5, "Since 2000": 99 };
    const draw = k => { const last = pts.length ? pts[pts.length - 1][0] : 0, s = pts.filter(p => p[0] >= last - span[k] - 1e-6); return pts.length ? ctx.CH.line([{ name: c.n, colour: "#a07a12", pts: s }], { w: 380, h: 170, vfmt: v => v.toFixed(0) + "p" }) : ""; };
    w.setBody(`<div class="lvl"><span>${ctx.esc(c.sector)}</span><span>LSE: ${ctx.esc(c.t)}</span></div>
      ${pts.length ? `<div class="ap-row">${Object.keys(span).map(k => `<button class="btn sm" data-span="${k}">${k}</button>`).join("")}</div><div class="mk-chart">${draw("5Y")}</div>` : `<p class="ap-note">Price chart: not available (no lawful price source in the public site).</p>`}
      <table class="itab"><tr><th>Market value</th><td>${c.capGBP ? f2(c.capGBP) : "Not available"}</td></tr><tr><th>Revenue</th><td>${c.rev ? ctx.esc((c.rev.cur === "GBP" ? "£" : c.rev.cur === "USD" ? "US$" : "€") + c.rev.v.toLocaleString("en-GB")) : "Not available"}</td></tr>
      <tr><th>Employees</th><td>${ctx.esc(c.emp || "—")}</td></tr><tr><th>Sector</th><td>${ctx.esc(c.sector)} (${ctx.esc(c.grp)})</td></tr><tr><th>Head office</th><td>${ctx.esc(c.hq || "—")}${c.zone ? `<br><small>${ctx.esc(ctx.nameOf(c.zone))}</small>` : ""}</td></tr>
      ${RATIOS.map(([k, f]) => `<tr><th>${k} <span class="ib-i" title="${ctx.esc(f)}">ⓘ</span></th><td>Not available <small>(needs prices and audited accounts)</small></td></tr>`).join("")}</table>
      ${formula("How the ratios are worked out", `<ul>${RATIOS.map(([k, f]) => `<li><b>${k}:</b> ${ctx.esc(f)}</li>`).join("")}</ul><p>Fundamentals would come from Companies House accounts (free with a key); not loaded this round.</p>`)}
      <div class="ap-row">${c.wiki ? `<a class="btn sm" href="${ctx.esc(c.wiki)}" target="_blank" rel="noopener">Wikipedia ↗</a>` : ""}<button class="btn sm" data-mkfocus>Show the district</button></div>`);
    w.body.onclick = e => { const b = e.target.closest("[data-span]"); if (b) w.body.querySelector(".mk-chart").innerHTML = draw(b.dataset.span); if (e.target.closest("[data-mkfocus]") && (c.zone || c.council)) ctx.focus(c.zone || c.council); };
    ctx.WM.open(w.el);
  }

  // ---------- valuation tools ----------
  function dcf(ctx, el) {
    el.innerHTML = NOT_ADVICE + `<div class="ap-form">${field("fcff", "Free cash flow to the firm, year 1 (£ m)", 500)}${field("g1", "Growth, years 2–5 (%)", 4)}${field("rf", "Risk-free rate (%)", 4.2, "e.g. the 10-year gilt yield")}${field("beta", "Beta", 1.0)}${field("erp", "Equity risk premium (%)", 5)}${field("kd", "Cost of debt, before tax (%)", 6)}${field("tax", "Tax rate (%)", 25)}${field("dv", "Debt ÷ (debt + equity) (%)", 25)}
      <label for="mk-tm">Terminal value</label><select id="mk-tm" data-k="tm"><option value="g">Gordon growth</option><option value="x">Exit multiple (EV/EBITDA)</option></select>${field("gt", "Long-run growth (%)", 2)}${field("ebitda5", "EBITDA in year 5 (£ m), for the exit multiple", 900)}${field("mult", "Exit multiple (EV/EBITDA)", 8)}${field("nd", "Net debt (£ m)", 1500)}${field("sh", "Shares in issue (m)", 1000)}</div>
      <div class="mk-out"></div>${formula("Formulas", `<ul><li>Cost of equity = risk-free + beta × equity risk premium (CAPM).</li><li>WACC = E/(D+E) × cost of equity + D/(D+E) × cost of debt × (1 − tax).</li><li>FCFF in year t = year-1 FCFF × (1 + g)^(t−1), years 1–5.</li><li>Terminal value (Gordon) = FCFF₅ × (1 + g∞) ÷ (WACC − g∞); (exit) = EBITDA₅ × multiple.</li><li>Enterprise value = Σ FCFFₜ ÷ (1 + WACC)ᵗ + TV ÷ (1 + WACC)⁵. Equity = EV − net debt; per share = equity ÷ shares.</li></ul>`)}`;
    const run = () => {
      const g = num(el, "g1") / 100, rf = num(el, "rf") / 100, ke = rf + num(el, "beta") * num(el, "erp") / 100, dv = num(el, "dv") / 100, wacc0 = (1 - dv) * ke + dv * num(el, "kd") / 100 * (1 - num(el, "tax") / 100);
      const tm = el.querySelector("[data-k=tm]").value, value = (wacc, gt) => { let pv = 0, f = num(el, "fcff"); for (let t = 1; t <= 5; t++) { if (t > 1) f *= 1 + g; pv += f / Math.pow(1 + wacc, t); } const tv = tm === "g" ? (wacc > gt ? f * (1 + gt) / (wacc - gt) : NaN) : num(el, "ebitda5") * num(el, "mult"); return { pv, tv, ev: pv + tv / Math.pow(1 + wacc, 5) }; };
      const gt = num(el, "gt") / 100, r = value(wacc0, gt), eq = r.ev - num(el, "nd");
      const ws = [-0.02, -0.01, 0, 0.01, 0.02].map(d => wacc0 + d), gs = [-0.01, -0.005, 0, 0.005, 0.01].map(d => gt + d);
      el.querySelector(".mk-out").innerHTML = `<table class="itab"><tr><th>Cost of equity · WACC</th><td>${pc(ke)} · <b>${pc(wacc0)}</b></td></tr><tr><th>PV of 5 years' FCFF</th><td>${f2(r.pv * 1e6)}</td></tr><tr><th>Terminal value (in year 5)</th><td>${f2(r.tv * 1e6)}</td></tr><tr><th>Enterprise value</th><td><b>${f2(r.ev * 1e6)}</b></td></tr><tr><th>Equity value · per share</th><td>${f2(eq * 1e6)} · <b>${isFinite(eq / num(el, "sh")) ? "£" + (eq / num(el, "sh")).toFixed(2) : "—"}</b></td></tr></table>
        ${tm === "g" ? `<h4>Sensitivity: value per share (£), WACC down, long-run growth across</h4><table class="cmp mk-sens"><thead><tr><th>WACC \\ g</th>${gs.map(x => `<th>${pc(x)}</th>`).join("")}</tr></thead><tbody>${ws.map(w2 => `<tr><th>${pc(w2)}</th>${gs.map(g2 => { const v = (value(w2, g2).ev - num(el, "nd")) / num(el, "sh"); return `<td class="num${w2 === wacc0 && g2 === gt ? " mk-base" : ""}">${isFinite(v) && w2 > g2 ? v.toFixed(2) : "—"}</td>`; }).join("")}</tr>`).join("")}</tbody></table>` : ""}`;
    };
    el.oninput = run; el.onchange = run; run();
  }
  function comps(ctx, el) {
    const peers = [["Peer A", 7.5, 12, 1.4], ["Peer B", 9.0, 15, 1.9], ["Peer C", 6.2, 10, 1.1], ["Peer D", 8.1, 13.5, 1.6]];
    el.innerHTML = NOT_ADVICE + `<h4>Peers (your figures)</h4><table class="cmp mk-peers"><thead><tr><th>Peer</th><th>EV/EBITDA</th><th>P/E</th><th>EV/Sales</th></tr></thead><tbody>${peers.map(p => `<tr>${p.map((v, j) => `<td><input value="${v}" data-p="${j}"></td>`).join("")}</tr>`).join("")}</tbody></table><button class="btn sm" data-addpeer>+ peer</button>
      <h4>The company</h4><div class="ap-form">${field("ebitda", "EBITDA (£ m)", 400)}${field("earn", "Net profit (£ m)", 180)}${field("sales", "Sales (£ m)", 2500)}${field("nd", "Net debt (£ m)", 600)}${field("sh", "Shares in issue (m)", 300)}</div><div class="mk-out"></div>
      ${formula("Formulas", `<ul><li>For each multiple: the peers' median, with the 25th–75th percentile as the range.</li><li>From EV multiples: EV = multiple × the company's EBITDA (or sales); equity = EV − net debt.</li><li>From P/E: equity = P/E × net profit.</li><li>Per share = equity ÷ shares. The football field shows each method's range.</li></ul>`)}`;
    const run = () => {
      const rows = [...el.querySelectorAll(".mk-peers tbody tr")].map(tr => [...tr.querySelectorAll("input")].map((x, j) => j ? parseFloat(x.value) : x.value));
      const col = j => rows.map(r => r[j]).filter(isFinite), sh = num(el, "sh"), nd = num(el, "nd");
      const meth = [["EV/EBITDA", col(1), m => (m * num(el, "ebitda") - nd) / sh], ["P/E", col(2), m => m * num(el, "earn") / sh], ["EV/Sales", col(3), m => (m * num(el, "sales") - nd) / sh]]
        .map(([k, xs, fn]) => ({ k, med: fn(median(xs)), lo: fn(quant(xs, .25)), hi: fn(quant(xs, .75)), mm: median(xs) }));
      const vals = meth.flatMap(m => [m.lo, m.hi]).filter(isFinite), lo = Math.min(...vals, 0), hi = Math.max(...vals), Wd = 380, L = 80, sx = v => L + (v - lo) / ((hi - lo) || 1) * (Wd - L - 20);
      el.querySelector(".mk-out").innerHTML = `<table class="itab">${meth.map(m => `<tr><th>${m.k} (median ${isFinite(m.mm) ? m.mm.toFixed(1) + "×" : "—"})</th><td>£${isFinite(m.lo) ? m.lo.toFixed(2) : "—"} – £${isFinite(m.hi) ? m.hi.toFixed(2) : "—"} a share · median <b>£${isFinite(m.med) ? m.med.toFixed(2) : "—"}</b></td></tr>`).join("")}</table>
        <svg viewBox="0 0 ${Wd} ${meth.length * 30 + 26}" class="mk-ff" role="img" aria-label="Football field chart">${meth.map((m, i) => isFinite(m.lo) ? `<text x="${L - 6}" y="${i * 30 + 20}" text-anchor="end">${m.k}</text><rect x="${sx(m.lo)}" y="${i * 30 + 8}" width="${Math.max(2, sx(m.hi) - sx(m.lo))}" height="16" fill="#a07a12" opacity=".75"><title>£${m.lo.toFixed(2)} – £${m.hi.toFixed(2)}</title></rect><line x1="${sx(m.med)}" x2="${sx(m.med)}" y1="${i * 30 + 5}" y2="${i * 30 + 27}" stroke="#1f2a2e" stroke-width="2"/>` : "").join("")}
        <text x="${L}" y="${meth.length * 30 + 20}">£${lo.toFixed(0)}</text><text x="${Wd - 20}" y="${meth.length * 30 + 20}" text-anchor="end">£${hi.toFixed(0)} a share</text></svg>`;
    };
    el.oninput = run; el.onclick = e => { if (e.target.closest("[data-addpeer]")) { el.querySelector(".mk-peers tbody").insertAdjacentHTML("beforeend", `<tr><td><input value="Peer"></td><td><input value="" data-p="1"></td><td><input value="" data-p="2"></td><td><input value="" data-p="3"></td></tr>`); run(); } }; run();
  }
  function ddm(ctx, el) {
    el.innerHTML = NOT_ADVICE + `<div class="ap-form">${field("d1", "Next year's dividend per share (£)", 0.5)}${field("r", "Required return (%)", 8)}${field("g", "Dividend growth, for ever (%)", 3)}${field("g1", "Optional: faster growth for the first years (%)", 6)}${field("n", "…for how many years", 5)}</div><div class="mk-out"></div>
      ${formula("Formulas", `<ul><li>Gordon growth: value = D₁ ÷ (r − g), when r is above g.</li><li>Two-stage: Σ D₁(1+g₁)^(t−1) ÷ (1+r)ᵗ for the first n years, plus the Gordon value at year n discounted back: Dₙ₊₁ ÷ (r − g) ÷ (1+r)ⁿ.</li></ul>`)}`;
    const run = () => { const d1 = num(el, "d1"), r = num(el, "r") / 100, g = num(el, "g") / 100, g1 = num(el, "g1") / 100, n = Math.max(0, Math.round(num(el, "n")));
      const gordon = r > g ? d1 / (r - g) : NaN; let pv = 0, d = d1; for (let t = 1; t <= n; t++) { pv += d / Math.pow(1 + r, t); d *= 1 + g1; } const two = r > g ? pv + d / (r - g) / Math.pow(1 + r, n) : NaN;
      el.querySelector(".mk-out").innerHTML = `<table class="itab"><tr><th>Gordon growth</th><td><b>${isFinite(gordon) ? "£" + gordon.toFixed(2) : "— (needs r above g)"}</b></td></tr><tr><th>Two-stage (${n} years at ${pc(g1)})</th><td><b>${isFinite(two) ? "£" + two.toFixed(2) : "—"}</b></td></tr></table>`; };
    el.oninput = run; run();
  }
  function returns(ctx, el) {
    const P = prices(ctx), all = cos(ctx).filter(c => (c.px || []).length > 12);
    el.innerHTML = NOT_ADVICE + `<p class="ap-note">Paste monthly prices (date, price per line) or pick a company${P ? "" : " (no prices are in the public site, so only pasting works there)"}. The benchmark is the FTSE 100 where its prices are loaded, or your own pasted series.</p>
      ${all.length ? `<select data-k="co"><option value="">Pick a company…</option>${all.map(c => `<option value="${c.i}">${ctx.esc(c.n)}</option>`).join("")}</select>` : ""}
      <div class="mk-two"><label>Prices<textarea data-k="px" rows="6" placeholder="2023-01-31, 100&#10;2023-02-28, 104&#10;…"></textarea></label><label>Benchmark (optional)<textarea data-k="bx" rows="6" placeholder="same dates, index level"></textarea></label></div>
      <label class="ck">Dividends received over the period (£ per share) <input data-k="div" value="0" style="width:70px"></label><div class="mk-out"></div>
      ${formula("Formulas", `<ul><li>Total return = (last price + dividends) ÷ first price − 1.</li><li>CAGR = (1 + total return)^(1 ÷ years) − 1.</li><li>Volatility = standard deviation of monthly returns × √12.</li><li>Maximum drawdown = the largest fall from a peak to a later trough.</li><li>Beta = covariance of monthly returns with the benchmark's ÷ the benchmark's variance.</li></ul>`)}`;
    const parse = t => String(t || "").split(/\n/).map(l => l.split(/[,\t;]/)).filter(a => a.length >= 2 && isFinite(parseFloat(a[1]))).map(a => [a[0].trim(), parseFloat(a[1])]);
    const run = () => {
      let px = parse(el.querySelector("[data-k=px]").value), bx = parse(el.querySelector("[data-k=bx]").value);
      const co = el.querySelector("[data-k=co]"); if (co && co.value !== "" && !px.length) { px = ctx.MK.companies[+co.value].px.map(p => [p[0], p[1]]); if (!bx.length && ctx.MK.index.length) bx = ctx.MK.index.map(p => [p[0], p[1]]); }
      const out = el.querySelector(".mk-out"); if (px.length < 3) { out.innerHTML = `<p class="ap-note">Needs at least three prices.</p>`; return; }
      const rets = px.slice(1).map((p, i) => p[1] / px[i][1] - 1), years = Math.max(1 / 12, (Date.parse(px[px.length - 1][0]) - Date.parse(px[0][0])) / 3.15576e10 || (px.length - 1) / 12);
      const tr = (px[px.length - 1][1] + (num(el, "div") || 0)) / px[0][1] - 1, cagr = Math.pow(1 + tr, 1 / years) - 1, mean = rets.reduce((a, b) => a + b, 0) / rets.length;
      const vol = Math.sqrt(rets.reduce((a, r) => a + (r - mean) ** 2, 0) / Math.max(1, rets.length - 1)) * Math.sqrt(12);
      let peak = px[0][1], mdd = 0; px.forEach(p => { peak = Math.max(peak, p[1]); mdd = Math.min(mdd, p[1] / peak - 1); });
      let beta = null; if (bx.length >= 3) { const bm = new Map(bx.map(p => [p[0].slice(0, 7), p[1]])), pairs = []; for (let i = 1; i < px.length; i++) { const a = bm.get(px[i][0].slice(0, 7)), b = bm.get(px[i - 1][0].slice(0, 7)); if (a && b) pairs.push([rets[i - 1], a / b - 1]); }
        if (pairs.length >= 3) { const mx = pairs.reduce((s, p) => s + p[1], 0) / pairs.length, my = pairs.reduce((s, p) => s + p[0], 0) / pairs.length; const cov = pairs.reduce((s, p) => s + (p[0] - my) * (p[1] - mx), 0), vr = pairs.reduce((s, p) => s + (p[1] - mx) ** 2, 0); beta = vr ? cov / vr : null; } }
      out.innerHTML = `<table class="itab"><tr><th>Total return</th><td><b>${pc(tr)}</b> over ${years.toFixed(1)} years</td></tr><tr><th>CAGR</th><td>${pc(cagr)} a year</td></tr><tr><th>Volatility (annualised)</th><td>${pc(vol)}</td></tr><tr><th>Maximum drawdown</th><td>${pc(mdd)}</td></tr><tr><th>Beta</th><td>${beta == null ? "— (add a benchmark)" : beta.toFixed(2)}</td></tr></table>`;
    };
    el.oninput = run; el.onchange = run; run();
  }
  function places(ctx, el) {
    const all = cos(ctx), by = (k) => { const o = {}; all.forEach(c => { const v = c[k]; if (v) (o[v] = o[v] || []).push(c); }); return Object.entries(o).sort((a, b) => b[1].length - a[1].length); };
    const tab = (rows, head) => `<table class="cmp"><thead><tr><th>${head}</th><th>Head offices</th><th>Market value</th></tr></thead><tbody>${rows.map(([k, cs]) => `<tr data-code="${k}"><th>${ctx.esc(ctx.nameOf(k))}</th><td class="num">${cs.length}</td><td class="num">${cs.some(c => c.capGBP) ? f2(cs.reduce((a, c) => a + (c.capGBP || 0), 0)) : "Not available"}</td></tr>`).join("")}</tbody></table>`;
    el.innerHTML = `<h4>By financial district</h4>${tab(by("zone"), "District")}<h4>By council</h4>${tab(by("council"), "Council")}<p class="ap-note">Hover a row to find it on the map; double-click to focus it. Regional listed-company exposure (where companies' staff and sites are) is for later.</p>`;
  }

  window.AtlasApps && AtlasApps.register({
    id: "markets", name: "Atlas Markets", perspective: "markets", accent: "#a07a12", dataNeeds: ["ATLAS_MARKETS"],
    init(ctx) { ctx.mapOnly(["market_sites", "market_count"]); ctx.setLevel("council"); ctx.view([-0.11, 51.513], 10.6); ctx.openPanel("overview"); },
    panels: [
      { id: "overview", title: "Market overview", render: overview, def: () => ({ x: innerWidth - 440 - 16, y: 56, w: 440, h: Math.round(innerHeight * 0.68) }) },
      { id: "companies", title: "Companies & screener", render: companies, min: { w: 420, h: 280 } },
      { id: "places", title: "Places & markets", render: places },
    ],
    tools: [
      { id: "dcf", title: "DCF", blurb: "Discounted cash flow: FCFF, WACC, terminal value, sensitivity table", render: dcf, min: { w: 400, h: 300 } },
      { id: "comps", title: "Comparables", blurb: "Trading comparables: peer multiples to a value range (football field)", render: comps, min: { w: 400, h: 300 } },
      { id: "ddm", title: "Dividend discount", blurb: "Gordon growth and two-stage dividend discount model", render: ddm },
      { id: "returns", title: "Returns", blurb: "CAGR, total return, volatility, max drawdown, beta", render: returns, min: { w: 400, h: 300 } },
    ],
  });
})();
