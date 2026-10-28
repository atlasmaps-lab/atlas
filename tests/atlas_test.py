"""
Shared helpers for Atlas's browser tests (Atlas 1.8). Standard library + Playwright:

    pip install playwright && python -m playwright install chromium

Each test starts a small web server on the repository, opens index.html?debug in headless Chromium at a given window size
(without a MapTiler basemap, as "Continue without basemap" does), waits for the map, and collects console errors.
"""
import contextlib, functools, http.server, os, socket, sys, threading

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SIZES = [(1024, 700), (1280, 800), (1440, 900), (1920, 1080)]


@contextlib.contextmanager
def server():
    s = socket.socket(); s.bind(("127.0.0.1", 0)); port = s.getsockname()[1]; s.close()
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a):
            pass
    handler = functools.partial(Quiet, directory=ROOT)
    class Server(http.server.ThreadingHTTPServer):
        request_queue_size = 256   # the map loads dozens of ward files at once
    httpd = Server(("127.0.0.1", port), handler)
    t = threading.Thread(target=httpd.serve_forever, daemon=True); t.start()
    try:
        yield f"http://127.0.0.1:{port}/"
    finally:
        httpd.shutdown()


@contextlib.contextmanager
def browser():
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        b = p.chromium.launch(args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"])
        try:
            yield b
        finally:
            b.close()


def open_atlas(b, base, size=(1280, 800), storage=None, query="debug"):
    """A fresh page with Atlas loaded and the map ready. storage: extra localStorage keys (JSON-encodable values)."""
    import json
    ctx = b.new_context(viewport={"width": size[0], "height": size[1]}, device_scale_factor=1)
    init = {"atlas-uk-plain": True}
    init.update(storage or {})
    ctx.add_init_script("(() => { const s = %s; for (const k in s) localStorage.setItem(k, JSON.stringify(s[k])); })();" % json.dumps(init))
    page = ctx.new_page()
    page.errors = []
    page.on("console", lambda m: page.errors.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: page.errors.append(str(e)))
    page.on("requestfailed", lambda r: page.errors.append(f"request failed: {r.url} ({r.failure})"))
    page.goto(base + "index.html?" + query, wait_until="load", timeout=120000)
    page.wait_for_function("window.atlasMap && window.atlasMap.getSource && window.atlasMap.getSource('councils') && window.AtlasDebug", timeout=120000)
    page.wait_for_timeout(800)
    return page


class Report:
    def __init__(self, name):
        self.name, self.fails, self.n = name, [], 0

    def check(self, ok, what):
        self.n += 1
        print(("  PASS " if ok else "  FAIL ") + what)
        if not ok:
            self.fails.append(what)
        return ok

    def done(self):
        print(f"{self.name}: {self.n - len(self.fails)} of {self.n} checks passed")
        sys.exit(1 if self.fails else 0)
