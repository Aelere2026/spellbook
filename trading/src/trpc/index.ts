import { router } from "./trpc"
import marketRouter from "./marketRouter"
import platformRouter from "./platformRouter"
import arbitrageRouter from "./arbitrageRouter"


export const appRouter = router({
    markets: marketRouter,
    platforms: platformRouter, 
    arbitrages: arbitrageRouter
})

export type AppRouter = typeof appRouter