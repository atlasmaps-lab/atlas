# Atlas Politics

**Owner:** _(not set yet: put your name here and in `views/views.js`)_
**Opens at:** `index.html#app=politics` · perspective: `political`

Who won where and by how much, how seats and councils changed hands, and what happens if national vote shares move.

## What it has
- Election: seat-count bar and results by nation, region and party
- Seat explorer: a seat's results, MPs, majority and swing since 1997
- Councils: composition and control over time
- Projection and Swingometer: uniform national swing from the polling average
- News, Referendums (EU 2016) and Protests

## Planned
- Devolved and mayoral elections (not loaded yet)

## Files
| File | What it is |
|---|---|
| `view.js` | Registers the view (`AtlasApps.register`) and holds its panels and tools |
| `view.css` | Styles for this view only (loaded only in this tab) |
| `test_*.py` | Browser tests for this view, if any (`python tests/run_all.py` runs them) |

Anything only this view needs goes in this folder. If you need something new from the core (a new `ctx` function, a change to `app.js`), make it a separate small pull request titled `core: …` and tell the other person. See `CONTRIBUTING.md`, "Views".
