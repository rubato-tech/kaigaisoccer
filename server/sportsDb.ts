/**
 * TheSportsDB クライアント。
 * 無料 API キー (3) でアクセス可能なエンドポイントのみを使用する。
 *
 * 使用エンドポイント:
 * - eventspastleague.php?id=...   過去 15 試合
 * - eventsnextleague.php?id=...   今後 15 試合
 * - eventsround.php?id=...&r=...&s=... 特定ラウンド
 * - lookupleague.php?id=...        現在シーズン取得
 */

const BASE_URL = "https://www.thesportsdb.com/api/v1/json/3";

export interface SportsDbEvent {
  idEvent: string;
  strEvent: string;
  strSport?: string;
  idLeague: string;
  strLeague: string;
  strLeagueBadge?: string | null;
  strSeason?: string | null;
  strHomeTeam: string;
  strAwayTeam: string;
  idHomeTeam?: string | null;
  idAwayTeam?: string | null;
  strHomeTeamBadge?: string | null;
  strAwayTeamBadge?: string | null;
  intHomeScore?: string | null;
  intAwayScore?: string | null;
  intRound?: string | null;
  strTimestamp?: string | null;
  dateEvent?: string | null;
  strTime?: string | null;
  strStatus?: string | null;
  strPostponed?: string | null;
  strVenue?: string | null;
}

interface EventsResponse {
  events?: SportsDbEvent[] | null;
}

interface LeagueResponse {
  leagues?: { idLeague: string; strCurrentSeason?: string | null }[];
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchJson<T>(url: string, attempt = 0): Promise<T | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "soccer-schedule-jp/1.0" },
    });
    if (res.status === 429) {
      if (attempt < 3) {
        const wait = 2000 * (attempt + 1);
        console.warn(`[SportsDB] 429, retry in ${wait}ms: ${url}`);
        await sleep(wait);
        return fetchJson<T>(url, attempt + 1);
      }
      console.warn(`[SportsDB] 429 final for ${url}`);
      return null;
    }
    if (!res.ok) {
      console.warn(`[SportsDB] HTTP ${res.status} for ${url}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    if (attempt < 2) {
      await sleep(1000);
      return fetchJson<T>(url, attempt + 1);
    }
    console.warn(`[SportsDB] fetch failed ${url}:`, err);
    return null;
  }
}

export async function fetchPastLeagueEvents(idLeague: string): Promise<SportsDbEvent[]> {
  const data = await fetchJson<EventsResponse>(`${BASE_URL}/eventspastleague.php?id=${idLeague}`);
  return data?.events ?? [];
}

export async function fetchNextLeagueEvents(idLeague: string): Promise<SportsDbEvent[]> {
  const data = await fetchJson<EventsResponse>(`${BASE_URL}/eventsnextleague.php?id=${idLeague}`);
  return data?.events ?? [];
}

export async function fetchCurrentSeason(idLeague: string): Promise<string | null> {
  const data = await fetchJson<LeagueResponse>(`${BASE_URL}/lookupleague.php?id=${idLeague}`);
  const league = data?.leagues?.[0];
  return league?.strCurrentSeason ?? null;
}

export async function fetchEventsByRound(
  idLeague: string,
  round: number,
  season: string,
): Promise<SportsDbEvent[]> {
  const data = await fetchJson<EventsResponse>(
    `${BASE_URL}/eventsround.php?id=${idLeague}&r=${round}&s=${encodeURIComponent(season)}`,
  );
  return data?.events ?? [];
}

/**
 * next/past 各15試合から現在のラウンド番号を推定する。
 * 直近の過去試合の最大ラウンド番号を「現在ラウンド」とみなす。
 * 取得できない場合は null を返す。
 */
export async function fetchCurrentRound(idLeague: string): Promise<number | null> {
  const [nextRes, pastRes] = await Promise.allSettled([
    fetchNextLeagueEvents(idLeague),
    fetchPastLeagueEvents(idLeague),
  ]);
  const pastEvents = pastRes.status === "fulfilled" ? pastRes.value : [];
  const nextEvents = nextRes.status === "fulfilled" ? nextRes.value : [];

  // 過去試合の最大ラウンドを現在ラウンドとする
  const pastRounds = pastEvents
    .map((ev) => (ev.intRound ? parseInt(ev.intRound, 10) : NaN))
    .filter((r) => !isNaN(r));
  if (pastRounds.length > 0) return Math.max(...pastRounds);

  // fallback: 次の試合の最小ラウンド
  const nextRounds = nextEvents
    .map((ev) => (ev.intRound ? parseInt(ev.intRound, 10) : NaN))
    .filter((r) => !isNaN(r));
  if (nextRounds.length > 0) return Math.min(...nextRounds);

  return null;
}

/**
 * イベントの strTimestamp (UTC ISO ライク文字列) を UNIX ミリ秒へ変換する。
 * 取得できない場合は dateEvent + strTime + UTC として解釈する。
 */
export function eventToUtcMs(ev: SportsDbEvent): number | null {
  if (ev.strTimestamp) {
    // 例: "2026-04-25T14:00:00"
    const ms = Date.parse(`${ev.strTimestamp}Z`);
    if (!Number.isNaN(ms)) return ms;
  }
  if (ev.dateEvent && ev.strTime) {
    const ms = Date.parse(`${ev.dateEvent}T${ev.strTime}Z`);
    if (!Number.isNaN(ms)) return ms;
  }
  return null;
}

/** TheSportsDB のステータス文字列を正規化 */
export function normalizeStatus(raw: string | null | undefined, postponed?: string | null): string {
  if (postponed && postponed !== "no") return "postponed";
  if (!raw) return "scheduled";
  const v = raw.toLowerCase();
  if (v.includes("finished") || v === "ft" || v === "match finished") return "finished";
  if (v.includes("not started") || v.includes("scheduled") || v === "ns") return "scheduled";
  if (v.includes("postp") || v === "pp") return "postponed";
  if (v.includes("cancel")) return "cancelled";
  if (v.includes("live") || v.includes("1h") || v.includes("2h") || v.includes("ht")) return "live";
  return v;
}
