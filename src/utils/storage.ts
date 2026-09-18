

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
