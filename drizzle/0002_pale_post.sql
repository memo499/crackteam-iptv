CREATE TABLE `telegramUsers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`telegramUserId` varchar(64) NOT NULL,
	`username` varchar(128),
	`firstName` varchar(128),
	`plan` enum('free','pro','ultra_trial') NOT NULL DEFAULT 'free',
	`trialExpiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `telegramUsers_id` PRIMARY KEY(`id`),
	CONSTRAINT `telegramUsers_telegramUserId_unique` UNIQUE(`telegramUserId`)
);
--> statement-breakpoint
ALTER TABLE `telegramIptvImports` ADD `category` enum('iptv','steam','mail','film','spor','haber') DEFAULT 'iptv' NOT NULL;--> statement-breakpoint
ALTER TABLE `telegramIptvImports` ADD `requiredPlan` enum('free','pro','ultra') DEFAULT 'free' NOT NULL;