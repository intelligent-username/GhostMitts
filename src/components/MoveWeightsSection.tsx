import type { Move, GenerationSettings, DisplayMode } from "../types";

interface MoveWeightsSectionProps {
  currentMoves: Move[];
  safeValue: GenerationSettings;
  updateSettings: (partial: Partial<GenerationSettings>) => void;
  displayMode: DisplayMode;
  customDisplayKeys: Set<number>;
  setCustomDisplayKeys: (keys: Set<number>) => void;
}

export function MoveWeightsSection({
  currentMoves,
  safeValue,
  updateSettings,
  displayMode,
  customDisplayKeys,
  setCustomDisplayKeys,
}: MoveWeightsSectionProps) {
  const handleWeightChange = (key: number, rawVal: string) => {
    const val = parseFloat(rawVal);
    const nextWeights = { ...(safeValue.weights || {}) };
    if (isNaN(val) || val <= 0) {
      delete nextWeights[key];
    } else {
      nextWeights[key] = Math.round(Math.max(0.01, Math.min(100.0, val)) * 100) / 100;
    }
    updateSettings({ weights: Object.keys(nextWeights).length > 0 ? nextWeights : undefined });
  };

  const toggleCustomDisplay = (key: number) => {
    const next = new Set(customDisplayKeys);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    setCustomDisplayKeys(next);
  };

  return (
    <div className="customize-moves-section">
      <h4 className="customize-section-title">Move Weights & Display</h4>
      <div className="customize-moves-table-container">
        <table className="customize-moves-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Move</th>
              <th>Weight Multiplier</th>
              {displayMode === "custom" && <th>Show Name</th>}
            </tr>
          </thead>
          <tbody>
            {currentMoves.map(move => {
              const rawWeight = safeValue.weights?.[move.key] ?? 1.0;
              const weightVal = Math.round(rawWeight * 100) / 100;
              return (
                <tr key={move.key}>
                  <td className="move-key-cell">{move.key}</td>
                  <td className="move-name-cell">{move.name || `Move ${move.key}`}</td>
                  <td className="move-weight-cell">
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max="10"
                      value={weightVal}
                      onChange={e => handleWeightChange(move.key, e.target.value)}
                      className="customize-weight-input"
                    />
                  </td>
                  {displayMode === "custom" && (
                    <td className="move-custom-display-cell">
                      <input
                        type="checkbox"
                        checked={customDisplayKeys.has(move.key)}
                        onChange={() => toggleCustomDisplay(move.key)}
                      />
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
