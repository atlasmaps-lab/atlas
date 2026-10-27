"""
Atlas 1.4: market test case -> data/markets.js   (python3 pipeline/build_markets.py, standard library only)

sources/markets_ftse100.json   FTSE 100 companies, headquarters, values, monthly prices (fetch_markets.py)
sources/zones.json             custom tiles: London's financial districts (edit freely)
sources/fx.json                exchange rates used to put US$ and € values into £

Custom zones are areas known for something (here: where big companies are headquartered). They are not official
boundaries: the City of London uses its council boundary; the others are drawn by hand and approximate.
"""
import json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC, DATA = os.path.join(HERE, "sources"), os.path.join(os.path.dirname(HERE), "data")
sys.path.insert(0, HERE)
from build import polys, inside, bbox

SECTOR_GROUPS = [  # FTSE sector name (lower case, partial) -> broad group shown on the map
    ("Banks & finance", ["bank", "financial", "investment", "asset", "insurance", "life insurance", "real estate investment"]),
    ("Energy & mining", ["oil", "gas", "mining", "metals", "energy", "electricity", "utilities", "water"]),
    ("Consumer", ["food", "beverage", "tobacco", "personal", "household", "retail", "travel", "leisure", "media", "entertainment"]),
    ("Health", ["pharma", "health", "biotech", "medical"]),
    ("Industry & services", ["aerospace", "defence", "construction", "industrial", "support", "chemicals", "engineering", "transport", "electronic"]),
    ("Technology & telecoms", ["software", "computer", "telecom", "technology"]),
    ("Property", ["real estate", "property"]),
]
GROUP_COLOURS = {"Banks & finance": "#1f4e9c", "Energy & mining": "#6b4226", "Consumer": "#e07b39", "Health": "#16a2a2", "Industry & services": "#7f8c8d",
                 "Technology & telecoms": "#8e44ad", "Property": "#2e8b57", "Other": "#b5a99a"}


def group(sector):
    s = sector.lower()
    if "real estate" in s and "investment trust" not in s: return "Property"
    for g, words in SECTOR_GROUPS:
        if any(w in s for w in words): return g
    return "Other"


def clean_prices(px):
    """Yahoo's monthly LSE prices sometimes flip between pence and pounds (100x) or carry one-month spikes.
    Keep 2000 onwards, put 100x flips back on the scale of the months around them, and drop isolated spikes."""
    px = [list(p) for p in px if p[0] >= "2000-01" and p[1]]
    for i in range(1, len(px)):
        r = px[i][1] / px[i - 1][1]
        if r > 40: px[i][1] /= 100
        elif r < 1 / 40: px[i][1] *= 100
        elif r > 7: px[i][1] /= 10          # a 10x flip: no FTSE 100 share moves that much in a month
        elif r < 1 / 7: px[i][1] *= 10
    out = []
    for i, p in enumerate(px):
        a = px[i - 1][1] if i else None; b = px[i + 1][1] if i + 1 < len(px) else None
        if a and b and ((p[1] > 2.5 * a and p[1] > 2.5 * b) or (p[1] < a / 2.5 and p[1] < b / 2.5)): continue   # a one-month spike
        out.append([p[0], round(p[1], 2)])
    jumps = sum(1 for i in range(1, len(out)) if not 1 / 2.2 < out[i][1] / out[i - 1][1] < 2.2)
    return [] if jumps >= 3 else out   # still erratic after cleaning: better no line than a wrong one


def main():
    m = json.load(open(os.path.join(SRC, "markets_ftse100.json")))
    fx = json.load(open(os.path.join(SRC, "fx.json")))
    zones = json.load(open(os.path.join(SRC, "zones.json")))
    councils = json.load(open(os.path.join(HERE, "geometry", "councils.geojson")))
    cgeo = {f["properties"]["code"]: f["geometry"] for f in councils["features"]}
    feats = []
    for z in zones:
        geom = cgeo[z["from_council"]] if z.get("from_council") else {"type": "Polygon", "coordinates": [z["polygon"]]}
        feats.append({"type": "Feature", "properties": {"code": z["code"], "name": z["name"], "kind": z["kind"], "note": z["note"], "council": z["council"]}, "geometry": geom})
    def where(lon, lat, fs):
        for f in fs:
            b = bbox(f["geometry"])
            if b[0] <= lon <= b[2] and b[1] <= lat <= b[3] and any(inside([lon, lat], p[0]) for p in polys(f["geometry"])): return f["properties"]["code"]
        return None
    cfeats = [{"properties": {"code": c}, "geometry": g} for c, g in cgeo.items() if c.startswith("E09")]   # London boroughs
    toGBP = {"GBP": 1, "USD": 1 / fx["USD_per_GBP"], "EUR": 1 / fx["EUR_per_GBP"]}
    cos, outside = [], []
    for c in m["companies"]:
        cap = c.get("market_cap")
        capGBP = round(cap["v"] * toGBP.get(cap["cur"], 0)) if cap and cap.get("cur") in toGBP else None
        rec = {"n": c["name"], "t": c["ticker"], "sym": c["symbol"], "sector": c["sector"], "grp": group(c["sector"]), "hq": c["hq"], "wiki": c["wiki"],
               "cap": cap, "capGBP": capGBP, "rev": c.get("revenue"), "emp": c.get("employees"), "founded": c.get("founded"),
               "px": clean_prices((c.get("prices") or {}).get("monthly", [])), "cur": (c.get("prices") or {}).get("currency")}
        if c.get("london"):
            if c.get("lat") is not None:
                rec.update(lat=round(c["lat"], 5), lon=round(c["lon"], 5), zone=where(c["lon"], c["lat"], feats), council=where(c["lon"], c["lat"], cfeats), prec=c.get("precision"), hq_note=c.get("hq_note", ""), hq_hand=c.get("hq_hand", False))
            else:   # London is known, the office isn't: listed, not placed
                rec.update(lat=None, lon=None, zone=None, council=None, prec="city")
            cos.append(rec)
        else:
            rec.update(hq_place=c.get("geocoded") or c["hq"]); outside.append({k: rec[k] for k in ("n", "t", "sector", "grp", "hq", "capGBP")})
    out = {"market": m["market"], "fetched": m["fetched"], "fx": fx, "groups": [[g, GROUP_COLOURS[g]] for g in GROUP_COLOURS],
           "zones": {"type": "FeatureCollection", "features": feats}, "companies": cos, "outside": outside,
           "index": clean_prices((m.get("index") or {}).get("monthly", [])),
           "sources": "FTSE 100 constituents and company details: Wikipedia and Wikidata; headquarters geocoded with OpenStreetMap Nominatim; monthly prices: Yahoo Finance"}
    with open(os.path.join(DATA, "markets.js"), "w") as fh:
        fh.write("window.ATLAS_MARKETS = " + json.dumps(out, separators=(",", ":"), ensure_ascii=False) + ";\n")
    by = {}
    for c in cos: k = c["zone"] or ("not located" if c["lat"] is None else "elsewhere in London"); by[k] = by.get(k, 0) + 1
    print(f"Markets: {len(cos)} London-headquartered FTSE 100 companies ({by}); {len(outside)} headquartered elsewhere; index {len(out['index'])} months.")


if __name__ == "__main__":
    main()
