import { useMemo } from "react";
import { CalendarX2, MapPin } from "lucide-react";
import type { Match } from "../../../drizzle/schema";
import { toJstDisplay } from "@shared/datetime";

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
            <table className="w-full border-collapse text-sm">
              <thead className="bg-secondary/60 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="w-[88px] px-3 py-2 text-left font-medium">時刻</th>
                  <th className="px-3 py-2 text-left font-medium">ホーム</th>
                  <th className="w-[120px] px-3 py-2 text-center font-medium">
                    {showScore ? "結果" : "vs"}
                  </th>
                  <th className="px-3 py-2 text-left font-medium">アウェー</th>
                  <th className="hidden w-[160px] px-3 py-2 text-left font-medium md:table-cell">
                    リーグ
                  </th>
                </tr>
              </thead>
              <tbody>
                {g.rows.map(({ match, displayTime, isLateNight }) => {
                  const statusLabel = STATUS_LABEL[match.status] ?? match.status;
                  const isPostponed = match.status === "postponed" || match.status === "cancelled";
                  return (
                    <tr
                      key={match.eventId}
                      className="match-row border-t border-border/60 align-middle"
                    >
                      <td className="px-3 py-3 align-middle">
                        <div
                          className={`font-mono text-base font-semibold tabular-nums ${
                            isLateNight ? "text-accent" : "text-foreground"
                          }`}
                          title={isLateNight ? "深夜キックオフ（24時超え表記）" : undefined}
                        >
                          {displayTime}
                        </div>
                        <div className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                          {isPostponed ? statusLabel : isLateNight ? "深夜" : statusLabel}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          {match.homeTeamBadge && (
                            <img
                              src={match.homeTeamBadge}
                              alt=""
                              loading="lazy"
                              className="h-6 w-6 rounded-sm bg-white object-contain ring-1 ring-border/50"
                            />
                          )}
                          <span className="font-medium leading-tight text-foreground">
                            {match.homeTeam}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center">
                        {showScore && match.homeScore != null && match.awayScore != null ? (
                          <span className="font-mono text-base font-bold tabular-nums text-foreground">
                            {match.homeScore} – {match.awayScore}
                          </span>
                        ) : isPostponed ? (
                          <span className="text-xs text-muted-foreground">{statusLabel}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">vs</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          {match.awayTeamBadge && (
                            <img
                              src={match.awayTeamBadge}
                              alt=""
                              loading="lazy"
                              className="h-6 w-6 rounded-sm bg-white object-contain ring-1 ring-border/50"
                            />
                          )}
                          <span className="font-medium leading-tight text-foreground">
                            {match.awayTeam}
                          </span>
                        </div>
                      </td>
                      <td className="hidden px-3 py-3 md:table-cell">
                        <div className="flex flex-col gap-0.5">
                          <span className="league-pill inline-flex w-fit items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                            {match.leagueNameJp}
                          </span>
                          {match.venue && (
                            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              {match.venue}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
