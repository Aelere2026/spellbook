import { AlertClient, Alert } from ".."
import * as log from "../../util/log"
import twilio, { Twilio } from "twilio"


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

        const response = await this.client.messages.create(msg)
        log.debug(response)
        return true
    }
}