/**
 * TheSportsDB クライアント。
 * 無料 API キー (3) でアクセス可能なエンドポイントのみを使用する。
 *
 * 使用エンドポイント:
 * - eventspastleague.php?id=...   過去 1 試合（無料プランの制限）
 * - eventsnextleague.php?id=...   今後 1 試合（無料プランの制限）
 * - eventsround.php?id=...&r=...&s=... 特定ラウンド（全試合取得可能）
 * - lookupleague.php?id=...        現在シーズン取得
 *
 * 注意: 無料プランでは eventsnextleague / eventspastleague は各1件しか返さない。
 * そのため eventsround.php を使って現在ラウンド周辺を広く取得する方式を採用。
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
 * next/past 各1試合から現在のラウンド番号を推定する。
 *
 * 無料APIはnext/pastが各1件しか返さないため、
 * - next のラウンド番号（次の試合）を優先して使用
 * - next が取れない場合は past のラウンド番号（直近の過去試合）を使用
 * - どちらも取れない場合は null を返す
 *
 * 返り値: { currentRound, fromNext }
 * - currentRound: 推定ラウンド番号（null = 推定不可）
 * - fromNext: true = nextから取得, false = pastから取得
 */
export async function fetchCurrentRound(idLeague: string): Promise<{
  currentRound: number | null;
  fromNext: boolean;
}> {
  const [nextRes, pastRes] = await Promise.allSettled([
    fetchNextLeagueEvents(idLeague),
    fetchPastLeagueEvents(idLeague),
  ]);
  const nextEvents = nextRes.status === "fulfilled" ? nextRes.value : [];
  const pastEvents = pastRes.status === "fulfilled" ? pastRes.value : [];

  // next の最小ラウンド（次の試合のラウンド）を優先
  // R0 は「ラウンド未設定」を意味する無効値なので除外する
  const nextRounds = nextEvents
    .map((ev) => (ev.intRound ? parseInt(ev.intRound, 10) : NaN))
    .filter((r) => !isNaN(r) && r > 0);
  if (nextRounds.length > 0) {
    return { currentRound: Math.min(...nextRounds), fromNext: true };
  }

  // fallback: past の最大ラウンド（直近の過去試合）
  // R0 は無効値なので除外する
  const pastRounds = pastEvents
    .map((ev) => (ev.intRound ? parseInt(ev.intRound, 10) : NaN))
    .filter((r) => !isNaN(r) && r > 0);
  if (pastRounds.length > 0) {
    return { currentRound: Math.max(...pastRounds), fromNext: false };
  }

  return { currentRound: null, fromNext: false };
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
