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
  showFullName: boolean;
  setShowFullName: (val: boolean) => void;
  useVoice: boolean;
  setUseVoice: (val: boolean) => void;
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
  showFullName,
  setShowFullName,
  useVoice,
  setUseVoice,
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
    if (mode === "time") {
      if (!isTimerRunning && timeLeft === 0)
        return <div className="idle-text">Ready</div>;
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
    if (!isCombosActive)
      return <div className="idle-text">Ready</div>;
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

  return (
    <div className="left-tab" onClick={onTabClick}>
      {renderContent()}

      {/* Bottom bar container for toggles, title, and totals */}
      <div className="left-bottom-bar" onClick={e => e.stopPropagation()}>
        <div className="bottom-toggles">
          <label className="fullname-toggle">
            <input
              type="checkbox"
              id="show-full-name"
              checked={showFullName}
              onChange={e => setShowFullName(e.target.checked)}
            />
            <span className="fullname-toggle-label">Display full name?</span>
          </label>
          <label className="fullname-toggle">
            <input
              type="checkbox"
              id="use-voice"
              checked={useVoice}
              onChange={e => setUseVoice(e.target.checked)}
            />
            <span className="fullname-toggle-label">Use Voice?</span>
          </label>
        </div>

        <div className="look-straight">LOOK STRAIGHT AHEAD!</div>

        <div className="practice-totals">
          {totalMins} min · {totalPracticeCombos} combos total
        </div>
      </div>
    </div>
  );
}
