"""
Atlas 1.3: protests -> data/protests.js   (python3 pipeline/build_protests.py, standard library only)

sources/protests_wikipedia.csv   notable protests since 1974 (fetch_protests.py)
sources/protests_acled.csv       optional: ACLED events since 2020 (import_acled.py)
sources/organiser_alignment.csv  editable lookup: organisers' names -> political alignment
Each site of each protest is placed in its council and ward by point-in-polygon.
"""
import csv, json, math, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC, DATA = os.path.join(HERE, "sources"), os.path.join(os.path.dirname(HERE), "data")
sys.path.insert(0, HERE)
from build import polys, inside, bbox

CAUSE_COLOURS = {  # chosen to stay distinct from party colours and from each other
    "War, foreign affairs & diaspora": "#6b4226", "Climate & environment": "#2e8b57", "Work, pay & strikes": "#e0731b", "Race, religion & immigration": "#8e44ad",
    "Brexit & Europe": "#1f4e9c", "Economy, cuts & cost of living": "#c0392b", "Policing, justice & civil rights": "#34495e", "Education & students": "#d4a017",
    "Health & COVID": "#16a2a2", "Rights & equality": "#e75480", "Constitution, monarchy & government": "#7f8c8d", "Sport & other": "#a0a0a0", "Other": "#b5a99a"}
DAY0 = 0  # days are counted from 1970-01-01


def days(s):
    from datetime import date
    y, m, d = (int(x) for x in s.split("-"))
    return (date(y, m, max(1, min(d, 28 if m == 2 else 30 if m in (4, 6, 9, 11) else 31))) - date(1970, 1, 1)).days


def locator(geo):
    feats = [(f["properties"]["code"], bbox(f["geometry"]), f["geometry"]) for f in geo["features"]]
    def find(lon, lat):
        for code, b, g in feats:
            if b[0] <= lon <= b[2] and b[1] <= lat <= b[3] and any(inside([lon, lat], p[0]) for p in polys(g)): return code
        return None
    return find


def main():
    councils = locator(json.load(open(os.path.join(HERE, "geometry", "councils.geojson"))))
    wards = locator(json.load(open(os.path.join(HERE, "geometry", "wards.geojson"))))
    align = [(re.compile(r["pattern"], re.I), r["alignment"]) for r in csv.DictReader(open(os.path.join(SRC, "organiser_alignment.csv")))]
    causes = list(CAUSE_COLOURS)
    events, sites, dropped = [], [], 0
    for fname, source in (("protests_wikipedia.csv", "Wikipedia"), ("protests_acled.csv", "ACLED")):
        p = os.path.join(SRC, fname)
        if not os.path.exists(p): continue
        for r in csv.DictReader(open(p, encoding="utf-8-sig")):
            ss = []
            for name, lat, lon in json.loads(r["sites"]):
                c = councils(lon, lat)
                if c: ss.append((name, lat, lon, c, wards(lon, lat)))
            scope = (r.get("nationwide") or "").split()
            if not ss and not scope: dropped += 1; continue
            lo = int(r["size_low"]) if r["size_low"] else None
            hi = int(r["size_high"]) if r["size_high"] else None
            mid = round(math.sqrt(lo * hi)) if lo and hi else None   # geometric middle of a crowd range
            orgs = r["organisers"] + " " + r["parties"]
            al = sorted({a for pat, a in align if pat.search(orgs)})
            e = len(events)
            events.append({"n": r["title"], "t0": days(r["start"]), "t1": days(r["end"]) if r["end"] else None, "lo": lo, "hi": hi, "mid": mid,
                           "st": r["size_text"], "c": causes.index(r["cause_category"]) if r["cause_category"] in causes else causes.index("Other"),
                           "ct": r["causes"], "org": r["organisers"], "pa": r["parties"].split(), "al": al, "u": r["url"], "src": source, "ns": len(ss),
                           "scope": scope if not ss else []})   # nationwide events with no named town count for the UK / nation only
            for name, lat, lon, c, w in ss: sites.append([e, lat, lon, c, w, name])
    out = {"causes": [[c, CAUSE_COLOURS[c]] for c in causes], "events": events, "sites": sites,
           "sources": {"Wikipedia": "Wikipedia articles on UK protests (infobox dates, places, causes, organisers, crowd estimates) and Wikidata",
                       "ACLED": "Armed Conflict Location & Event Data (ACLED), acleddata.com"}}
    with open(os.path.join(DATA, "protests.js"), "w") as fh:
        fh.write("window.ATLAS_PROTESTS = " + json.dumps(out, separators=(",", ":"), ensure_ascii=False) + ";\n")
    sized = sum(1 for e in events if e["mid"])
    nat = sum(1 for e in events if e["scope"])
    print(f"Protests: {len(events)} events at {len(sites)} sites ({sized} with a crowd estimate; {nat} nationwide with no named town); {dropped} had no site inside a UK council.")


if __name__ == "__main__":
    main()
