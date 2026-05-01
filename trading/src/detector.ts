import { prisma } from "./util/prisma";
import * as log from "./util/log";
 
// ─── Config ────────────────────────────────────────────────────────────────
 
const POLL_INTERVAL_MS = 5_000;
const SLIPPAGE_ESTIMATE = 0.005; // 0.5% per side = 1% total
const MIN_NET_PROFIT = 0.001;
 
let KALSHI_FEE = 0;
 
async function loadPlatformFees(): Promise<void> {
  const platforms = await prisma.platform.findMany();
  const kal = platforms.find((p) => p.id === 2);
  if (!kal) {
    KALSHI_FEE = 0.00;
    throw new Error("Could not find Kalshi platform fee record");
  }
  KALSHI_FEE = Number(kal.baseFee);
}
 
// ─── Fee Formulas ──────────────────────────────────────────────────────────
 
/**
 * Kalshi taker fee: 0.07 × price × (1 - price)
 * Probability-weighted — peaks at 50¢, near zero at extremes.
 */
function kalshiTakerFee(price: number): number {
  return 0.07 * price * (1 - price);
}
 
/**
 * Polymarket taker fee: rate × price × (1 - price)
 * Rate comes from the DB (stored from feeSchedule.rate in market-matching).
 * e.g. politics = 0.04, sports = 0.03, crypto = 0.072
 */
function polymarketTakerFee(price: number, rate: number): number {
  return rate * price * (1 - price);
}
 
// ─── Volume Logic ──────────────────────────────────────────────────────────
 
/**
 * Preset algorithm: shares scale linearly with edge percentage.
 * Formula: floor(edgePct / 0.01) * 10, capped at maxShares.
 *
 * Examples:
 *   2% edge  → 20 shares
 *   3.5% edge → 35 shares
 *   5% edge  → 50 shares (capped at default max)
 */
function calcPresetShares(grossProfit: number, maxShares: number): number {
  const shares = Math.floor(grossProfit / 0.01) * 10;
  return Math.min(Math.max(shares, 1), maxShares);
}
 
/**
 * Read current bot config from DB.
 * Returns defaults if no config row exists yet.
 * Default max is 50 for realistic order book depth.
 */
async function loadBotConfig(): Promise<{ usePresetAlgo: boolean; manualShares: number; maxShares: number }> {
  try {
    const config = await prisma.botConfig.findFirst();
    if (!config) return { usePresetAlgo: true, manualShares: 1, maxShares: 50 };
    return {
      usePresetAlgo: config.usePresetAlgo,
      manualShares: config.manualShares,
      maxShares: config.maxShares,
    };
  } catch {
    return { usePresetAlgo: true, manualShares: 1, maxShares: 50 };
  }
}
 
// ─── Types ─────────────────────────────────────────────────────────────────
 
interface PriceQuote {
  yes: number;
  no: number;
}
 
// ─── Price Fetchers ────────────────────────────────────────────────────────
 
/**
 * Fetch live YES/NO ask prices from Kalshi.
 * Uses ask price since we are always takers.
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
 
    // Use ask prices — what we actually pay as takers
    const yesAsk = Number(market.yes_ask_dollars ?? 0);
    const noAsk  = Number(market.no_ask_dollars  ?? 0);
 
    if (yesAsk <= 0 || noAsk <= 0) return null;
    return { yes: yesAsk, no: noAsk };
  } catch (err) {
    log.info(`Kalshi fetch failed ${ticker}: ${err}`);
    return null;
  }
}
 
/**
 * Fetch live YES/NO ask prices from Polymarket CLOB.
 * Uses ask price since we are always takers.
 */
async function fetchPolymarketPrices(conditionId: string): Promise<PriceQuote | null> {
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
    const noToken  = market.tokens.find((t: any) => t.outcome === "No");
    if (!yesToken || !noToken) return null;
 
    const [yesPrice, noPrice] = await Promise.all([
      fetchPolymarketAskPrice(yesToken.token_id),
      fetchPolymarketAskPrice(noToken.token_id),
    ]);
 
    if (yesPrice === null || noPrice === null) return null;
    return { yes: yesPrice, no: noPrice };
  } catch (err) {
    log.info(`Polymarket fetch failed ${conditionId}: ${err}`);
    return null;
  }
}
 
/**
 * Fetch the best ask price from Polymarket order book.
 * Falls back to best bid if no ask exists.
 */
async function fetchPolymarketAskPrice(tokenId: string): Promise<number | null> {
  try {
    const res = await fetch(
      `https://clob.polymarket.com/book?token_id=${tokenId}`
    );
    if (!res.ok) return null;
    const book = await res.json();
 
    const bestAsk = book.asks?.[book.bids.length - 1]?.price;
    const bestBid = book.bids?.[book.bids.length - 1]?.price;
 
    if (bestAsk !== undefined) return Number(bestAsk);
    if (bestBid !== undefined) return Number(bestBid);
    return null;
  } catch {
    return null;
  }
}
 
// ─── Arbitrage Detection ───────────────────────────────────────────────────
 
interface ArbOpportunity {
  matchId: number;
  yesPrice: number;
  noPrice: number;
  polymarketYes: boolean;
  grossProfit: number;
  totalFee: number;
  estimatedSlippage: number;
  netProfit: number;
  shares: number;
}
 
/**
 * Check both arb combos using real ask prices and probability-weighted fees.
 * polyFeeRate comes from the DB (feeSchedule.rate stored by market-matching).
 */
function detectArbitrage(
  matchId: number,
  polyPrices: PriceQuote,
  kalshiPrices: PriceQuote,
  shares: number,
  polyFeeRate: number,
): ArbOpportunity | null {
  const candidates = [
    { yesPrice: polyPrices.yes, noPrice: kalshiPrices.no, polymarketYes: true },
    { yesPrice: kalshiPrices.yes, noPrice: polyPrices.no, polymarketYes: false },
  ];
 
  let best: ArbOpportunity | null = null;
 
  for (const c of candidates) {
    const grossProfit = 1.0 - c.yesPrice - c.noPrice;
 
    // Fee on each leg — applied to the price of the share we're buying on that platform
    const kalshiFee = c.polymarketYes
      ? kalshiTakerFee(c.noPrice)   // buying NO on Kalshi
      : kalshiTakerFee(c.yesPrice); // buying YES on Kalshi
 
    const polyFee = c.polymarketYes
      ? polymarketTakerFee(c.yesPrice, polyFeeRate) // buying YES on Poly
      : polymarketTakerFee(c.noPrice, polyFeeRate);  // buying NO on Poly
 
    const totalFee = kalshiFee + polyFee;
    const estimatedSlippage = SLIPPAGE_ESTIMATE * 2; // 1% total
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
          shares,
        };
      }
    }
  }
 
  return best;
}
 
// ─── Persist to DB ─────────────────────────────────────────────────────────
 
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
      shares: opp.shares,
      detectionTime: now,
      executionTime: now,
    },
  });
}
 
// ─── Main Loop ─────────────────────────────────────────────────────────────
 
export async function run(): Promise<void> {
  await loadPlatformFees();
  log.info("Arbitrage detector starting...");
 
  while (true) {
    try {
      const botConfig = await loadBotConfig();
 
      const matches = await prisma.match.findMany({
        include: {
          polymarketMarket: true,
          kalshiMarket: true,
        },
      });
 
      log.info(`Checking ${matches.length} matched pairs... [mode: ${botConfig.usePresetAlgo ? `preset(max=${botConfig.maxShares})` : `manual(${botConfig.manualShares})`}]`);
      let opportunitiesFound = 0;
 
      let count = 0
      for (const match of matches) {
        const kalshiApiId     = match.kalshiMarket.apiId;
        const polymarketApiId = match.polymarketMarket.apiId;
 
        // Fee rate comes from DB — stored by market-matching from Polymarket's feeSchedule
        const polyFeeRate = Number(match.polymarketMarket.fee);
 
        const [kalshiPrices, polyPrices] = await Promise.all([
          fetchKalshiPrices(kalshiApiId),
          fetchPolymarketPrices(polymarketApiId),
        ]);
 
        if (!kalshiPrices || !polyPrices) continue;
 
        // Log first 3 matches for debugging
        if (count < 3) {
          log.info(`Match ${match.id} | K(ask)=${JSON.stringify(kalshiPrices)} P(ask)=${JSON.stringify(polyPrices)} polyFeeRate=${polyFeeRate}`);
          count++
        }
 
        // Estimate best gross profit for preset share calculation
        const grossEstimate = Math.max(
          1.0 - polyPrices.yes - kalshiPrices.no,
          1.0 - kalshiPrices.yes - polyPrices.no,
          0,
        );
 
        const shares = botConfig.usePresetAlgo
          ? calcPresetShares(grossEstimate, botConfig.maxShares)
          : botConfig.manualShares;
 
        const opp = detectArbitrage(match.id, polyPrices, kalshiPrices, shares, polyFeeRate);
 
        if (opp) {
          opportunitiesFound++;
          log.info(
            `ARB FOUND | match=${match.id} | shares=${opp.shares} | ` +
            `net/share=${opp.netProfit.toFixed(4)} | total_net=${(opp.netProfit * opp.shares).toFixed(4)} | ` +
            `fee=${opp.totalFee.toFixed(4)} | polyFeeRate=${polyFeeRate} | ` +
            `YES(${opp.polymarketYes ? "poly" : "kalshi"})=${opp.yesPrice.toFixed(3)} ` +
            `NO(${opp.polymarketYes ? "kalshi" : "poly"})=${opp.noPrice.toFixed(3)}`
          );
          await persistArbitrage(opp);
        }
      }
 
      log.info(`Scan complete. Found ${opportunitiesFound} opportunities.`);
    } catch (err) {
      log.info(`Detector error: ${err}`);
    }
 
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}