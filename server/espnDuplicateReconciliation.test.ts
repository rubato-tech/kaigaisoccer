import { describe, expect, it } from "vitest";
import {
  buildFixtureIdentity,
  normalizeFixtureTeamName,
  selectDuplicateFixtureIds,
  type FixtureIdentityRecord,
} from "../scripts/espnPremierLeague";

const fallbackFixture: FixtureIdentityRecord = {
  eventId: "2494047",
  leagueId: "4328",
  kickoffUtcMs: 1789758000000,
  homeTeam: "Brentford",
  awayTeam: "Chelsea",
};

const espnFixture: FixtureIdentityRecord = {
  ...fallbackFixture,
  eventId: "espn_4328_401879275",
};

describe("ESPN / TheSportsDB の重複試合整理", () => {
  it("ソース間のクラブ接尾辞・記号差を同一の対戦カードとして正規化する", () => {
    expect(normalizeFixtureTeamName("AFC Bournemouth")).toBe("bournemouth");
    expect(normalizeFixtureTeamName("Paris Saint-Germain")).toBe("parissaintgermain");
    expect(normalizeFixtureTeamName("Paris Saint Germain")).toBe("parissaintgermain");

    expect(buildFixtureIdentity({
      ...fallbackFixture,
      homeTeam: "AFC Bournemouth",
      awayTeam: "Paris Saint-Germain",
    })).toBe(buildFixtureIdentity({
      ...espnFixture,
      homeTeam: "Bournemouth FC",
      awayTeam: "Paris Saint Germain",
    }));
  });

  it("ESPNが正常取得できた場合はTheSportsDBの同一カードを削除対象にする", () => {
    const staleFallback = { ...fallbackFixture };
    const distinctFixture = {
      ...fallbackFixture,
      eventId: "2494048",
      awayTeam: "Arsenal",
    };

    expect(selectDuplicateFixtureIds(
      [staleFallback, espnFixture, distinctFixture],
      "espn",
    )).toEqual([staleFallback.eventId]);
  });

  it("ESPN障害時にフォールバックを同期した場合は古いESPN行を削除対象にする", () => {
    expect(selectDuplicateFixtureIds(
      [fallbackFixture, espnFixture],
      "fallback",
    )).toEqual([espnFixture.eventId]);
  });

  it("キックオフ時刻またはホーム・アウェーが異なる試合は削除しない", () => {
    const rescheduled = { ...espnFixture, kickoffUtcMs: espnFixture.kickoffUtcMs + 60_000 };
    const reversed = {
      ...espnFixture,
      eventId: "espn_4328_401879276",
      homeTeam: espnFixture.awayTeam,
      awayTeam: espnFixture.homeTeam,
    };

    expect(selectDuplicateFixtureIds(
      [fallbackFixture, rescheduled, reversed],
      "espn",
    )).toEqual([]);
  });
});
