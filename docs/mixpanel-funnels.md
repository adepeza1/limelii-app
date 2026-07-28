# limelii — Mixpanel Funnel Spec

Turns the two open product questions — *where do users drop off?* and *what's
the friction?* — into measurable funnels built **only on events that already
exist in the code today**. Each funnel also lists the instrumentation gap that
currently makes it partly blind, so you know exactly what to add next.

Source of truth: `track(...)` calls in `src/`, gated through `src/lib/mixpanel.ts`.

---

## 0. Read this before trusting any number

Two things in the code bias every funnel. State them on every dashboard.

1. **iOS = ATT-gated.** `mixpanel-provider.tsx` only calls `optInMixpanel()`
   on native when App Tracking Transparency returns `authorized`. Users who
   **deny ATT emit zero events** — no `App Opened`, nothing. So native numbers
   describe *ATT-authorized users only*, not your iOS base. Web opts in
   immediately, so web is fuller. **Always segment funnels by `platform`**
   (property on `App Opened`) and never blend the two into one conversion rate.

2. **Opt-out by default.** `initMixpanel()` sets
   `opt_out_tracking_by_default: true`; `track()` no-ops until opt-in. Anything
   before opt-in (first-run, pre-consent) is invisible. The funnel top is
   "opted-in session start," not "app launch."

---

## 1. Event catalog (what exists today)

| Event | Fires when | Properties | File |
|---|---|---|---|
| `App Opened` | Opted-in session start | `platform` (native/web), `entry_path`, cookie-state booleans (e.g. `hasKindeRefresh`) | `mixpanel-provider.tsx` |
| `Page Viewed` | Every route change | `path` (bucketed), `raw_path` | `page-view-tracker.tsx` |
| `Experience Viewed` | Experience detail opens | `experience_id`, `title` | `experience-detail.tsx` |
| `Experience Saved` | Save tapped | `experience_id`, `title` | `experience-detail.tsx` |
| `Experience Unsaved` | Unsave tapped | `experience_id`, `title` | `experience-detail.tsx` |
| `Collection Viewed` | Collection card opened | `collection_id`, `name` | `browse-collection-card.tsx` |
| `AI Itinerary Generated` | Route returned & save attempted | `name`, `stop_count` | `create/page.tsx` |
| `World Cup Banner Tapped` | Banner card tapped | `experience_id`, `headline` | `world-cup-banner.tsx` |
| `reauth_banner_shown` | Re-auth banner rendered | — | `profile-client.tsx` |
| `token_error` | Token exchange/refresh fails | `step`, `status`, `idle_ms`, `error_message` | `session-refresher.tsx`, `auth/callback/page.tsx` |

**`Page Viewed` path buckets** (`bucketPath`): `/` = Discover · `/plan` =
Explore (map) · `/experience/:id` · `/c/:token` (shared link) · `/users/:id` ·
plus literal paths `/create`, `/saved`, `/onboarding`, `/profile`, etc.

**Identify traits:** `$email`, `$name` (set on opt-in when `user.id` present).

---

## 2. Funnel A — Core consumption loop *(the flow to get perfect)*

The load-bearing loop: land → browse → open → save. This is the one to obsess over.

```
1. App Opened
2. Page Viewed            where path = "/"            (reached Discover)
3. Experience Viewed                                  (opened a detail)
4. Experience Saved                                   (saved it)
```

- **Counting:** unique users, per session, 1-day window.
- **Segment by:** `platform`; new vs. returning; `entry_path`.
- **What each drop tells you:**
  - 1→2 low → landing/auth wall before Discover (cross-check §4).
  - 2→3 low → **feed isn't converting** (cold-start / weak cards / thin coverage — §5).
  - 3→4 low → detail page isn't compelling enough to save.
- **Companion metric:** `Experience Unsaved` / `Experience Saved` ratio = save regret.

---

## 3. Funnel B — AI Create *(marquee flow, biggest blind spots)*

```
1. Page Viewed        where path = "/create"          (opened Create)
2. AI Itinerary Generated                             (got a route back)
3. Experience Saved                                   (kept it)
```

Blind between 1 and 2 today. `create/page.tsx` has an AI-consent gate
(`limelii_ai_consent`) and a "Failed to save route" path, **none of which emit
events**. So a drop from 1→2 can't be attributed to consent-decline vs.
chat-abandon vs. generation-failure. See gaps §7.

- **Segment by:** `stop_count` on `AI Itinerary Generated` (do 2-stop routes
  save worse than 4-stop?).

---

## 4. Funnel C — Auth / session reliability *(the friction I flagged)*

Not a conversion funnel — a **failure-rate monitor**. This is the clearest
signal in the code that session/re-auth hurts.

- **`reauth_banner_shown` rate** = banners ÷ `App Opened` (per user, weekly).
- **`token_error` breakdown** by `step` (`foreground_refresh` vs.
  `auth_callback_exchange`) and `status`. Watch `idle_ms` distribution — long
  idle → cookie expiry; short idle → exchange bug.
- **Cookie-loss cohort:** `App Opened` with `hasKindeRefresh = false`. Build a
  funnel `App Opened (hasKindeRefresh=false)` → `token_error` → `reauth_banner_shown`
  to quantify WKWebView dropping the long-lived cookie between sessions.
- **Impact link:** compare Funnel A completion for users who hit `token_error`
  in-session vs. those who didn't — turns "auth is annoying" into a lost-saves number.

---

## 5. Funnel D — Content coverage / cold-start *(thin-content hypothesis)*

```
Session with Page Viewed "/"   →   at least one Experience Viewed
```

Sessions that reach Discover but view **zero** experiences = the feed showed
nothing worth tapping. That's your coverage/cold-start drop-off, measurable today.

**Gap that limits it:** `Experience Viewed`/`Saved` carry only `experience_id` +
`title` — **no `neighborhood`/`borough`**. Add those (§7) to slice conversion by
area and prove the "sparse outside covered neighborhoods" theory.

---

## 6. Funnel E — Share-link virality

```
1. Page Viewed         where path = "/c/:token"       (landed on a shared link)
2. App Opened / sign-in                               (converted to a session)
3. Experience Saved                                   (activated)
```

Measures whether sharing pulls in and activates new users — the cheapest growth
loop the app already has. `/c/:token` is bucketed, so step 1 works today.

---

## 7. Instrumentation gaps to close (ranked)

Add these `track()` calls to make the funnels above whole:

1. **Create-flow steps** (unblocks Funnel B): `Consent Accepted` / `Consent Declined`,
   `Create Chat Started`, `Itinerary Generation Failed` (the "Failed to save route" branch).
2. **`neighborhood` + `borough` on `Experience Viewed` / `Experience Saved`**
   (unblocks Funnel D coverage slicing).
3. **`Experience Save Failed`** — `experience-detail.tsx` swallows save/unsave
   errors in `catch {}`; you can't see failed saves today.
4. **Onboarding step events** + `Sign Up Completed` — no visibility into the
   first-run funnel that precedes Funnel A.
5. **`Share Initiated` / `Share Link Created`** — the *supply* side of Funnel E
   is currently invisible; only inbound landings are tracked.

---

## 8. Dashboard layout

- **Board 1 — Activation:** Funnel A, split web vs. native. Headline = session
  save-rate. This is the number to move.
- **Board 2 — Create:** Funnel B + `AI Itinerary Generated` volume by `stop_count`.
- **Board 3 — Auth health:** Funnel C monitors + the lost-saves impact link.
- **Board 4 — Coverage & virality:** Funnel D and Funnel E side by side.

Every board carries the §0 caveat banner: *native = ATT-authorized users only.*

---

## 9. Free-plan UI walkthrough (no API)

The Query API — and therefore `scripts/mixpanel-funnels.mjs` — needs a **paid
plan**; on the free plan every call returns HTTP 402. Everything below is built
in the **web UI**, which is free. Nothing here needs Service Account credentials.

All times are project timezone (**US/Pacific** for this project). Use a date
range starting at the project's first data day (**2026-04-22**) until you have
enough volume to narrow it.

### 9.0 — Sanity check first: which events are landing?

This is the free equivalent of `--events`. Do this before building any funnel —
if events are missing or near-zero, funnels can't help yet.

1. Left nav → **Board** (or **Reports → Insights**) → **+ New** → **Insights**.
2. Under **Metrics**, click **+ Select event** and add **each** event once:
   `App Opened`, `Page Viewed`, `Experience Viewed`, `Experience Saved`,
   `Experience Unsaved`, `Collection Viewed`, `AI Itinerary Generated`,
   `World Cup Banner Tapped`, `reauth_banner_shown`, `token_error`.
3. Measurement: **Total** (count of events).
4. Date range (top right): **Apr 22 2026 → today**.
5. Chart type: switch to **Bar** or **Table** for a clean count list.
6. Optional: **Breakdown → `platform`** to see web vs. native split.

Read: any event at **0** = that code path isn't firing / not reached. Compare
`Experience Viewed` vs `Experience Saved` for a first save-rate feel.

### 9.1 — The four funnels

**Reports → Funnels → + New Funnel.** Add events as ordered steps; for a step
that needs a filter, click the **filter icon on that step** and set the `where`.
For all four: set **Conversion window** (top of report) to **1 day**, date range
**Apr 22 2026 → today**, optional **Breakdown → `platform`**, then **Save**.

| Funnel | Steps (in order) | Step filter |
|---|---|---|
| **A · Core loop** | `App Opened` → `Page Viewed` → `Experience Viewed` → `Experience Saved` | on `Page Viewed`: `path` **equals** `/` |
| **B · AI Create** | `Page Viewed` → `AI Itinerary Generated` → `Experience Saved` | on `Page Viewed`: `path` **equals** `/create` |
| **D · Coverage** | `Page Viewed` → `Experience Viewed` | on `Page Viewed`: `path` **equals** `/` |
| **E · Share link** | `Page Viewed` → `Experience Viewed` → `Experience Saved` | on `Page Viewed`: `path` **equals** `/c/:token` |

**Auth health (Funnel C)** isn't a funnel — build it as **Insights**:
`token_error` **Total**, broken down by `step`; plus `reauth_banner_shown`
Total. Watch these as rates against `App Opened`.

### 9.2 — Getting the numbers out

Per report: **⋯ menu → Export → CSV**, or just screenshot the funnel bars.
Either is enough to read the drop-offs — share it and we go from there.
