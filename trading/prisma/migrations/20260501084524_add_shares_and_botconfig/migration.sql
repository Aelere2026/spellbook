-- AlterTable
ALTER TABLE "Arbitrage" ADD COLUMN     "shares" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "BotConfig" (
    "id" SERIAL NOT NULL,
    "use_preset_algo" BOOLEAN NOT NULL DEFAULT true,
    "manual_shares" INTEGER NOT NULL DEFAULT 1,
    "max_shares" INTEGER NOT NULL DEFAULT 200,

    CONSTRAINT "BotConfig_pkey" PRIMARY KEY ("id")
);
