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

export const NUMBER_AUDIO_MAP: Record<number, string> = {
  1: "n01_ONE.ogg", 2: "n02_TWO.ogg", 3: "n03_THREE.ogg", 4: "n04_FOUR.ogg",
  5: "n05_FIVE.ogg", 6: "n06_SIX.ogg", 7: "n07_SEVEN.ogg", 8: "n08_EIGHT.ogg",
  9: "n09_NINE.ogg", 10: "n10_TEN.ogg", 11: "n11_ELEVEN.ogg", 12: "n12_TWELVE.ogg",
  13: "n13_THIRTEEN.ogg", 14: "n14_FOURTEEN.ogg", 15: "n15_FIFTEEN.ogg",
  16: "n16_SIXTEEN.ogg", 17: "n17_SEVENTEEN.ogg", 18: "n18_EIGHTEEN.ogg",
  19: "n19_NINETEEN.ogg", 20: "n20_TWENTY.ogg"
};

export const MOVE_AUDIO_MAP: Record<string, string> = {
  "JAB": "n17_JAB.ogg",
  "CROSS": "n18_CROSS.ogg",
  "FRONT HOOK": "n19_FRONT_HOOK.ogg",
  "REAR HOOK": "n20_REAR_HOOK.ogg",
  "FRONT UPPERCUT": "n21_FRONT_UPPERCUT.ogg",
  "REAR UPPERCUT": "n22_REAR_UPPERCUT.ogg",
  "OVERHAND LEFT": "n23_OVERHAND_LEFT.ogg",
  "OVERHAND RIGHT": "n24_OVERHAND_RIGHT.ogg",
  "LEAD KNEE": "n25_LEAD_KNEE.ogg",
  "REAR KNEE": "n26_REAR_KNEE.ogg",
  "LEAD KICK": "n27_LEAD_KICK.ogg",
  "REAR KICK": "n28_REAR_KICK.ogg",
  "BODY KICK": "n29_BODY_KICK.ogg",
  "ROUNDHOUSE KICK": "n30_ROUNDHOUSE_KICK.ogg",
  "TEEP": "n31_TEEP.ogg",
  "LOW KICK": "n32_LOW_KICK.ogg",
  "HEAD KICK": "n33_HEAD_KICK.ogg",
  "CHECK KICK": "n34_CHECK_KICK.ogg",
  "BLOCK": "n35_BLOCK.ogg",
  "PARRY LEFT": "n36_PARRY_LEFT.ogg",
  "PARRY RIGHT": "n37_PARRY_RIGHT.ogg",
  "SLIP LEFT": "n38_SLIP_LEFT.ogg",
  "SLIP RIGHT": "n39_SLIP_RIGHT.ogg"
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
