"""
Atlas 1.8: the Design panel (developers only).   python tests/test_design.py

Hidden without ?dev. With ?dev: Ctrl/Cmd+Shift+D opens it; a design setting, a picked element, a party colour and a map
layer all change live; edits survive a reload; theme.js downloads with them in it; Atlas default clears them.
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from atlas_test import server, browser, open_atlas, Report


def main():
    rep = Report("design")
    with server() as base, browser() as b:
        page = open_atlas(b, base, (1440, 900)); js = page.evaluate
        rep.check(js("() => document.getElementById('open-design').hidden && !window.AtlasDesign"), "without ?dev there is no Design panel")
        page.context.close()

        page = open_atlas(b, base, (1440, 900), query="debug&dev"); js = page.evaluate
        page.keyboard.press("Control+Shift+D"); page.wait_for_timeout(400)
        rep.check(page.is_visible(".dd-win"), "with ?dev, Ctrl+Shift+D opens the Design panel")
        n = js("() => document.querySelectorAll('.dd-win [data-tok]').length")
        rep.check(n >= 20, f"Settings lists Atlas's design settings ({n} inputs)")
        page.fill(".dd-win input[type=text][data-tok='light|--panel']", "rgb(255, 240, 200)"); page.dispatch_event(".dd-win input[type=text][data-tok='light|--panel']", "input"); page.wait_for_timeout(900)   # panels fade colours over 0.6 s
        rep.check(js("() => getComputedStyle(document.getElementById('dock')).backgroundColor") == "rgb(255, 240, 200)", "changing --panel recolours the boxes live")
        page.click(".dd-win [data-tab=elements]"); page.click(".dd-win [data-pick]"); page.wait_for_timeout(100)
        page.click("#dock .dt"); page.wait_for_timeout(300)
        sel = js("() => document.querySelector('.dd-win [data-selfree]').value")
        rep.check(bool(sel), f"picking an element offers selectors (picked {sel})")
        page.fill(".dd-win input[type=text][data-prop='border-radius']", "0px"); page.dispatch_event(".dd-win input[type=text][data-prop='border-radius']", "input")
        page.fill(".dd-win input[type=text][data-prop='font-size']", "17px"); page.dispatch_event(".dd-win input[type=text][data-prop='font-size']", "input"); page.wait_for_timeout(200)
        rep.check(js("s => getComputedStyle(document.querySelector(s)).fontSize", sel) == "17px", "a picked element's font size changes live")
        page.click(".dd-win [data-tab=palettes]"); page.wait_for_timeout(200)
        js("() => [...document.querySelectorAll('.dd-win details')].forEach(d => d.open = true)")
        page.fill(".dd-win [data-partyq]", "labour"); page.dispatch_event(".dd-win [data-partyq]", "input"); page.wait_for_timeout(300)
        page.fill(""".dd-win input[type=text][data-pal='["party","lab"]']""", "#00aa00"); page.dispatch_event(""".dd-win input[type=text][data-pal='["party","lab"]']""", "input"); page.wait_for_timeout(600)
        rep.check(js("() => AtlasDebug.M.control.colour('lab')") == "#00aa00", "a party colour changes what the map uses")
        page.click(".dd-win [data-tab=map]"); page.wait_for_timeout(200)
        page.fill(".dd-win [data-layq]", "nation-line"); page.dispatch_event(".dd-win [data-layq]", "input"); page.wait_for_timeout(300)
        page.fill(".dd-win input[type=text][data-lay='nation-line|line-width']", "5"); page.dispatch_event(".dd-win input[type=text][data-lay='nation-line|line-width']", "change"); page.wait_for_timeout(200)
        rep.check(js("() => atlasMap.getPaintProperty('nation-line', 'line-width')") == 5, "a map layer's paint changes live")
        with page.expect_download() as dl:
            page.click(".dd-win [data-dl]")
        txt = open(dl.value.path(), encoding="utf-8").read()
        rep.check("--panel" in txt and "#00aa00" in txt and "nation-line" in txt and "17px" in txt, "theme.js downloads with every change in it")
        page.reload(wait_until="load"); page.wait_for_function("window.atlasMap && window.atlasMap.getSource && window.atlasMap.getSource('councils')"); page.wait_for_timeout(2500)
        rep.check(js("() => getComputedStyle(document.getElementById('dock')).backgroundColor") == "rgb(255, 240, 200)" and js("() => atlasMap.getPaintProperty('nation-line', 'line-width')") == 5, "unsaved edits survive a reload in this browser")
        rep.check(not page.errors, "no console errors" + (f": {page.errors}" if page.errors else ""))
        page.context.close()
    rep.done()


if __name__ == "__main__":
    main()
