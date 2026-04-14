import * as log from "../util/log"

export type Alert = {
    title: string,
    body: string,
}

export interface AlertClient {
    send: (alert: Alert) => Promise<boolean>
}

export const defaults = {
    username: "Spellbook Notify",
    icon: "https://ih1.redbubble.net/image.5381666378.3555/raf,360x360,075,t,fafafa:ca443f4786.jpg"
}

export { DiscordAlertClient } from "./clients/discord"
export { SlackAlertClient } from "./clients/slack"
export { SendGridAlertClient } from "./clients/sendGrid"
export { TwilioAlertClient } from "./clients/twilio"
export { Watchdog } from "./watchdog"

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
