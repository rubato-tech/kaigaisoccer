import {
  bigint,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * 試合データキャッシュテーブル
 * TheSportsDBから取得した試合データを保存。
 * kickoffUtcMs はUTCのUNIXミリ秒で保持し、表示時にJSTに変換。
 */
export const matches = mysqlTable(
  "matches",
  {
    /** TheSportsDB の idEvent をそのままPKとして利用 */
    eventId: varchar("eventId", { length: 32 }).primaryKey(),
    /** 内部カテゴリ: euro_league(欧州主要リーグ), cup(各国カップ戦), uefa(CL/EL/ECL), national_team(代表戦) */
    category: mysqlEnum("category", ["euro_league", "cup", "uefa", "national_team"]).notNull(),
    /** TheSportsDB の idLeague */
    leagueId: varchar("leagueId", { length: 16 }).notNull(),
    /** リーグ表示名（日本語） */
    leagueNameJp: varchar("leagueNameJp", { length: 64 }).notNull(),
    /** リーグ原語名 */
    leagueNameEn: varchar("leagueNameEn", { length: 128 }).notNull(),
    leagueBadge: text("leagueBadge"),
    season: varchar("season", { length: 16 }),
    round: varchar("round", { length: 16 }),

    homeTeamId: varchar("homeTeamId", { length: 16 }),
    homeTeam: varchar("homeTeam", { length: 128 }).notNull(),
    homeTeamBadge: text("homeTeamBadge"),
    awayTeamId: varchar("awayTeamId", { length: 16 }),
    awayTeam: varchar("awayTeam", { length: 128 }).notNull(),
    awayTeamBadge: text("awayTeamBadge"),

    /** UTC キックオフ時刻（UNIX ミリ秒） */
    kickoffUtcMs: bigint("kickoffUtcMs", { mode: "number" }).notNull(),
    /** 試合ステータス: scheduled / live / finished / postponed / cancelled */
    status: varchar("status", { length: 32 }).notNull().default("scheduled"),
    homeScore: int("homeScore"),
    awayScore: int("awayScore"),
    venue: varchar("venue", { length: 256 }),

    /** カンマ区切りの追加タグ。日本人選手出場試合の判定などに使用 */
    tags: varchar("tags", { length: 256 }),

    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    kickoffIdx: index("idx_matches_kickoff").on(table.kickoffUtcMs),
    categoryIdx: index("idx_matches_category").on(table.category, table.kickoffUtcMs),
    leagueIdx: index("idx_matches_league").on(table.leagueId, table.kickoffUtcMs),
  }),
);

export type Match = typeof matches.$inferSelect;
export type InsertMatch = typeof matches.$inferInsert;

/**
 * 同期ログ
 */
export const syncLog = mysqlTable("sync_log", {
  id: int("id").autoincrement().primaryKey(),
  source: varchar("source", { length: 64 }).notNull(),
  status: varchar("status", { length: 32 }).notNull(),
  fetchedCount: int("fetchedCount").default(0).notNull(),
  upsertedCount: int("upsertedCount").default(0).notNull(),
  message: text("message"),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  finishedAt: timestamp("finishedAt"),
});

export type SyncLog = typeof syncLog.$inferSelect;
export type InsertSyncLog = typeof syncLog.$inferInsert;

/**
 * お気に入りチームテーブル
 * ユーザーごとにお気に入り登録したチーム名（TheSportsDB英語名）を保存。
 */
export const favorites = mysqlTable(
  "favorites",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    /** TheSportsDB のチーム名（strHomeTeam/strAwayTeamに一致する英語名） */
    teamName: varchar("teamName", { length: 128 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    userTeamIdx: index("idx_favorites_user_team").on(table.userId, table.teamName),
  }),
);

export type Favorite = typeof favorites.$inferSelect;
export type InsertFavorite = typeof favorites.$inferInsert;
