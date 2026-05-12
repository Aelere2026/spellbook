import { prisma, Session } from "./util/prisma"
import { TRPCError } from "@trpc/server"
import * as crypt from "./cryptography"
import * as log from "./util/log"
import * as time from "./util/time"

const ADMIN_UID = -1 // Should probably never change this
const sessionCache = new Map<string, Session>()


export async function validateSession(cookies: string) {
    const token = cookies.split(";")
        .map(cookie => cookie.trim())
        .find(cookie => cookie.startsWith("session-token="))
        ?.replace("session-token=", "")
    if (!token) {
        throw new TRPCError({ code: "UNAUTHORIZED" })
    }

    let session: Session | undefined
    let hashedToken: string | undefined

    if (!sessionCache.has(token)) {
        hashedToken = crypt.quickHash(token)
        session = await prisma.session.findFirst({
            where: {
                hashedToken
            }
        }) ?? undefined


        if (!session) {
            log.debug("Invalid login token!")
            throw new TRPCError({ code: "UNAUTHORIZED" })
        }

        sessionCache.set(token, session)
    }

    session = session ?? sessionCache.get(token)!

    // If the session is expired, remove it from the database and cache
    if (time.isExpired(session)) {
        log.debug("Sesion token expired!")
        sessionCache.delete(token)
        await prisma.session.deleteMany({
            where: {
                hashedToken: hashedToken ?? await crypt.hash(token)
            }
        })
        throw new TRPCError({ code: "UNAUTHORIZED" })
    }

    return {
        sessionId: session.id,
        userId: session.userId
    }
}

async function createSession(userId: number): Promise<string> {
    const token = crypt.generateToken()

    const session = await prisma.session.create({
        data: {
            userId,
            hashedToken: crypt.quickHash(token),
            expiration: time.later(30)
        }
    })

    sessionCache.set(token, session)

    return token
}

export async function login(name: string, password: string): Promise<string> {
    const user = await prisma.user.findUnique({
        where: { name }
    })

    if (!await crypt.verify(password, user?.hashedPassword)) {
        throw new TRPCError({ code: "UNAUTHORIZED" })
    }

    return await createSession(user!.id)
}

export async function signoutUser(userId: number): Promise<void> {
    const sessions = await prisma.session.findMany({
        select: { hashedToken: true },
        where: { userId }
    })
    await prisma.session.deleteMany({ where: { userId } })

    for (const session of sessions) {
        sessionCache.delete(session.hashedToken)
    }
}

export async function signoutSession(sessionId: number): Promise<void> {
    try {
        const session = await prisma.session.delete({
            select: { hashedToken: true },
            where: { id: sessionId }
        })
        sessionCache.delete(session.hashedToken)
    } catch (err) { }
}

export async function changePassword(userId: number, oldPassword: string, newPassword: string): Promise<boolean> {
    await signoutUser(userId)

    const user = await prisma.user.findUnique({
        select: { hashedPassword: true },
        where: { id: userId }
    })

    if (!crypt.verify(oldPassword, user?.hashedPassword)) {
        return false
    }

    await prisma.user.update({
        where: { id: userId },
        data: { hashedPassword: await crypt.hash(newPassword) }
    })

    return true
}

export async function checkInvite(token: string): Promise<string | null> {
    const invite = await prisma.invite.findFirst({
        select: { name: true },
        where: { hashedToken: await crypt.hash(token) }
    })

    return invite?.name ?? null
}

export async function signup(token: string, password: string): Promise<string | null> {
    const invite = await prisma.invite.findFirst({
        where: { hashedToken: await crypt.hash(token) }
    })

    if (!invite) {
        throw new TRPCError({ code: "UNAUTHORIZED" })
    }

    const user = await prisma.user.create({
        data: {
            name: invite.name,
            hashedPassword: await crypt.hash(password)
        }
    })

    await prisma.invite.delete({ where: { id: invite.id } })

    return createSession(user.id)
}

export async function invite(name: string): Promise<string | null> {

    // Make sure no users aready have that name
    if (await prisma.user.findUnique({ where: { name } })) {
        throw new TRPCError({ code: "UNAUTHORIZED" })
    }

    // Revoke old invite if it already exists
    if (await prisma.invite.findUnique({ where: { name } })) {
        await revokeInvite(name)
    }

    const token = crypt.generateToken()

    await prisma.invite.create({
        data: {
            name,
            hashedToken: await crypt.hash(token),
            expiration: time.later(30)
        }
    })

    log.info(`Signup token: ${token}`)
    return token
}

export async function removeUser(userId: number): Promise<boolean> {
    if (userId === ADMIN_UID) {
        return false
    }

    await signoutUser(userId)
    try {
        await prisma.user.delete({ where: { id: userId } })
        return true
    } catch (err) {
        return false
    }
}

export async function revokeInvite(name: string): Promise<boolean> {
    try {
        await prisma.invite.delete({ where: { name } })
        return true
    } catch (err) {
        return false
    }
}

export function isAdmin(userId: number): boolean {
    return userId === ADMIN_UID
}

export async function initAdmin(): Promise<boolean> {
    if (await prisma.user.findUnique({ where: { id: ADMIN_UID } })) {
        return false
    }

    log.info("No admin account... creating one!")

    const name = `SpellbookAdmin-${crypt.generateToken(4)}`
    const password = crypt.generateToken(32)

    await prisma.user.create({
        data: {
            id: ADMIN_UID,
            name,
            hashedPassword: await crypt.hash(password)
        }
    })

    log.warn("Save the following information. It cannot be retrieved!!!")
    log.warn(`Admin username: ${name}`)
    log.warn(`Admin password: ${password}`)
    return true
}