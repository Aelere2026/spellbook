import { t } from "./index"
import { TRPCError } from "@trpc/server"

export const publicProcedure = t.procedure
export const userProcedure = publicProcedure.use(
    async function isAuthed(opts) {
        const { ctx, next } = opts
        if (!ctx.user) {
            throw new TRPCError({ code: "UNAUTHORIZED" })
        }

        return next({ ctx })
    }
)
export const adminProcedure = userProcedure.use(
    async function isAuthed(opts) {
        const { ctx, next } = opts
        if (ctx.user.id !== 0) {
            throw new TRPCError({ code: "UNAUTHORIZED" })
        }

        return next({ ctx })
    }
)