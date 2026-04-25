CREATE TABLE `matches` (
	`eventId` varchar(32) NOT NULL,
	`category` enum('euro_league','uefa','national_team') NOT NULL,
	`leagueId` varchar(16) NOT NULL,
	`leagueNameJp` varchar(64) NOT NULL,
	`leagueNameEn` varchar(128) NOT NULL,
	`leagueBadge` text,
	`season` varchar(16),
	`round` varchar(16),
	`homeTeamId` varchar(16),
	`homeTeam` varchar(128) NOT NULL,
	`homeTeamBadge` text,
	`awayTeamId` varchar(16),
	`awayTeam` varchar(128) NOT NULL,
	`awayTeamBadge` text,
	`kickoffUtcMs` bigint NOT NULL,
	`status` varchar(32) NOT NULL DEFAULT 'scheduled',
	`homeScore` int,
	`awayScore` int,
	`venue` varchar(256),
	`tags` varchar(256),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `matches_eventId` PRIMARY KEY(`eventId`)
);
--> statement-breakpoint
CREATE TABLE `sync_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`source` varchar(64) NOT NULL,
	`status` varchar(32) NOT NULL,
	`fetchedCount` int NOT NULL DEFAULT 0,
	`upsertedCount` int NOT NULL DEFAULT 0,
	`message` text,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`finishedAt` timestamp,
	CONSTRAINT `sync_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_matches_kickoff` ON `matches` (`kickoffUtcMs`);--> statement-breakpoint
CREATE INDEX `idx_matches_category` ON `matches` (`category`,`kickoffUtcMs`);--> statement-breakpoint
CREATE INDEX `idx_matches_league` ON `matches` (`leagueId`,`kickoffUtcMs`);