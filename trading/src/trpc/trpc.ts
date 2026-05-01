import { TRPCError } from "@trpc/server"
import { initTRPC } from "@trpc/server"
import superjson from "superjson"
import { Context } from "./context"
import { isAdmin } from "../auth"


export const t = initTRPC.context<Context>().create({
    transformer: superjson
})

export const router = t.router
export const publicProcedure = t.procedure
export const userProcedure = publicProcedure.use(
    async function isAuthed(opts) {
        const { ctx, next } = opts
        if (!ctx.auth) {
            throw new TRPCError({ code: "UNAUTHORIZED" })
        }

        return next({ ctx })
    }
)
export const adminProcedure = userProcedure.use(
    async function isAuthed(opts) {
        const { ctx, next } = opts
        if (!isAdmin(ctx.data.userId)) {
            throw new TRPCError({ code: "UNAUTHORIZED" })
        }

        return next({ ctx })
    }
)