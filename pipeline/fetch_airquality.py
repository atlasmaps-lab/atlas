"""
Atlas 0.12: download Defra's modelled background air pollution, 1 km grid, for PM10, NO2 and PM2.5.
    python3 pipeline/fetch_airquality.py        then    python3 pipeline/build_airquality.py

Source: Defra UK-AIR, Pollution Climate Mapping (PCM) background maps: annual mean concentrations on a 1 km grid
(British National Grid), UK-wide, one CSV per pollutant per year. Open Government Licence v3.0.
Files land in pipeline/sources/raw/airquality/ (about 8 MB each; not committed) and are listed in MANIFEST.csv.
A file is complete when it is as long as the server says (Content-Length); a cut-short one is resumed.
"""
import os, ssl, sys, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import manifest  # noqa: E402

RAW = os.path.join(HERE, "sources", "raw", "airquality"); os.makedirs(RAW, exist_ok=True)
UA = {"User-Agent": "Mozilla/5.0 (Atlas data pipeline)"}
BASE = "https://uk-air.defra.gov.uk/datastore/pcm/"
YEARS = range(2018, 2025)
FILES = lambda y: [(f"mappm10{y}g.csv", "PM10"), (f"mapno2{y}.csv", "NO2"), (f"mappm25{y}g.csv", "PM2.5")]
try:
    import certifi; CTXSSL = ssl.create_default_context(cafile=certifi.where())
except Exception:
    CTXSSL = None


def size_online(name):
    req = urllib.request.Request(BASE + name, headers=UA, method="HEAD")
    with urllib.request.urlopen(req, timeout=60, context=CTXSSL) as r:
        return int(r.headers.get("Content-Length") or 0)


def get(name):
    """Fetch a file, resuming where a cut-short download stopped (Defra's server often drops long downloads)."""
    path = os.path.join(RAW, name); want = size_online(name)
    for attempt in range(8):
        have = os.path.getsize(path) if os.path.exists(path) else 0
        if want and have == want:
            return path
        if have > want:
            os.remove(path); have = 0
        print(f"fetching {name} from {have:,} of {want:,} bytes")
        try:
            req = urllib.request.Request(BASE + name, headers=dict(UA, Range=f"bytes={have}-") if have else UA)
            with urllib.request.urlopen(req, timeout=300, context=CTXSSL) as r, open(path, "ab" if have and r.status == 206 else "wb") as fh:
                while True:
                    b = r.read(1 << 20)
                    if not b:
                        break
                    fh.write(b)
        except Exception as e:
            print("  stopped:", e)
    raise RuntimeError(f"{name}: still incomplete after 8 tries")


def main():
    for y in YEARS:
        for name, pol in FILES(y):
            try:
                get(name)
            except Exception as e:
                print("  couldn't fetch", name, e); continue
            manifest.record("raw/airquality/" + name, "Defra (UK-AIR)", f"Pollution Climate Mapping background map, {pol} annual mean, {y}", BASE + name, manifest.OGL,
                            f"UK, 1 km grid, {y}", "Modelled background concentrations (µg/m³), British National Grid")
    print("done: now run python3 pipeline/build_airquality.py")


if __name__ == "__main__":
    main()
