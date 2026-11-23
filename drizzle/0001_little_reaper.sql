CREATE TABLE `telegramIptvImports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sourceKey` varchar(160) NOT NULL,
	`channelUsername` varchar(128) NOT NULL,
	`channelTitle` varchar(255),
	`telegramMessageId` int,
	`rawMessage` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `telegramIptvImports_id` PRIMARY KEY(`id`),
	CONSTRAINT `telegramIptvImports_sourceKey_unique` UNIQUE(`sourceKey`)
);
