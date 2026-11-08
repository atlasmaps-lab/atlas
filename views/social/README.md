# Atlas Social

**Owner:** _(not set yet: put your name here and in `views/views.js`)_
**Opens at:** `index.html#app=social` · perspective: `social`

A social layer on the map: what's happening, where. It runs **in this browser only, with demo content**, until the launch checklist (`docs/social-launch-checklist.md`) is done. Then it switches to a shared back end (`docs/social-backend.md`).

## Panels
- **Feed:** posts near the view, around the area in focus, or from people you follow, with photos and video.
- **Post:**
  - text and a photo or video
  - pinned by area (about 1 km) by default; the exact spot only if you choose
  - photos are re-saved so their location data (EXIF) is removed; video posts are pinned by area only
  - optional anonymous check-in for the activity map
- **Events:** what's on in view; 18+ events are hidden from under-18 accounts.
- **Marketplace** (also in Atlas Markets):
  - listings with the total price and a private-or-trader flag (traders give their business name and address)
  - messaging the seller; payment happens off-platform
  - banned items blocked
  - sales counted for HMRC's platform rules
- **Messages:** under-18 accounts can only message people they follow.
- **Profile & safety:**
  - age (18+ or under 18)
  - a home privacy zone (nothing within 500 m of home shows on the map)
  - download or delete your data, and blocked people
- **Moderation** (developers only, `?dev`): reports to hide or dismiss.
- **Statistics** (kept from before): people in a place, population change, and the pyramid (not available yet).

## On the map
- Posts, events and listings appear as coloured pins, grouped when zoomed out.
- **Activity:** anonymous check-ins in about 500 m cells, shown only where at least 10 were made (k = 10).

## Files
| File | What it is |
|---|---|
| `store.js` | The data layer: `LocalStore` (IndexedDB, demo content) now, and `SupabaseStore` later, behind one interface |
| `social.js` | Panels, map layers, safety rules, banned items |
| `view.js` | Registers the view |
| `test_social.py` | Browser tests (EXIF removal, banned items, k-threshold, under-18 rules) |

Styles are in the core (`index.html`, "Atlas Social items") because the marketplace also opens in Atlas Markets.
