/* Atlas Social (0.8) · a social layer on the map: what's happening, where.
 *   Feed         posts near the view, in the area in focus, or from people you follow; photos and video
 *   Post         text, a photo (location data removed before saving) or a video, pinned to an area or, if you choose,
 *                an exact spot; optionally counted, anonymously, in the activity map
 *   Events       what's on and where; 18+ events are hidden from under-18 accounts
 *   Marketplace  buy and sell between people (shared with Atlas Markets): payment happens off-platform
 *   Messages     conversations; strangers can't message under-18 accounts
 *   Activity     how busy places are now, from anonymous check-ins, shown only where at least 10 were made (k ≥ 10)
 *   Profile & safety, and (developers only) the moderation queue
 * Safety and privacy defaults follow the UK's Online Safety Act and the ICO Children's Code: see
 * docs/social-launch-checklist.md. Until that is done the app runs on this browser only (store.js), with demo content.
 */
(function () {
  "use strict";
  const ST = () => window.AtlasSocialStore;
  const K_MIN = 10, HOME_KM = 0.5;
  const TYPE = { post: ["Post", "#d0701c"], event: ["Event", "#7b4fa6"], listing: ["For sale", "#0f6b7a"] };
  const CATS = ["Bikes", "Home", "Garden", "Books", "Clothes", "Kids", "Music", "Electronics", "Sport", "Crafts", "Other"];
  // never allowed on the marketplace (UK law, and what a marketplace without its own checks can't safely carry)
  const BANNED = [
    [/\b(knife|knives|blade|machete|sword|gun|firearm|air ?rifle|ammunition|ammo|crossbow|pepper spray|taser|stun gun|knuckle ?duster)\b/i, "weapons and knives"],
    [/\b(cannabis|weed|cocaine|ecstasy|mdma|ketamine|nitrous|laughing gas|steroids?|drugs?)\b/i, "drugs"],
    [/\b(prescription|medicines?|tablets|pills|antibiotics|codeine|viagra|botox)\b/i, "medicines (MHRA rules)"],
    [/\b(alcohol|wine|beer|lager|cider|spirits|vodka|whisk(e)?y|gin|rum|tobacco|cigarettes?|cigars?|vapes?|e-?cig\w*|nicotine)\b/i, "alcohol, tobacco and vapes (age-restricted)"],
    [/\b(fireworks?|explosives?)\b/i, "fireworks and explosives"],
    [/\b(puppy|puppies|kitten|kittens|dog for sale|cat for sale|live animals?|reptiles? for sale)\b/i, "live animals (licensing rules)"],
    [/\b(tickets?|gift ?cards?|vouchers?)\b/i, "tickets, gift cards and vouchers (resale rules and fraud)"],
    [/\b(shares?|stocks?|bonds?|crypto\w*|bitcoin|ethereum|tokens?|nfts?|investments?|forex|trading signals?)\b/i, "investments, shares and crypto (FCA regulated)"],
    [/\b(counterfeit|replica|fake|knock-?off|stolen|passports?|driving licen[cs]e|id cards?|personal data|accounts? for sale)\b/i, "counterfeit or stolen goods, IDs and personal data"],
  ];
  const bannedReason = t => (BANNED.find(([rx]) => rx.test(t)) || [])[1] || null;
  const coarse = (lon, lat) => [Math.round(lon / 0.015) * 0.015, Math.round(lat / 0.01) * 0.01];   // about 1 km: the default for every pin
  const km = (a, b) => Math.hypot((a[0] - b[0]) * 111.3 * Math.cos(a[1] * Math.PI / 180), (a[1] - b[1]) * 111.3);
  const ago = t => { const m = Math.round((Date.now() - t) / 60000); return m < 1 ? "just now" : m < 60 ? m + " min ago" : m < 1440 ? Math.round(m / 60) + " h ago" : Math.round(m / 1440) + " d ago"; };
  const when = t => new Date(t).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const gbp = v => "£" + (+v).toLocaleString("en-GB", { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 });
  let ctx = null, ready = null, F = { scope: "near" }, MK = { cat: "", q: "" }, panels = {}, actWin = 3, actOn = false;

  const S = () => ST().state, me = () => ST().me(), adult = () => !me() || me().adult !== false;
  const userOf = id => (S().users[id] || (me() && me().id === id ? me() : null) || { name: "Someone", handle: "unknown" });
  const visible = x => !S().blocks.includes(x.by) && !x.hidden && (!x.adult || adult());
  const inView = x => { const b = ctx.map.getBounds(); return b.contains([x.lon, x.lat]); };
  const nearHome = x => me() && me().home && x.by === me().id && km([x.lon, x.lat], me().home) < HOME_KM;

  function init(c) {
    ctx = c; if (ready) return ready;
    ready = ST().load().then(() => { addLayers(); refreshMap(); ctx.map.on("moveend", () => { if (panels.feed) render("feed"); if (panels.events) render("events"); if (panels.market) render("market"); }); });
    return ready;
  }

  // ---------- map ----------
  function addLayers() {
    const m = ctx.map; if (m.getSource("soc")) return;
    m.addSource("soc", { type: "geojson", data: { type: "FeatureCollection", features: [] }, cluster: true, clusterRadius: 40, clusterMaxZoom: 12 });
    m.addSource("soc-act", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    m.addLayer({ id: "soc-act", type: "heatmap", source: "soc-act", layout: { visibility: "none" }, paint: { "heatmap-weight": ["interpolate", ["linear"], ["get", "n"], K_MIN, 0.3, 80, 1], "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 5, 12, 12, 40],
      "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 5, 0.6, 12, 1.6], "heatmap-color": ["interpolate", ["linear"], ["heatmap-density"], 0, "rgba(208,112,28,0)", 0.2, "#fdeedc", 0.45, "#f9cf9f", 0.7, "#f2a65c", 1, "#a3510f"], "heatmap-opacity": 0.8 } });
    m.addLayer({ id: "soc-cl", type: "circle", source: "soc", filter: ["has", "point_count"], paint: { "circle-color": "#d0701c", "circle-opacity": 0.85, "circle-radius": ["step", ["get", "point_count"], 13, 10, 17, 40, 22], "circle-stroke-color": "#fff", "circle-stroke-width": 2 } });
    if (!ctx.plain) m.addLayer({ id: "soc-cl-n", type: "symbol", source: "soc", filter: ["has", "point_count"], layout: { "text-field": ["get", "point_count_abbreviated"], "text-font": ["PT Serif Bold"], "text-size": 11 }, paint: { "text-color": "#fff" } });
    m.addLayer({ id: "soc-pts", type: "circle", source: "soc", filter: ["!", ["has", "point_count"]], paint: { "circle-color": ["get", "c"], "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 5, 14, 9], "circle-stroke-color": "#fff", "circle-stroke-width": 2 } });
    m.on("click", "soc-pts", e => { const f = e.features[0]; if (f) openItem(f.properties.t, f.properties.id); });
    m.on("click", "soc-cl", e => { const f = e.features[0]; m.getSource("soc").getClusterExpansionZoom(f.properties.cluster_id).then ? m.getSource("soc").getClusterExpansionZoom(f.properties.cluster_id).then(z => m.easeTo({ center: f.geometry.coordinates, zoom: z })) : m.easeTo({ center: f.geometry.coordinates, zoom: m.getZoom() + 2 }); });
    ["soc-pts", "soc-cl"].forEach(id => { m.on("mouseenter", id, () => { m.getCanvas().style.cursor = "pointer"; }); m.on("mouseleave", id, () => { m.getCanvas().style.cursor = ""; }); });
  }
  function refreshMap() {
    if (!ctx.map.getSource("soc")) return;
    const feats = [];
    const add = (t, x) => { if (!visible(x) || nearHome(x)) return; feats.push({ type: "Feature", geometry: { type: "Point", coordinates: [x.lon, x.lat] }, properties: { t, id: x.id, c: TYPE[t][1] } }); };
    S().posts.forEach(x => add("post", x)); S().events.filter(x => x.start > Date.now() - 6 * 3600e3).forEach(x => add("event", x)); S().listings.filter(x => !x.sold).forEach(x => add("listing", x));
    ctx.map.getSource("soc").setData({ type: "FeatureCollection", features: feats });
    // activity: anonymous check-ins in the window, in cells of about 500 m, shown only where at least K_MIN were made
    const since = Date.now() - actWin * 3600e3, cells = {};
    S().checkins.forEach(([x, y, t]) => { if (t < since) return; const k = Math.round(x / 0.0075) + ":" + Math.round(y / 0.005); (cells[k] = cells[k] || [0, 0, 0]); cells[k][0]++; cells[k][1] += x; cells[k][2] += y; });
    const act = Object.values(cells).filter(c => c[0] >= K_MIN).map(c => ({ type: "Feature", geometry: { type: "Point", coordinates: [c[1] / c[0], c[2] / c[0]] }, properties: { n: c[0] } }));
    ctx.map.getSource("soc-act").setData({ type: "FeatureCollection", features: act });
    ctx.map.setLayoutProperty("soc-act", "visibility", actOn ? "visible" : "none");
    refreshMap.cells = { shown: act.length, hidden: Object.values(cells).filter(c => c[0] < K_MIN).length };
  }

  // ---------- cards ----------
  const mediaURL = {};
  async function fillMedia(root) {
    for (const el of root.querySelectorAll("[data-media]")) { const id = el.dataset.media; if (!mediaURL[id]) { const b = await ST().getMedia(id); if (!b) continue; mediaURL[id] = URL.createObjectURL(b); }
      el.innerHTML = /^video/.test(el.dataset.mtype) ? `<video src="${mediaURL[id]}" controls preload="metadata"></video>` : `<img src="${mediaURL[id]}" alt="">`; }
  }
  const actions = (t, x) => `<div class="so-acts">${t === "post" ? `<button class="linkish" data-solike="${x.id}">♥ ${x.likes || 0}</button>` : ""}${t === "event" ? `<button class="linkish" data-sogo="${x.id}">${x.mine ? "✓ Going" : "Going?"} (${x.going || 0})</button>` : ""}
    ${t === "listing" && !(me() && x.by === me().id) ? `<button class="btn sm primary" data-somsg="${x.id}">Message the seller</button>` : ""}${t === "listing" && me() && x.by === me().id && !x.sold ? `<button class="btn sm" data-sosold="${x.id}">Mark as sold</button>` : ""}
    <button class="linkish" data-sofly="${t}:${x.id}">Show on map</button>${!(me() && x.by === me().id) ? `<button class="linkish so-rep" data-sorep="${t}:${x.id}">Report</button><button class="linkish so-rep" data-soblock="${x.by}">Block</button>` : `<button class="linkish so-rep" data-sodel="${t}:${x.id}">Delete</button>`}</div>`;
  function itemHTML(t, x, full) {
    const u = userOf(x.by), demo = x.demo ? `<span class="so-demo" title="Demo content: shipped with Atlas so the app can be tried">demo</span>` : "";
    if (t === "post") return `<div class="so-it"><div class="so-meta"><b>${ctx.esc(u.name)}</b> <small>@${ctx.esc(u.handle)} · ${ctx.esc(x.place || "")} · ${ago(x.at)}${x.precise ? "" : " · area"}</small>${demo}</div><p>${ctx.esc(x.text)}</p>${x.media ? `<div class="so-media" data-media="${x.media}" data-mtype="${ctx.esc(x.mtype || "")}"></div>` : ""}${actions(t, x)}</div>`;
    if (t === "event") return `<div class="so-it"><div class="so-meta"><b>${ctx.esc(x.title)}</b>${x.adult ? ` <span class="so-badge">18+</span>` : ""}${demo}</div><div class="so-when">${when(x.start)} · ${ctx.esc(x.cat || "")} · ${ctx.esc(x.place || "")}</div><p>${ctx.esc(x.text || "")}</p><small>Posted by ${ctx.esc(u.name)}</small>${actions(t, x)}</div>`;
    const total = (+x.price || 0) + (+x.delivery || 0);
    return `<div class="so-it"><div class="so-meta"><b>${ctx.esc(x.title)}</b>${x.sold ? ` <span class="so-badge">sold</span>` : ""}${demo}</div><div class="so-price"><b>${gbp(total)}</b> <small>total${+x.delivery ? ` (${gbp(x.price)} + ${gbp(x.delivery)} delivery)` : ", collection"}</small></div>
      <small>${ctx.esc(x.cat)} · ${ctx.esc(x.cond || "")} · ${ctx.esc(x.place || "")} · ${ago(x.at)}</small>
      <div class="so-seller">${x.trader ? `Sold by a <b>trader</b>: ${ctx.esc((x.trading || {}).name || "")}, ${ctx.esc((x.trading || {}).address || "")}. Consumer rights apply (Consumer Rights Act 2015).` : `Sold by a <b>private seller</b> (${ctx.esc(u.name)}). Consumer Rights Act protections for traders don't apply; the item must be as described.`}</div>${full ? `<p class="ap-note">Pay on collection or by a method you trust; Atlas doesn't take payments. Never pay by bank transfer before seeing the item.</p>` : ""}${actions(t, x)}</div>`;
  }
  const kindList = t => ({ post: "posts", event: "events", listing: "listings" })[t];
  function openItem(t, id) {
    const x = S()[kindList(t)].find(y => y.id === id); if (!x) return;
    const w = ctx.WM.make({ type: "social-item", title: TYPE[t][0], html: `<div class="so-card">${itemHTML(t, x, true)}</div>`, cascade: true, min: { w: 300, h: 200 }, def: () => ({ x: innerWidth - 400 - 76, y: 90, w: 380, h: 360 }) });
    ctx.WM.open(w.el); fillMedia(w.el);
  }

  // ---------- panels ----------
  function render(id) { const p = panels[id]; if (p && document.body.contains(p)) PANELS[id](p); else delete panels[id]; }
  const needProfile = el => { if (me()) return false; el.innerHTML = `<p>To post, list, message or join events, set up a profile first (in this browser).</p><button class="btn sm primary" data-sopanel="profile">Set up a profile</button>`; return true; };
  const PANELS = {
    feed(el) {
      const foc = ctx.focused && ctx.P[ctx.focused] && ctx.P[ctx.focused].pt;
      let xs = S().posts.filter(visible);
      if (F.scope === "near") xs = xs.filter(inView); else if (F.scope === "following") xs = xs.filter(x => S().follows.includes(x.by) || (me() && x.by === me().id)); else if (F.scope === "area" && foc) xs = xs.filter(x => km([x.lon, x.lat], ctx.P[ctx.focused].pt) < 15);
      xs = xs.sort((a, b) => b.at - a.at).slice(0, 60);
      el.innerHTML = `<div class="tr-tabs">${[["near", "Near this view"], ["area", foc ? "Around " + ctx.nameOf(ctx.focused) : "Around the area in focus"], ["following", "Following"]].map(([k, l]) => `<button class="${F.scope === k ? "on" : ""}" data-sofeed="${k}">${ctx.esc(l)}</button>`).join("")}</div>
        <div class="ap-row"><button class="btn sm primary" data-sopanel="post">New post</button><button class="btn sm" data-soact>${actOn ? "Hide" : "Show"} activity</button></div>
        ${xs.length ? xs.map(x => itemHTML("post", x)).join("") : `<p class="ap-note">Nothing here yet${F.scope === "near" ? ": zoom out or move the map" : ""}.</p>`}
        <p class="so-src">${ctx.esc(ST().name)}. ${S().demo ? "Posts marked demo were shipped with Atlas to show how it works." : ""}</p>`;
      fillMedia(el);
    },
    post(el) {
      if (needProfile(el)) return;
      const minor = !adult();
      el.innerHTML = `<textarea data-sotext rows="4" placeholder="What's happening here?" maxlength="1000"></textarea>
        <label class="so-file">Photo or video <input type="file" data-sofile accept="image/*,video/mp4,video/webm,video/quicktime"></label>
        <p class="ap-note" data-sofilenote>Photos are re-saved before upload, which removes their location and camera data (EXIF).</p>
        <div class="so-where"><b>Where</b><label class="ck"><input type="radio" name="sowhere" value="view" checked> The middle of the map</label><label class="ck"><input type="radio" name="sowhere" value="gps" ${minor ? "disabled" : ""}> Where I am now (asks for your location once)</label></div>
        <div class="so-where"><b>How exact</b><label class="ck"><input type="radio" name="soprec" value="area" checked> About 1 km (the area, recommended)</label><label class="ck"><input type="radio" name="soprec" value="exact" ${minor ? "disabled" : ""}> The exact spot</label>${minor ? `<small>Under-18 accounts post by area only.</small>` : ""}</div>
        <label class="ck"><input type="checkbox" data-socheck ${minor ? "disabled" : "checked"}> Also count me, anonymously, in the activity map (no name, area only, shown only where 10 or more people were)</label>
        <div class="ap-row"><button class="btn primary" data-sopost>Post</button><span class="so-loc" data-soloc></span></div>`;
    },
    events(el) {
      const xs = S().events.filter(x => visible(x) && x.start > Date.now() - 6 * 3600e3 && inView(x)).sort((a, b) => a.start - b.start).slice(0, 40);
      el.innerHTML = `<div class="ap-row"><button class="btn sm primary" data-sonewevent>Add an event</button><small class="ap-note">${adult() ? "" : "18+ events are hidden for under-18 accounts. "}Events in view, soonest first.</small></div><div data-soeventform></div>${xs.map(x => itemHTML("event", x)).join("") || `<p class="ap-note">No events in view: move or zoom the map.</p>`}`;
    },
    market(el) {
      let xs = S().listings.filter(x => visible(x) && !x.sold && inView(x));
      if (MK.cat) xs = xs.filter(x => x.cat === MK.cat); if (MK.q) xs = xs.filter(x => x.title.toLowerCase().includes(MK.q.toLowerCase()));
      const mine = me() ? S().listings.filter(x => x.by === me().id) : [], yr = new Date().getFullYear(), soldYr = mine.filter(x => x.sold && new Date(x.soldAt || 0).getFullYear() === yr), turnover = soldYr.reduce((s, x) => s + (+x.price || 0), 0);
      el.innerHTML = `<div class="ap-row"><input data-mkq placeholder="Search for sale…" value="${ctx.esc(MK.q)}" style="flex:1"><select data-mkcat><option value="">Everything</option>${CATS.map(c => `<option ${MK.cat === c ? "selected" : ""}>${c}</option>`).join("")}</select><button class="btn sm primary" data-sonewlisting>Sell something</button></div>
        <div data-solistform></div>${mine.length ? `<details class="so-mine"><summary>Your listings (${mine.length}) · ${soldYr.length} sold this year</summary>${mine.map(x => itemHTML("listing", x)).join("")}${soldYr.length >= 30 || turnover > 1700 ? `<p class="mo-flag">You've sold ${soldYr.length} items (${gbp(turnover)}) this year. Platforms must report sellers with 30 or more sales, or over about £1,700, to HMRC (digital platform reporting rules); Atlas will ask for your tax details before payments launch.</p>` : ""}</details>` : ""}
        ${xs.sort((a, b) => b.at - a.at).slice(0, 50).map(x => itemHTML("listing", x)).join("") || `<p class="ap-note">Nothing for sale in view.</p>`}
        <p class="so-src">Buying and selling between people: listings and messages only; payment happens off-platform. Not allowed: weapons, drugs, medicines, alcohol and tobacco, fireworks, live animals, tickets and vouchers, shares and crypto, counterfeit or stolen goods. Reviews follow Atlas's review policy (no paid or fake reviews; only after a conversation about the item).</p>`;
    },
    messages(el) {
      if (needProfile(el)) return;
      const th = S().threads.slice().sort((a, b) => b.at - a.at), cur = th.find(t => t.id === PANELS.messages.open) || th[0];
      el.innerHTML = th.length ? `<div class="so-msgs"><ul class="so-th">${th.map(t => `<li class="${cur && t.id === cur.id ? "on" : ""}" data-sothread="${t.id}"><b>${ctx.esc(t.title || "Conversation")}</b><br><small>${ago(t.at)}</small></li>`).join("")}</ul>
        <div class="so-conv">${cur ? `<div class="so-lines">${cur.msgs.map(m => `<div class="so-msg ${m.by === me().id ? "me" : ""}">${ctx.esc(m.text)}<small>${ago(m.at)}</small></div>`).join("")}</div><div class="ap-row"><input data-somsgtext placeholder="Write a message…" style="flex:1"><button class="btn sm primary" data-somsgsend="${cur.id}">Send</button></div>` : ""}</div></div>`
        : `<p class="ap-note">No conversations yet. Message a seller from the marketplace.</p>`;
    },
    profile(el) {
      const p = me() || {};
      el.innerHTML = `<label class="so-f">Display name <input data-pf="name" value="${ctx.esc(p.name || "")}" maxlength="40"></label><label class="so-f">Handle <input data-pf="handle" value="${ctx.esc(p.handle || "")}" maxlength="24" placeholder="letters, numbers and _"></label>
        <div class="so-where"><b>Age</b><label class="ck"><input type="radio" name="soage" value="adult" ${p.adult !== false ? "checked" : ""}> 18 or over</label><label class="ck"><input type="radio" name="soage" value="minor" ${p.adult === false ? "checked" : ""}> Under 18</label>
          <small>Under-18 accounts: posts by area only, no exact location, not counted in activity, 18+ events hidden, and only people you follow can message you. (Before Atlas Social opens to the public, age will be checked properly: see the launch checklist.)</small></div>
        <div class="so-where"><b>Home privacy zone</b><small>Pick your home on the map: nothing you post within ${HOME_KM * 1000} m of it appears on the map (it shows by area in the feed only). It stays in this browser.</small><div class="ap-row"><button class="btn sm" data-sohome>${p.home ? "Move it" : "Set it on the map"}</button>${p.home ? `<button class="btn sm" data-sohomeclr>Remove</button>` : ""}</div></div>
        <div class="ap-row"><button class="btn primary" data-sosave>${me() ? "Save" : "Create profile"}</button></div>
        ${me() ? `<h4>Your data</h4><div class="ap-row"><button class="btn sm" data-soexport>Download everything (JSON)</button><button class="btn sm" data-sowipe>Delete my profile and posts</button></div>
        <h4>Blocked</h4><p class="ap-note">${S().blocks.length ? S().blocks.map(b => ctx.esc(userOf(b).name)).join(", ") + ` <button class="linkish" data-sounblock>Unblock all</button>` : "Nobody."}</p>` : ""}
        <h4>Safety</h4><p class="ap-note">Report anything harmful with “Report” on the post, event or listing. In an emergency call 999. Atlas Social runs only in this browser until its safety checks are complete (docs/social-launch-checklist.md).</p>`;
    },
    moderation(el) {
      const rs = S().reports.filter(r => r.status === "open");
      el.innerHTML = `<p class="ap-note">Reports waiting for a decision (developers only). Hiding removes the item from every view.</p>${rs.map(r => `<div class="so-it"><b>${ctx.esc(r.kind)}</b> · ${ctx.esc(r.reason)} <small>${ago(r.at)}</small><p>${ctx.esc(r.note || "")}</p><div class="ap-row"><button class="btn sm" data-modhide="${r.id}">Hide it</button><button class="btn sm" data-moddismiss="${r.id}">Dismiss</button><button class="linkish" data-sofly="${r.kind}:${r.target}">Look</button></div></div>`).join("") || `<p class="ap-note">No open reports.</p>`}`;
    },
  };

  // ---------- actions ----------
  async function stripImage(file) {   // re-encode through a canvas: keeps the pixels, drops EXIF (GPS, camera, time)
    const img = await createImageBitmap(file), k = Math.min(1, 1600 / Math.max(img.width, img.height)), cv = document.createElement("canvas");
    cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k); cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
    return new Promise(res => cv.toBlob(b => res(b), "image/jpeg", 0.86));
  }
  const center = () => { const c = ctx.map.getCenter(); return [c.lng, c.lat]; };
  const placeName = (lon, lat) => { let best = null, bd = 1e9; Object.entries(ctx.P).forEach(([c, p]) => { if (p.level === "council" && p.pt) { const d = km(p.pt, [lon, lat]); if (d < bd) { bd = d; best = c; } } }); return best ? ctx.nameOf(best) : ""; };
  async function doPost(el) {
    const text = el.querySelector("[data-sotext]").value.trim(), file = el.querySelector("[data-sofile]").files[0];
    if (!text && !file) { ctx.toast("Write something or add a photo."); return; }
    const where = el.querySelector("input[name=sowhere]:checked").value, exact = adult() && el.querySelector("input[name=soprec]:checked").value === "exact";
    let pt = center();
    if (where === "gps") pt = await new Promise(res => navigator.geolocation ? navigator.geolocation.getCurrentPosition(p => res([p.coords.longitude, p.coords.latitude]), () => res(center()), { timeout: 8000 }) : res(center()));
    let media = null, mtype = "";
    if (file) {
      if (file.size > 60e6) { ctx.toast("That file is over 60 MB."); return; }
      if (/^image/.test(file.type)) { media = await ST().putMedia(await stripImage(file)); mtype = "image/jpeg"; }
      else { media = await ST().putMedia(file); mtype = file.type; }
    }
    const loc = exact && !(file && /^video/.test(file.type)) ? pt : coarse(pt[0], pt[1]);
    await ST().add("posts", { text, media, mtype, lon: +loc[0].toFixed(4), lat: +loc[1].toFixed(4), precise: exact, place: placeName(loc[0], loc[1]), likes: 0, comments: [] });
    if (adult() && el.querySelector("[data-socheck]").checked) await ST().checkin(loc[0], loc[1]);
    ctx.toast("Posted."); refreshMap(); F.scope = "near"; ctx.openPanel("feed"); render("feed"); PANELS.post(el);
  }
  function eventForm(el) {
    const f = el.querySelector("[data-soeventform]"); if (needProfile(f)) return;
    f.innerHTML = `<div class="so-form"><input data-ev="title" placeholder="What's on" maxlength="80"><textarea data-ev="text" rows="2" placeholder="Details" maxlength="500"></textarea><div class="ap-row"><input type="datetime-local" data-ev="start"><select data-ev="cat">${["Community", "Music", "Food & markets", "Culture", "Sport", "Family", "Other"].map(c => `<option>${c}</option>`).join("")}</select></div>
      <label class="ck"><input type="checkbox" data-ev="adult"> 18+ only</label><p class="ap-note">Pinned to the middle of the map (about 1 km). Don't post private parties at home addresses.</p><div class="ap-row"><button class="btn sm primary" data-evsave>Add event</button></div></div>`;
  }
  function listingForm(el) {
    const f = el.querySelector("[data-solistform]"); if (needProfile(f)) return;
    f.innerHTML = `<div class="so-form"><input data-li="title" placeholder="What are you selling?" maxlength="80"><textarea data-li="text" rows="2" placeholder="Describe it honestly (condition, size, faults)" maxlength="800"></textarea>
      <div class="ap-row"><select data-li="cat">${CATS.map(c => `<option>${c}</option>`).join("")}</select><select data-li="cond"><option>new</option><option>like new</option><option selected>good</option><option>used</option><option>for parts</option></select></div>
      <div class="ap-row"><label>Price £ <input data-li="price" type="number" min="0" step="0.01" style="width:90px"></label><label>Delivery £ <input data-li="delivery" type="number" min="0" step="0.01" value="0" style="width:80px"></label></div>
      <div class="so-where"><label class="ck"><input type="radio" name="soseller" value="private" checked> I'm selling my own things (private seller)</label><label class="ck"><input type="radio" name="soseller" value="trader"> I'm selling as a business (trader)</label>
        <div data-litrader hidden><input data-li="tname" placeholder="Business name"><input data-li="taddr" placeholder="Business address (shown to buyers)"></div></div>
      <p class="ap-note" data-liwarn></p><div class="ap-row"><button class="btn sm primary" data-lisave>List it</button></div></div>`;
  }

  let homePick = false;
  function bind() {
    if (bind.done) return; bind.done = true;
    ctx.map.on("click", e => { if (!homePick) return; homePick = false; ctx.map.getCanvas().style.cursor = ""; ST().setProfile({ home: [e.lngLat.lng, e.lngLat.lat] }).then(() => { refreshMap(); render("profile"); ctx.toast("Home privacy zone set."); }); });
    document.addEventListener("click", async e => {
      const t = e.target.closest && e.target.closest("[data-sofeed],[data-sopanel],[data-soact],[data-sopost],[data-solike],[data-sogo],[data-somsg],[data-sosold],[data-sofly],[data-sorep],[data-soblock],[data-sodel],[data-sonewevent],[data-evsave],[data-sonewlisting],[data-lisave],[data-sothread],[data-somsgsend],[data-sosave],[data-sohome],[data-sohomeclr],[data-soexport],[data-sowipe],[data-sounblock],[data-modhide],[data-moddismiss]");
      if (!t) return; const d = t.dataset, root = t.closest(".ap-body, .wm-body, .fwin") || document;
      if (d.sofeed) { F.scope = d.sofeed; render("feed"); }
      else if (d.sopanel) ctx.openPanel(d.sopanel);
      else if (t.hasAttribute("data-soact")) { actOn = !actOn; refreshMap(); render("feed"); if (actOn) ctx.toast(`Activity: anonymous check-ins in the last ${actWin} hours, only where at least ${K_MIN} were made.`); }
      else if (t.hasAttribute("data-sopost")) doPost(root);
      else if (d.solike) { const x = S().posts.find(y => y.id === d.solike); if (x) { await ST().update("posts", x.id, { likes: (x.likes || 0) + (x.liked ? -1 : 1), liked: !x.liked }); render("feed"); } }
      else if (d.sogo) { if (!me()) { ctx.openPanel("profile"); return; } const x = S().events.find(y => y.id === d.sogo); if (x) { await ST().update("events", x.id, { mine: !x.mine, going: (x.going || 0) + (x.mine ? -1 : 1) }); render("events"); } }
      else if (d.somsg) { if (!me()) { ctx.openPanel("profile"); return; } const x = S().listings.find(y => y.id === d.somsg); const seller = userOf(x.by);
        if (!adult() && !S().follows.includes(x.by)) { ctx.toast("Under-18 accounts can only message people they follow."); return; }
        await ST().send("t-" + x.id, `Hi, is “${x.title}” still available?`, { title: x.title + " · " + seller.name, listing: x.id, with: x.by }); PANELS.messages.open = "t-" + x.id; ctx.openPanel("messages"); render("messages"); }
      else if (d.sosold) { await ST().update("listings", d.sosold, { sold: true, soldAt: Date.now() }); refreshMap(); render("market"); }
      else if (d.sofly) { const [k, id] = d.sofly.split(":"), x = S()[kindList(k)].find(y => y.id === id); if (x) ctx.map.flyTo({ center: [x.lon, x.lat], zoom: Math.max(ctx.map.getZoom(), 13), duration: 900 }); }
      else if (d.sorep) { const [k, id] = d.sorep.split(":"), reason = prompt("What's wrong? (e.g. harmful, illegal, scam, harassment, wrong place)"); if (reason) { await ST().report({ kind: k, target: id, reason: reason.slice(0, 200) }); ctx.toast("Thanks: reported. A moderator will look at it."); } }
      else if (d.soblock) { if (confirm("Block this person? You won't see their posts, events or listings.")) { await ST().block(d.soblock); refreshMap(); Object.keys(panels).forEach(render); } }
      else if (d.sodel) { const [k, id] = d.sodel.split(":"); if (confirm("Delete this?")) { await ST().remove(kindList(k), id); refreshMap(); Object.keys(panels).forEach(render); } }
      else if (t.hasAttribute("data-sonewevent")) eventForm(root);
      else if (t.hasAttribute("data-evsave")) { const g = k => root.querySelector(`[data-ev=${k}]`); const title = g("title").value.trim(), st = g("start").value;
        if (!title || !st) { ctx.toast("An event needs a name and a time."); return; } const c = center(), loc = coarse(c[0], c[1]);
        await ST().add("events", { title, text: g("text").value.trim(), cat: g("cat").value, adult: g("adult").checked, start: new Date(st).getTime(), lon: loc[0], lat: loc[1], place: placeName(loc[0], loc[1]), going: 1, mine: true }); refreshMap(); render("events"); ctx.toast("Event added."); }
      else if (t.hasAttribute("data-sonewlisting")) { listingForm(root); root.querySelectorAll("input[name=soseller]").forEach(r => r.addEventListener("change", () => { root.querySelector("[data-litrader]").hidden = root.querySelector("input[name=soseller]:checked").value !== "trader"; })); }
      else if (t.hasAttribute("data-lisave")) { const g = k => root.querySelector(`[data-li=${k}]`), title = g("title").value.trim(), text = g("text").value.trim(), price = +g("price").value, trader = root.querySelector("input[name=soseller]:checked").value === "trader";
        const why = bannedReason(title + " " + text), warn = root.querySelector("[data-liwarn]");
        if (why) { warn.textContent = `This can't be listed: Atlas doesn't allow ${why}.`; return; }
        if (!title || !(price >= 0) || g("price").value === "") { warn.textContent = "A listing needs a title and a price."; return; }
        if (trader && (!g("tname").value.trim() || !g("taddr").value.trim())) { warn.textContent = "Traders must give their business name and address (Digital Markets, Competition and Consumers Act 2024)."; return; }
        const c = center(), loc = coarse(c[0], c[1]);
        await ST().add("listings", { title, text, cat: g("cat").value, cond: g("cond").value, price, delivery: +g("delivery").value || 0, trader, trading: trader ? { name: g("tname").value.trim(), address: g("taddr").value.trim() } : null, lon: loc[0], lat: loc[1], place: placeName(loc[0], loc[1]), sold: false });
        refreshMap(); render("market"); ctx.toast("Listed."); }
      else if (d.sothread) { PANELS.messages.open = d.sothread; render("messages"); }
      else if (d.somsgsend) { const i = root.querySelector("[data-somsgtext]"); if (i.value.trim()) { await ST().send(d.somsgsend, i.value.trim()); render("messages"); } }
      else if (t.hasAttribute("data-sosave")) { const g = k => root.querySelector(`[data-pf=${k}]`).value.trim(), handle = g("handle").replace(/[^A-Za-z0-9_]/g, "");
        if (!g("name") || !handle) { ctx.toast("Add a display name and a handle."); return; }
        await ST().setProfile({ name: g("name"), handle, adult: root.querySelector("input[name=soage]:checked").value === "adult" }); ctx.toast("Profile saved (in this browser)."); refreshMap(); Object.keys(panels).forEach(render); }
      else if (t.hasAttribute("data-sohome")) { homePick = true; ctx.map.getCanvas().style.cursor = "crosshair"; ctx.toast("Click your home on the map."); }
      else if (t.hasAttribute("data-sohomeclr")) { await ST().setProfile({ home: null }); refreshMap(); render("profile"); }
      else if (t.hasAttribute("data-soexport")) { const mine = { profile: me(), posts: S().posts.filter(x => x.by === me().id), events: S().events.filter(x => x.by === me().id), listings: S().listings.filter(x => x.by === me().id), messages: S().threads };
        ctx.download(new Blob([JSON.stringify(mine, null, 1)], { type: "application/json" }), "atlas-social-my-data.json"); }
      else if (t.hasAttribute("data-sowipe")) { if (confirm("Delete your profile, posts, events, listings and messages from this browser? This can't be undone.")) { const id = me().id; ["posts", "events", "listings"].forEach(k => { S()[k] = S()[k].filter(x => x.by !== id); }); S().threads = []; S().me = null; await ST().setProfile({}); S().me = null; await ST().update("posts", "", {}); refreshMap(); Object.keys(panels).forEach(render); } }
      else if (t.hasAttribute("data-sounblock")) { S().blocks = []; await ST().update("posts", "", {}); refreshMap(); render("profile"); }
      else if (d.modhide || d.moddismiss) { const r = S().reports.find(x => x.id === (d.modhide || d.moddismiss)); if (r) { r.status = d.modhide ? "hidden" : "dismissed"; if (d.modhide) { const x = S()[kindList(r.kind)].find(y => y.id === r.target); if (x) x.hidden = true; } await ST().update("posts", "", {}); refreshMap(); render("moderation"); } }
    });
    document.addEventListener("input", e => { if (e.target.matches && e.target.matches("[data-mkq]")) { MK.q = e.target.value; clearTimeout(bind.t); bind.t = setTimeout(() => { render("market"); const i = document.querySelector("[data-mkq]"); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 250); } });
    document.addEventListener("change", e => {
      if (e.target.matches && e.target.matches("[data-mkcat]")) { MK.cat = e.target.value; render("market"); }
      if (e.target.matches && e.target.matches("[data-sofile]")) { const f = e.target.files[0], n = e.target.closest(".ap-body, .wm-body, .fwin").querySelector("[data-sofilenote]");
        if (f && /^video/.test(f.type)) n.textContent = "Videos keep their own file data (which can include where they were filmed), so a video post is pinned by area only."; else n.textContent = "Photos are re-saved before upload, which removes their location and camera data (EXIF)."; }
    });
  }
  const panel = id => (c, el) => { panels[id] = el; init(c).then(() => { bind(); PANELS[id](el); }); el.innerHTML = el.innerHTML || `<p class="ap-note">Loading…</p>`; };
  window.AtlasSocial = { init, panel, PANELS, refreshMap, bannedReason, coarse, stripImage, get cells() { return refreshMap.cells; }, setFeed: k => { F.scope = k; }, setActivity: (on, h) => { actOn = on; if (h) actWin = h; refreshMap(); } };
})();
