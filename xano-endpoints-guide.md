# Xano Collections Setup Guide

This guide walks you through setting up the backend tables and API endpoints needed for the Collections feature.

---

## Step 1: Create the database tables

### Option A — CSV import (fastest)

1. In your Xano workspace, go to **Database**
2. Click **+ Add Table** → **Import CSV**
3. Upload `collections_table_seed.csv` → Xano will auto-create the table schema
4. Repeat for `saved_collections_seed.csv`
5. After importing, **delete the seed rows** from both tables (the schema stays)

### Option B — Manual (if CSV import doesn't work)

**Table: `collections`**
| Field | Type | Notes |
|-------|------|-------|
| `name` | text | required |
| `description` | text | optional |
| `is_public` | boolean | default: false |
| `owner_user_id` | integer | user's Xano user id |
| `experience_ids` | text | store as JSON string e.g. `"[1,2,3]"` |

**Table: `saved_collections`**
| Field | Type | Notes |
|-------|------|-------|
| `user_id` | integer | |
| `collection_id` | integer | foreign key → collections.id |

> `id` and `created_at` are auto-created by Xano on every table.

---

## Step 2: Create the API endpoints

Go to **API** in your Xano workspace. Add the following endpoints to your existing API group (`api:58lfyMpE`).

---

### `GET /collections` — List user's collections + saved collections
**Auth:** Required

**Function stack:**
1. `Get All Records` from `collections` where `owner_user_id = auth.id` → variable `my_collections`
2. `Get All Records` from `saved_collections` where `user_id = auth.id` → variable `saved_collection_rows`
3. For each row in `saved_collection_rows`, `Get Record` from `collections` by `collection_id` → join as `collection`
4. `Return` `{ my_collections, saved_collections: saved_collection_rows }`

---

### `POST /collections` — Create a new collection
**Auth:** Required

**Inputs:**
- `name` (text, required)
- `description` (text, optional)
- `is_public` (boolean, default false)

**Function stack:**
1. `Add Record` to `collections`:
   - `name` = input.name
   - `description` = input.description
   - `is_public` = input.is_public
   - `owner_user_id` = auth.id
   - `experience_ids` = `"[]"`
2. `Return` the new record

---

### `GET /collections/{id}` — Get a single collection
**Auth:** Optional (public collections visible to all)

**Inputs:**
- `id` (path param, integer)

**Function stack:**
1. `Get Record` from `collections` by `id` → variable `collection`
2. If `collection.is_public` is false AND `collection.owner_user_id != auth.id` → `Error Response` 403
3. `Return` `collection`

---

### `PATCH /collections/{id}` — Update a collection
**Auth:** Required

**Inputs:**
- `id` (path param, integer)
- `name` (text, optional)
- `description` (text, optional)
- `is_public` (boolean, optional)

**Function stack:**
1. `Get Record` from `collections` by `id` → variable `collection`
2. If `collection.owner_user_id != auth.id` → `Error Response` 403
3. `Edit Record` in `collections`: update only the provided fields
4. `Return` updated record

---

### `DELETE /collections/{id}` — Delete a collection
**Auth:** Required

**Inputs:**
- `id` (path param, integer)

**Function stack:**
1. `Get Record` from `collections` by `id` → variable `collection`
2. If `collection.owner_user_id != auth.id` → `Error Response` 403
3. `Delete Record` from `collections` by `id`
4. Also `Delete All Records` from `saved_collections` where `collection_id = id`
5. `Return` `{ success: true }`

---

### `POST /collections/{id}/experiences` — Add an experience to a collection
**Auth:** Required

**Inputs:**
- `id` (path param, integer) — collection id
- `experience_id` (integer)

**Function stack:**
1. `Get Record` from `collections` by `id` → variable `collection`
2. If `collection.owner_user_id != auth.id` → `Error Response` 403
3. Parse `collection.experience_ids` from JSON text → array
4. Append `experience_id` if not already present
5. `Edit Record`: set `experience_ids` = JSON.stringify(updated array)
6. `Return` updated record

---

### `DELETE /collections/{id}/experiences/{exp_id}` — Remove an experience
**Auth:** Required

**Inputs:**
- `id` (path param, integer) — collection id
- `exp_id` (path param, integer) — experience id

**Function stack:**
1. `Get Record` from `collections` by `id` → variable `collection`
2. If `collection.owner_user_id != auth.id` → `Error Response` 403
3. Parse `collection.experience_ids` → array
4. Remove `exp_id` from array
5. `Edit Record`: set `experience_ids` = JSON.stringify(updated array)
6. `Return` updated record

---

### `POST /collections/{id}/save` — Save someone else's public collection
**Auth:** Required

**Inputs:**
- `id` (path param, integer) — collection id

**Function stack:**
1. `Get Record` from `collections` by `id` → variable `collection`
2. If `collection.is_public` is false → `Error Response` 403
3. Check if row already exists in `saved_collections` where `user_id = auth.id` AND `collection_id = id`
4. If not: `Add Record` to `saved_collections`: `user_id = auth.id`, `collection_id = id`
5. `Return` `{ success: true }`

---

## Step 3: Test in Xano's API tester

For each endpoint, use Xano's built-in **Run & Debug** tab to verify it works before testing in the app.

The app routes requests through Next.js BFF routes at `/api/collections/...` which proxy to these Xano endpoints.
