export const SLIPPAGE_ESTIMATE = 0.005 // 0.5% per side = 1% total
export const MIN_NET_PROFIT = 0.001
import { Arbitrage } from "../util/prisma"
import * as time from "../util/time"
import { Prisma } from "../../prisma/generated/client"

// numbers are nicer to deal with than Decimals (also like 15-20x faster!)
type ReplaceDecimalWithNumber<T> = {
    [K in keyof T]: T[K] extends Prisma.Decimal ? number : T[K];
}

export interface PriceQuote {
    yes: number
    no: number
}

// These id and createdAt are added automatically in the DB
export type ArbOpportunity = ReplaceDecimalWithNumber<Omit<Arbitrage, "userId" | "shares" | "id" | "createdAt">>

// Chat is this real
/**
 * Kalshi taker fee: 0.07 * price * (1 - price)
 * Probability-weighted, peaking at 50 cents and near zero at extremes.
 */
export function kalshiTakerFee(price: number): number {
    return 0.07 * price * (1 - price)
}

/**
 * Polymarket taker fee: rate * price * (1 - price)
 * Rate comes from the DB via feeSchedule.rate in market-matching.
 */
export function polymarketTakerFee(price: number, rate: number): number {
    return rate * price * (1 - price)
}

/**
 * Preset algorithm: shares scale linearly with edge percentage.
 * Formula: floor(edgePct / 0.01) * 10, capped at maxShares.
 */
export function calcPresetShares(grossProfit: number, maxShares: number): number {
    const shares = Math.floor(grossProfit * 100) * 10
    return Math.min(Math.max(shares, 1), maxShares)
}

/**
 * Check both arbitrage combinations using ask prices and probability-weighted fees.
 * polyFeeRate comes from the DB feeSchedule.rate stored by market-matching.
 */
export function detectArbitrage(
    matchId: number,
    polyPrices: PriceQuote,
    kalshiPrices: PriceQuote,
    polyFeeRate: number,
): ArbOpportunity | null {
    const candidates = [
        { yesPrice: polyPrices.yes, noPrice: kalshiPrices.no, polymarketYes: true },
        { yesPrice: kalshiPrices.yes, noPrice: polyPrices.no, polymarketYes: false },
    ]

    let best: ArbOpportunity | null = null

    for (const c of candidates) {
        const grossProfit = 1 - c.yesPrice - c.noPrice

        const kalshiFee = c.polymarketYes
            ? kalshiTakerFee(c.noPrice)
            : kalshiTakerFee(c.yesPrice)

        const polyFee = c.polymarketYes
            ? polymarketTakerFee(c.yesPrice, polyFeeRate)
            : polymarketTakerFee(c.noPrice, polyFeeRate)

        const totalFee = kalshiFee + polyFee
        const estimatedSlippage = SLIPPAGE_ESTIMATE * 2
        const netProfit = grossProfit - totalFee - estimatedSlippage

        if (netProfit > MIN_NET_PROFIT) {
            if (!best || best.netProfit < netProfit) {
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
