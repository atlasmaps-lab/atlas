"""
Atlas 1.8, Phase 3: protests on the map.   python tests/test_protests.py

Nearby protests group into numbered circles; protests on exactly the same point fan out when clicked; every protest opens
a card (several can be open, cascading); the list shows the protests in the window; the time bar shows where they happen.
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from atlas_test import server, browser, open_atlas, Report


def main():
    rep = Report("protests")
    with server() as base, browser() as b:
        page = open_atlas(b, base, (1440, 900))
        js = page.evaluate
        js("() => { AtlasDebug.PS.win = 99999; AtlasDebug.mapOnly(['protest_events']); }"); page.wait_for_timeout(1500)
        n = js("() => document.querySelectorAll('.prcl').length")
        rep.check(n >= 3, f"protests group into numbered circles at UK zoom ({n} groups)")
        rep.check(js("() => [...document.querySelectorAll('.prcl')].every(m => /\\d/.test(m.textContent) && m.querySelector('path,circle'))"), "each group shows its count and a ring of causes")
        z0 = js("() => atlasMap.getZoom()")
        js("() => { const m = [...document.querySelectorAll('.prcl')].sort((a, b) => +b.textContent - +a.textContent)[0]; m.click(); }"); page.wait_for_timeout(1200)
        rep.check(js("() => !document.getElementById('prpick').hidden && document.querySelectorAll('#prpick li[data-ppe]').length > 1"), "clicking a group lists its protests to pick from (0.7.1)")
        hasz = js("() => { const z = document.querySelector('#prpick [data-ppzoom]'); if (z) z.click(); return !!z; }"); page.wait_for_timeout(1500); page.wait_for_timeout(1500)
        z1 = js("() => atlasMap.getZoom()"); print("   zoom", z0, "->", z1, "button", hasz)
        rep.check(not hasz or z1 > z0, "“Zoom in” in the list zooms into the group (when the group can be split by zooming)")
        # the same point: many London events share one centre
        stack = js("""() => { const P = window.ATLAS_PROTESTS, by = {}; P.sites.forEach(s => { const k = s[1] + ',' + s[2]; (by[k] = by[k] || new Set()).add(s[0]); });
            const best = Object.entries(by).sort((a, b) => b[1].size - a[1].size)[0]; return [best[0], best[1].size]; }""")
        lat, lon = (float(x) for x in stack[0].split(","))
        js(f"() => atlasMap.jumpTo({{ center: [{lon}, {lat}], zoom: 15.5 }})"); page.wait_for_timeout(1500)
        pt = js(f"() => {{ const q = atlasMap.project([{lon}, {lat}]), r = atlasMap.getCanvas().getBoundingClientRect(); return [q.x + r.left, q.y + r.top]; }}")
        page.mouse.click(pt[0], pt[1]); page.wait_for_timeout(600)
        n = js("() => document.getElementById('prpick').hidden ? 0 : document.querySelectorAll('#prpick li[data-ppe]').length")
        rep.check(n >= 2, f"{stack[1]} protests on one point: clicking lists them to pick from ({n} in the list)")
        # pick one from the list: its card opens
        js("() => document.querySelector('#prpick li[data-ppe]').click()"); page.wait_for_timeout(500)
        rep.check(js("() => document.querySelectorAll('.wmwin[data-wm-type=protest]:not([hidden])').length") == 1, "clicking a protest opens its card")
        card = js("() => document.querySelector('.wmwin[data-wm-type=protest]:not([hidden])').textContent")
        rep.check("Read more on Wikipedia" in card, "the card links to Wikipedia")
        # a second card cascades instead of covering the first
        js("() => { const P = window.ATLAS_PROTESTS; AtlasDebug.openProtestCard(Math.max(0, P.events.findIndex(e => e.sum))); AtlasDebug.openProtestCard(P.events.length - 1); }"); page.wait_for_timeout(400)
        rects = js("() => [...document.querySelectorAll('.wmwin[data-wm-type=protest]:not([hidden])')].map(e => { const r = e.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top)]; })")
        rep.check(len(rects) >= 2 and len(set(map(tuple, rects))) == len(rects), f"several cards are open and cascade ({rects})")
        rep.check(js("() => !!document.querySelector('.wmwin[data-wm-type=protest] .psum')"), "cards carry the Wikipedia summary with attribution")
        js("() => document.querySelector('.wmwin[data-wm-type=protest]:not([hidden]) [data-pfit]').click()"); page.wait_for_timeout(300)
        rep.check(js("() => atlasMap.getSource('pr-hl')._data.features.length") >= 1, "“Show all sites” rings every site of the event")
        js("() => AtlasDebug.closeAll()")
        # the list, from the key
        js("() => atlasMap.jumpTo({ center: [-2.5, 54.3], zoom: 5 })"); page.wait_for_timeout(800)
        page.click("#legend [data-prlist]"); page.wait_for_timeout(400)
        rows = js("() => document.querySelectorAll('#prlist .prl li[data-pev]').length")
        rep.check(rows >= 5, f"the protest list shows the protests on the visible map ({rows})")
        page.hover("#prlist .prl li[data-pev]"); page.wait_for_timeout(200)
        rep.check(js("() => atlasMap.getSource('pr-hl')._data.features.length") >= 1, "hovering a row highlights its point")
        page.select_option("#prlist [data-prl=sort]", "size"); page.wait_for_timeout(200)
        rep.check(js("() => document.querySelectorAll('#prlist .prl li[data-pev]').length") == rows, "sorting by size keeps every row")
        page.click("#prlist .prl li[data-pev]"); page.wait_for_timeout(300)
        rep.check(js("() => document.querySelectorAll('.wmwin[data-wm-type=protest]:not([hidden])').length") >= 1, "clicking a row opens its card")
        ticks = js("() => document.querySelectorAll('#marks .tb-ev').length")
        rep.check(ticks >= 10, f"the time bar shows ticks where protests happen ({ticks})")
        js("() => AtlasDebug.setHeat && AtlasDebug.setHeat()"); page.wait_for_timeout(300)
        rep.check(js("() => atlasMap.getLayoutProperty('pr-heat', 'visibility')") == "visible", "the heat surface is still available")
        rep.check(not page.errors, "no console errors" + (f": {page.errors}" if page.errors else ""))
        page.context.close()
    rep.done()


if __name__ == "__main__":
    main()
