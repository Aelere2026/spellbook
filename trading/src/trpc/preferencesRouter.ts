import { userProcedure, router } from "./trpc"
import { prisma } from "../util/prisma"
import { Prisma, User } from "../../prisma/generated/client"
import { z } from "zod"
import { later } from "../auth"

export type UserPreferences = {
    usePresetAlgorithm: boolean,
    manualShares: number,
    maxShares: number
    resolutionStart: Date,
    resolutionEnd: Date
}

const APIKeysValidator = z.object({
    polymarket: z.object({
        iv: z.string()
    }).optional(),
    kalshi: z.object({
        iv: z.string()
    }).optional(),
    discord: z.object({
        iv: z.string(),
        webhookUrl: z.string()
    }).optional(),
    sendgrid: z.object({
        iv: z.string(),
        key: z.string(),
        recipient: z.string()
    }).optional(),
    slack: z.object({
        iv: z.string(),
        webhookUrl: z.string()
    }).optional(),
    twilio: z.object({
        iv: z.string(),
        sid: z.string(),
        authToken: z.string()
    }).optional()
})
type APIKeys = z.infer<typeof APIKeysValidator>


async function getPreferences(userId: number): Promise<Partial<UserPreferences>> {
    let rawPreferences = await prisma.user.findUnique({
        select: { preferences: true },
        where: { id: userId }
    })

    // TODO: is any of this type casting okay? need to test but can't without the page :/
    let preferences
    if (!rawPreferences) {
        return {}
    } else {
        return (rawPreferences.preferences as Prisma.JsonObject)
    }
}

async function getPreferencesOrDefault(userId: number): Promise<UserPreferences> {
    const prefs = await getPreferences(userId)

    return {
        usePresetAlgorithm: prefs.usePresetAlgorithm as boolean ?? true,
        manualShares: prefs.manualShares as number ?? 1,
        maxShares: prefs.maxShares as number ?? 1,
        resolutionStart: new Date(prefs.resolutionStart ?? later(0)),
        resolutionEnd: new Date(prefs.resolutionStart ?? later(30))
    }
}

const configRouter = router({
    // Get current bot preferences
    getPreferences: userProcedure.query(async ({ ctx }) => {
        return await getPreferences(ctx.data.userId)
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
    updateKeys: userProcedure
        .input(APIKeysValidator)
        .mutation(async ({ ctx, input }) => {
            const userId = ctx.data.userId
            // return await prisma.user.update({

            // })
        }),
})

export default configRouter