/**
 * 取り扱うリーグ・大会の定義。
 * idLeague は TheSportsDB の値を参照。
 */

export type Category = "euro_league" | "cup" | "uefa" | "national_team";

export interface LeagueDef {
  id: string;
  /** 日本語表示名（短め） */
  nameJp: string;
  /** 原語の正式名 */
  nameEn: string;
  /** 内部カテゴリ */
  category: Category;
  /** 優先度。小さいほど上位に表示 */
  priority: number;
  /** 国コード／地域 */
  region?: string;
  /**
   * eventsround.php で取得すべきラウンド番号の配列。
   * リーグ戦は通常 1..最大ラウンド、UEFA はノックアウト独自ラウンド (125=QF, 150=SF, 160=F 等)
   */
  rounds: number[];
}

function range(start: number, end: number): number[] {
  const out: number[] = [];
  for (let i = start; i <= end; i++) out.push(i);
  return out;
}

// UEFA 大会のノックアウト・グループステージのラウンド番号 (TheSportsDB 仕様)
// 1〜8 = グループステージ／リーグフェーズ
// 125 = ラウンド16 / QF, 150 = SF, 160 = F
const UEFA_ROUNDS = [...range(1, 8), 125, 150, 160];

// カップ戦のラウンド番号 (TheSportsDB 仕様)
// 1〜8 = 予備予選〜準々決勝, 125=QF, 150=SF, 160=F
const CUP_ROUNDS = [...range(1, 10), 125, 150, 160];

export const LEAGUES: LeagueDef[] = [
  // ===== 欧州5大リーグ =====
  { id: "4328", nameJp: "プレミアリーグ",   nameEn: "English Premier League",  category: "euro_league", priority: 1, region: "England", rounds: range(1, 38) },
  { id: "4335", nameJp: "ラ・リーガ",       nameEn: "Spanish La Liga",          category: "euro_league", priority: 2, region: "Spain",   rounds: range(1, 38) },
  { id: "4332", nameJp: "セリエA",          nameEn: "Italian Serie A",          category: "euro_league", priority: 3, region: "Italy",   rounds: range(1, 38) },
  { id: "4331", nameJp: "ブンデスリーガ",   nameEn: "German Bundesliga",        category: "euro_league", priority: 4, region: "Germany", rounds: range(1, 34) },
  { id: "4334", nameJp: "リーグ・アン",     nameEn: "French Ligue 1",           category: "euro_league", priority: 5, region: "France",  rounds: range(1, 34) },

  // ===== 各国カップ戦 =====
  { id: "4482", nameJp: "FAカップ",         nameEn: "FA Cup",                   category: "cup", priority: 11, region: "England", rounds: CUP_ROUNDS },
  { id: "4483", nameJp: "コパ・デル・レイ", nameEn: "Copa del Rey",             category: "cup", priority: 12, region: "Spain",   rounds: CUP_ROUNDS },
  { id: "4506", nameJp: "コッパ・イタリア", nameEn: "Coppa Italia",             category: "cup", priority: 13, region: "Italy",   rounds: CUP_ROUNDS },
  { id: "4485", nameJp: "DFBポカール",      nameEn: "DFB-Pokal",                category: "cup", priority: 14, region: "Germany", rounds: CUP_ROUNDS },
  { id: "4484", nameJp: "クープ・ド・フランス", nameEn: "Coupe de France",      category: "cup", priority: 15, region: "France",  rounds: CUP_ROUNDS },

  // ===== UEFA 大会 =====
  { id: "4480", nameJp: "チャンピオンズリーグ", nameEn: "UEFA Champions League",   category: "uefa", priority: 21, region: "Europe", rounds: UEFA_ROUNDS },
  { id: "4481", nameJp: "ヨーロッパリーグ",     nameEn: "UEFA Europa League",       category: "uefa", priority: 22, region: "Europe", rounds: UEFA_ROUNDS },
  { id: "5071", nameJp: "カンファレンスリーグ", nameEn: "UEFA Conference League",   category: "uefa", priority: 23, region: "Europe", rounds: UEFA_ROUNDS },

  // ===== 代表戦 =====
  { id: "4429", nameJp: "W杯予選",             nameEn: "FIFA World Cup Qualifying",       category: "national_team", priority: 31, region: "World",  rounds: range(1, 12) },
  { id: "4502", nameJp: "EURO",                nameEn: "UEFA European Championships",     category: "national_team", priority: 32, region: "Europe", rounds: range(1, 8) },
  { id: "4490", nameJp: "ネーションズリーグ",  nameEn: "UEFA Nations League",             category: "national_team", priority: 33, region: "Europe", rounds: [...range(1, 6), 125, 150, 160] },
  { id: "4395", nameJp: "親善試合/その他",     nameEn: "International Friendly",          category: "national_team", priority: 34, region: "World",  rounds: range(1, 12) },
];

export const LEAGUE_BY_ID = new Map(LEAGUES.map((l) => [l.id, l] as const));

/**
 * 「日本人選手出場試合」を判定するためのチームID/チーム名のリスト。
 * TheSportsDB のチーム名（strHomeTeam/strAwayTeam）にマッチさせる。
 */
export const JAPANESE_PLAYER_TEAMS: string[] = [
  // プレミアリーグ
  "Brighton and Hove Albion", // 三笘
  "Liverpool",                // 遠藤航
  "Crystal Palace",           // 鎌田
  // ラ・リーガ
  "Real Sociedad",            // 久保
  // セリエA
  "Parma",                    // 鈴木彩艶
  "Como",
  "Venezia",
  "Cagliari",
  // ブンデスリーガ
  "Eintracht Frankfurt",
  "VfB Stuttgart",            // 伊藤洋輝
  "Borussia Monchengladbach", // 板倉
  "SC Freiburg",              // 堂安
  "FSV Mainz 05",
  // リーグ・アン
  "Stade Reims",
  "AS Monaco",                // 南野
  "Strasbourg",
  // ポルトガル（UEFA経由で出場する可能性）
  "Sporting CP",              // 守田
  // ベルギー（UEFA経由）
  "Sint-Truidense",
  "K Beerschot VA",
  // スコットランド（UEFA経由）
  "Celtic",                   // 旗手/前田/山田
  // オランダ（UEFA経由）
  "Feyenoord",                // 上田/渡辺
  "NEC Nijmegen",
];
