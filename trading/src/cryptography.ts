import * as argon2 from "argon2"
import * as crypto from "crypto"
import * as z from "zod"
import * as log from "./util/log"
import { prisma } from "./util/prisma"
import { JsonObject } from "@prisma/client/runtime/client"
import path from "path"
import * as fs from "fs"

/*
 * This file contains a number of cryptographic utilities used to safely manage
 * tokens, API keys, and passwords.
 *
 * Tokens have the lowest standard of security, as they're already randomly generated.
 * We use sha256 to hash the tokens, so we don't store them in plaintext
 *
 * API Keys we need to decrypt are encrypted using ChaCha20-Poly1305, a symmetric
 * encryption algorithm. These keys are encrypted at rest, and we currently only
 * decrypt them on the fly. Should this prove to be too slow for trading, you
 * (future developers) might want to cache the decryption results in memory.
 * However, while this is more secure than no enyption, it does provide an additional
 * attack vector.
 *
 * Adapted from https://dev.to/vapourisation/east-encryption-in-typescript-3948.
 *
 * Passwords we do not (and should not be able to!) decrypt, so we can use Argon2 instead.
 * This is an unreversible hash, and is quantum computer resistant! :)
 */

// Constsnts used for tokens
const TOKEN_HASH_ALGORITHM = "sha256"

// Constants used for passwords

// Constants used for API keys
const SYMMETRIC_ALGORITHM = "chacha20-poly1305"
const ENCODING_FORMAT: BufferEncoding = "hex"
const MASTER_KEY_LENGTH = 32
const IV_LENGTH = 12
const AD_LENGTH = 16
const TAG_LENGTH = 16
const MASTER_KEY = process.env.MASTER_KEY ?? generateMasterKey()

/**
 * Creates a new master key and appends it to a .env file
 * @returns The master key
 */
function generateMasterKey(): string {
    const envPath = path.join(__dirname, "..", "..", "secrets", "bot.env")
    const masterKey = crypto.randomBytes(MASTER_KEY_LENGTH).toBase64()
    fs.readFile(envPath, (err, data) => {
        if (err) {
            log.error("Could not find bot.env!")
            return
        }
        if (!data.toString().includes("MASTER_KEY")) {
            log.info("No master key, generating one!")
            fs.appendFileSync(envPath, `\nMASTER_KEY=${masterKey}\n`)
        }
    })
    return masterKey
}

/** Used to ensure useres are properly typing their API keys. */
export const APIKeysValidator = z.object({
    polymarket: z.looseObject({}).optional(), // looseObject for now because they're empty. Once Poly/kal get populated, switch to regular objs
    kalshi: z.looseObject({}).optional(),
    discord: z.object({
        webhookURL: z.string()
    }).optional(),
    sendGrid: z.object({
        key: z.string(),
        recipient: z.string()
    }).optional(),
    slack: z.object({
        webhookURL: z.string()
    }).optional(),
    twilio: z.object({
        sid: z.string(),
        authToken: z.string()
    }).optional()
})

type APIKeys = z.infer<typeof APIKeysValidator>

// Type generic shenanigans to make our lives easier
type PlatformKey<K extends keyof APIKeys> = { platform: K } & NonNullable<APIKeys[K]> // Adds a platform field

type PolymarketKey = PlatformKey<"polymarket">
type KalshiKey = PlatformKey<"kalshi">
type DiscordKey = PlatformKey<"discord">
type SendGridKey = PlatformKey<"sendGrid">
type SlackKey = PlatformKey<"slack">
type TwilioKey = PlatformKey<"twilio">

export type APIKey = PolymarketKey | KalshiKey | DiscordKey | SendGridKey | SlackKey | TwilioKey
export type Platform = APIKey["platform"]

/**
 * Creates a randomly generated alphanumeric token.
 * @param [length=32] - The token's length.
 * @returns The new token.
 */
export function generateToken(length: number = 32): string {
    const VOCAB = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    let token = ''
    for (let i = 0; i < length; i++) {
        token += VOCAB[Math.floor(Math.random() * VOCAB.length)];
    }
    return token
}

/**
 * Checks if a potential password correctly matches it's expected hash.
 * (i.e. The password is correct).
 * @param password - The potential password.
 * @param hash - The password's expected hash.
 * @returns If the password is correct.
 */
export async function verifyPassword(password: string, hash: string | undefined): Promise<boolean> {
    if (hash === undefined) {
        return false
    }

    return argon2.verify(hash, password)
}

/**
 * Hashes a password.
 * @param password The password to be hashed.
 * @returns The password's hash.
 */
export async function hashPassword(password: string): Promise<string> {
    return argon2.hash(password)
}

/**
 * Hashes a token.
 * @param secret - The token to be hashed.
 * @returns - The token's hash.
 */
export function hashToken(secret: string): string {
    return crypto.createHash(TOKEN_HASH_ALGORITHM).update(secret).digest("hex")
}

/**
 * Decrypts a user's key(s) for a given platform.
 * @param userId - A user's id.
 * @param platform - The specific platform (Polymarket, Kalshi, etc.).
 * @returns The user's keys for the given platform.
 */
export async function getKey(userId: number, platform: Platform) {
    const rawUserKeys = await prisma.user.findUnique({
        where: { id: userId },
        select: { apiKeys: true }
    })

    if (!rawUserKeys) {
        return null
    }

    const result = APIKeysValidator.safeParse(rawUserKeys.apiKeys)
    if (!result.success) {
        // Should never happen!
        log.error("Key parsing failed!")
        return null
    }
    const userKeys = result.data

    switch (platform) {
        case "polymarket":
            return {}
        case "kalshi":
            return {}
        case "discord":
            const discord = userKeys.discord
            return {
                webhookUrl: await decryptKey(discord?.webhookURL)
            }
        case "sendGrid":
            const sendGrid = userKeys.sendGrid
            return {
                key: await decryptKey(sendGrid?.key),
                recipient: await decryptKey(sendGrid?.recipient)
            }

        case "slack":
            const slack = userKeys.slack
            return {
                webhookURL: await decryptKey(slack?.webhookURL)
            }

        case "twilio":
            const twilio = userKeys.twilio
            return {
                sid: await decryptKey(twilio?.sid),
                authToken: await decryptKey(twilio?.authToken)
            }
        default: // Should not be possible
            log.error("getKey switch default!!")
            return null
    }
}

/**
 * Set's a user's api key.
 * @param key - The key to be set.
 * @param userId - The user's id.
 * @returns The operation's success.
 */
export async function setKey(key: APIKey, userId: number): Promise<boolean> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { apiKeys: true }
    })
    if (!user) {
        return false
    }

    const keys = user.apiKeys as JsonObject ?? {}

    switch (key.platform) {
        case "polymarket":
            break
        case "kalshi":
            break
        case "discord":
            keys.discord = {
                webhookURL: encryptKey(key.webhookURL)
            }
            break
        case "sendGrid":
            keys.sendgrid = {
                key: encryptKey(key.key),
                recipient: encryptKey(key.recipient)
            }
            break
        case "slack":
            keys.slack = {
                webhookURL: encryptKey(key.webhookURL)
            }
            break
        case "twilio":
            keys.twilio = {
                sid: encryptKey(key.sid),
                authToken: encryptKey(key.authToken)
            }
            break
        default: // Should not be possible!
            console.log(key)
            log.error("setKey switch default!!")
            return false
    }

    await prisma.user.update({
        where: { id: userId },
        data: {
            apiKeys: keys
        }
    })
    return true
}

/**
 * Splits an encrypted key into its four major components:
 * 1. The actual encrypted data.
 * 2. The encryption's initialization vector.
 * 3. The encryption's associated data.
 * 4. The encryption's authentication tag
 * @param encryptionStr The full encryped key.
 * @returns The key's components.
 */
function splitEncryptionStr(encryptionStr: string) {
    // Bytes are represented by two hex chars.
    const IV_STR_LEN = 2 * IV_LENGTH
    const AD_STR_LEN = 2 * AD_LENGTH
    const TAG_STR_LEN = 2 * TAG_LENGTH

    const IV_START = 0
    const IV_STOP = IV_START + IV_STR_LEN

    const AD_START = IV_STOP
    const AD_STOP = AD_START + AD_STR_LEN

    const DATA_START = AD_STOP
    const DATA_STOP = - TAG_STR_LEN

    const TAG_START = DATA_STOP

    return {
        dataStr: encryptionStr.slice(DATA_START, DATA_STOP),
        ivStr: encryptionStr.slice(IV_START, IV_STOP),
        adStr: encryptionStr.slice(AD_START, AD_STOP),
        tagStr: encryptionStr.slice(TAG_START),
    }
}

/**
 * Decrypts an encryped key.
 * @param encryptionStr - The entrypted key.
 * @returns The decrypted key.
 */
async function decryptKey(encryptionStr: string | undefined) {
    if (!encryptionStr) {
        return null
    }

    const {
        dataStr,
        ivStr,
        adStr,
        tagStr,
    } = splitEncryptionStr(encryptionStr)

    try {
        const data = Buffer.from(dataStr, ENCODING_FORMAT)
        const iv = Buffer.from(ivStr, ENCODING_FORMAT)
        const ad = Buffer.from(adStr, ENCODING_FORMAT)
        const tag = Buffer.from(tagStr, ENCODING_FORMAT)
        const key = Buffer.from(MASTER_KEY, "base64")

        const decipher = crypto.createDecipheriv(SYMMETRIC_ALGORITHM, key, iv, { authTagLength: TAG_LENGTH })
        decipher.setAAD(ad, { plaintextLength: data.length })
        decipher.setAuthTag(Buffer.from(tag))

        const decrypted = decipher.update(data)
        return Buffer.concat([decrypted, decipher.final()]).toString()
    } catch (err) {
        log.warn("Data decryption failed!")
        log.warn(err)
        return null
    }
}

/**
 * Encrypts a plaintext key.
 * @param data - The plaintext key.
 * @returns - The encryped key.
 */
export function encryptKey(data: string) {
    try {
        const iv = crypto.randomBytes(IV_LENGTH)
        const ad = crypto.randomBytes(AD_LENGTH)
        const key = Buffer.from(MASTER_KEY, "base64")
        const cipher = crypto.createCipheriv(SYMMETRIC_ALGORITHM, key, iv, {
            authTagLength: TAG_LENGTH,
        })

        cipher.setAAD(ad, { plaintextLength: Buffer.byteLength(data) })

        const encrypted = Buffer.concat([
            cipher.update(
                data, "utf-8"
            ),
            cipher.final(),
        ])
        const tag = cipher.getAuthTag()

        return iv.toString(ENCODING_FORMAT) + ad.toString(ENCODING_FORMAT) + encrypted.toString(ENCODING_FORMAT) + tag.toString(ENCODING_FORMAT)
    } catch (err) {
        log.error("Key encryption failed!")
        log.error(err)
        // TODO: This fails somewhat silently. Is this an issue?
        return ""
    }
}