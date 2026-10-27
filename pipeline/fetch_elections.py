"""
Atlas 1.7: fetch the Westminster election sources into pipeline/sources/raw/   (python3 pipeline/fetch_elections.py)

1. House of Commons Library, Election Results database (SQLite), published by UK Parliament on GitHub:
   general elections 2010-2024, every by-election since 2010, notional 2005 (on 2010 boundaries) and 2019 (on 2024 boundaries)
2. House of Commons Library briefing CBP-8647, "General election results from 1918 to 2019", results by constituency
   (spreadsheet). The Library's file server refuses scripted downloads, so this one is downloaded in a browser from
   https://commonslibrary.parliament.uk/research-briefings/cbp-8647/ ("Results by constituency (Spreadsheet)") and saved as
   pipeline/sources/raw/1918-2019election_results_by_pcon.xlsx. The script checks it is there and records it.
Both are under the Open Parliament Licence v3.0. curl is used for downloads (Python's own SSL certificates are missing on
some Macs). Standard library only.
"""
import os, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, "sources", "raw")
sys.path.insert(0, HERE)
import manifest

DB_URL = "https://raw.githubusercontent.com/ukparliament/psephology-datasette/main/psephology.db"
XLSX = "1918-2019election_results_by_pcon.xlsx"
XLSX_PAGE = "https://commonslibrary.parliament.uk/research-briefings/cbp-8647/"
XLSX_URL = "https://researchbriefings.files.parliament.uk/documents/CBP-8647/1918-2019election_results_by_pcon.xlsx"


def curl(url, out):
    subprocess.run(["curl", "-sSL", "--fail", "-m", "600", "-A", "Atlas-pipeline (curl)", "-o", out, url], check=True)


def main():
    os.makedirs(RAW, exist_ok=True)
    db = os.path.join(RAW, "psephology.db")
    curl(DB_URL, db)
    manifest.record("raw/psephology.db", "House of Commons Library (UK Parliament)", "Election Results database (electionresults.parliament.uk), SQLite export",
                    DB_URL, manifest.OPL, "UK, 650 constituencies; general elections 2010, 2015, 2017, 2019, 2024; by-elections 2010-; notional 2005 and 2019",
                    "Official, verified against returning officers' result notices (see electionresults.parliament.uk/meta/verification)")
    print("fetched", db)
    x = os.path.join(RAW, XLSX)
    if not os.path.exists(x):
        print(f"MISSING {XLSX}: download it in a browser from {XLSX_PAGE} (Results by constituency, Spreadsheet) into {RAW}")
        sys.exit(1)
    manifest.record("raw/" + XLSX, "House of Commons Library", "CBP-8647 General election results from 1918 to 2019: results by constituency (spreadsheet)",
                    XLSX_URL, manifest.OPL, "UK constituencies, general elections 1918-2019 (Atlas uses 1997, 2001, 2005)",
                    "Downloaded in a browser (the Library's file server blocks scripts). Parties outside the main ones are one 'Other' column")
    print("recorded", x)


if __name__ == "__main__":
    main()
