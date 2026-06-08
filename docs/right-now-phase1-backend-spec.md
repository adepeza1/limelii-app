# Right Now — Phase 1 (Part A) Backend Spec

**Scope:** the Xano data model, endpoints, gating logic, and cron jobs needed to ship
the Right Now feed/detail experience **with free/paid gating, but without the actual
purchase flow** (Apple IAP). Membership is read from a `users.is_member` flag that is
seeded manually in Part A and written by the IAP flow in Part B.

This doc is the build sheet for the **backend (Xano)**. Frontend notes are at the end.

---

## 0. Conventions decided

- **Integer primary keys**, to match the existing app (`experiences_id`, `users_id` are
  numbers — see `src/lib/saved.ts`). Do **not** introduce uuids; the original spec's uuid
  PKs were illustrative.
- **Timestamps** are Xano `timestamp` (epoch ms), matching `created_at` elsewhere.
- **Timezone for all "day" math is `America/New_York`** (NYC-only product).
- **Images** live in Xano file storage, reusing the existing avatar upload pattern
  (`/user/upload_photo`). `hero_image_url` stores the returned public URL. An external URL
  is also acceptable (the column is just text; `next.config.ts` has `images.unoptimized`,
  so there is no host allowlist to maintain).
- **Hard expiry cutoff** (see §4).

---

## 1. Tables

### 1.1 `right_now_items`
| field | type | notes |
|---|---|---|
| `id` | int, PK | |
| `title` | text, required | |
| `dek` | text, required | 1-line summary, ≤140 chars |
| `editorial_blurb` | text (long), required | full write-up for detail view |
| `venue_name` | text, required | |
| `venue_address` | text, required | |
| `venue_neighborhood` | text, required | |
| `venue_lat` | decimal | for the Leaflet map preview |
| `venue_lng` | decimal | |
| `hero_image_url` | text, required | Xano storage URL or external URL |
| `additional_image_urls` | json (array of text) | optional, swipeable gallery |
| `image_credit` | text, nullable | attribution; store now even if unused |
| `time_window_label` | text | e.g. `TONIGHT ONLY`, `THROUGH SUNDAY`, `THIS WEEK` |
| `time_window_start` | timestamp, nullable | |
| `time_window_end` | timestamp, **required** | drives auto-expiry (§4) |
| `source_type` | enum | `resy`,`dice`,`eventbrite`,`limelii_direct`,`manual` |
| `source_url` | text, nullable | external deep link; null if `limelii_direct` |
| `cta_label` | text | see §6 mapping |
| `price_indicator` | enum | `$`,`$$`,`$$$`,`$$$$` |
| `tags` | json (array of text) | cuisine/vibe/occasion; future personalization |
| `priority` | int | lower = earlier; hero is 1 |
| `is_hero` | bool | exactly one `true` per live week |
| `is_premium_only` | bool, default `false` | Phase-1 gating is by position, not this flag |
| `published_at` | timestamp | when it goes live |
| `early_access_until` | timestamp | free users see it only at/after this; default = `published_at + 48h`. Set `= published_at` to disable early-access gating for an item |
| `status` | enum | `draft`,`scheduled`,`live`,`expired`,`archived` |
| `curator_id` | int, FK→users | |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

### 1.2 `right_now_pairings`
Two **nullable FK columns** instead of a polymorphic key (simpler, type-safe). Exactly one
of the two paired columns is set per row.

| field | type | notes |
|---|---|---|
| `id` | int, PK | |
| `item_id` | int, FK→right_now_items | the item whose detail page shows this pairing |
| `paired_right_now_item_id` | int, FK→right_now_items, nullable | |
| `paired_experience_id` | int, FK→experiences, nullable | links to existing Discover content |
| `pairing_label` | text, nullable | e.g. "After dinner" |
| `display_order` | int | |

### 1.3 `right_now_saves`
Separate from the existing experience-only `saved_experiences` table (don't refactor the
working Discover saves).

| field | type | notes |
|---|---|---|
| `id` | int, PK | |
| `users_id` | int, FK→users | |
| `right_now_item_id` | int, FK→right_now_items | |
| `created_at` | timestamp | |

Unique index on (`users_id`,`right_now_item_id`).

### 1.4 `right_now_going`
Same shape as saves.

| `id` | int PK | `users_id` int FK | `right_now_item_id` int FK | `created_at` timestamp |

Unique index on (`users_id`,`right_now_item_id`).

### 1.5 `right_now_events` (analytics)
| field | type | notes |
|---|---|---|
| `id` | int, PK | |
| `users_id` | int, FK→users, **nullable** | anonymous allowed |
| `right_now_item_id` | int, FK→right_now_items, nullable | nullable for feed-level `view` |
| `event_type` | enum | `view`,`tap_card`,`tap_cta`,`tap_save`,`tap_share`,`tap_going` |
| `created_at` | timestamp | |

> Also forward these to **Mixpanel** from the frontend (`src/lib/mixpanel.ts` `track()` is
> already wired). Xano table = curator/admin metrics; Mixpanel = product funnels.

### 1.6 `users` — add membership columns (Part A reads; Part B writes)
| field | type | notes |
|---|---|---|
| `is_member` | bool, default `false` | seed `true` manually to test gating in Part A |
| `member_since` | timestamp, nullable | |
| `member_expires_at` | timestamp, nullable | null = no expiry; for IAP later |
| `role` | enum, default `user` | `user`,`curator`,`admin` — gates admin endpoints |

A user is a **member** iff `is_member = true` AND (`member_expires_at` is null OR `> now()`).

---

## 2. Gating logic (the core of Part A)

Constants: `FREE_LIMIT = 2` (1 hero + 1 standard).

**Viewer tier**
- `member` — authed AND member (per §1.6).
- `free` — everyone else, including anonymous.

**Candidate set (both tiers):** `status = 'live'` AND `time_window_end > now()`, ordered by
`priority` ASC (hero first).

**Member response:** the full candidate set, every field included.

**Free response:** walk the ordered candidate set and classify each item:
- An item is **unlockable** for free viewers iff `now() >= early_access_until`.
- The **first `FREE_LIMIT` unlockable items** → returned **full**.
- **Every other live item** (the rest of the unlockables beyond the limit, *and* items still
  inside their early-access window) → returned as a **locked stub**:
  ```
  { id, title, venue_neighborhood, price_indicator, time_window_label,
    is_locked: true }
  ```
  No `hero_image_url`, `editorial_blurb`, `dek`, `source_url`, `cta_label`, address, or coords.

**Response envelope** (so the frontend can render counts + the paywall copy):
```json
{
  "week_label": "WEEK OF JUN 5–11",
  "tier": "free",
  "free_limit": 2,
  "unlocked_count": 2,
  "locked_count": 6,
  "items": [ /* full items then locked stubs, in priority order */ ]
}
```

> **Server-side enforcement is mandatory.** Never return locked fields to free viewers and
> rely on the client to hide them. The client only blurs what the server already withheld.

---

## 3. Endpoints

All reads accept an **optional** bearer token (`Authorization: Bearer <xano_token>`); when
present, tier is computed from the user. Admin endpoints **require** `role in (curator,admin)`.

### Public / member-gated reads
- **`GET /right-now/feed`**
  Returns the envelope in §2. Applies tier gating. Anonymous = free tier.
  Caching: see §5.
- **`GET /right-now/items/:id`**
  Single item. Enforce gating: if the item is a **locked stub** for this viewer, return
  `403` (or the locked stub) — do **not** return full fields. Members/unlocked → full payload,
  including a `pairings` array (resolve §1.2 into lightweight cards).
- **`GET /right-now/pairings/:item_id`**
  Resolved paired items (Right Now items and/or Discover experiences) for the detail view.
  Only return pairings whose target is itself viewable; drop expired/draft targets.

### Authenticated user actions (require auth)
- **`POST /right-now/save`** — body `{ item_id }`. Toggles a `right_now_saves` row. Returns
  `{ saved: true|false }`.
- **`POST /right-now/going`** — body `{ item_id }`. Toggles `right_now_going`. Returns
  `{ going: true|false }`.
- **`GET /right-now/me`** — returns the current user's saved + going item ids for this surface
  (so the feed can show filled icons). Optional but convenient.

### Analytics
- **`POST /right-now/events`** — body `{ item_id?, event_type }`. Auth optional
  (`users_id` null when anonymous). Fire-and-forget; always `200`.

### Curator/admin (require role)
- **`POST   /admin/right-now/items`** — create (defaults: `status=draft`,
  `early_access_until = published_at + 48h` when `published_at` set).
- **`PATCH  /admin/right-now/items/:id`** — update.
- **`POST   /admin/right-now/items/:id/publish`** — set `status` to `scheduled` if
  `published_at > now()`, else `live`.
- **`POST   /admin/right-now/items/:id/archive`** — `status = archived`.
- **`GET    /admin/right-now/items`** — list all statuses, filterable by `status`/week.
- **`POST   /admin/right-now/upload_image`** — multipart `image` field → Xano file storage →
  `{ url }`. Mirror the existing `/user/upload_photo` pattern.
- **`GET    /admin/right-now/analytics/:item_id`** — aggregate counts of each `event_type` +
  derived save/going/CTA conversion for the item.

---

## 4. Background jobs (Xano tasks)

- **Auto-publish — every 5 min:** `status='scheduled' AND published_at <= now()` → `status='live'`.
- **Auto-expire — hourly:** `status='live' AND time_window_end <= now()` → `status='expired'`.

**Hard-cutoff rule for `time_window_end` defaults** (curator may always override):
- `TONIGHT ONLY` → **3:00 AM `America/New_York` the following day**.
- `THROUGH <weekday>` → 3:00 AM `America/New_York` the day **after** that weekday.
- `THIS WEEK` → 3:00 AM `America/New_York` on the Monday after the active week.

Picking 3 AM (not midnight) keeps late-night items alive through the actual night out.
Curators set `time_window_end` explicitly; these are just the suggested defaults the admin
form can pre-fill.

---

## 5. Caching & performance

- **`GET /right-now/feed` for anonymous/free, no auth header:** identical for everyone in that
  tier → safe to **CDN/edge-cache ~5 min** (short TTL so curator edits surface quickly). In
  Next.js this is the route's `revalidate`/`Cache-Control`.
- **Authed requests (member or for filled save/going state):** **per-user, no shared cache**
  (`Cache-Control: private, no-store`).
- **Invalidation:** keep TTLs short (≤5 min) rather than building active invalidation in
  Phase 1 — matches the existing "fetch discovery fresh" posture.

---

## 6. Source-aware CTA label mapping
| `source_type` | default `cta_label` |
|---|---|
| `resy` | Book on Resy |
| `dice` | Get Tickets on Dice |
| `eventbrite` | Get Tickets on Eventbrite |
| `limelii_direct` | View Details (Phase 1) |
| `manual` | curator-set free text |

Store the resolved `cta_label` on the row so the curator can override; the mapping above is
just the admin-form default.

---

## 7. Frontend (Part A) — build order & flags

Web-only; no native capability needed. Build on a branch behind a flag, ship via Vercel
preview, flip on at launch.

1. **Feature flag** `NEXT_PUBLIC_RIGHT_NOW` — when off, `/right-now` keeps the current
   "Coming soon" placeholder; the bottom-nav tab already exists.
2. **Mock-first:** build feed + detail against local fixtures shaped like the §2 envelope, so
   UI work isn't blocked on Xano. Swap to `GET /right-now/feed` when live.
3. **Feed page** (`/right-now`): sticky header (wordmark + serif "Right Now" + small-caps week
   label), hero card, standard cards, paywall break after the unlocked items, locked stubs
   rendered blurred (server already withheld the fields), quiet/empty state, footer.
4. **Detail view**: hero gallery, editorial blurb, venue card with **Leaflet/Carto** preview
   (reuse `plan-map.tsx` tile setup — no Google Maps), "Pair it with", sticky CTA + Going.
5. **Actions**: Save/Going (optimistic, auth-gated via existing Kinde/mobile-cookie flow),
   Share (native share sheet + deep link), CTA opens `source_url` externally; log every action
   to `/right-now/events` **and** Mixpanel.
6. **Paywall modal**: value prop + pricing copy + "Become a member" button. In Part A the
   button can route to a "coming soon"/waitlist state; the real checkout is wired in Part B.
7. **Default-tab switch** (launch day, flag-gated): make `/right-now` the landing for returning
   users (today `/` = Discover). One routing change; keep first-run onboarding ahead of it.

**Definition of done for Part A** = the spec's Phase-1 DOD *minus* a real purchase flow:
feed/detail/gating/early-access/saves/going/share/CTA/analytics/admin/cron/empty+failure
states all working, with membership seeded manually.

---

## 8. Carried into later parts (not Part A)
- **Part B — Subscriptions:** Apple IAP via **RevenueCat** (recommended over raw StoreKit),
  entitlement sync **native → Xano (`users.is_member`) → web**, wire to the paywall button.
- **Part C — Notifications:** weekly-drop push (the data model already supports adding a
  `notifications_sent` flag on items); "Going" day-before reminders.

## 9. Still-open product decisions
- **Admin tool**: Xano native editor vs. Retool vs. custom `/admin` (lean Retool/Xano for v1).
- **Hero image rights** policy (venue/press/licensed/own only; no IG scraping).
- Whether `limelii_direct` CTA is "View Details" (P1) or "Book" (P2+).
