import type { DisplayMode } from "../types";

interface DisplayAudioSectionProps {
  useVoice: boolean;
  setUseVoice: (val: boolean) => void;
  displayMode: DisplayMode;
  setDisplayMode: (mode: DisplayMode) => void;
}

export function DisplayAudioSection({
  useVoice,
  setUseVoice,
  displayMode,
  setDisplayMode,
}: DisplayAudioSectionProps) {
  return (
    <div className="customize-display-section">
      <h4 className="customize-section-title">Display & Audio</h4>
      <div className="customize-voice-row">
        <label className="customize-toggle-label">
          <input
            type="checkbox"
            checked={useVoice}
            onChange={e => setUseVoice(e.target.checked)}
          />
          <span>Use Voice</span>
        </label>
        <span className="customize-voice-hint">Announces punch / move names</span>
      </div>

      <div className="customize-display-mode-row">
        <span className="customize-mode-label">Display Mode:</span>
        <div className="customize-mode-buttons">
          <button
            type="button"
            className={`customize-mode-btn ${displayMode === "numbers" ? "active" : ""}`}
            onClick={() => setDisplayMode("numbers")}
          >
            Numbers
          </button>
          <button
            type="button"
            className={`customize-mode-btn ${displayMode === "fullname" ? "active" : ""}`}
            onClick={() => setDisplayMode("fullname")}
          >
            Names
          </button>
          <button
            type="button"
            className={`customize-mode-btn ${displayMode === "custom" ? "active" : ""}`}
            onClick={() => setDisplayMode("custom")}
          >
            Custom
          </button>
        </div>
      </div>
    </div>
  );
}
