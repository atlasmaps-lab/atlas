/* Atlas 0.9 · trade (core module, used by Atlas Markets and anywhere a place or country is shown).
 *   Trade        exports, imports and balance; the trend since 2016; top products and partners; biggest movers;
 *                products the UK imports mostly from one country
 *   Products     chapter → heading → subheading (HS6) → CN8, each with partners both ways, UK ports, the trend, unit value,
 *                the tariff (UK Global Tariff and the partner's preferential rate, live from the Trade Tariff API) and the
 *                businesses near you that trade it
 *   Partners     a country card: goods both ways by product and over time (services, FDI and income join in 0.9 phase 3)
 *   Ports        UK gateways by value and mode, with their partners
 *   Traders      HMRC's published lists of exporters and importers, by council
 * Data: data/trade.js (always), data/trade_detail.js and data/trade_firms.js (on demand). HMRC, OGL v3.0.
 */
(function () {
  "use strict";
  let ctx = null;
  const T = () => window.ATLAS_TRADE;
  const esc = t => String(t == null ? "" : t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const gbp = v => { if (v == null || !isFinite(v)) return "—"; const a = Math.abs(v); return (v < 0 ? "−" : "") + "£" + (a >= 1e9 ? (a / 1e9).toLocaleString("en-GB", { maximumFractionDigits: a >= 1e10 ? 0 : 1 }) + "bn" : a >= 1e6 ? (a / 1e6).toFixed(a >= 1e7 ? 0 : 1) + "m" : a >= 1e4 ? Math.round(a / 1e3) + "k" : Math.round(a).toLocaleString("en-GB")); };
  const pct = (a, b) => b ? (100 * a / b).toFixed(1) + "%" : "—";
  const chg = (a, b) => b ? ((a / b - 1) * 100 >= 0 ? "+" : "") + ((a / b - 1) * 100).toFixed(0) + "%" : "new";
  const FL = { exp: "Exports", imp: "Imports" }, FLC = { exp: "#1e6fb8", imp: "#c0392b" };
  const ym = k => 2000 + +k.slice(0, 2) + (+k.slice(2) - 1) / 12;
  const cty = c => (T().cty[c] || {}).n || c, port = p => (T().ports[p] || {}).n || p;
  const level = code => code.length === 2 ? "Chapter" : code.length === 4 ? "Heading" : code.length === 6 ? "Subheading (HS6)" : "Product (CN8)";
  let D = null;   // detail
  const detail = () => D ? Promise.resolve(D) : ctx.trade.detail().then(d => (D = d));
  const node = code => code.length === 2 ? T().ch[code] : D ? (D[code.length === 4 ? "h4" : code.length === 6 ? "h6" : "c8"] || {})[code] : null;
  const kids = code => !D ? [] : code.length === 2 ? Object.keys(D.h4).filter(k => k.startsWith(code)) : code.length === 4 ? Object.keys(D.h6).filter(k => k.startsWith(code)) : code.length === 6 ? Object.keys(D.c8).filter(k => k.startsWith(code)) : [];

  // ---------- small pieces ----------
  const bars = (rows, f, fmtName, click) => { rows = rows || []; const mx = rows.length ? rows[0][1] : 1;
    return `<table class="tr-t">${rows.map(([k, v, extra]) => `<tr ${click ? `data-${click}="${esc(k)}"` : ""}><td class="tr-n">${fmtName(k)}</td><td class="tr-b"><i style="width:${(100 * v / mx).toFixed(1)}%;background:${FLC[f]}"></i></td><td class="num">${gbp(v)}</td>${extra != null ? `<td class="num tr-x">${extra}</td>` : ""}</tr>`).join("")}</table>`; };
  const trend = (series, w, h) => ctx.CH.line(series, { w: w || 420, h: h || 160, vfmt: gbp, xfmt: x => String(Math.floor(x)) });
  function win(key, title, html, after, size) {
    const have = win.open.get(key); if (have && ctx.WM.isOpen(have.el)) { ctx.WM.front(have.el); have.setBody(html); after && after(have); return have; }
    const w = ctx.WM.make({ type: "trade", title, html, cascade: true, min: { w: 360, h: 280 }, def: () => Object.assign({ x: innerWidth - 500 - 76, y: 70, w: 500, h: Math.min(680, innerHeight - 110) }, size || {}), onClose: () => win.open.delete(key) });
    w.el.classList.add("tr-win"); win.open.set(key, w); ctx.WM.open(w.el); after && after(w); return w;
  }
  win.open = new Map();

  // ---------- Trade (overview) ----------
  const OV = { f: "both" };   // 0.12: exports and imports together by default
  const vOf = (o, f) => !o ? 0 : f === "both" ? (o.exp || 0) + (o.imp || 0) : (o[f] || 0);
  // both directions side by side: name, exports, imports, balance (a table with headings, so it sorts)
  const bars2 = (rows, nameOf, click) => { const mx = Math.max(1, ...rows.map(r => Math.max(r.exp || 0, r.imp || 0)));
    return `<table class="tr-t tr-2"><thead><tr><th></th><th class="num">${FL.exp}</th><th class="num">${FL.imp}</th><th class="num">Balance</th></tr></thead><tbody>${rows.map(r => `<tr ${click ? `data-${click}="${esc(r.k)}"` : ""}><td class="tr-n">${nameOf(r.k)}<span class="tr-b2"><i style="width:${(100 * (r.exp || 0) / mx).toFixed(1)}%;background:${FLC.exp}"></i><i style="width:${(100 * (r.imp || 0) / mx).toFixed(1)}%;background:${FLC.imp}"></i></span></td><td class="num" data-v="${r.exp || 0}">${gbp(r.exp || 0)}</td><td class="num" data-v="${r.imp || 0}">${gbp(r.imp || 0)}</td><td class="num ${(r.exp || 0) - (r.imp || 0) < 0 ? "neg" : "pos"}" data-v="${(r.exp || 0) - (r.imp || 0)}">${gbp((r.exp || 0) - (r.imp || 0))}</td></tr>`).join("")}</tbody></table>`; };
  function overview(cx, el) {
    const t = T(); if (!t) { el.innerHTML = `<p class="ap-note">Trade data isn't loaded.</p>`; return; }
    const f = OV.f, o = f === "exp" ? "imp" : "exp", bal = t.tot.exp - t.tot.imp, both = f === "both";
    const mser = ["exp", "imp"].map(k => ({ name: FL[k], colour: FLC[k], pts: t.months[k].map(([m, v]) => [ym(m), v]) }));
    const chs = Object.entries(t.ch).map(([k, c]) => [k, c[f]]).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const cts = Object.entries(t.cty).map(([k, c]) => [k, c[f], gbp(c[f] - c[o]).replace(/^(?!−)/, f === "exp" ? "+" : "")]).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const mv = both ? [...(t.movers.exp || []).slice(0, 5).map(x => [...x, "exp"]), ...(t.movers.imp || []).slice(0, 5).map(x => [...x, "imp"])] : (t.movers[f] || []).slice(0, 8).map(x => [...x, f]);
    const chs2 = Object.entries(t.ch).map(([k, c]) => ({ k, exp: c.exp, imp: c.imp })).sort((a, b) => (b.exp + b.imp) - (a.exp + a.imp)).slice(0, 10);
    const cts2 = Object.entries(t.cty).map(([k, c]) => ({ k, exp: c.exp, imp: c.imp })).sort((a, b) => (b.exp + b.imp) - (a.exp + a.imp)).slice(0, 10);
    const yr = k => { const y = {}; t.months[k].forEach(([m, v]) => { const Y = 2000 + +m.slice(0, 2); y[Y] = (y[Y] || 0) + v; }); return y; }, ye = yr("exp"), y0 = Object.keys(ye).sort()[0], full = Object.keys(ye).filter(y => t.months.exp.filter(([m]) => 2000 + +m.slice(0, 2) === +y).length === 12).sort();
    const fy = full[full.length - 1], tc = Object.entries(t.cty).sort((a, b) => b[1].exp - a[1].exp)[0], ti = Object.entries(t.cty).sort((a, b) => b[1].imp - a[1].imp)[0], tch = Object.entries(t.ch).sort((a, b) => b[1].exp - a[1].exp)[0];
    const story = `The UK ${bal < 0 ? "buys" : "sells"} <b>${gbp(Math.abs(bal))}</b> more goods ${bal < 0 ? "than it sells" : "than it buys"} a year. In the 12 months to ${esc(mname(t.period[1]))} it exported ${gbp(t.tot.exp)} of goods and imported ${gbp(t.tot.imp)}.
      ${fy && ye[y0] ? `Exports in ${fy} were ${gbp(ye[fy])}, ${window.AtlasNarrative ? AtlasNarrative.change(ye[y0], ye[fy]) : ""} on ${y0} in cash terms (before inflation).` : ""}
      The biggest buyer was ${esc(tc[1].n)} (${gbp(tc[1].exp)}), the biggest seller ${esc(ti[1].n)} (${gbp(ti[1].imp)}); the largest export group was ${esc(tch[1].n.split(";")[0].toLowerCase())} (${gbp(tch[1].exp)}).`;
    el.innerHTML = `<div class="nv"><p class="nv-story">${story}</p><p class="nv-means"><b>What it tells us.</b> What the UK sells to and buys from the rest of the world in physical goods, product by product and country by country.</p>
        <p class="nv-trust">HMRC's customs and survey records, revised for months. Goods only: the UK earns most abroad from services, so a goods deficit isn't the whole picture (Partners shows services too). Precious metals moving through London swing the totals; imports are by country of origin.</p></div>
      <div class="tr-head"><div><span class="tr-k">Exports</span><b>${gbp(t.tot.exp)}</b></div><div><span class="tr-k">Imports</span><b>${gbp(t.tot.imp)}</b></div><div><span class="tr-k">Balance</span><b class="${bal < 0 ? "neg" : "pos"}">${gbp(bal)}</b></div></div>
      <p class="ap-note">Monthly since 2016:</p><div class="tr-chart">${trend(mser, 440, 150)}</div>
      <div class="seg sm" role="group">${["both", "exp", "imp"].map(k => `<button data-trf="${k}" class="${k === f ? "on" : ""}">${k === "both" ? "Both" : FL[k]}</button>`).join("")}</div>
      <h4>Top products (chapters)</h4>${both ? bars2(chs2, k => `${esc(k)} ${esc(short(t.ch[k].n))}`, "trprod") : bars(chs, f, k => `${esc(k)} ${esc(short(t.ch[k].n))}`, "trprod")}
      <h4>Top partners <small>(${both ? "exports, imports and the UK's balance" : "value, and the UK's balance with them"})</small></h4>${both ? bars2(cts2, k => esc(cty(k)), "trcty") : bars(cts, f, k => esc(cty(k)), "trcty")}
      <h4>Biggest changes on the year before</h4><table class="tr-t">${mv.map(([h, n, v, pv, fl]) => `<tr data-trprod="${h}"><td class="tr-n">${esc(h)} ${esc(short(n))}${both ? ` <small class="tr-fl ${fl}">${FL[fl]}</small>` : ""}</td><td class="num">${gbp(pv)} → ${gbp(v)}</td><td class="num tr-x ${v >= pv ? "pos" : "neg"}">${chg(v, pv)}</td></tr>`).join("")}</table>
      <h4>Dependence: imports mostly from one country</h4><p class="ap-note">Products (HS6) worth over £50m a year where one country supplies more than half of UK imports.</p>
      <table class="tr-t">${(t.dep || []).slice(0, 12).map(([h, n, c, sh, v]) => `<tr data-trprod="${h}"><td class="tr-n">${esc(short(n, 46))}</td><td>${esc(cty(c))}</td><td class="num">${(sh * 100).toFixed(0)}%</td><td class="num tr-x">${gbp(v)}</td></tr>`).join("")}</table>
      <div class="ap-row"><button class="btn sm" data-trmap="both">Show both routes</button><button class="btn sm" data-trmap="exp">Export routes</button><button class="btn sm" data-trmap="imp">Import routes</button><button class="btn sm" data-trmetric>Map exports by area</button></div>
      <p class="ap-note">${esc(t.sources)}</p>`;
    el.onclick = e => {
      const b = e.target.closest("[data-trf]"); if (b) { OV.f = b.dataset.trf; overview(cx, el); return; }
      if (common(e)) return;
      if (e.target.closest("[data-trmetric]")) { ctx.setLevel("auto"); ctx.mapOnly(["trade_exp"]); }
    };
  }
  function common(e) { // links shared by every panel and card
    const p = e.target.closest("[data-trprod]"); if (p) { openProduct(p.dataset.trprod); return true; }
    const c = e.target.closest("[data-trcty]"); if (c) { openPartner(c.dataset.trcty); return true; }
    const m = e.target.closest("[data-trmap]"); if (m) { showRoutes(m.dataset.trmap, m.dataset.code || null); return true; }
    const po = e.target.closest("[data-trport]"); if (po) { openPort(po.dataset.trport); return true; }
    return false;
  }
  function showRoutes(f, code) {   // 0.12: "both" shows export and import routes together (imports dashed)
    ctx.trade.setProduct(code || null, f === "both" ? "exp" : f);
    const on = ctx.mapped ? ctx.mapped() : []; ctx.mapOnly([...new Set(on.filter(id => !/^trade_routes_/.test(id)).concat(f === "both" ? ["trade_routes_exp", "trade_routes_imp"] : ["trade_routes_" + f]))]);
    ctx.view([10, 35], 1.6);
  }
  const mname = k => new Date(2000 + +k.slice(0, 2), +k.slice(2) - 1, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  const short = (n, l) => { n = String(n || ""); l = l || 60; return n.length > l ? n.slice(0, l - 1) + "…" : n; };

  // ---------- Products ----------
  const PR = { f: "both", q: "", open: new Set() };
  function products(cx, el) {
    const t = T(); if (!t) { el.innerHTML = ""; return; }
    const f = PR.f;
    const row = (code, depth) => { const n = node(code); if (!n) return ""; const has = code.length < 8, op = PR.open.has(code);
      return `<li style="--d:${depth}"><div class="tr-row"><button class="tr-tog" ${has ? `data-trtog="${code}"` : "disabled"} aria-label="${op ? "Close" : "Open"}">${has ? (op ? "▾" : "▸") : "·"}</button><button class="linkish tr-pn" data-trprod="${code}"><b>${esc(code)}</b> ${esc(short(n.n, 70))}</button>${f === "both" ? `<span class="num tr-ei" data-v="${(n.exp || 0) + (n.imp || 0)}"><i class="e">${gbp(n.exp || 0)}</i><i class="i">${gbp(n.imp || 0)}</i></span>` : `<span class="num">${gbp(n[f])}</span>`}</div>
        ${op ? `<ul>${(D ? kids(code) : []).map(k => [k, vOf(node(k), f)]).filter(x => x[1] > 0).sort((a, b) => b[1] - a[1]).slice(0, 60).map(([k]) => row(k, depth + 1)).join("") || (D ? "" : `<li class="ap-note">Loading…</li>`)}</ul>` : ""}</li>`; };
    let list;
    if (PR.q && D) {
      const q = PR.q.toLowerCase(), hits = [];
      [["h4", D.h4], ["h6", D.h6], ["c8", D.c8]].forEach(([, M]) => { for (const k in M) if (k.startsWith(q) || M[k].n.toLowerCase().includes(q)) hits.push([k, vOf(M[k], f)]); });
      Object.entries(t.ch).forEach(([k, c]) => { if (k.startsWith(q) || c.n.toLowerCase().includes(q)) hits.push([k, vOf(c, f)]); });
      list = hits.sort((a, b) => b[1] - a[1]).slice(0, 80).map(([k, v]) => `<li><div class="tr-row"><span class="tr-lv">${level(k).split(" ")[0]}</span><button class="linkish tr-pn" data-trprod="${k}"><b>${esc(k)}</b> ${esc(short(node(k).n, 70))}</button><span class="num">${gbp(v)}</span></div></li>`).join("") || `<li class="ap-note">Nothing matches “${esc(PR.q)}”.</li>`;
    } else list = Object.entries(t.ch).sort((a, b) => vOf(b[1], f) - vOf(a[1], f)).map(([k]) => row(k, 0)).join("");
    el.innerHTML = `<div class="ap-row"><input class="tr-q" data-trq placeholder="Search products: a name or a code (e.g. whisky, 8703, salmon)" value="${esc(PR.q)}"><div class="seg sm">${["both", "exp", "imp"].map(k => `<button data-trpf="${k}" class="${k === f ? "on" : ""}">${k === "both" ? "Both" : FL[k]}</button>`).join("")}</div></div>
      <p class="ap-note">97 chapters → about 1,200 headings → 5,000 subheadings → 9,000 product codes (CN8). Open a row with ▸; click a name for its card. 12 months to ${esc(mname(t.period[1]))}.</p><ul class="tr-tree">${list}</ul>`;
    const q = el.querySelector("[data-trq]");
    q.oninput = () => { PR.q = q.value.trim(); clearTimeout(products.t); products.t = setTimeout(() => detail().then(() => { products(cx, el); const n = el.querySelector("[data-trq]"); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }), 220); };
    el.onclick = e => {
      const tg = e.target.closest("[data-trtog]"); if (tg) { const c = tg.dataset.trtog; PR.open.has(c) ? PR.open.delete(c) : PR.open.add(c); products(cx, el); if (!D) detail().then(() => products(cx, el)); return; }
      const pf = e.target.closest("[data-trpf]"); if (pf) { PR.f = pf.dataset.trpf; products(cx, el); return; }
      common(e);
    };
  }

  // ---------- product card ----------
  function openProduct(code) {
    const go = () => {
      const n = node(code); if (!n) return `<p class="ap-note">No trade recorded for ${esc(code)} in the 12 months.</p>`;
      const t = T(), parentCodes = [code.slice(0, 2), code.slice(0, 4), code.slice(0, 6)].filter(c => c.length < code.length && node(c));
      const sub = kids(code).map(k => [k, node(k)]).filter(x => x[1]).sort((a, b) => (b[1].exp + b[1].imp) - (a[1].exp + a[1].imp)).slice(0, 25);
      const m = n.m ? ["exp", "imp"].map(k => ({ name: FL[k], colour: FLC[k], pts: n.m[k].map((v, i) => [ym(monthAt(t, i)), v]) })) : null;
      const y = code.length === 2 ? ["exp", "imp"].map(k => ({ name: FL[k], colour: FLC[k], pts: Object.entries(n.y[k]).map(([yy, v]) => [+yy, v]) })) : null;
      const kg = n.kg ? ["exp", "imp"].map(k => n.kg[k] ? `${FL[k]}: ${gbp(n[k] / n.kg[k]).replace("£", "£")} a kg (${Math.round(n.kg[k] / 1000).toLocaleString("en-GB")} tonnes)` : "").filter(Boolean).join(" · ") : "";
      return `<div class="lvl"><span>${esc(level(code))}</span><span>${esc(code)}</span></div>${parentCodes.length ? `<div class="tr-crumb">${parentCodes.map(c => `<button class="linkish" data-trprod="${c}">${esc(c)} ${esc(short(node(c).n, 32))}</button>`).join(" › ")}</div>` : ""}
        <h3 class="tr-title">${esc(n.n)}</h3>
        <div class="tr-head"><div><span class="tr-k">Exports</span><b>${gbp(n.exp)}</b></div><div><span class="tr-k">Imports</span><b>${gbp(n.imp)}</b></div><div><span class="tr-k">Balance</span><b class="${n.exp - n.imp < 0 ? "neg" : "pos"}">${gbp(n.exp - n.imp)}</b></div></div>
        ${n.pv ? `<p class="ap-note">The year before: exports ${gbp(n.pv.exp)} (${chg(n.exp, n.pv.exp)}), imports ${gbp(n.pv.imp)} (${chg(n.imp, n.pv.imp)}).</p>` : ""}${kg ? `<p class="ap-note">Unit value · ${esc(kg)}</p>` : ""}
        ${m ? `<div class="tr-chart">${trend(m, 440, 140)}</div>` : y ? `<div class="tr-chart">${trend(y, 440, 140)}</div>` : ""}
        <div class="tr-two"><div><h4>Buyers (exports)</h4>${bars((n.ct.exp || []).map(([c, v]) => [c, v, pct(v, n.exp)]), "exp", k => esc(cty(k)), "trcty")}</div><div><h4>Sellers (imports)</h4>${bars((n.ct.imp || []).map(([c, v]) => [c, v, pct(v, n.imp)]), "imp", k => esc(cty(k)), "trcty")}</div></div>
        <h4>Through UK ports</h4><p class="ap-note">${["exp", "imp"].map(k => `${FL[k]}: ${(n.po[k] || []).map(([p, v]) => `<button class="linkish" data-trport="${p}">${esc(port(p))}</button> ${gbp(v)}`).join(", ") || "—"}`).join("<br>")}</p>
        <div class="ap-row"><button class="btn sm" data-trmap="exp" data-code="${code}">Map where it goes</button><button class="btn sm" data-trmap="imp" data-code="${code}">Map where it comes from</button><button class="btn sm" data-trfirms="${code.slice(0, 2)}">Businesses trading it</button></div>
        <h4>Tariff on imports</h4><div class="tr-tariff" data-tariff="${code}"><label>Coming from <select data-trtc><option value="">any country (UK Global Tariff)</option>${(n.ct.imp || []).concat(Object.entries(t.cty).map(([c, o]) => [c, o.imp]).sort((a, b) => b[1] - a[1]).slice(0, 40)).map(x => x[0]).filter((c, i, a) => a.indexOf(c) === i && t.cty[c] && t.cty[c].ll && c !== "GB").map(c => `<option value="${c}">${esc(cty(c))}</option>`).join("")}</select></label><div class="tr-tbody"><p class="ap-note">Loading the tariff…</p></div></div>
        ${sub.length ? `<h4>Inside this ${level(code).split(" ")[0].toLowerCase()}</h4><table class="tr-t">${sub.map(([k, o]) => `<tr data-trprod="${k}"><td class="tr-n"><b>${esc(k)}</b> ${esc(short(o.n, 58))}</td><td class="num">${gbp(o.exp)}</td><td class="num tr-x">${gbp(o.imp)}</td></tr>`).join("")}</table><p class="ap-note">Exports, then imports.</p>` : ""}
        <p class="ap-note">HMRC overseas trade statistics (OGL v3.0). Partner = destination for exports and country of origin for imports. Some small or confidential trade is only published at chapter level, so levels below can add up to less.</p>`;
    };
    const w = win("p:" + code, `${code} · ${short((node(code) || {}).n || "Product", 40)}`, code.length === 2 || D ? go() : `<p class="ap-note">Loading product detail…</p>`, w => { wire(w); tariff(w, code, ""); });
    if (code.length > 2 && !D) detail().then(() => { w.setBody(go()); wire(w); tariff(w, code, ""); });
    else if (code.length === 2 && !D) detail().then(() => { w.setBody(go()); wire(w); tariff(w, code, ""); });
  }
  const monthAt = (t, i) => { const [a, b] = t.period, y0 = +a.slice(0, 2), m0 = +a.slice(2) - 1, k = m0 + i; return String(y0 + Math.floor(k / 12)).padStart(2, "0") + String(k % 12 + 1).padStart(2, "0"); };
  function wire(w) {
    w.body.onclick = e => { if (common(e)) return; const fb = e.target.closest("[data-trfirms]"); if (fb) openFirms(null, fb.dataset.trfirms); };
    w.body.onchange = e => { const s = e.target.closest("[data-trtc]"); if (s) { const box = s.closest("[data-tariff]"); tariff(w, box.dataset.tariff, s.value); } };
  }

  // ---------- tariff (UK Trade Tariff API: keyless, allows browser requests) ----------
  const TC = new Map();
  const TT = "https://www.trade-tariff.service.gov.uk/api/v2/";
  const getJ = u => TC.get(u) || (TC.set(u, fetch(u).then(r => r.ok ? r.json() : null).catch(() => null)), TC.get(u));
  async function leafFor(code) { // a declarable 10-digit commodity under the code
    if (code.length === 2) return null;
    const h = await getJ(TT + "headings/" + code.slice(0, 4)); if (!h) return null;
    const leaves = (h.included || []).filter(i => i.type === "commodity" && i.attributes.leaf && i.attributes.goods_nomenclature_item_id.startsWith(code));
    return leaves.length ? leaves[0].attributes : null;
  }
  async function tariff(w, code, partner) {
    const box = w.body.querySelector(`[data-tariff="${code}"] .tr-tbody`); if (!box) return;
    if (code.length === 2) { box.innerHTML = `<p class="ap-note">Open a heading or product to see its tariff. <a href="https://www.trade-tariff.service.gov.uk/chapters/${code}" target="_blank" rel="noopener">Chapter ${code} on the UK Trade Tariff ↗</a></p>`; return; }
    const leaf = await leafFor(code); if (!leaf) { box.innerHTML = `<p class="ap-note">The tariff couldn't be read just now. <a href="https://www.trade-tariff.service.gov.uk/headings/${code.slice(0, 4)}" target="_blank" rel="noopener">Look it up on the UK Trade Tariff ↗</a></p>`; return; }
    const id = leaf.goods_nomenclature_item_id, c = await getJ(TT + "commodities/" + id);
    if (!c) { box.innerHTML = `<p class="ap-note"><a href="https://www.trade-tariff.service.gov.uk/commodities/${id}" target="_blank" rel="noopener">${id} on the UK Trade Tariff ↗</a></p>`; return; }
    const I = {}; (c.included || []).forEach(x => { I[x.type + ":" + x.id] = x; });
    const rows = (c.included || []).filter(x => x.type === "measure" && x.attributes.import).map(x => {
      const r = x.relationships, mt = r.measure_type.data.id, ga = ((r.geographical_area || {}).data || {}).id, de = I["duty_expression:" + ((r.duty_expression || {}).data || {}).id];
      const g = I["geographical_area:" + ga]; const kids = g && g.relationships && g.relationships.children_geographical_areas ? (g.relationships.children_geographical_areas.data || []).map(k => k.id) : [];
      return { mt, ga, gn: g ? g.attributes.description : ga, kids, duty: de ? (de.attributes.base || "").replace(/<[^>]+>/g, "") : "", mtn: (I["measure_type:" + mt] || { attributes: {} }).attributes.description || "" };
    });
    const mfn = rows.find(r => r.mt === "103" && r.ga === "1011"), vat = rows.find(r => r.mt === "305"), pref = partner ? rows.find(r => r.mt === "142" && (r.ga === partner || r.kids.includes(partner))) : null;
    const extra = partner ? rows.filter(r => !["103", "142", "305", "109", "112"].includes(r.mt) && (r.ga === partner || r.kids.includes(partner))) : [];
    box.innerHTML = `<table class="itab"><tr><th>Product line</th><td>${esc(id)} · ${esc(short(String(leaf.formatted_description || leaf.description || "").replace(/<[^>]+>/g, ""), 70))}</td></tr>
      <tr><th>UK Global Tariff</th><td><b>${esc(mfn ? mfn.duty || "free" : "—")}</b> <small>(any country without a deal)</small></td></tr>
      ${partner ? `<tr><th>From ${esc(cty(partner))}</th><td><b>${esc(pref ? pref.duty || "0.00 %" : mfn ? mfn.duty : "—")}</b> ${pref ? `<small>(preference: ${esc(pref.gn)})</small>` : `<small>(no preference: the Global Tariff applies)</small>`}</td></tr>` : ""}
      ${extra.map(r => `<tr><th>${esc(r.mtn)}</th><td>${esc(r.duty || "applies")} <small>(${esc(r.gn)})</small></td></tr>`).join("")}
      ${vat ? `<tr><th>Import VAT</th><td>${esc(vat.duty)}</td></tr>` : ""}</table>
      <p class="ap-note">Live from the UK Trade Tariff (HMRC). Preferences need proof of origin. <a href="https://www.trade-tariff.service.gov.uk/commodities/${id}" target="_blank" rel="noopener">Full measures ↗</a></p>`;
  }

  // ---------- partners ----------
  const PT = { q: "", sort: "tot" };
  function partners(cx, el) {
    const t = T(); if (!t) { el.innerHTML = ""; return; }
    const q = PT.q.toLowerCase(), L = Object.entries(t.cty).filter(([k, c]) => c.exp + c.imp > 0 && (!q || c.n.toLowerCase().includes(q) || k.toLowerCase() === q))
      .sort((a, b) => PT.sort === "bal" ? (a[1].exp - a[1].imp) - (b[1].exp - b[1].imp) : (b[1][PT.sort] ?? b[1].exp + b[1].imp) - (a[1][PT.sort] ?? a[1].exp + a[1].imp));
    el.innerHTML = `<div class="ap-row"><input class="tr-q" data-trpq placeholder="Find a country" value="${esc(PT.q)}"><select data-trps>${[["tot", "Total trade"], ["exp", "Exports"], ["imp", "Imports"], ["bal", "Biggest deficit"]].map(([k, l]) => `<option value="${k}" ${PT.sort === k ? "selected" : ""}>${l}</option>`).join("")}</select></div>
      <table class="tr-t tr-ptab"><thead><tr><th>Country</th><th class="num">Exports</th><th class="num">Imports</th><th class="num">Balance</th></tr></thead><tbody>${L.slice(0, 120).map(([k, c]) => `<tr data-trcty="${k}"><td class="tr-n"><i class="sw" style="background:${cx.trade.colours[c.rg] || "#888"}"></i>${esc(c.n)}</td><td class="num">${gbp(c.exp)}</td><td class="num">${gbp(c.imp)}</td><td class="num ${c.exp - c.imp < 0 ? "neg" : "pos"}">${gbp(c.exp - c.imp)}</td></tr>`).join("")}</tbody></table>`;
    const qi = el.querySelector("[data-trpq]"); qi.oninput = () => { PT.q = qi.value; clearTimeout(partners.t); partners.t = setTimeout(() => { partners(cx, el); const n = el.querySelector("[data-trpq]"); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 200); };
    el.onchange = e => { if (e.target.matches("[data-trps]")) { PT.sort = e.target.value; partners(cx, el); } };
    el.onclick = e => common(e);
  }
  const PARTNER_EXTRA = [];   // 0.9 phase 3 adds services, FDI and income sections: fn(code) -> html
  function openPartner(code) {
    const t = T(), c = t.cty[code]; if (!c) return;
    const ys = ["exp", "imp"].map(k => ({ name: FL[k], colour: FLC[k], pts: Object.entries(c.y[k] || {}).map(([y, v]) => [+y, v]) }));
    const ag = AGREEMENTS[code] || (c.rg === "EU" ? AGREEMENTS.EU : null);
    const html = `<div class="lvl"><span>Trading partner · ${esc(c.rg)}</span><span>${esc(code)}</span></div><h3 class="tr-title">${esc(c.n)}</h3>
      <div class="tr-head"><div><span class="tr-k">UK exports</span><b>${gbp(c.exp)}</b></div><div><span class="tr-k">UK imports</span><b>${gbp(c.imp)}</b></div><div><span class="tr-k">Balance</span><b class="${c.exp - c.imp < 0 ? "neg" : "pos"}">${gbp(c.exp - c.imp)}</b></div></div>
      <p class="ap-note">Goods, 12 months to ${esc(mname(t.period[1]))}: ${pct(c.exp, t.tot.exp)} of UK exports, ${pct(c.imp, t.tot.imp)} of imports.${ag ? ` <b>Trade agreement:</b> ${esc(ag[0])} (in effect ${esc(ag[1])}).` : ""}</p>
      <h4>Goods by year</h4><div class="tr-chart">${trend(ys, 440, 140)}</div>
      <div class="tr-two"><div><h4>What the UK sells them</h4>${bars((c.ch.exp || []).map(([k, v]) => [k, v, pct(v, c.exp)]), "exp", k => `${esc(k)} ${esc(short(t.ch[k] ? t.ch[k].n : k, 34))}`, "trprod")}</div><div><h4>What the UK buys from them</h4>${bars((c.ch.imp || []).map(([k, v]) => [k, v, pct(v, c.imp)]), "imp", k => `${esc(k)} ${esc(short(t.ch[k] ? t.ch[k].n : k, 34))}`, "trprod")}</div></div>
      ${PARTNER_EXTRA.map(fn => { try { return fn(code, c) || ""; } catch (e) { return ""; } }).join("")}
      <p class="ap-note">Goods: HMRC (country of origin for imports). Agreements: GOV.UK, “UK trade agreements in effect”.</p>`;
    const w = win("c:" + code, c.n, html, w => { w.body.onclick = e => common(e); });
    return w;
  }
  // UK trade agreements in effect (GOV.UK list; the main ones by partner)
  const AGREEMENTS = { EU: ["UK–EU Trade and Cooperation Agreement", "January 2021"], JP: ["UK–Japan Comprehensive Economic Partnership Agreement", "January 2021"], AU: ["UK–Australia Free Trade Agreement", "May 2023"], NZ: ["UK–New Zealand Free Trade Agreement", "May 2023"],
    CH: ["UK–Switzerland Trade Agreement", "January 2021"], NO: ["UK–Norway, Iceland and Liechtenstein Free Trade Agreement", "December 2021"], IS: ["UK–Norway, Iceland and Liechtenstein Free Trade Agreement", "December 2021"], KR: ["UK–South Korea Trade Agreement", "January 2021"],
    CA: ["UK–Canada Trade Continuity Agreement", "April 2021"], MX: ["UK–Mexico Trade Continuity Agreement", "June 2021"], SG: ["UK–Singapore Free Trade Agreement", "January 2021"], VN: ["UK–Vietnam Free Trade Agreement", "May 2021"], TR: ["UK–Turkey Free Trade Agreement", "January 2021"],
    UA: ["UK–Ukraine Political, Free Trade and Strategic Partnership Agreement", "January 2021"], IL: ["UK–Israel Trade and Partnership Agreement", "January 2021"], EG: ["UK–Egypt Association Agreement", "January 2021"], MA: ["UK–Morocco Association Agreement", "January 2021"],
    CL: ["UK–Chile Association Agreement (and CPTPP)", "January 2021"], PE: ["UK–Andean countries Trade Agreement (and CPTPP)", "January 2021"], CO: ["UK–Andean countries Trade Agreement", "January 2021"], ZA: ["UK–SACUM Economic Partnership Agreement", "January 2021"],
    MY: ["CPTPP", "December 2024"], BN: ["CPTPP", "December 2024"] };

  // ---------- ports ----------
  function portsPanel(cx, el) {
    const t = T(); if (!t) { el.innerHTML = ""; return; }
    const L = Object.entries(t.ports).sort((a, b) => (b[1].exp + b[1].imp) - (a[1].exp + a[1].imp));
    el.innerHTML = `<p class="ap-note">Where goods enter and leave the UK (12 months to ${esc(mname(t.period[1]))}). “Roll-on roll-off” is lorries and trailers on ferries and through the Channel Tunnel.</p>
      <table class="tr-t"><thead><tr><th>Gateway</th><th class="num">Exports</th><th class="num">Imports</th><th>Mostly</th></tr></thead><tbody>${L.slice(0, 60).map(([k, p]) => `<tr data-trport="${k}"><td class="tr-n">${esc(p.n)}</td><td class="num">${gbp(p.exp)}</td><td class="num">${gbp(p.imp)}</td><td><small>${esc(t.modes[(p.mo.imp[0] || p.mo.exp[0] || [" "])[0]] || "")}</small></td></tr>`).join("")}</tbody></table>
      <div class="ap-row"><button class="btn sm" data-trmap="exp">Show export routes</button><button class="btn sm" data-trmap="imp">Show import routes</button></div>`;
    el.onclick = e => common(e);
  }
  function openPort(p) {
    const t = T(), o = t.ports[p]; if (!o) return;
    win("port:" + p, o.n, `<div class="lvl"><span>UK gateway</span><span>${esc(o.a)}</span></div><h3 class="tr-title">${esc(o.n)}</h3>
      <div class="tr-head"><div><span class="tr-k">Exports</span><b>${gbp(o.exp)}</b></div><div><span class="tr-k">Imports</span><b>${gbp(o.imp)}</b></div></div>
      <p class="ap-note">${["exp", "imp"].map(k => `${FL[k]} by ${(o.mo[k] || []).map(([m, v]) => `${esc((t.modes[m] || m).toLowerCase())} ${gbp(v)}`).join(", ")}`).join("<br>")}</p>
      <div class="tr-two"><div><h4>To</h4>${bars(o.ct.exp || [], "exp", k => esc(cty(k)), "trcty")}</div><div><h4>From</h4>${bars(o.ct.imp || [], "imp", k => esc(cty(k)), "trcty")}</div></div>
      ${o.ll ? `<div class="ap-row"><button class="btn sm" data-trfly="${o.ll.join(",")}">Show on the map</button></div>` : ""}`, w => { w.body.onclick = e => { const f = e.target.closest("[data-trfly]"); if (f) ctx.view(f.dataset.trfly.split(",").map(Number), 10); else common(e); }; });
  }

  // ---------- traders (HMRC registers) ----------
  const FR = { q: "", ch: "" };
  function firms(cx, el) {
    const code = ctx.focused && ctx.P[ctx.focused] && ctx.P[ctx.focused].level === "council" ? ctx.focused : null;
    if (!code) { el.innerHTML = `<p class="ap-note">Click a council on the map to list the businesses there that HMRC published as exporting or importing goods.</p>`; return; }
    el.innerHTML = `<p class="ap-note">Loading…</p>`;
    ctx.trade.firms().then(F => {
      const L = (F.list[code] || []).filter(([n, e, i]) => (!FR.q || n.toLowerCase().includes(FR.q.toLowerCase())) && (!FR.ch || pairs(e).includes(FR.ch) || pairs(i).includes(FR.ch)));
      const b = F.by[code] || { exp: 0, imp: 0, ch: { exp: {}, imp: {} } }, t = T();
      el.innerHTML = `<h4>${esc(ctx.nameOf(code))}</h4><p class="ap-note">${(b.exp || 0).toLocaleString("en-GB")} exporting and ${(b.imp || 0).toLocaleString("en-GB")} importing businesses on HMRC's lists for ${esc(F.month)}. ${esc(F.note)}</p>
        <div class="ap-row"><input class="tr-q" data-frq placeholder="Find a business" value="${esc(FR.q)}"><select data-frch><option value="">Any product</option>${Object.keys(t.ch).map(k => `<option value="${k}" ${FR.ch === k ? "selected" : ""}>${k} ${esc(short(t.ch[k].n, 40))}</option>`).join("")}</select></div>
        <p class="ap-note">Most traded here: ${Object.entries(b.ch.exp || {}).slice(0, 5).map(([k, n]) => `<button class="linkish" data-trprod="${k}">${esc(short(t.ch[k] ? t.ch[k].n : k, 28))}</button> (${n})`).join(", ")}</p>
        <table class="tr-t"><thead><tr><th>Business</th><th>Exports</th><th>Imports</th></tr></thead><tbody>${L.slice(0, 300).map(([n, e, i]) => `<tr><td class="tr-n">${esc(n)}</td><td><small>${pairs(e).slice(0, 6).join(" ")}</small></td><td><small>${pairs(i).slice(0, 6).join(" ")}</small></td></tr>`).join("")}</tbody></table>${L.length > 300 ? `<p class="ap-note">First 300 of ${L.length}. Search to narrow.</p>` : ""}`;
      const q = el.querySelector("[data-frq]"); q.oninput = () => { FR.q = q.value; clearTimeout(firms.t); firms.t = setTimeout(() => { firms(cx, el); const n = el.querySelector("[data-frq]"); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } }, 250); };
      el.onchange = e => { if (e.target.matches("[data-frch]")) { FR.ch = e.target.value; firms(cx, el); } };
      el.onclick = e => common(e);
    });
  }
  const pairs = s => (s || "").match(/../g) || [];
  function openFirms(code, ch) { FR.ch = ch || ""; if (ctx.openPanel) { ctx.openPanel("traders"); } }

  // ---------- 0.9 phase 3: investment and income (data/investment.js: ONS, DBT) ----------
  const IV = () => window.ATLAS_INVEST;
  const yrs = o => Object.keys(o || {}).sort();
  const lastY = o => { const k = yrs(o).filter(y => o[y] != null); return k.length ? k[k.length - 1] : null; };
  const row = (d, pat) => { const k = Object.keys(d || {}).find(x => pat.test(x)); return k ? d[k] : {}; };
  const m6 = v => v == null ? "—" : gbp(v * 1e6);   // ONS tables are in £ million
  const FDIC = { in: "#7b4fa6", out: "#13876b" };
  function investment(cx, el) {
    const I = IV(); if (!I || !I.fdi.in) { el.innerHTML = `<p class="ap-note">Investment data isn't loaded.</p>`; return; }
    const pin = row(I.fdi.in.tot.pos, /^Total foreign direct investment/), pout = row(I.fdi.out.tot.pos, /^Total foreign direct investment/), y = lastY(pin);
    const ser = [{ name: "Foreign-owned in the UK", colour: FDIC.in, pts: yrs(pin).map(k => [+k, pin[k] * 1e6]) }, { name: "UK-owned abroad", colour: FDIC.out, pts: yrs(pout).map(k => [+k, pout[k] * 1e6]) }];
    const top = (side, k) => Object.entries(I.fdi[side].cty).map(([c, o]) => [c, ((o.pos || {})[k] || 0) * 1e6]).filter(x => x[1] > 0).sort((a, b) => b[1] - a[1]).slice(0, 12);
    const ind = side => Object.entries((I.fdi[side].ind || {})[y] || {}).filter(([k]) => k !== "Total").sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, v]) => [k, v * 1e6]);
    const D = I.dbt || {}, rg = Object.entries(D.region || {}).map(([k, o]) => [k, (o.proj || {})["2025-26"] || 0, (o.jobs || {})["2025-26"] || 0]).sort((a, b) => b[2] - a[2]);
    const nm = (c, side) => esc(T() && T().cty[c] ? T().cty[c].n : (I.fdi[side].cty[c] || {}).n || c);
    const topIn = top("in", y)[0], topOut = top("out", y)[0], y0 = yrs(pin)[0];
    const story = `Foreign companies owned <b>${m6(pin[y])}</b> of UK businesses at the end of ${y}, while UK companies owned ${m6(pout[y])} abroad, so the UK is a net recipient of ${m6(Math.abs(pout[y] - pin[y]))}.
      Foreign ownership was ${window.AtlasNarrative ? AtlasNarrative.change(pin[y0], pin[y]) : ""} on ${y0}. The largest owner was ${esc(nm(topIn[0], "in"))} (${m6(topIn[1] / 1e6)}); UK firms owned most in ${esc(nm(topOut[0], "out"))} (${m6(topOut[1] / 1e6)}).`;
    el.innerHTML = `<div class="nv"><p class="nv-story">${story}</p><p class="nv-means"><b>What it tells us.</b> Lasting ownership across borders: a company holding 10% or more of a business in another country, valued at book value.</p>
        <p class="nv-trust">Survey-based and revised; holding companies and financial centres (the Netherlands, Luxembourg, Jersey) stand in for the ultimate owners, so country rankings show where money is routed as much as who owns it.</p></div>
      <div class="tr-head"><div><span class="tr-k">Foreign-owned in UK</span><b>${m6(pin[y])}</b></div><div><span class="tr-k">UK-owned abroad</span><b>${m6(pout[y])}</b></div><div><span class="tr-k">Net</span><b class="${pout[y] - pin[y] < 0 ? "neg" : "pos"}">${m6(pout[y] - pin[y])}</b></div></div>
      <p class="ap-note">Foreign direct investment positions (the stock owned, at book value) at the end of ${y}: companies owning 10% or more of a business in another country. ONS, directional basis.</p><div class="tr-chart">${trend(ser, 440, 150)}</div>
      <div class="tr-two"><div><h4>Who owns most in the UK</h4>${bars(top("in", y).map(([c, v]) => [c, v]), "imp", c => nm(c, "in"), "trcty").replace(/#c0392b/g, FDIC.in)}</div><div><h4>Where UK firms own most</h4>${bars(top("out", y).map(([c, v]) => [c, v]), "exp", c => nm(c, "out"), "trcty").replace(/#1e6fb8/g, FDIC.out)}</div></div>
      <div class="tr-two"><div><h4>Foreign-owned, by industry</h4>${bars(ind("in"), "imp", k => esc(short(k, 30)), null).replace(/#c0392b/g, FDIC.in)}</div><div><h4>UK-owned abroad, by industry</h4>${bars(ind("out"), "exp", k => esc(short(k, 30)), null).replace(/#1e6fb8/g, FDIC.out)}</div></div>
      ${rg.length ? `<h4>New investment projects in the UK, 2025-26 <small>(DBT)</small></h4><table class="tr-t"><thead><tr><th>Region</th><th class="num">Projects</th><th class="num">New jobs</th></tr></thead><tbody>${rg.map(([k, p, j]) => `<tr data-trfocus="${k}"><td class="tr-n">${esc(ctx.P[k] ? ctx.nameOf(k) : k)}</td><td class="num">${p || "—"}</td><td class="num">${j ? j.toLocaleString("en-GB") : "—"}</td></tr>`).join("")}</tbody></table>
        <p class="ap-note">Top source countries: ${Object.entries(D.market || {}).sort((a, b) => ((b[1].proj || {})["2025-26"] || 0) - ((a[1].proj || {})["2025-26"] || 0)).slice(0, 6).map(([k, o]) => `${esc(k)} ${(o.proj || {})["2025-26"] || "c"}`).join(", ")}.</p>
        <div class="ap-row"><button class="btn sm" data-trmetrics="inv_jobs">Map new jobs from investment</button></div>` : ""}
      <p class="ap-note">${esc(I.sources)}</p>`;
    el.onclick = e => { if (common(e)) return; const f = e.target.closest("[data-trfocus]"); if (f && ctx.P[f.dataset.trfocus]) ctx.focus(f.dataset.trfocus); const m = e.target.closest("[data-trmetrics]"); if (m) { ctx.setLevel("region"); ctx.mapOnly([m.dataset.trmetrics]); } };
  }
  function income(cx, el) {
    const I = IV(); if (!I || !I.fdi.in) { el.innerHTML = `<p class="ap-note">Income data isn't loaded.</p>`; return; }
    const fin = I.fdi.in.tot.flow, fout = I.fdi.out.tot.flow;
    const pi = row(fin, /share of .*profits/i), di = row(fin, /dividends/i), ri = row(fin, /unremitted/i), po = row(fout, /share of .*profits/i), dout = row(fout, /dividends/i), ro = row(fout, /unremitted/i), y = lastY(pi);
    const ser = [{ name: "Dividends paid to foreign owners", colour: FDIC.in, pts: yrs(di).filter(k => di[k] != null).map(k => [+k, di[k] * 1e6]) }, { name: "Dividends received by UK owners", colour: FDIC.out, pts: yrs(dout).filter(k => dout[k] != null).map(k => [+k, dout[k] * 1e6]) }];
    const PB = I.pb.primary || {}, py = lastY(PB.cr), cr = (PB.cr || {})[py] || {}, db = (PB.db || {})[py] || {};
    const pbRows = [["Compensation of employees", /^Compensation/], ["Earnings on direct investment (FDI)", /direct investment/], ["Earnings on portfolio investment", /Total portfolio/], ["Earnings on other investment (loans, deposits)", /other investment/], ["Total primary income", /^Total$/]];
    const val = (o, re) => { const k = Object.keys(o).find(x => re.test(x)); return k ? o[k] : null; };
    const inc = Object.entries(PB.cr || {}).map(([k, o]) => [k, val(o, /Total investment income/)]), dec = Object.entries(PB.db || {}).map(([k, o]) => [k, val(o, /Total investment income/)]);
    const ser2 = [{ name: "Investment income earned abroad", colour: FDIC.out, pts: inc.filter(x => x[1] != null).map(([k, v]) => [+k, v * 1e6]) }, { name: "Paid to foreign investors", colour: FDIC.in, pts: dec.filter(x => x[1] != null).map(([k, v]) => [+k, v * 1e6]) }];
    const byC = side => Object.entries(I.fdi[side].cty).map(([c, o]) => [c, ((o.div || {})[y] || 0) * 1e6]).filter(x => x[1] > 0).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const SI = I.pb.secondary || {}, sy = lastY(SI.cr), hh = (o, re) => val(((o || {})[sy]) || {}, re);
    const story = `In ${y}, foreign owners took <b>${m6(di[y])}</b> out of the UK in dividends from businesses they own here, ${ri[y] >= 0 ? `and left ${m6(ri[y])} of profits in those businesses` : `${m6(Math.abs(ri[y]))} more than those businesses earned that year (paying out earlier profits)`}. UK owners brought home ${m6(dout[y])} in dividends from abroad.
      ${pbRows.length ? `Across all kinds of income, the UK ${(val(cr, /^Total$/) || 0) >= (val(db, /^Total$/) || 0) ? "earned" : "paid out"} ${m6(Math.abs((val(cr, /^Total$/) || 0) - (val(db, /^Total$/) || 0)))} more than it ${(val(cr, /^Total$/) || 0) >= (val(db, /^Total$/) || 0) ? "paid" : "earned"} in ${py}.` : ""}`;
    el.innerHTML = `<div class="nv"><p class="nv-story">${story}</p><p class="nv-means"><b>What it tells us.</b> How much profit leaves and enters the country: dividends paid to owners, profits kept and reinvested, and all other income across the border.</p>
        <p class="nv-trust">Survey-based and revised for years; reinvested profits are estimates, and a few large companies can swing a year.</p></div>
      <h4>Profits of foreign-owned businesses in the UK, ${y}</h4>
      <div class="tr-head"><div><span class="tr-k">Profits</span><b>${m6(pi[y])}</b></div><div><span class="tr-k">Sent abroad (dividends)</span><b>${m6(di[y])}</b></div><div><span class="tr-k">Kept in the UK</span><b>${m6(ri[y])}</b></div></div>
      <h4>Profits of UK-owned businesses abroad, ${y}</h4>
      <div class="tr-head"><div><span class="tr-k">Profits</span><b>${m6(po[y])}</b></div><div><span class="tr-k">Brought home (dividends)</span><b>${m6(dout[y])}</b></div><div><span class="tr-k">Kept abroad</span><b>${m6(ro[y])}</b></div></div>
      <p class="ap-note">Net: UK owners brought home ${m6((dout[y] || 0) - (di[y] || 0))} more in dividends than foreign owners took out. Reinvested (“unremitted”) profits stay in the business and count as new investment.</p>
      <div class="tr-chart">${trend(ser, 440, 140)}</div>
      <div class="tr-two"><div><h4>Dividends paid to owners in…</h4>${bars(byC("in"), "imp", c => esc(T() && T().cty[c] ? T().cty[c].n : (I.fdi.in.cty[c] || {}).n || c), "trcty").replace(/#c0392b/g, FDIC.in)}</div><div><h4>Dividends received from…</h4>${bars(byC("out"), "exp", c => esc(T() && T().cty[c] ? T().cty[c].n : (I.fdi.out.cty[c] || {}).n || c), "trcty").replace(/#1e6fb8/g, FDIC.out)}</div></div>
      <h4>All income across the border, ${py} <small>(Pink Book)</small></h4><table class="tr-t"><thead><tr><th></th><th class="num">Earned from abroad</th><th class="num">Paid abroad</th><th class="num">Net</th></tr></thead><tbody>
      ${pbRows.map(([l, re]) => { const a = val(cr, re), b = val(db, re); return `<tr><td class="tr-n">${l}</td><td class="num">${m6(a)}</td><td class="num">${m6(b)}</td><td class="num ${a - b < 0 ? "neg" : "pos"}">${a != null && b != null ? m6(a - b) : "—"}</td></tr>`; }).join("")}</tbody></table>
      <div class="tr-chart">${trend(ser2, 440, 130)}</div>
      ${sy ? `<h4>Transfers, ${sy} <small>(secondary income)</small></h4><p class="ap-note">Money sent between households and governments without anything in return. Households abroad sent ${m6(hh(SI.cr, /Other receipts of households/))} to the UK; UK households sent ${m6(hh(SI.db, /Other (payments|receipts) of households/))} abroad (mostly personal transfers, remittances). Government: ${m6(hh(SI.cr, /^Total general government/))} in, ${m6(hh(SI.db, /^Total general government/))} out (including aid and international contributions).</p>` : ""}
      <p class="ap-note">${esc(I.sources)}</p>`;
    el.onclick = e => common(e);
  }
  // partner card: services by type, FDI both ways, the whole current account
  PARTNER_EXTRA.push((code, c) => {
    const I = IV(); if (!I) return "";
    const s = I.svc && I.svc.cty[code], f1 = I.fdi.in && I.fdi.in.cty[code], f2 = I.fdi.out && I.fdi.out.cty[code], ca = I.ca && I.ca.cty[code];
    let h = "";
    if (s) { const L = k => Object.entries(s[k] || {}).filter(([t]) => t !== "0" && I.svc.names[t]).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([t, v]) => [t, v * 1e6]);
      h += `<h4>Services, ${esc(I.svc.year)}</h4><p class="ap-note">UK exports ${m6((s.exp || {})["0"])}, imports ${m6((s.imp || {})["0"])}.</p><div class="tr-two"><div>${bars(L("exp"), "exp", t => esc(I.svc.names[t]), null)}</div><div>${bars(L("imp"), "imp", t => esc(I.svc.names[t]), null)}</div></div>`; }
    if (f1 || f2) { const yy = lastY((f1 || f2).pos || {}) || "2024";
      h += `<h4>Direct investment, ${yy}</h4><table class="itab"><tr><th>Their firms own in the UK</th><td>${m6(f1 && f1.pos && f1.pos[yy])}</td></tr><tr><th>UK firms own there</th><td>${m6(f2 && f2.pos && f2.pos[yy])}</td></tr>
        <tr><th>Profits their firms made in the UK</th><td>${m6(f1 && f1.earn && f1.earn[yy])}${f1 && f1.div && f1.div[yy] != null ? ` · ${m6(f1.div[yy])} paid home as dividends` : ""}</td></tr>
        <tr><th>Profits UK firms made there</th><td>${m6(f2 && f2.earn && f2.earn[yy])}${f2 && f2.div && f2.div[yy] != null ? ` · ${m6(f2.div[yy])} brought back as dividends` : ""}</td></tr></table>`; }
    if (ca) { const k = ["Trade in goods", "Trade in services", "Primary income", "Secondary income", "Current account"];
      h += `<h4>Everything across the border, ${esc(I.ca.year)} <small>(current account)</small></h4><table class="tr-t"><thead><tr><th></th><th class="num">UK receives</th><th class="num">UK pays</th><th class="num">Balance</th></tr></thead><tbody>${k.map(x => `<tr><td class="tr-n">${x === "Primary income" ? "Income (profits, interest, pay)" : x === "Secondary income" ? "Transfers" : x}</td><td class="num">${m6((ca.cr || {})[x])}</td><td class="num">${m6((ca.db || {})[x])}</td><td class="num ${((ca.bal || {})[x] || 0) < 0 ? "neg" : "pos"}">${m6((ca.bal || {})[x])}</td></tr>`).join("")}</tbody></table>`; }
    return h;
  });

  window.AtlasTrade = {
    init(c) { ctx = c; setTimeout(() => {   // 0.12: a trade route on the map opens its partner
      if (!ctx.registerPick) return;
      ctx.registerPick({ id: "trade-routes", layers: ["trade-exp", "trade-imp"], pad: 4, priority: 22,
        hover: f => { const p = f.properties, d = T(); const cn = d && d.cty[p.c] ? d.cty[p.c].n : p.c, pn = d && d.ports[p.p] ? d.ports[p.p].n : p.p; return `<div class="poi-h"><b>${esc(p.f === "exp" ? `${pn} → ${cn}` : `${cn} → ${pn}`)}</b><div class="poi-sub">${p.f === "exp" ? "Exports" : "Imports"} · about ${gbp(p.v)} a year · click for ${esc(cn)}</div></div>`; },
        open: f => openPartner(f.properties.c) });
    }, 0); },
    overview, products, partners, ports: portsPanel, firms, investment, income, openProduct, openPartner, openPort, showRoutes, PARTNER_EXTRA, gbp,
    _: { T, node, kids, detail, level, cty, port, gbp, chg, ym, monthAt, short: (t, n) => short(t, n), get D() { return D; } },   // 0.12.1: for trade_story.js
  };
})();
