"""Integration test for db.py — runs against the real PostgreSQL database."""
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

import psycopg2
from dotenv import load_dotenv

# Load DATABASE_URL the same way db.py does
_SECRETS_DIR = Path(__file__).parent.parent.parent / "secrets"
for _f in ("bot.env", "postgres.env", ".env"):
    _p = _SECRETS_DIR / _f
    if _p.exists():
        load_dotenv(_p)
load_dotenv()

sys.path.insert(0, str(Path(__file__).parent.parent))

from normalizers.models import NormalizedMarket
from matchers.match import MatchResult
from db import persist_matches

# Stable sentinel IDs that won't collide with real data
K_ID = "__TEST_KALSHI__"
P_ID = "__TEST_POLYMARKET__"

T = datetime(2030, 1, 1, tzinfo=timezone.utc)


def make_match(k_id=K_ID, p_id=P_ID, score=95.0) -> MatchResult:
    kalshi = NormalizedMarket(
        platform="kalshi",
        platform_id=k_id,
        title="Will test event happen?",
        description="",
        close_time=T,
        resolution_date=T,
        outcomes=["Yes", "No"],
        event_title="Test Event",
        series_title=None,
    )
    poly = NormalizedMarket(
        platform="polymarket",
        platform_id=p_id,
        title="Will the test event occur?",
        description="",
        close_time=T,
        resolution_date=T,
        outcomes=["Yes", "No"],
        event_title="Test Event",
        series_title=None,
    )
    return MatchResult(kalshi=kalshi, polymarket=poly, score=score)


def cleanup(cur):
    """Remove all test rows by sentinel api_ids."""
    cur.execute('DELETE FROM "Match" WHERE kalshi_id IN '
                '(SELECT id FROM "Market" WHERE api_id = %s)', (K_ID,))
    cur.execute('DELETE FROM "Match" WHERE polymarket_id IN '
                '(SELECT id FROM "Market" WHERE api_id = %s)', (P_ID,))
    cur.execute('DELETE FROM "Market" WHERE api_id IN (%s, %s)', (K_ID, P_ID))


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


# ── Test 1: fresh insert ────────────────────────────────────────────────────
conn = get_conn()
with conn:
    with conn.cursor() as cur:
        cleanup(cur)   # ensure clean slate

saved = persist_matches([make_match()])
assert saved == 1, f"expected 1 saved match, got {saved}"

conn = get_conn()
with conn:
    with conn.cursor() as cur:
        cur.execute('SELECT COUNT(*) FROM "Market" WHERE api_id IN (%s, %s)', (K_ID, P_ID))
        assert cur.fetchone()[0] == 2, "expected 2 Market rows after insert"

        cur.execute(
            'SELECT m.match_score FROM "Match" m '
            'JOIN "Market" km ON km.id = m.kalshi_id '
            'WHERE km.api_id = %s',
            (K_ID,),
        )
        row = cur.fetchone()
        assert row is not None, "Match row not found"
        assert abs(row[0] - 95.0) < 0.01, f"unexpected score: {row[0]}"
conn.close()
print("Test 1 passed: fresh insert")

# ── Test 2: update on re-run (title changes) ───────────────────────────────
updated = make_match(score=88.0)
updated.kalshi.title = "Updated test event title"
updated.polymarket.title = "Updated test event title (poly)"

saved = persist_matches([updated])
assert saved == 1

conn = get_conn()
with conn:
    with conn.cursor() as cur:
        # Still only 2 Market rows (no duplicates)
        cur.execute('SELECT COUNT(*) FROM "Market" WHERE api_id IN (%s, %s)', (K_ID, P_ID))
        assert cur.fetchone()[0] == 2, "duplicate Market rows created on re-run"

        # Title was updated
        cur.execute('SELECT title FROM "Market" WHERE api_id = %s', (K_ID,))
        assert cur.fetchone()[0] == "Updated test event title", "title not updated"

        # Score was updated
        cur.execute(
            'SELECT m.match_score FROM "Match" m '
            'JOIN "Market" km ON km.id = m.kalshi_id '
            'WHERE km.api_id = %s',
            (K_ID,),
        )
        row = cur.fetchone()
        assert abs(row[0] - 88.0) < 0.01, f"score not updated: {row[0]}"
conn.close()
print("Test 2 passed: update on re-run, no duplicates")

# ── Test 3: empty list is a no-op ───────────────────────────────────────────
saved = persist_matches([])
assert saved == 0, "empty list should return 0"
print("Test 3 passed: empty list is a no-op")

# ── Cleanup ─────────────────────────────────────────────────────────────────
conn = get_conn()
with conn:
    with conn.cursor() as cur:
        cleanup(cur)
conn.close()

print("\nAll DB tests passed.")
