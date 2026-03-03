import json
from pathlib import Path

FIXTURES = Path(__file__).parent / "fixtures"

from normalizers.polymarket import normalize_polymarket
nm = normalize_polymarket(json.loads((FIXTURES / "polymarket.json").read_text()))
print(nm.title)        # "Will Trump deport less than 250,000?"
print(nm.event_title)  # "How many people will Trump deport in 2025?"
print(nm.close_time)   # 2025-12-31 12:00:00+00:00
print(nm.outcomes)     # ["Yes", "No"]

from normalizers.kalshi import normalize_kalshi
nm = normalize_kalshi(json.loads((FIXTURES / "kalshi.json").read_text()))
print(nm.platform_id)   # "KXMVESPORTSMULTIGAMEEXTENDED-..."
print(nm.title)         # "[MVE] KXMVESPORTSMULTIGAMEEXTENDED-... (24 legs)"
print(nm.close_time)    # 2026-03-06 00:00:00+00:00
