"""
Atlas 0.12: more of the map is clickable.   python tests/test_clickable.py

Railway lines, ferry routes, rivers and Atlas Environment's zones each open a card when clicked (through the core's
click registry), and a click on a zone or line never also focuses the area under it. Rivers are drawn as lines with more
detail as you zoom: the main rivers below zoom 10, every watercourse square by square above it.
(Parks and National Parks are basemap shapes: they need the MapTiler basemap, which tests run without.)
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from atlas_test import server, browser, open_atlas, Report

CLICK = """(layers) => { const m = AtlasCtx.map; const f = m.queryRenderedFeatures({ layers: layers.filter(id => m.getLayer(id)) })[0]; if (!f) return null;
  const g = f.geometry, c = g.type === 'LineString' ? g.coordinates[Math.floor(g.coordinates.length / 2)] : g.type === 'MultiLineString' ? g.coordinates[0][Math.floor(g.coordinates[0].length / 2)] : g.type === 'Polygon' ? g.coordinates[0][0] : g.coordinates[0][0][0];
  const pt = m.project(c); window.__f0 = AtlasDebug.state.focus; m.fire('click', { point: pt, lngLat: m.unproject(pt), originalEvent: { shiftKey: false } }); return true; }"""
CARD = "() => { const w = [...document.querySelectorAll('.pcwin')].filter(w => !w.hidden).pop(); return w ? w.innerText : ''; }"


def main():
    rep = Report("clickable")
    with server() as base, browser() as b:
        page = open_atlas(b, base, (1440, 900), query="debug"); js = page.evaluate; page.wait_for_timeout(1500)
        js("() => AtlasDebug.mapOnly(['inf_rail'])"); js("() => AtlasCtx.map.jumpTo({ center: [-1.9, 52.48], zoom: 9 })"); page.wait_for_timeout(2500)
        ok = js(CLICK, ["net-osm-rail", "net-rail"]); page.wait_for_timeout(700)
        t = js(CARD); rep.check(ok and "Railway line" in t and "station" in t.lower(), f"a railway line opens a card with its nearest stations ({t[:120]!r})")
        rep.check(js("() => AtlasDebug.state.focus === window.__f0"), "…and doesn't also focus the area under it")
        js("() => document.querySelectorAll('.pcwin [data-wmx]').forEach(b => b.click())")
        js("() => AtlasDebug.mapOnly(['inf_ferry'])"); js("() => AtlasCtx.map.jumpTo({ center: [-5.0, 56.4], zoom: 7 })"); page.wait_for_timeout(3000)
        ok = js(CLICK, ["net-ferry"]); page.wait_for_timeout(700)
        t = js(CARD); rep.check(ok and "Ferry" in t, f"a ferry route opens a card ({t[:100]!r})")
        rep.check(not [e for e in page.errors if "favicon" not in e], f"no errors ({page.errors[:2]})")
        page.close()
        # rivers and zones in Atlas Environment
        page = open_atlas(b, base, (1440, 900), query="debug#app=environment"); js = page.evaluate; page.wait_for_timeout(2500)
        js("() => AtlasCtx.map.jumpTo({ center: [-2.0, 52.6], zoom: 7 })"); page.wait_for_timeout(2500)
        lo = js("() => ({ main: AtlasCtx.map.queryRenderedFeatures({ layers: ['rivers-main-line'] }).length, squares: [...document.scripts].filter(s => /data\\/rivers\\/\\d/.test(s.src)).length })")
        rep.check(lo["main"] > 20 and lo["squares"] == 0, f"below zoom 10 only the main rivers are drawn, no detail squares loaded ({lo})")
        js("() => AtlasCtx.map.jumpTo({ center: [-2.75, 52.71], zoom: 11.5 })"); page.wait_for_timeout(3500)
        hi = js("() => ({ n: AtlasCtx.map.queryRenderedFeatures({ layers: ['rivers-hi-line'] }).length, names: [...new Set(AtlasCtx.map.queryRenderedFeatures({ layers: ['rivers-hi-line'] }).map(f => f.properties.n))] })")
        rep.check(hi["n"] > 50 and "River Severn" in hi["names"], f"from zoom 10 every watercourse loads, square by square ({hi['n']} lines, e.g. {hi['names'][:3]})")
        ok = js(CLICK, ["rivers-hi-line"]); page.wait_for_timeout(700)
        t = js(CARD); rep.check(ok and ("River" in t or "watercourse" in t) and "OS Open Rivers" in t, f"a river opens a card ({t[:100]!r})")
        rep.check(js("() => AtlasDebug.state.focus === window.__f0"), "…without focusing the area under it")
        js("() => document.querySelectorAll('.pcwin [data-wmx]').forEach(b => b.click())")
        page.wait_for_function("() => AtlasCtx.map.getLayer('env-floods-fill')", timeout=60000)
        js("() => { AtlasRivers.hide(); AtlasCtx.map.jumpTo({ center: [-2.75, 52.71], zoom: 12 }); }"); page.wait_for_timeout(2500)
        page.wait_for_function("() => AtlasCtx.map.getSource('env-floods-hi') && AtlasCtx.map.querySourceFeatures('env-floods-hi').length > 0", timeout=60000)
        rep.check(js("() => AtlasCtx.map.queryRenderedFeatures({ layers: ['env-floods-hi-fill'] }).length > 0 && AtlasCtx.map.queryRenderedFeatures({ layers: ['env-floods-fill'] }).length === 0"), "zoomed in, flood outlines switch to the detailed shapes")
        ok = js(CLICK, ["env-floods-hi-fill"]); page.wait_for_timeout(700)
        t = js(CARD); rep.check(ok and "flood" in t.lower() and "Other floods recorded within 3 km" in t, f"a flood outline opens a card with other floods nearby ({t[:100]!r})")
        rep.check(js("() => AtlasDebug.state.focus === window.__f0") and not js("() => !!document.querySelector('.env-pop')"), "…as a card, not a popup, and without focusing the area")
        rep.check(not [e for e in page.errors if "favicon" not in e], f"no errors ({page.errors[:2]})")
    rep.done()


if __name__ == "__main__":
    main()
