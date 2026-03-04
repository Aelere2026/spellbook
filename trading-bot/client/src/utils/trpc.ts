import { createTRPCReact } from "@trpc/react-query"
import type { AppRouter } from "../../../server/src/trpc/index"


export const trpc = createTRPCReact<AppRouter>()


