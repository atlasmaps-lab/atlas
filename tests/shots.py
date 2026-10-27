"""
Screenshots of Atlas at the four test sizes, for pull requests (Atlas 1.8):

    python tests/shots.py <name> [scene ...]

saves docs/screenshots/1.8/<name>-<scene>-<width>x<height>.jpg and prints any console errors.
Scenes: start (default), compare (two places in Compare), analyse (Analyse opened from Compare), chart (the chart panel),
timebar (GDP on the map), availability (a metric greyed before its data starts), protests (protests on the map, zoomed to London), declutter (the default screen).
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from atlas_test import ROOT, SIZES, server, browser, open_atlas

OUT = os.path.join(ROOT, "docs", "screenshots", "1.8")

SCENES = {
    "start": "",
    "declutter": "",
    "compare": """
        const D = AtlasDebug; D.select(['E06000023','E08000025','E06000043']); D.setCmpMetrics(['population','gdp_per_head','control']); D.openCmp();
        document.querySelector('#cmp [data-fmax]').click(); document.querySelector('#cmp [data-kmk=chart]').click(); document.querySelector('#cmp [data-kdraw]').click();""",
    "analyse": """
        const D = AtlasDebug; D.select(['E06000023','E08000025','E06000043']); D.openCmp();
        document.querySelector('#cmp [data-can]') && document.querySelector('#cmp [data-can]').click();""",
    "chart": "document.getElementById('chart-bubble').click();",
    "help": "document.getElementById('open-help').click();",
    "info": "AtlasDebug.mapOnly(['gdp_per_head']); setTimeout(() => document.querySelector(\"#legend [data-info='gdp_per_head']\").click(), 300);",
    "availability": """AtlasDebug.mapOnly(['control']); AtlasDebug.setDate('1990-06-01');
        document.querySelector('#dock [data-open=economic]').click(); document.querySelector('#dock [data-group="Output & growth"]').click();""",
    "timebar": "AtlasDebug.mapOnly && AtlasDebug.mapOnly(['gdp_per_head']);",
    "protests": "AtlasDebug.mapOnly && AtlasDebug.mapOnly(['protest_events']); atlasMap.jumpTo({center:[-0.12,51.5], zoom: 9.5});",
}


def main():
    name = sys.argv[1] if len(sys.argv) > 1 else "shot"
    scenes = sys.argv[2:] or ["start"]
    os.makedirs(OUT, exist_ok=True)
    with server() as base, browser() as b:
        for w, h in SIZES:
            for sc in scenes:
                page = open_atlas(b, base, (w, h))
                try:
                    if SCENES.get(sc):
                        page.evaluate("() => { %s }" % SCENES[sc])
                        page.wait_for_timeout(1500)
                    path = os.path.join(OUT, f"{name}-{sc}-{w}x{h}.jpg")
                    page.screenshot(path=path, type="jpeg", quality=80)
                    print(f"{os.path.relpath(path, ROOT)}" + (f"  console errors: {page.errors}" if page.errors else "  (no console errors)"))
                finally:
                    page.context.close()


if __name__ == "__main__":
    main()
