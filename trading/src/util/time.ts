export function now() {
    return new Date()
}

export function later(days: number) {
    const later = new Date()
    later.setDate(later.getDate() + days)
    return later
}

export function isExpired(event: { expiration: Date }) {
    return isEarlierThan(event.expiration, now())
}

export function isEarlierThan(check: Date, reference: Date) {
    return check < reference
}

export function isLaterThan(check: Date, reference: Date) {
    return check > reference
}