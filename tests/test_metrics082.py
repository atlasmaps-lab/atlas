"""
Atlas 0.8.2: the political metrics, edited.   python tests/test_metrics082.py

Removed from the Perspectives menus: leader, party, MP's years in the seat (kept on the constituency card), MPs since 1997,
seat changed hands, electorate as % of adults, protests per 100,000, largest crowd, cause diversity, parties involved.
New: safe seat or battleground; MP's gender, women and ethnic minority MPs and their gaps against Census 2021; crowd size
as a heat map with numbers on the key; protests against the governing party as a number. Keys give numbers: each party's
vote share, who gave to whom, real values on the circles.
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from atlas_test import server, browser, open_atlas, Report

GONE = ["ruler", "party", "mp_tenure", "mp_count", "seat_flips", "registration_ratio", "protest_rate", "protest_largest", "protest_diversity", "protest_parties"]
NEW = ["seat_safety", "mp_gender", "rep_women", "rep_women_gap", "rep_em", "rep_em_gap", "protest_crowd", "protest_opposition"]


def main():
    rep = Report("metrics 0.8.2")
    with server() as base, browser() as b:
        page = open_atlas(b, base, (1440, 900), query="debug"); js = page.evaluate
        r = js("ids => ids.filter(id => AtlasDebug.METRICS.some(m => m.id === id))", GONE)
        rep.check(r == [], f"removed metrics are off the Perspectives menus ({r})")
        r = js("ids => ids.filter(id => !AtlasDebug.METRICS.some(m => m.id === id))", NEW)
        rep.check(r == [], f"new metrics are on the menus ({r})")
        d = js("() => AtlasDebug.state.date")
        # the constituency card keeps the leader, the party and the MP's time in the seat
        js("() => AtlasDebug.focus('E14001063')"); page.wait_for_timeout(1500)
        t = js("() => document.getElementById('card').innerText")
        rep.check("Leader:" in t and "Party:" in t and "In the seat:" in t and "De facto" not in t, "the seat card shows Leader, Party and In the seat")
        rep.check(t.index("Leader:") < t.index("In the seat:"), "…with the time in the seat next to the leader")
        js("() => AtlasDebug.unfocus()")
        # safe or battleground
        r = js("""d => { const m = AtlasDebug.M.seat_safety, n = {}; Object.keys(AtlasDebug.P).filter(c => AtlasDebug.P[c].level === 'constituency' && !AtlasDebug.P[c].to).forEach(c => { const x = m.get(c, d); if (x && x.v) n[x.v] = (n[x.v] || 0) + 1; }); return n; }""", d)
        rep.check(all(r.get(k, 0) > 20 for k in ["battle", "marginal", "safe", "vsafe"]) and sum(r.values()) >= 640, f"every seat is battleground, marginal, safe or very safe ({r})")
        r = js("d => AtlasDebug.M.seat_safety.get('E14001063', d).text", d)
        rep.check("since 1997" in r, f"seat history reaches back through earlier boundaries: “{r}”")
        # representation
        w = js("d => AtlasDebug.M.rep_women.get('K02000001', d)", d)
        rep.check(35 < w["v"] < 50 and "of 650 MPs" in w["text"], f"women among MPs, UK: {w['text']}")
        e = js("d => AtlasDebug.M.rep_em.get('K02000001', d)", d)
        rep.check(10 < e["v"] < 18, f"ethnic minority MPs, UK: {e['text']}")
        g = js("d => AtlasDebug.M.rep_em_gap.get('E12000007', d)", d)
        rep.check(g and g["v"] < 0 and "residents" in g["text"], f"London's ethnic minority gap against Census 2021: {g['text']}")
        r = js("d => AtlasDebug.M.rep_em.get('E14001063', d)", d)
        rep.check(r.get("nm"), "ethnicity is never shown for a single seat")
        r = js("d => AtlasDebug.M.mp_gender.get('E14001063', d).v", d)
        rep.check(r in ("F", "M"), f"MP's gender for a seat ({r})")
        h = js("() => AtlasDebug.M.rep_women.get('K02000001', '2001-01-01')")
        rep.check(h and h["v"] < w["v"] - 10, f"women among MPs changes over time (2001: {h and h['text']})")
        # protests
        r = js("d => AtlasDebug.M.protest_opposition.get('K02000001', d)", d)
        rep.check(r and isinstance(r["v"], int) and "protest" in r["text"], f"protests against the governing party is a number: {r and r['text']}")
        js("() => AtlasDebug.mapOnly(['protest_crowd'])"); page.wait_for_timeout(800)
        if js("() => document.getElementById('legend').hidden || document.getElementById('legend').closest('[hidden]') != null"): pass
        r = js("() => ({ vis: atlasMap.getLayoutProperty('pr-heat', 'visibility'), pts: atlasMap.getLayoutProperty('pr-pts', 'visibility'), ticks: [...document.querySelectorAll('#legend .cr-ticks span')].map(s => s.textContent) })")
        rep.check(r["vis"] == "visible" and r["pts"] == "none" and r["ticks"] == ["1k", "10k", "100k", "1m+"], f"crowd size is a heat map with numbers on the key ({r})")
        js("() => AtlasDebug.mapOnly(['protest_crowd', 'protest_events'])"); page.wait_for_timeout(800)
        r = js("() => [atlasMap.getLayoutProperty('pr-heat', 'visibility'), atlasMap.getLayoutProperty('pr-pts', 'visibility')]")
        rep.check(r == ["visible", "visible"], f"crowd heat and protest points can be on together ({r})")
        # vote share key
        js("() => AtlasDebug.mapOnly(['ge_share'])"); page.wait_for_timeout(800)
        rows = js("() => [...document.querySelectorAll('#legend .vsk-r')].map(b => [b.dataset.p, b.querySelector('b').textContent])")
        rep.check(len(rows) >= 5 and rows[0][1].endswith("%"), f"the key lists each party's vote share ({rows[:3]})")
        js("() => document.querySelector('#legend .vsk-r[data-p=con]').click()"); page.wait_for_timeout(500)
        rep.check(js("() => AtlasDebug.PS.pick.ge_share") == "con", "clicking a party in the key maps that party")
        js("() => AtlasDebug.focus('E14001063')"); page.wait_for_timeout(1200)
        r = js("() => document.querySelector('#legend .vsk-h').textContent")
        rep.check("Aldershot" in r, f"…and the numbers follow the area in focus ({r})")
        js("() => AtlasDebug.unfocus()")
        # money: who gave to whom, and real values on the circles
        # 0.13.1: the first measure fills the areas; circles are chosen in the key
        js("() => { AtlasDebug.setLevel('constituency'); AtlasDebug.PS.prefs.money_received = 'size'; AtlasDebug.mapOnly(['money_received']); }")
        page.wait_for_function("() => document.querySelectorAll('#legend .mok-r').length > 0", timeout=30000)
        r = js("() => ({ rows: [...document.querySelectorAll('#legend .mok-r')].map(x => x.textContent.trim()).slice(0, 2), circles: [...document.querySelectorAll('#legend .dots span')].map(s => s.textContent) })")
        rep.check(len(r["rows"]) >= 3 or len(r["rows"]) >= 1 and "→" in r["rows"][0], f"the key says who gave to whom and how much ({r['rows'][:1]})")
        rep.check(any("£" in c for c in r["circles"]), f"the circles in the key carry £ values ({r['circles']})")
        js("() => AtlasDebug.setLevel('auto')")
    rep.done()


if __name__ == "__main__":
    main()
