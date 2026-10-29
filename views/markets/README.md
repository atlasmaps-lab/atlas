# Atlas Markets

**Owner:** _(not set yet: put your name here and in `views/views.js`)_
**Opens at:** `index.html#app=markets` · perspective: `markets`

Where FTSE 100 companies are headquartered, how sectors are doing, and simple valuation tools.

## What it has
- Market overview, Companies & screener, Places & markets
- Calculator: DCF, Comparables, Dividend discount, Returns

## Planned
- Public prices: needs a provider whose licence allows display on a public site (see docs/perspective-apps.md)

## Files
| File | What it is |
|---|---|
| `view.js` | Registers the view (`AtlasApps.register`) and holds its panels and tools |
| `view.css` | Styles for this view only (loaded only in this tab) |
| `test_*.py` | Browser tests for this view, if any (`python tests/run_all.py` runs them) |

Anything only this view needs goes in this folder. If you need something new from the core (a new `ctx` function, a change to `app.js`), make it a separate small pull request titled `core: …` and tell the other person. See `CONTRIBUTING.md`, "Views".
