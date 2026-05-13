import { Alert, AlertClient } from "."
import * as log from "../util/log"

export type target = {
    timeout: number,
    trigger: () => Promise<boolean>
    alert: Alert,
    isFatal?: boolean
}

/**
 * This system is left over from before user accounts were a thing.
 * As such, it wasn't designed with multiple people and various user-
 * customizable checks. This probably won't be too too difficult to
 * add in, but we'll leave it up to the future developers :) I believe
 * in you!
 */

// Not technically a watchdog :/
// oh well!
export class Watchdog {
    clients: AlertClient[]
    target: target[]

    constructor({ clients, checks }: {
        clients: AlertClient | AlertClient[]
        checks?: target | target[]
    }) {
        this.clients = Array.isArray(clients) ? clients : [clients]

        if (!!checks) {
            this.target = Array.isArray(checks) ? checks : [checks]
        } else {
            this.target = []
        }

        for (const check of this.target) {
            this.watch(check)
        }
    }

    async watch(target: target) {
        while (true) {
            if (await target.trigger()) {
                // Something's gone wrong... send the alerts!!
                this.sendAlert(target.alert)

                if (target.isFatal) {
                    log.fatal("The bot has made disaterous trades!! Automatically shutting down to stop it from causing more damage!")
                    process.exit(0)
                }
            }

            await new Promise(resolve => setTimeout(resolve, target.timeout))
        }
    }

    async sendAlert(alert: Alert): Promise<boolean[]> {
        return Promise.all(this.clients.map(client => client.send(alert)))
    }
}