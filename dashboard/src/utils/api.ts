import { createTRPCReact } from "@trpc/react-query"
import type { AppRouter } from "../../../trading/src/trpc"

export const api = createTRPCReact<AppRouter>()