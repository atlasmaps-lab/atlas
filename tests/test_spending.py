"""
Atlas 0.10: government spending.   python tests/test_spending.py

Totals match HM Treasury (total managed expenditure 2025-26); regions and nations per head (Country and Regional Analysis);
council spending by service with a county share in two-tier areas; the spending breakdowns; the Public spending panel
opens with its story and drills into a function.
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from atlas_test import server, browser, open_atlas, Report


def main():
    rep = Report("spending")
    with server() as base, browser() as b:
        page = open_atlas(b, base, (1440, 900), query="debug#app=economic"); js = page.evaluate
        t = js("() => ({ tme: ATLAS_SPEND.uk.tme['2025-26'], hlth: ATLAS_SPEND.uk.fn.Health.tot['2025-26'], fn: Object.keys(ATLAS_SPEND.uk.fn).length })")
        rep.check(1.3e6 < t["tme"] < 1.45e6 and 2e5 < t["hlth"] < 3e5 and t["fn"] == 10, f"UK spending: total managed expenditure £{t['tme'] / 1000:.0f}bn, health £{t['hlth'] / 1000:.0f}bn, 10 functions")
        d = js("() => AtlasDebug.state.date")
        r = js(f"() => ['E12000007', 'E12000001', 'N92000002', 'E12000008'].map(c => AtlasDebug.M.spend_ph.get(c, '{d}').v)")
        rep.check(all(10000 < v < 20000 for v in r) and r[2] > r[3], f"spending per head by region and nation, Northern Ireland above the South East ({[round(x) for x in r]})")
        r = js(f"() => [AtlasDebug.M.council_spend_ph.get('E07000223', '{d}'), AtlasDebug.M.council_spend_ph.get('E08000025', '{d}')]")
        rep.check(r[0] and r[0]["est"] and "West Sussex" in r[0]["estWhy"] and r[1] and not r[1].get("est"), "a district includes a share of its county's spending (marked est.); a unitary council doesn't")
        r = js("() => ['spd_fn', 'spd_sub', 'spd_dept', 'spd_council'].map(id => Object.keys(AtlasDebug.bdOf(id, id === 'spd_council' ? 'E08000025' : 'E12000007') || {}).length)")
        rep.check(r[0] == 10 and r[1] > 30 and r[2] >= 10 and r[3] >= 8, f"breakdowns: by function, in detail, by department, council by service ({r})")
        page.click("#appbar [data-apanel=spending]"); page.wait_for_selector(".apppanel:not([hidden]) .nv-story")
        s = js("() => document.querySelector('.apppanel:not([hidden]) .nv-story').innerText")
        rep.check("£1,360bn" in s and "Social protection" in s and "per head" in s, f"the panel opens with the story ({s[:140]})")
        js("() => document.querySelector('[data-spf=\"Social protection\"]').click()"); page.wait_for_timeout(400)
        rep.check(js("() => document.querySelectorAll('.sp-sub').length") >= 5, "clicking a function shows its sub-functions (old age, family, sickness…)")
        rep.check("How far to trust it" in js("() => document.querySelector('.apppanel:not([hidden]) .nv').innerText"), "…and says how far to trust the figures")
        rep.check(not [e for e in page.errors if "favicon" not in e], f"no errors ({page.errors[:2]})")
    rep.done()


if __name__ == "__main__":
    main()
