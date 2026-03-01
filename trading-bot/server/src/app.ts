import express from "express"
import { prisma } from "./util/prisma"
import * as log from "./util/log"

const app = express()
const PORT = 3000

const polymarket = {
    id: 1,
    name: "Polymarket",
    baseFee: 0.1
}

await prisma.platform.upsert({
    where: { id: 1 },
    update: { ...polymarket },
    create: { ...polymarket }
})

await prisma.market.deleteMany({})

await prisma.market.create({
    data: {
        apiId: "test",
        title: "Pedro's Really cool market",
        eventDate: new Date("05-27-2025"),
        resolutionDate: new Date(), // This also works
        status: "Open",
        fee: 0.0008,
        category: "Sports",
        platformId: 1
    }
})

log.debug("A secret debugging message...")
log.log("A harmless message...")
log.info("Like log but more colorful :)")
log.warn("A not so spooky warning.")
log.error("A spooky error!")
log.fatal("A terrifying fatal error!")

log.newline()

log.debug("Here are your markets:", await prisma.market.findMany(), "\n")

log.setVerbosity("WARN")
log.warn("This one will print!")
log.debug("But this one wont!")

app.use(express.static("../client/public"))
app.listen(PORT, () => {
    log.info(`Server listening on port ${PORT}!`)
})
