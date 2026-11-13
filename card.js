/* Atlas 0.11 · information cards (core). One card design for everything you can lift out of Atlas, shaped like a news
 * card: a masthead (ATLAS and the app), a black title bar, then a list of items, each a small kicker, a serif headline
 * and a picture on the right (a sparkline, bars, a big number). Click an item to open it: the rest of the story, a full
 * chart with what plausibly moved it, and links. The footer names the source and date; ⋮ holds the other actions.
 *
 * Every card and every item can be put on the map, sent to the workspace or copied. The actions are written into the
 * card's own HTML (data attributes), so a card keeps working after it has been sent to the workspace.
 *
 *   AtlasCard.html(spec)        -> HTML     spec = { app, title, lede, items: [item], source, when, map, panel, links }
 *   AtlasCard.open(spec)        -> window   item = { k, h (HTML), viz (HTML), more (HTML), map, url, urlLabel, open }
 *   AtlasCard.metric(id, code)  -> spec     the story of one metric for one place
 *   AtlasCard.why(pts, topics, o) -> { lines, events }   sharp moves matched against data/events.js
 *   AtlasCard.viz.{spark, bars, stack, big}, AtlasCard.applyMap(spec), AtlasCard.topicsOf(id, label, group, p)
 * Hovering an ⓘ beside a metric shows a small version of the card (the "peek") with Map, Workspace and Card buttons.
 */
(function () {
  "use strict";
  let ctx = null; const hooks = { openPanel: null };
  let seq = 0;
  const esc = t => String(t == null ? "" : t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const APPN = { political: "Politics", economic: "Economic", social: "Social", health: "Health", markets: "Markets", transport: "Transport", environment: "Environment" };
  const yearOf = d => +d.slice(0, 4) + (+d.slice(5, 7) - 1) / 12 + (+d.slice(8, 10) - 1) / 365;
  const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const whenOf = (x, dense) => dense ? `${MON[Math.min(11, Math.floor((x % 1) * 12 + 1e-6))]} ${Math.floor(x)}` : String(Math.floor(x));

  // ---------- topics: which events can plausibly move which measures ----------
  const TOPIC_RX = [
    [/gdp|gva|growth|output|productiv|retail|eco_/, "growth"], [/cpi|inflat|price index|prices/, "prices"],
    [/hpi|\brent|afford|house|mortgage|mort2|stamp/, "housing"], [/social_homes|council_homes|waiting|temp_accom|ppl_tenure|social hous/, "social_housing"],
    [/(^|[^a-z])(unemp|emp\b|employ)|claimant|inactiv|vacanc|jobs|labour/, "labour"], [/(^|[^a-z])pay|earn|wage/, "pay"],
    [/psnb|borrow|debt|spend|psnd|public financ/, "finances"], [/trade|export|import|trd_|tariff/, "trade"], [/inv_|fdi|invest/, "invest"],
    [/mig|asylum|resettl|cen_birth|passport|visa/, "migration"], [/(^|[^a-z])(le|hle)_|u75|death|hd_|health|mortal|life expect/, "health"],
    [/bankrate|bank rate|sonia|gilt|mort2|interest/, "rates"], [/(^|[^a-z])(eri|usd|eur)($|[^a-z])|sterling|per pound/, "sterling"],
    [/claimant|child_poverty|dhp|benefit|sx_|universal credit/, "benefits"], [/population|pop_|density/, "population"],
  ];
  function topicsOf(id, label, group, p) {
    const s = `${id} ${label || ""} ${group || ""}`.toLowerCase(), out = new Set();
    TOPIC_RX.forEach(([rx, t]) => { if (rx.test(s)) out.add(t); });
    if (p === "political") out.add("politics"); if (p === "transport") out.add("transport");
    return [...out];
  }
  const EV = () => (window.ATLAS_EVENTS || []).map(e => Object.assign({}, e, { x: yearOf(e.d), text: e.x }));
  const evIn = (topics, x0, x1) => EV().filter(e => e.tp.some(t => topics.includes(t)) && e.x >= x0 && e.x <= x1);

  // ---------- why it moved: the sharpest moves in a series, and the events they line up with ----------
  // pts [[x (decimal year), v]], topics [...], o = { pts: true for shares/rates (points, not %), fmt }
  function why(pts, topics, o) {
    o = o || {}; pts = (pts || []).filter(p => p[1] != null && isFinite(p[1])).sort((a, b) => a[0] - b[0]);
    const fmt = o.fmt || (v => (+v).toFixed(1)), out = { lines: [], events: [], moves: [] };
    if (pts.length < 3) return out;
    // monthly or daily series compare each point with a year before; quarterly and yearly ones with the point before
    const gaps = pts.slice(1).map((p, i) => p[0] - pts[i][0]).sort((a, b) => a - b), gap = gaps[Math.floor(gaps.length / 2)] || 1, dense = gap < 0.2;
    const per = o.period || null, quarterly = !dense && gap < 0.9;
    const yearly = !dense && pts.every(p => Number.isInteger(p[0]));   // a whole year: its events run to the end of it
    const mv = [];
    for (let i = 1; i < pts.length; i++) {
      let j = i - 1;
      if (dense) { j = i; while (j > 0 && pts[i][0] - pts[j][0] < 0.95) j--; if (pts[i][0] - pts[j][0] < 0.9) continue; }
      const a = pts[j][1], b = pts[i][1], d = o.pts ? b - a : a ? b / Math.abs(a) - Math.sign(a) : null;
      if (d == null || !isFinite(d)) continue; mv.push({ x0: pts[j][0], x1: pts[i][0], a, b, d });
    }
    if (mv.length < 2) return out;
    const mu = mv.reduce((s, m) => s + m.d, 0) / mv.length, sd = Math.sqrt(mv.reduce((s, m) => s + (m.d - mu) ** 2, 0) / mv.length) || 0;
    mv.forEach(m => { m.z = sd ? Math.abs(m.d - mu) / sd : 0; });
    const pick = []; mv.slice().sort((p, q) => q.z - p.z).forEach(m => { if (m.z < 1.3 || pick.length >= 3) return; if (pick.some(p => Math.abs(p.x1 - m.x1) < (dense ? 0.9 : quarterly ? 0.6 : 1.5))) return; pick.push(m); });
    pick.sort((p, q) => p.x1 - q.x1); out.moves = pick;
    const used = new Map();
    const tag = e => { if (!used.has(e.d + e.t)) used.set(e.d + e.t, e); return e; };
    pick.forEach(m => {
      const cands = evIn(topics, dense ? m.x0 - 0.4 : quarterly ? m.x0 - 0.3 : m.x0 - (yearly ? 0.5 : 1.0), dense ? m.x1 + 0.05 : quarterly ? m.x1 + 0.15 : m.x1 + (yearly ? 0.999 : 0.05)).sort((p, q) => (q.big || 0) - (p.big || 0) || Math.abs(m.x1 - p.x) - Math.abs(m.x1 - q.x));
      const e = cands[0], up = m.b > m.a;
      const amt = o.pts ? `${Math.abs(m.b - m.a).toFixed(1)} points` : m.a ? `${Math.abs((m.b / m.a - 1) * 100).toFixed(Math.abs(m.b / m.a - 1) < 0.1 ? 1 : 0)}%` : "";
      const period = dense ? `in the year to ${per ? per(m.x1) : whenOf(m.x1, true)}` : quarterly ? `in ${per ? per(m.x1) : whenOf(m.x1, true)}` : Math.floor(m.x1) - Math.floor(m.x0) > 1 ? `between ${Math.floor(m.x0)} and ${Math.floor(m.x1)}` : `in ${Math.floor(m.x1)}`;
      const head = `<b>${up ? "Up" : "Down"} ${esc(amt)} ${esc(period)}</b> (${esc(fmt(m.a))} to ${esc(fmt(m.b))})`;
      m.ev = e ? tag(e) : null;
      out.lines.push(e ? `${head}. This came with <b>${esc(e.t)}</b> (${esc(whenOf(e.x, true))}): ${esc(e.text)}` : `${head}. Nothing in Atlas's timeline obviously lines up with it: it may be local, a change in how it's counted, or noise.`);
    });
    // big events in range are marked even when nothing moved sharply around them
    evIn(topics, pts[0][0], pts[pts.length - 1][0] + (yearly ? 0.999 : 0)).filter(e => e.big).forEach(tag);
    out.events = [...used.values()].sort((a, b) => a.x - b.x).slice(0, 7).map((e, i) => ({ x: e.x, n: i + 1, label: `${whenOf(e.x, true)}: ${e.t}`, t: e.t, text: e.text, u: e.u, d: e.d }));
    return out;
  }
  const whyHTML = (w, empty) => w.lines.length ? `<ul class="pc-why">${w.lines.map(l => `<li>${l}</li>`).join("")}</ul><p class="pc-fine">Lining up in time isn't proof of cause: Atlas matches sharp moves with events in its timeline that plausibly drove them.</p>` : `<p class="pc-fine">${empty || "No sharp moves stand out in this series."}</p>`;
  const evList = evs => evs.length ? `<ol class="pc-evs">${evs.map(e => `<li><span class="pc-evn">${e.n}</span><span><b>${esc(e.label)}</b>. ${esc(e.text)} <a href="${esc(e.u)}" target="_blank" rel="noopener">Source ↗</a></span></li>`).join("")}</ol>` : "";

  // ---------- small pictures for the right of each item ----------
  const viz = {
    spark(pts, colour) { pts = (pts || []).filter(p => p[1] != null && isFinite(p[1])); return pts.length > 1 && ctx ? ctx.CH.spark(pts, { w: 120, h: 72, colour: colour || "currentColor" }) : ""; },
    bars(items) { // [{v, c, n}] small vertical bars
      items = (items || []).filter(x => x.v != null && isFinite(x.v)); if (!items.length) return ""; const mx = Math.max(...items.map(x => Math.abs(x.v))) || 1, w = 120 / items.length;
      return `<svg viewBox="0 0 120 72" class="pc-bars" aria-hidden="true">${items.map((x, i) => { const h = Math.max(2, 64 * Math.abs(x.v) / mx); return `<rect x="${(i * w + w * 0.15).toFixed(1)}" y="${(70 - h).toFixed(1)}" width="${(w * 0.7).toFixed(1)}" height="${h.toFixed(1)}" rx="2" fill="${x.c || "currentColor"}"><title>${esc(x.n || "")}</title></rect>`; }).join("")}</svg>`;
    },
    stack(items) { // [{v, c, n}] a 100% bar, with the largest named
      items = (items || []).filter(x => x.v > 0); const t = items.reduce((a, x) => a + x.v, 0); if (!t) return ""; let x0 = 0;
      return `<svg viewBox="0 0 120 72" class="pc-bars" aria-hidden="true">${items.map(x => { const w = 120 * x.v / t, r = `<rect x="${x0.toFixed(1)}" y="20" width="${Math.max(0.6, w - 0.6).toFixed(1)}" height="32" fill="${x.c || "#888"}"><title>${esc(x.n || "")}</title></rect>`; x0 += w; return r; }).join("")}</svg>`;
    },
    big(text, sub) { const t = String(text == null ? "" : text).replace(/\s*\(.*$/, ""), n = t.length; return `<div class="pc-bign${n > 9 ? " xs" : n > 6 ? " s" : ""}"><b>${esc(t)}</b>${sub ? `<small>${esc(sub)}</small>` : ""}</div>`; },
  };

  // ---------- the card ----------
  const STAR = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
  const js = o => esc(JSON.stringify(o));
  const ICC = `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="3.5" width="16" height="17" rx="3" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M7.5 8h9M7.5 12h5M7.5 16h7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;
  // every picture and chart in a card can become its own card or go to the workspace
  const VACTS = `<span class="pc-vacts"><button type="button" data-pcvcard title="Open this chart as its own card" aria-label="Open this chart as a card">${ICC}</button><button type="button" data-pcvws title="Send this chart to the workspace" aria-label="Send this chart to the workspace">${STAR}</button></span>`;
  // 0.12.1: an item is only clickable when something is behind it: more to read (more), a way deeper (deep: rows that
  // open the next card in the same window, or go: one deeper card). Otherwise it is flat: no underline, no click.
  // size: "lead" (bigger, first), "half" (two side by side), or full width. k (the small kicker) is optional.
  const DEEP = new Map(); let deepSeq = 0;
  function deepRef(fn, title) { const id = "d" + (++deepSeq); DEEP.set(id, { fn, title }); if (DEEP.size > 4000) DEEP.delete(DEEP.keys().next().value); return id; }
  // 0.13: lists are complete (the first 15 show, then "See all N ›"), keep their rank numbers, and sort on the full list
  const numOf = v => window.AtlasSort && v != null ? AtlasSort.num(v) : null;
  const deepRow = (r, i) => { const n = r.n != null ? r.n : numOf(r.v); return `<li${i >= 15 ? ' class="pc-more" hidden' : ""} data-rank="${i + 1}"${n != null ? ` data-v="${n}"` : ""} data-l="${esc(String(r.label).toLowerCase())}"><button type="button" class="pc-dr" data-pcdeep="${deepRef(r.fn, r.label)}"><span class="pc-rk">${i + 1}</span><span class="pc-drl">${r.c ? `<i style="background:${esc(r.c)}"></i>` : ""}<span>${esc(r.label)}${r.sub ? `<small>${esc(r.sub)}</small>` : ""}</span></span>${r.v != null && r.v !== "" ? `<b>${esc(r.v)}</b>` : ""}<span class="pc-chev" aria-hidden="true">›</span></button></li>`; };
  const deepList = (rows, title) => { rows = (rows || []).filter(Boolean); if (!rows.length) return ""; const nums = rows.filter(r => (r.n != null ? r.n : numOf(r.v)) != null).length >= rows.length * 0.6;
    return `<div class="pc-dhead">${title ? `<span class="pc-dt">${esc(title)}</span>` : "<span></span>"}${rows.length > 3 ? `<span class="pc-sorts" role="group" aria-label="Sort this list">${nums ? `<button type="button" data-pcsort="desc" class="on">Largest first</button><button type="button" data-pcsort="asc">Smallest first</button>` : ""}<button type="button" data-pcsort="az"${nums ? "" : ' class="on"'}>A–Z</button></span>` : ""}</div><ul class="pc-deep" data-nosort>${rows.map(deepRow).join("")}</ul>${rows.length > 15 ? `<button type="button" class="pc-seeall" data-pcseeall>See all ${rows.length} ›</button>` : ""}`; };
  // 0.13: the lead is the card's headline, summary and main chart, always shown (not a row to open)
  const ZACTS = `<span class="pc-zacts"><button type="button" data-pczoom title="Make this chart bigger" aria-label="Make this chart bigger">⤢</button></span>`;
  function lead(it) {
    const mapA = it.map ? ` data-pcmapspec="${js(it.map)}"` : "";
    const more = String(it.more || "").replace(/<div class="pc-chart">/g, `<div class="pc-chart pc-zoomable">${VACTS}${ZACTS}`);
    const hasChart = /pc-chart/.test(more);
    return `<div class="pc-it pc-lead"${mapA}>${it.k ? `<div class="pc-k pc-leadk">${esc(it.k)}</div>` : ""}<h2 class="pc-h pc-head">${it.h}</h2>${it.sub ? `<p class="pc-sum">${it.sub}</p>` : ""}${hasChart ? "" : it.viz ? `<div class="pc-viz pc-leadviz">${it.viz}</div>` : ""}${more ? `<div class="pc-body">${more}</div>` : ""}${it.cap ? `<p class="pc-cap">${it.cap}</p>` : ""}${deepList(it.deep, it.deepTitle)}${it.go ? `<button type="button" class="pc-gob pc-leadgo" data-pcdeep="${deepRef(it.go, it.goTitle || "")}">Go deeper ›</button>` : ""}</div>`;
  }
  function item(it, i) {
    if (!it) return "";
    const size = it.size || (i === 0 && it.size !== "" ? "lead" : ""), cls = `pc-it${size ? " pc-" + size : ""}`;
    const kick = it.k ? `<div class="pc-k">${esc(it.k)}</div>` : "";
    const vz = it.viz ? `<div class="pc-viz">${it.viz}${/<svg/.test(it.viz) ? VACTS : ""}</div>` : "";
    const txt = `<div class="pc-txt">${kick}<div class="pc-h">${it.h}${it.go ? ` <span class="pc-chev" aria-hidden="true">›</span>` : ""}</div>${it.sub ? `<div class="pc-sub">${it.sub}</div>` : ""}</div>`;
    const mapA = it.map ? ` data-pcmapspec="${js(it.map)}"` : "";
    if (it.go) return `<div class="${cls} pc-go"${mapA}><button type="button" class="pc-gob" data-pcdeep="${deepRef(it.go, it.goTitle || "")}">${txt}${vz}</button></div>`;
    const body = String(it.more || "").replace(/<div class="pc-chart">/g, `<div class="pc-chart">${VACTS}`) + deepList(it.deep, it.deepTitle);
    if (!body.trim()) return `<div class="${cls} pc-flat"${mapA}><div class="pc-sum">${txt}${vz}</div></div>`;
    const acts = `${it.map ? `<button type="button" data-pcmap>Put on map</button>` : ""}<button type="button" data-pcwsi>Send to workspace</button>${it.url ? `<a href="${esc(it.url)}" target="_blank" rel="noopener">${esc(it.urlLabel || "Read more")} ↗</a>` : ""}`;
    return `<details class="${cls}"${it.open ? " open" : ""}${mapA}><summary>${txt}${vz}<span class="pc-tog" aria-hidden="true"></span></summary>
      <div class="pc-body">${body}<div class="pc-iacts">${acts}</div></div></details>`;
  }
  // 0.13: the time-range switch (12 months, 5 years, 10 years, all) re-tells the whole card for that range
  const rangeBar = spec => spec.ranges && spec.ranges.length > 1 && spec.range ? `<div class="pc-ranges" role="group" aria-label="Time range">${spec.ranges.map(r => `<button type="button" class="${r.k === spec.rangeAt ? "on" : ""}" aria-pressed="${r.k === spec.rangeAt}" data-pcrange="${deepRef(() => spec.range(r.k), spec.title)}">${esc(r.l)}</button>`).join("")}</div>` : "";
  const toneOf = t => t === "good" || t === "up" ? "up" : t === "bad" || t === "down" ? "down" : t || "";
  function html(spec) {
    const id = "pc" + (++seq) + "-" + Date.now().toString(36);
    const links = (spec.links || []).filter(l => l && l.url);
    const crumbs = (spec.crumbs || [spec.app, spec.title]).filter(Boolean);
    const items = spec.items || [], hasLead = !!items[0] && !spec.flatLead && items[0].size !== "" && items[0].size !== "half";
    const figs = (spec.figs || []).filter(f => f && f.v != null && f.v !== "").slice(0, 3);
    const figHTML = figs.length ? `<div class="pc-figs">${figs.map(f => (f.at != null ? `<button type="button" class="pc-fig" data-pcfig="${f.at}" title="What lies behind this figure">` : `<div class="pc-fig">`) + `<b class="${toneOf(f.tone)}">${esc(f.v)}</b><span>${esc(f.l || "")}</span>` + (f.at != null ? "</button>" : "</div>")).join("")}</div>` : "";
    const notes = (spec.notes || []).filter(Boolean);
    return `<article class="pcard" data-pcard="${id}"${spec.map ? ` data-pcmapspec="${js(spec.map)}"` : ""}${spec.panel ? ` data-pcpanelid="${esc(spec.panel)}"` : ""}${spec.track ? ` data-pctrack="${js(spec.track)}"` : ""}${spec.accent ? ` style="--pc-acc:${esc(spec.accent)}"` : ""}>
      <div class="pc-crumbs"><nav aria-label="Where you are">${crumbs.map((c, i) => `<span${i === crumbs.length - 1 ? ' class="on"' : ""}>${esc(c)}</span>`).join('<span class="pc-csep" aria-hidden="true">›</span>')}</nav>
        <button type="button" class="pc-follow" data-pcws title="Send this card to the workspace">${STAR}<span>Workspace</span></button></div>
      <header class="pc-top"><div class="pc-brand"><span class="pc-logo">ATLAS</span>${spec.app ? `<span class="pc-app">${esc(spec.app)}</span>` : ""}</div>${rangeBar(spec)}</header>
      ${spec._back ? `<button type="button" class="pc-back" data-pcback="${esc(spec._back)}">‹ ${esc(spec._backTitle || "Back")}</button>` : ""}<div class="pc-kick"><span class="pc-pill">${esc(spec.title)}</span>${(spec.kicker || []).map(k => `<span class="vr"></span><span>${esc(k)}</span>`).join("")}${spec.when ? `<span class="vr"></span><span class="pc-kwhen">${esc(spec.when)}</span>` : ""}</div>${spec.shape && window.AtlasShape ? AtlasShape.buttons(spec.shape) : ""}
      ${hasLead ? `<div class="pc-items pc-leadbox">${lead(items[0])}</div>` : ""}${spec.lede ? `<p class="pc-lede">${spec.lede}</p>` : ""}${figHTML}
      <div class="pc-items pc-secs">${items.slice(hasLead ? 1 : 0).map((it, i) => item(it, 1 + i)).join("")}</div>
      ${notes.length ? `<ol class="pc-notes">${notes.map(n => `<li>${n}</li>`).join("")}</ol>` : ""}
      <footer class="pc-foot"><span class="pc-fav" aria-hidden="true">A</span><span class="pc-src">${esc(spec.source || "Atlas")}</span>${spec.when ? `<span class="vr"></span><span class="pc-when">${esc(spec.when)}</span>` : ""}
        <button type="button" class="pc-dots" data-pcmenu aria-label="More actions" title="More actions"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="5" r="1.9"/><circle cx="12" cy="12" r="1.9"/><circle cx="12" cy="19" r="1.9"/></svg></button>
        <div class="pc-menu" hidden>${spec.map ? `<button type="button" data-pcmap>Put on map</button>` : ""}<button type="button" data-pcws>Send to workspace</button><button type="button" data-pcopen>Open as a card</button><button type="button" data-pcopenall>Open every item</button><button type="button" data-pccopy>Copy the text</button>${spec.panel ? `<button type="button" data-pcpanel="${esc(spec.panel)}">Open the full panel</button>` : ""}${links.map(l => `<a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label || "Source")} ↗</a>`).join("")}</div></footer></article>`;
  }
  function open(spec) {
    if (!spec || !ctx) return null;
    if (typeof spec.then === "function") {   // a card whose data loads first (every donation since 2010): a placeholder, then the card
      const w = open({ title: "Loading…", items: [{ k: "One moment", h: "Loading the figures…", open: true }], source: "Atlas" }); if (!w) return null;
      w.el.classList.add("pc-loading");
      spec.then(sp => { if (!sp) return; w.setBody(html(sp)); w.setTitle && w.setTitle(sp.title); w.el.classList.remove("pc-loading"); }, () => w.setBody(html({ title: "Couldn't load", items: [{ k: "Sorry", h: "The data didn't load; try again" }] })));
      return w;
    }
    const top = ctx.WM.TOPNOW ? ctx.WM.TOPNOW() : 90, W = Math.min(440, innerWidth - 32);
    const w = ctx.WM.make({ type: "pcard", title: spec.title, html: html(spec), cascade: true, min: { w: 300, h: 240 }, def: () => ({ x: Math.max(16, innerWidth - W - 24), y: top + 8, w: W, h: Math.min(680, innerHeight - top - 24) }) });
    w.el.classList.add("pcwin"); ctx.WM.open(w.el); return w;
  }

  // ---------- one metric's card ----------
  function val(m, c, d) { try { const r = m.get(c, d || ctx.date); return r && r.v != null && !r.nm && isFinite(r.v) ? r : null; } catch (e) { return null; } }
  function splitStory(h) { const d = document.createElement("div"); d.innerHTML = h || ""; const q = s => d.querySelector(s); return { story: q(".nv-story") ? q(".nv-story").innerHTML : "", means: q(".nv-means") ? q(".nv-means").innerHTML.replace(/^<b>[^<]*<\/b>\s*/, "") : "", trust: q(".nv-trust") ? q(".nv-trust").innerHTML.replace(/^<b>[^<]*<\/b>\s*/, "") : "" }; }
  const first = h => { const P = window.AtlasPanel; return P ? P.firstSentence(h) : [h, ""]; };
  function metric(id, code, range) {
    const m = ctx && ctx.M[id]; if (!m) return null; const N = window.AtlasNarrative;
    code = code && ctx.P[code] ? code : ctx.focused && ctx.P[ctx.focused] ? ctx.focused : ctx.UKC;
    const where = code === ctx.UKC ? "the UK" : ctx.nameOf(code), f = N ? N.fmtOf(m) : String, isP = N ? N.isPts(m) : false;
    let pts = N && m.temporal !== "election" ? N.series(m, code) : [];
    // 0.13: the time range: 12 months (monthly data), 5 years, 10 years, or everything, offered only where the data reaches
    const span = pts.length > 1 ? pts[pts.length - 1][0] - pts[0][0] : 0, gapM = pts.length > 2 ? (pts[pts.length - 1][0] - pts[0][0]) / (pts.length - 1) : 1;
    // 0.13: the change on the last release, and when the next figure is due, for a tracked figure in the workspace
    const per = gapM < 0.12 ? "month" : gapM < 0.3 ? "quarter" : "year", L2 = pts.length >= 2 ? pts.slice(-2) : null, MON = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const perL = t => { const y = Math.floor(t + 1e-6), mi = Math.min(11, Math.round((t - y) * 12)); return per === "year" ? String(y) : per === "quarter" ? `Q${Math.floor(mi / 3) + 1} ${y}` : `${MON[mi]} ${y}`; };
    const lastStep = L2 ? { d: isP ? L2[1][1] - L2[0][1] : L2[0][1] ? (L2[1][1] / L2[0][1] - 1) * 100 : null, isP, per, at: perL(L2[1][0]), from: perL(L2[0][0]), next: perL(L2[1][0] + (per === "month" ? 1 / 12 : per === "quarter" ? 0.25 : 1)) } : null;
    const ranges = []; if (gapM < 0.2 && span > 1.2) ranges.push({ k: "1y", l: "12 months" }); if (span > 5.5) ranges.push({ k: "5y", l: "5 years" }); if (span > 10.5) ranges.push({ k: "10y", l: "10 years" });
    if (pts.length > 1) ranges.push({ k: "all", l: `Since ${Math.floor(pts[0][0])}` });
    const rangeAt = ranges.some(r => r.k === range) ? range : "all", yrs = { "1y": 1, "5y": 5, "10y": 10 }[rangeAt];
    if (yrs && pts.length) { const end = pts[pts.length - 1][0]; pts = pts.filter(p => p[0] > end - yrs - 1e-6); }
    const now = val(m, code), parts = splitStory(N ? N.story(m, code) : ""), topics = topicsOf(m.id, m.label, m.group, m.p);
    const w = why(pts, topics, { pts: isP, fmt: f });
    const items = [];
    const [head, rest] = parts.story ? first(parts.story) : [now ? `${esc(m.label)} in ${esc(where)}: <b>${esc(f(now.v))}</b>${now.yr ? ` (${esc(now.yr)})` : ""}` : `No figure for ${esc(where)} on this date.`, ""];
    const colour = "var(--pc-acc, currentColor)";
    items.push({ k: code === ctx.UKC ? "" : where, h: head.replace(/\.$/, ""), viz: pts.length > 1 ? viz.spark(pts, colour) : now ? viz.big(f(now.v), now.yr || "") : "", open: true,
      more: `${rest ? `<p>${rest}</p>` : ""}${pts.length > 2 ? `<div class="pc-chart">${ctx.CH.line([{ name: where, colour: "var(--ink-2,#56656b)", pts }], { w: 380, h: 190, vfmt: f, yfmt: v => ctx.CH.compact ? ctx.CH.compact(v) : String(v), events: w.events, hilo: true })}</div>${evList(w.events)}` : ""}`, cap: hiloCap(pts, f), map: { metrics: [id] } });
    if (pts.length > 2) items.push({ k: "Why it moved", h: w.lines.length ? first(w.lines[0])[0].replace(/<[^>]+>/g, "").replace(/\.$/, "") : "No sharp moves stand out", viz: viz.big(String(w.events.length), w.events.length === 1 ? "event" : "events"), more: whyHTML(w) });
    // across the map: the place's own boundary set (wards and seats compare with their own kind)
    const lv = ctx.P[code] && ["council", "region", "nation", "constituency"].includes(ctx.P[code].level) ? ctx.P[code].level : (m.levels && m.levels[0]) || "council";
    const rows = ctx.allCodesAt(lv).map(c => { const r = val(m, c); return r ? { c, v: r.v, t: f(r.v) } : null; }).filter(Boolean).sort((a, b) => b.v - a.v);
    if (rows.length >= 5 && m.scale !== "nominal") {
      const top = rows.slice(0, 5), bot = rows.slice(-3), hereI = rows.findIndex(r => r.c === code);
      items.push({ k: `Across the map · ${rows.length} ${({ council: "councils", region: "regions", nation: "nations", constituency: "seats" })[lv] || "places"}`, h: `Highest in ${esc(ctx.nameOf(top[0].c))} (${esc(top[0].t)}), lowest in ${esc(ctx.nameOf(rows[rows.length - 1].c))} (${esc(rows[rows.length - 1].t)})`,
        viz: viz.bars(top.map((r, i) => ({ v: r.v, c: r.c === code ? "#d0701c" : i ? "#9aa5ab" : "#3b78b5", n: ctx.nameOf(r.c) }))),
        more: `${ctx.CH.ranked(top.concat(hereI >= 5 && hereI < rows.length - 3 ? [rows[hereI]] : []).concat(bot).map(r => ({ name: ctx.nameOf(r.c), v: r.v, hl: r.c === code })), { w: 380, fmt: v => f(v) })}${hereI >= 0 ? `<p>${esc(ctx.nameOf(code))} is ${hereI + 1} of ${rows.length}.</p>` : ""}`, map: { metrics: [id], level: lv },
        // 0.12.1: each place opens its own card for this measure
        deep: top.concat(hereI >= 5 && hereI < rows.length - 3 ? [rows[hereI]] : []).concat(bot).map(r => ({ label: ctx.nameOf(r.c), sub: `${rows.indexOf(r) + 1} of ${rows.length}`, v: r.t, fn: () => metric(id, r.c) })), deepTitle: "Highest, then lowest" });
    }
    // 0.12.1: compared with the places it sits in; the related measures here; what goes with it across councils
    // 0.12.1: the lead says what matters (where it ranks, which way it's going); the generated sentence goes under it
    { const L = items[0], hi = rows.findIndex(r => r.c === code), nR = rows.length, ord = n => n + (n % 10 === 1 && n % 100 !== 11 ? "st" : n % 10 === 2 && n % 100 !== 12 ? "nd" : n % 10 === 3 && n % 100 !== 13 ? "rd" : "th");
      const plural = ({ council: "councils", region: "regions", nation: "nations", constituency: "seats" })[lv] || "places";
      const rank = hi < 0 || nR < 5 || m.scale === "nominal" ? "" : hi === 0 ? `Highest of ${nR} ${plural}` : hi === nR - 1 ? `Lowest of ${nR} ${plural}` : hi < 3 ? `${cap1(ord(hi + 1))} highest of ${nR} ${plural}` : hi >= nR - 3 ? `${cap1(ord(nR - hi))} lowest of ${nR} ${plural}` : hi < nR / 4 ? `In the top quarter of ${nR} ${plural}` : hi >= 3 * nR / 4 ? `In the bottom quarter of ${nR} ${plural}` : `Near the middle of ${nR} ${plural}`;
      let trend = ""; if (pts.length >= 3) { const a = pts[0], b = pts[pts.length - 1], abs = isP || m.nature === "rate" || m.nature === "share", d = abs ? b[1] - a[1] : a[1] ? (b[1] / a[1] - 1) * 100 : null;
        if (d != null && isFinite(d)) { const small = abs ? Math.abs(d) < Math.abs(a[1] || 1) * 0.01 : Math.abs(d) < 1; trend = small ? `about where it was in ${Math.floor(a[0])}` : `${d > 0 ? "up" : "down"} ${abs ? (isP ? Math.abs(d).toFixed(1) + " points" : f(Math.abs(d))) : Math.abs(d).toFixed(Math.abs(d) < 10 ? 1 : 0) + "%"} since ${Math.floor(a[0])}`; } }
      if (rank || trend) { const good = rank && trend && /^(Highest|In the top)/.test(rank) === /^up/.test(trend) ? ", and " : rank && trend ? ", though " : "";
        L.sub = L.h + "."; L.h = rank && trend ? `${rank}${good}${trend}` : rank || cap1(trend); } }
    const cmp = compareItem(m, code, f); if (cmp) items.push(cmp);
    const rel = relatedItem(m, code); if (rel) items.push(rel);
    const gw = goesWithItem(m, code, f); if (gw) items.push(gw);
    if (parts.means) { const t = first(parts.means.replace(/<[^>]+>/g, ""))[0] || m.label, cut = t.indexOf(": ") > 20 ? t.slice(0, t.indexOf(": ")) : t; items.push({ k: "What it tells us", h: esc(cut), viz: "", more: `<p>${parts.means}</p>` }); }   // 0.12: only when built from the data
    const src = ctx.sourceOf ? ctx.sourceOf(m) : (m.source || ""), url = (String(src).match(/https?:\/\/[^\s;),]+/) || [])[0] || "";
    items.push({ k: "Where it comes from", h: esc(String(src).replace(/https?:\/\/\S+/g, "").replace(/\s*[;,(]\s*$/, "").slice(0, 140) || "Atlas"), more: `${N && N.definition(m) ? `<p><b>What it measures.</b> ${esc(N.definition(m))}</p>` : ""}<p>${esc(src)}</p>${m.how ? `<p><b>How it's worked out.</b> ${esc(m.how)}</p>` : ""}`, url, urlLabel: "Source" });
    const rk = rows.length >= 5 ? rows.findIndex(r => r.c === code) : -1, ch = pts.length >= 2 ? (isP ? pts[pts.length - 1][1] - pts[0][1] : pts[0][1] ? (pts[pts.length - 1][1] / pts[0][1] - 1) * 100 : null) : null;
    const figs = [now ? { v: f(now.v), l: `${where}${now.yr ? ", " + now.yr : ""}` } : null, ch != null && isFinite(ch) ? { v: `${ch >= 0 ? "▲" : "▼"} ${Math.abs(ch).toFixed(Math.abs(ch) < 10 ? 1 : 0)}${isP ? " pt" : "%"}`, l: `since ${pts[0][0]}` } : null, rk >= 0 ? { v: `${rk + 1} of ${rows.length}`, l: "highest first" } : null];
    const crumbs = [APPN[m.p] || "Atlas", m.group, m.label].filter((x, i, a) => x && a.indexOf(x) === i);
    return { app: APPN[m.p] || "", title: m.label, crumbs, kicker: code === ctx.UKC ? [] : [where], ranges, rangeAt, range: r => metric(id, code, r), track: { metric: id, code }, lastStep, figs, items, source: String(src).split(/[;(]/)[0].replace(/https?:\/\/\S+/, "").trim().slice(0, 60) || "Atlas", when: now && now.yr ? String(now.yr) : ctx.longDate(ctx.date), map: { metrics: [id] }, links: url ? [{ label: "Source", url }] : [] };
  }

  // 0.13: the caption under a series: which point was highest (green on the chart) and which lowest (red)
  function hiloCap(pts, f) {
    pts = (pts || []).filter(p => p[1] != null && isFinite(p[1])); if (pts.length < 3) return "";
    let hi = pts[0], lo = pts[0]; pts.forEach(p => { if (p[1] > hi[1]) hi = p; if (p[1] < lo[1]) lo = p; });
    const dense = (pts[pts.length - 1][0] - pts[0][0]) / (pts.length - 1) < 0.9, when = x => whenOf(x, dense);
    return `Highest ${esc(f(hi[1]))} in ${esc(when(hi[0]))} (green); lowest ${esc(f(lo[1]))} in ${esc(when(lo[0]))} (red).`;
  }

  // ---------- 0.12.1: what a measure's card adds beyond the figure ----------
  const chain = code => { const out = []; let c = code, i = 0; while (c && i++ < 5) { const p = ctx.parentOf ? ctx.parentOf(c) : null; if (!p || p === c || out.includes(p)) break; out.push(p); c = p; } if (code !== ctx.UKC && !out.includes(ctx.UKC)) out.push(ctx.UKC); return out; };
  function compareItem(m, code, f) {
    const here = val(m, code); if (!here || code === ctx.UKC || m.scale === "nominal") return null;
    const ups = chain(code).map(c => ({ c, r: val(m, c) })).filter(x => x.r); if (!ups.length) return null;
    const uk = ups[ups.length - 1], d = here.v - uk.r.v, big = Math.abs(d) / (Math.abs(uk.r.v) || 1);
    const word = big < 0.03 ? "about the same as" : d > 0 ? "above" : "below";
    return { size: "half", k: "Compared with", h: `${word === "about the same as" ? "About the same as" : cap1(word)} ${esc(ctx.nameOf(uk.c) === "United Kingdom" ? "the UK" : ctx.nameOf(uk.c))}${word === "about the same as" ? "" : ` (${esc(f(uk.r.v))})`}`,
      viz: viz.bars([{ c: code, r: here }, ...ups].map((x, i) => ({ v: x.r.v, c: i ? "#9aa5ab" : "#d0701c", n: `${ctx.nameOf(x.c)}: ${f(x.r.v)}` }))),
      more: `<p>${esc(ctx.nameOf(code))}: <b>${esc(f(here.v))}</b>.</p>`, deep: ups.map(x => ({ label: ctx.nameOf(x.c), v: f(x.r.v), fn: () => metric(m.id, x.c) })) };
  }
  const cap1 = t => t.charAt(0).toUpperCase() + t.slice(1);
  function relatedItem(m, code) {
    const ms = ctx.METRICS.filter(x => x.id !== m.id && x.group === m.group && x.p === m.p && !/_(lq|top|share)$/.test(x.id) && x.scale !== "nominal" && x.nature !== "line" && x.nature !== "event").map(x => ({ x, r: val(x, code) })).filter(o => o.r).slice(0, 8);
    if (ms.length < 2) return null; const N = window.AtlasNarrative, fm = x => N ? N.fmtOf(x) : (v => String(v));
    return { size: "half", k: `More on ${m.group.toLowerCase()}`, h: `${ms.length} related measure${ms.length === 1 ? "" : "s"} for ${esc(code === ctx.UKC ? "the UK" : ctx.nameOf(code))}`,
      deep: ms.map(o => ({ label: o.x.label, v: fm(o.x)(o.r.v), fn: () => metric(o.x.id, code) })) };
  }
  // structural conditions that go with most local outcomes (rank correlation across councils)
  const WITH = ["imd_score", "gdp_per_head", "density", "average_age", "child_poverty", "claimant_rate", "c_bad_health", "c_social", "c_private", "smoking", "inactive", "pop_change"];
  const VEC = new Map();
  function vec(id) { const k = id + "|" + ctx.date; if (VEC.has(k)) return VEC.get(k); const m = ctx.M[id], o = new Map(); if (m) ctx.allCodesAt("council").forEach(c => { const r = val(m, c); if (r) o.set(c, r.v); }); VEC.set(k, o); return o; }
  function goesWithItem(m, code, f) {
    if (!window.AtlasStats || m.scale === "nominal" || (m.levels && !m.levels.includes("council"))) return null;
    const base = vec(m.id); if (base.size < 60) return null; const N = window.AtlasNarrative;
    const res = WITH.filter(id => id !== m.id && ctx.M[id] && ctx.M[id].group !== m.group).map(id => { const v = vec(id), cs = [...base.keys()].filter(c => v.has(c)); if (cs.length < 60) return null;
      const r = AtlasStats.spearman(cs.map(c => v.get(c)), cs.map(c => base.get(c))); return r && r.r != null && Math.abs(r.r) >= 0.4 && Math.abs(r.r) < 0.97 ? { id, r: r.r, n: cs.length, v } : null; }).filter(Boolean).sort((a, b) => Math.abs(b.r) - Math.abs(a.r)).slice(0, 3);
    if (!res.length) return null;
    const pctl = (map, c) => { if (!map.has(c)) return null; const x = map.get(c), all = [...map.values()]; return 100 * all.filter(y => y < x).length / (all.length - 1 || 1); };
    const lab = id => ctx.M[id].label.toLowerCase().replace(/\s*\(.*\)$/, ""), ml = m.label.toLowerCase().replace(/\s*\(.*\)$/, "");
    const lines = res.map(x => `Where ${lab(x.id)} is higher, ${ml} tends to be ${x.r > 0 ? "higher" : "lower"} (ρ = ${x.r.toFixed(2)} across ${x.n} councils).`);
    let fit = ""; const c0 = res[0], pb = pctl(base, code), px = pctl(c0.v, code);
    if (pb != null && px != null && ctx.P[code] && ctx.P[code].level === "council") { const agree = (px - 50) * (pb - 50) * Math.sign(c0.r) > 0, strong = Math.abs(px - 50) > 25;
      fit = `${esc(ctx.nameOf(code))} ${strong ? (agree ? "fits the pattern" : "bucks the trend") : "sits near the middle"}: ${lab(c0.id)} in the ${pctWord(px)}, ${ml} in the ${pctWord(pb)}.`; }
    return { k: "What goes with it", h: `${cap1(lab(res[0].id))} ${Math.abs(res[0].r) >= 0.7 ? "goes closely with it" : "goes with it"}${res[1] ? `, then ${esc(lab(res[1].id))}` : ""}`, sub: fit,
      viz: viz.bars(res.map(x => ({ v: Math.abs(x.r), c: x.r > 0 ? "#2e9d6a" : "#c0392b", n: `${ctx.M[x.id].label}: ρ ${x.r.toFixed(2)}` }))),
      more: `<ul class="pc-why">${lines.map(l => `<li>${esc(l)}</li>`).join("")}</ul><p class="pc-fine">Going together across places isn't proof that one causes the other: both can follow something else (age, income, how urban a place is). Green bars: rise together; red: one rises as the other falls.</p>`,
      deep: res.map(x => ({ label: ctx.M[x.id].label, sub: `ρ ${x.r.toFixed(2)}${ctx.P[code] && ctx.P[code].level === "council" && x.v.has(code) ? ` · here: ${pctWord(pctl(x.v, code))}` : ""}`, v: x.v.has(code) && N ? N.fmtOf(ctx.M[x.id])(x.v.get(code)) : "", fn: () => metric(x.id, code) })) };
  }
  const pctWord = p => p == null ? "—" : p >= 90 ? "top 10%" : p >= 75 ? "top quarter" : p <= 10 ? "bottom 10%" : p <= 25 ? "bottom quarter" : p >= 50 ? "upper half" : "lower half";

  // ---------- actions (delegated, so cards keep working in the workspace) ----------
  function applyMap(s) {
    if (!s || !ctx) return;
    try {
      if (s.date) ctx.setDate(s.date);
      if (s.level) ctx.setLevel(s.level);
      const ids = (s.metrics || []).filter(id => ctx.M[id]); if (ids.length) ctx.mapOnly(ids);
      if (s.pick) ctx.bd.pick(s.pick[0], s.pick[1]);
      if (s.focus) ctx.focus(s.focus);
      if (s.view) ctx.view(s.view[0], s.view[1]);
      if (s.fn && hooks.fns && hooks.fns[s.fn]) hooks.fns[s.fn](s);
      if (ids.length && ctx.toast) ctx.toast(`On the map: ${ids.map(id => ctx.M[id].label).join(", ")}.`);
    } catch (e) { console.error(e); }
  }
  const specOf = el => { const h = el && el.closest("[data-pcmapspec]"); try { return h ? JSON.parse(h.dataset.pcmapspec) : null; } catch (e) { return null; } };
  function cleanClone(card, only) {
    const c = card.cloneNode(true); c.querySelectorAll(".pc-menu").forEach(x => x.hidden = true);
    if (only) { const i = [...card.querySelectorAll(".pc-it")].indexOf(only); c.querySelectorAll(".pc-it").forEach((x, k) => { if (k !== i) x.remove(); else x.open = true; }); }
    return c;
  }
  function toWS(card, only) {
    const c = cleanClone(card, only), title = (only ? (only.querySelector(".pc-h") || {}).textContent : "") || (c.querySelector(".pc-pill") || {}).textContent || "Card";
    ctx.sendToWS({ type: "card", title: title.trim().slice(0, 90), html: c.outerHTML, w: 400, h: only ? 460 : 600 });
  }
  // one chart (or a picture) lifted out of a card: its own card, with the item's words and any event list under it
  function chartSpec(btn) {
    const card = btn.closest(".pcard"), it = btn.closest(".pc-it"); if (!card) return null;
    const box = btn.closest(".pc-chart, .pc-viz"), full = it && it.querySelector(".pc-body .pc-chart"), src = box && box.classList.contains("pc-viz") && full ? full : box; if (!src) return null;
    const c = src.cloneNode(true); c.querySelectorAll(".pc-vacts").forEach(x => x.remove());
    const svg = c.querySelector("svg"); if (svg && svg.classList.contains("spark")) { svg.removeAttribute("width"); svg.removeAttribute("height"); }
    const evs = it && it.querySelector(".pc-evs"), k = it && it.querySelector(".pc-k"), h = it && it.querySelector(".pc-h"), app = card.querySelector(".pc-app"), pill = card.querySelector(".pc-pill");
    return { app: app ? app.textContent : "", title: `${pill ? pill.textContent : "Chart"}${h ? "" : ""}`, items: [{ k: k ? k.textContent : "", h: h ? h.innerHTML : "", more: `<div class="pc-chart">${c.innerHTML}</div>${evs ? evs.outerHTML : ""}`, open: true }],
      source: (card.querySelector(".pc-src") || {}).textContent || "Atlas", when: (card.querySelector(".pc-when") || {}).textContent || "" };
  }
  // 0.12.1: going deeper inside a card's own window, and back again
  const BACK = new Map();
  function swapCard(card, spec, backId, backTitle) {
    const ttl = card.closest(".wm-win, .pcwin") && card.closest(".pcwin") ? card.closest(".pcwin").querySelector(".wm-title") : null;
    const place = sp => { const d = document.createElement("div"); d.innerHTML = html(sp); const n = d.firstElementChild; card.replaceWith(n); if (ttl) ttl.textContent = sp.title; const sc = n.closest(".wm-body"); if (sc) sc.scrollTop = 0; if (window.AtlasSort) AtlasSort.enhance && AtlasSort.enhance(n); return n; };
    if (typeof spec.then === "function") { card.classList.add("pc-loading"); spec.then(sp => { if (sp) place(Object.assign(sp, { _back: backId, _backTitle: (card.querySelector(".pc-pill") || {}).textContent })); else card.classList.remove("pc-loading"); }, () => card.classList.remove("pc-loading")); return; }
    place(Object.assign(spec, { _back: backId, _backTitle: backTitle != null ? backTitle : (card.querySelector(".pc-pill") || {}).textContent }));
  }
  // 0.13: sort a list (largest, smallest, A–Z) on the full list, ranks kept; See all; a chart made bigger
  function sortList(btn) {
    const head = btn.closest(".pc-dhead"), ul = head && head.nextElementSibling; if (!ul || !ul.classList.contains("pc-deep")) return;
    const dir = btn.dataset.pcsort, lis = [...ul.children];
    lis.sort((a, b) => dir === "az" ? a.dataset.l.localeCompare(b.dataset.l) : ((+b.dataset.v || 0) - (+a.dataset.v || 0)) * (dir === "asc" ? -1 : 1)).forEach(li => ul.appendChild(li));
    const all = ul.dataset.all === "1"; [...ul.children].forEach((li, i) => { li.hidden = !all && i >= 15; });
    head.querySelectorAll("[data-pcsort]").forEach(x => x.classList.toggle("on", x === btn));
  }
  function seeAll(btn) { const ul = btn.previousElementSibling; if (!ul) return; ul.dataset.all = "1"; [...ul.children].forEach(li => { li.hidden = false; li.classList.add("atl-rise"); }); btn.remove(); }
  function zoom(btn) {
    const ch = btn.closest(".pc-chart"); if (!ch) return;
    let back = document.getElementById("pc-zoomback");
    if (ch.classList.contains("pc-big")) { ch.classList.remove("pc-big"); if (back) back.hidden = true; return; }
    if (!back) { back = document.createElement("div"); back.id = "pc-zoomback"; back.className = "pc-zoomback"; document.body.appendChild(back); back.addEventListener("click", () => { document.querySelectorAll(".pc-chart.pc-big").forEach(x => x.classList.remove("pc-big")); back.hidden = true; }); }
    back.hidden = false; ch.classList.add("pc-big");
    if (!ch.querySelector(".pc-bigacts")) { const card = ch.closest(".pcard"), tr = card && card.dataset.pctrack; ch.insertAdjacentHTML("beforeend", `<div class="pc-bigacts"><button type="button" data-pcvws>${STAR} Send to workspace</button>${tr ? `<button type="button" data-pcpin>Pin to track</button>` : ""}<button type="button" data-pczoom>Close</button></div>`); }
  }
  function pin(card) {
    let t = null; try { t = JSON.parse(card.dataset.pctrack); } catch (e) {} if (!t || !ctx) return;
    ctx.sendToWS(Object.assign({ type: "track", title: (card.querySelector(".pc-pill") || {}).textContent || "Tracked", w: 300, h: 190 }, t));
  }
  function deepClick(e) {
    const s0 = e.target.closest && e.target.closest("[data-pcsort],[data-pcseeall],[data-pczoom],[data-pcpin]");
    if (s0 && s0.closest(".pcard")) { e.preventDefault(); e.stopPropagation(); if (s0.dataset.pcsort) sortList(s0); else if (s0.hasAttribute("data-pcseeall")) seeAll(s0); else if (s0.hasAttribute("data-pczoom")) zoom(s0); else pin(s0.closest(".pcard")); return true; }
    const rg = e.target.closest && e.target.closest("[data-pcrange]");
    if (rg) { const card = rg.closest(".pcard"), r = DEEP.get(rg.dataset.pcrange); if (!card || !r) return false; e.preventDefault(); e.stopPropagation(); let sp = null; try { sp = r.fn(); } catch (err) { console.error(err); } if (!sp) return true;
      const back = card.querySelector(".pc-back"); swapCard(card, sp, back ? back.dataset.pcback : null, back ? back.textContent.replace(/^‹\s*/, "") : null); return true; }
    const t = e.target.closest && e.target.closest("[data-pcdeep],[data-pcback],[data-pcfig]"); if (!t) return false;
    const card = t.closest(".pcard"); if (!card) return false;
    e.preventDefault(); e.stopPropagation();
    if (t.dataset.pcfig != null) { const it = card.querySelectorAll(".pc-items > .pc-it")[+t.dataset.pcfig]; if (!it) return true; if (it.tagName === "DETAILS") it.open = true; const b = it.querySelector(".pc-gob"); if (b) { b.click(); return true; } it.scrollIntoView({ block: "nearest", behavior: "smooth" }); it.classList.add("pc-flash"); setTimeout(() => it.classList.remove("pc-flash"), 900); return true; }
    if (t.dataset.pcback) { const prev = BACK.get(t.dataset.pcback); if (!prev) return true; const d = document.createElement("div"); d.innerHTML = prev.html; const n = d.firstElementChild; card.replaceWith(n); const ttl = n.closest(".pcwin") && n.closest(".pcwin").querySelector(".wm-title"); if (ttl) ttl.textContent = prev.title; return true; }
    const r = DEEP.get(t.dataset.pcdeep); if (!r) { ctx && ctx.toast && ctx.toast("Open this from Atlas to go deeper."); return true; }
    let spec = null; try { spec = r.fn(); } catch (err) { console.error(err); }
    if (!spec) return true;   // the row did its own thing (opened a panel, put something on the map)
    const id = "b" + (++deepSeq); BACK.set(id, { html: card.outerHTML, title: (card.querySelector(".pc-pill") || {}).textContent || "" });
    swapCard(card, spec, id); return true;
  }
  function bind() {
    document.addEventListener("click", e => { if (deepClick(e)) return; }, true);
    document.addEventListener("click", e => {
      const v = e.target.closest("[data-pcvws],[data-pcvcard]");
      if (v) { e.preventDefault(); e.stopPropagation(); const sp = chartSpec(v); if (!sp) return; if (v.hasAttribute("data-pcvcard")) open(sp); else { const d = document.createElement("div"); d.innerHTML = html(sp); ctx.sendToWS({ type: "card", title: sp.title, html: d.firstElementChild.outerHTML, w: 440, h: 460 }); } return; }
      const t = e.target.closest("[data-pcws],[data-pcwsi],[data-pcmap],[data-pcmenu],[data-pcpanel],[data-pccopy],[data-pcopen],[data-pcopenall]"); if (!t) { document.querySelectorAll(".pc-menu:not([hidden])").forEach(m => { if (!m.contains(e.target)) m.hidden = true; }); return; }
      const card = t.closest(".pcard"); if (!card) return;
      e.preventDefault(); e.stopPropagation();
      const menu = card.querySelector(".pc-menu"); if (menu && !t.hasAttribute("data-pcmenu")) menu.hidden = true;
      if (t.hasAttribute("data-pcmenu")) { menu.hidden = !menu.hidden; return; }
      if (t.hasAttribute("data-pcws")) return toWS(card);
      if (t.hasAttribute("data-pcwsi")) return toWS(card, t.closest(".pc-it"));
      if (t.hasAttribute("data-pcmap")) { const it = t.closest(".pc-it"); return applyMap(specOf(it || card) || specOf(card)); }
      if (t.hasAttribute("data-pcopenall")) { card.querySelectorAll(".pc-it").forEach(d => d.open = true); return; }
      if (t.hasAttribute("data-pcopen")) { const w = ctx.WM.make({ type: "pcard", title: (card.querySelector(".pc-pill") || {}).textContent || "Card", html: cleanClone(card).outerHTML, cascade: true, min: { w: 300, h: 240 } }); w.el.classList.add("pcwin"); ctx.WM.open(w.el); return; }
      if (t.hasAttribute("data-pccopy")) return ctx.copy(card.innerText.replace(/\n{3,}/g, "\n\n"), "the card's text");
      if (t.dataset.pcpanel && hooks.openPanel) return hooks.openPanel(t.dataset.pcpanel);
    }, true);
    peekBind();
  }

  // ---------- the peek: hover an ⓘ beside a metric ----------
  let peekEl = null, peekT = 0, hideT = 0, peekFor = null;
  function peekHTML(id) {
    const s = metric(id); if (!s) return "";
    const it = s.items[0], m = ctx.M[id], N = window.AtlasNarrative, parts = splitStory(N ? N.story(m, ctx.focused && ctx.P[ctx.focused] ? ctx.focused : ctx.UKC) : "");
    const src = s.links[0];
    return `<div class="pk-top"><span class="pc-logo">ATLAS</span><span class="pc-app">${esc(s.app)}</span></div><div class="pc-pill">${esc(s.title)}</div>
      <div class="pk-row"><div class="pc-txt"><div class="pc-k">${esc(it.k)}</div><div class="pc-h">${it.h}</div></div>${it.viz ? `<div class="pc-viz">${it.viz}</div>` : ""}</div>
      ${parts.means || (N && N.definition(m)) ? `<p class="pk-means">${esc(first((parts.means || N.definition(m)).replace(/<[^>]+>/g, ""))[0])}</p>` : ""}
      <div class="pk-acts"><button type="button" class="btn sm" data-pkmap="${esc(id)}">Put on map</button><button type="button" class="btn sm" data-pkws="${esc(id)}">${STAR} Workspace</button><button type="button" class="btn sm primary" data-pkcard="${esc(id)}">Create card</button>${src ? `<a href="${esc(src.url)}" target="_blank" rel="noopener">Source ↗</a>` : ""}</div>`;
  }
  function showPeek(btn) {
    const id = btn.dataset.info; if (!ctx || !ctx.M[id]) return;
    if (!peekEl) { peekEl = document.createElement("div"); peekEl.id = "pc-peek"; peekEl.className = "pc-peek"; peekEl.setAttribute("role", "dialog"); document.body.appendChild(peekEl);
      peekEl.addEventListener("pointerenter", () => clearTimeout(hideT)); peekEl.addEventListener("pointerleave", () => { hideT = setTimeout(hidePeek, 250); }); }
    const h = peekHTML(id); if (!h) return; peekFor = id; peekEl.innerHTML = h; peekEl.hidden = false;
    const r = btn.getBoundingClientRect(), W = Math.min(340, innerWidth - 24), H = peekEl.offsetHeight;
    let x = r.right + 10, y = r.top - 20; if (x + W > innerWidth - 12) x = Math.max(12, r.left - W - 10); if (y + H > innerHeight - 12) y = Math.max(12, innerHeight - H - 12);
    peekEl.style.left = x + "px"; peekEl.style.top = y + "px"; peekEl.style.width = W + "px";
  }
  function hidePeek() { if (peekEl) peekEl.hidden = true; peekFor = null; }
  function peekBind() {
    const fine = window.matchMedia && matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (fine) {
      document.addEventListener("pointerover", e => { const b = e.target.closest && e.target.closest(".ib-i[data-info]"); if (!b || !ctx || !ctx.M[b.dataset.info]) return; clearTimeout(hideT); clearTimeout(peekT); if (peekFor === b.dataset.info && peekEl && !peekEl.hidden) return; peekT = setTimeout(() => showPeek(b), 280); });
      document.addEventListener("pointerout", e => { const b = e.target.closest && e.target.closest(".ib-i[data-info]"); if (!b) return; clearTimeout(peekT); hideT = setTimeout(hidePeek, 300); });
    }
    document.addEventListener("click", e => {
      const t = e.target.closest("[data-pkmap],[data-pkws],[data-pkcard]"); if (!t) { if (peekEl && !peekEl.hidden && !peekEl.contains(e.target)) hidePeek(); return; }
      e.preventDefault(); e.stopPropagation(); const id = t.dataset.pkmap || t.dataset.pkws || t.dataset.pkcard;
      if (t.dataset.pkmap) { if (ctx.mapAdd) ctx.mapAdd(id); else applyMap({ metrics: [id] }); }
      else if (t.dataset.pkws) { const d = document.createElement("div"); d.innerHTML = html(metric(id)); toWS(d.firstElementChild); }
      else open(metric(id));
      hidePeek();
    }, true);
    document.addEventListener("keydown", e => { if (e.key === "Escape" && peekEl && !peekEl.hidden) hidePeek(); });
  }

  window.AtlasCard = { deepRef, deepList, init(c, h) { ctx = c; Object.assign(hooks, h || {}); bind(); }, html, open, metric, why, whyHTML, evList, viz, applyMap, topicsOf, item, esc, hidePeek, showPeek: id => { const b = document.querySelector(`.ib-i[data-info="${id}"]`); if (b) showPeek(b); } };
})();
