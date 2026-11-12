"""
Atlas 0.8: Atlas Transport.   python tests/test_transport.py

The routing services are replaced by fixed answers (Playwright route interception), so the test checks Atlas, not them:
directions by road and by public transport draw on the map and list their steps; Reach lists the councils inside;
the transport metrics have values; stops load at street zoom.
"""
import os, sys, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from atlas_test import server, browser, open_atlas, Report, open_panel

LINE6 = "_p~iF~ps|U_ulLnnqC_mqNvxq`@"   # a short polyline (precision 5 sample, decoded at 6: any shape will do)
VALHALLA = {"trip": {"summary": {"time": 1010, "length": 4.79}, "legs": [{"shape": "iqrfaBj~jDuB`bBzAb_@xCda@fa@heC|Dh^vC`e@", "maneuvers": [{"instruction": "Cycle north on Borough High Street.", "length": 0.4, "time": 80}, {"instruction": "You have arrived.", "length": 0, "time": 0}]}]}}
TRANSIT = {"itineraries": [{"duration": 7740, "transfers": 1, "startTime": "2026-11-09T09:04:00Z", "endTime": "2026-11-09T11:13:00Z", "legs": [
    {"mode": "WALK", "from": {"name": "START", "lat": 51.505, "lon": -0.087}, "to": {"name": "London Bridge", "lat": 51.505, "lon": -0.086}, "startTime": "2026-11-09T09:04:00Z", "endTime": "2026-11-09T09:08:00Z", "duration": 240, "legGeometry": {"points": "iqrfaBj~jDuB`bB", "precision": 6}},
    {"mode": "SUBWAY", "routeShortName": "Jubilee", "agencyName": "London Underground", "headsign": "Stanmore", "routeColor": "7b868c", "from": {"name": "London Bridge", "lat": 51.505, "lon": -0.086}, "to": {"name": "Bond Street", "lat": 51.514, "lon": -0.149}, "startTime": "2026-11-09T09:08:00Z", "endTime": "2026-11-09T09:20:00Z", "duration": 720, "legGeometry": {"points": "iqrfaBj~jDuB`bBzAb_@xCda@", "precision": 6}}]}]}
ISO = {"type": "FeatureCollection", "features": [{"type": "Feature", "properties": {}, "geometry": {"type": "Polygon", "coordinates": [[[-0.35, 51.38], [0.12, 51.38], [0.12, 51.62], [-0.35, 51.62], [-0.35, 51.38]]]}}]}


def main():
    rep = Report("transport")
    with server() as base, browser() as b:
        page = open_atlas(b, base, (1440, 900), query="debug#app=transport"); js = page.evaluate
        page.route("**/valhalla1.openstreetmap.de/route**", lambda r: r.fulfill(status=200, content_type="application/json", body=json.dumps(VALHALLA)))
        page.route("**/valhalla1.openstreetmap.de/isochrone**", lambda r: r.fulfill(status=200, content_type="application/json", body=json.dumps(ISO)))
        page.route("**/api.transitous.org/**", lambda r: r.fulfill(status=200, content_type="application/json", body=json.dumps(TRANSIT)))
        nom, pho = [], []   # 0.8.2.1: every request Atlas makes to Nominatim (should be none) and to Photon
        page.route("**/nominatim.openstreetmap.org/**", lambda r: (nom.append(r.request.url), r.fulfill(status=200, content_type="application/json", body="[]")))
        fake = '{"type":"FeatureCollection","features":[{"type":"Feature","geometry":{"type":"Point","coordinates":[-0.1276,51.5034]},"properties":{"housenumber":"10","street":"Downing Street","city":"London","postcode":"SW1A 2AA","countrycode":"GB"}}]}'
        page.route("**/photon.komoot.io/**", lambda r: (pho.append(r.request.url), r.fulfill(status=200, content_type="application/json", body=fake)))
        page.wait_for_timeout(1500)
        rep.check(js("() => [...document.querySelectorAll('.fwin')].some(w => !w.hidden && /Directions/.test(w.textContent))") or page.is_visible("[data-trq=from]"), "Atlas Transport opens on Directions")
        # Addresses fill in as you type (Photon), with one request per pause in typing, not one per letter.
        page.type("[data-trq=from]", "10 Downing Str", delay=60); page.wait_for_timeout(1500)
        rep.check(not nom, f"Nominatim is never asked ({len(nom)} requests)")
        rep.check(1 <= len(pho) <= 2, f"typing an address asks Photon once per pause, not per letter ({len(pho)} requests)")
        rep.check("countrycode=GB" in (pho[-1] if pho else ""), "address search is limited to the UK")
        rep.check(js("() => /Downing Street/.test(document.querySelector('[data-trhits=from]').textContent)"), "…and the address appears in the suggestions")
        n = len(pho); page.press("[data-trq=from]", "Enter"); page.wait_for_timeout(1000)
        rep.check(len(pho) == n, f"the same search again is answered from memory ({len(pho) - n} new requests)")
        page.fill("[data-trq=from]", ""); page.wait_for_timeout(300)
        def choose(which, text):
            page.fill(f"[data-trq={which}]", text); page.wait_for_selector(f"[data-trhits={which}] li[data-trhit]", timeout=15000)
            page.dispatch_event(f"[data-trhits={which}] li[data-trhit]", "mousedown"); page.wait_for_timeout(300)
        choose("from", "London Bridge"); choose("to", "Bond Street"); page.wait_for_timeout(800)
        rep.check(page.is_visible(".tr-opt") and "Jubilee" in js("() => document.querySelector('.tr-steps').textContent"), "public transport: the journey and its legs are listed")
        n = js("() => atlasMap.getSource('tr-route')._data.features.length")
        rep.check(n >= 2, f"…and drawn on the map ({n} legs)")
        page.click("[data-trmode=bicycle]"); page.wait_for_timeout(800)
        rep.check("Borough High Street" in js("() => document.querySelector('.tr-steps').textContent"), "cycling: the steps come from the road router")
        open_panel(page, "reach"); page.wait_for_timeout(500)
        choose("iso", "London Bridge"); page.wait_for_timeout(1200)
        txt = js("() => document.querySelector('[data-trisoout]').textContent")
        rep.check("councils have their centre" in txt, f"Reach lists the councils inside ({txt[:60]})")
        v = js("() => AtlasDebug.M.rail_usage.get('E09000028', AtlasDebug.state.date)")
        rep.check(v and v["v"] and v["v"] > 1e7, f"rail journeys for Southwark ({v and v['text']})")
        v = js("() => AtlasDebug.M.bus_stops.get('E92000001', AtlasDebug.state.date)")
        rep.check(v and v["v"] and v["v"] > 100000, f"bus stops add up for England ({v and v['text']})")
        js("() => atlasMap.jumpTo({ center: [-0.0865, 51.5054], zoom: 16 })"); page.wait_for_timeout(2500)
        k = js("() => atlasMap.getSource('stops') && atlasMap.getSource('stops')._data.features.length")
        rep.check(k and k > 100, f"bus and tram stops load at street zoom ({k})")
        rep.check(not page.errors, "no console errors" + (f": {page.errors[:3]}" if page.errors else ""))
        page.context.close()
    rep.done()


if __name__ == "__main__":
    main()
