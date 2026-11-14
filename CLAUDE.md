# CLAUDE.md — Atlas

Read this first. It says what Atlas is, how the code fits together, the rules for working in it, and what is left to do. Written from `main` at commit `8e9a984` (14 Nov 2026, "Merge pull request #31 from atlasmaps-lab/mo/0.13"), which is **Atlas 0.13.1**.

## 1. What Atlas is

Atlas is an interactive map of the United Kingdom by Ruben and Mo. You click an area (a tile) to see its data, and Shift-click several to compare them. It has grown into a set of apps ("views") on one shared core: Politics, Economic, Social, Health, Markets, Transport, Environment and Resilience, plus Atlas Multi (every perspective together, the default).

- **Phase 1 (official phase):** a working map interface on stored data, with click to view and Shift-click to compare. In practice Atlas already has live services, charts, Analyse, a workspace and exports.
- **Long-term aims:** public release (own server or downloadable software), later commercial use; perspectives toggled and overlaid; more live data; eventually the world, zooming from countries down to counties (geoBoundaries polygons, ISO (International Organization for Standardization) codes).
- **Repository:** `github.com/atlasmaps-lab/atlas`. `main` is published by GitHub Pages (`https://atlasmaps-lab.github.io/atlas`); every push updates the live site within a minute or two.
- **The people:** both can do statistical coding and are newer to software development. Off-the-shelf tools are welcome.

## 2. Versions

- Names after Mo's Atlas 1.3 run 0.3.1, 0.3.2, … up to **0.13.1** now. `README.md` has a "What's new in X" section for every version, newest first. Read the top sections (0.13.1 → 0.9) before changing anything.
- A release changes three things together:
  1. the `<title>` and version label in `index.html` (`Atlas 0.13.1 · UK`);
  2. `const V = "1310"` in `views/views.js`, matched by the `?v=` numbers in `index.html` (they force browsers to fetch fresh copies);
  3. a new "What's new in X" section at the top of `README.md`, written in the same plain, user-facing style as the others.
- Mo's notes and designs drive most releases. The 0.13 designs are specs called `Atlas design/<area>/<Name> (final).md` (masthead, compare, toolbox, help, timebar…). They are **not in the repository** (they live in the project vault); `app.js` and `timebar.js` cite them in comments. Ask for them if a task touches those areas.

## 3. How to run it

- No build step, no server: open `index.html` (everything loads from local `.js` files so it works over `file://`). A local server such as `python3 -m http.server 8740` also works and is what the flights proxy's allowed origins expect.
- Paste a MapTiler API key (cloud.maptiler.com), set `maptilerKey` in `config.js`, or press **Continue without basemap**. Never commit a key.
- `index.html?dev` turns on the Design panel (ATLAS menu → Design, or Ctrl/Cmd+Shift+D); `?dev=0` turns it off. `?debug` is for `pipeline/coverage_snippet.js`.
- Apps open by hash: `index.html#app=politics` (also `economic`, `social`, `health`, `markets`, `transport`, `environment`, `resilience`).

## 4. Stack and layout

Plain HTML, CSS and JavaScript, no framework, no bundler. Map engine: MapLibre GL JS (`vendor/`). Data pipeline: Python 3 scripts (they download with `curl`; a few need extra packages such as `python-calamine`, `pyshp`, `pyproj`). Tests: Playwright (Python).

```
index.html        layout, structural CSS (0.13 colour and motion rules), top bar, tab bar, version label
app.js            the core (~5,800 lines): map, areas, cards, selection, search, perspectives, Compare, Analyse,
                  Toolbox, Help, workspace, openPanelTab / openFromBar for header tabs
config.js         maptilerKey, start view, homeBounds, minZoom, hoverDelayMs, flightsProxy, font kit settings
windows.js        the one window manager for every floating window (stacking, Esc, docking, remembered places)
engine.js         picks calculations and visual encodings per metric (fill, lightness, bivariate grid, dots, circles…)
charts.js         charts and story views, interactive tooltips
stats.js          Analyse statistics (correlations with p-values, regression, PCA, k-means, Moran's I, lags); no dependencies
psephology.js     election calculations (ENP, Pedersen, Butler, Steed, Gallagher, Dalton…)
card.js     0.11  information cards: AtlasCard.html/open/metric/why; one card design for everything
menu.js     0.11  header dropdown menus (contents pages): categories, items, key figures, news
panel.js    0.10  editorial panels: AtlasPanel.dress() turns any panel into kicker, headline, story, figures, sources
narrative.js 0.10 turns a metric's numbers into a story, plus "what it tells us" (MEANS, written per metric)
timebar.js  0.13  the time bar: slim capsule, ⌃ expands; nine more styles chosen in the Toolbox
sort.js     0.12  every table and figure list sorts; opt out with data-nosort
shape.js    0.12  features as shapes (rivers, floods, coast, parks): AtlasShape.register(kind, id => spec)
rivers.js   0.12  rivers drawn as rivers (data/rivers/, tiled from zoom 10)
profile.js  0.9   one panel for any breakdown (industries, Census topics, causes of death), with location quotient
trade.js, trade_story.js  0.9  trade, products, partners, ports, traders (HMRC)
newsfor.js  0.13  news about one thing: ranks data/news.js and adds a live GOV.UK search
money.js, apps.js, help.js, devdesign.js, theme.js, theme-apply.js, fonts.css, xlsx.js
views/            one folder per app (see section 5); views.js lists them and their files
data/             GENERATED by pipeline/ — don't hand-edit (except edits.js). Big sets are split and lazy-loaded:
                  wards/, census_wards/, stops/, rivers/, envzones/
pipeline/         fetch_*.py (download), clean_*.py, build_*.py (write data/), validate_*.py, manifest.py,
                  sources/ (MANIFEST.csv, hand tables), geometry/, reports/ (validation reports)
.github/workflows/ scheduled jobs: news, context, economy, money, trade (prices.yml is built but switched off)
workers/flights/  Cloudflare Worker that keeps the AeroDataBox key off the page (docs/flights-proxy.md)
tests/            Playwright browser tests, one file per feature; run_all.py runs them and the views' own tests
docs/             perspective-apps.md (everything ctx offers), perspective-research.md, flights-proxy.md,
                  social-backend.md, social-launch-checklist.md, declutter-1.8.md, screenshots/
```

## 5. Rules for working in the code

**Views have their own folders.** `views/<id>/` holds `view.js` (registers with `AtlasApps.register`), `view.css` (loads only in that app's tab), `menu.js` (its header menus, `AtlasMenus[appId][panelId]`), a README and any extra scripts. Current lines in `views/views.js`:

| View | Files |
|---|---|
| politics | integrity.js, view.js, menu.js |
| economic | econ.js, spending.js, view.js, menu.js |
| social | store.js, social.js, people.js, view.js, menu.js |
| health | view.js, menu.js |
| markets | view.js, menu.js |
| transport | move.js, view.js |
| environment | view.js |
| resilience | view.js |

- A view talks to the core only through the `ctx` it is given, never by reaching into `app.js`. `docs/perspective-apps.md` lists what `ctx` offers.
- A panel can declare `map` (`{ level, metrics: [...], view: [[lon, lat], zoom] }` or `ctx => …`) so its header tab puts its subject on the map; `tabs: [[id, label], …]` and `setTab` for a header menu of tabs; `menu: ctx => ({ sections: [...] })` for a contents-page menu; `editorial: false` to opt out of `AtlasPanel.dress()` (forms, calculators). Builders are in `AtlasMenu.B`.
- New view: copy `views/_template/`, change id and name, add a line in `views/views.js`, and add it to `tests/test_tabs.py`.
- Owners are blank in every view README and in `views/views.js`; fill them in when someone takes a view.

**Core changes** (`app.js`, `index.html`, the core `.js` modules, `data/`, a new `ctx` function, a fix every view needs) go in a **separate, small pull request** titled `core: …`. A fix every view needs goes in the core; a feature only one view needs stays in its folder.

**Design changes** go through the Design panel and are saved to `theme.js`, not scattered across `index.html`. Bigger structural CSS still goes in `index.html`.

**Git:** branch per person and topic (`ruben/…`, `mo/…`, e.g. `mo/0.13`), small frequent commits with a clear one-line message, pull request into `main`. Run `python tests/run_all.py` before opening one (needs `pip install playwright` and `python -m playwright install chromium`). Add a test for each new feature in `tests/` (or the view's folder); tests mock live services.

**The 0.13 look (Mo's decision, 13 Nov 2026) — keep it:**
- **One typeface: PT Serif for every word and number.** Size, weight and italic carry the hierarchy; captions italic; numbers use lining, tabular figures. A second font anywhere is a bug (`tests/test_font.py`). This replaced the earlier Surveyor Text / Archer Numeric set.
- The app's colour is for controls only. Rises are green and falls red, in shades used for nothing else. Category colours never use green, red or gold.
- Thin vertical rules separate items, never dots.
- Cards: breadcrumb, masthead over a double rule, a 12 months / 5 years / 10 years / since switch, a lead whose chart marks the highest point green and lowest red, key figures, sections that open in place, complete sortable lists ending "See all N".
- An item is clickable only when something is behind it; otherwise it's flat.
- Panels open on a Summary; other sections are dropdowns; "What it tells us" appears only when the data says something.
- Perspective header colours (light / dark): Political #9d4edd / #3c096c, Economic #a4ac86 / #333d29, Social #d69f7e / #774936, Health #ff8fa3 / #a4133c, Transport #90e0ef / #023e8a, Markets #8d99ae / #2b2d42.

**Data honesty — keep these rules:**
- Every metric has an ⓘ card: definition, how it's worked out, unit, where it applies, years, source, what's estimated, caveats.
- Missing means missing: a gap is a gap, never zero. Estimated values are tagged "est." and hatched. Exports carry a `status` column (measured / estimated / missing / not meaningful).
- Don't average things that don't add up: regions recompute from their parts; rates use population-weighted averages; "Not meaningful at this level" where boundaries don't nest. Nothing is shared out across merged councils.
- Nothing clickable or tickable without data behind it; greyed items say why.
- Integrity measures are indicators of corruption *risk*, never evidence of wrongdoing. Money in politics is worded strictly "registered".
- Sources whose terms forbid republishing (share prices, newspaper text) are not committed or scraped. Every download is recorded in `pipeline/sources/MANIFEST.csv`; big raw downloads go in git-ignored `pipeline/sources/raw/`.
- API keys never go in the site: they go in environment variables, GitHub Actions secrets or the Cloudflare Worker.
- Live services in use (no keys, open to browsers, cached, failing plainly): Environment Agency flood monitoring, UKHSA dashboard, GOV.UK search, Overpass, Valhalla (FOSSGIS), Transitous, Photon, Waymarked Trails, TfL, the UK Trade Tariff. Respect fair use: address search uses Photon and only when typing pauses (Nominatim forbids search-as-you-type). **Keep the address search filling in as you type.**

## 6. How to work with us

- Explain choices plainly. Spell out abbreviations the first time (e.g. ONS (Office for National Statistics)).
- Show working results rather than long plans. Feedback usually comes as numbered lists of changes; work through them in order and report against the same numbers.
- After each change, open `index.html` and check it actually works (screenshots via `tests/shots.py` where useful).
- Don't delete files without asking; move leftovers into `_to_delete/`.
- Commit with clear messages; don't push to `main` directly.

## 7. To-do list

From the notes on Mo's 0.10 (11 Nov 2026). When asked "what is there to do", work down this list in order; UI is the highest priority. The status column is from reading `main` at 0.13.1. **Confirm with the user before treating an item as done.**

| # | Item | Status in 0.13.1 |
|---|---|---|
| 1 | Boxes keep their place: a box opens where the last box of another metric, view or header was put; boxes shift around each other | Done in 0.10.1 ("Boxes keep their place") |
| 2 | Economic → Commuting: moving dots along commuting lines showing net volume each way | Done in 0.10.1 |
| 3 | Save light/dark and map settings across apps | Done in 0.10.1 |
| 4 | A story for every Economic indicator and header | Done in 0.10.1 |
| 5 | Analyse "what goes with" table scrolls, shows all results, significance toggle (p < 0.001 / 0.01 / 0.05 / 0.10) | Done in 0.10.1 |
| 6 | Export graphs and tables under headers to the workspace | Done in 0.10.1 |
| 7 | Headers with several tabs: hover opens a dropdown of tabs; clicking shows the box with its story | Done in 0.10.1, extended into contents-page menus in 0.11–0.13 |
| 8 | Atlas Health route planner: two points, or a loop back to the start, with distance (e.g. a 5k run) | Partly: Atlas Transport has **Draw a route** (0.12). No loop or Health version yet |
| 9 | Environment: option to show all water features | Partly: rivers and canals (0.12). Lakes, reservoirs and other water not checked |
| 10 | Climate Change under one level; disaster prediction and natural disasters as headers | Not done |
| 11 | Dams and reservoirs; floodplains; natural geographic features | Not done (recorded flood outlines exist, not floodplains) |
| 12 | People on benefits including PIP (Personal Independence Payment); social housing numbers | Partly: social housing, claimant count, child poverty and Discretionary Housing Payments are in (0.10). PIP and other Stat-Xplore figures need a `STATXPLORE_API_KEY` (`pipeline/fetch_benefits_statxplore.py`) |
| 13 | NEETs (young people Not in Education, Employment or Training) | Not done |
| 14 | Every council's draft local plan; council future plans; council tax property bands | Not done (only Band D council tax) |
| 15 | Who runs the water in an area; water and electricity prices and how they've changed | Not done |
| 16 | (Lower priority) Zoom is boxy and not smooth; make data appear smoothly when zooming | Not checked |

## 8. Known gaps (from the README and view READMEs)

- Scotland and Northern Ireland lack Census and most health indicators; recorded floods only for England and Wales; coastal erosion missing for Scotland and Northern Ireland; EA flood warnings are England only.
- Devolved, mayoral and London elections; ward-level local results; combined authorities: not yet added.
- Ward-level exposure in Resilience needs ward centroids.
- Live flight boards need the flights proxy deployed and `flightsProxy` set in `config.js`.
- Share prices stay "Not available" publicly until a provider with a public-display licence is chosen.
- Atlas Social runs in the browser only, with demo content, until `docs/social-launch-checklist.md` is done (then `docs/social-backend.md`).
- Live buses outside London and live train running need keys, so a small server.
- `tests/README.md` and `CONTRIBUTING.md` still describe 1.8-era views; the README's "Files" section is out of date (it predates card.js, menu.js, panel.js and the other 0.9–0.13 modules). Section 4 above is current.
- The phone layout is still to come.
