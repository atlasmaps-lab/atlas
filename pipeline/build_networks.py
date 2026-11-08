"""
Atlas 0.8.1: national railway and electricity transmission lines for zoomed-out views -> data/networks.js
Standard library.   python3 pipeline/build_networks.py

The basemap (OS Open Zoomstack) carries railways only from zoom 10, so the national picture comes from OpenStreetMap
(ODbL), fetched with the Overpass API in tiles into pipeline/sources/raw/transport/{rail,power}_*.json:
  railways   railway=rail, usage=main or branch (no sidings or yards)
  power      power=line at 132, 275 or 400 kV (the transmission grid)
Lines are simplified (Douglas–Peucker, about 120 m) so the whole country is a small file, loaded only when switched on.
"""
import glob, json, math, os, datetime
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
RAW = os.path.join(HERE, "sources", "raw", "transport")


def simplify(pts, tol):
    if len(pts) < 3: return pts
    a, b = pts[0], pts[-1]; dx, dy = b[0] - a[0], b[1] - a[1]; L = math.hypot(dx, dy) or 1e-12
    best, bi = -1, 0
    for i in range(1, len(pts) - 1):
        d = abs(dy * pts[i][0] - dx * pts[i][1] + b[0] * a[1] - b[1] * a[0]) / L if L > 1e-12 else math.hypot(pts[i][0] - a[0], pts[i][1] - a[1])
        if d > best: best, bi = d, i
    if best <= tol: return [a, b]
    return simplify(pts[:bi + 1], tol)[:-1] + simplify(pts[bi:], tol)


def load(kind):
    """read the tiles, join pieces that meet end to end (same kind), simplify, and round to about 100 m"""
    seen, segs = set(), []
    for f in sorted(glob.glob(os.path.join(RAW, kind + "_*.json"))):
        try: els = json.load(open(f))["elements"]
        except Exception: continue
        for e in els:
            if e["id"] in seen or len(e.get("geometry") or []) < 2: continue
            seen.add(e["id"]); t = e.get("tags", {})
            key = (int((t.get("voltage") or "0").split(";")[0] or 0) // 1000) if kind == "power" else ("main" if t.get("usage") == "main" else "branch")
            segs.append([key, [(round(x["lon"], 3), round(x["lat"], 3)) for x in e["geometry"]]])
    # chain segments that share an end point and a key
    ends = {}
    for i, (k, pts) in enumerate(segs):
        for end in (pts[0], pts[-1]): ends.setdefault((k, end), []).append(i)
    used, lines = set(), []
    for i, (k, pts) in enumerate(segs):
        if i in used: continue
        used.add(i); line = list(pts)
        for side in (0, 1):
            while True:
                tip = line[-1] if side == 0 else line[0]
                nxt = next((j for j in ends.get((k, tip), []) if j not in used), None)
                if nxt is None: break
                used.add(nxt); q = segs[nxt][1]
                if side == 0: line += (q if q[0] == tip else q[::-1])[1:]
                else: line = (q if q[-1] == tip else q[::-1])[:-1] + line
        line = simplify([list(p) for p in line], 0.0015)
        if len(line) >= 2: lines.append((k, line))
    feats = [{"type": "Feature", "properties": ({"v": k} if kind == "power" else {"u": k}), "geometry": {"type": "LineString", "coordinates": line}} for k, line in lines]
    return {"type": "FeatureCollection", "features": feats}


def main():
    rail, power = load("rail"), load("power")
    with open(os.path.join(ROOT, "data", "networks.js"), "w", encoding="utf-8") as fh:
        fh.write("// Atlas 0.8.1: national railways and transmission lines from OpenStreetMap (ODbL). Built by pipeline/build_networks.py; do not edit.\nwindow.ATLAS_NETWORKS = ")
        json.dump({"built": datetime.date.today().isoformat(), "rail": rail, "power": power, "source": "© OpenStreetMap contributors (ODbL)"}, fh, separators=(",", ":")); fh.write(";\n")
    print(f"networks: {len(rail['features'])} railway lines, {len(power['features'])} transmission lines")


if __name__ == "__main__":
    main()
