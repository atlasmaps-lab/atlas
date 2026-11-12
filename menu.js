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
  const S = { open: null, pinned: false, sec: 0, spec: null, t: 0, hide: 0 };
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
  const B = {
    metric(id, o) { // an item for one metric
      const m = ctx.M[id]; if (!m) return null; o = o || {}; const now = metricNow(id);
      return { label: o.label || m.label, sub: o.sub != null ? o.sub : now ? `${now.t}${now.c !== ctx.UKC && now.c !== here() ? ` (${ctx.nameOf(now.c)})` : now.c === ctx.UKC ? " · UK" : ` · ${ctx.nameOf(now.c)}`}` : (m.desc || "").slice(0, 70), metric: id, map: Object.assign({ metrics: [id] }, o.map || {}) };
    },
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
      const card = k => () => B.bdCard(id, k);
      return { label: o.label || spec.label, note: o.note || `Largest first, ${where}. Click one to map its share.`,
        items: cats.slice(0, o.max || 12).map(k => ({ label: spec.name(k), sub: `${(100 * d[k] / tot).toFixed(1)}% · ${ctx.bd.fmt(id, d[k])}`, card: card(k), map: { metrics: [id + "_share"], pick: [id, k] } })),
        figures: cats.slice(0, 4).map(k => ({ label: spec.name(k), value: (100 * d[k] / tot).toFixed(1) + "%", chg: where, colour: spec.colour(k), card: card(k), map: { metrics: [id + "_share"], pick: [id, k] } })), figTitle: "Largest" };
    },
    bdCard(id, k) { // the card for one category of a breakdown
      const spec = ctx.bd.spec(id), code = here(), d = ctx.bd.of(id, code), uk = ctx.bd.of(id, ctx.UKC), V = C().viz;
      const sh = (x, key) => { if (!x) return null; const t = Object.values(x).reduce((a, b) => a + b, 0); return t ? 100 * (x[key] || 0) / t : null; };
      const s = sh(d, k), su = sh(uk, k), name = spec.name(k), where = code === ctx.UKC ? "the UK" : ctx.nameOf(code);
      const lv = ctx.P[code] && ctx.P[code].level === "region" ? "region" : "council", rows = ctx.allCodesAt(lv).map(c => ({ c, s: sh(ctx.bd.of(id, c), k) })).filter(r => r.s != null).sort((a, b) => b.s - a.s);
      const items = [{ k: `${spec.label} · ${where}`, h: s != null ? `${esc(name)} is <b>${s.toFixed(1)}%</b> of ${esc(spec.label.toLowerCase())} in ${esc(where)}${su != null && code !== ctx.UKC ? `, against ${su.toFixed(1)}% in the UK` : ""}` : `No figures for ${esc(where)}`, viz: d ? V.stack(Object.keys(d).sort((a, b) => d[b] - d[a]).slice(0, 12).map(x => ({ v: d[x], c: x === k ? "#d0701c" : spec.colour(x), n: spec.name(x) }))) : "", open: true,
        more: s != null && su ? `<p>That is ${(s / su).toFixed(2)} times the UK share: ${s / su > 1.25 ? "more concentrated here than in most places" : s / su < 0.8 ? "less common here than across the UK" : "close to the UK as a whole"}.</p>` : "", map: { metrics: [id + "_share"], pick: [id, k] } }];
      if (rows.length >= 5) items.push({ k: `Where it's largest · ${rows.length} ${lv === "region" ? "regions" : "councils"}`, h: `Highest in ${esc(ctx.nameOf(rows[0].c))} (${rows[0].s.toFixed(1)}%), lowest in ${esc(ctx.nameOf(rows[rows.length - 1].c))} (${rows[rows.length - 1].s.toFixed(1)}%)`,
        viz: V.bars(rows.slice(0, 6).map((r, i) => ({ v: r.s, c: r.c === code ? "#d0701c" : i ? "#9aa5ab" : "#3b78b5", n: ctx.nameOf(r.c) }))), more: ctx.CH.ranked(rows.slice(0, 8).map(r => ({ name: ctx.nameOf(r.c), v: r.s, hl: r.c === code })), { w: 380, fmt: v => v.toFixed(1) + "%" }), map: { metrics: [id + "_share"], pick: [id, k], level: lv } });
      if (spec.desc || spec.how) items.push({ k: "What it tells us", h: esc((spec.desc || spec.how || "").split(/(?<=\.)\s/)[0]), more: `${spec.desc ? `<p>${esc(spec.desc)}</p>` : ""}${spec.how ? `<p><b>How it's counted.</b> ${esc(spec.how)}</p>` : ""}` });
      if (spec.source) items.push({ k: "Where it comes from", h: esc(String(spec.source).replace(/https?:\/\/\S+/g, "").slice(0, 140)), url: (String(spec.source).match(/https?:\/\/[^\s;),]+/) || [])[0] });
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
      if (o.means) items.push({ k: "What it tells us", h: esc(o.means.split(/(?<=\.)\s/)[0].replace(/\.$/, "")), more: `<p>${esc(o.means)}</p>${o.trust ? `<p><b>How far to trust it.</b> ${esc(o.trust)}</p>` : ""}` });
      if (o.src || o.next) items.push({ k: o.next ? `Next release · ${o.next}` : "Where it comes from", h: esc(o.src || ""), url: o.url, urlLabel: "Source" });
      return { app: o.app, title: o.title, items, source: String(o.src || "Atlas").split(/[;(]/)[0].slice(0, 60), when: per(last[0]), map: o.map || null, links: o.url ? [{ label: "Source", url: o.url }] : [] };
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
    try { const s = f ? f(ctx, B) : auto(x); if (s && s.sections) s.sections = s.sections.filter(sc => sc && ((sc.items || []).length || (sc.figures || []).length)); return s && s.sections && s.sections.length ? s : auto(x); } catch (e) { console.error(e); return auto(x); }
  }
  // a heading drops down a menu when it has its own, or metrics to build one from; otherwise it opens its panel
  const hasMenu = x => x.menu !== false && x.editorial !== false && !APP.tools.includes(x) && !!(x.menu || ((window.AtlasMenus || {})[APP.id] || {})[x.id] || (x.map && typeof x.map !== "function" && (x.map.metrics || []).some(id => ctx.M[id])));

  // ---------- drawing ----------
  let el = null;
  function render() {
    const x = S.open, s = S.spec; if (!x || !s) return;
    const sec = s.sections[Math.min(S.sec, s.sections.length - 1)] || s.sections[0];
    const figs = (sec.figures || []).filter(Boolean);
    el.style.setProperty("--app", APP.accent);
    el.innerHTML = `<div class="mg-in" role="menu" aria-label="${esc(x.title)}">
      <nav class="mg-col mg-secs"><div class="mg-h">${esc(x.title)}</div>${s.sections.map((sc, i) => `<button type="button" class="mg-sec${sc === sec ? " on" : ""}" data-msec="${i}" role="menuitem">${esc(sc.label)}</button>`).join("")}</nav>
      <div class="mg-col mg-items"><div class="mg-h">${esc(sec.label)}</div>${sec.note ? `<p class="mg-note">${esc(sec.note)}</p>` : ""}
        ${(sec.items || []).filter(Boolean).map((it, i) => `<div class="mg-it${it.isPanel ? " mg-full" : ""}"><button type="button" class="mg-go" data-mit="${i}" role="menuitem"><span class="mg-l">${esc(it.label)}</span>${it.sub ? `<small>${esc(it.sub)}</small>` : ""}</button>
          ${it.isPanel ? "" : `<span class="mg-acts">${it.map || it.metric ? `<button type="button" data-mact="map" data-mi="${i}" title="Put on map" aria-label="Put ${esc(it.label)} on the map">${IC.map}</button>` : ""}<button type="button" data-mact="ws" data-mi="${i}" title="Send to workspace" aria-label="Send ${esc(it.label)} to the workspace">${IC.ws}</button><button type="button" data-mact="card" data-mi="${i}" title="Create an information card" aria-label="Card for ${esc(it.label)}">${IC.card}</button></span>`}</div>`).join("")}</div>
      <div class="mg-col mg-figs">${figs.length ? `<div class="mg-h">${esc(sec.figTitle || "Key figures")}</div><div class="mg-tiles">${figs.map((f, i) => `<button type="button" class="mg-tile" data-mfig="${i}" title="${esc(f.label)}: open its card">${f.colour ? `<i class="mg-sw" style="background:${esc(f.colour)}"></i>` : ""}<span class="mg-tl">${esc(f.label)}</span><b class="mg-tv">${esc(f.value)}</b>${f.chg ? `<span class="mg-tc ${f.tone || (/^▲/.test(f.chg) ? "up" : /^▼/.test(f.chg) ? "down" : "")}">${esc(f.chg)}</span>` : ""}</button>`).join("")}</div>` : ""}</div>
      <aside class="mg-col mg-side"><p>${esc(s.lede || x.blurb || `Everything in ${x.title}, by category. Each row opens a card you can put on the map or send to the workspace.`)}</p>
        <button type="button" class="mg-cta" data-mfull>${IC.card}<span>Open the full panel</span></button>${x.map || x.onOpen ? `<button type="button" class="mg-cta ghost" data-mmap>${IC.map}<span>Put on map</span></button>` : ""}</aside></div>`;
  }
  function itemCard(it) {
    if (!it) return null;
    if (it.card) { try { return it.card(); } catch (e) { console.error(e); return null; } }
    if (it.metric) return C().metric(it.metric);
    return null;
  }
  function act(it, kind) {
    if (!it) return;
    if (it.isPanel || (it.panel && !it.card && !it.metric)) { close(); H.openFull(it.panel); return; }
    if (it.fn && kind === "go") { close(); it.fn(ctx); return; }
    if (kind === "map") { C().applyMap(it.map || { metrics: [it.metric] }); return; }
    const spec = itemCard(it); if (!spec) { if (it.map) C().applyMap(it.map); return; }
    if (kind === "ws") { const d = document.createElement("div"); d.innerHTML = C().html(spec); ctx.sendToWS({ type: "card", title: spec.title, html: d.firstElementChild.outerHTML, w: 400, h: 600 }); return; }
    if (kind === "go" && it.map) C().applyMap(it.map);   // a row: its card, and it goes on the map
    close();   // the card opens in front of the map; the menu comes back on hover
    C().open(spec);
  }
  function open(x, pin) {
    if (!el) return; clearTimeout(S.hide);
    if (S.open !== x) { S.open = x; S.sec = 0; S.spec = specFor(x); }
    S.pinned = S.pinned && S.open === x ? true : !!pin;
    render(); el.hidden = false; document.body.classList.add("mega-on");
    document.querySelectorAll("#appbar [data-apanel]").forEach(b => { const on = b.dataset.apanel === x.id; b.classList.toggle("mopen", on); if (b.hasAttribute("aria-haspopup")) b.setAttribute("aria-expanded", on ? "true" : "false"); });
  }
  function close() {
    if (!el || el.hidden) return false; el.hidden = true; S.open = null; S.pinned = false; S.spec = null; document.body.classList.remove("mega-on");
    document.querySelectorAll("#appbar [data-apanel]").forEach(b => { b.classList.remove("mopen"); if (b.hasAttribute("aria-haspopup")) b.setAttribute("aria-expanded", "false"); });
    return true;
  }
  const panelOf = id => [...APP.panels, ...APP.tools].find(p => p.id === id);

  function init(c, app, hooks) {
    ctx = c; APP = app; H = hooks || {};
    const bar = document.getElementById("appbar"), head = document.getElementById("apphead"); if (!bar || !head) return;
    el = document.createElement("div"); el.id = "mega"; el.className = "mega"; el.hidden = true; document.body.appendChild(el);
    // the bar: a chevron on headings that have a menu
    bar.querySelectorAll("[data-apanel]").forEach(b => { const x = panelOf(b.dataset.apanel); if (x && hasMenu(x)) { b.insertAdjacentHTML("beforeend", IC.chev); b.setAttribute("aria-haspopup", "true"); b.setAttribute("aria-expanded", "false"); b.classList.add("has-menu"); } });
    const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (fine) {
      bar.addEventListener("pointerover", e => { const b = e.target.closest("[data-apanel].has-menu"); if (!b) return; const x = panelOf(b.dataset.apanel); clearTimeout(S.t); clearTimeout(S.hide);
        if (S.open === x) return; S.t = setTimeout(() => { if (S.pinned && S.open && S.open !== x) S.pinned = false; open(x, false); }, S.open ? 60 : 160); });
      const leave = () => { clearTimeout(S.t); if (S.pinned) return; clearTimeout(S.hide); S.hide = setTimeout(close, 320); };
      bar.addEventListener("pointerleave", leave); el.addEventListener("pointerleave", leave);
      el.addEventListener("pointerenter", () => clearTimeout(S.hide)); bar.addEventListener("pointerenter", () => clearTimeout(S.hide));
      el.addEventListener("pointerover", e => { const s = e.target.closest("[data-msec]"); if (!s || +s.dataset.msec === S.sec) return; clearTimeout(S.st); S.st = setTimeout(() => { S.sec = +s.dataset.msec; render(); }, 90); });
    }
    // click a heading: put it on the map and pin its menu (click again to close); tools open straight away
    bar.addEventListener("click", e => {
      const b = e.target.closest("[data-apanel]"); if (!b) return; e.stopImmediatePropagation(); const x = panelOf(b.dataset.apanel); if (!x) return;
      if (!hasMenu(x)) { close(); H.openFull(x.id); return; }
      if (S.open === x && S.pinned) { close(); return; }
      H.applyMap(x); H.mark && H.mark(x.id); open(x, true);
    }, true);
    el.addEventListener("click", e => {
      const s = S.spec, sec = s && s.sections[Math.min(S.sec, s.sections.length - 1)]; if (!sec) return;
      const t = e.target.closest("[data-msec],[data-mit],[data-mact],[data-mfig],[data-mfull],[data-mmap]"); if (!t) return;
      if (t.dataset.msec != null) { S.sec = +t.dataset.msec; S.pinned = true; render(); return; }
      if (t.hasAttribute("data-mfull")) { const id = S.open.id; close(); H.openFull(id); return; }
      if (t.hasAttribute("data-mmap")) { H.applyMap(S.open); return; }
      if (t.dataset.mit != null) return act(sec.items.filter(Boolean)[+t.dataset.mit], "go");
      if (t.dataset.mact) return act(sec.items.filter(Boolean)[+t.dataset.mi], t.dataset.mact);
      if (t.dataset.mfig != null) { const f = sec.figures.filter(Boolean)[+t.dataset.mfig]; return act(f, "go"); }
    });
    document.addEventListener("pointerdown", e => { if (el.hidden) return; if (el.contains(e.target) || bar.contains(e.target)) return; close(); }, true);
    document.addEventListener("keydown", e => { if (e.key === "Escape" && close()) { e.stopPropagation(); } }, true);
    bar.addEventListener("keydown", e => { const b = e.target.closest("[data-apanel].has-menu"); if (b && e.key === "ArrowDown") { e.preventDefault(); open(panelOf(b.dataset.apanel), true); const f = el.querySelector(".mg-sec"); if (f) f.focus(); } });
    if (ctx.onDate) ctx.onDate(() => { if (S.open && !el.hidden) { S.spec = specFor(S.open); render(); } });
  }
  window.AtlasMenu = { init, B, full: id => { close(); H.openFull(id); }, open: id => { const x = panelOf(id); if (x) open(x, true); }, close, get state() { return S; }, specFor: id => specFor(panelOf(id)), act: (it, k) => act(it, k) };
})();
