"""
Atlas 0.12: build the rivers drawn on the map from OS Open Rivers (run pipeline/fetch_rivers.py first).
    python3 pipeline/build_rivers.py        (needs shapely and pyproj)

Writes two levels of detail, so rivers look like rivers at every zoom without loading everything at once:
  data/rivers/main.js        the main rivers, canals and tidal reaches of Great Britain, simplified to about 150 m,
                             merged by name: drawn below zoom 10 (about 0.8 MB)
  data/rivers/<x>_<y>.js     every watercourse in each 20 km square (British National Grid), simplified to about 8 m:
                             loaded square by square from zoom 10 as they come into view
  data/rivers/index.js       the squares that exist, with their bounds
Each line carries its name, its form (river, canal, tidal river, line through a lake) and the length of the named
watercourse it belongs to, which sets how wide it's drawn. Coordinates are packed as whole numbers of 1/100,000 degree,
each point as the step from the one before (unpacked by rivers.js).
"""
import json, os, sqlite3, struct, zipfile, collections
from shapely import wkb
from shapely.geometry import LineString, MultiLineString
from shapely.ops import linemerge, transform
from pyproj import Transformer

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
RAW = os.path.join(HERE, "sources", "raw", "rivers")
OUT = os.path.join(ROOT, "data", "rivers"); os.makedirs(OUT, exist_ok=True)
TO_LL = Transformer.from_crs(27700, 4326, always_xy=True).transform
FORM = {"inlandRiver": "r", "canal": "c", "tidalRiver": "t", "lake": "l"}
SQ = 20000


def gpkg_geom(blob):
    """A GeoPackage geometry blob: 'GP', version, flags (envelope size in bits 1-3), srs id, envelope, then WKB."""
    flags = blob[3]; env = {0: 0, 1: 32, 2: 48, 3: 48, 4: 64}[(flags >> 1) & 7]
    return wkb.loads(bytes(blob[8 + env:]))


def pack(geom, scale=1e5):
    lines = [geom] if geom.geom_type == "LineString" else list(geom.geoms)
    out = []
    for ln in lines:
        flat, px, py = [], 0, 0
        for x, y in ln.coords:
            ix, iy = round(x * scale), round(y * scale)
            if flat and ix == px and iy == py:
                continue
            flat += [ix - px, iy - py]; px, py = ix, iy
        if len(flat) >= 4:
            out.append(flat)
    return out


def main():
    z = zipfile.ZipFile(os.path.join(RAW, "oprvrs_gpkg_gb.zip"))
    name = [n for n in z.namelist() if n.endswith(".gpkg")][0]
    tmp = os.path.join(RAW, "oprvrs_gb.gpkg")
    if not os.path.exists(tmp):
        with z.open(name) as src, open(tmp, "wb") as dst:
            dst.write(src.read())
    db = sqlite3.connect(tmp)
    rows = db.execute("select geometry, length, form, watercourse_name, watercourse_name_alternative, fictitious, start_node, end_node from watercourse_link").fetchall()
    print(len(rows), "links")
    def nm(a, b):   # English name first where OS gives a Welsh or Gaelic one with an English alternative
        a, b = (a or "").strip(), (b or "").strip()
        return b if b and a and (a.startswith("Afon ") or a.startswith("Abhainn ")) else a or b
    # 0.12: each river in its own right. Stretches with the same name that join up are one river (the River Avon at Bath
    # and the River Avon at Stratford are different rivers): union-find over the network's nodes, name by name.
    links, parent = [], {}
    def find(x):
        while parent.get(x, x) != x:
            parent[x] = parent.get(parent[x], parent[x]); x = parent[x]
        return x
    def union(a, b):
        ra, rb = find(a), find(b)
        if ra != rb: parent[ra] = rb
    for g, length, form, n1, n2, fict, a, b in rows:
        n = nm(n1, n2); geom = gpkg_geom(g)
        if geom is None or geom.is_empty:
            continue
        links.append((geom, n, FORM.get(form, "r"), length or geom.length, a, b))
        if n:
            union((n, a), (n, b))
    # stretches of one river can be broken by unnamed side channels, weirs and islands: join pieces with the same name
    # whose ends are within 1.5 km of each other (a 1.5 km grid of ends, checked against the neighbouring cells)
    cell = collections.defaultdict(list)
    for geom, n, f, L, a, b in links:
        if not n:
            continue
        for node, pt in ((a, geom.coords[0]), (b, geom.coords[-1])):
            cell[(n, int(pt[0] // 1500), int(pt[1] // 1500))].append((node, pt))
    for (n, cx, cy), ends in list(cell.items()):
        near = [e for dx in (-1, 0, 1) for dy in (-1, 0, 1) for e in cell.get((n, cx + dx, cy + dy), [])]
        for node, pt in ends:
            for node2, pt2 in near:
                if node2 != node and (pt[0] - pt2[0]) ** 2 + (pt[1] - pt2[1]) ** 2 <= 1500 ** 2:
                    union((n, node), (n, node2))
    comp_km, comp_id, rid = collections.Counter(), {}, {}
    for geom, n, f, L, a, b in links:
        if n:
            c = find((n, a)); comp_km[c] += (L or 0) / 1000
    for c in sorted(comp_km, key=lambda c: -comp_km[c]):
        comp_id[c] = len(comp_id) + 1
    km = collections.Counter({c: v for c, v in comp_km.items()})
    RKM = {comp_id[c]: v for c, v in comp_km.items()}   # river id -> its length in km
    # the main rivers: each named river at least 25 km long (and every canal and tidal reach), one shape per river
    main = collections.defaultdict(list)
    for geom, n, f, L, a, b in links:
        if not n:
            continue
        c = find((n, a))
        if km[c] >= 25 or f in "ct":
            main[(comp_id[c], n, f if f in "ct" else "r")].append(geom)
    feats = []
    for (r, n, f), gs in main.items():
        m = linemerge(MultiLineString([x for g in gs for x in ([g] if g.geom_type == "LineString" else g.geoms)]))
        m = m.simplify(150)
        if m.is_empty:
            continue
        ll = transform(TO_LL, m); p = pack(ll)
        if p:
            feats.append([{"n": n, "f": f, "k": round(RKM[r]), "r": r}, p])
    write("main", {"lines": feats}, "the main rivers, canals and tidal reaches (each named river at least 25 km, one shape per river), simplified to about 150 m")
    # every watercourse, square by square
    sq = collections.defaultdict(list)
    for geom, n, f, L, a, b in links:
        c = geom.interpolate(0.5, normalized=True)
        r = comp_id[find((n, a))] if n else 0
        sq[(int(c.x // SQ), int(c.y // SQ))].append((geom, n, f, r))
    index = []
    for (x, y), items in sq.items():
        fs = []
        for geom, n, f, r in items:
            s = geom.simplify(8)
            if s.is_empty:
                continue
            p = pack(transform(TO_LL, s))
            if p:
                fs.append([{"n": n, "f": f, "k": round(RKM[r]) if r else 0, "r": r}, p])
        if not fs:
            continue
        (w, s_), (e, n_) = TO_LL(x * SQ, y * SQ), TO_LL((x + 1) * SQ, (y + 1) * SQ)
        key = f"{x}_{y}"; index.append([key, round(w, 3), round(s_, 3), round(e, 3), round(n_, 3), len(fs)])
        write(key, {"lines": fs}, None, tile=True)
    with open(os.path.join(OUT, "index.js"), "w") as fh:
        fh.write("/* Generated by pipeline/build_rivers.py: the 20 km squares of watercourses (key, west, south, east, north, count). OS Open Rivers, OGL v3.0, Ordnance Survey. */\n")
        fh.write("window.ATLAS_RIVERS_INDEX = " + json.dumps({"squares": index, "source": "Ordnance Survey, OS Open Rivers (OGL v3.0). Contains OS data © Crown copyright and database right."}, separators=(",", ":")) + ";\n")
    print("main rivers:", len(feats), "features; squares:", len(index))


def write(key, data, note, tile=False):
    path = os.path.join(OUT, key + ".js")
    with open(path, "w") as fh:
        if not tile:
            fh.write(f"/* Generated by pipeline/build_rivers.py: {note}. OS Open Rivers, OGL v3.0. */\n")
        fh.write(f'window.ATLAS_RIVERS_LOADED && ATLAS_RIVERS_LOADED("{key}", ' + json.dumps(data, separators=(",", ":")) + ");\n")


if __name__ == "__main__":
    main()
