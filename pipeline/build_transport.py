"""
Atlas 0.8: transport data for Atlas Transport. Standard library.   python3 pipeline/build_transport.py [--offline]

  NaPTAN (DfT, OGL v3.0): every active bus and coach stop (BCT/BCS), tram and metro platform (PLT/MET/TMU), and ferry
  berth, placed in its council (point in polygon, with a council-from-ATCO-area fallback for speed), written as one
  small file per council: data/stops/<council>.js, loaded only when the map is zoomed into that council.
  data/transport.js: stops per council (for the "bus and tram stops" metrics), and the National Trails list.
Railway stations, airports and ports come from data/places_poi.js (pipeline/build_poi.py).
"""
import csv, json, math, os, re, subprocess, sys
from collections import defaultdict, Counter
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
from build import polys, inside, bbox
from build_poi import osgb_to_wgs84
import manifest

RAW = os.path.join(HERE, "sources", "raw", "transport"); os.makedirs(RAW, exist_ok=True)
UA = "Mozilla/5.0 (compatible; AtlasMaps/0.8; +https://github.com/atlasmaps-lab/atlas)"
NAPTAN = "https://naptan.api.dft.gov.uk/v1/access-nodes?dataFormat=csv"
KIND = {"BCT": "b", "BCS": "b", "BCQ": "b", "PLT": "t", "MET": "t", "TMU": "t", "FER": "f", "FBT": "f"}


def main():
    p = os.path.join(RAW, "naptan_all.csv")
    if "--offline" not in sys.argv or not os.path.exists(p):
        subprocess.run(["curl", "-sSL", "-m", "1800", "-A", UA, "-o", p, NAPTAN], check=True)
        manifest.record("raw/transport/naptan_all.csv", "Department for Transport", "NaPTAN: every public transport access point in Great Britain", NAPTAN, manifest.OGL, "Great Britain", "bus, tram and ferry stops for data/stops/ (pipeline/build_transport.py)")
    geo = json.load(open(os.path.join(HERE, "geometry", "councils.geojson")))
    feats = [(f["properties"]["code"], bbox(f["geometry"]), f["geometry"]) for f in geo["features"]]
    # a coarse grid of which councils touch each 0.1° cell, so each stop tests only a few polygons
    grid = defaultdict(list)
    for code, b, g in feats:
        for gx in range(int(math.floor(b[0] * 10)), int(math.floor(b[2] * 10)) + 1):
            for gy in range(int(math.floor(b[1] * 10)), int(math.floor(b[3] * 10)) + 1): grid[(gx, gy)].append((code, b, g))
    def find(lon, lat):
        for code, b, g in grid.get((int(math.floor(lon * 10)), int(math.floor(lat * 10))), []):
            if b[0] <= lon <= b[2] and b[1] <= lat <= b[3] and any(inside([lon, lat], pp[0]) for pp in polys(g)): return code
        return None
    by = defaultdict(list); counts = defaultdict(Counter); outside = 0; n = 0
    for r in csv.DictReader(open(p, encoding="utf-8-sig")):
        if r["Status"] != "active" or r["StopType"] not in KIND: continue
        if r["Longitude"]: lon, lat = float(r["Longitude"]), float(r["Latitude"])
        elif r["Easting"]: lon, lat = osgb_to_wgs84(float(r["Easting"]), float(r["Northing"]))
        else: continue
        code = find(lon, lat)
        if not code: outside += 1; continue
        k = KIND[r["StopType"]]; n += 1
        name = r["CommonName"].strip(); ind = (r["Indicator"] or "").strip()
        by[code].append([round(lon, 5), round(lat, 5), name + (f" ({ind})" if ind and len(ind) <= 12 and ind.lower() not in ("o/s", "opp", "adj", "nr") else ""), k, r["ATCOCode"]])
        counts[code][k] += 1
    os.makedirs(os.path.join(ROOT, "data", "stops"), exist_ok=True)
    for code, stops in by.items():
        with open(os.path.join(ROOT, "data", "stops", code + ".js"), "w", encoding="utf-8") as fh:
            fh.write("ATLAS_STOPS_LOADED(%s,%s);\n" % (json.dumps(code), json.dumps(stops, separators=(",", ":"), ensure_ascii=False)))
    out = {"built": __import__("datetime").date.today().isoformat(), "stops": {c: [v["b"], v["t"], v["f"]] for c, v in counts.items()},
           "sources": {"stops": "NaPTAN (Department for Transport), Open Government Licence v3.0"}}
    with open(os.path.join(ROOT, "data", "transport.js"), "w", encoding="utf-8") as fh:
        fh.write("// Atlas 0.8: transport (stops per council). Built by pipeline/build_transport.py; do not edit.\nwindow.ATLAS_TRANSPORT = ")
        json.dump(out, fh, separators=(",", ":")); fh.write(";\n")
    print(f"stops: {n} placed in {len(by)} councils; {outside} outside every council (dropped)")


if __name__ == "__main__":
    main()
