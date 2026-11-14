"""
Atlas 0.13: Compare's four views (Atlas design/compare/Compare (final).md): Table (today's), Side by side (a small chart
per measure in the same place order, the UK dashed, one plain line), Head to head (two places A and B, mirrored bars, a
sentence per measure; click a chip to swap in B), Over time (a line per place, £ or 2010 = 100, end labels apart).
Each place keeps its colour.   python tests/test_compare_views.py
"""
from atlas_test import server, browser, open_atlas, Report


def main():
    rep = Report("compare_views")
    with server() as base, browser() as b:
        page = open_atlas(b, base, (1440, 900), query="debug#app=economic")
        js = page.evaluate
        page.wait_for_timeout(2000)
        js("() => { AtlasDebug.select(['E06000023', 'E08000025', 'E08000035']); AtlasDebug.openCmp(); }"); page.wait_for_timeout(500)
        rep.check(js("() => [...document.querySelectorAll('#cmp [data-cmview]')].map(b => b.textContent).join('|')") == "Table|Side by side|Head to head|Over time", "a switch with the four views")
        rep.check(js("() => document.querySelectorAll('#cmp .cmv-tr-row:not(.ref):not(.tot)').length") == 3 and js("() => !!document.querySelector('#cmp .cmv-tr-row.ref')"), "Table: a row per place, values with bars, the UK for reference")
        cols = js("() => [...document.querySelectorAll('#cmp [data-cmab]')].map(c => c.style.getPropertyValue('--pc'))")
        rep.check(len(cols) == 3 and len(set(cols)) == 3, f"each place has its own colour ({cols})")
        js("() => document.querySelector('#cmp [data-cmview=side]').click()"); page.wait_for_timeout(500)
        s = js("() => ({ cards: document.querySelectorAll('#cmp .cmv-card').length, bars: document.querySelectorAll('#cmp .cmv-card .cmv-r').length, uk: document.querySelectorAll('#cmp .cmv-uk').length, line: (document.querySelector('#cmp .cmv-card .cmv-line') || {}).textContent || '' })")
        rep.check(s["cards"] >= 1 and s["bars"] >= 3, f"Side by side: a small chart per measure ({s['cards']} measures)")
        rep.check(s["uk"] >= 1 and "highest" in s["line"], f"…with the UK dashed and one plain line ({s['line'][:80]!r})")
        js("() => document.querySelector('#cmp [data-cmview=h2h]').click()"); page.wait_for_timeout(500)
        h = js("() => ({ ab: [...document.querySelectorAll('#cmp .cmv-ab')].map(x => x.textContent), rows: document.querySelectorAll('#cmp .cmv-mirror').length, sent: [...document.querySelectorAll('#cmp .cmv-hr .cmv-line')].map(x => x.textContent) })")
        rep.check(h["ab"] == ["A", "B"] and h["rows"] >= 1, f"Head to head: A and B with mirrored bars ({h['ab']}, {h['rows']})")
        rep.check(h["sent"] and all(("times" in x or "higher than" in x or "level" in x or "Not available" in x) for x in h["sent"]) and not any("That is" in x for x in h["sent"]), f"…a sentence per measure ({h['sent'][:1]})")
        b0 = js("() => document.querySelector('.cmv-hh span:last-child').textContent")
        js("() => [...document.querySelectorAll('#cmp [data-cmab]')].find(c => !c.querySelector('.cmv-ab')).click()"); page.wait_for_timeout(400)
        rep.check(js("() => document.querySelector('.cmv-hh span:last-child').textContent") != b0, "clicking a place swaps it in as B")
        js("() => document.querySelector('#cmp [data-cmview=time]').click()"); page.wait_for_timeout(600)
        t = js("""() => { const ends = [...document.querySelectorAll('#cmp .cmv-end')].map(e => +e.getAttribute('y')).sort((a, b) => a - b);
          return { lines: document.querySelectorAll('#cmp .cmv-ln').length, uk: !!document.querySelector('#cmp .cmv-ln.uk'), gap: ends.slice(1).every((y, i) => y - ends[i] >= 13.9), n: ends.length }; }""")
        rep.check(t["lines"] >= 2, f"Over time: a line per place, and the UK where it has one ({t['lines']}, UK {t['uk']})")
        rep.check(t["gap"] and t["n"] == t["lines"], "…with end labels that never overlap")
        js("() => document.querySelector('#cmp [data-cmidx=\"1\"]').click()"); page.wait_for_timeout(400)
        rep.check("2010 = 100" in js("() => document.querySelector('#cmp .cmv-tctl').textContent") and "starts at 100" in js("() => document.querySelector('#cmp .cmv-line').textContent"), "…as £ or 2010 = 100")
        js("() => document.querySelector('#cmp [data-cmview=table]').click()"); page.wait_for_timeout(400)
        rep.check(js("() => !!document.querySelector('#cmp [data-kmk]')") and js("() => !!document.querySelector('#cmp .cmp-pat')"), "back on Table: Make table/chart and Patterns are still there")
        rep.check(not page.errors, f"no errors ({page.errors[:3]})")
    rep.done()


if __name__ == "__main__":
    main()
