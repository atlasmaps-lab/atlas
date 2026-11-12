"""
Atlas 0.8: Atlas Social.   python views/social/test_social.py   (tests/run_all.py runs it too)

Demo feed; a profile; a post with a photo whose location data (EXIF) is removed before saving; events; the marketplace
blocks banned items and shows the total price; the activity map shows only cells with 10 or more check-ins; under-18
accounts can't share an exact location. Runs on the browser-only store (no server).
"""
import base64, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "tests"))
from atlas_test import server, browser, open_atlas, Report, open_panel


def jpeg_with_exif(page):
    """a real JPEG with a GPS EXIF block spliced in after the start marker"""
    b64 = page.evaluate("() => { const c = document.createElement('canvas'); c.width = 40; c.height = 30; const x = c.getContext('2d'); x.fillStyle = '#c33'; x.fillRect(0, 0, 40, 30); return c.toDataURL('image/jpeg').split(',')[1]; }")
    raw = base64.b64decode(b64)
    payload = b"Exif\x00\x00" + b"MM\x00\x2a\x00\x00\x00\x08" + b"GPSLatitude 51.5054 GPSLongitude -0.0865 " * 3
    app1 = b"\xff\xe1" + (len(payload) + 2).to_bytes(2, "big") + payload
    return raw[:2] + app1 + raw[2:]


def main():
    rep = Report("social")
    with server() as base, browser() as b:
        page = open_atlas(b, base, (1440, 900), query="debug#app=social"); js = page.evaluate
        page.wait_for_function("() => window.AtlasSocialStore && AtlasSocialStore.state && atlasMap.getSource('soc')", timeout=60000)
        js("() => atlasMap.jumpTo({ center: [-0.12, 51.51], zoom: 10 })"); page.wait_for_timeout(1200)
        rep.check(js("() => document.querySelectorAll('.so-it').length") >= 3, "the feed shows posts near the view (demo)")
        n = js("() => atlasMap.getSource('soc')._data.features.length")
        rep.check(n > 30, f"posts, events and listings are on the map ({n})")
        # profile
        open_panel(page, "profile"); page.wait_for_timeout(500)
        page.fill("[data-pf=name]", "Test Person"); page.fill("[data-pf=handle]", "tester"); page.click("[data-sosave]"); page.wait_for_timeout(500)
        rep.check(js("() => AtlasSocialStore.me() && AtlasSocialStore.me().handle") == "tester", "a profile can be created (in this browser)")
        # post with a photo carrying GPS EXIF
        jpg = jpeg_with_exif(page)
        rep.check(b"GPSLatitude" in jpg, "(the test photo carries GPS data)")
        open_panel(page, "post"); page.wait_for_timeout(500)
        page.fill("[data-sotext]", "Testing a photo post"); page.set_input_files("[data-sofile]", files=[{"name": "p.jpg", "mimeType": "image/jpeg", "buffer": jpg}])
        page.click("[data-sopost]"); page.wait_for_timeout(1500)
        info = js("""async () => { const p = AtlasSocialStore.state.posts.find(x => x.text === 'Testing a photo post'); if (!p || !p.media) return null;
            const b = await AtlasSocialStore.getMedia(p.media), t = new TextDecoder('latin1').decode(new Uint8Array(await b.arrayBuffer()));
            return { exif: t.includes('Exif'), gps: t.includes('GPSLatitude'), precise: p.precise, lon: p.lon }; }""")
        rep.check(info and not info["exif"] and not info["gps"], "the saved photo has no EXIF or GPS data")
        rep.check(info and info["precise"] is False, "the post is pinned by area (about 1 km) by default")
        # marketplace
        open_panel(page, "market"); page.wait_for_timeout(500)
        page.click("[data-sonewlisting]"); page.wait_for_timeout(300)
        page.fill("[data-li=title]", "Air rifle with scope"); page.fill("[data-li=price]", "80"); page.click("[data-lisave]"); page.wait_for_timeout(300)
        rep.check("can't be listed" in js("() => document.querySelector('[data-liwarn]').textContent"), "a banned item (an air rifle) can't be listed")
        page.fill("[data-li=title]", "Bookshelf, oak"); page.fill("[data-li=price]", "40"); page.fill("[data-li=delivery]", "10"); page.click("[data-lisave]"); page.wait_for_timeout(800)
        rep.check(js("() => [...document.querySelectorAll('.so-it')].some(i => /Bookshelf, oak/.test(i.textContent) && /£50/.test(i.textContent) && /private seller/.test(i.textContent))"), "a normal listing shows its total price (£50) and who sells it")
        page.fill("[data-li=title]", "Shares in a start-up") if page.query_selector("[data-li=title]") else None
        rep.check(js("() => AtlasSocial.bannedReason('Selling bitcoin and shares') !== null"), "shares and crypto are blocked (FCA-regulated)")
        # activity map: only cells with at least 10 check-ins
        js("() => AtlasSocial.setActivity(true, 6)"); page.wait_for_timeout(400)
        ns = js("() => atlasMap.getSource('soc-act')._data.features.map(f => f.properties.n)")
        cells = js("() => AtlasSocial.cells")
        rep.check(ns and min(ns) >= 10 and cells["hidden"] > 0, f"activity shows only cells with 10+ check-ins ({len(ns)} shown, {cells['hidden']} too small to show)")
        # under-18
        open_panel(page, "profile"); page.wait_for_timeout(400)
        page.check("input[name=soage][value=minor]"); page.click("[data-sosave]"); page.wait_for_timeout(400)
        open_panel(page, "post"); page.wait_for_timeout(400)
        rep.check(js("() => document.querySelector('input[name=soprec][value=exact]').disabled && document.querySelector('[data-socheck]').disabled"), "under-18 accounts can't post an exact location or be counted in activity")
        rep.check(not page.errors, "no console errors" + (f": {page.errors[:3]}" if page.errors else ""))
        page.context.close()
        page = open_atlas(b, base, (1440, 900), query="debug#app=markets"); js = page.evaluate; page.wait_for_timeout(1500)
        open_panel(page, "marketplace"); page.wait_for_timeout(1500)
        rep.check(js("() => !!document.querySelector('[data-sonewlisting]')"), "Atlas Markets has the marketplace too")
        rep.check(not page.errors, "Atlas Markets: no console errors" + (f": {page.errors[:3]}" if page.errors else ""))
        page.context.close()
    rep.done()


if __name__ == "__main__":
    main()
