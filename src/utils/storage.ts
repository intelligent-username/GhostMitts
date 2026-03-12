const LS_SECONDS = "gm_totalPracticeSeconds";
const LS_COMBOS  = "gm_totalPracticeCombos";

export function loadTotalSeconds(): number {
  return loadLS(LS_SECONDS, 0);
}

export function loadTotalCombos(): number {
  return loadLS(LS_COMBOS, 0);
}

export function saveTotalSeconds(val: number) {
  saveLS(LS_SECONDS, val);
}

export function saveTotalCombos(val: number) {
  saveLS(LS_COMBOS, val);
}

function loadLS(key: string, fallback: number): number {
  try { return Number(localStorage.getItem(key) ?? fallback) || fallback; }
  catch { return fallback; }
}

function saveLS(key: string, val: number) {
  try { localStorage.setItem(key, String(val)); } catch { /* ignore */ }
}
