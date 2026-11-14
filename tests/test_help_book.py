"""
Atlas 0.13: Help as a handbook (Atlas design/help/Help (final).md): contents on the left in groups (Reading the map,
Analysis methods, Charts, Sources), one entry at a time with a kicker, title and rows (What it answers, What it needs,
Assumptions, When it misleads), a Try it box that opens Analyse, Related links; ⓘ links and search open an entry.
python tests/test_help_book.py
"""
from atlas_test import server, browser, open_atlas, Report


def main():
    rep = Report("help_book")
    with server() as base, browser() as b:
        page = open_atlas(b, base, (1440, 900)); js = page.evaluate
        page.wait_for_timeout(1500)
        js("() => AtlasCtx.openHelp ? AtlasCtx.openHelp() : document.getElementById('open-help').click()"); page.wait_for_timeout(600)
        s = js("() => ({ groups: [...document.querySelectorAll('.hbook .hng')].map(x => x.textContent), on: [...document.querySelectorAll('.hbook .hentry')].filter(x => getComputedStyle(x).display !== 'none').map(x => x.id), w: Math.round(document.querySelector('.hbook .hnav').getBoundingClientRect().width) })")
        rep.check(s["groups"] == ["Reading the map", "Analysis methods", "Charts", "Sources"], f"contents in groups ({s['groups']})")
        rep.check(len(s["on"]) == 1 and 250 <= s["w"] <= 270, f"one entry at a time, contents 260 px ({s['on']}, {s['w']})")
        js("() => document.querySelector('.hbook .hnav [data-hgo=\"help-m-rel\"]').click()"); page.wait_for_timeout(400)
        e = js("""() => { const x = document.getElementById('help-m-rel'); return { on: getComputedStyle(x).display !== 'none', kick: x.querySelector('.hkick').textContent, rows: [...x.querySelectorAll('dt')].map(d => d.textContent),
          tri: !!x.querySelector('.htry [data-hexample]'), rel: [...x.querySelectorAll('.hrel [data-hgo]')].map(a => a.textContent), navOn: document.querySelector('.hbook .hnav a.on').dataset.hgo }; }""")
        rep.check(e["on"] and e["navOn"] == "help-m-rel" and "Analysis methods" in e["kick"], "choosing an entry shows it and marks it in the contents")
        rep.check(e["rows"] == ["What it answers", "What it needs", "Assumptions", "When it misleads"], f"rows: answers, needs, assumptions, misleads ({e['rows']})")
        rep.check(e["tri"] and len(e["rel"]) >= 2, f"a Try it box and Related links ({e['rel']})")
        js("() => document.querySelector('#help-m-rel .hrel [data-hgo]').click()"); page.wait_for_timeout(300)
        rep.check(js("() => document.querySelector('.hbook .hnav a.on').dataset.hgo") != "help-m-rel", "a Related link opens that entry")
        rep.check(js("() => document.querySelectorAll('#help-sources li').length") >= 5, "Sources lists where the data comes from")
        js("() => document.querySelector('#tabview [data-tback]').click()"); page.wait_for_timeout(300)
        page.fill("#search", "what does correlation mean"); page.wait_for_timeout(700)
        rep.check("Help" in js("() => [...document.querySelectorAll('#hits li.sec')].map(x => x.textContent)"), "search finds Help entries (“what does correlation mean”)")
        js("() => { const li = [...document.querySelectorAll('#hits li.xhit')].find(x => /^Help/.test(x.querySelector('i').textContent)); li.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); }"); page.wait_for_timeout(600)
        rep.check(js("() => !document.getElementById('tabview').hidden && [...document.querySelectorAll('.hbook .hentry')].filter(x => getComputedStyle(x).display !== 'none').length === 1"), "…and opens it")
        rep.check(not page.errors, f"no errors ({page.errors[:3]})")
    rep.done()


if __name__ == "__main__":
    main()
