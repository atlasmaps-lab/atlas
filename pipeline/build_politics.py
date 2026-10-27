"""
Atlas 1.2: political history -> data/politics.js   (python3 pipeline/build_politics.py, standard library only)

sources/council_control_history.csv   party in control of each council over time (Wikipedia; fetch_politics.py)
sources/council_leaders_history.csv   council leaders over time (Wikipedia; fetch_politics.py)
sources/council_politics.csv          council control and leader in October 2026 (wins over the history for "now")
sources/government_history.csv        Prime Ministers, First Ministers and Mayors of London since 1974
sources/government_coalitions.csv     coalition partners in UK, Scottish and Welsh governments (cited, one row per coalition)
"""
import csv, json, os

HERE = os.path.dirname(os.path.abspath(__file__))
SRC, DATA = os.path.join(HERE, "sources"), os.path.join(os.path.dirname(HERE), "data")
NOW = "2026-10-20"
LAST_ELECTION = "2026-05-07"
PARTIES = {  # key: name, colour (the parties' own colours, adjusted to sit on a map)
    "lab": ["Labour", "#d50032"], "con": ["Conservative", "#0a7bd6"], "ld": ["Liberal Democrats", "#f5a623"],
    "ref": ["Reform UK", "#14b5c9"], "grn": ["Green", "#3aa655"], "snp": ["SNP", "#f2d94e"], "pc": ["Plaid Cymru", "#00715f"],
    "ind": ["Independents & residents", "#a58fb8"], "noc": ["No overall control", "#c9c3b6"], "lib": ["Liberal / SDP (before 1988)", "#ee8a3c"],
    "ukip": ["UKIP", "#7a2c8f"], "oth": ["Other local party", "#8c7a6b"],
    "sf": ["Sinn Féin", "#2c7a5b"], "dup": ["DUP", "#b84a3a"], "uup": ["UUP", "#5aa0d8"], "cttee": ["Committee system (no party control)", "#d8d2c4"],
}


def read(n):
    return list(csv.DictReader(open(os.path.join(SRC, n), encoding="utf-8-sig")))


def main():
    import importlib.util, sys
    sys.path.insert(0, HERE)
    from fetch_politics import norm_party
    current = {r["code"]: r for r in read("council_politics.csv")}
    control, leaders, articles = {}, {}, {}
    for r in read("council_control_history.csv"):
        control.setdefault(r["code"], []).append([r["start"], r["end"] or None, r["party"]])
        articles[r["code"]] = r["wikipedia_article"]
    for r in read("council_leaders_history.csv"):
        leaders.setdefault(r["code"], []).append([r["start"], r["end"] or None, r["party"], r["leader"]])
    approx = []
    for code, r in current.items():
        if code.startswith("N09"):   # created 1 April 2015; run by committees
            control[code] = [["2015-04-01", None, "cttee"]]; continue
        if code == "E09000001":
            control[code] = [["1974-01-01", None, "ind"]]; continue
        now = norm_party(r["control"]) if r["control"] else None
        rows = sorted(control.get(code, []), key=lambda x: x[0])
        # make each row end where the next begins, and the last one open-ended
        for a, b in zip(rows, rows[1:]):
            if a[1] is None or a[1] > b[0]: a[1] = b[0]
        if now:
            last = rows[-1] if rows else None
            if last and last[2] == now:
                last[1] = None
            elif last and last[1] is None and last[0] >= LAST_ELECTION:
                last[2] = now   # same change, newer source
            else:
                start = max(LAST_ELECTION, last[1] or last[0]) if last else LAST_ELECTION
                if last and last[1] is None: last[1] = start
                rows.append([start, None, now]); approx.append(code)
        control[code] = rows
    gov = {}
    for r in read("government_history.csv"):
        gov.setdefault(r["code"], []).append([r["start"], r["end"] or None, r["party"], r["leader"], r["title"], r["note"]])
    gov["E92000001"] = [x[:5] + ["England has no devolved government: the UK Government governs it directly"] for x in gov["K02000001"]]
    # 1.7: coalition partners (sources/government_coalitions.csv, each row cited); England follows the UK Government
    coal = {}
    for r in read("government_coalitions.csv"):
        coal.setdefault(r["code"], []).append([r["start"], r["end"] or None, r["parties"].split(";"), r["description"]])
    coal["E92000001"] = coal.get("K02000001", [])
    out = {"now": NOW, "start": "1974-05-01", "parties": PARTIES, "control": control, "leaders": leaders, "gov": gov,
           "approx": approx, "articles": articles, "coalitions": coal}
    with open(os.path.join(DATA, "politics.js"), "w") as fh:
        fh.write("window.ATLAS_POL = " + json.dumps(out, separators=(",", ":"), ensure_ascii=False) + ";\n")
    print(f"Political history: {len(control)} councils, {sum(map(len, control.values()))} periods of control, "
          f"{sum(map(len, leaders.values()))} leaders. {len(approx)} councils' latest change dated to the May 2026 elections (approximate).")


if __name__ == "__main__":
    main()
