import { userProcedure, router } from "./trpc"
import { prisma } from "../util/prisma"
import { Prisma } from "../../prisma/generated/client"
import { z } from "zod"
import { later } from "../auth"

export type UserPreferences = {
    usePresetAlgorithm: boolean,
    manualShares: number,
    maxShares: number
    resolutionStart: Date,
    resolutionEnd: Date
}

// Ensures a single BotConfig row always exists (id = 1)
async function getPreferences(userId: number): Promise<UserPreferences> {
    let rawPreferences = await prisma.user.findUnique({
        select: { preferences: true },
        where: { id: userId }
    })

    let preferences
    if (!rawPreferences) {
        preferences = {} as Prisma.JsonObject
    } else {
        preferences = rawPreferences.preferences as Prisma.JsonObject
    }

    return {
        usePresetAlgorithm: preferences.usePresetAlgorithm as boolean ?? true,
        manualShares: preferences.manualShares as number ?? 1,
        maxShares: preferences.maxShares as number ?? 1,
        resolutionStart: new Date(preferences.resolutionStart as string) ?? new Date(),
        resolutionEnd: new Date(preferences.resolutionStart as string) ?? later(30)
    }
}

const preferenecsRouter = router({
    // Get current bot preferences
    get: userProcedure.query(async ({ ctx }) => {
        return await getPreferences(ctx.data.userId)
    }),

    // Update bot preferences
    update: userProcedure
        .input(
            z.object({
                usePresetAlgorithm: z.boolean().optional(),
                manualShares: z.number().min(1).max(10000).optional(),
                maxShares: z.number().min(1).max(10000).optional(),
                resolutionStart: z.date().nullable().optional(),
                resolutionEnd: z.date().nullable().optional(),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            const userId = ctx.data.userId
            const preferences = await getPreferences(userId)
            return await prisma.user.update({
                where: { id: userId },
                data: {
                    preferences: {
                        usePresetAlgorithm: input.usePresetAlgorithm ?? preferences.usePresetAlgorithm,
                        manualShares: input.manualShares ?? preferences.manualShares,
                        maxShares: input.maxShares ?? preferences.manualShares,
                        resolutionStart: input.resolutionStart ?? preferences.resolutionStart,
                        resolutionEnd: input.resolutionEnd ?? preferences.resolutionEnd
                    }
                }
            })
        }),
})

export default preferenecsRouter