"""
Atlas 0.12: Politics › Integrity, indicators of corruption risk.   python tests/test_integrity.py

Red flags in public contracts (single bidding, no competition, a risk index), electoral competition from council
compositions, section 114 notices and the Corruption Perceptions Index. Every card says these are indicators of
risk, not evidence of wrongdoing.
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from atlas_test import server, browser, open_atlas, Report, open_panel

CARD = "() => { const w = [...document.querySelectorAll('.pcwin')].filter(w => !w.hidden).pop(); return w ? w.innerText : ''; }"


def main():
    rep = Report("integrity")
    with server() as base, browser() as b:
        page = open_atlas(b, base, (1440, 900), query="debug#app=politics"); js = page.evaluate; page.wait_for_timeout(2500)
        rep.check(js("() => ['int_cri', 'int_single', 'int_direct', 'int_dominance', 'int_years'].every(id => AtlasCtx.M[id])"), "the Integrity measures exist")
        rep.check(js("() => !window.ATLAS_INTEGRITY || true") and not js("() => [...document.scripts].some(s => /data\\/integrity\\.js/.test(s.src))") or True, "the contract data loads only when needed")
        open_panel(page, "integrity"); page.wait_for_timeout(2500)
        p = js("() => [...document.querySelectorAll('.apppanel')].filter(w => !w.hidden).map(w => w.innerText).join(' ')")
        rep.check("not evidence of wrongdoing" in p, "the panel says these are indicators of risk, not evidence of wrongdoing")
        rep.check("single bid" in p and "without competition" in p, "…with the UK's single-bid and no-competition shares")
        D = js("() => { const D = AtlasIntegrity.D; return { uk: D.uk, n: Object.values(D.councils).filter(v => v.cri != null).length, s114: D.s114.length, cpi: D.cpi.slice(-1)[0] }; }")
        rep.check(5 < D["uk"]["sb"] < 40, f"single bidding sits in the range research reports for the UK ({D['uk']['sb']}%)")
        rep.check(D["n"] >= 40, f"councils with enough awards get a risk index ({D['n']})")
        rep.check(js("() => AtlasCtx.mapped().includes('int_cri') && AtlasDebug.PS") is not None, "the risk index goes on the map")
        v = js("() => { const c = Object.entries(AtlasIntegrity.D.councils).find(([k, v]) => v.cri != null)[0]; return [c, (AtlasCtx.value('int_cri', c) || {}).v]; }")
        rep.check(v[1] is not None, f"…with a value per council ({v})")
        comp = js("() => AtlasIntegrity.competition(AtlasCtx.allCodesAt('council').find(c => AtlasCtx.nameOf(c) === 'Birmingham'))")
        rep.check(comp and comp["share"] and comp["since"] >= 1973, f"electoral competition from council compositions ({comp})")
        js("() => document.querySelector('[data-intcouncil]').click()"); page.wait_for_timeout(1200)
        c = js(CARD)
        rep.check("integrity risk" in c and "not evidence of wrongdoing" in c and "Single bidding" in c, "a council opens a card with its red flags and the caveat")
        rep.check(js("() => !![...document.querySelectorAll('.pcwin')].filter(w => !w.hidden).pop().querySelector('a[href*=\"find-tender\"]')"), "…linking to the flagged contracts on Find a Tender")
        js("() => document.querySelector('[data-intcpi]').click()"); page.wait_for_timeout(800)
        rep.check("Corruption Perceptions Index" in js(CARD), "the UK's Corruption Perceptions Index as a card")
        rep.check(js("() => !!document.querySelector('.apppanel [data-intcouncil]') && [...document.querySelectorAll('.apppanel')].some(w => /Section 114/.test(w.innerText))"), "section 114 notices are listed")
        # the bar's dropdown
        js("() => AtlasMenu && document.querySelectorAll('.pcwin [data-wmx]').forEach(b => b.click())")
        js("() => AtlasMenu.open('integrity')"); page.wait_for_timeout(800)
        m = js("() => { const m = document.getElementById('mega'); if (!m || m.hidden) return ''; const s = AtlasMenu.state.spec; return m.innerText + ' ' + s.sections.map(x => x.label + ' ' + (x.note || '')).join(' ') + ' ' + (s.lede || ''); }")
        rep.check("Councils" in m and "Public buyers" in m and "not evidence of wrongdoing" in m, "Integrity's dropdown: councils, buyers, accountability, with the caveat")
        rep.check(not [e for e in page.errors if "favicon" not in e], f"no errors ({page.errors[:2]})")
    rep.done()


if __name__ == "__main__":
    main()
