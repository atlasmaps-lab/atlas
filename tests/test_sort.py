"""
Atlas 0.12: every table and list of figures sorts high→low and low→high.   python tests/test_sort.py

Tables with headings: click a heading (numbers go highest first, click again for lowest first). Tables without headings
and lists of figures get a Sort switch (Largest first, Smallest first, A–Z, As shown). Columns of places in the menus have ↓ ↑.
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from atlas_test import server, browser, open_atlas, Report, open_panel

ORDER = """(sel) => { const t = document.querySelector(sel); if (!t) return null; const rows = [...t.tBodies[0].rows].filter(r => r.cells.length > 2);
  return rows.map(r => AtlasSort.num(r.cells[1].dataset.v || r.cells[1].textContent)); }"""


def main():
    rep = Report("sort")
    with server() as base, browser() as b:
        page = open_atlas(b, base, (1440, 900), query="debug#app=politics"); js = page.evaluate
        page.wait_for_timeout(1500)
        js("() => AtlasMenu.full('money')"); page.wait_for_timeout(1200)
        sel = ".apppanel:not([hidden]) table.mf-rows"
        rep.check(js(f"() => document.querySelector('{sel}').classList.contains('srt-th')"), "the Money table's headings sort")
        page.click(f"{sel} thead th:nth-child(2)"); page.wait_for_timeout(200)
        a = [x for x in js(ORDER, sel) if x is not None]
        rep.check(a == sorted(a, reverse=True), f"first click: highest first ({a[:4]})")
        page.click(f"{sel} thead th:nth-child(2)"); page.wait_for_timeout(200)
        a = [x for x in js(ORDER, sel) if x is not None]
        rep.check(a == sorted(a), f"second click: lowest first ({a[:4]})")
        # a header-less table gets a switch
        js("() => { const d = document.createElement('div'); d.id = 'srt-probe'; d.innerHTML = '<table class=\"mo-tab\"><tr><td>a</td><td>£5m</td></tr><tr><td>b</td><td>£12k</td></tr><tr><td>c</td><td>£2.5bn</td></tr><tr><td>d</td><td>−£3m</td></tr></table>'; document.body.appendChild(d); }"); page.wait_for_timeout(300)
        rep.check(js("() => !!document.querySelector('#srt-probe .srt-bar')"), "a table without headings gets a Sort switch")
        js("() => document.querySelector('#srt-probe [data-srt=desc]').click()"); page.wait_for_timeout(100)
        rep.check(js("() => [...document.querySelectorAll('#srt-probe td:first-child')].map(x => x.textContent).join('')") == "cabd", "High→low reads £2.5bn, £5m, £12k, −£3m")
        js("() => document.querySelector('#srt-probe [data-srt=asc]').click()"); page.wait_for_timeout(100)
        rep.check(js("() => [...document.querySelectorAll('#srt-probe td:first-child')].map(x => x.textContent).join('')") == "dbac", "Low→high reverses it")
        js("() => document.querySelector('#srt-probe [data-srt=orig]').click()"); page.wait_for_timeout(100)
        rep.check(js("() => [...document.querySelectorAll('#srt-probe td:first-child')].map(x => x.textContent).join('')") == "abcd", "As shown puts it back")
        # menu columns
        page.click("#appbar [data-apanel=money]"); page.wait_for_timeout(400)
        rep.check(js("() => !!document.querySelector('#mega .mg-sort [data-msort]')"), "the Parties column has ↓ ↑")
        js("() => document.querySelector('#mega .mg-sort [data-msort$=\"|asc\"]').click()"); page.wait_for_timeout(200)
        first = js("() => document.querySelector('#mega .mg-items[data-depth=\"0\"] .mg-l').textContent")
        rep.check(first not in ("Conservative", "Labour"), f"…lowest first puts a small party at the top ({first})")
        page.keyboard.press("Escape")
        rep.check(not [e for e in page.errors if "favicon" not in e], f"no errors ({page.errors[:2]})")
        page.close()
        # across apps: every table with headings sorts; header-less numeric tables have a switch
        for app, pid in [("economic", "spending"), ("markets", "partners"), ("health", "spine"), ("social", "support"), ("transport", "hubs"), ("environment", "coast")]:
            page = open_atlas(b, base, (1440, 900), query=f"debug#app={app}"); js = page.evaluate; page.wait_for_timeout(1500)
            js(f"() => AtlasMenu && AtlasMenu.full ? AtlasMenu.full('{pid}') : AtlasCtx.openPanel('{pid}')"); page.wait_for_timeout(2000)
            r = js("""() => { const ts = [...document.querySelectorAll('.apppanel:not([hidden]) table')]; return { n: ts.length, head: ts.filter(t => t.tHead && t.tHead.rows.length).every(t => t.classList.contains('srt-th')),
              bare: ts.filter(t => !(t.tHead && t.tHead.rows.length) && t.rows.length >= 3 && t.dataset.srtd).length, bars: document.querySelectorAll('.apppanel:not([hidden]) .srt-bar').length }; }""")
            rep.check(r["n"] == 0 or r["head"], f"{app} › {pid}: every table with headings sorts ({r})")
            rep.check(not [e for e in page.errors if "favicon" not in e], f"{app}: no errors ({page.errors[:2]})")
            page.close()
    rep.done()


if __name__ == "__main__":
    main()
