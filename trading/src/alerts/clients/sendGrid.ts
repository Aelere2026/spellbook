import { AlertClient, Alert, defaults } from ".."
import sgMail from "@sendgrid/mail"
import * as log from "../../util/log"


/**
 * Creates an alert client to send notifications via email
 *
 * @param apiKey - SendGrid account API key.
 * @param from - Email address of the notification bot.
 * @param to - Recipient email address(es).
 * @param [name] - Sender name of the notification bot.
 * @see {@link https://www.twilio.com/docs/sendgrid/ui/account-and-settings/api-keys | SendGrid API Key}
 */
export class SendGridAlertClient implements AlertClient {
    readonly apiKey: string
    readonly from: string
    readonly to: string[]
    readonly name: string

    constructor({ apiKey, from, to, name }: { apiKey: string, from: string, to: string | string[], name?: string }) {
        this.apiKey = apiKey
        this.from = from
        this.to = Array.isArray(to) ? to : [to]
        this.name = name ?? defaults.username
    }

    async send(alert: Alert) {
        sgMail.setApiKey(this.apiKey)
        const msg = {
            to: this.to,
            from: this.from,
            subject: alert.title,
            text: alert.body,
            name: this.name
        }

        log.alert("Sending email!")
        const response = await sgMail.sendMultiple(msg)
        return response[0].statusCode === 202
    }
}