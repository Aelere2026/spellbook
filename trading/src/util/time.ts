/*
 * A simple utility used to standardize using Dates.
 */

/**
 * @returns The current time and date.
 */
export function now(): Date {
    return new Date()
}

/**
 * @param days The amount of days in the future.
 * @returns The date and time in N days.
 */
export function later(days: number): Date {
    const later = new Date()
    later.setDate(later.getDate() + days)
    return later
}

/**
 * @param event Some event in time.
 * @returns If the given event has already happened.
 */
export function isExpired(event: { expiration: Date }): boolean {
    return isEarlierThan(event.expiration, now())
}

/**
 * @returns Checks if one date is earlier than another
 */
export function isEarlierThan(check: Date, reference: Date): boolean {
    return check < reference
}

/**
 * @returns Checks if one date is later than another
 */
export function isLaterThan(check: Date, reference: Date): boolean {
    return check > reference
}