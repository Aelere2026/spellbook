/*
  Warnings:

  - Made the column `polymarket_yes` on table `Arbitrage` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Arbitrage" ALTER COLUMN "polymarket_yes" SET NOT NULL;
