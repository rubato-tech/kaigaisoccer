import { describe, expect, it } from "vitest";
import { toJstDisplay, toJstParts } from "@shared/datetime";

describe("toJstParts", () => {
  it("converts UTC to JST with +9 offset", () => {
    // 2026-04-25T11:30:00Z → JST 2026-04-25 20:30
    const utcMs = Date.UTC(2026, 3, 25, 11, 30, 0);
    const p = toJstParts(utcMs);
    expect(p.year).toBe(2026);
    expect(p.month).toBe(4);
    expect(p.day).toBe(25);
    expect(p.hour).toBe(20);
    expect(p.minute).toBe(30);
    expect(p.weekdayJp).toBe("土");
  });

  it("rolls over to next day after 15:00 UTC", () => {
    // 2026-04-25T15:00:00Z → JST 2026-04-26 00:00
    const utcMs = Date.UTC(2026, 3, 25, 15, 0, 0);
    const p = toJstParts(utcMs);
    expect(p.day).toBe(26);
    expect(p.hour).toBe(0);
  });
});

describe("toJstDisplay", () => {
  it("formats normal evening kickoff", () => {
    // 2026-04-25T13:00:00Z → JST 22:00 土曜
    const utcMs = Date.UTC(2026, 3, 25, 13, 0, 0);
    const d = toJstDisplay(utcMs);
    expect(d.displayTime).toBe("22:00");
    expect(d.isLateNight).toBe(false);
    expect(d.groupKey).toBe("2026-04-25");
    expect(d.groupLabel).toBe("2026年4月25日（土）");
  });

  it("uses 25:xx representation for 01:00 JST kickoff", () => {
    // 2026-04-25T16:00:00Z → JST 2026-04-26 01:00 → 25:00 of 4/25
    const utcMs = Date.UTC(2026, 3, 25, 16, 0, 0);
    const d = toJstDisplay(utcMs);
    expect(d.displayTime).toBe("25:00");
    expect(d.isLateNight).toBe(true);
    expect(d.groupKey).toBe("2026-04-25");
    expect(d.groupLabel).toContain("4月25日");
  });

  it("uses 27:30 representation for 03:30 JST kickoff", () => {
    // 2026-04-25T18:30:00Z → JST 2026-04-26 03:30 → 27:30 of 4/25
    const utcMs = Date.UTC(2026, 3, 25, 18, 30, 0);
    const d = toJstDisplay(utcMs);
    expect(d.displayTime).toBe("27:30");
    expect(d.isLateNight).toBe(true);
  });

  it("treats 04:00 JST as a new day (no late-night)", () => {
    // 2026-04-25T19:00:00Z → JST 2026-04-26 04:00 → 04:00 of 4/26
    const utcMs = Date.UTC(2026, 3, 25, 19, 0, 0);
    const d = toJstDisplay(utcMs);
    expect(d.displayTime).toBe("04:00");
    expect(d.isLateNight).toBe(false);
    expect(d.groupKey).toBe("2026-04-26");
  });

  it("handles month boundary for late night", () => {
    // 2026-04-30T16:00:00Z → JST 2026-05-01 01:00 → 25:00 of 4/30
    const utcMs = Date.UTC(2026, 3, 30, 16, 0, 0);
    const d = toJstDisplay(utcMs);
    expect(d.displayTime).toBe("25:00");
    expect(d.groupKey).toBe("2026-04-30");
  });
});
