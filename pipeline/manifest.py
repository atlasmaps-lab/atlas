"""
Atlas 1.7: the source manifest, pipeline/sources/MANIFEST.csv (standard library only).

One row per downloaded file: file, publisher, dataset title, url, licence, date retrieved, sha256, coverage, notes.
Fetch scripts call record(...) after each download; rows are keyed by file, so re-fetching replaces the row.
    python3 pipeline/manifest.py          re-hash every listed file and report any that are missing or changed
"""
import csv, datetime, hashlib, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
PATH = os.path.join(HERE, "sources", "MANIFEST.csv")
FIELDS = ["file", "publisher", "dataset title", "url", "licence", "date retrieved", "sha256", "coverage (areas, years)", "notes"]
OGL = "Open Government Licence v3.0"
OPL = "Open Parliament Licence v3.0"


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def load():
    if not os.path.exists(PATH):
        return {}
    return {r["file"]: r for r in csv.DictReader(open(PATH, encoding="utf-8"))}


def save(rows):
    with open(PATH, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=FIELDS)
        w.writeheader()
        for k in sorted(rows):
            w.writerow({f: rows[k].get(f, "") for f in FIELDS})


def record(file, publisher, title, url, licence, coverage, notes="", retrieved=None):
    """file: path relative to pipeline/sources (e.g. "raw/psephology.db")."""
    rows = load()
    full = os.path.join(HERE, "sources", file)
    rows[file] = {"file": file, "publisher": publisher, "dataset title": title, "url": url, "licence": licence,
                  "date retrieved": retrieved or datetime.date.today().isoformat(), "sha256": sha256(full),
                  "coverage (areas, years)": coverage, "notes": notes}
    save(rows)


def check():
    bad = 0
    for f, r in sorted(load().items()):
        full = os.path.join(HERE, "sources", f)
        if not os.path.exists(full):
            print("missing  ", f, "(re-fetch:", r["url"] + ")"); bad += 1
        elif sha256(full) != r["sha256"]:
            print("changed  ", f); bad += 1
        else:
            print("ok       ", f)
    return bad


if __name__ == "__main__":
    sys.exit(1 if check() else 0)
