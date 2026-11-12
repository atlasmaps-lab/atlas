"""
Atlas 0.9: the same depth in Economic, Social and Health.   python tests/test_depth.py

Output and jobs by industry, commuting (metrics and lines), every Census 2021 category (councils and, loaded on demand,
wards), and deaths by cause and age: each resolves for a known council, appears in its view's profile panel, and maps
a category when clicked.
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from atlas_test import server, browser, open_atlas, Report, open_panel

BHAM = "E08000025"


def main():
    rep = Report("depth")
    with server() as base, browser() as b:
        page = open_atlas(b, base, (1440, 900), query="debug"); js = page.evaluate
        ids = js("() => Object.keys(AtlasDebug.BD)")
        need = ["eco_gva", "eco_jobs", "cen_ethnic", "cen_tenure", "hd_cause", "hd_detail", "hd_age"]
        rep.check(all(i in ids for i in need), f"breakdowns for Economic, Social and Health are registered ({len(ids)})")
        t = js(f"() => Object.fromEntries({need!r}.map(id => [id, Object.values(AtlasDebug.bdOf(id, '{BHAM}') || {{}}).reduce((a, b) => a + b, 0)]))")
        rep.check(30000 < t["eco_gva"] < 50000 and 500000 < t["eco_jobs"] < 700000, f"Birmingham: output £{t['eco_gva']:.0f}m and {t['eco_jobs']:,} jobs by industry")
        rep.check(1.1e6 < t["cen_ethnic"] < 1.2e6 and t["cen_tenure"] > 4e5, f"Birmingham: Census residents {t['cen_ethnic']:,} and households {t['cen_tenure']:,}")
        rep.check(t["hd_cause"] > 20000 and abs(t["hd_cause"] - t["hd_age"]) / t["hd_cause"] < 0.02, f"Birmingham: deaths by cause {t['hd_cause']:,}, by age {t['hd_age']:,} (three years)")
        r = js(f"() => [AtlasDebug.M.commute_out.get('{BHAM}', AtlasDebug.state.date), AtlasDebug.M.commute_net.get('{BHAM}', AtlasDebug.state.date)]")
        rep.check(r[0] and r[0]["v"] > 50000 and r[1] and "in" in r[1]["text"], f"commuting for a council ({r[0] and r[0]['text']}; {r[1] and r[1]['text']})")
        # wards load on demand
        js("() => AtlasDebug.bdOf('cen_ethnic', 'E05011118')"); page.wait_for_function("() => window.ATLAS_CENSUS_W && ATLAS_CENSUS_W.ethnic", timeout=30000)
        w = js("() => { const W = ATLAS_CENSUS_W.ethnic, k = Object.keys(W)[0]; return [Object.keys(W).length, k, W[k].reduce((a, b) => a + b, 0)]; }")
        rep.check(w[0] > 7000 and w[2] > 1000, f"ward Census figures load when needed ({w[0]} wards)")
        cov = js("() => { const W = ATLAS_CENSUS_W.ethnic; const ws = Object.keys(AtlasDebug.P).filter(c => AtlasDebug.P[c].level === 'ward' && /^E05|^W05/.test(c)); return [ws.length, ws.filter(c => W[c]).length]; }")
        rep.check(cov[0] == 0 or cov[1] / max(cov[0], 1) > 0.75, f"about 80% of Atlas's wards match the 2022 Census wards (the rest were redrawn since): {cov[1]} of {cov[0]}")
        # commuting lines follow the focus
        js(f"() => {{ AtlasDebug.mapOnly(['commute_lines']); AtlasDebug.focus('{BHAM}'); }}"); page.wait_for_timeout(1500)
        r = js("() => { const f = atlasMap.getSource('commute-lines')._data.features; return [f.length, [...new Set(f.map(x => x.properties.dir))].sort()]; }")
        rep.check(r[0] >= 10 and r[1] == ["in", "out"], f"commuting lines for the council in focus, in and out ({r})")
        # profile panels in each view
        for app, panel, phrase in [("economic", "industries", "industry"), ("social", "census", "category"), ("health", "deaths", "cause")]:
            p2 = open_atlas(b, base, (1440, 900), query="debug#app=" + app); p2.wait_for_timeout(800)
            p2.evaluate(f"() => AtlasDebug.focus('{BHAM}')"); p2.wait_for_timeout(1200)
            open_panel(p2, f"{panel}"); p2.wait_for_selector(".pf-t tr[data-pfk]", timeout=30000)
            txt = p2.evaluate("() => document.querySelector('.pf-t').closest('.wm-body').innerText").lower()
            rep.check("birmingham" in txt and phrase in txt and "west midlands" in txt, f"{app}: the {panel} panel compares Birmingham with its region and the country")
            p2.click(".pf-t tr[data-pfk]:nth-child(2)"); p2.wait_for_timeout(900)
            on = p2.evaluate("() => Object.values(AtlasDebug.PS.mapped).flat()")
            rep.check(any(i.endswith("_share") for i in on), f"{app}: clicking a row maps that category's share ({[i for i in on if i.endswith('_share')]})")
            rep.check(not [e for e in p2.errors if "favicon" not in e], f"{app}: no errors ({p2.errors[:2]})")
        rep.check(not [e for e in page.errors if "favicon" not in e], f"no errors ({page.errors[:2]})")
    rep.done()


if __name__ == "__main__":
    main()
