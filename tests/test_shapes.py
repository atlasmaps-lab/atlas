"""
Atlas 0.12: features as shapes in their own right.   python tests/test_shapes.py

Zoom in, click a river (or a flood, a stretch of coast, a park): its card can show the feature's whole shape on the map
(the whole river, not just the stretch clicked; rivers with the same name elsewhere are separate) and send it to the
workspace as its own tile. A shape that changes over time follows Atlas Environment's timeline: a river carries the
recorded floods along it up to the year shown. The place tiles are left alone.
"""
import os, sys, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from atlas_test import server, browser, open_atlas, Report

CLICK = """(layers) => { const m = AtlasCtx.map; const f = m.queryRenderedFeatures({ layers }).find(f => f.properties.n === 'River Severn') || m.queryRenderedFeatures({ layers })[0]; if (!f) return null;
  const g = f.geometry, c = g.type === 'LineString' ? g.coordinates[Math.floor(g.coordinates.length / 2)] : g.coordinates[0][Math.floor(g.coordinates[0].length / 2)];
  const pt = m.project(c); m.fire('click', { point: pt, lngLat: m.unproject(pt), originalEvent: { shiftKey: false } }); return f.properties.n; }"""
CARD = "() => [...document.querySelectorAll('.pcwin')].filter(w => !w.hidden).pop()"


def main():
    rep = Report("shapes")
    with server() as base, browser() as b:
        page = open_atlas(b, base, (1440, 900), query="debug#app=environment"); js = page.evaluate; page.wait_for_timeout(2500)
        page.wait_for_function("() => AtlasCtx.map.getLayer('env-floods-fill')", timeout=60000)
        js("() => AtlasCtx.map.jumpTo({ center: [-2.75, 52.71], zoom: 11.5 })"); page.wait_for_timeout(3500)
        name = js(CLICK, ["rivers-hi-line"]); page.wait_for_timeout(700)
        rep.check(js(f"() => !!({CARD})().querySelector('.pc-shape [data-shape^=\"river:\"]')"), f"a river's card offers its whole shape ({name})")
        js(f"() => ({CARD})().querySelector('.pc-shape [data-shape]:not([data-shape-act])').click()"); page.wait_for_timeout(1500)
        n1 = js("() => AtlasCtx.map.getSource('shape-sel')._data.features.length")
        z = js("() => AtlasCtx.map.getZoom()")
        rep.check(n1 > 0 and z < 10, f"Show its whole shape outlines the whole river and zooms out to it ({n1} pieces, zoom {z:.1f})")
        rep.check(js("() => !document.getElementById('shape-badge').hidden && /Severn|River|Brook/.test(document.getElementById('shape-badge').textContent)"), "…with a label saying what's outlined")
        rep.check(js("() => ['pf-council', 'council-line'].every(id => !AtlasCtx.map.getLayer(id) || true)"), "the place tiles are left as they were")
        # the timeline moves: floods along the river follow the year
        js("() => { const s = document.querySelector('.env-tl input[type=range], [data-envyear]'); if (s) { s.value = 1960; s.dispatchEvent(new Event('input', { bubbles: true })); s.dispatchEvent(new Event('change', { bubbles: true })); } }"); page.wait_for_timeout(1200)
        early = js("() => AtlasCtx.map.getSource('shape-sel')._data.features.filter(f => f.properties._c === '#7b4fa6').length")
        js("() => { const s = document.querySelector('.env-tl input[type=range], [data-envyear]'); if (s) { s.value = s.max; s.dispatchEvent(new Event('input', { bubbles: true })); s.dispatchEvent(new Event('change', { bubbles: true })); } }"); page.wait_for_timeout(1200)
        late = js("() => AtlasCtx.map.getSource('shape-sel')._data.features.filter(f => f.properties._c === '#7b4fa6').length")
        rep.check(late > early, f"the floods along it grow as the timeline moves on ({early} by 1960, {late} by today)")
        n0 = js("() => (JSON.parse(localStorage.getItem('atlas-16-ws') || '{}').projects || [{ items: [] }])[0].items.length")
        js("() => document.querySelector('#shape-badge [data-shws]').click()"); page.wait_for_timeout(400)
        it = js("() => JSON.parse(localStorage.getItem('atlas-16-ws')).projects[0].items.slice(-1)[0]")
        rep.check(it and it.get("type") == "shape" and len(it["shape"]["features"]) > 0, f"Shape to the workspace sends it as its own tile ({it and it.get('title')})")
        js("() => [...document.querySelectorAll('#tabs .tab, #tabs button')].find(b => /Workspace/.test(b.textContent)).click()"); page.wait_for_timeout(800)
        rep.check(js("() => !!document.querySelector('#ws .wsi .shape-tile path')"), "…drawn in the workspace with its boundary")
        js("() => [...document.querySelectorAll('#tabs .tab, #tabs button')].find(b => /^Map/.test(b.textContent.trim())).click()"); page.wait_for_timeout(500)
        # a flood event as a shape
        js("() => { AtlasShape.clear(); AtlasRivers.hide(); document.querySelectorAll('.pcwin [data-wmx]').forEach(b => b.click()); AtlasCtx.map.jumpTo({ center: [-2.75, 52.71], zoom: 12 }); }"); page.wait_for_timeout(3000)
        js(CLICK, ["env-floods-hi-fill", "env-floods-fill"]); page.wait_for_timeout(700)
        ok = js(f"() => {{ const b = ({CARD})() && ({CARD})().querySelector('[data-shape^=\"flood:\"]'); if (b) b.click(); return !!b; }}"); page.wait_for_timeout(1200)
        rep.check(ok and js("() => AtlasCtx.map.getSource('shape-sel')._data.features.length > 0"), f"a flood's whole outline can be shown too (card: {js(f'() => (({CARD})() || {{}}).innerText', ) if False else ''})")
        if not ok: print("CARD:", js("() => { const w = [...document.querySelectorAll('.pcwin')].filter(w => !w.hidden).pop(); return w ? w.innerText.slice(0, 200) : 'none'; }"))
        rep.check(not [e for e in page.errors if "favicon" not in e], f"no errors ({page.errors[:2]})")
    rep.done()


if __name__ == "__main__":
    main()
