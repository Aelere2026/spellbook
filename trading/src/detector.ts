import { prisma } from "./util/prisma";
import * as log from "./util/log";

// ─── Config ────────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 5_000; // how often to check prices
const SLIPPAGE_ESTIMATE = 0.005; // 0.5% estimated slippage per side
const MIN_NET_PROFIT = 0.001; // ignore opportunities below this threshold

let KALSHI_FEE = 0;
let POLYMARKET_FEE = 0;

// get the fees from stored values in database in case they change ever
async function loadPlatformFees(): Promise<void> {
  const platforms = await prisma.platform.findMany();

  const poly = platforms.find((p) => p.id === 1);
  const kal = platforms.find((p) => p.id === 2);

  if (!poly || !kal) {
    KALSHI_FEE = 0.00;
    POLYMARKET_FEE = 0.02;
    throw new Error("Could not find platform fee records");
  }

  POLYMARKET_FEE = Number(poly.baseFee);
  KALSHI_FEE = Number(kal.baseFee);
}

// ─── Types ─────────────────────────────────────────────────────────────────

interface PriceQuote {
  yes: number; // price of YES share (0–1)
  no: number;  // price of NO share (0–1)
}

interface PriceQuoteWithFee extends PriceQuote {
  feeRate: number; // dynamic fee rate from Polymarket
}

// ─── Price Fetchers ────────────────────────────────────────────────────────

/**
 * Fetch live YES/NO prices from Kalshi for a given market ticker.
 * Kalshi REST API: GET /trade-api/v2/markets/{ticker}
 */
async function fetchKalshiPrices(ticker: string): Promise<PriceQuote | null> {
  try {
    const res = await fetch(
      `https://api.elections.kalshi.com/trade-api/v2/markets/${ticker}`
    );
    if (!res.ok) {
      log.info(`Kalshi error ${ticker}: ${res.status} ${res.statusText}`);
      return null;
    }
    const data = await res.json();
    const market = data.market;
    if (!market) return null;

    // Kalshi returns yes_bid_dollars, yes_ask_dollars — we use mid-price
    const yesBid = Number(market.yes_bid_dollars ?? 0);
    const yesAsk = Number(market.yes_ask_dollars ?? 0);
    const yesMid = (yesBid + yesAsk) / 2;

    const noBid = Number(market.no_bid_dollars ?? 0);
    const noAsk = Number(market.no_ask_dollars ?? 0);
    const noMid = (noBid + noAsk) / 2;

    if (yesMid <= 0 || noMid <= 0) return null;
    return { yes: yesMid, no: noMid };
  } catch (err) {
    log.info(`Kalshi fetch failed ${ticker}: ${err}`);
    return null;
  }
}

/**
 * Fetch the dynamic fee rate from Polymarket for a given token.
 * Polymarket fees are probability-based — highest at 50%, lower at extremes.
 * Falls back to 2% if the fetch fails.
 */
async function fetchPolymarketFeeRate(tokenId: string): Promise<number> {
  try {
    const res = await fetch(
      `https://clob.polymarket.com/fee-rate?token_id=${tokenId}`
    );
    if (!res.ok) return 0.02;
    const data = await res.json();
    return Number(data.maker_fee_rate ?? data.fee_rate ?? 0.02);
  } catch {
    return 0.02;
  }
}

/**
 * Fetch live YES/NO prices from Polymarket CLOB API for a given conditionId.
 * Also fetches the dynamic fee rate for this specific market.
 */
async function fetchPolymarketPrices(conditionId: string): Promise<PriceQuoteWithFee | null> {
  try {
    const res = await fetch(
      `https://clob.polymarket.com/markets/${conditionId}`
    );
    if (!res.ok) {
      log.info(`Polymarket error ${conditionId}: ${res.status}`);
      return null;
    }
    const market = await res.json();
    if (!market?.tokens || market.tokens.length < 2) return null;

    const yesToken = market.tokens.find((t: any) => t.outcome === "Yes");
    const noToken = market.tokens.find((t: any) => t.outcome === "No");
    if (!yesToken || !noToken) return null;

    const [yesPrice, noPrice, feeRate] = await Promise.all([
      fetchPolymarketMidPrice(yesToken.token_id),
      fetchPolymarketMidPrice(noToken.token_id),
      fetchPolymarketFeeRate(yesToken.token_id),
    ]);

    if (yesPrice === null || noPrice === null) return null;
    return { yes: yesPrice, no: noPrice, feeRate };
  } catch (err) {
    log.info(`Polymarket fetch failed ${conditionId}: ${err}`);
    return null;
  }
}

async function fetchPolymarketMidPrice(tokenId: string): Promise<number | null> {
  try {
    const res = await fetch(
      `https://clob.polymarket.com/book?token_id=${tokenId}`
    );
    if (!res.ok) return null;
    const book = await res.json();

    const bestBid = book.bids?.[book.bids.length - 1]?.price; // highest bid
    const bestAsk = book.asks?.[0]?.price;                     // lowest ask

    if (bestBid !== undefined && bestAsk !== undefined) {
      return (Number(bestBid) + Number(bestAsk)) / 2;
    }
    if (bestBid !== undefined) return Number(bestBid);
    if (bestAsk !== undefined) return Number(bestAsk);
    return null;
  } catch {
    return null;
  }
}

// ─── Arbitrage Detection ───────────────────────────────────────────────────

interface ArbOpportunity {
  matchId: number;
  yesPrice: number;       // price of the YES share we buy
  noPrice: number;        // price of the NO share we buy
  polymarketYes: boolean; // true = buy YES on Polymarket, NO on Kalshi
  grossProfit: number;    // 1.00 - yesPrice - noPrice
  totalFee: number;
  estimatedSlippage: number;
  netProfit: number;
}

/**
 * Given prices from both platforms, find the best arbitrage combo.
 * Uses the dynamic Polymarket fee rate for this specific market.
 */
function detectArbitrage(
  matchId: number,
  polyPrices: PriceQuoteWithFee,
  kalshiPrices: PriceQuote
): ArbOpportunity | null {
  const candidates = [
    {
      yesPrice: polyPrices.yes,
      noPrice: kalshiPrices.no,
      polymarketYes: true,
    },
    {
      yesPrice: kalshiPrices.yes,
      noPrice: polyPrices.no,
      polymarketYes: false,
    },
  ];

  let best: ArbOpportunity | null = null;

  for (const c of candidates) {
    const grossProfit = 1.0 - c.yesPrice - c.noPrice;
    const totalFee = KALSHI_FEE + polyPrices.feeRate; // dynamic fee per market
    const estimatedSlippage = SLIPPAGE_ESTIMATE * 2;  // one slippage per side
    const netProfit = grossProfit - totalFee - estimatedSlippage;

    if (netProfit > MIN_NET_PROFIT) {
      if (!best || netProfit > best.netProfit) {
        best = {
          matchId,
          yesPrice: c.yesPrice,
          noPrice: c.noPrice,
          polymarketYes: c.polymarketYes,
          grossProfit,
          totalFee,
          estimatedSlippage,
          netProfit,
        };
      }
    }
  }

  return best;
}

// ─── Persist to DB ─────────────────────────────────────────────────────────

// Every opportunity is saved
async function persistArbitrage(opp: ArbOpportunity): Promise<void> {
  const now = new Date();
  await prisma.arbitrage.create({
    data: {
      matchId: opp.matchId,
      yesPrice: opp.yesPrice,
      noPrice: opp.noPrice,
      polymarketYes: opp.polymarketYes,
      grossProfit: opp.grossProfit,
      totalFee: opp.totalFee,
      estimatedSlippage: opp.estimatedSlippage,
      netProfit: opp.netProfit,
      detectionTime: now,
      executionTime: now, // simulated — no real execution delay
    },
  });
}

// ─── Main Loop ─────────────────────────────────────────────────────────────

async function runDetector(): Promise<void> {
  await loadPlatformFees();
  log.info("Arbitrage detector starting...");

  while (true) {
    try {
      // Load all matched pairs with their market API IDs
      const matches = await prisma.match.findMany({
        include: {
          polymarketMarket: true,
          kalshiMarket: true,
        },
      });

      log.info(`Checking ${matches.length} matched pairs for arbitrage...`);
      let opportunitiesFound = 0;

      for (const match of matches) {
        const kalshiApiId = match.kalshiMarket.apiId;
        const polymarketApiId = match.polymarketMarket.apiId;

        // Fetch live prices from both platforms in parallel
        const [kalshiPrices, polyPrices] = await Promise.all([
          fetchKalshiPrices(kalshiApiId),
          fetchPolymarketPrices(polymarketApiId),
        ]);

        if (!kalshiPrices || !polyPrices) {
          continue;
        }

        // Log first 3 matches for debugging price comparison
        if (match.id <= 3) {
          log.info(`Match ${match.id} | K=${JSON.stringify(kalshiPrices)} P=${JSON.stringify(polyPrices)} fee=${polyPrices.feeRate.toFixed(4)}`);
        }

        const opp = detectArbitrage(match.id, polyPrices, kalshiPrices);

        if (opp) {
          opportunitiesFound++;
          log.info(
            `ARB FOUND | match=${match.id} | net=${opp.netProfit.toFixed(4)} | fee=${opp.totalFee.toFixed(4)} | ` +
            `YES(${opp.polymarketYes ? "poly" : "kalshi"})=${opp.yesPrice.toFixed(3)} ` +
            `NO(${opp.polymarketYes ? "kalshi" : "poly"})=${opp.noPrice.toFixed(3)}`
          );
          await persistArbitrage(opp); // save every opportunity — each = 1 simulated share purchase
        }
      }

      log.info(`Scan complete. Found ${opportunitiesFound} opportunities.`);
    } catch (err) {
      log.info(`Detector error: ${err}`);
    }

    // Wait before next poll
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

// Start the detector
runDetector().catch((err) => {
  log.info(`Fatal error: ${err}`);
  process.exit(1);
});