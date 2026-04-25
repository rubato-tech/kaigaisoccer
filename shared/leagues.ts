/**
 * 取り扱うリーグ・大会の定義。
 * idLeague は TheSportsDB の値を参照。
 */

export type Category = "euro_league" | "uefa" | "national_team";

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

export const LEAGUES: LeagueDef[] = [
  // 欧州主要リーグ
  { id: "4328", nameJp: "プレミアリーグ", nameEn: "English Premier League", category: "euro_league", priority: 1, region: "England", rounds: range(1, 38) },
  { id: "4335", nameJp: "リーガ", nameEn: "Spanish La Liga", category: "euro_league", priority: 2, region: "Spain", rounds: range(1, 38) },
  { id: "4332", nameJp: "セリエA", nameEn: "Italian Serie A", category: "euro_league", priority: 3, region: "Italy", rounds: range(1, 38) },
  { id: "4331", nameJp: "ブンデスリーガ", nameEn: "German Bundesliga", category: "euro_league", priority: 4, region: "Germany", rounds: range(1, 34) },
  { id: "4334", nameJp: "リーグアン", nameEn: "French Ligue 1", category: "euro_league", priority: 5, region: "France", rounds: range(1, 34) },
  { id: "4337", nameJp: "エールディビジ", nameEn: "Dutch Eredivisie", category: "euro_league", priority: 6, region: "Netherlands", rounds: range(1, 34) },
  { id: "4344", nameJp: "ポルトガル", nameEn: "Portuguese Primeira Liga", category: "euro_league", priority: 7, region: "Portugal", rounds: range(1, 34) },
  { id: "4338", nameJp: "ベルギー", nameEn: "Belgian Pro League", category: "euro_league", priority: 8, region: "Belgium", rounds: range(1, 30) },
  { id: "4339", nameJp: "トルコ", nameEn: "Turkish Super Lig", category: "euro_league", priority: 9, region: "Turkey", rounds: range(1, 38) },
  { id: "4330", nameJp: "スコットランド", nameEn: "Scottish Premier League", category: "euro_league", priority: 10, region: "Scotland", rounds: range(1, 38) },
  { id: "4675", nameJp: "スイス", nameEn: "Swiss Super League", category: "euro_league", priority: 11, region: "Switzerland", rounds: range(1, 36) },
  { id: "4621", nameJp: "オーストリア", nameEn: "Austrian Bundesliga", category: "euro_league", priority: 12, region: "Austria", rounds: range(1, 32) },

  // UEFA 大会
  { id: "4480", nameJp: "CL", nameEn: "UEFA Champions League", category: "uefa", priority: 21, region: "Europe", rounds: UEFA_ROUNDS },
  { id: "4481", nameJp: "EL", nameEn: "UEFA Europa League", category: "uefa", priority: 22, region: "Europe", rounds: UEFA_ROUNDS },
  { id: "5071", nameJp: "ECL", nameEn: "UEFA Conference League", category: "uefa", priority: 23, region: "Europe", rounds: UEFA_ROUNDS },

  // 代表戦
  { id: "4429", nameJp: "W杯予選", nameEn: "FIFA World Cup Qualifying", category: "national_team", priority: 31, region: "World", rounds: range(1, 12) },
  { id: "4502", nameJp: "EURO", nameEn: "UEFA European Championships", category: "national_team", priority: 32, region: "Europe", rounds: range(1, 8) },
  { id: "4490", nameJp: "ネーションズリーグ", nameEn: "UEFA Nations League", category: "national_team", priority: 33, region: "Europe", rounds: [...range(1, 6), 125, 150, 160] },
  { id: "4395", nameJp: "親善試合/その他", nameEn: "International Friendly", category: "national_team", priority: 34, region: "World", rounds: range(1, 12) },
];

export const LEAGUE_BY_ID = new Map(LEAGUES.map((l) => [l.id, l] as const));

/**
 * 「日本人選手出場試合」を判定するためのチームID/チーム名のリスト。
 * TheSportsDB のチーム名（strHomeTeam/strAwayTeam）にマッチさせる。
 * 状況によって所属チームは変わるため、チーム名ベースでメンテしやすくしている。
 */
export const JAPANESE_PLAYER_TEAMS: string[] = [
  // プレミアリーグ
  "Brighton and Hove Albion", // 三笘
  "Liverpool", // 遠藤航
  "Crystal Palace", // 鎌田
  // リーガ
  "Real Sociedad", // 久保
  // セリエA
  "Lazio", // 鎌田 (移籍歴) - 念のため
  "Parma", // 鈴木彩艶
  "Como", // モリス
  "Venezia",
  "Cagliari",
  // ブンデスリーガ
  "Eintracht Frankfurt", // 堂安/長谷部歴
  "VfB Stuttgart", // 伊藤洋輝/チェイス・アンリ歴
  "Borussia Monchengladbach", // 板倉
  "SC Freiburg", // 堂安
  "FSV Mainz 05",
  // リーグアン
  "Stade Reims",
  "AS Monaco", // 南野
  "Strasbourg",
  // ポルトガル
  "Sporting CP", // 守田
  // ベルギー
  "Sint-Truidense", // 日本人選手多数
  "K Beerschot VA",
  // スコットランド
  "Celtic", // 旗手/前田/古橋(歴)/ 山田
  // オランダ
  "Feyenoord", // 上田/渡辺
  "NEC Nijmegen",
];
