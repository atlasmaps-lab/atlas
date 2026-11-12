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
  function resultCard(ctx, day) {
    const r = ctx.resultFor(ctx.UKC, day); if (!r) return null; const prev = ctx.previousFor(ctx.UKC, r), V = AtlasCard.viz, esc = ctx.esc;
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
    return { app: "Politics", title: r.e.label.replace(/^./, c => c.toUpperCase()), items, source: String(src).split(/[;(]/)[0].slice(0, 60), when: ctx.longDate(day), map: geMap(day), panel: "election", links: [{ label: "Commons Library briefing", url: "https://commonslibrary.parliament.uk/research-briefings/?query=general%20election%20results" }] };
  }
  function changedCard(ctx, day) {
    const rows = ctx.allCodesAt("constituency").map(c => { const r = ctx.resultFor(c, day); if (!r || r.agg || r.e.day !== day) return null; const p = ctx.previousFor(c, r); const w = r.cl[0][0], pw = p && p.cl && p.cl[0] ? p.cl[0][0] : null; return pw && pw !== w ? { c, w, pw, est: !!(p && p.est) } : null; }).filter(Boolean);
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

  M.election = (ctx, B) => {
    const days = ctx.GE_DAYS.slice().reverse(), latest = days.find(d => d <= ctx.today) || days[0], r = ctx.resultFor(ctx.UKC, latest), prev = r && ctx.previousFor(ctx.UKC, r);
    const card = d => () => resultCard(ctx, d);
    const sec1 = { label: r ? r.e.label.replace(/^./, c => c.toUpperCase()) : "Latest general election", note: "Who won, by how much, and where.", figTitle: "Seats won",
      items: [{ label: "The result", sub: r ? seatsLine(ctx, r) : "", card: card(latest), map: geMap(latest) },
        { label: "Seats that changed hands", sub: "From who to whom, seat by seat", card: () => changedCard(ctx, latest), map: geMap(latest) },
        B.metric("ge_winner", { label: "Winners on the map", map: geMap(latest) }), B.metric("ge_share", { label: "Vote share by party" }), B.metric("ge_turnout"), B.metric("ge_majority"), B.metric("ge_to_flip"), B.metric("ge_second"),
        B.panel("seat", "Seat explorer", "Every seat: profile, results, MP, news")].filter(Boolean),
      figures: r ? Object.entries(r.seats).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([p, k]) => { const d = prev && prev.seats ? k - (prev.seats[p] || 0) : null; return { label: ctx.partyName(p), value: `${k} seats`, chg: d == null ? "" : d === 0 ? "no change" : `${d > 0 ? "▲" : "▼"} ${Math.abs(d)}`, colour: ctx.partyCol(p), card: card(latest), map: geMap(latest) }; }) : [] };
    const prevs = days.filter(d => d < latest);
    const sec2 = { label: "Previous general elections", note: `Every general election since ${prevs[prevs.length - 1].slice(0, 4)}: click one to see it on the map, seat by seat.`, figTitle: "Who won",
      items: prevs.map(d => { const x = ctx.resultFor(ctx.UKC, d); return x ? { label: x.e.label.replace(/^./, c => c.toUpperCase()), sub: seatsLine(ctx, x), card: card(d), map: geMap(d) } : null; }).filter(Boolean),
      figures: prevs.slice(0, 8).map(d => { const x = ctx.resultFor(ctx.UKC, d); if (!x) return null; const [p, k] = Object.entries(x.seats).sort((a, b) => b[1] - a[1])[0], mj = 2 * k - x.n; return { label: d.slice(0, 4), value: `${short(ctx, p)} ${k}`, chg: mj > 0 ? `majority ${mj}` : "hung", colour: ctx.partyCol(p), card: card(d), map: geMap(d) }; }).filter(Boolean) };
    const bys = ctx.ELX.filter(e => e.kind === "by").map(e => e.day).filter((d, i, a) => a.indexOf(d) === i).sort().reverse();
    const sec3 = { label: "By-elections", note: `${bys.length} by-election days since ${bys[bys.length - 1].slice(0, 4)}, newest first.`,
      items: bys.slice(0, 14).map(d => { const cs = byIndex(ctx)[d] || []; return { label: ctx.longDate(d), sub: cs.slice(0, 2).map(c => ctx.nameOf(c)).join(", ") + (cs.length > 2 ? ` +${cs.length - 2}` : ""), card: () => byCard(ctx, d), map: { date: d, level: "constituency", metrics: ["ge_winner"], focus: cs[0] } }; }) };
    const sec4 = B.group("Westminster elections", "political", { label: "Swing, fairness and turnout", skip: ["ge_winner", "ge_share", "ge_turnout", "ge_majority", "ge_to_flip", "ge_second", "proj_winner"], note: "How the votes moved and how fairly they turned into seats." });
    const sec5 = { label: "Polls and what-ifs", items: [B.metric("proj_winner", { label: "Projected winner (polling average)" }), B.panel("projection", "Projection", "The polling average turned into seats"), B.panel("swing", "Swingometer", "What if national shares changed?")].filter(Boolean) };
    return { lede: "Every UK general election since 1997, seat by seat, with by-elections and the measures behind the results.", sections: [sec1, sec2, sec3, sec4, sec5] };
  };
  M.councils = (ctx, B) => ({ sections: [B.group("Local elections & councils", "political", { label: "Council elections and tax" }), B.group("Government & control", "political", { label: "Who's in control" }), B.group("Representation", "political", { label: "Who represents you" }), { label: "The full panel", items: [B.panel("councils", "Open Councils", "Control, make-up, council tax and actions for the council in focus")] }] });
  M.referendums = (ctx, B) => ({ sections: [B.group("Referendums", "political", { label: "EU referendum 2016" })] });
  M.protests = (ctx, B) => ({ sections: [B.group("Protests (test case)", "political", { label: "Protests since 1974" }), { label: "Lists", items: [B.panel("protests", "Open Protests", "Every protest, by cause and organiser")] }] });
  M.projection = (ctx, B) => ({ sections: [{ label: "Polls and projection", items: [B.metric("proj_winner"), B.panel("projection", "Open Projection", "The polling average turned into seats"), B.panel("swing", "Swingometer", "What if national shares changed?")].filter(Boolean) }, B.group("Ideology", "political", { label: "Where seats sit politically" })] });
  M.money = (ctx, B) => ({ sections: [{ label: "Money in politics", items: [B.metric("money_received"), B.panel("money", "Open Money", "Donations, loans, MPs' interests and donors with public contracts")].filter(Boolean), figures: [B.fig("money_received")].filter(Boolean) }, B.group("Representation", "political", { label: "Representation" })] });
  window.AtlasPoliticsMenu = { resultCard, changedCard, byCard };
})();
