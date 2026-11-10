"""
Atlas 0.9: what people die of, place by place -> data/health_deaths.js
   python3 pipeline/fetch_health.py [--offline]

ONS mortality statistics: underlying cause, sex and age (Nomis NM_161_1, OGL v3.0), deaths registered in England and
Wales by council. Atlas sums the latest three years (small areas have few deaths in one year) and keeps:
  causes: the 20 ICD-10 chapters, and about 240 ICD-10 blocks (e.g. C33-C34 lung cancer, I20-I25 heart attacks and
          other ischaemic heart disease, F00-F03 dementia)
  ages:   deaths by age band
"""
import csv, io, json, os, re, subprocess, sys, time, datetime
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
import manifest

RAW = os.path.join(HERE, "sources", "raw", "health"); os.makedirs(RAW, exist_ok=True)
API = "https://www.nomisweb.co.uk/api/v01/dataset/NM_161_1"
GEO = "TYPE424,TYPE480,TYPE499"


def curl(url):
    for i in range(5):
        r = subprocess.run(["curl", "-sSL", "-m", "300", url], capture_output=True)
        if r.returncode == 0 and r.stdout: return r.stdout.decode("utf-8", "replace")
        time.sleep(5 * (i + 1))
    return ""


def grab(name, dim, codes, extra):
    p = os.path.join(RAW, name + ".csv")
    if os.path.exists(p) and ("--offline" in sys.argv or time.time() - os.path.getmtime(p) < 20 * 86400): return list(csv.reader(open(p)))
    rows = []
    for i in range(0, len(codes), 40):
        off = 0
        while True:
            t = curl(f"{API}.data.csv?geography={GEO}&date=latestMINUS2-latest&{dim}={','.join(map(str, codes[i:i + 40]))}&{extra}&measures=20100&select=date_name,geography_code,{dim},obs_value&RecordOffset={off}&RecordLimit=25000")
            r = list(csv.reader(io.StringIO(t)))[1:]; rows += r
            if len(r) < 25000: break
            off += 25000
        time.sleep(0.5)
    with open(p, "w", newline="") as fh: csv.writer(fh).writerows(rows)
    manifest.record(f"raw/health/{name}.csv", "Office for National Statistics (Nomis)", "Mortality statistics: underlying cause, sex and age (deaths registered), " + name, "https://www.nomisweb.co.uk/datasets/mortsa", "OGL v3.0", "England and Wales councils, regions; latest three years", "for data/health_deaths.js")
    return rows


def main():
    t = json.loads(curl(API + "/cause_of_death.def.sdmx.json"))["structure"]["codelists"]["codelist"][0]["code"]
    names = {int(c["value"]): c["description"]["value"] for c in t}
    chapters = [k for k in names if 0 < k < 98]
    blocks = [k for k in names if 100 <= k < 9000]
    ch = grab("chapters", "cause_of_death", chapters, "gender=0&age=0&measure=1")
    bl = grab("blocks", "cause_of_death", blocks, "gender=0&age=0&measure=1")
    ag = grab("ages", "age", list(range(1, 21)), "cause_of_death=0&gender=0&measure=1")
    agn = {1: "Under 1", 2: "1 to 4", 3: "5 to 9", 4: "10 to 14", 5: "15 to 19", 6: "20 to 24", 7: "25 to 29", 8: "30 to 34", 9: "35 to 39", 10: "40 to 44", 11: "45 to 49", 12: "50 to 54",
           13: "55 to 59", 14: "60 to 64", 15: "65 to 69", 16: "70 to 74", 17: "75 to 79", 18: "80 to 84", 19: "85 to 89", 20: "90 and over"}
    years = sorted({r[0] for r in ch})
    def summ(rows):
        o = {}
        for y, g, c, v in rows:
            try: n = int(float(v))
            except ValueError: continue
            if n: d = o.setdefault(g, {}); d[c] = d.get(c, 0) + n
        return o
    clean = lambda s: re.sub(r"\s+", " ", re.sub(r"^[A-Z]\d\d(\.\d)?(-[A-Z]\d\d(\.\d)?)?(,[A-Z]\d\d\d?(-[A-Z]\d\d)?)* ", "", s)).strip()
    code = lambda s: s.split(" ")[0]
    out = {"built": datetime.date.today().isoformat(), "years": [years[0], years[-1]] if years else [],
           "ch": {"names": {str(k): [code(names[k]), re.sub(r"^[A-Z]\d\d.*?\b([IVX]+) ", "", names[k])] for k in chapters}, "v": summ(ch)},
           "bl": {"names": {str(k): [code(names[k]), clean(names[k])] for k in blocks}, "v": summ(bl)},
           "age": {"names": {str(k): v for k, v in agn.items()}, "v": summ(ag)},
           "source": "ONS mortality statistics, underlying cause, sex and age (deaths registered in England and Wales; Nomis). OGL v3.0"}
    with open(os.path.join(ROOT, "data", "health_deaths.js"), "w", encoding="utf-8") as fh:
        fh.write("// Atlas 0.9: deaths by cause and age, by council. Built by pipeline/fetch_health.py; do not edit.\nwindow.ATLAS_DEATHS = ")
        json.dump(out, fh, separators=(",", ":"), ensure_ascii=False); fh.write(";\n")
    print("years", out["years"], "· councils", len([g for g in out["ch"]["v"] if re.match(r"^[EW]0[6-9]", g)]), "· blocks", len(blocks), "·", os.path.getsize(os.path.join(ROOT, "data", "health_deaths.js")) // 1024, "KB")


if __name__ == "__main__":
    main()
