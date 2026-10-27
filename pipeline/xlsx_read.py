"""
Read .xlsx spreadsheets with the Python standard library only (no openpyxl needed).
    from xlsx_read import sheets, rows
    sheets("file.xlsx")              -> ["Contents", "Table 1", ...]
    rows("file.xlsx", "Table 1")     -> list of rows, each a list of cell values (str, float or None)
Command line:  python3 pipeline/xlsx_read.py file.xlsx ["Sheet name"] > out.csv   (writes CSV)
"""
import csv, re, sys, zipfile
import xml.etree.ElementTree as ET

NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
      "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships"}
REL = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"


def _book(z):
    wb = ET.fromstring(z.read("xl/workbook.xml"))
    rels = ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))
    target = {r.get("Id"): r.get("Target") for r in rels}
    out = []
    for s in wb.find("m:sheets", NS):
        t = target[s.get(REL)].lstrip("/")
        out.append((s.get("name"), t if t.startswith("xl/") else "xl/" + t))
    return out


def sheets(path):
    with zipfile.ZipFile(path) as z:
        return [n for n, _ in _book(z)]


def _col(ref):
    n = 0
    for ch in re.match(r"[A-Z]+", ref).group(0):
        n = n * 26 + ord(ch) - 64
    return n - 1


def rows(path, sheet=None):
    with zipfile.ZipFile(path) as z:
        shared = []
        if "xl/sharedStrings.xml" in z.namelist():
            for si in ET.fromstring(z.read("xl/sharedStrings.xml")).findall("m:si", NS):
                shared.append("".join(t.text or "" for t in si.iter("{%s}t" % NS["m"])))
        book = _book(z)
        name, part = next(((n, p) for n, p in book if n == sheet), book[0]) if sheet else book[0]
        out = []
        for row in ET.fromstring(z.read(part)).iter("{%s}row" % NS["m"]):
            cells = {}
            for c in row.findall("m:c", NS):
                t, v = c.get("t"), c.find("m:v", NS)
                if t == "s" and v is not None: val = shared[int(v.text)]
                elif t == "inlineStr": val = "".join(x.text or "" for x in c.iter("{%s}t" % NS["m"]))
                elif v is None: val = None
                elif t in ("str", "e", "b"): val = v.text
                else:
                    try: val = float(v.text)
                    except ValueError: val = v.text
                cells[_col(c.get("r"))] = val
            out.append([cells.get(i) for i in range(max(cells) + 1)] if cells else [])
        return out


if __name__ == "__main__":
    w = csv.writer(sys.stdout)
    for r in rows(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else None):
        w.writerow(["" if x is None else (int(x) if isinstance(x, float) and x.is_integer() else x) for x in r])
