/* Atlas 0.10 · editorial panels (core). Every data panel opened from an app's header reads like a short explainer:
 *   a small kicker (app · panel), a serif headline that states the main finding, the story, what it tells us and how far
 *   to trust it, a row of big figures, sections divided by thin rules, and the sources folded away at the end.
 * Panels don't need to change: AtlasPanel.dress() rearranges what they draw. A panel with a story (a .nv block from
 * narrative.js, or its own) gets its first sentence as the headline; without one, its description stands in.
 * Forms and tools (calculators, posting, messages) are left alone: a panel opts out with `editorial: false`.
 */
(function () {
  "use strict";
  const esc = t => String(t == null ? "" : t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  function firstSentence(html) { // split a story's HTML into its first sentence and the rest (not inside a number like £1.5bn)
    const tmp = document.createElement("div"); tmp.innerHTML = html; const text = tmp.textContent.trim();
    const m = text.match(/^(.{20,220}?[.!?])(\s+[A-Z(£0-9]|\s*$)/); if (!m) return [text, ""];
    const head = m[1];
    // remove the same characters from the HTML: walk text nodes until head is consumed
    let left = head.length; const walker = document.createTreeWalker(tmp, NodeFilter.SHOW_TEXT); let n, started = false;
    while ((n = walker.nextNode()) && left > 0) {
      let t = n.nodeValue; if (!started) { const lead = t.length - t.replace(/^\s+/, "").length; t = t.slice(lead); started = true; }
      if (t.length <= left) { left -= t.length; n.nodeValue = ""; } else { n.nodeValue = t.slice(left); left = 0; }
    }
    return [head, tmp.innerHTML.trim()];
  }
  function dress(body, meta) {
    if (!body || body.querySelector(":scope > .ed-head") || meta.editorial === false) return;
    if (!body.firstElementChild) return;
    body.classList.add("ed");
    const nv = body.querySelector(".nv"), story = nv && nv.querySelector(".nv-story");
    let headline = "", rest = "";
    if (story) { [headline, rest] = firstSentence(story.innerHTML); if (rest) story.innerHTML = rest; else story.remove(); }
    const head = document.createElement("header"); head.className = "ed-head";
    // 0.12: ATLAS and the app, with the panel's name beside it; the black bar below is the Summary, open
    head.innerHTML = `<div class="ed-kick ed-mast"><span class="pc-logo">ATLAS</span> <span class="pc-app">${esc(meta.app)}</span><span class="ed-ptl"> · ${esc(meta.title)}</span><span class="ed-crumb">${esc(String(meta.app || "").replace(/^Atlas /i, ""))}<span class="vr"></span>${esc(meta.title)}</span></div>`;   // 0.13: the crumb line, as designed
    body.insertBefore(head, body.firstChild);
    // 0.12: definitions ("What it tells us" that only describes the measure) and caveats ("How far to trust it") leave the
    // Summary for "How to read this · Sources"; a "What it tells us" built from the data (.nv-data) stays
    const moved = [...body.querySelectorAll(".nv-trust, .nv-means:not(.nv-data)")].map(p => { const h = p.innerHTML.replace(/^\s*<b>[^<]*<\/b>\s*/, ""); p.remove(); return h; }).filter(Boolean);
    const fig = body.querySelector(":scope > .tr-head");
    // the Summary: the headline, the story and the big figures, open when the panel opens
    const sumBody = document.createElement("div"); sumBody.className = "ed-sbody";
    if (headline) sumBody.insertAdjacentHTML("beforeend", `<h2 class="ed-h">${esc(headline.replace(/\.$/, ""))}</h2>`);
    else if (meta.blurb) sumBody.insertAdjacentHTML("beforeend", `<p class="ed-dek">${esc(meta.blurb)}</p>`);
    if (nv) { nv.classList.add("ed-story"); sumBody.appendChild(nv); }
    if (fig) { fig.classList.add("ed-figs"); sumBody.appendChild(fig); }
    // 0.13.1: every panel gets a hero. Without a story or figures of its own, its menu's sentence and headline figures stand in
    if (!fig && meta.id && window.AtlasMenu) { const sp = specOf(meta.id);
      if (sp) { const lede = !headline && (sp.lede || "") !== (meta.blurb || "") ? sp.lede : ""; if (lede && !sumBody.querySelector(".ed-dek")) sumBody.insertAdjacentHTML("beforeend", `<p class="ed-dek">${esc(lede)}</p>`);
        const fs = []; (sp.sections || []).forEach(sc => (sc.figures || []).forEach(f => { if (f && f.value != null && fs.length < 3 && !fs.some(x => x.label === f.label)) fs.push(f); }));
        if (fs.length && !headline && !sumBody.querySelector(".ed-h")) { sumBody.insertAdjacentHTML("afterbegin", `<h2 class="ed-h">${esc(`${fs[0].label}: ${String(fs[0].value).replace(/\s*·.*$/, "")}`)}</h2>`); }
        if (fs.length) { const row = document.createElement("div"); row.className = "ed-figs ed-af"; row.innerHTML = fs.map((f, i) => figHTML(f, i)).join(""); row._figs = fs; sumBody.appendChild(row); } } }
    const sum = document.createElement("details"); sum.className = "ed-sec ed-summary"; sum.open = true;
    sum.innerHTML = `<summary class="pc-pill ed-pill"><span class="ed-st">Summary</span></summary>`; sum.appendChild(sumBody); head.after(sum);
    // notes: the explanations before the first section, and the closing source line, fold into "How to read this · Sources"
    const kids = [...body.children], firstH = kids.findIndex(n => n.tagName === "H4");
    const intro = kids.filter((n, i) => (firstH < 0 || i < firstH) && n.matches("p.ap-note:not(.ap-keep)") && !n.querySelector("button, input, select, a[data-go]"));   // .ap-keep: instructions stay in view
    const tail = [...body.querySelectorAll(":scope > .ap-note, :scope > .ec-src, :scope > .mo-src")].filter(p => /OGL|Licence|Source|ONS|HMRC|DWP|MHCLG|Treasury|Fingertips|Census|Bank of England|Electoral Commission/.test(p.textContent) && p === body.lastElementChild);
    const fold = [...new Set([...intro, ...tail])];
    if (fold.length || moved.length) { const d = document.createElement("details"); d.className = "ed-notes"; d.innerHTML = `<summary>How to read this · Sources</summary>${moved.map(h => `<p class="ap-note">${h}</p>`).join("")}`; fold.forEach(p => d.appendChild(p)); body.appendChild(d); }
    // 0.13 (as designed): what sits between the summary and the first section (the main chart, its switch) belongs to the summary, the hero
    { let n = sum.nextElementSibling; const mv = []; while (n && n.tagName !== "H4" && !n.classList.contains("ed-notes") && !n.classList.contains("ed-sec")) { if (!n.matches("p.ap-keep, .ap-keep")) mv.push(n); n = n.nextElementSibling; } mv.forEach(x => sumBody.appendChild(x)); }
    { const af = sumBody.querySelector(":scope > .ed-af"); if (af) { const pre = [...sumBody.children].find(n => n !== af && !n.matches("p, h2, .nv, .ed-story, .ap-row, .ap-warn")); if (pre) sumBody.insertBefore(af, pre); else sumBody.appendChild(af); } }
    if (!body.querySelector(":scope > h4") && meta.id) menuSections(body, meta);
    // 0.13.1: no headline of its own: the panel's one-line description is the headline
    if (!sumBody.querySelector(".ed-h")) { const dk = sumBody.querySelector(":scope > .ed-dek"); if (dk) { const h = document.createElement("h2"); h.className = "ed-h"; h.textContent = dk.textContent.replace(/\.$/, ""); dk.replaceWith(h); } }
    // 0.13.1: no chart in the summary, and the first section is a chart: it becomes the summary's main chart, as designed
    { const h1 = body.querySelector(":scope > h4"); if (h1 && !sumBody.querySelector("svg, canvas, .pc-vb, .ed-share")) { const blk = []; let n = h1.nextElementSibling; while (n && n.tagName !== "H4" && !n.classList.contains("ed-notes")) { blk.push(n); n = n.nextElementSibling; }
      const charty = blk.filter(x => x.matches("svg, canvas, figure, .ec-chartwrap, .chart, .tscroll") || (x.querySelector && x.querySelector(":scope > svg, :scope > canvas") && !x.querySelector("table, ol, ul, select, input"))), other = blk.filter(x => !charty.includes(x) && !x.matches(".ws-sends, p.ap-note, .cap, figcaption"));
      if (charty.length && !other.length) { const t = document.createElement("h3"); t.className = "ed-ct"; t.textContent = titleOf(h1); h1.remove(); sumBody.appendChild(t); blk.forEach(x => sumBody.appendChild(x)); } } }
    try { restyle(sumBody); } catch (e) { console.error(e); }
    sections(body, meta);
    // 0.13.1: still no headline: the first section's lead says what the panel holds
    if (!sumBody.querySelector(".ed-h")) { const ld = body.querySelector(":scope > details.ed-sec:not(.ed-summary) .ed-tlead"), t = ld && ld.textContent.trim().length > 12 ? ld.textContent.trim().replace(/\.$/, "") : "";
      sumBody.insertAdjacentHTML("afterbegin", `<h2 class="ed-h">${esc(t && !/^(A chart|\d+ in the list)/.test(t) ? t : meta.title || "")}</h2>`); }
  }
  function specOf(id) { try { return window.AtlasMenu && AtlasMenu.specFor(id); } catch (e) { return null; } }
  // a figure: the number large, any words after it small beneath, then what it is and its change (rises green, falls red)
  function splitFig(v) { const t = String(v == null ? "" : v).trim(), m = t.match(/^([−+\-]?\s?[£$€]?\d[\d,.]*\s?(?:%|bn|tn|m|k|pts?|pt)?)(?:\s+(.+))?$/i);
    if (!m || !m[2] || t.length <= 12) return [t, ""]; return [m[1].trim(), m[2].replace(/^\(([^)]*)\)/, "$1").replace(/^·\s*/, "")]; }
  function figHTML(f, i) { const [n, rest] = splitFig(f.value), ch = String(f.chg || ""), dir = /^[▲+]/.test(ch) ? "up" : /^[▼−-]/.test(ch) ? "down" : "";
    return `<button type="button" class="ed-f" data-edfig="${i}" title="${esc(f.label + ": " + f.value)}"><b>${esc(n)}</b>${rest ? `<small>${esc(rest)}</small>` : ""}<span>${esc(f.label)}</span>${ch ? `<em class="${dir}">${esc(ch)}</em>` : ""}</button>`; }
  document.addEventListener("click", e => { const b = e.target.closest && e.target.closest("[data-edfig]"); if (!b) return; const row = b.closest(".ed-af"), f = row && row._figs && row._figs[+b.dataset.edfig]; if (f && window.AtlasMenu) { e.preventDefault(); AtlasMenu.act(f, "go"); } });
  function menuSections(body, meta) {
    const sp = specOf(meta.id); if (!sp || !sp.sections) return;
    const secs = sp.sections.filter(sc => sc && (sc.items || []).filter(it => it && !it.isPanel).length); if (!secs.length) return;
    const notes = body.querySelector(":scope > .ed-notes");
    secs.forEach(sc => { const items = sc.items.filter(it => it && !it.isPanel), h = document.createElement("h4"), ul = document.createElement("ul"), lead = document.createElement("p");
      h.textContent = sc.label; lead.textContent = sc.note || `${items.length} ${items.length === 1 ? "measure" : "measures"}: ${items.slice(0, 3).map(it => it.label).join(", ")}${items.length > 3 ? " and more" : ""}.`;
      ul.className = "ed-items"; ul.setAttribute("data-nosort", ""); ul._items = items;
      ul.innerHTML = items.map((it, i) => `<li><button type="button" data-editem="${i}"><span class="ed-in">${esc(it.label)}</span>${it.sub ? `<span class="ed-is">${esc(String(it.sub).length >= 68 && !/[.)%]$/.test(it.sub) ? String(it.sub).replace(/\s+\S*$/, "") + "…" : it.sub)}</span>` : ""}<i aria-hidden="true">›</i></button></li>`).join("");
      if (notes) body.insertBefore(h, notes), body.insertBefore(lead, notes), body.insertBefore(ul, notes); else body.append(h, lead, ul); });
  }
  document.addEventListener("click", e => { const b = e.target.closest && e.target.closest("[data-editem]"); if (!b) return; const ul = b.closest(".ed-items"), it = ul && ul._items && ul._items[+b.dataset.editem]; if (it && window.AtlasMenu) { e.preventDefault(); AtlasMenu.act(it, "go"); } });
  // ---------- 0.13.1: what a section holds, in the new look (every table in every panel) ----------
  const NUMV = c => window.AtlasSort ? AtlasSort.num(c ? (c.dataset && c.dataset.v != null && c.dataset.v !== "" ? c.dataset.v : c.textContent) : null) : null;
  function tableInfo(tb) {
    const rows = [...(tb.tBodies[0] || tb).rows].filter(r => !r.closest("thead") && r.cells.length >= 2 && !r.querySelector("[colspan]"));
    const heads = tb.tHead && tb.tHead.rows[0] ? [...tb.tHead.rows[0].cells].map(c => c.textContent.trim()) : [];
    const n = Math.max(0, ...rows.map(r => r.cells.length)), cols = [];
    for (let i = 1; i < n; i++) { const k = rows.filter(r => NUMV(r.cells[i]) != null).length; if (k >= Math.max(2, rows.length * 0.6)) cols.push(i); }
    const isChg = i => /change|±|swing|diff|rise|fall|since|vs\b/i.test(heads[i] || "") || rows.filter(r => /^\s*[+−-]/.test(r.cells[i] ? r.cells[i].textContent : "")).length >= rows.length * 0.5;
    const pri = cols.find(i => /now|latest|total|seats|share|value|amount|number|count|votes|£|%/i.test(heads[i] || "") && !isChg(i)) || cols.filter(i => !isChg(i)).pop() || cols[0];
    return { rows, heads, cols, pri, isChg };
  }
  function tableLead(tb) {
    const T = tableInfo(tb); if (!T.rows.length) return "";
    const name = r => r.cells[0].textContent.trim().replace(/\s+/g, " ").slice(0, 40);
    if (T.pri == null) return `${T.rows.length} in the list: ${T.rows.slice(0, 3).map(name).join(", ")}${T.rows.length > 3 ? "…" : ""}`;
    const top = T.rows.slice().sort((a, b) => (NUMV(b.cells[T.pri]) || -Infinity) - (NUMV(a.cells[T.pri]) || -Infinity)).slice(0, 3);
    const pre = T.rows.length > 12 ? `${T.rows.length.toLocaleString("en-GB")} in the list; highest ${(T.heads[T.pri] || "").toLowerCase() || "first"}: ` : "";
    return pre + top.map(r => `${name(r)} ${r.cells[T.pri].textContent.trim()}`).join(", ");
  }
  function restyle(bd) {
    bd.querySelectorAll("table").forEach(tb => {
      if (tb._edr || tb.closest(".ec-tile, .ed-head, svg, .pc-peek") || tb.parentElement.closest("table")) return; tb._edr = 1;
      const T = tableInfo(tb); tb.classList.add("ed-rtab"); if (T.rows.length < 2) return;
      T.cols.forEach(i => { if (!T.isChg(i)) return; T.rows.forEach(r => { const c = r.cells[i], v = NUMV(c); if (c && v) c.classList.add(v > 0 ? "ed-up" : "ed-down"); }); });
      if (T.pri == null) return;
      const vals = T.rows.map(r => NUMV(r.cells[T.pri])), mx = Math.max(0, ...vals.filter(v => v != null).map(Math.abs)); if (!mx) return;
      T.rows.forEach((r, k) => { const c = r.cells[T.pri], v = vals[k]; if (v == null) return; const sw = r.querySelector(".sw, .swatch, i[style*='background']"); c.classList.add("ed-bar"); c.style.setProperty("--w", (100 * Math.abs(v) / mx).toFixed(1) + "%"); if (sw && sw.style.background) c.style.setProperty("--bc", sw.style.background); });
      // shares of one whole with colours: a share bar above, as in the designs
      const pct = T.rows.every((r, k) => vals[k] == null || /%/.test(r.cells[T.pri].textContent)), tot = vals.reduce((a, v) => a + (v > 0 ? v : 0), 0);
      if (pct && tot > 80 && tot < 105 && T.rows.length <= 16 && T.rows.some(r => r.querySelector(".sw")) && !(tb.previousElementSibling && tb.previousElementSibling.classList.contains("ed-share"))) {
        const seg = T.rows.map((r, k) => ({ v: vals[k], n: r.cells[0].textContent.trim(), c: (r.querySelector(".sw") || {}).style ? r.querySelector(".sw").style.background : "" })).filter(x => x.v > 0).sort((a, b) => b.v - a.v);
        tb.insertAdjacentHTML("beforebegin", `<div class="ed-share" role="img" aria-label="${esc(T.heads[T.pri] || "Shares")}">${seg.map(x => `<i style="flex:${x.v};background:${x.c || "var(--ink-3)"}" title="${esc(x.n + ": " + x.v + "%")}">${x.v >= 9 ? `<span>${esc(x.n.slice(0, 18))}</span><b>${x.v.toFixed(x.v < 10 ? 1 : 0)}%</b>` : ""}</i>`).join("")}</div>`); }
      // the sort row: Largest first · Smallest first · A–Z, on the main column
      if (T.rows.length >= 4 && !tb.hasAttribute("data-nosort")) { const bar = document.createElement("div"); bar.className = "ed-sort"; bar.dataset.col = T.pri; bar.innerHTML = `<span>Sort</span><button type="button" data-eds="desc">Largest first</button><button type="button" data-eds="asc">Smallest first</button><button type="button" data-eds="az">A–Z</button>`; bar._t = tb; bar._i = T.pri; tb.before(bar); }
    });
  }
  document.addEventListener("click", e => { const b = e.target.closest && e.target.closest("[data-eds]"); if (!b || !window.AtlasSort) return; const bar = b.closest(".ed-sort"); if (!bar) return; if (!bar._t) { const t = bar.nextElementSibling; if (!t || t.tagName !== "TABLE") return; bar._t = t; bar._i = +bar.dataset.col; } e.preventDefault();
    bar.querySelectorAll("button").forEach(x => x.classList.toggle("on", x === b)); const d = b.dataset.eds; AtlasSort.sortRows(bar._t, d === "az" ? 0 : bar._i, d === "az" ? "asc" : d); });
  // 0.12: every section (a heading and what follows it) folds away; Summary stays open. Open sections are remembered while
  // the panel redraws. Each section can still be lifted out as a card or sent to the workspace (0.11).
  const SEC_BTNS = `<span class="ed-sacts"><button type="button" data-edcard title="Open this section as a card" aria-label="Open as a card"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="3.5" width="16" height="17" rx="3" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M7.5 8h9M7.5 12h5M7.5 16h7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button><button type="button" data-edws title="Send this section to the workspace" aria-label="Send to workspace"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg></button></span>`;
  const titleOf = h => { const t = h.cloneNode(true); t.querySelectorAll(".ed-sacts").forEach(x => x.remove()); return t.textContent.trim(); };
  function sections(body, meta) {
    const open = body._edOpen = body._edOpen || new Set(), allOpen = !!window.ATLAS_SECTIONS_OPEN;
    body.querySelectorAll(":scope > h4").forEach(h => {
      if (!h.querySelector(".ed-sacts")) h.insertAdjacentHTML("beforeend", SEC_BTNS); h._edMeta = meta;
      const d = document.createElement("details"), t = titleOf(h); d.className = "ed-sec"; d.dataset.sec = t;
      const sm = document.createElement("summary"), bd = document.createElement("div"); bd.className = "ed-sbody";
      h.before(d); sm.appendChild(h); d.append(sm, bd);
      let n = d.nextElementSibling; while (n && n.tagName !== "H4" && !n.classList.contains("ed-notes") && !n.classList.contains("ed-sec")) { const nx = n.nextElementSibling; bd.appendChild(n); n = nx; }
      const shut = body._edShut = body._edShut || new Set();   // 0.12: <h4 class="ed-open"> starts open (the main content of a panel) until closed
      d.open = allOpen || open.has(t) || (h.classList.contains("ed-open") && !shut.has(t));
      // 0.13: a closed section is a tile: its title, its first sentence and its first rows; opened, it grows to fill the
      // panel with "‹ All of …" to go back (Atlas design/panels/Panels (final).md)
      try { restyle(bd); } catch (e) { console.error(e); }
      tilePreview(d, bd, sm);
      if (!bd.querySelector(":scope > .ed-tback")) bd.insertAdjacentHTML("afterbegin", `<button type="button" class="ed-tback" data-edback>‹ All of ${esc(meta.title || "this panel")}</button>`);
      d.addEventListener("toggle", () => { if (d.open) { open.add(t); shut.delete(t); } else { open.delete(t); shut.add(t); }
        if (body.dataset.cols && body.dataset.cols !== "1" && !window.ATLAS_SECTIONS_OPEN) { body.querySelectorAll(":scope > .ed-sec.ed-cur").forEach(x => { if (x !== d) x.classList.remove("ed-cur"); }); d.classList.toggle("ed-cur", d.open && !d.classList.contains("ed-summary")); body.classList.toggle("ed-one", !!body.querySelector(":scope > .ed-sec.ed-cur")); } });
    });
    tiles(body);
  }
  function tilePreview(d, bd, sm) {
    if (sm.querySelector(".ed-tprev")) return;
    const p = bd.querySelector("p:not(.ap-note), .nv-story, .ed-dek"); let first = p ? (firstSentence(p.innerHTML)[0] || "").replace(/<[^>]+>/g, "") : "";
    let rows = "";
    const tb = bd.querySelector("table"); if (tb && !first) first = tableLead(tb);
    if (!first) { const li = bd.querySelectorAll("li"); if (li.length) first = `${li.length} in the list: ${[...li].slice(0, 3).map(x => x.textContent.trim().replace(/\s+/g, " ").slice(0, 40)).join(", ")}${li.length > 3 ? "…" : ""}`; }
    if (!first) { const fx = bd.querySelector("svg, .ed-share, canvas"); const cap = bd.querySelector("figcaption, .cap, .ap-note"); if (cap) first = (firstSentence(cap.innerHTML)[0] || "").replace(/<[^>]+>/g, ""); else if (fx) first = "A chart"; }
    if (tb) { const rs = [...tb.querySelectorAll("tbody tr, tr")].filter(r => r.cells.length >= 2 && !r.closest("thead")).slice(0, 4); rows = rs.map(r => `<span class="ed-trow"><span>${esc(r.cells[0].textContent.trim().slice(0, 48))}</span><b>${esc(r.cells[r.cells.length - 1].textContent.trim().slice(0, 16))}</b></span>`).join(""); }
    else if (bd.querySelector(".ec-tile, .ec-lab")) { const ts = [...bd.querySelectorAll(".ec-tile")].slice(0, 4); rows = ts.map(x => { const l = x.querySelector(".ec-lab"), v = x.querySelector(".ec-val"); return `<span class="ed-trow"><span>${esc((l ? l.textContent : "").trim().slice(0, 48))}</span><b>${esc((v ? v.textContent : "").trim().slice(0, 18))}</b></span>`; }).join("");   // 0.13: figure boxes give a tile its rows, and the first one its lead
      if (!first && ts[0]) { const l = ts[0].querySelector(".ec-lab"), v = ts[0].querySelector(".ec-val"); if (l && v) first = `${l.textContent.trim()}: ${v.textContent.trim()}`; } }
    else { const li = [...bd.querySelectorAll("li")].slice(0, 4); rows = li.map(x => `<span class="ed-trow"><span>${esc(x.textContent.trim().slice(0, 64))}</span></span>`).join(""); }
    if (!first && !rows) return;
    sm.insertAdjacentHTML("beforeend", `<span class="ed-tprev">${first ? `<span class="ed-tlead">${esc(first.slice(0, 180))}</span>` : ""}${rows}</span>`);
  }
  // 0.13: the panel's width sets the layout: three columns from 1040 px, two from 760 px, otherwise one scrolling column
  function tiles(body) {
    body.classList.add("ed-tiles");
    const set = () => { const w = body.clientWidth, c = w >= 1040 ? "3" : w >= 760 ? "2" : "1"; if (body.dataset.cols !== c) { body.dataset.cols = c; if (c === "1") { body.classList.remove("ed-one"); body.querySelectorAll(".ed-cur").forEach(x => x.classList.remove("ed-cur")); }
        else if (!window.ATLAS_SECTIONS_OPEN && !body.classList.contains("ed-one")) body.querySelectorAll(":scope > details.ed-sec:not(.ed-summary)[open]").forEach(d => { d._edQuiet = 1; d.open = false; }); } };   // 0.13: wide, every section starts as a closed tile
    set(); if (!body._edRO && window.ResizeObserver) { body._edRO = new ResizeObserver(set); body._edRO.observe(body); }
  }
  document.addEventListener("click", e => {
    const b = e.target.closest("[data-edback]"); if (!b) return; e.preventDefault(); e.stopPropagation();
    const d = b.closest("details.ed-sec"), body = b.closest(".ed"); if (d) d.open = false; if (body) { body.classList.remove("ed-one"); body.querySelectorAll(".ed-cur").forEach(x => x.classList.remove("ed-cur")); }
  }, true);
  function sectionSpec(h) {
    const meta = h._edMeta || {}, sec = h.closest("details.ed-sec"), bd = sec && sec.querySelector(":scope > .ed-sbody"), title = titleOf(h);
    const story = h.closest(".wm-body") && h.closest(".wm-body").querySelector(".ed-h");
    return { app: meta.app || "", title, items: [{ k: `${meta.title || ""}${story ? " · " + story.textContent : ""}`.slice(0, 120), h: esc(title), more: bd ? bd.innerHTML : "", open: true }], source: "Atlas", when: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }), panel: meta.id || null };
  }
  document.addEventListener("click", e => {
    const b = e.target.closest("[data-edcard],[data-edws]"); if (!b || !window.AtlasCard) return; const h = b.closest("h4"); if (!h) return;
    e.preventDefault(); e.stopPropagation(); const spec = sectionSpec(h);
    if (b.hasAttribute("data-edcard")) { AtlasCard.open(spec); return; }
    const d = document.createElement("div"); d.innerHTML = AtlasCard.html(spec); window.AtlasCtx && AtlasCtx.sendToWS({ type: "card", title: spec.title, html: d.firstElementChild.outerHTML, w: 420, h: 520 });
  }, true);
  // watch a panel body so the layout survives the panel redrawing itself
  function watch(body, meta) {
    if (body._edObs) { body._edMeta = meta; return; }
    body._edMeta = meta; let busy = false;
    body._edObs = new MutationObserver(() => { if (busy) return; busy = true; try { dress(body, body._edMeta); } finally { Promise.resolve().then(() => { busy = false; }); } });
    body._edObs.observe(body, { childList: true });
    dress(body, meta);
  }
  // 0.10.1: every chart and table in a header panel can go to the workspace. A small button follows each chart (an SVG
  // at least 160 px wide) and each table of two rows or more; it sends a copy as a card, titled with the panel and the
  // section it sits under. Added again whenever the panel redraws.
  function sendable(body) {
    const items = [...body.querySelectorAll("svg, table")].filter(el => !el.closest(".ws-send-done, .ec-tile, button, .ed-head, .ed-notes") && !el.dataset.wsSend &&
      (el.tagName === "TABLE" ? el.rows.length >= 2 && !el.parentElement.closest("table") : (el.getBoundingClientRect().width >= 160 || +(el.getAttribute("width") || 0) >= 160 || (el.viewBox && el.viewBox.baseVal && el.viewBox.baseVal.width >= 160)) && !el.parentElement.closest("svg")));
    items.forEach(el => {
      el.dataset.wsSend = "1";
      const host = el.closest(".tscroll, .ex-scroll, .ec-chartwrap") || el;
      const what = el.tagName === "TABLE" ? "table" : "chart";
      const row = document.createElement("div"); row.className = "ws-sends";   // 0.11: as a card, or to the workspace
      const c = document.createElement("button"); c.type = "button"; c.className = "ws-card"; c.dataset.wscard = "1"; c.title = "Open a copy of this " + what + " as its own card"; c.textContent = "As a card"; c._target = el;
      const b = document.createElement("button"); b.type = "button"; b.className = "ws-send"; b.dataset.wssend = "1";
      b.title = "Send a copy of this " + what + " to the workspace"; b.textContent = "To workspace";
      row.append(c, b); host.after(row); b._target = el;
    });
  }
  function sectionOf(body, el) {   // the nearest heading above an element in the panel
    const hs = [...body.querySelectorAll("h3, h4")]; let best = null;   // section heads, not the panel's headline
    hs.forEach(h => { if (h.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING) best = h; });
    return best ? best.textContent.trim().replace(/\s+/g, " ").slice(0, 90) : "";
  }
  document.addEventListener("click", e => {   // 0.11: a chart or table as its own card
    const b = e.target.closest && e.target.closest("[data-wscard]"); if (!b || !b._target || !window.AtlasCard) return;
    const body = b.closest(".wm-body") || document.body, meta = body._edMeta || {}, el = b._target, sec = sectionOf(body, el);
    const clone = el.cloneNode(true); clone.removeAttribute("data-ws-send");
    AtlasCard.open({ app: meta.app || "", title: sec || meta.title || "From Atlas", items: [{ k: meta.title || "", h: esc(sec || meta.title || ""), more: el.tagName === "TABLE" ? `<div class="ws-snap">${clone.outerHTML}</div>` : `<div class="pc-chart">${clone.outerHTML}</div>`, open: true }], source: "Atlas", when: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }), panel: meta.id || null });
  });
  document.addEventListener("click", e => {
    const b = e.target.closest && e.target.closest("[data-wssend]"); if (!b || !b._target) return;
    const body = b.closest(".wm-body") || document.body, meta = body._edMeta || {}, el = b._target;
    const sec = sectionOf(body, el), title = [meta.title, sec && sec !== meta.title ? sec : ""].filter(Boolean).join(" · ") || "From Atlas";
    const clone = el.cloneNode(true); clone.removeAttribute("data-ws-send");
    const r = el.getBoundingClientRect();
    if (window.AtlasCtx && AtlasCtx.sendToWS) {
      AtlasCtx.sendToWS({ type: "card", title, html: `<div class="ws-snap">${clone.outerHTML}</div><div class="wsmeta">${esc(meta.app ? "Atlas " + meta.app : "Atlas")} · ${esc(title)}</div>`,
        w: Math.max(360, Math.min(900, Math.round(r.width) + 40)), h: Math.max(240, Math.min(700, Math.round(r.height) + 110)) });
      b.textContent = "Sent ✓"; setTimeout(() => { b.textContent = "To workspace"; }, 1600);
    }
  });
  function watchSends(body) {
    if (body._wsObs) return; let t = 0;
    body._wsObs = new MutationObserver(() => { cancelAnimationFrame(t); t = requestAnimationFrame(() => sendable(body)); });
    body._wsObs.observe(body, { childList: true, subtree: true });
    requestAnimationFrame(() => sendable(body));
  }
  // 0.13.1: every card, whoever builds it, gets the same rows, bars and sort as the panels
  { let q = 0; const run = () => { q = 0; document.querySelectorAll(".pcard:not([data-edr])").forEach(c => { c.setAttribute("data-edr", "1"); try { restyle(c); } catch (e) { console.error(e); } }); };
    new MutationObserver(() => { if (!q) q = requestAnimationFrame(run); }).observe(document.documentElement, { childList: true, subtree: true }); }
  window.AtlasPanel = { splitFig, figHTML, restyle, tableLead, dress, watch, firstSentence, watchSends, openAll: body => (body || document).querySelectorAll("details.ed-sec").forEach(d => { d.open = true; }) };
})();
