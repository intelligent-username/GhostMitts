import { useState, useEffect, useRef, useCallback } from "react";
import "./css/base.css";
import "./css/layout.css";
import "./css/typography.css";
import "./css/components.css";
import "./css/display.css";
import { generateCombo, generateCombos } from "./scripts/combogenerator";
import { LeftDisplay } from "./components/LeftDisplay";
import { ControlsColumn } from "./components/ControlsColumn";
import { PresetsColumn } from "./components/PresetsColumn";
import type { Move, PresetKey } from "./types";

// Odd-numbered slots → front / lead moves
const FRONT_MOVES = [
  "JAB", "FRONT HOOK", "FRONT UPPERCUT",
  "OVERHAND LEFT",
  "LEAD KNEE",
  "FRONT KICK", "LEAD KICK", "LEAD TEEP", "TEEP", "CHECK KICK",
  "BLOCK", "PARRY LEFT", "SLIP LEFT",
];

// Even-numbered slots: rear moves
const REAR_MOVES = [
  "CROSS", "REAR HOOK", "REAR UPPERCUT",
  "OVERHAND RIGHT",
  "REAR KNEE",
  "REAR KICK", "BODY KICK", "ROUNDHOUSE KICK",
  "REAR TEEP", "LOW KICK", "HEAD KICK",
  "PARRY RIGHT", "SLIP RIGHT",
];

/** All moves for a given slot number (odd: front, even: rear) */
const movesForSlot = (key: number) => key % 2 === 1 ? FRONT_MOVES : REAR_MOVES;

//  Base 1-6 (locked across all presets) 
const BASE_PUNCHES: Move[] = [
  { key: 1, name: "JAB",            locked: true },
  { key: 2, name: "CROSS",          locked: true },
  { key: 3, name: "FRONT HOOK",     locked: true },
  { key: 4, name: "REAR HOOK",      locked: true },
  { key: 5, name: "FRONT UPPERCUT", locked: true },
  { key: 6, name: "REAR UPPERCUT",  locked: true },
];

// Max slots cap
const MAX_SLOTS = 16;

// Default preset lists — 7+ entries are editable
const DEFAULT_PRESETS: Record<PresetKey, Move[]> = {
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

export function App() {
  const [mode, setMode] = useState<"time" | "combos">("time");

  // — Preset selection & custom move state —
  const [selectedPreset, setSelectedPreset] = useState<PresetKey>("Boxing");
  const [customMoves, setCustomMoves] = useState<Record<PresetKey, Move[]>>({
    Boxing:     [...DEFAULT_PRESETS.Boxing],
    Kickboxing: [...DEFAULT_PRESETS.Kickboxing],
    "Muay Thai": [...DEFAULT_PRESETS["Muay Thai"]],
  });

  // — Settings —
  const [timeInputMin, setTimeInputMin] = useState<string>("3");
  const [timeInputSec, setTimeInputSec] = useState<string>("0");
  const [comboInput, setComboInput] = useState<string>("10");
  const [speed, setSpeed] = useState<number>(1000); // ms

  // — Timer / combo state —
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isCombosActive, setIsCombosActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [combosCompleted, setCombosCompleted] = useState<number>(0);
  const [totalCombos, setTotalCombos] = useState<number>(0);

  // — Session Totals —
  const [totalPracticeSeconds, setTotalPracticeSeconds] = useState<number>(0);
  const [totalPracticeCombos, setTotalPracticeCombos] = useState<number>(0);
  const [currentTimerDuration, setCurrentTimerDuration] = useState<number>(0);

  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (isTimerRunning && timeLeft > 0) {
      timerRef.current = window.setTimeout(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isTimerRunning) {
      setIsTimerRunning(false);
      setTotalPracticeSeconds(prev => prev + currentTimerDuration);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [isTimerRunning, timeLeft]);

  //  Helpers 
  const currentMoves = customMoves[selectedPreset];

  /** Names already used in this preset (to prevent duplicates) */
  const usedNames = new Set(currentMoves.map(m => m.name));

  /** Options for a given slot: parity-filtered, minus already-used (except the slot's own) */
  const optionsFor = (key: number, slotName: string) =>
    movesForSlot(key).filter(m => m === slotName || !usedNames.has(m));

  const getCombo = useCallback(
    (len?: { min: number; max: number }) =>
      generateCombo({ moves: currentMoves, length: len, bias: 0.65 }),
    [currentMoves]
  );

  const getCombos = useCallback(
    (count: number, len?: { min: number; max: number }) =>
      generateCombos(count, { moves: currentMoves, length: len, bias: 0.65 }),
    [currentMoves]
  );

  const updatePreset = (moves: Move[]) =>
    setCustomMoves(prev => ({ ...prev, [selectedPreset]: moves }));

  const handleAddRow = () => {
    if (currentMoves.length >= MAX_SLOTS) return;
    const nextKey = currentMoves.length + 1;
    const pool = movesForSlot(nextKey);
    // First available parity-correct move not already in use
    const defaultName: string = pool.find(m => !usedNames.has(m)) ?? pool[0]!;
    updatePreset([...currentMoves, { key: nextKey, name: defaultName, locked: false }]);
  };

  const handleRemoveRow = (key: number) => {
    const filtered = currentMoves.filter(m => m.key !== key);
    // Re-index keys after removal
    const reindexed = filtered.map((m, i) => ({ ...m, key: i + 1 }));
    updatePreset(reindexed);
  };

  const handleChangeName = (key: number, newName: string) => {
    updatePreset(currentMoves.map(m => m.key === key ? { ...m, name: newName } : m));
  };

  const handlePresetChange = (p: PresetKey) => {
    setSelectedPreset(p);
  };

  //  Timer / combo logic 
  const handleStart = () => {
    if (mode === "time") {
      if (timeLeft === 0) {
        const minutes = parseInt(timeInputMin) || 0;
        const seconds = parseInt(timeInputSec) || 0;
        const total = minutes * 60 + seconds;
        if (total > 0) {
          setTimeLeft(total);
          setCurrentTimerDuration(total);
        }
      }
      setIsTimerRunning(true);
    } else {
      if (!isCombosActive) {
        const combos = parseInt(comboInput) || 0;
        if (combos > 0) {
          setTotalCombos(combos);
          setCombosCompleted(0);
          setIsCombosActive(true);
        }
      }
    }
  };

  const handlePause = () => setIsTimerRunning(false);

  const handleReset = () => {
    if (mode === "time") {
      setIsTimerRunning(false);
      setTimeLeft(0);
    } else {
      setIsCombosActive(false);
      setCombosCompleted(0);
      setTotalCombos(0);
    }
  };

  const handleLeftTabClick = () => {
    if (mode === "combos" && isCombosActive && combosCompleted < totalCombos) {
      const nextCompleted = combosCompleted + 1;
      setCombosCompleted(nextCompleted);
      if (nextCompleted === totalCombos) {
        setTotalPracticeCombos(prev => prev + totalCombos);
      }
    }
  };

  //  Render 
  return (
    <div className="app-container">
      <div className="title-ghost">Ghost</div>
      <div className="title-mitts">Mitts</div>

      {/* LEFT — live display */}
      <LeftDisplay
        mode={mode}
        isTimerRunning={isTimerRunning}
        timeLeft={timeLeft}
        isCombosActive={isCombosActive}
        combosCompleted={combosCompleted}
        totalCombos={totalCombos}
        onTabClick={handleLeftTabClick}
        totalPracticeSeconds={totalPracticeSeconds}
        totalPracticeCombos={totalPracticeCombos}
      />

      {/* RIGHT — two-column: controls + presets */}
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
