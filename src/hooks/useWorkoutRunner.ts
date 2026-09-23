import { useState, useRef, useEffect, useCallback } from "react";
import type { Move, GenerationSettings, DisplayMode } from "../types";
import { generateCombo } from "../scripts/combogenerator";
import { useAudioSequencer } from "./useAudioSequencer";
import bellUrl from "../assets/bell.ogg";
import drumsUrl from "../assets/drums.ogg";

interface UseWorkoutRunnerParams {
  currentMoves: Move[];
  generationSettings: GenerationSettings;
  displayMode: DisplayMode;
  customDisplayKeys: Set<number>;
  useVoice: boolean;
  onWorkoutFinish: (seconds: number, combos: number) => void;
}

export function useWorkoutRunner({
  currentMoves,
  generationSettings,
  displayMode,
  customDisplayKeys,
  useVoice,
  onWorkoutFinish,
}: UseWorkoutRunnerParams) {
  const [mode, setMode] = useState<"time" | "combos">("time");
  const [timeInputMin, setTimeInputMin] = useState<string>("3");
  const [timeInputSec, setTimeInputSec] = useState<string>("0");
  const [comboInput, setComboInput] = useState<string>("10");
  const [speed, setSpeed] = useState<number>(3000);

  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isCombosActive, setIsCombosActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [combosCompleted, setCombosCompleted] = useState<number>(0);
  const [totalCombos, setTotalCombos] = useState<number>(0);
  const [currentCombo, setCurrentCombo] = useState<string>("");
  const [countdown, setCountdown] = useState<number | null>(null);

  const bellAudioRef = useRef<HTMLAudioElement | null>(null);
  const drumsAudioRef = useRef<HTMLAudioElement | null>(null);

  const timeoutIdRef = useRef<number | null>(null);
  const timerTimeoutRef = useRef<number | null>(null);
  const countdownTimerRef = useRef<number | null>(null);

  const sessionStartMsRef = useRef<number | null>(null);
  const sessionCombosCountRef = useRef<number>(0);

  const currentComboKeysRef = useRef<number[] | null>(null);
  const comboTimeRemainingRef = useRef<number>(0);
  const comboStartedAtRef = useRef<number>(0);

  const useVoiceRef = useRef(useVoice);
  useEffect(() => { useVoiceRef.current = useVoice; }, [useVoice]);

  const displayModeRef = useRef(displayMode);
  useEffect(() => { displayModeRef.current = displayMode; }, [displayMode]);

  const customDisplayKeysRef = useRef(customDisplayKeys);
  useEffect(() => { customDisplayKeysRef.current = customDisplayKeys; }, [customDisplayKeys]);

  const { playComboAudio, stopAudio, currentMoveIndexRef } = useAudioSequencer({
    useVoiceRef,
    displayModeRef,
    customDisplayKeysRef,
    currentMoves,
  });

  useEffect(() => {
    bellAudioRef.current = new Audio(bellUrl);
    drumsAudioRef.current = new Audio(drumsUrl);
  }, []);

  const playBell = useCallback(() => {
    try {
      if (bellAudioRef.current) {
        bellAudioRef.current.currentTime = 0;
        bellAudioRef.current.play().catch(() => {});
      }
    } catch {}
  }, []);

  const playDrums = useCallback(() => {
    try {
      if (drumsAudioRef.current) {
        drumsAudioRef.current.currentTime = 0;
        drumsAudioRef.current.play().catch(() => {});
      }
    } catch {}
  }, []);

  const comboToString = useCallback((keys: number[]) => {
    const curMode = displayModeRef.current;
    const customKeys = customDisplayKeysRef.current;
    return keys
      .map(k => {
        const useName = curMode === "fullname" || (curMode === "custom" && customKeys.has(k));
        return useName
          ? (currentMoves.find(m => m.key === k)?.name ?? String(k))
          : String(k);
      })
      .join(" · ");
  }, [currentMoves]);

  const getCombo = useCallback(() => {
    return generateCombo({
      moves: currentMoves,
      length: { min: generationSettings.min, max: generationSettings.max },
      bias: generationSettings.bias,
      lengthVariance: generationSettings.lengthVariance,
      weights: generationSettings.weights,
    });
  }, [currentMoves, generationSettings]);

  const getExtraComboDelay = useCallback((keys: number[]) => {
    let extra = 0;
    for (const k of keys) {
      const move = currentMoves.find(m => m.key === k);
      const name = move?.name.toUpperCase() || "";
      if (name.includes("SHOOT") || name.includes("TAKEDOWN") || name.includes("ROLL")) {
        extra += 2000;
      } else if (
        name.includes("SPINNING") ||
        name.includes("SWITCH KICK") ||
        name.includes("WHEEL") ||
        name.includes("TORNADO")
      ) {
        extra += 1000;
      } else if (name.includes("SPRAWL")) {
        extra += 1000;
      } else if (name.includes("CIRCLE OFF") || name.includes("LEVEL CHANGE")) {
        extra += 700;
      } else if (name.includes("DOWNBLOCK")) {
        extra += 500;
      } else if (name.includes("CALF KICK")) {
        extra += 200;
      } else if (name.includes("KICK") || name.includes("TEEP")) {
        extra += 300;
      } else if (["KNEE", "ELBOW", "OVERHAND"].some(s => name.includes(s))) {
        extra += 400;
      }
    }
    return extra;
  }, [currentMoves]);

  const stopAllRuns = useCallback(() => {
    if (timeoutIdRef.current !== null) {
      window.clearTimeout(timeoutIdRef.current);
      timeoutIdRef.current = null;
    }
    if (timerTimeoutRef.current !== null) {
      window.clearTimeout(timerTimeoutRef.current);
      timerTimeoutRef.current = null;
    }
    if (countdownTimerRef.current !== null) {
      window.clearTimeout(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }

    // Save remaining combo duration for resume
    if (comboStartedAtRef.current > 0) {
      const elapsed = Date.now() - comboStartedAtRef.current;
      comboTimeRemainingRef.current = Math.max(0, comboTimeRemainingRef.current - elapsed);
      comboStartedAtRef.current = 0;
    }

    setIsTimerRunning(false);
    setIsCombosActive(false);
    setCountdown(null);
    stopAudio();

    if (sessionStartMsRef.current !== null) {
      const elapsedSeconds = Math.max(0, Math.round((Date.now() - sessionStartMsRef.current) / 1000));
      const completedCombos = sessionCombosCountRef.current;
      if (elapsedSeconds > 0 || completedCombos > 0) {
        onWorkoutFinish(elapsedSeconds, completedCombos);
      }
      sessionStartMsRef.current = null;
      sessionCombosCountRef.current = 0;
    }
  }, [stopAudio, onWorkoutFinish]);

  const scheduleNextCombo = useCallback((isFirst = false) => {
    const isCombos = mode === "combos";
    const targetCombos = totalCombos;

    if (!isFirst) {
      sessionCombosCountRef.current += 1;
      setCombosCompleted(prev => {
        const next = prev + 1;
        if (isCombos && targetCombos > 0 && next >= targetCombos) {
          stopAllRuns();
          playBell();
          setCurrentCombo("WORKOUT COMPLETE!");
          return next;
        }
        return next;
      });

      if (isCombos && targetCombos > 0 && sessionCombosCountRef.current >= targetCombos) {
        return;
      }
    }

    const keys = getCombo();
    if (!keys || keys.length === 0) return;

    const extraDelay = getExtraComboDelay(keys);
    const delay = speed + extraDelay;

    currentComboKeysRef.current = keys;
    comboTimeRemainingRef.current = delay;
    comboStartedAtRef.current = Date.now();

    setCurrentCombo(comboToString(keys));
    stopAudio();
    playComboAudio(keys, delay, 0);

    timeoutIdRef.current = window.setTimeout(() => {
      scheduleNextCombo(false);
    }, delay);
  }, [mode, totalCombos, getCombo, getExtraComboDelay, speed, comboToString, stopAudio, playComboAudio, stopAllRuns, playBell]);

  const resumeCurrentCombo = useCallback(() => {
    const keys = currentComboKeysRef.current;
    const remainingTime = comboTimeRemainingRef.current;
    if (!keys || remainingTime <= 0) {
      scheduleNextCombo(false);
      return;
    }

    comboStartedAtRef.current = Date.now();
    setCurrentCombo(comboToString(keys));
    stopAudio();

    const resumeIndex = currentMoveIndexRef.current;
    playComboAudio(keys, remainingTime, resumeIndex);

    timeoutIdRef.current = window.setTimeout(() => {
      scheduleNextCombo(false);
    }, remainingTime);
  }, [comboToString, stopAudio, playComboAudio, currentMoveIndexRef, scheduleNextCombo]);

  const tickTimer = useCallback(() => {
    setTimeLeft(prev => {
      if (prev <= 1) {
        stopAllRuns();
        playBell();
        setCurrentCombo("WORKOUT COMPLETE!");
        return 0;
      }
      timerTimeoutRef.current = window.setTimeout(tickTimer, 1000);
      return prev - 1;
    });
  }, [stopAllRuns, playBell]);

  const startTimerWorkout = useCallback(() => {
    if (isTimerRunning) return;

    // Resuming paused timer
    if (timeLeft > 0 && currentComboKeysRef.current && comboTimeRemainingRef.current > 0) {
      setIsTimerRunning(true);
      sessionStartMsRef.current = Date.now();
      resumeCurrentCombo();
      timerTimeoutRef.current = window.setTimeout(tickTimer, 1000);
      return;
    }

    stopAllRuns();
    const mins = parseInt(timeInputMin, 10) || 0;
    const secs = parseInt(timeInputSec, 10) || 0;
    const totalSecs = mins * 60 + secs;
    if (totalSecs <= 0) return;

    setTimeLeft(totalSecs);
    setCombosCompleted(0);
    setCountdown(3);
    playDrums();

    let count = 3;
    const runCountdown = () => {
      count -= 1;
      if (count > 0) {
        setCountdown(count);
        countdownTimerRef.current = window.setTimeout(runCountdown, 1000);
      } else {
        setCountdown(null);
        playBell();
        setIsTimerRunning(true);
        sessionStartMsRef.current = Date.now();
        sessionCombosCountRef.current = 0;

        scheduleNextCombo(true);
        timerTimeoutRef.current = window.setTimeout(tickTimer, 1000);
      }
    };
    countdownTimerRef.current = window.setTimeout(runCountdown, 1000);
  }, [isTimerRunning, timeLeft, resumeCurrentCombo, tickTimer, stopAllRuns, timeInputMin, timeInputSec, playDrums, playBell, scheduleNextCombo]);

  const startCombosWorkout = useCallback(() => {
    if (isCombosActive) return;

    // Resuming paused combo workout
    if (totalCombos > 0 && combosCompleted < totalCombos && currentComboKeysRef.current && comboTimeRemainingRef.current > 0) {
      setIsCombosActive(true);
      sessionStartMsRef.current = Date.now();
      resumeCurrentCombo();
      return;
    }

    stopAllRuns();
    const countTarget = parseInt(comboInput, 10) || 10;
    setTotalCombos(countTarget);
    setCombosCompleted(0);
    setCountdown(3);
    playDrums();

    let count = 3;
    const runCountdown = () => {
      count -= 1;
      if (count > 0) {
        setCountdown(count);
        countdownTimerRef.current = window.setTimeout(runCountdown, 1000);
      } else {
        setCountdown(null);
        playBell();
        setIsCombosActive(true);
        sessionStartMsRef.current = Date.now();
        sessionCombosCountRef.current = 0;

        scheduleNextCombo(true);
      }
    };
    countdownTimerRef.current = window.setTimeout(runCountdown, 1000);
  }, [isCombosActive, totalCombos, combosCompleted, resumeCurrentCombo, stopAllRuns, comboInput, playDrums, playBell, scheduleNextCombo]);

  return {
    mode,
    setMode,
    timeInputMin,
    setTimeInputMin,
    timeInputSec,
    setTimeInputSec,
    comboInput,
    setComboInput,
    speed,
    setSpeed,
    isTimerRunning,
    isCombosActive,
    timeLeft,
    combosCompleted,
    totalCombos,
    currentCombo,
    countdown,
    startTimerWorkout,
    startCombosWorkout,
    stopAllRuns,
  };
}
