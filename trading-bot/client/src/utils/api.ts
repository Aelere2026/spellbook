import { createTRPCReact } from "@trpc/react-query"
import type { AppRouter } from "../../../server/src/trpc/index"
import { httpBatchLink, httpSubscriptionLink, splitLink } from "@trpc/client"


export const api = createTRPCReact<AppRouter>()

export const apiClient = api.createClient({
  links: [
    //loggerLink(),s
    splitLink({
      condition: (op) => op.type === "subscription",
      true: httpSubscriptionLink({
        url: "http://localhost:3000/trpc",
      }),
      false: httpBatchLink({
        url: "http://localhost:3000/trpc",
      }),
    }),
  ],
})