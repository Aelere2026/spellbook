import type { AppRouter } from "../../server/src/trpc/"
import { httpBatchLink, httpSubscriptionLink, loggerLink, splitLink, createTRPCClient } from "@trpc/client"
const api = createTRPCClient<AppRouter>({
  /**
   * @see https://trpc.io/docs/v11/client/links
   */
  links: [
    //loggerLink(),
    splitLink({
      condition: (op) => op.type === "subscription",
      true: httpSubscriptionLink({
        url: "/trpc",
      }),
      false: httpBatchLink({
        url: "/trpc",
      }),
    }),
  ],
})

export default api