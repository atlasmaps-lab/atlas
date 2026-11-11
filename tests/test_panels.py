"""
Atlas 0.10: editorial panels.   python tests/test_panels.py

Every data panel opened from an app's header gets the editorial layout: a kicker (app · panel), a headline (the story's
first sentence, or the panel's description), its figures in a ruled row, section heads, and the sources folded away.
Panels with a story (Trade, Investment, Income flows, Public spending, Migration, Housing & support, the dashboards and
profiles) lead with a finding. Forms (Social feed, post, messages, the marketplace) and tools stay as they are.
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from atlas_test import server, browser, open_atlas, Report

APPS = {"markets": ["trade", "investment", "income", "products", "partners"], "economic": ["spending", "dashboard", "industries", "indicators"],
        "social": ["migration", "support", "census"], "health": ["deaths"]}
STORY = {"trade", "investment", "income", "spending", "dashboard", "industries", "migration", "support", "census", "deaths"}


def main():
    rep = Report("panels")
    with server() as base, browser() as b:
        for app, panels in APPS.items():
            page = open_atlas(b, base, (1440, 900), query="debug#app=" + app); js = page.evaluate
            if app in ("economic", "social", "health"): js("() => AtlasDebug.focus('E08000025')"); page.wait_for_timeout(1200)
            for pid in panels:
                page.click(f"#appbar [data-apanel={pid}]"); page.wait_for_timeout(1200)
                r = js("""() => { const b = [...document.querySelectorAll('.apppanel:not([hidden]) .wm-body')].pop(); if (!b) return null;
                  return { ed: b.classList.contains('ed'), kick: (b.querySelector('.ed-kick') || {}).textContent || '', h: (b.querySelector('.ed-h') || {}).textContent || '', dek: (b.querySelector('.ed-dek') || {}).textContent || '', story: !!b.querySelector('.ed-story'), first: b.firstElementChild && b.firstElementChild.className }; }""")
                ok = r and r["ed"] and r["first"] == "ed-head" and " · " in r["kick"] and (r["h"] if pid in STORY else (r["h"] or r["dek"]))
                rep.check(bool(ok), f"{app} → {pid}: editorial head ({(r or {}).get('h') or (r or {}).get('dek', '')[:80]!r})")
            rep.check(not [e for e in page.errors if "favicon" not in e], f"{app}: no errors ({page.errors[:2]})")
        page = open_atlas(b, base, (1440, 900), query="debug#app=social"); js = page.evaluate
        page.click("#appbar [data-apanel=feed]"); page.wait_for_timeout(1000)
        rep.check(not js("() => [...document.querySelectorAll('.apppanel:not([hidden]) .wm-body')].pop().classList.contains('ed')"), "the Social feed (a form) keeps its own layout")
        page.click("#appbar [data-apanel=migration]"); page.wait_for_timeout(1000)
        rep.check(js("() => !![...document.querySelectorAll('.apppanel:not([hidden]) .wm-body')].pop().querySelector('details.ed-notes')"), "sources fold into “How to read this · Sources”")
    rep.done()


if __name__ == "__main__":
    main()
