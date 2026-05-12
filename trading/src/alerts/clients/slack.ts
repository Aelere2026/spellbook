import { AlertClient, Alert, sendWebhook } from ".."
import * as log from "../../util/log"

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