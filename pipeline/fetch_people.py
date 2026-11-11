"""
Atlas 0.10: migration, social housing and people's finances -> data/people.js
   python3 pipeline/fetch_people.py [--offline]

Migration
  ONS, Long-term international migration, provisional (year ending December 2025): immigration, emigration and net
    migration by nationality group, and by reason (work, study, family, humanitarian, asylum, other), since 2012.
  ONS, Mid-year population estimates, components of change (MYEB3), 2012-2025: for every council, births, deaths,
    moves to and from the rest of the UK (internal) and from and to abroad (international).
  Home Office, Immigration system statistics: people on asylum support by council and type of accommodation (Asy_D11),
    and people resettled by council and scheme (Res_D01).
Social housing
  MHCLG live table 100 (homes by tenure, councils, latest year), table 116 (council-owned homes since 1979) and table
    600 (households on council housing registers since 1987).
People's finances (open data; Stat-Xplore figures are added by fetch_benefits_statxplore.py when a key is set)
  DWP/ONS claimant count (Nomis), monthly, councils, five years.
  DWP, Children in low income families: local area statistics (after housing costs), councils and wards.
  DWP, Discretionary Housing Payments, by council.
All OGL v3.0.
"""
import csv, io, json, os, re, subprocess, sys, time, datetime
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
import manifest, xlsx_read as X
from build_trade import ods_tables

RAW = os.path.join(HERE, "sources", "raw", "people"); os.makedirs(RAW, exist_ok=True)
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36"
ONS = {"ltim": "/peoplepopulationandcommunity/populationandmigration/internationalmigration/datasets/longterminternationalimmigrationemigrationandnetmigrationflowsprovisional",
       "myeb": "/peoplepopulationandcommunity/populationandmigration/populationestimates/datasets/populationestimatesforukenglandandwalesscotlandandnorthernireland"}
GOV = {"asylum": "/government/statistical-data-sets/immigration-system-statistics-data-tables", "stock": "/government/statistical-data-sets/live-tables-on-dwelling-stock-including-vacants",
       "lettings": "/government/statistical-data-sets/live-tables-on-rents-lettings-and-tenancies"}
NOMIS = "https://www.nomisweb.co.uk/api/v01/dataset/NM_162_1.data.csv?geography=TYPE424,TYPE480,TYPE499,K02000001&date=latestMINUS59-latest&gender=0&age=0&measure=1,2&measures=20100&select=date_name,geography_code,measure,obs_value"


def curl(url, out=None):
    for i in range(4):
        r = subprocess.run(["curl", "-sSL", "-m", "600", "-A", UA, url] + (["-o", out] if out else []), capture_output=True)
        if r.returncode == 0 and (out and os.path.getsize(out) > 1000 or (not out and r.stdout)): return True if out else r.stdout.decode("utf-8", "replace")
        time.sleep(8 * (i + 1))
    return None


def gov_files(path, pat):
    t = curl("https://www.gov.uk/api/content" + path)
    try: return [a["url"] for a in json.loads(t)["details"]["attachments"] if re.search(pat, a.get("title", "") + " " + a.get("url", ""), re.I) and a.get("url", "").startswith("http")]
    except Exception: return []


def fetch():
    for k, page in ONS.items():
        html = curl("https://www.ons.gov.uk" + page) or ""; time.sleep(4)
        links = re.findall(r'href="(/file\?uri=[^"]+\.xlsx)"', html)
        want = [l for l in links if (k == "myeb" and "myebtablesuk" in l) or k == "ltim"][:1]
        for l in want: curl("https://www.ons.gov.uk" + l, os.path.join(RAW, os.path.basename(l))); time.sleep(4)
    for u in gov_files(GOV["asylum"], r"support by local authority detailed|Resettlement by local authority detailed"): curl(u, os.path.join(RAW, os.path.basename(u)))
    for u in gov_files(GOV["stock"], r"Table 100:|Table 116:"): curl(u, os.path.join(RAW, os.path.basename(u)))
    for u in gov_files(GOV["lettings"], r"Table 600:"): curl(u, os.path.join(RAW, os.path.basename(u)))
    for coll, pat in (("/government/collections/children-in-low-income-families-local-area-statistics", r"local-area-statistics.*\.ods"),):
        t = curl("https://www.gov.uk/api/content" + coll) or ""
        pubs = re.findall(r'"(/government/statistics/children-in-low-income-families-local-area-statistics-[^"]+)"', t)
        for p in pubs[:1]:
            for u in gov_files(p, pat): curl(u, os.path.join(RAW, os.path.basename(u)))
    t = curl("https://www.gov.uk/api/search.json?q=use+of+discretionary+housing+payments&filter_organisations=department-for-work-pensions&order=-public_timestamp&count=3&fields=link") or "{}"
    for r in json.loads(t).get("results", [])[:1]:
        for u in gov_files(r["link"], r"\.ods$"): curl(u, os.path.join(RAW, os.path.basename(u)))
    rows, off = [], 0
    while True:   # Nomis returns at most 25,000 rows a request
        t = curl(NOMIS + f"&RecordOffset={off}&RecordLimit=25000") or ""; r = list(csv.reader(io.StringIO(t))); rows += r[1:] if rows else r
        if len(r) - 1 < 25000: break
        off += 25000; time.sleep(1)
    with open(os.path.join(RAW, "claimants.csv"), "w", newline="") as fh: csv.writer(fh).writerows(rows)
    manifest.record("raw/people/", "ONS; Home Office; MHCLG; DWP", "Long-term international migration; mid-year estimates components (MYEB3); asylum support and resettlement by council; dwelling stock tables 100 and 116; housing registers table 600; children in low income families; Discretionary Housing Payments; claimant count (Nomis)",
                    "https://www.ons.gov.uk" + ONS["ltim"], "OGL v3.0", "UK; councils", "for data/people.js (pipeline/fetch_people.py)")


def latest(pat):
    fs = sorted((f for f in os.listdir(RAW) if re.search(pat, f, re.I)), key=lambda f: os.path.getmtime(os.path.join(RAW, f)))
    return os.path.join(RAW, fs[-1]) if fs else None


def num(v):
    s = str(v).replace(",", "").replace("%", "").strip()
    try: return float(s)
    except ValueError: return None


def ltim():
    f = latest(r"(ltim|publicationspreadsheet).*\.xlsx$")
    if not f: return {}
    out = {"nat": {}, "reason": {}}
    rs = list(X.rows(f, "1")); hi = next(i for i, r in enumerate(rs) if r and str(r[0]).startswith("Flow"))
    H = [re.sub(r"\s*\n.*", "", str(h)).strip() for h in rs[hi]]
    for r in rs[hi + 1:]:
        if len(r) < 3 or not re.match(r"^YE ", str(r[1])): continue
        fl = str(r[0]).split("\n")[0].strip().lower()
        for i in range(2, len(H)):
            v = num(r[i]) if i < len(r) else None
            if v is not None and H[i] and H[i] != "None": out["nat"].setdefault(fl, {}).setdefault(H[i], {})[str(r[1])] = v
    for sh, grp in (("4a", "EU+ (visa)"), ("4b", "Non-EU+")):
        try: rs = list(X.rows(f, sh))
        except Exception: continue
        hi = next(i for i, r in enumerate(rs) if r and str(r[0]).startswith("Flow")); H = [re.sub(r"\s*\n.*", "", str(h)).strip() for h in rs[hi]]
        for r in rs[hi + 1:]:
            if len(r) < 3 or not re.match(r"^YE ", str(r[1])): continue
            fl = str(r[0]).split("\n")[0].strip().lower()
            for i in range(2, len(H)):
                v = num(r[i]) if i < len(r) else None
                if v is not None and H[i] and H[i] != "None" and not H[i].startswith("All reasons"): out["reason"].setdefault(grp, {}).setdefault(fl, {}).setdefault(H[i], {})[str(r[1])] = v
    out["latest"] = sorted({p for d in out["nat"].get("net migration", {}).values() for p in d}, key=period_key)[-1] if out["nat"].get("net migration") else ""
    print("LTIM: periods to", out["latest"], "; nationality groups", list(out["nat"].get("immigration", {}).keys()))
    return out


def period_key(p):
    m = re.match(r"YE (\w{3}) (\d{2})", p); mo = ["Mar", "Jun", "Sep", "Dec"].index(m.group(1)) if m and m.group(1) in ["Mar", "Jun", "Sep", "Dec"] else 0
    return (int(m.group(2)) if m else 0, mo)


def myeb():
    f = latest(r"myebtablesuk.*\.xlsx$")
    if not f: return {}
    rs = X.rows(f, "MYEB3"); rs = rs if isinstance(rs, list) else list(rs)
    hi = next(i for i, r in enumerate(rs) if r and str(r[0]).startswith("ladcode")); H = [str(h) for h in rs[hi]]
    keys = ["internal_in", "internal_out", "internal_net", "international_in", "international_out", "international_net", "births", "deaths", "population"]
    out = {"years": [], "v": {}}
    yrs = sorted({int(h.rsplit("_", 1)[1]) for h in H if re.search(r"_(\d{4})$", h)})
    out["years"] = [y for y in yrs if y >= 2012]
    for r in rs[hi + 1:]:
        if len(r) < 10 or not re.match(r"^[EWSN]\d{8}$", str(r[0])): continue
        d = {}
        for k in keys:
            d[k] = [num(r[H.index(f"{k}_{y}")]) if f"{k}_{y}" in H else None for y in out["years"]]
        out["v"][r[0]] = d
    print("MYEB3:", len(out["v"]), "councils,", out["years"][0], "to", out["years"][-1])
    return out


def asylum():
    out = {"support": {}, "resettle": {}}
    f = latest(r"support-local-authority.*\.xlsx$")
    if f:
        rs = list(X.rows(f, "Data_Asy_D11")); H = [str(h) for h in rs[1]]; ci = {h: i for i, h in enumerate(H)}
        dates = sorted({r[0] for r in rs[2:] if r and r[0] and r[0] != "None"}, key=lambda s: datetime.datetime.strptime(s, "%d %b %Y"))
        last = dates[-1]; out["support_date"] = last; series = {}
        for r in rs[2:]:
            if len(r) < 7: continue
            code = str(r[ci["LAD Code"]]); v = num(r[ci["People"]]) or 0
            if not re.match(r"^[EWSN]\d{8}$", code): continue
            if r[0] == last: d = out["support"].setdefault(code, {}); a = str(r[ci["Accommodation Type"]]); d[a] = d.get(a, 0) + v
            series.setdefault(code, {}); series[code][r[0]] = series[code].get(r[0], 0) + v
        keep = [d for d in dates if d.startswith("31 Mar") or d == last][-12:]
        out["support_series"] = {c: [round(s.get(d, 0)) for d in keep] for c, s in series.items()}; out["support_dates"] = keep
    f = latest(r"resettlement-local-authority.*\.xlsx$")
    if f:
        rs = list(X.rows(f, "Data_Res_D01")); H = [str(h) for h in rs[1]]; ci = {h: i for i, h in enumerate(H)}
        for r in rs[2:]:
            if len(r) < 8: continue
            code = str(r[ci["LAD Code"]]); v = num(r[ci["Persons"]]) or 0
            if re.match(r"^[EWSN]\d{8}$", code): d = out["resettle"].setdefault(code, {}); s = str(r[ci["Resettlement Scheme"]]); d[s] = d.get(s, 0) + v
    print("Asylum support:", len(out["support"]), "councils at", out.get("support_date"), "; resettlement:", len(out["resettle"]))
    return out


def housing():
    out = {"stock": {}, "la_series": {}, "waiting": {}}
    f = latest(r"LiveTable100\.ods$")
    if f:
        T = ods_tables(f); k = sorted(x for x in T if x.isdigit())[-1]; rs = T[k]; out["stock_year"] = k
        hi = next(i for i, r in enumerate(rs) if r and r[0].startswith("Old ONS")); H = rs[hi]
        for r in rs[hi + 1:]:
            code = r[1] if len(r) > 1 else ""
            if re.match(r"^E0[6-9]\d{6}$", code): out["stock"][code] = [num(r[i]) for i in range(3, 7)]   # council, housing association, other public, private
        out["stock_cols"] = ["Council", "Housing association", "Other public sector", "Private"]
    for name, key in ((r"Live_Table_116\.ods$", "la_series"), (r"Live_Table_600\.ods$", "waiting")):
        f = latest(name)
        if not f: continue
        T = ods_tables(f); rs = T["Local_Authority_Data"]; hi = next(i for i, r in enumerate(rs) if any(re.match(r"^(19|20)\d\d", c or "") for c in r)); H = rs[hi]
        yc = [(i, re.match(r"^(\d{4})", h).group(1)) for i, h in enumerate(H) if re.match(r"^(19|20)\d\d", h or "")]
        cc = next(i for i, h in enumerate(H) if h in ("LAD24CD",))
        for r in rs[hi + 1:]:
            code = r[cc] if len(r) > cc else ""
            if not re.match(r"^E0[6-9]\d{6}$", code): continue
            d = out[key].setdefault(code, {})
            for i, y in yc:
                v = num(r[i]) if i < len(r) else None
                if v is not None: d[y] = d.get(y, 0) + v   # merged councils add up their predecessors
        T2 = T.get("Regional_Data", [])
        for r in T2:
            if r and re.match(r"^E1[2]\d{6}$|^E92", r[0] or ""):
                hh = next(rr for rr in T2 if rr and rr[0] == "Area code")
                out[key][r[0]] = {re.match(r"^(\d{4})", h).group(1): num(r[i]) for i, h in enumerate(hh) if re.match(r"^(19|20)\d\d", h or "") and i < len(r) and num(r[i]) is not None}
    print("Housing: stock", len(out["stock"]), "(", out.get("stock_year"), "); council homes since 1979", len(out["la_series"]), "; registers", len(out["waiting"]))
    return out


def finances():
    out = {"claim": {}, "claim_rate": {}, "months": [], "cilif": {}, "cilif_ward": {}, "dhp": {}}
    p = os.path.join(RAW, "claimants.csv")
    if os.path.exists(p):
        rows = list(csv.reader(open(p)))[1:]; months = sorted({r[0] for r in rows}, key=lambda s: datetime.datetime.strptime(s, "%B %Y")); out["months"] = months
        for d, g, m, v in rows:
            tgt = out["claim"] if m == "1" else out["claim_rate"]; v = num(v)
            if v is None: continue
            tgt.setdefault(g, [None] * len(months))[months.index(d)] = v
    f = latest(r"children-in-low-income.*\.ods$")
    if f:
        T = ods_tables(f)
        for sh, key in (("2_AHC_Relative_LA", "cilif"), ("4_AHC_Relative_Ward", "cilif_ward"), ("1_AHC_Relative_Region", "cilif")):
            rs = T.get(sh, []); hi = next((i for i, r in enumerate(rs) if len(r) > 2 and r[1] == "Area Code"), None)
            if hi is None: continue
            H = rs[hi]; pc = [i for i, h in enumerate(H) if h.startswith("Percentage")]; nc = [i for i, h in enumerate(H) if h.startswith("Number")]; cc = max(i for i, h in enumerate(H) if h == "Area Code")
            out["cilif_years"] = [re.search(r"FYE (\d{4})", H[i]).group(1) for i in pc]
            for r in rs[hi + 1:]:
                if len(r) > cc and re.match(r"^[EWSNK]\d{8}$", r[cc]): out[key][r[cc]] = [[num(r[i]) for i in nc], [num(r[i]) for i in pc]]
    f = latest(r"dhp-data.*\.ods$")
    if f:
        T = ods_tables(f); rs = T.get("Financial_Information", []); hi = next((i for i, r in enumerate(rs) if r and r[0] == "Local Authority"), None)
        s = open(os.path.join(ROOT, "data", "uk-data.js"), encoding="utf-8").read(); PL = json.loads(s[s.index("{"):s.rindex("}") + 1])["places"]
        nm = lambda t: re.sub(r"[^a-z]+", " ", t.lower().replace("&", "and").replace("city of ", "").replace(", city of", "")).strip()
        byname = {nm(v["name"]): k for k, v in PL.items() if v["level"] == "council"}
        miss = []
        for r in rs[(hi or 0) + 1:]:
            if not r or not r[0] or r[0].startswith(("Total", "Great Britain", "England", "Scotland", "Wales")): continue
            code = byname.get(nm(r[0]))
            if code: out["dhp"][code] = [num(r[3]), num(r[4])]
            else: miss.append(r[0])
        out["dhp_unmatched"] = miss[:40]; out["dhp_year"] = re.search(r"(\d{4}-\w+-\d{4}|\d{4}-\d{4})", os.path.basename(f)).group(1) if re.search(r"\d{4}", os.path.basename(f)) else ""
    print("Finances: claimant months", len(out["months"]), "councils", len(out["claim"]), "; low-income children councils", len(out["cilif"]), "wards", len(out["cilif_ward"]), "; DHP", len(out["dhp"]))
    return out


def main():
    if "--offline" not in sys.argv: fetch()
    out = {"built": datetime.date.today().isoformat(), "ltim": ltim(), "myeb": myeb(), "asylum": asylum(), "housing": housing(), "fin": finances(),
           "sources": {"ltim": "ONS, Long-term international migration, provisional", "myeb": "ONS, mid-year population estimates: components of change (MYEB3)",
                       "asylum": "Home Office, Immigration system statistics (Asy_D11 asylum support by local authority; Res_D01 resettlement by local authority)",
                       "housing": "MHCLG live tables 100 (dwellings by tenure), 116 (local authority dwelling stock) and 600 (housing registers)",
                       "claim": "DWP and ONS claimant count (Nomis)", "cilif": "DWP, Children in low income families: local area statistics (after housing costs)", "dhp": "DWP, Use of Discretionary Housing Payments"}}
    statx = os.path.join(ROOT, "data", "benefits_statxplore.json")
    if os.path.exists(statx): out["sx"] = json.load(open(statx))
    with open(os.path.join(ROOT, "data", "people.js"), "w", encoding="utf-8") as fh:
        fh.write("// Atlas 0.10: migration, social housing and finances. Built by pipeline/fetch_people.py; do not edit.\nwindow.ATLAS_PEOPLE = ")
        json.dump(out, fh, separators=(",", ":"), ensure_ascii=False); fh.write(";\n")
    L = out["ltim"]; n = L.get("nat", {}); lp = L.get("latest", "")
    rep = os.path.join(HERE, "reports", "validation_people.md")
    with open(rep, "w") as fh:
        fh.write(f"# People build ({out['built']})\n\n- Net migration {lp}: {n.get('net migration', {}).get('All Nationalities', {}).get(lp)}\n")
        fh.write(f"- Councils with migration components: {len(out['myeb'].get('v', {}))}\n- Asylum support at {out['asylum'].get('support_date')}: {sum(sum(d.values()) for d in out['asylum']['support'].values()):,.0f} people in {len(out['asylum']['support'])} councils\n")
        st = out["housing"]["stock"]; fh.write(f"- England social homes ({out['housing'].get('stock_year')}): council {sum((v[0] or 0) for v in st.values()):,.0f}, housing association {sum((v[1] or 0) for v in st.values()):,.0f}\n")
        F = out["fin"]; fh.write(f"- UK claimant count {F['months'][-1] if F['months'] else ''}: {(F['claim'].get('K02000001') or [None])[-1]}\n- DHP councils not matched by name: {', '.join(F.get('dhp_unmatched', []))}\n")
    print(open(rep).read()); print("data/people.js", os.path.getsize(os.path.join(ROOT, "data", "people.js")) // 1024, "KB")


if __name__ == "__main__":
    main()
