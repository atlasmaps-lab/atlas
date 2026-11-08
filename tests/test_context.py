"""
Atlas 0.8: written context beside the numbers.   python tests/test_context.py

Cards show the newest line about each metric on them; ⓘ lists recent context and what's coming; a chart lists what
was published about the metrics it shows. Lines come from data/context.js (pipeline/fetch_context.py).
"""
import os, sys, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from atlas_test import server, browser, open_atlas, Report, ROOT


def main():
    rep = Report("context")
    s = open(os.path.join(ROOT, "data", "context.js"), encoding="utf-8").read()
    D = json.loads(s[s.index("{"):s.rindex("}") + 1])
    gdp = [i for i in D["items"] if "gdp" in i.get("m", [])]
    rep.check(len(gdp) >= 1, f"the context file has items about GDP ({len(gdp)})")
    rep.check(all(i["u"].startswith("http") and i["s"] for i in D["items"]), "every item has a source and a link")
    with server() as base, browser() as b:
        page = open_atlas(b, base, (1440, 900)); js = page.evaluate
        n = js("() => AtlasDebug.contextFor('gdp', 'E06000001', 3).length")
        rep.check(n >= 1, f"Atlas finds GDP context for a council ({n})")
        js("() => { AtlasCtx.mapAdd('gdp'); }"); page.wait_for_timeout(600)
        js("() => AtlasCtx.focus('E08000025')"); page.wait_for_timeout(1500)
        rep.check(js("() => !!document.querySelector('#card .cx-list li')"), "the pinned card shows context beside GDP")
        js("() => AtlasCtx.openInfo('gdp')"); page.wait_for_timeout(500)
        rep.check(js("() => [...document.querySelectorAll('.fwin')].some(w => !w.hidden && /Recent context/.test(w.textContent))"), "ⓘ for GDP lists recent context")
        js("() => AtlasCtx.openChart({ metrics: ['gdp'], places: ['E08000025'], style: 'line' })"); page.wait_for_timeout(1200)
        rep.check(js("() => !!document.querySelector('#cp-body .cx-chart li')"), "a GDP chart lists what was published about it")
        rep.check(not page.errors, "no console errors" + (f": {page.errors[:3]}" if page.errors else ""))
        page.context.close()
    rep.done()


if __name__ == "__main__":
    main()
