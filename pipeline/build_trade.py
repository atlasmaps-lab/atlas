"""
Atlas 0.9: UK trade in goods, product by product -> data/trade.js, data/trade_detail.js, data/trade_firms.js
   python3 pipeline/trade_fetch.py      (downloads, once a month)
   python3 pipeline/build_trade.py [--offline]

Sources (all OGL v3.0 unless stated):
  HMRC overseas trade bulk data sets: every export and import line by CN8 product code, partner country, UK port and
    mode of transport, monthly. Layout (85 characters): month 0-6, record type 6, CN8 13-21, SITC 21-26, country of
    dispatch/destination 26-31 (numeric + alpha), port 31-37, country of origin 37-42 (imports), mode 42, value 43-56 (£),
    net mass 56-68 (kg), supplementary units 68-80. Checked against the HMRC API, row by row.
  HMRC registers of exporters and importers (the latest month): firm, postcode and the product codes they traded.
  HMRC regional trade in goods by smaller geographical areas, 2024 (ITL1, ITL2, ITL3; partners; SITC sections).
  UK Trade Tariff API (chapter, heading and subheading descriptions); HMRC API (country and port names).
  Wikidata (CC0): each country's capital, for the map; postcodes.io (OGL, from ONS): each firm's council.
"""
import collections, csv, datetime, io, json, math, os, re, subprocess, sys, time, zipfile
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
import manifest

RAW = os.path.join(HERE, "sources", "raw", "trade"); TAR = os.path.join(RAW, "tariff"); os.makedirs(TAR, exist_ok=True)
UA = "Mozilla/5.0 (compatible; AtlasMaps/0.9; +https://github.com/atlasmaps-lab/atlas)"
OFFLINE = "--offline" in sys.argv
MODE = {"0": "Unknown", "1": "Sea", "2": "Rail", "3": "Road", "4": "Air", "5": "Post", "6": "Roll-on roll-off", "7": "Pipeline or cable", "8": "Inland waterway", "9": "Own propulsion", " ": "Not recorded"}


def curl(url, out=None, data=None, ctype=None, tries=4):
    cmd = ["curl", "-sSL", "-m", "120", "-A", UA] + (["-H", "Content-Type: " + ctype, "--data", data] if data else []) + [url]
    for i in range(tries):
        r = subprocess.run(cmd, capture_output=True)
        if r.returncode == 0 and r.stdout:
            if out: open(out, "wb").write(r.stdout)
            return r.stdout.decode("utf-8", "replace")
        time.sleep(3 * (i + 1))
    return None


def cached_json(path, url, **kw):
    if not os.path.exists(path):
        if OFFLINE: return None
        t = curl(url, path, **kw); time.sleep(0.2)
        if t is None: return None
    try: return json.load(open(path))
    except Exception: os.remove(path); return None


# ---------- the bulk files ----------
def members():
    """{('exp'|'imp', 'YYMM'): (zip path, member)} for every monthly file in the downloads"""
    out = {}
    for z in sorted(os.listdir(RAW)):
        if not z.endswith(".zip") or not z.startswith(("bdsexp", "bdsimp")): continue
        for n in zipfile.ZipFile(os.path.join(RAW, z)).namelist():
            m = re.match(r"BDS(exp|imp)(\d{4})\.txt$", n, re.I)
            if m: out[(m.group(1).lower(), m.group(2))] = (os.path.join(RAW, z), n)
    return out


OUTLIERS = []


def lines(src):
    z, n = src
    with zipfile.ZipFile(z).open(n) as fh:
        for raw in io.TextIOWrapper(fh, encoding="latin-1"):
            l = raw.rstrip("\r\n")
            if len(l) < 80: continue
            v = l[43:56].strip()
            if not v.isdigit(): continue
            if int(v) > 2e10:   # no single line is worth £20bn: HMRC's files have the odd keying slip (Sep 2025: £1 trillion of plasterboard)
                OUTLIERS.append(l.strip()); continue
            imp = l[81:84] == "imp"
            org = l[40:42].strip() if imp else ""
            cty = (org if org and org not in ("00", "ZZ") else l[29:31]).strip().upper()   # imports: country of origin where given
            yield l[0:6], l[6], l[13:21], cty, l[31:34], l[42], int(v), int(l[56:68]) if l[56:68].strip().isdigit() else 0


def descriptions():
    """CN8 from the control files; chapters, headings and HS6 subheadings from the Trade Tariff API"""
    cn8 = {}
    for z in sorted(os.listdir(RAW)):
        if z.startswith("smka12") and z.endswith(".zip"):
            zz = zipfile.ZipFile(os.path.join(RAW, z))
            for n in zz.namelist():
                for l in io.TextIOWrapper(zz.open(n), encoding="latin-1"):
                    p = l.rstrip("\r\n").split("|")
                    if len(p) > 20 and p[0][:8].isdigit(): cn8[p[0][:8]] = p[-1].strip()
    ods = os.path.join(RAW, "cn2026.ods")
    if os.path.exists(ods):
        x = zipfile.ZipFile(ods).read("content.xml").decode()
        for r in re.findall(r"<table:table-row[^>]*>(.*?)</table:table-row>", x, re.S):
            c = re.findall(r"<text:p>(.*?)</text:p>", r)
            if len(c) >= 2 and c[0].isdigit(): cn8[c[0].zfill(8)] = unesc(c[1])
    ch, hd = {}, {}
    idx = cached_json(os.path.join(TAR, "chapters.json"), "https://www.trade-tariff.service.gov.uk/api/v2/chapters") or {"data": []}
    for c in idx["data"]:
        k = c["attributes"]["goods_nomenclature_item_id"][:2]; ch[k] = c["attributes"]["formatted_description"]
        d = cached_json(os.path.join(TAR, f"ch{k}.json"), f"https://www.trade-tariff.service.gov.uk/api/v2/chapters/{k}") or {}
        for i in d.get("included", []):
            if i["type"] == "heading": hd[i["attributes"]["goods_nomenclature_item_id"][:4]] = i["attributes"].get("formatted_description") or i["attributes"].get("description")
    return cn8, ch, hd


def hs6_names(headings):
    out = {}
    for h in headings:
        d = cached_json(os.path.join(TAR, f"h{h}.json"), f"https://www.trade-tariff.service.gov.uk/api/v2/headings/{h}")
        if not d: continue
        stack = []
        for i in d.get("included", []):
            a = i.get("attributes", {}); code = a.get("goods_nomenclature_item_id")
            if i["type"] != "commodity" or not code: continue
            ind = a.get("number_indents", 1); desc = clean(a.get("formatted_description") or a.get("description") or "")
            stack = [s for s in stack if s[0] < ind] + [(ind, desc)]
            if code[6:] == "0000" and code[4:6] != "00" and code[:6] not in out:
                out[code[:6]] = desc if not desc.lower().startswith("other") or len(stack) < 2 else stack[-2][1] + ": " + desc
    return out


unesc = lambda s: re.sub(r"<[^>]+>", "", s).replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">").replace("&quot;", '"').replace("&apos;", "'")
clean = lambda s: re.sub(r"\s+", " ", unesc(s)).strip()


def countries():
    C = {}
    for c in (cached_json(os.path.join(RAW, "countries.json"), "https://api.uktradeinfo.com/Country?$top=500") or {"value": []})["value"]:
        C[c["CountryCodeAlpha"].strip().upper()] = {"n": c["CountryName"].strip(), "eu": c.get("Area1a", "").strip() == "European Union"}
    q = """SELECT ?iso ?cl ?ccl ?cont WHERE { ?c wdt:P297 ?iso. OPTIONAL { ?c wdt:P36 ?cap. ?cap wdt:P625 ?cl } OPTIONAL { ?c wdt:P625 ?ccl } OPTIONAL { ?c wdt:P30 ?ct. ?ct rdfs:label ?cont FILTER(lang(?cont)="en") } }"""
    import urllib.parse
    W = cached_json(os.path.join(RAW, "wd_countries.json"), "https://query.wikidata.org/sparql?format=json&query=" + urllib.parse.quote(q)) or {"results": {"bindings": []}}
    for b in W["results"]["bindings"]:
        iso = b["iso"]["value"].upper(); c = C.setdefault(iso, {"n": iso, "eu": False})
        for k in ("cl", "ccl"):
            if k in b and "ll" not in c:
                m = re.match(r"Point\(([-\d.]+) ([-\d.]+)\)", b[k]["value"]); c["ll"] = [round(float(m.group(1)), 2), round(float(m.group(2)), 2)] if m else None
        if "cont" in b and "ct" not in c: c["ct"] = b["cont"]["value"]
    for iso, c in C.items():
        c["rg"] = "EU" if c["eu"] else {"Europe": "Other Europe", "Asia": "Asia", "Africa": "Africa", "North America": "North America", "South America": "Latin America", "Oceania": "Oceania", "Australia": "Oceania", "Insular Oceania": "Oceania"}.get(c.get("ct", ""), "Other")
    C.setdefault("XI", {"n": "Northern Ireland (from GB)", "eu": False, "rg": "Other"})
    return C


PORT_LL = {   # gateways the place symbols don't cover (Channel Tunnel, inland codes); others are matched by name below
    "CTL": [1.143, 51.096], "EUR": [1.143, 51.096], "DOV": [1.329, 51.122], "FXT": [1.311, 51.957], "SOU": [-1.425, 50.900], "LON": [0.36, 51.455], "TIL": [0.36, 51.455],
    "LGP": [0.47, 51.505], "IMM": [-0.21, 53.63], "GRI": [-0.07, 53.575], "HRH": [1.255, 51.945], "LIV": [-3.02, 53.45], "TEE": [-1.16, 54.6], "BEL": [-5.9, 54.62],
    "HUL": [-0.27, 53.74], "PTM": [-1.105, 50.81], "BRS": [-2.7, 51.5], "HOL": [-4.63, 53.31], "FIS": [-4.98, 52.0], "PME": [-5.03, 51.69], "MIL": [-5.03, 51.69],
    "CAI": [-5.1, 54.92], "LHR": [-0.454, 51.47], "LGW": [-0.19, 51.153], "STN": [0.235, 51.885], "MAN": [-2.27, 53.354], "EMA": [-1.33, 52.83], "BHX": [-1.748, 52.452],
    "GLA": [-4.43, 55.87], "EDI": [-3.37, 55.95], "PIK": [-4.61, 55.51], "ABZ": [-2.2, 57.2], "NCL": [-1.69, 55.04], "LTN": [-0.37, 51.875], "BRU": [-2.71, 51.38],
    "GOO": [-0.87, 53.7], "TYN": [-1.44, 55.0], "LEI": [-3.17, 55.98], "GRG": [-3.72, 56.0], "SUL": [-1.29, 60.47], "FLO": [-2.97, 58.98], "ROS": [-6.33, 52.25],
    "DEU": [1.25, 51.11], "EUT": [1.143, 51.096], "NGO": [1.11, 51.09], "HLD": [-4.63, 53.31], "AVO": [-2.70, 51.50], "MID": [-1.16, 54.59], "MED": [0.62, 51.43], "PHD": [-1.78, 57.50],
    "THP": [0.62, 51.45], "HPT": [-3.36, 56.01], "PUF": [0.24, 51.48], "KIL": [-0.22, 53.65], "ELL": [-2.90, 53.29], "BZN": [-1.58, 51.75], "HEY": [-2.92, 54.03], "NHV": [0.06, 50.79],
    "WAR": [-2.88, 53.74], "OAK": [-1.32, 51.84], "PLY": [-4.16, 50.36], "POO": [-1.99, 50.71], "AYR": [-4.64, 55.47], "WEY": [-2.45, 50.61], "SUN": [-1.37, 54.91], "BOS": [-0.02, 52.97],
    "GRK": [-4.76, 55.95], "BLY": [-1.50, 55.13], "TRT": [-0.70, 53.60], "IPS": [1.16, 52.04], "GTY": [1.73, 52.60], "KLN": [0.39, 52.76], "FAL": [-5.05, 50.15], "HTP": [-1.19, 54.69],
    "SHO": [-0.25, 50.83], "CVT": [-1.48, 52.37], "LDY": [-7.31, 55.00], "IVG": [-4.17, 57.69], "RUN": [-2.73, 53.34], "MDH": [0.49, 52.36], "MME": [-1.43, 54.51], "DVY": [-1.16, 52.25],
    "MON": [-2.47, 56.70], "SSS": [-2.48, 51.72], "SWA": [-3.93, 51.62], "WOR": [-3.57, 54.65], "TNM": [-3.50, 50.55], "WPT": [-6.25, 54.10], "JSY": [-2.11, 49.18], "GSY": [-2.54, 49.46],
    "LYD": [0.94, 50.96], "GLO": [-2.17, 51.89], "TEP": [0.53, 51.50], "NHT": [-0.42, 51.55], "BAR": [-3.23, 54.10]}
NO_PLACE = {"XXX", "PNC", "ZLC", "QVV", "ZYY", "PSE", "PPP", "NRE"}   # unknown, not collected, inland clearance, low-value aggregates, confidential, post, estimates


def ports(C):
    P = {}
    for p in (cached_json(os.path.join(RAW, "ports.json"), "https://api.uktradeinfo.com/Port?$top=1000") or {"value": []})["value"]:
        P[p["PortCodeNumeric"].zfill(3)] = {"n": p["PortName"].strip(), "a": p["PortCodeAlpha"].strip()}
    s = open(os.path.join(ROOT, "data", "places_poi.js"), encoding="utf-8").read()
    poi = [i for i in json.loads(s[s.index("{"):s.rindex("}") + 1])["items"] if i["k"] in ("airport", "port")]
    norm = lambda t: re.sub(r"[^a-z]+", " ", re.sub(r"\(.*?\)|\b(airport|port|international|harbour|docks?|london)\b", " ", t.lower())).strip()
    for k, p in P.items():
        if p["a"] in NO_PLACE: p["np"] = 1; continue
        if p["a"] in PORT_LL: p["ll"] = PORT_LL[p["a"]]; continue
        n = norm(p["n"]); m = next((i for i in poi if n and (norm(i["n"]) == n or n.split()[0] == norm(i["n"]).split()[0] if norm(i["n"]) else False)), None)
        if m: p["ll"] = [round(m["lon"], 3), round(m["lat"], 3)]
    return P


# ---------- aggregate ----------
def main():
    MB = members(); keys = sorted({ym for _, ym in MB})
    last = max(ym for f, ym in MB if f == "imp" and ("exp", ym) in MB)
    y, m = 2000 + int(last[:2]), int(last[2:])
    def back(n): t = y * 12 + m - 1 - n; return f"{t // 12 - 2000:02d}{t % 12 + 1:02d}"
    cur = [back(i) for i in range(11, -1, -1)]; prev = [back(i) for i in range(23, 11, -1)]
    print("latest month", last, "· 12 months", cur[0], "to", cur[-1], flush=True)
    cn8d, chd, hdd = descriptions(); C = countries(); PT = ports(C)

    import pickle
    cache = os.path.join(RAW, "aggregates.pickle"); sig = "v2" + json.dumps(sorted((f, ym, os.path.getsize(MB[(f, ym)][0])) for f, ym in MB))
    if os.path.exists(cache):
        c = pickle.load(open(cache, "rb"))
        if c.get("sig") == sig: A, MASS, MON, MCH, YCT, M4, P4 = c["data"]; print("aggregates from the cache", flush=True)
        else: c = None
    else: c = None
    if c is None: A, MASS, MON, MCH, YCT, M4, P4 = read_all(MB, cur, prev); pickle.dump({"sig": sig, "data": (A, MASS, MON, MCH, YCT, M4, P4)}, open(cache, "wb"))
    summarise(A, MASS, MON, MCH, YCT, M4, P4, cur, prev, cn8d, chd, hdd, C, PT)


def read_all(MB, cur, prev):
    A = {f: collections.defaultdict(int) for f in ("exp", "imp")}          # 12 months: (cn8, cty, port, mode) -> £
    MASS = {f: collections.defaultdict(int) for f in ("exp", "imp")}        # cn8 -> kg
    MON = {f: collections.defaultdict(int) for f in ("exp", "imp")}         # every month: total
    MCH = {f: collections.defaultdict(int) for f in ("exp", "imp")}         # every month x chapter
    YCT = {f: collections.defaultdict(int) for f in ("exp", "imp")}         # year x country
    M4 = {f: collections.defaultdict(int) for f in ("exp", "imp")}          # 12 months x heading (for the monthly trend in the detail)
    P4 = {f: collections.defaultdict(int) for f in ("exp", "imp")}          # previous 12 months x heading (movers)
    for (f, ym) in sorted(MB):
        if ym < "1601": continue
        incur, inprev = ym in cur, ym in prev
        a, ms, mon, mch, yct, m4, p4 = A[f], MASS[f], MON[f], MCH[f], YCT[f], M4[f], P4[f]
        yr = "20" + ym[:2]
        for (_, typ, cn, cty, port, mode, v, kg) in lines(MB[(f, ym)]):
            ch = cn[:2] if cn[:2].isdigit() else "99"
            mon[ym] += v; mch[(ym, ch)] += v; yct[(yr, cty)] += v
            if incur:
                a[(cn, cty, port, mode)] += v; ms[cn] += kg; m4[(ym, cn[:4])] += v
            elif inprev: p4[cn[:4]] += v
        print(" read", f, ym, flush=True)
    return ({f: dict(A[f]) for f in A}, {f: dict(MASS[f]) for f in MASS}, {f: dict(MON[f]) for f in MON}, {f: dict(MCH[f]) for f in MCH}, {f: dict(YCT[f]) for f in YCT}, {f: dict(M4[f]) for f in M4}, {f: dict(P4[f]) for f in P4})


def summarise(A, MASS, MON, MCH, YCT, M4, P4, cur, prev, cn8d, chd, hdd, C, PT):

    # ---------- summaries ----------
    def top(cnt, n): return [[k, v] for k, v in sorted(cnt.items(), key=lambda x: -x[1])[:n] if v > 0]
    tot = {f: sum(A[f].values()) for f in A}
    by = lambda f, keyf: (lambda c: ([c.__setitem__(keyf(k), c[keyf(k)] + v) for k, v in A[f].items()], c)[1])(collections.defaultdict(int))
    CT = {f: by(f, lambda k: k[1]) for f in A}; CH = {f: by(f, lambda k: k[0][:2]) for f in A}; PO = {f: by(f, lambda k: k[2]) for f in A}
    CTCH = {f: by(f, lambda k: (k[1], k[0][:2])) for f in A}; CHCT2 = {f: CTCH_swap(CTCH[f]) for f in A}; CHPO = {f: by(f, lambda k: (k[0][:2], k[2])) for f in A}
    POMO = {f: by(f, lambda k: (k[2], k[3])) for f in A}; POCT = {f: by(f, lambda k: (k[2], k[1])) for f in A}
    H4, H6, C8 = ({f: by(f, lambda k, n=n: k[0][:n]) for f in A} for n in (4, 6, 8))
    H4CT, H6CT, C8CT = ({f: by(f, lambda k, n=n: (k[0][:n], k[1])) for f in A} for n in (4, 6, 8))
    H4PO, H6PO, C8PO = ({f: by(f, lambda k, n=n: (k[0][:n], k[2])) for f in A} for n in (4, 6, 8))
    GI = {}
    def sub(d, key):   # d: {(a, b): v} -> {b: v} for one a, indexed once per dict
        g = GI.get(id(d))
        if g is None:
            g = collections.defaultdict(collections.Counter)
            for (a, b), v in d.items(): g[a][b] += v
            GI[id(d)] = g
        return g.get(key, collections.Counter())
    idx2 = lambda d: (lambda o: ([o[k[0]].__setitem__(k[1], v) for k, v in d.items()], o)[1])(collections.defaultdict(dict))

    hs6n = hs6_names(sorted({h for f in A for h in H4[f] if h.isdigit()}))
    def name(code):
        if len(code) == 2: return clean(chd.get(code, "Chapter " + code))
        if len(code) == 4: return clean(hdd.get(code, cn8d.get(code + "0000", "Heading " + code)))
        if len(code) == 6: return hs6n.get(code) or cn8d.get(code + "00") or name(code[:4])
        return cn8d.get(code, name(code[:6]))
    ctyset = {c for f in A for c in CT[f]}
    out = {
        "built": datetime.date.today().isoformat(), "period": [cur[0], cur[-1]], "months": {f: [[k, MON[f][k]] for k in sorted(MON[f])] for f in A},
        "tot": tot, "modes": MODE,
        "ch": {ch: {"n": name(ch), "exp": CH["exp"].get(ch, 0), "imp": CH["imp"].get(ch, 0),
                    "ct": {f: top(sub(CHCT2[f], ch), 8) for f in A}, "po": {f: top(sub(CHPO[f], ch), 5) for f in A},
                    "m": {f: [MCH[f].get((ym, ch), 0) for ym in cur] for f in A}, "y": {f: yearly(MCH[f], ch) for f in A}}
               for ch in sorted({k for f in A for k in CH[f]}) if ch.isdigit()},
        "cty": {c: {"n": C.get(c, {}).get("n", c), "rg": C.get(c, {}).get("rg", "Other"), "ll": C.get(c, {}).get("ll"),
                    "exp": CT["exp"].get(c, 0), "imp": CT["imp"].get(c, 0), "ch": {f: top(sub(CTCH[f], c), 10) for f in A},
                    "y": {f: {yr: v for (yr, cc), v in sorted(YCT[f].items()) if cc == c} for f in A}} for c in sorted(ctyset)},
        "ports": {p: dict(PT.get(p, {"n": p, "a": ""}), exp=PO["exp"].get(p, 0), imp=PO["imp"].get(p, 0), mo={f: top(sub(POMO[f], p), 4) for f in A}, ct={f: top(sub(POCT[f], p), 6) for f in A})
                  for p in sorted({k for f in A for k in PO[f]}) if PO["exp"].get(p, 0) + PO["imp"].get(p, 0) > 5e6},
        "sources": "HMRC overseas trade statistics (bulk data sets), the 12 months to " + month_name(cur[-1]) + "; UK Trade Tariff (descriptions). OGL v3.0",
    }
    # dependence: products where one country supplies more than half of UK imports (and they matter: over £50m a year)
    dep = []
    for h, v in H6["imp"].items():
        if v < 5e7 or not h.isdigit(): continue
        s = sub(H6CT["imp"], h); c, cv = s.most_common(1)[0]
        if cv / v > 0.5: dep.append([h, name(h), c, round(cv / v, 3), v])
    out["dep"] = sorted(dep, key=lambda x: -x[4])[:60]
    # movers: headings with the biggest change on the previous 12 months
    mv = []
    for f in A:
        cprev = P4[f]
        for h, v in H4[f].items():
            pv = cprev.get(h, 0)
            if max(v, pv) > 2e8 and h.isdigit(): mv.append([f, h, name(h), v, pv])
    out["movers"] = {f: sorted([x[1:] for x in mv if x[0] == f], key=lambda x: -abs(x[2] - x[3]))[:30] for f in A}

    # ---------- detail (loaded on demand) ----------
    def node(code, Hf, HC, HP, extra=None):
        o = {"n": name(code), "exp": Hf["exp"].get(code, 0), "imp": Hf["imp"].get(code, 0), "ct": {f: top(sub(HC[f], code), 10) for f in A}, "po": {f: top(sub(HP[f], code), 5) for f in A}}
        if extra: o.update(extra)
        return o
    det = {"h4": {}, "h6": {}, "c8": {}}
    for h in sorted({k for f in A for k in H4[f]}):
        if h.isdigit(): det["h4"][h] = node(h, H4, H4CT, H4PO, {"m": {f: [M4[f].get((ym, h), 0) for ym in cur] for f in A}, "pv": {f: P4[f].get(h, 0) for f in A}})
    for h in sorted({k for f in A for k in H6[f]}):
        if h.isdigit(): det["h6"][h] = node(h, H6, H6CT, H6PO)
    for c in sorted({k for f in A for k in C8[f]}):
        if c.isdigit():
            o = node(c, C8, C8CT, C8PO); kg = MASS["exp"].get(c, 0); o["kg"] = {f: MASS[f].get(c, 0) for f in A}; det["c8"][c] = o
    # shrink: the detail keeps the top partners per level but fewer for the deepest
    for c, o in det["c8"].items(): o["ct"] = {f: o["ct"][f][:5] for f in A}; o["po"] = {f: o["po"][f][:3] for f in A}

    # ---------- regions (2024, smaller areas) ----------
    reg = regions()
    # ---------- firms (registers) ----------
    firms = firms_by_council()
    out["firms"] = {c: [v["exp"], v["imp"]] for c, v in firms["by"].items()}
    out["regions"] = reg

    write("trade.js", "ATLAS_TRADE", out)
    write("trade_detail.js", "ATLAS_TRADE_DETAIL", det)
    write("trade_firms.js", "ATLAS_TRADE_FIRMS", firms)
    rep = os.path.join(HERE, "reports"); os.makedirs(rep, exist_ok=True)
    with open(os.path.join(rep, "validation_trade.md"), "w") as fh:
        fh.write(f"# Trade build ({out['built']})\n\nTwelve months {cur[0]}–{cur[-1]}.\n\n| | Exports | Imports |\n|---|---|---|\n| Total | £{tot['exp'] / 1e9:.1f}bn | £{tot['imp'] / 1e9:.1f}bn |\n")
        fh.write(f"| {month_name(cur[-1])} | £{MON['exp'][cur[-1]] / 1e9:.2f}bn | £{MON['imp'][cur[-1]] / 1e9:.2f}bn |\n\n")
        fh.write(f"- Chapters {len(out['ch'])}, headings {len(det['h4'])}, HS6 {len(det['h6'])}, CN8 {len(det['c8'])}; partners {len(out['cty'])}; ports {len(out['ports'])}\n")
        fh.write(f"- Countries without coordinates: {', '.join(sorted(c for c, o in out['cty'].items() if not o['ll'] and o['exp'] + o['imp'] > 1e8))}\n")
        fh.write(f"- Ports over £100m without coordinates: {', '.join(sorted(p['n'] for p in out['ports'].values() if not p.get('ll') and p['exp'] + p['imp'] > 1e8))}\n")
        fh.write("- Lines dropped as keying errors (over £20bn each): " + ("; ".join(OUTLIERS) or "none") + "\n")
        fh.write(f"- HS6 descriptions from the tariff: {len(hs6n)}\n- Firms placed in a council: {firms['placed']} of {firms['n']}\n")
    print("exports £%.1fbn, imports £%.1fbn" % (tot["exp"] / 1e9, tot["imp"] / 1e9))


def CTCH_swap(d): return {(k[1], k[0]): v for k, v in d.items()}
def yearly(mch, ch):
    y = collections.defaultdict(int)
    for (ym, c), v in mch.items():
        if c == ch: y["20" + ym[:2]] += v
    return dict(sorted(y.items()))
def month_name(ym): return datetime.date(2000 + int(ym[:2]), int(ym[2:]), 1).strftime("%B %Y")


def write(fn, glob, obj):
    with open(os.path.join(ROOT, "data", fn), "w", encoding="utf-8") as fh:
        fh.write(f"// Atlas 0.9: built by pipeline/build_trade.py from HMRC trade statistics (OGL v3.0); do not edit.\nwindow.{glob} = ")
        json.dump(obj, fh, separators=(",", ":"), ensure_ascii=False); fh.write(";\n")
    print(fn, os.path.getsize(os.path.join(ROOT, "data", fn)) // 1024, "KB")


# ---------- regional trade (HMRC, 2024) ----------
def ods_tables(path):
    x = zipfile.ZipFile(path).read("content.xml").decode()
    out = {}
    for t in re.finditer(r'<table:table table:name="([^"]+)"(.*?)</table:table>', x, re.S):
        rows = []
        for r in re.findall(r"<table:table-row[^>]*>(.*?)</table:table-row>", t.group(2), re.S):
            cells = []
            for c in re.finditer(r"<table:table-cell([^>]*)(?:/>|>(.*?)</table:table-cell>)", r, re.S):
                rep = re.search(r'table:number-columns-repeated="(\d+)"', c.group(1)); txt = clean(" ".join(re.findall(r"<text:p>(.*?)</text:p>", c.group(2) or "", re.S)))
                cells += [txt] * min(int(rep.group(1)) if rep else 1, 30)
            rows.append(cells)
        out[t.group(1)] = rows
    return out


def regions():
    p = os.path.join(RAW, "rts2024.ods")
    if not os.path.exists(p): return {}
    T = ods_tables(p)
    s = open(os.path.join(ROOT, "data", "uk-data.js"), encoding="utf-8").read(); PL = json.loads(s[s.index("{"):s.rindex("}") + 1])["places"]
    nm = lambda t: re.sub(r"[^a-z]+", " ", t.lower().replace("&", "and")).strip()
    region_code = {nm(v["name"]): k for k, v in PL.items() if v["level"] in ("region", "nation")}
    region_code.update({"east": "E12000006", "east of england": "E12000006", "yorkshire and the humber": "E12000003"})
    council = {nm(v["name"]): k for k, v in PL.items() if v["level"] == "council"}
    num = lambda t: float(t.replace(",", "")) * 1e6 if re.match(r"^-?[\d,]+(\.\d+)?$", t or "") else None
    num0 = lambda t: int(t.replace(",", "")) if re.match(r"^[\d,]+$", t or "") else None
    R = {"itl1": {}, "itl3": {}, "itl2": {}, "sitc": {}, "partners": {}, "year": 2024,
         "source": "HMRC UK regional trade in goods statistics disaggregated by smaller geographical areas, 2024 (OGL v3.0). Smaller areas are apportioned by HMRC from business locations."}
    def add(d, key, flow, v, n):
        o = d.setdefault(key, {"exp": 0, "imp": 0, "nexp": 0, "nimp": 0}); f = "exp" if flow.startswith("Export") else "imp"
        if v: o[f] += v
        if n: o["n" + f] = max(o["n" + f], n)   # business counts can't be summed across EU and non-EU; keep the larger
    for r in T.get("Table_1a_to_1c", [])[6:]:
        if len(r) > 5 and r[0] in ("Exports", "Imports") and r[2]:
            add(R["itl1"], region_code.get(nm(r[2]), r[2]), r[0], num(r[3]), num0(r[4]))
    for r in T.get("Table_2", [])[5:]:
        if len(r) > 6 and r[0] in ("Exports", "Imports"): add(R["itl2"], r[3], r[0], num(r[4]), num0(r[5])); R["itl2"][r[3]]["r"] = region_code.get(nm(r[2]), r[2])
    for r in T.get("Table_3", [])[5:]:
        if len(r) > 6 and r[0] in ("Exports", "Imports") and num(r[5]):
            k = "exp" if r[0] == "Exports" else "imp"; d = R["sitc"].setdefault(r[3], {"exp": {}, "imp": {}}); d[k][r[4]] = d[k].get(r[4], 0) + num(r[5])
    for r in T.get("Table_4", [])[5:]:
        if len(r) > 6 and r[0] in ("Exports", "Imports") and num(r[5]):
            k = "exp" if r[0] == "Exports" else "imp"; d = R["partners"].setdefault(r[3], {"exp": {}, "imp": {}}); d[k][r[4]] = d[k].get(r[4], 0) + num(r[5])
    miss = []
    for r in T.get("Table_5", [])[5:]:
        if len(r) > 6 and r[0] in ("Exports", "Imports"):
            add(R["itl3"], r[4], r[0], num(r[5]), num0(r[6])); o = R["itl3"][r[4]]; o["itl2"] = r[3]
            if "c" not in o:   # the councils that make up the ITL3 area, by name
                parts = [nm(x) for x in re.split(r",\s*| and (?=[A-Z])", r[4]) if x.strip()]
                cs = [council.get(x) or council.get(x.replace(" city of", "").strip()) or council.get("city of " + x) for x in parts]
                o["c"] = [c for c in cs if c] if all(cs) else ([council[nm(r[4])]] if nm(r[4]) in council else [])
                if not o["c"]: miss.append(r[4])
    R["unmatched_itl3"] = sorted(set(miss))
    # councils -> their ITL3 area
    R["council"] = {}
    for k, o in R["itl3"].items():
        for c in o.get("c", []): R["council"][c] = k
    print("regional: itl1", len(R["itl1"]), "itl2", len(R["itl2"]), "itl3", len(R["itl3"]), "councils placed", len(R["council"]), "itl3 unmatched", len(R["unmatched_itl3"]))
    return R


# ---------- exporters and importers (HMRC registers) ----------
def firms_by_council():
    reg = {}
    for f in ("exporters", "importers"):
        z = [x for x in sorted(os.listdir(RAW)) if re.match(f + r"\d{4}\.zip$", x)]   # the latest month (not the yearly archives)
        if not z: continue
        zz = zipfile.ZipFile(os.path.join(RAW, z[-1]))
        for l in io.TextIOWrapper(zz.open(zz.namelist()[0]), encoding="latin-1"):
            p = l.rstrip("\r\n").split("\t")
            if len(p) < 10: continue
            name = p[2].strip(); pc = re.sub(r"\s+", "", p[8].upper()); codes = [c for c in p[9:] if c.strip().isdigit()]
            if not re.match(r"^[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2}$", pc): continue
            o = reg.setdefault((name, pc), {"exp": set(), "imp": set()}); o["exp" if f == "exporters" else "imp"].update(c[:2] for c in codes)
    pcs = sorted({k[1] for k in reg})
    cache_p = os.path.join(RAW, "postcodes.json"); cache = json.load(open(cache_p)) if os.path.exists(cache_p) else {}
    todo = [p for p in pcs if p not in cache]
    if todo and not OFFLINE:
        print("looking up", len(todo), "postcodes", flush=True)
        for i in range(0, len(todo), 100):
            t = curl("https://api.postcodes.io/postcodes", data=json.dumps({"postcodes": todo[i:i + 100], "filter": "postcode,codes"}), ctype="application/json")
            try:
                for r in json.loads(t)["result"]:
                    q = re.sub(r"\s+", "", r["query"].upper()); res = r.get("result")
                    cache[q] = res["codes"]["admin_district"] if res else None
            except Exception: pass
            if i % 5000 == 0: json.dump(cache, open(cache_p, "w")); print("  ", i, flush=True)
            time.sleep(0.15)
        json.dump(cache, open(cache_p, "w"))
        manifest.record("raw/trade/postcodes.json", "postcodes.io (ONS Postcode Directory)", "Council (local authority) of each trader's postcode", "https://postcodes.io/", "OGL v3.0 (ONS)", "postcodes on the HMRC registers", "for data/trade_firms.js")
    by, lists, placed = {}, {}, 0
    for (name, pc), o in reg.items():
        c = cache.get(pc)
        if not c: continue
        placed += 1; b = by.setdefault(c, {"exp": 0, "imp": 0, "ch": {"exp": collections.Counter(), "imp": collections.Counter()}})
        for f in ("exp", "imp"):
            if o[f]: b[f] += 1; b["ch"][f].update(o[f])
        lists.setdefault(c, []).append([name.title() if name.isupper() else name, "".join(sorted(o["exp"]))[:120], "".join(sorted(o["imp"]))[:120]])
    for c, b in by.items(): b["ch"] = {f: dict(b["ch"][f].most_common(12)) for f in ("exp", "imp")}
    return {"by": by, "list": lists, "n": len(reg), "placed": placed, "month": month_name(firms_month()),
            "note": "HMRC publishes the names, addresses and product codes (first 2 digits shown) of businesses that exported or imported goods in the month. Product codes are pairs of digits (chapters)."}


def firms_month():
    z = [x for x in sorted(os.listdir(RAW)) if re.match(r"exporters\d{4}\.zip$", x)]
    m = re.search(r"(\d{2})(\d{2})\.zip$", z[-1]) if z else None
    return m.group(1) + m.group(2) if m and 1 <= int(m.group(2)) <= 12 else (z and re.findall(r"\d{4}", z[-1])[-1]) or "2601"


if __name__ == "__main__":
    main()
