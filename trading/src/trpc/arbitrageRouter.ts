import { publicProcedure, router } from "./trpc"
import { prisma } from "src/util/prisma"
import { tracked } from "@trpc/server"
import { z } from "zod"


const arbitrageRouter = router({
    get: publicProcedure
        .query(async () => {
            return await prisma.arbitrage.findMany()
        }),
    search: publicProcedure
        .input(z.object({
            category: z.string()
        }))
        .query(async (opts) => {
            return await prisma.arbitrage.findMany({
                orderBy: {
                    detectionTime: "desc"
                }
            })
        }),
    onMarketAdd: publicProcedure
        .input(z.object({
            lastEventId: z.coerce.date().nullish(),
        }))
        .subscription(async function* (opts) {
            let lastEventId = opts.input?.lastEventId ?? null
            while (!opts.signal!.aborted) {
                const arbitrages = await prisma.arbitrage.findMany({
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
                for (const arbitrage of arbitrages) {
                    yield tracked(arbitrage.createdAt.toJSON(), arbitrage)
                    lastEventId = arbitrage.createdAt
                }
                await new Promise((resolve) => setTimeout(resolve, 1000))
            }
        }),
})


export default arbitrageRouter