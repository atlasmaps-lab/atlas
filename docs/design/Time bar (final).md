# Atlas time bar: final design (agreed 13 November 2026)

Concept canvas: https://claude.ai/artifact/7XV6iE7V33fu9LDJi9h6BT. Source files are in `Atlas design/timebar/project/`:
- `Main.dc.html`, the "combo" variant: the Atlas bar;
- `Art.dc.html`: the nine other styles;
- `MapDemo.dc.html`: the bar driving the map.

Not yet built into Atlas.

## The Atlas bar (the default style)

**Basic form, always shown.** A slim capsule at the bottom centre holding:
- play (gold);
- a thin track with a few year marks and a gold dot, which you drag to any month;
- the date ("Jul 2024");
- ⌃ to expand.

**Expanded form** (⌃ opens it with a smooth rise; ⌄ folds it back), top to bottom:
1. **Events line.** Small chips with ‹ › to step between them, e.g. 2016 Brexit vote, 2020 Pandemic, 2021 Single market exit, 2022 Energy price shock, Latest. Picking one jumps there, lights its diamond on the strip in gold and puts its short story in the caption. The measure's name sits at the right.
2. **Story strip.** One column per year, highest green and lowest red, the rest neutral. Drag anywhere to reach any month; a gold line and a label ("July 2024: £34.2bn") follow. Event diamonds sit on the baseline.
3. **Caption** (italic). The event's story when an event was picked; otherwise what the date means for the map ("Showing 2024…", "No figures before 2016…", "2026 so far: January to August only").
4. **Options line.** Step (1 month · 1y · 5y · 10y) | Range (data years · 1974 to today, with years lacking data hatched) | Events counted (1y · 5y · 10y · All) | Back to latest ›.

Everything is compact: chips and pills about 26 px tall, the play button 30 px.

## Styles chosen in the Toolbox
The style picker lives in the **Toolbox**, not on the bar:
- **Atlas** (default);
- **Museum frieze**;
- **Seismograph**;
- **Core sample**;
- **Date wheels**;
- **Range navigator**;
- **Filmstrip**;
- **Grand-strategy clock**;
- **Watermark** (the year huge behind the map);
- **Calendar grid**.

The astrolabe is not offered. Each option has a swatch, its name and what inspired it. The bar changes live and keeps the date. The choice is remembered for every app and the next visit.

## With the map
- The date belongs to the map: every style drives the same date, and the map fades to it.
- Each style may set the backdrop around the map. The watermark's year sits behind the map, as in Gapminder.
- Where a measure is published once a year, any month shows that year's figures, and the caption says so.

## Rules carried from the cards
- One font for every word: PT Serif, in every style.
- The app's colour for controls only. Green for the highest and red for the lowest.
- Light and dark mode.
- The mixed voice.
- Thin vertical rules as separators.
