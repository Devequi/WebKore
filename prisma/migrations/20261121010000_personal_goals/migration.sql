CREATE TABLE `PersonalGoal` (
  `id` VARCHAR(191) NOT NULL PRIMARY KEY,
  `membershipId` VARCHAR(191) NOT NULL,
  `metric` VARCHAR(255) NOT NULL,
  `label` VARCHAR(191) NOT NULL,
  `unit` VARCHAR(191) NOT NULL,
  `profile` VARCHAR(191) NOT NULL,
  `target` DOUBLE NOT NULL,
  `direction` VARCHAR(191) NOT NULL,
  `deadline` CHAR(10) NULL,
  `archived` BOOLEAN NOT NULL DEFAULT false,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `PersonalGoal_membershipId_archived_idx` (`membershipId`, `archived`),
  CONSTRAINT `PersonalGoal_membershipId_fkey` FOREIGN KEY (`membershipId`) REFERENCES `Membership` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
