"""
Atlas 0.12: download OS Open Rivers (every watercourse in Great Britain) for the rivers drawn on the map.
    python3 pipeline/fetch_rivers.py        then    python3 pipeline/build_rivers.py

Lands in pipeline/sources/raw/rivers/ (about 50 MB zipped; not committed) and is listed in MANIFEST.csv.
Source: Ordnance Survey, OS Open Rivers (GeoPackage), Open Government Licence v3.0. Great Britain only: Northern Ireland's
rivers aren't in it (a later addition from DAERA's open data).
"""
import os, sys, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import manifest  # noqa: E402

RAW = os.path.join(HERE, "sources", "raw", "rivers"); os.makedirs(RAW, exist_ok=True)
UA = {"User-Agent": "Atlas data pipeline (atlasmaps-lab)"}
URL = "https://api.os.uk/downloads/v1/products/OpenRivers/downloads?area=GB&format=GeoPackage&redirect"


def main():
    path = os.path.join(RAW, "oprvrs_gpkg_gb.zip")
    if not os.path.exists(path):
        print("downloading OS Open Rivers (GeoPackage) ...")
        with urllib.request.urlopen(urllib.request.Request(URL, headers=UA), timeout=600) as r, open(path + ".part", "wb") as fh:
            while True:
                b = r.read(1 << 20)
                if not b:
                    break
                fh.write(b)
        os.replace(path + ".part", path)
    manifest.record("raw/rivers/oprvrs_gpkg_gb.zip", "Ordnance Survey", "OS Open Rivers (GeoPackage)", URL, manifest.OGL,
                    "Great Britain; current", "Every watercourse as a line network: name, form (river, canal, lake, tidal river), flow direction, length")
    print("done: now run python3 pipeline/build_rivers.py")


if __name__ == "__main__":
    main()
