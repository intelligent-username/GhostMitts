const LS_SECONDS = "gm_totalPracticeSeconds";
const LS_COMBOS  = "gm_totalPracticeCombos";

export function toLocalDateStr(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function todayStr(): string {
  return toLocalDateStr(new Date());
}

export function loadTotalSeconds(): number {
  const rec = loadRecord(LS_SECONDS);
  return rec && rec.date === todayStr() ? rec.value : 0;
}

export function loadTotalCombos(): number {
  const rec = loadRecord(LS_COMBOS);
  return rec && rec.date === todayStr() ? rec.value : 0;
}

export function saveTotalSeconds(val: number) {
  saveRecord(LS_SECONDS, val);
}

export function saveTotalCombos(val: number) {
  saveRecord(LS_COMBOS, val);
}

function loadRecord(key: string): { date: string; value: number } | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const rec = JSON.parse(raw) as { date: string; value: number };
    return rec && typeof rec.date === "string" && typeof rec.value === "number" ? rec : null;
  } catch {
    return null;
  }
}

function saveRecord(key: string, value: number) {
  try {
    localStorage.setItem(key, JSON.stringify({ date: todayStr(), value }));
  } catch {}
}
