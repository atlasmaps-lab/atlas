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
    head.innerHTML = `<div class="ed-kick">${esc(meta.app)} · ${esc(meta.title)}</div>${headline ? `<h2 class="ed-h">${esc(headline.replace(/\.$/, ""))}</h2>` : meta.blurb ? `<p class="ed-dek">${esc(meta.blurb)}</p>` : ""}`;
    body.insertBefore(head, body.firstChild);
    if (nv) { nv.classList.add("ed-story"); head.after(nv); }
    // figures: the first row of big numbers goes straight after the story
    const fig = body.querySelector(".tr-head"); if (fig) { fig.classList.add("ed-figs"); (nv || head).after(fig); }
    // sources: the last note that names a source or licence folds away
    const notes = [...body.querySelectorAll(":scope > .ap-note")].filter(p => /OGL|Licence|Source|ONS|HMRC|DWP|MHCLG|Treasury|Fingertips|Census/.test(p.textContent));
    const src = notes[notes.length - 1];
    if (src && src === body.lastElementChild) { const d = document.createElement("details"); d.className = "ed-notes"; d.innerHTML = `<summary>How to read this · Sources</summary>`; src.replaceWith(d); d.appendChild(src); }
  }
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
      const b = document.createElement("button"); b.type = "button"; b.className = "ws-send"; b.dataset.wssend = "1";
      b.title = "Send a copy of this " + (el.tagName === "TABLE" ? "table" : "chart") + " to the workspace"; b.textContent = "To workspace";
      host.after(b); b._target = el;
    });
  }
  function sectionOf(body, el) {   // the nearest heading above an element in the panel
    const hs = [...body.querySelectorAll("h3, h4")]; let best = null;   // section heads, not the panel's headline
    hs.forEach(h => { if (h.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING) best = h; });
    return best ? best.textContent.trim().replace(/\s+/g, " ").slice(0, 90) : "";
  }
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
  window.AtlasPanel = { dress, watch, firstSentence, watchSends };
})();
