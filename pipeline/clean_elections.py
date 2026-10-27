"""
Atlas 1.7: Westminster general elections and by-elections, 1997-2024 -> sources/westminster_results.csv
(python3 pipeline/clean_elections.py; standard library only)

Inputs (see sources/MANIFEST.csv):
  sources/raw/psephology.db                       House of Commons Library, Election Results database (electionresults.parliament.uk):
                                                  general elections 2010-2024, every by-election since 2010, and the Library's
                                                  notional results (2005 on the 2010 boundaries; 2019 on the 2024 boundaries)
  sources/raw/1918-2019election_results_by_pcon.xlsx
                                                  House of Commons Library briefing CBP-8647: results by constituency 1918-2019
                                                  (used for 1997, 2001 and 2005 only). Parties other than the main ones are one
                                                  "Other" column, so a seat won by "Other" takes its winner's party from the
                                                  UK Parliament Members API history already in data/constituencies.js
  data/constituencies.js, data/constituencies_2010.js, data/constituencies_1997.js
                                                  the Atlas codes each result joins to

Output: one row per candidate (2010 onwards) or per party column (1997-2005):
  election, kind (general | by | notional), set (1997 | 2005S | 2010 | 2024), code (Atlas), source_code, name, nation, region,
  electorate, valid, invalid, party (Atlas key), party_name, candidate, votes, winner, speaker, est, source
Nothing is estimated here except the Library's notional results (est = 1). Unmatched seats are listed and the script fails.
"""
import csv, json, os, re, sqlite3, sys, unicodedata

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC = os.path.join(HERE, "sources")
sys.path.insert(0, HERE)
from xlsx_read import rows as xlsx_rows

DB = os.path.join(SRC, "raw", "psephology.db")
XLSX = os.path.join(SRC, "raw", "1918-2019election_results_by_pcon.xlsx")
OUT = os.path.join(SRC, "westminster_results.csv")
NATION_NAME = {"England": "E92000001", "Wales": "W92000004", "Scotland": "S92000003", "Northern Ireland": "N92000002"}

# party names as the Library writes them -> Atlas party keys (anything else keeps its own key "x-<abbreviation>")
PARTY = {
    "Conservative": "con", "Labour": "lab", "Labour ": "lab", "Liberal Democrat": "ld", "Liberal Democrats": "ld", "Scottish National Party": "snp", "SNP": "snp",
    "Plaid Cymru": "pc", "Green Party": "grn", "Scottish Green Party": "grn", "Green Party Northern Ireland": "grn", "Reform UK": "ref",
    "The Brexit Party": "brx", "UK Independence Party": "ukip", "Democratic Unionist Party": "dup", "DUP": "dup", "Sinn Féin": "sf", "Sinn Fein": "sf", "SF": "sf",
    "Social Democratic & Labour Party": "sdlp", "SDLP": "sdlp", "Ulster Unionist Party": "uup", "UUP": "uup", "UU": "uup", "Alliance": "apni",
    "Traditional Unionist Voice": "tuv", "UKUP": "ukup", "Workers Party of Britain": "wpb", "Respect Party": "resp", "British National Party": "bnp",
    "The Independent Group for Change": "chuk", "Alba Party": "alba", "Aontú": "aont", "People Before Profit Alliance": "pbp", "Other": "oth",
    "Co-operative Party": None,   # joint Labour and Co-operative candidates count as Labour (the Library does the same)
}
# Atlas spans party keys (Members API) for seats won by the xlsx's "Other" column
SPAN_PARTY = {"spk": "spk", "ind": "ind", "oth": "oth", "resp": "resp", "ukup": "ukup"}


def norm(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower()
    s = re.sub(r"[^a-z0-9]+", " ", s.replace("&", " and ")).strip()
    return re.sub(r"\bst\b", "saint", s)


def load_js(path, key=None):
    s = open(path, encoding="utf-8").read()
    if key:
        i = s.index('"%s", ' % key) + len(key) + 4
        return json.loads(s[i:s.rindex(")")])
    return json.loads(s[s.index("=") + 1:].strip().rstrip(";"))


def atlas_sets():
    cur = load_js(os.path.join(ROOT, "data", "constituencies.js"))
    s10 = load_js(os.path.join(ROOT, "data", "constituencies_2010.js"), "2010")
    s97 = load_js(os.path.join(ROOT, "data", "constituencies_1997.js"), "1997")
    return cur, s10, s97


def span_at(spans, code, d):
    for s in spans.get(code, []):
        if s[0] <= d and (not s[1] or d < s[1]):
            return s
    return None


def from_db(places):
    con = sqlite3.connect(DB)
    q = lambda sql, *a: con.execute(sql, a).fetchall()
    country = {r[0]: r[1] for r in q("select id, geographic_code from countries")}
    region = {r[0]: r[1] for r in q("select id, geographic_code from english_regions")}
    ge = {r[0]: (r[1], r[2]) for r in q("select id, polling_on, is_notional from general_elections")}
    out, unmatched = [], []
    elections = q("""select e.id, e.polling_on, e.general_election_id, e.valid_vote_count, e.invalid_vote_count, el.population_count,
                            ca.name, ca.geographic_code, ca.country_id, ca.english_region_id, bs.start_on, e.is_notional
                     from elections e join constituency_groups cg on cg.id = e.constituency_group_id
                     join constituency_areas ca on ca.id = cg.constituency_area_id join boundary_sets bs on bs.id = ca.boundary_set_id
                     left join electorates el on el.id = e.electorate_id order by e.polling_on, ca.name""")
    for eid, day, geid, valid, invalid, electorate, name, gss, cid, rid, set_start, notional in elections:
        st = "2024" if set_start >= "2024" else "2005S" if set_start.startswith("2005") else "2010"
        code = gss if st == "2024" else "P10-" + gss
        if code not in places:
            unmatched.append((day, name, gss)); continue
        kind = "notional" if notional or (geid and ge[geid][1]) else "general" if geid else "by"
        cands = q("""select cd.id, cd.candidate_given_name, cd.candidate_family_name, cd.vote_count, cd.is_winning_candidacy,
                            cd.is_standing_as_commons_speaker, cd.is_standing_as_independent, group_concat(pp.name, '|'), group_concat(pp.abbreviation, '|')
                     from candidacies cd left join certifications ct on ct.candidacy_id = cd.id left join political_parties pp on pp.id = ct.political_party_id
                     where cd.election_id = ? group by cd.id order by cd.vote_count desc""", eid)
        for _, given, family, votes, win, spk, ind, pnames, pabbr in cands:
            names = [n for n in (pnames or "").split("|") if n and PARTY.get(n, "") is not None]
            pname = names[0] if names else ("Speaker" if spk else "Independent" if ind else "Other")
            party = "spk" if spk else PARTY.get(pname) or ("ind" if ind or not pnames else "x-" + re.sub(r"\W", "", (pabbr or pname).split("|")[0]).lower())
            if kind == "notional" and not pnames and not spk:
                party, pname = "oth", "Other (notional aggregate)"
            out.append({"election": day, "kind": kind, "set": st, "code": code, "source_code": gss, "name": name, "nation": country.get(cid) or "",
                        "region": region.get(rid) or "", "electorate": electorate or "", "valid": valid if valid is not None else "",
                        "invalid": invalid if invalid is not None else "", "party": party, "party_name": pname,
                        "candidate": " ".join(x for x in (given, family) if x), "votes": votes if votes is not None else "",
                        "winner": int(bool(win)), "speaker": int(bool(spk)), "est": int(kind == "notional"),
                        "source": "HoC Library Election Results database" + (" (notional)" if kind == "notional" else "")})
    return out, unmatched


_HIST = None
def member_party(name, day):
    global _HIST
    if _HIST is None:
        _HIST = json.load(open(os.path.join(SRC, "constituency_history.json"), encoding="utf-8"))
    ids = {r[0] for c in _HIST["constituencies"] for r in c["r"] if r[1] == name}
    for mid in ids:
        for ps, pe, party in _HIST["partyHistory"].get(str(mid), []):
            if ps <= day and (not pe or day < pe):
                return party
    return None


def from_xlsx(cur, s97, s10, spans):
    """1997, 2001 and 2005 from CBP-8647. 1997 and 2001: the 1997 set everywhere. 2005: Scotland on its new 2005 set (GSS codes
    in the sheet), the rest of the UK still on the 1997 set."""
    by97 = {}
    for code, p in s97["places"].items():
        by97[(p["nation"], norm(p["name"]))] = code
    aliases = json.load(open(os.path.join(SRC, "constituency_name_aliases.json"), encoding="utf-8")) if os.path.exists(os.path.join(SRC, "constituency_name_aliases.json")) else {}
    out, unmatched = [], []
    for year, day in (("1997", "1997-05-01"), ("2001", "2001-06-07"), ("2005", "2005-05-05")):
        rows = xlsx_rows(XLSX, year)
        h1, h2 = rows[2], rows[3]
        cols, last = [], None
        for i, (a, b) in enumerate(zip(h1, h2)):
            if a and str(a).strip() not in ("id",):
                last = str(a).strip()
            if b and str(b).strip().lower() == "votes" and last:
                cols.append((i, last))
        tv = next(i for i, b in enumerate(h2) if b and str(b).strip().lower() == "total votes")
        for r in rows[4:]:
            if not r or len(r) < 7 or not r[2] or r[6] is None:
                continue
            sid, name, country, electorate = r[1], str(r[2]).strip(), str(r[5]).strip(), int(r[6])
            sid = str(int(sid)) if isinstance(sid, float) else str(sid)
            nat = NATION_NAME.get(country)
            if not nat:
                unmatched.append((year, name, "country " + country)); continue
            if year == "2005" and nat == "S92000003":
                code = "P10-" + str(sid)
                if code not in s10["places"]:
                    unmatched.append((year, name, sid)); continue
                st = "2005S"
            else:
                key = aliases.get(year + ":" + norm(name)) or norm(name)
                code = by97.get((nat, key))
                if not code:
                    unmatched.append((year, name, nat)); continue
                st = "1997"
            place = s97["places"].get(code) or s10["places"].get(code)
            parties = []
            for i, label in cols:
                v = r[i] if i < len(r) else None
                if v in (None, "") or float(v) == 0:
                    continue
                key = {"PC/SNP": "pc" if nat == "W92000004" else "snp"}.get(label) or PARTY.get(label)
                pname = {"pc": "Plaid Cymru", "snp": "SNP"}.get(key, label) if label == "PC/SNP" else label
                parties.append([key, pname, int(round(float(v)))])
            valid = int(round(float(r[tv])))
            if sum(p[2] for p in parties) != valid:
                unmatched.append((year, name, f"party votes {sum(p[2] for p in parties)} != total {valid}"))
            parties.sort(key=lambda p: -p[2])
            top = parties[0]
            spk = 0
            if top[0] == "oth":
                # the winner stood for a party the sheet folds into "Other": take who won from the Members API history
                s = span_at(spans, code, (day[:8] + "%02d" % (int(day[8:]) + 1)))
                if s:
                    k, pname = s[2], {"spk": "Speaker", "ind": "Independent"}.get(s[2], s[2])
                    if k == "oth":   # Atlas folds small parties into "oth"; the Members API history has the real party name
                        pname = member_party(s[3], day) or "Other"
                        k = PARTY.get(pname) or "oth"
                    top[0], top[1] = SPAN_PARTY.get(k, k), pname
                    spk = int(k == "spk")
                    top.append(s[3])
            for j, p in enumerate(parties):
                out.append({"election": day, "kind": "general", "set": st, "code": code, "source_code": sid, "name": place["name"], "nation": nat,
                            "region": place["parent"] if place["parent"].startswith("E12") else "", "electorate": electorate, "valid": valid, "invalid": "",
                            "party": p[0], "party_name": p[1], "candidate": p[3] if len(p) > 3 else "", "votes": p[2], "winner": int(j == 0),
                            "speaker": spk if j == 0 else 0, "est": 0, "source": "HoC Library CBP-8647" + (" + Members API (winner of 'Other')" if len(p) > 3 else "")})
    return out, unmatched


def main():
    cur, s10, s97 = atlas_sets()
    places = dict(cur["places"]); places.update(s10["places"])
    db_rows, un1 = from_db(places)
    x_rows, un2 = from_xlsx(cur, s97, s10, cur.get("spans", {}))
    rows = x_rows + db_rows
    with open(OUT, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=list(rows[0].keys()))
        w.writeheader(); w.writerows(rows)
    seats = {}
    for r in rows:
        seats.setdefault((r["election"], r["kind"]), set()).add(r["code"])
    for k in sorted(seats):
        print(k, len(seats[k]), "seats")
    problems = un1 + un2
    print(f"{len(rows)} rows -> {os.path.relpath(OUT, ROOT)}; problems: {len(problems)}")
    for p in problems:
        print("  ", p)
    if problems:
        sys.exit(1)


if __name__ == "__main__":
    main()
