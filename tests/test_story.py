"""
Atlas 0.12.1: cards that tell a story you can go deeper into.   python tests/test_story.py

A trade product group (Markets › Exports by product › Machinery and transport) opens a card that says what's in it,
the biggest products, what moved, who buys it, ports, months and where in the UK, and each row goes a level deeper in
the same window (and back). Items with nothing behind them are flat (not clickable). The menu under a product group
offers What's in it (down to single products), Top 15, Who buys it, What moved most, Where in the UK. A measure's card
compares the place with where it sits, lists related measures and says what goes with it. Menus never show two
sections with the same name.
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from atlas_test import server, browser, open_atlas, Report

CARD = "() => [...document.querySelectorAll('.pcwin')].filter(w => !w.hidden).pop()"


def main():
    rep = Report("story")
    with server() as base, browser() as b:
        page = open_atlas(b, base, (1440, 1000), query="debug#app=markets"); js = page.evaluate; page.wait_for_timeout(3000)
        js("() => document.querySelectorAll('.apppanel [data-wmx]').forEach(b => b.click())")
        sp = js("async () => { const sp = await AtlasTradeStory.sectionSpec('exp', '7'); AtlasCard.open(sp); return sp.items.map(i => [i.k || '', (i.deep || []).length, i.size || '']); }"); page.wait_for_timeout(800)
        ks = [x[0] for x in sp]
        rep.check(all(k in ks for k in ["What's in it", "The biggest products", "What moved", "Who buys it", "Where it leaves the UK", "Month by month", "Where in the UK"]), f"a product group's card covers what, who, where, when and what moved ({ks})")
        rep.check(dict((x[0], x[1]) for x in sp)["The biggest products"] == 15, "…with the top 15 products, each a way deeper")
        rep.check(sum(1 for x in sp if x[2] == "half") >= 4, "…and smaller items side by side")
        t = js(f"() => ({CARD})().innerText")
        rep.check("of all UK goods exports" in t and "Jet engines" in t, "the lead says what share it is; products have plain names")
        rep.check(js(f"() => !({CARD})().querySelector('.pc-items > .pc-it:first-child .pc-k')"), "the lead has no needless kicker")
        # deeper and back
        js(f"() => {{ const w = ({CARD})(); const it = [...w.querySelectorAll('.pc-it')].find(d => /What's in it/.test(d.textContent)); it.open = true; [...it.querySelectorAll('.pc-dr')].find(b => /Vehicles/.test(b.textContent)).click(); }}"); page.wait_for_timeout(1500)
        t2 = js(f"() => ({CARD})().innerText")
        rep.check("Vehicles and parts" in t2 and "cars" in t2.lower() and "times what it sells" in t2, "a chapter opens in the same window: what's inside it, and the balance in words")
        js(f"() => {{ const w = ({CARD})(); const it = [...w.querySelectorAll('.pc-it')].find(d => /inside it/.test(d.textContent)); it.open = true; [...it.querySelectorAll('.pc-dr')][0].click(); }}"); page.wait_for_timeout(1500)
        rep.check("Cars" in js(f"() => ({CARD})().querySelector('.pc-pill').textContent"), "…and a product inside it, one more level down")
        js(f"() => ({CARD})().querySelector('[data-pcback]').click()"); page.wait_for_timeout(400)
        rep.check(js(f"() => ({CARD})().querySelector('.pc-pill').textContent") == "Vehicles and parts", "‹ Back returns to the level above")
        js(f"() => ({CARD})().querySelector('[data-pcfig]').click()"); page.wait_for_timeout(300)
        rep.check(js(f"() => !!({CARD})().querySelector('[data-pcfig]')"), "headline figures lead to the item behind them")
        # flat items
        js("() => AtlasCard.open({ title: 'Test', items: [{ h: 'Lead', more: '<p>x</p>' }, { k: 'Nothing behind it', h: 'Just a line' }] })"); page.wait_for_timeout(500)
        rep.check(js(f"() => {{ const w = ({CARD})(); const f = [...w.querySelectorAll('.pc-it')].pop(); return f.classList.contains('pc-flat') && f.tagName !== 'DETAILS'; }}"), "an item with nothing behind it is flat, not clickable")
        # the menu
        page.click("#appbar [data-apanel='trade']"); page.wait_for_timeout(500)
        js("() => [...document.querySelectorAll('#mega .mg-sec')].find(b => /Exports by product/.test(b.textContent)).click()"); page.wait_for_timeout(400)
        page.click("#mega .mg-items[data-depth='0'] .mg-go:has-text('Machinery and transport')"); page.wait_for_timeout(600)
        kids = js("() => [...document.querySelectorAll('#mega .mg-items[data-depth=\"1\"] .mg-l')].map(x => x.textContent)")
        rep.check(kids[:6] == ["Machinery and transport: the full story", "What's in it", "Top 15 products", "Who buys it", "What moved most", "Where in the UK"], f"under a product group: what's in it, top 15, who buys it, what moved, where in the UK ({kids[:6]})")
        page.locator("#mega .mg-items[data-depth='1'] .mg-go").nth(1).click(); page.wait_for_timeout(1500)
        page.locator("#mega .mg-items[data-depth='2'] .mg-go").nth(0).click(); page.wait_for_timeout(3000)
        deep = js("() => [...document.querySelectorAll('#mega .mg-items .mg-l')].map(x => x.textContent)")
        rep.check("Jet engines and gas turbines" in deep and "Computers" in deep, "…down to which machinery exactly (jet engines, computers…)")
        page.keyboard.press("Escape"); page.wait_for_timeout(200)
        dup = js("() => { const out = []; [...document.querySelectorAll('#appbar [data-apanel]')].forEach(b => { const s = AtlasMenu.specFor(b.dataset.apanel); if (!s || !s.sections) return; const l = s.sections.map(x => x.label); l.forEach((x, i) => { if (l.indexOf(x) !== i) out.push(b.dataset.apanel + ': ' + x); }); }); return out; }")
        rep.check(not dup, f"no menu has two sections with the same name ({dup})")
        # a measure's card
        page.goto(base + "/index.html?debug#app=health"); page.wait_for_timeout(3500)
        m = js("() => { const c = AtlasCtx.allCodesAt('council').find(c => AtlasCtx.nameOf(c) === 'Blackpool'); const sp = AtlasCard.metric('le_m', c); return sp.items.map(i => [i.k, String(i.h).replace(/<[^>]+>/g, ''), (i.deep || []).length]); }")
        mk = [x[0] for x in m]
        rep.check("lowest of" in m[0][1] and "since" in m[0][1], f"a measure's lead says where it ranks and which way it's going ({m[0][1]})")
        rep.check("Compared with" in mk and "What goes with it" in mk and any(k.startswith("More on") for k in mk), f"…compared with where it sits, related measures, and what goes with it ({mk})")
        gw = [x for x in m if x[0] == "What goes with it"][0]
        rep.check("Deprivation" in gw[1] and gw[2] >= 2, f"what goes with life expectancy: deprivation first ({gw[1]})")
        rep.check([x for x in m if x[0].startswith("Across the map")][0][2] >= 8, "every place in Across the map opens its own card")
        rep.check(not [e for e in page.errors if "favicon" not in e], f"no errors ({page.errors[:2]})")
    rep.done()


if __name__ == "__main__":
    main()
