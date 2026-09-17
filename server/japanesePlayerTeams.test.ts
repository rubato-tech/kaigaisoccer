import { describe, expect, it } from "vitest";
import {
  isJapanesePlayerTeam,
  JAPANESE_PLAYER_CLUBS,
  normalizeJapanesePlayerClubName,
} from "../shared/leagues";

describe("2026-27 日本人選手所属クラブ", () => {
  it("移籍後の所属クラブとデータソース別の表記ゆれを認識する", () => {
    const expectedNames = [
      "Brighton & Hove Albion",
      "Aston Villa",
      "LOSC Lille",
      "Olympique Lyonnais",
      "Feyenoord",
      "Sint-Truiden VV",
      "Borussia Mönchengladbach",
    ];
    expect(expectedNames.every((name) => JAPANESE_PLAYER_CLUBS.some((club) => club.name === name))).toBe(true);

    expect(isJapanesePlayerTeam("Brighton & Hove Albion")).toBe(true);
    expect(isJapanesePlayerTeam("Aston Villa")).toBe(true);
    expect(isJapanesePlayerTeam("Feyenoord Rotterdam")).toBe(true);
    expect(isJapanesePlayerTeam("Lille")).toBe(true);
    expect(isJapanesePlayerTeam("Lyon")).toBe(true);
    expect(isJapanesePlayerTeam("Borussia Mönchengladbach")).toBe(true);
    expect(isJapanesePlayerTeam("Mainz")).toBe(true);
    expect(isJapanesePlayerTeam("Sint-Truidense")).toBe(true);
    expect(isJapanesePlayerTeam("QPR")).toBe(true);
  });

  it("移籍済みまたは根拠がない旧所属クラブを対象外にする", () => {
    [
      "Brentford",
      "Villarreal",
      "Parma",
      "Stade Reims",
      "NEC Nijmegen",
      "Ajax",
      "Benfica",
      "Sporting CP",
      "Trabzonspor",
      "Blackburn Rovers",
      "Stoke City",
      "Birmingham City",
    ].forEach((team) => expect(isJapanesePlayerTeam(team), team).toBe(false));
  });

  it("アクセント・クラブ接尾辞を除いた比較キーを安定して生成する", () => {
    expect(normalizeJapanesePlayerClubName("Borussia Mönchengladbach")).toBe(
      normalizeJapanesePlayerClubName("Borussia Monchengladbach"),
    );
    expect(normalizeJapanesePlayerClubName("Queens Park Rangers FC")).toBe(
      normalizeJapanesePlayerClubName("Queens Park Rangers"),
    );
  });
});
