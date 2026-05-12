import { prisma } from "./util/prisma"
import * as log from "./util/log"
import * as time from "./util/time"
import {
    calcPresetShares,
    detectArbitrage,
    type ArbOpportunity,
    type PriceQuote,
} from "./arbitrage/detection"
import { getPreferencesOrDefault, UserPreferences } from "./trpc/preferencesRouter"

// ─── Config ────────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 5_000
const userPreferencesCache = new Map<number, UserPreferences>()

export async function updateUserPreferencesCache(userId: number, preferences: UserPreferences) {
    userPreferencesCache.set(userId, preferences)
}

async function loadUserPreferences(): Promise<void> {
    const users = await prisma.user.findMany({
        select: {
            id: true,
        }
    })

    await Promise.all(users.map(async (user) => {
        userPreferencesCache.set(user.id, await getPreferencesOrDefault(user.id))
    }))
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
        )
        if (!res.ok) {
            log.info(`Kalshi error ${ticker}: ${res.status} ${res.statusText}`)
            return null
        }
        const data = await res.json()
        const market = data.market
        if (!market) return null

        // Use ask prices — what we actually pay as takers
        const yesAsk = Number(market.yes_ask_dollars ?? 0)
        const noAsk = Number(market.no_ask_dollars ?? 0)

        if (yesAsk <= 0 || noAsk <= 0) return null
        return { yes: yesAsk, no: noAsk }
    } catch (err) {
        log.info(`Kalshi fetch failed ${ticker}: ${err}`)
        return null
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
        )
        if (!res.ok) {
            log.info(`Polymarket error ${conditionId}: ${res.status}`)
            return null
        }
        const market = await res.json()
        if (!market?.tokens || market.tokens.length < 2) return null

        const yesToken = market.tokens.find((t: any) => t.outcome === "Yes")
        const noToken = market.tokens.find((t: any) => t.outcome === "No")
        if (!yesToken || !noToken) return null

        const [yesPrice, noPrice] = await Promise.all([
            fetchPolymarketAskPrice(yesToken.token_id),
            fetchPolymarketAskPrice(noToken.token_id),
        ])

        if (yesPrice === null || noPrice === null) return null
        return { yes: yesPrice, no: noPrice }
    } catch (err) {
        log.info(`Polymarket fetch failed ${conditionId}: ${err}`)
        return null
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
        )
        if (!res.ok) return null
        const book = await res.json()

        const bestAsk = book.asks?.[book.bids.length - 1]?.price
        const bestBid = book.bids?.[book.bids.length - 1]?.price

        if (bestAsk !== undefined) return Number(bestAsk)
        if (bestBid !== undefined) return Number(bestBid)
        return null
    } catch {
        return null
    }
}

// ─── Persist to DB ─────────────────────────────────────────────────────────

async function persistArbitrage(userId: number, shares: number, opp: ArbOpportunity): Promise<void> {
    await prisma.arbitrage.create({
        data: {
            userId,
            matchId: opp.matchId,
            yesPrice: opp.yesPrice,
            noPrice: opp.noPrice,
            polymarketYes: opp.polymarketYes,
            grossProfit: opp.grossProfit,
            totalFee: opp.totalFee,
            estimatedSlippage: opp.estimatedSlippage,
            netProfit: opp.netProfit,
            shares,
            detectionTime: time.now(),
            executionTime: time.now(),
        },
    })
}

// ─── Main Loop ─────────────────────────────────────────────────────────────

export async function run(): Promise<void> {
    await loadUserPreferences()
    log.info("Arbitrage detector starting...")

    while (true) {
        try {
            const matches = await prisma.match.findMany({
                include: {
                    polymarketMarket: true,
                    kalshiMarket: true,
                },
            })

            //log.info(`Checking ${matches.length} matched pairs... [mode: ${usePresetAlgorithm ? `preset(max=${maxShares})` : `manual(${manualShares})`}] [resolution: ${resolutionStart} → ${resolutionEnd}]`)
            let opportunitiesFound = 0

            let count = 0
            for (const match of matches) {
                // Use the later of the two resolution dates as the market's effective resolution date
                const marketResDate = new Date(Math.max(
                    match.kalshiMarket.resolutionDate.getTime(),
                    match.polymarketMarket.resolutionDate.getTime(),
                ))

                const kalshiApiId = match.kalshiMarket.apiId
                const polymarketApiId = match.polymarketMarket.apiId

                // Fee rate comes from DB — stored by market-matching from Polymarket's feeSchedule
                const polyFeeRate = match.polymarketMarket.fee.toNumber()

                const [kalshiPrices, polyPrices] = await Promise.all([
                    fetchKalshiPrices(kalshiApiId),
                    fetchPolymarketPrices(polymarketApiId),
                ])

                if (!kalshiPrices || !polyPrices) continue

                // Log first 3 matches for debugging
                if (count < 3) {
                    log.info(`Match ${match.id} | K(ask)=${JSON.stringify(kalshiPrices)} P(ask)=${JSON.stringify(polyPrices)} polyFeeRate=${polyFeeRate}`)
                    count++
                }

                // Estimate best gross profit for preset share calculation
                const grossEstimate = Math.max(
                    1 - polyPrices.yes - kalshiPrices.no,
                    1 - polyPrices.no - kalshiPrices.yes,
                    0
                )
                const opp = detectArbitrage(match.id, polyPrices, kalshiPrices, polyFeeRate)
                if (!opp) {
                    continue
                }

                opportunitiesFound++
                log.info(
                    `ARB FOUND | match=${match.id} | ` +
                    `net=${opp.netProfit.toFixed(4)} | ` +
                    `fee=${opp.totalFee.toFixed(4)} | polyFeeRate=${polyFeeRate} | ` +
                    `YES(${opp.polymarketYes ? "poly" : "kalshi"})=${opp.yesPrice.toFixed(3)} ` +
                    `NO(${opp.polymarketYes ? "kalshi" : "poly"})=${opp.noPrice.toFixed(3)}`
                )

                userPreferencesCache.forEach((preferences, userId) => {
                    const { resolutionStart, resolutionEnd, usePresetAlgorithm, maxShares, manualShares } = preferences

                    if (time.isEarlierThan(marketResDate, resolutionStart)) return
                    if (time.isLaterThan(marketResDate, resolutionEnd)) return

                    const shares = usePresetAlgorithm
                        ? calcPresetShares(grossEstimate, maxShares)
                        : manualShares

                    persistArbitrage(userId, shares, opp)
                })
            }

            log.info(`Scan complete. Found ${opportunitiesFound} opportunities.`)
        } catch (err) {
            log.info(`Detector error: ${err}`)
        }

        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))
    }
}
