/* Atlas 0.12 · sorting everywhere (core). Every table and every list of figures can be put high→low or low→high.
 *   Tables with a header: click any heading (↓ high to low first for numbers, A→Z for words; click again to reverse).
 *   Tables without a header, and lists of figures: a small "Sort" switch above them (High→low, Low→high, As shown).
 * Numbers are read from data-v when a renderer gives one, otherwise from the text: "£1.2m", "45%", "−3.2 pt", "12k",
 * "1,234", "£2.5bn" all read as numbers. Works on anything drawn later too: a watcher enhances new tables as they appear.
 * Opt out with data-nosort on a table or list.
 */
(function () {
  "use strict";
  const MUL = { k: 1e3, m: 1e6, bn: 1e9, b: 1e9, tn: 1e12 };
  function num(t) { // a figure from text, or null
    if (t == null) return null; const s = String(t).replace(/[−–]/g, "-").replace(/,/g, "").trim();
    const m = s.match(/(-?)\s*[£$€]?\s*(-?\d+(?:\.\d+)?)\s*(bn|tn|k|m|b)?\b/i); if (!m) return null;
    let v = +m[2] * (MUL[(m[3] || "").toLowerCase()] || 1); if (m[1] === "-" || /^[▼]/.test(s)) v = -Math.abs(v); return isFinite(v) ? v : null;
  }
  const cellVal = c => { if (!c) return null; const v = c.dataset && c.dataset.v; if (v != null && v !== "" && !isNaN(+v)) return +v; return num(c.textContent); };
  const cellText = c => c ? c.textContent.trim().toLowerCase() : "";
  function rowsOf(table) { const tb = table.tBodies[0] || table; return [...tb.rows].filter(r => !r.closest("thead") && r.parentNode && r.parentNode.tagName !== "THEAD" && !r.querySelector("th[colspan]") && r.cells.length); }
  function numericCol(table, rows) { // the column to sort a header-less table by: the last one that's mostly numbers
    const n = Math.max(...rows.map(r => r.cells.length)); for (let i = n - 1; i >= 0; i--) { const k = rows.filter(r => cellVal(r.cells[i]) != null).length; if (k >= Math.max(3, rows.length * 0.6)) return i; } return -1;
  }
  function sortRows(table, i, dir) {
    const rows = rowsOf(table); if (!rows.length) return; const tb = rows[0].parentNode;
    if (!table._orig) table._orig = rows.slice();
    if (dir === "orig") { table._orig.forEach(r => tb.appendChild(r)); return; }
    const isNum = rows.filter(r => cellVal(r.cells[i]) != null).length >= rows.length * 0.6;
    const key = r => isNum ? cellVal(r.cells[i]) : cellText(r.cells[i]);
    rows.sort((a, b) => { const x = key(a), y = key(b); if (x == null && y == null) return 0; if (x == null) return 1; if (y == null) return -1; return (x < y ? -1 : x > y ? 1 : 0) * (dir === "asc" ? 1 : -1); }).forEach(r => tb.appendChild(r));
  }
  // ---------- header clicks ----------
  document.addEventListener("click", e => {
    const th = e.target.closest && e.target.closest("thead th"); if (!th || e.target.closest("button, input, select, a")) return;
    const table = th.closest("table"); if (!table || table.hasAttribute("data-nosort") || !table.tBodies[0]) return;
    const i = [...th.parentNode.children].indexOf(th), rows = rowsOf(table); if (rows.length < 2) return;
    const isNum = rows.filter(r => cellVal(r.cells[i]) != null).length >= rows.length * 0.6;
    const dir = th.dataset.dir ? (th.dataset.dir === "asc" ? "desc" : "asc") : isNum ? "desc" : "asc";
    table.querySelectorAll("thead th").forEach(x => { delete x.dataset.dir; x.removeAttribute("aria-sort"); });
    th.dataset.dir = dir; th.setAttribute("aria-sort", dir === "asc" ? "ascending" : "descending");
    sortRows(table, i, dir);
  });
  // ---------- a switch above header-less tables and lists ----------
  const SW = `<span class="srt-l">Sort</span><button type="button" data-srt="desc" title="Highest first">High→low</button><button type="button" data-srt="asc" title="Lowest first">Low→high</button><button type="button" data-srt="orig" class="on" title="As first shown">As shown</button>`;
  function addSwitch(target, kind) {
    if (target._srt || target.hasAttribute("data-nosort")) return; target._srt = 1;
    const bar = document.createElement("div"); bar.className = "srt-bar"; bar.setAttribute("role", "group"); bar.setAttribute("aria-label", "Sort this " + kind); bar.innerHTML = SW; bar._for = target;
    target.parentNode.insertBefore(bar, target);
  }
  function listItems(list) { return [...list.children].filter(li => li.tagName === "LI"); }
  function listVal(li) { const v = li.dataset.v; if (v != null && v !== "" && !isNaN(+v)) return +v; const n = li.querySelector(".num, b, .v, small"); return num(n ? n.textContent : li.textContent); }
  document.addEventListener("click", e => {
    const b = e.target.closest && e.target.closest("[data-srt]"); if (!b) return; const bar = b.closest(".srt-bar"), t = bar && bar._for; if (!t) return;
    e.preventDefault(); e.stopPropagation(); bar.querySelectorAll("[data-srt]").forEach(x => x.classList.toggle("on", x === b)); const dir = b.dataset.srt;
    if (t.tagName === "TABLE") { const rows = rowsOf(t), i = numericCol(t, rows); if (i >= 0) sortRows(t, i, dir); return; }
    const items = listItems(t); if (!t._orig) t._orig = items.slice();
    (dir === "orig" ? t._orig : items.slice().sort((a, c) => { const x = listVal(a), y = listVal(c); if (x == null) return 1; if (y == null) return -1; return dir === "asc" ? x - y : y - x; })).forEach(li => t.appendChild(li));
  }, true);
  // ---------- find what needs it ----------
  function enhance(root) {
    (root || document).querySelectorAll("table:not([data-srtd])").forEach(t => {
      t.setAttribute("data-srtd", "1"); if (t.hasAttribute("data-nosort") || t.closest(".srt-skip, .pc-peek, #mega, .ach, svg")) return;
      if (t.tHead && t.tHead.rows.length) { t.classList.add("srt-th"); return; }
      const rows = rowsOf(t); if (rows.length >= 3 && numericCol(t, rows) >= 0) addSwitch(t, "table");
    });
    (root || document).querySelectorAll("ul:not([data-srtd]), ol:not([data-srtd])").forEach(l => {
      l.setAttribute("data-srtd", "1"); if (l.hasAttribute("data-nosort") || l.closest(".srt-skip, #mega, .pc-evs, nav, .tabs, .chips, .ex-warn, .pc-why, .hnav")) return;
      const items = listItems(l); if (items.length >= 4 && items.filter(li => listVal(li) != null).length >= items.length * 0.8 && items.every(li => li.textContent.length < 240)) addSwitch(l, "list");
    });
  }
  let q = 0;
  const run = () => { q = 0; try { enhance(document); } catch (err) { console.error(err); } };
  new MutationObserver(() => { if (!q) q = requestAnimationFrame(run); }).observe(document.documentElement, { childList: true, subtree: true });
  window.AtlasSort = { enhance, num, sortRows };
})();
