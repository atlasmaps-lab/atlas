"""
Atlas 0.13.1 (Mo's notes, 14 Nov): Atlas opens on a plain map in every app; the first measure put on the map fills the
areas; the time bar's range can fit only the dates every measure on the map has data for; several measures share the
bar as rows; an event's diamond opens what happened and what each measure did around it; every panel has a summary,
leads on its sections and tables as rows with bars and a sort; category cards show how the map divides and how that
changed.   python tests/test_0131.py
"""
from atlas_test import server, browser, open_atlas, Report

APPS = ["politics", "economic", "markets", "social", "health", "transport", "environment", "resilience"]


def main():
    rep = Report("0131")
    with server() as base, browser() as b:
        for app in APPS + [None]:
            page = open_atlas(b, base, (1440, 900), plain=True, query="debug" + (f"#app={app}" if app else ""))
            page.wait_for_timeout(1800)
            n = page.evaluate("() => Object.values(AtlasDebug.PS.mapped).reduce((a, v) => a + v.length, 0)")
            rep.check(n == 0, f"{app or 'Multi'} opens with nothing on the map ({n})")
            if app == "economic":
                js = page.evaluate
                js("() => AtlasDebug.mapOnly(['gdp_per_head', 'population'])"); page.wait_for_timeout(1200)
                ch = js("() => { const s = document.querySelector('#legend [data-as=\"gdp_per_head\"]'); return s ? s.value : null; }")
                rep.check(ch in ("shade", "diverge", "hue"), f"the first measure fills the areas ({ch})")
                js("() => document.getElementById('tb-more').click()"); page.wait_for_timeout(800)
                r = js("""() => ({ rows: document.querySelectorAll('#tb-pop .tbx-slab').length, rng: [...document.querySelectorAll('#tb-pop [data-tbrange]')].map(x => x.textContent),
                  on: (document.querySelector('#tb-pop [data-tbrange].on') || {}).dataset, cap: document.querySelector('#tb-pop .tbx-cap').textContent })""")
                rep.check(r["rows"] == 2, f"two measures are two rows on the bar ({r['rows']})")
                rep.check("Where all have data" in r["rng"] and "Where any has data" in r["rng"], f"the range offers all / any ({r['rng']})")
                rep.check("GDP per head" in r["cap"] and "Population" in r["cap"], "the caption names both measures")
                lo_all = js("() => AtlasDebug.TB.lo")
                js("() => document.querySelector('#tb-pop [data-tbrange=\"any\"]').click()"); page.wait_for_timeout(500)
                lo_any = js("() => AtlasDebug.TB.lo")
                rep.check(lo_any <= lo_all, f"'any' reaches at least as far back as 'all' ({lo_any} ≤ {lo_all})")
                js("() => document.querySelector('#tb-pop [data-tbrange=\"all\"]').click()"); page.wait_for_timeout(300)
                js("() => document.querySelector('#tb-pop .tbx-dia').click()"); page.wait_for_timeout(400)
                e = js("() => { const p = document.querySelector('#tb-pop .tbx-evp'); return p && !p.hidden ? { t: p.querySelector('.tbx-evt').textContent, li: p.querySelectorAll('li').length, go: !!p.querySelector('[data-tbevgo2]') } : null; }")
                rep.check(e and e["li"] == 2 and e["go"], f"a diamond opens its event with each measure around it ({e})")
            if app == "politics":
                js = page.evaluate
                for pid in ["protests", "projection", "election"]:
                    js("() => AtlasDebug.closeAll && AtlasDebug.closeAll()"); js(f"() => AtlasCtx.openPanel('{pid}')"); page.wait_for_timeout(1500)
                    r = js("""() => { const w = [...document.querySelectorAll('.wm-body')].filter(x => x.offsetParent).pop(); return { h: !!w.querySelector('.ed-h'), f: w.querySelectorAll('.ed-f, .tr-head > div').length,
                      secs: w.querySelectorAll(':scope > details.ed-sec:not(.ed-summary)').length, leads: w.querySelectorAll(':scope > details.ed-sec .ed-tlead').length, old: w.querySelectorAll('table:not(.ed-rtab)').length }; }""")
                    rep.check(r["h"] and r["f"] >= 2 and r["secs"] >= 1 and r["leads"] == r["secs"] and r["old"] == 0, f"{pid}: summary, figures, sections with leads, rows ({r})")
                js("() => AtlasDebug.closeAll && AtlasDebug.closeAll()"); js("() => AtlasCard.open(AtlasCard.metric('control'))"); page.wait_for_timeout(1500)
                c = js("() => { const w = [...document.querySelectorAll('.pcwin')].filter(x => !x.hidden).pop(); return { h: w.querySelector('.pc-head').textContent, tree: !!w.querySelector('.pc-tree'), over: /Over time/.test(w.textContent) }; }")
                rep.check("No figure" not in c["h"] and c["tree"] and c["over"], f"Controlling party: how the map divides and how it changed ({c['h'][:60]})")
            rep.check(not [x for x in page.errors if "request failed" not in x], f"{app or 'Multi'}: no errors ({page.errors[:2]})")
            page.context.close()
    rep.done()


if __name__ == "__main__":
    main()
