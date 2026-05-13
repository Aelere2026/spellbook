import { z } from "zod"

import { router, publicProcedure, userProcedure, adminProcedure } from "./trpc"
import { prisma } from "../util/prisma"
import * as auth from "../auth"

const authRouter = router({
    login: publicProcedure
        .input(
            z.object({
                name: z.string(),
                password: z.string()
            }),
        )
        .mutation(async ({ input, ctx }) => {
            // sign out to prevent session fixation attacks
            if (ctx.auth) {
                await auth.signoutSession(ctx.data.sessionId)
            }

            const token = await auth.login(input.name, input.password)
            ctx.data.res.cookie("session-token", token, {
                maxAge: 60 * 60 * 24 * 30, // 30 Days
                httpOnly: true,
                secure: true,
                sameSite: "strict"
            })
        }),
    signup: publicProcedure
        .input(
            z.object({
                token: z.string(),
                password: z.string()
            }),
        )
        .mutation(async ({ ctx, input }) => {
            const token = await auth.signup(input.token, input.password)
            ctx.data.res.cookie("session-token", token, {
                maxAge: 60 * 60 * 24 * 30, // 30 Days
                httpOnly: true,
                secure: true,
                sameSite: "strict"
            })
        }),
    signout: userProcedure
        .input(
            z.object({
                allSessions: z.boolean(),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            ctx.data.res.set("Clear-Site-Data", "cookies")

            if (input.allSessions) {
                return await auth.signoutUser(ctx.data.userId)
            } else {
                return await auth.signoutSession(ctx.data.sessionId)
            }
        }),
    changePassword: userProcedure
        .input(
            z.object({
                oldPassword: z.string(),
                newPassword: z.string()
            }),
        )
        .mutation(async ({ ctx, input }) => {
            return await auth.changePassword(ctx.data.userId, input.oldPassword, input.newPassword)
        }),
    invite: adminProcedure
        .input(
            z.object({
                name: z.string()
            }),
        )
        .mutation(async ({ input }) => {
            return await auth.invite(input.name)
        }),
    revokeInvite: adminProcedure
        .input(
            z.object({
                name: z.string()
            }),
        )
        .mutation(async ({ input }) => {
            return await auth.revokeInvite(input.name)
        }),
    removeOwnUser: userProcedure
        .mutation(async ({ ctx }) => {
            ctx.data.res.set("Clear-Site-Data", "cookies")
            return await auth.removeUser(ctx.data.userId)
        }),
    removeUser: adminProcedure
        .input(
            z.object({
                userId: z.number()
            }),
        )
        .mutation(async ({ input }) => {
            return await auth.removeUser(input.userId)
        }),
    checkInvite: publicProcedure
        .input(
            z.object({
                token: z.string()
            }),
        )
        .query(async ({ input }) => {
            return await auth.checkInvite(input.token)
        }),
    isAdmin: userProcedure
        .query(async ({ ctx }) => {
            return auth.isAdmin(ctx.data.userId)
        }),
    getUsers: adminProcedure // TODO: pagination?
        .query(async () => {
            return await prisma.user.findMany({
                orderBy: { name: "asc" }, // TODO: is this the right direction?
                select: {
                    id: true,
                    name: true
                }
            })
        }),
    getInvites: adminProcedure // TODO: pagination?
        .query(async () => {
            return await prisma.user.findMany({
                orderBy: { name: "asc" }, // TODO: is this the right direction?
                select: {
                    id: true,
                    name: true,
                    expiration: true
                }
            })
        }),
    getSessions: adminProcedure
        .query(async () => { // TODO: pagination?
            return await prisma.session.findMany({
                orderBy: { userId: "asc" }, // TODO: sort by name? probs would have to do prisma typed raw sql
                select: {
                    id: true,
                    expiration: true
                }
            })
        })
})

export default authRouter