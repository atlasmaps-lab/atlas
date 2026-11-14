"""
Atlas 0.13: the final card (Atlas design/cards/Cards (final).md). Breadcrumb, masthead over a double rule, a range switch
that re-tells the card, kicker with thin rules, the lead (headline, summary, chart with highest green and lowest red and a
caption), three figures, sections that open in place, complete sortable lists with See all, a chart that enlarges and can
be pinned to the workspace.   python tests/test_cards_final.py
"""
from atlas_test import server, browser, open_atlas, Report

CARD = "() => [...document.querySelectorAll('.pcwin')].filter(w => !w.hidden).pop().querySelector('.pcard')"


def main():
    rep = Report("cards_final")
    with server() as base, browser() as b:
        page = open_atlas(b, base, (1440, 900), query="debug#app=economic")
        js = page.evaluate
        page.wait_for_timeout(1500)
        js("() => AtlasCard.open(AtlasCard.metric('gdp_per_head', 'E08000025'))"); page.wait_for_timeout(900)
        s = js(f"""() => {{ const c = ({CARD})(); return {{
          crumbs: !!c.querySelector('.pc-crumbs nav span'), rule: getComputedStyle(c.querySelector('.pc-top')).borderBottomStyle,
          ranges: [...c.querySelectorAll('.pc-ranges button')].map(b => b.textContent), on: (c.querySelector('.pc-ranges button.on') || {{}}).textContent,
          kick: !!c.querySelector('.pc-kick .vr'), head: !!c.querySelector('.pc-leadbox .pc-head'), hi: !!c.querySelector('.pc-lead .ach .hi'), lo: !!c.querySelector('.pc-lead .ach .lo'),
          cap: (c.querySelector('.pc-cap') || {{}}).textContent || '', figs: c.querySelectorAll('.pc-figs .pc-fig').length, dots: /•/.test(c.innerText) }}; }}""")
        rep.check(s["crumbs"], "a breadcrumb says where you are")
        rep.check(s["rule"] == "double", "the masthead sits over a double rule")
        rep.check(len(s["ranges"]) >= 2 and "5 years" in s["ranges"], f"a range switch is offered where the data reaches back ({s['ranges']})")
        rep.check(s["kick"], "the kicker uses thin vertical rules")
        rep.check(s["head"] and s["hi"] and s["lo"], "the lead has a headline and a chart with the highest and lowest marked")
        rep.check("Highest" in s["cap"] and "lowest" in s["cap"], f"the caption names the highest and lowest ({s['cap'][:80]!r})")
        rep.check(s["figs"] >= 2, "key figures sit under the lead")
        rep.check(not s["dots"], "no dot separators")
        n0 = js(f"() => ({CARD})().querySelectorAll('.pc-lead .ach path[stroke]').length")
        js(f"() => [...({CARD})().querySelectorAll('.pc-ranges button')].find(b => b.textContent === '5 years').click()"); page.wait_for_timeout(700)
        on = js(f"() => ({CARD})().querySelector('.pc-ranges button.on').textContent")
        rep.check(on == "5 years", "choosing 5 years re-tells the card for 5 years")
        span = js(f"""() => {{ const t = [...({CARD})().querySelectorAll('.pc-lead .ach text')].map(x => +x.textContent).filter(x => x > 1900 && x < 2100); return t.length ? Math.max(...t) - Math.min(...t) : 0; }}""")
        rep.check(0 < span <= 6, f"…and the chart covers about five years ({span})")
        # lists: complete, sortable, See all
        js(f"() => ({CARD})().querySelectorAll('.pc-secs .pc-it').forEach(d => d.open = true)"); page.wait_for_timeout(400)
        L = js(f"""() => {{ const ul = [...({CARD})().querySelectorAll('.pc-deep')].find(u => u.children.length > 15); if (!ul) return null;
          const btn = ul.nextElementSibling; return {{ n: ul.children.length, hidden: [...ul.children].filter(li => li.hidden).length, see: btn && btn.textContent }}; }}""")
        if L:
            rep.check(L["hidden"] == L["n"] - 15 and L["see"] == f"See all {L['n']} ›", f"a long list shows 15, then See all {L['n']}")
        sorted_ok = js(f"""() => {{ const h = [...({CARD})().querySelectorAll('.pc-dhead')].find(x => x.querySelector('[data-pcsort=asc]')); if (!h) return null; h.querySelector('[data-pcsort=asc]').click();
          const v = [...h.nextElementSibling.children].map(li => +li.dataset.v); return v.every((x, i) => !i || x >= v[i - 1]) && h.nextElementSibling.children[0].querySelector('.pc-rk') != null; }}""")
        rep.check(sorted_ok is not False, "Smallest first sorts the whole list and keeps rank numbers")
        # enlarge and pin
        js(f"() => ({CARD})().querySelector('.pc-lead [data-pczoom]').click()"); page.wait_for_timeout(400)
        big = js("() => !!document.querySelector('.pc-chart.pc-big') && !document.getElementById('pc-zoomback').hidden")
        rep.check(big, "the chart enlarges over a backdrop")
        ws0 = js("() => JSON.parse(localStorage.getItem('atlas-16-ws') || '{}').projects ? JSON.parse(localStorage.getItem('atlas-16-ws')).projects[0].items.length : 0")
        js("() => document.querySelector('.pc-chart.pc-big [data-pcpin]').click()"); page.wait_for_timeout(500)
        ws1 = js("() => JSON.parse(localStorage.getItem('atlas-16-ws')).projects[0].items.filter(i => i.type === 'track').length")
        rep.check(ws1 >= 1, f"Pin to track puts a tracked figure in the workspace ({ws0} items before)")
        rep.check(not page.errors, f"no errors ({page.errors[:3]})")
    rep.done()


if __name__ == "__main__":
    main()
