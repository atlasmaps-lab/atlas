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
