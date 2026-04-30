/**
 * TheSportsDB から試合データを取得して `matches` テーブルへ upsert する。
 *
 * 取得方式（レート制限対策）:
 * 1. fetchCurrentRound() で現在ラウンドを推定（next/past各15試合から判定）
 * 2. 現在ラウンド ±3 節（計最大7ラウンド）のみ eventsround.php で取得
 *    → 1リーグあたり最大9リクエスト（lookupleague×1 + eventsround×7 + next/past×2）
 *    → 全25リーグで約225リクエスト（以前の750から大幅削減）
 *
 * UEFA・カップ戦はラウンド番号体系が異なるため、next/past方式のみを使用する。
 */

import { JAPANESE_PLAYER_TEAMS, LEAGUES, type LeagueDef } from "@shared/leagues";
import { getDb } from "./db";
import { matches as matchesTable, syncLog } from "../drizzle/schema";
import {
  eventToUtcMs,
  fetchCurrentRound,
  fetchCurrentSeason,
  fetchEventsByRound,
  fetchNextLeagueEvents,
  fetchPastLeagueEvents,
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

async function upsertEvents(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  league: LeagueDef,
  events: SportsDbEvent[],
  errors: string[],
): Promise<number> {
  // 重複排除
  const seen = new Set<string>();
  const unique = events.filter((ev) => {
    if (seen.has(ev.idEvent)) return false;
    seen.add(ev.idEvent);
    return true;
  });

  let upserted = 0;
  for (const ev of unique) {
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
  return upserted;
}

/**
 * リーグ 1 つを同期する。
 * - euro_league: 現在ラウンド ±3 節（計最大7ラウンド）を eventsround.php で取得
 * - cup / uefa / national_team: next/past 各15試合を使用
 */
export async function syncOneLeague(
  league: LeagueDef,
): Promise<{ fetched: number; upserted: number; errors: string[] }> {
  const db = await getDb();
  if (!db) return { fetched: 0, upserted: 0, errors: ["DB unavailable"] };
  const errors: string[] = [];
  let fetched = 0;
  let upserted = 0;

  if (league.category === "euro_league") {
    // ステップ1: 現在ラウンドを推定（next/past各15試合から）
    const currentRound = await fetchCurrentRound(league.id);
    await sleep(500);

    if (currentRound === null) {
      // ラウンド推定失敗時はnext/pastにフォールバック
      console.warn(`[sync] ${league.nameJp}: currentRound推定失敗、next/pastにフォールバック`);
      const [nextEvents, pastEvents] = await Promise.allSettled([
        fetchNextLeagueEvents(league.id),
        fetchPastLeagueEvents(league.id),
      ]);
      const all: SportsDbEvent[] = [
        ...(nextEvents.status === "fulfilled" ? nextEvents.value : []),
        ...(pastEvents.status === "fulfilled" ? pastEvents.value : []),
      ];
      fetched = all.length;
      upserted = await upsertEvents(db, league, all, errors);
      return { fetched, upserted, errors };
    }

    // ステップ2: 現在ラウンド ±3 節（最大7ラウンド）を取得
    const WINDOW = 3;
    const maxRound = Math.max(...league.rounds);
    const minRound = Math.min(...league.rounds);
    const targetRounds: number[] = [];
    for (let r = currentRound - WINDOW; r <= currentRound + WINDOW; r++) {
      if (r >= minRound && r <= maxRound) targetRounds.push(r);
    }

    const season = (await fetchCurrentSeason(league.id)) ?? "2025-2026";
    await sleep(300);

    console.log(`[sync] ${league.nameJp}: ラウンド${targetRounds[0]}〜${targetRounds[targetRounds.length - 1]}を取得（現在R${currentRound}）`);

    const allEvents: SportsDbEvent[] = [];
    for (const round of targetRounds) {
      await sleep(500); // レート制限対策
      try {
        const events = await fetchEventsByRound(league.id, round, season);
        allEvents.push(...events);
      } catch (err) {
        errors.push(`${league.nameJp} R${round}: ${(err as Error).message}`);
      }
    }

    fetched = allEvents.length;
    upserted = await upsertEvents(db, league, allEvents, errors);
  } else {
    // cup / uefa / national_team: next/past 各15試合
    const [nextRes, pastRes] = await Promise.allSettled([
      fetchNextLeagueEvents(league.id),
      fetchPastLeagueEvents(league.id),
    ]);
    const all: SportsDbEvent[] = [
      ...(nextRes.status === "fulfilled" ? nextRes.value : []),
      ...(pastRes.status === "fulfilled" ? pastRes.value : []),
    ];
    fetched = all.length;
    upserted = await upsertEvents(db, league, all, errors);
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
      const r = await syncOneLeague(league);
      fetched += r.fetched;
      upserted += r.upserted;
      errors.push(...r.errors);
      console.log(`[sync] ${league.nameJp}: fetched=${r.fetched} upserted=${r.upserted} errors=${r.errors.length}`);
      // リーグ間に1.5秒待機（レート制限対策）
      await sleep(1500);
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
