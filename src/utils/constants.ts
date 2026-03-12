import type { Move, PresetKey } from "../types";

// Constant arrays of moves mapping valid slot numbers
export const FRONT_MOVES = [
  "JAB", "FRONT HOOK", "FRONT UPPERCUT",
  "OVERHAND LEFT",
  "LEAD KNEE",
  "FRONT KICK", "LEAD KICK", "LEAD TEEP", "TEEP", "CHECK KICK",
  "BLOCK", "PARRY LEFT", "SLIP LEFT",
];

export const REAR_MOVES = [
  "CROSS", "REAR HOOK", "REAR UPPERCUT",
  "OVERHAND RIGHT",
  "REAR KNEE",
  "REAR KICK", "BODY KICK", "ROUNDHOUSE KICK",
  "REAR TEEP", "LOW KICK", "HEAD KICK",
  "PARRY RIGHT", "SLIP RIGHT",
];

export const NUMBER_WORDS: Record<number, string> = {
  1: "ONE", 2: "TWO", 3: "THREE", 4: "FOUR", 5: "FIVE",
  6: "SIX", 7: "SEVEN", 8: "EIGHT", 9: "NINE", 10: "TEN",
  11: "ELEVEN", 12: "TWELVE", 13: "THIRTEEN", 14: "FOURTEEN",
  15: "FIFTEEN", 16: "SIXTEEN", 17: "SEVENTEEN", 18: "EIGHTEEN",
  19: "NINETEEN", 20: "TWENTY"
};

export const BASE_PUNCHES: Move[] = [
  { key: 1, name: "JAB",            locked: true },
  { key: 2, name: "CROSS",          locked: true },
  { key: 3, name: "FRONT HOOK",     locked: true },
  { key: 4, name: "REAR HOOK",      locked: true },
  { key: 5, name: "FRONT UPPERCUT", locked: true },
  { key: 6, name: "REAR UPPERCUT",  locked: true },
];

export const MAX_SLOTS = 16;

export const DEFAULT_PRESETS: Record<PresetKey, Move[]> = {
  Boxing: [...BASE_PUNCHES],
  Kickboxing: [
    ...BASE_PUNCHES,
    { key: 7, name: "FRONT KICK", locked: false },
    { key: 8, name: "REAR KICK",  locked: false },
  ],
  "Muay Thai": [
    ...BASE_PUNCHES,
    { key: 7,  name: "LEAD TEEP",       locked: false },
    { key: 8,  name: "REAR TEEP",       locked: false },
    { key: 9,  name: "ROUNDHOUSE KICK", locked: false },
    { key: 10, name: "LOW KICK",        locked: false },
  ],
};

export const movesForSlot = (key: number) => key % 2 === 1 ? FRONT_MOVES : REAR_MOVES;
