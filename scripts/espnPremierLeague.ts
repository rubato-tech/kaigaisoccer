/**
 * ESPN公開APIを用いた2026-27欧州大会の日程同期。
 *
 * TheSportsDB無料APIは新シーズンの一部ラウンドしか返さない場合があるため、
 * ESPNが公開しているリーグ戦・UEFA大会・一部国内カップはESPNを優先する。
 * 抽選未実施のカップ戦（FAカップ等）はTheSportsDBのラウンド同期を継続する。
 */
import { and, eq } from "drizzle-orm";
import { matches } from "../drizzle/schema.js";
import { getDb } from "../server/db.js";
import { JAPANESE_PLAYER_TEAMS, type Category } from "../shared/leagues.js";

type EspnCategory = Extract<Category, "euro_league" | "cup" | "uefa">;

export interface EspnLeagueConfig {
  leagueId: string;
  espnLeagueCode: string;
  nameJp: string;
  nameEn: string;
  badgeUrl: string;
  category: EspnCategory;
  season: string;
  startDate: string;
  endDate: string;
  /** 全日程が確定するリーグ戦などの厳密な試合数 */
  expectedFixtures?: number;
  /** 抽選進行中の大会など、同期を許可する最低試合数 */
  minimumFixtures?: number;
}

const SEASON = "2026-2027";
const SEASON_END = "20270531";

export const ESPN_EURO_LEAGUES: EspnLeagueConfig[] = [
  // 欧州リーグ戦
  { leagueId: "4328", espnLeagueCode: "eng.1", nameJp: "プレミアリーグ", nameEn: "English Premier League", badgeUrl: "https://a.espncdn.com/i/leaguelogos/soccer/500/eng.1.png", category: "euro_league", season: SEASON, startDate: "20260821", endDate: SEASON_END, expectedFixtures: 380 },
  { leagueId: "4335", espnLeagueCode: "esp.1", nameJp: "ラ・リーガ", nameEn: "Spanish La Liga", badgeUrl: "https://a.espncdn.com/i/leaguelogos/soccer/500/esp.1.png", category: "euro_league", season: SEASON, startDate: "20260814", endDate: SEASON_END, expectedFixtures: 380 },
  { leagueId: "4332", espnLeagueCode: "ita.1", nameJp: "セリエA", nameEn: "Italian Serie A", badgeUrl: "https://a.espncdn.com/i/leaguelogos/soccer/500/ita.1.png", category: "euro_league", season: SEASON, startDate: "20260822", endDate: SEASON_END, expectedFixtures: 380 },
  { leagueId: "4331", espnLeagueCode: "ger.1", nameJp: "ブンデスリーガ", nameEn: "German Bundesliga", badgeUrl: "https://a.espncdn.com/i/leaguelogos/soccer/500/ger.1.png", category: "euro_league", season: SEASON, startDate: "20260828", endDate: SEASON_END, expectedFixtures: 306 },
  { leagueId: "4334", espnLeagueCode: "fra.1", nameJp: "リーグ・アン", nameEn: "French Ligue 1", badgeUrl: "https://a.espncdn.com/i/leaguelogos/soccer/500/fra.1.png", category: "euro_league", season: SEASON, startDate: "20260821", endDate: SEASON_END, expectedFixtures: 306 },
  { leagueId: "4330", espnLeagueCode: "sco.1", nameJp: "スコティッシュ・プレミアシップ", nameEn: "Scottish Premiership", badgeUrl: "https://a.espncdn.com/i/leaguelogos/soccer/500/sco.1.png", category: "euro_league", season: SEASON, startDate: "20260801", endDate: "20270430", minimumFixtures: 190 },
  { leagueId: "4337", espnLeagueCode: "ned.1", nameJp: "エールディビジ", nameEn: "Dutch Eredivisie", badgeUrl: "https://a.espncdn.com/i/leaguelogos/soccer/500/ned.1.png", category: "euro_league", season: SEASON, startDate: "20260807", endDate: SEASON_END, expectedFixtures: 306 },
  { leagueId: "4338", espnLeagueCode: "bel.1", nameJp: "ジュピラー・プロ・リーグ", nameEn: "Belgian Pro League", badgeUrl: "https://a.espncdn.com/i/leaguelogos/soccer/500/bel.1.png", category: "euro_league", season: SEASON, startDate: "20260807", endDate: SEASON_END, expectedFixtures: 306 },
  { leagueId: "4344", espnLeagueCode: "por.1", nameJp: "プリメイラ・リーガ", nameEn: "Portuguese Primeira Liga", badgeUrl: "https://a.espncdn.com/i/leaguelogos/soccer/500/por.1.png", category: "euro_league", season: SEASON, startDate: "20260807", endDate: SEASON_END, expectedFixtures: 306 },
  { leagueId: "4339", espnLeagueCode: "tur.1", nameJp: "スュペル・リグ", nameEn: "Turkish Super Lig", badgeUrl: "https://a.espncdn.com/i/leaguelogos/soccer/500/tur.1.png", category: "euro_league", season: SEASON, startDate: "20260814", endDate: SEASON_END, expectedFixtures: 306 },
  { leagueId: "4329", espnLeagueCode: "eng.2", nameJp: "チャンピオンシップ", nameEn: "English League Championship", badgeUrl: "https://a.espncdn.com/i/leaguelogos/soccer/500/eng.2.png", category: "euro_league", season: SEASON, startDate: "20260814", endDate: "20270501", expectedFixtures: 552 },
  // 国内カップ（抽選済みカードのみ。未決定ラウンドは今後の同期で追加）
  { leagueId: "4570", espnLeagueCode: "eng.league_cup", nameJp: "EFLカップ", nameEn: "EFL Cup", badgeUrl: "https://a.espncdn.com/i/leaguelogos/soccer/500/eng.league_cup.png", category: "cup", season: SEASON, startDate: "20260801", endDate: SEASON_END, minimumFixtures: 60 },
  { leagueId: "4506", espnLeagueCode: "ita.coppa_italia", nameJp: "コッパ・イタリア", nameEn: "Coppa Italia", badgeUrl: "https://a.espncdn.com/i/leaguelogos/soccer/500/ita.coppa_italia.png", category: "cup", season: SEASON, startDate: "20260801", endDate: SEASON_END, expectedFixtures: 45 },
  { leagueId: "4485", espnLeagueCode: "ger.dfb_pokal", nameJp: "DFBポカール", nameEn: "DFB-Pokal", badgeUrl: "https://a.espncdn.com/i/leaguelogos/soccer/500/ger.dfb_pokal.png", category: "cup", season: SEASON, startDate: "20260801", endDate: SEASON_END, minimumFixtures: 40 },
  // UEFA大会（リーグフェーズの確定カードを同期。決勝Tは組み合わせ確定後に自動追加）
  { leagueId: "4480", espnLeagueCode: "uefa.champions", nameJp: "チャンピオンズリーグ", nameEn: "UEFA Champions League", badgeUrl: "https://a.espncdn.com/i/leaguelogos/soccer/500/uefa.champions.png", category: "uefa", season: SEASON, startDate: "20260801", endDate: SEASON_END, minimumFixtures: 144 },
  { leagueId: "4481", espnLeagueCode: "uefa.europa", nameJp: "ヨーロッパリーグ", nameEn: "UEFA Europa League", badgeUrl: "https://a.espncdn.com/i/leaguelogos/soccer/500/uefa.europa.png", category: "uefa", season: SEASON, startDate: "20260801", endDate: SEASON_END, minimumFixtures: 144 },
  { leagueId: "5071", espnLeagueCode: "uefa.europa.conf", nameJp: "カンファレンスリーグ", nameEn: "UEFA Conference League", badgeUrl: "https://a.espncdn.com/i/leaguelogos/soccer/500/uefa.europa.conf.png", category: "uefa", season: SEASON, startDate: "20260801", endDate: SEASON_END, minimumFixtures: 108 },
];

export const ESPN_EURO_LEAGUE_BY_ID = new Map(
  ESPN_EURO_LEAGUES.map((league) => [league.leagueId, league]),
);

export const ESPN_PREMIER_LEAGUE_URL = buildEspnScoreboardUrl(ESPN_EURO_LEAGUES[0]!);

export function buildEspnScoreboardUrl(league: EspnLeagueConfig): string {
  return buildEspnScoreboardUrls(league)[0]!;
}

/**
 * ESPNのsite.apiホストは環境により403となり、日付範囲クエリも400となることがある。
 * 安定して年間日程を返すsite.web.apiを利用し、シーズンをまたぐため開始・終了年を別取得する。
 */
export function buildEspnScoreboardUrls(league: EspnLeagueConfig): string[] {
  const startYear = league.startDate.slice(0, 4);
  const endYear = league.endDate.slice(0, 4);
  return [...new Set([startYear, endYear])].map((year) =>
    `https://site.web.api.espn.com/apis/site/v2/sports/soccer/${league.espnLeagueCode}/scoreboard?dates=${year}&limit=600`,
  );
}

export type DuplicateSourcePreference = "espn" | "fallback";

export interface FixtureIdentityRecord {
  eventId: string;
  leagueId: string;
  kickoffUtcMs: number;
  homeTeam: string;
  awayTeam: string;
}

/**
 * 異なるデータソース間でチーム名の接尾辞・記号表記が異なる場合を吸収する。
 * 例: "AFC Bournemouth" / "Bournemouth"、"Paris Saint-Germain" / "Paris Saint Germain"。
 */
export function normalizeFixtureTeamName(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\b(?:football\s+club|afc|fc|cf|sc|ac|ssc|calcio)\b/g, " ")
    .replace(/[^a-z0-9]/g, "");
}

/** 同じ大会・キックオフ・対戦カードを同一試合として扱うためのキー。 */
export function buildFixtureIdentity(record: FixtureIdentityRecord): string {
  return [
    record.leagueId,
    Number(record.kickoffUtcMs),
    normalizeFixtureTeamName(record.homeTeam),
    normalizeFixtureTeamName(record.awayTeam),
  ].join("|");
}

/**
 * 同一試合として重複した行のうち、削除対象の eventId を返す。
 * ESPN取得成功時はESPN行を優先し、ESPN障害時のTheSportsDBフォールバック後は
 * 今回取得したフォールバック行を優先する。これにより両ソースを併記しない。
 */
export function selectDuplicateFixtureIds(
  records: FixtureIdentityRecord[],
  preferredSource: DuplicateSourcePreference,
): string[] {
  const groups = new Map<string, FixtureIdentityRecord[]>();
  for (const record of records) {
    const key = buildFixtureIdentity(record);
    groups.set(key, [...(groups.get(key) ?? []), record]);
  }

  const eventIdsToDelete: string[] = [];
  for (const candidates of groups.values()) {
    if (candidates.length < 2) continue;
    const preferred = candidates.find((candidate) => {
      const isEspn = candidate.eventId.startsWith("espn_");
      return preferredSource === "espn" ? isEspn : !isEspn;
    });
    const retainedId = preferred?.eventId ?? candidates[0]!.eventId;
    eventIdsToDelete.push(...candidates
      .filter((candidate) => candidate.eventId !== retainedId)
      .map((candidate) => candidate.eventId));
  }
  return eventIdsToDelete;
}

/**
 * ESPNとTheSportsDBのeventIdは異なるため、UPSERTだけでは同一カードが共存する。
 * 大会単位で照合し、優先ソース以外の同一カードを削除する。
 */
export async function reconcileDuplicateFixtures(
  db: Awaited<ReturnType<typeof getDb>>,
  league: Pick<EspnLeagueConfig, "leagueId">,
  preferredSource: DuplicateSourcePreference,
): Promise<number> {
  if (!db) return 0;
  const rows = await db
    .select({
      eventId: matches.eventId,
      leagueId: matches.leagueId,
      kickoffUtcMs: matches.kickoffUtcMs,
      homeTeam: matches.homeTeam,
      awayTeam: matches.awayTeam,
    })
    .from(matches)
    .where(eq(matches.leagueId, league.leagueId));
  const eventIdsToDelete = selectDuplicateFixtureIds(rows, preferredSource);
  for (const eventId of eventIdsToDelete) {
    await db.delete(matches).where(eq(matches.eventId, eventId));
  }
  return eventIdsToDelete.length;
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

export interface EspnEvent {
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

/** ESPN年別日程を結合し、対象シーズンの期間内にある公開済みカードだけを返す。 */
export async function fetchEspnLeagueSchedule(league: EspnLeagueConfig): Promise<EspnEvent[]> {
  const responses = await Promise.all(
    buildEspnScoreboardUrls(league).map(async (url) => {
      const response = await fetch(url, {
        headers: { "User-Agent": "soccer-schedule-jp/1.0" },
      });
      if (!response.ok) throw new Error(`ESPN API HTTP ${response.status}`);
      return (await response.json()) as EspnScoreboard;
    }),
  );

  const startUtcMs = Date.parse(`${league.startDate.slice(0, 4)}-${league.startDate.slice(4, 6)}-${league.startDate.slice(6, 8)}T00:00:00.000Z`);
  const endUtcMs = Date.parse(`${league.endDate.slice(0, 4)}-${league.endDate.slice(4, 6)}-${league.endDate.slice(6, 8)}T23:59:59.999Z`);
  const eventsById = new Map<string, EspnEvent>();
  for (const event of responses.flatMap((payload) => payload.events ?? [])) {
    const kickoffUtcMs = event.date ? Date.parse(event.date) : Number.NaN;
    if (!event.id || Number.isNaN(kickoffUtcMs) || kickoffUtcMs < startUtcMs || kickoffUtcMs > endUtcMs) continue;
    eventsById.set(event.id, event);
  }
  return [...eventsById.values()].sort((a, b) => Date.parse(a.date ?? "") - Date.parse(b.date ?? ""));
}

function normalizedTeamName(value: string): string {
  return value.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]/g, "");
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

function validateFixtureCount(league: EspnLeagueConfig, eventCount: number): string | null {
  if (league.expectedFixtures !== undefined && eventCount !== league.expectedFixtures) {
    return `ESPN APIの試合数が想定と一致しません（${eventCount}/${league.expectedFixtures}件）`;
  }
  if (league.minimumFixtures !== undefined && eventCount < league.minimumFixtures) {
    return `ESPN APIの試合数が同期下限を下回っています（${eventCount}/${league.minimumFixtures}件）`;
  }
  return null;
}

/**
 * ESPN公開APIから大会の全公開済み日程を同期する。
 * 同一大会・シーズンの既存データを置換し、不完全なTheSportsDBデータを残さない。
 */
export async function syncEspnLeagueSchedule(
  db: Awaited<ReturnType<typeof getDb>>,
  league: EspnLeagueConfig,
): Promise<{ fetched: number; upserted: number; errors: string[] }> {
  const errors: string[] = [];
  if (!db) return { fetched: 0, upserted: 0, errors: ["DB接続なし"] };

  let events: EspnEvent[];
  try {
    events = await fetchEspnLeagueSchedule(league);
  } catch (error) {
    return { fetched: 0, upserted: 0, errors: [(error as Error).message] };
  }
  const countError = validateFixtureCount(league, events.length);
  if (countError) return { fetched: events.length, upserted: 0, errors: [countError] };

  await db.delete(matches).where(and(eq(matches.leagueId, league.leagueId), eq(matches.season, league.season)));

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
      await db.insert(matches).values({
        eventId: `espn_${league.leagueId}_${event.id}`,
        category: league.category,
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
        awayTeam,
        awayTeamBadge: away?.team?.logo ?? away?.team?.logos?.[0]?.href ?? null,
        kickoffUtcMs,
        status,
        homeScore: status === "scheduled" ? null : numericScore(home?.score),
        awayScore: status === "scheduled" ? null : numericScore(away?.score),
        venue: competition?.venue?.fullName ?? null,
        tags: detectJapanesePlayerTag(homeTeam, awayTeam),
      }).onDuplicateKeyUpdate({
        set: {
          category: league.category,
          kickoffUtcMs,
          status,
          homeScore: status === "scheduled" ? null : numericScore(home?.score),
          awayScore: status === "scheduled" ? null : numericScore(away?.score),
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
