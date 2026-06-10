/**
 * TheSportsDB から試合データを取得して `matches` テーブルへ upsert する。
 *
 * 取得方式（レート制限対策）:
 * 1. fetchCurrentRound() で現在ラウンドを推定（next/past各1試合から判定）
 *    - next が取れた場合: そのラウンドを基準に ±3 節（計最大7ラウンド）
 *    - past のみの場合: そのラウンドを基準に ±3 節（計最大7ラウンド）
 *    - どちらも取れない場合: 全ラウンドをスキャン（最大10ラウンド）
 * 2. eventsround.php で各ラウンドの全試合を取得
 *    → 1リーグあたり最大7〜10リクエスト
 *    → 全25リーグで約175〜250リクエスト
 *
 * UEFA・カップ戦・代表戦も同様に next/past からラウンドを推定して
 * eventsround.php で取得する方式に統一。
 */

import { JAPANESE_PLAYER_TEAMS, LEAGUES, type LeagueDef } from "@shared/leagues";
import { getDb } from "./db";
import { matches as matchesTable, syncLog } from "../drizzle/schema";
import { sql } from "drizzle-orm";
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
            // world_cup カテゴリで保存済みのデータを national_team で上書きしないよう
            // category は INSERT 時の値を優先（既存が world_cup なら維持）
            // MySQL の IF(category='world_cup', category, ?) で条件付き更新
            // → Drizzle の sql`` テンプレートで記述
            category: sql`IF(${matchesTable.category} = 'world_cup', ${matchesTable.category}, ${row.category})`,
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
 * ラウンドベースでデータを取得する共通ロジック。
 *
 * next/past から現在ラウンドを推定し、その前後 WINDOW 節を取得する。
 * - next が取れた場合: nextRound を中心に -WINDOW_BACK 〜 +WINDOW_FORWARD
 * - past のみの場合: pastRound を中心に -WINDOW_BACK 〜 +WINDOW_FORWARD
 * - どちらも取れない場合: rounds 配列の後半 FALLBACK_COUNT ラウンドを試行
 */
async function syncByRound(
  league: LeagueDef,
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  errors: string[],
): Promise<{ fetched: number; upserted: number }> {
  const WINDOW_BACK = 3;
  const WINDOW_FORWARD = 3;
  const FALLBACK_COUNT = 10; // ラウンド推定失敗時に後半から試行するラウンド数

  const season = league.fixedSeason ?? (await fetchCurrentSeason(league.id)) ?? "2025-2026";
  await sleep(300);

  let targetRounds: number[];

  if (league.fetchAllRounds) {
    // fetchAllRounds=true の場合は rounds 配列の全ラウンドを取得（WC2026等）
    targetRounds = league.rounds;
    console.log(
      `[sync] ${league.nameJp}: fetchAllRounds=true、全${targetRounds.length}ラウンドを取得（season=${season}）`,
    );
  } else {
    // 現在ラウンドを推定
    const { currentRound, fromNext } = await fetchCurrentRound(league.id);
    await sleep(400);

    if (currentRound === null) {
      // ラウンド推定失敗 → rounds 配列の後半 FALLBACK_COUNT ラウンドを試行
      console.warn(`[sync] ${league.nameJp}: ラウンド推定失敗、後半${FALLBACK_COUNT}ラウンドを試行`);
      const allRounds = league.rounds;
      targetRounds = allRounds.slice(-FALLBACK_COUNT);
    } else {
      const maxRound = Math.max(...league.rounds);
      const minRound = Math.min(...league.rounds);

      if (fromNext) {
        // next から取得: 現在ラウンドを中心に前後を取得
        targetRounds = [];
        for (let r = currentRound - WINDOW_BACK; r <= currentRound + WINDOW_FORWARD; r++) {
          if (r >= minRound && r <= maxRound) targetRounds.push(r);
        }
        console.log(
          `[sync] ${league.nameJp}: next=R${currentRound}、ラウンド${targetRounds[0]}〜${targetRounds[targetRounds.length - 1]}を取得`,
        );
      } else {
        // past のみ: 直近の過去ラウンドから前後を取得（少し前寄りに調整）
        targetRounds = [];
        for (let r = currentRound - WINDOW_BACK; r <= currentRound + WINDOW_FORWARD; r++) {
          if (r >= minRound && r <= maxRound) targetRounds.push(r);
        }
        console.log(
          `[sync] ${league.nameJp}: past=R${currentRound}（next未取得）、ラウンド${targetRounds[0]}〜${targetRounds[targetRounds.length - 1]}を取得`,
        );
      }
    }
  }

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

  const fetched = allEvents.length;
  const upserted = await upsertEvents(db, league, allEvents, errors);
  return { fetched, upserted };
}

/**
 * リーグ 1 つを同期する。
 * - euro_league: 現在ラウンド ±3 節（計最大7ラウンド）を eventsround.php で取得
 * - cup / uefa / national_team: 同様に eventsround.php で取得
 *   ただし、シーズン終了済み（next=0, past のラウンドが R200 等）の場合は
 *   past の試合のみを保存して終了
 */
export async function syncOneLeague(
  league: LeagueDef,
): Promise<{ fetched: number; upserted: number; errors: string[] }> {
  const db = await getDb();
  if (!db) return { fetched: 0, upserted: 0, errors: ["DB unavailable"] };
  const errors: string[] = [];

  if (league.category === "euro_league" || league.category === "world_cup") {
    // euro_league / world_cup: ラウンドベース取得
    const { fetched, upserted } = await syncByRound(league, db, errors);
    return { fetched, upserted, errors };
  } else {
    // cup / uefa / national_team
    // next/past を確認して、試合があればラウンドベース取得
    // next=0 かつ past のラウンドが R200 等（決勝のみ）の場合はシーズン終了とみなし past のみ保存
    const [nextRes, pastRes] = await Promise.allSettled([
      fetchNextLeagueEvents(league.id),
      fetchPastLeagueEvents(league.id),
    ]);
    const nextEvents = nextRes.status === "fulfilled" ? nextRes.value : [];
    const pastEvents = pastRes.status === "fulfilled" ? pastRes.value : [];

    // next がある場合、または past のラウンドが通常ラウンド範囲内の場合はラウンドベース取得
    // R0 は「ラウンド未設定」を意味する無効値なので除外する
    const pastRound =
      pastEvents.length > 0 && pastEvents[0].intRound
        ? parseInt(pastEvents[0].intRound, 10)
        : null;
    const nextRound =
      nextEvents.length > 0 && nextEvents[0].intRound
        ? parseInt(nextEvents[0].intRound, 10)
        : null;

    // 決勝ラウンド（R200以上）が終了済みの場合のみシーズン終了とみなす
    // R125=QF, R150=SF, R160=F は次のラウンドがあるため通常取得を継続する
    // ※ TheSportsDB の UEFA ラウンド定義: 1-8=グループ, 125=QF, 150=SF, 160=F, 200=決勝
    const isFinalRound = (r: number | null) => r !== null && r >= 200;
    // next が R0（無効）の場合は「next なし」と同じ扱い
    const hasValidNext = nextEvents.length > 0 && nextRound !== null && nextRound > 0;

    if (!hasValidNext && isFinalRound(pastRound)) {
      // 決勝終了済み → past の試合を保存して終了
      console.log(
        `[sync] ${league.nameJp}: 決勝終了済み（R${pastRound}）、past のみ保存`,
      );
      const all = [...nextEvents, ...pastEvents];
      const fetched = all.length;
      const upserted = await upsertEvents(db, league, all, errors);
      return { fetched, upserted, errors };
    }

    // 通常のラウンドベース取得
    await sleep(200); // next/past を既に取得済みなので少し待機
    const { fetched, upserted } = await syncByRound(league, db, errors);
    return { fetched, upserted, errors };
  }
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
