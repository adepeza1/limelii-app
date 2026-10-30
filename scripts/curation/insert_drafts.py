"""Insert validated drafts into Xano `experiences` as private, uncategorized rows.

Usage: python3 insert_drafts.py drafts/a.json [drafts/b.json ...]
Writes inserted ids to inserted.json. Proposed category and review details go in Notes.
"""
import datetime
import json
import re
import sys

from validate import check, pool
from xano import call

ADMIN_USER_ID = 36  # limelii Admin, same creator the CSV upload pipeline uses
TODAY = datetime.date.today().isoformat()


def notes_for(d):
    lines = [
        f"DRAFT {TODAY}. Proposed category: {d['proposed_category']}",
        f"Budget {d.get('budget')} | about {d.get('duration_hours')} h | {d.get('indoor_outdoor')}"
        + (f" | tags: {', '.join(d['tags'])}" if d.get("tags") else ""),
    ]
    for k in ("event_date", "start_time", "expires", "mile_markers", "happy_hour_days"):
        if d.get(k):
            lines.append(f"{k.replace('_', ' ')}: {d[k]}")
    if d.get("rainy_day_swap"):
        swap = d["rainy_day_swap"]
        lines.append(f"Rainy day swap: {pool[swap]['name'] if swap in pool else swap}")
    unverified = 0
    for n, s in enumerate(d.get("stops", []), 1):
        p = pool[s["place_id"]]
        backup = pool.get(s.get("backup_place_id"), {}).get("name", "none")
        flags = "reservation needed" if s.get("reservation") else "walk in"
        if not re.match(r"\d{4}-\d{2}-\d{2}", str(s.get("verified") or "")):
            flags += ", NOT VERIFIED OPEN"
            unverified += 1
        lines.append(f"{n}. {p['name']} ({s.get('minutes')} min, {flags}, backup: {backup}). {s.get('note', '')}")
    lines.append(f"Last verified {TODAY}" + (f", except {unverified} stop(s) marked NOT VERIFIED OPEN" if unverified else ""))
    return "\n".join(lines)


def row_for(d):
    places = [pool[i] for i in d["places_id"]]
    activities = sorted({t for p in places for t in p["type"]})
    return {
        "title": d["title"],
        "description": d["description"],
        "creator_user_id": ADMIN_USER_ID,
        "access": "private",
        "status": "done",
        "category_id": 0,
        "places_id": d["places_id"],
        "neighborhoods": sorted({p["nb"] for p in places if p["nb"]}),
        "activities": activities,
        "budget": [d.get("budget") or "NA"],
        "indoor_outdoor": [d.get("indoor_outdoor") or "NA"],
        "time_of_day": d.get("time_of_day") or [],
        "Notes": notes_for(d),
    }


if __name__ == "__main__":
    inserted = []
    for path in sys.argv[1:]:
        for d in json.load(open(path)):
            errs, _ = check(d, d.get("type") == "event")
            if errs:
                print("SKIP", d["title"], errs)
                continue
            r = call("POST", "/table/24/content", row_for(d))
            inserted.append({"id": r["id"], "title": d["title"], "category": d["proposed_category"]})
            print("added", r["id"], d["title"])
    prev = []
    try:
        prev = json.load(open("inserted.json"))
    except FileNotFoundError:
        pass
    json.dump(prev + inserted, open("inserted.json", "w"), indent=1)
