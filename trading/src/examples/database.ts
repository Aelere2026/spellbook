import * as log from "../util/log"
import { prisma } from "../util/prisma"

export async function showcaseDatabase() {
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

    log.debug("Here are your markets:", await prisma.market.findMany(), "\n")
}

