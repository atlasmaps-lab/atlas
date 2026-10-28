"""
Atlas 1.8, Phase 4: Compare makes tables and charts.   python tests/test_compare.py

From the comparison page: a table in each layout (places × metrics, places × years, metrics × years) with valid totals
(sums for counts, population-weighted averages for rates, nothing for categories), a chart drawn inside the page beside the
table, both kept in the list on the left; tables copy as CSV, go to the workspace and open in a tab; Analyse opens on top.
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from atlas_test import server, browser, open_atlas, Report

PLACES = ["E06000023", "E08000025", "E06000043", "E08000035"]   # Bristol, Birmingham, Brighton and Hove, Leeds


def main():
    rep = Report("compare")
    with server() as base, browser() as b:
        page = open_atlas(b, base, (1440, 900))
        js = page.evaluate
        page.context.grant_permissions(["clipboard-read", "clipboard-write"])
        js("ps => { AtlasDebug.select(ps); AtlasDebug.setCmpMetrics(['population', 'gdp_per_head', 'control']); AtlasDebug.openCmp(); }", PLACES); page.wait_for_timeout(400)
        page.click("#cmp [data-fmax]"); page.wait_for_timeout(300)
        rep.check(js("() => document.querySelectorAll('#cmp .cmp-it').length") == 1, "Compare starts with one table (places × metrics) in its list")
        foot = js("() => [...document.querySelectorAll('#cmp table.ctab tfoot td')].map(td => [td.textContent.trim(), td.title])")
        rep.check(len(foot) == 3 and foot[0][0] and "Total" in foot[0][1], f"population (a count) is summed: {foot[0] if foot else None}")
        rep.check(len(foot) == 3 and "weighted by population" in foot[1][1], f"GDP per head (a rate) gets a population-weighted average: {foot[1] if len(foot) > 1 else None}")
        rep.check(len(foot) == 3 and foot[2][0] == "", "Controlling party (a category) gets no total")
        # population sum is right
        ok = js("ps => { const t = ps.reduce((a, c) => a + AtlasDebug.M.population.get(c, AtlasDebug.state.date).v, 0); const shown = document.querySelector('#cmp table.ctab tfoot td').textContent.replace(/[^0-9]/g, ''); return [t, shown]; }", PLACES)
        rep.check(str(round(ok[0])) == ok[1], f"the population total adds up ({ok})")
        # places × years
        page.click("#cmp [data-kmk=table]"); page.click("#cmp [data-klay=py]"); page.wait_for_timeout(200)
        page.select_option("#cmp [data-kf=metric]", "gdp_per_head")
        page.fill("#cmp [data-kf=from]", "2015"); page.dispatch_event("#cmp [data-kf=from]", "change"); page.wait_for_timeout(200)
        page.click("#cmp [data-kmake]"); page.wait_for_timeout(300)
        hd = js("() => [...document.querySelectorAll('#cmp table.ctab thead th')].map(t => t.textContent)")
        rep.check(hd[1:3] == ["2015", "2016"] and len(js("() => document.querySelectorAll('#cmp table.ctab tbody tr')")) == 4, f"places × years: one column per year from 2015 ({hd[:4]})")
        # metrics × years for one place
        page.click("#cmp [data-kmk=table]"); page.click("#cmp [data-klay=my]"); page.wait_for_timeout(200)
        page.click("#cmp [data-kmake]"); page.wait_for_timeout(300)
        rows = js("() => [...document.querySelectorAll('#cmp table.ctab tbody th')].map(t => t.firstChild.textContent)")
        rep.check(len(rows) == 3 and not js("() => !!document.querySelector('#cmp table.ctab tfoot')"), f"metrics × years: one row per metric, no total across different units ({rows})")
        rep.check(js("() => document.querySelectorAll('#cmp .cmp-it').length") == 3, "the three tables stay in the list on the left")
        # sorting
        page.click("#cmp table.ctab thead th:nth-child(2)"); page.wait_for_timeout(100)
        rep.check(js("() => document.querySelector('#cmp table.ctab thead th:nth-child(2)').dataset.dir") == "asc", "columns sort")
        # a chart, inside the page, beside the table
        page.click("#cmp [data-kmk=chart]"); page.wait_for_timeout(300)
        rep.check(js("() => !!document.querySelector('#cmp .cmp-cpane .sty-pick')"), "Make chart opens the style picker inside Compare")
        rep.check(js("() => [...document.querySelectorAll('#cmp .cmp-cpane .sty.no')].every(b => b.title.length > 5)"), "unsuitable styles are greyed with a reason")
        page.click("#cmp [data-kdraw]"); page.wait_for_timeout(600)
        rep.check(js("() => !!document.querySelector('#cmp .cmp-chart svg')"), "the chart is drawn inside the comparison page")
        side = js("() => { const t = document.querySelector('#cmp .cmp-tpane').getBoundingClientRect(), c = document.querySelector('#cmp .cmp-cpane').getBoundingClientRect(); return c.left >= t.right - 1; }")
        rep.check(side, "the chart sits beside the table")
        rep.check(js("() => document.querySelectorAll('#cmp .cmp-it').length") == 4, "the chart joins the list")
        # actions
        page.click("#cmp .cmp-tpane [data-kcsv]"); page.wait_for_timeout(300)
        clip = js("() => navigator.clipboard.readText().catch(() => '')")
        rep.check(clip.count("\n") >= 3, "Copy as CSV puts the table on the clipboard")
        page.click("#cmp .cmp-tpane [data-kws]"); page.wait_for_timeout(200)
        rep.check(js("() => JSON.parse(localStorage.getItem('atlas-16-ws')).projects[0].items.some(i => i.type === 'ctable')"), "the table goes to the workspace")
        page.click("#cmp .cmp-tpane [data-ktab]"); page.wait_for_timeout(300)
        rep.check(js("() => !document.getElementById('tabview').hidden && !!document.querySelector('#tabview table.ctab')"), "the table opens in its own tab")
        page.click("#tabview [data-tback]"); page.wait_for_timeout(200)
        js("() => document.querySelector('#cmp [data-can]').click()"); page.wait_for_timeout(500)
        z = js("() => [+getComputedStyle(document.getElementById('cmp')).zIndex, +getComputedStyle(document.getElementById('analyse')).zIndex]")
        rep.check(z[1] > z[0], "Analyse these… opens Analyse on top of Compare")
        rep.check(not page.errors, "no console errors" + (f": {page.errors}" if page.errors else ""))
        js("() => { for (const k of Object.keys(localStorage)) if (k.startsWith('atlas-16-ws')) localStorage.removeItem(k); }")
        page.context.close()
    rep.done()


if __name__ == "__main__":
    main()
