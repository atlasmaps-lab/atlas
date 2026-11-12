/* Atlas Politics (0.11) · the bar's dropdown menus (see menu.js). Election is the model for every app:
 *   the latest general election (the result, seats that changed hands, the measures behind it), every previous general
 *   election since 1997 as its own row, by-elections, how the votes were cast, and polls and what-ifs.
 * Every row opens a card; every card can go on the map or to the workspace.
 */
(function () {
  "use strict";
  const reg = window.AtlasMenus = window.AtlasMenus || {}; const M = reg.politics = reg.politics || {};
  const pc = v => (100 * v).toFixed(1) + "%";
  const short = (ctx, p) => ({ con: "Con", lab: "Lab", ld: "LD", snp: "SNP", ref: "Reform", grn: "Green", pc: "PC", dup: "DUP", sf: "SF" })[p] || ctx.partyName(p);
  const geMap = day => ({ date: day, level: "constituency", metrics: ["ge_winner"] });
  const seatsLine = (ctx, r) => Object.entries(r.seats || {}).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([p, n]) => `${short(ctx, p)} ${n}`).join(" · ");
  function resultCard(ctx, day, code) {
    code = code || ctx.UKC; const r = ctx.resultFor(code, day); if (!r) return null; const prev = ctx.previousFor(code, r), V = AtlasCard.viz, esc = ctx.esc;
    const seats = Object.entries(r.seats).sort((a, b) => b[1] - a[1]), n = r.n, [p1, s1] = seats[0], maj = 2 * s1 - n;
    const vs = Object.entries(r.t.by).map(([p, v]) => [p, v / r.t.total]).sort((a, b) => b[1] - a[1]), pv = prev ? Object.fromEntries(Object.entries(prev.t.by).map(([p, v]) => [p, v / prev.t.total])) : {};
    const to = r.electorate ? r.valid / r.electorate : null, toP = prev && prev.electorate ? prev.valid / prev.electorate : null;
    const sv = Object.fromEntries(vs), gall = Math.sqrt(0.5 * [...new Set([...Object.keys(r.seats), ...Object.keys(sv)])].reduce((a, p) => a + ((sv[p] || 0) * 100 - 100 * (r.seats[p] || 0) / n) ** 2, 0));
    const ch = (p, now, then) => then == null ? "new" : now === then ? "0" : `${now - then > 0 ? "+" : "−"}${Math.abs(now - then)}`;
    const py = prev ? prev.e.day.slice(0, 4) : "";
    const items = [
      { k: `Seats · ${n}`, h: maj > 0 ? `${esc(ctx.partyName(p1))} won <b>${s1}</b> seats, a majority of ${maj}` : `No party won a majority: ${esc(ctx.partyName(p1))} was largest with <b>${s1}</b>`, viz: V.stack(seats.map(([p, k]) => ({ v: k, c: ctx.partyCol(p), n: ctx.partyName(p) }))), open: true,
        more: `<table class="mo-tab"><tr><th>Party</th><th class="num">Seats</th>${prev ? `<th class="num">vs ${py}</th>` : ""}</tr>${seats.slice(0, 10).map(([p, k]) => `<tr><td><i class="sw" style="background:${ctx.partyCol(p)}"></i>${esc(ctx.partyName(p))}</td><td class="num">${k}</td>${prev ? `<td class="num">${ch(p, k, prev.seats[p] != null ? prev.seats[p] : prev ? 0 : null)}</td>` : ""}</tr>`).join("")}</table><p>${Math.floor(n / 2) + 1} seats make a majority.${r.est ? " Changes across a boundary review use notional results." : ""}</p>`, map: geMap(day) },
      { k: "Votes", h: `${esc(ctx.partyName(vs[0][0]))} won <b>${pc(vs[0][1])}</b> of the vote${vs[1] ? `, ${esc(ctx.partyName(vs[1][0]))} ${pc(vs[1][1])}` : ""}`, viz: V.bars(vs.slice(0, 6).map(([p, v]) => ({ v, c: ctx.partyCol(p), n: ctx.partyName(p) }))),
        more: `<table class="mo-tab"><tr><th>Party</th><th class="num">Share</th>${prev ? `<th class="num">vs ${py}</th>` : ""}</tr>${vs.slice(0, 10).map(([p, v]) => `<tr><td><i class="sw" style="background:${ctx.partyCol(p)}"></i>${esc(ctx.partyName(p))}</td><td class="num">${pc(v)}</td>${prev ? `<td class="num">${pv[p] != null ? `${v - pv[p] >= 0 ? "+" : "−"}${Math.abs(100 * (v - pv[p])).toFixed(1)}` : "new"}</td>` : ""}</tr>`).join("")}</table>`, map: { date: day, level: "constituency", metrics: ["ge_share"] } },
      to ? { k: "Turnout", h: `<b>${pc(to)}</b> of registered voters voted${toP ? `, ${to >= toP ? "up" : "down"} ${Math.abs(100 * (to - toP)).toFixed(1)} points on ${py}` : ""}`, viz: V.big(pc(to), "turnout"), more: `<p>${ctx.fmtInt(r.valid)} valid votes from ${ctx.fmtInt(r.electorate)} registered electors.</p>`, map: { date: day, level: "constituency", metrics: ["ge_turnout"] } } : null,
      { k: "Seats for votes", h: `${esc(ctx.partyName(p1))} won ${pc(s1 / n)} of the seats on ${pc(sv[p1] || 0)} of the vote`, viz: V.big(gall.toFixed(1), "Gallagher index"),
        more: `<p>First past the post gives seats to whoever comes first in each seat, so a party's share of seats can be far from its share of votes. The Gallagher index sums up the gap: 0 is perfectly proportional; most UK elections score between 10 and 25.</p>`, map: { date: day, level: "constituency", metrics: ["ge_minority_win"] } },
    ].filter(Boolean);
    const src = (ctx.EL && ctx.EL.sources && ctx.EL.sources.westminster) || "House of Commons Library";
    const figs = [{ v: `${short(ctx, p1)} ${s1}`, l: maj > 0 ? `seats, majority ${maj}` : "seats, largest party" }, { v: pc(sv[p1] || 0), l: `of the vote for ${short(ctx, p1)}` }, to ? { v: pc(to), l: "turnout" } : null];
    return { app: "Politics", title: (code === ctx.UKC ? "" : ctx.nameOf(code) + ": ") + r.e.label.replace(/^./, c => c.toUpperCase()), figs, items, source: String(src).split(/[;(]/)[0].slice(0, 60), when: ctx.longDate(day), map: geMap(day), panel: "election", links: [{ label: "Commons Library briefing", url: "https://commonslibrary.parliament.uk/research-briefings/?query=general%20election%20results" }] };
  }
  function changedKids(ctx, day) { // Con → Lab (180 seats) › each seat
    return seatCol(ctx, day, g => { const rows = g.map(({ c, r }) => { const p = ctx.previousFor(c, r); const w = r.cl[0][0], pw = p && p.cl && p.cl[0] ? p.cl[0][0] : null; return pw && pw !== w ? { c, w, pw } : null; }).filter(Boolean);
    const flows = {}; rows.forEach(x => { (flows[x.pw + ">" + x.w] = flows[x.pw + ">" + x.w] || []).push(x); });
    return Object.entries(flows).sort((a, b) => b[1].length - a[1].length).map(([k, xs]) => { const [a, b] = k.split(">"); return { label: `${ctx.partyName(a)} → ${ctx.partyName(b)}`, colour: ctx.partyCol(b), sub: `${xs.length} ${xs.length === 1 ? "seat" : "seats"}`,
      children: () => xs.map(x => ({ label: ctx.nameOf(x.c), sub: `${ctx.partyName(b)} gain`, card: () => window.AtlasPoliticsMenu.seatCard(ctx, x.c, day), map: { date: day, level: "constituency", metrics: ["ge_winner"], focus: x.c } })) }; }); });
  }
  function changedCard(ctx, day) {
    if (!geSeats(ctx, day) && ctx.loadPconFor) return ctx.loadPconFor(day).then(() => changedCard(ctx, day));   // older boundaries load first
    const g = geSeats(ctx, day) || [];
    const rows = g.map(({ c, r }) => { const p = ctx.previousFor(c, r); const w = r.cl[0][0], pw = p && p.cl && p.cl[0] ? p.cl[0][0] : null; return pw && pw !== w ? { c, w, pw, est: !!(p && p.est) } : null; }).filter(Boolean);
    const flows = {}; rows.forEach(x => { const k = x.pw + ">" + x.w; (flows[k] = flows[k] || []).push(x); });
    const top = Object.entries(flows).sort((a, b) => b[1].length - a[1].length), esc = ctx.esc, V = AtlasCard.viz;
    const items = [{ k: "Changed hands", h: `<b>${rows.length}</b> seats changed hands`, viz: V.big(String(rows.length), "seats"), open: true, more: `<p>Compared with each seat's previous result${rows.some(x => x.est) ? " (notional results where the boundaries changed)" : ""}.</p>`, map: geMap(day) }]
      .concat(top.slice(0, 8).map(([k, xs]) => { const [a, b] = k.split(">"); return { k: `${ctx.partyName(a)} → ${ctx.partyName(b)}`, h: `<b>${xs.length}</b> ${xs.length === 1 ? "seat" : "seats"} went from ${esc(ctx.partyName(a))} to ${esc(ctx.partyName(b))}`, viz: V.stack([{ v: 1, c: ctx.partyCol(a), n: ctx.partyName(a) }, { v: 1, c: ctx.partyCol(b), n: ctx.partyName(b) }]),
        more: `<p>${xs.slice(0, 30).map(x => esc(ctx.nameOf(x.c))).join(" · ")}${xs.length > 30 ? ` and ${xs.length - 30} more` : ""}</p>`, map: Object.assign(geMap(day), { focus: xs[0].c }) }; }));
    return { app: "Politics", title: `Seats that changed hands · ${day.slice(0, 4)}`, items, source: "Atlas, from the House of Commons Library", when: ctx.longDate(day), map: geMap(day), panel: "election" };
  }
  let BY = null;
  function byIndex(ctx) { // by-election id -> seats, from every constituency's results (boundary sets since 1997)
    if (BY) return BY; BY = {};
    Object.keys(ctx.P).filter(c => ctx.P[c].level === "constituency").forEach(c => { (ctx.resultsOf(c) || []).forEach(r => { if (r && r.e && r.e.kind === "by") (BY[r.e.day] = BY[r.e.day] || []).push(c); }); });
    return BY;
  }
  function byCard(ctx, day) {
    const codes = [...new Set(byIndex(ctx)[day] || [])], esc = ctx.esc, V = AtlasCard.viz;
    const items = codes.map((c, i) => { const r = (ctx.resultsOf(c) || []).find(x => x.e.day === day && x.e.kind === "by"); if (!r) return null; const p = ctx.previousFor(c, r), w = r.cl[0][0], pw = p && p.cl && p.cl[0] ? p.cl[0][0] : null, mj = r.cl[1] ? r.cl[0][2] - r.cl[1][2] : null;
      return { k: ctx.nameOf(c), h: `${esc(ctx.partyName(w))} ${pw && pw !== w ? `<b>gain</b> from ${esc(ctx.partyName(pw))}` : "hold"}${mj != null ? `, majority ${pc(mj)}` : ""}`, viz: V.bars(r.cl.slice(0, 5).map(x => ({ v: x[2], c: ctx.partyCol(x[0]), n: ctx.partyName(x[0]) }))), open: i === 0,
        more: `<table class="mo-tab">${r.cl.slice(0, 6).map(x => `<tr><td><i class="sw" style="background:${ctx.partyCol(x[0])}"></i>${esc(ctx.partyName(x[0]))}</td><td class="num">${ctx.fmtInt(x[1])}</td><td class="num">${pc(x[2])}</td></tr>`).join("")}</table>`, map: { date: day, level: "constituency", metrics: ["ge_winner"], focus: c } }; }).filter(Boolean);
    return { app: "Politics", title: `By-election${codes.length > 1 ? "s" : ""} · ${ctx.longDate(day)}`, items: items.length ? items : [{ k: "By-election", h: "The seat's result isn't in the data yet" }], source: "House of Commons Library", when: ctx.longDate(day), map: { date: day, level: "constituency", metrics: ["ge_winner"] } };
  }

  // one seat's result at an election, as a card
  function seatCard(ctx, c, day) {
    const r = (ctx.resultsOf(c) || []).filter(x => x.e.day <= day && x.e.kind !== "notional").pop(); if (!r) return null; const esc = ctx.esc, V = AtlasCard.viz;
    const p = ctx.previousFor(c, r), w = r.cl[0][0], pw = p && p.cl && p.cl[0] ? p.cl[0][0] : null, mj = r.cl[1] ? r.cl[0][2] - r.cl[1][2] : null, to = r.electorate ? r.valid / r.electorate : null;
    return { app: "Politics", title: ctx.nameOf(c), items: [{ k: r.e.label, h: `${esc(ctx.partyName(w))} ${pw && pw !== w ? `<b>gain</b> from ${esc(ctx.partyName(pw))}` : "hold"}${mj != null ? `, majority ${pc(mj)}` : ""}`, viz: V.bars(r.cl.slice(0, 5).map(x => ({ v: x[2], c: ctx.partyCol(x[0]), n: ctx.partyName(x[0]) }))), open: true,
      more: `<table class="mo-tab">${r.cl.slice(0, 8).map(x => `<tr><td><i class="sw" style="background:${ctx.partyCol(x[0])}"></i>${esc(ctx.partyName(x[0]))}</td><td class="num">${ctx.fmtInt(x[1])}</td><td class="num">${pc(x[2])}</td></tr>`).join("")}</table>${to ? `<p>Turnout ${pc(to)}.${r.est ? " Notional result on these boundaries." : ""}</p>` : ""}`, map: { date: day, level: "constituency", metrics: ["ge_winner"], focus: c } }],
      source: "House of Commons Library", when: ctx.longDate(r.e.day), map: { date: day, level: "constituency", metrics: ["ge_winner"], focus: c }, panel: "seat" };
  }
  // every seat contested at a general election, on the boundaries of the day (1997, 2010 and 2024 sets), with its result
  const GES = {};
  function geSeats(ctx, day) {
    if (GES[day]) return GES[day];
    const all = Object.keys((ctx.EL && ctx.EL.res) || {}).map(c => { const r = (ctx.resultsOf(c) || []).find(x => x && x.e && x.e.day === day && x.e.kind === "general"); return r ? { c, r } : null; }).filter(Boolean);
    if (all.some(x => !ctx.P[x.c])) return null;   // the boundaries of the day aren't loaded yet (their seat names come with them)
    return (GES[day] = all);
  }
  // a column of seats from an election: built when the boundaries of the day have loaded
  function seatCol(ctx, day, build) {
    const g = geSeats(ctx, day); if (g) return build(g);
    if (ctx.loadPconFor) ctx.loadPconFor(day).then(() => window.AtlasMenu && AtlasMenu.refresh());
    return [{ label: `Loading the ${day.slice(0, 4)} boundaries…`, sub: "Seat names arrive with them", loading: true }];
  }
  const seatsBy = (g, sortFn) => g.filter(x => x.r.cl && x.r.cl[1]).map(({ c, r }) => ({ c, w: r.cl[0][0], m: r.cl[0][2] - r.cl[1][2] })).sort(sortFn);
  // the deeper columns under one general election
  function geKids(ctx, day) {
    const seatRow = x => ({ label: ctx.nameOf(x.c), colour: ctx.partyCol(x.w), sub: `${ctx.partyName(x.w)} · majority ${pc(x.m)}`, card: () => seatCard(ctx, x.c, day), map: { date: day, level: "constituency", metrics: ["ge_winner"], focus: x.c } });
    return [{ label: "The result", sub: "Seats, votes, turnout, fairness", card: () => resultCard(ctx, day), map: geMap(day) },
      { label: "Seats that changed hands", sub: "From who to whom", card: () => changedCard(ctx, day), map: geMap(day), children: () => changedKids(ctx, day) },
      { label: "Nation by nation", sub: "England, Scotland, Wales, Northern Ireland", children: () => ["E92000001", "S92000003", "W92000004", "N92000002"].map(n => { const r = ctx.resultFor(n, day); return r ? { label: ctx.nameOf(n), sub: seatsLine(ctx, r), card: () => resultCard(ctx, day, n), map: Object.assign(geMap(day), { focus: n }) } : null; }).filter(Boolean) },
      { label: "Closest seats", sub: "The 15 smallest majorities", children: () => seatCol(ctx, day, g => seatsBy(g, (a, b) => a.m - b.m).slice(0, 15).map(seatRow)) },
      { label: "Safest seats", sub: "The 15 biggest majorities", children: () => seatCol(ctx, day, g => seatsBy(g, (a, b) => b.m - a.m).slice(0, 15).map(seatRow)) }];
  }
  M.election = (ctx, B) => {
    const days = ctx.GE_DAYS.slice().reverse(), latest = days.find(d => d <= ctx.today) || days[0], r = ctx.resultFor(ctx.UKC, latest), prev = r && ctx.previousFor(ctx.UKC, r);
    const card = d => () => resultCard(ctx, d);
    const sec1 = { label: r ? r.e.label.replace(/^./, c => c.toUpperCase()) : "Latest general election", note: "Who won, by how much, and where.", figTitle: "Seats won",
      items: [{ label: "The result", sub: r ? seatsLine(ctx, r) : "", card: card(latest), map: geMap(latest), children: () => geKids(ctx, latest) },
        { label: "Seats that changed hands", sub: "From who to whom, seat by seat", card: () => changedCard(ctx, latest), map: geMap(latest), children: () => changedKids(ctx, latest) },
        B.metric("ge_winner", { label: "Winners on the map", map: geMap(latest) }), B.metric("ge_share", { label: "Vote share by party" }), B.metric("ge_turnout"), B.metric("ge_majority"), B.metric("ge_to_flip"), B.metric("ge_second"),
        B.panel("seat", "Seat explorer", "Every seat: profile, results, MP, news")].filter(Boolean),
      figures: r ? Object.entries(r.seats).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([p, k]) => { const d = prev && prev.seats ? k - (prev.seats[p] || 0) : null; return { label: ctx.partyName(p), value: `${k} seats`, chg: d == null ? "" : d === 0 ? "no change" : `${d > 0 ? "▲" : "▼"} ${Math.abs(d)}`, colour: ctx.partyCol(p), card: card(latest), map: geMap(latest) }; }) : [] };
    const prevs = days.filter(d => d < latest);
    const sec2 = { label: "Previous general elections", note: `Every general election since ${prevs[prevs.length - 1].slice(0, 4)}: click one to see it on the map, seat by seat.`, figTitle: "Who won",
      items: prevs.map(d => { const x = ctx.resultFor(ctx.UKC, d); return x ? { label: x.e.label.replace(/^./, c => c.toUpperCase()), sub: seatsLine(ctx, x), card: card(d), map: geMap(d), children: () => geKids(ctx, d) } : null; }).filter(Boolean),
      figures: prevs.slice(0, 8).map(d => { const x = ctx.resultFor(ctx.UKC, d); if (!x) return null; const [p, k] = Object.entries(x.seats).sort((a, b) => b[1] - a[1])[0], mj = 2 * k - x.n; return { label: d.slice(0, 4), value: `${short(ctx, p)} ${k}`, chg: mj > 0 ? `majority ${mj}` : "hung", colour: ctx.partyCol(p), card: card(d), map: geMap(d) }; }).filter(Boolean) };
    const bys = ctx.ELX.filter(e => e.kind === "by").map(e => e.day).filter((d, i, a) => a.indexOf(d) === i).sort().reverse();
    const sec3 = { label: "By-elections", note: `${bys.length} by-election days since ${bys[bys.length - 1].slice(0, 4)}, newest first.`,
      items: bys.slice(0, 14).map(d => { const cs = [...new Set(byIndex(ctx)[d] || [])]; return { label: ctx.longDate(d), sub: cs.slice(0, 2).map(c => ctx.nameOf(c)).join(", ") + (cs.length > 2 ? ` +${cs.length - 2}` : ""), card: () => byCard(ctx, d), map: { date: d, level: "constituency", metrics: ["ge_winner"], focus: cs[0] },
        children: cs.length > 1 ? () => cs.map(c => ({ label: ctx.nameOf(c), sub: "Its by-election result", card: () => seatCard(ctx, c, d), map: { date: d, level: "constituency", metrics: ["ge_winner"], focus: c } })) : null }; }) };
    const sec4 = B.group("Westminster elections", "political", { label: "Swing, fairness and turnout", skip: ["ge_winner", "ge_share", "ge_turnout", "ge_majority", "ge_to_flip", "ge_second", "proj_winner"], note: "How the votes moved and how fairly they turned into seats." });
    const sec5 = { label: "Polls and what-ifs", items: [B.metric("proj_winner", { label: "Projected winner (polling average)" }), B.panel("projection", "Projection", "The polling average turned into seats"), B.panel("swing", "Swingometer", "What if national shares changed?")].filter(Boolean) };
    return { lede: "Every UK general election since 1997, seat by seat, with by-elections and the measures behind the results.", sections: [sec1, sec2, sec3, sec4, sec5] };
  };
  M.councils = (ctx, B) => ({ sections: [B.group("Local elections & councils", "political", { label: "Council elections and tax" }), B.group("Government & control", "political", { label: "Who's in control" }), B.group("Representation", "political", { label: "Who represents you" }), { label: "The full panel", items: [B.panel("councils", "Open Councils", "Control, make-up, council tax and actions for the council in focus")] }] });
  M.referendums = (ctx, B) => ({ sections: [B.group("Referendums", "political", { label: "EU referendum 2016" })] });
  M.protests = (ctx, B) => ({ sections: [B.group("Protests (test case)", "political", { label: "Protests since 1974" }), { label: "Lists", items: [B.panel("protests", "Open Protests", "Every protest, by cause and organiser")] }] });
  M.projection = (ctx, B) => ({ sections: [{ label: "Polls and projection", items: [B.metric("proj_winner"), B.panel("projection", "Open Projection", "The polling average turned into seats"), B.panel("swing", "Swingometer", "What if national shares changed?")].filter(Boolean) }, B.group("Ideology", "political", { label: "Where seats sit politically" })] });
  // ---------- Money: parties, donors, donations, contracts, meetings, each opening further ----------
  // Money › Parties › Conservative › Biggest donors › a donor › Public contracts. Summaries come from data/money.js; the
  // cards that need every donation load data/money_detail.js when first opened.
  function moneyTree(ctx, B) {
    const Mo = ctx.money; if (!Mo) return null; const D = Mo.data, esc = ctx.esc, V = AtlasCard.viz, g = Mo.gbp, Y = +ctx.today.slice(0, 4);
    const SRC = "Electoral Commission", mapSeat = { level: "constituency", metrics: ["money_received"] };
    const t5 = P => [0, 1, 2, 3, 4].reduce((s, i) => s + ((P.y[Y - i] || [0])[0]), 0), tot = P => Object.values(P.y).reduce((s, v) => s + v[0], 0);
    const yearsViz = (y, c) => V.bars(Object.keys(y || {}).sort().slice(-10).map(k => ({ v: Array.isArray(y[k]) ? y[k][0] : y[k], c, n: k })));
    const yearsChart = (y, c) => { const pts = Object.entries(y || {}).map(([k, v]) => [+k, Array.isArray(v) ? v[0] : v]); return pts.length ? `<div class="pc-chart">${ctx.CH.bars([{ name: "Registered donations", colour: c || "#7b4fa6", pts }], { w: 380, h: 170, vfmt: g, yfmt: g })}</div>` : ""; };
    const dn = id => (D.donors[id] || (Mo.detail && Mo.detail.donors[id]) || ["Donor " + id])[0], st = id => D.status[(D.donors[id] || [])[1]] || "Donor";
    const later = (title, f) => Mo.loadDetail().then(d => f(d)).catch(() => ({ app: "Politics", title, items: [{ k: "Couldn't load", h: "Every donation since 2010 didn't load; try again" }] }));
    const table = rows => `<table class="mo-tab">${rows.join("")}</table>`;
    // a party
    function partyCard(k) {
      const P = D.parties[k]; if (!P) return null; const ys = Object.keys(P.y), c = Mo.partyCol(k);
      return { app: "Politics", title: `${Mo.partyName(k)}: donations`, figs: [{ v: g(t5(P)), l: `${Y - 4}–${Y}` }, { v: g(tot(P)), l: `since ${ys[0]}` }, { v: String(P.top.length), l: "biggest donors listed" }], items: [
        { k: `Registered donations · since ${ys[0]}`, h: `<b>${g(tot(P))}</b> in all; <b>${g(t5(P))}</b> in ${Y - 4}–${Y}`, viz: yearsViz(P.y, c), open: true, more: yearsChart(P.y, c), map: mapSeat },
        { k: "Biggest donors", h: P.top.slice(0, 3).map(([id, v]) => `${esc(dn(id))} (${g(v)})`).join(", "), viz: V.bars(P.top.slice(0, 8).map(([, v]) => ({ v, c }))), more: table(P.top.slice(0, 20).map(([id, v]) => `<tr><td>${esc(dn(id))} <small>${esc(st(id))}</small>${D.contracts[id] ? ` <span class="mo-badge">contracts</span>` : ""}</td><td class="num">${g(v)}</td></tr>`)) },
        { k: "Where it comes from", h: "The Electoral Commission's register: every reportable donation since 2001", url: "https://search.electoralcommission.org.uk/", urlLabel: "The register" }],
        source: SRC, when: D.built, map: mapSeat, panel: "money" };
    }
    const partyRows = (d, k) => d.rows.filter(r => r[2] === "P" && r[3] === k);
    function partyKids(k) {
      const P = D.parties[k]; if (!P) return [];
      return [{ label: "Overview", sub: `${g(tot(P))} since ${Object.keys(P.y)[0]}`, card: () => partyCard(k), map: mapSeat },
        { label: "Biggest donors", sub: `The top ${Math.min(20, P.top.length)}`, children: () => P.top.slice(0, 20).map(([id, v]) => donorRow(id, `${g(v)} to ${Mo.partyName(k)}`)) },
        { label: "Donations by year", sub: "Each year, then its donations", children: () => Object.keys(P.y).sort().reverse().map(y => ({ label: y, sub: `${g(P.y[y][0])} · ${P.y[y][1]} donations`, card: () => later(`${Mo.partyName(k)} ${y}`, d => listCard(`${Mo.partyName(k)}: donations in ${y}`, partyRows(d, k).filter(r => r[0].startsWith(y)))) })) },
        { label: "Who gives", sub: "Individuals, companies, unions, societies", card: () => later("Who gives", d => { const rows = partyRows(d, k), by = {}; rows.forEach(r => { const s2 = (d.donors[r[4]] || [])[1] || "o"; by[s2] = (by[s2] || 0) + r[1]; }); const e = Object.entries(by).sort((a, b) => b[1] - a[1]);
          return { app: "Politics", title: `${Mo.partyName(k)}: who gives`, items: [{ k: "Since 2010, by kind of donor", h: e[0] ? `${esc(D.status[e[0][0]] || e[0][0])} gave most: <b>${g(e[0][1])}</b>` : "No donations", viz: V.stack(e.map(([s2, v], i) => ({ v, c: ["#7b4fa6", "#3b78b5", "#d0701c", "#13876b", "#9aa5ab"][i % 5], n: D.status[s2] || s2 }))), open: true, more: ctx.CH.ranked(e.map(([s2, v]) => ({ name: D.status[s2] || s2, v })), { w: 380, fmt: g }) }], source: SRC, when: D.built }; }) },
        { label: "Latest donations", sub: "The 30 most recent", card: () => later("Latest", d => listCard(`${Mo.partyName(k)}: latest donations`, partyRows(d, k).slice(0, 30))) },
        { label: "Loans", sub: "Registered loans", card: () => later("Loans", d => { const L = d.loans.filter(l => l[2] === k); return { app: "Politics", title: `${Mo.partyName(k)}: loans`, items: L.length ? L.slice(0, 20).map(l => ({ k: Mo.day(l[0]), h: `${esc(l[3])}: <b>${g(l[1])}</b>`, more: l[4] ? `<p>${esc(l[4])}</p>` : "" })) : [{ k: "Loans", h: "No registered loans" }], source: SRC, when: D.built }; }) },
        { label: "The party's full card", sub: "Everything in one window", isPanel: true, fn: () => Mo.openParty(k) }];
    }
    const partyRow = k => { const P = D.parties[k]; return { label: Mo.partyName(k), key: k, colour: Mo.partyCol(k), sub: `${g(t5(P))} in ${Y - 4}–${Y} · ${g(tot(P))} since ${Object.keys(P.y)[0]}`, card: () => partyCard(k), map: mapSeat, children: () => partyKids(k) }; };
    // a donor
    function donorCard(id) {
      const d0 = D.donors[id]; if (!d0) return null;
      return { app: "Politics", title: d0[0], figs: [{ v: g(d0[3]), l: "registered donations" }, d0[4] && d0[4] < 9999 ? { v: `${d0[4]}–${d0[5]}`, l: "years giving" } : null, D.contracts[id] ? { v: String(D.contracts[id].n), l: "public contracts since 2024" } : null], items: [
        { k: `${st(id)}${d0[2] ? ` · Companies House ${d0[2]}` : ""}`, h: `<b>${g(d0[3])}</b> in registered donations${d0[4] && d0[4] < 9999 ? `, ${d0[4]}–${d0[5]}` : ""}`, viz: V.big(g(d0[3]), "given"), open: true,
          more: `<p>To ${(d0[6] || []).map(k => esc(Mo.partyName(k))).join(", ") || "—"}.</p>${D.contracts[id] ? `<p class="mo-flag">Also a government supplier: ${D.contracts[id].n} contracts since 2024. Both are public record; it is not evidence that one led to the other.</p>` : ""}`,
          url: d0[2] ? `https://find-and-update.company-information.service.gov.uk/company/${d0[2]}` : null, urlLabel: "Companies House" }],
        source: SRC, when: D.built, panel: "money" };
    }
    const donorRows = (d, id) => d.rows.filter(r => r[4] === id);
    function donorKids(id) {
      const d0 = D.donors[id] || []; const out = [{ label: "Overview", sub: `${st(id)} · ${g(d0[3])}`, card: () => donorCard(id) }];
      if ((d0[6] || []).length) out.push({ label: "Given to", sub: (d0[6] || []).map(k => Mo.partyName(k)).join(", "), children: () => (d0[6] || []).filter(k => D.parties[k]).map(partyRow) });
      out.push({ label: "Every donation", sub: "Since 2010", card: () => later(dn(id), d => listCard(`${dn(id)}: every donation`, donorRows(d, id), true)) });
      if (D.contracts[id]) out.push({ label: "Public contracts", sub: `${D.contracts[id].n} since 2024`, card: () => later("Contracts", d => ({ app: "Politics", title: `${dn(id)}: public contracts`, items: (d.contracts[id] || []).filter((c, i, A) => A.findIndex(o => o[0] === c[0] && o[1] === c[1] && o[3] === c[3]) === i).slice(0, 25).map(c => ({ k: `${Mo.day(c[0])} · ${c[1]}`, h: `${esc(c[3])}${c[2] ? `: <b>${g(c[2])}</b>` : ""}`, url: c[4], urlLabel: "Notice" })), source: "Find a Tender", when: D.built })) });
      if (D.meetDonors && D.meetDonors[id]) out.push({ label: "Meetings with ministers", sub: `${D.meetDonors[id]} since July 2024`, card: () => later("Meetings", d => ({ app: "Politics", title: `${dn(id)}: meetings with ministers`, items: ((d.meetings || {})[id] || []).slice(0, 25).map(m => ({ k: `${Mo.day(m[0])} · ${m[2] || ""}`, h: esc(m[1]), more: m[4] ? `<p>${esc(m[4])}</p>` : "", url: m[5], urlLabel: "Release" })), source: "GOV.UK transparency releases", when: D.built })) });
      out.push({ label: "The donor's full card", isPanel: true, fn: () => Mo.openDonor(id) });
      return out;
    }
    const donorRow = (id, sub) => ({ label: dn(id), key: id, sub: sub || `${st(id)} · ${g((D.donors[id] || [])[3])}`, card: () => donorCard(id), children: () => donorKids(id) });
    // a list of donations as a card
    function listCard(title, rows, byRecipient) {
      const tot2 = rows.reduce((s2, r) => s2 + r[1], 0), rec = r => r[2] === "P" ? Mo.partyName(r[3]) : r[2] === "M" ? ((D.mps[r[3]] || {}).n || "an MP") : r[3];
      return { app: "Politics", title, lede: `${rows.length.toLocaleString("en-GB")} donations, <b>${g(tot2)}</b> in all.`, items: rows.slice(0, 40).map(r => ({ k: `${Mo.day(r[0])}${r[5] ? " · " + r[5] : ""}`, h: byRecipient ? `To ${esc(rec(r))}: <b>${g(r[1])}</b>` : `${esc(dn(r[4]))}: <b>${g(r[1])}</b>`, more: `<p>${esc(st(r[4]))}${r[7] && r[7] !== "cash" ? ` · ${esc(r[7])}` : ""}</p>` })), source: SRC, when: D.built };
    }
    const parties = Object.keys(D.parties).filter(k => tot(D.parties[k]) >= 1e5).sort((a, b) => t5(D.parties[b]) - t5(D.parties[a]) || tot(D.parties[b]) - tot(D.parties[a]));
    const donors = Object.keys(D.donors).sort((a, b) => D.donors[b][3] - D.donors[a][3]);
    const years = [...new Set(Object.values(D.parties).flatMap(P => Object.keys(P.y)))].filter(y => +y >= 2010).sort().reverse();
    return { noTabs: true, lede: "Registered political money: every party, donor, donation, loan and contract, each opening further.", sections: [
      { label: "Parties", key: "parties", note: `Largest in ${Y - 4}–${Y} first. Choose a party for its donors, years, loans and who gives.`, items: parties.slice(0, 30).map(partyRow), figTitle: `${Y - 4}–${Y}`,
        figures: parties.slice(0, 6).map(k => ({ label: Mo.partyName(k), value: g(t5(D.parties[k])), chg: `${g(tot(D.parties[k]))} since 2001`, colour: Mo.partyCol(k), card: () => partyCard(k) })) },
      { label: "Top donors", key: "donors", note: "The biggest donors since 2001. Choose one for who they gave to, every donation, contracts and meetings.", items: donors.slice(0, 40).map(id => donorRow(id)), figTitle: "Biggest",
        figures: donors.slice(0, 4).map(id => ({ label: dn(id), value: g(D.donors[id][3]), chg: st(id), card: () => donorCard(id) })) },
      { label: "Every donation", key: "latest", note: "Year by year since 2010; choose a year, then a party.", items: years.map(y => { const ps = parties.filter(k => D.parties[k].y[y]); const t = ps.reduce((s2, k) => s2 + D.parties[k].y[y][0], 0);
          return { label: y, sub: `${g(t)} to parties`, card: () => later(y, d => listCard(`Donations in ${y}`, d.rows.filter(r => r[0].startsWith(y)).sort((a, b) => b[1] - a[1]))), children: () => ps.sort((a, b) => D.parties[b].y[y][0] - D.parties[a].y[y][0]).map(k => ({ label: Mo.partyName(k), colour: Mo.partyCol(k), sub: `${g(D.parties[k].y[y][0])} · ${D.parties[k].y[y][1]} donations`, card: () => later(y, d => listCard(`${Mo.partyName(k)}: donations in ${y}`, partyRows(d, k).filter(r => r[0].startsWith(y)))) })) }; }) },
      { label: "Donors with contracts", key: "contracts", note: "Registered donors that have also won public contracts since 2024. Both are public record; it is not evidence that one led to the other.", items: Object.keys(D.contracts).sort((a, b) => D.contracts[b].v - D.contracts[a].v).slice(0, 40).map(id => donorRow(id, `${g((D.donors[id] || [])[3])} given · ${D.contracts[id].n} contracts`)) },
      { label: "Meetings with ministers", key: "lobby", note: "Organisations ministers met most since July 2024; those with a donor's name open further.", items: D.lobby.slice(0, 40).map(([org, n, did]) => did ? donorRow(did, `${n} meetings · also a donor`) : { label: org, sub: `${n} meetings`, card: () => ({ app: "Politics", title: org, items: [{ k: "Meetings with ministers since July 2024", h: `Ministers met ${esc(org)} <b>${n}</b> times`, viz: V.big(String(n), "meetings"), open: true, more: "<p>From each department's quarterly transparency release (GOV.UK).</p>" }], source: "GOV.UK", when: D.built }) }) },
      { label: "On the map", key: "map", items: [{ label: "By constituency", sub: "Donations to local parties and MPs, five years to the time bar's date", map: { level: "constituency", metrics: ["money_received"] }, metric: "money_received" }, { label: "By council", sub: "The same, council by council", map: { level: "council", metrics: ["money_received"] }, metric: "money_received" }] },
      B.group("Representation", "political", { label: "Representation" }),
      { label: "The full panel", items: [B.panel("money", "Open Money", "Every tab in one window")] }].filter(Boolean) };
  }
  M.money = (ctx, B) => moneyTree(ctx, B);
  window.AtlasPoliticsMenu = { resultCard, changedCard, byCard, seatCard };
})();
