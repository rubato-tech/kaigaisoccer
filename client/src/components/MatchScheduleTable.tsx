import { useMemo } from "react";
import { CalendarX2, CalendarPlus, MapPin, Youtube, Clock } from "lucide-react";
import type { Match } from "../../../drizzle/schema";
import { toJstDisplay } from "@shared/datetime";
import { teamNameJp, leagueDisplayJp } from "@shared/teamNames";
import { LEAGUES } from "@shared/leagues";
import { AdBanner } from "@/components/AdBanner";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

/** リーグIDから現地タイムゾーンを返す */
const REGION_TZ: Record<string, string> = {
  England: "Europe/London",
  Scotland: "Europe/London",
  Spain: "Europe/Madrid",
  Italy: "Europe/Rome",
  Germany: "Europe/Berlin",
  France: "Europe/Paris",
  Netherlands: "Europe/Amsterdam",
  Belgium: "Europe/Brussels",
  Portugal: "Europe/Lisbon",
  Turkey: "Europe/Istanbul",
  Europe: "Europe/Paris",
  World: "UTC",
};
function getLeagueTz(leagueId: string): string {
  const league = LEAGUES.find((l) => l.id === leagueId);
  const region = league?.region ?? "Europe";
  return REGION_TZ[region] ?? "Europe/London";
}
/** UTC ms を指定タイムゾーンで HH:MM に変換 */
function toLocalTime(utcMs: number, tz: string): string {
  return new Date(utcMs).toLocaleTimeString("ja-JP", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
/** 試合ハイライトのYouTube検索URLを生成 */
function buildHighlightUrl(match: Match): string {
  const homeJp = teamNameJp(match.homeTeam);
  const awayJp = teamNameJp(match.awayTeam);
  const query = encodeURIComponent(`${homeJp} ${awayJp} ハイライト`);
  return `https://www.youtube.com/results?search_query=${query}`;
}
/** 試合をGoogleカレンダーに追加するURLを生成 */
function buildGcalUrl(match: Match): string {
  const kickoffMs = Number(match.kickoffUtcMs);
  const endMs = kickoffMs + 105 * 60 * 1000; // 105分後
  const fmt = (ms: number) => {
    const d = new Date(ms);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
  };
  const homeJp = teamNameJp(match.homeTeam);
  const awayJp = teamNameJp(match.awayTeam);
  const league = leagueDisplayJp(match.leagueNameJp);
  const title = encodeURIComponent(`⚽ ${homeJp} vs ${awayJp}`);
  const details = encodeURIComponent(`${league}\nデータ: kaigaisoccer.com`);
  const location = encodeURIComponent(match.venue ?? "");
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${fmt(kickoffMs)}/${fmt(endMs)}&details=${details}&location=${location}`;
}

interface Props {
  matches: Match[];
  /** scope === "past" の場合スコアを表示 */
  showScore: boolean;
  emptyText?: string;
  /** 現地時間表示モード */
  showLocalTime?: boolean;
}

interface DateGroup {
  groupKey: string;
  groupLabel: string;
  rows: Array<{ match: Match; displayTime: string; isLateNight: boolean }>;
}

function groupByDate(matches: Match[]): DateGroup[] {
  const map = new Map<string, DateGroup>();
  for (const m of matches) {
    const utcMs = Number(m.kickoffUtcMs);
    const d = toJstDisplay(utcMs);
    if (!map.has(d.groupKey)) {
      map.set(d.groupKey, { groupKey: d.groupKey, groupLabel: d.groupLabel, rows: [] });
    }
    map.get(d.groupKey)!.rows.push({
      match: m,
      displayTime: d.displayTime,
      isLateNight: d.isLateNight,
    });
  }
  const groups = Array.from(map.values());
  for (const g of groups) {
    g.rows.sort((a, b) => Number(a.match.kickoffUtcMs) - Number(b.match.kickoffUtcMs));
  }
  return groups.sort((a, b) => (a.groupKey < b.groupKey ? -1 : 1));
}

const STATUS_LABEL: Record<string, string> = {
  scheduled: "予定",
  finished: "終了",
  postponed: "延期",
  cancelled: "中止",
  live: "LIVE",
};

export function MatchScheduleTable({ matches, showScore, emptyText, showLocalTime = false }: Props) {
  const groups = useMemo(() => groupByDate(matches), [matches]);

  if (groups.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/70 bg-card/50 p-12 text-center">
        <CalendarX2 className="mx-auto mb-3 h-10 w-10 text-muted-foreground/60" />
        <p className="text-sm text-muted-foreground">{emptyText ?? "該当する試合は見つかりませんでした。"}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {groups.map((g, idx) => (
        <div key={g.groupKey}>
          {/* 3日ごとにインフィード広告を挿入（最初のグループはスキップ） */}
          {idx > 0 && idx % 3 === 0 && (
            <AdBanner slot="infeed" className="mb-6" />
          )}
          <section aria-labelledby={`date-${g.groupKey}`}>
          <h2
            id={`date-${g.groupKey}`}
            className="date-header mb-3 px-4 py-2 text-lg font-bold tracking-wide text-primary"
          >
            {g.groupLabel}
          </h2>

          <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm">
            <ul className="divide-y divide-border/60">
              {g.rows.map(({ match, displayTime, isLateNight }) => {
                const statusLabel = STATUS_LABEL[match.status] ?? match.status;
                const isPostponed = match.status === "postponed" || match.status === "cancelled";
                const homeJp = teamNameJp(match.homeTeam);
                const awayJp = teamNameJp(match.awayTeam);
                const leagueDisp = leagueDisplayJp(match.leagueNameJp);
                const localTz = getLeagueTz(match.leagueId);
                // showLocalTime=true のとき主表示を現地時間に切り替え
                const shownTime = showLocalTime
                  ? toLocalTime(Number(match.kickoffUtcMs), localTz)
                  : displayTime;
                return (
                  <li key={match.eventId} className="match-row p-3 sm:p-4">
                    {/* リーグ行（常時表示） */}
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="league-pill inline-flex max-w-full items-center truncate rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-semibold text-secondary-foreground">
                        {leagueDisp}
                      </span>
                      <div className="flex items-center gap-2">
                        {match.venue && (
                          <span className="hidden items-center gap-1 truncate text-[11px] text-muted-foreground sm:inline-flex">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span className="truncate">{match.venue}</span>
                          </span>
                        )}
                        {/* ハイライトリンク（終了試合のみ） */}
                        {match.status === "finished" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 gap-1 px-1.5 text-[10px] text-red-500 hover:text-red-600"
                            title="ハイライト動画を検索"
                            onClick={() => window.open(buildHighlightUrl(match), "_blank")}
                          >
                            <Youtube className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">ハイライト</span>
                          </Button>
                        )}
                        {/* Googleカレンダー追加ボタン（予定試合のみ） */}
                        {!showScore && match.status === "scheduled" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 gap-1 px-1.5 text-[10px] text-muted-foreground hover:text-primary"
                            title="Googleカレンダーに追加"
                            onClick={() => {
                              window.open(buildGcalUrl(match), "_blank");
                              toast.success("Googleカレンダーを開きました");
                            }}
                          >
                            <CalendarPlus className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">カレンダー</span>
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* メイン行：時刻 / ホーム / vs or スコア / アウェー */}
                    <div className="grid grid-cols-[64px_minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:grid-cols-[80px_minmax(0,1fr)_auto_minmax(0,1fr)] sm:gap-4">
                      {/* 時刻 */}
                      <div className="flex flex-col">
                        <span
                          className={`font-mono text-base font-bold tabular-nums leading-none sm:text-lg ${
                            isLateNight && !showLocalTime ? "text-accent" : "text-foreground"
                          }`}
                          title={isLateNight && !showLocalTime ? "深夜キックオフ（24時超え表記）" : showLocalTime ? `現地時間 (${localTz})` : undefined}
                        >
                          {shownTime}
                        </span>
                        {showLocalTime && (
                          <span className="mt-0.5 flex items-center gap-0.5 text-[9px] text-muted-foreground/70">
                            <Clock className="h-2.5 w-2.5 shrink-0" />
                            {displayTime} JST
                          </span>
                        )}
                        <span className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                          {isPostponed ? statusLabel : isLateNight ? "深夜" : statusLabel}
                        </span>
                      </div>

                      {/* ホーム */}
                      <div className="flex min-w-0 items-center justify-end gap-2 text-right">
                        <span className="truncate font-medium leading-tight text-foreground">
                          {homeJp}
                        </span>
                        {match.homeTeamBadge && (
                          <img
                            src={match.homeTeamBadge}
                            alt={`${homeJp}のエンブレム`}
                            loading="lazy"
                            className="h-6 w-6 shrink-0 rounded-sm bg-white object-contain ring-1 ring-border/50 sm:h-7 sm:w-7"
                          />
                        )}
                      </div>

                      {/* スコア or vs */}
                      <div className="flex shrink-0 items-center justify-center px-1 text-center sm:px-2">
                        {showScore && match.homeScore != null && match.awayScore != null ? (
                          <span className="rounded-md bg-secondary/70 px-2 py-1 font-mono text-sm font-bold tabular-nums text-foreground sm:text-base">
                            {match.homeScore} - {match.awayScore}
                          </span>
                        ) : isPostponed ? (
                          <span className="text-[11px] text-muted-foreground">{statusLabel}</span>
                        ) : (
                          <span className="text-xs font-medium text-muted-foreground">vs</span>
                        )}
                      </div>

                      {/* アウェー */}
                      <div className="flex min-w-0 items-center gap-2">
                        {match.awayTeamBadge && (
                          <img
                            src={match.awayTeamBadge}
                            alt={`${awayJp}のエンブレム`}
                            loading="lazy"
                            className="h-6 w-6 shrink-0 rounded-sm bg-white object-contain ring-1 ring-border/50 sm:h-7 sm:w-7"
                          />
                        )}
                        <span className="truncate font-medium leading-tight text-foreground">
                          {awayJp}
                        </span>
                      </div>
                    </div>

                    {/* モバイル時のスタジアム名（補助情報） */}
                    {match.venue && (
                      <div className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground sm:hidden">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">{match.venue}</span>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
          </section>
        </div>
      ))}
    </div>
  );
}
