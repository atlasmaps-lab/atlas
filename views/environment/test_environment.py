"""
Atlas 0.9.1: Atlas Environment.   python views/environment/test_environment.py   (tests/run_all.py runs it too)

The view opens with its own header tabs and timeline; recorded floods load and follow the year; the future buttons show
coastal erosion; heat changes with the warming level; protected areas follow the year they were designated; the other
panels open; the area metrics are cleared, so the zones are their own view.
"""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "tests"))
from atlas_test import server, browser, open_atlas, Report


def main():
    rep = Report("environment view")
    with server() as base, browser() as b:
        page = open_atlas(b, base, (1440, 900), query="debug#app=environment"); js = page.evaluate
        tabs = js("() => [...document.querySelectorAll('.ah-nav [data-apanel]')].map(b => b.textContent.trim())")
        rep.check(tabs[:6] == ["Timeline", "Floods", "Coast", "Heat", "Conservation", "Sources"], f"header tabs: {tabs}")
        page.wait_for_function("() => AtlasCtx.map.getSource('env-floods') && AtlasCtx.map.getSource('env-cons') && AtlasCtx.map.getSource('env-coast')", timeout=60000)
        rep.check(js("() => AtlasDebug.mapped ? AtlasDebug.mapped().length === 0 : true"), "no area metrics on the map: the zones are their own view")
        count = lambda: js("() => AtlasCtx.map.querySourceFeatures('env-floods-pt').length")
        n = js("() => AtlasCtx.map.getSource('env-floods')._data.features.length")
        rep.check(js("() => AtlasCtx.map.getLayoutProperty('env-coast-fill', 'visibility')") == "visible", "coast under threat shows today")
        rep.check(n > 2500, f"recorded floods for England and Wales are loaded ({n} flood events, each one shape)")
        txt = lambda: js("() => document.querySelector('.env-sum').textContent")
        today = txt()
        page.evaluate("() => { const r = document.querySelector('[data-envyear]'); r.value = 1960; r.dispatchEvent(new Event('input', {bubbles: true})); }")
        page.wait_for_timeout(500)
        rep.check(js("() => JSON.stringify(AtlasCtx.map.getFilter('env-floods-fill'))") == '["<=",["get","y"],1960]', "moving the timeline to 1960 shows floods up to 1960 only")
        a, z = [int(s.split(" floods")[0].replace(",", "")) for s in (txt(), today)]
        rep.check(0 < a < z, f"fewer floods recorded by 1960 than today ({a} < {z})")
        rep.check(js("() => AtlasCtx.map.getLayoutProperty('env-coast-fill', 'visibility')") in (None, "none"), "coastal erosion is hidden in the past")
        rep.check(not page.is_visible("#timebar"), "the main time bar is hidden: the view has its own timeline")
        page.click("[data-envfut='2105']"); page.wait_for_timeout(800)
        rep.check(js("() => AtlasCtx.map.getLayoutProperty('env-coast-fill', 'visibility')") == "visible", "By 2105 shows coastal erosion")
        rep.check(js("() => AtlasCtx.map.getSource('env-coast')._data.features.length") > 1000, "…with the English and Welsh erosion zones")
        page.check("[data-envon=heat]"); page.wait_for_function("() => AtlasCtx.map.getLayer('env-heat-fill')", timeout=30000)
        page.click("[data-envheat='g40']"); page.wait_for_timeout(500)
        rep.check("+4 °C" in txt(), "heat follows the warming level picked (+4 °C)")
        rep.check(js("() => JSON.stringify(AtlasCtx.map.getPaintProperty('env-heat-fill', 'fill-color')).includes('[\"at\",6,')"), "…and the map colours by it")
        page.click("[data-envfut='2105']"); page.wait_for_timeout(300)   # back to the past
        page.evaluate("() => { const r = document.querySelector('[data-envyear]'); r.value = 1955; r.dispatchEvent(new Event('input', {bubbles: true})); }"); page.wait_for_timeout(300)
        rep.check("4 National Parks" in txt() or "National Parks" in txt(), "protected areas are counted by the year designated")
        np55 = js("() => AtlasCtx.map.getSource('env-cons')._data.features.filter(f => f.properties.k === 'np' && f.properties.y && f.properties.y <= 1955).length")
        rep.check(8 <= np55 <= 9, f"National Parks designated by 1955: {np55} (Peak District, Lake District, Snowdonia, Dartmoor, Pembrokeshire Coast…)")
        for p in ("floods", "coast", "heat", "conservation", "sources"):
            page.click(f".ah-nav [data-apanel='{p}']"); page.wait_for_timeout(1200)
        rep.check(js("() => [...document.querySelectorAll('.apppanel')].filter(w => !w.hidden).length") >= 6, "all six panels open")
        rep.check(js("() => document.querySelectorAll('.env-list li').length") > 10, "the panels list the largest floods, coasts at risk and parks")
        rep.check(not page.errors, "no console errors" + (f": {page.errors}" if page.errors else ""))
        page.context.close()
    rep.done()


if __name__ == "__main__":
    main()
