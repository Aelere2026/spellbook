import { initTRPC } from "@trpc/server"
import superjson from "superjson"

import { Context } from "./context"
import marketRouter from "./marketRouter"
import platformRouter from "./platformRouter"
import arbitrageRouter from "./arbitrageRouter"
import matchRouter from "./matchRouter"
import configRouter from "./configRouter"


export { createContext } from "./context"

export const t = initTRPC.context<Context>().create({
    transformer: superjson
})
export const router = t.router
export const appRouter = router({
    markets: marketRouter,
    platforms: platformRouter,
    arbitrages: arbitrageRouter,
    matches: matchRouter,
    config: configRouter,
})

export type AppRouter = typeof appRouter