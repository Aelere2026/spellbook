import { AlertClient, Alert, sendWebhook, defaults } from ".."
import * as log from "../../util/log"


const RED = Number(0xff0000)

/**
 * Creates an alert client to send notifications via Discord
 *
 * @param webhookURL - Discord channel webhook URL.
 * @param [username] - Username of the notification bot.
 * @param [icon] - URL or image used as the bot's profile picture.
 * @see {@link https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks | Discord Webhook}
 */
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
