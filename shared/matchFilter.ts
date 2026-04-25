import { teamNameJp } from "./teamNames";

export interface MatchFilterInput {
  /** 選択中のリーグID（空=全選択扱い） */
  selectedLeagueIds: Set<string>;
  /** チーム名検索キーワード（前後空白除去後、部分一致） */
  teamQuery: string;
}

export interface MatchLike {
  leagueId: string;
  homeTeam: string;
  awayTeam: string;
}

/**
 * 試合が現在のフィルタ条件にマッチするかを判定する。
 * - selectedLeagueIds が空の場合、リーグでの絞り込みは無効（全リーグ通過）。
 * - teamQuery は原語名・カタカナ表記の双方に対して大文字小文字を無視した部分一致でマッチさせる。
 */
export function matchesFilter(m: MatchLike, f: MatchFilterInput): boolean {
  if (f.selectedLeagueIds.size > 0 && !f.selectedLeagueIds.has(m.leagueId)) {
    return false;
  }
  const q = f.teamQuery.trim();
  if (!q) return true;
  const ql = q.toLowerCase();
  const candidates = [
    m.homeTeam,
    m.awayTeam,
    teamNameJp(m.homeTeam),
    teamNameJp(m.awayTeam),
  ];
  return candidates.some((s) => s.toLowerCase().includes(ql));
}

export function applyMatchFilter<T extends MatchLike>(
  matches: T[],
  f: MatchFilterInput,
): T[] {
  if (f.selectedLeagueIds.size === 0 && !f.teamQuery.trim()) return matches;
  return matches.filter((m) => matchesFilter(m, f));
}
