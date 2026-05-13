import { AlertClient, Alert, sendWebhook } from ".."
import * as log from "../../util/log"

/**
 * Creates an alert client to send notifications via Slack
 *
 * @param webhookURL - Slack channel webhook URL.
 * @see {@link https://docs.slack.dev/messaging/sending-messages-using-incoming-webhooks/ | Slack Webhooks}
 */
export class SlackAlertClient implements AlertClient {
    readonly webhookURL: string

    constructor({ webhookUrl: webhookURL }: { webhookUrl: string }) {
        this.webhookURL = webhookURL
    }

    async send(alert: Alert) {
        const webhook = {
            title: alert.title,
            blocks: [
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: alert.body
                    }
                }
            ]
        }

        log.alert("Sending Slack message!")
        return await sendWebhook(webhook, this.webhookURL)
    }
}