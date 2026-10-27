"""
Atlas 1.7: council composition (seats by party, each year) -> sources/council_composition.csv   (python3 pipeline/clean_councils.py)

Open Council Data UK, "50 Years+ of GB Council Compositions" (history1973-2015.csv, history2016-26.csv; CC BY-SA 4.0): the party
make-up of every council shortly after each May's elections. Joined to today's councils by name (aliases below). Councils
that didn't exist yet (e.g. Dorset before 2019) have no rows for those years. Standard library only.
"""
import csv, json, os, re, unicodedata

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC = os.path.join(HERE, "sources")
RAW = os.path.join(SRC, "raw")
ALIAS = {}   # Open Council Data name (normalised) -> Atlas name (normalised); filled from what fails to match


def norm(s):
    s = unicodedata.normalize("NFKD", str(s)).encode("ascii", "ignore").decode().lower().replace("&", " and ")
    s = re.sub(r"\b(city of|council|borough|district|county|metropolitan|the|royal)\b", " ", s)
    return re.sub(r"[^a-z0-9]+", " ", s).strip()


def main():
    s = open(os.path.join(ROOT, "data", "uk-data.js"), encoding="utf-8").read()
    P = json.loads(s[s.index("=") + 1:].strip().rstrip(";"))["places"]
    by = {}
    for c, p in P.items():
        if p["level"] == "council":
            by.setdefault(norm(p["name"]), []).append(c)
    al = json.load(open(os.path.join(SRC, "council_name_aliases.json"), encoding="utf-8")) if os.path.exists(os.path.join(SRC, "council_name_aliases.json")) else {}
    # a council created by merging others (e.g. Dorset, 2019) has no history before it existed: an older council of the same
    # name (Dorset County Council) is a different body. Recoded councils (same name before and after, e.g. Glasgow City) keep theirs.
    start, preds = {}, {}
    for r in csv.DictReader(open(os.path.join(RAW, "CHD_2024-12", "ChangeHistory.csv"), encoding="utf-8-sig", errors="replace")):
        if r["GEOGCD"] in P and r["OPER_DATE"]:
            start[r["GEOGCD"]] = int(r["OPER_DATE"][6:10])
    for r in csv.DictReader(open(os.path.join(RAW, "CHD_2024-12", "Changes.csv"), encoding="utf-8-sig", errors="replace")):
        if r["GEOGCD"] in P:
            preds.setdefault(r["GEOGCD"], set()).add(norm(r["GEOGNM_P"]))
    def new_body(code):
        return code in start and start[code] > 2009 and norm(P[code]["name"]) not in preds.get(code, set())
    rows, unmatched = [], {}
    old = list(csv.DictReader(open(os.path.join(RAW, "ocd_history1973-2015.csv"), encoding="utf-8-sig")))
    new = list(csv.DictReader(open(os.path.join(RAW, "ocd_history2016-26.csv"), encoding="utf-8-sig")))
    for r in old + new:
        k = norm(r["authority"]); k = al.get(k, k)
        codes = by.get(k, [])
        if len(codes) != 1:
            unmatched[r["authority"]] = max(unmatched.get(r["authority"], 0), int(r["year"])); continue
        if codes[0][0] == "N":
            continue   # this file folds every Northern Irish party into 'other': no party breakdown, so Northern Ireland is left out
        if codes[0][0] in "SW" and int(r["year"]) < 1995:
            continue   # Scottish and Welsh councils were replaced by new unitary councils, first elected in 1995
        if new_body(codes[0]) and int(r["year"]) < start[codes[0]]:
            continue   # an older council with the same name, before this one existed
        seats = {}
        for col, key in (("con", "con"), ("lab", "lab"), ("ld", "ld"), ("green", "grn"), ("ukip", "ukip"), ("ref", "ref"), ("pc", "pc"), ("snp", "snp"), ("nat", "nat"), ("other", "oth")):
            v = (r.get(col) or "").strip()
            if v and v not in ("0",):
                seats[key] = int(float(v))
        if "nat" in seats:   # the pre-2016 file has one 'nat' column: SNP in Scotland, Plaid Cymru in Wales
            seats["snp" if codes[0][0] == "S" else "pc"] = seats.pop("nat")
        rows.append({"code": codes[0], "year": int(r["year"]), "total": int(float(r["total"])), "seats": json.dumps(seats, separators=(",", ":")),
                     "control": r["majority"].strip(), "source": "Open Council Data UK (CC BY-SA 4.0)"})
    # one row per council and year (the 2015 rows appear in both files: keep the newer file's)
    keep = {}
    for r in rows:
        keep[(r["code"], r["year"])] = r
    out = sorted(keep.values(), key=lambda r: (r["code"], r["year"]))
    with open(os.path.join(SRC, "council_composition.csv"), "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=list(out[0].keys()))
        w.writeheader(); w.writerows(out)
    cur = {r["code"] for r in out if r["year"] >= 2025}
    gb = [c for c, p in P.items() if p["level"] == "council" and c[0] in "ESW"]
    print(f"compositions: {len(out)} council-years for {len({r['code'] for r in out})} councils; GB councils with no 2025+ row: {[P[c]['name'] for c in gb if c not in cur]}")
    recent = sorted((n, y) for n, y in unmatched.items() if y >= 2020)
    print(f"names not matched (still current in 2020+): {recent}")


if __name__ == "__main__":
    main()
