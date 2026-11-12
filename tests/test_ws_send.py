"""
Atlas 0.10.1: charts and tables under the header tabs go to the workspace.   python tests/test_ws_send.py

Each chart and table in a header panel has a "To workspace" button; it sends a copy as a card titled with the panel
and the section it sits under. Small sparklines (in indicator tiles) don't get one.
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from atlas_test import server, browser, open_atlas, Report, open_panel


def main():
    rep = Report("to workspace")
    with server() as base, browser() as b:
        page = open_atlas(b, base, (1440, 900), query="debug#app=economic"); js = page.evaluate
        page.wait_for_timeout(2500)
        n0 = js("() => AtlasDebug.WS ? AtlasDebug.WS().items.length : (JSON.parse(localStorage.getItem('atlas-16-ws') || '{}').projects || [{items: []}])[0].items.length")
        open_panel(page, "regions"); page.wait_for_timeout(1800)
        btns = js("() => document.querySelectorAll('.apppanel:not([hidden]) .ws-send').length")
        rep.check(btns >= 2, f"Regions: each chart has a To workspace button ({btns})")
        page.click(".apppanel:not([hidden]) .ws-send"); page.wait_for_timeout(600)
        ws = js("() => JSON.parse(localStorage.getItem('atlas-16-ws') || 'null')")
        items = [it for p in (ws or {}).get("projects", []) for it in p.get("items", [])] if ws else []
        last = items[-1] if items else {}
        rep.check(len(items) > 0 and last.get("type") == "card" and "<svg" in last.get("html", ""), f"…and sends the chart as a card ({last.get('title')})")
        rep.check("Regions" in (last.get("title") or ""), "…titled with the panel it came from")
        open_panel(page, "indicators"); page.wait_for_timeout(1500)
        spark = js("() => document.querySelectorAll('.apppanel:not([hidden]) .ec-tile + .ws-send, .apppanel:not([hidden]) .ec-tile .ws-send').length")
        rep.check(spark == 0, "indicator tiles' sparklines don't get a button")
        open_panel(page, "forecasts"); page.wait_for_timeout(1500)
        t = js("() => document.querySelectorAll('.apppanel:not([hidden]) .ws-send').length")
        rep.check(t >= 1, f"Forecasts: tables have a To workspace button ({t})")
        rep.check(not page.errors, "no console errors" + (f": {page.errors[:3]}" if page.errors else ""))
        page.context.close()
    rep.done()


if __name__ == "__main__":
    main()
