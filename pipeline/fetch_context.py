"""
Atlas 0.8: written context for the numbers -> data/context.js   (python3 pipeline/fetch_context.py)

Atlas shows numbers; this file gathers the words that explain them, so a card or chart can say "GDP: ONS published the
monthly estimate on 13 November" or "OBR: borrowing above the March forecast" next to the figure itself.

Sources (official, and allowed to be republished as a title, a short summary and a link):
  ONS release calendar      api.beta.ons.gov.uk/v1/search/releases (published in the last 120 days, and upcoming)   OGL v3.0
  House of Commons Library  commonslibrary.parliament.uk/feed/ (research briefings)                                 Open Parliament Licence v3.0
  Office for Budget Responsibility  obr.uk/feed/ (forecasts, and how outturn compares with them)                     OGL v3.0
  Bank of England           bankofengland.co.uk/rss/news (Monetary Policy Summaries and other news)                  BoE: reuse with acknowledgement
  GOV.UK statistics         gov.uk research-and-statistics atom feed (statistics published)                         OGL v3.0
  ONS time series (the CSV download on ons.gov.uk) and the Bank of England database, for the headline figures: GDP,
  inflation, the labour market, pay and Bank Rate. From these Atlas writes one plain sentence per indicator ("UK GDP grew
  0.2% in April to June 2026, after 0.7% in January to March") and keeps the recent values for the Economic view.
Each item is tagged, by keyword rules on its title and summary, with:
  m   the Atlas metrics it is about (e.g. GDP, life expectancy, homelessness, council tax)
  pp  the perspectives it is about (economic, social, health, political, markets, transport), for wider context
  pl  the places it names (councils, constituencies, regions, nations; the news feed's rules)
  k   its kind: release (ONS or official statistics), report (a briefing or analysis), forecast (OBR or Bank of England)
The ONS calendar's next releases go in "upcoming" for the release calendar. Standard library (curl when Python can't
verify certificates). Run daily: .github/workflows/context.yml.
"""
import datetime, html, json, os, re, subprocess, sys, urllib.parse, urllib.request
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
from fetch_news import place_rules, clean

UA = "Mozilla/5.0 (compatible; AtlasMaps/0.8; +https://github.com/atlasmaps-lab/atlas)"   # ons.gov.uk refuses clients that don't look like a browser
TODAY = datetime.date.today()

METRIC_RULES = [   # (pattern, metric ids); patterns are deliberately specific so a tag means the item is about that number
    (r"\bGDP\b|gross domestic product|economic growth|\brecession\b|econom(y|ic output) (grew|shrank|contracted|expanded)|\bGVA\b|gross value added", ["gdp", "gdp_growth", "gdp_per_head"]),
    (r"\bproductivity\b", ["gdp_per_head"]),
    (r"\bpopulation (estimates?|projections?|change|growth)\b|\bmid-year (population )?estimates?\b|\bnet migration\b|\bmigration statistics\b", ["population", "pop_change", "density"]),
    (r"life expectancy", ["le_m", "le_f", "le65_m", "le65_f", "hle_m", "hle_f"]),
    (r"\b(premature|early|avoidable|preventable) (deaths|mortality)\b", ["u75_all", "u75_prev"]),
    (r"\bobes(ity|e)\b|\boverweight\b", ["adult_obese", "adult_overweight", "y6_obese", "rec_obese"]),
    (r"\bsmok(ing|ers)\b", ["smoking"]),
    (r"homeless|rough sleep|temporary accommodation", ["homeless_duty", "temp_accom"]),
    (r"\bfuel poverty\b", ["fuel_poverty"]),
    (r"council tax", ["band_d", "band_d_real", "band_d_change"]),
    (r"\bsuicides?\b", ["suicide"]),
    (r"drug (misuse|deaths|poisoning)", ["drug_deaths"]),
    (r"alcohol(-| )(specific|related) deaths", ["alcohol_deaths"]),
    (r"air pollution|PM2\.5|air quality", ["pm25"]),
    (r"home ?ownership|owner occup|private rent(ed|ing|s)?|social hous(ing|e)|housing tenure", ["c_owned", "c_private", "c_social"]),
    (r"\b(depression|anxiety)\b", ["dep_anx", "high_anxiety"]),
    (r"(personal )?well-?being|life satisfaction", ["low_satisfaction", "high_anxiety"]),
    (r"\bdiabetes\b", ["diabetes"]),
    (r"\bprotests?\b|\bdemonstrations?\b", ["protest_count", "protest_events"]),
    (r"\b(general|local|by-)?elections?\b|\bpolling\b", ["party", "ruler"]),
    (r"\bFTSE\b|stock market|share prices", ["market_value", "market_return"]),
]
PERSPECTIVE_RULES = {
    "economic": r"\b(econom\w*|GDP|inflation|Bank Rate|interest rates?|borrowing|fiscal|public finances|labour market|wages|earnings|unemployment|employment|productivity|trade|business(es)?|investment|output)\b",
    "social": r"\b(population|migration|housing|households?|poverty|homeless\w*|education|schools?|crime|wellbeing|well-being|deprivation|census|benefits?)\b",
    "health": r"\b(health|NHS|life expectancy|mortality|deaths|obesity|hospital|disease|mental)\b",
    "political": r"\b(election|parliament\w*|MPs?|council|government|devolution|referendum|ministers?)\b",
    "markets": r"\b(FTSE|shares?|stock|financial markets?|banks?|bond|gilts?|yields?|sterling|pound)\b",
    "transport": r"\b(rail|railways?|trains?|bus(es)?|roads?|transport|airports?|aviation|ports?|traffic)\b",
}


def fetch(url):
    try:
        return urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=60).read().decode("utf-8", "replace")
    except Exception:
        return subprocess.run(["curl", "-sSL", "-m", "90", "-A", UA, url], capture_output=True, check=True).stdout.decode("utf-8", "replace")


def rss(url, source, kind, days=180):
    out = []
    s = fetch(url)
    for it in re.findall(r"<(?:item|entry)\b.*?</(?:item|entry)>", s, re.S):
        g = lambda tag: (re.search(r"<%s\b[^>]*>(.*?)</%s>" % (tag, tag), it, re.S) or [None, ""])[1]
        t = clean(re.sub(r"<!\[CDATA\[(.*?)\]\]>", r"\1", g("title"), flags=re.S), 200)
        link = g("link").strip() or (re.search(r'<link[^>]+href="([^"]+)"', it) or [None, ""])[1]
        d = g("pubDate") or g("updated") or g("published") or g("dc:date")
        try:
            dd = datetime.datetime.strptime(d.strip()[:25].strip(), "%a, %d %b %Y %H:%M:%S").date() if "," in d else datetime.date.fromisoformat(d.strip()[:10])
        except Exception:
            continue
        if (TODAY - dd).days > days: continue
        x = clean(re.sub(r"<!\[CDATA\[(.*?)\]\]>", r"\1", g("description") or g("summary") or g("content"), flags=re.S), 300)
        out.append({"d": dd.isoformat(), "t": t, "s": source, "u": html.unescape(link.strip()), "x": x, "k": kind})
    return out


MONTHS = {m: i for i, m in enumerate(["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"], 1)}
MNAME = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
QNAME = {1: "January to March", 2: "April to June", 3: "July to September", 4: "October to December"}
INDICATORS = [   # id, ONS uri (or BoE code), label, how to describe it, metrics, perspectives
    ("gdp_q", "/economy/grossdomesticproductgdp/timeseries/ihyq/qna", "GDP, quarter on quarter", "qgrowth", ["gdp", "gdp_growth", "gdp_per_head"], ["economic"]),
    ("gdp_m", "/economy/grossdomesticproductgdp/timeseries/ecy2/mgdp", "Monthly GDP (index, 2022 = 100)", "mindex", ["gdp", "gdp_growth"], ["economic"]),
    ("cpi", "/economy/inflationandpriceindices/timeseries/d7g7/mm23", "CPI inflation (12 months)", "rate", [], ["economic", "markets"]),
    ("cpih", "/economy/inflationandpriceindices/timeseries/l55o/mm23", "CPIH inflation (12 months)", "rate", [], ["economic"]),
    ("unemp", "/employmentandlabourmarket/peoplenotinwork/unemployment/timeseries/mgsx/lms", "Unemployment rate (16+)", "lfs", [], ["economic", "social"]),
    ("emp", "/employmentandlabourmarket/peopleinwork/employmentandemployeetypes/timeseries/lf24/lms", "Employment rate (16 to 64)", "lfs", [], ["economic", "social"]),
    ("realpay", "/employmentandlabourmarket/peopleinwork/earningsandworkinghours/timeseries/a3ww/lms", "Real pay growth (total pay, 3 months, year on year)", "lfs", [], ["economic", "social"]),
    ("bankrate", "BOE:IUDBEDR", "Bank Rate", "bankrate", [], ["economic", "markets"]),
]


def period_name(lbl, kind):
    lbl = lbl.strip(); m = re.match(r"(\d{4}) Q(\d)", lbl)
    if m: return f"{QNAME[int(m.group(2))]} {m.group(1)}"
    m = re.match(r"(\d{4}) ([A-Z]{3})", lbl)
    if m:
        y, mo = int(m.group(1)), MONTHS[m.group(2)]
        if kind == "lfs":   # Labour Force Survey figures are three-month averages, labelled by the last month
            a = (mo - 3) % 12 + 1; return f"{MNAME[a]} to {MNAME[mo]} {y}"
        return f"{MNAME[mo]} {y}"
    return lbl


def indicators():
    out, items = {}, []
    for iid, uri, label, kind, metrics, pp in INDICATORS:
        try:
            if uri.startswith("BOE:"):
                code = uri[4:]
                txt = fetch(f"https://www.bankofengland.co.uk/boeapps/database/_iadb-fromshowcolumns.asp?csv.x=yes&Datefrom=01/Jan/2015&Dateto=now&SeriesCodes={code}&CSVF=TN&UsingCodes=Y&VPD=Y&VFD=N")
                rows = [r.split(",") for r in txt.strip().splitlines()[1:] if "," in r]
                pts = [(datetime.datetime.strptime(d.strip(), "%d %b %Y").date().isoformat(), float(v)) for d, v in rows if v.strip()]
                changes = [pts[0]] + [p for i, p in enumerate(pts[1:], 1) if p[1] != pts[i - 1][1]]
                last = changes[-1]; prev = changes[-2] if len(changes) > 1 else None
                out[iid] = {"label": label, "unit": "%", "src": "Bank of England", "url": "https://www.bankofengland.co.uk/monetary-policy/the-interest-rate-bank-rate", "pts": [[d, v] for d, v in changes[-20:]], "released": last[0]}
                sentence = f"Bank Rate is {last[1]:g}%, set on {datetime.date.fromisoformat(last[0]).strftime('%-d %B %Y')}" + (f" (it was {prev[1]:g}% before)." if prev else ".")
                items.append({"d": last[0], "t": sentence, "s": "Bank of England", "u": out[iid]["url"], "x": "", "k": "indicator", "m": metrics, "pp": pp, "pl": ["K02000001"], "ind": iid})
                continue
            import csv as _csv, io
            import time
            for wait in (3, 30, 90):   # ons.gov.uk rate-limits bursts ("error code: 1015"): pause, and wait longer on a refusal
                time.sleep(wait); body = fetch("https://www.ons.gov.uk/generator?format=csv&uri=" + uri)
                if not body.startswith("error code"): break
            rows = list(_csv.reader(io.StringIO(body)))
            meta = {r[0]: r[1] for r in rows[:10] if len(r) > 1}
            data = [(r[0], float(r[1])) for r in rows[10:] if len(r) > 1 and re.match(r"\d{4}( Q\d| [A-Z]{3})$", r[0].strip()) and r[1] not in ("", "x")]
            if not data: continue
            rel = datetime.datetime.strptime(meta.get("Release date", ""), "%d-%m-%Y").date().isoformat() if meta.get("Release date") else TODAY.isoformat()
            out[iid] = {"label": label, "unit": "%" if kind != "mindex" else "", "src": "ONS", "url": "https://www.ons.gov.uk" + uri.rsplit("/timeseries", 1)[0], "pts": [[a, b] for a, b in data[-40:]], "released": rel, "next": meta.get("Next release", "")}
            (p1, v1), (p0, v0) = data[-1], data[-2]
            if kind == "qgrowth":
                verb = "grew" if v1 > 0 else "shrank" if v1 < 0 else "was flat"
                sentence = f"UK GDP {verb}{'' if v1 == 0 else f' {abs(v1):g}%'} in {period_name(p1, kind)}, after {v0:g}% in {period_name(p0, kind).split(' 20')[0]}."
            elif kind == "mindex":
                mm = (v1 / v0 - 1) * 100; q3 = (sum(x for _, x in data[-3:]) / sum(x for _, x in data[-6:-3]) - 1) * 100
                sentence = f"Monthly GDP {'grew' if mm > 0.05 else 'fell' if mm < -0.05 else 'was flat'}{'' if abs(mm) <= 0.05 else f' {abs(mm):.1f}%'} in {period_name(p1, kind)}; over the latest three months it {'grew' if q3 > 0.05 else 'fell' if q3 < -0.05 else 'was flat'} {abs(q3):.1f}% on the three before."
            elif kind == "rate":
                sentence = f"{label.split(' (')[0]} was {v1:g}% in the 12 months to {period_name(p1, kind)} ({v0:g}% the month before)."
            else:
                sentence = f"{label.split(' (')[0]} was {v1:g}% in {period_name(p1, kind)} ({v0:g}% in the period before)."
            if meta.get("Next release"): sentence += f" Next update: {meta['Next release']}."
            items.append({"d": rel, "t": sentence, "s": "ONS", "u": out[iid]["url"], "x": "", "k": "indicator", "m": metrics, "pp": pp, "pl": ["K02000001"], "ind": iid})
        except Exception as e:
            print("indicator", iid, "failed:", e)
    return out, items


def ons():
    pub, upcoming = [], []
    since = (TODAY - datetime.timedelta(days=120)).isoformat()
    q = urllib.parse.urlencode({"limit": 300, "sort": "release_date_desc", "release-type": "type-published", "fromDate": since})
    for r in json.loads(fetch("https://api.beta.ons.gov.uk/v1/search/releases?" + q))["releases"]:
        d = r["description"]
        pub.append({"d": d["release_date"][:10], "t": clean(d["title"], 200), "s": "ONS", "u": "https://www.ons.gov.uk" + r["uri"], "x": clean(d.get("summary", ""), 300), "k": "release"})
    q = urllib.parse.urlencode({"limit": 200, "sort": "release_date_asc", "release-type": "type-upcoming", "fromDate": TODAY.isoformat(),
                                "toDate": (TODAY + datetime.timedelta(days=60)).isoformat()})
    for r in json.loads(fetch("https://api.beta.ons.gov.uk/v1/search/releases?" + q))["releases"]:
        d = r["description"]
        if d.get("cancelled"): continue
        upcoming.append({"d": d["release_date"][:10], "t": clean(d["title"], 200), "s": "ONS", "u": "https://www.ons.gov.uk" + r["uri"], "x": clean(d.get("summary", ""), 200), "k": "upcoming"})
    return pub, upcoming


def main():
    items, upcoming, problems = [], [], []
    ind, ind_items = indicators(); items += ind_items
    for name, fn in [
        ("ONS", ons),
        ("Commons Library", lambda: rss("https://commonslibrary.parliament.uk/feed/", "House of Commons Library", "report")),
        ("OBR", lambda: rss("https://obr.uk/feed/", "Office for Budget Responsibility", "forecast", 365)),
        ("Bank of England", lambda: rss("https://www.bankofengland.co.uk/rss/news", "Bank of England", "forecast")),
        ("GOV.UK statistics", lambda: rss("https://www.gov.uk/search/research-and-statistics.atom?content_store_document_type=statistics_published", "GOV.UK statistics", "release", 120)),
    ]:
        try:
            r = fn()
            if name == "ONS": items += r[0]; upcoming += r[1]
            else: items += r
        except Exception as e:
            problems.append(f"{name}: {e}"); print(name, "failed:", e)
    rules = place_rules()
    mr = [(re.compile(p, re.I), ms) for p, ms in METRIC_RULES]
    pr = {k: re.compile(v, re.I) for k, v in PERSPECTIVE_RULES.items()}
    seen, out = set(), []
    for it in sorted(items, key=lambda x: x["d"], reverse=True):
        if (it["u"] in seen and it["k"] != "indicator") or not it["t"]: continue
        if it["s"] == "ONS" and re.search(r"\btime ?series\b|\btimeseries\b", it["t"], re.I): continue   # the dataset twin of a bulletin
        seen.add(it["u"]); txt = it["t"] + " " + it["x"]
        if it["k"] != "indicator":
            it["m"] = sorted({m for rx, ms in mr if rx.search(txt) for m in ms})
            it["pp"] = [k for k, rx in pr.items() if rx.search(txt)]
            it["pl"] = sorted({c for rx, cs in rules if rx.search(txt) for c in cs})[:12]
        if it["m"] or it["pp"] or it["pl"]: out.append(it)
    for u in upcoming:   # so ⓘ can say what's coming for a metric
        txt = u["t"] + " " + u["x"]; u["m"] = sorted({m for rx, ms in mr if rx.search(txt) for m in ms}); u["pp"] = [k for k, rx in pr.items() if rx.search(txt)]
    data = {"built": TODAY.isoformat(), "items": out[:600], "upcoming": upcoming[:120], "ind": ind,
            "sources": "ONS release calendar and GOV.UK statistics (Open Government Licence v3.0); House of Commons Library (Open Parliament Licence v3.0); Office for Budget Responsibility (OGL v3.0); Bank of England news (reused with acknowledgement). Atlas tags each item with metrics, perspectives and places using keyword rules (pipeline/fetch_context.py).",
            "problems": problems}
    with open(os.path.join(ROOT, "data", "context.js"), "w", encoding="utf-8") as fh:
        fh.write("// Generated by pipeline/fetch_context.py. Do not edit by hand.\nwindow.ATLAS_CONTEXT = ")
        json.dump(data, fh, ensure_ascii=False, separators=(",", ":")); fh.write(";\n")
    print("context:", len(out), "items;", sum(1 for x in out if x["m"]), "tied to a metric;", sum(1 for x in out if x["pl"]), "name a place;", len(upcoming), "upcoming releases", ("; problems: " + "; ".join(problems)) if problems else "")


if __name__ == "__main__":
    main()
