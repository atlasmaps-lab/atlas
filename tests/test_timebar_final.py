"""
Atlas 0.13: the final time bar. A slim capsule with ⌃; expanded, an events line, a story strip (highest green, lowest red,
drag to any month), a caption and options (step incl. 1 month, range, events counted, back to latest). Nine more styles
from the Toolbox drive the same date.   python tests/test_timebar_final.py
"""
from atlas_test import server, browser, open_atlas, Report


def main():
    rep = Report("timebar_final")
    with server() as base, browser() as b:
        page = open_atlas(b, base, (1440, 900), query="debug#app=economic")
        js = page.evaluate
        page.wait_for_timeout(1800)
        page.click("#tb-more"); page.wait_for_timeout(500)
        s = js("""() => { const p = document.getElementById('tb-pop'); return { open: !p.hidden && document.getElementById('timebar').classList.contains('tbx-open'),
          chips: p.querySelectorAll('.tbx-chip').length, cols: p.querySelectorAll('.tbx-col').length, up: [...p.querySelectorAll('.tbx-col')].some(c => /--up/.test(c.style.background)),
          down: [...p.querySelectorAll('.tbx-col')].some(c => /--down/.test(c.style.background)), cap: p.querySelector('.tbx-cap').textContent,
          month: !!p.querySelector('#steps [data-step="0"]'), full: !!p.querySelector('#tb-full'), win: p.querySelectorAll('[data-tbwin]').length }; }""")
        rep.check(s["open"], "⌃ opens the full bar")
        rep.check(s["chips"] >= 2, f"an events line with chips ({s['chips']})")
        rep.check(s["cols"] >= 5 and s["up"] and s["down"], f"a story strip with the highest year green and the lowest red ({s['cols']} years)")
        rep.check(len(s["cap"]) > 10, f"a caption says what the date means ({s['cap'][:70]!r})")
        rep.check(s["month"] and s["full"] and s["win"] == 4, "options: step with 1 month, range, events counted")
        d0 = js("() => document.getElementById('slider').value")
        box = page.locator(".tbx-strip").bounding_box()
        page.mouse.move(box["x"] + box["width"] * 0.3, box["y"] + 40); page.mouse.down(); page.mouse.move(box["x"] + box["width"] * 0.35, box["y"] + 40); page.mouse.up(); page.wait_for_timeout(400)
        d1 = js("() => document.getElementById('slider').value")
        rep.check(d1 != d0, "dragging on the strip moves the date to a month")
        js("() => document.querySelector('.tbx-chip[data-tbevgo]').click()"); page.wait_for_timeout(400)
        cap = js("() => document.querySelector('.tbx-cap').textContent")
        rep.check(js("() => !!document.querySelector('.tbx-chip.on')") and len(cap) > 30, f"an event chip jumps there and tells its story ({cap[:60]!r})")
        page.click("#tb-pop [data-tbfold]"); page.wait_for_timeout(300)
        rep.check(js("() => document.getElementById('tb-pop').hidden"), "⌄ folds it back")
        for st in ["frieze", "seismo", "core", "wheels", "navigator", "film", "clock", "watermark", "calendar"]:
            js(f"() => AtlasTimebar.setStyle('{st}')"); page.wait_for_timeout(300)
            ok = js("() => { const h = document.getElementById('tb-art'); return !!h && !h.hidden && h.children.length > 0 && getComputedStyle(document.getElementById('timebar')).display === 'none'; }")
            v0 = js("() => document.getElementById('slider').value")
            moved = js("""() => { const r = document.querySelector('#tb-art [data-tbscrub]'), c = document.querySelector('#tb-art [data-tbgo]'), w = document.querySelector('#tb-art [data-tbmon]');
              if (r) { r.value = Math.max(0, +r.value - 7); r.dispatchEvent(new Event('input', { bubbles: true })); return true; } if (c) { c.click(); return true; } if (w) { w.click(); return true; } return false; }""")
            page.wait_for_timeout(250)
            v1 = js("() => document.getElementById('slider').value")
            rep.check(ok and moved and v1 != v0, f"style {st} draws and moves the map's date")
        rep.check(js("() => !!document.getElementById('tb-water') && !document.getElementById('tb-water').hidden") is False, "the watermark's year goes when another style is chosen")
        js("() => AtlasTimebar.setStyle('watermark')"); page.wait_for_timeout(200)
        rep.check(js("() => !document.getElementById('tb-water').hidden"), "the watermark puts the year behind the map")
        js("() => AtlasTimebar.setStyle('atlas')"); page.wait_for_timeout(200)
        rep.check(js("() => localStorage.getItem('atlas-tb-style')") == "atlas" and js("() => getComputedStyle(document.getElementById('timebar')).display !== 'none'"), "the choice is remembered, and Atlas brings the bar back")
        rep.check(not page.errors, f"no errors ({page.errors[:3]})")
    rep.done()


if __name__ == "__main__":
    main()
