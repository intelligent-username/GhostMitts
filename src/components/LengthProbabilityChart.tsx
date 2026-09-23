import { useMemo } from "react";
import type { GenerationSettings } from "../types";
import { buildSmoothPath, type LengthDistribution } from "../utils/generationMath";

interface LengthProbabilityChartProps {
  lengthDistribution: LengthDistribution;
  safeValue: GenerationSettings;
  updateSettings: (partial: Partial<GenerationSettings>) => void;
}

export function LengthProbabilityChart({
  lengthDistribution,
  safeValue,
  updateSettings,
}: LengthProbabilityChartProps) {
  const lengthCurve = useMemo(() => {
    const width = 520;
    const height = 190;
    const leftPad = 36;
    const rightPad = 14;
    const topPad = 12;
    const bottomPad = 28;
    const plotWidth = width - leftPad - rightPad;
    const plotHeight = height - topPad - bottomPad;

    const probs = lengthDistribution.probs.map((p, idx) => ({
      value: lengthDistribution.values[idx],
      prob: p,
    }));
    const maxProb = Math.max(...probs.map(p => p.prob), 0.0001);

    const points = probs.map((item, index, arr) => {
      const count = arr.length;
      const cell = plotWidth / count;
      const x = leftPad + index * cell + cell / 2;
      const y = topPad + (plotHeight - (item.prob / maxProb) * plotHeight);
      return { ...item, x, y };
    });

    const smoothPath = buildSmoothPath(points.map(p => ({ x: p.x, y: p.y })));
    const fillPath = points.length > 1
      ? `${smoothPath} L ${points[points.length - 1]!.x} ${topPad + plotHeight} L ${points[0]!.x} ${topPad + plotHeight} Z`
      : "";

    return { width, height, leftPad, topPad, plotHeight, points, smoothPath, fillPath };
  }, [lengthDistribution]);

  return (
    <div className="chart-card">
      <div className="chart-card-header">
        <h4>Combo Length Distribution</h4>
        <span className="chart-meta">
          mean: {lengthDistribution.mean.toFixed(2)} | var: {lengthDistribution.variance.toFixed(2)}
        </span>
      </div>

      <svg className="distribution-svg" viewBox={`0 0 ${lengthCurve.width} ${lengthCurve.height}`}>
        <line
          x1={lengthCurve.leftPad}
          y1={lengthCurve.topPad + lengthCurve.plotHeight}
          x2={lengthCurve.width - 14}
          y2={lengthCurve.topPad + lengthCurve.plotHeight}
          className="chart-axis-line"
        />
        <line
          x1={lengthCurve.leftPad}
          y1={lengthCurve.topPad}
          x2={lengthCurve.leftPad}
          y2={lengthCurve.topPad + lengthCurve.plotHeight}
          className="chart-axis-line"
        />

        {lengthCurve.fillPath && <path d={lengthCurve.fillPath} className="curve-fill curve-fill-alt" />}
        {lengthCurve.smoothPath && <path d={lengthCurve.smoothPath} className="curve-stroke curve-stroke-alt" />}

        {lengthCurve.points.map(point => (
          <g key={point.value} className="point-group">
            <circle cx={point.x} cy={point.y} r={5} className="curve-point" />
            <text x={point.x} y={lengthCurve.topPad + lengthCurve.plotHeight + 16} className="axis-label">
              {point.value}
            </text>
            <text x={point.x} y={Math.max(12, point.y - 8)} className="prob-label">
              {(point.prob * 100).toFixed(1)}%
            </text>
          </g>
        ))}
      </svg>

      <div className="length-variance-control">
        <label>
          <span>Length Variance: <strong>{safeValue.lengthVariance.toFixed(2)}</strong></span>
          <span className="slider-hint">
            {safeValue.lengthVariance < 0.5 ? "Very tight (midpoint)" : safeValue.lengthVariance > 1.5 ? "Wide spread" : "Balanced"}
          </span>
        </label>
        <input
          type="range"
          min="0.1"
          max="3.0"
          step="0.05"
          value={safeValue.lengthVariance}
          onChange={e => updateSettings({ lengthVariance: parseFloat(e.target.value) })}
          className="customize-range"
        />
      </div>
    </div>
  );
}
