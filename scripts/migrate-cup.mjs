import mysql from "mysql2/promise";
import dotenv from "dotenv";
import { readFileSync } from "fs";

dotenv.config();

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL not set");

const conn = await mysql.createConnection(url);

console.log("Applying migration: add 'cup' to category enum...");
await conn.execute(
  "ALTER TABLE `matches` MODIFY COLUMN `category` enum('euro_league','cup','uefa','national_team') NOT NULL"
);
console.log("Migration applied successfully.");

// 5大リーグ以外のリーグデータを削除
const keepIds = ["4328", "4335", "4332", "4331", "4334", "4480", "4481", "5071", "4429", "4502", "4490", "4395"];
const placeholders = keepIds.map(() => "?").join(",");
const [result] = await conn.execute(
  `DELETE FROM \`matches\` WHERE leagueId NOT IN (${placeholders})`,
  keepIds
);
console.log(`Deleted ${result.affectedRows} rows from non-big5 leagues.`);

await conn.end();
process.exit(0);
