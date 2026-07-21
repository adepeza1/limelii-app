# Discover Seed — Xano write endpoints

The Discover screen renders whatever `GET /discovery` returns from Xano; none of
its content lives in this repo. To add categories and experiences, the seed
script (`seed-discover.mjs`) needs two **admin-only write endpoints**. Create
them in your Xano workspace (API group `api:58lfyMpE`, or a dedicated admin
group) before running the script.

Both endpoints authenticate with a shared secret sent in the `X-Admin-Secret`
header. In Xano, add a **Precondition** step at the top of each function stack:
`input header "X-Admin-Secret" == env ADMIN_SEED_SECRET` → else `Error Response`
401. Set `ADMIN_SEED_SECRET` in your Xano environment variables, and pass the
same value to the script as `SEED_ADMIN_SECRET`.

> The script calls these at `{ADMIN_BASE}/experience_categories` and
> `{ADMIN_BASE}/experiences`. `ADMIN_BASE` defaults to
> `https://xupl-quzd-sk5c.n7e.xano.io/api:58lfyMpE/admin`. If you put the
> endpoints somewhere else, set `SEED_ADMIN_BASE` when running the script.

---

## `POST /admin/experience_categories` — Create a category

**Headers:** `X-Admin-Secret: <secret>`

**Inputs:**

- `name` (text, required)

**Function stack:**

1. Precondition: `X-Admin-Secret` header == `env ADMIN_SEED_SECRET`, else Error 401.
2. `Get Record` from `experience_categories` where `name = input.name` → `existing`.
3. Conditional: if `existing` is not null → `Return existing` (idempotent — the
   script also skips existing names, this is just belt-and-suspenders).
4. `Add Record` to `experience_categories`: `name = input.name`.
5. `Return` the new record (must include `id` and `name`).

---

## `POST /admin/experiences` — Create an experience

**Headers:** `X-Admin-Secret: <secret>`

**Inputs (all sent by the script):**

| Field             | Type          | Notes                                          |
|-------------------|---------------|------------------------------------------------|
| `title`           | text          |                                                |
| `description`     | text          |                                                |
| `category_id`     | integer       | resolved from the category name by the script  |
| `place_ids`       | integer[]     | ids of **existing** rows in the `places` table |
| `creator_user_id` | integer       | curator id (default 36)                         |
| `access`          | text          | `"public"`                                     |
| `status`          | text          | `"done"`                                        |
| `neighborhoods`   | text[]        |                                                |
| `activities`      | text[]        |                                                |
| `budget`          | text[]        |                                                |
| `indoor_outdoor`  | text[]        |                                                |
| `time_of_day`     | text[]        |                                                |
| `sort_order`      | integer       | `0`                                            |

**Function stack:**

1. Precondition: `X-Admin-Secret` header == `env ADMIN_SEED_SECRET`, else Error 401.
2. `Add Record` to `experiences` with every field above **except** `place_ids`.
   Map `place_ids` to whatever your schema uses for the places relation
   (the `/discovery` payload exposes it as `places_id`) — e.g. set the
   `experiences.places_id` relation/list field to `input.place_ids`.
3. `Return` the new record.

> The `place_ids` in `seed-data.json` are all ids that already exist in your
> `places` table (pulled from the live `/discovery` response), so no new place
> records are created. If you later change the seed data, make sure every
> `place_ids` value points at a real `places.id`.

---

## `PATCH /admin/experiences/{id}` — Update an experience's category

Used by `classify-experiences.mjs` to set `category_id` on existing rows.

**Headers:** `X-Admin-Secret: <secret>`

**Inputs:**

- `id` (path param, integer)
- `category_id` (integer)

**Function stack:**

1. Precondition: `X-Admin-Secret` header == `env ADMIN_SEED_SECRET`, else Error 401.
2. `Edit Record` in `experiences` by `id`: set `category_id = input.category_id`.
3. `Return` the updated record.

> The classifier only ever sends `category_id`, so this endpoint can be minimal.
> If you'd rather reuse a general-purpose edit endpoint, point the script at it
> with `SEED_ADMIN_BASE` and make sure a `PATCH …/experiences/{id}` route
> accepts `category_id`.

---

## After seeding

`GET /discovery` is cached on the Xano side and the app fetches it with
`cache: "no-store"`, so new content appears on the next page load once the Xano
cache refreshes. The new category tabs show up automatically because the tab bar
is built from `experience_categories` (the app already filters out
`"uncategorized"` and sorts by id). No frontend deploy is required.
