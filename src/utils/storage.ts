const LS_SECONDS = "gm_totalPracticeSeconds";
const LS_COMBOS  = "gm_totalPracticeCombos";
const LS_GEN_SETTINGS = "gm_genSettings";

function todayStr() {
  const d = new Date();
  return d.toISOString().split("T")[0];
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

export function loadGenSettings(): string | null {
  try {
    return localStorage.getItem(LS_GEN_SETTINGS);
  } catch {
    return null;
  }
}

export function saveGenSettings(val: string) {
  try {
    localStorage.setItem(LS_GEN_SETTINGS, val);
  } catch {}
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
