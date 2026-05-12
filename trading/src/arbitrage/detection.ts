export const SLIPPAGE_ESTIMATE = 0.005 // 0.5% per side = 1% total
export const MIN_NET_PROFIT = 0.001
import { Arbitrage } from "../util/prisma"
import * as time from "../util/time"
import Decimal from "decimal.js"

export interface PriceQuote {
    yes: Decimal
    no: Decimal
}

// These id and createdAt are added automatically in the DB
export type ArbOpportunity = Omit<Arbitrage, "userId" | "shares" | "id" | "createdAt">

// Chat is this real
const one = new Decimal(1)
/**
 * Kalshi taker fee: 0.07 * price * (1 - price)
 * Probability-weighted, peaking at 50 cents and near zero at extremes.
 */
export function kalshiTakerFee(price: Decimal): Decimal {
    return price.times(0.07).times(one.minus(price))
}

/**
 * Polymarket taker fee: rate * price * (1 - price)
 * Rate comes from the DB via feeSchedule.rate in market-matching.
 */
export function polymarketTakerFee(price: Decimal, rate: Decimal): Decimal {
    return price.times(rate).times(one.minus(price))
}

/**
 * Preset algorithm: shares scale linearly with edge percentage.
 * Formula: floor(edgePct / 0.01) * 10, capped at maxShares.
 */
export function calcPresetShares(grossProfit: Decimal, maxShares: number): number {
    return grossProfit.dividedBy(0.01).floor().times(10).clamp(1, maxShares).toNumber()
}

/**
 * Check both arbitrage combinations using ask prices and probability-weighted fees.
 * polyFeeRate comes from the DB feeSchedule.rate stored by market-matching.
 */
export function detectArbitrage(
    matchId: number,
    polyPrices: PriceQuote,
    kalshiPrices: PriceQuote,
    polyFeeRate: Decimal,
): ArbOpportunity | null {
    const candidates = [
        { yesPrice: polyPrices.yes, noPrice: kalshiPrices.no, polymarketYes: true },
        { yesPrice: kalshiPrices.yes, noPrice: polyPrices.no, polymarketYes: false },
    ]

    let best: ArbOpportunity | null = null

    for (const c of candidates) {
        const grossProfit = one.minus(c.yesPrice).minus(c.noPrice)

        const kalshiFee = c.polymarketYes
            ? kalshiTakerFee(c.noPrice)
            : kalshiTakerFee(c.yesPrice)

        const polyFee = c.polymarketYes
            ? polymarketTakerFee(c.yesPrice, polyFeeRate)
            : polymarketTakerFee(c.noPrice, polyFeeRate)

        const totalFee = kalshiFee.plus(polyFee)
        const estimatedSlippage = new Decimal(SLIPPAGE_ESTIMATE * 2)
        const netProfit = grossProfit.minus(totalFee).minus(estimatedSlippage)

        if (netProfit.greaterThan(MIN_NET_PROFIT)) {
            if (!best || best.netProfit.lessThan(netProfit)) {
                best = {
                    detectionTime: time.now(),
                    executionTime: time.now(),
                    matchId,
                    yesPrice: c.yesPrice,
                    noPrice: c.noPrice,
                    polymarketYes: c.polymarketYes,
                    grossProfit: grossProfit,
                    totalFee,
                    estimatedSlippage,
                    netProfit,
                }
            }
        }
    }

    return best
}
