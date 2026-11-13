"""
Atlas 0.12: the detailed tier of Atlas Environment's zones (run pipeline/fetch_envzones.py first; needs shapely, pyproj).
    python3 pipeline/build_envzones_detail.py

pipeline/build_envzones.py writes one light file per theme (floods simplified to 40-65 m, coast to 30 m, conservation
to 50 m), which is right for the whole country but looks like blobs close up. This writes the same shapes at about 5 m,
cut into 0.25-degree squares (by each shape's centre) and loaded square by square as they come into view when zoomed in:
  data/envzones/detail/<theme>_<i>_<j>.js   floods (from zoom 11), coast (from 12), conservation (from 10)
  data/envzones/detail/index.js             the squares per theme, with their counts
Properties match the light files (floods carry the same event ids), so cards and filters work on both.
Coordinates are whole numbers of 1/100,000 degree, each point as the step from the one before.
"""
import json, os, re, zipfile
from collections import defaultdict
from shapely.geometry import shape, mapping
from shapely.ops import unary_union

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
RAW = os.path.join(HERE, "sources", "raw", "envzones")
OUT = os.path.join(ROOT, "data", "envzones", "detail"); os.makedirs(OUT, exist_ok=True)
TOL, Q = 0.00005, 0.25


def load(name):
    return json.load(open(os.path.join(RAW, name), encoding="utf-8"))["features"]


def geom(gj, tol=TOL):
    try:
        g = shape(gj)
        if not g.is_valid:
            g = g.buffer(0)
        g = g.simplify(tol, preserve_topology=True)
        return None if g.is_empty else g
    except Exception:
        return None


def pack(g):
    gj = mapping(g); polys = [gj["coordinates"]] if gj["type"] == "Polygon" else gj["coordinates"] if gj["type"] == "MultiPolygon" else []
    out = []
    for poly in polys:
        rings = []
        for r in poly:
            flat, px, py = [], 0, 0
            for pt in r:   # some sources carry a height as a third value
                ix, iy = round(pt[0] * 1e5), round(pt[1] * 1e5)
                if flat and ix == px and iy == py:
                    continue
                flat += [ix - px, iy - py]; px, py = ix, iy
            if len(flat) >= 8:
                rings.append(flat)
        if rings:
            out.append(rings)
    return out


def year_month(s):
    m = re.match(r"(\d{4})-(\d{2})", str(s or ""))
    return (int(m.group(1)), int(m.group(2))) if m else (None, None)


TILES = defaultdict(lambda: defaultdict(list))


def add(theme, g, props):
    if g is None:
        return
    c = g.representative_point(); key = f"{int((c.x + 180) // Q)}_{int((c.y + 90) // Q)}"
    p = pack(g)
    if p:
        TILES[theme][key].append([props, p])


# floods: one shape per event, as in the light file (same ids)
SRC_EA = {"main river": "river", "ordinary watercourse": "river", "ephemeral watercourse": "river", "sea": "sea", "sewer": "surface", "drainage": "surface", "surface water": "surface", "groundwater": "ground"}
SRC_NRW = {"River": "river", "Small watercourse": "river", "Surface water": "surface", "Sea - still water": "sea", "Sea - wave overtopping": "sea", "Ground water": "ground"}
ev_parts, ev_props, seen = defaultdict(list), {}, set()
for f in load("ea_recorded_floods.geojson"):
    p = f["properties"]
    if p["rec_out_id"] in seen:
        continue
    seen.add(p["rec_out_id"]); y, m = year_month(p.get("start_date"))
    if not y:
        continue
    src = SRC_EA.get(p.get("flood_src"), "sea" if p.get("tidal_f") == "True" or p.get("coastal_f") == "True" else "river" if p.get("fluvial_f") == "True" else "other")
    if src == "other" and p.get("flood_caus") == "groundwater/high water table":
        src = "ground"
    g = geom(f["geometry"])
    if g is None:
        continue
    ev = "E" + str(p.get("rec_grp_id") or p["rec_out_id"])
    ev_parts[ev].append(g); ev_props.setdefault(ev, {"y": y, "m": m, "s": src, "ev": ev})
for i, f in enumerate(load("nrw_historic_floods.geojson")):
    p = f["properties"]; y, m = year_month(p.get("start_date"))
    if not y:
        continue
    g = geom(f["geometry"])
    if g is None:
        continue
    ev = f"W{i}"; ev_parts[ev].append(g); ev_props[ev] = {"y": y, "m": m, "s": SRC_NRW.get(p.get("flood_source"), "other"), "ev": ev}
for ev, gs in ev_parts.items():
    g = unary_union(gs) if len(gs) > 1 else gs[0]
    for part in (g.geoms if g.geom_type == "MultiPolygon" else [g]):   # big events span squares: each part goes to its own
        add("floods", part, ev_props[ev])
print("floods:", len(ev_parts), "events")

# coast
with zipfile.ZipFile(os.path.join(RAW, "ncerm2024.geojson.zip")) as z:
    pass
for e, name, field in ((2055, "NCERM_SMP_2055_70CC.geojson", "smp2055_70"), (2105, "NCERM_SMP_2105_70CC.geojson", "smp2105_70")):
    for f in json.load(open(os.path.join(RAW, "ncerm", name)))["features"]:
        p = f["properties"]; d = p.get(field)
        if d is not None:
            add("coast", geom(f["geometry"]), {"e": e, "d": round(float(d)), "smp": p.get("smp_name"), "pol": p.get("mt_smp" if e == 2055 else "lt_smp")})
EPOCH = {"Medium": 2055, "Long": 2105}
for f in load("nrw_ncerm_all_smp.geojson"):
    p = f["properties"]; e = next((v for k, v in EPOCH.items() if str(p.get("epoch", "")).startswith(k)), None)
    if e:
        add("coast", geom(f["geometry"]), {"e": e, "d": p.get("medium_smp" if e == 2055 else "long_smp"), "smp": p.get("smp_name"), "pol": None})
print("coast done")

# conservation (National Parks and Ramsar): same names and years as the light file
SCOT_NP = {"Loch Lomond and The Trossachs National Park": 2002, "Cairngorms National Park": 2003}
for f in load("ne_national_parks.geojson"):
    p = f["properties"]; y = int(1970 + p["DESIG_DATE"] / 1000 / 86400 / 365.2425) if p.get("DESIG_DATE") else None
    g = geom(f["geometry"], 0.0001)
    for part in (g.geoms if g is not None and g.geom_type == "MultiPolygon" else [g]):
        add("cons", part, {"k": "np", "n": p["NAME"].title().replace("And ", "and "), "y": y, "nat": "E"})
for f in load("nrw_national_parks.geojson"):
    p = f["properties"]; g = geom(f["geometry"], 0.0001)
    for part in (g.geoms if g is not None and g.geom_type == "MultiPolygon" else [g]):
        add("cons", part, {"k": "np", "n": p["np_name"].split(" / ")[-1], "y": int(str(p["desig_date"])[:4]), "nat": "W"})
for f in load("scot_national_parks.geojson"):
    p = f["properties"]; g = geom(f["geometry"], 0.0001)
    for part in (g.geoms if g is not None and g.geom_type == "MultiPolygon" else [g]):
        add("cons", part, {"k": "np", "n": p["npname"].replace(" National Park", ""), "y": SCOT_NP.get(p["npname"]), "nat": "S"})
for name, nat, nk, dk in (("ne_ramsar.geojson", "E", "NAME", None), ("nrw_ramsar.geojson", "W", "RAM_name", "DESIG_DATE"), ("scot_ramsar.geojson", "S", "NAME", None), ("ni_ramsar.geojson", "NI", "NAME", None)):
    for f in load(name):
        p = f["properties"]; nm = str(p.get(nk) or "").strip().replace(" RAMSAR SITE", "").replace(" Ramsar Site", ""); nm = nm.title() if nm.isupper() else nm
        d = p.get(dk) if dk else None; g = geom(f["geometry"], 0.0001)
        for part in (g.geoms if g is not None and g.geom_type == "MultiPolygon" else [g]):
            add("cons", part, {"k": "ramsar", "n": nm, "y": int(str(d)[:4]) if d else None, "nat": nat})

index, total = {}, 0
for theme, tiles in TILES.items():
    index[theme] = []
    for key, feats in tiles.items():
        path = os.path.join(OUT, f"{theme}_{key}.js")
        with open(path, "w", encoding="utf-8") as fh:
            fh.write(f'window.ATLAS_ENVZ_DETAIL && ATLAS_ENVZ_DETAIL("{theme}", "{key}", ' + json.dumps({"features": feats}, separators=(",", ":"), ensure_ascii=False) + ");\n")
        i, j = map(int, key.split("_")); index[theme].append([key, i * Q - 180, j * Q - 90, len(feats)]); total += os.path.getsize(path)
with open(os.path.join(OUT, "index.js"), "w") as fh:
    fh.write("/* Generated by pipeline/build_envzones_detail.py: the 0.25-degree squares of detailed zones per theme (key, west, south, count). */\n")
    fh.write("window.ATLAS_ENVZ_DETAIL_INDEX = " + json.dumps({"q": Q, "themes": index}, separators=(",", ":")) + ";\n")
print({t: len(v) for t, v in index.items()}, f"{total / 1e6:.1f} MB in all")
