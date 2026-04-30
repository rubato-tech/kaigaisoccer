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
  { id: "4328", nameJp: "プレミアリーグ",       nameEn: "English Premier League",     category: "euro_league", priority: 1,  region: "England",     rounds: range(1, 38) },
  { id: "4335", nameJp: "ラ・リーガ",           nameEn: "Spanish La Liga",             category: "euro_league", priority: 2,  region: "Spain",       rounds: range(1, 38) },
  { id: "4332", nameJp: "セリエA",              nameEn: "Italian Serie A",             category: "euro_league", priority: 3,  region: "Italy",       rounds: range(1, 38) },
  { id: "4331", nameJp: "ブンデスリーガ",       nameEn: "German Bundesliga",           category: "euro_league", priority: 4,  region: "Germany",     rounds: range(1, 34) },
  { id: "4334", nameJp: "リーグ・アン",         nameEn: "French Ligue 1",              category: "euro_league", priority: 5,  region: "France",      rounds: range(1, 34) },
  // ===== 日本人選手所属リーグ（5大リーグ以外） =====
  { id: "4330", nameJp: "スコティッシュ・プレミアシップ", nameEn: "Scottish Premiership",  category: "euro_league", priority: 6,  region: "Scotland",    rounds: range(1, 38) },
  { id: "4337", nameJp: "エールディビジ",       nameEn: "Dutch Eredivisie",            category: "euro_league", priority: 7,  region: "Netherlands", rounds: range(1, 34) },
  { id: "4338", nameJp: "ジュピラー・プロ・リーグ", nameEn: "Belgian Pro League",       category: "euro_league", priority: 8,  region: "Belgium",     rounds: range(1, 34) },
  { id: "4344", nameJp: "プリメイラ・リーガ",   nameEn: "Portuguese Primeira Liga",    category: "euro_league", priority: 9,  region: "Portugal",    rounds: range(1, 34) },
  // ===== 日本人選手所属リーグ（追加分） =====
  { id: "4339", nameJp: "スュペル・リグ",             nameEn: "Turkish Super Lig",           category: "euro_league", priority: 10, region: "Turkey",         rounds: range(1, 34) },
  { id: "4675", nameJp: "スイス・スーパーリーグ",     nameEn: "Swiss Super League",          category: "euro_league", priority: 11, region: "Switzerland",    rounds: range(1, 36) },
  { id: "4621", nameJp: "オーストリア・ブンデスリーガ", nameEn: "Austrian Bundesliga",        category: "euro_league", priority: 12, region: "Austria",        rounds: range(1, 36) },
  { id: "4340", nameJp: "デンマーク・スーパーリーガ", nameEn: "Danish Superliga",            category: "euro_league", priority: 13, region: "Denmark",        rounds: range(1, 32) },
  { id: "4358", nameJp: "エリテセリエン",             nameEn: "Norwegian Eliteserien",       category: "euro_league", priority: 14, region: "Norway",         rounds: range(1, 30) },
  { id: "4347", nameJp: "アルスヴェンスカン",         nameEn: "Swedish Allsvenskan",         category: "euro_league", priority: 15, region: "Sweden",         rounds: range(1, 30) },
  { id: "4422", nameJp: "エクストラクラサ",           nameEn: "Polish Ekstraklasa",          category: "euro_league", priority: 16, region: "Poland",         rounds: range(1, 34) },
  { id: "4336", nameJp: "スーパーリーグ・ギリシャ",   nameEn: "Greek Superleague",           category: "euro_league", priority: 17, region: "Greece",         rounds: range(1, 34) },
  { id: "4631", nameJp: "チェコ・フォルトゥナ・リーガ", nameEn: "Czech First League",        category: "euro_league", priority: 18, region: "Czech Republic", rounds: range(1, 34) },
  { id: "4671", nameJp: "セルビア・スーパーリーガ",   nameEn: "Serbian Super Liga",          category: "euro_league", priority: 19, region: "Serbia",         rounds: range(1, 30) },
  { id: "4629", nameJp: "クロアチアHNL",              nameEn: "Croatian HNL",                category: "euro_league", priority: 20, region: "Croatia",        rounds: range(1, 36) },
  { id: "4691", nameJp: "ルーマニア・リーガ1",        nameEn: "Romanian Liga I",             category: "euro_league", priority: 21, region: "Romania",        rounds: range(1, 30) },
  { id: "4636", nameJp: "ヴェイッカウスリーガ",       nameEn: "Finnish Veikkausliiga",       category: "euro_league", priority: 22, region: "Finland",        rounds: range(1, 26) },
  // ===== 各国カップ戦（5大リーグ） =====
  { id: "4482", nameJp: "FAカップ",             nameEn: "FA Cup",                      category: "cup", priority: 11, region: "England",     rounds: CUP_ROUNDS },
  { id: "4483", nameJp: "コパ・デル・レイ",     nameEn: "Copa del Rey",                category: "cup", priority: 12, region: "Spain",       rounds: CUP_ROUNDS },
  { id: "4506", nameJp: "コッパ・イタリア",     nameEn: "Coppa Italia",                category: "cup", priority: 13, region: "Italy",       rounds: CUP_ROUNDS },
  { id: "4485", nameJp: "DFBポカール",          nameEn: "DFB-Pokal",                   category: "cup", priority: 14, region: "Germany",     rounds: CUP_ROUNDS },
  { id: "4484", nameJp: "クープ・ド・フランス", nameEn: "Coupe de France",             category: "cup", priority: 15, region: "France",      rounds: CUP_ROUNDS },
  // ===== 各国カップ戦（日本人所属リーグ） =====
  { id: "4510", nameJp: "タサ・デ・ポルトガル", nameEn: "Taca de Portugal",            category: "cup", priority: 16, region: "Portugal",    rounds: CUP_ROUNDS },
  // ===== UEFA 大会 =====
  { id: "4480", nameJp: "チャンピオンズリーグ", nameEn: "UEFA Champions League",       category: "uefa", priority: 21, region: "Europe", rounds: UEFA_ROUNDS },
  { id: "4481", nameJp: "ヨーロッパリーグ",     nameEn: "UEFA Europa League",          category: "uefa", priority: 22, region: "Europe", rounds: UEFA_ROUNDS },
  { id: "5071", nameJp: "カンファレンスリーグ", nameEn: "UEFA Conference League",      category: "uefa", priority: 23, region: "Europe", rounds: UEFA_ROUNDS },
  // ===== 代表戦 =====
  { id: "4429", nameJp: "W杯予選",              nameEn: "FIFA World Cup Qualifying",   category: "national_team", priority: 31, region: "World",  rounds: range(1, 12) },
  { id: "4502", nameJp: "EURO",                 nameEn: "UEFA European Championships", category: "national_team", priority: 32, region: "Europe", rounds: range(1, 8) },
  { id: "4490", nameJp: "ネーションズリーグ",   nameEn: "UEFA Nations League",         category: "national_team", priority: 33, region: "Europe", rounds: [...range(1, 6), 125, 150, 160] },
  { id: "4395", nameJp: "親善試合/その他",      nameEn: "International Friendly",      category: "national_team", priority: 34, region: "World",  rounds: range(1, 12) },
];
export const LEAGUE_BY_ID = new Map(LEAGUES.map((l) => [l.id, l] as const));
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
  // ===== スイス・スーパーリーグ =====
  "FC Zurich",                // 日本人選手所属
  "Young Boys",
  "FC Basel",
  "FC Lugano",
  // ===== オーストリア・ブンデスリーガ =====
  "Red Bull Salzburg",        // 日本人選手所属
  "Rapid Vienna",
  "LASK",
  // ===== デンマーク・スーパーリーガ =====
  "FC Copenhagen",            // 日本人選手所属
  "Brondby IF",
  "FC Midtjylland",
  "AGF Aarhus",
  // ===== ノルウェー・エリテセリエン =====
  "Bodo/Glimt",               // 日本人選手所属
  "Molde",
  "Rosenborg",
  // ===== スウェーデン・アルスヴェンスカン =====
  "Malmo FF",                 // 日本人選手所属
  "Hammarby",
  "IFK Gothenburg",
  // ===== ポーランド・エクストラクラサ =====
  "Lech Poznan",              // 日本人選手所属
  "Legia Warsaw",
  "Rakow Czestochowa",
  // ===== ギリシャ・スーパーリーグ =====
  "Olympiacos",               // 日本人選手所属
  "PAOK",
  "AEK Athens",
  "Panathinaikos",
  // ===== チェコ・フォルトゥナ・リーガ =====
  "Slavia Prague",            // 日本人選手所属
  "Sparta Prague",
  "Viktoria Plzen",
  // ===== セルビア・スーパーリーガ =====
  "Crvena Zvezda",            // 日本人選手所属（レッドスター）
  "Partizan",
  // ===== クロアチアHNL =====
  "Dinamo Zagreb",            // 日本人選手所属
  "Hajduk Split",
  // ===== ルーマニア・リーガ1 =====
  "FCSB",                     // 日本人選手所属
  "CFR Cluj",
  // ===== フィンランド・ヴェイッカウスリーガ =====
  "HJK Helsinki",             // 日本人選手所属
  "SJK Seinajoki",
];
