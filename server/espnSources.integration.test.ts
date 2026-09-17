import { describe, expect, it } from "vitest";
import { ESPN_EURO_LEAGUES, fetchEspnLeagueSchedule } from "../scripts/espnPremierLeague";

describe("ESPN公開日程ソース", () => {
  it("全優先同期対象が想定件数または同期下限を満たす", async () => {
    const results = await Promise.all(
      ESPN_EURO_LEAGUES.map(async (league) => {
        try {
          const events = await fetchEspnLeagueSchedule(league);
          return { league, ok: true, count: events.length };
        } catch {
          return { league, ok: false, count: 0 };
        }
      }),
    );

    for (const { league, ok, count } of results) {
      expect(ok, `${league.nameJp}: API応答`).toBe(true);
      if (league.expectedFixtures !== undefined) {
        expect(count, `${league.nameJp}: 全日程件数`).toBe(league.expectedFixtures);
      }
      if (league.minimumFixtures !== undefined) {
        expect(count, `${league.nameJp}: 公開済み日程件数`).toBeGreaterThanOrEqual(league.minimumFixtures);
      }
    }
  }, 60000);
});
