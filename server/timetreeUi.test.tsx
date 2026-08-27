import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Match } from "../drizzle/schema";
import { MatchScheduleTable } from "../client/src/components/MatchScheduleTable";

const scheduledMatch = {
  eventId: "fixture-timetree",
  category: "euro_league",
  leagueId: "4328",
  leagueNameJp: "プレミアリーグ",
  leagueNameEn: "English Premier League",
  season: "2026-2027",
  homeTeam: "Brighton & Hove Albion",
  awayTeam: "Aston Villa",
  kickoffUtcMs: Date.UTC(2026, 7, 23, 13, 0, 0),
  status: "scheduled",
  createdAt: new Date(),
  updatedAt: new Date(),
} as Match;

describe("TimeTree追加UI", () => {
  it("予定試合にGoogleとTimeTreeの別々の追加導線を表示する", () => {
    const html = renderToStaticMarkup(
      <MatchScheduleTable matches={[scheduledMatch]} showScore={false} />,
    );

    expect(html).toContain("Google");
    expect(html).toContain("TimeTree");
    expect(html).toContain("TimeTree用のiCalendarファイルをダウンロード");
  });
});
