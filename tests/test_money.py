"""
Atlas 0.8: money in politics.   python tests/test_money.py

MP, party, donor and place cards; the money line on area cards; the map metric; the Money panel in Atlas Politics.
"""
import os, sys, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from atlas_test import server, browser, open_atlas, Report, ROOT, open_panel


def load(name, var):
    s = open(os.path.join(ROOT, "data", name), encoding="utf-8").read()
    return json.loads(s[s.index("=") + 1:].split(";\n")[0].strip())


def main():
    rep = Report("money")
    MO = load("money.js", "ATLAS_MONEY")
    lab, con = MO["parties"].get("lab"), MO["parties"].get("con")
    rep.check(lab and con and sum(v[0] for v in con["y"].values()) > 1e8, "the parties have their registered donations (Conservatives over £100m since 2001)")
    sains = [k for k, d in MO["donors"].items() if "Sainsbury" in d[0] and "lab" in d[6]]
    rep.check(bool(sains), "a known donor resolves to its party (Lord Sainsbury → Labour)")
    c = MO["counts"]
    rep.check(c["mp_matched"] / c["mp_rows"] > 0.95, f"donations to MPs are matched to an MP ({c['mp_matched']} of {c['mp_rows']})")
    mid = max((k for k, m in MO["mps"].items() if m["tot"] and m["seats"]), key=lambda k: MO["mps"][k]["tot"])
    seat = [s for s in MO["mps"][mid]["seats"] if s[0]][-1][0]
    with server() as base, browser() as b:
        page = open_atlas(b, base, (1440, 900)); js = page.evaluate
        js(f"() => AtlasMoney.openMP('{mid}')"); page.wait_for_timeout(300)
        page.wait_for_function("() => [...document.querySelectorAll('.mo-win')].some(w => /Who gave/.test(w.textContent))", timeout=60000)
        rep.check(js("() => [...document.querySelectorAll('.mo-win')].some(w => /registered to this MP/.test(w.textContent) && w.querySelectorAll('[data-modonor]').length > 0)"), f"the MP card lists who gave ({MO['mps'][mid]['n']})")
        js("() => AtlasMoney.openParty('lab')"); page.wait_for_timeout(600)
        rep.check(js("() => [...document.querySelectorAll('.mo-win')].some(w => /Biggest donors/.test(w.textContent) && /Who gives/.test(w.textContent))"), "the party card shows its biggest donors and who gives")
        js("() => AtlasMoney.openDonor('%s')" % sains[0]); page.wait_for_timeout(600)
        rep.check(js("() => [...document.querySelectorAll('.mo-win')].some(w => /Sainsbury/.test(w.textContent) && /Every donation since 2010/.test(w.textContent))"), "the donor card lists their donations")
        v = js(f"() => AtlasDebug.M.money_received.get('{seat}', AtlasDebug.state.date)")
        rep.check(v and v.get("v") is not None, f"the map metric has a value for the MP's seat ({v and v.get('text')})")
        js(f"() => AtlasCtx.focus('{seat}')"); page.wait_for_timeout(1500)
        rep.check(js("() => !!document.querySelector('#card .mo-line')"), "the seat's card shows a Political money line")
        rep.check(not page.errors, "no console errors" + (f": {page.errors[:3]}" if page.errors else ""))
        page.context.close()

        page = open_atlas(b, base, (1440, 900), query="debug#app=politics"); js = page.evaluate; page.wait_for_timeout(1500)
        open_panel(page, "money"); page.wait_for_timeout(600)
        rep.check(js("() => [...document.querySelectorAll('.fwin')].some(w => !w.hidden && /Since 2001/.test(w.textContent))"), "Atlas Politics has a Money panel listing the parties")
        page.click("[data-mftab=latest]"); page.wait_for_function("() => !!document.querySelector('.mo-body .mo-tab tr')", timeout=60000)
        n = js("() => document.querySelectorAll('.mo-body .mo-tab tr').length")
        rep.check(n > 50, f"Every donation lists them, newest first ({n} shown)")
        rep.check(not page.errors, "Atlas Politics: no console errors" + (f": {page.errors[:3]}" if page.errors else ""))
        page.context.close()
    rep.done()


if __name__ == "__main__":
    main()
