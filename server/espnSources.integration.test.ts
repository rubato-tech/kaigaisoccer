import { describe, expect, it } from "vitest";
import { ESPN_EURO_LEAGUES, fetchEspnLeagueSchedule } from "../scripts/espnPremierLeague";

// 外部APIを34回呼ぶため、通常の回帰テストでは実行せず明示的な監査時だけ実行する。
// 実行例: RUN_EXTERNAL_INTEGRATION=1 pnpm exec vitest run server/espnSources.integration.test.ts
const describeExternal = process.env.RUN_EXTERNAL_INTEGRATION === "1" ? describe : describe.skip;

describeExternal("ESPN公開日程ソース", () => {
  it("全優先同期対象が想定件数または同期下限を満たす", async () => {
    // ESPNは多数の年別日程リクエストを同時に受けると一時的に失敗することがある。
    // 本番同期と同じ逐次取得で、各大会のソース可用性を検証する。
    const results: Array<{ league: typeof ESPN_EURO_LEAGUES[number]; ok: boolean; count: number }> = [];
    for (const league of ESPN_EURO_LEAGUES) {
      try {
        const events = await fetchEspnLeagueSchedule(league);
        results.push({ league, ok: true, count: events.length });
      } catch {
        results.push({ league, ok: false, count: 0 });
      }
    }

    for (const { league, ok, count } of results) {
      expect(ok, `${league.nameJp}: API応答`).toBe(true);
      if (league.expectedFixtures !== undefined) {
        expect(count, `${league.nameJp}: 全日程件数`).toBe(league.expectedFixtures);
      }
      if (league.minimumFixtures !== undefined) {
        expect(count, `${league.nameJp}: 公開済み日程件数`).toBeGreaterThanOrEqual(league.minimumFixtures);
      }
    }
  }, 120000);
});
