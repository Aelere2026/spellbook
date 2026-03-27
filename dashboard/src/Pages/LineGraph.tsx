import React from "react";

type LineGraphProps = {
  timeData: string[];
  gainLossData: number[];
  width?: number;
  height?: number;
  xAxisLabel?: string;
  yAxisLabel?: string;
  title?: string;
  isDark?: boolean;
};

const LineGraph: React.FC<LineGraphProps> = ({
  timeData,
  gainLossData,
  width = 800,
  height = 400,
  xAxisLabel = "Time",
  yAxisLabel = "Gain/Loss Ratio",
  title = "Gain/Loss Over Time",
  isDark = true,
}) => {
  if (timeData.length !== gainLossData.length || timeData.length === 0) {
    return (
      <div className="rounded-2xl border border-red-400/20 bg-red-950/20 p-4 text-red-200">
        Differing lengths for data
      </div>
    );
  }

  const margin = { top: 40, right: 30, bottom: 110, left: 80 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  const minValue = Math.min(...gainLossData);
  const maxValue = Math.max(...gainLossData);

  const yMin = minValue === maxValue ? minValue - 1 : minValue;
  const yMax = minValue === maxValue ? maxValue + 1 : maxValue;

  const xStep = timeData.length > 1 ? chartWidth / (timeData.length - 1) : 0;

  const getX = (index: number) => margin.left + index * xStep;

  const getY = (value: number) => {
    const scaled = (value - yMin) / (yMax - yMin);
    return margin.top + chartHeight - scaled * chartHeight;
  };

  const linePoints = gainLossData
    .map((value, index) => `${getX(index)},${getY(value)}`)
    .join(" ");

  const areaPoints = [
    `${getX(0)},${margin.top + chartHeight}`,
    ...gainLossData.map((value, index) => `${getX(index)},${getY(value)}`),
    `${getX(gainLossData.length - 1)},${margin.top + chartHeight}`,
  ].join(" ");

  const yTicks = 5;
  const tickValues = Array.from({ length: yTicks + 1 }, (_, i) => {
    return yMin + ((yMax - yMin) * i) / yTicks;
  });

  const gridColor = isDark ? "rgba(196,181,253,0.12)" : "rgba(139,92,246,0.15)";
  const axisColor = isDark ? "rgba(196,181,253,0.28)" : "rgba(139,92,246,0.3)";
  const tickTextColor = isDark ? "rgba(221,214,254,0.75)" : "rgba(109,40,217,0.8)";
  const labelColor = isDark ? "rgba(237,233,254,0.9)" : "rgba(109,40,217,0.9)";
  const titleColor = isDark ? "white" : "#4c1d95";

  return (
    <div
      style={!isDark ? { background: "linear-gradient(135deg, #f0e8ff, #e8deff)" } : undefined}
      className={`rounded-3xl border p-6 backdrop-blur-xl ${
        isDark
          ? "border-violet-400/15 bg-[#0a0715] shadow-[0_18px_60px_rgba(10,6,30,0.35)]"
          : "border-violet-200 shadow-sm"
      }`}
    >
      <h2 className="mb-1 text-3xl font-semibold" style={{ color: titleColor }}>
        {title}
      </h2>
      <p
        className="mb-4 text-sm"
        style={{ color: isDark ? "rgba(196,181,253,0.6)" : "rgba(109,40,217,0.6)" }}
      ></p>

      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full">
        <defs>
          <linearGradient id="lineGlow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={isDark ? "#c4b5fd" : "#7c3aed"} stopOpacity="1" />
            <stop offset="100%" stopColor={isDark ? "#7c3aed" : "#4c1d95"} stopOpacity="0.55" />
          </linearGradient>
          <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity={isDark ? "0.28" : "0.2"} />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.03" />
          </linearGradient>
        </defs>

        {tickValues.map((tick, i) => {
          const y = getY(tick);
          return (
            <g key={`y-tick-${i}`}>
              <line
                x1={margin.left}
                y1={y}
                x2={margin.left + chartWidth}
                y2={y}
                stroke={gridColor}
                strokeWidth="1"
              />
              <text
                x={margin.left - 12}
                y={y + 4}
                textAnchor="end"
                fontSize="11"
                fill={tickTextColor}
              >
                {tick.toFixed(2)}
              </text>
            </g>
          );
        })}

        <line
          x1={margin.left}
          y1={margin.top}
          x2={margin.left}
          y2={margin.top + chartHeight}
          stroke={axisColor}
          strokeWidth="1.5"
        />
        <line
          x1={margin.left}
          y1={margin.top + chartHeight}
          x2={margin.left + chartWidth}
          y2={margin.top + chartHeight}
          stroke={axisColor}
          strokeWidth="1.5"
        />

        <polygon points={areaPoints} fill="url(#areaFill)" />

        <polyline
          points={linePoints}
          fill="none"
          stroke="url(#lineGlow)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {gainLossData.map((value, index) => (
          <circle
            key={`point-${index}`}
            cx={getX(index)}
            cy={getY(value)}
            r="5"
            fill={isDark ? "#ddd6fe" : "#ede9fe"}
            stroke={isDark ? "#6d28d9" : "#7c3aed"}
            strokeWidth="2"
          />
        ))}

        {timeData.map((label, index) => (
          <text
            key={`x-label-${index}`}
            x={getX(index)}
            y={margin.top + chartHeight + 18}
            fontSize="10"
            fill={tickTextColor}
            textAnchor="end"
            transform={`rotate(-45 ${getX(index)} ${margin.top + chartHeight + 18})`}
          >
            {label}
          </text>
        ))}

        <text
          x={margin.left + chartWidth / 2}
          y={height - 20}
          textAnchor="middle"
          fontSize="15"
          fill={labelColor}
        >
          {xAxisLabel}
        </text>

        <text
          x={22}
          y={margin.top + chartHeight / 2}
          textAnchor="middle"
          fontSize="15"
          fill={labelColor}
          transform={`rotate(-90 22 ${margin.top + chartHeight / 2})`}
        >
          {yAxisLabel}
        </text>
      </svg>
    </div>
  );
};

export default LineGraph;