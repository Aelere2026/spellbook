-- CreateTable
CREATE TABLE "Arbitrage" (
    "id" SERIAL NOT NULL,
    "match_id" INTEGER NOT NULL,
    "net_profit" DECIMAL(65,30) NOT NULL,
    "gross_profit" DECIMAL(65,30) NOT NULL,
    "total_fee" DECIMAL(65,30) NOT NULL,
    "estimaged_slippage" DECIMAL(65,30) NOT NULL,
    "time_deduction" TIMESTAMP(3) NOT NULL,
    "time_execution" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Arbitrage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Market" (
    "id" SERIAL NOT NULL,
    "platform_id" INTEGER NOT NULL,
    "api_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "event_date" TIMESTAMP(3) NOT NULL,
    "resolution_date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "fee" DECIMAL(65,30) NOT NULL,
    "category" TEXT NOT NULL,

    CONSTRAINT "Market_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" SERIAL NOT NULL,
    "polymarket_id" INTEGER NOT NULL,
    "kalshi_id" INTEGER NOT NULL,
    "match_score" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Outcome" (
    "id" SERIAL NOT NULL,
    "market_id" INTEGER NOT NULL,
    "outcome" TEXT NOT NULL,

    CONSTRAINT "Outcome_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Platform" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "base_fee" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "Platform_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Match_polymarket_id_key" ON "Match"("polymarket_id");

-- CreateIndex
CREATE UNIQUE INDEX "Match_kalshi_id_key" ON "Match"("kalshi_id");

-- CreateIndex
CREATE UNIQUE INDEX "Outcome_market_id_key" ON "Outcome"("market_id");

-- AddForeignKey
ALTER TABLE "Arbitrage" ADD CONSTRAINT "Arbitrage_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "Match"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Market" ADD CONSTRAINT "Market_platform_id_fkey" FOREIGN KEY ("platform_id") REFERENCES "Platform"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_polymarket_id_fkey" FOREIGN KEY ("polymarket_id") REFERENCES "Market"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_kalshi_id_fkey" FOREIGN KEY ("kalshi_id") REFERENCES "Market"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Outcome" ADD CONSTRAINT "Outcome_market_id_fkey" FOREIGN KEY ("market_id") REFERENCES "Market"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
