from __future__ import annotations

import os
from datetime import datetime
from pathlib import Path

import psycopg2
from dotenv import load_dotenv

from matchers.match import MatchResult
from normalizers.models import NormalizedMarket

# Load DATABASE_URL from secrets files if not already in environment
_SECRETS_DIR = Path(__file__).parent.parent / "secrets"
for _env_file in ("bot.env", "postgres.env", ".env"):
    _path = _SECRETS_DIR / _env_file
    if _path.exists():
        load_dotenv(_path)
load_dotenv()  # also try .env in cwd


def get_connection():
    url = os.environ["DATABASE_URL"]
    return psycopg2.connect(url)


def ensure_platforms(cur) -> dict[str, int]:
    """Upsert Polymarket and Kalshi platform rows; return {name: id}."""
    platforms = {
        "polymarket": "0.02",
        "kalshi": "0.00",
    }
    ids: dict[str, int] = {}
    for name, fee in platforms.items():
        cur.execute('SELECT id FROM "Platform" WHERE name = %s', (name,))
        row = cur.fetchone()
        if row:
            ids[name] = row[0]
            cur.execute(
                'UPDATE "Platform" SET base_fee = %s WHERE id = %s',
                (fee, row[0]),
            )
        else:
            cur.execute(
                'INSERT INTO "Platform" (name, base_fee) VALUES (%s, %s) RETURNING id',
                (name, fee),
            )
            ids[name] = cur.fetchone()[0]
    return ids


def upsert_market(cur, market: NormalizedMarket, platform_db_id: int) -> int:
    """Return the DB id for this market, inserting or updating as needed."""
    now = datetime.now()
    event_date      = market.close_time or now
    resolution_date = market.resolution_date or market.close_time or now
    category = market.event_title or market.series_title or "Uncategorized"

    cur.execute(
        'SELECT id FROM "Market" WHERE platform_id = %s AND api_id = %s',
        (platform_db_id, market.platform_id),
    )
    row = cur.fetchone()
    if row:
        market_id = row[0]
        cur.execute(
            """
            UPDATE "Market"
               SET title = %s, event_date = %s, resolution_date = %s, category = %s
             WHERE id = %s
            """,
            (market.title, event_date, resolution_date, category, market_id),
        )
        return market_id

    cur.execute(
        """
        INSERT INTO "Market"
            (platform_id, api_id, title, event_date, resolution_date, status, fee, category)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id
        """,
        (
            platform_db_id,
            market.platform_id,
            market.title,
            event_date,
            resolution_date,
            "open",
            0,
            category,
        ),
    )
    return cur.fetchone()[0]


def upsert_match(cur, kalshi_db_id: int, poly_db_id: int, score: float) -> None:
    # If this exact pair already exists, update the score in place (preserves createdAt).
    cur.execute(
        'SELECT id FROM "Match" WHERE kalshi_id = %s AND polymarket_id = %s',
        (kalshi_db_id, poly_db_id),
    )
    if cur.fetchone():
        cur.execute(
            'UPDATE "Match" SET match_score = %s WHERE kalshi_id = %s AND polymarket_id = %s',
            (score, kalshi_db_id, poly_db_id),
        )
        return
    # Remove stale rows where either market is now paired with a different partner.
    cur.execute(
        'DELETE FROM "Match" WHERE kalshi_id = %s OR polymarket_id = %s',
        (kalshi_db_id, poly_db_id),
    )
    cur.execute(
        'INSERT INTO "Match" (polymarket_id, kalshi_id, match_score) VALUES (%s, %s, %s)',
        (poly_db_id, kalshi_db_id, score),
    )


def persist_matches(matches: list[MatchResult]) -> int:
    """Persist all matches to the DB; returns the count of upserted matches."""
    if not matches:
        return 0

    conn = get_connection()
    try:
        with conn:
            with conn.cursor() as cur:
                platform_ids = ensure_platforms(cur)
                count = 0
                for m in matches:
                    poly_db_id = upsert_market(cur, m.polymarket, platform_ids["polymarket"])
                    kalshi_db_id = upsert_market(cur, m.kalshi, platform_ids["kalshi"])
                    upsert_match(cur, kalshi_db_id, poly_db_id, m.score)
                    count += 1
        return count
    finally:
        conn.close()
