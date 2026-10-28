"""
Atlas 1.8, Phase 3: zero protest points outside the UK.   python tests/test_protests_uk.py   (standard library only)

Every site in data/protests.js must fall inside the UK's boundaries (pipeline/geometry/nations.geojson, point in polygon),
and inside the council it is filed under.
"""
import json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "pipeline"))
from build import polys, inside, bbox


def shapes(name):
    g = json.load(open(os.path.join(ROOT, "pipeline", "geometry", name)))
    return {f["properties"]["code"]: (bbox(f["geometry"]), f["geometry"]) for f in g["features"]}


def within(lon, lat, b, g):
    return b[0] <= lon <= b[2] and b[1] <= lat <= b[3] and any(inside([lon, lat], p[0]) for p in polys(g))


def main():
    s = open(os.path.join(ROOT, "data", "protests.js"), encoding="utf-8").read()
    P = json.loads(s[s.index("=") + 1:].strip().rstrip(";"))
    nations, councils = shapes("nations.geojson"), shapes("councils.geojson")
    out = [x for x in P["sites"] if not any(within(x[2], x[1], b, g) for b, g in nations.values())]
    for x in out: print(f"  FAIL outside the UK: {P['events'][x[0]]['n']} · {x[5]} ({x[1]}, {x[2]})")
    print(("  PASS " if not out else "  FAIL ") + f"{len(P['sites']) - len(out)} of {len(P['sites'])} protest points are inside the UK's boundaries")
    filed = [x for x in P["sites"] if x[3] in councils]
    print(("  PASS " if len(filed) == len(P["sites"]) else "  FAIL ") + f"{len(filed)} of {len(P['sites'])} points are filed under a current council")
    intl_sized = [e["n"] for e in P["events"] if e.get("intl") and e.get("mid") and not (e.get("st") or "").startswith("UK figure")]
    print(("  PASS " if not intl_sized else "  FAIL ") + f"no UK point of an international protest carries a global crowd figure{': ' + ', '.join(intl_sized) if intl_sized else ''}")
    sys.exit(1 if out or len(filed) != len(P["sites"]) or intl_sized else 0)


if __name__ == "__main__":
    main()
