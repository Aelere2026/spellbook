import * as argon2 from "argon2"

const VOCAB = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
export function generateToken(length: number = 16): string {
    let token = '';
    for (let i = 0; i < length; i++) {
        token += VOCAB[Math.floor(Math.random() * VOCAB.length)];
    }
    return token
}

export async function verify(secret: string | undefined, hash: string): Promise<boolean> {
    if (secret === undefined) {
        return false
    }

    return argon2.verify(hash, secret)
}

export async function hash(secret: string): Promise<string> {
    return argon2.hash(secret)
}

export function isExpired(event: { expiration: Date }) {
    return event.expiration > new Date(Date.now())
}

