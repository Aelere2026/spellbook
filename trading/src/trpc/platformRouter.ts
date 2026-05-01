import { tracked } from "@trpc/server"
import { z } from "zod"

import { router } from "./"
import { userProcedure } from "./procedures"
import { prisma } from "../util/prisma"

// These aren't super useful right now I just wanted to show off how to make them
const platformRouter = router({
    get: userProcedure
        .query(async () => {
            return await prisma.platform.findMany()
        }),
})

export default platformRouter