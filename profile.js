/* Atlas 0.9 · profiles (core module): one panel for any breakdown (industries, Census topics, causes of death).
 * The place in focus, category by category: the number, its share, the same share in the region and the country, and how
 * concentrated it is here (location quotient). Click a category to map it. Used by Atlas Economic, Social and Health.
 */
(function () {
  "use strict";
  const esc = t => String(t == null ? "" : t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const pct = v => v == null || !isFinite(v) ? "—" : (v < 0.1 && v > 0 ? "<0.1" : v.toFixed(1)) + "%";
  const ST = {};   // per panel: chosen breakdown, sort, filter
  function panel(ids, opts) {
    opts = opts || {};
    return function render(ctx, el) {
      const key = ids.join(), st = ST[key] = ST[key] || { id: ids.find(id => ctx.bd.spec(id)), sort: "share", q: "", all: false };
      const avail = ids.filter(id => ctx.bd.spec(id)); if (!avail.length) { el.innerHTML = `<p class="ap-note">This data isn't loaded.</p>`; return; }
      if (!avail.includes(st.id)) st.id = avail[0];
      const o = ctx.bd.spec(st.id), code = ctx.focused || ctx.sel[0] || ctx.UKC;
      const here = ctx.bd.of(st.id, code), P = ctx.P[code] || {};
      const up = P.level === "ward" ? P.parent : P.level === "council" ? P.parent || P.nation : P.level === "region" ? P.parent : null;
      const reg = up && up !== code ? ctx.bd.of(st.id, up) : null, base = ctx.bd.of(st.id, o.base ? o.base(code) : ctx.UKC);
      const sel = `<select data-pfid>${avail.map(id => `<option value="${id}" ${id === st.id ? "selected" : ""}>${esc(ctx.bd.spec(id).label)}</option>`).join("")}</select>`;
      const where = (o.scopeName && o.scopeName(code)) || (code === ctx.UKC ? "the UK" : ctx.nameOf(code)), theBase = (o.baseName || "UK") === "UK" ? "the UK" : o.baseName, baseName = o.baseName || "UK";
      if (!here) { el.innerHTML = `<div class="ap-row">${sel}</div><p class="ap-note">No figures for ${esc(where)}${o.valid && o.valid(code) ? ": " + esc(o.valid(code)) : ""}. Click a council on the map.</p>`; wire(ctx, el, render, st); return; }
      const tot = Object.values(here).reduce((a, b) => a + b, 0), tr = reg ? Object.values(reg).reduce((a, b) => a + b, 0) : 0, tb = base ? Object.values(base).reduce((a, b) => a + b, 0) : 0;
      let rows = o.cats().map(k => { const v = here[k] || 0, s = tot ? 100 * v / tot : 0, sr = reg && tr ? 100 * (reg[k] || 0) / tr : null, sb = base && tb ? 100 * (base[k] || 0) / tb : null;
        return { k, n: o.name(k), v, s, sr, sb, lq: sb ? s / sb : null }; }).filter(r => r.v > 0 || (r.sb || 0) > 0.5);
      if (st.q) rows = rows.filter(r => r.n.toLowerCase().includes(st.q.toLowerCase()));
      rows.sort(st.sort === "lq" ? (a, b) => (b.lq || 0) - (a.lq || 0) : st.sort === "under" ? (a, b) => (a.lq == null ? 9 : a.lq) - (b.lq == null ? 9 : b.lq) : (a, b) => b.v - a.v);
      const shown = st.all || st.q ? rows : rows.slice(0, 25);
      // the story: the largest category, the most over-represented against the country, and how concentrated the mix is
      const bySize = rows.slice().sort((a, b) => b.v - a.v), big = bySize[0], over = rows.filter(r => r.lq && r.s >= 1).sort((a, b) => b.lq - a.lq)[0], under = rows.filter(r => r.lq != null && (r.sb || 0) >= 2).sort((a, b) => a.lq - b.lq)[0];
      const top3 = bySize.slice(0, 3).reduce((a, r) => a + r.s, 0), what = (o.label || "").toLowerCase();
      const story = big ? `In ${esc(where)}, the largest group in ${esc(what)} is <b>${esc(big.n)}</b>: ${esc(ctx.bd.fmt(st.id, big.v))}, ${pct(big.s)} of the total${big.sb != null ? `, against ${pct(big.sb)} in ${esc(theBase)}` : ""}.
        ${over && over !== big && over.lq > 1.3 ? `Compared with ${esc(theBase)}, ${esc(over.n)} stands out most: ${pct(over.s)} here, ${over.lq.toFixed(1)} times the share in ${esc(theBase)}.` : ""}
        ${under && under.lq < 0.6 ? `${esc(under.n)} is the most under-represented (${pct(under.s)} here against ${pct(under.sb)}).` : ""}
        The three largest make up ${pct(top3)} of the total.` : "";
      el.innerHTML = `<div class="ap-row">${sel}<select data-pfsort><option value="share" ${st.sort === "share" ? "selected" : ""}>Biggest first</option><option value="lq" ${st.sort === "lq" ? "selected" : ""}>Most over-represented</option><option value="under" ${st.sort === "under" ? "selected" : ""}>Most under-represented</option></select>${rows.length > 15 ? `<input class="tr-q" data-pfq placeholder="Find" value="${esc(st.q)}">` : ""}</div>
        ${story ? `<div class="nv"><p class="nv-story">${story}</p>${o.desc ? `<p class="nv-means"><b>What it tells us.</b> ${esc(o.desc.replace(/\.?$/, "."))}</p>` : ""}${o.how ? `<p class="nv-trust"><b>How it's counted.</b> ${esc(o.how.replace(/\.?$/, "."))}</p>` : ""}</div>` : ""}
        <h4>${esc(where)} · ${esc(o.label)} · ${esc(ctx.bd.fmt(st.id, tot))}${o.yr ? ` <small>(${esc(o.yr(code) || "")})</small>` : ""}</h4>
        <div class="compbar pf-bar">${rows.slice().sort((a, b) => b.v - a.v).slice(0, 30).map(r => `<i style="width:${r.s.toFixed(2)}%;background:${o.colour(r.k)}" title="${esc(r.n)} ${pct(r.s)}"></i>`).join("")}</div>
        <table class="tr-t pf-t"><thead><tr><th>${esc(opts.what || "Category")}</th><th class="num">Number</th><th class="num">Here</th>${reg ? `<th class="num">${esc(ctx.nameOf(up))}</th>` : ""}<th class="num">${esc(baseName)}</th><th title="Share here ÷ share in ${esc(baseName)}: above 1, more concentrated here">vs ${esc(baseName)}</th></tr></thead><tbody>
        ${shown.map(r => `<tr data-pfk="${esc(r.k)}"><td class="tr-n"><i class="sw" style="background:${o.colour(r.k)}"></i>${esc(r.n)}</td><td class="num">${esc(ctx.bd.fmt(st.id, r.v))}</td><td class="num"><b>${pct(r.s)}</b></td>${reg ? `<td class="num">${pct(r.sr)}</td>` : ""}<td class="num">${pct(r.sb)}</td>
          <td class="pf-lq">${r.lq == null ? "" : `<span class="pf-lqbar"><i style="${r.lq >= 1 ? `left:50%;width:${Math.min(50, (r.lq - 1) * 25).toFixed(1)}%;background:#1e7b4a` : `right:50%;width:${Math.min(50, (1 - r.lq) * 50).toFixed(1)}%;background:#b03a2e`}"></i></span><small>${r.lq.toFixed(2)}×</small>`}</td></tr>`).join("")}</tbody></table>
        ${!st.all && !st.q && rows.length > 25 ? `<button class="lnk" data-pfall>Show all ${rows.length}</button>` : ""}
        <p class="ap-note">Click a row to map that category's share. ${esc(o.how || "")}. ${esc(o.source || "")}</p>`;
      wire(ctx, el, render, st);
    };
  }
  function wire(ctx, el, render, st) {
    el.onchange = e => { if (e.target.matches("[data-pfid]")) { st.id = e.target.value; st.q = ""; render(ctx, el); } if (e.target.matches("[data-pfsort]")) { st.sort = e.target.value; render(ctx, el); } };
    const q = el.querySelector("[data-pfq]"); if (q) q.oninput = () => { st.q = q.value; clearTimeout(wire.t); wire.t = setTimeout(() => { render(ctx, el); const n = el.querySelector("[data-pfq]"); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } }, 200); };
    el.onclick = e => {
      if (e.target.closest("[data-pfall]")) { st.all = true; render(ctx, el); return; }
      const r = e.target.closest("[data-pfk]"); if (r) { const on = ctx.mapped ? ctx.mapped() : []; ctx.mapOnly(on.filter(id => !(ctx.bd.spec(st.id) && id.startsWith(st.id + "_"))).concat([st.id + "_share"])); ctx.bd.pick(st.id, r.dataset.pfk); }
    };
  }
  window.AtlasProfile = { panel };
})();
