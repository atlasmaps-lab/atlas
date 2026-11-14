"""
Atlas 0.13: the interactive key (Atlas design/mapcontrols/Map controls (final).md). Category keys are rows with a swatch,
name, a bar that fills in, the figure and its share; clicking a row picks that category out on the map (the rest fade)
and clicking again shows everything. Trade route regions do the same for the routes.   python tests/test_key.py
"""
from atlas_test import server, browser, open_atlas, Report


def main():
    rep = Report("key")
    with server() as base, browser() as b:
        page = open_atlas(b, base, (1440, 900), query="debug#app=politics")
        js = page.evaluate
        page.wait_for_timeout(1500)
        mid = js("() => 'ge_winner'")
        js(f"() => AtlasDebug.mapOnly(['{mid}'])"); page.wait_for_timeout(2500)
        r = js("""() => { const rows = [...document.querySelectorAll('#legend .keyr .key-r')]; return { n: rows.length, bars: rows.filter(x => x.querySelector('.key-bar i')).length,
          figs: rows.filter(x => /\\d/.test((x.querySelector('.key-v') || {}).textContent || '')).length, share: rows.reduce((a, x) => a + (parseInt((x.querySelector('.key-s') || {}).textContent) || 0), 0) }; }""")
        rep.check(r["n"] >= 2, f"the category key is rows ({mid}: {r['n']})")
        rep.check(r["bars"] == r["n"] and r["figs"] == r["n"], "each row has a bar and a figure")
        rep.check(95 <= r["share"] <= 105, f"the shares add up to about 100% ({r['share']})")
        dims = "() => { const st = AtlasDebug.state; return document.querySelectorAll('#legend .key-r.on').length; }"
        js("() => document.querySelector('#legend .keyr .key-r').click()"); page.wait_for_timeout(600)
        on = js("() => ({ on: document.querySelectorAll('#legend .key-r.on').length, picking: !!document.querySelector('#legend .keyr.picking'), iso: !!AtlasDebug.state.iso })")
        rep.check(on["on"] == 1 and on["picking"] and on["iso"], f"clicking a row picks it out ({on})")
        js("() => document.querySelector('#legend .keyr .key-r.on').click()"); page.wait_for_timeout(600)
        rep.check(js("() => !AtlasDebug.state.iso && !document.querySelector('#legend .key-r.on')"), "clicking it again shows everything")
        page.focus("#legend .keyr .key-r"); page.keyboard.press("Enter"); page.wait_for_timeout(500)
        rep.check(js("() => !!AtlasDebug.state.iso"), "a row works from the keyboard")
        js("() => document.querySelector('#legend .keyr .key-r.on').click()")
        # trade routes
        page2 = open_atlas(b, base, (1440, 900), query="debug#app=markets")
        js2 = page2.evaluate
        page2.wait_for_timeout(1500)
        js2("() => AtlasDebug.mapOnly(['trade_routes_exp'])"); page2.wait_for_timeout(3500)
        t = js2("() => [...document.querySelectorAll('#legend [data-trrg]')].map(x => ({ n: x.dataset.trrg, v: (x.querySelector('.key-v') || {}).textContent }))")
        rep.check(len(t) >= 4 and all(x["v"] and "£" in x["v"] for x in t), f"route regions are rows with their trade in £ ({t[:2]})")
        js2("() => document.querySelector('#legend [data-trrg]').click()"); page2.wait_for_timeout(500)
        op = js2("() => JSON.stringify(AtlasDebug.map.getPaintProperty('trade-exp', 'line-opacity'))") if js2("() => !!AtlasDebug.map") else None
        rep.check(js2("() => document.querySelectorAll('#legend [data-trrg].on').length") == 1 and (op is None or "case" in op), f"clicking a region picks out its routes ({op})")
        js2("() => document.querySelector('#legend [data-trrg].on').click()"); page2.wait_for_timeout(400)
        rep.check(js2("() => !document.querySelector('#legend [data-trrg].on')"), "clicking again shows every route")
        rep.check(not page.errors and not page2.errors, f"no errors ({(page.errors + page2.errors)[:3]})")
    rep.done()


if __name__ == "__main__":
    main()
