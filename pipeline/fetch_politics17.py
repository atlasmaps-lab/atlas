"""
Atlas 1.7: fetch the referendum, ideology, hex map, council tax and inflation sources into pipeline/sources/raw/ and record
each in pipeline/sources/MANIFEST.csv   (python3 pipeline/fetch_politics17.py [name ...]; standard library + curl)

Names: eu, chd, lad2425, hanretty, ches, hex, bandd_england, bandd_scotland, bandd_wales, cpih (default: all).
Westminster results are fetched by fetch_elections.py. Sources that refuse scripted access are listed at the end, with what
to do instead; nothing here tries to get round a block.
"""
import json, os, re, subprocess, sys, zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, "sources", "raw")
sys.path.insert(0, HERE)
import manifest

UA = "Atlas-pipeline (curl)"


def curl(url, out, *extra):
    subprocess.run(["curl", "-sSL", "--fail", "-m", "600", "-A", UA, *extra, "-o", out, url], check=True)


def eu():
    u = "https://www.electoralcommission.org.uk/sites/default/files/2019-07/EU-referendum-result-data.csv"
    curl(u, os.path.join(RAW, "EU-referendum-result-data.csv"))
    manifest.record("raw/EU-referendum-result-data.csv", "Electoral Commission", "EU referendum results by counting area (2016)", u, manifest.OGL,
                    "382 counting areas: 380 GB local authorities, Northern Ireland, Gibraltar; 23 June 2016", "Official result data")


def chd():
    u = "https://www.arcgis.com/sharing/rest/content/items/5676b8d2432a4beeae61195abb778274/data"
    z = os.path.join(RAW, "CHD_2024-12.zip")
    curl(u, z)
    with zipfile.ZipFile(z) as f:
        f.extractall(os.path.join(RAW, "CHD_2024-12"), [n for n in f.namelist() if n.endswith(".csv") or n.endswith(".pdf")])
    manifest.record("raw/CHD_2024-12.zip", "Office for National Statistics", "Code History Database (December 2024) for the UK", u, manifest.OGL,
                    "UK statistical geography codes and their changes, 2009-2024", "Used to join councils merged or recoded since 2016 to today's council")


def lad2425():
    u = "https://services1.arcgis.com/ESMARspQHYMw9BZ9/arcgis/rest/services/LAD24_LAD25_UK_LU_v2/FeatureServer/0/query?where=1%3D1&outFields=*&returnGeometry=false&f=json&resultRecordCount=2000"
    curl(u, os.path.join(RAW, "LAD24_LAD25_UK_LU.json"))
    manifest.record("raw/LAD24_LAD25_UK_LU.json", "Office for National Statistics", "Local Authority District (2024) to Local Authority District (2025) Lookup in the UK (V2)",
                    u, manifest.OGL, "361 UK local authorities, 2024 -> 2025", "Barnsley and Sheffield recoded after a boundary change")


def hanretty():
    u = "https://docs.google.com/spreadsheets/d/1wTK5dV2_YjCMsUYlwg0l48uWWf44sKgG8uFVMv5OWlA/export?format=csv"
    curl(u, os.path.join(RAW, "hanretty_leave_pcon2010.csv"))
    manifest.record("raw/hanretty_leave_pcon2010.csv", "Chris Hanretty (Royal Holloway)", "Revised estimates of Leave vote share in Westminster constituencies (Aug 2016)", u,
                    "Published openly by the author (no licence stated)", "632 GB constituencies, 2010 boundaries; EU referendum 2016",
                    "Linked from medium.com/@chrishanretty/revised-estimates-of-leave-vote-share-in-westminster-constituencies-c4612f06319d. Estimates, except where the BBC obtained ward counts")


def ches():
    u = "https://github.com/chesdata/chesdata.github.io/releases/download/ches-trend/1999-2024_CHES_dataset_meansV2.csv"
    curl(u, os.path.join(RAW, "CHES_1999-2024_means_V2.csv"))
    manifest.record("raw/CHES_1999-2024_means_V2.csv", "Chapel Hill Expert Survey", "CHES trend file 1999-2024, party means (V2)", u,
                    "Free for research use with citation (chesdata.eu)", "European parties incl. UK; waves 1999, 2002, 2006, 2010, 2014, 2019, 2024",
                    "Cite: Jolly et al. (2022) and the 2024 CHES release (doi:10.1016/j.electstud.2025.102981)")


def hexmaps():
    for f, what in (("uk-constituencies-2023", "the 2024 constituencies"), ("constituencies", "the 2010-2024 constituencies")):
        u = f"https://raw.githubusercontent.com/odileeds/hexmaps/gh-pages/maps/{f}.hexjson"
        curl(u, os.path.join(RAW, f"hex_{f}.hexjson"))
        manifest.record(f"raw/hex_{f}.hexjson", "Open Innovations", f"HexJSON hex map of {what}", u, "MIT", "650 UK constituencies", "One hexagon per seat")


def bandd_england():
    page = subprocess.run(["curl", "-sL", "-m", "60", "-A", UA, "https://www.gov.uk/government/statistical-data-sets/live-tables-on-council-tax"], capture_output=True, text=True).stdout
    u = re.search(r'https://assets\.publishing\.service\.gov\.uk/[^"]+/Band_D_[^"]+\.ods', page).group(0)
    name = u.rsplit("/", 1)[1]
    curl(u, os.path.join(RAW, name))
    manifest.record("raw/" + name, "Ministry of Housing, Communities and Local Government", "Band D council tax figures 1993 onwards (live table)", u, manifest.OGL,
                    "England: billing authorities, 1993-94 to the latest year", "Atlas uses sheet Area_CT (area council tax including parish precepts)")


def bandd_scotland():
    page = subprocess.run(["curl", "-sL", "-m", "60", "-A", UA, "https://www.gov.scot/publications/council-tax-datasets/"], capture_output=True, text=True).stdout
    os.makedirs(os.path.join(RAW, "scot_ctax"), exist_ok=True)
    for m in re.finditer(r'href="(/binaries[^"]+)"[^>]*>\s*Council Tax by band (\d{4}-\d\d)', page):
        path, y = m.group(1), m.group(2)
        ext = "xls" if path.endswith(".xls") else "xlsx"
        curl("https://www.gov.scot" + path, os.path.join(RAW, "scot_ctax", f"band_{y}.{ext}"))
        manifest.record(f"raw/scot_ctax/band_{y}.{ext}", "Scottish Government", f"Council Tax by band {y}", "https://www.gov.scot" + path, manifest.OGL,
                        f"Scotland: 32 councils, {y}", "Council tax only (no water or sewerage)" + ("; old .xls format, not read by the standard library" if ext == "xls" else ""))


def bandd_wales():
    base = "https://stats.gov.wales/en-GB/3ca971eb-7d9b-4b79-89fa-6d7f77431aad"
    jar, out = os.path.join(RAW, ".statswales_cookies"), os.path.join(RAW, "statswales_band_d_composition.csv")
    subprocess.run(["curl", "-sL", "-m", "60", "-A", UA, "-c", jar, "-b", jar, "-o", os.devnull, base + "/start"], check=True)
    args = ["-d", "filter[measure].1[]=1", "-d", "filter[DescriptionCode].3[]=3"]
    subprocess.run(["curl", "-sL", "-m", "60", "-A", UA, "-c", jar, "-b", jar, *args, "-o", os.devnull, base + "/filtered"], check=True)
    curl(base + "/download", out, "-c", jar, "-b", jar, "-d", "view_type=unfiltered", "-d", "format=csv", "-d", "view_choice=raw", "-d", "extended=yes",
         "-d", "download_language=en-GB", "--data-urlencode", "selected_filter_options=[]", "-d", "action=download")
    os.remove(jar)
    manifest.record("raw/statswales_band_d_composition.csv", "Welsh Government (StatsWales)", "Composition of average band D council tax by billing authority", base, manifest.OGL,
                    "Wales: 22 billing authorities, 1993-94 to the latest year", "Atlas uses 'Total CT for billing authority area'")


def cpih():
    u = "https://www.ons.gov.uk/generator?format=csv&uri=/economy/inflationandpriceindices/timeseries/l522/mm23"
    curl(u, os.path.join(RAW, "ons_cpih_L522.csv"))
    manifest.record("raw/ons_cpih_L522.csv", "Office for National Statistics", "CPIH index 00: all items 2015=100 (L522)", u, manifest.OGL, "UK, monthly 1988-", "April values used")


ALL = {"eu": eu, "chd": chd, "lad2425": lad2425, "hanretty": hanretty, "ches": ches, "hex": hexmaps,
       "bandd_england": bandd_england, "bandd_scotland": bandd_scotland, "bandd_wales": bandd_wales, "cpih": cpih}
BLOCKED = [("Scottish independence referendum 2014 by council", "electoralcommission.org.uk and the Scottish Parliament's research archive ask for a browser check; "
            "emb.scot's council pages give turnout but mostly not Yes/No votes. Download the Electoral Commission's results file in a browser into sources/raw/ to add it.")]


def main():
    os.makedirs(RAW, exist_ok=True)
    for n in (sys.argv[1:] or ALL):
        print("fetching", n); ALL[n]()
    print("\nNot fetched (blocked):"); [print(" -", a + ":", b) for a, b in BLOCKED]


if __name__ == "__main__":
    main()
