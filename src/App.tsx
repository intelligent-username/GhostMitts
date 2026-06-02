import { useState, useEffect, useRef, useCallback } from "react";
import "./css/base.css";
import "./css/layout.css";
import "./css/typography.css";
import "./css/controls.css";
import "./css/presets.css";
import "./css/generation.css";
import "./css/auth.css";
import "./css/toggles.css";
import "./css/display.css";
import { generateCombo } from "./scripts/combogenerator";
import { LeftDisplay } from "./components/LeftDisplay";
import { ControlsColumn } from "./components/ControlsColumn";
import { PresetsColumn } from "./components/PresetsColumn";
import { AuthPanel } from "./components/AuthPanel";
import { StreakGridModal } from "./components/StreakGridModal";
import type { Move, PresetKey, GenerationSettings, DisplayMode } from "./types";
import { DEFAULT_PRESETS, MAX_SLOTS, movesForSlot } from "./utils/constants";
import { loadTotalSeconds, loadTotalCombos, saveTotalSeconds, saveTotalCombos, loadGenSettings, saveGenSettings } from "./utils/storage";
import { useAudioSequencer } from "./hooks/useAudioSequencer";
import { getBootstrap, getMe, insertWorkout, loginAccount, logoutAccount, registerAccount, upsertDailySession, upsertPreset } from "./utils/api";
import bellUrl from "./assets/bell.ogg";
import drumsUrl from "./assets/drums.ogg";

const DEFAULT_GENERATION_SETTINGS: GenerationSettings = { min: 1, max: 20, bias: 0.80, lengthVariance: 1 };

function isDefaultGenerationSettings(s: GenerationSettings): boolean {
  return (
    s.min === DEFAULT_GENERATION_SETTINGS.min &&
    s.max === DEFAULT_GENERATION_SETTINGS.max &&
    s.bias === DEFAULT_GENERATION_SETTINGS.bias &&
    s.lengthVariance === DEFAULT_GENERATION_SETTINGS.lengthVariance
  );
}

function areMovesEqual(a: Move[], b: Move[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const ma = a[i]!;
    const mb = b[i]!;
    if (ma.key !== mb.key) return false;
    if (ma.name !== mb.name) return false;
    if (ma.locked !== mb.locked) return false;
  }
  return true;
}

const SettingsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="settings-svg">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
);

export function App() {
  const [isMobile, setIsMobile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const [mode, setMode] = useState<"time" | "combos">("time");

  const [selectedPreset, setSelectedPreset] = useState<PresetKey>("Boxing");
  const [customMoves, setCustomMoves] = useState<Record<PresetKey, Move[]>>({
    Boxing:     [...DEFAULT_PRESETS.Boxing],
    Kickboxing: [...DEFAULT_PRESETS.Kickboxing],
    "Muay Thai": [...DEFAULT_PRESETS["Muay Thai"]],
    MMA: [...DEFAULT_PRESETS.MMA],
  });

  const [generationSettingsMap, setGenerationSettingsMap] = useState<Record<PresetKey, GenerationSettings>>({
    Boxing: { ...DEFAULT_GENERATION_SETTINGS },
    Kickboxing: { ...DEFAULT_GENERATION_SETTINGS },
    "Muay Thai": { ...DEFAULT_GENERATION_SETTINGS },
    MMA: { ...DEFAULT_GENERATION_SETTINGS },
  });

  const generationSettings = generationSettingsMap[selectedPreset];

  const [timeInputMin, setTimeInputMin] = useState<string>("3");
  const [timeInputSec, setTimeInputSec] = useState<string>("0");
  const [comboInput, setComboInput]     = useState<string>("10");
  const [speed, setSpeed]               = useState<number>(3000);

  // Timer / combo run state
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isCombosActive, setIsCombosActive] = useState(false);
  const [timeLeft, setTimeLeft]             = useState<number>(0);
  const [combosCompleted, setCombosCompleted] = useState<number>(0);
  const [totalCombos, setTotalCombos]         = useState<number>(0);
  const [currentCombo, setCurrentCombo]       = useState<string>("");
  const [username, setUsername]               = useState<string | null>(null);
  const [authBusy, setAuthBusy]               = useState<boolean>(false);
  const [apiConnected, setApiConnected]       = useState<boolean | null>(null);
  const [isBootstrapped, setIsBootstrapped]   = useState(false);

  const speedRef = useRef<number>(3000);

  // Display options
  const [displayMode, setDisplayMode] = useState<DisplayMode>("numbers");
  const displayModeRef = useRef<DisplayMode>("numbers");
  useEffect(() => { displayModeRef.current = displayMode; }, [displayMode]);

  const [customDisplayKeys, setCustomDisplayKeys] = useState<Set<number>>(new Set());
  const customDisplayKeysRef = useRef<Set<number>>(new Set());
  useEffect(() => { customDisplayKeysRef.current = customDisplayKeys; }, [customDisplayKeys]);

  const [useVoice, setUseVoice] = useState<boolean>(true);
  const useVoiceRef = useRef<boolean>(true);
  useEffect(() => { useVoiceRef.current = useVoice; }, [useVoice]);

  const [activeDates, setActiveDates] = useState<Array<{ date: string; num_combos: number }>>([]);
  const [streak, setStreak] = useState<number>(0);
  const [showStreakModal, setShowStreakModal] = useState<boolean>(false);

  // Session totals from localStorage
  const [totalPracticeSeconds, setTotalPracticeSeconds] = useState<number>(() => loadTotalSeconds());
  const [totalPracticeCombos, setTotalPracticeCombos] = useState<number>(() => loadTotalCombos());

  // Refs for tab-close flush (avoid stale closures)
  const usernameRef = useRef<string | null>(null);
  const selectedPresetRef = useRef<PresetKey>(selectedPreset);
  const currentMovesRef = useRef<Move[]>(customMoves[selectedPreset]);
  const customMovesRef = useRef<Record<PresetKey, Move[]>>(customMoves);
  const generationSettingsRef = useRef<GenerationSettings>(generationSettings);
  const totalPracticeSecondsRef = useRef<number>(totalPracticeSeconds);
  const totalPracticeCombosRef = useRef<number>(totalPracticeCombos);
  const flushedOnCloseRef = useRef<boolean>(false);

  useEffect(() => { usernameRef.current = username; }, [username]);
  useEffect(() => { selectedPresetRef.current = selectedPreset; }, [selectedPreset]);
  useEffect(() => { currentMovesRef.current = customMoves[selectedPreset]; }, [customMoves, selectedPreset]);
  useEffect(() => { customMovesRef.current = customMoves; }, [customMoves]);
  useEffect(() => { generationSettingsRef.current = generationSettings; }, [generationSettings]);
  useEffect(() => { totalPracticeSecondsRef.current = totalPracticeSeconds; }, [totalPracticeSeconds]);
  useEffect(() => { totalPracticeCombosRef.current = totalPracticeCombos; }, [totalPracticeCombos]);
  useEffect(() => { speedRef.current = speed; }, [speed]);

  // Persist whenever totals change
  useEffect(() => { saveTotalSeconds(totalPracticeSeconds); }, [totalPracticeSeconds]);

  const triggerCloudSessionSave = useCallback((overrideSec?: number, overrideCombos?: number) => {
    const uname = usernameRef.current;
    if (!uname) return;
    const seconds = overrideSec !== undefined ? overrideSec : totalPracticeSecondsRef.current;
    const combos = overrideCombos !== undefined ? overrideCombos : totalPracticeCombosRef.current;
    const date = new Date().toISOString().split("T")[0]!;
    void upsertDailySession({ date, num_combos: combos, time_seconds: seconds }).catch(() => {});
  }, []);
  useEffect(() => { saveTotalCombos(totalPracticeCombos);  }, [totalPracticeCombos]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const me = await getMe();
        if (mounted) setApiConnected(true);
        if (mounted && me.authenticated && me.username) {
          setUsername(me.username);
          try {
            const boot = await getBootstrap();
            if (!mounted) return;
            if (boot.todaySession) {
              setTotalPracticeSeconds(Math.max(0, Number(boot.todaySession.time_seconds || 0)));
              setTotalPracticeCombos(Math.max(0, Number(boot.todaySession.num_combos || 0)));
            }
            if (boot.streak !== undefined) {
              setStreak(boot.streak);
            }
            if (boot.activeDates) {
              setActiveDates(boot.activeDates);
            }

            const presetMap = new Map<PresetKey, { moves?: Move[]; generationSettings?: GenerationSettings }>();
            for (const p of boot.presets) {
              if (p.preset_name === "Boxing" || p.preset_name === "Kickboxing" || p.preset_name === "Muay Thai" || p.preset_name === "MMA") {
                const data = p.preset_data as any;
                presetMap.set(p.preset_name, {
                  moves: Array.isArray(data?.moves) ? data.moves : undefined,
                  generationSettings: data?.generationSettings,
                });
              }
            }

            if (presetMap.size > 0) {
              setCustomMoves(prev => {
                const next = { ...prev };
                for (const [key, val] of presetMap.entries()) {
                  if (val.moves && Array.isArray(val.moves)) {
                    next[key] = val.moves as Move[];
                  }
                }
                return next;
              });

              setGenerationSettingsMap(prev => {
                const next = { ...prev };
                for (const [key, val] of presetMap.entries()) {
                  if (val.generationSettings && typeof val.generationSettings === "object") {
                    next[key] = val.generationSettings as GenerationSettings;
                  }
                }
                return next;
              });
            }
            if (mounted) setIsBootstrapped(true);
          } catch {
            // Ignore bootstrap failures (API reachable but user data unavailable)
            if (mounted) setIsBootstrapped(true);
          }
        } else {
          if (mounted) setIsBootstrapped(true);
        }
      } catch {
        if (mounted) {
          setUsername(null);
          setApiConnected(false);
        }
      }
    })();
    return () => { mounted = false; };
  }, []);

  // ── workout segment logging (detailed session storage) ───────────────────
  const activeWorkoutStartMsRef = useRef<number | null>(null);
  const activeWorkoutCombosStartRef = useRef<number>(0);
  const activeWorkoutModeRef = useRef<"time" | "combos" | null>(null);
  const activeWorkoutPresetRef = useRef<PresetKey | null>(null);
  const activeWorkoutMovesRef = useRef<Move[] | null>(null);
  const activeWorkoutGenRef = useRef<GenerationSettings | null>(null);
  const activeWorkoutSpeedMsRef = useRef<number>(0);

  const startWorkoutSegment = useCallback(() => {
    if (activeWorkoutStartMsRef.current != null) return;
    activeWorkoutStartMsRef.current = Date.now();
    activeWorkoutCombosStartRef.current = combosCompletedRef.current;
    activeWorkoutModeRef.current = mode;
    activeWorkoutPresetRef.current = selectedPresetRef.current;
    activeWorkoutMovesRef.current = currentMovesRef.current;
    activeWorkoutGenRef.current = generationSettingsRef.current;
    activeWorkoutSpeedMsRef.current = speedRef.current;
  }, [mode]);

  const endWorkoutSegment = useCallback((reason: "pause" | "complete" | "reset" | "unload", options?: { keepalive?: boolean }) => {
    const startMs = activeWorkoutStartMsRef.current;
    if (startMs == null) return;

    activeWorkoutStartMsRef.current = null;

    const uname = usernameRef.current;
    if (!uname) return;

    const endMs = Date.now();
    const startedAt = new Date(startMs).toISOString();
    const endedAt = new Date(endMs).toISOString();
    const modeAtStart = activeWorkoutModeRef.current;
    const preset = activeWorkoutPresetRef.current;
    const speedMs = activeWorkoutSpeedMsRef.current;

    if (!modeAtStart || !preset) return;

    const combosDelta = Math.max(0, combosCompletedRef.current - activeWorkoutCombosStartRef.current);
    const durationSeconds = Math.max(0, Math.round((endMs - startMs) / 1000));

    const nextSec = totalPracticeSecondsRef.current + durationSeconds;
    const nextCombos = totalPracticeCombosRef.current + combosDelta;

    if (combosDelta > 0 || durationSeconds > 0) {
      setTotalPracticeCombos(nextCombos);
      setTotalPracticeSeconds(nextSec);
      if (reason !== "unload") {
        triggerCloudSessionSave(nextSec, nextCombos);
      }
    }

    if (combosDelta === 0 && durationSeconds === 0) return;

    void insertWorkout(
      {
        started_at: startedAt,
        ended_at: endedAt,
        mode: modeAtStart,
        preset_name: preset,
        speed_ms: speedMs,
        combos_completed: combosDelta,
        duration_seconds: durationSeconds,
        workout_data: {
          reason,
          moves: activeWorkoutMovesRef.current,
          generationSettings: activeWorkoutGenRef.current,
        },
      },
      { keepalive: options?.keepalive }
    ).catch(() => {});
  }, []);

  // If the day rolls over while the app is open, clear stored totals so display stays "today only".
  useEffect(() => {
    const checkDay = () => {
      const sec = loadTotalSeconds();
      const cb = loadTotalCombos();
      if (sec === 0 && totalPracticeSeconds > 0) {
        setTotalPracticeSeconds(0);
      }
      if (cb === 0 && totalPracticeCombos > 0) {
        setTotalPracticeCombos(0);
      }
    };
    const id = window.setInterval(checkDay, 60000); // every minute
    return () => clearInterval(id);
  }, [totalPracticeSeconds, totalPracticeCombos]);

  // Stable refs so interval callbacks don't go stale
  const timeLeftRef          = useRef<number>(0);
  const combosCompletedRef   = useRef<number>(0);
  const totalCombosRef       = useRef<number>(0);
  const currentTimerDuration = useRef<number>(0);
  const sessionStartMs       = useRef<number>(0); // wall-clock start for combos-mode timing
  const timerRef             = useRef<number | null>(null);
  const currentComboKeysRef  = useRef<number[] | null>(null);
  const comboTimeRemainingRef = useRef<number>(0);
  const comboStartedAtRef    = useRef<number>(0);

  useEffect(() => { timeLeftRef.current        = timeLeft;        }, [timeLeft]);
  useEffect(() => { combosCompletedRef.current  = combosCompleted; }, [combosCompleted]);
  useEffect(() => { totalCombosRef.current      = totalCombos;     }, [totalCombos]);

  // ── 1-second countdown (time mode) ───────────────────────────────────────
  useEffect(() => {
    if (isTimerRunning && timeLeft > 0) {
      if (timeLeft === 10) {
        const audio = new Audio(drumsUrl);
        audio.volume = 0.6;
        audio.play().catch(() => {});
      }
      timerRef.current = window.setTimeout(() => setTimeLeft(p => p - 1), 1000);
    } else if (timeLeft === 0 && isTimerRunning) {
      // Timer finished
      endWorkoutSegment("complete");
      setIsTimerRunning(false);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [isTimerRunning, timeLeft, endWorkoutSegment]);

  // ── helpers (must be before the interval effect that uses getCombo) ───────
  const currentMoves = customMoves[selectedPreset];
  const usedNames    = new Set(currentMoves.map(m => m.name));

  const optionsFor = (key: number, slotName: string) =>
    movesForSlot(key).filter(m => m === slotName || !usedNames.has(m));

  const getCombo = useCallback(
    (len?: { min: number; max: number }) =>
      generateCombo({
        moves: currentMoves,
        length: len ?? { min: generationSettings.min, max: generationSettings.max },
        bias: generationSettings.bias,
        lengthVariance: generationSettings.lengthVariance,
        weights: generationSettings.weights,
      }),
    [currentMoves, generationSettings]
  );

  // Build a display string from a combo (array of keys)
  const comboToString = useCallback((keys: number[]) => {
    const mode = displayModeRef.current;
    const customKeys = customDisplayKeysRef.current;
    return keys
      .map(k => {
        const useName = mode === "fullname" || (mode === "custom" && customKeys.has(k));
        return useName
          ? (currentMoves.find(m => m.key === k)?.name ?? String(k))
          : String(k);
      })
      .join(" · ");
  }, [currentMoves]);

  // ── audio sequencer & multi-processor ────────────────────────────────────
  const { playComboAudio, stopAudio } = useAudioSequencer({
    useVoiceRef,
    displayModeRef,
    customDisplayKeysRef,
    currentMoves,
  });

  // We maintain a pre-generated queue of combos
  const comboQueueRef = useRef<number[][]>([]);

  // Fill up the queue so it is always 10 combos deep ahead of time
  const replenishQueue = useCallback(() => {
    while (comboQueueRef.current.length < 10) {
      const keys = getCombo();
      if (keys.length > 0) comboQueueRef.current.push(keys);
    }
  }, [getCombo]);

  // Track previous active state to distinguish between initial play start and speed adjustments
  const lastActiveRef = useRef(false);

  // ── combo emitter (fires dynamically with timeouts to support per-combo adjustments) ──
  useEffect(() => {
    const isSessionActive = mode === "time" ? isTimerRunning : isCombosActive;
    if (!isSessionActive) {
      // Clear queues and stop sound if paused
      comboQueueRef.current = [];
      stopAudio();
      lastActiveRef.current = false;
      return;
    }

    let timeoutId: number | null = null;

    const emitCombo = () => {
      if (mode === "time" && timeLeftRef.current <= 0) return;

      const limit = totalCombosRef.current;
      if (limit > 0 && combosCompletedRef.current >= limit) {
        if (mode === "combos") {
          endWorkoutSegment("complete");
          setIsCombosActive(false);
        }
        return;
      }

      // Pre-gen if low
      replenishQueue();
      const keys = comboQueueRef.current.shift();
      if (!keys) return;

      // Calculate takedowns in this combo to dynamically extend display timer
      const numTakedowns = keys.filter(k => {
        const move = currentMoves.find(m => m.key === k);
        return move && move.name.toUpperCase().includes("TAKEDOWN");
      }).length;

      // Calculate sprawls in this combo to add another 1 second per sprawl
      const numSprawls = keys.filter(k => {
        const move = currentMoves.find(m => m.key === k);
        return move && move.name.toUpperCase().includes("SPRAWL");
      }).length;

      const nextDelay = speed + (numTakedowns * 1500) + (numSprawls * 1000);

      currentComboKeysRef.current = keys;
      comboTimeRemainingRef.current = nextDelay;
      comboStartedAtRef.current = Date.now();

      setCurrentCombo(comboToString(keys));
      // Stop any still-playing audio from the previous interval before starting the new one
      stopAudio();
      playComboAudio(keys, nextDelay);

      setCombosCompleted(prev => {
        const next = prev + 1;
        combosCompletedRef.current = next;
        return next;
      });

      // Schedule the next dynamic emission
      timeoutId = window.setTimeout(emitCombo, nextDelay);
    };

    const resumeCombo = () => {
      const keys = currentComboKeysRef.current;
      const remainingTime = comboTimeRemainingRef.current;
      if (!keys || remainingTime <= 0) {
        emitCombo();
        return;
      }

      comboStartedAtRef.current = Date.now();

      setCurrentCombo(comboToString(keys));
      stopAudio();
      playComboAudio(keys, remainingTime);

      timeoutId = window.setTimeout(emitCombo, remainingTime);
    };

    replenishQueue(); // prep before t=0
    
    const wasAlreadyActive = lastActiveRef.current;
    lastActiveRef.current = true;
    
    if (!wasAlreadyActive) {
      if (currentComboKeysRef.current && comboTimeRemainingRef.current > 0) {
        resumeCombo();
      } else {
        emitCombo();
      }
    } else {
      // Re-schedule immediately using the new speed baseline if mid-workout adjustment occurred
      timeoutId = window.setTimeout(emitCombo, speed);
    }

    return () => {
      if (timeoutId !== null) window.clearTimeout(timeoutId);

      // Save remaining time for the current combo when paused
      if (comboStartedAtRef.current > 0) {
        const elapsed = Date.now() - comboStartedAtRef.current;
        comboTimeRemainingRef.current = Math.max(0, comboTimeRemainingRef.current - elapsed);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, isTimerRunning, isCombosActive, speed, comboToString, playComboAudio, replenishQueue, endWorkoutSegment, currentMoves]);

  // ── preset mutations ──────────────────────────────────────────────────────
  const updatePreset = (moves: Move[]) =>
    setCustomMoves(prev => ({ ...prev, [selectedPreset]: moves }));

  // Persist generation settings whenever they change
  useEffect(() => {
    saveGenSettings(JSON.stringify(generationSettings));
  }, [generationSettings]);

  // Auto-save presets to cloud when moves or generation settings change (debounced)
  const presetSaveTimersRef = useRef<Map<PresetKey, number>>(new Map());

  const schedulePresetSave = useCallback((preset: PresetKey, moves: Move[], gen: GenerationSettings) => {
    if (!username) return;
    const timers = presetSaveTimersRef.current;
    const existing = timers.get(preset);
    if (existing) window.clearTimeout(existing);
    const timer = window.setTimeout(() => {
      void upsertPreset({
        preset_name: preset,
        preset_data: { moves, generationSettings: gen, frequencies: [] },
      }).catch(() => {});
      timers.delete(preset);
    }, 1500);
    timers.set(preset, timer);
  }, [username]);

  useEffect(() => {
    if (!username || !isBootstrapped) return;
    const preset = selectedPreset;
    schedulePresetSave(preset, customMoves[preset], generationSettingsMap[preset]);
  }, [customMoves, generationSettingsMap, selectedPreset, username, isBootstrapped, schedulePresetSave]);

  const handleAddRow = () => {
    if (currentMoves.length >= MAX_SLOTS) return;
    const nextKey = currentMoves.length + 1;
    const pool = movesForSlot(nextKey);
    const defaultName: string = pool.find(m => !usedNames.has(m)) ?? pool[0]!;
    updatePreset([...currentMoves, { key: nextKey, name: defaultName, locked: false }]);
  };

  const handleRemoveRow = (key: number) => {
    const filtered  = currentMoves.filter(m => m.key !== key);
    const reindexed = filtered.map((m, i) => ({ ...m, key: i + 1 }));
    updatePreset(reindexed);
  };

  const handleChangeName = (key: number, newName: string) =>
    updatePreset(currentMoves.map(m => m.key === key ? { ...m, name: newName } : m));

  const handlePresetChange = (p: PresetKey) => setSelectedPreset(p);

  const handleRegister = useCallback(async (nextUsername: string, password: string) => {
    setAuthBusy(true);
    try {
      await registerAccount(nextUsername, password);
      await loginAccount(nextUsername, password);
      setUsername(nextUsername);
      setApiConnected(true);

      try {
        const boot = await getBootstrap();
        if (boot.todaySession) {
          setTotalPracticeSeconds(Math.max(0, Number(boot.todaySession.time_seconds || 0)));
          setTotalPracticeCombos(Math.max(0, Number(boot.todaySession.num_combos || 0)));
        }
        if (boot.streak !== undefined) setStreak(boot.streak);
        if (boot.activeDates) setActiveDates(boot.activeDates);
      } catch {}
      setIsBootstrapped(true);
    } finally {
      setAuthBusy(false);
    }
  }, []);

  const handleLogin = useCallback(async (nextUsername: string, password: string) => {
    setAuthBusy(true);
    try {
      const res = await loginAccount(nextUsername, password);
      setUsername(res.username ?? nextUsername);
      setApiConnected(true);

       try {
        const boot = await getBootstrap();
        if (boot.todaySession) {
          setTotalPracticeSeconds(Math.max(0, Number(boot.todaySession.time_seconds || 0)));
          setTotalPracticeCombos(Math.max(0, Number(boot.todaySession.num_combos || 0)));
        }
        if (boot.streak !== undefined) setStreak(boot.streak);
        if (boot.activeDates) setActiveDates(boot.activeDates);

        const presetMap = new Map<PresetKey, { moves?: Move[]; generationSettings?: GenerationSettings }>();
        for (const p of boot.presets) {
          if (p.preset_name === "Boxing" || p.preset_name === "Kickboxing" || p.preset_name === "Muay Thai" || p.preset_name === "MMA") {
            const data = p.preset_data as any;
            presetMap.set(p.preset_name, {
              moves: Array.isArray(data?.moves) ? data.moves : undefined,
              generationSettings: data?.generationSettings,
            });
          }
        }

        if (presetMap.size > 0) {
          setCustomMoves(prev => {
            const next = { ...prev };
            for (const [key, val] of presetMap.entries()) {
              if (val.moves && Array.isArray(val.moves)) {
                next[key] = val.moves as Move[];
              }
            }
            return next;
          });

          setGenerationSettingsMap(prev => {
            const next = { ...prev };
            for (const [key, val] of presetMap.entries()) {
              if (val.generationSettings && typeof val.generationSettings === "object") {
                next[key] = val.generationSettings as GenerationSettings;
              }
            }
            return next;
          });
        }
      } catch {}
      setIsBootstrapped(true);
    } finally {
      setAuthBusy(false);
    }
  }, []);

  const handleLogout = useCallback(async () => {
    setAuthBusy(true);
    try {
      triggerCloudSessionSave();
      await logoutAccount();
      setUsername(null);
      setStreak(0);
      setActiveDates([]);
      setApiConnected(true);
      setCustomMoves({
        Boxing: [...DEFAULT_PRESETS["Boxing"]],
        Kickboxing: [...DEFAULT_PRESETS["Kickboxing"]],
        "Muay Thai": [...DEFAULT_PRESETS["Muay Thai"]],
        MMA: [...DEFAULT_PRESETS["MMA"]],
      });
      setGenerationSettingsMap({
        Boxing: { ...DEFAULT_GENERATION_SETTINGS },
        Kickboxing: { ...DEFAULT_GENERATION_SETTINGS },
        "Muay Thai": { ...DEFAULT_GENERATION_SETTINGS },
        MMA: { ...DEFAULT_GENERATION_SETTINGS },
      });
      setTotalPracticeSeconds(0);
      setTotalPracticeCombos(0);
    } finally {
      setAuthBusy(false);
    }
  }, [triggerCloudSessionSave]);

  const flushCloudSavesOnClose = useCallback(() => {
    // Only flush once per page lifecycle.
    if (flushedOnCloseRef.current) return;
    flushedOnCloseRef.current = true;

    const uname = usernameRef.current;
    if (!uname) return; // must be logged in

    // If there's an in-progress workout segment, log it.
    endWorkoutSegment("unload", { keepalive: true });

    const seconds = totalPracticeSecondsRef.current;
    const combos = totalPracticeCombosRef.current;
    const preset = selectedPresetRef.current;
    const gen = generationSettingsRef.current;

    const totalsNonDefault = seconds > 0 || combos > 0;
    const genNonDefault = !isDefaultGenerationSettings(gen);

    // Only save if there is something meaningfully non-default.
    if (!totalsNonDefault && !genNonDefault && !movesNonDefault) return;

    const date = new Date().toISOString().split("T")[0]!;

    if (totalsNonDefault) {
      void upsertDailySession(
        { date, num_combos: combos, time_seconds: seconds },
        { keepalive: true }
      ).catch(() => {});
    }

    const rearKickNames = new Set([
      "REAR KICK", "REAR TEEP", "BODY KICK", "ROUNDHOUSE KICK", "LOW KICK", "HEAD KICK",
    ]);

    const persistPreset = (presetKey: PresetKey, moves: Move[]) => {
      const movesNonDefault = !areMovesEqual(moves, DEFAULT_PRESETS[presetKey]);
      if (!genNonDefault && !movesNonDefault) return;
      const frequencies = moves.map((move) => {
        let weight = Math.pow(gen.bias, move.key - 1);
        if (rearKickNames.has(move.name.toUpperCase())) {
          weight *= 1.8;
        }
        return { key: move.key, weight };
      });
      void upsertPreset(
        {
          preset_name: presetKey,
          preset_data: { moves, generationSettings: gen, frequencies },
        },
        { keepalive: true }
      ).catch(() => {});
    };

    const allPresets = Object.keys(customMovesRef.current) as PresetKey[];
    for (const key of allPresets) {
      const moves = customMovesRef.current[key];
      if (moves) persistPreset(key, moves);
    }
  }, [endWorkoutSegment]);

  useEffect(() => {
    const onPageHide = () => flushCloudSavesOnClose();
    const onBeforeUnload = () => flushCloudSavesOnClose();

    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [flushCloudSavesOnClose]);

  // ── session control ───────────────────────────────────────────────────────
  const hasTimeRemaining = timeLeft > 0;
  const hasCombosRemaining = totalCombos > 0 && combosCompleted < totalCombos;
  const hasStarted = mode === "time" ? hasTimeRemaining : hasCombosRemaining;
  const isSessionActive = mode === "time" ? isTimerRunning : isCombosActive;

  const handleStart = () => {
    if (mode === "time") {
      if (!hasStarted) {
        const minutes = parseInt(timeInputMin) || 0;
        const seconds = parseInt(timeInputSec) || 0;
        const total   = minutes * 60 + seconds;
        if (total > 0) {
          // Play round start bell ONLY on BRAND NEW round
          const audio = new Audio(bellUrl);
          audio.volume = 0.6;
          audio.play().catch(() => {});

          currentComboKeysRef.current = null;
          comboTimeRemainingRef.current = 0;
          comboStartedAtRef.current = 0;

          setCurrentCombo("");
          setCombosCompleted(0);
          combosCompletedRef.current = 0;
          setTotalCombos(0);        // no combo cap in time mode unless user sets it
          totalCombosRef.current = 0;
          setTimeLeft(total);
          currentTimerDuration.current = total;
          startWorkoutSegment();
          setIsTimerRunning(true);
        }
      } else {
        startWorkoutSegment();
        setIsTimerRunning(true); // RESUME
      }
    } else {
      if (!hasStarted) {
        const count = parseInt(comboInput) || 0;
        if (count > 0) {
          // Play round start bell ONLY on BRAND NEW round
          const audio = new Audio(bellUrl);
          audio.volume = 0.6;
          audio.play().catch(() => {});

          currentComboKeysRef.current = null;
          comboTimeRemainingRef.current = 0;
          comboStartedAtRef.current = 0;

          setCurrentCombo("");
          setCombosCompleted(0);
          combosCompletedRef.current = 0;
          setTotalCombos(count);
          totalCombosRef.current = count;
          sessionStartMs.current = Date.now();
          startWorkoutSegment();
          setIsCombosActive(true);
        }
      } else if (!isCombosActive) {
        sessionStartMs.current = Date.now(); // RESUME
        startWorkoutSegment();
        setIsCombosActive(true);
      }
    }
  };

  const handlePause = () => {
    if (mode === "time") {
      endWorkoutSegment("pause");
      setIsTimerRunning(false);
    } else if (isCombosActive) {
      endWorkoutSegment("pause");
      setIsCombosActive(false);
    }
  };

  const handleReset = () => {
    endWorkoutSegment("reset");
    setIsTimerRunning(false);
    setIsCombosActive(false);
    setTimeLeft(0);
    setCombosCompleted(0);
    combosCompletedRef.current = 0;
    setTotalCombos(0);
    totalCombosRef.current = 0;
    setCurrentCombo("");

    // Clear combo resume state
    currentComboKeysRef.current = null;
    comboTimeRemainingRef.current = 0;
    comboStartedAtRef.current = 0;
  };

  //  Render
  if (isMobile) {
    const totalMins = totalPracticeSeconds > 0
      ? (totalPracticeSeconds / 60).toFixed(1).replace(/\.0$/, "")
      : "0";

    return (
      <div className="app-container mobile-container">
        <div className="mobile-header">
          <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
            {username && (
              <button className="streak-header-btn" onClick={() => { handlePause(); setShowStreakModal(true); }} title="View practice streak">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
                  <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
                </svg>
              </button>
            )}
            <h1 className="ghost-mitts-title-h1">GhostMitts</h1>
          </div>
          <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
            <button className="settings-toggle-btn" onClick={() => { handlePause(); setShowSettings(true); }}>
              <SettingsIcon />
            </button>
          </div>
        </div>

        {/* Dynamic Display of ongoing session */}
        {hasStarted && (
          <LeftDisplay
            mode={mode}
            isTimerRunning={isTimerRunning}
            timeLeft={timeLeft}
            isCombosActive={isCombosActive}
            combosCompleted={combosCompleted}
            totalCombos={totalCombos}
            onTabClick={() => {}}
            totalPracticeSeconds={totalPracticeSeconds}
            totalPracticeCombos={totalPracticeCombos}
            currentCombo={currentCombo}
            isMobile={true}
            username={username}
            onStreakClick={() => { handlePause(); setShowStreakModal(true); }}
          />
        )}

        {/* Clean Controls column (without AuthPanel) */}
        <ControlsColumn
          mode={mode}
          setMode={setMode}
          timeInputMin={timeInputMin}
          setTimeInputMin={setTimeInputMin}
          timeInputSec={timeInputSec}
          setTimeInputSec={setTimeInputSec}
          comboInput={comboInput}
          setComboInput={setComboInput}
          onStart={handleStart}
          onPause={handlePause}
          onReset={handleReset}
          isSessionActive={isSessionActive}
          hasStarted={hasStarted}
          username={username}
          authBusy={authBusy}
          apiConnected={apiConnected}
          onLogin={handleLogin}
          onRegister={handleRegister}
          onLogout={handleLogout}
          isMobile={true}
        />

        {/* Bottom Practice Totals */}
        <div className="mobile-totals-footer">
          {totalMins} min · {totalPracticeCombos} combos total today
        </div>

        {/* Settings Drawer/Overlay Modal */}
        {showSettings && (
          <div className="mobile-settings-overlay">
            <div className="mobile-settings-container">
              <div className="mobile-settings-header">
                <h2>Settings</h2>
                <button className="mobile-settings-close-btn" onClick={() => setShowSettings(false)}>
                  Close
                </button>
              </div>

              <div className="mobile-settings-body">
                {/* Presets and custom move configs */}
                <PresetsColumn
                  speed={speed}
                  setSpeed={setSpeed}
                  selectedPreset={selectedPreset}
                  onPresetChange={handlePresetChange}
                  currentMoves={currentMoves}
                  generationSettings={generationSettings}
                  onGenerationSettingsChange={(next) => setGenerationSettingsMap(prev => ({ ...prev, [selectedPreset]: next }))}
                  optionsFor={optionsFor}
                  handleChangeName={handleChangeName}
                  handleRemoveRow={handleRemoveRow}
                  handleAddRow={handleAddRow}
                  maxSlots={MAX_SLOTS}
                  displayMode={displayMode}
                  setDisplayMode={setDisplayMode}
                  useVoice={useVoice}
                  setUseVoice={setUseVoice}
                  customDisplayKeys={customDisplayKeys}
                  setCustomDisplayKeys={setCustomDisplayKeys}
                  onSettingsOpen={handlePause}
                />

              </div>
            </div>
          </div>
        )}

        <StreakGridModal
          isOpen={showStreakModal}
          onClose={() => setShowStreakModal(false)}
          activeDates={activeDates}
          streak={streak}
        />
      </div>
    );
  }

  // Desktop/Tablet default view
  return (
    <div className="app-container">
      {username && (
        <div style={{ position: 'absolute', top: '2.5rem', left: '2.5rem', zIndex: 100 }}>
          <button
            className="streak-header-btn"
            onClick={() => { handlePause(); setShowStreakModal(true); }}
            title="View practice streak"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="26" height="26">
              <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
            </svg>
          </button>
        </div>
      )}
      <div className="title-ghost">Ghost</div>
      <div className="title-mitts">Mitts</div>

      {/* LEFT: live display */}
      <LeftDisplay
        mode={mode}
        isTimerRunning={isTimerRunning}
        timeLeft={timeLeft}
        isCombosActive={isCombosActive}
        combosCompleted={combosCompleted}
        totalCombos={totalCombos}
        onTabClick={() => {}}
        totalPracticeSeconds={totalPracticeSeconds}
        totalPracticeCombos={totalPracticeCombos}
        currentCombo={currentCombo}
        isMobile={false}
        username={username}
        onStreakClick={() => { handlePause(); setShowStreakModal(true); }}
      />

      {/* RIGHT has two columns: controls & presets */}
      <div className="right-tab">

        {/*  Controls column  */}
        <ControlsColumn
          mode={mode}
          setMode={setMode}
          timeInputMin={timeInputMin}
          setTimeInputMin={setTimeInputMin}
          timeInputSec={timeInputSec}
          setTimeInputSec={setTimeInputSec}
          comboInput={comboInput}
          setComboInput={setComboInput}
          onStart={handleStart}
          onPause={handlePause}
          onReset={handleReset}
          isSessionActive={isSessionActive}
          hasStarted={hasStarted}
          username={username}
          authBusy={authBusy}
          apiConnected={apiConnected}
          onLogin={handleLogin}
          onRegister={handleRegister}
          onLogout={handleLogout}
          isMobile={false}
        />

        {/*  Presets column  */}
        <PresetsColumn
          speed={speed}
          setSpeed={setSpeed}
          selectedPreset={selectedPreset}
          onPresetChange={handlePresetChange}
          currentMoves={currentMoves}
          generationSettings={generationSettings}
          onGenerationSettingsChange={(next) => setGenerationSettingsMap(prev => ({ ...prev, [selectedPreset]: next }))}
          optionsFor={optionsFor}
          handleChangeName={handleChangeName}
          handleRemoveRow={handleRemoveRow}
          handleAddRow={handleAddRow}
          maxSlots={MAX_SLOTS}
          displayMode={displayMode}
          setDisplayMode={setDisplayMode}
          useVoice={useVoice}
          setUseVoice={setUseVoice}
          customDisplayKeys={customDisplayKeys}
          setCustomDisplayKeys={setCustomDisplayKeys}
          onSettingsOpen={handlePause}
        />

      </div>

      <StreakGridModal
        isOpen={showStreakModal}
        onClose={() => setShowStreakModal(false)}
        activeDates={activeDates}
        streak={streak}
      />
    </div>
  );
}

export default App;
