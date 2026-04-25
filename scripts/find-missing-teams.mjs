import { readFileSync } from "fs";

// teamNames.ts から既存マッピングキーを抽出（簡易パース）
const src = readFileSync(new URL("../shared/teamNames.ts", import.meta.url), "utf8");
const existing = new Set();
for (const m of src.matchAll(/"([^"]+)":\s*"[^"]+"/g)) {
  existing.add(m[1]);
}

const allTeams = readFileSync("/tmp/cup_teams.txt", "utf8").trim().split("\n");
const missing = allTeams.filter((t) => t && !existing.has(t));
console.log("Missing count:", missing.length);
missing.forEach((t) => console.log(t));
