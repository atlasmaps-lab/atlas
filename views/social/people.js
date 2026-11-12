/* Atlas Social 0.10: the Migration and Housing & support panels, each opening with the story of its numbers.
 * Data: data/people.js (ONS, Home Office, MHCLG, DWP). */
(function () {
  "use strict";
  const esc = t => String(t == null ? "" : t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const k = v => v == null ? "—" : Math.abs(v) >= 1e6 ? (v / 1e6).toFixed(2) + " million" : Math.round(v).toLocaleString("en-GB");
  const thou = v => v == null ? "—" : (Math.abs(v) >= 1000 ? Math.round(v / 1000).toLocaleString("en-GB") + ",000" : Math.round(v).toLocaleString("en-GB"));
  const pk = p => { const m = /YE (\w{3}) (\d{2})/.exec(p); return m ? 2000 + +m[2] + ["Mar", "Jun", "Sep", "Dec"].indexOf(m[1]) / 4 : 0; };
  const nice = p => p.replace(/^YE /, "the year to ").replace(/ (\d{2})( P)?$/, (x, y, pr) => " 20" + y + (pr ? " (provisional)" : "")).replace("Mar", "March").replace("Jun", "June").replace("Sep", "September").replace("Dec", "December");
  function migration(ctx, el) {
    const P = window.ATLAS_PEOPLE; if (!P || !P.ltim || !P.ltim.nat) { el.innerHTML = "<p class='ap-note'>Migration data isn't loaded.</p>"; return; }
    const L = P.ltim, net = L.nat["net migration"] || {}, imm = L.nat["immigration"] || {}, emi = L.nat["emigration"] || {}, all = net["All Nationalities"] || {};
    const periods = Object.keys(all).sort((a, b) => pk(a) - pk(b)), last = periods[periods.length - 1];
    let peak = periods[0]; periods.forEach(p => { if (all[p] > all[peak]) peak = p; });
    const yearAgo = periods.find(p => Math.abs(pk(p) - (pk(last) - 1)) < 0.01);
    const R = L.reason && L.reason["Non-EU+"] && L.reason["Non-EU+"].immigration || {}, rl = Object.entries(R).filter(([r]) => !/^All reasons/i.test(r) && !/:/.test(r)).map(([r, s]) => [r.replace(/^All (\w+)( Related)?$/i, "$1"), s[last] || 0]).filter(x => x[1] > 0).sort((a, b) => b[1] - a[1]);
    const code = ctx.focused || ctx.UKC, j = (P.myeb.years || []).length - 1, my = P.myeb.v && P.myeb.v[code];
    const story = `Net migration to the UK (people arriving to live for a year or more, minus people leaving) was <b>${thou(all[last])}</b> in ${esc(nice(last))}: ${thou((imm["All Nationalities"] || {})[last])} arrived and ${thou((emi["All Nationalities"] || {})[last])} left.
      It peaked at ${thou(all[peak])} in ${esc(nice(peak))}${yearAgo ? `; a year before the latest figure it was ${thou(all[yearAgo])}, so it ${all[last] < all[yearAgo] ? "fell" : "rose"} by ${Math.abs(Math.round((all[last] / all[yearAgo] - 1) * 100))}% in a year` : ""}.
      British nationals were net ${(net.British || {})[last] < 0 ? "leavers" : "arrivals"} (${thou((net.British || {})[last])}).${rl.length ? ` Among people from outside the EU, the main reason for coming was ${esc(rl[0][0].toLowerCase())} (${thou(rl[0][1])}), then ${esc(rl[1][0].toLowerCase())} (${thou(rl[1][1])}).` : ""}`;
    const series = ["All Nationalities", "British", "EU+", "Non-EU+"].map((g, i) => ({ name: g === "All Nationalities" ? "All" : g, colour: ["#1f2a2e", "#2b6cb0", "#7b4fa6", "#d4a017"][i], pts: Object.entries(net[g] || {}).map(([p, v]) => [pk(p), v]).sort((a, b) => a[0] - b[0]) }));
    let place = "";
    if (code !== ctx.UKC && my) {
      const pop = my.population[j], ii = my.international_in[j], io = my.international_out[j], ni = my.internal_net[j];
      place = `<h4>${esc(ctx.nameOf(code))}, year to June ${P.myeb.years[j]}</h4><p class="nv-story">${thou(ii)} people arrived from abroad and ${thou(io)} left for abroad (net ${ii - io > 0 ? "+" : ""}${thou(ii - io)}, ${(1000 * (ii - io) / pop).toFixed(1)} per 1,000 residents). Moves within the UK ${ni >= 0 ? "added" : "took away"} ${thou(Math.abs(ni))} people.</p>`;
    }
    el.innerHTML = `<div class="nv"><p class="nv-story">${story}</p><p class="nv-means"><b>What it tells us.</b> How many people move to and from the UK to live for at least a year, by nationality and reason, and how that is changing.</p>
        <p class="nv-trust">These are provisional estimates built from Home Office visa and travel records; ONS revises them, sometimes by tens of thousands, as people's actual length of stay becomes known. Local figures are modelled.</p></div>
      <h4>Net migration by nationality</h4><div class="tr-chart">${ctx.CH.line(series, { w: 440, h: 160, vfmt: v => Math.round(v / 1000) + "k", xfmt: x => String(Math.floor(x)) })}</div>
      ${rl.length ? `<h4>Why people from outside the EU came, ${esc(nice(last))}</h4><table class="tr-t">${rl.slice(0, 8).map(([r, v]) => `<tr><td class="tr-n">${esc(r)}</td><td class="tr-b"><i style="width:${(100 * v / rl[0][1]).toFixed(1)}%;background:#7b4fa6"></i></td><td class="num">${thou(v)}</td></tr>`).join("")}</table>` : ""}
      ${place || `<p class="ap-note">Click a council to see its arrivals and departures.</p>`}
      <div class="ap-row"><button class="btn sm" data-pmap="mig_intl_net">Map net international migration</button><button class="btn sm" data-pmap="mig_internal_net">Map moves within the UK</button><button class="btn sm" data-pmap="asylum_support">Map asylum support</button></div>
      <p class="ap-note">${esc(P.sources.ltim)}; ${esc(P.sources.myeb)}; ${esc(P.sources.asylum)}. OGL v3.0.</p>`;
    el.onclick = e => { const b = e.target.closest("[data-pmap]"); if (b) { ctx.setLevel("council"); ctx.mapOnly([b.dataset.pmap]); } };
  }
  function support(ctx, el) {
    const P = window.ATLAS_PEOPLE; if (!P) { el.innerHTML = "<p class='ap-note'>Not loaded.</p>"; return; }
    const F = P.fin, H = P.housing, code = ctx.focused || ctx.UKC, name = code === ctx.UKC ? "the UK" : ctx.nameOf(code);
    const m = F.months, cr = F.claim_rate[code] || F.claim_rate[ctx.UKC] || [], cn = F.claim[code] || F.claim[ctx.UKC] || [], li = m.length - 1;
    const ci = (F.cilif[code] || F.cilif_ward[code] || F.cilif.K02000001 || [[], []]), yrs = F.cilif_years || [];
    const lah = H.la_series && (H.la_series[code] || H.la_series.E92000001), lay = lah ? Object.keys(lah).sort() : [];
    const N = window.AtlasNarrative;
    const s = [];
    if (cr[li] != null) s.push(`In ${esc(m[li])}, <b>${k(cn[li])}</b> people in ${esc(name)} claimed out-of-work benefits, ${cr[li].toFixed(1)}% of working-age residents${cr[li - 12] != null ? `, against ${cr[li - 12].toFixed(1)}% a year earlier` : ""}.`);
    if (ci[1] && ci[1].length) { const a = ci[1][0], b = ci[1][ci[1].length - 1], pc = v => (v <= 1 ? v * 100 : v).toFixed(1) + "%"; s.push(`${pc(b)} of children lived in low-income families after housing costs in the year to March ${yrs[yrs.length - 1]}${a != null ? ` (${pc(a)} in the year to March ${yrs[0]})` : ""}.`); }
    if (lay.length > 5) { const y0 = lay[0], y1 = lay[lay.length - 1]; s.push(`${code === ctx.UKC || !H.la_series[code] ? "England's councils" : "The council"} owned ${k(lah[y0])} homes in ${y0} and ${k(lah[y1])} in ${y1}, ${N ? N.change(lah[y0], lah[y1]) : ""}: Right to Buy sales and transfers to housing associations.`); }
    const lahPts = lay.map(y => [+y, lah[y]]), w = H.waiting && (H.waiting[code] || H.waiting.E92000001), wy = w ? Object.keys(w).sort() : [];
    el.innerHTML = `<div class="nv"><p class="nv-story">${s.join(" ") || "Click a council to see its figures."}</p>
        <p class="nv-means"><b>What it tells us.</b> Who is out of work and claiming, how many children grow up on low incomes, and how much social housing there is and how many are waiting for it.</p>
        <p class="nv-trust">The claimant count includes some people in low-paid work who must look for more hours, so it isn't the unemployment rate. Child poverty figures are local estimates calibrated to a national survey. Councils set their own rules for housing registers, so waiting lists aren't directly comparable. Benefit award levels by council need DWP's Stat-Xplore${P.sx ? "" : ", which Atlas will add once an API key is set"}.</p></div>
      ${m.length ? `<h4>Claimant count, ${esc(name)}</h4><div class="tr-chart">${ctx.CH.line([{ name: "Share of 16-64s claiming", colour: "#d0701c", pts: cr.map((v, i) => [2000 + i, v]).filter(p => p[1] != null).map(([i, v], n) => [new Date(m[n] + " 15").getFullYear() + new Date(m[n] + " 15").getMonth() / 12, v]) }], { w: 440, h: 130, vfmt: v => v.toFixed(1) + "%", xfmt: x => String(Math.floor(x)) })}</div>` : ""}
      ${lahPts.length ? `<h4>Council-owned homes since ${lay[0]}</h4><div class="tr-chart">${ctx.CH.line([{ name: "Council homes", colour: "#b5651d", pts: lahPts }], { w: 440, h: 130, vfmt: v => v >= 1e6 ? (v / 1e6).toFixed(1) + "m" : Math.round(v / 1000) + "k", xfmt: x => String(x) })}</div>` : ""}
      ${wy.length ? `<p class="ap-note">Households on the housing register: ${k(w[wy[wy.length - 1]])} in ${wy[wy.length - 1]}${w[wy[0]] ? ` (${k(w[wy[0]])} in ${wy[0]})` : ""}.</p>` : ""}
      <div class="ap-row"><button class="btn sm" data-pmap="claimant_rate">Map the claimant count</button><button class="btn sm" data-pmap="child_poverty">Map child poverty</button><button class="btn sm" data-pmap="social_homes_pct">Map social homes</button><button class="btn sm" data-pmap="waiting_list">Map waiting lists</button></div>
      <p class="ap-note">${esc(P.sources.claim)}; ${esc(P.sources.cilif)}; ${esc(P.sources.housing)}; ${esc(P.sources.dhp)}. OGL v3.0.</p>`;
    el.onclick = e => { const b = e.target.closest("[data-pmap]"); if (b) { ctx.setLevel("council"); ctx.mapOnly([b.dataset.pmap]); } };
  }
  window.AtlasPeople = { migration, support };
})();
