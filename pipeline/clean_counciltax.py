"""
Atlas 1.7: council tax, Band D, by council and financial year -> sources/council_tax_band_d.csv;
CPIH (ONS L522) April values -> sources/cpih_april.csv   (python3 pipeline/clean_counciltax.py; standard library only)

England  MHCLG "Band D council tax figures 1993 onwards" (Band_D_2026-27.ods), sheet Area_CT: Band D area council tax, the
         headline figure a Band D household pays in the area (council, county, police, fire, mayor and parish precepts)
Scotland Scottish Government "Council Tax by band" files, one per year (2014-15 onwards; the 2012-13 and 2013-14 files are
         old-format .xls, which the standard library can't read, so those years are missing). Council tax only, without
         water and sewerage charges
Wales    StatsWales "Composition of average band D council tax by billing authority": Total CT for billing authority area
Northern Ireland has domestic rates, not council tax: no rows (the app says "Not applicable in Northern Ireland").
"""
import csv, json, os, re, sys, unicodedata

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC = os.path.join(HERE, "sources")
RAW = os.path.join(SRC, "raw")
sys.path.insert(0, HERE)
from ods_read import rows as ods_rows
from xlsx_read import rows as xlsx_rows, sheets as xlsx_sheets

SCOT_ALIAS = {"edinburgh city of": "city of edinburgh", "eilean siar": "na h eileanan siar", "comhairle nan eilean siar": "na h eileanan siar"}


def norm(s):
    s = unicodedata.normalize("NFKD", str(s)).encode("ascii", "ignore").decode().lower().replace("&", " and ")
    s = re.sub(r"[^a-z0-9]+", " ", s).strip()
    return SCOT_ALIAS.get(s, s)


def councils():
    s = open(os.path.join(ROOT, "data", "uk-data.js"), encoding="utf-8").read()
    P = json.loads(s[s.index("=") + 1:].strip().rstrip(";"))["places"]
    return {c: p for c, p in P.items() if p["level"] == "council"}


def england(C):
    R = ods_rows(os.path.join(RAW, "Band_D_2026-27.ods"), "Area_CT")
    head = R[2]
    years = [(i, int(h[:4])) for i, h in enumerate(head) if isinstance(h, str) and re.match(r"\d{4} to \d{4}", h)]
    out = []
    for r in R[3:]:
        if len(r) < 6 or not isinstance(r[1], str) or r[1] not in C or r[3] != "YES":
            continue
        for i, y in years:
            v = r[i] if i < len(r) else None
            if isinstance(v, float):
                out.append({"code": r[1], "fy": y, "band_d": round(v, 2), "source": "MHCLG Band D live table, Area_CT (inc. parish precepts)"})
    return out


def scotland(C):
    by = {norm(p["name"]): c for c, p in C.items() if c.startswith("S12")}
    out, miss = [], set()
    d = os.path.join(RAW, "scot_ctax")
    for f in sorted(os.listdir(d)):
        m = re.match(r"band_(\d{4})-\d\d\.xlsx$", f)
        if not m:
            continue
        path = os.path.join(d, f)
        R = xlsx_rows(path, xlsx_sheets(path)[0])
        hdr = next(i for i, r in enumerate(R) if r and len(r) > 4 and str(r[4]).strip() == "Band D")
        for r in R[hdr + 1:]:
            if not r or not isinstance(r[0], str) or len(r) < 5 or not isinstance(r[4], float):
                continue
            k = norm(r[0])
            if k.startswith("scotland") or k.startswith("valuation") or k.startswith("ratio"):
                continue
            code = by.get(k)
            if not code:
                miss.add(r[0]); continue
            out.append({"code": code, "fy": int(m.group(1)), "band_d": round(r[4], 2), "source": "Scottish Government, Council Tax by band " + f[5:12]})
    return out, miss


def wales(C):
    out = []
    for r in csv.DictReader(open(os.path.join(RAW, "statswales_band_d_composition.csv"), encoding="utf-8-sig")):
        if r["Data description"] != "£ per band D" or r["Row_reference"] != "3" or r["Authority_reference"] not in C:
            continue
        out.append({"code": r["Authority_reference"], "fy": int(r["Year"][:4]), "band_d": round(float(r["Data values"]), 2),
                    "source": "StatsWales, composition of average band D council tax: total for billing authority area"})
    return out


def cpih():
    out = []
    for r in csv.reader(open(os.path.join(RAW, "ons_cpih_L522.csv"), encoding="utf-8")):
        if len(r) == 2 and re.match(r"\d{4} APR$", r[0]):
            out.append({"fy": int(r[0][:4]), "cpih_april": float(r[1]), "source": "ONS CPIH index 00: all items, 2015=100 (L522), April"})
    with open(os.path.join(SRC, "cpih_april.csv"), "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=["fy", "cpih_april", "source"])
        w.writeheader(); w.writerows(out)
    return out


def main():
    C = councils()
    e, (s, miss), w = england(C), scotland(C), wales(C)
    rows = e + s + w
    with open(os.path.join(SRC, "council_tax_band_d.csv"), "w", newline="", encoding="utf-8") as fh:
        wr = csv.DictWriter(fh, fieldnames=["code", "fy", "band_d", "source"])
        wr.writeheader(); wr.writerows(sorted(rows, key=lambda r: (r["code"], r["fy"])))
    cp = cpih()
    have = {r["code"] for r in rows}
    gbx = sorted(c for c in C if c[0] in "ESW" and c not in have)
    print(f"Band D: England {len({r['code'] for r in e})} councils, Scotland {len({r['code'] for r in s})}, Wales {len({r['code'] for r in w})}; "
          f"{len(rows)} council-years; GB councils with no value: {gbx}; Scottish names not matched: {sorted(miss)}; CPIH Aprils {cp[0]['fy']}-{cp[-1]['fy']}")


if __name__ == "__main__":
    main()
