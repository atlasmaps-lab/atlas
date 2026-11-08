"""
Atlas 0.8: money in politics -> data/money.js (always loaded) and data/money_detail.js (loaded when asked for)
Standard library (curl for downloads).   python3 pipeline/build_money.py [--offline]

Sources, all republishable with attribution (recorded in pipeline/sources/MANIFEST.csv):
  Electoral Commission, political finance database: donations to parties (central and local accounting units) and to
    regulated donees (MPs, members associations, candidates), and loans; every donation the law requires to be reported
    since 2001. https://search.electoralcommission.org.uk (CSV export).                                   OGL v3.0
  House of Commons, Register of Members' Financial Interests (interests-api.parliament.uk): employment and earnings,
    donations, gifts and hospitality, visits, land, shareholdings, family members, for the current Parliament.  OPL v3.0
  Find a Tender (Cabinet Office): public contracts awarded since 2024, with suppliers' Companies House numbers
    (pipeline/fetch_contracts.py).                                                                          OGL v3.0
  postcodes.io (ONS Postcode Directory, OS data): council and constituency of organisation donors' postcodes.  OGL v3.0
  Atlas's own constituency history (pipeline/sources/constituency_history.json: MPs and their Parliament ids).

Joins (every one counted in pipeline/reports/validation_money.md):
  party      Electoral Commission party name -> Atlas party key (hand table below)
  MP         donee name (titles removed) + the date -> the MP holding a seat then (constituency history)
  local unit accounting unit name ("Wimbledon CLP", "Broadland and Fakenham") -> constituency of that name in use at
             the date, else a council of that name; otherwise left as "not placed"
  company    Companies House number -> contracts won (Find a Tender), and -> FTSE 100 companies by name ("possible")
Wording rule: Atlas says what was registered ("registered a donation of"), never more.
"""
import csv, datetime, io, json, math, os, re, subprocess, sys, time, zipfile
from collections import defaultdict, Counter
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
import manifest

RAW = os.path.join(HERE, "sources", "raw", "money"); os.makedirs(RAW, exist_ok=True)
UA = "Mozilla/5.0 (compatible; AtlasMaps/0.8; +https://github.com/atlasmaps-lab/atlas)"
EC = "https://search.electoralcommission.org.uk/api/csv/"
ECQ = "query=&sort=AcceptedDate&order=desc&date=Accepted&from=2001-01-01&to=&prePoll=false&postPoll=true&register=gb&register=ni&register=none"
FILES = {
    "ec_donations_parties.csv": (EC + "Donations?" + ECQ + "&et=pp", "Electoral Commission", "Donations to political parties (all accounting units), 2001 to date", manifest.OGL),
    "ec_donations_donees.csv": (EC + "Donations?" + ECQ + "&et=rd", "Electoral Commission", "Donations to regulated donees (MPs, members associations, candidates), 2001 to date", manifest.OGL),
    "ec_loans.csv": (EC + "Loans?query=&sort=StartDate&order=desc&et=pp&et=rd&register=gb&register=ni&register=none", "Electoral Commission", "Loans to parties and regulated donees", manifest.OGL),
    "rmfi.zip": ("https://interests-api.parliament.uk/api/v1/Interests/csv", "House of Commons", "Register of Members' Financial Interests (current Parliament), all categories", manifest.OPL),
}
PARTY = [   # Electoral Commission party name -> Atlas key (and the name Atlas shows)
    (r"^Conservative", "con"), (r"^Labour Party", "lab"), (r"^Co-operative Party", "coop"), (r"^Liberal Democrats", "ld"), (r"UK Independence Party|UKIP", "ukip"),
    (r"^Reform UK|^The Brexit Party", "ref"), (r"^Green Party|^Scottish Green", "grn"), (r"Scottish National Party", "snp"), (r"^Plaid Cymru", "pc"), (r"^Sinn F", "sf"),
    (r"^Democratic Unionist", "dup"), (r"^Ulster Unionist", "uup"), (r"^SDLP", "sdlp"), (r"^Alliance - Alliance Party", "apni"), (r"^Traditional Unionist", "tuv"), (r"^Alba Party", "alba"),
]
EXTRA_PARTIES = {"coop": ["Co-operative Party", "#3f1d70"], "sdlp": ["SDLP", "#2aa82c"], "apni": ["Alliance (NI)", "#f6cb2f"], "tuv": ["TUV", "#0c3a6a"], "alba": ["Alba", "#005eb8"]}
STATUS = {"Individual": "i", "Company": "c", "Trade Union": "u", "Unincorporated Association": "a", "Public Fund": "f", "Registered Political Party": "p", "Friendly Society": "s",
          "Trust": "t", "Limited Liability Partnership": "l", "Other": "o", "Impermissible Donor": "x", "Unidentifiable Donor": "x", "Building Society": "s"}
TITLES = r"\b(rt\.? hon\.?|the|sir|dame|dr|mr|mrs|ms|miss|lord|lady|baroness|baron|professor|prof|mp|msp|ms|ma|kc|qc|obe|mbe|cbe|kbe|dbe|pc|frs|fcis)\b\.?"


def fetch(offline):
    for f, (url, pub, title, lic) in FILES.items():
        p = os.path.join(RAW, f)
        if offline and os.path.exists(p): continue
        subprocess.run(["curl", "-sSL", "-m", "900", "-A", UA, "-o", p, url], check=True); time.sleep(2)
        manifest.record("raw/money/" + f, pub, title, url, lic, "UK, 2001 to date" if f.startswith("ec") else "UK, current Parliament", "for data/money.js (pipeline/build_money.py)")


def meetings(offline):
    """Ministers' meetings with outside organisations, from each department's quarterly transparency release on GOV.UK
    (since July 2024). Files are cached in raw/money/meetings/. Returns rows: [date, minister, department, organisation, purpose]."""
    import urllib.parse
    mdir = os.path.join(RAW, "meetings"); os.makedirs(mdir, exist_ok=True)
    idx_p = os.path.join(mdir, "index.json")
    if not offline or not os.path.exists(idx_p):
        pubs = {}
        for q in ['"gifts, hospitality, travel and meetings"', "ministerial meetings external organisations", "ministers meetings quarterly", "ministerial gifts hospitality travel meetings"]:
            for start in (0, 100, 200, 300):
                url = "https://www.gov.uk/api/search.json?" + urllib.parse.urlencode({"q": q, "filter_content_store_document_type": "transparency", "count": 100, "start": start, "fields": "title,link,public_timestamp"})
                try: res = json.loads(subprocess.run(["curl", "-sS", "-m", "60", "-A", UA, url], capture_output=True).stdout)["results"]
                except Exception: break
                for x in res:
                    if "meeting" in x["title"].lower() and x["public_timestamp"][:10] >= "2024-09-01": pubs[x["link"]] = x
                time.sleep(0.3)
        files = []
        for link, x in sorted(pubs.items()):
            try: j = json.loads(subprocess.run(["curl", "-sS", "-m", "60", "-A", UA, "https://www.gov.uk/api/content" + link], capture_output=True).stdout)
            except Exception: continue
            dept = ((j.get("links") or {}).get("organisations") or [{}])[0].get("title", "") or x["title"].split(":")[0]
            for a in (j.get("details") or {}).get("attachments", []):
                if "meeting" in (a.get("title") or "").lower() and (a.get("url") or "").lower().endswith(".csv"):
                    fn = re.sub(r"[^A-Za-z0-9_.-]+", "_", a["url"].rsplit("/", 1)[-1])[:120]
                    fp = os.path.join(mdir, fn)
                    if not os.path.exists(fp): subprocess.run(["curl", "-sSL", "-m", "60", "-A", UA, "-o", fp, a["url"]]); time.sleep(0.2)
                    files.append({"file": fn, "dept": dept, "title": a.get("title"), "url": a["url"], "pub": x["public_timestamp"][:10]})
            time.sleep(0.2)
        json.dump(files, open(idx_p, "w"), indent=0)
        manifest.record("raw/money/meetings/index.json", "GOV.UK (government departments)", "Ministers' meetings with external organisations (quarterly transparency releases)", "https://www.gov.uk/search/transparency-and-freedom-of-information-releases", manifest.OGL, "UK government, since July 2024", f"{len(files)} CSV files, one per department and quarter")
    out = []
    for f in json.load(open(idx_p)):
        fp = os.path.join(mdir, f["file"])
        if not os.path.exists(fp): continue
        raw = open(fp, "rb").read()
        for enc in ("utf-8-sig", "cp1252", "latin-1"):
            try: txt = raw.decode(enc); break
            except UnicodeDecodeError: continue
        rows = list(csv.reader(io.StringIO(txt)))
        hi = next((i for i, r in enumerate(rows[:12]) if any("organisation" in (c or "").lower() for c in r)), None)
        if hi is None: continue
        H = [(c or "").lower() for c in rows[hi]]
        col = lambda *ks: next((i for i, h in enumerate(H) if any(k in h for k in ks)), None)
        cm, cd, co, cp = col("minister"), col("date"), col("organisation", "name of"), col("purpose")
        last_min = ""
        for r in rows[hi + 1:]:
            if co is None or len(r) <= co or not (r[co] or "").strip(): continue
            mn = (r[cm] if cm is not None and cm < len(r) else "").strip() or last_min; last_min = mn
            d = (r[cd] if cd is not None and cd < len(r) else "").strip()
            iso = ""
            for fmt in ("%d/%m/%Y", "%d/%m/%y", "%d-%m-%Y", "%Y-%m-%d", "%d %B %Y", "%d %b %Y", "%B %Y", "%b-%y"):
                try: iso = datetime.datetime.strptime(d[:20].strip(), fmt).date().isoformat(); break
                except ValueError: continue
            for org in re.split(r"\s*[;\n]\s*|\s*,\s*(?=[A-Z])", r[co].strip()):
                org = org.strip(" .")
                if len(org) >= 3: out.append([iso or f["pub"], mn[:80], f["dept"][:80], org[:120], (r[cp] if cp is not None and cp < len(r) else "")[:160].strip(), f["url"]])
    return out


def money(v):
    try: return float(str(v).replace("£", "").replace(",", "").strip() or 0)
    except ValueError: return 0.0


def dmy(s):
    s = (s or "").strip()
    try: return datetime.datetime.strptime(s[:10], "%d/%m/%Y").date().isoformat()
    except ValueError:
        try: return datetime.date.fromisoformat(s[:10]).isoformat()
        except ValueError: return ""


def person_key(n):
    n = re.sub(TITLES, " ", (n or "").lower().replace(".", " "))
    n = re.sub(r"[^a-z' -]", " ", n); return re.sub(r"\s+", " ", n).strip()


def place_key(n):
    n = (n or "").lower().replace("&", " and ")
    n = re.sub(r"\b(clp|constituency labour party|conservative association|conservatives?|labour party|liberal democrats?|lib dems?|local party|branch|association|cca|federation|borough|city|county|council|district)\b", " ", n)
    return re.sub(r"[^a-z]+", " ", n).strip()


def load_js(name):
    s = open(os.path.join(ROOT, "data", name), encoding="utf-8").read()
    return json.loads(s[s.index("=") + 1:].strip().rstrip(";"))


def party_of(name):
    for rx, k in PARTY:
        if re.search(rx, name): return k
    return None


def postcodes(pcs):
    """postcode -> [lon, lat, council code, 2024 constituency code], via postcodes.io (cached)"""
    cache_p = os.path.join(RAW, "postcodes.json")
    cache = json.load(open(cache_p)) if os.path.exists(cache_p) else {}
    todo = sorted({p for p in pcs if p and p not in cache})
    for i in range(0, len(todo), 100):
        body = json.dumps({"postcodes": todo[i:i + 100]})
        r = subprocess.run(["curl", "-sS", "-m", "60", "-X", "POST", "-H", "Content-Type: application/json", "-A", UA, "-d", body, "https://api.postcodes.io/postcodes"], capture_output=True)
        try:
            for x in json.loads(r.stdout)["result"]:
                res = x["result"]
                cache[x["query"]] = [round(res["longitude"], 4), round(res["latitude"], 4), res["codes"]["admin_district"], res["codes"].get("parliamentary_constituency_2024", "")] if res and res.get("longitude") else None
        except Exception as e:
            print("postcodes.io failed:", e); break
        time.sleep(0.3)
    json.dump(cache, open(cache_p, "w"))
    return cache


def main():
    offline = "--offline" in sys.argv
    fetch(offline)
    today = datetime.date.today()
    rd = lambda f: list(csv.DictReader(open(os.path.join(RAW, f), encoding="utf-8-sig")))
    pp, dn, loans = rd("ec_donations_parties.csv"), rd("ec_donations_donees.csv"), rd("ec_loans.csv")
    pol = load_js("politics.js"); pc = load_js("constituencies.js"); uk = load_js("uk-data.js")
    log = defaultdict(list); count = Counter()

    # ---------- MPs: Parliament id, name and the seats they held (constituency history) ----------
    hist = json.load(open(os.path.join(HERE, "sources", "constituency_history.json"), encoding="utf-8"))
    by_name_code = defaultdict(list)
    for code, p in pc["places"].items(): by_name_code[place_key(p["name"])].append((code, p.get("from") or "1997-05-01", p.get("to") or "9999-12-31"))
    mps, mp_by_name, seat_mp = {}, defaultdict(list), defaultdict(list)
    for c in hist["constituencies"]:
        cands = by_name_code.get(place_key(c["name"]), [])
        for mid, name, s, e in c["r"]:
            e2 = e or "9999-12-31"
            code = next((cd for cd, f, t in cands if f < e2 and t > s), None)
            m = mps.setdefault(str(mid), {"n": re.sub(r"^(Mr|Mrs|Ms|Miss|Dr|Sir|Dame|Rt Hon) ", "", name).strip(), "seats": []})
            m["seats"].append([code or "", s, e or ""])
            if code: seat_mp[code].append([s, e or "", str(mid)])
            k = re.sub(r" of [a-z ]+$", "", person_key(name)); parts = k.split()
            if parts: mp_by_name[parts[-1]].append((str(mid), s, e2, parts[0] if len(parts) > 1 else ""))
    NICK = {"edward": "ed", "matthew": "matt", "michael": "mike", "christopher": "chris", "nicholas": "nick", "thomas": "tom", "james": "jim", "stephen": "steve", "steven": "steve",
            "william": "bill", "david": "dave", "andrew": "andy", "robert": "rob", "richard": "rick", "elizabeth": "liz", "jonathan": "jon", "anthony": "tony", "kenneth": "ken", "daniel": "dan",
            "timothy": "tim", "jeremy": "jez", "alexander": "alex", "philip": "phil", "patrick": "pat", "benjamin": "ben", "samuel": "sam", "gregory": "greg", "joseph": "joe", "edwin": "ed"}
    def mp_for(name, date):
        k = person_key(name).split()
        if not k: return None
        cands = [c for c in mp_by_name.get(k[-1], []) if c[1] <= date <= c[2]]   # surname + sitting at the date (Parliament's current names: "Lord Gove", "Ed Davey")
        if len({c[0] for c in cands}) > 1 and len(k) > 1:
            f = k[0]; same = lambda g: g and (g == f or NICK.get(f) == g or NICK.get(g) == f or (len(g) == 1 and g == f[0]))
            cands = [c for c in cands if same(c[3])] or [c for c in cands if c[3] and c[3][0] == f[0]]
        ids = {c[0] for c in cands}
        return next(iter(ids)) if len(ids) == 1 else None

    # ---------- local accounting units -> constituency (at the date) or council ----------
    council_by = {place_key(p["name"]): c for c, p in uk["places"].items() if p["level"] == "council"}
    region_by = {place_key(p["name"]): c for c, p in uk["places"].items() if p["level"] in ("region", "nation")}
    region_by.update({"scottish": "S92000003", "scotland": "S92000003", "welsh": "W92000004", "wales": "W92000004", "london": "E12000007", "northern ireland": "N92000002"})
    NATIONAL = re.compile(r"parliamentary|lords|national|westminster group|assembly party|trade union liaison|head office|federal|headquarters", re.I)
    unit_cache = {}
    def unit_place(name, date):
        name = re.sub(r"^closed [^-]*-\s*", "", name.strip(), flags=re.I)   # "closed 31/12/2023 - Watford"
        name = re.sub(r"\b(local campaign forum|co-?ordinating committee|campaign forum|executive committee)\b", " ", name, flags=re.I)
        if NATIONAL.search(name): return None
        k = (place_key(name), date[:4])
        if k in unit_cache: return unit_cache[k]
        hit = next((cd for cd, f, t in by_name_code.get(k[0], []) if f <= date < t), None) or (by_name_code.get(k[0]) or [[None]])[0][0]
        if not hit: hit = council_by.get(k[0]) or next((c for n, c in council_by.items() if k[0] and len(k[0]) >= 5 and n.startswith(k[0] + " ")), None)   # "Kingston" -> Kingston upon Thames
        if not hit: hit = region_by.get(re.sub(r" labour| party| liberal| green| federation", "", k[0]).strip())
        unit_cache[k] = hit; return hit

    # ---------- donations ----------
    donors, rows = {}, []
    parties = {}
    def donor(r):
        did = r.get("DonorId") or ("n:" + person_key(r["DonorName"]))
        d = donors.get(did)
        if not d:
            ch = (r.get("CompanyRegistrationNumber") or "").strip().upper()
            if ch.isdigit(): ch = ch.zfill(8)
            d = donors[did] = {"n": re.sub(r"\s+", " ", r["DonorName"]).strip(), "st": STATUS.get(r["DonorStatus"], "o"), "ch": ch, "pc": (r.get("Postcode") or "").strip().upper(), "tot": 0.0, "y0": 9999, "y1": 0, "to": Counter()}
        return did, d
    for src, R in (("pp", pp), ("rd", dn)):
        for r in R:
            date = dmy(r["AcceptedDate"]) or dmy(r["ReceivedDate"]) or dmy(r["ReportedDate"])
            v = money(r["Value"])
            if not date or v <= 0: continue
            did, d = donor(r)
            d["tot"] += v; y = int(date[:4]); d["y0"] = min(d["y0"], y); d["y1"] = max(d["y1"], y)
            nature = "cash" if r["DonationType"] == "Cash" else (r["DonationType"] or "other").lower()
            if src == "pp":
                key = party_of(r["RegulatedEntityName"]) or "o:" + re.sub(r"\s*\[De-registered.*?\]", "", r["RegulatedEntityName"]).strip()
                unit = r["AccountingUnitName"].strip()
                central = unit in ("Central Party", "") or r["AccountingUnitsAsCentralParty"] == "True"
                place = None if central else unit_place(unit, date)
                count["party_rows"] += 1; count["local_rows"] += not central; count["local_placed"] += bool(place)
                if not central and not place: log["unit_unplaced" if not NATIONAL.search(unit) else "unit_national"].append(unit)
                count["local_national"] += (not central and bool(NATIONAL.search(unit)))
                rows.append([date, round(v), "P", key, did, unit if not central else "", place or "", nature])
                d["to"][key] += v
                P = parties.setdefault(key, {"y": defaultdict(lambda: [0.0, 0]), "donors": Counter()}); P["y"][y][0] += v; P["y"][y][1] += 1; P["donors"][did] += v
            else:
                t = r["RegulatedDoneeType"]
                if t.startswith("MP"):
                    mid = mp_for(r["RegulatedEntityName"], date)
                    count["mp_rows"] += 1; count["mp_matched"] += bool(mid)
                    if not mid: log["mp_unmatched"].append(r["RegulatedEntityName"]); continue
                    rows.append([date, round(v), "M", mid, did, "", "", nature]); d["to"]["mp:" + mid] += v
                else:
                    rows.append([date, round(v), "D", re.sub(r"\s+", " ", r["RegulatedEntityName"]).strip(), did, t, "", nature]); d["to"]["d:" + r["RegulatedEntityName"].strip()] += v
    rows.sort(key=lambda x: x[0], reverse=True)

    # ---------- loans ----------
    loan_rows = []
    for r in loans:
        v = money(r["Value"]); date = dmy(r["StartDate"])
        if v <= 0 or not date: continue
        key = party_of(r["RegulatedEntityName"]) or ("mp:" + (mp_for(r["RegulatedEntityName"], date) or "") if r["RegulatedEntityType"] != "Political Party" else "o:" + r["RegulatedEntityName"])
        loan_rows.append([date, round(v), key, re.sub(r"\s+", " ", r["LoanParticipantName"]).strip(), r["LoanStatus"], round(money(r["AmountOutstanding"])), r["RateOfInterestDescription"][:60]])
    loan_rows.sort(key=lambda x: x[0], reverse=True)

    # ---------- MPs' registered interests (current Parliament) ----------
    rm = defaultdict(lambda: defaultdict(list))
    with zipfile.ZipFile(os.path.join(RAW, "rmfi.zip")) as z:
        for name in z.namelist():
            cat = re.search(r"Category_([\d.]+)\.csv", name).group(1)
            for r in csv.DictReader(io.TextIOWrapper(z.open(name), encoding="utf-8-sig")):
                mid = r.get("MNIS ID")
                if not mid: continue
                mps.setdefault(mid, {"n": r.get("Member", ""), "seats": []})
                rm[mid][cat].append([r.get("Registered", ""), r.get("Summary", "")[:200], round(money(r.get("Value"))) if r.get("Value") else None,
                                     (r.get("DonorName") or r.get("PaymentDescription") or r.get("OrganisationName") or r.get("JobTitle") or "")[:120], r.get("Link", "").replace("interests-api.parliament.uk/api/v1/Interests/", "members.parliament.uk/member/%s/registeredinterests?interest=" % mid), (r.get("Appg") or "")[:80]])
    count["rmfi_items"] = sum(len(v) for m in rm.values() for v in m.values())

    # ---------- contracts won by company donors ----------
    contracts = defaultdict(list); cp = os.path.join(RAW, "contracts.jsonl")
    if os.path.exists(cp):
        for line in open(cp, encoding="utf-8"):
            c = json.loads(line)
            if c["ch"]: contracts[c["ch"].zfill(8) if c["ch"].isdigit() else c["ch"]].append(c)
    count["contract_awards"] = sum(len(v) for v in contracts.values())
    company_links = {}
    for did, d in donors.items():
        if d["st"] in ("c", "l") and d["ch"] and d["ch"] in contracts:
            cs = sorted(contracts[d["ch"]], key=lambda c: c["d"], reverse=True)
            company_links[did] = {"n": len(cs), "v": round(sum(c["v"] or 0 for c in cs)), "list": [[c["d"], c["buyer"][:80], round(c["v"]) if c["v"] else None, c["t"][:120], c["u"]] for c in cs[:12]]}
    count["donors_with_contracts"] = len(company_links)

    # ---------- ministers' meetings with outside organisations (the lobbying record) ----------
    meet = meetings(offline)
    orgnorm = lambda n: re.sub(r"\b(plc|limited|ltd|llp|group|holdings|the|uk|company|co|and|of)\b|[^a-z0-9]", "", (n or "").lower())
    donor_by_norm = {}
    for did, d in donors.items():
        if d["st"] in ("c", "l", "u", "a", "s", "t") and len(orgnorm(d["n"])) >= 4: donor_by_norm.setdefault(orgnorm(d["n"]), did)
    meet_by_donor, meet_by_org, minister_meets = defaultdict(list), Counter(), defaultdict(Counter)
    for m in meet:
        meet_by_org[m[3]] += 1
        did = donor_by_norm.get(orgnorm(m[3]))
        if did: meet_by_donor[did].append(m)
        mid = mp_for(m[1], m[0]) if m[1] else None
        if mid: minister_meets[mid][m[3]] += 1
    count["meetings"] = len(meet); count["meetings_with_donors"] = sum(len(v) for v in meet_by_donor.values()); count["ministers_matched"] = len(minister_meets)

    # ---------- where organisation donors are (postcodes) ----------
    org = {did: d for did, d in donors.items() if d["st"] in ("c", "l", "u", "a", "s", "t") and d["pc"] and d["tot"] >= 5000}
    pcmap = postcodes([d["pc"] for d in org.values()])
    for did, d in org.items():
        g = pcmap.get(d["pc"])
        if g: d["geo"] = g
    count["org_donors"] = len(org); count["org_located"] = sum(1 for d in org.values() if d.get("geo"))

    # ---------- FTSE 100 companies: same name (a possible link only) ----------
    mk = load_js("markets.js"); norm = lambda n: re.sub(r"\b(plc|limited|ltd|group|holdings|the|uk|international)\b|[^a-z]", "", n.lower())
    ftse = {norm(c["n"]): i for i, c in enumerate(mk["companies"]) if len(norm(c["n"])) >= 4}
    ftse_links = {}
    for did, d in donors.items():
        if d["st"] in ("c", "l") and norm(d["n"]) in ftse: ftse_links.setdefault(str(ftse[norm(d["n"])]), []).append(did)

    # ---------- summaries ----------
    keep = set()
    for k, P in parties.items(): keep.update(did for did, _ in P["donors"].most_common(25))
    keep.update(did for did, d in donors.items() if d["tot"] >= 250000 or did in company_links or did in meet_by_donor)   # the rest are in the detail file
    for l in ftse_links.values(): keep.update(l)
    D = {did: [d["n"], d["st"], d["ch"], round(d["tot"]), d["y0"], d["y1"], [k for k, _ in d["to"].most_common(4)], d.get("geo")] for did, d in donors.items() if did in keep}
    names = {k: v for k, v in pol["parties"].items()}; names.update(EXTRA_PARTIES)
    PS = {}
    for k, P in parties.items():
        tot = sum(v[0] for v in P["y"].values())
        if tot < 50000 and not k in names: continue
        PS[k] = {"n": names.get(k, [k[2:] if k.startswith("o:") else k])[0], "y": {str(y): [round(a), b] for y, (a, b) in sorted(P["y"].items())}, "top": [[did, round(v)] for did, v in P["donors"].most_common(25)]}
    seat_y, council_y = defaultdict(lambda: defaultdict(float)), defaultdict(lambda: defaultdict(float))
    for date, v, kind, key, did, unit, place, nature in rows:
        y = date[:4]
        if kind == "P" and place:
            (seat_y if place.startswith(("E14", "W07", "S14", "N06", "P")) else council_y)[place][y] += v
        if kind == "M":
            for s, e, mid in seat_mp_for(key, mps, date): seat_y[s][y] += v
    MP = {}
    for mid, m in mps.items():
        dons = [r for r in rows if r[2] == "M" and r[3] == mid]
        if not dons and mid not in rm: continue
        by = Counter(); yy = defaultdict(float)
        for r in dons: by[r[4]] += r[1]; yy[r[0][:4]] += r[1]
        cats = {c: [len(v), round(sum(x[2] or 0 for x in v))] for c, v in rm.get(mid, {}).items()}
        MP[mid] = {"n": m["n"], "seats": [s for s in m["seats"] if s[0]], "tot": round(sum(r[1] for r in dons)), "y": {k: round(v) for k, v in sorted(yy.items())}, "rm": cats}   # who gave: in the detail file
    D = {did: [d["n"], d["st"], d["ch"], round(d["tot"]), d["y0"], d["y1"], [k for k, _ in d["to"].most_common(4)], d.get("geo")] for did, d in donors.items() if did in keep}
    out = {"built": today.isoformat(), "parties": PS, "partyNames": {k: v for k, v in names.items()}, "donors": D, "mps": MP, "seatMP": {k: v for k, v in seat_mp.items()},
           "seats": {k: {y: round(v) for y, v in sorted(ys.items())} for k, ys in seat_y.items()}, "councils": {k: {y: round(v) for y, v in sorted(ys.items())} for k, ys in council_y.items()},
           "contracts": {did: {"n": c["n"], "v": c["v"]} for did, c in company_links.items()}, "ftse": ftse_links,
           "meetDonors": {did: len(v) for did, v in meet_by_donor.items()},
           "lobby": [[org, n, donor_by_norm.get(orgnorm(org), "")] for org, n in meet_by_org.most_common(150)],
           "loans": {"n": len(loan_rows), "outstanding": sum(r[5] for r in loan_rows if r[4] and "Outstanding" in r[4])},
           "status": {"i": "Individual", "c": "Company", "u": "Trade union", "a": "Unincorporated association", "f": "Public fund", "p": "Political party", "s": "Society", "t": "Trust", "l": "LLP", "o": "Other", "x": "Impermissible or unidentifiable"},
           "sources": "Electoral Commission political finance database (OGL v3.0); House of Commons Register of Members' Financial Interests (Open Parliament Licence v3.0); Find a Tender contract awards (OGL v3.0); postcodes.io / ONS Postcode Directory (OGL v3.0). Built by pipeline/build_money.py.",
           "counts": dict(count)}
    with open(os.path.join(ROOT, "data", "money.js"), "w", encoding="utf-8") as fh:
        fh.write("// Atlas 0.8: money in politics (summary). Built by pipeline/build_money.py; do not edit.\nwindow.ATLAS_MONEY = ")
        json.dump(out, fh, separators=(",", ":"), ensure_ascii=False); fh.write(";\n")
    # the detail file: every donation since 2010, every loan, every registered interest, every contract linked to a donor
    allD = {did: [d["n"], d["st"], d["ch"], round(d["tot"])] for did, d in donors.items()}
    detail = {"rows": [r for r in rows if r[0] >= "2010-01-01"], "donors": allD, "loans": loan_rows, "interests": {mid: dict(v) for mid, v in rm.items()},
              "contracts": {did: c["list"] for did, c in company_links.items()},
              "meetings": {did: sorted(v, reverse=True)[:30] for did, v in meet_by_donor.items()},
              "ministerMeetings": {mid: c.most_common(40) for mid, c in minister_meets.items()},
              "rmCats": {"1": "Employment and earnings", "1.1": "Employment: ad hoc payments", "1.2": "Employment: ongoing", "2": "Donations and other support", "3": "Gifts, benefits and hospitality (UK)", "4": "Visits outside the UK", "5": "Gifts and benefits from outside the UK", "6": "Land and property", "7": "Shareholdings", "8": "Miscellaneous", "9": "Family members employed", "10": "Family members engaged in lobbying"}}
    with open(os.path.join(ROOT, "data", "money_detail.js"), "w", encoding="utf-8") as fh:
        fh.write("// Atlas 0.8: money in politics (detail, loaded on demand). Built by pipeline/build_money.py; do not edit.\nwindow.ATLAS_MONEY_DETAIL = ")
        json.dump(detail, fh, separators=(",", ":"), ensure_ascii=False); fh.write(";\nwindow.dispatchEvent && window.dispatchEvent(new Event('atlas-money-detail'));\n")
    report(count, log, out, detail, today)
    print(f"money: {len(rows)} donations ({count['local_placed']}/{count['local_rows']} local units placed, {count['mp_matched']}/{count['mp_rows']} MP donations matched), {len(MP)} MPs, {len(D)} donors in the summary, {len(company_links)} donors with contracts")


def seat_mp_for(mid, mps, date):
    return [(code, s, e) for code, s, e in mps.get(mid, {}).get("seats", []) if code and s <= date and (not e or date < e)]


def report(count, log, out, detail, today):
    pct = lambda a, b: f"{100 * a / b:.1f}%" if b else "—"
    um = Counter(log["unit_unplaced"]).most_common(25); mm = Counter(log["mp_unmatched"]).most_common(25)
    md = f"""# Validation: money in politics (Atlas 0.8)

Written by `pipeline/build_money.py` on {today}.

## Summary
- **{len(detail['rows']):,} donations since 2010** in the detail file ({count['party_rows']:,} to parties since 2001 in all).
- **Local party units placed on the map:** {count['local_placed']:,} of {count['local_rows']:,} donations ({pct(count['local_placed'], count['local_rows'])}), matched by name to a constituency in use at the date, a council, or a nation or region (Scottish Labour, London). {count['local_national']:,} more went to national bodies that aren't places (parliamentary parties, trade union liaison), so they count for the party only. Most of the rest are units covering several seats ("Twickenham and Richmond").
- **Donations to MPs matched to an MP:** {count['mp_matched']:,} of {count['mp_rows']:,} ({pct(count['mp_matched'], count['mp_rows'])}), by name (titles removed) and the dates they held a seat.
- **Registered interests:** {count['rmfi_items']:,} items for {len(detail['interests'])} MPs (current Parliament).
- **Contracts:** {count['contract_awards']:,} supplier awards with a Companies House number; {count['donors_with_contracts']} company donors have won at least one.
- **Organisation donors located** (postcode, £5,000 or more given): {count['org_located']:,} of {count['org_donors']:,}.
- FTSE 100 companies with a donor of the same name (a possible link, shown as such): {len(out['ftse'])}.
- **Ministers' meetings** with outside organisations (GOV.UK quarterly releases since July 2024): {count['meetings']:,} organisation-meetings read; {count['meetings_with_donors']:,} were with an organisation that is also a registered donor (same name); ministers matched to their MP card: {count['ministers_matched']}. Departments publish in different layouts and some quarters are missing or late; Atlas reads what is published.

## Local units not placed (most donations first)
{chr(10).join(f"- {n} ({c})" for n, c in um) or "None."}

## MP names not matched (most donations first)
{chr(10).join(f"- {n} ({c})" for n, c in mm) or "None."}
"""
    with open(os.path.join(HERE, "reports", "validation_money.md"), "w", encoding="utf-8") as fh: fh.write(md)


if __name__ == "__main__":
    main()
