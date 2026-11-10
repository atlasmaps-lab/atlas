"""
Atlas 0.9: what each place's economy is made of -> data/industry.js
   python3 pipeline/fetch_industry.py [--offline]

  ONS, Regional gross value added (balanced) by industry: local authorities by ITL1 region (OGL v3.0). Table 2, current
    prices (£ million), 1998 onwards, about 45 industries per council. Atlas keeps the industries that don't overlap
    (the detailed ones) for the latest year and the year ten years before.
  ONS, Business Register and Employment Survey (Nomis NM_189_1, open access, OGL): employment by 2-digit SIC 2007
    division (88 industries) for councils in Great Britain, the latest year.
  ONS, Census 2021 ODWP01EW, place of usual residence by place of work, councils (England and Wales, Nomis bulk, OGL):
    where each council's working residents work, and where its workers live.
"""
import csv, io, json, os, re, subprocess, sys, time, zipfile, datetime
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
import manifest, xlsx_read as X

RAW = os.path.join(HERE, "sources", "raw", "industry"); os.makedirs(RAW, exist_ok=True)
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36"
GVA_PAGE = "https://www.ons.gov.uk/economy/grossdomesticproductgdp/datasets/regionalgrossvalueaddedbalancedbyindustrylocalauthoritiesbyitl1region"
NOMIS = "https://www.nomisweb.co.uk/api/v01/dataset/NM_189_1.data.csv?geography=TYPE424&industry={ind}&employment_status=4&measure=1&measures=20100&date=latest&select=date_name,geography_code,industry_name,obs_value"
OD = "https://www.nomisweb.co.uk/output/census/2021/odwp01ew.zip"


def curl(url, out=None):
    for i in range(5):
        r = subprocess.run(["curl", "-sSL", "-m", "600", "-A", UA, url] + (["-o", out] if out else []), capture_output=True)
        if r.returncode == 0 and ((out and os.path.getsize(out) > 1000) or (not out and r.stdout)): return True if out else r.stdout.decode("utf-8", "replace")
        time.sleep(8 * (i + 1))
    return None


def fetch():
    html = curl(GVA_PAGE) or ""
    for u in sorted(set(re.findall(r'href="(/file\?uri=[^"]*regionalgrossvalueaddedbalancedbyindustrylocalauthorities[^"]*\.xlsx)"', html))):
        curl("https://www.ons.gov.uk" + u, os.path.join(RAW, os.path.basename(u))); time.sleep(4)
    manifest.record("raw/industry/", "Office for National Statistics", "Regional gross value added (balanced) by industry: local authorities by ITL1 region", GVA_PAGE, "OGL v3.0", "UK councils, 1998 onwards", "for data/industry.js")
    if not os.path.exists(os.path.join(RAW, "odwp01ew.zip")): curl(OD, os.path.join(RAW, "odwp01ew.zip"))
    manifest.record("raw/industry/odwp01ew.zip", "Office for National Statistics (Nomis)", "Census 2021 ODWP01EW: place of usual residence by place of work", OD, "OGL v3.0", "England and Wales councils", "for data/industry.js")


def gva():
    files = [f for f in sorted(os.listdir(RAW)) if f.startswith("regionalgrossvalueaddedbalancedbyindustrylocalauthorities") and f.endswith(".xlsx")]
    by, names, years = {}, {}, None
    for f in files:
        rs = list(X.rows(os.path.join(RAW, f), "Table 2"))
        hi = next(i for i, r in enumerate(rs) if r and str(r[0]).startswith("ITL1"))
        H = [str(h).split(".")[0] for h in rs[hi]]; years = [h for h in H if re.match(r"^\d{4}$", h)]
        for r in rs[hi + 1:]:
            if len(r) < 6 or not re.match(r"^[EWSN]\d{8}$", str(r[1])): continue
            code, sic, desc = r[1], re.sub(r"\.0$", "", str(r[3]).strip()), str(r[4]).strip()
            vals = {H[i]: float(v) for i, v in enumerate(r) if i < len(H) and re.match(r"^\d{4}$", H[i]) and re.match(r"^-?[\d.]+$", str(v))}
            by.setdefault(code, {})[sic] = vals; names[sic] = desc
    # the detailed industries: rows that have no smaller rows inside their SIC range (sections with no detail stay)
    def rng(c):
        m = re.search(r"\((\d+)(?:-(\d+))?\)", c) or re.match(r"^(\d+)(?:-(\d+))?", c)
        return (int(m.group(1)), int(m.group(2) or m.group(1))) if m else None
    codes = [c for c in names if c not in ("Total", "A-E", "G-T") and rng(c)]
    numeric = lambda c: bool(re.match(r"^\d", c))
    def is_parent(x):
        a = rng(x)
        return any(y != x and rng(y)[0] >= a[0] and rng(y)[1] <= a[1] and (numeric(y) and not numeric(x) or (rng(y)[1] - rng(y)[0]) < (a[1] - a[0])) for y in codes)
    leaf = [c for c in codes if not is_parent(c)]
    names["68"] = "Real estate (excluding owner-occupiers' imputed rent)"
    y1 = years[-1]; y0 = str(int(y1) - 10)
    out = {"year": y1, "y0": y0, "names": {c: names[c] for c in leaf}, "v": {}, "v0": {}, "tot": {}}
    for code, d in by.items():
        out["v"][code] = {c: round(d[c][y1], 1) for c in leaf if c in d and y1 in d[c] and d[c][y1] > 0}
        out["v0"][code] = {c: round(d[c][y0], 1) for c in leaf if c in d and y0 in d[c] and d[c][y0] > 0}
        if "Total" in d: out["tot"][code] = {y: round(v, 1) for y, v in d["Total"].items()}
    print("GVA:", len(out["v"]), "councils,", len(leaf), "industries,", y0, "and", y1)
    return out


def bres():
    p = os.path.join(RAW, "bres.csv")
    if not os.path.exists(p) and "--offline" not in sys.argv:
        t = curl("https://www.nomisweb.co.uk/api/v01/dataset/NM_189_1/industry.def.sdmx.json")
        codes = [c["value"] for c in json.loads(t)["structure"]["codelists"]["codelist"][0]["code"] if re.match(r"^\d\d :", c["description"]["value"])]
        rows = []
        for i in range(0, len(codes), 20):
            t = curl(NOMIS.format(ind=",".join(map(str, codes[i:i + 20]))))
            rows += list(csv.reader(io.StringIO(t)))[1 if rows else 0:] if t else []
            time.sleep(1)
        with open(p, "w", newline="") as fh: csv.writer(fh).writerows(rows)
        manifest.record("raw/industry/bres.csv", "Office for National Statistics (Nomis)", "Business Register and Employment Survey: employment by 2-digit SIC, councils", "https://www.nomisweb.co.uk/datasets/newbrespub", "OGL v3.0 (open access, rounded)", "Great Britain councils, latest year", "for data/industry.js")
    rs = list(csv.reader(open(p)))[1:]; out = {"v": {}, "names": {}, "year": rs[0][0] if rs else ""}
    for yr, code, ind, v in rs:
        k = ind[:2]; out["names"][k] = ind[5:].strip()
        try: n = int(float(v))
        except ValueError: continue
        if n > 0: out["v"].setdefault(code, {})[k] = n
    print("BRES:", len(out["v"]), "councils,", len(out["names"]), "industries,", out["year"])
    return out


def commuting():
    z = os.path.join(RAW, "odwp01ew.zip")
    if not os.path.exists(z): return {}
    rd = csv.reader(io.TextIOWrapper(zipfile.ZipFile(z).open("ODWP01EW_LTLA.csv"), encoding="utf-8-sig")); H = next(rd)
    flows, home, other = {}, {}, {}
    for r in rd:
        o, w, cat, n = r[0], r[2], r[5], int(r[6])
        if w == "-8":
            if "home" in cat.lower(): home[o] = home.get(o, 0) + n
            continue
        if not re.match(r"^[EWSN]\d{8}$", w): other[o] = other.get(o, 0) + n; continue
        flows[(o, w)] = n
    out = {"out": {}, "in": {}, "within": {}, "home": home, "year": 2021}
    outs, ins = {}, {}
    for (o, w), n in flows.items():
        if o == w: out["within"][o] = n; continue
        outs.setdefault(o, []).append([w, n]); ins.setdefault(w, []).append([o, n])
    for k, L in outs.items(): L.sort(key=lambda x: -x[1]); out["out"][k] = {"n": sum(x[1] for x in L), "top": L[:12]}
    for k, L in ins.items(): L.sort(key=lambda x: -x[1]); out["in"][k] = {"n": sum(x[1] for x in L), "top": L[:12]}
    print("Commuting:", len(out["out"]), "councils")
    return out


def main():
    if "--offline" not in sys.argv: fetch()
    out = {"built": datetime.date.today().isoformat(), "gva": gva(), "jobs": bres(), "commute": commuting(),
           "sources": {"gva": "ONS regional gross value added (balanced) by industry, local authorities, current prices", "jobs": "ONS Business Register and Employment Survey (Nomis, open access; rounded)", "commute": "ONS Census 2021, ODWP01EW (England and Wales)"}}
    with open(os.path.join(ROOT, "data", "industry.js"), "w", encoding="utf-8") as fh:
        fh.write("// Atlas 0.9: industries and commuting by council. Built by pipeline/fetch_industry.py; do not edit.\nwindow.ATLAS_INDUSTRY = ")
        json.dump(out, fh, separators=(",", ":"), ensure_ascii=False); fh.write(";\n")
    print("data/industry.js", os.path.getsize(os.path.join(ROOT, "data", "industry.js")) // 1024, "KB")


if __name__ == "__main__":
    main()
