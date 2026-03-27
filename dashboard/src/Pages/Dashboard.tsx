import React from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../utils/api";
import { useTheme } from "../context/ThemeContext";

interface StatCardProps {
  title: string;
  value: string | number;
  tone?: "neutral" | "positive" | "negative";
  className?: string;
  onClick?: () => void;
  isDark?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  tone = "neutral",
  className,
  onClick,
  isDark = true,
}) => {
  const toneStyle =
    tone === "positive"
      ? isDark
        ? "text-emerald-300"
        : "text-emerald-600"
      : tone === "negative"
        ? isDark
          ? "text-rose-300"
          : "text-rose-600"
        : isDark
          ? "text-violet-100"
          : "text-violet-900";

  return (
    <button
      type="button"
      onClick={onClick}
      style={
        !isDark
          ? { background: "linear-gradient(135deg, #f5f0ff, #ede8ff)" }
          : undefined
      }
      className={[
        "group w-full text-left rounded-2xl border transition-all duration-200",
        "px-4 py-4 backdrop-blur-xl",
        "hover:-translate-y-1 active:translate-y-0 active:scale-[0.99]",
        "focus:outline-none focus:ring-2 focus:ring-violet-400/50",
        isDark
          ? "border-violet-300/15 bg-gradient-to-br from-[#1b1430] via-[#24193d] to-[#120d22] shadow-[0_18px_45px_rgba(10,6,30,0.45)] hover:border-violet-300/35 hover:shadow-[0_22px_60px_rgba(76,29,149,0.35)]"
          : "border-violet-200 shadow-sm hover:border-violet-400 hover:shadow-md",
        className ?? "",
      ].join(" ")}
    >
      <div
        className={`text-[11px] uppercase tracking-[0.22em] ${isDark ? "text-violet-200/65" : "text-violet-400"}`}
      >
        {title}
      </div>
      <div
        className={`mt-2 text-2xl font-semibold transition-colors duration-200 ${toneStyle}`}
      >
        {value}
      </div>
      <div
        className={`mt-3 text-[11px] ${isDark ? "text-violet-200/45 group-hover:text-violet-200/70" : "text-violet-300 group-hover:text-violet-500"}`}
      >
        Click to explore
      </div>
    </button>
  );
};

const fmtMoney = (n: number) =>
  n.toLocaleString(undefined, { style: "currency", currency: "USD" });

const fmtPct = (n: number) => `${n.toFixed(2)}%`;

const colors = (n: number, isDark: boolean) =>
  n > 0
    ? isDark
      ? "bg-emerald-500/10 text-emerald-300 ring-emerald-400/20"
      : "bg-emerald-50 text-emerald-700 ring-emerald-300/50"
    : n < 0
      ? isDark
        ? "bg-rose-500/10 text-rose-300 ring-rose-400/20"
        : "bg-rose-50 text-rose-700 ring-rose-300/50"
      : isDark
        ? "bg-violet-500/10 text-violet-200 ring-violet-400/20"
        : "bg-violet-50 text-violet-700 ring-violet-300/50";

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const { data: mar, isLoading: isMarketLoading } = api.markets.get.useQuery();
  const { data: arb, isLoading: isArbitLoading } = api.arbitrages.get.useQuery(
    undefined,
    {
      refetchInterval: 5000,
      refetchOnWindowFocus: true,
      notifyOnChangeProps: "all",
    },
  );
  const { data: mat, isLoading: isMatchLoading } = api.matches.get.useQuery();
  const { data: stats, isLoading: isStatsLoading } =
    api.arbitrages.stats.useQuery(undefined, {
      refetchInterval: 5000,
      refetchOnWindowFocus: true,
      notifyOnChangeProps: "all",
    });

  const market = mar ?? [];
  const arbit = arb ?? [];
  const match = mat ?? [];

  console.log(market);
  console.log(arbit);
  console.log(match);
  console.log(stats);

  const trades = arbit.map((a) => {
    const grossProfit = Number(a.grossProfit);
    const netProfit = Number(a.netProfit);
    const totalFee = Number(a.totalFee);
    const slippage = Number(a.estimatedSlippage);

    const matched = match.find((m) => m.id === a.matchId);
    const matchScore = Number(matched?.matchScore);

    const deduction = new Date(a.detectionTime);
    const execution = new Date(a.executionTime);

    const durationMin = Math.max(
      0,
      Math.round((execution.getTime() - deduction.getTime()) / 60000),
    );

    const capital = grossProfit;
    const costs = totalFee + slippage;
    const roiPct = capital > 0 ? (netProfit / capital) * 100 : 0;

    const pairMatch = match.find((m) => m.id === a.matchId);
    const polymarket_id = Number(pairMatch?.polymarketMarketId);
    const pairMarket = market.find((p) => p.id === polymarket_id);
    const title = pairMarket?.title;

    const edge_percent = Number(
      (1 - (Number(a.yesPrice) + Number(a.noPrice))) * 100,
    );

    return {
      id: a.id,
      market: title,
      exchangePair: "Polymarket / Kalshi",
      edgePct: edge_percent,
      matchScore: matchScore,
      capital,
      costs,
      netPnl: netProfit,
      roiPct,
      durationMin,
      timestamp: execution.toLocaleString(),
    };
  });

  return (
    <div className="relative">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.05fr_1.6fr_1.05fr]">
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            isDark={isDark}
            title="Gain/Loss"
            value={stats?.gainLoss ?? 0}
            onClick={() => navigate("/gain-loss")}
          />
          <StatCard
            isDark={isDark}
            title="Opportunities"
            value={stats?.opportunities ?? 0}
            onClick={() => navigate("/opportunities")}
          />
          <StatCard
            isDark={isDark}
            title="Frequency"
            value={stats?.frequency ?? 0}
          />
          <StatCard
            isDark={isDark}
            title="Avg Trade Time"
            value={`${stats?.avgTradeTime ?? 0} h`}
          />
        </div>

        <button
          type="button"
          style={
            !isDark
              ? { background: "linear-gradient(135deg, #f5f0ff, #ede8ff)" }
              : undefined
          }
          className={[
            "rounded-3xl border px-6 py-6 text-left transition-all duration-200",
            "hover:-translate-y-1 active:translate-y-0 active:scale-[0.995]",
            isDark
              ? "border-violet-400/15 bg-gradient-to-br from-[#1a1230] via-[#25183f] to-[#110c1f] shadow-[0_22px_70px_rgba(20,10,50,0.45)] backdrop-blur-xl hover:border-violet-300/35 hover:shadow-[0_24px_80px_rgba(91,33,182,0.35)]"
              : "border-violet-200 shadow-sm hover:border-violet-400 hover:shadow-md",
          ].join(" ")}
        >
          <div
            className={`text-center text-sm tracking-[0.25em] ${isDark ? "text-violet-200/60" : "text-violet-400"}`}
          >
            PROFIT
          </div>
          <div
            className={[
              "mt-6 text-center text-4xl font-semibold sm:text-5xl",
              (stats?.profit ?? 0) >= 0
                ? isDark
                  ? "text-emerald-300"
                  : "text-emerald-600"
                : isDark
                  ? "text-rose-300"
                  : "text-rose-600",
            ].join(" ")}
            onClick={() => navigate("/profit")}
          >
            {(stats?.profit ?? 0) >= 0 ? "+" : ""}
            {fmtMoney(stats?.profit ?? 0)}
          </div>
          <div
            className={`mt-4 text-center text-sm ${isDark ? "text-violet-200/45" : "text-violet-400"}`}
          >
            Click to view performance details
          </div>
        </button>

        <div className="grid grid-cols-2 gap-3">
          <StatCard
            isDark={isDark}
            title="Total Fee Loss"
            value={fmtMoney(stats?.totalFeeLoss ?? 0)}
          />
          <StatCard
            isDark={isDark}
            title="Avg ROI"
            value={`${stats?.avgRoi ?? 0}%`}
          />
          <StatCard
            isDark={isDark}
            title="Avg Slippage"
            value={stats?.avgSlippage ?? 0}
          />
          <StatCard
            isDark={isDark}
            title="Exposure"
            value={fmtMoney(stats?.exposure ?? 0)}
          />
        </div>
      </div>

      <div
        style={
          !isDark
            ? { background: "linear-gradient(135deg, #f5f0ff, #ede8ff)" }
            : undefined
        }
        className={[
          "mt-6 rounded-3xl border backdrop-blur-xl",
          isDark
            ? "border-violet-400/12 bg-white/2 shadow-[0_18px_60px_rgba(10,6,30,0.35)]"
            : "border-violet-200 shadow-sm",
        ].join(" ")}
      >
        <div className="flex items-center justify-between px-5 py-4 sm:px-6">
          <div>
            <div
              className={`text-sm font-semibold ${isDark ? "text-white" : "text-violet-900"}`}
            >
              Trade History
            </div>
          </div>
        </div>

        <div className="overflow-x-auto px-2 pb-4 sm:px-4">
          <table className="min-w-full">
            <thead>
              <tr
                className={`text-left text-[11px] uppercase tracking-[0.22em] ${isDark ? "text-violet-200/55" : "text-violet-500"}`}
              >
                <th className="px-3 py-2 sm:px-4">Trade ID</th>
                <th className="px-3 py-2 sm:px-4">Timestamp</th>
                <th className="px-3 py-2 sm:px-4">Market</th>
                <th className="px-3 py-2 sm:px-4">Exchange Pair</th>
                <th className="px-3 py-2 sm:px-4">Match Score</th>
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
                  className={`border-t transition-colors ${isDark ? "border-violet-400/8 hover:bg-white/5" : "border-violet-200/50 hover:bg-violet-100/50"}`}
                >
                  <td
                    className={`px-3 py-3 text-sm sm:px-4 ${isDark ? "text-violet-100/90" : "text-violet-900"}`}
                  >
                    {t.id}
                  </td>
                  <td
                    className={`px-3 py-3 text-sm sm:px-4 ${isDark ? "text-violet-100/70" : "text-violet-600"}`}
                  >
                    {t.timestamp}
                  </td>
                  <td
                    className={`px-3 py-3 text-sm sm:px-4 ${isDark ? "text-violet-100/90" : "text-violet-900"}`}
                  >
                    {t.market}
                  </td>
                  <td
                    className={`px-3 py-3 text-sm sm:px-4 ${isDark ? "text-violet-100/70" : "text-violet-600"}`}
                  >
                    {t.exchangePair}
                  </td>
                  <td className="px-3 py-3 text-sm sm:px-4">
                    <span
                      className={`font-semibold ${t.matchScore >= 0 ? (isDark ? "text-emerald-300" : "text-emerald-600") : isDark ? "text-rose-300" : "text-rose-600"}`}
                    >
                      {t.matchScore}%
                    </span>
                  </td>
                  <td className="px-3 py-3 text-sm sm:px-4">
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-1 text-xs ring-1 ${colors(t.edgePct, isDark)}`}
                    >
                      {t.edgePct > 0 ? "+" : ""}
                      {fmtPct(t.edgePct)}
                    </span>
                  </td>
                  <td
                    className={`px-3 py-3 text-sm sm:px-4 ${isDark ? "text-violet-100/70" : "text-violet-600"}`}
                  >
                    {fmtMoney(t.capital)}
                  </td>
                  <td
                    className={`px-3 py-3 text-sm sm:px-4 ${isDark ? "text-violet-100/70" : "text-violet-600"}`}
                  >
                    {fmtMoney(t.costs)}
                  </td>
                  <td className="px-3 py-3 text-sm sm:px-4">
                    <span
                      className={`font-semibold ${t.netPnl >= 0 ? (isDark ? "text-emerald-300" : "text-emerald-600") : isDark ? "text-rose-300" : "text-rose-600"}`}
                    >
                      {t.netPnl >= 0 ? "+" : ""}
                      {fmtMoney(t.netPnl)}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-sm sm:px-4">
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-1 text-xs ring-1 ${colors(t.roiPct, isDark)}`}
                    >
                      {t.roiPct > 0 ? "+" : ""}
                      {fmtPct(t.roiPct)}
                    </span>
                  </td>
                  <td
                    className={`px-3 py-3 text-sm sm:px-4 ${isDark ? "text-violet-100/70" : "text-violet-600"}`}
                  >
                    {t.durationMin}m
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
