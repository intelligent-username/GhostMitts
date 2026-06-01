import type { Move, PresetKey } from "../types";

// Constant arrays of moves mapping valid slot numbers
export const FRONT_MOVES = [
  "JAB", "FRONT HOOK", "FRONT UPPERCUT",
  "OVERHAND LEFT",
  "LEAD KNEE",
  "FRONT KICK", "LEAD KICK", "LEAD TEEP", "TEEP", "CHECK KICK",
  "BLOCK", "PARRY LEFT", "LEFT PARRY", "SHOOT A TAKEDOWN", "SLIP LEFT",
  "SWITCH KICK",
  "LEFT ELBOW",
];

export const REAR_MOVES = [
  "CROSS", "REAR HOOK", "REAR UPPERCUT",
  "OVERHAND RIGHT",
  "REAR KNEE",
  "REAR KICK", "BODY KICK", "ROUNDHOUSE KICK",
  "REAR TEEP", "LOW KICK", "HEAD KICK",
  "PARRY RIGHT", "RIGHT PARRY", "SPRAWL", "SLIP RIGHT",
  "SPINNING ELBOW",
  "RIGHT ELBOW",
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
  16: "n16_SIXTEEN.ogg"
};

export const MOVE_AUDIO_MAP: Record<string, string> = {
  "JAB": "n21_JAB.ogg",
  "CROSS": "n22_CROSS.ogg",
  "FRONT HOOK": "n23_FRONT_HOOK.ogg",
  "REAR HOOK": "n24_REAR_HOOK.ogg",
  "FRONT UPPERCUT": "n25_FRONT_UPPERCUT.ogg",
  "REAR UPPERCUT": "n26_REAR_UPPERCUT.ogg",
  "OVERHAND LEFT": "n27_OVERHAND_LEFT.ogg",
  "OVERHAND RIGHT": "n28_OVERHAND_RIGHT.ogg",
  "LEAD KNEE": "n29_LEAD_KNEE.ogg",
  "REAR KNEE": "n30_REAR_KNEE.ogg",
  "LEAD KICK": "n31_LEAD_KICK.ogg",
  "FRONT KICK": "n31_LEAD_KICK.ogg",
  "REAR KICK": "n32_REAR_KICK.ogg",
  "BODY KICK": "n33_BODY_KICK.ogg",
  "ROUNDHOUSE KICK": "n34_ROUNDHOUSE_KICK.ogg",
  "TEEP": "n35_TEEP.ogg",
  "LEAD TEEP": "n35_TEEP.ogg",
  "REAR TEEP": "n35_TEEP.ogg",
  "LOW KICK": "n36_LOW_KICK.ogg",
  "HEAD KICK": "n37_HEAD_KICK.ogg",
  "CHECK KICK": "n38_CHECK_KICK.ogg",
  "BLOCK": "n39_BLOCK.ogg",
  "PARRY LEFT": "n40_PARRY_LEFT.ogg",
  "PARRY RIGHT": "n41_PARRY_RIGHT.ogg",
  "SLIP LEFT": "n42_SLIP_LEFT.ogg",
  "SLIP RIGHT": "n43_SLIP_RIGHT.ogg",
  "SHOOT A TAKEDOWN": "n44_SHOOT_A_TAKEDOWN.ogg",
  "SPRAWL": "n45_SPRAWL.ogg",
  "LEFT PARRY": "n46_LEFT_PARRY.ogg",
  "RIGHT PARRY": "n47_RIGHT_PARRY.ogg",
  "SPINNING ELBOW": "n48_SPINNING_ELBOW.ogg",
  "SWITCH KICK": "n49_SWITCH_KICK.ogg",
  "LEFT ELBOW": "n50_LEFT_ELBOW.ogg",
  "RIGHT ELBOW": "n51_RIGHT_ELBOW.ogg"
};

export const BASE_PUNCHES: Move[] = [
  { key: 1, name: "JAB",            locked: true },
  { key: 2, name: "CROSS",          locked: true },
  { key: 3, name: "FRONT HOOK",     locked: true },
  { key: 4, name: "REAR HOOK",      locked: true },
  { key: 5, name: "FRONT UPPERCUT", locked: true },
  { key: 6, name: "REAR UPPERCUT",  locked: true },
];

export const MAX_SLOTS = 20;

export const DEFAULT_PRESETS: Record<PresetKey, Move[]> = {
  Boxing: [...BASE_PUNCHES],
  Kickboxing: [
    { key: 1, name: "JAB",            locked: true },
    { key: 2, name: "CROSS",          locked: true },
    { key: 3, name: "FRONT HOOK",     locked: true },
    { key: 4, name: "REAR HOOK",      locked: true },
    { key: 5, name: "FRONT UPPERCUT", locked: true },
    { key: 6, name: "REAR UPPERCUT",  locked: true },
    { key: 7,  name: "LEAD TEEP",       locked: false },
    { key: 8,  name: "REAR KICK",       locked: false },
    { key: 9,  name: "CHECK KICK",      locked: false },
    { key: 10, name: "LOW KICK",        locked: false },
  ],
  "Muay Thai": [
    { key: 1, name: "JAB",            locked: true },
    { key: 2, name: "CROSS",          locked: true },
    { key: 3, name: "FRONT HOOK",     locked: true },
    { key: 4, name: "REAR HOOK",      locked: true },
    { key: 5, name: "FRONT UPPERCUT", locked: true },
    { key: 6, name: "REAR UPPERCUT",  locked: true },
    { key: 7,  name: "LEAD TEEP",       locked: false },
    { key: 8,  name: "REAR KICK",       locked: false },
    { key: 9,  name: "CHECK KICK",      locked: false },
    { key: 10, name: "LOW KICK",        locked: false },
    { key: 11, name: "LEAD KNEE",       locked: false },
    { key: 12, name: "REAR KNEE",       locked: false },
    { key: 13, name: "LEFT ELBOW",      locked: false },
    { key: 14, name: "RIGHT ELBOW",     locked: false },
  ],
  MMA: [
    { key: 1,  name: "JAB",              locked: true },
    { key: 2,  name: "CROSS",            locked: true },
    { key: 3,  name: "FRONT HOOK",       locked: true },
    { key: 4,  name: "REAR HOOK",        locked: true },
    { key: 5,  name: "FRONT UPPERCUT",   locked: true },
    { key: 6,  name: "REAR UPPERCUT",    locked: true },
    { key: 7,  name: "LEAD TEEP",        locked: false },
    { key: 8,  name: "REAR KICK",        locked: false },
    { key: 9,  name: "CHECK KICK",       locked: false },
    { key: 10, name: "LOW KICK",         locked: false },
    { key: 11, name: "LEAD KNEE",        locked: false },
    { key: 12, name: "REAR KNEE",        locked: false },
    { key: 13, name: "LEFT ELBOW",       locked: false },
    { key: 14, name: "RIGHT ELBOW",      locked: false },
    { key: 15, name: "SHOOT A TAKEDOWN", locked: false },
    { key: 16, name: "SPRAWL",           locked: false },
    { key: 17, name: "LEFT PARRY",       locked: false },
    { key: 18, name: "RIGHT PARRY",      locked: false },
  ],
};

export const movesForSlot = (key: number) => key % 2 === 1 ? FRONT_MOVES : REAR_MOVES;
