"""
Atlas 1.8: notable protests in the UK since 1974, from Wikipedia and Wikidata, checked to be in the UK.
    python3 pipeline/fetch_protests.py          (needs internet; uses curl)
Writes sources/protests_wikipedia.csv (one row per event) and sources/protests_log.json (every decision, for
pipeline/reports/validation_protests.md, written by build_protests.py).

1. Candidates: articles in UK protest, riot, strike and demonstration categories, articles that use a protest infobox and
   mention a UK place, and a short hand list of notable events the searches miss (SEEDS), all checked the same way.
2. From each article's infobox: dates, places, causes, organisers and sides, crowd estimates with who made them (police,
   organisers, media) where it says, and the result. From the Wikipedia REST summary: the first one or two sentences.
3. Country check (1.8): an event is kept only if Wikidata says it happened in the UK (country P17 = Q145), or a place it
   names resolves to a Wikidata item in the UK whose coordinates fall inside the UK's boundaries (not just a box).
   Every place is resolved through its Wikidata item, so London (Ontario), Perth (Australia), Boston (Massachusetts) and
   the like can't land in the UK. Every ambiguous name is logged with how it was resolved.
4. International events with a UK part (the 15 February 2003 Iraq War protests, the 2017 Women's March, global climate
   strikes): only UK sites the article itself names as protest sites are kept, labelled "UK part of an international
   protest". A crowd figure is kept only if the article gives one for the UK place; the global figure is never used.
5. Places that are only a region, county or country get no point: the event counts for the nation instead.
Crowd sizes are the estimates Wikipedia reports; both ends of a range are kept. Missing fields are left out, not guessed.
"""
import csv, json, math, os, re, subprocess, sys, time, urllib.parse

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "sources", "protests_wikipedia.csv")
LOG = os.path.join(HERE, "sources", "protests_log.json")
UA = "AtlasMap/1.8 (student geography project; contact via github.com/atlasmaps-lab)"
sys.path.insert(0, HERE)
from build import polys, inside, bbox
UK_Q = "Q145"
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


# notable events the category crawl and searches miss; they go through exactly the same checks as everything else
SEEDS = ["15 February 2003 Iraq War protests", "2017 Women's March", "September 2019 climate strikes", "Million Mask March", "George Floyd protests in the United Kingdom",
         "Gaza war protests in the United Kingdom", "United Kingdom anti-immigration protests (2025–present)", "Wapping dispute", "Grunwick dispute", "Winter of Discontent",
         "Broadwater Farm riot", "Strangeways Prison riot", "2009 G20 London summit protests", "1995 Brixton riot", "2011 United Kingdom public sector strikes",
         "Poll tax riots", "2010 United Kingdom student protests", "2011 London anti-cuts protest", "Occupy London"]
# articles about something other than a protest (a killing, an attack, a fire) even when riots followed: those have their own articles
NOT_PROTEST = re.compile(r"^(death|murder|killing|stabbing|shooting|assassination|attempted murder) of\b|\bstabbings?$|\battacks?$|\bbombings?$|\bmassacre$|\bfire$|\bpageant$|\bfeud$|^timeline of\b", re.I)
AMBIGUOUS = {"london", "birmingham", "perth", "boston", "cambridge", "richmond", "halifax", "hamilton", "newcastle", "manchester", "bangor", "newport", "reading",
             "kingston", "plymouth", "aberdeen", "dover", "lincoln", "portsmouth", "windsor", "durham", "derby", "brighton", "york", "oxford", "bristol", "salisbury"}
FOREIGN = re.compile(r"^\s*,?\s*(ontario|alabama|massachusetts|western australia|australia|nova scotia|new south wales|virginia|new zealand|connecticut|new hampshire|texas|tasmania|maine|ohio|canada|united states|u\.s\.|usa|jamaica|ireland)", re.I)
PROTEST_WORDS = re.compile(r"protest|demonstrat|rall(?:y|ies|ied)|\bmarch(?:ed|es|ers|ing)?\b|gather|vigil|picket|sit-in|occup|\bstrike|\briot|blockad", re.I)
BROAD_KIND = re.compile(r"\b(county|region|country|constituent country|province|state|lieutenancy area|historic|traditional)\b", re.I)
LOCAL_KIND = re.compile(r"\b(unitary authority|council area|principal area|district|borough|city|town|village|suburb|neighbourhood|square|street|road|park|hamlet|civil parish|ward|area of|building|camp|base|estate|prison|stadium|university|airport|port|bridge)\b", re.I)

CACHE = os.path.join(HERE, "sources", "raw", "protests_cache")   # responses kept for a day, so a re-run doesn't start again


def say(*a): print(time.strftime("%H:%M:%S"), *a, file=sys.stderr, flush=True)


def get_json(url, tries=4):
    import hashlib
    os.makedirs(CACHE, exist_ok=True)
    f = os.path.join(CACHE, hashlib.sha1(url.encode()).hexdigest() + ".json")
    if os.path.exists(f) and time.time() - os.path.getmtime(f) < 86400:
        try: return json.load(open(f))
        except Exception: pass
    for k in range(tries):
        if len(url) > 7000: say("URL too long, skipped:", url[:120]); return {}
        time.sleep(max(0, get_json.last + 0.6 - time.time())); get_json.last = time.time()   # one request at a time, at most about two a second
        out = subprocess.run(["curl", "-s", "-m", "60", "-A", UA, url], capture_output=True, text=True).stdout
        if "too many requests" in out.lower():   # Wikimedia asks us to slow down: wait, longer each time
            say(f"rate limited: waiting {30 * (k + 1)} s"); time.sleep(30 * (k + 1)); continue
        try:
            j = json.loads(out)
            if isinstance(j, dict) and "error" in j: say("API error:", str(j["error"])[:160]); return j
            json.dump(j, open(f, "w")); return j
        except Exception:
            say(f"retry {k + 1} ({out[:80]!r}) for {url[:120]}"); time.sleep(2 + 3 * k)
    return {}
get_json.last = 0.0


def api(params, host="en.wikipedia.org"):
    return get_json(f"https://{host}/w/api.php?" + urllib.parse.urlencode(dict(params, format="json", formatversion=2, maxlag=5)), 8)


def candidates():
    seen, titles, queue = set(), set(SEEDS), [(c, 0) for c in CATEGORIES]
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


def crowd_list(text):
    """'750,000 (police estimate); 2 million (organisers)' -> [[750000, 750000, 'police'], [2000000, 2000000, 'organisers']]"""
    raw = strip_refs(text or "")
    out = []
    for seg in re.split(r"<br\s*/?>|\n\*|;|\n", raw):
        lo, hi, _ = sizes(seg)
        if lo is None: continue
        s = plain(seg).lower()
        typ = "police" if "police" in s else "organisers" if re.search(r"organi[sz]er|organi[sz]ation|campaigner|claimed by|according to the (?:march|protest)", s) else "media" if re.search(r"\bmedia\b|press|bbc|newspaper|guardian|times|reported", s) else ""
        out.append([lo, hi, typ])
    return out

def parse(title, page):
    text = page["text"]
    m = INFOBOX.search(text)
    first = ANY_INFOBOX.search(text)
    if NOT_PROTEST.search(title):
        return {"protest_like": False, "why": "not a protest article (a killing, attack, fire or timeline; protests that followed have their own articles)"}
    if first and not (m and m.start() == first.start()):   # the article is about something else (a person, an attack, an organisation)
        return {"protest_like": False, "why": f"not a protest article (its infobox is “{first.group(1).strip()}”)"}
    box = fields(template(text, m.start())) if m else {}
    ld = lead(text)
    a, b = dates(box.get("date") or box.get("dates") or box.get("start_date") or "")
    loc_raw = " ".join(strip_refs(box.get(k, "")) for k in ("location", "place", "venue", "city", "locations"))
    efn = re.findall(r"\{\{efn[^{}]*\|([^{}]*)\}\}", box.get("location", ""), re.I)  # locations hidden in footnotes
    links = [l.split("|")[0].strip() for l in re.findall(r"\[\[([^\]]+)\]\]", loc_raw + " " + " ".join(efn))]
    links = [l for l in links if not re.match(r"(file|image|category):", l, re.I)]
    size_raw = " ".join(box.get(k, "") for k in ("how_many1", "howmany1", "participants", "number", "attendance", "how_many", "howmany", "people"))
    lo, hi, stext = sizes(size_raw)
    crowd = crowd_list(size_raw) if lo is not None else []
    uk_titled = re.search(r"united kingdom|\buk\b|britain|british|england|english|scotland|scottish|wales|welsh|northern ireland|london|" + "|".join(re.escape(CITY_ALIASES.get(c, c).lower()) for c in CITIES), (title + " " + box.get("location", "")).lower())
    if lo is None:
        for sent in re.split(r"(?<=[.!?])\s+", ld):   # prefer a sentence that names a UK place
            if any(re.search(r"\b" + re.escape(CITY_ALIASES.get(c, c)) + r"\b", sent) for c in CITIES):
                lo, hi, stext = lead_sizes(sent)
                if lo is not None: crowd = [[lo, hi, ""]]; break
    if lo is None and uk_titled:
        lo, hi, stext = lead_sizes(ld)
        if lo is not None: crowd = [[lo, hi, ""]]
    if not a:   # no infobox date: take the first date in the opening paragraph, then the year in the title
        a, b = dates(ld[:400])
    if not a:
        mt = re.search(r"\b(19[7-9]\d|20[0-2]\d)\b", title)
        if mt: a = mt.group(1) + "-01-01"
    # places named in the opening paragraph, used when the infobox names none (e.g. "marches in London"); a name followed
    # by a foreign qualifier ("Cambridge, Massachusetts") is not a UK place
    named, skipped = [], []
    for c in CITIES:
        short = CITY_ALIASES.get(c, c)
        for mm in re.finditer(r"\b" + re.escape(short) + r"\b", ld):
            if FOREIGN.match(ld[mm.end():mm.end() + 30]): skipped.append(short + ld[mm.end():mm.end() + 24].split(".")[0]); continue
            named.append(c); break
    cause_text = plain(" ; ".join(box.get(k, "") for k in ("causes", "cause", "goals", "motive", "theme", "type")))
    side = plain(" ; ".join(box.get(k, "") for k in ("side1", "organisers", "organizers", "organiser", "organizer", "parties", "participants", "lead_figures1", "leadfigures1", "organised_by", "organized_by")))
    involved = sorted({k for k, pat in PARTIES if re.search(pat, side.lower())})
    cat = classify(" ".join([ld[:600], " ".join(page["cats"])]), title + " " + cause_text)
    outcome = plain(" ; ".join(box.get(k, "") for k in ("result", "outcome", "concessions", "results")))[:300]
    scope = []
    tl = (title + " " + box.get("location", "") + " " + ld[:500]).lower()
    if re.search(r"united kingdom|\buk\b|nationwide|across britain|great britain", tl): scope.append("K02000001")
    for k, w in (("E92000001", "england"), ("S92000003", "scotland"), ("W92000004", "wales"), ("N92000002", "northern ireland")):
        if re.search(r"\b" + w + r"\b", tl): scope.append(k)
    worldwide = bool(re.search(r"worldwide|global|international|around the world|countries|cities around", (plain(loc_raw) + " " + title).lower()))
    plain_all = plain(re.sub(r"\{\{(?:[^{}]|\{\{[^{}]*\}\})*\}\}", "", text))
    protest_like = bool(m and m.group(1).lower() in ("civil conflict", "protest", "strike", "riot", "demonstration")) or \
        any(re.search(r"protest|riot|strike|demonstration|march|occupation|disorder|hunger strike|blockade", c, re.I) for c in page["cats"])
    return {"scope": scope, "title": title, "start": a, "end": b, "size_low": lo, "size_high": hi, "size_text": stext, "crowd": crowd, "cause_category": cat,
            "causes": cause_text[:300], "organisers": side[:300], "parties": " ".join(involved), "links": links, "named": named, "foreign_named": skipped,
            "coord": page["coord"], "qid": page["qid"], "outcome": outcome, "worldwide": worldwide, "plain": plain_all, "lead": ld,
            "protest_like": protest_like, "why": "" if protest_like else "no protest infobox or protest category"}


# ---------- places: every name goes through its Wikidata item ----------
def wd_entities(qids, props="claims|labels"):
    out = {}
    qids = [q for q in dict.fromkeys(qids) if q]
    for i in range(0, len(qids), 50):
        j = api(dict(action="wbgetentities", ids="|".join(qids[i:i + 50]), props=props, languages="en"), host="www.wikidata.org")
        out.update(j.get("entities", {}))
        time.sleep(0.4)
    return out


def claim_ids(e, p): return [c["mainsnak"].get("datavalue", {}).get("value", {}).get("id") for c in e.get("claims", {}).get(p, []) if c["mainsnak"].get("datavalue")]


def label(e): return e.get("labels", {}).get("en", {}).get("value", "")


def resolve(titles):
    """linked titles -> {link: {title, qid, lat, lon, country: [qid], kinds: [label], label}} through enwiki pageprops and Wikidata"""
    titles = list(dict.fromkeys(t for t in titles if t))
    page = {}
    for i in range(0, len(titles), 50):
        j = api(dict(action="query", titles="|".join(titles[i:i + 50]), prop="coordinates|pageprops", ppprop="wikibase_item|disambiguation", redirects=1, colimit="max"))
        q = j.get("query", {}); red = {r["from"]: r["to"] for r in q.get("normalized", []) + q.get("redirects", [])}
        pg = {p["title"]: p for p in q.get("pages", [])}
        for t in titles[i:i + 50]:
            f = red.get(red.get(t, t), red.get(t, t)); p = pg.get(f)
            if p and "pageid" in p:
                c = (p.get("coordinates") or [{}])[0]
                page[t] = {"title": f, "qid": p.get("pageprops", {}).get("wikibase_item"), "lat": c.get("lat"), "lon": c.get("lon"), "disambig": "disambiguation" in p.get("pageprops", {})}
        time.sleep(0.5)
    ents = wd_entities([v["qid"] for v in page.values()])
    kinds = wd_entities({k for e in ents.values() for k in claim_ids(e, "P31")} | {k for e in ents.values() for k in claim_ids(e, "P17")}, props="labels")
    for t, v in page.items():
        e = ents.get(v["qid"] or "", {})
        v["country"] = claim_ids(e, "P17"); v["kinds"] = [label(kinds.get(k, {})) for k in claim_ids(e, "P31")]
        v["country_names"] = [label(kinds.get(k, {})) or k for k in v["country"]]; v["label"] = label(e) or v["title"]
        if v["lat"] is None:
            xy = e.get("claims", {}).get("P625", [{}])[0].get("mainsnak", {}).get("datavalue", {}).get("value") if e.get("claims", {}).get("P625") else None
            if xy: v["lat"], v["lon"] = xy["latitude"], xy["longitude"]
    return page


class UKShape:
    """the UK's four nations as polygons (pipeline/geometry/nations.geojson): a point must fall inside, not just inside a box"""
    def __init__(self):
        g = json.load(open(os.path.join(HERE, "geometry", "nations.geojson")))
        self.f = [(f["properties"]["code"], bbox(f["geometry"]), f["geometry"]) for f in g["features"]]
    def nation(self, lat, lon):
        if lat is None or lon is None: return None
        for code, b, geom in self.f:
            if b[0] <= lon <= b[2] and b[1] <= lat <= b[3] and any(inside([lon, lat], p[0]) for p in polys(geom)): return code
        return None


def sentences_with(text, name):
    """sentences of the article that name the place and describe a protest there"""
    out = []
    for s in re.split(r"(?<=[.!?])\s+", text):
        if re.search(r"\b" + re.escape(name) + r"\b", s) and PROTEST_WORDS.search(s) and not FOREIGN.match(s[s.find(name) + len(name):][:30]): out.append(s.strip())
    return out


def summaries(titles):
    out = {}
    for t in titles:
        j = get_json("https://en.wikipedia.org/api/rest_v1/page/summary/" + urllib.parse.quote(t.replace(" ", "_"), safe=""))
        ex = (j.get("extract") or "").strip()
        if ex:
            ss = re.split(r"(?<=[.!?])\s+(?=[A-Z])", ex)
            out[t] = " ".join(ss[:2]) if len(" ".join(ss[:2])) <= 360 else ss[0]
        time.sleep(0.15)
    return out


def haversine(a, b):
    t = math.pi / 180; dl = (b[0] - a[0]) * t; dn = (b[1] - a[1]) * t
    h = math.sin(dl / 2) ** 2 + math.cos(a[0] * t) * math.cos(b[0] * t) * math.sin(dn / 2) ** 2
    return 2 * 6371.0 * math.asin(math.sqrt(h))


def main():
    uk = UKShape()
    log = {"retrieved": time.strftime("%Y-%m-%d"), "dropped": [], "sites_removed": [], "ambiguous": [], "international": [], "no_point": [], "seeds_missing": []}
    before = {}
    if os.path.exists(OUT):   # the previous file, to report sites moved or removed
        for r in csv.DictReader(open(OUT, encoding="utf-8")):
            before[r["title"]] = [s[:3] for s in json.loads(r["sites"])]
    titles = candidates(); say(len(titles), "candidate articles")
    pg = pages(titles); say(len(pg), "fetched")
    log["seeds_missing"] = [s for s in SEEDS if s not in pg]
    evs = []
    for t, p in pg.items():
        e = parse(t, p)
        if e.get("protest_like"): evs.append(e)
        elif any(w in t.lower() for w in ("protest", "riot", "march", "strike", "demonstration", "unrest")) or t in SEEDS:   # worth saying why a protest-sounding article went
            log["dropped"].append({"title": t, "reason": e["why"]})
    say(len(evs), "protest-like"); wd = wd_entities([e["qid"] for e in evs]); say("wikidata done")
    ev_country = {q: claim_ids(x, "P17") for q, x in wd.items()}
    places = resolve([l for e in evs for l in e["links"] + e["named"]]); say(len(places), "places resolved")
    cnames = wd_entities({c for v in ev_country.values() for c in v}, props="labels")
    rows = []
    for e in evs:
        w = wd.get(e["qid"] or "", {})
        cl = w.get("claims", {})
        val = lambda p: cl[p][0]["mainsnak"].get("datavalue", {}).get("value") if p in cl else None
        n, t0, t1 = val("P1132"), val("P580") or val("P585"), val("P582")
        if not e["start"] and isinstance(t0, dict): e["start"] = t0["time"][1:11].replace("-00", "-01")
        if not e["end"] and isinstance(t1, dict): e["end"] = t1["time"][1:11].replace("-00", "-01")
        if not e["start"] or not ("1974-01-01" <= e["start"] <= time.strftime("%Y-%m-%d")):
            log["dropped"].append({"title": e["title"], "reason": f"date outside 1974 to today ({e['start'] or 'no date found'})"}); continue
        countries = ev_country.get(e["qid"] or "", [])
        intl = (bool(countries) and UK_Q not in countries) or len(set(countries)) > 1 or e["worldwide"]
        sites, broad_nations = [], set()
        cand = [("link", l) for l in e["links"]] + ([("named", l) for l in e["named"][:8]] if not e["links"] or intl else [])
        for how, l in cand:
            v = places.get(l)
            base = l.split(",")[0].split("(")[0].strip().lower()
            if not v or v["lat"] is None:
                if v is None and how == "link": log["sites_removed"].append({"event": e["title"], "site": l, "reason": "no Wikipedia article or coordinates for this place"})
                continue
            nat = uk.nation(v["lat"], v["lon"])
            in_uk = UK_Q in v["country"] and nat is not None
            if base in AMBIGUOUS or v["title"].split(",")[0].split("(")[0].strip().lower() in AMBIGUOUS or v.get("disambig"):
                log["ambiguous"].append({"event": e["title"], "name": l, "resolved_to": v["title"], "wikidata": v["qid"], "country": ", ".join(v["country_names"]) or "none",
                                         "decision": "kept: UK item inside the UK" if in_uk else "removed: not in the UK" if not v.get("disambig") else "removed: disambiguation page"})
            if not in_uk:
                log["sites_removed"].append({"event": e["title"], "site": l, "reason": f"not in the UK ({', '.join(v['country_names']) or 'no country on Wikidata'}; resolved to {v['title']})" if UK_Q not in v["country"] else f"coordinates outside the UK's boundaries ({v['lat']:.3f}, {v['lon']:.3f})"}); continue
            kinds = " ".join(v["kinds"])
            if l.lower() in TOO_BROAD or v["title"].lower() in TOO_BROAD or (BROAD_KIND.search(kinds) and not LOCAL_KIND.search(kinds)):
                broad_nations.add(nat); log["no_point"].append({"event": e["title"], "site": v["title"], "reason": f"too broad to place ({kinds or 'region or country'}): counts for {nat}"}); continue
            if intl:   # an international event: keep a UK site only where the article describes a protest there
                ev_s = sentences_with(e["plain"], v["title"].split(",")[0].split("(")[0].strip()) or sentences_with(e["plain"], l.split(",")[0].split("(")[0].strip())
                if not ev_s:
                    log["sites_removed"].append({"event": e["title"], "site": v["title"], "reason": "international event: the article names this place but doesn't describe a protest there"}); continue
                v = dict(v, evidence=ev_s[0][:240])
            sites.append([v["title"], round(v["lat"], 4), round(v["lon"], 4), v["qid"] or "", v.get("evidence", "")])
        own = e["coord"] if e["coord"].get("lat") else None
        if own and not sites and not intl and uk.nation(own["lat"], own["lon"]):
            sites.append([e["title"], round(own["lat"], 4), round(own["lon"], 4), e["qid"] or "", ""])
        seen = set(); sites = [s for s in sites if not (s[0] in seen or seen.add(s[0]))]
        scope = sorted(set(e["scope"]) | ({n for n in broad_nations if n} if not sites else set()))
        if intl and not sites:
            cn = ", ".join(label(cnames.get(c, {})) or c for c in countries) or "several countries"
            log["dropped"].append({"title": e["title"], "reason": f"not in the UK (Wikidata country: {cn}; no UK protest site named in the article)"}); continue
        if countries and UK_Q not in countries and not sites:
            log["dropped"].append({"title": e["title"], "reason": "not in the UK (Wikidata country is not the UK)"}); continue
        if not sites and not scope:
            log["dropped"].append({"title": e["title"], "reason": "no place in the UK could be named"}); continue
        lo, hi, stext, crowd, note = e["size_low"], e["size_high"], e["size_text"], e["crowd"], ""
        if intl:   # never put a global crowd figure on a UK point
            lo = hi = None; crowd = []; stext = ""
            for s in sites:
                if s[4]:
                    a, b, t = lead_sizes(s[4])
                    if a is not None: lo, hi, stext, crowd = a, b, "UK figure from the article: “" + s[4][:150] + "”", [[a, b, ""]]; break
            note = "UK part of an international protest." + ("" if lo else " The source's crowd figure is for the whole international protest, so none is shown for the UK.")
            log["international"].append({"event": e["title"], "uk_sites": [s[0] for s in sites], "crowd": stext or "none (global figure only)"})
        if lo is None and isinstance(n, dict) and "amount" in n and not intl:
            lo = hi = int(float(n["amount"])); stext = "Wikidata: number of participants"; crowd = [[lo, hi, "Wikidata"]]
        rows.append({"title": e["title"], "start": e["start"], "end": e["end"] or "", "size_low": lo or "", "size_high": hi or "", "size_text": stext, "crowd": json.dumps(crowd),
                     "size_note": note, "cause_category": e["cause_category"], "causes": e["causes"], "organisers": e["organisers"], "parties": e["parties"],
                     "sites": json.dumps([s[:4] for s in sites], ensure_ascii=False), "url": "https://en.wikipedia.org/wiki/" + urllib.parse.quote(e["title"].replace(" ", "_")),
                     "wikidata": e["qid"] or "", "nationwide": "" if sites else " ".join(scope), "international": "1" if intl else "", "summary": "", "outcome": e["outcome"]})
    say(len(rows), "rows; fetching summaries"); sm = summaries([r["title"] for r in rows])
    for r in rows: r["summary"] = sm.get(r["title"], "")
    rows.sort(key=lambda r: (r["start"], r["title"]))
    fields_out = ["title", "start", "end", "size_low", "size_high", "size_text", "crowd", "size_note", "cause_category", "causes", "organisers", "parties", "sites", "url", "wikidata", "nationwide", "international", "summary", "outcome"]
    with open(OUT, "w", newline="", encoding="utf-8") as fh:
        wr = csv.DictWriter(fh, fieldnames=fields_out); wr.writeheader(); wr.writerows(rows)
    # what changed since the previous file: events gone, sites removed or moved by more than 1 km
    now = {r["title"]: json.loads(r["sites"]) for r in rows}
    log["changes"] = {"events_gone": sorted(t for t in before if t not in now), "events_new": sorted(t for t in now if t not in before), "sites_gone": [], "sites_moved": []}
    for t, old_sites in before.items():
        if t not in now: continue
        new = {s[0]: s for s in now[t]}
        for s in old_sites:
            if s[0] not in new: log["changes"]["sites_gone"].append({"event": t, "site": s[0]})
            elif haversine(s[1:3], new[s[0]][1:3]) > 1: log["changes"]["sites_moved"].append({"event": t, "site": s[0], "km": round(haversine(s[1:3], new[s[0]][1:3]), 1)})
    json.dump(log, open(LOG, "w"), indent=1, ensure_ascii=False)
    print(f"{len(rows)} UK protests since 1974 written to {OUT}; dropped {len(log['dropped'])}, sites removed {len(log['sites_removed'])}, ambiguous names {len(log['ambiguous'])}, international {len(log['international'])}")
    try:
        import manifest
        manifest.record("protests_wikipedia.csv", "Wikipedia contributors; Wikidata", "Notable UK protests since 1974: infoboxes, lead summaries and Wikidata items",
                        "https://en.wikipedia.org/ (MediaWiki API, REST summary endpoint) and https://www.wikidata.org/", "CC BY-SA 4.0 (Wikipedia text); CC0 (Wikidata)",
                        f"{len(rows)} events, UK, 1974-{time.strftime('%Y')}", "Built by pipeline/fetch_protests.py; every decision in protests_log.json")
    except Exception as x:
        print("manifest not updated:", x)


if __name__ == "__main__":
    main()
