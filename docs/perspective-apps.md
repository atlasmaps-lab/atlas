# Perspective apps (Atlas 1.8)

Atlas Multi (all perspectives together) stays the default. Any perspective can also open as its own app in its own tab: **Open as Atlas Markets ↗** in the perspective's header in the Perspectives panel, or **ATLAS menu → Apps**. The address is shareable: `index.html#app=markets`, `#app=politics`, `#app=economic`, `#app=social`.

## How it works

- **One core, no copies.** An app is the same page: the same map engine, boundaries, time bar, cards, charts, Compare, Analyse and Workspace. The only differences are which metrics the Perspectives panel offers, the colour accent, the default layout, and the app's own panels and tools.
- **A small registry.** Each app is a view in its own folder, `views/<id>/view.js`, that registers itself (the folders and their files are listed in `views/views.js`; see CONTRIBUTING.md, "Views"):

  ```js
  AtlasApps.register({
    id: "markets", name: "Atlas Markets", perspective: "markets", accent: "#a07a12",
    dataNeeds: ["ATLAS_MARKETS", "ATLAS_EXTRA"],       // what has to be loaded; if missing, the app is "Not available yet"
    panels: [{ id, title, render(ctx) }],               // its own windows (opened from the app bar)
    tools: [{ id, title, render(ctx) }],                // calculators and other tools
    cards: { company: render },                          // extra card types
    init(ctx) { ... },                                   // default layout: what's on the map, which boundaries, the date
  });
  ```

  `ctx` is the only door into the core: the metrics, the places, the time-bar date, `openWindow` (the window manager), charts, the workspace, and the map. Apps never reach into `app.js` directly.
- **Rule (also in CONTRIBUTING.md):** a fix that every view needs goes in the core and reaches Multi and every app. A feature only one app needs stays in its folder in `views/`.
- An app whose perspective has no data (Health had none before 1.7's extra data; Transport still has none) shows as **Not available yet**, following the Phase 2 rule.

## Atlas Markets

**Users:** someone in finance or a student of it: an analyst checking a sector, a reporter looking up a company, a planner asking where listed companies sit.

**Questions:** How is the FTSE 100 doing? Which sectors rose or fell? Where are the head offices, and what's each council's or district's share of market value? What is a company worth on a few simple models, and how sensitive is that to the assumptions?

| Tool | Data needed | Available? |
|---|---|---|
| Market overview: FTSE 100 level and change, sector heat map, risers and fallers | Index level and constituent prices, end of day | **Not available** in the public site: no lawful free source found (see "Prices" below). Works on your own computer with the local price file |
| Map of head offices and financial districts | Head office addresses (hand table), districts | Yes (as in 1.4) |
| Company cards: price chart, market value, revenue, employees, sector, head office | Prices; market value; fundamentals | Sector, head office, employees, founded: yes. Prices, market value, ratios: Not available publicly |
| Key ratios (P/E, EV/EBITDA, dividend yield, net debt/EBITDA) | Prices plus audited accounts | Not available (each ratio has an ⓘ formula; values appear when data exists) |
| Watchlist and screener (sector, location, size, performance) | Company table | Sector and location: yes. Size and performance need market values and prices |
| Valuation tools: DCF (FCFF, WACC, Gordon growth or exit multiple, WACC × growth table), trading comparables (football field), dividend discount model, returns (CAGR, total return, volatility, max drawdown, beta) | Your own inputs | **Yes**: calculators with labelled inputs, formulas behind ⓘ, "illustrative, not investment advice". Pre-filled only where real data exists |
| Places and markets: head offices by council and district | Head offices | Yes (counts). Market value by place needs market values |

**Prices: the licence decision.** Atlas is a static site on GitHub Pages, so anything in the browser is public, including an API key. The plan in the brief: a scheduled GitHub Action fetches end-of-day or delayed prices into a JSON file in the repository, with the provider's key kept as a GitHub secret, and the app shows "Prices as of <date>, delayed".
- **Yahoo Finance** (used locally since 1.4) is not lawful to republish: Yahoo's API terms forbid sharing or sublicensing the output without written permission, and its prices come from exchanges and vendors under their own redistribution terms. The public build already leaves Yahoo prices out (`pipeline/sources/markets_ftse100.full.json` is git-ignored); 1.8 keeps it that way and records the decision in `pipeline/sources/MANIFEST.csv`.
- **Real-time LSE data** is licensed by the London Stock Exchange and can't be redistributed free.
- **Free end-of-day APIs** with keys (Alpha Vantage, Twelve Data, Marketstack and similar) all restrict redistribution on their free tiers. None found allows showing prices on a public website without a paid display licence.
- So the Action and the reader are built (`.github/workflows/prices.yml`, `pipeline/fetch_prices.py`, `data/prices.json`) but **switched off**: they need a provider whose licence allows public display, chosen by you. Until then, prices are "Not available" in the public app, never scraped.

**Fundamentals:** Companies House (free API with your own key; company accounts filed as iXBRL) is the lawful official source for UK companies' revenue, profit and employees. Not added this round: it needs a key, and parsing iXBRL accounts is a project of its own.

## Atlas Politics

**Users:** students of politics, journalists, campaigners. **Questions:** Who won where, by how much, and how has a seat changed since 1997? What happens to seats if national shares move? How have councils changed hands?

| Tool | Data | Available? |
|---|---|---|
| Election view: hex map by default, seat-count bar, results table by nation, region and party | 1.7 Westminster results | Yes |
| Swingometer (uniform national swing) with projected seats on the hex map | 2024 results | Yes; says plainly that uniform swing is a simple model |
| Seat explorer: a seat's results, MPs, majority and swing, 1997–2024 | Results, MPs, notional results | Yes, within each boundary set (with notional results across reviews, marked estimated) |
| Councils: composition over time (stacked area), control timeline, Band D | Open Council Data, control history, council tax | Yes |
| Referendums: EU 2016 and constituency estimates (flagged) | Electoral Commission, Hanretty | Yes |
| Protests: the list and cards | Phase 3 protests | Yes |
| Devolved and mayoral elections | — | Not available yet (not loaded in 1.7) |

## Atlas Economic (light)

**Users:** local economists, councils, students. **Questions:** How big is this place's economy, per head, and how fast has it grown? Where does it rank? Is growth from more people or more output per person?

- **Built:** a place dashboard (GDP, GDP per head, real growth, population; sparklines since 1998), rankings for the boundary set on the map, and a growth decomposition (growth in GDP = growth in population + growth in GDP per head, approximately, using logs).
- **Not available yet:** GDHI (household income) is not loaded; employment, earnings and productivity per hour are not loaded.

## Atlas Social (light)

**Users:** planners, health and housing researchers. **Questions:** How many people live here, how fast is it changing, how dense is it, and how old?

- **Built:** population and change over time, density, average age, and a population-change ranking.
- **Not available yet:** a population pyramid needs age bands by place; Atlas has only the average age (no age bands are loaded), so the pyramid is marked "Not available yet".
