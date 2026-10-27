"""
Atlas 1.7: election results -> data/elections.js   (python3 pipeline/build_elections.py; standard library only)

Reads the tidy files the clean_* scripts write (sources/westminster_results.csv, and the referendum files when present) and
packs them for the browser. No values are computed here: shares, majorities, swings and indices are worked out in the app
(psephology.js), from these votes, so the same formula serves every level.

window.ATLAS_EL = {
  elections: [[id, polling day, kind (general|by|notional), boundary set, label], ...],
  res:       { atlas code: [[election index, electorate, valid, invalid, winner name, speaker 0/1, est 0/1, party, votes, party, votes, ...], ...] },
  area:      { atlas code: [nation code, English region code or ""] }   so totals don't depend on which boundary files are loaded
  parties:   { key: [name, colour] }   parties not already in data/politics.js
  sources:   { westminster: "...", ... }
}
"""
import csv, json, os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC = os.path.join(HERE, "sources")
OUT = os.path.join(ROOT, "data", "elections.js")

# each party's own colour where it has a recognised one (Speaker grey, as the Commons shows it); small parties share a grey
PARTY_COLOURS = {
    "apni": ["Alliance", "#f6cb2f"], "sdlp": ["SDLP", "#2aa82c"], "tuv": ["TUV", "#0c3a6a"], "ukup": ["UK Unionist Party", "#9999cc"],
    "brx": ["Brexit Party", "#12b6cf"], "ukip": ["UKIP", "#70147a"], "spk": ["Speaker", "#7f7f7f"], "wpb": ["Workers Party of Britain", "#7e1f22"],
    "yp": ["Your Party", "#b0305c"], "resp": ["Respect", "#46801c"], "bnp": ["BNP", "#2e3b74"], "chuk": ["Change UK", "#222222"],
    "alba": ["Alba", "#005eb8"], "aont": ["Aontú", "#44532a"], "pbp": ["People Before Profit", "#e91d50"], "oth": ["Other", "#9b9b9b"],
}


def main():
    rows = list(csv.DictReader(open(os.path.join(SRC, "westminster_results.csv"), encoding="utf-8")))
    labels = {"general": "general election", "by": "by-election", "notional": "general election (notional, on the new boundaries)"}
    keys = []
    for r in rows:
        k = (r["election"], r["kind"], r["set"])
        if k not in keys:
            keys.append(k)
    keys.sort(key=lambda k: (k[0], {"notional": 0, "general": 1, "by": 2}[k[1]], k[2]))
    # one entry per (day, kind); a general election spans boundary sets (e.g. 2005: Scotland's new set + the 1997 set)
    elections, index = [], {}
    for day, kind, st in keys:
        eid = f"{kind[:2]}{day}"
        if eid not in index:
            index[eid] = len(elections)
            elections.append([eid, day, kind, st, f"{day[:4]} {labels[kind]}"])
    res, names, seen = {}, {}, set()
    by_seat = {}
    for r in rows:
        by_seat.setdefault((r["code"], r["election"], r["kind"]), []).append(r)
        names.setdefault(r["party"], r["party_name"])
    area = {}
    for r in rows:
        area[r["code"]] = [r["nation"], r["region"]]
    for (code, day, kind), rs in by_seat.items():
        rs.sort(key=lambda r: -int(r["votes"] or 0))
        w = next((r for r in rs if r["winner"] == "1"), rs[0])
        rec = [index[f"{kind[:2]}{day}"], int(w["electorate"] or 0) or None, int(w["valid"] or 0) or None, int(w["invalid"]) if w["invalid"] else None,
               w["candidate"], int(any(r["speaker"] == "1" for r in rs)), int(w["est"] == "1")]
        for r in rs:
            rec += [r["party"], int(r["votes"] or 0)]
            seen.add(r["party"])
        res.setdefault(code, []).append(rec)
    for code in res:
        res[code].sort(key=lambda x: (elections[x[0]][1], {"notional": 0, "general": 1, "by": 2}[elections[x[0]][2]]))
    politics = open(os.path.join(ROOT, "data", "politics.js"), encoding="utf-8").read()
    known = json.loads(politics[politics.index("=") + 1:].strip().rstrip(";"))["parties"]
    parties = {}
    for k in sorted(seen):
        if k in known:
            continue
        parties[k] = PARTY_COLOURS.get(k) or [names.get(k, k), "#b3aaa0"]
    ref = {}
    p_eu = os.path.join(SRC, "referendum_eu2016.csv")
    if os.path.exists(p_eu):   # council: [electorate, valid, leave, remain, rejected, note]
        ref["eu"] = {r["code"]: [int(r["electorate"]), int(r["valid"]), int(r["leave"]), int(r["remain"]), int(r["rejected"]), r["note"]]
                     for r in csv.DictReader(open(p_eu, encoding="utf-8"))}
    p_pc = os.path.join(SRC, "referendum_eu2016_pcon2010.csv")
    if os.path.exists(p_pc):   # 2010-set constituency: [leave %, known result 0/1]
        ref["eu_pcon"] = {r["code"]: [float(r["leave_pct"]), int(r["known"])] for r in csv.DictReader(open(p_pc, encoding="utf-8"))}
    ches = {}
    p_ch = os.path.join(SRC, "ches_uk_lrgen.csv")
    if os.path.exists(p_ch):   # wave year -> {party: lrgen}
        for r in csv.DictReader(open(p_ch, encoding="utf-8")):
            ches.setdefault(r["wave"], {})[r["party"]] = float(r["lrgen"])
    out = {"elections": elections, "res": res, "area": area, "parties": parties, "ref": ref, "ches": ches,
           "sources": {"ches": "Chapel Hill Expert Survey trend file 1999-2024 (lrgen, 0 = far left, 10 = far right)", "eu": "Electoral Commission: EU referendum results by counting area (2016); merged councils joined with ONS's Code History Database",
                       "eu_pcon": "Chris Hanretty, revised estimates of Leave vote share in Westminster constituencies (August 2016), 2010 boundaries, Great Britain",
                       "westminster": "House of Commons Library: Election Results database (electionresults.parliament.uk; general elections 2010-2024, "
                                      "by-elections since 2010, notional 2005 and 2019 results) and briefing CBP-8647 (1997, 2001, 2005). Open Parliament Licence v3.0"}}
    with open(OUT, "w", encoding="utf-8") as fh:
        fh.write("// Generated by pipeline/build_elections.py. Do not edit by hand.\nwindow.ATLAS_EL = ")
        json.dump(out, fh, ensure_ascii=False, separators=(",", ":"))
        fh.write(";\n")
    print(f"elections.js: {len(elections)} elections, {len(res)} seats, {len(parties)} extra parties, {os.path.getsize(OUT) / 1e6:.2f} MB")


if __name__ == "__main__":
    main()
