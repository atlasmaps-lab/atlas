"""
Atlas views: each view lives in its own folder (views/<id>/) and stays out of the others.   python tests/test_views.py

Every view in views/views.js registers in Atlas Multi; each view opens in its own tab with its own panels; a view's
view.css loads only in that view's tab (never in Multi or another view); no console errors anywhere.
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from atlas_test import server, browser, open_atlas, Report


def main():
    rep = Report("views")
    with server() as base, browser() as b:
        page = open_atlas(b, base, (1280, 800))
        js = page.evaluate
        views = js("() => Object.keys(window.ATLAS_VIEWS || {})")
        rep.check(len(views) >= 5, f"views/views.js lists the views ({', '.join(views)})")
        reg = js("() => AtlasApps.list().map(a => a.id)")
        rep.check(all(v in reg for v in views), "every listed view registers itself in Atlas Multi")
        rep.check(js("() => document.querySelectorAll('link[data-view]').length") == 0, "Atlas Multi loads no view's own styles")
        rep.check(not page.errors, "Atlas Multi: no console errors" + (f" ({page.errors[:2]})" if page.errors else ""))
        page.context.close()
        for v in views:
            page = open_atlas(b, base, (1280, 800), query="debug#app=" + v)
            js = page.evaluate; page.wait_for_timeout(800)
            links = js("() => [...document.querySelectorAll('link[data-view]')].map(l => l.dataset.view)")
            rep.check(links and all(x == v for x in links), f"{v}: only its own view.css is loaded ({links})")
            rep.check(js("() => document.body.classList.contains('appmode') && document.querySelectorAll('#appbar [data-apanel]').length > 0"), f"{v}: opens as its own view with its panels")
            rep.check(not page.errors, f"{v}: no console errors" + (f" ({page.errors[:2]})" if page.errors else ""))
            page.context.close()
    rep.done()


if __name__ == "__main__":
    main()
