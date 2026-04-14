import { AlertClient, Alert, defaults } from ".."
import sgMail from "@sendgrid/mail"
import * as log from "../../util/log"

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