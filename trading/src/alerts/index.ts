import * as log from "../util/log"

export type Severity = "NOTIF" | "WARN" | "CRITICAL"

export type Alert = {
    title: string,
    body: string,
    severity: Severity
}

export interface AlertClient {
    send: (alert: Alert) => Promise<boolean>
}

export { DiscordAlertClient } from "./clients/discord"
export { SlackAlertClient } from "./clients/slack"
export { SendGridAlertClient } from "./clients/sendGrid"
export { TwilioAlertClient } from "./clients/twilio"

export async function sendWebhook(webhook: object, url: string) {
    log.debug(webhook)
    try {
        const response = await fetch(url, {
            method: "post",
            body: JSON.stringify(webhook),
            headers: {
                "Content-Type": "application/json"
            }
        })

        if (![200, 201, 202, 204].includes(response.status)) {
            throw {
                status: response.status,
                message: response.statusText
            }
        }

        return true
    } catch (error) {
        log.error(error)
        return false
    }
}
