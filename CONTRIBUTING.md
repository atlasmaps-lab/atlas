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

## Perspective apps (Atlas 1.8)
Atlas Multi and each perspective app (`index.html#app=markets`, `#app=politics`, …) run on the same core: `app.js`, `windows.js`, `engine.js`, `charts.js`, `stats.js` and the data files.
- **A fix every view needs goes in the core**, so it reaches Multi and every app at once.
- **A feature only one app needs stays in its module** in `apps/` (e.g. the DCF calculator in `apps/markets.js`). Modules talk to the core only through the `ctx` they are given, never by reaching into `app.js`.
- A new app: copy one of the modules in `apps/`, register it with `AtlasApps.register({...})`, and add its `<script>` line to `index.html`. See `docs/perspective-apps.md`.

## Tests
`tests/` has browser tests (Playwright) and screenshot scripts; see `tests/README.md`. Run `python tests/run_all.py` before opening a pull request.
