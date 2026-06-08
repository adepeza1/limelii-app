# Right Now — v1 Spec (Live "available now" feed)

> **Supersedes the earlier editorial-curation draft.** During design we decided Right Now
> is a **live, location-aware feed of things available right now near you in NYC**, not a
> weekly hand-curated editorial drop. The editorial voice survives only as an optional
> "featured / boosted pick" layer on top of the live feed (see §8).

This is the build sheet for the **backend (Xano)** + the data pipelines. Frontend notes at the end.
**Phase split unchanged:** this is **Part A** (the feature). Subscriptions = Part B (Apple IAP /
RevenueCat). Notifications = Part C.

---

## 0. The decided model

Three categories, and **everything shown must be genuinely available right now**:

| Category | Source | "Available now" means | Action (tap) |
|---|---|---|---|
| **Tables** | Your **Xano** `experiences`/`places` | **Open now + walk-in-friendly**, near you | Menu / reservation page (link out) |
| **Events** | **Ticketmaster Discovery + SeatGeek** APIs | Starting soon + tickets available | Buy tickets (link out) |
| **Activities** | Your **Xano** `experiences`/`places` | Open now (most need no booking), near you | Details (limelii or external) |

**Explicitly deferred:** live reservation *slot* availability for Tables (e.g. "7:30 for 2").
No public API spans Resy/OpenTable/Tock/SevenRooms/BentoBox. Adding it later requires an
**OpenTable partnership** or a **paid availability feed** — a business decision, not a code one.
Note: **Eventbrite is not usable** (public event search removed ~2019).

---

## 1. Core engine: "open/available now + near me"

Every category reduces to: *is it available now?* + *how far from the user?*

- **Location is required** — this is a "near me, now" feed. Reuse `src/lib/geolocation.ts`.
  No location → prompt (the Locate-me flow), else fall back to a NYC-wide "happening now" view.
- **Open-now** comes from `operating_hours`. The live data is a clean, consistent string:
  `"Monday: 6:00 PM – 1:00 AM\nTuesday: …"`. **Normalize it once in Xano** into a structured
  `hours_json` field (per-day `{open, close}` in minutes-from-midnight) so "open now" is a cheap
  query, not a per-request parse. Parser must handle: the en-dash `–`, AM/PM, **overnight wraps**
  (close < open ⇒ closes after midnight), `"Closed"`, and empty strings (no open-now state).
- **Distance** via the haversine already in `explore-view.tsx` (lat/lng on every place).
- **Time math** uses `America/New_York`.

---

## 2. Data sources & pipelines

### 2a. Owned (Tables walk-in + Activities) — computed live from Xano
No new item table needed. Add to the existing `places` (or a sibling `right_now_place_meta`):
| field | type | notes |
|---|---|---|
| `hours_json` | json | normalized from `operating_hours` (§1) |
| `rn_category` | enum, nullable | `tables`,`activities`, or null (mapped from `location_type`) |
| `walk_in_friendly` | bool | heuristic by type (casual dining/bar/cafe = true; fine-dining = false) — overridable |
| `action_url` | text | menu/booking/details link; default to existing `_location_details.url` |

**Category mapping** (from `_location_details.location_type`):
- `tables` ← Restaurant/Bar/Cafe/Food/Drink types
- `activities` ← Museum/Gallery/Park/Activity/Wellness/Outdoors/Culture types

### 2b. External (Events) — ingested into a cache table
**`right_now_events_cache`**
| field | type | notes |
|---|---|---|
| `id` | int PK | |
| `source` | enum | `ticketmaster`,`seatgeek` |
| `source_id` | text | provider event id (for dedup/upsert) |
| `title` | text | |
| `starts_at` | timestamp | |
| `venue_name` | text | |
| `lat`,`lng` | decimal | |
| `neighborhood` | text, nullable | reverse-geocode/borough best-effort |
| `image_url` | text | |
| `price_from` | decimal, nullable | |
| `tickets_available` | bool | from provider status |
| `ticket_url` | text | outbound buy link (required by provider ToS) |
| `category_hint` | text | music/comedy/sports/arts |
| `fetched_at` | timestamp | |
| `status` | enum | `live`,`expired` |

Unique index on (`source`,`source_id`). Cross-source dedup by fuzzy (title + starts_at + venue).

---

## 3. The feed endpoint

**`GET /right-now/feed?lat&lng&radius&category`** (auth optional → tier gating, §5)
1. **Tables/Activities:** query places where `rn_category` matches, `hours_json` says **open now**,
   within `radius` of (lat,lng); (Tables additionally `walk_in_friendly = true`).
2. **Events:** query `right_now_events_cache` where `status='live'`, `starts_at` within the
   **"soon" window** (default **next 24h** — *confirm*), `tickets_available = true`, within `radius`.
3. **Merge → normalized cards (§4) → rank** by a blend of distance + soon-ness + optional editorial
   boost (§8). Apply gating (§5). Return envelope with per-category counts.

**`GET /right-now/item/:type/:id`** — `:type` ∈ `place`,`event`. Detail payload + (for places) a
Leaflet/Carto map preview (reuse `plan-map.tsx`), full hours, and a "pair it with" list.

Plus (reuse from the prior draft): `POST /right-now/save`, `/going`, `/events` (analytics),
`GET /right-now/me`. Saves/going use **source-prefixed ids** (`place:123`, `event:45`).

---

## 4. Normalized card schema (feed response item)
```json
{
  "id": "place:123" | "event:45",
  "category": "tables" | "events" | "activities",
  "title": "Bar Primi",
  "subtitle": "Roman-style pasta, solid walk-in odds",
  "image_url": "...",
  "neighborhood": "NoHo",
  "distance_mi": 0.4,
  "price_indicator": "$$",
  "availability": {
    "open_now": true, "closes_at": "23:00",            // tables/activities
    "walk_in": true,
    "starts_at": "2026-06-08T20:00:00-04:00",          // events
    "tickets_available": true, "price_from": 35
  },
  "source_type": "limelii" | "ticketmaster" | "seatgeek",
  "action": { "label": "Reserve / Menu" | "Get Tickets" | "View Details", "url": "..." },
  "is_locked": false
}
```

---

## 5. Free vs. paid (`limelii+`) — revised for a live feed
The original **early-access (48h)** concept **does not apply** to real-time data — drop it.
Gating becomes about **scope of the live feed**:

- **Free:** capped to the **top N nearest items** (default **5** — *confirm*), Tables + Activities only.
- **`limelii+`:** full feed (uncapped), **Events included**, larger `radius`.
- Server-enforced: free responses return locked stubs (title/neighborhood/category + `is_locked:true`)
  for everything beyond the cap, so the frontend can render the paywall + blurred remainder.

(Membership read from `users.is_member` per Part A; seeded manually until Part B wires Apple IAP.)
Saves / Going / analytics / admin roles carry over unchanged from the prior draft.

---

## 6. Background jobs (Xano tasks)
- **Hours normalization:** on place create/update (or nightly) → parse `operating_hours` → `hours_json`.
- **Events ingestion:** every **30–60 min** → call Ticketmaster Discovery + SeatGeek for NYC
  (geoPoint + radius, `startDateTime` = now..+window, classification map) → upsert cache → dedup.
- **Events expiry:** hourly → `starts_at < now()` ⇒ `status='expired'` (drop from feed).

---

## 7. Inputs needed from you before build
1. **Ticketmaster Discovery API key** (free, instant) + **SeatGeek API client** (apply).
2. Confirm three defaults: **"soon" window** (24h?), **free cap** (5?), **default radius** (2 mi?).
3. `action_url` for Tables: OK to default to existing `_location_details.url`, or do you want a
   dedicated `reservation_url` curators can set?

---

## 8. Where the editorial voice goes now
Live availability and weekly editorial curation are somewhat opposed. In this model the editorial
layer is **optional polish on top of the live feed**, not the feed itself:
- An admin can **feature/boost** specific items (a `boost` weight + a curator one-liner) so a
  hand-picked pick floats to the top with limelii voice. Everything else is the live "available now" list.
- If you want the weekly "Goings On" drop *as well*, that's a curated overlay — a later add, not v1.

---

## 9. Frontend (Part A) — web-only, behind `NEXT_PUBLIC_RIGHT_NOW`
- Category tabs: **All / Tables / Events / Activities**.
- Location prompt (reuse geolocation) → "near me, now" feed; NYC-wide fallback.
- Cards per §4 (open-now/closing or starts-at, distance, price, one-liner, single action).
- Detail view (map preview, hours, pair-with), Save/Going/Share, every action logged to
  `/right-now/events` **and** Mixpanel.
- Paywall after the free cap; locked stubs blurred (server-withheld). Mock-first against §4.
- Default-tab flip = flag-gated launch-day change.

## 10. Carried to later parts
- **Reservation slots for Tables** (OpenTable partnership or paid feed).
- **Part B Subscriptions** (Apple IAP via RevenueCat; entitlement sync native→Xano→web).
- **Part C Notifications** ("happening near you now" / weekly featured drop).
