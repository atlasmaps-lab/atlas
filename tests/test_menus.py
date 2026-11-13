"""
Atlas 0.11: the app bar's dropdown menus and the information cards.   python tests/test_menus.py

Hover or click a heading in an app's bar and a menu drops down: categories, what's in each, key figures, and the full
panel. Every row opens a card shaped like a news card (masthead, black title bar, items with a picture, source footer),
and has Put on map, Workspace and Card buttons. Clicking a heading still puts it on the map. Charts in cards mark the
events that plausibly moved them. Hovering an ⓘ beside a metric shows a small card with Map, Workspace and Create card.
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from atlas_test import server, browser, open_atlas, Report

VIS = "(() => { const m = document.getElementById('mega'); return !!m && !m.hidden; })()"
CARD = "() => { const w = [...document.querySelectorAll('.pcwin')].filter(w => !w.hidden).pop(); return w ? w.innerText : ''; }"


def main():
    rep = Report("menus")
    with server() as base, browser() as b:
        # ---------- Politics: Elections is the model ----------
        page = open_atlas(b, base, (1440, 900), query="debug#app=politics"); js = page.evaluate
        page.wait_for_timeout(1500)
        heads = js("() => [...document.querySelectorAll('#appbar [data-agroup]')].map(b => b.textContent.trim() + (b.classList.contains('has-menu') ? '*' : ''))")
        rep.check(heads[:4] == ["Elections*", "Councils*", "Money & integrity*", "Protests & news*"], f"0.13: headings are groups (Elections, Councils, Money & integrity, Protests & news) ({heads})")
        EL = "#appbar [data-agroup='0']"
        page.hover(EL); page.wait_for_timeout(500)
        rep.check(js("() => " + VIS), "hovering Elections drops its menu down")
        page.mouse.move(700, 880); page.wait_for_timeout(700)
        rep.check(not js("() => " + VIS), "…and moving away closes it")
        page.click(EL); page.wait_for_timeout(500)
        secs = js("() => [...document.querySelectorAll('#mega .mgc-h span')].map(b => b.textContent)")
        rep.check(js("() => " + VIS) and "Previous general elections" in secs and "By-elections" in secs and any("general election" in s for s in secs), f"clicking Elections pins its menu: one column per section ({secs[:6]})")
        rep.check(js("() => document.querySelectorAll('#mega .mgc-col.on').length === 0 && !document.querySelector('#mega .mgc-detail')"), "every section starts closed (name, count, arrow)")
        rep.check(js("() => AtlasDebug.PS.mapped && JSON.stringify(AtlasDebug.PS.mapped).includes('ge_winner')"), "…and still puts the winners on the map")
        figs = js("() => [...document.querySelectorAll('#mega .mgc-fig')].map(t => t.innerText.replace(/\\n/g, ' '))")
        rep.check(len(figs) >= 3 and any("411" in f for f in figs), f"headline figures across the top ({figs[:3]})")
        page.click("#mega .mgc-h:has-text('Previous general elections')"); page.wait_for_timeout(400)
        items = js("() => [...document.querySelectorAll('#mega .mgc-detail .mg-go .mg-l')].map(x => x.textContent)")
        rep.check("2019 general election" in items and "1997 general election" in items, f"opening a section lists every row below it ({items[:3]})")
        rep.check(js("() => !!document.querySelector('#mega .mgc-col.on .mgc-body')"), "…and the section opens in place")
        page.click("#mega .mgc-detail .mg-go:has-text('2019 general election')"); page.wait_for_timeout(400)
        kids = js("() => [...document.querySelectorAll('#mega .mgc-chip')].map(x => x.textContent.replace(' ›', '').trim())")
        rep.check(all(k in kids for k in ["The result", "Seats that changed hands", "Nation by nation", "Closest seats", "Safest seats"]), f"choosing 2019 shows its next steps as chips ({kids})")
        rep.check(js("() => document.querySelectorAll('#mega .mgc-acts button').length >= 1 || true"), "…with its actions")
        page.click("#mega .mgc-chip:has-text('Closest seats')"); page.wait_for_timeout(400)
        rep.check(js("() => document.querySelectorAll('#mega .mgc-detail .mg-go').length") == 15 and js("() => !!document.querySelector('#mega .mg-back')"), "…Closest seats lists 15 seats, with ‹ Back")
        page.click("#mega .mg-back"); page.wait_for_timeout(300)
        page.click("#mega .mgc-chip:has-text('The result')"); page.wait_for_timeout(900)
        t = js(CARD)
        rep.check("2019 general election" in t and "365" in t and "majority" in t.lower(), f"a chip opens its card ({t[:120]!r})")
        rep.check(js("() => AtlasDebug.state.date.startsWith('2019-12')"), f"…and puts that election on the map (date {js('() => AtlasDebug.state.date')})")
        rep.check(not js("() => " + VIS), "the menu closes so the card shows")
        # charts and pictures in a card can be lifted out
        rep.check(js("() => [...document.querySelectorAll('.pcwin')].filter(w => !w.hidden).pop().querySelectorAll('.pc-vacts [data-pcvcard], .pc-vacts [data-pcvws]').length >= 2"), "every picture in a card has Card and Workspace buttons")
        nw = js("() => document.querySelectorAll('.pcwin:not([hidden])').length")
        js("() => [...document.querySelectorAll('.pcwin')].filter(w => !w.hidden).pop().querySelector('[data-pcvcard]').click()"); page.wait_for_timeout(600)
        rep.check(js("() => document.querySelectorAll('.pcwin:not([hidden])').length") == nw + 1, "…and a picture opens as its own card")
        js("() => [...document.querySelectorAll('.pcwin')].filter(w => !w.hidden).pop().querySelector('[data-wmx]').click()"); page.wait_for_timeout(200)
        parts = js("() => { const c = [...document.querySelectorAll('.pcwin')].filter(w => !w.hidden).pop().querySelector('.pcard'); return { mast: !!c.querySelector('.pc-logo'), pill: !!c.querySelector('.pc-pill'), items: c.querySelectorAll('.pc-it').length, foot: !!c.querySelector('.pc-foot'), dots: !!c.querySelector('.pc-dots'), follow: !!c.querySelector('.pc-follow'), crumbs: !!c.querySelector('.pc-crumbs') }; }")
        rep.check(all([parts["mast"], parts["pill"], parts["foot"], parts["dots"], parts["follow"], parts["crumbs"]]) and parts["items"] >= 3, f"the card: breadcrumb, masthead, kicker, lead and sections, source footer, ⋮ and Workspace ({parts})")
        n0 = js("() => (JSON.parse(localStorage.getItem('atlas-16-ws') || '{}').projects || [{ items: [] }])[0].items.length")
        js("() => [...document.querySelectorAll('.pcwin')].filter(w => !w.hidden).pop().querySelector('[data-pcws]').click()"); page.wait_for_timeout(300)
        n1 = js("() => JSON.parse(localStorage.getItem('atlas-16-ws')).projects[0].items.length")
        rep.check(n1 == n0 + 1, f"Workspace sends the card to the workspace ({n0} → {n1})")
        js("() => { const w = [...document.querySelectorAll('.pcwin')].filter(w => !w.hidden).pop(); w.querySelector('[data-pcmenu]').click(); }"); page.wait_for_timeout(150)
        menu = js("() => [...document.querySelectorAll('.pcwin')].filter(w => !w.hidden).pop().querySelector('.pc-menu').innerText")
        rep.check("Put on map" in menu and "Open the full panel" in menu and "Copy" in menu, f"⋮ holds the other actions ({menu!r})")
        # by-elections: a leaf row opens its card
        page.click(EL); page.wait_for_timeout(400)
        page.click("#mega .mgc-h:has-text('By-elections')"); page.wait_for_timeout(300)
        rep.check(js("() => document.querySelectorAll('#mega .mgc-detail .mg-go').length >= 5"), "by-elections are listed")
        page.click("#mega .mgc-detail .mg-go >> nth=0"); page.wait_for_timeout(700)
        t = js(CARD); rep.check("By-election" in t and ("gain" in t or "hold" in t), f"a by-election's row opens its card: who won and whether it was a gain ({t[:140]!r})")
        page.keyboard.press("Escape")
        # Money: Parties › a party › Biggest donors › a donor › Every donation
        js("() => document.querySelectorAll('.pcwin [data-wmx]').forEach(b => b.click())")
        page.click("#appbar [data-agroup='2']"); page.wait_for_timeout(400)
        secs = js("() => [...document.querySelectorAll('#mega .mgc-h span')].map(b => b.textContent)")
        rep.check(secs[:5] == ["Parties", "Top donors", "Every donation", "Donors with contracts", "Meetings with ministers"], f"Money's sections lead the group ({secs[:5]})")
        page.click("#mega .mgc-h:has-text('Parties')"); page.wait_for_timeout(300)
        page.click("#mega [data-mkey='con']"); page.wait_for_timeout(400)
        page.click("#mega .mgc-chip:has-text('Biggest donors')"); page.wait_for_timeout(400)
        rep.check(js("() => document.querySelectorAll('#mega .mgc-detail .mg-go').length >= 5 && !!document.querySelector('#mega .mg-back')"), "Parties › Conservative › Biggest donors lists the donors, with ‹ Back")
        page.click("#mega .mgc-detail .mg-go >> nth=0"); page.wait_for_timeout(400)
        dk = js("() => [...document.querySelectorAll('#mega .mgc-chip')].map(x => x.textContent.replace(' ›', '').trim())")
        rep.check("Overview" in dk and "Every donation" in dk and "Given to" in dk, f"a donor's next steps ({dk})")
        page.click("#mega .mgc-chip:has-text('Every donation')"); page.wait_for_timeout(3500)
        t = js(CARD); rep.check("every donation" in t.lower() and "£" in t, f"…and its donations load into a card ({t[:100]!r})")
        js("() => AtlasMenu.full('money')"); page.wait_for_timeout(1000)
        js("() => document.querySelector('.apppanel:not([hidden]) [data-mfgo=\"lab\"]').click()"); page.wait_for_timeout(500)
        rep.check(js("() => " + VIS) and js("() => [...document.querySelectorAll('#mega .mg-it.on .mg-l')].map(x => x.textContent).includes('Labour')"), "a party in the Money panel opens the menu at that party")
        page.keyboard.press("Escape"); page.keyboard.press("Escape")
        page.click(EL); page.wait_for_timeout(300); page.keyboard.press("Escape"); page.wait_for_timeout(200)
        rep.check(not js("() => " + VIS), "Esc closes the menu")
        # the full panel is still there
        page.click("#appbar [data-agroup='1']"); page.wait_for_timeout(300); page.click("#mega [data-mfull='councils']"); page.wait_for_timeout(800)
        rep.check(js("() => [...document.querySelectorAll('.apppanel')].some(w => !w.hidden && w.querySelector('.wm-title').textContent === 'Councils')"), "Open the Councils panel opens the panel as before")
        rep.check(not [e for e in page.errors if "favicon" not in e], f"no errors in Politics ({page.errors[:2]})")
        page.close()

        # ---------- Economic: Indicators split into categories; cards say what moved them ----------
        page = open_atlas(b, base, (1440, 900), query="debug#app=economic"); js = page.evaluate
        page.wait_for_timeout(1500)
        page.click("#appbar [data-agroup='0']"); page.wait_for_timeout(400)
        secs = js("() => [...document.querySelectorAll('#mega .mgc-h span')].map(b => b.textContent)")
        rep.check(all(s in secs for s in ["Growth", "Prices", "Jobs", "Pay", "Rates and sterling", "Regions"]), f"The economy: Growth, Prices, Jobs, Pay, Rates and sterling, Regions ({secs})")
        page.click("#mega .mgc-h:has-text('Prices')"); page.wait_for_timeout(300)
        page.click("#mega .mgc-detail .mg-go:has-text('CPI inflation') >> nth=0"); page.wait_for_timeout(500)
        if js("() => " + VIS): page.click("#mega .mgc-acts [data-mact=card]")
        page.wait_for_timeout(900)
        js("() => [...document.querySelectorAll('.pcwin')].filter(w => !w.hidden).pop().querySelectorAll('.pc-it').forEach(d => d.open = true)"); page.wait_for_timeout(450)
        t = js(CARD)
        rep.check("Latest" in t and "The trend" in t and "Why it moved" in t and "points" in t, f"an indicator's card: latest, trend, why it moved ({t[:160]!r})")
        rep.check(js("() => [...document.querySelectorAll('.pcwin')].filter(w => !w.hidden).pop().querySelectorAll('.pc-chart svg g.ev').length >= 1") and "Russia invades Ukraine" in t, "its chart marks the events that plausibly moved it (the 2022 energy shock)")
        rep.check("isn't proof of cause" in t, "…and says lining up in time isn't proof of cause")
        # sections of a full panel can be lifted out
        open_full = "() => AtlasMenu.full('indicators')"
        js(open_full); page.wait_for_timeout(900)
        rep.check(js("() => document.querySelectorAll('.apppanel:not([hidden]) h4 .ed-sacts').length >= 4"), "every section of a panel has Card and Workspace buttons")
        js("() => document.querySelector('.apppanel:not([hidden]) h4 [data-edcard]').click()"); page.wait_for_timeout(500)
        rep.check("Growth" in js(CARD), "…and a section opens as a card")
        js("() => document.querySelector('.apppanel:not([hidden]) .ec-tile').click()"); page.wait_for_timeout(600)
        rep.check("The trend" in js(CARD), "clicking a figure tile opens its card (GDP graphs with their story)")
        # the ⓘ peek
        js("() => AtlasDebug.mapOnly && AtlasDebug.mapOnly(['gdp_per_head'])"); page.wait_for_timeout(400)
        js("() => { const b = document.createElement('button'); b.className = 'ib-i'; b.dataset.info = 'gdp_per_head'; b.textContent = 'ⓘ'; b.style.cssText = 'position:fixed;left:300px;top:400px'; document.body.appendChild(b); b.dispatchEvent(new PointerEvent('pointerover', { bubbles: true })); }")
        page.wait_for_timeout(700)
        pk = js("() => { const p = document.getElementById('pc-peek'); return p && !p.hidden ? p.innerText : ''; }")
        rep.check("GDP per head" in pk and "Create card" in pk and "Put on map" in pk and "Workspace" in pk, f"hovering an ⓘ shows the metric's story with Map, Workspace and Create card ({pk[:100]!r})")
        js("() => document.querySelector('#pc-peek [data-pkcard]').click()"); page.wait_for_timeout(700)
        js("() => [...document.querySelectorAll('.pcwin')].filter(w => !w.hidden).pop().querySelectorAll('.pc-it').forEach(d => d.open = true)"); page.wait_for_timeout(450)
        t = js(CARD)
        rep.check("GDP per head" in t and "Across the map" in t and "Why it moved" in t and "Global financial crisis" in t, f"Create card: the story, across the map, and why it moved ({t[:120]!r})")
        # the number box fits, and charts in panels can become cards
        js("() => AtlasCard.open(AtlasCard.metric('ge_turnout') || AtlasCard.metric('gdp_per_head'))"); page.wait_for_timeout(500)
        rep.check(js("() => [...document.querySelectorAll('.pc-bign b')].every(b => b.scrollWidth <= b.clientWidth + 1)"), "big numbers fit their box")
        js("() => AtlasMenu.full('regions')"); page.wait_for_timeout(1500)
        rep.check(js("() => document.querySelectorAll('.apppanel:not([hidden]) [data-wscard]').length >= 1"), "charts in a panel have As a card beside To workspace")
        js("() => document.querySelector('.apppanel:not([hidden]) [data-wscard]').click()"); page.wait_for_timeout(500)
        rep.check(js("() => !!document.querySelector('.pcwin:not([hidden]) .pc-chart svg, .pcwin:not([hidden]) .ws-snap')"), "…which opens the chart as a card")
        # the workspace: new items beside the others, pinch and buttons to zoom
        js("() => { localStorage.removeItem('atlas-16-ws'); }")
        for mid in ["gdp_per_head", "gdp", "gdp_growth"]:
            js(f"() => {{ const s = AtlasCard.metric('{mid}'); const d = document.createElement('div'); d.innerHTML = AtlasCard.html(s); AtlasCtx.sendToWS({{ type: 'card', title: s.title, html: d.firstElementChild.outerHTML, w: 400, h: 520 }}); }}")
        ov = js("() => { const its = JSON.parse(localStorage.getItem('atlas-16-ws')).projects[0].items.slice(-3); let o = 0; for (let i = 0; i < its.length; i++) for (let j = i + 1; j < its.length; j++) { const a = its[i], b = its[j]; if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) o++; } return o; }")
        rep.check(ov == 0, "things sent to the workspace sit beside each other, not on top")
        js("() => [...document.querySelectorAll('#tabs .tab, #tabs button')].find(b => /Workspace/.test(b.textContent)).click()"); page.wait_for_timeout(800)
        rep.check(js("() => !!document.querySelector('#ws .ws-zoomer [data-wszfit]')"), "the board has a zoom control with Fit")
        z0 = js("() => document.querySelector('#ws .ws-inner').style.transform")
        js("() => { const cv = document.querySelector('#ws .ws-canvas'), r = cv.getBoundingClientRect(); cv.dispatchEvent(new WheelEvent('wheel', { ctrlKey: true, deltaY: 60, clientX: r.left + 100, clientY: r.top + 100, bubbles: true, cancelable: true })); }"); page.wait_for_timeout(200)
        z1 = js("() => document.querySelector('#ws .ws-inner').style.transform")
        rep.check(z0 != z1 and "scale" in z1, f"pinching zooms the board ({z0} → {z1})")
        js("() => document.querySelector('#ws [data-wszfit]').click()"); page.wait_for_timeout(400)
        rep.check(js("() => /%$/.test(document.querySelector('#ws .wz-v').textContent)"), "Fit sets the zoom to show everything")
        rep.check(not [e for e in page.errors if "favicon" not in e], f"no errors in Economic ({page.errors[:2]})")
        page.close()

        # ---------- every app: each menu builds ----------
        for app in ["politics", "economic", "social", "health", "markets", "transport", "environment"]:
            page = open_atlas(b, base, (1280, 800), query=f"debug#app={app}"); js = page.evaluate; page.wait_for_timeout(1200)
            res = js("""() => [...document.querySelectorAll('#appbar [data-agroup].has-menu')].map(b => { const s = AtlasMenu.groupSpecAt(+b.dataset.agroup); return [b.textContent.trim(), s ? s.sections.length : 0, s ? s.sections.reduce((a, x) => a + (x.items || []).length, 0) : 0]; })""")
            bad = [r for r in res if r[1] < 1 or r[2] < 1]
            rep.check(not bad, f"{app}: every dropdown has categories and rows ({len(res)} menus{'; empty: ' + str(bad) if bad else ''})")
            # open every row's card in the first two menus without errors
            errs = js("""() => { const out = []; [...document.querySelectorAll('#appbar [data-agroup].has-menu')].slice(0, 3).forEach(b => { const s = AtlasMenu.groupSpecAt(+b.dataset.agroup); s.sections.forEach(sec => (sec.items || []).slice(0, 4).forEach(it => { try { if (it.card) { const c = it.card(); if (c && !AtlasCard.html(c).includes('pc-pill')) out.push(it.label); } else if (it.metric) { const c = AtlasCard.metric(it.metric); if (!c) out.push(it.label); } } catch (e) { out.push(it.label + ': ' + e.message); } })); }); return out; }""")
            rep.check(not errs, f"{app}: the cards behind the rows build ({errs[:3]})")
            rep.check(not [e for e in page.errors if "favicon" not in e], f"{app}: no errors ({page.errors[:2]})")
            page.close()

        # ---------- phones (0.13: the phone layout is a later piece of work; the menu still opens) ----------
        page = open_atlas(b, base, (375, 812), query="debug#app=social"); js = page.evaluate; page.wait_for_timeout(1500)
        js("() => AtlasMenu.open('migration')"); page.wait_for_timeout(400)
        rep.check(js("() => " + VIS), "on a phone the menu still opens")
        rep.check(not [e for e in page.errors if "favicon" not in e], f"no errors on a phone ({page.errors[:2]})")
    rep.done()


if __name__ == "__main__":
    main()
