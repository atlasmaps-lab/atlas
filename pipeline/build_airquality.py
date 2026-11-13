"""
Atlas 0.12: PM10, NO2 and PM2.5 for every council, Westminster seat, English region, nation and the UK, from Defra's
1 km background maps (run pipeline/fetch_airquality.py first; needs shapely and pyproj).
    python3 pipeline/build_airquality.py

Each 1 km square's centre is placed in the areas it falls in; an area's figure is the average of its squares (the
background concentration across the area, not the reading at a roadside monitor). Writes data/airquality.js in the
same shape as data/environment.js, so the metrics join Atlas Environment's "Air quality" group:
  env_pm10       PM10, annual mean (µg/m³)                         UK, 2018-2024
  env_no2        Nitrogen dioxide (NO2), annual mean (µg/m³)        UK, 2018-2024
  env_pm25_pcm   PM2.5, annual mean (µg/m³), Defra's model           UK, 2018-2024 (alongside OHID's England-only figure)
"""
import csv, glob, json, os, re
from collections import defaultdict
from shapely.geometry import shape, Point
from shapely.strtree import STRtree
from pyproj import Transformer

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
RAW = os.path.join(HERE, "sources", "raw", "airquality"); GEO = os.path.join(HERE, "geometry")
Y0, UK = 1995, "K02000001"
TO_LL = Transformer.from_crs(27700, 4326, always_xy=True).transform
POL = {"env_pm10": ("mappm10{y}g.csv", "PM10 (particles under 10 µm)", "Particles under 10 micrometres across, from traffic, industry, wood burning, farming, construction, sea salt and dust; they reach the lungs."),
       "env_no2": ("mapno2{y}.csv", "Nitrogen dioxide (NO2)", "A gas mostly from road traffic (especially diesel) and burning; it inflames the airways and is highest along busy roads."),
       "env_pm25_pcm": ("mappm25{y}g.csv", "PM2.5 (Defra model, UK)", "Fine particles under 2.5 micrometres, which reach deep into the lungs and blood; the pollutant most linked to early deaths.")}
SRC = "Defra UK-AIR, Pollution Climate Mapping background maps (1 km grid, annual mean). Open Government Licence v3.0."


def layer(name, key="code"):
    fs = json.load(open(os.path.join(GEO, name), encoding="utf-8"))["features"]
    gs = [shape(f["geometry"]) for f in fs]
    return STRtree(gs), gs, [f["properties"].get(key) or f["properties"].get("code") or f["properties"].get("PCON24CD") for f in fs]


def read(path):
    out = {}
    with open(path, encoding="utf-8", errors="ignore") as fh:
        rows = list(csv.reader(fh))
    head = next(i for i, r in enumerate(rows) if r and r[0].strip().lower() in ("gridcode", "ukgridcode"))
    for r in rows[head + 1:]:
        try:
            v = float(r[3])
        except (ValueError, IndexError):
            continue
        out[int(float(r[0]))] = (float(r[1]), float(r[2]), v)
    return out


def complete(path):   # ends on a whole line, and as long as fetch_airquality.py found it online (MANIFEST has no sizes; check the tail)
    with open(path, "rb") as fh:
        fh.seek(-200, 2); tail = fh.read()
    return tail.endswith(b"\n") and tail.count(b",") >= 6


def main():
    files = {pid: {int(re.search(r"(\d{4})g?\.csv$", os.path.basename(p)).group(1)): p for p in glob.glob(os.path.join(RAW, f.replace("{y}", "*"))) if complete(p)} for pid, (f, _, _) in POL.items()}
    levels = [layer(n) for n in ("councils.geojson", "constituencies.geojson", "eng_regions.geojson", "nations.geojson")]
    where = {}   # (x, y) of a 1 km square's centre -> the areas it falls in (the grid changes between years, so by place, not code)

    def place(x, y):
        k = (x, y)
        if k not in where:
            lon, lat = TO_LL(x, y); p = Point(lon, lat); codes = [UK]
            for tree, gs, cs in levels:
                for i in tree.query(p):
                    if gs[i].contains(p):
                        codes.append(cs[i]); break
            where[k] = codes
        return where[k]
    metrics, V = [], {}
    for pid, (f, label, desc) in POL.items():
        years = sorted(files[pid])
        if not years:
            continue
        acc = defaultdict(lambda: defaultdict(lambda: [0.0, 0]))
        for y in years:
            for gc, (x, yy, v) in read(files[pid][y]).items():
                for code in place(x, yy):
                    a = acc[code][y]; a[0] += v; a[1] += 1
        V[pid] = {}
        for code, by in acc.items():
            arr = [round(by[y][0] / by[y][1], 2) if y in by and by[y][1] else None for y in range(years[0], years[-1] + 1)]
            if any(v is not None for v in arr):
                V[pid][code] = arr
        metrics.append({"id": pid, "p": "environment", "group": "Air quality", "label": label, "unit": "µg/m³", "dp": 1, "nature": "rate", "scale": "ratio", "desc": desc + " Annual mean of the background concentration across the area (1 km modelled grid).", "src": SRC, "ys": years[0] - Y0})
        uk = V[pid].get(UK); print(pid, years[0], "-", years[-1], "UK", uk[-1] if uk else None, "areas", len(V[pid]))
    with open(os.path.join(ROOT, "data", "airquality.js"), "w", encoding="utf-8") as fh:
        fh.write("/* Generated by pipeline/build_airquality.py: don't edit by hand. Defra PCM background maps, OGL v3.0. */\n")
        fh.write("window.ATLAS_ENV_AQ = " + json.dumps({"y0": Y0, "metrics": metrics, "v": V}, separators=(",", ":"), ensure_ascii=False) + ";\n")


if __name__ == "__main__":
    main()
