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
  window.AtlasPanel = { dress, watch, firstSentence };
})();
