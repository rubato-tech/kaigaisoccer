import { useMemo, useState } from "react";
import { CalendarDays, Globe2, Loader2, Newspaper, RefreshCw, Trophy, UserRound } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MatchScheduleTable } from "@/components/MatchScheduleTable";
import { MatchFilters, EMPTY_FILTER, type FilterState } from "@/components/MatchFilters";
import { LEAGUES, LEAGUE_BY_ID } from "@shared/leagues";
import { toJstParts } from "@shared/datetime";
import { applyMatchFilter } from "@shared/matchFilter";
import { leagueDisplayJp } from "@shared/teamNames";

type ViewKey = "euro_upcoming" | "euro_past" | "japanese_upcoming" | "national_upcoming";

interface ViewSpec {
  label: string;
  shortLabel: string;
  icon: typeof CalendarDays;
  category: "euro_league" | "uefa" | "national_team" | "japanese_player";
  scope: "upcoming" | "past";
  /** UEFA も同タブで表示する場合 true */
  includeUefa?: boolean;
  showScore: boolean;
  emptyText: string;
  description: string;
}

const VIEWS: Record<ViewKey, ViewSpec> = {
  euro_upcoming: {
    label: "欧州日程",
    shortLabel: "欧州日程",
    icon: CalendarDays,
    category: "euro_league",
    scope: "upcoming",
    includeUefa: true,
    showScore: false,
    emptyText: "まだ予定されている試合はありません。",
    description: "欧州主要リーグおよびUEFA大会の今後14日間の試合を日本時間で表示します。",
  },
  euro_past: {
    label: "欧州結果",
    shortLabel: "欧州結果",
    icon: Trophy,
    category: "euro_league",
    scope: "past",
    includeUefa: true,
    showScore: true,
    emptyText: "結果データがまだ取得されていません。",
    description: "欧州主要リーグおよびUEFA大会の直近21日間の試合結果。スコア付きで一覧表示。",
  },
  japanese_upcoming: {
    label: "日本人選手出場試合",
    shortLabel: "日本人選手",
    icon: UserRound,
    category: "japanese_player",
    scope: "upcoming",
    showScore: false,
    emptyText: "対象クラブの今後の試合はまだ取得できていません。",
    description: "日本人選手が在籍する欧州クラブの今後の試合を抽出してまとめます。",
  },
  national_upcoming: {
    label: "代表戦日程",
    shortLabel: "代表戦",
    icon: Globe2,
    category: "national_team",
    scope: "upcoming",
    showScore: false,
    emptyText: "代表戦の予定は現在ありません。",
    description: "FIFAウィンドウや国際大会など、各国代表チームの試合スケジュール。",
  },
};

function formatRelative(d: Date | null | undefined): string {
  if (!d) return "未取得";
  const ms = Date.now() - d.getTime();
  if (ms < 60_000) return "たった今";
  const m = Math.floor(ms / 60_000);
  if (m < 60) return `${m}分前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}時間前`;
  const day = Math.floor(h / 24);
  return `${day}日前`;
}

export default function Home() {
  const [view, setView] = useState<ViewKey>("euro_upcoming");
  const [filter, setFilter] = useState<FilterState>(EMPTY_FILTER);
  const spec = VIEWS[view];

  const { data, error, isLoading, isFetching, refetch } = trpc.matches.list.useQuery(
    { category: spec.category, scope: spec.scope },
    { staleTime: 60_000 },
  );

  // UEFA を別途取得して欧州日程／結果に合流
  const { data: uefaData, error: uefaError } = trpc.matches.list.useQuery(
    { category: "uefa", scope: spec.scope },
    {
      enabled: !!spec.includeUefa,
      staleTime: 60_000,
    },
  );
  const queryError = error ?? uefaError ?? null;

  const merged = useMemo(() => {
    const list = [...(data?.matches ?? [])];
    if (spec.includeUefa && uefaData?.matches) list.push(...uefaData.matches);
    return list;
  }, [data?.matches, uefaData?.matches, spec.includeUefa]);

  // 現在のビューに含まれているリーグ一覧（フィルタチップ用）
  const availableLeagues = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of merged) {
      counts.set(m.leagueId, (counts.get(m.leagueId) ?? 0) + 1);
    }
    return Array.from(counts.entries()).map(([id, count]) => {
      const def = LEAGUE_BY_ID.get(id);
      const label = def ? leagueDisplayJp(def.nameJp) : id;
      return { id, label, count };
    });
  }, [merged]);

  // フィルタ適用後
  const filtered = useMemo(() => applyMatchFilter(merged, filter), [merged, filter]);

  const lastSync = data?.lastSync?.finishedAt ? new Date(data.lastSync.finishedAt) : null;

  // ヘッダー用: 今日の日本時間日付
  const todayLabel = useMemo(() => {
    const p = toJstParts(Date.now());
    const wk = ["日", "月", "火", "水", "木", "金", "土"][new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay()];
    return `${p.year}年${p.month}月${p.day}日（${wk}）`;
  }, []);

  return (
    <div className="min-h-screen">
      <SiteHeader todayLabel={todayLabel} />

      {/* タブナビゲーション：スマホでは横スクロール、PCでは全表示 */}
      <div className="sticky top-0 z-20 border-b border-border/70 bg-card/95 backdrop-blur">
        <div className="container">
          <div className="flex items-center justify-between gap-2">
            {/* タブ一覧：overflow-x-auto で横スクロール可能 */}
            <div
              className="-mb-px flex flex-1 overflow-x-auto"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {(Object.keys(VIEWS) as ViewKey[]).map((key) => {
                const v = VIEWS[key];
                const Icon = v.icon;
                const isActive = view === key;
                return (
                  <button
                    key={key}
                    onClick={() => setView(key)}
                    className={[
                      "flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-3.5 text-sm font-semibold transition-colors sm:px-4",
                      isActive
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
                    ].join(" ")}
                    aria-selected={isActive}
                    role="tab"
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{v.label}</span>
                  </button>
                );
              })}
            </div>

            {/* 再読み込みボタン */}
            <div className="flex shrink-0 items-center gap-2 pl-2">
              <span className="hidden text-xs text-muted-foreground sm:inline">最終更新:&nbsp;{formatRelative(lastSync)}</span>
              <Button
                variant="outline"
                size="sm"
                className="bg-card"
                onClick={() => refetch()}
                disabled={isFetching}
              >
                {isFetching ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                <span className="ml-1 hidden xs:inline">再読み込み</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <main className="container py-6 md:py-10">
        <div role="tabpanel">
          <ViewSection
            title={spec.label}
            description={spec.description}
            isLoading={isLoading}
            error={queryError}
            onRetry={() => refetch()}
            matches={filtered}
            totalMatches={merged.length}
            filter={filter}
            onFilterChange={setFilter}
            availableLeagues={availableLeagues}
            showScore={spec.showScore}
            emptyText={spec.emptyText}
          />
        </div>

        <SiteFooter />
      </main>
    </div>
  );
}

function SiteHeader({ todayLabel }: { todayLabel: string }) {
  return (
    <header className="border-b border-border/70 bg-card/80 backdrop-blur">
      <div className="container flex flex-col gap-3 py-4 md:flex-row md:items-end md:justify-between md:py-6">
        <div className="flex items-end gap-4">
          <div className="rounded-md bg-primary px-3 py-2 font-serif text-2xl font-black text-primary-foreground shadow-sm">
            ⚽
          </div>
          <div>
            <h1 className="font-serif text-2xl font-black leading-tight text-primary md:text-3xl">
              海外サッカー日程
            </h1>
            <p className="text-xs text-muted-foreground md:text-sm">
              欧州主要リーグ・UEFA大会・代表戦を日本時間で一覧
            </p>
          </div>
        </div>
        <div className="flex flex-col items-start gap-1 md:items-end">
          <Badge variant="secondary" className="font-mono text-xs">
            JST 基準
          </Badge>
          <span className="font-serif text-base font-bold text-foreground/80 md:text-lg">
            {todayLabel}
          </span>
        </div>
      </div>
    </header>
  );
}

function ViewSection(props: {
  title: string;
  description: string;
  isLoading: boolean;
  error: { message?: string } | null;
  onRetry: () => void;
  matches: import("../../../drizzle/schema").Match[];
  totalMatches: number;
  filter: FilterState;
  onFilterChange: (f: FilterState) => void;
  availableLeagues: { id: string; label: string; count: number }[];
  showScore: boolean;
  emptyText: string;
}) {
  const {
    title,
    description,
    isLoading,
    error,
    onRetry,
    matches,
    totalMatches,
    filter,
    onFilterChange,
    availableLeagues,
    showScore,
    emptyText,
  } = props;
  const leagueCount = useMemo(() => {
    const set = new Set(matches.map((m) => m.leagueId));
    return set.size;
  }, [matches]);
  const isFiltered = filter.selectedLeagueIds.size > 0 || filter.teamQuery.trim() !== "";
  return (
    <div>
      <div className="mb-5 flex items-baseline justify-between gap-4 border-b border-border/60 pb-3">
        <div>
          <h2 className="font-serif text-xl font-bold text-foreground md:text-2xl">{title}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground md:text-sm">{description}</p>
        </div>
        <div className="hidden text-right text-xs text-muted-foreground sm:block">
          <div>
            <span className="font-mono text-base font-bold tabular-nums text-foreground">
              {matches.length}
            </span>
            {isFiltered && (
              <span className="ml-1 text-muted-foreground">/ {totalMatches}</span>
            )}
            <span className="ml-1">試合</span>
          </div>
          <div>
            <span className="font-mono text-base font-bold tabular-nums text-foreground">
              {leagueCount}
            </span>
            <span className="ml-1">リーグ</span>
          </div>
        </div>
      </div>

      <MatchFilters
        state={filter}
        onChange={onFilterChange}
        availableLeagues={availableLeagues}
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground" role="status">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          試合データを読み込み中…
        </div>
      ) : error ? (
        <div
          role="alert"
          className="rounded-xl border border-destructive/40 bg-destructive/10 p-8 text-center"
        >
          <p className="font-serif text-lg font-bold text-destructive">試合データを読み込めませんでした</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {error.message ?? "サーバーとの通信に失敗しました。しばらく時間をあけて再度お試しください。"}
          </p>
          <Button variant="outline" className="mt-4 bg-card" onClick={onRetry}>
            <RefreshCw className="mr-1 h-3.5 w-3.5" />
            再試行
          </Button>
        </div>
      ) : (
        <MatchScheduleTable matches={matches} showScore={showScore} emptyText={emptyText} />
      )}
    </div>
  );
}

function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border/70 pt-6 text-center text-xs text-muted-foreground">
      <p className="flex flex-wrap items-center justify-center gap-1.5">
        <Newspaper className="h-3.5 w-3.5" />
        試合データ: TheSportsDB ・ 時刻はすべて日本時間（JST）
      </p>
      <p className="mt-2 text-[11px]">
        対応リーグ: {LEAGUES.filter((l) => l.category !== "national_team").map((l) => leagueDisplayJp(l.nameJp)).join("、")}
      </p>
    </footer>
  );
}
