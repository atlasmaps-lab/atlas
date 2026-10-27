"""
Atlas 1.7: referendums -> sources/referendum_eu2016.csv, sources/referendum_indyref2014.csv   (python3 pipeline/clean_referendums.py)

EU referendum 2016 (Electoral Commission, results by counting area: 380 GB local authorities, Northern Ireland as one area,
and Gibraltar). Councils merged or recoded since 2016 are joined to today's council by ONS's Code History Database
(December 2024) and the LAD 2024 -> 2025 lookup; their votes (never their percentages) are added together. Gibraltar is not
part of the UK: it is kept only in the national reconciliation row. Northern Ireland is one row (N92000002).

Scottish independence referendum 2014: written when its source file is present (see fetch_referendums.py).
Standard library only.
"""
import csv, io, json, os, sys, zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC = os.path.join(HERE, "sources")
RAW = os.path.join(SRC, "raw")


def atlas_councils():
    s = open(os.path.join(ROOT, "data", "uk-data.js"), encoding="utf-8").read()
    P = json.loads(s[s.index("=") + 1:].strip().rstrip(";"))["places"]
    return {c: p for c, p in P.items() if p["level"] == "council"}


def successors():
    """predecessor code -> [(successor code, successor name, year)] from the CHD, plus the 2024->2025 lookup."""
    out = {}
    chd = os.path.join(RAW, "CHD_2024-12", "Changes.csv")
    with open(chd, encoding="utf-8-sig", errors="replace") as fh:
        for r in csv.DictReader(fh):
            p, c = r["GEOGCD_P"], r["GEOGCD"]
            if p[:3] in ("E06", "E07", "E08", "E09", "W06", "S12", "N09") and c[:3] in ("E06", "E07", "E08", "E09", "W06", "S12", "N09") and p != c:
                out.setdefault(p, []).append((c, r["GEOGNM"], r["YEAR"]))
    lu = json.load(open(os.path.join(RAW, "LAD24_LAD25_UK_LU.json"), encoding="utf-8"))
    for f in lu["features"]:
        a = f["attributes"]
        if a["LAD24CD"] != a["LAD25CD"]:
            out.setdefault(a["LAD24CD"], []).append((a["LAD25CD"], a["LAD25NM"], "2025"))
    return out


def current(code, name, councils, succ, trail=None):
    """Follow successor codes from a 2016 code to a council Atlas has. A split (minor boundary adjustment between two
    councils) follows the successor with the same name; that is flagged."""
    trail = trail or []
    if code in councils:
        return code, trail
    nxt = succ.get(code, [])
    if not nxt:
        return None, trail
    later = sorted(nxt, key=lambda x: x[2])
    same = [x for x in later if x[1] == name]
    pick = same[-1] if len(later) > 1 and same else later[-1] if len(set(x[0] for x in later)) == 1 else (same[-1] if same else None)
    if not pick:
        return None, trail + [("ambiguous", [x[0] for x in later])]
    return current(pick[0], pick[1], councils, succ, trail + [(code, pick[0], pick[2], len(set(x[0] for x in later)) > 1)])


def eu(councils, succ):
    R = list(csv.DictReader(open(os.path.join(RAW, "EU-referendum-result-data.csv"), encoding="utf-8-sig")))
    agg, problems, recon = {}, [], {"Leave": 0, "Remain": 0, "Electorate": 0, "Valid_Votes": 0, "Rejected_Ballots": 0}
    for r in R:
        for k in recon:
            recon[k] += int(r[k])
        code = r["Area_Code"]
        if code == "GI":
            continue   # Gibraltar: not part of the UK (only in the reconciliation)
        if code == "N92000002":
            tgt, trail = code, []
        else:
            tgt, trail = current(code, r["Area"], councils, succ)
        if not tgt:
            problems.append((code, r["Area"], trail)); continue
        a = agg.setdefault(tgt, {"code": tgt, "name": councils[tgt]["name"] if tgt in councils else "Northern Ireland", "electorate": 0, "valid": 0, "leave": 0, "remain": 0,
                                 "rejected": 0, "areas_2016": [], "note": "", "source": "Electoral Commission EU referendum results by counting area"})
        for k, f in (("electorate", "Electorate"), ("valid", "Valid_Votes"), ("leave", "Leave"), ("remain", "Remain"), ("rejected", "Rejected_Ballots")):
            a[k] += int(r[f])
        a["areas_2016"].append(f'{code} {r["Area"]}')
        if any(t[3] for t in trail if len(t) == 4):
            a["note"] = "boundary adjusted slightly since 2016"
    for a in agg.values():
        if len(a["areas_2016"]) > 1:
            a["note"] = "; ".join(filter(None, [f"votes added from {len(a['areas_2016'])} councils merged since 2016", a["note"]]))
        elif a["areas_2016"][0].split()[0] != a["code"] and a["code"] != "N92000002":
            a["note"] = "; ".join(filter(None, [f"2016 code {a['areas_2016'][0].split()[0]} (recoded since)", a["note"]]))
        if a["code"] == "N92000002":
            a["note"] = "Northern Ireland counted as one area"
        a["areas_2016"] = " | ".join(a["areas_2016"])
    rows = sorted(agg.values(), key=lambda a: a["code"])
    with open(os.path.join(SRC, "referendum_eu2016.csv"), "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=list(rows[0].keys()))
        w.writeheader(); w.writerows(rows)
    gb = [c for c in councils if c[0] in "ESW"]
    missing = [c for c in gb if c not in agg]
    print(f"EU 2016: {len(R)} counting areas -> {len(rows)} rows ({sum(1 for a in rows if 'merged' in a['note'])} merged, NI one row); "
          f"UK+Gibraltar Leave {recon['Leave']:,} Remain {recon['Remain']:,} ({100 * recon['Leave'] / (recon['Leave'] + recon['Remain']):.2f}% Leave); "
          f"GB councils without a result: {missing}; problems: {problems}")
    return problems or missing


def hanretty():
    """Chris Hanretty's estimates of the Leave share in GB constituencies (2010 boundaries; revised August 2016). The sheet's
    'Figure to use' is the known result where the BBC obtained ward counts, otherwise the modelled estimate."""
    s10 = open(os.path.join(ROOT, "data", "constituencies_2010.js"), encoding="utf-8").read()
    places = json.loads(s10[s10.index('"2010", ') + 8:s10.rindex(")")])["places"]
    rows, problems = [], []
    for r in csv.DictReader(open(os.path.join(RAW, "hanretty_leave_pcon2010.csv"), encoding="utf-8")):
        code = "P10-" + r["PCON11CD"].strip()
        if code not in places:
            problems.append((r["PCON11CD"], r["Constituency"])); continue
        known = r["Known result"].strip() not in ("", "NA")
        rows.append({"code": code, "name": places[code]["name"], "leave_pct": round(100 * float(r["Figure to use"]), 3),
                     "modelled_pct": round(100 * float(r["Estimated Leave proportion"]), 3), "known": int(bool(known)),
                     "note": "known result (ward counts obtained by the BBC)" if known else "modelled estimate",
                     "source": "Chris Hanretty, revised estimates of Leave vote share in Westminster constituencies (Aug 2016)"})
    with open(os.path.join(SRC, "referendum_eu2016_pcon2010.csv"), "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=list(rows[0].keys()))
        w.writeheader(); w.writerows(rows)
    print(f"Hanretty: {len(rows)} GB constituencies on the 2010 boundaries ({sum(r['known'] for r in rows)} known results); unmatched {problems}")
    return problems


def main():
    councils, succ = atlas_councils(), successors()
    bad = eu(councils, succ) or hanretty()
    if bad:
        sys.exit(1)


if __name__ == "__main__":
    main()
