import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { getLatestSyncInfo, listMatches } from "./db";
import { syncAllLeagues } from "./syncMatches";
import { favoritesRouter } from "./routers/favorites";

const categoryEnum = z.enum(["euro_league", "cup", "uefa", "national_team", "japanese_player", "favorites"]);
const scopeEnum = z.enum(["upcoming", "past"]);

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  matches: router({
    /** 試合一覧を取得（カテゴリ・スコープでフィルタ） */
    list: publicProcedure
      .input(
        z.object({
          category: categoryEnum,
          scope: scopeEnum,
        }),
      )
      .query(async ({ input }) => {
        // "favorites" カテゴリは favorites.upcomingMatches で処理するため空を返す
        if (input.category === "favorites") {
          return { matches: [], lastSync: null, serverNowMs: Date.now() };
        }
        const rows = await listMatches({
          category: input.category as "euro_league" | "cup" | "uefa" | "national_team" | "japanese_player",
          scope: input.scope,
        });
        const lastSync = await getLatestSyncInfo();
        return {
          matches: rows,
          lastSync,
          serverNowMs: Date.now(),
        };
      }),
    /** 全リーグ同期を手動トリガー（管理用） */
    refresh: publicProcedure.mutation(async () => {
      const result = await syncAllLeagues();
      return result;
    }),
  }),
  favorites: favoritesRouter,
});

export type AppRouter = typeof appRouter;
