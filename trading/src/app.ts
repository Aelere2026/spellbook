import * as trpcExpress from "@trpc/server/adapters/express"
import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
import { prisma } from "./util/prisma"

import * as examples from "./examples"
import * as detector from "./detector"
import * as log from "./util/log"
import { appRouter, createContext } from "./trpc"
import { initAdmin } from "./auth"

import { DiscordAlertClient, Watchdog } from "./alerts"

// Opens the app up to connections
export const PORT = 3000
const app = express()

app.use(cors({
    origin: "http://localhost:5173",
    credentials: true,
}))
app.use(cookieParser())
app.use(
    "/trpc",
    trpcExpress.createExpressMiddleware({
        router: appRouter,
        createContext
    })
)

app.use(express.static("../client/public"))
app.listen(PORT, () => {
    log.info(`Server listening on port ${PORT}!`)
})

// Start the detector
detector.run().catch((err) => {
    log.fatal(`Fatal error: ${err}`);
    process.exit(1)
})

/**
 * Creates admin accounts if they don't already exist.
 * Check the logs for credentials
 */
initAdmin()

// Starts monotoring arbitrages, sending alers if necessary
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