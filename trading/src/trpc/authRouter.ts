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
            return ctx.user.id === 0
        })
})

export default authRouter
