# Atlas Social

**Owner:** _(not set yet: put your name here and in `views/views.js`)_
**Opens at:** `index.html#app=social` · perspective: `social`

How many people live in each place, how fast that is changing, how dense it is and how old.

## What it has
- People in a place: population, change, density, average age
- Population change ranking

## Planned
- Population pyramid: needs age bands by place (ONS single-year-of-age estimates)

## Files
| File | What it is |
|---|---|
| `view.js` | Registers the view (`AtlasApps.register`) and holds its panels and tools |
| `view.css` | Styles for this view only (loaded only in this tab) |
| `test_*.py` | Browser tests for this view, if any (`python tests/run_all.py` runs them) |

Anything only this view needs goes in this folder. If you need something new from the core (a new `ctx` function, a change to `app.js`), make it a separate small pull request titled `core: …` and tell the other person. See `CONTRIBUTING.md`, "Views".
