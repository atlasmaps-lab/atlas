"""
Atlas 0.8: the specialists' views.   python tests/test_perspectives.py

Economic: indicator tiles, forecasts against outturn, rates (also in Markets), the release calendar. Health: the spine
chart against England and inequality by deprivation decile. Social: deprivation by domain. The IMD metrics work.
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from atlas_test import server, browser, open_atlas, Report, open_panel


def visible_text(js):
    return js("() => [...document.querySelectorAll('.fwin')].filter(w => !w.hidden).map(w => w.textContent).join(' ')")


def main():
    rep = Report("perspectives")
    with server() as base, browser() as b:
        page = open_atlas(b, base, (1440, 900), query="debug#app=economic"); js = page.evaluate; page.wait_for_timeout(1500)
        n = js("() => document.querySelectorAll('.ec-tile').length")
        rep.check(n >= 14, f"Atlas Economic opens on the indicators ({n} tiles)")
        t = visible_text(js)
        rep.check("CPI inflation" in t and "Unemployment" in t and "next" in t, "tiles show inflation, unemployment and the next release")
        page.click(".ec-tile[data-ecchart=cpi]"); page.wait_for_timeout(500)
        rep.check(js("() => [...document.querySelectorAll('.fwin')].some(w => !w.hidden && /CPI inflation/.test(w.textContent) && w.querySelector('svg path'))"), "a tile opens its chart")
        open_panel(page, "forecasts"); page.wait_for_timeout(600)
        t = visible_text(js)
        rep.check("Median" in t and "OBR" in t and "GDP" in t, "Forecasts lists the consensus and the OBR")
        open_panel(page, "calendar"); page.wait_for_timeout(500)
        rep.check("Next updates" in visible_text(js), "the release calendar lists the next updates")
        open_panel(page, "rates"); page.wait_for_timeout(500)
        rep.check("10-year gilt yield" in visible_text(js), "Rates & sterling shows gilt yields")
        rep.check(not page.errors, "Atlas Economic: no console errors" + (f": {page.errors[:3]}" if page.errors else ""))
        v = js("() => AtlasDebug.M.imd_decile.get('E06000002', AtlasDebug.state.date)")
        rep.check(v and v["v"] == 1, f"Middlesbrough is in deprivation decile 1 ({v and v['text']})")
        v = js("() => AtlasDebug.M.imd_decile.get('W06000015', AtlasDebug.state.date)")
        rep.check(v and v["v"] is None, "Wales isn't given an English deprivation decile")
        page.context.close()

        page = open_atlas(b, base, (1440, 900), query="debug#app=health"); js = page.evaluate; page.wait_for_timeout(1500)
        js("() => AtlasCtx.focus('E06000002')"); page.wait_for_timeout(1200)
        open_panel(page, "spine"); page.wait_for_timeout(700)
        k = js("() => [...document.querySelectorAll('.fwin')].filter(w => !w.hidden && /against England/.test(w.textContent)).map(w => w.querySelectorAll('svg circle').length)[0] || 0")
        rep.check(k >= 8, f"the spine chart places the council on each indicator ({k})")
        open_panel(page, "inequality"); page.wait_for_timeout(700)
        rep.check("Gap between the least and most deprived" in visible_text(js), "Inequality shows the gap between deprivation deciles")
        rep.check(not page.errors, "Atlas Health: no console errors" + (f": {page.errors[:3]}" if page.errors else ""))
        page.context.close()

        page = open_atlas(b, base, (1440, 900), query="debug#app=social"); js = page.evaluate; page.wait_for_timeout(1500)
        js("() => AtlasCtx.focus('E08000003')"); page.wait_for_timeout(1200)
        open_panel(page, "deprivation"); page.wait_for_timeout(700)
        rep.check("Income" in visible_text(js) and "Decile" in visible_text(js), "Social: deprivation by domain for Manchester")
        rep.check(not page.errors, "Atlas Social: no console errors" + (f": {page.errors[:3]}" if page.errors else ""))
        page.context.close()

        page = open_atlas(b, base, (1440, 900), query="debug#app=markets"); js = page.evaluate; page.wait_for_timeout(1500)
        open_panel(page, "rates"); page.wait_for_timeout(500)
        rep.check("Bank Rate" in visible_text(js), "Atlas Markets has Rates & sterling too")
        open_panel(page, "money"); page.wait_for_timeout(500)
        rep.check(js("() => document.querySelectorAll('.fwin:not([hidden]) [data-modonor]').length") > 10, "Atlas Markets lists company political donors")
        rep.check(not page.errors, "Atlas Markets: no console errors" + (f": {page.errors[:3]}" if page.errors else ""))
        page.context.close()
    rep.done()


if __name__ == "__main__":
    main()
