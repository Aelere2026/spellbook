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
      ? isDark
        ? "text-emerald-300"
        : "text-emerald-700"
      : highlight === "negative"
        ? isDark
          ? "text-rose-300"
          : "text-rose-700"
        : isDark
          ? "text-violet-100"
          : "text-violet-900";

  return (
    <div
      style={
        !isDark
          ? { background: "linear-gradient(135deg, #f5f0ff, #ede8ff)" }
          : undefined
      }
      className={[
        "rounded-2xl border px-5 py-4",
        isDark
          ? "border-violet-400/12 bg-gradient-to-br from-[#1b1430] via-[#24193d] to-[#120d22]"
          : "border-violet-200",
      ].join(" ")}
    >
      <div
        className={`text-[11px] uppercase tracking-[0.22em] ${isDark ? "text-violet-200/55" : "text-violet-400"}`}
      >
        {label}
      </div>
      <div className={`mt-2 text-base font-semibold break-all ${valueColor}`}>
        {value}
      </div>
    </div>
  );
};

const TradeDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const {
    data: trade,
    isLoading,
    isError,
  } = api.arbitrages.getById.useQuery({ id: Number(id) }, { enabled: !!id });

  if (isLoading) {
    return (
      <div
        className={`flex min-h-[60vh] items-center justify-center ${isDark ? "text-violet-200" : "text-violet-700"}`}
      >
        Loading trade details…
      </div>
    );
  }

  if (isError || !trade) {
    return (
      <div
        className={`flex min-h-[60vh] flex-col items-center justify-center gap-4 ${isDark ? "text-violet-200" : "text-violet-700"}`}
      >
        <div>Trade not found.</div>
        <button
          type="button"
          onClick={() => navigate("/")}
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
  const shares = Number(trade.shares ?? 1);

  // Scale by shares for total position values
  const totalNetProfit = netProfit * shares;
  const totalGrossProfit = grossProfit * shares;
  const totalCosts = (totalFee + slippage) * shares;

  // Capital = what we actually spent (yesPrice + noPrice) × shares
  const capital = (yesPrice + noPrice) * shares;

  // ROI = net profit / capital deployed
  const roiPct = capital > 0 ? (totalNetProfit / capital) * 100 : 0;

  const edgePct = (1 - (yesPrice + noPrice)) * 100;

  const detectionTime = new Date(trade.detectionTime);
  const executionTime = new Date(trade.executionTime);
  const durationMs = Math.max(
    0,
    executionTime.getTime() - detectionTime.getTime(),
  );

  const poly = trade.match.polymarketMarket;
  const kalshi = trade.match.kalshiMarket;

  // Which platform bought YES and which bought NO
  const polymarketSide = trade.polymarketYes ? "YES" : "NO";
  const kalshiSide = trade.polymarketYes ? "NO" : "YES";

  // Price paid on each platform
  const polymarketPrice = trade.polymarketYes ? yesPrice : noPrice;
  const kalshiPrice = trade.polymarketYes ? noPrice : yesPrice;

  // Implied YES/NO prices on each platform
  const polyYesPrice = trade.polymarketYes ? polymarketPrice : 1 - polymarketPrice;
  const polyNoPrice = trade.polymarketYes ? 1 - polymarketPrice : polymarketPrice;
  const kalshiYesPrice = trade.polymarketYes ? 1 - kalshiPrice : kalshiPrice;
  const kalshiNoPrice = trade.polymarketYes ? kalshiPrice : 1 - kalshiPrice;

  const polymarketUrl = poly.slug
    ? `https://polymarket.com/market/${poly.slug}`
    : null;
  const kalshiUrl = kalshi.apiId
    ? `https://kalshi.com/events/${kalshi.apiId}`
    : null;

  return (
    <div
      className={`relative min-h-screen ${isDark ? "text-violet-50" : "text-gray-900"}`}
    >
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Back button */}
        <button
          type="button"
          onClick={() => navigate(-1)}
          className={`mb-6 inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm transition-all ${
            isDark
              ? "border-violet-300/15 bg-gradient-to-br from-[#1b1430] via-[#24193d] to-[#120d22] text-[#646cff] shadow-[0_12px_35px_rgba(10,6,30,0.35)] hover:-translate-y-0.5 hover:border-violet-300/35 hover:text-white hover:shadow-[0_16px_40px_rgba(76,29,149,0.25)]"
              : "border-violet-200 bg-gradient-to-br from-[#f5f0ff] to-[#ede8ff] text-[#646cff] shadow-sm hover:-translate-y-0.5 hover:border-violet-300 hover:text-violet-900 hover:shadow-md"
          }`}
        >
          ← Back
        </button>

        {/* Header */}
        <div
          style={
            !isDark
              ? { background: "linear-gradient(135deg, #f5f0ff, #ede8ff)" }
              : undefined
          }
          className={[
            "mb-6 rounded-3xl border px-6 py-6 backdrop-blur-xl",
            isDark
              ? "border-violet-400/15 bg-gradient-to-br from-[#1a1230] via-[#25183f] to-[#110c1f] shadow-[0_22px_70px_rgba(20,10,50,0.45)]"
              : "border-violet-200 shadow-sm",
          ].join(" ")}
        >
          <div
            className={`text-[11px] uppercase tracking-[0.25em] ${isDark ? "text-violet-300/60" : "text-violet-400"}`}
          >
            Trade #{trade.id}
          </div>
          <h1
            className={`mt-2 text-2xl font-semibold sm:text-3xl ${isDark ? "text-white" : "text-violet-900"}`}
          >
            {poly.title}
          </h1>
          <div
            className={`mt-1 text-sm ${isDark ? "text-violet-200/50" : "text-violet-400"}`}
          >
            Match score:{" "}
            <span
              className={`font-medium ${isDark ? "text-violet-200/80" : "text-violet-600"}`}
            >
              {trade.match.matchScore.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* P&L summary row */}
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field
            isDark={isDark}
            label="Net PnL (total)"
            value={
              <div>
                <div>{`${totalNetProfit >= 0 ? "+" : ""}${fmtMoney(totalNetProfit)}`}</div>
                <div className={`mt-1 text-[11px] font-normal ${isDark ? "text-violet-200/60" : "text-violet-500"}`}>
                  {fmtMoney(totalGrossProfit)} gross − {fmtMoney(totalCosts)} costs
                </div>
              </div>
            }
            highlight={totalNetProfit >= 0 ? "positive" : "negative"}
          />
          <Field
            isDark={isDark}
            label="Profit Per Share"
            value={`${netProfit >= 0 ? "+" : ""}${fmtMoney(netProfit)}`}
            highlight={netProfit >= 0 ? "positive" : "negative"}
          />
          <Field
            isDark={isDark}
            label="Total Costs"
            value={fmtMoney(totalCosts)}
            highlight="neutral"
          />
          <Field
            isDark={isDark}
            label="ROI"
            value={`${roiPct >= 0 ? "+" : ""}${fmtPct(roiPct)}`}
            highlight={roiPct >= 0 ? "positive" : "negative"}
          />
        </div>

        {/* Pricing & edge */}
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field
            isDark={isDark}
            label="Yes Price (per share)"
            value={fmtMoney(yesPrice)}
          />
          <Field
            isDark={isDark}
            label="No Price (per share)"
            value={fmtMoney(noPrice)}
          />
          <Field
            isDark={isDark}
            label="Edge %"
            value={`${edgePct >= 0 ? "+" : ""}${fmtPct(edgePct)}`}
            highlight={edgePct > 0 ? "positive" : "negative"}
          />
          <Field
            isDark={isDark}
            label="Shares"
            value={shares}
            highlight="neutral"
          />
        </div>

        {/* Fees & timing */}
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field isDark={isDark} label="Total Fee (per share)" value={fmtMoney(totalFee)} />
          <Field
            isDark={isDark}
            label="Est. Slippage (per share)"
            value={fmtMoney(slippage)}
          />
          <Field isDark={isDark} label="Match Score" value={`${trade.match.matchScore.toFixed(1)}%`} />
          <Field isDark={isDark} label="Duration" value={`${durationMs} ms`} />
        </div>

        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field
            isDark={isDark}
            label="Detection Time"
            value={detectionTime.toLocaleString()}
          />
          <Field
            isDark={isDark}
            label="Execution Time"
            value={executionTime.toLocaleString()}
          />
        </div>

        {/* Markets */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Polymarket */}
          <div
            style={
              !isDark
                ? { background: "linear-gradient(135deg, #f5f0ff, #ede8ff)" }
                : undefined
            }
            className={[
              "rounded-3xl border px-5 py-5",
              isDark
                ? "border-violet-400/12 bg-gradient-to-br from-[#1b1430] via-[#24193d] to-[#120d22]"
                : "border-violet-200",
            ].join(" ")}
          >
            <div
              className={`mb-3 text-[11px] uppercase tracking-[0.22em] ${isDark ? "text-violet-300/60" : "text-violet-400"}`}
            >
              Polymarket
            </div>
            <div
              className={`text-sm font-medium ${isDark ? "text-violet-100" : "text-violet-900"}`}
            >
              {poly.title}
            </div>

            {/* YES/NO prices */}
            <div className="mt-2 flex gap-4 text-xs font-semibold">
              <span className={isDark ? "text-emerald-300" : "text-emerald-700"}>
                YES: {fmtMoney(polyYesPrice)}
              </span>
              <span className={isDark ? "text-rose-300" : "text-rose-700"}>
                NO: {fmtMoney(polyNoPrice)}
              </span>
            </div>

            <div
              className={`mt-2 grid grid-cols-2 gap-2 text-xs ${isDark ? "text-violet-200/60" : "text-violet-500"}`}
            >
              <span>
                Status:{" "}
                <span className={isDark ? "text-violet-200/90" : "text-violet-700"}>
                  {poly.status}
                </span>
              </span>
              <span>
                Fee (taker):{" "}
                <span className={isDark ? "text-violet-200/90" : "text-violet-700"}>
                  {fmtMoney(totalFee)}
                </span>
              </span>
              <span>
                Side:{" "}
                <span className={`font-semibold ${polymarketSide === "YES" ? isDark ? "text-emerald-300" : "text-emerald-700" : isDark ? "text-rose-300" : "text-rose-700"}`}>
                  {polymarketSide}
                </span>
              </span>
              <span>
                Price paid:{" "}
                <span className={isDark ? "text-violet-200/90" : "text-violet-700"}>
                  {fmtMoney(polymarketPrice)}
                </span>
              </span>
              <span>
                Resolution:{" "}
                <span className={isDark ? "text-violet-200/90" : "text-violet-700"}>
                  {new Date(poly.resolutionDate).toLocaleDateString()}
                </span>
              </span>
              {poly.outcome && (
                <span className="col-span-2">
                  Outcome:{" "}
                  <span
                    className={`font-semibold ${isDark ? "text-emerald-300" : "text-emerald-700"}`}
                  >
                    {poly.outcome.outcome}
                  </span>
                </span>
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
            style={
              !isDark
                ? { background: "linear-gradient(135deg, #f5f0ff, #ede8ff)" }
                : undefined
            }
            className={[
              "rounded-3xl border px-5 py-5",
              isDark
                ? "border-violet-400/12 bg-gradient-to-br from-[#1b1430] via-[#24193d] to-[#120d22]"
                : "border-violet-200",
            ].join(" ")}
          >
            <div
              className={`mb-3 text-[11px] uppercase tracking-[0.22em] ${isDark ? "text-violet-300/60" : "text-violet-400"}`}
            >
              Kalshi
            </div>
            <div
              className={`text-sm font-medium ${isDark ? "text-violet-100" : "text-violet-900"}`}
            >
              {kalshi.title}
            </div>

            {/* YES/NO prices */}
            <div className="mt-2 flex gap-4 text-xs font-semibold">
              <span className={isDark ? "text-emerald-300" : "text-emerald-700"}>
                YES: {fmtMoney(kalshiYesPrice)}
              </span>
              <span className={isDark ? "text-rose-300" : "text-rose-700"}>
                NO: {fmtMoney(kalshiNoPrice)}
              </span>
            </div>

            <div
              className={`mt-2 grid grid-cols-2 gap-2 text-xs ${isDark ? "text-violet-200/60" : "text-violet-500"}`}
            >
              <span>
                Status:{" "}
                <span className={isDark ? "text-violet-200/90" : "text-violet-700"}>
                  {kalshi.status}
                </span>
              </span>
              <span>
                Fee (taker):{" "}
                <span className={isDark ? "text-violet-200/90" : "text-violet-700"}>
                  {fmtMoney(totalFee)}
                </span>
              </span>
              <span>
                Side:{" "}
                <span className={`font-semibold ${kalshiSide === "YES" ? isDark ? "text-emerald-300" : "text-emerald-700" : isDark ? "text-rose-300" : "text-rose-700"}`}>
                  {kalshiSide}
                </span>
              </span>
              <span>
                Price paid:{" "}
                <span className={isDark ? "text-violet-200/90" : "text-violet-700"}>
                  {fmtMoney(kalshiPrice)}
                </span>
              </span>
              <span>
                Resolution:{" "}
                <span className={isDark ? "text-violet-200/90" : "text-violet-700"}>
                  {new Date(kalshi.resolutionDate).toLocaleDateString()}
                </span>
              </span>
              {kalshi.outcome && (
                <span className="col-span-2">
                  Outcome:{" "}
                  <span
                    className={`font-semibold ${isDark ? "text-emerald-300" : "text-emerald-700"}`}
                  >
                    {kalshi.outcome.outcome}
                  </span>
                </span>
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