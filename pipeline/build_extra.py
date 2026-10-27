"""
Atlas: Health perspective, Housing (Markets) and Government debt (Economic)  ->  data/extra.js and data/extra_wards.js
    python3 pipeline/fetch_extra.py   (downloads into pipeline/sources/extra_raw/)
    python3 pipeline/build_extra.py

Needs python-calamine to read the .xlsx/.ods/.xls files:  pip install python-calamine
The place lists come from data/uk-data.js and data/constituencies.js, so run build.py / build_constituencies.py first.

Output format (read by app.js, see "extra metrics" there):
  window.ATLAS_EXTRA = { y0, metrics: [ {id, p, group, label, unit, dp, nature, scale, desc, src, census?, mid?} ], v: { id: { code: value | [values from y0] } } }
  window.ATLAS_EXTRA_W = { codes: [wardCode...], v: { id: [value per code, same order] } }   (wards only; loaded when wards are first shown)
A yearly series starts at the metric's "ys" (years after y0).
A plain number is a single-date figure (Census 2021); an array is one value per year (null where missing).

Geography notes
  Census 2021 tables are published for output areas. They are added up into Atlas's wards (May 2024 wards; a few use the
  2022, 2023 or 2025 ward lookups), councils (2025 boundaries) and 2024 constituencies using ONS best-fit lookups, so every
  ward and constituency in England and Wales gets a figure. Scotland and Northern Ireland ran separate censuses (not loaded).
  Fingertips covers England only. The UK House Price Index and private rents cover the whole UK.
  Ward median prices (HPSSA 37) are for 2021-22 wards: where a ward has since been redrawn, the old ward covering most of it is used.
  Council debt: two-tier areas also get a "with county share" figure: the district's own borrowing plus the county council's,
  shared out by population. Fire, police, combined authorities and the GLA are not included.
"""
import csv, io, json, os, re, statistics, zipfile
from collections import defaultdict
from python_calamine import CalamineWorkbook

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
RAW = os.path.join(HERE, "sources", "extra_raw")
Y0, Y1 = 1995, 2026
NY = Y1 - Y0 + 1
UK, ENG, WAL = "K02000001", "E92000001", "W92000004"
# council codes that changed after some source tables were published (source code -> Atlas code)
ALIAS = {"E08000016": "E08000038", "E08000019": "E08000039"}


def load_js(name):
    s = open(os.path.join(ROOT, "data", name), encoding="utf-8").read()
    return json.loads(s[s.index("=") + 1:].strip().rstrip(";"))


UKD = load_js("uk-data.js")
PCON = load_js("constituencies.js")
PLACES = UKD["places"]
LEVEL = {c: p["level"] for c, p in PLACES.items()}
LEVEL.update({c: "constituency" for c in PCON["places"]})
WARDS = {c for c, l in LEVEL.items() if l == "ward"}
COUNCILS = {c for c, l in LEVEL.items() if l == "council"}
REGION_OF = {c: PLACES[c]["parent"] for c in COUNCILS}
SER = load_js("series.js")
POP = SER["series"]["population"]


def popAt(code, y):
    s = POP.get(code)
    if not s:
        return None
    i = min(y - SER["years"][0], len(s) - 1)
    while i >= 0 and s[i] is None:
        i -= 1
    return s[i] if i >= 0 else None


METRICS, V, VW = [], defaultdict(dict), defaultdict(dict)


def metric(id, p, group, label, unit, dp, desc, src, nature="rate", scale="ratio", **kw):
    METRICS.append(dict(id=id, p=p, group=group, label=label, unit=unit, dp=dp, nature=nature, scale=scale, desc=desc, src=src, **kw))


def code(c):
    c = ALIAS.get(c, c)
    return c if c in LEVEL else None


def put(id, c, y, v, ward_ok=True):
    """one value for one place and year"""
    c = code(c)
    if c is None or v is None or not (Y0 <= y <= Y1):
        return
    store = VW if LEVEL[c] == "ward" else V
    if LEVEL[c] == "ward" and not ward_ok:
        return
    arr = store[id].setdefault(c, [None] * NY)
    arr[y - Y0] = v


def num(x):
    try:
        if x in ("", None) or (isinstance(x, str) and x.strip().startswith("[")):
            return None
        return float(x)
    except (TypeError, ValueError):
        return None


# ---------------------------------------------------------------- Census 2021 (wards, constituencies, councils, regions)
def census():
    lk = lambda n: json.load(open(os.path.join(RAW, "lookups", n + ".json")))
    oa_lad = {r["OA21CD"]: r["LAD25CD"] for r in lk("OA21_WD25_LAD25_EW_LU_v3")}
    oa_pcon = {r["OA21CD"]: r["PCON25CD"] for r in lk("OA21_PCON25_LAD21_EW_LU")}
    # each Atlas ward -> the OAs in it, from the first lookup vintage that has that ward code
    ward_oas = defaultdict(list)
    for n, k in (("OA21_WD24_LAD24_EW_LU_v2", "WD24CD"), ("OA21_WD25_LAD25_EW_LU_v3", "WD25CD"), ("OA21_WD23_LAD23_EW_LU_v2", "WD23CD"),
                 ("OA21_WD22_LTLA22_UTLA22_RGN22_CTRY22_EW_LU_v2", "WD22CD")):
        part = defaultdict(list)
        for r in lk(n):
            if r[k] in WARDS and r[k] not in ward_oas:
                part[r[k]].append(r["OA21CD"])
        ward_oas.update(part)
    oa_wards = defaultdict(list)
    for w, oas in ward_oas.items():
        for o in oas:
            oa_wards[o].append(w)

    def table(t, lvl):
        z = zipfile.ZipFile(os.path.join(RAW, "census", f"census2021-{t}.zip"))
        name = [n for n in z.namelist() if n.endswith(f"-{lvl}.csv")][0]
        rows = list(csv.reader(io.TextIOWrapper(z.open(name), encoding="utf-8-sig")))
        hdr = [re.sub(r"; measures: Value$", "", h) for h in rows[0]]
        return hdr, rows[1:]

    def col(hdr, *needles):
        out = []
        for nd in needles:
            hit = [i for i, h in enumerate(hdr) if h.endswith(nd)]
            assert hit, (nd, hdr)
            out.append(hit[0])
        return out

    # id, table, label, numerator column endings, desc, group, perspective
    H, HO = "Census 2021: health", "Census 2021: homes"
    SPEC = [
        ("c_good_health", "ts037", "Good or very good health", ["Very good health", "Good health"], "Residents describing their health as good or very good", H, "health"),
        ("c_bad_health", "ts037", "Bad or very bad health", ["Bad health", "Very bad health"], "Residents describing their health as bad or very bad", H, "health"),
        ("c_disabled", "ts038", "Disabled (Equality Act)", ["Disability: Disabled under the Equality Act"], "Residents disabled under the Equality Act", H, "health"),
        ("c_disabled_lot", "ts038", "Day-to-day activities limited a lot", ["limited a lot"], "Residents whose day-to-day activities are limited a lot by a health problem or disability", H, "health"),
        ("c_carers", "ts039", "Unpaid carers", ["19 hours or less unpaid care a week", "20 to 49 hours unpaid care a week", "50 or more hours unpaid care a week"], "Residents aged 5+ who provide unpaid care", H, "health"),
        ("c_carers50", "ts039", "Unpaid care, 50+ hours a week", ["50 or more hours unpaid care a week"], "Residents aged 5+ providing 50 or more hours of unpaid care a week", H, "health"),
        ("c_owned", "ts054", "Home owners", ["Tenure of household: Owned"], "Households that own their home (outright or with a mortgage)", HO, "markets"),
        ("c_outright", "ts054", "Owned outright", ["Owns outright"], "Households that own their home outright", HO, "markets"),
        ("c_mortgage", "ts054", "Owned with a mortgage", ["Owns with a mortgage or loan"], "Households buying with a mortgage or loan", HO, "markets"),
        ("c_social", "ts054", "Social renting", ["Tenure of household: Social rented"], "Households renting from a council or housing association", HO, "markets"),
        ("c_private", "ts054", "Private renting", ["Tenure of household: Private rented"], "Households renting privately", HO, "markets"),
        ("c_detached", "ts044", "Detached houses", ["Detached"], "Households living in a detached house", HO, "markets"),
        ("c_semi", "ts044", "Semi-detached houses", ["Semi-detached"], "Households living in a semi-detached house", HO, "markets"),
        ("c_terraced", "ts044", "Terraced houses", ["Terraced"], "Households living in a terraced house", HO, "markets"),
        ("c_flats", "ts044", "Flats", ["purpose-built block of flats or tenement", "converted or shared house, including bedsits", "former school, church or warehouse", "office building, hotel or over a shop"], "Households living in a flat, maisonette or bedsit", HO, "markets"),
        ("c_overcrowded", "ts052", "Overcrowded homes", ["Occupancy rating of bedrooms: -1", "Occupancy rating of bedrooms: -2 or less"], "Households with fewer bedrooms than they need (bedroom standard)", HO, "markets"),
        ("c_underoccupied", "ts052", "Two or more spare bedrooms", ["Occupancy rating of bedrooms: +2 or more"], "Households with at least two more bedrooms than they need", HO, "markets"),
        ("c_one_bed", "ts050", "One-bedroom homes", ["1 bedroom"], "Households in a home with one bedroom", HO, "markets"),
        ("c_four_bed", "ts050", "Four or more bedrooms", ["4 or more bedrooms"], "Households in a home with four or more bedrooms", HO, "markets"),
        ("c_no_heating", "ts046", "No central heating", ["No central heating"], "Households without central heating", HO, "markets"),
        ("c_gas", "ts046", "Mains gas heating", ["Mains gas only"], "Households heated by mains gas only", HO, "markets"),
        ("c_renewable", "ts046", "Renewable heating", ["Renewable energy only", "(including renewable energy)"], "Households with renewable central heating (alone or with another type)", HO, "markets"),
    ]
    by_table = defaultdict(list)
    for s in SPEC:
        by_table[s[1]].append(s)
    for t, specs in by_table.items():
        hdr, rows = table(t, "oa")
        tot = [i for i, h in enumerate(hdr) if ": Total" in h][0]
        cols = [col(hdr, *s[3]) for s in specs]
        acc = [defaultdict(lambda: [0, 0]) for _ in specs]
        for r in rows:
            oa, d = r[2], int(r[tot])
            places = oa_wards.get(oa, []) + [oa_lad.get(oa), oa_pcon.get(oa)]
            for k, cs in enumerate(cols):
                n = sum(int(r[i]) for i in cs)
                for p in places:
                    if p:
                        a = acc[k][p]; a[0] += n; a[1] += d
        for lvl in ("rgn", "ctry"):
            h2, rows2 = table(t, lvl)
            tot2 = [i for i, h in enumerate(h2) if ": Total" in h][0]
            cols2 = [col(h2, *s[3]) for s in specs]
            for r in rows2:
                for k, cs in enumerate(cols2):
                    acc[k][r[2]] = [sum(int(r[i]) for i in cs), int(r[tot2])]
        for k, s in enumerate(specs):
            metric(s[0], s[6], s[5], s[2], "%", 1, s[4], "ONS Census 2021 (" + s[1].upper() + "), via Nomis; summed from output areas", census=2021)
            for p, (n, d) in acc[k].items():
                c = code(p)
                if c and d:
                    (VW if LEVEL[c] == "ward" else V)[s[0]][c] = round(100 * n / d, 1)
    # households and average household size (absolute / mean)
    for id_, t in (("c_households", "ts041"), ("c_hh_size", "ts017")):
        hdr, rows = table(t, "oa")
        acc = defaultdict(lambda: [0, 0])
        if t == "ts041":
            for r in rows:
                for p in oa_wards.get(r[2], []) + [oa_lad.get(r[2]), oa_pcon.get(r[2])]:
                    if p:
                        acc[p][0] += int(r[3])
        else:
            sizes = [(i, int(re.search(r"(\d+)", h.split(":")[1]).group(1))) for i, h in enumerate(hdr) if "people in household" in h or "person in household" in h]
            for r in rows:
                n = sum(int(r[i]) * k for i, k in sizes if k > 0); d = sum(int(r[i]) for i, k in sizes if k > 0)
                for p in oa_wards.get(r[2], []) + [oa_lad.get(r[2]), oa_pcon.get(r[2])]:
                    if p:
                        acc[p][0] += n; acc[p][1] += d
        for lvl in ("rgn", "ctry"):
            h2, rows2 = table(t, lvl)
            for r in rows2:
                if t == "ts041":
                    acc[r[2]] = [int(r[3]), 0]
                else:
                    sz = [(i, int(re.search(r"(\d+)", h.split(":")[1]).group(1))) for i, h in enumerate(h2) if "in household" in h and "Total" not in h]
                    acc[r[2]] = [sum(int(r[i]) * k for i, k in sz if k > 0), sum(int(r[i]) for i, k in sz if k > 0)]
        if t == "ts041":
            metric(id_, "markets", HO, "Households", "", 0, "Number of households", "ONS Census 2021 (TS041), via Nomis", nature="count", census=2021)
        else:
            metric(id_, "markets", HO, "Average household size", "people", 2, "People per occupied home", "ONS Census 2021 (TS017), via Nomis", census=2021)
        for p, (n, d) in acc.items():
            c = code(p)
            if c:
                (VW if LEVEL[c] == "ward" else V)[id_][c] = n if t == "ts041" else (round(n / d, 2) if d else None)


# ---------------------------------------------------------------- Fingertips (England: councils, regions; some wards)
def year_of(period):
    s = period.strip()
    right = s.split(" - ")[-1]
    left4 = re.search(r"(\d{4})", s).group(1)
    if "/" in right:
        right = right.split("/")[1]
    m = re.search(r"(\d{4}|\d{2})$", right)
    y = m.group(1)
    return int(y) if len(y) == 4 else int(left4[:2] + y) if int(y) >= int(left4[2:]) else int(str(int(left4[:2]) + 1) + y)


def fingertips():
    F = [  # id, indicator, sex, perspective, group, label, unit, dp, desc
        ("le_m", 90366, "Male", "health", "Life expectancy", "Life expectancy at birth (men)", "years", 1, "Average years a newborn boy would live at current death rates (3-year average)"),
        ("le_f", 90366, "Female", "health", "Life expectancy", "Life expectancy at birth (women)", "years", 1, "Average years a newborn girl would live at current death rates (3-year average)"),
        ("le65_m", 91102, "Male", "health", "Life expectancy", "Life expectancy at 65 (men)", "years", 1, "Further years a 65-year-old man can expect to live"),
        ("le65_f", 91102, "Female", "health", "Life expectancy", "Life expectancy at 65 (women)", "years", 1, "Further years a 65-year-old woman can expect to live"),
        ("hle_m", 94359, "Male", "health", "Life expectancy", "Healthy life expectancy (men)", "years", 1, "Years a newborn boy would live in good health"),
        ("hle_f", 94359, "Female", "health", "Life expectancy", "Healthy life expectancy (women)", "years", 1, "Years a newborn girl would live in good health"),
        ("u75_all", 108, "Persons", "health", "Deaths", "Early deaths (under 75), all causes", "per 100k", 0, "Deaths under 75 per 100,000 people, age-standardised"),
        ("u75_prev", 93721, "Persons", "health", "Deaths", "Preventable early deaths", "per 100k", 0, "Deaths under 75 from causes considered preventable, per 100,000, age-standardised"),
        ("u75_cvd", 40401, "Persons", "health", "Deaths", "Early deaths: heart and circulation", "per 100k", 0, "Deaths under 75 from cardiovascular disease per 100,000, age-standardised"),
        ("u75_cancer", 40501, "Persons", "health", "Deaths", "Early deaths: cancer", "per 100k", 0, "Deaths under 75 from cancer per 100,000, age-standardised"),
        ("u75_resp", 40701, "Persons", "health", "Deaths", "Early deaths: respiratory disease", "per 100k", 0, "Deaths under 75 from respiratory disease per 100,000, age-standardised"),
        ("u75_liver", 40601, "Persons", "health", "Deaths", "Early deaths: liver disease", "per 100k", 0, "Deaths under 75 from liver disease per 100,000, age-standardised"),
        ("infant_mort", 92196, "Persons", "health", "Deaths", "Infant mortality", "per 1,000", 1, "Deaths under one year old per 1,000 live births"),
        ("alcohol_deaths", 93763, "Persons", "health", "Deaths", "Alcohol-related deaths", "per 100k", 0, "Alcohol-related deaths per 100,000, age-standardised"),
        ("drug_deaths", 92432, "Persons", "health", "Deaths", "Deaths from drug misuse", "per 100k", 1, "Deaths from drug misuse per 100,000, age-standardised"),
        ("suicide", 41001, "Persons", "health", "Deaths", "Suicide rate", "per 100k", 1, "Suicides per 100,000, age-standardised (3-year average)"),
        ("covid_deaths", 93954, "Persons", "health", "Deaths", "COVID-19 deaths", "per 100k", 0, "Deaths due to COVID-19 per 100,000, age-standardised"),
        ("adult_obese", 93881, "Persons", "health", "Weight & lifestyle", "Adult obesity", "%", 1, "Adults (18+) classified as obese"),
        ("adult_overweight", 93088, "Persons", "health", "Weight & lifestyle", "Adults overweight or obese", "%", 1, "Adults (18+) classified as overweight or obese"),
        ("y6_obese", 90323, "Persons", "health", "Weight & lifestyle", "Obesity at age 10-11 (Year 6)", "%", 1, "Year 6 children who are obese (National Child Measurement Programme)"),
        ("rec_obese", 90319, "Persons", "health", "Weight & lifestyle", "Obesity at age 4-5 (Reception)", "%", 1, "Reception children who are obese (National Child Measurement Programme)"),
        ("smoking", 92443, "Persons", "health", "Weight & lifestyle", "Adults who smoke", "%", 1, "Adults (18+) who currently smoke (Annual Population Survey)"),
        ("inactive", 93015, "Persons", "health", "Weight & lifestyle", "Physically inactive adults", "%", 1, "Adults doing under 30 minutes of moderate activity a week"),
        ("five_a_day", 93982, "Persons", "health", "Weight & lifestyle", "Adults eating 5 a day", "%", 1, "Adults meeting the 5-a-day fruit and vegetable recommendation"),
        ("diabetes", 241, "Persons", "health", "Conditions & wellbeing", "Diabetes (GP-recorded)", "%", 1, "Patients aged 17+ on GP diabetes registers"),
        ("copd", 253, "Persons", "health", "Conditions & wellbeing", "COPD (GP-recorded)", "%", 1, "Patients on GP registers for chronic obstructive pulmonary disease"),
        ("asthma", 90933, "Persons", "health", "Conditions & wellbeing", "Asthma (GP-recorded)", "%", 1, "Patients on GP asthma registers"),
        ("dep_anx", 93376, "Persons", "health", "Conditions & wellbeing", "Depression or anxiety", "%", 1, "People reporting depression or anxiety (GP Patient Survey)"),
        ("low_satisfaction", 22301, "Persons", "health", "Conditions & wellbeing", "Low life satisfaction", "%", 1, "Adults with a low life satisfaction score (Annual Population Survey)"),
        ("high_anxiety", 22304, "Persons", "health", "Conditions & wellbeing", "High anxiety", "%", 1, "Adults with a high anxiety score (Annual Population Survey)"),
        ("low_birthweight", 20101, "Persons", "health", "Conditions & wellbeing", "Low birth weight", "%", 1, "Term babies weighing under 2.5 kg"),
        ("pm25", 93867, "Persons", "health", "Environment & care", "Fine particle air pollution (PM2.5)", "µg/m³", 1, "Average concentration of fine particulate matter"),
        ("care_beds", 92489, "Persons", "health", "Environment & care", "Care home beds", "per 100 aged 75+", 1, "Care home beds for every 100 people aged 75 and over"),
        ("temp_accom", 93735, "Persons", "markets", "Housing need", "Households in temporary accommodation", "per 1,000", 1, "Households in temporary accommodation per 1,000 households"),
        ("homeless_duty", 93736, "Persons", "markets", "Housing need", "Households owed a homelessness duty", "per 1,000", 1, "Households owed a prevention or relief duty under the Homelessness Reduction Act, per 1,000"),
        ("fuel_poverty", 93759, None, "markets", "Housing need", "Fuel poverty", "%", 1, "Households in fuel poverty (low income, low energy efficiency)"),
    ]
    for id_, ind, sex, p, group, label, unit, dp, desc in F:
        metric(id_, p, group, label, unit, dp, desc, "OHID Fingertips (indicator " + str(ind) + "); England only")
        for t in (501, 6):
            path = os.path.join(RAW, "fingertips", f"d_{ind}_{t}.csv")
            if not os.path.exists(path):
                continue
            rows = [r for r in csv.DictReader(open(path, encoding="utf-8-sig")) if not r["Category Type"].strip() and r["Value"]]
            if sex and any(r["Sex"] == sex for r in rows):
                rows = [r for r in rows if r["Sex"] == sex]
            elif sex in ("Male", "Female"):
                continue
            if not rows:
                continue
            age = statistics.mode(r["Age"] for r in rows)
            for r in rows:
                if r["Age"] == age:
                    put(id_, r["Area Code"], year_of(r["Time period"]), round(float(r["Value"]), dp))
    # ward-level child obesity (3 years combined) into the same metrics
    for id_, ind in (("y6_obese", 93107), ("rec_obese", 93105)):
        for r in csv.DictReader(open(os.path.join(RAW, "fingertips", f"d_{ind}_8.csv"), encoding="utf-8-sig")):
            if r["Value"] and not r["Category Type"].strip() and r["Area Code"] in WARDS:
                put(id_, r["Area Code"], year_of(r["Time period"]), round(float(r["Value"]), 1))


# ---------------------------------------------------------------- house prices, rents, homes
def housing():
    G1, G2, G3 = "House prices", "Rents", "Homes"
    # UK House Price Index: monthly -> yearly average
    cols = {"hpi_avg": "AveragePrice", "hpi_detached": "DetachedPrice", "hpi_semi": "SemiDetachedPrice", "hpi_terraced": "TerracedPrice",
            "hpi_flat": "FlatPrice", "hpi_ftb": "FTBPrice"}
    acc = defaultdict(lambda: defaultdict(list)); sales = defaultdict(lambda: defaultdict(list))
    for r in csv.DictReader(open(os.path.join(RAW, "files", "uk-hpi.csv"), encoding="utf-8-sig")):
        y = int(r["Date"][-4:])
        for id_, c in cols.items():
            v = num(r[c])
            if v:
                acc[(id_, r["AreaCode"])][y].append(v)
        if r["SalesVolume"]:
            sales[r["AreaCode"]][y].append(float(r["SalesVolume"]))
    labels = {"hpi_avg": ("Average house price", "Average price of all homes sold (UK House Price Index, yearly average)"),
              "hpi_detached": ("Average price: detached", "Average price of detached houses"), "hpi_semi": ("Average price: semi-detached", "Average price of semi-detached houses"),
              "hpi_terraced": ("Average price: terraced", "Average price of terraced houses"), "hpi_flat": ("Average price: flats", "Average price of flats and maisonettes"),
              "hpi_ftb": ("First-time buyer price", "Average price paid by first-time buyers")}
    for id_, (label, desc) in labels.items():
        metric(id_, "markets", G1, label, "£", 0, desc, "HM Land Registry UK House Price Index (with Registers of Scotland and LPS Northern Ireland)", nature="rate")
    metric("hpi_change", "markets", G1, "House price change (1 year)", "%", 1, "Change in the yearly average price on the year before", "HM Land Registry UK House Price Index", nature="change", scale="interval", mid=0)
    metric("hpi_sales", "markets", G1, "Homes sold", "", 0, "Number of residential sales in the year (complete years only)", "HM Land Registry UK House Price Index", nature="count")
    for (id_, c), ys in acc.items():
        for y, vs in ys.items():
            put(id_, c, y, round(sum(vs) / len(vs)), ward_ok=False)
            if id_ == "hpi_avg" and y - 1 in ys:
                a, b = sum(vs) / len(vs), sum(ys[y - 1]) / len(ys[y - 1])
                put("hpi_change", c, y, round((a / b - 1) * 100, 1))
    for c, ys in sales.items():
        for y, vs in ys.items():
            if len(vs) == 12:
                put("hpi_sales", c, y, int(sum(vs)))

    # ONS median prices and affordability (England and Wales; year ending September)
    wb = CalamineWorkbook.from_path(os.path.join(RAW, "files", "affordability.xlsx"))
    metric("median_price", "markets", G1, "Median house price", "£", 0, "Middle price paid for homes sold in the year to September (wards: year to December)", "ONS House Price Statistics for Small Areas", nature="rate")
    metric("afford", "markets", G1, "House price to earnings", "× earnings", 2, "Median house price divided by median full-time earnings of people working in the area", "ONS housing affordability (ASHE and HPSSA)")
    metric("afford_lq", "markets", G1, "Cheaper homes to lower earnings", "× earnings", 2, "Lower-quartile house price divided by lower-quartile full-time earnings", "ONS housing affordability (ASHE and HPSSA)")
    for sheet, id_ in (("1a", "median_price"), ("5a", "median_price"), ("1c", "afford"), ("5c", "afford"), ("2c", "afford_lq"), ("6c", "afford_lq")):
        rows = wb.get_sheet_by_name(sheet).to_python()
        hi = [i for i, r in enumerate(rows[:10]) if r and str(r[0]).strip() in ("Code", "Country/Region code")][0]
        hdr = rows[hi]; cc = 2 if sheet[0] in "56" else 0
        years = [(i, int(re.search(r"(\d{4})", str(h)).group(1))) for i, h in enumerate(hdr) if re.search(r"(\d{4})", str(h))]
        for r in rows[hi + 1:]:
            if len(r) > cc and r[cc]:
                for i, y in years:
                    v = num(r[i]) if i < len(r) else None
                    if v is not None:
                        put(id_, str(r[cc]).strip(), y, round(v, 2) if id_ != "median_price" else round(v))
    # ward medians: 2021-22 wards; current wards that were redrawn use the old ward that covers most of their output areas
    wb = CalamineWorkbook.from_path(os.path.join(RAW, "files", "hpssa37-ward.xls"))
    rows = wb.get_sheet_by_name("1a").to_python()
    hi = [i for i, r in enumerate(rows[:12]) if r and str(r[0]).startswith("Local authority code")][0]
    years = [(i, int(h[-4:])) for i, h in enumerate(rows[hi]) if str(h).startswith("Year ending Dec")]
    old = {}
    for r in rows[hi + 1:]:
        if len(r) > 3 and r[2]:
            old[str(r[2]).strip()] = {y: num(r[i]) for i, y in years}
    lk = lambda n: json.load(open(os.path.join(RAW, "lookups", n + ".json")))
    oa22 = {r["OA21CD"]: r["WD22CD"] for r in lk("OA21_WD22_LTLA22_UTLA22_RGN22_CTRY22_EW_LU_v2")}
    w24 = defaultdict(list)
    for r in lk("OA21_WD24_LAD24_EW_LU_v2"):
        w24[r["WD24CD"]].append(r["OA21CD"])
    matched = approx = 0
    for w in WARDS:
        src = w if w in old else None
        if not src and w in w24:
            cnt = defaultdict(int)
            for o in w24[w]:
                cnt[oa22.get(o)] += 1
            best, n = max(cnt.items(), key=lambda kv: kv[1])
            if best in old and n >= 0.6 * len(w24[w]):
                src = best; approx += 1
        elif src:
            matched += 1
        if src:
            for y, v in old[src].items():
                if v:
                    put("median_price", w, y, round(v))
    print(f"  ward median prices: {matched} exact, {approx} via the 2022 ward covering most of it")

    # private rents (ONS PIPR, monthly from 2015): yearly averages
    wb = CalamineWorkbook.from_path(os.path.join(RAW, "files", "rents.xlsx"))
    rows = wb.get_sheet_by_name("Table 1").to_python()
    hi = [i for i, r in enumerate(rows[:10]) if r and r[0] == "Time period"][0]
    hdr = rows[hi]
    rc = {"rent_avg": "Rental price", "rent_1bed": "Rental price one bed", "rent_2bed": "Rental price two bed", "rent_3bed": "Rental price three bed"}
    idx = {k: hdr.index(v) for k, v in rc.items()}
    racc = defaultdict(lambda: defaultdict(list))
    for r in rows[hi + 1:]:
        if not r[1] or str(r[1]).startswith("["):
            continue
        y = r[0].year if hasattr(r[0], "year") else int(str(r[0])[:4])
        for k, i in idx.items():
            v = num(r[i])
            if v:
                racc[(k, r[1])][y].append(v)
    for k, (label, desc) in {"rent_avg": ("Average private rent", "Average monthly private rent (all homes)"), "rent_1bed": ("Rent: one bedroom", "Average monthly private rent, one-bedroom homes"),
                             "rent_2bed": ("Rent: two bedrooms", "Average monthly private rent, two-bedroom homes"), "rent_3bed": ("Rent: three bedrooms", "Average monthly private rent, three-bedroom homes")}.items():
        metric(k, "markets", G2, label, "£ a month", 0, desc, "ONS Price Index of Private Rents (yearly average of monthly figures)", nature="rate")
    metric("rent_change", "markets", G2, "Rent change (1 year)", "%", 1, "Change in the yearly average rent on the year before", "ONS Price Index of Private Rents", nature="change", scale="interval", mid=0)
    for (k, c), ys in racc.items():
        for y, vs in ys.items():
            put(k, c, y, round(sum(vs) / len(vs)), ward_ok=False)
            if k == "rent_avg" and y - 1 in ys and len(ys[y - 1]) == 12:
                put("rent_change", c, y, round((sum(vs) / len(vs) / (sum(ys[y - 1]) / len(ys[y - 1])) - 1) * 100, 1))

    # dwellings and empty homes (England)
    wb = CalamineWorkbook.from_path(os.path.join(RAW, "files", "dwellings-t125.ods"))
    rows = wb.get_sheet_by_name("LT_125_unrounded").to_python()
    hi = [i for i, r in enumerate(rows[:12]) if "New ONS code" in [str(x) for x in r]][0]
    ci = rows[hi].index("New ONS code")
    years = [(i, int(str(h)[:4])) for i, h in enumerate(rows[hi]) if re.match(r"\d{4}", str(h))]
    stock = defaultdict(dict)
    for r in rows[hi + 1:]:
        if len(r) > ci and r[ci]:
            for i, y in years:
                v = num(r[i]) if i < len(r) else None
                if v:
                    stock[ALIAS.get(r[ci], r[ci])][y] = v
    metric("dwellings", "markets", G3, "Homes (dwelling stock)", "", 0, "Number of dwellings, 31 March", "MHCLG live table 125", nature="count")
    metric("vacant_pct", "markets", G3, "Empty homes", "%", 2, "Vacant dwellings as a share of all dwellings (October count)", "MHCLG live tables 615 and 125")
    metric("lt_vacant_pct", "markets", G3, "Long-term empty homes", "%", 2, "Dwellings empty for over six months, as a share of all dwellings", "MHCLG live tables 615 and 125")
    for c, ys in stock.items():
        for y, v in ys.items():
            put("dwellings", c, y, int(round(v)), ward_ok=False)
    wb = CalamineWorkbook.from_path(os.path.join(RAW, "files", "vacants-t615.ods"))
    for sheet, id_ in (("All_vacants", "vacant_pct"), ("All_long_term_vacants", "lt_vacant_pct")):
        rows = wb.get_sheet_by_name(sheet).to_python()
        hi = [i for i, r in enumerate(rows[:10]) if r and r[0] == "ONS code"][0]
        years = [(i, int(str(h)[-4:])) for i, h in enumerate(rows[hi]) if re.search(r"\d{4}$", str(h))]
        for r in rows[hi + 1:]:
            c = ALIAS.get(r[0], r[0]) if r and r[0] else None
            if not c:
                continue
            for i, y in years:
                v = num(r[i]) if i < len(r) else None
                s = stock.get(c, {}).get(y) or stock.get(c, {}).get(y + 1)
                if v is not None and s:
                    put(id_, c, y, round(100 * v / s, 2), ward_ok=False)


# ---------------------------------------------------------------- government debt
def debt():
    G = "Government debt"
    # national: public sector net debt (UK)
    pct = json.load(open(os.path.join(RAW, "files", "psnd-pct-gdp.json")))
    bn = json.load(open(os.path.join(RAW, "files", "psnd-bn.json")))
    def yearly(o):
        out = {int(x["year"]): float(x["value"]) for x in o["years"] if x["value"]}
        full = set(out)
        for x in o["months"]:  # a year with no annual figure yet takes its latest month
            if x["value"] and int(x["year"]) not in full:
                out[int(x["year"])] = float(x["value"])
        return out
    metric("psnd_pct", "economic", G, "National debt (% of GDP)", "% of GDP", 1, "UK public sector net debt, excluding public sector banks, as a share of GDP (end of year)", "ONS public sector finances (HF6X)")
    metric("psnd_bn", "economic", G, "National debt", "£", 0, "UK public sector net debt, excluding public sector banks (end of year)", "ONS public sector finances (HF6W)", nature="amount")
    metric("psnd_ph", "economic", G, "National debt per person", "£", 0, "UK public sector net debt divided by the UK population", "ONS public sector finances and population estimates", nature="rate")
    p, b = yearly(pct), yearly(bn)
    for y, v in p.items():
        put("psnd_pct", UK, y, v)
    for y, v in b.items():
        put("psnd_bn", UK, y, round(v * 1e9))
        pop = popAt(UK, y)
        if pop:
            put("psnd_ph", UK, y, round(v * 1e9 / pop))
    # local: councils' borrowing (England), MHCLG capital outturn, £ thousands at 31 March
    rows = list(csv.DictReader(open(os.path.join(RAW, "files", "capital-outturn.csv"), encoding="utf-8-sig")))
    F = {"la_borrow": "PRU2T1_prubrwgrs_end", "la_cfr": "PRU1_prucfrend_amt", "la_invest": "PRU2T1_pruinv_end", "la_net": "PRU2T1_prubrwnet_end"}
    vals = defaultdict(dict)  # (field, code) -> {year: £}
    for r in rows:
        y = int(r["PeriodCode"][:4]); c = ALIAS.get(r["ONS_Code"], r["ONS_Code"])
        for k, f in F.items():
            v = num(r.get(f))
            if v is not None:
                vals[(k, c)][y] = v * 1000
    lad_cty = {}
    for r in json.load(open(os.path.join(RAW, "lookups", "LAD25_CTYUA25_EW_LU_v2.json"))):
        if r["CTYUA25CD"] != r["LAD25CD"]:
            lad_cty[r["LAD25CD"]] = r["CTYUA25CD"]
    cty_pop = defaultdict(lambda: defaultdict(float))
    for d, cty in lad_cty.items():
        for y in range(2019, Y1 + 1):
            pp = popAt(d, y)
            if pp:
                cty_pop[cty][y] += pp
    metric("la_borrow", "economic", G, "Council borrowing", "£", 0, "The council's outstanding external borrowing at 31 March (districts: the district council only)", "MHCLG capital outturn returns; England", nature="amount")
    metric("la_borrow_ph", "economic", G, "Council borrowing per resident", "£", 0, "Outstanding external borrowing per resident, including a population share of the county council's in two-tier areas", "MHCLG capital outturn returns; ONS population; England", nature="rate", weight="population")
    metric("la_cfr_ph", "economic", G, "Council debt need per resident", "£", 0, "Capital financing requirement per resident (borrowing the council needs for past capital spending), incl. county share in two-tier areas", "MHCLG capital outturn returns; England", nature="rate", weight="population")
    metric("la_net", "economic", G, "Council net borrowing", "£", 0, "External borrowing plus credit arrangements (such as PFI) minus investments, at 31 March", "MHCLG capital outturn returns; England", nature="amount", scale="interval", mid=0)
    metric("la_invest", "economic", G, "Council investments", "£", 0, "Investments held at 31 March", "MHCLG capital outturn returns; England", nature="amount")
    region_tot = defaultdict(lambda: defaultdict(lambda: [0.0, 0.0]))
    for c in COUNCILS:
        if c[0] != "E":
            continue
        for y in range(2019, Y1 + 1):
            own = {k: vals.get((k, c), {}).get(y) for k in F}
            if own["la_borrow"] is None:
                continue
            for k in ("la_borrow", "la_net", "la_invest"):
                put(k, c, y, round(own[k]))
            pop = popAt(c, y)
            share = {k: own[k] or 0 for k in ("la_borrow", "la_cfr")}
            cty = lad_cty.get(c)
            if cty and pop and cty_pop[cty].get(y):
                f = pop / cty_pop[cty][y]
                for k in share:
                    cv = vals.get((k, cty), {}).get(y)
                    if cv:
                        share[k] += cv * f
            if pop:
                put("la_borrow_ph", c, y, round(share["la_borrow"] / pop))
                if own["la_cfr"] is not None:
                    put("la_cfr_ph", c, y, round(share["la_cfr"] / pop))
                for reg in (REGION_OF.get(c), ENG):
                    if reg:
                        t = region_tot[reg][y]; t[0] += share["la_borrow"]; t[1] += pop
    for reg, ys in region_tot.items():
        for y, (tot, pop) in ys.items():
            put("la_borrow", reg, y, round(tot)); put("la_borrow_ph", reg, y, round(tot / pop))


def main():
    print("census..."); census()
    print("fingertips..."); fingertips()
    print("housing..."); housing()
    print("debt..."); debt()
    used = {m["id"] for m in METRICS}
    def pack(store):
        out = {}
        for id_, d in store.items():
            if id_ not in used:
                continue
            o = {}
            for c, v in d.items():
                if isinstance(v, list):
                    while v and v[-1] is None:
                        v = v[:-1]
                    if not any(x is not None for x in v):
                        continue
                o[c] = v
            if o:
                out[id_] = o
        return out
    v, vw = pack(V), pack(VW)
    metrics = [m for m in METRICS if m["id"] in v or m["id"] in vw]
    # yearly series start at the metric's first year with data ("ys", years after y0), to keep the files small
    for m in metrics:
        firsts = [next(i for i, x in enumerate(a) if x is not None) for st in (v, vw) for a in st.get(m["id"], {}).values() if isinstance(a, list)]
        if firsts:
            m["ys"] = k = min(firsts)
            for st in (v, vw):
                for c, a in st.get(m["id"], {}).items():
                    if isinstance(a, list):
                        st[m["id"]][c] = a[k:]
    for m in metrics:
        lv = defaultdict(int)
        for c in list(v.get(m["id"], {})) + list(vw.get(m["id"], {})):
            lv[LEVEL[c]] += 1
        m["n"] = dict(lv)
    with open(os.path.join(ROOT, "data", "extra.js"), "w", encoding="utf-8") as fh:
        fh.write("// Generated by pipeline/build_extra.py. Do not edit by hand.\nwindow.ATLAS_EXTRA = ")
        json.dump({"y0": Y0, "metrics": metrics, "v": v}, fh, ensure_ascii=False, separators=(",", ":"))
        fh.write(";\n")
    with open(os.path.join(ROOT, "data", "extra_wards.js"), "w", encoding="utf-8") as fh:
        fh.write("// Generated by pipeline/build_extra.py. Do not edit by hand.\nwindow.ATLAS_EXTRA_W = ")
        codes = sorted({c for d in vw.values() for c in d})
        json.dump({"codes": codes, "v": {k: [d.get(c) for c in codes] for k, d in vw.items()}}, fh, ensure_ascii=False, separators=(",", ":"))
        fh.write(";\n")
    for m in metrics:
        print(f"  {m['p']:9} {m['id']:18} {m['n']}")
    print("extra.js", os.path.getsize(os.path.join(ROOT, "data", "extra.js")) // 1000, "KB; extra_wards.js", os.path.getsize(os.path.join(ROOT, "data", "extra_wards.js")) // 1000, "KB")


if __name__ == "__main__":
    main()
