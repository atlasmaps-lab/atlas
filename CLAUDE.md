# CLAUDE.md — Atlas

Read this whole file before you change anything. It says what Atlas is, how the code fits together, the rules for working in it, the design principles agreed with Mo, and what is left to do. Written from `main` at commit `8e9a984` (14 Nov 2026, "Merge pull request #31 from atlasmaps-lab/mo/0.13"), which is **Atlas 0.13.1**. Where this file and Ruben's handover brief once disagreed, the brief won.

## 1. What Atlas is

Atlas is an interactive map of the United Kingdom by Ruben and Mo. You click an area (a tile) to see its data, and Shift-click several to compare them. It has grown into a set of apps ("views") on one shared core: Politics, Economic, Social, Health, Markets, Transport, Environment and Resilience, plus Atlas Multi (every perspective together, the default).

- **Phase 1 (official phase):** a working map interface on stored data, with click to view and Shift-click to compare. In practice Atlas already has live services, charts, Analyse, a workspace and exports.
- **Long-term aims:** public release (own server or downloadable software), later commercial use; perspectives toggled and overlaid; more live data; eventually the world, zooming from countries down to counties (geoBoundaries polygons, ISO (International Organization for Standardization) codes).
- **Repository:** `github.com/atlasmaps-lab/atlas`. A static site with no build step: MapLibre and plain JavaScript, served as files. `main` is published by GitHub Pages (`https://atlasmaps-lab.github.io/atlas`), so every push to `main` goes live within a couple of minutes.
- **The people:** both can do statistical coding and are newer to software development. Off-the-shelf tools are welcome.

**Read first:** `README.md` (what Atlas does; "What's new in 0.13.1" and "0.13"), `CONTRIBUTING.md` (how Mo and Ruben work), `docs/perspective-apps.md` (the `ctx` API views use), `tests/README.md`, `docs/design/` (the agreed design specs) if it's there, and `git log --oneline -20`.

## 2. Versions

- Names after Mo's Atlas 1.3 run 0.3.1, 0.3.2, … up to **0.13.1** now (0.13.2 in progress on `ruben/0.13.2`). `README.md` has a "What's new in X" section for every version, newest first. Read the top sections (0.13.1 → 0.9) before changing anything.
- A release changes three things together:
  1. the `<title>` and version label in `index.html` (`Atlas 0.13.1 · UK`);
  2. `const V = "1310"` in `views/views.js`, matched by every `?v=` number in `index.html`;
  3. a new "What's new in X" section at the top of `README.md`, written in the same plain, user-facing style as the others.
- **After editing any JS or CSS, raise every `?v=` number in `index.html` and `V` in `views/views.js` together**, or browsers keep old copies.
- Mo's notes and designs drive most releases. The agreed design specs (cards, time bar, menus, panels, map controls, workspace, toolbox, masthead, Compare, Analyse, Help) go in `docs/design/`. Mo is to add them; until then they live in Mo's notes (`Atlas design/<area>/<Name> (final).md`, which `app.js` and `timebar.js` cite in comments). Ask for them if a task touches those areas.

## 3. Code map

Plain HTML, CSS and JavaScript, no framework, no bundler. Map engine: MapLibre GL JS (`vendor/`). Data pipeline: Python 3 scripts (they download with `curl`; a few need extra packages such as `python-calamine`, `pyshp`, `pyproj`). Tests: Playwright (Python).

```
index.html        all CSS (0.13 colour and motion rules), top bar, tab bar, version label, script tags with ?v= numbers
app.js            the core (~5,800 lines): map, state, areas, key, selection, search, time bar wiring, perspectives,
                  Compare, Analyse, Toolbox, Help, workspace, openPanelTab / openFromBar for header tabs
config.js         maptilerKey, start view, homeBounds, minZoom, hoverDelayMs, flightsProxy, font kit settings
windows.js        the one window manager for every floating window (stacking, Esc, docking, remembered places)
engine.js         which visual encoding each measure gets (fill, lightness, bivariate grid, dots, circles…)
charts.js         charts and story views, interactive tooltips
stats.js          Analyse statistics (correlations with p-values, regression, PCA, k-means, Moran's I, lags)
sort.js     0.12  every table and figure list sorts; opt out with data-nosort
psephology.js     election calculations (ENP, Pedersen, Butler, Steed, Gallagher, Dalton…)

Design layer (0.13):
card.js           every card: AtlasCard.html/open/metric/why
panel.js          dresses every panel: summary, sections as rows with leads, tables as rows with bars and sort
menu.js           contents-page menus: categories, items, key figures, news
timebar.js        the time bar: slim capsule, expanded bar, nine extra styles, events
trade_story.js    trade stories (with trade.js: products, partners, ports, traders, HMRC)
newsfor.js        news in menus: ranks data/news.js and adds a live GOV.UK search

narrative.js 0.10 turns a metric's numbers into a story, plus "what it tells us"
profile.js  0.9   one panel for any breakdown (industries, Census topics, causes of death), with location quotient
shape.js, rivers.js  0.12  features as shapes; rivers drawn as rivers
money.js, apps.js, help.js, devdesign.js, theme.js, theme-apply.js, fonts.css, xlsx.js

views/            one folder per app; views.js lists them and their files
data/             GENERATED by pipeline/*.py — don't hand-edit (except edits.js). The daily news and context
                  feeds update on main automatically. Big sets are split and lazy-loaded.
pipeline/         fetch_*, clean_*, build_*, validate_*.py; sources/MANIFEST.csv; reports/
.github/workflows/ scheduled jobs: news, context, economy, money, trade (prices.yml is built but switched off)
workers/flights/  Cloudflare Worker that keeps the AeroDataBox key off the page (docs/flights-proxy.md)
tests/            Playwright browser tests, one file per feature; run_all.py runs them and the views' own tests
docs/             perspective-apps.md, perspective-research.md, flights-proxy.md, social-*.md, declutter-1.8.md
```

**Views.** `views/<id>/` (politics, economic, markets, social, health, transport, environment, resilience) holds `view.js` (registers with `AtlasApps.register`), `view.css` (loads only in that app's tab), `menu.js` (its header menus), a README and any extra scripts, all listed in `views/views.js`.

- A panel is `{ id, title, render(ctx, el), map?, menu?, blurb? }`. `map` (`{ level, metrics: [...], view: [[lon, lat], zoom] }` or `ctx => …`) puts its subject on the map; `tabs` and `setTab` give a header menu of tabs; `menu: ctx => ({ sections: [...] })` gives a contents-page menu (builders in `AtlasMenu.B`); `editorial: false` opts out of `AtlasPanel.dress()`.
- A view talks to the core only through `ctx`, never by reaching into `app.js`.
- New view: copy `views/_template/`, change id and name, add a line in `views/views.js`, add it to `tests/test_tabs.py`.

## 4. Rules

1. **Git.** Branch from an up-to-date `origin/main` and name the branch `ruben/<topic>`. Never commit to `main`. Commit with clear one-line messages. Locally, Ruben pushes with GitHub Desktop; in a Claude Code cloud session, push to the session's `ruben/<topic>` branch (the container is thrown away, so unpushed work is lost).
2. **Prefer working inside a view folder.** Core changes (`app.js`, `index.html`, `panel.js`, `card.js`, `timebar.js`, `menu.js`, `engine.js`, `data/`, a new `ctx` function) go in small separate commits titled `core: …`, and Ruben tells Mo about them.
3. **Cache numbers.** After editing any JS or CSS, raise every `?v=` in `index.html` and `V` in `views/views.js` together.
4. **Fix patterns, not examples.** When Ruben points at one panel or card, assume the problem is everywhere: fix it in the shared code so it reaches every app, panel and card, then check all apps.
5. **No keys in files.** API keys stay in environment variables, GitHub Actions secrets or the Cloudflare Worker; the MapTiler key is typed into the app.
6. **Data.** Don't get around sites that block scripts. Every source is named and linked.
7. **Ask, don't guess,** when something is a decision for Ruben (a design direction, removing something, a new data source).
8. Don't delete files without asking; move leftovers into `_to_delete/`.

**Data honesty — keep these rules:**
- Every metric has an ⓘ card: definition, how it's worked out, unit, where it applies, years, source, what's estimated, caveats.
- Missing means missing: a gap is a gap, never zero. Estimated values are tagged "est." and hatched. Exports carry a `status` column (measured / estimated / missing / not meaningful).
- Don't average things that don't add up: regions recompute from their parts; rates use population-weighted averages; "Not meaningful at this level" where boundaries don't nest. Nothing is shared out across merged councils.
- Nothing clickable or tickable without data behind it; greyed items say why.
- Integrity measures are indicators of corruption *risk*, never evidence of wrongdoing. Money in politics is worded strictly "registered".
- Sources whose terms forbid republishing (share prices, newspaper text) are not committed or scraped. Every download is recorded in `pipeline/sources/MANIFEST.csv`; big raw downloads go in git-ignored `pipeline/sources/raw/`.
- Live services in use (no keys, open to browsers, cached, failing plainly): Environment Agency flood monitoring, UKHSA dashboard, GOV.UK search, Overpass, Valhalla (FOSSGIS), Transitous, Photon, Waymarked Trails, TfL, the UK Trade Tariff. Address search uses Photon only when typing pauses (Nominatim forbids search-as-you-type). **Keep the address search filling in as you type.**

## 5. Design principles

Agreed with Mo, 13–14 Nov 2026. They apply to every app and panel.

- **One typeface:** PT Serif for every word. A second font anywhere is a bug (`tests/test_font.py`). Size, weight and italic carry the hierarchy; numbers use lining, tabular figures.
- **Colour:**
  - The app's colour (Politics purple, Economic green, Markets gold…) is for brand and controls only.
  - Green means rise and red means fall, nothing else (tokens `--up` and `--down`).
  - Time series are neutral, with the highest point green and the lowest red.
  - Categories use the `--cat` palette, which has no green, red or gold.
  - Two-sided scales run orange to blue.
- **Separators** are thin vertical rules (`.vr`), never dots.
- **Voice:** mixed. Newsroom style for leads and comparisons, record style for exact figures and periods, guide style for captions and navigation. Every number answers a real question. No "That is X% of…", no novelty conversions (per person, pence in the pound).
- **Lists** are complete ("See all N ›") and sortable: Largest first, Smallest first, A–Z.
- **Clickable** only when something is behind it; otherwise flat.
- **Cards,** in this order:
  - breadcrumb, then masthead with a double rule;
  - range switch: 12 months, 5 years, 10 years, offered only where the data reaches;
  - kicker, headline, summary;
  - captioned main chart (enlarge, Workspace, Pin to track), then three figures;
  - sections that open into a picture, a caption, a sort, then rows;
  - source and footnotes.

  Fixed height, scrolling inside. Category measures show how the map divides and how that changed.
- **Panels:** crumb line; a summary (headline, figures, main chart); sections as rows with a one-line lead and ›. Wide panels become tiles: one, two or three columns by width. Tables are rows with bars, rises green and falls red, and a sort.
- **Menus:** grouped headings. Each opens a contents page:
  - a plain sentence and headline figures;
  - one column per section, closed until clicked;
  - a sortable list with a preview and next steps;
  - an open section grows left, with News on the right.
- **Time bar:**
  - closed, a slim capsule with the date on the right; ⌃ expands it to:
    - an events line;
    - a story strip, one row per measure on the map;
    - a caption;
    - options: Step; Range (where it has data / all / any / 1974 to today); Events; Back to latest.
  - Event diamonds open the event and what each measure did around it.
  - Nine other styles are chosen in the Toolbox.
- **Opening:** Atlas opens on a plain map: nothing is on it until the user adds a measure. The first measure fills the areas (colour or lightness); the key can switch it.
- **Motion:** one easing, `cubic-bezier(.2,.7,.2,1)`. Patterns: cascade, bars fill in, open in place, row becomes the card. Respect `prefers-reduced-motion`.
- **No phone layout yet.**

## 6. Changing a design

- **A new look or a new element:** don't edit Atlas straight away.
  1. Make concept art first: two to four distinct directions, as an HTML mock or design canvas, using real Atlas content. One element at a time.
  2. Ruben reacts, you rework.
  3. Build only when Ruben says go. Then port the agreed markup and styles into the shared code; don't reinterpret them.
- **A tweak to an agreed design** (spacing, a colour token, wording, sizes) can go straight into the code. Colour and token tweaks can also go through the Design panel (`index.html?dev`, ATLAS menu → Design), which saves to `theme.js`.
- **Either way,** before you say it's done, screenshot Atlas in the same state beside the design at the size it opens by default, and compare. Passing tests don't prove it looks right.

## 7. Running and checking

- Serve the repo locally, e.g. `python3 -m http.server 8740`, and open `http://localhost:8740/` (add `#app=politics`, `#app=economic`… for each app; `?dev` for the Design panel).
  - Atlas makes many requests at once, and Python's plain server can drop some. If things fail to load, use a threaded server.
  - In the Claude desktop app, add a `.claude/launch.json` for that server and preview in the browser pane.
- MapTiler: paste a key into the app, or press **Continue without basemap**. Never commit a key.
- Tests (Playwright):
  1. `python3 -m venv .venv`
  2. `.venv/bin/pip install playwright`
  3. `.venv/bin/playwright install chromium`
  4. `.venv/bin/python tests/run_all.py`
  - The one known failure is `test_apps`' "councils draw seats over time and control", which was failing before 0.13.
  - `open_atlas(..., plain=False)`, the default, gives tests the old opening layout; `plain=True` tests the real plain opening.
  - Add a test for each new feature in `tests/` (or the view's folder); tests mock live services.
- Before a pull request: run the full suite, then open every panel in each app you touched and look at it.

## 8. How to work with us

- Explain choices plainly. Spell out abbreviations the first time (e.g. ONS (Office for National Statistics)).
- Show working results rather than long plans. Feedback usually comes as numbered lists of changes; work through them in order and report against the same numbers.

## 9. To-do list

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

## 10. Known gaps (from the README and view READMEs)

- Scotland and Northern Ireland lack Census and most health indicators; recorded floods only for England and Wales; coastal erosion missing for Scotland and Northern Ireland; EA flood warnings are England only.
- Devolved, mayoral and London elections; ward-level local results; combined authorities: not yet added.
- Ward-level exposure in Resilience needs ward centroids.
- Live flight boards need the flights proxy deployed and `flightsProxy` set in `config.js`.
- Share prices stay "Not available" publicly until a provider with a public-display licence is chosen.
- Atlas Social runs in the browser only, with demo content, until `docs/social-launch-checklist.md` is done (then `docs/social-backend.md`).
- Live buses outside London and live train running need keys, so a small server.
- `tests/README.md` and `CONTRIBUTING.md` still describe 1.8-era views; the README's "Files" section is out of date (it predates card.js, menu.js, panel.js and the other 0.9–0.13 modules). Section 3 above is current.
- `docs/design/` (the agreed specs) is not in the repository yet.
