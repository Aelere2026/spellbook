import React from "react";

type LineGraphProps = {
  timeData: string[];
  gainLossData: number[];
  width?: number;
  height?: number;
  xAxisLabel?: string;
  yAxisLabel?: string;
  title?: string;
};

const LineGraph: React.FC<LineGraphProps> = ({
  timeData,
  gainLossData,
  width = 800,
  height = 400,
  xAxisLabel = "Time",
  yAxisLabel = "Gain/Loss Ratio",
  title = "Gain/Loss Over Time",
}) => {
  if (timeData.length !== gainLossData.length || timeData.length === 0) {
    return (
      <div className="rounded-2xl border border-red-400/20 bg-red-950/20 p-4 text-red-200">
        Differing lengths for data
      </div>
    );
  }

  const margin = { top: 40, right: 30, bottom: 70, left: 80 };
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

  return (
    <div className="rounded-3xl border border-violet-400/15 bg-[#0a0715] p-6 shadow-[0_18px_60px_rgba(10,6,30,0.35)] backdrop-blur-xl">
      <h2 className="mb-1 text-3xl font-semibold text-white">{title}</h2>
      <p className="mb-4 text-sm text-violet-200/60">
      </p>

      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full">
        <defs>
          <linearGradient id="lineGlow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c4b5fd" stopOpacity="1" />
            <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.55" />
          </linearGradient>
          <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.28" />
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
                stroke="rgba(196,181,253,0.12)"
                strokeWidth="1"
              />
              <text
                x={margin.left - 12}
                y={y + 4}
                textAnchor="end"
                fontSize="11"
                fill="rgba(221,214,254,0.75)"
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
          stroke="rgba(196,181,253,0.28)"
          strokeWidth="1.5"
        />
        <line
          x1={margin.left}
          y1={margin.top + chartHeight}
          x2={margin.left + chartWidth}
          y2={margin.top + chartHeight}
          stroke="rgba(196,181,253,0.28)"
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
            fill="#ddd6fe"
            stroke="#6d28d9"
            strokeWidth="2"
          />
        ))}

        {timeData.map((label, index) => (
          <text
            key={`x-label-${index}`}
            x={getX(index)}
            y={margin.top + chartHeight + 22}
            textAnchor="middle"
            fontSize="11"
            fill="rgba(221,214,254,0.75)"
          >
            {label}
          </text>
        ))}

        <text
          x={margin.left + chartWidth / 2}
          y={height - 18}
          textAnchor="middle"
          fontSize="15"
          fill="rgba(237,233,254,0.9)"
        >
          {xAxisLabel}
        </text>

        <text
          x={22}
          y={margin.top + chartHeight / 2}
          textAnchor="middle"
          fontSize="15"
          fill="rgba(237,233,254,0.9)"
          transform={`rotate(-90 22 ${margin.top + chartHeight / 2})`}
        >
          {yAxisLabel}
        </text>
      </svg>
    </div>
  );
};

export default LineGraph;