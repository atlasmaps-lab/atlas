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
    sections(body, meta);
  }
  // 0.11: every section of a panel (a heading and what follows it) can be lifted out as a card or sent to the workspace
  const SEC_BTNS = `<span class="ed-sacts"><button type="button" data-edcard title="Open this section as a card" aria-label="Open as a card"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="3.5" width="16" height="17" rx="3" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M7.5 8h9M7.5 12h5M7.5 16h7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button><button type="button" data-edws title="Send this section to the workspace" aria-label="Send to workspace"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg></button></span>`;
  function sections(body, meta) {
    body.querySelectorAll(":scope > h4").forEach(h => { if (h.querySelector(".ed-sacts")) return; h.insertAdjacentHTML("beforeend", SEC_BTNS); h._edMeta = meta; });
  }
  function sectionSpec(h) {
    const meta = h._edMeta || {}, parts = []; let n = h.nextElementSibling;
    while (n && n.tagName !== "H4" && !n.classList.contains("ed-notes")) { parts.push(n.outerHTML); n = n.nextElementSibling; }
    const t = h.cloneNode(true); t.querySelectorAll(".ed-sacts").forEach(x => x.remove()); const title = t.textContent.trim();
    const story = h.closest(".wm-body") && h.closest(".wm-body").querySelector(".ed-h");
    return { app: meta.app || "", title, items: [{ k: `${meta.title || ""}${story ? " · " + story.textContent : ""}`.slice(0, 120), h: esc(title), more: parts.join(""), open: true }], source: "Atlas", when: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }), panel: meta.id || null };
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
  window.AtlasPanel = { dress, watch, firstSentence };
})();
