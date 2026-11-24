CREATE TABLE `subscriptionRequests` (
  `id` int AUTO_INCREMENT NOT NULL,
  `requestId` varchar(32) NOT NULL,
  `telegramUserId` varchar(64) NOT NULL,
  `telegramUsername` varchar(128),
  `plan` enum('pro','ultra') NOT NULL,
  `stars` int NOT NULL,
  `status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `approvedAt` timestamp,
  CONSTRAINT `subscriptionRequests_id` PRIMARY KEY(`id`),
  CONSTRAINT `subscriptionRequests_requestId_unique` UNIQUE(`requestId`)
);
