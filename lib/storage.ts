import type { AppData } from "@/types";
import { sampleData } from "@/lib/sample-data";
import { CURRENT_STORAGE_VERSION, DEMO_CLEANUP_VERSION, migrateAppData } from "@/lib/migrations";

export const STORAGE_KEY = "unitime-app-data-v1";
const DEMO_CLEANUP_BACKUP_KEY = `${STORAGE_KEY}-before-demo-cleanup-v${DEMO_CLEANUP_VERSION}`;
const SALARY_MIGRATION_BACKUP_KEY = `${STORAGE_KEY}-before-salary-migration-v${CURRENT_STORAGE_VERSION}`;

export function loadAppData(): AppData {
  if (typeof window === "undefined") return sampleData;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sampleData));
    return sampleData;
  }
  try {
    const parsed = JSON.parse(raw);
    if ((parsed?.demoCleanupVersion ?? 0) < DEMO_CLEANUP_VERSION && !window.localStorage.getItem(DEMO_CLEANUP_BACKUP_KEY)) {
      window.localStorage.setItem(DEMO_CLEANUP_BACKUP_KEY, raw);
    }
    if ((parsed?.storageVersion ?? 0) < CURRENT_STORAGE_VERSION && !window.localStorage.getItem(SALARY_MIGRATION_BACKUP_KEY)) {
      window.localStorage.setItem(SALARY_MIGRATION_BACKUP_KEY, raw);
    }
    const migrated = migrateAppData(parsed);
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
