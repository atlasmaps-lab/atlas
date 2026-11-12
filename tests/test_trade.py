"""
Atlas 0.9: trade, investment and income in Atlas Markets.   python tests/test_trade.py

Trade panel totals; the product tree drills from chapter to CN8; a product card lists buyers, sellers and ports and
reads the tariff (the Trade Tariff API is mocked); trade routes draw and follow the chosen product; a partner card has
goods, services, FDI and the current account; the Investment and Income panels; trade metrics for places (a council's
figure is a population share of its HMRC area); the traders list for a council.
"""
import os, sys, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from atlas_test import server, browser, open_atlas, Report, open_panel

HEADING = {"data": {"id": "1", "type": "heading", "attributes": {}}, "included": [
    {"type": "commodity", "id": "9", "attributes": {"goods_nomenclature_item_id": "8703801010", "leaf": True, "formatted_description": "New battery electric vehicles"}}]}
COMMODITY = {"data": {"id": "9", "type": "commodity", "attributes": {}}, "included": [
    {"type": "measure", "id": "m1", "attributes": {"import": True}, "relationships": {"measure_type": {"data": {"id": "103"}}, "geographical_area": {"data": {"id": "1011"}}, "duty_expression": {"data": {"id": "d1"}}}},
    {"type": "measure", "id": "m2", "attributes": {"import": True}, "relationships": {"measure_type": {"data": {"id": "142"}}, "geographical_area": {"data": {"id": "JP"}}, "duty_expression": {"data": {"id": "d2"}}}},
    {"type": "measure", "id": "m3", "attributes": {"import": True}, "relationships": {"measure_type": {"data": {"id": "305"}}, "geographical_area": {"data": {"id": "1400"}}, "duty_expression": {"data": {"id": "d3"}}}},
    {"type": "duty_expression", "id": "d1", "attributes": {"base": "10.00 %"}}, {"type": "duty_expression", "id": "d2", "attributes": {"base": "0.00 %"}}, {"type": "duty_expression", "id": "d3", "attributes": {"base": "20.00 %"}},
    {"type": "geographical_area", "id": "1011", "attributes": {"description": "ERGA OMNES"}}, {"type": "geographical_area", "id": "JP", "attributes": {"description": "Japan"}},
    {"type": "geographical_area", "id": "1400", "attributes": {"description": "Areas subject to VAT"}}]}


def main():
    rep = Report("trade")
    with server() as base, browser() as b:
        page = open_atlas(b, base, (1440, 900), query="debug")
        page.route("**/trade-tariff.service.gov.uk/api/v2/headings/**", lambda r: r.fulfill(status=200, content_type="application/json", body=json.dumps(HEADING)))
        page.route("**/trade-tariff.service.gov.uk/api/v2/commodities/**", lambda r: r.fulfill(status=200, content_type="application/json", body=json.dumps(COMMODITY)))
        js = page.evaluate
        t = js("() => ({ exp: ATLAS_TRADE.tot.exp, imp: ATLAS_TRADE.tot.imp, months: ATLAS_TRADE.months.exp.length, ch: Object.keys(ATLAS_TRADE.ch).length })")
        rep.check(3e11 < t["exp"] < 6e11 and 6e11 < t["imp"] < 1e12 and t["months"] > 100 and t["ch"] > 90, f"12 months of goods trade, monthly since 2016, 97 chapters ({t})")
        page = open_atlas(b, base, (1440, 900), query="debug#app=markets"); js = page.evaluate
        page.route("**/trade-tariff.service.gov.uk/api/v2/headings/**", lambda r: r.fulfill(status=200, content_type="application/json", body=json.dumps(HEADING)))
        page.route("**/trade-tariff.service.gov.uk/api/v2/commodities/**", lambda r: r.fulfill(status=200, content_type="application/json", body=json.dumps(COMMODITY)))
        page.wait_for_function("document.querySelector('.tr-head')", timeout=60000)
        rep.check("exports" in js("() => document.querySelector('.tr-head').innerText").lower() and js("() => AtlasDebug.PS.mapped.markets.includes('trade_routes_exp')"), "Atlas Markets opens on Trade, with export routes on the map")
        # products: drill down
        open_panel(page, "products"); page.wait_for_selector("[data-trtog='87']")
        page.click("[data-trtog='87']"); page.wait_for_selector("[data-trtog='8703']", timeout=60000); page.click("[data-trtog='8703']"); page.wait_for_selector("[data-trtog='870380']"); page.click("[data-trtog='870380']")
        page.wait_for_selector("[data-trprod^='870380']:not([data-trprod='870380'])")
        rep.check(js("() => [...document.querySelectorAll('[data-trprod^=\"870380\"]')].some(b => b.dataset.trprod.length === 8)"), "the product tree drills down: chapter 87 → heading 8703 → 870380 → CN8")
        page.fill("[data-trq]", "whisk"); page.wait_for_timeout(1500)
        rep.check("whisk" in js("() => document.querySelector('.tr-tree').innerText").lower(), "search finds products by name (whisky)")
        # product card + tariff (mocked)
        js("() => AtlasTrade.openProduct('870380')"); page.wait_for_function("() => [...document.querySelectorAll('.tr-win')].some(w => /buyers/i.test(w.innerText) && /Product line/i.test(w.innerText))", timeout=30000)
        w = js("() => [...document.querySelectorAll('.tr-win')].find(x => /buyers/i.test(x.innerText)).innerText").lower()
        rep.check("sellers (imports)" in w and "through uk ports" in w and "10.00 %" in w, "a product card shows buyers, sellers, UK ports and the UK Global Tariff")
        js("() => { const s = [...document.querySelectorAll('.tr-win')].pop().querySelector('[data-trtc]'); s.value = 'JP'; s.dispatchEvent(new Event('change', { bubbles: true })); }"); page.wait_for_timeout(800)
        rep.check("from japan" in js("() => [...document.querySelectorAll('.tr-win')].pop().querySelector('.tr-tariff').innerText").lower() and "0.00 %" in js("() => [...document.querySelectorAll('.tr-win')].pop().querySelector('.tr-tariff').innerText"), "choosing a partner shows its preferential rate (Japan: 0%)")
        # routes follow the product
        n_all = js("() => atlasMap.getSource('trade-lines')._data.features.length")
        js("() => AtlasTrade.showRoutes('imp', '870380')"); page.wait_for_timeout(1500)
        r = js("() => ({ n: atlasMap.getSource('trade-lines')._data.features.length, f: [...new Set(atlasMap.getSource('trade-lines')._data.features.map(f => f.properties.f))], key: document.getElementById('legend').innerText })")
        rep.check(r["n"] > 0 and r["n"] != n_all and r["f"] == ["imp"] and "870380" in r["key"], f"import routes for one product replace the export routes ({n_all} → {r['n']}), and the key names it")
        # partner card: goods, services, FDI, current account
        js("() => AtlasTrade.openPartner('US')"); page.wait_for_timeout(800)
        w = js("() => [...document.querySelectorAll('.tr-win')].pop().innerText").lower()
        rep.check(all(k in w for k in ("what the uk sells them", "services", "direct investment", "current account")), "a partner card has goods, services, FDI and the current account")
        # investment and income
        open_panel(page, "investment"); page.wait_for_timeout(800)
        w = js("() => document.body.innerText").lower()
        rep.check("foreign-owned in uk" in w and "who owns most in the uk" in w, "the Investment panel shows FDI positions by country and industry")
        open_panel(page, "income"); page.wait_for_timeout(800)
        w = js("() => document.body.innerText").lower()
        rep.check("sent abroad (dividends)" in w and "brought home (dividends)" in w and "all income across the border" in w, "the Income flows panel shows profits sent home and kept, and all primary income")
        # place metrics
        r = js("() => AtlasDebug.M.trade_exp.get('E08000025', AtlasDebug.state.date)")
        rep.check(r and r["v"] > 0, f"goods exports for a council ({r and r['text']})")
        r = js("() => AtlasDebug.M.trade_exp.get('E12000007', AtlasDebug.state.date)")
        rep.check(r and r["v"] > 1e10, f"goods exports for a region ({r and r['text']})")
        r = js("() => AtlasDebug.M.inv_jobs.get('E12000002', AtlasDebug.state.date)")
        rep.check(r and r["v"] > 0, f"new jobs from foreign investment for a region ({r and r['text']})")
        # traders near you
        js("() => AtlasDebug.focus('E08000025')"); page.wait_for_timeout(1200); open_panel(page, "traders")
        page.wait_for_function("() => /exporting and/i.test(document.body.innerText)", timeout=60000)
        rep.check(js("() => document.querySelectorAll('.tr-t tbody tr').length") > 20, "Traders near you lists businesses in the council in focus")
        rep.check(not [e for e in page.errors if "favicon" not in e and "trade-tariff" not in e], f"no errors ({page.errors[:2]})")
    rep.done()


if __name__ == "__main__":
    main()
