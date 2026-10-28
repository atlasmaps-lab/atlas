"""
Atlas 1.8, Phase 2: Clear all, and "not available" everywhere.   python tests/test_availability.py

Clear all sits at the top of the Perspectives panel (greyed when nothing is ticked, Undo after); each perspective has its own
"clear" link only when it has something ticked; nothing with no data behind it can be ticked or chosen without a reason.
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from atlas_test import server, browser, open_atlas, Report


def main():
    rep = Report("availability")
    with server() as base, browser() as b:
        page = open_atlas(b, base, (1280, 800))
        js = page.evaluate
        page.click("#dock [data-fold]")   # the Perspectives panel starts folded
        rep.check(page.is_visible("#dock .dt-row [data-dclear]"), "Clear all is at the top of the Perspectives panel")
        rep.check(js("() => document.querySelectorAll('#dock [data-pclear]').length") == 1, "only Political (which has something ticked) shows a “clear” link")
        page.click("#dock [data-dclear]"); page.wait_for_timeout(200)
        rep.check(js("() => document.querySelector('#dock [data-dclear]').disabled"), "after Clear all, the button is greyed")
        rep.check(js("() => document.querySelectorAll('#dock [data-pclear]').length") == 0, "no per-perspective “clear” links when nothing is ticked")
        page.click("#undo-btn"); page.wait_for_timeout(200)
        rep.check(js("() => AtlasDebug.PS.mapped.political.length") == 2, "Undo puts the metrics back")
        page.click("#dock [data-pclear='political']"); page.wait_for_timeout(200)
        rep.check(js("() => AtlasDebug.PS.mapped.political.length") == 0, "the Political “clear” link clears Political")
        page.click("#undo-btn"); page.wait_for_timeout(100)
        # the menu footer has no Clear button any more
        page.click("#dock [data-open='political']"); page.click("#dock [data-group='Government & control']"); page.wait_for_timeout(200)
        rep.check(js("() => !document.querySelector('#pmenu .pm-foot button')"), "the metric menu's footer has no Clear button")
        # Transport: not available yet; nothing can be ticked
        page.click("#dock [data-open='transport']"); page.wait_for_timeout(100)
        rep.check("not available yet" in js("() => document.querySelector('#dock [data-open=transport]').textContent").lower(), "Transport says “not available yet”")
        page.click("#dock [data-group='Planned']"); page.wait_for_timeout(150)
        rep.check(js("() => [...document.querySelectorAll('#pmenu input')].every(i => i.disabled)"), "Transport's planned metrics can't be ticked")
        # a metric before its data starts: greyed, "Starts in 1998"
        js("() => AtlasDebug.mapOnly(['control'])"); js("() => AtlasDebug.setDate('1990-06-01')")
        page.click("#dock [data-open='economic']"); page.click("#dock [data-group='Output & growth']"); page.wait_for_timeout(200)
        row = js("() => { const i = document.getElementById('cb-gdp_per_head'); return { dis: i.disabled, text: i.closest('.crow').textContent, title: i.closest('.crow').title }; }")
        rep.check(row["dis"] and "Starts in 1998" in row["text"], f"GDP per head in 1990 is greyed: “{row['title']}”")
        # no data for wards
        js("() => AtlasDebug.setDate('2020-06-01')"); js("() => AtlasDebug.setLevel('ward')"); page.wait_for_timeout(300)
        row = js("() => { const i = document.getElementById('cb-gdp_per_head'); return { dis: i.disabled, title: i.closest('.crow').title }; }")
        rep.check(row["dis"] and "wards" in row["title"].lower(), f"GDP per head for wards is greyed: “{row['title']}”")
        # not meaningful at this level (the levels rule from 1.7)
        js("() => AtlasDebug.setLevel('council')"); page.wait_for_timeout(200)
        page.click("#dock [data-open='political']"); page.click("#dock [data-group='Government & control']"); page.wait_for_timeout(200)
        row = js("() => { const i = document.getElementById('cb-mp_tenure'); return { dis: i.disabled, title: i.closest('.crow').title }; }")
        rep.check(row["dis"] and row["title"] != "", f"MP's years in the seat is greyed for councils: “{row['title']}”")
        # Areas menu: boundary sets with no data for what's on the map are marked (still selectable)
        js("() => { AtlasDebug.setLevel('auto'); AtlasDebug.mapOnly(['gdp_per_head']); }")
        page.click("#browse-btn"); page.wait_for_timeout(200)
        r = js("() => { const row = document.querySelector('#lvpick input[data-lv=ward]').closest('.lvrow'); return { nd: !!row.querySelector('.ndtag'), dis: row.querySelector('input').disabled }; }")
        rep.check(r["nd"] and not r["dis"], "Areas: wards are marked “no data for what's on the map” but stay selectable")
        page.keyboard.press("Escape")
        # search: places with no data for what's on the map get a muted tag
        page.fill("#search", "Abbey"); page.wait_for_timeout(300)
        r = js("() => [...document.querySelectorAll('#hits li[data-c]')].map(li => [li.querySelector('small').textContent, !!li.querySelector('.ndtag')])")
        rep.check(any(w and "Ward" in t for t, w in r), f"search: wards show a “no data” tag ({r[:3]})")
        page.fill("#search", ""); page.keyboard.press("Escape")
        # Analyse: greyed methods with reasons
        js("() => AtlasDebug.openAnalyse({ metrics: ['gdp_per_head'] })"); page.wait_for_timeout(500)
        r = js("() => { const b = document.querySelector('#analyse [data-anmethod=reg]'); return b ? { no: b.classList.contains('no'), title: b.title } : null; }")
        rep.check(r and r["no"] and "three numeric metrics" in r["title"], f"Analyse: Regression is greyed: “{r and r['title']}”")
        js("() => AtlasDebug.closeAll()")
        # Export: "Every year" greyed for metrics with one date only
        js("() => AtlasDebug.openExport({ metrics: ['c_good_health', 'c_owned'] })"); page.wait_for_timeout(300)
        r = js("() => { const b = document.querySelector('#export-dlg [data-et=years]'); return { dis: b.disabled, title: b.title }; }")
        rep.check(r["dis"], f"Export: “Every year” is greyed for Census metrics: “{r['title']}”")
        rep.check(not page.errors, "no console errors" + (f": {page.errors}" if page.errors else ""))
        page.context.close()
    rep.done()


if __name__ == "__main__":
    main()
