import { useState, useEffect, useRef } from "react";
import "./css/base.css";
import "./css/layout.css";
import "./css/typography.css";
import "./css/components.css";
import "./css/display.css";

// Odd-numbered slots → front / lead moves
const FRONT_MOVES = [
  "JAB", "FRONT HOOK", "FRONT UPPERCUT",
  "OVERHAND LEFT",
  "LEAD KNEE",
  "FRONT KICK", "LEAD KICK", "LEAD TEEP", "TEEP", "CHECK KICK",
  "BLOCK", "PARRY LEFT", "SLIP LEFT",
];

// Even-numbered slots → rear moves
const REAR_MOVES = [
  "CROSS", "REAR HOOK", "REAR UPPERCUT",
  "OVERHAND RIGHT",
  "REAR KNEE",
  "REAR KICK", "BODY KICK", "ROUNDHOUSE KICK",
  "REAR TEEP", "LOW KICK", "HEAD KICK",
  "PARRY RIGHT", "SLIP RIGHT",
];

/** All moves for a given slot number (odd → front, even → rear) */
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

type Move = { key: number; name: string; locked: boolean };
type PresetKey = "Boxing" | "Kickboxing" | "Muay Thai";

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

  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (isTimerRunning && timeLeft > 0) {
      timerRef.current = window.setTimeout(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isTimerRunning) {
      setIsTimerRunning(false);
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
        if (minutes > 0 || seconds > 0) setTimeLeft(minutes * 60 + seconds);
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
      setCombosCompleted(prev => prev + 1);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const renderLeft = () => {
    if (mode === "time") {
      if (!isTimerRunning && timeLeft === 0) return <div className="idle-text">Ready</div>;
      return <div className="time-display">{formatTime(timeLeft)}</div>;
    }
    if (!isCombosActive) return <div className="idle-text">Ready</div>;
    return (
      <div className="combo-status">
        <div className="combo-small">{combosCompleted}/{totalCombos} completed</div>
        {!isTimerRunning && (
          <div className="combo-large">
            {Math.max(0, totalCombos - combosCompleted)} remaining
          </div>
        )}
      </div>
    );
  };

  //  Render 
  return (
    <div className="app-container">
      <div className="title-ghost">Ghost</div>
      <div className="title-mitts">Mitts</div>

      {/* LEFT — live display */}
      <div className="left-tab" onClick={handleLeftTabClick}>
        {renderLeft()}
        <div className="look-straight">LOOK STRAIGHT AHEAD!</div>
      </div>

      {/* RIGHT — two-column: controls + presets */}
      <div className="right-tab">

        {/*  Controls column  */}
        <div className="controls-col">
          <div className="toggle-container">
            <button
              className={`toggle-btn ${mode === "time" ? "active" : ""}`}
              onClick={() => setMode("time")}
            >
              Time
            </button>
            <button
              className={`toggle-btn ${mode === "combos" ? "active" : ""}`}
              onClick={() => setMode("combos")}
            >
              Combos
            </button>
          </div>

          <div className="controls">
            {mode === "time" ? (
              <div className="time-inputs">
                <div className="input-group">
                  <span className="input-label">Min</span>
                  <input
                    type="number"
                    className="styled-input"
                    value={timeInputMin}
                    onChange={e => setTimeInputMin(e.target.value)}
                    min="0"
                  />
                </div>
                <div className="input-group">
                  <span className="input-label">Sec</span>
                  <input
                    type="number"
                    className="styled-input"
                    value={timeInputSec}
                    onChange={e => setTimeInputSec(e.target.value)}
                    min="0"
                    max="59"
                  />
                </div>
              </div>
            ) : (
              <div className="input-group">
                <span className="input-label">Combos</span>
                <input
                  type="number"
                  className="styled-input"
                  value={comboInput}
                  onChange={e => setComboInput(e.target.value)}
                  min="1"
                />
              </div>
            )}

            <div className="button-group">
              <button className="start-btn" onClick={handleStart}>START</button>
              <button className="reset-btn" onClick={handleReset}>RESET</button>
              {mode === "time" && (
                <button className="pause-btn" onClick={handlePause}>PAUSE</button>
              )}
            </div>
          </div>
        </div>

        {/*  Presets column  */}
        <div className="presets-col">
          <div className="speed-container">
            <div className="speed-header">
              <span className="speed-label">Speed</span>
              <div className="speed-interactive">
                <input
                  type="text"
                  className="speed-input-text"
                  value={speed < 1000 ? Math.round(speed) : (speed / 1000).toFixed(1)}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === '' || /^[0-9.]*$/.test(raw)) {
                      const val = parseFloat(raw);
                      if (!isNaN(val)) {
                        if (val >= 10) {
                          setSpeed(Math.min(5000, val));
                        } else {
                          setSpeed(Math.min(5, val) * 1000);
                        }
                      }
                    }
                  }}
                  onBlur={() => {
                    if (speed < 200) setSpeed(200);
                    if (speed > 5000) setSpeed(5000);
                  }}
                />
                <span className="speed-value">
                  {speed < 1000 ? 'ms' : 's'}
                </span>
              </div>
            </div>
            <input
              type="range"
              className="speed-slider"
              min="200"
              max="5000"
              step="100"
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
            />
          </div>

          {/*  Presets header with style selector  */}
          <div className="presets-header">
            <span className="presets-label">PRESETS</span>
            <div className="preset-selector-wrapper">
              <select
                className="preset-dropdown"
                value={selectedPreset}
                onChange={(e) => handlePresetChange(e.target.value as PresetKey)}
              >
                {(["Boxing", "Kickboxing", "Muay Thai"] as PresetKey[]).map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
          </div>

          {/*  Move list  */}
          <div className="punch-list">
            {currentMoves.map(m => (
              <div className={`punch-row ${m.locked ? "punch-row--locked" : ""}`} key={m.key}>
                <span className="punch-num">{m.key}</span>
                <div className="punch-info">
                  {m.locked ? (
                    <span className="punch-name">{m.name}</span>
                  ) : (
                    <select
                      className="punch-name-select"
                      value={m.name}
                      onChange={e => handleChangeName(m.key, e.target.value)}
                    >
                      {optionsFor(m.key, m.name).map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  )}
                </div>
                {!m.locked && (
                  <button
                    className="punch-remove-btn"
                    onClick={() => handleRemoveRow(m.key)}
                    title="Remove"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}

            {/*  Add row button (hidden when at cap)  */}
            {currentMoves.length < MAX_SLOTS && (
              <button className="punch-add-btn" onClick={handleAddRow}>
                <span className="punch-add-icon">+</span>
                <span className="punch-add-label">Add move</span>
                <span className="punch-add-cap">{currentMoves.length}/{MAX_SLOTS}</span>
              </button>
            )}
            {currentMoves.length >= MAX_SLOTS && (
              <div className="punch-cap-notice">{MAX_SLOTS}/{MAX_SLOTS} — at max</div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

export default App;
