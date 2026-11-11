"""
Atlas 0.10: benefits and award levels by council, from DWP Stat-Xplore -> data/benefits_statxplore.json
   STATXPLORE_API_KEY=... python3 pipeline/fetch_benefits_statxplore.py
   then python3 pipeline/fetch_people.py --offline   (folds it into data/people.js)

Needs a free Stat-Xplore account (stat-xplore.dwp.gov.uk → Account → Open Data API key). Keep the key in the environment
(or a GitHub Actions secret), never in the site. Without a key this script does nothing and says so.

It finds each dataset through Stat-Xplore's own catalogue (the /schema endpoints), so it doesn't depend on internal ids:
  Households on Universal Credit (count, and the mean award where the dataset has it)
  People on Universal Credit (count, by conditionality regime where available)
  Housing Benefit (claimants, mean weekly award)
  Personal Independence Payment, Attendance Allowance, Pension Credit, Carer's Allowance (claimants)
for every council, at the latest month. OGL v3.0 (DWP).
NOTE: written without a key to test against (Stat-Xplore was down for maintenance); run it once with --verbose and check
the report it prints against the Stat-Xplore web tables before relying on it.
"""
import json, os, re, subprocess, sys, time, datetime
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
API = "https://stat-xplore.dwp.gov.uk/webapi/rest/v1/"
KEY = os.environ.get("STATXPLORE_API_KEY", "").strip()
VERBOSE = "--verbose" in sys.argv
WANT = [  # (Atlas id, words in the dataset's name, measure words for the count, measure words for the mean award or None)
    ("uc_households", ["universal credit", "households"], ["households"], ["mean", "award"]),
    ("uc_people", ["people on universal credit"], ["people"], None),
    ("hb", ["housing benefit"], ["claimants", "count"], ["average", "mean", "weekly award"]),
    ("pip", ["personal independence payment", "cases with entitlement"], ["cases", "count"], None),
    ("aa", ["attendance allowance", "cases with entitlement"], ["cases", "count"], None),
    ("pc", ["pension credit", "claimants"], ["claimants", "count"], ["average", "mean", "weekly award"]),
    ("ca", ["carer's allowance", "cases with entitlement"], ["cases", "count"], None),
]


def call(path, body=None):
    cmd = ["curl", "-sS", "-m", "300", "-H", "APIKey: " + KEY, "-H", "Content-Type: application/json"] + (["--data", json.dumps(body)] if body is not None else []) + [API + path]
    for i in range(4):
        r = subprocess.run(cmd, capture_output=True)
        if r.returncode == 0 and r.stdout:
            try: return json.loads(r.stdout)
            except ValueError: pass
        time.sleep(5 * (i + 1))
    raise SystemExit(f"Stat-Xplore didn't answer for {path}")


def walk(node, out):   # the schema is a tree of folders, databases, measures, fields
    out.append(node)
    for c in node.get("children", []) or []: walk(c, out)
    return out


def main():
    if not KEY: print("No STATXPLORE_API_KEY set: nothing to do. Register at stat-xplore.dwp.gov.uk and set the key in the environment."); return
    dbs = [n for n in walk(call("schema"), []) if n.get("type") == "DATABASE"]
    out = {"built": datetime.date.today().isoformat(), "source": "DWP Stat-Xplore (OGL v3.0)", "v": {}, "meta": {}}
    for aid, words, cw, mw in WANT:
        db = next((d for d in dbs if all(w in d["label"].lower() for w in words)), None)
        if not db: print("not found:", aid); continue
        info = call("schema/" + db["id"]); items = walk(info, [])
        measures = [n for n in items if n.get("type") in ("COUNT", "MEASURE")]
        cm = next((m for m in measures if any(w in m["label"].lower() for w in cw)), measures[0] if measures else None)
        am = next((m for m in measures if mw and all(any(w in m["label"].lower() for w in [x]) for x in mw[:1])), None) if mw else None
        fields = [n for n in items if n.get("type") == "FIELD"]
        geo = next((f for f in fields if re.search(r"national.*region.*local authority|local authority", f["label"], re.I)), None)
        month = next((f for f in fields if re.search(r"^month|quarter", f["label"], re.I)), None)
        if not (cm and geo and month): print("couldn't find measure, geography or date for", aid); continue
        gv = call("schema/" + geo["id"]); levels = [c for c in walk(gv, []) if c.get("type") == "VALUESET" and re.search(r"local authority", c.get("label", ""), re.I)]
        mv = call("schema/" + month["id"]); months = [c for c in walk(mv, []) if c.get("type") == "VALUE"]
        if not levels or not months: print("no council level or months for", aid); continue
        body = {"database": db["id"], "measures": [cm["id"]] + ([am["id"]] if am else []), "recodes": {month["id"]: {"map": [[months[-1]["id"]]], "total": False}},
                "dimensions": [[levels[0]["id"].rsplit(":", 1)[0] if False else geo["id"]], [month["id"]]]}
        res = call("table", body)
        labels = [i.get("labels", [""])[0] for i in res["fields"][0]["items"]]; codes = [i.get("uris", [""])[0].rsplit(":", 1)[-1] for i in res["fields"][0]["items"]]
        cube = res["cubes"]; vals = list(cube.values())
        for j, code in enumerate(codes):
            if not re.match(r"^[EWSN]\d{8}$", code): continue
            row = out["v"].setdefault(code, {}); row[aid] = vals[0]["values"][j][0] if vals else None
            if am and len(vals) > 1: row[aid + "_mean"] = vals[1]["values"][j][0]
        out["meta"][aid] = {"dataset": db["label"], "measure": cm["label"], "mean": am["label"] if am else None, "month": months[-1].get("label")}
        if VERBOSE: print(aid, out["meta"][aid], "councils:", sum(1 for c in out["v"] if aid in out["v"][c]))
        time.sleep(1)
    json.dump(out, open(os.path.join(ROOT, "data", "benefits_statxplore.json"), "w"), separators=(",", ":"))
    print("wrote data/benefits_statxplore.json:", len(out["v"]), "councils;", ", ".join(out["meta"]))


if __name__ == "__main__":
    main()
