# World Cup Banner — Xano Setup Guide

This sets up the backend that powers the rotating **World Cup** banner on the
Discover page. The banner shows **today's matches** and rotates automatically
each day — no redeploys, no manual flipping. When the tournament ends (or on an
off day with no matches) the banner hides itself.

The app side is already built:

- BFF route: `src/app/api/world-cup/featured/route.ts` → proxies `GET /world-cup/featured`
- Banner: `src/components/world-cup-banner.tsx`, pinned at the top of the Discover feed

All you do here is (1) create one table, (2) create one endpoint, (3) upload a
schedule sheet.

---

## How rotation works (read this first)

Each **match** is its own Experience (named `[Team A] vs [Team B]`, 4 stops).
A single calendar day can have several matches → several experiences.

A separate **schedule table** maps a date to the experience(s) that should
appear that day. The endpoint computes **today's date in `America/New_York`**
and returns only the rows for that date. Because "today" is decided **on the
Xano server**, every user sees the same correct day — regardless of their
device clock or timezone.

```
world_cup_schedule (date → experience)        experiences (your 4-stop itineraries)
┌────────────┬───────────────┐                ┌─────┬──────────────────────┐
│ match_date │ experience_id │ ──────────────▶│ id  │ title                │
│ 2026-06-21 │ 142           │                │ 142 │ USA vs Brazil        │
│ 2026-06-21 │ 143           │                │ 143 │ France vs Argentina  │
│ 2026-06-22 │ 144           │                │ 144 │ Spain vs Germany     │
└────────────┴───────────────┘                └─────┴──────────────────────┘
```

---

## Step 1 — Create the schedule table

**Table: `world_cup_schedule`**

| Field | Type | Notes |
|-------|------|-------|
| `match_date` | text | `YYYY-MM-DD`, e.g. `2026-06-21`. (A real `date` type also works.) |
| `experience_id` | integer | FK → `experiences.id` for that match |
| `headline` | text | optional banner title; falls back to the experience's `title` |
| `kickoff_local` | text | optional, e.g. `3:00 PM ET` |
| `venue` | text | optional, e.g. `MetLife Stadium` |
| `sort_order` | integer | optional; controls left-to-right order within a day |

> `id` and `created_at` are auto-created by Xano.

### Fastest setup — CSV import

A starter sheet is included: **`worldcup_schedule_seed.csv`**.

1. **Database → + Add Table → Import CSV** → upload `worldcup_schedule_seed.csv`.
   Xano auto-creates the schema from the headers.
2. Delete the seed rows afterward (the schema stays), or just overwrite them
   with your real schedule.

---

## Step 2 — Create the endpoint

Add to your existing API group (`api:58lfyMpE`).

### `GET /world-cup/featured` — today's matches
**Auth:** None (Discover is public)

**Function stack:**
1. Compute today's date in **`America/New_York`** → variable `today`
   (text `YYYY-MM-DD`). In Xano: a *Create Variable* / *Math/Date* step using
   `now` with timezone `America/New_York`, formatted as `Y-m-d`.
   **Use the NY timezone explicitly — do not rely on the server's default.**
2. `Get All Records` from `world_cup_schedule` where `match_date == today`,
   sorted by `sort_order` asc → `rows`.
3. For each row, `Get Record` from `experiences` by `experience_id` → attach
   as `experience`. (Drop the row if the experience is missing.)
4. `Return`:

```json
{
  "date": "2026-06-21",
  "matches": [
    {
      "experience_id": 142,
      "headline": "USA vs Brazil",
      "kickoff_local": "3:00 PM ET",
      "venue": "MetLife Stadium",
      "experience": { /* full experience record, same shape as /experiences/{id} */ }
    }
  ]
}
```

On an off day, `rows` is empty → return `{ "date": today, "matches": [] }`.
The banner hides itself when `matches` is empty, so nothing else is needed to
"turn it off" at the end of the tournament.

> The embedded `experience` must match the shape returned by your existing
> `GET /experiences/{id}` (it needs `id`, `title`, and `places_id[]` with
> `display_images` / `images` so the banner can pull a thumbnail).

---

## Step 3 — Load the real schedule (your workflow)

Because the schedule references experience **IDs**, do this in two passes:

1. **Create the daily experiences first.** Build each match as its own
   `[Team A] vs [Team B]` 4-stop experience (the way you made today's). Each one
   gets a Xano `id`.
2. **Then fill the schedule sheet** — one row per match — with `match_date` +
   that match's `experience_id` + optional `headline` / `kickoff_local` /
   `venue`, and CSV-import it into `world_cup_schedule`.

That's the only spreadsheet you upload. You can re-import or edit rows any time;
the banner picks up changes on the next load (the endpoint is fetched
`no-store`).

---

## Step 4 — Test

In Xano's **Run & Debug** for `GET /world-cup/featured`:
- Temporarily set a `match_date` to today's NY date and confirm the match comes
  back with its embedded `experience`.
- Confirm an empty result on a date with no rows.

Then in the app, open Discover — the banner appears below the greeting when
today has matches, and is absent otherwise.
