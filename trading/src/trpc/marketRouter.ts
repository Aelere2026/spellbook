import { publicProcedure, router } from "./trpc"
import { prisma } from "../util/prisma"
import { tracked } from "@trpc/server"
import { z } from "zod"


const marketRouter = router({
    get: publicProcedure
        .query(async () => {
            return await prisma.market.findMany()
        }),
    search: publicProcedure
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
    onMarketAdd: publicProcedure
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
})


export default marketRouter