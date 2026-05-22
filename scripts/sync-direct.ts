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
 */

// tsconfig.json の include に scripts/ が含まれていないため、
// パスエイリアス @shared/* は使えない。相対パスで直接 import する。
import { LEAGUES, LEAGUE_BY_ID } from "../shared/leagues.js";
import { syncOneLeague } from "../server/syncMatches.js";
import { getDb } from "../server/db.js";
import { syncLog } from "../drizzle/schema.js";
import { eq } from "drizzle-orm";

// 環境変数チェック
if (!process.env.DATABASE_URL) {
  console.error("[sync-direct] ERROR: DATABASE_URL が設定されていません");
  process.exit(1);
}

// コマンドライン引数から対象リーグを取得
// --league=4480,4481,5071 または --league 4480,4481,5071 のように指定可能
function getLeagueArg(): string | null {
  // --league=xxx 形式
  const eqForm = process.argv.find((a) => a.startsWith("--league="));
  if (eqForm) return eqForm.split("=")[1];
  // --league xxx 形式
  const idx = process.argv.indexOf("--league");
  if (idx !== -1 && idx + 1 < process.argv.length) return process.argv[idx + 1];
  return null;
}

const leagueArg = getLeagueArg();

const targetLeagueIds = leagueArg
  ? leagueArg.split(",").map((s) => s.trim()).filter(Boolean)
  : null;

const targetLeagues = targetLeagueIds
  ? targetLeagueIds.map((id) => {
      const league = LEAGUE_BY_ID.get(id);
      if (!league) {
        console.warn(`[sync-direct] 警告: リーグID ${id} は定義されていません（スキップ）`);
      }
      return league;
    }).filter((l): l is NonNullable<typeof l> => l != null)
  : LEAGUES;

if (targetLeagues.length === 0) {
  console.error("[sync-direct] ERROR: 処理対象のリーグがありません");
  process.exit(1);
}

console.log(`[sync-direct] 対象リーグ: ${targetLeagues.map((l) => l.nameJp).join(", ")}`);
console.log(`[sync-direct] 開始時刻: ${new Date().toISOString()}`);

const startedAt = new Date();
let totalFetched = 0;
let totalUpserted = 0;
const allErrors: string[] = [];

// sync_log に開始記録
const db = await getDb();

// マイグレーション: category カラムに world_cup を追加（冪等・エラー無視）
if (db) {
  try {
    await db.execute(
      "ALTER TABLE `matches` MODIFY COLUMN `category` enum('euro_league','cup','uefa','national_team','world_cup') NOT NULL" as unknown as import('drizzle-orm').SQL,
    );
    console.log("[sync-direct] マイグレーション完了: category に world_cup を追加");
  } catch (err) {
    // 既に適用済みの場合や権限エラーは無視して続行
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
    // TiDB/Railway では insertId が返らない場合があるため SELECT MAX(id) で取得
    const allRows = await db.select({ id: syncLog.id }).from(syncLog);
    logId = allRows.length > 0 ? Math.max(...allRows.map((r) => r.id)) : null;
    console.log(`[sync-direct] sync_log 開始記録: logId=${logId}`);
  } catch (err) {
    console.warn("[sync-direct] sync_log 開始記録失敗:", err);
  }
}

// リーグを 1 つずつ順番に処理（並列なし → 429 レート制限を回避）
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

  // リーグ間に 2 秒待機（レート制限対策）
  if (targetLeagues.indexOf(league) < targetLeagues.length - 1) {
    await new Promise((r) => setTimeout(r, 2000));
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
  // エラーがあっても exit 0（部分成功として扱う）
  // 全件失敗の場合のみ exit 1
  if (totalUpserted === 0 && totalFetched === 0) {
    process.exit(1);
  }
}

process.exit(0);
