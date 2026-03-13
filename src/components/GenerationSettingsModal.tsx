import { useMemo, useState } from "react";
import type { GenerationSettings } from "../types";

interface GenerationSettingsModalProps {
  currentMovesCount: number;
  value: GenerationSettings;
  onChange: (next: GenerationSettings) => void;
}

function clampSettings(settings: GenerationSettings): GenerationSettings {
  const min = Math.max(1, Math.min(Math.floor(settings.min), 20));
  const max = Math.max(min, Math.min(Math.floor(settings.max), 20));
  const bias = Math.max(0.3, Math.min(0.95, settings.bias));
  const lengthVariance = Math.max(0.1, Math.min(3.0, settings.lengthVariance));
  return { min, max, bias, lengthVariance };
}

function buildSmoothPath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0]!.x} ${points[0]!.y}`;

  let path = `M ${points[0]!.x} ${points[0]!.y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]!;
    const curr = points[i]!;
    const midX = (prev.x + curr.x) / 2;
    path += ` Q ${prev.x} ${prev.y}, ${midX} ${(prev.y + curr.y) / 2}`;
    path += ` T ${curr.x} ${curr.y}`;
  }
  return path;
}

export function GenerationSettingsModal({ currentMovesCount, value, onChange }: GenerationSettingsModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  const safeValue = useMemo(
    () => clampSettings(value),
    [value]
  );

  const updateSettings = (partial: Partial<GenerationSettings>) => {
    const next = clampSettings({ ...safeValue, ...partial });
    onChange(next);
  };

  const keyDistribution = useMemo(() => {
    if (currentMovesCount === 0) {
      return { probs: [], mean: 0, variance: 0, oddMass: 0, evenMass: 1 };
    }
    
    // Simulate many combos to get realistic distribution accounting for:
    // - parity constraints (odd/even alternation for punches, same for kicks)
    // - rear kick boost
    // - jab dampening
    // - first move is always odd punch
    const samples: number[] = [];
    const numIterations = 500;

    for (let iter = 0; iter < numIterations; iter++) {
      const maxSteps = Math.floor(Math.random() * 5) + 2; // sim 2-6 steps
      let last: number | null = null;

      for (let step = 0; step < maxSteps; step++) {
        let candidates: number[] = [];

        if (last === null) {
          // First move: prefer odd
          for (let k = 1; k <= currentMovesCount; k += 2) candidates.push(k);
          if (candidates.length === 0) {
            for (let k = 1; k <= currentMovesCount; k++) candidates.push(k);
          }
        } else {
          // Alternate parity
          if (last % 2 === 1) {
            for (let k = 2; k <= currentMovesCount; k += 2) candidates.push(k);
          } else {
            for (let k = 1; k <= currentMovesCount; k += 2) candidates.push(k);
          }
          if (candidates.length === 0) candidates = Array.from({ length: currentMovesCount }, (_, i) => i + 1);
        }

        // Weight candidates
        let totalW = 0;
        const weights: { k: number; w: number }[] = [];
        for (const k of candidates) {
          let w = Math.pow(safeValue.bias, k - 1);
          // Rear kick boost (approximate)
          if (k % 2 === 0) w *= 1.25;
          weights.push({ k, w });
          totalW += w;
        }

        // Sample
        const r = Math.random() * totalW;
        let acc = 0;
        let picked = candidates[0] ?? 1;
        for (const { k, w } of weights) {
          acc += w;
          if (r <= acc) {
            picked = k;
            break;
          }
        }
        samples.push(picked);
        last = picked;
      }
    }

    // Compute histogram
    const counts = new Map<number, number>();
    for (const k of samples) counts.set(k, (counts.get(k) ?? 0) + 1);
    const totalSamples = samples.length || 1;
    const probs = Array.from({ length: currentMovesCount }, (_, i) => ({
      key: i + 1,
      prob: (counts.get(i + 1) ?? 0) / totalSamples,
    }));

    const mean = probs.reduce((sum, item) => sum + item.key * item.prob, 0);
    const variance = probs.reduce((sum, item) => sum + Math.pow(item.key - mean, 2) * item.prob, 0);
    const oddMass = probs.filter(item => item.key % 2 === 1).reduce((sum, item) => sum + item.prob, 0);

    return { probs, mean, variance, oddMass, evenMass: 1 - oddMass };
  }, [currentMovesCount, safeValue.bias]);

  const lengthDistribution = useMemo(() => {
    // Gaussian distribution centered at midpoint with variance control
    const min = safeValue.min;
    const max = safeValue.max;
    const n = max - min + 1;
    const midpoint = (min + max) / 2;
    // lengthVariance: 0.1 = very tight (always near midpoint), 1.0 = normal spread, 2.0+ = very wide
    const sigma = Math.max(0.5, (max - min) / 4 * safeValue.lengthVariance);

    const values = Array.from({ length: n }, (_, i) => min + i);
    const weights = values.map(v => {
      const z = (v - midpoint) / sigma;
      return Math.exp(-0.5 * z * z);
    });
    const totalW = weights.reduce((sum, w) => sum + w, 0) || 1;
    const probs = weights.map(w => w / totalW);

    const mean = values.reduce((sum, v, i) => sum + (v ?? 0) * (probs[i] ?? 0), 0);
    const variance = values.reduce((sum, v, i) => sum + Math.pow((v ?? 0) - mean, 2) * (probs[i] ?? 0), 0);

    return { values, probability: 0, mean, variance, probs };
  }, [safeValue.min, safeValue.max, safeValue.lengthVariance]);

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

    return { width, height, topPad, plotHeight, points, smoothPath, fillPath };
  }, [lengthDistribution]);

  return (
    <>
      <button
        className="generation-settings-toggle"
        onClick={() => setIsOpen(true)}
        type="button"
      >
        Customize Generation
      </button>

      {isOpen && (
        <div className="generation-modal-backdrop" onClick={() => setIsOpen(false)}>
          <div className="generation-modal" onClick={(e) => e.stopPropagation()}>
            <div className="generation-modal-header">
              <h3 className="generation-modal-title">Generation Settings</h3>
              <button
                className="generation-modal-close"
                onClick={() => setIsOpen(false)}
                type="button"
                aria-label="Close generation settings"
              >
                ×
              </button>
            </div>

            <div className="generation-modal-body">
              <div className="generation-control-grid">
                <div className="generation-control-card">
                  <div className="generation-control-top">
                    <label className="generation-control-label" htmlFor="gen-min-length">Min Combo Length</label>
                    <span className="generation-control-value">{safeValue.min}</span>
                  </div>
                  <input
                    id="gen-min-length"
                    type="range"
                    min={1}
                    max={20}
                    step={1}
                    value={safeValue.min}
                    onChange={(e) => updateSettings({ min: Number(e.target.value) })}
                    className="generation-control-slider"
                  />
                </div>

                <div className="generation-control-card">
                  <div className="generation-control-top">
                    <label className="generation-control-label" htmlFor="gen-max-length">Max Combo Length</label>
                    <span className="generation-control-value">{safeValue.max}</span>
                  </div>
                  <input
                    id="gen-max-length"
                    type="range"
                    min={1}
                    max={20}
                    step={1}
                    value={safeValue.max}
                    onChange={(e) => updateSettings({ max: Number(e.target.value) })}
                    className="generation-control-slider"
                  />
                </div>

                <div className="generation-control-card generation-control-card--wide">
                  <div className="generation-control-top">
                    <label className="generation-control-label" htmlFor="gen-bias">Bias Toward Lower Keys</label>
                    <span className="generation-control-value">{safeValue.bias.toFixed(2)}</span>
                  </div>
                  <input
                    id="gen-bias"
                    type="range"
                    min="0.30"
                    max="0.95"
                    step="0.01"
                    value={safeValue.bias}
                    onChange={(e) => updateSettings({ bias: Number(e.target.value) })}
                    className="generation-control-slider"
                  />
                </div>

                <div className="generation-control-card generation-control-card--wide">
                  <div className="generation-control-top">
                    <label className="generation-control-label" htmlFor="gen-length-variance">Length Distribution Spread</label>
                    <span className="generation-control-value">{safeValue.lengthVariance.toFixed(2)}</span>
                  </div>
                  <input
                    id="gen-length-variance"
                    type="range"
                    min="0.1"
                    max="3.0"
                    step="0.1"
                    value={safeValue.lengthVariance}
                    onChange={(e) => updateSettings({ lengthVariance: Number(e.target.value) })}
                    className="generation-control-slider"
                  />
                </div>
              </div>

              <div className="generation-visual-grid">
                <div className="generation-viz-card">
                  <div className="generation-viz-header">
                    <h4>Key Frequency Shape</h4>
                    <p>Smooth trend over discrete key probabilities.</p>
                  </div>
                  <svg viewBox={`0 0 ${keyChart.width} ${keyChart.height}`} className="generation-viz-chart" role="img" aria-label="Key frequency visualization">
                    {keyChart.fillPath && <path d={keyChart.fillPath} className="generation-viz-fill" />}
                    <path d={keyChart.smoothPath} className="generation-viz-line" />
                    {keyChart.curvePoints.map(point => (
                      <text
                        key={`lbl-${point.key}`}
                        x={point.x}
                        y={keyChart.topPad + keyChart.plotHeight + 18}
                        className="generation-viz-axis"
                        textAnchor="middle"
                      >
                        {point.key}
                      </text>
                    ))}
                  </svg>
                  <div className="generation-stats-row">
                    <span>Mean key: {keyDistribution.mean.toFixed(2)}</span>
                    <span>Variance: {keyDistribution.variance.toFixed(2)}</span>
                    <span>Odd/Even: {(keyDistribution.oddMass * 100).toFixed(0)}% / {(keyDistribution.evenMass * 100).toFixed(0)}%</span>
                  </div>
                </div>

                <div className="generation-viz-card">
                  <div className="generation-viz-header">
                    <h4>Length Distribution</h4>
                    <p>Uniform draw across selected combo lengths.</p>
                  </div>
                  <svg viewBox={`0 0 ${lengthCurve.width} ${lengthCurve.height}`} className="generation-viz-chart" role="img" aria-label="Length distribution visualization">
                    {lengthCurve.fillPath && <path d={lengthCurve.fillPath} className="generation-viz-fill" />}
                    <path d={lengthCurve.smoothPath} className="generation-viz-line" />
                    {lengthCurve.points.map(point => (
                      <text
                        key={`len-${point.value}`}
                        x={point.x}
                        y={lengthCurve.topPad + lengthCurve.plotHeight + 18}
                        className="generation-viz-axis"
                        textAnchor="middle"
                      >
                        {point.value}
                      </text>
                    ))}
                  </svg>
                  <div className="generation-stats-row">
                    <span>Range: {safeValue.min}–{safeValue.max}</span>
                    <span>Mean: {lengthDistribution.mean.toFixed(2)}</span>
                    <span>Variance: {lengthDistribution.variance.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="generation-viz-footnote">
                Fixed rules currently active: first move starts odd lead punch, punch parity alternation, kick parity reversal, and jab repeat dampening.
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
