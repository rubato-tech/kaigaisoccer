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

/** TimeTree公式ヘルプ: 端末標準カレンダーをTimeTreeに表示する設定 */
export const TIMETREE_EXTERNAL_CALENDAR_HELP_URL =
  "https://support.timetreeapp.com/hc/ja/articles/360000629341-%E4%BB%96%E3%81%AE%E3%82%AB%E3%83%AC%E3%83%B3%E3%83%80%E3%83%BC%E3%82%92%E5%88%A9%E7%94%A8%E3%81%97%E3%81%9F%E3%81%84-Google-%E3%82%AB%E3%83%AC%E3%83%B3%E3%83%80%E3%83%BC%E3%81%AA%E3%81%A9";

/**
 * TimeTreeで利用できる標準iCalendar（.ics）ファイルをダウンロードする。
 * TimeTreeには外部アプリから予定を直接登録する公開APIがないため、
 * 端末標準カレンダーへ読み込んでTimeTree上に表示する公式方式を採用する。
 */
export function downloadTimeTreeIcs(matches: Match[], filename: string, calendarName: string) {
  downloadIcs(filename, buildIcs(matches, calendarName));
}

/** TimeTreeへの取り込みに必要な次の操作を案内する文言 */
export function getTimeTreeImportMessage(eventCount: number): string {
  return `${eventCount}件のiCalendarファイルをダウンロードしました。端末のカレンダーに追加後、TimeTreeで外部カレンダーの表示を有効にしてください。`;
}
