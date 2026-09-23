import { formatMinutes } from "../utils/constants";

interface LeftDisplayProps {
  mode: "time" | "combos";
  isTimerRunning: boolean;
  timeLeft: number;
  isCombosActive: boolean;
  combosCompleted: number;
  totalCombos: number;
  totalPracticeSeconds: number;
  totalPracticeCombos: number;
  currentCombo: string;
  isMobile?: boolean;
  countdown: number | null;
  onClick?: () => void;
}

export function LeftDisplay({
  mode,
  isTimerRunning,
  timeLeft,
  isCombosActive,
  combosCompleted,
  totalCombos,
  totalPracticeSeconds,
  totalPracticeCombos,
  currentCombo,
  isMobile = false,
  countdown,
  onClick,
}: LeftDisplayProps) {
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const totalMins = formatMinutes(totalPracticeSeconds);

  const getComboSizeClass = (comboStr: string) => {
    if (comboStr === "WORKOUT COMPLETE!") return "combo-size-large";
    const moveCount = comboStr.split(" · ").length;
    const charLen = comboStr.length;
    if (charLen > 80 || moveCount >= 8) return "combo-size-compact";
    if (charLen > 38 || moveCount >= 5) return "combo-size-medium";
    return "combo-size-large";
  };

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

    const sizeClass = getComboSizeClass(currentCombo);

    if (mode === "time") {
      if (!isTimerRunning && timeLeft === 0 && !currentCombo) {
        return isMobile ? null : <div className="idle-text">Ready</div>;
      }

      return (
        <div className="display-wrapper">
          <div className="time-display">{formatTime(timeLeft)}</div>
          {currentCombo && (
            <div key={currentCombo} className={`current-combo ${sizeClass}`} aria-live="polite">
              {currentCombo}
            </div>
          )}
        </div>
      );
    }

    // Combos mode
    if (!isCombosActive && totalCombos === 0 && !currentCombo) {
      return isMobile ? null : <div className="idle-text">Ready</div>;
    }

    const remainingCombos = Math.max(0, totalCombos - combosCompleted);

    return (
      <div className="display-wrapper">
        <div className="time-display combo-count-display">
          {remainingCombos}
        </div>
        {totalCombos > 0 && (
          <div className="combo-subtext">
            {combosCompleted} / {totalCombos} completed
          </div>
        )}
        {currentCombo && (
          <div key={currentCombo} className={`current-combo ${sizeClass}`} aria-live="polite">
            {currentCombo}
          </div>
        )}
      </div>
    );
  };

  if (isMobile) {
    return (
      <div className="left-tab mobile-display-tab" onClick={onClick}>
        {renderContent()}
      </div>
    );
  }

  return (
    <div className="left-tab" onClick={onClick}>
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
