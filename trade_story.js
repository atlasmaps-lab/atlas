/* Atlas 0.12.1 · the story of a trade category, as cards you can go deeper into.
 *
 * A product group (SITC section, e.g. "Machinery and transport") opens a card that answers, from HMRC's figures:
 *   what it is worth, and its share of everything the UK sells or buys      (the lead)
 *   what's actually in it, chapter by chapter, down to single products     (each row opens that product's card)
 *   the biggest products, and what moved on the year (and so why the total changed)
 *   who buys it (or sells it to us), which ports it passes through, which months are busiest, where in the UK it comes from
 *   what that adds up to: concentration in one product or one buyer, the balance with imports, the trend since 2019
 * Every product (HS chapter, heading, subheading, CN8 code) has the same kind of card, and the menus under a product
 * group offer the same paths: what's in it, the top 15, who buys it, what moved most, where in the UK.
 *
 * HMRC publishes national detail by HS code and regional figures by SITC section; the two are linked here by HS
 * chapter, which matches SITC sections closely but not exactly (the card says so).
 */
(function () {
  "use strict";
  const X = () => window.AtlasTrade && AtlasTrade._;
  const esc = t => String(t == null ? "" : t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => String(a + i).padStart(2, "0"));
  // HS chapters in each SITC section (by chapter; a few chapters straddle two sections)
  const SITC_CH = { "0": ["01", "02", "03", "04", "07", "08", "09", "10", "11", "16", "17", "18", "19", "20", "21", "23"], "1": ["22", "24"], "2": ["05", "06", "12", "13", "14", "25", "26", "41", "44", "45", "47"],
    "3": ["27"], "4": ["15"], "5": range(28, 39), "6": ["40", "46", "48", ...range(50, 60), "63", "68", "69", "70", ...range(72, 76), ...range(78, 83)],
    "7": range(84, 89), "8": ["42", "43", "49", "61", "62", ...range(64, 67), ...range(90, 97)], "9": ["71", "99"] };
  const SITC_N = { "0": "Food and live animals", "1": "Beverages and tobacco", "2": "Crude materials", "3": "Mineral fuels", "4": "Animal and vegetable oils", "5": "Chemicals", "6": "Manufactured goods (by material)", "7": "Machinery and transport", "8": "Miscellaneous manufactures", "9": "Other goods" };
  const CH_N = { "01": "Live animals", "02": "Meat", "03": "Fish and seafood", "04": "Dairy, eggs and honey", "05": "Other animal products", "06": "Plants and flowers", "07": "Vegetables", "08": "Fruit and nuts", "09": "Coffee, tea and spices", "10": "Cereals", "11": "Flour and malt", "12": "Oil seeds", "13": "Gums and resins", "14": "Plant materials", "15": "Fats and oils", "16": "Prepared meat and fish", "17": "Sugar and sweets", "18": "Cocoa and chocolate", "19": "Bakery and cereal foods", "20": "Preserved fruit and vegetables", "21": "Other food preparations", "22": "Drinks (including whisky)", "23": "Animal feed", "24": "Tobacco", "25": "Salt, stone and cement", "26": "Ores", "27": "Fuels: oil, gas and coal", "28": "Inorganic chemicals", "29": "Organic chemicals", "30": "Medicines", "31": "Fertilisers", "32": "Dyes and paints", "33": "Perfumes and cosmetics", "34": "Soaps and waxes", "35": "Proteins and glues", "36": "Explosives", "37": "Photographic goods", "38": "Other chemical products", "39": "Plastics", "40": "Rubber", "41": "Hides and skins", "42": "Leather goods and bags", "43": "Furskins", "44": "Wood", "45": "Cork", "46": "Basketware", "47": "Wood pulp", "48": "Paper and board", "49": "Books and printed matter", "50": "Silk", "51": "Wool", "52": "Cotton", "53": "Other plant fibres", "54": "Man-made filaments", "55": "Man-made fibres", "56": "Wadding and rope", "57": "Carpets", "58": "Special fabrics", "59": "Coated fabrics", "60": "Knitted fabrics", "61": "Clothing (knitted)", "62": "Clothing (woven)", "63": "Other textile articles", "64": "Footwear", "65": "Hats", "66": "Umbrellas", "67": "Feathers and artificial flowers", "68": "Stone and plaster goods", "69": "Ceramics", "70": "Glass", "71": "Precious metals and stones", "72": "Iron and steel", "73": "Iron and steel goods", "74": "Copper", "75": "Nickel", "76": "Aluminium", "78": "Lead", "79": "Zinc", "80": "Tin", "81": "Other base metals", "82": "Tools and cutlery", "83": "Other metal goods", "84": "Machinery, engines and computers", "85": "Electrical machinery and electronics", "86": "Railway equipment", "87": "Vehicles and parts", "88": "Aircraft and spacecraft", "89": "Ships and boats", "90": "Optical, medical and measuring instruments", "91": "Clocks and watches", "92": "Musical instruments", "93": "Arms and ammunition", "94": "Furniture and lighting", "95": "Toys, games and sports goods", "96": "Other manufactured goods", "97": "Art and antiques", "99": "Other (low value and confidential)" };
  const COLS = ["#1e6fb8", "#e07b39", "#2e9d6a", "#8e44ad", "#c0392b", "#16a085", "#b8860b", "#7f8c8d", "#d35400", "#2c3e50", "#27ae60", "#9b59b6"];
  const W = { exp: { flow: "exports", verb: "sells", verbP: "sold", who: "Who buys it", whoS: "buys", to: "to" }, imp: { flow: "imports", verb: "buys", verbP: "bought", who: "Who sells it to us", whoS: "supplies", to: "from" } };
  // a short, readable name for an HS description ("Motor cars and other motor vehicles principally designed …" -> "Motor cars and other motor vehicles")
  const H4_N = {"8411":"Jet engines and gas turbines","7108":"Gold","8703":"Cars","3004":"Medicines (packaged doses)","8807":"Aircraft parts","8803":"Aircraft parts","9950":"Low-value shipments (unclassified)","2709":"Crude oil","7106":"Silver","2710":"Refined oil (petrol, diesel, jet fuel)","7110":"Platinum and palladium","2208":"Spirits (whisky, gin, vodka)","8471":"Computers","3002":"Vaccines, blood products and antibodies","2711":"Natural gas and LNG","8517":"Phones and network equipment","8408":"Diesel engines","7112":"Precious-metal scrap","8708":"Car parts","8481":"Taps and valves","9018":"Medical instruments","7204":"Steel scrap","7113":"Jewellery","8483":"Gears and transmission shafts","8429":"Bulldozers and diggers","8421":"Filters and centrifuges","8537":"Electrical control panels","9027":"Lab analysis instruments","8543":"Other electrical machines","9031":"Measuring instruments","8536":"Switches and connectors","8413":"Pumps for liquids","7404":"Copper scrap","8704":"Vans and lorries","9021":"Orthopaedic and hearing aids","8414":"Pumps, compressors and fans","3822":"Lab and diagnostic reagents","8479":"Specialised machinery","8802":"Aircraft and helicopters","8542":"Microchips","8525":"Cameras and transmitters","8528":"Screens and TVs","8473":"Computer parts","8409":"Engine parts","8412":"Other engines and motors","8501":"Electric motors","8504":"Transformers and power supplies","8507":"Batteries","8544":"Cable and insulated wire","8701":"Tractors","8702":"Buses and coaches","8711":"Motorcycles","8901":"Ships","8905":"Rigs and floating platforms","3304":"Make-up and skincare","3303":"Perfumes","2204":"Wine","2203":"Beer","0302":"Fresh fish","0303":"Frozen fish","0304":"Fish fillets","1905":"Bread, cakes and biscuits","2106":"Food preparations","2402":"Cigarettes and cigars","7601":"Aluminium (unwrought)","3926":"Plastic articles","3901":"Polyethylene","9403":"Furniture","6403":"Leather shoes","6404":"Trainers and canvas shoes","9503":"Toys","9701":"Paintings and drawings","4901":"Books","8806":"Drones","2716":"Electricity","2701":"Coal","2601":"Iron ore","1001":"Wheat","0406":"Cheese","0201":"Beef (fresh)","0202":"Beef (frozen)","0203":"Pork","0207":"Poultry","0808":"Apples and pears","0803":"Bananas","2009":"Fruit juice","2202":"Soft drinks","3808":"Pesticides","3824":"Chemical preparations","3006":"Pharmaceutical goods","3003":"Medicines (bulk)","9019":"Therapy and breathing devices","9022":"X-ray and scanning equipment","9030":"Electrical test instruments","9032":"Automatic regulators","8486":"Chip-making machines","8419":"Heating and cooling equipment","8430":"Earth-moving and drilling machinery","8431":"Parts for lifting and digging machines","8474":"Mining and mixing machinery","8477":"Plastic and rubber machinery","8480":"Moulds","8482":"Ball bearings","8502":"Generators","8503":"Motor and generator parts","8523":"Data storage (discs, cards)","8529":"Parts for radio and TV equipment","8534":"Circuit boards","8541":"Semiconductors and solar cells","8548":"Electrical parts","8705":"Special vehicles (cranes, fire engines)","8706":"Vehicle chassis","8707":"Vehicle bodies","8716":"Trailers","9001":"Optical fibres and lenses","9013":"Lasers and optical devices","9015":"Surveying instruments","9026":"Flow and pressure instruments","9033":"Instrument parts","7101":"Pearls","7102":"Diamonds","7103":"Precious stones","7115":"Precious-metal articles","7208":"Steel sheet","7210":"Coated steel sheet","7304":"Steel pipes","7308":"Steel structures","7326":"Other steel articles","7403":"Refined copper","7602":"Aluminium scrap","2207":"Industrial alcohol","2905":"Alcohols (industrial)","2933":"Pharmaceutical chemicals","2934":"Pharmaceutical chemicals","2937":"Hormones","2941":"Antibiotics","3105":"Fertilisers","3204":"Dyes","3208":"Paints and varnishes","3307":"Toiletries","3401":"Soap","3402":"Detergents","4011":"Tyres","4202":"Bags and suitcases","4703":"Wood pulp","4802":"Paper","4819":"Cardboard boxes","6110":"Jumpers and sweatshirts","6109":"T-shirts","6203":"Men's suits and trousers","6204":"Women's suits and dresses","9401":"Seats","9405":"Lamps and lighting","9504":"Video game consoles and games","9506":"Sports equipment","9101":"Precious-metal watches","9102":"Watches","9301":"Military weapons","9306":"Ammunition"};   // plain names for the products that carry the most trade
  function nice(code, n) {
    if (code && code.length === 2 && CH_N[code]) return CH_N[code];
    if (code && code.length === 4 && H4_N[code]) return H4_N[code];
    if (code && /^99/.test(code)) return "Confidential and unallocated trade";
    let t = String(n || code).replace(/^[-–\s]+/, "").replace(/^[ivx]+\.\s*/i, "").split(";")[0].replace(/\s*\((other than|excluding|including|not including)[^)]*\)/gi, "").replace(/\s+of (sub)?headings? \d[\d ,.to]*(and \d+)?/gi, "").replace(/\s+of (sub)?heading \d+/gi, "").trim(); if (t.length > 56) t = t.split(/,| \(| of a kind| other than| principally| whether or not/)[0];
    t = t.charAt(0).toUpperCase() + t.slice(1).toLowerCase().replace(/\b(uk|eu|us|tv|lng|lpg)\b/g, m => m.toUpperCase()); return t.length > 70 ? t.slice(0, 68) + "…" : t;
  }
  const pc = (a, b) => b ? 100 * a / b : 0, pcs = (a, b) => pc(a, b).toFixed(pc(a, b) < 10 ? 1 : 0) + "%";
  const ch = (a, b) => b ? (a / b - 1) * 100 : null;
  const fch = v => v == null || !isFinite(v) ? "—" : `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(Math.abs(v) < 10 ? 1 : 0)}%`;
  const updown = v => v == null ? "" : v >= 0 ? `<span class="pc-up">up ${Math.abs(v).toFixed(Math.abs(v) < 10 ? 1 : 0)}%</span>` : `<span class="pc-dn">down ${Math.abs(v).toFixed(Math.abs(v) < 10 ? 1 : 0)}%</span>`;
  const cap = h => h.replace(/>(\w)/, (m, c) => ">" + c.toUpperCase()).replace(/^(\w)/, c => c.toUpperCase());
  const words = p => p >= 95 ? "almost all" : p >= 70 ? "about three-quarters" : p >= 60 ? "nearly two-thirds" : p >= 45 ? "about half" : p >= 37 ? "nearly two-fifths" : p >= 30 ? "about a third" : p >= 23 ? "about a quarter" : p >= 18 ? "about a fifth" : p >= 13 ? "about a seventh" : p >= 8 ? "about a tenth" : p >= 3 ? `${p.toFixed(0)}%` : `${p.toFixed(1)}%`;
  // a short form for running text: lower case (keeping acronyms), cut at a word near n characters
  const lc = t => /^[A-Z]{2,}/.test(t) ? t : t.charAt(0).toLowerCase() + t.slice(1);
  function brief(t, n) {
    n = n || 34; if (t.length <= n) return t;
    let x = t.replace(/\s+and other\b.*$/i, "").replace(/\s+(n\.?e\.?s|nes)\b.*$/i, "");
    if (x.length > n) x = x.replace(/\s+(of|for|from|in|on|with|used in)\s+(the|a|an|such)\b.*$/i, "");
    if (x.length > n && x.includes(",")) { const ps = x.split(/,\s*/); x = ps.length > 1 && (ps[0] + " and " + ps[1]).length <= n ? ps[0] + " and " + ps[1] : ps[0]; }
    else x = x.replace(/,\s*([^,]+)$/, " and $1");
    if (x.length > n) x = x.slice(0, n).replace(/\s+\S*$/, "").replace(/\s+(and|or|of|for|the|with|to|in)$/i, "") + "…";
    return x;
  }
  const andList = a => a.length < 2 ? (a[0] || "") : a.slice(0, -1).join(", ") + " and " + a[a.length - 1];
  const sgbp = v => (v >= 0 ? "+" : "−") + X().gbp(Math.abs(v));
  const add = (m, k, v) => { m.set(k, (m.get(k) || 0) + (v || 0)); };
  const top = (m, n) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n || 10);
  const MON = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const monName = (t, i) => { const k = X().monthAt(t, i); return `${MON[+k.slice(2) - 1]} ${2000 + +k.slice(0, 2)}`; };
  const periodTo = () => { const t = X().T(); return monName(t, 11); };
  const V = () => AtlasCard.viz, C = () => window.AtlasCtx;
  const tab = (head, rows) => `<table class="pc-tab"><thead><tr>${head.map((h, i) => `<th${i ? ' class="num"' : ""}>${h}</th>`).join("")}</tr></thead><tbody>${rows.map(r => `<tr>${r.map((c, i) => `<td${i ? ' class="num"' : ""}${i && typeof c === "object" && c ? ` data-v="${c.v}"` : ""}>${typeof c === "object" && c ? c.t : c}</td>`).join("")}</tr>`).join("")}</tbody></table>`;

  // ---------- the pieces of a set of HS headings ----------
  function gather(h4codes, f) {
    const D = X().D, part = new Map(), ports = new Map(), rows = [];
    let v = 0, pv = 0;
    h4codes.forEach(h => { const o = D.h4[h]; if (!o || !(o[f] > 0)) return; v += o[f]; pv += (o.pv || {})[f] || 0; rows.push({ c: h, n: o.n, v: o[f], pv: (o.pv || {})[f] || 0 });
      (o.ct[f] || []).forEach(([c, x]) => add(part, c, x)); (o.po[f] || []).forEach(([p, x]) => add(ports, p, x)); });
    rows.sort((a, b) => b.v - a.v); rows.forEach(r => { r.d = r.v - r.pv; });
    return { v, pv, rows, part, ports };
  }
  const h4In = chs => Object.keys(X().D.h4).filter(h => chs.includes(h.slice(0, 2)));
  function monthsOf(chs, f) { const t = X().T(), m = new Array(12).fill(0); chs.forEach(c => { const o = t.ch[c]; if (o && o.m && o.m[f]) o.m[f].forEach((x, i) => { m[i] += x || 0; }); }); return m; }
  function yearsOf(chs, f) { const t = X().T(), y = {}; chs.forEach(c => { const o = t.ch[c]; if (o && o.y && o.y[f]) Object.entries(o.y[f]).forEach(([k, x]) => { y[k] = (y[k] || 0) + x; }); }); return y; }

  // the items every story shares: who buys it, ports, months, what moved (rows = products inside, with v, pv, d)
  function partnerItem(g, f, tot, rowFn) {
    const t = X().T(), P = top(g.part, 12); if (!P.length) return null;
    const share = c => pcs(g.part.get(c), tot), eu = [...g.part.entries()].filter(([c]) => (t.cty[c] || {}).rg === "EU").reduce((a, [, x]) => a + x, 0), t3 = P.slice(0, 3).reduce((a, x) => a + x[1], 0);
    return { size: "half", k: W[f].who, h: `${esc(X().cty(P[0][0]))} ${W[f].whoS} <b>${share(P[0][0])}</b>`, viz: V().bars(P.slice(0, 6).map(([c, x], i) => ({ v: x, c: i ? "#9aa5ab" : "#1e6fb8", n: X().cty(c) }))),
      more: `<p>The three biggest, ${P.slice(0, 3).map(([c]) => esc(X().cty(c))).join(", ")}, account for ${pcs(t3, tot)} between them; EU countries for ${pcs(eu, tot)}. ${pc(P[0][1], tot) > 30 ? `That is a lot riding on one ${f === "exp" ? "customer" : "supplier"}.` : "No single country dominates."}</p><p class="pc-fine">Summed from each product's largest partners, so smaller partners are under-counted.</p>`,
      deep: P.map(([c, x]) => ({ label: X().cty(c), sub: `${share(c)} of the total`, v: X().gbp(x), fn: () => rowFn(c) })), deepTitle: f === "exp" ? "Buyers" : "Suppliers" };
  }
  function portItem(g, tot, f) {
    const P = top(g.ports, 8); if (!P.length) return null;
    const pn = p => X().port(p) === "Not Collected" ? "Not recorded (mostly EU trade by road)" : X().port(p);
    return { size: "half", k: f === "exp" ? "Where it leaves the UK" : "Where it arrives", h: `Mostly through <b>${esc(pn(P[0][0]))}</b> (${pcs(P[0][1], tot)})`, viz: V().bars(P.slice(0, 6).map(([p, x], i) => ({ v: x, c: i ? "#9aa5ab" : "#16a085", n: pn(p) }))),
      more: tab(["Port or airport", "Value", "Share"], P.map(([p, x]) => [esc(pn(p)), { t: X().gbp(x), v: x }, { t: pcs(x, tot), v: pc(x, tot) }])) + `<p class="pc-fine">Heathrow and other airports carry small, valuable goods; container ports carry bulk.</p>` };
  }
  function monthItem(m) {
    const t = X().T(); if (!m.some(x => x > 0)) return null; let hi = 0, lo = 0; m.forEach((x, i) => { if (x > m[hi]) hi = i; if (x < m[lo]) lo = i; });
    const pts = m.map((x, i) => [X().ym(X().monthAt(t, i)), x]), avg = m.reduce((a, b) => a + b, 0) / 12;
    return { size: "half", k: "Month by month", h: `Busiest in <b>${esc(monName(t, hi).split(" ")[0])}</b>, quietest in ${esc(monName(t, lo).split(" ")[0])}`, viz: V().spark(pts, "#1e6fb8"),
      more: `<div class="pc-chart">${C().CH.line([{ name: "Monthly", colour: "#1e6fb8", pts }], { w: 380, h: 170, vfmt: X().gbp, yfmt: v => X().gbp(v) })}</div><p>${esc(monName(t, hi))} was ${pcs(m[hi] - avg, avg).replace(/^/, "")} above an average month and ${esc(monName(t, lo))} ${pcs(avg - m[lo], avg)} below. Single big shipments (an aircraft, a cargo of gold) can make one month stand out.</p>` };
  }
  function movedItem(g, f, fnFor) {
    if (!g.pv || g.rows.length < 2) return null;
    const c = ch(g.v, g.pv), up = g.rows.filter(r => r.d > 0).sort((a, b) => b.d - a.d), dn = g.rows.filter(r => r.d < 0).sort((a, b) => a.d - b.d);
    const net = g.v - g.pv, lead = net >= 0 ? up : dn, tot2 = lead.reduce((a, r) => a + Math.abs(r.d), 0), top3 = lead.slice(0, 3).reduce((a, r) => a + Math.abs(r.d), 0);
    const say = r => `${esc(lc(brief(nice(r.c, r.n), 30)))} (${sgbp(r.d)})`;
    return { k: "What moved", h: `${cap(updown(c))} on the year${net >= 0 ? (up[0] ? `, led by ${say(up[0])}` : "") : (dn[0] ? `, dragged down by ${say(dn[0])}` : "")}`, sub: net >= 0 && dn[0] ? `The biggest fall: ${esc(lc(brief(nice(dn[0].c, dn[0].n), 40)))} (${sgbp(dn[0].d)}).` : net < 0 && up[0] ? `The biggest rise: ${esc(lc(brief(nice(up[0].c, up[0].n), 40)))} (${sgbp(up[0].d)}).` : "", viz: V().bars([...up.slice(0, 3), ...dn.slice(0, 3).reverse()].map(r => ({ v: r.d, c: r.d >= 0 ? "#2e9d6a" : "#c0392b", n: `${nice(r.c, r.n)} ${sgbp(r.d)}` }))),
      more: `<p>The total went from ${X().gbp(g.pv)} to ${X().gbp(g.v)} (${sgbp(net)}). ${lead.length ? `${net >= 0 ? "Most of the rise" : "Most of the fall"} came from a few products: the biggest three ${net >= 0 ? "risers" : "fallers"} account for ${pcs(top3, tot2 || 1)} of the ${net >= 0 ? "gains" : "losses"}.` : ""} ${up.length && dn.length ? `${up.length} products grew and ${dn.length} shrank.` : ""}</p>`,
      deep: [...up.slice(0, 5).map(r => ({ label: nice(r.c, r.n), sub: `${fch(ch(r.v, r.pv))} on the year`, v: sgbp(r.d), c: "#1a7f4b", fn: () => fnFor(r.c) })), ...dn.slice(0, 5).map(r => ({ label: nice(r.c, r.n), sub: `${fch(ch(r.v, r.pv))} on the year`, v: sgbp(r.d), c: "#b3261e", fn: () => fnFor(r.c) }))], deepTitle: "Risers, then fallers" };
  }

  // ---------- a product group (SITC section) ----------
  async function sectionSpec(f, k) {
    await X().detail(); const t = X().T(), name = SITC_N[k] || "Section " + k, chs = (SITC_CH[k] || []).filter(c => t.ch[c] && t.ch[c][f] > 0), o = f === "exp" ? "imp" : "exp";
    const chv = chs.map(c => ({ c, v: t.ch[c][f] })).sort((a, b) => b.v - a.v), tot = chv.reduce((a, x) => a + x.v, 0), all = t.tot[f], other = chs.reduce((a, c) => a + (t.ch[c][o] || 0), 0) + (SITC_CH[k] || []).filter(c => t.ch[c] && !(t.ch[c][f] > 0)).reduce((a, c) => a + (t.ch[c][o] || 0), 0);
    const g = gather(h4In(chs), f), years = yearsOf(chs, f), yk = Object.keys(years).map(Number).sort((a, b) => a - b), full = yk.filter(y => y < +String(new Date().getFullYear())).slice(-10);
    const ypts = full.map(y => [y, years[y]]), w = AtlasCard.why(ypts, ["trade", "growth", "sterling"], { fmt: X().gbp });
    const items = [];
    // 1. the lead
    const gr = g.pv ? ch(g.v, g.pv) : null;
    items.push({ h: `${cap(words(pc(tot, all)))} of all UK goods ${W[f].flow}${gr == null ? "" : gr > 2 ? ", and growing" : gr < -2 ? ", and shrinking" : ", and holding steady"}`, sub: `<b>${X().gbp(tot)}</b> in the 12 months to ${esc(periodTo())}${gr != null ? `, ${updown(gr)} on the year before` : ""}. The UK ${f === "exp" ? "bought" : "sold"} ${X().gbp(other)} of the same goods, a ${tot - other >= 0 === (f === "exp") ? "surplus" : "deficit"} of ${X().gbp(Math.abs(tot - other))}.`,
      viz: ypts.length > 2 ? V().spark(ypts, "#1e6fb8") : V().big(pcs(tot, all), `of all ${W[f].flow}`), open: false,
      more: ypts.length > 2 ? `<div class="pc-chart">${C().CH.line([{ name, colour: "#1e6fb8", pts: ypts }], { w: 380, h: 190, vfmt: X().gbp, yfmt: v => X().gbp(v), events: w.events })}</div><p>From ${X().gbp(ypts[0][1])} in ${ypts[0][0]} to ${X().gbp(ypts[ypts.length - 1][1])} in ${ypts[ypts.length - 1][0]}${years[2019] ? `; ${chs2(years[ypts[ypts.length - 1][0]], years[2019])} on 2019, before the pandemic` : ""}.</p>${AtlasCard.whyHTML(w, "No sharp moves stand out year to year.")}` + regNote(f, k, pc(tot, all)) : regNote(f, k, pc(tot, all)) });
    // 2. what's in it
    if (chv.length) items.push({ k: "What's in it", h: chv.length === 1 ? `All of it is one HS chapter: ${esc(nice(chv[0].c))}` : `Mostly ${andList(chv.slice(0, 3).map(x => `${esc(lc(brief(nice(x.c), 40)))} (${pcs(x.v, tot)})`))}`,
      viz: V().stack(chv.slice(0, 10).map((x, i) => ({ v: x.v, c: COLS[i % COLS.length], n: nice(x.c) }))),
      more: `<p>${esc(name)} covers ${chv.length} HS chapter${chv.length === 1 ? "" : "s"} of goods. Choose one to see what's inside it, down to single product codes.</p>`,
      deep: chv.map((x, i) => ({ label: nice(x.c), sub: `HS chapter ${x.c} · ${pcs(x.v, tot)}`, v: X().gbp(x.v), c: COLS[i % COLS.length], fn: () => productSpec(x.c, f) })), deepTitle: "Chapters" });
    // 3. the biggest products
    if (g.rows.length) { const t15 = g.rows.slice(0, 15), s15 = t15.reduce((a, r) => a + r.v, 0);
      items.push({ k: "The biggest products", h: `${esc(brief(nice(g.rows[0].c, g.rows[0].n), 40))} alone: <b>${X().gbp(g.rows[0].v)}</b>, ${words(pc(g.rows[0].v, tot))} of the total`, sub: `The 15 biggest products make up ${pcs(s15, tot)}.`,
        viz: V().bars(t15.slice(0, 7).map((r, i) => ({ v: r.v, c: i ? "#9aa5ab" : "#1e6fb8", n: nice(r.c, r.n) }))),
        deep: t15.map(r => ({ label: nice(r.c, r.n), sub: `HS ${r.c} · ${pcs(r.v, tot)}${r.pv ? ` · ${fch(ch(r.v, r.pv))} on the year` : ""}`, v: X().gbp(r.v), fn: () => productSpec(r.c, f) })), deepTitle: "The top 15" }); }
    // 4. what moved
    const mv = movedItem(g, f, c => productSpec(c, f)); if (mv) items.push(mv);
    // 5-8. who, where, when, where in the UK
    const pi = partnerItem(g, f, g.v, c => partnerSpec(f, k, c)), po = portItem(g, g.v, f), mo = monthItem(monthsOf(chs, f)), re = regionItem(f, k);
    [pi, po, mo, re].filter(Boolean).forEach(x => items.push(x));
    // 9. what it adds up to (only what the figures say)
    const tells = [];
    if (g.rows[0] && pc(g.rows[0].v, tot) > 25) tells.push(`One product, ${nice(g.rows[0].c, g.rows[0].n).toLowerCase()}, is ${pcs(g.rows[0].v, tot)} of the whole group, so the total rises and falls with it.`);
    const p1 = top(g.part, 1)[0]; if (p1 && pc(p1[1], g.v) > 30) tells.push(`${X().cty(p1[0])} alone ${f === "exp" ? "takes" : "supplies"} ${pcs(p1[1], g.v)}: a slowdown or a trade dispute there would show here quickly.`);
    if (Math.abs(tot - other) > 0.25 * Math.max(tot, other)) tells.push(`The UK ${(f === "exp") === (tot > other) ? "sells far more of these goods than it buys" : "buys far more of these goods than it sells"} (${X().gbp(f === "exp" ? tot : other)} out, ${X().gbp(f === "exp" ? other : tot)} in).`);
    if (years[2019] && ypts.length && Math.abs(ch(ypts[ypts.length - 1][1], years[2019])) > 10) tells.push(`${ypts[ypts.length - 1][0]} was ${chs2(ypts[ypts.length - 1][1], years[2019])} on 2019, before the pandemic and the end of the Brexit transition.`);
    if (tells.length) items.push({ k: "What it adds up to", h: esc(tells[0]), more: tells.length > 1 ? `<ul class="pc-why">${tells.slice(1).map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : "" });
    items.push({ k: "Where it comes from", h: "HMRC overseas trade statistics", more: `<p>The UK's trade in goods for the 12 months to ${esc(periodTo())}, by HS product code. HMRC's regional figures use SITC product groups; Atlas links the two by HS chapter, which matches SITC sections closely but not exactly (a few chapters straddle two groups). Partner = destination for exports, country of origin for imports.</p>`, url: "https://www.uktradeinfo.com/trade-data/", urlLabel: "uktradeinfo" });
    const iMv = items.findIndex(x => x.k === "What moved");
    return { app: "Markets", title: `${name}: ${W[f].flow}`, items, source: "HMRC overseas trade statistics", when: `12 months to ${periodTo()}`,
      figs: [{ v: X().gbp(tot), l: `${W[f].flow}, 12 months`, at: 0 }, { v: pcs(tot, all), l: `of all goods ${W[f].flow}`, at: 1 }, g.pv ? { v: fch(ch(g.v, g.pv)), l: "on the year before", at: iMv >= 0 ? iMv : 0, tone: ch(g.v, g.pv) >= 0 ? "good" : "bad" } : null],
      map: { metrics: ["trd_sitc_" + f + "_share"], pick: ["trd_sitc_" + f, k], level: "region" } };
  }
  const chs2 = (a, b) => { const v = ch(a, b); return v == null ? "" : `${v >= 0 ? "up" : "down"} ${Math.abs(v).toFixed(0)}%`; };
  function regNote(f, k, share) {   // HMRC's regional figures give a different share: say why, so the two numbers don't puzzle
    const c = C(), d = c && c.bd && c.bd.of("trd_sitc_" + f, c.UKC); if (!d) return ""; const t = Object.values(d).reduce((a, b) => a + b, 0), r = t ? 100 * (d[k] || 0) / t : null;
    return r != null && Math.abs(r - share) >= 1 ? `<p class="pc-fine">HMRC's regional statistics put it at ${r.toFixed(1)}% (calendar ${c.bd.spec("trd_sitc_" + f).yr ? c.bd.spec("trd_sitc_" + f).yr() : "2024"}). They group products by SITC rather than HS, count a calendar year, and leave out trade they can't place in a UK region (much of it gold, fuels and low-value parcels), so groups like this one take a bigger share of a smaller total.</p>` : "";
  }
  function regionItem(f, k) {
    const c = C(); if (!c || !c.bd || !c.bd.spec("trd_sitc_" + f)) return null;
    const rows = c.allCodesAt("region").concat(["S92000003", "W92000004", "N92000002"]).map(r => ({ r, v: (c.bd.of("trd_sitc_" + f, r) || {})[k] || 0 })).filter(x => x.v > 0).sort((a, b) => b.v - a.v);
    if (rows.length < 3) return null; const tot = rows.reduce((a, x) => a + x.v, 0), yr = c.bd.spec("trd_sitc_" + f).yr ? c.bd.spec("trd_sitc_" + f).yr() : "";
    return { size: "half", k: "Where in the UK", h: `<b>${esc(c.nameOf(rows[0].r))}</b> ${f === "exp" ? "sells" : "buys"} the most (${pcs(rows[0].v, tot)})`, viz: V().bars(rows.slice(0, 6).map((x, i) => ({ v: x.v, c: i ? "#9aa5ab" : "#e07b39", n: c.nameOf(x.r) }))),
      more: `<p>By the region of the business doing the trade, ${esc(yr)}. Head offices can pull trade towards London.</p>`, map: { metrics: ["trd_sitc_" + f + "_share"], pick: ["trd_sitc_" + f, k], level: "region" },
      deep: rows.map(x => ({ label: c.nameOf(x.r), sub: `${pcs(x.v, tot)} of the UK`, v: X().gbp(x.v), fn: () => window.AtlasMenu && AtlasMenu.B ? AtlasMenu.B.bdCard("trd_sitc_" + f, k, x.r) : null })), deepTitle: "Regions and nations" };
  }

  // ---------- one product (an HS chapter, heading, subheading or CN8 code) ----------
  async function productSpec(code, f) {
    f = f || "exp"; await X().detail(); const n = X().node(code), t = X().T(); if (!n) return { app: "Markets", title: code, items: [{ h: `No trade recorded for ${esc(code)} in the 12 months.` }], source: "HMRC" };
    const name = nice(code, n.n), o = f === "exp" ? "imp" : "exp", lvl = X().level(code).split(" ")[0];
    const kidsC = X().kids(code), kids = kidsC.map(c => ({ c, o: X().node(c) })).filter(x => x.o && x.o[f] > 0).map(x => ({ c: x.c, n: x.o.n, v: x.o[f], pv: (x.o.pv || {})[f] || 0 })).sort((a, b) => b.v - a.v);
    kids.forEach(r => { r.d = r.v - r.pv; });
    const pv = n.pv ? n.pv[f] : code.length === 2 ? gather(h4In([code]), f).pv : null, cng = pv ? ch(n[f], pv) : null;
    const g = { v: n[f], pv: pv || 0, rows: kids, part: new Map((n.ct[f] || []).map(x => [x[0], x[1]])), ports: new Map((n.po[f] || []).map(x => [x[0], x[1]])) };
    const kg = n.kg && n.kg[f] ? n[f] / n.kg[f] : null;
    const items = [];
    const ratio = n.exp && n.imp ? Math.max(n.exp, n.imp) / Math.min(n.exp, n.imp) : null, rt = r => r >= 10 ? Math.round(r) + " times" : r >= 1.95 ? r.toFixed(1).replace(/\.0$/, "") + " times" : r.toFixed(1) + " times";
    const leadH = !n.imp ? "Sold abroad, hardly bought" : !n.exp ? "Bought from abroad, hardly sold" : ratio < 1.25 ? `Roughly as much bought as sold: a ${n.exp >= n.imp ? "surplus" : "deficit"} of ${X().gbp(Math.abs(n.exp - n.imp))}` : n.imp > n.exp ? `The UK buys ${rt(ratio)} what it sells: a <b>${X().gbp(n.imp - n.exp)}</b> deficit` : `The UK sells ${rt(ratio)} what it buys: a <b>${X().gbp(n.exp - n.imp)}</b> surplus`;
    items.push({ h: leadH, sub: `${cap(W[f].flow)} <b>${X().gbp(n[f])}</b>${cng != null ? `, ${updown(cng)} on the year before` : ""}. ${lvl} ${esc(code)}${code.length > 2 ? `, part of ${esc(lc(nice(code.slice(0, 2))))}` : ""}.`,
      viz: n.m ? V().spark(n.m[f].map((v, i) => [X().ym(X().monthAt(t, i)), v]), f === "exp" ? "#1e6fb8" : "#c0392b") : V().big(X().gbp(n[f]), W[f].flow),
      more: `${n.m ? `<div class="pc-chart">${C().CH.line(["exp", "imp"].map(k => ({ name: k === "exp" ? "Exports" : "Imports", colour: k === "exp" ? "#1e6fb8" : "#c0392b", pts: n.m[k].map((v, i) => [X().ym(X().monthAt(t, i)), v]) })), { w: 380, h: 170, vfmt: X().gbp, yfmt: v => X().gbp(v) })}</div>` : ""}${esc(n.n) !== esc(name) ? `<p><b>HMRC's description.</b> ${esc(n.n)}</p>` : ""}${kg ? `<p>On average ${X().gbp(kg)} a kilogram${kg > 1000 ? ": light and valuable, the kind of good that flies" : kg < 2 ? ": heavy and cheap for its weight, the kind of good that goes by sea" : ""}.</p>` : ""}` });
    if (kids.length > 1) { const tk = kids.reduce((a, r) => a + r.v, 0);
      items.push({ k: "What's inside it", h: `Mostly ${andList(kids.slice(0, 3).map(r => `${esc(lc(brief(nice(r.c, r.n), 40)))} (${pcs(r.v, tk)})`))}`, viz: V().stack(kids.slice(0, 10).map((r, i) => ({ v: r.v, c: COLS[i % COLS.length], n: nice(r.c, r.n) }))),
        deep: kids.slice(0, 20).map((r, i) => ({ label: nice(r.c, r.n), sub: `${X().level(r.c).split(" ")[0]} ${r.c} · ${pcs(r.v, tk)}${r.pv ? ` · ${fch(ch(r.v, r.pv))}` : ""}`, v: X().gbp(r.v), c: COLS[i % COLS.length], fn: () => productSpec(r.c, f) })), deepTitle: kids.length > 20 ? "The largest 20" : "" }); }
    const mv = movedItem(g, f, c => productSpec(c, f)); if (mv) items.push(mv);
    const pi = partnerItem(g, f, n[f], c => { if (window.AtlasTrade) AtlasTrade.openPartner(c); return null; }); if (pi) { pi.more = pi.more.replace(/<p class="pc-fine">[^<]*<\/p>/, ""); items.push(pi); }
    const po = portItem(g, n[f], f); if (po) items.push(po);
    if (n.m) { const mo = monthItem(n.m[f]); if (mo) items.push(mo); }
    const up = [code.slice(0, 2), code.slice(0, 4), code.slice(0, 6)].filter(c => c.length < code.length && X().node(c));
    if (up.length) items.push({ size: "half", k: "Where it sits", h: up.map(c => esc(nice(c, X().node(c).n))).join(" › "), deep: up.map(c => ({ label: nice(c, X().node(c).n), sub: `${X().level(c).split(" ")[0]} ${c}`, v: X().gbp(X().node(c)[f]), fn: () => productSpec(c, f) })) });
    items.push({ k: "Where it comes from", h: "HMRC overseas trade statistics", more: `<p>12 months to ${esc(periodTo())}. Some small or confidential trade is only published at chapter level, so the levels below can add up to less.</p><p><button type="button" class="linkish" data-trprod="${esc(code)}">Open the full product panel (tariffs, maps, businesses)</button></p>`, url: `https://www.trade-tariff.service.gov.uk/search?q=${encodeURIComponent(code)}`, urlLabel: "UK tariff for this code" });
    const iIn = items.findIndex(x => x.k === "What's inside it"), iMv = items.findIndex(x => x.k === "What moved");
    return { app: "Markets", title: name, items, source: "HMRC overseas trade statistics", when: `12 months to ${periodTo()}`,
      figs: [{ v: X().gbp(n.exp), l: "exports", at: 0 }, { v: X().gbp(n.imp), l: "imports", at: 0 }, cng != null ? { v: fch(cng), l: `${W[f].flow} on the year`, at: iMv >= 0 ? iMv : 0, tone: cng >= 0 ? "good" : "bad" } : { v: X().gbp(n.exp - n.imp), l: "balance", at: iIn >= 0 ? iIn : 0 }] };
  }

  // ---------- a product group with one country ----------
  async function partnerSpec(f, k, cc) {
    await X().detail(); const D = X().D, t = X().T(), name = SITC_N[k], chs = SITC_CH[k] || [], cn = X().cty(cc);
    const rows = h4In(chs).map(h => { const o = D.h4[h], x = (o.ct[f] || []).find(r => r[0] === cc); return x ? { c: h, n: o.n, v: x[1], all: o[f] } : null; }).filter(Boolean).sort((a, b) => b.v - a.v);
    const tot = rows.reduce((a, r) => a + r.v, 0), all = chs.reduce((a, c) => a + ((t.ch[c] || {})[f] || 0), 0), cty = t.cty[cc] || {};
    const items = [{ h: `${esc(cn)} ${f === "exp" ? "buys" : "sells the UK"} about <b>${X().gbp(tot)}</b> of ${esc(name.toLowerCase())}`, sub: `${pcs(tot, all)} of all UK ${esc(name.toLowerCase())} ${W[f].flow}${cty[f] ? `, and ${pcs(tot, cty[f])} of everything the UK ${f === "exp" ? "sells to" : "buys from"} ${esc(cn)}` : ""}.`, viz: V().big(pcs(tot, all), `of UK ${W[f].flow}`) }];
    if (rows.length) items.push({ k: "Which products", h: `Led by ${rows.slice(0, 2).map(r => `${esc(nice(r.c, r.n))} (${X().gbp(r.v)})`).join(" and ")}`, viz: V().bars(rows.slice(0, 6).map((r, i) => ({ v: r.v, c: i ? "#9aa5ab" : "#1e6fb8", n: nice(r.c, r.n) }))),
      more: `<p>Where ${esc(cn)} is one of a product's ten biggest ${f === "exp" ? "buyers" : "suppliers"}.</p>`, deep: rows.slice(0, 15).map(r => ({ label: nice(r.c, r.n), sub: `${pcs(r.v, r.all)} of UK ${W[f].flow} of it`, v: X().gbp(r.v), fn: () => productSpec(r.c, f) })) });
    if (cty.y && cty.y[f]) { const pts = Object.entries(cty.y[f]).map(([y, v]) => [+y, v]).filter(p => p[0] < new Date().getFullYear());
      items.push({ k: `All UK ${W[f].flow} ${W[f].to} ${cn}`, h: `<b>${X().gbp(cty[f])}</b> in the 12 months, every product`, viz: V().spark(pts, "#1e6fb8"), go: () => { if (window.AtlasTrade) AtlasTrade.openPartner(cc); return null; } }); }
    items.push({ k: "Where it comes from", h: "HMRC overseas trade statistics", more: "<p>Summed over the products where this country is among the ten largest partners, so it slightly under-counts.</p>" });
    return { app: "Markets", title: `${name}: ${cn}`, items, source: "HMRC overseas trade statistics", when: `12 months to ${periodTo()}` };
  }

  // ---------- menu rows under a product group ----------
  function loadingRows() { X().detail().then(() => { if (window.AtlasMenu && AtlasMenu.refresh) AtlasMenu.refresh(); }); return [{ label: "Loading the product detail…", loading: true }]; }
  const prodRow = (c, f, tot) => { const o = X().node(c); if (!o) return null; return { v: o[f], label: nice(c, o.n), key: c, sub: `${X().level(c).split(" ")[0]} ${c} · ${X().gbp(o[f])}${tot ? ` · ${pcs(o[f], tot)}` : ""}`, card: () => productSpec(c, f), children: c.length < 8 ? () => prodKids(c, f) : null }; };
  function prodKids(c, f) { if (!X().D) return loadingRows(); const o = X().node(c); const ks = X().kids(c).map(k => [k, (X().node(k) || {})[f] || 0]).filter(x => x[1] > 0).sort((a, b) => b[1] - a[1]).slice(0, 40);
    return [{ label: `${nice(c, o.n)}: the card`, sub: "What's inside, who buys it, what moved", card: () => productSpec(c, f) }, ...ks.map(([k]) => prodRow(k, f, o[f])).filter(Boolean)]; }
  function sectionKids(f, k) {
    const t = X() && X().T(); if (!t) return [];
    const name = SITC_N[k], chs = (SITC_CH[k] || []).filter(c => t.ch[c] && t.ch[c][f] > 0).sort((a, b) => t.ch[b][f] - t.ch[a][f]), tot = chs.reduce((a, c) => a + t.ch[c][f], 0);
    return [
      { label: `${name}: the full story`, sub: "What it's worth, what's in it, who buys it, what moved", card: () => sectionSpec(f, k), map: { metrics: ["trd_sitc_" + f + "_share"], pick: ["trd_sitc_" + f, k], level: "region" } },
      { label: "What's in it", sub: `${chs.length} HS chapters, down to single products`, children: () => chs.map(c => ({ v: t.ch[c][f], label: nice(c), key: c, sub: `HS ${c} · ${X().gbp(t.ch[c][f])} · ${pcs(t.ch[c][f], tot)}`, card: () => productSpec(c, f), children: () => prodKids(c, f) })) },
      { label: "Top 15 products", sub: "The biggest single headings", children: () => { if (!X().D) return loadingRows(); return gather(h4In(chs), f).rows.slice(0, 15).map(r => prodRow(r.c, f, tot)).filter(Boolean); } },
      { label: W[f].who, sub: f === "exp" ? "The countries buying it" : "The countries it comes from", children: () => { if (!X().D) return loadingRows(); const g = gather(h4In(chs), f); return top(g.part, 20).map(([c, v]) => ({ v, label: X().cty(c), key: c, sub: `${X().gbp(v)} · ${pcs(v, g.v)}`, card: () => partnerSpec(f, k, c) })); } },
      { label: "What moved most", sub: "Risers and fallers on the year before", children: () => { if (!X().D) return loadingRows(); const g = gather(h4In(chs), f); const up = g.rows.filter(r => r.d > 0).sort((a, b) => b.d - a.d).slice(0, 8), dn = g.rows.filter(r => r.d < 0).sort((a, b) => a.d - b.d).slice(0, 8);
        return [...up, ...dn].map(r => ({ v: r.d, label: nice(r.c, r.n), key: r.c, sub: `${sgbp(r.d)} · ${fch(ch(r.v, r.pv))}`, card: () => productSpec(r.c, f) })); } },
      { label: "Where in the UK", sub: "Regions and nations", children: () => { const c = C(); const rows = c.allCodesAt("region").concat(["S92000003", "W92000004", "N92000002"]).map(r => ({ r, v: (c.bd.of("trd_sitc_" + f, r) || {})[k] || 0 })).filter(x => x.v > 0).sort((a, b) => b.v - a.v);
        return rows.map(x => ({ v: x.v, label: c.nameOf(x.r), key: x.r, sub: X().gbp(x.v), card: () => AtlasMenu.B.bdCard("trd_sitc_" + f, k, x.r), map: { metrics: ["trd_sitc_" + f + "_share"], pick: ["trd_sitc_" + f, k], level: "region", focus: x.r } })); } },
    ];
  }
  window.AtlasTradeStory = { sectionSpec, productSpec, partnerSpec, sectionKids, prodKids, nice, SITC_CH };
})();
