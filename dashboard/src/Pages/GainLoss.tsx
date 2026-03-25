import React from "react";
import LineGraph from "./LineGraph";
import { useTheme } from "../context/ThemeContext";

const GainLoss: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const timeData = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  const gainLossData = [0.8, 1.1, 0.95, 1.3, 1.25, 1.5];

  const latest = gainLossData[gainLossData.length - 1];
  const previous = gainLossData[gainLossData.length - 2];
  const change = latest - previous;
  const avg =
    gainLossData.reduce((sum, value) => sum + value, 0) / gainLossData.length;

  return (
    <div className={`relative min-h-screen ${isDark ? "text-violet-50" : "text-gray-900"}`}>
      <div className="mx-auto max-w-7xl px-6 py-8 sm:px-8 lg:px-10">
        <section
          style={!isDark ? { background: "linear-gradient(135deg, #f5f0ff, #ede8ff)" } : undefined}
          className={[
            "relative overflow-hidden rounded-[2rem] border px-8 py-12 backdrop-blur-xl",
            isDark
              ? "border-violet-400/10 bg-gradient-to-br from-[#120d22]/95 via-[#161028]/95 to-[#09070f]/95 shadow-[0_25px_80px_rgba(15,8,35,0.55)]"
              : "border-violet-200 shadow-sm",
          ].join(" ")}
        >
          {isDark && (
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(139,92,246,0.22),transparent_35%),radial-gradient(circle_at_80%_20%,rgba(168,85,247,0.12),transparent_25%)]" />
          )}

          <div className="relative">
            <div className={`inline-flex items-center rounded-full border px-4 py-1 text-xs font-medium uppercase tracking-[0.22em] ${isDark ? "border-violet-400/15 bg-violet-500/10 text-violet-200/80" : "border-violet-300 bg-violet-100 text-violet-600"}`}>
              Performance Overview
            </div>

            <h1 className={`mt-5 text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl ${isDark ? "text-white" : "text-violet-900"}`}>
              Gain/Loss Analysis
            </h1>

            <p className={`mt-3 max-w-2xl text-base sm:text-lg ${isDark ? "text-violet-200/70" : "text-violet-500"}`}>

            </p>

            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[
                { label: "Latest Ratio", value: latest.toFixed(2), colored: false },
                { label: "Month-over-Month", value: `${change >= 0 ? "+" : ""}${change.toFixed(2)}`, colored: true, positive: change >= 0 },
                { label: "Average Ratio", value: avg.toFixed(2), colored: false },
              ].map((card) => (
                <div
                  key={card.label}
                  style={!isDark ? { background: "linear-gradient(135deg, #f0e8ff, #e8deff)" } : undefined}
                  className={`rounded-2xl border px-5 py-4 backdrop-blur-md ${isDark ? "border-violet-400/10 bg-white/5" : "border-violet-200"}`}
                >
                  <div className={`text-[11px] uppercase tracking-[0.2em] ${isDark ? "text-violet-200/55" : "text-violet-400"}`}>
                    {card.label}
                  </div>
                  <div className={`mt-2 text-2xl font-semibold ${
                    card.colored
                      ? card.positive
                        ? isDark ? "text-emerald-300" : "text-emerald-600"
                        : isDark ? "text-rose-300" : "text-rose-600"
                      : isDark ? "text-white" : "text-violet-900"
                  }`}>
                    {card.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          style={!isDark ? { background: "linear-gradient(135deg, #f5f0ff, #ede8ff)" } : undefined}
          className={[
            "mt-8 rounded-[2rem] border p-5 backdrop-blur-xl sm:p-6 lg:p-8",
            isDark
              ? "border-violet-400/12 bg-gradient-to-br from-[#0d0918]/95 via-[#120d22]/95 to-[#09070f]/95 shadow-[0_18px_60px_rgba(10,6,30,0.45)]"
              : "border-violet-200 shadow-sm",
          ].join(" ")}
        >
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className={`text-xl font-semibold ${isDark ? "text-white" : "text-violet-900"}`}>
                Gain/Loss Trend
              </h2>
              <p className={`mt-1 text-sm ${isDark ? "text-violet-200/60" : "text-violet-500"}`}>
                Monthly performance trend across the selected period.
              </p>
            </div>

            <div className={`inline-flex w-fit items-center rounded-full border px-4 py-2 text-sm ${isDark ? "border-violet-400/12 bg-violet-500/10 text-violet-200/80" : "border-violet-300 bg-violet-100 text-violet-600"}`}>
              Jan – Jun
            </div>
          </div>

          <div className={`rounded-[1.5rem] border p-3 sm:p-4 lg:p-6 ${isDark ? "border-violet-400/10 bg-[#070510]/70" : "border-violet-200 bg-white/60"}`}>
            <LineGraph
              timeData={timeData}
              gainLossData={gainLossData}
              xAxisLabel="Month"
              yAxisLabel="Gain/Loss Ratio"
              title="Gain/Loss Trend"
              isDark={isDark}
            />
          </div>
        </section>
      </div>
    </div>
  );
};

export default GainLoss;