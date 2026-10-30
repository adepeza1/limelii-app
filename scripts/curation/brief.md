# Drafting brief: limelii curated itineraries (weekly)

You are drafting itineraries for limelii, an NYC app. Your drafts will be reviewed by
the main session and then inserted into Xano as PRIVATE drafts for the owner (Lex) to approve.
**Do not write to Xano or call any Xano URL. Do not edit the repo.** Only write your output file.

## Read first
- Rules: `/home/user/limelii-app/itinerary-rules.md`. Follow Base rules + Curated experiences
  (or Special events for marathon) + Style rules. Style matters: NO dashes of any kind
  (no hyphen used as a dash, no en/em dash) in titles, descriptions or notes; 1 to 2 short
  sentences per stop; sound like a well connected local, not a guidebook.
- Place pool: `pool.json` (built by `build_pool.py`). Every stop and backup MUST be a pool `id`.
  Pool places are operational per Google, have photos and coordinates. Fields: id, name, addr,
  nb (neighborhood), boro, lat, lng, type, sub, price, hours, res (reservation_required),
  cuisine, io, desc, in_live_experiences (how many live experiences already use it).
- **Fresh data:** strongly prefer places with `in_live_experiences == 0`. Never use the same
  place as a stop in two of your drafts.

## Verify
Pool data came from Google months ago. For every place you use as a stop, do one quick web
search (load WebSearch with ToolSearch "select:WebSearch") to confirm it is still open and is
what you think it is (and for Happy Hour, that it has a real happy hour; note days/times).
Drop anything doubtful. Keep searches efficient; batch several in one turn.

## Validate
Run `python3 validate.py drafts/<yourfile>.json` and fix until every draft passes
(3 to 4 stops, each leg <= 0.7 mi, total walk <= ~1.5 mi, no dashes, backups within 0.5 mi).
Distances are straight line x1.25.

## Output
Write a JSON array to `drafts/<yourfile>.json`. Each draft:
```json
{
  "title": "Name that captures the vibe",
  "proposed_category": "Date Night",
  "type": "curated",
  "places_id": [101, 202, 303],
  "description": "Two or three sentences for the whole experience. No dashes.",
  "neighborhood": "West Village",
  "time_of_day": ["Evening"],          // from Morning, Afternoon, Evening, Late Night
  "budget": "$$",                      // $ <20pp, $$ 20 to 50, $$$ >50; excludes alcohol
  "duration_hours": 3,
  "indoor_outdoor": "Indoor",          // Indoor, Outdoor or Mixed
  "rainy_day_swap": null,              // pool id or text if mostly outdoors
  "tags": ["good for groups"],         // from: kid friendly, dog friendly, accessible, good for groups, cash only
  "stops": [
    {"place_id": 101, "note": "One or two short sentences.", "minutes": 60,
     "reservation": false, "backup_place_id": 404, "verified": "2026-10-30"}
  ],
  "sources": ["urls you used to verify"]
}
```
Vary budget, time of day and duration across your set. Mix stop types (cafes, bakeries,
parks, shops, bars), don't just hop restaurants. Start light, build to the main stop, end
somewhere to linger; first two stops should work on their own.

If the pool is missing a place you really want, list it in a separate file
`drafts/<yourfile>.places_to_add.json` as [{"name","address","why"}]; do not use it in a draft.

Final reply: one short paragraph: how many drafts pass validation, anything you dropped and why.
