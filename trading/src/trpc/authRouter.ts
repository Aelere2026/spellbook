import { z } from "zod"

import { router, publicProcedure, userProcedure, adminProcedure } from "./trpc"
import { prisma } from "../util/prisma"
import * as auth from "../auth"

/**
 * Creates a tPRC router that allows for account, session, and invite management.
 *
 * Endpoint Summary:
 * - **[PUBLIC]:** checkInvite - Checks if an invite token is valid, returns the account name if so.
 * - **[PUBLIC]:** login - Allows a user to log into their account.
 * - **[PUBLIC]:** signup - Allows a user to create an account.
 * - **[USER]:** changePassword - Allows a user to change their password.
 * - **[USER]:** isAdmin - Returns whether or not the user is an admin.
 * - **[USER]:** removeOwnUser - Allows a user to delete their account.
 * - **[USER]:** signout - Removes one/all of a user's session/sessions.
 * - **[ADMIN]:** getInvites - Retursns a list of invites.
 * - **[ADMIN]:** getSessions - Retursns a list of sessions.
 * - **[ADMIN]:** getUsers - Retursns a list of users.
 * - **[ADMIN]:** invite - Creates an invite for a user to sign up.
 * - **[ADMIN]:** removeUser - Allows an admin to remove another user's account
 * - **[ADMIN]:** revokeInvite - Revokes a pending invite.
 */
const authRouter = router({
    checkInvite: publicProcedure
        .input(
            z.object({
                token: z.string()
            }),
        )
        .query(async ({ input }) => {
            return await auth.checkInvite(input.token)
        }),
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
    isAdmin: userProcedure
        .query(async ({ ctx }) => {
            return auth.isAdmin(ctx.data.userId)
        }),
    removeOwnUser: userProcedure
        .mutation(async ({ ctx }) => {
            ctx.data.res.set("Clear-Site-Data", "cookies")
            return await auth.removeUser(ctx.data.userId)
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
    removeUser: adminProcedure
        .input(
            z.object({
                userId: z.number()
            }),
        )
        .mutation(async ({ input }) => {
            return await auth.removeUser(input.userId)
        }),
    revokeInvite: adminProcedure
        .input(
            z.object({
                name: z.string()
            }),
        )
        .mutation(async ({ input }) => {
            return await auth.revokeInvite(input.name)
        })
})

export default authRouter