"""
Atlas 0.13: panels as tiles (Atlas design/panels/Panels (final).md). The panel's width sets the layout (three columns from
1040 px, two from 760 px, one below); the Summary is the hero tile; each closed section is a tile with its first sentence
and first rows; a tile grows to fill the panel with "‹ All of …" to go back; nothing is dropped.
python tests/test_panels_tiles.py
"""
from atlas_test import server, browser, open_atlas, Report

BODY = "[...document.querySelectorAll('.apppanel')].find(w => !w.hidden).querySelector('.wm-body')"


def main():
    rep = Report("panels_tiles")
    with server() as base, browser() as b:
        page = open_atlas(b, base, (1600, 1000), query="debug#app=markets", sections_open=False)
        js = page.evaluate
        page.wait_for_timeout(1500)
        js("() => AtlasMenu.full('trade')"); page.wait_for_timeout(1500)
        n0 = js(f"() => {BODY}.querySelectorAll('.ed-sec').length")
        def width(w):
            js(f"() => {{ const p = [...document.querySelectorAll('.apppanel')].find(w => !w.hidden); p.style.width = '{w}px'; p.style.left = '60px'; }}"); page.wait_for_timeout(500)
            return js(f"() => {BODY}.dataset.cols")
        rep.check(width(1200) == "3", "a wide panel has three columns")
        rep.check(width(900) == "2", "a middling panel has two")
        rep.check(width(560) == "1", "a narrow panel is one scrolling column")
        width(900)
        s = js(f"""() => {{ const b = {BODY}; const hero = b.querySelector('.ed-summary'); const t = [...b.querySelectorAll(':scope > .ed-sec:not(.ed-summary):not([open])')];
          return {{ hero: !!hero && [...b.querySelectorAll(':scope > .ed-sec')][0] === hero && Math.abs(hero.getBoundingClientRect().left - b.getBoundingClientRect().left) < 30, tiles: t.length, prev: t.filter(x => x.querySelector('.ed-tprev') && getComputedStyle(x.querySelector('.ed-tprev')).display !== 'none').length }}; }}""")
        rep.check(s["hero"], "the Summary is the hero tile")
        rep.check(s["tiles"] >= 2 and s["prev"] >= 1, f"closed sections are tiles with a preview ({s})")
        js(f"() => {BODY}.querySelector(':scope > .ed-sec:not(.ed-summary):not([open]) > summary').click()"); page.wait_for_timeout(500)
        one = js(f"() => {{ const b = {BODY}; const cur = b.querySelector('.ed-cur'); return {{ one: b.classList.contains('ed-one'), cur: !!cur, back: cur && getComputedStyle(cur.querySelector('.ed-tback')).display !== 'none', others: [...b.querySelectorAll(':scope > .ed-sec')].filter(x => x !== cur && getComputedStyle(x).display !== 'none').length }}; }}")
        rep.check(one["one"] and one["cur"] and one["back"] and one["others"] == 0, f"a tile grows to fill the panel, with ‹ All of … ({one})")
        js(f"() => {BODY}.querySelector('.ed-cur .ed-tback').click()"); page.wait_for_timeout(400)
        rep.check(js(f"() => !{BODY}.classList.contains('ed-one')"), "‹ All of … goes back to every tile")
        rep.check(js(f"() => {BODY}.querySelectorAll('.ed-sec').length") == n0, "no section is dropped")
        rep.check(not page.errors, f"no errors ({page.errors[:3]})")
    rep.done()


if __name__ == "__main__":
    main()
