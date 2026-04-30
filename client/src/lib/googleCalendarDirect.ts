/**
 * Google Calendar API v3 への直接書き込みヘルパー
 * アクセストークンは googleIdentity.ts から取得する
 */
import type { Match } from "../../../drizzle/schema";

interface GoogleCalendarEventDateTime {
  dateTime: string;
  timeZone: string;
}

interface GoogleCalendarEvent {
  summary: string;
  description: string;
  location?: string;
  start: GoogleCalendarEventDateTime;
  end: GoogleCalendarEventDateTime;
  reminders?: { useDefault: boolean };
  source?: { title: string; url: string };
}

interface GoogleInsertResponse {
  id: string;
  htmlLink?: string;
  status?: string;
}

const DEFAULT_MATCH_DURATION_MS = 2 * 60 * 60 * 1000; // 試合時間 2時間

export function toGoogleCalendarEvent(match: Match): GoogleCalendarEvent {
  const startDate = new Date(Number(match.kickoffUtcMs));
  const endDate = new Date(Number(match.kickoffUtcMs) + DEFAULT_MATCH_DURATION_MS);

  const detailLines = [
    `大会: ${match.leagueNameJp}`,
    match.round ? `ラウンド: ${match.round}` : "",
    match.season ? `シーズン: ${match.season}` : "",
    match.venue ? `会場: ${match.venue}` : "",
    "kaigaisoccer.com から追加",
  ].filter(Boolean);

  return {
    summary: `⚽ ${match.homeTeam} vs ${match.awayTeam}`,
    description: detailLines.join("\n"),
    location: match.venue ?? undefined,
    start: { dateTime: startDate.toISOString(), timeZone: "UTC" },
    end: { dateTime: endDate.toISOString(), timeZone: "UTC" },
    reminders: { useDefault: true },
    source:
      typeof window !== "undefined"
        ? { title: "海外サッカー日程 | kaigaisoccer.com", url: window.location.href }
        : undefined,
  };
}

async function insertGoogleCalendarEvent(
  accessToken: string,
  event: GoogleCalendarEvent
): Promise<GoogleInsertResponse> {
  const response = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    }
  );
  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Google Calendar API error: ${response.status} ${response.statusText} ${text}`.trim()
    );
  }
  return (await response.json()) as GoogleInsertResponse;
}

export async function insertMatchToGoogleCalendar(
  accessToken: string,
  match: Match
): Promise<GoogleInsertResponse> {
  return insertGoogleCalendarEvent(accessToken, toGoogleCalendarEvent(match));
}

export async function insertMatchesToGoogleCalendar(
  accessToken: string,
  matches: Match[]
): Promise<{ successCount: number; failures: Array<{ match: Match; error: string }> }> {
  let successCount = 0;
  const failures: Array<{ match: Match; error: string }> = [];
  for (const match of matches) {
    try {
      await insertMatchToGoogleCalendar(accessToken, match);
      successCount += 1;
      // レート制限を避けるため少し待機
      await new Promise((r) => setTimeout(r, 200));
    } catch (error) {
      failures.push({
        match,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
  return { successCount, failures };
}
