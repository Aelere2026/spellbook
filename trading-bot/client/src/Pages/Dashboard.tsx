import React from "react";
import { api } from "../utils/api"

interface StatCardProps {
  title: string;
  value: string | number;
  tone?: "neutral" | "positive" | "negative";
  className?: string;
}

const toneStyles: Record<NonNullable<StatCardProps["tone"]>, string> = {
  neutral: "text-slate-800",
  positive: "text-emerald-600",
  negative: "text-rose-600",
};

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  tone = "neutral",
  className,
}) => (
  <div
    className={[
      "rounded-xl border border-slate-200/70 bg-white/70",
      "shadow-[0_10px_30px_rgba(2,6,23,0.08)] backdrop-blur-md",
      "px-4 py-3",
      className ?? "",
    ].join(" ")}
  >
    <div className="text-[11px] uppercase tracking-wider text-slate-500">
      {title}
    </div>
    <div
      className={["mt-1 text-2xl font-semibold", toneStyles[tone]].join(" ")}
    >
      {value}
    </div>
  </div>
);

interface Trade {
  id: number;
  market: string;
  exchangePair: string;
  edgePct: number;
  capital: number;
  costs: number;
  netPnl: number;
  roiPct: number;
  durationMin: number;
  timestamp: string;
}

const trades: Trade[] = [
  {
    id: 30520,
    market: "US Election 2028 - Dem Win",
    exchangePair: "Polymarket / Kalshi",
    edgePct: 0.48,
    capital: 820,
    costs: 2.31,
    netPnl: 1.62,
    roiPct: 0.2,
    durationMin: 11,
    timestamp: "2026-03-03 22:11",
  },
  {
    id: 30519,
    market: "Fed Rate Cut - March",
    exchangePair: "Polymarket / Kalshi",
    edgePct: 0.35,
    capital: 640,
    costs: 1.52,
    netPnl: 0.79,
    roiPct: 0.12,
    durationMin: 8,
    timestamp: "2026-03-03 22:10",
  },
  {
    id: 30518,
    market: "BTC > $75k by June",
    exchangePair: "Polymarket / Kalshi",
    edgePct: 0.55,
    capital: 5000,
    costs: 1.56,
    netPnl: 2.13,
    roiPct: 0.43,
    durationMin: 9,
    timestamp: "2026-03-03 22:08",
  },
  {
    id: 30517,
    market: "CPI Above 3.0%",
    exchangePair: "Polymarket / Kalshi",
    edgePct: -0.29,
    capital: 580,
    costs: 1.09,
    netPnl: 0.58,
    roiPct: 0.1,
    durationMin: 6,
    timestamp: "2026-03-03 22:06",
  },
  {
    id: 30516,
    market: "ETH ETF Approval",
    exchangePair: "Polymarket / Kalshi",
    edgePct: -0.42,
    capital: 910,
    costs: 2.47,
    netPnl: -1.35,
    roiPct: -0.15,
    durationMin: 13,
    timestamp: "2026-03-03 22:05",
  },
];

const fmtMoney = (n: number) =>
  n.toLocaleString(undefined, { style: "currency", currency: "USD" });

const fmtPct = (n: number) => `${n.toFixed(2)}%`;

const colors = (n: number) =>
  n > 0
    ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
    : n < 0
      ? "bg-rose-50 text-rose-700 ring-rose-200"
      : "bg-slate-50 text-slate-700 ring-slate-200";


const Dashboard: React.FC = () => {
  const profit = 8420.17; // From dashboard mockup need to import from db


  const { data, isLoading } = api.platforms.get.useQuery()
  if (isLoading) return <div> Loading... </div>
  console.log(data)

  return (
    <div className="min-h-screen w-full">
        
        {/* hehe logo ! (i think its the logo) */}
      <div className="top-4 left-8 flex items-center gap-2 bg-white rounded-2xl pl-4">
        <img src="/favicon.ico" className="w-17 h-17 " />
        <span className="text-3xl font-semibold tracking-wide text-black">
          SPeLLbook
        </span>
      </div>

      <div className="pointer-events-none fixed inset-0"></div>

      <div className="relative mx-auto w-full px-10 py-6 sm:px-10 lg:px-10">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.05fr_1.6fr_1.05fr]">
          {/*All values from the mock up dashboard*/}
          <div className="grid grid-cols-2 gap-3">
            <StatCard title="Gain/Loss" value="1.35" />
            <StatCard title="Opportunities" value="2,740" />
            <StatCard title="Frequency" value="18" />
            <StatCard title="Avg Trade Time" value="0.18 h" />
          </div>

          {/*Profit part */}
          <div
            className={[
              "rounded-2xl border border-slate-200/70 shadow-[0_18px_60px_rgba(2,6,23,0.08)] backdrop-blur-md",
              profit >= 0
                ? "bg-[oklch(0.982_0.018_155)]"
                : "bg-[oklch(0.969_0.015_0.124)]",
            ].join(" ")}
          >
            <div className="px-6 py-6 sm:px-8">
              <div className="text-center text-sm tracking-wide text-slate-500">
                PROFIT
              </div>
              <div
                className={[
                  "mt-6 text-center text-4xl font-semibold sm:text-5xl",
                  profit >= 0 ? "text-emerald-600" : "text-rose-600",
                ].join(" ")}
              >
                {profit >= 0 ? "+" : ""}
                {fmtMoney(profit)}
              </div>
            </div>
          </div>

          {/*All values from the mock up dashboard -- right side */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard title="Total Fee Loss" value="$3,912" />
            <StatCard title="Avg ROI" value="0.42%" />
            <StatCard title="Avg Slippage" value="0.031" />
            <StatCard title="Exposure" value="0.87" />
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200/70 bg-white/70 shadow-[0_18px_60px_rgba(2,6,23,0.08)] backdrop-blur-md">
          <div className="flex items-center justify-between px-5 py-4 sm:px-6">
            <div>
              <div className="text-sm font-semibold text-slate-900">
                Trade History
              </div>
            </div>
          </div>

          {/* Table part with trade history -- also from mock up */}
          <div className="overflow-x-auto px-2 pb-4 sm:px-4">
            <table className="min-w-full">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500">
                  <th className="px-3 py-2 sm:px-4">Trade ID</th>
                  <th className="px-3 py-2 sm:px-4">Timestamp</th>
                  <th className="px-3 py-2 sm:px-4">Market</th>
                  <th className="px-3 py-2 sm:px-4">Exchange Pair</th>
                  <th className="px-3 py-2 sm:px-4">Edge %</th>
                  <th className="px-3 py-2 sm:px-4">Capital</th>
                  <th className="px-3 py-2 sm:px-4">Costs</th>
                  <th className="px-3 py-2 sm:px-4">Net PnL</th>
                  <th className="px-3 py-2 sm:px-4">ROI</th>
                  <th className="px-3 py-2 sm:px-4">Duration</th>
                </tr>
              </thead>

              <tbody>
                {trades.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-900/5">
                    <td className="px-3 py-2 text-sm text-slate-700 sm:px-4">{t.id}</td>
                    <td className="px-3 py-2 text-sm text-slate-700 sm:px-4">
                      {t.timestamp}
                    </td>
                    <td className="px-3 py-2 text-sm text-slate-700 sm:px-4">{t.market}</td>
                    <td className="px-3 py-2 text-sm text-slate-700 sm:px-4">
                      {t.exchangePair}
                    </td>
                    <td className="px-3 py-2 text-sm sm:px-4">
                      <span
                        className={[
                          "inline-flex items-center rounded-md px-2 py-1 text-xs ring-1",
                          colors(t.edgePct),
                        ].join(" ")}
                      >
                        {t.edgePct > 0 ? "+" : ""}
                        {fmtPct(t.edgePct)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-sm text-slate-700 sm:px-4">
                      {fmtMoney(t.capital)}
                    </td>
                    <td className="px-3 py-2 text-sm text-slate-700 sm:px-4">
                      {fmtMoney(t.costs)}
                    </td>
                    <td className="px-3 py-2 text-sm sm:px-4">
                      <span
                        className={[
                          "font-semibold",
                          t.netPnl >= 0 ? "text-emerald-600" : "text-rose-600",
                        ].join(" ")}
                      >
                        {t.netPnl >= 0 ? "+" : ""}
                        {fmtMoney(t.netPnl)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-sm sm:px-4">
                      <span
                        className={[
                          "inline-flex items-center rounded-md px-2 py-1 text-xs ring-1",
                          colors(t.roiPct),
                        ].join(" ")}
                      >
                        {t.roiPct > 0 ? "+" : ""}
                        {fmtPct(t.roiPct)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-sm text-slate-700 sm:px-4">
                      {t.durationMin}m
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
