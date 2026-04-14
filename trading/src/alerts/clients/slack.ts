import { AlertClient, Alert, sendWebhook } from ".."
import * as log from "../../util/log"

export class SlackAlertClient implements AlertClient {
    readonly webhookUrl: string

    constructor({ webhookUrl }: { webhookUrl: string }) {
        this.webhookUrl = webhookUrl
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
        return await sendWebhook(webhook, this.webhookUrl)
    }
}