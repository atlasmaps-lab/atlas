# Atlas 1.8 — United Kingdom


## What's new in 1.8

**Windows.** One window manager (`windows.js`) runs every floating window: charts, Compare, Export, Analyse, protest and info cards, lists and app panels.
- The window you opened or clicked last is on top. A window opened from another (Analyse from Compare) sits above it, offset, with a brief highlight and a "← Back to Compare" link; the parent stays open.
- Esc closes the top window only.
- New windows dock on the right, at most 40% wide and 70% high, so the map stays usable. ⤢ fills the screen; nothing else covers the map.
- Sizes and positions are remembered per kind of window and pulled back on screen when the browser shrinks. Charts redraw when a window is resized; tables scroll inside it with a fixed header and first column.

**Time bar.**
- Labels fit the bar's width (years, every 5th or 10th year, or just the ends) and never overlap. The current date sits above the handle; click it to type a date.
- The bar runs over the dates with data for what's on the map: GDP only, 1998–2024; MPs only, 1997 on; controlling party, 1974 on. A date outside a new range moves to its nearest end, with a message. **⋯ → Full range** shows 1974 to today, with the years without data hatched.
- With protests on, the bar has a tick at each protest and Play steps from one to the next.

**Clear all, and "not available".** Clear all is at the top of the Perspectives panel, greyed when nothing is on the map, with Undo; each perspective has its own small "clear" link when it has something on. Nothing with no data behind it can be ticked or chosen without a reason:
- metrics say "No data for wards", "Starts in 1998" or "Not meaningful for councils";
- Areas marks boundary sets with no data for what's on the map;
- search tags places with no data;
- Analyse, Export and Compare grey out what can't work and say why;
- Transportation says "Not available yet".

**Protests.**
- The data was rebuilt (`pipeline/fetch_protests.py`). An event is kept only if Wikidata says it was in the UK, or a place it names resolves to a UK item inside the UK's boundaries. Every place name goes through its Wikidata item, so London (Ontario) or Perth (Australia) can't land here.
- International protests keep only their UK sites, labelled "UK part of an international protest", and never carry a global crowd figure.
- Places that are only a region or county get no point.
- `pipeline/reports/validation_protests.md` lists every event dropped, every site removed, every ambiguous name and a 15-event spot check. The build stops if any point falls outside the UK.
- Each protest now has a short Wikipedia summary (CC BY-SA, linked), dates, all its places, crowd estimates with who made them, organisers, the result and its Wikidata ID.
- On the map, nearby protests group into numbered rings coloured by cause (click to zoom). Protests on exactly the same point fan out. Every protest opens its own card (several can be open).
- A protest list (from the key or an area's card) shows the protests in the window for the area in focus or the visible map, sortable and filterable.

**Compare makes tables and charts.**
- **Make table:** places × metrics at one date, places × years for one metric, or metrics × years for one place. Columns sort. The bottom row sums counts and amounts and gives population-weighted averages for rates; it never averages rates plainly or adds up categories. Estimated values are flagged. Copy as CSV, .xlsx / .csv, → Workspace, Open in tab.
- **Make chart:** the chart style picker, drawn inside Compare beside the table, in a pane you can resize.
- Everything made stays in a list on the left. **Analyse these…** opens Analyse on top.

**Help.**
- ⓘ next to every metric opens a small card: definition, how it's worked out, unit, where it applies, years, source, what's estimated, caveats (e.g. GDP per head and commuting) and related metrics.
- There's an ⓘ for chart styles and for the labels measured / estimated / missing / not meaningful.
- **ATLAS menu → Help** explains every analysis method: what it answers, what it needs, its assumptions, when it misleads, and a worked example you can load. It also covers every chart and table. The "what it needs" text comes from the same table Analyse uses to grey methods out, so the two can't disagree.

**A calmer screen.**
- Always visible: the ATLAS menu, Areas, search, the Perspectives panel (folded), the time bar, and the key and chart button when relevant.
- Tools, Workspace and Notes are in the ATLAS menu. Zoom buttons and the Notes tab appear near the right edge. The time bar's step and range options are behind ⋯. The tab bar appears once there's more than the map.
- Full list: `docs/declutter-1.8.md`.

**Perspective apps.** Any perspective opens as its own app in a new tab (↗ on its row, or ATLAS menu → Apps), with a shareable address such as `index.html#app=markets`. Apps run on the same core as Atlas Multi, which stays the default.
- **Atlas Markets:** market overview, companies and screener with a watchlist, company cards, head offices by place, and calculators (DCF with a WACC × growth table, trading comparables with a football field, dividend discount, returns: CAGR, volatility, drawdown, beta). Formulas sit behind ⓘ and every calculator says it's illustrative, not investment advice. Share prices are **not available** in the public site: no lawful free source allows public display (`pipeline/sources/prices_licence.md`). A scheduled price job is built but switched off.
- **Atlas Politics:** election view on the hex map with a seat bar and results table, a uniform-swing calculator (it says it's a simple model), a seat explorer, councils over time, referendums and protests.
- **Atlas Economic** and **Atlas Social:** light versions (dashboards, rankings, growth decomposition, population change); the rest is marked "Not available yet" (`docs/perspective-apps.md`).

**Tests.** `tests/` has browser tests for each phase (`python tests/run_all.py`; see `tests/README.md`), including the Compare → Analyse visibility test, the time-bar label and range tests, and the "no protest point outside the UK" check. Screenshots at 1024×700, 1280×800, 1440×900 and 1920×1080 are in `docs/screenshots/1.8/`.

**Fixed along the way:** "Copy data (CSV)" buttons called a function that didn't exist; the time bar slid under the Perspectives panel at 1024 px; the tab bar ran under Tools on narrow screens; tables opened in their own tab were hidden behind floating windows.


## What's new in 1.7 (previous version)

**Honest numbers.** Every new metric carries:
- **How this is worked out:** a one-line formula on the pinned card and in the export's About sheet.
- **Where it applies:** for example, Westminster results aren't shown for councils or wards, because the boundaries don't nest. Elsewhere the card says "Not meaningful at this level" and the map leaves the area unfilled, rather than averaging something that doesn't add up.
- **Estimated values:**
  - an "est." tag on cards and tables
  - diagonal hatching on the map (Tools → Estimated values: Hatched / Plain)
  - a `status` column in exports, for every metric: measured, estimated, missing or not meaningful
- **Missing means missing:** a gap is shown as a gap, never as zero.

**Westminster elections (1997–2024, plus by-elections since 2010).** Winning party (shaded by the winner's share), vote share for any party, turnout and turnout change, majority, marginality, votes to flip, second place, wins on under half the vote, wasted votes, two-party share, swing (Butler and Steed, for any pair of parties), volatility (Pedersen), effective number of parties (votes; seats for areas), disproportionality (Gallagher), and electors per MP against the electoral quota.
- The time bar picks the latest election on or before the date.
- Regions, nations and the UK add up their seats' votes and recompute; nothing is averaged.
- Across the 2010 and 2024 boundary changes, comparisons use the House of Commons Library's notional results, and are marked as estimated.
- Election charts draw a point at each election, joined by lines. By-elections are hollow points.

**Referendums.**
- **EU 2016:** Leave share and turnout by council, region, nation and the UK. Councils merged since 2016 add up their predecessors' votes. Northern Ireland was counted as one area. Gibraltar is left out (it isn't part of the UK).
- **Constituency estimates:** Chris Hanretty's Leave estimates for the 2010–2024 seats, marked as estimated.

**Local elections & councils.**
- **Council tax, Band D:** nominal, real (CPIH, in the latest April's prices) and real change over 10 and 5 years. Northern Ireland: "not applicable" (it has domestic rates).
- **Council make-up, 1973–2026:** seats by party, seat share for any party, majority, and fragmentation.

**Representation.** Electorate as % of adults, for England and Wales by constituency. The card warns that this is not a measure of registration completeness.

**Ideology.** Left–right centre of gravity, and polarisation (Dalton index), from the Chapel Hill Expert Survey. Each election uses the latest survey wave on or before it. The share of the vote covered by parties with a score is shown, and the value is missing when that share is under 75%.

**Derived from what Atlas already had.**
- **Party dominance:** share of days under the leading party.
- **Longest continuous control.**
- **Same party as government:** with coalitions counted, from a cited list in `government_coalitions.csv`.
- **MPs:** years in the seat, MPs since 1997, and how often the seat changed hands.
- **Protests:** trend, cause diversity, and protests by opposition parties and their allies.

**Hex map.** Areas → Constituencies → **Hex map (equal area)**. One hexagon per seat, for the 2024 and 2010 seats, so big rural seats don't dominate. It uses the same colours, cards and clicks.

The Political categories in the Perspectives dock are now: Government & control, Westminster elections, Local elections & councils, Referendums, Representation, Ideology, Protests (test case).

### Sources

| Metrics | Years | Levels | Source | Measured / estimated |
|---|---|---|---|---|
| Westminster results | 2010–2024, by-elections 2010– | constituency → UK | House of Commons Library, Election Results database (electionresults.parliament.uk) | measured |
| Westminster results | 1997, 2001, 2005 | constituency → UK | House of Commons Library, briefing CBP-8647 (spreadsheet) | measured |
| Changes across boundary reviews | 2005→2010, 2019→2024 | constituency | Library notional results (in the same database) | estimated |
| EU referendum | 2016 | council → UK | Electoral Commission results by counting area; ONS Code History Database for merged councils | measured |
| EU referendum by constituency | 2016 | 2010-set constituencies (GB) | Chris Hanretty, revised estimates (Aug 2016) | estimated |
| Party left–right positions | waves 1999–2024 | (used in ideology metrics) | Chapel Hill Expert Survey trend file 1999–2024 | expert survey |
| Band D council tax | England, Wales 1993–; Scotland 2014– | council (and its wards) | MHCLG live table; Scottish Government; StatsWales | measured |
| Inflation | 1988– | — | ONS CPIH (L522), April values | measured |
| Council composition | 1973–2026 (Scotland, Wales 1995–) | council (and its wards) | Open Council Data UK (CC BY-SA 4.0) | measured |
| Electorate as % of adults | Dec 2025 / mid-2024 | 2024 constituencies (England, Wales) | ONS electoral statistics; ONS small-area population estimates (Nomis) | measured |
| Coalitions | 1999– | — | `pipeline/sources/government_coalitions.csv`, one cited row per coalition | compiled |
| Hex maps | 2010 and 2024 seats | constituency | Open Innovations HexJSON (MIT) | layout |

Every downloaded file is listed, with its URL, licence, date and SHA-256, in `pipeline/sources/MANIFEST.csv`. The validation report is `pipeline/reports/validation_politics.md`.

### Known gaps

- **Not added (sources blocked or not yet done):**
  - the Scottish independence referendum: the official per-council results sit behind browser checks
  - devolved, mayoral and London elections
  - ward-level local election results, and so local vote share, local turnout and the turnout gap
  - combined authority boundaries and mayors
  - Northern Ireland council make-up: the free file folds all NI parties into "other"
- **By-elections before 2010** aren't in the data, though seat holders between elections still come from the Members API history.
- **1997–2005:** the Library's file lists only the main parties; the rest are one "Other" group. The sheet's notes name the winners from that group (the Speaker, Martin Bell, Richard Taylor, George Galloway, Peter Law).
- **No comparisons across the 1997 and 2005 boundary changes** (no notional results): swing, volatility and turnout change are missing for 1997, and for Scotland's seats in 2005.
- **Ideology** is missing for Northern Ireland (its parties aren't in CHES), for 1997 (no earlier wave), and wherever parties with a score won under 75% of the vote.
- **Two 2016 by-elections** (Sheffield Brightside and Hillsborough; Sleaford and North Hykeham): in the Library's database, the candidates' votes don't add up to its own valid-vote count. Both numbers are kept as published.


Atlas 1.6 is about the data: what you can do with it, where you can put it, and how much of the map stays in view while you work. Built on 1.5 (Ruben's 0.3.3 merged with Mo's 1.4). Earlier versions stay unchanged in their own folders.



**Analyse relationships (ATLAS menu → Analyse relationships…).** Compares metrics without picking places. Tick metrics on the left, choose the level (councils, constituencies…), and choose **Within**: the whole UK, one nation or region, or your selection. You can also switch to **Over time** for one place. The methods offered depend on how many metrics are ticked:

| Metrics ticked | Methods |
|---|---|
| One | **Distribution**: histogram, median, quartiles, skew and outliers. **Spatial pattern**: Moran's I with a permutation test, plus local hot and cold spots |
| Two | **Relationship**: scatter with a fitted line; Pearson, Spearman and Kendall with p-values; R²; optionally split by a category. **Area by area**: the same link measured inside each nation or region, to show where it holds and where it reverses |
| Three or more | **Correlation matrix** (Pearson or Spearman). **Partial correlations**: each pair with the others held fixed. **Regression**: pick the outcome; standardised effects with 95% ranges. **Components (PCA)**: which metrics move together. **Clusters**: k-means, choosing the number of groups by silhouette, with a profile of each group. **Unusual places**: Mahalanobis distance across all the metrics |
| Over time | **Trend** (growth per year, biggest moves), **Timeline** (small multiples), **Lag** (correlation of year-on-year changes, and which metric leads) |

- Every result can be sent to the workspace, copied as CSV, or, where it makes sense, shown on the map (residuals, hot spots, component scores, clusters).
- **Extreme places:** when a few places sit far outside the rest (beyond 3 × the interquartile range), Atlas names them and offers **Leave them out**. Example: GDP per head against population change shows Pearson r = .72 with the City of London and inner boroughs included, but .20 without them. When Pearson and Spearman disagree, the headline strength now comes from Spearman, and the fitted line is described per typical step (one standard deviation) rather than per £1.
- The statistics live in `stats.js` and are plain, dependency-free code, checked against textbook values (Anscombe's data and others).

**Interactive charts.** Every chart responds to the pointer:
- Line and area charts show a guide line and the exact year and value of every series.
- Scatters snap to the nearest point, with a crosshair to both axes.
- Bars, histograms, heat maps and effect charts show their exact value on hover.

**Tables.** Click a column header to sort. Hover a row to highlight the place on the map; double-click a row to focus it.

**Floating windows.** The comparison, chart, export and Analyse windows:
- drag by the title bar
- resize from the corner
- shrink to the title bar (–) or fill the screen (⤢)
- open docked to the right, so the map stays usable on the left
- remember their position

**Workspace.** A tab of its own, for projects. Send things to it:
- charts (chart panel → "To workspace")
- tables and tiles of the selected places (comparison window)
- analyses
- a place's card or its tile (pinned card)
- pictures of the map (Tools → To workspace, or Capture map)
- notes

On the canvas:
- Drag items by the title and resize them from the corner. Double-click a title to rename it.
- Drop one item onto another to combine them: two charts become one chart with both sets of places and metrics; tiles merge into one map; tables merge; anything else stacks. Undo is offered.
- Charts and analyses stay live: they redraw at their own date and size, and keep their tooltips.
- Several projects, each with a name.
- **Export ▾**:
  - **PDF**: your browser's print dialog, one item per page
  - **Presentation**: a standalone HTML slide file; arrow keys move, F goes full screen
  - **Project file (.json)**: to back up a project or share it with Ruben; import it the same way

Projects are saved in this browser.

**Map and workspace together.**
- The **Split** button (in the tab strip and the workspace bar) puts them side by side; drag the divider to change the share.
- Swipe left or right with two fingers on a trackpad (or on a touch screen) to move between the map, the workspace and chart tabs.
- Swipe up over the top bar, or press the grid button, to see all tabs.

**Selecting.** The Select tool is gone. Hold the mouse still for a moment, then drag a box; a quick drag still moves the map. Shift-drag and the Lasso tool work as before.

**Bringing a selection into focus** now happens 2 seconds after you stop selecting (was 8), after a box selection as well as after Shift-clicks.

**Smaller fixes:**
- Zone labels can no longer push the page sideways.
- Focusing a place before the map has loaded waits instead of failing.
- Map pictures get the sea behind them instead of black.

## From Ruben's branch: health, housing and government debt

**Health** is now a working perspective, **Housing** sits under Markets and **Government debt** under Economic: 87 new metrics in all. Where each one has data:

| Group | Metrics | Wards | Constituencies | Councils | Regions, nations |
|---|---|---|---|---|---|
| Health · Census 2021 | good / bad health, disability, day-to-day limits, unpaid carers | England & Wales | England & Wales | England & Wales | yes |
| Health · Life expectancy, Deaths, Weight & lifestyle, Conditions, Environment | 33 indicators, most yearly since 2001–2010 | child obesity only (3-year) | — | England | England |
| Markets · House prices | average price by type, first-time buyers, change, sales (UK HPI, 1995–2026); median price and affordability ratios (ONS, 1997–2025) | median price (1995–2022) | — | whole UK (HPI) | yes |
| Markets · Rents | average rent, 1–3 bedrooms, change (2015–2026) | — | — | whole UK | yes |
| Markets · Homes, Housing need | dwellings, empty homes, temporary accommodation, homelessness duties, fuel poverty | — | — | England | England |
| Markets · Census 2021: homes | tenure, house type, overcrowding, bedrooms, heating, households, household size | England & Wales | England & Wales | England & Wales | yes |
| Economic · Government debt | national debt (£, % of GDP, per person, 1975–2026); council borrowing, borrowing and debt need per resident, investments (2019–2025) | — | — | England | UK; England and regions (council borrowing) |

- Census figures are added up from 188,880 output areas into Atlas's own wards (7,563 of 7,579 in England and Wales) and 2024 constituencies, so they line up exactly with the map.
- Ward median prices are for 2021–22 wards. 3,910 wards match exactly; 1,305 redrawn wards use the old ward that covers most of them.
- Council borrowing per resident includes a population share of the county council's borrowing in two-tier areas. Fire, police, combined authorities and the GLA (Greater London Authority) are not included.
- Scotland and Northern Ireland have house prices and rents but not the Census or the health indicators (they run their own; not loaded yet).
- Metrics with nothing for the boundaries on the map are greyed out in the Perspectives menu, as before.

Rebuild with `python3 pipeline/fetch_extra.py` then `python3 pipeline/build_extra.py` (needs `pip install python-calamine`). Downloads go to `pipeline/sources/extra_raw/`, which isn't committed.

## From 1.5: how the two lines fit together

| | |
|---|---|
| Bottom-right buttons | Two round buttons: **compare** (Ruben's; appears when areas are selected, shows how many) and, to its right, the **chart bubble** (Mo's). The chart uses whatever you're looking at: the focused area, the selection, or the places shown together from a search |
| Clicking areas | Follows the boundary set chosen in the Areas menu. Once you're zoomed into London, the gold district tiles take clicks inside them; company squares take clicks on themselves |
| Hover card | Everything ticked in Perspectives shows in the card (Ruben's rule), each with a small line chart of its history (Mo's). Tools → Hover cards → Simple gives short cards |
| Areas menu | Boundary sets (Ruben's), with **Custom zones → Financial districts** listed next to **Electoral → Westminster constituencies** |
| Controlling party | Districts show the control of the council they sit in |
| Toolbox | Ruben's tools (select, lasso, measure, copy view, grid lines), plus Mo's **Panels: near edges** and **Hover cards** switches |
| Esc | Closes, in order: the chart tab, the chart panel, the notes, then the menus and pages as before |

Settings are saved under a new key, so the first time you open 1.5 the perspectives start from their defaults.

## From Mo's 1.4

**Charts everywhere.** A round **chart bubble** sits at the bottom right. It bounces when there's something new to chart: a focused area, a selection, a district or a company. Click it and the chart panel opens.

1. **What:** pick one or more metrics, the places (your focused area plus your selection; Shift-click to add more) or companies, and the years.
2. **How:** before anything is drawn, Atlas offers chart styles. Simple ones come first, and the engine pre-selects the simplest one that suits. Greyed styles don't fit the choice; hover them to see why.

   | Style | Best for |
   |---|---|
   | Line | change over time (the default) |
   | Area | one or a few places over time |
   | Bars by year | totals and counts |
   | Start vs end | who rose and who fell |
   | Ranked | places in order on one date |
   | Timeline | a category through time, e.g. party control |
   | Shares (donut) | how places split between categories, or shares of a total |
   | Two axes | two metrics with different units |
   | Small charts | several metrics side by side in one frame |

3. **Story views (experimental):** the same numbers drawn as things in the world. These are for one metric at a time; use the precise charts for exact readings.

   | View | What it shows |
   |---|---|
   | Dye in water | glasses that fill and darken with the value |
   | Balance | two places weighed against each other |
   | Orbits | places orbit the typical (median) value; further out means less typical; bigger planets have more people |
   | Tree | branches are areas, leaves are the smaller areas inside them, coloured by value |

**Open in tab:** any chart can open full screen in its own **tab**. Tabs appear next to the level buttons; the map is always the first tab.

Charts also appear in other places:
- small **line charts (sparklines)** in hover cards for every metric on the map
- a **Chart** button on pinned cards
- **Chart over time** in the mind map
- price lines on company and district cards

Pie, ranked and story views use the date on the time bar.

**Custom zones: London's financial districts (Markets perspective, test case).** Some places are known for something. Atlas now supports **custom zones**: areas that aren't official boundaries but are clickable tiles with their own cards. The test case is four financial districts:

| District | Boundary |
|---|---|
| The City (Square Mile) | the City of London council boundary |
| Canary Wharf | drawn by hand, approximate |
| West End & St James's | drawn by hand, approximate |
| Midtown & King's Cross | drawn by hand, approximate |

- **When they appear:** from London zoom, the tiles show as gold dashed areas with labels. At lower zoom a gold dot marks them; click it to fly in.
- **Clicking a district** focuses it like any area. Its card lists the FTSE 100 head offices inside it, with market values, a sector bar and price sparklines. **Chart these companies** opens their share prices.
- **The market (one only): the FTSE 100** (London Stock Exchange). 55 of its 100 companies are headquartered in London, and 42 of those are inside the four districts.
- **Companies are squares** (protests are circles), sized by market value and coloured by sector. Click one for its card: head office, market value, revenue, employees, founding date, share price with 12-month change, and price line.
- **Markets metrics:** FTSE 100 head offices, market value headquartered here, share price change over 12 months (moves with the time bar, from 2000), main sector, and the company points.
- **Data sources:**
  - Constituents and sectors: Wikipedia
  - Market values and monthly share prices are **not included in this public repository**: their sources (companiesmarketcap.com and Yahoo Finance) do not allow republishing. Run `python3 pipeline/fetch_markets.py` then `python3 pipeline/build_markets.py` to add them on your own computer; don't commit the result.
  - Head offices: a hand-compiled address table (`pipeline/sources/hq_addresses.csv`), geocoded with OpenStreetMap. **Check it: offices move.**

  Edit districts in `pipeline/sources/zones.json`; any shape can become a zone.

**Calmer screen.**
- **Tools → Panels → Near edges:** the perspectives dock and legend hide until the pointer nears the left edge, and the time bar until it nears the bottom (hot zones).
- **Tools → Hover cards → Simple:** short cards (name, what's on the map, sparklines).
- **Notes:** a drawer on the right edge. Jot a thought and, if you like, remember the map view and date with it. **Go there** returns to that view. Notes are kept with your edits and exported with them.

**Rebuild the market data:**

```
python3 pipeline/fetch_markets.py
python3 pipeline/build_markets.py
```


## From Ruben's 0.3.3

Atlas 0.3.3 continues the clean-up of Mo's Atlas 1.3. Earlier versions stay unchanged in their own folders.

## What changed from 0.3.2

1. **Constituencies work on past dates (back to 1997).** The constituency layer shows the boundaries in force on the date on the time bar, and each seat is coloured by the party its MP sat for on that day (by-elections and defections included):

   | Dates | Boundaries | Source |
   |---|---|---|
   | 4 July 2024 → today | the 2024 seats (650) | ONS (Office for National Statistics) |
   | 2010 → 2024 | the 2010 seats; Scotland's from 2005 | ONS, December 2019 boundaries |
   | 1997 → 2010 | the 1997 seats; Scotland's until 2005 | ONS 2001 boundaries (Great Britain) |
   | before 1997 | none: the map says "constituency records start in 1997" | |

   - MPs and parties come from the UK Parliament Members API (Application Programming Interface).
   - Seat totals match the election results, e.g. 2010: Conservative 306, Labour 258, Lib Dem 57.
   - Older boundaries load the first time you go back past 2024.
   - Northern Ireland's 1997–2010 boundaries aren't published, so its 2010 shapes stand in for them; the card says "approx. boundary".
   - Population and age are only for the 2024 seats.
2. **One "Controlling party" layer** replaces Council control, Council leader's party and Governing party. What it shows follows the boundary set on the map, and the key says which:

   | Boundary set | Controlling party |
   |---|---|
   | Nations | the UK or devolved government |
   | Regions | the Mayor of London for London; the UK Government elsewhere (England has no regional governments) |
   | Councils | the party in control of the council |
   | Wards | their council's control |
   | Constituencies | the MP's party |

   Council leaders still show as "De facto ruler" in the hover card.
3. **Tickboxes in the Areas dropdown** (the one showing Nations / Councils…), as well as in the search bar's dropdown. Clicking a place ticks it, and **Search** at the bottom shows all ticked places together. Both lists share one set of ticks, and a "3 ticked" label in the search bar shows how many. Pressing Enter in the search bar still jumps straight to one place.
4. **Shift-click several areas and leave the map alone for 8 seconds:** it switches to the softened view with a card for each area. Panning, zooming or clicking anywhere else cancels the switch.

## Ruben's 0.3.2

## What changed from 0.3.1

1. **Right-click to deselect.**
   - Right-click a selected area to deselect it.
   - Right-drag a box to deselect every selected area inside it.
   - Right-click the sea (no area) to clear the whole selection.
   - Right-clicking a place shown from a search removes it from the view.
2. **Search uses tickboxes.**
   - Typing and pressing **Enter** jumps straight to the best match, as before.
   - In the dropdown, click results to **tick** them, across as many searches as you like. Ticked places stay at the top of the list.
   - The dropdown's **Search** button shows them all together:
     - Every place fits in one frame, and the rest of the map is softened.
     - The cards sit in columns on the right, each joined to its place by a line and a matching number, so no card covers a place.
   - Only the dropdown can search several places at once.
3. **No separate hover-card switch.** Everything you tick in Perspectives shows in the hover card automatically. The "On the map" heading on the card is gone.
4. **A larger Perspectives panel**, lettered like the ATLAS name in the top left.
5. **The key can be closed** with its ×. A small **Key** button (bottom left) brings it back. It can still be dragged by its grip.
6. **One full page at a time.** Opening Export from the comparison page now replaces the comparison page instead of opening behind it. The export page has **← Back to comparison**.
7. **No table on the map when you select areas.** A small white round button with a chart icon appears at the bottom right, showing how many areas are selected. Click it to open the comparison page (the same as Compare places and metrics).

## Ruben's 0.3.1

Atlas 0.3.1 was the first clean-up of Mo's Atlas 1.3: bug fixes and interface changes, with no new features apart from Westminster constituencies.

## Open it

Double-click `index.html`. Paste your MapTiler key, or press **Continue without basemap**.

## What changed in 0.3.1 (from 1.3)

1. **Colour grid bug fixed.** A metric set to "colour grid" used to vanish whenever the other metric was set to anything except lightness, or when a category such as council control was filling the map. Now:
   - A colour grid always gets a second rate for its other axis, borrowed from the layers already on the map when possible.
   - A category on the map becomes a centre marker instead of hiding the grid.
   - If there is no second rate, the metric is shown as lightness, and **Why this view?** says so.
   No metric is ever listed as "on the map" without being drawn.
2. **Boundaries are chosen in the Areas menu, not by zooming.** The Nations / Regions / Councils / Wards buttons along the top have gone. Open **Areas ▾** (next to the search box) and tick the boundary sets you want:
   - The map does not move when you tick one.
   - The set ticked most recently takes the colours, hover cards and clicks (marked "colours & hover"). Other ticked sets show as outlines; click a set's name to make it the one with colours.
   - **Automatic** brings back the old behaviour, where the boundaries follow the zoom.
   - The Areas button shows which set is active.
3. **Search several places at once.** (Replaced in 0.3.2 by tickboxes in the dropdown.)
4. **The key and the time bar can be dragged.** Drag them by their dotted grip. Double-click the grip to put them back. Their positions are remembered.
5. **The Perspectives panel folds away.** Click its heading to fold or unfold it. It folds itself, smoothly, after 15 seconds untouched (not while the pointer is over it). When it folds, the key moves down into the space.
6. **Perspectives are now text with categories.**
   - Click a perspective name (Political, Economic…) to drop down its categories, e.g. *Government & control*, *Protests (test case)*.
   - Click a category for a checklist of its metrics. Tick a box to put that metric on the map (and in the hover card).
   - Names and categories stay grey until something in them is ticked, then they take the perspective's colour.
   - De facto ruler and Party / alignment are text, so their boxes put them in the hover card instead.
7. **Westminster constituencies** (650, July 2024 boundaries) are a boundary set in the Areas menu and a list in the area browser. Each one has:

   | Field | Value | Source |
   |---|---|---|
   | De facto ruler | the sitting MP | UK Parliament Members API, October 2026 |
   | Party / alignment | the MP's party | UK Parliament Members API, October 2026 |
   | Population and average age | England and Wales | ONS (Office for National Statistics) mid-2024 small-area estimates via Nomis |
   | Area | in km² | worked out from the boundaries |

   - Council control and council leader's party show **the MP's party** for constituencies (the key says so).
   - Protests are counted per constituency.
   - GDP is not published for constituencies.
   - Scottish and Northern Irish population figures are not loaded yet.
   - Earlier MPs are not loaded, so dates before the current MP's election show "Earlier MPs not loaded yet".
8. **The help line under the top bar is gone.**
9. **Lasso replaces Snip** in the toolbox. Draw any shape and every area whose centre falls inside it is selected. Shift-drag and the Select tool still draw boxes. **Copy view** still saves a picture of the map.

Smaller fixes:
- Long legend labels now wrap instead of being cut off.
- The map credits fold into the ⓘ button, so they no longer sit under the time bar.
- Hover cards no longer cover the time bar.

## Several metrics on the map at once

Tick as many metrics as you like. The engine (`engine.js`) gives each metric its own visual channel:

| What the metric is | How it is shown |
|---|---|
| A category | Fill colour |
| A rate, with a category already filling | Lightness of that colour |
| A rate, with no category | Light-to-dark fill |
| Two rates | One colour grid (bivariate, 3×3 or 4×4) |
| A value with a meaningful middle | Two-sided colour |
| A second category | Marker at the centre of each area |
| A further number | Dots (bigger = higher) |
| A total | Circles, area = value |
| Dated events | Points that appear and fade, or a heat surface |

- **Why this view?** at the bottom of the key explains every choice.
- Each layer's **Show as** menu overrides the engine.
- Click a key square to show only those areas; Esc shows everything.

## Data over time

| Metric | Years | Source |
|---|---|---|
| Council control, leaders, governing party | 1974–today | Wikipedia; government history compiled by hand |
| GDP, GDP per head, real GDP growth | 1998–2024 | ONS regional GDP, local authorities |
| Population, density, 10-year change | 1998–2025 | ONS mid-year estimates |
| Protests | 1974–today | Wikipedia and Wikidata (optionally ACLED (Armed Conflict Location & Event Data)) |
| Average age | latest only | ONS mid-2025 |
| Constituency MPs | current only | UK Parliament Members API |
| Constituency population and age | mid-2024 | ONS via Nomis (England and Wales) |

## Toolbox (top right)

| Tool | What it does |
|---|---|
| Select | Drag a box to select areas |
| Lasso | Draw any shape to select the areas whose centre is inside it |
| Measure | Click points for distance; three or more points also give area and perimeter |
| Copy view | Copies a picture of the map |
| Grid lines | Latitude/longitude, or km squares |

There are also five 0–1 sliders: zoom sensitivity, cursor sensitivity, contrast, overlay strength and focus softening.

## Export (ATLAS menu → Export a table)

Pick metrics, places (your selection, the UK, nations, regions, councils, constituencies or wards) and dates, then choose Excel (.xlsx) or CSV.

## Rebuilding the data

```
python3 pipeline/fetch_politics.py         # council control and leaders from Wikipedia
python3 pipeline/fetch_protests.py         # protests from Wikipedia and Wikidata
python3 pipeline/build.py                  # everything in data/ (runs build_politics, build_series, build_protests)
python3 pipeline/build_constituencies.py   # data/constituencies*.js: 2024 seats, plus the 2010 and 1997 sets and every seat's MP history
python3 pipeline/fetch_extra.py           # health, housing and debt sources -> pipeline/sources/extra_raw/ (about 120 MB, not committed)
python3 pipeline/build_extra.py           # data/extra.js and data/extra_wards.js (needs: pip install python-calamine)
python3 pipeline/convert_old_constituencies.py <unzipped folder>   # one-off: ONS 2001/2005 shapefiles -> geometry/constituencies_1997.geojson (needs pyshp, pyproj)

# 1.7: elections, referendums, council tax, councils, representation, ideology, hex maps
python3 pipeline/fetch_elections.py        # Library election database; checks the CBP-8647 spreadsheet (download it in a browser: the Library blocks scripts)
python3 pipeline/fetch_politics17.py       # EU referendum, ONS code history, Hanretty, CHES, hex maps, Band D (3 nations), CPIH, Open Council Data, ONS electorate, Nomis
python3 pipeline/build_politics.py         # adds government_coalitions.csv to data/politics.js
python3 pipeline/clean_elections.py        # -> sources/westminster_results.csv (fails if any seat doesn't join)
python3 pipeline/clean_referendums.py      # -> sources/referendum_eu2016.csv, referendum_eu2016_pcon2010.csv
python3 pipeline/clean_ches.py             # -> sources/ches_uk_lrgen.csv
python3 pipeline/build_elections.py        # -> data/elections.js
python3 pipeline/clean_counciltax.py       # -> sources/council_tax_band_d.csv, cpih_april.csv
python3 pipeline/clean_councils.py         # -> sources/council_composition.csv
python3 pipeline/clean_representation.py   # -> sources/registration_pcon2024.csv
python3 pipeline/build_local.py            # -> data/local.js
python3 pipeline/build_hexmap.py           # -> data/hex_constituencies.js
python3 pipeline/validate_politics.py      # -> pipeline/reports/validation_politics.md
python3 pipeline/manifest.py               # re-hash every downloaded file against MANIFEST.csv
```

Large downloads go in `pipeline/sources/raw/`, which git ignores; the fetch scripts get them again. The coverage table in the validation report comes from the app itself: open `index.html?debug` and paste `pipeline/coverage_snippet.js` into the browser console.

The constituency sources are in `pipeline/geometry/constituencies.geojson` (ONS Open Geography Portal, PCON July 2024 BGC), `pipeline/sources/constituency_mps.csv` and `pipeline/sources/constituency_population_mid2024.csv`.

## Files

```
index.html, app.js, config.js   the page, its behaviour and settings
psephology.js                    election calculations as a plug-in (1.7): ENP, Pedersen, Butler, Steed, Gallagher, wasted votes, Dalton
charts.js                        charts and story views (Mo's 1.4); interactive tooltips, scatter, histogram, heat map, effect and profile charts (1.6)
stats.js                         statistics for Analyse (1.6): correlations with p-values, regression, partial correlation, PCA, k-means, Moran's I, lags
engine.js                        decides calculations and visual encodings for each kind of data
xlsx.js                          writes Excel files in the browser
data/                            generated: uk-data.js, uk-geo.js, politics.js, series.js, protests.js, constituencies.js, markets.js, extra.js, extra_wards.js, wards/, os-style.js, edits.js
pipeline/                        fetch_*.py, build*.py, import_acled.py, xlsx_read.py, sources/, geometry/
```

## Credits

Contains OS data © Crown copyright and database right 2026. © OpenStreetMap contributors. Tiles and imagery © MapTiler. ONS data and boundaries: Open Government Licence v3.0. Contains Parliamentary information licensed under the Open Parliament Licence v3.0. Health indicators: Office for Health Improvement and Disparities (Fingertips), Open Government Licence v3.0. House prices: HM Land Registry data © Crown copyright and database right 2026, Open Government Licence v3.0 (UK HPI includes Registers of Scotland and Land & Property Services Northern Ireland data). Census 2021, rents, affordability, public sector finances: ONS, Open Government Licence v3.0. Dwelling stock and council finance: MHCLG, Open Government Licence v3.0. Political and protest information: Wikipedia (CC BY-SA 4.0) and Wikidata (CC0). Map engine: MapLibre GL JS.
