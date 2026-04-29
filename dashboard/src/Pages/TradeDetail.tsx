import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../utils/api";
import { useTheme } from "../context/ThemeContext";

const fmtMoney = (n: number) =>
  n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });

const fmtPct = (n: number) => `${n.toFixed(2)}%`;

interface FieldProps {
  label: string;
  value: React.ReactNode;
  isDark: boolean;
  highlight?: "positive" | "negative" | "neutral";
}

const Field: React.FC<FieldProps> = ({ label, value, isDark, highlight }) => {
  const valueColor =
    highlight === "positive"
      ? isDark ? "text-emerald-300" : "text-emerald-700"
      : highlight === "negative"
        ? isDark ? "text-rose-300" : "text-rose-700"
        : isDark ? "text-violet-100" : "text-violet-900";

  return (
    <div
      style={!isDark ? { background: "linear-gradient(135deg, #f5f0ff, #ede8ff)" } : undefined}
      className={[
        "rounded-2xl border px-5 py-4",
        isDark
          ? "border-violet-400/12 bg-gradient-to-br from-[#1b1430] via-[#24193d] to-[#120d22]"
          : "border-violet-200",
      ].join(" ")}
    >
      <div className={`text-[11px] uppercase tracking-[0.22em] ${isDark ? "text-violet-200/55" : "text-violet-400"}`}>
        {label}
      </div>
      <div className={`mt-2 text-base font-semibold break-all ${valueColor}`}>{value}</div>
    </div>
  );
};

const TradeDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const { data: trade, isLoading, isError } = api.arbitrages.getById.useQuery(
    { id: Number(id) },
    { enabled: !!id },
  );

  if (isLoading) {
    return (
      <div className={`flex min-h-[60vh] items-center justify-center ${isDark ? "text-violet-200" : "text-violet-700"}`}>
        Loading trade details…
      </div>
    );
  }

  if (isError || !trade) {
    return (
      <div className={`flex min-h-[60vh] flex-col items-center justify-center gap-4 ${isDark ? "text-violet-200" : "text-violet-700"}`}>
        <div>Trade not found.</div>
        <button
          type="button"
          onClick={() => navigate("/")}
          className={`rounded-xl border px-4 py-2 text-sm transition ${isDark ? "border-violet-400/20 hover:border-violet-400/50" : "border-violet-300 hover:border-violet-500"}`}
        >
          ← Back to Dashboard
        </button>
      </div>
    );
  }

  const netProfit = Number(trade.netProfit);
  const grossProfit = Number(trade.grossProfit);
  const totalFee = Number(trade.totalFee);
  const slippage = Number(trade.estimatedSlippage);
  const yesPrice = Number(trade.yesPrice);
  const noPrice = Number(trade.noPrice);

  const costs = totalFee + slippage;
  const roiPct = grossProfit > 0 ? (netProfit / grossProfit) * 100 : 0;
  const edgePct = (1 - (yesPrice + noPrice)) * 100;

  const detectionTime = new Date(trade.detectionTime);
  const executionTime = new Date(trade.executionTime);
  const durationMs = Math.max(0, executionTime.getTime() - detectionTime.getTime());

  const poly = trade.match.polymarketMarket;
  const kalshi = trade.match.kalshiMarket;

  const polymarketUrl = poly.slug ? `https://polymarket.com/market/${poly.slug}` : null;
  const kalshiUrl = kalshi.apiId ? `https://kalshi.com/events/${kalshi.apiId}` : null;

  return (
    <div className={`relative min-h-screen ${isDark ? "text-violet-50" : "text-gray-900"}`}>
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">

        {/* Back button */}
        <button
          type="button"
          onClick={() => navigate(-1)}
          className={`mb-6 inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm transition-all ${
            isDark
              ? "border-violet-400/20 text-violet-200/70 hover:border-violet-400/50 hover:text-violet-100"
              : "border-violet-300 text-violet-500 hover:border-violet-500 hover:text-violet-700"
          }`}
        >
          ← Back
        </button>

        {/* Header */}
        <div
          style={!isDark ? { background: "linear-gradient(135deg, #f5f0ff, #ede8ff)" } : undefined}
          className={[
            "mb-6 rounded-3xl border px-6 py-6 backdrop-blur-xl",
            isDark
              ? "border-violet-400/15 bg-gradient-to-br from-[#1a1230] via-[#25183f] to-[#110c1f] shadow-[0_22px_70px_rgba(20,10,50,0.45)]"
              : "border-violet-200 shadow-sm",
          ].join(" ")}
        >
          <div className={`text-[11px] uppercase tracking-[0.25em] ${isDark ? "text-violet-300/60" : "text-violet-400"}`}>
            Trade #{trade.id}
          </div>
          <h1 className={`mt-2 text-2xl font-semibold sm:text-3xl ${isDark ? "text-white" : "text-violet-900"}`}>
            {poly.title}
          </h1>
          <div className={`mt-1 text-sm ${isDark ? "text-violet-200/50" : "text-violet-400"}`}>
            Match score: <span className={`font-medium ${isDark ? "text-violet-200/80" : "text-violet-600"}`}>{(trade.match.matchScore * 100).toFixed(1)}%</span>
          </div>
        </div>

        {/* P&L summary row */}
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field
            isDark={isDark}
            label="Net PnL"
            value={`${netProfit >= 0 ? "+" : ""}${fmtMoney(netProfit)}`}
            highlight={netProfit >= 0 ? "positive" : "negative"}
          />
          <Field
            isDark={isDark}
            label="Gross Profit"
            value={fmtMoney(grossProfit)}
            highlight="neutral"
          />
          <Field
            isDark={isDark}
            label="Total Costs"
            value={fmtMoney(costs)}
            highlight="neutral"
          />
          <Field
            isDark={isDark}
            label="ROI"
            value={`${roiPct >= 0 ? "+" : ""}${fmtPct(roiPct)}`}
            highlight={roiPct >= 0 ? "positive" : "negative"}
          />
        </div>

        {/* Pricing & timing */}
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field isDark={isDark} label="Yes Price" value={fmtPct(yesPrice * 100)} />
          <Field isDark={isDark} label="No Price" value={fmtPct(noPrice * 100)} />
          <Field
            isDark={isDark}
            label="Edge %"
            value={`${edgePct >= 0 ? "+" : ""}${fmtPct(edgePct)}`}
            highlight={edgePct > 0 ? "positive" : "negative"}
          />
          <Field isDark={isDark} label="Side (Polymarket)" value={trade.polymarketYes ? "YES" : "NO"} />
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field isDark={isDark} label="Total Fee" value={fmtMoney(totalFee)} />
          <Field isDark={isDark} label="Est. Slippage" value={fmtMoney(slippage)} />
          <Field isDark={isDark} label="Duration" value={`${durationMs} ms`} />
          <Field isDark={isDark} label="Match Score" value={`${(trade.match.matchScore * 100).toFixed(1)}%`} />
        </div>

        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field isDark={isDark} label="Detection Time" value={detectionTime.toLocaleString()} />
          <Field isDark={isDark} label="Execution Time" value={executionTime.toLocaleString()} />
        </div>

        {/* Markets */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Polymarket */}
          <div
            style={!isDark ? { background: "linear-gradient(135deg, #f5f0ff, #ede8ff)" } : undefined}
            className={[
              "rounded-3xl border px-5 py-5",
              isDark
                ? "border-violet-400/12 bg-gradient-to-br from-[#1b1430] via-[#24193d] to-[#120d22]"
                : "border-violet-200",
            ].join(" ")}
          >
            <div className={`mb-3 text-[11px] uppercase tracking-[0.22em] ${isDark ? "text-violet-300/60" : "text-violet-400"}`}>
              Polymarket
            </div>
            <div className={`text-sm font-medium ${isDark ? "text-violet-100" : "text-violet-900"}`}>{poly.title}</div>
            <div className={`mt-2 grid grid-cols-2 gap-2 text-xs ${isDark ? "text-violet-200/60" : "text-violet-500"}`}>
              <span>Status: <span className={isDark ? "text-violet-200/90" : "text-violet-700"}>{poly.status}</span></span>
              <span>Fee: <span className={isDark ? "text-violet-200/90" : "text-violet-700"}>{Number(poly.fee) * 100}%</span></span>
              <span>Category: <span className={isDark ? "text-violet-200/90" : "text-violet-700"}>{poly.category}</span></span>
              <span>Resolution: <span className={isDark ? "text-violet-200/90" : "text-violet-700"}>{new Date(poly.resolutionDate).toLocaleDateString()}</span></span>
              {poly.outcome && (
                <span className="col-span-2">Outcome: <span className={`font-semibold ${isDark ? "text-emerald-300" : "text-emerald-700"}`}>{poly.outcome.outcome}</span></span>
              )}
            </div>
            {polymarketUrl && (
              <a
                href={polymarketUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`mt-3 inline-block text-xs hover:underline ${isDark ? "text-violet-300 hover:text-violet-100" : "text-violet-600 hover:text-violet-900"}`}
              >
                View on Polymarket →
              </a>
            )}
          </div>

          {/* Kalshi */}
          <div
            style={!isDark ? { background: "linear-gradient(135deg, #f5f0ff, #ede8ff)" } : undefined}
            className={[
              "rounded-3xl border px-5 py-5",
              isDark
                ? "border-violet-400/12 bg-gradient-to-br from-[#1b1430] via-[#24193d] to-[#120d22]"
                : "border-violet-200",
            ].join(" ")}
          >
            <div className={`mb-3 text-[11px] uppercase tracking-[0.22em] ${isDark ? "text-violet-300/60" : "text-violet-400"}`}>
              Kalshi
            </div>
            <div className={`text-sm font-medium ${isDark ? "text-violet-100" : "text-violet-900"}`}>{kalshi.title}</div>
            <div className={`mt-2 grid grid-cols-2 gap-2 text-xs ${isDark ? "text-violet-200/60" : "text-violet-500"}`}>
              <span>Status: <span className={isDark ? "text-violet-200/90" : "text-violet-700"}>{kalshi.status}</span></span>
              <span>Fee: <span className={isDark ? "text-violet-200/90" : "text-violet-700"}>{Number(kalshi.fee) * 100}%</span></span>
              <span>Category: <span className={isDark ? "text-violet-200/90" : "text-violet-700"}>{kalshi.category}</span></span>
              <span>Resolution: <span className={isDark ? "text-violet-200/90" : "text-violet-700"}>{new Date(kalshi.resolutionDate).toLocaleDateString()}</span></span>
              {kalshi.outcome && (
                <span className="col-span-2">Outcome: <span className={`font-semibold ${isDark ? "text-emerald-300" : "text-emerald-700"}`}>{kalshi.outcome.outcome}</span></span>
              )}
            </div>
            {kalshiUrl && (
              <a
                href={kalshiUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`mt-3 inline-block text-xs hover:underline ${isDark ? "text-violet-300 hover:text-violet-100" : "text-violet-600 hover:text-violet-900"}`}
              >
                View on Kalshi →
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TradeDetail;
