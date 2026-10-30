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
2. Apply approvals. For each category with approved drafts:
   - Move live experiences out of the category (`category_id` to 0) unless they
     are popular: 3 or more saves in `saved_experiences`, or any share.
     Experiences are never deleted.
   - Set approved drafts to `public` with the category's id.
   - Replace `DRAFT`/`APPROVED` in `Notes` with `PUBLISHED <date>`.
3. Expire special events: set `private` on any experience whose `Notes` has an
   `expires:` date in the past.
4. Draft about 10 experiences per category, minus the popular ones that stay,
   using helper agents with `brief.md`. Each agent writes `drafts/<name>.json`.
   Then check every file with `validate.py`.
5. Insert with `insert_drafts.py drafts/*.json`.
6. Report what was drafted, published, rotated out and expired.

## New categories

The Xano `discovery` endpoint (Limelii Endpoints, `GET discovery`) only has
named buckets for categories 1 to 4. Everything else lands in `uncategorized`,
which the app hides. A new category therefore needs two changes, and both should
happen only when its first drafts are approved, or the app shows an empty chip:

1. Add a row to `experiences_categories`.
2. Add a bucket for it in the `discovery` endpoint, keyed by the snake_case
   name (the app titles sections from the key). The endpoint also treats
   `category == 7` as "all", so check the new id does not collide.

## Places

Drafts can only use places already in `locations` that are operational and
have photos and coordinates. New places need the Google Places pipeline
(`create_new_location`), which runs inside Xano. Agents list places they wanted
but couldn't use in `drafts/*.places_to_add.json`.
