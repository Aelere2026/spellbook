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
        }),
    getUsers: adminProcedure // TODO: pagination?
        .query(async ({ ctx }) => {
            return await prisma.user.findMany({
                orderBy: { name: "asc" }, // TODO: is this the right direction?
                select: {
                    id: true,
                    name: true
                }
            })
        }),
    getInvites: adminProcedure // TODO: pagination?
        .query(async ({ ctx }) => {
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
        .query(async ({ ctx }) => { // TODO: pagination?
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
