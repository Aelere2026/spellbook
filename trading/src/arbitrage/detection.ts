export const SLIPPAGE_ESTIMATE = 0.005; // 0.5% per side = 1% total
export const MIN_NET_PROFIT = 0.001;

export interface PriceQuote {
  yes: number;
  no: number;
}

export interface ArbOpportunity {
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
 * Kalshi taker fee: 0.07 x price x (1 - price)
 * Probability-weighted, peaking at 50 cents and near zero at extremes.
 */
export function kalshiTakerFee(price: number): number {
  return 0.07 * price * (1 - price);
}

/**
 * Polymarket taker fee: rate x price x (1 - price)
 * Rate comes from the DB via feeSchedule.rate in market-matching.
 */
export function polymarketTakerFee(price: number, rate: number): number {
  return rate * price * (1 - price);
}

/**
 * Preset algorithm: shares scale linearly with edge percentage.
 * Formula: floor(edgePct / 0.01) * 10, capped at maxShares.
 */
export function calcPresetShares(grossProfit: number, maxShares: number): number {
  const shares = Math.floor(grossProfit / 0.01) * 10;
  return Math.min(Math.max(shares, 1), maxShares);
}

/**
 * Check both arbitrage combinations using ask prices and probability-weighted fees.
 * polyFeeRate comes from the DB feeSchedule.rate stored by market-matching.
 */
export function detectArbitrage(
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

    const kalshiFee = c.polymarketYes
      ? kalshiTakerFee(c.noPrice)
      : kalshiTakerFee(c.yesPrice);

    const polyFee = c.polymarketYes
      ? polymarketTakerFee(c.yesPrice, polyFeeRate)
      : polymarketTakerFee(c.noPrice, polyFeeRate);

    const totalFee = kalshiFee + polyFee;
    const estimatedSlippage = SLIPPAGE_ESTIMATE * 2;
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
