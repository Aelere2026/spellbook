import { publicProcedure, router } from "./trpc"
import { prisma } from "src/util/prisma"
import { z } from "zod"


// These aren't super useful right now I just wanted to show off how to make them
const marketRouter = router({
    get: publicProcedure
        .query(async () => {
            return prisma.market.findMany()
        }),
    search: publicProcedure
        .input(z.object({
            category: z.string()
        }))
        .query(async (opts) => {
            return prisma.market.findMany({
                where: {
                    category: opts.input.category
                }
            })
        }),
})

export default marketRouter