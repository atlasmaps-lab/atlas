/* Atlas 1.8 · one window manager for every floating window and full page (charts, Compare, Export, Analyse, protest
 * and info cards, lists). It owns the stacking order, focus, opening and closing, and each window type's size and position.
 *
 *   - The most recently opened or clicked window is always on top.
 *   - A window opened from another one sits above it, offset, with a brief highlight and a "← Back to …" link. The parent
 *     stays open underneath.
 *   - Esc closes the top window only (closeTop).
 *   - Default size: docked to the right, at most 40% of the width and 70% of the height, so the map stays usable.
 *     Never smaller than the window's minimum (about 320 × 200) and never larger than the screen minus a 16 px margin,
 *     except with "Fill screen" (⤢), the only way to cover the map.
 *   - Size and position are remembered per window type and clamped to the screen on load and on every browser resize.
 *   - Content reflows: onResize is called (debounced) whenever the window's size changes.
 *
 * Use: AtlasWM.register(el, { type, title, handle, min, def, onResize, close })   an existing element
 *      AtlasWM.make({ type, title, html, ... })                                     a new window with a header and body
 *      AtlasWM.open(el, { parent }), AtlasWM.close(el), AtlasWM.front(el), AtlasWM.closeTop(), AtlasWM.top()
 */
(function () {
  "use strict";
  const MARGIN = 16, Z0 = 100; let TOP = 56;
  const reg = new Map();   // element → its record
  let stack = [];          // open windows, bottom to top
  let seq = 0;
  const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage full or blocked: positions just aren't remembered */ } },
  };
  const esc = t => String(t == null ? "" : t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const FCTL = `<span class="fctl"><button type="button" data-fshrink title="Shrink to the title bar (click again to open)" aria-label="Shrink">–</button><button type="button" data-fmax title="Fill the screen (click again to restore)" aria-label="Fill screen">⤢</button></span>`;

  const maxW = () => Math.max(200, innerWidth - 2 * MARGIN), maxH = () => Math.max(160, innerHeight - TOP - MARGIN);
  function defaultRect(rec) {   // docked to the right: at most 40% of the width and 70% of the height
    const w = clamp(Math.round(innerWidth * 0.4), Math.min(rec.min.w, maxW()), maxW()), h = clamp(Math.round(innerHeight * 0.7), Math.min(rec.min.h, maxH()), maxH());
    return { x: innerWidth - w - MARGIN, y: TOP, w, h };
  }
  function fit(rec, r) {
    const w = clamp(Math.round(r.w), Math.min(rec.min.w, maxW()), maxW()), h = clamp(Math.round(r.h), Math.min(rec.min.h, maxH()), maxH());
    return { x: clamp(Math.round(r.x), MARGIN, Math.max(MARGIN, innerWidth - w - MARGIN)), y: clamp(Math.round(r.y), TOP, Math.max(TOP, innerHeight - h - MARGIN)), w, h };
  }
  const fillRect = () => ({ x: 8, y: TOP - 4, w: innerWidth - 16, h: innerHeight - TOP - 4 });
  function apply(rec) {
    const el = rec.el, r = rec.maxed ? fillRect() : rec.st;
    Object.assign(el.style, { left: r.x + "px", top: r.y + "px", width: r.w + "px", height: rec.shrunk ? "" : r.h + "px", right: "auto", bottom: "auto",
      minWidth: Math.min(rec.min.w, maxW()) + "px", minHeight: rec.shrunk ? "" : Math.min(rec.min.h, maxH()) + "px",
      maxWidth: rec.maxed ? "" : `calc(100vw - ${2 * MARGIN}px)`, maxHeight: rec.maxed || rec.shrunk ? "" : `calc(100vh - ${TOP + MARGIN}px)` });
  }
  const save = rec => { if (rec.key) store.set(rec.key, rec.st); };
  function changed(rec) { clearTimeout(rec.t); rec.t = setTimeout(() => { if (!rec.el.hidden && rec.onResize) rec.onResize(); }, 150); }

  // 0.7.1: resize from every edge and corner, not only the bottom-right grip. edges(el, { start, move(dx, dy, dir), end })
  // adds eight thin invisible handles; dir is one of n s e w ne nw se sw.
  const DIRS = ["n", "s", "e", "w", "ne", "nw", "se", "sw"];
  function edges(el, h) {
    return DIRS.map(d => {
      const g = document.createElement("div"); g.className = "redge redge-" + d; g.dataset.dir = d; el.appendChild(g);
      g.addEventListener("pointerdown", e => {
        if (e.button) return; e.preventDefault(); e.stopPropagation(); g.setPointerCapture(e.pointerId); document.body.classList.add("resizing");
        const x0 = e.clientX, y0 = e.clientY; if (h.start) h.start(d);
        const mv = ev => h.move(ev.clientX - x0, ev.clientY - y0, d);
        const up = () => { g.removeEventListener("pointermove", mv); document.body.classList.remove("resizing"); if (h.end) h.end(d); };
        g.addEventListener("pointermove", mv); g.addEventListener("pointerup", up, { once: true }); g.addEventListener("pointercancel", up, { once: true });
      });
      return g;
    });
  }

  function register(el, o) {
    o = o || {};
    const rec = { el, type: o.type || "win" + (++seq), title: o.title || "", handle: o.handle || ".wm-head", min: Object.assign({ w: 320, h: 200 }, o.min || {}),
      def: o.def || null, onResize: o.onResize || null, close: o.close || (() => close(el)), cascade: !!o.cascade, maxed: false, shrunk: false, parent: null };
    rec.key = o.remember === false ? null : "atlas-18-win-" + rec.type;
    rec.st = fit(rec, Object.assign({}, rec.def ? rec.def() : defaultRect(rec), rec.key ? store.get(rec.key, {}) : {}));
    reg.set(el, rec); el.classList.add("fwin", "wm"); el.dataset.wmType = rec.type;
    apply(rec);
    // drag by the header
    el.addEventListener("pointerdown", e => {
      front(el);
      const h = e.target.closest(rec.handle); if (!h || !el.contains(h) || e.button || rec.maxed || e.target.closest("button,input,select,textarea,a,label,[contenteditable],.rgrip")) return;
      e.preventDefault(); const ox = e.clientX - rec.st.x, oy = e.clientY - rec.st.y; el.classList.add("dragging"); h.setPointerCapture(e.pointerId);
      const mv = ev => { rec.st = fit(rec, { x: ev.clientX - ox, y: ev.clientY - oy, w: rec.st.w, h: rec.st.h }); apply(rec); };
      const up = () => { h.removeEventListener("pointermove", mv); el.classList.remove("dragging"); save(rec); };
      h.addEventListener("pointermove", mv); h.addEventListener("pointerup", up, { once: true }); h.addEventListener("pointercancel", up, { once: true });
    }, true);
    // resize from the corner grip (bottom right)
    const g = document.createElement("div"); g.className = "rgrip"; g.title = "Drag to resize · double-click for the default size"; el.appendChild(g); rec.grip = g;
    g.addEventListener("pointerdown", e => {
      if (e.button) return; e.preventDefault(); e.stopPropagation(); g.setPointerCapture(e.pointerId); document.body.classList.add("resizing");
      if (rec.maxed) { rec.maxed = false; el.classList.remove("maxed"); rec.st = fit(rec, fillRect()); }
      const x0 = e.clientX, y0 = e.clientY, w0 = rec.st.w, h0 = rec.st.h;
      const mv = ev => { rec.st = fit(rec, { x: rec.st.x, y: rec.st.y, w: w0 + ev.clientX - x0, h: h0 + ev.clientY - y0 }); apply(rec); };
      const up = () => { g.removeEventListener("pointermove", mv); document.body.classList.remove("resizing"); save(rec); changed(rec); };
      g.addEventListener("pointermove", mv); g.addEventListener("pointerup", up, { once: true }); g.addEventListener("pointercancel", up, { once: true });
    });
    let s0 = null;
    rec.edges = edges(el, {
      start() { if (rec.maxed) { rec.maxed = false; el.classList.remove("maxed"); rec.st = fit(rec, fillRect()); } s0 = Object.assign({}, rec.st); },
      move(dx, dy, d) {
        const mw = Math.min(rec.min.w, maxW()), mh = Math.min(rec.min.h, maxH()); let { x, y, w, h } = s0;
        if (d.includes("e")) w = s0.w + dx;
        if (d.includes("s")) h = s0.h + dy;
        if (d.includes("w")) { w = Math.max(mw, s0.w - dx); x = s0.x + s0.w - w; }
        if (d.includes("n")) { h = Math.max(mh, s0.h - dy); y = Math.max(TOP, s0.y + s0.h - h); h = s0.y + s0.h - y; }
        rec.st = fit(rec, { x, y, w, h }); apply(rec);
      },
      end() { save(rec); changed(rec); },
    });
    g.addEventListener("dblclick", () => { rec.maxed = false; el.classList.remove("maxed"); rec.st = fit(rec, rec.def ? rec.def() : defaultRect(rec)); apply(rec); save(rec); changed(rec); });
    // shrink, fill screen, back to the parent
    el.addEventListener("click", e => {
      const b = e.target.closest("[data-fmax],[data-fshrink],[data-wmback],[data-wmx]"); if (!b || !el.contains(b)) return;
      if (b.hasAttribute("data-wmback")) { if (rec.parent && isOpen(rec.parent)) { front(rec.parent); pulse(rec.parent); } return; }
      if (b.hasAttribute("data-wmx")) { rec.close(); return; }
      if (b.hasAttribute("data-fmax")) { rec.shrunk = false; el.classList.remove("shrunk"); rec.maxed = !rec.maxed; el.classList.toggle("maxed", rec.maxed); b.title = rec.maxed ? "Back to the window's size" : "Fill the screen (click again to restore)"; }
      else { rec.shrunk = !rec.shrunk; el.classList.toggle("shrunk", rec.shrunk); }
      apply(rec); changed(rec);
    });
    el.addEventListener("dblclick", e => { const h = e.target.closest(rec.handle); if (h && el.contains(h) && !e.target.closest("button,input,select,a")) { const b = el.querySelector("[data-fmax]"); if (b) b.click(); } });
    if (window.ResizeObserver) { let last = ""; new ResizeObserver(() => { if (el.hidden) return; const k = el.offsetWidth + "x" + el.offsetHeight; if (k !== last) { last = k; changed(rec); } }).observe(el); }
    decorate(el);
    return rec;
  }

  // a new window: header (title, shrink, fill, close) and a body; several of one type cascade instead of stacking exactly
  function make(o) {
    const el = document.createElement("div"); el.className = "wmwin" + (o.cls ? " " + o.cls : ""); el.hidden = true;
    el.innerHTML = `<div class="wm-head"><b class="wm-title">${esc(o.title || "")}</b><button class="x" data-wmx aria-label="Close">×</button></div><div class="wm-body">${o.html || ""}</div>`;
    document.body.appendChild(el);
    const rec = register(el, Object.assign({ handle: ".wm-head", remember: o.remember }, o, { close: () => { close(el); if (o.onClose) o.onClose(el); if (o.dispose !== false) setTimeout(() => { el.remove(); reg.delete(el); }, 0); } }));
    if (o.cascade) {   // offset from the newest open window of the same type
      const same = stack.filter(x => reg.get(x).type === rec.type); const last = same[same.length - 1];
      if (last) { const r = reg.get(last).st; rec.st = fit(rec, { x: r.x - 28, y: r.y + 28, w: rec.st.w, h: rec.st.h }); if (rec.st.y === r.y && rec.st.x === r.x) rec.st = fit(rec, { x: MARGIN + (same.length * 28) % 200, y: TOP + (same.length * 28) % 160, w: rec.st.w, h: rec.st.h }); apply(rec); }
    }
    return { el, body: el.querySelector(".wm-body"), setTitle: t => { el.querySelector(".wm-title").textContent = t; rec.title = t; }, setBody: h => { el.querySelector(".wm-body").innerHTML = h; } };
  }

  // after a window re-renders its own content: put back the shrink / fill buttons and the "← Back to …" link
  function decorate(el) {
    const rec = reg.get(el); if (!rec) return;
    const h = el.querySelector(rec.handle); if (!h) return;
    if (!h.querySelector(".fctl")) { const x = h.querySelector("[data-close],[data-cpx],[data-anx],[data-wmx]"); if (x) x.insertAdjacentHTML("beforebegin", FCTL); else h.insertAdjacentHTML("beforeend", FCTL); }
    const fm = h.querySelector("[data-fmax]"); if (fm) fm.title = rec.maxed ? "Back to the window's size" : "Fill the screen (click again to restore)";
    const old = h.querySelector(".wm-back"), want = rec.parent && isOpen(rec.parent);
    if (old && !want) old.remove();
    if (want && !old) h.insertAdjacentHTML("afterbegin", `<button type="button" class="wm-back" data-wmback title="Bring ${esc(reg.get(rec.parent).title)} back to the front">← Back to ${esc(reg.get(rec.parent).title)}</button>`);
    if (el.lastElementChild !== rec.grip || (rec.edges && !rec.edges[0].isConnected)) { (rec.edges || []).forEach(g => el.appendChild(g)); el.appendChild(rec.grip); }
  }

  function isOpen(el) { return !!el && !el.hidden && stack.includes(el); }
  function restack() {
    stack.forEach((el, i) => { el.style.zIndex = Z0 + i * 2; el.classList.toggle("wm-top", i === stack.length - 1); });
    document.body.dataset.wmTop = stack.length ? reg.get(stack[stack.length - 1]).type : "";
  }
  function front(el) {
    if (!reg.has(el) || el.hidden) return;
    if (stack[stack.length - 1] === el) return;
    stack = stack.filter(x => x !== el); stack.push(el); restack();
  }
  function pulse(el) { el.classList.remove("wm-pulse"); void el.offsetWidth; el.classList.add("wm-pulse"); clearTimeout(el._pt); el._pt = setTimeout(() => el.classList.remove("wm-pulse"), 700); }
  function open(el, o) {
    o = o || {}; const rec = reg.get(el); if (!rec) return;
    const was = isOpen(el);
    if (!was) { rec.maxed = false; rec.shrunk = false; el.classList.remove("maxed", "shrunk"); }
    const parent = o.parent && reg.has(o.parent) && isOpen(o.parent) && o.parent !== el ? o.parent : null;
    rec.parent = parent || (was ? rec.parent : null);
    if (parent) {   // above its parent, offset down and to the left so both edges show
      const p = reg.get(parent); const pr = p.maxed ? fillRect() : p.st;
      rec.st = fit(rec, { x: pr.x - 36, y: pr.y + 36, w: Math.max(rec.st.w, Math.min(pr.w, maxW())), h: rec.st.h });
    } else if (!was) rec.st = fit(rec, rec.st);
    el.hidden = false; stack = stack.filter(x => x !== el); stack.push(el); restack(); apply(rec); decorate(el);
    stack.forEach(x => { if (reg.get(x).parent === el) decorate(x); });
    if (parent || o.pulse !== false) pulse(el);
    changed(rec);
  }
  function close(el) {
    const rec = reg.get(el); if (!rec || el.hidden && !stack.includes(el)) { if (el) el.hidden = true; return false; }
    el.hidden = true; el.classList.remove("wm-pulse"); stack = stack.filter(x => x !== el); restack();
    stack.forEach(x => { if (reg.get(x).parent === el) decorate(x); });
    return true;
  }
  function top() { return stack[stack.length - 1] || null; }
  function closeTop() { const el = top(); if (!el) return false; reg.get(el).close(); return true; }
  window.addEventListener("resize", () => reg.forEach(rec => { rec.st = fit(rec, rec.st); apply(rec); if (!rec.el.hidden) changed(rec); }));

  window.AtlasWM = { TOPNOW: () => TOP, place: (el, r) => { const rec = reg.get(el); if (!rec) return; rec.maxed = false; el.classList.remove("maxed"); rec.st = fit(rec, Object.assign({}, rec.st, r)); apply(rec); save(rec); changed(rec); }, setTop: t => { TOP = t; reg.forEach(rec => { rec.st = fit(rec, rec.st); apply(rec); }); }, edges, register, make, open, close, front, top, closeTop, isOpen, decorate, pulse, rectOf: el => reg.has(el) ? Object.assign({}, reg.get(el).st) : null, stack: () => stack.slice(), MARGIN, TOP };
})();
