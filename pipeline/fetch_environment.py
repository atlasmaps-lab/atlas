"""
Atlas 0.8.3: download the sources for the Environmental perspective.
    python3 pipeline/fetch_environment.py        then    python3 pipeline/build_environment.py

Everything lands in pipeline/sources/raw/environment/ (about 95 MB; not committed, see .gitignore) and is listed in
pipeline/sources/MANIFEST.csv. Already-downloaded files are skipped, so re-running only fetches what is missing.
Standard library only.

Sources (all Open Government Licence v3.0):
  Greenhouse gas emissions by council, 2005-2023       DESNZ, UK local authority and regional GHG emissions statistics
  Renewable electricity by council, 2014-2025          DESNZ, Regional Renewable Statistics
  Household waste and recycling, 2010-11 to 2024-25    Defra, Local authority collected waste management: annual results
  Fine particulate air pollution (PM2.5), 2018-2024    OHID Fingertips (Public health profiles), indicators 93867 and 93861
  Public electric vehicle chargers, July 2026          DfT, Electric vehicle charging infrastructure statistics (from Zapmap)

When a publisher releases a new edition, update the address below (the gov.uk page is in the comment beside it).
"""
import os, sys, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import manifest  # noqa: E402

RAW = os.path.join(HERE, "sources", "raw", "environment")
os.makedirs(RAW, exist_ok=True)
A = "https://assets.publishing.service.gov.uk/media/"
FT = "https://fingertips.phe.org.uk/api/all_data/csv/by_indicator_id?indicator_ids={i}&child_area_type_id={t}&parent_area_type_id=15"

FILES = [
    # gov.uk/government/statistics/uk-local-authority-and-regional-greenhouse-gas-emissions-statistics-2005-to-2023
    ("2005-23-uk-local-authority-ghg-emissions-CSV-dataset.csv", A + "68653c7ee6c3cc924228943f/2005-23-uk-local-authority-ghg-emissions-CSV-dataset.csv",
     "Department for Energy Security and Net Zero", "UK local authority and regional greenhouse gas emissions, 2005 to 2023 (CSV dataset)",
     "UK councils, 2005-2023", "territorial emissions by sector, sub-sector and gas, kt CO2e; includes land use (LULUCF)"),
    # gov.uk/government/statistics/regional-renewable-statistics
    ("Renewable_electricity_by_local_authority_2014_2025.xlsx", A + "6aba6ebafe72ed1e2b02f151/Renewable_electricity_by_local_authority_2014_2025.xlsx",
     "Department for Energy Security and Net Zero", "Renewable electricity by local authority, 2014 to 2025",
     "UK councils, 2014-2025", "sites, installed capacity (MW) and generation (MWh) by technology"),
    # gov.uk/government/statistics/local-authority-collected-waste-management-annual-results
    ("LA_and_Regional_Spreadsheet_2024-25.ods", A + "69c68a6578ca1aa5a63609c3/LA_and_Regional_Spreadsheet_2024-25.ods",
     "Department for Environment, Food & Rural Affairs", "Local authority collected waste generation, annual results 2024/25 (England and regions)",
     "English councils 2010-11 to 2024-25; English regions from 2000-01", "Table 3 (councils) and Table 3a (regions)"),
    # gov.uk/government/statistical-data-sets/electric-vehicle-charging-infrastructure-statistics-data-tables-evci
    ("evci0102_2026-07_EV_chargers_by_local_authority_UK.ods", A + "6a8ed78af5b35599aec18df8/evci0102_2026-07_EV_chargers_by_local_authority_UK.ods",
     "Department for Transport (data from Zapmap)", "Public EV chargers by local authority: United Kingdom, 1 July 2026 (EVCI0102)",
     "UK councils, January to July 2026", "count (a) and per 100,000 people (c)"),
    ("evci0103_2026-07_EV_chargers_by_parliamentary_constituency_UK.ods", A + "6a8ed79c5a0c25165ae46563/evci0103_2026-07_EV_chargers_by_parliamentary_constituency_UK.ods",
     "Department for Transport (data from Zapmap)", "Public EV chargers by parliamentary constituency: United Kingdom, 1 July 2026 (EVCI0103)",
     "UK constituencies (2024), January to July 2026", "count (a)"),
    ("evci0101_2026-07_EV_chargers_by_region_and_country_UK.ods", A + "6a8ed778df4246cf45e4654d/evci0101_2026-07_EV_chargers_by_region_and_country_UK.ods",
     "Department for Transport (data from Zapmap)", "Public EV chargers by country and region: United Kingdom, 1 July 2026 (EVCI0101)",
     "UK, nations and English regions, 2025-2026", "count (a) and per 100,000 people (c)"),
]
for ind, name in ((93867, "fine particulate matter (PM2.5) concentrations"), (93861, "fraction of mortality attributable to particulate air pollution")):
    for t, what in ((501, "districts and unitary authorities (April 2023 boundaries)"), (6, "English regions")):
        FILES.append((f"ft_{ind}_{t}.csv", FT.format(i=ind, t=t), "Office for Health Improvement and Disparities (Fingertips)",
                      f"Air pollution: {name} (indicator {ind})", f"England, {what}, 2018-2024", "annual values"))


def get(url, path):
    req = urllib.request.Request(url, headers={"User-Agent": "Atlas data pipeline (atlasmaps-lab)"})
    with urllib.request.urlopen(req, timeout=300) as r, open(path + ".part", "wb") as fh:
        while True:
            b = r.read(1 << 20)
            if not b:
                break
            fh.write(b)
    os.replace(path + ".part", path)


if __name__ == "__main__":
    for name, url, publisher, title, coverage, notes in FILES:
        path = os.path.join(RAW, name)
        if os.path.exists(path) and os.path.getsize(path) > 0:
            print("have     ", name)
        else:
            print("fetching ", name); get(url, path)
        manifest.record("raw/environment/" + name, publisher, title, url, manifest.OGL, coverage, notes)
    print("done: now run python3 pipeline/build_environment.py")
