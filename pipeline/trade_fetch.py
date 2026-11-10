"""
Atlas 0.9: download HMRC's trade in goods bulk files (OGL v3.0) into pipeline/sources/raw/trade/.
   python3 pipeline/trade_fetch.py          (skips files already downloaded)

  uktradeinfo.com "Latest bulk data sets": the latest month's exports (bdsexp), imports (bdsimp), the control file (SMKA12:
    product descriptions) and the registers of exporters and importers.
  uktradeinfo.com "Bulk data sets archive": yearly (exports) and half-yearly (imports) zips back to 2016.
Used by pipeline/build_trade.py.
"""
import os, re, subprocess, sys, time
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import manifest

RAW = os.path.join(HERE, "sources", "raw", "trade"); os.makedirs(RAW, exist_ok=True)
UA = "Mozilla/5.0 (compatible; AtlasMaps/0.9; +https://github.com/atlasmaps-lab/atlas)"
SITE = "https://www.uktradeinfo.com"
PAGES = [SITE + "/trade-data/latest-bulk-datasets/", SITE + "/trade-data/latest-bulk-data-sets/bulk-data-sets-archive/",
         SITE + "/trade-data/latest-bulk-data-sets/bulk-data-sets-guidance-and-technical-specifications/"]
WANT = re.compile(r"(bdsexp|bdsimp|smka12|exporters|importers|cn20\d\d)", re.I)


def curl(url, out):
    for i in range(4):
        r = subprocess.run(["curl", "-sSL", "-m", "900", "-A", UA, url, "-o", out + ".part"], capture_output=True)
        if r.returncode == 0 and os.path.getsize(out + ".part") > 1000: os.replace(out + ".part", out); return True
        time.sleep(5 * (i + 1))
    print("failed:", url); return False


def main():
    links = []
    for p in PAGES:
        f = os.path.join(RAW, "page.html"); curl(p, f)
        links += re.findall(r'href="(/media/[^"]+\.(?:zip|ods))"', open(f, encoding="utf-8", errors="replace").read())
    links = [l for l in dict.fromkeys(links) if WANT.search(l)]
    for l in links:
        out = os.path.join(RAW, os.path.basename(l).lower())
        if os.path.exists(out): continue
        print("downloading", l, flush=True); curl(SITE + l, out); time.sleep(1)
    manifest.record("raw/trade/", "HM Revenue & Customs", "UK overseas trade in goods: bulk data sets (exports, imports, control file, exporters and importers registers), latest and archive since 2016",
                    SITE + "/trade-data/latest-bulk-data-sets/", "OGL v3.0", "UK, monthly, CN8 x partner country x port", "for data/trade*.js (pipeline/build_trade.py)")
    print(len(links), "files listed;", len(os.listdir(RAW)), "in", RAW)


if __name__ == "__main__":
    main()
