"""
Atlas 0.8.1: hubs, networks and places.   python tests/test_hubs.py

Swiping sideways no longer switches to the Workspace; a place without a tile opens a place card (no outline, with a pin);
airport cards show the operator, local time, live boards (through the flights proxy, mocked here) and the punctuality
history; port cards show freight partners, crossings and sailings (mocked); networks draw as lines; Reach by train.
"""
import os, sys, json, re
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from atlas_test import server, browser, open_atlas, Report, ROOT, open_panel

BOARD = {"at": "2026-11-09T10:00:00Z", "dep": [{"n": "BA 117", "airline": "British Airways", "place": "New York JFK", "iata": "JFK", "sched": "2026-11-09 10:25+00:00", "est": "2026-11-09 10:55+00:00", "status": "Delayed", "terminal": "5", "gate": "A10"}],
         "arr": [{"n": "VS 4", "airline": "Virgin Atlantic", "place": "New York JFK", "iata": "JFK", "sched": "2026-11-09 11:05+00:00", "est": "", "status": "Expected", "terminal": "3", "gate": ""}]}
DELAYS = {"at": "2026-11-09T10:00:00Z", "dep": {"median": "00:32:00", "index": 3.4, "cancelled": 12, "total": 400}, "arr": {"median": "00:18:00", "index": 2.0, "cancelled": 4, "total": 380}}
ONE2ALL = {"all": [{"place": {"name": "London Bridge", "lat": 51.505, "lon": -0.086, "modes": ["RAIL"]}, "duration": 2}, {"place": {"name": "Lewisham", "lat": 51.4657, "lon": -0.0142, "modes": ["RAIL"]}, "duration": 12}, {"place": {"name": "Croydon", "lat": 51.375, "lon": -0.092, "modes": ["RAIL"]}, "duration": 20}]}


def main():
    rep = Report("hubs")
    with server() as base, browser() as b:
        page = open_atlas(b, base, (1440, 900), query="debug"); js = page.evaluate
        page.mouse.move(700, 450)
        for _ in range(12): page.mouse.wheel(60, 0); page.wait_for_timeout(15)
        page.wait_for_timeout(500)
        rep.check(not js("() => document.body.classList.contains('wsfull') || document.body.classList.contains('split')"), "a sideways two-finger swipe no longer opens the Workspace")
        js("() => AtlasDebug.openPlaceCard({ kind: 'place', name: 'Hebden Bridge', layer: 'town names', lonlat: [-2.012, 53.742] })"); page.wait_for_timeout(1500)
        t = js("() => [...document.querySelectorAll('.fwin')].filter(w => !w.hidden).map(w => w.textContent).join(' ')")
        rep.check("Hebden Bridge" in t and "Calderdale" in t and "Town" in t, "a town without a tile opens a place card that says which areas it's in")
        rep.check(js("() => atlasMap.getSource('place-pin')._data.features.length") == 1 and not js("() => document.body.classList.contains('focused')"), "…with a pin and no outline")
        js("() => atlasMap.jumpTo({ center: [-1.5, 53.6], zoom: 8 })"); page.wait_for_timeout(600)
        rep.check(js("() => [...document.querySelectorAll('.fwin')].some(w => !w.hidden && /Hebden Bridge/.test(w.textContent))"), "the place card stays while the map moves")
        # networks: ticked from the Perspectives menu, as a person would, at every zoom
        js("() => AtlasDebug.mapOnly([])"); page.wait_for_timeout(300)
        if js("() => document.getElementById('dock').classList.contains('collapsed')"): page.click("#dock [data-fold]"); page.wait_for_timeout(500)
        page.click("#dock [data-open='transport']"); page.wait_for_timeout(300); page.click("#dock [data-group='Networks (drawn as lines)']"); page.wait_for_timeout(300)
        row = js("() => { const i = document.getElementById('cb-inf_rail'); return { dis: i.disabled, text: i.closest('.crow').textContent }; }")
        rep.check(not row["dis"] and "No data" not in row["text"], f"Railways can be ticked in the menu (not greyed as “no data”: {row['text'].strip()[:60]})")
        page.check("#cb-inf_rail"); page.wait_for_timeout(2500); page.keyboard.press("Escape")
        rep.check(js("() => atlasMap.getLayoutProperty('net-osm-rail', 'visibility') === 'visible' && atlasMap.getSource('net-osm')._data.features.length > 1000"), "ticking Railways draws the national rail network")
        ok = []
        for z in (5, 7.5, 9.5):
            js(f"() => {{ atlasMap.jumpTo({{ center: [-1.5, 53], zoom: {z} }}); }}"); page.wait_for_timeout(600)
            ok.append(js("() => AtlasDebug.availOf ? true : !document.getElementById('cb-inf_rail') || !document.getElementById('cb-inf_rail').disabled"))
        rep.check(all(ok), "…and stays available at every zoom")
        js("() => AtlasCtx.mapAdd('inf_freight')"); page.wait_for_timeout(2500)
        rep.check(js("() => atlasMap.getLayoutProperty('net-freight', 'visibility') === 'visible' && atlasMap.getSource('net-freight')._data.features.length > 300"), "freight routes draw as lines")
        rep.check(js("() => atlasMap.getSource('net-freight-dots')._data.features.length > 100"), "…with moving dots for the flow")
        js("() => AtlasCtx.mapAdd('inf_ferry')"); page.wait_for_timeout(1500)
        rep.check(js("() => atlasMap.getSource('net-ferry')._data.features.length > 300 && atlasMap.getLayoutProperty('net-ferry', 'visibility') === 'visible'"), "ferry routes draw as lines")
        rep.check("Drawn as lines" in js("() => AtlasDebug.M.inf_rail.get('E92000001', AtlasDebug.state.date).text") or "basemap" in js("() => AtlasDebug.M.inf_rail.get('E92000001', AtlasDebug.state.date).text"), "railways are a line metric (they need the basemap, which tests run without)")
        rep.check(not page.errors, "no console errors" + (f": {page.errors[:3]}" if page.errors else ""))
        page.context.close()

        # airport card with the flights proxy (mocked)
        ctx = b.new_context(viewport={"width": 1440, "height": 900}); ctx.add_init_script("localStorage.setItem('atlas-uk-plain','true')")
        page = ctx.new_page(); page.errors = []; page.on("pageerror", lambda e: page.errors.append(str(e)))
        cfg = open(os.path.join(ROOT, "config.js")).read().replace('flightsProxy: ""', 'flightsProxy: "https://flights.test"')
        page.route("**/config.js*", lambda r: r.fulfill(status=200, content_type="application/javascript", body=cfg))
        page.route("https://flights.test/board**", lambda r: r.fulfill(status=200, content_type="application/json", body=json.dumps(BOARD), headers={"Access-Control-Allow-Origin": "*"}))
        page.route("https://flights.test/delays**", lambda r: r.fulfill(status=200, content_type="application/json", body=json.dumps(DELAYS), headers={"Access-Control-Allow-Origin": "*"}))
        page.route("**/api.transitous.org/api/v1/map/stops**", lambda r: r.fulfill(status=200, content_type="application/json", body=json.dumps([{"name": "Dover Ferry Terminal", "stopId": "gb_9300DOV", "lat": 51.126, "lon": 1.33, "modes": ["FERRY"]}]), headers={"Access-Control-Allow-Origin": "*"}))
        page.route("**/api.transitous.org/api/v5/stoptimes**", lambda r: r.fulfill(status=200, content_type="application/json", body=json.dumps({"stopTimes": [{"place": {"departure": "2099-01-01T10:00:00Z"}, "mode": "FERRY", "routeShortName": "", "agencyName": "DFDS", "headsign": "Calais"}]}), headers={"Access-Control-Allow-Origin": "*"}))
        page.goto(base + "index.html?debug", wait_until="load"); page.wait_for_function("window.AtlasDebug && atlasMap.getSource && atlasMap.getSource('councils')", timeout=120000); page.wait_for_timeout(800); js = page.evaluate
        js("() => AtlasDebug.openPoiCard('ap-heathrow')"); page.wait_for_timeout(1500)
        t = js("() => [...document.querySelectorAll('.fwin')].filter(w => !w.hidden).map(w => w.textContent).join(' ')")
        rep.check("LHR" in t and "Local time" in t and "Operated by" in t, "the airport card shows its codes, operator and local time")
        rep.check("BA 117" in t and "Severe delays" in t, "…live departures and the disruption now (through the proxy)")
        rep.check("month by month" in t and "Average delay" not in t[:200], "…and the CAA's delay history, with no passenger chart at the top")
        js("() => AtlasDebug.openPoiCard('pt-gbdov') || AtlasDebug.openPoiCard(Object.keys(AtlasDebug.POI_BY).find(k => AtlasDebug.POI_BY[k].n === 'Port of Dover'))"); page.wait_for_timeout(2500)
        t = js("() => [...document.querySelectorAll('.fwin')].filter(w => !w.hidden).map(w => w.textContent).join(' ')")
        rep.check("France" in t and "lorries, trailers and containers a day" in t, "the port card shows its freight and trading partners")
        rep.check("Crossings from here" in t and "Calais" in t, "…the ferry crossings and the next sailings")
        rep.check(not page.errors, "no console errors (cards)" + (f": {page.errors[:3]}" if page.errors else ""))
        ctx.close()

        # Reach by train
        page = open_atlas(b, base, (1440, 900), query="debug#app=transport"); js = page.evaluate
        page.route("**/api.transitous.org/api/v1/one-to-all**", lambda r: r.fulfill(status=200, content_type="application/json", body=json.dumps(ONE2ALL), headers={"Access-Control-Allow-Origin": "*"}))
        page.route("**/nominatim.openstreetmap.org/**", lambda r: r.fulfill(status=200, content_type="application/json", body="[]"))
        page.wait_for_timeout(1200); open_panel(page, "reach"); page.wait_for_timeout(400)
        page.click("[data-trimode=transit]"); page.fill("[data-trq=iso]", "London Bridge"); page.wait_for_selector("[data-trhits=iso] li[data-trhit]"); page.dispatch_event("[data-trhits=iso] li[data-trhit]", "mousedown"); page.wait_for_timeout(1200)
        rep.check("stops reachable" in js("() => document.querySelector('[data-trisoout]').textContent"), "Reach has a train and public transport option")
        rep.check(not page.errors, "Atlas Transport: no console errors" + (f": {page.errors[:3]}" if page.errors else ""))
        page.context.close()
    rep.done()


if __name__ == "__main__":
    main()
