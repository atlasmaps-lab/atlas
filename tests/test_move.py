"""
Atlas 0.12: Atlas Transport is about getting from A to B.   python tests/test_move.py

No area tiles (until an area measure is mapped); railways and ferries on the map; footpaths and cycleways at street zoom,
each clickable; the 15-minute city (what everyday needs are within 15 minutes on foot, by bike and by public transport);
drawing your own route through points you click. The services are replaced by fixed answers, so this tests Atlas.
"""
import os, sys, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from atlas_test import server, browser, open_atlas, Report, open_panel

C = [-1.898, 52.478]
ISO = {"type": "FeatureCollection", "features": [{"type": "Feature", "properties": {}, "geometry": {"type": "Polygon", "coordinates": [[[C[0] - 0.01, C[1] - 0.008], [C[0] + 0.01, C[1] - 0.008], [C[0] + 0.01, C[1] + 0.008], [C[0] - 0.01, C[1] + 0.008], [C[0] - 0.01, C[1] - 0.008]]]}}]}
ONE = {"all": [{"place": {"lat": C[1] + 0.02, "lon": C[0] + 0.02, "name": "Stop"}, "duration": 8}]}
OVER = {"elements": [
    {"type": "node", "id": 1, "lat": C[1] + 0.001, "lon": C[0] + 0.001, "tags": {"amenity": "pharmacy", "name": "Boots"}},
    {"type": "node", "id": 2, "lat": C[1] - 0.002, "lon": C[0] + 0.002, "tags": {"amenity": "doctors", "name": "City Surgery"}},
    {"type": "node", "id": 3, "lat": C[1] + 0.003, "lon": C[0] - 0.002, "tags": {"shop": "supermarket", "name": "Co-op"}},
    {"type": "node", "id": 4, "lat": C[1] + 0.02, "lon": C[0] + 0.02, "tags": {"amenity": "library", "name": "Far Library"}},
    {"type": "way", "id": 9, "geometry": [{"lat": C[1], "lon": C[0]}, {"lat": C[1] + 0.001, "lon": C[0] + 0.001}], "tags": {"highway": "cycleway", "name": "Canal towpath", "surface": "asphalt", "lit": "yes"}}]}
ROUTE = {"trip": {"summary": {"time": 900, "length": 3.2}, "legs": [{"shape": "iqrfaBj~jDuB`bBzAb_@xCda@fa@heC|Dh^vC`e@", "maneuvers": []}]}}


def main():
    rep = Report("move")
    with server() as base, browser() as b:
        page = open_atlas(b, base, (1440, 900), query="debug#app=transport"); js = page.evaluate
        page.route("**/valhalla1.openstreetmap.de/isochrone**", lambda r: r.fulfill(status=200, content_type="application/json", body=json.dumps(ISO)))
        page.route("**/valhalla1.openstreetmap.de/route**", lambda r: r.fulfill(status=200, content_type="application/json", body=json.dumps(ROUTE)))
        page.route("**/valhalla1.openstreetmap.de/height**", lambda r: r.fulfill(status=200, content_type="application/json", body=json.dumps({"height": [100, 120, 110, 140]})))
        page.route("**/api.transitous.org/**", lambda r: r.fulfill(status=200, content_type="application/json", body=json.dumps(ONE)))
        page.route("**/overpass-api.de/**", lambda r: r.fulfill(status=200, content_type="application/json", body=json.dumps(OVER)))
        page.route("**/overpass.kumi.systems/**", lambda r: r.fulfill(status=200, content_type="application/json", body=json.dumps(OVER)))
        page.wait_for_timeout(2000)
        vis = js("() => ['pf-council', 'council-line', 'region-line', 'names-council'].map(id => AtlasCtx.map.getLayer(id) ? AtlasCtx.map.getLayoutProperty(id, 'visibility') : 'none')")
        rep.check(js("() => AtlasCtx.noAreas()") and all(v == "none" for v in vis), f"Transport shows no area tiles ({vis})")
        rep.check(js("() => AtlasDebug.mapped ? true : true") and js("() => JSON.stringify(AtlasDebug.PS.mapped).includes('inf_rail')"), "…railways are on the map instead")
        js("() => AtlasDebug.mapOnly(['inf_rail', 'rail_usage'])"); page.wait_for_timeout(800)
        rep.check(not js("() => AtlasCtx.noAreas()") and js("() => AtlasCtx.map.getLayoutProperty('pf-council', 'visibility') !== 'none' || AtlasCtx.map.getLayoutProperty('pf-region', 'visibility') !== 'none'"), "mapping an area measure brings the areas back")
        js("() => AtlasDebug.mapOnly(['inf_rail'])"); page.wait_for_timeout(800)
        rep.check(js("() => AtlasCtx.noAreas()"), "…and taking it off hides them again")
        # paths at street zoom
        js(f"() => AtlasCtx.map.jumpTo({{ center: {C}, zoom: 16 }})"); page.wait_for_timeout(3000)
        n = js("() => AtlasCtx.map.getSource('mv-paths') ? AtlasCtx.map.querySourceFeatures('mv-paths').length : 0")
        rep.check(n >= 1, f"footpaths and cycleways load at street zoom ({n})")
        js("""() => { const m = AtlasCtx.map, f = m.queryRenderedFeatures({ layers: ['mv-paths-line'] })[0]; if (!f) return; const c = f.geometry.coordinates[0], pt = m.project(c); m.fire('click', { point: pt, lngLat: m.unproject(pt), originalEvent: { shiftKey: false } }); }"""); page.wait_for_timeout(600)
        t = js("() => { const w = [...document.querySelectorAll('.pcwin')].filter(w => !w.hidden).pop(); return w ? w.innerText : ''; }")
        rep.check("Canal towpath" in t and "Cycleway" in t and "lit" in t.lower(), f"a path opens a card: what it is, surface, lighting ({t[:90]!r})")
        js("() => document.querySelectorAll('.pcwin [data-wmx]').forEach(b => b.click())")
        # 15-minute city
        open_panel(page, "fifteen"); page.wait_for_timeout(500)
        js(f"() => AtlasMove.run15({{ label: 'Birmingham', lon: {C[0]}, lat: {C[1]} }})"); page.wait_for_timeout(2500)
        t = js("() => [...document.querySelectorAll('.apppanel')].find(w => !w.hidden && w.querySelector('.mv-15t')).innerText")
        rep.check("Walk" in t and "Cycle" in t and "Public transport" in t and "of 11" in t, f"15-minute city scores each way of getting about ({t[:80]!r})")
        rows = js("() => Object.fromEntries([...document.querySelectorAll('.mv-15t tbody tr')].map(r => [r.cells[0].textContent.trim(), r.cells[1].textContent.trim()]))")
        rep.check(rows.get("Pharmacy", "").startswith("✓") and rows.get("GP surgery", "").startswith("✓") and rows.get("Library", "") == "✗", f"…counting needs inside the 15-minute area and not those outside it ({rows})")
        js("() => document.querySelector('[data-mv15card]').click()"); page.wait_for_timeout(500)
        t = js("() => { const w = [...document.querySelectorAll('.pcwin')].filter(w => !w.hidden).pop(); return w ? w.innerText : ''; }")
        rep.check("15-minute city" in t and "needs" in t, "…and opens as a card")
        js("() => document.querySelectorAll('.pcwin [data-wmx]').forEach(b => b.click())")
        # draw a route
        open_panel(page, "draw"); page.wait_for_timeout(500)
        js("() => document.querySelector('[data-mvdraw]').click()")
        for dx in (0, 0.01, 0.02):
            js(f"() => {{ const m = AtlasCtx.map, pt = m.project([{C[0] + dx}, {C[1]}]); m.fire('click', {{ point: pt, lngLat: m.unproject(pt), originalEvent: {{ shiftKey: false }} }}); }}"); page.wait_for_timeout(500)
        page.wait_for_timeout(1000)
        t = js("() => [...document.querySelectorAll('.apppanel')].find(w => !w.hidden && w.querySelector('[data-mvdraw]')).innerText")
        rep.check("3.2 km" in t and "15 min" in t and "50 m" in t, f"drawing three points routes through them: distance, time and the climb ({t[t.find('Distance'):t.find('Distance') + 60]!r})")
        rep.check(js("() => document.querySelectorAll('.mv-wp').length") == 3, "each point is a numbered marker you can drag")
        errs = [e for e in page.errors if "favicon" not in e and not ("overpass" in e and "ERR_ABORTED" in e)]   # a superseded paths request is cancelled on purpose
        rep.check(not errs, f"no errors ({errs[:2]})")
    rep.done()


if __name__ == "__main__":
    main()
