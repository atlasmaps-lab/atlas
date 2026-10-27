"""
Atlas 1.7: electorate as a share of adults -> sources/registration_pcon2024.csv   (python3 pipeline/clean_representation.py)

Parliamentary electoral registrations, 1 December 2025, by Westminster constituency (2024 boundaries): ONS Electoral
registration statistics, UK, December 2025 (Table 1). Population aged 18+, mid-2024: ONS small-area population estimates via
Nomis (NM_2014_1; aged 16+ minus aged 16 to 17), England and Wales only, so Scotland and Northern Ireland are missing.
The December 2025 edition has no local authority table, so this is by constituency only. Standard library only.
"""
import csv, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "sources")
sys.path.insert(0, HERE)
from xlsx_read import rows


def main():
    reg = {}
    for r in rows(os.path.join(SRC, "raw", "ons_electoral_statistics_2025.xlsx"), "Table 1"):
        if r and isinstance(r[0], str) and r[0][:3] in ("E14", "W07", "S14", "N05") and len(r) > 3 and isinstance(r[3], float):
            reg[r[0]] = int(r[3])
    pop = {}
    for r in csv.DictReader(open(os.path.join(SRC, "raw", "nomis_pcon2024_age16plus_1617.csv"), encoding="utf-8")):
        pop.setdefault(r["GEOGRAPHY_CODE"], {})[r["C_AGE"]] = int(r["OBS_VALUE"])
    out = []
    for code, n in sorted(reg.items()):
        p = pop.get(code)
        adults = p["202"] - p["204"] if p and "202" in p and "204" in p else None
        out.append({"code": code, "registrations_dec2025": n, "adults_mid2024": adults if adults else "",
                    "source": "ONS electoral registration statistics Dec 2025 (Table 1); ONS small-area population estimates mid-2024 via Nomis NM_2014_1"})
    with open(os.path.join(SRC, "registration_pcon2024.csv"), "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=list(out[0].keys()))
        w.writeheader(); w.writerows(out)
    print(f"registrations: {len(reg)} constituencies; with adults 18+: {sum(1 for r in out if r['adults_mid2024'])} (England and Wales)")


if __name__ == "__main__":
    main()
