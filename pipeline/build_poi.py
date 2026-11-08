"""
Atlas 0.8: places shown as symbols on the map: airports, ports, railway stations and financial sites.
Standard library only.   python3 pipeline/build_poi.py [--offline]

Sources (downloaded to pipeline/sources/raw/poi/, recorded in MANIFEST.csv):
  NaPTAN (DfT) access nodes for rail (area 910), airports (920) and ferry (930): names and coordinates.   OGL
  ORR Estimates of station usage, table 1415a: entries and exits by station, every year since 1997-98.    OGL
  CAA UK airport data (annual): table 01 size of airports, 10.3 terminal passengers 2015-2025, 03.1 movements,
    13.2 freight.                                                                                           CAA (reuse with acknowledgement)
  DfT port freight PORT0101 (tonnage by port, every year since 2000) and the major/minor port list (with locations). OGL
  Financial sites: the four financial districts in data/markets.js plus a short hand table (pipeline/sources/finance_sites.csv).

Joins: ORR → NaPTAN by station name (normalised); CAA → NaPTAN airport entrances by name; DfT ports carry their own
location. Every site is placed in a council (point in polygon, pipeline/geometry/councils.geojson) or dropped if it is
outside the UK. Output: data/places_poi.js and pipeline/reports/validation_poi.md.
"""
import csv, io, json, math, os, re, subprocess, sys, datetime
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
from build import polys, inside, bbox
from ods_read import rows as ods_rows
import manifest

RAW = os.path.join(HERE, "sources", "raw", "poi"); os.makedirs(RAW, exist_ok=True)
UA = "Atlas/0.8 (open UK map; https://github.com/atlasmaps-lab/atlas)"
CAA = "https://www.caa.co.uk/Documents/Download/24007/87fb7670-4e10-4aeb-942d-509238aa25a1/"
FILES = {
    "naptan.csv": ("https://naptan.api.dft.gov.uk/v1/access-nodes?dataFormat=csv&atcoAreaCodes=910,920,930", "Department for Transport", "NaPTAN access nodes (rail, air, ferry)", manifest.OGL),
    "orr_1415.ods": ("https://dataportal.orr.gov.uk/media/1908/table-1415-time-series-of-passenger-entries-and-exits-and-interchanges-by-station.ods", "Office of Rail and Road", "Estimates of station usage, table 1415 time series", manifest.OGL),
    "caa_t01.csv": (CAA + "17532", "Civil Aviation Authority", "UK airport data 2025, table 01 size of UK airports", "CAA: free reuse with acknowledgement"),
    "caa_t103.csv": (CAA + "17507", "Civil Aviation Authority", "UK airport data 2025, table 10.3 terminal passengers 2015-2025", "CAA: free reuse with acknowledgement"),
    "caa_t031.csv": (CAA + "17535", "Civil Aviation Authority", "UK airport data 2025, table 03.1 aircraft movements", "CAA: free reuse with acknowledgement"),
    "caa_t132.csv": (CAA + "17515", "Civil Aviation Authority", "UK airport data 2025, table 13.2 freight 2015-2025", "CAA: free reuse with acknowledgement"),
    "port0101.ods": ("https://assets.publishing.service.gov.uk/media/6a62202b2dc18ebe4c3b2b06/port0101.ods", "Department for Transport", "Port freight statistics PORT0101", manifest.OGL),
    "portlist.ods": ("https://assets.publishing.service.gov.uk/media/6888c795048fff613a4d5ae9/Major_and_Minor_Port_List_for_Freight_Statistics.ods", "Department for Transport", "Major and minor port list for freight statistics", manifest.OGL),
}


def fetch(offline):
    for f, (url, pub, title, lic) in FILES.items():
        p = os.path.join(RAW, f)
        if offline and os.path.exists(p): continue
        subprocess.run(["curl", "-sSL", "-m", "180", "-A", UA, "-o", p, url], check=True)
        manifest.record("raw/poi/" + f, pub, title, url, lic, "UK", "for data/places_poi.js (pipeline/build_poi.py)")


def norm(s):
    s = (s or "").lower().replace("&", " and ").replace("'", "")
    return re.sub(r"[^a-z0-9]+", " ", s).strip()


def station_key(s):
    s = norm(s)
    s = re.sub(r"\b(rail station|railway station|station)\b", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def airport_key(s):
    s = norm(s)
    s = re.sub(r"\b(international|airport|airfield|terminals?|t\d|\d+|london|city of|john lennon|george best)\b", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def osgb_to_wgs84(E, N):
    """British National Grid easting/northing → WGS84 longitude, latitude (OS formulas plus a Helmert shift; ~5 m)."""
    a, b, F0 = 6377563.396, 6356256.909, 0.9996012717
    lat0, lon0, N0, E0 = math.radians(49), math.radians(-2), -100000, 400000
    e2 = 1 - b * b / (a * a); n = (a - b) / (a + b)
    lat, M = lat0, 0
    while True:
        lat = (N - N0 - M) / (a * F0) + lat
        Ma = (1 + n + 5 / 4 * n ** 2 + 5 / 4 * n ** 3) * (lat - lat0); Mb = (3 * n + 3 * n ** 2 + 21 / 8 * n ** 3) * math.sin(lat - lat0) * math.cos(lat + lat0)
        Mc = (15 / 8 * n ** 2 + 15 / 8 * n ** 3) * math.sin(2 * (lat - lat0)) * math.cos(2 * (lat + lat0)); Md = 35 / 24 * n ** 3 * math.sin(3 * (lat - lat0)) * math.cos(3 * (lat + lat0))
        M = b * F0 * (Ma - Mb + Mc - Md)
        if abs(N - N0 - M) < 0.00001: break
    sl, cl, tl = math.sin(lat), math.cos(lat), math.tan(lat)
    nu = a * F0 / math.sqrt(1 - e2 * sl * sl); rho = a * F0 * (1 - e2) / (1 - e2 * sl * sl) ** 1.5; eta2 = nu / rho - 1
    VII = tl / (2 * rho * nu); VIII = tl / (24 * rho * nu ** 3) * (5 + 3 * tl ** 2 + eta2 - 9 * tl ** 2 * eta2); IX = tl / (720 * rho * nu ** 5) * (61 + 90 * tl ** 2 + 45 * tl ** 4)
    X = 1 / (cl * nu); XI = 1 / (cl * 6 * nu ** 3) * (nu / rho + 2 * tl ** 2); XII = 1 / (cl * 120 * nu ** 5) * (5 + 28 * tl ** 2 + 24 * tl ** 4); XIIA = 1 / (cl * 5040 * nu ** 7) * (61 + 662 * tl ** 2 + 1320 * tl ** 4 + 720 * tl ** 6)
    dE = E - E0
    phi = lat - VII * dE ** 2 + VIII * dE ** 4 - IX * dE ** 6; lam = lon0 + X * dE - XI * dE ** 3 + XII * dE ** 5 - XIIA * dE ** 7
    # OSGB36 → WGS84 (Helmert)
    nu = a / math.sqrt(1 - e2 * math.sin(phi) ** 2)
    x, y, z = nu * math.cos(phi) * math.cos(lam), nu * math.cos(phi) * math.sin(lam), (1 - e2) * nu * math.sin(phi)
    tx, ty, tz, s = 446.448, -125.157, 542.060, -20.4894e-6
    rx, ry, rz = [math.radians(v / 3600) for v in (0.1502, 0.2470, 0.8421)]
    x2 = tx + (1 + s) * x - rz * y + ry * z; y2 = ty + rz * x + (1 + s) * y - rx * z; z2 = tz - ry * x + rx * y + (1 + s) * z
    a2, b2 = 6378137.0, 6356752.3142; e22 = 1 - b2 * b2 / (a2 * a2); p = math.hypot(x2, y2)
    phi2 = math.atan2(z2, p * (1 - e22))
    for _ in range(10):
        nu2 = a2 / math.sqrt(1 - e22 * math.sin(phi2) ** 2); phi2 = math.atan2(z2 + e22 * nu2 * math.sin(phi2), p)
    return math.degrees(math.atan2(y2, x2)), math.degrees(phi2)


def lonlat(r):
    if r.get("Longitude") and r.get("Latitude"): return float(r["Longitude"]), float(r["Latitude"])
    if r.get("Easting") and r.get("Northing"): return osgb_to_wgs84(float(r["Easting"]), float(r["Northing"]))
    return None


def compact(series, n):
    """[first year, value, value, ...] for the last n years (None where a year is missing)"""
    ys = sorted(series)[-n:]; y0 = ys[0]
    return [y0] + [series.get(y) for y in range(y0, ys[-1] + 1)]


def num(v):
    if v is None: return None
    if isinstance(v, (int, float)): return float(v)
    v = str(v).replace(",", "").strip()
    try: return float(v)
    except ValueError: return None


def locator():
    geo = json.load(open(os.path.join(HERE, "geometry", "councils.geojson")))
    feats = [(f["properties"]["code"], bbox(f["geometry"]), f["geometry"]) for f in geo["features"]]
    def find(lon, lat):
        for code, b, g in feats:
            if b[0] <= lon <= b[2] and b[1] <= lat <= b[3] and any(inside([lon, lat], p[0]) for p in polys(g)): return code
        best, bd = None, 3.0   # coastal sites (ports, piers) just outside the generalised coastline: the council within 3 km
        for code, b, g in feats:
            if not (b[0] - 0.06 <= lon <= b[2] + 0.06 and b[1] - 0.06 <= lat <= b[3] + 0.06): continue
            for p in polys(g):
                for x, y in p[0][::2]:
                    d = math.hypot((x - lon) * 111.32 * math.cos(math.radians(lat)), (y - lat) * 110.57)
                    if d < bd: best, bd = code, d
        return best
    return find


def main():
    offline = "--offline" in sys.argv
    fetch(offline)
    find = locator()
    nap = [r for r in csv.DictReader(open(os.path.join(RAW, "naptan.csv"), encoding="utf-8-sig")) if r["Status"] == "active"]
    log = {"stations": {"matched": [], "unmatched_orr": []}, "airports": {"matched": [], "unmatched": []}, "ports": {"placed": [], "no_location": []}, "outside": []}
    items = []
    HAND = {(r["kind"], r["name"]): (float(r["lon"]), float(r["lat"]), r["note"]) for r in csv.DictReader(open(os.path.join(HERE, "sources", "poi_locations.csv"), encoding="utf-8"))}
    NOT_UK = {"ALDERNEY", "GUERNSEY", "JERSEY", "ISLE OF MAN"}   # Crown Dependencies: not part of the UK

    # ---------- railway stations: ORR usage, located by NaPTAN ----------
    rly = {}
    for r in nap:
        if r["StopType"] != "RLY": continue
        rly.setdefault(station_key(r["CommonName"]), []).append(r)
    cnames = {f["properties"]["code"]: f["properties"].get("name", "") for f in json.load(open(os.path.join(HERE, "geometry", "councils.geojson")))["features"]}
    words = lambda t: set(re.findall(r"[a-z]{3,}", (t or "").lower())) - {"and", "the", "city", "county", "borough", "council", "district", "of"}
    T = ods_rows(os.path.join(RAW, "orr_1415.ods"), "1415a_Entries_and_Exits")
    head = next(i for i, r in enumerate(T) if r and r[0] == "Sort")
    years = [int(re.search(r"to Mar (\d{4})", str(h)).group(1)) for h in T[head][6:] if h and re.search(r"to Mar (\d{4})", str(h))]
    for r in T[head + 1:]:
        if not r or len(r) < 7 or not r[1]: continue
        name, tlc = str(r[1]).strip(), str(r[2] or "").strip()
        vals = [num(v) for v in r[6:6 + len(years)]]
        series = {y: round(v) for y, v in zip(years, vals) if v is not None}
        if not series: continue
        latest_y = max(series); latest = series[latest_y]
        la = str(r[5] or "")   # ORR's local authority: tells same-named stations apart (Newport, Essex vs Newport, South Wales)
        k0 = station_key(name); k1 = station_key(re.sub(r"\s*\(.*?\)", "", name)); k2 = station_key(name.replace(" (", " ").replace(")", ""))
        cands = rly.get(k0) or rly.get(k2) or []
        if not cands: cands = rly.get(k1, []) + [v for kk, vs in rly.items() if k1 and kk.startswith(k1 + " ") for v in vs]   # "Lincoln" is "Lincoln Central" in NaPTAN
        n = None
        if len(cands) == 1 and (k0 in rly or k2 in rly): n = cands[0]
        elif cands:
            def score(c):
                ll = lonlat(c); cc = find(*ll) if ll else None
                return len(words(la) & words(cnames.get(cc, ""))) + (0.5 if station_key(c["CommonName"]) in (k0, k2) else 0)
            sc = sorted(((score(c), c) for c in cands), key=lambda x: -x[0])
            top = [c for v, c in sc if v == sc[0][0]]
            def near(a, b):
                la_, lb_ = lonlat(a), lonlat(b)
                return la_ and lb_ and math.hypot((la_[0] - lb_[0]) * 70, (la_[1] - lb_[1]) * 111) < 2
            same_place = all(near(top[0], c) for c in top[1:])   # one station listed twice (several NaPTAN entries)
            if (sc[0][0] >= 1 or (k0 in rly or k2 in rly)) and same_place: n = top[0]
        if not n:
            log["stations"]["unmatched_orr"].append([name, tlc, latest]); continue
        ll = lonlat(n)
        if not ll: log["stations"]["unmatched_orr"].append([name, tlc, latest]); continue
        lon, lat = ll
        code = find(lon, lat)
        if not code: log["outside"].append(["station", name, lon, lat]); continue
        log["stations"]["matched"].append(name)
        items.append({"id": "rs-" + (tlc or n["ATCOCode"]), "k": "station", "n": name, "lon": round(lon, 5), "lat": round(lat, 5), "c": code, "crs": tlc,
                      "v": latest, "vy": latest_y, "s": compact(series, 12)})

    # ---------- airports: CAA passengers, located by NaPTAN airport entrances ----------
    gat = {}
    for r in nap:
        if r["StopType"] != "GAT": continue
        gat.setdefault(airport_key(r["CommonName"]), []).append(r)
    def read_csv(f): return list(csv.DictReader(open(os.path.join(RAW, f), encoding="utf-8-sig")))
    pax = {r["rpt_apt_name"]: r for r in read_csv("caa_t103.csv")}
    mov = {r["rpt_apt_name"]: r for r in read_csv("caa_t031.csv")}
    frt = {r["rpt_apt_name"]: r for r in read_csv("caa_t132.csv")}
    span = next(iter(pax.values()))["span"]; y0 = int(span.split("-")[0])
    MANUAL = {"HEATHROW": "heathrow", "GATWICK": "gatwick", "STANSTED": "stansted", "LUTON": "luton", "LONDON CITY": "", "SOUTHEND": "southend", "EAST MIDLANDS INTERNATIONAL": "east midlands",
              "BELFAST INTERNATIONAL": "belfast", "BELFAST CITY (GEORGE BEST)": "belfast city", "LIVERPOOL (JOHN LENNON)": "liverpool", "CARDIFF WALES": "cardiff", "DURHAM TEES VALLEY": "teesside"}
    for name, r in pax.items():
        series = {}
        for i in range(1, 12):
            v = num(r.get("Y%d" % i))
            if v is not None: series[y0 + i - 1] = round(v)
        if not series or max(series.values()) < 1000 or name in NOT_UK: continue
        k = MANUAL.get(name, airport_key(name)) if name in MANUAL else airport_key(name)
        cand = gat.get(k) or next((v for kk, v in gat.items() if k and (kk.startswith(k) or k.startswith(kk))), None)
        if name == "LONDON CITY": cand = gat.get("city") or next((v for kk, v in gat.items() if "city" in kk and "belfast" not in kk), None)
        approx = None
        if cand:
            pts = [lonlat(c) for c in cand if lonlat(c)]
            lon = sum(p[0] for p in pts) / len(pts); lat = sum(p[1] for p in pts) / len(pts)
        elif ("airport", name) in HAND:
            lon, lat, approx = HAND[("airport", name)]; cand = [{"CommonName": "hand table: " + approx}]
        else:
            log["airports"]["unmatched"].append([name, series.get(max(series))]); continue
        code = find(lon, lat)
        if not code: log["outside"].append(["airport", name, lon, lat]); continue
        latest_y = max(series)
        m, f = mov.get(name), frt.get(name)
        nice = re.sub(r"\s*\((.*)\)", r" \1", name.title()).replace("Ii", "II")
        log["airports"]["matched"].append([name, cand[0]["CommonName"]])
        if series[latest_y] < 1000: continue   # closed (e.g. Doncaster Sheffield)
        items.append({"id": "ap-" + re.sub(r"[^a-z]+", "-", name.lower()).strip("-"), "k": "airport", "n": nice + ("" if "Airport" in nice else " Airport"), "lon": round(lon, 5), "lat": round(lat, 5), "c": code,
                      "v": series[latest_y], "vy": latest_y, "s": compact(series, 12),
                      "mv": round(num(m["grand_total"])) if m and num(m.get("grand_total")) else None,
                      "fr": round(num(f["yr11"])) if f and num(f.get("yr11")) is not None else None})

    # ---------- ports: DfT freight tonnage, with DfT's own locations ----------
    PL = ods_rows(os.path.join(RAW, "portlist.ods"), "Major_Ports_List")
    hi = next(i for i, r in enumerate(PL) if r and r[0] == "Port Locode")
    loc = {}
    for r in PL[hi + 1:]:
        if len(r) > 8 and r[2] and isinstance(r[7], float) and isinstance(r[8], float): loc[str(r[3]).strip().lower()] = (r[8], r[7], r[2])
    P = ods_rows(os.path.join(RAW, "port0101.ods"), "port0101_(both_directions)")
    ph = next(i for i, r in enumerate(P) if r and r[0] == "Ports")
    pyears = [int(str(h)[:4]) if h and re.match(r"\d{4}", str(h)) else None for h in P[ph]]
    for r in P[ph + 1:]:
        if not r or not r[0] or "Major" not in str(r[2] if len(r) > 2 else ""): continue
        name = re.sub(r"\s*\[.*?\]", "", str(r[0])).strip()
        series = {pyears[i]: round(num(v) * 1000) for i, v in enumerate(r) if i < len(pyears) and pyears[i] and pyears[i] >= 2000 and num(v) is not None}
        if not series or name.lower().startswith(("all ", "total", "other")): continue
        l = loc.get(name.lower())
        if not l and ("port", name) in HAND: h = HAND[("port", name)]; l = (h[0], h[1], "GB" + re.sub(r"[^A-Z]", "", name.upper())[:3]); log["ports"].setdefault("approx", []).append(name)
        if not l:
            log["ports"]["no_location"].append(name); continue
        lon, lat, locode = l
        code = find(lon, lat)
        if not code: log["outside"].append(["port", name, lon, lat]); continue
        latest_y = max(series)
        log["ports"]["placed"].append(name)
        items.append({"id": "pt-" + str(locode).lower(), "k": "port", "n": name if "port" in name.lower() else "Port of " + name, "lon": round(lon, 5), "lat": round(lat, 5), "c": code,
                      "v": series[latest_y], "vy": latest_y, "s": compact(series, 15), "grp": r[1]})

    # ---------- financial sites: the districts plus a short hand table ----------
    mk = open(os.path.join(ROOT, "data", "markets.js"), encoding="utf-8").read()
    MK = json.loads(mk[mk.index("{"):mk.rindex("}") + 1])
    for f in MK["zones"]["features"]:
        pr = f["properties"]; pt = pr.get("pt") or [sum(x for x, _ in f["geometry"]["coordinates"][0]) / len(f["geometry"]["coordinates"][0]), sum(y for _, y in f["geometry"]["coordinates"][0]) / len(f["geometry"]["coordinates"][0])]
        items.append({"id": "fz-" + pr["code"].lower(), "k": "finance", "n": pr["name"], "lon": round(pt[0], 5), "lat": round(pt[1], 5), "c": pr.get("council") or find(pt[0], pt[1]), "zone": pr["code"], "note": pr.get("note", "")})
    for r in csv.DictReader(open(os.path.join(HERE, "sources", "finance_sites.csv"), encoding="utf-8")):
        lon, lat = float(r["lon"]), float(r["lat"])
        items.append({"id": "fs-" + r["id"], "k": "finance", "n": r["name"], "lon": lon, "lat": lat, "c": find(lon, lat), "note": r["note"], "url": r["url"]})

    # ---------- importance and the zoom each one appears at ----------
    for k in ("station", "airport", "port"):
        xs = sorted([i for i in items if i["k"] == k], key=lambda i: -i["v"])
        for rank, i in enumerate(xs):
            i["rank"] = rank + 1
            if k == "airport": i["minz"] = 4.6 if rank < 8 else 6 if rank < 20 else 7.5
            elif k == "port": i["minz"] = 5.5 if rank < 10 else 7 if rank < 30 else 8.5
            else: i["minz"] = 7 if rank < 12 else 8.5 if i["v"] >= 5e6 else 10 if i["v"] >= 1e6 else 11.5 if i["v"] >= 2e5 else 12.5
            i["sz"] = round(1.0 if rank < 10 else 0.85 if rank < 40 else 0.72, 2)
    for i in items:
        if i["k"] == "finance": i.update({"minz": 8 if i["id"].startswith("fz-") else 11, "sz": 0.85, "rank": 0})
    built = datetime.date.today().isoformat()
    out = {"built": built, "kinds": {"airport": "Airport", "port": "Port", "station": "Railway station", "finance": "Financial centre"},
           "units": {"airport": "terminal passengers a year", "port": "tonnes of freight a year", "station": "entries and exits a year (April to March)"},
           "sources": {"station": "ORR Estimates of station usage (table 1415a); locations from NaPTAN (DfT)", "airport": "CAA UK airport data (tables 10.3, 03.1, 13.2); locations from NaPTAN (DfT)",
                       "port": "DfT Port freight statistics (PORT0101); locations from DfT's major port list", "finance": "Atlas: financial districts (data/markets.js) and a hand table of institutions"},
           "items": items}
    with open(os.path.join(ROOT, "data", "places_poi.js"), "w", encoding="utf-8") as fh:
        fh.write("// Atlas 0.8: airports, ports, railway stations and financial sites as map symbols. Built by pipeline/build_poi.py; do not edit.\nwindow.ATLAS_POI = ")
        json.dump(out, fh, separators=(",", ":"), ensure_ascii=False); fh.write(";\n")
    report(items, log, built)
    print(f"{len(items)} places: " + ", ".join(f"{sum(1 for i in items if i['k'] == k)} {k}s" for k in ("airport", "port", "station", "finance")))


def report(items, log, built):
    S = log["stations"]; A = log["airports"]; Pt = log["ports"]
    big_un = sorted([u for u in S["unmatched_orr"] if u[2] and u[2] >= 1e6], key=lambda u: -u[2])
    md = f"""# Validation: map symbols (Atlas 0.8)

Written by `pipeline/build_poi.py` on {built}.

## Summary
- **{sum(1 for i in items if i['k'] == 'station')} railway stations** with ORR usage figures, placed by NaPTAN. ORR stations not matched to a NaPTAN location: {len(S['unmatched_orr'])} ({len(big_un)} of them with a million or more entries and exits a year, listed below).
- **{sum(1 for i in items if i['k'] == 'airport')} airports** with CAA passenger figures. Not matched: {len(A['unmatched'])}.
- **{sum(1 for i in items if i['k'] == 'port')} major ports** with DfT tonnage. {len(Pt.get('approx', []))} placed from Atlas's hand table because DfT's list has no location for them (approximate, harbour level: {", ".join(Pt.get('approx', []))}). Still without a location: {len(Pt['no_location'])}.
- Airports in the Channel Islands and the Isle of Man are left out: they are Crown Dependencies, not part of the UK. Northern Ireland's airports, Prestwick, Teesside and Farnborough are placed from the hand table (`pipeline/sources/poi_locations.csv`) because NaPTAN doesn't list them.
- **{sum(1 for i in items if i['k'] == 'finance')} financial sites** (the four districts and a hand table).
- **Places outside every UK council: {len(log['outside'])}** (dropped).

## Airports matched (CAA name → NaPTAN entrance)
{chr(10).join(f"- {a} → {b}" for a, b in A['matched'])}

## Airports not matched
{chr(10).join(f"- {a} ({int(v or 0):,} passengers)" for a, v in A['unmatched']) or "None."}

## Ports without a location
{chr(10).join("- " + p for p in Pt['no_location']) or "None."}

## Busy stations not matched (1m+ entries and exits)
{chr(10).join(f"- {n} ({t}): {int(v):,}" for n, t, v in big_un) or "None."}

## Dropped as outside the UK
{chr(10).join(f"- {k}: {n} ({x:.3f}, {y:.3f})" for k, n, x, y in log['outside']) or "None."}
"""
    with open(os.path.join(HERE, "reports", "validation_poi.md"), "w", encoding="utf-8") as fh: fh.write(md)


if __name__ == "__main__":
    main()
