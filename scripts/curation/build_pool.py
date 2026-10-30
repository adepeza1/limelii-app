"""Download experiences, places and saves from Xano and build pool.json.

Usage (from a scratch dir): python3 /path/to/scripts/curation/build_pool.py
Writes xano_dump.json (full backup) and pool.json (open places with photos + coordinates).
"""
import collections
import json

from xano import call

TABLES = {"experiences": 24, "saved_experiences": 36, "locations": 21, "location_details": 28,
          "experiences_categories": 25}


def all_rows(table_id):
    rows, page = [], 1
    while page:
        d = call("GET", f"/table/{table_id}/content?page={page}&per_page=200")
        rows += d["items"]
        page = d.get("nextPage")
    return rows


dump = {name: all_rows(t) for name, t in TABLES.items()}
json.dump(dump, open("xano_dump.json", "w"))

details = {x["id"]: x for x in dump["location_details"]}
live = collections.Counter(
    p for e in dump["experiences"]
    if e["access"] == "public" and not e.get("match_date")
    for p in (e["places_id"] or []))
pool = []
for l in dump["locations"]:
    ld = details.get(l["location_details_id"], {})
    if ld.get("buisness_status") != "OPERATIONAL" or not l.get("latlong") or not l.get("display_images"):
        continue
    pool.append(dict(
        id=l["id"], name=l["name"], addr=l["address"], nb=l["neighborhood"], boro=l["borough"],
        lat=l["latlong"]["data"]["lat"], lng=l["latlong"]["data"]["lng"],
        type=ld.get("location_type") or [], sub=ld.get("location_subtype") or [],
        price=ld.get("price_range"), hours=ld.get("operating_hours"), res=ld.get("reservation_required"),
        cuisine=ld.get("cuisine"), io=ld.get("indoor_outdoor"),
        desc=(ld.get("openai_description") or ld.get("Description") or "")[:200],
        in_live_experiences=live[l["id"]]))
json.dump(pool, open("pool.json", "w"))
print(f"{len(dump['experiences'])} experiences, {len(pool)} usable places")
