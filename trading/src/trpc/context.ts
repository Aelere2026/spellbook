import type { CreateExpressContextOptions } from "@trpc/server/adapters/express"
import * as log from "../util/log"

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

    try {
        return {
            data: {
                ...await validateSession(cookie),
                res
            },
            auth: true as const
        }
    } catch (err) {
        log.warn("Session validation failed!")
        return FAIL
    }


}
export type Context = Awaited<ReturnType<typeof createContext>>