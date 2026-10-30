"""Usage: python3 overlap.py drafts/*.json -> lists drafts that share 2 or more stops.

Helper agents draft in parallel and can't see each other's picks, so run this
before inserting and swap or drop one draft of each pair.
"""
import itertools
import json
import sys

drafts = [d for f in sys.argv[1:] for d in json.load(open(f))]
for a, b in itertools.combinations(drafts, 2):
    shared = len(set(a["places_id"]) & set(b["places_id"]))
    if shared >= 2:
        print(f"{shared} shared: {a['title']} ({a['proposed_category']}) / {b['title']} ({b['proposed_category']})")
