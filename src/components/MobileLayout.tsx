import type { ComponentProps } from "react";
import { LeftDisplay } from "./LeftDisplay";
import { ControlsColumn } from "./ControlsColumn";
import { PresetsColumn } from "./PresetsColumn";
import { formatMinutes } from "../utils/constants";

interface MobileLayoutProps {
  leftDisplayProps: ComponentProps<typeof LeftDisplay>;
  controlsProps: ComponentProps<typeof ControlsColumn>;
  presetsProps: ComponentProps<typeof PresetsColumn>;
  showSettings: boolean;
  setShowSettings: (show: boolean) => void;
  streak: number;
  onOpenStreakModal: () => void;
  totalPracticeSeconds: number;
  totalPracticeCombos: number;
}

export const SettingsIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

export function MobileLayout({
  leftDisplayProps,
  controlsProps,
  presetsProps,
  showSettings,
  setShowSettings,
  streak,
  onOpenStreakModal,
  totalPracticeSeconds,
  totalPracticeCombos,
}: MobileLayoutProps) {
  return (
    <div className="mobile-container">
      <div className="mobile-header">
        <h1 className="ghost-mitts-title-h1">GHOST MITTS</h1>
        <div style={{ display: "flex", gap: "0.8rem", alignItems: "center" }}>
          <button
            className="streak-header-btn"
            onClick={onOpenStreakModal}
            type="button"
            title="View streak"
          >
            <span className="streak-fire-icon">🔥</span>
            {streak > 0 && <span style={{ fontWeight: "bold", marginLeft: "4px" }}>{streak}</span>}
          </button>
          <button
            className="settings-toggle-btn"
            onClick={() => setShowSettings(true)}
            type="button"
            aria-label="Open Settings"
          >
            <SettingsIcon />
          </button>
        </div>
      </div>

      <div className="mobile-display-tab" onClick={leftDisplayProps.onClick}>
        <LeftDisplay {...leftDisplayProps} isMobile={true} />
      </div>

      <ControlsColumn {...controlsProps} />

      <div className="mobile-totals-footer">
        {formatMinutes(totalPracticeSeconds)} min · {totalPracticeCombos} combos total
      </div>

      {showSettings && (
        <div className="mobile-settings-overlay" onClick={() => setShowSettings(false)}>
          <div className="mobile-settings-container" onClick={e => e.stopPropagation()}>
            <div className="mobile-settings-header">
              <h2>Settings & Presets</h2>
              <button
                className="mobile-settings-close-btn"
                onClick={() => setShowSettings(false)}
                type="button"
              >
                Done
              </button>
            </div>
            <div className="mobile-settings-body">
              <PresetsColumn {...presetsProps} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
