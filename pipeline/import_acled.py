"""
Atlas 1.3: turn an ACLED export into Atlas protest rows.
    python3 pipeline/import_acled.py path/to/acled_export.csv
Writes sources/protests_acled.csv (same columns as protests_wikipedia.csv); then run build.py.

ACLED (Armed Conflict Location & Event Data) records protests across the UK since 2020, with place, date, organisers,
associated actors (often parties and unions) and, in its tags, crowd-size estimates. Download from
https://acleddata.com (free account): Data Export Tool → Country: United Kingdom → Event type: Protests and Riots.
"""
import csv, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from fetch_protests import classify, sizes, PARTIES


def main(path):
    out = os.path.join(HERE, "sources", "protests_acled.csv")
    n = 0
    with open(path, encoding="utf-8-sig") as fh, open(out, "w", newline="") as oh:
        w = csv.writer(oh)
        w.writerow(["title", "start", "end", "size_low", "size_high", "size_text", "cause_category", "causes", "organisers", "parties", "sites", "url", "wikidata", "nationwide"])
        for r in csv.DictReader(fh):
            if r.get("event_type") not in ("Protests", "Riots"): continue
            tags = r.get("tags", "")
            m = re.search(r"crowd size\s*=\s*([^;]+)", tags, re.I)
            lo, hi, st = sizes(m.group(1)) if m else (None, None, "")
            actors = "; ".join(x for x in (r.get("actor1"), r.get("assoc_actor_1"), r.get("actor2"), r.get("assoc_actor_2")) if x)
            notes = r.get("notes", "")
            parties = sorted({k for k, pat in PARTIES if re.search(pat, (actors + " " + notes).lower())})
            sites = [[r.get("location") or r.get("admin2"), round(float(r["latitude"]), 4), round(float(r["longitude"]), 4)]]
            title = f'{r.get("sub_event_type", "Protest")} in {r.get("location", "")}'
            w.writerow([title, r["event_date"][:10] if re.match(r"\d{4}-", r["event_date"]) else r["event_date"], "", lo or "", hi or "", st,
                        classify(notes + " " + actors), notes[:300], actors[:300], " ".join(parties), json.dumps(sites), "", "ACLED:" + r.get("event_id_cnty", ""), ""])
            n += 1
    print(f"{n} ACLED events written to {out}")


if __name__ == "__main__":
    main(sys.argv[1])
