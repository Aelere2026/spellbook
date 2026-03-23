import React from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../utils/api";

interface StatCardProps {
  title: string;
  value: string | number;
  tone?: "neutral" | "positive" | "negative";
  className?: string;
  onClick?: () => void;
}

const toneStyles: Record<NonNullable<StatCardProps["tone"]>, string> = {
  neutral: "text-violet-100",
  positive: "text-emerald-300",
  negative: "text-rose-300",
};

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  tone = "neutral",
  className,
  onClick,
}) => (
  <button
    type="button"
    onClick={onClick}
    className={[
      "group w-full text-left rounded-2xl border border-violet-300/15",
      "bg-gradient-to-br from-[#1b1430] via-[#24193d] to-[#120d22]",
      "shadow-[0_18px_45px_rgba(10,6,30,0.45)] backdrop-blur-xl",
      "px-4 py-4 transition-all duration-200",
      "hover:-translate-y-1 hover:border-violet-300/35 hover:shadow-[0_22px_60px_rgba(76,29,149,0.35)]",
      "active:translate-y-0 active:scale-[0.99]",
      "focus:outline-none focus:ring-2 focus:ring-violet-400/50",
      className ?? "",
    ].join(" ")}
  >
    <div className="text-[11px] uppercase tracking-[0.22em] text-violet-200/65">
      {title}
    </div>
    <div
      className={[
        "mt-2 text-2xl font-semibold transition-colors duration-200",
        "group-hover:text-white",
        toneStyles[tone],
      ].join(" ")}
    >
      {value}
    </div>
    <div className="mt-3 text-[11px] text-violet-200/45 group-hover:text-violet-200/70">
      Click to explore
    </div>
  </button>
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
    ? "bg-emerald-500/10 text-emerald-300 ring-emerald-400/20"
    : n < 0
      ? "bg-rose-500/10 text-rose-300 ring-rose-400/20"
      : "bg-violet-500/10 text-violet-200 ring-violet-400/20";

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const profit = 8420.17;

  const { data, isLoading } = api.markets.get.useQuery();
  const { data: arbit, isLoading: isArbitLoading } = api.arbitrages.get.useQuery();
  const { data: match, isLoading: isMatchLoading } = api.arbitrages.get.useQuery();


  {/*if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0814] text-violet-100">
        Loading...
      </div>
    );
  }*/}

  console.log(data);
  console.log(arbit)
  console.log(match)


  return (
    <div className="min-h-screen w-full bg-[radial-gradient(circle_at_top,_rgba(135,58,237,0.18),_transparent_28%),linear-gradient(180deg,_#0b0915_0%,_#120d22_50%,_#09070f_100%)] text-violet-50">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(136, 84, 255, 0.14),transparent_22%),radial-gradient(circle_at_80%_0%,rgba(178, 96, 255, 0.1),transparent_20%)]" />

      <div className="relative mx-auto w-full px-6 py-6 sm:px-8 lg:px-10">
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-violet-300/10 bg-white/2 px-5 py-4 shadow-[0_12px_35px_rgba(10,6,30,0.35)] backdrop-blur-xl">
          <img src="/favicon.ico" className="h-12 w-12 rounded-xl" />
          <div>
            <div className="text-3xl font-semibold tracking-wide text-white">
              SPeLLbook
            </div>

          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.05fr_1.6fr_1.05fr]">
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              title="Gain/Loss"
              value="1.35"
              onClick={() => navigate("/gain-loss")}
            />
            <StatCard
              title="Opportunities"
              value="2,740"
              //onClick={() => navigate("/opportunities")}
            />
            <StatCard
              title="Frequency"
              value="18"
              //onClick={() => navigate("/frequency")}
            />
            <StatCard
              title="Avg Trade Time"
              value="0.18 h"
              //onClick={() => navigate("/trade-time")}
            />
          </div>

          <button
            type="button"
            //onClick={() => navigate("/profit")}
            className={[
              "rounded-3xl border border-violet-400/15",
              "bg-gradient-to-br from-[#1a1230] via-[#25183f] to-[#110c1f]",
              "shadow-[0_22px_70px_rgba(20,10,50,0.45)] backdrop-blur-xl",
              "px-6 py-6 text-left transition-all duration-200",
              "hover:-translate-y-1 hover:border-violet-300/35 hover:shadow-[0_24px_80px_rgba(91,33,182,0.35)]",
              "active:translate-y-0 active:scale-[0.995]",
            ].join(" ")}
          >
            <div className="text-center text-sm tracking-[0.25em] text-violet-200/60">
              PROFIT
            </div>
            <div
              className={[
                "mt-6 text-center text-4xl font-semibold sm:text-5xl",
                profit >= 0 ? "text-emerald-300" : "text-rose-300",
              ].join(" ")}
            >
              {profit >= 0 ? "+" : ""}
              {fmtMoney(profit)}
            </div>
            <div className="mt-4 text-center text-sm text-violet-200/45">
              Click to view performance details
            </div>
          </button>

          <div className="grid grid-cols-2 gap-3">
            <StatCard
              title="Total Fee Loss"
              value="$3,912"
              //onClick={() => navigate("/fees")}
            />
            <StatCard
              title="Avg ROI"
              value="0.42%"
              //onClick={() => navigate("/roi")}
            />
            <StatCard
              title="Avg Slippage"
              value="0.031"
              //onClick={() => navigate("/slippage")}
            />
            <StatCard
              title="Exposure"
              value="0.87"
              //onClick={() => navigate("/exposure")}
            />
          </div>
        </div>

        <div className="mt-6 rounded-3xl border border-violet-400/12 bg-white/2 shadow-[0_18px_60px_rgba(10,6,30,0.35)] backdrop-blur-xl">
          <div className="flex items-center justify-between px-5 py-4 sm:px-6">
            <div> 
              <div className="text-sm font-semibold text-white">
                Trade History
              </div>
            </div>
          </div>

          <div className="overflow-x-auto px-2 pb-4 sm:px-4">
            <table className="min-w-full">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-[0.22em] text-violet-200/55">
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
                  <tr
                    key={t.id}
                    className="border-t border-violet-400/8 transition-colors hover:bg-white/5"
                  >
                    <td className="px-3 py-3 text-sm text-violet-100/90 sm:px-4">
                      {t.id}
                    </td>
                    <td className="px-3 py-3 text-sm text-violet-100/70 sm:px-4">
                      {t.timestamp}
                    </td>
                    <td className="px-3 py-3 text-sm text-violet-100/90 sm:px-4">
                      {t.market}
                    </td>
                    <td className="px-3 py-3 text-sm text-violet-100/70 sm:px-4">
                      {t.exchangePair}
                    </td>
                    <td className="px-3 py-3 text-sm sm:px-4">
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
                    <td className="px-3 py-3 text-sm text-violet-100/70 sm:px-4">
                      {fmtMoney(t.capital)}
                    </td>
                    <td className="px-3 py-3 text-sm text-violet-100/70 sm:px-4">
                      {fmtMoney(t.costs)}
                    </td>
                    <td className="px-3 py-3 text-sm sm:px-4">
                      <span
                        className={[
                          "font-semibold",
                          t.netPnl >= 0 ? "text-emerald-300" : "text-rose-300",
                        ].join(" ")}
                      >
                        {t.netPnl >= 0 ? "+" : ""}
                        {fmtMoney(t.netPnl)}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-sm sm:px-4">
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
                    <td className="px-3 py-3 text-sm text-violet-100/70 sm:px-4">
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