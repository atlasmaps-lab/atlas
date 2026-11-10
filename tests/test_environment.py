"""
Atlas 0.8.3: the Environmental perspective.   python tests/test_environment.py

data/environment.js (pipeline/build_environment.py) loads as its own perspective with five categories; its metrics give
the published figures, go on the map at council level, and say "No data" where a source covers England only.
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from atlas_test import server, browser, open_atlas, Report


def main():
    rep = Report("environment")
    with server() as base, browser() as b:
        page = open_atlas(b, base, (1280, 800))
        js = page.evaluate
        ids = js("() => Object.keys(AtlasDebug.M).filter(k => AtlasDebug.M[k].p === 'environment')")
        rep.check(len(ids) >= 15, f"the Environmental perspective has its metrics ({len(ids)})")
        groups = js("() => [...new Set(Object.values(AtlasDebug.M).filter(m => m.p === 'environment').map(m => m.group))]")
        rep.check(set(groups) >= {"Greenhouse gas emissions", "Renewable electricity", "Waste and recycling", "Air quality", "Electric vehicles"},
                  f"…in five categories ({groups})")
        get = lambda id, code, d: js("([id, code, d]) => { const r = AtlasDebug.M[id].get(code, d); return r && { v: r.v, text: r.text, yr: String(r.yr) }; }", [id, code, d])
        # published headline figures
        r = get("env_ev", "K02000001", "2026-07-01")
        rep.check(r and r["v"] == 121171, f"UK public EV chargers, 1 July 2026, match DfT's table (121,171): {r}")
        r = get("env_recycling", "E92000001", "2024-06-01")
        rep.check(r and abs(r["v"] - 42.0) < 0.05, f"England's household recycling rate 2024-25 matches Defra's table (42.0%): {r}")
        r = get("env_ghg_pc", "E06000001", "2023-06-01")
        rep.check(r and r["yr"].startswith("2023") and 3 < r["v"] < 15, f"Hartlepool has emissions per person in 2023: {r}")
        # the years follow the time bar
        a, z = get("env_ghg_total", "K02000001", "2005-06-01"), get("env_ghg_total", "K02000001", "2023-06-01")
        rep.check(a and z and z["v"] < a["v"], f"UK emissions fell between 2005 and 2023 ({a and a['text']} → {z and z['text']})")
        # England-only sources say so elsewhere
        r = get("env_recycling", "S12000033", "2024-06-01")
        rep.check(r is None or r["v"] is None, f"recycling has no figure for Scottish councils (England only): {r}")
        r = get("env_ev", "E14001063", "2026-07-01")
        rep.check(r and r["v"] > 0, f"EV chargers are also given for constituencies (Aldershot): {r}")
        # on the map, with the Perspectives panel showing it
        js("() => AtlasDebug.setLevel('council')"); js("() => AtlasDebug.mapOnly(['env_ghg_pc'])"); page.wait_for_timeout(1500)
        rep.check(js("() => !!document.querySelector('#legend') && /Emissions per person/i.test(document.querySelector('#legend').textContent)"),
                  "Emissions per person goes on the map and into the key")
        page.click("#dock [data-fold]"); page.wait_for_timeout(200)
        rep.check(page.is_visible("#dock [data-open='environment']"), "Environmental is listed in the Perspectives panel")
        rep.check("not available yet" not in js("() => document.querySelector('#dock [data-open=environment]').textContent").lower(),
                  "…and doesn't say “not available yet”")
        rep.check(not page.errors, "no console errors" + (f": {page.errors}" if page.errors else ""))
        page.context.close()
    rep.done()


if __name__ == "__main__":
    main()
