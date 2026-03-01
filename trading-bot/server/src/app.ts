import express from "express"
import { prisma } from "./util/prisma"
import * as log from "./util/log"

const app = express()
const PORT = 3000

app.use(express.static("../client/public"))
app.listen(PORT, () => {
    log.info(`Server listening on port ${PORT}!`)
})

console.log(await prisma.market.findMany())