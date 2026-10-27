# Atlas browser tests (1.8)

Each test opens Atlas in headless Chromium, does what a user would do, and checks the result. They need Python 3 and Playwright:

```
pip install playwright
python -m playwright install chromium
```

Run one test, or all of them:

```
python tests/test_windows.py
python tests/run_all.py
```

| Test | What it checks |
|---|---|
| `test_windows.py` | Compare → Analyse: Analyse is above Compare and visible; Esc closes the top window only; default window sizes; saved positions stay on screen |
| `test_timebar.py` | Time-bar labels at 320, 480, 800 px and full width (no overlaps, current date always shown); the range follows the data (GDP only, MPs only, Controlling party only) |

`python tests/shots.py <name> [scene ...]` saves screenshots at 1024×700, 1280×800, 1440×900 and 1920×1080 in `docs/screenshots/1.8/` and reports console errors.
