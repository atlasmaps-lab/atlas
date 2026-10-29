# Atlas Health

**Owner:** _(not set yet: put your name here and in `views/views.js`)_
**Opens at:** `index.html#app=health` · perspective: `health`

Life expectancy and other health measures by place: OHID Fingertips for councils and regions in England, Census 2021 for every ward and constituency in England and Wales.

## What it has
- Place profile
- Rankings
- Wards and seats

## Files
| File | What it is |
|---|---|
| `view.js` | Registers the view (`AtlasApps.register`) and holds its panels and tools |
| `view.css` | Styles for this view only (loaded only in this tab) |
| `test_*.py` | Browser tests for this view, if any (`python tests/run_all.py` runs them) |

Anything only this view needs goes in this folder. If you need something new from the core (a new `ctx` function, a change to `app.js`), make it a separate small pull request titled `core: …` and tell the other person. See `CONTRIBUTING.md`, "Views".
