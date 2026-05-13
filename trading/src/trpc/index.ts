import arbitrageRouter from "./arbitrageRouter"
import authRouter from "./authRouter"
import preferencesRouter from "./preferencesRouter"
import marketRouter from "./marketRouter"
import matchRouter from "./matchRouter"
import { router } from "./trpc"

/**
 * Bundles the various endpoints into one router.
 *
 * See the comments in each router file for a more in-depth
 * description of their useage.
 */

export { createContext } from "./context"
export const appRouter = router({
    arbitrages: arbitrageRouter,
    auth: authRouter,
    prefs: preferencesRouter,
    markets: marketRouter,
    matches: matchRouter
})
export type AppRouter = typeof appRouter