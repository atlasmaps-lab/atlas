"""
Atlas 0.13: the workspace sidebar (Atlas design/workspace/Workspace (final).md). The board keeps its free layout; a 230 px
"In this project" list names every piece with its kind and ↻ on live ones; clicking one finds it on the board; Add makes
a Note, a Heading or a Map picture; a tracked figure shows its change on the last release and the next figure due; Tidy
glides the pieces into a grid.   python tests/test_ws_sidebar.py
"""
from atlas_test import server, browser, open_atlas, Report


def main():
    rep = Report("ws_sidebar")
    with server() as base, browser() as b:
        page = open_atlas(b, base, (1440, 900), query="debug#app=economic")
        js = page.evaluate
        page.wait_for_timeout(1500)
        js("() => { for (const k of Object.keys(localStorage)) if (k.startsWith('atlas-16-ws')) localStorage.removeItem(k); }")
        js("() => AtlasCard.open(AtlasCard.metric('gdp_per_head', 'E08000025'))"); page.wait_for_timeout(800)
        js("() => [...document.querySelectorAll('.pcwin')].filter(w => !w.hidden).pop().querySelector('.pc-lead [data-pczoom]').click()"); page.wait_for_timeout(300)
        js("() => document.querySelector('.pc-chart.pc-big [data-pcpin]').click()"); page.wait_for_timeout(400); js("() => document.getElementById('pc-zoomback').click()"); page.wait_for_timeout(300)
        page.click("#tabs [data-tab='ws']"); page.wait_for_timeout(800)
        s = js("""() => { const side = document.querySelector('#ws .ws-side'); return { w: side ? Math.round(side.getBoundingClientRect().width) : 0,
          rows: [...document.querySelectorAll('#ws .ws-oi')].map(x => ({ k: x.querySelector('.ws-kind').textContent, live: !!x.querySelector('.ws-live') })), adds: [...document.querySelectorAll('#ws .ws-adds button')].map(x => x.textContent) }; }""")
        rep.check(225 <= s["w"] <= 235, f"a 230 px sidebar sits beside the board ({s['w']})")
        rep.check(any(r["k"] == "Tracking" and r["live"] for r in s["rows"]), f"the tracked figure is listed as Tracking with ↻ ({s['rows']})")
        rep.check(s["adds"] == ["Note", "Heading", "Map picture"], f"Add: Note, Heading, Map picture ({s['adds']})")
        rel = js("() => (document.querySelector('#ws .wstrack-rel') || {}).textContent || ''")
        rep.check("last release" in rel and "Next: the figure for" in rel, f"the tracked figure shows its last release and what's next ({rel[:90]!r})")
        page.click("#ws .ws-adds [data-wshead]"); page.wait_for_timeout(500)
        page.click("#ws .ws-adds [data-wsnote]"); page.wait_for_timeout(500)
        kinds = js("() => [...document.querySelectorAll('#ws .ws-oi .ws-kind')].map(x => x.textContent)")
        rep.check("Heading" in kinds and "Note" in kinds and js("() => !!document.querySelector('#ws .wsheading')"), f"Heading and Note are added to the board and the list ({kinds})")
        js("() => document.querySelector('#ws .ws-oi').click()"); page.wait_for_timeout(400)
        sel = js("() => { const o = document.querySelector('#ws .ws-oi.on'); const w = document.querySelector('#ws .wsi.wsi-sel'); return !!o && !!w && o.dataset.wspick === w.dataset.wsi; }")
        rep.check(sel, "clicking a piece in the list selects it on the board")
        # scatter, then tidy: pieces glide (transition) and land in a grid
        js("() => document.querySelectorAll('#ws .wsi').forEach((el, i) => { el.style.left = (700 - i * 90) + 'px'; })")
        js("() => document.querySelector('#ws [data-wstidy]').click()"); page.wait_for_timeout(120)
        mid = js("() => ({ tr: getComputedStyle(document.querySelector('#ws .wsi')).transitionProperty, cls: !!document.querySelector('#ws .ws-tidying') })")
        page.wait_for_timeout(700)
        ys = js("() => JSON.parse(localStorage.getItem('atlas-16-ws')).projects[0].items.map(i => [i.x, i.y])")
        rep.check(mid["cls"] and "left" in mid["tr"], f"Tidy animates ({mid})")
        rep.check(ys[0] == [16, 16] and not js("() => !!document.querySelector('#ws .ws-tidying')"), f"…and lays the pieces out from the top left ({ys})")
        rep.check(not page.errors, f"no errors ({page.errors[:3]})")
        js("() => { for (const k of Object.keys(localStorage)) if (k.startsWith('atlas-16-ws')) localStorage.removeItem(k); }")
    rep.done()


if __name__ == "__main__":
    main()
