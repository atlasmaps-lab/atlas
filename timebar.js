/* Atlas 0.13 · the time bar (Atlas design/timebar/Time bar (final).md)
 *
 * The Atlas style is the bar app.js already draws (play, a track you drag to any month, the date), dressed as a slim
 * capsule, plus ⌃ to expand it. Expanded, it shows from top to bottom:
 *   1. an events line: chips with ‹ › to step between them (a chip jumps there and tells its story in the caption);
 *   2. a story strip: one column per year of what's on the map (highest green, lowest red), with event diamonds; drag
 *      anywhere on it to reach any month;
 *   3. a caption: the event's story, or what the date means for the map;
 *   4. options: Step (1 month, 1y, 5y, 10y) | Range (data years, 1974 to today) | Events counted | Back to latest.
 * Nine more styles are chosen in the Toolbox (AtlasTimebar.STYLES); each draws the same date and data its own way and
 * every one drives the same map. The choice is kept in localStorage (atlas-tb-style) for every app and the next visit.
 *
 * app.js hands over what it knows through AtlasTimebar.init(api) and calls AtlasTimebar.update() whenever the date or
 * what's on the map changes.
 */
(function () {
  "use strict";
  const esc = t => String(t == null ? "" : t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const MN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"], MS = MN.map(m => m.slice(0, 3));
  const STYLES = [
    ["atlas", "Atlas", "The basic bar, expandable"], ["frieze", "Museum frieze", "An engraved ribbon slides behind a fixed marker (gallery timelines)"],
    ["seismo", "Seismograph", "The paper runs under a fixed needle"], ["core", "Core sample", "Drill down through the years (ice cores, strata)"],
    ["wheels", "Date wheels", "Day, month and year wheels"], ["navigator", "Range navigator", "A window over the whole series, plus a playhead (finance charts)"],
    ["film", "Filmstrip", "A frame per year and a playhead (video editors)"], ["clock", "Grand-strategy clock", "A dated plaque and five speeds (strategy games)"],
    ["watermark", "Watermark", "The year, huge, behind the map (Gapminder)"], ["calendar", "Calendar grid", "Every month as a cell (contribution calendars)"]
  ];
  let A = null, host = null, water = null, S = { style: "atlas", ev: -1, evWin: 0, speed: 3, winA: null, winB: null, day: 1 };
  try { S.style = localStorage.getItem("atlas-tb-style") || "atlas"; if (!STYLES.some(s => s[0] === S.style)) S.style = "atlas"; } catch (e) {}
  try { S.evWin = +(localStorage.getItem("atlas-tb-evwin") || 0); } catch (e) {}

  // ---------- the model: months from the bar's start to its end, the mapped measure's value in each, and the events ----------
  function model() {
    const lo = A.lo(), hi = A.hi(), m0 = A.monthIdx(lo), m1 = A.monthIdx(hi), N = Math.max(1, m1 - m0 + 1);
    const cur = Math.max(0, Math.min(N - 1, A.monthIdx(A.date()) - m0)), me = A.measure && A.measure();
    const V = new Array(N).fill(null);
    if (me && me.pts && me.pts.length) {
      const pts = me.pts.filter(p => p[1] != null && isFinite(p[1])).sort((a, b) => a[0] - b[0]); let j = -1;
      for (let k = 0; k < N; k++) { const x = (m0 + k) / 12 + 1 / 24; while (j + 1 < pts.length && pts[j + 1][0] <= x + 0.0001) j++; if (j >= 0) V[k] = pts[j][1]; }
    }
    const Y0 = Math.floor(m0 / 12), NY = Math.floor(m1 / 12) - Y0 + 1;
    const years = Array.from({ length: NY }, (_, y) => { const vs = []; for (let mo = 0; mo < 12; mo++) { const k = (Y0 + y) * 12 + mo - m0; if (k >= 0 && k < N && V[k] != null) vs.push(V[k]); } return vs.length ? vs.reduce((a, b) => a + b, 0) / vs.length : null; });
    const fullY = years.map((v, y) => v != null && (Y0 + y) * 12 + 11 <= m1 ? v : null).filter(v => v != null);
    const yMax = fullY.length ? Math.max(...fullY) : null, yMin = fullY.length ? Math.min(...fullY) : null;
    const topics = (me && me.topics) || [], win = S.evWin;
    const evs = (window.ATLAS_EVENTS || []).map(e => ({ k: A.monthIdx(e.d) - m0, t: e.t, x: e.x, u: e.u, big: e.big, tp: e.tp || [] }))
      .filter(e => e.k >= 0 && e.k < N && (e.big || e.tp.some(t => topics.includes(t)))).filter(e => !win || e.k > cur - win * 12 && e.k <= cur + win * 12);
    const fmt = (me && me.fmt) || (v => (+v).toLocaleString("en-GB"));
    return { m0, m1, N, cur, V, Y0, NY, years, yMax, yMin, evs, me, fmt, monthOf: k => MN[(m0 + k) % 12], yearOf: k => Math.floor((m0 + k) / 12), go: k => A.set(A.fromMonthIdx(m0 + Math.max(0, Math.min(N - 1, k)))) };
  }
  const pc = (M, k) => (100 * (k + 0.5) / M.N).toFixed(3);
  function caption(M) {
    const ev = S.ev >= 0 ? M.evs[S.ev] : null;
    if (ev && ev.k === M.cur) return `${MN[(M.m0 + ev.k) % 12]} ${M.yearOf(ev.k)}: ${ev.t}. ${ev.x}`;
    const when = `${M.monthOf(M.cur)} ${M.yearOf(M.cur)}`, v = M.V[M.cur];
    if (!M.me) return `Showing ${when}. Put a measure on the map to see it over time here.`;
    if (v == null) return `No figures for ${M.me.label.toLowerCase()} in ${M.me.where} at ${when}.`;
    return `Showing ${when}: ${M.me.label} in ${M.me.where}, ${M.fmt(v)}.${M.me.annual ? ` Published once a year, so every month of ${M.yearOf(M.cur)} shows that year's figure.` : ""}`;
  }

  // ---------- the Atlas style: the expanded part of the bar ----------
  function atlasExpanded(M) {
    const pop = document.getElementById("tb-pop"); if (!pop || !pop._built) return;
    const evs = M.evs, chips = evs.slice(-6).map(e => ({ e, i: evs.indexOf(e) }));
    pop.querySelector(".tbx-ev").innerHTML = `<button type="button" class="tbx-step" data-tbev="-1" aria-label="Previous event">‹</button><span class="tbx-chips">${chips.map(c => `<button type="button" class="tbx-chip${S.ev === c.i && c.e.k === M.cur ? " on" : ""}" data-tbevgo="${c.i}"><b>${M.yearOf(c.e.k)}</b> ${esc(c.e.t)}</button>`).join("")}<button type="button" class="tbx-chip${M.cur === M.N - 1 ? " on" : ""}" data-tblatest>Latest</button></span><button type="button" class="tbx-step" data-tbev="1" aria-label="Next event">›</button><span class="tbx-name">${M.me ? esc(M.me.label) : ""}</span>`;
    const vals = M.years.filter(v => v != null), lo = vals.length ? Math.min(...vals) : 0, hi = vals.length ? Math.max(...vals) : 1;
    const cols = M.years.map((v, y) => { if (v == null) return ""; const k0 = Math.max(0, (M.Y0 + y) * 12 - M.m0), k1 = Math.min(M.N - 1, (M.Y0 + y) * 12 + 11 - M.m0), mid = (k0 + k1) / 2, partial = (M.Y0 + y) * 12 + 11 > M.m1;
      const h = Math.round(10 + (v - lo * 0.9) / ((hi - lo * 0.9) || 1) * 46), c = partial ? "var(--track)" : v === M.yMax ? "var(--up)" : v === M.yMin ? "var(--down)" : "var(--ink-3)", here = M.yearOf(M.cur) === M.Y0 + y;
      return `<i class="tbx-col${here ? " here" : ""}" style="left:${pc(M, mid)}%;width:${Math.max(0.6, 70 / M.NY)}%;height:${h}px;background:${c}" title="${M.Y0 + y}: ${esc(M.fmt(v))}${partial ? " (part year)" : ""}"></i>`; }).join("");
    const dia = evs.map(e => `<i class="tbx-dia${S.ev >= 0 && evs[S.ev] === e && e.k === M.cur ? " on" : ""}" style="left:${pc(M, e.k)}%" title="${esc(MS[(M.m0 + e.k) % 12] + " " + M.yearOf(e.k) + ": " + e.t)}"></i>`).join("");
    const v = M.V[M.cur], lab = `${M.monthOf(M.cur)} ${M.yearOf(M.cur)}${v != null ? ": " + M.fmt(v) : ""}`;
    const ticks = Array.from({ length: M.NY }, (_, y) => y).filter(y => M.NY <= 14 || y % Math.ceil(M.NY / 12) === 0 || y === M.NY - 1).map(y => `<span class="tbx-yr${M.yearOf(M.cur) === M.Y0 + y ? " here" : ""}" style="left:${pc(M, Math.max(0, (M.Y0 + y) * 12 + 6 - M.m0))}%">${M.NY > 20 ? "'" + String(M.Y0 + y).slice(2) : M.Y0 + y}</span>`).join("");
    pop.querySelector(".tbx-strip").innerHTML = `${cols}${dia}<i class="tbx-line" style="left:${pc(M, M.cur)}%"></i><span class="tbx-bub" style="left:${pc(M, M.cur)}%;transform:translateX(${M.cur / M.N > .82 ? "-100%" : M.cur / M.N < .12 ? "0" : "-50%"})">${esc(lab)}</span>${ticks}`;
    pop.querySelector(".tbx-cap").textContent = caption(M);
    pop.querySelectorAll("[data-tbwin]").forEach(b => b.classList.toggle("on", +b.dataset.tbwin === S.evWin));
    const back = pop.querySelector("[data-tblatest2]"); if (back) back.hidden = M.cur === M.N - 1;
  }
  function buildExpanded() {
    const pop = document.getElementById("tb-pop"); if (!pop || pop._built) return; pop._built = true;
    const steps = document.getElementById("steps"), full = document.getElementById("tb-full");
    pop.innerHTML = `<div class="tbx-ev"></div><div class="tbx-strip" role="slider" aria-label="Drag to any month" tabindex="0"></div><p class="tbx-cap"></p>
      <div class="tbx-opt"><span class="tbx-ol">Step</span><span class="tbx-steps"></span><span class="vr"></span><span class="tbx-ol">Range</span><span class="tbx-full"></span><span class="vr"></span><span class="tbx-ol">Events counted</span>${[[1, "1y"], [5, "5y"], [10, "10y"], [0, "All"]].map(([n, l]) => `<button type="button" class="tbx-o" data-tbwin="${n}">${l}</button>`).join("")}<span style="flex:1"></span><button type="button" class="tbx-back" data-tblatest2>Back to latest ›</button></div>`;
    if (steps) { pop.querySelector(".tbx-steps").appendChild(steps); if (!steps.querySelector('[data-step="0"]')) steps.insertAdjacentHTML("afterbegin", '<button data-step="0">1 month</button>'); }
    if (full) { pop.querySelector(".tbx-full").appendChild(full); }
    // drag on the strip: any month
    const strip = pop.querySelector(".tbx-strip"); let drag = false;
    const at = e => { const r = strip.getBoundingClientRect(), M = model(); M.go(Math.floor((e.clientX - r.left) / r.width * M.N)); };
    strip.addEventListener("pointerdown", e => { drag = true; strip.setPointerCapture(e.pointerId); S.ev = -1; at(e); });
    strip.addEventListener("pointermove", e => { if (drag) at(e); });
    strip.addEventListener("pointerup", () => { drag = false; });
    strip.addEventListener("keydown", e => { const M = model(); if (e.key === "ArrowLeft") { M.go(M.cur - 1); e.preventDefault(); } if (e.key === "ArrowRight") { M.go(M.cur + 1); e.preventDefault(); } });
  }

  // ---------- the nine other styles: each draws the whole bar into #tb-art ----------
  const R = {};
  const scrub = (cls) => `<input type="range" class="tba-scrub ${cls || ""}" min="0" max="{N}" step="1" value="{CUR}" aria-label="Month" data-tbscrub>`;
  const fill = (s, M) => s.replace("{N}", M.N - 1).replace("{CUR}", M.cur);
  const valTxt = M => { const v = M.V[M.cur]; return v == null ? "" : M.fmt(v); };
  R.frieze = M => { const PX = 22, W = host.clientWidth || 620;
    return `<div class="tba tba-frieze"><div class="fz-rib" style="width:${M.N * PX}px;transform:translateX(${W / 2 - M.cur * PX - PX / 2}px)">${Array.from({ length: M.NY }, (_, y) => `<div class="fz-yr" style="left:${Math.max(0, ((M.Y0 + y) * 12 - M.m0)) * PX}px;width:${12 * PX}px"><span>${M.Y0 + y}</span></div>`).join("")}${M.evs.map(e => `<div class="fz-ev" style="left:${e.k * PX}px"><i>${esc(e.t)}</i><b>${MS[(M.m0 + e.k) % 12].toUpperCase()} ${M.yearOf(e.k)}</b></div>`).join("")}</div><div class="fz-mark"></div><div class="fz-date">${M.monthOf(M.cur)} ${M.yearOf(M.cur)}</div>${fill(scrub(), M)}</div><p class="tba-cap">${esc(caption(M))}</p>`; };
  R.seismo = M => { const SP = 10, W = host.clientWidth || 620, vs = M.V.filter(v => v != null), mean = vs.length ? vs.reduce((a, b) => a + b, 0) / vs.length : 0, mx = vs.length ? Math.max(...vs.map(v => Math.abs(v - mean))) || 1 : 1;
    return `<div class="tba tba-seismo"><div class="sm-paper" style="width:${M.N * SP}px;transform:translateX(${W / 2 - M.cur * SP}px)">${M.V.map((v, k) => { if (v == null) return ""; const d = (v - mean) / mx * 40; return `<i style="left:${k * SP}px;top:${50 - Math.max(0, d)}px;height:${Math.max(2, Math.abs(d))}px${k === M.cur ? ";background:var(--down)" : ""}"></i>`; }).join("")}${Array.from({ length: M.NY }, (_, y) => `<span style="left:${Math.max(0, (M.Y0 + y) * 12 - M.m0) * SP}px">${M.Y0 + y}</span>`).join("")}</div><div class="sm-needle"></div>${fill(scrub(), M)}</div><p class="tba-cap"><b>${M.monthOf(M.cur)} ${M.yearOf(M.cur)}</b>${valTxt(M) ? " · " + esc(valTxt(M)) : ""} · ${esc(caption(M))}</p>`; };
  R.core = M => { const ys = M.years.map(v => v == null ? 0 : Math.abs(v)), tot = ys.reduce((a, b) => a + b, 0) || M.NY, H = 180; let acc = 0;
    const pos = ys.map(v => { const h = (v || tot / M.NY) / tot * H, p = acc; acc += h; return [p, h]; }), yi = M.yearOf(M.cur) - M.Y0, cy = pos[yi] ? pos[yi][0] + pos[yi][1] * (((M.m0 + M.cur) % 12) + 0.5) / 12 : 0;
    const EARTH = ["#8a6f4e", "#a88a62", "#6f5a40", "#b89a6c", "#7d6448", "#9c7f58", "#5e4b36", "#a68660"];
    return `<div class="tba tba-core"><div class="cr-tube">${ys.map((v, y) => `<span style="height:${pos[y][1].toFixed(1)}px;background:${EARTH[y % EARTH.length]}"></span>`).join("")}</div><div class="cr-probe" style="bottom:${cy.toFixed(1)}px"></div><div class="cr-labs">${ys.map((v, y) => `<span style="bottom:${(pos[y][0] + pos[y][1] / 2 - 6).toFixed(1)}px"${y === yi ? ' class="here"' : ""}>${M.Y0 + y}</span>`).join("")}</div><input type="range" class="tba-scrub cr-scrub" min="0" max="${M.N - 1}" value="${M.cur}" aria-label="Month" data-tbscrub><div class="cr-read"><b>${M.monthOf(M.cur)} ${M.yearOf(M.cur)}${valTxt(M) ? " · " + esc(valTxt(M)) : ""}</b><span>${esc(caption(M))}</span></div></div>`; };
  R.wheels = M => { const y = M.yearOf(M.cur), mo = (M.m0 + M.cur) % 12, dim = new Date(y, mo + 1, 0).getDate(), day = Math.min(S.day, dim);
    const wheel = (vals, sel, attr) => [-2, -1, 0, 1, 2].map(o => { const k = sel + o; return k < 0 || k >= vals.length ? `<span class="wh-i"></span>` : `<button type="button" class="wh-i${o ? "" : " on"}" style="opacity:${1 - Math.abs(o) * .3};transform:perspective(300px) rotateX(${o * -18}deg)" ${attr}="${k}">${esc(vals[k])}</button>`; }).join("");
    const years = Array.from({ length: M.NY }, (_, k) => String(M.Y0 + k));
    return `<div class="tba tba-wheels"><div class="wh-top"><b>Go to a date</b><button type="button" class="wh-latest" data-tblatest>Latest</button></div><div class="wh-cols"><div class="wh-band"></div><div class="wh-col">${wheel(Array.from({ length: dim }, (_, k) => String(k + 1)), day - 1, "data-tbday")}</div><div class="wh-col wide">${wheel(MN, mo, "data-tbmon")}</div><div class="wh-col">${wheel(years, y - M.Y0, "data-tbyear")}</div></div><p class="tba-cap">${esc(caption(M))}</p></div>`; };
  R.navigator = M => { const a = S.winA == null ? 0 : Math.min(S.winA, M.N - 1), b = S.winB == null ? M.N - 1 : Math.min(Math.max(S.winB, a), M.N - 1), vs = M.V.filter(v => v != null), lo = vs.length ? Math.min(...vs) : 0, hi = vs.length ? Math.max(...vs) : 1;
    return `<div class="tba tba-nav"><div class="nv-top">${[["1Y", 12], ["5Y", 60], ["10Y", 120], ["Max", M.N]].map(([l, n]) => `<button type="button" class="nv-p${b === M.N - 1 && a === Math.max(0, M.N - n) ? " on" : ""}" data-tbwinp="${n}">${l}</button>`).join("")}<span style="flex:1"></span><span class="nv-w">${MS[(M.m0 + a) % 12]} ${M.yearOf(a)} – ${MS[(M.m0 + b) % 12]} ${M.yearOf(b)}</span><span class="vr"></span><b>${M.monthOf(M.cur).slice(0, 3)} ${M.yearOf(M.cur)}${valTxt(M) ? " · " + esc(valTxt(M)) : ""}</b></div>
      <div class="nv-plot">${M.V.map((v, k) => `<i style="height:${v == null ? 0 : (14 + (v - lo * 0.9) / ((hi - lo * 0.9) || 1) * 80).toFixed(0)}%;opacity:${k >= a && k <= b ? .95 : .35}"></i>`).join("")}<div class="nv-shade" style="left:0;width:${(100 * a / M.N).toFixed(2)}%"></div><div class="nv-shade" style="right:0;width:${(100 - 100 * (b + 1) / M.N).toFixed(2)}%"></div><div class="nv-head" style="left:${pc(M, M.cur)}%"></div>${fill(scrub(), M)}</div>
      <div class="nv-ab"><label>From<input type="range" min="0" max="${M.N - 1}" value="${a}" data-tbwa></label><label>To<input type="range" min="0" max="${M.N - 1}" value="${b}" data-tbwb></label></div></div>`; };
  R.film = M => { const yi = M.yearOf(M.cur) - M.Y0, vs = M.V.filter(v => v != null), lo = vs.length ? Math.min(...vs) : 0, hi = vs.length ? Math.max(...vs) : 1;
    return `<div class="tba tba-film"><div class="fm-top"><button type="button" data-tbgo="0" aria-label="To the start">⏮</button><button type="button" data-tbstep="-1" aria-label="Back a month">◀</button><button type="button" data-tbplay aria-label="Play">${A.playing() ? "❚❚" : "▶"}</button><button type="button" data-tbstep="1" aria-label="Forward a month">▶</button><button type="button" data-tblatest aria-label="To the latest">⏭</button><b>${M.yearOf(M.cur)}:${String((M.m0 + M.cur) % 12 + 1).padStart(2, "0")}</b><span>${esc(valTxt(M))}</span></div>
      <div class="fm-frames">${Array.from({ length: M.NY }, (_, y) => `<div class="fm-f${y === yi ? " on" : ""}"><div>${Array.from({ length: 12 }, (_, mo) => { const k = (M.Y0 + y) * 12 + mo - M.m0, v = k >= 0 && k < M.N ? M.V[k] : null; return `<i style="height:${v == null ? 0 : (10 + (v - lo * 0.9) / ((hi - lo * 0.9) || 1) * 90).toFixed(0)}%${k === M.cur ? ";background:var(--pc-acc,#a07a12)" : ""}"></i>`; }).join("")}</div><span>${M.Y0 + y}</span></div>`).join("")}<div class="fm-head" style="left:${pc(M, M.cur)}%"></div>${fill(scrub(), M)}</div></div>`; };
  R.clock = M => { const y = M.yearOf(M.cur), mo = (M.m0 + M.cur) % 12;
    return `<div class="tba tba-clock"><div class="ck-top"><button type="button" class="ck-pause" data-tbplay aria-label="Pause or run time">${A.playing() ? "❚❚" : "▶"}</button><div class="ck-date"><b>${S.day} ${MN[mo]} ${y}</b><span>${A.playing() ? `Time runs · speed ${S.speed}` : "Paused"}</span></div><div class="ck-spd"><button type="button" data-tbspd="-1" aria-label="Slower">−</button>${[1, 2, 3, 4, 5].map(s => `<i style="height:${8 + s * 3}px" class="${s <= S.speed ? "on" : ""}"></i>`).join("")}<button type="button" data-tbspd="1" aria-label="Faster">+</button></div></div><div class="ck-track"><i style="width:${(100 * (M.cur + 1) / M.N).toFixed(2)}%"></i>${fill(scrub(), M)}</div><p class="tba-cap">${esc(caption(M))}</p></div>`; };
  R.watermark = M => `<div class="tba tba-water"><button type="button" class="wm-play" data-tbplay aria-label="Play">${A.playing() ? "❚❚" : "▶"}</button><div class="wm-track">${Array.from({ length: M.NY }, (_, y) => y).filter(y => M.NY <= 14 || y % Math.ceil(M.NY / 12) === 0).map(y => `<span style="left:${pc(M, Math.max(0, (M.Y0 + y) * 12 - M.m0))}%">${M.Y0 + y}</span>`).join("")}<i style="left:${pc(M, M.cur)}%"></i>${fill(scrub(), M)}</div></div>`;
  R.calendar = M => { const vs = M.V.filter(v => v != null), lo = vs.length ? Math.min(...vs) : 0, hi = vs.length ? Math.max(...vs) : 1, lvl = v => Math.min(4, Math.floor((v - lo) / ((hi - lo) || 1) * 5)), first = Math.max(0, M.NY - 12);
    const v = M.V[M.cur], rank = v == null ? "" : (() => { const s = vs.slice().sort((a, b) => b - a), r = s.indexOf(v) + 1; return r === 1 ? "the highest month" : r === s.length ? "the lowest month" : `number ${r} of ${s.length} months`; })();
    return `<div class="tba tba-cal"><div class="cl-grid"><div class="cl-row cl-mons"><span></span>${MS.map(m => `<span>${m[0]}</span>`).join("")}</div>${Array.from({ length: M.NY - first }, (_, i) => { const y = first + i; return `<div class="cl-row"><span>${M.Y0 + y}</span>${Array.from({ length: 12 }, (_, mo) => { const k = (M.Y0 + y) * 12 + mo - M.m0; if (k < 0 || k >= M.N) return `<i class="cl-none"></i>`; const x = M.V[k]; return `<button type="button" class="cl-c${k === M.cur ? " on" : ""}" data-tbgo="${k}" style="${x == null ? "" : `background:var(--cl${lvl(x)})`}" title="${MN[mo]} ${M.Y0 + y}${x == null ? "" : ": " + esc(M.fmt(x))}"></button>`; }).join("")}</div>`; }).join("")}</div>
      <div class="cl-read"><span class="cl-k">Selected month</span><b>${M.monthOf(M.cur)} ${M.yearOf(M.cur)}</b><span>${esc(valTxt(M))}${rank ? ` · ${rank}` : ""}</span><p>${esc(caption(M))}</p></div></div>`; };

  // ---------- draw ----------
  function update() {
    if (!A) return; let M; try { M = model(); } catch (e) { console.error(e); return; }
    const tb = document.getElementById("timebar"), art = S.style !== "atlas";
    document.body.classList.toggle("tb-arton", art); document.body.dataset.tbstyle = S.style;
    if (!art) { if (host) host.hidden = true; if (water) water.hidden = true; if (tb && tb.classList.contains("tbx-open")) atlasExpanded(M); return; }
    if (!host) { host = document.createElement("div"); host.id = "tb-art"; host.setAttribute("role", "group"); host.setAttribute("aria-label", "Time"); document.body.appendChild(host); host.addEventListener("click", onClick); host.addEventListener("input", onInput); }
    host.hidden = false; host.className = "tb-art tb-" + S.style;
    host.innerHTML = R[S.style] ? R[S.style](M) : "";
    if (S.style === "watermark") { if (!water) { water = document.createElement("div"); water.id = "tb-water"; water.setAttribute("aria-hidden", "true"); document.body.appendChild(water); } water.hidden = false; water.innerHTML = `<b>${M.yearOf(M.cur)}</b><span>${M.monthOf(M.cur)}${valTxt(M) ? " · " + esc(valTxt(M)) : ""}</span>`; }
    else if (water) water.hidden = true;
  }
  function stepEv(d) { const M = model(); if (!M.evs.length) return; let i = S.ev; if (i < 0 || M.evs[i].k !== M.cur) { i = d > 0 ? M.evs.findIndex(e => e.k > M.cur) : (M.evs.map(e => e.k < M.cur).lastIndexOf(true)); if (i < 0) i = d > 0 ? 0 : M.evs.length - 1; } else i = (i + d + M.evs.length) % M.evs.length; S.ev = i; M.go(M.evs[i].k); update(); }
  let playT = 0;
  function onClick(e) {
    const b = e.target.closest("button"); if (!b) return; const M = model();
    if (b.dataset.tbevgo != null) { S.ev = +b.dataset.tbevgo; M.go(M.evs[S.ev].k); update(); return; }
    if (b.dataset.tbev) return stepEv(+b.dataset.tbev);
    if (b.hasAttribute("data-tblatest") || b.hasAttribute("data-tblatest2")) { S.ev = -1; M.go(M.N - 1); return; }
    if (b.dataset.tbwin != null) { S.evWin = +b.dataset.tbwin; try { localStorage.setItem("atlas-tb-evwin", S.evWin); } catch (x) {} update(); return; }
    if (b.dataset.tbgo != null) { S.ev = -1; M.go(+b.dataset.tbgo); return; }
    if (b.dataset.tbstep) { M.go(M.cur + +b.dataset.tbstep); return; }
    if (b.hasAttribute("data-tbplay")) { if (S.style === "clock") return clockPlay(); A.play(); setTimeout(update, 50); return; }
    if (b.dataset.tbday) { S.day = +b.dataset.tbday + 1; update(); return; }
    if (b.dataset.tbmon) { M.go((M.yearOf(M.cur)) * 12 + +b.dataset.tbmon - M.m0); return; }
    if (b.dataset.tbyear) { M.go((M.Y0 + +b.dataset.tbyear) * 12 + (M.m0 + M.cur) % 12 - M.m0); return; }
    if (b.dataset.tbwinp) { const n = +b.dataset.tbwinp; S.winA = Math.max(0, M.N - n); S.winB = M.N - 1; update(); return; }
    if (b.dataset.tbspd) { S.speed = Math.max(1, Math.min(5, S.speed + +b.dataset.tbspd)); if (playT) { clearInterval(playT); playT = 0; clockPlay(); } else update(); return; }
  }
  function clockPlay() { if (playT) { clearInterval(playT); playT = 0; update(); return; } const SPD = [0, 1400, 900, 550, 300, 140]; playT = setInterval(() => { const M = model(); if (M.cur >= M.N - 1) { clearInterval(playT); playT = 0; update(); return; } M.go(M.cur + 1); }, SPD[S.speed]); update(); }
  function onInput(e) {
    const t = e.target; const M = model();
    if (t.hasAttribute("data-tbscrub")) { S.ev = -1; M.go(+t.value); return; }
    if (t.hasAttribute("data-tbwa")) { S.winA = +t.value; update(); return; }
    if (t.hasAttribute("data-tbwb")) { S.winB = +t.value; update(); return; }
  }
  function setStyle(id) {
    if (!STYLES.some(s => s[0] === id)) return; S.style = id; try { localStorage.setItem("atlas-tb-style", id); } catch (e) {}
    update(); document.dispatchEvent(new CustomEvent("atlas-tbstyle", { detail: id }));
  }
  function init(api) {
    A = api; buildExpanded();
    const tb = document.getElementById("timebar"), more = document.getElementById("tb-more"), pop = document.getElementById("tb-pop");
    if (more) { more.textContent = "⌃"; more.setAttribute("aria-label", "Show more of the time bar"); more.title = "Events, the story strip and options"; }
    if (pop) { pop.addEventListener("click", onClick); new MutationObserver(() => { const open = !pop.hidden; tb.classList.toggle("tbx-open", open); if (more) { more.textContent = open ? "⌄" : "⌃"; more.setAttribute("aria-label", open ? "Fold the time bar" : "Show more of the time bar"); } if (open) update(); }).observe(pop, { attributes: true, attributeFilter: ["hidden"] }); }
    update();
  }
  // a small picture of each style, for the Toolbox
  function thumb(id) {
    const box = (l, t, w, h, bg, x) => `<i style="left:${l}%;top:${t}%;width:${w}%;height:${h}%;background:${bg};${x || ""}"></i>`, ink = "var(--ink-2)", acc = "var(--pc-acc,#a07a12)", tr = "var(--track)";
    const D = {
      atlas: () => box(4, 46, 92, 8, tr, "border-radius:4px") + box(4, 46, 70, 8, ink, "border-radius:4px") + box(71, 34, 7, 32, acc, "border-radius:50%"),
      frieze: () => Array.from({ length: 10 }, (_, i) => box(4 + i * 9.4, 22, 8, 56, i % 3 ? "var(--cat1)" : "var(--cat2)", `opacity:${.35 + i * .06};border-radius:2px`)).join(""),
      seismo: () => [20, 50, 30, 70, 25, 60, 40, 80, 35, 55, 30, 65, 45, 75].map((h, i) => box(4 + i * 6.7, 50 - h / 2, 2.5, h, ink, "border-radius:1px")).join(""),
      core: () => [["var(--cat1)", 22], ["var(--cat3)", 14], ["var(--cat2)", 18], ["var(--cat4)", 26], [ink, 20]].reduce((a, [c, w]) => { a.s += box(a.l, 30, w * .92, 40, c, "opacity:.85"); a.l += w; return a; }, { s: "", l: 4 }).s,
      wheels: () => box(8, 20, 22, 60, "var(--chip)", "border:1px solid var(--rule);border-radius:6px") + box(39, 20, 22, 60, "var(--chip)", "border:1px solid var(--rule);border-radius:6px") + box(70, 20, 22, 60, "var(--chip)", `border:1px solid ${acc};border-radius:6px`),
      navigator: () => box(4, 30, 92, 40, "var(--cat1)", "opacity:.25;clip-path:polygon(0 80%,15% 60%,30% 70%,45% 40%,60% 50%,75% 20%,100% 30%,100% 100%,0 100%)") + box(56, 18, 24, 64, "transparent", `border:2px solid ${acc};border-radius:4px;box-sizing:border-box`),
      film: () => Array.from({ length: 6 }, (_, i) => box(4 + i * 15.6, 22, 13, 56, "var(--chip)", `border:1px solid ${i === 4 ? acc : "var(--rule)"};border-radius:3px;box-sizing:border-box`)).join(""),
      clock: () => box(4, 26, 92, 48, "var(--chip)", "border:1px solid var(--rule);border-radius:24px;box-sizing:border-box") + box(8, 34, 10, 32, acc, "border-radius:50%") + box(24, 44, 50, 12, ink, "border-radius:3px;opacity:.6"),
      watermark: () => box(14, 18, 72, 64, ink, "opacity:.12;border-radius:6px") + box(4, 84, 92, 6, tr, "border-radius:3px"),
      calendar: () => Array.from({ length: 24 }, (_, i) => box(6 + (i % 12) * 7.6, 22 + Math.floor(i / 12) * 30, 6, 24, i === 19 ? acc : tr, "border-radius:2px")).join("")
    };
    return `<span class="tb-thumb">${(D[id] || D.atlas)()}</span>`;
  }
  window.AtlasTimebar = { init, update, setStyle, get style() { return S.style; }, STYLES, thumb };
})();
