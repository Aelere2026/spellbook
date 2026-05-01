import { z } from "zod"

import { router, publicProcedure, userProcedure, adminProcedure } from "./trpc"
import * as auth from "../auth"

const authRouter = router({
    login: publicProcedure
        .input(
            z.object({
                name: z.string(),
                password: z.string()
            }),
        )
        .query(async ({ input }) => {
            return await auth.login(input.name, input.password)
        }),
    signup: publicProcedure
        .input(
            z.object({
                token: z.string(),
                password: z.string()
            }),
        )
        .query(async ({ input }) => {
            return await auth.signup(input.token, input.password)
        }),
    signout: userProcedure
        .input(
            z.object({
                allSessions: z.boolean(),
            }),
        )
        .query(async ({ ctx, input }) => {
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
        .query(async ({ ctx, input }) => {
            return await auth.changePassword(ctx.data.userId, input.oldPassword, input.newPassword)
        }),
    invite: adminProcedure
        .input(
            z.object({
                name: z.string()
            }),
        )
        .query(async ({ input }) => {
            return await auth.invite(input.name)
        }),
    revokeInvite: adminProcedure
        .input(
            z.object({
                name: z.string()
            }),
        )
        .query(async ({ input }) => {
            return await auth.revokeInvite(input.name)
        }),
    removeOwnUser: userProcedure
        .query(async ({ ctx }) => {
            return await auth.removeUser(ctx.data.userId)
        }),
    removeUser: adminProcedure
        .input(
            z.object({
                userId: z.number()
            }),
        )
        .query(async ({ input }) => {
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
        })
})

export default authRouter
