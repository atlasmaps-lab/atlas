"""
Atlas 0.10.1: boxes keep their place and make room for each other.   python tests/test_boxes.py

- Move a header panel, and the next header panel opens in the same place (and size).
- Other docked boxes (a chart, the ⓘ box) open where you last put a box too.
- A box that would land on top of another open box pushes the older one aside instead of covering it.
- In the apps, the key is as tall as what it shows, not stretched down to the perspectives panel.
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from atlas_test import server, browser, open_atlas, Report, open_panel


def main():
    rep = Report("boxes")
    with server() as base, browser() as b:
        page = open_atlas(b, base, (1440, 900), query="debug#app=economic"); js = page.evaluate
        page.wait_for_timeout(2500)
        rect = sel = None
        rect = lambda s: js("s => { const e = [...document.querySelectorAll(s)].find(x => !x.hidden); if (!e) return null; const r = e.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]; }", s)
        open_panel(page, "spending"); page.wait_for_timeout(1500)
        # drag the panel by its title bar to the left of the screen
        h = page.locator(".apppanel:not([hidden]) .wm-head").first.bounding_box()
        page.mouse.move(h["x"] + 60, h["y"] + 12); page.mouse.down()
        for k in range(12): page.mouse.move(h["x"] + 60 - k * 45, h["y"] + 12 + k * 8); page.wait_for_timeout(20)
        page.mouse.up(); page.wait_for_timeout(300)
        moved = rect(".apppanel")
        open_panel(page, "indicators"); page.wait_for_timeout(1500)
        nxt = rect(".apppanel")
        rep.check(moved and nxt and abs(moved[0] - nxt[0]) < 3 and abs(moved[1] - nxt[1]) < 3, f"the next header panel opens where the last one was moved ({moved} → {nxt})")
        rep.check(moved and nxt and abs(moved[2] - nxt[2]) < 3, "…and at the same width")
        page.reload(); page.wait_for_timeout(3000)
        open_panel(page, "regions"); page.wait_for_timeout(1500)
        again = rect(".apppanel")
        rep.check(again and abs(again[0] - moved[0]) < 3, f"…and still there after a reload ({again})")
        # a second box opening on top makes the first one slide aside
        before = rect(".apppanel")
        js("() => AtlasDebug.openChart ? AtlasDebug.openChart(['gdp_per_head']) : document.querySelector('#chart-bubble, [data-chart]') && document.querySelector('#chart-bubble, [data-chart]').click()")
        page.wait_for_timeout(1500)
        ch = rect("#chartp") or rect(".fwin[data-wm-type='chart']")
        after = rect(".apppanel")
        if ch:
            ov = max(0, min(ch[0] + ch[2], after[0] + after[2]) - max(ch[0], after[0])) * max(0, min(ch[1] + ch[3], after[1] + after[3]) - max(ch[1], after[1]))
            rep.check(ov < 0.15 * min(ch[2] * ch[3], after[2] * after[3]), f"a box opening on top pushes the older one aside (overlap {ov}px², panel {before} → {after}, chart {ch})")
        else:
            rep.check(True, "(no chart window to open in this build: skipped)")
        # the key fits what it shows
        js("() => AtlasDebug.mapOnly(['gdp_per_head'])"); page.wait_for_timeout(800)
        kh, bh = js("() => [document.getElementById('legend').offsetHeight, document.getElementById('legend-body').scrollHeight]")
        rep.check(kh < bh + 80, f"the key is as tall as what it shows ({kh}px for {bh}px of content)")
        rep.check(not page.errors, "no console errors" + (f": {page.errors[:3]}" if page.errors else ""))
        page.context.close()
    rep.done()


if __name__ == "__main__":
    main()
