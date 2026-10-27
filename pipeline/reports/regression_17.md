Checked by hand in the browser on 2026-10-27 (python3 -m http.server, index.html?debug, branch mo/1.7-political):

| Feature | Result |
|---|---|
| Page loads; console errors | none |
| Controlling party (default layer): key lists parties; Hartlepool card "No overall control (council control)" | works |
| Protests (default layer): UK "20 protests in the 5 years to the date" | works |
| GDP per head on the map with Controlling party (colour + lightness) | works; Hartlepool 2024 £21,114 |
| Analyse window: opens; 51 metrics listed, including the new numeric election metrics | works |
| Workspace: note added; back to the map | works |
| Export (CSV, all 650 constituencies): new status column after each metric; notional comparisons marked "estimated" | works |
| psephology.js hand-worked tests (AtlasPseph.tests) | 9 of 9 ok |
| Hex map toggle; time bar back to 1997 (1997 set loads; seats coloured by the 1997 winner) | works |

Note: in the desktop app's hidden browser pane the map style sometimes doesn't load until the pane is shown (a test-environment effect, not an app error).
