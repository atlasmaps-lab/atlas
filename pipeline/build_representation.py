"""
Atlas 0.8.2: who represents whom -> data/representation.js   (python3 pipeline/build_representation.py [--offline])
Standard library (curl).

  UK Parliament Members API (Open Parliament Licence): every Commons member's gender, matched to the MPs named in
    data/constituencies.js (all boundary sets since 1997) by name.
  Wikipedia, "List of ethnic minority politicians in the United Kingdom", Members of Parliament table (CC BY-SA; it cites
    the House of Commons Library): the names of MPs from ethnic minority backgrounds. Atlas keeps only a yes/no flag per
    name and publishes it only as totals for regions, nations and the UK, never per MP or per seat.
  Census 2021 (ONS, Nomis TS021, OGL): usual residents and those not in a White ethnic group, for English regions, England,
    Wales and England and Wales; and TS008 for the share of residents who are female. Scotland's and Northern Ireland's
    censuses are separate and not joined yet.
"""
import csv, io, json, os, re, subprocess, sys, time, unicodedata
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
import manifest

RAW = os.path.join(HERE, "sources", "raw", "representation"); os.makedirs(RAW, exist_ok=True)
UA = "AtlasMaps/0.8 (+https://github.com/atlasmaps-lab/atlas)"
MEMBERS = "https://members-api.parliament.uk/api/Members/Search?House=1&skip={s}&take=20"
WIKI = "https://en.wikipedia.org/w/api.php?action=parse&page=List_of_ethnic_minority_politicians_in_the_United_Kingdom&prop=wikitext&section=13&format=json"
NOMIS = "https://www.nomisweb.co.uk/api/v01/dataset/{ds}.data.csv?date=latest&geography=TYPE480,TYPE499&{dim}&measures=20100&select=geography_code,{col},obs_value"


def curl(url, out):
    for i in range(4):
        r = subprocess.run(["curl", "-sSL", "-m", "120", "-A", UA, url, "-o", out], capture_output=True)
        if r.returncode == 0 and os.path.getsize(out) > 0: return
        time.sleep(3 * (i + 1))
    raise SystemExit("download failed: " + url)


def norm(n):
    n = unicodedata.normalize("NFKD", n).encode("ascii", "ignore").decode().lower()
    n = re.sub(r"\b(mr|mrs|ms|miss|dr|sir|dame|rt hon|the|lord|lady|kc|qc|mp|cbe|obe|mbe)\b\.?", " ", n)
    return re.sub(r"[^a-z]+", " ", n).strip()


def key(n):   # first and last word: "Ms Diane Julie Abbott" and "Diane Abbott" match
    w = norm(n).split()
    return (w[0] + " " + w[-1]) if len(w) > 1 else (w[0] if w else "")


def members(offline):
    p = os.path.join(RAW, "members.json")
    if not (offline and os.path.exists(p)):
        out, s, tot = [], 0, None
        while tot is None or s < tot:
            f = os.path.join(RAW, f"page_{s}.json"); curl(MEMBERS.format(s=s), f)
            d = json.load(open(f)); tot = d["totalResults"]
            out += [{"id": i["value"]["id"], "n": i["value"]["nameDisplayAs"], "g": i["value"]["gender"]} for i in d["items"]]
            os.remove(f); s += 20; time.sleep(0.25)
        json.dump(out, open(p, "w"))
        manifest.record("raw/representation/members.json", "UK Parliament", "Members API: every House of Commons member's name and gender", "https://members-api.parliament.uk/", "Open Parliament Licence v3.0", "House of Commons members", "for data/representation.js")
    return json.load(open(p))


def ethnic(offline):
    p = os.path.join(RAW, "wiki_em_mps.json")
    if not (offline and os.path.exists(p)):
        curl(WIKI, p)
        manifest.record("raw/representation/wiki_em_mps.json", "Wikipedia", "List of ethnic minority politicians in the United Kingdom: Members of Parliament", "https://en.wikipedia.org/wiki/List_of_ethnic_minority_politicians_in_the_United_Kingdom", "CC BY-SA 4.0", "MPs from ethnic minority backgrounds (names only kept)", "for data/representation.js (totals only)")
    t = json.load(open(p))["parse"]["wikitext"]["*"]
    names = set()
    for m in re.finditer(r"\{\{sortname\|([^|}]+)\|([^|}]+)", t): names.add(key(m.group(1) + " " + m.group(2)))
    return names


def census(offline):
    out = {}
    for ds, dim, col, name in [("NM_2041_1", "c2021_eth_20=0,1004", "c2021_eth_20", "ts021"), ("NM_2028_1", "c_sex=0,1", "c_sex", "ts008")]:
        p = os.path.join(RAW, name + ".csv")
        if not (offline and os.path.exists(p)):
            curl(NOMIS.format(ds=ds, dim=dim, col=col), p); time.sleep(1)
            manifest.record(f"raw/representation/{name}.csv", "Office for National Statistics", f"Census 2021 {name.upper()} for English regions, England, Wales and England and Wales", "https://www.nomisweb.co.uk/", "OGL v3.0", "regions and nations, 2021", "for data/representation.js")
        rows = list(csv.reader(open(p, encoding="utf-8-sig")))[1:]
        for code, cat, v in rows:
            o = out.setdefault(code, {}); o[name + (":all" if cat == "0" else ":x")] = int(float(v))
    pop = {}
    for code, o in out.items():
        if "ts021:all" in o and "ts021:x" in o and "ts008:all" in o and "ts008:x" in o:
            pop[code] = [o["ts021:all"], o["ts021:all"] - o["ts021:x"], round(100 * o["ts008:x"] / o["ts008:all"], 1)]   # residents, not White, % female
    return pop


def main():
    offline = "--offline" in sys.argv
    M, EM, POP = members(offline), ethnic(offline), census(offline)
    s = open(os.path.join(ROOT, "data", "constituencies.js"), encoding="utf-8").read()
    spans = json.loads(s[s.index("{"):s.rindex("}") + 1])["spans"]
    names = sorted({x[3] for L in spans.values() for x in L if x[3]})
    byfull, bykey = {}, {}
    for m in M:
        byfull.setdefault(norm(m["n"]), set()).add(m["g"]); bykey.setdefault(key(m["n"]), set()).add(m["g"])
    gender, miss, em = {}, [], []
    for n in names:
        g = byfull.get(norm(n)) or bykey.get(key(n))
        if g and len(g) == 1: gender[n] = next(iter(g))
        elif re.match(r"(Baroness|Lady) ", n): gender[n] = "F"   # MPs since made peers: the title says it
        elif re.match(r"(The )?(Lord|Marquess|Viscount|Earl) ", n): gender[n] = "M"
        else: miss.append(n)
        if key(n) in EM: em.append(n)
    at = {}   # older boundary sets: each seat's region and nation, so totals work before their boundaries are loaded
    for f in ("constituencies_1997.js", "constituencies_2010.js"):
        t = open(os.path.join(ROOT, "data", f), encoding="utf-8").read()
        for c, pl in json.loads(t[t.index(", {") + 2:t.rindex("}") + 1])["places"].items(): at[c] = [pl.get("parent"), pl.get("nation"), pl.get("from"), pl.get("to"), pl.get("name")]
    with open(os.path.join(ROOT, "data", "representation.js"), "w", encoding="utf-8") as fh:
        fh.write("// Atlas 0.8.2: MPs' gender, ethnic minority MPs (for totals only) and Census 2021 comparisons. Built by pipeline/build_representation.py; do not edit.\nwindow.ATLAS_REP = ")
        json.dump({"built": time.strftime("%Y-%m-%d"), "g": gender, "em": em, "pop": POP, "at": at,
                   "sources": {"g": "UK Parliament Members API (gender)", "em": "Wikipedia, List of ethnic minority politicians in the United Kingdom (citing the House of Commons Library)", "pop": "ONS Census 2021, TS021 ethnic group and TS008 sex (England and Wales)"}},
                  fh, separators=(",", ":"), ensure_ascii=False); fh.write(";\n")
    rep = os.path.join(HERE, "reports"); os.makedirs(rep, exist_ok=True)
    with open(os.path.join(rep, "validation_representation.md"), "w") as fh:
        fh.write(f"# Representation build ({time.strftime('%Y-%m-%d')})\n\n- MPs named in constituencies.js: {len(names)}\n- Gender matched: {len(gender)} ({100 * len(gender) / len(names):.1f}%)\n"
                 f"- Women: {sum(1 for g in gender.values() if g == 'F')}\n- Ethnic minority MPs matched: {len(em)} (of {len(EM)} names on the Wikipedia list, most of them before 1997)\n- Census areas: {len(POP)}\n\n## Not matched (gender unknown)\n\n" + "\n".join("- " + n for n in miss) + "\n")
    print(len(names), "MPs;", len(gender), "with gender;", len(em), "ethnic minority;", len(POP), "census areas;", len(miss), "unmatched")


if __name__ == "__main__":
    main()
