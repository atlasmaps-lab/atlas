"""
Atlas: download the sources for the Health perspective, Housing (under Markets) and Government debt (under Economic).
    python3 pipeline/fetch_extra.py        then    python3 pipeline/build_extra.py

Everything lands in pipeline/sources/extra_raw/ (about 120 MB; not committed, see .gitignore).
Already-downloaded files are skipped, so re-running only fetches what is missing. Standard library only.

Sources (all Open Government Licence v3.0 unless noted):
  Census 2021 topic summaries, output areas          Nomis bulk downloads (ONS)
  Output area -> ward / constituency / council         ONS Open Geography Portal lookups
  Public health indicators, councils + regions         OHID Fingertips API
  UK House Price Index                                 HM Land Registry (also contains Registers of Scotland and LPS NI data)
  House price to earnings ratios, median prices        ONS
  Median price paid by ward (HPSSA dataset 37)         ONS
  Private rents (PIPR)                                 ONS
  Dwelling stock (table 125), vacant homes (table 615) MHCLG live tables
  Council borrowing, capital financing requirement     MHCLG capital outturn time series
  Public sector net debt                               ONS public sector finances
"""
import concurrent.futures as cf, json, os, sys, urllib.parse, urllib.request, zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, "sources", "extra_raw")
for d in ("census", "lookups", "fingertips", "files"):
    os.makedirs(os.path.join(RAW, d), exist_ok=True)

CENSUS = ["ts017", "ts037", "ts038", "ts039", "ts041", "ts044", "ts046", "ts050", "ts052", "ts054"]
LOOKUPS = ["OA21_WD24_LAD24_EW_LU_v2", "OA21_WD25_LAD25_EW_LU_v3", "OA21_WD22_LTLA22_UTLA22_RGN22_CTRY22_EW_LU_v2",
           "OA21_PCON25_LAD21_EW_LU", "LAD25_CTYUA25_EW_LU_v2"]
# Fingertips indicator ids (see build_extra.py for what each one becomes)
FT_LA = [90366, 91102, 94359, 108, 93721, 40401, 40501, 40701, 40601, 92196, 20101, 93881, 93088, 90323, 90319, 92443, 93015,
         93982, 241, 253, 90933, 93376, 22301, 22304, 93763, 92432, 93867, 93954, 92489, 41001, 93735, 93736, 93759]
FT_WARD = [93105, 93107]
ONS = "https://www.ons.gov.uk/file?uri="
FILES = {
    "uk-hpi.csv": "https://publicdata.landregistry.gov.uk/market-trend-data/house-price-index-data/UK-HPI-full-file-{hpi}.csv",
    "affordability.xlsx": ONS + "/peoplepopulationandcommunity/housing/datasets/ratioofhousepricetoworkplacebasedearningslowerquartileandmedian/current/aff1ratioofhousepricetoworkplacebasedearnings.xlsx",
    "hpssa37-ward.zip": ONS + "/peoplepopulationandcommunity/housing/datasets/medianpricepaidbywardhpssadataset37/yearendingmarch2023/hpssadataset37medianpricepaidbyward.zip",
    "rents.xlsx": ONS + "/economy/inflationandpriceindices/datasets/priceindexofprivaterentsukmonthlypricestatistics/{rents}/priceindexofprivaterentsukmonthlypricestatistics.xlsx",
    "dwellings-t125.ods": "https://assets.publishing.service.gov.uk/media/6a0dcbf65c3c79da61662e39/LiveTable125.ods",
    "vacants-t615.ods": "https://assets.publishing.service.gov.uk/media/6a2bf816e50716856ed4afdd/Live_Table_615.ods",
    "capital-outturn.csv": "https://assets.publishing.service.gov.uk/media/69c2a55b13f1436476e4436c/Capital_time_series_data_wide_24_03_26.csv",
    "psnd-pct-gdp.json": "https://www.ons.gov.uk/economy/governmentpublicsectorandtaxes/publicsectorfinance/timeseries/hf6x/pusf/data",
    "psnd-bn.json": "https://www.ons.gov.uk/economy/governmentpublicsectorandtaxes/publicsectorfinance/timeseries/hf6w/pusf/data",
}
# these two change name with every release: edit when you refresh the data
RELEASE = {"hpi": "2026-08", "rents": "21october2026"}


def get(url, path, timeout=600):
    if os.path.exists(path) and os.path.getsize(path) > 500:
        return path, "have"
    for _ in range(3):
        try:
            data = urllib.request.urlopen(url, timeout=timeout).read()
            with open(path, "wb") as fh:
                fh.write(data)
            return path, f"{len(data) / 1e6:.1f} MB"
        except Exception as e:
            err = e
    return path, f"FAILED {err}"


def arcgis(svc, path):
    if os.path.exists(path):
        return path, "have"
    base = f"https://services1.arcgis.com/ESMARspQHYMw9BZ9/arcgis/rest/services/{svc}/FeatureServer/0"
    q = lambda p: json.load(urllib.request.urlopen(base + "/query?" + urllib.parse.urlencode(p), timeout=120))
    n = q({"where": "1=1", "returnCountOnly": "true", "f": "json"})["count"]
    meta = json.load(urllib.request.urlopen(base + "?f=json", timeout=60))
    step, first = meta.get("maxRecordCount", 1000), meta["fields"][0]["name"]
    page = lambda o: q({"where": "1=1", "outFields": "*", "returnGeometry": "false", "resultOffset": o, "resultRecordCount": step, "orderByFields": first, "f": "json"})["features"]
    rows = []
    with cf.ThreadPoolExecutor(8) as ex:
        for fs in ex.map(page, range(0, n, step)):
            rows += [f["attributes"] for f in fs]
    json.dump(rows, open(path, "w"))
    return path, f"{len(rows)} rows"


def main():
    jobs = [(get, f"https://www.nomisweb.co.uk/output/census/2021/census2021-{t}.zip", os.path.join(RAW, "census", f"census2021-{t}.zip")) for t in CENSUS]
    jobs += [(get, f"https://fingertips.phe.org.uk/api/all_data/csv/by_indicator_id?indicator_ids={i}&child_area_type_id={t}&parent_area_type_id=15",
              os.path.join(RAW, "fingertips", f"d_{i}_{t}.csv")) for i in FT_LA for t in (501, 6)]
    jobs += [(get, f"https://fingertips.phe.org.uk/api/all_data/csv/by_indicator_id?indicator_ids={i}&child_area_type_id=8&parent_area_type_id=15",
              os.path.join(RAW, "fingertips", f"d_{i}_8.csv")) for i in FT_WARD]
    jobs += [(get, u.format(**RELEASE), os.path.join(RAW, "files", n)) for n, u in FILES.items()]
    jobs += [(arcgis, s, os.path.join(RAW, "lookups", s + ".json")) for s in LOOKUPS]
    with cf.ThreadPoolExecutor(6) as ex:
        for path, status in ex.map(lambda j: j[0](*j[1:]), jobs):
            print(f"{status:>12}  {os.path.relpath(path, RAW)}")
    z = os.path.join(RAW, "files", "hpssa37-ward.zip")
    if os.path.exists(z) and not os.path.exists(os.path.join(RAW, "files", "hpssa37-ward.xls")):
        with zipfile.ZipFile(z) as zf:
            name = [n for n in zf.namelist() if n.endswith(".xls")][0]
            with open(os.path.join(RAW, "files", "hpssa37-ward.xls"), "wb") as fh:
                fh.write(zf.read(name))


if __name__ == "__main__":
    sys.exit(main())
