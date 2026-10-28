"""
Atlas 1.8: the features from earlier versions still work.   python tests/test_smoke.py

Perspectives and overlays, the key, the time bar, focus and cards, Compare, Analyse, Export, the chart panel and chart
tabs, the workspace, the 1.7 election data and the hex map. Every step must leave the console free of errors.
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from atlas_test import server, browser, open_atlas, Report


def main():
    rep = Report("smoke")
    with server() as base, browser() as b:
        page = open_atlas(b, base, (1280, 800))
        js = page.evaluate
        js("() => AtlasDebug.mapOnly(['control', 'gdp_per_head'])"); page.wait_for_timeout(300)
        rep.check(js("() => document.querySelectorAll('#legend .lg').length") >= 1, "two metrics on the map: the key shows them")
        js("() => AtlasDebug.setDate('2010-06-01')"); page.wait_for_timeout(300)
        rep.check(js("() => AtlasDebug.state.date") == "2010-06-01", "the time bar moves to 2010")
        js("() => { AtlasDebug.focus('E06000023'); }"); page.wait_for_timeout(1500)
        rep.check(js("() => !document.getElementById('card').hidden && /Bristol/.test(document.getElementById('card').textContent)"), "focusing Bristol pins its card")
        js("() => AtlasDebug.mapOnly(['ge_winner', 'ge_turnout'])"); page.wait_for_timeout(300)
        rep.check(js("() => { const r = AtlasDebug.resultFor('K02000001', '2024-07-05'); return !!r && r.n === 650; }"), "the 1.7 election data: 650 seats in 2024")
        js("() => AtlasDebug.unfocus()")
        page.click("#brand"); page.click("#open-export"); page.wait_for_timeout(300)
        rep.check(page.is_visible("#export-dlg .cmp-page"), "Export opens")
        page.keyboard.press("Escape"); page.keyboard.press("Escape"); page.wait_for_timeout(200)
        rep.check(page.is_hidden("#export-dlg"), "Esc closes Export")
        page.click("#chart-bubble"); page.wait_for_timeout(300)
        page.click("#chartp [data-cdraw]"); page.wait_for_timeout(300)
        rep.check(js("() => !!document.querySelector('#cp-body svg')"), "the chart panel draws a chart")
        page.click("#chartp [data-cpws]"); page.wait_for_timeout(200)
        page.click("#chartp [data-cptab]"); page.wait_for_timeout(500)
        rep.check(js("() => !document.getElementById('tabview').hidden && !!document.querySelector('#tabview svg')"), "the chart opens in its own tab")
        page.click("#tabview [data-tback]"); page.wait_for_timeout(200)
        page.click("#tabs [data-tab='ws']"); page.wait_for_timeout(600)
        rep.check(js("() => document.querySelectorAll('#ws .wsi').length") >= 1, "the workspace holds the chart that was sent")
        page.click("#ws [data-view='map']"); page.wait_for_timeout(300)
        js("() => { AtlasDebug.select(['E06000023', 'E08000025']); AtlasDebug.openCmp(); }"); page.wait_for_timeout(300)
        rep.check(js("() => document.querySelectorAll('#cmp table.cmp tbody tr').length") == 2, "Compare shows a table of the two places")
        page.click("#cmp [data-can]"); page.wait_for_timeout(600)
        rep.check(page.is_visible("#analyse .an-res"), "Analyse opens from Compare")
        js("() => { AtlasDebug.closeAll && AtlasDebug.closeAll(); }")
        js("() => { AtlasDebug.setHex(true); }"); page.wait_for_timeout(1200)
        rep.check(js("() => document.body.classList.contains('hexmode')"), "the hex map turns on")
        js("() => { AtlasDebug.setHex(false); }"); page.wait_for_timeout(600)
        rep.check(not page.errors, "no console errors" + (f": {page.errors}" if page.errors else ""))
        js("() => { for (const k of Object.keys(localStorage)) if (k.startsWith('atlas-16-ws')) localStorage.removeItem(k); }")
        page.context.close()
    rep.done()


if __name__ == "__main__":
    main()
