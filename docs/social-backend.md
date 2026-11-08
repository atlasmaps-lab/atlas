# Atlas Social: connecting a shared back end (Supabase)

Atlas Social talks to its data only through `window.AtlasSocialStore` (`views/social/store.js`). Today that is `LocalStore`, which keeps everything in one browser using IndexedDB. To make posts shared between people, implement `SupabaseStore` with the same methods and switch `BACKEND` to `"supabase"`. **Only do this once the launch checklist (`docs/social-launch-checklist.md`) is complete.**

## Methods to implement
| Method | What it does |
|---|---|
| `load()` | Signs in (Supabase Auth) and loads the user's profile, follows, blocks and threads. Feeds are fetched by map bounds as needed. |
| `me()`, `setProfile(p)` | The signed-in person's profile |
| `add(kind, obj)`, `update(kind, id, patch)`, `remove(kind, id)` | `kind` is `posts`, `events` or `listings` |
| `putMedia(blob)`, `getMedia(id)` | Supabase Storage, in a private bucket with signed URLs. Strip video metadata on the server. |
| `report(r)`, `block(userId)`, `follow(userId, on)` | Safety and social graph |
| `checkin(lon, lat)` | Writes to a table that only a scheduled function reads. It aggregates to ~500 m cells and publishes cells with at least 10 check-ins. Raw check-ins are deleted after 24 hours. |
| `send(threadId, text, meta)` | Messages. Under-18 accounts can only receive from people they follow (enforce in row-level security, not just the app). |

## Schema (SQL)
```sql
create table profiles (id uuid primary key references auth.users, name text not null, handle text unique not null, adult boolean not null default false, age_checked_at timestamptz, created_at timestamptz default now());
create table posts (id uuid primary key default gen_random_uuid(), by uuid references profiles, text text, media text, mtype text, lon double precision, lat double precision, precise boolean default false, place text, hidden boolean default false, at timestamptz default now());
create table events (id uuid primary key default gen_random_uuid(), by uuid references profiles, title text not null, text text, cat text, adult boolean default false, start timestamptz not null, lon double precision, lat double precision, place text, hidden boolean default false, at timestamptz default now());
create table listings (id uuid primary key default gen_random_uuid(), by uuid references profiles, title text not null, text text, cat text, cond text, price numeric not null, delivery numeric default 0, trader boolean default false, trading jsonb, lon double precision, lat double precision, place text, sold boolean default false, sold_at timestamptz, hidden boolean default false, at timestamptz default now());
create table threads (id uuid primary key default gen_random_uuid(), listing uuid references listings, a uuid references profiles, b uuid references profiles, at timestamptz default now());
create table messages (id bigserial primary key, thread uuid references threads, by uuid references profiles, text text not null, at timestamptz default now());
create table reports (id uuid primary key default gen_random_uuid(), by uuid references profiles, kind text, target uuid, reason text, status text default 'open', decided_by uuid, at timestamptz default now());
create table blocks (by uuid references profiles, who uuid references profiles, primary key (by, who));
create table follows (by uuid references profiles, who uuid references profiles, primary key (by, who));
create table checkins (lon double precision, lat double precision, at timestamptz default now());   -- read only by the aggregation function
create table activity (cell text primary key, lon double precision, lat double precision, n int, window_end timestamptz);  -- public, n >= 10 only
```
Row-level security needs four rules:
- Everyone can read posts, events and listings that aren't hidden.
- Only the author can change or delete their own.
- Under-18 accounts can't read `adult` events.
- Messages are readable only by the two people in the thread, and a thread with an under-18 account needs a follow.

Put the project URL and the **public (anon) key** in `config.js`. Never put the service key in the browser.
