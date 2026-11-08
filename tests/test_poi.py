"""
Atlas 0.8: places as map symbols (airports, ports, railway stations, financial sites).   python tests/test_poi.py
"""
import os, sys, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from atlas_test import server, browser, open_atlas, Report, ROOT


def main():
    rep = Report("map symbols")
    s = open(os.path.join(ROOT, "data", "places_poi.js"), encoding="utf-8").read()
    D = json.loads(s[s.index("{"):s.rindex("}") + 1]); items = D["items"]
    kinds = {k: sum(1 for i in items if i["k"] == k) for k in ("airport", "port", "station", "finance")}
    rep.check(kinds["airport"] >= 30 and kinds["port"] >= 40 and kinds["station"] >= 2400 and kinds["finance"] >= 5, f"the data has every kind ({kinds})")
    by = {i["n"]: i for i in items}
    hx = by.get("Heathrow Airport")
    rep.check(hx and hx["rank"] == 1 and hx["minz"] <= 5, "Heathrow is the busiest airport and shows from the opening view")
    lb = by.get("London Bridge")
    rep.check(lb and lb["minz"] <= 7.5 and abs(lb["lon"] + 0.086) < 0.01, "London Bridge is in the right place and shows early")
    small = [i for i in items if i["k"] == "station" and i["v"] < 2e5]
    rep.check(small and all(i["minz"] >= 12 for i in small), "small stations only show close in")
    nw = by.get("Newport (South Wales)")
    rep.check(nw and nw["lon"] < -2.9, "same-named stations are told apart (Newport, South Wales is in Wales)")
    rep.check(all(i.get("c") for i in items), "every symbol is filed under a council")
    with server() as base, browser() as b:
        page = open_atlas(b, base, (1440, 900)); js = page.evaluate
        n = js("() => atlasMap.getSource('poi') && atlasMap.getSource('poi')._data.features.length")
        rep.check(n == len(items), f"the map has a symbol for every place ({n})")
        rep.check(js("() => !!atlasMap.getLayer('poi-sym') && atlasMap.hasImage('poi-airport') && atlasMap.hasImage('poi-station')"), "the symbol layer and its icons are loaded")
        js("() => AtlasDebug.openPoiCard('%s')" % hx["id"]); page.wait_for_timeout(400)
        txt = js("() => [...document.querySelectorAll('.fwin')].filter(w => !w.hidden).map(w => w.textContent).join(' ')")
        rep.check("Heathrow" in txt and "million" in txt and "busiest UK airport" in txt, "Heathrow's card shows its passengers and rank")
        js("() => AtlasDebug.openPoiCard('%s')" % lb["id"]); page.wait_for_timeout(400)
        rep.check(js("() => !!document.querySelector('.poi-card svg.spark')"), "a station card has a trend line (airport cards lead with live boards and delays instead)")
        page.click("#search"); page.keyboard.type("gatwick"); page.wait_for_timeout(400)
        rep.check(js("() => !!document.querySelector('#hits li[data-poi]')"), "search finds airports")
        page.dispatch_event("#hits li[data-poi]", "mousedown"); page.wait_for_timeout(600)
        rep.check(js("() => [...document.querySelectorAll('.fwin')].some(w => !w.hidden && /Gatwick/.test(w.textContent))"), "choosing it opens its card")
        rep.check(not page.errors, "no console errors" + (f": {page.errors[:3]}" if page.errors else ""))
        page.context.close()
    rep.done()


if __name__ == "__main__":
    main()
