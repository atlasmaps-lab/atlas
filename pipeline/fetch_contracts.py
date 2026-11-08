"""
Atlas 0.8: public contracts awarded, for the money-in-politics links -> pipeline/sources/raw/money/contracts.jsonl
Standard library (curl).   python3 pipeline/fetch_contracts.py [--from 2024-01-01]

Source: Find a Tender service (Cabinet Office), OCDS release packages, award notices. Open Government Licence v3.0.
https://www.find-tender.service.gov.uk/apidocumentation  (no key; cursor paging; polite pacing)
Each award becomes one line per supplier: date, buyer, supplier name, supplier Companies House number (when the notice
gives one, scheme GB-COH), value (GBP) and title, with a link to the notice. The file is a cache: each run only asks for
notices updated since the newest one already held, so the weekly job is small.
"""
import datetime, json, os, subprocess, sys, time
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "sources", "raw", "money", "contracts.jsonl"); os.makedirs(os.path.dirname(OUT), exist_ok=True)
UA = "Mozilla/5.0 (compatible; AtlasMaps/0.8; +https://github.com/atlasmaps-lab/atlas)"
API = "https://www.find-tender.service.gov.uk/api/1.0/ocdsReleasePackages?limit=100&stages=award&updatedFrom={f}&updatedTo={t}"


def get(url):
    for wait in (0, 10, 60, 180):
        time.sleep(wait or 1.0)
        r = subprocess.run(["curl", "-sS", "-m", "120", "-A", UA, url], capture_output=True)
        try:
            return json.loads(r.stdout)
        except Exception:
            continue   # 429 or a gateway error: wait and try again
    raise RuntimeError("Find a Tender kept refusing: " + url)


def ch_number(ident):
    if not ident: return ""
    i = str(ident.get("id") or "").upper().replace("GB-COH-", "").strip()
    return i if (ident.get("scheme") in ("GB-COH", None) and 6 <= len(i) <= 8 and any(ch.isdigit() for ch in i)) else ""


def main():
    start = (sys.argv[sys.argv.index("--from") + 1] if "--from" in sys.argv else "2024-01-01")[:10] + "T00:00:00"   # the API wants a date and time
    state_p, cur_p = OUT + ".state", OUT + ".cursor"   # pages come newest first: keep the cursor so an interrupted crawl resumes
    seen = set()
    if os.path.exists(OUT):
        for line in open(OUT, encoding="utf-8"):
            r = json.loads(line); seen.add((r["ocid"], r["ch"] or r["sup"]))
    state = json.load(open(state_p)) if os.path.exists(state_p) else {}
    if os.path.exists(cur_p):
        cur = json.load(open(cur_p)); url, to = cur["url"], cur["to"]
    else:
        to = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%S")
        url = API.format(f=state.get("complete_to", start), t=to)
    n_new, pages, t0 = 0, 0, time.time()
    with open(OUT, "a", encoding="utf-8") as fh:
        while url:
            j = get(url); pages += 1
            for rel in j.get("releases", []):
                parties = {p.get("id"): p for p in rel.get("parties", [])}
                buyer = next((p.get("name") for p in rel.get("parties", []) if "buyer" in (p.get("roles") or [])), (rel.get("buyer") or {}).get("name", ""))
                title = (rel.get("tender") or {}).get("title") or rel.get("title") or ""
                for a in rel.get("awards", []) or []:
                    v = (a.get("value") or {}); amount = v.get("amount") if v.get("currency", "GBP") == "GBP" else None
                    for sp in a.get("suppliers", []) or []:
                        p = parties.get(sp.get("id"), {}); ch = ch_number(p.get("identifier")) or (ch_number({"id": sp.get("id", ""), "scheme": "GB-COH"}) if str(sp.get("id", "")).startswith("GB-COH") else "")
                        key = (rel.get("ocid"), ch or sp.get("name", ""))
                        if key in seen: continue
                        seen.add(key); n_new += 1
                        fh.write(json.dumps({"ocid": rel.get("ocid"), "d": (a.get("date") or rel.get("date") or "")[:10], "upd": rel.get("date", "")[:19], "buyer": buyer,
                                             "sup": sp.get("name", ""), "ch": ch, "v": amount, "t": title[:160], "u": "https://www.find-tender.service.gov.uk/Notice/" + str(rel.get("id", "")).split("-")[0]}, ensure_ascii=False) + "\n")
            fh.flush()
            nxt = (j.get("links") or {}).get("next")
            url = nxt if nxt and len(j.get("releases", [])) else None
            if url: json.dump({"url": url, "to": to}, open(cur_p, "w"))
            if pages % 20 == 0: print(f"{pages} pages, {n_new} new awards, {int(time.time() - t0)} s", flush=True)
            if "--max-minutes" in sys.argv and time.time() - t0 > 60 * float(sys.argv[sys.argv.index("--max-minutes") + 1]):
                print("stopping for now; run again to carry on"); return
    if os.path.exists(cur_p): os.remove(cur_p)
    json.dump({"complete_to": to}, open(state_p, "w"))
    print(f"contracts: {n_new} new supplier awards from {pages} pages (cache {OUT})")


if __name__ == "__main__":
    main()
