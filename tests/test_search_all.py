"""
Atlas 0.13: the search box finds anything on the map (Atlas design/masthead/Masthead (final).md): places, rivers, parks,
companies, donors, MPs, trade partners, panels, apps, things to do, postcodes and coordinates, grouped by kind with a
kind line and an action. ⌘K focuses it; an empty box offers Try chips; no match says so.   python tests/test_search_all.py
"""
from atlas_test import server, browser, open_atlas, Report


def main():
    rep = Report("search_all")
    with server() as base, browser() as b:
        page = open_atlas(b, base, (1440, 900), query="debug#app=markets")
        js = page.evaluate
        page.wait_for_timeout(2000)
        page.keyboard.press("Meta+k"); page.wait_for_timeout(500)
        rep.check(js("() => document.activeElement && document.activeElement.id === 'search'"), "⌘K focuses the search box")
        rep.check(js("() => document.querySelectorAll('#hits .xtry button').length") >= 3 and js("() => !document.getElementById('hits').hidden"), "an empty box offers Try chips")
        def search(q, wait=900):
            page.fill("#search", q); page.wait_for_timeout(wait)
            return js("() => ({ secs: [...document.querySelectorAll('#hits li.sec')].map(x => x.textContent), x: [...document.querySelectorAll('#hits li.xhit')].map(x => [x.querySelector('b').textContent, x.querySelector('i').textContent, x.querySelector('.xgo').textContent]), places: document.querySelectorAll('#hits li[data-c]').length })")
        r = search("Leeds")
        rep.check(r["places"] >= 1, f"places are found ({r['places']})")
        r = search("Thames", 1500)
        riv = [x for x in r["x"] if x[0] == "River Thames"]
        rep.check(riv and "km" in riv[0][1] and riv[0][2].startswith("Go"), f"rivers, with a kind line and Go ({riv[:1]})")
        r = search("Peak District")
        rep.check(any("National Park" in x[1] for x in r["x"]), f"National Parks ({r['x'][:2]})")
        r = search("Barclays")
        rep.check("Companies" in r["secs"] and "Donors" in r["secs"], f"companies and donors ({r['secs']})")
        r = search("Germany")
        rep.check("Trade partners" in r["secs"], f"trade partners ({r['secs']})")
        r = search("Starmer")
        rep.check("MPs" in r["secs"], f"MPs ({r['secs']})")
        r = search("compare")
        rep.check("Things to do" in r["secs"], f"things to do ({r['secs']})")
        r = search("politics")
        rep.check("Apps" in r["secs"], f"apps ({r['secs']})")
        r = search("trade")
        rep.check(any(s.startswith("Panels in") for s in r["secs"]) and any(s == "Measures" or s.startswith("Metrics") for s in r["secs"]), f"panels and measures ({r['secs']})")
        r = search("53.8, -1.55")
        rep.check("Coordinates" in r["secs"], "coordinates")
        r = search("LS1 4AP")
        rep.check("Postcode" in r["secs"], "postcodes")
        r = search("zzqqxx")
        rep.check(js("() => !!document.querySelector('#hits .xnone')"), "no match says so plainly")
        search("Thames", 900)
        z0 = js("() => AtlasDebug.state ? 1 : 1")
        js("() => { const li = [...document.querySelectorAll('#hits li.xhit')].find(x => x.querySelector('b').textContent === 'River Thames'); li.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); }"); page.wait_for_timeout(1800)
        rep.check(js("() => document.getElementById('hits').hidden && document.getElementById('search').value === ''"), "choosing a result goes there and closes the list")
        search("Germany"); js("() => { const li = [...document.querySelectorAll('#hits li.xhit')].find(x => x.querySelector('i').textContent.startsWith('Trade partner')); li.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); }"); page.wait_for_timeout(900)
        rep.check(js("() => [...document.querySelectorAll('.pcwin')].some(w => !w.hidden && /Germany/.test(w.textContent))"), "a trade partner opens its card")
        rep.check(not page.errors, f"no errors ({page.errors[:3]})")
    rep.done()


if __name__ == "__main__":
    main()
