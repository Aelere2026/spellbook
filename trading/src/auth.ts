import { prisma, Session } from "./util/prisma"
import { TRPCError } from "@trpc/server"
import * as crypt from "./cryptography"
import * as log from "./util/log"
import * as time from "./util/time"

/*
 * This file contains many utilities used to manage user accounts, sessions, and invites.
 */

/** Should probably never change this, unless you want to add in a system for multiple admin accounts. */
const ADMIN_UID = -1
/** A cache to store sessions in-memory, so they don't need to be retrieved from the database each time. */
const sessionCache = new Map<string, Session>()

/**
 * Checks if a user is connecting with an active session.
 * @param cookies - The user's cookies, containing their session token.
 * @returns The user's id and session id.
 */
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
        hashedToken = crypt.hashToken(token)
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
                hashedToken: hashedToken ?? await crypt.hashPassword(token)
            }
        })
        throw new TRPCError({ code: "UNAUTHORIZED" })
    }

    return {
        sessionId: session.id,
        userId: session.userId
    }
}

/**
 * Creates a new session.
 * @param userId - The user's id.
 * @returns The new session's token.
 */
async function createSession(userId: number): Promise<string> {
    const token = crypt.generateToken()

    const session = await prisma.session.create({
        data: {
            userId,
            hashedToken: crypt.hashToken(token),
            expiration: time.later(30)
        }
    })

    sessionCache.set(token, session)

    return token
}

/**
 * Logs a user into their account, should their credentials be correct.
 * @param name - The user's username.
 * @param password - The user's password.
 * @returns Their new session's token.
 */
export async function login(name: string, password: string): Promise<string> {
    const user = await prisma.user.findUnique({
        where: { name }
    })

    if (!await crypt.verifyPassword(password, user?.hashedPassword)) {
        throw new TRPCError({ code: "UNAUTHORIZED" })
    }

    return await createSession(user!.id)
}

/**
 * Signs a user out from all sessions.
 * @param userId - The user's id.
 */
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

/**
 * Signs a user out from their current session.
 * @param sessionId The session's id.
 */
export async function signoutSession(sessionId: number): Promise<void> {
    try {
        const session = await prisma.session.delete({
            select: { hashedToken: true },
            where: { id: sessionId }
        })
        sessionCache.delete(session.hashedToken)
    } catch (err) { }
}

/**
 * Allows a user to change their password, should their credentials be corrent.
 * @param userId - The user's id.
 * @param oldPassword - The user's old password.
 * @param newPassword - The user's new password.
 * @returns The operation's success.
 */
export async function changePassword(userId: number, oldPassword: string, newPassword: string): Promise<boolean> {
    await signoutUser(userId)

    const user = await prisma.user.findUnique({
        select: { hashedPassword: true },
        where: { id: userId }
    })

    if (!crypt.verifyPassword(oldPassword, user?.hashedPassword)) {
        return false
    }

    await prisma.user.update({
        where: { id: userId },
        data: { hashedPassword: await crypt.hashPassword(newPassword) }
    })

    return true
}

/**
 * Finds the username of an invited user.
 * @param token - The invite's token.
 * @returns The user's username.
 */
export async function checkInvite(token: string): Promise<string | null> {
    const invite = await prisma.invite.findFirst({
        select: { name: true },
        where: { hashedToken: crypt.hashToken(token) }
    })

    return invite?.name ?? null
}

/**
 * Allows a user to create an account, given a valid invite token.
 * @param token - The invite's token.
 * @param password - The user's new password.
 * @returns The new session's token.
 */
export async function signup(token: string, password: string): Promise<string> {
    const invite = await prisma.invite.findFirst({
        where: { hashedToken: crypt.hashToken(token) }
    })

    if (!invite) {
        throw new TRPCError({ code: "UNAUTHORIZED" })
    }

    const user = await prisma.user.create({
        data: {
            name: invite.name,
            hashedPassword: await crypt.hashPassword(password)
        }
    })

    await prisma.invite.delete({ where: { id: invite.id } })

    return await createSession(user.id)
}

/**
 * Allows an admin to create an invite.
 * @param name - The invited user's name.
 * @returns The new invite's token.
 */
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
            hashedToken: crypt.hashToken(token),
            expiration: time.later(30)
        }
    })

    log.info(`Signup token: ${token}`)
    return token
}

/**
 * Allows an admin to remove a user from the system.
 * @param userId - The user's id.
 * @returns The operation's success.
 */
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

/**
 * Allows an admin to revoke a pending invite.
 * @param name - The invited user's name.
 * @returns The operation's success.
 */
export async function revokeInvite(name: string): Promise<boolean> {
    try {
        await prisma.invite.delete({ where: { name } })
        return true
    } catch (err) {
        return false
    }
}

/**
 * Checks if a given user has admin permissions.
 * Currently, it is only possible to have one admin account.
 * @param userId - A user's id.
 * @returns If the user has admin permssions.
 */
export function isAdmin(userId: number): boolean {
    return userId === ADMIN_UID
}

/**
 * Creates admin accounts, if they don't already exist.
 * Check the logs for credentials
 */
export async function initAdmin() {
    async function createCustomInvite(token: string, username: string, id: number) {
        if (
            await prisma.invite.findUnique({ where: { id } }) ||
            await prisma.user.findUnique({ where: { name: username } })
        ) return
        log.info(`Creating custom invite for ${username}! Use the token: ${token} to create an account.`)
        await prisma.invite.create({
            data: {
                id,
                name: username,
                hashedToken: crypt.hashToken(token),
                expiration: time.later(365)
            }
        })
    }

    // Obviously remove these in a real environment
    createCustomInvite("christo-token-singleuse", "maherasc", -1)
    createCustomInvite("xia-token-singleuse", "xiag", -2)
    createCustomInvite("crain-token-singleuse", "crainm", -3)

    if (await prisma.user.findUnique({ where: { id: ADMIN_UID } })) {
        return
    }

    log.info("No admin account... creating one!")

    const name = `SpellbookAdmin-${crypt.generateToken(4)}`
    const password = crypt.generateToken(32)

    await prisma.user.create({
        data: {
            id: ADMIN_UID,
            name,
            hashedPassword: await crypt.hashPassword(password)
        }
    })

    log.warn("Save the following information. It cannot be retrieved!!!")
    log.warn(`Admin username: ${name}`)
    log.warn(`Admin password: ${password}`)
}