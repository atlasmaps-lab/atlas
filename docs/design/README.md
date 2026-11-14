# Atlas design specs

These are the specs agreed by Mo on 13 and 14 November 2026 for Atlas 0.13. They are principles for every app, panel and card, not for one screen. Each spec was agreed as concept art first, then built.

| Spec | What it covers |
|---|---|
| `Cards (final).md` | Information cards: breadcrumb, range switch, headline, chart, figures, sections, sources; voice and colour rules |
| `Time bar (final).md` | The capsule, the expanded bar and the nine other styles |
| `Menus (final).md` | Grouped headings and their contents pages |
| `Panels (final).md` | Panels as a summary plus sections; tiles when wide |
| `Map controls (final).md` | The interactive key |
| `Workspace (final).md` | The board and its "In this project" sidebar |
| `Toolbox (final).md` | The Toolbox's sections |
| `Masthead (final).md` | Search that finds anything |
| `Compare (final).md` | Compare's four views |
| `Analyse (final).md` | Analyse: questions, answers, matrix, put on the map |
| `Help (final).md` | Help as a handbook |

**Changes since these were agreed (0.13.1, 14 Nov):**
- Atlas opens on a plain map.
- The first measure on the map fills the areas.
- The time bar's range can fit only the dates where the measures on the map have data, and several measures share the bar as rows.
- Event diamonds open their event.
- Every panel and card follows these specs, including plain panels and category measures.

See `README.md` at the top of the repo.

**Canvases:** each spec links to its claude.ai design canvas. They are private to Mo; ask Mo to share the ones you need. File paths inside the specs (`Atlas design/…`) refer to Mo's notes, not to this repository.

**Changing a design:** anything new starts as concept art and is built only when it's agreed. A tweak to an agreed design can go straight into the code. Either way, compare Atlas side by side with the design before calling it done. When a spec changes, update its file here in the same pull request.
