"""
Atlas 1.7: party left-right positions -> sources/ches_uk_lrgen.csv   (python3 pipeline/clean_ches.py; standard library only)

Chapel Hill Expert Survey trend file 1999-2024 (means), UK parties: lrgen, overall left-right position, 0 = far left, 10 = far right.
CHES waves are labelled by the year whose positions experts rate (1999, 2002, 2006, 2010, 2014, 2019, 2024). Each election uses
the latest wave whose year is on or before the election's year. Northern Irish parties are not in CHES. The Manifesto Project
(needs an API key) is not used.
"""
import csv, os

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "sources")
# CHES party_id -> Atlas party key. 1110 is the Brexit Party in 2019 and Reform UK (its renamed successor) in 2024
CHES_PARTY = {"1101": "con", "1102": "lab", "1104": "ld", "1105": "snp", "1106": "pc", "1107": "grn", "1108": "ukip", "1109": "bnp"}


def main():
    rows = []
    for r in csv.DictReader(open(os.path.join(SRC, "raw", "CHES_1999-2024_means_V2.csv"), encoding="utf-8", errors="replace")):
        if r["country"] != "11":
            continue
        key = CHES_PARTY.get(r["party_id"]) or ({"2019": "brx"}.get(r["year"], "ref") if r["party_id"] == "1110" else None)
        if not key or not r["lrgen"]:
            continue
        rows.append({"wave": r["year"], "party": key, "ches_party": r["party"], "ches_id": r["party_id"], "lrgen": round(float(r["lrgen"]), 4),
                     "source": "Chapel Hill Expert Survey trend file 1999-2024 (means, V2)"})
    with open(os.path.join(SRC, "ches_uk_lrgen.csv"), "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=list(rows[0].keys()))
        w.writeheader(); w.writerows(rows)
    print(f"CHES: {len(rows)} UK party scores in waves {sorted({r['wave'] for r in rows})}")


if __name__ == "__main__":
    main()
