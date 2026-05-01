import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { syncAllLeagues } from "../syncMatches";
// vite is dynamically imported to avoid bundling it in production build

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);

  // Simple health endpoint for Railway healthcheck (bypasses tRPC)
  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  // スケジュール/手動同期用エンドポイント。
  // スケジュールタスクからは Manus OAuth Cookie (user ロール) が付与されるため、
  // Cookie が存在すれば認証済みとみなして処理を実行する。
  app.post("/api/scheduled/refresh", async (req, res) => {
    // Cookie が存在するか確認（スケジュールタスクは自動的に Cookie を付与する）
    const cookieHeader = req.headers.cookie || "";
    if (!cookieHeader) {
      res.status(403).json({ ok: false, error: "permission error for cron cookie" });
      return;
    }
    try {
      const result = await syncAllLeagues();
      res.json({ ok: true, ...result });
    } catch (err) {
      console.error("[scheduled refresh] failed:", err);
      res.status(500).json({ ok: false, error: (err as Error).message });
    }
  });

  // リーグ 1 つだけ同期する (例: /api/scheduled/refresh-league?id=4480)
  app.post("/api/scheduled/refresh-league", async (req, res) => {
    const cookieHeader = req.headers.cookie || "";
    if (!cookieHeader) {
      res.status(403).json({ ok: false, error: "permission error for cron cookie" });
      return;
    }
    try {
      const id = String((req.query.id as string) || "");
      const { LEAGUES } = await import("@shared/leagues");
      const { syncOneLeague } = await import("../syncMatches");
      const league = LEAGUES.find((l) => l.id === id);
      if (!league) {
        res.status(404).json({ ok: false, error: `league ${id} not found` });
        return;
      }
      const result = await syncOneLeague(league);
      res.json({ ok: true, league: league.nameJp, ...result });
    } catch (err) {
      console.error("[refresh-league] failed:", err);
      res.status(500).json({ ok: false, error: (err as Error).message });
    }
  });
  // GitHub Actions 完了後に sync_log を更新するエンドポイント
  // リーグ別実行では sync_log が更新されないため、全リーグ完了後に呼び出す
  app.post("/api/scheduled/sync-log-finish", async (req, res) => {
    const cookieHeader = req.headers.cookie || "";
    if (!cookieHeader) {
      res.status(403).json({ ok: false, error: "permission error for cron cookie" });
      return;
    }
    try {
      const { getDb } = await import("../db");
      const { syncLog, matches: matchesTable } = await import("../../drizzle/schema");
      const { isNull, sql } = await import("drizzle-orm");
      const db = await getDb();
      if (!db) {
        res.status(500).json({ ok: false, error: "DB unavailable" });
        return;
      }
      // matches テーブルの件数を取得
      const countRows = await db.select({ cnt: sql<number>`COUNT(*)` }).from(matchesTable);
      const totalCount = Number(countRows[0]?.cnt ?? 0);
      // running 状態の sync_log を完了に更新
      const updated = await db.update(syncLog)
        .set({
          status: "success",
          fetchedCount: totalCount,
          upsertedCount: totalCount,
          finishedAt: new Date(),
        })
        .where(isNull(syncLog.finishedAt));
      // running レコードがなければ新規挿入
      const existing = await db.select().from(syncLog).orderBy(syncLog.id).limit(1);
      if (existing.length === 0) {
        const now = new Date();
        await db.insert(syncLog).values({
          source: "thesportsdb",
          status: "success",
          fetchedCount: totalCount,
          upsertedCount: totalCount,
          startedAt: now,
          finishedAt: now,
        });
      }
      res.json({ ok: true, totalCount });
    } catch (err) {
      console.error("[sync-log-finish] failed:", err);
      res.status(500).json({ ok: false, error: (err as Error).message });
    }
  });

  // iCalフィードエンドポイント（HMAC署名トークン方式で保護）
  app.get("/api/ical/:token", async (req, res) => {
    try {
      const { verifyIcalToken, buildIcal } = await import("../routers/favorites");
      const userId = verifyIcalToken(req.params.token);
      if (!userId) {
        res.status(403).send("Invalid or expired token");
        return;
      }
      const { eq } = await import("drizzle-orm");
      const { getDb, listMatchesForTeams } = await import("../db");
      const { favorites } = await import("../../drizzle/schema");
      const db = await getDb();
      if (!db) {
        res.status(503).send("Database unavailable");
        return;
      }
      const favRows = await db.select().from(favorites).where(eq(favorites.userId, userId));
      const teamNames = favRows.map((r: { teamName: string }) => r.teamName);
      const matches = teamNames.length > 0 ? await listMatchesForTeams(teamNames, "upcoming") : [];
      const ical = buildIcal(matches);
      res.setHeader("Content-Type", "text/calendar; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename=\"soccer-${userId}.ics\"`);
      res.send(ical);
    } catch (err) {
      console.error("[ical] error:", err);
      res.status(500).send("Internal Server Error");
    }
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    const { setupVite } = await import("./vite");
    await setupVite(app, server);
  } else {
    const { serveStatic } = await import("./vite");
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
