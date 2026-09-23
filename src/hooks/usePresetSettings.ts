import { useState, useCallback, useRef, useEffect } from "react";
import type { Move, PresetKey, GenerationSettings, DisplayMode } from "../types";
import { DEFAULT_PRESETS } from "../utils/constants";

export const DEFAULT_GENERATION_SETTINGS: GenerationSettings = {
  min: 1,
  max: 20,
  bias: 0.8,
  lengthVariance: 1,
};

export function isDefaultGenerationSettings(s: GenerationSettings): boolean {
  return (
    s.min === DEFAULT_GENERATION_SETTINGS.min &&
    s.max === DEFAULT_GENERATION_SETTINGS.max &&
    s.bias === DEFAULT_GENERATION_SETTINGS.bias &&
    s.lengthVariance === DEFAULT_GENERATION_SETTINGS.lengthVariance
  );
}

export function areMovesEqual(a: Move[], b: Move[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const ma = a[i]!;
    const mb = b[i]!;
    if (ma.key !== mb.key || ma.name !== mb.name || ma.locked !== mb.locked) return false;
  }
  return true;
}

export function usePresetSettings() {
  const [selectedPreset, setSelectedPreset] = useState<PresetKey>("Boxing");
  const [customMoves, setCustomMoves] = useState<Record<PresetKey, Move[]>>({
    Boxing: [...DEFAULT_PRESETS.Boxing],
    Kickboxing: [...DEFAULT_PRESETS.Kickboxing],
    "Muay Thai": [...DEFAULT_PRESETS["Muay Thai"]],
    MMA: [...DEFAULT_PRESETS.MMA],
    Wrestling: [...DEFAULT_PRESETS.Wrestling],
  });

  const [generationSettingsMap, setGenerationSettingsMap] = useState<Record<PresetKey, GenerationSettings>>({
    Boxing: { ...DEFAULT_GENERATION_SETTINGS },
    Kickboxing: { ...DEFAULT_GENERATION_SETTINGS },
    "Muay Thai": { ...DEFAULT_GENERATION_SETTINGS },
    MMA: { ...DEFAULT_GENERATION_SETTINGS },
    Wrestling: { ...DEFAULT_GENERATION_SETTINGS },
  });

  const [displayModeMap, setDisplayModeMap] = useState<Record<PresetKey, DisplayMode>>({
    Boxing: "numbers",
    Kickboxing: "numbers",
    "Muay Thai": "numbers",
    MMA: "numbers",
    Wrestling: "fullname",
  });

  const [customDisplayKeys, setCustomDisplayKeys] = useState<Set<number>>(new Set());
  const [useVoice, setUseVoice] = useState<boolean>(true);

  const generationSettings = generationSettingsMap[selectedPreset] ?? DEFAULT_GENERATION_SETTINGS;
  const displayMode = displayModeMap[selectedPreset] ?? "numbers";

  const setDisplayMode = useCallback(
    (mode: DisplayMode) => {
      setDisplayModeMap(prev => ({ ...prev, [selectedPreset]: mode }));
    },
    [selectedPreset]
  );

  const setGenerationSettings = useCallback(
    (next: GenerationSettings) => {
      setGenerationSettingsMap(prev => ({ ...prev, [selectedPreset]: next }));
    },
    [selectedPreset]
  );

  const setMovesForPreset = useCallback(
    (preset: PresetKey, moves: Move[]) => {
      setCustomMoves(prev => ({ ...prev, [preset]: moves }));
    },
    []
  );

  const displayModeRef = useRef<DisplayMode>(displayMode);
  useEffect(() => {
    displayModeRef.current = displayMode;
  }, [displayMode]);

  const customDisplayKeysRef = useRef<Set<number>>(customDisplayKeys);
  useEffect(() => {
    customDisplayKeysRef.current = customDisplayKeys;
  }, [customDisplayKeys]);

  const useVoiceRef = useRef<boolean>(useVoice);
  useEffect(() => {
    useVoiceRef.current = useVoice;
  }, [useVoice]);

  return {
    selectedPreset,
    setSelectedPreset,
    customMoves,
    setCustomMoves,
    setMovesForPreset,
    currentMoves: customMoves[selectedPreset] ?? [],
    generationSettingsMap,
    setGenerationSettingsMap,
    generationSettings,
    setGenerationSettings,
    displayModeMap,
    setDisplayModeMap,
    displayMode,
    setDisplayMode,
    displayModeRef,
    customDisplayKeys,
    setCustomDisplayKeys,
    customDisplayKeysRef,
    useVoice,
    setUseVoice,
    useVoiceRef,
  };
}
