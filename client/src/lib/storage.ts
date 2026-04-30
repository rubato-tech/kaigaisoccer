/**
 * localStorage のキー管理と読み書きヘルパー
 */

export const FAVORITE_TEAMS_KEY = "kaigaisoccer.favorite-teams";
export const WATCHLIST_KEY = "kaigaisoccer.watchlist";

export function readStringArray(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === "string")
      : [];
  } catch {
    return [];
  }
}

export function writeStringArray(key: string, values: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(values));
}
