import { useState, useEffect, useCallback } from "react";
import "./css/base.css";
import "./css/layout.css";
import "./css/typography.css";
import "./css/controls.css";
import "./css/presets.css";
import "./css/generation.css";
import "./css/auth.css";
import "./css/display.css";

import { DesktopLayout } from "./components/DesktopLayout";
import { MobileLayout } from "./components/MobileLayout";
import { StreakGridModal } from "./components/StreakGridModal";
import { usePresetSettings, areMovesEqual } from "./hooks/usePresetSettings";
import { useAuthSession } from "./hooks/useAuthSession";
import { useWorkoutStats } from "./hooks/useWorkoutStats";
import { useWorkoutRunner } from "./hooks/useWorkoutRunner";
import { MAX_SLOTS, movesForSlot, DEFAULT_PRESETS } from "./utils/constants";
import { getBootstrap, upsertPreset } from "./utils/api";
import type { PresetKey } from "./types";

export function App() {
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileSettings, setShowMobileSettings] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const {
    username,
    authBusy,
    apiConnected,
    isBootstrapped,
    handleLogin,
    handleRegister,
    handleLogout,
  } = useAuthSession();

  const {
    selectedPreset,
    setSelectedPreset,
    customMoves,
    setCustomMoves,
    setMovesForPreset,
    currentMoves,
    generationSettings,
    setGenerationSettings,
    displayMode,
    setDisplayMode,
    customDisplayKeys,
    setCustomDisplayKeys,
    useVoice,
    setUseVoice,
  } = usePresetSettings();

  const {
    totalPracticeSeconds,
    setTotalPracticeSeconds,
    totalPracticeCombos,
    setTotalPracticeCombos,
    streak,
    setStreak,
    activeDates,
    setActiveDates,
    showStreakModal,
    setShowStreakModal,
    accumulateWorkout,
  } = useWorkoutStats(username);

  const runner = useWorkoutRunner({
    currentMoves,
    generationSettings,
    displayMode,
    customDisplayKeys,
    useVoice,
    onWorkoutFinish: accumulateWorkout,
  });

  // Hydrate data from bootstrap API
  useEffect(() => {
    if (!isBootstrapped || !username) return;
    getBootstrap()
      .then(res => {
        if (!res) return;
        if (res.activeDates) setActiveDates(res.activeDates);
        if (typeof res.streak === "number") setStreak(res.streak);
        if (res.todaySession) {
          if (typeof res.todaySession.num_combos === "number") {
            setTotalPracticeCombos(prev => Math.max(res.todaySession!.num_combos, prev));
          }
          if (typeof res.todaySession.time_seconds === "number") {
            setTotalPracticeSeconds(prev => Math.max(res.todaySession!.time_seconds, prev));
          }
        }
        if (res.presets && Array.isArray(res.presets)) {
          const loaded: Record<PresetKey, typeof currentMoves> = { ...DEFAULT_PRESETS };
          res.presets.forEach(p => {
            const name = p.preset_name as PresetKey;
            const data = p.preset_data as any;
            if (data?.moves && Array.isArray(data.moves)) {
              loaded[name] = data.moves;
            }
          });
          setCustomMoves(loaded);
        }
      })
      .catch(() => {});
  }, [isBootstrapped, username, setActiveDates, setStreak, setTotalPracticeCombos, setTotalPracticeSeconds, setCustomMoves]);

  const handlePresetChange = useCallback((p: PresetKey) => {
    setSelectedPreset(p);
  }, [setSelectedPreset]);

  const handleChangeName = useCallback(
    (key: number, newName: string) => {
      const nextMoves = currentMoves.map(m => (m.key === key ? { ...m, name: newName } : m));
      setMovesForPreset(selectedPreset, nextMoves);
      if (username) {
        upsertPreset({
          preset_name: selectedPreset,
          preset_data: {
            moves: nextMoves,
            generationSettings,
            frequencies: [],
          },
        }).catch(() => {});
      }
    },
    [currentMoves, selectedPreset, setMovesForPreset, username, generationSettings]
  );

  const handleRemoveRow = useCallback(
    (key: number) => {
      const nextMoves = currentMoves
        .filter(m => m.key !== key)
        .map((m, idx) => ({ ...m, key: idx + 1 }));
      setMovesForPreset(selectedPreset, nextMoves);
      if (username) {
        upsertPreset({
          preset_name: selectedPreset,
          preset_data: {
            moves: nextMoves,
            generationSettings,
            frequencies: [],
          },
        }).catch(() => {});
      }
    },
    [currentMoves, selectedPreset, setMovesForPreset, username, generationSettings]
  );

  const handleAddRow = useCallback(() => {
    if (currentMoves.length >= MAX_SLOTS) return;
    const nextKey = currentMoves.length + 1;
    const nextMoves = [...currentMoves, { key: nextKey, name: "", locked: false }];
    setMovesForPreset(selectedPreset, nextMoves);
    if (username) {
      upsertPreset({
        preset_name: selectedPreset,
        preset_data: {
          moves: nextMoves,
          generationSettings,
          frequencies: [],
        },
      }).catch(() => {});
    }
  }, [currentMoves, selectedPreset, setMovesForPreset, username, generationSettings]);

  const usedNames = new Set(currentMoves.map(m => m.name));
  const optionsFor = useCallback(
    (key: number, slotName: string) =>
      movesForSlot(key).filter(m => m === slotName || !usedNames.has(m)),
    [currentMoves, usedNames]
  );

  const isSessionActive = runner.isTimerRunning || runner.isCombosActive;
  const hasStarted = isSessionActive || runner.countdown !== null;

  const leftDisplayProps = {
    mode: runner.mode,
    currentCombo: runner.currentCombo,
    isTimerRunning: runner.isTimerRunning,
    timeLeft: runner.timeLeft,
    combosCompleted: runner.combosCompleted,
    totalCombos: runner.totalCombos,
    isCombosActive: runner.isCombosActive,
    totalPracticeSeconds,
    totalPracticeCombos,
    countdown: runner.countdown,
    streak,
    onOpenStreakModal: () => setShowStreakModal(true),
    onClick: isSessionActive ? runner.stopAllRuns : undefined,
  };

  const controlsProps = {
    mode: runner.mode,
    setMode: runner.setMode,
    timeInputMin: runner.timeInputMin,
    setTimeInputMin: runner.setTimeInputMin,
    timeInputSec: runner.timeInputSec,
    setTimeInputSec: runner.setTimeInputSec,
    comboInput: runner.comboInput,
    setComboInput: runner.setComboInput,
    onStart: runner.mode === "time" ? runner.startTimerWorkout : runner.startCombosWorkout,
    onPause: runner.stopAllRuns,
    onReset: runner.stopAllRuns,
    isSessionActive,
    hasStarted,
    username,
    authBusy,
    apiConnected,
    onLogin: handleLogin,
    onRegister: handleRegister,
    onLogout: handleLogout,
  };

  const presetsProps = {
    speed: runner.speed,
    setSpeed: runner.setSpeed,
    selectedPreset,
    onPresetChange: handlePresetChange,
    currentMoves,
    generationSettings,
    onGenerationSettingsChange: setGenerationSettings,
    optionsFor,
    handleChangeName,
    handleRemoveRow,
    handleAddRow,
    maxSlots: MAX_SLOTS,
    displayMode,
    setDisplayMode,
    useVoice,
    setUseVoice,
    customDisplayKeys,
    setCustomDisplayKeys,
  };

  return (
    <>
      {isMobile ? (
        <MobileLayout
          leftDisplayProps={leftDisplayProps}
          controlsProps={controlsProps}
          presetsProps={presetsProps}
          showSettings={showMobileSettings}
          setShowSettings={setShowMobileSettings}
          streak={streak}
          onOpenStreakModal={() => setShowStreakModal(true)}
          totalPracticeSeconds={totalPracticeSeconds}
          totalPracticeCombos={totalPracticeCombos}
        />
      ) : (
        <DesktopLayout
          leftDisplayProps={leftDisplayProps}
          controlsProps={controlsProps}
          presetsProps={presetsProps}
          streak={streak}
          onOpenStreakModal={() => setShowStreakModal(true)}
        />
      )}

      {showStreakModal && (
        <StreakGridModal
          isOpen={showStreakModal}
          activeDates={activeDates}
          streak={streak}
          onClose={() => setShowStreakModal(false)}
        />
      )}
    </>
  );
}
