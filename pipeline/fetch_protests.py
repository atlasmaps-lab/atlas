"""
Atlas 1.3: notable protests in the UK since 1974, from Wikipedia and Wikidata.
    python3 pipeline/fetch_protests.py          (needs internet; uses curl)
Writes sources/protests_wikipedia.csv, one row per event.

1. Candidates: articles in UK protest, riot, strike and demonstration categories, plus articles that use a protest
   infobox ("Infobox civil conflict", "Infobox protest", ...) and mention a UK place.
2. From each article's infobox: dates, places, causes, goals, organisers and sides, and crowd size ("how many").
3. Every place linked in the location field is looked up for coordinates, so an event in several towns becomes
   several sites (e.g. the 2024 riots). Countries ("United Kingdom", "England") are too broad to place and are left out.
4. Wikidata fills in crowd size (P1132) and dates where the infobox has none.
5. Only events from 1974 onwards with at least one site inside the UK are kept. Nationwide events that name no town
   ("protests across the UK") are kept without a point and counted for the UK and the nation instead.
Crowd sizes are the estimates Wikipedia reports (often organisers' and police figures); both ends of a range are kept.
"""
import csv, json, os, re, subprocess, time, urllib.parse

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "sources", "protests_wikipedia.csv")
UA = "AtlasMap/1.3 (student geography project)"
CATEGORIES = ["Category:Protests in the United Kingdom", "Category:Riots and civil disorder in the United Kingdom",
              "Category:Labour disputes in the United Kingdom", "Category:Protest marches in the United Kingdom",
              "Category:Strikes in the United Kingdom", "Category:Protests in London"]
SKIP_CAT = ("people", "organisations", "organizations", "activists", "songs", "films", "books", "works", "groups", "protesters",
            "musicians", "images", "media", "in fiction", "novels", "albums", "hooligan", "martyrs", "tax resisters", "case law",
            "peasants", "peterloo", "19th-century", "18th-century", "17th-century", "16th-century", "red clydeside", "tithe", "rebecca")
SEARCHES = ['intitle:protest "United Kingdom"', 'intitle:protests London', 'intitle:march London protest', 'intitle:riot England', 'intitle:riots "United Kingdom"',
            'intitle:strike "United Kingdom"', 'intitle:demonstration London', 'intitle:protest Scotland', 'intitle:protest Wales', 'intitle:protest Belfast',
            'hastemplate:"Infobox civil conflict" "United Kingdom"', 'hastemplate:"Infobox civil conflict" London', 'hastemplate:"Infobox civil conflict" England',
            'hastemplate:"Infobox civil conflict" Scotland', 'hastemplate:"Infobox civil conflict" Wales', 'hastemplate:"Infobox civil conflict" "Northern Ireland"',
            'hastemplate:"Infobox civil conflict" Manchester OR Birmingham OR Glasgow OR Liverpool OR Leeds OR Bristol OR Cardiff OR Belfast OR Edinburgh',
            'hastemplate:"Infobox protest" "United Kingdom"', 'hastemplate:"Infobox event" protest London', 'hastemplate:"Infobox event" march London protest']
TOO_BROAD = {"united kingdom", "great britain", "britain", "england", "scotland", "wales", "northern ireland", "british isles", "ireland",
             "europe", "uk", "worldwide", "united states", "the united kingdom", "england and wales",
             # regions and metropolitan counties: their centre point would land in an arbitrary council
             "greater london", "west midlands (region)", "west midlands", "east midlands", "merseyside", "greater manchester", "west yorkshire",
             "south yorkshire", "tyne and wear", "yorkshire", "south wales", "north wales", "north east england", "north west england",
             "south east england", "south west england", "east of england", "yorkshire and the humber", "south london", "north london",
             "east london", "west london", "home counties", "the midlands", "midlands", "northern england", "southern england", "central belt"}
ANY_INFOBOX = re.compile(r"\{\{\s*Infobox ([^|\n}]+)", re.I)
CITIES = ["London", "Birmingham", "Manchester", "Liverpool", "Leeds", "Sheffield", "Bristol", "Newcastle upon Tyne", "Nottingham", "Leicester", "Glasgow", "Edinburgh",
          "Cardiff", "Belfast", "Derry", "Aberdeen", "Dundee", "Swansea", "Coventry", "Bradford", "Kingston upon Hull", "Plymouth", "Southampton", "Portsmouth", "Brighton",
          "Oxford", "Cambridge", "York", "Norwich", "Exeter", "Sunderland", "Middlesbrough", "Stoke-on-Trent", "Wolverhampton", "Preston", "Blackburn", "Bolton", "Oldham",
          "Rochdale", "Luton", "Reading, Berkshire", "Milton Keynes", "Northampton", "Derby", "Southport", "Rotherham", "Doncaster", "Barnsley", "Wakefield", "Huddersfield",
          "Ipswich", "Bath, Somerset", "Canterbury", "Dover", "Lincoln, England", "Carlisle, Cumbria", "Inverness", "Stirling", "Newport, Wales", "Wrexham", "Bangor, Gwynedd",
          "Lisburn", "Newry", "Armagh", "Tottenham", "Brixton", "Toxteth", "Handsworth, West Midlands", "Trafalgar Square", "Hyde Park, London", "Downing Street",
          "Parliament Square", "Whitehall", "Greenham Common", "Faslane", "Orgreave", "Wapping", "Hartlepool", "Tamworth", "Burnley", "Leigh, Greater Manchester", "Knowsley"]
CITY_ALIASES = {"Newcastle upon Tyne": "Newcastle", "Kingston upon Hull": "Hull", "Reading, Berkshire": "Reading", "Bath, Somerset": "Bath", "Lincoln, England": "Lincoln",
                "Carlisle, Cumbria": "Carlisle", "Newport, Wales": "Newport", "Bangor, Gwynedd": "Bangor", "Handsworth, West Midlands": "Handsworth", "Hyde Park, London": "Hyde Park",
                "Leigh, Greater Manchester": "Leigh"}
INFOBOX = re.compile(r"\{\{\s*Infobox (civil conflict|protest|event|historical event|news event|strike|riot|demonstration)\b", re.I)
MON = {m: i + 1 for i, m in enumerate("january february march april may june july august september october november december".split())}


def api(params, host="en.wikipedia.org"):
    u = f"https://{host}/w/api.php?" + urllib.parse.urlencode(dict(params, format="json", formatversion=2))
    for k in range(6):
        out = subprocess.run(["curl", "-s", "-m", "90", "-A", UA, u], capture_output=True, text=True).stdout
        try: return json.loads(out)
        except Exception: time.sleep(3 + 5 * k)
    return {}


def candidates():
    seen, titles, queue = set(), set(), [(c, 0) for c in CATEGORIES]
    while queue:
        cat, d = queue.pop(0)
        if cat in seen: continue
        seen.add(cat); cont = {}
        while True:
            j = api(dict(action="query", list="categorymembers", cmtitle=cat, cmlimit=500, cmtype="page|subcat", **cont))
            for m in j.get("query", {}).get("categorymembers", []):
                if m["ns"] == 14 and d < 3 and not any(s in m["title"].lower() for s in SKIP_CAT): queue.append((m["title"], d + 1))
                elif m["ns"] == 0: titles.add(m["title"])
            if "continue" not in j: break
            cont = {"cmcontinue": j["continue"]["cmcontinue"]}
    for q in SEARCHES:
        off = 0
        while off < 1000:
            j = api(dict(action="query", list="search", srsearch=q, srlimit=500, sroffset=off, srprop=""))
            titles.update(s["title"] for s in j.get("query", {}).get("search", []))
            if "continue" not in j: break
            off = j["continue"]["sroffset"]
    return sorted(titles)


def pages(titles):
    out = {}
    for i in range(0, len(titles), 40):
        j = api(dict(action="query", titles="|".join(titles[i:i + 40]), prop="revisions|coordinates|pageprops|categories", rvprop="content",
                     rvslots="main", ppprop="wikibase_item", cllimit="max", colimit="max", redirects=1))
        for p in j.get("query", {}).get("pages", []):
            if "revisions" in p:
                out[p["title"]] = {"text": p["revisions"][0]["slots"]["main"]["content"], "coord": (p.get("coordinates") or [{}])[0],
                                   "qid": p.get("pageprops", {}).get("wikibase_item"), "cats": [c["title"][9:] for c in p.get("categories", [])]}
        time.sleep(1)
    return out


# ---------- infobox parsing ----------
def template(text, start):
    """the full {{...}} starting at start, respecting nesting"""
    depth, i = 0, start
    while i < len(text) - 1:
        if text.startswith("{{", i): depth += 1; i += 2; continue
        if text.startswith("}}", i):
            depth -= 1; i += 2
            if depth == 0: return text[start:i]
            continue
        i += 1
    return text[start:]


def fields(box):
    body = box[2:-2]
    parts, depth, cur, i = [], 0, "", 0
    while i < len(body):
        two = body[i:i + 2]
        if two in ("{{", "[["): depth += 1; cur += two; i += 2; continue
        if two in ("}}", "]]"): depth -= 1; cur += two; i += 2; continue
        if body[i] == "|" and depth == 0: parts.append(cur); cur = ""; i += 1; continue
        cur += body[i]; i += 1
    parts.append(cur)
    out = {}
    for p in parts[1:]:
        if "=" in p:
            k, v = p.split("=", 1)
            out[k.strip().lower().replace(" ", "_")] = v.strip()
    return out


def strip_refs(s):
    s = re.sub(r"<ref[^>]*/>", "", s); s = re.sub(r"<ref.*?</ref>", "", s, flags=re.S)
    s = re.sub(r"\{\{efn[^{}]*(\{\{[^{}]*\}\}[^{}]*)*\}\}", "", s, flags=re.I)
    return re.sub(r"<!--.*?-->", "", s, flags=re.S)


def plain(s):
    s = strip_refs(s)
    s = re.sub(r"\[\[(?:[^\]|]*\|)?([^\]]*)\]\]", r"\1", s)
    s = re.sub(r"\{\{(?:flagicon|flag icon|flagdeco|flagcountry)[^}]*\}\}", "", s, flags=re.I)
    s = re.sub(r"\{\{(?:plainlist|flatlist|unbulleted list|ubl|hlist|bulleted list|ublist)\s*\|?", "", s, flags=re.I)
    s = re.sub(r"\{\{[^{}|]*\|([^{}]*)\}\}", r"\1", s)
    s = re.sub(r"<br\s*/?>|\n\*|\|", "; ", s); s = re.sub(r"<[^>]+>|'''?|\{\{|\}\}", "", s)
    return re.sub(r"\s*;\s*(;\s*)*", "; ", s).strip(" ;*\n")


def dates(s):
    """-> (start, end) as YYYY-MM-DD, from templates or text"""
    s = strip_refs(s or "")
    m = re.search(r"\{\{\s*(?:start and end dates|start date|start-date|end date|dts|date)\s*\|\s*(\d{4})\s*\|?\s*(\d{1,2})?\s*\|?\s*(\d{1,2})?(?:\s*\|\s*(\d{4})\s*\|?\s*(\d{1,2})?\s*\|?\s*(\d{1,2})?)?", s, re.I)
    if m:
        a = "%s-%02d-%02d" % (m.group(1), int(m.group(2) or 1), int(m.group(3) or 1))
        b = "%s-%02d-%02d" % (m.group(4), int(m.group(5) or 1), int(m.group(6) or 1)) if m.group(4) else None
        return a, b
    t = plain(s)
    found = []
    for mm in re.finditer(r"(?:(\d{1,2})\s+)?(january|february|march|april|may|june|july|august|september|october|november|december)?\s*(\d{1,2})?,?\s*(\d{4})", t, re.I):
        y = int(mm.group(4))
        if not 1900 < y < 2100: continue
        mo = MON.get((mm.group(2) or "").lower(), 0)
        d = int(mm.group(1) or mm.group(3) or 1) if mo else 1
        found.append("%04d-%02d-%02d" % (y, mo or 1, min(d, 28) if d > 31 else d))
    m3 = re.match(r"\s*(\d{1,2})\s*[–-]\s*\d{1,2}\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})", t, re.I)
    if m3 and found:
        found.insert(0, "%s-%02d-%02d" % (m3.group(3), MON[m3.group(2).lower()], int(m3.group(1))))
    # "30 July – 5 August 2024": a day-month with no year before a full date
    m2 = re.match(r"\s*(\d{1,2})\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s*[–-]", t, re.I)
    if m2 and found:
        found.insert(0, "%s-%02d-%02d" % (found[0][:4], MON[m2.group(2).lower()], int(m2.group(1))))
    if not found: return None, None
    return found[0], (found[-1] if len(found) > 1 and found[-1] != found[0] else None)


def lead(text):
    """the article's opening paragraphs as plain text"""
    t = re.sub(r"\{\{(?:[^{}]|\{\{[^{}]*\}\})*\}\}", "", text)  # drop templates (incl. the infobox)
    t = t.split("\n==", 1)[0]
    return plain(re.sub(r"\[\[(?:File|Image|Category):[^\]]*\]\]", "", t))[:3000]


def lead_sizes(t):
    """'an estimated 750,000 people', 'between 100,000 and 1 million protesters'"""
    num = r"(\d[\d,\.]*\s*(?:million|thousand)?)"
    m = re.search(r"(?:between|from)\s+" + num + r"\s+(?:and|to)\s+" + num + r"\s+(?:people|protesters|protestors|demonstrators|marchers|participants|strikers|workers|rioters)", t, re.I)
    if m: return sizes(m.group(1) + " " + m.group(2))
    for m in re.finditer(num + r"\s*(?:[–-]\s*" + num + r")?\s+(?:people|protesters|protestors|demonstrators|marchers|participants|strikers|workers|rioters|attendees|took part)", t, re.I):
        after = t[m.end():m.end() + 40].lower()
        if re.match(r"\s*(?:were|had been|have been|was)?\s*(?:arrested|charged|killed|injured|detained|died|dead|convicted|hurt|hospitali)", after): continue  # arrests and casualties are not crowds
        return sizes(m.group(0))
    return None, None, ""


WORDS = {"hundreds": (100, 999), "thousands": (1000, 9999), "tens of thousands": (10000, 99999), "hundreds of thousands": (100000, 999999), "millions": (1000000, 3000000)}


def sizes(s):
    """crowd estimate -> (low, high, text)"""
    t = plain(s or "")
    if not t: return None, None, ""
    nums = []
    for m in re.finditer(r"(\d[\d,\.]*)\s*(million|m\b|thousand|k\b)?", t, re.I):
        raw = m.group(1).replace(",", "")
        try: v = float(raw)
        except ValueError: continue
        u = (m.group(2) or "").lower()
        if u in ("million", "m"): v *= 1e6
        elif u in ("thousand", "k"): v *= 1e3
        if 10 <= v <= 5e6 and not (1900 <= v <= 2100 and "," not in m.group(1)): nums.append(v)
    for w, (lo, hi) in sorted(WORDS.items(), key=lambda x: -len(x[0])):
        if re.search(r"\b" + w + r"\b", t, re.I) and not nums: nums += [lo, hi]; break
    if not nums: return None, None, t[:120]
    return int(min(nums)), int(max(nums)), t[:160]


CAUSES = [  # (category, keywords) — checked in order; the first match wins
    ("War, foreign affairs & diaspora", r"\bwar\b|iraq|afghan|gaza|palestin|israel|ukraine|nuclear|\bcnd\b|stop the war|trident|peace|military|arms|syria|libya|ceasefire|bomb|romania|iran|armenia|hong kong|china|chinese|tamil|sri lank|kurd|sikh|khalistan|india|pakistan|bangladesh|eritrea|belarus|russia|tibet|apartheid|south africa|chile|turkey|venezuela|consulate|embassy"),
    ("Climate & environment", r"climate|extinction rebellion|just stop oil|insulate|environment|fracking|road protest|anti-road|bypass|airport|runway|oil|coal|deforest|greenpeace|nature|motorway|hs2|pollution|animal|hunt|badger"),
    ("Work, pay & strikes", r"strike|union|pay\b|wage|pension|miners|dockers|nurses|doctors|teachers|labour dispute|industrial action|lockout|redundanc|jobs|workers|tuc\b|rmt\b|unite\b"),
    ("Race, religion & immigration", r"racis|race riot|anti-racis|black lives|george floyd|immigra|asylum|migrant|refugee|islam|muslim|far-right|far right|fascis|edl|english defence|national front|bnp|britain first|southport|sectarian|religio|blasphem|satanic verses|rushdie"),
    ("Brexit & Europe", r"brexit|european union|\beu\b|people's vote|remain|leave means|referendum on|march for europe"),
    ("Economy, cuts & cost of living", r"austerity|cuts|poll tax|community charge|cost of living|tax|fuel|price|benefit|universal credit|bedroom|energy bill|housing|rent|eviction|poverty|bank|occupy|capitalis|g20|g8|globalis|unemploy|deprivation|inequality"),
    ("Policing, justice & civil rights", r"police|custody|kill the bill|sarah everard|stop and search|justice|civil rights|civil liberties|internment|bloody sunday|prison|hunger strike|surveillance|protest act|public order"),
    ("Education & students", r"student|tuition|fees|university|school|education|grant"),
    ("Health & COVID", r"\bnhs\b|hospital|health|covid|lockdown|vaccin|abortion|pandemic|mask"),
    ("Rights & equality", r"women|feminis|suffrag|lgbt|gay|lesbian|transgender|trans |pride|disab|equal|section 28|reclaim the night|marriage"),
    ("Constitution, monarchy & government", r"monarch|republic|coronation|king|queen|independence|scottish independence|union flag|flag protest|democracy|election|electoral|government|parliament|trump|devolution|irish|loyalist|unionist|nationalis|orange order|parade"),
    ("Sport & other", r"football|sport|fans|celebration|carnival"),
]
PARTIES = [  # (party key, pattern) — parties named among organisers, sides or lead figures
    ("lab", r"labour party|\blabour\b(?! dispute| movement)|momentum"), ("con", r"conservative|tory|tories"), ("ld", r"liberal democrat"),
    ("grn", r"green party|scottish greens"), ("snp", r"scottish national party|\bsnp\b"), ("pc", r"plaid cymru"),
    ("ref", r"reform uk|brexit party"), ("ukip", r"uk independence party|\bukip\b"), ("sf", r"sinn f[eé]in"), ("dup", r"democratic unionist|\bdup\b"),
    ("uup", r"ulster unionist party|\buup\b"), ("sdlp", r"social democratic and labour|\bsdlp\b"), ("swp", r"socialist workers party|\bswp\b"),
    ("cpb", r"communist party"), ("far", r"british national party|\bbnp\b|national front|britain first|patriotic alternative"), ("resp", r"respect party|workers party of britain"),
]


def classify(text, strong=""):
    """score every cause: words in the title and stated causes count three times, words in the opening paragraph once"""
    t, st = text.lower(), strong.lower()
    best, top = "Other", 0
    for cat, pat in CAUSES:
        sc = 3 * len(re.findall(pat, st)) + len(re.findall(pat, t))
        if sc > top: best, top = cat, sc
    return best


def parse(title, page):
    text = page["text"]
    m = INFOBOX.search(text)
    first = ANY_INFOBOX.search(text)
    if first and not (m and m.start() == first.start()):   # the article is about something else (a person, an attack, an organisation)
        return {"protest_like": False}
    box = fields(template(text, m.start())) if m else {}
    ld = lead(text)
    a, b = dates(box.get("date") or box.get("dates") or box.get("start_date") or "")
    loc_raw = " ".join(strip_refs(box.get(k, "")) for k in ("location", "place", "venue", "city", "locations"))
    efn = re.findall(r"\{\{efn[^{}]*\|([^{}]*)\}\}", box.get("location", ""), re.I)  # locations hidden in footnotes
    links = [l.split("|")[0].strip() for l in re.findall(r"\[\[([^\]]+)\]\]", loc_raw + " " + " ".join(efn))]
    lo, hi, stext = sizes(" ".join(box.get(k, "") for k in ("how_many1", "howmany1", "participants", "number", "attendance", "how_many", "howmany", "people")))
    uk_titled = re.search(r"united kingdom|\buk\b|britain|british|england|english|scotland|scottish|wales|welsh|northern ireland|london|" + "|".join(re.escape(CITY_ALIASES.get(c, c).lower()) for c in CITIES), (title + " " + box.get("location", "")).lower())
    if lo is None:
        for sent in re.split(r"(?<=[.!?])\s+", ld):   # prefer a sentence that names a UK place
            if any(re.search(r"\b" + re.escape(CITY_ALIASES.get(c, c)) + r"\b", sent) for c in CITIES):
                lo, hi, stext = lead_sizes(sent)
                if lo is not None: break
    if lo is None and uk_titled: lo, hi, stext = lead_sizes(ld)
    if not a:   # no infobox date: take the first date in the opening paragraph, then the year in the title
        a, b = dates(ld[:400])
    if not a:
        mt = re.search(r"\b(19[7-9]\d|20[0-2]\d)\b", title)
        if mt: a = mt.group(1) + "-01-01"
    # places named in the opening paragraph, used when the infobox names none (e.g. "marches in London")
    named = [c for c in CITIES if re.search(r"\b" + re.escape(CITY_ALIASES.get(c, c)) + r"\b", ld)]
    cause_text = plain(" ; ".join(box.get(k, "") for k in ("causes", "cause", "goals", "motive", "theme", "type")))
    side = plain(" ; ".join(box.get(k, "") for k in ("side1", "organisers", "organizers", "organiser", "organizer", "parties", "participants", "lead_figures1", "leadfigures1", "organised_by", "organized_by")))
    involved = sorted({k for k, pat in PARTIES if re.search(pat, side.lower())})
    cat = classify(" ".join([ld[:600], " ".join(page["cats"])]), title + " " + cause_text)
    scope = []
    tl = (title + " " + box.get("location", "") + " " + ld[:500]).lower()
    if re.search(r"united kingdom|\buk\b|nationwide|across britain|great britain", tl): scope.append("K02000001")
    for k, w in (("E92000001", "england"), ("S92000003", "scotland"), ("W92000004", "wales"), ("N92000002", "northern ireland")):
        if re.search(r"\b" + w + r"\b", tl): scope.append(k)
    return {"scope": scope, "title": title, "start": a, "end": b, "size_low": lo, "size_high": hi, "size_text": stext, "cause_category": cat, "causes": cause_text[:300],
            "organisers": side[:300], "parties": " ".join(involved), "links": links, "named": named, "coord": page["coord"], "qid": page["qid"],
            "protest_like": bool(m and m.group(1).lower() in ("civil conflict", "protest", "strike", "riot", "demonstration")) or
            any(re.search(r"protest|riot|strike|demonstration|march|occupation|disorder|hunger strike|blockade", c, re.I) for c in page["cats"])}


def coords_for(titles):
    out = {}
    titles = [t for t in dict.fromkeys(titles) if t.lower() not in TOO_BROAD]
    for i in range(0, len(titles), 50):
        j = api(dict(action="query", titles="|".join(titles[i:i + 50]), prop="coordinates", redirects=1, colimit="max"))
        q = j.get("query", {}); red = {r["from"]: r["to"] for r in q.get("redirects", []) + q.get("normalized", [])}
        cs = {p["title"]: p["coordinates"][0] for p in q.get("pages", []) if p.get("coordinates")}
        for t in titles[i:i + 50]:
            f = red.get(red.get(t, t), red.get(t, t))
            if f.lower() not in TOO_BROAD and f in cs: out[t] = (f, cs[f]["lat"], cs[f]["lon"])
        time.sleep(0.5)
    return out


def wikidata(qids):
    out = {}
    qids = [q for q in qids if q]
    for i in range(0, len(qids), 50):
        j = api(dict(action="wbgetentities", ids="|".join(qids[i:i + 50]), props="claims"), host="www.wikidata.org")
        for q, e in j.get("entities", {}).items():
            c = e.get("claims", {})
            val = lambda p: c[p][0]["mainsnak"].get("datavalue", {}).get("value") if p in c else None
            n = val("P1132"); t = val("P585") or val("P580"); xy = val("P625")
            out[q] = {"participants": float(n["amount"]) if isinstance(n, dict) and "amount" in n else None,
                      "date": t["time"][1:11].replace("-00", "-01") if isinstance(t, dict) else None,
                      "coord": (xy["latitude"], xy["longitude"]) if isinstance(xy, dict) else None}
        time.sleep(0.5)
    return out


def in_uk(lat, lon): return 49.8 <= lat <= 61.0 and -8.7 <= lon <= 1.9


def main():
    titles = candidates(); print(len(titles), "candidate articles")
    pg = pages(titles); print(len(pg), "fetched")
    evs = [parse(t, p) for t, p in pg.items()]
    evs = [e for e in evs if e.get("protest_like")]
    wd = wikidata([e["qid"] for e in evs])
    places = coords_for([l for e in evs for l in e["links"] + e["named"]])
    rows = []
    for e in evs:
        w = wd.get(e["qid"], {})
        if not e["start"] and w.get("date"): e["start"] = w["date"]
        if e["size_high"] is None and w.get("participants"): e["size_low"] = e["size_high"] = int(w["participants"]); e["size_text"] = "Wikidata: number of participants"
        if not e["start"] or not ("1974-01-01" <= e["start"] <= "2026-12-31"): continue
        sites = []
        for l in e["links"]:
            if l in places and in_uk(places[l][1], places[l][2]): sites.append([places[l][0], round(places[l][1], 4), round(places[l][2], 4)])
        if not sites:
            for l in e["named"][:6]:
                if l in places and in_uk(places[l][1], places[l][2]): sites.append([places[l][0], round(places[l][1], 4), round(places[l][2], 4)])
        own = e["coord"] if e["coord"].get("lat") else ({"lat": w["coord"][0], "lon": w["coord"][1]} if w.get("coord") else None)
        if own and in_uk(own["lat"], own["lon"]) and not sites: sites.append([e["title"], round(own["lat"], 4), round(own["lon"], 4)])
        sites = [s for i, s in enumerate(sites) if s[0] not in [x[0] for x in sites[:i]]]
        if not sites and not e["scope"]: continue   # nowhere in the UK can be named
        rows.append([e["title"], e["start"], e["end"] or "", e["size_low"] or "", e["size_high"] or "", e["size_text"], e["cause_category"], e["causes"],
                     e["organisers"], e["parties"], json.dumps(sites, ensure_ascii=False), "https://en.wikipedia.org/wiki/" + urllib.parse.quote(e["title"].replace(" ", "_")), e["qid"] or "",
                     "" if sites else " ".join(e["scope"])])
    rows.sort(key=lambda r: r[1])
    with open(OUT, "w", newline="") as fh:
        w = csv.writer(fh); w.writerow(["title", "start", "end", "size_low", "size_high", "size_text", "cause_category", "causes", "organisers", "parties", "sites", "url", "wikidata", "nationwide"])
        w.writerows(rows)
    print(f"{len(rows)} UK protests since 1974 written to {OUT}")


if __name__ == "__main__":
    main()
