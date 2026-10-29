# Atlas Economic

**Owner:** _(not set yet: put your name here and in `views/views.js`)_
**Opens at:** `index.html#app=economic` · perspective: `economic`

How big each place's economy is, per head, how fast it has grown, and where it ranks.

## What it has
- Place dashboard: GDP, GDP per head, real growth, population, with sparklines since 1998
- Rankings for the boundary set on the map
- Growth decomposition: population versus output per person

## Planned
- Household income (GDHI), employment, earnings and productivity (not loaded yet)

## Files
| File | What it is |
|---|---|
| `view.js` | Registers the view (`AtlasApps.register`) and holds its panels and tools |
| `view.css` | Styles for this view only (loaded only in this tab) |
| `test_*.py` | Browser tests for this view, if any (`python tests/run_all.py` runs them) |

Anything only this view needs goes in this folder. If you need something new from the core (a new `ctx` function, a change to `app.js`), make it a separate small pull request titled `core: …` and tell the other person. See `CONTRIBUTING.md`, "Views".
