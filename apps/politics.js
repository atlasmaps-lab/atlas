/* Atlas Politics (1.8): the Political perspective as its own app (index.html#app=politics), on the 1.7 election data.
 * Election view (hex map, seat bar, results table), a uniform-swing calculator, a seat explorer, councils over time,
 * referendums, and the protest list.
 */
(function () {
  "use strict";
  const MAIN = ["lab", "con", "ref", "ld", "grn", "snp", "pc"];
  const pc1 = v => v == null || !isFinite(v) ? "—" : (100 * v).toFixed(1) + "%";
  const NATIONS = [["", "All of the UK"], ["E92000001", "England"], ["S92000003", "Scotland"], ["W92000004", "Wales"], ["N92000002", "Northern Ireland"]];
  const winnerOf = r => r && r.cl && r.cl[0] ? r.cl[0][0] : null;
  const seats = ctx => ctx.allCodesAt("constituency");
  function seatBar(ctx, r) {
    const s = Object.entries(r.seats || {}).sort((a, b) => b[1] - a[1]), n = r.n || s.reduce((a, x) => a + x[1], 0), maj = Math.floor(n / 2) + 1;
    return `<div class="seatbar">${s.map(([p, k]) => `<i style="flex:${k};background:${ctx.partyCol(p)}" title="${ctx.esc(ctx.partyName(p))}: ${k}"></i>`).join("")}</div>
      <div class="ap-row">${s.slice(0, 8).map(([p, k]) => `<span><i class="sw" style="background:${ctx.partyCol(p)}"></i>${ctx.esc(ctx.partyName(p))} <b>${k}</b></span>`).join("")}</div><p class="ap-note">${n} seats; ${maj} for a majority.</p>`;
  }

  const F = { nation: "", region: "", party: "" };
  function election(ctx, el) {
    const r = ctx.resultFor(ctx.UKC, ctx.date);
    if (!r) { el.innerHTML = `<p class="ap-note">No general election on or before ${ctx.esc(ctx.longDate(ctx.date))} in the data (it starts in 1997).</p>`; return; }
    const codes = seats(ctx), rows = codes.map(c => { const x = ctx.resultFor(c, ctx.date), a = ctx.areaOf(c) || []; return x && !x.agg ? { c, r: x, nat: a[0], reg: a[1], w: winnerOf(x) } : null; }).filter(Boolean);
    const regions = [...new Set(rows.map(x => x.reg).filter(Boolean))].sort((a, b) => ctx.nameOf(a).localeCompare(ctx.nameOf(b))), parties = [...new Set(rows.map(x => x.w))].sort((a, b) => ctx.partyName(a).localeCompare(ctx.partyName(b)));
    const shown = rows.filter(x => (!F.nation || x.nat === F.nation) && (!F.region || x.reg === F.region) && (!F.party || x.w === F.party));
    el.innerHTML = `<h4>${ctx.esc(r.e.label)}</h4>${seatBar(ctx, r)}
      <div class="ap-row"><select data-f="nation">${NATIONS.map(([k, l]) => `<option value="${k}" ${F.nation === k ? "selected" : ""}>${l}</option>`).join("")}</select>
        <select data-f="region"><option value="">All regions</option>${regions.map(k => `<option value="${k}" ${F.region === k ? "selected" : ""}>${ctx.esc(ctx.nameOf(k))}</option>`).join("")}</select>
        <select data-f="party"><option value="">Every winning party</option>${parties.map(p => `<option value="${p}" ${F.party === p ? "selected" : ""}>${ctx.esc(ctx.partyName(p))}</option>`).join("")}</select></div>
      <div class="tscroll"><table class="cmp"><thead><tr><th>Seat</th><th>Winner</th><th>Share</th><th>Majority</th><th>Turnout</th></tr></thead><tbody>
      ${shown.map(x => { const cl = x.r.cl, mj = cl[1] ? cl[0][2] - cl[1][2] : null, to = x.r.electorate ? x.r.valid / x.r.electorate : null; return `<tr data-code="${x.c}"><th>${ctx.esc(ctx.nameOf(x.c))}${x.r.est ? ' <sup class="est">est.</sup>' : ""}</th><td><i class="sw" style="background:${ctx.partyCol(x.w)}"></i>${ctx.esc(ctx.partyName(x.w))}</td><td class="num" data-v="${cl[0][2]}">${pc1(cl[0][2])}</td><td class="num" data-v="${mj ?? ""}">${pc1(mj)}</td><td class="num" data-v="${to ?? ""}">${pc1(to)}</td></tr>`; }).join("")}</tbody></table></div>
      <p class="ap-note">${shown.length} of ${rows.length} seats. Click a heading to sort; double-click a row to focus the seat. Turnout = valid votes ÷ electorate.</p>
      <div class="ap-row"><button class="btn sm" data-pmap>Winners on the hex map</button><button class="btn sm" data-popen="swing">Swingometer</button><button class="btn sm" data-popen="seat">Seat explorer</button></div>`;
    el.onchange = e => { const k = e.target.dataset.f; if (k) { F[k] = e.target.value; if (k === "nation") F.region = ""; election(ctx, el); } };
    el.onclick = e => { if (e.target.closest("[data-pmap]")) { ctx.setHex(true); ctx.mapOnly(["ge_winner"]); } const o = e.target.closest("[data-popen]"); if (o) ctx.openPanel(o.dataset.popen); };
  }

  // uniform national swing: every seat's share for a party moves by the change in that party's national share
  const SW = { to: null, base: null };
  function swing(ctx, el) {
    const day = (ctx.GE_DAYS.filter(d => d <= ctx.date).pop()) || ctx.GE_DAYS[ctx.GE_DAYS.length - 1], gb = ["E92000001", "S92000003", "W92000004"].map(c => ctx.resultFor(c, day)).filter(Boolean);
    const tot = gb.reduce((a, r) => a + r.t.total, 0), nat = {}; gb.forEach(r => Object.entries(r.t.by).forEach(([p, v]) => { nat[p] = (nat[p] || 0) + v / tot; }));
    if (!SW.to || SW.base !== day) { SW.base = day; SW.to = Object.fromEntries(MAIN.map(p => [p, +(100 * (nat[p] || 0)).toFixed(1)])); }
    const project = () => {
      const out = new Map(), count = {};
      seats(ctx).forEach(c => { const r = ctx.resultFor(c, day); if (!r || r.agg || r.e.day !== day) return; const a = ctx.areaOf(c) || [];
        let w = winnerOf(r);
        if (a[0] !== "N92000002") { const sh = {}; r.t.list.forEach(([p, , s]) => { sh[p] = s; }); MAIN.forEach(p => { if (sh[p] != null || SW.to[p] / 100 > (nat[p] || 0)) sh[p] = Math.max(0, (sh[p] || 0) + SW.to[p] / 100 - (nat[p] || 0)); }); w = Object.keys(sh).sort((x, y) => sh[y] - sh[x])[0]; }
        out.set(c, w); count[w] = (count[w] || 0) + 1; });
      return { out, count };
    };
    const P = project();
    ctx.defineMetric({ id: "uns_winner", p: "political", group: "Westminster elections", label: "Projected winner (uniform swing)", scale: "nominal", nature: "category", temporal: "static", levels: ["constituency"],
      desc: "The Swingometer's projection: every seat's party shares move by the national change", how: "Each seat's share for a party + (new national share − actual national share), floored at zero; the largest share wins. Northern Ireland unchanged",
      colour: ctx.partyCol, catName: ctx.partyName, cats: () => Object.keys(ctx.PARTY), get: c => SW.proj && SW.proj.has(c) ? { v: SW.proj.get(c), text: ctx.partyName(SW.proj.get(c)) + " (projected)", est: true, estWhy: "A projection, not a result" } : null });
    SW.proj = P.out;
    const sum = MAIN.reduce((a, p) => a + (+SW.to[p] || 0), 0);
    el.innerHTML = `<p class="ap-warn">Uniform national swing is a simple model: it assumes every seat moves by the same amount as the nation. Real elections don't (tactical voting, local candidates, new parties). Base: the ${ctx.esc(day.slice(0, 4))} general election, Great Britain shares.</p>
      <div class="ap-form">${MAIN.map(p => `<label><i class="sw" style="background:${ctx.partyCol(p)}"></i> ${ctx.esc(ctx.partyName(p))} <small>(was ${pc1(nat[p] || 0)})</small></label><input type="number" step="0.5" min="0" max="80" data-sw="${p}" value="${SW.to[p]}">`).join("")}</div>
      <p class="ap-note">These parties add up to ${sum.toFixed(1)}% (others: ${(100 - sum).toFixed(1)}%).</p>
      <h4>Projected seats (Great Britain changes; Northern Ireland as it was)</h4>${seatBar(ctx, { seats: P.count, n: P.out.size })}
      <div class="ap-row"><button class="btn sm" data-swmap>Show the projection on the hex map</button><button class="btn sm" data-swreset>Back to the result</button></div>`;
    el.oninput = e => { const p = e.target.dataset.sw; if (p) { SW.to[p] = parseFloat(e.target.value) || 0; clearTimeout(SW.t); SW.t = setTimeout(() => { swing(ctx, el); ctx.repaint(); }, 250); } };
    el.onclick = e => { if (e.target.closest("[data-swmap]")) { ctx.setDate(day > ctx.date ? day : ctx.date); ctx.setHex(true); ctx.mapOnly(["uns_winner"]); } if (e.target.closest("[data-swreset]")) { SW.to = null; swing(ctx, el); ctx.repaint(); } };
  }

  function seat(ctx, el) {
    const cur = ctx.focus && ctx.P[ctx.focus] && ctx.P[ctx.focus].level === "constituency" ? ctx.focus : seat.code;
    el.innerHTML = `<div class="ap-row"><input data-sq placeholder="Find a constituency…" value="" style="flex:1"><ul class="sq-hits"></ul></div><div class="sq-body"></div>`;
    const show = code => {
      seat.code = code; const rs = ctx.resultsOf(code), spans = (ctx.SPANS[code] || []);
      if (!rs.length) { el.querySelector(".sq-body").innerHTML = `<p class="ap-note">No results for this seat.</p>`; return; }
      const rows = rs.map((r, i) => { const prev = rs.slice(0, i).reverse().find(q => q.e.kind !== "by"), w = winnerOf(r), mj = r.cl[1] ? r.cl[0][2] - r.cl[1][2] : null, to = r.electorate ? r.valid / r.electorate : null;
        const sw = prev && w ? ((r.t.by[w] || 0) / r.t.total - (prev.t.by[w] || 0) / prev.t.total) : null;
        return `<tr><th>${ctx.esc(r.e.label)}${r.e.kind === "notional" ? " <sup class='est'>est.</sup>" : ""}</th><td><i class="sw" style="background:${ctx.partyCol(w)}"></i>${ctx.esc(ctx.partyName(w))}</td><td class="num">${pc1(r.cl[0][2])}</td><td class="num">${pc1(mj)}</td><td class="num">${pc1(to)}</td><td class="num">${sw == null ? "—" : (sw >= 0 ? "+" : "") + (100 * sw).toFixed(1)}</td></tr>`; }).join("");
      el.querySelector(".sq-body").innerHTML = `<h4>${ctx.esc(ctx.nameOf(code))}</h4><div class="tscroll"><table class="cmp"><thead><tr><th>Election</th><th>Winner</th><th>Share</th><th>Majority</th><th>Turnout</th><th title="Change in the winner's share since the previous general election (points)">Winner's change</th></tr></thead><tbody>${rows}</tbody></table></div>
        <h4>MPs</h4><ul>${spans.slice().reverse().map(x => `<li><i class="sw" style="background:${ctx.partyCol(x[2])}"></i>${ctx.esc(x[3])} · ${ctx.esc(ctx.partyName(x[2]))} <small>${x[0].slice(0, 4)}–${x[1] ? x[1].slice(0, 4) : "now"}</small></li>`).join("")}</ul>
        <p class="ap-note">This seat's own record, within its boundary set. Across the 2010 and 2024 reviews, the “before” result is the Library's notional one (est.). Predecessor seats under other boundaries are separate seats.</p>
        <div class="ap-row"><button class="btn sm" data-sqfocus>Focus on the map</button></div>`;
    };
    if (cur) show(cur);
    el.oninput = e => { if (!e.target.matches("[data-sq]")) return; const q = e.target.value.trim().toLowerCase(), hits = q.length < 2 ? [] : Object.keys(ctx.P).filter(c => ctx.P[c].level === "constituency" && ctx.nameOf(c).toLowerCase().includes(q)).slice(0, 12);
      el.querySelector(".sq-hits").innerHTML = hits.map(c => `<li data-sqc="${c}">${ctx.esc(ctx.nameOf(c))}<small> ${ctx.P[c].to ? ctx.P[c].from.slice(0, 4) + "–" + ctx.P[c].to.slice(0, 4) : "2024 seats"}</small></li>`).join(""); };
    el.onclick = e => { const h = e.target.closest("[data-sqc]"); if (h) { el.querySelector(".sq-hits").innerHTML = ""; show(h.dataset.sqc); } if (e.target.closest("[data-sqfocus]") && seat.code) ctx.focus(seat.code); };
  }

  function councils(ctx, el) {
    const L = ctx.LOC || {}, list = Object.keys(L.comp || {}).filter(c => ctx.P[c]).sort((a, b) => ctx.nameOf(a).localeCompare(ctx.nameOf(b)));
    const cur = councils.code && L.comp[councils.code] ? councils.code : ctx.focus && L.comp && L.comp[ctx.focus] ? ctx.focus : list.find(c => /Manchester/.test(ctx.nameOf(c))) || list[0];
    councils.code = cur; const comp = (L.comp || {})[cur] || [];
    const parties = [...new Set(comp.flatMap(x => Object.keys(x[2])))].sort((a, b) => comp.reduce((s, x) => s + (x[2][b] || 0), 0) - comp.reduce((s, x) => s + (x[2][a] || 0), 0));
    const Wd = 420, H = 150, y0 = comp.length ? comp[0][0] : 0, y1 = comp.length ? comp[comp.length - 1][0] : 1, X = y => 30 + (y - y0) / ((y1 - y0) || 1) * (Wd - 40);
    let base = comp.map(() => 0); const areas = parties.map(p => { const top = comp.map((x, i) => base[i] + (x[2][p] || 0) / x[1]); const d = "M" + comp.map((x, i) => `${X(x[0]).toFixed(1)} ${(H - 18 - top[i] * (H - 28)).toFixed(1)}`).join("L") + "L" + comp.slice().reverse().map((x, j) => { const i = comp.length - 1 - j; return `${X(x[0]).toFixed(1)} ${(H - 18 - base[i] * (H - 28)).toFixed(1)}`; }).join("L") + "Z"; base = top; return `<path d="${d}" fill="${ctx.partyCol(p)}" opacity=".9"><title>${ctx.esc(ctx.partyName(p))}</title></path>`; }).join("");
    const ctl = (ctx.POL.control[cur] || []), cy0 = 1974, cy1 = +ctx.today.slice(0, 4), CX = d => 30 + ((+d.slice(0, 4) + (+d.slice(5, 7) - 1) / 12) - cy0) / (cy1 - cy0) * (Wd - 40);
    const bd = L.bandd && L.bandd[cur] ? Object.entries(L.bandd[cur])[0] : null, bpts = bd ? bd[1].map((v, i) => [+bd[0] + i, v]).filter(p => p[1] != null) : [];
    el.innerHTML = `<div class="ap-row"><select data-cc>${list.map(c => `<option value="${c}" ${c === cur ? "selected" : ""}>${ctx.esc(ctx.nameOf(c))}</option>`).join("")}</select></div>
      <h4>Seats by party, ${y0}–${y1}</h4>${comp.length ? `<svg viewBox="0 0 ${Wd} ${H}" class="ap-svg">${areas}<text x="30" y="${H - 3}">${y0}</text><text x="${Wd - 10}" y="${H - 3}" text-anchor="end">${y1}</text></svg><div class="ap-row">${parties.slice(0, 8).map(p => `<span><i class="sw" style="background:${ctx.partyCol(p)}"></i>${ctx.esc(ctx.partyName(p))}</span>`).join("")}</div>` : `<p class="ap-note">No composition record.</p>`}
      <h4>Control</h4>${ctl.length ? `<svg viewBox="0 0 ${Wd} 34" class="ap-svg">${ctl.map(s => `<rect x="${CX(s[0]).toFixed(1)}" y="4" width="${Math.max(1, CX(s[1] || ctx.today) - CX(s[0])).toFixed(1)}" height="18" fill="${ctx.partyCol(s[2])}"><title>${ctx.esc(ctx.partyName(s[2]))} ${s[0].slice(0, 4)}–${s[1] ? s[1].slice(0, 4) : "now"}</title></rect>`).join("")}<text x="30" y="33">1974</text><text x="${Wd - 10}" y="33" text-anchor="end">${cy1}</text></svg>` : `<p class="ap-note">No control record.</p>`}
      <h4>Council tax, Band D</h4>${bpts.length > 1 ? ctx.CH.line([{ name: ctx.nameOf(cur), colour: "#7b4fa6", pts: bpts }], { w: Wd, h: 150, vfmt: v => "£" + Math.round(v).toLocaleString("en-GB") }) : `<p class="ap-note">Not available for this council${cur.startsWith("N") ? " (Northern Ireland has domestic rates)" : ""}.</p>`}
      <p class="ap-note">Sources: Open Council Data UK (CC BY-SA 4.0); council control from Wikipedia; Band D from MHCLG, Scottish Government and StatsWales.</p>`;
    el.onchange = e => { if (e.target.matches("[data-cc]")) { councils.code = e.target.value; councils(ctx, el); } };
  }

  function referendums(ctx, el) {
    const uk = ctx.M.eu_leave && ctx.M.eu_leave.get(ctx.UKC, "2016-06-24");
    el.innerHTML = `<h4>EU referendum, 23 June 2016</h4><p>${uk ? `Leave <b>${ctx.esc(uk.text)}</b> across the UK.` : ""}</p>
      <div class="ap-row"><button class="btn sm" data-ref="council">Leave share by council (counted)</button><button class="btn sm" data-ref="pcon">By constituency (estimates)</button></div>
      <p class="ap-warn">Constituency figures are Chris Hanretty's estimates (the referendum was counted by council), marked est. and hatched on the map, except where the BBC obtained ward counts.</p>
      <p class="ap-note">Scottish independence referendum 2014: not available (the official per-council results are behind browser checks; see the 1.7 notes).</p>`;
    el.onclick = e => { const b = e.target.closest("[data-ref]"); if (!b) return; ctx.setDate("2016-06-24"); ctx.setHex(false); if (b.dataset.ref === "council") { ctx.mapOnly(["eu_leave"]); ctx.setLevel("council"); } else { ctx.mapOnly(["eu_leave_est_pcon"]); ctx.setLevel("constituency"); } };
  }
  function protests(ctx, el) {
    el.innerHTML = `<p>Notable protests since 1974, checked to be in the UK: the list follows the time bar and the area in focus.</p><div class="ap-row"><button class="btn sm" data-pl>Open the protest list</button><button class="btn sm" data-pm>Protests on the map</button></div>`;
    el.onclick = e => { if (e.target.closest("[data-pl]")) ctx.openProtestList(); if (e.target.closest("[data-pm]")) { ctx.setHex(false); ctx.mapOnly(["control", "protest_events"]); ctx.setLevel("auto"); } };
  }

  window.AtlasApps && AtlasApps.register({
    id: "politics", name: "Atlas Politics", perspective: "political", accent: "#7b4fa6", dataNeeds: ["ATLAS_POL", "ATLAS_EL"],
    init(ctx) { ctx.setHex(true); ctx.mapOnly(["ge_winner"]); ctx.openPanel("election"); },
    panels: [
      { id: "election", title: "Election", live: true, render: election, min: { w: 400, h: 300 }, def: () => ({ x: innerWidth - 460 - 16, y: 56, w: 460, h: Math.round(innerHeight * 0.7) }) },
      { id: "seat", title: "Seat explorer", render: seat, min: { w: 400, h: 280 } },
      { id: "councils", title: "Councils", render: councils, min: { w: 460, h: 320 } },
      { id: "referendums", title: "Referendums", render: referendums },
      { id: "protests", title: "Protests", render: protests },
    ],
    tools: [{ id: "swing", title: "Swingometer", blurb: "Uniform national swing: move the shares, see projected seats", render: swing, min: { w: 380, h: 320 } }],
  });
})();
