"""
Atlas 0.8.3: the Environmental perspective  ->  data/environment.js
    python3 pipeline/fetch_environment.py   (downloads into pipeline/sources/raw/environment/)
    python3 pipeline/build_environment.py

Needs python-calamine to read the .xlsx/.ods files:  pip install python-calamine
The place lists come from data/uk-data.js and data/constituencies.js, so run build.py / build_constituencies.py first.

Output: the same format as data/extra.js (see build_extra.py), so app.js reads it with the same code:
  window.ATLAS_ENV = { y0, metrics: [ {id, p, group, label, unit, dp, nature, scale, desc, src, ys?, census?, mid?} ], v: { id: { code: value | [values from y0+ys] } } }

Geography
  Councils are Atlas's 2026 councils (Barnsley and Sheffield keep their old codes in most sources: ALIAS below).
  Regions, nations and the UK:
    emissions, renewables      added up from the councils (so they match the councils exactly)
    recycling, PM2.5, EV       the publisher's own regional and national figures
  Recycling and PM2.5 cover England only; residual waste is councils only. EV chargers also cover 2024 constituencies.
  Councils that were merged away (e.g. Allerdale, now part of Cumberland) have no figures before their merger: sources
  publish the old councils under old codes, and nothing is shared out between old and new boundaries.
Years
  Waste figures are for financial years: 2024-25 is placed at 2024 on the time bar (the year it starts).
"""
import csv, json, os, re
from collections import defaultdict
from python_calamine import CalamineWorkbook

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
RAW = os.path.join(HERE, "sources", "raw", "environment")
Y0 = 1995                       # the same first year as data/extra.js
UK, ENG = "K02000001", "E92000001"
ALIAS = {"E08000016": "E08000038", "E08000019": "E08000039"}   # Barnsley and Sheffield got new codes in 2026


def load_js(name):
    s = open(os.path.join(ROOT, "data", name), encoding="utf-8").read()
    return json.loads(s[s.index("=") + 1:].strip().rstrip(";"))


UKD = load_js("uk-data.js")
PLACES = UKD["places"]
COUNCILS = {c for c, p in PLACES.items() if p["level"] == "council"}
PCON = set(load_js("constituencies.js")["places"])
REGION_CODE = {p["name"].lower(): c for c, p in PLACES.items() if p["level"] in ("region", "nation", "country")}
REGION_CODE.update({"eastern": "E12000006", "united kingdom": UK})
region_code = lambda name: REGION_CODE.get(str(name).strip().lower())


def ancestors(code):
    out, p = [], PLACES[code].get("parent")
    while p:
        out.append(p); p = PLACES[p].get("parent")
    return out


ANC = {c: ancestors(c) for c in COUNCILS}


def council(code):
    code = ALIAS.get(str(code).strip(), str(code).strip())
    return code if code in COUNCILS else None


def num(x):
    if x is None:
        return None
    if isinstance(x, (int, float)):
        return float(x)
    s = str(x).strip().replace(",", "")
    try:
        return float(s)
    except ValueError:
        return None


def sheet(path, name):
    return CalamineWorkbook.from_path(os.path.join(RAW, path)).get_sheet_by_name(name).to_python()


def header_row(rows, first):
    return next(i for i, r in enumerate(rows) if str(r[0]).startswith(first))


METRICS, V = [], {}


def metric(id, group, label, unit, dp, desc, src, ys=None, nature="rate", scale="ratio", mid=None, census=None):
    m = {"id": id, "p": "environment", "group": group, "label": label, "unit": unit, "dp": dp, "nature": nature,
         "scale": scale, "desc": desc, "src": src}
    if ys is not None: m["ys"] = ys - Y0
    if mid is not None: m["mid"] = mid
    if census is not None: m["census"] = census
    METRICS.append(m); V[id] = {}
    return m


def put_series(id, y_first, y_last, vals, dp):
    """vals: {code: {year: value}} -> arrays from the metric's first year."""
    for code, by in vals.items():
        arr = [by.get(y) for y in range(y_first, y_last + 1)]
        while arr and arr[-1] is None:
            arr.pop()
        if any(v is not None for v in arr):
            V[id][code] = [None if v is None else round(v, dp) for v in arr]


def add_up(tot):
    """tot: {council: {year: {key: value}}} -> the same, with every region, nation and the UK added."""
    out = defaultdict(lambda: defaultdict(lambda: defaultdict(float)))
    for c, by in tot.items():
        for y, d in by.items():
            for code in [c] + ANC[c]:
                for k, v in d.items():
                    if v is not None:
                        out[code][y][k] += v
    return out


# ---------- greenhouse gas emissions (DESNZ), 2005-2023 ----------
GHG_SRC = "DESNZ, UK local authority and regional greenhouse gas emissions statistics (territorial, CO2e)"
ghg = defaultdict(lambda: defaultdict(lambda: defaultdict(float)))
seen_pop = set()
for r in csv.DictReader(open(os.path.join(RAW, "2005-23-uk-local-authority-ghg-emissions-CSV-dataset.csv"), encoding="utf-8-sig")):
    c = council(r["Local Authority Code"])
    if not c:
        continue
    y, kt, sec = int(r["Calendar Year"]), num(r["Territorial emissions (kt CO2e)"]) or 0.0, r["LA GHG Sector"]
    d = ghg[c][y]
    d["total"] += kt
    if sec in ("Transport", "Domestic", "LULUCF"):
        d[sec] += kt
    if (c, y) not in seen_pop:          # population and area repeat on every row: take them once
        seen_pop.add((c, y)); d["pop"] += num(r["Mid-year Population (thousands)"]) or 0; d["km2"] += num(r["Area (km2)"]) or 0
G = add_up(ghg)
GY0, GY1 = 2005, max(y for c in ghg for y in ghg[c])
metric("env_ghg_pc", "Greenhouse gas emissions", "Emissions per person", "t CO2e", 1,
       "Greenhouse gas emissions from the area (all sectors, net of land use and forestry), tonnes of CO2 equivalent per resident",
       GHG_SRC, GY0)
metric("env_ghg_total", "Greenhouse gas emissions", "Total emissions", "kt CO2e", 0,
       "Greenhouse gas emissions from the area (all sectors, net of land use and forestry), thousand tonnes of CO2 equivalent",
       GHG_SRC, GY0, nature="amount")
metric("env_ghg_change", "Greenhouse gas emissions", "Change in emissions since 2005", "%", 1,
       "Change in the area's total emissions since 2005 (below zero = lower than in 2005)", GHG_SRC, GY0, nature="change", scale="interval", mid=0)
metric("env_ghg_transport", "Greenhouse gas emissions", "Transport emissions per person", "t CO2e", 2,
       "Emissions from road, rail, domestic shipping and aviation in the area, per resident", GHG_SRC, GY0)
metric("env_ghg_domestic", "Greenhouse gas emissions", "Home emissions per person", "t CO2e", 2,
       "Emissions from homes (gas, other fuels and electricity used at home), per resident", GHG_SRC, GY0)
metric("env_lulucf", "Greenhouse gas emissions", "Land use and forestry (net)", "t CO2e per km²", 0,
       "Net emissions from land use, land-use change and forestry per km²: below zero means the land (forests, grassland) takes in more than it gives off",
       GHG_SRC, GY0, scale="interval", mid=0)
pc, tot, chg, tr, dom, lu = ({} for _ in range(6))
for code, by in G.items():
    base = by.get(GY0, {}).get("total")
    pc[code], tot[code], chg[code], tr[code], dom[code], lu[code] = ({} for _ in range(6))
    for y, d in by.items():
        if d["pop"]:
            pc[code][y] = d["total"] / d["pop"]; tr[code][y] = d["Transport"] / d["pop"]; dom[code][y] = d["Domestic"] / d["pop"]
        tot[code][y] = d["total"]
        if d["km2"]:
            lu[code][y] = d["LULUCF"] * 1000 / d["km2"]
        if base:
            chg[code][y] = (d["total"] / base - 1) * 100
for id, vals, dp in (("env_ghg_pc", pc, 1), ("env_ghg_total", tot, 0), ("env_ghg_change", chg, 1),
                     ("env_ghg_transport", tr, 2), ("env_ghg_domestic", dom, 2), ("env_lulucf", lu, 0)):
    put_series(id, GY0, GY1, vals, dp)

# ---------- renewable electricity (DESNZ), 2014-2025 ----------
REN = "Renewable_electricity_by_local_authority_2014_2025.xlsx"
REN_SRC = "DESNZ, Regional Renewable Statistics: renewable electricity by local authority"
wb = CalamineWorkbook.from_path(os.path.join(RAW, REN))
ren = defaultdict(lambda: defaultdict(dict))
years = sorted({int(m.group(1)) for s in wb.sheet_names for m in [re.search(r"Capacity, (\d{4})", s)] if m})
for y in years:
    for kind, name in (("cap", f"LA - Capacity, {y}"), ("gen", f"LA - Generation, {y}"), ("sites", f"LA - Sites {y}")):
        if name not in wb.sheet_names:
            continue
        rows = wb.get_sheet_by_name(name).to_python()
        h = header_row(rows, "Local Authority Code"); head = [str(x) for x in rows[h]]
        i_hh, i_tot = 4, head.index("Total")
        i_sol = next(i for i, x in enumerate(head) if x.startswith("Solar"))
        for r in rows[h + 1:]:
            c = council(r[0])
            if not c:
                continue
            d = ren[c][y]
            d[kind] = num(r[i_tot])
            if kind == "cap":
                d["solar"] = num(r[i_sol]); d["hh"] = num(r[i_hh])
R = add_up(ren)
RY0, RY1 = years[0], years[-1]
metric("env_ren_cap", "Renewable electricity", "Renewable capacity", "MW", 1,
       "Installed capacity of renewable electricity (wind, solar, hydro, bioenergy and others) at the end of the year, in megawatts",
       REN_SRC, RY0, nature="amount")
metric("env_solar_cap", "Renewable electricity", "Solar capacity", "MW", 1,
       "Installed solar panel capacity (rooftop and solar farms) at the end of the year, in megawatts", REN_SRC, RY0, nature="amount")
metric("env_ren_gen_hh", "Renewable electricity", "Renewable electricity per household", "MWh", 1,
       "Renewable electricity generated in the area in the year, in megawatt hours per household (a typical home uses about 2.7 MWh a year)",
       REN_SRC, RY0)
metric("env_ren_sites", "Renewable electricity", "Renewable installations per 1,000 homes", "per 1,000 homes", 0,
       "Renewable electricity installations (mostly rooftop solar panels) per 1,000 households, at the end of the year", REN_SRC, RY0)
cap, sol, gph, sph = {}, {}, {}, {}
for code, by in R.items():
    cap[code], sol[code], gph[code], sph[code] = {}, {}, {}, {}
    for y, d in by.items():
        if d.get("cap"): cap[code][y] = d["cap"]
        if "solar" in d: sol[code][y] = d["solar"]
        if d.get("hh"):
            if d.get("gen") is not None: gph[code][y] = d["gen"] / d["hh"]
            if d.get("sites") is not None: sph[code][y] = d["sites"] * 1000 / d["hh"]
for id, vals, dp in (("env_ren_cap", cap, 1), ("env_solar_cap", sol, 1), ("env_ren_gen_hh", gph, 1), ("env_ren_sites", sph, 0)):
    put_series(id, RY0, RY1, vals, dp)
# a council's generation is the sum of its technologies, some of them suppressed ([X]) to protect single plants: the
# "Total" column is the published total and already includes them, so regional sums are complete.

# ---------- household waste (Defra), England ----------
WASTE = "LA_and_Regional_Spreadsheet_2024-25.ods"
W_SRC = "Defra, Local authority collected waste management: annual results (England)"
rows = sheet(WASTE, "Table_3"); h = header_row(rows, "Year")
rec, res = defaultdict(dict), defaultdict(dict)
for r in rows[h + 1:]:
    m = re.match(r"(\d{4})-\d{2}$", str(r[0]).strip())
    if not m or str(r[5]).strip() not in ("Collection", "Unitary"):
        continue
    c = council(r[2])
    if not c:
        continue
    y = int(m.group(1))
    if num(r[7]) is not None: rec[c][y] = num(r[7]) * 100
    if num(r[6]) is not None: res[c][y] = num(r[6])
rows = sheet(WASTE, "Table_3a"); h = header_row(rows, "Region")
ycols = {i: int(str(x)[:4]) for i, x in enumerate(rows[h]) if re.match(r"\d{4}[-/]\d{2}", str(x))}
for r in rows[h + 1:]:
    if not str(r[0]).strip():
        break                           # the next table (3b) starts after a blank row
    code = region_code(r[0])
    if not code:
        raise SystemExit(f"Table 3a: unknown region {r[0]!r}")
    for i, y in ycols.items():
        if num(r[i]) is not None: rec[code][y] = num(r[i])
WY0, WY1 = min(min(d) for d in rec.values()), max(max(d) for d in rec.values())
metric("env_recycling", "Waste and recycling", "Household waste recycled", "%", 1,
       "Share of household waste sent for reuse, recycling or composting (financial year starting April; England only)", W_SRC, WY0)
metric("env_residual", "Waste and recycling", "Rubbish per household", "kg", 0,
       "Residual household waste (not reused, recycled or composted) per household, in kg (financial year starting April; English councils only)",
       W_SRC, WY0)
put_series("env_recycling", WY0, WY1, rec, 1)
put_series("env_residual", WY0, WY1, res, 0)

# ---------- fine particulate air pollution (OHID Fingertips), England ----------
FT_SRC = "OHID Fingertips (Public health profiles), from UKHSA modelled PM2.5"
air = {93867: defaultdict(dict), 93861: defaultdict(dict)}
for ind in air:
    for t in (501, 6):
        for r in csv.DictReader(open(os.path.join(RAW, f"ft_{ind}_{t}.csv"), encoding="utf-8-sig")):
            if r["Category Type"] or not re.fullmatch(r"\d{4}", r["Time period"].strip()) or num(r["Value"]) is None:
                continue
            code = r["Area Code"]
            code = ENG if code == ENG else (code if code.startswith("E12") else council(code))
            if code:
                air[ind][code][int(r["Time period"])] = num(r["Value"])
AY0 = min(min(d) for d in air[93867].values()); AY1 = max(max(d) for d in air[93867].values())
metric("env_pm25", "Air quality", "Fine particle pollution (PM2.5)", "µg/m³", 1,
       "Average concentration of fine particulate matter (PM2.5) where people live, in micrograms per cubic metre (England only; the WHO guideline is 5)",
       FT_SRC + ", indicator 93867", AY0)
metric("env_pm25_deaths", "Air quality", "Deaths linked to particle pollution", "%", 1,
       "Estimated share of adult deaths attributable to long-term exposure to fine particulate pollution (England only)",
       FT_SRC + ", indicator 93861", AY0)
put_series("env_pm25", AY0, AY1, air[93867], 1)
put_series("env_pm25_deaths", AY0, AY1, air[93861], 1)

# ---------- public EV chargers (DfT), 1 July 2026 ----------
EV_SRC = "DfT, Electric vehicle public charging infrastructure statistics (EVCI), from Zapmap"
EV_DATE = 2026
metric("env_ev", "Electric vehicles", "Public EV chargers", "", 0,
       "Public electric vehicle charging devices on 1 July 2026", EV_SRC, nature="count", census=EV_DATE)
metric("env_ev_100k", "Electric vehicles", "Public EV chargers per 100,000 people", "per 100k", 0,
       "Public electric vehicle charging devices per 100,000 residents, 1 July 2026", EV_SRC, census=EV_DATE)


def latest(row, first=2):
    vals = [num(x) for x in row[first:]]
    return next((v for v in reversed(vals) if v is not None), None)


for sh, id in (("EVCI0102a", "env_ev"), ("EVCI0102c", "env_ev_100k")):
    rows = sheet("evci0102_2026-07_EV_chargers_by_local_authority_UK.ods", sh); h = header_row(rows, "Local authority code")
    for r in rows[h + 1:]:
        c = council(r[0]); v = latest(r)
        if c and v is not None: V[id][c] = round(v, 0)
rows = sheet("evci0103_2026-07_EV_chargers_by_parliamentary_constituency_UK.ods", "EVCI0103a"); h = header_row(rows, "Code")
for r in rows[h + 1:]:
    v = latest(r)
    if str(r[0]) in PCON and v is not None: V["env_ev"][str(r[0])] = round(v, 0)
for sh, id in (("EVCI0101a", "env_ev"), ("EVCI0101c", "env_ev_100k")):
    rows = sheet("evci0101_2026-07_EV_chargers_by_region_and_country_UK.ods", sh); h = header_row(rows, "Date")
    head, last = rows[h], rows[-1]
    for i, name in enumerate(head):
        code = region_code(name)
        if code and num(last[i]) is not None: V[id][code] = round(num(last[i]), 0)

# ---------- write ----------
LEVEL = {c: p["level"] for c, p in PLACES.items()}
LEVEL.update({c: "constituency" for c in PCON})
for m in METRICS:
    n = defaultdict(int)
    for code in V[m["id"]]:
        n[LEVEL.get(code, "?")] += 1
    m["n"] = dict(sorted(n.items()))
out = {"y0": Y0, "metrics": METRICS, "v": V}
path = os.path.join(ROOT, "data", "environment.js")
with open(path, "w", encoding="utf-8") as fh:
    fh.write("/* Atlas 0.8.3: Environmental perspective. Generated by pipeline/build_environment.py: don't edit by hand. */\n")
    fh.write("window.ATLAS_ENV = " + json.dumps(out, separators=(",", ":"), ensure_ascii=False) + ";\n")
print(f"wrote data/environment.js ({os.path.getsize(path) // 1024} KB)")
for m in METRICS:
    print(f"  {m['id']:<18} {m['label']:<40} {m['n']}")
