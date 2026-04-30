import { and, asc, between, desc, eq, like, lt, gte, lte, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, matches, syncLog, users } from "../drizzle/schema";
import type { Match } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ---------- 試合データクエリ ----------

export interface MatchListParams {
  category: "euro_league" | "cup" | "uefa" | "national_team" | "japanese_player";
  /** scope: upcoming = 直近, past = 終了済み */
  scope: "upcoming" | "past";
  /** UTC ms。指定なしならサーバー現在時刻 */
  nowUtcMs?: number;
  limit?: number;
}

export async function listMatches(params: MatchListParams): Promise<Match[]> {
  const db = await getDb();
  if (!db) return [];

  const now = params.nowUtcMs ?? Date.now();
  // 直近未来は今後14日間, 過去は直近21日間を取得
  const FUTURE_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;
  const PAST_WINDOW_MS = 21 * 24 * 60 * 60 * 1000;
  const limit = params.limit ?? 1000;

  // category 条件
  let categoryCondition;
  if (params.category === "japanese_player") {
    categoryCondition = like(matches.tags, "%japanese_player%");
  } else {
    categoryCondition = eq(matches.category, params.category);
  }

  // 時刻範囲
  const timeCondition =
    params.scope === "upcoming"
      ? and(gte(matches.kickoffUtcMs, now - 4 * 60 * 60 * 1000), lte(matches.kickoffUtcMs, now + FUTURE_WINDOW_MS))
      : and(gte(matches.kickoffUtcMs, now - PAST_WINDOW_MS), lt(matches.kickoffUtcMs, now - 4 * 60 * 60 * 1000));

  const where = and(categoryCondition, timeCondition);
  const orderCol =
    params.scope === "upcoming" ? asc(matches.kickoffUtcMs) : desc(matches.kickoffUtcMs);

  const rows = await db.select().from(matches).where(where).orderBy(orderCol).limit(limit);
  return rows;
}

/**
 * 指定チーム名の試合一覧を取得（お気に入りチーム用）
 */
export async function listMatchesForTeams(
  teamNames: string[],
  scope: "upcoming" | "past",
  nowUtcMs?: number,
): Promise<Match[]> {
  const db = await getDb();
  if (!db || teamNames.length === 0) return [];
  const now = nowUtcMs ?? Date.now();
  const FUTURE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // 30日
  const PAST_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;   // 14日
  const timeCondition =
    scope === "upcoming"
      ? and(gte(matches.kickoffUtcMs, now - 4 * 60 * 60 * 1000), lte(matches.kickoffUtcMs, now + FUTURE_WINDOW_MS))
      : and(gte(matches.kickoffUtcMs, now - PAST_WINDOW_MS), lt(matches.kickoffUtcMs, now - 4 * 60 * 60 * 1000));
  // homeTeam OR awayTeam が対象チームのいずれかに一致
  const teamConditions = or(
    ...teamNames.flatMap((t) => [eq(matches.homeTeam, t), eq(matches.awayTeam, t)]),
  );
  const where = and(teamConditions, timeCondition);
  const orderCol = scope === "upcoming" ? asc(matches.kickoffUtcMs) : desc(matches.kickoffUtcMs);
  return db.select().from(matches).where(where).orderBy(orderCol).limit(500);
}

export async function getLatestSyncInfo() {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(syncLog).orderBy(desc(syncLog.id)).limit(1);
  return rows[0] ?? null;
}
