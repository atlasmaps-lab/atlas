"""
Atlas 0.12: panels open on a Summary; every other section folds away.   python tests/test_sections.py

The black bar under the masthead is the Summary (headline, story, big figures), open when a panel opens. Every other
section (Growth, Prices, …) is a closed bar that opens on click and stays open while the panel redraws. Definitions and
caveats sit in "How to read this · Sources"; "What it tells us" appears only when it's built from the figures.
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from atlas_test import server, browser, open_atlas, Report, open_panel


def main():
    rep = Report("sections")
    with server() as base, browser() as b:
        page = open_atlas(b, base, (1440, 900), query="debug#app=economic", sections_open=False); js = page.evaluate
        page.wait_for_timeout(1500)
        open_panel(page, "indicators"); page.wait_for_timeout(1200)
        B = "[...document.querySelectorAll('.apppanel')].find(w => !w.hidden && w.querySelector('.ed-ptl') && /Indicators/.test(w.querySelector('.ed-ptl').textContent)).querySelector('.wm-body')"
        st = js(f"() => {{ const b = {B}; return [...b.querySelectorAll(':scope > details.ed-sec')].map(d => [d.classList.contains('ed-summary') ? 'Summary' : d.dataset.sec, d.open]); }}")
        rep.check(st and st[0] == ["Summary", True], f"the first bar is Summary, open ({st[:2]})")
        rep.check(len(st) >= 5 and all(not o for _, o in st[1:]), f"every other section starts folded ({[n for n, _ in st]})")
        rep.check(js(f"() => /Summary/.test({B}.querySelector('.ed-summary > summary').textContent)"), "the bar says Summary, not the panel's name")
        t = js(f"() => {B}.querySelector('.ed-summary').innerText")
        rep.check("How far to trust it" not in t, "no 'How far to trust it'")
        rep.check("What it tells us" not in t or any(ch.isdigit() for ch in t.split("What it tells us")[1][:200]), "'What it tells us' only with figures from the data")
        rep.check(js(f"() => /revised|Labour Force Survey/.test({B}.querySelector('.ed-notes').textContent)"), "the caveats are in How to read this · Sources")
        page.click(".apppanel:not([hidden]) details.ed-sec[data-sec='Prices'] > summary"); page.wait_for_timeout(400)
        rep.check(js(f"() => {B}.querySelector(\"details.ed-sec[data-sec='Prices']\").open"), "a section opens on click")
        js("() => AtlasCtx.setDate('2023-06-01')"); page.wait_for_timeout(800); js("() => AtlasCtx.setDate(AtlasCtx.today)"); page.wait_for_timeout(800)
        rep.check(js(f"() => {{ const d = {B}.querySelector(\"details.ed-sec[data-sec='Prices']\"); return !!d && d.open; }}"), "…and stays open when the panel redraws")
        n0 = js("() => document.querySelectorAll('.pcwin:not([hidden])').length")
        js(f"() => {B}.querySelector(\"details.ed-sec[data-sec='Growth'] [data-edcard]\").click()"); page.wait_for_timeout(500)
        rep.check(js("() => document.querySelectorAll('.pcwin:not([hidden])').length") == n0 + 1 and not js(f"() => {B}.querySelector(\"details.ed-sec[data-sec='Growth']\").open"), "a folded section still opens as a card from its bar, without unfolding")
        rep.check(not [e for e in page.errors if "favicon" not in e], f"no errors ({page.errors[:2]})")
    rep.done()


if __name__ == "__main__":
    main()
