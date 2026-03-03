import * as trpcExpress from "@trpc/server/adapters/express"
import { createServer } from "http"
import express from "express"

import * as examples from "./examples"
import * as log from "./util/log"
import { appRouter } from "./trpc"

// TODO: Move this into a config file or smtn
export const PORT = 3000

const app = express()
const server = createServer(app)

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


// Here's some examples!!

//examples.showcaseLogger()
//examples.showcaseDatabase()