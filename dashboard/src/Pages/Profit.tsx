import React, { useMemo, useState } from "react";
import LineGraph from "./LineGraph";
import { api } from "../utils/api";
import { useTheme } from "../context/ThemeContext";

type TimeScale = "minute" | "day" | "week" | "month";
type ClosureFilter = "all" | "pre" | "post";

const Profits: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [timeScale, setTimeScale] = useState<TimeScale>("day");
  const [closureFilter, setClosureFilter] = useState<ClosureFilter>("all");

  const { data: arbData } = api.arbitrages.getWithMarkets.useQuery(undefined, {
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });

  const arbitrages = arbData ?? [];

  const preClose = arbitrages.filter(
    (a) => new Date(a.executionTime) < new Date(a.resolutionDate),
  );

  const postClose = arbitrages.filter(
    (a) => new Date(a.executionTime) >= new Date(a.resolutionDate),
  );

  const filteredArbitrages =
    closureFilter === "pre"
      ? preClose
      : closureFilter === "post"
        ? postClose
        : arbitrages;

  const formatBucketLabel = (date: Date, scale: TimeScale) => {
    if (scale === "minute") {
      return new Intl.DateTimeFormat(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
    }

    if (scale === "day") {
      return new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
      }).format(date);
    }

    if (scale === "week") {
      const startOfWeek = new Date(date);
      const day = startOfWeek.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      startOfWeek.setDate(startOfWeek.getDate() + diff);
      startOfWeek.setHours(0, 0, 0, 0);

      return `Week of ${new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
      }).format(startOfWeek)}`;
    }

    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      year: "numeric",
    }).format(date);
  };

  const bucketKey = (date: Date, scale: TimeScale) => {
    const d = new Date(date);

    if (scale === "minute") {
      d.setSeconds(0, 0);
      return d.toISOString();
    }

    if (scale === "day") {
      d.setHours(0, 0, 0, 0);
      return d.toISOString();
    }

    if (scale === "week") {
      const day = d.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      d.setDate(d.getDate() + diff);
      d.setHours(0, 0, 0, 0);
      return d.toISOString();
    }

    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  };

  const chartData = useMemo(() => {
    const grouped = new Map<
      string,
      { label: string; netProfit: number; grossProfit: number; date: Date }
    >();

    for (const a of filteredArbitrages) {
      const executionRaw = a.executionTime;
      if (!executionRaw) continue;

      const executionDate = new Date(executionRaw);
      if (Number.isNaN(executionDate.getTime())) continue;

      const key = bucketKey(executionDate, timeScale);
      const label = formatBucketLabel(executionDate, timeScale);

      const netProfit = Number(a.netProfit ?? 0);
      const grossProfit = Number(a.grossProfit ?? 0);

      if (!grouped.has(key)) {
        grouped.set(key, {
          label,
          netProfit: 0,
          grossProfit: 0,
          date: new Date(key),
        });
      }

      const bucket = grouped.get(key)!;
      bucket.netProfit += netProfit;
      bucket.grossProfit += grossProfit;
    }

    return Array.from(grouped.values()).sort(
      (a, b) => a.date.getTime() - b.date.getTime(),
    );
  }, [filteredArbitrages, timeScale]);

  const MAX_MINUTE_POINTS = 30;

  const displayData = useMemo(() => {
    if (timeScale !== "minute") {
      return chartData;
    }

    const n = chartData.length;

    if (n <= MAX_MINUTE_POINTS) {
      return chartData;
    }

    const step = (n - 1) / (MAX_MINUTE_POINTS - 1);
    const sampled: typeof chartData = [];
    const usedIndices = new Set<number>();

    for (let i = 0; i < MAX_MINUTE_POINTS; i++) {
      const index = Math.round(i * step);

      if (!usedIndices.has(index) && chartData[index]) {
        sampled.push(chartData[index]);
        usedIndices.add(index);
      }
    }

    return sampled.length > 0 ? sampled : chartData;
  }, [chartData, timeScale]);

  const timeData = displayData.map((d) => d.label);
  const netProfitData = displayData.map((d) => d.netProfit);
  const grossProfitData = displayData.map((d) => d.grossProfit);

  const latestNet =
    netProfitData.length > 0 ? netProfitData[netProfitData.length - 1] : 0;

  const latestGross =
    grossProfitData.length > 0
      ? grossProfitData[grossProfitData.length - 1]
      : 0;

  const avgNet =
    netProfitData.length > 0
      ? netProfitData.reduce((sum, value) => sum + value, 0) /
        netProfitData.length
      : 0;

  const avgGross =
    grossProfitData.length > 0
      ? grossProfitData.reduce((sum, value) => sum + value, 0) /
        grossProfitData.length
      : 0;

  const scaleLabel =
    timeScale === "minute"
      ? "Minute"
      : timeScale === "day"
        ? "Day"
        : timeScale === "week"
          ? "Week"
          : "Month";

  const totalPreNet = preClose.reduce((s, a) => s + Number(a.netProfit), 0);
  const totalPostNet = postClose.reduce((s, a) => s + Number(a.netProfit), 0);

  const closureFilterOptions: { value: ClosureFilter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "pre", label: "Pre-closure" },
    { value: "post", label: "Post-closure" },
  ];

  return (
    <div
      className={`relative min-h-screen ${
        isDark ? "text-violet-50" : "text-gray-900"
      }`}
    >
      <div className="mx-auto max-w-7xl px-6 py-8 sm:px-8 lg:px-10">
        <section
          style={
            !isDark
              ? { background: "linear-gradient(135deg, #f5f0ff, #ede8ff)" }
              : undefined
          }
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
            <div
              className={`inline-flex items-center rounded-full border px-4 py-1 text-xs font-medium uppercase tracking-[0.22em] ${
                isDark
                  ? "border-violet-400/15 bg-violet-500/10 text-violet-200/80"
                  : "border-violet-300 bg-violet-100 text-violet-600"
              }`}
            >
              Performance Overview
            </div>

            <h1
              className={`mt-5 text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl ${
                isDark ? "text-white" : "text-violet-900"
              }`}
            >
              Profits Analysis
            </h1>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div
                style={
                  !isDark
                    ? {
                        background: "linear-gradient(135deg, #f0e8ff, #e8deff)",
                      }
                    : undefined
                }
                className={`rounded-2xl border px-5 py-4 backdrop-blur-md ${
                  isDark
                    ? "border-violet-400/10 bg-white/5"
                    : "border-violet-200"
                }`}
              >
                <div
                  className={`text-[11px] uppercase tracking-[0.2em] ${
                    isDark ? "text-violet-200/55" : "text-violet-400"
                  }`}
                >
                  Pre-closure Net Profit
                </div>
                <div
                  className={`mt-1 text-[11px] ${
                    isDark ? "text-violet-300/50" : "text-violet-400/70"
                  }`}
                >
                  {preClose.length} trade{preClose.length !== 1 ? "s" : ""} ·
                  executed before market resolved
                </div>
                <div
                  className={`mt-2 text-2xl font-semibold ${
                    totalPreNet >= 0
                      ? isDark
                        ? "text-emerald-300"
                        : "text-emerald-600"
                      : isDark
                        ? "text-rose-300"
                        : "text-rose-600"
                  }`}
                >
                  {totalPreNet >= 0 ? "+$" : "-$"}
                  {Math.abs(totalPreNet).toFixed(2)}
                </div>
              </div>

              <div
                style={
                  !isDark
                    ? {
                        background: "linear-gradient(135deg, #f0e8ff, #e8deff)",
                      }
                    : undefined
                }
                className={`rounded-2xl border px-5 py-4 backdrop-blur-md ${
                  isDark
                    ? "border-violet-400/10 bg-white/5"
                    : "border-violet-200"
                }`}
              >
                <div
                  className={`text-[11px] uppercase tracking-[0.2em] ${
                    isDark ? "text-violet-200/55" : "text-violet-400"
                  }`}
                >
                  Post-closure Net Profit
                </div>
                <div
                  className={`mt-1 text-[11px] ${
                    isDark ? "text-violet-300/50" : "text-violet-400/70"
                  }`}
                >
                  {postClose.length} trade{postClose.length !== 1 ? "s" : ""} ·
                  executed after market resolved
                </div>
                <div
                  className={`mt-2 text-2xl font-semibold ${
                    totalPostNet >= 0
                      ? isDark
                        ? "text-emerald-300"
                        : "text-emerald-600"
                      : isDark
                        ? "text-rose-300"
                        : "text-rose-600"
                  }`}
                >
                  {totalPostNet >= 0 ? "+$" : "-$"}
                  {Math.abs(totalPostNet).toFixed(2)}
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div
                style={
                  !isDark
                    ? {
                        background: "linear-gradient(135deg, #f0e8ff, #e8deff)",
                      }
                    : undefined
                }
                className={`rounded-2xl border px-5 py-4 backdrop-blur-md ${
                  isDark
                    ? "border-violet-400/10 bg-white/5"
                    : "border-violet-200"
                }`}
              >
                <div
                  className={`text-[11px] uppercase tracking-[0.2em] ${
                    isDark ? "text-violet-200/55" : "text-violet-400"
                  }`}
                >
                  Latest Net {scaleLabel}
                </div>
                <div
                  className={`mt-2 text-2xl font-semibold ${
                    latestNet >= 0
                      ? isDark
                        ? "text-emerald-300"
                        : "text-emerald-600"
                      : isDark
                        ? "text-rose-300"
                        : "text-rose-600"
                  }`}
                >
                  {latestNet >= 0 ? "+" : ""}
                  {latestNet.toFixed(2)}
                </div>
              </div>

              <div
                style={
                  !isDark
                    ? {
                        background: "linear-gradient(135deg, #f0e8ff, #e8deff)",
                      }
                    : undefined
                }
                className={`rounded-2xl border px-5 py-4 backdrop-blur-md ${
                  isDark
                    ? "border-violet-400/10 bg-white/5"
                    : "border-violet-200"
                }`}
              >
                <div
                  className={`text-[11px] uppercase tracking-[0.2em] ${
                    isDark ? "text-violet-200/55" : "text-violet-400"
                  }`}
                >
                  Latest Gross {scaleLabel}
                </div>
                <div
                  className={`mt-2 text-2xl font-semibold ${
                    latestGross >= 0
                      ? isDark
                        ? "text-emerald-300"
                        : "text-emerald-600"
                      : isDark
                        ? "text-rose-300"
                        : "text-rose-600"
                  }`}
                >
                  {latestGross >= 0 ? "+" : ""}
                  {latestGross.toFixed(2)}
                </div>
              </div>

              <div
                style={
                  !isDark
                    ? {
                        background: "linear-gradient(135deg, #f0e8ff, #e8deff)",
                      }
                    : undefined
                }
                className={`rounded-2xl border px-5 py-4 backdrop-blur-md ${
                  isDark
                    ? "border-violet-400/10 bg-white/5"
                    : "border-violet-200"
                }`}
              >
                <div
                  className={`text-[11px] uppercase tracking-[0.2em] ${
                    isDark ? "text-violet-200/55" : "text-violet-400"
                  }`}
                >
                  Average Net {scaleLabel}
                </div>
                <div
                  className={`mt-2 text-2xl font-semibold ${
                    isDark ? "text-white" : "text-violet-900"
                  }`}
                >
                  {avgNet.toFixed(2)}
                </div>
              </div>

              <div
                style={
                  !isDark
                    ? {
                        background: "linear-gradient(135deg, #f0e8ff, #e8deff)",
                      }
                    : undefined
                }
                className={`rounded-2xl border px-5 py-4 backdrop-blur-md ${
                  isDark
                    ? "border-violet-400/10 bg-white/5"
                    : "border-violet-200"
                }`}
              >
                <div
                  className={`text-[11px] uppercase tracking-[0.2em] ${
                    isDark ? "text-violet-200/55" : "text-violet-400"
                  }`}
                >
                  Average Gross {scaleLabel}
                </div>
                <div
                  className={`mt-2 text-2xl font-semibold ${
                    isDark ? "text-white" : "text-violet-900"
                  }`}
                >
                  {avgGross.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          style={
            !isDark
              ? { background: "linear-gradient(135deg, #f5f0ff, #ede8ff)" }
              : undefined
          }
          className={[
            "mt-8 rounded-[2rem] border p-5 backdrop-blur-xl sm:p-6 lg:p-8",
            isDark
              ? "border-violet-400/12 bg-gradient-to-br from-[#0d0918]/95 via-[#120d22]/95 to-[#09070f]/95 shadow-[0_18px_60px_rgba(10,6,30,0.45)]"
              : "border-violet-200 shadow-sm",
          ].join(" ")}
        >
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2
                className={`text-xl font-semibold ${
                  isDark ? "text-white" : "text-violet-900"
                }`}
              >
                Profit Trends
              </h2>
              <p
                className={`mt-1 text-sm ${
                  isDark ? "text-violet-200/60" : "text-violet-500"
                }`}
              >
                Net and gross profit grouped by the selected time scale.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div
                className={`flex gap-2 rounded-xl border p-1 ${
                  isDark
                    ? "border-violet-400/12 bg-violet-500/10"
                    : "border-violet-300 bg-violet-50"
                }`}
              >
                {closureFilterOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setClosureFilter(opt.value)}
                    className={[
                      isDark
                        ? "border-violet-300/15 bg-gradient-to-br from-[#1b1430] via-[#24193d] to-[#120d22] text-[#646cff] shadow-[0_12px_35px_rgba(10,6,30,0.35)] hover:-translate-y-0.5 hover:border-violet-300/35 hover:text-white hover:shadow-[0_16px_40px_rgba(76,29,149,0.25)]"
                        : "border-violet-200 bg-gradient-to-br from-[#f5f0ff] to-[#ede8ff] text-[#646cff] shadow-sm hover:-translate-y-0.5 hover:border-violet-300 hover:text-violet-900 hover:shadow-md",
                      "rounded-lg px-3 py-1 text-sm font-medium transition",
                      closureFilter === opt.value
                        ? isDark
                          ? "border-violet-300/15 bg-gradient-to-br from-[#1b1430] via-[#24193d] to-[#120d22] text-[#646cff] shadow-[0_12px_35px_rgba(10,6,30,0.35)] hover:-translate-y-0.5 hover:border-violet-300/35 hover:text-white hover:shadow-[0_16px_40px_rgba(76,29,149,0.25)]"
                          : "border-violet-200 bg-gradient-to-br from-[#f5f0ff] to-[#ede8ff] text-[#646cff] shadow-sm hover:-translate-y-0.5 hover:border-violet-300 hover:text-violet-900 hover:shadow-md"
                        : isDark
                          ? "text-violet-300/70 hover:text-violet-200"
                          : "text-violet-500 hover:text-violet-700",
                    ].join(" ")}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <label
                htmlFor="timescale"
                className={`text-sm font-medium ${
                  isDark ? "text-violet-200/75" : "text-violet-600"
                }`}
              >
                Time Scale
              </label>
              <select
                id="timescale"
                value={timeScale}
                onChange={(e) => setTimeScale(e.target.value as TimeScale)}
                className={[
                  "rounded-xl border px-4 py-2 text-sm outline-none ring-0 transition",
                  isDark
                    ? "border-violet-400/12 bg-violet-500/10 text-violet-100 focus:border-violet-300/30"
                    : "border-violet-300 bg-violet-50 text-violet-900 focus:border-violet-400",
                ].join(" ")}
              >
                <option value="minute">Minutes</option>
                <option value="day">Days</option>
                <option value="week">Weeks</option>
                <option value="month">Months</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <div
              className={`rounded-[1.5rem] border p-3 sm:p-4 lg:p-6 ${
                isDark
                  ? "border-violet-400/10 bg-[#070510]/70"
                  : "border-violet-200 bg-white/60"
              }`}
            >
              <LineGraph
                gainLossData={netProfitData}
                timeData={timeData}
                xAxisLabel={scaleLabel}
                yAxisLabel="Net Profit"
                title={`Net Profit by ${scaleLabel}`}
                isDark={isDark}
              />
            </div>

            <div
              className={`rounded-[1.5rem] border p-3 sm:p-4 lg:p-6 ${
                isDark
                  ? "border-violet-400/10 bg-[#070510]/70"
                  : "border-violet-200 bg-white/60"
              }`}
            >
              <LineGraph
                gainLossData={grossProfitData}
                timeData={timeData}
                xAxisLabel={scaleLabel}
                yAxisLabel="Gross Profit"
                title={`Gross Profit by ${scaleLabel}`}
                isDark={isDark}
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Profits;
