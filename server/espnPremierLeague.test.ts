import { describe, expect, it } from "vitest";
import {
  ESPN_EURO_LEAGUE_BY_ID,
  fetchEspnLeagueSchedule,
} from "../scripts/espnPremierLeague";

type EspnFixture = {
  date?: string;
  competitions?: Array<{
    competitors?: Array<{
      homeAway?: "home" | "away";
      team?: { displayName?: string };
    }>;
  }>;
};

describe("ESPN Premier League 2026-27 fixture source", () => {
  it("provides all 380 fixtures including the 23 August cards", async () => {
    const events = await fetchEspnLeagueSchedule(ESPN_EURO_LEAGUE_BY_ID.get("4328")!) as EspnFixture[];
    expect(events).toHaveLength(380);

    const hasFixture = (home: string, away: string) => events.some((event) => {
      const competitors = event.competitions?.[0]?.competitors ?? [];
      const homeTeam = competitors.find((team) => team.homeAway === "home")?.team?.displayName;
      const awayTeam = competitors.find((team) => team.homeAway === "away")?.team?.displayName;
      return homeTeam === home && awayTeam === away && event.date === "2026-08-23T13:00Z";
    });

    expect(hasFixture("Brighton & Hove Albion", "Aston Villa")).toBe(true);
    expect(hasFixture("Manchester City", "AFC Bournemouth")).toBe(true);
  }, 60000);
});
