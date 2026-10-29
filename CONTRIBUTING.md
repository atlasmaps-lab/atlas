# Working on Atlas together

One copy of the code lives here, on GitHub. Nobody works from zips any more.

## Each time you start
1. **Pull** first (GitHub Desktop: *Fetch origin* → *Pull*), so you have the other person's latest changes.
2. Make your changes, open `index.html` to check them.
3. **Commit** with a one-line description of what changed (e.g. "Key can be closed").
4. **Push**.

## When you're both working at once
- Work on a **branch** (GitHub Desktop: *Current branch → New branch*, e.g. `mo/charts`), then open a **pull request** on GitHub to merge it into `main`. GitHub shows exactly what changed and flags clashes before they happen.
- Small, frequent commits are easier to merge than one big change at the end.

## Telling Claude
When a Claude works on Atlas, tell it the folder is a git repository and to commit its changes with a clear message. Point it at `README.md` (what Atlas does) and the latest notes in the project.

## The website
`main` is published by GitHub Pages: every push updates the live site within a minute or two.
MapTiler keys: allow the site's address (`https://<user>.github.io`) on your key at cloud.maptiler.com, or use *Continue without basemap*.

## Views: one folder each, so two people can work at once
Atlas Multi and each view (Atlas Politics, Economic, Social, Health, Markets) run on the same core: `app.js`, `windows.js`, `engine.js`, `charts.js`, `stats.js`, `index.html` and the data files. Each view has its own folder:

```
views/
  views.js          the list of views and their files (one line each)
  politics/         view.js · view.css · README.md · test_*.py · any extra files
  economic/  social/  health/  markets/
  _template/        copy this to start a new view
```

**The rule: work inside your own view's folder.** Then two people on two views never edit the same file, and their pull requests can't clash.
- `view.js` registers the view and holds its panels and tools. It talks to the core only through the `ctx` it is given, never by reaching into `app.js`.
- `view.css` holds styles for that view only. It loads only in that view's tab, so it can't change Atlas Multi or another view.
- Need another script or a data file just for your view? Put it in your folder and add it to your view's line in `views/views.js`.
- Each view's `README.md` says who owns it and what's planned. Put your name there and in `views/views.js` when you take a view.

**Branches:** name them after the person and the view, e.g. `ruben/politics-devolved-elections` or `mo/economic-gdhi`. Open a pull request for each; the "Files changed" tab should show only `views/<your view>/`.

**When you need the core to change** (a new `ctx` function, a fix every view needs, anything in `app.js`, `index.html` or `data/`):
1. Make it a **separate, small pull request** titled `core: …`, and tell the other person.
2. Merge it quickly. Then both of you pull `main` into your view branches (GitHub Desktop: *Branch → Update from main*).
3. Keep going in your view folder.

A fix every view needs goes in the core, so it reaches Multi and every view at once. A feature only one view needs stays in its folder.

**A new view:** copy `views/_template/` to `views/<id>/`, change the id and name in `view.js`, and add a line for it in `views/views.js`. See `docs/perspective-apps.md` for everything `ctx` offers.

## Tests
`tests/` has browser tests (Playwright) and screenshot scripts; see `tests/README.md`. A view's own tests go in its folder (`views/<id>/test_*.py`). Run `python tests/run_all.py` before opening a pull request: it runs both.

## Changing the design
Use the Design panel (`index.html?dev`, then ATLAS menu → Design) and save to `theme.js`, rather than editing colours across `index.html`. `theme.js` is the one file that holds design changes, so two people's design work merges in one place. Bigger structural CSS still goes in `index.html`.
