# Atlas panels — FINAL direction: C Tiles (13 Nov 2026)

Canvas: https://claude.ai/artifact/2y8hyZu4mQfYabRyqF8Wjn (direction "tiles"). Source: `project/Main.dc.html` (built from `Panel.dc.html.tpl`).

## What a panel is
- A panel covers a whole category (e.g. Markets › Trade) and has every capability: it stays open over the map, redraws with place and time, moves, resizes, minimises, maximises, closes.
- Cards cover one thing; panels lead to cards. Menus are the quick look; "Open the Trade panel ›" at the foot of a menu opens the panel.

## Layout (tiles)
- Window bar: breadcrumb (MARKETS | TRADE [| section]), – ⤢ ×. A resize handle on the free edge.
- Hero tile: headline sentence, three figures (Exports, Imports, Balance in red when negative), the monthly chart with 1y / 5y / 10y.
- One tile per section of the category, each with its one-line summary and its top rows with a bar and figure. Trade's tiles: Products, Partners, What moved, Dependence, Ports, Regions (+ On the map controls).
  - Ports (12 months to Aug 2026, exports/imports £bn): London Heathrow 116.5/214.0, Dover/Eurotunnel 62.3/13.1, Dover 5.2/62.8, Immingham 21.3/46.0, Southampton 24.8/36.6, Felixstowe 6.8/40.5.
  - Regions (2024, £bn exports/imports): South East 39.6/107.3, London 38.0/75.1, West Midlands 35.3/42.8, Scotland 33.1/27.3, East of England 31.3/47.8, North West 30.8/46.2 …
- A tile grows to fill the panel (‹ All of Trade to go back): full list, sort (Largest / Smallest / A–Z), See all N.
- Every row drops down to go deeper (like the card's sections): a one-line read, exports vs imports bars, next-step chips (What's in it › Top 15 › Who buys it › What moved › Where), and Open its card / Put it on the map / ☆ Workspace.
- Picking a row picks out its route or place on the map.

## Must hold when the panel is compressed or stretched (Mo, 13 Nov)
- The chart is drawn to the width it has: axis ticks thin out (every year → every other year), the end labels (Imports / Exports / The gap) move under the chart when narrow, and high/low labels never overlap (place above/below, nudge on collision; drop the "Highest/Lowest" words when tight).
- Figures never wrap ("−£371bn" stays on one line; size steps down when narrow).
- Breakpoints: wide (≥1040 px) hero + 3 tile columns; default (≥760) hero + 2 columns; narrow (<760) one column, hero first, panel scrolls with a visible scrollbar.
- Tiles show as many rows as fit (no empty space); names use short forms in tiles (Gold and stones, Machinery, Pipeline gas …) and full names when expanded.
- Rows that share a name carry their flow: "Silver imports", "Silver exports".

## Motion (same rules as menus)
Cascade when the panel opens (tiles 60 ms apart); bars fill in when a tile shows or grows; a tile grows into place when opened; a row becomes the card when its card opens; reduced motion → none.

## Rules carried over
PT Serif only; app colour for controls; green rise, red fall; shaded deficit soft red; exports blue, imports brown; highest month green, lowest red; light and dark; mixed voice; vertical-rule separators; real figures only.
