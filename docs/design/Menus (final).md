# Atlas menus — FINAL (13 Nov 2026)

Canvas: https://claude.ai/artifact/4mBGsYzeabFCeF5wJ5KBPD (top board, "Round 4").
Source: `project/Contents2.dc.html` (light/dark wrappers `Contents2Light/Dark.dc.html`).

## Bar
- Brand, then the app's headings regrouped (Markets: Trade · Investment · Markets & companies · Political money).
- Toolbox button on the right. The Toolbox holds Calculator (DCF, comparables, dividend discount, returns), Marketplace (buy and sell between people near you, Atlas Social) and the time bar style picker. Full spec: `../toolbox/Toolbox (final).md`. It follows you between apps.
- Two tools stay on rows, where the data is: "Value this company" on company rows and "Compare" on place and country rows.

## A heading's dropdown (full width, under the bar)
1. **Top line:** breadcrumb (Markets | Trade), one plain-words sentence, then 4 headline figures (big number, italic label, change in green/red). Clicking a figure puts it on the map.
2. **Sections row:** one column per section (e.g. Trade: Exports by product, Imports by product, Export partners, Import partners).
   - **Closed by default:** name, row count, round arrow button.
   - **Click name or arrow → unfolds:** summary sentence, share bar (categorical palette, part of the whole; "everything else" is the track), top 5 with figures, "See all/every … ›".
   - Several can be open at once; the last opened is the selected one.
3. **Detail (only when a section is open):** kicker (Heading | Section | unit), Largest first / Smallest first / A–Z, the full ranked list in two columns (rank, name, bar, value, change), and a preview on the right: title with value, one line, next-step chips (e.g. What's in it › Top 15 › Who buys it › What moved › Where it's made), Open its card / Put it on the map / ☆ Workspace.
4. **Foot:** sources in italic, "Open the … panel ›".

## Motion
- **Cascade** on opening a heading: figures 50 ms apart, sections 80 ms + 60 ms each, rise 260 ms.
- **Bars fill in** when a section opens: share bar and list bars grow from zero, 500 ms, staggered 40–45 ms.
- **Open in place** for the section body (300 ms).
- **Row becomes the card:** an outline grows from the clicked row into the preview (420 ms), then the preview fades in (220 ms after 260 ms).
- Easing cubic-bezier(.2,.7,.2,1). Reduced motion → no animation.

## Rules carried over
PT Serif for every word; app colour (Markets gold) for controls only; green rise / red fall; categorical palette without green, red or gold; light and dark; mixed voice; thin vertical rules as separators; real figures only (gaps shown as gaps).
