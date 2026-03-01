-- DropForeignKey
ALTER TABLE "Arbitrage" DROP CONSTRAINT "Arbitrage_match_id_fkey";

-- DropForeignKey
ALTER TABLE "Market" DROP CONSTRAINT "Market_platform_id_fkey";

-- DropForeignKey
ALTER TABLE "Match" DROP CONSTRAINT "Match_kalshi_id_fkey";

-- DropForeignKey
ALTER TABLE "Match" DROP CONSTRAINT "Match_polymarket_id_fkey";

-- DropForeignKey
ALTER TABLE "Outcome" DROP CONSTRAINT "Outcome_market_id_fkey";

-- AddForeignKey
ALTER TABLE "Arbitrage" ADD CONSTRAINT "Arbitrage_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Market" ADD CONSTRAINT "Market_platform_id_fkey" FOREIGN KEY ("platform_id") REFERENCES "Platform"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_polymarket_id_fkey" FOREIGN KEY ("polymarket_id") REFERENCES "Market"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_kalshi_id_fkey" FOREIGN KEY ("kalshi_id") REFERENCES "Market"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Outcome" ADD CONSTRAINT "Outcome_market_id_fkey" FOREIGN KEY ("market_id") REFERENCES "Market"("id") ON DELETE CASCADE ON UPDATE CASCADE;
