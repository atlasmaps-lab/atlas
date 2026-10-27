"""
One-off conversion (not part of the normal build): ONS "Westminster Parliamentary Constituencies (2001 and 2005)
Boundaries GB BFE" shapefiles (British National Grid) -> simplified WGS84 GeoJSON used by build_constituencies.py.

  pip install pyshp pyproj         (only this script needs them; the build itself is standard library only)
  unzip geometry/constituencies_1997_2005_BFE.zip -d /tmp/pcon97
  python3 pipeline/convert_old_constituencies.py /tmp/pcon97

Writes geometry/constituencies_1997.geojson (England, Wales and Scotland, 1997 to 2005/2010) and
geometry/constituencies_2005_scotland.geojson (Scotland, 2005 to 2024).
"""
import json, os, sys
import shapefile
from pyproj import Transformer

HERE = os.path.dirname(os.path.abspath(__file__))
T = Transformer.from_crs(27700, 4326, always_xy=True)


def simplify(pts, tol):
    if len(pts) < 5:
        return pts
    keep = [False] * len(pts); keep[0] = keep[-1] = True
    stack = [(0, len(pts) - 1)]
    while stack:
        a, b = stack.pop()
        ax, ay = pts[a]; bx, by = pts[b]; dx, dy = bx - ax, by - ay; L = dx * dx + dy * dy
        best, bi = -1, -1
        for i in range(a + 1, b):
            px, py = pts[i]
            t = 0 if L == 0 else max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / L))
            d = (px - ax - t * dx) ** 2 + (py - ay - t * dy) ** 2
            if d > best:
                best, bi = d, i
        if best > tol * tol:
            keep[bi] = True; stack += [(a, bi), (bi, b)]
    out = [p for p, k in zip(pts, keep) if k]
    return out if len(out) >= 4 else pts


def area(r):
    return abs(sum(r[i][0] * r[i - 1][1] - r[i - 1][0] * r[i][1] for i in range(len(r)))) / 2


def convert(path, prefix, keep=lambda rec: True, tol=60.0):
    rd = shapefile.Reader(path); feats = []
    for sr in rd.iterShapeRecords():
        code, name = sr.record[0], sr.record[1]
        if not keep(sr.record):
            continue
        shp = sr.shape; parts = list(shp.parts) + [len(shp.points)]
        rings = [simplify(shp.points[parts[i]:parts[i + 1]], tol) for i in range(len(parts) - 1)]
        rings = [r for r in rings if area(r) > 20000 or len(rings) == 1]  # drop specks under 0.02 km²
        # shapefile rings: outer rings clockwise, holes anticlockwise
        polys = []
        for r in rings:
            signed = sum(r[i][0] * r[i - 1][1] - r[i - 1][0] * r[i][1] for i in range(len(r)))
            ll = [[round(x, 4), round(y, 4)] for x, y in (T.transform(px, py) for px, py in r)]
            if signed > 0 or not polys:
                polys.append([ll])
            else:
                polys[-1].append(ll)
        geom = {"type": "Polygon", "coordinates": polys[0]} if len(polys) == 1 else {"type": "MultiPolygon", "coordinates": polys}
        feats.append({"type": "Feature", "properties": {"code": prefix + code, "name": name}, "geometry": geom})
    return {"type": "FeatureCollection", "features": feats}


if __name__ == "__main__":
    src = sys.argv[1]
    g97 = convert(os.path.join(src, "PCON_DEC_2001_GB_BFE"), "P97-")
    g05 = convert(os.path.join(src, "PCON_DEC_2005_GB_BFE"), "P05-", keep=lambda rec: int(rec[0]) >= 800)  # Scottish seats are numbered from 801
    for name, g in (("constituencies_1997.geojson", g97), ("constituencies_2005_scotland.geojson", g05)):
        p = os.path.join(HERE, "geometry", name)
        json.dump(g, open(p, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
        print(name, len(g["features"]), f"{os.path.getsize(p) / 1e6:.1f} MB")
