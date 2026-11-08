"""
Atlas 0.8: the map's look.   python tests/test_maplook.py

Dark mode picks the basemap's dark palette; area names appear by size (bigger areas at lower zoom); Atlas always opens in
Automatic zoom; the time bar is shorter; Stats for nerds opens Analyse; News shows only when there's news for what's on
screen. (Basemap pixels themselves are checked by eye: tests run without a MapTiler key.)
"""
import os, sys, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from atlas_test import server, browser, open_atlas, Report, ROOT


def news_place():
    s = open(os.path.join(ROOT, "data", "news.js"), encoding="utf-8").read()
    items = json.loads(s[s.index("{"):s.rindex("}") + 1])["items"]
    counts = {}
    for it in items:
        for c in it["pl"]:
            counts[c] = counts.get(c, 0) + 1
    return max(counts, key=counts.get) if counts else None


def main():
    rep = Report("map look")
    with server() as base, browser() as b:
        page = open_atlas(b, base, (1440, 900)); js = page.evaluate
        rep.check(js("() => AtlasDebug.paletteKey()") == "light", "light mode uses the light basemap palette")
        page.click("#brand"); page.click("#mode [data-mode=dark]"); page.wait_for_timeout(200)
        rep.check(js("() => AtlasDebug.paletteKey()") == "dark", "dark mode uses the dark basemap palette (the map darkens too)")
        page.keyboard.press("Escape")

        z = js("() => [1e5, 3500, 300, 15, 1].map(a => AtlasDebug.nameMinZoom(a))")
        rep.check(all(z[i] < z[i + 1] for i in range(len(z) - 1)), f"a name's first zoom rises as the area shrinks ({z})")
        cz = js("""() => { const f = AtlasDebug.nameFeatures('council'); const by = n => (f.find(x => x.properties.name === n) || {}).properties;
            return [by('Cornwall'), by('City of London')].map(p => p && p.minz); }""")
        rep.check(cz[0] is not None and cz[1] is not None and cz[0] < 7 and cz[1] > 9, f"Cornwall's name shows at county zoom, the City of London's only close in ({cz})")
        nn = js("() => AtlasDebug.nameFeatures('nation').every(f => f.properties.minz === 0)")
        rep.check(nn, "nation names show from the start")

        js("() => AtlasDebug.setLevel('council')"); page.wait_for_timeout(300)
        rep.check(js("() => AtlasDebug.LV.auto") is False, "a boundary set can still be picked by hand")
        page.reload(wait_until="load"); page.wait_for_function("window.AtlasDebug && window.atlasMap.getSource && window.atlasMap.getSource('councils')"); page.wait_for_timeout(800)
        rep.check(js("() => AtlasDebug.LV.auto") is True, "Atlas opens in Automatic zoom again after a reload")

        w = js("() => document.getElementById('timebar').getBoundingClientRect().width")
        rep.check(w <= 462, f"the time bar is shorter ({round(w)} px, at most 460)")

        page.click("#nerd-bubble"); page.wait_for_timeout(400)
        rep.check(js("() => !!document.querySelector('.fwin:not([hidden]) .an, #an:not([hidden]), [data-wm-type=analyse]:not([hidden])') || [...document.querySelectorAll('.fwin')].some(w => !w.hidden && /Stats|Analyse/i.test(w.textContent))"), "Stats for nerds opens Analyse")
        page.keyboard.press("Escape")

        js("() => { const PS = AtlasDebug.PS; Object.keys(PS.mapped).forEach(p => { PS.mapped[p] = []; PS.on[p] = false; }); AtlasDebug.repaint(); }"); page.wait_for_timeout(500)
        rep.check(js("() => document.getElementById('news-bubble').hidden"), "News is hidden when nothing on screen has news (nothing mapped, nothing focused)")
        code = news_place()
        if code:
            js(f"() => AtlasCtx.focus('{code}')"); page.wait_for_timeout(1500)
            rep.check(not js("() => document.getElementById('news-bubble').hidden"), f"News appears once a place with news is focused ({code})")
            page.click("#news-bubble"); page.wait_for_timeout(400)
            n = js("() => document.querySelectorAll('.nw2-list li').length")
            rep.check(n > 0, f"the News window lists items about it ({n})")
        rep.check(not page.errors, "no console errors" + (f": {page.errors[:3]}" if page.errors else ""))
        page.context.close()
    rep.done()


if __name__ == "__main__":
    main()
