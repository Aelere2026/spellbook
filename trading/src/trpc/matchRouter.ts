import { tracked } from "@trpc/server"
import { z } from "zod"

import { router, userProcedure } from "./trpc"
import { prisma } from "../util/prisma"

/**
 * Creates a tPRC router to query data about matches.
 *
 * **Endpoint Summary:**
 * - **[USER]:** get - Returns a list of matches.
 * - **[USER]:** onMatchAdd: Creates a subscription that updates whenever a new match is added.
 */
const matchRouter = router({
    get: userProcedure.query(async () => {
        return await prisma.match.findMany()
    }),
    onMatchAdd: userProcedure
        .input(
            z.object({
                lastEventId: z.coerce.date().nullish(),
            }),
        )
        .subscription(async function* (opts) {
            let lastEventId = opts.input?.lastEventId ?? null
            while (!opts.signal!.aborted) {
                const matches = await prisma.match.findMany({
                    where: lastEventId
                        ? {
                            createdAt: {
                                gt: lastEventId,
                            },
                        }
                        : undefined,
                    orderBy: {
                        createdAt: "asc",
                    },
                })
                for (const match of matches) {
                    yield tracked(match.createdAt.toJSON(), match)
                    lastEventId = match.createdAt
                }
                await new Promise((resolve) => setTimeout(resolve, 1000))
            }
        }),
})

export default matchRouter
