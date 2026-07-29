import type { AppData } from "@/types";
import { sampleData } from "@/lib/sample-data";
import { migrateAppData } from "@/lib/migrations";

export const STORAGE_KEY = "unitime-app-data-v1";

export function loadAppData(): AppData {
  if (typeof window === "undefined") return sampleData;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sampleData));
    return sampleData;
  }
  try {
    const migrated = migrateAppData(JSON.parse(raw));
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
    return migrated;
  } catch {
    window.localStorage.setItem(`${STORAGE_KEY}-backup-${Date.now()}`, raw);
    return sampleData;
  }
}

export function saveAppData(data: AppData) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function clearAppData() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

export function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
