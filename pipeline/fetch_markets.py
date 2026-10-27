"""
Atlas 1.4: one market as a test case — FTSE 100 companies (London Stock Exchange) with headquarters in London.
    python3 pipeline/fetch_markets.py          (needs internet; uses curl)
Writes sources/markets_ftse100.json.

1. Constituents, tickers and sectors: the "Constituents" table of Wikipedia's "FTSE 100 Index" article.
2. Headquarters: a hand-compiled street address where one is listed in sources/hq_addresses.csv (check these: offices
   move), otherwise an OpenStreetMap office named after the company inside Greater London (Nominatim, one request a
   second as its usage policy asks), else the street address in the article infobox. If only "London" is known, the
   company is kept as London-headquartered but not placed at a spot ("precision: city").
3. Market value: companiesmarketcap.com's list of UK companies (US$, today), matched by name; the article infobox or
   Wikidata (P2226) as fallback. Revenue, employees and founding date: the article infobox.
4. Share prices: monthly closing prices from Yahoo Finance's public chart feed (ticker + ".L"), and the index itself (^FTSE).
Only companies whose headquarters fall inside Greater London are kept for the map; the rest are listed as "outside London".
"""
import json, os, re, subprocess, time, urllib.parse

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "sources", "markets_ftse100.json")
UA = "AtlasMap/1.4 (student geography project)"
LONDON = (-0.52, 51.28, 0.34, 51.70)


def get(url, ua=UA):
    for k in range(4):
        out = subprocess.run(["curl", "-s", "-m", "60", "-A", ua, url], capture_output=True, text=True).stdout
        if out and not out.lstrip().startswith("<"): return out
        time.sleep(2 + 3 * k)
    return ""


def wiki(params, host="en.wikipedia.org"):
    try: return json.loads(get(f"https://{host}/w/api.php?" + urllib.parse.urlencode(dict(params, format="json", formatversion=2))))
    except Exception: return {}


def plain(s):
    s = re.sub(r"<ref[^>]*/>", "", s or ""); s = re.sub(r"<ref.*?</ref>", "", s, flags=re.S); s = re.sub(r"<!--.*?-->", "", s, flags=re.S)
    s = re.sub(r"\[\[(?:[^\]|]*\|)?([^\]]*)\]\]", r"\1", s)
    for _ in range(3): s = re.sub(r"\{\{(?:nowrap|nobr|small|plainlist|ubl|unbulleted list|flatlist|hlist)\s*\|([^{}]*)\}\}", r"\1", s, flags=re.I)
    s = re.sub(r"\{\{(?:increase|decrease|steady|gain|loss)\}\}", "", s, flags=re.I)
    s = re.sub(r"\{\{[^{}]*\}\}", "", s); s = re.sub(r"<br\s*/?>", ", ", s); s = re.sub(r"<[^>]+>|'''?", "", s)
    return re.sub(r"\s+", " ", s).strip(" ,;|*")


def infobox(text):
    m = re.search(r"\{\{\s*Infobox (company|organization|organisation|public company)", text, re.I)
    if not m: return {}
    depth, i = 0, m.start()
    while i < len(text) - 1:
        if text.startswith("{{", i): depth += 1; i += 2; continue
        if text.startswith("}}", i):
            depth -= 1; i += 2
            if depth == 0: break
            continue
        i += 1
    body, out, cur, d = text[m.start() + 2:i - 2], {}, "", 0
    for ch in re.split(r"(\{\{|\}\}|\[\[|\]\]|\|)", body):
        if ch in ("{{", "[["): d += 1
        elif ch in ("}}", "]]"): d -= 1
        if ch == "|" and d == 0:
            if "=" in cur: k, v = cur.split("=", 1); out[k.strip().lower().replace(" ", "_")] = v.strip()
            cur = ""
        else: cur += ch
    if "=" in cur: k, v = cur.split("=", 1); out[k.strip().lower().replace(" ", "_")] = v.strip()
    return out


def money(s):
    """'£42.3 billion (2025)' -> (value in £, year); US$ and € are kept with their currency"""
    t = plain(s)
    m = re.search(r"(US\$|\$|£|€|GBP|USD|EUR)\s*([\d.,]+)\s*(billion|bn|million|m|trillion)?", t, re.I)
    if not m: return None
    v = float(m.group(2).replace(",", "")) * {"billion": 1e9, "bn": 1e9, "million": 1e6, "m": 1e6, "trillion": 1e12}.get((m.group(3) or "").lower(), 1)
    cur = {"us$": "USD", "$": "USD", "usd": "USD", "£": "GBP", "gbp": "GBP", "€": "EUR", "eur": "EUR"}[m.group(1).lower()]
    y = re.search(r"\b(19|20)\d{2}\b", t)
    return {"v": v, "cur": cur, "yr": y.group(0) if y else ""}


def constituents():
    t = wiki(dict(action="parse", page="FTSE 100 Index", prop="wikitext"))["parse"]["wikitext"]
    sec = t[t.find("==Constituents"):]
    sec = sec[:sec.find("|}")]
    rows = []
    for r in re.split(r"\n\|-", sec)[1:]:
        cells = [c.strip() for c in re.split(r"\|\||\n\|", r) if c.strip()]
        if len(cells) < 3 or not cells[0].lstrip("|").strip().startswith("[["): continue
        link = re.search(r"\[\[([^\]|]+)(?:\|([^\]]+))?\]\]", cells[0])
        rows.append({"article": link.group(1).strip(), "name": (link.group(2) or link.group(1)).strip(), "ticker": plain(cells[1]).upper(), "sector": plain(cells[2]).strip().capitalize()})
    return rows


def geocode(q, london_only=False):
    time.sleep(1.1)
    params = {"q": q, "format": "json", "limit": 1, "countrycodes": "gb"}
    if london_only: params.update(viewbox="%s,%s,%s,%s" % (LONDON[0], LONDON[3], LONDON[2], LONDON[1]), bounded=1)
    try:
        j = json.loads(get("https://nominatim.openstreetmap.org/search?" + urllib.parse.urlencode(params)))
        return (float(j[0]["lat"]), float(j[0]["lon"]), j[0]["display_name"], j[0].get("class"), j[0].get("type")) if j else None
    except Exception: return None


PRECISE = {"office", "building", "amenity", "commercial", "shop", "tourism", "man_made", "landuse", "craft"}
STRIP = r"\b(plc|p\.l\.c\.|group|holdings|limited|ltd|the|company|international|investment trust|trust|&|and)\b"
norm = lambda s: re.sub(r"\s+", " ", re.sub(r"[^a-z0-9 ]", " ", re.sub(STRIP, " ", s.lower()))).strip()


def london_region():
    g = json.load(open(os.path.join(HERE, "geometry", "eng_regions.geojson")))
    f = next(f for f in g["features"] if f["properties"]["code"] == "E12000007")
    return [p[0] for p in (f["geometry"]["coordinates"] if f["geometry"]["type"] == "MultiPolygon" else [f["geometry"]["coordinates"]])]


def in_rings(lon, lat, rings):
    for ring in rings:
        c, j = False, len(ring) - 1
        for i in range(len(ring)):
            xi, yi, xj, yj = ring[i][0], ring[i][1], ring[j][0], ring[j][1]
            if (yi > lat) != (yj > lat) and lon < (xj - xi) * (lat - yi) / (yj - yi) + xi: c = not c
            j = i
        if c: return True
    return False


def market_caps():
    """companiesmarketcap.com: current market value of UK companies, US$"""
    import csv, io
    txt = get("https://companiesmarketcap.com/united-kingdom/largest-companies-in-the-uk-by-market-cap/?download=csv", "Mozilla/5.0 (Macintosh) AtlasMap/1.4")
    return {norm(r["Name"]): float(r["marketcap"]) for r in csv.DictReader(io.StringIO(txt)) if r.get("marketcap")}


def prices(symbol):
    u = f"https://query1.finance.yahoo.com/v8/finance/chart/{urllib.parse.quote(symbol)}?range=max&interval=1mo"
    try:
        j = json.loads(get(u, "Mozilla/5.0 (Macintosh) AtlasMap/1.4"))["chart"]["result"][0]
    except Exception: return None
    q = j["indicators"]["quote"][0]
    pts = [[time.strftime("%Y-%m", time.gmtime(t)), round(c, 2)] for t, c in zip(j["timestamp"], q["close"]) if c is not None]
    return {"currency": j["meta"].get("currency"), "monthly": pts, "last": j["meta"].get("regularMarketPrice")}


def main():
    cos = constituents(); print(len(cos), "constituents")
    titles = [c["article"] for c in cos]
    pages = {}
    for i in range(0, len(titles), 40):
        j = wiki(dict(action="query", titles="|".join(titles[i:i + 40]), prop="revisions|pageprops", rvprop="content", rvslots="main", ppprop="wikibase_item", redirects=1))
        q = j.get("query", {}); red = {r["from"]: r["to"] for r in q.get("redirects", []) + q.get("normalized", [])}
        byt = {p["title"]: p for p in q.get("pages", [])}
        for t in titles[i:i + 40]:
            p = byt.get(red.get(red.get(t, t), red.get(t, t)), {})
            if "revisions" in p: pages[t] = {"text": p["revisions"][0]["slots"]["main"]["content"], "qid": p.get("pageprops", {}).get("wikibase_item"), "title": p["title"]}
        time.sleep(1)
    qids = [p["qid"] for p in pages.values() if p.get("qid")]
    wd = {}
    for i in range(0, len(qids), 50):
        j = wiki(dict(action="wbgetentities", ids="|".join(qids[i:i + 50]), props="claims"), host="www.wikidata.org")
        for q, e in j.get("entities", {}).items():
            c = e.get("claims", {})
            cap = None
            for s in c.get("P2226", []):
                dv = s["mainsnak"].get("datavalue", {}).get("value", {}); qual = s.get("qualifiers", {}).get("P585", [{}])[0].get("datavalue", {}).get("value", {})
                unit = dv.get("unit", "").split("/")[-1]
                cur = {"Q25224": "GBP", "Q4917": "USD", "Q4916": "EUR"}.get(unit)
                if cur and "amount" in dv: cand = {"v": float(dv["amount"]), "cur": cur, "yr": qual.get("time", "")[1:5]}; cap = cand if not cap or cand["yr"] > cap["yr"] else cap
            hq = c.get("P159", [{}])[0].get("mainsnak", {}).get("datavalue", {}).get("value", {}).get("id")
            wd[q] = {"cap": cap, "hq": hq}
        time.sleep(0.5)
    import csv as _csv
    hand = {r["ticker"]: r for r in _csv.DictReader(open(os.path.join(HERE, "sources", "hq_addresses.csv")))}   # hand-compiled head offices
    out, ring, caps = [], london_region(), market_caps()
    print(len(caps), "market values from companiesmarketcap.com")
    for c in cos:
        p = pages.get(c["article"]); box = infobox(p["text"]) if p else {}
        hq_txt = plain(box.get("hq_location") or box.get("hq_location_address") or box.get("location") or box.get("headquarters") or "")
        hq_city = plain(box.get("hq_location_city") or "")
        q = " ".join(x for x in (hq_txt, hq_city) if x)
        first = re.split(r"[|*;]|\(", q)[0]          # "London, England (operational HQ) * Edinburgh" -> "London, England"
        says_london = bool(re.search(r"\blondon\b", first, re.I))
        g, precision = None, None
        if c["ticker"] in hand:   # a hand-compiled street address wins
            g = geocode(hand[c["ticker"]]["address"])
            precision = "address" if g else None
        if not g and (says_london or not first.strip()):
            g = geocode(c["name"], london_only=True)  # an office named after the company, inside London
            if g and g[3] in PRECISE: precision = "office"
            else: g = None
        addr = plain(box.get("hq_location_address") or box.get("address") or "") or (first if re.search(r"\d", first) else "")
        if not g and not says_london and first.strip():   # e.g. "Uxbridge" is inside Greater London too
            g0 = geocode(first)
            if g0 and g0[3] in ("place", "boundary") and in_rings(g0[1], g0[0], ring): g, precision = g0, "city"   # a town inside London, not a shop with that name
        if not g and addr:
            g = geocode(addr + ("" if "london" in addr.lower() else ", London" if says_london else ""))
            precision = "address" if g and g[3] not in ("place", "boundary") else None
            if not precision: g = None
        mc = caps.get(norm(c["name"])) or next((v for k, v in caps.items() if k and (k.startswith(norm(c["name"])) or norm(c["name"]).startswith(k))), None)
        cap = {"v": mc, "cur": "USD", "yr": time.strftime("%Y"), "src": "companiesmarketcap.com"} if mc else (money(box.get("market_cap", "")) or (wd.get(p["qid"], {}).get("cap") if p else None))
        sym = c["ticker"].replace(".", "-") + ".L"
        pr = prices(sym)
        rec = dict(c, symbol=sym, hq=hand[c["ticker"]]["address"] if c["ticker"] in hand else q, wiki="https://en.wikipedia.org/wiki/" + urllib.parse.quote((p or {}).get("title", c["article"]).replace(" ", "_")),
                   lat=g[0] if g else None, lon=g[1] if g else None, geocoded=g[2] if g else None, precision=precision or ("city" if says_london else None), hq_note=(hand.get(c["ticker"]) or {}).get("note", ""), hq_hand=c["ticker"] in hand,
                   market_cap=cap, revenue=money(box.get("revenue", "")), employees=plain(box.get("num_employees", ""))[:40],
                   founded=plain(box.get("foundation") or box.get("founded") or "")[:60], prices=pr)
        rec["london"] = bool(g and in_rings(g[1], g[0], ring)) or (not g and says_london)
        out.append(rec)
        print(f"{c['ticker']:6} {'LONDON' if rec['london'] else '      '} {str(rec['precision']):8} {c['name'][:30]:30} {(g[2] if g else q)[:60]:60} {'prices' if pr else 'NO PRICES'} {'cap' if cap else ''}")
    index = prices("^FTSE")
    json.dump({"market": "FTSE 100 (London Stock Exchange)", "fetched": time.strftime("%Y-%m-%d"), "index": index, "companies": out}, open(OUT, "w"), ensure_ascii=False)
    print(f"{sum(r['london'] for r in out)} of {len(out)} headquartered in London; written to {OUT}")


if __name__ == "__main__":
    main()
