import { useState } from "react";
import LineGraph from "./LineGraph";

const GainLoss: React.FC = () => {
  const [timeData] = useState(["Jan", "Feb", "Mar", "Apr", "May", "Jun"]);
  const [gainLossData, setGainLossData] = useState([
    0.8, 1.1, 0.95, 1.3, 1.25, 1.5,
  ]);

  return (
    <div>
      <div className="mb-8 pt-10 bg-[radial-gradient(circle_at_top,_rgba(135,58,237,0.18),_transparent_28%),linear-gradient(180deg,_#0b0915_0%,_#120d22_50%,_#09070f_100%)]">
        <h1 className="text-3xl font-semibold text-white">
          Gain/Loss Analysis 
        </h1>
        <p className="text-violet-400 text-l mt-1">
          Overview of gain/loss performance over time.
        </p>
      </div>

      <div className="scale-[0.4] origin-top-left p-20">
        <LineGraph
          timeData={timeData}
          gainLossData={gainLossData}
          xAxisLabel="Month"
          yAxisLabel="Gain/Loss Ratio"
          title="Gain/Loss Trend"
        />
      </div>
    </div>
  );
};

export default GainLoss;
