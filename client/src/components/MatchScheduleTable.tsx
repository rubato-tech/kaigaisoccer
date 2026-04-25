import { useMemo } from "react";
import { CalendarX2, MapPin } from "lucide-react";
import type { Match } from "../../../drizzle/schema";
import { toJstDisplay } from "@shared/datetime";
import { teamNameJp, leagueDisplayJp } from "@shared/teamNames";

interface Props {
  matches: Match[];
  /** scope === "past" の場合スコアを表示 */
  showScore: boolean;
  emptyText?: string;
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

export function MatchScheduleTable({ matches, showScore, emptyText }: Props) {
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
      {groups.map((g) => (
        <section key={g.groupKey} aria-labelledby={`date-${g.groupKey}`}>
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
                return (
                  <li key={match.eventId} className="match-row p-3 sm:p-4">
                    {/* リーグ行（常時表示） */}
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="league-pill inline-flex max-w-full items-center truncate rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-semibold text-secondary-foreground">
                        {leagueDisp}
                      </span>
                      {match.venue && (
                        <span className="hidden items-center gap-1 truncate text-[11px] text-muted-foreground sm:inline-flex">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span className="truncate">{match.venue}</span>
                        </span>
                      )}
                    </div>

                    {/* メイン行：時刻 / ホーム / vs or スコア / アウェー */}
                    <div className="grid grid-cols-[64px_minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:grid-cols-[80px_minmax(0,1fr)_auto_minmax(0,1fr)] sm:gap-4">
                      {/* 時刻 */}
                      <div className="flex flex-col">
                        <span
                          className={`font-mono text-base font-bold tabular-nums leading-none sm:text-lg ${
                            isLateNight ? "text-accent" : "text-foreground"
                          }`}
                          title={isLateNight ? "深夜キックオフ（24時超え表記）" : undefined}
                        >
                          {displayTime}
                        </span>
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
                            alt=""
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
                            alt=""
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
      ))}
    </div>
  );
}
