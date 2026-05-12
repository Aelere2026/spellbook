import arbitrageRouter from "./arbitrageRouter"
import authRouter from "./authRouter"
import preferencesRouter from "./preferencesRouter"
import marketRouter from "./marketRouter"
import matchRouter from "./matchRouter"

import { router } from "./trpc"

export { createContext } from "./context"

export const appRouter = router({
    arbitrages: arbitrageRouter,
    auth: authRouter,
    prefs: preferencesRouter,
    markets: marketRouter,
    matches: matchRouter
})

export type AppRouter = typeof appRouter