/* Atlas 0.10 · narratives (core). Turns a metric's numbers into a short story, then says what the measure tells us and
 * how far to trust it. For example: "In 1998 GDP per head in Hartlepool was £11,412. By 2024 it was £24,970, up 119%
 * (3.1% a year). The sharpest fall came in 2020, when it dropped from … to …, 6.2% down. That is 32% below the UK."
 * The numbers are always Atlas's own; the "what it tells us" and "how far to trust it" lines are written per metric
 * below (MEANS), or built from the source's caveats where none is written.
 */
(function () {
  "use strict";
  let ctx = null;
  const esc = t => String(t == null ? "" : t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const YEARS_W = ["", "a year later", "two years later", "three years later", "four years later", "five years later"];
  const ord = n => n + (n % 100 >= 11 && n % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] || "th");

  // what each headline measure tells us, and how far to trust it (plain words; neutral)
  const MEANS = {
    gdp: ["The value of everything produced in the area in a year (gross domestic product): the size of its economy.",
      "Counted where work happens, not where people live: places that people commute into look bigger than their residents' incomes. In current prices, so part of any rise is inflation."],
    gdp_per_head: ["Output divided by the people who live here: a rough guide to how productive the local economy is.",
      "Not a coherent guide to living standards in cities and commuter belts: output is counted where people work but divided by residents, so central London or Manchester look far richer, and the towns their workers live in poorer, than their residents are. Household income (GDHI) and productivity per job are better for those questions."],
    gdp_growth: ["How much the economy grew after taking out price rises (real terms), on the year before.",
      "Local growth figures are revised as more data arrive and swing widely in small places; one year rarely means much on its own."],
    population: ["How many people usually live here (ONS mid-year estimate).",
      "Estimates between censuses are rolled forward from births, deaths and migration; migration is the least certain part, so fast-changing cities carry the widest margins."],
    pop_change: ["How fast the population has grown or shrunk over ten years.", "Built from two estimates, so it inherits both their margins of error."],
    hpi_avg: ["The average price paid for homes sold here (UK House Price Index).",
      "It reflects the homes that happened to sell, adjusted for type; it is a fair guide to price levels and trends, less so to what any one home is worth. Recent months are revised as more sales are registered."],
    hpi_change: ["How much average house prices changed over the year.", "Monthly figures are revised for several months; a single month's change is noisy."],
    rent_avg: ["The average monthly private rent for tenancies here (ONS Price Index of Private Rents).",
      "Covers existing as well as new tenancies, so it moves more slowly than advertised rents."],
    afford: ["How many years of a typical full-time salary a typical home costs (house price to workplace earnings).",
      "Uses earnings of people who work here, not residents, and medians, so it hides the spread; a ratio around 8 means a typical home costs eight years of a typical salary."],
    psnd_pct: ["The government's debt as a share of the economy's yearly output.", "A national figure; regional debt doesn't exist as such."],
    imd_score: ["How deprived the area is across income, jobs, health, education, crime, housing and environment (English Indices of Deprivation 2025).",
      "A relative ranking within England, not an absolute measure, so it can't say if a place got better in absolute terms; a council's score averages very different neighbourhoods."],
    le_f: ["How long a girl born now would live on average if today's death rates stayed the same.", "A summary of current death rates, not a forecast; three-year averages smooth small numbers."],
    le_m: ["How long a boy born now would live on average if today's death rates stayed the same.", "A summary of current death rates, not a forecast; three-year averages smooth small numbers."],
    hle_f: ["Years a girl born now could expect to live in good health.", "Based on people's own rating of their health in a survey, so it has wide margins in small areas."],
    hle_m: ["Years a boy born now could expect to live in good health.", "Based on people's own rating of their health in a survey, so it has wide margins in small areas."],
    u75_prev: ["Deaths before 75 that public health or timely treatment could have prevented, per 100,000 people (age-standardised).", "Standardised for age, so places with older populations can be compared fairly."],
    temp_accom: ["Households placed in temporary accommodation by the council because they are homeless.", "Counts households on the last day of the quarter; councils record and place differently, and some place households in other areas."],
    trade_exp: ["Goods sold abroad by businesses based here, in a year.",
      "Assigned to where the trading business is registered, so head-office regions (London) look bigger; services exports aren't included; councils inside a larger published area get a share by population."],
    trade_balance: ["Goods exports minus goods imports.", "Goods only: the UK sells far more services than goods, so a goods deficit isn't the whole picture."],
    inv_jobs: ["Jobs that newly arrived foreign investment projects expect to create.", "Projects recorded by DBT; the jobs are expected, not counted later; projects across several regions are listed separately."],
    spend_ph: ["Government spending that can be traced to the people living here, per person, in the year: benefits and pensions, health, schools, policing, transport and more.",
      "Only identifiable spending is placed (about 85% of the total: defence, debt interest and aid can't be); some is allocated by formula, and places with older or poorer populations get more through pensions and benefits, so a higher figure isn't a measure of favour."],
    spend_tot: ["Total government spending that can be traced to people here, in the year.", "A total: bigger places spend more. Use spending per head to compare."],
    council_spend_ph: ["What the council spends on services per resident, from its own money and general grants.",
      "Net of fees, charges and specific grants (for example the schools grant), so it understates everything spent through the council; in two-tier areas Atlas adds a population share of the county's spending."],
    mig_intl_net: ["How much the population grew (or shrank) from people moving between here and abroad, per 1,000 residents.",
      "Local international migration is modelled from national surveys and administrative records, so single-year figures for small councils are uncertain; students and short stays are hard to place."],
    mig_internal_net: ["Whether more people move here from the rest of the UK than leave for it, per 1,000 residents.", "Based on GP and benefit records of address changes; young men and students register late, so their moves are under-counted."],
    asylum_support: ["People seeking asylum who are housed or supported by the Home Office here, per 10,000 residents.", "A snapshot on one date; the Home Office chooses where to house people, so it reflects accommodation contracts, not where people chose to live."],
    social_homes_pct: ["How much of the housing here is owned by councils and housing associations, let at below-market rents.", "Counts homes, not whether they're affordable or in good repair; MHCLG fills some councils' gaps with estimates."],
    council_homes: ["How many homes the council owns, each year since 1979.", "Falls come from Right to Buy sales, demolitions and whole-stock transfers to housing associations; a council that transferred everything drops to zero though the homes are still social housing."],
    waiting_list: ["Households waiting for social housing, per 100 homes.", "Not a coherent measure of need on its own: councils set their own rules on who may join and many have cut their lists, so a short list can mean strict rules rather than little need."],
    claimant_rate: ["People claiming out-of-work benefits, as a share of residents aged 16 to 64.", "Since Universal Credit it includes some people in work who must look for more hours, so it reads higher than unemployment; it's a timely local signal, not the official unemployment rate."],
    child_poverty: ["Children growing up in households on less than 60% of the median income after paying for housing.", "Local estimates calibrated to a national survey; best for comparing places and trends, not exact counts."],
    eco_gva_share: ["The chosen industry's share of the area's output.", "Industries are assigned by where businesses are, and output by where it's produced."],
  };

  const fmtOf = m => v => m.fmt ? m.fmt(v) : (Math.abs(v) >= 1000 ? Math.round(v).toLocaleString("en-GB") : (+v).toFixed(1));
  const isPts = m => m.nature === "share" || m.nature === "change" || /%/.test(String((m.fmt || (x => x))(1)));
  const low = t => /^[A-Z][A-Z]/.test(t) ? t : t.charAt(0).toLowerCase() + t.slice(1);   // "GDP per head" stays, "Average price" -> "average price"
  const placeName = code => code === ctx.UKC ? "the United Kingdom" : ctx.nameOf(code);
  function change(m, a, b) { // "up 4.2 points" / "a 12% rise" / "up 2.8 years"
    if (a == null || b == null) return "";
    if (m.nature === "duration") { const d = b - a; return d === 0 ? "unchanged" : `${d > 0 ? "up" : "down"} ${fmtOf(m)(Math.abs(d))}`; }
    if (isPts(m)) { const d = b - a; return d === 0 ? "unchanged" : `${d > 0 ? "up" : "down"} ${Math.abs(d).toFixed(Math.abs(d) < 10 ? 1 : 0)} points`; }
    if (!a) return "";
    const p = (b / a - 1) * 100; return p === 0 ? "unchanged" : `${p > 0 ? "up" : "down"} ${Math.abs(p).toFixed(Math.abs(p) < 10 ? 1 : 0)}%`;
  }
  function series(m, code) {
    const sp = ctx.metricSpan(m.id), y1 = +ctx.today.slice(0, 4), y0 = sp ? +sp[0].slice(0, 4) : y1 - 25;
    try { return ctx.seriesOf(m, code, y0, y1).filter(p => p[1] != null && isFinite(p[1])).map(p => [Math.floor(p[0]), p[1]]); } catch (e) { return []; }
  }
  // the biggest move within 1 to 3 years
  function sharpest(m, pts) {
    let best = null;
    for (let i = 0; i < pts.length; i++) for (let k = 1; k <= 3 && i + k < pts.length; k++) {
      const [ya, a] = pts[i], [yb, b] = pts[i + k]; if (yb - ya > 3) break;
      const mag = isPts(m) ? Math.abs(b - a) : a ? Math.abs(b / a - 1) : 0;
      if (!best || mag > best.mag) best = { ya, yb, a, b, mag };
    }
    return best;
  }
  function rankAt(m, code, d) {
    const p = ctx.P[code]; if (!p || !["council", "region", "nation", "constituency"].includes(p.level)) return null;
    const vals = ctx.allCodesAt(p.level).map(c => { try { const r = m.get(c, d); return r && r.v != null && !r.nm ? [c, r.v] : null; } catch (e) { return null; } }).filter(Boolean);
    if (vals.length < 5) return null; vals.sort((a, b) => b[1] - a[1]); const i = vals.findIndex(x => x[0] === code); return i < 0 ? null : { i: i + 1, n: vals.length, lv: p.level };
  }
  const PL = { council: "councils", region: "regions", nation: "nations", constituency: "constituencies" };

  // the story: 2-4 sentences from the data, then what it means and how far to trust it
  function story(m, code, opts) {
    opts = opts || {}; if (!m || !ctx || m.nature === "text" || m.nature === "line" || m.nature === "event" || m.scale === "nominal") return "";
    const f = fmtOf(m), where = placeName(code), pts = m.temporal === "election" ? [] : series(m, code), out = [];
    const d = ctx.date, now = (() => { try { return m.get(code, d); } catch (e) { return null; } })();
    if (pts.length >= 2) {
      const [y0, v0] = pts[0], [yN, vN] = pts[pts.length - 1], yrs = yN - y0;
      const c = change(m, v0, vN), cagr = (m.nature === "amount" || m.nature === "count") && v0 > 0 && vN > 0 && yrs >= 5 ? (Math.pow(vN / v0, 1 / yrs) - 1) * 100 : null;
      out.push(`In ${yN}, ${esc(low(m.label))} in ${esc(where)} was <b>${esc(f(vN))}</b>${c ? `, ${c} on ${y0}` : ""}${cagr != null ? ` (about ${Math.abs(cagr).toFixed(1)}% a year)` : ""}. In ${y0} it had been ${esc(f(v0))}.`);
      let hi = pts[0], lo = pts[0]; pts.forEach(p => { if (p[1] > hi[1]) hi = p; if (p[1] < lo[1]) lo = p; });
      const peak = hi[0] !== yN && hi[0] !== y0, trough = lo[0] !== y0 && lo[0] !== yN;
      if (peak || trough) out.push([peak ? `It peaked at ${esc(f(hi[1]))} in ${hi[0]}` : "", trough ? `${peak ? " and" : "It"} was lowest in ${lo[0]} (${esc(f(lo[1]))})` : ""].join("") + ".");
      const s = sharpest(m, pts);
      if (s && s.mag > (isPts(m) ? 1 : 0.04) && pts.length >= 4) {
        const up = s.b > s.a, gap = s.yb - s.ya;
        out.push(`The sharpest ${up ? "rise" : "fall"} came ${gap === 1 ? `in ${s.yb}` : `between ${s.ya} and ${s.yb}`}: from ${esc(f(s.a))} in ${s.ya}, ${YEARS_W[gap] || `${gap} years later`} it ${up ? "had risen" : "had fallen"} to ${esc(f(s.b))}, ${isPts(m) ? `${Math.abs(s.b - s.a).toFixed(1)} points` : `a ${Math.abs((s.b / s.a - 1) * 100).toFixed(1)}% ${up ? "rise" : "drop"}`}.`);
      }
    } else if (now && now.v != null && !now.nm) {   // 0.11: the figure first, short; any detail ("28,809,340 of 48,224,212") after it
      const fv = f(now.v), more = now.text && now.text !== fv && now.text.startsWith(fv) ? now.text.slice(fv.length).trim().replace(/^\((.*)\)$/, "$1") : "";
      out.push(`${esc(m.label)} in ${esc(where)}: <b>${esc(now.text && !now.text.startsWith(fv) ? now.text : fv)}</b>${now.yr ? ` (${esc(now.yr)})` : ""}.${more ? ` That is ${esc(more)}.` : ""}`);
    }
    if (now && now.v != null && !now.nm && code !== ctx.UKC && !opts.noCompare) {
      let uk = null; try { uk = m.get(ctx.UKC, d); } catch (e) {}
      const bits = [];
      if (uk && uk.v != null && !uk.nm && m.nature !== "count" && m.nature !== "amount") bits.push(isPts(m) ? `${Math.abs(now.v - uk.v).toFixed(1)} points ${now.v >= uk.v ? "above" : "below"} the UK (${esc(f(uk.v))})` : uk.v ? `${Math.abs((now.v / uk.v - 1) * 100).toFixed(0)}% ${now.v >= uk.v ? "above" : "below"} the UK (${esc(f(uk.v))})` : "");
      const r = rankAt(m, code, d); if (r) bits.push(`${r.i === 1 ? "the highest" : r.i === r.n ? "the lowest" : r.i <= r.n / 2 ? `${ord(r.i)} highest` : `${ord(r.n - r.i + 1)} lowest`} of ${r.n} ${PL[r.lv]}`);
      if (bits.filter(Boolean).length) out.push(`Now it is ${bits.filter(Boolean).join(", ")}.`);
    }
    if (now && now.est) out.push(`<span class="nv-est">Some figures here are estimates${now.estWhy ? ": " + esc(now.estWhy) : ""}.</span>`);
    const mt = MEANS[m.id] || MEANS[m.bd && m.id.replace(/_(share|top|lq)$/, "_share")] || null;
    const means = mt ? mt[0] : m.desc ? m.desc.replace(/\.?$/, ".") : "";
    const trust = mt ? mt[1] : (ctx.caveat && ctx.caveat(m.id)) || "";
    if (!out.length && !means) return "";
    return `<div class="nv">${out.length ? `<p class="nv-story">${out.join(" ")}</p>` : ""}${means && !opts.short ? `<p class="nv-means"><b>What it tells us.</b> ${esc(means)}</p>` : ""}${trust && !opts.short ? `<p class="nv-trust"><b>How far to trust it.</b> ${esc(trust)}</p>` : ""}</div>`;
  }

  // sentence helpers for panel stories (same wording everywhere)
  const N = {
    change: (a, b, pts) => pts ? `${b - a >= 0 ? "up" : "down"} ${Math.abs(b - a).toFixed(1)} points` : a ? `${b >= a ? "up" : "down"} ${Math.abs((b / a - 1) * 100).toFixed(Math.abs(b / a - 1) < 0.1 ? 1 : 0)}%` : "",
    trend: (pts, f, label) => { // pts [[x, v]] -> "From £a in 2016 to £b in 2026, up n%; highest in 2022 (£c)."
      pts = pts.filter(p => p[1] != null); if (pts.length < 2) return ""; const [x0, a] = pts[0], [xN, b] = pts[pts.length - 1]; let hi = pts[0]; pts.forEach(p => { if (p[1] > hi[1]) hi = p; });
      const yr = x => String(Math.floor(x));
      return `${label ? label + " went " : ""}from ${f(a)} in ${yr(x0)} to ${f(b)} in ${yr(xN)}, ${N.change(a, b)}${hi[0] !== xN && hi[0] !== x0 ? `; it was highest in ${yr(hi[0])} (${f(hi[1])})` : ""}.`;
    },
    share: (part, whole) => whole ? (100 * part / whole).toFixed(part / whole < 0.1 ? 1 : 0) + "%" : "—",
  };

  window.AtlasNarrative = { init(c) { ctx = c; }, story, MEANS, series: (m, code) => series(m, code), fmtOf, isPts, ...N };
})();
