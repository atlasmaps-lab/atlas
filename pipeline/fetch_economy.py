"""
Atlas 0.8: the data behind the specialists' views -> data/economy.js   (python3 pipeline/fetch_economy.py)
Standard library (curl).

  ONS time series (ons.gov.uk CSV download), OGL v3.0: GDP (quarterly and monthly), CPI, CPIH, core and services CPI,
    unemployment, employment and inactivity rates, vacancies, pay (nominal and real), public sector net borrowing,
    the trade balance, retail sales volumes.
  Bank of England database, reused with acknowledgement: Bank Rate, SONIA, 5- and 10-year gilt yields (nominal zero
    coupon), the sterling effective exchange rate, $/£ and €/£, two-year fixed mortgage rate (75% LTV).
  HM Treasury, Forecasts for the UK economy (monthly comparison of independent forecasts, with the OBR's latest), OGL:
    the average, median and range of forecasts for this year and next.
  MHCLG, English Indices of Deprivation 2025, local authority summaries (file 10), OGL: the overall index and its
    seven domains, by council (England).
ons.gov.uk rate-limits bursts, so requests are spaced out and retried. Run weekly (.github/workflows/economy.yml).
"""
import csv, datetime, io, json, os, re, subprocess, sys, time, urllib.parse
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
from xlsx_read import rows as xrows
import manifest

RAW = os.path.join(HERE, "sources", "raw", "economy"); os.makedirs(RAW, exist_ok=True)
UA = "Mozilla/5.0 (compatible; AtlasMaps/0.8; +https://github.com/atlasmaps-lab/atlas)"
ONS = [   # id, uri, label, unit, group, how to read it ("up" good, "down" good, or "")
    ("gdp_q", "/economy/grossdomesticproductgdp/timeseries/ihyq/qna", "GDP growth, quarter on quarter", "%", "Growth", "up"),
    ("gdp_y", "/economy/grossdomesticproductgdp/timeseries/ihyp/qna", "GDP growth, calendar year", "%", "Growth", "up"),
    ("gdp_m", "/economy/grossdomesticproductgdp/timeseries/ecy2/mgdp", "Monthly GDP index (2022 = 100)", "", "Growth", "up"),
    ("retail", "/businessindustryandtrade/retailindustry/timeseries/j5ek/drsi", "Retail sales volume index", "", "Growth", "up"),
    ("cpi", "/economy/inflationandpriceindices/timeseries/d7g7/mm23", "CPI inflation", "%", "Prices", "down"),
    ("cpih", "/economy/inflationandpriceindices/timeseries/l55o/mm23", "CPIH inflation", "%", "Prices", "down"),
    ("core", "/economy/inflationandpriceindices/timeseries/dko8/mm23", "Core CPI (ex energy, food, alcohol, tobacco)", "%", "Prices", "down"),
    ("services", "/economy/inflationandpriceindices/timeseries/d7nn/mm23", "Services CPI", "%", "Prices", "down"),
    ("unemp", "/employmentandlabourmarket/peoplenotinwork/unemployment/timeseries/mgsx/lms", "Unemployment rate (16+)", "%", "Jobs", "down"),
    ("emp", "/employmentandlabourmarket/peopleinwork/employmentandemployeetypes/timeseries/lf24/lms", "Employment rate (16–64)", "%", "Jobs", "up"),
    ("inact", "/employmentandlabourmarket/peoplenotinwork/economicinactivity/timeseries/lf2s/lms", "Economic inactivity rate (16–64)", "%", "Jobs", "down"),
    ("vac", "/employmentandlabourmarket/peopleinwork/employmentandemployeetypes/timeseries/ap2y/lms", "Job vacancies (thousands)", "k", "Jobs", ""),
    ("pay", "/employmentandlabourmarket/peopleinwork/earningsandworkinghours/timeseries/kac3/lms", "Pay growth (total, 3 months, year on year)", "%", "Pay", "up"),
    ("realpay", "/employmentandlabourmarket/peopleinwork/earningsandworkinghours/timeseries/a3ww/lms", "Real pay growth (total, after inflation)", "%", "Pay", "up"),
    ("psnb", "/economy/governmentpublicsectorandtaxes/publicsectorfinance/timeseries/j5ii/pusf", "Public sector net borrowing (£m, month)", "£m", "Public finances", "down"),
    ("trade", "/economy/nationalaccounts/balanceofpayments/timeseries/ikbj/mret", "Trade balance (£m, month)", "£m", "Trade", "up"),
]
BOE = [("bankrate", "IUDBEDR", "Bank Rate", "%"), ("sonia", "IUDSOIA", "SONIA (overnight rate)", "%"), ("gilt5", "IUDSNZC", "5-year gilt yield", "%"), ("gilt10", "IUDMNZC", "10-year gilt yield", "%"),
       ("eri", "XUDLBK67", "Sterling exchange rate index (Jan 2005 = 100)", ""), ("usd", "XUDLUSS", "US dollars per pound", ""), ("eur", "XUDLERS", "Euros per pound", ""), ("mort2", "IUMBV34", "2-year fixed mortgage rate (75% LTV)", "%")]
LFS = {"unemp", "emp", "inact", "pay", "realpay"}


def curl(url, out=None):
    args = ["curl", "-sSL", "-m", "120", "-A", UA, url] + (["-o", out] if out else [])
    return subprocess.run(args, capture_output=True, check=True).stdout.decode("utf-8", "replace")


def ons_series(uri):
    for wait in (3, 30, 120):
        time.sleep(wait); body = curl("https://www.ons.gov.uk/generator?format=csv&uri=" + uri)
        if not body.startswith("error code"): break
    rows = list(csv.reader(io.StringIO(body)))
    meta = {r[0]: r[1] for r in rows[:10] if len(r) > 1}
    q = [(r[0].strip(), float(r[1])) for r in rows[10:] if len(r) > 1 and re.match(r"\d{4} Q\d$", r[0].strip()) and r[1] not in ("", "x")]
    m = [(r[0].strip(), float(r[1])) for r in rows[10:] if len(r) > 1 and re.match(r"\d{4} [A-Z]{3}$", r[0].strip()) and r[1] not in ("", "x")]
    y = [(r[0].strip(), float(r[1])) for r in rows[10:] if len(r) > 1 and re.match(r"\d{4}$", r[0].strip()) and r[1] not in ("", "x")]
    return meta, (m or q or y), ("M" if m else "Q" if q else "A")


def boe(code):
    txt = curl(f"https://www.bankofengland.co.uk/boeapps/database/_iadb-fromshowcolumns.asp?csv.x=yes&Datefrom=01/Jan/2016&Dateto=now&SeriesCodes={code}&CSVF=TN&UsingCodes=Y&VPD=Y&VFD=N")
    pts = []
    for line in txt.strip().splitlines()[1:]:
        d, _, v = line.partition(",")
        try: pts.append((datetime.datetime.strptime(d.strip(), "%d %b %Y").date().isoformat(), float(v)))
        except ValueError: continue
    return pts


def consensus():
    res = json.loads(curl("https://www.gov.uk/api/search.json?" + urllib.parse.urlencode({"q": '"Forecasts for the UK economy"', "count": 20, "fields": "title,link,public_timestamp"})))["results"]
    res = sorted([r for r in res if re.match(r"Forecasts for the UK economy: \w+ \d{4}$", r["title"])], key=lambda r: r["public_timestamp"], reverse=True)
    pub = json.loads(curl("https://www.gov.uk/api/content" + res[0]["link"]))
    att = next(a for a in pub["details"]["attachments"] if a["url"].endswith(".xlsx"))
    p = os.path.join(RAW, "hmt_forecasts.xlsx"); curl(att["url"], p)
    manifest.record("raw/economy/hmt_forecasts.xlsx", "HM Treasury", res[0]["title"] + " (data tables)", att["url"], manifest.OGL, "UK", "independent forecasts' average, median and range; the OBR's latest")
    out = {"asof": res[0]["title"].split(": ")[1], "url": "https://www.gov.uk" + res[0]["link"], "years": {}}
    for t in range(1, 7):
        R = xrows(p, f"Table {t}")
        title = next((str(r[1]) for r in R if len(r) > 1 and r[1] and str(r[1]).startswith("Table")), "")
        year = (re.search(r"(\d{4})", title) or [None, ""])[1]
        heads = next(r for r in R if len(r) > 4 and r[4] and any(k in str(r[4]) for k in ("GDP", "CPI", "Real household")))
        sub = next((r for r in R if any(re.match(r"\d{4} Q\d", str(c or "")) for c in r)), [])
        cols = {}
        for i, h in enumerate(heads):
            if h and i >= 4: cols[i] = re.sub(r"\s+", " ", str(h)).strip()
        for i, c in enumerate(sub):
            if c and re.match(r"\d{4} Q\d", str(c)): cols[i] = "Quarterly GDP " + str(c)
        pick = {}
        for r in R:
            k = str(r[1]).strip() if len(r) > 1 and r[1] else ""
            if k in ("Independent", "Highest", "Lowest", "Median", "OBR"): pick[k] = r
        Y = out["years"].setdefault(year, {})
        for i, name in cols.items():
            g = lambda k: (lambda v: round(float(v), 2) if v not in (None, "", "-") and re.match(r"^-?[\d.]+$", str(v)) else None)(pick.get(k, [None] * 50)[i] if i < len(pick.get(k, [])) else None)
            if g("Independent") is None and g("Median") is None: continue
            Y[name] = {"avg": g("Independent"), "med": g("Median"), "hi": g("Highest"), "lo": g("Lowest"), "obr": g("OBR")}
    return out


def imd():
    url = "https://assets.publishing.service.gov.uk/media/6917412ebc34c86ce4e6e7fc/File_10_-_IoD2025_Local_Authority_District_Summaries__lower-tier__v2.xlsx"
    p = os.path.join(RAW, "iod2025_lad.xlsx")
    if not os.path.exists(p): curl(url, p)
    manifest.record("raw/economy/iod2025_lad.xlsx", "Ministry of Housing, Communities and Local Government", "English Indices of Deprivation 2025, file 10: local authority district summaries", url, manifest.OGL, "England, 2025 local authorities", "overall IMD and seven domains")
    out = {}
    for sheet in ("IMD", "Income", "Employment", "Education", "Health", "Crime", "Barriers", "Living"):
        R = xrows(p, sheet); H = [str(h or "") for h in R[0]]
        ci = next(i for i, h in enumerate(H) if "Rank of average score" in h); si = next(i for i, h in enumerate(H) if "Average score" in h and "Rank" not in h)
        pi = next((i for i, h in enumerate(H) if "Proportion of LSOAs" in h and "Rank" not in h), None)
        for r in R[1:]:
            if not r or not r[0] or not str(r[0]).startswith("E"): continue
            o = out.setdefault(str(r[0]), {})
            o[sheet] = [round(float(r[si]), 2), int(float(r[ci]))]
            if sheet == "IMD" and pi is not None: o["share10"] = round(float(r[pi]), 4)
    return out


def main():
    ind, problems = {}, []
    for iid, uri, label, unit, grp, good in ONS:
        try:
            meta, pts, f = ons_series(uri)
            ind[iid] = {"label": label, "unit": unit, "grp": grp, "good": good, "f": f, "lfs": iid in LFS, "src": "ONS", "url": "https://www.ons.gov.uk" + uri.rsplit("/timeseries", 1)[0],
                        "released": meta.get("Release date", ""), "next": meta.get("Next release", ""), "pts": pts[-72:]}
        except Exception as e: problems.append(f"{iid}: {e}"); print("ONS", iid, "failed:", e)
    for iid, code, label, unit in BOE:
        try:
            pts = boe(code)
            if iid in ("bankrate",): pts = [p for i, p in enumerate(pts) if i == 0 or p[1] != pts[i - 1][1]] + pts[-1:]
            elif iid != "mort2": pts = pts[::5][-260:] + pts[-1:]   # weekly is plenty for a sparkline
            ind[iid] = {"label": label, "unit": unit, "grp": "Rates and sterling", "good": "", "f": "D", "src": "Bank of England", "url": "https://www.bankofengland.co.uk/boeapps/database/", "released": pts[-1][0] if pts else "", "pts": pts}
        except Exception as e: problems.append(f"{iid}: {e}"); print("BoE", iid, "failed:", e)
    try: cons = consensus()
    except Exception as e: cons = None; problems.append(f"consensus: {e}"); print("consensus failed:", e)
    try: dep = imd()
    except Exception as e: dep = {}; problems.append(f"imd: {e}"); print("imd failed:", e)
    out = {"built": datetime.date.today().isoformat(), "ind": ind, "consensus": cons, "imd": dep, "problems": problems,
           "sources": "ONS time series and HM Treasury forecast comparison (Open Government Licence v3.0); Bank of England database (reused with acknowledgement); MHCLG English Indices of Deprivation 2025 (OGL v3.0). Built by pipeline/fetch_economy.py."}
    with open(os.path.join(ROOT, "data", "economy.js"), "w", encoding="utf-8") as fh:
        fh.write("// Atlas 0.8: indicators, forecasts and deprivation for the specialists' views. Built by pipeline/fetch_economy.py; do not edit.\nwindow.ATLAS_ECONOMY = ")
        json.dump(out, fh, separators=(",", ":"), ensure_ascii=False); fh.write(";\n")
    print(f"economy: {len(ind)} indicators, consensus {cons and cons['asof']}, IMD for {len(dep)} councils" + (f"; problems: {problems}" if problems else ""))


if __name__ == "__main__":
    main()
