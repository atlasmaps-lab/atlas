"""
Atlas 0.9.2: the header tabs in every view.   python tests/test_tabs.py

Clicking a header tab opens that panel in place of the one before it (tabs, not a pile of windows) and, where the
panel says what it is about (its `map`), puts those metrics on the map at that boundary level.
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from atlas_test import server, browser, open_atlas, Report

VIEWS = ["politics", "economic", "social", "health", "markets", "transport", "environment"]


def main():
    rep = Report("header tabs")
    with server() as base, browser() as b:
        for v in VIEWS:
            page = open_atlas(b, base, (1440, 900), query="debug#app=" + v); js = page.evaluate
            page.wait_for_timeout(2500)
            specs = js("""() => AtlasCtx.app.panels.filter(p => p.map && typeof p.map === 'object').map(p => [p.id, p.map.metrics || [], p.map.level || null])""")
            checked = 0
            for pid, metrics, level in specs:
                page.click(f".ah-nav [data-apanel='{pid}']"); page.wait_for_timeout(1500)
                have = [m for m in metrics if js("id => !!AtlasCtx.M[id]", m)]
                on = [m for m in have if js("id => AtlasCtx.isMapped(id)", m)]
                rep.check(on == have, f"{v} → {pid}: {', '.join(have) or '(no metrics loaded)'} on the map")
                if level:
                    rep.check(js("() => AtlasCtx.level") == level, f"{v} → {pid}: {level} boundaries")
                checked += 1
            # tabs: after clicking two panels in turn, only the last one is open (tools excepted)
            ids = js("() => AtlasCtx.app.panels.map(p => p.id)")[:3]
            for pid in ids:
                page.click(f".ah-nav [data-apanel='{pid}']"); page.wait_for_timeout(900)
            n = js("() => [...document.querySelectorAll('.apppanel')].filter(w => !w.hidden).length")
            rep.check(n == 1, f"{v}: header tabs replace the window before them ({n} open)")
            rep.check(not page.errors, f"{v}: no console errors" + (f": {page.errors[:3]}" if page.errors else ""))
            page.context.close()
    rep.done()


if __name__ == "__main__":
    main()
