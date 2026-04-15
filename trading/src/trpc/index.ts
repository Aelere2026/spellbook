import { router } from "./trpc"
import marketRouter from "./marketRouter"
import platformRouter from "./platformRouter"
import arbitrageRouter from "./arbitrageRouter"
import matchRouter from "./matchRouter"
import configRouter from "./configRouter"



export const appRouter = router({
    markets: marketRouter,
    platforms: platformRouter,
    arbitrages: arbitrageRouter,
    matches: matchRouter,
    config: configRouter,
})

export type AppRouter = typeof appRouter