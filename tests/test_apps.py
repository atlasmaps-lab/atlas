"""
Atlas 1.8, Phase 7: perspective apps.   python tests/test_apps.py

Atlas Multi offers every perspective as its own app; #app=markets, #app=politics, #app=economic and #app=social open on
the shared core with their own panels and tools; a perspective with no data is "Not available yet".
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from atlas_test import server, browser, open_atlas, Report


def main():
    rep = Report("apps")
    with server() as base, browser() as b:
        page = open_atlas(b, base, (1440, 900))
        js = page.evaluate
        page.click("#brand"); page.wait_for_timeout(200)
        links = js("() => [...document.querySelectorAll('#apps-list a')].map(a => a.getAttribute('href'))")
        rep.check(any("#app=markets" in h for h in links) and any("#app=politics" in h for h in links), f"the ATLAS menu offers the apps ({len(links)})")
        rep.check("not available yet" in js("() => document.getElementById('apps-list').textContent").lower(), "Transportation shows as not available yet")
        page.keyboard.press("Escape"); page.click("#dock [data-fold]")
        rep.check(js("() => document.querySelectorAll('#dock .papp').length") >= 4, "each perspective with data has “Open as … ↗” in its row")
        rep.check(not page.errors, "Multi: no console errors" + (f": {page.errors}" if page.errors else ""))
        page.context.close()

        page = open_atlas(b, base, (1440, 900), query="debug#app=markets"); js = page.evaluate; page.wait_for_timeout(1200)
        rep.check(js("() => document.title") == "Atlas Markets" and page.is_visible("#appbar"), "#app=markets opens Atlas Markets with its own bar")
        rep.check(js("() => [...document.querySelectorAll('#dock .pname')].filter(b => b.dataset.open !== 'analysis').length") == 0 and js("() => [...new Set([...document.querySelectorAll('#dock .pgroup')].map(b => b.dataset.p))].join()") == "markets", "the dock offers only Markets' own categories (0.7.1: no perspective headers)")
        rep.check("not available" in js("() => document.querySelector('.apppanel:not([hidden]) .wm-body').textContent").lower(), "the market overview says prices are not available, and why")
        page.click("#appbar [data-apanel=dcf]"); page.wait_for_timeout(400)
        r = js("() => { const w = [...document.querySelectorAll('.apppanel:not([hidden])')].pop(); return [w.querySelectorAll('.mk-sens td').length, /Enterprise value/.test(w.textContent), /not investment advice/.test(w.textContent)]; }")
        rep.check(r[0] == 25 and r[1] and r[2], f"DCF: enterprise value, a 5 × 5 WACC × growth table, and the advice warning ({r})")
        page.click("#appbar [data-apanel=comps]"); page.wait_for_timeout(400)
        rep.check(js("() => !![...document.querySelectorAll('.apppanel:not([hidden])')].pop().querySelector('svg.mk-ff rect')"), "comparables draw a football field")
        page.click("#appbar [data-apanel=returns]"); page.wait_for_timeout(300)
        js("""() => { const w = [...document.querySelectorAll('.apppanel:not([hidden])')].pop(), t = w.querySelector('[data-k=px]'); t.value = '2020-01-31,100\\n2020-02-29,110\\n2020-03-31,88\\n2020-04-30,121'; t.dispatchEvent(new Event('input', { bubbles: true })); }""")
        r = js("() => [...document.querySelectorAll('.apppanel:not([hidden])')].pop().querySelector('.mk-out').textContent")
        rep.check("21.0%" in r and "-20.0%" in r, f"returns: total return 21% and maximum drawdown −20% from pasted prices")
        page.click("#appbar [data-apanel=companies]"); page.wait_for_timeout(300)
        page.click(".apppanel:not([hidden]) tr[data-co]"); page.wait_for_timeout(300)
        rep.check(js("() => !!document.querySelector('.wmwin[data-wm-type=company]:not([hidden])')"), "a company card opens from the screener")
        rep.check(not page.errors, "Markets: no console errors" + (f": {page.errors}" if page.errors else ""))
        page.context.close()

        page = open_atlas(b, base, (1440, 900), query="debug#app=politics"); js = page.evaluate; page.wait_for_timeout(2000)
        rep.check(not js("() => document.body.classList.contains('hexmode')") and js("() => AtlasDebug.PS.mapped.political.includes('ge_winner')"), "Atlas Politics opens with every seat coloured by its winner (0.7.1: real boundaries; hex is a view under Constituencies)")
        rep.check("650 seats" in js("() => document.querySelector('.apppanel:not([hidden])').textContent"), "the election view shows the seat count (650)")
        page.click("#appbar [data-apanel=swing]"); page.wait_for_timeout(400)
        before = js("() => [...document.querySelectorAll('.apppanel:not([hidden])')].pop().querySelector('.seatbar').innerHTML")
        js("""() => { const w = [...document.querySelectorAll('.apppanel:not([hidden])')].pop(), i = w.querySelector('[data-sw=lab]'); i.value = 20; i.dispatchEvent(new Event('input', { bubbles: true })); }"""); page.wait_for_timeout(600)
        after = js("() => [...document.querySelectorAll('.apppanel:not([hidden])')].pop().querySelector('.seatbar').innerHTML")
        rep.check(before != after, "the swingometer projects different seats when Labour's share falls")
        rep.check("simple model" in js("() => [...document.querySelectorAll('.apppanel:not([hidden])')].pop().textContent"), "it says uniform swing is a simple model")
        js("() => [...document.querySelectorAll('.apppanel:not([hidden])')].pop().querySelector('[data-swmap]').click()"); page.wait_for_timeout(800)
        rep.check(js("() => AtlasDebug.PS.mapped.political.includes('uns_winner')"), "the projection goes on the map")
        for pid in ("seat", "councils", "referendums"):
            page.click(f"#appbar [data-apanel={pid}]"); page.wait_for_timeout(400)
        rep.check(js("() => !!document.querySelector('.apppanel:not([hidden]) svg.ap-svg')"), "councils draw seats over time and control")
        rep.check(not page.errors, "Politics: no console errors" + (f": {page.errors}" if page.errors else ""))
        page.context.close()

        for app, word in (("economic", "GDP per head"), ("social", "Population")):
            page = open_atlas(b, base, (1440, 900), query="debug#app=" + app); js = page.evaluate; page.wait_for_timeout(1000)
            rep.check(word in js("() => document.querySelector('.apppanel:not([hidden])').textContent"), f"Atlas {app.title()} opens its place dashboard")
            for x in js("() => [...document.querySelectorAll('#appbar [data-apanel]')].map(b => b.dataset.apanel)"):
                page.click(f"#appbar [data-apanel={x}]"); page.wait_for_timeout(250)
            rep.check(not page.errors, f"{app}: every panel opens without console errors" + (f": {page.errors}" if page.errors else ""))
            page.context.close()
        page = open_atlas(b, base, (1440, 900), query="debug#app=transport"); js = page.evaluate; page.wait_for_timeout(800)
        rep.check("not available yet" in js("() => document.body.textContent").lower(), "#app=transport says not available yet")
        page.context.close()
    rep.done()


if __name__ == "__main__":
    main()
