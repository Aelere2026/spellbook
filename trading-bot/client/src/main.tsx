import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { httpBatchLink, httpSubscriptionLink, splitLink } from "@trpc/client"
import './index.css'
import App from './App.tsx'

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { trpc } from "./utils/trpc"

const queryClient = new QueryClient()

const trpcClient = trpc.createClient({
  links: [
    //loggerLink(),
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


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </trpc.Provider>
  </StrictMode>,
)
