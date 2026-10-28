"""
Atlas 1.8, Phase 1: windows.   python tests/test_windows.py

Opening Analyse from Compare must put Analyse on top of Compare, visibly on screen; Esc closes only the top window;
default sizes leave the map usable; saved positions are clamped to the screen.
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from atlas_test import SIZES, server, browser, open_atlas, Report

VISIBLE = """el => { const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, z: +getComputedStyle(el).zIndex,
  onScreen: r.width > 100 && r.height > 100 && r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight } }"""


def main():
    rep = Report("windows")
    with server() as base, browser() as b:
        for w, h in SIZES:
            print(f"{w}x{h}")
            page = open_atlas(b, base, (w, h))
            page.evaluate("() => { AtlasDebug.select(['E06000023','E08000025','E06000043']); AtlasDebug.openCmp(); }")
            page.wait_for_timeout(300)
            page.click("#cmp [data-can]")   # "Analyse these metrics…", as a user would
            page.wait_for_timeout(500)
            cmp, an = page.eval_on_selector("#cmp", VISIBLE), page.eval_on_selector("#analyse", VISIBLE)
            rep.check(an["z"] > cmp["z"], f"Analyse (z {an['z']}) is above Compare (z {cmp['z']})")
            rep.check(an["onScreen"], f"Analyse's rectangle is on screen ({an['x']:.0f},{an['y']:.0f} {an['w']:.0f}×{an['h']:.0f})")
            # the top-most element at Analyse's centre belongs to Analyse
            hit = page.evaluate("() => { const r = document.getElementById('analyse').getBoundingClientRect(); const e = document.elementFromPoint(r.left + r.width / 2, r.top + 20); return !!e && !!e.closest('#analyse'); }")
            rep.check(hit, "Analyse is what you see at its own header (nothing covers it)")
            rep.check(page.is_visible("#analyse .wm-back"), "Analyse shows “← Back to Compare”")
            page.click("#analyse .wm-back"); page.wait_for_timeout(200)
            cmp2, an2 = page.eval_on_selector("#cmp", VISIBLE), page.eval_on_selector("#analyse", VISIBLE)
            rep.check(cmp2["z"] > an2["z"] and page.is_visible("#analyse"), "“Back to Compare” brings Compare to the front and leaves Analyse open")
            page.keyboard.press("Escape"); page.wait_for_timeout(150)
            rep.check(page.is_hidden("#cmp") and page.is_visible("#analyse"), "Esc closes only the top window (Compare)")
            page.keyboard.press("Escape"); page.wait_for_timeout(150)
            rep.check(page.is_hidden("#analyse"), "Esc again closes Analyse")
            # default size: docked right, at most 40% wide and 70% high, never smaller than 320 × 200
            page.click("#chart-bubble"); page.wait_for_timeout(300)
            ch = page.eval_on_selector("#chartp", VISIBLE)
            rep.check(ch["w"] <= max(0.4 * w, 340) + 1 and ch["h"] <= 0.7 * h + 1 and ch["x"] + ch["w"] > 0.55 * w, f"the chart panel opens docked right at the default size ({ch['w']:.0f}×{ch['h']:.0f})")
            rep.check(ch["w"] >= 320 and ch["h"] >= 200, "the chart panel is at least 320 × 200")
            rep.check(not page.errors, "no console errors" + (f": {page.errors}" if page.errors else ""))
            page.context.close()
        # a position saved on a big screen is pulled back on screen on a small one
        page = open_atlas(b, base, (1024, 700), storage={"atlas-18-win-compare": {"x": 1700, "y": 900, "w": 1500, "h": 1200}})
        page.evaluate("() => AtlasDebug.openCmp()"); page.wait_for_timeout(300)
        r = page.eval_on_selector("#cmp", VISIBLE)
        rep.check(r["onScreen"], f"a saved off-screen position is clamped to the screen ({r['x']:.0f},{r['y']:.0f} {r['w']:.0f}×{r['h']:.0f})")
        page.set_viewport_size({"width": 800, "height": 600}); page.wait_for_timeout(400)
        r = page.eval_on_selector("#cmp", VISIBLE)
        rep.check(r["onScreen"], "after the browser shrinks, the window is still on screen")
        page.context.close()
    rep.done()


if __name__ == "__main__":
    main()
