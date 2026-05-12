export function now() {
    return new Date()
}

export function later(days: number) {
    const later = new Date()
    later.setDate(later.getDate() + days)
    return later
}

export function isExpired(event: { expiration: Date }) {
    return event.expiration > new Date(Date.now())
}