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

  const { data: mar, isLoading: isMarketLoading } = api.markets.get.useQuery();
  const { data: arb, isLoading: isArbitLoading } = api.arbitrages.get.useQuery();
  const { data: mat, isLoading: isMatchLoading } = api.matches.get.useQuery();
  const { data: stats, isLoading: isStatsLoading } = api.arbitrages.stats.useQuery();

  const market = mar ?? [];
  const arbit = arb ?? [];
  const match = mat ?? [];

  {
    /*if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0814] text-violet-100">
        Loading...
      </div>
    );
  }*/
  }

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

    //to get the title
    // get the match id using the a.matchID
    const pairMatch = match.find((m) => m.id === a.matchId);
    // use that entry id matches to find the polymarketMatchId
    const polymarket_id = Number(pairMatch?.polymarketMarketId);
    // find the entry in markets with that polymarketMatchId
    const pairMarket = market.find((p) => p.id === polymarket_id);
    // get the title
    const title = pairMarket?.title;

    //get the edge
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
    {/* <div className="min-h-screen w-full bg-[radial-gradient(circle_at_top,_rgba(135,58,237,0.18),_transparent_28%),linear-gradient(180deg,_#0b0915_0%,_#120d22_50%,_#09070f_100%)] text-violet-50">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(136, 84, 255, 0.14),transparent_22%),radial-gradient(circle_at_80%_0%,rgba(178, 96, 255, 0.1),transparent_20%)]" />

      <div className="relative mx-auto w-full px-6 py-6 sm:px-8 lg:px-10"> */}
        {/* <div className="mb-6 flex items-center gap-3 rounded-2xl border border-violet-300/10 bg-white/2 px-5 py-4 shadow-[0_12px_35px_rgba(10,6,30,0.35)] backdrop-blur-xl">
          <img src="/favicon.ico" className="h-12 w-12 rounded-xl" />
          <div>
            <div className="text-3xl font-semibold tracking-wide text-white">
              SPeLLbook
            </div>
          </div>
        </div> */}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.05fr_1.6fr_1.05fr]">
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              title="Gain/Loss"
              value={stats?.gainLoss ?? 0}
              onClick={() => navigate("/gain-loss")}
            />
            <StatCard title="Opportunities" value={stats?.opportunities ?? 0} />
            <StatCard title="Frequency" value={stats?.frequency ?? 0} />
            <StatCard
              title="Avg Trade Time"
              value={`${stats?.avgTradeTime ?? 0} h`}
            />
          </div>

          <button
            type="button"
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
                (stats?.profit ?? 0) >= 0
                  ? "text-emerald-300"
                  : "text-rose-300",
              ].join(" ")}
            >
              {(stats?.profit ?? 0) >= 0 ? "+" : ""}
              {fmtMoney(stats?.profit ?? 0)}
            </div>
            <div className="mt-4 text-center text-sm text-violet-200/45">
              Click to view performance details
            </div>
          </button>

          <div className="grid grid-cols-2 gap-3">
            <StatCard
              title="Total Fee Loss"
              value={fmtMoney(stats?.totalFeeLoss ?? 0)}
            />
            <StatCard title="Avg ROI" value={`${stats?.avgRoi ?? 0}%`} />
            <StatCard title="Avg Slippage" value={stats?.avgSlippage ?? 0} />
            <StatCard title="Exposure" value={fmtMoney(stats?.exposure ?? 0)} />
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
                          "font-semibold",
                          t.matchScore >= 0
                            ? "text-emerald-300"
                            : "text-rose-300",
                        ].join(" ")}
                      >
                        {t.matchScore}
                        {"%"}
                      </span>
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
        {/* </div>
      </div> */}
    </div> 
  </div>
  );
};

export default Dashboard;
