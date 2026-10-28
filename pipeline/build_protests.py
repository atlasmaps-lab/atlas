"""
Atlas 1.8: protests -> data/protests.js and pipeline/reports/validation_protests.md   (python3 pipeline/build_protests.py)

sources/protests_wikipedia.csv   notable protests since 1974 (fetch_protests.py), with the decisions in protests_log.json
sources/protests_acled.csv       optional: ACLED events since 2020 (import_acled.py)
sources/organiser_alignment.csv  editable lookup: organisers' names -> political alignment
sources/protests_spotcheck.json  optional: spotcheck_protests.py's comparison of 15 events with their Wikipedia articles

Each site of each protest is placed in its council and ward by point-in-polygon. Automated check: no point may fall outside
the UK's boundaries (pipeline/geometry/nations.geojson); the build stops and lists any that do.
"""
import csv, json, math, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC, DATA = os.path.join(HERE, "sources"), os.path.join(os.path.dirname(HERE), "data")
REPORT = os.path.join(HERE, "reports", "validation_protests.md")
sys.path.insert(0, HERE)
from build import polys, inside, bbox

CAUSE_COLOURS = {  # chosen to stay distinct from party colours and from each other
    "War, foreign affairs & diaspora": "#6b4226", "Climate & environment": "#2e8b57", "Work, pay & strikes": "#e0731b", "Race, religion & immigration": "#8e44ad",
    "Brexit & Europe": "#1f4e9c", "Economy, cuts & cost of living": "#c0392b", "Policing, justice & civil rights": "#34495e", "Education & students": "#d4a017",
    "Health & COVID": "#16a2a2", "Rights & equality": "#e75480", "Constitution, monarchy & government": "#7f8c8d", "Sport & other": "#a0a0a0", "Other": "#b5a99a"}


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


def nearest(geo, lon, lat, km=2.0):
    """a site on the coast just outside the generalised council boundary: the council whose edge is within km"""
    best, bd = None, km
    for f in geo["features"]:
        b = bbox(f["geometry"])
        if not (b[0] - 0.05 <= lon <= b[2] + 0.05 and b[1] - 0.05 <= lat <= b[3] + 0.05): continue
        for p in polys(f["geometry"]):
            for x, y in p[0][::3]:
                d = math.hypot((x - lon) * 111.32 * math.cos(math.radians(lat)), (y - lat) * 110.57)
                if d < bd: best, bd = f["properties"]["code"], d
    return best


def table(rows, head):
    if not rows: return "_None._\n"
    out = "| " + " | ".join(head) + " |\n|" + "---|" * len(head) + "\n"
    for r in rows: out += "| " + " | ".join(str(x).replace("|", "/").replace("\n", " ") for x in r) + " |\n"
    return out


def main():
    cgeo = json.load(open(os.path.join(HERE, "geometry", "councils.geojson")))
    councils, wards = locator(cgeo), locator(json.load(open(os.path.join(HERE, "geometry", "wards.geojson"))))
    nations = locator(json.load(open(os.path.join(HERE, "geometry", "nations.geojson"))))
    align = [(re.compile(r["pattern"], re.I), r["alignment"]) for r in csv.DictReader(open(os.path.join(SRC, "organiser_alignment.csv")))]
    causes = list(CAUSE_COLOURS)
    events, sites, dropped, outside, snapped = [], [], [], [], []
    for fname, source in (("protests_wikipedia.csv", "Wikipedia"), ("protests_acled.csv", "ACLED")):
        p = os.path.join(SRC, fname)
        if not os.path.exists(p): continue
        for r in csv.DictReader(open(p, encoding="utf-8-sig")):
            ss = []
            for s in json.loads(r["sites"]):
                name, lat, lon = s[0], s[1], s[2]
                if not nations(lon, lat): outside.append((r["title"], name, lat, lon)); continue   # the automated check: never a point outside the UK
                c = councils(lon, lat)
                if not c:
                    c = nearest(cgeo, lon, lat)
                    if c: snapped.append((r["title"], name, c))
                if c: ss.append((name, lat, lon, c, wards(lon, lat)))
            scope = (r.get("nationwide") or "").split()
            if not ss and not scope: dropped.append((r["title"], "no site inside a UK council")); continue
            lo = int(r["size_low"]) if r["size_low"] else None
            hi = int(r["size_high"]) if r["size_high"] else None
            mid = round(math.sqrt(lo * hi)) if lo and hi else None   # geometric middle of a crowd range
            orgs = r["organisers"] + " " + r["parties"]
            al = sorted({a for pat, a in align if pat.search(orgs)})
            e = len(events)
            ev = {"n": r["title"], "t0": days(r["start"]), "t1": days(r["end"]) if r["end"] else None, "lo": lo, "hi": hi, "mid": mid,
                  "st": r["size_text"], "c": causes.index(r["cause_category"]) if r["cause_category"] in causes else causes.index("Other"),
                  "ct": r["causes"], "org": r["organisers"], "pa": r["parties"].split(), "al": al, "u": r["url"], "src": source, "ns": len(ss),
                  "scope": scope if not ss else []}   # nationwide events with no named town count for the UK / nation only
            for k, col in (("summary", "sum"), ("outcome", "out"), ("wikidata", "q"), ("size_note", "sn")):
                if r.get(k): ev[col] = r[k]
            if r.get("crowd"):
                cr = json.loads(r["crowd"])
                if cr: ev["cr"] = cr
            if r.get("international"): ev["intl"] = 1
            events.append(ev)
            for name, lat, lon, c, w in ss: sites.append([e, lat, lon, c, w, name])
    if outside:
        print("FAIL: protest sites outside the UK's boundaries:")
        for t, n, lat, lon in outside: print(f"  {t}: {n} ({lat}, {lon})")
        sys.exit(1)
    out = {"causes": [[c, CAUSE_COLOURS[c]] for c in causes], "events": events, "sites": sites,
           "sources": {"Wikipedia": "Wikipedia articles on UK protests (infobox dates, places, causes, organisers, crowd estimates, lead summary; CC BY-SA 4.0) and Wikidata (CC0)",
                       "ACLED": "Armed Conflict Location & Event Data (ACLED), acleddata.com"}}
    with open(os.path.join(DATA, "protests.js"), "w") as fh:
        fh.write("// Generated by pipeline/build_protests.py. Do not edit by hand.\nwindow.ATLAS_PROTESTS = " + json.dumps(out, separators=(",", ":"), ensure_ascii=False) + ";\n")
    sized = sum(1 for e in events if e["mid"]); nat = sum(1 for e in events if e["scope"]); intl = sum(1 for e in events if e.get("intl"))
    print(f"Protests: {len(events)} events at {len(sites)} sites ({sized} with a crowd estimate; {nat} nationwide with no named town; {intl} UK parts of international protests); "
          f"{len(dropped)} had no site inside a UK council; 0 points outside the UK; {len(snapped)} coastal sites placed in the nearest council")
    report(events, sites, dropped, snapped)


def report(events, sites, dropped, snapped):
    logp = os.path.join(SRC, "protests_log.json")
    log = json.load(open(logp)) if os.path.exists(logp) else {}
    spot = json.load(open(os.path.join(SRC, "protests_spotcheck.json"))) if os.path.exists(os.path.join(SRC, "protests_spotcheck.json")) else None
    ch = log.get("changes", {})
    md = f"""# Validation: protests (Atlas 1.8)

Written by `pipeline/build_protests.py` from `pipeline/sources/protests_log.json` (the decisions `fetch_protests.py` made, retrieved {log.get('retrieved', '?')}) and the build's own checks.

## Summary

- **{len(events)} events** at **{len(sites)} sites** in `data/protests.js`; {sum(1 for e in events if e.get('intl'))} are the UK part of an international protest; {sum(1 for e in events if e['scope'])} have no single town and count for their nation.
- **Automated check: points outside the UK's boundaries: 0** (every site is tested against `pipeline/geometry/nations.geojson`, point in polygon; the build stops if any fails). Also run by `tests/test_protests_uk.py` on the built file.
- {len(log.get('dropped', []))} candidate articles dropped (below), {len(log.get('sites_removed', []))} sites removed, {len(log.get('no_point', []))} places too broad for a point, {len(log.get('ambiguous', []))} ambiguous place names resolved.
- {len(snapped)} coastal sites fell just outside the generalised council boundary and were placed in the council whose edge is within 2 km.

## How each event was checked

1. **Country:** kept only if Wikidata gives the event's country as the United Kingdom (P17 = Q145), or a place it names resolves to a UK Wikidata item inside the UK polygons.
2. **Places:** every place goes through its Wikidata item: the item's country must be the UK *and* its coordinates must fall inside the UK polygons (not a bounding box).
3. **International events:** only UK places that the article itself describes as protest sites are kept (a sentence that names the place and a protest, in a UK section of the article or naming the UK itself), labelled "UK part of an international protest". A crowd figure is shown only if the article gives one for the UK place; a global figure is never put on a UK point.
4. **Regions, counties and countries** get no point; the event counts for the nation.

## Events dropped, and why

{table(sorted((d['title'], d['reason']) for d in log.get('dropped', [])), ['Article', 'Reason'])}
{table(dropped, ['Event', 'Dropped at build'])  if dropped else ''}
## Sites removed

{table([(d['event'], d['site'], d['reason']) for d in log.get('sites_removed', [])], ['Event', 'Place', 'Reason'])}
## Places too broad for a point (the event counts for the nation)

{table([(d['event'], d['site'], d['reason']) for d in log.get('no_point', [])], ['Event', 'Place', 'Why'])}
## Ambiguous place names and how they were resolved

{table([(d['event'], d['name'], d['resolved_to'], d['wikidata'] or '', d['country'], d['decision']) for d in log.get('ambiguous', [])], ['Event', 'Name', 'Resolved to', 'Wikidata', 'Country', 'Decision'])}
## UK parts of international protests

{table([(d['event'], ', '.join(d['uk_sites']), d['crowd']) for d in log.get('international', [])], ['Event', 'UK sites kept', 'Crowd shown'])}
## Changes since the previous file (Atlas 1.7)

- Events no longer included: {len(ch.get('events_gone', []))}{(': ' + '; '.join(ch.get('events_gone', []))) if ch.get('events_gone') else ''}
- New events: {len(ch.get('events_new', []))}{(': ' + '; '.join(ch.get('events_new', []))) if ch.get('events_new') else ''}

Sites removed from events that stayed:

{table([(d['event'], d['site']) for d in ch.get('sites_gone', [])], ['Event', 'Site'])}
Sites moved by more than 1 km:

{table([(d['event'], d['site'], d['km']) for d in ch.get('sites_moved', [])], ['Event', 'Site', 'km'])}
"""
    if snapped: md += "\n## Coastal sites placed in the nearest council\n\n" + table(snapped, ["Event", "Site", "Council"])
    md += "\n## Spot check: 15 events against their Wikipedia articles\n\n"
    if spot:
        md += f"`pipeline/spotcheck_protests.py` re-read each article on {spot['date']} and compared it with Atlas's record. {spot['summary']}\n\n"
        md += table([(r["title"], r["date"], r["places"], r["crowd"], r["verdict"]) for r in spot["rows"]], ["Event", "Date", "Places", "Crowd", "Verdict"])
        if spot.get("notes"): md += "\n" + "\n".join("- " + n for n in spot["notes"]) + "\n"
    else:
        md += "_Not run yet: python3 pipeline/spotcheck_protests.py, then rebuild._\n"
    open(REPORT, "w").write(md)
    print("report:", os.path.relpath(REPORT, os.path.dirname(HERE)))


if __name__ == "__main__":
    main()
