import { AlertClient, Alert, sendWebhook, defaults } from ".."
import * as log from "../../util/log"

const RED = Number(0xff0000)

export class DiscordAlertClient implements AlertClient {
    readonly webhookURL: string
    username: string
    icon: string

    constructor({ webhookUrl: webhookURL, username, icon }: { webhookUrl: string, username?: string, icon?: string }) {
        this.webhookURL = webhookURL
        this.username = username ?? defaults.username
        this.icon = icon ?? defaults.icon
    }

    async send(alert: Alert) {
        const webhook = {
            username: this.username,
            avatar_url: this.icon ?? "",
            embeds: [
                {
                    color: RED,
                    title: alert.title,
                    description: alert.body
                }
            ]
        }

        log.alert("Sending Discord message!")
        return await sendWebhook(webhook, this.webhookURL)
    }
}
