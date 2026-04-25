import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

/**
 * matches.list の挙動：
 * - DB に接続できる環境では試合を返す
 * - 各レコードが必須フィールドを持つ
 * - upcoming/past でフィルタが効いている
 *
 * このテストは実 DB を必要とする。CI 等で DB が無い環境では skip される。
 */
function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

const dbAvailable = !!process.env.DATABASE_URL;
const cond = dbAvailable ? describe : describe.skip;

cond("matches.list (integration)", () => {
  it("returns upcoming euro league matches", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const out = await caller.matches.list({ category: "euro_league", scope: "upcoming" });
    expect(out).toHaveProperty("matches");
    expect(Array.isArray(out.matches)).toBe(true);
    if (out.matches.length === 0) return;
    const m = out.matches[0]!;
    expect(typeof m.eventId).toBe("string");
    expect(typeof m.homeTeam).toBe("string");
    expect(typeof m.awayTeam).toBe("string");
    expect(typeof m.leagueNameJp).toBe("string");
    expect(Number(m.kickoffUtcMs)).toBeGreaterThan(0);
    expect(Number(m.kickoffUtcMs)).toBeGreaterThan(Date.now() - 5 * 60 * 60 * 1000);
  });

  it("upcoming uefa matches all have category=uefa", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const out = await caller.matches.list({ category: "uefa", scope: "upcoming" });
    for (const m of out.matches) {
      expect(m.category).toBe("uefa");
    }
  });

  it("japanese_player view filters by tag", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const out = await caller.matches.list({ category: "japanese_player", scope: "upcoming" });
    for (const m of out.matches) {
      expect(m.tags ?? "").toContain("japanese_player");
    }
  });

  it("past matches all kicked off in the past", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const out = await caller.matches.list({ category: "euro_league", scope: "past" });
    for (const m of out.matches) {
      expect(Number(m.kickoffUtcMs)).toBeLessThan(Date.now());
    }
  });
});
