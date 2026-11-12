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
    big(text, sub) { return `<div class="pc-bign"><b>${esc(text)}</b>${sub ? `<small>${esc(sub)}</small>` : ""}</div>`; },
  };

  // ---------- the card ----------
  const STAR = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
  const js = o => esc(JSON.stringify(o));
  function item(it) {
    if (!it) return "";
    const acts = `${it.map ? `<button type="button" data-pcmap>Put on map</button>` : ""}<button type="button" data-pcwsi>Send to workspace</button>${it.url ? `<a href="${esc(it.url)}" target="_blank" rel="noopener">${esc(it.urlLabel || "Read more")} ↗</a>` : ""}`;
    return `<details class="pc-it"${it.open ? " open" : ""}${it.map ? ` data-pcmapspec="${js(it.map)}"` : ""}><summary><div class="pc-txt">${it.k ? `<div class="pc-k">${esc(it.k)}</div>` : ""}<div class="pc-h">${it.h}</div></div>${it.viz ? `<div class="pc-viz">${it.viz}</div>` : ""}</summary>
      <div class="pc-body">${it.more || ""}<div class="pc-iacts">${acts}</div></div></details>`;
  }
  function html(spec) {
    const id = "pc" + (++seq) + "-" + Date.now().toString(36);
    const links = (spec.links || []).filter(l => l && l.url);
    return `<article class="pcard" data-pcard="${id}"${spec.map ? ` data-pcmapspec="${js(spec.map)}"` : ""}${spec.panel ? ` data-pcpanelid="${esc(spec.panel)}"` : ""}>
      <header class="pc-top"><div class="pc-brand"><span class="pc-logo">ATLAS</span>${spec.app ? `<span class="pc-app">${esc(spec.app)}</span>` : ""}</div>
        <button type="button" class="pc-follow" data-pcws title="Send this card to the workspace">${STAR}<span>Workspace</span></button></header>
      <div class="pc-pill">${esc(spec.title)}</div>${spec.lede ? `<p class="pc-lede">${spec.lede}</p>` : ""}
      <div class="pc-items">${(spec.items || []).map(item).join("")}</div>
      <footer class="pc-foot"><span class="pc-fav" aria-hidden="true">A</span><span class="pc-src">${esc(spec.source || "Atlas")}</span>${spec.when ? `<span class="pc-dot">•</span><span class="pc-when">${esc(spec.when)}</span>` : ""}
        <button type="button" class="pc-dots" data-pcmenu aria-label="More actions" title="More actions"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="5" r="1.9"/><circle cx="12" cy="12" r="1.9"/><circle cx="12" cy="19" r="1.9"/></svg></button>
        <div class="pc-menu" hidden>${spec.map ? `<button type="button" data-pcmap>Put on map</button>` : ""}<button type="button" data-pcws>Send to workspace</button><button type="button" data-pcopen>Open as a card</button><button type="button" data-pcopenall>Open every item</button><button type="button" data-pccopy>Copy the text</button>${spec.panel ? `<button type="button" data-pcpanel="${esc(spec.panel)}">Open the full panel</button>` : ""}${links.map(l => `<a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label || "Source")} ↗</a>`).join("")}</div></footer></article>`;
  }
  function open(spec) {
    if (!spec || !ctx) return null;
    const top = ctx.WM.TOPNOW ? ctx.WM.TOPNOW() : 90, W = Math.min(440, innerWidth - 32);
    const w = ctx.WM.make({ type: "pcard", title: spec.title, html: html(spec), cascade: true, min: { w: 300, h: 240 }, def: () => ({ x: Math.max(16, innerWidth - W - 24), y: top + 8, w: W, h: Math.min(680, innerHeight - top - 24) }) });
    w.el.classList.add("pcwin"); ctx.WM.open(w.el); return w;
  }

  // ---------- one metric's card ----------
  function val(m, c, d) { try { const r = m.get(c, d || ctx.date); return r && r.v != null && !r.nm && isFinite(r.v) ? r : null; } catch (e) { return null; } }
  function splitStory(h) { const d = document.createElement("div"); d.innerHTML = h || ""; const q = s => d.querySelector(s); return { story: q(".nv-story") ? q(".nv-story").innerHTML : "", means: q(".nv-means") ? q(".nv-means").innerHTML.replace(/^<b>[^<]*<\/b>\s*/, "") : "", trust: q(".nv-trust") ? q(".nv-trust").innerHTML.replace(/^<b>[^<]*<\/b>\s*/, "") : "" }; }
  const first = h => { const P = window.AtlasPanel; return P ? P.firstSentence(h) : [h, ""]; };
  function metric(id, code) {
    const m = ctx && ctx.M[id]; if (!m) return null; const N = window.AtlasNarrative;
    code = code && ctx.P[code] ? code : ctx.focused && ctx.P[ctx.focused] ? ctx.focused : ctx.UKC;
    const where = code === ctx.UKC ? "the UK" : ctx.nameOf(code), f = N ? N.fmtOf(m) : String, isP = N ? N.isPts(m) : false;
    let pts = N && m.temporal !== "election" ? N.series(m, code) : [];
    const now = val(m, code), parts = splitStory(N ? N.story(m, code) : ""), topics = topicsOf(m.id, m.label, m.group, m.p);
    const w = why(pts, topics, { pts: isP, fmt: f });
    const items = [];
    const [head, rest] = parts.story ? first(parts.story) : [now ? `${esc(m.label)} in ${esc(where)}: <b>${esc(now.text || f(now.v))}</b>` : `No figure for ${esc(where)} on this date.`, ""];
    const colour = "var(--pc-acc, currentColor)";
    items.push({ k: `The story · ${where}`, h: head.replace(/\.$/, ""), viz: pts.length > 1 ? viz.spark(pts, colour) : now ? viz.big(now.text || f(now.v), now.yr || "") : "", open: true,
      more: `${rest ? `<p>${rest}</p>` : ""}${pts.length > 2 ? `<div class="pc-chart">${ctx.CH.line([{ name: where, colour: "#3b78b5", pts }], { w: 380, h: 190, vfmt: f, yfmt: v => ctx.CH.compact ? ctx.CH.compact(v) : String(v), events: w.events })}</div>${evList(w.events)}` : ""}`, map: { metrics: [id] } });
    if (pts.length > 2) items.push({ k: "Why it moved", h: w.lines.length ? first(w.lines[0])[0].replace(/<[^>]+>/g, "").replace(/\.$/, "") : "No sharp moves stand out", viz: viz.big(String(w.events.length), w.events.length === 1 ? "event" : "events"), more: whyHTML(w) });
    // across the map: the place's own boundary set (wards and seats compare with their own kind)
    const lv = ctx.P[code] && ["council", "region", "nation", "constituency"].includes(ctx.P[code].level) ? ctx.P[code].level : (m.levels && m.levels[0]) || "council";
    const rows = ctx.allCodesAt(lv).map(c => { const r = val(m, c); return r ? { c, v: r.v, t: r.text || f(r.v) } : null; }).filter(Boolean).sort((a, b) => b.v - a.v);
    if (rows.length >= 5 && m.scale !== "nominal") {
      const top = rows.slice(0, 5), bot = rows.slice(-3), hereI = rows.findIndex(r => r.c === code);
      items.push({ k: `Across the map · ${rows.length} ${({ council: "councils", region: "regions", nation: "nations", constituency: "seats" })[lv] || "places"}`, h: `Highest in ${esc(ctx.nameOf(top[0].c))} (${esc(top[0].t)}), lowest in ${esc(ctx.nameOf(rows[rows.length - 1].c))} (${esc(rows[rows.length - 1].t)})`,
        viz: viz.bars(top.map((r, i) => ({ v: r.v, c: r.c === code ? "#d0701c" : i ? "#9aa5ab" : "#3b78b5", n: ctx.nameOf(r.c) }))),
        more: `${ctx.CH.ranked(top.concat(hereI >= 5 && hereI < rows.length - 3 ? [rows[hereI]] : []).concat(bot).map(r => ({ name: ctx.nameOf(r.c), v: r.v, hl: r.c === code })), { w: 380, fmt: v => f(v) })}${hereI >= 0 ? `<p>${esc(ctx.nameOf(code))} is ${hereI + 1} of ${rows.length}.</p>` : ""}`, map: { metrics: [id], level: lv } });
    }
    if (parts.means || parts.trust) items.push({ k: "What it tells us", h: esc(first(parts.means.replace(/<[^>]+>/g, ""))[0] || m.label), viz: "", more: `${parts.means ? `<p>${parts.means}</p>` : ""}${parts.trust ? `<p><b>How far to trust it.</b> ${parts.trust}</p>` : ""}` });
    const src = ctx.sourceOf ? ctx.sourceOf(m) : (m.source || ""), url = (String(src).match(/https?:\/\/[^\s;),]+/) || [])[0] || "";
    items.push({ k: "Where it comes from", h: esc(String(src).replace(/https?:\/\/\S+/g, "").replace(/\s*[;,(]\s*$/, "").slice(0, 140) || "Atlas"), more: `<p>${esc(src)}</p>${m.how ? `<p><b>How it's worked out.</b> ${esc(m.how)}</p>` : ""}`, url, urlLabel: "Source" });
    return { app: APPN[m.p] || "", title: m.label, items, source: String(src).split(/[;(]/)[0].replace(/https?:\/\/\S+/, "").trim().slice(0, 60) || "Atlas", when: now && now.yr ? String(now.yr) : ctx.longDate(ctx.date), map: { metrics: [id] }, links: url ? [{ label: "Source", url }] : [] };
  }

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
  function bind() {
    document.addEventListener("click", e => {
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
      ${parts.means ? `<p class="pk-means">${esc(first(parts.means.replace(/<[^>]+>/g, ""))[0])}</p>` : ""}
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

  window.AtlasCard = { init(c, h) { ctx = c; Object.assign(hooks, h || {}); bind(); }, html, open, metric, why, whyHTML, evList, viz, applyMap, topicsOf, item, esc, hidePeek, showPeek: id => { const b = document.querySelector(`.ib-i[data-info="${id}"]`); if (b) showPeek(b); } };
})();
