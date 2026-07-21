# Plan Together — Xano Setup Guide

Powers **collaborative planning**: a user starts a **plan** for a night/day out,
invites friends by link, everyone adds candidate stops (experiences or
individual places), the group up-votes what they want, and the plan **locks**
into a final itinerary on a chosen date.

A plan is essentially a **collaborative, dated collection with a voting layer**.
It reuses the existing `experiences`/`places` data — a candidate just points at
an existing experience (or a place) that already lives in your tables.

The app side is already built and is agnostic to your storage details:

- Client helpers + types: `src/lib/plans.ts`
- BFF routes (proxy to the Xano endpoints below): `src/app/api/plans/...`
- Screens: `/plans` (list), `/plans/[id]` (the shared plan), `/plans/join/[token]` (invite accept)

---

## Step 1 — Create the database tables

Add these to your existing workspace (API group `api:58lfyMpE`). `id` and
`created_at` are auto-created by Xano on every table.

**Table: `plans`**
| Field | Type | Notes |
|-------|------|-------|
| `title` | text | required, e.g. "Friday night out" |
| `plan_date` | text `YYYY-MM-DD` | nullable — the night the group is going |
| `owner_user_id` | integer | creator's Xano user id |
| `status` | text enum | `planning` \| `locked`, default `planning` |
| `locked_experience_id` | integer | nullable — set when the plan locks into an experience |
| `share_token` | text | random slug for the invite link (see Step 2 `POST /plans`) |

**Table: `plan_members`**
| Field | Type | Notes |
|-------|------|-------|
| `plan_id` | integer | FK → plans.id |
| `user_id` | integer | a participant |
| `role` | text enum | `owner` \| `member`, default `member` |

> Enforce one row per (`plan_id`, `user_id`) — add a unique index or check
> before insert (Step 2 `POST /plans/{id}/join`).

**Table: `plan_candidates`**
| Field | Type | Notes |
|-------|------|-------|
| `plan_id` | integer | FK → plans.id |
| `added_by_user_id` | integer | who suggested it |
| `experience_id` | integer | nullable — the suggested experience |
| `place_id` | integer | nullable — or a single place, if not a full experience |
| `note` | text | optional — "great for a group" |

**Table: `plan_votes`**
| Field | Type | Notes |
|-------|------|-------|
| `candidate_id` | integer | FK → plan_candidates.id |
| `user_id` | integer | voter |

> A vote is a simple up-vote (thumbs up). One row per (`candidate_id`,
> `user_id`); toggling removes the row. Score = count of rows.

---

## Step 2 — Create the API endpoints

All endpoints are **auth required** unless noted. The app routes through Next.js
BFF routes at `/api/plans/...` which attach the caller's Xano token.

Throughout, "`auth.id`" is the authenticated user's id, and a helper check
**"caller is a member"** means: a row exists in `plan_members` where
`plan_id = {id}` AND `user_id = auth.id`. Non-members get `403`.

---

### `GET /plans` — List the caller's plans
1. `Get All Records` from `plan_members` where `user_id = auth.id` → `memberships`
2. For each, `Get Record` from `plans` by `plan_id` (skip locked-and-old if you
   like) → join as `plan`
3. For each plan, add `member_count` (count `plan_members` for that plan) and
   `candidate_count` (count `plan_candidates`)
4. `Return` the list, most recent first.

---

### `POST /plans` — Create a plan
**Inputs:** `title` (text, required), `plan_date` (text, optional)
1. Generate a random `share_token` (e.g. 10-char alphanumeric)
2. `Add Record` to `plans`: `title`, `plan_date`, `owner_user_id = auth.id`,
   `status = "planning"`, `share_token`
3. `Add Record` to `plan_members`: `plan_id = new.id`, `user_id = auth.id`,
   `role = "owner"`
4. `Return` the new plan (include `member_count: 1`, `candidate_count: 0`).

---

### `GET /plans/{id}` — Full plan detail
1. Guard: caller is a member → else `403`
2. `Get Record` from `plans` by `id` → `plan`
3. `Get All Records` from `plan_members` where `plan_id = id`; for each join the
   user (`id`, `username`, profile photo) → `members`
4. `Get All Records` from `plan_candidates` where `plan_id = id`; for each:
   - join the full `experience` (same shape as `GET /experiences/{id}`) when
     `experience_id` is set, or the `place` when `place_id` is set
   - join the adder's `username`
   - add `vote_count` (count `plan_votes` for the candidate)
   - add `voted_by_me` (bool: does a `plan_votes` row exist for this candidate +
     `auth.id`)
   → `candidates`, sorted by `vote_count` desc
5. `Return` `{ plan, members, candidates, is_owner: plan.owner_user_id == auth.id }`

---

### `PATCH /plans/{id}` — Update title / date / lock
**Inputs (all optional):** `title`, `plan_date`, `status` (`planning`|`locked`),
`locked_experience_id`
1. Guard: `plan.owner_user_id == auth.id` → else `403`
2. `Edit Record`: set only the provided fields
3. `Return` updated plan.

> Locking is just `status = "locked"` (+ optional `locked_experience_id`
> pointing at the winning experience). The app can build the final experience
> from the top-voted candidates; that composition can stay client-side for now.

---

### `DELETE /plans/{id}` — Delete a plan (owner only)
1. Guard: `plan.owner_user_id == auth.id` → else `403`
2. Delete `plan_votes` for candidates in this plan, then `plan_candidates`,
   `plan_members`, and finally the `plans` row
3. `Return` `{ success: true }`.

---

### `POST /plans/{id}/candidates` — Suggest a stop
**Inputs:** exactly one of `experience_id` / `place_id`; optional `note`
1. Guard: caller is a member → else `403`
2. `Add Record` to `plan_candidates`: `plan_id = id`,
   `added_by_user_id = auth.id`, `experience_id` / `place_id`, `note`
3. `Return` the new candidate (with `vote_count: 0`, `voted_by_me: false`, and
   the joined experience/place so the app can render it immediately).

---

### `DELETE /plans/{id}/candidates/{candidate_id}` — Remove a suggestion
1. Guard: caller is a member → else `403`
2. Allow if `candidate.added_by_user_id == auth.id` **or**
   `plan.owner_user_id == auth.id` → else `403`
3. Delete the candidate's `plan_votes`, then the candidate
4. `Return` `{ success: true }`.

---

### `POST /plans/{id}/candidates/{candidate_id}/vote` — Toggle a vote
1. Guard: caller is a member → else `403`
2. If a `plan_votes` row exists for (`candidate_id`, `auth.id`) → delete it
   (`voted: false`); else `Add Record` (`voted: true`)
3. `Return` `{ voted, vote_count }` (recount after the change).

---

### `POST /plans/{id}/join` — Accept an invite
Body: `{ share_token }`. This is how a friend joins from the invite link.
1. `Get Record` from `plans` where `share_token == input.share_token` **and**
   `id == id` → else `404`
2. If a `plan_members` row already exists for (`plan.id`, `auth.id`) →
   `Return` `{ plan_id: plan.id, already_member: true }`
3. Else `Add Record` to `plan_members`: `plan_id = plan.id`,
   `user_id = auth.id`, `role = "member"`
4. `Return` `{ plan_id: plan.id, already_member: false }`.

---

### `GET /plans/invite/{token}` — Invite preview (**auth optional**)
Lets the invite screen show the plan title + who's going before the user
commits (and before login, for a share-link preview).
1. `Get Record` from `plans` where `share_token == token` → else `404`
2. `Return` `{ id, title, plan_date, member_count, owner_username }` — public,
   non-sensitive fields only.

---

## Step 3 — Test

In **Run & Debug**: create a plan, confirm the owner is auto-added to
`plan_members`; add a candidate; vote and re-vote and confirm the count toggles;
hit `POST /plans/{id}/join` as a second user and confirm they appear in
`GET /plans/{id}`. Then open `/plans` in the app.
