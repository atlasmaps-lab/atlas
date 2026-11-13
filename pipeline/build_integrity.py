"""
Atlas 0.12: integrity and corruption *risk* indicators -> data/integrity.js   (run pipeline/fetch_integrity.py first)
    python3 pipeline/build_integrity.py

Corruption can't be measured directly. The most credible, widely used approach for public buying is red flags in
contract data (Fazekas, Tóth and King, "An objective corruption risk index using public procurement data", European
Journal on Criminal Policy and Research, 2016; applied to English councils by Fazekas, Broms and others). Two of the
standard flags can be read from Find a Tender award notices:
  single bidding     a competitive (open or selective) procedure that drew only one bid
  no competition     an award made without a call for competition (limited / direct award)
The risk index here is their average (0-100). A third standard flag, a very short advertising period, needs tender
deadlines that award notices don't carry, so it is left out (and the cards say so). These are indicators of risk,
not evidence of wrongdoing: there are good reasons for a direct award (urgency, a single specialist supplier) and for
a single bid (a niche market).

Plus, curated with sources:
  s114 notices  councils whose chief finance officer issued a section 114 notice (spending stopped), 2018 onwards
  CPI           Transparency International's Corruption Perceptions Index for the UK (score out of 100, rank)
"""
import collections, datetime, json, os, re

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
RAW = os.path.join(HERE, "sources", "raw", "integrity", "awards.jsonl")
MIN_N = 20   # a buyer's rates need at least this many awards (and competitive awards with bid counts for single bidding)

S114 = [  # council code, name, dates (YYYY-MM), source
    ("E10000021", "Northamptonshire", ["2018-02", "2018-07"], "https://www.gov.uk/search/all?keywords=Northamptonshire+section+114&order=relevance"),
    ("E09000008", "Croydon", ["2020-11", "2021-12", "2022-11"], "https://www.gov.uk/search/all?keywords=Croydon+section+114&order=relevance"),
    ("E06000039", "Slough", ["2021-07"], "https://www.gov.uk/search/all?keywords=Slough+section+114&order=relevance"),
    ("E06000034", "Thurrock", ["2022-12"], "https://www.gov.uk/search/all?keywords=Thurrock+section+114&order=relevance"),
    ("E07000217", "Woking", ["2023-06"], "https://www.gov.uk/search/all?keywords=Woking+section+114&order=relevance"),
    ("E08000025", "Birmingham", ["2023-09"], "https://www.gov.uk/search/all?keywords=Birmingham+section+114&order=relevance"),
    ("E06000018", "Nottingham", ["2023-11"], "https://www.gov.uk/search/all?keywords=Nottingham+section+114&order=relevance"),
]
CPI = [[2012, 74, 17], [2013, 76, 14], [2014, 78, 14], [2015, 81, 10], [2016, 81, 10], [2017, 82, 8], [2018, 80, 11], [2019, 77, 12], [2020, 77, 11], [2021, 78, 11], [2022, 73, 18], [2023, 71, 20], [2024, 71, 20]]

DROP = r"\b(the|council|borough|metropolitan|district|county|city|of|royal|london|corporation|unitary|authority|cyngor|sir|and|comhairle|nan)\b"


def norm(s):
    s = re.sub(r"\([^)]*\)|\bt/a\b.*$", " ", s.lower()).replace("&", " and ").replace("st.", "st ").replace("-", " ")
    s = re.sub(r"^.*\bt/a\s+", "", s)
    s = re.sub(r"[^a-z ]", " ", s)
    return " ".join(re.sub(DROP, " ", s).split())


def main():
    councils = json.load(open(os.path.join(HERE, "geometry", "councils.geojson"), encoding="utf-8"))["features"]
    by = {}
    for f in councils:
        p = f["properties"]; by.setdefault(norm(p["name"]), p["code"])
    alias = {"bcp": "E06000058", "bournemouth christchurch poole": "E06000058", "hull": "E06000010", "kingston upon hull": "E06000010", "edinburgh": "S12000036", "glasgow": "S12000049",
             "bristol": "E06000023", "herefordshire": "E06000019", "durham": "E06000047", "rhondda cynon taf": "W06000016", "na h eileanan siar": "S12000013", "western isles": "S12000013", "newcastle": "E08000021", "southend": "E06000033", "st helens": "E08000013", "swansea": "W06000011"}
    by.update(alias)
    rows = {}
    for line in open(RAW, encoding="utf-8"):
        r = json.loads(line); k = r.get("ocid") or r["id"]
        if k not in rows or r["d"] > rows[k]["d"]:
            rows[k] = r
    R = list(rows.values())
    print(len(R), "awards after removing repeats")
    stats = collections.defaultdict(lambda: {"n": 0, "v": 0.0, "comp": 0, "single": 0, "lim": 0, "vlim": 0.0, "flag": [], "name": collections.Counter()})
    nat = {"n": 0, "comp": 0, "single": 0, "lim": 0}
    for r in R:
        code = by.get(norm(r["buyer"]))
        key = code or ("b:" + norm(r["buyer"]))
        s = stats[key]; s["n"] += 1; s["name"][r["buyer"]] += 1; v = r.get("v") or 0; s["v"] += v
        comp, single, lim = r["m"] in ("open", "selective") and r.get("nb") is not None, r["m"] in ("open", "selective") and r.get("nb") == 1, r["m"] == "limited"
        s["comp"] += comp; s["single"] += single; s["lim"] += lim; s["vlim"] += v if lim else 0
        nat["n"] += 1; nat["comp"] += comp; nat["single"] += single; nat["lim"] += lim
        if single or lim:
            s["flag"].append({"t": r["t"], "d": r["d"], "v": round(v) if v else None, "f": "single" if single else "direct", "md": r["md"], "u": r["u"]})

    def pack(s):
        sb = 100 * s["single"] / s["comp"] if s["comp"] >= MIN_N // 2 else None
        di = 100 * s["lim"] / s["n"] if s["n"] >= MIN_N else None
        cri = (sb + di) / 2 if sb is not None and di is not None else None
        top = sorted(s["flag"], key=lambda x: -(x["v"] or 0))[:10]
        return {"n": s["n"], "v": round(s["v"]), "comp": s["comp"], "single": s["single"], "lim": s["lim"], "vlim": round(s["vlim"]),
                "sb": round(sb, 1) if sb is not None else None, "di": round(di, 1) if di is not None else None, "cri": round(cri, 1) if cri is not None else None, "top": top}
    C = {k: pack(s) for k, s in stats.items() if not k.startswith("b:")}
    others = sorted(((k, s) for k, s in stats.items() if k.startswith("b:") and s["n"] >= MIN_N), key=lambda x: -x[1]["n"])[:120]
    B = [dict(pack(s), name=s["name"].most_common(1)[0][0]) for k, s in others]
    natp = {"n": nat["n"], "sb": round(100 * nat["single"] / nat["comp"], 1), "di": round(100 * nat["lim"] / nat["n"], 1)}; natp["cri"] = round((natp["sb"] + natp["di"]) / 2, 1)
    ds = sorted(r["d"] for r in R if r["d"])
    out = {"built": datetime.date.today().isoformat(), "from": ds[0], "to": ds[-1], "minN": MIN_N, "uk": natp, "councils": C, "buyers": B,
           "s114": [{"code": c, "n": n, "d": d, "u": u} for c, n, d, u in S114], "cpi": CPI}
    with open(os.path.join(ROOT, "data", "integrity.js"), "w", encoding="utf-8") as fh:
        fh.write("/* Generated by pipeline/build_integrity.py: don't edit by hand. Find a Tender (Cabinet Office) OCDS award notices, OGL v3.0;\n   s114 notices and TI CPI curated with sources. Indicators of risk, not evidence of wrongdoing. */\n")
        fh.write("window.ATLAS_INTEGRITY = " + json.dumps(out, separators=(",", ":"), ensure_ascii=False) + ";\n")
    matched = sum(1 for k in C if C[k]["cri"] is not None)
    print(f"councils matched: {len(C)} ({matched} with enough awards for the index); other buyers: {len(B)}; UK: {natp}")


if __name__ == "__main__":
    main()
