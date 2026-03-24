
WITH polymarket_rows AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY id) AS rn
  FROM "Market"
  WHERE platform_id = 1
),
kalshi_rows AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY id) AS rn
  FROM "Market"
  WHERE platform_id = 2
)
INSERT INTO "Match" ("polymarket_id", "kalshi_id", "match_score")
SELECT
  pm.id,
  k.id,
  ROUND((0.82 + RANDOM() * 0.17)::numeric, 2)::double precision
FROM polymarket_rows pm
JOIN kalshi_rows k
  ON pm.rn = k.rn
LIMIT 10
ON CONFLICT DO NOTHING;

SELECT * FROM "Match" ORDER BY id;
