"""
Atlas 0.10.1 / 0.13: panels with tabs of their own stay reachable tab by tab.
0.13: headings are groups of panels, and an app's tools live in the Toolbox. A grouped panel's tabs are rows in its
group's contents page (Politics → Money's Parties and Top donors are its own sections); a tool's tabs are buttons under
it in the Toolbox (Markets → Calculator: DCF, Comparables, Dividend discount, Returns). Picking one opens the panel at
that tab.   python tests/test_tabmenu.py
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
            is_tool = js("id => AtlasDebug.APP.tools.some(t => t.id === id)", pid)
            if is_tool:
                js("() => document.getElementById('tools-btn').click()"); page.wait_for_timeout(300)
                js("() => document.querySelector('#tools [data-tbsec=\"app\"]').click()"); page.wait_for_timeout(300)
                tabs = js("id => [...document.querySelectorAll('#tools [data-tbtab^=\"' + id + '|\"]')].map(b => b.dataset.tbtab.split('|')[1])", pid)
                rep.check(tab in tabs, f"{app} → {pid}: the Toolbox lists its tabs ({', '.join(tabs)})")
                js(f"() => document.querySelector('#tools [data-tbtab=\"{pid}|{tab}\"]').click()"); page.wait_for_timeout(1500)
                rep.check(js("s => !!document.querySelector('.apppanel:not([hidden]) ' + s)", on), f"…picking {tab} opens the tool at that tab")
                rep.check(js("() => document.getElementById('tools').hidden"), "…and the Toolbox closes")
            else:
                g = js("id => { for (const b of document.querySelectorAll('#appbar [data-agroup]')) if (AtlasMenu.groupHas(+b.dataset.agroup, id)) return b.dataset.agroup; return null; }", pid)
                rep.check(g is not None, f"{app} → {pid}: a heading holds it")
                js(f"() => document.querySelector('#appbar [data-agroup=\"{g}\"]').click()"); page.wait_for_timeout(900)
                cols = js("() => [...document.querySelectorAll('#mega .mgc-col [data-mcol]')].map(b => b.querySelector('span').textContent)")
                if pid == "money":   # Money's tabs became its own sections, each opening further
                    rep.check("Parties" in cols and "Top donors" in cols, f"{app} → {pid}: its tabs are sections of the heading ({cols})")
                    js(f"() => document.querySelector('#mega [data-mfull=\"{pid}\"]').click()"); page.wait_for_timeout(1500)
                    js(f"() => document.querySelector('.apppanel:not([hidden]) [data-mftab=\"{tab}\"]').click()"); page.wait_for_timeout(800)
                    rep.check(js("s => !!document.querySelector('.apppanel:not([hidden]) ' + s)", on), f"…and the full panel still has its {tab} tab")
                else:
                    found = False
                    for i in range(len(cols)):
                        js(f"() => document.querySelectorAll('#mega .mgc-col [data-mcol]')[{i}].click()"); page.wait_for_timeout(400)
                        if js(f"() => !!document.querySelector('#mega [data-mkey=\"{tab}\"]')"):
                            found = True; break
                        js(f"() => document.querySelector('#mega .mgc-col.on [data-mcol]').click()"); page.wait_for_timeout(300)
                        js("() => 0")
                    rep.check(found, f"{app} → {pid}: its tabs are rows in the heading's contents ({cols})")
                    if found:
                        js(f"() => document.querySelector('#mega [data-mkey=\"{tab}\"]').click()"); page.wait_for_timeout(1500)
                        rep.check(js("s => !!document.querySelector('.apppanel:not([hidden]) ' + s)", on), f"…picking {tab} opens the panel at that tab")
                        rep.check(js("() => document.getElementById('mega').hidden"), "…and the dropdown closes")
            rep.check(not page.errors, f"{app}: no console errors" + (f": {page.errors[:3]}" if page.errors else ""))
            page.context.close()
    rep.done()


if __name__ == "__main__":
    main()
