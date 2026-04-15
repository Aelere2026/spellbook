import React, { useMemo, useState } from "react";
import LineGraph from "./LineGraph";
import { api } from "../utils/api";
import { useTheme } from "../context/ThemeContext";

// Define allowed time scale values
type TimeScale = "minute" | "day" | "week" | "month";

const GainLoss: React.FC = () => {
  // Get current theme and determine if dark mode is active
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // State for selected time scale (default = day)
  const [timeScale, setTimeScale] = useState<TimeScale>("day");

  // Fetch arbitrage data from API with auto-refresh every 5 seconds
  const { data: arbData, isLoading } = api.arbitrages.get.useQuery(undefined, {
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });

  // Fallback to empty array if no data
  const arbitrages = arbData ?? [];

  // Formats the label shown on the chart depending on time scale
  const formatBucketLabel = (date: Date, scale: TimeScale) => {
    if (scale === "minute") {
      // Show hour and minute
      return new Intl.DateTimeFormat(undefined, {
        hour: "numeric",
        minute: "2-digit",
      }).format(date);
    }

    if (scale === "day") {
      // Show month and day
      return new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
      }).format(date);
    }

    if (scale === "week") {
      // Compute start of the week (Monday)
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

    // Default: month + year
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      year: "numeric",
    }).format(date);
  };

  // Generates a unique key for grouping data into time buckets
  const bucketKey = (date: Date, scale: TimeScale) => {
    const d = new Date(date);

    if (scale === "minute") {
      d.setSeconds(0, 0); // normalize to minute
      return d.toISOString();
    }

    if (scale === "day") {
      d.setHours(0, 0, 0, 0); // normalize to day
      return d.toISOString();
    }

    if (scale === "week") {
      // normalize to start of week
      const day = d.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      d.setDate(d.getDate() + diff);
      d.setHours(0, 0, 0, 0);
      return d.toISOString();
    }

    // normalize to start of month
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  };

  // Memoized computation of grouped chart data
  const chartData = useMemo(() => {
    // Map to group values by time bucket
    const grouped = new Map<string, { label: string; value: number; date: Date }>();

    for (const a of arbitrages) {
      const executionRaw = a.executionTime;
      if (!executionRaw) continue;

      const executionDate = new Date(executionRaw);
      if (Number.isNaN(executionDate.getTime())) continue;

      // Generate grouping key and label
      const key = bucketKey(executionDate, timeScale);
      const label = formatBucketLabel(executionDate, timeScale);
      const netProfit = Number(a.netProfit ?? 0);

      // Initialize bucket if it doesn't exist
      if (!grouped.has(key)) {
        grouped.set(key, { label, value: 0, date: new Date(key) });
      }

      // Accumulate net profit into the bucket
      grouped.get(key)!.value += netProfit;
    }

    // Convert to array and sort chronologically
    return Array.from(grouped.values()).sort(
      (a, b) => a.date.getTime() - b.date.getTime(),
    );
  }, [arbitrages, timeScale]);

  // Maximum number of points to display for minute-level data
  const MAX_MINUTE_POINTS = 30;

  // Downsample data if too many minute points exist
  const displayData = useMemo(() => {
    if (timeScale !== "minute") {
      return chartData;
    }

    const n = chartData.length;

    // No need to sample if already small
    if (n <= MAX_MINUTE_POINTS) {
      return chartData;
    }

    // Evenly sample points across dataset
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

    // Fallback if sampling fails
    if (sampled.length === 0) {
      return chartData;
    }

    return sampled;
  }, [chartData, timeScale]);

  // Extract labels and values for the graph
  const timeData = displayData.map((d) => d.label);
  const gainLossData = displayData.map((d) => d.value);

  // Compute summary metrics
  const latest = gainLossData.length > 0 ? gainLossData[gainLossData.length - 1] : 0;
  const previous = gainLossData.length > 1 ? gainLossData[gainLossData.length - 2] : 0;
  const change = latest - previous;

  // Compute average gain/loss
  const avg =
    gainLossData.length > 0
      ? gainLossData.reduce((sum, value) => sum + value, 0) / gainLossData.length
      : 0;

  // Human-readable label for selected time scale
  const scaleLabel =
    timeScale === "minute"
      ? "Minute"
      : timeScale === "day"
        ? "Day"
        : timeScale === "week"
          ? "Week"
          : "Month";

  // Show loading screen while fetching data
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-violet-100">
        Loading gain/loss analysis...
      </div>
    );
  }

  // Main UI rendering
  return (
    <div className={`relative min-h-screen ${isDark ? "text-violet-50" : "text-gray-900"}`}>
      <div className="mx-auto max-w-7xl px-6 py-8 sm:px-8 lg:px-10">
        {/* Summary section */}
        <section
          style={!isDark ? { background: "linear-gradient(135deg, #f5f0ff, #ede8ff)" } : undefined}
          className={[
            "relative overflow-hidden rounded-[2rem] border px-8 py-12 backdrop-blur-xl",
            isDark
              ? "border-violet-400/10 bg-gradient-to-br from-[#120d22]/95 via-[#161028]/95 to-[#09070f]/95 shadow-[0_25px_80px_rgba(15,8,35,0.55)]"
              : "border-violet-200 shadow-sm",
          ].join(" ")}
        >
          {/* Decorative gradient overlay (dark mode only) */}
          {isDark && (
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(139,92,246,0.22),transparent_35%),radial-gradient(circle_at_80%_20%,rgba(168,85,247,0.12),transparent_25%)]" />
          )}

          <div className="relative">
            {/* Section label */}
            <div
              className={`inline-flex items-center rounded-full border px-4 py-1 text-xs font-medium uppercase tracking-[0.22em] ${
                isDark
                  ? "border-violet-400/15 bg-violet-500/10 text-violet-200/80"
                  : "border-violet-300 bg-violet-100 text-violet-600"
              }`}
            >
              Performance Overview
            </div>

            {/* Title */}
            <h1
              className={`mt-5 text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl ${
                isDark ? "text-white" : "text-violet-900"
              }`}
            >
              Gain/Loss Analysis
            </h1>

            {/* Metrics cards */}
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {/* Latest value */}
              <div
                style={!isDark ? { background: "linear-gradient(135deg, #f0e8ff, #e8deff)" } : undefined}
                className={`rounded-2xl border px-5 py-4 backdrop-blur-md ${
                  isDark ? "border-violet-400/10 bg-white/5" : "border-violet-200"
                }`}
              >
                <div className={`text-[11px] uppercase tracking-[0.2em]`}>
                  Latest {scaleLabel}
                </div>
                <div className="mt-2 text-2xl font-semibold">
                  {latest.toFixed(2)}
                </div>
              </div>

              {/* Change vs previous */}
              <div className="rounded-2xl border px-5 py-4">
                <div className="text-[11px] uppercase tracking-[0.2em]">
                  Change vs Previous
                </div>
                <div className="mt-2 text-2xl font-semibold">
                  {change >= 0 ? "+" : ""}
                  {change.toFixed(2)}
                </div>
              </div>

              {/* Average */}
              <div className="rounded-2xl border px-5 py-4">
                <div className="text-[11px] uppercase tracking-[0.2em]">
                  Average {scaleLabel}
                </div>
                <div className="mt-2 text-2xl font-semibold">
                  {avg.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Graph section */}
        <section className="mt-8 rounded-[2rem] border p-5">
          {/* Header + controls */}
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Gain/Loss Trend</h2>
              <p className="mt-1 text-sm">
                Net profit grouped by the selected time scale.
              </p>
            </div>

            {/* Time scale selector */}
            <div className="flex items-center gap-3">
              <label htmlFor="timescale" className="text-sm font-medium">
                Time Scale
              </label>
              <select
                id="timescale"
                value={timeScale}
                onChange={(e) => setTimeScale(e.target.value as TimeScale)}
              >
                <option value="minute">Minutes</option>
                <option value="day">Days</option>
                <option value="week">Weeks</option>
                <option value="month">Months</option>
              </select>
            </div>
          </div>

          {/* Graph container */}
          <div className="rounded-[1.5rem] border p-3 sm:p-4 lg:p-6">
            <LineGraph
              gainLossData={gainLossData}
              timeData={timeData}
              xAxisLabel={scaleLabel}
              yAxisLabel="Net Profit"
              title={`Gain/Loss Trend by ${scaleLabel}`}
              isDark={isDark}
            />
          </div>
        </section>
      </div>
    </div>
  );
};

export default GainLoss;