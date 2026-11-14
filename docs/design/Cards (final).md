# Atlas cards: final design (agreed 13 November 2026)

Concept canvas: https://claude.ai/artifact/DqcvNJFwMcNji7NdhGbYF1 (the "FINAL" row at the top). Source of the final card: `canvas-files/F-Card.dc.html`. Not yet built into Atlas.

## Structure, top to bottom
1. **Where you are.** A breadcrumb trail (Markets › Exports › Machinery and transport), plus Workspace.
2. **Masthead.** ATLAS + the app name in the app's colour, over a double rule. A time-range switch sits on the right: 12 months · 5 years · 10 years, offered only where the data goes back that far.
3. **Kicker.** Topic | flow | period, with thin vertical rules between them, never dots.
4. **Headline** (newsroom voice), with a footnote superscript.
5. **Summary paragraph** (record facts with a guide gloss).
6. **Main chart.**
   - Labelled, with an italic caption that says how to read it.
   - Clicking it enlarges it smoothly, with Send to workspace and Pin to track.
7. **Three key figures.** Each answers one of the card's questions.
8. **Sections that open in place.** Each has a bold label and a one-sentence summary. When opened, it shows:
   1. a picture (a treemap, then-and-now bars, or a labelled waterfall);
   2. an italic caption on how to read it;
   3. a sort row;
   4. terminal-style rows (code, name, value, then a bar or change);
   5. "See all N …".
9. **Source and numbered footnotes.**

## The time range changes everything
The words, the figures, the chart and the section summaries all change with the range. Where detail exists only for the latest 12 months, the card says so ("Buyer detail covers the latest 12 months only…") instead of inventing history.

## Language (mixed voice, chosen per statement)
- **Lead / point of the card:** newsroom. A verb and one sharp comparison ("Jet engines earn £42bn, twice as much as cars").
- **Exact figures, periods, footnotes:** record.
- **Composition, captions, hedged causes, navigation:** guide.
- **How numbers sit in a sentence:**
  - Subject and verb first, number at the end of the clause: "Exports reached £159bn, up 5.3% on the year before."
  - Frame before figure: "Of all the goods the UK sold abroad, machinery and transport made up 38%."
  - Never point at a number. No "That is X% of…", "This was…" or "which represents…".
- **Which numbers belong:** every figure answers a question the card asks (size, share, change, concentration, gap, who, route). No novelty conversions (per person, pence in the pound).
- **Things to avoid:** "not X but Y", lists of three, tidy balanced pairs, "Worth knowing:".

## Colour rules
- **The app's colour** (Markets gold): brand, links, controls, the selected range, chevrons. Nothing else.
- **Green** = a rise, **red** = a fall (or a deficit). Used for nothing else.
- **Time series** (months or years): the highest bar green, the lowest red, the rest neutral slate. The caption names both.
- **Categories** (products, countries, ports): a varied palette (blue, orange, purple, teal, pink, slate) with no green or red. Remainders are grey.
- **Light and dark mode:** the same rules, with lighter tones in dark.

## Type
One font for every word: PT Serif. Size, weight and italic carry the hierarchy, and captions are italic. A second font anywhere is a bug.

## Lists, sorting, scrolling
- **Complete lists:** when a summary names one or two items, it ends with "See all 89 countries ›", which opens the full list. The same applies to every list in Atlas: foreign-owned UK businesses, countries where UK firms own businesses, suppliers, ports, places.
- **Sorting:** each list has its own sort (Largest or Smallest first, Rises or Falls first, A–Z). It works on the full list, and rank numbers stay attached.
- **Scrolling:** long cards scroll inside a fixed window, with an always-visible scrollbar on the right.
