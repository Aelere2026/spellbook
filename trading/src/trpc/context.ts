import type { CreateExpressContextOptions } from "@trpc/server/adapters/express"

import { validateSession } from "../auth"

export async function createContext({ req, res }: CreateExpressContextOptions) {
    const FAIL = {
        data: { res },
        auth: false as const
    }

    const cookie = req.headers.cookie
    if (!cookie) {
        return FAIL
    }

    const sessionInfo = await validateSession(cookie)
    if (!sessionInfo) {
        return FAIL
    }

    return {
        data: {
            ...sessionInfo,
            res
        },
        auth: true as const
    }
}
export type Context = Awaited<ReturnType<typeof createContext>>