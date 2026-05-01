import { prisma, Session } from "./util/prisma"
import * as crypt from "./cryptography"

const sessionCache = new Map<string, Session>()

export async function validateUser(auth: string): Promise<number | null> {
    const token = auth.split(' ')[1]
    if (!token) {
        return null
    }

    let session: Session | undefined
    let hashedToken: string | undefined

    if (!sessionCache.has(token)) {
        hashedToken = await crypt.hash(token)
        session = await prisma.session.findFirst({
            where: {
                hashedToken
            }
        }) ?? undefined

        if (!session) {
            return null
        }

        sessionCache.set(token, session)
    }

    session = session ?? sessionCache.get(token)!

    // If the session is expired, remove it from the database and cache
    if (crypt.isExpired(session)) {
        sessionCache.delete(token)
        await prisma.session.deleteMany({
            where: {
                hashedToken: hashedToken ?? await crypt.hash(token)
            }
        })
        return null
    }

    return session.userId
}

async function createSession(userId: number): Promise<string> {
    const token = crypt.generateToken()

    const session = await prisma.session.create({
        data: {
            userId,
            hashedToken: await crypt.hash(token),
            expiration: later(30)
        }
    })

    sessionCache.set(token, session)

    return token
}

export async function login(name: string, password: string): Promise<string | null> {
    const user = await prisma.user.findUnique({
        where: { name }
    })

    if (!await crypt.verify(user?.hashedPassword, password)) {
        return null
    }

    return await createSession(user!.id)
}

export async function checkInvite(token: string): Promise<string | null> {
    const invite = await prisma.invite.findFirst({
        select: { name: true },
        where: { hashedToken: await crypt.hash(token) }
    })

    return invite?.name ?? null
}

export async function signup(token: string, password: string): Promise<boolean> {
    const invite = await prisma.invite.findFirst({
        where: { hashedToken: await crypt.hash(token) }
    })

    if (!invite) {
        return false
    }

    await prisma.user.create({
        data: {
            name: invite.name,
            hashedPassword: await crypt.hash(password)
        }
    })

    await prisma.invite.delete({ where: { id: invite.id } })

    return true
}

export async function invite(name: string): Promise<string | null> {

    // Make sure no users aready have that name
    if (await prisma.user.findUnique({ where: { name } })) {
        return null
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
            expiration: later(30)
        }
    })

    return token
}

export async function removeUser(userId: number): Promise<boolean> {
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

function later(days: number) {
    const later = new Date()
    later.setDate(later.getDate() + days)
    return later
}

