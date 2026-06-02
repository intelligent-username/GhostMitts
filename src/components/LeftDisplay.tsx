interface LeftDisplayProps {
  mode: "time" | "combos";
  isTimerRunning: boolean;
  timeLeft: number;
  isCombosActive: boolean;
  combosCompleted: number;
  totalCombos: number;
  onTabClick: () => void;
  totalPracticeSeconds: number;
  totalPracticeCombos: number;
  currentCombo: string;
  isMobile?: boolean;
  username: string | null;
  onStreakClick: () => void;
  countdown: number | null;
}

export function LeftDisplay({
  mode,
  isTimerRunning,
  timeLeft,
  isCombosActive,
  combosCompleted,
  totalCombos,
  onTabClick,
  totalPracticeSeconds,
  totalPracticeCombos,
  currentCombo,
  isMobile = false,
  username,
  onStreakClick,
  countdown,
}: LeftDisplayProps) {
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const totalMins = totalPracticeSeconds > 0
    ? (totalPracticeSeconds / 60).toFixed(1).replace(/\.0$/, "")
    : "0";

  const renderContent = () => {
    if (countdown !== null) {
      return (
        <div className="display-wrapper countdown-wrapper">
          <div className={`countdown-number ${countdown === 0 ? "fight" : ""}`}>
            {countdown === 0 ? "FIGHT!" : countdown}
          </div>
          <div className="countdown-subtext">Get Ready...</div>
        </div>
      );
    }

    if (mode === "time") {
      if (!isTimerRunning && timeLeft === 0 && !currentCombo)
        return isMobile ? null : <div className="idle-text">Ready</div>;
      
      if (timeLeft === 0 && currentCombo) {
        return <div className="idle-text">{currentCombo}</div>;
      }

      return (
        <div className="display-wrapper">
          <div className="time-display">{formatTime(timeLeft)}</div>
          {currentCombo && (
            <div className="current-combo" aria-live="polite">{currentCombo}</div>
          )}
        </div>
      );
    }
    // combos mode
    if (!isCombosActive && totalCombos === 0 && !currentCombo)
      return isMobile ? null : <div className="idle-text">Ready</div>;

    if (totalCombos === 0 && currentCombo) {
      return <div className="idle-text">{currentCombo}</div>;
    }

    return (
      <div className="display-wrapper">
        <div className="combo-status">
          <div className="combo-small">{combosCompleted}/{totalCombos} completed</div>
          <div className="combo-large">
            {Math.max(0, totalCombos - combosCompleted)} remaining
          </div>
        </div>
        {currentCombo && (
          <div className="current-combo" aria-live="polite">{currentCombo}</div>
        )}
      </div>
    );
  };

  if (isMobile) {
    return (
      <div className="left-tab mobile-display-tab">
        {renderContent()}
      </div>
    );
  }

  return (
    <div className="left-tab" onClick={onTabClick}>
      {renderContent()}
 
      {/* Bottom bar container for title and totals */}
      <div className="left-bottom-bar" onClick={e => e.stopPropagation()}>
        <div className="practice-totals">
          {totalMins} min · {totalPracticeCombos} combos total
        </div>
      </div>
    </div>
  );
}
