"""Usage: python3 overlap.py drafts/*.json -> lists drafts that share 2 or more stops.

Checks drafts against each other and, when xano_dump.json is present, against
every public experience. Helper agents draft in parallel and can't see each
other's picks, and public experiences show on the map even without a category,
so swap or drop one of each pair before inserting.
"""
import itertools
import json
import os
import sys

drafts = [d for f in sys.argv[1:] for d in json.load(open(f))]
for a, b in itertools.combinations(drafts, 2):
    shared = len(set(a["places_id"]) & set(b["places_id"]))
    if shared >= 2:
        print(f"{shared} shared: {a['title']} ({a['proposed_category']}) / {b['title']} ({b['proposed_category']})")

if os.path.exists("xano_dump.json"):
    live = [e for e in json.load(open("xano_dump.json"))["experiences"] if e["access"] == "public"]
    for d in drafts:
        for e in live:
            shared = len(set(d["places_id"]) & set(e["places_id"] or []))
            if shared >= 2:
                print(f"{shared} shared with live #{e['id']} {e['title']}: {d['title']} ({d['proposed_category']})")
