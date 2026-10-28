"""
Atlas 0.7.1: political news -> data/news.js   (python3 pipeline/fetch_news.py)

Atlas is a public site, so it only republishes news it is allowed to: official feeds whose licences allow reuse.
  GOV.UK news stories            GOV.UK search API, Open Government Licence v3.0
  Written ministerial statements UK Parliament questions-statements API, Open Parliament Licence v3.0
  Bills and their stages         UK Parliament bills API, Open Parliament Licence v3.0
Newspapers and broadcasters (BBC, Guardian, etc.) are not scraped: their terms don't allow republishing their articles.
Each item keeps a title, date, source, link and a short summary (at most about 240 characters).

Rules, applied to the title and summary, tag each item so Atlas can show it in the right places:
  places   any council, 2024 constituency, region or nation named (case-sensitive whole words; a few names that are
           also everyday words, such as Reading or Sale, only count when followed by a place word)
  parties  party names and short names (Labour, Conservative, Reform UK, Liberal Democrat, Green, SNP, Plaid Cymru, ...)
  topics   keyword lists: elections, housing, health, economy, local government, transport, environment, crime and justice,
           education, immigration, defence and foreign affairs
Standard library only. Run it daily (see .github/workflows/news.yml) or by hand.
"""
import datetime, html, json, os, re, urllib.parse, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
UA = {"User-Agent": "AtlasMaps/0.7.1 (+https://github.com/atlasmaps-lab/atlas)"}
TOPICS = {
    "Elections": r"\b(election|by-election|ballot|vote|voting|voter|polling|electoral|candidate|referendum)s?\b",
    "Housing": r"\b(housing|homes?|rent(al|ers?|s)?|landlords?|planning|homeless(ness)?|mortgages?|leasehold)\b",
    "Health": r"\b(NHS|health|hospitals?|GPs?|patients?|social care|mental health|vaccin\w*|doctors?|nurses?)\b",
    "Economy": r"\b(budget|tax(es)?|econom\w*|growth|jobs?|inflation|wages?|pay|business(es)?|trade|investment|cost of living|energy bills?)\b",
    "Local government": r"\b(councils?|mayors?|devolution|local government|combined authorit\w*|local authorit\w*)\b",
    "Transport": r"\b(rail|railways?|trains?|bus(es)?|roads?|transport|airports?|HS2|motorways?|highways?)\b",
    "Environment": r"\b(climate|net zero|emissions|flood\w*|environment\w*|nature|water|pollution|renewable\w*)\b",
    "Crime & justice": r"\b(police|policing|crime|courts?|prisons?|justice|sentenc\w*|fire)\b",
    "Education": r"\b(schools?|pupils?|teachers?|universit\w*|students?|education|skills|apprenticeships?)\b",
    "Immigration": r"\b(immigration|migrants?|asylum|visas?|borders?|small boats?)\b",
    "Defence & foreign affairs": r"\b(defence|military|armed forces|Ukraine|NATO|foreign|sanctions|diplomat\w*|aid)\b",
}
PARTIES = {"lab": r"\bLabour\b", "con": r"\bConservatives?\b|\bTor(y|ies)\b", "ref": r"\bReform UK\b", "ld": r"\bLiberal Democrats?\b|\bLib Dems?\b",
           "grn": r"\bGreen Party\b|\bGreens\b", "snp": r"\bSNP\b|\bScottish National Party\b", "pc": r"\bPlaid Cymru\b", "sf": r"\bSinn F[ée]in\b", "dup": r"\bDUP\b"}
AMBIGUOUS = {"Reading", "Sale", "Bury", "Wells", "Rugby", "Hyde", "Street", "Deal", "Stone", "March", "Ware", "Bath", "Wigan", "Mole Valley", "Eastleigh", "Copeland", "Richmond"}


def get(url):
    return json.load(urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60))


def clean(t, n=240):
    t = re.sub(r"<[^>]+>", " ", html.unescape(t or "")); t = re.sub(r"\s+", " ", t).strip()
    return t if len(t) <= n else t[:n].rsplit(" ", 1)[0] + "…"


def load_js(name):
    s = open(os.path.join(ROOT, "data", name), encoding="utf-8").read()
    return json.loads(s[s.index("=") + 1:].strip().rstrip(";"))


def place_rules():
    uk = load_js("uk-data.js")["places"]; pc = load_js("constituencies.js")["places"]
    names = {}
    for c, p in list(uk.items()) + list(pc.items()):
        if p["level"] in ("council", "region", "nation", "constituency") and not c.startswith("P"):
            names.setdefault(p["name"], []).append(c)
    rules = []
    for n in sorted(names, key=len, reverse=True):
        pat = re.escape(n) + (r"(?=\s+(?:council|constituency|borough|city|town|area|MP|residents))" if n in AMBIGUOUS else "")
        rules.append((re.compile(r"(?<![\w-])" + pat + r"(?![\w-])"), names[n]))
    return rules


def main():
    items = []
    try:
        q = urllib.parse.urlencode({"filter_content_store_document_type": "news_story", "count": 200, "order": "-public_timestamp", "fields": "title,link,description,public_timestamp,organisations"})
        for r in get("https://www.gov.uk/api/search.json?" + q)["results"]:
            org = (r.get("organisations") or [{}])[0].get("title", "") if r.get("organisations") else ""
            items.append({"d": r["public_timestamp"][:10], "t": clean(r["title"], 200), "s": "GOV.UK" + (f" · {org}" if org else ""), "u": "https://www.gov.uk" + r["link"], "x": clean(r.get("description"))})
    except Exception as e:
        print("GOV.UK failed:", e)
    try:
        for r in get("https://questions-statements-api.parliament.uk/api/writtenstatements/statements?take=120&expandMemberDetails=false")["results"]:
            v = r["value"]; d = v["dateMade"][:10]
            items.append({"d": d, "t": clean(v["title"], 200), "s": "Parliament · written statement · " + (v.get("answeringBodyName") or ""), "u": f"https://questions-statements.parliament.uk/written-statements/detail/{d}/{v['uin']}", "x": clean(v.get("text"))})
    except Exception as e:
        print("statements failed:", e)
    try:
        for b in get("https://bills-api.parliament.uk/api/v1/Bills?SortOrder=DateUpdatedDescending&take=80")["items"]:
            st = (b.get("currentStage") or {}); items.append({"d": (b.get("lastUpdate") or "")[:10], "t": clean(b["shortTitle"], 200), "s": "Parliament · bill", "u": f"https://bills.parliament.uk/bills/{b['billId']}",
                                                               "x": f"{st.get('description', 'In progress')} in the {st.get('house', b.get('currentHouse', ''))}" + (" · now an Act" if b.get("isAct") else "") + (" · withdrawn" if b.get("billWithdrawn") else "")})
    except Exception as e:
        print("bills failed:", e)
    rules, topics, parties = place_rules(), {k: re.compile(v, re.I) for k, v in TOPICS.items()}, {k: re.compile(v) for k, v in PARTIES.items()}
    seen = set(); out = []
    for it in sorted(items, key=lambda x: x["d"], reverse=True):
        if it["u"] in seen:
            continue
        seen.add(it["u"]); txt = it["t"] + " " + it["x"]
        it["pl"] = sorted({c for rx, cs in rules if rx.search(txt) for c in cs})[:12]
        it["pa"] = [k for k, rx in parties.items() if rx.search(txt)]
        it["tp"] = [k for k, rx in topics.items() if rx.search(txt)]
        out.append(it)
    data = {"built": datetime.date.today().isoformat(), "sources": "GOV.UK news stories (Open Government Licence v3.0); UK Parliament written statements and bills (Open Parliament Licence v3.0). Tags are added by Atlas's keyword rules.",
            "topics": list(TOPICS), "items": out[:400]}
    with open(os.path.join(ROOT, "data", "news.js"), "w", encoding="utf-8") as fh:
        fh.write("// Generated by pipeline/fetch_news.py. Do not edit by hand.\nwindow.ATLAS_NEWS = ")
        json.dump(data, fh, ensure_ascii=False, separators=(",", ":"))
        fh.write(";\n")
    print("news:", len(out), "items; with a place tag:", sum(1 for x in out if x["pl"]), "; sources:", {s.split(" ·")[0] for s in (x["s"] for x in out)})


if __name__ == "__main__":
    main()
