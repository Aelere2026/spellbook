import { Alert, AlertClient } from "."

export type Check = {
    checkInterval: number,
    triggerCondition: () => Promise<boolean>
    alert: Alert
}

export class BotWatcher {
    readonly clients: AlertClient[]
    readonly checks: Check[]

    constructor({ clients, checks }: {
        clients: AlertClient | AlertClient[]
        checks: Check | Check[]
    }) {
        this.clients = Array.isArray(clients) ? clients : [clients]
        this.checks = Array.isArray(checks) ? checks : [checks]
    }
}