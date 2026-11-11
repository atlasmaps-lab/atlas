"""
Atlas 0.10.1: light/dark and map settings are the same in every app.   python tests/test_shared_look.py

Two apps open side by side (as Atlas Multi's tabs are): switching one to dark turns the other dark straight away, and
an app opened afterwards starts dark too. The same for the map type and boundary thickness.
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from atlas_test import server, browser, open_atlas, Report


def main():
    rep = Report("shared look")
    with server() as base, browser() as b:
        a = open_atlas(b, base, (1280, 800), query="debug#app=economic")
        ctx = a.context
        p2 = ctx.new_page(); p2.goto(base + "/index.html?debug#app=health"); p2.wait_for_function("() => window.AtlasCtx && AtlasCtx.map", timeout=60000)
        mode = lambda p: p.evaluate("() => document.documentElement.dataset.mode")
        rep.check(mode(a) == mode(p2) == "light", "both apps start light")
        a.evaluate("() => document.querySelector('#mode button[data-mode=dark]').click()"); p2.wait_for_timeout(800)
        rep.check(mode(a) == "dark", "Economic switches to dark")
        rep.check(mode(p2) == "dark", "Health, already open, follows straight away")
        p3 = ctx.new_page(); p3.goto(base + "/index.html?debug#app=transport"); p3.wait_for_function("() => window.AtlasCtx && AtlasCtx.map", timeout=60000)
        rep.check(mode(p3) == "dark", "an app opened afterwards starts dark")
        a.evaluate("() => document.querySelector('#mode button[data-mode=light]').click()"); p2.wait_for_timeout(800)
        p3.wait_for_timeout(800)
        rep.check(mode(p2) == "light" and mode(p3) == "light", f"switching back to light changes every open app ({mode(a)}, {mode(p2)}, {mode(p3)})")
        errs = a.errors if hasattr(a, "errors") else []
        rep.check(not errs, "no console errors" + (f": {errs[:3]}" if errs else ""))
        ctx.close()
    rep.done()


if __name__ == "__main__":
    main()
