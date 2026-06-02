import React, { useMemo, useState } from "react";

interface ActiveDateRecord {
  date: string;
  num_combos: number;
}

interface StreakGridModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeDates: ActiveDateRecord[];
  streak: number;
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  label: string;
  combos: number;
  isActive: boolean;
}

export function StreakGridModal({ isOpen, onClose, activeDates, streak }: StreakGridModalProps) {
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false, x: 0, y: 0, label: "", combos: 0, isActive: false,
  });

  // Build a map from dateStr -> num_combos
  const activeMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of activeDates) {
      m.set(r.date, (m.get(r.date) ?? 0) + r.num_combos);
    }
    return m;
  }, [activeDates]);

  // Find the first (oldest) active date in the visible 16-week window
  const firstActiveDate = useMemo(() => {
    if (activeDates.length === 0) return null;
    // Sort ascending; activeDates come DESC from server
    const sorted = [...activeDates].sort((a, b) => a.date.localeCompare(b.date));
    return sorted[0]?.date ?? null;
  }, [activeDates]);

  // Generate a 16-week GitHub-style grid:
  // Columns = weeks (oldest left → newest right)
  // Rows = days of week (Sun top → Sat bottom), 7 rows
  // We want the grid to end on TODAY, and start exactly 16*7=112 days ago.
  const { weeks, monthLabels } = useMemo(() => {
    const today = new Date();
    const todayDay = today.getDay(); // 0=Sun

    // The grid ends on the last Saturday >= today (or today itself)
    // We want today to be the last day shown. Fill partial last week.
    // Build 112 days starting from (today - 111 days).
    const days: Array<{
      dateStr: string;
      label: string;
      isActive: boolean;
      combos: number;
      isFirst: boolean;
      isToday: boolean;
      dayOfWeek: number;
    }> = [];

    const todayStr = today.toISOString().split("T")[0]!;

    for (let i = 111; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split("T")[0]!;
      const isActive = activeMap.has(dateStr);
      const combos = activeMap.get(dateStr) ?? 0;
      const label = d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
      days.push({
        dateStr,
        label,
        isActive,
        combos,
        isFirst: dateStr === firstActiveDate,
        isToday: dateStr === todayStr,
        dayOfWeek: d.getDay(),
      });
    }

    // Group into weeks (columns). Each week is 7 cells: Sun(0)…Sat(6).
    // days[0] is the oldest. We need to find which weekday days[0] falls on,
    // then prepend null-padding so it lands in the right row.
    const firstDayOfWeek = days[0]!.dayOfWeek; // 0-6
    const padded: Array<typeof days[number] | null> = [
      ...Array(firstDayOfWeek).fill(null),
      ...days,
    ];

    // Split into columns of 7
    const weeksArr: Array<Array<typeof days[number] | null>> = [];
    for (let col = 0; col < padded.length; col += 7) {
      weeksArr.push(padded.slice(col, col + 7));
    }

    // Month labels: for each column, determine the month of the first non-null cell
    const monthLabelArr: Array<{ col: number; label: string }> = [];
    let lastMonth = -1;
    for (let col = 0; col < weeksArr.length; col++) {
      const week = weeksArr[col]!;
      const firstReal = week.find(d => d !== null);
      if (firstReal) {
        const m = new Date(firstReal.dateStr + "T00:00:00").getMonth();
        if (m !== lastMonth) {
          monthLabelArr.push({
            col,
            label: new Date(firstReal.dateStr + "T00:00:00").toLocaleString("default", { month: "short" }),
          });
          lastMonth = m;
        }
      }
    }

    return { weeks: weeksArr, monthLabels: monthLabelArr };
  }, [activeMap, firstActiveDate]);

  const handleMouseEnter = (e: React.MouseEvent, day: { dateStr: string; label: string; isActive: boolean; combos: number } | null) => {
    if (!day) return;
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setTooltip({
      visible: true,
      x: rect.left + rect.width / 2,
      y: rect.top - 8,
      label: day.label,
      combos: day.combos,
      isActive: day.isActive,
    });
  };

  const handleMouseLeave = () => {
    setTooltip(t => ({ ...t, visible: false }));
  };

  if (!isOpen) return null;

  const totalCombos = activeDates.reduce((sum, r) => sum + r.num_combos, 0);
  const totalDays = activeDates.length;

  // Day-of-week labels (Sun-Sat abbreviated)
  const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="streak-modal-backdrop" onClick={onClose}>
      <div className="streak-modal-content" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="streak-modal-header">
          <div className="streak-header-left">
            <span className="streak-fire-icon">🔥</span>
            <h2>Practice Streak</h2>
          </div>
          <button className="streak-modal-close" onClick={onClose} aria-label="Close streak panel">
            ×
          </button>
        </div>

        {/* Stats row */}
        <div className="streak-stats-row">
          <div className="streak-stat-box">
            <div className="streak-stat-num">{streak}</div>
            <div className="streak-stat-label">Day Streak</div>
          </div>
          <div className="streak-stat-box">
            <div className="streak-stat-num">{totalDays}</div>
            <div className="streak-stat-label">Active Days</div>
          </div>
          <div className="streak-stat-box">
            <div className="streak-stat-num">{totalCombos.toLocaleString()}</div>
            <div className="streak-stat-label">Total Combos</div>
          </div>
        </div>

        {/* Grid area */}
        <div className="streak-grid-container">
          <div className="streak-grid-header">
            <span className="streak-grid-title">Last 16 Weeks</span>
            <div className="streak-grid-legend">
              <span>Less</span>
              <div className="streak-legend-cell inactive" />
              <div className="streak-legend-cell active-low" />
              <div className="streak-legend-cell active-mid" />
              <div className="streak-legend-cell active-high" />
              <span>More</span>
            </div>
          </div>

          <div className="streak-grid-wrapper">
            {/* Day-of-week labels */}
            <div className="streak-dow-labels">
              {DOW_LABELS.map((d, i) => (
                <div key={i} className="streak-dow-label">
                  {i % 2 === 1 ? d : ""}
                </div>
              ))}
            </div>

            {/* Grid columns */}
            <div className="streak-grid-scroll">
              {/* Month labels row */}
              <div className="streak-month-labels">
                {weeks.map((_, colIdx) => {
                  const ml = monthLabels.find(m => m.col === colIdx);
                  return (
                    <div key={colIdx} className="streak-month-label-cell">
                      {ml ? ml.label : ""}
                    </div>
                  );
                })}
              </div>

              {/* Main grid: each column is a week */}
              <div className="streak-grid">
                {weeks.map((week, colIdx) => (
                  <div key={colIdx} className="streak-grid-col">
                    {week.map((day, rowIdx) => {
                      if (!day) {
                        return <div key={rowIdx} className="streak-grid-cell empty" />;
                      }

                      // Intensity based on combos
                      let intensity = "inactive";
                      if (day.isActive) {
                        if (day.combos >= 50) intensity = "active-high";
                        else if (day.combos >= 20) intensity = "active-mid";
                        else intensity = "active-low";
                      }

                      return (
                        <div
                          key={rowIdx}
                          className={[
                            "streak-grid-cell",
                            intensity,
                            day.isFirst ? "first-day" : "",
                            day.isToday ? "today" : "",
                          ].filter(Boolean).join(" ")}
                          onMouseEnter={e => handleMouseEnter(e, day)}
                          onMouseLeave={handleMouseLeave}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Hint */}
        <p className="streak-modal-hint">
          {activeDates.length === 0
            ? "Start a session today to build your practice streak!"
            : "Consistency makes champions. Keep showing up. 🥊"}
        </p>
      </div>

      {/* Custom tooltip rendered at document level */}
      {tooltip.visible && (
        <div
          className="streak-tooltip"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: "translate(-50%, -100%)",
          }}
        >
          <div className="streak-tooltip-date">{tooltip.label}</div>
          {tooltip.isActive ? (
            <div className="streak-tooltip-combos">{tooltip.combos} combos 🥊</div>
          ) : (
            <div className="streak-tooltip-rest">Rest day</div>
          )}
        </div>
      )}
    </div>
  );
}
