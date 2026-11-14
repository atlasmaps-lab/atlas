/* Atlas 0.11 · the app bar's dropdown menus (core). Hover or click a heading in an app's bar (Election, Indicators, …)
 * and a menu drops down under the header, in four columns:
 *   1. the categories inside that heading (General election 2024, Previous elections, By-elections, …)
 *   2. what's in the category: each row opens its information card, and has Put on map, Workspace and Card buttons
 *   3. key figures for the category, as tiles (value and change); click one for its card
 *   4. what the heading is about, with "Open the full panel" and "Put on map"
 * Clicking a heading still puts what it's about on the map (the panel's `map`) and keeps the menu open; hovering only
 * shows it. Forms and tools (calculators, posting, directions) open their panel straight away, as before.
 *
 * A panel describes its menu with `menu: ctx => ({ sections: [{ label, note, items: [item], figures: [fig], figTitle }] })`
 * or views/<id>/menu.js sets AtlasMenus[appId][panelId] to the same function. Without one, Atlas builds a menu from the
 * panel's metrics and their groups. item = { label, sub, metric, card: () => cardSpec, map, panel, fn }
 * fig = { label, value, chg, tone ("good" | "bad" | ""), colour, metric, card, map }
 * Builders for both are in AtlasMenu.B (metric items, figures, breakdown sections, series cards).
 */
(function () {
  "use strict";
  let ctx = null, APP = null, H = {};
  const esc = t => String(t == null ? "" : t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const S = { open: null, pinned: false, sec: 0, spec: null, t: 0, hide: 0, path: [], sorts: {}, cols: new Set(), sel: null };
  const IC = {
    map: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-6.5-6.1-6.5-11A6.5 6.5 0 0 1 18.5 10c0 4.9-6.5 11-6.5 11z" fill="none" stroke="currentColor" stroke-width="1.7"/><circle cx="12" cy="10" r="2.3" fill="currentColor"/></svg>`,
    ws: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>`,
    card: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="3.5" width="16" height="17" rx="3" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M7.5 8h9M7.5 12h5M7.5 16h7" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>`,
    chev: `<svg class="ah-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  };

  // ---------- builders ----------
  const N = () => window.AtlasNarrative, C = () => window.AtlasCard;
  function val(m, c, d) { try { const r = m.get(c, d || ctx.date); return r && r.v != null && !r.nm && isFinite(r.v) ? r : null; } catch (e) { return null; } }
  const here = () => ctx.focused && ctx.P[ctx.focused] ? ctx.focused : ctx.UKC;
  // a metric's value where it means something: the place in focus, else the UK, else the top place at its level
  function metricNow(id, code) {
    const m = ctx.M[id]; if (!m) return null; const f = N() ? N().fmtOf(m) : String;
    for (const c of [code || here(), ctx.UKC, "E92000001"]) { const r = val(m, c); if (r) return { c, r, t: r.text || f(r.v), f }; }
    return null;
  }
  function metricChange(id, code) { // change since the previous point in its series, as [text, up]
    const m = ctx.M[id]; if (!m || !N() || m.temporal === "static" || m.temporal === "election") return null;
    const pts = N().series(m, code); if (pts.length < 2) return null;
    const [, a] = pts[pts.length - 2], [, b] = pts[pts.length - 1]; if (a == null || b == null) return null;
    const isP = N().isPts(m), d = isP ? b - a : a ? (b / a - 1) * 100 : null; if (d == null || !isFinite(d)) return null;
    return [`${d >= 0 ? "▲" : "▼"} ${Math.abs(d).toFixed(Math.abs(d) < 10 ? 1 : 0)}${isP ? " pt" : "%"}`, d >= 0];
  }
  const chgTxt = (a, b, isP) => isP ? (b === a ? "unchanged" : `${b > a ? "up" : "down"} ${Math.abs(b - a).toFixed(1)} points`) : a ? (b === a ? "unchanged" : `${b > a ? "up" : "down"} ${Math.abs((b / a - 1) * 100).toFixed(Math.abs(b / a - 1) < 0.1 ? 1 : 0)}%`) : "";
  // the places behind a metric, for its deeper columns: the highest, the lowest, and the regions and nations
  const PLV = { council: "councils", region: "regions", nation: "nations", constituency: "seats", ward: "wards" };
  function ranked(id, lv) {
    const m = ctx.M[id], f = N() ? N().fmtOf(m) : String;
    return ctx.allCodesAt(lv).map(c => { const r = val(m, c); return r ? { c, v: r.v, t: f(r.v) } : null; }).filter(Boolean).sort((a, b) => b.v - a.v);
  }
  const placeRow = (id, lv, r, i) => ({ v: r.v, label: ctx.nameOf(r.c), sub: `${i != null ? `${i + 1}. ` : ""}${r.t}`, card: () => C().metric(id, r.c), map: { metrics: [id], level: lv, focus: r.c } });
  function metricKids(id) {
    const m = ctx.M[id]; if (!m) return [];
    const lv = m.levels ? (m.levels.includes("council") ? "council" : m.levels[0]) : "council", nm = PLV[lv] || "places";
    const kids = [{ label: "The story", sub: "Latest, trend, why it moved, where it comes from", metric: id, map: { metrics: [id] } }];
    if (m.scale === "nominal" || m.nature === "event" || m.nature === "line") return kids;
    kids.push({ label: `Highest ${nm}`, sub: "Top 15", children: () => { const R = ranked(id, lv); return R.length >= 5 ? R.slice(0, 15).map((r, i) => placeRow(id, lv, r, i)) : []; } });
    kids.push({ label: `Lowest ${nm}`, sub: "Bottom 15", children: () => { const R = ranked(id, lv); return R.length >= 5 ? R.slice(-15).reverse().map((r, i) => placeRow(id, lv, r, R.length - 1 - i)) : []; } });
    if (!m.levels || m.levels.includes("region") || m.levels.includes("nation")) kids.push({ label: "Regions and nations", sub: "England's regions, Scotland, Wales, Northern Ireland", children: () => {
      const codes = ctx.allCodesAt("region").concat(["S92000003", "W92000004", "N92000002"]), f = N() ? N().fmtOf(m) : String;
      return codes.map(c => { const r = val(m, c); return r ? { c, v: r.v, t: f(r.v) } : null; }).filter(Boolean).sort((a, b) => b.v - a.v).map(r => placeRow(id, ctx.P[r.c] && ctx.P[r.c].level === "nation" ? "nation" : "region", r)); } });
    return kids;
  }
  const B = {
    metric(id, o) { // an item for one metric: its card, and deeper columns (highest, lowest, regions)
      const m = ctx.M[id]; if (!m) return null; o = o || {}; const now = metricNow(id);
      return { label: o.label || m.label, sub: o.sub != null ? o.sub : now ? `${now.t}${now.c !== ctx.UKC && now.c !== here() ? ` (${ctx.nameOf(now.c)})` : now.c === ctx.UKC ? " · UK" : ` · ${ctx.nameOf(now.c)}`}` : (m.desc || "").slice(0, 70), metric: id, map: Object.assign({ metrics: [id] }, o.map || {}), children: o.leaf ? null : () => metricKids(id) };
    },
    places: (id, lv) => ranked(id, lv), placeRow, metricKids,
    fig(id, o) { // a key-figure tile for one metric
      const m = ctx.M[id]; if (!m) return null; o = o || {}; const now = metricNow(id); if (!now) return null; const ch = metricChange(id, now.c);
      return { label: o.label || m.label, value: now.t, chg: ch ? ch[0] : now.c === ctx.UKC ? "UK" : ctx.nameOf(now.c), tone: ch && o.good ? ((o.good === "up") === ch[1] ? "good" : "bad") : "", metric: id, map: { metrics: [id] } };
    },
    group(label, p, o) { // a section with every metric in a group (skipping breakdown helpers)
      o = o || {};
      const ms = ctx.METRICS.filter(m => m.group === label && (!p || m.p === p) && !/_(lq|top)$/.test(m.id) && !(/_share$/.test(m.id) && ctx.bd.spec(m.id.replace(/_share$/, ""))) && !(o.skip || []).includes(m.id) && m.nature !== "line");
      if (!ms.length) return null;
      return { label: o.label || label, note: o.note, items: ms.slice(0, o.max || 14).map(m => B.metric(m.id)).filter(Boolean), figures: ms.filter(m => m.scale !== "nominal" && m.nature !== "event").slice(0, 4).map(m => B.fig(m.id)).filter(Boolean) };
    },
    bd(id, o) { // a section for a breakdown (industries, causes of death, Census topics): its largest categories, UK-wide
      o = o || {}; const spec = ctx.bd.spec(id); if (!spec) return null;
      const code = o.code || here(), d = ctx.bd.of(id, code) || ctx.bd.of(id, ctx.UKC); if (!d) return null;
      const tot = Object.values(d).reduce((a, b) => a + b, 0), where = ctx.bd.of(id, code) ? (code === ctx.UKC ? "UK" : ctx.nameOf(code)) : "UK";
      const cats = Object.keys(d).filter(k => d[k] > 0).sort((a, b) => d[b] - d[a]);
      const lvN = !spec.levels || spec.levels.includes("council") ? "Councils" : "Regions and nations";
      const card = k => () => (spec.cardFor && spec.cardFor(k)) || B.bdCard(id, k);   // 0.12.1: a breakdown can have its own story and paths
      return { label: o.label || spec.label, note: o.note || `Largest first, ${where}. Click one to map its share.`,
        items: cats.slice(0, o.max || 12).map(k => ({ v: d[k], label: spec.name(k), colour: spec.colour(k), sub: `${(100 * d[k] / tot).toFixed(1)}% · ${ctx.bd.fmt(id, d[k])}`, card: card(k), map: { metrics: [id + "_share"], pick: [id, k] },
          children: () => (spec.kidsFor && spec.kidsFor(k)) || [{ label: `${spec.name(k)}: the card`, sub: `Here, against the UK, and what it tells us`, card: card(k), map: { metrics: [id + "_share"], pick: [id, k] } },
            { label: "Where it's largest", sub: `${lvN} with the biggest share`, children: () => B.bdPlaces(id, k, false) }, { label: "Where it's smallest", sub: `${lvN} with the smallest share`, children: () => B.bdPlaces(id, k, true) }] })),
        figures: cats.slice(0, 4).map(k => ({ label: spec.name(k), value: (100 * d[k] / tot).toFixed(1) + "%", chg: where, colour: spec.colour(k), card: card(k), map: { metrics: [id + "_share"], pick: [id, k] } })), figTitle: "Largest" };
    },
    bdPlaces(id, k, low) { // councils by their share of one category, each opening that council's card for it
      const sh = x => { if (!x) return null; const t = Object.values(x).reduce((a, b) => a + b, 0); return t ? 100 * (x[k] || 0) / t : null; };
      const spec = ctx.bd.spec(id), lv = !spec.levels || spec.levels.includes("council") ? "council" : "region";   // 0.12.1: breakdowns published for regions only list regions (it was empty)
      const rows = ctx.allCodesAt(lv).concat(lv === "region" ? ["S92000003", "W92000004", "N92000002"] : []).map(c => ({ c, s: sh(ctx.bd.of(id, c)) })).filter(r => r.s != null).sort((a, b) => low ? a.s - b.s : b.s - a.s);
      return rows.slice(0, 15).map((r, i) => ({ v: r.s, label: ctx.nameOf(r.c), sub: `${i + 1}. ${r.s.toFixed(1)}%`, card: () => B.bdCard(id, k, r.c), map: { metrics: [id + "_share"], pick: [id, k], level: lv, focus: r.c } }));
    },
    bdCard(id, k, at) { // the card for one category of a breakdown
      const spec = ctx.bd.spec(id), code = at || here(), d = ctx.bd.of(id, code), uk = ctx.bd.of(id, ctx.UKC), V = C().viz;
      const sh = (x, key) => { if (!x) return null; const t = Object.values(x).reduce((a, b) => a + b, 0); return t ? 100 * (x[key] || 0) / t : null; };
      const s = sh(d, k), su = sh(uk, k), name = spec.name(k), where = code === ctx.UKC ? "the UK" : ctx.nameOf(code);
      const lv = ctx.P[code] && ctx.P[code].level === "region" ? "region" : "council", rows = ctx.allCodesAt(lv).map(c => ({ c, s: sh(ctx.bd.of(id, c), k) })).filter(r => r.s != null).sort((a, b) => b.s - a.s);
      const items = [{ k: code === ctx.UKC ? "" : where, h: s != null ? `${esc(name)} is <b>${s.toFixed(1)}%</b> of ${esc(spec.label.toLowerCase())} in ${esc(where)}${su != null && code !== ctx.UKC ? `, against ${su.toFixed(1)}% in the UK` : ""}` : `No figures for ${esc(where)}`, viz: d ? V.stack(Object.keys(d).sort((a, b) => d[b] - d[a]).slice(0, 12).map(x => ({ v: d[x], c: x === k ? "#d0701c" : spec.colour(x), n: spec.name(x) }))) : "", open: true,
        more: s != null && su ? `<p>That is ${(s / su).toFixed(2)} times the UK share: ${s / su > 1.25 ? "more concentrated here than in most places" : s / su < 0.8 ? "less common here than across the UK" : "close to the UK as a whole"}.</p>` : "", map: { metrics: [id + "_share"], pick: [id, k] } }];
      if (rows.length >= 5) items.push({ k: `Where it's largest · ${rows.length} ${lv === "region" ? "regions" : "councils"}`, h: `Highest in ${esc(ctx.nameOf(rows[0].c))} (${rows[0].s.toFixed(1)}%), lowest in ${esc(ctx.nameOf(rows[rows.length - 1].c))} (${rows[rows.length - 1].s.toFixed(1)}%)`,
        viz: V.bars(rows.slice(0, 6).map((r, i) => ({ v: r.s, c: r.c === code ? "#d0701c" : i ? "#9aa5ab" : "#3b78b5", n: ctx.nameOf(r.c) }))), more: "", map: { metrics: [id + "_share"], pick: [id, k], level: lv },
        deep: rows.slice(0, 8).concat(rows.slice(-3)).filter((r, i, a) => a.indexOf(r) === i).map(r => ({ label: ctx.nameOf(r.c), sub: `${rows.indexOf(r) + 1} of ${rows.length}`, v: r.s.toFixed(1) + "%", fn: () => B.bdCard(id, k, r.c) })), deepTitle: "Highest, then lowest" });
      // 0.12.1: what else makes up the total here, each its own card
      if (d) { const ks = Object.keys(d).filter(x => d[x] > 0).sort((a, b) => d[b] - d[a]), tt = ks.reduce((a, x) => a + d[x], 0);
        if (ks.length > 2) items.splice(1, 0, { k: `Everything in ${spec.label.toLowerCase()} · ${where}`, h: `${esc(name)} is ${ks.indexOf(k) + 1} of ${ks.length}; the largest is ${esc(spec.name(ks[0]))} (${(100 * d[ks[0]] / tt).toFixed(1)}%)`, viz: V.stack(ks.slice(0, 12).map(x => ({ v: d[x], c: x === k ? "#d0701c" : spec.colour(x), n: spec.name(x) }))),
          deep: ks.slice(0, 15).map(x => ({ label: spec.name(x), sub: x === k ? "this one" : "", v: (100 * d[x] / tt).toFixed(1) + "%", c: spec.colour(x), fn: () => (spec.cardFor && code === ctx.UKC && spec.cardFor(x)) || B.bdCard(id, x, code) })) }); }
      if (spec.source || spec.desc) items.push({ k: "Where it comes from", h: esc(String(spec.source || spec.label).replace(/https?:\/\/\S+/g, "").slice(0, 140)), more: `${spec.desc ? `<p><b>What it measures.</b> ${esc(spec.desc)}</p>` : ""}${spec.how ? `<p><b>How it's counted.</b> ${esc(spec.how)}</p>` : ""}`, url: (String(spec.source || "").match(/https?:\/\/[^\s;),]+/) || [])[0] });
      return { app: APP ? APP.short || APP.name : "", title: name, items, source: String(spec.source || "Atlas").split(/[;(.]/)[0].slice(0, 60), when: spec.yr ? spec.yr(code) : "", map: { metrics: [id + "_share"], pick: [id, k] } };
    },
    // a card for a series that isn't a map metric (the UK's monthly indicators): latest, trend, why it moved, source
    series(o) { // o = { title, app, pts [[x, v]], fmt, unit ("%" = points), topics, good, period (x -> label), src, url, next, means, trust, map }
      const V = C().viz, pts = (o.pts || []).filter(p => p[1] != null), n = pts.length; if (!n) return { app: o.app, title: o.title, items: [{ k: "No data", h: "Nothing loaded for this series" }] };
      const isP = o.unit === "%", f = o.fmt || (v => v.toFixed(1)), last = pts[n - 1], prev = pts[n - 2], per = o.period || (x => String(Math.floor(x)));
      const d = prev ? (isP ? last[1] - prev[1] : prev[1] ? (last[1] / prev[1] - 1) * 100 : null) : null;
      const yr = pts.filter(p => p[0] <= last[0] - 0.95).slice(-1)[0], dy = yr ? (isP ? last[1] - yr[1] : yr[1] ? (last[1] / yr[1] - 1) * 100 : null) : null;
      const w = C().why(pts, o.topics || [], { pts: isP, fmt: f, period: per });
      let hi = pts[0], lo = pts[0]; pts.forEach(p => { if (p[1] > hi[1]) hi = p; if (p[1] < lo[1]) lo = p; });
      const items = [
        { k: `Latest · ${per(last[0])}`, h: `${esc(o.title)}: <b>${esc(f(last[1]))}</b>${d != null && isFinite(d) ? `, ${d === 0 ? "unchanged" : `${d > 0 ? "up" : "down"} ${Math.abs(d).toFixed(isP ? 2 : 1)}${isP ? " points" : "%"}`} on ${esc(per(prev[0]))}` : ""}`, viz: V.spark(pts.slice(-36), "var(--pc-acc, currentColor)"), open: true,
          more: `<p>${dy != null && isFinite(dy) ? `A year earlier it was ${esc(f(yr[1]))} (${esc(per(yr[0]))}), so it is ${dy >= 0 ? "up" : "down"} ${Math.abs(dy).toFixed(isP ? 2 : 1)}${isP ? " points" : "%"} on the year. ` : ""}Over the ${n} periods Atlas holds, it was highest in ${esc(per(hi[0]))} (${esc(f(hi[1]))}) and lowest in ${esc(per(lo[0]))} (${esc(f(lo[1]))}).</p>` },
        { k: `The trend · since ${per(pts[0][0])}`, h: esc(`From ${f(pts[0][1])} in ${per(pts[0][0])} to ${f(last[1])} in ${per(last[0])}, ${chgTxt(pts[0][1], last[1], isP)}${hi[0] !== last[0] && hi[0] !== pts[0][0] ? `; highest in ${per(hi[0])} (${f(hi[1])})` : ""}`), viz: "", more: `<div class="pc-chart">${ctx.CH.line([{ name: o.title, colour: "#3b78b5", pts }], { w: 380, h: 200, vfmt: f, yfmt: v => ctx.CH.compact ? ctx.CH.compact(v) : String(v), events: w.events })}</div>${C().evList(w.events)}` },
        { k: "Why it moved", h: w.lines.length ? esc(w.lines[0].replace(/<[^>]+>/g, "").split(/(?<=\.)\s/)[0].replace(/\.$/, "")) : "No sharp moves stand out", viz: V.big(String(w.events.length), w.events.length === 1 ? "event" : "events"), more: C().whyHTML(w) },
      ];
      // 0.12: "What it tells us" only from the figures (o.tells); the definition sits with the source
      if ((o.tells || []).length) items.splice(1, 0, { k: "What it tells us", h: esc(o.tells[0].replace(/\.$/, "")), more: `<p>${esc(o.tells.join(" "))}</p>`, open: true });
      if (o.src || o.next || o.means) items.push({ k: o.next ? `Next release · ${o.next}` : "Where it comes from", h: esc(o.src || ""), more: o.means ? `<p><b>What it measures.</b> ${esc(o.means)}</p>` : "", url: o.url, urlLabel: "Source" });
      const figs = [{ v: f(last[1]), l: per(last[0]) }, d != null && isFinite(d) ? { v: `${d >= 0 ? "▲" : "▼"} ${Math.abs(d).toFixed(isP ? 2 : 1)}${isP ? " pt" : "%"}`, l: `on ${per(prev[0])}` } : null, dy != null && isFinite(dy) ? { v: `${dy >= 0 ? "▲" : "▼"} ${Math.abs(dy).toFixed(isP ? 2 : 1)}${isP ? " pt" : "%"}`, l: "on a year earlier" } : null];
      return { app: o.app, title: o.title, figs, items, source: String(o.src || "Atlas").split(/[;(]/)[0].slice(0, 60), when: per(last[0]), map: o.map || null, links: o.url ? [{ label: "Source", url: o.url }] : [] };
    },
    panel(id, label, sub) { return { label: label || "Open the full panel", sub: sub || "", panel: id, isPanel: true }; },
  };

  // ---------- the automatic menu, for panels without their own ----------
  function auto(x) {
    const p = APP.perspective, ms = (x.map && !(typeof x.map === "function") && x.map.metrics || []).filter(id => ctx.M[id]);
    const groups = [...new Set(ms.map(id => ctx.M[id].group))];
    const secs = [{ label: "Overview", note: x.blurb || "", items: [B.panel(x.id, `Open ${x.title}`, x.blurb || "Everything in one panel")].concat(ms.map(id => B.metric(id))).filter(Boolean), figures: ms.map(id => B.fig(id)).filter(Boolean) }];
    groups.forEach(g => { const s = B.group(g, p); if (s && s.items.length > 1) secs.push(s); });
    return { sections: secs };
  }
  function specFor(x) {
    let f = x.menu || ((window.AtlasMenus || {})[APP.id] || {})[x.id];
    let s; try { s = f ? f(ctx, B) : auto(x); if (s && s.sections) s.sections = s.sections.filter(sc => sc && ((sc.items || []).length || (sc.figures || []).length)); if (!(s && s.sections && s.sections.length)) s = auto(x); } catch (e) { console.error(e); s = auto(x); }
    // 0.12.1: two sections with the same name (two "The full panel"s) become one, holding both
    if (s && s.sections) { const by = new Map(); s.sections = s.sections.filter(sc => { const t = by.get(sc.label); if (!t) { by.set(sc.label, sc); return true; } t.items = (t.items || []).concat(sc.items || []); if (sc.figures) t.figures = (t.figures || []).concat(sc.figures); return false; }); }
    // 0.10.1: a panel with tabs of its own (Money's Parties, Donors, …) lists them, to open the panel at that tab
    const tabs = H.tabs ? H.tabs(x) : null;
    if (tabs && !s.noTabs) s.sections.unshift({ label: `${x.title}: its tabs`, note: "Opens the full panel at that tab.", items: tabs.map(([k, l]) => ({ label: l, sub: `${x.title} › ${l}`, isPanel: true, key: k, fn: () => H.openTab(x.id, k) })) });
    return s;
  }
  // a heading drops down a menu when it has its own, or metrics to build one from; otherwise it opens its panel
  const hasMenu = x => x.menu !== false && x.editorial !== false && !APP.tools.includes(x) && !!(x.menu || (H.tabs && H.tabs(x)) || ((window.AtlasMenus || {})[APP.id] || {})[x.id] || (x.map && typeof x.map !== "function" && (x.map.metrics || []).some(id => ctx.M[id])));

  // ---------- drawing: columns that stack ----------
  // A row can have children (it.children: an array, or a function that builds them when first opened). Choosing such a row
  // opens a new column beside it, and so on down (Money › Parties › Conservative › Biggest donors › a donor). Rows without
  // children open their card. Three columns of rows show at once; deeper, the first ones fold into a "‹ Back" link.
  let el = null;
  // children may still be loading: a row marked { loading: true } isn't kept, so the column is built again once ready
  const kidsOf = it => { if (!it || !it.children) return null; if (!it._kids) { let k; try { k = (typeof it.children === "function" ? it.children() : it.children) || []; } catch (e) { console.error(e); k = []; } k = k.filter(Boolean); if (k.some(x => x.loading)) return k; it._kids = k; } return it._kids.length ? it._kids : null; };
  const refresh = () => { if (el && !el.hidden && S.spec) render(); };
  const figsOf = it => { if (!it || !it.figures) return null; if (!it._figs) { try { it._figs = (typeof it.figures === "function" ? it.figures() : it.figures) || []; } catch (e) { it._figs = []; } it._figs = it._figs.filter(Boolean); } return it._figs.length ? it._figs : null; };
  function lists() { // the open columns: the section's rows, then each chosen row's children
    const s = S.spec, sec = s.sections[Math.min(S.sec, s.sections.length - 1)] || s.sections[0];
    const out = [{ title: sec.label, note: sec.note, items: (sec.items || []).filter(Boolean) }]; let figs = (sec.figures || []).filter(Boolean), figTitle = sec.figTitle;
    for (let d = 0; d < S.path.length; d++) {
      const it = out[d].items[S.path[d]]; if (!it) { S.path.length = d; break; }
      const f = figsOf(it); if (f) { figs = f; figTitle = it.figTitle || it.label; }
      const k = kidsOf(it); if (!k) { S.path.length = d + 1; break; }
      out.push({ title: it.label, note: it.note, items: k, parent: it });
    }
    return { sec, out, figs, figTitle };
  }
  const rowHTML = (it, d, i, chosen) => it.loading ? `<div class="mg-it mg-loading"><span class="mg-go"><span class="mg-l">${esc(it.label)}</span>${it.sub ? `<small>${esc(it.sub)}</small>` : ""}</span></div>` : `<div class="mg-it${it.isPanel ? " mg-full" : ""}${chosen ? " on" : ""}${kidsOf(it) || it.children ? " has-kids" : ""}"><button type="button" class="mg-go" data-mit="${d}:${i}"${it.key ? ` data-mkey="${esc(it.key)}"` : ""}${it.children ? ` aria-haspopup="true" aria-expanded="${chosen ? "true" : "false"}"` : ""} role="menuitem">${it.colour ? `<i class="mg-dot" style="background:${esc(it.colour)}"></i>` : ""}<span class="mg-l">${esc(it.label)}</span>${it.sub ? `<small>${esc(it.sub)}</small>` : ""}</button>
    ${it.isPanel ? "" : `<span class="mg-acts">${it.map || it.metric ? `<button type="button" data-mact="map" data-mi="${d}:${i}" title="Put on map" aria-label="Put ${esc(it.label)} on the map">${IC.map}</button>` : ""}${it.card || it.metric ? `<button type="button" data-mact="ws" data-mi="${d}:${i}" title="Send to workspace" aria-label="Send ${esc(it.label)} to the workspace">${IC.ws}</button><button type="button" data-mact="card" data-mi="${d}:${i}" title="Create an information card" aria-label="Card for ${esc(it.label)}">${IC.card}</button>` : ""}</span>`}${it.children ? `<span class="mg-more" aria-hidden="true">›</span>` : ""}</div>`;
  // ---------- 0.13: the contents page (Atlas design/menus/Menus (final).md) ----------
  // A heading is a group of panels. Its dropdown: a plain sentence and the headline figures; one column per section,
  // closed until clicked (name, count, arrow), opening in place to its summary, a share bar, its top five and See all;
  // below, the chosen section's full list (sortable) and a preview of the chosen row with its next steps as chips.
  const groupSpec = g => { // every section of every panel in the group, each knowing its panel
    const secs = [], figs = [], links = [];
    g.panels.forEach(x => { if (!hasMenu(x)) { links.push(x); return; } const sp = specFor(x); links.push(x); const own = sp.lede || x.blurb; let firstOf = true; (sp.sections || []).forEach(sc => { if (firstOf && own && g.lede && own !== g.lede) { sc = Object.assign({}, sc, { note: sc.note ? `${own} ${sc.note}` : own }); } firstOf = false; const items = (sc.items || []).filter(it => it && (!it.isPanel || it.key != null)); if (!items.length && !(sc.figures || []).length) return; secs.push(Object.assign({}, sc, { items: items.length ? items : sc.items, panel: x })); }); (sp.sections || []).forEach(sc => { const fs = (sc.figures || []).filter(Boolean); if (sc.figFirst) figs.unshift(...fs); else figs.push(...fs); }); if (!g.lede && (sp.lede || x.blurb)) g.lede = sp.lede || x.blurb; });
    // panels that are forms or tools (Directions, Feed, Floods…) are rows of their own section, each opening its panel
    const forms = g.panels.filter(x => !hasMenu(x));
    forms.forEach(x => { const tabs = H.tabs ? H.tabs(x) : null; if (tabs) secs.push({ label: `${x.title}: its tabs`, note: "Opens it at that tab.", items: tabs.map(([k, l]) => ({ label: l, sub: `${x.title} › ${l}`, isPanel: true, key: k, fn: () => H.openTab(x.id, k) })), panel: x }); });
    if (forms.length) secs.push({ label: g.panels.length === forms.length ? `In ${g.label}` : "More here", note: "Each opens its own panel.", items: forms.map(x => ({ label: x.title, sub: x.blurb || "", fn: () => H.openFull(x.id) })), panel: forms[0] });
    // sections with the same name from two panels become one, holding both lists (no row repeated)
    const by = new Map(), merged = []; secs.forEach(sc => { const t = by.get(sc.label); if (!t) { by.set(sc.label, sc); merged.push(sc); return; } const have = new Set((t.items || []).map(it => it.label)); t.items = (t.items || []).concat((sc.items || []).filter(it => !have.has(it.label))); });
    // 0.13: sections holding exactly the same rows under different names (Export partners, Who buys from us) become one
    const sig = sc => (sc.items || []).filter(Boolean).map(it => it.label).join("|"), seenSig = new Set();
    for (let i = 0; i < merged.length; i++) { const k = sig(merged[i]); if (!k) continue; if (seenSig.has(k)) merged.splice(i--, 1); else seenSig.add(k); }
    const seenF = new Set(), figsU = figs.filter(f => { const k = f.label; if (seenF.has(k)) return false; seenF.add(k); return true; });
    return { sections: merged, figures: figsU, links, lede: g.lede || "" };
  };
  const short = t => String(t == null ? "" : t).replace(/\s*\(.*$/, "").replace(/\s+(a person|a head|businesses|people)$/i, "").trim();
  const valOf = it => short(it.vt || (it.sub ? String(it.sub).split(" · ")[0].replace(/^\d+\.\s+/, "") : ""));
  const numOf = it => typeof it.v === "number" && isFinite(it.v) ? it.v : null;
  function render() {
    const g = S.open, s = S.spec; if (!g || !s) return;
    el.style.setProperty("--app", APP.accent);
    const k = S.anim = (S.anim || 0) + (S.bump ? 1 : 0); S.bump = false;
    const figs = s.figures.slice(0, 4), cols = s.sections, openSet = S.cols;
    const figHTML = figs.map((f, i) => `<button type="button" class="mgc-fig" data-mfig="${i}" style="animation-delay:${i * 50}ms" title="${esc(f.label + ": " + f.value)}"><b>${esc(short(f.value))}</b><span>${esc(f.label)}</span>${f.chg ? `<em class="${f.tone === "good" ? "up" : f.tone === "bad" ? "down" : ""}">${esc(f.chg)}</em>` : ""}</button>`).join("");
    const focus = openSet.size ? [...openSet].pop() : null;   // 0.13: one section open: it grows to the left over two columns, its news beside it
    const colHTML = cols.map((sc, i) => { const on = openSet.has(i), items = (sc.items || []).filter(Boolean), nums = items.filter(it => numOf(it) != null && numOf(it) > 0), tot = nums.reduce((a, it) => a + numOf(it), 0), share = nums.length >= 2 && nums.length >= items.length * 0.6 && items.some(it => it.colour);
      const top = items.slice(0, 5);
      if (focus != null && i !== focus) return "";
      return `<section class="mgc-col${on ? " on" : ""}${i === S.sec && on ? " cur" : ""}${focus === i ? " mgc-wide" : ""}" style="animation-delay:${focus === i ? 0 : 80 + i * 60}ms" data-msec="${i}">
        <button type="button" class="mgc-h" data-mcol="${i}" aria-expanded="${on}"><span>${esc(sc.label)}</span><small>${on ? "" : items.length}</small><i class="mgc-arr" aria-hidden="true">›</i></button>
        ${on ? `<div class="mgc-body">${sc.note ? `<p class="mgc-sum">${esc(sc.note)}</p>` : ""}${share ? `<div class="mgc-stack">${nums.slice(0, 8).map(it => `<i class="atl-fill" style="width:${(100 * numOf(it) / tot).toFixed(2)}%;background:${esc(it.colour || "var(--cat1)")}"></i>`).join("")}</div>` : ""}
          ${(focus === i ? items.slice(0, 8) : top).map((it, j) => `<button type="button" class="mgc-row" data-mtop="${i}:${j}">${it.colour ? `<i class="mg-dot" style="background:${esc(it.colour)}"></i>` : ""}<span>${esc(it.label)}</span><b>${esc(valOf(it).slice(0, 22))}</b></button>`).join("")}
          ${items.length > (focus === i ? 8 : 5) ? `<button type="button" class="mgc-see" data-mcol="${i}" data-msee="1">See all ${items.length} ›</button>` : ""}</div>` : ""}</section>`; }).join("")
      + (focus != null ? `<aside class="mgc-news" data-mnews aria-live="polite"><div class="mgc-nh">News<span class="vr"></span><span class="mgc-nabout"></span></div><div class="mgc-nbody"><p class="mgc-nwait">Finding news…</p></div></aside>` : "");
    let detail = "";
    if (openSet.size && cols[S.sec]) {
      const { out } = lists(), d = out.length - 1, L = out[d], sk = `${S.sec}:${S.path.join(".")}`, so = S.sorts[sk] || "", nv = L.items.filter(it => numOf(it) != null).length >= Math.max(3, L.items.length * 0.6);
      const order = L.items.map((it, i) => i); if (so === "az") order.sort((a, b) => String(L.items[a].label).localeCompare(String(L.items[b].label))); else if (nv && so) order.sort((a, b) => { const x = numOf(L.items[a]), y = numOf(L.items[b]); if (x == null) return 1; if (y == null) return -1; return so === "asc" ? x - y : y - x; });
      const mx = Math.max(1e-9, ...L.items.map(it => Math.abs(numOf(it) || 0))), sel = S.sel != null ? L.items[S.sel] : null;
      const crumbs = [APP.short || APP.name.replace(/^Atlas /, ""), g.label, cols[S.sec].label].concat(out.slice(1).map(o => o.title));
      const kids = sel ? kidsOf(sel) : null;
      detail = `<div class="mgc-detail"><div class="mgc-list"><div class="mgc-dh"><span class="mgc-kick">${crumbs.map(esc).join('<span class="vr"></span>')}</span>${d > 0 ? `<button type="button" class="mg-back" data-mback="${d}">‹ ${esc(out[d - 1].title)}</button>` : ""}<span style="flex:1"></span>
          <span class="mgc-sorts" role="group" aria-label="Sort">${nv ? `<button type="button" data-msort="${sk}|desc" class="${so === "desc" || !so ? "on" : ""}">Largest first</button><button type="button" data-msort="${sk}|asc" class="${so === "asc" ? "on" : ""}">Smallest first</button>` : ""}<button type="button" data-msort="${sk}|az" class="${so === "az" ? "on" : ""}">A–Z</button></span></div>
        <div class="mgc-rows">${order.map((i, n) => { const it = L.items[i], v = numOf(it); return `<div class="mg-it mgc-it${S.sel === i ? " on" : ""}${it.children ? " has-kids" : ""}" style="animation-delay:${Math.min(n, 12) * 25}ms"><span class="mgc-rk">${n + 1}</span><button type="button" class="mg-go" data-mit="${d}:${i}"${it.key ? ` data-mkey="${esc(it.key)}"` : ""} role="menuitem">${it.colour ? `<i class="mg-dot" style="background:${esc(it.colour)}"></i>` : ""}<span class="mg-l">${esc(it.label)}</span>${it.sub ? `<small>${esc(it.sub)}</small>` : ""}</button>${v != null ? `<span class="mgc-bar"><i class="atl-fill" style="width:${(100 * Math.abs(v) / mx).toFixed(1)}%"></i></span>` : ""}${it.children ? `<span class="mg-more" aria-hidden="true">›</span>` : ""}</div>`; }).join("")}</div></div>
        <aside class="mgc-pv">${sel ? `<div class="mgc-pvk">${esc(L.title)}</div><div class="mgc-pvt">${esc(sel.label)}</div>${sel.sub ? `<div class="mgc-pvs">${esc(sel.sub)}</div>` : ""}
          ${kids ? `<div class="mgc-chips">${kids.slice(0, 8).map((c, j) => `<button type="button" class="mgc-chip" data-mkid="${j}">${esc(c.label)} <b>›</b></button>`).join("")}${kids.length > 8 || kids.some(c => c.children) ? `<button type="button" class="mgc-chip go" data-mdeep="1">Go deeper ›</button>` : ""}</div>` : ""}
          <div class="mgc-acts">${sel.card || sel.metric ? `<button type="button" data-mact="card" data-mi="${d}:${S.sel}">Open its card</button>` : ""}${sel.map || sel.metric ? `<button type="button" data-mact="map" data-mi="${d}:${S.sel}">Put it on the map</button>` : ""}${sel.card || sel.metric ? `<button type="button" data-mact="ws" data-mi="${d}:${S.sel}">☆ Workspace</button>` : ""}</div>`
          : `<div class="mgc-pvs">Choose a row to see what it is and where it leads.</div>`}</aside></div>`;
    }
    el.innerHTML = `<div class="mg-in mgc" role="menu" aria-label="${esc(g.label)}" data-k="${k}">
      <div class="mgc-top"><div class="mgc-l"><div class="mgc-kick">${esc(APP.short || APP.name.replace(/^Atlas /, ""))}<span class="vr"></span>${esc(g.label)}</div><p class="mgc-lede">${esc(s.lede)}</p></div><div class="mgc-figs">${figHTML}</div></div>
      ${cols.length ? `<div class="mgc-cols${focus != null ? " mgc-focus" : ""}" style="--n:${Math.min(4, cols.length)}">${colHTML}</div>` : ""}${detail}
      <div class="mgc-foot">${s.links.map(x => `<button type="button" class="mgc-open" data-mfull="${esc(x.id)}">Open the ${esc(x.title)} panel ›</button>`).join("")}</div></div>`;
    el._figs = figs;
    if (focus != null) news(g, cols[focus]);
  }
  // 0.13: three stories about the open section (or the row chosen in it): the most relevant with its picture, two more
  // below, smaller and without pictures. Each names its source and links to the original.
  function news(g, sc) {
    const box = el.querySelector("[data-mnews]"); if (!box || !window.AtlasNews) { if (box) box.hidden = true; return; }
    const { out } = lists(), sel = S.sel != null ? (out[out.length - 1].items || [])[S.sel] : null;
    const strong = [sel && sel.label, out.length > 1 ? out[out.length - 1].title : null, sc.label].filter(Boolean), q = { strong, context: [g.label, APP.short || APP.name.replace(/^Atlas /, "")] };
    box.querySelector(".mgc-nabout").textContent = strong[0];
    const key = JSON.stringify(q); box.dataset.q = key;
    const ago = d => { const n = Math.round((Date.now() - Date.parse(d)) / 864e5); return !isFinite(n) ? "" : n <= 0 ? "Today" : n === 1 ? "Yesterday" : n < 14 ? n + " days ago" : new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); };
    const src = it => String(it.s || "").split(" · ").slice(0, 2).join(" · ");
    const draw = list => { if (box.dataset.q !== key || !box.isConnected) return; const L = list.slice(0, 3);
      box.querySelector(".mgc-nbody").innerHTML = L.length ? L.map((it, i) => `<a class="mgc-ns${i ? "" : " lead"}" href="${esc(it.u)}" target="_blank" rel="noopener" style="animation-delay:${i * 70}ms">
          ${!i && it.i ? `<span class="mgc-nimg"><img src="${esc(it.i)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentNode.remove()"></span>` : ""}<span class="mgc-ntx"><b>${esc(it.t)}</b>${!i && it.x ? `<span class="mgc-nx">${esc(it.x)}</span>` : ""}<small>${esc(src(it))}<span class="vr"></span>${esc(ago(it.d))} ↗</small></span></a>`).join("")
        : `<p class="mgc-nwait">No recent news found about ${esc(strong[0])}.</p>`; };
    S.news = S.news || new Map(); if (S.news.has(key)) { draw(S.news.get(key)); return; }
    AtlasNews.find(q).then(list => { S.news.set(key, list); draw(list); });
  }
  function itemCard(it) {
    if (!it) return null;
    if (it.card) { try { return it.card(); } catch (e) { console.error(e); return null; } }
    if (it.metric) return C().metric(it.metric);
    return null;
  }
  const whenReady = (spec, f) => spec && typeof spec.then === "function" ? spec.then(f, e => console.error(e)) : f(spec);
  function act(it, kind) {
    if (!it) return;
    if (it.fn && (kind === "go" || it.isPanel)) { close(); it.fn(ctx); return; }
    if (it.isPanel || (it.panel && !it.card && !it.metric && !it.children)) { close(); H.openFull(it.panel); return; }
    if (kind === "map") { C().applyMap(it.map || { metrics: [it.metric] }); return; }
    const spec = itemCard(it); if (!spec) { if (it.map) C().applyMap(it.map); return; }
    if (kind === "ws") { whenReady(spec, sp => { if (!sp) return; const d = document.createElement("div"); d.innerHTML = C().html(sp); ctx.sendToWS({ type: "card", title: sp.title, html: d.firstElementChild.outerHTML, w: 400, h: 600 }); }); return; }
    if (kind === "go" && it.map) C().applyMap(it.map);   // a row: its card, and it goes on the map
    close();   // the card opens in front of the map; the menu comes back on hover
    C().open(spec);
  }
  function choose(d, i, viaHover) { // 0.13: a row with more behind it is chosen (its preview and next steps); a leaf opens its card
    const { out } = lists(), it = out[d] && out[d].items[i]; if (!it) return;
    if (viaHover) return;
    if (it.children) { S.sel = i; S.pinned = true; render(); return; }
    act(it, "go"); return;
    if (it.children && kidsOf(it)) { if (!viaHover && it.map) C().applyMap(it.map); S.path = S.path.slice(0, d).concat(i); S.pinned = S.pinned || !viaHover; render(); const c = el.querySelector(`.mg-items[data-depth="${d + 1}"] .mg-go`); if (c && !viaHover && document.activeElement && el.contains(document.activeElement)) c.focus(); return; }
    if (viaHover) { if (S.path.length > d) { S.path = S.path.slice(0, d); render(); } return; }
    act(it, "go");
  }
  const groups = () => (H.groups && H.groups()) || [...APP.panels].map(x => ({ label: x.title, panels: [x] }));
  const groupOf = x => x && x.panels ? x : groups().find(g => g.panels.includes(x)) || { label: x.title, panels: [x] };
  function open(x, pin) {
    if (!el) return; clearTimeout(S.hide); x = groupOf(x);
    if (S.open !== x) { S.open = x; S.sec = 0; S.path = []; S.sel = null; S.cols = new Set(); S.spec = groupSpec(x); S.bump = true; el._cols = 0; }
    S.pinned = S.pinned && S.open === x ? true : !!pin;
    const was = el.hidden; render(); el.hidden = false; document.body.classList.add("mega-on");
    const gi = groups().indexOf(x); document.querySelectorAll("#appbar [data-agroup]").forEach(b => { const on = +b.dataset.agroup === gi; b.classList.toggle("mopen", on); if (b.hasAttribute("aria-haspopup")) b.setAttribute("aria-expanded", on ? "true" : "false"); });
  }
  function close() {
    if (!el || el.hidden) return false; el.hidden = true; S.open = null; S.pinned = false; S.spec = null; S.path = []; document.body.classList.remove("mega-on");
    document.querySelectorAll("#appbar [data-agroup]").forEach(b => { b.classList.remove("mopen"); if (b.hasAttribute("aria-haspopup")) b.setAttribute("aria-expanded", "false"); });
    return true;
  }
  const panelOf = id => [...APP.panels, ...APP.tools].find(p => p.id === id);
  // open a heading's menu at a path of keys or labels: AtlasMenu.openAt("money", "Parties", ["con", "Biggest donors"])
  function openAt(id, secLabel, keys) {
    const x = panelOf(id); if (!x) return false; S.pinned = false; open(x, true);
    const si = S.spec.sections.findIndex(sc => sc.panel === x && (sc.label === secLabel || sc.key === secLabel)); if (si < 0) return false; S.sec = si; S.path = []; S.sel = null; S.cols = new Set([si]);
    (keys || []).forEach((k, d) => { const { out } = lists(), L = out[d]; if (!L) return; const i = L.items.findIndex(it => it.key === k || it.label === k); if (i >= 0) { S.path = S.path.slice(0, d).concat(i); } });
    if (S.path.length) S.sel = S.path.pop();   // the last key is chosen (its preview and next steps), not opened
    render(); return true;
  }

  function init(c, app, hooks) {
    ctx = c; APP = app; H = hooks || {}; S.path = [];
    const bar = document.getElementById("appbar"), head = document.getElementById("apphead"); if (!bar || !head) return;
    el = document.createElement("div"); el.id = "mega"; el.className = "mega"; el.hidden = true; document.body.appendChild(el);
    // the bar: a chevron on headings that have a menu
    const gOf = b => groups()[+b.dataset.agroup];
    bar.querySelectorAll("[data-agroup]").forEach(b => { const g = gOf(b); if (g && (g.panels.length > 1 || g.panels.some(hasMenu))) { b.insertAdjacentHTML("beforeend", IC.chev); b.setAttribute("aria-haspopup", "true"); b.setAttribute("aria-expanded", "false"); b.classList.add("has-menu"); } });
    const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (fine) {
      bar.addEventListener("pointerover", e => { const b = e.target.closest("[data-agroup].has-menu"); if (!b) return; const x = gOf(b); clearTimeout(S.t); clearTimeout(S.hide);
        if (S.open === x) return; S.t = setTimeout(() => { if (S.pinned && S.open && S.open !== x) S.pinned = false; open(x, false); }, S.open ? 60 : 160); });
      const leave = () => { clearTimeout(S.t); if (S.pinned) return; clearTimeout(S.hide); S.hide = setTimeout(close, 320); };
      bar.addEventListener("pointerleave", leave); el.addEventListener("pointerleave", leave);
      el.addEventListener("pointerenter", () => clearTimeout(S.hide)); bar.addEventListener("pointerenter", () => clearTimeout(S.hide));
      // only a pointer that moves opens things: a column appearing under a still pointer doesn't count as hovering
      let lastXY = "";
      el.addEventListener("pointermove", e => {
        const xy = e.clientX + "," + e.clientY; if (xy === lastXY) return; lastXY = xy;
      });
    }
    // click a heading: put it on the map and pin its menu (click again to close); tools open straight away
    bar.addEventListener("click", e => {
      const b = e.target.closest("[data-agroup]"); if (!b) return; e.stopImmediatePropagation(); const g = gOf(b); if (!g) return;
      if (g.panels.length === 1 && !hasMenu(g.panels[0])) { close(); H.openFull(g.panels[0].id); return; }
      if (S.open === g && S.pinned) { close(); return; }
      const x = g.panels.find(hasMenu) || g.panels[0]; H.applyMap(x); H.mark && H.mark(x.id); open(g, true);
    }, true);
    el.addEventListener("click", e => {
      if (!S.spec) return;
      const t = e.target.closest("[data-mcol],[data-mtop],[data-mkid],[data-mdeep],[data-mit],[data-mact],[data-mfig],[data-mfull],[data-mmap],[data-mback],[data-msort]"); if (!t) return;
      clearTimeout(S.st);
      if (t.dataset.msort) { const [k, dir] = t.dataset.msort.split("|"); S.sorts[k] = S.sorts[k] === dir ? "" : dir; S.pinned = true; render(); return; }   // 0.12
      if (t.dataset.mcol != null) { const i = +t.dataset.mcol; if (S.cols.has(i) && !t.dataset.msee) { S.cols.delete(i); if (S.sec === i) { S.sec = [...S.cols].pop() ?? 0; S.path = []; S.sel = null; } } else { S.cols = new Set([i]); S.sec = i; S.path = []; S.sel = null; S.hist = []; } S.pinned = true; render(); if (t.dataset.msee) { const d = el.querySelector(".mgc-detail"); if (d) d.scrollIntoView({ block: "nearest", behavior: "smooth" }); } return; }
      if (t.dataset.mtop != null) { const [i, j] = t.dataset.mtop.split(":").map(Number); S.cols = new Set([i]); S.sec = i; S.path = []; S.sel = j; S.pinned = true; render(); const it = (S.spec.sections[i].items || [])[j]; if (it && !it.children) act(it, "go"); return; }
      if (t.dataset.mkid != null) { const { out } = lists(), d = out.length - 1, sel = out[d].items[S.sel], kid = (kidsOf(sel) || [])[+t.dataset.mkid]; if (!kid) return; if (kid.children) { (S.hist = S.hist || []).push({ path: S.path.slice(), sel: S.sel }); S.path = S.path.concat(S.sel, +t.dataset.mkid); S.sel = null; S.pinned = true; render(); return; } act(kid, "go"); return; }
      if (t.hasAttribute("data-mdeep")) { if (S.sel == null) return; (S.hist = S.hist || []).push({ path: S.path.slice(), sel: S.sel }); S.path = S.path.concat(S.sel); S.sel = null; S.pinned = true; render(); return; }
      if (t.dataset.mback != null) { const h = (S.hist || []).pop(); if (h) { S.path = h.path; S.sel = h.sel; } else { const last = S.path[S.path.length - 1]; S.path = S.path.slice(0, Math.max(0, S.path.length - 1)); S.sel = last != null ? last : null; } S.pinned = true; render(); return; }
      if (t.dataset.mfull) { const id = t.dataset.mfull; close(); H.openFull(id); return; }
      if (t.hasAttribute("data-mmap")) { H.applyMap(S.open); return; }
      if (t.dataset.mit != null) { const [d, i] = t.dataset.mit.split(":").map(Number); return choose(d, i, false); }
      if (t.dataset.mact) { const [d, i] = t.dataset.mi.split(":").map(Number), it = lists().out[d].items[i]; return act(it, t.dataset.mact); }
      if (t.dataset.mfig != null) { const f = (el._figs || [])[+t.dataset.mfig]; return act(f, "go"); }
    });
    document.addEventListener("pointerdown", e => { if (el.hidden) return; if (el.contains(e.target) || bar.contains(e.target)) return; close(); }, true);
    document.addEventListener("keydown", e => {
      if (el.hidden) return;
      if (e.key === "Escape") { if (S.path.length) { S.path.pop(); render(); e.stopPropagation(); return; } if (close()) e.stopPropagation(); return; }
      const g = e.target.closest && e.target.closest("#mega [data-mit]"); if (!g) return; const [d, i] = g.dataset.mit.split(":").map(Number);
      if (e.key === "ArrowRight") { e.preventDefault(); choose(d, i, false); }
      else if (e.key === "ArrowLeft" && d > 0) { e.preventDefault(); S.path = S.path.slice(0, d - 1); render(); const p = el.querySelector(`[data-mit="${d - 1}:${S.path[d - 1] != null ? S.path[d - 1] : 0}"]`); if (p) p.focus(); }
      else if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); const n = el.querySelector(`[data-mit="${d}:${i + (e.key === "ArrowDown" ? 1 : -1)}"]`); if (n) n.focus(); }
    }, true);
    bar.addEventListener("keydown", e => { const b = e.target.closest("[data-agroup].has-menu"); if (b && e.key === "ArrowDown") { e.preventDefault(); open(gOf(b), true); const f = el.querySelector(".mgc-h, .mg-go"); if (f) f.focus(); } });
    if (ctx.onDate) ctx.onDate(() => { if (S.open && !el.hidden) { const p = S.path.slice(); S.spec = groupSpec(S.open); S.path = p; render(); } });
  }
  window.AtlasMenu = { groupSpecAt: i => groupSpec(groups()[i]), groupHas: (i, id) => { const g = groups()[i]; return !!g && g.panels.some(p => p.id === id); }, init, B, refresh, full: id => { close(); H.openFull(id); }, open: id => { const x = panelOf(id); if (x) open(x, true); }, openAt, close, get state() { return S; }, specFor: id => specFor(panelOf(id)), act: (it, k) => act(it, k), kidsOf };
})();
