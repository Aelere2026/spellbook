import { createTRPCReact } from "@trpc/react-query"
import type { AppRouter } from "../../../server/dist/types/src/trpc"

export const api = createTRPCReact<AppRouter>()