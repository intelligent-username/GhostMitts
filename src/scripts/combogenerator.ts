/**
 * combogenerator.ts
 *
 * Generates random combo sequences for GhostMitts.
 *
 * Parity rules
 * ────────────
 *  • Punches alternate parity: odd → even → odd (front then rear).
 *  • Kicks REVERSE the rule: odd key kick → next must be odd,
 *    even key kick → next must be even (same-side follow-up).
 *  • Exception: key 1 (Jab) may appear back-to-back.
 *
 * Bias
 * ────
 *  • Lower key numbers are strongly favoured via exponential decay:
 *      weight(k) = bias ^ (k - 1)
 */

// Names that count as "kicks" — reversed parity
const KICK_NAMES = new Set([
  "LEAD KNEE", "REAR KNEE",
  "LEAD KICK", "REAR KICK", "BODY KICK", "ROUNDHOUSE KICK",
  "TEEP", "LOW KICK", "HEAD KICK",
  "FRONT KICK", "LEAD TEEP", "REAR TEEP", "CHECK KICK",
]);

export type Move = { key: number; name: string; locked: boolean };

export interface ComboOptions {
  moves: Move[];
  length?: { min: number; max: number };
  bias?: number;
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function weightedPick(items: ReadonlyArray<{ value: number; weight: number }>): number {
  let total = 0;
  for (const item of items) total += item.weight;

  let r = Math.random() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item.value;
  }
  return items.length > 0 ? items[items.length - 1]!.value : 1;
}

function isKick(moves: Move[], key: number): boolean {
  const move = moves.find(m => m.key === key);
  return move ? KICK_NAMES.has(move.name.toUpperCase()) : false;
}

export function generateCombo(opts: ComboOptions): number[] {
  const {
    moves,
    length = { min: 2, max: 5 },
    bias = 0.65,
  } = opts;

  const allKeys = moves.map(m => m.key);
  if (allKeys.length === 0) return [];

  const targetLen = randInt(length.min, Math.min(length.max, allKeys.length));
  const weightOf = (k: number) => Math.pow(bias, k - 1);

  const combo: number[] = [];

  for (let step = 0; step < targetLen; step++) {
    const last = combo.length > 0 ? combo[combo.length - 1]! : null;

    let candidates: number[];

    if (last === null) {
      candidates = allKeys;
    } else {
      const lastIsOdd = last % 2 === 1;
      const lastIsKick = isKick(moves, last);

      if (last === 1) {
        // Jab exception: can double-jab OR go rear (even)
        candidates = allKeys.filter(k => k === 1 || k % 2 === 0);
      } else if (lastIsKick) {
        // KICK: reversed parity — same parity follows
        if (lastIsOdd) {
          candidates = allKeys.filter(k => k % 2 === 1);
        } else {
          candidates = allKeys.filter(k => k % 2 === 0);
        }
      } else {
        // PUNCH: normal alternation
        if (lastIsOdd) {
          candidates = allKeys.filter(k => k % 2 === 0);
        } else {
          candidates = allKeys.filter(k => k % 2 === 1);
        }
      }
    }

    if (candidates.length === 0) break;

    const weighted = candidates.map(k => ({ value: k, weight: weightOf(k) }));
    combo.push(weightedPick(weighted));
  }

  return combo;
}

export function generateCombos(
  count: number,
  opts: ComboOptions,
  maxTries = count * 20,
): number[][] {
  const seen = new Set<string>();
  const results: number[][] = [];
  let attempts = 0;

  while (results.length < count && attempts < maxTries) {
    attempts++;
    const combo = generateCombo(opts);
    const sig = combo.join("-");
    if (!seen.has(sig)) {
      seen.add(sig);
      results.push(combo);
    }
  }

  return results;
}
