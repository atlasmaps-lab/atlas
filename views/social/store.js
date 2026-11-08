/* Atlas Social (0.8) · the data layer. One interface, two back ends:
 *   LocalStore     this browser only (IndexedDB), with demo content so the app can be used and tested now
 *   SupabaseStore  the same methods against a Supabase project (accounts, shared posts, storage for photos and video):
 *                  a stub until the launch checklist (docs/social-launch-checklist.md) is done; see docs/social-backend.md
 * Everything the app does goes through AtlasSocialStore.* so switching back end is one line (BACKEND below).
 */
(function () {
  "use strict";
  const BACKEND = "local";   // "supabase" once docs/social-launch-checklist.md is done and config.js has the project's URL and public key
  const DB = "atlas-social-08", VER = 1;
  let db = null, S = null;   // S: the whole state (small JSON); media blobs are kept separately
  const now = () => Date.now(), uid = p => p + "-" + Math.random().toString(36).slice(2, 10);

  function idb() {
    if (db) return Promise.resolve(db);
    return new Promise((res, rej) => { const r = indexedDB.open(DB, VER); r.onupgradeneeded = () => { r.result.createObjectStore("kv"); r.result.createObjectStore("media"); }; r.onsuccess = () => { db = r.result; res(db); }; r.onerror = () => rej(r.error); });
  }
  const tx = (store, mode, fn) => idb().then(d => new Promise((res, rej) => { const t = d.transaction(store, mode), s = t.objectStore(store), out = fn(s); t.oncomplete = () => res(out instanceof IDBRequest ? out.result : out); t.onerror = () => rej(t.error); }));
  const save = () => tx("kv", "readwrite", s => s.put(S, "state"));

  // ---------- demo content: clearly marked, never mixed with a person's own posts ----------
  const CITIES = [["London", -0.118, 51.509, 9], ["Manchester", -2.242, 53.48, 4], ["Birmingham", -1.898, 52.479, 4], ["Leeds", -1.548, 53.8, 3], ["Glasgow", -4.252, 55.861, 3], ["Edinburgh", -3.188, 55.953, 3],
    ["Bristol", -2.597, 51.454, 3], ["Cardiff", -3.179, 51.481, 2], ["Belfast", -5.93, 54.597, 2], ["Newcastle", -1.614, 54.978, 2], ["Liverpool", -2.983, 53.408, 3], ["Brighton", -0.137, 50.822, 2], ["Sheffield", -1.47, 53.381, 2], ["Nottingham", -1.15, 52.954, 2]];
  const USERS = [["u-demo-1", "Priya", "priya_walks"], ["u-demo-2", "Tom", "tomcycles"], ["u-demo-3", "Aisha", "aisha.eats"], ["u-demo-4", "Callum", "callum_g"], ["u-demo-5", "Megan", "megsmarkets"], ["u-demo-6", "Dev", "devonfoot"], ["u-demo-7", "Sian", "sian_cymru"], ["u-demo-8", "Ollie", "ollie.music"]];
  const POSTS = ["Farmers' market is busy this morning, great bread stall by the entrance", "Roadworks on the high street, buses diverted for the next two weeks", "Sunset over the river tonight was something else", "New mural going up on the old warehouse wall",
    "Queue for the food hall is out the door, worth it though", "Park run done, lovely crowd today", "Library has a free coding club for kids on Saturdays", "Street festival setting up, stages by the square",
    "Flooding on the towpath after the rain, take the upper path", "Café on the corner has reopened under new owners", "Crowds heading to the match, trams rammed", "Quiet Sunday, the square is empty for once"];
  const EVENTS = [["Night market", "Street food, makers and live music", "Food & markets"], ["Community clean-up", "Bring gloves; bags provided", "Community"], ["Open-air cinema", "Classic film on the green, bring a blanket", "Culture"],
    ["5k fun run", "All paces welcome", "Sport"], ["Jazz in the park", "Free, family friendly", "Music"], ["Repair café", "Fix your electricals and clothes with volunteers", "Community"], ["Late-night gallery opening", "Over 18s, bar open", "Culture", true]];
  const LISTINGS = [["Hybrid bike, 54 cm frame", "Bikes", 180, 0, "good"], ["Two-seater sofa, grey", "Home", 120, 25, "used"], ["Textbooks: A-level chemistry", "Books", 15, 3.5, "good"], ["Desk lamp", "Home", 12, 0, "like new"],
    ["Toddler's scooter", "Kids", 20, 0, "used"], ["Acoustic guitar with case", "Music", 95, 0, "good"], ["Garden table and 4 chairs", "Garden", 150, 0, "used"], ["Winter coat, size M", "Clothes", 35, 3.2, "like new"],
    ["Handmade ceramic mugs (set of 4)", "Crafts", 40, 4.5, "new", true], ["Office chair", "Home", 45, 0, "used"]];
  function seed() {
    const t = now(), rnd = mulberry(8); const jit = (x, k) => x + (rnd() - 0.5) * k;
    const st = { v: 1, me: null, posts: [], events: [], listings: [], threads: [], reports: [], blocks: [], follows: ["u-demo-1", "u-demo-5"], users: {}, checkins: [], demo: true };
    USERS.forEach(([id, n, h]) => { st.users[id] = { id, name: n, handle: h, demo: true, adult: true }; });
    let k = 0;
    CITIES.forEach(([city, x, y, w]) => {
      for (let i = 0; i < w; i++) { const u = USERS[(k++) % USERS.length]; st.posts.push({ id: uid("p"), by: u[0], text: POSTS[(k * 7) % POSTS.length], at: t - Math.floor(rnd() * 46) * 3600e3, lon: +jit(x, 0.05).toFixed(3), lat: +jit(y, 0.03).toFixed(3), precise: false, place: city, likes: Math.floor(rnd() * 40), comments: [], demo: true }); }
      if (w >= 2) { const e = EVENTS[k % EVENTS.length]; st.events.push({ id: uid("e"), by: USERS[k % USERS.length][0], title: e[0] + ", " + city, text: e[1], cat: e[2], adult: !!e[3], start: t + (1 + Math.floor(rnd() * 12)) * 86400e3, lon: +jit(x, 0.03).toFixed(3), lat: +jit(y, 0.02).toFixed(3), place: city, going: Math.floor(rnd() * 120), demo: true }); }
      for (let i = 0; i < Math.max(1, w - 1); i++) { const L = LISTINGS[(k * 3 + i) % LISTINGS.length]; st.listings.push({ id: uid("l"), by: USERS[(k + i) % USERS.length][0], title: L[0], cat: L[1], price: L[2], delivery: L[3], cond: L[4], trader: !!L[5], trading: L[5] ? { name: "Kiln & Co (demo)", address: city } : null, at: t - Math.floor(rnd() * 120) * 3600e3, lon: +jit(x, 0.05).toFixed(3), lat: +jit(y, 0.03).toFixed(3), place: city, sold: false, demo: true }); }
      // check-ins for the activity layer: busy centres, quieter edges (demo)
      const n = 60 * w; for (let i = 0; i < n; i++) st.checkins.push([+jit(x, 0.04 * (rnd() < 0.7 ? 0.4 : 2)).toFixed(4), +jit(y, 0.025 * (rnd() < 0.7 ? 0.4 : 2)).toFixed(4), t - Math.floor(rnd() * 6 * 3600e3)]);
    });
    return st;
  }
  function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  // ---------- the interface ----------
  const LocalStore = {
    name: "This browser only (demo)",
    async load() { if (S) return S; try { S = await tx("kv", "readonly", s => s.get("state")); } catch (e) { S = null; } if (!S || !S.posts) { S = seed(); try { await save(); } catch (e) {} } return S; },
    async reset() { S = seed(); await save(); return S; },
    get state() { return S; },
    me: () => S && S.me,
    async setProfile(p) { S.me = Object.assign(S.me || { id: uid("u"), joined: now() }, p); S.users[S.me.id] = Object.assign({}, S.me, { home: undefined }); await save(); return S.me; },
    async putMedia(blob) { const id = uid("m"); await tx("media", "readwrite", s => s.put(blob, id)); return id; },
    async getMedia(id) { return tx("media", "readonly", s => s.get(id)); },
    async add(kind, obj) { obj.id = obj.id || uid(kind[0]); obj.at = obj.at || now(); obj.by = obj.by || (S.me && S.me.id); S[kind].unshift(obj); await save(); return obj; },
    async update(kind, id, patch) { const o = S[kind].find(x => x.id === id); if (o) Object.assign(o, patch); await save(); return o; },
    async remove(kind, id) { S[kind] = S[kind].filter(x => x.id !== id); await save(); },
    async report(r) { S.reports.unshift(Object.assign({ id: uid("r"), at: now(), by: S.me && S.me.id, status: "open" }, r)); await save(); },
    async block(userId) { if (!S.blocks.includes(userId)) S.blocks.push(userId); await save(); },
    async follow(userId, on) { S.follows = S.follows.filter(x => x !== userId); if (on) S.follows.push(userId); await save(); },
    async checkin(lon, lat) { S.checkins.push([+lon.toFixed(4), +lat.toFixed(4), now()]); await save(); },
    async send(threadId, text, meta) {
      let t = S.threads.find(x => x.id === threadId);
      if (!t) { t = Object.assign({ id: threadId || uid("t"), msgs: [], at: now() }, meta); S.threads.unshift(t); }
      t.msgs.push({ by: S.me.id, text, at: now() }); t.at = now(); await save(); return t;
    },
  };
  const SupabaseStore = {   // the same methods against Supabase (see docs/social-backend.md): not switched on until launch
    name: "Supabase (not connected)",
    async load() { throw new Error("The shared back end isn't connected yet: see docs/social-backend.md and docs/social-launch-checklist.md."); },
  };
  window.AtlasSocialStore = BACKEND === "supabase" ? SupabaseStore : LocalStore;
})();
