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
}: LeftDisplayProps) {
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const renderTotals = () => (
    <div className="practice-totals">
      Total so far: {(totalPracticeSeconds / 60).toFixed(1).replace(/\.0$/, "")} minutes and {totalPracticeCombos} combos
    </div>
  );

  const renderContent = () => {
    if (mode === "time") {
      if (!isTimerRunning && timeLeft === 0) return <div className="idle-text">Ready</div>;
      return (
        <div className="display-wrapper">
          {renderTotals()}
          <div className="time-display">{formatTime(timeLeft)}</div>
        </div>
      );
    }
    if (!isCombosActive) return <div className="idle-text">Ready</div>;
    return (
      <div className="display-wrapper">
        {renderTotals()}
        <div className="combo-status">
          <div className="combo-small">{combosCompleted}/{totalCombos} completed</div>
          {!isTimerRunning && (
            <div className="combo-large">
              {Math.max(0, totalCombos - combosCompleted)} remaining
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="left-tab" onClick={onTabClick}>
      {renderContent()}
      <div className="look-straight">LOOK STRAIGHT AHEAD!</div>
    </div>
  );
}
