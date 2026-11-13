"""
Atlas 0.12: procurement red flags, contract by contract -> pipeline/sources/raw/integrity/awards.jsonl
Standard library (curl).   python3 pipeline/fetch_integrity.py [--from 2024-01-01] [--max-minutes N]

Source: Find a Tender service (Cabinet Office), OCDS release packages, award notices (Open Government Licence v3.0).
For each award notice: the buyer, the procedure (open, selective, limited/negotiated, direct award), how many bids came in
(when the notice says), the value and the title. These are the inputs to the red flags Fazekas and colleagues use to
measure corruption *risk* in public buying (single bidding, non-open procedures, awards without competition); see
pipeline/build_integrity.py. A cache: each run asks only for notices since the newest held; a crawl that stops resumes.
"""
import datetime, json, os, subprocess, sys, time
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "sources", "raw", "integrity", "awards.jsonl"); os.makedirs(os.path.dirname(OUT), exist_ok=True)
UA = "Mozilla/5.0 (compatible; AtlasMaps/0.12; +https://github.com/atlasmaps-lab/atlas)"
API = "https://www.find-tender.service.gov.uk/api/1.0/ocdsReleasePackages?limit=100&stages=award&updatedFrom={f}&updatedTo={t}"


def get(url):
    for wait in (0, 10, 60, 180):
        time.sleep(wait or 1.0)
        r = subprocess.run(["curl", "-sS", "-m", "120", "-A", UA, url], capture_output=True)
        try:
            return json.loads(r.stdout)
        except Exception:
            continue
    raise RuntimeError("Find a Tender kept refusing: " + url)


def main():
    start = (sys.argv[sys.argv.index("--from") + 1] if "--from" in sys.argv else "2024-01-01")[:10] + "T00:00:00"
    state_p, cur_p = OUT + ".state", OUT + ".cursor"
    seen = set()
    if os.path.exists(OUT):
        for line in open(OUT, encoding="utf-8"):
            seen.add(json.loads(line)["id"])
    state = json.load(open(state_p)) if os.path.exists(state_p) else {}
    if os.path.exists(cur_p):
        cur = json.load(open(cur_p)); url, to = cur["url"], cur["to"]
    else:
        to = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%S")
        url = API.format(f=state.get("complete_to", start), t=to)
    n, pages, t0 = 0, 0, time.time()
    with open(OUT, "a", encoding="utf-8") as fh:
        while url:
            j = get(url); pages += 1
            for rel in j.get("releases", []):
                rid = rel.get("id") or rel.get("ocid")
                if rid in seen:
                    continue
                seen.add(rid)
                t = rel.get("tender") or {}
                bids = [s.get("value") for s in ((rel.get("bids") or {}).get("statistics") or []) if s.get("measure") == "bids" and isinstance(s.get("value"), (int, float))]
                vals = [((a.get("value") or {}).get("amount")) for a in rel.get("awards") or [] if (a.get("value") or {}).get("currency", "GBP") == "GBP"]
                buyer = rel.get("buyer") or {}
                fh.write(json.dumps({"id": rid, "ocid": rel.get("ocid"), "d": (rel.get("date") or "")[:10], "buyer": buyer.get("name") or "", "bid": buyer.get("id") or "",
                                     "m": t.get("procurementMethod") or "", "md": (t.get("procurementMethodDetails") or "")[:60], "cat": t.get("mainProcurementCategory") or "",
                                     "nb": min(bids) if bids else None, "v": sum(v for v in vals if isinstance(v, (int, float))) or None,
                                     "t": (t.get("title") or rel.get("title") or "")[:140], "u": "https://www.find-tender.service.gov.uk/Notice/" + str(rid).split("-")[0]}, ensure_ascii=False) + "\n")
                n += 1
            fh.flush()
            nxt = (j.get("links") or {}).get("next")
            url = nxt if nxt and len(j.get("releases", [])) else None
            if url: json.dump({"url": url, "to": to}, open(cur_p, "w"))
            if pages % 20 == 0: print(f"{pages} pages, {n} new notices, {int(time.time() - t0)} s", flush=True)
            if "--max-minutes" in sys.argv and time.time() - t0 > 60 * float(sys.argv[sys.argv.index("--max-minutes") + 1]):
                print("stopping for now; run again to carry on"); return
    if os.path.exists(cur_p): os.remove(cur_p)
    json.dump({"complete_to": to}, open(state_p, "w"))
    import manifest  # noqa: E402
    sys.path.insert(0, HERE)
    manifest.record("raw/integrity/awards.jsonl", "Cabinet Office", "Find a Tender service: award notices (OCDS)", "https://www.find-tender.service.gov.uk/apidocumentation", manifest.OGL,
                    f"UK public buyers; {start[:10]} to {to[:10]}", "Buyer, procedure, number of bids, value, title for each award notice")
    print(f"integrity: {n} new award notices from {pages} pages")


if __name__ == "__main__":
    sys.path.insert(0, HERE)
    main()
