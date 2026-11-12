"""
Atlas 0.10: what in Atlas's data goes with a metric (Stats for nerds).   python tests/test_explain.py

Choosing one metric in Analyse looks through every other numeric metric across the places compared: the strongest links
from elsewhere in Atlas, other measures of the same thing on one line, near-copies set aside, a partial correlation
holding density and deprivation fixed for the strongest, chance links marked after correcting for many tests, and the
warnings (correlation isn't causation, places not people, many tests, scope). Clicking a row plots the pair.
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from atlas_test import server, browser, open_atlas, Report


def main():
    rep = Report("explain")
    with server() as base, browser() as b:
        page = open_atlas(b, base, (1440, 900), query="debug"); js = page.evaluate
        js("() => AtlasDebug.openAnalyse({ metrics: ['le_f'], level: 'council' })")
        page.wait_for_function("() => /metrics tested/.test((document.querySelector('.ex summary') || {}).textContent || '')", timeout=90000)
        head = js("() => document.querySelector('.ex summary').innerText")
        rep.check("Life expectancy at birth (women)" in head and "councils" in head, f"the section names the outcome and what was compared ({head})")
        rows = js("() => [...document.querySelectorAll('.ex-t tbody tr')].map(r => ({ id: r.dataset.exm, r: +r.querySelectorAll('td')[2].innerText, p: r.querySelectorAll('td')[4].innerText, part: r.querySelectorAll('td')[5].innerText }))")
        rep.check(len(rows) > 10 and all(abs(rows[i]["r"]) >= abs(rows[i + 1]["r"]) for i in range(len(rows) - 1)), f"every link, strongest first ({len(rows)} rows; {[x['id'] for x in rows[:4]]})")   # 0.10.1: all of them, in a scrolling box
        rep.check(js("() => { const b = document.querySelector('.ex-scroll'); return !!b && b.scrollHeight > b.clientHeight + 20; }"), "…in a box that scrolls, so most are kept out of view")
        rep.check(not any(x["id"].startswith(("le_", "hle_")) for x in rows), "other life expectancy measures aren't in the table (they're the same thing)")
        kin = js("() => [...document.querySelectorAll('.ex-dup')].map(e => e.innerText).join(' ')")
        rep.check("Healthy life expectancy" in kin and "same group" in kin, "…they're listed on one line as measures of the same thing")
        rep.check("near-copies" in kin and "Life expectancy at 65 (women)" in kin, "near-copies are set aside and named")
        rep.check(sum(1 for x in rows if x["part"].strip()) >= 1, "the strongest links get a partial correlation holding density and deprivation fixed")
        w = js("() => document.querySelector('.ex-warn').innerText").lower()
        rep.check(all(k in w for k in ("not causation", "ecological fallacy", "chance", "scope")), "the warnings are shown")
        rep.check(not any(x["id"].endswith("_lq") for x in rows), "share and specialisation of one breakdown aren't both listed")
        # 0.10.1: the significance filter
        for lvl in ("0.05", "0.001"):
            js(f"() => document.querySelector('[data-exsig=\"{lvl}\"]').click()"); page.wait_for_timeout(300)
            ps = js("() => [...document.querySelectorAll('.ex-t tbody tr')].map(r => r.querySelectorAll('td')[4].innerText)")
            val = lambda t: 0.0005 if t.startswith("<") else float(t)
            rep.check(ps and all(val(t) < float(lvl) for t in ps) and len(ps) <= len(rows), f"p < {lvl} keeps only links below it ({len(ps)} of {len(rows)})")
        js("() => document.querySelector('[data-exraw]').click()"); page.wait_for_timeout(300)
        raw = js("() => document.querySelectorAll('.ex-t tbody tr').length")
        rep.check(raw >= len(ps), f"unticking the correction uses plain p-values (at least as many pass: {raw} ≥ {len(ps)})")
        js("() => document.querySelector('[data-exsig=\"\"]').click()"); page.wait_for_timeout(300)
        js("() => document.querySelector('.ex-t tbody tr').click()"); page.wait_for_timeout(1200)
        r = js("() => ({ m: AtlasDebug.AN.metrics, meth: AtlasDebug.AN.method })")
        rep.check(len(r["m"]) == 2 and r["m"][0] == "le_f" and r["meth"] == "rel", f"clicking a row plots it against the outcome ({r})")
        rep.check(not [e for e in page.errors if "favicon" not in e], f"no errors ({page.errors[:2]})")
    rep.done()


if __name__ == "__main__":
    main()
