"""
Atlas 0.3.1: Westminster constituencies -> data/constituencies.js   (python3 pipeline/build_constituencies.py)

geometry/constituencies.geojson        ONS Open Geography Portal, Westminster Parliamentary Constituencies
                                       (July 2024) Boundaries UK BGC (PCON24CD, PCON24NM)
sources/constituency_mps.csv           sitting MP and party for each constituency, UK Parliament Members API
sources/constituency_population_mid2024.csv
                                       ONS mid-2024 small-area population estimates via Nomis (NM_2014_1,
                                       Westminster Parliamentary Constituencies July 2024); mean age computed
                                       from single years of age (90+ counted as 92.5). England and Wales only.
sources/constituency_history.json       every constituency since 1997, its MPs and each MP's party history
                                       (UK Parliament Members API: Location/Constituency, Representations, Members/History)
geometry/constituencies_2010.geojson   ONS Westminster Parliamentary Constituencies (December 2019) BGC: the boundaries used
                                       from 2010 to 2024 (Scotland's from 2005)
geometry/constituencies_1997.geojson   ONS Westminster Parliamentary Constituencies (2001) GB, converted by
                                       convert_old_constituencies.py: the boundaries used from 1997 (Scotland until 2005)
Northern Ireland's 1997-2010 boundaries aren't published by ONS, so its 2010 shapes stand in for them (marked approximate).
Before 1997 there are no boundaries, so constituencies show nothing.
GDP is not published for constituencies. Standard library only.
"""
import csv, json, math, os, re, unicodedata

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC = os.path.join(HERE, "sources")
R = 6378137.0
NATION = {"E": "E92000001", "W": "W92000004", "S": "S92000003", "N": "N92000002"}
# Members API party names -> Atlas party keys (parties not in politics.js are added in EXTRA_PARTIES)
PARTY = {"Labour": "lab", "Labour (Co-op)": "lab", "Conservative": "con", "Liberal Democrat": "ld", "Reform UK": "ref",
         "Green Party": "grn", "Scottish National Party": "snp", "Plaid Cymru": "pc", "Sinn Féin": "sf",
         "Democratic Unionist Party": "dup", "Ulster Unionist Party": "uup", "Independent": "ind",
         "Alliance": "apni", "Social Democratic & Labour Party": "sdlp", "Traditional Unionist Voice": "tuv",
         "Restore Britain": "rb", "Your Party": "yp", "Speaker": "spk"}
EXTRA_PARTIES = {"apni": ["Alliance", "#d6b600"], "sdlp": ["SDLP", "#2aa82c"], "tuv": ["TUV", "#0c3a6a"],
                 "rb": ["Restore Britain", "#3b4a7a"], "yp": ["Your Party", "#b0305c"], "spk": ["Speaker", "#6f6f6f"]}


def polys(g):
    return [g["coordinates"]] if g["type"] == "Polygon" else g["coordinates"]


def ring_area(c):
    t = 0.0
    for i in range(len(c)):
        lo, mi, hi = c[i - 2], c[i - 1], c[i]
        t += (math.radians(hi[0]) - math.radians(lo[0])) * math.sin(math.radians(mi[1]))
    return abs(t * R * R / 2)


def area_km2(g):
    return sum(ring_area(p[0]) - sum(ring_area(h) for h in p[1:]) for p in polys(g)) / 1e6


def inside(pt, ring):
    x, y, c = pt[0], pt[1], False
    j = len(ring) - 1
    for i in range(len(ring)):
        xi, yi, xj, yj = ring[i][0], ring[i][1], ring[j][0], ring[j][1]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            c = not c
        j = i
    return c


def rep_point(g):
    best = max(polys(g), key=lambda p: ring_area(p[0]))[0]
    ys = sorted(p[1] for p in best)
    y = (ys[0] + ys[-1]) / 2
    xs = sorted(a[0] + (y - a[1]) * (b[0] - a[0]) / (b[1] - a[1]) for a, b in zip(best[-1:] + best[:-1], best) if (a[1] > y) != (b[1] > y))
    if len(xs) >= 2:
        k = max(range(0, len(xs) - 1, 2), key=lambda k: xs[k + 1] - xs[k])
        return [(xs[k] + xs[k + 1]) / 2, y]
    return best[0]


def simplify(pts, tol):
    """Douglas-Peucker on one ring (keeps first and last point)."""
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
            if L == 0:
                d = (px - ax) ** 2 + (py - ay) ** 2
            else:
                t = max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / L))
                d = (px - ax - t * dx) ** 2 + (py - ay - t * dy) ** 2
            if d > best:
                best, bi = d, i
        if best > tol * tol:
            keep[bi] = True; stack += [(a, bi), (bi, b)]
    out = [p for p, k in zip(pts, keep) if k]
    return out if len(out) >= 4 else pts


def slim(g, tol=0.0006):
    ps = []
    for p in polys(g):
        rings = [[[round(x, 4), round(y, 4)] for x, y in simplify(r, tol)] for r in p]
        if ring_area(rings[0]) > 2000 or len(polys(g)) == 1:  # drop specks under 0.002 km² unless it's the only part
            ps.append(rings)
    return {"type": "MultiPolygon", "coordinates": ps} if len(ps) > 1 else {"type": "Polygon", "coordinates": ps[0]}


def norm(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", " ", s.replace("&", " and ")).strip()


def main():
    geo = json.load(open(os.path.join(HERE, "geometry", "constituencies.geojson"), encoding="utf-8"))
    regions = json.load(open(os.path.join(HERE, "geometry", "eng_regions.geojson"), encoding="utf-8"))["features"]
    mps = {norm(r["constituency"]): r for r in csv.DictReader(open(os.path.join(SRC, "constituency_mps.csv"), encoding="utf-8-sig"))}
    pop = {r["code"]: r for r in csv.DictReader(open(os.path.join(SRC, "constituency_population_mid2024.csv"), encoding="utf-8-sig"))}
    sources = ["ONS mid-2024 small-area population estimates (Nomis); England and Wales",
               "ONS mid-2024 small-area population estimates (Nomis); mean age from single years of age",
               "UK Parliament Members API, October 2026", "Computed from ONS boundaries"]
    feats, places, info, missing = [], {}, {}, []
    for f in geo["features"]:
        code, name = f["properties"]["PCON24CD"], f["properties"]["PCON24NM"]
        g = f["geometry"]
        pt = rep_point(g)
        nat = NATION[code[0]]
        parent = nat
        if code[0] == "E":
            hit = next((r for r in regions if any(inside(pt, p[0]) for p in polys(r["geometry"]))), None)
            if hit is None:
                hit = min(regions, key=lambda r: sum((a - b) ** 2 for a, b in zip(rep_point(r["geometry"]), pt)))
            parent = hit["properties"]["code"]
        feats.append({"type": "Feature", "properties": {"code": code, "name": name, "level": "constituency"}, "geometry": slim(g)})
        places[code] = {"name": name, "level": "constituency", "parent": parent, "nation": nat, "pt": [round(x, 4) for x in pt]}
        rec = {"area": [round(area_km2(g), 1), 3, ""]}
        if code in pop:
            rec["population"] = [int(pop[code]["population"]), 0, pop[code]["year"]]
            rec["average_age"] = [float(pop[code]["mean_age"]), 1, pop[code]["year"]]
        m = mps.get(norm(name))
        if m and m["mp"]:
            key = PARTY.get(m["party"], "oth")
            rec["ruler"] = [f'{m["mp"]} (MP)', 2, ""]
            rec["party"] = [m["party"], 2, ""]
            rec["mp_party"] = [key, 2, m["since"]]
        else:
            missing.append(name)
        info[code] = rec
    out = {"geo": {"type": "FeatureCollection", "features": feats}, "places": places, "info": info, "sources": sources, "parties": EXTRA_PARTIES}
    path = os.path.join(ROOT, "data", "constituencies.js")
    with open(path, "w", encoding="utf-8") as fh:
        fh.write("// Generated by pipeline/build_constituencies.py. Do not edit by hand.\nwindow.ATLAS_PCON = ")
        json.dump(out, fh, ensure_ascii=False, separators=(",", ":"))
        fh.write(";\n")
    print(f"constituencies: {len(feats)}, with population {sum('population' in v for v in info.values())}, with MP {len(feats) - len(missing)}, file {os.path.getsize(path) / 1e6:.1f} MB")
    if missing:
        print("no MP matched:", missing)
    history(out, regions)


# ---------- history: which party held each seat on any date since 1997 ----------
HIST_PARTY = dict(PARTY, **{"Liberal Democrat": "ld", "Liberal": "ld", "Independent Liberal Democrat": "ld", "UK Independence Party": "ukip", "Change UK - The Independent Group": "chuk",
    "The Independent Group for Change": "chuk", "Alba Party": "alba", "Respect Party": "oth", "Workers Party of Britain": "oth", "The Reclaim Party": "oth", "Social Democratic Party": "oth",
    "Independent Conservative": "ind", "Conservative Independent": "ind", "Independent Labour": "ind", "Labour Independent": "ind", "Independent Unionist": "ind", "Independent Ulster Unionist": "ind",
    "United Kingdom Unionist": "oth", "Protestant Unionist": "oth"})
EXTRA_PARTIES.update({"chuk": ["Change UK / Independent Group", "#222222"], "alba": ["Alba", "#005eb8"], "ukip": ["UKIP", "#70147a"]})
# when each boundary set was used on the map (general election days); Scotland changed in 2005, the rest of the UK in 2010
ERA = {"1997": ("1997-05-01", "2010-05-06"), "1997S": ("1997-05-01", "2005-05-05"), "2010": ("2010-05-06", "2024-07-04"), "2005S": ("2005-05-05", "2024-07-04"), "2024": ("2024-07-04", "")}


def party_spans(reps, ph, end_default):
    out = []
    for mid, mp, s, e in reps:
        e = e or end_default or "9999-12-31"
        hist = [p for p in ph.get(str(mid), []) if p[0] < e and (not p[1] or p[1] > s) and p[2] not in ("Crossbench", "Non-affiliated", "Lord Speaker")]
        if not hist:
            prev = sorted(ph.get(str(mid), []), key=lambda p: p[0])
            hist = [[s, e, prev[-1][2]]] if prev else [[s, e, "Independent"]]
        for ps, pe, party in sorted(hist):
            a, b = max(s, ps), min(e, pe or "9999-12-31")
            if a < b:
                out.append([a, "" if b == "9999-12-31" else b, HIST_PARTY.get(party, "oth"), mp])
    return sorted(out)


def history(cur, regions):
    h = json.load(open(os.path.join(SRC, "constituency_history.json"), encoding="utf-8"))
    ph = h["partyHistory"]
    unknown = sorted({p[2] for v in ph.values() for p in v} - set(HIST_PARTY) - {"Crossbench", "Non-affiliated", "Lord Speaker"})
    by = {}  # (era, normalised name) -> Members API constituency
    for c in h["constituencies"]:
        era = {"2024-05-31": "2024", "2010-04-13": "2010", "2005-04-12": "2005S"}.get(c["s"]) or ("1997S" if c["e"] == "2005-04-11" else "1997")
        by[(era, norm(c["name"]))] = c
    spans, unmatched = {}, []
    # the 2024 seats: their full history since 2024 (by-elections, defections)
    for f in cur["geo"]["features"]:
        code, name = f["properties"]["code"], f["properties"]["name"]
        c = by.get(("2024", norm(name)))
        if c:
            spans[code] = party_spans(c["r"], ph, "")
        else:
            unmatched.append(("2024", name))
    sets = {}
    for key, fname, prefix_ok in (("2010", "constituencies_2010.geojson", None), ("1997", "constituencies_1997.geojson", None)):
        geo = json.load(open(os.path.join(HERE, "geometry", fname), encoding="utf-8"))
        feats, places = [], {}
        src_feats = list(geo["features"])
        if key == "1997":  # Northern Ireland: 2010 shapes stand in for 1997-2010
            g10 = json.load(open(os.path.join(HERE, "geometry", "constituencies_2010.geojson"), encoding="utf-8"))
            src_feats += [{"type": "Feature", "properties": {"code": "P97-" + x["properties"]["pcon19cd"], "name": x["properties"]["pcon19nm"], "ni": True}, "geometry": x["geometry"]} for x in g10["features"] if x["properties"]["pcon19cd"].startswith("N")]
        for f in src_feats:
            pr = f["properties"]
            code = pr.get("code") or ("P10-" + pr["pcon19cd"]); name = pr.get("name") or pr.get("pcon19nm")  # own codes: some seats kept their ONS code in 2024
            g = f["geometry"]; pt = rep_point(g)
            if key == "2010":
                nat = NATION[code[4]]; era = "2005S" if code[4] == "S" else "2010"
            else:
                nat = "N92000002" if pr.get("ni") else None; era = "1997"
                if nat is None:  # GB 1997 set: nation from the point's position in the 2024 nations
                    nat = nation_of_point(pt)
                if nat == "S92000003":
                    era = "1997S"
            parent = nat
            if nat == "E92000001":
                hit = next((r for r in regions if any(inside(pt, p[0]) for p in polys(r["geometry"]))), None)
                if hit is None:
                    hit = min(regions, key=lambda r: sum((a - b) ** 2 for a, b in zip(rep_point(r["geometry"]), pt)))
                parent = hit["properties"]["code"]
            name_k = {"regent s park and north kensington": "regent s park and kensington north"}.get(norm(name), norm(name))
            c = by.get((era, name_k)) or (by.get(("1997", norm(name))) if era == "1997S" else None)
            if not c:
                unmatched.append((era, name)); continue
            frm, to = ERA[era]
            feats.append({"type": "Feature", "properties": {"code": code, "name": name, "level": "constituency"}, "geometry": slim(g)})
            places[code] = {"name": name, "level": "constituency", "parent": parent, "nation": nat, "pt": [round(x, 4) for x in pt], "from": frm, "to": to, "approx": bool(pr.get("ni"))}
            spans[code] = party_spans(c["r"], ph, c["e"])
        sets[key] = {"geo": {"type": "FeatureCollection", "features": feats}, "places": places}
        path = os.path.join(ROOT, "data", f"constituencies_{key}.js")
        with open(path, "w", encoding="utf-8") as fh:
            fh.write(f"// Generated by pipeline/build_constituencies.py. Do not edit by hand.\nwindow.ATLAS_PCON_SET && window.ATLAS_PCON_SET({json.dumps(key)}, ")
            json.dump(sets[key], fh, ensure_ascii=False, separators=(",", ":"))
            fh.write(");\n")
        print(f"boundaries {key}: {len(feats)} seats, file {os.path.getsize(path) / 1e6:.1f} MB")
    # small summary added to data/constituencies.js: the spans for every seat, and when each set applies
    path = os.path.join(ROOT, "data", "constituencies.js")
    js = open(path, encoding="utf-8").read().rstrip().rstrip(";")
    data = json.loads(js[js.index("{"):])
    data["spans"] = spans; data["parties"] = EXTRA_PARTIES
    data["sets"] = {"2024": {"from": "2024-07-04", "to": ""}, "2010": {"from": "2005-05-05", "to": "2024-07-04"}, "1997": {"from": "1997-05-01", "to": "2010-05-06"}}
    for c in data["places"]:
        data["places"][c]["from"] = "2024-07-04"
    with open(path, "w", encoding="utf-8") as fh:
        fh.write("// Generated by pipeline/build_constituencies.py. Do not edit by hand.\nwindow.ATLAS_PCON = ")
        json.dump(data, fh, ensure_ascii=False, separators=(",", ":"))
        fh.write(";\n")
    print(f"party history for {len(spans)} seats; unmatched: {unmatched[:20]}{' …' if len(unmatched) > 20 else ''} ({len(unmatched)})")
    if unknown:
        print("parties shown as 'other':", unknown)


_NATIONS = None
def nation_of_point(pt):
    global _NATIONS
    if _NATIONS is None:
        _NATIONS = json.load(open(os.path.join(HERE, "geometry", "nations.geojson"), encoding="utf-8"))["features"]
    hit = next((n for n in _NATIONS if any(inside(pt, p[0]) for p in polys(n["geometry"]))), None)
    if hit is None:
        hit = min(_NATIONS, key=lambda n: min((a[0] - pt[0]) ** 2 + (a[1] - pt[1]) ** 2 for p in polys(n["geometry"]) for a in p[0][::20]))
    return hit["properties"]["code"]


if __name__ == "__main__":
    main()
