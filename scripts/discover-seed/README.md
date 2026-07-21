# Discover seed

Adds new **experiences** to the existing Discover categories and adds three new
**categories** — **Date Night**, **Late Night**, **Budget-Friendly** — to the
Discover screen.

Discover content lives in the Xano backend (served by `GET /discovery`), not in
this repo, so seeding writes to Xano through two admin endpoints rather than
changing any app code.

## Files

| File                      | What it is                                                        |
|---------------------------|-------------------------------------------------------------------|
| `seed-data.json`          | The categories + experiences to create. Edit this to add more.    |
| `seed-discover.mjs`       | Node script that creates the categories, then the experiences.    |
| `classify-experiences.mjs`| Auto-sorts existing experiences into a category from their tags/title. |
| `ENDPOINTS.md`            | The Xano write endpoints you must expose first, with specs.       |

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

## Auto-classifying experiences into categories

`category_id` is the only thing that puts an experience on a Discover shelf, and
it's a single value — each experience lives in exactly one category. Rather than
hand-picking that per row, `classify-experiences.mjs` reads each experience and
assigns the single best-fitting category from signals it already carries: the
**title/description** text, its **activities**/place types, and the **budget**
field. (`time_of_day` is empty across the dataset, so text does the heavy
lifting.)

```bash
# preview the proposed mapping (no secret, no writes)
node scripts/discover-seed/classify-experiences.mjs --dry-run

# apply it
SEED_ADMIN_SECRET='your-secret' node scripts/discover-seed/classify-experiences.mjs

# also re-sort Good For Groups + Cultural (still never touches editorial picks)
SEED_ADMIN_SECRET='your-secret' node scripts/discover-seed/classify-experiences.mjs --all
```

Behaviour:

- **Scope (default):** only touches experiences that are *unclassified* —
  `category_id` 0/null or in a category named **Other**/**Uncategorized**. This
  backfills the pool of experiences that aren't on any shelf yet. `--all` also
  re-sorts Good For Groups + Cultural Experiences.
- **Editorial is protected:** experiences in **Staff Picks** or **Hidden Gems**
  are never moved, and the classifier never assigns *to* those two (they can't be
  derived from tags — they're curated by hand).
- **Conservative:** if nothing scores above the confidence threshold, the
  experience is left where it is rather than force-fit into a wrong shelf.
- **Tunable:** the category keyword lists and weights live at the top of
  `classify-experiences.mjs`. Edit them and re-run `--dry-run` to see the effect.
  It ensures the three new categories exist (creating any that are missing), so
  it can run standalone or after `seed-discover.mjs`.

It uses `PATCH /admin/experiences/{id}` (see `ENDPOINTS.md`) to set `category_id`.

## Adding more later

Append objects to the `experiences` array in `seed-data.json` (reference
existing `places.id` values), or add to `categories`, then re-run. Remove
entries you've already inserted so you don't duplicate them.
