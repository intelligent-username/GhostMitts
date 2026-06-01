import React, { useMemo } from "react";

interface StreakGridModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeDates: string[];
  streak: number;
}

export function StreakGridModal({ isOpen, onClose, activeDates, streak }: StreakGridModalProps) {
  const activeSet = useMemo(() => new Set(activeDates), [activeDates]);

  // Generate grid for last 16 weeks (112 days) aligned to standard calendar grid (7 rows per week)
  const gridDays = useMemo(() => {
    const days: Array<{ dateStr: string; isActive: boolean; dayOfWeek: number; label: string }> = [];
    const today = new Date();
    
    // We want the grid to end on today, but aligned to columns.
    // Let's generate exactly 112 days ending today.
    for (let i = 111; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split("T")[0]!;
      
      const options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" };
      const label = d.toLocaleDateString(undefined, options);

      days.push({
        dateStr,
        isActive: activeSet.has(dateStr),
        dayOfWeek: d.getDay(), // 0 = Sunday, 6 = Saturday
        label,
      });
    }
    return days;
  }, [activeSet]);

  if (!isOpen) return null;

  return (
    <div className="streak-modal-backdrop" onClick={onClose}>
      <div className="streak-modal-content" onClick={e => e.stopPropagation()}>
        <div className="streak-modal-header">
          <div className="streak-header-left">
            <span className="streak-fire-icon">🔥</span>
            <h2>Practice Streak</h2>
          </div>
          <button className="streak-modal-close" onClick={onClose} aria-label="Close streak panel">
            ×
          </button>
        </div>

        <div className="streak-modal-body">
          <div className="streak-stat-box">
            <div className="streak-stat-num">{streak}</div>
            <div className="streak-stat-label">Current Daily Streak</div>
          </div>

          <div className="streak-grid-container">
            <h4 className="streak-grid-title">Activity Grid (Past 16 Weeks)</h4>
            <div className="streak-grid">
              {gridDays.map((day, idx) => (
                <div
                  key={idx}
                  className={`streak-grid-cell ${day.isActive ? "active" : "inactive"}`}
                  title={`${day.label}: ${day.isActive ? "Practiced! 🥊" : "Rest day"}`}
                />
              ))}
            </div>
            <div className="streak-grid-legend">
              <span>Less</span>
              <div className="streak-grid-cell inactive" />
              <div className="streak-grid-cell active" />
              <span>More</span>
            </div>
          </div>

          {activeDates.length === 0 ? (
            <p className="streak-modal-hint">Start a session today to build your practice streak!</p>
          ) : (
            <p className="streak-modal-hint">Keep up the momentum! Consistency makes champions.</p>
          )}
        </div>
      </div>
    </div>
  );
}
