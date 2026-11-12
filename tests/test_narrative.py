"""
Atlas 0.10: narratives.   python tests/test_narrative.py

A metric's story is written from its own numbers: the first and latest values with their years, the change, the peak and
the low, the sharpest move ("two years later it had fallen to …"), and how the place compares with the UK and its peers.
Then what the measure tells us and how far to trust it (GDP per head says plainly it isn't a guide to living standards in
commuter areas). It opens the metric's ⓘ box and appears in pinned cards.
"""
import os, sys, re
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from atlas_test import server, browser, open_atlas, Report

TEST_M = r"""() => {
  const pts = { 2000: 100, 2001: 110, 2002: 120, 2003: 90, 2004: 95, 2005: 130, 2006: 125 };
  const m = { id: "zz_story", label: "Test widgets", p: "economic", scale: "ratio", nature: "amount", temporal: "annual", fmt: v => v + " w",
    get: (c, d) => { const y = +d.slice(0, 4); return pts[y] != null ? { v: pts[y], text: pts[y] + " w", yr: String(y) } : null; } };
  AtlasDebug.M.zz_story = m;
  const div = document.createElement("div"); div.innerHTML = AtlasNarrative.story(m, "E06000001", { noCompare: true }); return div.innerText;
}"""


def main():
    rep = Report("narrative")
    with server() as base, browser() as b:
        page = open_atlas(b, base, (1440, 900), query="debug"); js = page.evaluate
        t = js(TEST_M)
        rep.check("In 2006" in t and "was 125 w, up 25% on 2000" in t and "In 2000 it had been 100 w" in t, f"first and latest values with years, and the change ({t[:120]})")
        rep.check("peaked at 130 w in 2005" in t and "lowest" not in t.split("peaked")[0], f"the peak ({t[:200]})")
        rep.check(re.search(r"sharpest (rise|fall)", t) is not None and ("2003" in t), f"the sharpest move, with years ({t})")
        t = js("() => { const d = document.createElement('div'); d.innerHTML = AtlasNarrative.story(AtlasDebug.M.gdp_per_head, 'E09000001'); return d.innerText; }")
        rep.check("How far to trust it" not in t and ("What it tells us" not in t or re.search(r"What it tells us\..*\d", t)), "0.12: no 'How far to trust it'; 'What it tells us' only when it carries figures")
        info = js("() => { const d = document.createElement('div'); d.innerHTML = AtlasDebug.metricInfoHTML ? AtlasDebug.metricInfoHTML('gdp_per_head') : ''; return d.innerText; }")
        rep.check(not info or ("What it measures" in info and "commut" in info.lower()), "the ⓘ box keeps what GDP per head measures and the commuting caveat")
        rep.check("GDP per head" in t and re.search(r"(highest|lowest) of \d+ councils", t) and "UK" in t, f"…and compares the place with the UK and other councils ({t[:160]})")
        t = js("() => { const d = document.createElement('div'); d.innerHTML = AtlasNarrative.story(AtlasDebug.M.population, 'K02000001'); return d.innerText; }")
        rep.check("the United Kingdom" in t, "the UK reads as “the United Kingdom”")
        js("() => document.querySelector('[data-info]') && 0")
        js("() => AtlasDebug.mapOnly(['gdp_per_head'])"); page.wait_for_timeout(500)
        js("() => { const b = document.createElement('button'); b.dataset.info = 'gdp_per_head'; document.body.appendChild(b); b.click(); }"); page.wait_for_timeout(600)
        rep.check(js("() => !![...document.querySelectorAll('.fwin')].find(w => !w.hidden && w.querySelector('.nv-story'))"), "the ⓘ box opens with the story")
        js("() => AtlasDebug.focus('E08000025')"); page.wait_for_timeout(1500)
        rep.check(js("() => !!document.querySelector('#card .nv-card .nv-story')"), "a pinned card tells the story of the metric on the map")
        rep.check(not [e for e in page.errors if "favicon" not in e], f"no errors ({page.errors[:2]})")
    rep.done()


if __name__ == "__main__":
    main()
