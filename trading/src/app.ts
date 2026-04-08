import * as trpcExpress from "@trpc/server/adapters/express"
import express from "express"
import cors from "cors"

import * as examples from "./examples"
import * as detector from "./detector"
import * as log from "./util/log"
import { appRouter } from "./trpc"

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