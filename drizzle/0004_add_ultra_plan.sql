ALTER TABLE `telegramUsers` MODIFY COLUMN `plan` enum('free','pro','ultra','ultra_trial') NOT NULL DEFAULT 'free';
