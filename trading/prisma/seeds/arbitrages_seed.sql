
INSERT INTO "Arbitrage"
  ("match_id", "net_profit", "gross_profit", "total_fee", "estimaged_slippage", "time_deduction", "time_execution")
SELECT
  m.id,
  ROUND((2 + RANDOM() * 18)::numeric, 2),        
  ROUND((5 + RANDOM() * 25)::numeric, 2),         
  ROUND((0.25 + RANDOM() * 2.75)::numeric, 2),    
  ROUND((0.10 + RANDOM() * 1.40)::numeric, 2),    
  NOW() - ((RANDOM() * 180)::int || ' minutes')::interval,
  NOW() - ((RANDOM() * 5)::int || ' minutes')::interval
FROM "Match" m
LEFT JOIN "Arbitrage" a
  ON a.match_id = m.id
WHERE a.id IS NULL
LIMIT 20;

SELECT * FROM "Arbitrage" ORDER BY id;
