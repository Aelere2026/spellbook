import React, { useMemo, useState } from "react";
import LineGraph from "./LineGraph";
import { api } from "../utils/api";

type TimeScale = "minute" | "day" | "week" | "month";

const GainLoss: React.FC = () => {
  const [timeScale, setTimeScale] = useState<TimeScale>("day");

  const { data: arbData, isLoading } = api.arbitrages.get.useQuery(undefined, {
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });

  const arbitrages = arbData ?? [];

  const formatBucketLabel = (date: Date, scale: TimeScale) => {
    if (scale === "minute") {
      return new Intl.DateTimeFormat(undefined, {
        hour: "numeric",
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
    const grouped = new Map<string, { label: string; value: number; date: Date }>();

    for (const a of arbitrages) {
      const executionRaw = a.executionTime;
      if (!executionRaw) continue;

      const executionDate = new Date(executionRaw);
      if (Number.isNaN(executionDate.getTime())) continue;

      const key = bucketKey(executionDate, timeScale);
      const label = formatBucketLabel(executionDate, timeScale);
      const netProfit = Number(a.netProfit ?? a.netProfit ?? 0);

      if (!grouped.has(key)) {
        grouped.set(key, {
          label,
          value: 0,
          date: new Date(key),
        });
      }

      grouped.get(key)!.value += netProfit;
    }

    return Array.from(grouped.values()).sort(
      (a, b) => a.date.getTime() - b.date.getTime(),
    );
  }, [arbitrages, timeScale]);

  const timeData = chartData.map((d) => d.label);
  const gainLossData = chartData.map((d) => d.value);

  const latest = gainLossData.length > 0 ? gainLossData[gainLossData.length - 1] : 0;
  const previous = gainLossData.length > 1 ? gainLossData[gainLossData.length - 2] : 0;
  const change = latest - previous;
  const avg =
    gainLossData.length > 0
      ? gainLossData.reduce((sum, value) => sum + value, 0) / gainLossData.length
      : 0;

  const scaleLabel =
    timeScale === "minute"
      ? "Minute"
      : timeScale === "day"
        ? "Day"
        : timeScale === "week"
          ? "Week"
          : "Month";

  const labelInterval = 30; // probably label every 30 min? idk tbh 

const filteredTimeData = timeData.map((label, i) => {
  if (timeScale === "minute") {
    return i % labelInterval === 0 ? label : "";
  }

  if (timeScale === "day") {
    return i % 2 === 0 ? label : ""; 
  }

  if (timeScale === "week") {
    return i % 1 === 0 ? label : "";
  }

  if (timeScale === "month") {
    return i % 1 === 0 ? label : "";
  }

  return label;
});
  
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-violet-100">
        Loading gain/loss analysis...
      </div>
    );
  }

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


            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-violet-400/10 bg-white/5 px-5 py-4 backdrop-blur-md">
                <div className="text-[11px] uppercase tracking-[0.2em] text-violet-200/55">
                  Latest {scaleLabel}
                </div>
                <div className="mt-2 text-2xl font-semibold text-white">
                  {latest.toFixed(2)}
                </div>
              </div>

              <div className="rounded-2xl border border-violet-400/10 bg-white/5 px-5 py-4 backdrop-blur-md">
                <div className="text-[11px] uppercase tracking-[0.2em] text-violet-200/55">
                  Change vs Previous
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
                  Average {scaleLabel}
                </div>
                <div className="mt-2 text-2xl font-semibold text-white">
                  {avg.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-[2rem] border border-violet-400/12 bg-gradient-to-br from-[#0d0918]/95 via-[#120d22]/95 to-[#09070f]/95 p-5 shadow-[0_18px_60px_rgba(10,6,30,0.45)] backdrop-blur-xl sm:p-6 lg:p-8">
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">Gain/Loss Trend</h2>
              <p className="mt-1 text-sm text-violet-200/60">
                Net profit grouped by the selected time scale.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <label
                htmlFor="timescale"
                className="text-sm font-medium text-violet-200/75"
              >
                Time Scale
              </label>
              <select
                id="timescale"
                value={timeScale}
                onChange={(e) => setTimeScale(e.target.value as TimeScale)}
                className="rounded-xl border border-violet-400/12 bg-violet-500/10 px-4 py-2 text-sm text-violet-100 outline-none ring-0 transition focus:border-violet-300/30"
              >
                <option value="minute">Minutes</option>
                <option value="day">Days</option>
                <option value="week">Weeks</option>
                <option value="month">Months</option>
              </select>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-violet-400/10 bg-[#070510]/70 p-3 sm:p-4 lg:p-6">
            <LineGraph
              gainLossData={gainLossData}
              timeData={filteredTimeData}
              xAxisLabel={scaleLabel}
              yAxisLabel="Net Profit"
              title={`Gain/Loss Trend by ${scaleLabel}`}
            />
          </div>
        </section>
      </div>
    </div>
  );
};

export default GainLoss;