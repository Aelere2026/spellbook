import json
from pathlib import Path

FIXTURES = Path(__file__).parent / "fixtures"

from normalizers.polymarket import normalize_polymarket, parse_dt as parse_poly_dt
nm = normalize_polymarket(json.loads((FIXTURES / "polymarket.json").read_text()))
print(nm.title)        # "Will Trump deport less than 250,000?"
print(nm.event_title)  # "How many people will Trump deport in 2025?"
print(nm.close_time)   # 2025-12-31 12:00:00+00:00
print(nm.outcomes)     # ["Yes", "No"]

from normalizers.kalshi import normalize_kalshi
from normalizers.kalshi import parse_dt as parse_kalshi_dt
nm = normalize_kalshi(json.loads((FIXTURES / "kalshi.json").read_text()))
print(nm.platform_id)   # "KXMVESPORTSMULTIGAMEEXTENDED-..."
print(nm.title)         # "[MVE] KXMVESPORTSMULTIGAMEEXTENDED-... (24 legs)"
print(nm.close_time)    # 2026-03-06 00:00:00+00:00

assert parse_poly_dt(None) is None
assert parse_kalshi_dt(None) is None
