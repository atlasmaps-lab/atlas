"""
Atlas 0.9: breakdown metrics (core).   python tests/test_breakdowns.py

A breakdown spec (here a made-up one, injected before Atlas loads) becomes three metrics: share (choose), largest and
specialisation. The key lists every category with its number for the area in focus or the UK; long lists can be searched
and expanded; clicking a category maps its share. Regions, nations and the UK add up their councils.
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from atlas_test import server, browser, open_atlas, Report

FAKE = r"""
window.ATLAS_BREAKDOWNS = (window.ATLAS_BREAKDOWNS || []).concat([{
  id: "zz_test", p: "economic", group: "Test breakdowns", label: "Test widgets", unit: "widgets", sumUp: true, levels: ["council", "region", "nation", "country"],
  cats: () => Array.from({ length: 20 }, (_, i) => "c" + i), name: k => "Category " + k.slice(1), colour: k => "hsl(" + (+k.slice(1) * 18) + ",60%,50%)",
  of: (code, d, H) => { if (H.level(code) !== "council") return null; let h = 0; for (const ch of code) h = (h * 31 + ch.charCodeAt(0)) % 9973;
    const r = {}; for (let i = 0; i < 20; i++) r["c" + i] = ((h * (i + 7)) % 97) + (i === 3 ? 400 : 0); return r; },
  source: "Test data", desc: "Made up for the test" }]);
"""


def main():
    rep = Report("breakdowns")
    with server() as base, browser() as b:
        page = open_atlas(b, base, (1440, 900), init_script=FAKE); js = page.evaluate
        r = js("() => ['zz_test_share', 'zz_test_top', 'zz_test_lq'].map(id => !!AtlasDebug.M[id] && AtlasDebug.METRICS.includes(AtlasDebug.M[id]))")
        rep.check(r == [True, True, True], f"one spec makes three metrics on the menus ({r})")
        uk = js("() => AtlasDebug.bdOf('zz_test', 'K02000001')"); one = js("() => AtlasDebug.bdOf('zz_test', 'E06000001')")
        rep.check(uk and one and uk["c3"] > one["c3"] * 100, "the UK adds up its councils")
        js("() => { AtlasDebug.setLevel('council'); AtlasDebug.mapOnly(['zz_test_top']); }"); page.wait_for_timeout(900)
        rows = js("() => [...document.querySelectorAll('#legend .bdk .vsk-r')].map(b => b.dataset.k)")
        rep.check(len(rows) == 12 and rows[0] == "c3", f"the key lists the top 12 categories, biggest first ({rows[:3]})")
        js("() => document.querySelector('#legend [data-bdall]').click()"); page.wait_for_timeout(300)
        rep.check(js("() => document.querySelectorAll('#legend .bdk .vsk-r').length") == 20, "“Show all” lists every category")
        page.fill("#legend .bdk-q", "Category 1"); page.wait_for_timeout(600)
        r = js("() => [...document.querySelectorAll('#legend .bdk .vsk-r')].map(b => b.dataset.k)")
        rep.check(set(r) == {"c1", "c10", "c11", "c12", "c13", "c14", "c15", "c16", "c17", "c18", "c19"}, f"the search box filters the list ({len(r)})")
        page.fill("#legend .bdk-q", ""); page.wait_for_timeout(600)
        js("() => document.querySelector('#legend .bdk .vsk-r[data-k=c5]').click()"); page.wait_for_timeout(700)
        r = js("() => ({ pick: AtlasDebug.PS.pick.zz_test, on: AtlasDebug.PS.mapped.economic })")
        rep.check(r["pick"] == "c5" and "zz_test_share" in r["on"] and "zz_test_top" not in r["on"], f"clicking a category maps its share ({r})")
        v = js("() => AtlasDebug.M.zz_test_share.get('E06000001', AtlasDebug.state.date)")
        rep.check(v and "Category 5" in v["text"] and "compbar" in v["detail"], f"the share names the category and the card gets a stacked bar ({v and v['text']})")
        lq = js("() => AtlasDebug.M.zz_test_lq.get('E06000001', AtlasDebug.state.date)")
        rep.check(lq and lq["v"] > 0 and "UK share" in lq["text"], f"specialisation compares with the UK ({lq and lq['text']})")
        js("() => AtlasDebug.focus('E06000001')"); page.wait_for_timeout(1200)
        h = js("() => document.querySelector('#legend .bdk .vsk-h').textContent")
        rep.check("Hartlepool" in h, f"the key follows the area in focus ({h})")
        rep.check(not [e for e in page.errors if "favicon" not in e], f"no errors ({page.errors[:2]})")
    rep.done()


if __name__ == "__main__":
    main()
