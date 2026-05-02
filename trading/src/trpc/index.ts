import arbitrageRouter from "./arbitrageRouter"
import authRouter from "./authRouter"
import preferenecsRouter from "./preferencesRouter"
import marketRouter from "./marketRouter"
import matchRouter from "./matchRouter"

import { router } from "./trpc"

export { createContext } from "./context"

export const appRouter = router({
    arbitrages: arbitrageRouter,
    auth: authRouter,
    config: preferenecsRouter,
    markets: marketRouter,
    matches: matchRouter
})

export type AppRouter = typeof appRouter