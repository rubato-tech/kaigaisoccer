import { describe, expect, it } from "vitest";
import { applyMatchFilter, matchesFilter } from "../shared/matchFilter";
import { teamNameJp, leagueDisplayJp } from "../shared/teamNames";

const sampleMatches = [
  { leagueId: "4328", homeTeam: "Arsenal", awayTeam: "Chelsea" },
  { leagueId: "4335", homeTeam: "Real Madrid", awayTeam: "Barcelona" },
  { leagueId: "4332", homeTeam: "Inter Milan", awayTeam: "AC Milan" },
  { leagueId: "4331", homeTeam: "Bayern Munich", awayTeam: "Borussia Dortmund" },
  { leagueId: "4480", homeTeam: "Liverpool", awayTeam: "Real Madrid" },
];

describe("teamNameJp", () => {
  it("主要クラブを日本語カタカナに変換する", () => {
    expect(teamNameJp("Arsenal")).toBe("アーセナル");
    expect(teamNameJp("Real Madrid")).toBe("レアル・マドリード");
    expect(teamNameJp("Bayern Munich")).toBe("バイエルン");
    expect(teamNameJp("Brighton and Hove Albion")).toBe("ブライトン");
  });
  it("代表チームに「代表」サフィックスを付ける", () => {
    expect(teamNameJp("Japan")).toBe("日本代表");
    expect(teamNameJp("Brazil")).toBe("ブラジル代表");
  });
  it("未登録のチームは原語をそのまま返す", () => {
    expect(teamNameJp("Some Unknown Club FC")).toBe("Some Unknown Club FC");
  });
  it("null/undefined/空文字を安全に処理する", () => {
    expect(teamNameJp(null)).toBe("");
    expect(teamNameJp(undefined)).toBe("");
    expect(teamNameJp("")).toBe("");
  });
});

describe("leagueDisplayJp", () => {
  it("リーグ短縮名を正式表記に展開する", () => {
    expect(leagueDisplayJp("リーガ")).toBe("ラ・リーガ");
    expect(leagueDisplayJp("CL")).toBe("チャンピオンズリーグ");
    expect(leagueDisplayJp("EL")).toBe("ヨーロッパリーグ");
    expect(leagueDisplayJp("ECL")).toBe("カンファレンスリーグ");
    expect(leagueDisplayJp("リーグアン")).toBe("リーグ・アン");
  });
  it("そのまま使える名称はそのまま返す", () => {
    expect(leagueDisplayJp("プレミアリーグ")).toBe("プレミアリーグ");
    expect(leagueDisplayJp("セリエA")).toBe("セリエA");
  });
});

describe("matchFilter", () => {
  it("フィルタ未指定なら全件通過する", () => {
    const f = { selectedLeagueIds: new Set<string>(), teamQuery: "" };
    expect(applyMatchFilter(sampleMatches, f)).toHaveLength(sampleMatches.length);
  });

  it("リーグIDで絞り込む（複数選択）", () => {
    const f = { selectedLeagueIds: new Set(["4328", "4335"]), teamQuery: "" };
    const out = applyMatchFilter(sampleMatches, f);
    expect(out).toHaveLength(2);
    expect(out.map((m) => m.leagueId).sort()).toEqual(["4328", "4335"]);
  });

  it("チーム名検索（カタカナ部分一致）でヒットする", () => {
    const f = { selectedLeagueIds: new Set<string>(), teamQuery: "レアル" };
    const out = applyMatchFilter(sampleMatches, f);
    // Real Madrid を含む試合 = ホーム×1、アウェー×1 で計 2 件
    expect(out).toHaveLength(2);
  });

  it("チーム名検索（原語英語部分一致）でも動作する", () => {
    const f = { selectedLeagueIds: new Set<string>(), teamQuery: "Bayern" };
    const out = applyMatchFilter(sampleMatches, f);
    expect(out).toHaveLength(1);
    expect(out[0].homeTeam).toBe("Bayern Munich");
  });

  it("リーグとチームの両方で AND 絞り込みが効く", () => {
    const f = { selectedLeagueIds: new Set(["4480"]), teamQuery: "リバプール" };
    const out = applyMatchFilter(sampleMatches, f);
    expect(out).toHaveLength(1);
    expect(out[0].leagueId).toBe("4480");
  });

  it("マッチしない条件では空配列を返す", () => {
    const f = { selectedLeagueIds: new Set(["4328"]), teamQuery: "バイエルン" };
    expect(applyMatchFilter(sampleMatches, f)).toHaveLength(0);
  });

  it("matchesFilter は前後空白を除去して評価する", () => {
    const m = { leagueId: "4328", homeTeam: "Arsenal", awayTeam: "Chelsea" };
    expect(matchesFilter(m, { selectedLeagueIds: new Set(), teamQuery: "  アーセナル  " })).toBe(true);
  });
});
