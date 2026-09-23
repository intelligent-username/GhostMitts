import type { ComponentProps } from "react";
import { LeftDisplay } from "./LeftDisplay";
import { ControlsColumn } from "./ControlsColumn";
import { PresetsColumn } from "./PresetsColumn";

interface DesktopLayoutProps {
  leftDisplayProps: ComponentProps<typeof LeftDisplay>;
  controlsProps: ComponentProps<typeof ControlsColumn>;
  presetsProps: ComponentProps<typeof PresetsColumn>;
  streak: number;
  onOpenStreakModal: () => void;
}

export function DesktopLayout({
  leftDisplayProps,
  controlsProps,
  presetsProps,
  streak,
  onOpenStreakModal,
}: DesktopLayoutProps) {
  return (
    <div className="app-container">
      <div style={{ position: "absolute", top: "2.5rem", left: "2.5rem", zIndex: 100 }}>
        <button
          className="streak-header-btn"
          onClick={onOpenStreakModal}
          type="button"
          title="View practice streak"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            width="26"
            height="26"
          >
            <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
          </svg>
          {streak > 0 && <span style={{ fontWeight: "bold", marginLeft: "6px", fontSize: "1.1rem" }}>{streak}</span>}
        </button>
      </div>

      <div className="title-ghost">Ghost</div>
      <div className="title-mitts">Mitts</div>

      <LeftDisplay {...leftDisplayProps} isMobile={false} />

      <div className="right-tab">
        <ControlsColumn {...controlsProps} />
        <PresetsColumn {...presetsProps} />
      </div>
    </div>
  );
}
