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
import type { Move, PresetKey, GenerationSettings } from "./types";
import { DEFAULT_PRESETS, MAX_SLOTS, movesForSlot } from "./utils/constants";
import { loadTotalSeconds, loadTotalCombos, saveTotalSeconds, saveTotalCombos, loadGenSettings, saveGenSettings } from "./utils/storage";
import { useAudioSequencer } from "./hooks/useAudioSequencer";
import { getMe, loginAccount, logoutAccount, registerAccount, upsertDailySession, upsertPreset } from "./utils/api";

const DEFAULT_GENERATION_SETTINGS: GenerationSettings = { min: 1, max: 20, bias: 0.65, lengthVariance: 1 };

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

export function App() {
  const [mode, setMode] = useState<"time" | "combos">("time");

  const [selectedPreset, setSelectedPreset] = useState<PresetKey>("Boxing");
  const [customMoves, setCustomMoves] = useState<Record<PresetKey, Move[]>>({
    Boxing:     [...DEFAULT_PRESETS.Boxing],
    Kickboxing: [...DEFAULT_PRESETS.Kickboxing],
    "Muay Thai": [...DEFAULT_PRESETS["Muay Thai"]],
  });

  const [timeInputMin, setTimeInputMin] = useState<string>("3");
  const [timeInputSec, setTimeInputSec] = useState<string>("0");
  const [comboInput, setComboInput]     = useState<string>("10");
  const [speed, setSpeed]               = useState<number>(3000);
  const [generationSettings, setGenerationSettings] = useState<GenerationSettings>(() => {
    const defaults: GenerationSettings = DEFAULT_GENERATION_SETTINGS;
    const saved = loadGenSettings();
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Partial<GenerationSettings>;
        if (parsed && typeof parsed === "object") {
          return {
            min: typeof parsed.min === "number" ? parsed.min : defaults.min,
            max: typeof parsed.max === "number" ? parsed.max : defaults.max,
            bias: typeof parsed.bias === "number" ? parsed.bias : defaults.bias,
            lengthVariance: typeof parsed.lengthVariance === "number" ? parsed.lengthVariance : defaults.lengthVariance,
          };
        }
      } catch {}
    }
    return defaults;
  });

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

  // Display options
  const [showFullName, setShowFullName] = useState<boolean>(false);
  const showFullNameRef = useRef<boolean>(false);
  useEffect(() => { showFullNameRef.current = showFullName; }, [showFullName]);

  const [useVoice, setUseVoice] = useState<boolean>(true);
  const useVoiceRef = useRef<boolean>(true);
  useEffect(() => { useVoiceRef.current = useVoice; }, [useVoice]);

  // Session totals from localStorage
  const [totalPracticeSeconds, setTotalPracticeSeconds] = useState<number>(() => loadTotalSeconds());
  const [totalPracticeCombos, setTotalPracticeCombos] = useState<number>(() => loadTotalCombos());

  // Refs for tab-close flush (avoid stale closures)
  const usernameRef = useRef<string | null>(null);
  const selectedPresetRef = useRef<PresetKey>(selectedPreset);
  const currentMovesRef = useRef<Move[]>(customMoves[selectedPreset]);
  const generationSettingsRef = useRef<GenerationSettings>(generationSettings);
  const totalPracticeSecondsRef = useRef<number>(totalPracticeSeconds);
  const totalPracticeCombosRef = useRef<number>(totalPracticeCombos);
  const flushedOnCloseRef = useRef<boolean>(false);

  useEffect(() => { usernameRef.current = username; }, [username]);
  useEffect(() => { selectedPresetRef.current = selectedPreset; }, [selectedPreset]);
  useEffect(() => { currentMovesRef.current = customMoves[selectedPreset]; }, [customMoves, selectedPreset]);
  useEffect(() => { generationSettingsRef.current = generationSettings; }, [generationSettings]);
  useEffect(() => { totalPracticeSecondsRef.current = totalPracticeSeconds; }, [totalPracticeSeconds]);
  useEffect(() => { totalPracticeCombosRef.current = totalPracticeCombos; }, [totalPracticeCombos]);

  // Persist whenever totals change
  useEffect(() => { saveTotalSeconds(totalPracticeSeconds); }, [totalPracticeSeconds]);
  useEffect(() => { saveTotalCombos(totalPracticeCombos);  }, [totalPracticeCombos]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const me = await getMe();
        if (mounted) setApiConnected(true);
        if (mounted && me.authenticated && me.username) {
          setUsername(me.username);
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

  useEffect(() => { timeLeftRef.current        = timeLeft;        }, [timeLeft]);
  useEffect(() => { combosCompletedRef.current  = combosCompleted; }, [combosCompleted]);
  useEffect(() => { totalCombosRef.current      = totalCombos;     }, [totalCombos]);

  // ── 1-second countdown (time mode) ───────────────────────────────────────
  useEffect(() => {
    if (isTimerRunning && timeLeft > 0) {
      timerRef.current = window.setTimeout(() => setTimeLeft(p => p - 1), 1000);
    } else if (timeLeft === 0 && isTimerRunning) {
      // Timer finished
      setIsTimerRunning(false);
      setTotalPracticeSeconds(p => p + currentTimerDuration.current);
      if (combosCompletedRef.current > 0) {
        setTotalPracticeCombos(p => p + combosCompletedRef.current);
      }
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [isTimerRunning, timeLeft]);

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
      }),
    [currentMoves, generationSettings]
  );

  // Build a display string from a combo (array of keys)
  const comboToString = useCallback((keys: number[]) =>
    keys
      .map(k => showFullNameRef.current
        ? (currentMoves.find(m => m.key === k)?.name ?? String(k))
        : String(k))
      .join(" · "),
    [currentMoves]
  );

  // ── audio sequencer & multi-processor ────────────────────────────────────
  const { playComboAudio, stopAudio } = useAudioSequencer({
    useVoiceRef,
    showFullNameRef,
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

  // ── combo emitter (fires at `speed` ms interval) ──────────────────────────
  useEffect(() => {
    const isSessionActive = mode === "time" ? isTimerRunning : isCombosActive;
    if (!isSessionActive) {
      // Clear queues and stop sound if paused
      comboQueueRef.current = [];
      stopAudio();
      return;
    }

    // Fire the FIRST combo immediately (t=0)
    const emitCombo = () => {
      if (mode === "time" && timeLeftRef.current <= 0) return;

      const limit = totalCombosRef.current;
      if (limit > 0 && combosCompletedRef.current >= limit) {
        if (mode === "combos") {
          setIsCombosActive(false);
          // Calculate final elapsed time
          const elapsed = Math.round((Date.now() - sessionStartMs.current) / 1000);
          setTotalPracticeSeconds(p => p + Math.max(0, elapsed));
          setTotalPracticeCombos(p => p + limit);
        }
        return;
      }

      // Pre-gen if low
      replenishQueue();
      const keys = comboQueueRef.current.shift();
      if (!keys) return;

      setCurrentCombo(comboToString(keys));
      // Stop any still-playing audio from the previous interval before starting the new one
      stopAudio();
      playComboAudio(keys, speed);

      setCombosCompleted(prev => {
        const next = prev + 1;
        combosCompletedRef.current = next;
        
        // If we hit the limit in Time mode, we finalize the combo total immediately
        if (mode === "time" && limit > 0 && next >= limit) {
          setTotalPracticeCombos(p => p + next);
        }
        
        return next;
      });
    };

    replenishQueue(); // prep before t=0
    emitCombo(); // t=0
    const interval = window.setInterval(emitCombo, speed);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, isTimerRunning, isCombosActive, speed, comboToString, playComboAudio, replenishQueue]);

  // ── preset mutations ──────────────────────────────────────────────────────
  const updatePreset = (moves: Move[]) =>
    setCustomMoves(prev => ({ ...prev, [selectedPreset]: moves }));

  // Persist generation settings whenever they change
  useEffect(() => {
    saveGenSettings(JSON.stringify(generationSettings));
  }, [generationSettings]);

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
    } finally {
      setAuthBusy(false);
    }
  }, []);

  const handleLogout = useCallback(async () => {
    setAuthBusy(true);
    try {
      await logoutAccount();
      setUsername(null);
      setApiConnected(true);
    } finally {
      setAuthBusy(false);
    }
  }, []);

  const flushCloudSavesOnClose = useCallback(() => {
    // Only flush once per page lifecycle.
    if (flushedOnCloseRef.current) return;
    flushedOnCloseRef.current = true;

    const uname = usernameRef.current;
    if (!uname) return; // must be logged in

    const seconds = totalPracticeSecondsRef.current;
    const combos = totalPracticeCombosRef.current;
    const preset = selectedPresetRef.current;
    const moves = currentMovesRef.current;
    const gen = generationSettingsRef.current;

    const totalsNonDefault = seconds > 0 || combos > 0;
    const genNonDefault = !isDefaultGenerationSettings(gen);
    const movesNonDefault = !areMovesEqual(moves, DEFAULT_PRESETS[preset]);

    // Only save if there is something meaningfully non-default.
    if (!totalsNonDefault && !genNonDefault && !movesNonDefault) return;

    const date = new Date().toISOString().split("T")[0]!;

    if (totalsNonDefault) {
      void upsertDailySession(
        { date, num_combos: combos, time_seconds: seconds },
        { keepalive: true }
      ).catch(() => {});
    }

    if (genNonDefault || movesNonDefault) {
      const rearKickNames = new Set([
        "REAR KICK", "REAR TEEP", "BODY KICK", "ROUNDHOUSE KICK", "LOW KICK", "HEAD KICK",
      ]);

      const frequencies = moves.map((move) => {
        let weight = Math.pow(gen.bias, move.key - 1);
        if (rearKickNames.has(move.name.toUpperCase())) {
          weight *= 1.8;
        }
        return { key: move.key, weight };
      });

      void upsertPreset(
        {
          preset_name: preset,
          preset_data: { moves, generationSettings: gen, frequencies },
        },
        { keepalive: true }
      ).catch(() => {});
    }
  }, []);

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
          setCurrentCombo("");
          setCombosCompleted(0);
          combosCompletedRef.current = 0;
          setTotalCombos(0);        // no combo cap in time mode unless user sets it
          totalCombosRef.current = 0;
          setTimeLeft(total);
          currentTimerDuration.current = total;
          setIsTimerRunning(true);
        }
      } else {
        setIsTimerRunning(true); // RESUME
      }
    } else {
      if (!hasStarted) {
        const count = parseInt(comboInput) || 0;
        if (count > 0) {
          setCurrentCombo("");
          setCombosCompleted(0);
          combosCompletedRef.current = 0;
          setTotalCombos(count);
          totalCombosRef.current = count;
          sessionStartMs.current = Date.now();
          setIsCombosActive(true);
        }
      } else if (!isCombosActive) {
        sessionStartMs.current = Date.now(); // RESUME
        setIsCombosActive(true);
      }
    }
  };

  const handlePause = () => {
    if (mode === "time") {
      setIsTimerRunning(false);
    } else if (isCombosActive) {
      setIsCombosActive(false);
      const elapsed = Math.round((Date.now() - sessionStartMs.current) / 1000);
      setTotalPracticeSeconds(p => p + Math.max(0, elapsed));
    }
  };

  const handleReset = () => {
    setIsTimerRunning(false);
    setIsCombosActive(false);
    setTimeLeft(0);
    setCombosCompleted(0);
    combosCompletedRef.current = 0;
    setTotalCombos(0);
    totalCombosRef.current = 0;
    setCurrentCombo("");
  };

  //  Render
  return (
    <div className="app-container">
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
        showFullName={showFullName}
        setShowFullName={setShowFullName}
        useVoice={useVoice}
        setUseVoice={setUseVoice}
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
        />

        {/*  Presets column  */}
        <PresetsColumn
          speed={speed}
          setSpeed={setSpeed}
          selectedPreset={selectedPreset}
          onPresetChange={handlePresetChange}
          currentMoves={currentMoves}
          generationSettings={generationSettings}
          onGenerationSettingsChange={setGenerationSettings}
          optionsFor={optionsFor}
          handleChangeName={handleChangeName}
          handleRemoveRow={handleRemoveRow}
          handleAddRow={handleAddRow}
          maxSlots={MAX_SLOTS}
        />

      </div>
    </div>
  );
}

export default App;
