import json
with open("sample_json/polymarket.json") as f:
    raw = json.load(f)

from polymarket import normalize_polymarket
nm = normalize_polymarket(raw)
print(nm.title)        # "Will Trump deport less than 250,000?"
print(nm.event_title)  # "How many people will Trump deport in 2025?"
print(nm.close_time)   # 2025-12-31 12:00:00+00:00
print(nm.outcomes)     # ["Yes", "No"]