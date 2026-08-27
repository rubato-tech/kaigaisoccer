/**
 * お気に入りチーム管理コンポーネント
 * - ログイン済み: サーバー側 favorites テーブルに保存
 * - 未ログイン: localStorage に保存
 */
import { useState, useEffect, useMemo } from "react";
import { Star, StarOff, Search, X, CalendarPlus, Download, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/\_core/hooks/useAuth";
import { TEAM_NAME_JP } from "@shared/teamNames";
import { toast } from "sonner";
import { TIMETREE_EXTERNAL_CALENDAR_HELP_URL } from "@/lib/calendar";

const LS_KEY = "fav_teams_v1";

function loadLocalFavs(): string[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}
function saveLocalFavs(teams: string[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(teams));
}

/** 全チーム一覧（teamNames.tsのキーから生成） */
const ALL_TEAMS = Object.keys(TEAM_NAME_JP).sort((a, b) => {
  const ja = TEAM_NAME_JP[a] ?? a;
  const jb = TEAM_NAME_JP[b] ?? b;
  return ja.localeCompare(jb, "ja");
});

interface Props {
  /** お気に入りチームが変わった時のコールバック */
  onFavsChange?: (teams: string[]) => void;
}

export function FavoriteTeams({ onFavsChange }: Props) {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  // サーバー側お気に入り（ログイン時）
  const { data: serverFavs } = trpc.favorites.list.useQuery(undefined, {
    enabled: !!user,
  });
  // iCalトークン（署名付き）
  const { data: icalTokenData } = trpc.favorites.icalToken.useQuery(undefined, {
    enabled: !!user,
  });
  const addMutation = trpc.favorites.add.useMutation({
    onSuccess: () => utils.favorites.list.invalidate(),
  });
  const removeMutation = trpc.favorites.remove.useMutation({
    onSuccess: () => utils.favorites.list.invalidate(),
  });

  // ローカル側お気に入り（未ログイン時）
  const [localFavs, setLocalFavs] = useState<string[]>(loadLocalFavs);

  const favs: string[] = user ? (serverFavs ?? []) : localFavs;

  useEffect(() => {
    onFavsChange?.(favs);
  }, [favs.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  const [search, setSearch] = useState("");
  const [showPicker, setShowPicker] = useState(false);

  const filteredTeams = useMemo(() => {
    const q = search.toLowerCase();
    return ALL_TEAMS.filter((t) => {
      const jp = (TEAM_NAME_JP[t] ?? t).toLowerCase();
      return jp.includes(q) || t.toLowerCase().includes(q);
    }).slice(0, 60);
  }, [search]);

  function toggleFav(teamName: string) {
    const isFav = favs.includes(teamName);
    if (user) {
      if (isFav) {
        removeMutation.mutate({ teamName });
        toast.success(`${TEAM_NAME_JP[teamName] ?? teamName} をお気に入りから削除しました`);
      } else {
        addMutation.mutate({ teamName });
        toast.success(`${TEAM_NAME_JP[teamName] ?? teamName} をお気に入りに追加しました`);
      }
    } else {
      const next = isFav ? localFavs.filter((t) => t !== teamName) : [...localFavs, teamName];
      setLocalFavs(next);
      saveLocalFavs(next);
      toast.success(
        isFav
          ? `${TEAM_NAME_JP[teamName] ?? teamName} をお気に入りから削除しました`
          : `${TEAM_NAME_JP[teamName] ?? teamName} をお気に入りに追加しました`,
      );
    }
  }

  return (
    <div className="space-y-3">
      {/* お気に入りチップ一覧 */}
      <div className="flex flex-wrap gap-2">
        {favs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            お気に入りチームを登録すると、そのチームの試合だけを絞り込んで表示できます。
          </p>
        ) : (
          favs.map((t) => (
            <Badge
              key={t}
              variant="secondary"
              className="cursor-pointer gap-1 pr-1 hover:bg-destructive/20"
              onClick={() => toggleFav(t)}
            >
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              {TEAM_NAME_JP[t] ?? t}
              <X className="h-3 w-3 text-muted-foreground" />
            </Badge>
          ))
        )}
        <Button
          size="sm"
          variant="outline"
          className="h-6 gap-1 px-2 text-xs"
          onClick={() => setShowPicker((v) => !v)}
        >
          <Star className="h-3 w-3" />
          {showPicker ? "閉じる" : "チームを追加"}
        </Button>
      </div>

      {/* チーム検索ピッカー */}
      {showPicker && (
        <div className="rounded-lg border border-border bg-card p-3 shadow-sm">
          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              className="h-8 pl-8 text-sm"
              placeholder="チーム名で検索…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>
          <div className="flex max-h-48 flex-wrap gap-1.5 overflow-y-auto">
            {filteredTeams.map((t) => {
              const isFav = favs.includes(t);
              return (
                <Badge
                  key={t}
                  variant={isFav ? "default" : "outline"}
                  className="cursor-pointer gap-1 text-xs"
                  onClick={() => toggleFav(t)}
                >
                  {isFav ? (
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  ) : (
                    <StarOff className="h-3 w-3" />
                  )}
                  {TEAM_NAME_JP[t] ?? t}
                </Badge>
              );
            })}
            {filteredTeams.length === 0 && (
              <p className="text-xs text-muted-foreground">チームが見つかりません</p>
            )}
          </div>
        </div>
      )}

      {/* カレンダー連携ボタン（お気に入りがある場合のみ） */}
      {favs.length > 0 && user && (
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1.5 text-xs"
            onClick={() => {
              const token = icalTokenData?.token;
              if (!token) return;
              window.open(`/api/ical/${token}`, "_blank");
            }}
          >
            <Download className="h-3.5 w-3.5" />
            TimeTree / iCal
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 gap-1.5 text-xs text-muted-foreground"
            onClick={() => window.open(TIMETREE_EXTERNAL_CALENDAR_HELP_URL, "_blank", "noopener,noreferrer")}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            TimeTreeの設定
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1.5 text-xs"
            onClick={() => {
              const token = icalTokenData?.token;
              if (!token) return;
              const icalUrl = `${window.location.origin}/api/ical/${token}`;
              const gcalUrl = `https://www.google.com/calendar/render?cid=${encodeURIComponent(icalUrl)}`;
              window.open(gcalUrl, "_blank");
            }}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Google カレンダーに追加
          </Button>
        </div>
      )}
      {favs.length > 0 && !user && (
        <p className="text-xs text-muted-foreground">
          ログインするとiCalフィードをGoogleカレンダーまたはTimeTreeで利用できます。
        </p>
      )}
    </div>
  );
}
