import React, { useMemo, useState } from "react";
import LineGraph from "./LineGraph";
import { api } from "../utils/api";
import { useTheme } from "../context/ThemeContext";

type TimeScale = "minute" | "day" | "week" | "month";

const TotalFees: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [timeScale, setTimeScale] = useState<TimeScale>("day");

  const { data: arbData, isLoading } =
    api.arbitrages.getWithMarkets.useQuery(undefined, {
      refetchInterval: 5000,
      refetchOnWindowFocus: true,
    });

  const arbitrages = arbData ?? [];

  const formatCurrency = (value: number) =>
    `$${value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

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
    const grouped = new Map<string, { label: string; totalFees: number; date: Date }>();

    for (const a of arbitrages) {
      const executionRaw = a.executionTime;
      if (!executionRaw) continue;

      const executionDate = new Date(executionRaw);
      if (Number.isNaN(executionDate.getTime())) continue;

      const key = bucketKey(executionDate, timeScale);
      const label = formatBucketLabel(executionDate, timeScale);
      const shares = Number(a.shares ?? 1);
      const fee = Number(a.totalFee ?? 0) * shares;

      if (!grouped.has(key)) {
        grouped.set(key, {
          label,
          totalFees: 0,
          date: new Date(key),
        });
      }

      grouped.get(key)!.totalFees += fee;
    }

    return Array.from(grouped.values()).sort(
      (a, b) => a.date.getTime() - b.date.getTime(),
    );
  }, [arbitrages, timeScale]);

  const MAX_MINUTE_POINTS = 30;

  const displayData = useMemo(() => {
    if (timeScale !== "minute") return chartData;

    const n = chartData.length;
    if (n <= MAX_MINUTE_POINTS) return chartData;

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
  const feesData = displayData.map((d) => d.totalFees);

  const totalFees = arbitrages.reduce(
    (sum, a) => sum + Number(a.totalFee ?? 0) * Number(a.shares ?? 1),
    0,
  );

  const latest = feesData.length > 0 ? feesData[feesData.length - 1] : 0;
  const previous = feesData.length > 1 ? feesData[feesData.length - 2] : 0;
  const change = latest - previous;

  const avg =
    feesData.length > 0
      ? feesData.reduce((sum, value) => sum + value, 0) / feesData.length
      : 0;

  const scaleLabel =
    timeScale === "minute"
      ? "Minute"
      : timeScale === "day"
        ? "Day"
        : timeScale === "week"
          ? "Week"
          : "Month";

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-violet-100">
        Loading fees analysis...
      </div>
    );
  }

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
            <div
              className={`inline-flex items-center rounded-full border px-4 py-1 text-xs font-medium uppercase tracking-[0.22em] ${
                isDark
                  ? "border-violet-400/15 bg-violet-500/10 text-violet-200/80"
                  : "border-violet-300 bg-violet-100 text-violet-600"
              }`}
            >
              Cost Overview
            </div>

            <h1
              className={`mt-5 text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl ${
                isDark ? "text-white" : "text-violet-900"
              }`}
            >
              Fees Analysis
            </h1>

            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-4">
              <MetricCard title="Total Fees" value={formatCurrency(totalFees)} isDark={isDark} />
              <MetricCard title={`Latest ${scaleLabel}`} value={formatCurrency(latest)} isDark={isDark} />
              <MetricCard
                title="Change vs Previous"
                value={`${change >= 0 ? "+" : ""}${formatCurrency(change)}`}
                isDark={isDark}
                positive={change <= 0}
              />
              <MetricCard title={`Average ${scaleLabel}`} value={formatCurrency(avg)} isDark={isDark} />
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
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className={`text-xl font-semibold ${isDark ? "text-white" : "text-violet-900"}`}>
                Fees Trend
              </h2>
             
            </div>

            <div className="flex items-center gap-3">
              <label
                htmlFor="timescale"
                className={`text-sm font-medium ${isDark ? "text-violet-200/75" : "text-violet-600"}`}
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

          <div
            className={`rounded-[1.5rem] border p-3 sm:p-4 lg:p-6 ${
              isDark
                ? "border-violet-400/10 bg-[#070510]/70"
                : "border-violet-200 bg-white/60"
            }`}
          >
            <LineGraph
              gainLossData={feesData}
              timeData={timeData}
              xAxisLabel={scaleLabel}
              yAxisLabel="Total Fees"
              title={`Fees by ${scaleLabel}`}
              isDark={isDark}
            />
          </div>
        </section>
      </div>
    </div>
  );
};

const MetricCard = ({
  title,
  value,
  isDark,
  positive,
}: {
  title: string;
  value: string | number;
  isDark: boolean;
  positive?: boolean;
}) => (
  <div
    style={!isDark ? { background: "linear-gradient(135deg, #f0e8ff, #e8deff)" } : undefined}
    className={`rounded-2xl border px-5 py-4 backdrop-blur-md ${
      isDark ? "border-violet-400/10 bg-white/5" : "border-violet-200"
    }`}
  >
    <div
      className={`text-[11px] uppercase tracking-[0.2em] ${
        isDark ? "text-violet-200/55" : "text-violet-400"
      }`}
    >
      {title}
    </div>

    <div
      className={`mt-2 text-2xl font-semibold ${
        positive === undefined
          ? isDark
            ? "text-white"
            : "text-violet-900"
          : positive
            ? isDark
              ? "text-emerald-300"
              : "text-emerald-600"
            : isDark
              ? "text-rose-300"
              : "text-rose-600"
      }`}
    >
      {value}
    </div>
  </div>
);

export default TotalFees;