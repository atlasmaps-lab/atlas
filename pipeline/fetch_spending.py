"""
Atlas 0.10: government spending, broken down -> data/spending.js
   python3 pipeline/fetch_spending.py [--offline]

Sources (OGL v3.0):
  HM Treasury, Public Expenditure Statistical Analyses (PESA) 2026:
    table 5.2: UK public sector spending by function and sub-function (UN COFOG), five years, £ million;
    table 4.1: total managed expenditure since 1985-86, nominal, real terms and % of GDP (with plans ahead).
  HM Treasury, Country and Regional Analysis (CRA) 2025 database: every identifiable spending line by department,
    function, sub-function, region or nation and tier (central, local, public corporations), 2020-21 onwards, £ thousand.
  MHCLG, Revenue outturn service expenditure summary (RSX) 2025-26: each English council's net current spending by
    service. In two-tier areas the county runs education and social care: Atlas gives each district a population share of
    its county's spending (marked as an estimate) on top of the district's own.
  ONS, district to county lookup (2024).
"""
import json, os, re, subprocess, sys, time, datetime
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
import manifest, xlsx_read as X
from build_trade import ods_tables

RAW = os.path.join(HERE, "sources", "raw", "spending"); os.makedirs(RAW, exist_ok=True)
UA = "Mozilla/5.0 (compatible; AtlasMaps/0.10; +https://github.com/atlasmaps-lab/atlas)"
PAGES = {"pesa": "/government/statistics/public-expenditure-statistical-analyses-{y}", "cra": "/government/statistics/country-and-regional-analysis-{y}",
         "ro": "/government/statistics/local-authority-revenue-expenditure-and-financing-england-{a}-to-{b}-individual-local-authority-data-outturn"}
LOOKUP = "https://services1.arcgis.com/ESMARspQHYMw9BZ9/arcgis/rest/services/LAD24_CTY24_EN_LU/FeatureServer/0/query?where=1%3D1&outFields=LAD24CD,CTY24CD,CTY24NM&f=json&resultRecordCount=2000"


def curl(url, out=None):
    for i in range(4):
        r = subprocess.run(["curl", "-sSL", "-m", "600", "-A", UA, url] + (["-o", out] if out else []), capture_output=True)
        if r.returncode == 0 and (out and os.path.getsize(out) > 1000 or (not out and r.stdout)): return True if out else r.stdout.decode("utf-8", "replace")
        time.sleep(5 * (i + 1))
    return None


def attachments(path):
    t = curl("https://www.gov.uk/api/content" + path)
    try: return [a.get("url", "") for a in json.loads(t)["details"]["attachments"]]
    except Exception: return []


def fetch():
    y = datetime.date.today().year
    got = {}
    for yy in (y, y - 1):
        u = [a for a in attachments(PAGES["pesa"].format(y=yy)) if re.search(r"Chapter_[45]_tables\.xlsx$", a)]
        if u: got["pesa"] = u; break
    for yy in (y, y - 1):
        u = [a for a in attachments(PAGES["cra"].format(y=yy)) if re.search(r"Database.*\.xlsx$", a)]
        if u: got["cra"] = u; break
    for a in (y, y - 1, y - 2):
        u = [x for x in attachments(PAGES["ro"].format(a=a - 1, b=a)) if "RSX_LA_Data" in x]
        if u: got["ro"] = u; break
    for k, us in got.items():
        for u in us:
            f = os.path.join(RAW, os.path.basename(u)); curl(u, f); print("got", os.path.basename(u))
    curl(LOOKUP, os.path.join(RAW, "lad_county.json"))
    manifest.record("raw/spending/", "HM Treasury; MHCLG; ONS", "PESA (chapters 4 and 5), Country and Regional Analysis database, revenue outturn service expenditure summary (RSX), district to county lookup",
                    "https://www.gov.uk/government/collections/public-expenditure-statistical-analyses-pesa", "OGL v3.0", "UK; regions and nations; English councils", "for data/spending.js")


def latest(pattern):
    fs = sorted(f for f in os.listdir(RAW) if re.search(pattern, f))
    return os.path.join(RAW, fs[-1]) if fs else None


def num(v):
    try: return float(str(v).replace(",", ""))
    except ValueError: return None


def pesa():
    out = {}
    f5 = latest(r"PESA_\d{4}.*Chapter_5_tables\.xlsx$")
    if f5:
        rs = list(X.rows(f5, "5_2")); hi = next(i for i, r in enumerate(rs) if any(re.match(r"^\d{4}-\d{2}$", str(c)) for c in r))
        yrs = {i: str(c) for i, c in enumerate(rs[hi]) if re.match(r"^\d{4}-\d{2}$", str(c))}
        fn, cur = {}, None
        for r in rs[hi + 2:]:
            lab = str(r[1]).strip() if len(r) > 1 else ""
            if not lab or lab == "None": continue
            vals = {y: num(r[i]) for i, y in yrs.items() if i < len(r) and num(r[i]) is not None}
            if lab.startswith("Total Managed Expenditure"): out["tme"] = vals; continue
            if lab.startswith("Public sector expenditure on services"): out["services"] = vals; continue
            if lab.startswith("Accounting adjustments"): out["adj"] = vals; continue
            m = re.match(r"^(\d+)\. (.+?)( \(\d+\))?$", lab)
            if m and not vals: cur = m.group(2); fn[cur] = {"sub": {}, "tot": {}}; continue
            if not vals and not re.match(r"^\d", lab) and not lab.startswith(("of which", "derived")): cur = None; continue   # e.g. "EU transactions": not a function
            if cur and lab.lower().startswith("total " + cur.lower()[:12]) and vals: fn[cur]["tot"] = vals; continue
            if cur and re.match(r"^\d+\.\d+ ", lab) and vals: fn[cur]["sub"][re.sub(r"\s*\(\d+\)$", "", lab)] = vals
        out["fn"] = {k: v for k, v in fn.items() if v["tot"]}; out["years"] = list(yrs.values())
    f4 = latest(r"PESA_\d{4}.*Chapter_4_tables\.xlsx$")
    if f4:
        rs = list(X.rows(f4, "4_1")); ser = {}
        for r in rs:
            if len(r) > 4 and re.match(r"^\d{4}-\d{2}$", str(r[1])):
                y = str(r[1]); ser[y] = [num(r[2]), num(r[3]), num(r[4])]
        out["long"] = ser   # year -> [nominal £bn, real £bn, % of GDP]
    print("PESA:", len(out.get("fn", {})), "functions;", len(out.get("long", {})), "years of totals")
    return out


REG = {"ENGLAND_NORTH EAST": "E12000001", "ENGLAND_NORTH WEST": "E12000002", "ENGLAND_YORKSHIRE AND THE HUMBER": "E12000003", "ENGLAND_YORKSHIRE AND THE HUMBER ": "E12000003",
       "ENGLAND_EAST MIDLANDS": "E12000004", "ENGLAND_WEST MIDLANDS": "E12000005", "ENGLAND_EAST": "E12000006", "ENGLAND_EAST OF ENGLAND": "E12000006", "ENGLAND_LONDON": "E12000007",
       "ENGLAND_SOUTH EAST": "E12000008", "ENGLAND_SOUTH WEST": "E12000009", "SCOTLAND": "S92000003", "WALES": "W92000004", "NORTHERN IRELAND": "N92000002"}


def cra():
    f = latest(r"CRA_\d{4}_Database.*\.xlsx$")
    if not f: return {}
    rows = iter(X.rows(f, [s for s in X.sheets(f) if "database" in s.lower()][0])); H = [str(h) for h in next(rows)]
    ci = {h: i for i, h in enumerate(H)}; yrs = [h for h in H if re.match(r"^\d{4}-\d{2}$", h)]
    fnk, subk, reg, idk, tier, dept = ci["COFOG Level 0"], ci["COFOG Level 1"], ci["ITL Region"], ci["ID/non-ID"], ci["CG, LG, PC, BOE, PSP"], ci["Department Name"]
    tot, fn, sub, tiers, depts, miss = {}, {}, {}, {}, {}, set()
    for r in rows:
        if len(r) <= max(fnk, reg) or str(r[idk]).strip() != "ID": continue
        code = REG.get(str(r[reg]).strip().upper())
        if not code: miss.add(str(r[reg])); continue
        f0 = re.sub(r"^\d+\.\s*", "", str(r[fnk]).strip()); s0 = re.sub(r"^[\d.]+\s*", "", str(r[subk]).strip())
        for y in yrs:
            v = num(r[ci[y]])
            if not v: continue
            v = v / 1000.0   # £ thousand -> £ million
            tot.setdefault(code, {}); tot[code][y] = tot[code].get(y, 0) + v
            d = fn.setdefault(code, {}).setdefault(y, {}); d[f0] = d.get(f0, 0) + v
            if y == yrs[-1]:
                d = sub.setdefault(code, {}); d[f0 + ": " + s0] = d.get(f0 + ": " + s0, 0) + v
                d = tiers.setdefault(code, {}); t = str(r[tier]).strip(); d[t] = d.get(t, 0) + v
                d = depts.setdefault(code, {}); k = str(r[dept]).strip(); d[k] = d.get(k, 0) + v
    rnd = lambda d: {k: round(v, 1) for k, v in d.items()}
    out = {"years": yrs, "tot": {c: rnd(v) for c, v in tot.items()}, "fn": {c: {y: rnd(x) for y, x in v.items()} for c, v in fn.items()},
           "sub": {c: rnd(v) for c, v in sub.items()}, "tier": {c: rnd(v) for c, v in tiers.items()}, "dept": {c: dict(sorted(rnd(v).items(), key=lambda x: -x[1])[:15]) for c, v in depts.items()}}
    print("CRA:", len(out["tot"]), "regions and nations,", yrs[0], "to", yrs[-1], "· unmatched:", sorted(miss)[:6])
    return out


def councils():
    f = latest(r"RSX_LA_Data_.*\.ods$")
    if not f: return {}
    T = ods_tables(f); rs = T[[k for k in T if k.startswith("RSX_LA_Data")][0]]
    hi = next(i for i, r in enumerate(rs) if r and r[0] == "E-code"); H = rs[hi]
    cols = [(i, h.split(" - ")[0].strip()) for i, h in enumerate(H) if h.endswith("Net Current Expenditure") or "- Net Current Expenditure" in h]
    cols = [(i, n) for i, n in cols if not n.lower().startswith("total")]
    out = {"year": re.search(r"(\d{4}-\d{2})", os.path.basename(f)).group(1), "services": [n for _, n in cols], "v": {}, "cls": {}}
    for r in rs[hi + 1:]:
        if len(r) < len(H) // 2 or not re.match(r"^E\d{8}$", r[1] or ""): continue
        vals = [round((num(r[i]) or 0) / 1000.0, 2) for i, _ in cols]   # £ thousand -> £ million
        if any(vals): out["v"][r[1]] = vals; out["cls"][r[1]] = r[4]
    p = os.path.join(RAW, "lad_county.json")
    try:
        F = json.load(open(p))["features"]
        out["county"] = {f["attributes"]["LAD24CD"]: f["attributes"]["CTY24CD"] for f in F}; out["cname"] = {f["attributes"]["CTY24CD"]: f["attributes"]["CTY24NM"] for f in F}
    except Exception: out["county"], out["cname"] = {}, {}
    print("Councils:", len(out["v"]), "with", len(out["services"]), "services;", len(out["county"]), "districts in counties")
    return out


def main():
    if "--offline" not in sys.argv: fetch()
    out = {"built": datetime.date.today().isoformat(), "uk": pesa(), "cra": cra(), "la": councils(),
           "sources": {"uk": "HM Treasury, Public Expenditure Statistical Analyses (tables 4.1 and 5.2)", "cra": "HM Treasury, Country and Regional Analysis (identifiable spending)", "la": "MHCLG, revenue outturn service expenditure summary (RSX), net current expenditure"}}
    with open(os.path.join(ROOT, "data", "spending.js"), "w", encoding="utf-8") as fh:
        fh.write("// Atlas 0.10: government spending. Built by pipeline/fetch_spending.py; do not edit.\nwindow.ATLAS_SPEND = ")
        json.dump(out, fh, separators=(",", ":"), ensure_ascii=False); fh.write(";\n")
    u = out["uk"]; y = u.get("years", [""])[-1]
    rep = os.path.join(HERE, "reports", "validation_spending.md")
    with open(rep, "w") as fh:
        fh.write(f"# Spending build ({out['built']})\n\n- PESA total managed expenditure {y}: £{(u.get('tme') or {}).get(y, 0) / 1000:,.1f}bn\n")
        fh.write("- Functions: " + ", ".join(f"{k} £{v['tot'].get(y, 0) / 1000:,.1f}bn" for k, v in u.get("fn", {}).items()) + "\n")
        c = out["cra"]; cy = (c.get("years") or [""])[-1]
        for code in ("E12000007", "E12000001", "S92000003", "N92000002"):
            fh.write(f"- CRA identifiable spending {cy}, {code}: £{c.get('tot', {}).get(code, {}).get(cy, 0) / 1000:,.1f}bn\n")
        fh.write(f"- Councils with spending: {len(out['la'].get('v', {}))}\n")
    print(open(rep).read())
    print("data/spending.js", os.path.getsize(os.path.join(ROOT, "data", "spending.js")) // 1024, "KB")


if __name__ == "__main__":
    main()
