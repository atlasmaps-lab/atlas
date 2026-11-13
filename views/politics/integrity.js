/* Atlas Politics (0.12) · Integrity: indicators of corruption *risk*, never evidence of wrongdoing.
 *   Public buying   red flags in contract award notices (Find a Tender): single bidding in competitive procedures and
 *                   awards without competition, and a risk index that averages them (Fazekas, Tóth and King 2016)
 *   Competition     how contested a council is: the largest party's share of seats and years since control changed
 *                   (weak electoral competition goes with higher procurement risk in English councils)
 *   Accountability  section 114 notices (curated with sources)
 *   The UK abroad   Transparency International's Corruption Perceptions Index
 * Data: data/integrity.js (pipeline/build_integrity.py), loaded the first time it's needed; council compositions from
 * data/local.js. Rows open cards; measures go on the map.
 */
(function () {
  "use strict";
  const CAVEAT = "Indicators of risk, not evidence of wrongdoing: a direct award can be right (an emergency, a single specialist supplier) and a single bid can reflect a small market.";
  let ctx = null, D = null, loading = null;
  const esc = t => String(t == null ? "" : t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const pc = v => v == null ? "—" : v.toFixed(1) + "%";
  const money = v => !v ? "—" : v >= 1e9 ? "£" + (v / 1e9).toFixed(1) + "bn" : v >= 1e6 ? "£" + (v / 1e6).toFixed(1) + "m" : v >= 1e3 ? "£" + Math.round(v / 1e3) + "k" : "£" + Math.round(v);
  const dmy = d => d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "";
  function load() {
    if (D) return Promise.resolve(D); if (window.ATLAS_INTEGRITY) return Promise.resolve(D = window.ATLAS_INTEGRITY);
    return loading || (loading = new Promise((ok, no) => { const s = document.createElement("script"); s.src = "data/integrity.js?v=" + ((document.querySelector('script[src*="app.js?v="]') || {}).src || "").split("v=")[1];
      s.onload = () => { D = window.ATLAS_INTEGRITY; ok(D); if (ctx) { ctx.repaint(); if (window.AtlasMenu && AtlasMenu.refresh) AtlasMenu.refresh(); } }; s.onerror = () => no(new Error("data/integrity.js didn't load")); document.head.appendChild(s); }));
  }
  // ---------- electoral competition, from council compositions ----------
  function competition(code) {
    const L = ((ctx.LOC || {}).comp || {})[code]; if (!L || !L.length) return null;
    const last = L[L.length - 1], seats = last[1], parties = Object.entries(last[2]).filter(([p]) => p !== "oth" && p !== "ind" && p !== "vac").sort((a, b) => b[1] - a[1]);
    const ctl = r => { const t = r[1], top = Object.entries(r[2]).filter(([p]) => p !== "oth" && p !== "vac").sort((a, b) => b[1] - a[1])[0]; return top && top[1] > t / 2 ? top[0] : "noc"; };
    const now = ctl(last); let since = last[0]; for (let i = L.length - 1; i >= 0 && ctl(L[i]) === now; i--) since = L[i][0];
    return { top: parties[0] ? parties[0][0] : null, share: parties[0] ? 100 * parties[0][1] / seats : null, ctl: now, since, years: last[0] - since, yr: last[0] };
  }
  function define(c) {
    ctx = c; if (define.done || !ctx.defineMetric) return; define.done = true;
    const G = "Integrity (risk indicators)", lv = ["council"], cv = (k) => code => { if (!D) { load().catch(() => {}); return null; } const x = D.councils[code]; return x && x[k] != null ? { v: x[k], text: pc(x[k]), yr: `${D.from.slice(0, 4)}–${D.to.slice(0, 4)}` } : null; };
    ctx.defineMetric({ id: "int_cri", p: "political", group: G, label: "Procurement risk index", scale: "interval", nature: "rate", temporal: "static", levels: lv, fmt: v => v.toFixed(1),
      desc: "The average of two red flags in the council's contract awards: single bidding in competitive procedures and awards without competition (0–100). " + CAVEAT, how: "(single-bid share + no-competition share) ÷ 2, over award notices on Find a Tender since early 2024; councils with fewer than 20 awards are left out", source: "Find a Tender (Cabinet Office), OCDS award notices", get: cv("cri") });
    ctx.defineMetric({ id: "int_single", p: "political", group: G, label: "Single-bid contracts", scale: "ratio", nature: "share", temporal: "static", levels: lv, fmt: pc,
      desc: "Share of the council's competitive (open or selective) contract awards that drew only one bid. " + CAVEAT, source: "Find a Tender (Cabinet Office)", get: cv("sb") });
    ctx.defineMetric({ id: "int_direct", p: "political", group: G, label: "Contracts awarded without competition", scale: "ratio", nature: "share", temporal: "static", levels: lv, fmt: pc,
      desc: "Share of the council's contract awards made without a call for competition (direct awards and limited procedures). " + CAVEAT, source: "Find a Tender (Cabinet Office)", get: cv("di") });
    ctx.defineMetric({ id: "int_dominance", p: "political", group: G, label: "Largest party's share of seats", scale: "ratio", nature: "share", temporal: "static", levels: lv, fmt: pc,
      desc: "How dominant the largest party is on the council. Less electoral competition goes with higher corruption risk in council buying (research on English councils).", source: "Open Council Data UK compositions (CC BY-SA 4.0)",
      get: code => { const x = competition(code); return x && x.share != null ? { v: x.share, text: `${pc(x.share)} (${ctx.partyName(x.top)})`, yr: String(x.yr) } : null; } });
    ctx.defineMetric({ id: "int_years", p: "political", group: G, label: "Years since control changed", scale: "ratio", nature: "count", temporal: "static", levels: lv, fmt: v => v.toFixed(0) + " years",
      desc: "Years the same party (or no overall control) has run the council without a change, from compositions since 1973.", source: "Open Council Data UK compositions (CC BY-SA 4.0)",
      get: code => { const x = competition(code); return x ? { v: x.years, text: `${x.years} years (${x.ctl === "noc" ? "no overall control" : ctx.partyName(x.ctl)} since ${x.since})`, yr: String(x.yr) } : null; } });
  }
  // ---------- cards ----------
  const flagRows = L => `<table class="mo-tab"><thead><tr><th>Contract</th><th>Flag</th><th class="num">Value</th><th class="num">Date</th></tr></thead><tbody>${L.map(f => `<tr><td><a href="${esc(f.u)}" target="_blank" rel="noopener">${esc(f.t || "Untitled")} ↗</a></td><td>${f.f === "single" ? "One bid" : "No competition"}</td><td class="num" data-v="${f.v || 0}">${money(f.v)}</td><td class="num" data-v="${esc(f.d)}">${esc(dmy(f.d))}</td></tr>`).join("")}</tbody></table>`;
  function buyerCard(name, x, code) {
    const V = AtlasCard.viz, uk = D.uk, comp = code ? competition(code) : null, s114 = code ? D.s114.find(s => s.code === code) : null;
    return { app: "Politics", title: `${name}: integrity risk`, lede: `<span class="ap-keep">${esc(CAVEAT)}</span>`,
      figs: [{ v: x.cri != null ? x.cri.toFixed(1) : "—", l: `risk index (UK ${uk.cri.toFixed(1)})` }, { v: pc(x.sb), l: `single-bid (UK ${pc(uk.sb)})` }, { v: pc(x.di), l: `no competition (UK ${pc(uk.di)})` }],
      items: [
        { k: "Single bidding", h: x.sb != null ? `<b>${x.single}</b> of ${x.comp} competitive awards drew one bid (${pc(x.sb)})` : `Too few competitive awards with bid counts (${x.comp})`, viz: V.big(pc(x.sb), "one bid"), open: true,
          more: `<p>In an open or selective competition, a single bid can mean a market too small to compete, or a tender written for one supplier. The UK average across all buyers is ${pc(uk.sb)}.</p>` },
        { k: "Awards without competition", h: `<b>${x.lim}</b> of ${x.n} awards (${pc(x.di)}), worth ${money(x.vlim)}`, viz: V.big(pc(x.di), "direct"),
          more: `<p>Direct awards and limited procedures skip open competition. The Procurement Act 2023 (in force from February 2025) requires a notice for these, so more of them are now visible than before.</p>` },
        x.top && x.top.length ? { k: "Largest flagged contracts", h: `${x.top.length} largest, by value`, more: flagRows(x.top) } : null,
        comp ? { k: "Electoral competition", h: `${comp.ctl === "noc" ? "No overall control" : esc(ctx.partyName(comp.ctl)) + " control"} since ${comp.since}; the largest party holds ${pc(comp.share)} of seats`, viz: V.big(String(comp.years), "years unchanged"),
          more: "<p>Research on English councils finds that where one party is dominant and elections are less competitive, contract awards carry more red flags.</p>" } : null,
        s114 ? { k: "Section 114 notices", h: `Issued ${s114.d.map(d => esc(dmy(d + "-01").replace(/^1 /, ""))).join(", ")}`, url: s114.u, urlLabel: "Find the notices on GOV.UK", more: "<p>The chief finance officer stopped new spending because the council couldn't balance its budget. It's a sign of financial failure, not of corruption.</p>" } : null,
        { k: "How it's measured", h: `${x.n} award notices on Find a Tender, ${dmy(D.from)} to ${dmy(D.to)}`, url: "https://www.find-tender.service.gov.uk/", urlLabel: "Find a Tender",
          more: `<p>Following Fazekas, Tóth and King (2016). A third standard flag, a very short advertising window, needs tender deadlines that award notices don't carry, so it isn't counted. Contracts below the Find a Tender thresholds (on Contracts Finder) aren't included.</p>` }].filter(Boolean),
      source: "Find a Tender (Cabinet Office), OGL", when: dmy(D.to), map: code ? { level: "council", metrics: ["int_cri"] } : null };
  }
  const openCouncil = code => load().then(() => { const x = D.councils[code]; if (x) AtlasCard.open(buyerCard(ctx.nameOf(code), x, code)); else ctx.toast && ctx.toast("No award notices matched to this council yet"); });
  const openBuyer = i => load().then(() => AtlasCard.open(buyerCard(D.buyers[i].name, D.buyers[i], null)));
  function cpiCard() {
    const L = D.cpi, last = L[L.length - 1];
    return { app: "Politics", title: "The UK in the Corruption Perceptions Index", figs: [{ v: String(last[1]), l: `score out of 100, ${last[0]}` }, { v: "#" + last[2], l: "rank" }, { v: (last[1] - L[0][1] > 0 ? "+" : "") + (last[1] - L[0][1]), l: `since ${L[0][0]}` }],
      items: [{ k: "Score by year", h: `From ${L[0][1]} in ${L[0][0]} to ${last[1]} in ${last[0]}, the lowest since the current method began in 2012`, open: true, viz: AtlasCard.viz.line ? AtlasCard.viz.line(L.map(r => [r[0], r[1]])) : "",
        more: `<p>Transparency International's index combines expert and business surveys of how corrupt a country's public sector is seen to be. It measures perceptions, not cases.</p>` },
        { k: "Where it comes from", h: "Transparency International", url: "https://www.transparency.org/en/cpi", urlLabel: "The index" }], source: "Transparency International", when: String(last[0]) };
  }
  // ---------- panel ----------
  function render(c, el) {
    define(c); if (!D) { el.innerHTML = `<p class="ap-note ap-keep">Loading the contract data…</p>`; load().then(() => render(c, el)).catch(e => { el.innerHTML = `<p class="ap-note ap-keep">${esc(e.message)}</p>`; }); return; }
    const code = ctx.focused && ctx.P[ctx.focused] && ctx.P[ctx.focused].level === "council" ? ctx.focused : null, x = code && D.councils[code], uk = D.uk;
    const ranked = Object.entries(D.councils).filter(([, v]) => v.cri != null).sort((a, b) => b[1].cri - a[1].cri);
    const rank = code && x && x.cri != null ? ranked.findIndex(([k]) => k === code) + 1 : null, comp = code ? competition(code) : null;
    el.innerHTML = `<div class="nv"><p class="nv-story">${code ? (x ? `${esc(ctx.nameOf(code))}: ${x.cri != null ? `a procurement risk index of <b>${x.cri.toFixed(1)}</b> (UK ${uk.cri.toFixed(1)}), ${rank} of ${ranked.length} councils with enough awards` : `${x.n} award notices, too few for the index`}.` : `No award notices matched to ${esc(ctx.nameOf(code))} yet.`) + (comp ? ` ${comp.ctl === "noc" ? "No overall control" : esc(ctx.partyName(comp.ctl)) + " has run it"} since ${comp.since}.` : "")
        : `Across UK public buyers, <b>${pc(uk.sb)}</b> of competitive contracts drew a single bid and <b>${pc(uk.di)}</b> were awarded without competition (${uk.n.toLocaleString("en-GB")} awards since ${esc(dmy(D.from))}).`}</p></div>
      <p class="ap-note ap-keep">${esc(CAVEAT)}</p>
      <div class="ap-row"><button class="btn sm" data-intmap="int_cri">Risk index on the map</button><button class="btn sm" data-intmap="int_single">Single bids</button><button class="btn sm" data-intmap="int_direct">No competition</button><button class="btn sm" data-intmap="int_dominance">Party dominance</button>${code && x ? `<button class="btn sm" data-intcouncil="${code}">${esc(ctx.nameOf(code))} as a card</button>` : ""}</div>
      ${code && x && x.top.length ? `<h4 class="ed-open">Largest flagged contracts: ${esc(ctx.nameOf(code))}</h4>${flagRows(x.top)}` : ""}
      <h4>Councils with the highest risk</h4><table class="mo-tab"><thead><tr><th>Council</th><th class="num">Index</th><th class="num">One bid</th><th class="num">No competition</th><th class="num">Awards</th></tr></thead><tbody>${ranked.slice(0, 25).map(([k, v]) => `<tr><td><button class="linkish" data-intcouncil="${k}">${esc(ctx.nameOf(k))}</button></td><td class="num" data-v="${v.cri}">${v.cri.toFixed(1)}</td><td class="num" data-v="${v.sb}">${pc(v.sb)}</td><td class="num" data-v="${v.di}">${pc(v.di)}</td><td class="num" data-v="${v.n}">${v.n}</td></tr>`).join("")}</tbody></table>
      <h4>Largest public buyers</h4><table class="mo-tab"><thead><tr><th>Buyer</th><th class="num">Index</th><th class="num">One bid</th><th class="num">No competition</th><th class="num">Awards</th></tr></thead><tbody>${D.buyers.slice(0, 40).map((v, i) => `<tr><td><button class="linkish" data-intbuyer="${i}">${esc(v.name)}</button></td><td class="num" data-v="${v.cri ?? ""}">${v.cri != null ? v.cri.toFixed(1) : "—"}</td><td class="num" data-v="${v.sb ?? ""}">${pc(v.sb)}</td><td class="num" data-v="${v.di ?? ""}">${pc(v.di)}</td><td class="num" data-v="${v.n}">${v.n}</td></tr>`).join("")}</tbody></table>
      <h4>Section 114 notices</h4><table class="mo-tab"><thead><tr><th>Council</th><th>Issued</th></tr></thead><tbody>${D.s114.map(s => `<tr><td>${ctx.P[s.code] ? `<button class="linkish" data-intcouncil="${s.code}">${esc(s.n)}</button>` : esc(s.n)}</td><td><a href="${esc(s.u)}" target="_blank" rel="noopener">${esc(s.d.join(", "))} ↗</a></td></tr>`).join("")}</tbody></table>
      <h4>The UK internationally</h4><p>Transparency International's Corruption Perceptions Index: <b>${D.cpi[D.cpi.length - 1][1]}</b> out of 100 in ${D.cpi[D.cpi.length - 1][0]} (rank ${D.cpi[D.cpi.length - 1][2]}), down from ${Math.max(...D.cpi.map(r => r[1]))} at its best. <button class="linkish" data-intcpi>As a card</button></p>
      <p class="ap-note">Red flags from Find a Tender award notices (Cabinet Office, OGL v3.0), ${esc(dmy(D.from))} to ${esc(dmy(D.to))}; method after Fazekas, Tóth and King (2016). A short-advertising flag isn't possible from award notices. County councils appear among the buyers (Atlas maps districts and unitary councils). Section 114 notices curated from GOV.UK; CPI from Transparency International.</p>`;
  }
  function bind() {
    if (bind.done) return; bind.done = true;
    document.addEventListener("click", e => {
      const t = e.target.closest && e.target.closest("[data-intmap],[data-intcouncil],[data-intbuyer],[data-intcpi]"); if (!t || !ctx) return; const d = t.dataset;
      if (d.intmap) { ctx.setLevel("council"); ctx.mapOnly([d.intmap]); }
      else if (d.intcouncil) openCouncil(d.intcouncil);
      else if (d.intbuyer != null) openBuyer(+d.intbuyer);
      else if (t.hasAttribute("data-intcpi")) load().then(() => AtlasCard.open(cpiCard()));
    });
  }
  // ---------- the bar's dropdown ----------
  const reg = window.AtlasMenus = window.AtlasMenus || {}; const M = reg.politics = reg.politics || {};
  M.integrity = (c, B) => {
    define(c); bind();
    if (!D) { load().catch(() => {}); return { noTabs: true, lede: "Loading the contract data…", sections: [{ label: "Loading", items: [{ label: "Loading…", sub: "Contract award notices", loading: true }] }] }; }
    const ranked = Object.entries(D.councils).filter(([, v]) => v.cri != null).sort((a, b) => b[1].cri - a[1].cri);
    return { noTabs: true, lede: `Indicators of corruption risk, not evidence of wrongdoing. ${D.uk.n.toLocaleString("en-GB")} contract awards since ${dmy(D.from)}.`, sections: [
      { label: "Councils", key: "councils", note: "Ranked by the procurement risk index; choose one for its flagged contracts.", items: ranked.map(([k, v]) => ({ label: ctx.nameOf(k), key: k, v: v.cri, sub: `index ${v.cri.toFixed(1)} · one bid ${pc(v.sb)} · no competition ${pc(v.di)}`, card: () => buyerCard(ctx.nameOf(k), v, k) })),
        figTitle: "UK", figures: [{ label: "Single-bid", value: pc(D.uk.sb), chg: "of competitive awards" }, { label: "No competition", value: pc(D.uk.di), chg: "of all awards" }] },
      { label: "Public buyers", key: "buyers", note: "Departments, NHS bodies, county councils and others with at least 20 awards.", items: D.buyers.map((v, i) => ({ label: v.name, key: "b" + i, v: v.cri, sub: `${v.n} awards · index ${v.cri != null ? v.cri.toFixed(1) : "—"}`, card: () => buyerCard(v.name, v, null) })) },
      { label: "Accountability", key: "acc", items: D.s114.map(s => ({ label: s.n, sub: `Section 114 notice ${s.d.join(", ")}`, card: () => ctx.P[s.code] && D.councils[s.code] ? buyerCard(s.n, D.councils[s.code], s.code) : { app: "Politics", title: `${s.n}: section 114 notices`, items: [{ k: "Issued", h: s.d.join(", "), url: s.u, urlLabel: "GOV.UK", open: true }], source: "GOV.UK", when: "" } })) },
      { label: "The UK internationally", key: "cpi", items: [{ label: "Corruption Perceptions Index", sub: `${D.cpi[D.cpi.length - 1][1]} out of 100 (${D.cpi[D.cpi.length - 1][0]})`, card: () => cpiCard() }] },
      B.group("Integrity (risk indicators)", "political", { label: "On the map" }),
      { label: "The full panel", items: [B.panel("integrity", "Open Integrity", "Every table in one window")] }].filter(Boolean) };
  };
  window.AtlasIntegrity = { define, render: (c, el) => { bind(); render(c, el); }, load, competition: c => competition(c), openCouncil, get D() { return D; }, CAVEAT };
})();
