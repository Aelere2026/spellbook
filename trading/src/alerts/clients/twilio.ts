import { AlertClient, Alert } from ".."
import * as log from "../../util/log"
import twilio, { Twilio } from "twilio"

/**
 * Creates an alert client to send notifications via SMS
 * @param sid - String Identifier of the notification bot.
 * @param authToken - Auth Token of the bot.
 * @param from - Phone number of the notification bot.
 * @param to - Recipient phone number(s)
 * @see {@link https://www.twilio.com/docs/iam/api-keys/keys-in-console | Twilio API Key}
 */
export class TwilioAlertClient implements AlertClient {
    readonly from: string
    readonly to: string[]
    readonly client: Twilio

    constructor({ sid, authToken, from, to }: { sid: string, authToken: string, from: string, to: string | string[] }) {
        this.client = twilio(sid, authToken)
        this.from = from
        this.to = Array.isArray(to) ? to : [to]
    }

    async send(alert: Alert) {

        log.alert("Sending Twilio Message!")
        const promises = this.to.map(phoneNumber => this._sendMessage(alert, phoneNumber))
        const statuses = await Promise.all(promises)
        const success = statuses.every(status => status)

        return success
    }

    async _sendMessage(alert: Alert, to: string): Promise<boolean> {
        const msg = {
            body: `${alert.title}\n\n${alert.body}`,
            from: this.from,
            to
        }

        log.alert("Sending SMS!")
        const response = await this.client.messages.create(msg)
        log.debug(response)
        return true
    }
}