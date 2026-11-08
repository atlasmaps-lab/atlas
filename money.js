/* Atlas 0.8 · money in politics (core). Wherever there is a money link, Atlas shows it:
 *   MP card      donations registered to the MP, registered interests (earnings, gifts, visits, shareholdings…),
 *                donors who have won public contracts
 *   party card   donations by year, by kind of donor, the biggest donors, loans
 *   donor card   what they gave, to whom and when; public contracts won (companies); where they are
 *   area cards   a "Political money" line for constituencies and councils (local parties and MPs here)
 *   company card (Markets) a box when a donor has the same name: shown as a possible link
 * Data: data/money.js (summary, always loaded) and data/money_detail.js (every donation since 2010, loaded on demand).
 * Wording rule: say what was registered, with the source and date; never imply more.
 */
(function () {
  "use strict";
  const MO = window.ATLAS_MONEY; if (!MO) return;
  let ctx = null, detail = window.ATLAS_MONEY_DETAIL || null, loading = null;
  const esc = t => String(t == null ? "" : t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const gbp = v => v == null ? "—" : v >= 1e6 ? "£" + (v / 1e6).toFixed(v >= 1e7 ? 0 : 1) + "m" : v >= 1e4 ? "£" + Math.round(v / 1e3) + "k" : "£" + Math.round(v).toLocaleString("en-GB");
  const day = d => { try { return new Date(d + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); } catch (e) { return d; } };
  const partyName = k => k && k.startsWith("mp:") ? (MO.mps[k.slice(3)] || {}).n || "an MP" : k && k.startsWith("d:") ? k.slice(2) : (MO.parties[k] || {}).n || (MO.partyNames[k] || [])[0] || (ctx ? ctx.partyName(k) : k);
  const partyCol = k => (MO.partyNames[k] || [])[1] || (ctx ? ctx.partyCol(k) : "#888");
  const STATUS = MO.status;
  const SRC = `<p class="mo-src">Source: ${esc(MO.sources)} Figures are what was registered, as published; Atlas adds nothing.</p>`;

  function loadDetail() {
    if (detail) return Promise.resolve(detail);
    if (loading) return loading;
    loading = new Promise((res, rej) => { const s = document.createElement("script"); s.src = "data/money_detail.js?v=" + (MO.built || ""); s.onload = () => { detail = window.ATLAS_MONEY_DETAIL; res(detail); }; s.onerror = rej; document.head.appendChild(s); });
    return loading;
  }
  const donorName = id => { const d = MO.donors[id] || (detail && detail.donors[id]); return d ? d[0] : "Donor " + id; };
  const donorBtn = id => `<button class="linkish" data-modonor="${esc(id)}">${esc(donorName(id))}</button>${MO.meetDonors && MO.meetDonors[id] ? ` <span class="mo-badge mo-met" title="An organisation of this name met ministers (${MO.meetDonors[id]} meetings since July 2024)">met ministers</span>` : ""}`;
  const mpBtn = mid => `<button class="linkish" data-momp="${esc(mid)}">${esc((MO.mps[mid] || {}).n || "MP")}</button>`;
  const recipientBtn = k => k.startsWith("mp:") ? mpBtn(k.slice(3)) : k.startsWith("d:") ? esc(k.slice(2)) : `<button class="linkish" data-moparty="${esc(k)}"><i class="sw" style="background:${partyCol(k)}"></i>${esc(partyName(k))}</button>`;
  const yearsChart = (y, colour, w) => { const pts = Object.entries(y || {}).map(([k, v]) => [+k, Array.isArray(v) ? v[0] : v]); return pts.length ? ctx.CH.bars([{ name: "Registered donations", colour: colour || "#7b4fa6", pts }], { w: w || 420, h: 150, fmt: gbp }) : ""; };

  // ---------- area cards and the map ----------
  function lastYears(obj, date, n) { const Y = +String(date).slice(0, 4); let t = 0; for (let y = Y - n + 1; y <= Y; y++) t += (obj && obj[y]) || 0; return t; }
  function placeTotal(code, date) { const s = MO.seats[code] || MO.councils[code]; return s ? lastYears(s, date, 5) : null; }
  function areaLine(code, date, pinned) {
    const t = placeTotal(code, date); if (!t) return "";
    const Y = +String(date).slice(0, 4);
    return `<div class="mo-line"><span class="cx-k">Political money</span> ${gbp(t)} registered by local parties${MO.seats[code] ? " and MPs" : ""} here, ${Y - 4}–${Y}${pinned ? ` · <button class="linkish" data-moplace="${esc(code)}">Who gave it</button>` : ""}</div>`;
  }
  function seatMPs(code) { return (MO.seatMP[code] || []).map(([s, e, mid]) => ({ s, e, mid })); }

  // ---------- cards (floating windows) ----------
  const wins = new Map();
  function open(key, title, html, after) {
    const have = wins.get(key); if (have && ctx.WM.isOpen(have.el)) { ctx.WM.front(have.el); have.setBody(html); after && after(have); return have; }
    const w = ctx.WM.make({ type: "money", title, html, cascade: true, min: { w: 340, h: 260 }, def: () => ({ x: innerWidth - 470 - 76, y: 70, w: 470, h: Math.min(640, innerHeight - 110) }), onClose: () => wins.delete(key) });
    w.el.classList.add("mo-win"); wins.set(key, w); ctx.WM.open(w.el); after && after(w); return w;
  }
  function onClick(e) {
    const b = e.target.closest("[data-modonor],[data-momp],[data-moparty],[data-moplace],[data-mogo],[data-moload]"); if (!b) return;
    if (b.dataset.modonor) openDonor(b.dataset.modonor); else if (b.dataset.momp) openMP(b.dataset.momp); else if (b.dataset.moparty) openParty(b.dataset.moparty);
    else if (b.dataset.moplace) openPlace(b.dataset.moplace); else if (b.dataset.mogo) ctx.focus(b.dataset.mogo);
  }
  const loadingHTML = `<p class="ap-note">Loading every registered donation…</p>`;

  function openMP(mid) {
    const m = MO.mps[mid]; if (!m) { ctx.toast("No registered money for this MP in the data."); return; }
    const seats = (m.seats || []).filter(s => ctx.P[s[0]]).map(s => `<button class="linkish" data-mogo="${esc(s[0])}">${esc(ctx.nameOf(s[0]))}</button> <small>${s[1].slice(0, 4)}–${s[2] ? s[2].slice(0, 4) : "now"}</small>`).join(" · ");
    const head = `<div class="mo-head"><div class="mo-kind">Member of Parliament</div>${seats ? `<div class="mo-sub">${seats}</div>` : ""}
      <div class="mo-big"><b>${gbp(m.tot)}</b> in donations registered to this MP with the Electoral Commission${Object.keys(m.y).length ? ` (${Object.keys(m.y)[0]}–${Object.keys(m.y).slice(-1)[0]})` : ""}</div></div>
      ${yearsChart(m.y, "#7b4fa6")}`;
    const body = d => {
      const rows = d.rows.filter(r => r[2] === "M" && r[3] === mid), by = {};
      rows.forEach(r => { by[r[4]] = (by[r[4]] || 0) + r[1]; });
      const top = Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 12);
      const it = d.interests[mid] || {}, cats = Object.keys(it).sort((a, b) => parseFloat(a) - parseFloat(b));
      const linked = top.filter(([id]) => MO.contracts[id]);
      return `${head}<h4>Who gave (registered donations to the MP)</h4>${top.length ? `<table class="mo-tab">${top.map(([id, v]) => `<tr><td>${donorBtn(id)}${MO.contracts[id] ? ` <span class="mo-badge" title="This company has won public contracts">contracts</span>` : ""}</td><td class="num">${gbp(v)}</td></tr>`).join("")}</table>` : `<p class="ap-note">None registered with the Electoral Commission.</p>`}
        ${linked.length ? `<p class="mo-flag">${linked.length === 1 ? "One donor has" : linked.length + " donors have"} won public contracts since 2024: ${linked.map(([id]) => `${donorBtn(id)} (${MO.contracts[id].n} award${MO.contracts[id].n === 1 ? "" : "s"})`).join(", ")}. A link in the registers, not evidence of wrongdoing.</p>` : ""}
        ${(d.ministerMeetings || {})[mid] ? `<h4>Meetings as a minister (since July 2024)</h4><table class="mo-tab">${d.ministerMeetings[mid].slice(0, 15).map(([org, n]) => `<tr><td>${esc(org)}${Object.values(MO.lobby).some(l => l[0] === org && l[2]) ? ` <span class="mo-badge">donor</span>` : ""}</td><td class="num">${n}</td></tr>`).join("")}</table><p class="ap-note">Meetings with outside organisations as published in the department's quarterly release.</p>` : ""}
        <h4>Register of Members' Financial Interests</h4>${cats.length ? cats.map(c => `<details ${cats.length < 3 ? "open" : ""}><summary>${esc(d.rmCats[c] || "Category " + c)} <small>(${it[c].length}${(MO.mps[mid].rm[c] || [])[1] ? ", " + gbp(MO.mps[mid].rm[c][1]) : ""})</small></summary><ul class="mo-list">${it[c].slice(0, 30).map(x => `<li><small>${esc(x[0])}</small> ${esc(x[1])}${x[5] ? ` <small>(APPG: ${esc(x[5])})</small>` : ""} ${x[4] ? `<a href="${esc(x[4])}" target="_blank" rel="noopener">register</a>` : ""}</li>`).join("")}</ul></details>`).join("") : `<p class="ap-note">No entries in the current register (it covers the present Parliament only).</p>`}
        ${SRC}`;
    };
    const w = open("mp:" + mid, m.n, detail ? body(detail) : head + loadingHTML);
    if (!detail) loadDetail().then(d => w.setBody(body(d)));
  }
  function openParty(k) {
    const P = MO.parties[k]; if (!P) { ctx.toast("No registered donations for this party."); return; }
    const ys = Object.keys(P.y), tot = ys.reduce((s, y) => s + P.y[y][0], 0), last5 = ys.slice(-5).reduce((s, y) => s + P.y[y][0], 0);
    const head = `<div class="mo-head"><div class="mo-kind"><i class="sw" style="background:${partyCol(k)}"></i>Political party</div><div class="mo-big"><b>${gbp(tot)}</b> in registered donations since ${ys[0]} · ${gbp(last5)} in ${ys.slice(-5)[0]}–${ys.slice(-1)[0]}</div></div>${yearsChart(P.y, partyCol(k))}
      <h4>Biggest donors</h4><table class="mo-tab">${P.top.slice(0, 20).map(([id, v]) => `<tr><td>${donorBtn(id)} <small>${esc(STATUS[(MO.donors[id] || [])[1]] || "")}</small>${MO.contracts[id] ? ` <span class="mo-badge">contracts</span>` : ""}</td><td class="num">${gbp(v)}</td></tr>`).join("")}</table>`;
    const body = d => {
      const rows = d.rows.filter(r => r[2] === "P" && r[3] === k), types = {};
      rows.forEach(r => { const st = (d.donors[r[4]] || [])[1] || "o"; types[st] = (types[st] || 0) + r[1]; });
      const loans = d.loans.filter(l => l[2] === k).slice(0, 10);
      return `${head}<h4>Who gives, since 2010</h4>${ctx.CH.ranked(Object.entries(types).map(([s, v]) => ({ name: STATUS[s] || s, v })), { w: 420, fmt: gbp })}
        <h4>Latest donations</h4><table class="mo-tab">${rows.slice(0, 15).map(r => `<tr><td><small>${day(r[0])}</small></td><td>${donorBtn(r[4])}${r[5] ? ` <small>to ${esc(r[5])}</small>` : ""}</td><td class="num">${gbp(r[1])}</td></tr>`).join("")}</table>
        ${loans.length ? `<h4>Loans</h4><table class="mo-tab">${loans.map(l => `<tr><td><small>${day(l[0])}</small></td><td>${esc(l[3])} <small>${esc(l[4] || "")}</small></td><td class="num">${gbp(l[1])}</td></tr>`).join("")}</table>` : ""}${SRC}`;
    };
    const w = open("party:" + k, partyName(k) + ": donations", detail ? body(detail) : head + loadingHTML);
    if (!detail) loadDetail().then(d => w.setBody(body(d)));
  }
  function openDonor(id) {
    const go = d => {
      const s = MO.donors[id] || d.donors[id]; if (!s) return `<p>Unknown donor.</p>`;
      const rows = d.rows.filter(r => r[4] === id), to = {};
      rows.forEach(r => { const k = r[2] === "P" ? r[3] : r[2] === "M" ? "mp:" + r[3] : "d:" + r[3]; to[k] = (to[k] || 0) + r[1]; });
      const ct = d.contracts[id] || [], geo = (MO.donors[id] || [])[7], ftse = Object.entries(MO.ftse).filter(([, ids]) => ids.includes(id)).map(([i]) => i);
      return `<div class="mo-head"><div class="mo-kind">${esc(STATUS[s[1]] || "Donor")}${s[2] ? ` · Companies House <a href="https://find-and-update.company-information.service.gov.uk/company/${esc(s[2])}" target="_blank" rel="noopener">${esc(s[2])}</a>` : ""}</div>
        <div class="mo-big"><b>${gbp(s[3])}</b> in registered donations${s[4] && s[4] < 9999 ? `, ${s[4]}–${s[5]}` : ""}</div>${geo && geo[2] && ctx.P[geo[2]] ? `<div class="mo-sub">Registered address in <button class="linkish" data-mogo="${esc(geo[2])}">${esc(ctx.nameOf(geo[2]))}</button></div>` : ""}</div>
        <h4>Given to</h4><table class="mo-tab">${Object.entries(to).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([k, v]) => `<tr><td>${recipientBtn(k)}</td><td class="num">${gbp(v)}</td></tr>`).join("")}</table>
        ${ct.length ? `<h4>Public contracts won (since 2024)</h4><p class="mo-flag">This company is a registered political donor and a government supplier. Atlas shows both because both are on public record; it is not evidence that one led to the other.</p><table class="mo-tab">${ct.map(c => `<tr><td><small>${day(c[0])}</small></td><td>${esc(c[3])}<br><small>${esc(c[1])}</small> <a href="${esc(c[4])}" target="_blank" rel="noopener">notice</a></td><td class="num">${c[2] ? gbp(c[2]) : "—"}</td></tr>`).join("")}</table>` : ""}
        ${(d.meetings || {})[id] ? `<h4>Meetings with ministers (since July 2024)</h4><p class="ap-note">An organisation of this name met these ministers, as published by their departments. Same name; check the release.</p><table class="mo-tab">${d.meetings[id].map(m => `<tr><td><small>${day(m[0])}</small></td><td>${esc(m[1])} <small>${esc(m[2])}</small>${m[4] ? `<br><small>${esc(m[4])}</small>` : ""} <a href="${esc(m[5])}" target="_blank" rel="noopener">release</a></td></tr>`).join("")}</table>` : ""}
        ${ftse.length ? `<p class="ap-note">Same name as FTSE 100 ${ftse.map(i => esc((ctx.MK.companies[i] || {}).n)).join(", ")}: a possible link, not confirmed.</p>` : ""}
        <h4>Every donation since 2010</h4><table class="mo-tab">${rows.slice(0, 60).map(r => `<tr><td><small>${day(r[0])}</small></td><td>${recipientBtn(r[2] === "P" ? r[3] : r[2] === "M" ? "mp:" + r[3] : "d:" + r[3])}${r[5] && r[2] === "P" ? ` <small>${esc(r[5])}</small>` : ""} <small>${esc(r[7] !== "cash" ? r[7] : "")}</small></td><td class="num">${gbp(r[1])}</td></tr>`).join("")}</table>${SRC}`;
    };
    const w = open("donor:" + id, donorName(id), detail ? go(detail) : loadingHTML);
    if (!detail) loadDetail().then(d => { w.setBody(go(d)); w.el.querySelector(".fwin-title, .wm-title") && (w.el.querySelector(".fwin-title, .wm-title").textContent = donorName(id)); });
  }
  function openPlace(code) {
    const go = d => {
      const rows = d.rows.filter(r => r[6] === code || (r[2] === "M" && seatMPs(code).some(x => x.mid === r[3] && x.s <= r[0] && (!x.e || r[0] < x.e))));
      const by = {}; rows.forEach(r => { by[r[4]] = (by[r[4]] || 0) + r[1]; });
      const mps = seatMPs(code).reverse();
      return `<div class="mo-head"><div class="mo-kind">${esc(ctx.LABEL[ctx.P[code].level] || "")}</div><div class="mo-big"><b>${gbp(rows.reduce((s, r) => s + r[1], 0))}</b> registered by local parties${mps.length ? " and MPs" : ""} here since 2010</div>
        ${mps.length ? `<div class="mo-sub">MPs: ${mps.map(x => `${mpBtn(x.mid)} <small>${x.s.slice(0, 4)}–${x.e ? x.e.slice(0, 4) : "now"}</small>`).join(" · ")}</div>` : ""}</div>
        ${yearsChart(MO.seats[code] || MO.councils[code], "#7b4fa6")}
        <h4>Biggest donors here</h4><table class="mo-tab">${Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([id, v]) => `<tr><td>${donorBtn(id)}${MO.contracts[id] ? ` <span class="mo-badge">contracts</span>` : ""}</td><td class="num">${gbp(v)}</td></tr>`).join("")}</table>
        <h4>Latest</h4><table class="mo-tab">${rows.slice(0, 20).map(r => `<tr><td><small>${day(r[0])}</small></td><td>${donorBtn(r[4])} → ${r[2] === "M" ? mpBtn(r[3]) : recipientBtn(r[3])}</td><td class="num">${gbp(r[1])}</td></tr>`).join("")}</table>${SRC}`;
    };
    const w = open("place:" + code, "Political money: " + ctx.nameOf(code), detail ? go(detail) : loadingHTML);
    if (!detail) loadDetail().then(d => w.setBody(go(d)));
  }
  // a FTSE 100 company's possible donor twins (same name)
  function companyBox(i) {
    const ids = MO.ftse[String(i)]; if (!ids || !ids.length) return "";
    const tot = ids.reduce((s, id) => s + ((MO.donors[id] || [])[3] || 0), 0);
    return `<li class="mo-cobox"><b>Political money:</b> a donor with this company's name registered ${gbp(tot)} (${ids.map(donorBtn).join(", ")}). <small>Same name; a possible link.</small></li>`;
  }
  function searchDonors(q) { q = q.toLowerCase(); return Object.entries(MO.donors).filter(([, d]) => d[0].toLowerCase().includes(q)).sort((a, b) => b[1][3] - a[1][3]).slice(0, 8).map(([id]) => id); }

  window.AtlasMoney = {
    init(c) { ctx = c; document.addEventListener("click", e => { if (e.target.closest("#card, #ecard, .ap-body, .fwin")) onClick(e); }); },
    data: MO, loadDetail, get detail() { return detail; }, gbp, day, areaLine, placeTotal, companyBox, openMP, openParty, openDonor, openPlace, searchDonors, seatMPs, partyName, partyCol, donorBtn, mpBtn,
  };
})();
