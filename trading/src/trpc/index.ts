import { router } from "./trpc"
import marketRouter from "./marketRouter"
import platformRouter from "./platformRouter"

export const appRouter = router({
    markets: marketRouter,
    platforms: platformRouter
})

export type AppRouter = typeof appRouter