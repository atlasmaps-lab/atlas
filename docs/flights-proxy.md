# Live airport boards: setting up the flights proxy

Airport cards can show live departures and arrivals (flight, airline, destination or origin, scheduled and expected time, terminal, gate, status) and the delays right now. That data comes from **AeroDataBox**, which needs a key. A key placed in Atlas's page would be public, so a small **Cloudflare Worker** (`workers/flights/`) holds it and passes on only what Atlas needs. It also caches each answer (boards for 5 minutes, delays for 15), so the free plan lasts.

Until the proxy is set up, airport cards show the operator, location, local time and the CAA's monthly punctuality history, with a note that live boards aren't connected.

## Steps (about 15 minutes, free)
1. **AeroDataBox key:** sign up at <https://rapidapi.com/aedbx-aedbx/api/aerodatabox> and subscribe to the free *Basic* plan. Copy your `X-RapidAPI-Key`.
2. **Cloudflare:** create a free account at <https://dash.cloudflare.com>. Install Wrangler (`npm install -g wrangler`) and run `wrangler login`.
3. **Deploy:** in `atlas/workers/flights/`:
   ```bash
   wrangler secret put RAPIDAPI_KEY      # paste the key
   wrangler deploy                        # prints the address, e.g. https://atlas-flights.<you>.workers.dev
   ```
   If Atlas is published at a different address, edit `ALLOWED_ORIGINS` in `wrangler.toml` first.
4. **Tell Atlas:** in `config.js`, set `flightsProxy: "https://atlas-flights.<you>.workers.dev"`. Commit and push.

## Quota
The free plan allows a limited number of calls each month (see RapidAPI). Each airport card asks for one board and one delay summary; the Worker's cache means many people opening the same card in a few minutes count once. If you hit the limit, the card falls back to the punctuality history.

## Terms
Atlas shows AeroDataBox data with attribution on the card. Check AeroDataBox's terms for public display before relying on it at scale.
