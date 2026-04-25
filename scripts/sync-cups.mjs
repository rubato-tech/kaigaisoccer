/**
 * カップ戦データを直接TheSportsDB APIから取得してDBに保存するスクリプト。
 * ローカル開発環境でのデータ初期投入用。
 */
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) throw new Error("DATABASE_URL not set");

const conn = await mysql.createConnection(DB_URL);

// カップ戦定義
const CUP_LEAGUES = [
  { id: "4482", nameJp: "FAカップ",             nameEn: "FA Cup",            region: "England" },
  { id: "4483", nameJp: "コパ・デル・レイ",     nameEn: "Copa del Rey",      region: "Spain" },
  { id: "4506", nameJp: "コッパ・イタリア",     nameEn: "Coppa Italia",      region: "Italy" },
  { id: "4485", nameJp: "DFBポカール",          nameEn: "DFB-Pokal",         region: "Germany" },
  { id: "4484", nameJp: "クープ・ド・フランス", nameEn: "Coupe de France",   region: "France" },
];

// カップ戦のラウンド番号
const CUP_ROUNDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 125, 150, 160];

const SEASON = "2024-2025";
const DELAY_MS = 600;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchRound(leagueId, season, round) {
  const url = `https://www.thesportsdb.com/api/v1/json/3/eventsround.php?id=${leagueId}&r=${round}&s=${encodeURIComponent(season)}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return data?.events ?? [];
  } catch {
    return [];
  }
}

function parseKickoff(dateStr, timeStr) {
  if (!dateStr) return null;
  const dt = new Date(`${dateStr}T${timeStr || "00:00:00"}Z`);
  return isNaN(dt.getTime()) ? null : dt.getTime();
}

let totalUpserted = 0;

for (const league of CUP_LEAGUES) {
  console.log(`\n=== ${league.nameJp} (${league.id}) ===`);
  let leagueTotal = 0;

  for (const round of CUP_ROUNDS) {
    const events = await fetchRound(league.id, SEASON, round);
    if (events.length === 0) {
      await sleep(DELAY_MS);
      continue;
    }

    for (const ev of events) {
      const kickoffMs = parseKickoff(ev.dateEvent, ev.strTime);
      if (!kickoffMs) continue;

      const homeScore = ev.intHomeScore != null && ev.intHomeScore !== "" ? parseInt(ev.intHomeScore) : null;
      const awayScore = ev.intAwayScore != null && ev.intAwayScore !== "" ? parseInt(ev.intAwayScore) : null;
      const status = ev.strStatus === "Match Finished" ? "finished"
        : ev.strStatus === "In Progress" ? "live"
        : ev.strStatus === "Postponed" ? "postponed"
        : "scheduled";

      await conn.execute(
        `INSERT INTO \`matches\`
          (eventId, category, leagueId, leagueNameJp, leagueNameEn, leagueBadge,
           season, round, homeTeamId, homeTeam, homeTeamBadge,
           awayTeamId, awayTeam, awayTeamBadge,
           kickoffUtcMs, status, homeScore, awayScore, venue, tags, createdAt, updatedAt)
         VALUES (?, 'cup', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
         ON DUPLICATE KEY UPDATE
           status=VALUES(status), homeScore=VALUES(homeScore), awayScore=VALUES(awayScore),
           updatedAt=NOW()`,
        [
          ev.idEvent,
          league.id, league.nameJp, league.nameEn,
          ev.strLeagueBadge ?? null,
          SEASON, String(round),
          ev.idHomeTeam ?? null, ev.strHomeTeam ?? "",
          ev.strHomeTeamBadge ?? null,
          ev.idAwayTeam ?? null, ev.strAwayTeam ?? "",
          ev.strAwayTeamBadge ?? null,
          kickoffMs, status,
          homeScore, awayScore,
          ev.strVenue ?? null,
          null,
        ]
      );
      leagueTotal++;
    }

    console.log(`  Round ${round}: ${events.length} events`);
    await sleep(DELAY_MS);
  }

  console.log(`  Total upserted: ${leagueTotal}`);
  totalUpserted += leagueTotal;
}

console.log(`\n=== All done. Total upserted: ${totalUpserted} ===`);
await conn.end();
process.exit(0);
