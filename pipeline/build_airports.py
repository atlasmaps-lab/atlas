"""
Atlas 0.8.1: airport details for the airport cards -> data/airports.js   (python3 pipeline/build_airports.py [--offline])
Standard library (curl).

  CAA UK flight punctuality statistics, monthly "Summary Analysis" CSVs (2023 onwards): for each airport and month the
    flights, cancellations, average delay and the share more than 15 minutes late. Free reuse with acknowledgement.
  Wikidata (CC0): each airport's IATA and ICAO codes, operator and website, matched to the airports in
    data/places_poi.js by name and position.
A month counts as "severe disruption" when the average delay is over 25 minutes or more than 5% of flights were cancelled
(Atlas's own rule of thumb, stated on the card). Live boards come from the flights proxy (workers/flights/, optional).
"""
import csv, datetime, io, json, math, os, re, subprocess, sys, time, urllib.parse
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
import manifest

RAW = os.path.join(HERE, "sources", "raw", "airports"); os.makedirs(RAW, exist_ok=True)
UA = "Mozilla/5.0 (compatible; AtlasMaps/0.8; +https://github.com/atlasmaps-lab/atlas)"
CAA = "https://www.caa.co.uk"
PAGE = CAA + "/data-and-analysis/uk-aviation-market/flight-punctuality/uk-flight-punctuality-statistics/{y}/"


def curl(url, out=None):
    r = subprocess.run(["curl", "-sSL", "-m", "120", "-A", UA, url] + (["-o", out] if out else []), capture_output=True, check=True)
    return r.stdout.decode("utf-8", "replace")


def punctuality(offline):
    files = []
    for y in range(2023, datetime.date.today().year + 1):
        idx = os.path.join(RAW, f"links_{y}.json")
        if offline and os.path.exists(idx): links = json.load(open(idx))
        else:
            html = curl(PAGE.format(y=y)); time.sleep(0.5)
            links = [[m.group(1), m.group(2)] for m in re.finditer(r'href="(/Documents/Download/[^"]+)"[^>]*>(?:(?!</a>).)*?(\d{6}) Punctuality Statistics Summary Analysis', html, re.S)]
            json.dump(links, open(idx, "w"))
        for url, ym in links:
            p = os.path.join(RAW, f"summary_{ym}.csv")
            if not os.path.exists(p): curl(CAA + url, p); time.sleep(0.4)
            files.append((ym, p))
    json.dump([f for _, f in files], open(os.path.join(RAW, "punctuality_files.json"), "w"))
    print(len(files), "monthly punctuality files")
    manifest.record("raw/airports/punctuality_files.json", "Civil Aviation Authority", "UK flight punctuality statistics, monthly summary analysis (2023 onwards)", PAGE.format(y="YYYY"), "CAA: free reuse with acknowledgement", "UK reporting airports, monthly", "for data/airports.js (pipeline/build_airports.py)")
    out = {}
    for ym, p in sorted(files):
        rows = list(csv.reader(open(p, encoding="utf-8-sig", errors="replace")))
        hi = next((i for i, r in enumerate(rows) if r and r[0].startswith("Run Date")), None)
        if hi is None: continue
        H = rows[hi]; col = lambda k: next(i for i, h in enumerate(H) if k.lower() in h.lower())
        try: ap, od, nm, nc, avg = col("Reporting Airport"), col("Origin Destination"), col("Number Flights Matched"), col("Number Flights Cancelled"), col("Average Delay")
        except StopIteration: continue
        late_cols = [i for i, h in enumerate(H) if re.search(r"between (16|31|61|121|181)|more than 360", h)]
        for r in rows[hi + 1:]:
            if len(r) <= avg or r[od].strip() != "AIRPORT TOTAL": continue
            try:
                n, c = float(r[nm] or 0), float(r[nc] or 0)
                late = sum(float(r[i] or 0) for i in late_cols)
                out.setdefault(r[ap].strip(), []).append([ym, int(n), round(100 * c / (n + c), 1) if n + c else 0, round(float(r[avg] or 0), 1), round(late, 1)])
            except ValueError: continue
    return out


def wikidata(offline):
    p = os.path.join(RAW, "wikidata.json")
    if not (offline and os.path.exists(p)):
        q = """SELECT ?a ?aLabel ?iata ?icao ?opLabel ?site ?coord WHERE { ?a wdt:P31/wdt:P279* wd:Q1248784; wdt:P17 ?c; wdt:P238 ?iata. VALUES ?c { wd:Q145 }
          OPTIONAL { ?a wdt:P239 ?icao } OPTIONAL { ?a wdt:P137 ?op } OPTIONAL { ?a wdt:P856 ?site } OPTIONAL { ?a wdt:P625 ?coord }
          SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } }"""
        curl("https://query.wikidata.org/sparql?format=json&query=" + urllib.parse.quote(q), p)
        manifest.record("raw/airports/wikidata.json", "Wikidata", "UK airports: IATA and ICAO codes, operator, website, coordinates", "https://query.wikidata.org/", "CC0", "UK airports with an IATA code", "for data/airports.js")
    out = []
    for b in json.load(open(p))["results"]["bindings"]:
        g = lambda k: b.get(k, {}).get("value", "")
        m = re.match(r"Point\(([-\d.]+) ([-\d.]+)\)", g("coord"))
        out.append({"name": g("aLabel"), "iata": g("iata"), "icao": g("icao"), "op": g("opLabel"), "site": g("site"), "lon": float(m.group(1)) if m else None, "lat": float(m.group(2)) if m else None})
    return out


def norm(s):
    s = s.lower().replace("&", " and ")
    s = re.sub(r"\b(international|airport|airfield|london|city of|the|john lennon|george best|robin hood|doncaster sheffield|wales)\b|\(.*?\)", " ", s)
    return re.sub(r"[^a-z]+", " ", s).strip()


def main():
    offline = "--offline" in sys.argv
    P = punctuality(offline); W = wikidata(offline)
    s = open(os.path.join(ROOT, "data", "places_poi.js"), encoding="utf-8").read()
    poi = [i for i in json.loads(s[s.index("{"):s.rindex("}") + 1])["items"] if i["k"] == "airport"]
    out, log = {}, []
    for a in poi:
        # nearest Wikidata airport within 6 km (codes, operator); the name must share a word
        cands = [w for w in W if w["lon"] is not None and math.hypot((w["lon"] - a["lon"]) * 64, (w["lat"] - a["lat"]) * 111) < 6]
        cands.sort(key=lambda w: math.hypot((w["lon"] - a["lon"]) * 64, (w["lat"] - a["lat"]) * 111))
        w = next((c for c in cands if set(norm(c["name"]).split()) & set(norm(a["n"]).split())), cands[0] if cands else None)
        key = a["id"][3:].replace("-", " ").upper()
        pk = next((k for k in P if norm(k) == norm(a["n"]) or norm(k) == norm(key)), None) or next((k for k in P if norm(k) and norm(k) in norm(a["n"]) or norm(a["n"]) in norm(k)), None)
        hist = P.get(pk, [])[-36:] if pk else []
        out[a["id"]] = {"iata": w and w["iata"], "icao": w and w["icao"], "op": w and w["op"], "site": w and w["site"], "punct": hist}
        log.append([a["n"], w and w["name"], w and w["iata"], pk, len(hist)])
    with open(os.path.join(ROOT, "data", "airports.js"), "w", encoding="utf-8") as fh:
        fh.write("// Atlas 0.8.1: airport codes, operators and punctuality history. Built by pipeline/build_airports.py; do not edit.\nwindow.ATLAS_AIRPORTS = ")
        json.dump({"built": datetime.date.today().isoformat(), "items": out, "rule": "Severe disruption: an average delay over 25 minutes or more than 5% of flights cancelled in the month",
                   "sources": "CAA UK flight punctuality statistics (monthly summary); Wikidata (codes, operator)"}, fh, separators=(",", ":"), ensure_ascii=False); fh.write(";\n")
    for r in log: print(" | ".join(str(x) for x in r))


if __name__ == "__main__":
    main()
