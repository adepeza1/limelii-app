# World Cup Banner — Xano Setup Guide

Powers the **World Cup** banner on Discover. You upload each day's matches; the
banner shows whatever's playing **today** and swaps to the next day's set
automatically. World Cup experiences live **only** in the banner on their day —
they never appear in the normal Discover feed, and once their day passes they're
gone everywhere.

The app side is already built and is agnostic to your storage details:

- BFF route: `src/app/api/world-cup/featured/route.ts` → proxies `GET /world-cup/featured`
- Banner: `src/components/world-cup-banner.tsx`, pinned at the top of the Discover feed

---

## The whole idea in one field

A World Cup experience is just a normal 4-stop experience with one extra field:
**`match_date`**. That single field does all the work.

| Field | Type | Drives |
|-------|------|--------|
| `match_date` | text `YYYY-MM-DD` (or `date`) | which day it shows in the banner |

| Behavior | How |
|----------|-----|
| Shows in banner today | banner returns rows where `match_date == today` (NY date) |
| Several games one day | several rows share the same `match_date` → several cards |
| Swaps next day | "today" rolls forward, yesterday's rows stop matching |
| Never in the normal feed | the `/discovery` query **excludes** rows where `match_date` is set |
| Gone after its day | excluded from feed + no longer in banner = unreachable |

The 4 locations still resolve to real, reusable **places** — those persist and
can be reused in future (non–World Cup) experiences. Only the experience itself
is World Cup-specific and ephemeral.

Optional extras (just for the banner card subtitle):

| Field | Type | Example |
|-------|------|---------|
| `headline` | text | `Spain vs Saudi Arabia` (falls back to the experience title) |
| `kickoff_local` | text | `3:00 PM ET` |
| `venue` | text | `MetLife Stadium` |

---

## Step 1 — Add the fields to `experiences`

Add to your existing `experiences` table:

- `match_date` (text `YYYY-MM-DD`, nullable) — **null for normal experiences**,
  set for World Cup ones.
- `headline`, `kickoff_local`, `venue` (text, nullable) — optional.

No new table.

---

## Step 2 — Exclude World Cup experiences from the normal feed

In your existing `GET /discovery` function stack, add a filter so any experience
with a non-null `match_date` is left out:

```
where match_date == null   (i.e. only normal experiences appear in the feed)
```

This is the one change that keeps World Cup experiences out of the general feed
and search — they should only ever surface through the banner.

---

## Step 3 — Create the banner endpoint

`GET /world-cup/featured` — **public** (Discover is public).

**Function stack:**
1. Compute today's date in **`America/New_York`** → `today` (text `YYYY-MM-DD`).
   Use the NY timezone explicitly; don't rely on the server default. This is why
   every user sees the same correct day regardless of their device clock.
2. `Get All Records` from `experiences` where `match_date == today`
   (optionally sort by `kickoff_local` or an order field) → `rows`.
3. `Return`:

```json
{
  "date": "2026-06-21",
  "matches": [
    {
      "experience_id": 142,
      "headline": "Spain vs Saudi Arabia",
      "kickoff_local": "3:00 PM ET",
      "venue": "MetLife Stadium",
      "experience": { /* the full experience record, same shape as /experiences/{id} */ }
    }
  ]
}
```

On an off day, `rows` is empty → return `{ "date": today, "matches": [] }` and
the banner hides itself. When the tournament ends you simply stop uploading
dated experiences — nothing to turn off.

> The embedded `experience` must match the shape `GET /experiences/{id}` returns
> (needs `id`, `title`, and `places_id[]` with `display_images` / `images` so the
> banner can show a thumbnail). Easiest: reuse that same response builder.

---

## Step 4 — Upload each day's matches

The sheet is now **one row per stop** (see `worldcup_experiences_seed.csv`):

```
itinerary_name, match_date, kickoff_local, sort_order, team, location, stop_type
```

| Column | Purpose |
|--------|---------|
| `itinerary_name` | groups rows into one experience ("Belgium vs Iran") |
| `match_date` | the day it shows in the banner (`YYYY-MM-DD`, NY) |
| `kickoff_local` | banner subtitle (`3:00 PM`) |
| `sort_order` | order the matches appear in the banner that day |
| `team` | which side this stop belongs to (`Belgium`) |
| `location` | the place name to resolve |
| `stop_type` | `pre_game` \| `watch` \| `afters` |

Rows that share an `itinerary_name` + `match_date` make up one experience; the
**stop order is the row order**. A team can have any number of stops (just a
`watch`, or `pre_game`→`watch`, or `watch`→`afters`, etc.).

### The per-stop fields the app needs back

The detail view labels each stop from two values:

- **`team`** — drives the flag + team-name badge.
- **`stop_type`** — drives the label at the top of the stop:
  `pre_game` → **Pregame**, `watch` → **Watch here**, `afters` → **Afters**.

`places_id` is a plain list of place ids (no per-stop join row), and the same
venue can appear twice in one match (e.g. Smithfield Hall for both teams), so
this metadata is stored in a separate **`stops`** JSON field on `experiences`,
in carousel order, keyed by place id:

```json
"stops": [
  { "place_id": 812, "team": "Belgium", "stop_type": "pre_game" },
  { "place_id": 540, "team": "Belgium", "stop_type": "watch" },
  { "place_id": 318, "team": "Iran",    "stop_type": "pre_game" },
  { "place_id": 540, "team": "Iran",    "stop_type": "watch" }
]
```

The app reads `experience.stops`, looks each place up by `place_id`, and renders
them in order — so duplicates stay distinct and a stop whose place has no photos
drops out cleanly. `stops` is a native field, so `GET /experiences/{id}` returns
it automatically (no addon needed). If it's absent the app still renders — it
falls back to the old positional guess (first half of stops = Team A /
"Watch here", second half = Team B / "Afters").

You can:
- upload **today's** matches each morning, **or**
- pre-load a few days at once — each row carries its own `match_date`, so they
  light up on the right day and stay hidden until then.

You never need the full tournament up front. Add knockout-round matches the day
the matchup is known.

---

## Step 5 — Test

In **Run & Debug** for `GET /world-cup/featured`: set a row's `match_date` to
today's NY date and confirm it comes back with its embedded `experience`;
confirm an empty result on a date with no rows. Then confirm those same
experiences do **not** appear in `GET /discovery`. Open Discover in the app —
the banner shows today's matches and is absent on off days.
