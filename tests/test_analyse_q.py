"""
Atlas 0.13: Analyse (Atlas design/analyse/Analyse (final).md). Three steps (Places, Measures, What do you want to know?);
plain questions with the method underneath, greyed with the reason when they don't fit; the answer first in plain words,
then How sure?, What it does not say and the places that break the pattern; three or more measures open on the
correlation matrix, and a square opens that pair's scatter; Put it on the map docks the sheet to a 420 px side panel,
with a way back to the full result.   python tests/test_analyse_q.py
"""
from atlas_test import server, browser, open_atlas, Report

A = "document.getElementById('analyse')"


def main():
    rep = Report("analyse_q")
    with server() as base, browser() as b:
        page = open_atlas(b, base, (1440, 900)); js = page.evaluate
        page.wait_for_timeout(1500)
        js("() => AtlasCtx.openAnalyse({ metrics: ['le_f', 'claimant_rate'], level: 'council' })"); page.wait_for_timeout(1500)
        steps = js(f"() => [...{A}.querySelectorAll('.an-step')].map(x => x.textContent.replace(/^\\d/, ''))")
        rep.check(steps == ["Places", "Measures", "What do you want to know?"], f"three steps ({steps})")
        q = js(f"() => [...{A}.querySelectorAll('.an-qs button')].map(b => ({{ q: b.querySelector('b').textContent, m: b.querySelector('i').textContent, no: b.classList.contains('no'), why: (b.querySelector('small') || {{}}).textContent || '' }}))")
        rel = next((x for x in q if x["m"] == "Relationship"), None)
        rep.check(rel and rel["q"] == "Do two things move together?", "questions in plain words, the method underneath")
        grey = [x for x in q if x["no"]]
        rep.check(grey and all(len(x["why"]) > 8 for x in grey), f"questions that don't fit are greyed with the reason ({grey[0]['why'][:50] if grey else ''})")
        js(f"() => {A}.querySelector('[data-anmethod=rel]').click()"); page.wait_for_timeout(1200)
        r = js(f"""() => ({{ q: ({A}.querySelector('.an-answer .an-q') || {{}}).textContent, a: ({A}.querySelector('.an-answer .an-a') || {{}}).textContent || '', boxes: [...{A}.querySelectorAll('.an-box b')].map(x => x.textContent),
          brk: {A}.querySelectorAll('.an-box [data-anpk]').length, pic: !!{A}.querySelector('.an-res svg'), first: {A}.querySelector('.an-res').firstElementChild.className }})""")
        rep.check(r["q"] == "Do two things move together?" and len(r["a"]) > 20 and r["first"] in ("an-answer", "antrim"), f"the answer comes first in plain words ({r['a'][:70]!r})")
        rep.check(set(r["boxes"]) == {"How sure?", "What it does not say", "Places that break the pattern"} and r["brk"] == 6, f"…then How sure?, What it does not say, places that break the pattern ({r['boxes']})")
        rep.check(r["pic"], "…and the picture")
        js(f"() => {A}.querySelector('[data-anm=\"imd_score\"]') ? 0 : 0")
        js("() => AtlasCtx.openAnalyse({ metrics: ['le_f', 'claimant_rate', 'imd_score'], level: 'council' })"); page.wait_for_timeout(1500)
        rep.check(js(f"() => !!{A}.querySelector('[data-anmethod=matrix].on')") and "strongest link" in js(f"() => {A}.querySelector('.an-answer .an-a').textContent"), "three measures open on the correlation matrix, naming the strongest link")
        js(f"() => {A}.querySelector('svg.heat rect.pick').dispatchEvent(new MouseEvent('click', {{ bubbles: true }}))"); page.wait_for_timeout(1200)
        rep.check(js(f"() => !!{A}.querySelector('.an-pair svg') && /r = /.test({A}.querySelector('.an-pair .an-a').textContent)"), "a square opens that pair's scatter with its own reading")
        js(f"() => {A}.querySelector('[data-anmap]').click()"); page.wait_for_timeout(1500)
        d = js(f"() => {{ const r = {A}.getBoundingClientRect(); return {{ w: Math.round(r.width), right: Math.round(innerWidth - r.right), docked: {A}.classList.contains('an-docked'), back: !!{A}.querySelector('[data-anundock]') }}; }}")
        rep.check(d["docked"] and d["w"] == 420 and d["right"] < 40 and d["back"], f"Put it on the map docks the sheet to a 420 px side panel ({d})")
        rep.check(js("() => !!(AtlasDebug.PS.mapped.analysis || []).length"), "…and the result is on the map")
        js(f"() => {A}.querySelector('[data-anundock]').click()"); page.wait_for_timeout(800)
        rep.check(js(f"() => !{A}.classList.contains('an-docked') && {A}.getBoundingClientRect().width > 500"), "Back to the full result restores it")
        rep.check(not page.errors, f"no errors ({page.errors[:3]})")
    rep.done()


if __name__ == "__main__":
    main()
