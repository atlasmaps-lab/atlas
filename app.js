/* Atlas 1.6 · UK (built on 1.5: Ruben's 0.3.3 merged with Mo's 1.4)
 * 1.6: Analyse window (statistics across places, within areas and over time), interactive charts and tables, floating
 * windows, and a workspace (projects, split view, swipe between tabs, export to PDF or slides).
 * Basemap: OS Open Zoomstack in Great Britain, OpenStreetMap elsewhere (MapTiler).
 * Areas: nations → regions → councils (ONS, May 2026) → wards (ONS, May 2024).
 * Hover an area for a quick card; click it to focus (lift, soften the rest, mind map). Shift-click or hold-and-drag to select.
 * Perspectives lay metrics over the map. Several metrics can be on at once; the engine (engine.js) decides how each is
 * drawn: categories as colour, a rate as lightness (or a 2-D colour grid with another rate), totals as circles, a
 * further number as dots, a second category as a marker, and dated events (protests) as points that appear and fade.
 * Toolbox (top right): select, lasso, measure, copy, grid lines and 0–1 sliders. Export: any metrics to Excel or CSV.
 * 1.4: a chart bubble (bottom right) charts the places in view of attention; chart styles are offered before drawing;
 * charts can open in their own tab. Custom zones (London's financial districts) are clickable tiles with the FTSE 100
 * companies headquartered in them (Markets perspective, test case).
 */
(function () {
  "use strict";
  const C = window.ATLAS_CONFIG || {};
  const OS = window.ATLAS_OS, U = window.ATLAS_UK, G = window.ATLAS_UK_GEO, P = U.places, INFO = U.info, SRCS = U.sources;
  const MK = window.ATLAS_MARKETS || null, CH = window.AtlasCharts;
  const POL = window.ATLAS_POL, SER = window.ATLAS_SERIES, PR = window.ATLAS_PROTESTS || { events: [], sites: [], causes: [] }, EN = window.AtlasEngine, XL = window.AtlasXLSX;
  // Westminster constituencies (0.3.1): their own boundary set, merged into the same places / info tables
  const PCON = window.ATLAS_PCON;
  if (PCON) {
    const off = SRCS.length; SRCS.push(...PCON.sources);
    Object.assign(P, PCON.places);
    Object.entries(PCON.info).forEach(([c, r]) => { INFO[c] = {}; Object.entries(r).forEach(([k, v]) => { INFO[c][k] = [v[0], v[1] + off, v[2]]; }); });
    G.constituencies = PCON.geo;
    Object.entries(PCON.parties || {}).forEach(([k, v]) => { if (!POL.parties[k]) POL.parties[k] = v; });
  }
  const LEVELS = ["nation", "region", "council", "constituency", "ward"];
  const LABEL = { nation: "Nation", region: "Region", council: "Council", constituency: "Constituency", ward: "Ward", country: "Country", zone: "Financial district" };
  const SRC = { nation: "nations", region: "regions", council: "councils", constituency: "constituencies", ward: "wards", zone: "zones" };
  const ZONE_Z = 9.5;
  // custom zones: areas known for something (here London's financial districts), clickable like any other area
  const ZONES = MK ? MK.zones.features : [];
  ZONES.forEach(f => { const pr = f.properties; P[pr.code] = { name: pr.name, level: "zone", parent: pr.council, nation: "E92000001", kind: pr.kind, note: pr.note }; });
  const Z = { region: 5.6, council: 6.8, ward: 9.6 };
  const VIS = { nation: [0, Z.region], region: [Z.region, Z.council], council: [Z.council, Z.ward], constituency: [0, 24], ward: [Z.ward, 24] };
  const UK = C.homeBounds || [-8.6, 49.9, 1.8, 60.9];
  const HOME = (C.start && C.start.center) || [-3.3, 54.6], HOME_Z = (C.start && C.start.zoom) || 4.9;
  const MAX_SEL = 1000, LONDON = "E12000007", UKC = "K02000001", LIFT = [-3, -6];
  const CORE = [{ id: "population", label: "Population" }, { id: "gdp", label: "GDP" }, { id: "average_age", label: "Average age" }, { id: "ruler", label: "De facto ruler" }, { id: "party", label: "Party / alignment" }];

  const esc = t => String(t == null ? "" : t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const $ = id => document.getElementById(id);
  let tt; function toast(m) { const el = $("toast"); el.textContent = m; el.hidden = false; clearTimeout(tt); tt = setTimeout(() => el.hidden = true, 3000); }
  const store = { get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } } };
  const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
  const TOOLS = Object.assign({ zoom: 0.5, cursor: 0.5, contrast: 0.5, overlay: 0.5, soften: 0.25, grid: "off" }, store.get("atlas-13-tools", {}));
  const fillOp = () => +(0.15 + 0.9 * TOOLS.overlay).toFixed(2);

  // ---------- edits + saved views (shared with earlier versions) ----------
  function blank() { return { version: 2, areas: {}, states: [] }; }
  function merge(a, b) {
    const o = JSON.parse(JSON.stringify(a || blank())); o.areas = o.areas || {}; o.states = o.states || [];
    Object.entries((b && b.areas) || {}).forEach(([k, r]) => { if (!o.areas[k] || (r.updated || 0) >= (o.areas[k].updated || 0)) o.areas[k] = r; });
    ((b && b.states) || []).forEach(s => { const i = o.states.findIndex(x => x.name === s.name); if (i < 0) o.states.push(s); else if ((s.saved || 0) >= (o.states[i].saved || 0)) o.states[i] = s; });
    o.notes = o.notes || []; ((b && b.notes) || []).forEach(n => { if (!o.notes.some(x => x.id === n.id)) o.notes.push(n); });
    return o;
  }
  let E = merge(window.ATLAS_EDITS && window.ATLAS_EDITS.areas ? window.ATLAS_EDITS : blank(), store.get("atlas-uk-edits2", null));
  function persist() { if (!store.set("atlas-uk-edits2", E)) toast("This browser would not save that. Export your edits to keep them."); syncCount(); }
  function syncCount() { const n = Object.keys(E.areas).length, s = E.states.length; $("edit-count").textContent = n || s ? `${n} area${n === 1 ? "" : "s"} edited · ${s} saved view${s === 1 ? "" : "s"}` : "No edits yet"; }

  // ---------- values ----------
  const fmtInt = n => Math.round(n).toLocaleString("en-GB");
  const fmtBig = n => n >= 1e6 ? (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + " million" : fmtInt(n);
  function fmtGDP(v) { return v >= 1e12 ? "£" + (v / 1e12).toFixed(2) + " tn" : v >= 1e9 ? "£" + (v / 1e9).toFixed(1) + " bn" : "£" + Math.round(v / 1e6).toLocaleString("en-GB") + " m"; }
  const fmtPct = v => (v > 0 ? "+" : "") + v.toFixed(1) + "%";
  function base(code, id) {
    const x = (INFO[code] || {})[id]; if (!x) return null;
    const [v, s, yr] = x; let text = v;
    if (id === "population") text = fmtInt(v); else if (id === "gdp") text = fmtGDP(v); else if (id === "average_age") text = v.toFixed(1) + " years"; else if (id === "area") text = (v >= 100 ? fmtInt(v) : v) + " km²";
    return { text, yr, src: SRCS[s] };
  }
  function value(code, id) {
    const r = E.areas[code];
    if (r && r.values && r.values[id] != null && r.values[id] !== "") return { text: r.values[id], yr: "", src: "Your edit", edited: true };
    const b = base(code, id); if (b) return b;
    const lv = P[code].level;
    if (id === "gdp") return { text: lv === "ward" ? "No data (not published for wards)" : lv === "constituency" ? "No data (not published for constituencies)" : "No data", yr: "", nd: true };
    if ((id === "population" || id === "average_age") && lv === "ward") return { text: "No data (not published for this ward)", yr: "", nd: true };
    if ((id === "population" || id === "average_age") && lv === "constituency") return { text: P[code].to ? "No data for past boundaries" : "No data (not loaded for Scottish and Northern Irish seats yet)", yr: "", nd: true };
    return { text: "—", yr: "" };
  }
  const nameOf = code => (E.areas[code] && E.areas[code].name) || (P[code] ? P[code].name : code);
  const parentOf = code => P[code] && P[code].parent;

  // ---------- dates ----------
  const pad = n => String(n).padStart(2, "0");
  const iso = d => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  const TODAY = (() => { const t = iso(new Date()); return t < POL.now ? POL.now : t; })();
  const START = POL.start;
  const dmy = s => s.slice(8, 10) + "/" + s.slice(5, 7) + "/" + s.slice(2, 4);
  const longDate = s => new Date(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const shortDate = s => new Date(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)).toLocaleDateString("en-GB", { month: "short", year: "numeric" });
  function parseDMY(t) {
    const m = String(t).trim().match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2}|\d{4})$/); if (!m) return null;
    let y = +m[3]; if (m[3].length === 2) y = y <= +TODAY.slice(2, 4) ? 2000 + y : 1900 + y;
    const d = new Date(y, +m[2] - 1, +m[1]); return d.getMonth() === +m[2] - 1 ? iso(d) : null;
  }
  const monthIdx = s => (+s.slice(0, 4)) * 12 + (+s.slice(5, 7)) - 1;
  const fromMonthIdx = i => Math.floor(i / 12) + "-" + pad(i % 12 + 1) + "-01";
  const addYears = (s, n) => (+s.slice(0, 4) + n) + s.slice(4);
  const yearsBetween = (a, b) => (Date.parse(b) - Date.parse(a)) / (365.25 * 864e5);
  const dayNum = s => Math.round(Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) / 864e5);
  const fromDay = n => new Date(n * 864e5).toISOString().slice(0, 10);
  const addDays = (s, n) => fromDay(dayNum(s) + n);
  const isNow = () => state.date >= POL.now;

  // ---------- politics over time ----------
  const PARTY = POL.parties;
  const partyName = k => k && PARTY[k] ? PARTY[k][0] : (k ? k.toUpperCase() : "—");
  const partyCol = k => k && PARTY[k] ? PARTY[k][1] : "#999999";
  function seg(list, d) { if (!list) return null; for (let i = list.length - 1; i >= 0; i--) { const s = list[i]; if (s[0] <= d && (!s[1] || d < s[1])) return s; } return null; }
  function govAt(code, d) {
    const s = seg(POL.gov[code], d); if (!s) return null;
    if (s[2] === "uk") { const u = seg(POL.gov[UKC], d); return { party: u && u[2], leader: u && u[3], title: (u ? u[4] : "") + ", UK Government", note: s[5], direct: true }; }
    return { party: s[2], leader: s[3], title: s[4], note: s[5] };
  }
  function nationOf(code) { const p = P[code]; if (!p) return null; if (p.level === "country") return UKC; if (p.level === "nation") return code; if (p.nation) return p.nation; return p.parent; }
  const councilOf = code => P[code].level === "ward" || P[code].level === "zone" ? P[code].parent : code;
  const UNDER = {}, UP = {};
  Object.keys(P).forEach(c => { const p = P[c]; if (p.level !== "council") return; UP[c] = [...new Set([p.parent, p.nation, UKC].filter(Boolean))]; UP[c].forEach(k => (UNDER[k] = UNDER[k] || []).push(c)); });
  const COUNCIL_CODES = Object.keys(P).filter(c => P[c].level === "council");
  function aggregateCat(code, d, f, noun, name) {
    const cs = UNDER[code] || []; const n = {}; let tot = 0;
    cs.forEach(c => { const k = f(c); if (k) { n[k] = (n[k] || 0) + 1; tot++; } });
    if (!tot) return { v: null, text: "No record for this date" };
    const top = Object.keys(n).sort((a, b) => n[b] - n[a])[0];
    return { v: top, text: `Largest: ${(name || partyName)(top)} (${n[top]} of ${tot} ${noun})`, counts: n, tot };
  }
  function aggregateNum(code, f) { const vs = (UNDER[code] || []).map(f).filter(v => v != null); return vs.length ? vs.reduce((a, b) => a + b, 0) / vs.length : null; }
  function tenureAt(c, d) { const s = seg(POL.control[c], d); return s ? yearsBetween(s[0], d) : null; }
  function turnoverAt(c, d) { const L = POL.control[c]; if (!L || !seg(L, d)) return null; const from = addYears(d, -20); let n = 0; for (let i = 1; i < L.length; i++) if (L[i][0] > from && L[i][0] <= d && L[i][2] !== L[i - 1][2]) n++; return n; }

  // ---------- yearly series (GDP, population) ----------
  const SY = SER ? SER.years : [];
  function serAt(key, code, d) {
    const s = SER && SER.series[key] && SER.series[key][code]; if (!s) return null;
    let i = +d.slice(0, 4) - SY[0]; if (i < 0) return null;
    let latest = false; if (i >= s.length) { i = s.length - 1; latest = true; }
    while (i >= 0 && s[i] == null) { i--; latest = true; }
    return i < 0 ? null : { v: s[i], yr: SY[i], latest };
  }
  function infoAt(key, code) { // single-year figures (constituencies have no yearly series yet)
    if (!P[code] || P[code].level !== "constituency") return null; const x = (INFO[code] || {})[key]; return x ? { v: x[0], yr: +x[2], latest: true } : null;
  }
  function popAt(code, d) { if (P[code] && (P[code].level === "ward" || P[code].level === "constituency")) { const x = (INFO[code] || {}).population; return x ? x[0] : null; } const r = serAt("population", code, d); return r ? r.v : null; }

  // ---------- protests ----------
  const CAUSES = PR.causes.map(c => c[0]), CAUSE_COL = Object.fromEntries(PR.causes);
  const ALIGN_COL = { "Labour": "#d50032", "Conservative": "#0a7bd6", "Liberal Democrat": "#f5a623", "Green": "#3aa655", "Scottish nationalist": "#e3c93a", "Welsh nationalist": "#00715f",
    "Irish republican": "#2c7a5b", "Unionist / loyalist": "#8c2d19", "Irish nationalist (constitutional)": "#6aa84f", "Right (Brexit / Reform)": "#14b5c9", "Far right": "#3d2b56",
    "Far left": "#8b0000", "Left (peace & solidarity)": "#e06666", "Labour movement (unions)": "#b45f06", "Environmental / direct action": "#38761d", "Rural / Countryside": "#7f6000",
    "Pro-European (cross-party)": "#3c78d8", "Rights campaigns (non-party)": "#c27ba0" };
  PR.events.forEach(e => { e.end = e.t1 || e.t0; e.scope = e.scope || []; });
  const NATIONWIDE = PR.events.map((e, i) => e.scope.length ? i : -1).filter(i => i >= 0);
  const paCache = {}; let paSize = 0;
  function protestAgg(d) { // events in the window ending at d, collected per council, ward, region, nation and the UK
    const key = d + "|" + PS.win; if (paCache[key]) return paCache[key];
    if (++paSize > 400) { for (const k in paCache) delete paCache[k]; paSize = 0; }
    const D = dayNum(d), lo = D - PS.win, A = { ev: {}, people: {} };
    PR.sites.forEach(s => {
      const e = PR.events[s[0]]; if (e.t0 > D || e.end <= lo) return;
      [s[3], s[4], pconOfSite(s), ...(UP[s[3]] || [])].forEach(k => { if (!k) return; (A.ev[k] = A.ev[k] || new Set()).add(s[0]); if (e.mid) A.people[k] = (A.people[k] || 0) + e.mid / e.ns; });
    });
    NATIONWIDE.forEach(i => { // events across the UK with no named town: counted for the UK and the nations they name
      const e = PR.events[i]; if (e.t0 > D || e.end <= lo) return;
      e.scope.forEach(k => { (A.ev[k] = A.ev[k] || new Set()).add(i); if (e.mid) A.people[k] = (A.people[k] || 0) + e.mid / e.scope.length; });
    });
    return (paCache[key] = A);
  }
  const pconCache = new Map();
  function pconOfSite(s) { // which constituency a protest site falls in (point in polygon, worked out once)
    if (!G.constituencies) return null; const ck = pconSig + "|" + PR.sites.indexOf(s);   // real boundaries, even when the hex map is shown if (pconCache.has(ck)) return pconCache.get(ck);
    const x = s[2], y = s[1]; let hit = null;
    const inRing = r => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const a = r[i], b = r[j]; if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
    for (const f of (G.pconReal || G.constituencies).features) { const g = f.geometry, ps = g.type === "Polygon" ? [g.coordinates] : g.coordinates; if (ps.some(p => inRing(p[0]))) { hit = f.properties.code; break; } }
    pconCache.set(ck, hit); return hit;
  }
  const winLabel = () => PS.win >= 99999 ? "since 1974" : PS.win >= 3650 ? "in the 10 years to the date" : PS.win >= 1826 ? "in the 5 years to the date" : "in the year to the date";
  function eventsIn(code, d) { const s = protestAgg(d).ev[code]; return s ? [...s].map(i => PR.events[i]) : []; }

  // ---------- perspectives and metrics ----------
  const ICON = {
    political: '<path d="M3 9.5h18L12 4z"/><path d="M5.5 10v7.5M10 10v7.5M14 10v7.5M18.5 10v7.5M3 20h18"/>',
    economic: '<path d="M3 20h18"/><path d="M6 20v-6M11 20V9M16 20v-9M21 4l-6 5-4-3-7 6"/>',
    social: '<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.4"/><path d="M3.5 20c0-3.4 2.5-5.8 5.5-5.8s5.5 2.4 5.5 5.8M15.5 14.6c2.8 0 5 2 5 5.4"/>',
    health: '<path d="M12 20s-7.5-4.6-7.5-10.2A4.1 4.1 0 0 1 12 7.4a4.1 4.1 0 0 1 7.5 2.4C19.5 15.4 12 20 12 20z"/><path d="M9 12h2l1-2 1.5 4 1-2H16"/>',
    transport: '<rect x="6" y="3" width="12" height="13" rx="3"/><path d="M6 10h12M9 13.2h.01M15 13.2h.01M8.5 16 6.5 20M15.5 16l2 4"/>',
    analysis: '<path d="M4 19l5-6 4 3 7-9"/><circle cx="4" cy="19" r="1.4"/><circle cx="9" cy="13" r="1.4"/><circle cx="13" cy="16" r="1.4"/><circle cx="20" cy="7" r="1.4"/>',
    markets: '<path d="M4 8h16l-1.6 10.5a1.6 1.6 0 0 1-1.6 1.5H7.2a1.6 1.6 0 0 1-1.6-1.5z"/><path d="M8.5 8 10 4M15.5 8 14 4M9 12.5v4M12 12.5v4M15 12.5v4"/>',
  };
  const svgIcon = (id, cls) => `<svg class="ico${cls ? " " + cls : ""}" viewBox="0 0 24 24" aria-hidden="true">${ICON[id] || ""}</svg>`;
  const PERSPECTIVES = [
    { id: "political", name: "Political", hue: "#7b4fa6", ready: true, ramp: ["#efe7f6", "#d2bde6", "#ad8fd0", "#8560b5", "#5b3a8c"], desc: "Who governs each area and how that changed since 1974, plus notable protests (test case)." },
    { id: "economic", name: "Economic", hue: "#13876b", ready: true, ramp: ["#e3f4ee", "#b3e0cf", "#73c2a6", "#33997b", "#0f6b52"], desc: "Output and income, every year since 1998." },
    { id: "social", name: "Social", hue: "#d0701c", ready: true, ramp: ["#fdeedc", "#f9cf9f", "#f2a65c", "#d97a26", "#a3510f"], desc: "Population every year since 1998; age latest only." },
    { id: "health", name: "Health", hue: "#c2364b", ready: false, planned: ["Life expectancy", "Healthy life expectancy", "Patients per GP", "Obesity rate"], desc: "Not loaded yet." },
    { id: "transport", name: "Transportation", hue: "#2b6cb0", ready: false, planned: ["Commute time", "Households without a car", "Rail stations", "Bus services"], desc: "Not loaded yet." },
    { id: "analysis", name: "Analysis", hue: "#4a4f55", ready: false, hidden: true, ramp: ["#eef0f1", "#cfd4d8", "#a3abb2", "#6f7880", "#3d444b"], planned: [], desc: "Results you put on the map from the Analyse window: clusters, residuals, component scores, hot spots." },
    { id: "markets", name: "Markets", hue: "#a07a12", ready: !!MK, ramp: ["#fbf3d5", "#f1dc93", "#ddb94f", "#b8902a", "#7d5f12"], planned: ["House prices", "Rents", "Business births", "Broadband speed"], desc: "Test case: FTSE 100 companies headquartered in London, and London's financial districts." },
  ];
  const PER = Object.fromEntries(PERSPECTIVES.map(p => [p.id, p]));
  const M = {}, METRICS = [];
  const DEF_GROUP = { economic: "Output & growth", social: "Population & age" };
  // Data honesty (1.7). A metric may declare:
  //   how      a one-line formula in plain words (cards, export)
  //   levels   the boundary sets where it means something; elsewhere get() answers "Not meaningful at this level" and the map
  //            leaves the area unfilled (never silently averaged)
  //   valid    (code) -> null, or the reason it doesn't apply to that place (e.g. "Scotland only")
  //   source   where the numbers come from (export's About sheet; every value traces to pipeline/sources/MANIFEST.csv)
  // and get() may return est: true (estimated, e.g. notional) and note.
  const NM_TEXT = "Not meaningful at this level";
  const def = m => {
    m.group = m.group || DEF_GROUP[m.p] || "";
    if (m.levels || m.valid) { const g = m.get; m.get = function (code, d) {
      const p = P[code]; if (!p) return null;
      if (m.levels && !m.levels.includes(p.level)) return { v: null, text: (m.nmText && m.nmText[p.level]) || NM_TEXT, nm: true };
      const why = m.valid && m.valid(code); if (why) return { v: null, text: why, nm: true };
      return g.call(this, code, d); }; }
    M[m.id] = m; METRICS.push(m); };
  const statusOf = (r, m) => r && r.nm ? "not meaningful" : !r || (r.v == null && !(m && m.nature === "text" && r.text)) ? "missing" : r.est ? "estimated" : "measured";
  const estTag = r => r && r.est ? ` <span class="tag est" title="${esc(r.estWhy || "Estimated, not measured")}">est.</span>` : "";
  const partyCat = { colour: partyCol, catName: partyName, cats: () => Object.keys(PARTY) };
  const lvlOf = c => P[c].level, isLocal = c => lvlOf(c) === "council" || lvlOf(c) === "ward" || lvlOf(c) === "zone", isPcon = c => lvlOf(c) === "constituency";
  // constituencies: who held each seat on a date (since 1997), from data/constituencies.js
  const SPANS = (PCON && PCON.spans) || {};
  function spanAt(code, d) { const L = SPANS[code]; if (!L) return null; for (let i = L.length - 1; i >= 0; i--) { const x = L[i]; if (x[0] <= d && (!x[1] || d < x[1])) return x; } return null; }
  function mpAt(code, d) { const x = spanAt(code, d); if (x) return { v: x[2], text: `${partyName(x[2])} · MP ${x[3]}`, mp: x[3] }; return { v: null, text: d < "1997-05-01" ? "Constituency records start in 1997" : "No MP on this date (vacant, or Parliament dissolved)" }; }

  // political: government and control
  const G1 = "Government & control", G2 = "Protests (test case)";
  // One "controlling party" that follows the boundary set on the map: the government for the UK and its nations, the Mayor
  // of London (otherwise the UK Government) for regions, council control for councils and their wards, the MP for constituencies.
  const CONTROL_HOW = { country: "the UK Government", nation: "the UK or devolved government", region: "the Mayor of London, or the UK Government (no regional government elsewhere)", council: "the party in control of the council", ward: "the party in control of its council", constituency: "the party of the MP" };
  def(Object.assign({ id: "control", p: "political", group: G1, label: "Controlling party", scale: "nominal", nature: "category", temporal: "state", desc: "Whoever runs the area at the level shown: government, mayor, council or MP",
    get(code, d) {
      const lv = lvlOf(code);
      if (lv === "constituency") return mpAt(code, d);
      if (isLocal(code)) { const s = seg(POL.control[councilOf(code)], d); return s ? { v: s[2], text: partyName(s[2]) + (lv === "ward" ? " (its council)" : " (council control)") } : { v: null, text: "No record for this date" }; }
      if (code === LONDON) { const s = seg(POL.gov[LONDON], d); if (s) return { v: s[2], text: `${partyName(s[2])} (Mayor of London)`, note: s[3] }; }
      const g = govAt(nationOf(code), d); if (!g || !g.party) return { v: null, text: "No record for this date" };
      return { v: g.party, text: partyName(g.party) + (lv === "region" && nationOf(code) === "E92000001" ? " (UK Government)" : g.direct ? " (UK Government)" : ""), note: g.leader ? `${g.leader}, ${g.title}` : g.note };
    } }, partyCat));
  def({ id: "tenure", p: "political", group: G1, label: "Years under current control", scale: "ratio", nature: "duration", temporal: "state", breaks: [2, 5, 10, 20], desc: "Time since control last changed",
    fmt: v => v.toFixed(1) + " years",
    get(code, d) { const v = isLocal(code) ? tenureAt(councilOf(code), d) : aggregateNum(code, c => tenureAt(c, d)); return v == null ? null : { v, text: this.fmt(v) + (isLocal(code) ? "" : " (average)") }; } });
  def({ id: "turnover", p: "political", group: G1, label: "Changes of control (20 years)", scale: "ratio", nature: "rate", temporal: "state", breaks: [1, 2, 3, 5], desc: "How often control changed in the 20 years to the date",
    fmt: v => (Number.isInteger(v) ? v : v.toFixed(1)) + (v === 1 ? " change" : " changes"),
    get(code, d) { const v = isLocal(code) ? turnoverAt(councilOf(code), d) : aggregateNum(code, c => turnoverAt(c, d)); return v == null ? null : { v, text: this.fmt(v) + (isLocal(code) ? "" : " (average)") }; } });
  def({ id: "ruler", p: "political", group: G1, label: "De facto ruler", scale: "nominal", nature: "text", temporal: "state", desc: "Leader, mayor, First Minister or Prime Minister",
    get(code, d) {
      if (isPcon(code)) { const m = mpAt(code, d); return { text: m.mp ? `${m.mp} (MP)` : m.text }; }
      if (d >= POL.now) return { text: value(code, "ruler").text };
      if (isLocal(code)) { const s = seg(POL.leaders[councilOf(code)], d); const t = s ? `${s[3]} (${partyName(s[2])})` : "Leader not recorded for this date"; return { text: lvlOf(code) === "ward" ? t + " — council" : t }; }
      if (code === LONDON) { const s = seg(POL.gov[LONDON], d); if (s) return { text: `${s[3]} (Mayor of London, ${partyName(s[2])})` }; }
      const g = govAt(nationOf(code), d); return { text: g && g.leader ? `${g.leader} (${g.title})` : g ? g.note : "—" };
    } });
  def({ id: "party", p: "political", group: G1, label: "Party / alignment", scale: "nominal", nature: "text", temporal: "state", desc: "Governing party, and council control",
    get(code, d) {
      if (isPcon(code)) { const m = mpAt(code, d); return { text: m.v ? partyName(m.v) : m.text }; }
      if (d >= POL.now) return { text: value(code, "party").text };
      if (isLocal(code)) { const l = seg(POL.leaders[councilOf(code)], d), c = seg(POL.control[councilOf(code)], d); return { text: [l && partyName(l[2]), c && c[2] === "noc" ? "council in no overall control" : null].filter(Boolean).join(" · ") || (c ? partyName(c[2]) : "Not recorded for this date") }; }
      const g = M.control.get(code, d); return { text: g ? g.text : "—" };
    } });
  // political: protests (test case)
  def({ id: "protest_events", p: "political", group: G2, label: "Protests (each event)", scale: "nominal", nature: "event", temporal: "event", desc: "Each protest as a point: size = crowd, colour = cause; fades as it ages",
    get(code, d) { const es = eventsIn(code, d); if (!es.length) return { v: 0, text: `None recorded ${winLabel()}` }; const big = es.filter(e => e.mid).sort((a, b) => b.mid - a.mid)[0]; return { v: es.length, text: `${es.length} ${es.length === 1 ? "protest" : "protests"}${big ? ` · largest: ${big.n} (${fmtBig(big.mid)})` : ""}` }; } });
  def({ id: "protest_count", p: "political", group: G2, label: "Number of protests", scale: "ratio", nature: "count", temporal: "event", desc: "Protests with a site in the area, in the time window",
    fmt: v => fmtInt(v) + (v === 1 ? " protest" : " protests"), get(code, d) { const n = (protestAgg(d).ev[code] || { size: 0 }).size; return { v: n, text: this.fmt(n) + " " + winLabel() }; } });
  def({ id: "protest_rate", p: "political", group: G2, label: "Protests per 100,000 people", scale: "ratio", nature: "rate", temporal: "event", weight: "population", desc: "Protests in the window, for every 100,000 residents",
    fmt: v => v.toFixed(v < 10 ? 2 : 1) + " per 100k", get(code, d) { const n = (protestAgg(d).ev[code] || { size: 0 }).size, pop = popAt(code, d); if (!pop) return null; const v = n / pop * 1e5; return { v, text: this.fmt(v) }; } });
  def({ id: "protest_largest", p: "political", group: G2, label: "Largest crowd", scale: "ratio", nature: "count", temporal: "event", desc: "Biggest crowd estimate among protests in the window",
    fmt: fmtBig, get(code, d) { const es = eventsIn(code, d).filter(e => e.mid); if (!es.length) return null; const e = es.sort((a, b) => b.mid - a.mid)[0]; return { v: e.mid, text: `${fmtBig(e.mid)} · ${e.n}`, note: e.ns > 1 ? `across ${e.ns} places` : "" }; } });
  def({ id: "protest_people", p: "political", group: G2, label: "People protesting (estimate)", scale: "ratio", nature: "count", temporal: "event", desc: "Sum of crowd estimates; an event in several places is shared equally between them",
    fmt: fmtBig, get(code, d) { const v = protestAgg(d).people[code]; return v ? { v, text: fmtBig(v) + " " + winLabel() } : { v: 0, text: "No crowd estimates " + winLabel() }; } });
  def({ id: "protest_cause", p: "political", group: G2, label: "Main cause", scale: "nominal", nature: "category", temporal: "event", desc: "Most common cause among protests in the window",
    colour: c => CAUSE_COL[c] || "#b5a99a", catName: c => c, cats: () => CAUSES,
    get(code, d) { const es = eventsIn(code, d); if (!es.length) return null; const n = {}; es.forEach(e => { const c = CAUSES[e.c]; n[c] = (n[c] || 0) + 1 + (e.mid || 0) / 1e9; }); const top = Object.keys(n).sort((a, b) => n[b] - n[a])[0]; return { v: top, text: `${top} (${Math.floor(n[top])} of ${es.length})`, counts: n }; } });
  def({ id: "protest_align", p: "political", group: G2, label: "Organisers' political alignment", scale: "nominal", nature: "category", temporal: "event", desc: "Most common alignment of organisers and parties named (Atlas's editable lookup)",
    colour: a => ALIGN_COL[a] || "#999", catName: a => a, cats: () => Object.keys(ALIGN_COL),
    get(code, d) { const es = eventsIn(code, d); if (!es.length) return null; const n = {}; es.forEach(e => e.al.forEach(a => { n[a] = (n[a] || 0) + 1; })); const top = Object.keys(n).sort((a, b) => n[b] - n[a])[0]; return top ? { v: top, text: `${top} (${n[top]} of ${es.length})`, counts: n } : { v: null, text: "No organisers recorded" }; } });
  def({ id: "protest_parties", p: "political", group: G2, label: "Parties involved", scale: "nominal", nature: "text", temporal: "event", desc: "Parties named among organisers or participants",
    get(code, d) { const s = new Set(); eventsIn(code, d).forEach(e => e.pa.forEach(p => s.add(p))); return { text: s.size ? [...s].map(partyName).join(", ") : "None named" }; } });
  // political: derived from data Atlas already has (1.7)
  const COAL = POL.coalitions || {};
  // parties in government on a date: UK (K02000001), Scotland, Wales (coalitions from government_coalitions.csv); NI: power-sharing
  function govParties(code, d) {
    const g = govAt(code, d); if (!g || !g.party) return null;
    if (code === "N92000002" && !g.direct) return { parties: [], label: "Power-sharing executive", ps: true, g };
    const c = seg(COAL[code === "E92000001" ? UKC : code], d) || (g.direct ? seg(COAL[UKC], d) : null);
    return { parties: c ? c[2] : [g.party], label: c ? c[3] : g.title, g };
  }
  function ownSpans(code) { // [start, end, party] for a council (control) or a constituency (MP's party), merging repeats
    const L = P[code].level === "constituency" ? (SPANS[code] || []).map(x => [x[0], x[1], x[2]]) : (POL.control[councilOf(code)] || []).map(x => [x[0], x[1], x[2]]);
    const out = []; L.slice().sort((a, b) => a[0] < b[0] ? -1 : 1).forEach(s => { const l = out[out.length - 1]; if (l && l[2] === s[2] && (l[1] === s[0] || !l[1])) l[1] = s[1]; else out.push(s.slice()); });
    return out;
  }
  function daysByParty(code, d) { // days under each party from the start of the record (1974 for councils, the seat's first result) to d
    const by = {}; let tot = 0;
    ownSpans(code).forEach(([s, e, p]) => { if (s > d) return; const a = dayNum(s), b = dayNum(e && e < d ? e : d); if (b > a) { by[p] = (by[p] || 0) + b - a; tot += b - a; } });
    return { by, tot };
  }
  const G31 = G1, LV31 = ["council", "ward", "constituency"];
  def({ id: "dominance", p: "political", group: G31, label: "Party dominance", scale: "ratio", nature: "share", temporal: "state", levels: LV31, breaks: [40, 55, 70, 85],
    how: "Share of days since the record starts (1 May 1974 for councils; the seat's creation, 1997 at the earliest, for constituencies) under the party that held it longest",
    desc: "How much of its recorded history one party has run the area", fmt: v => v.toFixed(0) + "%", source: "Council control: Wikipedia via politics.js; MPs: UK Parliament Members API",
    get(code, d) { const { by, tot } = daysByParty(code, d); if (!tot) return null; const top = Object.keys(by).sort((a, b) => by[b] - by[a])[0], v = 100 * by[top] / tot;
      return { v, text: `${this.fmt(v)} under ${partyName(top)}${P[code].level === "ward" ? " (its council)" : ""}`, cat: top, note: `since ${fromDay(dayNum(d) - tot).slice(0, 4)}` }; } });
  def({ id: "longest_run", p: "political", group: G31, label: "Longest continuous control", scale: "ratio", nature: "duration", temporal: "state", levels: LV31, breaks: [5, 10, 20, 30],
    how: "Longest unbroken spell of one party in control (council) or holding the seat (constituency), up to the date", desc: "The longest single run by one party", fmt: v => v.toFixed(1) + " years",
    get(code, d) { let best = null; ownSpans(code).forEach(([s, e, p]) => { if (s > d) return; const y = yearsBetween(s, e && e < d ? e : d); if (!best || y > best[0]) best = [y, p, s, e && e < d ? e : null]; });
      return best ? { v: best[0], text: `${this.fmt(best[0])}, ${partyName(best[1])} (${best[2].slice(0, 4)}–${best[3] ? best[3].slice(0, 4) : "now"})`, cat: best[1] } : null; } });
  const ALIGN_CATS = ["same", "differ", "noc", "ps"], ALIGN_NAME = { same: "Same party as government", differ: "Different party", noc: "No overall control", ps: "Power-sharing executive" };
  def({ id: "gov_aligned", p: "political", group: G31, label: "Same party as government", scale: "nominal", nature: "category", temporal: "state", levels: LV31,
    how: "Is the controlling party (council control, or the MP's party) part of the government on the date? English councils and all constituencies: the UK Government. Scottish, Welsh and Northern Irish councils: their devolved government. Coalitions count every member party",
    desc: "Whether the area is run by a party in government", colour: k => ({ same: "#3b78b5", differ: "#d9822b", noc: "#c9c3b6", ps: "#7a9a7a" })[k], catName: k => ALIGN_NAME[k], cats: () => ALIGN_CATS,
    source: "government_history.csv and government_coalitions.csv (cited); council control; Members API",
    get(code, d) {
      const pcon = P[code].level === "constituency", ctl = pcon ? (spanAt(code, d) || [])[2] : (seg(POL.control[councilOf(code)], d) || [])[2]; if (!ctl) return null;
      const nat = nationOf(code), govCode = pcon || nat === "E92000001" ? UKC : nat, gp = govParties(govCode, d); if (!gp) return null;
      const uk = govParties(UKC, d), ukNote = govCode !== UKC && uk ? `UK Government: ${uk.parties.includes(ctl) ? "same party" : "different party"}` : "";
      if (ctl === "noc") return { v: "noc", text: "No overall control", note: ukNote };
      if (gp.ps) return { v: "ps", text: `Power-sharing executive in Northern Ireland (${partyName(ctl)} here)`, note: ukNote };
      const same = gp.parties.includes(ctl);
      return { v: same ? "same" : "differ", text: `${partyName(ctl)}: ${same ? "in" : "not in"} the ${govCode === UKC ? "UK Government" : gp.g.title.replace(/^First Minister/, "devolved government")}${gp.parties.length > 1 ? ` (${gp.label})` : ""}`, note: ukNote };
    } });
  def({ id: "mp_tenure", p: "political", group: G31, label: "MP's years in the seat", scale: "ratio", nature: "duration", temporal: "state", levels: ["constituency"], breaks: [2, 5, 10, 20],
    how: "Years since the current MP first won this seat, counting continuous service in this seat only", desc: "How long the sitting MP has held the seat", fmt: v => v.toFixed(1) + " years", source: "UK Parliament Members API (spans in constituencies.js)",
    get(code, d) { const L = (SPANS[code] || []).filter(x => x[0] <= d); const cur = spanAt(code, d); if (!cur) return null; let s = cur[0];
      for (let i = L.length - 1; i >= 0; i--) { const x = L[i]; if (x[3] === cur[3] && (x[1] === s || x[0] === s)) s = x[0]; }
      const v = yearsBetween(s, d); return { v, text: `${this.fmt(v)} (${cur[3]}, since ${s.slice(0, 4)})` }; } });
  def({ id: "mp_count", p: "political", group: G31, label: "MPs since 1997", scale: "ratio", nature: "count", temporal: "state", levels: ["constituency"], breaks: [2, 3, 4, 5],
    how: "Distinct MPs for this seat from its first result (1997 at the earliest) to the date, within this boundary set only", desc: "How many different MPs the seat has had", fmt: v => fmtInt(v) + (v === 1 ? " MP" : " MPs"),
    get(code, d) { const L = (SPANS[code] || []).filter(x => x[0] <= d); if (!L.length) return null; const mps = new Set(L.map(x => x[3]));
      const by = (RES[code] || []).filter(x => ELX[x[0]].kind === "by" && ELX[x[0]].day <= d).length, defect = L.filter((x, i) => i && x[3] === L[i - 1][3] && x[2] !== L[i - 1][2]).length;
      return { v: mps.size, text: this.fmt(mps.size), note: `${by} by-election${by === 1 ? "" : "s"}, ${defect} defection${defect === 1 ? "" : "s"} · counted within this boundary set` }; } });
  def({ id: "seat_flips", p: "political", group: G31, label: "Seat changed hands", scale: "ratio", nature: "count", temporal: "state", levels: ["constituency"], breaks: [1, 2, 3, 4],
    how: "Number of times the seat's party changed, at elections, by-elections or by defection, from its first result to the date", desc: "How often the seat has changed party", fmt: v => fmtInt(v) + (v === 1 ? " change" : " changes"),
    get(code, d) { const L = ownSpans(code).filter(x => x[0] <= d); if (!L.length) return null; let n = 0, def_ = 0; const raw = (SPANS[code] || []).filter(x => x[0] <= d);
      for (let i = 1; i < L.length; i++) if (L[i][2] !== L[i - 1][2]) n++;
      for (let i = 1; i < raw.length; i++) if (raw[i][3] === raw[i - 1][3] && raw[i][2] !== raw[i - 1][2]) def_++;
      return { v: n, text: this.fmt(n), note: def_ ? `${def_} by defection` : "" }; } });
  // protests: trend, diversity and opposition (same windows as the other protest metrics)
  const ALIGN_PARTY = { "Labour": "lab", "Conservative": "con", "Liberal Democrat": "ld", "Green": "grn", "Scottish nationalist": "snp", "Welsh nationalist": "pc", "Irish republican": "sf",
    "Irish nationalist (constitutional)": "sdlp", "Unionist / loyalist": "unionist", "Right (Brexit / Reform)": "right", "Labour movement (unions)": "lab" };
  function eventsBetween(code, d, back) { const a = protestAgg(addDays(d, -back)); const s = a.ev[code]; return s ? [...s].map(i => PR.events[i]) : []; }
  def({ id: "protest_trend", p: "political", group: G2, label: "Protest trend", scale: "interval", nature: "change", temporal: "event", mid: 0,
    how: "Protests in the current window minus protests in the window of the same length just before it; % change shown when the earlier window has 5 or more", desc: "More or fewer protests than the window before", fmt: v => (v > 0 ? "+" : "") + fmtInt(v),
    get(code, d) { const now = (protestAgg(d).ev[code] || new Set()).size, before = eventsBetween(code, d, PS.win).length; if (!now && !before) return null; const v = now - before;
      return { v, text: `${this.fmt(v)} (${now} now, ${before} in the window before)${before >= 5 ? ` · ${fmtPct(100 * v / before)}` : ""}` }; } });
  def({ id: "protest_diversity", p: "political", group: G2, label: "Cause diversity", scale: "ratio", nature: "rate", temporal: "event", breaks: [0.2, 0.4, 0.6, 0.8],
    how: "Normalised Shannon entropy of causes, H / ln(k), from 0 (one cause) to 1 (evenly spread); missing with fewer than 5 protests", desc: "Whether protests here are about one thing or many", fmt: v => v.toFixed(2),
    get(code, d) { const es = eventsIn(code, d); if (es.length < 5) return es.length ? { v: null, text: `Only ${es.length} protests: too few to say` } : null;
      const n = {}; es.forEach(e => { n[e.c] = (n[e.c] || 0) + 1; }); const k = CAUSES.length, H = -Object.values(n).reduce((a, c) => a + (c / es.length) * Math.log(c / es.length), 0), v = H / Math.log(k);
      return { v, text: `${this.fmt(v)} (${Object.keys(n).length} causes among ${es.length} protests)` }; } });
  def({ id: "protest_opposition", p: "political", group: G2, label: "Protests against the governing party", scale: "ratio", nature: "share", temporal: "event", breaks: [20, 40, 60, 80],
    how: "Share of protests whose organisers are a party, or a group aligned with one, that is not in the UK Government on the protest's date. Protests with no party alignment are left out",
    desc: "How much protest here comes from opposition parties and their allies", fmt: v => v.toFixed(0) + "%",
    get(code, d) { const es = eventsIn(code, d); let used = 0, opp = 0;
      es.forEach(e => { const ps = e.al.map(a => ALIGN_PARTY[a]).filter(Boolean); if (!ps.length) return; used++; const g = govParties(UKC, fromDay(e.t0)); if (g && ps.some(p => !g.parties.includes(p))) opp++; });
      if (!used) return es.length ? { v: null, text: "No party-aligned organisers among these protests" } : null; const v = 100 * opp / used;
      return { v, text: `${this.fmt(v)} of ${used} party-aligned protests`, note: `${es.length - used} with no party alignment left out` }; } });

  // political: Westminster elections (1.7), from data/elections.js; calculations in psephology.js
  const EL = window.ATLAS_EL || null, PSE = window.AtlasPseph, G4 = "Westminster elections";
  if (EL) Object.entries(EL.parties).forEach(([k, v]) => { if (!PARTY[k]) PARTY[k] = v; });
  const ELX = EL ? EL.elections.map(([id, day, kind, set, label]) => ({ id, day, kind, set, label })) : [], RES = EL ? EL.res : {}, AREA = EL ? EL.area : {};
  const GE_DAYS = [...new Set(ELX.filter(e => e.kind === "general").map(e => e.day))].sort();
  function decode(x) {
    if (x._d) return x._d; const c = []; for (let i = 7; i < x.length; i += 2) c.push([x[i], x[i + 1]]);
    // t: votes by party (shares); cl: each candidate on its own (winner, runner-up, majority: two independents are two candidates, not one party)
    const t = PSE.tally(c), cl = c.slice().sort((a, b) => b[1] - a[1]).map(([p, v]) => [p, v, t.total ? v / t.total : 0]);
    return (x._d = { e: ELX[x[0]], electorate: x[1], valid: x[2] || t.total, invalid: x[3], winner: x[4], spk: !!x[5], est: !!x[6], t, cl });
  }
  // a seat's result on a date: the latest general or by-election on or before it (notional results are only ever a "before")
  function resAt(code, d) { const L = RES[code]; if (!L) return null; for (let i = L.length - 1; i >= 0; i--) { const r = decode(L[i]); if (r.e.kind !== "notional" && r.e.day <= d) return r; } return null; }
  function prevOf(code, r) { // the previous general election in the same seat; across a boundary change, the Library's notional result (estimated)
    const L = RES[code] || []; for (let i = L.length - 1; i >= 0; i--) { const q = decode(L[i]); if (q.e.kind !== "by" && q.e.day < r.e.day) return q; } return null;
  }
  const geAt = d => { let g = null; for (const x of GE_DAYS) if (x <= d) g = x; return g; };
  const aggCache = {};
  function aggregateEl(code, day) { // every seat at one general election inside the area, votes summed and then recomputed (never averaged)
    const ck = code + "|" + day; if (ck in aggCache) return aggCache[ck];
    const lv = P[code].level, by = {}, seats = {}; let valid = 0, electorate = 0, elect_valid = 0, n = 0, wasted = 0;
    for (const c in RES) { const a = AREA[c]; if (!a) continue; if (lv === "nation" && a[0] !== code) continue; if (lv === "region" && a[1] !== code) continue;
      for (const x of RES[c]) { const r = decode(x); if (r.e.day !== day || r.e.kind !== "general") continue;
        n++; valid += r.valid; if (r.electorate) { electorate += r.electorate; elect_valid += r.valid; }
        r.t.list.forEach(([p, v]) => { by[p] = (by[p] || 0) + v; }); const w = r.spk ? "spk" : r.cl[0][0]; seats[w] = (seats[w] || 0) + 1;
        const ws = PSE.wasted(r.cl, r.valid); if (ws) wasted += ws.votes; } }
    if (!n) return (aggCache[ck] = null);
    const t = PSE.tally(Object.entries(by));
    return (aggCache[ck] = { agg: true, day, e: { day, kind: "general", label: `${day.slice(0, 4)} general election` }, n, valid, electorate, elect_valid, t, cl: t.list, seats, wasted, est: false });
  }
  const resultFor = (code, d) => { const p = P[code]; if (!p) return null; if (p.level === "constituency") return resAt(code, d); const g = geAt(d); return g ? aggregateEl(code, g) : null; };
  const previousFor = (code, r) => { if (!r) return null; if (!r.agg) return prevOf(code, r); const i = GE_DAYS.indexOf(r.day); return i > 0 ? aggregateEl(code, GE_DAYS[i - 1]) : null; };
  const shareOf = (r, p) => r.t.total ? (r.t.by[p] || 0) / r.t.total : 0;
  const sharesOf = r => Object.fromEntries(r.t.list.map(([p, , s]) => [p, s]));
  const winnerOf = r => r.spk ? "spk" : r.cl[0][0];
  const elWhen = r => r.e.label;
  const pct1 = v => v.toFixed(1) + "%", pts = v => (v > 0 ? "+" : v < 0 ? "−" : "±") + Math.abs(v).toFixed(1) + " pts";
  const MINOR = p => p.startsWith("x-") || p === "ind" || p === "oth";
  const groupMinor = p => MINOR(p) ? "oth" : p;
  const WM_LEVELS = ["constituency", "region", "nation", "country"], SEAT_ONLY = ["constituency"], AREA_ONLY = ["region", "nation", "country"];
  const WM_NM = { council: "Not meaningful at this level: Westminster seats don't nest in councils", ward: "Not meaningful at this level: Westminster seats don't nest in wards" };
  const WM_SRC = EL ? EL.sources.westminster : "";
  const bar = r => { const L = r.agg ? Object.entries(r.seats).sort((a, b) => b[1] - a[1]) : r.cl.slice(0, 6).map(([p, v]) => [p, v]); const tot = L.reduce((a, x) => a + x[1], 0);
    return `<div class="compbar">${L.map(([p, v]) => `<i style="width:${(100 * v / tot).toFixed(2)}%;background:${partyCol(p)}" title="${esc(partyName(p))}: ${r.agg ? v + " seats" : fmtInt(v) + " votes"}"></i>`).join("")}</div><small>${L.slice(0, 5).map(([p, v]) => `${esc(partyName(p))} ${r.agg ? v : pct1(100 * v / tot)}`).join(" · ")}</small>`; };
  const wm = o => def(Object.assign({ p: "political", group: G4, temporal: "election", levels: WM_LEVELS, nmText: WM_NM, source: WM_SRC }, o));
  const PS_PICK_DEF = { council_seat_share: "lab", ge_share: "lab", ge_swing_butler: "con-lab", ge_swing_steed: "con-lab" };
  const pickOf = id => (PS.pick && PS.pick[id]) || PS_PICK_DEF[id];
  wm({ id: "ge_winner", label: "Winning party", scale: "nominal", nature: "category", desc: "Who won the seat; for a region, nation or the UK, the party with most seats", pairShare: "ge_win_share",
    how: "Seat: the candidate with most votes (the Speaker shown as Speaker). Region, nation, UK: the party that won most seats there", ...partyCat,
    get(code, d) { const r = resultFor(code, d); if (!r) return null; const top = r.agg ? Object.keys(r.seats).sort((a, b) => r.seats[b] - r.seats[a] || (r.t.by[b] || 0) - (r.t.by[a] || 0))[0] : winnerOf(r);
      const text = r.agg ? `${partyName(top)}: ${r.seats[top]} of ${r.n} seats (${pct1(100 * shareOf(r, top))} of votes)` : `${partyName(top)}${r.winner ? ` (${r.winner})` : ""} · ${pct1(100 * r.cl[0][2])}`;
      return { v: top, text, yr: elWhen(r), counts: r.agg ? r.seats : null, tot: r.n, detail: bar(r) }; } });
  wm({ id: "ge_win_share", label: "Winner's vote share", scale: "ratio", nature: "share", breaks: [35, 42, 50, 60], fmt: pct1, desc: "The winning party's share of the vote (shades the winner's colour)",
    how: "Winner's votes ÷ valid votes (for an area: the leading party's summed votes ÷ all valid votes)",
    get(code, d) { const r = resultFor(code, d); if (!r) return null; const top = r.agg ? r.cl[0][0] : winnerOf(r), v = 100 * (r.agg ? r.cl[0][2] : r.cl[0][2]);
      return { v, text: `${pct1(v)} (${partyName(top)})`, yr: elWhen(r) }; } });
  wm({ id: "ge_share", label: "Vote share (choose party)", scale: "ratio", nature: "share", fmt: pct1, pick: "party", desc: "One party's share of the vote; choose the party in the key",
    how: "Party's votes ÷ valid votes; for an area, summed votes ÷ summed valid votes",
    get(code, d) { const r = resultFor(code, d); if (!r) return null; const p = pickOf("ge_share"), v = 100 * shareOf(r, p); return { v, text: `${pct1(v)} for ${partyName(p)}${r.t.by[p] ? "" : " (did not stand)"}`, yr: elWhen(r) }; } });
  wm({ id: "ge_turnout", label: "Turnout", scale: "ratio", nature: "share", fmt: pct1, breaks: [55, 60, 65, 70], desc: "Share of the electorate who cast a valid vote",
    how: "Valid votes ÷ electorate (the House of Commons Library's definition; rejected ballots are not counted)",
    get(code, d) { const r = resultFor(code, d); if (!r) return null; const e = r.agg ? r.electorate : r.electorate, vv = r.agg ? r.elect_valid : r.valid; if (!e) return { v: null, text: "Electorate not recorded" };
      const v = 100 * vv / e; return { v, text: `${pct1(v)} (${fmtInt(vv)} of ${fmtInt(e)})`, yr: elWhen(r) }; } });
  const turnoutOf = r => { const e = r.electorate, vv = r.agg ? r.elect_valid : r.valid; return e ? 100 * vv / e : null; };
  wm({ id: "ge_turnout_change", label: "Turnout change", scale: "interval", nature: "change", mid: 0, fmt: pts, desc: "Turnout against the previous general election",
    how: "Turnout now minus turnout at the previous general election, in percentage points. Across a boundary change the previous figure is the Library's notional result (estimated)",
    get(code, d) { const r = resultFor(code, d), q = previousFor(code, r); if (!r || !q) return r ? { v: null, text: "No comparable previous election" } : null;
      const a = turnoutOf(r), b = turnoutOf(q); if (a == null || b == null) return { v: null, text: "Electorate not recorded" };
      return { v: a - b, text: `${pts(a - b)} (${pct1(b)} → ${pct1(a)})`, yr: `${elWhen(q)} → ${elWhen(r)}`, est: q.est, estWhy: "Compared with a notional result on the new boundaries" }; } });
  wm({ id: "ge_majority", label: "Majority", scale: "ratio", nature: "share", levels: SEAT_ONLY, fmt: pct1, breaks: [5, 10, 20, 30], desc: "Winner's lead over the runner-up",
    how: "(Winner's votes − runner-up's votes) ÷ valid votes, as a %", nmText: Object.assign({ region: "A majority belongs to a single seat", nation: "A majority belongs to a single seat", country: "A majority belongs to a single seat" }, WM_NM),
    get(code, d) { const r = resultFor(code, d); if (!r) return null; const m = PSE.majority(r.cl, r.t.total); return { v: m.pct, text: `${pct1(m.pct)} (${fmtInt(m.votes)} votes)`, yr: elWhen(r) }; } });
  const MARG = ["vm", "m", "fs", "s"], MARG_NAME = { vm: "Very marginal (under 5%)", m: "Marginal (5–10%)", fs: "Fairly safe (10–20%)", s: "Safe (20% or more)" };
  wm({ id: "ge_marginality", label: "Marginality", scale: "nominal", nature: "category", levels: SEAT_ONLY, nmText: M.ge_majority.nmText, desc: "How safe the seat is (bands of the majority)",
    how: "A view of the majority: under 5% very marginal, 5–10% marginal, 10–20% fairly safe, 20% or more safe. These bands are Atlas's convention, not an official definition",
    colour: k => ({ vm: "#b2182b", m: "#ef8a62", fs: "#92c5de", s: "#2166ac" })[k], catName: k => MARG_NAME[k], cats: () => MARG,
    get(code, d) { const r = M.ge_majority.get(code, d); if (!r || r.v == null) return r; const k = r.v < 5 ? "vm" : r.v < 10 ? "m" : r.v < 20 ? "fs" : "s"; return { v: k, text: `${MARG_NAME[k]}: ${r.text}`, yr: r.yr }; } });
  wm({ id: "ge_to_flip", label: "Votes to flip", scale: "ratio", nature: "count", levels: SEAT_ONLY, nmText: M.ge_majority.nmText, fmt: v => fmtInt(v) + " votes", desc: "Voters who would have to switch from the winner to the runner-up",
    how: "floor(majority in votes ÷ 2) + 1: each voter who switches takes one vote off the winner and gives one to the runner-up",
    get(code, d) { const r = resultFor(code, d); if (!r) return null; const m = PSE.majority(r.cl, r.t.total), v = PSE.toFlip(m.votes); return { v, text: `${fmtInt(v)} voters switching to ${partyName(r.cl[1] ? r.cl[1][0] : "")}`, yr: elWhen(r) }; } });
  wm({ id: "ge_second", label: "Second-placed party", scale: "nominal", nature: "category", levels: SEAT_ONLY, nmText: M.ge_majority.nmText, desc: "Who came second", how: "The candidate with the second most votes", ...partyCat,
    get(code, d) { const r = resultFor(code, d); if (!r || !r.cl[1]) return null; const p = r.cl[1][0]; return { v: p, text: `${partyName(p)} · ${pct1(100 * r.cl[1][2])}`, yr: elWhen(r) }; } });
  wm({ id: "ge_minority_win", label: "Won on under half the vote", scale: "nominal", nature: "category", levels: SEAT_ONLY, nmText: M.ge_majority.nmText, desc: "Whether the winner had less than 50% of the vote",
    how: "Yes when the winner's share of valid votes is below 50%", colour: k => k === "yes" ? "#d9822b" : "#5b8db8", catName: k => k === "yes" ? "Yes: under half" : "No: half or more", cats: () => ["yes", "no"],
    get(code, d) { const r = resultFor(code, d); if (!r) return null; const s = 100 * r.cl[0][2]; return { v: s < 50 ? "yes" : "no", text: `${s < 50 ? "Yes" : "No"}: winner had ${pct1(s)}`, yr: elWhen(r) }; } });
  wm({ id: "ge_wasted", label: "Wasted votes", scale: "ratio", nature: "share", fmt: pct1, breaks: [50, 60, 70, 80], desc: "Votes that made no difference to who won",
    how: "(Votes for all losing candidates + the winner's votes beyond the runner-up's + 1) ÷ valid votes; for an area, summed over its seats",
    get(code, d) { const r = resultFor(code, d); if (!r) return null; const w = r.agg ? { votes: r.wasted, pct: 100 * r.wasted / r.valid } : PSE.wasted(r.cl, r.t.total); return { v: w.pct, text: `${pct1(w.pct)} (${fmtInt(w.votes)} votes)`, yr: elWhen(r) }; } });
  wm({ id: "ge_two_party", label: "Two-party share", scale: "ratio", nature: "share", fmt: pct1, desc: "Conservative and Labour together", how: "(Conservative + Labour votes) ÷ valid votes",
    valid: code => nationOf(code) === "N92000002" ? "Not meaningful in Northern Ireland: these parties barely stand" : null,
    get(code, d) { const r = resultFor(code, d); if (!r) return null; const v = 100 * (shareOf(r, "con") + shareOf(r, "lab")); return { v, text: pct1(v), yr: elWhen(r) }; } });
  const PAIRS = [["con-lab", "Conservative v Labour"], ["lab-ref", "Labour v Reform UK"], ["con-ref", "Conservative v Reform UK"], ["snp-lab", "SNP v Labour"], ["con-ld", "Conservative v Liberal Democrats"], ["lab-ld", "Labour v Liberal Democrats"], ["lab-grn", "Labour v Green"], ["lab-pc", "Labour v Plaid Cymru"]];
  const pairOf = id => pickOf(id).split("-");
  const swingGet = kind => function (code, d) {
    const r = resultFor(code, d), q = previousFor(code, r); if (!r || !q) return r ? { v: null, text: "No comparable previous election" } : null;
    const [a, b] = pairOf(this.id), now = sharesOf(r), before = sharesOf(q);
    const v = kind === "butler" ? PSE.butler(now, before, a, b) : PSE.steed(now, before, a, b); if (v == null) return { v: null, text: "Neither party stood in both elections" };
    return { v, text: `${pts(Math.abs(v))} towards ${partyName(v >= 0 ? a : b)}`, yr: `${elWhen(q)} → ${elWhen(r)}`, est: q.est, estWhy: "Compared with a notional result on the new boundaries" };
  };
  wm({ id: "ge_swing_butler", label: "Swing (Butler)", scale: "interval", nature: "change", mid: 0, fmt: pts, pick: "pair", desc: "Movement between two parties since the previous election; positive = towards the first party",
    how: "((first party's share now − before) − (second party's share now − before)) ÷ 2, in points of the total vote. Across a boundary change, 'before' is the Library's notional result", get: swingGet("butler") });
  wm({ id: "ge_swing_steed", label: "Swing (Steed, two-party)", scale: "interval", nature: "change", mid: 0, fmt: pts, pick: "pair", desc: "Movement between two parties, counting only their votes",
    how: "Change in first party ÷ (first + second party), in points", get: swingGet("steed") });
  wm({ id: "ge_volatility", label: "Volatility (Pedersen)", scale: "ratio", nature: "rate", fmt: v => v.toFixed(1) + " pts", breaks: [5, 10, 15, 20], desc: "How much the vote moved between all parties since the previous election",
    how: "½ × the sum, over all parties, of the change in vote share; parties outside the main ones and independents count together as 'Other' in both elections",
    get(code, d) { const r = resultFor(code, d), q = previousFor(code, r); if (!r || !q) return r ? { v: null, text: "No comparable previous election" } : null;
      const v = PSE.pedersen(sharesOf(r), sharesOf(q), groupMinor); return { v, text: this.fmt(v), yr: `${elWhen(q)} → ${elWhen(r)}`, est: q.est, estWhy: "Compared with a notional result on the new boundaries" }; } });
  wm({ id: "ge_enp_votes", label: "Effective number of parties (votes)", scale: "ratio", nature: "rate", fmt: v => v.toFixed(2), breaks: [2, 2.5, 3, 3.5], desc: "How fragmented the vote is",
    how: "1 ÷ the sum of each party's squared vote share (shares as proportions; Laakso & Taagepera)",
    get(code, d) { const r = resultFor(code, d); if (!r) return null; const v = PSE.enp(r.cl.map(x => x[2])); return { v, text: this.fmt(v), yr: elWhen(r) }; } });
  const AREA_NM = Object.assign({ constituency: "Not meaningful for a single seat" }, WM_NM);
  wm({ id: "ge_enp_seats", label: "Effective number of parties (seats)", scale: "ratio", nature: "rate", levels: AREA_ONLY, nmText: AREA_NM, fmt: v => v.toFixed(2), desc: "How fragmented the seats are",
    how: "1 ÷ the sum of each party's squared share of the seats won in the area",
    get(code, d) { const r = resultFor(code, d); if (!r) return null; const v = PSE.enp(Object.values(r.seats).map(n => n / r.n)); return { v, text: `${this.fmt(v)} (${r.n} seats)`, yr: elWhen(r) }; } });
  wm({ id: "ge_gallagher", label: "Disproportionality (Gallagher)", scale: "ratio", nature: "rate", levels: AREA_ONLY, nmText: AREA_NM, fmt: v => v.toFixed(1), desc: "How far seats differ from votes",
    how: "√(½ × the sum over parties of (vote % − seat %)²), all parties including those with no seats",
    get(code, d) { const r = resultFor(code, d); if (!r) return null; const parties = new Set([...Object.keys(r.t.by), ...Object.keys(r.seats)]);
      const v = PSE.gallagher([...parties].map(p => ({ votes: shareOf(r, p), seats: (r.seats[p] || 0) / r.n }))); return { v, text: `${this.fmt(v)} (${r.n} seats)`, yr: elWhen(r) }; } });
  const QUOTA_2023 = 73393;
  const meanElectorate = day => { const a = aggregateEl(UKC, day); return a && a.n ? a.electorate / a.n : null; };
  wm({ id: "electors_per_mp", label: "Electors per MP", scale: "interval", nature: "change", mid: 0, fmt: v => (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(v).toFixed(1) + "%", desc: "Electorate per seat, against the electoral quota (2024 seats) or the UK average (before)",
    how: "The seat's electorate at the election. On the 2024 boundaries: % above or below the 2023 review's UK electoral quota of 73,393. Before 2024: % above or below that election's UK mean electorate per seat. For an area: electorate ÷ seats",
    get(code, d) { const r = resultFor(code, d); if (!r || !r.electorate) return r ? { v: null, text: "Electorate not recorded" } : null; const per = r.agg ? r.electorate / r.n : r.electorate;
      const quota = r.e.day >= "2024-07-04" ? QUOTA_2023 : meanElectorate(r.agg ? r.day : (geAt(r.e.day) || r.e.day)); if (!quota) return null; const v = 100 * (per / quota - 1);
      return { v, text: `${fmtInt(per)} electors${r.agg ? " per seat" : ""} (${this.fmt(v)} against ${r.e.day >= "2024-07-04" ? "the 2023 quota of 73,393" : "the UK mean of " + fmtInt(quota)})`, yr: elWhen(r) }; } });
  // political: referendums (1.7)
  const G5 = "Referendums", REF = EL ? EL.ref || {} : {}, EU_DAY = "2016-06-23";
  function euAt(code) { // a council's row, or votes summed over the councils in a region, nation or the UK (never averaged)
    const E = REF.eu; if (!E) return null; const lv = P[code].level;
    if (lv === "council") { const r = E[code] || (code[0] === "N" ? E.N92000002 : null); return r ? { electorate: r[0], valid: r[1], leave: r[2], remain: r[3], note: code[0] === "N" ? "Northern Ireland counted as one area" : r[5] } : null; }
    if (code === "N92000002") { const r = E.N92000002; return r && { electorate: r[0], valid: r[1], leave: r[2], remain: r[3], note: "Northern Ireland counted as one area" }; }
    const cs = (UNDER[code] || []).filter(c => c[0] !== "N"); const o = { electorate: 0, valid: 0, leave: 0, remain: 0, n: 0 };
    cs.forEach(c => { const r = E[c]; if (!r) return; o.electorate += r[0]; o.valid += r[1]; o.leave += r[2]; o.remain += r[3]; o.n++; });
    if (lv === "country" && E.N92000002) { const r = E.N92000002; o.electorate += r[0]; o.valid += r[1]; o.leave += r[2]; o.remain += r[3]; o.note = "Gibraltar, which voted but is not part of the UK, is left out"; }
    return o.n ? o : null;
  }
  const refWhen = d => d < EU_DAY ? { v: null, text: "The referendum was held on 23 June 2016" } : null;
  const EU_SRC = EL && EL.sources.eu, EU_LV = ["council", "region", "nation", "country"], EU_NM = { ward: "Counted by council area, not by ward", constituency: "Counted by council area: see the constituency Leave estimate", zone: NM_TEXT };
  def({ id: "eu_leave", p: "political", group: G5, label: "EU referendum: Leave", scale: "interval", nature: "share", temporal: "election", mid: 50, fmt: pct1, levels: EU_LV, nmText: EU_NM, source: EU_SRC,
    how: "Leave votes ÷ valid votes. Councils merged since 2016 add up their predecessors' votes; regions, nations and the UK add up their councils' votes", desc: "Share voting Leave in the 2016 EU referendum",
    get(code, d) { const w = refWhen(d); if (w) return w; const r = euAt(code); if (!r) return null; const v = 100 * r.leave / r.valid;
      return { v, text: `${pct1(v)} Leave (${fmtInt(r.leave)} v ${fmtInt(r.remain)})`, yr: "2016 EU referendum", note: r.note || "" }; } });
  def({ id: "eu_turnout", p: "political", group: G5, label: "EU referendum: turnout", scale: "ratio", nature: "share", temporal: "election", fmt: pct1, breaks: [65, 70, 75, 80], levels: EU_LV, nmText: EU_NM, source: EU_SRC,
    how: "Valid votes ÷ electorate (the Electoral Commission's own turnout also counts rejected ballots)", desc: "Share of the electorate who cast a valid vote in 2016",
    get(code, d) { const w = refWhen(d); if (w) return w; const r = euAt(code); if (!r || !r.electorate) return null; const v = 100 * r.valid / r.electorate;
      return { v, text: `${pct1(v)} (${fmtInt(r.valid)} of ${fmtInt(r.electorate)})`, yr: "2016 EU referendum", note: r.note || "" }; } });
  def({ id: "eu_leave_est_pcon", p: "political", group: G5, label: "EU referendum: Leave (constituency estimate)", scale: "interval", nature: "share", temporal: "election", mid: 50, fmt: pct1, levels: ["constituency"],
    nmText: { council: "Councils have counted results: see EU referendum: Leave", ward: NM_TEXT, region: NM_TEXT, nation: NM_TEXT, country: NM_TEXT }, source: EL && EL.sources.eu_pcon,
    how: "Chris Hanretty's estimates (2016): a model of council results by demographics, projected onto constituencies; where the BBC obtained ward counts, the known result. Great Britain, 2010 boundaries only",
    desc: "Estimated Leave share in each Westminster seat (results were counted by council, not by constituency)",
    valid: code => !code.startsWith("P10-") ? (code[0] === "N" || code.startsWith("P97-N") ? "Not estimated for Northern Ireland" : "Estimates exist for the 2010–2024 boundaries only (move the time bar to 2010–2024)") : null,
    get(code, d) { const w = refWhen(d); if (w) return w; const r = (REF.eu_pcon || {})[code]; if (!r) return code.includes("-N") ? { v: null, text: "Not estimated for Northern Ireland" } : null;
      return { v: r[0], text: `${pct1(r[0])} Leave`, yr: "2016 EU referendum", est: true, estWhy: r[1] ? "Known result from ward counts (BBC), compiled by Chris Hanretty" : "Modelled estimate by Chris Hanretty", note: r[1] ? "known result (BBC ward counts), via Chris Hanretty" : "estimate by Chris Hanretty" }; } });
  // political: ideology (1.7). The calculation is the plug-in AtlasPseph.ideology (Vision.md point 4); party scores: CHES lrgen
  const G6 = "Ideology", CHES = EL ? EL.ches || {} : {}, CHES_WAVES = Object.keys(CHES).sort();
  const waveFor = day => { let w = null; for (const y of CHES_WAVES) if (+y <= +day.slice(0, 4)) w = y; return w; };
  function ideoAt(code, d) {
    const r = resultFor(code, d); if (!r) return null; const w = waveFor(r.e.day);
    if (!w) return { miss: `No CHES wave on or before the ${r.e.label} (the first is 1999)`, r };
    const sc = CHES[w], I = PSE.ideology(r.t.list.map(([p, , sh]) => ({ share: sh, x: sc[p] })));
    const cov = 100 * I.covered, ni = nationOf(code) === "N92000002";
    if (cov < 75) return { miss: `Parties with a CHES score won only ${cov.toFixed(0)}% of the vote here${ni ? " (Northern Irish parties are not in CHES)" : ""}`, r };
    return { I, cov, w, r, note: `CHES ${w} wave · scored parties ${cov.toFixed(0)}% of the vote${cov < 90 ? " (under 90%: read with care)" : ""}` };
  }
  def({ id: "ideo_centre", p: "political", group: G6, label: "Left–right centre of gravity", scale: "interval", nature: "rate", temporal: "election", mid: 5, fmt: v => v.toFixed(2), levels: WM_LEVELS, nmText: WM_NM,
    source: EL && EL.sources.ches, how: "Vote-weighted mean of the parties' CHES left–right scores (0 = far left, 10 = far right), over parties with a score; missing when they won under 75% of the vote",
    desc: "Where the vote sits on the left–right scale (Westminster)",
    get(code, d) { const x = ideoAt(code, d); if (!x) return null; if (x.miss) return { v: null, text: x.miss, yr: x.r.e.label };
      return { v: x.I.centre, text: `${this.fmt(x.I.centre)} (${x.I.centre < 5 ? "left of" : "right of"} centre)`, yr: x.r.e.label, note: x.note, est: x.cov < 90, estWhy: "Scored parties won under 90% of the vote" }; } });
  def({ id: "ideo_polarisation", p: "political", group: G6, label: "Polarisation (Dalton index)", scale: "ratio", nature: "rate", temporal: "election", fmt: v => v.toFixed(2), breaks: [0.2, 0.3, 0.4, 0.5], levels: WM_LEVELS, nmText: WM_NM,
    source: EL && EL.sources.ches, how: "√(Σ vᵢ × ((xᵢ − x̄) ÷ 5)²): vᵢ = vote share renormalised over parties with a CHES score, xᵢ = the party's left–right score, x̄ = the centre of gravity. 0 = everyone votes for the same position, 1 = split between the two ends",
    desc: "How spread out the vote is across left and right (Westminster)",
    get(code, d) { const x = ideoAt(code, d); if (!x) return null; if (x.miss) return { v: null, text: x.miss, yr: x.r.e.label };
      return { v: x.I.polarisation, text: this.fmt(x.I.polarisation), yr: x.r.e.label, note: x.note, est: x.cov < 90, estWhy: "Scored parties won under 90% of the vote" }; } });
  // political: local elections & councils (1.7): council tax
  const LOC = window.ATLAS_LOCAL || {}, G7 = "Local elections & councils";
  const atYear = (blk, y) => { if (!blk) return null; const y0 = +Object.keys(blk)[0], v = blk[y0][y - y0]; return y >= y0 && v != null ? v : null; };
  const fyOf = d => +d.slice(0, 4) - (d.slice(5) < "04-01" ? 1 : 0);   // financial years start on 1 April
  const fyName = y => `${y}-${String((y + 1) % 100).padStart(2, "0")}`;
  const cpihAt = y => atYear(LOC.cpih, y), CPIH_BASE = LOC.cpih ? +Object.keys(LOC.cpih)[0] + LOC.cpih[Object.keys(LOC.cpih)[0]].length - 1 : null;
  function bandD(code, d) { // a council's Band D; for a region or nation, the plain average of its councils is not the official figure, so not shown
    const y = fyOf(d), v = atYear((LOC.bandd || {})[councilOf(code)], y); return v == null ? null : { v, y };
  }
  const CT_LV = ["council", "ward"], CT_VALID = code => nationOf(code) === "N92000002" ? "Not applicable in Northern Ireland (domestic rates, not council tax)" : null;
  const CT_NM = { region: "Shown for councils only (the official regional average weights by dwellings, which Atlas doesn't have yet)", nation: "Shown for councils only", country: "Shown for councils only", constituency: "Council tax is set by councils, not constituencies" };
  const gbp = v => "£" + fmtInt(v);
  def({ id: "band_d", p: "political", group: G7, label: "Council tax, Band D", scale: "ratio", nature: "amount", temporal: "annual", fmt: gbp, levels: CT_LV, nmText: CT_NM, valid: CT_VALID, source: LOC.sources && LOC.sources.bandd,
    how: "Band D council tax for the financial year (April to March), nominal £. England and Wales: the area figure including county, police, fire, mayoral and parish precepts (the headline official figure). Scotland: council tax only (no water or sewerage)",
    desc: "What a Band D home pays in council tax a year",
    get(code, d) { const r = bandD(code, d); return r ? { v: r.v, text: this.fmt(r.v) + (P[code].level === "ward" ? " (its council)" : ""), yr: fyName(r.y) } : { v: null, text: `No figure for ${fyName(fyOf(d))}` }; } });
  def({ id: "band_d_real", p: "political", group: G7, label: "Council tax, Band D (real)", scale: "ratio", nature: "amount", temporal: "annual", fmt: gbp, levels: CT_LV, nmText: CT_NM, valid: CT_VALID, source: LOC.sources && LOC.sources.bandd,
    how: `Band D × (CPIH in April ${CPIH_BASE} ÷ CPIH in April of that financial year): the amount in April ${CPIH_BASE} prices (ONS CPIH, L522)`, desc: "Band D council tax after inflation",
    get(code, d) { const r = bandD(code, d); if (!r) return { v: null, text: `No figure for ${fyName(fyOf(d))}` }; const a = cpihAt(r.y), b = cpihAt(CPIH_BASE); if (!a || !b) return null; const v = r.v * b / a;
      return { v, text: `${this.fmt(v)} in April ${CPIH_BASE} prices (${gbp(r.v)} at the time)`, yr: fyName(r.y) }; } });
  def({ id: "band_d_change", p: "political", group: G7, label: "Band D real change", scale: "interval", nature: "change", temporal: "annual", mid: 0, fmt: fmtPct, levels: CT_LV, nmText: CT_NM, valid: CT_VALID, source: LOC.sources && LOC.sources.bandd,
    how: "Change in real (CPIH-adjusted) Band D over 10 years, %; the card also shows 5 years", desc: "How much council tax rose or fell after inflation",
    get(code, d) { const y = fyOf(d), real = yy => { const v = atYear((LOC.bandd || {})[councilOf(code)], yy), c = cpihAt(yy); return v != null && c ? v / c : null; };
      const now = real(y), b10 = real(y - 10), b5 = real(y - 5); if (now == null || b10 == null) return { v: null, text: now == null ? `No figure for ${fyName(y)}` : `No figure for ${fyName(y - 10)}` };
      const v = 100 * (now / b10 - 1); return { v, text: `${this.fmt(v)} over 10 years${b5 != null ? `, ${this.fmt(100 * (now / b5 - 1))} over 5` : ""}`, yr: `${fyName(y - 10)} to ${fyName(y)}` }; } });
  // political: council composition (1.7), Open Council Data UK
  function compAt(code, d) { const L = (LOC.comp || {})[councilOf(code)]; if (!L) return null; const y = +d.slice(0, 4) - (d.slice(5) < "05-15" ? 1 : 0); let r = null; for (const x of L) if (x[0] <= y) r = x; return r && r[0] >= y - 4 ? r : null; }
  const COMP_VALID = code => nationOf(code) === "N92000002" ? "Not yet for Northern Ireland: the free composition file folds all Northern Irish parties into 'other'" : null;
  const COMP_LV = ["council", "ward"], COMP_NM = { region: "Shown for councils only", nation: "Shown for councils only", country: "Shown for councils only", constituency: "Councils, not constituencies" };
  const compBar = r => { const L = Object.entries(r[2]).sort((a, b) => b[1] - a[1]); return `<div class="compbar">${L.map(([p, n]) => `<i style="width:${(100 * n / r[1]).toFixed(2)}%;background:${partyCol(p)}" title="${esc(partyName(p))}: ${n}"></i>`).join("")}</div><small>${L.slice(0, 6).map(([p, n]) => `${esc(partyName(p))} ${n}`).join(" · ")} (of ${r[1]})</small>`; };
  const compSrc = LOC.sources && LOC.sources.comp, compWhen = r => `after the May ${r[0]} elections`;
  def({ id: "council_seats", p: "political", group: G7, label: "Council seats by party", scale: "nominal", nature: "category", temporal: "state", levels: COMP_LV, nmText: COMP_NM, valid: COMP_VALID, source: compSrc, ...partyCat,
    how: "Seats held by each party shortly after each May's elections; the colour is the largest party ('Other' groups independents and local parties)", desc: "The party make-up of the council",
    get(code, d) { const r = compAt(code, d); if (!r) return null; const L = Object.entries(r[2]).sort((a, b) => b[1] - a[1]); if (!L.length) return null;
      return { v: L[0][0], text: `Largest: ${partyName(L[0][0])}, ${L[0][1]} of ${r[1]} seats`, yr: compWhen(r), counts: r[2], tot: r[1], detail: compBar(r) }; } });
  def({ id: "council_seat_share", p: "political", group: G7, label: "Council seat share (choose party)", scale: "ratio", nature: "share", temporal: "state", fmt: pct1, pick: "party", levels: COMP_LV, nmText: COMP_NM, valid: COMP_VALID, source: compSrc,
    how: "Party's seats ÷ all seats on the council", desc: "One party's share of the council's seats; choose the party in the key",
    get(code, d) { const r = compAt(code, d); if (!r) return null; const p = pickOf("council_seat_share"), n = r[2][p] || 0, v = 100 * n / r[1]; return { v, text: `${pct1(v)} (${n} of ${r[1]} seats, ${partyName(p)})`, yr: compWhen(r) }; } });
  def({ id: "council_majority", p: "political", group: G7, label: "Majority on the council", scale: "interval", nature: "change", temporal: "state", mid: 0, fmt: v => (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(v) + " seats", levels: COMP_LV, nmText: COMP_NM, valid: COMP_VALID, source: compSrc,
    how: "Largest party's seats minus all other seats; negative means no single party has a majority", desc: "How big the largest party's majority is (or how far short it falls)",
    get(code, d) { const r = compAt(code, d); if (!r) return null; const L = Object.entries(r[2]).sort((a, b) => b[1] - a[1]); if (!L.length) return null; const v = L[0][1] - (r[1] - L[0][1]);
      return { v, text: `${this.fmt(v)} (${partyName(L[0][0])})${v <= 0 ? " · no overall control" : ""}`, yr: compWhen(r) }; } });
  def({ id: "council_enp", p: "political", group: G7, label: "Council fragmentation", scale: "ratio", nature: "rate", temporal: "state", fmt: v => v.toFixed(2), breaks: [1.5, 2, 2.5, 3], levels: COMP_LV, nmText: COMP_NM, valid: COMP_VALID, source: compSrc,
    how: "Effective number of parties on seats: 1 ÷ the sum of each party's squared seat share ('Other' counts as one group, so this understates fragmentation where many independents sit)",
    desc: "How many parties effectively share the council",
    get(code, d) { const r = compAt(code, d); if (!r) return null; const v = PSE.enp(Object.values(r[2]).map(n => n / r[1])); return v ? { v, text: this.fmt(v), yr: compWhen(r) } : null; } });
  // political: representation (1.7)
  const G8 = "Representation";
  function regAt(code) { // 2024 constituencies; regions and nations add up their constituencies (England and Wales: adults by seat)
    const R = LOC.reg; if (!R) return null; const lv = P[code].level;
    if (lv === "constituency") { const r = R[code]; return r ? { reg: r[0], adults: r[1], n: 1 } : null; }
    let reg = 0, adults = 0, n = 0; for (const c in R) { const p = P[c]; if (!p || !R[c][1]) continue; if (lv === "region" && p.parent !== code) continue; if (lv === "nation" && p.nation !== code) continue; reg += R[c][0]; adults += R[c][1]; n++; }
    return n ? { reg, adults, n } : null;
  }
  def({ id: "registration_ratio", p: "political", group: G8, label: "Electorate as % of adults", scale: "ratio", nature: "share", temporal: "static", fmt: pct1, breaks: [75, 80, 85, 90],
    levels: ["constituency", "region", "nation"], nmText: { council: "The December 2025 statistics give parliamentary electorates by constituency only", ward: NM_TEXT, country: "England and Wales only: adults aged 18+ by constituency aren't published here for Scotland and Northern Ireland" },
    valid: code => /^(S|N)/.test(nationOf(code) || "") ? "England and Wales only (adults aged 18+ by constituency come from ONS small-area estimates)" : null, source: LOC.sources && LOC.sources.reg,
    how: "Parliamentary electoral registrations (1 December 2025) ÷ residents aged 18+ (mid-2024). This is NOT registration completeness: the parliamentary franchise leaves out most EU and other foreign nationals, so areas with many of them score low. The Electoral Commission's completeness studies are the proper measure",
    desc: "Registered parliamentary electors per 100 adults (2024 constituencies)",
    get(code, d) { const r = regAt(code); if (!r) return null; if (!r.adults) return { v: null, text: "Adults aged 18+ not available here" }; const v = 100 * r.reg / r.adults;
      return { v, text: `${pct1(v)} (${fmtInt(r.reg)} electors, ${fmtInt(r.adults)} adults)`, yr: "Dec 2025 electorate, mid-2024 adults", note: "not a measure of registration completeness" }; } });
  // markets: FTSE 100 companies headquartered in London (test case)
  const COS = MK ? MK.companies : [], GRP_COL = MK ? Object.fromEntries(MK.groups) : {}, G3 = "FTSE 100 in London (test case)";
  COS.forEach((c, i) => { c.i = i; });
  const LONDON_WIDE = new Set(["E12000007", "E92000001", UKC]);
  const cosIn = code => { const l = lvlOf(code); return l === "zone" ? COS.filter(c => c.zone === code) : l === "council" ? COS.filter(c => c.council === code) : LONDON_WIDE.has(code) ? COS : []; };
  function pxAt(c, d) { const ym = d.slice(0, 7); let v = null; for (const p of c.px) { if (p[0] > ym) break; v = p; } return v; }
  function ret12(c, d) { const a = pxAt(c, d); if (!a) return null; const ago = (+d.slice(0, 4) - 1) + d.slice(4, 7); const b = pxAt(c, ago + "-28"); if (!b || b[0] < String(+a[0].slice(0, 4) - 1) + a[0].slice(4) || b[0] === a[0]) return null; return (a[1] / b[1] - 1) * 100; }
  const fmtGBPbig = v => v >= 1e12 ? "£" + (v / 1e12).toFixed(2) + " tn" : v >= 1e9 ? "£" + (v / 1e9).toFixed(1) + " bn" : "£" + Math.round(v / 1e6) + " m";
  if (MK) {
    def({ id: "market_sites", p: "markets", group: G3, label: "Companies (each headquarters)", scale: "nominal", nature: "site", temporal: "static", desc: "Each FTSE 100 headquarters in London as a point: size = market value, colour = sector",
      get(code) { const cs = cosIn(code); return { v: cs.length, text: cs.length ? `${cs.length} FTSE 100 head office${cs.length === 1 ? "" : "s"}` : "No FTSE 100 head offices recorded" }; } });
    def({ id: "market_count", p: "markets", group: G3, label: "FTSE 100 head offices", scale: "ratio", nature: "count", temporal: "static", fmt: v => fmtInt(v) + (v === 1 ? " company" : " companies"), desc: "FTSE 100 companies headquartered in the area (London only in this test)",
      get(code) { const n = cosIn(code).length; return { v: n, text: this.fmt(n) }; } });
    def({ id: "market_value", p: "markets", group: G3, label: "Market value headquartered here", scale: "ratio", nature: "amount", temporal: "static", fmt: fmtGBPbig, desc: "Combined market value of those companies (today, in £)",
      get(code) { const cs = cosIn(code).filter(c => c.capGBP); if (!cs.length) return null; const v = cs.reduce((a, c) => a + c.capGBP, 0); return { v, text: this.fmt(v) }; } });
    def({ id: "market_return", p: "markets", group: G3, label: "Share price change (12 months)", scale: "interval", nature: "change", temporal: "annual", mid: 0, fmt: fmtPct, desc: "Average 12-month share price change of the companies headquartered here (each company counts equally)",
      get(code, d) { const rs = cosIn(code).map(c => ret12(c, d)).filter(v => v != null); if (!rs.length) return null; const v = rs.reduce((a, b) => a + b, 0) / rs.length; return { v, text: `${this.fmt(v)} (average of ${rs.length})` }; } });
    def({ id: "market_sector", p: "markets", group: G3, label: "Main sector", scale: "nominal", nature: "category", temporal: "static", desc: "Sector with the largest market value among head offices here",
      colour: g => GRP_COL[g] || "#999", catName: g => g, cats: () => Object.keys(GRP_COL),
      get(code) { const n = {}; cosIn(code).forEach(c => { n[c.grp] = (n[c.grp] || 0) + (c.capGBP || 1); }); const top = Object.keys(n).sort((a, b) => n[b] - n[a])[0]; return top ? { v: top, text: top, counts: n } : null; } });
  }
  // economic and social: yearly series
  const serMetric = (id, key, o) => def(Object.assign({ id, temporal: "annual", get(code, d) { const r = serAt(key, code, d) || infoAt(key, code); return r ? { v: r.v * (o.mult || 1), text: o.fmt(r.v * (o.mult || 1)), yr: r.yr + (r.latest ? ", latest" : "") } : null; } }, o));
  serMetric("gdp", "gdp", { p: "economic", label: "GDP", scale: "ratio", nature: "amount", mult: 1e6, fmt: fmtGDP, desc: "Gross domestic product, current prices" });
  def({ id: "gdp_per_head", p: "economic", label: "GDP per head", scale: "ratio", nature: "rate", temporal: "annual", weight: "population", fmt: v => "£" + fmtInt(v), desc: "GDP divided by population, current prices",
    get(code, d) { const g = serAt("gdp", code, d); if (!g) return null; const p = serAt("population", code, String(g.yr) + "-07-01"); if (!p || p.yr !== g.yr) return null; const v = g.v * 1e6 / p.v; return { v, text: this.fmt(v), yr: g.yr + (g.latest ? ", latest" : "") }; } });
  def({ id: "gdp_growth", p: "economic", label: "Real GDP growth", scale: "interval", nature: "change", temporal: "annual", mid: 0, fmt: fmtPct, desc: "Change in GDP after inflation, on the year before",
    get(code, d) { const a = serAt("gdp_real", code, d); if (!a) return null; const b = serAt("gdp_real", code, (a.yr - 1) + "-07-01"); if (!b || b.yr !== a.yr - 1) return null; const v = (a.v / b.v - 1) * 100; return { v, text: this.fmt(v), yr: a.yr + (a.latest ? ", latest" : "") }; } });
  serMetric("population", "population", { p: "social", label: "Population", scale: "ratio", nature: "count", fmt: fmtInt, desc: "Mid-year estimate" });
  def({ id: "density", p: "social", label: "Population density", scale: "ratio", nature: "rate", temporal: "annual", fmt: v => fmtInt(v) + " per km²", desc: "People per square kilometre",
    get(code, d) { const a = (INFO[code] || {}).area; const p = popAt(code, d); if (!a || !a[0] || !p) return null; const v = p / a[0]; return { v, text: this.fmt(v) }; } });
  def({ id: "pop_change", p: "social", label: "Population change (10 years)", scale: "interval", nature: "change", temporal: "annual", mid: 0, fmt: fmtPct, desc: "Growth over the 10 years to the date",
    get(code, d) { const a = serAt("population", code, d); if (!a) return null; const b = serAt("population", code, (a.yr - 10) + "-07-01"); if (!b || b.yr !== a.yr - 10) return null; const v = (a.v / b.v - 1) * 100; return { v, text: this.fmt(v), yr: `${b.yr}–${a.yr}` }; } });
  def({ id: "average_age", p: "social", label: "Average age", scale: "ratio", nature: "rate", temporal: "static", fmt: v => v.toFixed(1) + " years", desc: "Mean age (latest year only)",
    get(code) { const x = (INFO[code] || {}).average_age; return x ? { v: x[0], text: x[0].toFixed(1) + " years", yr: x[2] } : null; } });

  const DEF_PS = {
    order: ["political"], on: { political: true },
    mapped: { political: ["control", "protest_events"], economic: ["gdp_per_head"], social: ["population"], markets: ["market_sites", "market_value"] },
    active: Object.fromEntries(METRICS.map(m => [m.id, !["party", "gdp", "density"].includes(m.id)])),
    card: { control: true, protest_events: true }, prefs: {}, pick: {}, biv: { pal: "pt", n: 3 }, step: 1, win: 1826, detail: "detailed", hot: false,
  };
  const PS = (() => {
    const s = store.get("atlas-15-persp", {}), o = JSON.parse(JSON.stringify(DEF_PS));
    ["on", "active", "card", "prefs", "biv", "pick"].forEach(k => Object.assign(o[k], s[k] || {}));
    Object.entries(s.mapped || {}).forEach(([p, v]) => { if (PER[p]) o.mapped[p] = (Array.isArray(v) ? v : [v]).filter(id => M[id]); });
    if (Array.isArray(s.order)) o.order = s.order.filter(p => PER[p]);
    ["step", "win", "detail", "hot", "hatch", "hex"].forEach(k => { if (s[k] != null) o[k] = s[k]; });
    return o;
  })();
  // 0.3.1: a perspective is "on" exactly when something in it is ticked (there is no separate perspective switch any more)
  Object.keys(PS.mapped).forEach(pid => { if (!PS.on[pid]) PS.mapped[pid] = []; PS.on[pid] = PS.mapped[pid].length > 0; });
  const savePS = () => store.set("atlas-15-persp", PS);
  const onPersps = () => PS.order.filter(p => PS.on[p] && PER[p] && PER[p].ready);
  const isMapped = id => { const m = M[id]; return !!(m && PS.on[m.p] && PS.active[id] && (PS.mapped[m.p] || []).includes(id)); };

  // ---------- map ----------
  let key = C.maptilerKey || store.get("atlas-maptiler-key", "");
  const plain = !key && store.get("atlas-uk-plain", false);
  const box = $("keybox");
  $("keyform").addEventListener("submit", e => { e.preventDefault(); const k = $("key").value.trim(); if (!k) return; store.set("atlas-maptiler-key", k); store.set("atlas-uk-plain", false); location.reload(); });
  $("nobase").addEventListener("click", () => { store.set("atlas-uk-plain", true); location.reload(); });
  syncCount();
  if (!key && !plain) { box.hidden = false; return; }
  function osStyle(k) { return JSON.parse(JSON.stringify(OS.style).split("{KEY}").join(encodeURIComponent(k))); }
  function plainStyle() {
    return { version: 8, transition: { duration: 900, delay: 0 }, sources: { land: { type: "geojson", data: G.nations } },
      layers: [{ id: "background", type: "background", paint: { "background-color": "#aad3df" } }, { id: "land", type: "fill", source: "land", paint: { "fill-color": "#f2efe9" } }] };
  }
  const map = new maplibregl.Map({ container: "map", style: key ? osStyle(key) : plainStyle(), center: HOME, zoom: HOME_Z, minZoom: C.minZoom || 4.6, maxZoom: 17,
    dragRotate: false, pitchWithRotate: false, attributionControl: false, preserveDrawingBuffer: true });
  window.atlasMap = map;
  if (/[?&]debug\b/.test(location.search)) window.AtlasDebug = { M, P, METRICS, resultFor, previousFor, get PS() { return PS; }, get state() { return state; }, repaint: () => repaint() };   // for checks only (index.html?debug)
  map.boxZoom.disable(); map.touchZoomRotate.disableRotation();
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
  map.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-right");
  map.addControl(new maplibregl.AttributionControl({ compact: true, customAttribution: "Boundaries and statistics: Office for National Statistics (Open Government Licence v3.0) · Political and protest data: Wikipedia and Wikidata" }), "bottom-right");
  map.on("error", e => {
    const s = String((e && e.error && (e.error.status || e.error.message)) || "");
    if (!/40[13]/.test(s)) console.warn("Map:", s);
    if (/40[13]/.test(s) && !plain) { store.set("atlas-maptiler-key", ""); const err = $("err"); err.textContent = "MapTiler rejected that key. Check it was copied in full and allows pages opened from your computer (see README)."; err.hidden = false; box.hidden = false; }
  });

  // ---------- elastic UK bounds ----------
  const span = () => 2.4 / Math.pow(2, Math.max(0, map.getZoom() - 5));
  const rubber = (x, lo, hi, d) => x < lo ? lo - d * (1 - 1 / ((lo - x) / d + 1)) : x > hi ? hi + d * (1 - 1 / ((x - hi) / d + 1)) : x;
  const outside = c => c.lng < UK[0] || c.lng > UK[2] || c.lat < UK[1] || c.lat > UK[3];
  let raw = null, last = null, bouncing = false;
  map.on("dragstart", () => { const c = map.getCenter(); raw = { lng: c.lng, lat: c.lat }; last = raw; });
  map.on("move", e => {
    if (!raw || !e.originalEvent || bouncing) return;
    const c = map.getCenter();
    raw = { lng: raw.lng + (c.lng - last.lng), lat: raw.lat + (c.lat - last.lat) };
    const d = span(), shown = { lng: rubber(raw.lng, UK[0], UK[2], d * 1.6), lat: rubber(raw.lat, UK[1], UK[3], d) };
    if (Math.abs(shown.lng - c.lng) > 1e-9 || Math.abs(shown.lat - c.lat) > 1e-9) { try { map.transform.center = new maplibregl.LngLat(shown.lng, shown.lat); map.triggerRepaint(); } catch (x) { map.jumpTo({ center: [shown.lng, shown.lat] }); } }
    last = shown;
  });
  const easeBack = t => 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2);
  function bounce() { const c = map.getCenter(); if (!outside(c)) return; bouncing = true; map.stop(); map.easeTo({ center: [clamp(c.lng, UK[0], UK[2]), clamp(c.lat, UK[1], UK[3])], duration: 650, easing: easeBack }); map.once("moveend", () => { bouncing = false; }); }
  map.on("dragend", () => { raw = null; requestAnimationFrame(bounce); });
  map.on("moveend", () => { if (!bouncing && !raw) bounce(); });

  // ---------- look ----------
  const look = Object.assign({ mode: "light", type: "map", thick: 1, cvd: false }, store.get("atlas-uk-look", {}));
  const OVER = {
    light: { line: "#7d6f86", nation: "#6d5a7a", pcon: "#8a6d3b", sel: "#1f2a2e", hover: "#3b5b78", edge: "#1f2a2e" }, dark: { line: "#a497ad", nation: "#c2b3cc", pcon: "#d1b27a", sel: "#f2f4f5", hover: "#9fc2e6", edge: "#f2f4f5" },
    cvdLight: { line: "#555555", nation: "#222222", pcon: "#7a4e00", sel: "#000000", hover: "#0072b2", edge: "#000000" }, cvdDark: { line: "#b8b8b8", nation: "#eeeeee", pcon: "#e69f00", sel: "#ffffff", hover: "#56b4e9", edge: "#ffffff" },
  };
  const paletteKey = () => look.cvd ? (look.mode === "dark" ? "cvdDark" : "cvdLight") : look.mode;
  const origOpacity = {};
  function setP(id, prop, v) { if (!map.getLayer(id)) return; try { map.setPaintProperty(id, prop, v); } catch (e) {} }
  function widthExpr(stops, k) { const e = ["interpolate", ["linear"], ["zoom"]]; stops.forEach(([z, w]) => e.push(z, +(w * k).toFixed(3))); return e; }
  const LINE_STOPS = { "ward-line": [[9.5, 0.4], [14, 1.2]], "constituency-line": [[5, 0.6], [12, 1.6]], "council-line": [[7, 0.5], [12, 1.6]], "region-line": [[5.5, 0.8], [9, 2]], "nation-line": [[4, 1], [9, 2.6]] };
  function applyLook(first) {
    document.documentElement.dataset.mode = look.mode;
    if (key && OS.palettes) { const pal = OS.palettes[paletteKey()]; Object.entries(pal).forEach(([id, props]) => Object.entries(props).forEach(([p, v]) => setP(id, p, v))); }
    const o = OVER[paletteKey()];
    ["ward-line", "council-line", "region-line"].forEach(id => setP(id, "line-color", o.line)); setP("constituency-line", "line-color", o.pcon); setP("nation-line", "line-color", o.nation);
    LEVELS.forEach(l => { setP(l + "-sel", "line-color", o.sel); setP(l + "-fill", "fill-color", o.hover); });
    setP("focus-edge", "line-color", o.edge);
    Object.entries(LINE_STOPS).forEach(([id, st]) => setP(id, "line-width", widthExpr(st, look.thick)));
    LEVELS.forEach(l => setP(l + "-sel", "line-width", ["case", ["boolean", ["feature-state", "sel"], false], 2.8 * Math.max(1, look.thick * .8), ["boolean", ["feature-state", "hover"], false], 2 * Math.max(1, look.thick * .8), 0]));
    if (!plain) { try { applyType(first); } catch (e) {} }
    syncMenu(); store.set("atlas-uk-look", look);
  }
  function rememberOpacity(id, prop) { if (!(id + prop in origOpacity)) { const v = map.getPaintProperty(id, prop); origOpacity[id + prop] = v == null ? 1 : v; } return origOpacity[id + prop]; }
  function applyType() {
    const t = look.type, sat = t === "satellite" || t === "hybrid";
    if (sat) { map.setLayoutProperty("satellite", "visibility", "visible"); setP("satellite", "raster-opacity", 1); }
    else { setP("satellite", "raster-opacity", 0); setTimeout(() => { if (!(look.type === "satellite" || look.type === "hybrid")) try { map.setLayoutProperty("satellite", "visibility", "none"); } catch (e) {} }, 1000); }
    if (t === "terrain") { map.setLayoutProperty("hillshade", "visibility", "visible"); setP("hillshade", "hillshade-exaggeration", 0.5); }
    else { setP("hillshade", "hillshade-exaggeration", 0); setTimeout(() => { if (look.type !== "terrain") try { map.setLayoutProperty("hillshade", "visibility", "none"); } catch (e) {} }, 1000); }
    const roads = OS.groups.roads, labels = OS.groups.labels;
    roads.forEach(id => { const l = map.getLayer(id); if (!l || l.type !== "line") return; const o = rememberOpacity(id, "line-opacity"); setP(id, "line-opacity", t === "satellite" ? 0 : t === "hybrid" ? (typeof o === "number" ? o * 0.85 : o) : o); });
    labels.forEach(id => { if (!map.getLayer(id)) return; const o = rememberOpacity(id, "text-opacity"); setP(id, "text-opacity", t === "satellite" ? 0 : o); });
    if (t === "hybrid") labels.forEach(id => { setP(id, "text-color", "#ffffff"); setP(id, "text-halo-color", "rgba(0,0,0,0.75)"); });
    else if (OS.palettes) { const pal = OS.palettes[paletteKey()]; labels.forEach(id => { const p = pal[id] || {}; if (p["text-color"]) setP(id, "text-color", p["text-color"]); if (p["text-halo-color"]) setP(id, "text-halo-color", p["text-halo-color"]); }); }
    ["contours"].forEach(id => { if (!map.getLayer(id)) return; const o = rememberOpacity(id, "line-opacity"); setP(id, "line-opacity", t === "terrain" ? ["interpolate", ["linear"], ["zoom"], 9, 0.25, 12, 0.6, 14, 0.8] : o); });
  }

  // ---------- geometry helpers ----------
  const polysOf = g => g.type === "Polygon" ? [g.coordinates] : g.coordinates;
  function ringArea(r) { let a = 0; for (let i = 0, j = r.length - 1; i < r.length; j = i++) a += (r[j][0] + r[i][0]) * (r[j][1] - r[i][1]); return Math.abs(a / 2); }
  function repPoint(g) {
    const best = polysOf(g).reduce((b, p) => { const a = ringArea(p[0]); return a > b[0] ? [a, p[0]] : b; }, [-1, null])[1];
    let lo = Infinity, hi = -Infinity; best.forEach(p => { lo = Math.min(lo, p[1]); hi = Math.max(hi, p[1]); });
    const y = (lo + hi) / 2, xs = [];
    for (let i = 0, j = best.length - 1; i < best.length; j = i++) { const a = best[j], b = best[i]; if ((a[1] > y) !== (b[1] > y)) xs.push(a[0] + (y - a[1]) * (b[0] - a[0]) / (b[1] - a[1])); }
    xs.sort((a, b) => a - b); let bx = null, bw = -1;
    for (let k = 0; k + 1 < xs.length; k += 2) if (xs[k + 1] - xs[k] > bw) { bw = xs[k + 1] - xs[k]; bx = (xs[k] + xs[k + 1]) / 2; }
    return bx == null ? best[0] : [bx, y];
  }
  function bboxOfGeom(g) { let b = [180, 90, -180, -90]; polysOf(g).forEach(pl => pl[0].forEach(([x, y]) => { b = [Math.min(b[0], x), Math.min(b[1], y), Math.max(b[2], x), Math.max(b[3], y)]; })); return b; }
  const ptFeature = f => ({ type: "Feature", properties: { code: f.properties.code }, geometry: { type: "Point", coordinates: repPoint(f.geometry) } });
  const R = 6371.0088;
  function haversine(a, b) { const t = Math.PI / 180, dl = (b[1] - a[1]) * t, dn = (b[0] - a[0]) * t; const h = Math.sin(dl / 2) ** 2 + Math.cos(a[1] * t) * Math.cos(b[1] * t) * Math.sin(dn / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); }
  function sphArea(ring) { const t = Math.PI / 180; let s = 0; for (let i = 0; i < ring.length; i++) { const a = ring[i], b = ring[(i + 1) % ring.length]; s += (b[0] - a[0]) * t * (2 + Math.sin(a[1] * t) + Math.sin(b[1] * t)); } return Math.abs(s * R * R / 2); }

  // ---------- colour helpers ----------
  const hex2rgb = h => { h = h.replace("#", ""); if (h.length === 3) h = h.split("").map(c => c + c).join(""); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); };
  const rgb2hex = a => "#" + a.map(x => Math.round(clamp(x, 0, 255)).toString(16).padStart(2, "0")).join("");
  const mix = (a, b, t) => { const A = hex2rgb(a), B = hex2rgb(b); return rgb2hex(A.map((x, i) => x + (B[i] - x) * t)); };
  const shadeOf = (hex, k, n) => { const t = n > 1 ? k / (n - 1) : 0.5; return t < 0.5 ? mix(hex, "#ffffff", (0.5 - t) / 0.5 * 0.8) : mix(hex, "#0d1114", (t - 0.5) / 0.5 * 0.5); };
  const DIV = ["#b2182b", "#ef8a62", "#f2efe9", "#67a9cf", "#2166ac"];
  const BIVP = {
    pt: { name: "Purple – teal", g: [["#e8e8e8", "#ace4e4", "#5ac8c8"], ["#dfb0d6", "#a5add3", "#5698b9"], ["#be64ac", "#8c62aa", "#3b4994"]] },
    br: { name: "Blue – red", g: [["#e8e8e8", "#e4acac", "#c85a5a"], ["#b0d5df", "#ad9ea5", "#985356"], ["#64acbe", "#627f8c", "#574249"]] },
    gp: { name: "Green – pink", g: [["#f3f3f3", "#c2f1ce", "#8be2af"], ["#eac5dd", "#9ec6d3", "#7fc6b1"], ["#e6a3d0", "#bc9fce", "#7b8eaf"]] },
  };
  const BIV_CUSTOM_DEF = ["#f0f0f0", "#4fb3b3", "#c25a9e", "#2d2a6e"];   // corners: both low, across high, up high, both high
  function bivGrid(pal, n) { // rows = second metric's class (low→high), columns = first metric's class
    let c;
    if (pal === "custom") c = (PS.biv.cust || BIV_CUSTOM_DEF).slice(0, 4);
    else { const g = (BIVP[pal] || BIVP.pt).g; if (n === 3) return g; c = [g[0][0], g[0][2], g[2][0], g[2][2]]; }
    const out = [];
    for (let r = 0; r < n; r++) { out.push([]); for (let k = 0; k < n; k++) { const x = k / (n - 1), y = r / (n - 1); out[r].push(mix(mix(c[0], c[1], x), mix(c[2], c[3], x), y)); } }
    return out;
  }
  const textOn = hex => { const [r, g, b] = hex2rgb(hex); return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? "#1f2a2e" : "#ffffff"; };

  // ---------- layers ----------
  const loadedWards = new Set(), wardFeatures = [], wardPoints = [], PT = {};
  let before;
  const pfOpacity = () => ["case", ["boolean", ["feature-state", "dim"], false], 0.07, ["to-boolean", ["coalesce", ["feature-state", "fc"], ""]], fillOp(), 0];
  const DOT_TILE = 36;
  function dotImage(k) { // a white dot with a dark ring: readable over any fill colour
    const s = DOT_TILE, cv = document.createElement("canvas"); cv.width = cv.height = s; const x = cv.getContext("2d");
    const r = [1.8, 3.0, 4.4, 6.0, 7.8][k];  // canvas pixels at pixelRatio 2: dots 1.8 to 7.8 px across on screen, every 18 px
    x.beginPath(); x.arc(s / 2, s / 2, r, 0, Math.PI * 2); x.fillStyle = "#ffffff"; x.fill(); x.lineWidth = 1.8; x.strokeStyle = "#1a2226"; x.stroke();
    return x.getImageData(0, 0, s, s);
  }
  function hatchImage() { // thin diagonal lines: "estimated, not measured"
    const s = 16, cv = document.createElement("canvas"); cv.width = cv.height = s; const x = cv.getContext("2d");
    x.strokeStyle = "rgba(26,34,38,.55)"; x.lineWidth = 1.6; x.beginPath();
    for (let o = -s; o <= s; o += 8) { x.moveTo(o, s); x.lineTo(o + s, 0); } x.stroke();
    return x.getImageData(0, 0, s, s);
  }
  map.on("load", () => {
    before = (map.getStyle().layers.find(l => l.type === "symbol") || {}).id;
    ["nation", "region", "council", "constituency"].forEach(l => {
      const fc = G[SRC[l]] || { type: "FeatureCollection", features: [] };
      map.addSource(SRC[l], { type: "geojson", data: fc, promoteId: "code" });
      const pts = fc.features.map(ptFeature); pts.forEach(f => { PT[f.properties.code] = f.geometry.coordinates; });
      map.addSource("pt-" + l, { type: "geojson", data: { type: "FeatureCollection", features: pts }, promoteId: "code" });
    });
    map.addSource("wards", { type: "geojson", data: { type: "FeatureCollection", features: [] }, promoteId: "code" });
    map.addSource("pt-ward", { type: "geojson", data: { type: "FeatureCollection", features: [] }, promoteId: "code" });
    map.addSource("focus", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    map.addSource("group", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    map.addSource("protests", { type: "geojson", data: protestFeatures() });
    map.addSource("tool", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    map.addSource("grid", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    for (let k = 0; k < 5; k++) map.addImage("dot-" + k, dotImage(k), { pixelRatio: 2 });
    map.addImage("hatch", hatchImage(), { pixelRatio: 2 });
    if (PS.hex) setTimeout(() => syncPcon(true), 0);   // the hex map was on last time
    LEVELS.forEach(l => {
      const range = { minzoom: VIS[l][0], maxzoom: VIS[l][1] };
      map.addLayer(Object.assign({ id: "pf-" + l, type: "fill", source: SRC[l], paint: { "fill-color": ["to-color", ["coalesce", ["feature-state", "fc"], "#000000"], "#000000"], "fill-opacity": pfOpacity() } }, range), before);
      for (let k = 0; k < 5; k++) map.addLayer(Object.assign({ id: `pdt-${l}-${k}`, type: "fill", source: SRC[l], paint: { "fill-pattern": "dot-" + k,
        "fill-opacity": ["case", ["boolean", ["feature-state", "dim"], false], 0, ["==", ["coalesce", ["feature-state", "dt"], -1], k], 1, 0] } }, range), before);
      map.addLayer(Object.assign({ id: "pes-" + l, type: "fill", source: SRC[l], paint: { "fill-pattern": "hatch",
        "fill-opacity": ["case", ["boolean", ["feature-state", "dim"], false], 0, ["boolean", ["feature-state", "est"], false], 0.9, 0] } }, range), before);
    });
    LEVELS.forEach(l => map.addLayer({ id: l + "-fill", type: "fill", source: SRC[l], minzoom: VIS[l][0], maxzoom: VIS[l][1],
      paint: { "fill-color": "#3b5b78", "fill-opacity": ["case", ["boolean", ["feature-state", "sel"], false], 0.18, ["boolean", ["feature-state", "hover"], false], 0.14, 0], "fill-opacity-transition": { duration: 250 } } }, before));
    map.addLayer({ id: "grid-line", type: "line", source: "grid", paint: { "line-color": "#1f2a2e", "line-opacity": 0.28, "line-width": ["case", ["==", ["get", "major"], 1], 1, 0.5] } }, before);
    map.addLayer({ id: "ward-line", type: "line", source: "wards", minzoom: Z.ward - 0.3, paint: { "line-color": "#8a7d92", "line-width": 1, "line-opacity": ["interpolate", ["linear"], ["zoom"], Z.ward - 0.3, 0, Z.ward, 0.7], "line-dasharray": [2, 1.5] } }, before);
    map.addLayer({ id: "council-line", type: "line", source: "councils", minzoom: Z.council - 0.3, paint: { "line-color": "#7d6f86", "line-width": 1, "line-opacity": ["interpolate", ["linear"], ["zoom"], Z.council - 0.3, 0, Z.council, 0.8] } }, before);
    map.addLayer({ id: "constituency-line", type: "line", source: "constituencies", layout: { visibility: "none" }, paint: { "line-color": "#8a6d3b", "line-width": 1, "line-opacity": 0.85, "line-dasharray": [4, 2] } }, before);
    map.addLayer({ id: "region-line", type: "line", source: "regions", minzoom: Z.region - 0.3, paint: { "line-color": "#7d6f86", "line-width": 1, "line-opacity": 0.85, "line-dasharray": [3, 1.5] } }, before);
    map.addLayer({ id: "nation-line", type: "line", source: "nations", paint: { "line-color": "#6d5a7a", "line-width": 1, "line-opacity": 0.9 } }, before);
    LEVELS.forEach(l => map.addLayer({ id: l + "-sel", type: "line", source: SRC[l], paint: { "line-color": "#1f2a2e", "line-width": 0 } }, before));
    LEVELS.forEach(l => {
      const range = { minzoom: VIS[l][0], maxzoom: VIS[l][1] };
      map.addLayer(Object.assign({ id: "pd-" + l, type: "circle", source: "pt-" + l, paint: { "circle-radius": ["coalesce", ["feature-state", "dr"], 0], "circle-color": ["coalesce", ["feature-state", "dc"], "#a07a12"],
        "circle-opacity": ["case", ["boolean", ["feature-state", "dim"], false], 0.1, 0.55], "circle-stroke-color": "#ffffff", "circle-stroke-width": ["case", [">", ["coalesce", ["feature-state", "dr"], 0], 0], 1.2, 0] } }, range), before);
      map.addLayer(Object.assign({ id: "pb-" + l, type: "circle", source: "pt-" + l, paint: { "circle-radius": ["coalesce", ["feature-state", "br"], 0], "circle-color": ["coalesce", ["feature-state", "bc"], "#000"],
        "circle-opacity": ["case", ["boolean", ["feature-state", "dim"], false], 0.15, 1], "circle-stroke-color": "#1a2226", "circle-stroke-width": ["case", [">", ["coalesce", ["feature-state", "br"], 0], 0], 1.6, 0] } }, range), before);
    });
    map.addLayer({ id: "pr-heat", type: "heatmap", source: "protests", layout: { visibility: "none" }, paint: {
      "heatmap-weight": ["interpolate", ["linear"], ["get", "lw"], 0, 0.15, 6, 1], "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 4, 0.8, 10, 2.2], "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 4, 14, 10, 40],
      "heatmap-color": ["interpolate", ["linear"], ["heatmap-density"], 0, "rgba(91,58,140,0)", 0.2, "#d2bde6", 0.45, "#ad8fd0", 0.7, "#8560b5", 1, "#3b1f63"], "heatmap-opacity": 0.85 } });
    map.addLayer({ id: "pr-pts", type: "circle", source: "protests", layout: { visibility: "none", "circle-sort-key": ["-", 0, ["get", "r"]] }, paint: {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, ["*", ["get", "r"], 0.85], 10, ["*", ["get", "r"], 1.5]], "circle-color": ["get", "fill"], "circle-stroke-color": ["get", "stroke"], "circle-stroke-width": 1.6, "circle-opacity": 0.9, "circle-stroke-opacity": 0.95 } });
    map.addLayer({ id: "pr-new", type: "circle", source: "protests", layout: { visibility: "none" }, paint: {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, ["+", 5, ["*", ["get", "r"], 0.85]], 10, ["+", 5, ["*", ["get", "r"], 1.5]]], "circle-color": "rgba(0,0,0,0)", "circle-stroke-color": ["get", "col"], "circle-stroke-width": 2, "circle-stroke-opacity": 0.8 } });
    if (MK) {
      map.addSource("zones", { type: "geojson", data: MK.zones, promoteId: "code" });
      map.addSource("zone-pts", { type: "geojson", data: { type: "FeatureCollection", features: ZONES.map(ptFeature) } });
      map.addSource("cos", { type: "geojson", data: { type: "FeatureCollection", features: COS.filter(c => c.lat != null).map(c => ({ type: "Feature", geometry: { type: "Point", coordinates: [c.lon, c.lat] },
        properties: { i: c.i, g: Object.keys(GRP_COL).indexOf(c.grp), r: c.capGBP ? clamp(3 + 2.2 * Math.sqrt(c.capGBP / 1e9), 3.5, 20) : 3.5 } })) } });
      // companies are squares (protests are circles), one image per sector colour
      Object.values(GRP_COL).forEach((col, k) => { const S = 40, cv = document.createElement("canvas"); cv.width = cv.height = S; const x = cv.getContext("2d");
        x.fillStyle = col; x.strokeStyle = "#ffffff"; x.lineWidth = 4; x.beginPath(); x.roundRect ? x.roundRect(4, 4, S - 8, S - 8, 6) : x.rect(4, 4, S - 8, S - 8); x.fill(); x.stroke();
        map.addImage("co-" + k, x.getImageData(0, 0, S, S), { pixelRatio: 2 }); });
      map.addLayer({ id: "zone-fill", type: "fill", source: "zones", minzoom: ZONE_Z, paint: { "fill-color": "#c9a227",
        "fill-opacity": ["case", ["boolean", ["feature-state", "sel"], false], 0.32, ["boolean", ["feature-state", "hover"], false], 0.26, 0.1] } });
      map.addLayer({ id: "zone-line", type: "line", source: "zones", minzoom: ZONE_Z - 0.4, paint: { "line-color": "#a07a12", "line-width": ["interpolate", ["linear"], ["zoom"], ZONE_Z, 1.2, 14, 2.6], "line-dasharray": [3, 2], "line-opacity": ["interpolate", ["linear"], ["zoom"], ZONE_Z - 0.4, 0, ZONE_Z, 0.9] } });
      map.addLayer({ id: "zone-dot", type: "circle", source: "zone-pts", minzoom: 7.5, maxzoom: ZONE_Z, paint: { "circle-radius": 5, "circle-color": "#c9a227", "circle-stroke-color": "#ffffff", "circle-stroke-width": 1.5, "circle-opacity": 0.9 } });
      map.addLayer({ id: "co-pts", type: "symbol", source: "cos", minzoom: 9, layout: { visibility: "none", "symbol-sort-key": ["-", 0, ["get", "r"]], "icon-image": ["concat", "co-", ["to-string", ["get", "g"]]],
        "icon-size": ["interpolate", ["linear"], ["zoom"], 9, ["/", ["get", "r"], 14], 13, ["/", ["get", "r"], 7]], "icon-allow-overlap": true, "icon-ignore-placement": true }, paint: { "icon-opacity": 0.92 } });
    }
    map.addLayer({ id: "focus-shadow", type: "line", source: "focus", paint: { "line-color": "rgba(10,20,25,0.42)", "line-width": 10, "line-blur": 9, "line-translate": [6, 9], "line-translate-anchor": "viewport", "line-opacity": 0, "line-opacity-transition": { duration: 350 } } });
    map.addLayer({ id: "focus-lift", type: "fill", source: "focus", paint: { "fill-color": "#ffffff", "fill-opacity": 0, "fill-translate": [0, 0], "fill-translate-anchor": "viewport", "fill-translate-transition": { duration: 380 }, "fill-opacity-transition": { duration: 300 } } }, "pr-heat");
    map.addLayer({ id: "focus-edge", type: "line", source: "focus", paint: { "line-color": "#1f2a2e", "line-width": 2.4, "line-translate": [0, 0], "line-translate-anchor": "viewport", "line-translate-transition": { duration: 380 }, "line-opacity": 0, "line-opacity-transition": { duration: 300 } } }, "pr-heat");
    map.moveLayer("focus-shadow", "focus-lift");
    map.addLayer({ id: "group-fill", type: "fill", source: "group", paint: { "fill-color": "#3b78b5", "fill-opacity": 0.1 } });
    map.addLayer({ id: "group-edge", type: "line", source: "group", paint: { "line-color": "#1f2a2e", "line-width": 2.4, "line-opacity": 0.9 } });
    map.addLayer({ id: "tool-fill", type: "fill", source: "tool", filter: ["==", ["geometry-type"], "Polygon"], paint: { "fill-color": "#3b78b5", "fill-opacity": 0.12 } });
    map.addLayer({ id: "tool-line", type: "line", source: "tool", filter: ["!=", ["geometry-type"], "Point"], paint: { "line-color": "#1f2a2e", "line-width": 2, "line-dasharray": [2, 1.5] } });
    map.addLayer({ id: "tool-pts", type: "circle", source: "tool", filter: ["==", ["geometry-type"], "Point"], paint: { "circle-radius": 4, "circle-color": "#ffffff", "circle-stroke-color": "#1f2a2e", "circle-stroke-width": 2 } });
    applyLook(true); applyLevels(); applyTools();
    const at = document.querySelector(".maplibregl-ctrl-attrib"); if (at) at.classList.remove("maplibregl-compact-show"); // credits folded into the ⓘ button
    map.on("moveend", loadVisibleWards);
    repaint();
  });
  window.ATLAS_WARDS_LOADED = function (council, fc) {
    if (loadedWards.has(council + ":done")) return; loadedWards.add(council + ":done");
    const pts = fc.features.map(ptFeature); pts.forEach(f => { PT[f.properties.code] = f.geometry.coordinates; });
    wardFeatures.push(...fc.features); wardPoints.push(...pts);
    map.getSource("wards").setData({ type: "FeatureCollection", features: wardFeatures });
    map.getSource("pt-ward").setData({ type: "FeatureCollection", features: wardPoints });
    map.once("idle", () => { state.sel.forEach(t => t.level === "ward" && setFS(t, { sel: true })); paintLevel("ward"); });
  };
  // ---------- constituencies over time ----------
  // The constituency layer shows the boundaries in force on the date: 2024 seats from 4 July 2024; the 2010 set from 2010
  // (Scotland's from 2005); the 1997 set before that. Older sets load the first time they're needed. Before 1997: none.
  const PSETS = { "2024": G.constituencies }, pconLoading = new Set();
  let pconSig = "2024";
  const PCON_FROM = "1997-05-01";
  const pconSigAt = d => d >= "2024-07-04" ? "2024" : d >= "2010-05-06" ? "2010" : d >= "2005-05-05" ? "1997+2005" : d >= PCON_FROM ? "1997" : "none";
  const PCON_NEED = { "2024": [], "2010": ["2010"], "1997+2005": ["1997", "2010"], "1997": ["1997"], none: [] };
  const activeAt = (c, d) => { const p = P[c]; return !!p && (!p.from || p.from <= d) && (!p.to || d < p.to); };
  const pconInUse = () => state.level === "constituency" || (!LV.auto && LV.on.includes("constituency"));
  window.ATLAS_PCON_SET = function (key, data) {
    pconLoading.delete(key); Object.assign(P, data.places); PSETS[key] = data.geo;
    Object.entries(data.places).forEach(([c, p]) => { if (p.pt) PT[c] = p.pt; });
    syncPcon(true);
  };
  function syncPcon(force) {
    if (!map.getSource || !map.getSource("constituencies")) return;
    const sig = pconSigAt(state.date); if (sig === pconSig && !force) return;
    if (sig !== "2024" && !pconInUse()) return; // not on screen: switch later, when the layer is used
    const need = PCON_NEED[sig], missing = need.filter(k => !PSETS[k]);
    if (missing.length) { missing.forEach(k => { if (pconLoading.has(k)) return; pconLoading.add(k); const sc = document.createElement("script"); sc.src = `data/constituencies_${k}.js`; sc.onerror = () => { pconLoading.delete(k); toast("Couldn't load the older constituency boundaries."); }; document.body.appendChild(sc); }); toast("Loading the constituency boundaries for that date…"); return; }
    const real = sig === "2024" ? PSETS["2024"].features : need.flatMap(k => PSETS[k].features).filter(f => activeAt(f.properties.code, state.date));
    // 1.7: hex map (equal area): the same seats and codes as hexagons, from data/hex_constituencies.js (2024 and 2010 sets only)
    const HX = window.ATLAS_HEX, hexOn = !!PS.hex && HX && HX[sig === "2010" ? "2010" : sig];
    if (PS.hex && !hexOn && !syncPcon.warned) { syncPcon.warned = true; toast("There's no hex map for the 1997 boundaries: showing the real ones."); }
    const feats = hexOn ? HX[sig === "2010" ? "2010" : sig].features.filter(f => activeAt(f.properties.code, state.date)) : real;
    G.pconReal = { type: "FeatureCollection", features: real }; G.constituencies = { type: "FeatureCollection", features: feats }; pconSig = sig;
    document.body.classList.toggle("hexmode", !!hexOn);
    map.getSource("constituencies").setData(G.constituencies);
    map.getSource("pt-constituency").setData({ type: "FeatureCollection", features: feats.map(f => ({ type: "Feature", properties: { code: f.properties.code }, geometry: { type: "Point", coordinates: hexOn ? f.properties.pt : PT[f.properties.code] || repPoint(f.geometry) } })) });
    for (const k in paCache) delete paCache[k]; for (const k in qCache) delete qCache[k];
    // anything picked on the old boundaries goes
    const gone = c => P[c] && P[c].level === "constituency" && !activeAt(c, state.date);
    if (state.focus && gone(state.focus)) unfocus();
    if (state.sel.some(x => gone(x.code))) { state.sel = state.sel.filter(x => !gone(x.code)); renderTray(); }
    if (GROUP && GROUP.codes.some(gone)) clearGroup();
    map.once("idle", () => { paintLevel("constituency"); renderLegend(); });
  }
  function loadWards(c) { if (loadedWards.has(c)) return; loadedWards.add(c); const s = document.createElement("script"); s.src = "data/wards/" + c + ".js"; s.onerror = () => loadedWards.delete(c); document.body.appendChild(s); }
  function loadVisibleWards() {
    const manual = !LV.auto && (LV.on.includes("ward"));
    if (!manual && map.getZoom() < Z.ward - 1) return;
    const b = map.getBounds(), seen = new Set();
    Object.entries(P).forEach(([c, p]) => { if (p.level === "council" && p.pt && b.contains(p.pt)) seen.add(c); });
    map.queryRenderedFeatures({ layers: ["council-fill"] }).forEach(f => seen.add(f.properties.code));
    if (seen.size <= 45 || manual) seen.forEach(loadWards);
  }
  function featureOf(code) { const p = P[code]; if (!p) return null; if (p.level === "zone") return ZONES.find(f => f.properties.code === code); if (p.level === "ward") return wardFeatures.find(x => x.properties.code === code); const src = p.level === "country" ? null : G[SRC[p.level]]; return src ? src.features.find(x => x.properties.code === code) : null; }

  // ---------- protests on the map ----------
  function protestFeatures() {
    return { type: "FeatureCollection", features: PR.sites.map((s, i) => {
      const e = PR.events[s[0]], col = CAUSE_COL[CAUSES[e.c]] || "#999", r = e.mid ? clamp(3 + 3.1 * Math.log10(e.mid / e.ns / 100 + 1), 3, 15) : 3.4;
      return { type: "Feature", geometry: { type: "Point", coordinates: [s[2], s[1]] }, properties: { i, e: s[0], t: e.t0, t1: e.end, col, fill: col, stroke: e.mid ? "#ffffff" : "#1a2226", r, lw: e.mid ? Math.log10(e.mid / e.ns + 1) : 0.5 } };
    }) };
  }
  function syncCompanyLayer() { if (map.getLayer("co-pts")) map.setLayoutProperty("co-pts", "visibility", curPlan.sites ? "visible" : "none"); }
  function syncProtestLayer() {
    if (!map.getLayer("pr-pts")) return;
    const on = curPlan.points || curPlan.heat, mode = curPlan.heat ? "heat" : "points";
    const D = dayNum(state.date), W = PS.win, lo = D - W;
    const filter = ["all", ["<=", ["get", "t"], D], [">", ["get", "t1"], lo]];
    ["pr-pts", "pr-new", "pr-heat"].forEach(id => map.setFilter(id, filter));
    map.setFilter("pr-new", ["all", ["<=", ["get", "t"], D], [">", ["get", "t"], D - Math.max(60, W * 0.12)]]);
    const age = ["interpolate", ["linear"], ["-", D, ["get", "t"]], 0, 0.95, W, 0.3];
    setP("pr-pts", "circle-opacity", age); setP("pr-pts", "circle-stroke-opacity", age);
    map.setLayoutProperty("pr-pts", "visibility", on && mode === "points" ? "visible" : "none");
    map.setLayoutProperty("pr-new", "visibility", on && mode === "points" ? "visible" : "none");
    map.setLayoutProperty("pr-heat", "visibility", on && mode === "heat" ? "visible" : "none");
  }

  // ---------- painting the plan ----------
  const codesAt = level => level === "ward" ? wardFeatures.map(f => f.properties.code) : G[SRC[level]].features.map(f => f.properties.code);
  const allCodesAt = level => Object.keys(P).filter(c => P[c].level === level && (level !== "constituency" || activeAt(c, state.date)));
  const qCache = {};
  function breaksFor(m, level, k) {
    // time-varying metrics are classified over every year (sampled), so a colour means the same on every date
    const pooled = m.temporal === "annual" || m.temporal === "event" || m.temporal === "election";
    const ck = [m.id, level, k, pooled ? "" : state.date, m.temporal === "event" ? PS.win : ""].join("|");
    if (qCache[ck]) return qCache[ck];
    const codes = allCodesAt(level === "nation" ? "nation" : level);
    let dates = [state.date];
    if (m.temporal === "annual") dates = SY.filter((y, i) => i % 2 === 0 || y === SY[SY.length - 1]).map(y => y + "-07-01");
    if (m.temporal === "event") { dates = []; for (let y = 1976; y <= +TODAY.slice(0, 4); y += 3) dates.push(y + "-12-31"); }
    if (m.temporal === "election") dates = level === "constituency" ? [state.date] : GE_DAYS.map(x => addDays(x, 1));   // seats: the set on screen; areas: every general election
    const vals = []; dates.forEach(d => codes.forEach(c => { const r = m.get(c, d); if (r && r.v != null && (m.nature !== "count" || r.v > 0)) vals.push(r.v); }));
    const res = EN.classify(m, vals, k); if (pooled && res.method !== "fixed") res.why += " Classes are fixed across all years, so colours compare through time.";
    return (qCache[ck] = res);
  }
  const LAST = { fc: {}, k: {}, present: {}, presentB: {} };
  const NODATA = "#b9bcbd";
  const noDataKey = level => (LAST.present[level] && LAST.present[level].has("__nd") ? `<div class="ndkey"><span ${isoAttr("nd", 1)}><i class="sw" style="background:${NODATA}"></i>No data</span></div>` : "") +
    (LAST.present[level] && LAST.present[level].has("__nm") ? `<div class="ndkey"><span><i class="sw" style="background:transparent;border:1px dashed var(--ink-3)"></i>Unfilled: not meaningful at this level</span></div>` : "") +
    (LAST.present[level] && LAST.present[level].has("__est") ? `<div class="ndkey"><span><i class="sw hatchsw"></i>Hatched: estimated (e.g. notional results on new boundaries)</span></div>` : "");
  let curPlan = { notes: [] };
  function planMetrics() { return onPersps().flatMap(p => (PS.mapped[p] || []).filter(id => M[id] && PS.active[id] && M[id].nature !== "text").map(id => M[id])); }
  function isoMatch(iso, k) {
    switch (iso.ch) {
      case "hue": return k.hue === iso.v; case "vbl": return k.hue === iso.v[0] && k.sh === iso.v[1];
      case "shade": return k.sh === iso.v; case "grid": return k.gr === iso.v[0] && k.sh === iso.v[1];
      case "diverge": return k.dv === iso.v; case "dots": return k.dt === iso.v; case "badge": return k.bg === iso.v; case "nd": return !!k.nd; default: return true;
    }
  }
  function paintLevel(level) {
    if (!map.getSource(SRC[level])) return;
    const PL = curPlan, d = state.date, codes = codesAt(level), nb = PS.biv.n;
    const br = (m, k) => m ? breaksFor(m, level, k).breaks : null;
    const shB = br(PL.shade, PL.grid ? nb : 5), grB = br(PL.grid, nb), dvB = br(PL.diverge, 5), dtB = br(PL.dots, 5);
    const grid = PL.grid ? bivGrid(PS.biv.pal, nb) : null;
    const memo = new Map(), rOf = (m, c) => { const k = m.id + "|" + c; if (!memo.has(k)) memo.set(k, m.get(c, d)); return memo.get(k); };
    const val = (m, c) => { if (!m) return null; const r = rOf(m, c); return r && r.v != null ? r.v : null; };
    const fillMs = [PL.hue, PL.shade, PL.grid, PL.diverge].filter(Boolean), hatch = PS.hatch !== false;
    let smax = 0; const sv = PL.size ? codes.map(c => { const v = val(PL.size, c); if (v > smax) smax = v; return v; }) : null;
    const present = new Set(), presentB = new Set(), isoS = state.iso;
    codes.forEach((c, i) => {
      const hv = val(PL.hue, c), shv = val(PL.shade, c), grv = val(PL.grid, c), dvv = val(PL.diverge, c), dtv = val(PL.dots, c), bgv = val(PL.badge, c);
      const k = { hue: hv, bg: bgv, sh: shv != null ? EN.classOf(shv, shB) : null, gr: grv != null ? EN.classOf(grv, grB) : null, dv: dvv != null ? EN.classOf(dvv, dvB) : null, dt: dtv != null && (PL.dots.nature !== "count" || dtv > 0) ? EN.classOf(dtv, dtB) : null };
      let fc = "";
      const fills = !!(PL.hue || PL.grid || PL.shade || PL.diverge);
      if (PL.hue) { if (hv != null) { present.add(hv); const b = PL.hue.colour(hv); fc = PL.shade ? (k.sh != null ? shadeOf(b, k.sh, 5) : mix(b, "#ffffff", 0.88)) : b; } }
      else if (PL.grid) { if (k.sh != null && k.gr != null) fc = grid[k.gr][k.sh]; }
      else if (PL.shade) { if (k.sh != null) fc = PER[PL.shade.p].ramp[k.sh]; }
      else if (PL.diverge) { if (k.dv != null) fc = DIV[k.dv]; }
      const nm = fills && fillMs.every(m => { const r = rOf(m, c); return r && r.nm; });   // not meaningful here: leave it unfilled, not "no data"
      if (nm) present.add("__nm");
      else if (fills && !fc) { fc = NODATA; k.nd = true; present.add("__nd"); }   // a fill layer is on but this area has no value: grey, "No data"
      if (bgv != null) presentB.add(bgv);
      const dim = !!isoS && !isoMatch(isoS, k);
      LAST.fc[c] = fc; LAST.k[c] = k;
      const est = hatch && !!fc && fc !== NODATA && fillMs.some(m => { const r = rOf(m, c); return r && r.est; }); if (est) present.add("__est");
      try { map.setFeatureState({ source: SRC[level], id: c }, { fc, dt: k.dt == null ? -1 : k.dt, dim, est }); } catch (e) {}
      if (map.getSource("pt-" + level)) {
        const v = sv && sv[i];
        try { map.setFeatureState({ source: "pt-" + level, id: c }, { dr: v != null && v > 0 && smax > 0 ? 3 + 19 * Math.sqrt(v / smax) : 0, dc: PL.size ? PER[PL.size.p].hue : "#000", br: bgv != null ? 5.5 : 0, bc: bgv != null ? PL.badge.colour(bgv) : "#000", dim }); } catch (e) {}
      }
    });
    LAST.present[level] = present; LAST.presentB[level] = presentB;
  }
  function repaint() {
    curPlan = EN.plan(planMetrics(), PS.prefs);
    if (state.iso && state.iso.ch !== "nd" && !curPlan[state.iso.ch === "vbl" ? "hue" : state.iso.ch]) state.iso = null;
    if (map.getSource && map.getSource("councils")) { LEVELS.forEach(paintLevel); syncProtestLayer(); syncCompanyLayer(); }
    renderLegend(); renderDock(); renderSup(); renderTNote(); syncFocusColour();
    if (pmOpen) renderPMenu();
    if (state.focus) { renderMind(); refreshPinned(); }
    renderTray(); if (!$("cmp").hidden) renderCmp();
    refreshGroupCards(); savePS();
  }

  // ---------- legend ----------
  const legend = $("legend");
  const CH_NAME = { hue: "colour", shade: "lightness", grid: "colour grid", diverge: "two-sided colour", badge: "centre marker", dots: "dots", size: "circles", points: "points", heat: "heat", sites: "points" };
  function chooser(m) { const chs = EN.channels(m).map(c => c.ch); const cur = Object.keys(CH_NAME).find(ch => curPlan[ch] === m); return chs.length > 1 ? `<select class="as" data-as="${m.id}" aria-label="Show ${esc(m.label)} as">${chs.map(ch => `<option value="${ch}" ${ch === cur ? "selected" : ""}>${CH_NAME[ch]}</option>`).join("")}</select>` : `<small>${CH_NAME[cur] || ""}</small>`; }
  function picker(m) {
    if (m.pick === "party") { const r = resultFor(UKC, state.date) || resultFor(UKC, TODAY); const ps = r ? r.t.list.filter(x => !MINOR(x[0])).slice(0, 14).map(x => x[0]) : ["lab", "con"]; const cur = pickOf(m.id); if (!ps.includes(cur)) ps.unshift(cur);
      return `<select class="as" data-pick="${m.id}" aria-label="Party">${ps.map(p => `<option value="${p}" ${p === cur ? "selected" : ""}>${esc(partyName(p))}</option>`).join("")}</select>`; }
    if (m.pick === "pair") { const cur = pickOf(m.id); return `<select class="as" data-pick="${m.id}" aria-label="Pair of parties">${PAIRS.map(([k, l]) => `<option value="${k}" ${k === cur ? "selected" : ""}>${esc(l)}</option>`).join("")}</select>`; }
    return "";
  }
  const lhead = (m, extra) => `<h5 style="--c:${PER[m.p].hue}">${svgIcon(m.p)}<span>${esc(m.label)}</span>${picker(m)}${chooser(m)}${extra || ""}<button class="lrm" data-lrm="${m.id}" title="Take ${esc(m.label)} off the map" aria-label="Remove ${esc(m.label)}">×</button></h5>`;
  const isoAttr = (ch, v) => { const on = state.iso && state.iso.ch === ch && JSON.stringify(state.iso.v) === JSON.stringify(v); return `data-iso='${esc(JSON.stringify({ ch, v }))}' class="iso${on ? " on" : ""}"`; };
  function ticks(m, level, n) {
    const b = breaksFor(m, level, n); const f = m.fmt || String;
    const compact = v => { const pre = String(f(v)).startsWith("£") ? "£" : "", a = Math.abs(v); return pre + (a >= 1e9 ? (v / 1e9).toFixed(1) + "bn" : a >= 1e6 ? (v / 1e6).toFixed(1) + "m" : a >= 1e4 ? Math.round(v / 1e3) + "k" : a >= 1e3 ? (v / 1e3).toFixed(1) + "k" : null); };
    const s = v => (Math.abs(v) >= 1e3 && compact(v)) || String(f(v)).replace(/ years?$/, "y").replace(/ changes?$/, "").replace(/ per km²$/, "").replace(/ protests?$/, "").replace(/ per 100k$/, "").replace(/ million$/, "m");
    return `<div class="ticks"><span>low</span>${b.breaks.map(v => `<span>${esc(s(v))}</span>`).join("")}<span>high</span></div>`;
  }
  const mpNote = m => m.id === "control" && CONTROL_HOW[state.level] ? `<div class="note" style="margin:-2px 0 4px">${esc(PLURAL_L[state.level] || "Areas")} show ${esc(CONTROL_HOW[state.level])}.</div>` : "";
  const PLURAL_L = { nation: "Nations", region: "Regions", council: "Councils", constituency: "Constituencies", ward: "Wards" };
  function renderLegend() {
    const PL = curPlan, level = state.level, parts = [];
    const cats = (m, set) => [...(set || [])].filter(x => x !== "__nd" && x !== "__est" && x !== "__nm").sort((a, b) => m.cats().indexOf(a) - m.cats().indexOf(b));
    if (PL.hue && PL.shade) {
      const ks = cats(PL.hue, LAST.present[level]).slice(0, 9);
      parts.push(`<div class="lg">${lhead(PL.hue)}${lhead(PL.shade)}<div class="vbl"><div class="vbl-ax"><span>${esc(PL.shade.label)}: low</span><span>high →</span></div>
        ${ks.map(k => `<div class="vbl-row"><span class="vbl-n" title="${esc(PL.hue.catName(k))}">${esc(PL.hue.catName(k))}</span>${[0, 1, 2, 3, 4].map(i => `<i ${isoAttr("vbl", [k, i])} style="background:${shadeOf(PL.hue.colour(k), i, 5)}"></i>`).join("")}</div>`).join("")}
        ${ticks(PL.shade, level, 5)}<div class="note">Colour = ${esc(PL.hue.label.toLowerCase())}; lighter or darker = ${esc(PL.shade.label.toLowerCase())}. Click a square to show only those areas.</div></div></div>`);
    } else if (PL.hue) {
      const ks = cats(PL.hue, LAST.present[level]);
      parts.push(`<div class="lg">${lhead(PL.hue)}${mpNote(PL.hue)}<div class="cats2">${ks.map(k => `<span ${isoAttr("hue", k)}><i class="sw" style="background:${PL.hue.colour(k)}"></i>${esc(PL.hue.catName(k))}</span>`).join("") || `<span style="color:var(--ink-3)">No records at this date</span>`}</div></div>`);
    }
    if (PL.grid && PL.shade) {
      const n = PS.biv.n, g = bivGrid(PS.biv.pal, n), bx = breaksFor(PL.shade, level, n), by = breaksFor(PL.grid, level, n);
      parts.push(`<div class="lg">${lhead(PL.shade)}${lhead(PL.grid)}<div class="biv"><div class="biv-wrap"><span class="biv-y">${esc(PL.grid.label)} →</span>
        <div class="grid" style="grid-template-columns:repeat(${n},18px)">${[...Array(n).keys()].reverse().map(r => [...Array(n).keys()].map(c => `<i ${isoAttr("grid", [r, c])} style="background:${g[r][c]}" title="${esc(bivWords(c, r, n, PL.shade, PL.grid))}"></i>`).join("")).join("")}</div>
        <span class="biv-x">${esc(PL.shade.label)} →</span></div>
        <div class="biv-side"><label>Colours <select data-bivpal>${Object.entries(BIVP).map(([k, v]) => `<option value="${k}" ${k === PS.biv.pal ? "selected" : ""}>${v.name}</option>`).join("")}<option value="custom" ${PS.biv.pal === "custom" ? "selected" : ""}>Your own colours…</option></select></label>
        ${PS.biv.pal === "custom" ? `<div class="biv-cust">${["Both low", `${esc(PL.shade.label)} high`, `${esc(PL.grid.label)} high`, "Both high"].map((l, i) => `<label title="${l}"><input type="color" data-bivc="${i}" value="${(PS.biv.cust || BIV_CUSTOM_DEF)[i]}"><span>${l}</span></label>`).join("")}</div>` : ""}
        <label>Grid <select data-bivn><option value="3" ${n === 3 ? "selected" : ""}>3 × 3</option><option value="4" ${n === 4 ? "selected" : ""}>4 × 4</option></select></label>
        <button class="btn sm" data-bivswap title="Put ${esc(PL.grid.label)} across and ${esc(PL.shade.label)} up">Swap axes</button>
        <span class="note">Corner colours: both low (light), both high (dark). Hover or click a square.</span></div></div></div>`);
    } else if (PL.shade && !PL.hue) parts.push(`<div class="lg">${lhead(PL.shade)}<div class="ramp">${PER[PL.shade.p].ramp.map((c, i) => `<i ${isoAttr("shade", i)} style="background:${c}"></i>`).join("")}</div>${ticks(PL.shade, level, 5)}</div>`);
    if (PL.diverge) parts.push(`<div class="lg">${lhead(PL.diverge)}<div class="ramp">${DIV.map((c, i) => `<i ${isoAttr("diverge", i)} style="background:${c}"></i>`).join("")}</div>${ticks(PL.diverge, level, 5)}<div class="note">Red below ${esc(PL.diverge.fmt(PL.diverge.mid))}, blue above.</div></div>`);
    if (PL.badge) { const ks = cats(PL.badge, LAST.presentB[level]); parts.push(`<div class="lg">${lhead(PL.badge)}<div class="cats2">${ks.map(k => `<span ${isoAttr("badge", k)}><i class="sw dot" style="background:${PL.badge.colour(k)}"></i>${esc(PL.badge.catName(k))}</span>`).join("")}</div><div class="note">Marker at each area's centre. Where it differs from the fill, the two disagree.</div></div>`); }
    if (PL.dots) parts.push(`<div class="lg">${lhead(PL.dots)}<div class="dotsw">${[0, 1, 2, 3, 4].map(k => `<span ${isoAttr("dots", k)}><canvas data-k="${k}" width="44" height="28"></canvas></span>`).join("")}</div>${ticks(PL.dots, level, 5)}</div>`);
    if (PL.size) parts.push(`<div class="lg">${lhead(PL.size)}<div class="dots" style="--c:${PER[PL.size.p].hue}">${[6, 12, 20].map((r, i) => `<span><i style="width:${r * 1.4}px;height:${r * 1.4}px"></i>${["small", "", "large"][i]}</span>`).join("")}<span style="margin-left:auto">area of circle = value</span></div></div>`);
    if (PL.sites) {
      const gs = [...new Set(COS.map(c => c.grp))].sort((a, b) => Object.keys(GRP_COL).indexOf(a) - Object.keys(GRP_COL).indexOf(b));
      const unloc = COS.filter(c => c.lat == null).length;
      parts.push(`<div class="lg">${lhead(PL.sites)}<div class="cats2">${gs.map(g => `<span><i class="sw" style="background:${GRP_COL[g]}"></i>${esc(g)}</span>`).join("")}</div>
        <div class="note">Squares are head offices (protests are circles). Size = market value. Shown from London's council zoom; zoom into a gold district tile to explore it.${unloc ? ` ${unloc} London companies have no exact office location and are listed in the London cards only.` : ""}</div></div>`);
    }
    const ev = PL.points || PL.heat;
    if (ev) {
      const present = new Set(); PR.sites.forEach(s => { const e = PR.events[s[0]], D = dayNum(state.date); if (e.t0 <= D && e.end > D - PS.win) present.add(e.c); });
      parts.push(`<div class="lg">${lhead(ev)}<div class="seg sm" role="group" aria-label="Time window">${[[365, "1y"], [1826, "5y"], [3652, "10y"], [99999, "All"]].map(([w, l]) => `<button data-win="${w}" class="${PS.win === w ? "on" : ""}">${l}</button>`).join("")}</div>
        ${PL.points ? `<div class="cats2">${[...present].sort((a, b) => a - b).map(c => `<span><i class="sw dot" style="background:${CAUSE_COL[CAUSES[c]]}"></i>${esc(CAUSES[c])}</span>`).join("") || `<span style="color:var(--ink-3)">No protests ${esc(winLabel())}</span>`}</div>
        <div class="dots" style="--c:#8560b5">${[1000, 20000, 500000].map(v => { const r = clamp(3 + 3.1 * Math.log10(v / 100 + 1), 3, 15) * 1.3; return `<span><i style="width:${r * 2}px;height:${r * 2}px;background:#888"></i>${fmtBig(v)}</span>`; }).join("")}<span><i style="width:8px;height:8px;background:#888;border:1.6px solid #1a2226"></i>size unknown</span></div>
        <div class="note">Colour = cause. Size = crowd. Newer protests are solid and ringed; older ones fade. Window: protests ${esc(winLabel())}. Click a point for its story.</div>` : `<div class="note">Darker = more people protesting nearby, ${esc(winLabel())}.</div>`}</div>`);
    }
    const nd = noDataKey(level); if (nd && parts.length) parts[0] = parts[0].replace(/<\/div>$/, nd + "</div>");
    const unplaced = curPlan.notes.filter(n => !n.ch);
    if (unplaced.length) parts.push(`<div class="lg warn">${unplaced.map(n => esc(n.why)).join("<br>")}</div>`);
    if (curPlan.notes.length) {
      const cls = Object.keys(CH_NAME).filter(ch => curPlan[ch] && EN.isNum(curPlan[ch])).map(ch => { const m = curPlan[ch]; const b = breaksFor(m, level, ch === "grid" || (ch === "shade" && curPlan.grid) ? PS.biv.n : 5); return `<li><b>${esc(m.label)}:</b> ${esc(b.why)}</li>`; });
      parts.push(`<details class="why" ${legendWhyOpen ? "open" : ""}><summary>Why this view?</summary><ul>${curPlan.notes.filter(n => n.ch).map(n => `<li><b>${esc(M[n.id].label)} → ${CH_NAME[n.ch]}:</b> ${esc(n.why)}</li>`).join("")}${cls.join("")}</ul></details>`);
    }
    $("legend-body").innerHTML = parts.join(""); legend.hidden = !parts.length || keyHidden; $("key-show").hidden = !parts.length || !keyHidden;
    legend.querySelectorAll(".dotsw canvas").forEach(cv => { const x = cv.getContext("2d"); x.fillStyle = "#c9c3b6"; x.fillRect(0, 0, cv.width, cv.height); const im = dotImage(+cv.dataset.k); const t = document.createElement("canvas"); t.width = t.height = DOT_TILE; t.getContext("2d").putImageData(im, 0, 0); for (let xx = -12; xx < cv.width; xx += DOT_TILE) for (let yy = -6; yy < cv.height; yy += DOT_TILE) x.drawImage(t, xx, yy); });
    positionLegend();
  }
  let legendWhyOpen = false;
  // ---------- moving panels: the key and the time bar can be dragged by their grip; double-click the grip to put them back ----------
  function draggable(el, grip, key, after) {
    const apply = p => { el.classList.add("moved"); Object.assign(el.style, { left: p.x + "px", top: p.y + "px", bottom: "auto", right: "auto", transform: "none" }); };
    const fit = p => ({ x: clamp(p.x, 4, window.innerWidth - Math.min(el.offsetWidth || 200, window.innerWidth - 8) - 4), y: clamp(p.y, 52, window.innerHeight - 40) });
    el._moved = store.get(key, null); if (el._moved) apply(fit(el._moved));
    grip.addEventListener("pointerdown", e => {
      if (e.button || e.target.closest("button")) return; e.preventDefault(); const r = el.getBoundingClientRect(), ox = e.clientX - r.left, oy = e.clientY - r.top;
      grip.setPointerCapture(e.pointerId); el.classList.add("dragging");
      const mv = ev => { el._moved = fit({ x: ev.clientX - ox, y: ev.clientY - oy }); apply(el._moved); if (after) after(); };
      const up = () => { grip.removeEventListener("pointermove", mv); el.classList.remove("dragging"); store.set(key, el._moved); };
      grip.addEventListener("pointermove", mv); grip.addEventListener("pointerup", up, { once: true }); grip.addEventListener("pointercancel", up, { once: true });
    });
    grip.addEventListener("dblclick", () => { el._moved = null; store.set(key, null); el.classList.remove("moved"); ["left", "top", "bottom", "right", "transform"].forEach(k => { el.style[k] = ""; }); if (after) after(); });
    window.addEventListener("resize", () => { if (el._moved) { el._moved = fit(el._moved); apply(el._moved); } if (after) after(); });
  }
  // ---------- resizing: a visible corner grip (bottom right) on the key, the time bar, windows and workspace tiles ----------
  function resizable(el, key, opts) {
    opts = opts || {}; const g = document.createElement("div"); g.className = "rgrip"; g.title = "Drag to resize · double-click to reset"; el.appendChild(g);
    const apply = sz => { if (!sz) return; if (sz.w) el.style.width = sz.w + "px"; if (sz.h && !opts.widthOnly) { el.style.height = sz.h + "px"; el.style.maxHeight = "none"; } el._size = sz; };
    if (key) apply(store.get(key, null));
    g.addEventListener("pointerdown", e => {
      if (e.button) return; e.preventDefault(); e.stopPropagation(); g.setPointerCapture(e.pointerId); document.body.classList.add("resizing");
      const r = el.getBoundingClientRect(), x0 = e.clientX, y0 = e.clientY, centred = getComputedStyle(el).transform !== "none" && opts.centred;
      const mv = ev => { const w = clamp(r.width + (ev.clientX - x0) * (centred ? 2 : 1), opts.minW || 220, window.innerWidth - 16), h = clamp(r.height + ev.clientY - y0, opts.minH || 80, window.innerHeight - 60); apply({ w: Math.round(w), h: opts.widthOnly ? 0 : Math.round(h) }); if (opts.after) opts.after(); };
      const up = () => { g.removeEventListener("pointermove", mv); document.body.classList.remove("resizing"); if (key) store.set(key, el._size); if (opts.done) opts.done(); };
      g.addEventListener("pointermove", mv); g.addEventListener("pointerup", up, { once: true }); g.addEventListener("pointercancel", up, { once: true });
    });
    g.addEventListener("dblclick", () => { el._size = null; if (key) store.set(key, null); el.style.width = ""; el.style.height = ""; el.style.maxHeight = ""; if (opts.after) opts.after(); if (opts.done) opts.done(); });
    return g;
  }
  let keyHidden = !!store.get("atlas-032-key-hidden", false);
  function setKeyHidden(h) { keyHidden = h; store.set("atlas-032-key-hidden", h); renderLegend(); }
  function positionLegend() {
    $("key-show").style.bottom = (window.innerHeight - dock.getBoundingClientRect().top + 8) + "px";
    const sized = legend._size && legend._size.h;   // a key resized by hand keeps its height
    if (legend._moved) { if (!sized) legend.style.maxHeight = Math.max(120, window.innerHeight - legend.getBoundingClientRect().top - 12) + "px"; return; }
    const top = dock.getBoundingClientRect().top; legend.style.bottom = (window.innerHeight - top + 8) + "px"; if (!sized) legend.style.maxHeight = Math.max(120, top - 8 - 64) + "px";
  }
  const timebar = $("timebar");
  const mapW = () => { const c = map && map.getContainer && map.getContainer(); return (c && c.clientWidth) || window.innerWidth; };   // narrower than the window in Split view
  const barTop = () => { const r = timebar.getBoundingClientRect(); return r.top > window.innerHeight * 0.5 ? r.top : window.innerHeight; };

  legend.addEventListener("toggle", e => { if (e.target.classList.contains("why")) legendWhyOpen = e.target.open; }, true);
  legend.addEventListener("click", e => {
    const i = e.target.closest("[data-iso]");
    if (i) { const v = JSON.parse(i.dataset.iso); state.iso = state.iso && JSON.stringify(state.iso) === JSON.stringify(v) ? null : v; LEVELS.forEach(paintLevel); renderLegend(); toast(state.iso ? "Showing only those areas. Click again to show all." : "Showing all areas."); return; }
    const rm = e.target.closest("[data-lrm]"); if (rm) { const m = M[rm.dataset.lrm]; if (m && isMapped(m.id)) { toggleMapped(m.id); toast(`${m.label} taken off the map.`); } return; }
    if (e.target.closest("[data-lclear]")) { clearAllLayers(); return; }
    if (e.target.closest("[data-bivswap]")) { const a = curPlan.shade, b = curPlan.grid; if (a && b) { PS.prefs[a.id] = "grid"; PS.prefs[b.id] = "shade"; repaint(); toast("Axes swapped."); } return; }
    const w = e.target.closest("[data-win]"); if (w) { PS.win = +w.dataset.win; for (const k in qCache) if (k.includes("|") && /protest/.test(k)) delete qCache[k]; repaint(); }
  });
  legend.addEventListener("change", e => {
    const t = e.target;
    if (t.dataset.as) { PS.prefs[t.dataset.as] = t.value; repaint(); }
    else if (t.dataset.pick) { PS.pick[t.dataset.pick] = t.value; for (const k in qCache) if (k.startsWith(t.dataset.pick + "|")) delete qCache[k]; repaint(); }
    else if (t.hasAttribute("data-bivpal")) { PS.biv.pal = t.value; repaint(); }
    else if (t.hasAttribute("data-bivn")) { PS.biv.n = +t.value; repaint(); }
    else if (t.dataset.bivc != null) { PS.biv.cust = (PS.biv.cust || BIV_CUSTOM_DEF).slice(); PS.biv.cust[+t.dataset.bivc] = t.value; repaint(); }
  });
  const LEVEL_WORDS = { 3: ["low", "middling", "high"], 4: ["low", "lower-middle", "upper-middle", "high"] };
  const bivWords = (cx, ry, n, mx, my) => `${LEVEL_WORDS[n][cx]} ${mx.label.toLowerCase()} · ${LEVEL_WORDS[n][ry]} ${my.label.toLowerCase()}`;

  function renderSup() { const on = onPersps(), sup = $("sup"); sup.textContent = on.length === 0 ? "" : on.length === 1 ? PER[on[0]].name.toLowerCase() : "multi"; $("brand").style.setProperty("--sup", on.length === 1 ? PER[on[0]].hue : "var(--ink-2)"); }

  // ---------- perspectives dock + menus ----------
  // Each perspective is a name; clicking it drops down its categories (e.g. "Government & control"). A category opens a
  // checklist of its metrics: tick to put a metric on the map. Names and categories stay grey until something in them is on.
  // The panel folds away (smoothly) after 15 seconds untouched, to give the key more room; click its heading to open it.
  const dock = $("dock"), pmenu = $("pmenu");
  let pmOpen = null, dockOpenP = null;
  const groupsOfP = p => p.ready ? [...new Set(METRICS.filter(m => m.p === p.id).map(m => m.group))] : ["Planned"];
  const mappedIn = (pid, g) => METRICS.filter(m => m.p === pid && (g == null || m.group === g) && isMapped(m.id)).length;
  const cardIn = (pid, g) => METRICS.filter(m => m.p === pid && (g == null || m.group === g) && m.nature === "text" && PS.card[m.id] && PS.active[m.id]).length;
  function renderDock() {
    dock.classList.toggle("collapsed", !!dockFold.folded);
    const n = PERSPECTIVES.reduce((a, p) => a + mappedIn(p.id), 0);
    dock.innerHTML = `<div class="dt-row"><button class="dt" data-fold aria-expanded="${!dockFold.folded}"><span>Perspectives</span>${n ? `<span class="n">${n}</span>` : ""}<span class="chev">▾</span></button>${n ? `<button class="dclear" data-dclear title="Take everything off the map (Esc)">Clear</button>` : ""}</div>
      <div class="dbody"><div class="dinner">${PERSPECTIVES.filter(p => !(p.hidden && !p.ready)).map(p => { const on = mappedIn(p.id) > 0, open = dockOpenP === p.id; return `<div class="pr${on ? " on" : ""}${p.ready ? "" : " locked"}" style="--c:${p.hue}">
        <button class="pname" data-open="${p.id}" aria-expanded="${open}">${esc(p.name)}${p.ready ? "" : `<small>soon</small>`}<span class="caret">▾</span></button>
        ${open ? `<div class="pgroups">${groupsOfP(p).map(g => { const k = mappedIn(p.id, g) + cardIn(p.id, g), sel = pmOpen && pmOpen.p === p.id && pmOpen.g === g; return `<button class="pgroup${k ? " on" : ""}${sel ? " sel" : ""}" data-group="${esc(g)}" data-p="${p.id}" aria-expanded="${sel}">${esc(g || p.name)}${k ? `<span class="k">${k}</span>` : ""}</button>`; }).join("")}</div>` : ""}</div>`; }).join("")}</div></div>`;
  }
  function syncOn(pid) { const on = (PS.mapped[pid] || []).some(id => PS.active[id]); PS.on[pid] = on; PS.order = PS.order.filter(x => x !== pid); if (on) PS.order.push(pid); }
  function togglePersp(pid, on) { PS.on[pid] = on; PS.order = PS.order.filter(x => x !== pid); if (on) PS.order.push(pid); if (on) (PS.mapped[pid] || []).forEach(id => { PS.active[id] = true; }); repaint(); }
  // Clear every layer at once (Esc when nothing else is open, or the Clear all buttons); Undo puts them back
  const anyMapped = () => PERSPECTIVES.some(p => mappedIn(p.id) > 0);
  function clearAllLayers() {
    if (!anyMapped()) { toast("Nothing is on the map."); return; }
    const before = JSON.stringify({ mapped: PS.mapped, on: PS.on, order: PS.order });
    Object.keys(PS.mapped).forEach(pid => { PS.mapped[pid] = []; syncOn(pid); });
    state.iso = null; pmOpen && renderPMenu(); repaint();
    undoToast("All perspectives cleared.", () => { const b = JSON.parse(before); PS.mapped = b.mapped; PS.on = b.on; PS.order = b.order; repaint(); });
  }
  function toggleMapped(id) {
    const m = M[id], arr = PS.mapped[m.p] = PS.mapped[m.p] || [];
    if (isMapped(id)) { arr.splice(arr.indexOf(id), 1); if (m.pairShare && arr.includes(m.pairShare)) arr.splice(arr.indexOf(m.pairShare), 1); }
    else { if (!arr.includes(id)) arr.push(id); PS.active[id] = true; if (m.pairShare && M[m.pairShare] && !arr.includes(m.pairShare)) { arr.push(m.pairShare); PS.active[m.pairShare] = true; PS.prefs[m.pairShare] = "shade"; } }
    syncOn(m.p); repaint();
    const n = curPlan.notes.find(x => x.id === id); if (arr.includes(id) && n) toast(n.ch ? `${m.label}: ${CH_NAME[n.ch]}. ${n.why}` : n.why);
  }
  dock.addEventListener("click", e => {
    if (e.target.closest("[data-dclear]")) { clearAllLayers(); return; }
    const f = e.target.closest("[data-fold]"); if (f) { setFold(!dockFold.folded); return; }
    const b = e.target.closest("[data-open]"); if (b) { dockOpenP = dockOpenP === b.dataset.open ? null : b.dataset.open; if (pmOpen && pmOpen.p !== dockOpenP) pmOpen = null; renderDock(); renderPMenu(); positionLegend(); return; }
    const g = e.target.closest("[data-group]"); if (g) { const o = { p: g.dataset.p, g: g.dataset.group }; pmOpen = pmOpen && pmOpen.p === o.p && pmOpen.g === o.g ? null : o; renderDock(); renderPMenu(); }
  });
  const CARD_ICO = '<svg class="ico" viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="14" rx="2"/><path d="M8 10h8M8 14h5"/></svg>';
  // Does a metric have any values for the boundary set on the map? (checked on a sample, at the time-bar date and today)
  const availCache = {};
  function hasData(m, level) {
    if (m.nature === "text") return true;
    const key = m.id + "|" + level + "|" + state.date.slice(0, 4); if (key in availCache) return availCache[key];
    const codes = allCodesAt(level), step = Math.max(1, Math.floor(codes.length / 300)), sample = codes.filter((c, i) => i % step === 0);
    const ok = d => sample.some(c => { try { const r = m.get(c, d); return r && r.v != null; } catch (e) { return false; } });
    return (availCache[key] = ok(state.date) || ok(TODAY));
  }
  function renderPMenu() {
    if (!pmOpen) { pmenu.hidden = true; return; }
    const p = PER[pmOpen.p], ms = METRICS.filter(m => m.p === p.id && m.group === pmOpen.g);
    pmenu.style.setProperty("--c", p.hue);
    const rows = p.ready ? ms.map(m => {
      const text = m.nature === "text", mapped = isMapped(m.id), inCard = !!PS.card[m.id] && PS.active[m.id], note = curPlan.notes.find(n => n.id === m.id);
      const tag = m.temporal === "event" ? `<i title="Dated events">events</i>` : m.temporal !== "static" ? `<i title="Changes with the time slider">time</i>` : "";
      const avail = hasData(m, state.level), noD = !avail && !mapped;
      const sub = text ? "Card only: text can't be drawn on the map" : !avail ? `No data for ${esc((PLURAL_L[state.level] || "these areas").toLowerCase())}${mapped ? ": untick to take it off" : ". Choose other boundaries in Areas ▾ to use it"}` : mapped && note ? `On the map as <b>${note.ch ? CH_NAME[note.ch] : "— no free channel"}</b>` : esc(m.desc || "");
      return `<div class="crow${(text ? inCard : mapped) ? " on" : ""}${noD ? " nodata" : ""}"><input type="checkbox" id="cb-${m.id}" ${text ? `data-card="${m.id}"` : `data-map="${m.id}"`} ${(text ? inCard : mapped) ? "checked" : ""} ${noD ? "disabled" : ""}>
        <label for="cb-${m.id}" class="ml">${esc(m.label)}${tag}<small>${sub}</small></label>
        <span></span></div>`;
    }).join("") : p.planned.map(n => `<div class="crow off"><input type="checkbox" disabled><span class="ml">${esc(n)}<small>No data loaded yet</small></span><span></span></div>`).join("");
    const n = ms.filter(m => isMapped(m.id)).length;
    pmenu.innerHTML = `<div class="pm-head"><div><h3>${esc(pmOpen.g || p.name)}</h3><p>${esc(p.name)} · ${esc(p.desc)}</p></div><button class="x" data-pmx aria-label="Close">×</button></div><div class="pm-list">${rows}</div>
      <div class="pm-foot">${p.ready ? `<span>${n} on the map · tick several to overlay them</span>${n ? `<button class="btn" data-clearg>Clear</button>` : ""}` : `<span>Coming in a later phase. Political comes first.</span>`}</div>`;
    pmenu.hidden = false;
    const anchor = dock.querySelector(`.pgroup.sel`) || dock, ar = anchor.getBoundingClientRect(), dr = dock.getBoundingClientRect();
    const h = pmenu.offsetHeight, top = clamp(ar.top - 8, 60, window.innerHeight - h - 12);
    pmenu.style.left = (dr.right + 10) + "px"; pmenu.style.top = top + "px"; pmenu.style.setProperty("--arrow", clamp(ar.top + ar.height / 2 - top - 6, 10, h - 20) + "px");
  }
  pmenu.addEventListener("change", e => {
    const t = e.target; if (t.type !== "checkbox") return;
    if (t.dataset.map) toggleMapped(t.dataset.map);
    else if (t.dataset.card) { const id = t.dataset.card; PS.active[id] = true; PS.card[id] = t.checked; repaint(); }
  });
  pmenu.addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.hasAttribute("data-pmx")) closePMenu();
    else if (b.dataset.card) { const id = b.dataset.card; PS.active[id] = true; PS.card[id] = !PS.card[id]; repaint(); toast(PS.card[id] ? `${M[id].label} will show in the hover card.` : `${M[id].label} removed from the hover card.`); }
    else if (b.hasAttribute("data-clearg")) { const pid = pmOpen.p; PS.mapped[pid] = (PS.mapped[pid] || []).filter(id => M[id].group !== pmOpen.g); syncOn(pid); repaint(); }
  });
  function closePMenu() { if (!pmOpen) return false; pmOpen = null; renderDock(); renderPMenu(); return true; }
  // folding the panel
  const dockFold = { folded: false, timer: null, hover: false };
  function setFold(f) { dockFold.folded = f; if (f) { pmOpen = null; renderPMenu(); } renderDock(); armFold(); }
  function armFold() { clearTimeout(dockFold.timer); if (dockFold.folded) return; dockFold.timer = setTimeout(() => { if (dockFold.hover || document.activeElement && (dock.contains(document.activeElement) || pmenu.contains(document.activeElement)) && document.activeElement !== document.body) return armFold(); setFold(true); }, 15000); }
  [dock, pmenu].forEach(el => { el.addEventListener("pointerenter", () => { dockFold.hover = true; armFold(); }); el.addEventListener("pointerleave", () => { dockFold.hover = false; armFold(); }); ["pointerdown", "keydown", "wheel"].forEach(ev => el.addEventListener(ev, armFold)); });

  // ---------- time bar ----------
  const state = { sel: [], level: "nation", pinned: null, focus: null, editing: false, date: TODAY, playing: null, iso: null, tool: null };
  const slider = $("slider"), dateIn = $("date");
  slider.min = monthIdx(START); slider.max = monthIdx(TODAY); slider.step = 1;
  function setDate(d, opts) {
    d = d < START ? START : d > TODAY ? TODAY : d;
    if (d === state.date && !(opts && opts.force)) return;
    state.date = d; slider.value = monthIdx(d); dateIn.value = dmy(d); dateIn.classList.remove("bad"); syncPcon();
    LEVELS.forEach(paintLevel); syncProtestLayer(); renderLegend(); renderTNote(); syncFocusColour();
    if (state.focus) { renderMind(); refreshPinned(); if (!hist.hidden) renderHist(); }
    else if (hovCode && !card.hidden) showHover(hovCode, lastPt || { x: 0, y: 0 });
    renderTray(); if (!$("cmp").hidden) renderCmp();
    if (!cpanel.hidden && CHART.drawn) renderChartBody();
    renderTray(); if (!$("cmp").hidden) renderCmp(); refreshGroupCards();
  }
  slider.addEventListener("input", () => { let d = +slider.value >= +slider.max ? TODAY : fromMonthIdx(+slider.value); if (PS.step > 1 && d !== TODAY) d = Math.round(+d.slice(0, 4) / PS.step) * PS.step + "-07-01"; setDate(d); });
  dateIn.addEventListener("keydown", e => { if (e.key === "Enter") { const d = parseDMY(dateIn.value); if (d) { setDate(d); dateIn.blur(); } else { dateIn.classList.add("bad"); toast("Type the date as dd/mm/yy, e.g. 07/05/15"); } } });
  dateIn.addEventListener("blur", () => { if (!parseDMY(dateIn.value)) dateIn.value = dmy(state.date); });
  $("now").addEventListener("click", () => { stopPlay(); setDate(TODAY); });
  const PLAY_ICON = '<svg class="ico" viewBox="0 0 24 24"><path d="M7 4.5v15l12-7.5z"/></svg>', PAUSE_ICON = '<svg class="ico" viewBox="0 0 24 24"><path d="M6 4h4.5v16H6zM13.5 4H18v16h-4.5z"/></svg>';
  const playBtn = $("play"); playBtn.innerHTML = PLAY_ICON;
  function stopPlay() { if (state.playing) { clearInterval(state.playing); state.playing = null; playBtn.innerHTML = PLAY_ICON; playBtn.setAttribute("aria-label", "Play through time"); } }
  playBtn.addEventListener("click", () => {
    if (state.playing) return stopPlay();
    if (!curPlan.notes.some(n => n.ch)) toast("Put a metric on the map to see changes play out.");
    if (state.date >= TODAY) setDate(PS.step > 1 ? (Math.ceil(+START.slice(0, 4) / PS.step) * PS.step) + "-07-01" : START);
    playBtn.innerHTML = PAUSE_ICON; playBtn.setAttribute("aria-label", "Pause");
    state.playing = setInterval(() => { const n = addYears(state.date, PS.step); if (n >= TODAY) { setDate(TODAY); stopPlay(); } else setDate(n); }, PS.step === 1 ? 850 : 1300);
  });
  $("steps").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; PS.step = +b.dataset.step; renderSteps(); savePS(); });
  function renderSteps() {
    document.querySelectorAll("#steps button").forEach(b => b.classList.toggle("on", +b.dataset.step === PS.step));
    const lo = +slider.min, hi = +slider.max, y0 = +START.slice(0, 4), y1 = +TODAY.slice(0, 4), out = [];
    for (let y = y0 + 1; y <= y1; y++) { const major = y % 10 === 0, minor = y % PS.step === 0; if (!major && !minor) continue; out.push(`<span class="${major ? "" : "minor"}" style="left:${((y * 12 - lo) / (hi - lo) * 100).toFixed(2)}%">${y}</span>`); }
    $("marks").innerHTML = out.join("");
  }
  function renderTNote() {
    const ms = curPlan.notes.filter(n => n.ch).map(n => M[n.id]), note = $("tnote"), bits = [];
    if (!isNow()) bits.push(`Showing ${longDate(state.date)}`);
    if (ms.some(m => m.temporal === "annual") && +state.date.slice(0, 4) < SY[0]) bits.push(`GDP and population start in ${SY[0]}`);
    else if (ms.some(m => m.temporal === "annual") && +state.date.slice(0, 4) > SY[SY.length - 1] - 1) bits.push("economic figures: latest year available");
    if (ms.some(m => m.temporal === "event")) bits.push(`protests ${winLabel()}`);
    if (ms.some(m => m.temporal === "static")) bits.push("average age has no history yet");
    if (state.level === "constituency" && state.date < "1997-05-01") bits.push("constituency records start in 1997");
    if (!isNow() && (["council", "ward"].includes(state.level) && ms.some(m => m.id === "control") || ms.some(m => ["tenure", "turnover"].includes(m.id)))) { const miss = COUNCIL_CODES.filter(c => !seg(POL.control[c], state.date)).length; if (miss) bits.push(`${miss} councils have no control record for this date`); }
    note.textContent = bits.join(" · "); note.hidden = !bits.length;
  }

  // ---------- levels ----------
  // Automatic: the boundary set follows the zoom (nations → regions → councils → wards), as before.
  // Chosen: the person ticks boundary sets in the Areas menu; they show at any zoom and the map never moves.
  // The most recently ticked set is the "active" one: it takes the colours, hover cards and clicks; the others show as outlines.
  const levelAt = z => z >= Z.ward ? "ward" : z >= Z.council ? "council" : z >= Z.region ? "region" : "nation";
  const LV = Object.assign({ auto: true, on: [], active: null }, store.get("atlas-031-levels", {}));
  LV.on = (LV.on || []).filter(l => LEVELS.includes(l)); if (!LV.on.length || !LEVELS.includes(LV.active)) { LV.auto = true; LV.on = []; LV.active = null; }
  const FINE = ["ward", "constituency", "council", "region", "nation"];
  const fillIds = l => ["pf-" + l, ...[0, 1, 2, 3, 4].map(k => `pdt-${l}-${k}`), l + "-fill", "pd-" + l, "pb-" + l];
  const LINE_OF = { nation: "nation-line", region: "region-line", council: "council-line", constituency: "constituency-line", ward: "ward-line" };
  const AUTO_LINE = { nation: [0, 0.9], region: [Z.region - 0.3, 0.85], council: [Z.council - 0.3, ["interpolate", ["linear"], ["zoom"], Z.council - 0.3, 0, Z.council, 0.8]], ward: [Z.ward - 0.3, ["interpolate", ["linear"], ["zoom"], Z.ward - 0.3, 0, Z.ward, 0.7]] };
  function applyLevels() {
    store.set("atlas-031-levels", LV);
    if (!map.getLayer || !map.getLayer("pf-nation")) { syncLevel(); return; }
    LEVELS.forEach(l => {
      const on = LV.auto ? l !== "constituency" : l === LV.active, range = LV.auto ? VIS[l] : [0, 24];
      fillIds(l).forEach(id => { if (!map.getLayer(id)) return; map.setLayoutProperty(id, "visibility", on ? "visible" : "none"); map.setLayerZoomRange(id, range[0], range[1]); });
      const ln = LINE_OF[l], a = AUTO_LINE[l]; if (!map.getLayer(ln)) return;
      if (LV.auto) { map.setLayoutProperty(ln, "visibility", a ? "visible" : "none"); if (a) { map.setLayerZoomRange(ln, a[0], 24); setP(ln, "line-opacity", a[1]); } }
      else { const show = LV.on.includes(l) || l === "nation"; map.setLayoutProperty(ln, "visibility", show ? "visible" : "none"); map.setLayerZoomRange(ln, 0, 24); setP(ln, "line-opacity", l === "ward" ? 0.7 : 0.85); }
    });
    clearHover(); syncLevel(); loadVisibleWards(); renderLevelPicker(); syncPcon();
  }
  function syncLevel() { const l = LV.auto ? levelAt(map.getZoom()) : LV.active; const changed = l !== state.level; state.level = l; if (changed) { renderLegend(); renderLevelPicker(); if (pmOpen) renderPMenu(); } }
  map.on("zoom", () => { if (LV.auto) syncLevel(); });
  function setLevelOn(l, on) {
    if (l === "auto") { LV.auto = true; LV.on = []; LV.active = null; }
    else {
      if (LV.auto) { LV.auto = false; LV.on = []; }
      LV.on = LV.on.filter(x => x !== l); if (on) { LV.on.push(l); LV.active = l; }
      else if (LV.active === l) LV.active = FINE.find(x => LV.on.includes(x)) || null;
      if (!LV.on.length) { LV.auto = true; LV.active = null; }
    }
    applyLevels();
    if (l === "ward" && on && map.getZoom() < 7) toast("Wards are small: they load council by council as they come into view.");
  }
  function makeActive(l) { if (LV.auto || !LV.on.includes(l)) return setLevelOn(l, true); LV.active = l; applyLevels(); }

  // ---------- cards ----------
  const card = $("card");
  function swatchOf(m, code) { // the colour or mark this area gets on the map for metric m
    const k = LAST.k[code] || {}, ch = Object.keys(CH_NAME).find(c => curPlan[c] === m);
    if (ch === "hue" || ch === "shade" || ch === "grid" || ch === "diverge") return LAST.fc[code] ? `<i class="sw" style="background:${LAST.fc[code]}"></i>` : `<i class="sw empty"></i>`;
    if (ch === "badge") return k.bg != null ? `<i class="sw dot" style="background:${m.colour(k.bg)}"></i>` : `<i class="sw empty"></i>`;
    if (ch === "dots") return `<i class="sw dotp" style="--r:${k.dt == null ? 0 : 2 + k.dt}px"></i>`;
    if (ch === "size") return `<i class="sw dot" style="background:${PER[m.p].hue};opacity:.6"></i>`;
    if (ch === "points") return `<i class="sw dot" style="background:#8560b5"></i>`;
    return `<i class="sw empty"></i>`;
  }
  function zoneBody(code) {
    const cs = cosIn(code).slice().sort((a, b) => (b.capGBP || 0) - (a.capGBP || 0)), tot = cs.reduce((a, c) => a + (c.capGBP || 0), 0), n = {};
    cs.forEach(c => { n[c.grp] = (n[c.grp] || 0) + (c.capGBP || 0); });
    const bar = tot ? `<div class="secbar">${Object.entries(n).sort((a, b) => b[1] - a[1]).map(([g, v]) => `<i style="flex:${v};background:${GRP_COL[g]}" title="${esc(g)}: ${esc(fmtGBPbig(v))}"></i>`).join("")}</div>` : "";
    const ctl = seg(POL.control[P[code].parent], state.date);
    return `<div class="znote">${esc(P[code].note || "")}</div><ul><li><b>FTSE 100 head offices:</b> ${cs.length}</li><li><b>Combined market value:</b> ${tot ? esc(fmtGBPbig(tot)) : "—"}</li><li><b>Council:</b> ${esc(nameOf(P[code].parent))} (${esc(ctl ? partyName(ctl[2]) : "—")})</li></ul>${bar}
      <ul class="colist">${cs.slice(0, 12).map(c => `<li data-co="${c.i}"><i class="sw dot" style="background:${GRP_COL[c.grp]}"></i><span>${esc(c.n)}</span><small>${c.capGBP ? esc(fmtGBPbig(c.capGBP)) : ""}</small>${CH.spark(c.px.filter((p, j) => j % 3 === 0).map(p => [+p[0].slice(0, 4) + (+p[0].slice(5, 7) - 1) / 12, p[1]]), { w: 60, h: 16, colour: GRP_COL[c.grp] })}</li>`).join("")}${cs.length > 12 ? `<li class="more">and ${cs.length - 12} more</li>` : ""}</ul>`;
  }
  // yearly points of one metric for one area, for sparklines and charts
  function seriesOf(m, code, y0, y1, step) {
    step = step || 1; const pts = [];
    if (m.temporal === "static") { const r = m.get(code, state.date); return r && r.v != null ? [[+state.date.slice(0, 4), r.v]] : []; }
    if (m.temporal === "annual") { y0 = Math.max(y0, SY[0] || y0); }
    for (let y = y0; y <= y1; y += step) { const d = y === +TODAY.slice(0, 4) ? TODAY : y + "-07-01"; const r = m.get(code, d); const ok = r && r.v != null && (!r.yr || String(r.yr).slice(0, 4) === String(y) || m.temporal !== "annual"); pts.push([y, ok ? +r.v : null]); }
    return pts;
  }
  function bandOf(m, code, y0, y1, step) { const out = []; for (let y = y0; y <= y1; y += (step || 1)) { const r = m.get(code, y === +TODAY.slice(0, 4) ? TODAY : y + "-07-01"); out.push([y, r && r.v != null ? m.colour(r.v) : "", r ? r.text : "—"]); } return out; }
  function sparkFor(m, code) {
    const y1 = +TODAY.slice(0, 4), now = +state.date.slice(0, 4) + (+state.date.slice(5, 7) - 1) / 12;
    if (EN.isCat(m) && m.temporal !== "static") return CH.sparkBand(bandOf(m, code, 1975, y1, 1).map(c => [c[0], c[1]]), { w: 80 });
    if (!EN.isNum(m) || m.temporal === "static") return "";
    const y0 = m.temporal === "annual" ? (SY[0] || 1998) : m.temporal === "event" ? 1976 : 1975;
    return CH.spark(seriesOf(m, code, y0, y1, m.temporal === "event" ? 2 : 1), { w: 80, h: 18, now, colour: PER[m.p].hue });
  }
  function cardHTML(code, pinned) {
    const p = P[code], rec = E.areas[code], d = state.date, past = !isNow();
    if (p.level === "zone") return `${pinned ? `<button class="x" data-close aria-label="Close">×</button>` : ""}<div class="lvl"><span>${esc(p.kind || "Custom zone")}</span><span>${esc(code)}</span></div><h3>${esc(nameOf(code))}</h3>${zoneBody(code)}
      ${pinned ? `<div class="acts"><button class="btn primary" data-chartzone>Chart these companies</button><button class="btn" data-zoom>Zoom to</button></div>` : `<div class="hint2">Click to explore this district</div>`}`;
    const items = CORE.map(f => { let v = value(code, f.id); if (past && (f.id === "ruler" || f.id === "party")) v = { text: M[f.id].get(code, d).text, yr: "" }; return `<li><b>${esc(f.label)}:</b> ${esc(v.text)}${v.yr ? ` <small>(${esc(v.yr)})</small>` : ""}${v.edited ? ` <span class="tag">edited</span>` : ""}</li>`; });
    ((rec && rec.fields) || []).forEach(f => { if (f.label) items.push(`<li><b>${esc(f.label)}:</b> ${esc(f.value || "—")}</li>`); });
    const onMap = planMetrics(); // everything ticked shows in the card, drawn or not
    const mapped = onMap.map(m => { const r = m.get(code, d); return `<li${r && r.nm ? ' class="nm"' : ""}>${swatchOf(m, code)}<span><b>${esc(m.label)}:</b> ${esc(r && (r.v != null || !EN.isNum(m) || r.nm) ? r.text : "No data")}${estTag(r)}${r && r.note ? ` <small>· ${esc(r.note)}</small>` : ""}${r && r.yr ? ` <small>(${esc(r.yr)})</small>` : ""}${r && r.nm ? "" : sparkFor(m, code)}${pinned && m.how && !(r && r.nm) ? `<small class="how">How this is worked out: ${esc(m.how)}</small>` : ""}${pinned && r && r.detail ? `<div class="mdet">${r.detail}</div>` : ""}</span></li>`; });
    if (PS.detail === "simple" && !pinned) return `<div class="lvl"><span>${esc(LABEL[p.level])}</span></div><h3>${esc(nameOf(code))}</h3>${past ? `<div class="asof">As of ${esc(longDate(d))}</div>` : ""}${mapped.length ? `<ul class="extra">${mapped.join("")}</ul>` : `<div class="hint2">Put a metric on the map to see it here.</div>`}`;
    if (curPlan.grid && curPlan.shade) { const k = LAST.k[code] || {}; if (k.sh != null && k.gr != null) mapped.push(`<li class="bivw"><i class="sw" style="background:${LAST.fc[code]}"></i><span>${esc(bivWords(k.sh, k.gr, PS.biv.n, curPlan.shade, curPlan.grid))}</span></li>`); }
    const extra = METRICS.filter(m => m.nature === "text" && PS.card[m.id] && PS.active[m.id] && PER[m.p].ready && !["ruler", "party"].includes(m.id)).map(m => { const r = m.get(code, d); return `<li><i class="sw empty"></i><span><b>${esc(m.label)}:</b> ${esc(r ? r.text : "—")}${r && r.yr ? ` <small>(${esc(r.yr)})</small>` : ""}</span></li>`; });
    const par = parentOf(code);
    const dj = par && P[par] ? `<div class="dejure">De jure part of: ${pinned ? `<button data-go="${par}">${esc(nameOf(par))}</button>` : `<b>${esc(nameOf(par))}</b>`} <small style="color:var(--ink-3)">(${esc(LABEL[P[par].level])})</small></div>` : "";
    const era = p.level === "constituency" && p.to ? ` ${p.from.slice(0, 4)}–${p.to.slice(0, 4)}${p.approx ? " (approx. boundary)" : ""}` : "";
    return `${pinned ? `<button class="x" data-close aria-label="Close">×</button>` : ""}<div class="lvl"><span>${esc(LABEL[p.level])}${esc(era)}</span><span>${esc(code.replace(/^P\d\d-/, ""))}</span></div>
      <h3>${esc(nameOf(code))}${rec ? ` <span class="tag">edited</span>` : ""}</h3>${past ? `<div class="asof">As of ${esc(longDate(d))}</div>` : ""}<ul>${items.join("")}</ul>
      ${mapped.length ? `<ul class="extra">${mapped.join("")}</ul>` : ""}${extra.length ? `<ul class="extra">${extra.join("")}</ul>` : ""}${dj}
      ${rec && rec.notes ? `<div class="notes">${esc(rec.notes)}</div>` : ""}
      ${pinned ? `<div class="acts"><button class="btn primary" data-edit>Edit</button><button class="btn" data-chartme>Chart</button><button class="btn" data-wscard title="Send this card to the workspace">Card → workspace</button><button class="btn" data-wstile title="Send this place as a tile (a small map) to the workspace">Tile → workspace</button><button class="btn" data-addcmp>${state.sel.some(s => s.code === code) ? "✓ Selected" : "+ Compare"}</button><button class="btn" data-zoom>Zoom to</button><button class="btn" data-outline title="Turn this place's outline into a shape you can drag over other places, at its real size">Drag outline</button></div>` : ""}`;
  }
  function editHTML(code) {
    const p = P[code], rec = E.areas[code] || {}, vals = rec.values || {};
    return `<button class="x" data-close aria-label="Close">×</button><div class="lvl"><span>Editing ${esc(LABEL[p.level])}</span><span>${esc(code)}</span></div>
      <form id="ef" autocomplete="off"><label>Name<input name="name" value="${esc(rec.name || "")}" placeholder="${esc(p.name)}"></label>
        ${CORE.map(f => { const b = base(code, f.id); return `<label>${esc(f.label)}<input name="v_${f.id}" value="${esc(vals[f.id] || "")}" placeholder="${esc(b ? b.text : "—")}"></label>`; }).join("")}
        <div style="font-size:11px;color:var(--ink-3)">Leave a box empty to keep the official figure shown in grey.</div>
        <div id="ef-fields">${(rec.fields || []).map((f, i) => `<div class="frow"><input name="fl_${i}" value="${esc(f.label)}" placeholder="Field"><input name="fv_${i}" value="${esc(f.value)}" placeholder="Value"><button type="button" data-delf="${i}" aria-label="Delete field">×</button></div>`).join("")}</div>
        <button type="button" class="btn" data-addf>+ Add a field</button><label>Notes<textarea name="notes">${esc(rec.notes || "")}</textarea></label>
        <div class="acts"><button class="btn primary" type="submit">Save</button><button class="btn" type="button" data-cancel>Cancel</button>${E.areas[code] ? `<button class="btn" type="button" data-reset>Reset</button>` : ""}</div></form>`;
  }
  function place(x, y, el) {
    el = el || card; const W = mapW(), H = window.innerHeight, w = el.offsetWidth || 270, h = el.offsetHeight || 200;
    let left = x + 2, top = y + 2; if (left + w > W - 8) left = x - w - 2; if (top + h > H - 8) top = y - h - 2;
    const tb = timebar.getBoundingClientRect(); // don't sit on top of the time bar
    if (left < tb.right && left + w > tb.left && top < tb.bottom && top + h > tb.top) top = y < tb.top ? Math.min(top, tb.top - h - 6) : tb.bottom + 6;
    el.style.left = Math.max(8, left) + "px"; el.style.top = Math.max(58, Math.min(top, H - h - 4)) + "px";
  }
  let hovCode = null;
  function showHover(code, pt) { hovCode = code; card.className = "card"; card.innerHTML = cardHTML(code, false); card.hidden = false; place(pt.x, pt.y); }
  function refreshPinned() { if (!state.pinned) return; card.innerHTML = state.editing ? editHTML(state.pinned) : cardHTML(state.pinned, true); placeFocusCard(); }
  card.addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return; const code = state.pinned;
    if (b.hasAttribute("data-close")) unfocus(); else if (b.dataset.go) focus(b.dataset.go);
    else if (b.hasAttribute("data-edit")) { state.editing = true; refreshPinned(); } else if (b.hasAttribute("data-cancel")) { state.editing = false; refreshPinned(); }
    else if (b.hasAttribute("data-reset")) { delete E.areas[code]; persist(); state.editing = false; refreshPinned(); renderTray(); toast("Back to the official figures."); }
    else if (b.hasAttribute("data-addf")) { const bx = $("ef-fields"); const i = bx.children.length; bx.insertAdjacentHTML("beforeend", `<div class="frow"><input name="fl_${i}" placeholder="Field"><input name="fv_${i}" placeholder="Value"><button type="button" data-delf="${i}" aria-label="Delete field">×</button></div>`); bx.lastElementChild.querySelector("input").focus(); }
    else if (b.dataset.delf != null) b.closest(".frow").remove();
    else if (b.hasAttribute("data-addcmp")) { toggleCompare({ code, level: P[code].level }); refreshPinned(); }
    else if (b.hasAttribute("data-zoom")) flyTo(code);
    else if (b.hasAttribute("data-outline")) outlineToMeasure(code);
    else if (b.hasAttribute("data-chartme")) openChart({ places: [code] });
    else if (b.hasAttribute("data-wscard")) sendToWS({ type: "card", title: nameOf(code), html: cardHTML(code, false), w: 340, h: 380 });
    else if (b.hasAttribute("data-wstile")) sendTile([code]);
    else if (b.hasAttribute("data-chartzone")) openChart({ companies: cosIn(code).map(c => c.i) });
  });
  card.addEventListener("click", e => { const li = e.target.closest("[data-co]"); if (!li) return; const c = COS[+li.dataset.co]; ecardPinned = true; ecard.className = "card pinned"; ecard.innerHTML = companyHTML(c.i, true); ecard.hidden = false; const r = card.getBoundingClientRect(); place(r.left - 350, r.top, ecard); });
  card.addEventListener("submit", e => {
    e.preventDefault(); const code = state.pinned, f = new FormData(e.target);
    const rec = { name: (f.get("name") || "").trim() || undefined, notes: (f.get("notes") || "").trim(), values: {}, fields: [], updated: Date.now() };
    CORE.forEach(c => { const v = (f.get("v_" + c.id) || "").trim(); if (v) rec.values[c.id] = v; });
    [...e.target.querySelectorAll(".frow")].forEach(r => { const [l, v] = r.querySelectorAll("input"); if (l.value.trim()) rec.fields.push({ label: l.value.trim(), value: v.value.trim() }); });
    E.areas[code] = rec; persist(); state.editing = false; refreshPinned(); renderTray(); toast("Saved.");
  });

  // protest cards
  const ecard = $("ecard");
  function eventHTML(ei, pinned) {
    const e = PR.events[ei], sites = PR.sites.filter(s => s[0] === ei), d0 = fromDay(e.t0), d1 = e.t1 ? fromDay(e.t1) : null;
    const s0 = sites[0], ctl = s0 ? seg(POL.control[s0[3]], d0) : null, gov = s0 ? govAt(P[s0[3]].nation, d0) : null;
    const crowd = e.lo ? (e.lo === e.hi ? fmtBig(e.lo) : `${fmtBig(e.lo)} – ${fmtBig(e.hi)}`) : "Not recorded";
    const places = sites.map(s => s[5]).filter((x, i, a) => a.indexOf(x) === i);
    if (!pinned) return `<div class="lvl"><span>Protest</span><span>${esc(shortDate(d0))}</span></div><h3>${esc(e.n)}</h3><ul><li><b>Crowd:</b> ${esc(crowd)}</li><li><b>Cause:</b> <i class="sw dot" style="background:${CAUSE_COL[CAUSES[e.c]]}"></i> ${esc(CAUSES[e.c])}</li><li><b>Where:</b> ${esc(places.slice(0, 3).join(", "))}${places.length > 3 ? ` +${places.length - 3}` : ""}</li></ul><div class="hint2">Click for the full story</div>`;
    return `<button class="x" data-x aria-label="Close">×</button><div class="lvl"><span>Protest${e.src === "ACLED" ? " · ACLED" : ""}</span><span>${esc(longDate(d0))}${d1 ? " – " + esc(longDate(d1)) : ""}</span></div><h3>${esc(e.n)}</h3>
      <ul><li><b>Crowd estimate:</b> ${esc(crowd)}${e.st && e.lo ? ` <small>· “${esc(e.st.slice(0, 90))}”</small>` : ""}</li>
      <li><b>Cause:</b> <i class="sw dot" style="background:${CAUSE_COL[CAUSES[e.c]]}"></i> ${esc(CAUSES[e.c])}${e.ct ? `<br><small>${esc(e.ct.slice(0, 220))}</small>` : ""}</li>
      <li><b>Where (${places.length}):</b> ${esc(places.slice(0, 12).join(", "))}${places.length > 12 ? ` and ${places.length - 12} more` : ""}</li>
      <li><b>Organisers / sides:</b> ${esc(e.org ? e.org.slice(0, 220) : "Not recorded")}</li>
      <li><b>Parties named:</b> ${e.pa.length ? e.pa.map(p => `<span class="pchip" style="--pc:${partyCol(p)}">${esc(partyName(p))}</span>`).join(" ") : "None named"}</li>
      <li><b>Organisers' alignment:</b> ${e.al.length ? e.al.map(a => `<span class="pchip" style="--pc:${ALIGN_COL[a] || "#999"}">${esc(a)}</span>`).join(" ") : "Not classified"} <small>(Atlas lookup, editable)</small></li></ul>
      <div class="sect">Local politics at the time</div><ul><li><b>${esc(s0 ? nameOf(s0[3]) : "")} council:</b> ${esc(ctl ? partyName(ctl[2]) : "No record")}</li><li><b>Government:</b> ${esc(gov && gov.party ? partyName(gov.party) + (gov.leader ? ` (${gov.leader})` : "") : "—")}</li></ul>
      <div class="note2">No dataset records how protesters vote. Shown instead: parties named as organisers or participants, and the politics of the place.</div>
      <div class="acts">${sites.length > 1 ? `<button class="btn" data-fit="${ei}">Show all ${sites.length} places</button>` : ""}${e.u ? `<a class="btn" href="${esc(e.u)}" target="_blank" rel="noopener">Source</a>` : ""}<button class="btn" data-goto="${e.t0}">Set date to this</button></div>`;
  }
  ecard.addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.hasAttribute("data-x")) { ecard.hidden = true; ecardPinned = false; }
    else if (b.dataset.fit) { const ss = PR.sites.filter(s => s[0] === +b.dataset.fit); let bb = [180, 90, -180, -90]; ss.forEach(s => { bb = [Math.min(bb[0], s[2]), Math.min(bb[1], s[1]), Math.max(bb[2], s[2]), Math.max(bb[3], s[1])]; }); map.fitBounds([[bb[0], bb[1]], [bb[2], bb[3]]], { padding: 120, maxZoom: 10, duration: 900 }); }
    else if (b.dataset.goto) setDate(fromDay(+b.dataset.goto));
  });
  let ecardPinned = false;
  function companyHTML(i, pinned) {
    const c = COS[i], last = c.px[c.px.length - 1], ago = c.px.length > 12 ? c.px[c.px.length - 13] : null, ch = last && ago ? (last[1] / ago[1] - 1) * 100 : null;
    const capTxt = c.cap ? `${c.cap.cur === "GBP" ? "" : (c.cap.cur === "USD" ? "US$" : "€") + compactNum(c.cap.v) + " · "}${c.capGBP ? fmtGBPbig(c.capGBP) : ""}${c.cap.yr ? ` (${c.cap.yr})` : ""}` : "Not recorded";
    const pts = c.px.map(p => [+p[0].slice(0, 4) + (+p[0].slice(5, 7) - 1) / 12, p[1]]);
    const where = c.zone ? nameOf(c.zone) : c.council ? nameOf(c.council) : "London (office not located)";
    if (!pinned) return `<div class="lvl"><span>${esc(c.sector)}</span><span>${esc(c.t)}</span></div><h3>${esc(c.n)}</h3><ul><li><b>Market value:</b> ${esc(capTxt)}</li><li><b>Where:</b> ${esc(where)}</li>${ch != null ? `<li><b>Share price, 12 months:</b> ${esc(fmtPct(ch))}</li>` : ""}</ul>${CH.spark(pts, { w: 200, h: 34, colour: GRP_COL[c.grp] })}<div class="hint2">Click for more</div>`;
    const ctl = c.council ? seg(POL.control[c.council], state.date) : null;
    return `<button class="x" data-x aria-label="Close">×</button><div class="lvl"><span>${esc(c.sector)}</span><span>LSE: ${esc(c.t)}</span></div><h3>${esc(c.n)}</h3>
      <ul><li><b>Head office:</b> ${esc(c.hq || "—")}${c.prec === "city" ? " <small>(exact office not found)</small>" : ""}</li><li><b>District:</b> ${esc(where)}</li>
      <li><b>Market value:</b> ${esc(capTxt)}</li>${c.rev ? `<li><b>Revenue:</b> ${esc((c.rev.cur === "GBP" ? "£" : c.rev.cur === "USD" ? "US$" : "€") + compactNum(c.rev.v))}${c.rev.yr ? ` (${esc(c.rev.yr)})` : ""}</li>` : ""}
      ${c.emp ? `<li><b>Employees:</b> ${esc(c.emp)}</li>` : ""}${c.founded ? `<li><b>Founded:</b> ${esc(c.founded)}</li>` : ""}
      ${!c.px.length ? `<li><b>Share price:</b> <small>not included in this version</small></li>` : ""}<li style="${c.px.length ? "" : "display:none"}"><b>Share price:</b> ${last ? esc(last[1].toLocaleString("en-GB") + (c.cur === "GBp" ? "p" : " " + (c.cur || ""))) + ` <small>(${esc(last[0])})</small>` : "—"}${ch != null ? ` · ${esc(fmtPct(ch))} over 12 months` : ""}</li>
      ${ctl ? `<li><b>Council:</b> ${esc(nameOf(c.council))} (${esc(partyName(ctl[2]))})</li>` : ""}</ul>
      <div class="cospark">${CH.spark(pts, { w: 300, h: 50, colour: GRP_COL[c.grp], now: +state.date.slice(0, 4) + (+state.date.slice(5, 7) - 1) / 12 })}</div>
      <div class="acts"><button class="btn primary" data-cochart="${i}">Chart the share price</button>${c.wiki ? `<a class="btn" href="${esc(c.wiki)}" target="_blank" rel="noopener">Wikipedia</a>` : ""}</div>
      <div class="note2">${c.px.length ? `Prices: Yahoo Finance (monthly close). Market value: companiesmarketcap.com, converted to £ at ${MK ? MK.fx.USD_per_GBP : ""} US$ per £ (${MK ? esc(MK.fx.date) : ""}).` : "Share prices and market values are left out of the public version. Run pipeline/build_markets.py to add them on your own computer."}</div>`;
  }
  const compactNum = v => v >= 1e12 ? (v / 1e12).toFixed(2) + " tn" : v >= 1e9 ? (v / 1e9).toFixed(1) + " bn" : v >= 1e6 ? (v / 1e6).toFixed(0) + " m" : fmtInt(v);
  ecard.addEventListener("click", e => { const b = e.target.closest("[data-cochart]"); if (b) openChart({ companies: [+b.dataset.cochart] }); });

  // ---------- hover, click, select ----------
  function pickZone(e) { if (!map.getLayer("zone-fill") || map.getZoom() < ZONE_Z) return null; const f = map.queryRenderedFeatures(e.point, { layers: ["zone-fill"] })[0]; return f ? { code: f.properties.code, level: "zone" } : null; }
  function pickCompany(e) { if (!map.getLayer("co-pts") || map.getLayoutProperty("co-pts", "visibility") === "none") return null; const b = 4, f = map.queryRenderedFeatures([[e.point.x - b, e.point.y - b], [e.point.x + b, e.point.y + b]], { layers: ["co-pts"] })[0]; return f ? f.properties.i : null; }
  function pick(e) { const z = pickZone(e); if (z) return z; const l = state.level; const f = map.queryRenderedFeatures(e.point, { layers: [l + "-fill"] })[0]; return f ? { code: f.properties.code, level: l } : null; }
  function pickProtest(e) { if (!map.getLayer("pr-pts") || map.getLayoutProperty("pr-pts", "visibility") === "none") return null; const b = 4, f = map.queryRenderedFeatures([[e.point.x - b, e.point.y - b], [e.point.x + b, e.point.y + b]], { layers: ["pr-pts"] })[0]; return f ? f.properties.e : null; }
  function setFS(t, s) { try { map.setFeatureState({ source: SRC[t.level], id: t.code }, s); } catch (e) {} }
  const hoverMs = () => Math.round(1200 * Math.pow(1 - TOOLS.cursor, 1.5) + 60);
  let cand = null, hov = null, timer = null, lastPt = null;
  function clearHover() { clearTimeout(timer); timer = null; if (hov) setFS(hov, { hover: false }); hov = null; hovCode = null; if (!state.pinned) card.hidden = true; }
  map.on("mousemove", e => {
    lastPt = e.point; if (lasso.active || state.tool === "measure") return;
    const pc = pickCompany(e);
    if (pc != null && !ecardPinned) { clearHover(); ecard.className = "card"; ecard.innerHTML = companyHTML(pc, false); ecard.hidden = false; place(e.point.x, e.point.y, ecard); return; }
    const pe = pickProtest(e);
    if (pe != null && !ecardPinned) { clearHover(); ecard.className = "card"; ecard.innerHTML = eventHTML(pe, false); ecard.hidden = false; place(e.point.x, e.point.y, ecard); map.getCanvas().style.cursor = "pointer"; return; }
    if (!ecardPinned) ecard.hidden = true;
    const t = pick(e);
    if (!t) { cand = null; clearHover(); return; }
    if (!cand || cand.code !== t.code) { clearHover(); cand = t; timer = setTimeout(() => { hov = cand; setFS(hov, { hover: true }); if (!state.pinned) showHover(hov.code, lastPt); }, hoverMs()); }
    else if (hov && !state.pinned) place(e.point.x, e.point.y);
  });
  // After Shift-clicking several areas, the view softens around them (as for a search of several places) if the map is
  // left alone for 8 seconds: no panning or zooming, and no click on another area.
  let autoGroupTimer = null;
  function cancelAutoGroup() { clearTimeout(autoGroupTimer); autoGroupTimer = null; }
  function armAutoGroup() {
    cancelAutoGroup(); if (state.sel.length < 2) return;
    autoGroupTimer = setTimeout(() => { autoGroupTimer = null; if (state.sel.length >= 2 && !GROUP && !state.focus) showGroup(state.sel.map(x => x.code)); }, 2000);
  }
  map.on("movestart", e => { if (e.originalEvent) cancelAutoGroup(); });
  map.on("mouseout", () => { cand = null; clearHover(); if (!ecardPinned) ecard.hidden = true; });
  map.on("dragstart", () => { cand = null; clearHover(); });
  map.on("click", e => {
    if (lasso.justDone) { lasso.justDone = false; return; }
    if (state.tool === "measure") return measureClick(e);
    if (map.getLayer("zone-dot") && map.getZoom() < ZONE_Z && map.queryRenderedFeatures([[e.point.x - 5, e.point.y - 5], [e.point.x + 5, e.point.y + 5]], { layers: ["zone-dot"] }).length) { map.flyTo({ center: [-0.1, 51.512], zoom: 11.6, duration: 1200 }); toast("London's financial districts: click a gold tile to explore it."); return; }
    const pc = pickCompany(e);
    if (pc != null) { ecardPinned = true; ecard.className = "card pinned"; ecard.innerHTML = companyHTML(pc, true); ecard.hidden = false; place(e.point.x + 10, e.point.y - 40, ecard); bubbleNudge(); return; }
    const pe = pickProtest(e);
    if (pe != null) { ecardPinned = true; ecard.className = "card pinned"; ecard.innerHTML = eventHTML(pe, true); ecard.hidden = false; place(e.point.x + 10, e.point.y - 40, ecard); return; }
    const t = pick(e);
    if (!t) { unfocus(); clearGroup(); cancelAutoGroup(); return; }
    if (e.originalEvent.shiftKey || state.tool === "select" || state.tool === "lasso") { toggleCompare(t); if (e.originalEvent.shiftKey) armAutoGroup(); return; }
    cancelAutoGroup();
    clearTimeout(timer); if (hov) setFS(hov, { hover: false }); hov = null;
    if (state.focus !== t.code) focus(t.code);
  });
  // Selecting several areas: hold the mouse still for a moment then drag (or Shift-drag) to draw a box; a quick drag still moves the map. The Lasso tool draws any shape.
  // Areas whose centre falls inside the box or shape are added to the selection.
  // Right-click a selected area to deselect it; right-drag a box to deselect several; right-click empty sea to clear them all.
  map.getCanvasContainer().addEventListener("contextmenu", e => e.preventDefault());
  map.on("contextmenu", e => {
    if (e.originalEvent) e.originalEvent.preventDefault();
    if (lasso.justDone) { lasso.justDone = false; return; }
    const t = pick(e);
    if (t && GROUP && GROUP.codes.includes(t.code)) { removeFromGroup(t.code); toast(`${nameOf(t.code)} removed.`); return; }
    const hit = t && state.sel.find(x => x.code === t.code);
    if (hit) { toggleCompare(hit); if (state.pinned) refreshPinned(); toast(`${nameOf(t.code)} deselected.`); return; }
    const sel = state.sel.length;
    if (!t && sel) { clearCompare(); toast(`Selection cleared (${sel} ${sel === 1 ? "area" : "areas"}).`); return; }
    if (!t && GROUP) { clearGroup(); return; }
    if (sel) toast("Right-click a selected area to deselect it, right-drag to deselect several, or right-click the sea to clear all.");
  });
  const lasso = { active: false, timer: null, start: null, el: null, justDone: false, purpose: "select", pts: [] };
  const canvasBox = map.getCanvasContainer();
  canvasBox.addEventListener("mousedown", e => {
    if (e.button === 2 && state.sel.length) { const r = canvasBox.getBoundingClientRect(); lasso.start = { x: e.clientX - r.left, y: e.clientY - r.top }; lasso.right = true; return; }
    if (e.button !== 0 || state.tool === "measure") return;
    const r = canvasBox.getBoundingClientRect(); lasso.start = { x: e.clientX - r.left, y: e.clientY - r.top };
    if (state.tool === "lasso") { armLasso("free"); return; }
    if (e.shiftKey || state.tool === "select") { armLasso("select"); return; }
    clearTimeout(lasso.timer); lasso.timer = setTimeout(() => armLasso("select"), 380);
  });
  canvasBox.addEventListener("mousemove", e => {
    if (!lasso.start) return;
    const r = canvasBox.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    if (!lasso.active) { if (lasso.right && Math.hypot(x - lasso.start.x, y - lasso.start.y) > 4) { armLasso("deselect"); return; } if (Math.hypot(x - lasso.start.x, y - lasso.start.y) > 4) { clearTimeout(lasso.timer); lasso.start = null; } return; }
    if (lasso.purpose === "free") {
      const q = lasso.pts[lasso.pts.length - 1]; if (q && Math.hypot(x - q[0], y - q[1]) < 3) return;
      lasso.pts.push([x, y]); lasso.el.querySelector("path").setAttribute("d", "M" + lasso.pts.map(p => p[0].toFixed(1) + " " + p[1].toFixed(1)).join("L") + "Z"); return;
    }
    Object.assign(lasso.el.style, { left: Math.min(x, lasso.start.x) + "px", top: Math.min(y, lasso.start.y) + "px", width: Math.abs(x - lasso.start.x) + "px", height: Math.abs(y - lasso.start.y) + "px" });
    lasso.end = { x, y };
  });
  const inPoly = (x, y, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
  function selectInside(bx, poly, off) {
    const l = state.level, W = map.getCanvas().clientWidth, H = map.getCanvas().clientHeight;
    const codes = [...new Set(map.queryRenderedFeatures([[Math.max(0, bx[0]), Math.max(0, bx[1])], [Math.min(W, bx[2]), Math.min(H, bx[3])]], { layers: [l + "-fill"] }).map(f => f.properties.code))]
      .filter(c => { const pt = PT[c]; if (!pt) return !poly; const q = map.project(pt); return poly ? inPoly(q.x, q.y, poly) : q.x >= bx[0] && q.x <= bx[2] && q.y >= bx[1] && q.y <= bx[3]; });
    if (off) { // right-drag: deselect every selected area inside the box
      const inBox = x => codes.includes(x.code) || (PT[x.code] && (q => q.x >= bx[0] && q.x <= bx[2] && q.y >= bx[1] && q.y <= bx[3])(map.project(PT[x.code])));
      const gone = state.sel.filter(inBox); gone.forEach(x => setFS(x, { sel: false })); state.sel = state.sel.filter(x => !inBox(x));
      renderTray(); if (state.pinned) refreshPinned(); toast(gone.length ? `Deselected ${gone.length} ${gone.length === 1 ? "area" : "areas"}.` : "Nothing selected inside that box."); return;
    }
    let added = 0; codes.forEach(c => { if (!state.sel.some(s => s.code === c) && state.sel.length < MAX_SEL) { state.sel.push({ code: c, level: l }); setFS({ code: c, level: l }, { sel: true }); added++; } });
    renderTray(); if (state.pinned) refreshPinned(); if (added) armAutoGroup();   // after 2 seconds without moving the map, bring them into focus together
    toast(added ? `Selected ${added} ${added === 1 ? LABEL[l].toLowerCase() : (PLURAL_L[l] || LABEL[l] + "s").toLowerCase()}.${state.sel.length >= MAX_SEL ? ` (limit of ${MAX_SEL})` : ""}` : codes.length ? "Those areas were already selected." : `No ${LABEL[l].toLowerCase()} has its centre inside that shape.`);
  }
  window.addEventListener("mouseup", () => {
    clearTimeout(lasso.timer);
    if (lasso.active) {
      if (lasso.purpose === "free") {
        const pts = lasso.pts;
        if (pts.length > 4) { const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]); selectInside([Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)], pts); lasso.justDone = true; setTimeout(() => { lasso.justDone = false; }, 50); }
      } else {
        const a = lasso.start, b = lasso.end;
        if (b && Math.abs(b.x - a.x) > 6 && Math.abs(b.y - a.y) > 6) { selectInside([Math.min(a.x, b.x), Math.min(a.y, b.y), Math.max(a.x, b.x), Math.max(a.y, b.y)], null, lasso.purpose === "deselect"); lasso.justDone = true; setTimeout(() => { lasso.justDone = false; }, 300); }
      }
      lasso.el.remove(); lasso.active = false; lasso.pts = []; document.body.classList.remove("lasso"); map.dragPan.enable(dragOpts());
    }
    lasso.start = null; lasso.end = null; lasso.right = false;
  });
  function armLasso(purpose) {
    if (!lasso.start) return;
    lasso.active = true; lasso.purpose = purpose; map.dragPan.disable(); document.body.classList.add("lasso"); clearHover();
    if (purpose === "free") {
      lasso.pts = [[lasso.start.x, lasso.start.y]];
      lasso.el = document.createElementNS("http://www.w3.org/2000/svg", "svg"); lasso.el.id = "lasso-shape"; lasso.el.innerHTML = "<path/>"; canvasBox.parentNode.appendChild(lasso.el); return;
    }
    lasso.el = document.createElement("div"); lasso.el.id = "marquee"; if (purpose === "deselect") lasso.el.classList.add("off"); canvasBox.parentNode.appendChild(lasso.el);
    Object.assign(lasso.el.style, { left: lasso.start.x + "px", top: lasso.start.y + "px", width: "0px", height: "0px" });
    if (state.tool !== "select" && purpose === "select") { const p = document.createElement("div"); p.className = "pulse"; p.style.left = lasso.start.x + "px"; p.style.top = lasso.start.y + "px"; canvasBox.parentNode.appendChild(p); setTimeout(() => p.remove(), 600); }
  }
  // ---------- focus ----------
  const veil = $("veil");
  let FX = null;
  function focus(code, opts) {
    const p = P[code]; if (!p) return;
    clearGroup();
    if (p.level === "country") { unfocus(); map.easeTo({ center: HOME, zoom: HOME_Z, duration: 800 }); return; }
    let f = featureOf(code);
    if (!f && p.level === "ward") { loadWards(p.parent); const n = (opts && opts.tries) || 0; if (n < 25) setTimeout(() => focus(code, { tries: n + 1 }), 150); return; }
    if (!f) return;
    if (!map.getSource("focus")) { map.once("idle", () => focus(code, opts)); return; }   // the map is still loading: focus once it can draw
    clearHover(); const first = !state.focus;
    state.focus = code; state.pinned = code; state.editing = false;
    MM = { open: MM && !first ? MM.open : null, group: MM && !first ? MM.group : null, metric: null, seen: new Set() };
    let pts = 0; polysOf(f.geometry).forEach(pl => pts += pl[0].length);
    const step = Math.max(1, Math.ceil(pts / 1500));
    FX = { code, pt: repPoint(f.geometry), bbox: bboxOfGeom(f.geometry), rings: polysOf(f.geometry).map(pl => pl[0].filter((c, i) => i % step === 0)).filter(r => r.length >= 4) };
    map.getSource("focus").setData(f);
    setP("focus-lift", "fill-translate", [0, 0]); setP("focus-edge", "line-translate", [0, 0]);
    setTimeout(() => { setP("focus-lift", "fill-translate", LIFT); setP("focus-edge", "line-translate", LIFT); setP("focus-lift", "fill-opacity", 0.45); setP("focus-edge", "line-opacity", 1); setP("focus-shadow", "line-opacity", 1); }, 30);
    syncFocusColour(); veil.classList.add("on"); document.body.classList.add("focused");
    card.className = "card pinned"; card.innerHTML = cardHTML(code, true); card.hidden = false; hist.hidden = true;
    if (!(opts && opts.noFly)) flyTo(code, 0, true);
    renderMind(); updateOverlay(); bubbleNudge();
  }
  function unfocus() {
    if (!state.focus && !state.pinned) return;
    state.focus = null; state.pinned = null; state.editing = false; FX = null; MM = null;
    veil.classList.remove("on"); document.body.classList.remove("focused"); veil.style.clipPath = ""; veil.style.webkitClipPath = ""; mind.innerHTML = ""; card.hidden = true; hist.hidden = true;
    setP("focus-lift", "fill-opacity", 0); setP("focus-edge", "line-opacity", 0); setP("focus-shadow", "line-opacity", 0);
    setTimeout(() => { if (!state.focus && map.getSource("focus")) map.getSource("focus").setData({ type: "FeatureCollection", features: [] }); }, 320);
    renderTray();
  }
  function syncFocusColour() { if (!FX) return; const c = LAST.fc[FX.code]; setP("focus-lift", "fill-color", c || (look.mode === "dark" ? "#2a3237" : "#ffffff")); }
  function updateOverlay() {
    if (!FX) return;
    const W = window.innerWidth, H = window.innerHeight; let d = `M0 0H${W}V${H}H0Z`;
    FX.rings.forEach(r => { d += "M"; r.forEach((c, i) => { const q = map.project(c); d += (i ? "L" : "") + (q.x + LIFT[0]).toFixed(1) + " " + (q.y + LIFT[1]).toFixed(1); }); d += "Z"; });
    const cp = `path(evenodd, "${d}")`; veil.style.clipPath = cp; veil.style.webkitClipPath = cp;
    layoutMind(); placeFocusCard();
  }
  map.on("render", () => { if (FX) updateOverlay(); if (measure.pts.length || TOOLS.grid !== "off") placeToolLabels(); });
  window.addEventListener("resize", () => { if (FX) updateOverlay(); if (pmOpen) renderPMenu(); });
  function placeFocusCard() {
    if (!FX || card.hidden) return;
    const W = mapW(), H = window.innerHeight, w = card.offsetWidth, h = card.offsetHeight;
    const ne = map.project([FX.bbox[2], FX.bbox[3]]), root = map.project(FX.pt);
    let left = Math.min(ne.x + 28, W - w - 64), top = clamp(root.y - h * 0.35, 60, H - h - 110);
    if (left < root.x + 30) left = Math.min(W - w - 64, root.x + 60);
    card.style.left = Math.max(8, left) + "px"; card.style.top = top + "px";
    if (!hist.hidden) { hist.style.left = clamp(left - hist.offsetWidth + w, 8, W - hist.offsetWidth - 8) + "px"; hist.style.top = clamp(top + h + 8, 60, H - hist.offsetHeight - 100) + "px"; if (top + h + 8 + hist.offsetHeight > H - 100) hist.style.top = clamp(top - hist.offsetHeight - 8, 60, H) + "px"; }
  }

  // mind map: perspectives → groups → metrics → actions
  const mind = $("mind"), NS = "http://www.w3.org/2000/svg";
  let MM = null;
  const mk = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; };
  const ctx2d = document.createElement("canvas").getContext("2d");
  const textW = (t, bold) => { ctx2d.font = `${bold ? "600 " : ""}12px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`; return ctx2d.measureText(t).width; };
  const groupsOf = pid => [...new Set(METRICS.filter(m => m.p === pid).map(m => m.group))];
  function actionsFor(m) {
    return [m.nature !== "text" && { id: "map", label: isMapped(m.id) ? "✓ On the map (click to remove)" : "Add to the map" },
      m.nature === "text" && { id: "card", label: PS.card[m.id] && PS.active[m.id] ? "✓ In the hover card" : "Add to the hover card" },
      m.temporal !== "static" && { id: "chart", label: "Chart over time" },
      m.temporal !== "static" && { id: "hist", label: m.temporal === "event" ? "Protests here over time" : "History strip" },
      { id: "cmp", label: "Compare with other places…" }, { id: "exp", label: "Export to Excel / CSV…" }].filter(Boolean);
  }
  function pillFor(g, label, value, w, swatch) {
    mk("rect", { x: -w, y: -13, width: w, height: 26, rx: 13 }, g);
    if (swatch !== undefined) mk("circle", { cx: -w + 13, cy: 0, r: 5, fill: swatch || "transparent", stroke: swatch ? "rgba(0,0,0,.15)" : "var(--rule)" }, g);
    const t = mk("text", { x: -w + (swatch !== undefined ? 24 : 13), y: 4 }, g); t.textContent = label; if (value != null) { const b = mk("tspan", { "font-weight": 600 }, t); b.textContent = value; }
  }
  const SHOW_MIND = false;   // 0.6.1: the perspectives mind map around a clicked area is switched off; the card stays
  function renderMind() {
    mind.innerHTML = ""; if (!SHOW_MIND || !state.focus || !MM) return;
    const code = state.focus, d = state.date, gS = mk("g", {}, mind), gN = mk("g", {}, mind), items = [];
    const shown = PERSPECTIVES.filter(p => !p.hidden || p.ready);   // Analysis appears only once a result has been put on the map
    shown.forEach((p, i) => items.push({ id: "p:" + p.id, kind: "persp", p, i, n: shown.length }));
    if (MM.open) {
      const gs = groupsOf(MM.open).filter(Boolean), hasG = gs.length > 1;
      if (hasG) gs.forEach((g, i) => items.push({ id: "g:" + g, kind: "group", parent: "p:" + MM.open, grp: g, p: PER[MM.open], i, n: gs.length }));
      if (!hasG || MM.group) {
        const ms = METRICS.filter(m => m.p === MM.open && (!hasG || m.group === MM.group));
        ms.forEach((m, i) => items.push({ id: "m:" + m.id, kind: "metric", parent: hasG ? "g:" + MM.group : "p:" + MM.open, m, p: PER[MM.open], i, n: ms.length }));
        if (MM.metric && ms.some(m => m.id === MM.metric)) actionsFor(M[MM.metric]).forEach((a, i, all) => items.push({ id: "a:" + a.id, kind: "action", parent: "m:" + MM.metric, a, p: PER[MM.open], i, n: all.length }));
      }
    }
    items.forEach(it => {
      const fresh = !MM.seen.has(it.id); MM.seen.add(it.id);
      it.path = mk("path", { class: "strand" + (fresh ? " grow" : ""), stroke: it.p.hue, pathLength: 1 }, gS);
      const g = it.g = mk("g", { class: "node" + (fresh ? " grow" : ""), "data-id": it.id, style: `--c:${it.p.hue}`, role: "button", tabindex: "0" }, gN);
      if (it.kind === "persp") {
        const on = PS.on[it.p.id] && it.p.ready;
        g.classList.toggle("on", on || MM.open === it.p.id); g.classList.toggle("locked", !it.p.ready); g.classList.toggle("dim", !!MM.open && MM.open !== it.p.id);
        mk("circle", { class: "bg", r: 19 }, g);
        const ic = mk("g", { transform: "translate(-10,-10) scale(.833)", fill: "none", stroke: it.p.hue, "stroke-width": 1.8, "stroke-linecap": "round", "stroke-linejoin": "round" }, g); ic.innerHTML = ICON[it.p.id];
        const sub = !it.p.ready ? "not loaded yet" : on ? "on the map" : "";
        mk("text", { x: -26, y: sub ? -1 : 4, "text-anchor": "end" }, g).textContent = it.p.name;
        if (sub) mk("text", { x: -26, y: 12, "text-anchor": "end", class: "sub" }, g).textContent = sub;
        g.setAttribute("aria-label", it.p.name + " perspective");
      } else if (it.kind === "group") {
        const n = METRICS.filter(m => m.p === it.p.id && m.group === it.grp && isMapped(m.id)).length;
        it.w = Math.ceil(textW(it.grp + (n ? `  · ${n} on map` : ""), true) + 26); g.classList.toggle("on", MM.group === it.grp); g.classList.toggle("dim", !!MM.group && MM.group !== it.grp);
        pillFor(g, "", it.grp + (n ? `  · ${n} on map` : ""), it.w);
      } else if (it.kind === "metric") {
        const r = it.m.get(code, d), val = r ? r.text : "—", short = val.length > 34 ? val.slice(0, 33) + "…" : val, lab = it.m.label + ": ";
        it.w = Math.ceil(textW(lab) + textW(short, true) + 38);
        g.classList.toggle("on", MM.metric === it.m.id || isMapped(it.m.id)); g.classList.toggle("dim", !PS.active[it.m.id]);
        const sw = it.m.colour && r && r.v != null && EN.isCat(it.m) ? it.m.colour(r.v) : isMapped(it.m.id) && LAST.fc[code] && ["hue", "shade", "grid", "diverge"].some(c => curPlan[c] === it.m) ? LAST.fc[code] : null;
        pillFor(g, lab, short, it.w, sw); g.setAttribute("aria-label", lab + val);
      } else {
        it.w = Math.ceil(textW(it.a.label) + 26); g.classList.toggle("on", it.a.label.startsWith("✓"));
        mk("rect", { x: -it.w, y: -11, width: it.w, height: 22, rx: 11 }, g); mk("text", { x: -it.w + 13, y: 4 }, g).textContent = it.a.label;
      }
    });
    MM.items = items; layoutMind();
  }
  function layoutMind() {
    if (!MM || !MM.items || !FX) return;
    const H = window.innerHeight, r0 = map.project(FX.pt), root = { x: r0.x + LIFT[0], y: r0.y + LIFT[1] };
    const west = map.project([FX.bbox[0], FX.pt[1]]).x, R1 = clamp(root.x - west + 60, 175, 280), pos = {};
    MM.items.filter(it => it.kind === "persp").forEach(it => { const th = Math.PI - (it.i - (it.n - 1) / 2) * 0.36; pos[it.id] = { x: Math.max(130, root.x + R1 * Math.cos(th)), y: clamp(root.y + R1 * Math.sin(th) * 1.25, 112, H - 120), left: 0 }; });
    const column = (list, anchorX, anchorY, gap, extraBelow) => {
      if (!list.length) return; const maxW = Math.max(...list.map(it => it.w)), left = Math.max(10, anchorX - maxW);
      const h = (list.length - 1) * gap + (extraBelow || 0); let y = clamp(anchorY - h / 2, 112, H - 120 - h);
      list.forEach(it => { pos[it.id] = { x: left + it.w, y, left }; y += gap; if (it.kind === "metric" && "m:" + MM.metric === it.id) { MM.items.filter(a => a.kind === "action").forEach(a => { pos[a.id] = { x: left + 26 + a.w, y: y - 4, left: left + 26 }; y += 29; }); } });
    };
    const groups = MM.items.filter(it => it.kind === "group"), metrics = MM.items.filter(it => it.kind === "metric"), acts = MM.items.filter(it => it.kind === "action");
    const pp = MM.open && pos["p:" + MM.open]; const ppLeft = pp ? pp.x - 26 - textW(PER[MM.open].name) - 30 : 0;
    if (groups.length) { column(groups, ppLeft, pp.y, 33); const gp = MM.group && pos["g:" + MM.group]; if (gp) column(metrics, gp.left - 30, gp.y, 33, acts.length * 29); }
    else if (metrics.length) column(metrics, ppLeft, pp.y, 33, acts.length * 29);
    MM.items.forEach(it => {
      const q = pos[it.id]; if (!q) { it.g.style.display = "none"; it.path.style.display = "none"; return; }
      it.g.setAttribute("transform", `translate(${q.x.toFixed(1)},${q.y.toFixed(1)})`);
      if (it.kind === "action") { const pm = pos[it.parent]; it.path.setAttribute("d", `M${(pm.left + 12).toFixed(1)} ${(pm.y + 13).toFixed(1)}Q${(pm.left + 12).toFixed(1)} ${q.y.toFixed(1)} ${q.left.toFixed(1)} ${q.y.toFixed(1)}`); return; }
      let a;
      if (it.kind === "persp") a = root;
      else { const par = pos[it.parent], pit = MM.items.find(x => x.id === it.parent); a = pit.kind === "persp" ? { x: par.x - 26 - textW(PER[MM.open].name) - 6, y: par.y } : { x: par.left, y: par.y }; }
      const b = it.kind === "persp" ? { x: q.x + 19 * (q.x < a.x ? 1 : -1), y: q.y } : { x: q.x, y: q.y }, dx = Math.max(24, Math.abs(a.x - b.x) * 0.5);
      it.path.setAttribute("d", `M${a.x.toFixed(1)} ${a.y.toFixed(1)}C${(a.x - dx).toFixed(1)} ${a.y.toFixed(1)} ${(b.x + dx).toFixed(1)} ${b.y.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`);
    });
    let dot = mind.querySelector(".root"); if (!dot) dot = mk("circle", { class: "root", r: 5 }, mind); dot.setAttribute("cx", root.x); dot.setAttribute("cy", root.y);
  }
  mind.addEventListener("click", e => {
    const g = e.target.closest(".node"); if (!g || !MM) return;
    const [kind, ...rest] = g.dataset.id.split(":"), id = rest.join(":");
    if (kind === "p") { if (!PER[id].ready) { toast(`${PER[id].name} data isn't loaded yet. Political comes first.`); return; } MM.open = MM.open === id ? null : id; MM.group = null; MM.metric = null; renderMind(); }
    else if (kind === "g") { MM.group = MM.group === id ? null : id; MM.metric = null; renderMind(); }
    else if (kind === "m") { MM.metric = MM.metric === id ? null : id; renderMind(); }
    else {
      const m = M[MM.metric];
      if (id === "map") toggleMapped(m.id);
      else if (id === "card") { PS.active[m.id] = true; PS.card[m.id] = !PS.card[m.id]; repaint(); }
      else if (id === "hist") { HIST = { code: state.focus, metric: m.id }; renderHist(); }
      else if (id === "chart") openChart({ metrics: [m.id], places: [state.focus, ...state.sel.map(s => s.code).filter(c => c !== state.focus)].slice(0, 8) });
      else if (id === "cmp") { addCompare({ code: state.focus, level: P[state.focus].level }); CMP.metrics.add(m.id); openCmp(); }
      else if (id === "exp") openExport({ metrics: [m.id] });
    }
  });
  mind.addEventListener("keydown", e => { if ((e.key === "Enter" || e.key === " ") && e.target.closest(".node")) { e.preventDefault(); e.target.closest(".node").dispatchEvent(new MouseEvent("click", { bubbles: true })); } });

  // ---------- history of one area ----------
  let HIST = null;
  const hist = $("hist");
  function renderHist() {
    if (!HIST) { hist.hidden = true; return; }
    const { code, metric } = HIST, m = M[metric], lv = P[code].level;
    const y0 = m.temporal === "annual" ? SY[0] : +START.slice(0, 4), y1 = +TODAY.slice(0, 4), years = []; for (let y = y0; y <= y1; y++) years.push(y);
    const W = 436, H = 92, L = 4, R = 4, T = 6, bw = (W - L - R) / years.length, X = y => L + (y - y0) * bw, dAt = y => y === y1 ? TODAY : y + "-07-01";
    let body = "", segs = "";
    const agg = false;
    if (m.temporal === "event") {
      const D0 = dayNum("1974-01-01"), byY = {}, mine = new Set();
      PR.sites.forEach(s => { if ([s[3], s[4], ...(UP[s[3]] || [])].includes(code)) mine.add(s[0]); });
      [...mine].forEach(i => { const e = PR.events[i], y = +fromDay(e.t0).slice(0, 4); (byY[y] = byY[y] || []).push(e); });
      const mx = Math.max(1, ...Object.values(byY).map(a => a.length));
      years.forEach(y => { let yy = T + 76; (byY[y] || []).sort((a, b) => a.c - b.c).forEach(e => { const h = 70 / mx; yy -= h; body += `<rect x="${X(y).toFixed(1)}" y="${yy.toFixed(1)}" width="${(bw - .5).toFixed(1)}" height="${(h - .4).toFixed(1)}" fill="${CAUSE_COL[CAUSES[e.c]]}"><title>${y}: ${esc(e.n)}</title></rect>`; }); });
      segs = [...mine].map(i => PR.events[i]).sort((a, b) => b.t0 - a.t0).slice(0, 40).map(e => `<div><i class="sw dot" style="background:${CAUSE_COL[CAUSES[e.c]]}"></i>${esc(e.n)}${e.mid ? ` · ${esc(fmtBig(e.mid))}` : ""}<small>${fromDay(e.t0).slice(0, 4)}</small></div>`).join("") || `<div style="color:var(--ink-3)">No protests recorded here.</div>`;
    } else if (EN.isCat(m) && !agg) {
      years.forEach(y => { const r = m.get(code, dAt(y)); body += `<rect x="${X(y).toFixed(1)}" y="${T + 18}" width="${(bw + .4).toFixed(1)}" height="40" fill="${r && r.v ? m.colour(r.v) : "var(--chip)"}"><title>${y}: ${esc(r ? r.text : "—")}</title></rect>`; });
      const list = m.id === "control" && isLocal(code) ? POL.control[councilOf(code)] : null;
      if (list) segs = list.slice().reverse().map(s => `<div><i class="sw" style="background:${partyCol(s[2])}"></i>${esc(partyName(s[2]))}${s[3] && m.id === "leader_party" ? " · " + esc(s[3]) : ""}<small>${s[0].slice(0, 4)}–${s[1] ? s[1].slice(0, 4) : "now"}</small></div>`).join("");
      else if (m.id === "control" && isPcon(code)) segs = (SPANS[code] || []).slice().reverse().map(x => `<div><i class="sw" style="background:${partyCol(x[2])}"></i>${esc(x[3])} · ${esc(partyName(x[2]))}<small>${x[0].slice(0, 4)}–${x[1] ? x[1].slice(0, 4) : "now"}</small></div>`).join("");
      else if (m.id === "control") segs = (POL.gov[code === LONDON ? LONDON : nationOf(code)] || []).slice().reverse().map(s => { const g = s[2] === "uk"; return `<div><i class="sw" style="background:${g ? "var(--chip)" : partyCol(s[2])}"></i>${g ? esc(s[5]) : esc(s[3] + " · " + partyName(s[2]))}<small>${s[0].slice(0, 4)}–${s[1] ? s[1].slice(0, 4) : "now"}</small></div>`; }).join("");
    } else if (agg) {
      years.forEach(y => { const r = m.get(code, dAt(y)); if (!r || !r.counts) return; let yy = T + 76; Object.keys(PARTY).forEach(k => { const n = r.counts[k]; if (!n) return; const h = 70 * n / r.tot; yy -= h; body += `<rect x="${X(y).toFixed(1)}" y="${yy.toFixed(1)}" width="${(bw + .4).toFixed(1)}" height="${(h + .3).toFixed(1)}" fill="${partyCol(k)}"><title>${y}: ${esc(partyName(k))} ${n} of ${r.tot}</title></rect>`; }); });
      segs = `<div style="color:var(--ink-3)">Each bar is a year: the share of councils by ${m.id === "control" ? "party in control" : "leader's party"}.</div>`;
    } else {
      const vs = years.map(y => { const r = m.get(code, y + "-07-01"); return r && (!r.yr || String(r.yr).startsWith(String(y))) ? r.v : null; }), ok = vs.filter(v => v != null);
      const mx = Math.max(...ok, m.mid != null ? 0 : -Infinity), mn = Math.min(...ok, m.mid != null ? 0 : Infinity), yv = v => T + 76 - 70 * (v - mn) / ((mx - mn) || 1);
      let dd = ""; vs.forEach((v, i) => { if (v == null) return; dd += (dd && vs[i - 1] != null ? "L" : "M") + (X(years[i]) + bw / 2).toFixed(1) + " " + yv(v).toFixed(1); });
      body = (m.mid != null ? `<line x1="${L}" x2="${W - R}" y1="${yv(m.mid)}" y2="${yv(m.mid)}" stroke="var(--rule)"/>` : "") + `<path d="${dd}" fill="none" stroke="${PER[m.p].hue}" stroke-width="2"/><text x="${W - R}" y="${T + 8}" text-anchor="end">max ${esc(ok.length ? m.fmt(mx) : "—")}</text><text x="${W - R}" y="${T + 78}" text-anchor="end">min ${esc(ok.length ? m.fmt(mn) : "—")}</text>`;
    }
    const nowX = X(+state.date.slice(0, 4)) + bw / 2, tks = years.filter(y => y % 10 === 0).map(y => `<text x="${X(y).toFixed(1)}" y="${H - 3}">${y}</text>`).join("");
    hist.innerHTML = `<button class="x" data-x aria-label="Close">×</button><h4>${esc(m.label)} · ${esc(nameOf(code))}</h4><p>${esc(m.desc || "")}. Click the chart to jump to that year.</p>
      <svg viewBox="0 0 ${W} ${H}" id="hist-svg">${body}<line x1="${nowX}" x2="${nowX}" y1="${T}" y2="${T + 78}" stroke="var(--ink)" stroke-dasharray="2 2"/>${tks}</svg><div class="segs">${segs}</div>`;
    hist.hidden = false; placeFocusCard();
    $("hist-svg").onclick = e => { const r = e.currentTarget.getBoundingClientRect(); const y = clamp(y0 + Math.floor(((e.clientX - r.left) / r.width * W - L) / bw), y0, y1); setDate(y === y1 ? TODAY : y + "-07-01"); };
  }
  function closeHist() { if (hist.hidden) return false; HIST = null; hist.hidden = true; return true; }
  hist.addEventListener("click", e => { if (e.target.closest("[data-x]")) closeHist(); });

  // ---------- selection strip ----------
  const tray = $("tray");
  function toggleCompare(t) {
    const i = state.sel.findIndex(s => s.code === t.code);
    if (i >= 0) { setFS(state.sel[i], { sel: false }); state.sel.splice(i, 1); }
    else if (state.sel.length >= MAX_SEL) { toast(`Compare up to ${MAX_SEL} areas at a time.`); return; }
    else { state.sel.push(t); setFS(t, { sel: true }); }
    renderTray(); if (!$("cmp").hidden) renderCmp(); bubbleNudge();
  }
  function addCompare(t) { if (!state.sel.some(s => s.code === t.code)) toggleCompare(t); }
  function clearCompare() { state.sel.forEach(t => setFS(t, { sel: false })); state.sel = []; renderTray(); if (state.pinned) refreshPinned(); }
  const comparable = () => METRICS.filter(m => PS.active[m.id] && PER[m.p].ready);
  function tableHTML(codes, metrics, removable) {
    const d = state.date;
    const cols = metrics.map(m => { const vals = codes.map(c => m.get(c, d)); let lo = Infinity, hi = -Infinity; if (EN.isNum(m)) vals.forEach(r => { if (r && r.v != null) { lo = Math.min(lo, r.v); hi = Math.max(hi, r.v); } }); return { m, vals, lo, hi }; });
    const cell = (col, r) => {
      if (!r) return `<td style="color:var(--ink-3)">—</td>`;
      if (r.nm) return `<td class="nm" title="${esc(r.text)}">n/a</td>`;
      if (EN.isCat(col.m)) return `<td>${r.v ? `<i class="sw" style="background:${col.m.colour(r.v)}"></i>` : ""}${esc(r.text)}</td>`;
      if (EN.isNum(col.m)) { if (r.v == null) return `<td class="num">—</td>`; const k = col.hi > col.lo ? Math.min(4, Math.floor((r.v - col.lo) / (col.hi - col.lo) * 5)) : 2; const bg = col.m.mid != null ? DIV[k] : PER[col.m.p].ramp[k]; return `<td class="num" data-v="${r.v}" style="background:${bg};color:${textOn(bg)}">${esc(col.m.fmt(r.v))}${r.est ? '<sup class="est" title="Estimated">est.</sup>' : ""}</td>`; }
      return `<td>${esc(r.text)}</td>`;
    };
    return `<table class="cmp sortable"><thead><tr><th title="Click to sort">Place</th>${metrics.map(m => `<th title="Click to sort" style="--c:${PER[m.p].hue}">${svgIcon(m.p)}${esc(m.label)}</th>`).join("")}</tr></thead><tbody>
      ${codes.map((c, i) => `<tr data-code="${c}" title="Hover to find it on the map; double-click to focus it"><th>${removable ? `<button class="rm" data-rm="${c}" aria-label="Remove ${esc(nameOf(c))}">×</button>` : ""}${esc(nameOf(c))}<small>${esc(LABEL[P[c].level])}${parentOf(c) && P[parentOf(c)] ? " · " + esc(nameOf(parentOf(c))) : ""}</small></th>${cols.map(col => cell(col, col.vals[i])).join("")}</tr>`).join("")}</tbody></table>`;
  }
  // 0.3.2: no table on the map. A selection shows as a small round button (bottom right); it opens the comparison page.
  const fab = $("cmp-fab");
  function renderTray() {
    tray.hidden = true; const n = state.sel.length;
    fab.hidden = !n; fab.querySelector(".n").textContent = n;
    fab.title = n ? `Compare the ${n} selected ${n === 1 ? "place" : "places"} (right-click an area to deselect it)` : "";
  }
  fab.addEventListener("click", openCmp);
  tray.addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.rm) toggleCompare({ code: b.dataset.rm, level: P[b.dataset.rm].level });
    else if (b.hasAttribute("data-clear")) clearCompare(); else if (b.hasAttribute("data-page")) openCmp();
    else if (b.hasAttribute("data-exp")) openExport({ places: "sel" });
  });

  // ---------- comparison page ----------
  const cmpEl = $("cmp");
  const CMP = { metrics: new Set(METRICS.filter(m => DEF_PS.active[m.id] && m.nature !== "event").map(m => m.id)), x: null, y: null, q: "" };
  function openCmp() { closeMenu(); closePMenu(); closeTools(); closeExport(); closeHist(); cmpEl.hidden = false; renderCmp(); }
  function closeCmp() { if (cmpEl.hidden) return false; cmpEl.hidden = true; return true; }
  function renderCmp() {
    const codes = state.sel.map(s => s.code), ms = METRICS.filter(m => CMP.metrics.has(m.id));
    const side = PERSPECTIVES.map(p => `<h4 style="--c:${p.hue}">${svgIcon(p.id)}${esc(p.name)}</h4>` + (p.ready
      ? METRICS.filter(m => m.p === p.id).map(m => `<label style="--c:${p.hue}"><input type="checkbox" data-cm="${m.id}" ${CMP.metrics.has(m.id) ? "checked" : ""}>${esc(m.label)}</label>`).join("") + `<div class="quick"><button class="btn" data-all="${p.id}">All</button><button class="btn" data-none="${p.id}">None</button></div>`
      : p.planned.map(n => `<label class="dis"><input type="checkbox" disabled>${esc(n)}</label>`).join(""))).join("");
    const usable = ms.filter(m => m.nature !== "text");
    if (!usable.some(m => m.id === CMP.x)) CMP.x = (usable[0] || {}).id || null;
    if (!usable.some(m => m.id === CMP.y) || CMP.y === CMP.x) CMP.y = (usable.find(m => m.id !== CMP.x) || {}).id || null;
    let main = `<section><h3>Places (${codes.length})</h3><div class="chips">${codes.map(c => `<span class="chip">${esc(nameOf(c))}<button data-rmc="${c}" aria-label="Remove ${esc(nameOf(c))}">×</button></span>`).join("")}
      <span class="cmp-add"><input id="cmp-q" placeholder="Add a place…" autocomplete="off" value="${esc(CMP.q)}"><ul id="cmp-hits" hidden></ul></span>${codes.length ? `<button class="btn" data-clearall>Clear</button>` : ""}</div></section>`;
    if (codes.length < 2) main += `<div class="empty-big">Pick at least two places to compare. Add them here, Shift-click them on the map, or hold the mouse still and drag a box over them.</div>`;
    else if (!ms.length) main += `<div class="empty-big">Tick the metrics you want to compare on the left. They can come from the same perspective or different ones.</div>`;
    else {
      main += `<section><h3>Side by side${!isNow() ? " · as of " + esc(longDate(state.date)) : ""}</h3><div style="overflow:auto">${tableHTML(codes, ms, false)}</div><div style="margin-top:8px;display:flex;gap:6px"><button class="btn" data-cexp>Export to Excel / CSV…</button><button class="btn" data-cws>Send table to workspace</button><button class="btn" data-ctile>Send places as a tile</button><button class="btn" data-can>Analyse these metrics…</button></div></section>`;
      main += `<section><h3>Patterns between two metrics</h3>` + (usable.length < 2 ? `<div class="empty-big">Tick two or more metrics to look for a pattern between them.</div>` : patternHTML(codes, M[CMP.x], M[CMP.y], usable)) + `</section>`;
    }
    cmpEl.innerHTML = `<div class="cmp-page" role="dialog" aria-label="Compare"><div class="cmp-top"><div><h2>Compare</h2><p>Choose places and any metrics, from one perspective or several. Uses the date on the time bar.</p></div><button class="btn" data-close>Close</button></div><div class="cmp-side">${side}</div><div class="cmp-main">${main}</div></div>`;
    addFctl(cmpEl, ".cmp-top");
    const q = $("cmp-q"); if (q && CMP.q) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); showCmpHits(); }
  }
  const shortFmt = t => String(t).replace(/ years?$/, "").replace(/ changes?$/, "").replace(/ per km²$/, "").replace(/ protests?$/, "").replace(/ per 100k$/, "");
  function patternHTML(codes, mx, my, usable) {
    const d = state.date, lv = P[codes[0]].level, rel = EN.relate(mx, my);
    const opt = sel => usable.map(m => `<option value="${m.id}" ${m.id === sel ? "selected" : ""}>${esc(PER[m.p].name)} · ${esc(m.label)}</option>`).join("");
    const ctrl = `<label>First metric<select data-ax="x">${opt(CMP.x)}</select></label><label>Second metric<select data-ax="y">${opt(CMP.y)}</select></label><div class="engine"><b>Engine:</b> ${esc(rel.why)}</div>`;
    const all = allCodesAt(lv), pts = all.map(c => { const a = mx.get(c, d), b = my.get(c, d); return a && b && a.v != null && b.v != null ? { c, x: a.v, y: b.v, sel: codes.includes(c) } : null; }).filter(Boolean);
    if (pts.length < 3) return `<div class="scatter-wrap"><div class="empty-big">Not enough areas have both values on this date.</div><div class="scatter-ctrl">${ctrl}</div></div>`;
    if (rel.method === "scatter") {
      const useLog = vs => vs.every(v => v > 0) && Math.max(...vs) / Math.min(...vs) > 40;
      const lx = useLog(pts.map(p => p.x)), ly = useLog(pts.map(p => p.y)), tx = v => lx ? Math.log10(v) : v, ty = v => ly ? Math.log10(v) : v;
      const xs = pts.map(p => tx(p.x)), ys = pts.map(p => ty(p.y)), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
      const W = 600, H = 380, L = 64, R = 16, T = 14, B = 44, sx = v => L + (x1 > x0 ? (tx(v) - x0) / (x1 - x0) : .5) * (W - L - R), sy = v => H - B - (y1 > y0 ? (ty(v) - y0) / (y1 - y0) : .5) * (H - T - B);
      const r = EN.pearson(xs, ys), rho = EN.spearman(pts.map(p => p.x), pts.map(p => p.y)), sel = pts.filter(p => p.sel);
      const tk = (lo, hi, isLog, fmt, ax) => [0, 1, 2, 3, 4].map(i => { const t = lo + (hi - lo) * i / 4, v = isLog ? Math.pow(10, t) : t; return ax === "x" ? `<text x="${L + (W - L - R) * i / 4}" y="${H - B + 16}" text-anchor="middle">${esc(shortFmt(fmt(v)))}</text><line class="ax" x1="${L + (W - L - R) * i / 4}" x2="${L + (W - L - R) * i / 4}" y1="${T}" y2="${H - B}"/>` : `<text x="${L - 6}" y="${H - B - (H - T - B) * i / 4 + 3}" text-anchor="end">${esc(shortFmt(fmt(v)))}</text><line class="ax" x1="${L}" x2="${W - R}" y1="${H - B - (H - T - B) * i / 4}" y2="${H - B - (H - T - B) * i / 4}"/>`; }).join("");
      return `<div class="scatter-wrap"><svg class="sc" viewBox="0 0 ${W} ${H}" role="img" aria-label="Scatter plot">${tk(x0, x1, lx, mx.fmt, "x")}${tk(y0, y1, ly, my.fmt, "y")}
        ${pts.filter(p => !p.sel).map(p => `<circle class="ctx" cx="${sx(p.x).toFixed(1)}" cy="${sy(p.y).toFixed(1)}" r="2.6"><title>${esc(nameOf(p.c))}</title></circle>`).join("")}
        ${sel.map(p => `<circle class="pt" cx="${sx(p.x).toFixed(1)}" cy="${sy(p.y).toFixed(1)}" r="5.5" fill="#3b78b5"><title>${esc(nameOf(p.c))}</title></circle><text class="lbl" x="${(sx(p.x) + 8).toFixed(1)}" y="${(sy(p.y) + 4).toFixed(1)}">${esc(nameOf(p.c))}</text>`).join("")}
        <text x="${(L + W - R) / 2}" y="${H - 6}" text-anchor="middle" style="font-weight:600">${esc(mx.label)}${lx ? " (log scale)" : ""} →</text><text transform="translate(14 ${(T + H - B) / 2}) rotate(-90)" text-anchor="middle" style="font-weight:600">${esc(my.label)}${ly ? " (log scale)" : ""} →</text></svg>
        <div class="scatter-ctrl">${ctrl}<div class="r">Pearson r = ${r == null ? "—" : r.toFixed(2)}<br>Spearman ρ = ${rho == null ? "—" : rho.toFixed(2)}<br><span style="font-family:var(--f);color:var(--ink-2)">${esc(EN.strength(Math.abs(rho || 0) > Math.abs(r || 0) ? rho : r))} across ${pts.length} ${esc(LABEL[lv].toLowerCase())}s</span></div>
        <div style="font-size:11.5px;color:var(--ink-2)">Grey dots: every ${esc(LABEL[lv].toLowerCase())}; blue: your places. If ρ is clearly bigger than r, the link holds in rank order but isn't a straight line.</div></div></div>`;
    }
    if (rel.method === "groups") {
      const cm = rel.cat, nm = rel.num, groups = {};
      pts.forEach(p => { const k = cm === mx ? p.x : p.y, v = cm === mx ? p.y : p.x; (groups[k] = groups[k] || []).push({ v, c: p.c, sel: p.sel }); });
      const keys = Object.keys(groups).sort((a, b) => groups[b].length - groups[a].length).slice(0, 10), vals = [].concat(...keys.map(k => groups[k].map(o => o.v)));
      const useLog = vals.every(v => v > 0) && Math.max(...vals) / Math.min(...vals) > 40, t = v => useLog ? Math.log10(v) : v;
      const lo = Math.min(...vals.map(t)), hi = Math.max(...vals.map(t)), W = 600, rowH = 28, L = 170, R = 20, H = keys.length * rowH + 40, sx = v => L + (hi > lo ? (t(v) - lo) / (hi - lo) : .5) * (W - L - R);
      const e2 = EN.eta2(Object.fromEntries(keys.map(k => [k, groups[k].map(o => o.v)])));
      const rows = keys.map((k, i) => { const g = groups[k].map(o => o.v).sort((a, b) => a - b), med = g[Math.floor(g.length / 2)], y = 20 + i * rowH; return `<text x="${L - 8}" y="${y + 4}" text-anchor="end">${esc(cm.catName(k))} (${g.length})</text>` + groups[k].map(o => `<circle cx="${sx(o.v).toFixed(1)}" cy="${(y + (Math.random() - .5) * 10).toFixed(1)}" r="${o.sel ? 5 : 2.6}" fill="${o.sel ? "#3b78b5" : cm.colour(k)}" opacity="${o.sel ? 1 : .55}"><title>${esc(nameOf(o.c))}: ${esc(nm.fmt(o.v))}</title></circle>`).join("") + `<line x1="${sx(med)}" x2="${sx(med)}" y1="${y - 10}" y2="${y + 10}" stroke="var(--ink)" stroke-width="2.5"/>`; }).join("");
      const axis = [0, 1, 2, 3, 4].map(i => { const tt = lo + (hi - lo) * i / 4, v = useLog ? Math.pow(10, tt) : tt; return `<text x="${L + (W - L - R) * i / 4}" y="${H - 6}" text-anchor="middle">${esc(shortFmt(nm.fmt(v)))}</text>`; }).join("");
      return `<div class="scatter-wrap"><svg class="sc" viewBox="0 0 ${W} ${H}" role="img" aria-label="Values by category">${rows}${axis}</svg><div class="scatter-ctrl">${ctrl}<div class="r">η² = ${e2 == null ? "—" : e2.toFixed(2)}<br><span style="font-family:var(--f);color:var(--ink-2)">${esc(cm.label)} explains ${e2 == null ? "—" : Math.round(e2 * 100) + "%"} of the variation in ${esc(nm.label.toLowerCase())}</span></div><div style="font-size:11.5px;color:var(--ink-2)">One row per category; each dot is an area; the black tick is the middle value (median). Your places are blue.${useLog ? " Log scale." : ""}</div></div></div>`;
    }
    if (rel.method === "crosstab") {
      const ka = [...new Set(pts.map(p => p.x))], kb = [...new Set(pts.map(p => p.y))], t = {};
      pts.forEach(p => { t[p.x + "|" + p.y] = (t[p.x + "|" + p.y] || 0) + 1; });
      const mxn = Math.max(...Object.values(t)), v = EN.cramersV(pts.map(p => [p.x, p.y]));
      const A = ka.sort((a, b) => pts.filter(p => p.x === b).length - pts.filter(p => p.x === a).length).slice(0, 10), B = kb.sort((a, b) => pts.filter(p => p.y === b).length - pts.filter(p => p.y === a).length).slice(0, 8);
      return `<div class="scatter-wrap"><div style="overflow:auto"><table class="cmp xt"><thead><tr><th>${esc(mx.label)} ↓ · ${esc(my.label)} →</th>${B.map(b => `<th><i class="sw" style="background:${my.colour(b)}"></i>${esc(my.catName(b))}</th>`).join("")}</tr></thead><tbody>
        ${A.map(a => `<tr><th><i class="sw" style="background:${mx.colour(a)}"></i>${esc(mx.catName(a))}</th>${B.map(b => { const n = t[a + "|" + b] || 0, bg = n ? mix("#ffffff", "#5b3a8c", 0.15 + 0.75 * n / mxn) : "transparent"; return `<td class="num" style="background:${bg};color:${n ? textOn(bg) : "var(--ink-3)"}">${n || "·"}</td>`; }).join("")}</tr>`).join("")}</tbody></table></div>
        <div class="scatter-ctrl">${ctrl}<div class="r">Cramér's V = ${v == null ? "—" : v.toFixed(2)}<br><span style="font-family:var(--f);color:var(--ink-2)">${esc(EN.strength(v))} across ${pts.length} areas</span></div><div style="font-size:11.5px;color:var(--ink-2)">Each cell counts areas with that pair. Dark cells away from the usual pattern are where to look.</div></div></div>`;
    }
    return `<div class="empty-big">${esc(rel.why)}</div>`;
  }
  function showCmpHits() { const ul = $("cmp-hits"), q = CMP.q.trim().toLowerCase(); if (!ul) return; const hs = q.length < 2 ? [] : searchNames(q); ul.innerHTML = hs.map(c => `<li data-add="${c}">${esc(nameOf(c))}<small>${LABEL[P[c].level]}</small></li>`).join(""); ul.hidden = !hs.length; }
  cmpEl.addEventListener("input", e => { if (e.target.id === "cmp-q") { CMP.q = e.target.value; showCmpHits(); } });
  cmpEl.addEventListener("change", e => { const t = e.target; if (t.dataset.cm) { t.checked ? CMP.metrics.add(t.dataset.cm) : CMP.metrics.delete(t.dataset.cm); renderCmp(); } else if (t.dataset.ax) { CMP[t.dataset.ax] = t.value; renderCmp(); } });
  cmpEl.addEventListener("click", e => {
    if (e.target === cmpEl) return closeCmp();
    const li = e.target.closest("[data-add]"); if (li) { CMP.q = ""; addCompare({ code: li.dataset.add, level: P[li.dataset.add].level }); renderCmp(); return; }
    const b = e.target.closest("button"); if (!b) return;
    if (b.hasAttribute("data-close")) closeCmp(); else if (b.dataset.rmc) toggleCompare({ code: b.dataset.rmc, level: P[b.dataset.rmc].level });
    else if (b.hasAttribute("data-clearall")) { clearCompare(); renderCmp(); }
    else if (b.dataset.all) { METRICS.filter(m => m.p === b.dataset.all).forEach(m => CMP.metrics.add(m.id)); renderCmp(); }
    else if (b.dataset.none) { METRICS.filter(m => m.p === b.dataset.none).forEach(m => CMP.metrics.delete(m.id)); renderCmp(); }
    else if (b.hasAttribute("data-cws")) sendToWS({ type: "table", title: `Table: ${state.sel.length} places`, codes: state.sel.map(x => x.code), metrics: [...CMP.metrics] });
    else if (b.hasAttribute("data-ctile")) sendTile(state.sel.map(x => x.code));
    else if (b.hasAttribute("data-can")) openAnalyse({ metrics: [...CMP.metrics] });
    else if (b.hasAttribute("data-cexp")) openExport({ places: "sel", metrics: [...CMP.metrics] });
  });
  $("open-cmp").addEventListener("click", openCmp);

  // ---------- export (Excel / CSV) ----------
  const expEl = $("export-dlg");
  const EXP = { metrics: new Set(), places: "council", time: "date", from: 2010, to: +TODAY.slice(0, 4), fmt: "xlsx" };
  function openExport(o) {
    o = o || {}; closeMenu(); closePMenu(); closeTools(); closeHist();
    EXP.back = closeCmp() ? "cmp" : null; // only one full page at a time: the comparison closes, with a way back
    EXP.metrics = new Set(o.metrics && o.metrics.length ? o.metrics : (curPlan.notes.filter(n => n.ch).map(n => n.id).concat(comparable().slice(0, 4).map(m => m.id))).slice(0, 8));
    if (o.places) EXP.places = o.places; else EXP.places = state.sel.length >= 2 ? "sel" : state.level;
    expEl.hidden = false; renderExport();
  }
  function closeExport() { if (expEl.hidden) return false; expEl.hidden = true; return true; }
  function exportCodes() { if (EXP.places === "sel") return state.sel.map(s => s.code); if (EXP.places === "country") return [UKC]; return allCodesAt(EXP.places); }
  function exportRows() {
    const ms = METRICS.filter(m => EXP.metrics.has(m.id)), codes = exportCodes();
    const dates = EXP.time === "date" ? [state.date] : (() => { const out = []; for (let y = EXP.from; y <= EXP.to; y++) out.push(y === +TODAY.slice(0, 4) ? TODAY : y + "-07-01"); return out; })();
    const head = ["code", "name", "level", "part_of", "date", ...ms.flatMap(m => [m.id, m.id + "_status"])];
    const rows = [head];
    const cellOf = (m, r) => { if (!r || r.nm) return ""; if (EN.isNum(m) || m.nature === "event") return r.v == null ? "" : +(+r.v).toFixed(4); if (EN.isCat(m)) return r.v == null ? "" : m.catName(r.v); return r.text; };
    dates.forEach(d => codes.forEach(c => rows.push([c, nameOf(c), P[c].level, parentOf(c) && P[parentOf(c)] ? nameOf(parentOf(c)) : "", d, ...ms.flatMap(m => { const r = m.get(c, d); return [cellOf(m, r), statusOf(r, m)]; })])));
    return { rows, ms, codes, dates };
  }
  function renderExport() {
    const groups = PERSPECTIVES.filter(p => p.ready).map(p => `<fieldset><legend style="--c:${p.hue}">${svgIcon(p.id)}${esc(p.name)}</legend>${METRICS.filter(m => m.p === p.id).map(m => `<label><input type="checkbox" data-em="${m.id}" ${EXP.metrics.has(m.id) ? "checked" : ""}>${esc(m.label)}</label>`).join("")}</fieldset>`).join("");
    const n = EXP.metrics.size, codes = exportCodes(), years = EXP.time === "date" ? 1 : Math.max(0, EXP.to - EXP.from + 1), rowsN = codes.length * years;
    const preview = n >= 2 && codes.length ? (() => { const { rows } = exportRowsLimited(6); return `<div style="overflow:auto"><table class="cmp"><thead><tr>${rows[0].map(h => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows.slice(1).map(r => `<tr>${r.map(v => `<td>${esc(v)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`; })() : "";
    setTimeout(() => addFctl(expEl, ".cmp-top"), 0);
    expEl.innerHTML = `<div class="cmp-page exp" role="dialog" aria-label="Export"><div class="cmp-top"><div><h2>Export a table</h2><p>Pick two or more metrics, the places and the dates. Opens in Excel, Numbers, Google Sheets or anything that reads CSV.</p></div><span style="display:flex;gap:6px">${EXP.back ? `<button class="btn" data-eback>← Back to comparison</button>` : ""}<button class="btn" data-close>Close</button></span></div>
      <div class="cmp-side exp-side">${groups}<div class="quick"><button class="btn" data-eall>All</button><button class="btn" data-enone>None</button></div></div>
      <div class="cmp-main"><section><h3>Places</h3><div class="seg wrap">${[["sel", `Selected (${state.sel.length})`], ["country", "United Kingdom"], ["nation", "All nations"], ["region", "All regions"], ["council", "All councils (361)"], ["constituency", "All constituencies (650)"], ["ward", "All wards (8,396)"]].map(([k, l]) => `<button data-ep="${k}" class="${EXP.places === k ? "on" : ""}" ${k === "sel" && !state.sel.length ? "disabled" : ""}>${l}</button>`).join("")}</div></section>
      <section><h3>Dates</h3><div class="seg wrap"><button data-et="date" class="${EXP.time === "date" ? "on" : ""}">On ${esc(longDate(state.date))}</button><button data-et="years" class="${EXP.time === "years" ? "on" : ""}">Every year</button></div>
        ${EXP.time === "years" ? `<div class="yrs">from <input type="number" id="e-from" min="1974" max="${TODAY.slice(0, 4)}" value="${EXP.from}"> to <input type="number" id="e-to" min="1974" max="${TODAY.slice(0, 4)}" value="${EXP.to}"> <small>(one row per place per year, values on 1 July; protests use the window ${esc(winLabel())})</small></div>` : ""}</section>
      <section><h3>Format</h3><div class="seg"><button data-ef="xlsx" class="${EXP.fmt === "xlsx" ? "on" : ""}">Excel (.xlsx)</button><button data-ef="csv" class="${EXP.fmt === "csv" ? "on" : ""}">CSV</button></div><p class="small">Excel files include a second sheet explaining each column: source, units, and how the engine combines areas.</p></section>
      <section><h3>Preview</h3>${n < 2 ? `<div class="empty-big">Tick at least two metrics on the left.</div>` : preview}<p class="small">${fmtInt(rowsN)} rows × ${n + 5} columns.${rowsN > 60000 ? " That's large: it may take a few seconds." : ""}</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn primary" data-edl ${n < 2 || !codes.length ? "disabled" : ""}>Download</button><button class="btn" data-eprot>Download the protest list</button></div></section></div></div>`;
  }
  function exportRowsLimited(k) { const codes = exportCodes().slice(0, k); const ms = METRICS.filter(m => EXP.metrics.has(m.id)); const d = EXP.time === "date" ? state.date : (EXP.to === +TODAY.slice(0, 4) ? TODAY : EXP.to + "-07-01"); const rows = [["code", "name", "date", ...ms.map(m => m.id)]]; codes.forEach(c => rows.push([c, nameOf(c), d, ...ms.map(m => { const r = m.get(c, d); return r && !r.nm ? (EN.isNum(m) ? (r.v == null ? "" : m.fmt(r.v) + (r.est ? " (est.)" : "")) : EN.isCat(m) ? (r.v == null ? "" : m.catName(r.v) + (r.est ? " (est.)" : "")) : r.text) : r && r.nm ? "n/a" : ""; })])); return { rows }; }
  function download(blob, name) { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }
  function aboutRows(ms) {
    const rows = [["column", "label", "perspective", "kind of data", "over time", "how areas are combined", "how this is worked out", "valid at", "source / notes"], ["code", "ONS area code", "", "", "", "", "", "", "ONS Open Geography Portal"], ["date", "date the values refer to", "", "", "", "", "", "", "Atlas time bar"],
      ["<metric>_status", "measured / estimated / missing / not meaningful", "", "", "", "", "Estimated = modelled or notional (e.g. results recalculated on new boundaries); missing is never shown as zero", "", ""]];
    const SRCN = { political: "Wikipedia (council control and leaders, from each council's article); government history compiled by hand", economic: SER ? SER.sources.gdp : "", social: SER ? SER.sources.population : "" };
    ms.forEach(m => rows.push([m.id, m.label, PER[m.p].name, `${m.scale}, ${m.nature}`, m.temporal, m.levels ? "Not combined: recalculated from the underlying votes or counts where valid" : EN.aggregate(m).why, m.how || "", m.levels ? m.levels.join(", ") : "all levels", m.source ? m.source : m.group === G2 ? "Protests: Wikipedia articles and Wikidata (notable protests since 1974); crowd = Wikipedia's estimate; alignment = Atlas lookup (organiser_alignment.csv)" : SRCN[m.p] || ""]));
    rows.push([], ["Exported from Atlas on " + longDate(TODAY) + ". Every value traces to a row of pipeline/sources/MANIFEST.csv in the Atlas repository."]);
    return rows;
  }
  function doExport() {
    const { rows, ms } = exportRows(), stamp = state.date.replace(/-/g, "");
    if (EXP.fmt === "csv") download(new Blob(["﻿" + XL.csv(rows)], { type: "text/csv;charset=utf-8" }), `atlas-${stamp}.csv`);
    else download(XL.build([{ name: "Data", rows }, { name: "About the columns", rows: aboutRows(ms) }]), `atlas-${stamp}.xlsx`);
    toast(`Exported ${fmtInt(rows.length - 1)} rows.`);
  }
  function exportProtests() {
    const rows = [["title", "start", "end", "crowd_low", "crowd_high", "crowd_text", "cause", "stated_causes", "organisers", "parties_named", "organiser_alignment", "places", "councils", "source", "url"]];
    PR.events.forEach((e, i) => { const ss = PR.sites.filter(s => s[0] === i); rows.push([e.n, fromDay(e.t0), e.t1 ? fromDay(e.t1) : "", e.lo || "", e.hi || "", e.st, CAUSES[e.c], e.ct, e.org, e.pa.map(partyName).join("; "), e.al.join("; "), [...new Set(ss.map(s => s[5]))].join("; "), [...new Set(ss.map(s => nameOf(s[3])))].join("; "), e.src, e.u]); });
    if (EXP.fmt === "csv") download(new Blob(["﻿" + XL.csv(rows)], { type: "text/csv;charset=utf-8" }), "atlas-protests.csv");
    else download(XL.build([{ name: "Protests", rows }]), "atlas-protests.xlsx");
    toast(`Exported ${PR.events.length} protests.`);
  }
  expEl.addEventListener("click", e => {
    if (e.target === expEl) return closeExport();
    const b = e.target.closest("button"); if (!b) return;
    if (b.hasAttribute("data-close")) closeExport();
    else if (b.hasAttribute("data-eback")) openCmp();
    else if (b.dataset.ep) { EXP.places = b.dataset.ep; renderExport(); } else if (b.dataset.et) { EXP.time = b.dataset.et; renderExport(); } else if (b.dataset.ef) { EXP.fmt = b.dataset.ef; renderExport(); }
    else if (b.hasAttribute("data-eall")) { METRICS.filter(m => PER[m.p].ready).forEach(m => EXP.metrics.add(m.id)); renderExport(); } else if (b.hasAttribute("data-enone")) { EXP.metrics.clear(); renderExport(); }
    else if (b.hasAttribute("data-edl")) doExport(); else if (b.hasAttribute("data-eprot")) exportProtests();
  });
  expEl.addEventListener("change", e => { const t = e.target; if (t.dataset.em) { t.checked ? EXP.metrics.add(t.dataset.em) : EXP.metrics.delete(t.dataset.em); renderExport(); } else if (t.id === "e-from" || t.id === "e-to") { EXP.from = clamp(+$("e-from").value || 1974, 1974, +TODAY.slice(0, 4)); EXP.to = clamp(+$("e-to").value || EXP.from, EXP.from, +TODAY.slice(0, 4)); renderExport(); } });
  $("open-export").addEventListener("click", () => openExport());

  // ---------- toolbox (top right) ----------
  const tbBtn = $("tools-btn"), tbMenu = $("tools");
  const SLIDERS = [["zoom", "Zoom sensitivity", "How far one scroll zooms"], ["cursor", "Cursor sensitivity", "How quickly the hover card appears, and how far the map glides after a drag"], ["contrast", "Contrast", "Map contrast (0.5 is normal)"], ["overlay", "Overlay strength", "How solid the perspective colours are"], ["soften", "Focus softening", "How much the map around a focused area is blurred and faded"]];
  function renderTools() {
    tbMenu.innerHTML = `<div class="tb-tools">${[["measure", "Measure", "Click points to measure distance; three or more points give an area. Double-click or Esc to finish", '<path d="M3 17 17 3l4 4L7 21z"/><path d="M7 13l2 2M10 10l2 2M13 7l2 2"/>'], ["lasso", "Lasso", "Draw any shape around areas to select them (areas whose centre falls inside)", '<path d="M12 4c5 0 9 2.4 9 5.5S17 15 12 15s-9-2.4-9-5.5S7 4 12 4z"/><path d="M6.5 13.6c-.9 1-1 2.4-.1 3.3.8.8 2.2.8 3-.1M8.8 16.3 8 21"/>'], ["shot", "To workspace", "Send a picture of the map to the workspace", '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M12 9v6M9 12h6"/>'], ["copy", "Copy view", "Copy a picture of the map to paste elsewhere", '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M4 16V5a1 1 0 0 1 1-1h11"/>']].map(([id, l, t, ic]) => `<button data-tool="${id}" class="${state.tool === id ? "on" : ""}" title="${esc(t)}"><svg class="ico" viewBox="0 0 24 24">${ic}</svg>${l}</button>`).join("")}</div>
      <div class="tb-row"><span>Panels</span><div class="seg sm"><button data-hot="0" class="${PS.hot ? "" : "on"}">Always shown</button><button data-hot="1" class="${PS.hot ? "on" : ""}">Near edges</button></div></div>
      <div class="tb-row"><span>Hover cards</span><div class="seg sm"><button data-detail="simple" class="${PS.detail === "simple" ? "on" : ""}">Simple</button><button data-detail="detailed" class="${PS.detail !== "simple" ? "on" : ""}">Detailed</button></div></div>
      <div class="tb-row"><span>Estimated values</span><div class="seg sm"><button data-hatch="1" class="${PS.hatch !== false ? "on" : ""}" title="Estimated areas (e.g. notional results) get diagonal lines">Hatched</button><button data-hatch="0" class="${PS.hatch === false ? "on" : ""}">Plain</button></div></div>
      <div class="tb-row"><span>Grid lines</span><div class="seg sm">${[["off", "Off"], ["deg", "Lat/long"], ["km", "km"]].map(([k, l]) => `<button data-grid="${k}" class="${TOOLS.grid === k ? "on" : ""}">${l}</button>`).join("")}</div></div>
      ${SLIDERS.map(([k, l, t]) => `<div class="tb-slider" title="${esc(t)}"><label for="tb-${k}">${l}</label><input type="range" id="tb-${k}" data-sl="${k}" min="0" max="1" step="0.01" value="${TOOLS[k]}"><input type="number" class="tb-num" data-sn="${k}" min="0" max="1" step="0.01" value="${(+TOOLS[k]).toFixed(2)}" aria-label="${esc(l)} value"></div>`).join("")}
      <div class="tb-foot"><button class="btn" data-treset>Reset to defaults</button><span>All sliders run from 0 to 1.</span></div>`;
  }
  tbBtn.addEventListener("click", () => { const open = tbMenu.hidden; tbMenu.hidden = !open; tbBtn.setAttribute("aria-expanded", String(open)); if (open) renderTools(); });
  tbMenu.addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.tool) { const t = b.dataset.tool; if (t === "copy") copyView(); else if (t === "shot") captureMap(); else setTool(state.tool === t ? null : t); renderTools(); }
    else if (b.dataset.grid) { TOOLS.grid = b.dataset.grid; applyTools(); renderTools(); }
    else if (b.dataset.hot) { PS.hot = b.dataset.hot === "1"; document.body.classList.toggle("hot", PS.hot); savePS(); renderTools(); toast(PS.hot ? "Panels now hide. Move the pointer to the left or bottom edge to bring them back." : "Panels always shown."); }
    else if (b.dataset.detail) { PS.detail = b.dataset.detail; savePS(); renderTools(); }
    else if (b.dataset.hatch) { PS.hatch = b.dataset.hatch === "1"; savePS(); renderTools(); repaint(); }
    else if (b.hasAttribute("data-treset")) { Object.assign(TOOLS, { zoom: 0.5, cursor: 0.5, contrast: 0.5, overlay: 0.5, soften: 0.25, grid: "off" }); applyTools(); renderTools(); }
  });
  tbMenu.addEventListener("input", e => { const t = e.target, k = t.dataset.sl || t.dataset.sn; if (!k) return; const v = clamp(+t.value || 0, 0, 1); TOOLS[k] = v; const o = tbMenu.querySelector(t.dataset.sl ? `[data-sn="${k}"]` : `[data-sl="${k}"]`); if (o) o.value = t.dataset.sl ? v.toFixed(2) : v; applyTools(); });
  const dragOpts = () => ({ linearity: 0.3, maxSpeed: 1400, deceleration: Math.round(2500 * Math.pow(4, 1 - 2 * TOOLS.cursor)) });
  function applyTools() {
    store.set("atlas-13-tools", TOOLS);
    const f = Math.pow(4, 2 * TOOLS.zoom - 1);
    map.scrollZoom.setWheelZoomRate(f / 450); map.scrollZoom.setZoomRate(f / 100);
    if (map.dragPan.isEnabled()) { map.dragPan.disable(); map.dragPan.enable(dragOpts()); }
    map.getCanvas().style.filter = TOOLS.contrast === 0.5 ? "" : `contrast(${(0.5 + TOOLS.contrast).toFixed(2)})`;
    LEVELS.forEach(l => setP("pf-" + l, "fill-opacity", pfOpacity()));
    document.documentElement.style.setProperty("--veil-a", (0.55 * TOOLS.soften).toFixed(3));
    document.documentElement.style.setProperty("--veil-blur", (3 * TOOLS.soften * TOOLS.soften * 1.6).toFixed(2) + "px");
    drawGrid();
  }
  function setTool(t) {
    if (state.tool === "measure" && t !== "measure") finishMeasure(true);
    state.tool = t; document.body.dataset.tool = t || "";
    if (t === "measure") { measure.pts = []; measure.done = false; toast("Click points on the map to measure. Double-click or press Esc to finish."); map.doubleClickZoom.disable(); }
    else map.doubleClickZoom.enable();
    if (t === "lasso") toast("Draw around the areas you want. Areas whose centre falls inside are selected. Click Lasso again to stop.");
    if (t === "select") toast("Drag a box to select areas. Click Select again to stop.");
  }
  // measure
  const measure = { pts: [], done: false, labels: [] };
  function measureClick(e) {
    if (measure.justDragged) { measure.justDragged = false; return; }
    if (measure.done && measure.pts.length > 2 && insideShape(e.point)) return;   // a click on the finished shape doesn't start a new one
    if (measure.done) { measure.pts = []; measure.done = false; measure.from = null; } measure.pts.push([e.lngLat.lng, e.lngLat.lat]); drawMeasure();
  }
  // Dragging a finished shape keeps its real size: every corner keeps its distance and compass bearing from the
  // shape's centre, so a shape moved north looks bigger on the map, as it should (the map stretches towards the poles).
  const RAD = Math.PI / 180;
  function bearingDist(a, b) { const f1 = a[1] * RAD, f2 = b[1] * RAD, dl = (b[0] - a[0]) * RAD; const y = Math.sin(dl) * Math.cos(f2), x = Math.cos(f1) * Math.sin(f2) - Math.sin(f1) * Math.cos(f2) * Math.cos(dl); return [Math.atan2(y, x), haversine(a, b) / R]; }
  function destination(a, brg, ang) { const f1 = a[1] * RAD, l1 = a[0] * RAD; const f2 = Math.asin(Math.sin(f1) * Math.cos(ang) + Math.cos(f1) * Math.sin(ang) * Math.cos(brg)); const l2 = l1 + Math.atan2(Math.sin(brg) * Math.sin(ang) * Math.cos(f1), Math.cos(ang) - Math.sin(f1) * Math.sin(f2)); return [l2 / RAD, f2 / RAD]; }
  const centreOf = pts => { let x = 0, y = 0; pts.forEach(p => { x += p[0]; y += p[1]; }); return [x / pts.length, y / pts.length]; };
  function insideShape(pt) { const poly = measure.pts.map(p => { const q = map.project(p); return [q.x, q.y]; }); return inPoly(pt.x, pt.y, poly); }
  map.getCanvasContainer().addEventListener("mousedown", e => {
    if (e.button !== 0 || state.tool !== "measure" || !measure.done || measure.pts.length < 3) return;
    const r = map.getCanvasContainer().getBoundingClientRect(), pt = { x: e.clientX - r.left, y: e.clientY - r.top };
    if (!insideShape(pt)) return;
    e.preventDefault(); e.stopPropagation(); map.dragPan.disable(); document.body.classList.add("dragging");
    const c0 = centreOf(measure.pts), shape = measure.pts.map(p => bearingDist(c0, p)), grab = map.unproject([pt.x, pt.y]);
    const off = [c0[0] - grab.lng, c0[1] - grab.lat]; let moved = false;
    const mv = ev => { moved = true; const q = map.unproject([ev.clientX - r.left, ev.clientY - r.top]), c = [q.lng + off[0], q.lat + off[1]]; measure.pts = shape.map(([b, d]) => destination(c, b, d)); drawMeasure(); };
    const up = () => { window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", up); map.dragPan.enable(dragOpts()); document.body.classList.remove("dragging"); if (moved) { measure.justDragged = true; setTimeout(() => { measure.justDragged = false; }, 300); } };
    window.addEventListener("mousemove", mv); window.addEventListener("mouseup", up);
  }, true);
  // a place's own outline as a shape to drag (from its card): compare its real size with anywhere else
  function outlineToMeasure(code) {
    const f = featureOf(code); if (!f) return;
    const ring = polysOf(f.geometry).reduce((b, pl) => ringArea(pl[0]) > ringArea(b) ? pl[0] : b, polysOf(f.geometry)[0][0]);
    const step = Math.max(1, Math.ceil(ring.length / 400));
    unfocus(); setTool("measure"); if (!tbMenu.hidden) renderTools();
    measure.pts = ring.filter((p, i) => i % step === 0).map(p => [p[0], p[1]]); measure.done = true; measure.from = nameOf(code); drawMeasure();
    toast(`${nameOf(code)}'s outline: drag it anywhere to compare sizes. It keeps its real size. Esc to finish.`);
  }
  map.on("dblclick", e => { if (state.tool === "measure") { e.preventDefault(); finishMeasure(false); } });
  function finishMeasure(clear) { measure.done = true; if (clear) { measure.pts = []; drawMeasure(); } else { drawMeasure(); toast("Measurement kept. Click to start a new one; choose Measure again to stop."); } }
  function drawMeasure() {
    const pts = measure.pts, feats = measure.done && pts.length > 30 ? [] : pts.map(p => ({ type: "Feature", geometry: { type: "Point", coordinates: p } }));   // no corner dots on a traced outline
    if (pts.length > 1) feats.push({ type: "Feature", geometry: { type: "LineString", coordinates: pts } });
    if (pts.length > 2 && measure.done) feats.push({ type: "Feature", geometry: { type: "Polygon", coordinates: [[...pts, pts[0]]] } });
    if (map.getSource("tool")) map.getSource("tool").setData({ type: "FeatureCollection", features: feats });
    placeToolLabels();
  }
  function measureText() {
    const pts = measure.pts; if (pts.length < 2) return "";
    let d = 0; for (let i = 1; i < pts.length; i++) d += haversine(pts[i - 1], pts[i]);
    const km = v => v >= 100 ? fmtInt(v) + " km" : v >= 1 ? v.toFixed(2) + " km" : Math.round(v * 1000) + " m";
    let t = `Distance: ${km(d)} (${(d * 0.621371).toFixed(d * .62 >= 10 ? 0 : 2)} miles)`;
    if (pts.length > 2 && measure.done) { const a = sphArea(pts); t = `${measure.from ? `<b>${esc(measure.from)}</b> (true size)<br>` : ""}Area: ${a >= 10 ? fmtInt(a) : a.toFixed(2)} km² · perimeter ${km(d + haversine(pts[pts.length - 1], pts[0]))}<br><small>Drag the shape to lay it over another place</small>`; }
    return t;
  }
  // grid lines
  const gridLabels = $("grid-labels");
  function drawGrid() {
    if (!map.getSource("grid")) return;
    if (TOOLS.grid === "off") { map.getSource("grid").setData({ type: "FeatureCollection", features: [] }); gridLabels.innerHTML = ""; return; }
    const b = map.getBounds(), w = b.getWest() - 1, e = b.getEast() + 1, s = b.getSouth() - 1, n = b.getNorth() + 1, feats = [], labs = [];
    if (TOOLS.grid === "deg") {
      const span = Math.max(e - w, n - s), step = [10, 5, 2, 1, 0.5, 0.25, 0.1, 0.05, 0.02, 0.01].find(x => span / x >= 6) || 0.01;
      for (let x = Math.ceil(w / step) * step; x <= e; x += step) { feats.push({ type: "Feature", properties: { major: Math.abs(x % (step * 5)) < 1e-9 ? 1 : 0 }, geometry: { type: "LineString", coordinates: [[x, s], [x, n]] } }); labs.push(["x", x, (Math.abs(x).toFixed(step < 1 ? (step < 0.1 ? 2 : 1) : 0)) + "°" + (x < 0 ? "W" : "E")]); }
      for (let y = Math.ceil(s / step) * step; y <= n; y += step) { feats.push({ type: "Feature", properties: { major: 0 }, geometry: { type: "LineString", coordinates: [[w, y], [e, y]] } }); labs.push(["y", y, y.toFixed(step < 1 ? (step < 0.1 ? 2 : 1) : 0) + "°N"]); }
    } else {
      const lat0 = map.getCenter().lat, kmPerLon = 111.32 * Math.cos(lat0 * Math.PI / 180), spanKm = (e - w) * kmPerLon;
      const step = [200, 100, 50, 20, 10, 5, 2, 1, 0.5, 0.2, 0.1].find(x => spanKm / x >= 6) || 0.1, dLat = step / 110.574, dLon = step / kmPerLon, c = map.getCenter();
      for (let i = Math.floor((w - c.lng) / dLon); c.lng + i * dLon <= e; i++) { const x = c.lng + i * dLon; feats.push({ type: "Feature", properties: { major: i % 5 === 0 ? 1 : 0 }, geometry: { type: "LineString", coordinates: [[x, s], [x, n]] } }); if (i) labs.push(["x", x, (i * step) + " km"]); }
      for (let i = Math.floor((s - c.lat) / dLat); c.lat + i * dLat <= n; i++) { const y = c.lat + i * dLat; feats.push({ type: "Feature", properties: { major: i % 5 === 0 ? 1 : 0 }, geometry: { type: "LineString", coordinates: [[w, y], [e, y]] } }); if (i) labs.push(["y", y, (i * step) + " km"]); }
      labs.push(["note", 0, `${step} km squares, measured from the centre of the view (approximate away from it)`]);
    }
    map.getSource("grid").setData({ type: "FeatureCollection", features: feats });
    gridLabels.dataset.labs = JSON.stringify(labs); placeToolLabels();
  }
  map.on("moveend", () => { if (TOOLS.grid !== "off") drawGrid(); });
  function placeToolLabels() {
    const ml = $("measure-label"); const t = measureText();
    if (t && measure.pts.length) { const q = map.project(measure.done && measure.pts.length > 2 ? centreOf(measure.pts) : measure.pts[measure.pts.length - 1]); ml.innerHTML = t; ml.hidden = false; ml.style.left = (q.x + 12) + "px"; ml.style.top = (q.y - 10) + "px"; } else ml.hidden = true;
    if (TOOLS.grid === "off" || !gridLabels.dataset.labs) return;
    const H = window.innerHeight; gridLabels.innerHTML = JSON.parse(gridLabels.dataset.labs).map(([ax, v, l]) => { if (ax === "note") return `<span class="gnote">${esc(l)}</span>`; const q = ax === "x" ? map.project([v, map.getCenter().lat]) : map.project([map.getCenter().lng, v]); return ax === "x" ? `<span style="left:${q.x}px;top:${H - 112}px">${esc(l)}</span>` : `<span style="left:${window.innerWidth - 70}px;top:${q.y}px">${esc(l)}</span>`; }).join("");
  }
  // copy view
  function canvasRegion(bx) {
    const cv = map.getCanvas(), sc = cv.width / cv.clientWidth, out = document.createElement("canvas");
    const [x0, y0, x1, y1] = bx || [0, 0, cv.clientWidth, cv.clientHeight];
    out.width = Math.round((x1 - x0) * sc); out.height = Math.round((y1 - y0) * sc) + Math.round(22 * sc);
    const g = out.getContext("2d"); g.fillStyle = "#ffffff"; g.fillRect(0, 0, out.width, out.height);
    g.drawImage(cv, x0 * sc, y0 * sc, (x1 - x0) * sc, (y1 - y0) * sc, 0, 0, (x1 - x0) * sc, (y1 - y0) * sc);
    g.fillStyle = "#56656b"; g.font = `${Math.round(11 * sc)}px system-ui, sans-serif`;
    const layers = curPlan.notes.filter(n => n.ch).map(n => M[n.id].label).join(", ");
    g.fillText(`Atlas · ${longDate(state.date)}${layers ? " · " + layers : ""} · ONS, Wikipedia, © OpenStreetMap, OS`, 6 * sc, out.height - 7 * sc);
    return out;
  }
  function copyView() {
    map.triggerRepaint();
    map.once("render", () => canvasRegion().toBlob(b => {
      if (navigator.clipboard && window.ClipboardItem) navigator.clipboard.write([new ClipboardItem({ "image/png": b })]).then(() => toast("Copied a picture of the map. Paste it anywhere."), () => { download(b, `atlas-${state.date}.png`); toast("This browser blocked copying pictures, so it was saved instead."); });
      else { download(b, `atlas-${state.date}.png`); toast("Saved a picture of the map."); }
    }));
  }


  // ---------- charts: the bubble (bottom right), the chart panel, and tabs ----------
  const bubble = $("chart-bubble"), cpanel = $("chartp"), tabsEl = $("tabs"), tabview = $("tabview");
  const PRICE_START = 2000;
  const PRICE = { id: "__price", label: "Share price", p: "markets", scale: "ratio", nature: "rate", temporal: "annual", fmt: v => v.toLocaleString("en-GB", { maximumFractionDigits: 1 }) };
  const CHART = { metrics: [], places: [], companies: [], style: null, drawn: false, from: 1990, to: +TODAY.slice(0, 4), rebase: true, index: false };
  const yearNow = () => +state.date.slice(0, 4) + (+state.date.slice(5, 7) - 1) / 12;
  function chartContext() { const out = []; if (GROUP) out.push(...GROUP.codes); if (state.focus) out.push(state.focus); state.sel.forEach(x => { if (!out.includes(x.code)) out.push(x.code); }); return out.slice(0, 8); }
  function defaultMetric() {
    const on = curPlan.notes.filter(n => n.ch).map(n => M[n.id]).filter(m => m.nature !== "site" && m.nature !== "event" && m.temporal !== "static");
    return (on.find(m => EN.isNum(m)) || on[0] || M.control).id;
  }
  function bubbleNudge() { if (!cpanel.hidden) { if (CHART.drawn) renderChartBody(); return; } bubble.classList.remove("nudge"); void bubble.offsetWidth; bubble.classList.add("nudge"); bubble.title = "Chart what you're looking at"; }
  function spanFor(ms) { let a = +TODAY.slice(0, 4); ms.forEach(m => { a = Math.min(a, m.id === "__price" ? PRICE_START : m.temporal === "annual" ? (SY[0] || 1998) : 1974); }); return a; }
  function openChart(o) {
    o = o || {};
    CHART.companies = o.companies || [];
    CHART.places = o.places ? o.places.filter(Boolean) : CHART.companies.length ? [] : chartContext();
    if (!CHART.places.length && !CHART.companies.length) CHART.places = [UKC, "E92000001", "S92000003", "W92000004", "N92000002"];
    CHART.metrics = CHART.companies.length ? ["__price"] : (o.metrics || [defaultMetric()]);
    CHART.rebase = CHART.companies.length > 1; CHART.index = false;
    CHART.from = spanFor(CHART.metrics.map(mOf)); CHART.to = +TODAY.slice(0, 4);
    CHART.style = o.style || null; CHART.drawn = !!o.style;
    cpanel.hidden = false; bubble.classList.remove("nudge"); bubble.classList.add("open"); document.body.classList.add("charting"); renderChartPanel();
  }
  const mOf = id => id === "__price" ? PRICE : M[id];
  function chartStylesFor(spec) { const ms = spec.metrics.map(mOf); return EN.chartStyles(ms, spec.companies.length || spec.places.length); }
  function priceSeries(spec) {
    const out = spec.companies.map((i, k) => { const c = COS[i]; let pts = c.px.map(p => [+p[0].slice(0, 4) + (+p[0].slice(5, 7) - 1) / 12, p[1]]).filter(p => p[0] >= spec.from && p[0] < spec.to + 1); return { name: c.n, colour: CH.PALETTE[k % 10], pts }; });
    if (spec.index && MK) out.push({ name: "FTSE 100 index", colour: "#1f2a2e", pts: MK.index.map(p => [+p[0].slice(0, 4) + (+p[0].slice(5, 7) - 1) / 12, p[1]]).filter(p => p[0] >= spec.from && p[0] < spec.to + 1) });
    if (spec.rebase || spec.index) out.forEach(s => { const b = (s.pts.find(p => p[1] != null) || [0, 0])[1]; if (b) s.pts = s.pts.map(p => [p[0], p[1] / b * 100]); });
    return out;
  }
  function chartData(spec) { // returns { series, rows, items, label, fmt } for the first metric
    const m = mOf(spec.metrics[0]);
    if (spec.companies.length) { const series = priceSeries(spec); const rb = spec.rebase || spec.index; return { m, series, items: series.map(s => ({ name: s.name, v: (s.pts.filter(p => p[1] != null).slice(-1)[0] || [])[1], colour: s.colour })), label: rb ? "Share price, rebased (first month = 100)" : "Share price (pence)", fmt: rb ? (v => v.toFixed(0)) : PRICE.fmt }; }
    const series = spec.places.map((c, k) => ({ name: nameOf(c), colour: CH.PALETTE[k % 10], pts: EN.isNum(m) ? seriesOf(m, c, spec.from, spec.to, 1) : [] }));
    const rows = EN.isCat(m) ? spec.places.map(c => ({ name: nameOf(c), cells: bandOf(m, c, spec.from, spec.to, 1) })) : [];
    const items = spec.places.map((c, k) => { const r = m.get(c, state.date); return { code: c, name: nameOf(c), v: r ? r.v : null, cat: r && EN.isCat(m) ? r.v : null, colour: EN.isCat(m) && r && r.v ? m.colour(r.v) : CH.PALETTE[k % 10], size: popAt(c, state.date) || 1, counts: r && r.counts }; });
    return { m, series, rows, items, label: m.label, fmt: m.fmt || (v => v) };
  }
  function drawChart(spec, w) {
    const st = spec.style, D = chartData(spec), m = D.m, o = { w, h: Math.round(w * 0.48), vfmt: D.fmt, yfmt: v => CH.compact(v), mid: m.mid, now: yearNow() };
    const numItems = D.items.filter(i => i.v != null && typeof i.v === "number");
    switch (st) {
      case "line": return CH.line(D.series, o);
      case "area": return CH.area(D.series, o);
      case "bars": return CH.bars(D.series, o);
      case "slope": return CH.slope(D.series, o);
      case "ranked": return CH.ranked(numItems, o);
      case "band": return CH.band(D.rows, o);
      case "pie": {
        if (EN.isCat(m)) { const one = D.items.length === 1 && D.items[0].counts; const n = {}; if (one) Object.assign(n, D.items[0].counts); else D.items.forEach(i => { if (i.cat) n[i.cat] = (n[i.cat] || 0) + 1; }); return CH.pie(Object.entries(n).map(([k, v]) => ({ name: m.catName(k), v, colour: m.colour(k) })), Object.assign(o, { centre: one ? "share" : D.items.length + " places", vfmt: v => +v.toFixed(2) })); }
        return CH.pie(numItems.map(i => ({ name: i.name, v: i.v, colour: i.colour })), o);
      }
      case "dual": { const a = mOf(spec.metrics[0]), b = mOf(spec.metrics[1]); const S = mm => spec.places.map((c, k) => ({ name: nameOf(c), colour: CH.PALETTE[k % 10], pts: seriesOf(mm, c, spec.from, spec.to, 1) })); return CH.dual({ label: a.label, fmt: v => CH.compact(v), series: S(a) }, { label: b.label, fmt: v => CH.compact(v), series: S(b) }, o); }
      case "multiples": return CH.multiples(spec.metrics.map(id => { const mm = mOf(id), so = { w: 360, h: 170, vfmt: mm.fmt, yfmt: v => CH.compact(v), mid: mm.mid, now: yearNow() };
        return { title: mm.label, svg: EN.isNum(mm) ? CH.line(spec.places.map((c, k) => ({ name: nameOf(c), colour: CH.PALETTE[k % 10], pts: seriesOf(mm, c, spec.from, spec.to, 1) })), so) : CH.band(spec.places.map(c => ({ name: nameOf(c), cells: bandOf(mm, c, spec.from, spec.to, 1) })), so) }; }));
      case "dye": return CH.dye(numItems, o);
      case "scale": return numItems.length >= 2 ? CH.scale(numItems[0], numItems[1], o) : CH.scale({}, {}, o);
      case "orbits": {
        const lv = spec.places.length ? lvlOf(spec.places[0]) : "council", all = lv === "zone" ? [] : allCodesAt(lv === "country" ? "nation" : lv).map(c => { const r = m.get(c, state.date); return r && r.v; }).filter(v => v != null);
        all.sort((a, b) => a - b);   // the median, so one extreme area (e.g. the City of London) can't drag the centre
        return CH.orbits(numItems, Object.assign(o, { avg: all.length ? all[Math.floor(all.length / 2)] : null, centreLabel: `typical ${LABEL[lv] ? LABEL[lv].toLowerCase() : "area"} (median)` }));
      }
      case "tree": {
        const kids = c => { const l = lvlOf(c); return l === "council" ? Object.keys(P).filter(w => P[w].level === "ward" && P[w].parent === c) : l === "zone" ? [] : (UNDER[c] || []).filter(k => l !== "region" || P[k].parent === c); };
        const br = EN.isNum(m) ? breaksFor(m, "council", 5).breaks : null;
        const branches = (spec.places.length ? spec.places : [UKC]).map(c => ({ name: nameOf(c), leaves: kids(c).slice(0, 40).map(k => { const r = m.get(k, state.date); const v = r && r.v; return { name: nameOf(k), v, label: r ? r.text : "—", size: popAt(k, state.date) || 1, colour: v == null ? "#ccc" : EN.isCat(m) ? m.colour(v) : PER[m.p].ramp[EN.classOf(v, br)] }; }) }));
        return CH.tree(branches, o);
      }
    }
    return CH.line(D.series, o);
  }
  function chartCSV(spec) {
    const D = chartData(spec), rows = [["place", "year", D.label]];
    if (D.series.length) D.series.forEach(s => s.pts.forEach(p => rows.push([s.name, +p[0].toFixed(3), p[1] == null ? "" : +(+p[1]).toFixed(4)])));
    else if (D.rows.length) D.rows.forEach(r => r.cells.forEach(c => rows.push([r.name, c[0], c[2]])));
    return XL.csv(rows);
  }
  const STYLE_ICON = { line: "M3 17l5-6 4 3 7-9", area: "M3 18l5-6 4 3 7-9V18z", bars: "M5 18V9M10 18V5M15 18v-7M20 18v-4", slope: "M5 6l14 10M5 16l14-8M5 4v16M19 4v16", ranked: "M4 6h14M4 11h10M4 16h6", band: "M3 8h6M9 8h7M16 8h5M3 14h9M12 14h9", pie: "M12 3a9 9 0 1 0 9 9h-9z", dual: "M3 16l6-5 4 3 8-8M3 7l6 4 4-2 8 6", multiples: "M3 3h8v8H3zM13 3h8v8h-8zM3 13h8v8H3zM13 13h8v8h-8z",
    dye: "M7 4l1 16h8l1-16M8 12h8", scale: "M12 3v18M5 7h14M5 7l-3 7h6zM19 7l-3 7h6z", orbits: "M12 12m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0M12 3a9 9 0 1 1 0 18a9 9 0 1 1 0-18", tree: "M12 21V9M12 13l-5-4M12 11l5-4M7 9a3 3 0 1 1 0-.1M17 7a3 3 0 1 1 0-.1M12 6a3 3 0 1 1 0-.1" };
  const sIcon = id => `<svg class="ico" viewBox="0 0 24 24"><path d="${STYLE_ICON[id] || ""}"/></svg>`;
  function specNow() { return { metrics: CHART.metrics.slice(), places: CHART.places.slice(), companies: CHART.companies.slice(), style: CHART.style, from: CHART.from, to: CHART.to, rebase: CHART.rebase, index: CHART.index }; }
  function whatHTML(spec, prefix) {
    const cand = METRICS.filter(m => PER[m.p].ready && m.nature !== "text" && m.nature !== "site" && m.nature !== "event" && m.temporal !== "static" && !spec.metrics.includes(m.id));
    return `<div class="cp-row"><b>Metric</b><div class="chips">${spec.metrics.map(id => `<span class="chip" style="--c:${PER[mOf(id).p].hue}">${esc(mOf(id).label)}${spec.metrics.length > 1 ? `<button data-${prefix}rmm="${id}" aria-label="Remove">×</button>` : ""}</span>`).join("")}
        ${spec.companies.length ? "" : `<select data-${prefix}addm aria-label="Add a metric"><option value="">+ add a metric…</option>${PERSPECTIVES.filter(p => p.ready).map(p => `<optgroup label="${esc(p.name)}">${cand.filter(m => m.p === p.id).map(m => `<option value="${m.id}">${esc(m.label)}</option>`).join("")}</optgroup>`).join("")}</select>`}</div></div>
      <div class="cp-row"><b>${spec.companies.length ? "Companies" : "Places"}</b><div class="chips">${spec.companies.length ? spec.companies.map(i => `<span class="chip">${esc(COS[i].n)}${spec.companies.length > 1 ? `<button data-${prefix}rmc="${i}" aria-label="Remove">×</button>` : ""}</span>`).join("") : spec.places.map(c => `<span class="chip">${esc(nameOf(c))}${spec.places.length > 1 ? `<button data-${prefix}rmp="${c}" aria-label="Remove">×</button>` : ""}</span>`).join("") + `<small class="tip">Shift-click areas on the map to add them</small>`}</div></div>
      <div class="cp-row"><b>Years</b><span class="yrs"><input type="number" data-${prefix}from value="${spec.from}" min="1974" max="${TODAY.slice(0, 4)}"> to <input type="number" data-${prefix}to value="${spec.to}" min="1974" max="${TODAY.slice(0, 4)}"></span>
        ${spec.companies.length ? `<label class="ck"><input type="checkbox" data-${prefix}rebase ${spec.rebase ? "checked" : ""}>Rebase to 100</label><label class="ck"><input type="checkbox" data-${prefix}index ${spec.index ? "checked" : ""}>Add FTSE 100 index</label>` : ""}</div>`;
  }
  function stylesHTML(spec, compact, prefix) {
    const { styles, best } = chartStylesFor(spec), cur = spec.style || best;
    const card = st => `<button class="sty${st.id === cur ? " on" : ""}${st.ok ? "" : " no"}" data-${prefix}style="${st.id}" ${st.ok ? "" : "disabled"} title="${esc(st.why)}">${sIcon(st.id)}<span>${esc(st.label)}</span>${st.id === best && !compact ? "<em>simple</em>" : ""}</button>`;
    const plain = styles.filter(x => !x.story), story = styles.filter(x => x.story);
    if (compact) return `<div class="sty-row">${plain.filter(x => x.ok).map(card).join("")}<span class="sty-sep">Story</span>${story.filter(x => x.ok).map(card).join("")}</div>`;
    return `<div class="sty-pick"><p>How should Atlas draw this? <small>Simple charts first; greyed styles don't suit this choice (hover for why).</small></p><div class="sty-grid">${plain.map(card).join("")}</div>
      <p class="sty-h">Story views <small>(experimental: the same numbers, drawn as things in the world)</small></p><div class="sty-grid story">${story.map(card).join("")}</div>
      <button class="btn primary" data-${prefix}draw ${best ? "" : "disabled"}>Draw ${esc(((styles.find(x => x.id === cur) || {}).label || "chart").toLowerCase())}</button></div>`;
  }
  function renderChartPanel() {
    const spec = specNow(), ctx = spec.companies.length ? `${spec.companies.length} compan${spec.companies.length === 1 ? "y" : "ies"}` : `${spec.places.length} place${spec.places.length === 1 ? "" : "s"}`;
    cpanel.innerHTML = `<div class="cp-head"><b>Chart</b><span class="cp-sub">${esc(ctx)}${!isNow() ? " · as of " + esc(dmy(state.date)) : ""}</span><button class="btn" data-cpws title="Send this chart to the workspace">→ Workspace</button><button class="btn" data-cptab title="Open this chart full screen in its own tab">Open in tab</button><button class="x" data-cpx aria-label="Close">×</button></div>
      <div class="cp-what">${whatHTML(spec, "c")}</div><div class="cp-styles">${stylesHTML(spec, CHART.drawn, "c")}</div><div class="cp-body" id="cp-body"></div>
      ${CHART.drawn ? `<div class="cp-foot"><button class="btn" data-ccsv>Copy data (CSV)</button><span class="tip">Pie, ranked and story views use the date on the time bar.</span></div>` : ""}`;
    if (CHART.drawn) renderChartBody();
    addFctl(cpanel, ".cp-head");
  }
  function renderChartBody() { const b = $("cp-body"); if (!b) return; if (!CHART.style) CHART.style = chartStylesFor(specNow()).best; b.innerHTML = drawChart(specNow(), Math.max(360, cpanel.offsetWidth - 30)); }
  function editSpec(target, ds, el) { // shared by the panel (target = CHART) and tabs
    if (ds.rmm) { target.metrics = target.metrics.filter(x => x !== ds.rmm); target.from = Math.max(target.from, spanFor(target.metrics.map(mOf))); }
    else if (ds.rmp) target.places = target.places.filter(x => x !== ds.rmp);
    else if (ds.rmc) target.companies = target.companies.filter(x => x !== +ds.rmc);
    else if (ds.style) { target.style = ds.style; if (target === CHART) CHART.drawn = true; }
    else return false;
    const ok = chartStylesFor(target).styles.find(x => x.id === target.style); if (!ok || !ok.ok) target.style = chartStylesFor(target).best;
    return true;
  }
  cpanel.addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    const ds = Object.fromEntries(Object.entries(b.dataset).map(([k, v]) => [k.replace(/^c/, "").replace(/^./, x => x.toLowerCase()), v]));
    if (b.hasAttribute("data-cpx")) { closeChart(); return; }
    if (b.hasAttribute("data-cpws")) { if (!CHART.style) CHART.style = chartStylesFor(specNow()).best; const sp = specNow(); sendToWS({ type: "chart", title: (sp.companies.length ? (sp.companies.length === 1 ? COS[sp.companies[0]].n : sp.companies.length + " companies") : sp.metrics.map(id => mOf(id).label).join(" & ")) + (sp.places.length && sp.places.length <= 3 ? " · " + sp.places.map(nameOf).join(", ") : sp.places.length ? ` · ${sp.places.length} places` : ""), spec: sp }); return; }
    if (b.hasAttribute("data-cptab")) { if (!CHART.style) CHART.style = chartStylesFor(specNow()).best; openTab(specNow()); closeChart(); return; }
    if (b.hasAttribute("data-cdraw")) { CHART.style = CHART.style || chartStylesFor(specNow()).best; CHART.drawn = true; renderChartPanel(); return; }
    if (b.hasAttribute("data-ccsv")) { copy(chartCSV(specNow())); return; }
    if (b.dataset.cstyle && !CHART.drawn) { CHART.style = b.dataset.cstyle; renderChartPanel(); return; }   // choosing before drawing
    if (editSpec(CHART, ds)) renderChartPanel();
  });
  function specInput(target, el) {
    const k = Object.keys(el.dataset)[0] || "", key = k.replace(/^[ct]/, "");
    if (key === "addm" && el.value) { target.metrics.push(el.value); target.from = spanFor(target.metrics.map(mOf)); }
    else if (key === "from") target.from = clamp(+el.value || 1974, 1974, target.to);
    else if (key === "to") target.to = clamp(+el.value || target.from, target.from, +TODAY.slice(0, 4));
    else if (key === "rebase") target.rebase = el.checked; else if (key === "index") target.index = el.checked;
    else return false;
    const ok = chartStylesFor(target).styles.find(x => x.id === target.style); if (target.style && (!ok || !ok.ok)) target.style = chartStylesFor(target).best;
    return true;
  }
  cpanel.addEventListener("change", e => { if (specInput(CHART, e.target)) renderChartPanel(); });
  function closeChart() { cpanel.hidden = true; bubble.classList.remove("open"); document.body.classList.remove("charting"); }
  bubble.addEventListener("click", () => { if (!cpanel.hidden) return closeChart(); openChart(); });
  // tabs: the map is always the first tab; any chart can open full screen in its own tab
  const TABS = [{ id: "map", label: "Map" }, { id: "ws", label: "Workspace" }]; let activeTab = "map", tabSeq = 0;
  function openTab(spec) {
    const m = mOf(spec.metrics[0]), label = (spec.companies.length ? (spec.companies.length === 1 ? COS[spec.companies[0]].n : spec.companies.length + " companies") : (spec.metrics.length > 1 ? spec.metrics.length + " metrics" : m.label)) + (spec.places.length === 1 ? " · " + nameOf(spec.places[0]) : "");
    const t = { id: "t" + (++tabSeq), label, spec: JSON.parse(JSON.stringify(spec)) }; TABS.push(t); activateTab(t.id);
  }
  function renderTabs() {
    const on = t => t.id === "map" ? VIEW.mode !== "ws" && (activeTab === "map" || activeTab === "split" || VIEW.mode === "split") : t.id === "ws" ? VIEW.mode !== "map" : t.id === activeTab;
    const icon = t => t.id === "map" ? `<svg class="ico" viewBox="0 0 24 24"><path d="M9 4 3 6.5v13.5l6-2.5 6 2.5 6-2.5V4l-6 2.5z"/></svg>` : t.id === "ws" ? `<svg class="ico" viewBox="0 0 24 24"><rect x="3" y="4" width="8" height="7" rx="1"/><rect x="13" y="4" width="8" height="11" rx="1"/><rect x="3" y="13" width="8" height="7" rx="1"/></svg>` : sIcon(t.spec.style);
    const label = t => t.id === "ws" ? `Workspace${proj().items.length ? ` (${proj().items.length})` : ""}` : t.label;
    tabsEl.innerHTML = TABS.map(t => `<button class="tab${on(t) ? " on" : ""}" data-tab="${t.id}">${icon(t)}<span>${esc(label(t).length > 28 ? label(t).slice(0, 27) + "…" : label(t))}</span>${t.id === "map" || t.id === "ws" ? "" : `<i data-tabx="${t.id}" aria-label="Close tab">×</i>`}</button>`).join("") +
      `<button class="tab tool${VIEW.mode === "split" ? " on" : ""}" data-split title="Map and workspace side by side (drag the divider to change the share)"><svg class="ico" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M12 4v16"/></svg></button><button class="tab tool" data-overview title="All tabs (or swipe up over the top bar)"><svg class="ico" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg></button>`;
    tabsEl.hidden = false; document.body.classList.add("has-tabs");
  }
  function activateTab(id) {
    activeTab = id; renderTabs(); const t = TABS.find(x => x.id === id);
    if (!t || id === "map" || id === "ws" || id === "split") { tabview.hidden = true; return; }
    const spec = t.spec, D = mOf(spec.metrics[0]);
    tabview.innerHTML = `<div class="tv-wrap"><div class="tv-head"><h2>${esc(t.label)}</h2><span class="cp-sub">${!isNow() ? "As of " + esc(longDate(state.date)) + " · " : ""}${spec.companies.length ? esc(MK ? MK.sources : "") : esc(D.desc || "")}</span><button class="btn" data-tcsv>Copy data (CSV)</button><button class="btn" data-tback>Back to the map</button></div>
      <div class="cp-what">${whatHTML(spec, "t")}</div><div class="cp-styles">${stylesHTML(spec, true, "t")}</div><div class="tv-body">${drawChart(spec, Math.min(1100, window.innerWidth - 80))}</div></div>`;
    tabview.hidden = false;
  }
  tabsEl.addEventListener("click", e => { const x = e.target.closest("[data-tabx]"); if (x) { const i = TABS.findIndex(t => t.id === x.dataset.tabx); TABS.splice(i, 1); activateTab(activeTab === x.dataset.tabx ? "map" : activeTab); e.stopPropagation(); return; } if (e.target.closest("[data-split]")) { setView(VIEW.mode === "split" ? "map" : "split"); return; } if (e.target.closest("[data-overview]")) { openOverview(); return; } const b = e.target.closest("[data-tab]"); if (b) goTab(b.dataset.tab); });
  tabview.addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return; const t = TABS.find(x => x.id === activeTab); if (!t) return;
    if (b.hasAttribute("data-tback")) return activateTab("map");
    if (b.hasAttribute("data-tcsv")) return copy(chartCSV(t.spec));
    const ds = Object.fromEntries(Object.entries(b.dataset).map(([k, v]) => [k.replace(/^t/, "").replace(/^./, x => x.toLowerCase()), v]));
    if (editSpec(t.spec, ds)) activateTab(t.id);
  });
  tabview.addEventListener("change", e => { const t = TABS.find(x => x.id === activeTab); if (t && specInput(t.spec, e.target)) activateTab(t.id); });

  // ---------- hot zones: panels hide until the pointer nears an edge ----------
  let hotT = null;
  document.addEventListener("mousemove", e => {
    if (!PS.hot) return;
    const L = e.clientX < 36 || !!e.target.closest("#dock,#legend,#pmenu"), B = e.clientY > window.innerHeight - 44 || !!e.target.closest("#timebar,#tray");
    document.body.classList.toggle("show-left", L); document.body.classList.toggle("show-bottom", B);
  });
  // ---------- notes drawer (right edge) ----------
  const notesEl = $("notes"), notesH = $("notes-handle");
  E.notes = E.notes || [];
  function renderNotes() {
    notesEl.innerHTML = `<div class="nt-head"><b>Notes</b><button class="x" data-ntx aria-label="Close">×</button></div>
      <textarea id="nt-text" placeholder="A thought, a pattern to check, a question for Ruben…"></textarea><label class="ck"><input type="checkbox" id="nt-view" checked>Remember this map view and date</label><button class="btn primary" data-ntadd>Add note</button>
      <div class="nt-list">${E.notes.slice().reverse().map(n => `<div class="nt"><p>${esc(n.text)}</p><small>${new Date(n.t).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}${n.view ? ` · view of ${esc(dmy(n.view.date))}` : ""}</small><span>${n.view ? `<button class="btn" data-ntgo="${n.id}">Go there</button>` : ""}<button class="btn" data-ntdel="${n.id}" aria-label="Delete note">×</button></span></div>`).join("") || `<div class="tip">No notes yet. Notes are saved in this browser and included when you export your edits.</div>`}</div>`;
  }
  notesH.addEventListener("click", () => { notesEl.hidden = !notesEl.hidden; notesH.classList.toggle("open", !notesEl.hidden); if (!notesEl.hidden) { renderNotes(); $("nt-text").focus(); } });
  notesEl.addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.hasAttribute("data-ntx")) { notesEl.hidden = true; notesH.classList.remove("open"); }
    else if (b.hasAttribute("data-ntadd")) { const t = $("nt-text").value.trim(); if (!t) return; const c = map.getCenter(); E.notes.push({ id: "n" + Date.now(), text: t, t: Date.now(), view: $("nt-view").checked ? { center: [+c.lng.toFixed(4), +c.lat.toFixed(4)], zoom: +map.getZoom().toFixed(2), date: state.date, focus: state.focus } : null }); persist(); renderNotes(); toast("Note saved."); }
    else if (b.dataset.ntgo) { const n = E.notes.find(x => x.id === b.dataset.ntgo); if (n && n.view) { setDate(n.view.date); map.flyTo({ center: n.view.center, zoom: n.view.zoom, duration: 1200 }); } }
    else if (b.dataset.ntdel) { E.notes = E.notes.filter(x => x.id !== b.dataset.ntdel); persist(); renderNotes(); }
  });
  // ---------- labels for the district tiles ----------
  const zoneLabels = $("zone-labels");
  const ZONE_PT = ZONES.map(f => ({ code: f.properties.code, pt: ptFeature(f).geometry.coordinates }));
  function placeZoneLabels() {
    if (!MK || map.getZoom() < ZONE_Z - 0.2) { zoneLabels.innerHTML = ""; return; }
    zoneLabels.innerHTML = ZONE_PT.map(z => { const q = map.project(z.pt); const n = cosIn(z.code).length; return `<span style="left:${q.x}px;top:${q.y}px"><b>${esc(nameOf(z.code))}</b>${n} FTSE 100 head office${n === 1 ? "" : "s"}</span>`; }).join("");
  }
  map.on("render", placeZoneLabels);


  // ---------- floating windows: drag by the header, resize from the corner, expand or shrink ----------
  // Used by the chart panel, the comparison page, the export page and the Analyse window, so the map stays usable behind them.
  function floating(el, handleSel, key, def) {
    el.classList.add("fwin");
    const fit = p => ({ x: clamp(p.x, 4, innerWidth - 120), y: clamp(p.y, 50, innerHeight - 40), w: clamp(p.w, 300, innerWidth - 8), h: clamp(p.h, 120, innerHeight - 56) });
    const st = fit(Object.assign({}, def(), store.get(key, {})));
    const apply = () => { Object.assign(el.style, { left: st.x + "px", top: st.y + "px", width: st.w + "px", height: el.classList.contains("shrunk") ? "" : st.h + "px", right: "auto", bottom: "auto" }); };
    apply();
    el.addEventListener("pointerdown", e => {
      const h = e.target.closest(handleSel); if (!h || e.button || e.target.closest("button,input,select,textarea,a,label,[contenteditable]")) return;
      e.preventDefault(); const ox = e.clientX - st.x, oy = e.clientY - st.y; el.classList.add("dragging"); h.setPointerCapture(e.pointerId);
      const mv = ev => { Object.assign(st, fit({ x: ev.clientX - ox, y: ev.clientY - oy, w: st.w, h: st.h })); apply(); };
      const up = () => { h.removeEventListener("pointermove", mv); el.classList.remove("dragging"); store.set(key, st); };
      h.addEventListener("pointermove", mv); h.addEventListener("pointerup", up, { once: true });
    });
    resizable(el, null, { minW: 300, minH: 140, done: () => { st.w = el.offsetWidth; st.h = el.offsetHeight; store.set(key, st); el.dispatchEvent(new Event("fwin-resized")); } });
    if (window.ResizeObserver) new ResizeObserver(() => { if (el.hidden || el.classList.contains("shrunk") || el.classList.contains("maxed")) return; const w = el.offsetWidth, h = el.offsetHeight; if (Math.abs(w - st.w) > 2 || Math.abs(h - st.h) > 2) { st.w = w; st.h = h; store.set(key, st); clearTimeout(el._rt); el._rt = setTimeout(() => el.dispatchEvent(new Event("fwin-resized")), 250); } }).observe(el);
    el.addEventListener("click", e => {
      const b = e.target.closest("[data-fmax],[data-fshrink]"); if (!b) return;
      if (b.hasAttribute("data-fmax")) { el.classList.remove("shrunk"); if (el.classList.toggle("maxed")) { el._prev = Object.assign({}, st); Object.assign(st, { x: 8, y: 54, w: innerWidth - 16, h: innerHeight - 62 }); } else if (el._prev) Object.assign(st, el._prev); apply(); el.dispatchEvent(new Event("fwin-resized")); }
      else { el.classList.toggle("shrunk"); apply(); }
    });
    el.addEventListener("dblclick", e => { if (e.target.closest(handleSel) && !e.target.closest("button,input,select")) el.querySelector("[data-fmax]") && el.querySelector("[data-fmax]").click(); });
    return st;
  }
  const FCTL = `<span class="fctl"><button type="button" data-fshrink title="Shrink to the title bar (click again to open)">–</button><button type="button" data-fmax title="Expand to fill the screen (click again to restore)">⤢</button></span>`;
  function addFctl(el, handleSel) { const h = el.querySelector(handleSel); if (h && !h.querySelector(".fctl")) { const close = h.querySelector("[data-close],[data-cpx],[data-anx]"); if (close) close.insertAdjacentHTML("beforebegin", FCTL); else h.insertAdjacentHTML("beforeend", FCTL); } }

  // ---------- interactive tables: sort by any column, hover a row to find the place, click to focus it ----------
  document.addEventListener("click", e => {
    const th = e.target.closest("table.cmp thead th"); if (!th || e.target.closest("button")) return;
    const table = th.closest("table"), i = [...th.parentNode.children].indexOf(th), tb = table.tBodies[0]; if (!tb) return;
    const dir = th.dataset.dir === "asc" ? "desc" : "asc"; table.querySelectorAll("thead th").forEach(x => { delete x.dataset.dir; }); th.dataset.dir = dir;
    const val = tr => { const c = tr.children[i]; if (!c) return ""; const v = c.dataset.v; return v != null && v !== "" && !isNaN(+v) ? +v : c.textContent.trim().toLowerCase(); };
    [...tb.rows].sort((a, b) => { const x = val(a), y = val(b); return (x < y ? -1 : x > y ? 1 : 0) * (dir === "asc" ? 1 : -1); }).forEach(r => tb.appendChild(r));
  });
  let rowHov = null;
  document.addEventListener("mouseover", e => {
    const tr = e.target.closest("table.cmp tbody tr[data-code]"), code = tr && tr.dataset.code;
    if (rowHov && rowHov !== code) { setFS({ code: rowHov, level: P[rowHov] && P[rowHov].level }, { hover: false }); rowHov = null; }
    if (code && P[code] && code !== rowHov) { setFS({ code, level: P[code].level }, { hover: true }); rowHov = code; }
  });
  document.addEventListener("dblclick", e => { const tr = e.target.closest("table.cmp tbody tr[data-code]"); if (tr && P[tr.dataset.code]) focus(tr.dataset.code); });

  // ---------- Analyse: compare variables across all places (or within one area, or over time), not just chosen places ----------
  const ST = window.AtlasStats, anEl = $("analyse");
  const AN = Object.assign({ metrics: [], level: "council", within: UKC, mode: "across", place: UKC, method: null, outcome: null, k: 0, split: "", corr: "pearson" }, store.get("atlas-16-an", {}));
  AN.metrics = (AN.metrics || []).filter(id => M[id]);
  const saveAN = () => store.set("atlas-16-an", { metrics: AN.metrics, level: AN.level, within: AN.within, mode: AN.mode, place: AN.place, corr: AN.corr });
  const anMetricsAll = () => METRICS.filter(m => PER[m.p] && PER[m.p].ready && EN.isNum(m) && m.p !== "analysis");
  const anCats = () => METRICS.filter(m => PER[m.p] && PER[m.p].ready && EN.isCat(m) && m.p !== "analysis");
  const LEVEL_OPTS = () => [["council", "Councils"], ["constituency", "Westminster constituencies"], ["region", "Regions"], ["nation", "Nations"], ["ward", "Wards (England & Wales)"]].concat(ZONES.length ? [["zone", "Financial districts"]] : []).filter(([l]) => Object.keys(P).some(c => P[c].level === l));
  const WITHIN_OPTS = () => [[UKC, "the whole UK"]].concat(["E92000001", "S92000003", "W92000004", "N92000002"].map(c => [c, nameOf(c)]), Object.keys(P).filter(c => c.startsWith("E12")).sort().map(c => [c, nameOf(c)]), state.sel.length ? [["sel", `my selection (${state.sel.length})`]] : []);
  function insideArea(code, area) {
    if (area === UKC) return true; const p = P[code]; if (!p || !P[area]) return false;
    if (P[area].level === "nation") return nationOf(code) === area;
    if (p.level === "council" || p.level === "constituency") return p.parent === area;
    if (p.level === "ward") return P[p.parent] && P[p.parent].parent === area;
    if (p.level === "zone") return area === LONDON;
    return code === area;
  }
  function anCodes(cfg) {
    if (cfg.within === "sel") return state.sel.map(x => x.code);
    return Object.keys(P).filter(c => P[c].level === cfg.level && !P[c].to && insideArea(c, cfg.within));
  }
  const nbrCache = {};
  function neighbours(codes) { // the 6 nearest places to each place (by centre point), for spatial statistics
    const key = codes.length + codes[0] + codes[codes.length - 1]; if (nbrCache[key]) return nbrCache[key];
    const pt = codes.map(c => { const q = (P[c] && P[c].pt) || PT[c] || (featureOf(c) && repPoint(featureOf(c).geometry)); return q ? [q[0] * Math.cos(q[1] * Math.PI / 180), q[1]] : null; });
    return (nbrCache[key] = pt.map((a, i) => a ? pt.map((b, j) => b && j !== i ? [j, (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2] : null).filter(Boolean).sort((x, y) => x[1] - y[1]).slice(0, 6).map(x => x[0]) : []));
  }
  function withDate(d, fn) { const save = state.date; state.date = d; try { return fn(); } finally { state.date = save; } }
  const vals = (m, codes, d) => codes.map(c => { const r = m.get(c, d); return r && r.v != null && isFinite(r.v) ? +r.v : null; });
  const fmtOf = m => m.fmt || (v => CH.compact(v));
  const pct = v => Math.round(v * 100) + "%";
  // which methods suit this choice (the engine's job: explain what each one does)
  function anMethods(cfg) {
    const k = cfg.metrics.length, over = cfg.mode === "time";
    if (!k) return [];
    if (over) return k === 1 ? [["trend", "Trend over time"]] : [["timeline", "Side by side over time"], ["lag", "Do they move together? (lagged)"]];
    if (k === 1) return [["dist", "Distribution"], ["spatial", "Spatial pattern (hot spots)"]];
    if (k === 2) return [["rel", "Relationship"], ["byarea", "Within each area"], ["dist2", "Each distribution"]];
    return [["matrix", "Correlation matrix"], ["partial", "Partial correlations"], ["reg", "Regression"], ["pca", "Components (what moves together)"], ["cluster", "Clusters (similar places)"], ["unusual", "Unusual places"]];
  }
  const METHOD_WHY = {
    dist: "How the values are spread across places: the middle, the spread, any lopsidedness (skew) and outliers.",
    spatial: "Whether similar values sit next to each other on the map (Moran's I), and where the hot spots (high near high) and cold spots are. Significance is tested by shuffling values between places.",
    rel: "How the two metrics move together across places: three correlation measures (Pearson for straight lines, Spearman and Kendall for any steady rise or fall, robust to outliers), a fitted line, and how much of one the other explains (R²).",
    byarea: "The same relationship measured separately inside each nation or region, to see whether it holds everywhere or only in some places (a link that holds overall can reverse inside areas).",
    dist2: "The spread of each metric on its own, side by side.",
    matrix: "Every pair of metrics at once. Blue: they rise together; red: one rises as the other falls. Stars mark links unlikely to be chance (p < 0.05).",
    partial: "Each pair's link after holding all the other metrics fixed. A link that vanishes here was explained by the others.",
    reg: "Predicts one metric (the outcome) from all the others together. Standardised effects show which predictor matters most; the leftovers (residuals) show where places do better or worse than predicted.",
    pca: "Finds a few underlying patterns (components) that summarise many metrics: which metrics rise and fall together, and each place's score on each pattern.",
    cluster: "Sorts places into groups with similar profiles across all the metrics (k-means on standardised values; the number of groups is chosen by how well separated they are).",
    unusual: "How far each place is from the typical place across all metrics at once (Mahalanobis distance), allowing for how the metrics relate to each other.",
    trend: "How the metric has changed over time in one place: yearly change, average growth, and the biggest rises and falls.",
    timeline: "The metrics over time in one place, each on its own scale.",
    lag: "Whether the metrics move together over the years, and whether one leads the other. Uses year-on-year changes, because two things that both grow over time look related even when they aren't.",
  };
  function anRows(cfg) { return withDate(cfg.date || state.date, () => { const codes = anCodes(cfg), ms = cfg.metrics.map(id => M[id]).filter(Boolean); return { codes, ms, cols: ms.map(m => vals(m, codes, cfg.date || state.date)) }; }); }
  function anResult(cfg, w) { // -> { title, html, csv, map } for one method; pure given cfg, so the workspace can re-run it
    w = w || 640;
    const { codes, ms, cols: raw } = anRows(cfg), method = cfg.method, d = cfg.date || state.date, where = cfg.within === "sel" ? "your selection" : cfg.within === UKC ? "the UK" : nameOf(cfg.within);
    const lvl = (LEVEL_OPTS().find(o => o[0] === cfg.level) || [0, "places"])[1].toLowerCase(), unit = cfg.within === "sel" ? "places" : lvl;
    const head = (t, sub) => `<h3 class="anh">${esc(t)}</h3><p class="ansub">${esc(sub)}</p>`;
    const caveat = txt => `<p class="ancav">${esc(txt)}</p>`;
    const out = { title: "", html: "", csv: null, map: null };
    // extreme places (beyond 3 × the interquartile range from the middle half) can dominate means, Pearson, regression and clusters
    const far = raw.map(col => { const ok = col.filter(v => v != null && isFinite(v)); if (ok.length < 8) return col.map(() => 0); const D = ST.describe(ok); return col.map(v => v == null || !(D.iqr > 0) ? 0 : Math.max(0, (D.q1 - v) / D.iqr - 3, (v - D.q3) / D.iqr - 3)); });
    const extreme = far.map(col => col.map(x => x > 0)), sev = i => Math.max(...far.map(col => col[i]));
    const extremeCodes = codes.map((c, i) => [c, sev(i)]).filter(x => x[1] > 0).sort((a, b) => b[1] - a[1]).map(x => x[0]);
    const cols = cfg.trim ? raw.map((col, j) => col.map((v, i) => extreme.some(e => e[i]) ? null : v)) : raw;
    const trimNote = () => cfg.mode === "time" || !extremeCodes.length ? "" : cfg.trim
      ? `<p class="antrim">Leaving out ${extremeCodes.length} extreme place${extremeCodes.length > 1 ? "s" : ""}: ${extremeCodes.slice(0, 6).map(c => `<a data-go="${c}">${esc(nameOf(c))}</a>`).join(", ")}${extremeCodes.length > 6 ? "…" : ""}. <button class="btn" data-antrim="0">Put them back</button></p>`
      : `<p class="antrim">${extremeCodes.length} extreme place${extremeCodes.length > 1 ? "s" : ""} (${extremeCodes.slice(0, 4).map(c => `<a data-go="${c}">${esc(nameOf(c))}</a>`).join(", ")}${extremeCodes.length > 4 ? "…" : ""}) can pull averages, Pearson and fitted lines. <button class="btn" data-antrim="1">Leave them out</button></p>`;
    out.trim = trimNote();
    if (cfg.mode === "time") {
      const place = cfg.place || UKC, y0 = Math.max(1974, ...ms.map(m => spanFor([m]))), y1 = +TODAY.slice(0, 4);
      const series = ms.map((m, i) => ({ name: m.label, colour: CH.PALETTE[i % 10], pts: seriesOf(m, place, y0, y1, 1), fmt: fmtOf(m) }));
      out.csv = XL.csv([["year", ...ms.map(m => m.label)], ...series[0].pts.map((p, i) => [p[0], ...series.map(s => s.pts[i] && s.pts[i][1] != null ? +(+s.pts[i][1]).toFixed(4) : "")])]);
      if (method === "trend") {
        const m = ms[0], pts = series[0].pts.filter(p => p[1] != null); if (pts.length < 3) return Object.assign(out, { title: m.label, html: `<div class="aempty">Not enough years with values for ${esc(nameOf(place))}.</div>` });
        const fit = ST.regress(pts.map(p => p[0]), pts.map(p => p[1])), first = pts[0], last = pts[pts.length - 1], yrs = last[0] - first[0];
        const cagr = first[1] > 0 && last[1] > 0 && yrs ? (Math.pow(last[1] / first[1], 1 / yrs) - 1) * 100 : null;
        const ch = pts.slice(1).map((p, i) => ({ y: p[0], d: p[1] - pts[i][1] })).sort((a, b) => Math.abs(b.d) - Math.abs(a.d)).slice(0, 3);
        out.title = `${m.label} over time · ${nameOf(place)}`;
        out.html = head(out.title, `${first[0]}–${last[0]}, ${pts.length} years`) + CH.line(series, { w, h: Math.round(w * .45), vfmt: fmtOf(m), mid: m.mid, now: yearNow() }) +
          `<ul class="anstat"><li>From <b>${esc(fmtOf(m)(first[1]))}</b> in ${first[0]} to <b>${esc(fmtOf(m)(last[1]))}</b> in ${last[0]}${cagr != null ? `: average growth <b>${cagr.toFixed(1)}% a year</b>` : ""}.</li>
          <li>Straight-line trend: <b>${esc(fmtOf(m)(fit.slope))}</b> a year (R² = ${fit.r2.toFixed(2)}, ${ST.pText(fit.p)}).</li><li>Biggest one-year moves: ${ch.map(c => `${c.y} (${c.d > 0 ? "+" : ""}${esc(fmtOf(m)(c.d))})`).join(", ")}.</li></ul>`;
        return out;
      }
      if (method === "timeline") { out.title = `${ms.map(m => m.label).join(" · ")} · ${nameOf(place)}`; out.html = head(out.title, "Each metric on its own scale; move along a line for exact values.") + CH.multiples(series.map(s => ({ title: s.name, svg: CH.line([s], { w: 360, h: 170, vfmt: s.fmt, now: yearNow() }) }))); return out; }
      if (method === "lag") {
        const a = series[0].pts, b = series[1].pts, diff = arr => arr.map((p, i) => i && p[1] != null && arr[i - 1][1] != null ? p[1] - arr[i - 1][1] : null);
        const lv = ST.pearson(a.map(p => p[1]), b.map(p => p[1])), dv = ST.pearson(diff(a), diff(b)), lag = ST.lagged(diff(a), diff(b), 3).filter(x => x.r != null);
        const best = lag.slice().sort((x, y) => Math.abs(y.r) - Math.abs(x.r))[0];
        out.title = `${ms[0].label} and ${ms[1].label} over time · ${nameOf(place)}`;
        out.html = head(out.title, `${ms[0].label} vs ${ms[1].label}, year by year`) + CH.dual({ label: ms[0].label, fmt: fmtOf(ms[0]), series: [Object.assign({}, series[0], { name: nameOf(place) })] }, { label: ms[1].label, fmt: fmtOf(ms[1]), series: [Object.assign({}, series[1], { name: nameOf(place), colour: "#d55e00" })] }, { w, h: Math.round(w * .42) }) +
          CH.coef(lag.map(x => ({ name: x.lag === 0 ? "Same year" : x.lag > 0 ? `${ms[1].label} ${x.lag} yr later` : `${ms[0].label} ${-x.lag} yr later`, v: x.r, note: `n = ${x.n}, ${ST.pText(x.p)}`, faint: !ST.sig(x.p) })), { w, vfmt: v => v.toFixed(2), xtitle: "Correlation of year-on-year changes" }) +
          `<ul class="anstat"><li>Levels: r = ${lv.r == null ? "—" : lv.r.toFixed(2)} (${lv.n} years). <span class="muted">Levels can look linked just because both grow.</span></li><li>Year-on-year changes: r = <b>${dv.r == null ? "—" : dv.r.toFixed(2)}</b>, ${ST.strength(dv.r)} (${ST.pText(dv.p)}).</li>${best ? `<li>Strongest at: <b>${best.lag === 0 ? "the same year" : best.lag > 0 ? `${esc(ms[1].label)} following ${best.lag} year${best.lag > 1 ? "s" : ""} later` : `${esc(ms[0].label)} following ${-best.lag} year${best.lag < -1 ? "s" : ""} later`}</b> (r = ${best.r.toFixed(2)}).</li>` : ""}</ul>` + caveat("A few dozen years is a small sample: treat lags as hints, not proof that one causes the other.");
        return out;
      }
    }
    const n0 = codes.length;
    out.csv = XL.csv([["code", "name", ...ms.map(m => m.label)], ...codes.map((c, i) => [c, nameOf(c), ...cols.map(col => col[i] == null ? "" : +col[i].toFixed(6))])]);
    if (method === "dist" || method === "dist2") {
      const blocks = ms.map((m, j) => { const ds = ST.describe(cols[j]); if (!ds.n) return `<div class="aempty">No values for ${esc(m.label)}.</div>`;
        const f = fmtOf(m), out2 = codes.map((c, i) => [c, cols[j][i]]).filter(x => x[1] != null && (x[1] > ds.highFence || x[1] < ds.lowFence)).sort((a, b) => b[1] - a[1]);
        const skewTxt = Math.abs(ds.skew) < 0.5 ? "roughly symmetrical" : ds.skew > 0 ? "lopsided to the right (a few places much higher than the rest)" : "lopsided to the left (a few places much lower)";
        return `<div class="andist"><h4>${esc(m.label)}</h4>${CH.histogram(ST.histogram(cols[j]), { w: method === "dist2" ? Math.min(w, 420) : w, vfmt: f, unit, xtitle: m.label, colour: PER[m.p].hue, marks: [{ v: ds.median, label: "median" }, { v: ds.mean, label: "mean", colour: "#c0392b", dash: "2 2" }] })}
          <ul class="anstat"><li>${ds.n} of ${n0} ${esc(unit)} have a value. Median <b>${esc(f(ds.median))}</b>, mean <b>${esc(f(ds.mean))}</b>; half lie between ${esc(f(ds.q1))} and ${esc(f(ds.q3))}.</li><li>Shape: ${skewTxt} (skew ${ds.skew.toFixed(2)}). Spread: standard deviation ${esc(f(ds.sd))}.</li>
          <li>Outliers: ${out2.length ? out2.slice(0, 8).map(x => `<a data-go="${x[0]}">${esc(nameOf(x[0]))}</a> (${esc(f(x[1]))})`).join(", ") + (out2.length > 8 ? ` and ${out2.length - 8} more` : "") : "none by the usual rule (1.5 × the middle half's range beyond it)"}.</li></ul></div>`; });
      out.title = method === "dist" ? `Distribution of ${ms[0].label}` : "Each distribution";
      out.html = head(out.title, `${n0} ${unit} in ${where}, ${longDate(d)}`) + `<div class="${method === "dist2" ? "angrid2" : ""}">${blocks.join("")}</div>`;
      return out;
    }
    if (method === "spatial") {
      if (cfg.within === "sel") return Object.assign(out, { title: "Spatial pattern", html: `<div class="aempty">Spatial patterns need whole areas, not a selection. Choose "the whole UK" or a nation or region.</div>` });
      const res = ST.moran(cols[0], neighbours(codes)); if (!res.I) return Object.assign(out, { title: "Spatial pattern", html: `<div class="aempty">Too few places with values.</div>` });
      const counts = { HH: 0, LL: 0, HL: 0, LH: 0 }; res.cat.forEach(c => { if (counts[c] != null) counts[c]++; });
      const hot = codes.filter((c, i) => res.cat[i] === "HH").slice(0, 10), cold = codes.filter((c, i) => res.cat[i] === "LL").slice(0, 10);
      out.title = `Spatial pattern of ${ms[0].label}`;
      out.html = head(out.title, `${res.n} ${unit} in ${where}, each compared with its 6 nearest neighbours`) +
        `<ul class="anstat"><li>Moran's I = <b>${res.I.toFixed(3)}</b> (0 would mean no pattern; ${res.I > 0.3 ? "a clear tendency for similar values to cluster" : res.I > 0.1 ? "some clustering" : res.I < -0.1 ? "neighbours tend to differ (a chequerboard)" : "little spatial pattern"}), ${ST.pText(res.p)} from 199 shuffles.</li>
        <li>Hot spots (high next to high): <b>${counts.HH}</b>${hot.length ? ": " + hot.map(c => `<a data-go="${c}">${esc(nameOf(c))}</a>`).join(", ") : ""}.</li><li>Cold spots (low next to low): <b>${counts.LL}</b>${cold.length ? ": " + cold.map(c => `<a data-go="${c}">${esc(nameOf(c))}</a>`).join(", ") : ""}.</li>
        <li>Odd ones out: ${counts.HL} high among low, ${counts.LH} low among high.</li></ul>` + caveat("Neighbours are the six nearest places by centre point, so island and coastal places can pair with distant ones.");
      out.map = { kind: "hotspots", label: `Hot spots: ${ms[0].label}`, codes, values: res.cat, level: cfg.level }; return out;
    }
    if (method === "rel") {
      const [x, y] = cols, P1 = ST.pearson(x, y), S = ST.spearman(x, y), K = ST.kendall(x, y), fit = ST.regress(x, y);
      const split = cfg.split && M[cfg.split] ? M[cfg.split] : null, cat = split ? withDate(d, () => codes.map(c => { const r = split.get(c, d); return r && r.v; })) : null;
      const pts = codes.map((c, i) => ({ x: x[i], y: y[i], label: nameOf(c), code: c, colour: cat && cat[i] ? split.colour(cat[i]) : undefined, hl: state.sel.some(s => s.code === c) }));
      const okv = pts.filter(p => p.x != null && p.y != null), useLog = vs => vs.length > 5 && vs.every(v => v > 0) && Math.max(...vs) / Math.min(...vs) > 50;
      const lx = useLog(okv.map(p => p.x)), ly = useLog(okv.map(p => p.y)), f0 = fmtOf(ms[0]), f1 = fmtOf(ms[1]);
      const sdx = ST.sd(okv.map(p => p.x)), sdy = ST.sd(okv.map(p => p.y)), differ = Math.abs((S.r || 0) - (P1.r || 0)) > 0.15;
      let splitHTML = "";
      if (split) { const groups = {}; codes.forEach((c, i) => { if (cat[i] && x[i] != null && y[i] != null) (groups[cat[i]] = groups[cat[i]] || { x: [], y: [] }) && (groups[cat[i]].x.push(x[i]), groups[cat[i]].y.push(y[i])); });
        splitHTML = `<h4>Within each group of ${esc(split.label.toLowerCase())}</h4>` + CH.coef(Object.entries(groups).filter(([, g]) => g.x.length >= 5).map(([k2, g]) => { const r = ST.spearman(g.x, g.y); return { name: `${split.catName(k2)} (${g.x.length})`, v: r.r, colour: split.colour(k2), note: ST.pText(r.p), faint: !ST.sig(r.p) }; }), { w, vfmt: v => (+v).toFixed(2), xtitle: "Spearman correlation inside the group" }); }
      out.title = `${ms[1].label} against ${ms[0].label}`;
      out.html = head(out.title, `${P1.n} of ${n0} ${unit} in ${where} have both values · ${longDate(d)}`) + CH.scatter(pts, { w, h: Math.round(w * .58), xtitle: ms[0].label, ytitle: ms[1].label, xfmt: f0, yfmt: f1, fit: { slope: fit.slope, intercept: fit.intercept }, logx: lx, logy: ly }) +
        `<ul class="anstat"><li><b>${esc(ST.strength(differ || Math.abs(S.r || 0) > Math.abs(P1.r || 0) ? S.r : P1.r))}</b>${differ ? " (judged on ranks, since a few places pull the straight line)" : ""}.</li>
        <li>Pearson r = <b>${P1.r == null ? "—" : P1.r.toFixed(2)}</b> (${ST.pText(P1.p)}) · Spearman ρ = <b>${S.r == null ? "—" : S.r.toFixed(2)}</b> (${ST.pText(S.p)}) · Kendall τ = <b>${K.r == null ? "—" : K.r.toFixed(2)}</b>.</li>
        <li>Fitted line: a place one typical step (one standard deviation, ${esc(f0(sdx))}) higher in ${esc(ms[0].label.toLowerCase())} has on average <b>${(s1 => /^[+−-]/.test(s1) ? s1 : (fit.slope >= 0 ? "+" : "") + s1)(f1(fit.slope * sdx))}</b> ${esc(ms[1].label.toLowerCase())} (95% range ${esc(f1(fit.lo * sdx))} to ${esc(f1(fit.hi * sdx))}), or ${(fit.slope * sdx / (sdy || 1)).toFixed(2)} of its own typical steps. R² = <b>${pct(fit.r2)}</b>: the share of the differences in ${esc(ms[1].label.toLowerCase())} that ${esc(ms[0].label.toLowerCase())} accounts for.</li>
        ${differ ? `<li class="muted">Spearman and Pearson differ, so the link is steady but not a straight line, or a few extreme places pull the line.</li>` : ""}</ul>` + splitHTML +
        caveat("Correlation is not causation, and a link between places doesn't have to hold for the people in them (the ecological fallacy).");
      out.map = { kind: "residual", label: `Residual: ${ms[1].label} given ${ms[0].label}`, codes, values: fit.residuals, level: cfg.level, fmt: f1 };
      return out;
    }
    if (method === "byarea") {
      const groupOf = c => cfg.within === UKC || P[cfg.within].level === "nation" ? (P[c].level === "nation" ? c : cfg.within === UKC ? nationOf(c) : (P[c].level === "ward" ? P[P[c].parent].parent : P[c].parent)) : P[c].parent;
      const g = {}; codes.forEach((c, i) => { const k2 = groupOf(c); if (!k2 || cols[0][i] == null || cols[1][i] == null) return; (g[k2] = g[k2] || { x: [], y: [] }).x.push(cols[0][i]); g[k2].y.push(cols[1][i]); });
      const all = ST.spearman(cols[0], cols[1]);
      const items = Object.entries(g).filter(([, v]) => v.x.length >= 5).map(([k2, v]) => { const r = ST.spearman(v.x, v.y); return { name: `${nameOf(k2)} (${v.x.length})`, v: r.r, note: ST.pText(r.p), faint: !ST.sig(r.p) }; }).sort((a, b) => b.v - a.v);
      items.unshift({ name: `All of ${where} (${all.n})`, v: all.r, colour: "#1f2a2e", note: ST.pText(all.p) });
      out.title = `${ms[0].label} and ${ms[1].label}, area by area`;
      out.html = head(out.title, `Spearman correlation inside each ${cfg.within === UKC ? "nation" : "region"}; faded bars could easily be chance`) + CH.coef(items, { w, vfmt: v => (+v).toFixed(2), xtitle: "Correlation inside the area (−1 to 1)" }) +
        caveat("Areas with fewer than 5 places are left out. A link can be strong overall but weak or reversed inside areas (Simpson's paradox).");
      return out;
    }
    const labels = ms.map(m => m.label);
    if (method === "matrix") {
      const { R, N } = ST.corrMatrix(cols, cfg.corr), Pm = R.map((row, i) => row.map((r, j) => r == null || i === j ? null : (ST[cfg.corr === "spearman" ? "spearman" : "pearson"](cols[i], cols[j])).p));
      const pairs = []; for (let i = 0; i < R.length; i++) for (let j = i + 1; j < R.length; j++) if (R[i][j] != null) pairs.push([labels[i], labels[j], R[i][j], Pm[i][j]]);
      pairs.sort((a, b) => Math.abs(b[2]) - Math.abs(a[2]));
      out.title = "Correlation matrix"; out.html = head(out.title, `${cfg.corr === "spearman" ? "Spearman (ranks)" : "Pearson"} correlations across ${n0} ${unit} in ${where}`) + `<div class="seg sm anseg"><button data-ancorr="pearson" class="${cfg.corr !== "spearman" ? "on" : ""}">Pearson</button><button data-ancorr="spearman" class="${cfg.corr === "spearman" ? "on" : ""}">Spearman</button></div>` + CH.heat(R, labels, { w, n: N, p: Pm }) +
        `<ul class="anstat">${pairs.slice(0, 4).map(p => `<li>${esc(p[0])} & ${esc(p[1])}: <b>${p[2].toFixed(2)}</b>, ${esc(ST.strength(p[2]))} (${ST.pText(p[3])})</li>`).join("")}</ul>`;
      out.csv = XL.csv([["", ...labels], ...R.map((row, i) => [labels[i], ...row.map(v => v == null ? "" : +v.toFixed(4))])]);
      return out;
    }
    if (method === "partial") {
      const res = ST.partial(cols); if (!res.R) return Object.assign(out, { title: "Partial correlations", html: `<div class="aempty">${res.singular ? "Two or more metrics carry the same information, so they can't be held fixed separately." : `Only ${res.n} places have every value; more are needed.`}</div>` });
      const raw = ST.corrMatrix(ST.complete(cols).cols).R, notes = [];
      for (let i = 0; i < labels.length; i++) for (let j = i + 1; j < labels.length; j++) if (Math.abs(raw[i][j]) > 0.3 && Math.abs(res.R[i][j]) < 0.1) notes.push(`${labels[i]} & ${labels[j]}: ${raw[i][j].toFixed(2)} on its own, but ${res.R[i][j].toFixed(2)} once the others are held fixed`);
      out.title = "Partial correlations"; out.html = head(out.title, `Each pair, holding the other ${labels.length - 2} metric${labels.length > 3 ? "s" : ""} fixed · ${res.n} ${unit} with every value`) + CH.heat(res.R, labels, { w, p: res.p, label: "partial r" }) +
        (notes.length ? `<ul class="anstat">${notes.slice(0, 5).map(t => `<li>${esc(t)}: explained by the others.</li>`).join("")}</ul>` : `<p class="ansub">No pair loses its link entirely when the others are held fixed.</p>`);
      return out;
    }
    if (method === "reg") {
      const oi = Math.max(0, cfg.metrics.indexOf(cfg.outcome)), y = cols[oi], X = cols.filter((_, i) => i !== oi), xl = labels.filter((_, i) => i !== oi), res = ST.multiple(y, X);
      const pick = `<label class="anpick">Outcome (what to predict) <select data-anoutcome>${ms.map((m, i) => `<option value="${m.id}" ${i === oi ? "selected" : ""}>${esc(m.label)}</option>`).join("")}</select></label>`;
      if (res.error) return Object.assign(out, { title: "Regression", html: pick + `<div class="aempty">${esc(res.error)}</div>` });
      out.title = `What predicts ${labels[oi]}?`;
      out.html = head(out.title, `Multiple regression on ${res.n} ${unit} with every value`) + pick + CH.coef(xl.map((l, i) => ({ name: l, v: res.std[i], note: `coefficient ${CH.compact(res.beta[i + 1])} per unit, ${ST.pText(res.p[i + 1])}`, faint: !ST.sig(res.p[i + 1]) })), { w, vfmt: v => (+v).toFixed(2), xtitle: "Standardised effect (change in outcome, in standard deviations, per standard deviation of the predictor)" }) +
        `<ul class="anstat"><li>Together the predictors explain <b>${pct(res.r2)}</b> of the differences in ${esc(labels[oi].toLowerCase())} (adjusted R² ${pct(Math.max(0, res.adj))}; overall ${ST.pText(res.pF)}).</li>
        <li>Strongest: <b>${esc(xl[res.std.map(Math.abs).indexOf(Math.max(...res.std.map(Math.abs)))])}</b>. Faded bars could easily be chance (p ≥ 0.05).</li></ul>` + caveat("Predictors that are strongly related to each other share credit unpredictably; check the correlation matrix.");
      out.map = { kind: "residual", label: `Residual: ${labels[oi]} given ${xl.length} others`, codes, values: res.residuals, level: cfg.level, fmt: fmtOf(ms[oi]) };
      return out;
    }
    if (method === "pca") {
      const res = ST.pca(cols); if (res.error) return Object.assign(out, { title: "Components", html: `<div class="aempty">${esc(res.error)}</div>` });
      const keep = Math.max(1, res.values.filter(v => v >= 1).length), top = l => labels.map((lab, j) => [lab, res.loadings[l][j]]).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 3);
      out.title = "Components: what moves together";
      out.html = head(out.title, `${res.n} ${unit} with every value · components with an eigenvalue of 1 or more are worth reading (${keep} here)`) +
        CH.coef(res.explained.slice(0, Math.min(6, labels.length)).map((e, i) => ({ name: `Component ${i + 1}`, v: e * 100, colour: i < keep ? "#3b78b5" : "#b8c2c6" })), { w, vfmt: v => v.toFixed(0) + "%", xtitle: "Share of all the variation it captures" }) +
        CH.heat(res.loadings.slice(0, keep), labels, { w, label: "loading", rows: res.loadings.slice(0, keep).map((_, i) => `Component ${i + 1}`) }) +
        `<ul class="anstat">${res.loadings.slice(0, keep).map((l, i) => `<li><b>Component ${i + 1}</b> (${pct(res.explained[i])}): mostly ${top(i).map(t => `${esc(t[0])} (${t[1] > 0 ? "+" : "−"})`).join(", ")}.</li>`).join("")}</ul>` + caveat("Read the heat map rows as patterns: metrics with the same colour in a row rise together on that component.");
      out.map = { kind: "score", label: "Component 1 score", codes, values: res.scores.map(s => s ? s[0] : null), level: cfg.level, fmt: v => v.toFixed(2) };
      return out;
    }
    if (method === "cluster") {
      const res = cfg.k ? ST.kmeans(cols, cfg.k) : ST.bestK(cols, 2, 6); if (!res || res.error) return Object.assign(out, { title: "Clusters", html: `<div class="aempty">${esc((res && res.error) || "Too few places.")}</div>` });
      const Z = ST.standardize(ST.complete(cols).cols), lab = res.labels.filter(l => l != null), groups = Array.from({ length: res.k }, (_, g) => ({ name: `Group ${g + 1}`, colour: CLUSTER_COL[g], size: res.sizes[g], values: labels.map((_, j) => { const v = Z[j].filter((_, i) => lab[i] === g); return v.length ? ST.mean(v) : 0; }) }));
      const members = g => codes.filter((c, i) => res.labels[i] === g);
      out.title = `${res.k} groups of similar places`;
      out.html = head(out.title, `k-means on ${res.n} ${unit}; separation score (silhouette) ${res.silhouette.toFixed(2)} (above 0.5 is clear, 0.25–0.5 reasonable)`) +
        `<label class="anpick">Groups <select data-ank><option value="0" ${!cfg.k ? "selected" : ""}>Best (${res.k})</option>${[2, 3, 4, 5, 6].map(k2 => `<option value="${k2}" ${cfg.k === k2 ? "selected" : ""}>${k2}</option>`).join("")}</select></label>` +
        CH.profile(groups, labels, { w }) + `<div class="anmem">${groups.map((g, i) => `<div><i class="sw" style="background:${g.colour}"></i><b>${g.name}</b> (${g.size}): ${members(i).slice(0, 8).map(c => `<a data-go="${c}">${esc(nameOf(c))}</a>`).join(", ")}${members(i).length > 8 ? "…" : ""}</div>`).join("")}</div>` +
        caveat("Groups depend on which metrics you choose; each metric counts equally after standardising.");
      out.map = { kind: "cluster", label: `Clusters (${res.k} groups)`, codes, values: res.labels, level: cfg.level, k: res.k };
      return out;
    }
    if (method === "unusual") {
      const res = ST.mahalanobis(cols); if (res.error) return Object.assign(out, { title: "Unusual places", html: `<div class="aempty">${esc(res.error)}</div>` });
      const rank = codes.map((c, i) => [c, res.d[i], res.p[i]]).filter(x => x[1] != null).sort((a, b) => b[1] - a[1]), Z = ST.standardize(cols.map(col => col.map(v => v == null ? NaN : v)));
      out.title = "Unusual places across all the metrics";
      out.html = head(out.title, `${res.n} ${unit} with every value; distance from the typical place, allowing for how the metrics relate`) +
        CH.ranked(rank.slice(0, 15).map(x => ({ name: nameOf(x[0]), v: x[1], colour: x[2] < 0.01 ? "#c0392b" : "#e69f00" })), { w, vfmt: v => v.toFixed(1) }) +
        `<ul class="anstat">${rank.slice(0, 5).map(x => { const i = codes.indexOf(x[0]), z = labels.map((l, j) => [l, cols[j][i]]); return `<li><a data-go="${x[0]}">${esc(nameOf(x[0]))}</a> (${ST.pText(x[2])})</li>`; }).join("")}</ul>` + caveat("Red: very unusual (p < 0.01). Unusual isn't wrong: it often flags special places (the City of London) or data problems worth checking.");
      out.map = { kind: "unusual", label: "Unusualness (all metrics)", codes, values: res.d, level: cfg.level, fmt: v => v.toFixed(1) };
      return out;
    }
    return Object.assign(out, { title: "", html: `<div class="aempty">Choose metrics and a method.</div>` });
  }
  const CLUSTER_COL = ["#1b9e77", "#d95f02", "#7570b3", "#e7298a", "#66a61e", "#e6ab02"];
  const HOT_COL = { HH: "#b2182b", LL: "#2166ac", HL: "#f4a582", LH: "#92c5de", none: "#e8e6e1" }, HOT_NAME = { HH: "Hot spot (high near high)", LL: "Cold spot (low near low)", HL: "High among low", LH: "Low among high", none: "No clear pattern" };
  let anSeq = 0;
  function showOnMap(spec) { // turns an analysis result into a metric in the Analysis perspective
    const id = "an_" + (++anSeq), byCode = {}; spec.codes.forEach((c, i) => { if (spec.values[i] != null) byCode[c] = spec.values[i]; });
    const base = { id, p: "analysis", group: "Results", label: spec.label, temporal: "static", desc: `From the Analyse window (${(LEVEL_OPTS().find(o => o[0] === spec.level) || [0, ""])[1].toLowerCase()} only)` };
    if (spec.kind === "cluster") def(Object.assign(base, { scale: "nominal", nature: "category", colour: g => CLUSTER_COL[g] || "#999", catName: g => `Group ${+g + 1}`, cats: () => Array.from({ length: spec.k }, (_, i) => i), get: c => byCode[c] != null ? { v: byCode[c], text: `Group ${byCode[c] + 1}` } : null }));
    else if (spec.kind === "hotspots") def(Object.assign(base, { scale: "nominal", nature: "category", colour: k2 => HOT_COL[k2], catName: k2 => HOT_NAME[k2], cats: () => ["HH", "HL", "LH", "LL", "none"], get: c => byCode[c] ? { v: byCode[c], text: HOT_NAME[byCode[c]] } : null }));
    else if (spec.kind === "unusual") def(Object.assign(base, { scale: "ratio", nature: "rate", fmt: spec.fmt, get: c => byCode[c] != null ? { v: byCode[c], text: spec.fmt(byCode[c]) } : null }));
    else def(Object.assign(base, { scale: "interval", nature: "change", mid: 0, fmt: v => (v > 0 ? "+" : "") + spec.fmt(v), get(c) { return byCode[c] != null ? { v: byCode[c], text: this.fmt(byCode[c]) + (spec.kind === "residual" ? (byCode[c] > 0 ? " (higher than predicted)" : " (lower than predicted)") : "") } : null; } }));
    PER.analysis.ready = true; PS.active[id] = true; PS.mapped.analysis = (PS.mapped.analysis || []).concat(id);
    if (!PS.on.analysis) { PS.on.analysis = true; PS.order = PS.order.filter(x => x !== "analysis").concat("analysis"); }
    if (spec.level && LEVELS.includes(spec.level) && state.level !== spec.level) makeActive(spec.level);   // show the boundary set the analysis used
    if (VIEW.mode === "ws") setView("split");
    repaint(); toast(`${spec.label} is on the map (Analysis perspective).`);
  }
  function renderAnalyse() {
    if (anEl.hidden) return;
    const cfg = Object.assign({}, AN, { date: state.date }), methods = anMethods(cfg);
    if (!methods.some(m => m[0] === AN.method)) AN.method = methods.length ? methods[0][0] : null; cfg.method = AN.method;
    const pers = PERSPECTIVES.filter(p => p.ready && p.id !== "analysis").map(p => { const ms = anMetricsAll().filter(m => m.p === p.id); return ms.length ? `<h4 style="--c:${p.hue}">${svgIcon(p.id)}${esc(p.name)}</h4>` + ms.map(m => `<label style="--c:${p.hue}"><input type="checkbox" data-anm="${m.id}" ${AN.metrics.includes(m.id) ? "checked" : ""}>${esc(m.label)}</label>`).join("") : ""; }).join("");
    const res = cfg.method ? anResult(cfg, Math.max(360, Math.min(900, anEl.offsetWidth - 330))) : null;
    anEl.innerHTML = `<div class="an-head"><b>Analyse</b><span class="cp-sub">How metrics relate across places, within an area, or over time. No need to pick places.</span><button class="x" data-anx aria-label="Close">×</button></div>
      <div class="an-body"><div class="an-side">
        <div class="an-row"><b>Look</b><div class="seg sm"><button data-anmode="across" class="${AN.mode !== "time" ? "on" : ""}">Across places</button><button data-anmode="time" class="${AN.mode === "time" ? "on" : ""}">Over time</button></div></div>
        ${AN.mode === "time" ? `<div class="an-row"><b>Place</b><select data-anplace>${[UKC, "E92000001", "S92000003", "W92000004", "N92000002"].concat(state.focus && !["E92000001", "S92000003", "W92000004", "N92000002", UKC].includes(state.focus) ? [state.focus] : [], state.sel.map(s => s.code)).filter((c, i, a) => a.indexOf(c) === i).map(c => `<option value="${c}" ${AN.place === c ? "selected" : ""}>${esc(nameOf(c))}</option>`).join("")}</select></div>`
          : `<div class="an-row"><b>Compare</b><select data-anlevel>${LEVEL_OPTS().map(([l, t]) => `<option value="${l}" ${AN.level === l ? "selected" : ""}>${t}</option>`).join("")}</select></div>
             <div class="an-row"><b>Within</b><select data-anwithin>${WITHIN_OPTS().map(([c, t]) => `<option value="${c}" ${AN.within === c ? "selected" : ""}>${esc(t)}</option>`).join("")}</select></div>`}
        <div class="an-row"><b>Date</b><span class="muted">${esc(longDate(state.date))} (time bar)</span></div>
        <div class="an-metrics"><div class="an-mh">Metrics <small>${AN.metrics.length} chosen</small>${AN.metrics.length ? `<button class="btn" data-anclear>Clear</button>` : ""}</div>${pers}</div>
      </div><div class="an-main">
        ${methods.length ? `<div class="an-methods">${methods.map(([id, l]) => `<button class="${id === AN.method ? "on" : ""}" data-anmethod="${id}">${esc(l)}</button>`).join("")}</div><p class="anwhy"><b>Method:</b> ${esc(METHOD_WHY[AN.method] || "")}</p>` : `<div class="aempty">Tick one or more metrics on the left. One metric: its distribution and spatial pattern. Two: their relationship. Three or more: patterns across all of them (matrix, regression, components, clusters, unusual places).</div>`}
        ${AN.method === "rel" ? `<label class="anpick">Split by a category <select data-ansplit><option value="">none</option>${anCats().map(m => `<option value="${m.id}" ${AN.split === m.id ? "selected" : ""}>${esc(m.label)}</option>`).join("")}</select></label>` : ""}
        <div class="an-res">${res ? (res.trim || "") + res.html : ""}</div>
        ${res && res.title ? `<div class="an-acts"><button class="btn primary" data-anws>Send to workspace</button>${res.map ? `<button class="btn" data-anmap>Show on map</button>` : ""}${res.csv ? `<button class="btn" data-ancsv>Copy data (CSV)</button>` : ""}</div>` : ""}
      </div></div>`;
    addFctl(anEl, ".an-head"); anEl._last = res;
  }
  function openAnalyse(o) { closeMenu(); closePMenu(); if (o && o.metrics) AN.metrics = o.metrics.filter(id => M[id] && EN.isNum(M[id])); if (o && o.level) AN.level = o.level; anEl.hidden = false; renderAnalyse(); }
  const sideWin = (max, share) => { const w = Math.round(Math.min(max, innerWidth - 40, Math.max(600, innerWidth * share))); return { x: Math.max(20, innerWidth - w - 66), y: 60, w, h: innerHeight - 96 }; };   // docked right, leaving the map on the left
  floating(anEl, ".an-head", "atlas-16-an-pos", () => sideWin(1000, 0.66));
  anEl.addEventListener("fwin-resized", renderAnalyse);
  anEl.addEventListener("click", e => {
    const a = e.target.closest("[data-go]"); if (a) { focus(a.dataset.go); return; }
    const b = e.target.closest("button"); if (!b) return; const ds = b.dataset;
    if (b.hasAttribute("data-anx")) { anEl.hidden = true; return; }
    if (ds.antrim) AN.trim = ds.antrim === "1"; else if (ds.anmode) AN.mode = ds.anmode; else if (ds.anmethod) AN.method = ds.anmethod; else if (ds.ancorr) AN.corr = ds.ancorr;
    else if (b.hasAttribute("data-anclear")) AN.metrics = [];
    else if (b.hasAttribute("data-anws")) { const cfg = Object.assign({}, AN, { date: state.date }); sendToWS({ type: "analysis", title: anEl._last.title, cfg }); return; }
    else if (b.hasAttribute("data-anmap")) { showOnMap(anEl._last.map); return; }
    else if (b.hasAttribute("data-ancsv")) { copy(anEl._last.csv); return; }
    else return;
    saveAN(); renderAnalyse();
  });
  anEl.addEventListener("change", e => { const t = e.target, ds = t.dataset;
    if (ds.anm) AN.metrics = t.checked ? AN.metrics.concat(ds.anm) : AN.metrics.filter(x => x !== ds.anm);
    else if (ds.anlevel != null) AN.level = t.value; else if (ds.anwithin != null) AN.within = t.value; else if (ds.anplace != null) AN.place = t.value;
    else if (ds.anoutcome != null) AN.outcome = t.value; else if (ds.ank != null) AN.k = +t.value; else if (ds.ansplit != null) AN.split = t.value; else return;
    saveAN(); renderAnalyse(); });

  // ---------- the workspace: a project board for tables, charts, analyses, cards, tiles, map pictures and notes ----------
  const wsEl = $("ws"), wsDiv = $("ws-div");
  const WS = (() => { const s = store.get("atlas-16-ws", null); return s && s.projects && s.projects.length ? s : { projects: [{ id: "p1", name: "My project", items: [] }], current: "p1" }; })();
  WS.projects.forEach(p => p.items.forEach(it => { if (!(it.w >= 230)) it.w = it.type === "card" ? 340 : 560; if (!(it.h >= 130)) it.h = it.type === "card" ? 380 : 400; }));   // repair sizes saved while hidden
  const VIEW = { mode: "map", ratio: store.get("atlas-16-ratio", 0.5) };
  const proj = () => WS.projects.find(p => p.id === WS.current) || WS.projects[0];
  function saveWS() { if (!store.set("atlas-16-ws", WS)) toast("This browser's storage is full. Export the project (Export ▾ → Project file) to keep it safe."); }
  let wsSeq = Date.now();
  const maxZ = () => Math.max(0, ...proj().items.map(i => i.z || 0));
  function sendToWS(item) {
    const it = proj().items, n = it.length;
    Object.assign(item, { id: "w" + (++wsSeq), created: Date.now(), date: item.date || state.date, x: 24 + (n % 4) * 40, y: 24 + (n % 6) * 34, w: item.w || 560, h: item.h || 400, z: maxZ() + 1 });
    it.push(item); saveWS(); renderTabs(); if (VIEW.mode !== "map") renderWS();
    toast(`Sent to the workspace “${proj().name}”. Swipe left or open the Workspace tab to see it.`);
  }
  function tileSVG(codes, fills, w, h) { // a small map of the places, in the colours they had on the map
    const fs = codes.map(c => ({ c, f: featureOf(c) })).filter(x => x.f); if (!fs.length) return `<div class="aempty">Boundaries for these places aren't loaded; zoom to them on the map and send again.</div>`;
    let b = [180, 90, -180, -90]; fs.forEach(x => { const bb = bboxOfGeom(x.f.geometry); b = [Math.min(b[0], bb[0]), Math.min(b[1], bb[1]), Math.max(b[2], bb[2]), Math.max(b[3], bb[3])]; });
    const k = Math.cos((b[1] + b[3]) / 2 * Math.PI / 180), sx = (b[2] - b[0]) * k || 1e-3, sy = (b[3] - b[1]) || 1e-3, s = Math.min((w - 16) / sx, (h - 16) / sy), ox = (w - sx * s) / 2, oy = (h - sy * s) / 2;
    const P2 = ([x, y]) => `${(ox + (x - b[0]) * k * s).toFixed(1)} ${(oy + (b[3] - y) * s).toFixed(1)}`;
    return `<svg class="tile" viewBox="0 0 ${w} ${h}">${fs.map(x => `<path data-tip="${esc(nameOf(x.c))}" d="${polysOf(x.f.geometry).map(pl => pl.map(r => "M" + r.filter((_, i) => i % Math.max(1, Math.floor(r.length / 400)) === 0).map(P2).join("L") + "Z").join("")).join("")}" fill="${(fills && fills[x.c]) || "#d9d4c7"}" stroke="#1f2a2e" stroke-width="1" fill-rule="evenodd"/>`).join("")}</svg>`;
  }
  function itemBody(it, w) {
    w = Math.max(240, (w || it.w) - 24);
    switch (it.type) {
      case "chart": return `<div class="cp-styles">${stylesHTML(it.spec, true, "w")}</div>` + withDate(it.date, () => drawChart(it.spec, w));
      case "table": return `<div class="wsmeta">Values on ${esc(longDate(it.date))}</div><div class="wstab">${withDate(it.date, () => tableHTML(it.codes.filter(c => P[c]), it.metrics.map(id => M[id]).filter(Boolean), false))}</div>`;
      case "analysis": { const r = withDate(it.cfg.date || it.date, () => anResult(it.cfg, w)); return `<div class="an-res">${it.cfg.trim ? (r.trim || "").replace(/<button[^>]*>.*?<\/button>/g, "") : ""}${r.html}</div>`; }
      case "card": return `<div class="wscard">${it.html}</div>`;
      case "tile": return tileSVG(it.codes, it.fills, w, Math.max(160, it.h - 120)) + `<div class="wsmeta">${it.codes.map(c => esc(nameOf(c))).join(" · ")}${it.lines ? `</div><ul class="extra">${it.lines}</ul>` : "</div>"}`;
      case "shot": return `<img class="wsshot" src="${it.src}" alt="${esc(it.title)}">`;
      case "note": return `<div class="wsnote" contenteditable="true" data-note="${it.id}">${it.html || ""}</div>`;
      case "stack": return it.children.map(ch => `<div class="wsstack"><div class="wsst">${esc(ch.title)}</div>${itemBody(ch, w)}</div>`).join("");
    }
    return "";
  }
  const LIVE = { chart: 1, table: 1, analysis: 1 };
  function renderWS() {
    const p = proj();
    wsEl.innerHTML = `<div class="ws-bar"><select data-wsproj aria-label="Project">${WS.projects.map(q => `<option value="${q.id}" ${q.id === p.id ? "selected" : ""}>${esc(q.name)}</option>`).join("")}</select>
        <button class="btn" data-wsnew title="New project">+ Project</button><button class="btn" data-wsren>Rename</button>
        <span class="ws-sep"></span><button class="btn" data-wsnote>+ Note</button><button class="btn" data-wsshot>Capture map</button><button class="btn" data-wstidy>Tidy</button>
        <span class="ws-sep"></span><div class="ws-exp"><button class="btn primary" data-wsexp>Export ▾</button><div class="ws-menu" hidden><button data-wspdf>PDF (print)</button><button data-wsslides>Presentation (HTML slides)</button><button data-wsjson>Project file (.json)</button><label>Import a project file<input type="file" accept=".json" data-wsimp hidden></label><button data-wsdel class="danger">Delete this project</button></div></div>
        <span class="ws-grow"></span><span class="ws-zoom" title="Make the whole board bigger or smaller"><button class="btn" data-wsz="-1" aria-label="Zoom the board out">−</button><button class="btn ws-zoom-v" data-wsz="0" title="Back to 100%">100%</button><button class="btn" data-wsz="1" aria-label="Zoom the board in">+</button></span><div class="seg sm"><button data-view="split" class="${VIEW.mode === "split" ? "on" : ""}" title="Map and workspace side by side">Split</button><button data-view="ws" class="${VIEW.mode === "ws" ? "on" : ""}" title="Workspace only">Full</button><button data-view="map" title="Back to the map">Map</button></div></div>
      <div class="ws-canvas" id="ws-canvas"><div class="ws-inner" style="transform:scale(${wsZoom()})">${p.items.length ? "" : `<div class="ws-empty"><h3>${esc(p.name)} is empty</h3><p>Send things here with <b>Send to workspace</b>: charts (chart panel and tabs), tables (comparison page), analyses (Analyse), area cards and tiles (a pinned card's ⋯), and pictures of the map (Capture map). Then drag them around, resize them from the corner, and drop one onto another to combine them.</p></div>`}
        ${p.items.map(it => `<div class="wsi" data-wsi="${it.id}" style="left:${it.x}px;top:${it.y}px;width:${it.w}px;height:${it.h}px;z-index:${it.z || 1}"><div class="wsi-head"><span class="wsi-t" title="Double-click to rename">${esc(it.title)}</span>
          ${LIVE[it.type] ? `<button data-wsref="${it.id}" title="Refresh to the time bar's date (${esc(dmy(state.date))})">↻</button>` : ""}${it.type === "chart" ? `<button data-wstab="${it.id}" title="Open in its own tab">⧉</button>` : ""}${it.parts || it.type === "stack" ? `<button data-wssep="${it.id}" title="Separate: split this back into the items it was made from">⇲ Separate</button>` : ""}<button data-wsdup="${it.id}" title="Duplicate">⎘</button><button data-wsx="${it.id}" title="Remove">×</button></div>
          <div class="wsi-body">${itemBody(it)}</div><div class="rgrip" data-wsrs="${it.id}" title="Drag to resize"></div></div>`).join("")}</div></div>`;
    wsEl.querySelector(".ws-zoom-v").textContent = Math.round(wsZoom() * 100) + "%";
  }
  function wsItem(id) { return proj().items.find(i => i.id === id); }
  const WSZ = [0.4, 0.5, 0.6, 0.75, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2];
  const wsZoom = () => WS.zoom || 1;
  function combine(a, b) { // drop a onto b
    const u = (x, y) => [...new Set([...(x || []), ...(y || [])])];
    if (a.type === "chart" && b.type === "chart") { if (b.spec.companies.length || a.spec.companies.length) b.spec.companies = u(b.spec.companies, a.spec.companies); else { b.spec.places = u(b.spec.places, a.spec.places); b.spec.metrics = u(b.spec.metrics, a.spec.metrics); } b.spec.style = null; b.spec.style = chartStylesFor(b.spec).best; b.title = b.title + " + " + a.title; return b; }
    if (a.type === "table" && b.type === "table") { b.codes = u(b.codes, a.codes); b.metrics = u(b.metrics, a.metrics); b.title = "Table: " + b.codes.length + " places"; return b; }
    if (a.type === "tile" && b.type === "tile") { b.codes = u(b.codes, a.codes); b.fills = Object.assign({}, a.fills, b.fills); b.title = b.codes.map(nameOf).join(", "); return b; }
    if (a.type === "tile" && b.type === "chart" && !b.spec.companies.length) { b.spec.places = u(b.spec.places, a.codes); return b; }
    if (a.type === "tile" && b.type === "table") { b.codes = u(b.codes, a.codes); return b; }
    const kids = x => x.type === "stack" ? x.children : [x];
    return { id: b.id, type: "stack", title: b.title + " + " + a.title, children: [...kids(b), ...kids(a)], x: b.x, y: b.y, w: Math.max(a.w, b.w), h: b.h + Math.min(a.h, 360), z: b.z, date: b.date };
  }
  // drag items by their header; drop on another item to combine; resize from the corner
  wsEl.addEventListener("pointerdown", e => { // resize a tile from its corner grip
    const g = e.target.closest("[data-wsrs]"); if (!g || e.button) return; const it = wsItem(g.dataset.wsrs), el = g.parentNode; if (!it) return;
    e.preventDefault(); e.stopPropagation(); g.setPointerCapture(e.pointerId); document.body.classList.add("resizing");
    const z = wsZoom(), sx = e.clientX, sy = e.clientY, w0 = it.w, h0 = it.h;
    const mv = ev => { it.w = Math.max(220, Math.round(w0 + (ev.clientX - sx) / z)); it.h = Math.max(120, Math.round(h0 + (ev.clientY - sy) / z)); el.style.width = it.w + "px"; el.style.height = it.h + "px"; };
    const up = () => { g.removeEventListener("pointermove", mv); document.body.classList.remove("resizing"); saveWS(); if (it.type !== "note" && it.type !== "shot") el.querySelector(".wsi-body").innerHTML = itemBody(it); };
    g.addEventListener("pointermove", mv); g.addEventListener("pointerup", up, { once: true });
  }, true);
  wsEl.addEventListener("pointerdown", e => {
    const h = e.target.closest(".wsi-head"); if (!h || e.button || e.target.closest("button")) return;
    const el = h.parentNode, it = wsItem(el.dataset.wsi); if (!it) return; e.preventDefault();
    it.z = maxZ() + 1; el.style.zIndex = it.z; const z = wsZoom(), sx = e.clientX, sy = e.clientY, x0 = it.x, y0 = it.y; h.setPointerCapture(e.pointerId); el.classList.add("dragging");
    let target = null;
    const mv = ev => { it.x = Math.max(0, Math.round(x0 + (ev.clientX - sx) / z)); it.y = Math.max(0, Math.round(y0 + (ev.clientY - sy) / z)); el.style.left = it.x + "px"; el.style.top = it.y + "px";
      el.style.pointerEvents = "none"; const under = document.elementFromPoint(ev.clientX, ev.clientY); el.style.pointerEvents = "";
      const t = under && under.closest(".wsi"); if (target && target !== t) target.classList.remove("droptarget"); target = t && t !== el ? t : null; if (target) target.classList.add("droptarget"); };
    const up = () => { h.removeEventListener("pointermove", mv); el.classList.remove("dragging");
      if (target) { target.classList.remove("droptarget"); const b = wsItem(target.dataset.wsi), items = proj().items, before = JSON.stringify(items.map(x => x === it ? Object.assign({}, x, { x: x0, y: y0 }) : x));
        const partsOf = x => { const c = JSON.parse(JSON.stringify(x)); const kids = c.parts || (c.type === "stack" ? c.children : null); delete c.parts; return kids ? kids : [c]; };
        const parts = [...partsOf(b), ...partsOf(Object.assign({}, it, { x: x0, y: y0 }))];
        const merged = combine(it, b); merged.parts = parts; items.splice(items.indexOf(b), 1, merged); items.splice(items.indexOf(it), 1); saveWS(); renderWS(); undoToast("Combined.", () => { proj().items = JSON.parse(before); saveWS(); renderWS(); }); }
      else saveWS(); };
    h.addEventListener("pointermove", mv); h.addEventListener("pointerup", up, { once: true });
  });
  if (window.ResizeObserver) { const ro = new ResizeObserver(entries => { entries.forEach(en => { const el = en.target, it = wsItem(el.dataset.wsi); if (!it) return; const w = Math.round(el.offsetWidth), h = Math.round(el.offsetHeight); if (!el.offsetParent || !w || !h) return;   // hidden workspace: sizes read as 0
        if (Math.abs(w - it.w) < 3 && Math.abs(h - it.h) < 3) return; it.w = w; it.h = h; clearTimeout(el._t); el._t = setTimeout(() => { saveWS(); if (it.type !== "note" && it.type !== "shot") el.querySelector(".wsi-body").innerHTML = itemBody(it); }, 300); }); });
    new MutationObserver(() => wsEl.querySelectorAll(".wsi").forEach(el => { if (!el._ro) { el._ro = 1; ro.observe(el); } })).observe(wsEl, { childList: true, subtree: true }); }
  function undoToast(msg, undo) { toast(msg); const t = $("toast"); t.innerHTML = `${esc(msg)} <button class="btn" id="undo-btn">Undo</button>`; $("undo-btn").onclick = () => { undo(); t.hidden = true; }; clearTimeout(tt); tt = setTimeout(() => t.hidden = true, 8000); }   // 8 seconds to change your mind
  wsEl.addEventListener("dblclick", e => { const t = e.target.closest(".wsi-t"); if (!t) return; const it = wsItem(t.closest(".wsi").dataset.wsi); const v = prompt("Name", it.title); if (v) { it.title = v.trim(); saveWS(); renderWS(); } });
  wsEl.addEventListener("input", e => { const n = e.target.closest("[data-note]"); if (n) { const it = wsItem(n.dataset.note); it.html = n.innerHTML; clearTimeout(n._t); n._t = setTimeout(saveWS, 400); } });
  wsEl.addEventListener("change", e => {
    const t = e.target;
    if (t.dataset.wsproj != null) { WS.current = t.value; saveWS(); renderWS(); renderTabs(); }
    if (t.hasAttribute("data-wsimp") && t.files[0]) t.files[0].text().then(tx => { const j = JSON.parse(tx); if (!j.items) throw 0; j.id = "p" + Date.now(); j.name = (j.name || "Imported") + " (imported)"; WS.projects.push(j); WS.current = j.id; saveWS(); renderWS(); toast("Project imported."); }).catch(() => toast("That isn't an Atlas project file."));
    const it = t.closest(".wsi") && wsItem(t.closest(".wsi").dataset.wsi);
    if (it && it.type === "chart" && specInput(it.spec, t)) { saveWS(); renderWS(); }
  });
  wsEl.addEventListener("click", e => {
    const b = e.target.closest("button,a"); if (!b) return; const ds = b.dataset, p = proj();
    if (ds.go) { setView(VIEW.mode === "ws" ? "split" : VIEW.mode); focus(ds.go); return; }
    if (ds.view) return setView(ds.view);
    if (b.hasAttribute("data-wsexp")) { b.nextElementSibling.hidden = !b.nextElementSibling.hidden; return; }
    if (b.hasAttribute("data-wsnew")) { const n = prompt("Name the new project", "Project " + (WS.projects.length + 1)); if (!n) return; const q = { id: "p" + Date.now(), name: n.trim(), items: [] }; WS.projects.push(q); WS.current = q.id; }
    else if (b.hasAttribute("data-wsren")) { const n = prompt("Rename the project", p.name); if (!n) return; p.name = n.trim(); }
    else if (b.hasAttribute("data-wsdel")) { if (!confirm(`Delete the project “${p.name}” and everything in it? This can't be undone (export it first to keep a copy).`)) return; WS.projects = WS.projects.filter(q => q !== p); if (!WS.projects.length) WS.projects.push({ id: "p" + Date.now(), name: "My project", items: [] }); WS.current = WS.projects[0].id; }
    else if (b.hasAttribute("data-wsnote")) { sendToWS({ type: "note", title: "Note", html: "", w: 320, h: 200 }); return; }
    else if (b.hasAttribute("data-wsshot")) { captureMap(); return; }
    else if (b.hasAttribute("data-wstidy")) { let x = 16, y = 16, rowH = 0; const W = wsEl.offsetWidth - 24; p.items.forEach(it => { if (x + it.w > W && x > 16) { x = 16; y += rowH + 16; rowH = 0; } it.x = x; it.y = y; x += it.w + 16; rowH = Math.max(rowH, it.h); }); }
    else if (b.hasAttribute("data-wspdf")) return exportPDF();
    else if (b.hasAttribute("data-wsslides")) return exportSlides();
    else if (b.hasAttribute("data-wsjson")) return download(new Blob([JSON.stringify(p, null, 1)], { type: "application/json" }), `atlas-project-${p.name.replace(/\W+/g, "-")}.json`);
    else if (ds.wsz != null) { const z = wsZoom(), i = WSZ.indexOf(WSZ.reduce((a, b) => Math.abs(b - z) < Math.abs(a - z) ? b : a)); WS.zoom = +ds.wsz === 0 ? 1 : WSZ[clamp(i + +ds.wsz, 0, WSZ.length - 1)]; }
    else if (ds.wsx) { const it = wsItem(ds.wsx), before = JSON.stringify(p.items); p.items = p.items.filter(i => i !== it); saveWS(); renderWS(); renderTabs(); undoToast("Removed.", () => { p.items = JSON.parse(before); saveWS(); renderWS(); }); return; }
    else if (ds.wssep) { // split a combined item back into the pieces it was made from, laid out side by side
      const it = wsItem(ds.wssep), before = JSON.stringify(p.items), kids = (it.parts || it.children || []).map(k => JSON.parse(JSON.stringify(k)));
      if (kids.length < 2) return; let x = it.x;
      kids.forEach((k, i) => { k.id = "w" + (++wsSeq); k.x = x; k.y = it.y + i * 24; k.z = maxZ() + 1 + i; k.w = k.w || 480; k.h = k.h || 360; if (!k.date) k.date = it.date; x += Math.min(k.w, 520) + 20; });
      p.items.splice(p.items.indexOf(it), 1, ...kids); saveWS(); renderWS(); renderTabs(); undoToast(`Separated into ${kids.length}.`, () => { p.items = JSON.parse(before); saveWS(); renderWS(); }); return;
    }
    else if (ds.wsdup) { const it = wsItem(ds.wsdup), c = JSON.parse(JSON.stringify(it)); c.id = "w" + (++wsSeq); c.x += 30; c.y += 30; c.z = maxZ() + 1; p.items.push(c); }
    else if (ds.wsref) { const it = wsItem(ds.wsref); it.date = state.date; if (it.cfg) it.cfg.date = state.date; }
    else if (ds.wstab) { const it = wsItem(ds.wstab); openTab(JSON.parse(JSON.stringify(it.spec))); return; }
    else { const it = b.closest(".wsi") && wsItem(b.closest(".wsi").dataset.wsi); if (it && it.type === "chart") { const d2 = Object.fromEntries(Object.entries(ds).map(([k, v]) => [k.replace(/^w/, "").replace(/^./, x => x.toLowerCase()), v])); if (!editSpec(it.spec, d2)) return; } else return; }
    saveWS(); renderWS(); renderTabs();
  });
  let lastMapPic = null;   // the last good picture of the map, for when it is hidden behind the workspace
  function mapPicture(maxW, q) { // -> a JPEG data URL of the map with the sea behind it, or null when nothing has been drawn yet
    const cv = map.getCanvas(); if (!cv.width) return null;
    const sc = Math.min(1, maxW / cv.width), out = document.createElement("canvas"); out.width = Math.round(cv.width * sc); out.height = Math.round(cv.height * sc);
    const g = out.getContext("2d"); g.drawImage(cv, 0, 0, out.width, out.height);
    const px = g.getImageData(0, 0, out.width, out.height).data; let drawn = false; for (let i = 3; i < px.length; i += 4 * 97) if (px[i]) { drawn = true; break; }
    if (!drawn) return null;
    g.globalCompositeOperation = "destination-over"; g.fillStyle = getComputedStyle(document.body).backgroundColor || "#aad3df"; g.fillRect(0, 0, out.width, out.height);   // JPEG has no transparency: put the sea behind
    return { src: out.toDataURL("image/jpeg", q || 0.82), w: out.width, h: out.height };
  }
  function freshMapPicture(maxW, q, cb) { // draw a frame first (a hidden map may never render one by itself)
    let done = false; const grab = () => { if (done) return; done = true; const pic = mapPicture(maxW, q); if (pic && maxW >= 600) lastMapPic = pic; cb(pic); };
    if (typeof map.redraw === "function" && !map.isMoving()) { try { map.redraw(); grab(); return; } catch (e) { /* fall back to the next frame */ } }
    map.once("render", grab); map.triggerRepaint(); setTimeout(grab, 700);
  }
  function captureMap() {
    freshMapPicture(1400, 0.82, pic => {
      if (!pic) { toast("The map hasn't finished drawing yet. Try again in a moment."); return; }
      const layers = curPlan.notes.filter(n => n.ch).map(n => M[n.id].label).join(", ");
      sendToWS({ type: "shot", title: `Map · ${longDate(state.date)}${layers ? " · " + layers : ""}`, src: pic.src, w: 600, h: Math.round(600 * pic.h / pic.w) + 40 });
    });
  }
  function itemPrintHTML(it) { return `<section class="pitem"><h2>${esc(it.title)}</h2><div class="pmeta">${esc(longDate(it.date || state.date))}</div>${itemBody(Object.assign({}, it, { w: 900, h: Math.max(it.h, 520) }), 900)}</section>`; }
  function exportPDF() {
    const p = proj(), area = $("print-area");
    area.innerHTML = `<section class="pitem ptitle"><h1>${esc(p.name)}</h1><p>Atlas workspace · ${esc(longDate(TODAY))} · ${p.items.length} items</p></section>` + p.items.slice().sort((a, b) => a.y - b.y || a.x - b.x).map(itemPrintHTML).join("");
    document.body.classList.add("printing"); setTimeout(() => { window.print(); document.body.classList.remove("printing"); }, 150);
  }
  function exportSlides() {
    const p = proj(), css = [...document.querySelectorAll("style")].map(s => s.textContent).join("\n");
    const slides = [`<section class="slide"><h1>${esc(p.name)}</h1><p>Atlas · ${esc(longDate(TODAY))}</p></section>`].concat(p.items.slice().sort((a, b) => a.y - b.y || a.x - b.x).map(it => `<section class="slide"><h2>${esc(it.title)}</h2><div class="sbody">${itemBody(Object.assign({}, it, { w: 1000, h: 620 }), 1000)}</div></section>`));
    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(p.name)}</title><style>${css}
      body{overflow:hidden;background:#111} .slide{position:absolute;inset:0;display:none;background:#fff;color:#1f2a2e;padding:40px 60px;box-sizing:border-box;overflow:auto} .slide.on{display:block} .slide h1{font-size:44px;margin-top:20vh} .slide h2{font-size:26px;margin:0 0 14px} .sbody{max-width:1040px} .slide .cp-styles,.slide [data-tip]{pointer-events:none} #nav{position:fixed;right:16px;bottom:12px;color:#888;font:12px system-ui;z-index:9}</style></head>
      <body>${slides.join("")}<div id="nav"></div><script>let i=0;const S=[...document.querySelectorAll('.slide')];function go(n){i=Math.max(0,Math.min(S.length-1,n));S.forEach((s,k)=>s.classList.toggle('on',k===i));document.getElementById('nav').textContent=(i+1)+' / '+S.length+'  ← → to move · F full screen';}document.addEventListener('keydown',e=>{if(['ArrowRight','PageDown',' '].includes(e.key))go(i+1);if(['ArrowLeft','PageUp'].includes(e.key))go(i-1);if(e.key==='f'||e.key==='F'){document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen&&document.documentElement.requestFullscreen();}if(e.key==='Home')go(0);if(e.key==='End')go(S.length-1);});document.addEventListener('click',e=>go(i+(e.clientX>innerWidth/3?1:-1)));go(0);<\/script></body></html>`;
    download(new Blob([html], { type: "text/html" }), `atlas-${p.name.replace(/\W+/g, "-")}-slides.html`);
    toast("Presentation saved: open the HTML file and use the arrow keys.");
  }
  // split view and full view
  function setView(mode) {
    if (mode === "ws" && VIEW.mode !== "ws") { try { lastMapPic = mapPicture(640, 0.6) || lastMapPic; } catch (x) {} }   // keep a picture for the tab overview
    VIEW.mode = mode; document.body.classList.toggle("split", mode === "split"); document.body.classList.toggle("wsfull", mode === "ws");
    document.documentElement.style.setProperty("--wsw", mode === "split" ? Math.round(innerWidth * (1 - VIEW.ratio)) + "px" : mode === "ws" ? "100vw" : "0px");
    wsEl.hidden = mode === "map"; wsDiv.hidden = mode !== "split";
    if (mode !== "map") renderWS();
    activeTab = mode === "map" ? "map" : mode === "ws" ? "ws" : activeTab === "ws" || activeTab === "map" ? "split" : activeTab;
    if (mode !== "map" && tabview && !tabview.hidden) tabview.hidden = true;
    renderTabs(); setTimeout(() => { map.resize(); refit(); }, 60);
  }
  function refit() { // keep the focused place (or the places shown together) and their cards inside the map pane
    if (FX && state.focus) { flyTo(state.focus, 0, true); setTimeout(placeFocusCard, 1200); }
    else if (GROUP) { fitGroup(); }
  }
  wsDiv.addEventListener("pointerdown", e => { e.preventDefault(); wsDiv.setPointerCapture(e.pointerId); document.body.classList.add("resizing");
    const mv = ev => { VIEW.ratio = clamp(ev.clientX / innerWidth, 0.2, 0.8); document.documentElement.style.setProperty("--wsw", Math.round(innerWidth * (1 - VIEW.ratio)) + "px"); map.resize(); };
    const up = () => { wsDiv.removeEventListener("pointermove", mv); document.body.classList.remove("resizing"); store.set("atlas-16-ratio", VIEW.ratio); renderWS(); refit(); };
    wsDiv.addEventListener("pointermove", mv); wsDiv.addEventListener("pointerup", up, { once: true }); });
  window.addEventListener("resize", () => { if (VIEW.mode === "split") setView("split"); });
  // swipes: two-finger sideways swipe moves between tabs; swipe up over the top bar shows all tabs
  const order = () => ["map", "ws", ...TABS.filter(t => t.id !== "map" && t.id !== "ws").map(t => t.id)];
  function goTab(id) { if (id === "map") { setView("map"); activateTab("map"); } else if (id === "ws") { if (VIEW.mode !== "split") setView("ws"); } else { setView("map"); activateTab(id); } }
  let swx = 0, swy = 0, swT = 0, swLock = 0;
  window.addEventListener("wheel", e => {
    const now = Date.now(); if (now < swLock) return; if (now - swT > 300) { swx = 0; swy = 0; } swT = now;
    const overBar = !!e.target.closest("#top,#tabs,.ws-bar"), overScroll = e.target.closest(".ws-canvas,.cp-body,.an-main,.tv-wrap,.cmp-main,#legend,.pm-list,table");
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY) * 1.5 && !overScroll) { swx += e.deltaX; if (Math.abs(swx) > 140) { const o = order(), cur = VIEW.mode === "ws" || VIEW.mode === "split" ? "ws" : activeTab, i = Math.max(0, o.indexOf(cur)); const next = o[clamp(i + (swx > 0 ? 1 : -1), 0, o.length - 1)]; swx = 0; swLock = now + 700; if (next !== cur) goTab(next); } }
    else if (overBar && e.deltaY < 0) { swy += e.deltaY; if (swy < -120) { swy = 0; swLock = now + 700; openOverview(); } }
  }, { passive: true });
  let touch0 = null;
  window.addEventListener("touchstart", e => { const t = e.touches[0]; touch0 = e.touches.length === 1 && (t.clientX < 24 || t.clientX > innerWidth - 24 || t.clientY < 60) ? { x: t.clientX, y: t.clientY } : null; }, { passive: true });
  window.addEventListener("touchend", e => { if (!touch0) return; const t = e.changedTouches[0], dx = t.clientX - touch0.x, dy = t.clientY - touch0.y; const o = order(), cur = VIEW.mode === "map" ? activeTab : "ws", i = Math.max(0, o.indexOf(cur));
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy)) goTab(o[clamp(i + (dx < 0 ? 1 : -1), 0, o.length - 1)]); else if (dy < -70 && touch0.y < 60) openOverview(); touch0 = null; }, { passive: true });
  const ovEl = $("tab-overview");
  function openOverview() {
    let shot = ""; try { const pic = mapPicture(640, 0.6) || lastMapPic; shot = pic ? pic.src : ""; } catch (x) {}
    const cards = [`<button class="ov" data-ov="map">${shot ? `<img src="${shot}" alt="">` : `<div class="ovws"><span>The map</span></div>`}<b>Map</b></button>`, `<button class="ov" data-ov="ws"><div class="ovws">${proj().items.slice(0, 6).map(i => `<span>${esc(i.title)}</span>`).join("") || "<span>Empty</span>"}</div><b>Workspace · ${esc(proj().name)} (${proj().items.length})</b></button>`]
      .concat(TABS.filter(t => t.spec).map(t => `<button class="ov" data-ov="${t.id}"><div class="ovch">${withDate(state.date, () => drawChart(t.spec, 320))}</div><b>${esc(t.label)}</b></button>`));
    ovEl.innerHTML = `<div class="ov-head"><b>All tabs</b><span>Swipe sideways to move between them · Esc to close</span></div><div class="ov-grid">${cards.join("")}</div>`; ovEl.hidden = false;
  }
  function sendTile(codes) { // a tile: the places as a small map in their current colours, with their values for what's on the map
    codes = codes.filter(c => P[c]); if (!codes.length) return;
    const fills = {}; codes.forEach(c => { fills[c] = LAST.fc[c] || ""; });
    const ms = planMetrics().filter(m => m.nature !== "site").slice(0, 4);
    const lines = codes.slice(0, 6).map(c => `<li><b>${esc(nameOf(c))}</b>: ${ms.map(m => { const r = m.get(c, state.date); return `${esc(m.label)} ${esc(r ? r.text : "—")}`; }).join(" · ")}</li>`).join("");
    sendToWS({ type: "tile", title: codes.length <= 3 ? codes.map(nameOf).join(", ") : `${codes.length} places`, codes, fills, lines, w: 420, h: 420 });
  }
  floating(cpanel, ".cp-head", "atlas-16-chart-pos", () => ({ x: innerWidth - 660, y: Math.max(60, innerHeight - 700), w: 640, h: Math.min(620, innerHeight - 140) }));
  cpanel.addEventListener("fwin-resized", () => { if (CHART.drawn) renderChartBody(); });
  floating(cmpEl, ".cmp-top", "atlas-16-cmp-pos", () => sideWin(980, 0.62));
  floating(expEl, ".cmp-top", "atlas-16-exp-pos", () => sideWin(900, 0.6));
  $("open-analyse").addEventListener("click", () => openAnalyse());
  ovEl.addEventListener("click", e => { const b = e.target.closest("[data-ov]"); ovEl.hidden = true; if (b) goTab(b.dataset.ov); });

  // ---------- fly ----------
  const ZR = { zone: [12.2, 15.5], nation: [4.6, Z.region - 0.1], region: [Z.region + 0.1, Z.council - 0.1], council: [Z.council + 0.2, Z.ward - 0.1], constituency: [6.4, 12], ward: [Z.ward + 0.2, 14], country: [4.6, 5] };
  function flyTo(code, tries, room) {
    const p = P[code]; if (!p) return;
    if (p.level === "country") { map.easeTo({ center: HOME, zoom: HOME_Z, duration: 800 }); return; }
    const f = featureOf(code);
    if (!f) { if (p.level === "ward") { loadWards(p.parent); if ((tries || 0) < 25) setTimeout(() => flyTo(code, (tries || 0) + 1, room), 150); } return; }
    const b = bboxOfGeom(f.geometry), W = mapW();
    const pad = room ? { top: 80, bottom: 130, left: Math.min(520, W * 0.42), right: Math.min(360, W * 0.26) } : 90;
    const cam = map.cameraForBounds([[b[0], b[1]], [b[2], b[3]]], { padding: pad }) || {};
    map.flyTo({ center: cam.center, zoom: clamp(cam.zoom || ZR[p.level][0], ZR[p.level][0], ZR[p.level][1]), duration: 1100, curve: 1.3, essential: true });
  }

  // ---------- settings menu ----------
  const menu = $("menu"), brand = $("brand");
  brand.addEventListener("click", () => { const open = menu.hidden; menu.hidden = !open; brand.setAttribute("aria-expanded", String(open)); if (open) { renderStates(); closeBrowse(); } });
  function closeMenu() { if (menu.hidden) return false; menu.hidden = true; brand.setAttribute("aria-expanded", "false"); return true; }
  function closeTools() { if (tbMenu.hidden) return false; tbMenu.hidden = true; tbBtn.setAttribute("aria-expanded", "false"); return true; }
  document.addEventListener("keydown", e => {
    if (e.key !== "Escape") return;
    if (state.tool === "measure" && measure.pts.length && !measure.done) return finishMeasure(false);
    if (state.tool) { setTool(null); if (!tbMenu.hidden) renderTools(); return; }
    if (ecardPinned) { ecard.hidden = true; ecardPinned = false; return; }
    if (!ovEl.hidden) { ovEl.hidden = true; return; }
    if (activeTab !== "map" && activeTab !== "split" && VIEW.mode === "map") { activateTab("map"); return; }
    if (!anEl.hidden) { anEl.hidden = true; return; }
    if (!cpanel.hidden) { closeChart(); return; }
    if (!notesEl.hidden) { notesEl.hidden = true; notesH.classList.remove("open"); return; }
    if (closePMenu() || closeHist() || closeExport() || closeCmp() || closeBrowse() || closeMenu() || closeTools() || clearGroup()) return;
    if (state.iso) { state.iso = null; LEVELS.forEach(paintLevel); renderLegend(); return; }
    if (state.focus || state.pinned) { unfocus(); return; }
    if (anyMapped()) clearAllLayers();
  });
  document.addEventListener("mousedown", e => {
    if (pmOpen && !pmenu.contains(e.target) && !dock.contains(e.target)) closePMenu();
    if (!$("browse").hidden && !e.target.closest(".finder")) closeBrowse();
    if (!menu.hidden && !menu.contains(e.target) && !brand.contains(e.target)) closeMenu();
    if (!tbMenu.hidden && !tbMenu.contains(e.target) && !tbBtn.contains(e.target)) closeTools();
    if (ecardPinned && !ecard.contains(e.target) && !e.target.closest("#map")) { ecard.hidden = true; ecardPinned = false; }
  });
  function syncMenu() {
    document.querySelectorAll("#mode button").forEach(b => b.classList.toggle("on", b.dataset.mode === look.mode));
    document.querySelectorAll("#types button").forEach(b => { b.classList.toggle("on", b.dataset.type === look.type); b.disabled = plain && b.dataset.type !== "map"; });
    $("thick").value = look.thick; $("thick-out").textContent = (+look.thick).toFixed(1) + "×"; $("cvd").setAttribute("aria-checked", String(look.cvd));
  }
  $("mode").addEventListener("click", e => { const b = e.target.closest("button"); if (b) { look.mode = b.dataset.mode; applyLook(); syncFocusColour(); } });
  $("types").addEventListener("click", e => { const b = e.target.closest("button"); if (b && !b.disabled) { look.type = b.dataset.type; applyLook(); } });
  $("thick").addEventListener("input", e => { look.thick = +e.target.value; applyLook(); });
  $("cvd").addEventListener("click", () => { look.cvd = !look.cvd; applyLook(); });
  function renderStates() {
    const bx = $("states");
    bx.innerHTML = E.states.length ? E.states.map((s, i) => `<div class="state"><span>${esc(s.name)}<small>${esc(s.look.mode)} · ${esc(s.look.type)}${s.persp ? " · " + esc(Object.values(s.persp.mapped || {}).flat().length + " layers") : ""}${s.date ? " · " + esc(dmy(s.date)) : ""}</small></span><button class="btn" data-load="${i}">Load</button><button class="btn" data-del="${i}" aria-label="Delete ${esc(s.name)}">×</button></div>`).join("")
      : `<div class="empty-note">No saved views yet. Set up the map how you like it, name it below and press Save view.</div>`;
  }
  $("states").addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.load != null) {
      const s = E.states[+b.dataset.load]; Object.assign(look, s.look); applyLook();
      if (s.persp) { ["on", "active", "card", "prefs"].forEach(k => Object.assign(PS[k], s.persp[k] || {})); Object.entries(s.persp.mapped || {}).forEach(([p, v]) => { PS.mapped[p] = (Array.isArray(v) ? v : [v]).filter(id => M[id]); }); PS.order = (s.persp.order || PS.order).slice(); if (s.persp.biv && typeof s.persp.biv === "object") PS.biv = Object.assign({}, s.persp.biv); if (s.persp.win) PS.win = s.persp.win; PERSPECTIVES.forEach(p => syncOn(p.id)); repaint(); }
      if (s.date) setDate(s.date > TODAY ? TODAY : s.date);
      map.flyTo({ center: s.center, zoom: s.zoom, duration: 1600, essential: true }); toast(`Loaded "${s.name}".`);
    } else if (b.dataset.del != null) { const [s] = E.states.splice(+b.dataset.del, 1); persist(); renderStates(); toast(`Deleted "${s.name}".`); }
  });
  $("state-save").addEventListener("click", () => {
    const inp = $("state-name"), name = inp.value.trim() || `View ${E.states.length + 1}`, c = map.getCenter();
    const s = { name, look: { ...look }, persp: JSON.parse(JSON.stringify(PS)), date: state.date, center: [+c.lng.toFixed(4), +c.lat.toFixed(4)], zoom: +map.getZoom().toFixed(2), saved: Date.now() };
    const i = E.states.findIndex(x => x.name === name); if (i >= 0) E.states[i] = s; else E.states.push(s);
    persist(); renderStates(); inp.value = ""; toast(`Saved "${name}".`);
  });
  $("export").addEventListener("click", () => { const text = "// Atlas edits and saved views. Put this file in the data folder (replacing data/edits.js) to share them.\nwindow.ATLAS_EDITS = " + JSON.stringify(E, null, 1) + ";\n"; download(new Blob([text], { type: "text/javascript" }), "edits.js"); toast("Exported edits.js. Move it into the data folder to share it."); });
  $("import").addEventListener("change", e => {
    const f = e.target.files[0]; if (!f) return;
    f.text().then(t => { const j = JSON.parse(t.slice(t.indexOf("{"), t.lastIndexOf("}") + 1)); if (!j.areas) throw 0; E = merge(E, j); persist(); renderStates(); renderTray(); toast("Imported."); }).catch(() => toast("That file isn't an Atlas edits file.")).finally(() => { e.target.value = ""; });
  });

  // ---------- search ----------
  // Typing + Enter: jump straight to the best match (as before).
  // The dropdown has a tickbox on every result: tick places (across several searches), then press its Search button to show
  // them all together in one frame, with the rest of the map softened and a card for each. Only the dropdown does this.
  const si = $("search"), hl = $("hits"), tickPill = $("schips");
  const names = Object.keys(P).filter(c => P[c].level !== "country"), rankL = { nation: 0, region: 1, zone: 2, council: 2, constituency: 2.5, ward: 3 };
  function searchNames(q) { return names.filter(c => nameOf(c).toLowerCase().includes(q) || c.toLowerCase() === q).sort((a, b) => (nameOf(a).toLowerCase() === q ? 0 : nameOf(a).toLowerCase().startsWith(q) ? 1 : 2) - (nameOf(b).toLowerCase() === q ? 0 : nameOf(b).toLowerCase().startsWith(q) ? 1 : 2) || rankL[P[a].level] - rankL[P[b].level]).slice(0, 10); }
  let hits = [], cur = 0, picked = [], ddOpen = false;
  const subOf = c => (P[c].level === "ward" || P[c].level === "constituency") && P[c].parent && P[P[c].parent] ? " · " + esc(nameOf(P[c].parent)) : "";
  const row = (c, i) => `<li data-c="${c}" class="${i === cur ? "on" : ""}${picked.includes(c) ? " ticked" : ""}" role="option" aria-selected="${picked.includes(c)}"><input type="checkbox" tabindex="-1" ${picked.includes(c) ? "checked" : ""} aria-label="Tick ${esc(nameOf(c))}"><span class="nm">${esc(nameOf(c))}</span><small>${LABEL[P[c].level]}${subOf(c)}</small></li>`;
  function showHits() {
    const extra = picked.filter(c => !hits.includes(c));
    const body = (extra.length ? `<li class="sec">Ticked</li>${extra.map(c => row(c, -1)).join("")}${hits.length ? `<li class="sec">Results</li>` : ""}` : "") + hits.map(row).join("");
    hl.innerHTML = body + `<li class="sfoot"><span>${picked.length ? `${picked.length} ticked` : "Tick places to show several together"}</span>${picked.length ? `<button type="button" class="btn" data-sclear>Clear</button>` : ""}<button type="button" class="btn primary" data-ssearch ${picked.length ? "" : "disabled"}>Search${picked.length > 1 ? ` (${picked.length})` : ""}</button></li>`;
    hl.hidden = !ddOpen || (!hits.length && !picked.length);
    tickPill.hidden = !picked.length || !hl.hidden; tickPill.innerHTML = `<button type="button" data-sopen>${picked.length} ticked</button>`;
  }
  si.addEventListener("input", () => { const q = si.value.trim().toLowerCase(); hits = q.length < 2 ? [] : searchNames(q); cur = 0; ddOpen = true; showHits(); });
  si.addEventListener("focus", () => { closeBrowse(); ddOpen = true; showHits(); });
  si.addEventListener("blur", () => { setTimeout(() => { if (document.activeElement !== si) { ddOpen = false; showHits(); } }, 120); });
  function toggleTick(c) { picked = picked.includes(c) ? picked.filter(x => x !== c) : picked.concat(c); showHits(); if (!browse.hidden) renderPFoot(); }
  function jumpTo(code) { si.value = ""; hits = []; ddOpen = false; showHits(); si.blur(); closeBrowse(); focus(code); }
  function searchTicked() {
    const codes = picked.slice(); if (!codes.length) return;
    picked = []; si.value = ""; hits = []; ddOpen = false; showHits(); si.blur(); closeBrowse();
    if (codes.length === 1) focus(codes[0]); else showGroup(codes);
  }
  si.addEventListener("keydown", e => {
    if (e.key === "ArrowDown") { cur = Math.min(hits.length - 1, cur + 1); showHits(); e.preventDefault(); }
    else if (e.key === "ArrowUp") { cur = Math.max(0, cur - 1); showHits(); e.preventDefault(); }
    else if (e.key === "Enter") { e.preventDefault(); const q = si.value.trim().toLowerCase(); const h = hits[cur] || (q.length >= 2 && searchNames(q)[0]); if (h) jumpTo(h); }
    else if (e.key === " " && e.altKey && hits[cur]) { e.preventDefault(); toggleTick(hits[cur]); }
    else if (e.key === "Escape") { ddOpen = false; showHits(); si.blur(); }
  });
  hl.addEventListener("mousedown", e => {
    e.preventDefault(); // keep the search box focused so the dropdown stays open
    const b = e.target.closest("button");
    if (b && b.hasAttribute("data-ssearch")) return searchTicked();
    if (b && b.hasAttribute("data-sclear")) { picked = []; showHits(); return; }
    const li = e.target.closest("li[data-c]"); if (li) toggleTick(li.dataset.c);
  });
  tickPill.addEventListener("mousedown", e => { e.preventDefault(); si.focus(); });
  showHits();

  // ---------- several places together ----------
  // All of them fit in one frame; the rest of the map is softened (as when one area is focused); their cards sit in a
  // column to the right, each joined to its place by a thin line, so no card covers any of the places.
  const gcards = $("gcards"), glinks = $("glinks"); let GROUP = null;
  const GROUP_CARDS = 8, CARD_W = 260, GAP = 8;
  const groupCardHTML = c => `<button class="x" data-gx="${c}" aria-label="Remove ${esc(nameOf(c))}">×</button><span class="gnum">${GROUP.codes.indexOf(c) + 1}</span>${cardHTML(c, false)}<div class="acts"><button class="btn" data-gfocus="${c}">Focus</button><button class="btn" data-gadd="${c}">${state.sel.some(s => s.code === c) ? "✓ Selected" : "+ Compare"}</button></div>`;
  function showGroup(codes, tries) {
    const missing = codes.filter(c => !featureOf(c));
    missing.forEach(c => { if (P[c].level === "ward") loadWards(P[c].parent); });
    if (missing.some(c => P[c].level === "ward") && (tries || 0) < 25) { setTimeout(() => showGroup(codes, (tries || 0) + 1), 150); return; }
    unfocus(); clearGroup();
    const feats = codes.map(featureOf).filter(Boolean); if (!feats.length) return;
    GROUP = { codes: feats.map(f => f.properties.code), feats, cols: 0 };
    GROUP.rings = feats.flatMap(f => { let n = 0; polysOf(f.geometry).forEach(pl => n += pl[0].length); const step = Math.max(1, Math.ceil(n / 900)); return polysOf(f.geometry).map(pl => pl[0].filter((c, i) => i % step === 0)).filter(r => r.length >= 4); });
    map.getSource("group").setData({ type: "FeatureCollection", features: feats });
    const showCards = GROUP.codes.length <= GROUP_CARDS;
    if (showCards) { gcards.innerHTML = GROUP.codes.map(c => `<div class="card pinned gcard" data-gc="${c}">${groupCardHTML(c)}</div>`).join(""); gcards.hidden = false; }
    else toast(`${GROUP.codes.length} places shown. Cards appear for up to ${GROUP_CARDS}; use the compare button for the rest.`);
    veil.classList.add("on"); document.body.classList.add("grouped");
    fitGroup(); updateGroupOverlay(); bubbleNudge();
  }
  function cardColumns() { // how many card columns are needed so the cards fit between the top bar and the time bar
    if (gcards.hidden) return 0;
    const avail = Math.max(200, barTop() - 8 - 64), hs = [...gcards.querySelectorAll(".gcard")].map(el => Math.min(el.offsetHeight, avail));
    let cols = 1, used = 0; hs.forEach(h => { if (used + h > avail) { cols++; used = 0; } used += h + GAP; }); return cols;
  }
  function fitGroup() {
    let b = [180, 90, -180, -90]; GROUP.feats.forEach(f => { const x = bboxOfGeom(f.geometry); b = [Math.min(b[0], x[0]), Math.min(b[1], x[1]), Math.max(b[2], x[2]), Math.max(b[3], x[3])]; });
    GROUP.cols = cardColumns();
    const W = mapW(), right = GROUP.cols ? GROUP.cols * (CARD_W + GAP) + 80 : 70, left = Math.min(360, W * 0.25);
    const cam = map.cameraForBounds([[b[0], b[1]], [b[2], b[3]]], { padding: { top: 80, bottom: window.innerHeight - barTop() + 30, left, right: Math.min(right, W - left - 200) } }) || {};
    map.flyTo({ center: cam.center, zoom: clamp(cam.zoom || 7, 3.5, 13), duration: 1100, curve: 1.3, essential: true });
  }
  function placeGroupCards() {
    if (!GROUP || gcards.hidden) { glinks.innerHTML = ""; return; }
    const W = mapW(), top0 = 64, avail = barTop() - 8 - top0;
    const items = [...gcards.querySelectorAll(".gcard")].map(el => { const c = el.dataset.gc, f = GROUP.feats.find(x => x.properties.code === c); const q = map.project(PT[c] || (() => { const bb = bboxOfGeom(f.geometry); return [(bb[0] + bb[2]) / 2, (bb[1] + bb[3]) / 2]; })()); return { el, c, q, h: Math.min(el.offsetHeight, avail) }; });
    items.sort((a, b) => a.q.y - b.q.y);
    // fill columns from the right; within a column, cards follow their places from top to bottom
    const cols = []; let colI = 0, y = 0; items.forEach(it => { if (y + it.h > avail && y > 0) { colI++; y = 0; } (cols[colI] = cols[colI] || []).push(it); it.col = colI; it.y = y; y += it.h + GAP; });
    cols.forEach(col => { const tot = col.reduce((a, it) => a + it.h + GAP, -GAP), off = top0 + Math.max(0, (avail - tot) / 2); col.forEach(it => { it.top = off + it.y; }); });
    const lines = [];
    items.forEach(it => {
      const left = W - 64 - (it.col + 1) * (CARD_W + GAP) + GAP;
      Object.assign(it.el.style, { left: left + "px", top: it.top + "px", maxHeight: it.h + "px" });
      const cy = it.top + Math.min(40, it.h / 2);
      lines.push(`<path d="M${it.q.x.toFixed(1)} ${it.q.y.toFixed(1)}C${((it.q.x + left) / 2).toFixed(1)} ${it.q.y.toFixed(1)} ${((it.q.x + left) / 2).toFixed(1)} ${cy.toFixed(1)} ${left} ${cy.toFixed(1)}"/><circle cx="${it.q.x.toFixed(1)}" cy="${it.q.y.toFixed(1)}" r="9"/><text x="${it.q.x.toFixed(1)}" y="${(it.q.y + 3.5).toFixed(1)}">${GROUP.codes.indexOf(it.c) + 1}</text>`);
    });
    glinks.innerHTML = lines.join("");
  }
  function updateGroupOverlay() {
    if (!GROUP) return;
    const W = window.innerWidth, H = window.innerHeight; let d = `M0 0H${W}V${H}H0Z`;
    GROUP.rings.forEach(r => { d += "M"; r.forEach((c, i) => { const q = map.project(c); d += (i ? "L" : "") + q.x.toFixed(1) + " " + q.y.toFixed(1); }); d += "Z"; });
    const cp = `path(evenodd, "${d}")`; veil.style.clipPath = cp; veil.style.webkitClipPath = cp;
    placeGroupCards();
  }
  function refreshGroupCards() { if (!GROUP || gcards.hidden) return; gcards.querySelectorAll(".gcard").forEach(el => { el.innerHTML = groupCardHTML(el.dataset.gc); }); placeGroupCards(); }
  function removeFromGroup(c) {
    if (!GROUP) return; GROUP.codes = GROUP.codes.filter(x => x !== c); GROUP.feats = GROUP.feats.filter(f => f.properties.code !== c);
    if (!GROUP.codes.length) { clearGroup(); return; }
    GROUP.rings = GROUP.feats.flatMap(f => polysOf(f.geometry).map(pl => pl[0]).filter(r => r.length >= 4));
    const el = gcards.querySelector(`[data-gc="${c}"]`); if (el) el.remove(); refreshGroupCards();
    map.getSource("group").setData({ type: "FeatureCollection", features: GROUP.feats }); updateGroupOverlay();
  }
  function clearGroup() {
    if (!GROUP) return false; GROUP = null; gcards.innerHTML = ""; gcards.hidden = true; glinks.innerHTML = ""; document.body.classList.remove("grouped");
    if (!FX) { veil.classList.remove("on"); veil.style.clipPath = ""; veil.style.webkitClipPath = ""; }
    if (map.getSource("group")) map.getSource("group").setData({ type: "FeatureCollection", features: [] }); return true;
  }
  gcards.addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.gx) removeFromGroup(b.dataset.gx);
    else if (b.dataset.gfocus) { const c = b.dataset.gfocus; clearGroup(); focus(c); }
    else if (b.dataset.gadd) { toggleCompare({ code: b.dataset.gadd, level: P[b.dataset.gadd].level }); b.textContent = state.sel.some(s => s.code === b.dataset.gadd) ? "✓ Selected" : "+ Compare"; }
  });
  map.on("render", () => { if (GROUP) updateGroupOverlay(); });
  window.addEventListener("resize", () => { if (GROUP) updateGroupOverlay(); });


  // ---------- area browser ----------
  const browse = $("browse"), bbtn = $("browse-btn");
  const CATS = [{ h: "Administrative divisions" }, { id: "country", label: "Country", codes: () => [UKC] }, { id: "nation", label: "Nations", codes: () => G.nations.features.map(f => f.properties.code) },
    { id: "region", label: "Regions", codes: () => G.regions.features.map(f => f.properties.code) }, { id: "council", label: "Councils", codes: () => COUNCIL_CODES }, { id: "ward", label: "Wards", codes: () => COUNCIL_CODES, nested: true },
    { h: "Electoral" }, { id: "constituency", label: "Westminster constituencies", codes: () => Object.keys(P).filter(c => P[c].level === "constituency" && !P[c].to) }, 
    { h: "Custom zones" }, { id: "zone", label: "Financial districts", codes: () => ZONES.map(f => f.properties.code), off: !ZONES.length },
    { h: "Coming later" }, { id: "ca", label: "Combined authorities", off: true }, { id: "hb", label: "Health boards", off: true }];
  const wardCount = names.filter(c => P[c].level === "ward").length;
  let bcat = "council", bopen = null;
  function renderPFoot() {
    const f = $("pfoot"); if (!f) return;
    f.innerHTML = `<span>${picked.length ? `${picked.length} ticked: ${esc(picked.slice(0, 3).map(nameOf).join(", "))}${picked.length > 3 ? "…" : ""}` : "Tick places to show them together"}</span>${picked.length ? `<button class="btn" data-pclear>Clear</button>` : ""}<button class="btn primary" data-psearch ${picked.length ? "" : "disabled"}>Search${picked.length > 1 ? ` (${picked.length})` : ""}</button>`;
  }
  function renderBrowse() {
    renderPFoot();
    $("cats").innerHTML = CATS.map(c => c.h ? `<h4>${esc(c.h)}</h4>` : `<button data-cat="${c.id}" class="${c.id === bcat ? "on" : ""}" ${c.off ? "disabled" : ""}>${esc(c.label)}<small>${c.off ? "soon" : (c.id === "ward" ? wardCount : c.codes().length).toLocaleString("en-GB")}</small></button>`).join("");
    const cat = CATS.find(c => c.id === bcat), q = $("pfilter").value.trim().toLowerCase(); $("plevel").hidden = bcat === "country"; $("plevel").textContent = !LV.auto && LV.active === bcat ? "✓ On the map" : "Show on map";
    let list = cat.codes().slice().sort((a, b) => nameOf(a).localeCompare(nameOf(b)));
    const sub = c => bcat === "constituency" ? `${P[c].parent && P[P[c].parent] ? nameOf(P[c].parent) : ""}` : bcat === "ward" ? `${names.filter(w => P[w].parent === c && P[w].level === "ward").length} wards ›` : P[c].parent && P[P[c].parent] ? nameOf(P[c].parent) : "";
    if (bcat === "ward") {
      const wq = q.length >= 2 ? names.filter(w => P[w].level === "ward" && nameOf(w).toLowerCase().includes(q)).slice(0, 200) : null;
      if (wq) { $("plist").innerHTML = wq.length ? wq.map(w => `<li><button data-place="${w}" class="pk${picked.includes(w) ? " on" : ""}"><input type="checkbox" tabindex="-1" ${picked.includes(w) ? "checked" : ""} aria-hidden="true"><span class="nm">${esc(nameOf(w))}</span><small>${esc(nameOf(P[w].parent))}</small></button></li>`).join("") : `<li class="note">No wards match.</li>`; return; }
      $("plist").innerHTML = list.map(c => `<li><button data-council="${c}" aria-expanded="${bopen === c}">${esc(nameOf(c))}<small>${sub(c)}</small></button>${bopen === c ? `<ul>${names.filter(w => P[w].parent === c && P[w].level === "ward").sort((a, b) => nameOf(a).localeCompare(nameOf(b))).map(w => `<li><button data-place="${w}" class="pk${picked.includes(w) ? " on" : ""}"><input type="checkbox" tabindex="-1" ${picked.includes(w) ? "checked" : ""} aria-hidden="true"><span class="nm">${esc(nameOf(w))}</span></button></li>`).join("")}</ul>` : ""}</li>`).join("");
      return;
    }
    if (q) list = list.filter(c => nameOf(c).toLowerCase().includes(q));
    $("plist").innerHTML = list.length ? list.map(c => `<li><button data-place="${c}" class="pk${picked.includes(c) ? " on" : ""}"><input type="checkbox" tabindex="-1" ${picked.includes(c) ? "checked" : ""} aria-hidden="true"><span class="nm">${esc(nameOf(c))}</span><small>${esc(sub(c))}</small></button></li>`).join("") : `<li class="note">Nothing matches.</li>`;
  }
  const PLURAL = { nation: "Nations", region: "Regions", council: "Councils", constituency: "Constituencies", ward: "Wards" };
  function renderLevelPicker() {
    const el = $("lvpick"); if (!el) return;
    $("browse-lv").textContent = PLURAL[state.level] || "Areas";
    el.innerHTML = `<div class="lvt">Boundaries on the map <small>${LV.auto ? "following the zoom" : "at every zoom"}</small></div>
      <label class="lvrow lvauto"><input type="checkbox" data-lv="auto" ${LV.auto ? "checked" : ""}><span>Automatic</span><small>switch with zoom</small></label>
      ${["nation", "region", "council", "constituency", "ward"].map(l => { const on = !LV.auto && LV.on.includes(l), act = state.level === l; return `<div class="lvrow${act ? " act" : ""}${on ? " on" : ""}"><input type="checkbox" id="lv-${l}" data-lv="${l}" ${on ? "checked" : ""} aria-label="Show ${PLURAL[l]} on the map"><button data-mk="${l}" title="${act ? "Colours, hover cards and clicks use this set" : "Use this set for colours, hover cards and clicks"}">${PLURAL[l]}</button>${act ? `<small>colours &amp; hover</small>` : on ? `<small>outline</small>` : ""}</div>${l === "constituency" && window.ATLAS_HEX ? `<label class="lvrow lvhex"><input type="checkbox" data-hex ${PS.hex ? "checked" : ""}><span>Hex map (equal area)</span><small>one hexagon per seat</small></label>` : ""}`; }).join("")}`;
  }
  $("lvpick").addEventListener("change", e => {
    if (e.target.hasAttribute("data-hex")) { PS.hex = e.target.checked; savePS(); syncPcon.warned = false; if (PS.hex && state.level !== "constituency") makeActive("constituency"); syncPcon(true); renderLevelPicker(); toast(PS.hex ? "Hex map: every seat the same size, so big rural seats don't dominate. Positions are approximate." : "Back to the real boundaries."); return; }
    const t = e.target.closest("[data-lv]"); if (t) setLevelOn(t.dataset.lv, t.checked); renderBrowse(); });
  $("lvpick").addEventListener("click", e => { const b = e.target.closest("[data-mk]"); if (b) { makeActive(b.dataset.mk); renderBrowse(); } });
  function closeBrowse() { if (browse.hidden) return false; browse.hidden = true; bbtn.setAttribute("aria-expanded", "false"); return true; }
  bbtn.addEventListener("click", () => { if (!browse.hidden) return closeBrowse(); browse.hidden = false; bbtn.setAttribute("aria-expanded", "true"); closeMenu(); renderLevelPicker(); renderBrowse(); $("pfilter").focus(); });
  $("cats").addEventListener("click", e => { const b = e.target.closest("[data-cat]"); if (!b || b.disabled) return; bcat = b.dataset.cat; bopen = null; $("pfilter").value = ""; renderBrowse(); });
  $("pfilter").addEventListener("input", renderBrowse);
  $("plevel").addEventListener("click", () => { if (bcat !== "country") makeActive(bcat); });
  $("pfoot").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; if (b.hasAttribute("data-psearch")) searchTicked(); else if (b.hasAttribute("data-pclear")) { picked = []; showHits(); renderBrowse(); } });
  $("plist").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; if (b.dataset.council) { bopen = bopen === b.dataset.council ? null : b.dataset.council; renderBrowse(); return; } if (b.dataset.place) { toggleTick(b.dataset.place); renderBrowse(); } });

  // ---------- start ----------
  draggable(legend, $("legend-grip"), "atlas-031-legend-pos", positionLegend);
  resizable(legend, "atlas-061-legend-size", { minW: 240, minH: 120, after: positionLegend });
  resizable(timebar, "atlas-061-timebar-size", { widthOnly: true, centred: true, minW: 320 });
  $("legend-grip").insertAdjacentHTML("beforeend", `<button class="kclear" data-lclear title="Take everything off the map (Esc)">Clear all</button>`);
  $("legend-grip").querySelector(".kx") && $("legend-grip").appendChild($("legend-grip").querySelector(".kx"));
  $("legend-x").addEventListener("click", () => { setKeyHidden(true); toast("Key closed. Press Key (bottom left) to bring it back."); });
  $("key-show").addEventListener("click", () => setKeyHidden(false));
  draggable(timebar, $("tb-grip"), "atlas-031-timebar-pos");
  if (window.ResizeObserver) new ResizeObserver(() => positionLegend()).observe(dock);
  syncMenu(); renderSteps(); renderDock(); renderSup(); renderLevelPicker(); armFold();
  document.body.classList.toggle("hot", !!PS.hot); renderTabs();
  slider.value = monthIdx(state.date); dateIn.value = dmy(state.date);
  document.documentElement.dataset.mode = look.mode;
  curPlan = EN.plan(planMetrics(), PS.prefs);
  renderLegend(); renderTNote();
  document.documentElement.style.setProperty("--veil-a", (0.55 * TOOLS.soften).toFixed(3));
  document.documentElement.style.setProperty("--veil-blur", (3 * TOOLS.soften * TOOLS.soften * 1.6).toFixed(2) + "px");
})();
