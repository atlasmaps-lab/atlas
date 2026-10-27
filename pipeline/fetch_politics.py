"""
Atlas 1.2: fetch the history of council control and council leaders from Wikipedia.
    python3 pipeline/fetch_politics.py
Writes sources/council_control_history.csv and sources/council_leaders_history.csv.

How: each council's GSS code (e.g. E08000025) is looked up on Wikidata (property P836) to find its Wikipedia
article. The script reads the "Political control" and "Leadership" tables from that article, or from the council
article it links to. Uses curl, because some Python installs on macOS lack web certificates.
Years in the control tables are election years, so a change with no exact date is dated 1 May of that year.
"""
import csv, json, os, re, subprocess, time, urllib.parse

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "sources")
UA = "AtlasMap/1.2 (student geography project; https://github.com)"
MON = {m: i + 1 for i, m in enumerate("January February March April May June July August September October November December".split())}
PARTY_RE = r"\{\{\s*[Pp]arty name with colou?r\s*\|([^}|]+)[^}]*\}\}"


def get(url, query=None, accept="application/json"):
    cmd = ["curl", "-s", "-m", "90", "-A", UA, "-H", "Accept: " + accept]
    if query:
        cmd += ["--data-urlencode", "query=" + query]
    return subprocess.run(cmd + [url], capture_output=True, text=True).stdout


def norm_party(p):
    """Wikipedia party name -> Atlas party key"""
    l = p.strip().lower()
    if "no overall" in l: return "noc"
    if l.startswith("aberdeen labour"): return "oth"   # expelled Labour group, not the Labour Party
    if "labour" in l and "democratic labour" not in l: return "lab"
    if "conservative" in l: return "con"
    if "liberal democrat" in l: return "ld"
    if "liberal" in l or "sdp" in l or "social democratic" in l: return "lib"
    if "reform uk" in l: return "ref"
    if "uk independence" in l: return "ukip"
    if "green" in l: return "grn"
    if "scottish national" in l: return "snp"
    if "plaid" in l: return "pc"
    if any(w in l for w in ("independent", "residents", "ratepayer", "municipal", "non-party")): return "ind"
    return "oth"


def section(t, head):
    m = re.search(r"^(=+)\s*" + head + r"\s*\1\s*$", t, re.M | re.I)
    if not m: return None
    lvl, rest = len(m.group(1)), t[m.end():]
    n = re.search(r"^={2,%d}[^=].*?=+\s*$" % lvl, rest, re.M)
    return rest[:n.start()] if n else rest


def clean(s):
    s = re.sub(r"<ref[^>]*/>", "", s)
    s = re.sub(r"<ref.*?</ref>", "", s, flags=re.S)
    return re.sub(r"<ref[^>]*>.*", "", s)


def date_of(txt):
    m = re.search(r"(?:(\d{1,2})\s+)?(January|February|March|April|May|June|July|August|September|October|November|December)?\s*(\d{4})", txt)
    if not m: return None
    mo = MON.get(m.group(2), 5)
    d = int(m.group(1) or 1) if m.group(2) else 1
    return "%04d-%02d-%02d" % (int(m.group(3)), mo, d)


def table_rows(sec):
    for t in re.findall(r"\{\|.*?\n\|\}", clean(sec), re.S):
        yield from re.split(r"\n\|-[^\n]*", t)[1:]


def control_rows(sec):
    out = []
    for r in table_rows(sec):
        m = re.search(PARTY_RE, r)
        if not m: continue
        y = re.search(r"((?:\d{1,2}\s+)?(?:[A-Z][a-z]+\s+)?\d{4})\s*[–\-—]\s*((?:\d{1,2}\s+)?(?:[A-Z][a-z]+\s+)?(?:\d{4}|\d{2})|present)", r[m.end():])
        if not y: continue
        b = y.group(2)
        if b != "present" and re.fullmatch(r"\d{2}", b):
            b = y.group(1)[-4:-2] + b
        out.append([norm_party(m.group(1)), m.group(1).strip(), date_of(y.group(1)), None if b == "present" else date_of(b)])
    return sorted(out, key=lambda x: x[2])


def leader_rows(sec):
    out = []
    for r in table_rows(sec or ""):
        m = re.search(PARTY_RE, r)
        if not m: continue
        pre = re.sub(r"\[\[(?:[^\]|]*\|)?([^\]]*)\]\]", r"\1", r[:m.start()])   # [[link|text]] -> text first, so "|" only splits cells
        cells = []
        for c in re.split(r"\|\||\n[|!]", pre):
            c = c.split("|")[-1]   # drop cell attributes such as rowspan=2 | or style="..." |
            c = re.sub(r"'''?|\{\{[^}]*\}\}|<[^>]+>", "", c).strip(" !|\n")
            if re.search(r"[A-Za-z]", c) and not re.match(r"(style|rowspan|colspan|bgcolor|align)\b", c): cells.append(c)
        if not cells: continue
        nm = cells[0]   # the councillor comes first; later cells can be a ward or a note
        ds = re.findall(r"((?:\d{1,2}\s+)?(?:January|February|March|April|May|June|July|August|September|October|November|December)?\s*\d{4}|present)", r[m.end():])
        if not ds or not nm or len(nm) > 60 or not date_of(ds[0]): continue
        out.append([norm_party(m.group(1)), nm, date_of(ds[0]), None if len(ds) < 2 or ds[1] == "present" else date_of(ds[1])])
    return sorted(out, key=lambda x: x[2])


def main():
    names = {r["code"]: r["name"] for r in csv.DictReader(open(os.path.join(SRC, "council_politics.csv"), encoding="utf-8-sig"))}
    vals = " ".join('"%s"' % c for c in names)
    q = "SELECT ?code ?art WHERE { VALUES ?code {%s} ?item wdt:P836 ?code . ?art schema:about ?item ; schema:isPartOf <https://en.wikipedia.org/> . }" % vals
    arts = {}
    for b in json.loads(get("https://query.wikidata.org/sparql", q, "application/sparql-results+json"))["results"]["bindings"]:
        arts.setdefault(b["code"]["value"], []).append(urllib.parse.unquote(b["art"]["value"].split("/wiki/")[1]).replace("_", " "))
    cache = {}

    def fetch(titles):
        titles = [t for t in dict.fromkeys(titles) if t not in cache]
        for i in range(0, len(titles), 40):
            chunk = titles[i:i + 40]
            for k in range(6):
                u = "https://en.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&redirects=1&prop=revisions&rvprop=content&rvslots=main&titles=" + urllib.parse.quote("|".join(chunk))
                try:
                    j = json.loads(get(u)); j["query"]; break
                except Exception:
                    time.sleep(5 + 10 * k)
            else:
                print("Wikipedia did not answer for:", chunk[:3], "..."); continue
            norm = {n["from"]: n["to"] for n in j["query"].get("normalized", [])}
            red = {n["from"]: n["to"] for n in j["query"].get("redirects", [])}
            pages = {p["title"]: p for p in j["query"]["pages"]}
            for t in chunk:
                f = red.get(norm.get(t, t), norm.get(t, t))
                p = pages.get(f, {})
                cache[t] = (f, p["revisions"][0]["slots"]["main"]["content"] if "revisions" in p else None)
            time.sleep(1.5)

    found = {}
    pending = {c: arts.get(c, []) + [names[c] + s for s in (" Council", " City Council", " Borough Council", " District Council")] for c in names}
    for _ in range(3):
        fetch([t for l in pending.values() for t in l])
        nxt = {}
        for c, l in pending.items():
            links = []
            for t in l:
                title, text = cache.get(t, (None, None))
                if not text: continue
                s = section(text, "Political control")
                if s and re.search(r"\d{4}\s*[–-]", s):
                    found[c] = (title, s, section(text, "Leadership")); break
                links += [x for x in re.findall(r"\[\[([^\]|#]*(?:Council|Comhairle)[^\]|#]*)", text)[:5] if "election" not in x.lower()]
            else:
                if links: nxt[c] = list(dict.fromkeys(links))[:6]
        pending = nxt

    with open(os.path.join(SRC, "council_control_history.csv"), "w", newline="") as fh:
        w = csv.writer(fh); w.writerow(["code", "party", "party_as_written", "start", "end", "wikipedia_article"])
        for c in names:
            if c in found:
                for r in control_rows(found[c][1]): w.writerow([c] + r + [found[c][0]])
    with open(os.path.join(SRC, "council_leaders_history.csv"), "w", newline="") as fh:
        w = csv.writer(fh); w.writerow(["code", "party", "leader", "start", "end", "wikipedia_article"])
        for c in names:
            if c in found:
                for r in leader_rows(found[c][2]): w.writerow([c] + r + [found[c][0]])
    print(f"Control history for {len(found)} of {len(names)} councils. Missing:", ", ".join(names[c] for c in names if c not in found))


if __name__ == "__main__":
    main()
