"""
Atlas 0.9: services trade, foreign direct investment and income flows -> data/investment.js
   python3 pipeline/fetch_investment.py [--offline]      (after build_trade.py: country codes come from data/trade.js)

Sources (OGL v3.0):
  ONS, Foreign direct investment involving UK companies (directional): inward and outward tables, 2015 to 2024.
    Positions (the stock), flows, and earnings by country and industry; earnings split into dividends paid home and
    profits left in the business (reinvested earnings). This is the "profits repatriated" picture.
  ONS, The Pink Book 2026: chapter 4 (primary income: credits and debits by type), chapter 5 (secondary income,
    including personal transfers), chapter 9 (current account by country: goods, services, primary and secondary income).
  ONS, UK trade in services: service type by partner country (non-seasonally adjusted), 2025.
  DBT, Inward investment results 2025 to 2026: projects and jobs by region, source country and sector.
"""
import json, os, re, subprocess, sys, time, datetime
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
import manifest, xlsx_read as X
from build_trade import ods_tables

RAW = os.path.join(HERE, "sources", "raw", "investment"); os.makedirs(RAW, exist_ok=True)
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36"
ONS = "https://www.ons.gov.uk"
PAGES = {   # dataset page -> local file (the newest edition's first download link)
    "/businessindustryandtrade/business/businessinnovation/datasets/foreigndirectinvestmentinvolvingukcompanies2013inwardtables": "publicationtablesinward.xlsx",
    "/businessindustryandtrade/business/businessinnovation/datasets/foreigndirectinvestmentinvolvingukcompaniesoutwardtables": "publicationtablesoutward.xlsx",
    "/economy/nationalaccounts/balanceofpayments/datasets/4primaryincomethepinkbook2016": "chapter4.xlsx",
    "/economy/nationalaccounts/balanceofpayments/datasets/5secondaryincomethepinkbook2016": "chapter5.xlsx",
    "/economy/nationalaccounts/balanceofpayments/datasets/9geographicalbreakdownofthecurrentaccountthepinkbook2016": "chapter9.xlsx",
    "/businessindustryandtrade/internationaltrade/datasets/uktradeinservicesservicetypebypartnercountrynonseasonallyadjusted": "services.xlsx",
}
DBT = "https://www.gov.uk/government/collections/inward-investment-results"


def curl(url, out=None):
    for i in range(5):
        r = subprocess.run(["curl", "-sSL", "-m", "300", "-A", UA, url] + (["-o", out] if out else []), capture_output=True)
        if r.returncode == 0 and (out and os.path.getsize(out) > 2000 or (not out and len(r.stdout) > 2000)): return r.stdout.decode("utf-8", "replace") if not out else True
        time.sleep(10 * (i + 1))   # ONS rate-limits ("error code 1015"): back off
    return None


def fetch():
    for page, fn in PAGES.items():
        html = curl(ONS + page); time.sleep(4)
        m = re.search(r'href="(/file\?uri=[^"]+\.xlsx)"', html or "")
        if m and curl(ONS + m.group(1), os.path.join(RAW, fn)): print("got", fn)
        else: print("kept the old copy of", fn)
        time.sleep(4)
    html = curl(DBT) or ""
    pubs = re.findall(r'href="(/government/statistics/dbt-inward-investment-results-(\d{4})-to-(\d{4}))"', html)
    if pubs:
        page = curl("https://www.gov.uk" + sorted(pubs, key=lambda x: x[1])[-1][0]) or ""
        m = re.search(r'(https://assets\.publishing\.service\.gov\.uk/[^"]+tables[^"]*\.ods)', page)
        if m: curl(m.group(1), os.path.join(RAW, "dbt.ods"))
    for fn, title, url in [("publicationtablesinward.xlsx", "Foreign direct investment involving UK companies (directional): inward", ONS + list(PAGES)[0]),
                           ("publicationtablesoutward.xlsx", "Foreign direct investment involving UK companies (directional): outward", ONS + list(PAGES)[1]),
                           ("chapter4.xlsx", "The Pink Book: primary income", ONS + list(PAGES)[2]), ("chapter5.xlsx", "The Pink Book: secondary income", ONS + list(PAGES)[3]),
                           ("chapter9.xlsx", "The Pink Book: geographical breakdown of the current account", ONS + list(PAGES)[4]),
                           ("services.xlsx", "UK trade in services: service type by partner country", ONS + list(PAGES)[5])]:
        manifest.record("raw/investment/" + fn, "Office for National Statistics", title, url, "OGL v3.0", "UK", "for data/investment.js (pipeline/fetch_investment.py)")
    manifest.record("raw/investment/dbt.ods", "Department for Business and Trade", "DBT inward investment results: tables", DBT, "OGL v3.0", "UK regions, source markets, sectors", "for data/investment.js")


def num(v):
    if v is None: return None
    s = str(v).strip().replace(",", "")
    try: return float(s)
    except ValueError: return None   # "c" (confidential), "low", "x", "[c]"


def nm(t): return re.sub(r"[^a-z]+", " ", str(t).lower().replace("&", "and")).strip()


def iso_map():
    s = open(os.path.join(ROOT, "data", "trade.js"), encoding="utf-8").read(); T = json.loads(s[s.index("{"):s.rindex("}") + 1])
    m = {nm(c["n"]): k for k, c in T["cty"].items()}
    m.update({nm(a): b for a, b in {"United States of America": "US", "United States (including Puerto Rico)": "US", "USA": "US", "United States": "US", "Hong Kong": "HK", "South Korea": "KR", "Korea, Republic of": "KR", "Republic of Korea": "KR",
              "Russia": "RU", "Russian Federation": "RU", "Czechia": "CZ", "Czech Republic": "CZ", "Irish Republic": "IE", "Ireland": "IE", "Taiwan": "TW", "Turkey": "TR", "Türkiye": "TR",
              "UAE": "AE", "United Arab Emirates": "AE", "Netherlands": "NL", "Vietnam": "VN", "Viet Nam": "VN", "Iran": "IR", "Bahamas": "BS", "Cayman Islands": "KY", "British Virgin Islands": "VG",
              "Guernsey": "GG", "Jersey": "JE", "Isle of Man": "IM", "Bermuda": "BM", "Luxembourg": "LU", "Switzerland": "CH", "Japan": "JP", "China": "CN", "India": "IN", "Canada": "CA", "Australia": "AU",
              "New Zealand": "NZ", "Saudi Arabia": "SA", "Qatar": "QA", "Kuwait": "KW", "Singapore": "SG", "Brazil": "BR", "Mexico": "MX", "South Africa": "ZA", "Norway": "NO", "Sweden": "SE"}.items()})
    return m


def fdi(direction, M):
    f = os.path.join(RAW, "publicationtables%s.xlsx" % direction)
    if not os.path.exists(f): return None
    out = {"tot": {}, "cty": {}, "ind": {}, "area": {}}
    # 1.1/1.2/1.3: totals by component, 2015-2024
    for sh, key in (("1.1", "flow"), ("1.2", "pos"), ("1.3", "earn")):
        rs = list(X.rows(f, sh)); hi = next(i for i, r in enumerate(rs) if r and str(r[0]).startswith("Measure"))
        yrs = [int(re.match(r"(\d{4})", str(c)).group(1)) if re.match(r"(\d{4})", str(c)) else None for c in rs[hi]]
        for r in rs[hi + 1:]:
            if not r or not r[0] or r[0] == "None": continue
            out["tot"].setdefault(key, {})[str(r[0]).strip()] = {str(y): num(v) for y, v in zip(yrs, r) if y and num(v) is not None}
    # 2.1/3.1/4.1: by country, 2015-2024
    for sh, key in (("2.1", "flow"), ("3.1", "pos"), ("4.1", "earn")):
        rs = list(X.rows(f, sh)); hi = next(i for i, r in enumerate(rs) if r and str(r[0]).startswith("Continent"))
        yrs = [int(re.match(r"(\d{4})", str(c)).group(1)) if re.match(r"(\d{4})", str(c)) else None for c in rs[hi]]
        for r in rs[hi + 1:]:
            if len(r) < 4 or not r[2] or r[2] == "None": continue
            vals = {str(y): num(v) for y, v in zip(yrs, r) if y and num(v) is not None}
            if r[2] == "All": out["area"].setdefault(str(r[1]), {})[key] = vals; continue
            k = M.get(nm(r[2])) or r[2]; o = out["cty"].setdefault(k, {"n": r[2], "ar": r[1]}); o[key] = vals
    # 2.2/4.2: components by country (profits, dividends, reinvested), 2021-2024
    for sh in ("2.2",):
        rs = list(X.rows(f, sh)); hi = next(i for i, r in enumerate(rs) if r and str(r[0]).startswith("Continent"))
        H = [str(h) for h in rs[hi]]
        ci = lambda pat: next((i for i, h in enumerate(H) if re.search(pat, h, re.I)), None)
        ip, idv, iri = ci(r"share of (?:profits|foreign subsid|UK subsid)"), ci(r"dividends"), ci(r"unremitted")
        for r in rs[hi + 1:]:
            if len(r) < 5 or not r[2] or r[2] == "None" or r[2] == "All": continue
            k = M.get(nm(r[2])) or r[2]; o = out["cty"].setdefault(k, {"n": r[2], "ar": r[1]}); y = str(int(float(r[3])))
            for nmk, i in (("prof", ip), ("div", idv), ("reinv", iri)):
                v = num(r[i]) if i is not None and i < len(r) else None
                if v is not None: o.setdefault(nmk, {})[y] = v
    # 3.3: positions by industry (all countries), latest year
    rs = list(X.rows(f, "3.3")); hi = next(i for i, r in enumerate(rs) if r and str(r[0]).startswith("Continent"))
    H = [re.sub(r"\s*\(£ million\)", "", str(h)).strip() for h in rs[hi]]
    for r in rs[hi + 1:]:   # the "World, Total" row of each year
        if len(r) > 4 and str(r[0]) == "World" and str(r[1]) == "Total" and num(r[3]):
            out["ind"][str(int(float(r[3])))] = {H[i]: num(v) for i, v in enumerate(r) if 3 < i < len(H) and H[i] not in ("None", "") and num(v) is not None}
    return out


def pinkbook():
    out = {}
    f = os.path.join(RAW, "chapter4.xlsx")
    if os.path.exists(f):
        rs = list(X.rows(f, "4.1")); blocks = [i for i, r in enumerate(rs) if r and str(r[0]).startswith("Table 4.1.")]
        for b, key in zip(blocks, ("cr", "db", "bal")):
            H = [re.sub(r"\s+", " ", str(h)).strip() for h in rs[b + 1]]; d = {}
            for r in rs[b + 3:]:
                if not r or not re.match(r"^\d{4}", str(r[0])): break
                d[str(r[0])[:4]] = {H[i]: num(v) for i, v in enumerate(r) if i and i < len(H) and num(v) is not None}
            out.setdefault("primary", {})[key] = d
    f = os.path.join(RAW, "chapter5.xlsx")
    if os.path.exists(f):
        rs = list(X.rows(f, "5.1")); blocks = [i for i, r in enumerate(rs) if r and str(r[0]).startswith("Table 5.1.")]
        for b, key in zip(blocks, ("cr", "db", "bal")):
            H = [re.sub(r"\s+", " ", str(h)).strip() for h in rs[b + 1]]; d = {}
            for r in rs[b + 3:]:
                if not r or not re.match(r"^\d{4}", str(r[0])): break
                d[str(r[0])[:4]] = {H[i]: num(v) for i, v in enumerate(r) if i and i < len(H) and num(v) is not None}
            out.setdefault("secondary", {})[key] = d
    return out


def current_account(M):
    f = os.path.join(RAW, "chapter9.xlsx")
    if not os.path.exists(f): return {}
    rs = list(X.rows(f, "9.1")); out = {}; blocks = [i for i, r in enumerate(rs) if r and str(r[0]).startswith("Table 9.1.")]
    title = str(rs[0][0]); yr = re.findall(r"(\d{4})", title); yr = yr[-1] if yr else ""
    for b, key in zip(blocks, ("cr", "db", "bal")):
        H = [str(h) for h in rs[b + 1]]
        for r in rs[b + 2:]:
            if not r or not r[0] or str(r[0]).startswith("Table"): break
            name = str(r[0]).split(", ")[-1] if ", " in str(r[0]) else str(r[0])
            k = M.get(nm(name)) or name
            out.setdefault(k, {"n": name})[key] = {H[i]: num(v) for i, v in enumerate(r) if i and i < len(H) and num(v) is not None}
    return {"year": yr, "cty": out}


def services(M):
    f = os.path.join(RAW, "services.xlsx")
    if not os.path.exists(f): return {}
    sh = [s for s in X.sheets(f) if re.match(r"Sheet \d+\. \d{4}$", s)]
    if not sh: return {}
    rs = list(X.rows(f, sh[0])); year = sh[0][-4:]; out = {"year": year, "cty": {}, "types": []}
    starts = [i for i, r in enumerate(rs) if r and str(r[0]) == "Country Code"]
    for b, key in zip(starts, ("exp", "imp")):
        H = [str(h) for h in rs[b]]
        if not out["types"]: out["types"] = [h for h in H[2:] if re.match(r"^\d+: ", h)]
        for r in rs[b + 1:]:
            if not r or not r[0] or str(r[0]) == "None" or str(r[0]).startswith("Table"): break
            c = str(r[0]).strip(); o = out["cty"].setdefault(c, {"n": str(r[1]).strip()})
            o[key] = {H[i].split(": ")[0]: num(v) for i, v in enumerate(r) if i > 1 and i < len(H) and re.match(r"^\d+: ", H[i]) and num(v) is not None and "." not in H[i].split(": ")[0]}
    out["names"] = {h.split(": ")[0]: h.split(": ", 1)[1] for h in out["types"] if "." not in h.split(": ")[0]}
    del out["types"]
    return out


def dbt():
    f = os.path.join(RAW, "dbt.ods")
    if not os.path.exists(f): f = os.path.join(RAW, "dbt2526.ods")
    if not os.path.exists(f): return {}
    T = ods_tables(f); out = {"region": {}, "market": {}, "sector": {}, "series": {}}
    s = open(os.path.join(ROOT, "data", "uk-data.js"), encoding="utf-8").read(); PL = json.loads(s[s.index("{"):s.rindex("}") + 1])["places"]
    rc = {nm(v["name"]): k for k, v in PL.items() if v["level"] in ("region", "nation")}; rc["east of england"] = rc.get("east of england", "E12000006")
    def table(name, key, keyf):
        rows = T.get(name, []); H = rows[1] if len(rows) > 1 else []
        for r in rows[2:]:
            if not r or not r[0] or r[0].startswith(("Source", "Back", "Total", "Note")): continue
            k = keyf(r[0]); o = {}
            for i, h in enumerate(H):
                m = re.match(r"(FDI Projects|New Jobs|Safe Jobs) (\d{4}-\d{2})", h or "")
                if m and i < len(r) and num(r[i]) is not None: o.setdefault({"FDI Projects": "proj", "New Jobs": "jobs", "Safe Jobs": "safe"}[m.group(1)], {})[m.group(2)] = num(r[i])
            if o: out[key][k] = o
    table("4_1", "region", lambda n: rc.get(nm(n), n)); table("2_1", "market", lambda n: n); table("3_1", "sector", lambda n: n)
    rows = T.get("6_1", [])
    if len(rows) > 3: out["series"] = {"years": rows[1][1:], "proj": [num(x) for x in rows[2][1:]], "jobs": [num(x) for x in rows[3][1:]]}
    return out


def main():
    if "--offline" not in sys.argv: fetch()
    M = iso_map()
    out = {"built": datetime.date.today().isoformat(), "fdi": {"in": fdi("inward", M), "out": fdi("outward", M)}, "pb": pinkbook(), "ca": current_account(M), "svc": services(M), "dbt": dbt(),
           "sources": "ONS: Foreign direct investment involving UK companies (directional), The Pink Book 2026 (chapters 4, 5, 9), UK trade in services by partner country; DBT inward investment results. OGL v3.0"}
    with open(os.path.join(ROOT, "data", "investment.js"), "w", encoding="utf-8") as fh:
        fh.write("// Atlas 0.9: services, FDI and income flows. Built by pipeline/fetch_investment.py; do not edit.\nwindow.ATLAS_INVEST = ")
        json.dump(out, fh, separators=(",", ":"), ensure_ascii=False); fh.write(";\n")
    fi, fo = out["fdi"]["in"] or {}, out["fdi"]["out"] or {}
    rep = os.path.join(HERE, "reports", "validation_investment.md")
    with open(rep, "w") as fh:
        pos = lambda d: (d.get("tot", {}).get("pos", {}) or {})
        fh.write(f"# Investment build ({out['built']})\n\n- Inward FDI countries: {len(fi.get('cty', {}))}; outward: {len(fo.get('cty', {}))}\n")
        for d, name in ((fi, "inward"), (fo, "outward")):
            for k, v in pos(d).items():
                if v: fh.write(f"- {name} position, {k}: 2024 £{(v.get('2024') or 0) / 1e3:,.1f}bn\n")
        fh.write(f"- Unmatched FDI countries: {', '.join(sorted(k for d in (fi, fo) for k in d.get('cty', {}) if len(k) > 2))}\n")
        fh.write(f"- Services partners {len(out['svc'].get('cty', {}))} ({out['svc'].get('year')}); current account partners {len(out['ca'].get('cty', {}))} ({out['ca'].get('year')})\n")
        fh.write(f"- DBT regions {len(out['dbt'].get('region', {}))}, markets {len(out['dbt'].get('market', {}))}\n")
    print(open(rep).read())


if __name__ == "__main__":
    main()
