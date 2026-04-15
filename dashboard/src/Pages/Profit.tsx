import React, { useMemo, useState } from "react";
import LineGraph from "./LineGraph";
import { api } from "../utils/api";
import { useTheme } from "../context/ThemeContext";

// Define supported time scales for grouping data
type TimeScale = "minute" | "day" | "week" | "month";

// Define filter options for pre/post market closure
type ClosureFilter = "all" | "pre" | "post";

const Profits: React.FC = () => {
  // Theme handling for light/dark mode styling
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // State for time grouping and closure filtering
  const [timeScale, setTimeScale] = useState<TimeScale>("day");
  const [closureFilter, setClosureFilter] = useState<ClosureFilter>("all");

  // Fetch arbitrage data including market resolution info
  const { data: arbData } = api.arbitrages.getWithMarkets.useQuery(undefined, {
    refetchInterval: 5000, // auto-refresh every 5 seconds (5000 ms)
    refetchOnWindowFocus: true,
  });

  // Default to empty array if no data returned
  const arbitrages = arbData ?? [];

  // Separate trades executed before market resolution
  const preClose = arbitrages.filter(
    (a) => new Date(a.executionTime) < new Date(a.resolutionDate),
  );

  // Separate trades executed after market resolution
  const postClose = arbitrages.filter(
    (a) => new Date(a.executionTime) >= new Date(a.resolutionDate),
  );

  // Apply selected filter (all, pre, or post)
  const filteredArbitrages =
    closureFilter === "pre"
      ? preClose
      : closureFilter === "post"
        ? postClose
        : arbitrages;

  // Format labels for chart x-axis depending on time scale
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
      // Calculate start of week (Monday)
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

  // Create normalized grouping key based on selected time scale
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

    // Normalize to start of month
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  };

  // Build grouped chart data (net + gross profit)
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

      // Initialize bucket if needed
      if (!grouped.has(key)) {
        grouped.set(key, {
          label,
          netProfit: 0,
          grossProfit: 0,
          date: new Date(key),
        });
      }

      // Accumulate values into bucket
      const bucket = grouped.get(key)!;
      bucket.netProfit += netProfit;
      bucket.grossProfit += grossProfit;
    }

    // Convert to array and sort chronologically
    return Array.from(grouped.values()).sort(
      (a, b) => a.date.getTime() - b.date.getTime(),
    );
  }, [filteredArbitrages, timeScale]);

  // Limit number of points for minute-level charts
  const MAX_MINUTE_POINTS = 30;

  // Downsample minute data if too dense
  const displayData = useMemo(() => {
    if (timeScale !== "minute") {
      return chartData;
    }

    const n = chartData.length;

    if (n <= MAX_MINUTE_POINTS) {
      return chartData;
    }

    // Evenly sample across dataset
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

  // Extract arrays for graph input
  const timeData = displayData.map((d) => d.label);
  const netProfitData = displayData.map((d) => d.netProfit);
  const grossProfitData = displayData.map((d) => d.grossProfit);

  // Latest values for summary cards
  const latestNet =
    netProfitData.length > 0 ? netProfitData[netProfitData.length - 1] : 0;

  const latestGross =
    grossProfitData.length > 0
      ? grossProfitData[grossProfitData.length - 1]
      : 0;

  // Average values
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

  // Human-readable label for UI
  const scaleLabel =
    timeScale === "minute"
      ? "Minute"
      : timeScale === "day"
        ? "Day"
        : timeScale === "week"
          ? "Week"
          : "Month";

  // Total profits for pre/post closure comparisons
  const totalPreNet = preClose.reduce((s, a) => s + Number(a.netProfit), 0);
  const totalPostNet = postClose.reduce((s, a) => s + Number(a.netProfit), 0);

  // Options for closure filter buttons
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
        {/* Summary cards and overview section */}
        <section className="relative overflow-hidden rounded-[2rem] border px-8 py-12 backdrop-blur-xl">
          {/* Decorative background for dark mode */}
          {isDark && (
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(...)]" />
          )}

          <div className="relative">
            {/* Section label */}
            <div className="inline-flex items-center rounded-full border px-4 py-1 text-xs font-medium uppercase tracking-[0.22em]">
              Performance Overview
            </div>

            {/* Title */}
            <h1 className="mt-5 text-4xl font-semibold">
              Profits Analysis
            </h1>

            {/* Pre vs Post closure summary cards */}
            {/* Shows total net profit before and after market resolution */}
            {/* Also displays trade counts */}
            ...
          </div>
        </section>

        {/* Chart section */}
        <section className="mt-8 rounded-[2rem] border p-5">
          {/* Header + controls */}
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:justify-between">
            {/* Title and description */}
            <div>
              <h2 className="text-xl font-semibold">Profit Trends</h2>
              <p className="mt-1 text-sm">
                Net and gross profit grouped by the selected time scale.
              </p>
            </div>

            {/* Filters: closure type + time scale */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Closure filter buttons */}
              {/* Toggles between all, pre-closure, and post-closure trades */}
              ...

              {/* Time scale dropdown */}
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

          {/* Graphs */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            {/* Net profit chart */}
            <LineGraph
              gainLossData={netProfitData}
              timeData={timeData}
              xAxisLabel={scaleLabel}
              yAxisLabel="Net Profit"
              title={`Net Profit by ${scaleLabel}`}
              isDark={isDark}
            />

            {/* Gross profit chart */}
            <LineGraph
              gainLossData={grossProfitData}
              timeData={timeData}
              xAxisLabel={scaleLabel}
              yAxisLabel="Gross Profit"
              title={`Gross Profit by ${scaleLabel}`}
              isDark={isDark}
            />
          </div>
        </section>
      </div>
    </div>
  );
};

export default Profits;