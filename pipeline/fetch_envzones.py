"""
Atlas 0.9.1: download the zones for Atlas Environment (views/environment).
    python3 pipeline/fetch_envzones.py        then    python3 pipeline/build_envzones.py

Everything lands in pipeline/sources/raw/envzones/ (about 1 GB unpacked; not committed, see .gitignore) and is listed
in pipeline/sources/MANIFEST.csv. Files already downloaded are skipped. Standard library only.

Theme          Nation            Source
Floods (past)  England           Environment Agency, Recorded Flood Outlines (every outline, with dates)
               Wales             Natural Resources Wales, Historic Flood Map (recorded flood extents)
Coast (future) England           Environment Agency, National Coastal Erosion Risk Mapping (NCERM) 2024
               Wales             Natural Resources Wales, NCERM (shoreline management plans delivered)
Heat           UK                Met Office Climate Data Portal, annual count of hot summer days (UKCP18, 12 km grid)
Wildfire       Scotland          SEPA, satellite-observed extents (Copernicus Emergency Management Service)
Conservation   England           Natural England: National Parks, Ramsar sites
               Wales             Natural Resources Wales: National Parks, Ramsar sites
               Scotland          Scottish Government: National Parks; NatureScot Ramsar sites (via its open data mirror)
               Northern Ireland  DAERA Ramsar sites (via the open data mirror on ArcGIS Online)
Not openly published (so shown as "no open data" in the app): recorded floods in Scotland and Northern Ireland, coastal
erosion forecasts for Northern Ireland (Scotland's Dynamic Coast is published only region by region: a later addition).
"""
import json, os, sys, time, urllib.parse, urllib.request, zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import manifest  # noqa: E402

RAW = os.path.join(HERE, "sources", "raw", "envzones")
os.makedirs(RAW, exist_ok=True)
UA = {"User-Agent": "Atlas data pipeline (atlasmaps-lab)"}
EA_FLOODS = "https://environment.data.gov.uk/geoservices/datasets/8c75e700-d465-11e4-8b5b-f0def148f590/ogc/features/v1/collections/Recorded_Flood_Outlines/items?f=application/geo%2Bjson"
NCERM = "https://environment.data.gov.uk/api/file/download?fileDataSetId=76509b7e-15e3-40ac-ac5c-bcc2fce4e71a&fileName=National_Coastal_Erosion_Risk_Mapping_NCERM_National_2024.geojson.zip"
WALES = "https://datamap.gov.wales/geoserver/ows?service=WFS&version=2.0.0&request=GetFeature&outputFormat=application/json&srsName=EPSG:4326&typeNames="
METOFFICE = "https://services.arcgis.com/Lq3V5RFuTBC9I7kv/arcgis/rest/services/Annual_Count_of_Hot_Days___Projections__12km_grid_/FeatureServer/310"
NE = "https://services.arcgis.com/JJzESW51TqeY9uat/arcgis/rest/services/"


def fetch_json(url, tries=5):
    for a in range(tries):
        try:
            return json.load(urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=300))
        except Exception as e:
            if a == tries - 1:
                raise
            print("   retrying:", e); time.sleep(5)


def save(path, feats):
    with open(path, "w") as fh:
        json.dump({"type": "FeatureCollection", "features": feats}, fh)


def ogc_paged(url, path):
    """OGC API Features (Environment Agency): pages of 1,000 with startIndex (offset= is ignored by this server)."""
    feats, start = [], 0
    while True:
        d = fetch_json(f"{url}&limit=1000&startIndex={start}")
        feats += d["features"]; start += len(d["features"])
        print(f"   {start} of {d.get('numberMatched')}")
        if not d["features"] or start >= (d.get("numberMatched") or 0):
            break
    save(path, feats)


def arcgis(url, path, offset=0.0003):
    """ArcGIS feature layer, in pages, in WGS84, generalised to about 30 m (maxAllowableOffset in degrees)."""
    feats, start = [], 0
    while True:
        q = {"where": "1=1", "outFields": "*", "outSR": 4326, "f": "geojson", "resultOffset": start, "resultRecordCount": 1000}
        if offset:
            q["maxAllowableOffset"] = offset
        d = fetch_json(url + "/query?" + urllib.parse.urlencode(q))
        feats += d.get("features", []); start += len(d.get("features", []))
        if len(d.get("features", [])) < 1000:
            break
    save(path, feats)


def plain(url, path):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=900) as r, open(path + ".part", "wb") as fh:
        while True:
            b = r.read(1 << 20)
            if not b:
                break
            fh.write(b)
    os.replace(path + ".part", path)


def ncerm(url, path):
    plain(url, path)
    with zipfile.ZipFile(path) as z:
        z.extractall(os.path.join(RAW, "ncerm"))


OGL = manifest.OGL
FILES = [
    ("ea_recorded_floods.geojson", EA_FLOODS, ogc_paged, "Environment Agency", "Recorded Flood Outlines", "England, 1920s to date", "one outline per flood, with start and end dates and source"),
    ("nrw_historic_floods.geojson", WALES + "inspire-nrw:NRW_HISTORIC_FLOODMAP", plain, "Natural Resources Wales", "Historic Flood Map (recorded flood extents)", "Wales, 1920s to date", "flood extents with start dates, source and cause"),
    ("ncerm2024.geojson.zip", NCERM, ncerm, "Environment Agency", "National Coastal Erosion Risk Mapping (NCERM) - National (2024)", "England coast, to 2055 and 2105", "erosion zones by frontage; uses SMP (shoreline management plans delivered), higher central sea level allowance"),
    ("nrw_ncerm_all_smp.geojson", WALES + "geonode:nrw_ncerm_all_smp", plain, "Natural Resources Wales", "National Coastal Erosion Risk Mapping, shoreline management plans delivered", "Wales coast, 2025, 2055 and 2105", "erosion zones by epoch"),
    ("metoffice_hot_days_12km.geojson", METOFFICE, lambda u, p: arcgis(u, p, 0), "Met Office", "Annual Count of Hot Summer Days - Projections (12km)", "UK, 12 km grid", "days above 30 °C: baselines 1981-2000 and 2001-2020, global warming levels 1.5 to 4 °C (UKCP18, RCP8.5)"),
    ("sepa_satellite_wildfire.geojson", "https://services-eu1.arcgis.com/jj6fR2HO7enbrICO/arcgis/rest/services/Copernicus_EMS_Flood_Extent_view/FeatureServer/0", lambda u, p: arcgis(u, p, 0.0002), "SEPA (Copernicus Emergency Management Service)", "Satellite observed extent", "Scotland, 2026", "burnt areas mapped from Sentinel-2"),
    ("ne_national_parks.geojson", NE + "National_Parks_England/FeatureServer/0", arcgis, "Natural England", "National Parks (England)", "England", "boundaries with designation dates"),
    ("nrw_national_parks.geojson", WALES + "inspire-nrw:NRW_NATIONAL_PARK", plain, "Natural Resources Wales", "National Parks", "Wales", "boundaries with designation years"),
    ("scot_national_parks.geojson", "https://maps.data.gov.scot/arcgis/rest/services/NationalParks/MapServer/0", arcgis, "Scottish Government", "National Parks - Scotland", "Scotland", "boundaries"),
    ("ne_ramsar.geojson", NE + "Ramsar_England/FeatureServer/0", arcgis, "Natural England", "Ramsar (England)", "England", "boundaries"),
    ("nrw_ramsar.geojson", WALES + "inspire-nrw:NRW_RAMSAR", plain, "Natural Resources Wales", "Ramsar sites", "Wales", "boundaries with designation dates"),
    ("scot_ramsar.geojson", "https://services1.arcgis.com/LM9GyVFsughzHdbO/arcgis/rest/services/RAMSAR_Wetlands_of_International_Importance/FeatureServer/0", arcgis, "NatureScot (open data mirror)", "Ramsar Wetlands of International Importance", "Scotland", "boundaries"),
    ("ni_ramsar.geojson", "https://services3.arcgis.com/HRuPlEcokYlz4mdz/arcgis/rest/services/ramsar/FeatureServer/0", arcgis, "DAERA (open data mirror)", "Ramsar sites", "Northern Ireland", "boundaries"),
]

if __name__ == "__main__":
    for name, url, how, publisher, title, coverage, notes in FILES:
        path = os.path.join(RAW, name)
        if os.path.exists(path) and os.path.getsize(path) > 0:
            print("have     ", name)
        else:
            print("fetching ", name); how(url, path)
        manifest.record("raw/envzones/" + name, publisher, title, url.split("&limit=")[0], OGL, coverage, notes)
    print("done: now run python3 pipeline/build_envzones.py")
