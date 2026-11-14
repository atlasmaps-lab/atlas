"""
Atlas 0.13: one font for every word. Every visible element that holds text (HTML or SVG) is set in PT Serif, in a
panel, a menu and the time bar, in light and dark.   python tests/test_font.py
"""
from atlas_test import server, browser, open_atlas, Report, open_panel

CHECK = """() => {
  const bad = [];
  for (const el of document.querySelectorAll('body *')) {
    if (el.closest('.maplibregl-canvas-container, .maplibregl-ctrl-attrib, script, style, noscript')) continue;
    const own = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
    if (!own) continue;
    const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
    const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    if (!/^"?PT Serif/.test(cs.fontFamily)) bad.push((el.className && el.className.baseVal !== undefined ? el.tagName : el.tagName + '.' + el.className) + ': ' + cs.fontFamily);
  }
  return [...new Set(bad)].slice(0, 12);
}"""


def main():
    rep = Report("font")
    with server() as base, browser() as b:
        for mode in ("light", "dark"):
            page = open_atlas(b, base, (1440, 900), query="debug#app=markets", storage={"atlas-mode": mode})
            page.wait_for_timeout(1500)
            bad = page.evaluate(CHECK)
            rep.check(not bad, f"{mode}: everything on screen is PT Serif" + ("" if not bad else f" (not: {bad})"))
            try:
                open_panel(page, "trade"); page.wait_for_timeout(1500)
            except Exception as e:
                print("  (could not open the Trade panel:", e, ")")
            bad = page.evaluate(CHECK)
            rep.check(not bad, f"{mode}: an open panel is PT Serif too" + ("" if not bad else f" (not: {bad})"))
            ok = page.evaluate("() => document.fonts.check('16px \"PT Serif\"')")
            rep.check(ok, f"{mode}: PT Serif has loaded")
            page.context.close()
    rep.done()


if __name__ == "__main__":
    main()
