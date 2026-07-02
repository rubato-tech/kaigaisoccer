/**
 * GitHub Actions から直接 Railway MySQL に書き込む同期スクリプト。
 *
 * 使い方:
 *   DATABASE_URL=mysql://... tsx scripts/sync-direct.ts
 *   DATABASE_URL=mysql://... tsx scripts/sync-direct.ts --league 4480
 *   DATABASE_URL=mysql://... tsx scripts/sync-direct.ts --league 4480,4481,5071
 *
 * 特徴:
 * - サーバー（kaigaisoccer.com）を経由しないため HTTP タイムアウトなし
 * - リーグを 1 つずつ順番に処理してレート制限（429）を回避
 * - 既存の syncMatches.ts / sportsDb.ts ロジックをそのまま再利用
 * - WC2026 は worldcup26.ir API から全104試合を取得（TheSportsDB 代替）
 */

// tsconfig.json の include に scripts/ が含まれていないため、
// パスエイリアス @shared/* は使えない。相対パスで直接 import する。
import { LEAGUES, LEAGUE_BY_ID } from "../shared/leagues.js";
import { syncOneLeague } from "../server/syncMatches.js";
import { getDb } from "../server/db.js";
import { syncLog, matches } from "../drizzle/schema.js";
import { eq, and } from "drizzle-orm";

// 環境変数チェック
if (!process.env.DATABASE_URL) {
  console.error("[sync-direct] ERROR: DATABASE_URL が設定されていません");
  process.exit(1);
}

// ─────────────────────────────────────────────
// WC2026 専用: worldcup26.ir API から全試合取得
// ─────────────────────────────────────────────

interface Wc26Game {
  id: string;
  home_team_id: string;
  away_team_id: string;
  home_score: string;
  away_score: string;
  group: string;
  matchday: string;
  local_date: string; // "06/11/2026 13:00" (UTC)
  stadium_id: string;
  finished: string;
  time_elapsed: string;
  type: string; // "group" | "r32" | "r16" | "qf" | "sf" | "final" | "third"
  home_team_name_en?: string;
  away_team_name_en?: string;
  home_team_label?: string;
  away_team_label?: string;
}

interface Wc26Team {
  id: string;
  name_en: string;
  flag: string; // "https://flagcdn.com/w80/mx.png"
  fifa_code: string;
}

interface Wc26Stadium {
  id: string;
  name_en: string;
  city_en: string;
  country_en: string;
}

async function fetchWc26Data(): Promise<{
  games: Wc26Game[];
  teams: Map<string, Wc26Team>;
  stadiums: Map<string, Wc26Stadium>;
}> {
  const BASE = "https://worldcup26.ir/get";
  const RAW = "https://raw.githubusercontent.com/rezarahiminia/worldcup2026/main";

  // ライブデータ（スコア・チーム確定状況）
  const gamesResp = await fetch(`${BASE}/games`);
  if (!gamesResp.ok) throw new Error(`worldcup26.ir /get/games failed: ${gamesResp.status}`);
  const gamesJson = await gamesResp.json() as { games: Wc26Game[] };
  const games = gamesJson.games ?? [];

  // チームデータ（バッジURL取得のため）
  const teamsResp = await fetch(`${RAW}/football.teams.json`);
  if (!teamsResp.ok) throw new Error(`football.teams.json failed: ${teamsResp.status}`);
  const teamsArr = await teamsResp.json() as Wc26Team[];
  const teams = new Map(teamsArr.map((t) => [t.id, t]));

  // スタジアムデータ
  const stadiumsResp = await fetch(`${RAW}/football.stadiums.json`);
  if (!stadiumsResp.ok) throw new Error(`football.stadiums.json failed: ${stadiumsResp.status}`);
  const stadiumsArr = await stadiumsResp.json() as Wc26Stadium[];
  const stadiums = new Map(stadiumsArr.map((s) => [s.id, s]));

  return { games, teams, stadiums };
}

/**
 * WC2026開催地のタイムゾーンオフセット（UTCからの差分）
 * worldcup26.ir の local_date は開催地の現地時間で記録されている
 *
 * スタジアムID対応表（worldcup26.irのid）:
 * 1: Estadio Azteca, Mexico City (CDT = UTC-5)
 * 2: Estadio Akron, Guadalajara (CDT = UTC-5)
 * 3: Estadio BBVA, Monterrey (CDT = UTC-5)
 * 4: AT&T Stadium, Dallas (CDT = UTC-5)
 * 5: NRG Stadium, Houston (CDT = UTC-5)
 * 6: GEHA Field at Arrowhead Stadium, Kansas City (CDT = UTC-5)
 * 7: Mercedes-Benz Stadium, Atlanta (EDT = UTC-4)
 * 8: Hard Rock Stadium, Miami (EDT = UTC-4)
 * 9: Gillette Stadium, Boston (EDT = UTC-4)
 * 10: Lincoln Financial Field, Philadelphia (EDT = UTC-4)
 * 11: MetLife Stadium, New York (EDT = UTC-4)
 * 12: BMO Field, Toronto (EDT = UTC-4)
 * 13: BC Place, Vancouver (PDT = UTC-7)
 * 14: Lumen Field, Seattle (PDT = UTC-7)
 * 15: Levi's Stadium, San Francisco (PDT = UTC-7)
 * 16: SoFi Stadium, Los Angeles (PDT = UTC-7)
 */
const STADIUM_UTC_OFFSET: Record<string, number> = {
  "1": -5, // Mexico City (CDT)
  "2": -5, // Guadalajara (CDT)
  "3": -5, // Monterrey (CDT)
  "4": -5, // Dallas (CDT)
  "5": -5, // Houston (CDT)
  "6": -5, // Kansas City (CDT)
  "7": -4, // Atlanta (EDT)
  "8": -4, // Miami (EDT)
  "9": -4, // Boston (EDT)
  "10": -4, // Philadelphia (EDT)
  "11": -4, // New York (EDT)
  "12": -4, // Toronto (EDT)
  "13": -7, // Vancouver (PDT)
  "14": -7, // Seattle (PDT)
  "15": -7, // San Francisco (PDT)
  "16": -7, // Los Angeles (PDT)
};

/** "06/11/2026 13:00" (開催地現地時間) + stadiumId → UNIX ms (UTC)
 * worldcup26.ir の local_date は各スタジアムの現地時間で記録されている
 */
function parseLocalDate(localDate: string, stadiumId?: string): number {
  // format: MM/DD/YYYY HH:mm
  const m = localDate.match(/^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})$/);
  if (!m) return 0;
  const [, mo, dd, yyyy, hh, mm] = m;
  // スタジアムのタイムゾーンオフセット（不明な場合はEDT=-4をデフォルト）
  const offsetHours = stadiumId ? (STADIUM_UTC_OFFSET[stadiumId] ?? -4) : -4;
  // 現地時間 - offset = UTC時間
  // 例: 19:00 EDT(UTC-4) → UTC = 19:00 - (-4) = 23:00
  const localMs = Date.UTC(parseInt(yyyy), parseInt(mo) - 1, parseInt(dd), parseInt(hh), parseInt(mm));
  return localMs - offsetHours * 60 * 60 * 1000;
}

/** WC2026 の試合タイプ → ラウンド文字列 */
function typeToRound(type: string, matchday: string): string {
  switch (type) {
    case "group": return matchday;
    case "r32": return "R32";
    case "r16": return "R16";
    case "qf": return "QF";
    case "sf": return "SF";
    case "final": return "Final";
    case "third": return "3rd";
    default: return matchday;
  }
}

/** WC2026 の試合ステータス */
function parseStatus(game: Wc26Game): string {
  if (game.finished === "TRUE" || game.time_elapsed === "finished") return "finished";
  if (game.time_elapsed && game.time_elapsed !== "notstarted" && game.time_elapsed !== "finished") return "live";
  return "scheduled";
}

async function syncWc2026(db: Awaited<ReturnType<typeof getDb>>): Promise<{ fetched: number; upserted: number; errors: string[] }> {
  const errors: string[] = [];
  let upserted = 0;

  console.log("[sync-direct] WC2026: worldcup26.ir API からデータ取得中...");
  const { games, teams, stadiums } = await fetchWc26Data();
  console.log(`[sync-direct] WC2026: ${games.length} 試合取得`);

  if (!db) {
    errors.push("DB接続なし");
    return { fetched: games.length, upserted: 0, errors };
  }

  for (const game of games) {
    try {
      const homeTeam = teams.get(game.home_team_id);
      const awayTeam = teams.get(game.away_team_id);
      const stadium = stadiums.get(game.stadium_id);

      // チーム名（未確定の場合はラベルを使用）
      const homeTeamName = game.home_team_name_en
        ?? homeTeam?.name_en
        ?? game.home_team_label
        ?? "TBD";
      const awayTeamName = game.away_team_name_en
        ?? awayTeam?.name_en
        ?? game.away_team_label
        ?? "TBD";

      // バッジURL（flagcdn.com）
      const homeTeamBadge = homeTeam?.flag ?? null;
      const awayTeamBadge = awayTeam?.flag ?? null;

      const kickoffUtcMs = parseLocalDate(game.local_date, game.stadium_id);
      if (!kickoffUtcMs) {
        errors.push(`game ${game.id}: invalid date ${game.local_date}`);
        continue;
      }

      const status = parseStatus(game);
      const homeScore = status !== "scheduled" && game.home_score !== "0" ? parseInt(game.home_score) : null;
      const awayScore = status !== "scheduled" && game.away_score !== "0" ? parseInt(game.away_score) : null;
      // 0-0 finished の場合は 0 を保持
      const homeScoreFinal = status === "finished" ? parseInt(game.home_score) : (status === "scheduled" ? null : parseInt(game.home_score));
      const awayScoreFinal = status === "finished" ? parseInt(game.away_score) : (status === "scheduled" ? null : parseInt(game.away_score));

      const venue = stadium ? `${stadium.name_en}, ${stadium.city_en}` : null;
      const round = typeToRound(game.type, game.matchday);

      const eventId = `wc2026_${game.id}`;

      await db
        .insert(matches)
        .values({
          eventId,
          category: "world_cup",
          leagueId: "4429",
          leagueNameJp: "ワールドカップ2026",
          leagueNameEn: "FIFA World Cup 2026",
          leagueBadge: "https://r2.thesportsdb.com/images/media/league/badge/e7er5g1696521789.png",
          season: "2026",
          round,
          homeTeamId: game.home_team_id !== "0" ? game.home_team_id : null,
          homeTeam: homeTeamName,
          homeTeamBadge,
          awayTeamId: game.away_team_id !== "0" ? game.away_team_id : null,
          awayTeam: awayTeamName,
          awayTeamBadge,
          kickoffUtcMs,
          status,
          homeScore: homeScoreFinal ?? null,
          awayScore: awayScoreFinal ?? null,
          venue,
          tags: null,
        })
        .onDuplicateKeyUpdate({
          set: {
            homeTeam: homeTeamName,
            homeTeamBadge,
            awayTeam: awayTeamName,
            awayTeamBadge,
            kickoffUtcMs,
            status,
            homeScore: homeScoreFinal ?? null,
            awayScore: awayScoreFinal ?? null,
            venue,
            round,
          },
        });

      upserted++;
    } catch (err) {
      errors.push(`game ${game.id}: ${(err as Error).message}`);
    }
  }

  // TheSportsDB 由来の古い WC2026 データ（eventId が数字のみ）を削除して重複を防ぐ
  try {
    const oldRows = await db
      .select({ eventId: matches.eventId })
      .from(matches)
      .where(and(eq(matches.category, "world_cup"), eq(matches.leagueId, "4429")));
    const oldIds = oldRows
      .map((r) => r.eventId)
      .filter((id) => !id.startsWith("wc2026_"));
    if (oldIds.length > 0) {
      console.log(`[sync-direct] WC2026: TheSportsDB由来の古いデータ ${oldIds.length} 件を削除`);
      for (const id of oldIds) {
        await db.delete(matches).where(eq(matches.eventId, id));
      }
    }
  } catch (err) {
    console.warn("[sync-direct] WC2026: 古いデータ削除失敗:", (err as Error).message);
  }

  return { fetched: games.length, upserted, errors };
}

// ─────────────────────────────────────────────
// コマンドライン引数処理
// ─────────────────────────────────────────────

function getLeagueArg(): string | null {
  const eqForm = process.argv.find((a) => a.startsWith("--league="));
  if (eqForm) return eqForm.split("=")[1];
  const idx = process.argv.indexOf("--league");
  if (idx !== -1 && idx + 1 < process.argv.length) return process.argv[idx + 1];
  return null;
}

const leagueArg = getLeagueArg();
const isWc2026Only = leagueArg === "wc2026";

// WC2026 専用モード: --league wc2026
// 通常モード: TheSportsDB 経由の全リーグ（WC2026 は除外）
const targetLeagues = (() => {
  if (isWc2026Only) return [];
  if (leagueArg) {
    const ids = leagueArg.split(",").map((s) => s.trim()).filter(Boolean);
    return ids.map((id) => {
      const league = LEAGUE_BY_ID.get(id);
      if (!league) console.warn(`[sync-direct] 警告: リーグID ${id} は定義されていません（スキップ）`);
      return league;
    }).filter((l): l is NonNullable<typeof l> => l != null);
  }
  // 全リーグから WC2026 を除外（worldcup26.ir で別途処理）
  return LEAGUES.filter((l) => !(l.category === "world_cup" && l.fixedSeason === "2026"));
})();

console.log(`[sync-direct] 開始時刻: ${new Date().toISOString()}`);
if (isWc2026Only) {
  console.log("[sync-direct] モード: WC2026専用（worldcup26.ir API）");
} else {
  console.log(`[sync-direct] 対象リーグ: ${targetLeagues.map((l) => l.nameJp).join(", ")}`);
}

const startedAt = new Date();
let totalFetched = 0;
let totalUpserted = 0;
const allErrors: string[] = [];

const db = await getDb();

// マイグレーション: category カラムに world_cup を追加（冪等・エラー無視）
if (db) {
  try {
    await db.execute(
      "ALTER TABLE `matches` MODIFY COLUMN `category` enum('euro_league','cup','uefa','national_team','world_cup') NOT NULL" as unknown as import('drizzle-orm').SQL,
    );
    console.log("[sync-direct] マイグレーション完了: category に world_cup を追加");
  } catch (err) {
    console.warn("[sync-direct] マイグレーションスキップ（既適用または権限なし）:", (err as Error).message);
  }
}

let logId: number | null = null;
if (db) {
  try {
    await db.insert(syncLog).values({
      source: "github-actions-direct",
      status: "running",
      fetchedCount: 0,
      upsertedCount: 0,
      startedAt,
    });
    const allRows = await db.select({ id: syncLog.id }).from(syncLog);
    logId = allRows.length > 0 ? Math.max(...allRows.map((r) => r.id)) : null;
    console.log(`[sync-direct] sync_log 開始記録: logId=${logId}`);
  } catch (err) {
    console.warn("[sync-direct] sync_log 開始記録失敗:", err);
  }
}

// ─── WC2026 を worldcup26.ir から取得 ───
console.log("\n[sync-direct] ===== ワールドカップ2026 (worldcup26.ir) =====");
try {
  const result = await syncWc2026(db);
  totalFetched += result.fetched;
  totalUpserted += result.upserted;
  allErrors.push(...result.errors);
  console.log(
    `[sync-direct] WC2026: fetched=${result.fetched} upserted=${result.upserted} errors=${result.errors.length}`,
  );
  if (result.errors.length > 0) {
    result.errors.slice(0, 5).forEach((e) => console.warn(`  [error] ${e}`));
  }
} catch (err) {
  const msg = `WC2026: ${(err as Error).message}`;
  console.error(`[sync-direct] ERROR: ${msg}`);
  allErrors.push(msg);
}

// ─── TheSportsDB リーグを順番に処理 ───
if (!isWc2026Only) {
  for (const league of targetLeagues) {
    console.log(`\n[sync-direct] ===== ${league.nameJp} (${league.id}) =====`);
    try {
      const result = await syncOneLeague(league);
      totalFetched += result.fetched;
      totalUpserted += result.upserted;
      allErrors.push(...result.errors);
      console.log(
        `[sync-direct] ${league.nameJp}: fetched=${result.fetched} upserted=${result.upserted} errors=${result.errors.length}`,
      );
      if (result.errors.length > 0) {
        result.errors.forEach((e) => console.warn(`  [error] ${e}`));
      }
    } catch (err) {
      const msg = `${league.nameJp} (${league.id}): ${(err as Error).message}`;
      console.error(`[sync-direct] ERROR: ${msg}`);
      allErrors.push(msg);
    }

    if (targetLeagues.indexOf(league) < targetLeagues.length - 1) {
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}

// sync_log に完了記録
console.log(`[sync-direct] sync_log 完了記録: logId=${logId}`);
if (db && logId != null) {
  try {
    await db
      .update(syncLog)
      .set({
        status: allErrors.length > 0 ? "partial" : "success",
        fetchedCount: totalFetched,
        upsertedCount: totalUpserted,
        finishedAt: new Date(),
        message:
          allErrors.length > 0
            ? allErrors.slice(0, 5).join(" | ").slice(0, 500)
            : null,
      })
      .where(eq(syncLog.id, logId));
  } catch (err) {
    console.warn("[sync-direct] sync_log 完了記録失敗:", err);
  }
}

console.log(`\n[sync-direct] ===== 完了 =====`);
console.log(`[sync-direct] 終了時刻: ${new Date().toISOString()}`);
console.log(`[sync-direct] 合計: fetched=${totalFetched} upserted=${totalUpserted} errors=${allErrors.length}`);

if (allErrors.length > 0) {
  console.warn(`[sync-direct] エラー一覧:`);
  allErrors.forEach((e) => console.warn(`  - ${e}`));
  if (totalUpserted === 0 && totalFetched === 0) {
    process.exit(1);
  }
}

process.exit(0);
