/**
 * TheSportsDB から試合データを取得して `matches` テーブルへ upsert する。
 *
 * Free API key (3) では `eventsnextleague.php` / `eventspastleague.php` が
 * リーグ ID を無視して常に同じデータを返す制限があるため、
 * `eventsround.php?id=...&r=...&s=...` を各ラウンドに対して呼び出して
 * 1シーズン分の試合を取得する方式を採用する。
 */

import { JAPANESE_PLAYER_TEAMS, LEAGUES, type LeagueDef } from "@shared/leagues";
import { getDb } from "./db";
import { matches as matchesTable, syncLog } from "../drizzle/schema";
import {
  eventToUtcMs,
  fetchCurrentSeason,
  fetchEventsByRound,
  normalizeStatus,
  type SportsDbEvent,
} from "./sportsDb";

interface SyncResult {
  fetched: number;
  upserted: number;
  errors: string[];
}

function detectTags(homeTeam: string, awayTeam: string): string | null {
  const tags: string[] = [];
  const involves = (name: string) =>
    JAPANESE_PLAYER_TEAMS.some((t) => name.toLowerCase() === t.toLowerCase());
  if (involves(homeTeam) || involves(awayTeam)) {
    tags.push("japanese_player");
  }
  return tags.length > 0 ? tags.join(",") : null;
}

function eventToInsert(league: LeagueDef, ev: SportsDbEvent) {
  const utcMs = eventToUtcMs(ev);
  if (utcMs == null) return null;
  // API側で別リーグの試合が混入することがあるので、idLeagueが一致しない場合はスキップ
  if (ev.idLeague && ev.idLeague !== league.id) return null;
  const status = normalizeStatus(ev.strStatus, ev.strPostponed);
  return {
    eventId: ev.idEvent,
    category: league.category,
    leagueId: league.id,
    leagueNameJp: league.nameJp,
    leagueNameEn: league.nameEn,
    leagueBadge: ev.strLeagueBadge ?? null,
    season: ev.strSeason ?? null,
    round: ev.intRound ?? null,
    homeTeamId: ev.idHomeTeam ?? null,
    homeTeam: ev.strHomeTeam,
    homeTeamBadge: ev.strHomeTeamBadge ?? null,
    awayTeamId: ev.idAwayTeam ?? null,
    awayTeam: ev.strAwayTeam,
    awayTeamBadge: ev.strAwayTeamBadge ?? null,
    kickoffUtcMs: utcMs,
    status,
    homeScore: ev.intHomeScore != null && ev.intHomeScore !== "" ? Number(ev.intHomeScore) : null,
    awayScore: ev.intAwayScore != null && ev.intAwayScore !== "" ? Number(ev.intAwayScore) : null,
    venue: ev.strVenue ?? null,
    tags: detectTags(ev.strHomeTeam, ev.strAwayTeam),
  } as const;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * 並列処理ヘルパー：items を concurrency 個ずつバッチで処理する。
 */
async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (true) {
      const i = next++;
      if (i >= items.length) break;
      results[i] = await fn(items[i]!);
    }
  });
  await Promise.all(workers);
  return results;
}

/**
 * リーグ 1 つを同期する。
 */
export async function syncOneLeague(
  league: LeagueDef,
  options: { concurrency?: number } = {},
): Promise<{ fetched: number; upserted: number; errors: string[] }> {
  const db = await getDb();
  if (!db) return { fetched: 0, upserted: 0, errors: ["DB unavailable"] };
  const concurrency = options.concurrency ?? 4;
  const errors: string[] = [];
  let fetched = 0;
  let upserted = 0;
  const season = (await fetchCurrentSeason(league.id)) ?? "2025-2026";

  const allEvents = await mapWithConcurrency(league.rounds, concurrency, async (round) => {
    try {
      return await fetchEventsByRound(league.id, round, season);
    } catch (err) {
      errors.push(`${league.nameJp} R${round}: ${(err as Error).message}`);
      return [] as SportsDbEvent[];
    }
  });
  const flat = allEvents.flat();
  fetched += flat.length;

  for (const ev of flat) {
    const row = eventToInsert(league, ev);
    if (!row) continue;
    try {
      await db
        .insert(matchesTable)
        .values(row)
        .onDuplicateKeyUpdate({
          set: {
            category: row.category,
            leagueId: row.leagueId,
            leagueNameJp: row.leagueNameJp,
            leagueNameEn: row.leagueNameEn,
            leagueBadge: row.leagueBadge,
            season: row.season,
            round: row.round,
            homeTeamId: row.homeTeamId,
            homeTeam: row.homeTeam,
            homeTeamBadge: row.homeTeamBadge,
            awayTeamId: row.awayTeamId,
            awayTeam: row.awayTeam,
            awayTeamBadge: row.awayTeamBadge,
            kickoffUtcMs: row.kickoffUtcMs,
            status: row.status,
            homeScore: row.homeScore,
            awayScore: row.awayScore,
            venue: row.venue,
            tags: row.tags,
          },
        });
      upserted += 1;
    } catch (err) {
      errors.push(`upsert ${ev.idEvent}: ${(err as Error).message}`);
    }
  }
  return { fetched, upserted, errors };
}

export async function syncAllLeagues(): Promise<SyncResult> {
  const db = await getDb();
  if (!db) {
    return { fetched: 0, upserted: 0, errors: ["DB unavailable"] };
  }

  const startedAt = new Date();
  const errors: string[] = [];
  let fetched = 0;
  let upserted = 0;

  // sync_log 開始記録
  const logInsert = await db.insert(syncLog).values({
    source: "thesportsdb",
    status: "running",
    fetchedCount: 0,
    upsertedCount: 0,
    startedAt,
  });
  const logId = (logInsert as unknown as { insertId?: number }).insertId ?? null;

  for (const league of LEAGUES) {
    try {
      const r = await syncOneLeague(league, { concurrency: 4 });
      fetched += r.fetched;
      upserted += r.upserted;
      errors.push(...r.errors);
    } catch (err) {
      errors.push(`league ${league.id} (${league.nameJp}): ${(err as Error).message}`);
    }
  }

  if (logId != null) {
    try {
      const { eq } = await import("drizzle-orm");
      await db
        .update(syncLog)
        .set({
          status: errors.length > 0 ? "partial" : "success",
          fetchedCount: fetched,
          upsertedCount: upserted,
          finishedAt: new Date(),
          message: errors.length > 0 ? errors.slice(0, 5).join(" | ").slice(0, 500) : null,
        })
        .where(eq(syncLog.id, logId));
    } catch (err) {
      console.warn("[syncMatches] failed to update sync_log:", err);
    }
  }

  return { fetched, upserted, errors };
}
