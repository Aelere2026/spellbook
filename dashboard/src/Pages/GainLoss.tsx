import React from "react";
import LineGraph from "./LineGraph";

const GainLoss: React.FC = () => {
  const timeData = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  const gainLossData = [0.8, 1.1, 0.95, 1.3, 1.25, 1.5];

  const latest = gainLossData[gainLossData.length - 1];
  const previous = gainLossData[gainLossData.length - 2];
  const change = latest - previous;
  const avg =
    gainLossData.reduce((sum, value) => sum + value, 0) / gainLossData.length;

  return (
    <div className="relative min-h-screen text-violet-50">
      <div className="mx-auto max-w-7xl px-6 py-8 sm:px-8 lg:px-10">
        <section className="relative overflow-hidden rounded-[2rem] border border-violet-400/10 bg-gradient-to-br from-[#120d22]/95 via-[#161028]/95 to-[#09070f]/95 px-8 py-12 shadow-[0_25px_80px_rgba(15,8,35,0.55)] backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(139,92,246,0.22),transparent_35%),radial-gradient(circle_at_80%_20%,rgba(168,85,247,0.12),transparent_25%)]" />

          <div className="relative">
            <div className="inline-flex items-center rounded-full border border-violet-400/15 bg-violet-500/10 px-4 py-1 text-xs font-medium uppercase tracking-[0.22em] text-violet-200/80">
              Performance Overview
            </div>

            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Gain/Loss Analysis
            </h1>

            <p className="mt-3 max-w-2xl text-base text-violet-200/70 sm:text-lg">
              
            </p>

            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-violet-400/10 bg-white/5 px-5 py-4 backdrop-blur-md">
                <div className="text-[11px] uppercase tracking-[0.2em] text-violet-200/55">
                  Latest Ratio
                </div>
                <div className="mt-2 text-2xl font-semibold text-white">
                  {latest.toFixed(2)}
                </div>
              </div>

              <div className="rounded-2xl border border-violet-400/10 bg-white/5 px-5 py-4 backdrop-blur-md">
                <div className="text-[11px] uppercase tracking-[0.2em] text-violet-200/55">
                  Month-over-Month
                </div>
                <div
                  className={`mt-2 text-2xl font-semibold ${
                    change >= 0 ? "text-emerald-300" : "text-rose-300"
                  }`}
                >
                  {change >= 0 ? "+" : ""}
                  {change.toFixed(2)}
                </div>
              </div>

              <div className="rounded-2xl border border-violet-400/10 bg-white/5 px-5 py-4 backdrop-blur-md">
                <div className="text-[11px] uppercase tracking-[0.2em] text-violet-200/55">
                  Average Ratio
                </div>
                <div className="mt-2 text-2xl font-semibold text-white">
                  {avg.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-[2rem] border border-violet-400/12 bg-gradient-to-br from-[#0d0918]/95 via-[#120d22]/95 to-[#09070f]/95 p-5 shadow-[0_18px_60px_rgba(10,6,30,0.45)] backdrop-blur-xl sm:p-6 lg:p-8">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">
                Gain/Loss Trend
              </h2>
              <p className="mt-1 text-sm text-violet-200/60">
                Monthly performance trend across the selected period.
              </p>
            </div>

            <div className="inline-flex w-fit items-center rounded-full border border-violet-400/12 bg-violet-500/10 px-4 py-2 text-sm text-violet-200/80">
              Jan – Jun
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-violet-400/10 bg-[#070510]/70 p-3 sm:p-4 lg:p-6">
            <LineGraph
              timeData={timeData}
              gainLossData={gainLossData}
              xAxisLabel="Month"
              yAxisLabel="Gain/Loss Ratio"
              title="Gain/Loss Trend"
            />
          </div>
        </section>
      </div>
    </div>
  );
};

export default GainLoss;