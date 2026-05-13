import "dotenv/config"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../../prisma/generated/client"

import * as dotenv from "dotenv"
import * as path from "path"
import * as log from "./log"

/*
 * This file creates a connection to a database, and continusouly
 * checks for connection health. It also exports the types for
 * each model (table) for convenience.
 */

const envFile = path.resolve(path.join(__dirname), "../prisma/.env")
dotenv.config({ path: envFile, quiet: true })
const connectionString = `${process.env.DATABASE_URL}`

const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

async function healthCheck(timeout: number = 5000) {
    while (true) {
        try {
            await prisma.platform.findFirst()
        } catch (err) {
            log.error("Connection to database failed...")
            log.error("Please make sure the docker container is running!")
            // process.exit(0)
        }

        // TODO: Backoff on repeated fails?
        await new Promise(resolve => setTimeout(resolve, timeout))
    }
}

healthCheck()

export { prisma }
export type { Arbitrage, Market, Match, Outcome, Platform, User, Session } from "../../prisma/generated/client"