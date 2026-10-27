"""
Atlas 1.8, Phase 1: the time bar.   python tests/test_timebar.py

Labels: at 320, 480 and 800 px and full width, no label overlaps another or runs off the bar, and the current date is
always visible above the handle.
Range: the bar runs over the dates with data for what's on the map: GDP only → 1998–2024, MPs only → 1997 onwards,
Controlling party only → 1974 onwards. A date outside a new range moves to the nearest end.
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from atlas_test import server, browser, open_atlas, Report

LABELS = """() => {
  const tb = document.getElementById('timebar').getBoundingClientRect(), mk = document.getElementById('marks').getBoundingClientRect();
  const spans = [...document.querySelectorAll('#marks span')].map(s => s.getBoundingClientRect());
  const cur = document.getElementById('tcur').getBoundingClientRect(), tr = document.querySelector('#timebar .track').getBoundingClientRect();
  let overlap = 0; for (let i = 0; i < spans.length; i++) for (let j = i + 1; j < spans.length; j++) if (spans[i].left < spans[j].right && spans[j].left < spans[i].right) overlap++;
  const off = spans.filter(r => r.left < mk.left - 7.5 || r.right > mk.right + 7.5).length;
  const clipped = [...document.querySelectorAll('#timebar .tright > *')].filter(e => getComputedStyle(e).display !== 'none').some(e => { const r = e.getBoundingClientRect(); return r.right > tb.right + 0.5 || r.left < tb.left; });
  return { n: spans.length, overlap, off, tier: document.getElementById('marks').dataset.tier, curText: document.getElementById('tcur').textContent,
    curIn: cur.width > 0 && cur.left >= tr.left - 0.5 && cur.right <= tr.right + 0.5 && cur.bottom <= mk.top + 2, width: tb.width, clipped };
}"""


def main():
    rep = Report("time bar")
    with server() as base, browser() as b:
        page = open_atlas(b, base, (1440, 900))
        for wpx in (320, 480, 800, "full"):
            page.evaluate("w => { const t = document.getElementById('timebar'); t.style.width = (w === 'full' ? innerWidth - 16 : w) + 'px'; t.style.minWidth = '0'; }", wpx)
            page.wait_for_timeout(600)   # the labels redraw after the bar's size settles
            r = page.evaluate(LABELS)
            print(f"  width {wpx}: {r}")
            rep.check(r["overlap"] == 0, f"{wpx}: no labels overlap ({r['n']} labels, tier {r['tier']})")
            rep.check(r["off"] == 0, f"{wpx}: no label runs off the bar")
            rep.check(r["curIn"] and len(r["curText"]) >= 4, f"{wpx}: the current date shows above the handle (“{r['curText']}”)")
            rep.check(not r["clipped"], f"{wpx}: the date box and buttons fit inside the bar")
        page.evaluate("() => { const t = document.getElementById('timebar'); t.style.width = ''; t.style.minWidth = ''; }")

        def range_for(ids):
            page.evaluate("ids => AtlasDebug.mapOnly(ids)", ids); page.wait_for_timeout(200)
            return page.evaluate("() => [AtlasDebug.TB.lo, AtlasDebug.TB.hi, AtlasDebug.state.date, document.getElementById('slider').min, document.getElementById('slider').max]")
        lo, hi, d, smin, smax = range_for(["gdp"])
        rep.check(lo[:4] == "1998" and hi[:4] == "2024", f"GDP only: {lo} to {hi} (1998–2024)")
        rep.check(d <= hi, f"GDP only: today's date moved to the end of the data ({d})")
        rep.check(page.evaluate("() => !document.getElementById('toast').hidden && /date moved/.test(document.getElementById('toast').textContent)"), "a toast says the date moved")
        lo, hi, d, *_ = range_for(["mp_tenure"])
        rep.check(lo[:4] == "1997", f"MPs only (MP's years in the seat): starts {lo} (1997)")
        lo, hi, d, *_ = range_for(["mp_count", "seat_flips"])
        rep.check(lo[:4] == "1997", f"MPs only (MPs since 1997, seat changed hands): starts {lo}")
        page.evaluate("() => AtlasDebug.setDate('1999-01-01')")
        lo, hi, d, *_ = range_for(["control"])
        rep.check(lo[:4] == "1974", f"Controlling party only: starts {lo} (1974)")
        page.evaluate("() => AtlasDebug.setDate('1975-06-01')")
        lo, hi, d, *_ = range_for(["mp_tenure"])
        rep.check(d >= lo, f"a date before the new range (1975) moves to its start ({d})")
        # Full range: 1974 to today, with the years without data hatched
        page.click("#tb-more"); page.click("#tb-full"); page.wait_for_timeout(200)
        r = page.evaluate("() => ({ min: document.getElementById('slider').min, nd: document.querySelectorAll('#marks .tb-nd').length, txt: [...document.querySelectorAll('#marks .tb-nd')].map(e => e.textContent).join(',') })")
        rep.check(r["nd"] >= 1 and "no data" in r["txt"], f"Full range hatches the years with no data ({r})")
        page.click("#tb-full")   # the ⋯ menu is still open
        lo, hi, d, *_ = range_for(["protest_events"])
        rep.check(lo[:4] <= "1980" and hi[:4] >= "2020", f"protests only: the span of their events ({lo} to {hi})")
        rep.check(not page.errors, "no console errors" + (f": {page.errors}" if page.errors else ""))
        page.context.close()
    rep.done()


if __name__ == "__main__":
    main()
