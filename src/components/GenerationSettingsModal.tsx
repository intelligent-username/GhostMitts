import { useMemo, useState } from "react";
import type { GenerationSettings, DisplayMode, Move } from "../types";
import {
  clampSettings,
  computeKeyDistribution,
  computeLengthDistribution,
} from "../utils/generationMath";
import { KeyProbabilityChart } from "./KeyProbabilityChart";
import { LengthProbabilityChart } from "./LengthProbabilityChart";
import { DisplayAudioSection } from "./DisplayAudioSection";
import { MoveWeightsSection } from "./MoveWeightsSection";

interface GenerationSettingsModalProps {
  currentMovesCount: number;
  value: GenerationSettings;
  onChange: (next: GenerationSettings) => void;
  displayMode: DisplayMode;
  setDisplayMode: (mode: DisplayMode) => void;
  useVoice: boolean;
  setUseVoice: (val: boolean) => void;
  currentMoves: Move[];
  customDisplayKeys: Set<number>;
  setCustomDisplayKeys: (keys: Set<number>) => void;
  onOpen?: () => void;
}

export function GenerationSettingsModal({
  currentMovesCount,
  value,
  onChange,
  displayMode,
  setDisplayMode,
  useVoice,
  setUseVoice,
  currentMoves,
  customDisplayKeys,
  setCustomDisplayKeys,
  onOpen,
}: GenerationSettingsModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  const safeValue = useMemo(() => clampSettings(value), [value]);

  const updateSettings = (partial: Partial<GenerationSettings>) => {
    const next = clampSettings({ ...safeValue, ...partial });
    onChange(next);
  };

  const keyDistribution = useMemo(
    () => computeKeyDistribution(currentMovesCount, safeValue.bias, safeValue.weights),
    [currentMovesCount, safeValue.bias, safeValue.weights]
  );

  const lengthDistribution = useMemo(
    () => computeLengthDistribution(safeValue.min, safeValue.max, safeValue.lengthVariance),
    [safeValue.min, safeValue.max, safeValue.lengthVariance]
  );

  const handleResetWeights = () => {
    updateSettings({ weights: undefined, bias: 0.8, lengthVariance: 1.0 });
  };

  return (
    <>
      <button
        className="generation-settings-toggle"
        onClick={() => {
          setIsOpen(true);
          onOpen?.();
        }}
        type="button"
      >
        Customize
      </button>

      {isOpen && (
        <div className="generation-modal-backdrop" onClick={() => setIsOpen(false)}>
          <div className="generation-modal" onClick={e => e.stopPropagation()}>
            <div className="generation-modal-header">
              <h3 className="generation-modal-title">Customization</h3>
              <button
                className="generation-modal-close"
                onClick={() => setIsOpen(false)}
                type="button"
                aria-label="Close customization"
              >
                ×
              </button>
            </div>

            <div className="generation-modal-body">
              <DisplayAudioSection
                useVoice={useVoice}
                setUseVoice={setUseVoice}
                displayMode={displayMode}
                setDisplayMode={setDisplayMode}
              />

              <div className="customize-general-section">
                <h4 className="customize-section-title">Combo Length</h4>
                <div className="customize-length-row">
                  <label className="customize-field-label">
                    <span>Min Moves</span>
                    <input
                      type="number"
                      min={1}
                      max={safeValue.max}
                      value={safeValue.min}
                      onChange={e => updateSettings({ min: parseInt(e.target.value, 10) || 1 })}
                      className="customize-number-input"
                    />
                  </label>
                  <label className="customize-field-label">
                    <span>Max Moves</span>
                    <input
                      type="number"
                      min={safeValue.min}
                      max={20}
                      value={safeValue.max}
                      onChange={e => updateSettings({ max: parseInt(e.target.value, 10) || 20 })}
                      className="customize-number-input"
                    />
                  </label>
                </div>
              </div>

              <LengthProbabilityChart
                lengthDistribution={lengthDistribution}
                safeValue={safeValue}
                updateSettings={updateSettings}
              />

              <div className="customize-bias-section">
                <div className="customize-bias-header">
                  <h4 className="customize-section-title">Geometric Decay Bias</h4>
                  <span className="customize-bias-val">{safeValue.bias.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.30"
                  max="0.95"
                  step="0.01"
                  value={safeValue.bias}
                  onChange={e => updateSettings({ bias: parseFloat(e.target.value) })}
                  className="customize-range"
                />
              </div>

              <KeyProbabilityChart
                keyDistribution={keyDistribution}
                safeValue={safeValue}
                updateSettings={updateSettings}
              />

              <MoveWeightsSection
                currentMoves={currentMoves}
                safeValue={safeValue}
                updateSettings={updateSettings}
                displayMode={displayMode}
                customDisplayKeys={customDisplayKeys}
                setCustomDisplayKeys={setCustomDisplayKeys}
              />

              <div className="customize-footer-actions">
                <button
                  type="button"
                  className="customize-reset-btn"
                  onClick={handleResetWeights}
                >
                  Reset to Defaults
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
