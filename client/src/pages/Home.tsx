import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Clock, Globe2, Loader2, Newspaper, RefreshCw, Star, Trophy, UserRound } from "lucide-react";
import { AdBanner } from "@/components/AdBanner";
import { AdSenseBlock } from "@/components/AdSenseBlock";
import { FavoriteTeams } from "@/components/FavoriteTeams";
import { WeeklyPlanner } from "@/components/WeeklyPlanner";
import { MonetizationSection } from "@/components/MonetizationSection";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MatchScheduleTable } from "@/components/MatchScheduleTable";
import { MatchFilters, EMPTY_FILTER, type FilterState } from "@/components/MatchFilters";
import { LEAGUES, LEAGUE_BY_ID } from "@shared/leagues";
import { toJstParts } from "@shared/datetime";
import { applyMatchFilter } from "@shared/matchFilter";
import { leagueDisplayJp } from "@shared/teamNames";

type ViewKey = "euro_upcoming" | "euro_past" | "japanese_upcoming" | "national_upcoming" | "favorites";

const VIEW_ORDER: ViewKey[] = ["euro_upcoming", "euro_past", "japanese_upcoming", "national_upcoming", "favorites"];

type MatchCategory = "euro_league" | "cup" | "uefa" | "national_team" | "japanese_player" | "world_cup";

interface ViewSpec {
  label: string;
  shortLabel: string;
  icon: React.ElementType;
  /** 単一または複数カテゴリ（配列の場合OR条件）。"favorites"は別処理 */
  category: MatchCategory | MatchCategory[] | "favorites";
  scope: "upcoming" | "past";
  showScore: boolean;
  emptyText: string;
  description: string;
}

const VIEWS: Record<ViewKey, ViewSpec> = {
  euro_upcoming: {
    label: "欧州日程",
    shortLabel: "欧州日程",
    icon: CalendarDays,
    // リーグ戦＋UEFAカップ（CL/EL/ECL）＋各国カップ戦を一括表示
    category: ["euro_league", "uefa", "cup"],
    scope: "upcoming",
    showScore: false,
    emptyText: "まだ予定されている試合はありません。",
    description: "欧州主要リーグ・CL・EL・ECL・各国カップ戦の今後14日間の試合を日本時間で一括表示。",
  },
  euro_past: {
    label: "欧州結果",
    shortLabel: "欧州結果",
    icon: Trophy,
    // 結果も同様に全カテゴリ一括
    category: ["euro_league", "uefa", "cup"],
    scope: "past",
    showScore: true,
    emptyText: "結果データがまだ取得されていません。",
    description: "欧州主要リーグ・CL・EL・ECL・各国カップ戦の直近21日間の試合結果。スコア付きで一覧表示。",
  },
  japanese_upcoming: {
    label: "日本人選手",
    shortLabel: "日本人選手",
    icon: UserRound,
    category: "japanese_player",
    scope: "upcoming",
    showScore: false,
    emptyText: "対象クラブの今後の試合はまだ取得できていません。",
    description: "日本人選手が在籍する欧州クラブの今後の試合を抽出してまとめます。",
  },
  national_upcoming: {
    label: "代表戦",
    shortLabel: "代表戦",
    icon: Globe2,
    category: "national_team",
    scope: "upcoming",
    showScore: false,
    emptyText: "代表戦の予定は現在ありません。",
    description: "FIFAウィンドウや国際大会など、各国代表チームの試合スケジュール。",
  },
  favorites: {
    label: "お気に入り",
    shortLabel: "お気に入り",
    icon: Star,
    category: "favorites",
    scope: "upcoming",
    showScore: false,
    emptyText: "お気に入りチームを登録すると、そのチームの試合だけを表示します。",
    description: "お気に入り登録したチームの今後30日間の試合をまとめて表示します。",
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

const TAB_STORAGE_KEY = "kaigaisoccer_last_tab";
const LEAGUE_STORAGE_KEY = "kaigaisoccer_last_league";

// OGP/メタタグをタブに応じて動的に書き換えるヘルパー
function updateMetaTags(view: ViewKey, leagueIds: Set<string>) {
  const siteUrl = "https://kaigaisoccer.com";
  const ogDescriptions: Record<ViewKey, string> = {
    euro_upcoming: "プレミアリーグ・ラ・リーガ・セリエA・ブンデスリーガ・リーグアンなど欧州主要リーグとCL・EL・ECL・各国カップ戦の試合日程を日本時間で一括表示。",
    euro_past: "欧州主要リーグ・CL・EL・ECL・各国カップ戦の直近21日間の試合結果をスコア付きで一覧表示。",
    japanese_upcoming: "久保建英・鎌田大地・遠藤航・三笘薫など日本人選手が在籍する欧州クラブの今後の試合日程を日本時間で。",
    national_upcoming: "FIFAワールドカップ予選・UEFA EURO・ネーションズリーグなど各国代表チームの試合スケジュール。",
    favorites: "お気に入り登録したチームの今後30日間の試合を日本時間でまとめて表示。",
  };

  const titles: Record<ViewKey, string> = {
    euro_upcoming: "海外サッカー日程 | 欧州リーグ・CL・EL・ECL・カップ戦を日本時間で",
    euro_past: "海外サッカー結果 | 欧州リーグ・CL・EL・ECL・カップ戦結果を日本時間で",
    japanese_upcoming: "日本人選手出場試合 | 海外サッカー日程を日本時間で",
    national_upcoming: "代表戦日程 | W杯予選・EURO・ネーションズリーグ日程",
    favorites: "お気に入りチームの試合日程 | 海外サッカー日程",
  };

  const title = titles[view];
  const description = ogDescriptions[view];
  const params = new URLSearchParams();
  params.set("tab", view);
  if (leagueIds.size > 0) params.set("league", Array.from(leagueIds).join(","));
  const canonicalUrl = `${siteUrl}/?${params.toString()}`;

  // document.title
  document.title = title;

  // og:title
  let ogTitle = document.querySelector<HTMLMetaElement>("meta[property='og:title']");
  if (!ogTitle) { ogTitle = document.createElement("meta"); ogTitle.setAttribute("property", "og:title"); document.head.appendChild(ogTitle); }
  ogTitle.content = title;

  // og:description
  let ogDesc = document.querySelector<HTMLMetaElement>("meta[property='og:description']");
  if (!ogDesc) { ogDesc = document.createElement("meta"); ogDesc.setAttribute("property", "og:description"); document.head.appendChild(ogDesc); }
  ogDesc.content = description;

  // og:url
  let ogUrl = document.querySelector<HTMLMetaElement>("meta[property='og:url']");
  if (!ogUrl) { ogUrl = document.createElement("meta"); ogUrl.setAttribute("property", "og:url"); document.head.appendChild(ogUrl); }
  ogUrl.content = canonicalUrl;

  // meta description
  let metaDesc = document.querySelector<HTMLMetaElement>("meta[name='description']");
  if (!metaDesc) { metaDesc = document.createElement("meta"); metaDesc.setAttribute("name", "description"); document.head.appendChild(metaDesc); }
  metaDesc.content = description;

  // canonical
  let canonical = document.querySelector<HTMLLinkElement>("link[rel='canonical']");
  if (!canonical) { canonical = document.createElement("link"); canonical.rel = "canonical"; document.head.appendChild(canonical); }
  canonical.href = canonicalUrl;
}

function getInitialLeagues(): Set<string> {
  const params = new URLSearchParams(window.location.search);
  const leagueParam = params.get("league");
  if (leagueParam) {
    const ids = leagueParam.split(",").filter(Boolean);
    if (ids.length > 0) return new Set(ids);
  }
  try {
    const saved = localStorage.getItem(LEAGUE_STORAGE_KEY);
    if (saved) {
      const ids = JSON.parse(saved) as string[];
      if (Array.isArray(ids) && ids.length > 0) return new Set(ids);
    }
  } catch { /* ignore */ }
  return new Set();
}

function getInitialView(): ViewKey {
  // 1. URLクエリパラメータを優先
  const params = new URLSearchParams(window.location.search);
  const tabParam = params.get("tab") as ViewKey | null;
  if (tabParam && tabParam in VIEWS) return tabParam;
  // 2. LocalStorageの最終選択値
  try {
    const saved = localStorage.getItem(TAB_STORAGE_KEY) as ViewKey | null;
    if (saved && saved in VIEWS) return saved;
  } catch {
    // プライベートブラウジング等でLocalStorageが使えない場合は無視
  }
  // 3. デフォルト
  return "euro_upcoming";
}

export default function Home() {
  const [view, setView] = useState<ViewKey>(getInitialView);
  const [filter, setFilter] = useState<FilterState>(() => ({
    ...EMPTY_FILTER,
    selectedLeagueIds: getInitialLeagues(),
  }));
  const [showLocalTime, setShowLocalTime] = useState(false);
  const spec = VIEWS[view];

  // URL更新を一元管理（タブ・リーグフィルタ両対応）
  const updateUrl = (tabKey: ViewKey, leagueIds: Set<string>, pushHistory: boolean) => {
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tabKey);
    if (leagueIds.size > 0) {
      url.searchParams.set("league", Array.from(leagueIds).join(","));
    } else {
      url.searchParams.delete("league");
    }
    if (pushHistory) {
      window.history.pushState({}, "", url.toString());
    } else {
      window.history.replaceState({}, "", url.toString());
    }
  };

  // タブ切替を一元管理：URL / LocalStorage / viewを常に同期
  const changeView = (key: ViewKey, pushHistory = true) => {
    setView(key);
    setFilter(EMPTY_FILTER);
    try { localStorage.setItem(TAB_STORAGE_KEY, key); } catch { /* ignore */ }
    try { localStorage.removeItem(LEAGUE_STORAGE_KEY); } catch { /* ignore */ }
    updateUrl(key, new Set(), pushHistory);
  };

  // リーグフィルタ変更時にURLとLocalStorageを同期
  const handleFilterChange = (f: FilterState) => {
    setFilter(f);
    try {
      if (f.selectedLeagueIds.size > 0) {
        localStorage.setItem(LEAGUE_STORAGE_KEY, JSON.stringify(Array.from(f.selectedLeagueIds)));
      } else {
        localStorage.removeItem(LEAGUE_STORAGE_KEY);
      }
    } catch { /* ignore */ }
    updateUrl(view, f.selectedLeagueIds, false);
  };

  // 通常タブのデータ取得（favoritesタブ以外）—複数カテゴリは配列で渡す
  const queryCategory = spec.category === "favorites"
    ? ("euro_league" as const)
    : (spec.category as "euro_league" | "cup" | "uefa" | "national_team" | "japanese_player" | "world_cup" | ("euro_league" | "cup" | "uefa" | "national_team" | "japanese_player" | "world_cup")[]);

  const { data, error, isLoading, isFetching, refetch } = trpc.matches.list.useQuery(
    { category: queryCategory, scope: spec.scope },
    {
      enabled: spec.category !== "favorites",
      staleTime: 60_000,
    },
  );

  // お気に入りタブのデータ取得
  const { data: favData, isLoading: favLoading, error: favError } = trpc.favorites.upcomingMatches.useQuery(
    undefined,
    {
      enabled: view === "favorites",
      staleTime: 60_000,
    },
  );

  const queryError = error ?? (view === "favorites" ? favError : null) ?? null;

  const merged = useMemo(() => {
    if (view === "favorites") return favData ?? [];
    return data?.matches ?? [];
  }, [view, data?.matches, favData]);

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

  const isCurrentLoading = view === "favorites" ? favLoading : isLoading;

  // ブラウザの「戻る」「進む」ボタンでタブ・リーグフィルタを同期
  useEffect(() => {
    const handlePopState = () => {
      const resolvedTab = getInitialView();
      const resolvedLeagues = getInitialLeagues();
      setView(resolvedTab);
      setFilter({ ...EMPTY_FILTER, selectedLeagueIds: resolvedLeagues });
      try { localStorage.setItem(TAB_STORAGE_KEY, resolvedTab); } catch { /* ignore */ }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  // タブ・リーグフィルタに応じてOGP/メタタグを動的に更新
  useEffect(() => {
    updateMetaTags(view, filter.selectedLeagueIds);
  }, [view, filter.selectedLeagueIds]);

  return (
    <div className="min-h-screen">
      <SiteHeader todayLabel={todayLabel} showLocalTime={showLocalTime} onToggleLocalTime={() => setShowLocalTime((v) => !v)} />

      {/* タブナビゲーション */}
      <div className="sticky top-0 z-20 border-b border-border/70 bg-card/95 backdrop-blur">
        <div className="container">
          <div className="flex items-center justify-between gap-2">
            <div
              className="-mb-px flex flex-1 overflow-x-auto"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {VIEW_ORDER.map((key) => {
                const v = VIEWS[key];
                const Icon = v.icon;
                const isActive = view === key;
                return (
                  <button
                    key={key}
                    onClick={() => changeView(key)}
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

      {/* ヘッダー下 横長バナー広告 */}
      <div className="container py-2">
        <AdBanner slot="horizontal" />
        <AdSenseBlock slot={import.meta.env.VITE_ADSENSE_SLOT_TOP} className="mt-2" />
      </div>

      <main className="container py-6 md:py-10">
        {/* お気に入りタブのみFavoriteTeamsを表示 */}
        {view === "favorites" && (
          <div className="mb-6 rounded-xl border border-border/70 bg-card p-4 shadow-sm">
            <h2 className="mb-3 font-serif text-lg font-bold text-foreground">お気に入りチーム設定</h2>
            <FavoriteTeams />
          </div>
        )}

        <div role="tabpanel">
          <ViewSection
            title={spec.label}
            description={spec.description}
            isLoading={isCurrentLoading}
            error={queryError}
            onRetry={() => refetch()}
            matches={filtered}
            totalMatches={merged.length}
            filter={filter}
            onFilterChange={handleFilterChange}
            availableLeagues={availableLeagues}
            showScore={spec.showScore}
            emptyText={spec.emptyText}
            showLocalTime={showLocalTime}
            onToggleLocalTime={() => setShowLocalTime((v) => !v)}
          />
        </div>

        {/* 週間観戦プランナー（欧州日程タブのみ表示） */}
        {(view === "euro_upcoming" || view === "japanese_upcoming" || view === "favorites") && (
          <div className="mt-10">
            <WeeklyPlanner matches={merged} />
          </div>
        )}

        {/* アフィリエイト収益化セクション */}
        <div className="mt-10">
          <MonetizationSection />
        </div>

        {/* フッター上 横長バナー広告 */}
        <div className="mt-10">
          <AdBanner slot="horizontal" />
          <AdSenseBlock slot={import.meta.env.VITE_ADSENSE_SLOT_INLINE} className="mt-2" />
        </div>
        <SiteFooter />
      </main>
    </div>
  );
}

function SiteHeader({
  todayLabel,
  showLocalTime,
  onToggleLocalTime,
}: {
  todayLabel: string;
  showLocalTime: boolean;
  onToggleLocalTime: () => void;
}) {
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
              欧州主要リーグ・UEFA大会・カップ戦・代表戦を日本時間で一覧
            </p>
          </div>
        </div>
        <div className="flex flex-col items-start gap-2 md:items-end">
          {/* 時刻表示セグメントコントロール */}
          <div
            className="flex items-center rounded-lg border border-border bg-muted p-1 text-xs font-medium"
            role="group"
            aria-label="時刻表示切り替え"
          >
            <button
              type="button"
              onClick={() => showLocalTime && onToggleLocalTime()}
              className={`flex items-center gap-1 rounded-md px-3 py-1.5 transition-all ${
                !showLocalTime
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="font-mono">JST</span>
              <span className="hidden sm:inline">日本時間</span>
            </button>
            <button
              type="button"
              onClick={() => !showLocalTime && onToggleLocalTime()}
              className={`flex items-center gap-1 rounded-md px-3 py-1.5 transition-all ${
                showLocalTime
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Clock className="h-3 w-3" />
              <span>現地時間</span>
            </button>
          </div>
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
  showLocalTime: boolean;
  onToggleLocalTime: () => void;
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
    showLocalTime,
    onToggleLocalTime,
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
      <div className="mb-3">
        <MatchFilters
          state={filter}
          onChange={onFilterChange}
          availableLeagues={availableLeagues}
        />
      </div>
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
        <MatchScheduleTable matches={matches} showScore={showScore} emptyText={emptyText} showLocalTime={showLocalTime} />
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
      <p className="mt-3 text-[11px]">
        <a href="/privacy" className="underline hover:text-foreground">プライバシーポリシー</a>
        &nbsp;・&nbsp;
        <a href="/contact" className="underline hover:text-foreground">お問い合わせ</a>
      </p>
    </footer>
  );
}
