"""
Atlas 0.10.1: header links with tabs of their own open a menu of them on hover.   python tests/test_tabmenu.py

Politics → Money (Parties, Top donors, …), Transport → Stations & hubs (Stations, Airports, Ports), Markets → Calculator
and Social → Feed show a ▾; hovering one shows its tabs under it straight away, and picking one opens the panel at
that tab. Links without tabs show no menu.
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from atlas_test import server, browser, open_atlas, Report

CASES = [("politics", "money", "donors", "[data-mftab='donors'].on"),
         ("transport", "hubs", "airport", "[data-trhub='airport'].on"),
         ("markets", "calc", "ddm", "[data-calc='ddm'].on"),
         ("social", "feed", "following", "[data-sofeed='following'].on")]


def main():
    rep = Report("header tab menus")
    with server() as base, browser() as b:
        for app, pid, tab, on in CASES:
            page = open_atlas(b, base, (1440, 900), query="debug#app=" + app); js = page.evaluate
            page.wait_for_timeout(2500)
            link = f".ah-nav [data-apanel='{pid}']"
            rep.check(js("s => document.querySelector(s).classList.contains('has-tabs')", link), f"{app} → {pid}: marked ▾")
            page.hover(link); page.wait_for_timeout(250)
            items = js("() => { const m = document.getElementById('ah-tabmenu'); return m && !m.hidden ? [...m.querySelectorAll('[data-ahtab]')].map(b => b.dataset.ahtab) : []; }")
            rep.check(tab in items, f"{app} → {pid}: hovering shows its tabs ({', '.join(items)})")
            lr, mr = js("s => [document.querySelector(s).getBoundingClientRect(), document.getElementById('ah-tabmenu').getBoundingClientRect()].map(r => [r.left, r.bottom, r.top])", link)
            rep.check(abs(mr[2] - lr[1]) < 4, "…right under the link")
            page.click(f"#ah-tabmenu [data-ahtab='{tab}']"); page.wait_for_timeout(1500)
            rep.check(js("s => !!document.querySelector('.apppanel:not([hidden]) ' + s)", on), f"…picking {tab} opens the panel at that tab")
            rep.check(js("() => document.getElementById('ah-tabmenu').hidden"), "…and the menu closes")
            # picking another tab while it's open switches it
            page.hover(link); page.wait_for_timeout(250)
            first = js("() => document.querySelector('#ah-tabmenu [data-ahtab]').dataset.ahtab")
            page.click("#ah-tabmenu [data-ahtab]"); page.wait_for_timeout(1200)
            n = js("() => [...document.querySelectorAll('.apppanel')].filter(w => !w.hidden).length")
            rep.check(js("s => !!document.querySelector('.apppanel:not([hidden]) .on[data-mftab=\"' + s + '\"], .apppanel:not([hidden]) .on[data-trhub=\"' + s + '\"], .apppanel:not([hidden]) .on[data-calc=\"' + s + '\"], .apppanel:not([hidden]) .on[data-sofeed=\"' + s + '\"]')", first) and n >= 1, f"…and switches tab while open ({first})")
            plain = js("() => { const b = [...document.querySelectorAll('.ah-nav [data-apanel]')].find(b => !b.classList.contains('has-tabs')); return b && b.dataset.apanel; }")
            if plain:
                page.hover(f".ah-nav [data-apanel='{plain}']"); page.wait_for_timeout(250)
                rep.check(js("() => document.getElementById('ah-tabmenu').hidden"), f"{app}: a link without tabs ({plain}) shows no menu")
            rep.check(not page.errors, f"{app}: no console errors" + (f": {page.errors[:3]}" if page.errors else ""))
            page.context.close()
    rep.done()


if __name__ == "__main__":
    main()
