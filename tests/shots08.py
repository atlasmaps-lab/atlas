"""
Screenshots of Atlas 0.8's new screens at the four test sizes (no basemap: tests run without a MapTiler key).
    python tests/shots08.py        -> docs/screenshots/0.8/<scene>-<w>x<h>.jpg
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from atlas_test import ROOT, SIZES, server, browser, open_atlas

OUT = os.path.join(ROOT, "docs", "screenshots", "0.8"); os.makedirs(OUT, exist_ok=True)
SCENES = [
    ("economic-indicators", "debug#app=economic", ""),
    ("economic-forecasts", "debug#app=economic", "document.querySelector('#apphead [data-apanel=forecasts]').click()"),
    ("politics-money", "debug#app=politics", "document.querySelector('#apphead [data-apanel=money]').click(); setTimeout(() => AtlasMoney.openMP(Object.keys(AtlasMoney.data.mps).find(k => AtlasMoney.data.mps[k].n === 'Robert Jenrick')), 500)"),
    ("transport-hubs", "debug#app=transport", "document.querySelector('#apphead [data-apanel=hubs]').click()"),
    ("social-feed", "debug#app=social", "atlasMap.jumpTo({ center: [-0.12, 51.51], zoom: 10 })"),
    ("health-spine", "debug#app=health", "AtlasCtx.focus('E06000002'); setTimeout(() => document.querySelector('#apphead [data-apanel=spine]').click(), 900)"),
    ("map-symbols", "debug", "atlasMap.jumpTo({ center: [-0.3, 51.5], zoom: 8.6 }); setTimeout(() => AtlasDebug.openPoiCard('ap-heathrow'), 600)"),
]


def main():
    with server() as base, browser() as b:
        for name, q, js in SCENES:
            for w, h in SIZES:
                page = open_atlas(b, base, (w, h), query=q); page.wait_for_timeout(1500)
                if js: page.evaluate("() => { " + js + " }"); page.wait_for_timeout(2500)
                p = os.path.join(OUT, f"{name}-{w}x{h}.jpg"); page.screenshot(path=p, type="jpeg", quality=78)
                print(p.replace(ROOT + "/", ""), "(console errors: %s)" % (page.errors[:2] if page.errors else "none"))
                page.context.close()


if __name__ == "__main__":
    main()
