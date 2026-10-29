/* Atlas Politics (1.8, reworked in 0.7.1): the Political perspective as its own app (index.html#app=politics).
 * Panels: Election (colours the map by winner), Seat explorer (every seat listed; a written profile, results, MPs,
 * projection and news for each), Councils (control, make-up, council tax, the place in numbers, actions), Projection
 * (polling average → seats), News (official feeds, tagged by place, party and topic), Referendums, Protests, and the
 * Swingometer (what-if national shares, with an explanation of what it is).
 * Every panel must earn its space: it shows something you can't get from the map alone and lets you act on it.
 */
(function () {
  "use strict";
  const MAIN = ["lab", "con", "ref", "ld", "grn", "snp", "pc"];
  const pc1 = v => v == null || !isFinite(v) ? "—" : (100 * v).toFixed(1) + "%";
  const NATIONS = [["", "All of the UK"], ["E92000001", "England"], ["S92000003", "Scotland"], ["W92000004", "Wales"], ["N92000002", "Northern Ireland"]];
  const winnerOf = r => r && r.cl && r.cl[0] ? r.cl[0][0] : null;
  const seats = ctx => ctx.allCodesAt("constituency");
  const marginClass = m => m == null ? "" : m < 0.05 ? "ultra-marginal" : m < 0.10 ? "marginal" : m < 0.20 ? "fairly safe" : "safe";
  const wikiUrl = name => "https://en.wikipedia.org/wiki/" + encodeURIComponent((name + " (UK Parliament constituency)").replace(/ /g, "_"));
  function seatBar(ctx, r) {
    const s = Object.entries(r.seats || {}).sort((a, b) => b[1] - a[1]), n = r.n || s.reduce((a, x) => a + x[1], 0), maj = Math.floor(n / 2) + 1;
    return `<div class="seatbar">${s.map(([p, k]) => `<i style="flex:${k};background:${ctx.partyCol(p)}" title="${ctx.esc(ctx.partyName(p))}: ${k}"></i>`).join("")}</div>
      <div class="ap-row">${s.slice(0, 8).map(([p, k]) => `<span><i class="sw" style="background:${ctx.partyCol(p)}"></i>${ctx.esc(ctx.partyName(p))} <b>${k}</b></span>`).join("")}</div><p class="ap-note">${n} seats; ${maj} for a majority.</p>`;
  }
  // news items that mention a place (or anything inside it)
  function newsFor(ctx, codes, n) {
    const N = ctx.NEWS; if (!N) return [];
    const set = new Set(codes); return N.items.filter(it => it.pl.some(c => set.has(c))).slice(0, n || 6);
  }
  const newsList = (ctx, items, empty) => items.length ? `<ul class="nw-list">${items.map(it => newsItem(ctx, it)).join("")}</ul>` : `<p class="ap-note">${empty || "No news items mention this place yet."}</p>`;
  function newsItem(ctx, it) {
    return `<li class="nw-it"><div class="nw-meta">${ctx.esc(ctx.longDate(it.d))} · ${ctx.esc(it.s)}</div><a href="${ctx.esc(it.u)}" target="_blank" rel="noopener">${ctx.esc(it.t)}</a>${it.x ? `<p>${ctx.esc(it.x)}</p>` : ""}
      <div class="nw-tags">${it.pl.slice(0, 5).map(c => ctx.P[c] ? `<button class="nw-tag pl" data-nwgo="${c}" title="Show on the map">${ctx.esc(ctx.nameOf(c))}</button>` : "").join("")}${it.pa.map(p => `<span class="nw-tag pa"><i class="sw" style="background:${ctx.partyCol(p)}"></i>${ctx.esc(ctx.partyName(p))}</span>`).join("")}${it.tp.slice(0, 3).map(t => `<span class="nw-tag tp">${ctx.esc(t)}</span>`).join("")}</div></li>`;
  }
  const onNewsClick = (ctx, e) => { const g = e.target.closest("[data-nwgo]"); if (g) { ctx.focus(g.dataset.nwgo); return true; } return false; };

  // ---------- Election ----------
  const F = { nation: "", region: "", party: "" };
  function election(ctx, el) {
    const r = ctx.resultFor(ctx.UKC, ctx.date);
    if (!r) { el.innerHTML = `<p class="ap-note">No general election on or before ${ctx.esc(ctx.longDate(ctx.date))} in the data (it starts in 1997).</p><button class="btn sm" data-plast>Go to the 2024 election</button>`; el.onclick = e => { if (e.target.closest("[data-plast]")) ctx.setDate(ctx.GE_DAYS[ctx.GE_DAYS.length - 1]); }; return; }
    const codes = seats(ctx), rows = codes.map(c => { const x = ctx.resultFor(c, ctx.date), a = ctx.areaOf(c) || []; return x && !x.agg ? { c, r: x, nat: a[0], reg: a[1], w: winnerOf(x) } : null; }).filter(Boolean);
    const regions = [...new Set(rows.map(x => x.reg).filter(Boolean))].sort((a, b) => ctx.nameOf(a).localeCompare(ctx.nameOf(b))), parties = [...new Set(rows.map(x => x.w))].sort((a, b) => ctx.partyName(a).localeCompare(ctx.partyName(b)));
    const shown = rows.filter(x => (!F.nation || x.nat === F.nation) && (!F.region || x.reg === F.region) && (!F.party || x.w === F.party));
    el.innerHTML = `<h4>${ctx.esc(r.e.label)}</h4>${seatBar(ctx, r)}
      <p class="ap-note">The map shows every seat in the colour of the party that won it. Click a seat for its card, or a row below for its profile.</p>
      <div class="ap-row"><select data-f="nation">${NATIONS.map(([k, l]) => `<option value="${k}" ${F.nation === k ? "selected" : ""}>${l}</option>`).join("")}</select>
        <select data-f="region"><option value="">All regions</option>${regions.map(k => `<option value="${k}" ${F.region === k ? "selected" : ""}>${ctx.esc(ctx.nameOf(k))}</option>`).join("")}</select>
        <select data-f="party"><option value="">Every winning party</option>${parties.map(p => `<option value="${p}" ${F.party === p ? "selected" : ""}>${ctx.esc(ctx.partyName(p))}</option>`).join("")}</select></div>
      <div class="tscroll"><table class="cmp"><thead><tr><th>Seat</th><th>Winner</th><th>Share</th><th>Majority</th><th>Turnout</th></tr></thead><tbody>
      ${shown.map(x => { const cl = x.r.cl, mj = cl[1] ? cl[0][2] - cl[1][2] : null, to = x.r.electorate ? x.r.valid / x.r.electorate : null; return `<tr data-seat="${x.c}" class="clk"><th>${ctx.esc(ctx.nameOf(x.c))}${x.r.est ? ' <sup class="est">est.</sup>' : ""}</th><td><i class="sw" style="background:${ctx.partyCol(x.w)}"></i>${ctx.esc(ctx.partyName(x.w))}</td><td class="num" data-v="${cl[0][2]}">${pc1(cl[0][2])}</td><td class="num" data-v="${mj ?? ""}">${pc1(mj)}</td><td class="num" data-v="${to ?? ""}">${pc1(to)}</td></tr>`; }).join("")}</tbody></table></div>
      <p class="ap-note">${shown.length} of ${rows.length} seats. Click a heading to sort. Turnout = valid votes ÷ electorate.</p>
      <div class="ap-row"><button class="btn sm" data-popen="seat">Seat explorer</button><button class="btn sm" data-popen="projection">Projection</button><button class="btn sm" data-popen="swing">Swingometer</button><button class="btn sm" data-pcmp>Compare these seats</button></div>`;
    el.onchange = e => { const k = e.target.dataset.f; if (k) { F[k] = e.target.value; if (k === "nation") F.region = ""; election(ctx, el); } };
    el.onclick = e => {
      const o = e.target.closest("[data-popen]"); if (o) return ctx.openPanel(o.dataset.popen);
      if (e.target.closest("[data-pcmp]")) return ctx.openCmpWith(shown.slice(0, 1000).map(x => x.c));
      const t = e.target.closest("[data-seat]"); if (t) { seat.code = t.dataset.seat; ctx.focus(t.dataset.seat); ctx.openPanel("seat"); }
    };
  }
  function electionOpen(ctx) {   // clicking Election always puts the winners on the map
    if (!ctx.resultFor(ctx.UKC, ctx.date)) ctx.setDate(ctx.GE_DAYS[ctx.GE_DAYS.length - 1]);
    ctx.setLevel("constituency"); ctx.mapOnly(["ge_winner"]);
  }

  // ---------- Swingometer ----------
  const SW = { to: null, base: null };
  const SWING_HELP = `<details class="ap-help" open><summary>What is the swingometer?</summary>
    <p>A <b>swingometer</b> answers "what if?": what would happen to seats if each party's national vote share changed by some amount. The BBC made it famous on election nights.</p>
    <p><b>How Atlas does it:</b> you type the national shares you want to test (for example Labour 28%, Reform UK 27%). Atlas works out how much each party has gone up or down since the last general election, adds exactly that change to the party's share <i>in every seat</i> (this is called <b>uniform national swing</b>), and gives each seat to whoever then has the most votes. The bar shows the projected seats; "Show on the map" colours each seat by its projected winner.</p>
    <p><b>Why it's only a rough guide:</b> uniform swing is a simple model, and real elections don't move evenly. Tactical voting, popular local MPs, new parties surging in some places but not others, and Scotland or Wales moving differently all break the assumption. Use it to see which seats are vulnerable to a given national shift, not to predict a result. Northern Ireland has its own parties, so it stays as it was.</p></details>`;
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
    ctx.defineMetric({ id: "uns_winner", p: "political", group: "Westminster elections", label: "Projected winner (swingometer)", scale: "nominal", nature: "category", temporal: "static", levels: ["constituency"],
      desc: "The Swingometer's projection: every seat's party shares move by the national change", how: "Each seat's share for a party + (new national share − actual national share), floored at zero; the largest share wins. Northern Ireland unchanged",
      colour: ctx.partyCol, catName: ctx.partyName, cats: () => Object.keys(ctx.PARTY), get: c => SW.proj && SW.proj.has(c) ? { v: SW.proj.get(c), text: ctx.partyName(SW.proj.get(c)) + " (projected)", est: true, estWhy: "A projection, not a result" } : null });
    const avg = ctx.POLLS && ctx.POLLS.avg;
    // 0.7.2: the boxes are drawn once; typing only redraws the results underneath them, so "28." or a cleared box
    // isn't wiped out halfway through typing (that was the decimal-point bug)
    const results = () => {
      const P = project(); SW.proj = P.out;
      const sum = MAIN.reduce((a, p) => a + (+SW.to[p] || 0), 0);
      el.querySelector(".sw-out").innerHTML = `<p class="ap-note">These parties add up to ${sum.toFixed(1)}% (others: ${(100 - sum).toFixed(1)}%)${sum > 100.05 ? ` <b style="color:#b3261e">: more than 100%, so lower one of them</b>` : ""}.</p>
        <h4>Projected seats (Great Britain changes; Northern Ireland as it was)</h4>${seatBar(ctx, { seats: P.count, n: P.out.size })}`;
    };
    const fillBoxes = () => el.querySelectorAll("[data-sw]").forEach(i => { i.value = SW.to[i.dataset.sw]; });
    el.innerHTML = `${SWING_HELP}<p class="ap-note">Base: the ${ctx.esc(day.slice(0, 4))} general election, Great Britain shares. Type any share, decimals included (28.5).</p>
      <div class="ap-form">${MAIN.map(p => `<label for="sw-${p}"><i class="sw" style="background:${ctx.partyCol(p)}"></i> ${ctx.esc(ctx.partyName(p))} <small>(was ${pc1(nat[p] || 0)})</small></label><input id="sw-${p}" type="text" inputmode="decimal" autocomplete="off" data-sw="${p}" value="${SW.to[p]}">`).join("")}</div>
      <div class="sw-out"></div>
      <div class="ap-row"><button class="btn sm" data-swmap>Show on the map</button>${avg ? `<button class="btn sm" data-swpolls title="Fill in the latest polling average">Use the polling average (to ${ctx.esc(ctx.POLLS.latest)})</button>` : ""}<button class="btn sm" data-swreset>Back to the result</button></div>`;
    results();
    el.oninput = e => {
      const p = e.target.dataset.sw; if (!p) return;
      const t = e.target.value.replace(",", ".").trim();
      if (!/^\d{0,2}(\.\d*)?$/.test(t)) { e.target.classList.add("bad"); return; }   // only numbers like 28, 28., 28.5
      e.target.classList.remove("bad");
      const v = parseFloat(t); if (!isFinite(v)) return;   // an empty box or a lone "." waits for more typing
      SW.to[p] = Math.min(100, v);
      clearTimeout(SW.t); SW.t = setTimeout(() => { results(); ctx.repaint(); }, 250);
    };
    el.onfocusout = e => { const p = e.target.dataset && e.target.dataset.sw; if (p) { e.target.value = SW.to[p]; e.target.classList.remove("bad"); } };   // tidy "28." to "28" once you move on
    el.onclick = e => {
      if (e.target.closest("[data-swmap]")) { ctx.setDate(day > ctx.date ? day : ctx.date); ctx.setLevel("constituency"); ctx.mapOnly(["uns_winner"]); }
      if (e.target.closest("[data-swreset]")) { SW.to = Object.fromEntries(MAIN.map(p => [p, +(100 * (nat[p] || 0)).toFixed(1)])); fillBoxes(); results(); ctx.repaint(); }
      if (e.target.closest("[data-swpolls]")) { MAIN.forEach(p => { if (avg[p] != null) SW.to[p] = avg[p]; }); fillBoxes(); results(); ctx.repaint(); }
    };
  }

  // ---------- Projection (polling average) ----------
  function projection(ctx, el) {
    const PO = ctx.POLLS, PR = ctx.projection();
    if (!PO || !PR) { el.innerHTML = `<p class="ap-note">No polls loaded (data/polls.js).</p>`; return; }
    const count = {}, gains = []; PR.seat.forEach((x, c) => { count[x.w] = (count[x.w] || 0) + 1; if (x.w !== x.was) gains.push([c, x]); });
    gains.sort((a, b) => ctx.nameOf(a[0]).localeCompare(ctx.nameOf(b[0])));
    el.innerHTML = `<p class="ap-warn">Atlas's own projection, not a forecast: the polling average applied to every seat by uniform national swing (see the Swingometer for what that means and why it's rough).</p>
      <h4>Polling average</h4><p class="ap-note">${PO.n} polls with fieldwork ending ${PO.window_days} days up to ${ctx.esc(ctx.longDate(PO.latest))}. Source: ${ctx.esc(PO.source)}.</p>
      <table class="cmp"><thead><tr><th>Party</th><th>2024 (GB)</th><th>Average now</th><th>Change</th></tr></thead><tbody>${MAIN.filter(p => PO.avg[p] != null).map(p => { const b = PR.base[p] || 0, a = PO.avg[p] / 100; return `<tr><th><i class="sw" style="background:${ctx.partyCol(p)}"></i>${ctx.esc(ctx.partyName(p))}</th><td class="num">${pc1(b)}</td><td class="num">${pc1(a)}</td><td class="num">${(a - b >= 0 ? "+" : "−") + Math.abs(100 * (a - b)).toFixed(1)} pts</td></tr>`; }).join("")}</tbody></table>
      <h4>Projected seats</h4>${seatBar(ctx, { seats: count, n: PR.seat.size })}
      <div class="ap-row"><button class="btn sm" data-prmap>Show the projection on the map</button><button class="btn sm" data-prsw>Try other numbers (Swingometer)</button></div>
      <h4>Seats projected to change hands (${gains.length})</h4>
      <div class="tscroll" style="max-height:240px"><table class="cmp"><thead><tr><th>Seat</th><th>2024</th><th>Projected</th><th>Margin</th></tr></thead><tbody>${gains.map(([c, x]) => `<tr class="clk" data-seat="${c}"><th>${ctx.esc(ctx.nameOf(c))}</th><td><i class="sw" style="background:${ctx.partyCol(x.was)}"></i>${ctx.esc(ctx.partyName(x.was))}</td><td><i class="sw" style="background:${ctx.partyCol(x.w)}"></i>${ctx.esc(ctx.partyName(x.w))}</td><td class="num">${pc1(x.margin)}</td></tr>`).join("")}</tbody></table></div>
      <details class="ap-help"><summary>The polls used</summary><div class="tscroll" style="max-height:200px"><table class="cmp"><thead><tr><th>Ended</th><th>Pollster</th><th>Area</th>${PO.parties.map(p => `<th>${ctx.esc(ctx.partyName(p))}</th>`).join("")}</tr></thead><tbody>${PO.polls.map(r => `<tr><td>${ctx.esc(r[0])}</td><td>${ctx.esc(r[1])}</td><td>${ctx.esc(r[2])}</td>${r.slice(3).map(v => `<td class="num">${v == null ? "—" : v}</td>`).join("")}</tr>`).join("")}</tbody></table></div></details>`;
    el.onclick = e => {
      if (e.target.closest("[data-prmap]")) { ctx.setLevel("constituency"); ctx.mapOnly(["proj_winner"]); }
      if (e.target.closest("[data-prsw]")) ctx.openPanel("swing");
      const t = e.target.closest("[data-seat]"); if (t) { seat.code = t.dataset.seat; ctx.focus(t.dataset.seat); ctx.openPanel("seat"); }
    };
  }

  // ---------- Seat explorer ----------
  const SF = { q: "", nation: "", region: "", party: "", margin: "" };
  const CENSUS = [["c_owned", "own their home"], ["c_private", "rent privately"], ["c_social", "rent socially"], ["c_flats", "live in flats"], ["c_detached", "live in detached houses"], ["c_bad_health", "describe their health as bad"], ["c_disabled", "are disabled"], ["c_carers", "are unpaid carers"], ["c_overcrowded", "live in overcrowded homes"]];
  function profileText(ctx, code) {
    const rs = ctx.resultsOf(code).filter(r => r.e.kind !== "notional"), last = rs.filter(r => r.e.kind === "general").pop(), a = ctx.areaOf(code) || [];
    if (!last) return "";
    const w = winnerOf(last), cl = last.cl, mj = cl[1] ? cl[0][2] - cl[1][2] : null, to = last.electorate ? last.valid / last.electorate : null;
    let since = last.e.day.slice(0, 4); for (let i = rs.length - 1; i >= 0; i--) { if (rs[i].e.kind === "by") continue; if (winnerOf(rs[i]) !== w) break; since = rs[i].e.day.slice(0, 4); }
    const where = [a[1] && ctx.P[a[1]] ? ctx.nameOf(a[1]) : null, a[0] && ctx.P[a[0]] ? ctx.nameOf(a[0]) : null].filter(Boolean).filter((x, i, arr) => arr.indexOf(x) === i).join(", ");
    const uk = ctx.resultFor(ctx.UKC, last.e.day), ukTo = uk && uk.electorate ? uk.elect_valid / uk.electorate : null;
    const s = [];
    s.push(`<b>${ctx.esc(ctx.nameOf(code))}</b> is a Westminster seat${where ? ` in ${ctx.esc(where)}` : ""}.`);
    s.push(`At the ${ctx.esc(last.e.label)} it was won by <b>${ctx.esc(ctx.partyName(w))}</b>${last.winner ? ` (${ctx.ent(last.winner)})` : ""} with ${pc1(cl[0][2])} of the vote${cl[1] ? `, ${pc1(mj)} ahead of ${ctx.esc(ctx.partyName(cl[1][0]))}` : ""}: a <b>${marginClass(mj)}</b> seat${mj != null && mj < 0.2 ? ` (a swing of ${(50 * mj).toFixed(1)} points would change it)` : ""}.`);
    s.push(since < last.e.day.slice(0, 4) ? `${ctx.esc(ctx.partyName(w))} has held it at every general election since ${since} in these boundaries.` : `It changed hands at that election.`);
    if (to != null) s.push(`Turnout was ${pc1(to)}${ukTo ? ` (UK: ${pc1(ukTo)})` : ""}.`);
    const pr = ctx.projection && ctx.projection(), x = pr && pr.seat.get(code);
    if (x) s.push(`On the polling average to ${ctx.esc(ctx.longDate(ctx.POLLS.latest))}, Atlas projects a <b>${ctx.esc(ctx.partyName(x.w))} ${x.w === x.was ? "hold" : "gain"}</b> (uniform swing, a simple model).`);
    const eu = ctx.value("eu_leave_est_pcon", code, "2016-07-01"); if (eu && eu.v != null) s.push(`An estimated ${eu.v.toFixed(1)}% voted Leave in 2016.`);
    // the census figures where this seat differs most from its nation
    const nat = a[0] && ["E92000001", "W92000004"].includes(a[0]) ? a[0] : null;
    if (nat) {
      const diffs = CENSUS.map(([id, words]) => { const v = ctx.value(id, code), n = ctx.value(id, nat); return v && n && v.v != null && n.v ? { id, words, v: v.v, n: n.v, r: v.v / n.v } : null; }).filter(Boolean).sort((p, q) => Math.abs(Math.log(q.r)) - Math.abs(Math.log(p.r))).slice(0, 3);
      if (diffs.length) s.push(`Compared with ${ctx.esc(ctx.nameOf(nat))} as a whole (Census 2021), ${diffs.map(d => `${d.r > 1 ? "more" : "fewer"} residents or households ${d.words} (${d.v.toFixed(1)}% against ${d.n.toFixed(1)}%)`).join("; ")}.`);
    }
    return s.join(" ");
  }
  function seat(ctx, el) {
    const cur = seat.code && ctx.P[seat.code] ? seat.code : null;
    if (!cur) return seatList(ctx, el);
    const code = cur, rs = ctx.resultsOf(code), spans = (ctx.SPANS[code] || []);
    const rows = rs.map((r, i) => { const prev = rs.slice(0, i).reverse().find(q => q.e.kind !== "by"), w = winnerOf(r), mj = r.cl[1] ? r.cl[0][2] - r.cl[1][2] : null, to = r.electorate ? r.valid / r.electorate : null;
      const sw = prev && w ? ((r.t.by[w] || 0) / r.t.total - (prev.t.by[w] || 0) / prev.t.total) : null;
      return `<tr><th>${ctx.esc(r.e.label)}${r.e.kind === "notional" ? " <sup class='est'>est.</sup>" : ""}</th><td><i class="sw" style="background:${ctx.partyCol(w)}"></i>${ctx.esc(ctx.partyName(w))}</td><td class="num">${pc1(r.cl[0][2])}</td><td class="num">${pc1(mj)}</td><td class="num">${pc1(to)}</td><td class="num">${sw == null ? "—" : (sw >= 0 ? "+" : "") + (100 * sw).toFixed(1)}</td></tr>`; }).join("");
    const pr = ctx.projection && ctx.projection(), x = pr && pr.seat.get(code);
    el.innerHTML = `<div class="ap-row"><button class="btn sm" data-sqback>← All seats</button><input data-sq placeholder="Find another seat…" style="flex:1"><ul class="sq-hits"></ul></div>
      <h3 class="sq-h">${ctx.esc(ctx.nameOf(code))}</h3>
      <p class="sq-prof">${profileText(ctx, code) || "No results for this seat."}</p>
      <div class="ap-row"><button class="btn sm" data-sqfocus>Focus on the map</button><button class="btn sm" data-sqchart>Chart its vote shares</button><button class="btn sm" data-sqcmp>Compare with its neighbours</button><a class="btn sm" href="${wikiUrl(ctx.nameOf(code))}" target="_blank" rel="noopener">Wikipedia ↗</a></div>
      ${x ? `<h4>Projection</h4><p>${ctx.esc(ctx.partyName(x.w))} ${x.w === x.was ? "hold" : `gain from ${ctx.esc(ctx.partyName(x.was))}`} · ${x.order.slice(0, 4).map(p => `${ctx.esc(ctx.partyName(p))} ${pc1(x.sh[p])}`).join(", ")}</p><p class="ap-note">Atlas, polls to ${ctx.esc(ctx.POLLS.latest)}, uniform swing (a simple model). <button class="lnk" data-popen="projection">How this is worked out</button></p>` : ""}
      <h4>Results</h4><div class="tscroll"><table class="cmp"><thead><tr><th>Election</th><th>Winner</th><th>Share</th><th>Majority</th><th>Turnout</th><th title="Change in the winner's share since the previous general election (points)">Winner's change</th></tr></thead><tbody>${rows}</tbody></table></div>
      <h4>MPs</h4><ul class="sq-mps">${spans.slice().reverse().map(s => `<li><i class="sw" style="background:${ctx.partyCol(s[2])}"></i>${ctx.ent(s[3])} · ${ctx.esc(ctx.partyName(s[2]))} <small>${s[0].slice(0, 4)}–${s[1] ? s[1].slice(0, 4) : "now"}</small></li>`).join("")}</ul>
      <h4>In the news</h4>${newsList(ctx, newsFor(ctx, [code], 6), "No official news items name this seat yet.")}
      <p class="ap-note">Results are this seat's own record within its boundary set; across the 2010 and 2024 reviews the "before" result is the Commons Library's notional one (est.).</p>`;
    el.oninput = e => { if (!e.target.matches("[data-sq]")) return; const q = e.target.value.trim().toLowerCase(), hits = q.length < 2 ? [] : Object.keys(ctx.P).filter(c => ctx.P[c].level === "constituency" && ctx.nameOf(c).toLowerCase().includes(q)).slice(0, 12);
      el.querySelector(".sq-hits").innerHTML = hits.map(c => `<li data-sqc="${c}">${ctx.esc(ctx.nameOf(c))}<small> ${ctx.P[c].to ? ctx.P[c].from.slice(0, 4) + "–" + ctx.P[c].to.slice(0, 4) : "2024 seats"}</small></li>`).join(""); };
    el.onclick = e => {
      if (onNewsClick(ctx, e)) return;
      const h = e.target.closest("[data-sqc]"); if (h) { seat.code = h.dataset.sqc; seat(ctx, el); return; }
      if (e.target.closest("[data-sqback]")) { seat.code = null; seat(ctx, el); return; }
      if (e.target.closest("[data-sqfocus]")) ctx.focus(code);
      if (e.target.closest("[data-sqchart]")) ctx.openChart({ metrics: ["ge_share"], places: [code] });
      if (e.target.closest("[data-sqcmp]")) { const reg = (ctx.areaOf(code) || [])[1], near = seats(ctx).filter(c => (ctx.areaOf(c) || [])[1] === reg).slice(0, 12); ctx.openCmpWith([code, ...near.filter(c => c !== code)].slice(0, 12)); }
      const o = e.target.closest("[data-popen]"); if (o) ctx.openPanel(o.dataset.popen);
    };
  }
  function seatList(ctx, el) {   // opens on every seat, listed by region, so there's always something to click
    const pr = ctx.projection && ctx.projection(), day = ctx.GE_DAYS.filter(d => d <= ctx.date).pop() || ctx.GE_DAYS[ctx.GE_DAYS.length - 1];
    const all = seats(ctx).map(c => { const r = ctx.resultFor(c, ctx.date), a = ctx.areaOf(c) || []; const mj = r && !r.agg && r.cl[1] ? r.cl[0][2] - r.cl[1][2] : null; return { c, r, nat: a[0], reg: a[1] || a[0], w: r && !r.agg ? winnerOf(r) : null, mj, x: pr && pr.seat.get(c) }; });
    const q = SF.q.toLowerCase(), shown = all.filter(s => (!q || ctx.nameOf(s.c).toLowerCase().includes(q)) && (!SF.nation || s.nat === SF.nation) && (!SF.region || s.reg === SF.region) && (!SF.party || s.w === SF.party) && (!SF.margin || marginClass(s.mj) === SF.margin || (SF.margin === "gain" && s.x && s.x.w !== s.x.was)));
    const regs = [...new Set(all.map(s => s.reg).filter(Boolean))].sort((a, b) => ctx.nameOf(a).localeCompare(ctx.nameOf(b))), parties = [...new Set(all.map(s => s.w).filter(Boolean))].sort((a, b) => ctx.partyName(a).localeCompare(ctx.partyName(b)));
    const byReg = {}; shown.forEach(s => { (byReg[s.reg] = byReg[s.reg] || []).push(s); });
    el.innerHTML = `<div class="ap-row"><input data-sf="q" placeholder="Find a seat…" value="${ctx.esc(SF.q)}" style="flex:1"></div>
      <div class="ap-row"><select data-sf="nation">${NATIONS.map(([k, l]) => `<option value="${k}" ${SF.nation === k ? "selected" : ""}>${l}</option>`).join("")}</select>
        <select data-sf="region"><option value="">Every region</option>${regs.map(k => `<option value="${k}" ${SF.region === k ? "selected" : ""}>${ctx.esc(ctx.nameOf(k))}</option>`).join("")}</select>
        <select data-sf="party"><option value="">Every winner</option>${parties.map(p => `<option value="${p}" ${SF.party === p ? "selected" : ""}>${ctx.esc(ctx.partyName(p))}</option>`).join("")}</select>
        <select data-sf="margin"><option value="">Any majority</option>${["ultra-marginal", "marginal", "fairly safe", "safe"].map(k => `<option value="${k}" ${SF.margin === k ? "selected" : ""}>${k[0].toUpperCase() + k.slice(1)}</option>`).join("")}${pr ? `<option value="gain" ${SF.margin === "gain" ? "selected" : ""}>Projected to change hands</option>` : ""}</select></div>
      <p class="ap-note">${shown.length} of ${all.length} seats, ${ctx.esc(day.slice(0, 4))} election. Click a seat for its profile.</p>
      <div class="sq-list">${Object.keys(byReg).sort((a, b) => ctx.nameOf(a).localeCompare(ctx.nameOf(b))).map(reg => `<details class="sq-reg" open><summary>${ctx.esc(ctx.nameOf(reg))} <small>${byReg[reg].length}</small></summary>${byReg[reg].sort((a, b) => ctx.nameOf(a.c).localeCompare(ctx.nameOf(b.c))).map(s => `<button class="sq-it" data-sqc="${s.c}"><i class="sw" style="background:${s.w ? ctx.partyCol(s.w) : "#ccc"}"></i><span>${ctx.esc(ctx.nameOf(s.c))}</span><small>${s.w ? ctx.esc(ctx.partyName(s.w)) : ""}${s.mj != null ? ` · ${pc1(s.mj)}` : ""}${s.x && s.x.w !== s.x.was ? ` · <b style="color:${ctx.partyCol(s.x.w)}">→ ${ctx.esc(ctx.partyName(s.x.w))}</b>` : ""}</small></button>`).join("")}</details>`).join("")}</div>`;
    el.oninput = e => { if (e.target.dataset.sf === "q") { SF.q = e.target.value; clearTimeout(seatList.t); seatList.t = setTimeout(() => { seatList(ctx, el); const i = el.querySelector('[data-sf="q"]'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }, 200); } };
    el.onchange = e => { const k = e.target.dataset.sf; if (k && k !== "q") { SF[k] = e.target.value; if (k === "nation") SF.region = ""; seatList(ctx, el); } };
    el.onclick = e => { const h = e.target.closest("[data-sqc]"); if (h) { seat.code = h.dataset.sqc; ctx.focus(h.dataset.sqc); seat(ctx, el); } };
  }
  function seatOpen(ctx) { if (ctx.focused && ctx.P[ctx.focused] && ctx.P[ctx.focused].level === "constituency") seat.code = ctx.focused; }

  // ---------- Councils ----------
  const CF = { region: "", ctl: "" };
  const COUNCIL_FIGS = [   // the place in numbers: each row can go on the map, into a chart or into Analyse
    ["population", "Population"], ["average_age", "Average age"], ["gdp_per_head", "GDP per head"], ["band_d", "Council tax, Band D"], ["hpi_avg", "Average house price"], ["rent_avg", "Average private rent"],
    ["afford", "House price to earnings"], ["c_private", "Private renting (2021)"], ["c_social", "Social renting (2021)"], ["le_f", "Life expectancy (women)"], ["le_m", "Life expectancy (men)"], ["c_bad_health", "Bad health (2021)"],
    ["la_borrow_ph", "Council borrowing per resident"], ["temp_accom", "Temporary accommodation"], ["eu_leave", "EU referendum: Leave"]];
  function councils(ctx, el) {
    const L = ctx.LOC || {}, allC = Object.keys(L.comp || {}).filter(c => ctx.P[c]);
    const ctlOf = c => { const r = ctx.value("control", c); return r ? r.v : null; };
    const regs = [...new Set(allC.map(c => ctx.parentOf(c)).filter(Boolean))].sort((a, b) => ctx.nameOf(a).localeCompare(ctx.nameOf(b)));
    const list = allC.filter(c => (!CF.region || ctx.parentOf(c) === CF.region) && (!CF.ctl || ctlOf(c) === CF.ctl)).sort((a, b) => ctx.nameOf(a).localeCompare(ctx.nameOf(b)));
    const cur = councils.code && L.comp[councils.code] ? councils.code : ctx.focused && L.comp && L.comp[ctx.focused] ? ctx.focused : list.find(c => /Manchester/.test(ctx.nameOf(c))) || list[0];
    councils.code = cur; const comp = (L.comp || {})[cur] || [];
    const parties = [...new Set(comp.flatMap(x => Object.keys(x[2])))].sort((a, b) => comp.reduce((s, x) => s + (x[2][b] || 0), 0) - comp.reduce((s, x) => s + (x[2][a] || 0), 0));
    const Wd = 420, H = 150, y0 = comp.length ? comp[0][0] : 0, y1 = comp.length ? comp[comp.length - 1][0] : 1, X = y => 30 + (y - y0) / ((y1 - y0) || 1) * (Wd - 40);
    let base = comp.map(() => 0); const areas = parties.map(p => { const top = comp.map((x, i) => base[i] + (x[2][p] || 0) / x[1]); const d = "M" + comp.map((x, i) => `${X(x[0]).toFixed(1)} ${(H - 18 - top[i] * (H - 28)).toFixed(1)}`).join("L") + "L" + comp.slice().reverse().map((x, j) => { const i = comp.length - 1 - j; return `${X(x[0]).toFixed(1)} ${(H - 18 - base[i] * (H - 28)).toFixed(1)}`; }).join("L") + "Z"; base = top; return `<path d="${d}" fill="${ctx.partyCol(p)}" opacity=".9"><title>${ctx.esc(ctx.partyName(p))}</title></path>`; }).join("");
    const ctl = (ctx.POL.control[cur] || []), cy0 = 1974, cy1 = +ctx.today.slice(0, 4), CX = d => 30 + ((+d.slice(0, 4) + (+d.slice(5, 7) - 1) / 12) - cy0) / (cy1 - cy0) * (Wd - 40);
    const bd = L.bandd && L.bandd[cur] ? Object.entries(L.bandd[cur])[0] : null, bpts = bd ? bd[1].map((v, i) => [+bd[0] + i, v]).filter(p => p[1] != null) : [];
    const lastComp = comp[comp.length - 1], ruler = ctx.value("ruler", cur), ctlNow = ctx.value("control", cur), ten = ctx.value("tenure", cur), turn = ctx.value("turnover", cur);
    const changes = ctl.filter((s, i) => i > 0 && s[0] >= "1974-01-01" && s[2] !== ctl[i - 1][2]).length, sinceRec = ten && ten.v != null && ten.v >= (+ctx.today.slice(0, 4) - 1974) - 1;
    const figs = COUNCIL_FIGS.filter(([id]) => ctx.M[id]).map(([id, label]) => { const r = ctx.value(id, cur); if (!r || r.v == null || r.nm) return ""; const reg = ctx.parentOf(cur), rr = reg ? ctx.value(id, reg) : null; return `<tr><th>${ctx.esc(label)}</th><td class="num">${ctx.esc(r.text)}${r.yr ? ` <small>(${ctx.esc(String(r.yr))})</small>` : ""}</td><td class="num"><small>${rr && rr.v != null ? ctx.esc(rr.text) : "—"}</small></td><td class="acts3"><button class="lnk" data-cmap="${id}" title="Put it on the map">map</button><button class="lnk" data-cchart="${id}" title="Chart this council over time">chart</button></td></tr>`; }).join("");
    const nWards = ctx.kids(cur).filter(c => ctx.P[c] && ctx.P[c].level === "ward").length;
    el.innerHTML = `<div class="ap-row"><select data-cf="region"><option value="">Every region and nation</option>${regs.map(k => `<option value="${k}" ${CF.region === k ? "selected" : ""}>${ctx.esc(ctx.nameOf(k))}</option>`).join("")}</select>
        <select data-cf="ctl"><option value="">Any control</option>${[...new Set(allC.map(ctlOf).filter(Boolean))].sort((a, b) => ctx.partyName(a).localeCompare(ctx.partyName(b))).map(p => `<option value="${p}" ${CF.ctl === p ? "selected" : ""}>${ctx.esc(ctx.partyName(p))}</option>`).join("")}</select>
        <select data-cc>${list.map(c => `<option value="${c}" ${c === cur ? "selected" : ""}>${ctx.esc(ctx.nameOf(c))}</option>`).join("")}</select></div>
      <h3 class="sq-h">${ctx.esc(ctx.nameOf(cur))}</h3>
      <p class="sq-prof">${ctx.esc(ctx.nameOf(cur))} is run by <b>${ctx.esc(ctlNow ? ctlNow.text.replace(/ \(council control\)$/, "") : "—")}</b>${ruler && ruler.text ? `, led by ${ctx.linkPerson(ruler.text)}` : ""}.${sinceRec ? " It has had the same control since at least 1974 (where the records start)." : `${ten && ten.v != null ? ` Control last changed ${ten.v < 1 ? "within the last year" : `${ten.v.toFixed(0)} years ago`}` : ""}${turn && turn.v != null ? `, and has changed ${turn.v} time${turn.v === 1 ? "" : "s"} in the last 20 years` : ""}.${changes ? ` Since 1974 control has changed ${changes} time${changes === 1 ? "" : "s"}.` : ""}`}${lastComp ? ` After the ${lastComp[0]} elections the council had ${lastComp[1]} seats: ${Object.entries(lastComp[2]).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([p, k]) => `${ctx.esc(ctx.partyName(p))} ${k}`).join(", ")}.` : ""}${nWards ? ` It has ${nWards} wards.` : ""}</p>
      <div class="ap-row"><button class="btn sm" data-cfocus>Focus on the map</button><button class="btn sm" data-cwards>Show its wards</button><button class="btn sm" data-ccmp>Compare with the region's councils</button><button class="btn sm" data-can>Analyse councils</button><button class="btn sm" data-cws>Send to workspace</button></div>
      <h4>Seats by party, ${y0}–${y1}</h4>${comp.length ? `<svg viewBox="0 0 ${Wd} ${H}" class="ap-svg">${areas}<text x="30" y="${H - 3}">${y0}</text><text x="${Wd - 10}" y="${H - 3}" text-anchor="end">${y1}</text></svg><div class="ap-row">${parties.slice(0, 8).map(p => `<span><i class="sw" style="background:${ctx.partyCol(p)}"></i>${ctx.esc(ctx.partyName(p))}</span>`).join("")}</div>` : `<p class="ap-note">No composition record.</p>`}
      <h4>Control since 1974</h4>${ctl.length ? `<svg viewBox="0 0 ${Wd} 34" class="ap-svg">${ctl.map(s => `<rect x="${CX(s[0]).toFixed(1)}" y="4" width="${Math.max(1, CX(s[1] || ctx.today) - CX(s[0])).toFixed(1)}" height="18" fill="${ctx.partyCol(s[2])}"><title>${ctx.esc(ctx.partyName(s[2]))} ${s[0].slice(0, 4)}–${s[1] ? s[1].slice(0, 4) : "now"}</title></rect>`).join("")}<text x="30" y="33">1974</text><text x="${Wd - 10}" y="33" text-anchor="end">${cy1}</text></svg>` : `<p class="ap-note">No control record.</p>`}
      <h4>The council in numbers</h4><div class="tscroll"><table class="cmp"><thead><tr><th></th><th>${ctx.esc(ctx.nameOf(cur))}</th><th>${ctx.esc(ctx.parentOf(cur) ? ctx.nameOf(ctx.parentOf(cur)) : "")}</th><th></th></tr></thead><tbody>${figs}</tbody></table></div>
      <h4>Council tax, Band D</h4>${bpts.length > 1 ? ctx.CH.line([{ name: ctx.nameOf(cur), colour: "#7b4fa6", pts: bpts }], { w: Wd, h: 150, vfmt: v => "£" + Math.round(v).toLocaleString("en-GB") }) : `<p class="ap-note">Not available for this council${cur.startsWith("N") ? " (Northern Ireland has domestic rates)" : ""}.</p>`}
      <h4>In the news</h4>${newsList(ctx, newsFor(ctx, [cur], 6), "No official news items name this council yet.")}
      <p class="ap-note">Sources: Open Council Data UK (CC BY-SA 4.0); council control from Wikipedia; Band D from MHCLG, Scottish Government and StatsWales; the figures from each metric's own source (ⓘ in the Perspectives menu).</p>`;
    el.onchange = e => { if (e.target.matches("[data-cc]")) { councils.code = e.target.value; councils(ctx, el); } const k = e.target.dataset.cf; if (k) { CF[k] = e.target.value; councils.code = null; councils(ctx, el); } };
    el.onclick = e => {
      if (onNewsClick(ctx, e)) return;
      const m = e.target.closest("[data-cmap]"); if (m) { ctx.setLevel("council"); ctx.mapAdd(m.dataset.cmap); return; }
      const c = e.target.closest("[data-cchart]"); if (c) { const reg = ctx.parentOf(cur); ctx.openChart({ metrics: [c.dataset.cchart], places: [cur, reg].filter(Boolean) }); return; }
      if (e.target.closest("[data-cfocus]")) ctx.focus(cur);
      if (e.target.closest("[data-cwards]")) { ctx.setLevel("ward"); ctx.focus(cur); }
      if (e.target.closest("[data-ccmp]")) { const reg = ctx.parentOf(cur), near = allC.filter(x => ctx.parentOf(x) === reg); ctx.openCmpWith([cur, ...near.filter(x => x !== cur)].slice(0, 40)); }
      if (e.target.closest("[data-can]")) ctx.openAnalyse({ level: "council", metrics: ["band_d", "hpi_avg", "c_private"].filter(id => ctx.M[id]) });
      if (e.target.closest("[data-cws]")) ctx.sendToWS({ type: "card", title: ctx.nameOf(cur), html: `<h3>${ctx.esc(ctx.nameOf(cur))}</h3>${el.querySelector(".sq-prof").outerHTML}<table class="cmp">${el.querySelector(".tscroll table tbody") ? el.querySelector(".tscroll table tbody").outerHTML.replace(/<td class="acts3">.*?<\/td>/g, "") : ""}</table>`, w: 440, h: 460 });
    };
  }

  // ---------- News ----------
  const NF = { q: "", topic: "", src: "", near: false };
  function news(ctx, el) {
    const N = ctx.NEWS;
    if (!N) { el.innerHTML = `<p class="ap-note">The news feed isn't loaded (data/news.js).</p>`; return; }
    const within = ctx.focused && ctx.P[ctx.focused] ? new Set([ctx.focused, ...ctx.kids(ctx.focused)]) : null;
    const q = NF.q.toLowerCase(), items = N.items.filter(it => (!q || (it.t + " " + it.x).toLowerCase().includes(q)) && (!NF.topic || it.tp.includes(NF.topic)) && (!NF.src || it.s.startsWith(NF.src)) && (!NF.near || (within && it.pl.some(c => within.has(c)))));
    el.innerHTML = `<p class="ap-note">Official news only: GOV.UK announcements and UK Parliament statements and bills, refreshed daily (${ctx.esc(ctx.longDate(N.built))}). Atlas tags each item with the places, parties and topics it names, using simple keyword rules.</p>
      <div class="ap-row"><input data-nf="q" placeholder="Search the news…" value="${ctx.esc(NF.q)}" style="flex:1">
        <select data-nf="topic"><option value="">Every topic</option>${N.topics.map(t => `<option ${NF.topic === t ? "selected" : ""}>${ctx.esc(t)}</option>`).join("")}</select>
        <select data-nf="src"><option value="">Every source</option><option value="GOV.UK" ${NF.src === "GOV.UK" ? "selected" : ""}>GOV.UK</option><option value="Parliament" ${NF.src === "Parliament" ? "selected" : ""}>Parliament</option></select>
        <label class="ck"><input type="checkbox" data-nf="near" ${NF.near ? "checked" : ""} ${within ? "" : "disabled"}>${within ? `Only ${ctx.esc(ctx.nameOf(ctx.focused))}` : "Click a place to filter"}</label></div>
      <p class="ap-note">${items.length} items.</p>${newsList(ctx, items.slice(0, 120), "Nothing matches.")}
      <p class="ap-note">${ctx.esc(N.sources)}</p>`;
    el.oninput = e => { if (e.target.dataset.nf === "q") { NF.q = e.target.value; clearTimeout(news.t); news.t = setTimeout(() => { news(ctx, el); const i = el.querySelector('[data-nf="q"]'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }, 250); } };
    el.onchange = e => { const k = e.target.dataset.nf; if (k === "near") NF.near = e.target.checked; else if (k && k !== "q") NF[k] = e.target.value; news(ctx, el); };
    el.onclick = e => onNewsClick(ctx, e);
  }

  function referendums(ctx, el) {
    const uk = ctx.M.eu_leave && ctx.M.eu_leave.get(ctx.UKC, "2016-06-24");
    el.innerHTML = `<h4>EU referendum, 23 June 2016</h4><p>${uk ? `Leave <b>${ctx.esc(uk.text)}</b> across the UK.` : ""}</p>
      <div class="ap-row"><button class="btn sm" data-ref="council">Leave share by council (counted)</button><button class="btn sm" data-ref="pcon">By constituency (estimates)</button></div>
      <p class="ap-warn">Constituency figures are Chris Hanretty's estimates (the referendum was counted by council), marked est. and hatched on the map, except where the BBC obtained ward counts.</p>
      <p class="ap-note">Scottish independence referendum 2014: not available (the official per-council results are behind browser checks; see the 1.7 notes).</p>`;
    el.onclick = e => { const b = e.target.closest("[data-ref]"); if (!b) return; ctx.setDate("2016-06-24"); if (b.dataset.ref === "council") { ctx.setLevel("council"); ctx.mapOnly(["eu_leave"]); } else { ctx.setLevel("constituency"); ctx.mapOnly(["eu_leave_est_pcon"]); } };
  }
  function protests(ctx, el) {
    el.innerHTML = `<p>Notable protests since 1974, checked to be in the UK: the list follows the time bar and the area in focus.</p><div class="ap-row"><button class="btn sm" data-pl>Open the protest list</button><button class="btn sm" data-pm>Protests on the map</button></div>`;
    el.onclick = e => { if (e.target.closest("[data-pl]")) ctx.openProtestList(); if (e.target.closest("[data-pm]")) { ctx.setHex(false); ctx.mapOnly(["control", "protest_events"]); ctx.setLevel("auto"); } };
  }

  window.AtlasApps && AtlasApps.register({
    id: "politics", name: "Atlas Politics", perspective: "political", accent: "#7b4fa6", dataNeeds: ["ATLAS_POL", "ATLAS_EL"],
    init(ctx) { ctx.setHex(false); electionOpen(ctx); ctx.openPanel("election"); },
    panels: [
      { id: "election", title: "Election", live: true, render: election, onOpen: electionOpen, min: { w: 400, h: 300 } },
      { id: "seat", title: "Seat explorer", render: seat, onOpen: seatOpen, min: { w: 420, h: 320 } },
      { id: "councils", title: "Councils", render: councils, min: { w: 460, h: 360 } },
      { id: "projection", title: "Projection", render: projection, min: { w: 420, h: 320 } },
      { id: "news", title: "News", render: news, min: { w: 420, h: 320 } },
      { id: "referendums", title: "Referendums", render: referendums },
      { id: "protests", title: "Protests", render: protests },
    ],
    tools: [{ id: "swing", title: "Swingometer", blurb: "What if national shares changed? See which seats would change hands (uniform national swing)", render: swing, min: { w: 400, h: 380 } }],
  });
})();
