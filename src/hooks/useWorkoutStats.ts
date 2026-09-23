import { useState, useEffect, useRef, useCallback } from "react";
import {
  loadTotalSeconds,
  loadTotalCombos,
  saveTotalSeconds,
  saveTotalCombos,
  todayStr,
  toLocalDateStr,
  loadLocalActiveDates,
  saveLocalActiveDates,
} from "../utils/storage";
import { upsertDailySession } from "../utils/api";

function calculateStreak(dates: Array<{ date: string }>): number {
  if (dates.length === 0) return 0;
  const set = new Set(dates.map(d => d.date));
  const ts = todayStr();
  const yDate = new Date();
  yDate.setDate(yDate.getDate() - 1);
  const yesterday = toLocalDateStr(yDate);
  let cursor = set.has(ts) ? ts : set.has(yesterday) ? yesterday : "";
  let s = 0;
  while (cursor && set.has(cursor)) {
    s++;
    const d = new Date(cursor + "T12:00:00");
    d.setDate(d.getDate() - 1);
    cursor = toLocalDateStr(d);
  }
  return s;
}

export function useWorkoutStats(username: string | null) {
  const [totalPracticeSeconds, setTotalPracticeSeconds] = useState<number>(() => loadTotalSeconds());
  const [totalPracticeCombos, setTotalPracticeCombos] = useState<number>(() => loadTotalCombos());
  const [activeDates, setActiveDates] = useState<Array<{ date: string; num_combos: number }>>(() => loadLocalActiveDates());
  const [streak, setStreak] = useState<number>(() => calculateStreak(loadLocalActiveDates()));
  const [showStreakModal, setShowStreakModal] = useState<boolean>(false);

  const totalPracticeSecondsRef = useRef<number>(totalPracticeSeconds);
  const totalPracticeCombosRef = useRef<number>(totalPracticeCombos);

  useEffect(() => {
    totalPracticeSecondsRef.current = totalPracticeSeconds;
  }, [totalPracticeSeconds]);

  useEffect(() => {
    totalPracticeCombosRef.current = totalPracticeCombos;
  }, [totalPracticeCombos]);

  const flushPendingSession = useCallback((options?: { keepalive?: boolean }) => {
    if (!username) return;
    const s = totalPracticeSecondsRef.current;
    const c = totalPracticeCombosRef.current;
    if (s === 0 && c === 0) return;

    const today = todayStr();
    void upsertDailySession({
      date: today,
      time_seconds: s,
      num_combos: c,
    }, options).catch(() => {});
  }, [username]);

  const accumulateWorkout = useCallback((seconds: number, combos: number) => {
    if (seconds <= 0 && combos <= 0) return;

    let nextSec = totalPracticeSecondsRef.current + seconds;
    let nextCombos = totalPracticeCombosRef.current + combos;

    totalPracticeSecondsRef.current = nextSec;
    totalPracticeCombosRef.current = nextCombos;

    setTotalPracticeSeconds(nextSec);
    saveTotalSeconds(nextSec);

    setTotalPracticeCombos(nextCombos);
    saveTotalCombos(nextCombos);

    const today = todayStr();
    setActiveDates(prev => {
      const existingIdx = prev.findIndex(d => d.date === today);
      let updated: Array<{ date: string; num_combos: number }>;
      if (existingIdx >= 0) {
        const copy = [...prev];
        copy[existingIdx] = {
          date: today,
          num_combos: (copy[existingIdx]?.num_combos ?? 0) + combos,
        };
        updated = copy;
      } else {
        updated = [...prev, { date: today, num_combos: combos }];
      }
      setStreak(calculateStreak(updated));
      if (!username) {
        saveLocalActiveDates(updated);
      }
      return updated;
    });

    if (username) {
      void upsertDailySession({
        date: today,
        time_seconds: nextSec,
        num_combos: nextCombos,
      }).catch(() => {});
    }
  }, [username]);

  useEffect(() => {
    const handleUnload = () => flushPendingSession({ keepalive: true });
    window.addEventListener("beforeunload", handleUnload);
    window.addEventListener("pagehide", handleUnload);
    return () => {
      window.removeEventListener("beforeunload", handleUnload);
      window.removeEventListener("pagehide", handleUnload);
      flushPendingSession();
    };
  }, [flushPendingSession]);

  return {
    totalPracticeSeconds,
    setTotalPracticeSeconds,
    totalPracticeCombos,
    setTotalPracticeCombos,
    streak,
    setStreak,
    activeDates,
    setActiveDates,
    showStreakModal,
    setShowStreakModal,
    accumulateWorkout,
    flushPendingSession,
  };
}
