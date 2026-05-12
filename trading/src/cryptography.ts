import * as argon2 from "argon2"
import * as crypto from "crypto"
import * as z from "zod"
import * as log from "./util/log"
import { prisma } from "./util/prisma"
import { JsonObject } from "@prisma/client/runtime/client"

/**
 * Keys we need to decrypt are encrypted using ChaCha20-Poly1305, a symmetric
 * encryption algorithm. These keys are encrypted at rest, and we currently only
 * decrypt them on the fly. Should this prove to be too slow for trading, you
 * (future developers) might want to cache the decryption results in memory.
 * However, while this is more secure than no enyption, it does provide an additional
 * attack vector.
 *
 * Adapted from https://dev.to/vapourisation/east-encryption-in-typescript-3948
 *
 * Passwords we do not (and should not!) decrypt, so we can use Argon2 instead.
 * This is an unreversible hash, and is quantum computer resistant! :)
 */

// Constants used for ChaCha
const MASTER_KEY = ""
const ALGORITHM = "chacha20-poly1305"
const ENCODING_FORMAT = "hex"
const IV_LENGTH = 12
const AD_LENGTH = 16
const TAG_LENGTH = 16

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
type PlatformKey<K extends keyof APIKeys> = { platform: K } & NonNullable<APIKeys[K]> // Adds a platform field

type PolymarketKey = PlatformKey<"polymarket">
type KalshiKey = PlatformKey<"kalshi">
type DiscordKey = PlatformKey<"discord">
type SendGridKey = PlatformKey<"sendGrid">
type SlackKey = PlatformKey<"slack">
type TwilioKey = PlatformKey<"twilio">

export type APIKey = PolymarketKey | KalshiKey | DiscordKey | SendGridKey | SlackKey | TwilioKey
export type Platform = APIKey["platform"]

const VOCAB = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
export function generateToken(length: number = 16): string {
    let token = ''
    for (let i = 0; i < length; i++) {
        token += VOCAB[Math.floor(Math.random() * VOCAB.length)];
    }
    return token
}

// Checks if a potential secret (password, etc) matches the expected hash
export async function verify(secret: string, hash: string | undefined): Promise<boolean> {
    if (hash === undefined) {
        return false
    }

    return argon2.verify(hash, secret)
}

// Hashes a secret (password, etc)
export async function hash(secret: string): Promise<string> {
    return argon2.hash(secret)
}

// Retrieves an encrypted user key
export async function getKey(userId: number, platform: Platform) {
    const rawUserKeys = await prisma.user.findUnique({
        where: { id: userId },
        select: { apiKeys: true }
    })

    if (!rawUserKeys) {
        return null
    }

    const result = APIKeysValidator.safeParse(rawUserKeys)
    if (!result.success) {
        // Should never happen!
        log.warn("Key parsing failed!")
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
                webhookUrl: decrypt(discord?.webhookURL)
            }

        case "sendGrid":
            const sendGrid = userKeys.sendGrid
            return {
                key: decrypt(sendGrid?.key),
                recipient: decrypt(sendGrid?.recipient)
            }

        case "slack":
            const slack = userKeys.slack
            return {
                webhookURL: decrypt(slack?.webhookURL)
            }

        case "twilio":
            const twilio = userKeys.twilio
            return {
                sid: decrypt(twilio?.sid),
                authToken: decrypt(twilio?.authToken)
            }
        default: // Should not be possible
            log.error("getKey switch default!!")
            return null
    }
}

// TODO: is there a more elegant way to do this?
export async function setKey(key: APIKey, userId: number): Promise<boolean> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { apiKeys: true }
    })
    if (!user) {
        return false
    }

    const keys = user.apiKeys as JsonObject

    switch (key.platform) {
        case "polymarket":
            break
        case "kalshi":
            break
        case "discord":
            keys.discord = {
                webhookURL: encrypt(key.webhookURL)
            }
            break
        case "sendGrid":
            keys.sendgrid = {
                key: encrypt(key.key),
                recipient: encrypt(key.recipient)
            }
            break
        case "slack":
            keys.slack = {
                webhookURL: encrypt(key.webhookURL)
            }
            break
        case "twilio":
            keys.twilio = {
                sid: encrypt(key.sid),
                authToken: encrypt(key.authToken)
            }
        default: // Should not be possible!
            log.error("setKey switch default!!")
            return false
    }

    await prisma.user.update({
        where: { id: userId },
        data: keys
    })
    return true
}

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

async function decrypt(encryptionStr: string | undefined) {
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

        const decipher = crypto.createDecipheriv(ALGORITHM, MASTER_KEY, iv, { authTagLength: TAG_LENGTH })
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

export function encrypt(data: string) {
    try {
        const iv = crypto.randomBytes(IV_LENGTH)
        const ad = crypto.randomBytes(AD_LENGTH);
        const cipher = crypto.createCipheriv(ALGORITHM, MASTER_KEY, iv, {
            authTagLength: 16,
        })

        cipher.setAAD(ad, { plaintextLength: Buffer.byteLength(data) })

        const encrypted = Buffer.concat([
            cipher.update(
                data, 'utf-8'
            ),
            cipher.final(),
        ])
        const tag = cipher.getAuthTag()

        return iv.toString(ENCODING_FORMAT) + ad.toString(ENCODING_FORMAT) + encrypted.toString(ENCODING_FORMAT) + tag.toString(ENCODING_FORMAT)
    } catch (err) {
        log.warn("Key encryption failed!")
        log.warn(err)
        // TODO: This fails somewhat silently. Is this an issue?
        return ""
    }
}