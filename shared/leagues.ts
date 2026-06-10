/**
 * 取り扱うリーグ・大会の定義。
 * idLeague は TheSportsDB の値を参照。
 */
export type Category = "euro_league" | "cup" | "uefa" | "national_team" | "world_cup";
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
  /**
   * シーズン文字列を固定する場合に指定（例: WC2026 は "2026"）。
   * 指定がない場合は fetchCurrentSeason() で自動取得。
   */
  fixedSeason?: string;
  /**
   * ラウンド推定をスキップして rounds 配列の全ラウンドを取得する場合に true。
   * WC2026 のように fixedSeason が指定されていて next/past が正しく返らない場合に使用。
   */
  fetchAllRounds?: boolean;
}
function range(start: number, end: number): number[] {
  const out: number[] = [];
  for (let i = start; i <= end; i++) out.push(i);
  return out;
}
// UEFA 大会のノックアウト・グループステージのラウンド番号 (TheSportsDB 仕様)
// 1〜8 = グループステージ／リーグフェーズ
// 125 = ラウンド16 / QF, 150 = SF, 160 = F
const UEFA_ROUNDS = [...range(1, 8), 125, 150, 160, 200];
// カップ戦のラウンド番号 (TheSportsDB 仕様)
// 1〜8 = 予備予選〜準々決勝, 125=QF, 150=SF, 160=F
const CUP_ROUNDS = [...range(1, 10), 125, 150, 160, 200];
// WC2026 のラウンド番号
// R1〜R3 = グループステージ（各24試合）、R4以降 = ノックアウト
// TheSportsDB での WC2026: id=4429, season="2026"
const WC2026_ROUNDS = [...range(1, 8), 125, 150, 160, 200];

export const LEAGUES: LeagueDef[] = [
  // ===== 欧州5大リーグ =====
  { id: "4328", nameJp: "プレミアリーグ",       nameEn: "English Premier League",     category: "euro_league", priority: 1,  region: "England",     rounds: range(1, 38) },
  { id: "4335", nameJp: "ラ・リーガ",           nameEn: "Spanish La Liga",             category: "euro_league", priority: 2,  region: "Spain",       rounds: range(1, 38) },
  { id: "4332", nameJp: "セリエA",              nameEn: "Italian Serie A",             category: "euro_league", priority: 3,  region: "Italy",       rounds: range(1, 38) },
  { id: "4331", nameJp: "ブンデスリーガ",       nameEn: "German Bundesliga",           category: "euro_league", priority: 4,  region: "Germany",     rounds: range(1, 34) },
  { id: "4334", nameJp: "リーグ・アン",         nameEn: "French Ligue 1",              category: "euro_league", priority: 5,  region: "France",      rounds: range(1, 34) },
  // ===== 日本人選手所属リーグ（5大リーグ以外） =====
  { id: "4330", nameJp: "スコティッシュ・プレミアシップ", nameEn: "Scottish Premiership",  category: "euro_league", priority: 7,  region: "Scotland",    rounds: range(1, 38) },
  { id: "4337", nameJp: "エールディビジ",       nameEn: "Dutch Eredivisie",            category: "euro_league", priority: 8,  region: "Netherlands", rounds: range(1, 34) },
  { id: "4338", nameJp: "ジュピラー・プロ・リーグ", nameEn: "Belgian Pro League",       category: "euro_league", priority: 9,  region: "Belgium",     rounds: range(1, 34) },
  { id: "4344", nameJp: "プリメイラ・リーガ",   nameEn: "Portuguese Primeira Liga",    category: "euro_league", priority: 10, region: "Portugal",    rounds: range(1, 34) },
  { id: "4339", nameJp: "スュペル・リグ",       nameEn: "Turkish Super Lig",           category: "euro_league", priority: 11, region: "Turkey",      rounds: range(1, 34) },
  // ===== イングランド2部 =====
  { id: "4329", nameJp: "チャンピオンシップ",    nameEn: "English League Championship",  category: "euro_league", priority: 6,  region: "England",     rounds: range(1, 46) },
  // ===== 各国カップ戦（5大リーグ） =====
  { id: "4482", nameJp: "FAカップ",             nameEn: "FA Cup",                      category: "cup", priority: 11, region: "England",     rounds: CUP_ROUNDS },
  { id: "4570", nameJp: "EFLカップ",           nameEn: "EFL Cup",                     category: "cup", priority: 12, region: "England",     rounds: CUP_ROUNDS },
  { id: "4483", nameJp: "コパ・デル・レイ",     nameEn: "Copa del Rey",                category: "cup", priority: 13, region: "Spain",       rounds: CUP_ROUNDS },
  { id: "4506", nameJp: "コッパ・イタリア",     nameEn: "Coppa Italia",                category: "cup", priority: 14, region: "Italy",       rounds: CUP_ROUNDS },
  { id: "4485", nameJp: "DFBポカール",          nameEn: "DFB-Pokal",                   category: "cup", priority: 15, region: "Germany",     rounds: CUP_ROUNDS },
  { id: "4484", nameJp: "クープ・ド・フランス", nameEn: "Coupe de France",             category: "cup", priority: 16, region: "France",      rounds: CUP_ROUNDS },
  // ===== 各国カップ戦（日本人所属リーグ） =====
  { id: "4510", nameJp: "タサ・デ・ポルトガル", nameEn: "Taca de Portugal",            category: "cup", priority: 17, region: "Portugal",    rounds: CUP_ROUNDS },
  // ===== UEFA 大会 =====
  { id: "4480", nameJp: "チャンピオンズリーグ", nameEn: "UEFA Champions League",       category: "uefa", priority: 21, region: "Europe", rounds: UEFA_ROUNDS },
  { id: "4481", nameJp: "ヨーロッパリーグ",     nameEn: "UEFA Europa League",          category: "uefa", priority: 22, region: "Europe", rounds: UEFA_ROUNDS },
  { id: "5071", nameJp: "カンファレンスリーグ", nameEn: "UEFA Conference League",      category: "uefa", priority: 23, region: "Europe", rounds: UEFA_ROUNDS },
  // ===== ワールドカップ2026 =====
  // TheSportsDB: id=4429, season="2026"（W杯予選と同じIDだがシーズンで区別）
  // fetchAllRounds=true で next/past ラウンド推定をスキップして全ラウンドを取得
  {
    id: "4429",
    nameJp: "ワールドカップ2026",
    nameEn: "FIFA World Cup 2026",
    category: "world_cup",
    priority: 0,
    region: "World",
    rounds: WC2026_ROUNDS,
    fixedSeason: "2026",
    fetchAllRounds: true,
  },
  // ===== 代表戦 =====
  // W杯予選: id=4429 だが fixedSeason を指定しない（自動取得）→ 2025-2026シーズンの予選を取得
  { id: "4429", nameJp: "W杯予選",              nameEn: "FIFA World Cup Qualifying",   category: "national_team", priority: 31, region: "World",  rounds: range(1, 12) },
  { id: "4502", nameJp: "EURO",                 nameEn: "UEFA European Championships", category: "national_team", priority: 32, region: "Europe", rounds: range(1, 8) },
  { id: "4490", nameJp: "ネーションズリーグ",   nameEn: "UEFA Nations League",         category: "national_team", priority: 33, region: "Europe", rounds: [...range(1, 6), 125, 150, 160] },
  { id: "4562", nameJp: "親善試合/その他",      nameEn: "International Friendlies",    category: "national_team", priority: 34, region: "World",  rounds: range(1, 20), fixedSeason: "2026" },
];

/**
 * LEAGUE_BY_ID: id → LeagueDef のマップ。
 * 同じ id が複数ある場合（WC2026 と W杯予選は id=4429 を共有）、
 * world_cup カテゴリを優先して登録する。
 */
export const LEAGUE_BY_ID = new Map<string, LeagueDef>();
for (const league of LEAGUES) {
  const existing = LEAGUE_BY_ID.get(league.id);
  if (!existing || league.category === "world_cup") {
    LEAGUE_BY_ID.set(league.id, league);
  }
}

/**
 * 「日本人選手出場試合」を判定するためのチームID/チーム名のリスト。
 * TheSportsDB のチーム名（strHomeTeam/strAwayTeam）にマッチさせる。
 * 2025-26シーズン時点の日本人選手所属クラブ（主要選手）
 */
export const JAPANESE_PLAYER_TEAMS: string[] = [
  // ===== プレミアリーグ =====
  "Brighton and Hove Albion", // 三笘薫
  "Liverpool",                // 遠藤航
  "Crystal Palace",           // 鎌田大地
  "Brentford",
  // ===== ラ・リーガ =====
  "Real Sociedad",            // 久保建英
  "Villarreal",
  // ===== セリエA =====
  "Parma",                    // 鈴木彩艶
  "Como",
  "Venezia",
  "Cagliari",
  "Genoa",
  // ===== ブンデスリーガ =====
  "Eintracht Frankfurt",
  "VfB Stuttgart",            // 伊藤洋輝
  "Borussia Monchengladbach", // 板倉滉
  "SC Freiburg",              // 堂安律
  "FSV Mainz 05",
  "Bayer Leverkusen",
  "Borussia Dortmund",
  // ===== リーグ・アン =====
  "Stade Reims",
  "AS Monaco",                // 南野拓実
  "Strasbourg",
  "Olympique de Marseille",
  "Paris Saint-Germain",
  // ===== スコティッシュ・プレミアシップ =====
  "Celtic",                   // 旗手怜央・前田大然・山田楓喜
  "Rangers",
  // ===== エールディビジ =====
  "Feyenoord",                // 上田綺世・渡辺剛
  "NEC Nijmegen",
  "Ajax",
  "PSV Eindhoven",
  "AZ Alkmaar",
  "Twente",
  // ===== ジュピラー・プロ・リーグ =====
  "Sint-Truidense",
  "K Beerschot VA",
  "Club Brugge",
  "Anderlecht",
  "Gent",
  // ===== プリメイラ・リーガ =====
  "Sporting CP",              // 守田英正
  "Benfica",
  "FC Porto",
  "Braga",
  // ===== トルコ・スュペル・リグ =====
  "Trabzonspor",              // 鈴木唯人
  "Galatasaray",
  "Fenerbahce",
  "Besiktas",
  // ===== チャンピオンシップ（イングランド2部）=====
  "Southampton",           // 松木玖生
  "Leeds United",          // 田中碧
  "QPR",                   // 斉藤光毅
  "Coventry City",         // 坂元達裕
  "Hull City",             // 平河悠
  "Blackburn Rovers",      // 大橋祐紀・森下龍矢
  "Stoke City",            // 瀬古樹
  "Birmingham City",       // 岩田智輝・古橋亨梧・藤本寛也
];
