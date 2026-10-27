"""
Atlas 1.8, Phase 5: information behind ⓘ links, and the help centre.   python tests/test_help.py

ⓘ next to a metric opens an info card (definition, formula, unit, levels, years, source, caveats, related); the key's
labels and the chart picker have their own; ATLAS menu → Help opens a full-screen tab whose "needs" match the thresholds
Analyse uses; a greyed method links to it; a worked example loads into Analyse.
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from atlas_test import server, browser, open_atlas, Report


def main():
    rep = Report("help")
    with server() as base, browser() as b:
        page = open_atlas(b, base, (1440, 900))
        js = page.evaluate
        js("() => AtlasDebug.mapOnly(['gdp_per_head'])"); page.wait_for_timeout(300)
        page.click("#legend [data-info='gdp_per_head']"); page.wait_for_timeout(300)
        txt = js("() => document.querySelector('.wmwin[data-wm-type=info]:not([hidden])').textContent")
        for k in ("How it's worked out", "Unit", "Where it applies", "Years", "Source", "Caveats", "Related"):
            rep.check(k in txt, f"the GDP per head info card has “{k}”")
        rep.check("1998–2024" in txt, "it gives the years (1998–2024)")
        rep.check("ommut" in txt, "it carries the commuting caveat")
        page.click(".wmwin[data-wm-type=info] .linkish[data-info]"); page.wait_for_timeout(300)
        rep.check(js("() => document.querySelectorAll('.wmwin[data-wm-type=info]:not([hidden])').length") == 2, "a related metric opens a second info card")
        js("() => AtlasDebug.closeAll()")
        # the menu has an ⓘ per metric
        page.click("#dock [data-open='economic']"); page.click("#dock [data-group='Output & growth']"); page.wait_for_timeout(200)
        rep.check(js("() => document.querySelectorAll('#pmenu .crow [data-info]').length") >= 3, "every metric in the menu has an ⓘ")
        page.keyboard.press("Escape")
        # Help, from the ATLAS menu
        page.click("#brand"); page.click("#open-help"); page.wait_for_timeout(400)
        rep.check(js("() => !document.getElementById('tabview').hidden && !!document.getElementById('help-methods')"), "ATLAS menu → Help opens the help centre in a tab")
        n = js("() => document.querySelectorAll('#tabview .hsec').length")
        rep.check(n >= 14, f"every analysis method has a section ({n})")
        reg = js("() => document.getElementById('help-m-reg').textContent")
        rep.check("metrics + 10" in reg and "collinearity" in reg.lower(), "Regression states Atlas's minimum (metrics + 10) and the collinearity warning")
        rep.check("6 nearest neighbours" in js("() => document.getElementById('help-m-spatial').textContent"), "Moran's I says it compares 6 nearest neighbours")
        rep.check("yearly" in js("() => document.getElementById('help-m-lag').textContent").lower(), "Lag says it needs yearly data")
        rep.check("Gallagher" in js("() => document.getElementById('help-levels').textContent"), "Where metrics apply lists Gallagher (regions and nations only)")
        page.click("#tabview [data-hexample='reg']"); page.wait_for_timeout(800)
        r = js("() => [AtlasDebug.AN.method, AtlasDebug.AN.metrics.length, !document.getElementById('analyse').hidden]")
        rep.check(r[0] == "reg" and r[1] >= 3 and r[2], f"“Load this example” opens Analyse on regression with its metrics ({r})")
        # a greyed method's reason links to Help
        js("() => AtlasDebug.openAnalyse({ metrics: ['gdp_per_head', 'population'] })"); page.wait_for_timeout(400)
        js("() => document.querySelector('#analyse [data-anmethod=pca]').click()"); page.wait_for_timeout(200)   # aria-disabled: Playwright won't click it, a person can
        rep.check(js("() => /three numeric metrics: you have two/.test(document.getElementById('toast').textContent)"), "a greyed method says what it needs (“…you have two”)")
        page.click("#undo-btn"); page.wait_for_timeout(400)
        rep.check(js("() => !document.getElementById('tabview').hidden"), "…and links to its help section")
        # chart styles
        page.click("#tabview [data-tback]"); js("() => AtlasDebug.closeAll()"); page.click("#chart-bubble"); page.wait_for_timeout(300)
        page.click("#chartp [data-info='__charts']"); page.wait_for_timeout(300)
        rep.check("Not for" in js("() => document.querySelector('.wmwin[data-wm-type=info]:not([hidden])').textContent"), "the chart picker's ⓘ says what each style is for and not for")
        rep.check(not page.errors, "no console errors" + (f": {page.errors}" if page.errors else ""))
        page.context.close()
    rep.done()


if __name__ == "__main__":
    main()
