import { useState, useEffect, useRef, useCallback } from "react";
import "./css/base.css";
import "./css/layout.css";
import "./css/typography.css";
import "./css/controls.css";
import "./css/presets.css";
import "./css/toggles.css";
import "./css/display.css";
import { generateCombo } from "./scripts/combogenerator";
import { LeftDisplay } from "./components/LeftDisplay";
import { ControlsColumn } from "./components/ControlsColumn";
import { PresetsColumn } from "./components/PresetsColumn";
import type { Move, PresetKey } from "./types";
import { DEFAULT_PRESETS, MAX_SLOTS, NUMBER_WORDS, movesForSlot } from "./utils/constants";
import { loadTotalSeconds, loadTotalCombos, saveTotalSeconds, saveTotalCombos } from "./utils/storage";

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
  const [speed, setSpeed]               = useState<number>(1000);

  // Timer / combo run state
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isCombosActive, setIsCombosActive] = useState(false);
  const [timeLeft, setTimeLeft]             = useState<number>(0);
  const [combosCompleted, setCombosCompleted] = useState<number>(0);
  const [totalCombos, setTotalCombos]         = useState<number>(0);
  const [currentCombo, setCurrentCombo]       = useState<string>("");

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

  // Persist whenever totals change
  useEffect(() => { saveTotalSeconds(totalPracticeSeconds); }, [totalPracticeSeconds]);
  useEffect(() => { saveTotalCombos(totalPracticeCombos);  }, [totalPracticeCombos]);

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
      generateCombo({ moves: currentMoves, length: len, bias: 0.65 }),
    [currentMoves]
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
  
  // We maintain a pre-generated queue of combos
  const comboQueueRef = useRef<number[][]>([]);
  // We also keep track of the currently running audio context if we speed it up
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  // Fill up the queue so it is always 10 combos deep ahead of time
  const replenishQueue = useCallback(() => {
    while (comboQueueRef.current.length < 10) {
      const keys = getCombo();
      if (keys.length > 0) comboQueueRef.current.push(keys);
    }
  }, [getCombo]);

  const playComboAudio = useCallback((keys: number[], timeAllowedMs: number) => {
    if (!useVoiceRef.current) return;

    // Fast playback requires sequential rapid firing or native Web Audio API. 
    // Here we use overlapping rapid sequential HTML5 audio with pitch/speed correction.
    
    // We aim to finish playing all moves in AT MOST a fraction of speed.
    // e.g., speed / keys.length is the max time per move.
    const maxTimePerMove = (timeAllowedMs * 0.70) / keys.length; 
    // Calculate a playback rate that heavily compresses the clips (e.g. 1.5x up to 3.0x speed)
    // Most voicegen tracks are ~0.8s long
    const idealPlaybackRate = Math.max(1.2, Math.min(3.0, 800 / maxTimePerMove));

    const audioQueue = keys.map(k => {
      const fileKey = String(k).padStart(2, '0');
      if (showFullNameRef.current) {
        const moveName = currentMoves.find(m => m.key === k)?.name ?? String(k);
        const formattedName = moveName.replace(/ /g, "_").toUpperCase();
        return `/voicegen/en-US-GuyNeural/n${fileKey}_${formattedName}.mp3`;
      } else {
        const numberWord = NUMBER_WORDS[k] ?? String(k);
        return `/voicegen/en-US-GuyNeural/n${fileKey}_${numberWord}.mp3`;
      }
    });

    const playNext = (index: number) => {
      if (index >= audioQueue.length) return;
      
      const audio = new Audio(audioQueue[index]);
      activeAudioRef.current = audio;
      
      // Force it to play much faster so the whole sequence fits the speed allocation
      audio.playbackRate = idealPlaybackRate;
      audio.preservesPitch = true; // supported in modern chromium/safari

      audio.onended = () => playNext(index + 1);
      audio.play().catch(() => {});
    };

    playNext(0);
  }, [currentMoves]);

  // ── combo emitter (fires at `speed` ms interval) ──────────────────────────
  useEffect(() => {
    const isSessionActive = mode === "time" ? isTimerRunning : isCombosActive;
    if (!isSessionActive) {
      // Clear queues and stop sound if paused
      comboQueueRef.current = [];
      if (activeAudioRef.current) activeAudioRef.current.pause();
      return;
    }

    // Fire the FIRST combo immediately (t=0)
    const emitCombo = () => {
      if (mode === "time" && timeLeftRef.current <= 0) return;

      const limit = totalCombosRef.current;
      if (limit > 0 && combosCompletedRef.current >= limit) {
        if (mode === "combos") {
          setIsCombosActive(false);
          const elapsed = Math.round((Date.now() - sessionStartMs.current) / 1000);
          setTotalPracticeSeconds(p => p + elapsed);
          setTotalPracticeCombos(p => p + limit);
        }
        return;
      }

      // Pre-gen if low
      replenishQueue();
      const keys = comboQueueRef.current.shift();
      if (!keys) return;

      setCurrentCombo(comboToString(keys));
      // Hand control to the audio multicaster
      playComboAudio(keys, speed);

      setCombosCompleted(prev => {
        const next = prev + 1;
        combosCompletedRef.current = next;
        if (limit > 0 && next >= limit) {
          if (mode === "time") {
            setTotalPracticeCombos(p => p + next);
          } else {
            setIsCombosActive(false);
            const elapsed = Math.round((Date.now() - sessionStartMs.current) / 1000);
            setTotalPracticeSeconds(p => p + elapsed);
            setTotalPracticeCombos(p => p + limit);
          }
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
        />

        {/*  Presets column  */}
        <PresetsColumn
          speed={speed}
          setSpeed={setSpeed}
          selectedPreset={selectedPreset}
          onPresetChange={handlePresetChange}
          currentMoves={currentMoves}
          optionsFor={optionsFor}
          handleChangeName={handleChangeName}
          handleRemoveRow={handleRemoveRow}
          handleAddRow={handleAddRow}
          maxSlots={MAX_SLOTS}
        />

      </div>

      <div className="account-prompt">
        Create an account to save presets and practice sessions
      </div>
    </div>
  );
}

export default App;
