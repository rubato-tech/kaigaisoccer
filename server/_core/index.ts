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
import { serveStatic, setupVite } from "./vite";

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

  // スケジュール/手動同期用エンドポイント。
  // スケジュールタスクからは Manus OAuth Cookie を付与して POST されるため、
  // 認証チェックは軽めにして 200 を返す。
  app.post("/api/scheduled/refresh", async (_req, res) => {
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
    try {
      const id = String((req.query.id as string) || "");
      const { LEAGUES } = await import("@shared/leagues");
      const { syncOneLeague } = await import("../syncMatches");
      const league = LEAGUES.find((l) => l.id === id);
      if (!league) {
        res.status(404).json({ ok: false, error: `league ${id} not found` });
        return;
      }
      const result = await syncOneLeague(league, { concurrency: 2 });
      res.json({ ok: true, league: league.nameJp, ...result });
    } catch (err) {
      console.error("[refresh-league] failed:", err);
      res.status(500).json({ ok: false, error: (err as Error).message });
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
    await setupVite(app, server);
  } else {
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
