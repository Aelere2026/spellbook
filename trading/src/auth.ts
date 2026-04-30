import { TRPCError } from "@trpc/server"
import * as argon2 from "argon2"

import { prisma, Session } from "./util/prisma"


const sessionCache = new Map<string, Session>()

export async function validateUser(auth: string): Promise<number | null> {
    const token = auth.split(' ')[1]
    if (!token) {
        return null
    }

    let session: Session | undefined
    let hashedToken: string | undefined

    if (!sessionCache.has(token)) {
        hashedToken = await argon2.hash(token)
        session = await prisma.session.findFirst({
            where: {
                hashedToken
            }
        }) ?? undefined

        if (!session) {
            throw new TRPCError({ code: "UNAUTHORIZED" })
        }

        sessionCache.set(token, session)
    }

    session = session ?? sessionCache.get(token)!

    // If the session is expired, remove it from the database and cache
    if (session.expires < new Date(Date.now())) {
        sessionCache.delete(token)

        await prisma.session.deleteMany({
            where: {
                hashedToken: hashedToken ?? await argon2.hash(token)
            }
        })
        throw new TRPCError({ code: "UNAUTHORIZED" })
    }

    return session.userId
}

// const hashedToken = await argon2id.hash(ctx.token)

// let session: Session | null

// } else {
//     session = await prisma.session.findFirst({ where: { hashedToken } })

//     if (!session) {
//         throw new TRPCError({ code: "UNAUTHORIZED" })
//     }

//     sessionCache.set(hashedToken, session)
// }