import { useMemo, useState } from "react";
import { Search, X, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export interface FilterState {
  /** 選択中のリーグID（空集合=全選択扱い） */
  selectedLeagueIds: Set<string>;
  /** チーム名検索キーワード（部分一致、空文字=フィルタなし） */
  teamQuery: string;
}

export const EMPTY_FILTER: FilterState = {
  selectedLeagueIds: new Set(),
  teamQuery: "",
};

interface LeagueOption {
  id: string;
  label: string;
  count: number;
}

interface Props {
  state: FilterState;
  onChange: (next: FilterState) => void;
  /** 現在のビューに含まれているリーグ一覧（出現件数つき） */
  availableLeagues: LeagueOption[];
}

export function MatchFilters({ state, onChange, availableLeagues }: Props) {
  const [expanded, setExpanded] = useState(false);
  const activeCount = state.selectedLeagueIds.size + (state.teamQuery.trim() ? 1 : 0);

  function toggleLeague(id: string) {
    const next = new Set(state.selectedLeagueIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange({ ...state, selectedLeagueIds: next });
  }

  function reset() {
    onChange(EMPTY_FILTER);
  }

  const sortedLeagues = useMemo(
    () => [...availableLeagues].sort((a, b) => a.label.localeCompare(b.label, "ja")),
    [availableLeagues],
  );

  return (
    <div className="mb-5 rounded-xl border border-border/70 bg-card/70 p-3 sm:p-4">
      {/* 検索ボックス + リセット行 */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={state.teamQuery}
            placeholder="チーム名で検索（例：レアル、リバプール）"
            onChange={(e) => onChange({ ...state, teamQuery: e.target.value })}
            className="h-9 bg-background pl-8 text-sm"
            aria-label="チーム名検索"
          />
          {state.teamQuery && (
            <button
              type="button"
              aria-label="検索をクリア"
              onClick={() => onChange({ ...state, teamQuery: "" })}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground hover:bg-secondary"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-9 bg-card"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          リーグ絞り込み
          {state.selectedLeagueIds.size > 0 && (
            <span className="ml-1.5 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
              {state.selectedLeagueIds.size}
            </span>
          )}
          <ChevronDown
            className={`ml-1 h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </Button>

        {activeCount > 0 && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-9 text-xs"
            onClick={reset}
          >
            <X className="mr-1 h-3.5 w-3.5" />
            すべて解除
          </Button>
        )}
      </div>

      {/* リーグチップ群（折りたたみ） */}
      {expanded && (
        <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border/50 pt-3">
          {sortedLeagues.length === 0 && (
            <span className="text-xs text-muted-foreground">
              該当リーグがありません。
            </span>
          )}
          {sortedLeagues.map((l) => {
            const active = state.selectedLeagueIds.has(l.id);
            return (
              <button
                key={l.id}
                type="button"
                aria-pressed={active}
                onClick={() => toggleLeague(l.id)}
                className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-secondary text-secondary-foreground hover:bg-secondary/70"
                }`}
              >
                {l.label}
                <span
                  className={`text-[10px] font-mono tabular-nums ${
                    active ? "text-primary-foreground/80" : "text-muted-foreground"
                  }`}
                >
                  {l.count}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
