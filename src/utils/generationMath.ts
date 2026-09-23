import type { GenerationSettings } from "../types";

export interface KeyDistribution {
  probs: Array<{ key: number; prob: number }>;
  mean: number;
  variance: number;
  oddMass: number;
  evenMass: number;
}

export interface LengthDistribution {
  values: number[];
  mean: number;
  variance: number;
  probs: number[];
}

export function clampSettings(settings: GenerationSettings): GenerationSettings {
  const min = Math.max(1, Math.min(Math.floor(settings.min), 20));
  const max = Math.max(min, Math.min(Math.floor(settings.max), 20));
  const bias = Math.max(0.3, Math.min(0.95, settings.bias));
  const lengthVariance = Math.max(0.1, Math.min(3.0, settings.lengthVariance));
  return { min, max, bias, lengthVariance, weights: settings.weights };
}

export function buildSmoothPath(points: Array<{ x: number; y: number }>): string {
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

export function computeKeyDistribution(
  currentMovesCount: number,
  bias: number,
  weights?: Record<number, number>
): KeyDistribution {
  if (currentMovesCount === 0) {
    return { probs: [], mean: 0, variance: 0, oddMass: 0, evenMass: 1 };
  }

  const samples: number[] = [];
  const numIterations = 500;

  for (let iter = 0; iter < numIterations; iter++) {
    const maxSteps = Math.floor(Math.random() * 5) + 2;
    let last: number | null = null;

    for (let step = 0; step < maxSteps; step++) {
      let candidates: number[] = [];

      if (last === null) {
        for (let k = 1; k <= currentMovesCount; k += 2) candidates.push(k);
        if (candidates.length === 0) {
          for (let k = 1; k <= currentMovesCount; k++) candidates.push(k);
        }
      } else {
        if (last % 2 === 1) {
          for (let k = 2; k <= currentMovesCount; k += 2) candidates.push(k);
        } else {
          for (let k = 1; k <= currentMovesCount; k += 2) candidates.push(k);
        }
        if (candidates.length === 0) {
          candidates = Array.from({ length: currentMovesCount }, (_, i) => i + 1);
        }
      }

      let totalW = 0;
      const weightedList: { k: number; w: number }[] = [];
      for (const k of candidates) {
        let w = Math.pow(bias, k - 1);
        if (weights && typeof weights[k] === "number") {
          w *= weights[k]!;
        }
        if (k % 2 === 0) w *= 1.25;
        weightedList.push({ k, w });
        totalW += w;
      }

      const r = Math.random() * totalW;
      let acc = 0;
      let picked = candidates[0] ?? 1;
      for (const { k, w } of weightedList) {
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
}

export function computeLengthDistribution(
  min: number,
  max: number,
  lengthVariance: number
): LengthDistribution {
  const n = max - min + 1;
  const midpoint = (min + max) / 2;
  const sigma = Math.max(0.5, ((max - min) / 4) * lengthVariance);

  const values = Array.from({ length: n }, (_, i) => min + i);
  const weights = values.map(v => {
    const z = (v - midpoint) / sigma;
    return Math.exp(-0.5 * z * z);
  });
  const totalW = weights.reduce((sum, w) => sum + w, 0) || 1;
  const probs = weights.map(w => w / totalW);

  const mean = values.reduce((sum, v, i) => sum + (v ?? 0) * (probs[i] ?? 0), 0);
  const variance = values.reduce((sum, v, i) => sum + Math.pow((v ?? 0) - mean, 2) * (probs[i] ?? 0), 0);

  return { values, mean, variance, probs };
}
