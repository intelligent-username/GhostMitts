import React, { useMemo, useState, useEffect } from "react";

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
  isFirst: boolean;
}

export function StreakGridModal({ isOpen, onClose, activeDates, streak }: StreakGridModalProps) {
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false, x: 0, y: 0, label: "", combos: 0, isActive: false, isFirst: false,
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
  const [weekOffset, setWeekOffset] = useState<number>(0);

  useEffect(() => {
    if (isOpen) {
      setWeekOffset(0);
    }
  }, [isOpen]);

  const firstActiveDate = useMemo(() => {
    if (activeDates.length === 0) return null;
    const sorted = [...activeDates].sort((a, b) => a.date.localeCompare(b.date));
    return sorted[0]?.date ?? null;
  }, [activeDates]);

  // Determine if the account is brand‑new (<4 weeks old) and calculate padding
  const isNewAccount = useMemo(() => {
    if (!firstActiveDate) return false;
    const first = new Date(firstActiveDate + "T00:00:00");
    const today = new Date();
    const ageDays = (today.getTime() - first.getTime()) / (1000 * 60 * 60 * 24);
    return ageDays < 28;
  }, [firstActiveDate]);

  // For new accounts we cap navigation to the single padded window; otherwise allow full navigation
  const maxWeekOffset = useMemo(() => {
    if (isNewAccount) return 0;
    if (!firstActiveDate) return 0;
    const firstDate = new Date(firstActiveDate + "T00:00:00");
    const today = new Date();
    const firstActiveSunday = new Date(firstDate);
    firstActiveSunday.setDate(firstDate.getDate() - firstDate.getDay());
    const todaySunday = new Date(today);
    todaySunday.setDate(today.getDate() - today.getDay());
    const diffWeeks = Math.round((todaySunday.getTime() - firstActiveSunday.getTime()) / (1000 * 60 * 60 * 24 * 7));
    return Math.max(0, diffWeeks);
  }, [firstActiveDate, isNewAccount]);

  // Generate the grid – 16 weeks normally, 6 weeks (with 2‑week padding) for brand�  const { weeks, monthLabels } = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0]!;

    const endDate = new Date();
    if (isNewAccount) {
      // For a new account, we want the grid to end 14 days (2 weeks) after today.
      // This centers the user's active days in the 6-week window.
      endDate.setDate(today.getDate() + 14);
    } else {
      // For older accounts, scroll normally based on weekOffset
      endDate.setDate(today.getDate() - weekOffset * 7);
    }

    // Determine the 6-week window boundaries for a new account
    let newAccountWindowStart = "";
    let newAccountWindowEnd = "";
    if (isNewAccount && firstActiveDate) {
      const firstActiveDateObj = new Date(firstActiveDate + "T00:00:00");
      const padStart = new Date(firstActiveDateObj.getTime());
      padStart.setDate(firstActiveDateObj.getDate() - 14); // 2 weeks before first day
      newAccountWindowStart = padStart.toISOString().split("T")[0]!;

      const padEnd = new Date(today.getTime());
      padEnd.setDate(today.getDate() + 14); // 2 weeks after current day
      newAccountWindowEnd = padEnd.toISOString().split("T")[0]!;
    }

    const days: Array<{
      dateStr: string;
      label: string;
      isActive: boolean;
      combos: number;
      isFirst: boolean;
      isToday: boolean;
      dayOfWeek: number;
      isPreAccount?: boolean;
      isFuture?: boolean;
    } | null> = [];

    for (let i = 111; i >= 0; i--) {
      const d = new Date(endDate.getTime());
      d.setDate(endDate.getDate() - i);
      const dateStr = d.toISOString().split("T")[0]!;

      if (isNewAccount) {
        // For new accounts, everything outside the 6-week period is empty (null)
        const isInsideWindow = dateStr >= newAccountWindowStart && dateStr <= newAccountWindowEnd;
        if (!isInsideWindow) {
          days.push(null);
        } else {
          // Inside the 6-week window:
          const isPreAccount = firstActiveDate && dateStr < firstActiveDate;
          const isFuture = dateStr > todayStr;
          
          if (isPreAccount || isFuture) {
            // Plot as normal inactive squares with no combos, so they don't look empty!
            const label = d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
            days.push({
              dateStr,
              label,
              isActive: false,
              combos: 0,
              isFirst: false,
              isToday: false,
              dayOfWeek: d.getDay(),
              isPreAccount: true,
            });
          } else {
            // Normal active/inactive range
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
        }
      } else {
        // For older accounts (> 4 weeks old):
        // No future or prior-to-first-day dates are displayed
        const isBeforeFirst = firstActiveDate && dateStr < firstActiveDate;
        const isAfterToday = dateStr > todayStr;

        if (isBeforeFirst || isAfterToday) {
          days.push(null);
        } else {
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
      }
    }

    // Pad to start on Sunday
    const firstDayOfWeek = days[0] ? days[0]!.dayOfWeek : 0;
    const padded: Array<{
      dateStr: string;
      label: string;
      isActive: boolean;
      combos: number;
      isFirst: boolean;
      isToday: boolean;
      dayOfWeek: number;
      isPreAccount?: boolean;
      isFuture?: boolean;
    } | null> = [
      ...Array(firstDayOfWeek).fill(null),
      ...days,
    ];

    const weeksArr: Array<Array<{
      dateStr: string;
      label: string;
      isActive: boolean;
      combos: number;
      isFirst: boolean;
      isToday: boolean;
      dayOfWeek: number;
      isPreAccount?: boolean;
      isFuture?: boolean;
    } | null>> = [];

    for (let col = 0; col < padded.length; col += 7) {
      weeksArr.push(padded.slice(col, col + 7));
    }

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
  }, [activeMap, firstActiveDate, weekOffset, isNewAccount]);t, isNewAccount]);

  const handleMouseEnter = (
    e: React.MouseEvent,
    day: { dateStr: string; label: string; isActive: boolean; combos: number; isFirst: boolean } | null
  ) => {
    if (!day) return;
    
    // Suppress tooltips for days prior to the first active day when they aren't active
    if (!day.isActive && firstActiveDate && day.dateStr < firstActiveDate) {
      return;
    }

    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setTooltip({
      visible: true,
      x: rect.left + rect.width / 2,
      y: rect.top - 8,
      label: day.label,
      combos: day.combos,
      isActive: day.isActive,
      isFirst: day.isFirst,
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
            <div className="streak-nav-controls">
              <button
                className="streak-nav-btn"
                onClick={() => setWeekOffset(prev => Math.min(maxWeekOffset, prev + 1))}
                disabled={weekOffset >= maxWeekOffset}
                title="Go back in time"
              >
                ◀
              </button>
              <span className="streak-nav-label">
                {weekOffset === 0 ? "Current" : `${weekOffset} wks ago`}
              </span>
              <button
                className="streak-nav-btn"
                onClick={() => setWeekOffset(prev => Math.max(0, prev - 1))}
                disabled={weekOffset <= 0}
                title="Go forward in time"
              >
                ▶
              </button>
            </div>
          </div>

          <div className="streak-grid-wrapper">
            {/* Day-of-week labels */}
            <div className="streak-dow-labels">
              <div className="streak-dow-label-header">&nbsp;</div>
              {DOW_LABELS.map((d, i) => (
                <div key={i} className="streak-dow-label">
                  {i % 2 === 1 ? d : "\u00A0"}
                </div>
              ))}
            </div>

            {/* Grid columns */}
            <div className="streak-grid-scroll">
              {/* Main grid: each column is a week containing month label + days */}
              <div className="streak-grid">
                {weeks.map((week, colIdx) => {
                  const ml = monthLabels.find(m => m.col === colIdx);
                  return (
                    <div key={colIdx} className="streak-grid-col">
                      <div className="streak-month-label-cell">
                        {ml ? ml.label : "\u00A0"}
                      </div>
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
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Hint */}
        <p className="streak-modal-hint">
          {activeDates.length === 0
            ? "Start a session today to build your practice streak!"
            : "\"People need to be reminded more often than they need to be instructed.\""}
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
            <div className="streak-tooltip-combos">{tooltip.combos} combos</div>
          ) : (
            <div className="streak-tooltip-rest">Rest day</div>
          )}
          {tooltip.isFirst && (
            <div className="streak-tooltip-first" style={{ color: '#ffd700', fontSize: '0.72rem', fontWeight: 'bold', marginTop: '0.2rem' }}>
              First Day
            </div>
          )}
        </div>
      )}
    </div>
  );
}
