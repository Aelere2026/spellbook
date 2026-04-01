import { publicProcedure, router } from "./trpc"
import { prisma } from "../../src/util/prisma"

// These aren't super useful right now I just wanted to show off how to make them
const platformRouter = router({
    get: publicProcedure
        .query(async () => {
            return await prisma.platform.findMany()
        }),
})

export default platformRouter