CREATE TABLE `iptvAccounts` (
  `id` int AUTO_INCREMENT NOT NULL,
  `username` varchar(32) NOT NULL,
  `passwordHash` varchar(200) NOT NULL,
  `plan` enum('free','pro','ultra','ultra_trial') NOT NULL DEFAULT 'free',
  `sessionToken` varchar(128),
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `iptvAccounts_id` PRIMARY KEY(`id`),
  CONSTRAINT `iptvAccounts_username_unique` UNIQUE(`username`),
  CONSTRAINT `iptvAccounts_sessionToken_unique` UNIQUE(`sessionToken`)
);
