import { useMemo, useState, useRef } from "react";
import type { GenerationSettings } from "../types";
import { buildSmoothPath, type KeyDistribution } from "../utils/generationMath";

interface KeyProbabilityChartProps {
  keyDistribution: KeyDistribution;
  safeValue: GenerationSettings;
  updateSettings: (partial: Partial<GenerationSettings>) => void;
}

export function KeyProbabilityChart({
  keyDistribution,
  safeValue,
  updateSettings,
}: KeyProbabilityChartProps) {
  const [draggingKey, setDraggingKey] = useState<number | null>(null);
  const lastYRef = useRef<number | null>(null);

  const keyChart = useMemo(() => {
    const width = 520;
    const height = 190;
    const leftPad = 36;
    const rightPad = 14;
    const topPad = 12;
    const bottomPad = 28;
    const plotWidth = width - leftPad - rightPad;
    const plotHeight = height - topPad - bottomPad;
    const maxProb = Math.max(...keyDistribution.probs.map(p => p.prob), 0.0001);

    const curvePoints = keyDistribution.probs.map((item, index, arr) => {
      const count = arr.length;
      const cell = plotWidth / count;
      const x = leftPad + index * cell + cell / 2;
      const y = topPad + (plotHeight - (item.prob / maxProb) * plotHeight);
      return { ...item, x, y };
    });

    const points = curvePoints.map(point => ({ x: point.x, y: point.y }));
    const smoothPath = buildSmoothPath(points);
    const fillPath = points.length > 1
      ? `${smoothPath} L ${points[points.length - 1]!.x} ${topPad + plotHeight} L ${points[0]!.x} ${topPad + plotHeight} Z`
      : "";

    return { width, height, leftPad, topPad, plotHeight, curvePoints, smoothPath, fillPath };
  }, [keyDistribution.probs]);

  const handlePointerDown = (key: number, e: React.PointerEvent<SVGElement>) => {
    setDraggingKey(key);
    lastYRef.current = e.clientY;
    const svg = e.currentTarget.ownerSVGElement || e.currentTarget;
    try {
      svg.setPointerCapture(e.pointerId);
    } catch {}
    e.stopPropagation();
    e.preventDefault();
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (draggingKey !== null && lastYRef.current !== null) {
      const delta = -(e.clientY - lastYRef.current);
      lastYRef.current = e.clientY;
      if (delta === 0) return;

      const currentWeight = (safeValue.weights && typeof safeValue.weights[draggingKey] === "number")
        ? safeValue.weights[draggingKey]!
        : Math.pow(safeValue.bias, draggingKey - 1);

      const newWeight = currentWeight * Math.pow(1.01, delta);
      const nextWeights = { ...(safeValue.weights || {}) };
      nextWeights[draggingKey] = Math.round(Math.max(0.01, Math.min(100.0, newWeight)) * 100) / 100;
      updateSettings({ weights: nextWeights });
    }
  };

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (draggingKey !== null) {
      setDraggingKey(null);
      lastYRef.current = null;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  return (
    <div className="chart-card">
      <div className="chart-card-header">
        <h4>Move Distribution</h4>
        <span className="chart-meta">
          mean: {keyDistribution.mean.toFixed(2)} | var: {keyDistribution.variance.toFixed(2)} | odd: {Math.round(keyDistribution.oddMass * 100)}% / even: {Math.round(keyDistribution.evenMass * 100)}%
        </span>
      </div>

      <svg
        className="distribution-svg"
        viewBox={`0 0 ${keyChart.width} ${keyChart.height}`}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <line
          x1={keyChart.leftPad}
          y1={keyChart.topPad + keyChart.plotHeight}
          x2={keyChart.width - 14}
          y2={keyChart.topPad + keyChart.plotHeight}
          className="chart-axis-line"
        />
        <line
          x1={keyChart.leftPad}
          y1={keyChart.topPad}
          x2={keyChart.leftPad}
          y2={keyChart.topPad + keyChart.plotHeight}
          className="chart-axis-line"
        />

        {keyChart.fillPath && <path d={keyChart.fillPath} className="curve-fill" />}
        {keyChart.smoothPath && <path d={keyChart.smoothPath} className="curve-stroke" />}

        {keyChart.curvePoints.map(point => (
          <g key={point.key} className="point-group">
            <circle
              cx={point.x}
              cy={point.y}
              r={draggingKey === point.key ? 7 : 5}
              className={`curve-point ${draggingKey === point.key ? "active" : ""}`}
              onPointerDown={e => handlePointerDown(point.key, e)}
            />
            <text x={point.x} y={keyChart.topPad + keyChart.plotHeight + 16} className="axis-label">
              {point.key}
            </text>
            <text x={point.x} y={Math.max(12, point.y - 8)} className="prob-label">
              {(point.prob * 100).toFixed(1)}%
            </text>
          </g>
        ))}
      </svg>
      <div className="chart-hint">Drag points up/down to adjust individual move probabilities</div>
    </div>
  );
}
