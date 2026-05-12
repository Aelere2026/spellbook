import "./App.css";
import Dashboard from "./Pages/Dashboard";
import GainLoss from "./Pages/GainLoss";
import Opportunities from "./Pages/Opportunities";
import Layout from "./Pages/Layout";
import Home from "./Pages/Home";
import Profit from "./Pages/Profit";
import TotalFees from "./Pages/Fees";
import AvgRoi from "./Pages/AvgRoi";
import Settings from "./Pages/Settings";
import TradeDetail from "./Pages/TradeDetail";
import Login from "./Pages/Login";
import Signup from "./Pages/Signup";
import AuthGuard from "./Pages/AuthGuard";
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
        splitLink({
          condition: (op) => op.type === "subscription",
          true: httpSubscriptionLink({
            url: "http://localhost:3000/trpc",
            transformer: superjson,
          }),
          false: httpBatchLink({
            url: "http://localhost:3000/trpc",
            transformer: superjson,
            fetch: (url, options) => fetch(url, { ...options, credentials: "include" }),
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
            {/* Public routes - no auth required */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
 
            {/* Protected routes - auth required */}
            <Route
              element={
                <AuthGuard>
                  <Layout />
                </AuthGuard>
              }
            >
              <Route path="/home" element={<Home />} />
              <Route path="/" element={<Dashboard />} />
              <Route path="/gain-loss" element={<GainLoss />} />
              <Route path="/opportunities" element={<Opportunities />} />
              <Route path="/profit" element={<Profit />} />
              <Route path="/fees" element={<TotalFees />} />
              <Route path="/avgROI" element={<AvgRoi />} />
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