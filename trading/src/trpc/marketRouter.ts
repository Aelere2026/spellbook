import { tracked } from "@trpc/server"
import { z } from "zod"

import { router, userProcedure } from "./trpc"
import { prisma } from "../util/prisma"

/**
 * Creates a tPRC router to query data about markets.
 *
 * **Endpoint Summary:**
 * - **[USER]:** get - Returns a list of markets.
 * - **[USER]:** onArbitrageAdd: Creates a subscription that updates whenever a new market is added.
 * - **[USER]:** search - Reurns a list of markets with a given category
 */
const marketRouter = router({
    get: userProcedure
        .query(async () => {
            return await prisma.market.findMany()
        }),
    onMarketAdd: userProcedure
        .input(z.object({
            lastEventId: z.coerce.date().nullish(),
        }))
        .subscription(async function* (opts) {
            let lastEventId = opts.input?.lastEventId ?? null
            while (!opts.signal!.aborted) {
                const markets = await prisma.market.findMany({
                    where: lastEventId
                        ? {
                            createdAt: {
                                gt: lastEventId,
                            }
                        }
                        : undefined,
                    orderBy: {
                        createdAt: 'asc',
                    },
                })
                for (const market of markets) {
                    yield tracked(market.createdAt.toJSON(), market)
                    lastEventId = market.createdAt
                }
                await new Promise((resolve) => setTimeout(resolve, 1000))
            }
        }),
    search: userProcedure
        .input(z.object({
            category: z.string()
        }))
        .query(async (opts) => {
            return await prisma.market.findMany({
                where: {
                    category: opts.input.category
                }
            })
        }),
})


export default marketRouter