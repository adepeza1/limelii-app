# Weekly itinerary curation

Every Friday a scheduled Claude session drafts the next week's curated
experiences. Drafts go into Xano as **private, uncategorized** rows, so nothing
reaches the app until Lex approves it.

Rules for every itinerary live in [`itinerary-rules.md`](../../itinerary-rules.md).
Helper agents get [`brief.md`](brief.md) as their drafting instructions.

## Approving drafts

Each draft's `Notes` starts with `DRAFT <date>. Proposed category: <name>`.
In Xano, change that first word:

- `APPROVED` publishes it in its proposed category on the next run.
- `REJECTED` leaves it private for good.

Anything still marked `DRAFT` stays private and can be reviewed later.

## What a run does

1. Work in a scratch directory with this folder on `PYTHONPATH`.
   Run `build_pool.py`, which saves `xano_dump.json` as a backup and writes `pool.json`.
2. Apply approvals: set approved drafts to `public` with their category's id,
   and replace `APPROVED` in `Notes` with `PUBLISHED <date>`. Existing
   experiences stay in their categories: Lex chose to grow categories rather
   than rotate old ones out (Oct 30 2026). Experiences are never deleted.
3. Expire special events: set `private` on any experience whose `Notes` has an
   `expires:` date in the past.
4. Draft new experiences for each category (about 5 per category per week)
   using helper agents with `brief.md`. Each agent writes `drafts/<name>.json`.
   Then check every file with `validate.py`, and run `overlap.py drafts/*.json`
   to catch drafts that share 2 or more stops with each other or with any
   public experience (public ones show on the map even without a category).
   Give agents different neighborhoods up front: in the first run, parallel
   agents drafted near copies of each other in Ditmars, Red Hook and Chinatown.
   Web searches are limited to about 200 per turn across all agents, so keep
   agents at 10 to 15 drafts each. Stops left unverified are marked
   `NOT VERIFIED OPEN` in `Notes`.
5. Insert with `insert_drafts.py drafts/*.json`.
6. Report what was drafted, published and expired.

## Categories

| id | Name | `discovery` bucket |
|---|---|---|
| 1 | Good For Groups | `good_for_groups` |
| 2 | Cultural Experiences | `cultural_experiences` |
| 3 | Staff Picks | `staff_picks` |
| 4 | Hidden Gems | `hidden_gems` |
| 6 | Date Night | `date_night` |
| 7 | After Dark | `after_dark` |
| 8 | Happy Hour | `happy_hour` |
| 9 | NYC Marathon (temporary, removed after Nov 1 2026) | `NYC_marathon` |

Anything else lands in `uncategorized`, which Discover hides. Public
uncategorized experiences still show on the map and in search.

A new category needs two changes, made only when its first drafts are
approved, or the app shows an empty chip:

1. Add a row to `experiences_categories`.
2. Add a bucket for it in the `discovery` endpoint (Limelii Endpoints,
   `GET discovery`). The app titles sections from the key by capitalizing the
   first letter of each word, so write acronyms in capitals (`NYC_marathon`).
   The response is cached for 5 minutes, so changes show up within that time.

## Places

Drafts can only use places already in `locations` that are operational and
have photos and coordinates. New places need the Google Places pipeline
(`create_new_location`), which runs inside Xano. Agents list places they wanted
but couldn't use in `drafts/*.places_to_add.json`.
