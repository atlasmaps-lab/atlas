"""
Atlas 0.3.1 build (from Mo's 1.3): boundaries + figures -> data/*.js   (python3 pipeline/build.py, standard library only)

geometry/  nations.geojson, eng_regions.geojson, councils.geojson, wards.geojson   (ONS Open Geography Portal)
sources/   population_age_mid2025.csv   ONS mid-2025 population estimates via Nomis (councils, regions, nations)
           ward_population_mid2024.csv  ONS mid-2024 small-area estimates via Nomis (England and Wales wards)
           gdp.csv                      ONS regional GDP, 2024 (2023 where ONS suppressed 2024)
           council_politics.csv         council leader and control (Wikipedia, October 2026)
           national_leaders.csv         heads of the UK, devolved and London governments
"""
import csv, glob, json, math, os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
DATA = os.path.join(ROOT, "data")
SRC = os.path.join(HERE, "sources")
R = 6378137.0
NATION = {"E": "E92000001", "W": "W92000004", "S": "S92000003", "N": "N92000002"}
# council codes that changed after the source tables were published
CODE_ALIAS = {"E08000038": "E08000016", "E08000039": "E08000019"}


def polys(g):
    return [g["coordinates"]] if g["type"] == "Polygon" else g["coordinates"]


def ring_area(c):
    t = 0.0
    for i in range(len(c)):
        lo, mi, hi = c[i - 2], c[i - 1], c[i]
        t += (math.radians(hi[0]) - math.radians(lo[0])) * math.sin(math.radians(mi[1]))
    return abs(t * R * R / 2)


def area_km2(g):
    return sum(ring_area(p[0]) - sum(ring_area(h) for h in p[1:]) for p in polys(g)) / 1e6


def inside(pt, ring):
    x, y, c = pt[0], pt[1], False
    j = len(ring) - 1
    for i in range(len(ring)):
        xi, yi, xj, yj = ring[i][0], ring[i][1], ring[j][0], ring[j][1]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            c = not c
        j = i
    return c


def rep_point(g):
    best = max(polys(g), key=lambda p: ring_area(p[0]))[0]
    ys = sorted(p[1] for p in best)
    y = (ys[0] + ys[-1]) / 2
    xs = sorted(a[0] + (y - a[1]) * (b[0] - a[0]) / (b[1] - a[1]) for a, b in zip(best[-1:] + best[:-1], best) if (a[1] > y) != (b[1] > y))
    if len(xs) >= 2:
        k = max(range(0, len(xs) - 1, 2), key=lambda k: xs[k + 1] - xs[k])
        return [(xs[k] + xs[k + 1]) / 2, y]
    return best[0]


def bbox(g):
    xs = [p[0] for poly in polys(g) for p in poly[0]]
    ys = [p[1] for poly in polys(g) for p in poly[0]]
    return (min(xs), min(ys), max(xs), max(ys))


def read(name):
    p = os.path.join(SRC, name)
    return list(csv.DictReader(open(p, encoding="utf-8-sig"))) if os.path.exists(p) else []


def num(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def split_leader(s):
    """'Leader: Name (Party) ; Co-leader: Name (Party)' -> (title, names, parties)"""
    parts = [p.strip() for p in (s or "").split(";") if p.strip()]
    titles, names, parties = [], [], []
    for p in parts:
        t, _, rest = p.partition(":")
        rest = rest.strip()
        party = ""
        if rest.endswith(")") and "(" in rest:
            party = rest[rest.rindex("(") + 1:-1].strip()
            rest = rest[:rest.rindex("(")].strip()
        if not rest or rest.lower() == "vacant":
            continue
        titles.append(t.strip()); names.append(rest); parties.append(party)
    return titles, names, parties


def main():
    G = {k: json.load(open(os.path.join(HERE, "geometry", k + ".geojson"))) for k in ("nations", "eng_regions", "councils", "wards")}
    places = {"K02000001": {"name": "United Kingdom", "level": "country"}}

    # nations
    for f in G["nations"]["features"]:
        c = f["properties"]["code"]
        f["properties"] = {"code": c, "name": f["properties"]["name"], "level": "nation"}
        places[c] = {"name": f["properties"]["name"], "level": "nation", "parent": "K02000001", "area": area_km2(f["geometry"])}
    # regions: the 9 English regions, plus Scotland, Wales and Northern Ireland as regions of their own
    regions = []
    for f in G["eng_regions"]["features"]:
        c = f["properties"]["code"]
        regions.append({"type": "Feature", "properties": {"code": c, "name": f["properties"]["name"], "level": "region"}, "geometry": f["geometry"]})
        places[c] = {"name": f["properties"]["name"], "level": "region", "parent": "E92000001", "area": area_km2(f["geometry"])}
    for f in G["nations"]["features"]:
        c = f["properties"]["code"]
        if c != "E92000001":
            regions.append({"type": "Feature", "properties": {"code": c, "name": f["properties"]["name"], "level": "region"}, "geometry": f["geometry"]})
    G["regions"] = {"type": "FeatureCollection", "features": regions}

    # councils, with their region by point-in-polygon
    eng = [f for f in G["eng_regions"]["features"]]
    for f in G["councils"]["features"]:
        c = f["properties"]["code"]
        nat = NATION[c[0]]
        reg = nat
        if c[0] == "E":
            pt = rep_point(f["geometry"])
            hit = next((r for r in eng if any(inside(pt, p[0]) for p in polys(r["geometry"]))), None)
            if hit is None:
                hit = min(eng, key=lambda r: sum((a - b) ** 2 for a, b in zip(rep_point(r["geometry"]), pt)))
            reg = hit["properties"]["code"]
        f["properties"] = {"code": c, "name": f["properties"]["name"], "level": "council"}
        places[c] = {"name": f["properties"]["name"], "level": "council", "parent": reg, "nation": nat, "area": area_km2(f["geometry"]), "pt": [round(x, 4) for x in rep_point(f["geometry"])]}

    # wards -> council by point-in-polygon, one file per council
    cfs = G["councils"]["features"]
    boxes = [bbox(f["geometry"]) for f in cfs]
    ward_files = {}
    for w in G["wards"]["features"]:
        pt = rep_point(w["geometry"])
        home = None
        for f, b in zip(cfs, boxes):
            if b[0] <= pt[0] <= b[2] and b[1] <= pt[1] <= b[3] and any(inside(pt, p[0]) for p in polys(f["geometry"])):
                home = f["properties"]["code"]; break
        if home is None:
            home = min((f["properties"]["code"] for f in cfs), key=lambda c: (places[c]["pt"][0] - pt[0]) ** 2 + (places[c]["pt"][1] - pt[1]) ** 2)
        code, name = w["properties"]["code"], w["properties"]["name"]
        w["properties"] = {"code": code, "name": name, "level": "ward"}
        ward_files.setdefault(home, []).append(w)
        places[code] = {"name": name, "level": "ward", "parent": home, "nation": places[home]["nation"], "area": area_km2(w["geometry"])}
    del G["wards"], G["eng_regions"]

    # ---------- figures ----------
    info = {}
    def put(code, key, value, source, year=""):
        if value in (None, ""):
            return
        info.setdefault(code, {})[key] = {"v": value, "src": source, "yr": str(year)}

    pop = {r["code"]: r for r in read("population_age_mid2025.csv")}
    for code, p in places.items():
        r = pop.get(CODE_ALIAS.get(code, code))
        if r and p["level"] in ("council", "region", "nation"):
            put(code, "population", int(float(r["population"])), "ONS mid-year population estimates (Nomis)", r["year"])
            put(code, "average_age", float(r["mean_age"]), "ONS mid-year population estimates (Nomis); mean age", r["year"])
    # Scotland and the UK: sum of councils, population-weighted mean age
    for nat in ("S92000003", "K02000001"):
        cs = [c for c, p in places.items() if p["level"] == "council" and (nat == "K02000001" or p["nation"] == nat)]
        tot = sum(info[c]["population"]["v"] for c in cs if c in info and "population" in info[c])
        age = sum(info[c]["population"]["v"] * info[c]["average_age"]["v"] for c in cs if c in info and "average_age" in info[c]) / tot
        put(nat, "population", tot, "ONS mid-year estimates (sum of councils)", "2025")
        put(nat, "average_age", round(age, 1), "ONS mid-year estimates (mean age, weighted by council)", "2025")
    for r in read("ward_population_mid2024.csv"):
        if r["code"] in places:
            put(r["code"], "population", int(r["population"]), "ONS small-area population estimates (Nomis)", "2024")
            put(r["code"], "average_age", num(r["mean_age"]), "ONS small-area population estimates (Nomis); mean age", "2024")

    gdp = {r["code"]: r for r in read("gdp.csv")}
    eng_total = sum(float(gdp[c]["gdp_gbp_million"]) for c in gdp if c.startswith("E12"))
    gdp["E92000001"] = {"gdp_gbp_million": eng_total, "year": "2024"}
    for code, p in places.items():
        r = gdp.get(CODE_ALIAS.get(code, code))
        if r and num(r["gdp_gbp_million"]) is not None:
            put(code, "gdp", float(r["gdp_gbp_million"]) * 1e6, "ONS regional GDP at current market prices" + (" (sum of English regions)" if code == "E92000001" else ""), r["year"])
            if num(r.get("gdp_per_head_gbp")) is not None:
                put(code, "gdp_per_head", round(float(r["gdp_per_head_gbp"])), "ONS regional GDP per head at current market prices", r["year"])

    leaders = {r["code"]: r for r in read("national_leaders.csv")}
    pol = {r["code"]: r for r in read("council_politics.csv")}
    for code, p in places.items():
        lv = p["level"]
        if code in leaders:
            r = leaders[code]
            put(code, "ruler", f'{r["name"]} ({r["title"]})', r["note"] or "")
            put(code, "party", r["party"], r["note"] or "")
        elif lv == "region":
            r = leaders["K02000001"]
            put(code, "ruler", f'{r["name"]} ({r["title"]}, UK Government)', "English regions outside London have no elected regional government")
            put(code, "party", r["party"], "UK Government")
        elif lv == "council" and code in pol:
            r = pol[code]
            t, n, pa = split_leader(r["leader"])
            ctrl = r["control"] or ""
            if code == "E09000001" and not ctrl:
                ctrl = "Non-party (independent members)"
            if n:
                put(code, "ruler", " and ".join(f"{a} ({b})" for a, b in zip(n, t)), "Wikipedia council infobox, October 2026")
                partytxt = " / ".join(dict.fromkeys(x for x in pa if x)) or ctrl
                if ctrl and ctrl.lower().startswith("no overall control"):
                    partytxt += " · council in no overall control"
                put(code, "party", partytxt, "Wikipedia, October 2026")
            else:
                if code.startswith("N09"):
                    put(code, "ruler", "No single leader (committee system)", "Northern Ireland councils are run by committees")
                else:
                    put(code, "ruler", "Leader not recorded", "Wikipedia had no leader for this council")
                put(code, "party", ctrl or "—", "Council control, Wikipedia (Template:UK council control), October 2026")
        elif lv == "ward":
            c = p["parent"]
            ci = info.get(c, {})
            if "ruler" in ci:
                put(code, "ruler", ci["ruler"]["v"] + " — council", "The ward's council; ward councillors are not loaded yet")
                put(code, "party", ci["party"]["v"], "The ward's council")

    for code, p in places.items():
        put(code, "area", round(p.pop("area"), 2 if p["level"] == "ward" else 0) if "area" in p else None, "Computed from ONS boundaries")

    # ---------- write ----------
    os.makedirs(os.path.join(DATA, "wards"), exist_ok=True)
    for c, fs in ward_files.items():
        with open(os.path.join(DATA, "wards", c + ".js"), "w") as fh:
            fh.write("ATLAS_WARDS_LOADED(" + json.dumps(c) + "," + json.dumps({"type": "FeatureCollection", "features": fs}, separators=(",", ":")) + ");\n")
    for old in glob.glob(os.path.join(DATA, "wards", "*.js")):
        if os.path.basename(old)[:-3] not in ward_files:
            try:
                os.remove(old)
            except OSError:
                print("Could not remove old ward file (delete it by hand):", old)
    for k in ("councils", "regions", "nations"):
        for f in G[k]["features"]:
            p = places.get(f["properties"]["code"])
    with open(os.path.join(DATA, "uk-geo.js"), "w") as fh:
        fh.write("window.ATLAS_UK_GEO = " + json.dumps(G, separators=(",", ":")) + ";\n")
    srcs = []
    for c, d in info.items():
        for k, x in d.items():
            if x["src"] not in srcs:
                srcs.append(x["src"])
            d[k] = [x["v"], srcs.index(x["src"]), x["yr"]]
    with open(os.path.join(DATA, "uk-data.js"), "w") as fh:
        fh.write("window.ATLAS_UK = " + json.dumps({"places": places, "info": info, "sources": srcs}, separators=(",", ":")) + ";\n")

    lv = lambda l: sum(1 for p in places.values() if p["level"] == l)
    print(f"Built {lv('nation')} nations, {lv('region')} regions, {lv('council')} councils, {lv('ward')} wards.")
    for key in ("population", "average_age", "gdp", "ruler"):
        for l in ("council", "ward"):
            have = sum(1 for c, p in places.items() if p["level"] == l and key in info.get(c, {}))
            print(f"  {key:12} {l:8} {have}/{lv(l)}")


if __name__ == "__main__":
    main()
    import build_politics, build_series, build_protests, build_constituencies
    build_politics.main()
    build_series.main()
    build_protests.main()
    build_constituencies.main()
