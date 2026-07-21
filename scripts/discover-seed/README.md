# Discover seed

Adds new **experiences** to the existing Discover categories and adds three new
**categories** — **Date Night**, **Late Night**, **Budget-Friendly** — to the
Discover screen.

Discover content lives in the Xano backend (served by `GET /discovery`), not in
this repo, so seeding writes to Xano through two admin endpoints rather than
changing any app code.

## Files

| File               | What it is                                                        |
|--------------------|-------------------------------------------------------------------|
| `seed-data.json`   | The categories + experiences to create. Edit this to add more.    |
| `seed-discover.mjs`| Node script that creates the categories, then the experiences.    |
| `ENDPOINTS.md`     | The two Xano write endpoints you must expose first, with specs.    |

## What gets added

- **3 categories:** Date Night, Late Night, Budget-Friendly.
- **29 experiences:** 4 each added to Good For Groups, Cultural Experiences,
  Staff Picks, and Hidden Gems (16); 5 for Date Night; 4 each for Late Night and
  Budget-Friendly (13).

Every experience references places **already in your `places` table** (ids taken
from the live `/discovery` response), so no new place records are created.

## Steps

1. **Expose the write endpoints** in Xano — see [`ENDPOINTS.md`](./ENDPOINTS.md).
   Set a shared secret as the Xano env var `ADMIN_SEED_SECRET`.

2. **Preview** (no secret, no writes):

   ```bash
   node scripts/discover-seed/seed-discover.mjs --dry-run
   ```

3. **Run it:**

   ```bash
   SEED_ADMIN_SECRET='your-secret' node scripts/discover-seed/seed-discover.mjs
   ```

The script is idempotent for categories (it reads `/discovery` first and skips
names that already exist). Experiences are always inserted, so run it once —
re-running will create duplicates unless you trim `seed-data.json` first.

### Optional env vars

| Var                    | Default                                   |
|------------------------|-------------------------------------------|
| `SEED_ADMIN_BASE`      | `…/api:58lfyMpE/admin`                    |
| `SEED_READ_BASE`       | `…/api:58lfyMpE` (for the `/discovery` read) |
| `SEED_CURATOR_USER_ID` | `36`                                      |
| `SEED_ACCESS`          | `public`                                  |

## Adding more later

Append objects to the `experiences` array in `seed-data.json` (reference
existing `places.id` values), or add to `categories`, then re-run. Remove
entries you've already inserted so you don't duplicate them.
