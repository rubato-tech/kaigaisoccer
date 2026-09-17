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
// R1〜R3 = グループステージ（各24試合）
// R32 = ラウンド16（TheSportsDB の実際のラウンド番号）
// R64 = QF, R128 = SF, R160 = 決勝（推定。TheSportsDB に登録され次第取得）
// TheSportsDB での WC2026: id=4429, season="2026"
const WC2026_ROUNDS = [...range(1, 3), 32, 64, 128, 160, 200];

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

/** 取得元ごとの表記ゆれを吸収する、2026-27シーズンの日本人選手所属クラブ。 */
export interface JapanesePlayerClub {
  /** 運用上の代表表記 */
  name: string;
  /** 当該クラブに所属する日本人選手。更新監査時の根拠を明確にするため保持する。 */
  players: readonly string[];
  /** ESPN / TheSportsDB が返す可能性のあるクラブ名表記 */
  aliases: readonly string[];
}

/**
 * 2026-27シーズンの確認済み所属クラブ。
 * 夏・冬の移籍市場終了後に公式クラブ発表またはリーグ公式を根拠として見直す。
 */
export const JAPANESE_PLAYER_CLUBS: readonly JapanesePlayerClub[] = [
  // ===== イングランド =====
  { name: "Brighton & Hove Albion", players: ["三笘薫"], aliases: ["Brighton & Hove Albion", "Brighton and Hove Albion", "Brighton"] },
  { name: "Liverpool", players: ["遠藤航"], aliases: ["Liverpool"] },
  { name: "Crystal Palace", players: ["鎌田大地", "冨安健洋"], aliases: ["Crystal Palace"] },
  { name: "Leeds United", players: ["田中碧"], aliases: ["Leeds United"] },
  { name: "Coventry City", players: ["坂元達裕"], aliases: ["Coventry City"] },
  { name: "Hull City", players: ["守田英正"], aliases: ["Hull City"] },
  { name: "Aston Villa", players: ["鈴木彩艶"], aliases: ["Aston Villa"] },
  { name: "Southampton", players: ["菅原由勢", "高岡伶颯"], aliases: ["Southampton"] },
  { name: "Queens Park Rangers", players: ["斉藤光毅"], aliases: ["Queens Park Rangers", "QPR"] },
  // ===== ラ・リーガ =====
  { name: "Real Sociedad", players: ["久保建英"], aliases: ["Real Sociedad"] },
  // ===== ブンデスリーガ =====
  { name: "Eintracht Frankfurt", players: ["堂安律", "小杉啓太", "熊代聖人"], aliases: ["Eintracht Frankfurt"] },
  { name: "Sport-Club Freiburg", players: ["鈴木唯人", "後藤啓介", "山本理仁"], aliases: ["SC Freiburg", "Freiburg", "Sport-Club Freiburg"] },
  { name: "1. FSV Mainz 05", players: ["佐野海舟", "川﨑颯太"], aliases: ["Mainz", "FSV Mainz 05", "1. FSV Mainz 05"] },
  { name: "Borussia Mönchengladbach", players: ["町野修斗", "板倉滉", "橋岡大樹", "宇野禅斗"], aliases: ["Borussia Mönchengladbach", "Borussia Monchengladbach", "Borussia M'gladbach"] },
  // ===== リーグ・アン =====
  { name: "AS Monaco", players: ["南野拓実"], aliases: ["AS Monaco", "Monaco"] },
  { name: "LOSC Lille", players: ["上田綺世"], aliases: ["Lille", "LOSC Lille"] },
  { name: "Olympique Lyonnais", players: ["中村敬斗"], aliases: ["Lyon", "Olympique Lyonnais"] },
  // ===== エールディビジ =====
  { name: "Feyenoord", players: ["渡辺剛"], aliases: ["Feyenoord", "Feyenoord Rotterdam"] },
  { name: "AZ Alkmaar", players: ["毎熊晟矢"], aliases: ["AZ Alkmaar", "AZ"] },
  // ===== ジュピラー・プロ・リーグ =====
  { name: "Sint-Truiden VV", players: ["畑大雅", "高井幸大", "谷口彰悟", "小久保玲央ブライアン", "石渡ネルソン", "松澤海斗", "荒木遼太郎", "新川志音"], aliases: ["Sint-Truidense", "Sint-Truiden", "Sint-Truiden VV"] },
  // ===== スコティッシュ・プレミアシップ =====
  { name: "Celtic", players: ["旗手怜央", "前田大然"], aliases: ["Celtic"] },
  { name: "Rangers", players: ["横田大祐"], aliases: ["Rangers"] },
];

/** クラブ名をソース横断で比較するための正規化。 */
export function normalizeJapanesePlayerClubName(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\b(?:football\s+club|afc|fc|cf|sc|ac|ssc|calcio)\b/g, " ")
    .replace(/[^a-z0-9]/g, "");
}

/** TheSportsDB / ESPN のチーム名を日本人選手所属クラブとして判定する。 */
export function isJapanesePlayerTeam(teamName: string): boolean {
  const normalized = normalizeJapanesePlayerClubName(teamName);
  return JAPANESE_PLAYER_TEAMS.some(
    (candidate) => normalizeJapanesePlayerClubName(candidate) === normalized,
  );
}

/** 既存の同期コードとの互換用。クラブ別名を平坦化した一覧。 */
export const JAPANESE_PLAYER_TEAMS: readonly string[] = [
  ...Array.from(new Set(JAPANESE_PLAYER_CLUBS.flatMap((club) => club.aliases))),
];
