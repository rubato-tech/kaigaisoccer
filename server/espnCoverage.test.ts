import { describe, expect, it } from "vitest";
import {
  ESPN_EURO_LEAGUE_BY_ID,
  ESPN_EURO_LEAGUES,
  buildEspnScoreboardUrl,
} from "../scripts/espnPremierLeague";

describe("ESPN 2026-27大会カバレッジ", () => {
  it("全公開済みのリーグ戦・カップ戦・UEFA大会をESPN優先同期対象に含める", () => {
    const expectedIds = [
      "4328", "4335", "4332", "4331", "4334", "4330", "4337", "4338", "4344", "4339", "4329",
      "4570", "4506", "4485", "4480", "4481", "5071",
    ];

    expect(ESPN_EURO_LEAGUES).toHaveLength(expectedIds.length);
    expect(expectedIds.every((id) => ESPN_EURO_LEAGUE_BY_ID.has(id))).toBe(true);
    expect(ESPN_EURO_LEAGUE_BY_ID.get("4480")?.category).toBe("uefa");
    expect(ESPN_EURO_LEAGUE_BY_ID.get("4481")?.category).toBe("uefa");
    expect(ESPN_EURO_LEAGUE_BY_ID.get("4570")?.category).toBe("cup");
  });

  it("リーグ戦は完全件数、抽選進行中の大会は最低件数を検証してから同期する", () => {
    expect(ESPN_EURO_LEAGUE_BY_ID.get("4328")?.expectedFixtures).toBe(380);
    expect(ESPN_EURO_LEAGUE_BY_ID.get("4329")?.expectedFixtures).toBe(552);
    expect(ESPN_EURO_LEAGUE_BY_ID.get("4480")?.minimumFixtures).toBe(144);
    expect(ESPN_EURO_LEAGUE_BY_ID.get("4481")?.minimumFixtures).toBe(144);
    expect(ESPN_EURO_LEAGUE_BY_ID.get("5071")?.minimumFixtures).toBe(108);
    expect(ESPN_EURO_LEAGUE_BY_ID.get("4570")?.minimumFixtures).toBe(60);
  });

  it("対象大会ごとに2026-27シーズンの期間指定URLを生成する", () => {
    const url = buildEspnScoreboardUrl(ESPN_EURO_LEAGUE_BY_ID.get("4480")!);
    expect(url).toContain("uefa.champions");
    expect(url).toContain("dates=20260801-20270531");
    expect(url).toContain("limit=600");
  });
});
