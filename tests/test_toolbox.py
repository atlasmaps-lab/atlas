"""
Atlas 0.13: the Toolbox (Atlas design/toolbox/Toolbox (final).md). A 420 px dropdown from the bar's Toolbox button with
five sections closed until clicked: On the map (Measure, Lasso, To workspace, Copy view), In <app> (the app's own
tools; they leave the bar), Time bar (ten styles as thumbnails, picked live and remembered), Look, Feel (sliders, Reset).
python tests/test_toolbox.py
"""
from atlas_test import server, browser, open_atlas, Report


def main():
    rep = Report("toolbox")
    with server() as base, browser() as b:
        page = open_atlas(b, base, (1440, 900), query="debug#app=markets")
        js = page.evaluate
        page.wait_for_timeout(2000)
        rep.check(js("() => !document.querySelector('#appbar .ah-link.tool')"), "the app's tools are no longer in the bar")
        js("() => document.getElementById('tools-btn').click()"); page.wait_for_timeout(500)
        s = js("""() => { const t = document.getElementById('tools'); return { open: !t.hidden, w: Math.round(t.getBoundingClientRect().width), secs: [...t.querySelectorAll('.tbx-sh span')].map(x => x.textContent), on: t.querySelectorAll('.tbx-sec.on').length }; }""")
        rep.check(s["open"] and s["w"] == 420, f"the Toolbox opens 420 px wide ({s['w']})")
        rep.check(s["secs"] == ["On the map", "In Markets", "Time bar", "Look", "Feel"], f"five sections ({s['secs']})")
        rep.check(s["on"] == 0, "every section starts closed")
        def open_sec(k):
            js(f"() => document.querySelector('#tools [data-tbsec=\"{k}\"]').click()"); page.wait_for_timeout(300)
        open_sec("map")
        rep.check(js("() => [...document.querySelectorAll('#tools [data-tool]')].map(b => b.dataset.tool).join()") == "measure,lasso,shot,copy", "On the map: Measure, Lasso, To workspace, Copy view")
        open_sec("app")
        apps = js("() => [...document.querySelectorAll('#tools [data-tbapp]')].map(b => b.dataset.tbapp)")
        rep.check(len(apps) >= 2 and "marketplace" in apps, f"In Markets: the app's tools and Marketplace ({apps})")
        open_sec("time")
        st = js("() => [...document.querySelectorAll('#tools [data-tbstyle]')].map(b => !!b.querySelector('.tb-thumb i'))")
        rep.check(len(st) == 10 and all(st), f"Time bar: ten styles with thumbnails ({len(st)})")
        js("() => document.querySelector('#tools [data-tbstyle=\"film\"]').click()"); page.wait_for_timeout(400)
        rep.check(js("() => AtlasTimebar.style === 'film' && localStorage.getItem('atlas-tb-style') === 'film' && document.querySelector('#tools [data-tbstyle=\"film\"]').classList.contains('on')"), "picking a style changes the time bar and is remembered")
        rep.check("Filmstrip" in js("() => document.querySelector('#tools [data-tbsec=\"time\"] i').textContent"), "the section says which style is on")
        js("() => document.querySelector('#tools [data-tbstyle=\"atlas\"]').click()"); page.wait_for_timeout(300)
        open_sec("look"); open_sec("feel")
        rep.check(js("() => !!document.querySelector('#tools [data-hot]') && !!document.querySelector('#tools [data-grid]') && !!document.querySelector('#tools [data-mapcol]')"), "Look: panels, grid lines, map colours")
        rep.check(js("() => document.querySelectorAll('#tools [data-sl]').length") >= 4 and js("() => !!document.querySelector('#tools [data-treset]')"), "Feel: the sliders and Reset")
        open_sec("app")
        js("() => document.querySelector('#tools [data-tbsec=\"app\"]').click()"); page.wait_for_timeout(200)
        js("() => document.querySelector('#tools [data-tbapp]').click()"); page.wait_for_timeout(800)
        rep.check(js("() => document.getElementById('tools').hidden") and js("() => [...document.querySelectorAll('.apppanel')].some(w => !w.hidden)"), "an app tool opens from the Toolbox")
        rep.check(not page.errors, f"no errors ({page.errors[:3]})")
    rep.done()


if __name__ == "__main__":
    main()
