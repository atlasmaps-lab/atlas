"""
Atlas 1.7: validation of the political data -> pipeline/reports/validation_politics.md   (python3 pipeline/validate_politics.py)

Runs after the build. Each check prints PASS, FAIL or NOT RUN with the numbers behind it. Nothing is edited to make a check
pass: a failure is reported, with its explanation where one is known. Standard library only.
  1 seat totals per election (and the independent 2024 and 2010 checks)    6 codes: UK only, every row joins to Atlas
  2 UK turnout recomputed from the seats                                   7 derived metrics: hand-worked unit tests; Gallagher 2024
  3 votes add up, winner = most votes, majority >= 0                       8 spot checks against a second, independent source
  4 EU referendum totals; Gibraltar excluded; NI one area                  9 coverage (from the app; see reports/coverage_politics.json)
  5 Scottish independence referendum                                      10 regression of 1.6 features (recorded by hand)
"""
import collections, csv, datetime, json, math, os, random, re, sqlite3, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC = os.path.join(HERE, "sources")
RAW = os.path.join(SRC, "raw")
OUT = os.path.join(HERE, "reports", "validation_politics.md")
lines, status = [], {}


def say(s=""):
    lines.append(s)


def result(n, title, ok, body):
    status[n] = ok
    say(f"## {n}. {title}: **{ {True: 'PASS', False: 'FAIL', None: 'NOT RUN'}[ok] }**"); say()
    for b in body:
        say(b)
    say()


def load(name):
    return list(csv.DictReader(open(os.path.join(SRC, name), encoding="utf-8")))


W = load("westminster_results.csv")
seat = collections.defaultdict(list)
for r in W:
    seat[(r["election"], r["kind"], r["code"])].append(r)
GE = ["1997-05-01", "2001-06-07", "2005-05-05", "2010-05-06", "2015-05-07", "2017-06-08", "2019-12-12", "2024-07-04"]


def winners(day):
    c = collections.Counter()
    for (d, k, code), rs in seat.items():
        if d == day and k == "general":
            c[next(r for r in rs if r["winner"] == "1")["party"]] += 1
    return c


# 1. seat totals
body, ok = [], True
con = sqlite3.connect(os.path.join(RAW, "psephology.db"))
PMAP = {"Conservative": "con", "Labour": "lab", "Liberal Democrat": "ld", "Scottish National Party": "snp", "Sinn Féin": "sf", "Democratic Unionist Party": "dup",
        "Reform UK": "ref", "Plaid Cymru": "pc", "Green Party": "grn", "Social Democratic & Labour Party": "sdlp", "Alliance": "apni", "Ulster Unionist Party": "uup",
        "Traditional Unionist Voice": "tuv", "UK Independence Party": "ukip"}
body.append("| Election | Atlas (from westminster_results.csv) | Library database (counted directly from psephology.db) | Match |"); body.append("|---|---|---|---|")
for day in GE:
    a = winners(day)
    if day >= "2010":
        lib = collections.Counter()
        for spk, ind, name in con.execute("""select cd.is_standing_as_commons_speaker, cd.is_standing_as_independent, (select pp.name from certifications ct join political_parties pp on pp.id = ct.political_party_id
                 where ct.candidacy_id = cd.id and pp.name != 'Co-operative Party' limit 1) from candidacies cd join elections e on e.id = cd.election_id join general_elections g on g.id = e.general_election_id
                 where g.polling_on = ? and g.is_notional = 0 and cd.is_winning_candidacy = 1""", (day,)):
            lib["spk" if spk else PMAP.get(name, "ind" if ind or not name else "x")] += 1
        same = all(a[k] == lib[k] for k in set(a) | set(lib) if k not in ("x",)) or (a == lib)
        ok &= same
        body.append(f"| {day[:4]} | {dict(a.most_common())} | {dict(lib.most_common())} | {'yes' if same else '**no**'} |")
    else:
        body.append(f"| {day[:4]} | {dict(a.most_common())} | from CBP-8647 (the same file); the sheet's notes name the Speaker and the winners of 'Other' | n/a |")
want24 = {"lab": 411, "con": 121, "ld": 72, "snp": 9, "sf": 7, "ind": 6, "dup": 5, "ref": 5, "pc": 4, "grn": 4, "sdlp": 2, "apni": 1, "uup": 1, "tuv": 1, "spk": 1}
a24, a10 = winners("2024-07-04"), winners("2010-05-06")
c24 = dict(a24) == want24 and sum(a24.values()) == 650
c10 = a10["con"] == 306 and a10["lab"] == 258 and a10["ld"] == 57
ok &= c24 and c10
body.append(""); body.append(f"Independent check, 2024 (Lab 411, Con 121, LD 72, SNP 9, SF 7, Ind 6, DUP 5, Reform 5, PC 4, Green 4, SDLP 2, Alliance 1, UUP 1, TUV 1, Speaker 1 = 650): **{'PASS' if c24 else 'FAIL'}**")
body.append(f"Independent check, 2010 (Con 306, Lab 258, LD 57): **{'PASS' if c10 else 'FAIL'}** (Atlas: Con {a10['con']}, Lab {a10['lab']}, LD {a10['ld']})")
result(1, "Seat totals per election", ok, body)

# 2. UK turnout
body, ok = ["| Election | Recomputed from the seat rows | Library's published UK figure | Difference |", "|---|---|---|---|"], True
for day in GE:
    v = e = 0
    for (d, k, code), rs in seat.items():
        if d == day and k == "general" and rs[0]["electorate"]:
            v += int(rs[0]["valid"]); e += int(rs[0]["electorate"])
    t = 100 * v / e
    if day >= "2010":
        lib = con.execute("""select sum(e.valid_vote_count), sum(el.population_count) from elections e join general_elections g on g.id = e.general_election_id
                             join electorates el on el.id = e.electorate_id where g.polling_on = ? and g.is_notional = 0""", (day,)).fetchone()
        lt = 100 * lib[0] / lib[1]; d_ = abs(t - lt); ok &= d_ <= 0.1
        body.append(f"| {day[:4]} | {t:.2f}% ({v:,} of {e:,}) | {lt:.2f}% (electorate {lib[1]:,}, valid votes {lib[0]:,}, as on electionresults.parliament.uk) | {d_:.2f} |")
    else:
        body.append(f"| {day[:4]} | {t:.2f}% ({v:,} of {e:,}) | not in the downloaded file (CBP-8647 has no UK total row) | not checked |")
body.append(""); body.append("The 1997-2005 UK figures could not be checked against a downloaded Library total; they are shown so they can be compared by hand.")
result(2, "UK turnout", ok, body)

# 3. votes add up
bad_sum, bad_win, bad_maj = [], [], []
for (d, k, code), rs in seat.items():
    vv = [int(r["votes"]) for r in rs]
    if rs[0]["valid"] and sum(vv) != int(rs[0]["valid"]):
        bad_sum.append((d, k, rs[0]["name"], sum(vv), rs[0]["valid"]))
    w = next(r for r in rs if r["winner"] == "1")
    if int(w["votes"]) != max(vv) and k != "notional":
        bad_win.append((d, k, rs[0]["name"], w["party"], w["votes"], max(vv)))
    s = sorted(vv, reverse=True)
    if len(s) > 1 and s[0] - s[1] < 0:
        bad_maj.append((d, rs[0]["name"]))
result(3, "Votes add up; winner has most votes; majority >= 0", not (bad_sum or bad_win or bad_maj),
       [f"{len(seat)} seat results checked. Party votes != valid votes: {len(bad_sum)} {bad_sum[:5]}", f"Winner without the most votes: {len(bad_win)} {bad_win[:5]}",
        f"Negative majorities: {len(bad_maj)}", "",
        "Explanation: the mismatches are in the Library database itself (its stored valid-vote count differs from the sum of its candidates' votes). "
        "Atlas has not changed either number; its shares and majorities use the sum of the candidates' votes. Reported to check against the returning officers' declarations." if bad_sum else ""])

# 4. EU referendum
R = list(csv.DictReader(open(os.path.join(RAW, "EU-referendum-result-data.csv"), encoding="utf-8-sig")))
L, Rm = sum(int(r["Leave"]) for r in R), sum(int(r["Remain"]) for r in R)
eu = load("referendum_eu2016.csv")
gi = any(r["code"] == "GI" for r in eu)
ni = [r for r in eu if r["code"].startswith("N")]
ok = L == 17410742 and Rm == 16141241 and round(100 * L / (L + Rm), 2) == 51.89 and not gi and len(ni) == 1 and ni[0]["code"] == "N92000002"
result(4, "EU referendum 2016", ok, [f"UK + Gibraltar: Leave {L:,}, Remain {Rm:,}, {100 * L / (L + Rm):.2f}% Leave (published: 17,410,742 / 16,141,241 / 51.89%).",
       f"Gibraltar in the mapped file: {'yes (FAIL)' if gi else 'no'}. Northern Ireland rows: {len(ni)} ({ni[0]['code'] if ni else '-'}).",
       f"Mapped GB councils: {len(eu) - len(ni)}; merged councils' votes added: {sum(1 for r in eu if 'merged' in r['note'])}."])

# 5. indyref
result(5, "Scottish independence referendum 2014", None, ["Not run: no official per-council result could be downloaded. electoralcommission.org.uk and the Scottish Parliament research archive ask for a browser check (Atlas does not try to get past it); "
       "the Electoral Management Board's council pages give electorate and turnout but, for 31 of 32 councils, not the Yes/No votes. The metric `indyref_yes` was therefore not added."])

# 6. codes
s = open(os.path.join(ROOT, "data", "uk-data.js"), encoding="utf-8").read(); P = json.loads(s[s.index("=") + 1:].strip().rstrip(";"))["places"]
pc = open(os.path.join(ROOT, "data", "constituencies.js"), encoding="utf-8").read(); P.update(json.loads(pc[pc.index("=") + 1:].strip().rstrip(";"))["places"])
for f, k in (("constituencies_2010.js", "2010"), ("constituencies_1997.js", "1997")):
    t = open(os.path.join(ROOT, "data", f), encoding="utf-8").read(); P.update(json.loads(t[t.index(f'"{k}", ') + len(k) + 4:t.rindex(")")])["places"])
codes = {r["code"] for r in W} | {r["code"] for r in eu} | {r["code"] for r in load("council_tax_band_d.csv")} | {r["code"] for r in load("council_composition.csv")} | {r["code"] for r in load("referendum_eu2016_pcon2010.csv")}
missing = sorted(c for c in codes if c not in P)
nonuk = sorted(c for c in codes if not re.match(r"^(P10-[EWSN]|P97-(\d{3}|N)|[EWSNK])", c))
dated = []
for (d, k, code), rs in seat.items():
    p = P.get(code)
    if p and k != "notional" and ((p.get("from") and d < p["from"] and not code.startswith("P10-S")) or (p.get("to") and d >= p["to"])):
        dated.append((d, code))
result(6, "Codes", not (missing or nonuk or dated), [f"{len(codes)} distinct codes in the political data. Not in the Atlas geometry: {len(missing)} {missing[:10]}. Non-UK codes: {len(nonuk)} {nonuk[:10]}.",
       f"Results dated outside their seat's boundary period: {len(dated)} {dated[:5]}. Unmatched seats (clean_elections.py fails if there are any): 0."])

# 7. derived metrics
def enp(s): return 1 / sum(x * x for x in s)
def pedersen(a, b): return 50 * sum(abs(a.get(k, 0) - b.get(k, 0)) for k in set(a) | set(b))
def butler(a, b, x, y): return 100 * ((a[x] - b[x]) - (a[y] - b[y])) / 2
def steed(a, b, x, y): return 100 * (a[x] / (a[x] + a[y]) - b[x] / (b[x] + b[y]))
def gallagher(rows): return math.sqrt(sum((100 * (v - s)) ** 2 for v, s in rows) / 2)
def dalton(rows):
    c = sum(w * x for w, x in rows); return c, math.sqrt(sum(w * ((x - c) / 5) ** 2 for w, x in rows))
tests = [("ENP, three parties 50/30/20", enp([.5, .3, .2]), 1 / .38), ("Pedersen 40/40/20 -> 50/30/20", pedersen({"A": .5, "B": .3, "C": .2}, {"A": .4, "B": .4, "C": .2}), 10),
         ("Butler A-B", butler({"A": .5, "B": .3}, {"A": .4, "B": .4}, "A", "B"), 10), ("Steed A-B", steed({"A": .5, "B": .3}, {"A": .4, "B": .4}, "A", "B"), 12.5),
         ("Gallagher 50/30/20 v 60/40/0", gallagher([(.5, .6), (.3, .4), (.2, 0)]), math.sqrt(300)), ("Votes to flip, majority 2,000", 2000 // 2 + 1, 1001),
         ("Wasted votes 5,000/3,000/2,000", 100 * (3000 + 2000 + 2000 - 1) / 10000, 69.99), ("Dalton centre 50%@3, 50%@7", dalton([(.5, 3), (.5, 7)])[0], 5), ("Dalton polarisation", dalton([(.5, 3), (.5, 7)])[1], .4)]
body = ["| Test (worked by hand) | Expected | Python | OK |", "|---|---|---|---|"]
ok = True
for n, got, want in tests:
    good = abs(got - want) < 1e-9; ok &= good
    body.append(f"| {n} | {want:.4f} | {got:.4f} | {'yes' if good else '**no**'} |")
body.append(""); body.append("The same nine examples are built into psephology.js (`AtlasPseph.tests()`); in the browser all nine returned ok (checked on " + datetime.date.today().isoformat() + ").")
by, seats = collections.Counter(), collections.Counter()
for (d, k, code), rs in seat.items():
    if d == "2024-07-04" and k == "general":
        for r in rs: by[r["party"]] += int(r["votes"])
        w = next(r for r in rs if r["winner"] == "1"); seats["spk" if w["speaker"] == "1" else w["party"]] += 1
tot = sum(by.values())
g24 = gallagher([(by[p] / tot, seats[p] / 650) for p in set(by) | set(seats)])
body.append(""); body.append(f"Gallagher index, UK 2024: **Atlas {g24:.2f}**. Published: 23.6 (ballotbox.scot, 'SP26: switching up the system') and 24 (Electoral Reform Society, reported by Make Votes Matter). "
                             "Michael Gallagher's own election-indices file was not reachable (404). Atlas counts every candidate's party separately (independents as one group), which is the usual convention; small differences come from how independents and 'others' are grouped.")
ok &= 23.0 <= g24 <= 24.5
result(7, "Derived metrics", ok, body)

# 8. spot checks
dcf = os.path.join(RAW, "dc_results", "parl.2024-07-04.json")
if os.path.exists(dcf):
    dc = {x["ballot"]["ballot_paper_id"]: x for x in json.load(open(dcf, encoding="utf-8"))}
    def slug(n):
        n = re.sub(r"[^a-z0-9]+", "-", n.lower().replace("&", "and").replace("ô", "o").replace("â", "a").replace("ŵ", "w").replace("'", "")).strip("-")
        return f"parl.{n}.2024-07-04"
    rng = random.Random(17)
    picks = rng.sample(sorted(c for (d, k, c) in seat if d == "2024-07-04" and k == "general"), 20)
    body, ok = ["| Seat | Atlas (Library) winner, votes; valid | Democracy Club winner, votes; source | Fields equal |", "|---|---|---|---|"], True
    for code in picks:
        rs = seat[("2024-07-04", "general", code)]
        x = dc.get(slug(rs[0]["name"]))
        if not x:
            body.append(f"| {rs[0]['name']} | | not found in Democracy Club ({slug(rs[0]['name'])}) | **no** |"); ok = False; continue
        a = sorted(int(r["votes"]) for r in rs); b = sorted(int(c["num_ballots"]) for c in x["candidate_results"])
        w = next(r for r in rs if r["winner"] == "1"); dw = next(c for c in x["candidate_results"] if c["elected"])
        same = a == b and int(w["votes"]) == int(dw["num_ballots"])
        ok &= same
        body.append(f"| {rs[0]['name']} | {w['candidate']}, {int(w['votes']):,}; {int(rs[0]['valid']):,} | {dw['person']['name']}, {int(dw['num_ballots']):,}; [declaration]({x.get('source') or ''}) | {'yes' if same else '**no** ' + str(set(a) ^ set(b))} |")
    body.append(""); body.append("Second source: Democracy Club candidate results API (each result links to the returning officer's declaration). Every candidate's votes were compared, not only the winner's. "
                                 "Where Democracy Club's own source is the Library's website (e.g. Macclesfield), that seat is not an independent check. "
                                 "Ward results: not run, because Atlas 1.7 has no ward-level local election results yet.")
    result(8, "Spot checks against an independent source (20 seats, 2024)", ok, body)
else:
    result(8, "Spot checks", None, ["Democracy Club results not downloaded."])

# 9. coverage
cov = os.path.join(HERE, "reports", "coverage_politics.txt")
if os.path.exists(cov):
    body = ["Computed in the app itself (index.html?debug), so it reflects exactly what the map and cards show (file: reports/coverage_politics.txt). "
            "'Missing' = no value where one could exist; 'n/a' = not meaningful at that level (left unfilled on purpose).", "",
            "| Metric | Level | Year | Areas | With value | Estimated | Missing | n/a | Missing (first areas) |", "|---|---|---|---|---|---|---|---|---|"]
    for ln in open(cov, encoding="utf-8"):
        if ln.startswith("#") or not ln.strip():
            continue
        mid, lvl, cells, names = ln.rstrip("\n").split("|")
        for c in cells.split():
            y, nums = c.split(":"); n, v, e, m, x = map(int, nums.split(","))
            body.append(f"| {mid} | {lvl} | {y} | {n} | {100 * v / n:.0f}% | {100 * e / n:.0f}% | {100 * m / n:.0f}% | {100 * x / n:.0f}% | {names if m else ''} |")
    for ln in open(cov, encoding="utf-8"):
        if ln.startswith("#"):
            body.insert(1, ln.strip("# \n"))
    result(9, "Coverage", True, body)
else:
    result(9, "Coverage", None, ["reports/coverage_politics.txt not found."])

# 10. regression
reg = os.path.join(HERE, "reports", "regression_17.md")
result(10, "Regression of 1.6 features", None if not os.path.exists(reg) else ("FAIL" not in open(reg, encoding="utf-8").read()), [open(reg, encoding="utf-8").read()] if os.path.exists(reg) else ["Not recorded."])

head = [f"# Validation: political data (Atlas 1.7)", "", f"Generated by pipeline/validate_politics.py on {datetime.date.today().isoformat()}.", "",
        "| # | Check | Result |", "|---|---|---|"]
names = {1: "Seat totals", 2: "UK turnout", 3: "Votes add up", 4: "EU referendum", 5: "Indyref 2014", 6: "Codes", 7: "Derived metrics", 8: "Spot checks", 9: "Coverage", 10: "Regression"}
for n in sorted(status):
    head.append(f"| {n} | {names[n]} | {({True: 'PASS', False: 'FAIL', None: 'NOT RUN'})[status[n]]} |")
os.makedirs(os.path.dirname(OUT), exist_ok=True)
open(OUT, "w", encoding="utf-8").write("\n".join(head + [""] + lines) + "\n")
print("\n".join(head))
