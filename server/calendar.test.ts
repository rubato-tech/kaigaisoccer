import { describe, expect, it } from "vitest";
import type { Match } from "../drizzle/schema";
import {
  buildIcs,
  getTimeTreeImportMessage,
  TIMETREE_EXTERNAL_CALENDAR_HELP_URL,
} from "../client/src/lib/calendar";

const sampleMatch = {
  eventId: "fixture-123",
  leagueNameJp: "プレミアリーグ",
  round: "1",
  season: "2026-2027",
  homeTeam: "Brighton & Hove Albion",
  awayTeam: "Aston Villa",
  venue: "Amex Stadium",
  kickoffUtcMs: Date.UTC(2026, 7, 23, 13, 0, 0),
} as Match;

describe("TimeTree対応iCalendar", () => {
  it("TimeTreeで読み込める標準ICSに試合日時と識別子を出力する", () => {
    const ics = buildIcs([sampleMatch], "観戦予定");

    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("VERSION:2.0");
    expect(ics).toContain("UID:fixture-123@kaigaisoccer.com");
    expect(ics).toContain("DTSTART:20260823T130000Z");
    expect(ics).toContain("DTEND:20260823T150000Z");
    expect(ics).toContain("SUMMARY:⚽ Brighton & Hove Albion vs Aston Villa");
    expect(ics).toContain("END:VCALENDAR");
  });

  it("TimeTreeの外部カレンダー利用を案内する", () => {
    expect(getTimeTreeImportMessage(3)).toContain("3件");
    expect(getTimeTreeImportMessage(3)).toContain("TimeTree");
    expect(TIMETREE_EXTERNAL_CALENDAR_HELP_URL).toContain("support.timetreeapp.com");
  });
});
