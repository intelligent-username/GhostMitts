import type { Move, PresetKey } from "../types";

interface PresetsColumnProps {
  speed: number;
  setSpeed: (speed: number) => void;
  selectedPreset: PresetKey;
  onPresetChange: (p: PresetKey) => void;
  currentMoves: Move[];
  optionsFor: (key: number, slotName: string) => string[];
  handleChangeName: (key: number, newName: string) => void;
  handleRemoveRow: (key: number) => void;
  handleAddRow: () => void;
  maxSlots: number;
}

export function PresetsColumn({
  speed,
  setSpeed,
  selectedPreset,
  onPresetChange,
  currentMoves,
  optionsFor,
  handleChangeName,
  handleRemoveRow,
  handleAddRow,
  maxSlots,
}: PresetsColumnProps) {
  return (
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
                if (speed < 500) setSpeed(500);
                if (speed > 15000) setSpeed(15000);
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
          min="500"
          max="15000"
          step="100"
          value={speed}
          onChange={(e) => setSpeed(Number(e.target.value))}
        />
      </div>

      <div className="presets-header">
        <span className="presets-label">PRESETS</span>
        <div className="preset-selector-wrapper">
          <select
            className="preset-dropdown"
            value={selectedPreset}
            onChange={(e) => onPresetChange(e.target.value as PresetKey)}
          >
            {(["Boxing", "Kickboxing", "Muay Thai"] as PresetKey[]).map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>
      </div>

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

        {currentMoves.length < maxSlots && (
          <button className="punch-add-btn" onClick={handleAddRow}>
            <span className="punch-add-icon">+</span>
            <span className="punch-add-label">Add move</span>
            <span className="punch-add-cap">{currentMoves.length}/{maxSlots}</span>
          </button>
        )}
        {currentMoves.length >= maxSlots && (
          <div className="punch-cap-notice">{maxSlots}/{maxSlots} ——— at max</div>
        )}
      </div>
    </div>
  );
}
