"""
Atlas 0.12: PM10, NO2 and PM2.5 for every council, constituency, region, nation and the UK (Defra's 1 km maps).   python tests/test_airquality.py
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from atlas_test import server, browser, open_atlas, Report, open_panel


def main():
    rep = Report("airquality")
    with server() as base, browser() as b:
        page = open_atlas(b, base, (1440, 900), query="debug#app=environment"); js = page.evaluate; page.wait_for_timeout(2500)
        for mid in ("env_pm10", "env_no2", "env_pm25_pcm"):
            rep.check(js(f"() => !!AtlasCtx.M['{mid}'] && AtlasCtx.M['{mid}'].group === 'Air quality'"), f"{mid} is an Air quality measure")
        v = js("() => ['E09000033', 'S12000017', 'E14001063', 'K02000001'].map(c => (AtlasCtx.value('env_no2', c, '2024-06-01') || {}).v)")
        rep.check(all(x is not None for x in v), f"NO2 for a London borough, a Scottish council, a constituency and the UK ({v})")
        rep.check(v[0] > 15 and v[1] < 3 and v[0] > v[3], "…higher in central London than in the Highlands or the UK as a whole")
        old = js("() => (AtlasCtx.value('env_pm10', 'E09000033', '2018-06-01') || {}).v"); new = js("() => (AtlasCtx.value('env_pm10', 'E09000033', '2024-06-01') || {}).v")
        rep.check(old and new and old != new, f"PM10 changes year by year ({old} in 2018, {new} in 2024)")
        rep.check(js("() => /µg\\/m³/.test(AtlasCtx.M.env_pm10.fmt(12.3))"), "shown in µg/m³")
        open_panel(page, "climate"); page.wait_for_timeout(1200)
        rep.check(js("() => [...document.querySelectorAll('.apppanel')].some(w => !w.hidden && /PM10/.test(w.innerHTML))") or js("() => document.body.innerHTML.includes('env_pm10')"), "Climate & air offers PM10")
        rep.check(not [e for e in page.errors if "favicon" not in e], f"no errors ({page.errors[:2]})")
    rep.done()


if __name__ == "__main__":
    main()
