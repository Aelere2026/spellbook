import { tracked } from "@trpc/server"
import { z } from "zod"

import { router, userProcedure } from "./trpc"
import { prisma } from "../util/prisma"

const arbitrageRouter = router({
    // Get arbitrages with pagination (100 per page default)
    get: userProcedure
        .input(
            z.object({
                page: z.number().min(1).default(1), // current page number
                limit: z.number().min(1).max(100).default(100), // number of rows returned per page
            }),
        )
        .query(async ({ ctx, input }) => {
            const page = input.page
            const limit = input.limit

            // number of records to skip for pagination
            const skip = (page - 1) * limit

            // fetch current page rows + total row count in parallel
            const [rows, total] = await Promise.all([
                prisma.arbitrage.findMany({
                    where: { userId: ctx.data.userId },
                    orderBy: { detectionTime: "desc" }, // newest trades first
                    skip,
                    take: limit,
                }),

                // total number of arbitrages for total pages
                prisma.arbitrage.count({
                    where: { userId: ctx.data.userId }
                }),
            ])

            return {
                rows,
                total,
                page,

                // used by frontend for pagination controls
                totalPages: Math.ceil(total / limit),
            }
        }),
    // Compute dashboard summary statistics
    stats: userProcedure.query(async ({ ctx }) => {
        const arbitrages = await prisma.arbitrage.findMany({
            where: { userId: ctx.data.userId },
            orderBy: { detectionTime: "asc" } // oldest first for time-series calculations
        })

        // default values if no trades exist
        if (arbitrages.length === 0) {
            return {
                gainLoss: 0,
                opportunities: 0,
                frequency: 0,
                avgTradeTime: 0,
                profit: 0,
                totalFeeLoss: 0,
                avgRoi: 0,
                avgSlippage: 0,
                exposure: 0,
                yesPrice: 0,
                noPrice: 0,
            };
        }

        // aggregate accumulators
        let totalYes = 0;
        let totalNo = 0;

        let gains = 0;
        let losses = 0;
        let totalDurationMs = 0;

        let totalProfit = 0;
        let totalFeeLoss = 0;
        let totalSlippage = 0;
        let totalGrossProfit = 0;
        let totalCapital = 0;
        let totalRoi = 0;

        // initialize time range
        let earliestDetection = arbitrages[0].detectionTime;
        let latestExecution = arbitrages[0].executionTime;

        // iterate through all arbitrages for metrics
        for (const arbitrage of arbitrages) {
            const yesPrice = Number(arbitrage.yesPrice);
            const noPrice = Number(arbitrage.noPrice);
            const netProfit = Number(arbitrage.netProfit);
            const grossProfit = Number(arbitrage.grossProfit);
            const totalFee = Number(arbitrage.totalFee);
            const estimatedSlippage = Number(arbitrage.estimatedSlippage);
            const shares = Number(arbitrage.shares ?? 1);

            // scale all per-share values by shares
            const totalNetProfit = netProfit * shares;
            const totalGross = grossProfit * shares;
            const totalFees = totalFee * shares;
            const totalSlip = estimatedSlippage * shares;

            // capital = what we actually spent per share × shares
            const capital = (yesPrice + noPrice) * shares;

            // count winning vs losing trades
            if (totalNetProfit > 0) gains++;
            if (totalNetProfit < 0) losses++;

            // aggregate scaled values
            totalProfit += totalNetProfit;
            totalFeeLoss += totalFees;
            totalSlippage += totalSlip;
            totalGrossProfit += totalGross;
            totalCapital += capital;

            // ROI per trade: net / capital
            if (capital > 0) {
                totalRoi += (totalNetProfit / capital) * 100;
            }

            const detection = new Date(arbitrage.detectionTime);
            const execution = new Date(arbitrage.executionTime);

            // accumulate trade durations
            totalDurationMs += execution.getTime() - detection.getTime();

            // track earliest opportunity
            if (detection < earliestDetection) {
                earliestDetection = detection;
            }

            // track latest execution
            if (execution > latestExecution) {
                latestExecution = execution;
            }
        }

        // number of opportunities found
        const opportunities = arbitrages.length;

        // gain/loss ratio
        const gainLoss = losses === 0 ? gains : gains / losses;

        // total hours covered by sample
        const totalHours =
            (latestExecution.getTime() - earliestDetection.getTime()) /
            (1000 * 60 * 60);

        // arbitrage opportunities per hour
        const frequency =
            totalHours > 0 ? opportunities / totalHours : opportunities;

        // average execution duration
        const avgTradeTime = totalDurationMs / arbitrages.length;

        // average slippage
        const avgSlippage = totalSlippage / arbitrages.length;

        // gross capital exposure
        const exposure = totalGrossProfit;

        // average return on investment
        const avgRoi = totalRoi / arbitrages.length;

        return {
            gainLoss: Number(gainLoss.toFixed(3)),
            opportunities,
            frequency: Number(frequency.toFixed(3)),
            avgTradeTime: Number(avgTradeTime.toFixed(3)),
            profit: Number(totalProfit.toFixed(3)),
            totalFeeLoss: Number(totalFeeLoss.toFixed(3)),
            avgRoi: Number(avgRoi.toFixed(3)),
            avgSlippage: Number(avgSlippage.toFixed(4)),
            exposure: Number(exposure.toFixed(3)),
        }
    }),
    getById: userProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ input }) => {
            return prisma.arbitrage.findUnique({
                where: { id: input.id },
                include: {
                    match: {
                        include: {
                            polymarketMarket: {
                                include: { platform: true, outcome: true },
                            },
                            kalshiMarket: {
                                include: { platform: true, outcome: true },
                            },
                        },
                    },
                },
            });
        }),
    // Get arbitrages joined with market resolution dates
    getWithMarkets: userProcedure
        .query(async ({ ctx }) => {
            const arbitrages = await prisma.arbitrage.findMany({
                where: { userId: ctx.data.userId },
                orderBy: { detectionTime: "desc" },
                include: {
                    match: {
                        include: {
                            polymarketMarket: {
                                include: { platform: true, outcome: true },
                            },
                            kalshiMarket: {
                                include: { platform: true, outcome: true },
                            },
                        }
                    }
                },
            })

            return arbitrages.map(arbitrage => ({
                ...arbitrage,

                // use whichever market resolves later
                resolutionDate: new Date(
                    Math.max(
                        arbitrage.match.polymarketMarket.resolutionDate.getTime(),
                        arbitrage.match.kalshiMarket.resolutionDate.getTime(),
                    ),
                ),
            }))
        }),
    // Live subscription for newly added arbitrages
    onArbitrageAdd: userProcedure
        .input(
            z.object({
                // last event received by client
                lastEventId: z.coerce.date().nullish(),
            }),
        )
        .subscription(async function* ({ ctx, input, signal, }) {
            let lastEventId = input?.lastEventId ?? null

            // stream updates until client disconnects
            while (!signal!.aborted) {
                const arbitrages = await prisma.arbitrage.findMany({
                    where: {
                        userId: ctx.data.userId,
                        lastEventId: lastEventId ? {
                            createdAt: {
                                // only send newer events
                                gt: lastEventId,
                            },
                        } : undefined,
                    },
                    orderBy: { createdAt: "asc" },
                })

                // yield each new arbitrage event
                for (const arbitrage of arbitrages) {
                    yield tracked(arbitrage.createdAt.toJSON(), arbitrage)
                    lastEventId = arbitrage.createdAt
                }

                // poll every second
                await new Promise((resolve) => setTimeout(resolve, 1000))
            }
        })
})

export default arbitrageRouter