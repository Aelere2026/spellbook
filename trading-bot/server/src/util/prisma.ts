import "dotenv/config"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../../prisma/generated/client"

import * as dotenv from "dotenv"
import * as path from "path"
import * as log from "./log"

const envFile = path.resolve(path.join(__dirname), "../prisma/.env")
dotenv.config({ path: envFile, quiet: true } )
const connectionString = `${process.env.DATABASE_URL}`

const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

try {
    await prisma.market.findMany()
} catch (err) {
    log.fatal("Connection to database failed...")
    log.fatal("Please make sure the docker container is running!")
    process.exit(0)
}

export { prisma }