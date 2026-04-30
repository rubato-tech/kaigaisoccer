/**
 * Google カレンダー URL 生成・ICS ファイル生成ヘルパー
 */
import type { Match } from "../../../drizzle/schema";

function formatGoogleDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

/** Google カレンダーの「イベント作成」URLを生成（API不要・ログイン不要） */
export function buildGcalUrl(match: Match): string {
  const start = new Date(Number(match.kickoffUtcMs));
  const end = new Date(Number(match.kickoffUtcMs) + 2 * 60 * 60 * 1000);
  const title = `⚽ ${match.homeTeam} vs ${match.awayTeam}`;
  const details = [
    `大会: ${match.leagueNameJp}`,
    "kaigaisoccer.com から追加",
    typeof window !== "undefined" ? window.location.href : "",
  ]
    .filter(Boolean)
    .join("\n");

  const url = new URL("https://calendar.google.com/calendar/u/0/r/eventedit");
  url.searchParams.set("text", title);
  url.searchParams.set("dates", `${formatGoogleDate(start)}/${formatGoogleDate(end)}`);
  url.searchParams.set("details", details);
  if (match.venue) {
    url.searchParams.set("location", match.venue);
  }
  return url.toString();
}

/** ICS カレンダーファイルの文字列を生成 */
export function buildIcs(matches: Match[], calendarName: string): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//kaigaisoccer.com//Soccer Schedule JP//JA",
    "CALSCALE:GREGORIAN",
    `X-WR-CALNAME:${escapeIcsText(calendarName)}`,
  ];

  for (const match of matches) {
    const start = new Date(Number(match.kickoffUtcMs));
    const end = new Date(Number(match.kickoffUtcMs) + 2 * 60 * 60 * 1000);
    const description = [
      `大会: ${match.leagueNameJp}`,
      match.round ? `ラウンド: ${match.round}` : "",
      match.season ? `シーズン: ${match.season}` : "",
      "kaigaisoccer.com から追加",
    ]
      .filter(Boolean)
      .join("\n");

    lines.push(
      "BEGIN:VEVENT",
      `UID:${match.eventId}@kaigaisoccer.com`,
      `DTSTAMP:${formatGoogleDate(new Date())}`,
      `DTSTART:${formatGoogleDate(start)}`,
      `DTEND:${formatGoogleDate(end)}`,
      `SUMMARY:${escapeIcsText(`⚽ ${match.homeTeam} vs ${match.awayTeam}`)}`,
      `DESCRIPTION:${escapeIcsText(description)}`,
      `LOCATION:${escapeIcsText(match.venue ?? "")}`,
      "END:VEVENT"
    );
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

/** ICS ファイルをダウンロードする */
export function downloadIcs(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
