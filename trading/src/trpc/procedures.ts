import { t } from "./index"
import { TRPCError } from "@trpc/server"

export const publicProcedure = t.procedure
export const protectedProcedure = t.procedure.use(
    async function isAuthed(opts) {
        const { ctx } = opts
        if (!ctx.user) {
            throw new TRPCError({ code: "UNAUTHORIZED" })
        }

        return opts.next({ ctx })
    }
)