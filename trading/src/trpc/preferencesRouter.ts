import { userProcedure, router } from "./trpc"
import { prisma } from "../util/prisma"
import { Prisma, User } from "../../prisma/generated/client"
import { z } from "zod"
import * as time from "../util/time"
import * as log from "../util/log"
import { APIKeysValidator, setKey } from "../cryptography"
import { updateUserPreferencesCache } from "../detector"

export type UserPreferences = {
    usePresetAlgorithm: boolean,
    manualShares: number,
    maxShares: number
    resolutionStart: Date,
    resolutionEnd: Date
}

async function getPreferences(userId: number): Promise<Partial<UserPreferences>> {
    let rawPreferences = await prisma.user.findUnique({
        select: { preferences: true },
        where: { id: userId }
    })

    let preferences
    if (!rawPreferences?.preferences) {
        return {}
    } else {
        return (rawPreferences.preferences as Prisma.JsonObject)
    }
}

export async function getPreferencesOrDefault(userId: number): Promise<UserPreferences> {
    const prefs = await getPreferences(userId)
    return addDefaultPreferences(prefs)
}

function addDefaultPreferences(prefs: Partial<UserPreferences>): UserPreferences {
    return {
        usePresetAlgorithm: prefs.usePresetAlgorithm as boolean ?? true,
        manualShares: prefs.manualShares as number ?? 1,
        maxShares: prefs.maxShares as number ?? 1,
        resolutionStart: new Date(prefs.resolutionStart ?? time.now()),
        resolutionEnd: new Date(prefs.resolutionStart ?? time.later(30))
    }
}

const preferencesRouter = router({
    // Get current bot preferences
    getPreferences: userProcedure.query(async ({ ctx }) => {
        return await getPreferencesOrDefault(ctx.data.userId)
    }),
    // Update bot preferences
    updatePreferences: userProcedure
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
            const prefs = await getPreferences(userId)
            const updatedPrefs = {
                usePresetAlgorithm: input.usePresetAlgorithm ?? prefs.usePresetAlgorithm,
                manualShares: input.manualShares ?? prefs.manualShares,
                maxShares: input.maxShares ?? prefs.manualShares,
                resolutionStart: input.resolutionStart ?? prefs.resolutionStart,
                resolutionEnd: input.resolutionEnd ?? prefs.resolutionEnd
            }
            updateUserPreferencesCache(ctx.data.userId, addDefaultPreferences(updatedPrefs))
            return await prisma.user.update({
                where: { id: userId },
                data: {
                    preferences: updatedPrefs
                }
            })
        }),
    updateKeys: userProcedure
        .input(APIKeysValidator)
        .mutation(async ({ ctx, input }) => {
            const userId = ctx.data.userId

            let success = true
            if (input.polymarket) success &&= await setKey({ platform: "polymarket", ...input.polymarket }, userId)
            if (input.kalshi) success &&= await setKey({ platform: "kalshi", ...input.kalshi }, userId)
            if (input.discord) success &&= await setKey({ platform: "discord", ...input.discord }, userId)
            if (input.sendGrid) success &&= await setKey({ platform: "sendGrid", ...input.sendGrid }, userId)
            if (input.slack) success &&= await setKey({ platform: "slack", ...input.slack }, userId)
            if (input.twilio) success &&= await setKey({ platform: "twilio", ...input.twilio }, userId)

            return success
        }),
})

export default preferencesRouter