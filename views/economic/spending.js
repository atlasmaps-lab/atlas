/* Atlas Economic 0.10: the Public spending panel. The UK by function and sub-function (HM Treasury PESA), regions and
 * nations per head (Country and Regional Analysis), and the council in focus by service (MHCLG revenue outturn).
 * Opens with a written story of the numbers. Data: data/spending.js. */
(function () {
  "use strict";
  const esc = t => String(t == null ? "" : t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const bn = v => v == null ? "—" : "£" + (v / 1000).toLocaleString("en-GB", { maximumFractionDigits: v >= 100000 ? 0 : 1 }) + "bn";   // £ million in
  const the = n => /^(North|South|East|West|Yorkshire)/.test(n) ? "the " + n : n;
  const gbp = v => "£" + Math.round(v).toLocaleString("en-GB");
  const ST = { open: null };
  function spending(ctx, el) {
    const S = window.ATLAS_SPEND; if (!S || !S.uk || !S.uk.fn) { el.innerHTML = `<p class="ap-note">Spending data isn't loaded.</p>`; return; }
    const U = S.uk, y = U.years[U.years.length - 1], y0 = U.years[0], tme = U.tme[y], L = U.long || {}, now = L[y] || [], then = L[y0] || [];
    const fns = Object.entries(U.fn).map(([k, f]) => [k, f.tot[y] || 0, f.tot[y0] || 0, f]).sort((a, b) => b[1] - a[1]), svc = U.services[y];
    const real5 = now[1] && then[1] ? (now[1] / then[1] - 1) * 100 : null, gdp = now[2];
    // regions per head (latest CRA year)
    const C = S.cra, cy = C.years[C.years.length - 1], reg = Object.entries(C.tot).map(([k, o]) => { const p = ctx.popAt(k, cy.slice(0, 4) + "-07-01"); return [k, o[cy], p ? o[cy] * 1e6 / p : null]; }).filter(x => x[2]).sort((a, b) => b[2] - a[2]);
    const hi = reg[0], lo = reg[reg.length - 1], uk = reg.reduce((a, x) => a + x[1], 0) * 1e6 / reg.reduce((a, x) => a + ctx.popAt(x[0], cy.slice(0, 4) + "-07-01"), 0);
    const N = window.AtlasNarrative, longPts = Object.entries(L).filter(([k, v]) => v[1] && +k.slice(0, 4) <= +y.slice(0, 4)).map(([k, v]) => [+k.slice(0, 4), v[1] * 1000]);
    const story = `In ${y} the UK public sector spent <b>${bn(tme)}</b>${gdp ? `, ${gdp.toFixed(1)}% of everything the economy produced` : ""}. Spending on services came to ${bn(svc)}; the rest is accounting adjustments.
      <b>${esc(fns[0][0])}</b> (mostly state pensions and benefits) was the largest area at ${bn(fns[0][1])}, ${N ? N.share(fns[0][1], svc) : ""} of services, followed by ${esc(fns[1][0].toLowerCase())} (${bn(fns[1][1])}) and ${esc(fns[2][0].toLowerCase())} (${bn(fns[2][1])}).
      ${real5 != null ? `After inflation, total spending was ${Math.abs(real5).toFixed(1)}% ${real5 >= 0 ? "higher" : "lower"} than in ${y0}.` : ""}
      ${hi && lo ? `Spending that can be traced to where people live was highest per head in ${esc(the(ctx.nameOf(hi[0])))} (${gbp(hi[2])}) and lowest in ${esc(the(ctx.nameOf(lo[0])))} (${gbp(lo[2])}) in ${cy}, against ${gbp(uk)} across the UK.` : ""}`;
    const mx = fns[0][1];
    const sub = f => Object.entries(f.sub).map(([k, v]) => [k.replace(/^\d+\.\d+\s*/, ""), v[y] || 0]).filter(x => x[1] > 0).sort((a, b) => b[1] - a[1]);
    const code = ctx.focused, cs = code && ctx.councilSpend ? ctx.councilSpend(code) : null, LA = S.la;
    el.innerHTML = `<div class="nv"><p class="nv-story">${story}</p>
        <p class="nv-means"><b>What it tells us.</b> Where public money goes, by purpose (the UN's COFOG functions), for the whole public sector: central government, devolved governments, councils and public corporations.</p>
        <p class="nv-trust"><b>How far to trust it.</b> These are outturns, the audited spending, not plans. Regional figures cover only spending that benefits people in a place (about 85% of the total); defence, debt interest and aid can't be placed. Current prices unless it says real terms.</p></div>
      <h4>By function, ${esc(y)} <small>(click one for the detail)</small></h4>
      <table class="tr-t">${fns.map(([k, v, v0, f]) => `<tr data-spf="${esc(k)}"><td class="tr-n">${esc(k)}</td><td class="tr-b"><i style="width:${(100 * v / mx).toFixed(1)}%;background:#13876b"></i></td><td class="num">${bn(v)}</td><td class="num tr-x">${N ? N.change(v0, v) : ""} since ${esc(y0)}</td></tr>
        ${ST.open === k ? sub(f).map(([s, sv]) => `<tr class="sp-sub"><td class="tr-n">${esc(s)}</td><td class="tr-b"><i style="width:${(100 * sv / mx).toFixed(1)}%;background:#7fc4ae"></i></td><td class="num">${bn(sv)}</td><td></td></tr>`).join("") : ""}`).join("")}</table>
      ${longPts.length > 5 ? `<h4>Total spending since ${longPts[0][0]}, in today's prices</h4><div class="tr-chart">${ctx.CH.line([{ name: "Total managed expenditure (real terms)", colour: "#13876b", pts: longPts }], { w: 440, h: 140, vfmt: v => "£" + Math.round(v / 1000) + "bn" })}</div><p class="ap-note">${N ? N.trend(longPts, v => "£" + Math.round(v / 1000) + "bn", "Real-terms spending") : ""}</p>` : ""}
      <h4>Per person, by region and nation, ${esc(cy)}</h4>
      <table class="tr-t">${reg.map(([k, t, ph]) => `<tr data-spgo="${k}"><td class="tr-n">${esc(ctx.nameOf(k))}</td><td class="tr-b"><i style="width:${(100 * ph / hi[2]).toFixed(1)}%;background:#13876b"></i></td><td class="num">${gbp(ph)}</td><td class="num tr-x">${bn(t)}</td></tr>`).join("")}</table>
      ${cs ? `<h4>${esc(ctx.nameOf(code))} council, ${esc(LA.year)}</h4><p class="ap-note">Net day-to-day spending on services, after fees, charges and specific grants such as the schools grant: ${bn(cs.v.reduce((a, b) => a + b, 0))}${cs.est ? `, including a population share of ${esc(cs.countyName)}'s` : ""}.</p>
        <table class="tr-t">${cs.v.map((v, i) => [LA.services[i], v]).filter(x => x[1] > 0).sort((a, b) => b[1] - a[1]).map(([n, v], i, a) => `<tr><td class="tr-n">${esc(n)}</td><td class="tr-b"><i style="width:${(100 * v / a[0][1]).toFixed(1)}%;background:#457b9d"></i></td><td class="num">£${v.toFixed(0)}m</td></tr>`).join("")}</table>`
        : `<p class="ap-note">Click a council in England to see what it spends on each service.</p>`}
      <div class="ap-row"><button class="btn sm" data-spmap="spend_ph">Map spending per head</button><button class="btn sm" data-spmap="spd_fn_share">Map one function's share</button><button class="btn sm" data-spmap="council_spend_ph">Map council spending</button></div>
      <p class="ap-note">${esc(S.sources.uk)}; ${esc(S.sources.cra)}; ${esc(S.sources.la)}. OGL v3.0.</p>`;
    el.onclick = e => {
      const f = e.target.closest("[data-spf]"); if (f) { ST.open = ST.open === f.dataset.spf ? null : f.dataset.spf; spending(ctx, el); return; }
      const g = e.target.closest("[data-spgo]"); if (g) { ctx.focus(g.dataset.spgo); return; }
      const m = e.target.closest("[data-spmap]"); if (m) { const id = m.dataset.spmap; ctx.setLevel(id === "council_spend_ph" ? "council" : "region"); ctx.mapOnly([id]); }
    };
  }
  window.AtlasSpending = { panel: spending };
})();
