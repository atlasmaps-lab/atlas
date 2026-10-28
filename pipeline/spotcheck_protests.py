"""
Atlas 1.8: spot check 15 protests against their Wikipedia articles   (python3 pipeline/spotcheck_protests.py; needs internet)

Picks 15 events spread evenly through time from sources/protests_wikipedia.csv, re-reads each article, and compares:
  date    Atlas's start date with the infobox's (or the opening paragraph's) date
  places  whether each site Atlas shows is named in the article
  crowd   whether Atlas's crowd figure appears in the article
Writes sources/protests_spotcheck.json (kept "notes" from an earlier run are preserved); build_protests.py puts it in the report.
"""
import csv, json, os, re, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import fetch_protests as F

OUT = os.path.join(HERE, "sources", "protests_spotcheck.json")


def forms(n):
    n = int(n); out = {f"{n:,}", str(n), f"{n:,}".replace(",", " ")}
    if n >= 1_000_000: out |= {f"{n / 1e6:g} million", f"{n / 1e6:.1f} million"}
    if n >= 1000 and n % 1000 == 0: out |= {f"{n // 1000},000", f"{n // 1000}k", f"{n // 1000} thousand"}
    return out


def main():
    rows = sorted(csv.DictReader(open(F.OUT, encoding="utf-8")), key=lambda r: r["start"])
    pick = [rows[round(i * (len(rows) - 1) / 14)] for i in range(15)] if len(rows) >= 15 else rows
    pages = F.pages([r["title"] for r in pick])
    res, ok = [], 0
    for r in pick:
        p = pages.get(r["title"])
        if not p: res.append({"title": r["title"], "date": "article not found", "places": "", "crowd": "", "verdict": "check"}); continue
        text = p["text"]; m = F.INFOBOX.search(text)
        box = F.fields(F.template(text, m.start())) if m else {}
        a, _ = F.dates(box.get("date") or box.get("dates") or box.get("start_date") or "")
        if not a: a, _ = F.dates(F.lead(text)[:400])
        plain = F.plain(re.sub(r"\{\{(?:[^{}]|\{\{[^{}]*\}\})*\}\}", "", text)) + " " + F.plain(" ".join(box.values()))
        d = "match" if a == r["start"] else "same month" if a and a[:7] == r["start"][:7] else "same year" if a and a[:4] == r["start"][:4] else f"differs (article {a or 'gives none'}, Atlas {r['start']})"
        sites = json.loads(r["sites"])
        named = [s[0] for s in sites if re.search(r"\b" + re.escape(s[0].split(",")[0].split("(")[0].strip()) + r"\b", plain)]
        pl = f"{len(named)} of {len(sites)} named" if sites else ("no point: counted for " + r["nationwide"] if r["nationwide"] else "none")
        if r["size_low"]:
            hit = any(f in plain for f in forms(r["size_low"]) | forms(r["size_high"] or r["size_low"]))
            cr = ("found" if hit else "not found") + f" ({int(r['size_low']):,}" + (f"–{int(r['size_high']):,}" if r["size_high"] and r["size_high"] != r["size_low"] else "") + ")"
        else:
            cr = "none shown" + (" (" + r["size_note"].split(".")[1].strip() + ")" if r.get("international") and "." in r["size_note"] and r["size_note"].split(".")[1].strip() else "")
        good = d in ("match", "same month") and (not sites or len(named) == len(sites)) and not cr.startswith("not found")
        ok += good
        res.append({"title": r["title"], "date": d, "places": pl, "crowd": cr, "verdict": "agrees" if good else "check"})
        time.sleep(0.3)
    old = json.load(open(OUT)) if os.path.exists(OUT) else {}
    json.dump({"date": time.strftime("%Y-%m-%d"), "summary": f"{ok} of {len(res)} agree on every point; the others are explained below.", "rows": res, "notes": old.get("notes", [])},
              open(OUT, "w"), indent=1, ensure_ascii=False)
    print(f"spot check: {ok} of {len(res)} agree; written to {OUT}")
    for x in res: print(" ", x["verdict"], "|", x["title"], "|", x["date"], "|", x["places"], "|", x["crowd"])


if __name__ == "__main__":
    main()
