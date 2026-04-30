/**
 * お気に入りチーム管理 + iCalフィード生成ルーター
 *
 * iCal フィードは HMAC-SHA256 署名付きトークン方式で保護する。
 * - ログイン中ユーザーが `favorites.icalToken` を呼ぶと署名付きトークンを取得
 * - `/api/ical/:token` エンドポイントでトークンを検証してフィードを返す
 * - userId を直接 URL に含めないため、他人の favorites が漏洩しない
 */
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { createHmac } from "crypto";
import { getDb, listMatchesForTeams } from "../db";
import { favorites } from "../../drizzle/schema";
import { protectedProcedure, router } from "../_core/trpc";
import type { Match } from "../../drizzle/schema";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-change-me";

/** userId を HMAC-SHA256 で署名したトークンを生成 */
function signIcalToken(userId: number): string {
  const payload = `ical:${userId}`;
  const sig = createHmac("sha256", JWT_SECRET).update(payload).digest("hex");
  return Buffer.from(`${payload}.${sig}`).toString("base64url");
}

/** トークンを検証して userId を返す。不正なら null */
export function verifyIcalToken(token: string): number | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const lastDot = decoded.lastIndexOf(".");
    if (lastDot < 0) return null;
    const payload = decoded.slice(0, lastDot);
    const sig = decoded.slice(lastDot + 1);
    const expected = createHmac("sha256", JWT_SECRET).update(payload).digest("hex");
    if (sig !== expected) return null;
    const match = payload.match(/^ical:(\d+)$/);
    if (!match) return null;
    return parseInt(match[1], 10);
  } catch {
    return null;
  }
}

export const favoritesRouter = router({
  /** ログイン中ユーザーのお気に入りチーム一覧を取得 */
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    const rows = await db
      .select()
      .from(favorites)
      .where(eq(favorites.userId, ctx.user.id));
    return rows.map((r) => r.teamName);
  }),

  /** お気に入りチームを追加 */
  add: protectedProcedure
    .input(z.object({ teamName: z.string().min(1).max(128) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { success: false, added: false };
      const existing = await db
        .select()
        .from(favorites)
        .where(and(eq(favorites.userId, ctx.user.id), eq(favorites.teamName, input.teamName)));
      if (existing.length > 0) return { success: true, added: false };
      await db.insert(favorites).values({ userId: ctx.user.id, teamName: input.teamName });
      return { success: true, added: true };
    }),

  /** お気に入りチームを削除 */
  remove: protectedProcedure
    .input(z.object({ teamName: z.string().min(1).max(128) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { success: false };
      await db
        .delete(favorites)
        .where(and(eq(favorites.userId, ctx.user.id), eq(favorites.teamName, input.teamName)));
      return { success: true };
    }),

  /** お気に入りチームの今後の試合一覧を取得 */
  upcomingMatches: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    const favRows = await db
      .select()
      .from(favorites)
      .where(eq(favorites.userId, ctx.user.id));
    const teamNames = favRows.map((r) => r.teamName);
    if (teamNames.length === 0) return [];
    return listMatchesForTeams(teamNames, "upcoming");
  }),

  /**
   * iCal フィード用の署名付きトークンを取得する（ログイン必須）
   * フロントエンドはこのトークンを使って /api/ical/:token を呼ぶ
   */
  icalToken: protectedProcedure.query(({ ctx }) => {
    const token = signIcalToken(ctx.user.id);
    return { token };
  }),
});

/**
 * 試合データをiCal形式に変換する（外部からも利用可能）
 */
export function buildIcal(matches: Match[]): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//kaigaisoccer.com//Soccer Schedule//JA",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:海外サッカー日程",
    "X-WR-TIMEZONE:Asia/Tokyo",
  ];

  for (const m of matches) {
    const kickoffMs = Number(m.kickoffUtcMs);
    const dtstart = toIcalDate(kickoffMs);
    const dtend = toIcalDate(kickoffMs + 105 * 60 * 1000);

    lines.push(
      "BEGIN:VEVENT",
      `UID:${m.eventId}@kaigaisoccer.com`,
      `DTSTART:${dtstart}`,
      `DTEND:${dtend}`,
      `SUMMARY:${escapeIcal(`⚽ ${m.homeTeam} vs ${m.awayTeam}`)}`,
      `DESCRIPTION:${escapeIcal(m.leagueNameJp ?? m.leagueNameEn)}`,
      `LOCATION:${escapeIcal(m.venue ?? "")}`,
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

function toIcalDate(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`
  );
}

function escapeIcal(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}
