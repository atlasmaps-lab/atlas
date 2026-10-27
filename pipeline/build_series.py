"""
Atlas 1.3: yearly series -> data/series.js   (python3 pipeline/build_series.py, standard library only)

sources/ons/regional_gdp_local_authorities_1998to2024.xlsx   ONS regional GDP, local authorities (September 2026 edition)
sources/ons/regional_gdp_local_authorities_1998to2023.xlsx   previous edition, used where the latest edition suppresses a figure [u]
sources/population_age_mid2025.csv                           ONS mid-2025 population (adds 2025)

Each series is {code: [value per year]} for councils. Regions, nations and the UK are summed from councils
(totals) or recomputed from summed totals (GDP per head = GDP / population). Growth rates are not averaged:
they are recomputed from summed real GDP.
"""
import csv, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from xlsx_read import rows

SRC, DATA = os.path.join(HERE, "sources"), os.path.join(os.path.dirname(HERE), "data")
NEW, OLD = (os.path.join(SRC, "ons", f) for f in ("regional_gdp_local_authorities_1998to2024.xlsx", "regional_gdp_local_authorities_1998to2023.xlsx"))
ALIAS = {"E08000016": "E08000038", "E08000019": "E08000039"}   # Barnsley and Sheffield got new codes in 2026
TABLES = {"gdp": "Table 5", "population": "Table 6", "gdp_real": "Table 10"}


def table(path, name):
    rs = rows(path, name)
    head = next(i for i, r in enumerate(rs) if r and len(r) > 2 and r[1] == "LA code")
    years = [int(str(y)[:4]) for y in rs[head][3:] if y]
    out = {}
    for r in rs[head + 1:]:
        if not r or len(r) < 4 or not r[1]: continue
        code = ALIAS.get(r[1].strip(), r[1].strip())
        out[code] = {y: (v if isinstance(v, float) else None) for y, v in zip(years, r[3:3 + len(years)])}
    return years, out


def main():
    uk = json.loads(open(os.path.join(DATA, "uk-data.js")).read().split("=", 1)[1].rstrip(";\n"))
    places = uk["places"]
    councils = [c for c, p in places.items() if p["level"] == "council"]
    series, years = {}, None
    for key, t in TABLES.items():
        years, new = table(NEW, t)
        _, old = table(OLD, t)
        filled = 0
        for c, vals in new.items():
            for y, v in vals.items():
                if v is None and old.get(c, {}).get(y) is not None:
                    vals[y] = old[c][y]; filled += 1
        series[key] = new
        print(f"{key:11} {len(new)} areas, {filled} suppressed values filled from the 2023 edition")
    years = list(range(min(years), 2026))
    pop25 = {r["code"]: float(r["population"]) for r in csv.DictReader(open(os.path.join(SRC, "population_age_mid2025.csv")))}
    for c in councils:
        v = pop25.get(c) or pop25.get(next((o for o, n in ALIAS.items() if n == c), ""))
        if v: series["population"].setdefault(c, {})[2025] = v
    # sums for regions, nations and the UK
    groups = {}
    for c in councils:
        p = places[c]
        for k in {p.get("parent"), p.get("nation"), "K02000001"} - {None}:
            groups.setdefault(k, []).append(c)
    for key in TABLES:
        s = series[key]
        for g, cs in groups.items():
            s[g] = {}
            for y in years:
                vs = [s.get(c, {}).get(y) for c in cs]
                if vs and all(v is not None for v in vs): s[g][y] = sum(vs)   # only when every council has a figure
    out = {"years": years, "sources": {
        "gdp": "ONS regional GDP at current market prices (£ million), local authorities, 1998–2024",
        "population": "ONS mid-year population estimates (1998–2024 from the GDP tables; 2025 from Nomis)",
        "gdp_real": "ONS regional GDP in chained volume measures, 2023 money value (£ million)"}, "series": {}}
    for key in TABLES:
        out["series"][key] = {c: [None if (v := vals.get(y)) is None else round(v, 1) for y in years] for c, vals in series[key].items() if c in places}
    missing = [places[c]["name"] for c in councils if c not in series["gdp"]]
    with open(os.path.join(DATA, "series.js"), "w") as fh:
        fh.write("window.ATLAS_SERIES = " + json.dumps(out, separators=(",", ":")) + ";\n")
    print(f"Series {years[0]}–{years[-1]} for {len(out['series']['gdp'])} areas. Councils with no GDP table row: {missing or 'none'}")


if __name__ == "__main__":
    main()
