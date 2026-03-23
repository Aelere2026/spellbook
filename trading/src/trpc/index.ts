import { router } from "./trpc"
import marketRouter from "./marketRouter"
import platformRouter from "./platformRouter"
import arbitrageRouter from "./arbitrageRouter"
import matchRouter from "./matchRouter"



export const appRouter = router({
    markets: marketRouter,
    platforms: platformRouter, 
    arbitrages: arbitrageRouter,
    matches: matchRouter,
})

export type AppRouter = typeof appRouter