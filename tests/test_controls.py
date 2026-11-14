"""
Atlas 0.11: Stats for nerds › Control for.   python tests/test_controls.py

Choose any factors to hold fixed; "Test with controls" then says whether the factor is still linked to the outcome once
they are: on its own, holding each control fixed in turn, and holding them all fixed (partial correlation, regression),
with a plain verdict, warnings, and the caveat about mediators and colliders. The "What goes with X" table holds the
chosen controls fixed too.
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from atlas_test import server, browser, open_atlas, Report


def main():
    rep = Report("controls")
    with server() as base, browser() as b:
        page = open_atlas(b, base, (1440, 900)); js = page.evaluate
        js("() => AtlasCtx.openAnalyse({ metrics: ['le_f', 'claimant_rate'], level: 'council' })"); page.wait_for_timeout(800)
        A = "document.getElementById('analyse')"
        rep.check(js(f"() => !!{A}.querySelector('.an-ctl [data-anctlq]')"), "Stats for nerds has a Control for box with a search")
        rep.check(js(f"() => [...{A}.querySelectorAll('.an-methods button')].some(b => b.dataset.anmethod === 'ctl' && b.getAttribute('aria-disabled') === 'true')"), "Test with controls waits until a control is chosen")
        js(f"() => {{ {A}.querySelector('.an-ctl').open = true; const q = {A}.querySelector('[data-anctlq]'); q.value = 'obes'; q.dispatchEvent(new Event('input', {{ bubbles: true }})); }}")
        hits = js(f"() => [...{A}.querySelectorAll('.an-ctl-hit')].map(b => b.textContent)")
        rep.check(any("obes" in h.lower() for h in hits), f"searching finds any metric to control for ({hits[:2]})")
        js(f"() => {A}.querySelector('.an-ctl-hit').click()"); page.wait_for_timeout(400)
        js(f"() => {A}.querySelector('[data-anctladd=imd_score]').click()"); page.wait_for_timeout(400)
        js(f"() => {A}.querySelector('[data-anctladd=density]').click()"); page.wait_for_timeout(400)
        chips = js(f"() => [...{A}.querySelectorAll('.an-ctl .chip')].map(c => c.textContent.replace('×', '').trim())")
        rep.check(len(chips) == 3 and any("Deprivation" in c for c in chips) and any("density" in c.lower() for c in chips), f"several controls can be chosen ({chips})")
        js(f"() => {A}.querySelector('.an-ctl [data-anmethod=ctl]').click()"); page.wait_for_timeout(1500)
        t = js(f"() => {A}.querySelector('.an-res').innerText")
        rep.check("controlling for 3 factors" in t.lower() and "On its own" in t and "All 3 held fixed" in t, f"the test: the link on its own, each control alone, all held fixed ({t[:160]!r})")
        rep.check("partial r" in t and "The controls alone explain" in t and "Regression" in t, "…with partial correlation and how much the controls explain")
        rep.check(js(f"() => !!{A}.querySelector('.anverdict')") and any(w in t for w in ["holds up", "weaker but still there", "mostly explained", "reverses", "little link"]), "…a plain verdict")
        rep.check("mediator" in t and "collider" in t, "…and the warning about what not to control for")
        rep.check("imd 2025" not in t, "acronyms keep their capitals")
        rep.check(js(f"() => [...{A}.querySelectorAll('.an-acts button')].some(b => /Put it on the map/.test(b.textContent))"), "the outcome beyond what the controls predict can go on the map")
        js(f"() => {{ const s = {A}.querySelector('[data-antest]'); s.value = s.options[0].value; s.dispatchEvent(new Event('change', {{ bubbles: true }})); }}"); page.wait_for_timeout(800)
        head = js(f"() => {A}.querySelector('.an-ex .ex-t thead') ? {A}.querySelector('.an-ex .ex-t thead').innerText : ''")
        rep.check("3 factors fixed" in head, f"“What goes with” holds the chosen controls fixed too ({head!r})")
        js("() => localStorage.getItem('atlas-16-an')")
        rep.check(js("() => (JSON.parse(localStorage.getItem('atlas-16-an')).controls || []).length === 3"), "the controls are remembered")
        n0 = js("() => (JSON.parse(localStorage.getItem('atlas-16-ws') || '{}').projects || [{ items: [] }])[0].items.length")
        js(f"() => {A}.querySelector('[data-anws]').click()"); page.wait_for_timeout(300)
        rep.check(js("() => JSON.parse(localStorage.getItem('atlas-16-ws')).projects[0].items.slice(-1)[0].cfg.controls.length === 3") and n0 >= 0, "the test can be sent to the workspace with its controls")
        js(f"() => {A}.querySelector('[data-anctlclear]').click()"); page.wait_for_timeout(400)
        rep.check(js(f"() => !{A}.querySelector('.an-ctl .chip')"), "clear removes every control")
        # 0.12: a "(choose …)" metric gets its choice right under it, and the analysis is named by it
        js("() => AtlasCtx.openAnalyse({ metrics: ['ge_share', 'ge_turnout'], level: 'constituency' })"); page.wait_for_timeout(2500)
        pk = js(f"() => [...{A}.querySelectorAll('.an-pick select')].map(s => s.options[s.selectedIndex].text)")
        rep.check(len(pk) == 1, f"Vote share (choose party) has a party to choose right under it ({pk})")
        t = js(f"() => {A}.querySelector('.an-res').innerText")
        rep.check("Vote share: Labour".lower() in t.lower() and "650" in t, f"…and the analysis runs for that party ({t[:80]!r})")
        js(f"() => {{ const s = {A}.querySelector('.an-pick select'); s.value = 'con'; s.dispatchEvent(new Event('change', {{ bubbles: true }})); }}"); page.wait_for_timeout(2000)
        rep.check("conservative" in js(f"() => {A}.querySelector('.an-res').innerText").lower(), "choosing another party re-runs it")
        js("() => AtlasCtx.openAnalyse({ metrics: ['cen_ethnic_share', 'imd_score'], level: 'council' })"); page.wait_for_timeout(2500)
        rep.check(js(f"() => {A}.querySelectorAll('.an-pick select option').length") > 5 and "(share)" in js(f"() => {A}.querySelector('.an-res').innerText"), "a breakdown's category can be chosen too")
        rep.check(not [e for e in page.errors if "favicon" not in e], f"no errors ({page.errors[:2]})")
    rep.done()


if __name__ == "__main__":
    main()
