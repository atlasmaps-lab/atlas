"""
Atlas 0.10: migration, social housing and people's finances.   python tests/test_people.py

Totals against the publishers' headlines (ONS net migration, England's social homes, the UK claimant count, asylum
support); the metrics for a council; the breakdowns; the Migration and Housing & support panels open with their stories.
"""
import os, sys, re
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from atlas_test import server, browser, open_atlas, Report, open_panel


def main():
    rep = Report("people")
    with server() as base, browser() as b:
        page = open_atlas(b, base, (1440, 900), query="debug#app=social"); js = page.evaluate
        h = js("() => { const P = ATLAS_PEOPLE, n = P.ltim.nat['net migration']['All Nationalities'], last = P.ltim.latest, st = Object.values(P.housing.stock); return { net: n[last], last, la: st.reduce((a, v) => a + (v[0] || 0), 0), ha: st.reduce((a, v) => a + (v[1] || 0), 0), cc: P.fin.claim.K02000001.slice(-1)[0], as: Object.values(P.asylum.support).reduce((a, o) => a + Object.values(o).reduce((x, y) => x + y, 0), 0) }; }")
        rep.check(50000 < h["net"] < 1000000, f"ONS net migration in the latest year ({h['last']}: {h['net']:,.0f})")
        rep.check(1.3e6 < h["la"] < 1.8e6 and 2.3e6 < h["ha"] < 3e6, f"England's social homes: {h['la']:,.0f} council, {h['ha']:,.0f} housing association")
        rep.check(1e6 < h["cc"] < 2.5e6 and 50000 < h["as"] < 150000, f"UK claimant count {h['cc']:,.0f}; people on asylum support {h['as']:,.0f}")
        d = js("() => AtlasDebug.state.date")
        r = js(f"() => ['mig_intl_net', 'mig_internal_net', 'asylum_support', 'social_homes_pct', 'council_homes', 'waiting_list', 'claimant_rate', 'child_poverty'].map(id => {{ const x = AtlasDebug.M[id] && AtlasDebug.M[id].get('E08000025', '{d}'); return x && x.v != null; }})")
        rep.check(all(r), f"every new metric has a value for Birmingham ({r})")
        r = js("() => ['ppl_tenure_stock', 'ppl_asylum_acc', 'ppl_resettle'].map(id => Object.keys(AtlasDebug.bdOf(id, 'E08000025') || {}).length)")
        rep.check(r[0] >= 3 and r[1] >= 2 and r[2] >= 1, f"breakdowns: homes by owner, asylum accommodation, resettlement scheme ({r})")
        open_panel(page, "migration"); page.wait_for_selector(".apppanel:not([hidden]) .nv-story")
        s = js("() => { const b = [...document.querySelectorAll('.apppanel:not([hidden]) .wm-body')].pop(); return ((b.querySelector('.ed-h') || {}).innerText || '') + ' ' + ((b.querySelector('.nv-story') || {}).innerText || ''); }")
        rep.check("Net migration" in s and "peaked" in s and re.search(r"main reason for coming was (work|study)", s), f"the Migration panel tells the story ({s[:200]})")
        open_panel(page, "support"); page.wait_for_selector(".apppanel:not([hidden]) .nv-story")
        s = js("() => { const b = [...document.querySelectorAll('.apppanel:not([hidden]) .wm-body')].pop(); return ((b.querySelector('.ed-h') || {}).innerText || '') + ' ' + ((b.querySelector('.nv-story') || {}).innerText || ''); }")
        rep.check("claimed out-of-work benefits" in s and "low-income families" in s and "Right to Buy" in s, f"the Housing & support panel tells the story ({s[:160]})")
        rep.check("Stat-Xplore" in js("() => [...document.querySelectorAll('.apppanel:not([hidden]) .ed-notes')].pop().textContent"), "…and says award levels need Stat-Xplore")
        rep.check(not [e for e in page.errors if "favicon" not in e], f"no errors ({page.errors[:2]})")
    rep.done()


if __name__ == "__main__":
    main()
