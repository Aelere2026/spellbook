import "./App.css";
import Dashboard from "./Pages/Dashboard";
import GainLoss from "./Pages/GainLoss";
import Opportunities from "./Pages/Opportunities";
import Layout from "./Pages/Layout";
import Home from "./Pages/Home";
import Profit from "./Pages/Profit";
import TotalFees from "./Pages/Fees";
import Settings from "./Pages/Settings";
import TradeDetail from "./Pages/TradeDetail";
import { Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, splitLink, httpSubscriptionLink } from "@trpc/client";
import { useState } from "react";
import { api } from "./utils/api";
import superjson from "superjson";

function App() {
  const [queryClient] = useState(() => new QueryClient());
  const [apiClient] = useState(() =>
    api.createClient({
      links: [
        //loggerLink(),
        splitLink({
          condition: (op) => op.type === "subscription",
          true: httpSubscriptionLink({
            url: "http://localhost:3000/trpc",
            transformer: superjson,
          }),
          false: httpBatchLink({
            url: "http://localhost:3000/trpc",
            transformer: superjson,
          }),
        }),
      ],
    }),
  );

  return (
    <ThemeProvider>
      <api.Provider client={apiClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/home" element={<Home />} />
              <Route path="/" element={<Dashboard />} />
              <Route path="/gain-loss" element={<GainLoss />} />
              <Route path="/opportunities" element={<Opportunities />} />
              <Route path="/profit" element={<Profit />} />
              <Route path="/fees" element={<TotalFees />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/trade/:id" element={<TradeDetail />} />
            </Route>
          </Routes>
        </QueryClientProvider>
      </api.Provider>
    </ThemeProvider>
  );
}

export default App;
