"""
Atlas 0.9: Census 2021 profiles, every category, for councils and wards -> data/census.js (+ data/census_wards/<topic>.js)
   python3 pipeline/fetch_census_profiles.py [--offline]

ONS Census 2021 topic summaries (England and Wales) through the Nomis API (OGL v3.0). For each topic Atlas keeps the
detailed categories (not the subtotals), as counts, for councils (2022 boundaries) and wards (2022 boundaries).
Scotland (Scotland's Census 2022) and Northern Ireland (NISRA) publish separately and aren't joined here.
"""
import csv, io, json, os, re, subprocess, sys, time, datetime
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
import manifest

RAW = os.path.join(HERE, "sources", "raw", "census"); os.makedirs(RAW, exist_ok=True)
API = "https://www.nomisweb.co.uk/api/v01/dataset/"
# id, Nomis dataset, label, unit, short label
TOPICS = [
    ("ethnic", "NM_2041_1", "Ethnic group", "people"), ("religion", "NM_2049_1", "Religion", "people"), ("language", "NM_2043_1", "Main language", "people"),
    ("english", "NM_2048_1", "Proficiency in English", "people"), ("birth", "NM_2024_1", "Country of birth", "people"),
    ("nssec", "NM_2079_1", "Social class (NS-SeC)", "people"), ("occupation", "NM_2080_1", "Occupation", "people"), ("activity", "NM_2083_1", "Economic activity", "people"),
    ("quals", "NM_2084_1", "Highest qualification", "people"), ("tenure", "NM_2072_1", "Housing tenure", "households"), ("households", "NM_2023_1", "Household composition", "households"),
    ("age", "NM_2020_1", "Age (five-year bands)", "people"),
]


def curl(url, out=None):
    for i in range(5):
        r = subprocess.run(["curl", "-sSL", "-m", "300", url] + (["-o", out] if out else []), capture_output=True)
        if r.returncode == 0 and ((out and os.path.getsize(out) > 100) or (not out and r.stdout)): return True if out else r.stdout.decode("utf-8", "replace")
        time.sleep(5 * (i + 1))
    return None


def dim_of(ds):
    t = json.loads(curl(API + ds + ".def.sdmx.json"))
    dims = [d["conceptref"].lower() for d in t["structure"]["keyfamilies"]["keyfamily"][0]["components"]["dimension"]]
    return [d for d in dims if d not in ("geography", "time", "freq", "measures", "date")][0]


def codes(ds, dim):
    t = json.loads(curl(API + f"{ds}/{dim}.def.sdmx.json"))
    return [(int(c["value"]), c["description"]["value"]) for c in t["structure"]["codelists"]["codelist"][0]["code"]]


def fetch(tid, ds):
    p = os.path.join(RAW, tid + ".json")
    if os.path.exists(p) or "--offline" in sys.argv: return json.load(open(p)) if os.path.exists(p) else None
    dim = dim_of(ds); cs = codes(ds, dim)
    detailed = [c for c in cs if c[0] != 0 and not re.match(r"^Total", c[1], re.I)]
    # subtotals: Nomis gives them codes of 1000 and over, or names that end in "total"; keep the finest level
    if any(c[0] >= 1000 for c in detailed) and any(c[0] < 1000 for c in detailed): detailed = [c for c in detailed if c[0] < 1000]
    detailed = [c for c in detailed if not re.search(r"\btotal\b|does not apply", c[1], re.I)]
    keep = ",".join(str(c[0]) for c in detailed)
    out = {"dim": dim, "cats": [[c[0], c[1]] for c in detailed], "v": {}}
    for geo in ("TYPE154", "TYPE153", "TYPE480,TYPE499,K04000001"):
        off = 0
        while True:
            t = curl(API + f"{ds}.data.csv?date=latest&geography={geo}&{dim}={keep}&measures=20100&select=geography_code,{dim},obs_value&RecordOffset={off}&RecordLimit=25000")
            rows = list(csv.reader(io.StringIO(t or "")))[1:]
            for g, c, v in rows:
                try: out["v"].setdefault(g, {})[int(c)] = int(float(v))
                except ValueError: pass
            if len(rows) < 25000: break
            off += 25000; time.sleep(0.5)
        time.sleep(0.5)
    json.dump(out, open(p, "w"))
    manifest.record(f"raw/census/{tid}.json", "Office for National Statistics (Nomis)", f"Census 2021 {ds}: {tid}", API + ds, "OGL v3.0", "England and Wales: councils, wards, regions", "for data/census.js")
    return out


def short(n):
    n = re.sub(r"\s+", " ", n).strip()
    n = re.sub(r"^(Asian, Asian British or Asian Welsh|Black, Black British, Black Welsh, Caribbean or African|Mixed or Multiple ethnic groups|White|Other ethnic group): ", lambda m: {"Asian, Asian British or Asian Welsh": "Asian: ", "Black, Black British, Black Welsh, Caribbean or African": "Black: ", "Mixed or Multiple ethnic groups": "Mixed: ", "White": "White: ", "Other ethnic group": "Other: "}[m.group(1)], n)
    return n[:90]


def main():
    out = {"built": datetime.date.today().isoformat(), "year": 2021, "topics": {}, "source": "ONS Census 2021 (England and Wales), topic summaries via Nomis. OGL v3.0"}
    os.makedirs(os.path.join(ROOT, "data", "census_wards"), exist_ok=True)
    for tid, ds, label, unit in TOPICS:
        d = fetch(tid, ds)
        if not d: print("missing", tid); continue
        cats = [c[0] for c in d["cats"]]; names = [short(c[1]) for c in d["cats"]]
        vec = lambda g: [d["v"][g].get(c, 0) for c in cats]
        council = {g: vec(g) for g in d["v"] if re.match(r"^[EW]0[6-9]", g)}
        wards = {g: vec(g) for g in d["v"] if g.startswith(("E05", "W05"))}
        areas = {g: vec(g) for g in d["v"] if g.startswith(("E12", "E92", "W92", "K04"))}
        out["topics"][tid] = {"label": label, "unit": unit, "ds": ds, "cats": names, "v": council, "a": areas, "wards": len(wards)}
        with open(os.path.join(ROOT, "data", "census_wards", tid + ".js"), "w", encoding="utf-8") as fh:
            fh.write(f"// Atlas 0.9: Census 2021 {label} by ward (2022 wards). Built by pipeline/fetch_census_profiles.py.\n(window.ATLAS_CENSUS_W = window.ATLAS_CENSUS_W || {{}})[{json.dumps(tid)}] = ")
            json.dump(wards, fh, separators=(",", ":")); fh.write(";\n")
        print(tid, len(cats), "categories,", len(council), "councils,", len(wards), "wards")
    with open(os.path.join(ROOT, "data", "census.js"), "w", encoding="utf-8") as fh:
        fh.write("// Atlas 0.9: Census 2021 profiles by council. Built by pipeline/fetch_census_profiles.py; do not edit.\nwindow.ATLAS_CENSUS = ")
        json.dump(out, fh, separators=(",", ":"), ensure_ascii=False); fh.write(";\n")
    print("data/census.js", os.path.getsize(os.path.join(ROOT, "data", "census.js")) // 1024, "KB")


if __name__ == "__main__":
    main()
