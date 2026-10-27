"""
Read .ods spreadsheets (OpenDocument, as gov.uk publishes them) with the Python standard library only.
    from ods_read import sheets, rows
    sheets("file.ods")              -> ["Contents", "Table_1", ...]
    rows("file.ods", "Table_1")     -> list of rows, each a list of cell values (str, float or None)
Repeated rows and columns (table:number-*-repeated) are expanded, except trailing empty ones.
"""
import zipfile
import xml.etree.ElementTree as ET

T = "urn:oasis:names:tc:opendocument:xmlns:table:1.0"
O = "urn:oasis:names:tc:opendocument:xmlns:office:1.0"
X = "urn:oasis:names:tc:opendocument:xmlns:text:1.0"


def _tables(path):
    with zipfile.ZipFile(path) as z:
        root = ET.fromstring(z.read("content.xml"))
    return root.iter("{%s}table" % T)


def sheets(path):
    return [t.get("{%s}name" % T) for t in _tables(path)]


def _cell(c):
    vt = c.get("{%s}value-type" % O)
    if vt in ("float", "currency", "percentage"):
        return float(c.get("{%s}value" % O))
    txt = "\n".join("".join(p.itertext()) for p in c.iter("{%s}p" % X))
    return txt if txt != "" else None


def rows(path, name):
    for t in _tables(path):
        if t.get("{%s}name" % T) != name:
            continue
        out = []
        for r in t.iter("{%s}table-row" % T):
            vals = []
            for c in r:
                if c.tag not in ("{%s}table-cell" % T, "{%s}covered-table-cell" % T):
                    continue
                n = int(c.get("{%s}number-columns-repeated" % T, "1"))
                v = _cell(c)
                vals.extend([v] * (n if v is not None or n < 100 else 1))
            while vals and vals[-1] is None:
                vals.pop()
            n = int(r.get("{%s}number-rows-repeated" % T, "1"))
            out.extend([vals] * (n if vals or n < 100 else 1))
        while out and not out[-1]:
            out.pop()
        return out
    raise KeyError(name)
