export type Move = { key: number; name: string; locked: boolean };
export type PresetKey = "Boxing" | "Kickboxing" | "Muay Thai" | "MMA";
export type GenerationSettings = { min: number; max: number; bias: number; lengthVariance: number; weights?: Record<number, number> };
export type DisplayMode = "numbers" | "fullname" | "custom";
