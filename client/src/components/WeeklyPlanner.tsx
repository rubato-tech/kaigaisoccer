/**
 * 週間観戦プランナー
 * 試合一覧から「観たい試合」をチェックして、まとめてGoogleカレンダーに追加できる
 */
import { useCallback, useMemo, useState } from "react";
import { CalendarCheck2, CalendarPlus, Download, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Match } from "../../../drizzle/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { teamNameJp, leagueDisplayJp } from "@shared/teamNames";
import { toJstDisplay } from "@shared/datetime";
import { buildGcalUrl, buildIcs, downloadIcs } from "@/lib/calendar";
import { useGoogleCalendar } from "@/hooks/useGoogleCalendar";
import { WATCHLIST_KEY, readStringArray, writeStringArray } from "@/lib/storage";

function useWatchlist(initialMatches: Match[]) {
  const [watchlistIds, setWatchlistIds] = useState<Set<string>>(() => {
    const saved = readStringArray(WATCHLIST_KEY);
    return new Set(saved);
  });

  const toggle = useCallback(
    (eventId: string) => {
      setWatchlistIds((prev) => {
        const next = new Set(prev);
        if (next.has(eventId)) {
          next.delete(eventId);
        } else {
          next.add(eventId);
        }
        writeStringArray(WATCHLIST_KEY, Array.from(next));
        return next;
      });
    },
    []
  );

  const clear = useCallback(() => {
    setWatchlistIds(new Set());
    writeStringArray(WATCHLIST_KEY, []);
  }, []);

  const watchlistMatches = useMemo(
    () => initialMatches.filter((m) => watchlistIds.has(m.eventId)),
    [initialMatches, watchlistIds]
  );

  return { watchlistIds, toggle, clear, watchlistMatches };
}

interface Props {
  matches: Match[];
  /** 表示する最大日数（デフォルト7日） */
  days?: number;
}

export function WeeklyPlanner({ matches, days = 7 }: Props) {
  const { addMatches, isBusy, isConfigured } = useGoogleCalendar();

  const upcoming = useMemo(() => {
    const now = Date.now();
    const limit = now + days * 24 * 60 * 60 * 1000;
    return matches
      .filter((m) => {
        const t = Number(m.kickoffUtcMs);
        return t >= now && t <= limit && m.status === "scheduled";
      })
      .sort((a, b) => Number(a.kickoffUtcMs) - Number(b.kickoffUtcMs));
  }, [matches, days]);

  const { watchlistIds, toggle, clear, watchlistMatches } = useWatchlist(upcoming);

  const handleAddAll = useCallback(async () => {
    if (watchlistMatches.length === 0) {
      toast.info("観戦予定リストが空です。試合にチェックを入れてください。");
      return;
    }
    await addMatches(watchlistMatches, "観戦予定リスト");
  }, [addMatches, watchlistMatches]);

  const handleDownloadIcs = useCallback(() => {
    if (watchlistMatches.length === 0) {
      toast.info("観戦予定リストが空です。試合にチェックを入れてください。");
      return;
    }
    const ics = buildIcs(watchlistMatches, "観戦予定 - kaigaisoccer.com");
    downloadIcs("watchlist.ics", ics);
    toast.success(`${watchlistMatches.length} 件の ICS ファイルをダウンロードしました。`);
  }, [watchlistMatches]);

  if (upcoming.length === 0) {
    return (
      <div className="rounded-2xl border border-border/70 bg-card/80 p-4 text-center text-sm text-muted-foreground">
        今後{days}日間の予定試合はありません。
      </div>
    );
  }

  return (
    <section className="rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm">
      {/* ヘッダー */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="flex items-center gap-2 font-serif text-lg font-bold text-primary">
            <CalendarCheck2 className="h-5 w-5" />
            今週の観戦プランナー
          </h2>
          <p className="text-sm text-muted-foreground">
            観たい試合にチェックを入れて、まとめてGoogleカレンダーに追加できます。
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {watchlistIds.size > 0 && (
            <Badge variant="secondary" className="font-mono">
              {watchlistIds.size} 件選択中
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadIcs}
            disabled={watchlistIds.size === 0}
            className="gap-1.5"
          >
            <Download className="h-3.5 w-3.5" />
            ICS
          </Button>
          {isConfigured ? (
            <Button
              size="sm"
              onClick={handleAddAll}
              disabled={watchlistIds.size === 0 || isBusy}
              className="gap-1.5"
            >
              <CalendarPlus className="h-3.5 w-3.5" />
              {isBusy ? "追加中…" : "カレンダーに追加"}
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadIcs}
              disabled={watchlistIds.size === 0}
              className="gap-1.5"
            >
              <CalendarPlus className="h-3.5 w-3.5" />
              ICSでダウンロード
            </Button>
          )}
          {watchlistIds.size > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clear}
              className="gap-1 text-muted-foreground"
            >
              <Trash2 className="h-3.5 w-3.5" />
              クリア
            </Button>
          )}
        </div>
      </div>

      {/* 試合リスト */}
      <ul className="mt-4 space-y-2">
        {upcoming.map((match) => {
          const checked = watchlistIds.has(match.eventId);
          const d = toJstDisplay(Number(match.kickoffUtcMs));
          const homeJp = teamNameJp(match.homeTeam);
          const awayJp = teamNameJp(match.awayTeam);
          const leagueJp = leagueDisplayJp(match.leagueNameJp);
          return (
            <li key={match.eventId}>
              <label
                className={[
                  "flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors",
                  checked
                    ? "border-primary/40 bg-primary/5"
                    : "border-border/60 bg-background/60 hover:bg-accent/30",
                ].join(" ")}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(match.eventId)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span className="font-mono">{d.groupLabel}</span>
                    <span className="font-mono font-bold text-foreground">{d.displayTime}</span>
                    <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                      {leagueJp}
                    </Badge>
                  </div>
                  <div className="mt-0.5 font-medium text-foreground">
                    {homeJp} <span className="text-muted-foreground">vs</span> {awayJp}
                  </div>
                </div>
                {/* 個別 gcal ボタン */}
                <a
                  href={buildGcalUrl(match)}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="shrink-0 rounded-md border border-border/60 bg-background/80 px-2 py-1 text-[11px] text-muted-foreground hover:border-primary/40 hover:text-primary"
                  title="Googleカレンダーで開く"
                >
                  Googleで開く
                </a>
              </label>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
