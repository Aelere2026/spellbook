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
    resolutionStart: Date | null,
    resolutionEnd: Date | null
}

/**
 * Finds a list of a given user's preferences, should they happen to be set.
 * @param userId - The user's id
 * @returns The user's preferences
 */
async function getPreferences(userId: number): Promise<Partial<UserPreferences>> {
    let rawPreferences = await prisma.user.findUnique({
        select: { preferences: true },
        where: { id: userId }
    })

    if (!rawPreferences?.preferences) {
        return {}
    } else {
        return (rawPreferences.preferences as Prisma.JsonObject)
    }
}

/**
 * Finds's a given user's preferences, inserting default values should some be missing.
 * @param userId - The user's id.
 * @returns The user's preferences.
 */
export async function getPreferencesOrDefault(userId: number): Promise<UserPreferences> {
    const prefs = await getPreferences(userId)
    return addDefaultPreferences(prefs)
}


/**
 * Updates a partial list of preferences to include default values.
 * @param prefs - A list of partial user preferences.
 * @returns The user's preferences.
 */
function addDefaultPreferences(prefs: Partial<UserPreferences>): UserPreferences {
    return {
        usePresetAlgorithm: prefs.usePresetAlgorithm ?? true,
        manualShares: prefs.manualShares ?? 1,
        maxShares: prefs.maxShares ?? 1,
        resolutionStart: !prefs.resolutionStart ? null : prefs.resolutionStart,
        resolutionEnd: !prefs.resolutionEnd ? null : prefs.resolutionEnd
    }
}

/**
 * Creates a tPRC router to query / update a user's preferences.
 * It additionally allows updating, but not retrieving, API keys.
 *
 * **Endpoint Summary:**
 * - **[USER]:** getPreferences - Returs a given user's preferences
 * - **[USER]:** updateKeys - Updates a given user's keys.
 * - **[USER]:** updatePreferences - Updates a given user's preferences.
 */
const preferencesRouter = router({
    getPreferences: userProcedure.query(async ({ ctx }) => {
        return await getPreferencesOrDefault(ctx.data.userId)
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
                resolutionStart: input.resolutionStart === undefined ? prefs.resolutionStart : input.resolutionStart,
                resolutionEnd: input.resolutionEnd === undefined ? prefs.resolutionEnd : input.resolutionEnd
            }
            updateUserPreferencesCache(ctx.data.userId, addDefaultPreferences(updatedPrefs))
            return await prisma.user.update({
                where: { id: userId },
                data: {
                    preferences: updatedPrefs
                }
            })
        }),
})

export default preferencesRouter