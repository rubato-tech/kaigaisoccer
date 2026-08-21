/**
 * ESPN公開APIを用いた2026-27欧州主要リーグの日程同期。
 *
 * TheSportsDBの2026-27各ラウンドは一部カードしか返らないため、
 * ESPNの公開スコアボードから公式発表後のシーズン全日程を取得する。
 */
import { and, eq } from "drizzle-orm";
import { matches } from "../drizzle/schema.js";
import { getDb } from "../server/db.js";
import { JAPANESE_PLAYER_TEAMS } from "../shared/leagues.js";

export interface EspnLeagueConfig {
  leagueId: string;
  espnLeagueCode: string;
  nameJp: string;
  nameEn: string;
  badgeUrl: string;
  season: string;
  startDate: string;
  endDate: string;
  expectedFixtures: number;
}

export const ESPN_EURO_LEAGUES: EspnLeagueConfig[] = [
  {
    leagueId: "4328",
    espnLeagueCode: "eng.1",
    nameJp: "プレミアリーグ",
    nameEn: "English Premier League",
    badgeUrl: "https://a.espncdn.com/i/leaguelogos/soccer/500/eng.1.png",
    season: "2026-2027",
    startDate: "20260821",
    endDate: "20270530",
    expectedFixtures: 380,
  },
  {
    leagueId: "4335",
    espnLeagueCode: "esp.1",
    nameJp: "ラ・リーガ",
    nameEn: "Spanish La Liga",
    badgeUrl: "https://a.espncdn.com/i/leaguelogos/soccer/500/esp.1.png",
    season: "2026-2027",
    startDate: "20260814",
    endDate: "20270531",
    expectedFixtures: 380,
  },
  {
    leagueId: "4332",
    espnLeagueCode: "ita.1",
    nameJp: "セリエA",
    nameEn: "Italian Serie A",
    badgeUrl: "https://a.espncdn.com/i/leaguelogos/soccer/500/ita.1.png",
    season: "2026-2027",
    startDate: "20260822",
    endDate: "20270531",
    expectedFixtures: 380,
  },
  {
    leagueId: "4331",
    espnLeagueCode: "ger.1",
    nameJp: "ブンデスリーガ",
    nameEn: "German Bundesliga",
    badgeUrl: "https://a.espncdn.com/i/leaguelogos/soccer/500/ger.1.png",
    season: "2026-2027",
    startDate: "20260828",
    endDate: "20270531",
    expectedFixtures: 306,
  },
  {
    leagueId: "4334",
    espnLeagueCode: "fra.1",
    nameJp: "リーグ・アン",
    nameEn: "French Ligue 1",
    badgeUrl: "https://a.espncdn.com/i/leaguelogos/soccer/500/fra.1.png",
    season: "2026-2027",
    startDate: "20260814",
    endDate: "20270531",
    expectedFixtures: 306,
  },
];

export const ESPN_EURO_LEAGUE_BY_ID = new Map(
  ESPN_EURO_LEAGUES.map((league) => [league.leagueId, league]),
);

export const ESPN_PREMIER_LEAGUE_URL = buildEspnScoreboardUrl(ESPN_EURO_LEAGUES[0]);

export function buildEspnScoreboardUrl(league: EspnLeagueConfig): string {
  return `https://site.api.espn.com/apis/site/v2/sports/soccer/${league.espnLeagueCode}/scoreboard?dates=${league.startDate}-${league.endDate}&limit=500`;
}

interface EspnTeam {
  id?: string;
  displayName?: string;
  logo?: string;
  logos?: Array<{ href?: string }>;
}

interface EspnCompetitor {
  homeAway?: "home" | "away";
  team?: EspnTeam;
  score?: string | number | null;
}

interface EspnEvent {
  id?: string;
  date?: string;
  week?: { number?: number };
  status?: { type?: { name?: string; completed?: boolean } };
  competitions?: Array<{
    competitors?: EspnCompetitor[];
    venue?: { fullName?: string };
  }>;
}

interface EspnScoreboard {
  events?: EspnEvent[];
}

function normalizedTeamName(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]/g, "");
}

function detectJapanesePlayerTag(homeTeam: string, awayTeam: string): string | null {
  const targets = new Set(JAPANESE_PLAYER_TEAMS.map(normalizedTeamName));
  return targets.has(normalizedTeamName(homeTeam)) || targets.has(normalizedTeamName(awayTeam))
    ? "japanese_player"
    : null;
}

function statusFromEspn(event: EspnEvent): "scheduled" | "finished" | "postponed" | "cancelled" | "live" {
  const raw = event.status?.type?.name ?? "";
  if (event.status?.type?.completed) return "finished";
  if (raw.includes("POSTPONED")) return "postponed";
  if (raw.includes("CANCELED")) return "cancelled";
  if (raw.includes("IN_PROGRESS") || raw.includes("HALFTIME")) return "live";
  return "scheduled";
}

function numericScore(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const score = Number(value);
  return Number.isFinite(score) ? score : null;
}

/**
 * 指定した2026-27欧州主要リーグをESPN公開APIからシーズン全件同期する。
 * 同リーグ・同シーズンの既存データを置き換え、不完全なTheSportsDBデータを残さない。
 */
export async function syncEspnLeagueSchedule(
  db: Awaited<ReturnType<typeof getDb>>,
  league: EspnLeagueConfig,
): Promise<{ fetched: number; upserted: number; errors: string[] }> {
  const errors: string[] = [];
  if (!db) return { fetched: 0, upserted: 0, errors: ["DB接続なし"] };

  const response = await fetch(buildEspnScoreboardUrl(league), {
    headers: { "User-Agent": "soccer-schedule-jp/1.0" },
  });
  if (!response.ok) {
    return { fetched: 0, upserted: 0, errors: [`ESPN API HTTP ${response.status}`] };
  }

  const payload = (await response.json()) as EspnScoreboard;
  const events = payload.events ?? [];
  if (events.length !== league.expectedFixtures) {
    return {
      fetched: events.length,
      upserted: 0,
      errors: [`ESPN APIの試合数が想定と一致しません（${events.length}/${league.expectedFixtures}件）`],
    };
  }

  await db
    .delete(matches)
    .where(and(eq(matches.leagueId, league.leagueId), eq(matches.season, league.season)));

  let upserted = 0;
  for (const event of events) {
    try {
      const competition = event.competitions?.[0];
      const home = competition?.competitors?.find((item) => item.homeAway === "home");
      const away = competition?.competitors?.find((item) => item.homeAway === "away");
      const homeTeam = home?.team?.displayName;
      const awayTeam = away?.team?.displayName;
      const kickoffUtcMs = event.date ? Date.parse(event.date) : Number.NaN;

      if (!event.id || !homeTeam || !awayTeam || Number.isNaN(kickoffUtcMs)) {
        errors.push(`invalid ESPN event: ${event.id ?? "unknown"}`);
        continue;
      }

      const status = statusFromEspn(event);
      const homeScore = status === "scheduled" ? null : numericScore(home?.score);
      const awayScore = status === "scheduled" ? null : numericScore(away?.score);

      await db
        .insert(matches)
        .values({
          eventId: `espn_${league.leagueId}_${event.id}`,
          category: "euro_league",
          leagueId: league.leagueId,
          leagueNameJp: league.nameJp,
          leagueNameEn: league.nameEn,
          leagueBadge: league.badgeUrl,
          season: league.season,
          round: event.week?.number ? String(event.week.number) : null,
          homeTeamId: home?.team?.id ?? null,
          homeTeam,
          homeTeamBadge: home?.team?.logo ?? home?.team?.logos?.[0]?.href ?? null,
          awayTeamId: away?.team?.id ?? null,
          awayTeam: awayTeam,
          awayTeamBadge: away?.team?.logo ?? away?.team?.logos?.[0]?.href ?? null,
          kickoffUtcMs,
          status,
          homeScore,
          awayScore,
          venue: competition?.venue?.fullName ?? null,
          tags: detectJapanesePlayerTag(homeTeam, awayTeam),
        })
        .onDuplicateKeyUpdate({
          set: {
            kickoffUtcMs,
            status,
            homeScore,
            awayScore,
            venue: competition?.venue?.fullName ?? null,
            round: event.week?.number ? String(event.week.number) : null,
            tags: detectJapanesePlayerTag(homeTeam, awayTeam),
          },
        });
      upserted += 1;
    } catch (error) {
      errors.push(`ESPN event ${event.id ?? "unknown"}: ${(error as Error).message}`);
    }
  }

  return { fetched: events.length, upserted, errors };
}
