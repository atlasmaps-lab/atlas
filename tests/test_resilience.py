"""
Atlas 0.12: Atlas Resilience, for people who plan for, respond to and understand emergencies.   python tests/test_resilience.py

Prepare: a vulnerability index for councils whose parts are always shown. Respond: live flood warnings (Environment
Agency), each opening a situation report with what's inside it (homes, people, facilities). Understand: past floods and
disease (UKHSA). Near me: a warning near a place. Every live service is replaced by a fixed answer, so this tests Atlas.
"""
import os, sys, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from atlas_test import server, browser, open_atlas, Report, open_panel

C = [-1.55, 53.80]   # Leeds
SQ = [[C[0] - 0.01, C[1] - 0.006], [C[0] + 0.01, C[1] - 0.006], [C[0] + 0.01, C[1] + 0.006], [C[0] - 0.01, C[1] + 0.006], [C[0] - 0.01, C[1] - 0.006]]
FLOODS = {"items": [
    {"floodAreaID": "122WAF999", "description": "River Aire at Leeds city centre", "severityLevel": 2, "severity": "Flood warning", "isTidal": False, "timeRaised": "2026-11-12T08:15:00",
     "message": "River levels are rising. Flooding is expected.", "floodArea": {"county": "Leeds", "notation": "122WAF999", "riverOrSea": "River Aire"}},
    {"floodAreaID": "122WAF998", "description": "Lower River Aire", "severityLevel": 3, "severity": "Flood alert", "timeRaised": "2026-11-12T07:00:00", "floodArea": {"county": "Leeds", "notation": "122WAF998"}},
    {"floodAreaID": "OLD1", "description": "Gone", "severityLevel": 4, "timeRaised": "2026-11-10T07:00:00", "floodArea": {}}]}
POLY = {"type": "FeatureCollection", "features": [{"type": "Feature", "properties": {}, "geometry": {"type": "Polygon", "coordinates": [SQ]}}]}
FAR = {"type": "FeatureCollection", "features": [{"type": "Feature", "properties": {}, "geometry": {"type": "Polygon", "coordinates": [[[x + 0.08, y] for x, y in SQ]]}}]}
OVER = {"elements": [
    {"type": "node", "id": 1, "lat": C[1] + 0.001, "lon": C[0], "tags": {"amenity": "hospital", "name": "Leeds General"}},
    {"type": "node", "id": 2, "lat": C[1] - 0.002, "lon": C[0] + 0.003, "tags": {"amenity": "school", "name": "Aire Primary"}},
    {"type": "node", "id": 3, "lat": C[1] + 0.05, "lon": C[0], "tags": {"amenity": "school", "name": "Outside School"}},
    {"type": "count", "id": 0, "tags": {"nodes": "0", "ways": "37", "relations": "0", "total": "37"}}]}
GOVUK = {"results": [{"title": "Flood warnings issued for the River Aire", "link": "/government/news/flood-aire", "public_timestamp": "2026-11-12T09:00:00Z", "organisations": [{"acronym": "EA"}], "content_store_document_type": "press_release"},
                      {"title": "Latest weekly winter virus surveillance data", "link": "/government/news/winter-virus", "public_timestamp": "2026-11-11T09:00:00Z", "organisations": [{"acronym": "UKHSA"}], "content_store_document_type": "news_story"},
                      {"title": "A decision notice", "link": "/government/decision", "public_timestamp": "2026-11-10T09:00:00Z", "organisations": [], "content_store_document_type": "decision"}]}
UK = lambda vals: {"count": len(vals), "results": [{"date": f"2026-{1 + i // 4:02d}-{1 + 7 * (i % 4):02d}", "metric_value": v} for i, v in enumerate(vals)]}


def main():
    rep = Report("resilience")
    with server() as base, browser() as b:
        page = open_atlas(b, base, (1440, 900), query="debug#app=resilience"); js = page.evaluate
        ea = []
        page.route("**/environment.data.gov.uk/flood-monitoring/id/floods", lambda r: (ea.append(1), r.fulfill(status=200, content_type="application/json", body=json.dumps(FLOODS))))
        page.route("**/environment.data.gov.uk/flood-monitoring/id/floodAreas/**", lambda r: r.fulfill(status=200, content_type="application/json", body=json.dumps(POLY if "999" in r.request.url else FAR)))
        oq = []
        for op in ("**/overpass-api.de/**", "**/overpass.kumi.systems/**"):
            page.route(op, lambda r: oq.append(r.request.post_data and __import__("urllib.parse").parse.unquote_plus(r.request.post_data)) or r.fulfill(status=200, content_type="application/json", body=json.dumps(OVER)))
        page.route("**/api.ukhsa-dashboard.data.gov.uk/**", lambda r: r.fulfill(status=200, content_type="application/json", body=json.dumps(UK([3, 5, 2, 8, 4, 6] if "COVID" in r.request.url else [1.5, 2.5, 4.0]))))
        page.route("**/photon.komoot.io/**", lambda r: r.fulfill(status=200, content_type="application/json", body=json.dumps({"features": [{"properties": {"name": "Leeds Station"}, "geometry": {"coordinates": [C[0] + 0.001, C[1]]}}]})))
        gq = []
        page.route("**/www.gov.uk/api/search.json**", lambda r: (gq.append(r.request.url), r.fulfill(status=200, content_type="application/json", body=json.dumps(GOVUK))))
        page.reload(); page.wait_for_timeout(3500)
        rep.check(js("() => AtlasDebug && document.body.textContent.includes('Resilience')"), "Atlas Resilience opens")
        # Respond (opens first)
        page.wait_for_function("() => AtlasResilience.W.list", timeout=20000); page.wait_for_timeout(800)
        txt = js("() => [...document.querySelectorAll('.apppanel')].filter(w => !w.hidden).map(w => w.innerText).join(' ')")
        rep.check("1 flood warning" in txt and "1 flood alert" in txt, "Respond counts the live warnings and alerts in force (no longer in force left out)")
        rep.check(js("() => AtlasCtx.map.getSource('res-warn')._data.features.length") == 2, "…and draws their areas on the map")
        rep.check("Flood warnings issued for the River Aire" in txt or js("() => document.body.innerText.includes('Flood warnings issued for the River Aire')"), "Respond shows the latest releases from the authorities, linked")
        rep.check(js("() => !!document.querySelector('.apppanel a[href*=\"metoffice.gov.uk/weather/warnings\"]') && !document.body.innerText.includes('A decision notice')"), "…with the official warning services (Met Office, EA), and no non-news items")
        js("() => document.querySelector('[data-reswarn=\"122WAF999\"]').click()"); page.wait_for_timeout(2500)
        card = js("() => { const w = [...document.querySelectorAll('.pcwin')].filter(w => !w.hidden).pop(); return w ? w.innerText : ''; }")
        rep.check("Situation report" in card and "River Aire at Leeds" in card, "a warning opens a situation report")
        rep.check("What the Environment Agency says" in card and "River levels are rising" in card, "…leading with the Environment Agency's own message")
        rep.check(js("() => { const w = [...document.querySelectorAll('.pcwin')].filter(w => !w.hidden).pop(); return !!w.querySelector('a[href*=\"target-area/122WAF999\"]') && !!w.querySelector('a[href*=\"/government/news/flood-aire\"]'); }"), "…linking to the warning and to the latest releases")
        rep.check(any("River+Aire" in q or "River%20Aire" in q for q in gq), "…asking GOV.UK about this river")
        rep.check("37" in card and "homes" in card.lower(), "…counting the homes mapped inside it")
        rep.check(any("poly:" in q for q in oq), "…asking OpenStreetMap about the area itself, not its bounding box")
        rep.check("1 hospital" in card and "1 school" in card, f"…and the facilities inside ({[l for l in card.splitlines() if 'hospital' in l][:1]})")
        rep.check("people" in card and "≈" in card, "…and an estimate of the people inside")
        rep.check(js("() => AtlasCtx.map.getSource('res-fac')._data.features.length") == 2, "the facilities inside are put on the map")
        # Prepare
        open_panel(page, "prepare"); page.wait_for_timeout(1200)
        V = js("() => { const V = AtlasResilience.vulnerability(); return { n: V.n, parts: Object.keys(V.raw).map(k => [k, Object.keys(V.raw[k]).length]) }; }")
        rep.check(V["n"] > 300 and all(n > 200 for k, n in V["parts"] if k != "depr"), f"the vulnerability index covers councils, part by part ({V})")
        rep.check(js("() => AtlasDebug.PS && JSON.stringify(AtlasDebug.PS.mapped).includes('res_vuln')"), "…and is on the map")
        js("() => AtlasCtx.focus(AtlasCtx.allCodesAt('council').find(c => AtlasCtx.nameOf(c) === 'Leeds'))"); page.wait_for_timeout(1200)
        p = js("() => [...document.querySelectorAll('.apppanel')].filter(w => !w.hidden && /Prepare/.test(w.querySelector('.wtitle, .wm-title, header') ? w.querySelector('.wtitle, .wm-title, header').textContent : w.innerText)).map(w => w.innerText).join(' ')")
        rep.check("What the authorities are saying" in p and "Flood warnings issued" in p, "Prepare shows what the authorities are saying")
        rep.check("ranks" in p and "Aged 65 and over" in p and "Fuel poverty" in p, "a council's parts are shown with its rank, never just one score")
        old = js("() => AtlasResilience.vulnerability().raw.old[AtlasCtx.allCodesAt('council').find(c => AtlasCtx.nameOf(c) === 'Leeds')]")
        rep.check(old and 10 < old < 25, f"…the 65+ share is plausible for Leeds ({old and round(old, 1)}%)")
        # Understand
        open_panel(page, "understand"); page.wait_for_timeout(2500)
        u = js("() => [...document.querySelectorAll('.apppanel')].filter(w => !w.hidden).map(w => w.innerText).join(' ')")
        rep.check("COVID-19" in u and "deaths with COVID-19" in u, "Understand shows COVID-19 for the council in focus")
        rep.check("Measles" in u and "Flu" in u, "…and flu and measles for England")
        rep.check("What UKHSA is saying" in u and "winter virus surveillance" in u, "…and what UKHSA is saying, linked")
        # Near me
        open_panel(page, "nearme"); page.wait_for_timeout(600)
        page.fill("[data-resq]", "Leeds station"); page.click("[data-resgoq]"); page.wait_for_timeout(1500)
        n = js("() => [...document.querySelectorAll('.apppanel')].filter(w => !w.hidden).map(w => w.innerText).join(' ')")
        rep.check("inside a flood warning area now" in n, "Near me says when a place is inside a warning")
        rep.check("Sign up for flood warnings" in n, "…and how to prepare")
        rep.check("What the Environment Agency says" in n and "River levels are rising" in n, "…with the warning's message from the Environment Agency")
        rep.check(not [e for e in page.errors if "favicon" not in e], f"no errors ({page.errors[:3]})")
    rep.done()


if __name__ == "__main__":
    main()
