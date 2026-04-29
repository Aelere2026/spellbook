import type { CreateExpressContextOptions } from "@trpc/server/adapters/express"

import { validateUser } from "../auth"

const FAIL = {
    user: null
}
export async function createContext({ req, res }: CreateExpressContextOptions) {
    const auth = req.headers.authorization
    if (!auth) {
        return FAIL
    }

    const userId = await validateUser(auth)
    if (userId === null) {
        return FAIL
    }

    return {
        user: {
            userId
        }
    }
}
export type Context = Awaited<ReturnType<typeof createContext>>