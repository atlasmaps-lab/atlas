/* Atlas flights proxy (Cloudflare Worker). Keeps the AeroDataBox key off the public page, answers only for UK airports,
 * and caches each answer (boards 5 minutes, delays 15) so a free plan's quota lasts.
 *   GET /board?iata=LHR    departures and arrivals from an hour ago to three hours ahead
 *   GET /delays?icao=EGLL  delay statistics now (median delay, cancellations, delay index), departures and arrivals
 * Secrets / variables (wrangler secret put …): RAPIDAPI_KEY; ALLOWED_ORIGINS (comma-separated, e.g.
 * "https://atlasmaps-lab.github.io,http://localhost:8740"). See docs/flights-proxy.md.
 */
const HOST = "aerodatabox.p.rapidapi.com";
const UK_IATA = new Set(["LHR","LGW","STN","LTN","LCY","SEN","MAN","BHX","EDI","GLA","BRS","NCL","LPL","EMA","BFS","BHD","LBA","ABZ","CWL","SOU","EXT","BOH","MME","INV","PIK","NWI","HUY","NQY","LDY","SYY","KOI","LSI","SCS","WIC","BEB","BRR","CAL","ILY","TRE","ISC","LEQ","BQH","FAB","DND","BLK"]);
const cors = (req, env) => { const o = req.headers.get("Origin") || "", ok = (env.ALLOWED_ORIGINS || "").split(",").map(s => s.trim()).includes(o); return { "Access-Control-Allow-Origin": ok ? o : "null", "Vary": "Origin", "Content-Type": "application/json" }; };
const pad = n => String(n).padStart(2, "0");
const localStamp = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
async function api(env, path) {
  const r = await fetch(`https://${HOST}${path}`, { headers: { "X-RapidAPI-Key": env.RAPIDAPI_KEY, "X-RapidAPI-Host": HOST } });
  if (!r.ok) throw new Error("AeroDataBox " + r.status);
  return r.json();
}
const flight = (f, dir) => {
  const mv = dir === "dep" ? f.departure : f.arrival, other = dir === "dep" ? f.arrival : f.departure;
  return { n: f.number, airline: (f.airline || {}).name || "", place: ((other || {}).airport || {}).name || "", iata: ((other || {}).airport || {}).iata || "",
    sched: ((mv || {}).scheduledTime || {}).local || "", est: ((mv || {}).revisedTime || (mv || {}).predictedTime || {}).local || "", status: f.status || "", terminal: (mv || {}).terminal || "", gate: (mv || {}).gate || "" };
};
export default {
  async fetch(req, env, ctx) {
    const h = cors(req, env); if (req.method === "OPTIONS") return new Response(null, { headers: h });
    const url = new URL(req.url), cache = caches.default, key = new Request(url.toString(), { method: "GET" });
    const hit = await cache.match(key); if (hit) { const r = new Response(hit.body, hit); Object.entries(h).forEach(([k, v]) => r.headers.set(k, v)); return r; }
    try {
      let body, ttl;
      if (url.pathname === "/board") {
        const iata = (url.searchParams.get("iata") || "").toUpperCase(); if (!UK_IATA.has(iata)) return new Response('{"error":"not a UK airport"}', { status: 400, headers: h });
        const j = await api(env, `/flights/airports/iata/${iata}?offsetMinutes=-60&durationMinutes=240&withLeg=true&direction=Both&withCancelled=true&withCodeshared=false&withCargo=false&withPrivate=false&withLocation=false`);
        body = { at: new Date().toISOString(), dep: (j.departures || []).map(f => flight(f, "dep")), arr: (j.arrivals || []).map(f => flight(f, "arr")) }; ttl = 300;
      } else if (url.pathname === "/delays") {
        const icao = (url.searchParams.get("icao") || "").toUpperCase(); if (!/^EG[A-Z]{2}$/.test(icao)) return new Response('{"error":"not a UK airport"}', { status: 400, headers: h });
        const j = await api(env, `/airports/icao/${icao}/delays`), s = x => x ? { median: x.medianDelay || "", index: x.delayIndex, cancelled: x.numCancelled, total: x.numTotal } : null;
        body = { at: new Date().toISOString(), dep: s(j.departuresDelayInformation), arr: s(j.arrivalsDelayInformation) }; ttl = 900;
      } else return new Response('{"error":"unknown"}', { status: 404, headers: h });
      const res = new Response(JSON.stringify(body), { headers: Object.assign({}, h, { "Cache-Control": `public, max-age=${ttl}` }) });
      ctx.waitUntil(cache.put(key, res.clone())); return res;
    } catch (e) { return new Response(JSON.stringify({ error: String(e.message || e) }), { status: 502, headers: h }); }
  },
};
