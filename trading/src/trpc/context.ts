import type { CreateExpressContextOptions } from "@trpc/server/adapters/express"

import { validateSession } from "../auth"

const FAIL = { data: null }
export async function createContext({ req, res }: CreateExpressContextOptions) {
    const auth = req.headers.authorization
    if (!auth) {
        return FAIL
    }

    const sessionInfo = await validateSession(auth)
    if (!sessionInfo) {
        return FAIL
    }

    return {
        data: {
            ...sessionInfo
        }
    }
}
export type Context = Awaited<ReturnType<typeof createContext>>