"""
Atlas 0.8.1: freight routes from UK ports, and ferry routes -> data/freight.js, data/ferries.js
Standard library.   python3 pipeline/build_freight.py [--offline]

  DfT PORT0499 (OGL v3.0): every major port's freight in 2025 by partner country, direction and cargo: tonnes and
    freight units (lorries, trailers, containers). Each port-to-country flow becomes a thin line from the UK port to that
    country's main port (great-circle arc; the hand table below), coloured by world region. "Small flows" groups and
    coastwise UK traffic count in the port's totals but aren't drawn.
  OpenStreetMap ferry routes (route=ferry ways, via the Overpass API), ODbL: names, operators, crossing times, and whether
    they carry vehicles, foot passengers or bicycles.
"""
import json, math, os, re, subprocess, sys, datetime
from collections import defaultdict
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
from ods_read import rows
import manifest

RAW = os.path.join(HERE, "sources", "raw", "transport")
UA = "AtlasMaps/0.8 (+https://github.com/atlasmaps-lab/atlas)"
# country -> [lon, lat] of its main port for UK trade (approximate, for drawing only)
ANCHOR = {
    "Netherlands": [4.05, 51.95], "USA": [-74.04, 40.67], "France": [1.85, 50.97], "Belgium": [4.30, 51.30], "Norway": [5.32, 60.39], "China": [121.6, 31.35],
    "Irish Republic": [-6.20, 53.35], "Spain": [-2.99, 43.33], "Germany": [9.93, 53.54], "Poland": [18.66, 54.40], "Turkey": [29.0, 40.95], "Canada": [-63.57, 44.64],
    "Sweden": [11.85, 57.69], "India": [72.93, 18.95], "Singapore": [103.84, 1.26], "Algeria": [3.07, 36.77], "Kuwait": [48.0, 29.35], "Denmark": [10.6, 55.47],
    "Brazil": [-46.31, -23.96], "Portugal": [-9.13, 38.70], "Morocco": [-5.50, 35.89], "Egypt": [32.30, 31.25], "Libya": [13.19, 32.90], "Nigeria": [3.37, 6.43],
    "Finland": [25.0, 60.15], "Latvia": [24.10, 56.97], "Saudi Arabia": [39.15, 21.45], "Italy": [8.92, 44.41], "United Arab Emirates": [55.05, 25.0], "Malaysia": [101.35, 3.0],
    "South Africa": [18.43, -33.91], "Sri Lanka": [79.85, 6.95], "Argentina": [-58.37, -34.58], "South Korea": [129.04, 35.08], "Greece": [23.62, 37.94], "Russia": [30.2, 59.88],
    "Lithuania": [21.13, 55.71], "Colombia": [-75.53, 10.40], "Togo": [1.28, 6.13], "Japan": [139.77, 35.62], "Trinidad & Tobago": [-61.52, 10.65], "Angola": [13.23, -8.80],
    "Australia": [144.92, -37.84], "Israel": [34.99, 32.82], "Cote Divoire": [-4.02, 5.30], "Vietnam": [106.75, 10.75], "Oman": [58.57, 23.62], "Indonesia": [106.88, -6.10],
    "Costa Rica": [-83.03, 10.0], "Ukraine": [30.75, 46.48], "Taiwan": [120.28, 22.60], "Qatar": [51.55, 25.30], "Panama": [-79.92, 9.36], "Romania": [28.65, 44.17],
    "Pakistan": [66.98, 24.84], "Peru": [-77.15, -12.05], "Mauritius": [57.50, -20.16], "Iceland": [-21.93, 64.15], "Estonia": [24.75, 59.45], "Mexico": [-96.13, 19.20],
    "Chile": [-71.62, -33.03], "Ghana": [0.0, 5.63], "Thailand": [100.88, 13.08], "Bangladesh": [91.80, 22.30], "Tunisia": [10.32, 36.80], "Croatia": [14.43, 45.33],
    "Slovenia": [13.73, 45.55], "Bulgaria": [27.92, 43.20], "Cyprus": [33.03, 34.65], "Malta": [14.52, 35.82], "Lebanon": [35.52, 33.90], "Georgia": [41.65, 42.15],
    "Philippines": [120.96, 14.58], "New Zealand": [174.78, -36.84], "Venezuela": [-67.97, 10.48], "Jamaica": [-76.80, 17.97], "Senegal": [-17.43, 14.68], "Kenya": [39.65, -4.05],
    "Iraq": [47.82, 30.40], "Iran": [56.20, 27.15], "Bahrain": [50.60, 26.20], "Ecuador": [-79.90, -2.25], "Uruguay": [-56.20, -34.90], "Equatorial Guinea": [8.75, 3.75],
    "Hong Kong": [114.15, 22.30], "Jordan": [35.0, 29.52], "Namibia": [14.50, -22.95], "Tanzania": [39.29, -6.82], "Liberia": [-10.80, 6.35], "Guyana": [-58.17, 6.81], "Cuba": [-82.35, 23.14],
    "Dominican Republic": [-69.88, 18.47], "Puerto Rico": [-66.10, 18.45], "Bahamas": [-77.35, 25.08], "Barbados": [-59.63, 13.10], "Myanmar": [96.20, 16.75], "Madagascar": [49.40, -18.15],
    "Mauritania": [-16.03, 18.0], "Guinea": [-13.70, 9.52], "Congo": [11.85, -4.78], "Benin": [2.43, 6.35], "Djibouti": [43.13, 11.60], "Sudan": [37.22, 19.60], "Albania": [19.45, 41.32],
    "Syria": [35.78, 35.52], "Honduras": [-87.95, 15.83], "Guatemala": [-88.60, 15.73], "Falkland Islands": [-57.85, -51.70], "Fiji": [178.42, -18.13], "Papua New Guinea": [147.15, -9.47],
    "New Caledonia": [166.43, -22.27], "Kambodia": [103.50, 10.60], "Suriname": [-55.17, 5.83], "Cameroon": [9.70, 4.05], "Mozambique": [32.57, -25.97], "Faroe Islands": [-6.77, 62.0], "Gibraltar": [-5.36, 36.14], "Greenland": [-51.72, 64.17],
}
REGION_COL = {"European Union (excl. United Kingdom)": "#2b6cb0", "Other Europe (excl. European Union) & Mediterranean": "#7b4fa6", "America": "#c0392b",
              "Asia (excl. Mediterranean)": "#e08a1e", "Africa (excl. Mediterranean)": "#2e8b57", "Australasia": "#0f8b8d"}
REGION_SHORT = {"European Union (excl. United Kingdom)": "EU", "Other Europe (excl. European Union) & Mediterranean": "Other Europe & Mediterranean", "America": "Americas",
                "Asia (excl. Mediterranean)": "Asia", "Africa (excl. Mediterranean)": "Africa", "Australasia": "Australasia", "United Kingdom (inc CHI & IOM)": "UK coastal", "Unspecified": "Unspecified"}


def arc(a, b, n=24):
    """great-circle points from a to b ([lon, lat])"""
    la1, lo1, la2, lo2 = map(math.radians, (a[1], a[0], b[1], b[0]))
    d = 2 * math.asin(math.sqrt(math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2)) or 1e-9
    out = []
    for i in range(n + 1):
        f = i / n; A = math.sin((1 - f) * d) / math.sin(d); B = math.sin(f * d) / math.sin(d)
        x = A * math.cos(la1) * math.cos(lo1) + B * math.cos(la2) * math.cos(lo2); y = A * math.cos(la1) * math.sin(lo1) + B * math.cos(la2) * math.sin(lo2); z = A * math.sin(la1) + B * math.sin(la2)
        out.append([round(math.degrees(math.atan2(y, x)), 2), round(math.degrees(math.atan2(z, math.hypot(x, y))), 2)])
    return out


def main():
    offline = "--offline" in sys.argv
    p = os.path.join(RAW, "port0499.ods")
    if not (offline and os.path.exists(p)):
        url = "https://assets.publishing.service.gov.uk/media/6a7315f0011ff6453dece53a/port0499.ods"
        subprocess.run(["curl", "-sSL", "-m", "600", "-o", p, url], check=True)
        manifest.record("raw/transport/port0499.ods", "Department for Transport", "Port freight statistics PORT0499: major port freight by partner country (port level)", url, manifest.OGL, "UK major ports, 2000-2025", "freight routes for data/freight.js")
    s = open(os.path.join(ROOT, "data", "places_poi.js"), encoding="utf-8").read()
    ports = {re.sub(r"^Port of ", "", i["n"]).lower(): i for i in json.loads(s[s.index("{"):s.rindex("}") + 1])["items"] if i["k"] == "port"}
    R = rows(p, "port0499"); h = next(i for i, r in enumerate(R) if r and str(r[0]).startswith("Year ["))
    year = max(int(float(r[0])) for r in R[h + 1:] if r and isinstance(r[0], float))
    flows, totals, unplaced = defaultdict(lambda: [0.0, 0.0, 0.0, 0.0]), defaultdict(lambda: defaultdict(float)), set()
    for r in R[h + 1:]:
        if not r or not isinstance(r[0], float) or int(r[0]) != year: continue
        port, reg, country, direc = str(r[1]), str(r[2]), str(r[3]), str(r[4])
        t = float(r[8] or 0) if isinstance(r[8], float) else 0.0; u = float(r[9] or 0) if len(r) > 9 and isinstance(r[9], float) else 0.0
        poi = ports.get(port.lower()) or ports.get(port.lower().replace(" & ", " and ")) or next((v for k, v in ports.items() if k.startswith(port.lower().split(" ")[0])), None)
        if not poi: unplaced.add(port); continue
        totals[poi["id"]]["t"] += t; totals[poi["id"]]["u"] += u; totals[poi["id"]][REGION_SHORT.get(reg, reg)] += t
        if country in ANCHOR:
            f = flows[(poi["id"], country, reg)]; f[0 if direc == "Inwards" else 1] += t; f[2 if direc == "Inwards" else 3] += u
    feats, per_port = [], defaultdict(list)
    for (pid, country, reg), (tin, tout, uin, uout) in flows.items():
        tot = tin + tout
        if tot < 5: continue   # thousand tonnes: drop the tiniest flows
        poi = next(v for v in ports.values() if v["id"] == pid)
        feats.append({"type": "Feature", "properties": {"p": pid, "c": country, "r": REGION_SHORT.get(reg, reg), "col": REGION_COL.get(reg, "#777"), "t": round(tot * 1000), "tin": round(tin * 1000), "tout": round(tout * 1000), "u": round((uin + uout) * 1000)},
                      "geometry": {"type": "LineString", "coordinates": arc([poi["lon"], poi["lat"]], ANCHOR[country])}})
        per_port[pid].append([country, REGION_SHORT.get(reg, reg), round(tin * 1000), round(tout * 1000), round((uin + uout) * 1000)])
    for pid in per_port: per_port[pid].sort(key=lambda x: -(x[2] + x[3]))
    out = {"year": year, "routes": {"type": "FeatureCollection", "features": sorted(feats, key=lambda f: f["properties"]["t"])}, "ports": {pid: {"t": round(v["t"] * 1000), "u": round(v["u"] * 1000), "regions": {k: round(x * 1000) for k, x in v.items() if k not in ("t", "u")}, "partners": per_port.get(pid, [])[:20]} for pid, v in totals.items()},
           "colours": {REGION_SHORT[k]: v for k, v in REGION_COL.items()}, "source": f"DfT Port freight statistics, PORT0499 ({year}), Open Government Licence v3.0. Lines run to each partner country's main port (approximate)."}
    with open(os.path.join(ROOT, "data", "freight.js"), "w", encoding="utf-8") as fh:
        fh.write("// Atlas 0.8.1: freight routes from UK ports. Built by pipeline/build_freight.py; do not edit.\nwindow.ATLAS_FREIGHT = "); json.dump(out, fh, separators=(",", ":"), ensure_ascii=False); fh.write(";\n")
    print(f"freight {year}: {len(feats)} routes from {len(per_port)} ports; ports not matched: {sorted(unplaced)}")

    # ---------- ferry routes (OpenStreetMap) ----------
    fp = os.path.join(RAW, "ferries_osm.json")
    if not (offline and os.path.exists(fp)):
        q = '[out:json][timeout:240];way["route"="ferry"](49.5,-11,61.5,2.5);out geom tags;'
        subprocess.run(["curl", "-sS", "-m", "300", "-A", UA, "-X", "POST", "https://overpass-api.de/api/interpreter", "--data-urlencode", "data=" + q, "-o", fp], check=True)
    manifest.record("raw/transport/ferries_osm.json", "OpenStreetMap contributors (Overpass API)", "Ferry routes (route=ferry) around the UK", "https://overpass-api.de/", "ODbL 1.0", "UK and near waters", "for data/ferries.js")
    fe = []
    for e in json.load(open(fp))["elements"]:
        g = e.get("geometry") or []
        if len(g) < 2: continue
        t = e.get("tags", {}); pts = [[round(x["lon"], 4), round(x["lat"], 4)] for x in g]
        if len(pts) > 60: step = math.ceil(len(pts) / 60); pts = pts[::step] + [pts[-1]]
        km = sum(math.hypot((b[0] - a[0]) * 111 * math.cos(math.radians(a[1])), (b[1] - a[1]) * 111) for a, b in zip(pts, pts[1:]))
        fe.append({"type": "Feature", "properties": {"n": t.get("name", ""), "op": t.get("operator", ""), "dur": t.get("duration", ""), "car": 1 if t.get("motor_vehicle") == "yes" or t.get("motorcar") == "yes" else 0,
                   "foot": 0 if t.get("foot") == "no" else 1, "bike": 1 if t.get("bicycle") == "yes" else 0, "km": round(km, 1), "site": t.get("website", "")}, "geometry": {"type": "LineString", "coordinates": pts}})
    with open(os.path.join(ROOT, "data", "ferries.js"), "w", encoding="utf-8") as fh:
        fh.write("// Atlas 0.8.1: ferry routes from OpenStreetMap (ODbL). Built by pipeline/build_freight.py; do not edit.\nwindow.ATLAS_FERRIES = ")
        json.dump({"built": datetime.date.today().isoformat(), "routes": {"type": "FeatureCollection", "features": fe}, "source": "Ferry routes © OpenStreetMap contributors (ODbL)"}, fh, separators=(",", ":"), ensure_ascii=False); fh.write(";\n")
    print(f"ferries: {len(fe)} routes")


if __name__ == "__main__":
    main()
