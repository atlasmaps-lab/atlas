"""
Atlas 0.10.1: fixes from the review of 0.10.   python tests/test_feedback_0101.py

- A header tab puts its metric on the map at that metric's latest date (Economic → Public spending was left on
  31 December 2024 while its story spoke of 2025-26); the note under the bar names the year the map shows.
- Social's orange post pins are hidden on the statistics tabs (Migration, …), where the key doesn't explain them,
  and come back on the Feed.
- Line chart end labels fit inside the chart and don't sit on top of each other (Migration by nationality).
- Rhondda Cynon Taf has its Discretionary Housing Payments (DWP spells it "Rhondda, Cynon, Taff").
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from atlas_test import server, browser, open_atlas, Report, open_panel


def main():
    rep = Report("0.10.1 review fixes")
    with server() as base, browser() as b:
        page = open_atlas(b, base, (1440, 900), query="debug#app=economic"); js = page.evaluate
        page.wait_for_timeout(2500)
        open_panel(page, "spending"); page.wait_for_timeout(1500)
        d, hi = js("() => [AtlasCtx.date, AtlasCtx.today]")
        rep.check(d == hi, f"Public spending: the bar moves to the latest date ({d})")
        note = js("() => document.getElementById('tnote').textContent")
        rep.check("20" in note and "latest available" in note, f"…and the note names the year on the map ({note})")
        # a date the user picked is kept
        js("() => AtlasCtx.setDate('2022-06-01')"); open_panel(page, "regions"); page.wait_for_timeout(1200)
        rep.check(js("() => AtlasCtx.date") == "2022-06-01", "a date you picked stays when you change tab")
        rep.check(not page.errors, "Economic: no console errors" + (f": {page.errors[:3]}" if page.errors else ""))
        page.context.close()

        page = open_atlas(b, base, (1440, 900), query="debug#app=social"); js = page.evaluate
        page.wait_for_timeout(3000)
        vis = lambda: js("() => ['soc-cl', 'soc-pts'].map(id => AtlasCtx.map.getLayoutProperty(id, 'visibility') || 'visible')")
        rep.check(vis() == ["visible", "visible"], "Social → Feed: post pins on the map")
        open_panel(page, "migration"); page.wait_for_timeout(2000)
        rep.check(vis() == ["none", "none"], "Social → Migration: post pins hidden")
        labs = js("""() => [...document.querySelectorAll('.apppanel:not([hidden]) svg')].filter(s => s.querySelector('text.end')).map(s => {
            const W = +s.getAttribute('viewBox').split(' ')[2], ts = [...s.querySelectorAll('text.end')];
            return { fit: ts.every(t => { const bb = t.getBBox(); return bb.x + bb.width <= W + 1; }), ys: ts.map(t => +t.getAttribute('y')).sort((a, b) => a - b) }; })""")
        rep.check(labs and all(l["fit"] for l in labs), f"Migration chart: end labels fit inside the chart ({len(labs)} chart(s))")
        rep.check(labs and all(all(b2 - a2 >= 10.5 for a2, b2 in zip(l["ys"], l["ys"][1:])) for l in labs), "…and don't overlap")
        open_panel(page, "feed"); page.wait_for_timeout(1200)
        rep.check(vis() == ["visible", "visible"], "back on Feed: pins return")
        dhp = js("() => { const F = window.ATLAS_PEOPLE && ATLAS_PEOPLE.fin; return F ? [F.dhp['W06000016'], F.dhp_unmatched] : null; }")
        rep.check(dhp and dhp[0] and dhp[0][0] > 0 and not dhp[1], f"Rhondda Cynon Taf has DHP figures ({dhp})")
        rep.check(not page.errors, "Social: no console errors" + (f": {page.errors[:3]}" if page.errors else ""))
        page.context.close()
    rep.done()


if __name__ == "__main__":
    main()
