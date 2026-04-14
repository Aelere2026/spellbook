import * as trpcExpress from "@trpc/server/adapters/express"
import express from "express"
import cors from "cors"
import { prisma } from "./util/prisma"

import * as examples from "./examples"
import * as detector from "./detector"
import * as log from "./util/log"
import { appRouter } from "./trpc"

import { DiscordAlertClient, Watchdog } from "./alerts"

// Here are some example
const discord = new DiscordAlertClient({
    webhookUrl: ""
})
const wd = new Watchdog({
    clients: discord
})

wd.watch({
    timeout: 5000,
    trigger: async () => {
        const lastArbs = await prisma.arbitrage.aggregate({ _avg: { netProfit: true }, take: 10, orderBy: { executionTime: "desc" } })

        // It's fine if theres no entries in the database
        if (!lastArbs._avg.netProfit) {
            return false
        }

        // Send alert if the the last 10 arbs have lost money on average
        return lastArbs._avg.netProfit.lessThan(0)
    },
    alert: {
        title: "Spellbook Arbitrage Alert",
        body: "The few arbitrages have been losing money!"
    }
})

wd.watch({
    timeout: 60 * 1000,
    trigger: async () => {
        const lastArbs = await prisma.arbitrage.findFirst({ select: { netProfit: true }, orderBy: { executionTime: "desc" } })

        // It's fine if theres no entries in the database
        if (!lastArbs) {
            return false
        }

        // Send alert if the last arb lost over a dollar
        return lastArbs.netProfit.lessThan(-1)
    },
    isFatal: true,
    alert: {
        title: "Spellbook Arbitrage Alert",
        body: "The few arbitrages have been losing money!",
    }
})

// TODO: Move this into a config file or smtn
export const PORT = 3000


const app = express()

app.use(cors())
app.use(
    "/trpc",
    trpcExpress.createExpressMiddleware({
        router: appRouter,
    })
)

app.use(express.static("../client/public"))
app.listen(PORT, () => {
    log.info(`Server listening on port ${PORT}!`)
})

// Start the detector
detector.run().catch((err) => {
    log.info(`Fatal error: ${err}`);
    process.exit(1)
})