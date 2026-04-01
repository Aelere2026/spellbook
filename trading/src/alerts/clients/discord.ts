import { AlertClient, Alert, sendWebhook, Severity } from ".."
import * as log from "../../util/log"

export class DiscordAlertClient implements AlertClient {
    readonly webhookUrl: string
    username: string | undefined
    icon: string | undefined

    constructor({ webhookUrl, username, icon }: { webhookUrl: string, username?: string, icon?: string }) {
        this.webhookUrl = webhookUrl
        this.username = username
        this.icon = icon
    }

    async send(alert: Alert) {
        const webhook = {
            username: this.username,
            avatar_url: this.icon ?? "",
            embeds: [
                {
                    color: getSeverityColor(alert.severity),
                    title: alert.title,
                    description: alert.body
                }
            ]
        }

        log.alert("Sending webhook to Discord!")
        return await sendWebhook(webhook, this.webhookUrl)
    }
}

function getSeverityColor(severity: Severity): number {
    if (severity === "NOTIF") return Number(0x00ff00) // Green
    else if (severity === "WARN") return Number(0xffff00) // Yellow
    else if (severity === "CRITICAL") return Number(0xff0000) // Red
    return Number(0xffffff) // Impossible?
}
