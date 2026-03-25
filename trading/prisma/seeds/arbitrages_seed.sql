INSERT INTO "Arbitrage"
(
  "match_id",
  "net_profit",
  "gross_profit",
  "total_fee",
  "estimaged_slippage",
  "time_deduction",
  "time_execution",
  "yes_price",
  "no_price",
  "polymarket_yes"
)
SELECT
  seeded.match_id,

  ROUND(
    (
      seeded.contracts * (1 - (seeded.yes_price + seeded.no_price))
      - seeded.total_fee
      - seeded.estimaged_slippage
    )::numeric,
    2
  ) AS net_profit,

  ROUND(
    (seeded.contracts * (1 - (seeded.yes_price + seeded.no_price)))::numeric,
    2
  ) AS gross_profit,

  seeded.total_fee,
  seeded.estimaged_slippage,
  seeded.time_deduction,
  seeded.time_execution,
  seeded.yes_price,
  seeded.no_price,
  seeded.polymarket_yes

FROM (
  SELECT
    m.id AS match_id,

    (20 + FLOOR(RANDOM() * 81))::numeric AS contracts,

    -- total cost < 1 (arbitrage exists)
    ROUND((0.94 + RANDOM() * 0.045)::numeric, 3) AS total_price,

    ROUND((0.35 + RANDOM() * 0.30)::numeric, 3) AS base_yes_price,

    ROUND((0.25 + RANDOM() * 0.20)::numeric, 2) AS total_fee,
    ROUND((0.05 + RANDOM() * 0.20)::numeric, 2) AS estimaged_slippage,

    NOW() - ((RANDOM() * 180)::int || ' minutes')::interval AS time_deduction,
    NOW() - ((RANDOM() * 5)::int || ' minutes')::interval AS time_execution,

    (RANDOM() < 0.5) AS polymarket_yes,

    -- final prices
    LEAST(
      ROUND((0.35 + RANDOM() * 0.30)::numeric, 3),
      ROUND((0.94 + RANDOM() * 0.045)::numeric, 3) - 0.05
    ) AS yes_price,

    ROUND((0.94 + RANDOM() * 0.045)::numeric, 3)
      - LEAST(
          ROUND((0.35 + RANDOM() * 0.30)::numeric, 3),
          ROUND((0.94 + RANDOM() * 0.045)::numeric, 3) - 0.05
        ) AS no_price

  FROM "Match" m
  LEFT JOIN "Arbitrage" a
    ON a.match_id = m.id
  WHERE a.id IS NULL
  LIMIT 30
) AS seeded
WHERE (seeded.yes_price + seeded.no_price) < 1.00;

SELECT * FROM "Arbitrage" ORDER BY id;