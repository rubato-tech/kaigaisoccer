/**
 * JST 関連の日時ユーティリティ。
 * 試合データは UTC ミリ秒で保存しているため、表示用に JST へ変換するヘルパーをまとめる。
 *
 * 表示仕様:
 * - 「2026年4月25日（土）」のような日本語の年月日と曜日を組み合わせた日付ヘッダー。
 * - 25:00 〜 28:59 のような 24 時超え表記（前日の深夜キックオフを翌朝までまとめて表示するため）。
 *   翌日 03:59 までは「前日」の試合として扱い、25:00 〜 27:59 という時刻表記にする。
 */

const JST_OFFSET_MIN = 9 * 60;
const WEEKDAYS_JP = ["日", "月", "火", "水", "木", "金", "土"];

/** UTC ミリ秒を JST の Date オブジェクト風に分解する */
export interface JstParts {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  hour: number; // 0-23
  minute: number; // 0-59
  weekdayJp: string; // 日本語曜日
}

export function toJstParts(utcMs: number): JstParts {
  // UTC ミリ秒に JST のオフセットを足してから UTC として分解する。
  const shifted = new Date(utcMs + JST_OFFSET_MIN * 60 * 1000);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    weekdayJp: WEEKDAYS_JP[shifted.getUTCDay()]!,
  };
}

/**
 * 「グルーピング用の日付」と「表示時刻 (HH:MM)」を返す。
 *
 * 例: JST 27:30 (=翌日 03:30) のキックオフは
 *   - groupKey: 元の日付 (例: 2026-04-25)
 *   - displayTime: "27:30"
 * となる。
 *
 * このサイトでは「日本時刻が 04:00 までの試合は前日の枠でまとめる」ルールを採用する。
 */
export interface JstDisplay {
  /** YYYY-MM-DD 形式のグループキー */
  groupKey: string;
  /** 表示用日付ラベル（例: 2026年4月25日（土）） */
  groupLabel: string;
  /** 表示用時刻ラベル（25:00〜28:59 の表記を含む） */
  displayTime: string;
  /** 24時超え表記の場合 true */
  isLateNight: boolean;
}

const LATE_NIGHT_CUTOFF_HOUR = 4; // JST 04:00 未満は前日扱い

export function toJstDisplay(utcMs: number): JstDisplay {
  const jst = toJstParts(utcMs);
  let displayHour = jst.hour;
  let groupYear = jst.year;
  let groupMonth = jst.month;
  let groupDay = jst.day;
  let groupWeekdayJp = jst.weekdayJp;
  let isLateNight = false;

  if (jst.hour < LATE_NIGHT_CUTOFF_HOUR) {
    // 前日扱い、時刻は 24 時超え表記
    displayHour = jst.hour + 24;
    isLateNight = true;
    // 1 日前の日付を算出
    const prev = new Date(Date.UTC(jst.year, jst.month - 1, jst.day) - 24 * 60 * 60 * 1000);
    groupYear = prev.getUTCFullYear();
    groupMonth = prev.getUTCMonth() + 1;
    groupDay = prev.getUTCDate();
    groupWeekdayJp = WEEKDAYS_JP[prev.getUTCDay()]!;
  }

  const pad2 = (n: number) => String(n).padStart(2, "0");
  const groupKey = `${groupYear}-${pad2(groupMonth)}-${pad2(groupDay)}`;
  const groupLabel = `${groupYear}年${groupMonth}月${groupDay}日（${groupWeekdayJp}）`;
  const displayTime = `${pad2(displayHour)}:${pad2(jst.minute)}`;

  return { groupKey, groupLabel, displayTime, isLateNight };
}

/** 安全のため JST 時刻表記を 28:59 までに丸めるヘルパー */
export function isWithinLateNightWindow(utcMs: number): boolean {
  const jst = toJstParts(utcMs);
  return jst.hour < LATE_NIGHT_CUTOFF_HOUR;
}
